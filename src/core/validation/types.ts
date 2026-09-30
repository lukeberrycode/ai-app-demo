import type { Invoice, Issue } from "../invoice.ts";

/** Everything a rule needs that varies at runtime is passed in here. */
export interface ValidationContext {
  /** Today's date, ISO 8601 (YYYY-MM-DD). */
  today: string;
}

export type Rule = (invoice: Invoice, context: ValidationContext) => Issue[];
