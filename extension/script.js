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
  var buildConversionData = (epochMs) => {
    const date = new Date(epochMs);
    return {
      gmt: formatGmtTimestamp(date),
      local: `${formatLocalTimestamp(date)} (${formatTimeZoneOffset(date, true)})`,
      relative: formatRelative(epochMs)
    };
  };
  var stripTimezoneSuffix = (value) => value.replace(/\s\([+-]\d{2}:\d{2}\)$/, "");

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

  // src/content/main.js
  (() => {
    const browser = globalThis.browser || globalThis.chrome;
    const POPUP_ID = "epoch-buddy-popup";
    let popupEl = null;
    let lastSelectionText = "";
    const copyBtnOpts = {
      className: "epoch-buddy-copy",
      successClass: "epoch-buddy-copy-success",
      errorClass: "epoch-buddy-copy-error"
    };
    const removePopup = () => {
      if (popupEl) {
        popupEl.remove();
        popupEl = null;
      }
    };
    const createPopupEl = () => {
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
      if (!rect || rect.width === 0 && rect.height === 0) {
        return null;
      }
      return rect;
    };
    const getInputSelection = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
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
        rect: active.getBoundingClientRect()
      };
    };
    const saveHistory = (entry) => {
      if (!browser?.storage?.local) {
        return;
      }
      browser.storage.local.get({ history: [] }, (result) => {
        const history = Array.isArray(result.history) ? result.history : [];
        const next = [entry, ...history].slice(0, 10);
        browser.storage.local.set({ history: next });
      });
    };
    const renderPopup = (rect, formatted) => {
      const el = createPopupEl();
      el.innerHTML = "";
      formatted.forEach((line) => {
        const row = document.createElement("div");
        row.className = "epoch-buddy-row";
        if (line.isRelative) {
          row.classList.add("epoch-buddy-relative");
        }
        const label = document.createElement("strong");
        label.className = "epoch-buddy-label";
        label.innerHTML = `${line.label}${line.afterLabelText || ""}: `;
        row.appendChild(label);
        const value = document.createElement("span");
        value.className = "epoch-buddy-value";
        value.textContent = ` ${line.value}`;
        row.appendChild(value);
        if (!line.noCopy) {
          row.appendChild(
            createCopyButton(
              typeof line.copyValue === "string" ? line.copyValue : line.value,
              copyBtnOpts
            )
          );
        }
        el.appendChild(row);
      });
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const gap = 8;
      el.style.top = "0px";
      el.style.left = "0px";
      el.style.visibility = "hidden";
      const popupW = el.offsetWidth;
      const popupH = el.offsetHeight;
      el.style.visibility = "";
      const fitsBelow = rect.bottom + gap + popupH <= vh;
      const fitsAbove = rect.top - gap - popupH >= 0;
      let top;
      if (fitsBelow) {
        top = rect.bottom + scrollY + gap;
      } else if (fitsAbove) {
        top = rect.top + scrollY - gap - popupH;
      } else {
        top = scrollY + Math.max(vh - popupH - gap, gap);
      }
      const fitsRight = rect.left + popupW <= vw;
      let left;
      if (fitsRight) {
        left = rect.left + scrollX;
      } else {
        left = Math.max(scrollX + vw - popupW - gap, scrollX + gap);
      }
      const finalTop = Math.max(top, scrollY + gap);
      const finalLeft = Math.max(left, scrollX + gap);
      el.classList.remove("eb-arrow-top", "eb-arrow-bottom");
      if (fitsBelow) {
        el.classList.add("eb-arrow-top");
      } else if (fitsAbove) {
        el.classList.add("eb-arrow-bottom");
      }
      const selCenterX = rect.left + rect.width / 2 + scrollX;
      const arrowPad = 16;
      const arrowX = Math.max(
        arrowPad,
        Math.min(selCenterX - finalLeft, popupW - arrowPad)
      );
      el.style.setProperty("--eb-arrow-x", `${arrowX}px`);
      el.style.top = `${finalTop}px`;
      el.style.left = `${finalLeft}px`;
    };
    const handleSelection = (event) => {
      if (event?.target instanceof Node && popupEl && popupEl.contains(event.target)) {
        return;
      }
      const inputSelection = getInputSelection();
      const selection = inputSelection ? null : window.getSelection();
      if (!inputSelection && (!selection || selection.isCollapsed)) {
        lastSelectionText = "";
        removePopup();
        return;
      }
      const selectedText = inputSelection ? inputSelection.text : selection.toString();
      if (!selectedText || selectedText === lastSelectionText) {
        return;
      }
      lastSelectionText = selectedText;
      const epochMs = parseEpoch(selectedText);
      if (epochMs === null) {
        removePopup();
        return;
      }
      const rect = inputSelection ? inputSelection.rect : getSelectionRect(selection);
      if (!rect) {
        removePopup();
        return;
      }
      const conversion = buildConversionData(epochMs);
      const formatted = [
        {
          label: "Epoch (ms)",
          value: epochMs,
          copyValue: epochMs
        },
        {
          label: "GMT",
          value: conversion.gmt,
          copyValue: conversion.gmt,
          afterLabelText: "&nbsp;&nbsp;"
        },
        {
          label: "Local",
          value: conversion.local,
          copyValue: stripTimezoneSuffix(conversion.local)
        },
        {
          label: "Relative",
          value: conversion.relative,
          isRelative: true,
          noCopy: true
        }
      ];
      renderPopup(rect, formatted);
      saveHistory({
        source: "epoch",
        input: selectedText.trim(),
        epochMs,
        gmt: conversion.gmt,
        local: conversion.local,
        relative: conversion.relative,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
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
})();
