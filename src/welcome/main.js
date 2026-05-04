/**
 * First-install onboarding tab.
 *
 * - Picks browser-specific "how to pin" copy (Chrome/Edge vs Firefox).
 * - Bootstraps the user's saved theme so the page matches the popup.
 * - Tracks viewed / dismissed / demo-click events so adoption of the
 *   onboarding can be measured against extension-popup engagement.
 *
 * The page is opened by the background service worker on
 * runtime.onInstalled (reason "install"), so this file runs at most
 * once per fresh install.
 */

import {
  applyTheme,
  loadThemeFromStorage,
  onSystemThemeChange,
} from "../shared/theme.js";
import { EVENTS, trackEvent } from "../shared/analytics.js";

const browser = globalThis.browser || globalThis.chrome;

function isFirefox() {
  try {
    const m = browser?.runtime?.getManifest?.();
    return Boolean(m && m.browser_specific_settings?.gecko);
  } catch {
    return false;
  }
}

function appVersion() {
  try {
    return browser?.runtime?.getManifest?.()?.version || "";
  } catch {
    return "";
  }
}

// ── Theme bootstrap ─────────────────────────────────────────────

function initTheme() {
  loadThemeFromStorage((preference) => applyTheme(preference));

  // System-theme follow when preference is "system" — applyTheme
  // removes data-theme and CSS @media takes over, but if the user
  // toggles OS theme while the welcome tab is open, nothing
  // re-applies. The CSS prefers-color-scheme handles that natively.
  onSystemThemeChange(() => {
    // No-op: CSS handles the system case via prefers-color-scheme.
    // Hook retained so we can react if we ever need to (e.g. updating
    // an in-page theme toggle).
  });

  if (browser?.storage?.onChanged) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.theme) {
        applyTheme(changes.theme.newValue);
      }
    });
  }
}

// ── Pin instructions ────────────────────────────────────────────

function renderPinSteps() {
  const list = document.getElementById("pin-steps");
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);

  const steps = isFirefox()
    ? [
        ["Click the ", { strong: "puzzle-piece" }, " icon in the toolbar."],
        ["Find ", { strong: "Epoch Buddy" }, " in the list."],
        [
          "Click the gear next to it, then choose ",
          { strong: "Pin to Toolbar" },
          ".",
        ],
      ]
    : [
        [
          "Click the ",
          { strong: "puzzle-piece" },
          " (Extensions) icon in the toolbar.",
        ],
        ["Find ", { strong: "Epoch Buddy" }, " in the list."],
        [
          "Click the ",
          { strong: "pin" },
          " icon next to it so it stays visible.",
        ],
      ];

  for (const parts of steps) {
    const li = document.createElement("li");
    for (const part of parts) {
      if (typeof part === "string") {
        li.appendChild(document.createTextNode(part));
      } else if (part && typeof part === "object" && part.strong) {
        const strong = document.createElement("strong");
        strong.textContent = part.strong;
        li.appendChild(strong);
      }
    }
    list.appendChild(li);
  }
}

// ── Footer / version ────────────────────────────────────────────

function renderVersion() {
  const el = document.getElementById("version-text");
  if (!el) return;
  const v = appVersion();
  el.textContent = v || "—";
}

// ── CTAs ────────────────────────────────────────────────────────

function wireDismiss() {
  const btn = document.getElementById("dismiss-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    trackEvent(EVENTS.WELCOME_DISMISSED, {
      browser_target: isFirefox() ? "firefox" : "chrome",
    });
    // Try to close. window.close() works for tabs created by the
    // extension in Chrome; in Firefox it may be blocked, so as a
    // fallback we navigate to about:blank to at least clear the page.
    try {
      window.close();
    } catch {
      // ignored
    }
    // If close was blocked the tab will still be here — leave it as is.
  });
}

function wireDemoLink() {
  const link = document.getElementById("demo-link");
  if (!link) return;
  link.addEventListener("click", () => {
    trackEvent(EVENTS.WELCOME_DEMO_CLICKED, {
      browser_target: isFirefox() ? "firefox" : "chrome",
    });
  });
}

// ── Init ────────────────────────────────────────────────────────

function init() {
  initTheme();
  renderPinSteps();
  renderVersion();
  wireDismiss();
  wireDemoLink();

  trackEvent(EVENTS.WELCOME_VIEWED, {
    browser_target: isFirefox() ? "firefox" : "chrome",
    app_version: appVersion(),
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
