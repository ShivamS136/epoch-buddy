/**
 * Demo page entry point (GitHub Pages).
 *
 * Mirrors the extension's conversion flows using localStorage for history
 * instead of chrome.storage.
 */

import {
  pad2,
  pad3,
  buildConversionData,
  formatUtcTimestamp,
  formatLocalTimestamp,
  formatTimeZoneOffset,
  formatRelative,
  formatRelativeParts,
} from "../shared/formatting.js";
import {
  parseEpoch,
  parseDateField,
  parseDateInput,
  parseTimePart,
  parseIsoString,
  normalizeRelativeFields,
} from "../shared/parsing.js";
import { createCopyButton, bindLiveCopyButton } from "../shared/clipboard.js";

// ── DOM references ────────────────────────────────────────────────

const demoTabs = document.querySelectorAll(".demo-tab");
const demoPanels = document.querySelectorAll(".demo-panel");
const historyListEl = document.getElementById("demo-history-list");
const historyCountEl = document.getElementById("demo-history-count");
const clearHistoryEl = document.getElementById("demo-clear-history");
const epochSubmitBtn = document.getElementById("demo-epoch-submit");
const dateSubmitBtn = document.getElementById("demo-date-submit");
const relativeSubmitBtn = document.getElementById("demo-relative-submit");
const epochErrorEl = document.getElementById("demo-epoch-error");
const dateErrorEl = document.getElementById("demo-date-error");
const relativeErrorEl = document.getElementById("demo-relative-error");
const copyEpochBtn = document.getElementById("demo-copy-epoch-btn");

// ── Tabs ──────────────────────────────────────────────────────────

const setDemoTab = (tab) => {
  demoTabs.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.tab === tab),
  );
  demoPanels.forEach((panel) =>
    panel.classList.toggle("is-active", panel.dataset.panel === tab),
  );
};

demoTabs.forEach((btn) => {
  btn.addEventListener("click", () => setDemoTab(btn.dataset.tab));
});

// ── History (localStorage) ──────────────────────────────────────

const HISTORY_KEY = "epochBuddyDemoHistory";

const loadHistory = () => {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveHistory = (entry) => {
  const history = loadHistory();
  const next = [entry, ...history].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  renderHistory(next);
};

const clearDemoHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory([]);
};

const renderHistory = (history) => {
  historyListEl.replaceChildren
    ? historyListEl.replaceChildren()
    : (historyListEl.innerText = "");
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
      conversion.localTimestamp,
    );

    item.appendChild(linesGrid);
    historyListEl.appendChild(item);
  });
};

clearHistoryEl.addEventListener("click", clearDemoHistory);

// ── Output helpers ──────────────────────────────────────────────

