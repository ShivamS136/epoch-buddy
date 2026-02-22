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
  var formatGmtTimestamp = (date) => {
    const year = date.getUTCFullYear();
    const month = pad2(date.getUTCMonth() + 1);
    const day = pad2(date.getUTCDate());
    const hours = pad2(date.getUTCHours());
    const minutes = pad2(date.getUTCMinutes());
    const seconds = pad2(date.getUTCSeconds());
    const millis = pad3(date.getUTCMilliseconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
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
  var createCopyButton = (value, {
    className = "copy-btn",
    successClass = "copy-success",
    errorClass = "copy-error"
  } = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = "copy";
    const resetButton = () => {
      button.textContent = "copy";
      button.classList.remove(successClass, errorClass);
    };
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(String(value));
        button.textContent = "copied";
        button.classList.remove(errorClass);
        button.classList.add(successClass);
      } catch (_err) {
        button.textContent = "error";
        button.classList.remove(successClass);
        button.classList.add(errorClass);
      }
      window.setTimeout(resetButton, 1400);
    });
    return button;
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
    historyListEl.innerHTML = "";
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
      const addLine = (label, value, copyValue) => {
        const line = document.createElement("div");
        line.className = "history-line";
        const labelEl = document.createElement("span");
        labelEl.className = "history-label";
        labelEl.textContent = `${label}: `;
        const valueEl = document.createElement("span");
        valueEl.className = "history-value";
        valueEl.textContent = value;
        const historyLineContent = document.createElement("div");
        historyLineContent.appendChild(labelEl);
        historyLineContent.appendChild(valueEl);
        line.appendChild(historyLineContent);
        if (copyValue) {
          line.appendChild(createCopyButton(copyValue));
        }
        item.appendChild(line);
      };
      if (entry.source === "date") {
        addLine("Epoch (ms)", String(entry.epochMs), String(entry.epochMs));
        addLine(
          "Epoch (s)",
          String(Math.floor(entry.epochMs / 1e3)),
          String(Math.floor(entry.epochMs / 1e3))
        );
      } else {
        addLine("Epoch (ms)", String(entry.epochMs), String(entry.epochMs));
        addLine("GMT", entry.gmt, entry.gmt);
        addLine("Local", entry.local, entry.local);
      }
      historyListEl.appendChild(item);
    });
  };
  clearHistoryEl.addEventListener("click", clearDemoHistory);
  var appendOutputRow = (target, label, value, copyValue, hrTop = false) => {
    const row = document.createElement("div");
    row.innerHTML = `<div><strong>${label}:</strong> ${value}</div>`;
    if (copyValue) {
      row.appendChild(createCopyButton(copyValue));
    }
    if (hrTop) {
      row.classList.add("hr-top");
    }
    target.appendChild(row);
  };
  var epochInput = document.getElementById("demo-epoch-input");
  var epochOutput = document.getElementById("demo-epoch-output");
  var epochAutoRefreshActive = true;
  var renderEpochOutput = (epochMs) => {
    const date = new Date(epochMs);
    const gmt = formatGmtTimestamp(date);
    const local = formatLocalTimestamp(date);
    epochOutput.innerHTML = "";
    appendOutputRow(epochOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(epochOutput, "GMT", gmt, gmt);
    appendOutputRow(epochOutput, "Local", local, local);
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
  var presetChips = document.querySelectorAll(".preset-chip");
  var timeFields = dateFields.slice(3);
  var setActivePreset = (preset) => {
    presetChips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.preset === preset);
    });
  };
  var applyTimePreset = (preset) => {
    const useGmt = dateTz.value === "gmt";
    if (preset === "sod") {
      timeFields.forEach((f) => f.value = "00");
      timeFields[3].value = "000";
    } else if (preset === "eod") {
      timeFields[0].value = "23";
      timeFields[1].value = "59";
      timeFields[2].value = "59";
      timeFields[3].value = "999";
    } else if (preset === "now") {
      const now2 = /* @__PURE__ */ new Date();
      timeFields[0].value = pad2(useGmt ? now2.getUTCHours() : now2.getHours());
      timeFields[1].value = pad2(useGmt ? now2.getUTCMinutes() : now2.getMinutes());
      timeFields[2].value = pad2(useGmt ? now2.getUTCSeconds() : now2.getSeconds());
      timeFields[3].value = pad3(
        useGmt ? now2.getUTCMilliseconds() : now2.getMilliseconds()
      );
    }
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
  var renderDateOutput = () => {
    const [year, month, day, hour, minute, second, ms] = dateFields.map(
      (el) => Number(el.value || 0)
    );
    const epochMs = dateTz.value === "gmt" ? Date.UTC(year, month - 1, day, hour, minute, second, ms) : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
    if (Number.isNaN(epochMs)) {
      dateErrorEl.textContent = "Enter a valid date/time.";
      return;
    }
    dateErrorEl.textContent = "";
    dateOutput.innerHTML = "";
    appendOutputRow(dateOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(
      dateOutput,
      "Epoch (s)",
      Math.floor(epochMs / 1e3),
      String(Math.floor(epochMs / 1e3))
    );
    appendOutputRow(dateOutput, "Relative", formatRelative(epochMs));
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
    const gmt = formatGmtTimestamp(date);
    const local = formatLocalTimestamp(date);
    relativeOutput.innerHTML = "";
    appendOutputRow(relativeOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(relativeOutput, "GMT", gmt, gmt);
    appendOutputRow(relativeOutput, "Local", local, local);
    appendOutputRow(relativeOutput, "Relative", relativeLabel);
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
    const date = new Date(epochMs);
    saveHistory({
      source: "epoch",
      input: epochInput.value.trim(),
      epochMs,
      gmt: formatGmtTimestamp(date),
      local: formatLocalTimestamp(date),
      convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  });
  dateSubmitBtn.addEventListener("click", () => {
    renderDateOutput();
    const [year, month, day, hour, minute, second, ms] = dateFields.map(
      (el) => Number(el.value || 0)
    );
    const epochMs = dateTz.value === "gmt" ? Date.UTC(year, month - 1, day, hour, minute, second, ms) : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
    if (Number.isNaN(epochMs)) return;
    const date = new Date(epochMs);
    saveHistory({
      source: "date",
      input: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(
        minute
      )}:${pad2(second)}.${pad3(ms)} ${dateTz.value.toUpperCase()}`,
      epochMs,
      gmt: formatGmtTimestamp(date),
      local: formatLocalTimestamp(date),
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
      input: result.relativeLabel,
      epochMs: result.epochMs,
      gmt: formatGmtTimestamp(result.date),
      local: formatLocalTimestamp(result.date),
      convertedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString()
    });
  });
  var now = /* @__PURE__ */ new Date();
  epochInput.value = String(Math.floor(Date.now() / 1e3));
  renderEpochOutput(Number(epochInput.value) * 1e3);
  var useGmtInit = dateTz.value === "gmt";
  dateFields[0].value = String(
    useGmtInit ? now.getUTCFullYear() : now.getFullYear()
  );
  dateFields[1].value = pad2(
    (useGmtInit ? now.getUTCMonth() : now.getMonth()) + 1
  );
  dateFields[2].value = pad2(useGmtInit ? now.getUTCDate() : now.getDate());
  applyTimePreset("now");
  renderDateOutput();
  relFields.forEach((field) => {
    field.value = "0";
  });
  renderRelativeOutput();
  renderHistory(loadHistory());
})();
