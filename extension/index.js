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
  var formatRelativeParts = (parts, suffix) => {
    const units = [
      { label: "d", value: parts.days },
      { label: "h", value: parts.hours },
      { label: "m", value: parts.minutes },
      { label: "s", value: parts.seconds },
      { label: "ms", value: parts.ms }
    ];
    const result = [];
    let started = false;
    units.forEach((unit) => {
      if (unit.value > 0 || started) {
        started = true;
        result.push(`${unit.value}${unit.label}`);
      }
    });
    if (result.length === 0) {
      result.push("0s");
    }
    return `${result.join(" ")} ${suffix}`;
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
  var zoneOffsetMinutes = (year, month, day, hour, minute, second, ms, zone) => {
    const c = canonZone(zone);
    if (c === "utc") return 0;
    if (c === "local") {
      return -new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        ms
      ).getTimezoneOffset();
    }
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
    const offset1 = offsetMinutesAt(utcGuess, c);
    const adjusted = utcGuess - offset1 * 6e4;
    const offset2 = offsetMinutesAt(adjusted, c);
    return offset2;
  };
  var offsetMinutesAt = (instantMs, timeZone) => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "longOffset"
      });
      const parts = fmt.formatToParts(new Date(instantMs));
      const tzPart = parts.find((p) => p.type === "timeZoneName");
      if (!tzPart?.value) return 0;
      const match = tzPart.value.match(/([+-])(\d{1,2}):?(\d{0,2})?/);
      if (!match) return 0;
      const sign = match[1] === "-" ? -1 : 1;
      const hours = Number(match[2]);
      const minutes = Number(match[3] || 0);
      return sign * (hours * 60 + minutes);
    } catch {
      return 0;
    }
  };
  var formatTimeOnly = (isoString) => {
    if (!isoString) {
      return "--:--:--";
    }
    const date = new Date(isoString);
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
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
  var parseDateField = (value, label, min, max) => {
    const trimmed = String(value).trim();
    if (trimmed === "") {
      return { error: `${label} is required.`, field: label.toLowerCase() };
    }
    const number = Number(trimmed);
    if (Number.isNaN(number) || !Number.isFinite(number)) {
      return {
        error: `${label} must be a valid number.`,
        field: label.toLowerCase()
      };
    }
    if (number < min || max !== void 0 && number > max) {
      const range = max !== void 0 ? `${min}\u2013${max}` : `>= ${min}`;
      return {
        error: `${label} must be ${range}.`,
        field: label.toLowerCase()
      };
    }
    return { value: Math.floor(number) };
  };
  var parseDateInput = (yearValue, monthValue, dayValue) => {
    if (!yearValue || !monthValue || !dayValue) {
      return null;
    }
    const yStr = String(yearValue);
    const mStr = String(monthValue);
    const dStr = String(dayValue);
    if (!/^\d+$/.test(yStr + mStr + dStr)) {
      return null;
    }
    const year = Number(yStr);
    const month = Number(mStr);
    const day = Number(dStr);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return { year, month, day };
  };
  var parseTimePart = (value, max, label) => {
    const trimmed = String(value).trim();
    if (trimmed === "") {
      return { value: 0 };
    }
    const number = Number(trimmed);
    if (Number.isNaN(number) || !Number.isFinite(number)) {
      return { error: `${label} must be numeric.` };
    }
    if (number < 0 || number > max) {
      return { error: `${label} must be between 0 and ${max}.` };
    }
    return { value: Math.floor(number) };
  };
  var ISO_WALLCLOCK_REGEX = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;
  var parseIsoString = (isoStr, fallbackTz) => {
    const trimmed = isoStr.trim();
    if (!trimmed) {
      return { error: "ISO string is required." };
    }
    const hasOffset = /[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed) || /[+-]\d{4}$/.test(trimmed);
    if (hasOffset || !fallbackTz) {
      const date2 = new Date(trimmed);
      if (Number.isNaN(date2.getTime())) {
        return { error: "Invalid ISO 8601 string." };
      }
      return { value: date2.getTime() };
    }
    const match = trimmed.match(ISO_WALLCLOCK_REGEX);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = match[6] ? Number(match[6]) : 0;
      const millis = match[7] ? Number(match[7].padEnd(3, "0")) : 0;
      const offsetMin = zoneOffsetMinutes(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millis,
        fallbackTz
      );
      const utcMs = Date.UTC(year, month - 1, day, hour, minute, second, millis);
      return { value: utcMs - offsetMin * 6e4 };
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return { error: "Invalid ISO 8601 string." };
    }
    return { value: date.getTime() };
  };
  var normalizeRelativeFields = (days, hours, minutes, seconds, ms) => {
    let totalMs = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1e3 + ms | 0;
    if (totalMs < 0) totalMs = 0;
    const nMs = totalMs % 1e3;
    let rem = (totalMs - nMs) / 1e3;
    const nSec = rem % 60;
    rem = (rem - nSec) / 60;
    const nMin = rem % 60;
    rem = (rem - nMin) / 60;
    const nHr = rem % 24;
    const nDay = (rem - nHr) / 24;
    return { days: nDay, hours: nHr, minutes: nMin, seconds: nSec, ms: nMs };
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
  var bindLiveCopyButton = (button, valueFn, { successClass = "copy-success", errorClass = "copy-error", onCopy } = {}) => {
    const ICON_CLOCK_STR = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    const resetButton = () => {
      setIcon(button, ICON_CLOCK_STR);
      button.classList.remove(successClass, errorClass);
    };
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const val = String(valueFn());
      try {
        await navigator.clipboard.writeText(val);
        if (onCopy) onCopy(val);
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
  };

  // src/shared/theme.js
  var THEME_KEY = "theme";
  var SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
  function buildSvg(size, children) {
    const svg = svgEl("svg", {
      xmlns: SVG_NS,
      width: String(size),
      height: String(size),
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
    children.forEach((child) => svg.appendChild(child));
    return svg;
  }
  var ICON_BUILDERS = {
    light(size) {
      return buildSvg(size, [
        svgEl("circle", { cx: "12", cy: "12", r: "5" }),
        svgEl("path", {
          d: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        })
      ]);
    },
    dark(size) {
      return buildSvg(size, [
        svgEl("path", {
          d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        })
      ]);
    },
    system(size) {
      return buildSvg(size, [
        svgEl("rect", {
          x: "2",
          y: "3",
          width: "20",
          height: "14",
          rx: "2",
          ry: "2"
        }),
        svgEl("line", { x1: "8", y1: "21", x2: "16", y2: "21" }),
        svgEl("line", { x1: "12", y1: "17", x2: "12", y2: "21" })
      ]);
    }
  };
  function createThemeIcon(preference, size = 16) {
    const builder = ICON_BUILDERS[preference] || ICON_BUILDERS.system;
    return builder(size);
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
  function updateToggleIcon(btnEl, preference) {
    if (!btnEl) return;
    btnEl.replaceChildren(createThemeIcon(preference));
  }
  function updateMenuActive(menuEl, preference) {
    if (!menuEl) return;
    menuEl.querySelectorAll("[data-theme-option]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.themeOption === preference);
    });
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
  function saveThemeToStorage(preference) {
    const browser2 = globalThis.browser || globalThis.chrome;
    if (!browser2?.storage?.local) return;
    browser2.storage.local.set({ [THEME_KEY]: preference });
  }

  // src/shared/timezones.js
  var TIMEZONES_KEY = "timezones";
  var DEFAULT_TIMEZONES = ["local", "utc"];
  var FALLBACK_IANA_ZONES = [
    "UTC",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "America/Anchorage",
    "America/Argentina/Buenos_Aires",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Sao_Paulo",
    "America/Toronto",
    "Asia/Bangkok",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Kolkata",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Melbourne",
    "Australia/Sydney",
    "Europe/Amsterdam",
    "Europe/Berlin",
    "Europe/Istanbul",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Moscow",
    "Europe/Paris",
    "Europe/Rome",
    "Europe/Warsaw",
    "Pacific/Auckland",
    "Pacific/Honolulu"
  ];
  var isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
  function sanitize(list) {
    if (!Array.isArray(list)) return null;
    const cleaned = list.filter(isNonEmptyString).map((s) => s.trim());
    return cleaned.length > 0 ? cleaned : null;
  }
  function getAvailableTimezones() {
    let zones;
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        zones = Intl.supportedValuesOf("timeZone");
      }
    } catch {
      zones = null;
    }
    if (!Array.isArray(zones) || zones.length === 0) {
      zones = FALLBACK_IANA_ZONES.slice();
    }
    return ["local", "utc", ...zones.filter((z) => z.toLowerCase() !== "utc")];
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
  function saveTimezonesToStorage(list) {
    const cleaned = sanitize(list);
    if (!cleaned) return;
    const browser2 = globalThis.browser || globalThis.chrome;
    if (!browser2?.storage?.local) return;
    browser2.storage.local.set({ [TIMEZONES_KEY]: cleaned });
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

  // src/shared/generated/feedbackFormConfig.js
  var FEEDBACK_FORM_BASE_URL = "https://docs.google.com/forms/d/e/1FAIpQLScjJA6j8wE1rNJBTuxTUwByE-CxmgpqZwY95vo93uP9gA_4yg/viewform";
  var FEEDBACK_FORM_ENTRY_KEYS = {
    rating: "entry.126744460",
    version: "entry.1052329075",
    browser: "entry.1248720094"
  };

  // src/shared/feedbackFormUrl.js
  var BROWSER_LABEL_FIREFOX = "Firefox";
  var BROWSER_LABEL_CHROMIUM = "Chrome/Chromium-Based";
  function buildFeedbackFormUrl(stars, manifestVersion, isFirefox) {
    if (stars < 1 || stars > 3) {
      return "";
    }
    if (!FEEDBACK_FORM_BASE_URL || !FEEDBACK_FORM_ENTRY_KEYS) {
      return "";
    }
    const url = new URL(FEEDBACK_FORM_BASE_URL);
    url.searchParams.set("usp", "pp_url");
    url.searchParams.set(FEEDBACK_FORM_ENTRY_KEYS.rating, String(stars));
    url.searchParams.set(
      FEEDBACK_FORM_ENTRY_KEYS.version,
      String(manifestVersion ?? "")
    );
    url.searchParams.set(
      FEEDBACK_FORM_ENTRY_KEYS.browser,
      isFirefox ? BROWSER_LABEL_FIREFOX : BROWSER_LABEL_CHROMIUM
    );
    return url.toString();
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
    DEMO_OPENED: "demo_opened"
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
  async function setOptOut(optOut) {
    if (isExtensionRuntime && browser.storage?.local) {
      return new Promise((resolve) => {
        try {
          browser.storage.local.set(
            { [OPT_OUT_STORAGE_KEY]: Boolean(optOut) },
            () => resolve()
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
      }
    }
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

  // src/popup/main.js
  (() => {
    const browser2 = globalThis.browser || globalThis.chrome;
    const STORAGE_RATING_STARS = "ratingStars";
    const STORAGE_RATING_FOOTER_HIDDEN = "ratingFooterHidden";
    const STORE_REVIEW_URL_CHROME = "https://chromewebstore.google.com/detail/epoch-buddy/ehjdbcbcfobnkanngnjlibodhgdbhkam/reviews";
    const STORE_REVIEW_URL_FIREFOX = "https://addons.mozilla.org/en-US/firefox/addon/epoch-buddy/reviews/";
    const isFirefoxExtension = () => {
      try {
        const m = browser2.runtime.getManifest();
        return Boolean(m.browser_specific_settings?.gecko);
      } catch {
        return false;
      }
    };
    const getStoreReviewUrl = () => isFirefoxExtension() ? STORE_REVIEW_URL_FIREFOX : STORE_REVIEW_URL_CHROME;
    const openFeedbackFormForStars = (stars) => {
      let manifestVersion = "";
      try {
        manifestVersion = browser2.runtime.getManifest().version ?? "";
      } catch {
        manifestVersion = "";
      }
      const url = buildFeedbackFormUrl(
        stars,
        manifestVersion,
        isFirefoxExtension()
      );
      openExternal(url);
    };
    function openExternal(url) {
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const themeMenu = document.getElementById("theme-menu");
    const settingsThemeMenu = document.getElementById("settings-theme-menu");
    const setTheme = (preference) => {
      applyTheme(preference);
      updateToggleIcon(themeToggleBtn, preference);
      updateMenuActive(themeMenu, preference);
      updateMenuActive(settingsThemeMenu, preference);
      saveThemeToStorage(preference);
    };
    loadThemeFromStorage((pref) => {
      applyTheme(pref);
      updateToggleIcon(themeToggleBtn, pref);
      updateMenuActive(themeMenu, pref);
      updateMenuActive(settingsThemeMenu, pref);
    });
    if (settingsThemeMenu) {
      settingsThemeMenu.addEventListener("click", (e) => {
        const option = e.target.closest("[data-theme-option]");
        if (!option) return;
        setTheme(option.dataset.themeOption);
        trackEvent(EVENTS.THEME_CHANGED, {
          theme: option.dataset.themeOption,
          source: "settings"
        });
      });
    }
    themeToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      themeMenu.hidden = !themeMenu.hidden;
    });
    themeMenu.addEventListener("click", (e) => {
      const option = e.target.closest("[data-theme-option]");
      if (!option) return;
      setTheme(option.dataset.themeOption);
      themeMenu.hidden = true;
      trackEvent(EVENTS.THEME_CHANGED, {
        theme: option.dataset.themeOption,
        source: "toolbar"
      });
    });
    document.addEventListener("click", (e) => {
      if (!themeMenu.hidden && !e.target.closest(".theme-toggle")) {
        themeMenu.hidden = true;
      }
    });
    const headerTzEl = document.getElementById("header-tz");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = formatTimeZoneOffset(/* @__PURE__ */ new Date(), true);
    headerTzEl.textContent = `${tz} (UTC${offset})`;
    const epochFormEl = document.getElementById("epoch-to-date-form");
    const dateFormEl = document.getElementById("date-to-epoch-form");
    const relativeFormEl = document.getElementById("relative-form");
    const inputEl = document.getElementById("epoch-input");
    const copyEpochBtn = document.getElementById("copy-epoch-btn");
    const dateYearEl = document.getElementById("date-year");
    const dateMonthEl = document.getElementById("date-month");
    const dateDayEl = document.getElementById("date-day");
    const timeHourEl = document.getElementById("time-hour");
    const timeMinuteEl = document.getElementById("time-minute");
    const timeSecondEl = document.getElementById("time-second");
    const timeMsEl = document.getElementById("time-ms");
    const timezoneSelectEl = document.getElementById("timezone-select");
    const errorEl = document.getElementById("error");
    const dateErrorEl = document.getElementById("date-error");
    const relativeErrorEl = document.getElementById("relative-error");
    const resultEl = document.getElementById("result");
    const dateResultEl = document.getElementById("date-result");
    const relativeResultEl = document.getElementById("relative-result");
    const historyListEl = document.getElementById("history-list");
    const historyCountEl = document.getElementById("history-count");
    const clearHistoryEl = document.getElementById("clear-history");
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const relativeDirectionEl = document.getElementById("relative-direction");
    const relativeDaysEl = document.getElementById("relative-days");
    const relativeHoursEl = document.getElementById("relative-hours");
    const relativeMinutesEl = document.getElementById("relative-minutes");
    const relativeSecondsEl = document.getElementById("relative-seconds");
    const relativeMsEl = document.getElementById("relative-ms");
    const isoToggleBtn = document.getElementById("iso-toggle-btn");
    const dateManualGroup = dateFormEl.querySelector(".date-manual-group");
    const isoInputGroup = dateFormEl.querySelector(".iso-input-group");
    const isoInputEl = document.getElementById("iso-input");
    const isoTzSelectEl = document.getElementById("iso-tz-select");
    const ratingFooterEl = document.getElementById("rating-footer");
    const ratingStepPromptEl = document.getElementById("rating-step-prompt");
    const ratingStepActionsEl = document.getElementById("rating-step-actions");
    const ratingStarsRow = document.getElementById("rating-stars-row");
    const ratingHideFooterBtn = document.getElementById("rating-hide-footer-btn");
    const ratingAgainBtn = document.getElementById("rating-again-btn");
    const ratingStarBtns = document.querySelectorAll(
      "#rating-stars-row .rating-star-btn"
    );
    const mainViewEl = document.getElementById("main-view");
    const settingsViewEl = document.getElementById("settings-view");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsBackBtn = document.getElementById("settings-back-btn");
    const tzListEl = document.getElementById("tz-list");
    const tzAddSelectEl = document.getElementById("tz-add-select");
    const tzAddBtn = document.getElementById("tz-add-btn");
    const settingsStarsRow = document.getElementById("settings-stars-row");
    const settingsStarBtns = settingsStarsRow ? settingsStarsRow.querySelectorAll(".rating-star-btn") : [];
    const analyticsOptInEl = document.getElementById("analytics-opt-in");
    const analyticsNoticeEl = document.getElementById("analytics-notice");
    const analyticsNoticeDismissBtn = document.getElementById(
      "analytics-notice-dismiss"
    );
    const settingsLinks = document.querySelectorAll(
      "#settings-view .settings-link"
    );
    let currentZones = DEFAULT_TIMEZONES.slice();
    const syncHasValue = (input) => {
      input.classList.toggle("has-value", input.value !== "");
    };
    const allNumberInputs = dateFormEl.querySelectorAll('input[type="number"]');
    const relNumberInputs = relativeFormEl.querySelectorAll(
      'input[type="number"]'
    );
    [...allNumberInputs, ...relNumberInputs].forEach((input) => {
      input.addEventListener("input", () => syncHasValue(input));
      input.addEventListener("blur", () => syncHasValue(input));
      syncHasValue(input);
    });
    const clearFieldErrors = (form) => {
      form.querySelectorAll(".field-error").forEach((el) => {
        el.classList.remove("field-error");
      });
    };
    const setFieldError = (input) => {
      const wrapper = input.closest(".floating-field");
      if (wrapper) wrapper.classList.add("field-error");
    };
    const clearFieldError = (input) => {
      const wrapper = input.closest(".floating-field");
      if (wrapper) wrapper.classList.remove("field-error");
    };
    const dateFields = [dateYearEl, dateMonthEl, dateDayEl];
    const timeFields = [timeHourEl, timeMinuteEl, timeSecondEl, timeMsEl];
    const relFields = [
      relativeDaysEl,
      relativeHoursEl,
      relativeMinutesEl,
      relativeSecondsEl,
      relativeMsEl
    ];
    const dateFieldLabels = ["Year", "Month", "Day"];
    dateFields.forEach((input, i) => {
      input.addEventListener("blur", () => {
        syncHasValue(input);
        if (input.value.trim() === "") {
          setFieldError(input);
          dateErrorEl.hidden = false;
          dateErrorEl.textContent = `${dateFieldLabels[i]} is required.`;
        } else {
          clearFieldError(input);
        }
      });
      input.addEventListener("input", () => {
        clearFieldError(input);
        dateErrorEl.hidden = true;
        dateErrorEl.textContent = "";
      });
    });
    timeFields.forEach((input) => {
      input.addEventListener("blur", () => {
        if (input.value.trim() === "" || Number.isNaN(Number(input.value))) {
          input.value = 0;
        }
        syncHasValue(input);
      });
    });
    relFields.forEach((input) => {
      input.addEventListener("blur", () => {
        if (input.value.trim() === "" || Number.isNaN(Number(input.value))) {
          input.value = 0;
        }
        syncHasValue(input);
      });
    });
    const normalizeRelativeInputs = () => {
      const d = Number(relativeDaysEl.value) || 0;
      const h = Number(relativeHoursEl.value) || 0;
      const m = Number(relativeMinutesEl.value) || 0;
      const s = Number(relativeSecondsEl.value) || 0;
      const ms = Number(relativeMsEl.value) || 0;
      if (h > 23 || m > 59 || s > 59 || ms > 999) {
        const n = normalizeRelativeFields(d, h, m, s, ms);
        relativeDaysEl.value = n.days;
        relativeHoursEl.value = n.hours;
        relativeMinutesEl.value = n.minutes;
        relativeSecondsEl.value = n.seconds;
        relativeMsEl.value = n.ms;
        relFields.forEach(syncHasValue);
      }
    };
    relFields.forEach((input) => {
      input.addEventListener("blur", normalizeRelativeInputs);
    });
    const saveHistory = (entry) => {
      if (!chrome?.storage?.local) {
        return;
      }
      browser2.storage.local.get({ history: [] }, (result) => {
        const history = Array.isArray(result.history) ? result.history : [];
        const next = [entry, ...history].slice(0, 10);
        browser2.storage.local.set({ history: next }, () => {
          renderHistory(next);
        });
      });
    };
    const clearHistory = () => {
      if (!chrome?.storage?.local) {
        renderHistory([]);
        return;
      }
      browser2.storage.local.set({ history: [] }, () => {
        renderHistory([]);
      });
    };
    const loadHistory = () => {
      if (!chrome?.storage?.local) {
        renderHistory([]);
        return;
      }
      browser2.storage.local.get({ history: [] }, (result) => {
        renderHistory(result.history);
      });
    };
    const appendResultRow = (targetEl, row) => {
      if (row.isRelative) {
        const sep = document.createElement("div");
        sep.className = "result-separator";
        targetEl.appendChild(sep);
      }
      const labelEl = document.createElement("strong");
      labelEl.className = "result-label";
      labelEl.textContent = row.label;
      targetEl.appendChild(labelEl);
      const colonEl = document.createElement("span");
      colonEl.className = "result-colon";
      colonEl.textContent = ":";
      targetEl.appendChild(colonEl);
      const valueEl = document.createElement("span");
      valueEl.className = "result-value";
      valueEl.textContent = row.value;
      targetEl.appendChild(valueEl);
      if (row.copy) {
        targetEl.appendChild(createCopyButton(row.copy));
      } else if (row.isRelative) {
      } else {
        targetEl.appendChild(document.createElement("span"));
      }
    };
    const buildDisplayRows = (epochMs, conversion, relativeOverride) => {
      const rows = [
        { label: "Epoch (s)", value: conversion.epochS, copy: conversion.epochS },
        { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) }
      ];
      buildZoneRows(epochMs, currentZones).forEach((zoneRow) => {
        rows.push({
          label: zoneRow.label,
          value: zoneRow.displayValue,
          copy: zoneRow.copyValue
        });
      });
      rows.push({
        label: "Relative",
        value: relativeOverride != null ? relativeOverride : conversion.relative,
        isRelative: true
      });
      return rows;
    };
    let lastResultEpochMs = null;
    let lastDateResultEpochMs = null;
    let lastRelativeResult = null;
    const renderEpochToDateResult = (epochMs, conversion) => {
      lastResultEpochMs = epochMs;
      resultEl.replaceChildren ? resultEl.replaceChildren() : resultEl.textContent = "";
      buildDisplayRows(epochMs, conversion).forEach(
        (row) => appendResultRow(resultEl, row)
      );
      resultEl.hidden = false;
    };
    const renderDateToEpochResult = (epochMs, conversion) => {
      lastDateResultEpochMs = epochMs;
      dateResultEl.replaceChildren ? dateResultEl.replaceChildren() : dateResultEl.textContent = "";
      buildDisplayRows(epochMs, conversion).forEach(
        (row) => appendResultRow(dateResultEl, row)
      );
      dateResultEl.hidden = false;
    };
    const renderRelativeResult = (epochMs, conversion, relativeLabel) => {
      lastRelativeResult = { epochMs, relativeLabel };
      relativeResultEl.replaceChildren ? relativeResultEl.replaceChildren() : relativeResultEl.textContent = "";
      buildDisplayRows(epochMs, conversion, relativeLabel).forEach(
        (row) => appendResultRow(relativeResultEl, row)
      );
      relativeResultEl.hidden = false;
    };
    const renderHistory = (history) => {
      historyListEl.replaceChildren ? historyListEl.replaceChildren() : historyListEl.textContent = "";
      const entries = Array.isArray(history) ? history : [];
      historyCountEl.textContent = entries.length ? `${entries.length} items` : "";
      if (entries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No conversions yet.";
        historyListEl.appendChild(empty);
        return;
      }
      entries.forEach((entry) => {
        const item = document.createElement("li");
        item.className = "history-item";
        const topRow = document.createElement("div");
        topRow.className = "history-top";
        const epochSpan = document.createElement("strong");
        epochSpan.className = "history-epoch";
        const topText = entry.display || entry.input || String(entry.epochMs);
        epochSpan.textContent = topText;
        const timeWrapper = document.createElement("div");
        timeWrapper.className = "history-time";
        const timeText = document.createElement("span");
        timeText.className = "history-time-text";
        timeText.textContent = formatTimeOnly(entry.convertedAt);
        const epochCopy = createCopyButton(topText);
        timeWrapper.appendChild(timeText);
        timeWrapper.appendChild(epochCopy);
        topRow.appendChild(epochSpan);
        topRow.appendChild(timeWrapper);
        item.appendChild(topRow);
        const conversion = buildConversionData(entry.epochMs);
        const linesGrid = document.createElement("div");
        linesGrid.className = "history-lines";
        const addHistoryLine = (label, value, copyValue) => {
          const rowLabel = document.createElement("span");
          rowLabel.className = "history-label";
          rowLabel.textContent = label;
          linesGrid.appendChild(rowLabel);
          const colonEl = document.createElement("span");
          colonEl.className = "history-colon";
          colonEl.textContent = ":";
          linesGrid.appendChild(colonEl);
          const rowValue = document.createElement("span");
          rowValue.className = "history-value";
          rowValue.textContent = value || "";
          linesGrid.appendChild(rowValue);
          if (copyValue) {
            linesGrid.appendChild(createCopyButton(copyValue));
          } else {
            linesGrid.appendChild(document.createElement("span"));
          }
        };
        addHistoryLine("Epoch (s)", conversion.epochS, conversion.epochS);
        addHistoryLine(
          "Epoch (ms)",
          String(entry.epochMs),
          String(entry.epochMs)
        );
        buildZoneRows(entry.epochMs, currentZones).forEach((zoneRow) => {
          addHistoryLine(zoneRow.label, zoneRow.displayValue, zoneRow.copyValue);
        });
        item.appendChild(linesGrid);
        historyListEl.appendChild(item);
      });
    };
    const setActiveTab = (tabName) => {
      tabButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.tab === tabName);
      });
      tabPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === tabName);
      });
    };
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab);
      });
    });
    clearHistoryEl.addEventListener("click", () => {
      clearHistory();
      trackEvent(EVENTS.HISTORY_CLEARED);
    });
    let epochAutoRefreshActive = true;
    const updateEpochInput = () => {
      if (!epochAutoRefreshActive) {
        return;
      }
      if (document.activeElement === inputEl) {
        return;
      }
      inputEl.value = String(Math.floor(Date.now() / 1e3) * 1e3);
    };
    const stopEpochAutoRefresh = () => {
      epochAutoRefreshActive = false;
    };
    const maybeResumeEpochAutoRefresh = () => {
      if (inputEl.value.trim() === "") {
        epochAutoRefreshActive = true;
        updateEpochInput();
      }
    };
    inputEl.addEventListener("focus", stopEpochAutoRefresh);
    inputEl.addEventListener("input", stopEpochAutoRefresh);
    inputEl.addEventListener("blur", maybeResumeEpochAutoRefresh);
    updateEpochInput();
    setInterval(updateEpochInput, 1e3);
    bindLiveCopyButton(copyEpochBtn, () => String(Date.now()), {
      onCopy: (val) => {
        inputEl.value = val;
        stopEpochAutoRefresh();
      }
    });
    const presetChips = document.querySelectorAll(".preset-chip");
    const setActivePreset = (preset) => {
      presetChips.forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.preset === preset);
      });
    };
    const getNowFieldsInZone = (zone) => {
      const now = /* @__PURE__ */ new Date();
      const lower = String(zone).toLowerCase();
      if (lower === "utc") {
        return {
          hour: now.getUTCHours(),
          minute: now.getUTCMinutes(),
          second: now.getUTCSeconds(),
          ms: now.getUTCMilliseconds()
        };
      }
      if (lower === "local") {
        return {
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: now.getSeconds(),
          ms: now.getMilliseconds()
        };
      }
      const ts = formatTimestampInZone(now, zone);
      const timePart = ts.slice(11);
      const [hhmmss, msStr] = timePart.split(".");
      const [hh, mm, ss] = hhmmss.split(":");
      return {
        hour: Number(hh),
        minute: Number(mm),
        second: Number(ss),
        ms: Number(msStr)
      };
    };
    const applyTimePreset = (preset) => {
      if (preset === "sod") {
        timeHourEl.value = 0;
        timeMinuteEl.value = 0;
        timeSecondEl.value = 0;
        timeMsEl.value = 0;
      } else if (preset === "eod") {
        timeHourEl.value = 23;
        timeMinuteEl.value = 59;
        timeSecondEl.value = 59;
        timeMsEl.value = 999;
      } else if (preset === "now") {
        const fields = getNowFieldsInZone(timezoneSelectEl.value || "local");
        timeHourEl.value = fields.hour;
        timeMinuteEl.value = fields.minute;
        timeSecondEl.value = fields.second;
        timeMsEl.value = fields.ms;
      }
      timeFields.forEach(syncHasValue);
      setActivePreset(preset);
    };
    presetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        applyTimePreset(chip.dataset.preset);
        trackEvent(EVENTS.DATE_PRESET_USED, { preset: chip.dataset.preset });
      });
    });
    timeFields.forEach((input) => {
      input.addEventListener("input", () => {
        setActivePreset(null);
      });
    });
    let dateIsoMode = false;
    isoToggleBtn.addEventListener("click", () => {
      dateIsoMode = !dateIsoMode;
      isoToggleBtn.classList.toggle("is-active", dateIsoMode);
      isoToggleBtn.textContent = dateIsoMode ? "Enter Date Manually" : "Convert ISO String";
      dateManualGroup.hidden = dateIsoMode;
      isoInputGroup.hidden = !dateIsoMode;
      if (dateIsoMode) {
        isoInputEl.value = (/* @__PURE__ */ new Date()).toISOString();
      }
      dateErrorEl.hidden = true;
      dateErrorEl.textContent = "";
      clearFieldErrors(dateFormEl);
    });
    isoInputEl.addEventListener("blur", () => {
      const val = isoInputEl.value.trim();
      if (!val) return;
      const result = parseIsoString(val, isoTzSelectEl.value);
      if (result.error) {
        setFieldError(isoInputEl);
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = result.error;
      } else {
        clearFieldError(isoInputEl);
        dateErrorEl.hidden = true;
        dateErrorEl.textContent = "";
      }
    });
    isoInputEl.addEventListener("input", () => {
      clearFieldError(isoInputEl);
      dateErrorEl.hidden = true;
      dateErrorEl.textContent = "";
    });
    const populateDateTimeFields = (useUtc) => {
      const now = /* @__PURE__ */ new Date();
      const year = useUtc ? now.getUTCFullYear() : now.getFullYear();
      const month = useUtc ? now.getUTCMonth() + 1 : now.getMonth() + 1;
      const day = useUtc ? now.getUTCDate() : now.getDate();
      dateYearEl.value = year;
      dateMonthEl.value = month;
      dateDayEl.value = day;
      applyTimePreset("now");
      [...dateFields, ...timeFields].forEach(syncHasValue);
    };
    const populateRelativeDefaults = () => {
      relativeDaysEl.value = 0;
      relativeHoursEl.value = 0;
      relativeMinutesEl.value = 0;
      relativeSecondsEl.value = 0;
      relativeMsEl.value = 0;
      relFields.forEach(syncHasValue);
    };
    epochFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      errorEl.hidden = true;
      const inputValue = inputEl.value.trim();
      const epochMs = parseEpoch(inputValue);
      if (epochMs === null) {
        resultEl.hidden = true;
        errorEl.hidden = false;
        errorEl.textContent = "Enter a 10 or 13 digit epoch value (commas and underscores are allowed).";
        return;
      }
      const conversion = buildConversionData(epochMs);
      renderEpochToDateResult(epochMs, conversion);
      trackEvent(EVENTS.EPOCH_TO_DATE);
      saveHistory({
        source: "epoch",
        input: inputValue,
        epochMs,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    dateFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      dateErrorEl.textContent = "";
      dateErrorEl.hidden = true;
      clearFieldErrors(dateFormEl);
      if (dateIsoMode) {
        const result = parseIsoString(isoInputEl.value, isoTzSelectEl.value);
        if (result.error) {
          dateResultEl.hidden = true;
          dateErrorEl.hidden = false;
          dateErrorEl.textContent = result.error;
          return;
        }
        const epochMs2 = result.value;
        const conversion2 = buildConversionData(epochMs2);
        renderDateToEpochResult(epochMs2, conversion2);
        trackEvent(EVENTS.UTC_TO_EPOCH);
        saveHistory({
          source: "iso",
          input: isoInputEl.value.trim(),
          epochMs: epochMs2,
          convertedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        return;
      }
      const yearResult = parseDateField(dateYearEl.value, "Year", 1);
      if (yearResult.error) {
        setFieldError(dateYearEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = yearResult.error;
        return;
      }
      const monthResult = parseDateField(dateMonthEl.value, "Month", 1, 12);
      if (monthResult.error) {
        setFieldError(dateMonthEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = monthResult.error;
        return;
      }
      const dayResult = parseDateField(dateDayEl.value, "Day", 1, 31);
      if (dayResult.error) {
        setFieldError(dateDayEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = dayResult.error;
        return;
      }
      const dateParts = parseDateInput(
        yearResult.value,
        monthResult.value,
        dayResult.value
      );
      if (!dateParts) {
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = "Enter a valid date (YYYY/MM/DD fields).";
        return;
      }
      const hour = parseTimePart(timeHourEl.value, 23, "Hour");
      if (hour.error) {
        setFieldError(timeHourEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = hour.error;
        return;
      }
      const minute = parseTimePart(timeMinuteEl.value, 59, "Minute");
      if (minute.error) {
        setFieldError(timeMinuteEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = minute.error;
        return;
      }
      const second = parseTimePart(timeSecondEl.value, 59, "Second");
      if (second.error) {
        setFieldError(timeSecondEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = second.error;
        return;
      }
      const ms = parseTimePart(timeMsEl.value, 999, "Milliseconds");
      if (ms.error) {
        setFieldError(timeMsEl);
        dateResultEl.hidden = true;
        dateErrorEl.hidden = false;
        dateErrorEl.textContent = ms.error;
        return;
      }
      const selectedZone = timezoneSelectEl.value || "local";
      const zoneLower = selectedZone.toLowerCase();
      let epochMs;
      if (zoneLower === "utc") {
        epochMs = Date.UTC(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value
        );
      } else if (zoneLower === "local") {
        epochMs = new Date(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value
        ).getTime();
      } else {
        const utcGuess = Date.UTC(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value
        );
        const offsetMin = zoneOffsetMinutes(
          dateParts.year,
          dateParts.month,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value,
          selectedZone
        );
        epochMs = utcGuess - offsetMin * 6e4;
      }
      const conversion = buildConversionData(epochMs);
      renderDateToEpochResult(epochMs, conversion);
      trackEvent(EVENTS.DATE_TO_EPOCH);
      const dateLabel = `${dateParts.year}-${pad2(dateParts.month)}-${pad2(
        dateParts.day
      )} ${pad2(hour.value)}:${pad2(minute.value)}:${pad2(second.value)}.${pad3(
        ms.value
      )} ${zoneDisplayLabel(selectedZone)}`;
      saveHistory({
        source: "date",
        input: dateLabel,
        epochMs,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    relativeFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      relativeErrorEl.textContent = "";
      relativeErrorEl.hidden = true;
      const days = parseTimePart(relativeDaysEl.value, 365e3, "Days");
      if (days.error) {
        relativeResultEl.hidden = true;
        relativeErrorEl.hidden = false;
        relativeErrorEl.textContent = days.error;
        return;
      }
      const hours = parseTimePart(relativeHoursEl.value, 23, "Hours");
      if (hours.error) {
        relativeResultEl.hidden = true;
        relativeErrorEl.hidden = false;
        relativeErrorEl.textContent = hours.error;
        return;
      }
      const minutes = parseTimePart(relativeMinutesEl.value, 59, "Minutes");
      if (minutes.error) {
        relativeResultEl.hidden = true;
        relativeErrorEl.hidden = false;
        relativeErrorEl.textContent = minutes.error;
        return;
      }
      const seconds = parseTimePart(relativeSecondsEl.value, 59, "Seconds");
      if (seconds.error) {
        relativeResultEl.hidden = true;
        relativeErrorEl.hidden = false;
        relativeErrorEl.textContent = seconds.error;
        return;
      }
      const ms = parseTimePart(relativeMsEl.value, 999, "Milliseconds");
      if (ms.error) {
        relativeResultEl.hidden = true;
        relativeErrorEl.hidden = false;
        relativeErrorEl.textContent = ms.error;
        return;
      }
      const totalSeconds = days.value * 86400 + hours.value * 3600 + minutes.value * 60 + seconds.value;
      const now = Date.now();
      const isAgo = relativeDirectionEl.value === "ago";
      const epochMs = now + (isAgo ? -1 : 1) * (totalSeconds * 1e3 + ms.value);
      const conversion = buildConversionData(epochMs);
      const relativeLabel = formatRelativeParts(
        {
          days: days.value,
          hours: hours.value,
          minutes: minutes.value,
          seconds: seconds.value,
          ms: ms.value
        },
        isAgo ? "ago" : "from now"
      );
      renderRelativeResult(epochMs, conversion, relativeLabel);
      trackEvent(EVENTS.RELATIVE_CALCULATED, {
        direction: isAgo ? "ago" : "from_now"
      });
      saveHistory({
        source: "relative",
        display: relativeLabel,
        epochMs,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    let lastRatingValue = null;
    const clearStarHoverPreview = () => {
      delete ratingStarsRow.dataset.hoverRating;
    };
    const showCollapsedRatingPrompt = () => {
      ratingStepPromptEl.hidden = false;
      ratingStepActionsEl.hidden = true;
      ratingStarsRow.hidden = false;
      clearStarHoverPreview();
    };
    const showRatingPrompt = () => {
      ratingStepPromptEl.hidden = false;
      ratingStepActionsEl.hidden = true;
      ratingStarsRow.hidden = false;
      clearStarHoverPreview();
    };
    const showPostRatingActions = () => {
      ratingStepPromptEl.hidden = true;
      ratingStepActionsEl.hidden = false;
      clearStarHoverPreview();
    };
    const updateRateAgainLabel = () => {
      const label = isFirefoxExtension() ? "Rate Add-on Again" : "Rate Extension Again";
      ratingAgainBtn.textContent = label;
    };
    const applyRatingFromStorage = (result) => {
      const raw = result[STORAGE_RATING_STARS];
      lastRatingValue = typeof raw === "number" && raw >= 1 && raw <= 5 ? raw : null;
      const hidden = Boolean(result[STORAGE_RATING_FOOTER_HIDDEN]);
      updateRateAgainLabel();
      if (hidden) {
        ratingFooterEl.hidden = true;
        return;
      }
      ratingFooterEl.hidden = false;
      if (lastRatingValue != null) {
        showPostRatingActions();
      } else {
        showCollapsedRatingPrompt();
      }
    };
    const initRatingUi = () => {
      if (!browser2.storage?.local) {
        ratingFooterEl.hidden = true;
        return;
      }
      browser2.storage.local.get(
        {
          [STORAGE_RATING_STARS]: null,
          [STORAGE_RATING_FOOTER_HIDDEN]: false
        },
        (result) => {
          applyRatingFromStorage(result);
        }
      );
      ratingStarsRow.addEventListener("mousemove", (e) => {
        const btn = e.target.closest(".rating-star-btn");
        if (btn && ratingStarsRow.contains(btn)) {
          const n = btn.dataset.stars;
          if (n) ratingStarsRow.dataset.hoverRating = n;
        }
      });
      ratingStarsRow.addEventListener("mouseleave", () => {
        clearStarHoverPreview();
      });
      ratingStarsRow.addEventListener("focusin", (e) => {
        const btn = e.target.closest(".rating-star-btn");
        if (btn && ratingStarsRow.contains(btn) && btn.dataset.stars) {
          ratingStarsRow.dataset.hoverRating = btn.dataset.stars;
        }
      });
      ratingStarsRow.addEventListener("focusout", (e) => {
        if (!ratingStarsRow.contains(e.relatedTarget)) {
          clearStarHoverPreview();
        }
      });
      ratingStarBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const n = Number(btn.dataset.stars);
          if (!n) return;
          trackEvent(EVENTS.RATING_CLICKED, { rating: n, source: "main" });
          browser2.storage.local.set({ [STORAGE_RATING_STARS]: n }, () => {
            lastRatingValue = n;
            if (n <= 3) {
              openFeedbackFormForStars(n);
            } else {
              openExternal(getStoreReviewUrl());
            }
            showPostRatingActions();
          });
        });
      });
      ratingHideFooterBtn.addEventListener("click", () => {
        trackEvent(EVENTS.RATING_FOOTER_ACTION, { action: "dismissed" });
        browser2.storage.local.set(
          { [STORAGE_RATING_FOOTER_HIDDEN]: true },
          () => {
            ratingFooterEl.hidden = true;
          }
        );
      });
      ratingAgainBtn.addEventListener("click", () => {
        trackEvent(EVENTS.RATING_FOOTER_ACTION, { action: "rate_again" });
        showRatingPrompt();
        browser2.storage.local.remove(STORAGE_RATING_STARS);
      });
    };
    const populateZoneOptions = (selectEl) => {
      if (!selectEl) return;
      const prev = selectEl.value;
      selectEl.replaceChildren ? selectEl.replaceChildren() : selectEl.textContent = "";
      currentZones.forEach((zone) => {
        const opt = document.createElement("option");
        opt.value = zone;
        opt.textContent = zoneDisplayLabel(zone);
        selectEl.appendChild(opt);
      });
      if (prev && currentZones.includes(prev)) {
        selectEl.value = prev;
      } else {
        selectEl.value = currentZones[0];
      }
    };
    const populateTimezoneSelect = () => {
      populateZoneOptions(timezoneSelectEl);
      populateZoneOptions(isoTzSelectEl);
    };
    const refreshVisibleResults = () => {
      if (!resultEl.hidden && lastResultEpochMs != null) {
        renderEpochToDateResult(
          lastResultEpochMs,
          buildConversionData(lastResultEpochMs)
        );
      }
      if (!dateResultEl.hidden && lastDateResultEpochMs != null) {
        renderDateToEpochResult(
          lastDateResultEpochMs,
          buildConversionData(lastDateResultEpochMs)
        );
      }
      if (!relativeResultEl.hidden && lastRelativeResult) {
        renderRelativeResult(
          lastRelativeResult.epochMs,
          buildConversionData(lastRelativeResult.epochMs),
          lastRelativeResult.relativeLabel
        );
      }
      loadHistory();
    };
    const showSettingsView = () => {
      if (!settingsViewEl || !mainViewEl) return;
      mainViewEl.hidden = true;
      settingsViewEl.hidden = false;
      if (ratingFooterEl)
        ratingFooterEl.dataset.prevHidden = ratingFooterEl.hidden ? "1" : "0";
      if (ratingFooterEl) ratingFooterEl.hidden = true;
      renderSettingsView();
    };
    const showMainView = () => {
      if (!settingsViewEl || !mainViewEl) return;
      settingsViewEl.hidden = true;
      mainViewEl.hidden = false;
      if (ratingFooterEl && ratingFooterEl.dataset.prevHidden !== void 0) {
        ratingFooterEl.hidden = ratingFooterEl.dataset.prevHidden === "1";
        delete ratingFooterEl.dataset.prevHidden;
      }
    };
    const createSvg = (pathData, size) => {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("xmlns", ns);
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", pathData);
      svg.appendChild(path);
      return svg;
    };
    const createGripSvg = () => {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("xmlns", ns);
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "currentColor");
      [
        [9, 5],
        [9, 12],
        [9, 19],
        [15, 5],
        [15, 12],
        [15, 19]
      ].forEach(([cx, cy]) => {
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", "1.5");
        svg.appendChild(circle);
      });
      return svg;
    };
    let tzDragFromIdx = null;
    const clearDropIndicators = () => {
      if (!tzListEl) return;
      tzListEl.querySelectorAll(".drop-before, .drop-after").forEach((el) => el.classList.remove("drop-before", "drop-after"));
    };
    const renderTzList = () => {
      if (!tzListEl) return;
      tzListEl.replaceChildren ? tzListEl.replaceChildren() : tzListEl.textContent = "";
      const now = /* @__PURE__ */ new Date();
      currentZones.forEach((zone, idx) => {
        const li = document.createElement("li");
        li.className = "tz-row";
        li.dataset.idx = String(idx);
        li.draggable = true;
        const handle = document.createElement("span");
        handle.className = "tz-drag-handle";
        handle.title = "Drag to reorder";
        handle.setAttribute("aria-hidden", "true");
        handle.appendChild(createGripSvg());
        li.appendChild(handle);
        const labelWrap = document.createElement("div");
        labelWrap.className = "tz-row-label";
        const nameEl = document.createElement("span");
        nameEl.className = "tz-row-name";
        nameEl.textContent = zoneDisplayLabel(zone);
        labelWrap.appendChild(nameEl);
        const offsetEl = document.createElement("span");
        offsetEl.className = "tz-row-offset";
        offsetEl.textContent = formatOffsetInZone(now, zone);
        labelWrap.appendChild(offsetEl);
        li.appendChild(labelWrap);
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "tz-remove-btn";
        removeBtn.title = "Remove timezone";
        removeBtn.setAttribute("aria-label", `Remove ${zoneDisplayLabel(zone)}`);
        removeBtn.appendChild(createSvg("M18 6L6 18M6 6l12 12", 14));
        if (currentZones.length <= 1) {
          removeBtn.disabled = true;
        } else {
          removeBtn.addEventListener("click", () => {
            const next = currentZones.slice();
            const [removed] = next.splice(idx, 1);
            if (next.length === 0) return;
            saveTimezonesToStorage(next);
            trackEvent(EVENTS.TIMEZONE_MODIFIED, {
              action: "remove",
              zone: removed
            });
          });
        }
        li.appendChild(removeBtn);
        li.addEventListener("dragstart", (e) => {
          tzDragFromIdx = idx;
          li.classList.add("is-dragging");
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(idx));
          }
        });
        li.addEventListener("dragend", () => {
          li.classList.remove("is-dragging");
          clearDropIndicators();
          tzDragFromIdx = null;
        });
        li.addEventListener("dragover", (e) => {
          if (tzDragFromIdx === null) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
          const rect = li.getBoundingClientRect();
          const before = e.clientY - rect.top < rect.height / 2;
          clearDropIndicators();
          if (tzDragFromIdx === idx) return;
          li.classList.add(before ? "drop-before" : "drop-after");
        });
        li.addEventListener("drop", (e) => {
          e.preventDefault();
          const fromIdx = tzDragFromIdx;
          clearDropIndicators();
          if (fromIdx === null || fromIdx === idx) return;
          const rect = li.getBoundingClientRect();
          const before = e.clientY - rect.top < rect.height / 2;
          let toIdx = before ? idx : idx + 1;
          if (toIdx > fromIdx) toIdx -= 1;
          if (toIdx === fromIdx) return;
          const next = currentZones.slice();
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          saveTimezonesToStorage(next);
          trackEvent(EVENTS.TIMEZONE_MODIFIED, {
            action: "reorder",
            zone: moved
          });
        });
        tzListEl.appendChild(li);
      });
    };
    const renderAddTzSelect = () => {
      if (!tzAddSelectEl) return;
      const all = getAvailableTimezones();
      const available = all.filter((z) => !currentZones.includes(z));
      tzAddSelectEl.replaceChildren ? tzAddSelectEl.replaceChildren() : tzAddSelectEl.textContent = "";
      if (available.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "All timezones added";
        opt.disabled = true;
        opt.selected = true;
        tzAddSelectEl.appendChild(opt);
        if (tzAddBtn) tzAddBtn.disabled = true;
        return;
      }
      if (tzAddBtn) tzAddBtn.disabled = false;
      const now = /* @__PURE__ */ new Date();
      const entries = available.map((zone) => {
        const offsetStr = formatOffsetInZone(now, zone);
        const m = offsetStr.match(/^([+-])(\d{2}):(\d{2})$/);
        const offsetMinutes = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
        return { zone, offsetStr, offsetMinutes };
      });
      entries.sort(
        (a, b) => a.offsetMinutes - b.offsetMinutes || zoneDisplayLabel(a.zone).localeCompare(zoneDisplayLabel(b.zone))
      );
      entries.forEach(({ zone, offsetStr }) => {
        const opt = document.createElement("option");
        opt.value = zone;
        opt.textContent = `${zoneDisplayLabel(zone)} (${offsetStr})`;
        tzAddSelectEl.appendChild(opt);
      });
      const defaultZone = entries.find((e) => e.zone === "utc") ? "utc" : entries[0].zone;
      tzAddSelectEl.value = defaultZone;
    };
    const renderSettingsThemeMenu = (pref) => {
      updateMenuActive(settingsThemeMenu, pref);
    };
    const renderSettingsView = () => {
      renderTzList();
      renderAddTzSelect();
    };
    if (tzAddBtn && tzAddSelectEl) {
      tzAddBtn.addEventListener("click", () => {
        const zone = tzAddSelectEl.value;
        if (!zone || currentZones.includes(zone)) return;
        saveTimezonesToStorage([...currentZones, zone]);
        trackEvent(EVENTS.TIMEZONE_MODIFIED, { action: "add", zone });
      });
    }
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        showSettingsView();
        trackEvent(EVENTS.SETTINGS_OPENED);
      });
    }
    if (settingsBackBtn) {
      settingsBackBtn.addEventListener("click", () => {
        showMainView();
      });
    }
    settingsStarBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.stars);
        if (!n) return;
        trackEvent(EVENTS.RATING_CLICKED, { rating: n, source: "settings" });
        if (browser2?.storage?.local) {
          browser2.storage.local.set({ [STORAGE_RATING_STARS]: n }, () => {
            lastRatingValue = n;
            if (n <= 3) {
              openFeedbackFormForStars(n);
            } else {
              openExternal(getStoreReviewUrl());
            }
            showPostRatingActions();
          });
        } else {
          if (n <= 3) {
            openFeedbackFormForStars(n);
          } else {
            openExternal(getStoreReviewUrl());
          }
        }
      });
    });
    if (settingsStarsRow) {
      settingsStarsRow.addEventListener("mousemove", (e) => {
        const btn = e.target.closest(".rating-star-btn");
        if (btn && settingsStarsRow.contains(btn)) {
          const n = btn.dataset.stars;
          if (n) settingsStarsRow.dataset.hoverRating = n;
        }
      });
      settingsStarsRow.addEventListener("mouseleave", () => {
        delete settingsStarsRow.dataset.hoverRating;
      });
    }
    const STORAGE_ANALYTICS_NOTICE_SEEN = "analyticsNoticeSeen";
    const STORAGE_ANALYTICS_OPT_OUT = "analyticsOptOut";
    const syncAnalyticsToggle = async () => {
      if (!analyticsOptInEl) return;
      const optedOut = await getOptOut();
      analyticsOptInEl.checked = !optedOut;
    };
    if (analyticsOptInEl) {
      analyticsOptInEl.addEventListener("change", () => {
        setOptOut(!analyticsOptInEl.checked);
      });
      syncAnalyticsToggle();
    }
    if (browser2?.storage?.onChanged) {
      browser2.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[STORAGE_ANALYTICS_OPT_OUT]) {
          syncAnalyticsToggle();
        }
      });
    }
    const maybeShowAnalyticsNotice = () => {
      if (!analyticsNoticeEl || !browser2?.storage?.local) return;
      browser2.storage.local.get(
        {
          [STORAGE_ANALYTICS_NOTICE_SEEN]: false,
          [STORAGE_ANALYTICS_OPT_OUT]: null,
          history: []
        },
        (res) => {
          const seen = Boolean(res[STORAGE_ANALYTICS_NOTICE_SEEN]);
          if (seen) return;
          const hasHistory = Array.isArray(res.history) && res.history.length > 0;
          const explicitOptOut = res[STORAGE_ANALYTICS_OPT_OUT] === true;
          if (!hasHistory || explicitOptOut) {
            browser2.storage.local.set({ [STORAGE_ANALYTICS_NOTICE_SEEN]: true });
            return;
          }
          analyticsNoticeEl.hidden = false;
        }
      );
    };
    if (analyticsNoticeDismissBtn && analyticsNoticeEl) {
      analyticsNoticeDismissBtn.addEventListener("click", () => {
        analyticsNoticeEl.hidden = true;
        if (browser2?.storage?.local) {
          browser2.storage.local.set({ [STORAGE_ANALYTICS_NOTICE_SEEN]: true });
        }
      });
    }
    maybeShowAnalyticsNotice();
    settingsLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href") || "";
        let target = null;
        if (href.includes("github.com")) target = "github";
        else if (href.includes("chai4.me")) target = "chai4me";
        if (target) trackEvent(EVENTS.EXTERNAL_LINK_CLICKED, { target });
      });
    });
    loadTimezonesFromStorage((zones) => {
      currentZones = zones;
      populateTimezoneSelect();
      populateDateTimeFields(false);
      populateRelativeDefaults();
      renderSettingsView();
      loadHistory();
      trackEvent(EVENTS.POPUP_OPENED);
    });
    onTimezonesChanged((zones) => {
      currentZones = zones;
      populateTimezoneSelect();
      renderSettingsView();
      refreshVisibleResults();
    });
    loadThemeFromStorage((pref) => {
      renderSettingsThemeMenu(pref);
    });
    if (browser2?.storage?.onChanged) {
      browser2.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.theme) {
          renderSettingsThemeMenu(changes.theme.newValue || "system");
        }
      });
    }
    initRatingUi();
  })();
})();
