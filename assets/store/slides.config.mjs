// Data source of truth for the Chrome Web Store listing images.
// `scripts/gen-store-images.mjs` reads this, generates one standalone HTML page per
// entry under assets/store/pages/, renders it, and writes the final PNG to
// assets/store/images/.
//
// Two kinds of entry:
//  • Feature screen  — uses the shared template/base.html, hydrated from these fields.
//  • Bespoke tile    — sets `template` to its own HTML file under template/ (no hydration).
//
// Field guide:
//  headline   — supports inline <br> and <span class="grad"> for the gradient highlight.
//  badge      — optional green "callout" pill under the headline.
//  bullets    — { icon, color, title, desc }; `icon` keyed in template/icons.js;
//               `color` ∈ blue|green|purple|teal|dark|amber (default indigo).
//  decor      — index (0–4) into the accent-decor presets in template/hydrate.js. The
//               background (gradient/blobs/waves) is identical on every slide; only these
//               accents (sparkles/dots/rings/squiggle) move from image to image.
//  devices    — one or more screenshot cards, drawn back-to-front in array order:
//               { screenshot (repo-root path), alt, left, top, width, rotate?, dark? }.
//  annotations— { text, fx, fy, card, at, style, bend, teal, hand }.
//               `card` = which device card to point at (index, default 0).
//               `fx`/`fy` = target as a fraction (0–1) of that card's screenshot.
//               `at.left/top` = label position (stage px).
//               `style` = "curve" (default) | "dashed". `bend` = signed curvature (±0.3 typical).
//               `hand: true` = handwritten "marker" note (Caveat) instead of a pill; use \n
//               for line breaks. Decoration only — never used for headlines or body text.

