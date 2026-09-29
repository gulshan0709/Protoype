// CSV reading and writing shared by exports, session reports and bulk uploads.
// Pure, so node tests can load it.

/** Minimal RFC 4180 CSV reader (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/**
 * One quoted CSV field. A leading =, +, -, @, tab or CR is prefixed with "'" so
 * spreadsheets show the text instead of running it as a formula.
 */
export const csvCell = (value: string) =>
  '"' +
  (/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""') +
  '"';

/** Rows of fields → CSV text with CRLF line ends, every field quoted. */
export const toCsv = (rows: readonly (readonly string[])[]) =>
  rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
