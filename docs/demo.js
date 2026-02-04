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

const setDemoTab = (tab) => {
  demoTabs.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.tab === tab)
  );
  demoPanels.forEach((panel) =>
    panel.classList.toggle("is-active", panel.dataset.panel === tab)
  );
};

demoTabs.forEach((btn) => {
  btn.addEventListener("click", () => setDemoTab(btn.dataset.tab));
});

const pad2 = (value) => String(value).padStart(2, "0");
const pad3 = (value) => String(value).padStart(3, "0");

const formatGmt = (date) =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(
    date.getUTCSeconds()
  )}.${pad3(date.getUTCMilliseconds())}`;

const formatLocal = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}.${pad3(date.getMilliseconds())}`;

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
  if (result.length === 0) result.push("0s");
  return `${result.join(" ")} ${suffix}`;
};

const formatRelative = (epochMs) => {
  const diff = epochMs - Date.now();
  const suffix = diff < 0 ? "ago" : "from now";
  const units = [
    { label: "d", ms: 86400000 },
    { label: "h", ms: 3600000 },
    { label: "m", ms: 60000 },
    { label: "s", ms: 1000 },
    { label: "ms", ms: 1 },
  ];
  let remaining = Math.abs(diff);
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
  if (parts.length === 0) parts.push("0s");
  return `${parts.join(" ")} ${suffix}`;
};

const parseEpoch = (value) => {
  const trimmed = value.trim();
  if (/^\d{10}$/.test(trimmed)) return Number(trimmed) * 1000;
  if (/^\d{13}$/.test(trimmed)) return Number(trimmed);
  return null;
};

const createCopyButton = (value, className = "result-copy") => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
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

const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory([]);
};

const renderHistory = (history) => {
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

    const topCopy = createCopyButton(topText, "copy-btn");

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
      labelEl.textContent = `${label}:`;
      const valueEl = document.createElement("span");
      valueEl.className = "history-value";
      valueEl.textContent = value;
      line.appendChild(labelEl);
      line.appendChild(valueEl);
      if (copyValue) {
        line.appendChild(createCopyButton(copyValue, "copy-btn"));
      }
      item.appendChild(line);
    };

    if (entry.source === "date") {
      addLine("Epoch (ms)", String(entry.epochMs), String(entry.epochMs));
      addLine(
        "Epoch (s)",
        String(Math.floor(entry.epochMs / 1000)),
        String(Math.floor(entry.epochMs / 1000))
      );
    } else if (entry.source === "relative") {
      addLine("Epoch (ms)", String(entry.epochMs), String(entry.epochMs));
      addLine("GMT", entry.gmt, entry.gmt);
      addLine("Local", entry.local, entry.local);
    } else {
      addLine("GMT", entry.gmt, entry.gmt);
      addLine("Local", entry.local, entry.local);
    }

    historyListEl.appendChild(item);
  });
};

clearHistoryEl.addEventListener("click", clearHistory);

const epochInput = document.getElementById("demo-epoch-input");
const epochOutput = document.getElementById("demo-epoch-output");
let epochAutoRefreshActive = true;

const appendOutputRow = (target, label, value, copyValue) => {
  const row = document.createElement("div");
  row.innerHTML = `${label}: <strong>${value}</strong>`;
  if (copyValue) row.appendChild(createCopyButton(copyValue));
  target.appendChild(row);
};

const renderEpochOutput = (epochMs) => {
  const date = new Date(epochMs);
  epochOutput.innerHTML = "";
  appendOutputRow(epochOutput, "Epoch (ms)", epochMs, String(epochMs));
  appendOutputRow(epochOutput, "GMT", formatGmt(date), formatGmt(date));
  appendOutputRow(epochOutput, "Local", formatLocal(date), formatLocal(date));
  appendOutputRow(epochOutput, "Relative", formatRelative(epochMs));
};

const updateEpochInput = () => {
  if (!epochAutoRefreshActive || document.activeElement === epochInput) return;
  epochInput.value = String(Math.floor(Date.now() / 1000));
};

epochInput.addEventListener("focus", () => {
  epochAutoRefreshActive = false;
});
epochInput.addEventListener("input", () => {
  epochAutoRefreshActive = false;
  const epochMs = parseEpoch(epochInput.value);
  epochErrorEl.textContent = epochMs ? "" : "Enter 10 or 13 digit epoch value.";
});
epochInput.addEventListener("blur", () => {
  if (epochInput.value.trim() === "") {
    epochAutoRefreshActive = true;
    updateEpochInput();
  }
});

setInterval(updateEpochInput, 1000);

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

