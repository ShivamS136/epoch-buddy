/**
 * Background service worker (Chrome) / background script (Firefox).
 *
 * Single egress point for analytics. Popup and content script post
 * runtime.sendMessage({ type: "ga:track", name, params }) and this worker
 * forwards them to the GA4 Measurement Protocol endpoint. Keeping the
 * network call here avoids host-permission headaches in content scripts
 * and centralizes client/session id management.
 */

import { ANALYTICS_CONFIG } from "../shared/generated/analyticsConfig.js";

const browser = globalThis.browser || globalThis.chrome;

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const CLIENT_ID_KEY = "ga_client_id";
const SESSION_ID_KEY = "ga_session_id";
const SESSION_LAST_ACTIVE_KEY = "ga_session_last_active";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const OPT_OUT_STORAGE_KEY = "analyticsOptOut";

function isFirefox() {
  try {
    const m = browser.runtime.getManifest();
    return Boolean(m.browser_specific_settings?.gecko);
  } catch {
    return false;
  }
}

function browserTarget() {
  return isFirefox() ? "firefox" : "chrome";
}

function credentialsForBrowser() {
  const target = browserTarget();
  return ANALYTICS_CONFIG[target] ?? {};
}

function generateUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback for environments without randomUUID (should not happen on MV3).
  const hex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    try {
      browser.storage.local.get(keys, (res) => resolve(res || {}));
    } catch {
      resolve({});
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    try {
      browser.storage.local.set(obj, () => resolve());
    } catch {
      resolve();
    }
  });
}

async function getClientId() {
  const res = await storageGet({ [CLIENT_ID_KEY]: null });
  let id = res[CLIENT_ID_KEY];
  if (!id) {
    id = generateUuid();
    await storageSet({ [CLIENT_ID_KEY]: id });
  }
  return id;
}

async function getSessionId() {
  const now = Date.now();
  const res = await storageGet({
    [SESSION_ID_KEY]: null,
    [SESSION_LAST_ACTIVE_KEY]: 0,
  });
  const last = Number(res[SESSION_LAST_ACTIVE_KEY]) || 0;
  let sessionId = res[SESSION_ID_KEY];
  if (!sessionId || now - last > SESSION_TIMEOUT_MS) {
    sessionId = String(Math.floor(now / 1000));
  }
  await storageSet({
    [SESSION_ID_KEY]: sessionId,
    [SESSION_LAST_ACTIVE_KEY]: now,
  });
  return sessionId;
}

async function isOptedOut() {
  const res = await storageGet({ [OPT_OUT_STORAGE_KEY]: false });
  return Boolean(res[OPT_OUT_STORAGE_KEY]);
}

function appVersion() {
  try {
    return browser.runtime.getManifest().version || "";
  } catch {
    return "";
  }
}

async function sendEvent(name, params) {
  if (await isOptedOut()) return;

  const { measurement_id, api_secret } = credentialsForBrowser();
  if (!measurement_id || !api_secret) return;

  const [clientId, sessionId] = await Promise.all([
    getClientId(),
    getSessionId(),
  ]);

  const payload = {
    client_id: clientId,
    events: [
      {
        name,
        params: {
          session_id: sessionId,
          engagement_time_msec: 1,
          app_version: appVersion(),
          browser_target: browserTarget(),
          ...params,
        },
      },
    ],
  };

  const url = `${GA_ENDPOINT}?measurement_id=${encodeURIComponent(
    measurement_id,
  )}&api_secret=${encodeURIComponent(api_secret)}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Network failure is not fatal — drop the event silently.
  }
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "ga:track") return false;
  const name = typeof message.name === "string" ? message.name : null;
  if (!name) return false;
  const params =
    message.params && typeof message.params === "object" ? message.params : {};

  // Returning `true` + calling sendResponse after the async work ensures the
  // MV3 service worker isn't terminated before the GA fetch resolves.
  sendEvent(name, params).finally(() => {
    try {
      sendResponse?.({ ok: true });
    } catch {
      // sender may have gone away
    }
  });
  return true;
});
