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
  var parseIsoString = (isoStr, fallbackTz) => {
    const trimmed = isoStr.trim();
    if (!trimmed) {
      return { error: "ISO string is required." };
    }
    const hasOffset = /[Zz]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed) || /[+-]\d{4}$/.test(trimmed);
    let dateStr = trimmed;
    if (!hasOffset && fallbackTz === "utc") {
      dateStr = trimmed + "Z";
    }
    const date = new Date(dateStr);
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
  var bindLiveCopyButton = (button, valueFn, {
    successClass = "copy-success",
    errorClass = "copy-error",
    onCopy
  } = {}) => {
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
        svgEl("rect", { x: "2", y: "3", width: "20", height: "14", rx: "2", ry: "2" }),
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
    const browser = globalThis.browser || globalThis.chrome;
    if (!browser?.storage?.local) {
      callback("system");
      return;
    }
    browser.storage.local.get({ [THEME_KEY]: "system" }, (result) => {
      callback(result[THEME_KEY] || "system");
    });
  }
  function saveThemeToStorage(preference) {
    const browser = globalThis.browser || globalThis.chrome;
    if (!browser?.storage?.local) return;
    browser.storage.local.set({ [THEME_KEY]: preference });
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
    url.searchParams.set(
      FEEDBACK_FORM_ENTRY_KEYS.rating,
      String(stars)
    );
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

  // src/popup/main.js
  (() => {
    const browser = globalThis.browser || globalThis.chrome;
    const STORAGE_RATING_STARS = "ratingStars";
    const STORAGE_RATING_FOOTER_HIDDEN = "ratingFooterHidden";
    const STORE_REVIEW_URL_CHROME = "https://chromewebstore.google.com/detail/epoch-buddy/ehjdbcbcfobnkanngnjlibodhgdbhkam/reviews";
    const STORE_REVIEW_URL_FIREFOX = "https://addons.mozilla.org/en-US/firefox/addon/epoch-buddy/reviews/";
    const isFirefoxExtension = () => {
      try {
        const m = browser.runtime.getManifest();
        return Boolean(m.browser_specific_settings?.gecko);
      } catch {
        return false;
      }
    };
    const getStoreReviewUrl = () => isFirefoxExtension() ? STORE_REVIEW_URL_FIREFOX : STORE_REVIEW_URL_CHROME;
    const openFeedbackFormForStars = (stars) => {
      let manifestVersion = "";
      try {
        manifestVersion = browser.runtime.getManifest().version ?? "";
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
    const setTheme = (preference) => {
      applyTheme(preference);
      updateToggleIcon(themeToggleBtn, preference);
      updateMenuActive(themeMenu, preference);
      saveThemeToStorage(preference);
    };
    loadThemeFromStorage((pref) => {
      applyTheme(pref);
      updateToggleIcon(themeToggleBtn, pref);
      updateMenuActive(themeMenu, pref);
    });
    themeToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      themeMenu.hidden = !themeMenu.hidden;
    });
    themeMenu.addEventListener("click", (e) => {
      const option = e.target.closest("[data-theme-option]");
      if (!option) return;
      setTheme(option.dataset.themeOption);
      themeMenu.hidden = true;
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
    const ratingStarBtns = document.querySelectorAll(".rating-star-btn");
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
      browser.storage.local.get({ history: [] }, (result) => {
        const history = Array.isArray(result.history) ? result.history : [];
        const next = [entry, ...history].slice(0, 10);
        browser.storage.local.set({ history: next }, () => {
          renderHistory(next);
        });
      });
    };
    const clearHistory = () => {
      if (!chrome?.storage?.local) {
        renderHistory([]);
        return;
      }
      browser.storage.local.set({ history: [] }, () => {
        renderHistory([]);
      });
    };
    const loadHistory = () => {
      if (!chrome?.storage?.local) {
        renderHistory([]);
        return;
      }
      browser.storage.local.get({ history: [] }, (result) => {
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
      } else {
        targetEl.appendChild(document.createElement("span"));
      }
    };
    const renderEpochToDateResult = (epochMs, conversion) => {
      resultEl.replaceChildren ? resultEl.replaceChildren() : resultEl.textContent = "";
      const rows = [
        { label: "Epoch (s)", value: conversion.epochS, copy: conversion.epochS },
        { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
        { label: "UTC", value: conversion.utc, copy: conversion.utc },
        {
          label: `Local (${conversion.tzLabel})`,
          value: conversion.localTimestamp,
          copy: conversion.localTimestamp
        },
        { label: "Relative", value: conversion.relative, isRelative: true }
      ];
      rows.forEach((row) => appendResultRow(resultEl, row));
      resultEl.hidden = false;
    };
    const renderDateToEpochResult = (epochMs, conversion) => {
      dateResultEl.replaceChildren ? dateResultEl.replaceChildren() : dateResultEl.textContent = "";
      const rows = [
        { label: "Epoch (s)", value: conversion.epochS, copy: conversion.epochS },
        { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
        { label: "UTC", value: conversion.utc, copy: conversion.utc },
        {
          label: `Local (${conversion.tzLabel})`,
          value: conversion.localTimestamp,
          copy: conversion.localTimestamp
        },
        { label: "Relative", value: conversion.relative, isRelative: true }
      ];
      rows.forEach((row) => appendResultRow(dateResultEl, row));
      dateResultEl.hidden = false;
    };
    const renderRelativeResult = (epochMs, conversion, relativeLabel) => {
      relativeResultEl.replaceChildren ? relativeResultEl.replaceChildren() : relativeResultEl.textContent = "";
      const rows = [
        { label: "Epoch (s)", value: conversion.epochS, copy: conversion.epochS },
        { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
        { label: "UTC", value: conversion.utc, copy: conversion.utc },
        {
          label: `Local (${conversion.tzLabel})`,
          value: conversion.localTimestamp,
          copy: conversion.localTimestamp
        },
        { label: "Relative", value: relativeLabel, isRelative: true }
      ];
      rows.forEach((row) => appendResultRow(relativeResultEl, row));
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
        addHistoryLine("UTC", conversion.utc, conversion.utc);
        addHistoryLine(
          `Local (${conversion.tzLabel})`,
          conversion.localTimestamp,
          conversion.localTimestamp
        );
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
    const applyTimePreset = (preset) => {
      const useUtc = timezoneSelectEl.value === "utc";
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
        const now = /* @__PURE__ */ new Date();
        timeHourEl.value = useUtc ? now.getUTCHours() : now.getHours();
        timeMinuteEl.value = useUtc ? now.getUTCMinutes() : now.getMinutes();
        timeSecondEl.value = useUtc ? now.getUTCSeconds() : now.getSeconds();
        timeMsEl.value = useUtc ? now.getUTCMilliseconds() : now.getMilliseconds();
      }
      timeFields.forEach(syncHasValue);
      setActivePreset(preset);
    };
    presetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        applyTimePreset(chip.dataset.preset);
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
      const useUtc = timezoneSelectEl.value === "utc";
      const epochMs = useUtc ? Date.UTC(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        hour.value,
        minute.value,
        second.value,
        ms.value
      ) : new Date(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        hour.value,
        minute.value,
        second.value,
        ms.value
      ).getTime();
      const conversion = buildConversionData(epochMs);
      renderDateToEpochResult(epochMs, conversion);
      const dateLabel = `${dateParts.year}-${pad2(dateParts.month)}-${pad2(
        dateParts.day
      )} ${pad2(hour.value)}:${pad2(minute.value)}:${pad2(second.value)}.${pad3(
        ms.value
      )} ${useUtc ? "UTC" : "Local"}`;
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
      if (!browser.storage?.local) {
        ratingFooterEl.hidden = true;
        return;
      }
      browser.storage.local.get(
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
          browser.storage.local.set({ [STORAGE_RATING_STARS]: n }, () => {
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
        browser.storage.local.set(
          { [STORAGE_RATING_FOOTER_HIDDEN]: true },
          () => {
            ratingFooterEl.hidden = true;
          }
        );
      });
      ratingAgainBtn.addEventListener("click", () => {
        showRatingPrompt();
        browser.storage.local.remove(STORAGE_RATING_STARS);
      });
    };
    loadHistory();
    populateDateTimeFields(false);
    populateRelativeDefaults();
    initRatingUi();
  })();
})();
