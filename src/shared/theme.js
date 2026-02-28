/**
 * Theme management utilities.
 *
 * Supports three modes: "light", "dark", "system".
 * "system" follows the OS preference via CSS prefers-color-scheme (no JS needed).
 * Explicit "light"/"dark" override via data-theme attribute.
 */

const THEME_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ICONS = {
  light: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  dark: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  system: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
};

export function getSystemTheme() {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(preference) {
  if (preference === "dark" || preference === "light") return preference;
  return getSystemTheme();
}

/**
 * Apply theme preference to an element via data-theme attribute.
 * - "system" → remove attribute (CSS @media handles it)
 * - "light"  → data-theme="light"
 * - "dark"   → data-theme="dark"
 */
export function applyTheme(preference, target = document.documentElement) {
  if (preference === "dark") {
    target.setAttribute("data-theme", "dark");
  } else if (preference === "light") {
    target.setAttribute("data-theme", "light");
  } else {
    target.removeAttribute("data-theme");
  }
}

export function updateToggleIcon(btnEl, preference) {
  if (!btnEl) return;
  btnEl.innerHTML = ICONS[preference] || ICONS.system;
}

export function updateMenuActive(menuEl, preference) {
  if (!menuEl) return;
  menuEl.querySelectorAll("[data-theme-option]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.themeOption === preference);
  });
}

export function onSystemThemeChange(callback) {
  const mql = window.matchMedia(MEDIA_QUERY);
  const handler = () => callback(getSystemTheme());
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

/**
 * Load theme preference from chrome.storage.local (extension context).
 */
export function loadThemeFromStorage(callback) {
  const browser = globalThis.browser || globalThis.chrome;
  if (!browser?.storage?.local) {
    callback("system");
    return;
  }
  browser.storage.local.get({ [THEME_KEY]: "system" }, (result) => {
    callback(result[THEME_KEY] || "system");
  });
}

/**
 * Save theme preference to chrome.storage.local (extension context).
 */
export function saveThemeToStorage(preference) {
  const browser = globalThis.browser || globalThis.chrome;
  if (!browser?.storage?.local) return;
  browser.storage.local.set({ [THEME_KEY]: preference });
}
