/**
 * Analytics facade used by all surfaces.
 *
 * In the extension (popup + content script) events are forwarded to the
 * background service worker over runtime.sendMessage; the worker owns the
 * GA4 Measurement Protocol call.
 *
 * On the demo site there is no extension runtime, so events are sent
 * directly via gtag.js which is bootstrapped lazily on first use.
 *
 * `getOptOut()` is the single gate for both paths. It is checked on every
 * call so toggling the setting takes effect immediately without a reload.
 */

import { ANALYTICS_CONFIG } from "./generated/analyticsConfig.js";

export const EVENTS = {
  POPUP_OPENED: "popup_opened",
  EPOCH_TO_DATE: "epoch_to_date",
  DATE_TO_EPOCH: "date_to_epoch",
  UTC_TO_EPOCH: "utc_to_epoch",
  RELATIVE_CALCULATED: "relative_calculated",
  HISTORY_CLEARED: "history_cleared",
  DATE_PRESET_USED: "date_preset_used",
  THEME_CHANGED: "theme_changed",
  SETTINGS_OPENED: "settings_opened",
  TIMEZONE_MODIFIED: "timezone_modified",
  EXTERNAL_LINK_CLICKED: "external_link_clicked",
  RATING_CLICKED: "rating_clicked",
  RATING_FOOTER_ACTION: "rating_footer_action",
  FLOATING_POPUP_SHOWN: "floating_popup_shown",
  FLOATING_COPY_CLICKED: "floating_copy_clicked",
  DEMO_OPENED: "demo_opened",
  WELCOME_VIEWED: "welcome_viewed",
  WELCOME_DISMISSED: "welcome_dismissed",
  WELCOME_DEMO_CLICKED: "welcome_demo_clicked",
};

const OPT_OUT_STORAGE_KEY = "analyticsOptOut";
const DEMO_OPT_OUT_STORAGE_KEY = "epochBuddyAnalyticsOptOut";

const browser =
  (typeof globalThis !== "undefined" &&
    (globalThis.browser || globalThis.chrome)) ||
  null;

// `chrome.runtime.sendMessage` also exists on regular webpages (for external
// extension messaging), so presence of that function is NOT sufficient to
// detect an extension context. `runtime.id` is only set inside an extension's
// own popup / content script / service worker.
const isExtensionRuntime = Boolean(
  browser &&
  browser.runtime &&
  browser.runtime.id &&
  typeof browser.runtime.sendMessage === "function",
);

/**
 * Resolve opt-out state. Extension path uses chrome.storage.local and treats
 * a missing key as opted-IN (analytics on by default per product decision).
 * Demo path uses window.localStorage and also respects navigator.doNotTrack.
 */
export async function getOptOut() {
  if (isExtensionRuntime && browser.storage?.local) {
    return new Promise((resolve) => {
      try {
        browser.storage.local.get({ [OPT_OUT_STORAGE_KEY]: false }, (res) => {
          resolve(Boolean(res[OPT_OUT_STORAGE_KEY]));
        });
      } catch {
        resolve(false);
      }
    });
  }
  if (typeof window !== "undefined") {
    if (window.navigator?.doNotTrack === "1") return true;
    try {
      return window.localStorage.getItem(DEMO_OPT_OUT_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }
  return false;
}

export async function setOptOut(optOut) {
  if (isExtensionRuntime && browser.storage?.local) {
    return new Promise((resolve) => {
      try {
        browser.storage.local.set(
          { [OPT_OUT_STORAGE_KEY]: Boolean(optOut) },
          () => resolve(),
        );
      } catch {
        resolve();
      }
    });
  }
  if (typeof window !== "undefined") {
    try {
      if (optOut) {
        window.localStorage.setItem(DEMO_OPT_OUT_STORAGE_KEY, "1");
      } else {
        window.localStorage.removeItem(DEMO_OPT_OUT_STORAGE_KEY);
      }
    } catch {
      // localStorage may throw in private mode; swallow.
    }
  }
}

/**
 * Subscribe to opt-out changes (extension only). Demo page sets the value
 * synchronously during its own UI handler and calls trackEvent after, so a
 * listener isn't needed there.
 */
export function onOptOutChanged(callback) {
  if (!isExtensionRuntime || !browser.storage?.onChanged) return () => {};
  const listener = (changes, area) => {
    if (area === "local" && changes[OPT_OUT_STORAGE_KEY]) {
      callback(Boolean(changes[OPT_OUT_STORAGE_KEY].newValue));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

// ── Demo-side gtag bootstrap ────────────────────────────────────

let demoGtagReady = false;
let demoGtagLoading = false;

function ensureDemoGtag() {
  if (demoGtagReady || demoGtagLoading) return;
  const tagId = ANALYTICS_CONFIG.demo?.tag_id;
  if (!tagId || !tagId.startsWith("G-")) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  demoGtagLoading = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
  script.addEventListener("load", () => {
    demoGtagReady = true;
  });
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", tagId, { anonymize_ip: true, send_page_view: false });
}

// ── Public API ──────────────────────────────────────────────────

export async function trackEvent(name, params = {}) {
  if (await getOptOut()) return;

  if (isExtensionRuntime) {
    try {
      browser.runtime.sendMessage({
        type: "ga:track",
        name,
        params,
      });
    } catch {
      // Background worker unavailable (e.g. during unload) — drop event.
    }
    return;
  }

  // Demo / web-page context
  if (typeof window === "undefined") return;
  ensureDemoGtag();
  const payload = { ...params, source: params.source ?? "demo" };
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, payload);
    } else {
      // Script still loading — queue via dataLayer so the event fires once
      // gtag initializes. dataLayer is already created by ensureDemoGtag.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", name, payload]);
    }
  } catch {
    // Swallow all analytics errors — they must never affect UX.
  }
}
