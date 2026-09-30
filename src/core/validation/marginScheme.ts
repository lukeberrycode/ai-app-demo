import type { Rule } from "./types.ts";

/**
 * Used vehicles are often sold under the VAT margin scheme, with no VAT
 * shown. That is valid, so this is a warning: a prompt to check the scheme
 * applies and that no input VAT is reclaimed.
 */
export const marginSchemeNoVat: Rule = (invoice) => {
  if (invoice.vatScheme !== "margin") return [];
  const showsVat =
    (invoice.totals.vat ?? 0) !== 0 ||
    invoice.lineItems.some((line) => (line.vat ?? 0) !== 0);
  return [
    {
      ruleId: "margin-scheme-no-vat",
      field: showsVat ? "totals.vat" : "vatScheme",
      severity: "warning",
      message: showsVat
        ? "Margin-scheme invoice shows VAT. Margin-scheme invoices do not show VAT separately; check the scheme."
        : "Margin-scheme invoice: no VAT is shown, which is normal for used vehicles. No input VAT can be reclaimed.",
    },
  ];
};
