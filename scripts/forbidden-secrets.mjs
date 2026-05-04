/**
 * Strings that must NEVER appear in committed/distributed artifacts.
 *
 * These prefixes match the chrome and firefox GA4 Measurement Protocol
 * credentials (the api_secret in particular grants write access to the
 * stream). The `demo` gtag tag id is intentionally public — it ships in
 * docs/demo.js alongside the public GitHub Pages site — so it is NOT
 * in this list.
 *
 * If you ever rotate the chrome/firefox credentials, update this list
 * with the new prefixes so the new values are also blocked.
 */
export const FORBIDDEN_SECRET_PREFIXES = ["G-PM7", "ernO", "G-FC7", "mGP2"];

/**
 * Build outputs that get checked into git and shipped to users. Anything
 * here is publicly visible the moment it lands in `main`, so it must be
 * free of the prefixes above.
 */
export const ARTIFACTS_TO_SCAN = [
  "src/shared/generated/analyticsConfig.js",
  "extension/index.js",
  "extension/script.js",
  "extension/background.js",
  "extension/welcome.js",
  "docs/demo.js",
];

/**
 * Stable resolution message printed by every tool that detects a hit.
 * Centralised so `check:secrets`, the pack verifier, and the pre-commit
 * hook all give the same advice.
 */
export const RESOLUTION_MESSAGE = [
  "Resolution:",
  "  1. npm run sanitize:analytics-config",
  "     (Restores chrome + firefox blocks from analytics.config.example.json,",
  "      preserving your real demo key in analytics.config.json.)",
  "  2. npm run build",
  "  3. git add the regenerated artifacts and commit again.",
  "",
  "If you genuinely need real chrome/firefox keys for local testing,",
  "do NOT commit the regenerated artifacts.",
].join("\n");
