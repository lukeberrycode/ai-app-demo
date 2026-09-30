import type { Issue } from "../invoice.ts";
import { formatPence } from "../money.ts";
import { sumOrNull, vatAt, withinTolerance } from "./amounts.ts";
import type { Rule } from "./types.ts";

export const lineItemsSumToNet: Rule = (invoice) => {
  const net = invoice.totals.net;
  const lineSum = sumOrNull(invoice.lineItems.map((line) => line.net));
  if (net === null || lineSum === null || invoice.lineItems.length === 0) {
    return [];
  }
  if (withinTolerance(lineSum, net)) return [];
  return [
    {
      ruleId: "line-items-sum-to-net",
      field: "totals.net",
      severity: "error",
      message: `Line items add up to ${formatPence(lineSum)}, but the net total is ${formatPence(net)}.`,
    },
  ];
};

export const netPlusVatEqualsGross: Rule = (invoice) => {
  const { net, vat, gross } = invoice.totals;
  if (net === null || gross === null) return [];
  const expected = net + (vat ?? 0);
  if (withinTolerance(expected, gross)) return [];
  const sum =
    vat === null
      ? `Net ${formatPence(net)} (no VAT shown)`
      : `Net ${formatPence(net)} + VAT ${formatPence(vat)} = ${formatPence(expected)}`;
  return [
    {
      ruleId: "net-plus-vat-equals-gross",
      field: "totals.gross",
      severity: "error",
      message: `${sum}, but the gross total is ${formatPence(gross)}.`,
    },
  ];
};

const UK_VAT_RATES = [20, 5, 0];
const STANDARD_RATE = 20;

/**
 * VAT matches the stated rate. Lines are checked at their own stated rate
 * (20%, 5% or 0%). When no line shows VAT, a standard-rated invoice's VAT
 * total is checked at 20% of its net total.
 */
export const vatMatchesRate: Rule = (invoice) => {
  const lineIssues = invoice.lineItems.flatMap((line, i): Issue[] => {
    if (line.net === null || line.vat === null || line.vatRate === null) {
      return [];
    }
    if (!UK_VAT_RATES.includes(line.vatRate)) return [];
    const expected = vatAt(line.net, line.vatRate);
    if (withinTolerance(expected, line.vat)) return [];
    return [
      {
        ruleId: "vat-matches-rate",
        field: `lineItems[${i}].vat`,
        severity: "error",
        message: `VAT of ${formatPence(line.vat)} does not match ${line.vatRate}% of ${formatPence(line.net)} (${formatPence(expected)}).`,
      },
    ];
  });

  const linesShowVat = invoice.lineItems.some((line) => line.vat !== null);
  const { net, vat } = invoice.totals;
  if (
    linesShowVat ||
    invoice.vatScheme !== "standard" ||
    net === null ||
    vat === null
  ) {
    return lineIssues;
  }
  const expected = vatAt(net, STANDARD_RATE);
  if (withinTolerance(expected, vat)) return lineIssues;
  return [
    ...lineIssues,
    {
      ruleId: "vat-matches-rate",
      field: "totals.vat",
      severity: "error",
      message: `VAT of ${formatPence(vat)} does not match ${STANDARD_RATE}% of the net total ${formatPence(net)} (${formatPence(expected)}).`,
    },
  ];
};
