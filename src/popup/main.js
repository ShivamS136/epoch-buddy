/**
 * Extension popup entry point.
 *
 * Handles the three conversion tabs (Epoch -> Date, Date -> Epoch, Relative),
 * history management via chrome.storage.local, and auto-refreshing epoch input.
 */

import {
  pad2,
  pad3,
  formatRelativeParts,
  buildConversionData,
  formatTimeOnly,
  formatTimeZoneOffset,
  formatTimestampInZone,
  formatOffsetInZone,
  zoneDisplayLabel,
  buildZoneRows,
  zoneOffsetMinutes,
} from "../shared/formatting.js";
import {
  parseEpoch,
  parseDateInput,
  parseTimePart,
  parseDateField,
  parseIsoString,
  normalizeRelativeFields,
} from "../shared/parsing.js";
import { createCopyButton, bindLiveCopyButton } from "../shared/clipboard.js";
import {
  loadThemeFromStorage,
  saveThemeToStorage,
  applyTheme,
  updateToggleIcon,
  updateMenuActive,
} from "../shared/theme.js";
import {
  DEFAULT_TIMEZONES,
  loadTimezonesFromStorage,
  saveTimezonesToStorage,
  onTimezonesChanged,
  getAvailableTimezones,
} from "../shared/timezones.js";
import { buildFeedbackFormUrl } from "../shared/feedbackFormUrl.js";
import {
  EVENTS,
  trackEvent,
  getOptOut,
  setOptOut,
} from "../shared/analytics.js";

