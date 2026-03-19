/**
 * Shared copy-to-clipboard button factory.
 *
 * Class names are configurable so the same logic works in the extension popup,
 * content script (prefixed classes), and the docs demo page.
 */

const parser = new DOMParser();

const svgNode = (str) =>
  parser.parseFromString(str, "image/svg+xml").documentElement.cloneNode(true);

const ICON_COPY_STR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const ICON_CHECK_STR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

const ICON_ERROR_STR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

const setIcon = (el, str) => el.replaceChildren(svgNode(str));

export const createCopyButton = (
  value,
  {
    className = "copy-btn",
    successClass = "copy-success",
    errorClass = "copy-error",
  } = {},
) => {
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

export const bindLiveCopyButton = (
  button,
  valueFn,
  {
    successClass = "copy-success",
    errorClass = "copy-error",
    onCopy,
  } = {},
) => {
  const ICON_CLOCK_STR =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

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
