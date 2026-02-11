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
  shared/          # Shared utilities (formatting, parsing, clipboard)
  popup/main.js    # Extension popup entry point
  content/main.js  # Content script entry point
  demo/main.js     # Docs demo page entry point
extension/         # Extension package (HTML, CSS, manifest + BUILT JS)
docs/              # GitHub Pages website (HTML, CSS + BUILT demo.js)
scripts/build.mjs  # Build and packaging script
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files that the extension and website reference directly.

### Build

```bash
npm run build     # one-shot build
npm run watch     # rebuild on file change (for development)
```

Built files:
- `extension/index.js` — from `src/popup/main.js`
- `extension/script.js` — from `src/content/main.js`
- `docs/demo.js` — from `src/demo/main.js`

### Local development

1. Run `npm run watch` in the background.
2. Make code changes in `src/`.
3. Reload the extension in your browser.

### Chrome / Edge (MV3)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `extension/` folder
4. Click the reload icon on the extension after changes

### Firefox (MV3)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`
4. Click "Reload" after changes

> The build script patches the manifest with Firefox-specific fields at packaging time, so you can load the Chrome manifest directly during development.

### Packaging for store submission

```bash
npm run pack:chrome    # → dist/chrome.zip
npm run pack:firefox   # → dist/firefox.zip (manifest patched automatically)
```

### Manifests

There is a single `extension/manifest.json` (Chrome/Edge MV3). Firefox-specific settings (`browser_specific_settings.gecko`) are injected automatically by `npm run pack:firefox`.
