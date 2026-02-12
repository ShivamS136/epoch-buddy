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
  shared/            # Shared utilities (formatting, parsing, clipboard)
  popup/main.js      # Extension popup entry point
  content/main.js    # Content script entry point
  demo/main.js       # Docs demo page entry point
extension/           # Extension package (HTML, CSS, manifest + BUILT JS)
docs/                # GitHub Pages website (HTML, CSS + BUILT demo.js)
scripts/build.mjs    # Build, watch, and packaging script
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files that the extension and website reference directly.

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
