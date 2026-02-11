/**
 * Shared copy-to-clipboard button factory.
 *
 * Class names are configurable so the same logic works in the extension popup,
 * content script (prefixed classes), and the docs demo page.
 */

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
