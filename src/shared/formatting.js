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

export const formatGmtTimestamp = (date) => {
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
    gmt: formatGmtTimestamp(date),
    local: `${formatLocalTimestamp(date)} (${formatTimeZoneOffset(date, true)})`,
    relative: formatRelative(epochMs),
  };
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
