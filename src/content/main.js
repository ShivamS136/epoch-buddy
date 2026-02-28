/**
 * Content script entry point.
 *
 * Injected into every page. Detects selected epoch values and shows a
 * floating popup with converted timestamps.
 */

import {
  buildConversionData,
  stripTimezoneSuffix,
} from "../shared/formatting.js";
import { parseEpoch } from "../shared/parsing.js";
import { createCopyButton } from "../shared/clipboard.js";
import {
  loadThemeFromStorage,
  resolveTheme,
  onSystemThemeChange,
} from "../shared/theme.js";

(() => {
  const browser = globalThis.browser || globalThis.chrome;

  const POPUP_ID = "epoch-buddy-popup";

  /** @type {HTMLElement|null} */
  let popupEl = null;
  let lastSelectionText = "";
  let themePref = "system";

  const copyBtnOpts = {
    className: "epoch-buddy-copy",
    successClass: "epoch-buddy-copy-success",
    errorClass: "epoch-buddy-copy-error",
  };

  const applyPopupTheme = () => {
    if (!popupEl) return;
    const resolved = resolveTheme(themePref);
    popupEl.classList.toggle("eb-dark", resolved === "dark");
  };

  loadThemeFromStorage((pref) => {
    themePref = pref;
    applyPopupTheme();
  });

  onSystemThemeChange(() => {
    if (themePref === "system") applyPopupTheme();
  });

  if (browser?.storage?.onChanged) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.theme) {
        themePref = changes.theme.newValue || "system";
        applyPopupTheme();
      }
    });
  }

  // ── Popup lifecycle ───────────────────────────────────────────────

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
    applyPopupTheme();
    return el;
  };

  // ── Selection helpers ─────────────────────────────────────────────

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

  // ── History (browser.storage) ──────────────────────────────────────

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

  // ── Render popup ──────────────────────────────────────────────────

  const renderPopup = (rect, formatted) => {
    const el = createPopupEl();
    el.replaceChildren ? el.replaceChildren() : (el.textContent = "");
    formatted.forEach((line) => {
      const row = document.createElement("div");
      row.className = "epoch-buddy-row";
      if (line.isRelative) {
        row.classList.add("epoch-buddy-relative");
      }

      const label = document.createElement("strong");
      label.className = "epoch-buddy-label";
      label.textContent = `${line.label}${line.afterLabelText || ""}:`;
      row.appendChild(label);

      const value = document.createElement("span");
      value.className = "epoch-buddy-value";
      value.textContent = `${line.value}`;
      row.appendChild(value);

      if (!line.noCopy) {
        row.appendChild(
          createCopyButton(
            typeof line.copyValue === "string" ? line.copyValue : line.value,
            copyBtnOpts,
          ),
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
      Math.min(selCenterX - finalLeft, popupW - arrowPad),
    );
    el.style.setProperty("--eb-arrow-x", `${arrowX}px`);

    el.style.top = `${finalTop}px`;
    el.style.left = `${finalLeft}px`;
  };

  // ── Event handlers ────────────────────────────────────────────────

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
        label: "Epoch (ms)",
        value: epochMs,
        copyValue: epochMs,
      },
      {
        label: "GMT",
        value: conversion.gmt,
        copyValue: conversion.gmt,
        afterLabelText: "  ",
      },
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

  // ── Bind events ───────────────────────────────────────────────────

  document.addEventListener("mouseup", handleSelection);
  document.addEventListener("keyup", handleSelection);
  document.addEventListener("mousedown", handleClick);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("scroll", handleScrollOrResize, true);
  window.addEventListener("resize", handleScrollOrResize);
})();
