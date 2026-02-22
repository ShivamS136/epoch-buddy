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
  stripTimezoneSuffix,
  formatTimeOnly,
} from "../shared/formatting.js";
import { parseEpoch, parseDateInput, parseTimePart } from "../shared/parsing.js";
import { createCopyButton } from "../shared/clipboard.js";

(() => {
  const browser = globalThis.browser || globalThis.chrome;

  // ── DOM references ────────────────────────────────────────────────

  const epochFormEl = document.getElementById("epoch-to-date-form");
  const dateFormEl = document.getElementById("date-to-epoch-form");
  const relativeFormEl = document.getElementById("relative-form");
  const inputEl = document.getElementById("epoch-input");
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
    const rowEl = document.createElement("div");
    rowEl.className = "result-row";
    if (row.isRelative) {
      rowEl.classList.add("relative");
    }

    let afterLabelText = "";
    if (row.label === "GMT") {
      afterLabelText = "&nbsp;&nbsp;";
    } else if (row.label === "Epoch (s)") {
      afterLabelText = "&nbsp;";
    }

    const labelEl = document.createElement("strong");
    labelEl.className = "result-label";
    labelEl.innerHTML = `${row.label}${afterLabelText}: `;
    rowEl.appendChild(labelEl);

    const valueEl = document.createElement("span");
    valueEl.className = "result-value";
    valueEl.textContent = `${row.value}`;
    rowEl.appendChild(valueEl);

    if (row.copy) {
      rowEl.appendChild(createCopyButton(row.copy));
    }

    targetEl.appendChild(rowEl);
  };

  const renderEpochToDateResult = (epochMs, conversion) => {
    resultEl.innerHTML = "";
    const rows = [
      { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
      { label: "GMT", value: conversion.gmt, copy: conversion.gmt },
      {
        label: "Local",
        value: conversion.local,
        copy: stripTimezoneSuffix(conversion.local),
      },
      { label: "Relative", value: conversion.relative, isRelative: true },
    ];

    rows.forEach((row) => appendResultRow(resultEl, row));
    resultEl.hidden = false;
  };

  const renderDateToEpochResult = (epochMs, conversion) => {
    dateResultEl.innerHTML = "";
    const rows = [
      { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
      {
        label: "Epoch (s)",
        value: String(Math.floor(epochMs / 1000)),
        copy: String(Math.floor(epochMs / 1000)),
      },
      { label: "Relative", value: conversion.relative, isRelative: true },
    ];

    rows.forEach((row) => appendResultRow(dateResultEl, row));
    dateResultEl.hidden = false;
  };

  const renderRelativeResult = (epochMs, conversion, relativeLabel) => {
    relativeResultEl.innerHTML = "";
    const rows = [
      { label: "Epoch (ms)", value: String(epochMs), copy: String(epochMs) },
      { label: "GMT", value: conversion.gmt, copy: conversion.gmt },
      {
        label: "Local",
        value: conversion.local,
        copy: stripTimezoneSuffix(conversion.local),
      },
      { label: "Relative", value: relativeLabel, isRelative: true },
    ];

    rows.forEach((row) => appendResultRow(relativeResultEl, row));
    relativeResultEl.hidden = false;
  };

  // ── History rendering ─────────────────────────────────────────────

  const renderHistory = (history) => {
    historyListEl.innerHTML = "";
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

      const addHistoryLine = (label, value, copyValue) => {
        const row = document.createElement("div");
        row.className = "history-line";

        let afterLabelText = "";
        if (label === "GMT") {
          afterLabelText = "&nbsp;&nbsp;";
        } else if (label === "Epoch (s)") {
          afterLabelText = "&nbsp;";
        }

        const rowLabel = document.createElement("span");
        rowLabel.className = "history-label";
        rowLabel.innerHTML = `${label}${afterLabelText}: `;
        const rowValue = document.createElement("span");
        rowValue.className = "history-value";
        rowValue.textContent = value || "";
        row.appendChild(rowLabel);
        row.appendChild(rowValue);
        if (copyValue) {
          row.appendChild(createCopyButton(copyValue));
        }
        item.appendChild(row);
      };

      item.appendChild(topRow);

      if (entry.source === "date") {
        addHistoryLine(
          "Epoch (ms)",
          String(entry.epochMs),
          String(entry.epochMs),
        );
        addHistoryLine(
          "Epoch (s)",
          String(Math.floor(entry.epochMs / 1000)),
          String(Math.floor(entry.epochMs / 1000)),
        );
      } else {
        addHistoryLine(
          "Epoch (ms)",
          String(entry.epochMs),
          String(entry.epochMs),
        );
        addHistoryLine("GMT", entry.gmt || "", entry.gmt || "");
        addHistoryLine(
          "Local",
          entry.local || "",
          stripTimezoneSuffix(entry.local || ""),
        );
      }

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
  });

  // ── Numeric-only inputs ───────────────────────────────────────────

  [
    dateYearEl,
    dateMonthEl,
    dateDayEl,
    timeHourEl,
    timeMinuteEl,
    timeSecondEl,
    timeMsEl,
    relativeDaysEl,
    relativeHoursEl,
    relativeMinutesEl,
    relativeSecondsEl,
    relativeMsEl,
  ].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
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

  // ── Time presets ──────────────────────────────────────────────────

  const presetChips = document.querySelectorAll(".preset-chip");

  const setActivePreset = (preset) => {
    presetChips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.preset === preset);
    });
  };

  const applyTimePreset = (preset) => {
    const useGmt = timezoneSelectEl.value === "gmt";
    if (preset === "sod") {
      timeHourEl.value = "00";
      timeMinuteEl.value = "00";
      timeSecondEl.value = "00";
      timeMsEl.value = "000";
    } else if (preset === "eod") {
      timeHourEl.value = "23";
      timeMinuteEl.value = "59";
      timeSecondEl.value = "59";
      timeMsEl.value = "999";
    } else if (preset === "now") {
      const now = new Date();
      timeHourEl.value = pad2(useGmt ? now.getUTCHours() : now.getHours());
      timeMinuteEl.value = pad2(
        useGmt ? now.getUTCMinutes() : now.getMinutes(),
      );
      timeSecondEl.value = pad2(
        useGmt ? now.getUTCSeconds() : now.getSeconds(),
      );
      timeMsEl.value = pad3(
        useGmt ? now.getUTCMilliseconds() : now.getMilliseconds(),
      );
    }
    setActivePreset(preset);
  };

  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      applyTimePreset(chip.dataset.preset);
    });
  });

  [timeHourEl, timeMinuteEl, timeSecondEl, timeMsEl].forEach((input) => {
    input.addEventListener("input", () => {
      setActivePreset(null);
    });
  });

  // ── Populate defaults ─────────────────────────────────────────────

  const populateDateTimeFields = (useGmt) => {
    const now = new Date();
    const year = useGmt ? now.getUTCFullYear() : now.getFullYear();
    const month = useGmt ? now.getUTCMonth() + 1 : now.getMonth() + 1;
    const day = useGmt ? now.getUTCDate() : now.getDate();

    dateYearEl.value = String(year);
    dateMonthEl.value = pad2(month);
    dateDayEl.value = pad2(day);
    applyTimePreset("now");
  };

  const populateRelativeDefaults = () => {
    relativeDaysEl.value = "0";
    relativeHoursEl.value = "0";
    relativeMinutesEl.value = "0";
    relativeSecondsEl.value = "0";
    relativeMsEl.value = "0";
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
    saveHistory({
      source: "epoch",
      input: inputValue,
      epochMs,
      gmt: conversion.gmt,
      local: conversion.local,
      relative: conversion.relative,
      convertedAt: new Date().toISOString(),
    });
  });

  dateFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    dateErrorEl.textContent = "";
    dateErrorEl.hidden = true;
    const dateParts = parseDateInput(
      dateYearEl.value.trim(),
      dateMonthEl.value.trim(),
      dateDayEl.value.trim(),
    );
    if (!dateParts) {
      dateResultEl.hidden = true;
      dateErrorEl.hidden = false;
      dateErrorEl.textContent = "Enter a valid date (YYYY/MM/DD fields).";
      return;
    }

    const hour = parseTimePart(timeHourEl.value, 23, "Hour");
    if (hour.error) {
      dateResultEl.hidden = true;
      dateErrorEl.textContent = hour.error;
      return;
    }
    const minute = parseTimePart(timeMinuteEl.value, 59, "Minute");
    if (minute.error) {
      dateResultEl.hidden = true;
      dateErrorEl.textContent = minute.error;
      return;
    }
    const second = parseTimePart(timeSecondEl.value, 59, "Second");
    if (second.error) {
      dateResultEl.hidden = true;
      dateErrorEl.textContent = second.error;
      return;
    }
    const ms = parseTimePart(timeMsEl.value, 999, "Milliseconds");
    if (ms.error) {
      dateResultEl.hidden = true;
      dateErrorEl.textContent = ms.error;
      return;
    }
    const useGmt = timezoneSelectEl.value === "gmt";
    const epochMs = useGmt
      ? Date.UTC(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value,
        )
      : new Date(
          dateParts.year,
          dateParts.month - 1,
          dateParts.day,
          hour.value,
          minute.value,
          second.value,
          ms.value,
        ).getTime();

    const conversion = buildConversionData(epochMs);
    renderDateToEpochResult(epochMs, conversion);

    const dateLabel = `${dateParts.year}-${pad2(dateParts.month)}-${pad2(
      dateParts.day,
    )} ${pad2(hour.value)}:${pad2(minute.value)}:${pad2(second.value)}.${pad3(
      ms.value,
    )} ${useGmt ? "GMT" : "Local"}`;

    saveHistory({
      source: "date",
      input: dateLabel,
      epochMs,
      gmt: conversion.gmt,
      local: conversion.local,
      relative: conversion.relative,
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
      relativeErrorEl.textContent = hours.error;
      return;
    }
    const minutes = parseTimePart(relativeMinutesEl.value, 59, "Minutes");
    if (minutes.error) {
      relativeResultEl.hidden = true;
      relativeErrorEl.textContent = minutes.error;
      return;
    }
    const seconds = parseTimePart(relativeSecondsEl.value, 59, "Seconds");
    if (seconds.error) {
      relativeResultEl.hidden = true;
      relativeErrorEl.textContent = seconds.error;
      return;
    }
    const ms = parseTimePart(relativeMsEl.value, 999, "Milliseconds");
    if (ms.error) {
      relativeResultEl.hidden = true;
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
    saveHistory({
      source: "relative",
      display: relativeLabel,
      input: relativeLabel,
      epochMs,
      gmt: conversion.gmt,
      local: conversion.local,
      relative: conversion.relative,
      convertedAt: new Date().toISOString(),
    });
  });

  // ── Init ──────────────────────────────────────────────────────────

  loadHistory();
  populateDateTimeFields(false);
  populateRelativeDefaults();
})();
