(() => {
  const browser = globalThis.browser || globalThis.chrome;

  const POPUP_ID = "epoch-buddy-popup";
  const EPOCH_SECONDS_REGEX = /^\d{10}$/;
  const EPOCH_MILLISECONDS_REGEX = /^\d{13}$/;

  let popupEl = null;
  let lastSelectionText = "";

  const removePopup = () => {
    if (popupEl) {
      popupEl.remove();
      popupEl = null;
    }
  };

  const createPopup = () => {
    if (popupEl) {
      return popupEl;
    }

    const el = document.createElement("div");
    el.id = POPUP_ID;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    popupEl = el;
    return el;
  };

  const getSelectionRect = (selection) => {
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }

    return rect;
  };

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

  const saveHistory = (entry) => {
    if (!chrome?.storage?.local) {
      return;
    }

    browser.storage.local.get({ history: [] }, (result) => {
      const history = Array.isArray(result.history) ? result.history : [];
      const next = [entry, ...history].slice(0, 10);
      browser.storage.local.set({ history: next });
    });
  };

  const createCopyButton = (value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "epoch-buddy-copy";
    button.textContent = "copy";

    const resetButton = () => {
      button.textContent = "copy";
      button.classList.remove(
        "epoch-buddy-copy-success",
        "epoch-buddy-copy-error"
      );
    };

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = "copied";
        button.classList.remove("epoch-buddy-copy-error");
        button.classList.add("epoch-buddy-copy-success");
      } catch (error) {
        button.textContent = "error";
        button.classList.remove("epoch-buddy-copy-success");
        button.classList.add("epoch-buddy-copy-error");
      }
      window.setTimeout(resetButton, 1400);
    });

    return button;
  };

  const renderPopup = (rect, formatted) => {
    const el = createPopup();
    el.innerHTML = "";
    formatted.forEach((line) => {
      const row = document.createElement("div");
      row.className = "epoch-buddy-row";
      if (line.isRelative) {
        row.classList.add("epoch-buddy-relative");
      }

      const label = document.createElement("strong");
      label.className = "epoch-buddy-label";
      label.textContent = `${line.label}:`;
      row.appendChild(label);

      const value = document.createElement("span");
      value.className = "epoch-buddy-value";
      value.textContent = ` ${line.value}`;
      row.appendChild(value);

      if (!line.noCopy) {
        row.appendChild(
          createCopyButton(
            typeof line.copyValue === "string" ? line.copyValue : line.value
          )
        );
      }
      el.appendChild(row);
    });

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const top = rect.bottom + scrollY + 8;
    const left = rect.left + scrollX;

    el.style.top = `${Math.max(top, 8)}px`;
    el.style.left = `${Math.max(left, 8)}px`;
  };

  const getInputSelection = () => {
    const active = document.activeElement;
    if (
      !(active instanceof HTMLInputElement) &&
      !(active instanceof HTMLTextAreaElement)
    ) {
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
      rect: active.getBoundingClientRect(),
    };
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

  const formatLocalIso = (date) => {
    const parts = formatDateParts(date, false);
    const millis = String(date.getMilliseconds()).padStart(3, "0");
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hours}:${parts.minutes}:${parts.seconds}.${millis}`;
  };

  const buildConversionData = (epochMs) => {
    const date = new Date(epochMs);
    return {
      gmt: formatGmtTimestamp(date),
      local: `${formatLocalIso(date)} (${formatTimeZoneOffset(date, true)})`,
      relative: formatRelative(epochMs),
    };
  };

  const stripTimezoneSuffix = (value) =>
    value.replace(/\s\([+-]\d{2}:\d{2}\)$/, "");

  const formatRelative = (epochMs) => {
    const now = Date.now();
    const diffMs = epochMs - now;
    const suffix = diffMs < 0 ? "ago" : "from now";
    let remaining = Math.abs(diffMs);

    const units = [
      { label: "y", ms: 365 * 24 * 60 * 60 * 1000 },
      { label: "mo", ms: 30 * 24 * 60 * 60 * 1000 },
      { label: "d", ms: 24 * 60 * 60 * 1000 },
      { label: "h", ms: 60 * 60 * 1000 },
      { label: "m", ms: 60 * 1000 },
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
      parts.push("0S");
    }

    return `${parts.join(" ")} ${suffix}`;
  };

  const handleSelection = (event) => {
    if (
      event?.target instanceof Node &&
      popupEl &&
      popupEl.contains(event.target)
    ) {
      return;
    }
    const inputSelection = getInputSelection();
    const selection = inputSelection ? null : window.getSelection();
    if (!inputSelection && (!selection || selection.isCollapsed)) {
      lastSelectionText = "";
      removePopup();
      return;
    }

    const selectedText = inputSelection
      ? inputSelection.text
      : selection.toString();
    if (!selectedText || selectedText === lastSelectionText) {
      return;
    }

    lastSelectionText = selectedText;
    const epochMs = parseEpoch(selectedText);
    if (epochMs === null) {
      removePopup();
      return;
    }

    const rect = inputSelection
      ? inputSelection.rect
      : getSelectionRect(selection);
    if (!rect) {
      removePopup();
      return;
    }

    const conversion = buildConversionData(epochMs);
    const formatted = [
      {
        label: "Epoch",
        value: selectedText.trim(),
        copyValue: selectedText.trim(),
      },
      { label: "GMT", value: conversion.gmt, copyValue: conversion.gmt },
      {
        label: "Local",
        value: conversion.local,
        copyValue: stripTimezoneSuffix(conversion.local),
      },
      {
        label: "Relative",
        value: conversion.relative,
        isRelative: true,
        noCopy: true,
      },
    ];
    renderPopup(rect, formatted);

    saveHistory({
      source: "epoch",
      input: selectedText.trim(),
      epochMs,
      gmt: conversion.gmt,
      local: conversion.local,
      relative: conversion.relative,
      convertedAt: new Date().toISOString(),
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
