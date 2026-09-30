import type { Rule } from "./types.ts";

// GB + 9 digits, GB + 12 digits (branch traders), or GBGD/GBHA + 3 digits
// (government departments and health authorities).
const UK_VAT_NUMBER = /^GB(?:\d{9}|\d{12}|GD\d{3}|HA\d{3})$/;

/** Supplier VAT number format. Format check only; not checked with HMRC. */
export const vatNumberFormat: Rule = (invoice) => {
  const vatNumber = invoice.supplier.vatNumber;
  if (vatNumber === null) return [];
  if (UK_VAT_NUMBER.test(vatNumber.replace(/\s+/g, "").toUpperCase())) {
    return [];
  }
  return [
    {
      ruleId: "vat-number-format",
      field: "supplier.vatNumber",
      severity: "warning",
      message: `VAT number ${vatNumber} is not in a UK format (GB followed by 9 or 12 digits, or GBGD/GBHA followed by 3 digits).`,
    },
  ];
};
