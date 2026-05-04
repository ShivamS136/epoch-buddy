## Developer Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Setup

```bash
npm install
cp analytics.config.example.json analytics.config.json   # optional; leave placeholders to disable analytics in local builds
```

`analytics.config.json` holds your real GA4 credentials and is gitignored. The build reads it and generates `src/shared/generated/analyticsConfig.js`. If the file is missing or the credentials are empty, the analytics module no-ops at runtime — local builds work fine without GA.

### Project layout

```
src/
  shared/              # Shared utilities
    formatting.js      #   Date/time formatting helpers (incl. zoneOffsetMinutes)
    parsing.js         #   Input parsing & validation (epoch, date fields, ISO, relative)
    clipboard.js       #   Copy-to-clipboard with visual feedback
    theme.js           #   Dark/light/system theme management
    timezones.js       #   User-configurable timezone list (storage + sync)
    analytics.js       #   GA4 event facade (extension -> SW, demo -> gtag)
    feedbackFormUrl.js #   Google Form URL builder for low-star feedback
  popup/main.js        # Extension popup entry point
  content/main.js      # Content script entry point
  background/main.js   # Extension background service worker (GA4 MP egress + first-install welcome tab)
  welcome/main.js      # First-install onboarding tab entry point
  demo/main.js         # Docs demo page entry point
extension/             # Extension package (HTML, CSS, manifest + BUILT JS)
docs/                  # GitHub Pages website (HTML, CSS + BUILT demo.js)
scripts/
  build.mjs                    # Build, watch, and packaging script
  forbidden-secrets.mjs        # Single source of truth for the secret-prefix block list
  check-secrets.mjs            # Standalone scanner (npm run check:secrets)
  sanitize-analytics-config.mjs # Reset chrome+firefox blocks from example, keep demo (npm run sanitize:analytics-config)
  install-hooks.mjs            # Auto-wires .githooks via npm prepare lifecycle
.githooks/pre-commit           # Staged-content scan for forbidden secret prefixes
feedback-form.config.json      # Google Form base URL + entry keys (1–3 star feedback); used by build
analytics.config.json          # GA4 measurement IDs + API secrets (chrome/firefox/demo); gitignored
analytics.config.example.json  # Committed template to copy from
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files that the extension and website reference directly.
Before bundling, the build emits two generated modules (do not edit them by hand):

- `src/shared/generated/feedbackFormConfig.js` from `feedback-form.config.json`
- `src/shared/generated/analyticsConfig.js` from `analytics.config.json`

### Key shared modules

| Module                      | Purpose                                                                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/parsing.js`         | `parseEpoch`, `parseDateField`, `parseTimePart`, `parseIsoString`, `normalizeRelativeFields` -- validates and normalizes all user input. `parseIsoString` accepts any IANA zone (not just `utc`) as the fallback and resolves offset-less strings via `zoneOffsetMinutes`               |
| `shared/formatting.js`      | Formats dates, relative time strings, and timezone offsets for display. Also exports `buildZoneRows`, `zoneDisplayLabel`, `formatOffsetInZone`, `zoneOffsetMinutes` for multi-zone rendering                                                                                            |
| `shared/clipboard.js`       | `copyToClipboard` for inline copy, `bindLiveCopyButton` for buttons with success/error animations and optional `onCopy` callback                                                                                                                                                        |
| `shared/theme.js`           | Reads/writes theme preference (localStorage or `chrome.storage`), applies dark/light/system class                                                                                                                                                                                       |
| `shared/timezones.js`       | User-configurable timezone list: `DEFAULT_TIMEZONES`, `isValidTimezone`, `getAvailableTimezones`, `load/saveTimezonesToStorage`, `onTimezonesChanged` (storage sync across surfaces)                                                                                                    |
| `shared/feedbackFormUrl.js` | Builds pre-filled Google Form URLs for low star ratings using generated `feedbackFormConfig.js` plus live manifest version and browser labels                                                                                                                                           |
| `shared/analytics.js`       | `trackEvent(name, params)`, `EVENTS` constants, `getOptOut` / `setOptOut`. Routes to background SW (extension context) or `gtag.js` (demo web context). Opt-out is keyed on `analyticsOptOut` (extension) / `epochBuddyAnalyticsOptOut` (demo); demo also honors `navigator.doNotTrack` |

### Build commands

