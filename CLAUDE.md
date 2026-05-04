# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product surfaces

Epoch Buddy ships four user-facing surfaces from one codebase. Before editing, decide which surface the change belongs to:

- **Popup** — the extension menu with conversion tabs + history. Source: `src/popup/main.js` → builds to `extension/index.js` (loaded by `extension/index.html`).
- **Content script** — floating popup injected into every page on epoch-looking selections. Source: `src/content/main.js` → builds to `extension/script.js`.
- **Demo** — GitHub Pages interactive demo at `/demo.html`. Source: `src/demo/main.js` → builds to `docs/demo.js`.
- **Listing / marketing** — `docs/index.html`, `docs/privacy.html`, `docs/terms.html`, `docs/styles.css`, `docs/nav.js`. Hand-authored, not bundled.

Keep terminology, timestamp behavior, privacy claims, and offline-first messaging aligned across these surfaces. The product promise is fast epoch/date conversion with **no external network dependency and no telemetry by default** — don't regress that.

## Build commands

```bash
npm install
npm run build              # JS-only build, manifest unchanged
npm run build:chrome       # JS + patch manifest for Chrome/Edge (strips gecko fields)
npm run build:firefox      # JS + patch manifest for Firefox (adds browser_specific_settings.gecko)
npm run watch[:chrome|:firefox]   # esbuild watch; firefox variant restores manifest on SIGINT/SIGTERM
npm run pack[:chrome|:firefox]    # build + produce dist/<target>.zip (always patches in a tmp dir; source manifest untouched)
npm run check:secrets             # scan committed artifacts for forbidden analytics secrets (see Secret hygiene)
npm run sanitize:analytics-config # reset chrome+firefox blocks in analytics.config.json from the example file (preserves demo)
```

There is **no test suite and no lint command**. Prettier runs on save in VS Code (`.vscode/settings.json`); there is no CLI formatter invocation. So run prettier once all the changes are done.

## Secret hygiene

`analytics.config.json` is gitignored and holds real GA4 Measurement Protocol credentials for the chrome and firefox builds. Those credentials must NEVER end up in committed/distributed artifacts — `src/shared/generated/analyticsConfig.js` and the bundled `extension/*.js` + `docs/demo.js` are all checked in and shipped publicly. The `demo` gtag tag id is intentionally public and may stay in artifacts.

Forbidden prefixes (defined in `scripts/forbidden-secrets.mjs`): `G-PM7`, `ernO`, `G-FC7`, `mGP2`. If you rotate a credential, update that list with the new prefixes.

**Workflow before commit:**

```bash
npm run sanitize:analytics-config   # restores chrome+firefox to placeholders, keeps your demo key
npm run build                       # regenerate artifacts so they no longer embed the secrets
npm run check:secrets               # confirm clean (also runs automatically inside `npm run pack`)
git add <regenerated artifacts>
git commit ...
```

`npm run pack` already invokes the same scan as part of `verifyBuildArtifacts` and will fail rather than zip a leaky build.

**Pre-commit hook**: `.githooks/pre-commit` reads the _staged_ version of each artifact and aborts if any forbidden prefix is present. It catches even the case where the working tree was sanitized but the index still has a stale leaky artifact. Wired automatically by `scripts/install-hooks.mjs` via npm's `prepare` lifecycle, so `npm install` after a fresh clone sets `core.hooksPath` to `.githooks` for you. The installer skips silently in non-git checkouts and refuses to overwrite a custom `core.hooksPath` you already set.

If you legitimately need real chrome/firefox credentials in `analytics.config.json` for local testing, that's fine — just do NOT commit the regenerated artifacts. Run `npm run sanitize:analytics-config && npm run build` to clean up before staging.

## Architecture

### Shared modules (`src/shared/`)

All three JS surfaces depend on these. Never duplicate parsing/formatting/clipboard/theme logic in an entry point — extend the shared module instead.

