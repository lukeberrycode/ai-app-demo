import type { Rule } from "./types.ts";

export const currencyIsGbp: Rule = (invoice) => {
  if (invoice.currency?.trim().toUpperCase() === "GBP") return [];
  return [
    {
      ruleId: "currency-gbp",
      field: "currency",
      severity: "warning",
      message:
        invoice.currency === null
          ? "Currency is not stated; expected GBP."
          : `Currency is ${invoice.currency}, not GBP.`,
    },
  ];
};
