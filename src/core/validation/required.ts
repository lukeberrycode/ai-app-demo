import type { Issue } from "../invoice.ts";
import type { Rule } from "./types.ts";

export const requiredFields: Rule = (invoice) => {
  const required: [field: string, label: string, value: unknown][] = [
    ["supplier.name", "Supplier name", invoice.supplier.name],
    ["invoiceNumber", "Invoice number", invoice.invoiceNumber],
    ["invoiceDate", "Invoice date", invoice.invoiceDate],
    ["totals.gross", "Gross total", invoice.totals.gross],
  ];
  return required.flatMap(([field, label, value]): Issue[] =>
    value === null
      ? [
          {
            ruleId: "required-fields",
            field,
            severity: "error",
            message: `${label} is missing.`,
          },
        ]
      : [],
  );
};
