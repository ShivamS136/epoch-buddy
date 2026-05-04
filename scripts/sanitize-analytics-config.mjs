#!/usr/bin/env node

/**
 * Reset the chrome + firefox blocks in `analytics.config.json` to the
 * placeholder values from `analytics.config.example.json`, while keeping
 * the local `demo` block untouched.
 *
 *   node scripts/sanitize-analytics-config.mjs
 *
 * Run this before `npm run build && git add` when you've been testing
 * locally with real chrome/firefox MP credentials. The example file's
 * placeholders (e.g. "G-XXXXXXXXXX") are safe to commit.
 *
 * The `demo` gtag tag id is the public website tracking ID and is fine
 * to leave as-is in committed artifacts (it ships in docs/demo.js
 * alongside the public GitHub Pages site).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CONFIG_PATH = path.join(ROOT, "analytics.config.json");
const EXAMPLE_PATH = path.join(ROOT, "analytics.config.example.json");

if (!fs.existsSync(EXAMPLE_PATH)) {
  console.error(
    `Missing ${path.relative(ROOT, EXAMPLE_PATH)} — cannot sanitize.`,
  );
  process.exit(1);
}

const example = JSON.parse(fs.readFileSync(EXAMPLE_PATH, "utf-8"));

const current = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  : {};

const sanitized = {
  chrome: example.chrome,
  firefox: example.firefox,
  demo: current.demo ?? example.demo,
};

fs.writeFileSync(CONFIG_PATH, JSON.stringify(sanitized, null, 2) + "\n");

const demoSource = current.demo ? "preserved" : "copied from example";
console.log(
  `analytics.config.json: chrome + firefox reset from example. demo ${demoSource}.`,
);
console.log("Next: npm run build  (then re-stage the regenerated artifacts).");