(() => {
  const browser = globalThis.browser || globalThis.chrome;

  const STORAGE_RATING_STARS = "ratingStars";
  const STORAGE_RATING_FOOTER_HIDDEN = "ratingFooterHidden";

  const STORE_REVIEW_URL_CHROME =
    "https://chromewebstore.google.com/detail/epoch-buddy/ehjdbcbcfobnkanngnjlibodhgdbhkam/reviews";

  const STORE_REVIEW_URL_FIREFOX =
    "https://addons.mozilla.org/en-US/firefox/addon/epoch-buddy/reviews/";

  const isFirefoxExtension = () => {
    try {
      const m = browser.runtime.getManifest();
      return Boolean(m.browser_specific_settings?.gecko);
    } catch {
      return false;
    }
  };

  const getStoreReviewUrl = () =>
    isFirefoxExtension() ? STORE_REVIEW_URL_FIREFOX : STORE_REVIEW_URL_CHROME;

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
      isFirefoxExtension(),
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

  // ── Theme ────────────────────────────────────────────────────────

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
        source: "settings",
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
      source: "toolbar",
    });
  });

  document.addEventListener("click", (e) => {
    if (!themeMenu.hidden && !e.target.closest(".theme-toggle")) {
      themeMenu.hidden = true;
    }
  });

  // ── Header timezone ────────────────────────────────────────────

  const headerTzEl = document.getElementById("header-tz");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = formatTimeZoneOffset(new Date(), true);
  headerTzEl.textContent = `${tz} (UTC${offset})`;

  // ── DOM references ────────────────────────────────────────────────

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
    "#rating-stars-row .rating-star-btn",
  );

  const mainViewEl = document.getElementById("main-view");
  const settingsViewEl = document.getElementById("settings-view");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsBackBtn = document.getElementById("settings-back-btn");
  const tzListEl = document.getElementById("tz-list");
  const tzAddSelectEl = document.getElementById("tz-add-select");
  const tzAddBtn = document.getElementById("tz-add-btn");
  const settingsStarsRow = document.getElementById("settings-stars-row");
  const settingsStarBtns = settingsStarsRow
    ? settingsStarsRow.querySelectorAll(".rating-star-btn")
    : [];
  const analyticsOptInEl = document.getElementById("analytics-opt-in");
  const analyticsNoticeEl = document.getElementById("analytics-notice");
  const analyticsNoticeDismissBtn = document.getElementById(
    "analytics-notice-dismiss",
  );
  const settingsLinks = document.querySelectorAll(
    "#settings-view .settings-link",
  );

  let currentZones = DEFAULT_TIMEZONES.slice();

  // ── Floating label helper for number inputs ─────────────────────

  const syncHasValue = (input) => {
    input.classList.toggle("has-value", input.value !== "");
  };

  const allNumberInputs = dateFormEl.querySelectorAll('input[type="number"]');
  const relNumberInputs = relativeFormEl.querySelectorAll(
    'input[type="number"]',
  );

  [...allNumberInputs, ...relNumberInputs].forEach((input) => {
    input.addEventListener("input", () => syncHasValue(input));
    input.addEventListener("blur", () => syncHasValue(input));
    syncHasValue(input);
  });

  // ── Field error helpers ─────────────────────────────────────────

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

  // ── Blur behavior: time fields → 0, date fields → error ────────

  const dateFields = [dateYearEl, dateMonthEl, dateDayEl];
  const timeFields = [timeHourEl, timeMinuteEl, timeSecondEl, timeMsEl];
  const relFields = [
    relativeDaysEl,
    relativeHoursEl,
    relativeMinutesEl,
    relativeSecondsEl,
    relativeMsEl,
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

  // ── Normalize relative fields on blur ───────────────────────────

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

  // ── History (chrome.storage) ──────────────────────────────────────

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

  // ── Result rendering ──────────────────────────────────────────────

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
      // no copy button for relative results and no empty span
    } else {
      targetEl.appendChild(document.createElement("span"));
    }
  };

  const buildDisplayRows = (epochMs, conversion, relativeOverride) => {
    const rows = [
      { label: "Epoch (s)", value: conversion.epochS, copy: conversion.epochS },
      { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
    ];
    buildZoneRows(epochMs, currentZones).forEach((zoneRow) => {
      rows.push({
        label: zoneRow.label,
        value: zoneRow.displayValue,
        copy: zoneRow.copyValue,
      });
    });
    rows.push({
      label: "Relative",
      value: relativeOverride != null ? relativeOverride : conversion.relative,
      isRelative: true,
    });
    return rows;
  };

  let lastResultEpochMs = null;
  let lastDateResultEpochMs = null;
  let lastRelativeResult = null;

  const renderEpochToDateResult = (epochMs, conversion) => {
    lastResultEpochMs = epochMs;
    resultEl.replaceChildren
      ? resultEl.replaceChildren()
      : (resultEl.textContent = "");
    buildDisplayRows(epochMs, conversion).forEach((row) =>
      appendResultRow(resultEl, row),
    );
    resultEl.hidden = false;
  };

  const renderDateToEpochResult = (epochMs, conversion) => {
    lastDateResultEpochMs = epochMs;
    dateResultEl.replaceChildren
      ? dateResultEl.replaceChildren()
      : (dateResultEl.textContent = "");
    buildDisplayRows(epochMs, conversion).forEach((row) =>
      appendResultRow(dateResultEl, row),
    );
    dateResultEl.hidden = false;
  };

  const renderRelativeResult = (epochMs, conversion, relativeLabel) => {
    lastRelativeResult = { epochMs, relativeLabel };
    relativeResultEl.replaceChildren
      ? relativeResultEl.replaceChildren()
      : (relativeResultEl.textContent = "");
    buildDisplayRows(epochMs, conversion, relativeLabel).forEach((row) =>
      appendResultRow(relativeResultEl, row),
    );
    relativeResultEl.hidden = false;
  };

  // ── History rendering ─────────────────────────────────────────────

  const renderHistory = (history) => {
    historyListEl.replaceChildren
      ? historyListEl.replaceChildren()
      : (historyListEl.textContent = "");
    const entries = Array.isArray(history) ? history : [];
    historyCountEl.textContent = entries.length
      ? `${entries.length} items`
      : "";

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
        String(entry.epochMs),
      );
      buildZoneRows(entry.epochMs, currentZones).forEach((zoneRow) => {
        addHistoryLine(zoneRow.label, zoneRow.displayValue, zoneRow.copyValue);
      });

      item.appendChild(linesGrid);

      historyListEl.appendChild(item);
    });
  };

  // ── Tabs ──────────────────────────────────────────────────────────

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

  // ── Auto-refresh epoch input ──────────────────────────────────────

  let epochAutoRefreshActive = true;
  const updateEpochInput = () => {
    if (!epochAutoRefreshActive) {
      return;
    }
    if (document.activeElement === inputEl) {
      return;
    }
    inputEl.value = String(Math.floor(Date.now() / 1000) * 1000);
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
  setInterval(updateEpochInput, 1000);

  // ── Copy epoch button ──────────────────────────────────────────

  bindLiveCopyButton(copyEpochBtn, () => String(Date.now()), {
    onCopy: (val) => {
      inputEl.value = val;
      stopEpochAutoRefresh();
    },
  });

  // ── Time presets ──────────────────────────────────────────────────

  const presetChips = document.querySelectorAll(".preset-chip");

  const setActivePreset = (preset) => {
    presetChips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.preset === preset);
    });
  };

  const getNowFieldsInZone = (zone) => {
    const now = new Date();
    const lower = String(zone).toLowerCase();
    if (lower === "utc") {
      return {
        hour: now.getUTCHours(),
        minute: now.getUTCMinutes(),
        second: now.getUTCSeconds(),
        ms: now.getUTCMilliseconds(),
      };
    }
    if (lower === "local") {
      return {
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        ms: now.getMilliseconds(),
      };
    }
    // Parse wall-clock hour/min/sec in the requested zone; ms is TZ-agnostic.
    const ts = formatTimestampInZone(now, zone);
    // ts is "YYYY-MM-DD HH:MM:SS.sss"
    const timePart = ts.slice(11);
    const [hhmmss, msStr] = timePart.split(".");
    const [hh, mm, ss] = hhmmss.split(":");
    return {
      hour: Number(hh),
      minute: Number(mm),
      second: Number(ss),
      ms: Number(msStr),
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

  // ── ISO toggle ────────────────────────────────────────────────────

  let dateIsoMode = false;

  isoToggleBtn.addEventListener("click", () => {
    dateIsoMode = !dateIsoMode;
    isoToggleBtn.classList.toggle("is-active", dateIsoMode);
    isoToggleBtn.textContent = dateIsoMode
      ? "Enter Date Manually"
      : "Convert ISO String";
    dateManualGroup.hidden = dateIsoMode;
    isoInputGroup.hidden = !dateIsoMode;
    if (dateIsoMode) {
      isoInputEl.value = new Date().toISOString();
    }
    dateErrorEl.hidden = true;
    dateErrorEl.textContent = "";
    clearFieldErrors(dateFormEl);
  });

  // ── ISO input blur validation ──────────────────────────────────

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

  // ── Populate defaults ─────────────────────────────────────────────

  const populateDateTimeFields = (useUtc) => {
    const now = new Date();
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

  // ── Form handlers ─────────────────────────────────────────────────

  epochFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    errorEl.textContent = "";
    errorEl.hidden = true;
    const inputValue = inputEl.value.trim();
    const epochMs = parseEpoch(inputValue);
    if (epochMs === null) {
      resultEl.hidden = true;
      errorEl.hidden = false;
      errorEl.textContent =
        "Enter a 10 or 13 digit epoch value (commas and underscores are allowed).";
      return;
    }

    const conversion = buildConversionData(epochMs);
    renderEpochToDateResult(epochMs, conversion);
    trackEvent(EVENTS.EPOCH_TO_DATE);
    saveHistory({
      source: "epoch",
      input: inputValue,
      epochMs,
      convertedAt: new Date().toISOString(),
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
      const epochMs = result.value;
      const conversion = buildConversionData(epochMs);
      renderDateToEpochResult(epochMs, conversion);
      trackEvent(EVENTS.UTC_TO_EPOCH);
      saveHistory({
        source: "iso",
        input: isoInputEl.value.trim(),
        epochMs,
        convertedAt: new Date().toISOString(),
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
      dayResult.value,
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
        ms.value,
      );
    } else if (zoneLower === "local") {
      epochMs = new Date(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        hour.value,
        minute.value,
        second.value,
        ms.value,
      ).getTime();
    } else {
      const utcGuess = Date.UTC(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        hour.value,
        minute.value,
        second.value,
        ms.value,
      );
      const offsetMin = zoneOffsetMinutes(
        dateParts.year,
        dateParts.month,
        dateParts.day,
        hour.value,
        minute.value,
        second.value,
        ms.value,
        selectedZone,
      );
      epochMs = utcGuess - offsetMin * 60000;
    }

    const conversion = buildConversionData(epochMs);
    renderDateToEpochResult(epochMs, conversion);
    trackEvent(EVENTS.DATE_TO_EPOCH);

    const dateLabel = `${dateParts.year}-${pad2(dateParts.month)}-${pad2(
      dateParts.day,
    )} ${pad2(hour.value)}:${pad2(minute.value)}:${pad2(second.value)}.${pad3(
      ms.value,
    )} ${zoneDisplayLabel(selectedZone)}`;

    saveHistory({
      source: "date",
      input: dateLabel,
      epochMs,
      convertedAt: new Date().toISOString(),
    });
  });

  relativeFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    relativeErrorEl.textContent = "";
    relativeErrorEl.hidden = true;
    const days = parseTimePart(relativeDaysEl.value, 365000, "Days");
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

    const totalSeconds =
      days.value * 86400 +
      hours.value * 3600 +
      minutes.value * 60 +
      seconds.value;

    const now = Date.now();
    const isAgo = relativeDirectionEl.value === "ago";
    const epochMs = now + (isAgo ? -1 : 1) * (totalSeconds * 1000 + ms.value);

    const conversion = buildConversionData(epochMs);
    const relativeLabel = formatRelativeParts(
      {
        days: days.value,
        hours: hours.value,
        minutes: minutes.value,
        seconds: seconds.value,
        ms: ms.value,
      },
      isAgo ? "ago" : "from now",
    );
    renderRelativeResult(epochMs, conversion, relativeLabel);
    trackEvent(EVENTS.RELATIVE_CALCULATED, {
      direction: isAgo ? "ago" : "from_now",
    });
    saveHistory({
      source: "relative",
      display: relativeLabel,
      epochMs,
      convertedAt: new Date().toISOString(),
    });
  });

  // ── Rating footer (local storage) ─────────────────────────────────

  let lastRatingValue = null;

  const clearStarHoverPreview = () => {
    delete ratingStarsRow.dataset.hoverRating;
  };

  /** First visit: stars hidden until user clicks “Rate Extension”. */
  const showCollapsedRatingPrompt = () => {
    ratingStepPromptEl.hidden = false;
    ratingStepActionsEl.hidden = true;
    ratingStarsRow.hidden = false;
    clearStarHoverPreview();
  };

  /** Stars visible (after reveal or “Rate Extension” from post-rating). */
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
    const label = isFirefoxExtension()
      ? "Rate Add-on Again"
      : "Rate Extension Again";
    ratingAgainBtn.textContent = label;
  };

  const applyRatingFromStorage = (result) => {
    const raw = result[STORAGE_RATING_STARS];
    lastRatingValue =
      typeof raw === "number" && raw >= 1 && raw <= 5 ? raw : null;
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
        [STORAGE_RATING_FOOTER_HIDDEN]: false,
      },
      (result) => {
        applyRatingFromStorage(result);
      },
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
      trackEvent(EVENTS.RATING_FOOTER_ACTION, { action: "dismissed" });
      browser.storage.local.set(
        { [STORAGE_RATING_FOOTER_HIDDEN]: true },
        () => {
          ratingFooterEl.hidden = true;
        },
      );
    });

    ratingAgainBtn.addEventListener("click", () => {
      trackEvent(EVENTS.RATING_FOOTER_ACTION, { action: "rate_again" });
      showRatingPrompt();
      browser.storage.local.remove(STORAGE_RATING_STARS);
    });
  };

  // ── Timezone select (Date → Epoch input) ─────────────────────────

  const populateZoneOptions = (selectEl) => {
    if (!selectEl) return;
    const prev = selectEl.value;
    selectEl.replaceChildren
      ? selectEl.replaceChildren()
      : (selectEl.textContent = "");
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
        buildConversionData(lastResultEpochMs),
      );
    }
    if (!dateResultEl.hidden && lastDateResultEpochMs != null) {
      renderDateToEpochResult(
        lastDateResultEpochMs,
        buildConversionData(lastDateResultEpochMs),
      );
    }
    if (!relativeResultEl.hidden && lastRelativeResult) {
      renderRelativeResult(
        lastRelativeResult.epochMs,
        buildConversionData(lastRelativeResult.epochMs),
        lastRelativeResult.relativeLabel,
      );
    }
    loadHistory();
  };

  // ── Settings view ──────────────────────────────────────────────

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
    if (ratingFooterEl && ratingFooterEl.dataset.prevHidden !== undefined) {
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
      [15, 19],
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
    tzListEl
      .querySelectorAll(".drop-before, .drop-after")
      .forEach((el) => el.classList.remove("drop-before", "drop-after"));
  };

  const renderTzList = () => {
    if (!tzListEl) return;
    tzListEl.replaceChildren
      ? tzListEl.replaceChildren()
      : (tzListEl.textContent = "");
    const now = new Date();
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
            zone: removed,
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
          zone: moved,
        });
      });

      tzListEl.appendChild(li);
    });
  };

  const renderAddTzSelect = () => {
    if (!tzAddSelectEl) return;
    const all = getAvailableTimezones();
    const available = all.filter((z) => !currentZones.includes(z));
    tzAddSelectEl.replaceChildren
      ? tzAddSelectEl.replaceChildren()
      : (tzAddSelectEl.textContent = "");

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
    const now = new Date();
    const entries = available.map((zone) => {
      const offsetStr = formatOffsetInZone(now, zone);
      const m = offsetStr.match(/^([+-])(\d{2}):(\d{2})$/);
      const offsetMinutes = m
        ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
        : 0;
      return { zone, offsetStr, offsetMinutes };
    });
    entries.sort(
      (a, b) =>
        a.offsetMinutes - b.offsetMinutes ||
        zoneDisplayLabel(a.zone).localeCompare(zoneDisplayLabel(b.zone)),
    );
    entries.forEach(({ zone, offsetStr }) => {
      const opt = document.createElement("option");
      opt.value = zone;
      opt.textContent = `${zoneDisplayLabel(zone)} (${offsetStr})`;
      tzAddSelectEl.appendChild(opt);
    });
    const defaultZone = entries.find((e) => e.zone === "utc")
      ? "utc"
      : entries[0].zone;
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
      if (browser?.storage?.local) {
        browser.storage.local.set({ [STORAGE_RATING_STARS]: n }, () => {
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

  // ── Analytics opt-out + first-run notice ─────────────────────────

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

  if (browser?.storage?.onChanged) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[STORAGE_ANALYTICS_OPT_OUT]) {
        syncAnalyticsToggle();
      }
    });
  }

  const maybeShowAnalyticsNotice = () => {
    if (!analyticsNoticeEl || !browser?.storage?.local) return;
    browser.storage.local.get(
      {
        [STORAGE_ANALYTICS_NOTICE_SEEN]: false,
        [STORAGE_ANALYTICS_OPT_OUT]: null,
        history: [],
      },
      (res) => {
        const seen = Boolean(res[STORAGE_ANALYTICS_NOTICE_SEEN]);
        if (seen) return;
        const hasHistory = Array.isArray(res.history) && res.history.length > 0;
        const explicitOptOut = res[STORAGE_ANALYTICS_OPT_OUT] === true;
        if (!hasHistory || explicitOptOut) {
          browser.storage.local.set({ [STORAGE_ANALYTICS_NOTICE_SEEN]: true });
          return;
        }
        analyticsNoticeEl.hidden = false;
      },
    );
  };

  if (analyticsNoticeDismissBtn && analyticsNoticeEl) {
    analyticsNoticeDismissBtn.addEventListener("click", () => {
      analyticsNoticeEl.hidden = true;
      if (browser?.storage?.local) {
        browser.storage.local.set({ [STORAGE_ANALYTICS_NOTICE_SEEN]: true });
      }
    });
  }

  maybeShowAnalyticsNotice();

  // ── External link tracking (GitHub / Chai4me) ────────────────────

  settingsLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href") || "";
      let target = null;
      if (href.includes("github.com")) target = "github";
      else if (href.includes("chai4.me")) target = "chai4me";
      if (target) trackEvent(EVENTS.EXTERNAL_LINK_CLICKED, { target });
    });
  });

  // ── Init ──────────────────────────────────────────────────────────

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
  if (browser?.storage?.onChanged) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.theme) {
        renderSettingsThemeMenu(changes.theme.newValue || "system");
      }
    });
  }

  initRatingUi();
})();
