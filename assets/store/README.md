# Chrome Web Store listing image generator

Turns product screenshots + marketing copy into upload-ready store images. The copy and
layout for every image live in **one data file**; a shared HTML template provides the
background, brand mark, fonts, colours and gradient, so all the feature slides stay
visually consistent. Output sizes match what the Chrome Web Store accepts.

| Output (`images/`)             | Size     | Source                                       |
| ------------------------------ | -------- | -------------------------------------------- |
| `01-highlight-to-convert.png`  | 1280×800 | config entry → `template/base.html`          |
| `02-epoch-to-date.png`         | 1280×800 | config entry → `template/base.html`          |
| `03-date-to-epoch.png`         | 1280×800 | config entry → `template/base.html`          |
| `04-relative-to-epoch.png`     | 1280×800 | config entry → `template/base.html`          |
| `05-private-multizone.png`     | 1280×800 | config entry → `template/base.html`          |
| `promo-marquee.png`            | 1400×560 | `template/tile-marquee.html` (bespoke)       |
| `promo-tile-small.png`         | 440×280  | `template/tile-small.html` (bespoke)         |

Screenshots are **1280×800** (Chrome's required listing-screenshot size). The marquee and
small tile use Chrome's promo-tile sizes.

## Layout

```
assets/store/
  slides.config.mjs   # DATA — the only file you normally edit
  template/
    base.html         # shared template for the 5 feature slides (hydrated from config)
    theme.css         # design tokens: indigo + teal, gradient, Space Grotesk + Inter, background
    hydrate.js        # fills base.html from window.SLIDE (createElement/textContent)
    icons.js          # bullet-icon SVG table, keyed by name
    annotate.js       # draws the external arrow callouts onto the screenshot
    tile-marquee.html # bespoke promo art (not data-driven)
    tile-small.html   # bespoke promo art (not data-driven)
    fonts/            # bundled Inter + Space Grotesk woff2
    img/              # logo-transparent.png
  pages/              # generated standalone HTML (gitignored, regenerated each run)
  images/             # generated final PNGs (gitignored — run `npm run gen:store`, then upload)
scripts/gen-store-images.mjs   # the generator
```

## Generate

One-time, after `npm install`:

```bash
npx playwright install chromium
```

Then:

```bash
npm run gen:store              # all images -> assets/store/images/
npm run gen:store:pages        # just the standalone HTML pages (no browser needed)

# under the hood (extra flags):
node scripts/gen-store-images.mjs --filter 02      # only ids containing "02"
node scripts/gen-store-images.mjs --images-only    # render existing pages, skip HTML regen
node scripts/gen-store-images.mjs --no-downsample  # keep the raw 2x render for debugging
```

How it works: each entry is written as a standalone page in `pages/<id>.html` (open these
directly in a browser to preview), rendered headless at deviceScaleFactor 2, then
Lanczos-downsampled with `sharp` to the exact target size and flattened onto opaque white.

## Edit / add a slide

Everything is in [`slides.config.mjs`](./slides.config.mjs):

- **Headline** — supports inline `<br>` and `<span class="grad">…</span>` for the
  indigo→teal gradient highlight. Keep it to 2 lines so baselines align across slides.
- **Kicker** — the small uppercase pill above the headline.
- **Badge** — optional green "callout" pill shown under the headline (e.g. `"In just a double-click"`).
- **Bullets** — rich: `{ icon, color, title, desc }` renders a colored icon chip + bold title +
  description; simple `{ icon, text }` still works. `icon` is a key in
  [`template/icons.js`](./template/icons.js) (add new icons there); `color` is one of
  `blue | green | purple | teal | dark | amber` (default indigo).
- **Screenshots** — `devices` is an array of one **or more** cards, drawn back-to-front:
  `{ screenshot, alt, left, top, width, rotate?, dark? }`. `screenshot` is a path from the repo
  root (reuses the committed shots in `docs/assets/screenshots/`). Use two cards to show, e.g., a
  light + dark popup or a feature + its variant (stagger them with `left/top` and a small `rotate`).
- **Decor** — `decor: 0–4` picks an accent-decor preset (sparkle/dot/ring/squiggle positions) in
  `template/hydrate.js`, so the accents move from image to image. The **background itself**
  (gradient, blobs, bottom waves) is static in `template/base.html` and identical on every slide.
- **Annotations** — `{ text, fx, fy, card, at, style, bend, teal, hand }`. `card` is which device
  card to point at (index, default 0); `fx`/`fy` are the target as a fraction (0–1) of that card's
  screenshot; `at.left/at.top` place the label (stage px). `style` is `"curve"` (default) or
  `"dashed"`; `bend` is the signed curvature (±0.3 typical — flip the sign to arc the other way).
  `hand: true` renders a handwritten "marker" note (Caveat font, no pill; use `\n` for line breaks)
  — decoration only, never used for headlines or body text.
- **Footer** — a string, or an array of segments rendered with dot separators.

The shared look (background gradient, blobs, bottom waves, fonts, colors) lives in
`template/base.html` + `template/theme.css` and is inherited by every feature slide; only the
per-slide accent decor moves.

Add an image by appending one object. For art that doesn't fit the feature-slide layout
(like the promo tiles), set `template: "your-file.html"` to render a bespoke HTML file as-is.

## Design tokens

`template/theme.css` — indigo `#6366f1` / `#4f46e5` + teal `#14b8a6` on a light gradient
background, **Space Grotesk** (display) + **Inter** (text), both bundled in `template/fonts/`.
This is the shared "look" inherited by every image.
