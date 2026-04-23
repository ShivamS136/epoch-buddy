/**
 * Shared date/time formatting utilities used by the extension popup,
 * the content script, and the docs demo page.
 */

export const pad2 = (v) => String(v).padStart(2, "0");
export const pad3 = (v) => String(v).padStart(3, "0");

export const formatDateParts = (date, useUtc) => {
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
    seconds: pad2(seconds),
  };
};

export const formatUtcTimestamp = (date) => {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hours = pad2(date.getUTCHours());
  const minutes = pad2(date.getUTCMinutes());
  const seconds = pad2(date.getUTCSeconds());
  const millis = pad3(date.getUTCMilliseconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
};

export const formatTimeZoneOffset = (date, padHours = true) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const hourText = padHours ? pad2(hours) : String(hours);
  return `${sign}${hourText}:${pad2(minutes)}`;
};

export const formatLocalTimestamp = (date) => {
  const parts = formatDateParts(date, false);
  const millis = pad3(date.getMilliseconds());
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hours}:${parts.minutes}:${parts.seconds}.${millis}`;
};

export const formatRelative = (epochMs) => {
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
    parts.push("0s");
  }

  return `${parts.join(", ")} ${suffix}`;
};

export const formatRelativeParts = (parts, suffix) => {
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
  if (result.length === 0) {
    result.push("0s");
  }
  return `${result.join(" ")} ${suffix}`;
};

export const buildConversionData = (epochMs) => {
  const date = new Date(epochMs);
  return {
    epochS: String(Math.floor(epochMs / 1000)),
    utc: formatUtcTimestamp(date),
    localTimestamp: formatLocalTimestamp(date),
    tzLabel: formatTimeZoneOffset(date, true),
    local: `${formatLocalTimestamp(date)} (${formatTimeZoneOffset(date, true)})`,
    relative: formatRelative(epochMs),
  };
};

// ── Arbitrary IANA timezone support ─────────────────────────────

const ZONE_FORMATTER_CACHE = new Map();

const getZoneFormatter = (timeZone) => {
  if (!ZONE_FORMATTER_CACHE.has(timeZone)) {
    ZONE_FORMATTER_CACHE.set(
      timeZone,
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    );
  }
  return ZONE_FORMATTER_CACHE.get(timeZone);
};

/**
 * Normalize "local" / "utc" sentinels; returns a canonical form: one of
 * "local", "utc", or an IANA zone name as-is.
 */
const canonZone = (zone) => {
  if (!zone) return "local";
  const lower = String(zone).toLowerCase();
  if (lower === "local") return "local";
  if (lower === "utc") return "utc";
  return zone;
};

/** Human-readable label for a zone: "Local", "UTC", or the IANA name. */
export const zoneDisplayLabel = (zone) => {
  const c = canonZone(zone);
  if (c === "local") return "Local";
  if (c === "utc") return "UTC";
  return c;
};

/**
 * Format `date` as "YYYY-MM-DD HH:MM:SS.sss" in the given zone.
 * Milliseconds are zone-independent so they're taken from the epoch value.
 */
export const formatTimestampInZone = (date, zone) => {
  const c = canonZone(zone);
  if (c === "local") return formatLocalTimestamp(date);
  if (c === "utc") return formatUtcTimestamp(date);

  let year = "0000";
  let month = "01";
  let day = "01";
  let hour = "00";
  let minute = "00";
  let second = "00";
  try {
    const parts = getZoneFormatter(c).formatToParts(date);
    for (const p of parts) {
      if (p.type === "year") year = p.value;
      else if (p.type === "month") month = p.value;
      else if (p.type === "day") day = p.value;
      else if (p.type === "hour") hour = p.value === "24" ? "00" : p.value;
      else if (p.type === "minute") minute = p.value;
      else if (p.type === "second") second = p.value;
    }
  } catch {
    return formatUtcTimestamp(date);
  }
  const millis = pad3(date.getUTCMilliseconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millis}`;
};

/** Format the offset string (e.g. "+05:30") for `date` in the given zone. */
export const formatOffsetInZone = (date, zone) => {
  const c = canonZone(zone);
  if (c === "local") return formatTimeZoneOffset(date, true);
  if (c === "utc") return "+00:00";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: c,
      timeZoneName: "longOffset",
    });
    const parts = fmt.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value) {
      const match = tzPart.value.match(/([+-])(\d{1,2}):?(\d{0,2})?/);
      if (match) {
        const sign = match[1];
        const hours = pad2(match[2]);
        const minutes = pad2(match[3] || "0");
        return `${sign}${hours}:${minutes}`;
      }
      if (/^GMT$/i.test(tzPart.value) || /^UTC$/i.test(tzPart.value)) {
        return "+00:00";
      }
    }
  } catch {
    /* fall through */
  }
  return "+00:00";
};

/**
 * Build one display row per configured zone.
 *
 *   [{ zone, label, timestamp, offset, displayValue, copyValue }, ...]
 *
 * `label` already embeds the offset: `"Local (+05:30)"`, `"UTC (+00:00)"`,
 * `"Asia/Kolkata (+05:30)"`.
 */
export const buildZoneRows = (epochMs, zones) => {
  const date = new Date(epochMs);
  const list = Array.isArray(zones) && zones.length > 0 ? zones : ["local"];
  return list.map((zone) => {
    const timestamp = formatTimestampInZone(date, zone);
    const offset = formatOffsetInZone(date, zone);
    const display = zoneDisplayLabel(zone);
    return {
      zone,
      label: `${display} (${offset})`,
      timestamp,
      offset,
      displayValue: timestamp,
      copyValue: timestamp,
    };
  });
};

/**
 * Signed offset (in minutes, east of UTC positive) at the given wall clock
 * time in `zone`. Used by Date → Epoch to convert a wall-clock entry in an
 * arbitrary IANA zone into an absolute epoch.
 *
 * One iteration is enough outside the 1h DST-overlap window; for an ambiguous
 * wall time (fall-back hour) we return the earlier offset, matching how most
 * UI libraries resolve the ambiguity.
 */
export const zoneOffsetMinutes = (
  year,
  month,
  day,
  hour,
  minute,
  second,
  ms,
  zone,
) => {
  const c = canonZone(zone);
  if (c === "utc") return 0;
  if (c === "local") {
    return -new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      ms,
    ).getTimezoneOffset();
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = offsetMinutesAt(utcGuess, c);
  const adjusted = utcGuess - offset1 * 60000;
  const offset2 = offsetMinutesAt(adjusted, c);
  return offset2;
};

const offsetMinutesAt = (instantMs, timeZone) => {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    const parts = fmt.formatToParts(new Date(instantMs));
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (!tzPart?.value) return 0;
    const match = tzPart.value.match(/([+-])(\d{1,2}):?(\d{0,2})?/);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] || 0);
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
};

export const stripTimezoneSuffix = (value) =>
  value.replace(/\s\([+-]\d{2}:\d{2}\)$/, "");

export const formatTimeOnly = (isoString) => {
  if (!isoString) {
    return "--:--:--";
  }
  const date = new Date(isoString);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};
