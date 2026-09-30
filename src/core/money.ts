import type { Pence } from "./invoice.ts";

/** Formats pence for display, e.g. 123456 → "£1,234.56". */
export function formatPence(pence: Pence): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+$)/g, ",");
  return `${sign}£${pounds}.${String(abs % 100).padStart(2, "0")}`;
}
