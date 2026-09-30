import type { Pence } from "../core/invoice.ts";

export { formatPence } from "../core/money.ts";

/**
 * Converts decimal pounds to integer pence. Throws if the amount is not a
 * whole number of pence, so a sub-penny value is never silently rounded.
 */
export function poundsToPence(pounds: number): Pence {
  const pence = Math.round(pounds * 100);
  if (!Number.isFinite(pounds) || Math.abs(pounds * 100 - pence) > 1e-6) {
    throw new RangeError(`Not a whole number of pence: ${pounds}`);
  }
  return pence === 0 ? 0 : pence; // normalise -0
}

/**
 * Parses a user-entered amount straight to pence, without going through a
 * floating-point pounds value. Accepts "1234.5", "£1,234.56", "-3". Returns
 * null for anything else, including more than two decimal places.
 */
export function parsePence(input: string): Pence | null {
  const match = /^(-)?£?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?$/.exec(
    input.trim().replace(/^£-/, "-£"),
  );
  if (!match) return null;
  const [, minus, whole, fraction = ""] = match;
  const pence =
    Number(whole.replaceAll(",", "")) * 100 + Number(fraction.padEnd(2, "0"));
  return minus && pence !== 0 ? -pence : pence;
}
