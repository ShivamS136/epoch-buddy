# Epoch Buddy

Epoch Buddy is a browser extension that converts epoch timestamps into readable dates (and vice‑versa), directly from any web page selection or from the extension popup.

## What you can do
- **Convert on-page selections**: select a 10/13-digit epoch on any website to see a compact conversion popover near your selection.
  ![screenshot-on-page-selection](docs/assets/screenshots/popup.png)
- **Convert from the popup**:
  - **Epoch -> Date**: paste/type an epoch and get:
    - Epoch (ms)
    - GMT time
    - Local time
    - Relative time (ago/from now)
      ![screenshot-epoch-to-date](docs/assets/screenshots/extension-1.png)
  - **Date -> Epoch**: enter date/time fields (Local or GMT) and get:
    - Epoch (ms)
    - Epoch (s)
    - Relative time
      ![screenshot-date-to-epoch](docs/assets/screenshots/extension-2.png)
  - **Relative**: enter a duration (ago/from now) and get:
    - Epoch (ms)
    - GMT time
    - Local time
    - Relative time
      ![screenshot-relative](docs/assets/screenshots/extension-3.png)
- **History**: last 10 conversions, with quick copy and a clear-history button.

## Install / run locally (Developer mode)
### Chrome / Edge
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.firefox.json`

## Development
See [`Developer.md`](Developer.md) for the project layout and development workflow.
