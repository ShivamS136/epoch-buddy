#!/usr/bin/env node

/**
 * Scan committed/built artifacts for forbidden analytics secrets.
 *
 *   node scripts/check-secrets.mjs
 *
 * Exits 0 if clean, 1 if any artifact contains a forbidden prefix.
 * Used by `npm run check:secrets` and the optional pre-commit hook.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ARTIFACTS_TO_SCAN,
  FORBIDDEN_SECRET_PREFIXES,
  RESOLUTION_MESSAGE,
} from "./forbidden-secrets.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const errors = [];

for (const rel of ARTIFACTS_TO_SCAN) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const content = fs.readFileSync(abs, "utf-8");
  for (const prefix of FORBIDDEN_SECRET_PREFIXES) {
    if (content.includes(prefix)) {
      errors.push(`${rel}: contains forbidden secret prefix "${prefix}"`);
    }
  }
}

if (errors.length > 0) {
  console.error("\nForbidden analytics secrets found in committed artifacts:");
  for (const err of errors) console.error(`  - ${err}`);
  console.error("");
  console.error(RESOLUTION_MESSAGE);
  process.exit(1);
}

console.log("OK: no forbidden analytics secrets in built artifacts.");
