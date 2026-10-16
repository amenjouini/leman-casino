/**
 * CSV for spreadsheet software used in Switzerland (semicolon separated, UTF-8 BOM).
 * Every field is quoted; values starting with = + - @ are prefixed to prevent formula injection.
 */
export function csvField(value: unknown): string {
  let s = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvField).join(";"), ...rows.map((r) => r.map(csvField).join(";"))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
