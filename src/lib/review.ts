// Review state for one invoice: the editable invoice, error overrides and the
// final decision. A pure reducer, so every user action is a plain object
// (the audit trail in Step 5 records these) and the logic is unit-tested.

import type { Invoice, Issue, LineItem } from "../core/invoice.ts";
import {
  validateInvoice,
  type ValidationContext,
} from "../core/validation/index.ts";

export type ReviewStatus = "reviewing" | "approved" | "rejected";

export interface ReviewState {
  invoice: Invoice;
  /** Override reasons, keyed by issueKey(). */
  overrides: Record<string, string>;
  status: ReviewStatus;
}

export type FieldValue = string | number | null;

export type ReviewAction =
  | { type: "edit"; field: string; value: FieldValue }
  | { type: "addLine" }
  | { type: "removeLine"; index: number }
  | { type: "override"; issueKey: string; reason: string }
  | { type: "undoOverride"; issueKey: string }
  | { type: "approve"; context: ValidationContext }
  | { type: "reject" };

export function initialReview(invoice: Invoice): ReviewState {
  return { invoice, overrides: {}, status: "reviewing" };
}

/** Identifies an issue across re-validation: one rule, one field. */
export function issueKey(issue: Pick<Issue, "ruleId" | "field">): string {
  return `${issue.ruleId}@${issue.field}`;
}

export interface ReviewSummary {
  issues: Issue[];
  errors: Issue[];
  warnings: Issue[];
  /** Errors without an override. */
  unresolved: Issue[];
  canApprove: boolean;
}

export function summarise(
  state: ReviewState,
  context: ValidationContext,
): ReviewSummary {
  const issues = validateInvoice(state.invoice, context);
  const errors = issues.filter((issue) => issue.severity === "error");
  const unresolved = errors.filter(
    (issue) => !(issueKey(issue) in state.overrides),
  );
  return {
    issues,
    errors,
    warnings: issues.filter((issue) => issue.severity === "warning"),
    unresolved,
    canApprove: unresolved.length === 0,
  };
}

export function reviewReducer(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  // A decided invoice is read-only.
  if (state.status !== "reviewing") return state;

  switch (action.type) {
    case "edit":
      return {
        ...state,
        invoice: setField(state.invoice, action.field, action.value),
      };
    case "addLine":
      return {
        ...state,
        invoice: {
          ...state.invoice,
          lineItems: [...state.invoice.lineItems, emptyLine()],
        },
      };
    case "removeLine":
      return {
        ...state,
        invoice: {
          ...state.invoice,
          lineItems: state.invoice.lineItems.filter(
            (_, i) => i !== action.index,
          ),
        },
        overrides: shiftLineOverrides(state.overrides, action.index),
      };
    case "override": {
      const reason = action.reason.trim();
      if (reason === "") return state;
      return {
        ...state,
        overrides: { ...state.overrides, [action.issueKey]: reason },
      };
    }
    case "undoOverride": {
      const { [action.issueKey]: _removed, ...overrides } = state.overrides;
      void _removed;
      return { ...state, overrides };
    }
    case "approve":
      return summarise(state, action.context).canApprove
        ? { ...state, status: "approved" }
        : state;
    case "reject":
      return { ...state, status: "rejected" };
  }
}

function emptyLine(): LineItem {
  return {
    description: null,
    quantity: null,
    unitPrice: null,
    net: null,
    vatRate: null,
    vat: null,
  };
}

// Overrides on line fields follow their line when an earlier line is removed,
// and overrides on the removed line are dropped.
function shiftLineOverrides(
  overrides: Record<string, string>,
  removed: number,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, reason] of Object.entries(overrides)) {
    const match = /^(.*@lineItems\[)(\d+)(\].*)$/.exec(key);
    if (!match) {
      result[key] = reason;
      continue;
    }
    const index = Number(match[2]);
    if (index === removed) continue;
    const shifted = index > removed ? index - 1 : index;
    result[`${match[1]}${shifted}${match[3]}`] = reason;
  }
  return result;
}

// Field paths match Issue.field: "invoiceNumber", "supplier.name",
// "vehicle.vin", "totals.net", "lineItems[2].vat".

const TOP_LEVEL = [
  "invoiceNumber",
  "invoiceDate",
  "dueDate",
  "currency",
  "vatScheme",
] as const;
const GROUPS = {
  supplier: ["name", "address", "vatNumber"],
  vehicle: ["registration", "vin", "make", "model"],
  totals: ["net", "vat", "gross"],
} as const;
const LINE_FIELDS = [
  "description",
  "quantity",
  "unitPrice",
  "net",
  "vatRate",
  "vat",
] as const;

export function getField(invoice: Invoice, field: string): FieldValue {
  const line = /^lineItems\[(\d+)\]\.(\w+)$/.exec(field);
  if (line) {
    const item = invoice.lineItems[Number(line[1])];
    const key = line[2] as (typeof LINE_FIELDS)[number];
    if (!item || !LINE_FIELDS.includes(key)) throw unknownField(field);
    return item[key];
  }
  const [group, key] = field.split(".");
  if (key === undefined) {
    if (!(TOP_LEVEL as readonly string[]).includes(group)) {
      throw unknownField(field);
    }
    return invoice[group as (typeof TOP_LEVEL)[number]];
  }
  if (!isGroupField(group, key)) throw unknownField(field);
  if (group === "vehicle") {
    return (
      invoice.vehicle?.[key as keyof NonNullable<Invoice["vehicle"]>] ?? null
    );
  }
  return (invoice[group] as unknown as Record<string, FieldValue>)[key];
}

/** Returns a copy of the invoice with one field changed. */
export function setField(
  invoice: Invoice,
  field: string,
  value: FieldValue,
): Invoice {
  const line = /^lineItems\[(\d+)\]\.(\w+)$/.exec(field);
  if (line) {
    const index = Number(line[1]);
    const key = line[2] as (typeof LINE_FIELDS)[number];
    if (!invoice.lineItems[index] || !LINE_FIELDS.includes(key)) {
      throw unknownField(field);
    }
    return {
      ...invoice,
      lineItems: invoice.lineItems.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    };
  }
  const [group, key] = field.split(".");
  if (key === undefined) {
    if (!(TOP_LEVEL as readonly string[]).includes(group)) {
      throw unknownField(field);
    }
    return { ...invoice, [group]: value };
  }
  if (!isGroupField(group, key)) throw unknownField(field);
  if (group === "vehicle") {
    const vehicle = invoice.vehicle ?? {
      registration: null,
      vin: null,
      make: null,
      model: null,
    };
    return { ...invoice, vehicle: { ...vehicle, [key]: value } };
  }
  return { ...invoice, [group]: { ...invoice[group], [key]: value } };
}

function isGroupField(
  group: string,
  key: string,
): group is keyof typeof GROUPS {
  return (
    group in GROUPS &&
    (GROUPS[group as keyof typeof GROUPS] as readonly string[]).includes(key)
  );
}

function unknownField(field: string): Error {
  return new Error(`Unknown invoice field: ${field}`);
}
