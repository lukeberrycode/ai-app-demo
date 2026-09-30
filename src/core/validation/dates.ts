import type { Issue } from "../invoice.ts";
import type { Rule } from "./types.ts";

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function invalidDate(field: string, label: string, value: string): Issue {
  return {
    ruleId: "date-format",
    field,
    severity: "error",
    message: `${label} "${value}" is not a valid date (YYYY-MM-DD).`,
  };
}

/** Dates that are present must be real dates. */
export const dateFormat: Rule = (invoice) => {
  const issues: Issue[] = [];
  if (invoice.invoiceDate !== null && !isIsoDate(invoice.invoiceDate)) {
    issues.push(
      invalidDate("invoiceDate", "Invoice date", invoice.invoiceDate),
    );
  }
  if (invoice.dueDate !== null && !isIsoDate(invoice.dueDate)) {
    issues.push(invalidDate("dueDate", "Due date", invoice.dueDate));
  }
  return issues;
};

// ISO dates compare correctly as strings.
export const invoiceDateNotInFuture: Rule = (invoice, { today }) => {
  const date = invoice.invoiceDate;
  if (date === null || !isIsoDate(date) || date <= today) return [];
  return [
    {
      ruleId: "invoice-date-not-in-future",
      field: "invoiceDate",
      severity: "error",
      message: `Invoice date ${date} is in the future (today is ${today}).`,
    },
  ];
};

export const dueDateOnOrAfterInvoiceDate: Rule = (invoice) => {
  const { invoiceDate, dueDate } = invoice;
  if (
    invoiceDate === null ||
    dueDate === null ||
    !isIsoDate(invoiceDate) ||
    !isIsoDate(dueDate) ||
    dueDate >= invoiceDate
  ) {
    return [];
  }
  return [
    {
      ruleId: "due-date-on-or-after-invoice-date",
      field: "dueDate",
      severity: "warning",
      message: `Due date ${dueDate} is before the invoice date ${invoiceDate}.`,
    },
  ];
};
