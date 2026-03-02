#!/usr/bin/env node

/**
 * Build script for Epoch Buddy.
 *
 * Usage:
 *   node scripts/build.mjs                        # one-shot build (Chrome manifest)
 *   node scripts/build.mjs --browser firefox       # one-shot build (Firefox manifest)
 *   node scripts/build.mjs --watch                 # rebuild on change (Chrome manifest)
 *   node scripts/build.mjs --watch --browser firefox  # rebuild on change (Firefox manifest)
 *   node scripts/build.mjs --pack chrome           # build + zip for Chrome
 *   node scripts/build.mjs --pack firefox          # build + zip for Firefox (patches manifest)
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

// ── Manifest helpers ─────────────────────────────────────────────

const MANIFEST_PATH = path.join(ROOT, "extension/manifest.json");

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 4) + "\n");
}

/**
 * Ensure the manifest matches the target browser.
 * Returns the original manifest (before any changes) for restoration.
 */
function setManifestForBrowser(browser) {
  const original = readManifest();
  if (browser === "firefox") {
    const patched = { ...original, ...FIREFOX_MANIFEST_EXTRAS };
    writeManifest(patched);
  } else {
    // Chrome/Edge: strip any Firefox fields that may be present
    const cleaned = { ...original };
    delete cleaned.browser_specific_settings;
    writeManifest(cleaned);
  }
  return original;
}

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

const packMode = args.includes("--pack");
const packIndex = args.indexOf("--pack");
const packTarget =
  packIndex !== -1 && args[packIndex + 1] ? args[packIndex + 1] : null;

const browserIndex = args.indexOf("--browser");
const browserTarget = browserIndex !== -1 ? args[browserIndex + 1] : null;

// ── Build ───────────────────────────────────────────────────────

async function build() {
  // Patch manifest if a browser target is specified
  let originalManifest = null;
  if (browserTarget) {
    if (browserTarget !== "chrome" && browserTarget !== "firefox") {
      console.error(
        `Unknown browser target: ${browserTarget}. Use "chrome" or "firefox".`,
      );
      process.exit(1);
    }
    originalManifest = setManifestForBrowser(browserTarget);
    console.log(`Manifest set for: ${browserTarget}`);
  }

  if (watchMode) {
    // In watch mode, set up cleanup to restore manifest on exit
    if (originalManifest) {
      const restore = () => {
        try {
          writeManifest(originalManifest);
          console.log("\nManifest restored to original state.");
        } catch {
          // Ignore errors during cleanup
        }
      };
      process.on("SIGINT", () => {
        restore();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        restore();
        process.exit(0);
      });
    }

    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes... (Ctrl+C to stop)");
  } else {
    await esbuild.build(buildOptions);

    // For one-shot builds with --browser, leave the manifest patched
    // so the user can load it in the target browser. They can switch
    // back by running with --browser chrome or without --browser.
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
    if (file === "manifest.chrome.json" || file === "manifest.firefox.json")
      continue;

    const src = path.join(extDir, file);
    const dest = path.join(tmpDir, file);
    fs.cpSync(src, dest, {
      recursive: true,
      filter: (s) => !path.basename(s).startsWith("."),
    });
  }

  // Patch the manifest in the temp dir for the target browser
  const manifestPath = path.join(tmpDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  // Always strip Firefox fields first (in case source manifest has them)
  delete manifest.browser_specific_settings;

  if (target === "firefox") {
    Object.assign(manifest, FIREFOX_MANIFEST_EXTRAS);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");

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

  const zipSize = fs.statSync(zipPath).size;
  console.log(`Packed: dist/${zipName} (${formatBytes(zipSize)})`);
}

// ── Pack verification ────────────────────────────────────────────

function verifyPack(zipPath) {
  const listing = execSync(`unzip -l "${zipPath}"`, { encoding: "utf-8" });
  const lines = listing.split("\n");
  const errors = [];

  for (const line of lines) {
    const match = line.match(/\d{2}-\d{2}-\d{2,4}\s+\d{2}:\d{2}\s+(.+)$/);
    if (!match) continue;
    const entryPath = match[1].trim();
    const basename = path.basename(entryPath);
    if (basename.startsWith(".")) {
      errors.push(`Hidden file in zip: ${entryPath}`);
    }
  }

  return errors;
}

function verifyBuildArtifacts() {
  const BANNED_PATTERNS = [
    { pattern: /\.innerHTML\s*=/, label: ".innerHTML assignment" },
  ];

  const jsFiles = [
    path.join(ROOT, "extension/index.js"),
    path.join(ROOT, "extension/script.js"),
  ];

  const errors = [];

  for (const filePath of jsFiles) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const name = path.relative(ROOT, filePath);
    for (const { pattern, label } of BANNED_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`${name}: contains ${label}`);
      }
    }
  }

  return errors;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

// ── Main ────────────────────────────────────────────────────────

await build();

if (packMode) {
  const targets = [];
  if (packTarget === null) {
    targets.push("chrome", "firefox");
  } else {
    if (packTarget !== "chrome" && packTarget !== "firefox") {
      console.error(
        `Unknown pack target: ${packTarget}. Use "chrome" or "firefox".`,
      );
      process.exit(1);
    }
    targets.push(packTarget);
  }

  for (const t of targets) pack(t);

  // Run verification
  console.log("\nRunning pack checks...");
  const allErrors = [];

  allErrors.push(...verifyBuildArtifacts());

  for (const t of targets) {
    const zipPath = path.join(ROOT, `dist/${t}.zip`);
    if (fs.existsSync(zipPath)) {
      allErrors.push(...verifyPack(zipPath));
    }
  }

  if (allErrors.length > 0) {
    console.error("\n PACK CHECKS FAILED:");
    allErrors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log("All pack checks passed.");
}