| Module               | Exports                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parsing.js`         | `parseEpoch`, `parseDateInput`, `parseDateField`, `parseTimePart`, `parseIsoString`, `normalizeRelativeFields`                                                                       |
| `formatting.js`      | `pad2`, `pad3`, `buildConversionData`, `formatRelativeParts`, `formatTimeOnly`, `formatTimeZoneOffset`                                                                               |
| `clipboard.js`       | `createCopyButton`, `bindLiveCopyButton` (both handle success/error visual states)                                                                                                   |
| `theme.js`           | `loadThemeFromStorage`, `saveThemeToStorage`, `applyTheme`, `resolveTheme`, `onSystemThemeChange`, `updateToggleIcon`, `updateMenuActive` — supports `"light" \| "dark" \| "system"` |
| `feedbackFormUrl.js` | `buildFeedbackFormUrl` — uses generated config + runtime manifest version + browser label                                                                                            |

### Build pipeline (`scripts/build.mjs`)

1. **Feedback form config generation** — reads `feedback-form.config.json` and writes `src/shared/generated/feedbackFormConfig.js`. The generated file is consumed by `feedbackFormUrl.js`. Don't hand-edit the generated file; it's regenerated every build. A default config is used if the JSON file is missing.
2. **esbuild bundling** — three entry points bundled as standalone `iife`, unminified: `src/popup/main.js` → `extension/index.js`, `src/content/main.js` → `extension/script.js`, `src/demo/main.js` → `docs/demo.js`.
3. **Manifest patching** — a single `extension/manifest.json` (Chrome/Edge MV3 base) is mutated in place for `--browser firefox` (adds `browser_specific_settings.gecko`) or `--browser chrome` (strips it). `watch:firefox` restores the original on Ctrl+C. `--pack` copies files to a temp dir and patches there, so the source manifest is never touched by pack.
4. **Pack verification** (`--pack` only) — fails the build if any bundled JS contains `.innerHTML =` assignment, or if any dotfile slipped into the zip. **Do not use `.innerHTML` in the extension bundles** — use `textContent`, `createElement`, or the shared DOM helpers.

### Runtime browser detection

Code that needs to know which browser it's running in uses `globalThis.browser || globalThis.chrome` and checks `browser.runtime.getManifest().browser_specific_settings?.gecko` to detect Firefox (see popup `isFirefoxExtension`). Don't add a build-time `process.env.BROWSER` flag — the same bundle ships to both stores, the manifest is the only thing that differs.

### Storage

State (theme preference, history, rating state, etc.) is persisted via `chrome.storage.local` / `browser.storage.local`. The popup and content script sync via `storage.onChanged` listeners so theme changes in the popup take effect on open pages. History caps at 10 entries.

## Input conventions (popup)

- All numeric inputs are `type="number"` with `min`/`max`; native spinner arrows are hidden via CSS.
- Floating labels on number inputs require a JS-managed `.has-value` class (CSS `:placeholder-shown` doesn't reliably work on number inputs).
- **Date fields** (year/month/day): show `.field-error` on blur if empty (required).
- **Time fields** (hour/minute/second/ms): default to `0` on blur if empty or invalid.
- **Relative fields**: `normalizeRelativeFields` auto-normalizes overflow on blur (90 min → 1h 30m).
- **ISO-string mode** (Date → Epoch): swaps manual fields for a single text input, pre-fills with `new Date().toISOString()` on toggle, validates on blur via `parseIsoString`.

## When editing

- The extension supports both Chrome/Edge and Firefox from one source; avoid features that require MV3-Chrome-only APIs unless guarded.
- Touching popup UI? Also check the content-script popup and the demo page — they often need the same tweak.
- Touching `manifest.json`? Make the edit on the Chrome/Edge base; `scripts/build.mjs` layers Firefox additions. Don't commit a Firefox-patched manifest.
- `scss/` is an empty legacy directory; styles live in `extension/index.css`, `extension/script.css`, and `docs/styles.css` (hand-authored CSS, no Sass pipeline).
- Built artifacts (`extension/index.js`, `extension/script.js`, `docs/demo.js`, `src/shared/generated/*`) are checked into git so the unpacked extension can be loaded directly — rebuild and commit the artifacts alongside `src/` changes.
