import type { Invoice, Issue } from "../invoice.ts";
import {
  lineItemsSumToNet,
  netPlusVatEqualsGross,
  vatMatchesRate,
} from "./arithmetic.ts";
import { currencyIsGbp } from "./currency.ts";
import {
  dateFormat,
  dueDateOnOrAfterInvoiceDate,
  invoiceDateNotInFuture,
} from "./dates.ts";
import { marginSchemeNoVat } from "./marginScheme.ts";
import { requiredFields } from "./required.ts";
import { vatNumberFormat } from "./supplier.ts";
import type { Rule, ValidationContext } from "./types.ts";
import { registrationFormat, vinFormat } from "./vehicle.ts";

export type { Rule, ValidationContext } from "./types.ts";

/** The rules from CLAUDE.md §3.4, in the order their issues are reported. */
export const rules: Rule[] = [
  requiredFields,
  dateFormat,
  lineItemsSumToNet,
  netPlusVatEqualsGross,
  vatMatchesRate,
  marginSchemeNoVat,
  vinFormat,
  registrationFormat,
  vatNumberFormat,
  invoiceDateNotInFuture,
  dueDateOnOrAfterInvoiceDate,
  currencyIsGbp,
];

export function validateInvoice(
  invoice: Invoice,
  context: ValidationContext,
): Issue[] {
  return rules.flatMap((rule) => rule(invoice, context));
}
