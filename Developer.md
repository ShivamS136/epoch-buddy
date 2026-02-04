## Developer Guide

This project uses plain HTML/CSS/JS. No build step is required.

### Local development

1. Make code changes in this repo.
2. Reload the extension in your browser.

### Chrome / Edge (MV3)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select this folder
4. Click the reload icon on the extension after changes

### Firefox (MV3)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.firefox.json`
4. Click "Reload" after changes

### Project layout

- `manifest.json` (Chrome/Edge MV3)
- `manifest.firefox.json` (Firefox MV3)
- `index.html`, `index.js`, `index.css` (extension popup)
- `script.js`, `script.css` (in-page selection popup)
- `logo.png` (icon)
