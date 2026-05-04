(() => {
  // src/shared/formatting.js
  var pad2 = (v) => String(v).padStart(2, "0");
  var pad3 = (v) => String(v).padStart(3, "0");
  var formatDateParts = (date, useUtc) => {
    const monthIndex = useUtc ? date.getUTCMonth() : date.getMonth();
    const day = useUtc ? date.getUTCDate() : date.getDate();
    const year = useUtc ? date.getUTCFullYear() : date.getFullYear();
    const hours = useUtc ? date.getUTCHours() : date.getHours();
    const minutes = useUtc ? date.getUTCMinutes() : date.getMinutes();
    const seconds = useUtc ? date.getUTCSeconds() : date.getSeconds();
    return {
      month: pad2(monthIndex + 1),
      day: pad2(day),
      year,
      hours: pad2(hours),
      minutes: pad2(minutes),
      seconds: pad2(seconds)
    };
  };
  var formatUtcTimestamp = (date) => {
    const year = date.getUTCFullYear();
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    const hours = pad2(date.getUTCHours());
    const minutes = pad2(date.getUTCMinutes());
    const seconds = pad2(date.getUTCSeconds());
    const millis = pad3(date.getUTCMilliseconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
  };
  var formatTimeZoneOffset = (date, padHours = true) => {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const hourText = padHours ? pad2(hours) : String(hours);
    return `${sign}${hourText}:${pad2(minutes)}`;
  };
  var formatLocalTimestamp = (date) => {
    const parts = formatDateParts(date, false);
    const millis = pad3(date.getMilliseconds());
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hours}:${parts.minutes}:${parts.seconds}.${millis}`;
  };
  var formatRelative = (epochMs) => {
    const now = Date.now();
    const diffMs = epochMs - now;
    const suffix = diffMs < 0 ? "ago" : "from now";
    let remaining = Math.abs(diffMs);
    const units = [
      { label: "y", ms: 365 * 24 * 60 * 60 * 1e3 },
      { label: "mo", ms: 30 * 24 * 60 * 60 * 1e3 },
      { label: "d", ms: 24 * 60 * 60 * 1e3 },
      { label: "h", ms: 60 * 60 * 1e3 },
      { label: "m", ms: 60 * 1e3 },
      { label: "s", ms: 1e3 }
    ];
    const parts = [];
    let started = false;
    units.forEach((unit) => {
      const value = Math.floor(remaining / unit.ms);
      if (value > 0 || started) {
        started = true;
        remaining -= value * unit.ms;
        parts.push(`${value}${unit.label}`);
      }
    });
    if (parts.length === 0) {
      parts.push("0s");
    }
    return `${parts.join(", ")} ${suffix}`;
  };
  var buildConversionData = (epochMs) => {
    const date = new Date(epochMs);
    return {
      epochS: String(Math.floor(epochMs / 1e3)),
      utc: formatUtcTimestamp(date),
      localTimestamp: formatLocalTimestamp(date),
      tzLabel: formatTimeZoneOffset(date, true),
      local: `${formatLocalTimestamp(date)} (${formatTimeZoneOffset(date, true)})`,
      relative: formatRelative(epochMs)
    };
  };
  var ZONE_FORMATTER_CACHE = /* @__PURE__ */ new Map();
  var getZoneFormatter = (timeZone) => {
    if (!ZONE_FORMATTER_CACHE.has(timeZone)) {
      ZONE_FORMATTER_CACHE.set(
        timeZone,
        new Intl.DateTimeFormat("en-GB", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
    }
    return ZONE_FORMATTER_CACHE.get(timeZone);
  };
  var canonZone = (zone) => {
    if (!zone) return "local";
    const lower = String(zone).toLowerCase();
    if (lower === "local") return "local";
    if (lower === "utc") return "utc";
    return zone;
  };
  var zoneDisplayLabel = (zone) => {
    const c = canonZone(zone);
    if (c === "local") return "Local";
    if (c === "utc") return "UTC";
    return c;
  };
  var formatTimestampInZone = (date, zone) => {
    const c = canonZone(zone);
    if (c === "local") return formatLocalTimestamp(date);
    if (c === "utc") return formatUtcTimestamp(date);
    let year = "0000";
    let month = "01";
    let day = "01";
    let hour = "00";
    let minute = "00";
    let second = "00";
    try {
      const parts = getZoneFormatter(c).formatToParts(date);
      for (const p of parts) {
        if (p.type === "year") year = p.value;
        else if (p.type === "month") month = p.value;
        else if (p.type === "day") day = p.value;
        else if (p.type === "hour") hour = p.value === "24" ? "00" : p.value;
        else if (p.type === "minute") minute = p.value;
        else if (p.type === "second") second = p.value;
      }
    } catch {
      return formatUtcTimestamp(date);
    }
    const millis = pad3(date.getUTCMilliseconds());
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millis}`;
  };
  var formatOffsetInZone = (date, zone) => {
    const c = canonZone(zone);
    if (c === "local") return formatTimeZoneOffset(date, true);
    if (c === "utc") return "+00:00";
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: c,
        timeZoneName: "longOffset"
      });
      const parts = fmt.formatToParts(date);
      const tzPart = parts.find((p) => p.type === "timeZoneName");
      if (tzPart?.value) {
        const match = tzPart.value.match(/([+-])(\d{1,2}):?(\d{0,2})?/);
        if (match) {
          const sign = match[1];
          const hours = pad2(match[2]);
          const minutes = pad2(match[3] || "0");
          return `${sign}${hours}:${minutes}`;
        }
        if (/^GMT$/i.test(tzPart.value) || /^UTC$/i.test(tzPart.value)) {
          return "+00:00";
        }
      }
    } catch {
    }
    return "+00:00";
  };
  var buildZoneRows = (epochMs, zones) => {
    const date = new Date(epochMs);
    const list = Array.isArray(zones) && zones.length > 0 ? zones : ["local"];
    return list.map((zone) => {
      const timestamp = formatTimestampInZone(date, zone);
      const offset = formatOffsetInZone(date, zone);
      const display = zoneDisplayLabel(zone);
      return {
        zone,
        label: `${display} (${offset})`,
        timestamp,
        offset,
        displayValue: timestamp,
        copyValue: timestamp
      };
    });
  };

  // src/shared/parsing.js
  var EPOCH_SECONDS_REGEX = /^\d{10}$/;
  var EPOCH_MILLISECONDS_REGEX = /^\d{13}$/;
  var sanitizeEpochInput = (text) => text.replace(/[,_]/g, "");
  var parseEpoch = (text) => {
    const trimmed = sanitizeEpochInput(text.trim());
    if (EPOCH_SECONDS_REGEX.test(trimmed)) {
      return Number(trimmed) * 1e3;
    }
    if (EPOCH_MILLISECONDS_REGEX.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  };

  // src/shared/clipboard.js
  var parser = new DOMParser();
  var svgNode = (str) => parser.parseFromString(str, "image/svg+xml").documentElement.cloneNode(true);
  var ICON_COPY_STR = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var ICON_CHECK_STR = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_ERROR_STR = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var setIcon = (el, str) => el.replaceChildren(svgNode(str));
  var createCopyButton = (value, {
    className = "copy-btn",
    successClass = "copy-success",
    errorClass = "copy-error"
  } = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    setIcon(button, ICON_COPY_STR);
    button.setAttribute("aria-label", "Copy");
    const resetButton = () => {
      setIcon(button, ICON_COPY_STR);
      button.classList.remove(successClass, errorClass);
    };
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(String(value));
        setIcon(button, ICON_CHECK_STR);
        button.classList.remove(errorClass);
        button.classList.add(successClass);
      } catch (_err) {
        setIcon(button, ICON_ERROR_STR);
        button.classList.remove(successClass);
        button.classList.add(errorClass);
      }
      window.setTimeout(resetButton, 1400);
    });
    return button;
  };

  // src/shared/theme.js
  var THEME_KEY = "theme";
  var MEDIA_QUERY = "(prefers-color-scheme: dark)";
  function getSystemTheme() {
    return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
  }
  function resolveTheme(preference) {
    if (preference === "dark" || preference === "light") return preference;
    return getSystemTheme();
  }
  function onSystemThemeChange(callback) {
    const mql = window.matchMedia(MEDIA_QUERY);
    const handler = () => callback(getSystemTheme());
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }
  function loadThemeFromStorage(callback) {
    const browser2 = globalThis.browser || globalThis.chrome;
    if (!browser2?.storage?.local) {
      callback("system");
      return;
    }
    browser2.storage.local.get({ [THEME_KEY]: "system" }, (result) => {
      callback(result[THEME_KEY] || "system");
    });
  }

  // src/shared/timezones.js
  var TIMEZONES_KEY = "timezones";
  var DEFAULT_TIMEZONES = ["local", "utc"];
  var isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
  function sanitize(list) {
    if (!Array.isArray(list)) return null;
    const cleaned = list.filter(isNonEmptyString).map((s) => s.trim());
    return cleaned.length > 0 ? cleaned : null;
  }
  function loadTimezonesFromStorage(callback) {
    const browser2 = globalThis.browser || globalThis.chrome;
    if (!browser2?.storage?.local) {
      callback(DEFAULT_TIMEZONES.slice());
      return;
    }
    browser2.storage.local.get({ [TIMEZONES_KEY]: null }, (result) => {
      const cleaned = sanitize(result[TIMEZONES_KEY]);
      callback(cleaned || DEFAULT_TIMEZONES.slice());
    });
  }
  function onTimezonesChanged(callback) {
    const browser2 = globalThis.browser || globalThis.chrome;
    if (!browser2?.storage?.onChanged) return () => {
    };
    const listener = (changes, area) => {
      if (area !== "local" || !changes[TIMEZONES_KEY]) return;
      const cleaned = sanitize(changes[TIMEZONES_KEY].newValue);
      callback(cleaned || DEFAULT_TIMEZONES.slice());
    };
    browser2.storage.onChanged.addListener(listener);
    return () => browser2.storage.onChanged.removeListener(listener);
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

  // src/content/main.js
  (() => {
    const browser2 = globalThis.browser || globalThis.chrome;
    const POPUP_ID = "epoch-buddy-popup";
    let popupEl = null;
    let lastSelectionText = "";
    let themePref = "system";
    let currentZones = DEFAULT_TIMEZONES.slice();
    let lastSelection = null;
    const copyBtnOpts = {
      className: "epoch-buddy-copy",
      successClass: "epoch-buddy-copy-success",
      errorClass: "epoch-buddy-copy-error"
    };
    const applyPopupTheme = () => {
      if (!popupEl) return;
      const resolved = resolveTheme(themePref);
      popupEl.classList.toggle("eb-dark", resolved === "dark");
    };
    loadThemeFromStorage((pref) => {
      themePref = pref;
      applyPopupTheme();
    });
    onSystemThemeChange(() => {
      if (themePref === "system") applyPopupTheme();
    });
    loadTimezonesFromStorage((zones) => {
      currentZones = zones;
    });
    onTimezonesChanged((zones) => {
      currentZones = zones;
      if (popupEl && lastSelection) {
        const conversion = buildConversionData(lastSelection.epochMs);
        const formatted = [
          {
            label: "Epoch (s)",
            value: conversion.epochS,
            copyValue: conversion.epochS,
            row: "epoch_s"
          },
          {
            label: "Epoch (ms)",
            value: lastSelection.epochMs,
            copyValue: lastSelection.epochMs,
            row: "epoch_ms"
          },
          ...buildZoneRows(lastSelection.epochMs, currentZones).map((row) => ({
            label: row.label,
            value: row.displayValue,
            copyValue: row.copyValue,
            row: "zone",
            zone: row.zone
          })),
          {
            label: "Relative",
            value: conversion.relative,
            isRelative: true,
            noCopy: true
          }
        ];
        renderPopup(lastSelection.rect, formatted);
      }
    });
    if (browser2?.storage?.onChanged) {
      browser2.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.theme) {
          themePref = changes.theme.newValue || "system";
          applyPopupTheme();
        }
      });
    }
    const removePopup = () => {
      if (popupEl) {
        popupEl.remove();
        popupEl = null;
      }
      lastSelection = null;
    };
    const createPopupEl = () => {
      if (popupEl) {
        return popupEl;
      }
      const el = document.createElement("div");
      el.id = POPUP_ID;
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-live", "polite");
      el.addEventListener(
        "click",
        (ev) => {
          const btn = ev.target.closest?.(".epoch-buddy-copy");
          if (!btn) return;
          const row = btn.dataset.row;
          if (!row) return;
          const params = { row };
          if (btn.dataset.zone) params.zone = btn.dataset.zone;
          trackEvent(EVENTS.FLOATING_COPY_CLICKED, params);
        },
        true
      );
      document.body.appendChild(el);
      popupEl = el;
      applyPopupTheme();
      return el;
    };
    const getSelectionRect = (selection) => {
      if (!selection || selection.rangeCount === 0) {
        return null;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0 && rect.height === 0) {
        return null;
      }
      return rect;
    };
    const getInputSelection = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
        return null;
      }
      const start = active.selectionStart;
      const end = active.selectionEnd;
      if (start === null || end === null || start === end) {
        return null;
      }
      const selectedText = active.value.slice(start, end);
      if (!selectedText) {
        return null;
      }
      return {
        text: selectedText,
        rect: active.getBoundingClientRect()
      };
    };
    const saveHistory = (entry) => {
      if (!browser2?.storage?.local) {
        return;
      }
      browser2.storage.local.get({ history: [] }, (result) => {
        const history = Array.isArray(result.history) ? result.history : [];
        const next = [entry, ...history].slice(0, 10);
        browser2.storage.local.set({ history: next });
      });
    };
    const renderPopup = (rect, formatted) => {
      const el = createPopupEl();
      el.replaceChildren ? el.replaceChildren() : el.textContent = "";
      formatted.forEach((line) => {
        if (line.isRelative) {
          const sep = document.createElement("div");
          sep.className = "epoch-buddy-separator";
          el.appendChild(sep);
        }
        const label = document.createElement("strong");
        label.className = "epoch-buddy-label";
        label.textContent = line.label;
        el.appendChild(label);
        const colon = document.createElement("span");
        colon.className = "epoch-buddy-colon";
        colon.textContent = ":";
        el.appendChild(colon);
        const value = document.createElement("span");
        value.className = "epoch-buddy-value";
        value.textContent = `${line.value}`;
        el.appendChild(value);
        if (!line.noCopy) {
          const copyBtn = createCopyButton(
            typeof line.copyValue === "string" ? line.copyValue : line.value,
            copyBtnOpts
          );
          if (line.row) copyBtn.dataset.row = line.row;
          if (line.zone) copyBtn.dataset.zone = line.zone;
          el.appendChild(copyBtn);
        } else {
          el.appendChild(document.createElement("span"));
        }
      });
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const gap = 8;
      el.style.top = "0px";
      el.style.left = "0px";
      el.style.visibility = "hidden";
      const popupW = el.offsetWidth;
      const popupH = el.offsetHeight;
      el.style.visibility = "";
      const fitsBelow = rect.bottom + gap + popupH <= vh;
      const fitsAbove = rect.top - gap - popupH >= 0;
      let top;
      if (fitsBelow) {
        top = rect.bottom + scrollY + gap;
      } else if (fitsAbove) {
        top = rect.top + scrollY - gap - popupH;
      } else {
        top = scrollY + Math.max(vh - popupH - gap, gap);
      }
      const fitsRight = rect.left + popupW <= vw;
      let left;
      if (fitsRight) {
        left = rect.left + scrollX;
      } else {
        left = Math.max(scrollX + vw - popupW - gap, scrollX + gap);
      }
      const finalTop = Math.max(top, scrollY + gap);
      const finalLeft = Math.max(left, scrollX + gap);
      el.classList.remove("eb-arrow-top", "eb-arrow-bottom");
      if (fitsBelow) {
        el.classList.add("eb-arrow-top");
      } else if (fitsAbove) {
        el.classList.add("eb-arrow-bottom");
      }
      const selCenterX = rect.left + rect.width / 2 + scrollX;
      const arrowPad = 16;
      const arrowX = Math.max(
        arrowPad,
        Math.min(selCenterX - finalLeft, popupW - arrowPad)
      );
      el.style.setProperty("--eb-arrow-x", `${arrowX}px`);
      el.style.top = `${finalTop}px`;
      el.style.left = `${finalLeft}px`;
    };
    const handleSelection = (event) => {
      if (event?.target instanceof Node && popupEl && popupEl.contains(event.target)) {
        return;
      }
      const inputSelection = getInputSelection();
      const selection = inputSelection ? null : window.getSelection();
      if (!inputSelection && (!selection || selection.isCollapsed)) {
        lastSelectionText = "";
        removePopup();
        return;
      }
      const selectedText = inputSelection ? inputSelection.text : selection.toString();
      if (!selectedText || selectedText === lastSelectionText) {
        return;
      }
      lastSelectionText = selectedText;
      const epochMs = parseEpoch(selectedText);
      if (epochMs === null) {
        removePopup();
        return;
      }
      const rect = inputSelection ? inputSelection.rect : getSelectionRect(selection);
      if (!rect) {
        removePopup();
        return;
      }
      const conversion = buildConversionData(epochMs);
      const formatted = [
        {
          label: "Epoch (s)",
          value: conversion.epochS,
          copyValue: conversion.epochS,
          row: "epoch_s"
        },
        {
          label: "Epoch (ms)",
          value: epochMs,
          copyValue: epochMs,
          row: "epoch_ms"
        },
        ...buildZoneRows(epochMs, currentZones).map((row) => ({
          label: row.label,
          value: row.displayValue,
          copyValue: row.copyValue,
          row: "zone",
          zone: row.zone
        })),
        {
          label: "Relative",
          value: conversion.relative,
          isRelative: true,
          noCopy: true
        }
      ];
      lastSelection = { rect, epochMs };
      renderPopup(rect, formatted);
      trackEvent(EVENTS.FLOATING_POPUP_SHOWN);
      saveHistory({
        source: "epoch",
        input: selectedText.trim(),
        epochMs,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    const handleClick = (event) => {
      if (!popupEl) {
        return;
      }
      if (event.target instanceof Node && popupEl.contains(event.target)) {
        return;
      }
      removePopup();
    };
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        removePopup();
      }
    };
    const handleScrollOrResize = () => {
      removePopup();
    };
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
  })();
})();
