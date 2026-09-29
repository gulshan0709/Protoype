// Field rules shared by the setup forms and CSV uploads. Callers keep their own
// messages; only the rules live here. Pure, so node tests can load it.

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 24-hour "HH:MM". */
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** "YYYY-MM-DD" by shape only; see isRealDate for the calendar check. */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = { 7: /^\+?\d{7,15}$/, 10: /^\+?\d{10,15}$/ };

export const isEmail = (value: string) => EMAIL.test(value);

/** A "YYYY-MM-DD" that names a real calendar day (no 2026-02-30). */
export function isRealDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** A real "YYYY-MM-DD HH:MM". */
export function isRealDateTime(value: string) {
  if (!DATE_TIME.test(value)) return false;
  const parsed = new Date(value.replace(" ", "T") + ":00Z");
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 16) === value.replace(" ", "T")
  );
}

/**
 * An optional leading "+" and `minDigits`–15 digits, ignoring spaces and dashes.
 * Learners use at least 10 digits; surveillance users and wardens at least 7.
 */
export const isPhone = (value: string, minDigits: 7 | 10 = 10) =>
  PHONE[minDigits].test(value.replace(/[\s-]/g, ""));