| Command                             | What it does                                                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run build`                     | One-shot JS build (manifest unchanged)                                                                         |
| `npm run build:chrome`              | JS build + set manifest for Chrome/Edge                                                                        |
| `npm run build:firefox`             | JS build + set manifest for Firefox                                                                            |
| `npm run watch`                     | Watch mode, rebuild on change (manifest unchanged)                                                             |
| `npm run watch:chrome`              | Watch mode + set manifest for Chrome/Edge                                                                      |
| `npm run watch:firefox`             | Watch mode + set manifest for Firefox (restores on exit)                                                       |
| `npm run pack:chrome`               | Build + zip for Chrome (`dist/chrome.zip`)                                                                     |
| `npm run pack:firefox`              | Build + zip for Firefox (`dist/firefox.zip`, manifest patched)                                                 |
| `npm run pack`                      | Build both zips                                                                                                |
| `npm run check:secrets`             | Scan committed/built artifacts for forbidden analytics-secret prefixes (see _Secret hygiene_)                  |
| `npm run sanitize:analytics-config` | Reset chrome + firefox blocks in `analytics.config.json` from the example file (preserves your local demo key) |

Built files:

- `extension/index.js` -- from `src/popup/main.js`
- `extension/script.js` -- from `src/content/main.js`
- `extension/background.js` -- from `src/background/main.js` (MV3 service worker that receives `ga:track` messages and POSTs to GA4 Measurement Protocol; also opens the welcome tab once on install/update)
- `extension/welcome.js` -- from `src/welcome/main.js` (powers `extension/welcome.html`)
- `docs/demo.js` -- from `src/demo/main.js`
- `src/shared/generated/feedbackFormConfig.js` -- from `feedback-form.config.json` (popup 1–3 star feedback links)
- `src/shared/generated/analyticsConfig.js` -- from `analytics.config.json` (GA4 credentials)

### Local development

1. Run `npm run watch` (or `npm run watch:firefox` for Firefox) in the background.
2. Make code changes in `src/`.
3. Reload the extension in your browser.

### Loading the extension

#### Chrome / Edge (MV3)

1. Run `npm run build` or `npm run build:chrome`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked" and select the `extension/` folder
5. Click the reload icon on the extension card after changes

#### Firefox (MV3)

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `extension/manifest.json`
5. Click "Reload" after changes

### Manifests

There is a single `extension/manifest.json` that serves as the base (Chrome/Edge MV3). Firefox-specific settings (`browser_specific_settings.gecko`) are added or removed by the build script:

- `--browser firefox` adds Firefox fields to the manifest (`browser_specific_settings.gecko.id` and `data_collection_permissions.required: ["technicalAndInteraction"]`) and rewrites `background: { service_worker: ... }` to `background: { scripts: [...] }` (Firefox MV3 doesn't accept `service_worker`). The AMO upload form also asks about data collection — the form and manifest answers should match.
- `--browser chrome` strips Firefox fields and resets `background` to the MV3 `service_worker` form
- `--pack firefox` patches the manifest in a temporary directory (does not modify the source)

When using `watch:firefox`, the manifest is patched at startup and restored to the Chrome base when you press Ctrl+C.

### Packaging for store submission

```bash
npm run pack:chrome    # --> dist/chrome.zip
npm run pack:firefox   # --> dist/firefox.zip (manifest patched automatically)
npm run pack           # both
```

Pack commands always produce a clean zip for the target browser, regardless of the current state of `extension/manifest.json`.

#### Pack-time analytics-config swap

Pack always ships the **production** GA4 chrome/firefox MP credentials (the zips need them to write events from the store-installed extension). To keep those credentials out of the committed working tree, pack juggles three files around `analytics.config.json`:

| File                            | Tracked?   | Role                                                                                                                                                                       |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics.config.values.json`  | gitignored | Holds the real chrome/firefox/demo credentials. **Pack reads it; nothing else may touch it.**                                                                              |
| `analytics.config.base.json`    | gitignored | Dev-safe baseline (placeholder chrome+firefox, real demo). Pack restores `analytics.config.json` from it after zipping. Seed it once from `analytics.config.example.json`. |
| `analytics.config.json`         | gitignored | Transient. The build always reads this. Pack overwrites it during the swap and restores it after.                                                                          |
| `analytics.config.example.json` | committed  | Public template. Used as the seed for `analytics.config.base.json` on a fresh clone.                                                                                       |

Flow on `npm run pack[:chrome|:firefox]`:

1. Verify both `analytics.config.values.json` and `analytics.config.base.json` exist (fail early with a hint pointing at the example file if base is missing).
2. Snapshot the `base.json` contents in memory.
3. Overwrite `analytics.config.json` with `values.json`.
4. Build, zip, run pack checks (see below).
5. In `finally`: restore `analytics.config.json` from the snapshot and rebuild — so the on-disk artifacts return to the dev-safe baseline and never carry prod credentials into a subsequent commit. Restoration runs even if the build or zip step throws.

Pack runs the following checks and fails the build if any trip:

- any bundled JS uses a banned DOM-write pattern (currently `.innerHTML =` assignment — use `textContent` / `createElement` / `replaceChildren` instead)
- any dotfile made it into the zip
- any bundled JS in the zip is **missing** an expected credential prefix from `scripts/forbidden-secrets.mjs` — guards against shipping a zip that silently lost the credentials (e.g. if the swap was skipped or `values.json` was empty)

