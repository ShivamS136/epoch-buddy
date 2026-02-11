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

export const parseDateInput = (yearValue, monthValue, dayValue) => {
  if (!yearValue || !monthValue || !dayValue) {
    return null;
  }
  if (!/^\d+$/.test(yearValue + monthValue + dayValue)) {
    return null;
  }
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
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
  const trimmed = value.trim();
  if (trimmed === "") {
    return { value: 0 };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { error: `${label} must be numeric.` };
  }
  const number = Number(trimmed);
  if (number < 0 || number > max) {
    return { error: `${label} must be between 0 and ${max}.` };
  }
  return { value: number };
};
