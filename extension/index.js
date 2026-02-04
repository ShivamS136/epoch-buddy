(() => {
  const browser = globalThis.browser || globalThis.chrome;

  const EPOCH_SECONDS_REGEX = /^\d{10}$/;
  const EPOCH_MILLISECONDS_REGEX = /^\d{13}$/;

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

  const parseEpoch = (text) => {
    const trimmed = text.trim();
    if (EPOCH_SECONDS_REGEX.test(trimmed)) {
      return Number(trimmed) * 1000;
    }
    if (EPOCH_MILLISECONDS_REGEX.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  };

  const parseDateInput = (yearValue, monthValue, dayValue) => {
    if (!yearValue || !monthValue || !dayValue) {
      return null;
    }
    if (!/^\d+$/.test(yearValue + monthValue + dayValue)) {
      return null;
    }
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(year, month - 1, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return { year, month, day };
  };

  const parseTimePart = (value, max, label) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return { value: 0 };
    }
    if (!/^\d+$/.test(trimmed)) {
      return { error: `${label} must be numeric.` };
    }
    const number = Number(trimmed);
    if (number < 0 || number > max) {
      return { error: `${label} must be between 0 and ${max}.` };
    }
    return { value: number };
  };

  const formatDateParts = (date, useUtc) => {
    const monthIndex = useUtc ? date.getUTCMonth() : date.getMonth();
    const day = useUtc ? date.getUTCDate() : date.getDate();
    const year = useUtc ? date.getUTCFullYear() : date.getFullYear();
    const hours = useUtc ? date.getUTCHours() : date.getHours();
    const minutes = useUtc ? date.getUTCMinutes() : date.getMinutes();
    const seconds = useUtc ? date.getUTCSeconds() : date.getSeconds();
    const pad2 = (value) => String(value).padStart(2, "0");

    return {
      month: pad2(monthIndex + 1),
      day: pad2(day),
      year,
      hours: pad2(hours),
      minutes: pad2(minutes),
      seconds: pad2(seconds),
    };
  };

  const formatGmtTimestamp = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    const millis = String(date.getUTCMilliseconds()).padStart(3, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
  };

  const formatTimeZoneOffset = (date, padHours = true) => {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const hourText = padHours ? String(hours).padStart(2, "0") : String(hours);
    return `${sign}${hourText}:${String(minutes).padStart(2, "0")}`;
  };

  const formatLocalTimestamp = (date) => {
    const parts = formatDateParts(date, false);
    const millis = String(date.getMilliseconds()).padStart(3, "0");
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hours}:${parts.minutes}:${parts.seconds}.${millis}`;
  };

  const formatRelative = (epochMs) => {
    const now = Date.now();
    const diffMs = epochMs - now;
    const suffix = diffMs < 0 ? "ago" : "from now";
    let remaining = Math.abs(diffMs);

    const units = [
      { label: "y", ms: 365 * 24 * 60 * 60 * 1000 },
      { label: "M", ms: 30 * 24 * 60 * 60 * 1000 },
      { label: "d", ms: 24 * 60 * 60 * 1000 },
      { label: "h", ms: 60 * 60 * 1000 },
      { label: "mi", ms: 60 * 1000 },
      { label: "s", ms: 1000 },
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

  const formatRelativeParts = (parts, suffix) => {
    const units = [
      { label: "d", value: parts.days },
      { label: "h", value: parts.hours },
      { label: "m", value: parts.minutes },
      { label: "s", value: parts.seconds },
      { label: "ms", value: parts.ms },
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
  const buildConversionData = (epochMs) => {
    const date = new Date(epochMs);
    return {
      gmt: formatGmtTimestamp(date),
      local: `${formatLocalTimestamp(date)} (${formatTimeZoneOffset(
        date,
        true
      )})`,
      relative: formatRelative(epochMs),
    };
  };

  const stripTimezoneSuffix = (value) =>
    value.replace(/\s\([+-]\d{2}:\d{2}\)$/, "");

  const formatTimeOnly = (isoString) => {
    if (!isoString) {
      return "--:--:--";
    }
    const date = new Date(isoString);
    const pad2 = (value) => String(value).padStart(2, "0");
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
      date.getSeconds()
    )}`;
  };

  const createCopyButton = (value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";

    const resetButton = () => {
      button.textContent = "copy";
      button.classList.remove("copy-success", "copy-error");
    };

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "copied";
        button.classList.remove("copy-error");
        button.classList.add("copy-success");
      } catch (error) {
        button.textContent = "error";
        button.classList.remove("copy-success");
        button.classList.add("copy-error");
      }
      window.setTimeout(resetButton, 1400);
    });

    return button;
  };

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

  const appendResultRow = (targetEl, row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "result-row";
    if (row.isRelative) {
      rowEl.classList.add("relative");
    }

    const labelEl = document.createElement("strong");
    labelEl.className = "result-label";
    labelEl.textContent = `${row.label}:`;
    rowEl.appendChild(labelEl);

    const valueEl = document.createElement("span");
    valueEl.className = "result-value";
    valueEl.textContent = ` ${row.value}`;
    rowEl.appendChild(valueEl);

    if (row.copy) {
      const copyBtn = createCopyButton(row.copy);
      copyBtn.classList.add("result-copy");
      rowEl.appendChild(copyBtn);
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
        const rowLabel = document.createElement("span");
        rowLabel.className = "history-label";
        rowLabel.textContent = `${label}:`;
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
          String(entry.epochMs)
        );
        addHistoryLine(
          "Epoch (s)",
          String(Math.floor(entry.epochMs / 1000)),
          String(Math.floor(entry.epochMs / 1000))
        );
      } else if (entry.source === "relative") {
        addHistoryLine(
          "Epoch (ms)",
          String(entry.epochMs),
          String(entry.epochMs)
        );
        addHistoryLine("GMT", entry.gmt || "", entry.gmt || "");
        addHistoryLine(
          "Local",
          entry.local || "",
          stripTimezoneSuffix(entry.local || "")
        );
      } else {
        addHistoryLine("GMT", entry.gmt || "", entry.gmt || "");
        addHistoryLine(
          "Local",
          entry.local || "",
          stripTimezoneSuffix(entry.local || "")
        );
      }

      historyListEl.appendChild(item);
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

  let epochAutoRefreshActive = true;
  const updateEpochInput = () => {
    if (!epochAutoRefreshActive) {
      return;
    }
    if (document.activeElement === inputEl) {
      return;
    }
    inputEl.value = String(Math.floor(Date.now() / 1000));
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

  const populateDateTimeFields = (useGmt) => {
    const now = new Date();
    const year = useGmt ? now.getUTCFullYear() : now.getFullYear();
    const month = useGmt ? now.getUTCMonth() + 1 : now.getMonth() + 1;
    const day = useGmt ? now.getUTCDate() : now.getDate();
    const hour = useGmt ? now.getUTCHours() : now.getHours();
    const minute = useGmt ? now.getUTCMinutes() : now.getMinutes();
    const second = useGmt ? now.getUTCSeconds() : now.getSeconds();

    dateYearEl.value = String(year);
    dateMonthEl.value = String(month).padStart(2, "0");
    dateDayEl.value = String(day).padStart(2, "0");
    timeHourEl.value = String(hour).padStart(2, "0");
    timeMinuteEl.value = String(minute).padStart(2, "0");
    timeSecondEl.value = String(second).padStart(2, "0");
    timeMsEl.value = "000";
  };

  const populateRelativeDefaults = () => {
    relativeDaysEl.value = "0";
    relativeHoursEl.value = "0";
    relativeMinutesEl.value = "0";
    relativeSecondsEl.value = "0";
    relativeMsEl.value = "0";
  };

  // Keep user-entered values on timezone change.

  epochFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    errorEl.textContent = "";
    const inputValue = inputEl.value.trim();
    const epochMs = parseEpoch(inputValue);
    if (epochMs === null) {
      resultEl.hidden = true;
      errorEl.textContent = "Enter a 10 or 13 digit epoch value.";
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
    const dateParts = parseDateInput(
      dateYearEl.value.trim(),
      dateMonthEl.value.trim(),
      dateDayEl.value.trim()
    );
    if (!dateParts) {
      dateResultEl.hidden = true;
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
          ms.value
        )
      : new Date(
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

    const pad2 = (value) => String(value).padStart(2, "0");
    const pad3 = (value) => String(value).padStart(3, "0");
    const dateLabel = `${dateParts.year}-${pad2(dateParts.month)}-${pad2(
      dateParts.day
    )} ${pad2(hour.value)}:${pad2(minute.value)}:${pad2(second.value)}.${pad3(
      ms.value
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

    const days = parseTimePart(relativeDaysEl.value, 365000, "Days");
    if (days.error) {
      relativeResultEl.hidden = true;
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
      isAgo ? "ago" : "from now"
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

  loadHistory();
  populateDateTimeFields(false);
  populateRelativeDefaults();
})();
