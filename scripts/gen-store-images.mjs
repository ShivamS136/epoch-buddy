#!/usr/bin/env node
/* Generate Chrome Web Store listing images from HTML.
 *
 * Pipeline per entry in assets/store/slides.config.mjs:
 *   1. PAGE   — read the shared template/base.html (or the entry's bespoke `template`),
 *               inject <base href> + window.SLIDE, write a standalone, browser-openable
 *               page to assets/store/pages/<id>.html.
 *   2. RENDER — load that page in headless Chromium at deviceScaleFactor 2, wait for
 *               fonts + annotation arrows, screenshot the width×height clip (2x buffer).
 *   3. SCALE  — Lanczos-downsample to the exact target size and flatten onto opaque
 *               white with sharp, writing assets/store/images/<id>.png.
 *
 * Flags:
 *   --filter <substr>   only entries whose id includes <substr>
 *   --pages-only        write pages and stop (no headless browser / no sharp needed)
 *   --images-only       render existing pages, skip regenerating the HTML
 *   --no-downsample     keep the raw 2x render as <id>@2x.png (debug)
 */
/* global document */ // used only inside page.evaluate/waitForFunction callbacks, which run in the browser
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join, resolve } from "path";
import { slides } from "../assets/store/slides.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TEMPLATE_DIR = join(ROOT, "assets/store/template");
const PAGES_DIR = join(ROOT, "assets/store/pages");
const IMAGES_DIR = join(ROOT, "assets/store/images");
const TEMPLATE_BASE_URL = pathToFileURL(TEMPLATE_DIR).href + "/";

const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function option(name) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
}
const filter = option("--filter");
const pagesOnly = flag("--pages-only");
const imagesOnly = flag("--images-only");
const noDownsample = flag("--no-downsample");

const targets = slides.filter((s) => !filter || s.id.includes(filter));
if (targets.length === 0) {
  console.error(`No slides matched${filter ? ` --filter "${filter}"` : ""}.`);
  process.exit(1);
}

mkdirSync(PAGES_DIR, { recursive: true });
mkdirSync(IMAGES_DIR, { recursive: true });

// ---- 1. page generation --------------------------------------------------
function pagePath(slide) {
  return join(PAGES_DIR, `${slide.id}.html`);
}

function buildPage(slide) {
  const templateFile = slide.template || "base.html";
  const tpl = readFileSync(join(TEMPLATE_DIR, templateFile), "utf8");

  const data = { ...slide };
  // resolve each screenshot card's repo-root-relative path to an absolute file:// URL
  if (Array.isArray(slide.devices)) {
    data.devices = slide.devices.map((d) => ({
      ...d,
      screenshotUrl: d.screenshot ? pathToFileURL(join(ROOT, d.screenshot)).href : undefined,
    }));
  }
  // Escape "<" so a stray "</script>" inside any string can't close the inline tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // The <base> must precede the stylesheet/script links it governs, so inject it
  // right after <meta charset> (which stays first) rather than before </head>.
  const charset = '<meta charset="utf-8" />';
  const inject = `${charset}\n    <base href="${TEMPLATE_BASE_URL}" />\n    <script>window.SLIDE = ${json};</script>`;
  const html = tpl.replace(charset, inject);

  const out = pagePath(slide);
  writeFileSync(out, html);
  console.log(`page   ${slide.id} -> ${out.replace(ROOT + "/", "")}`);
  return out;
}

if (!imagesOnly) {
  for (const slide of targets) buildPage(slide);
}
if (pagesOnly) {
  console.log("PAGES DONE");
  process.exit(0);
}

// ---- 2 + 3. render and downsample ---------------------------------------
const { chromium } = await import("playwright");
const sharp = (await import("sharp")).default;

const browser = await chromium.launch({
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--force-color-profile=srgb",
    "--hide-scrollbars",
  ],
});

try {
  for (const slide of targets) {
    const { id, width, height } = slide;
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(pagePath(slide)).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    // wait for annotation arrows to finish drawing (slides only; tiles have no svg.arrows)
    await page
      .waitForFunction(
        () =>
          !document.querySelector("svg.arrows") ||
          document.documentElement.getAttribute("data-anno-done") === "1",
        { timeout: 3000 },
      )
      .catch(() => {});
    await page.waitForTimeout(180); // settle gradients/shadows before capture

    const buf = await page.screenshot({ clip: { x: 0, y: 0, width, height } });
    await page.close();

    if (noDownsample) {
      const out = join(IMAGES_DIR, `${id}@2x.png`);
      writeFileSync(out, buf);
      console.log(
        `image  ${id} -> ${id}@2x.png (${width * 2}x${height * 2}, raw)`,
      );
    } else {
      const out = join(IMAGES_DIR, `${id}.png`);
      await sharp(buf)
        .resize(width, height, { kernel: "lanczos3" })
        .flatten({ background: "#ffffff" })
        .png()
        .toFile(out);
      console.log(`image  ${id} -> ${id}.png (${width}x${height})`);
    }
  }
} finally {
  await browser.close();
}

console.log("ALL DONE");
