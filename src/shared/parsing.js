/**
 * Shared epoch/date parsing utilities.
 */

export const EPOCH_SECONDS_REGEX = /^\d{10}$/;
export const EPOCH_MILLISECONDS_REGEX = /^\d{13}$/;

export const sanitizeEpochInput = (text) => text.replace(/[,_]/g, "");

export const parseEpoch = (text) => {
  const trimmed = sanitizeEpochInput(text.trim());
  if (EPOCH_SECONDS_REGEX.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  if (EPOCH_MILLISECONDS_REGEX.test(trimmed)) {
    return Number(trimmed);
  }
  return null;
};

export const parseDateField = (value, label, min, max) => {
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return { error: `${label} is required.`, field: label.toLowerCase() };
  }
  const number = Number(trimmed);
  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return {
      error: `${label} must be a valid number.`,
      field: label.toLowerCase(),
    };
  }
  if (number < min || (max !== undefined && number > max)) {
    const range = max !== undefined ? `${min}–${max}` : `>= ${min}`;
    return {
      error: `${label} must be ${range}.`,
      field: label.toLowerCase(),
    };
  }
  return { value: Math.floor(number) };
};

export const parseDateInput = (yearValue, monthValue, dayValue) => {
  if (!yearValue || !monthValue || !dayValue) {
    return null;
  }
  const yStr = String(yearValue);
  const mStr = String(monthValue);
  const dStr = String(dayValue);
  if (!/^\d+$/.test(yStr + mStr + dStr)) {
    return null;
  }
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

export const parseTimePart = (value, max, label) => {
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return { value: 0 };
  }
  const number = Number(trimmed);
  if (Number.isNaN(number) || !Number.isFinite(number)) {
    return { error: `${label} must be numeric.` };
  }
  if (number < 0 || number > max) {
    return { error: `${label} must be between 0 and ${max}.` };
  }
  return { value: Math.floor(number) };
};

export const parseIsoString = (isoStr, fallbackTz) => {
  const trimmed = isoStr.trim();
  if (!trimmed) {
    return { error: "ISO string is required." };
  }
  const hasOffset =
    /[Zz]$/.test(trimmed) ||
    /[+-]\d{2}:\d{2}$/.test(trimmed) ||
    /[+-]\d{4}$/.test(trimmed);

  let dateStr = trimmed;
  if (!hasOffset && fallbackTz === "utc") {
    dateStr = trimmed + "Z";
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { error: "Invalid ISO 8601 string." };
  }
  return { value: date.getTime() };
};

export const normalizeRelativeFields = (days, hours, minutes, seconds, ms) => {
  let totalMs =
    ((((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000 + ms) | 0;
  if (totalMs < 0) totalMs = 0;

  const nMs = totalMs % 1000;
  let rem = (totalMs - nMs) / 1000;
  const nSec = rem % 60;
  rem = (rem - nSec) / 60;
  const nMin = rem % 60;
  rem = (rem - nMin) / 60;
  const nHr = rem % 24;
  const nDay = (rem - nHr) / 24;

  return { days: nDay, hours: nHr, minutes: nMin, seconds: nSec, ms: nMs };
};
