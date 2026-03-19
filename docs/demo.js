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
    const now2 = Date.now();
    const diffMs = epochMs - now2;
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

  // src/demo/main.js
  var demoTabs = document.querySelectorAll(".demo-tab");
  var demoPanels = document.querySelectorAll(".demo-panel");
  var historyListEl = document.getElementById("demo-history-list");
  var historyCountEl = document.getElementById("demo-history-count");
  var clearHistoryEl = document.getElementById("demo-clear-history");
  var epochSubmitBtn = document.getElementById("demo-epoch-submit");
  var dateSubmitBtn = document.getElementById("demo-date-submit");
  var relativeSubmitBtn = document.getElementById("demo-relative-submit");
  var epochErrorEl = document.getElementById("demo-epoch-error");
  var dateErrorEl = document.getElementById("demo-date-error");
  var relativeErrorEl = document.getElementById("demo-relative-error");
  var copyEpochBtn = document.getElementById("demo-copy-epoch-btn");
  var setDemoTab = (tab) => {
    demoTabs.forEach(
      (btn) => btn.classList.toggle("is-active", btn.dataset.tab === tab)
    );
    demoPanels.forEach(
      (panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab)
    );
  };
  demoTabs.forEach((btn) => {
    btn.addEventListener("click", () => setDemoTab(btn.dataset.tab));
  });
  var HISTORY_KEY = "epochBuddyDemoHistory";
  var loadHistory = () => {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  };
  var saveHistory = (entry) => {
    const history = loadHistory();
    const next = [entry, ...history].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    renderHistory(next);
  };
  var clearDemoHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory([]);
  };
  var renderHistory = (history) => {
    historyListEl.replaceChildren ? historyListEl.replaceChildren() : historyListEl.innerText = "";
    historyCountEl.textContent = history.length ? `${history.length} items` : "";
    if (history.length === 0) {
      const empty = document.createElement("li");
      empty.className = "history-item";
      empty.textContent = "No conversions yet.";
      historyListEl.appendChild(empty);
      return;
    }
    history.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "history-item";
      const topRow = document.createElement("div");
      topRow.className = "history-top";
      const topText = entry.display || entry.input || String(entry.epochMs);
      const epochSpan = document.createElement("strong");
      epochSpan.className = "history-epoch";
      epochSpan.textContent = topText;
      const timeWrapper = document.createElement("div");
      timeWrapper.className = "history-time";
      const timeText = document.createElement("span");
      timeText.textContent = entry.convertedAt;
      const topCopy = createCopyButton(topText);
      timeWrapper.appendChild(timeText);
      timeWrapper.appendChild(topCopy);
      topRow.appendChild(epochSpan);
      topRow.appendChild(timeWrapper);
      item.appendChild(topRow);
      const conversion = buildConversionData(entry.epochMs);
      const linesGrid = document.createElement("div");
      linesGrid.className = "history-lines";
      const addLine = (label, value, copyValue) => {
        const labelEl = document.createElement("span");
        labelEl.className = "history-label";
        labelEl.textContent = label;
        linesGrid.appendChild(labelEl);
        const colonEl = document.createElement("span");
        colonEl.className = "history-colon";
        colonEl.textContent = ":";
        linesGrid.appendChild(colonEl);
        const valueEl = document.createElement("span");
        valueEl.className = "history-value";
        valueEl.textContent = value;
        linesGrid.appendChild(valueEl);
        if (copyValue) {
          linesGrid.appendChild(createCopyButton(copyValue));
        } else {
          linesGrid.appendChild(document.createElement("span"));
        }
      };
      addLine("Epoch (s)", conversion.epochS, conversion.epochS);
      addLine("Epoch (ms)", String(entry.epochMs), String(entry.epochMs));
      addLine("UTC", conversion.utc, conversion.utc);
      addLine(
        `Local (${conversion.tzLabel})`,
        conversion.localTimestamp,
        conversion.localTimestamp
      );
      item.appendChild(linesGrid);
      historyListEl.appendChild(item);
    });
  };
  clearHistoryEl.addEventListener("click", clearDemoHistory);
  var appendOutputRow = (target, label, value, copyValue, hrTop = false) => {
    if (hrTop) {
      const sep = document.createElement("div");
      sep.className = "demo-separator";
      target.appendChild(sep);
    }
    const labelEl = document.createElement("strong");
    labelEl.textContent = label;
    target.appendChild(labelEl);
    const colonEl = document.createElement("span");
    colonEl.className = "demo-colon";
    colonEl.textContent = ":";
    target.appendChild(colonEl);
    const valueEl = document.createElement("span");
    valueEl.textContent = value;
    target.appendChild(valueEl);
    if (copyValue) {
      target.appendChild(createCopyButton(copyValue));
    } else {
      target.appendChild(document.createElement("span"));
    }
  };
  var syncHasValue = (input) => {
    input.classList.toggle("has-value", input.value !== "");
  };
  var clearFieldErrors = (container) => {
    container.querySelectorAll(".field-error").forEach((el) => {
      el.classList.remove("field-error");
    });
  };
  var setFieldError = (input) => {
    const wrapper = input.closest(".floating-field");
    if (wrapper) wrapper.classList.add("field-error");
  };
  var clearFieldError = (input) => {
    const wrapper = input.closest(".floating-field");
    if (wrapper) wrapper.classList.remove("field-error");
  };
  var epochInput = document.getElementById("demo-epoch-input");
  var epochOutput = document.getElementById("demo-epoch-output");
  var epochAutoRefreshActive = true;
  var renderEpochOutput = (epochMs) => {
    const date = new Date(epochMs);
    const utc = formatUtcTimestamp(date);
    const local = formatLocalTimestamp(date);
    const tz = formatTimeZoneOffset(date, true);
    epochOutput.replaceChildren ? epochOutput.replaceChildren() : epochOutput.textContent = "";
    appendOutputRow(
      epochOutput,
      "Epoch (s)",
      Math.floor(epochMs / 1e3),
      String(Math.floor(epochMs / 1e3))
    );
    appendOutputRow(epochOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(epochOutput, "UTC", utc, utc);
    appendOutputRow(epochOutput, `Local (${tz})`, local, local);
    appendOutputRow(
      epochOutput,
      "Relative",
      formatRelative(epochMs),
      void 0,
      true
    );
  };
  var updateEpochInput = () => {
    if (!epochAutoRefreshActive || document.activeElement === epochInput) return;
    epochInput.value = String(Math.floor(Date.now() / 1e3) * 1e3);
  };
  epochInput.addEventListener("focus", () => {
    epochAutoRefreshActive = false;
  });
  epochInput.addEventListener("input", () => {
    epochAutoRefreshActive = false;
    const epochMs = parseEpoch(epochInput.value);
    epochErrorEl.textContent = epochMs ? "" : "Enter 10 or 13 digit epoch value (commas and underscores are allowed).";
  });
  epochInput.addEventListener("blur", () => {
    if (epochInput.value.trim() === "") {
      epochAutoRefreshActive = true;
      updateEpochInput();
    }
  });
  setInterval(updateEpochInput, 1e3);
  bindLiveCopyButton(copyEpochBtn, () => String(Date.now()), {
    onCopy: (val) => {
      epochInput.value = val;
      epochAutoRefreshActive = false;
    }
  });
  var dateTz = document.getElementById("demo-date-tz");
  var dateFields = [
    "demo-year",
    "demo-month",
    "demo-day",
    "demo-hour",
    "demo-minute",
    "demo-second",
    "demo-ms"
  ].map((id) => document.getElementById(id));
  var dateOutput = document.getElementById("demo-date-output");
  var dateManualGroup = document.querySelector(".demo-date-manual-group");
  var isoInputGroup = document.querySelector(".demo-iso-input-group");
  var isoInputEl = document.getElementById("demo-iso-input");
  var isoTzSelectEl = document.getElementById("demo-iso-tz-select");
  var isoToggleBtn = document.getElementById("demo-iso-toggle-btn");
  var dateIsoMode = false;
  isoToggleBtn.addEventListener("click", () => {
    dateIsoMode = !dateIsoMode;
    isoToggleBtn.classList.toggle("is-active", dateIsoMode);
    isoToggleBtn.textContent = dateIsoMode ? "Enter Date Manually" : "Convert ISO String";
    dateManualGroup.hidden = dateIsoMode;
    isoInputGroup.hidden = !dateIsoMode;
    if (dateIsoMode) {
      isoInputEl.value = (/* @__PURE__ */ new Date()).toISOString();
    }
    dateErrorEl.textContent = "";
    clearFieldErrors(document.querySelector('[data-panel="demo-date"]'));
  });
  isoInputEl.addEventListener("blur", () => {
    const val = isoInputEl.value.trim();
    if (!val) return;
    const result = parseIsoString(val, isoTzSelectEl.value);
    if (result.error) {
      setFieldError(isoInputEl);
      dateErrorEl.textContent = result.error;
    } else {
      clearFieldError(isoInputEl);
      dateErrorEl.textContent = "";
    }
  });
  isoInputEl.addEventListener("input", () => {
    clearFieldError(isoInputEl);
    dateErrorEl.textContent = "";
  });
  var dateFieldEls = dateFields.slice(0, 3);
  var timeFieldEls = dateFields.slice(3);
  var dateFieldLabels = ["Year", "Month", "Day"];
  dateFieldEls.forEach((input, i) => {
    input.addEventListener("blur", () => {
      syncHasValue(input);
      if (input.value.trim() === "") {
        setFieldError(input);
        dateErrorEl.textContent = `${dateFieldLabels[i]} is required.`;
      } else {
        clearFieldError(input);
      }
    });
    input.addEventListener("input", () => {
      clearFieldError(input);
      dateErrorEl.textContent = "";
    });
  });
  timeFieldEls.forEach((input) => {
    input.addEventListener("blur", () => {
      if (input.value.trim() === "" || Number.isNaN(Number(input.value))) {
        input.value = 0;
      }
      syncHasValue(input);
    });
  });
  dateFields.forEach((input) => {
    input.addEventListener("input", () => syncHasValue(input));
    input.addEventListener("blur", () => syncHasValue(input));
  });
  var presetChips = document.querySelectorAll(".preset-chip");
  var setActivePreset = (preset) => {
    presetChips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.preset === preset);
    });
  };
  var applyTimePreset = (preset) => {
    const useUtc = dateTz.value === "utc";
    if (preset === "sod") {
      timeFieldEls.forEach((f) => f.value = 0);
    } else if (preset === "eod") {
      timeFieldEls[0].value = 23;
      timeFieldEls[1].value = 59;
      timeFieldEls[2].value = 59;
      timeFieldEls[3].value = 999;
    } else if (preset === "now") {
      const now2 = /* @__PURE__ */ new Date();
      timeFieldEls[0].value = useUtc ? now2.getUTCHours() : now2.getHours();
      timeFieldEls[1].value = useUtc ? now2.getUTCMinutes() : now2.getMinutes();
      timeFieldEls[2].value = useUtc ? now2.getUTCSeconds() : now2.getSeconds();
      timeFieldEls[3].value = useUtc ? now2.getUTCMilliseconds() : now2.getMilliseconds();
    }
    timeFieldEls.forEach(syncHasValue);
    setActivePreset(preset);
  };
  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      applyTimePreset(chip.dataset.preset);
    });
  });
  timeFieldEls.forEach((input) => {
    input.addEventListener("input", () => {
      setActivePreset(null);
    });
  });
  var renderDateOutput = () => {
    const [year, month, day, hour, minute, second, ms] = dateFields.map(
      (el) => Number(el.value || 0)
    );
    const epochMs = dateTz.value === "utc" ? Date.UTC(year, month - 1, day, hour, minute, second, ms) : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
    if (Number.isNaN(epochMs)) {
      dateErrorEl.textContent = "Enter a valid date/time.";
      return;
    }
    dateErrorEl.textContent = "";
    const date = new Date(epochMs);
    const utc = formatUtcTimestamp(date);
    const local = formatLocalTimestamp(date);
    const tz = formatTimeZoneOffset(date, true);
    dateOutput.replaceChildren ? dateOutput.replaceChildren() : dateOutput.textContent = "";
    appendOutputRow(
      dateOutput,
      "Epoch (s)",
      Math.floor(epochMs / 1e3),
      String(Math.floor(epochMs / 1e3))
    );
    appendOutputRow(dateOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(dateOutput, "UTC", utc, utc);
    appendOutputRow(dateOutput, `Local (${tz})`, local, local);
    appendOutputRow(
      dateOutput,
      "Relative",
      formatRelative(epochMs),
      void 0,
      true
    );
  };
  dateFields.forEach(
    (field) => field.addEventListener("input", () => {
      dateErrorEl.textContent = "";
    })
  );
  dateTz.addEventListener("change", () => {
    dateErrorEl.textContent = "";
  });
  var relDir = document.getElementById("demo-rel-dir");
  var relFields = [
    "demo-rel-days",
    "demo-rel-hours",
    "demo-rel-minutes",
    "demo-rel-seconds",
    "demo-rel-ms"
  ].map((id) => document.getElementById(id));
  var relativeOutput = document.getElementById("demo-relative-output");
  relFields.forEach((input) => {
    input.addEventListener("input", () => syncHasValue(input));
    input.addEventListener("blur", () => {
      if (input.value.trim() === "" || Number.isNaN(Number(input.value))) {
        input.value = 0;
      }
      syncHasValue(input);
    });
  });
  var normalizeRelativeInputs = () => {
    const d = Number(relFields[0].value) || 0;
    const h = Number(relFields[1].value) || 0;
    const m = Number(relFields[2].value) || 0;
    const s = Number(relFields[3].value) || 0;
    const ms = Number(relFields[4].value) || 0;
    if (h > 23 || m > 59 || s > 59 || ms > 999) {
      const n = normalizeRelativeFields(d, h, m, s, ms);
      relFields[0].value = n.days;
      relFields[1].value = n.hours;
      relFields[2].value = n.minutes;
      relFields[3].value = n.seconds;
      relFields[4].value = n.ms;
      relFields.forEach(syncHasValue);
    }
  };
  relFields.forEach((input) => {
    input.addEventListener("blur", normalizeRelativeInputs);
  });
  var renderRelativeOutput = () => {
    const [days, hours, minutes, seconds, ms] = relFields.map(
      (el) => Number(el.value || 0)
    );
    const delta = (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1e3 + ms;
    const epochMs = Date.now() + (relDir.value === "ago" ? -1 : 1) * delta;
    const relativeLabel = formatRelativeParts(
      { days, hours, minutes, seconds, ms },
      relDir.value === "ago" ? "ago" : "from now"
    );
    const date = new Date(epochMs);
    const utc = formatUtcTimestamp(date);
    const local = formatLocalTimestamp(date);
    const tz = formatTimeZoneOffset(date, true);
    relativeOutput.replaceChildren ? relativeOutput.replaceChildren() : relativeOutput.textContent = "";
    appendOutputRow(
      relativeOutput,
      "Epoch (s)",
      Math.floor(epochMs / 1e3),
      String(Math.floor(epochMs / 1e3))
    );
    appendOutputRow(relativeOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(relativeOutput, "UTC", utc, utc);
    appendOutputRow(relativeOutput, `Local (${tz})`, local, local);
    appendOutputRow(relativeOutput, "Relative", relativeLabel, void 0, true);
    return { epochMs, relativeLabel, date };
  };
  relFields.forEach(
    (field) => field.addEventListener("input", () => {
      relativeErrorEl.textContent = "";
    })
  );
  relDir.addEventListener("change", () => {
    relativeErrorEl.textContent = "";
  });
  epochSubmitBtn.addEventListener("click", () => {
    const epochMs = parseEpoch(epochInput.value);
    if (!epochMs) {
      epochErrorEl.textContent = "Enter 10 or 13 digit epoch value (commas and underscores are allowed).";
      return;
    }
    epochErrorEl.textContent = "";
    renderEpochOutput(epochMs);
    saveHistory({
      source: "epoch",
      input: epochInput.value.trim(),
      epochMs,
      convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  });
  dateSubmitBtn.addEventListener("click", () => {
    clearFieldErrors(document.querySelector('[data-panel="demo-date"]'));
    if (dateIsoMode) {
      const result = parseIsoString(isoInputEl.value, isoTzSelectEl.value);
      if (result.error) {
        dateErrorEl.textContent = result.error;
        return;
      }
      const epochMs2 = result.value;
      const date = new Date(epochMs2);
      const utc = formatUtcTimestamp(date);
      const local = formatLocalTimestamp(date);
      const tz = formatTimeZoneOffset(date, true);
      dateOutput.replaceChildren ? dateOutput.replaceChildren() : dateOutput.textContent = "";
      appendOutputRow(
        dateOutput,
        "Epoch (s)",
        Math.floor(epochMs2 / 1e3),
        String(Math.floor(epochMs2 / 1e3))
      );
      appendOutputRow(dateOutput, "Epoch (ms)", epochMs2, String(epochMs2));
      appendOutputRow(dateOutput, "UTC", utc, utc);
      appendOutputRow(dateOutput, `Local (${tz})`, local, local);
      appendOutputRow(
        dateOutput,
        "Relative",
        formatRelative(epochMs2),
        void 0,
        true
      );
      dateErrorEl.textContent = "";
      saveHistory({
        source: "iso",
        input: isoInputEl.value.trim(),
        epochMs: epochMs2,
        convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
      });
      return;
    }
    const yearResult = parseDateField(dateFields[0].value, "Year", 1);
    if (yearResult.error) {
      setFieldError(dateFields[0]);
      dateErrorEl.textContent = yearResult.error;
      return;
    }
    const monthResult = parseDateField(dateFields[1].value, "Month", 1, 12);
    if (monthResult.error) {
      setFieldError(dateFields[1]);
      dateErrorEl.textContent = monthResult.error;
      return;
    }
    const dayResult = parseDateField(dateFields[2].value, "Day", 1, 31);
    if (dayResult.error) {
      setFieldError(dateFields[2]);
      dateErrorEl.textContent = dayResult.error;
      return;
    }
    renderDateOutput();
    const [year, month, day, hour, minute, second, ms] = dateFields.map(
      (el) => Number(el.value || 0)
    );
    const useUtc = dateTz.value === "utc";
    const epochMs = useUtc ? Date.UTC(year, month - 1, day, hour, minute, second, ms) : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
    if (Number.isNaN(epochMs)) return;
    saveHistory({
      source: "date",
      input: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(
        minute
      )}:${pad2(second)}.${pad3(ms)} ${useUtc ? "UTC" : "Local"}`,
      epochMs,
      convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  });
  relativeSubmitBtn.addEventListener("click", () => {
    relativeErrorEl.textContent = "";
    const [days, hours, minutes, seconds, ms] = relFields.map(
      (el) => Number(el.value || 0)
    );
    if ([days, hours, minutes, seconds, ms].some((value) => Number.isNaN(value))) {
      relativeErrorEl.textContent = "Enter valid numeric values.";
      return;
    }
    const result = renderRelativeOutput();
    if (!result) return;
    saveHistory({
      source: "relative",
      display: result.relativeLabel,
      epochMs: result.epochMs,
      convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  });
  var now = /* @__PURE__ */ new Date();
  epochInput.value = String(Math.floor(Date.now() / 1e3) * 1e3);
  renderEpochOutput(Number(epochInput.value));
  var useUtcInit = dateTz.value === "utc";
  dateFields[0].value = useUtcInit ? now.getUTCFullYear() : now.getFullYear();
  dateFields[1].value = (useUtcInit ? now.getUTCMonth() : now.getMonth()) + 1;
  dateFields[2].value = useUtcInit ? now.getUTCDate() : now.getDate();
  applyTimePreset("now");
  renderDateOutput();
  relFields.forEach((field) => {
    field.value = 0;
  });
  renderRelativeOutput();
  [...dateFields, ...relFields].forEach(syncHasValue);
  renderHistory(loadHistory());
})();