Pack does **not** run the post-build "did this leak into committed artifacts?" scan — that's `npm run check:secrets` (and the pre-commit hook). The pack restore step makes that scan unnecessary in the normal pack path.

### Secret hygiene

`analytics.config.json` is gitignored and holds real GA4 Measurement Protocol credentials for the chrome and firefox builds. Those credentials must NEVER end up in committed artifacts — `src/shared/generated/analyticsConfig.js` and the bundled `extension/*.js` + `docs/demo.js` are checked in and shipped publicly. The `demo` gtag tag id is intentionally public and is fine to leave in artifacts.

Forbidden prefixes are defined in `scripts/forbidden-secrets.mjs`. If you rotate a credential, add the new prefix there.

**Workflow before committing built artifacts:**

```bash
npm run sanitize:analytics-config   # restores chrome+firefox to placeholders, keeps your demo key
npm run build                       # regenerate artifacts so they no longer embed the secrets
npm run check:secrets               # confirm clean (also runs as part of `npm run pack`)
git add <regenerated artifacts>
git commit ...
```

`scripts/install-hooks.mjs` runs via npm's `prepare` lifecycle, so `npm install` after a fresh clone wires `.githooks` as `core.hooksPath` automatically. The `.githooks/pre-commit` hook scans the _staged_ version of each tracked artifact (not just the working tree) and aborts the commit if any forbidden prefix would land in HEAD. The installer is idempotent and refuses to clobber a custom `core.hooksPath` you already set — in that case enable manually with `git config core.hooksPath .githooks` or merge `.githooks/pre-commit` into your existing setup.

If you legitimately need real chrome/firefox credentials in `analytics.config.json` for local testing, that's fine — just run `npm run sanitize:analytics-config && npm run build` before staging so the regenerated artifacts come out clean.

### First-install welcome tab

`src/background/main.js` listens for `runtime.onInstalled` with reason `install` or `update`, and opens `extension/welcome.html` in a new tab the first time. A `welcomePageShown` flag in `chrome.storage.local` makes this a once-ever event per profile (the flag survives updates but is wiped on uninstall, so a clean reinstall re-onboards). `browser_update` and `shared_module_update` are ignored.

The welcome page (`extension/welcome.html` + `extension/welcome.css`, JS bundled from `src/welcome/main.js`):

- detects Chrome/Edge vs Firefox via `runtime.getManifest().browser_specific_settings?.gecko` and renders the appropriate "pin to toolbar" steps
- bootstraps the user's saved theme preference from `chrome.storage.local` (and listens for changes so toggling theme in the popup re-themes the welcome tab live)
- emits three GA events (`welcome_viewed`, `welcome_dismissed`, `welcome_demo_clicked`) so onboarding adoption can be measured against popup engagement

Like the other extension surfaces, it uses `textContent` and `createElement` only and is covered by the same banned-DOM-write pack check listed above (`extension/welcome.js` is in the scan list).

To re-trigger onboarding while developing: open the service-worker DevTools and run `chrome.storage.local.remove("welcomePageShown")`, then reload the extension. (`onInstalled` does not refire on a manual reload — to test the install path itself, remove and re-add the unpacked extension.)

### Input conventions

- All numeric inputs use `type="number"` with explicit `min`/`max` attributes. Native spinner arrows are hidden via CSS.
- Floating labels on `type="number"` fields require a JavaScript-managed `.has-value` class (the CSS `:placeholder-shown` trick does not work reliably for number inputs).
- **Date fields** (year, month, day) show a `.field-error` highlight on blur if left empty.
- **Time fields** (hour, minute, second, ms) default to `0` on blur if empty or invalid.
- **Relative fields** auto-normalize overflow on blur via `normalizeRelativeFields` (e.g. 90 minutes → 1 hour 30 minutes).
- The **ISO input mode** in Date → Epoch flips the manual fields to a single text input. It pre-fills with `new Date().toISOString()` on toggle and validates on blur via `parseIsoString`. The fallback-timezone picker is populated from the user-configured zone list (same source as the manual-mode zone picker).

### Settings page & timezone list

- The Settings view (`#settings-view` in `extension/index.html`) is toggled in-popup from the header gear icon.
- The user-configured timezone list is stored in `chrome.storage.local` via `shared/timezones.js`. All surfaces (popup converter tabs, content-script popup, history rows) subscribe via `onTimezonesChanged` and re-render on change.
- The timezone list in Settings is drag-and-drop reorderable (native HTML5 drag/drop on `.tz-row` with a grip handle); on drop the array is reordered and persisted via `saveTimezonesToStorage`, which fans out the change.
- The Settings theme picker uses the same `theme-menu` markup + `data-theme-option` click delegation as the header menu, styled with the `.theme-menu-inline` modifier. Both menus stay in sync through `updateMenuActive`.