const renderDateOutput = () => {
  const [year, month, day, hour, minute, second, ms] = dateFields.map((el) =>
    Number(el.value || 0)
  );
  const epochMs =
    dateTz.value === "gmt"
      ? Date.UTC(year, month - 1, day, hour, minute, second, ms)
      : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
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
    Math.floor(epochMs / 1000),
    String(Math.floor(epochMs / 1000))
  );
  appendOutputRow(dateOutput, "Relative", formatRelative(epochMs));
};

dateFields.forEach((field) =>
  field.addEventListener("input", () => {
    dateErrorEl.textContent = "";
  })
);
dateTz.addEventListener("change", () => {
  dateErrorEl.textContent = "";
});

const relDir = document.getElementById("demo-rel-dir");
const relFields = [
  "demo-rel-days",
  "demo-rel-hours",
  "demo-rel-minutes",
  "demo-rel-seconds",
  "demo-rel-ms",
].map((id) => document.getElementById(id));
const relativeOutput = document.getElementById("demo-relative-output");

const renderRelativeOutput = () => {
  const [days, hours, minutes, seconds, ms] = relFields.map((el) =>
    Number(el.value || 0)
  );
  const delta =
    (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000 + ms;
  const epochMs = Date.now() + (relDir.value === "ago" ? -1 : 1) * delta;
  const relativeLabel = formatRelativeParts(
    { days, hours, minutes, seconds, ms },
    relDir.value === "ago" ? "ago" : "from now"
  );
  const date = new Date(epochMs);
  relativeOutput.innerHTML = "";
  appendOutputRow(relativeOutput, "Epoch (ms)", epochMs, String(epochMs));
  appendOutputRow(relativeOutput, "GMT", formatGmt(date), formatGmt(date));
  appendOutputRow(
    relativeOutput,
    "Local",
    formatLocal(date),
    formatLocal(date)
  );
  appendOutputRow(relativeOutput, "Relative", relativeLabel);
  return { epochMs, relativeLabel, date };
};

relFields.forEach((field) =>
  field.addEventListener("input", () => {
    relativeErrorEl.textContent = "";
  })
);
relDir.addEventListener("change", () => {
  relativeErrorEl.textContent = "";
});

epochSubmitBtn.addEventListener("click", () => {
  const epochMs = parseEpoch(epochInput.value);
  if (!epochMs) {
    epochErrorEl.textContent = "Enter 10 or 13 digit epoch value.";
    return;
  }
  epochErrorEl.textContent = "";
  renderEpochOutput(epochMs);
  saveHistory({
    source: "epoch",
    input: epochInput.value.trim(),
    epochMs,
    gmt: formatGmt(new Date(epochMs)),
    local: formatLocal(new Date(epochMs)),
    convertedAt: new Date().toLocaleTimeString(),
  });
});

dateSubmitBtn.addEventListener("click", () => {
  renderDateOutput();
  const [year, month, day, hour, minute, second, ms] = dateFields.map((el) =>
    Number(el.value || 0)
  );
  const epochMs =
    dateTz.value === "gmt"
      ? Date.UTC(year, month - 1, day, hour, minute, second, ms)
      : new Date(year, month - 1, day, hour, minute, second, ms).getTime();
  if (Number.isNaN(epochMs)) return;
  saveHistory({
    source: "date",
    input: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(
      minute
    )}:${pad2(second)}.${pad3(ms)} ${dateTz.value.toUpperCase()}`,
    epochMs,
    gmt: formatGmt(new Date(epochMs)),
    local: formatLocal(new Date(epochMs)),
    convertedAt: new Date().toLocaleTimeString(),
  });
});

relativeSubmitBtn.addEventListener("click", () => {
  relativeErrorEl.textContent = "";
  const [days, hours, minutes, seconds, ms] = relFields.map((el) =>
    Number(el.value || 0)
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
    input: result.relativeLabel,
    epochMs: result.epochMs,
    gmt: formatGmt(result.date),
    local: formatLocal(result.date),
    convertedAt: new Date().toLocaleTimeString(),
  });
});

const now = new Date();
epochInput.value = String(Math.floor(Date.now() / 1000));
renderEpochOutput(Number(epochInput.value) * 1000);

const dateDefaults = [
  now.getFullYear(),
  now.getMonth() + 1,
  now.getDate(),
  now.getHours(),
  now.getMinutes(),
  now.getSeconds(),
  0,
];
dateFields.forEach((field, index) => {
  field.value = pad2(dateDefaults[index] || 0);
});
renderDateOutput();

relFields.forEach((field) => {
  field.value = "0";
});
renderRelativeOutput();

renderHistory(loadHistory());
