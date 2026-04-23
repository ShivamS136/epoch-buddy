/**
 * Timezone list management utilities.
 *
 * The user-configured list of timezones shown in result rows, history, and the
 * floating popup. Sentinel values:
 *   - "local" → machine's resolved zone at render time
 *   - "utc"   → UTC
 * Any other entry must be a valid IANA zone name (e.g. "Asia/Kolkata").
 */

const TIMEZONES_KEY = "timezones";
export const DEFAULT_TIMEZONES = ["local", "utc"];

const FALLBACK_IANA_ZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Warsaw",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

function sanitize(list) {
  if (!Array.isArray(list)) return null;
  const cleaned = list.filter(isNonEmptyString).map((s) => s.trim());
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Validate a zone string: "local", "utc", or a value accepted by
 * Intl.DateTimeFormat's timeZone option.
 */
export function isValidTimezone(tz) {
  if (!isNonEmptyString(tz)) return false;
  const lower = tz.toLowerCase();
  if (lower === "local" || lower === "utc") return true;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the complete list of IANA zones available in this runtime, with
 * "local" and "utc" prepended. Falls back to a curated list on older engines
 * that do not implement Intl.supportedValuesOf.
 */
export function getAvailableTimezones() {
  let zones;
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      zones = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    zones = null;
  }
  if (!Array.isArray(zones) || zones.length === 0) {
    zones = FALLBACK_IANA_ZONES.slice();
  }
  return ["local", "utc", ...zones.filter((z) => z.toLowerCase() !== "utc")];
}

/**
 * Load the timezone list from chrome.storage.local. Falls back to the default
 * list when storage is unavailable (demo builds) or the stored value is invalid.
 */
export function loadTimezonesFromStorage(callback) {
  const browser = globalThis.browser || globalThis.chrome;
  if (!browser?.storage?.local) {
    callback(DEFAULT_TIMEZONES.slice());
    return;
  }
  browser.storage.local.get({ [TIMEZONES_KEY]: null }, (result) => {
    const cleaned = sanitize(result[TIMEZONES_KEY]);
    callback(cleaned || DEFAULT_TIMEZONES.slice());
  });
}

/**
 * Save the timezone list. Requires at least one entry; no-op in contexts
 * without chrome.storage.local.
 */
export function saveTimezonesToStorage(list) {
  const cleaned = sanitize(list);
  if (!cleaned) return;
  const browser = globalThis.browser || globalThis.chrome;
  if (!browser?.storage?.local) return;
  browser.storage.local.set({ [TIMEZONES_KEY]: cleaned });
}

/**
 * Subscribe to timezone-list changes in storage. Returns an unsubscribe fn.
 */
export function onTimezonesChanged(callback) {
  const browser = globalThis.browser || globalThis.chrome;
  if (!browser?.storage?.onChanged) return () => {};
  const listener = (changes, area) => {
    if (area !== "local" || !changes[TIMEZONES_KEY]) return;
    const cleaned = sanitize(changes[TIMEZONES_KEY].newValue);
    callback(cleaned || DEFAULT_TIMEZONES.slice());
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
