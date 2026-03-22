/**
 * Builds pre-filled Google Form URLs for low star ratings (1–3).
 * Static field IDs and base URL come from build-generated feedbackFormConfig.js.
 */

import {
  FEEDBACK_FORM_BASE_URL,
  FEEDBACK_FORM_ENTRY_KEYS,
} from "./generated/feedbackFormConfig.js";

/** Submitted value when the extension is running on Firefox (AMO build). */
export const BROWSER_LABEL_FIREFOX = "Firefox";

/** Submitted value for Chrome, Edge, and other Chromium-based browsers. */
export const BROWSER_LABEL_CHROMIUM = "Chrome/Chromium-Based";

/**
 * @param {1 | 2 | 3} stars
 * @param {string} manifestVersion from `runtime.getManifest().version`
 * @param {boolean} isFirefox from manifest `browser_specific_settings.gecko`
 * @returns {string} Pre-filled form URL, or empty string if stars are out of range or base URL is missing.
 */
export function buildFeedbackFormUrl(stars, manifestVersion, isFirefox) {
  if (stars < 1 || stars > 3) {
    return "";
  }
  if (!FEEDBACK_FORM_BASE_URL || !FEEDBACK_FORM_ENTRY_KEYS) {
    return "";
  }
  const url = new URL(FEEDBACK_FORM_BASE_URL);
  url.searchParams.set("usp", "pp_url");
  url.searchParams.set(
    FEEDBACK_FORM_ENTRY_KEYS.rating,
    String(stars),
  );
  url.searchParams.set(
    FEEDBACK_FORM_ENTRY_KEYS.version,
    String(manifestVersion ?? ""),
  );
  url.searchParams.set(
    FEEDBACK_FORM_ENTRY_KEYS.browser,
    isFirefox ? BROWSER_LABEL_FIREFOX : BROWSER_LABEL_CHROMIUM,
  );
  return url.toString();
}
