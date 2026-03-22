## Developer Guide

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Setup

```bash
npm install
```

### Project layout

```
src/
  shared/              # Shared utilities
    formatting.js      #   Date/time formatting helpers
    parsing.js         #   Input parsing & validation (epoch, date fields, ISO, relative)
    clipboard.js       #   Copy-to-clipboard with visual feedback
    theme.js           #   Dark/light/system theme management
  popup/main.js        # Extension popup entry point
  content/main.js      # Content script entry point
  demo/main.js         # Docs demo page entry point
extension/             # Extension package (HTML, CSS, manifest + BUILT JS)
docs/                  # GitHub Pages website (HTML, CSS + BUILT demo.js)
scripts/build.mjs      # Build, watch, and packaging script
feedback-form.config.json  # Google Form base URL + entry keys (1–3 star feedback); used by build
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files that the extension and website reference directly.
Before bundling, the build emits `src/shared/generated/feedbackFormConfig.js` from `feedback-form.config.json` (do not edit the generated file by hand).

### Key shared modules

| Module | Purpose |
|--------|---------|
| `shared/parsing.js` | `parseEpoch`, `parseDateField`, `parseTimePart`, `parseIsoString`, `normalizeRelativeFields` -- validates and normalizes all user input |
| `shared/formatting.js` | Formats dates, relative time strings, and timezone offsets for display |
| `shared/clipboard.js` | `copyToClipboard` for inline copy, `bindLiveCopyButton` for buttons with success/error animations and optional `onCopy` callback |
| `shared/theme.js` | Reads/writes theme preference (localStorage or `chrome.storage`), applies dark/light/system class |
| `shared/feedbackFormUrl.js` | Builds pre-filled Google Form URLs for low star ratings using generated `feedbackFormConfig.js` plus live manifest version and browser labels |

### Build commands

| Command | What it does |
|---------|-------------|
| `npm run build` | One-shot JS build (manifest unchanged) |
| `npm run build:chrome` | JS build + set manifest for Chrome/Edge |
| `npm run build:firefox` | JS build + set manifest for Firefox |
| `npm run watch` | Watch mode, rebuild on change (manifest unchanged) |
| `npm run watch:chrome` | Watch mode + set manifest for Chrome/Edge |
| `npm run watch:firefox` | Watch mode + set manifest for Firefox (restores on exit) |
| `npm run pack:chrome` | Build + zip for Chrome (`dist/chrome.zip`) |
| `npm run pack:firefox` | Build + zip for Firefox (`dist/firefox.zip`, manifest patched) |
| `npm run pack` | Build both zips |

Built files:
- `extension/index.js` -- from `src/popup/main.js`
- `extension/script.js` -- from `src/content/main.js`
- `docs/demo.js` -- from `src/demo/main.js`
- `src/shared/generated/feedbackFormConfig.js` -- from `feedback-form.config.json` (popup 1–3 star feedback links)

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

- `--browser firefox` adds Firefox fields to the manifest
- `--browser chrome` strips Firefox fields from the manifest
- `--pack firefox` patches the manifest in a temporary directory (does not modify the source)

When using `watch:firefox`, the manifest is patched at startup and restored to the Chrome base when you press Ctrl+C.

### Packaging for store submission

```bash
npm run pack:chrome    # --> dist/chrome.zip
npm run pack:firefox   # --> dist/firefox.zip (manifest patched automatically)
npm run pack           # both
```

Pack commands always produce a clean zip for the target browser, regardless of the current state of `extension/manifest.json`.

### Input conventions

- All numeric inputs use `type="number"` with explicit `min`/`max` attributes. Native spinner arrows are hidden via CSS.
- Floating labels on `type="number"` fields require a JavaScript-managed `.has-value` class (the CSS `:placeholder-shown` trick does not work reliably for number inputs).
- **Date fields** (year, month, day) show a `.field-error` highlight on blur if left empty.
- **Time fields** (hour, minute, second, ms) default to `0` on blur if empty or invalid.
- **Relative fields** auto-normalize overflow on blur via `normalizeRelativeFields` (e.g. 90 minutes → 1 hour 30 minutes).
- The **ISO input mode** in Date → Epoch flips the manual fields to a single text input. It pre-fills with `new Date().toISOString()` on toggle and validates on blur via `parseIsoString`.
