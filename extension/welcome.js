(() => {
  // src/shared/theme.js
  var THEME_KEY = "theme";
  var MEDIA_QUERY = "(prefers-color-scheme: dark)";
  function getSystemTheme() {
    return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
  }
  function applyTheme(preference, target = document.documentElement) {
    if (preference === "dark") {
      target.setAttribute("data-theme", "dark");
    } else if (preference === "light") {
      target.setAttribute("data-theme", "light");
    } else {
      target.removeAttribute("data-theme");
    }
  }
  function onSystemThemeChange(callback) {
    const mql = window.matchMedia(MEDIA_QUERY);
    const handler = () => callback(getSystemTheme());
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }
  function loadThemeFromStorage(callback) {
    const browser3 = globalThis.browser || globalThis.chrome;
    if (!browser3?.storage?.local) {
      callback("system");
      return;
    }
    browser3.storage.local.get({ [THEME_KEY]: "system" }, (result) => {
      callback(result[THEME_KEY] || "system");
    });
  }

  // src/shared/generated/analyticsConfig.js
  var ANALYTICS_CONFIG = {
    chrome: {
      measurement_id: "G-XXXXXXXXXX",
      api_secret: "CHROME_STREAM_API_SECRET"
    },
    firefox: {
      measurement_id: "G-YYYYYYYYYY",
      api_secret: "FIREFOX_STREAM_API_SECRET"
    },
    demo: {
      measurement_id: "G-CVXQHWB0WH",
      tag_id: "G-CVXQHWB0WH"
    }
  };

  // src/shared/analytics.js
  var EVENTS = {
    POPUP_OPENED: "popup_opened",
    POPUP_PERF: "popup_perf",
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
    WELCOME_DEMO_CLICKED: "welcome_demo_clicked"
  };
  var OPT_OUT_STORAGE_KEY = "analyticsOptOut";
  var DEMO_OPT_OUT_STORAGE_KEY = "epochBuddyAnalyticsOptOut";
  var browser = typeof globalThis !== "undefined" && (globalThis.browser || globalThis.chrome) || null;
  var isExtensionRuntime = Boolean(
    browser && browser.runtime && browser.runtime.id && typeof browser.runtime.sendMessage === "function"
  );
  async function getOptOut() {
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
  var demoGtagReady = false;
  var demoGtagLoading = false;
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
    window.gtag("js", /* @__PURE__ */ new Date());
    window.gtag("config", tagId, { anonymize_ip: true, send_page_view: false });
  }
  async function trackEvent(name, params = {}) {
    if (await getOptOut()) return;
    if (isExtensionRuntime) {
      try {
        browser.runtime.sendMessage({
          type: "ga:track",
          name,
          params
        });
      } catch {
      }
      return;
    }
    if (typeof window === "undefined") return;
    ensureDemoGtag();
    const payload = { ...params, source: params.source ?? "demo" };
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", name, payload);
      } else {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(["event", name, payload]);
      }
    } catch {
    }
  }

  // src/welcome/main.js
  var browser2 = globalThis.browser || globalThis.chrome;
  function isFirefox() {
    try {
      const m = browser2?.runtime?.getManifest?.();
      return Boolean(m && m.browser_specific_settings?.gecko);
    } catch {
      return false;
    }
  }
  function appVersion() {
    try {
      return browser2?.runtime?.getManifest?.()?.version || "";
    } catch {
      return "";
    }
  }
  function initTheme() {
    loadThemeFromStorage((preference) => applyTheme(preference));
    onSystemThemeChange(() => {
    });
    if (browser2?.storage?.onChanged) {
      browser2.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.theme) {
          applyTheme(changes.theme.newValue);
        }
      });
    }
  }
  function renderPinSteps() {
    const list = document.getElementById("pin-steps");
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const steps = isFirefox() ? [
      ["Click the ", { strong: "puzzle-piece" }, " icon in the toolbar."],
      ["Find ", { strong: "Epoch Buddy" }, " in the list."],
      [
        "Click the gear next to it, then choose ",
        { strong: "Pin to Toolbar" },
        "."
      ]
    ] : [
      [
        "Click the ",
        { strong: "puzzle-piece" },
        " (Extensions) icon in the toolbar."
      ],
      ["Find ", { strong: "Epoch Buddy" }, " in the list."],
      [
        "Click the ",
        { strong: "pin" },
        " icon next to it so it stays visible."
      ]
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
  function renderVersion() {
    const el = document.getElementById("version-text");
    if (!el) return;
    const v = appVersion();
    el.textContent = v || "\u2014";
  }
  function wireDismiss() {
    const btn = document.getElementById("dismiss-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      trackEvent(EVENTS.WELCOME_DISMISSED, {
        browser_target: isFirefox() ? "firefox" : "chrome"
      });
      try {
        window.close();
      } catch {
      }
    });
  }
  function wireDemoLink() {
    const link = document.getElementById("demo-link");
    if (!link) return;
    link.addEventListener("click", () => {
      trackEvent(EVENTS.WELCOME_DEMO_CLICKED, {
        browser_target: isFirefox() ? "firefox" : "chrome"
      });
    });
  }
  function init() {
    initTheme();
    renderPinSteps();
    renderVersion();
    wireDismiss();
    wireDemoLink();
    trackEvent(EVENTS.WELCOME_VIEWED, {
      browser_target: isFirefox() ? "firefox" : "chrome",
      app_version: appVersion()
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
