import type { Pence } from "../invoice.ts";

/** Rounding tolerance for arithmetic checks, in pence. */
export const TOLERANCE_PENCE = 1;

export function withinTolerance(a: Pence, b: Pence): boolean {
  return Math.abs(a - b) <= TOLERANCE_PENCE;
}

/** VAT on a net amount at a percentage rate, rounded to the nearest penny. */
export function vatAt(net: Pence, ratePercent: number): Pence {
  return Math.round((net * ratePercent) / 100);
}

/** Sum of the values, or null if any is null. */
export function sumOrNull(values: (Pence | null)[]): Pence | null {
  let sum = 0;
  for (const value of values) {
    if (value === null) return null;
    sum += value;
  }
  return sum;
}