const appendOutputRow = (target, label, value, copyValue, hrTop = false) => {
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

// ── Floating label helper for number inputs ──────────────────────

const syncHasValue = (input) => {
  input.classList.toggle("has-value", input.value !== "");
};

// ── Field error helpers ──────────────────────────────────────────

const clearFieldErrors = (container) => {
  container.querySelectorAll(".field-error").forEach((el) => {
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

// ── Epoch → Date ────────────────────────────────────────────────

const epochInput = document.getElementById("demo-epoch-input");
const epochOutput = document.getElementById("demo-epoch-output");
let epochAutoRefreshActive = true;

const renderEpochOutput = (epochMs) => {
  const date = new Date(epochMs);
  const utc = formatUtcTimestamp(date);
  const local = formatLocalTimestamp(date);
  const tz = formatTimeZoneOffset(date, true);
  epochOutput.replaceChildren
    ? epochOutput.replaceChildren()
    : (epochOutput.textContent = "");
  appendOutputRow(
    epochOutput,
    "Epoch (s)",
    Math.floor(epochMs / 1000),
    String(Math.floor(epochMs / 1000)),
  );
  appendOutputRow(epochOutput, "Epoch (ms)", epochMs, String(epochMs));
  appendOutputRow(epochOutput, "UTC", utc, utc);
  appendOutputRow(epochOutput, `Local (${tz})`, local, local);
  appendOutputRow(
    epochOutput,
    "Relative",
    formatRelative(epochMs),
    undefined,
    true,
  );
};

const updateEpochInput = () => {
  if (!epochAutoRefreshActive || document.activeElement === epochInput) return;
  epochInput.value = String(Math.floor(Date.now() / 1000) * 1000);
};

epochInput.addEventListener("focus", () => {
  epochAutoRefreshActive = false;
});
epochInput.addEventListener("input", () => {
  epochAutoRefreshActive = false;
  const epochMs = parseEpoch(epochInput.value);
  epochErrorEl.textContent = epochMs
    ? ""
    : "Enter 10 or 13 digit epoch value (commas and underscores are allowed).";
});
epochInput.addEventListener("blur", () => {
  if (epochInput.value.trim() === "") {
    epochAutoRefreshActive = true;
    updateEpochInput();
  }
});

setInterval(updateEpochInput, 1000);

// ── Copy epoch button ────────────────────────────────────────────

bindLiveCopyButton(copyEpochBtn, () => String(Date.now()), {
  onCopy: (val) => {
    epochInput.value = val;
    epochAutoRefreshActive = false;
  },
});

// ── Date → Epoch ────────────────────────────────────────────────

const dateTz = document.getElementById("demo-date-tz");
const dateFields = [
  "demo-year",
  "demo-month",
  "demo-day",
  "demo-hour",
  "demo-minute",
  "demo-second",
  "demo-ms",
].map((id) => document.getElementById(id));
const dateOutput = document.getElementById("demo-date-output");

const dateManualGroup = document.querySelector(".demo-date-manual-group");
const isoInputGroup = document.querySelector(".demo-iso-input-group");
const isoInputEl = document.getElementById("demo-iso-input");
const isoTzSelectEl = document.getElementById("demo-iso-tz-select");
const isoToggleBtn = document.getElementById("demo-iso-toggle-btn");
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

const dateFieldEls = dateFields.slice(0, 3);
const timeFieldEls = dateFields.slice(3);
const dateFieldLabels = ["Year", "Month", "Day"];

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

// ── Time presets ──────────────────────────────────────────────────

const presetChips = document.querySelectorAll(".preset-chip");

const setActivePreset = (preset) => {
  presetChips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.preset === preset);
  });
};

const applyTimePreset = (preset) => {
  const useUtc = dateTz.value === "utc";
  if (preset === "sod") {
    timeFieldEls.forEach((f) => (f.value = 0));
  } else if (preset === "eod") {
    timeFieldEls[0].value = 23;
    timeFieldEls[1].value = 59;
    timeFieldEls[2].value = 59;
    timeFieldEls[3].value = 999;
  } else if (preset === "now") {
    const now = new Date();
    timeFieldEls[0].value = useUtc ? now.getUTCHours() : now.getHours();
    timeFieldEls[1].value = useUtc ? now.getUTCMinutes() : now.getMinutes();
    timeFieldEls[2].value = useUtc ? now.getUTCSeconds() : now.getSeconds();
    timeFieldEls[3].value = useUtc
      ? now.getUTCMilliseconds()
      : now.getMilliseconds();
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

const renderDateOutput = () => {
  const [year, month, day, hour, minute, second, ms] = dateFields.map((el) =>
    Number(el.value || 0),
  );
  const epochMs =
    dateTz.value === "utc"
      ? Date.UTC(year, month - 1, day, hour, minute, second, ms)
      : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
  if (Number.isNaN(epochMs)) {
    dateErrorEl.textContent = "Enter a valid date/time.";
    return;
  }
  dateErrorEl.textContent = "";
  const date = new Date(epochMs);
  const utc = formatUtcTimestamp(date);
  const local = formatLocalTimestamp(date);
  const tz = formatTimeZoneOffset(date, true);
  dateOutput.replaceChildren
    ? dateOutput.replaceChildren()
    : (dateOutput.textContent = "");
  appendOutputRow(
    dateOutput,
    "Epoch (s)",
    Math.floor(epochMs / 1000),
    String(Math.floor(epochMs / 1000)),
  );
  appendOutputRow(dateOutput, "Epoch (ms)", epochMs, String(epochMs));
  appendOutputRow(dateOutput, "UTC", utc, utc);
  appendOutputRow(dateOutput, `Local (${tz})`, local, local);
  appendOutputRow(
    dateOutput,
    "Relative",
    formatRelative(epochMs),
    undefined,
    true,
  );
};

dateFields.forEach((field) =>
  field.addEventListener("input", () => {
    dateErrorEl.textContent = "";
  }),
);
dateTz.addEventListener("change", () => {
  dateErrorEl.textContent = "";
});

// ── Relative → Epoch ────────────────────────────────────────────

const relDir = document.getElementById("demo-rel-dir");
const relFields = [
  "demo-rel-days",
  "demo-rel-hours",
  "demo-rel-minutes",
  "demo-rel-seconds",
  "demo-rel-ms",
].map((id) => document.getElementById(id));
const relativeOutput = document.getElementById("demo-relative-output");

relFields.forEach((input) => {
  input.addEventListener("input", () => syncHasValue(input));
  input.addEventListener("blur", () => {
    if (input.value.trim() === "" || Number.isNaN(Number(input.value))) {
      input.value = 0;
    }
    syncHasValue(input);
  });
});

const normalizeRelativeInputs = () => {
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

const renderRelativeOutput = () => {
  const [days, hours, minutes, seconds, ms] = relFields.map((el) =>
    Number(el.value || 0),
  );
  const delta =
    (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000 + ms;
  const epochMs = Date.now() + (relDir.value === "ago" ? -1 : 1) * delta;
  const relativeLabel = formatRelativeParts(
    { days, hours, minutes, seconds, ms },
    relDir.value === "ago" ? "ago" : "from now",
  );
  const date = new Date(epochMs);
  const utc = formatUtcTimestamp(date);
  const local = formatLocalTimestamp(date);
  const tz = formatTimeZoneOffset(date, true);
  relativeOutput.replaceChildren
    ? relativeOutput.replaceChildren()
    : (relativeOutput.textContent = "");
  appendOutputRow(
    relativeOutput,
    "Epoch (s)",
    Math.floor(epochMs / 1000),
    String(Math.floor(epochMs / 1000)),
  );
  appendOutputRow(relativeOutput, "Epoch (ms)", epochMs, String(epochMs));
  appendOutputRow(relativeOutput, "UTC", utc, utc);
  appendOutputRow(relativeOutput, `Local (${tz})`, local, local);
  appendOutputRow(relativeOutput, "Relative", relativeLabel, undefined, true);
  return { epochMs, relativeLabel, date };
};

relFields.forEach((field) =>
  field.addEventListener("input", () => {
    relativeErrorEl.textContent = "";
  }),
);
relDir.addEventListener("change", () => {
  relativeErrorEl.textContent = "";
});

// ── Submit handlers ─────────────────────────────────────────────

epochSubmitBtn.addEventListener("click", () => {
  const epochMs = parseEpoch(epochInput.value);
  if (!epochMs) {
    epochErrorEl.textContent =
      "Enter 10 or 13 digit epoch value (commas and underscores are allowed).";
    return;
  }
  epochErrorEl.textContent = "";
  renderEpochOutput(epochMs);
  saveHistory({
    source: "epoch",
    input: epochInput.value.trim(),
    epochMs,
    convertedAt: new Date().toLocaleTimeString(),
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
    const epochMs = result.value;
    const date = new Date(epochMs);
    const utc = formatUtcTimestamp(date);
    const local = formatLocalTimestamp(date);
    const tz = formatTimeZoneOffset(date, true);
    dateOutput.replaceChildren
      ? dateOutput.replaceChildren()
      : (dateOutput.textContent = "");
    appendOutputRow(
      dateOutput,
      "Epoch (s)",
      Math.floor(epochMs / 1000),
      String(Math.floor(epochMs / 1000)),
    );
    appendOutputRow(dateOutput, "Epoch (ms)", epochMs, String(epochMs));
    appendOutputRow(dateOutput, "UTC", utc, utc);
    appendOutputRow(dateOutput, `Local (${tz})`, local, local);
    appendOutputRow(
      dateOutput,
      "Relative",
      formatRelative(epochMs),
      undefined,
      true,
    );
    dateErrorEl.textContent = "";
    saveHistory({
      source: "iso",
      input: isoInputEl.value.trim(),
      epochMs,
      convertedAt: new Date().toLocaleTimeString(),
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
  const [year, month, day, hour, minute, second, ms] = dateFields.map((el) =>
    Number(el.value || 0),
  );
  const useUtc = dateTz.value === "utc";
  const epochMs = useUtc
    ? Date.UTC(year, month - 1, day, hour, minute, second, ms)
    : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
  if (Number.isNaN(epochMs)) return;
  saveHistory({
    source: "date",
    input: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(
      minute,
    )}:${pad2(second)}.${pad3(ms)} ${useUtc ? "UTC" : "Local"}`,
    epochMs,
    convertedAt: new Date().toLocaleTimeString(),
  });
});

relativeSubmitBtn.addEventListener("click", () => {
  relativeErrorEl.textContent = "";
  const [days, hours, minutes, seconds, ms] = relFields.map((el) =>
    Number(el.value || 0),
  );
  if (
    [days, hours, minutes, seconds, ms].some((value) => Number.isNaN(value))
  ) {
    relativeErrorEl.textContent = "Enter valid numeric values.";
    return;
  }
  const result = renderRelativeOutput();
  if (!result) return;
  saveHistory({
    source: "relative",
    display: result.relativeLabel,
    epochMs: result.epochMs,
    convertedAt: new Date().toLocaleTimeString(),
  });
});

// ── Init ────────────────────────────────────────────────────────

const now = new Date();
epochInput.value = String(Math.floor(Date.now() / 1000) * 1000);
renderEpochOutput(Number(epochInput.value));

const useUtcInit = dateTz.value === "utc";
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
