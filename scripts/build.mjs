#!/usr/bin/env node

/**
 * Build script for Epoch Buddy.
 *
 * Usage:
 *   node scripts/build.mjs              # one-shot build
 *   node scripts/build.mjs --watch      # rebuild on change
 *   node scripts/build.mjs --pack chrome   # build + zip for Chrome
 *   node scripts/build.mjs --pack firefox  # build + zip for Firefox (patches manifest)
 */

import * as esbuild from "esbuild";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Firefox-specific manifest additions ─────────────────────────

const FIREFOX_MANIFEST_EXTRAS = {
  browser_specific_settings: {
    gecko: {
      id: "epoch-buddy.shivams136@github.com",
      data_collection_permissions: {
        required: ["none"],
      },
    },
  },
};

// ── Shared esbuild options ──────────────────────────────────────

const entryPoints = [
  {
    in: path.join(ROOT, "src/popup/main.js"),
    out: path.join(ROOT, "extension/index"),
  },
  {
    in: path.join(ROOT, "src/content/main.js"),
    out: path.join(ROOT, "extension/script"),
  },
  {
    in: path.join(ROOT, "src/demo/main.js"),
    out: path.join(ROOT, "docs/demo"),
  },
];

const buildOptions = {
  entryPoints: entryPoints.map((e) => ({ in: e.in, out: e.out })),
  bundle: true,
  format: "iife",
  outdir: ".",
  outbase: ".",
  minify: false,
  logLevel: "info",
  absWorkingDir: ROOT,
};

// ── CLI args ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const packIndex = args.indexOf("--pack");
const packTarget = packIndex !== -1 ? args[packIndex + 1] : null;

// ── Build ───────────────────────────────────────────────────────

async function build() {
  if (watchMode) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes...");
  } else {
    await esbuild.build(buildOptions);
  }
}

// ── Pack ────────────────────────────────────────────────────────

function pack(target) {
  const distDir = path.join(ROOT, "dist");
  fs.mkdirSync(distDir, { recursive: true });

  const extDir = path.join(ROOT, "extension");
  const tmpDir = path.join(distDir, `_tmp_${target}`);

  // Clean tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // Copy extension files (skip .DS_Store and any zips)
  const files = fs.readdirSync(extDir);
  for (const file of files) {
    if (file === ".DS_Store" || file.endsWith(".zip")) continue;
    // Skip extra manifest variants if they still exist
    if (file === "manifest.chrome.json" || file === "manifest.firefox.json")
      continue;

    const src = path.join(extDir, file);
    const dest = path.join(tmpDir, file);
    fs.copyFileSync(src, dest);
  }

  // For Firefox: patch the manifest
  if (target === "firefox") {
    const manifestPath = path.join(tmpDir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    // Remove Chrome-only fields
    delete manifest.offline_enabled;
    // Add Firefox fields
    Object.assign(manifest, FIREFOX_MANIFEST_EXTRAS);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  }

  // Zip
  const zipName = `${target}.zip`;
  const zipPath = path.join(distDir, zipName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use system zip command (available on macOS/Linux)
  execSync(`cd "${tmpDir}" && zip -r "${zipPath}" .`);

  // Clean tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`Packed: dist/${zipName}`);
}

// ── Main ────────────────────────────────────────────────────────

await build();

if (packTarget) {
  if (packTarget !== "chrome" && packTarget !== "firefox") {
    console.error(`Unknown pack target: ${packTarget}. Use "chrome" or "firefox".`);
    process.exit(1);
  }
  pack(packTarget);
}
