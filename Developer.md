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
  background/main.js   # Extension background service worker (GA4 MP egress)
  demo/main.js         # Docs demo page entry point
extension/             # Extension package (HTML, CSS, manifest + BUILT JS)
docs/                  # GitHub Pages website (HTML, CSS + BUILT demo.js)
scripts/build.mjs      # Build, watch, and packaging script
feedback-form.config.json  # Google Form base URL + entry keys (1–3 star feedback); used by build
analytics.config.json       # GA4 measurement IDs + API secrets (chrome/firefox/demo); gitignored
analytics.config.example.json  # Committed template to copy from
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files that the extension and website reference directly.
Before bundling, the build emits two generated modules (do not edit them by hand):

- `src/shared/generated/feedbackFormConfig.js` from `feedback-form.config.json`
- `src/shared/generated/analyticsConfig.js` from `analytics.config.json`

### Key shared modules

| Module                      | Purpose                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/parsing.js`         | `parseEpoch`, `parseDateField`, `parseTimePart`, `parseIsoString`, `normalizeRelativeFields` -- validates and normalizes all user input. `parseIsoString` accepts any IANA zone (not just `utc`) as the fallback and resolves offset-less strings via `zoneOffsetMinutes` |
| `shared/formatting.js`      | Formats dates, relative time strings, and timezone offsets for display. Also exports `buildZoneRows`, `zoneDisplayLabel`, `formatOffsetInZone`, `zoneOffsetMinutes` for multi-zone rendering                                                                              |
| `shared/clipboard.js`       | `copyToClipboard` for inline copy, `bindLiveCopyButton` for buttons with success/error animations and optional `onCopy` callback                                                                                                                                          |
| `shared/theme.js`           | Reads/writes theme preference (localStorage or `chrome.storage`), applies dark/light/system class                                                                                                                                                                         |
| `shared/timezones.js`       | User-configurable timezone list: `DEFAULT_TIMEZONES`, `isValidTimezone`, `getAvailableTimezones`, `load/saveTimezonesToStorage`, `onTimezonesChanged` (storage sync across surfaces)                                                                                      |
| `shared/feedbackFormUrl.js` | Builds pre-filled Google Form URLs for low star ratings using generated `feedbackFormConfig.js` plus live manifest version and browser labels                                                                                                                             |
| `shared/analytics.js`       | `trackEvent(name, params)`, `EVENTS` constants, `getOptOut` / `setOptOut`. Routes to background SW (extension context) or `gtag.js` (demo web context). Opt-out is keyed on `analyticsOptOut` (extension) / `epochBuddyAnalyticsOptOut` (demo); demo also honors `navigator.doNotTrack` |

### Build commands

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run build`         | One-shot JS build (manifest unchanged)                         |
| `npm run build:chrome`  | JS build + set manifest for Chrome/Edge                        |
| `npm run build:firefox` | JS build + set manifest for Firefox                            |
| `npm run watch`         | Watch mode, rebuild on change (manifest unchanged)             |
| `npm run watch:chrome`  | Watch mode + set manifest for Chrome/Edge                      |
| `npm run watch:firefox` | Watch mode + set manifest for Firefox (restores on exit)       |
| `npm run pack:chrome`   | Build + zip for Chrome (`dist/chrome.zip`)                     |
| `npm run pack:firefox`  | Build + zip for Firefox (`dist/firefox.zip`, manifest patched) |
| `npm run pack`          | Build both zips                                                |

Built files:

- `extension/index.js` -- from `src/popup/main.js`
- `extension/script.js` -- from `src/content/main.js`
- `extension/background.js` -- from `src/background/main.js` (MV3 service worker that receives `ga:track` messages and POSTs to GA4 Measurement Protocol)
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

- `--browser firefox` adds Firefox fields to the manifest, rewrites `background: { service_worker: ... }` to `background: { scripts: [...] }` (Firefox MV3 doesn't accept `service_worker`), and sets `data_collection_permissions.required: ["technicalAndInteraction"]` on the `gecko` settings
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

Pack also runs verification on the bundled output and fails if any bundled JS assigns to `.innerHTML` or if any dotfile made it into the zip. Use `textContent` / `createElement` in extension code instead of `.innerHTML =`.

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
