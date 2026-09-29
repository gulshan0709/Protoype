// Calendar and clock helpers shared by the demo modules. Pure, so node tests can load it.

export const MONTHS: readonly string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const WEEKDAYS_SHORT: readonly string[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** The demo corpus is a snapshot of Tue 15 Sep 2026 at 09:45 (local time). */
export const DEMO_SNAPSHOT = new Date(2026, 8, 15, 9, 45);

/** 7 → "07"; `width` digits in general. */
export const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Minutes after midnight → "HH:MM" (wraps past midnight). */
export const hhmm = (minutes: number) =>
  pad(Math.floor(minutes / 60) % 24) + ":" + pad(minutes % 60);

/** "HH:MM" → minutes after midnight; a missing minute part counts as 0. */
export const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** The calendar day `days` after `date`, at local midnight. */
export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
