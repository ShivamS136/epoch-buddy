# Epoch Buddy

A browser extension that converts epoch timestamps into human-readable dates (and vice-versa) -- from any web page selection or the extension popup.

## Installation

- [Chrome Web Store](https://chromewebstore.google.com/detail/epoch-buddy/ehjdbcbcfobnkanngnjlibodhgdbhkam?utm_source=github&utm_medium=referral&utm_campaign=epoch_buddy_launch&utm_content=readme)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/epoch-buddy/?utm_source=github&utm_medium=referral&utm_campaign=epoch_buddy_launch&utm_content=readme)

## Features

- **On-page selection**: Select a 10 or 13 digit epoch on any website to see an inline conversion popup.

  ![on-page selection popup](docs/assets/screenshots/popup.png)

- **Epoch to Date**: Paste or type an epoch and get GMT, Local, and Relative time.

  ![epoch to date](docs/assets/screenshots/extension-1.png)

- **Date to Epoch**: Enter date/time fields and get Epoch (ms), Epoch (s), and Relative time.

  ![date to epoch](docs/assets/screenshots/extension-2.png)

- **Relative to Epoch**: Enter a duration (ago / from now) and get Epoch, GMT, Local, and Relative time.

  ![relative to epoch](docs/assets/screenshots/extension-3.png)

- **History**: Last 10 conversions with quick copy buttons and a clear button.

## Quick start

```bash
npm install
npm run build          # one-shot build (default: Chrome/Edge manifest)
```

### Browser-specific builds

The extension uses a single `manifest.json`. The build script patches it for the target browser:

```bash
npm run build              # build JS (manifest unchanged)
npm run build:chrome       # build JS + set manifest for Chrome/Edge
npm run build:firefox      # build JS + set manifest for Firefox

npm run watch              # watch mode (manifest unchanged)
npm run watch:chrome       # watch mode + set manifest for Chrome/Edge
npm run watch:firefox      # watch mode + set manifest for Firefox (restores on exit)
```

### Load in browser (developer mode)

**Chrome / Edge**

1. Run `npm run build` or `npm run build:chrome`
2. Open `chrome://extensions`, enable Developer mode
3. Click **Load unpacked** and select the `extension/` folder

**Firefox**

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** and select `extension/manifest.json`

### Packaging for store submission

```bash
npm run pack:chrome    # --> dist/chrome.zip
npm run pack:firefox   # --> dist/firefox.zip (manifest patched automatically)
npm run pack           # build both zips
```

Pack commands always produce a clean zip for each browser regardless of the current manifest state.

## Project structure

```
src/
  shared/            # Shared utilities (formatting, parsing, clipboard)
  popup/main.js      # Extension popup entry point
  content/main.js    # Content script entry point
  demo/main.js       # GitHub Pages demo entry point
extension/           # Extension package (HTML, CSS, manifest + built JS)
docs/                # GitHub Pages website (HTML, CSS + built demo.js)
scripts/build.mjs    # Build, watch, and packaging script
```

Source code lives in `src/`. The build step bundles each entry point into self-contained IIFE files using [esbuild](https://esbuild.github.io/).

## Development

See [`Developer.md`](Developer.md) for the full development workflow.

## Links

- [Live demo](https://shivams136.github.io/epoch-buddy/demo.html)
- [GitHub](https://github.com/ShivamS136/epoch-buddy)