export const slides = [
  {
    id: "01-highlight-to-convert",
    width: 1280,
    height: 800,
    decor: 0,
    kicker: "On any webpage",
    headline: 'Highlight an<br>epoch → <span class="grad">date</span>.',
    badge: "In just a double-click",
    bullets: [
      { icon: "cursor", color: "blue", title: "Double-click any epoch", desc: "Plain text, inputs & text areas" },
      { icon: "window", color: "teal", title: "Inline popup", desc: "Reads instantly, no tab switching" },
      { icon: "moon", color: "purple", title: "Color Themes", desc: "Intelligent color themes with dark mode." },
      { icon: "lock", color: "green", title: "Runs offline", desc: "Data never leaves your device" },
    ],
    devices: [
      {
        screenshot: "docs/assets/screenshots/highlight-popup-dark.png",
        alt: "On-page highlight popup, dark theme",
        left: 742,
        top: 452,
        width: 432,
        rotate: 4,
        dark: true,
      },
      {
        screenshot: "docs/assets/screenshots/highlight-popup.png",
        alt: "On-page highlight conversion popup",
        left: 598,
        top: 150,
        width: 540,
      },
    ],
    annotations: [
      { text: "Highlight any epoch", card: 1, fx: 0.14, fy: 0.12, at: { left: 614, top: 96 }, style: "curve", bend: 0.32 },
      {
        text: "…dark mode too!",
        hand: true,
        onDark: true,
        card: 0,
        fx: 0.5,
        fy: 0.2,
        at: { left: 980, top: 706 },
        style: "dashed",
        bend: -0.26,
      },
    ],
    footer: ["Works on any website", "plain text, inputs & text areas", "fully offline"],
  },
  {
    id: "02-epoch-to-date",
    width: 1280,
    height: 800,
    decor: 1,
    kicker: "Epoch → Date",
    headline: 'Paste an Epoch,<br>Get the <span class="grad">date</span>.',
    badge: "No epoch goes unread now!",
    bullets: [
      { icon: "clock", color: "blue", title: "Live epoch clock", desc: "Epoch of Current time ticking, ready to copy" },
      { icon: "calendar", color: "green", title: "Seconds or milliseconds", desc: "Auto-detects 10 or 13 digits" },
      { icon: "clipboardClock", color: "purple", title: "History", desc: "Your last 10 conversions with clear history facility" },
    ],
    devices: [
      {
        screenshot: "docs/assets/screenshots/ext-menu-home-epoch-to-date.png",
        alt: "Epoch to Date popup",
        left: 660,
        top: 150,
        width: 372,
      },
    ],
    annotations: [
      { text: "Live epoch clock", fx: 0.71, fy: 0.245, at: { left: 1050, top: 258 }, style: "dashed", bend: 0.3 },
      {
        text: "one-tap copy!",
        hand: true,
        teal: true,
        fx: 0.875,
        fy: 0.375,
        at: { left: 1066, top: 360 },
        style: "curve",
        bend: -0.26,
      },
    ],
    footer: ["Free · open source · works offline"],
  },
  {
    id: "03-date-to-epoch",
    width: 1280,
    height: 800,
    decor: 2,
    kicker: "Date → Epoch",
    headline: 'Any date,<br>any zone → <span class="grad">epoch</span>.',
    badge: "Need epoch of a date? We've got you covered.",
    bullets: [
      { icon: "globe", color: "blue", title: "Any IANA timezone", desc: "Local, UTC, or pick any zone" },
      { icon: "bolt", color: "amber", title: "Smart presets", desc: "Now, start- and end-of-day" },
      { icon: "code", color: "dark", title: "ISO 8601 mode", desc: "Paste an ISO string, get epoch" },
    ],
    devices: [
      {
        screenshot: "docs/assets/screenshots/ext-menu-iso-date-string-to-epoch.png",
        alt: "ISO 8601 string to epoch mode",
        left: 916,
        top: 208,
        width: 322,
      },
      {
        screenshot: "docs/assets/screenshots/ext-menu-date-to-epoch.png",
        alt: "Date to Epoch popup",
        left: 604,
        top: 136,
        width: 352,
      },
    ],
    annotations: [
      { text: "Choose timezone", card: 1, fx: 0.2, fy: 0.245, at: { left: 598, top: 92 }, style: "curve", bend: 0.3 },
      {
        text: "ISO String conversion, too!",
        hand: true,
        teal: true,
        card: 0,
        fx: 0.52,
        fy: 0.16,
        at: { left: 1018, top: 120 },
        style: "dashed",
        bend: -0.24,
      },
    ],
    footer: ["Validated fields", "Local, UTC or any IANA zone", "ISO string mode"],
  },
  {
    id: "04-relative-to-epoch",
    width: 1280,
    height: 800,
    decor: 3,
    kicker: "Relative → Epoch",
    headline: 'A timestamp,<br>relative to <span class="grad">now</span>.',
    badge: "No mental math",
    bullets: [
      { icon: "swap", color: "blue", title: "Ago or from now", desc: "Build time in either direction" },
      { icon: "sliders", color: "teal", title: "Days → milliseconds", desc: "Mix any units you need" },
      { icon: "check", color: "green", title: "Auto-normalized", desc: "90 min becomes 1h 30m" },
    ],
    devices: [
      {
        screenshot: "docs/assets/screenshots/ext-menu-relative-to-epoch.png",
        alt: "Relative to Epoch popup",
        left: 660,
        top: 150,
        width: 372,
      },
    ],
    annotations: [
      { text: "Ago or from now", fx: 0.19, fy: 0.24, at: { left: 662, top: 104 }, style: "curve", bend: 0.3 },
      {
        text: "auto-normalized!",
        hand: true,
        teal: true,
        fx: 0.55,
        fy: 0.66,
        at: { left: 1058, top: 470 },
        style: "dashed",
        bend: -0.28,
      },
    ],
    footer: ["Epoch + every configured zone + relative time, all at once"],
  },
  {
    id: "05-private-multizone",
    width: 1280,
    height: 800,
    decor: 4,
    kicker: "Private by design",
    headline: 'Dark mode, multi-zone, <span class="grad">100% local</span>.',
    badge: "No personal data shared, ever",
    bullets: [
      { icon: "moon", color: "dark", title: "Light / Dark / System", desc: "Theme that matches your OS" },
      { icon: "globe", color: "teal", title: "Multi-timezone output", desc: "See every zone you care about" },
      { icon: "shield", color: "purple", title: "No secrets", desc: "Open source. Actively maintained." },
      { icon: "coins", color: "amber", title: "Free to use, forever.", desc: "No account is required." },
    ],
    devices: [
      {
        screenshot: "docs/assets/screenshots/ext-menu-dark-mode.png",
        alt: "Dark mode popup",
        left: 916,
        top: 208,
        width: 322,
        dark: true,
      },
      {
        screenshot: "docs/assets/screenshots/ext-menu-settings-page.png",
        alt: "Settings: configured timezones",
        left: 604,
        top: 136,
        width: 352,
      },
    ],
    annotations: [
      {
        text: "Light · Dark · System",
        card: 0,
        onDark: true,
        fx: 0.73,
        fy: 0.15,
        at: { left: 1004, top: 92 },
        style: "dashed",
        bend: 0.32,
      },
      {
        text: "every zone\nyou add",
        hand: true,
        teal: true,
        card: 1,
        fx: 0.5,
        fy: 0.34,
        at: { left: 600, top: 92 },
        style: "curve",
        bend: 0.26,
      },
    ],
    footer: ["No accounts · no data leaves your browser · open source on GitHub"],
  },
  {
    id: "promo-marquee",
    width: 1400,
    height: 560,
    template: "tile-marquee.html",
  },
  {
    id: "promo-tile-small",
    width: 440,
    height: 280,
    template: "tile-small.html",
  },
];
