#!/usr/bin/env node

/**
 * Wire `.githooks/` into the local clone so `git commit` runs
 * `.githooks/pre-commit` (the analytics-secret scanner) automatically.
 *
 * Triggered by npm's `prepare` lifecycle, so `npm install` after a fresh
 * clone enables the hook with no manual setup. Safe to run repeatedly.
 *
 * - Skipped silently when there is no `.git/` (e.g. tarball install,
 *   CI cache restoration without a working tree).
 * - Skipped with a warning when the user already has a custom
 *   `core.hooksPath` pointing somewhere else, so we never clobber a
 *   personal hook setup. They can opt in manually.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TARGET = ".githooks";

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: ROOT, ...opts });
}

if (!fs.existsSync(path.join(ROOT, ".git"))) {
  process.exit(0);
}

let current = "";
try {
  current = git(["config", "--get", "core.hooksPath"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  // exit code 1 just means the key is unset — that's the common path.
}

if (current === TARGET) {
  process.exit(0);
}

if (current && current !== TARGET) {
  console.warn(
    `core.hooksPath is already "${current}". Leaving it alone. Set to "${TARGET}" manually to enable the secret-scan pre-commit hook.`,
  );
  process.exit(0);
}

try {
  git(["config", "core.hooksPath", TARGET], { stdio: "ignore" });
  console.log(
    `git hooks: core.hooksPath -> ${TARGET} (analytics-secret pre-commit scan enabled).`,
  );
} catch (err) {
  console.warn(
    `Could not set core.hooksPath automatically (${err?.message || err}). Run \`git config core.hooksPath ${TARGET}\` manually.`,
  );
}
