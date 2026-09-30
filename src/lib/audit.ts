// Audit trail for one invoice (CLAUDE.md §3.6). The audited reducer wraps the
// review reducer: every action that changes the review appends an entry, and
// actions the review refuses (approving with errors left, overriding without
// a reason, editing a decided invoice) record nothing. Time is passed in.

import type { Invoice } from "../core/invoice.ts";
import {
  getField,
  initialReview,
  reviewReducer,
  type ReviewAction,
  type ReviewState,
  type ReviewStatus,
} from "./review.ts";

export const ACTOR = "demo-user";

export type AuditAction =
  | "extracted"
  | "edited"
  | "overridden"
  | "override_removed"
  | "approved"
  | "rejected";

/** Money values are integer pence, as in the core Invoice. */
export type AuditValue = unknown;

export interface AuditEntry {
  timestamp: string; // ISO 8601
  invoiceId: string;
  action: AuditAction;
  field?: string;
  ruleId?: string;
  before?: AuditValue;
  after?: AuditValue;
  reason?: string;
  actor: typeof ACTOR;
}

export interface AuditedReview {
  invoiceId: string;
  review: ReviewState;
  entries: AuditEntry[];
}

export interface TimedAction {
  action: ReviewAction;
  at: string; // ISO 8601
}

export function startAudit(
  invoiceId: string,
  extracted: Invoice,
  at: string,
): AuditedReview {
  return {
    invoiceId,
    review: initialReview(extracted),
    entries: [{ timestamp: at, invoiceId, action: "extracted", actor: ACTOR }],
  };
}

export function auditedReducer(
  state: AuditedReview,
  { action, at }: TimedAction,
): AuditedReview {
  const review = reviewReducer(state.review, action);
  if (review === state.review) return state;
  const entry = describe(action, state.review, review);
  return {
    ...state,
    review,
    entries: entry
      ? appendEntry(state.entries, {
          ...entry,
          timestamp: at,
          invoiceId: state.invoiceId,
          actor: ACTOR,
        })
      : state.entries,
  };
}

type EntryDetails = Omit<AuditEntry, "timestamp" | "invoiceId" | "actor">;

function describe(
  action: ReviewAction,
  before: ReviewState,
  after: ReviewState,
): EntryDetails | null {
  switch (action.type) {
    case "edit":
      return {
        action: "edited",
        field: action.field,
        before: getField(before.invoice, action.field),
        after: action.value,
      };
    case "addLine": {
      const index = after.invoice.lineItems.length - 1;
      return {
        action: "edited",
        field: `lineItems[${index}]`,
        before: null,
        after: after.invoice.lineItems[index],
      };
    }
    case "removeLine":
      return {
        action: "edited",
        field: `lineItems[${action.index}]`,
        before: before.invoice.lineItems[action.index],
        after: null,
      };
    case "override": {
      const [ruleId, field] = splitIssueKey(action.issueKey);
      return {
        action: "overridden",
        ruleId,
        field,
        reason: after.overrides[action.issueKey],
      };
    }
    case "undoOverride": {
      const reason = before.overrides[action.issueKey];
      if (reason === undefined) return null;
      const [ruleId, field] = splitIssueKey(action.issueKey);
      return { action: "override_removed", ruleId, field, reason };
    }
    case "approve":
      return { action: "approved" };
    case "reject":
      return { action: "rejected" };
  }
}

function splitIssueKey(key: string): [ruleId: string, field: string] {
  const at = key.indexOf("@");
  return [key.slice(0, at), key.slice(at + 1)];
}

/**
 * Appends an entry. Consecutive edits to the same field (keystrokes) merge
 * into one entry, keeping the first "before" and the latest "after"; an edit
 * that ends where it started is dropped.
 */
export function appendEntry(
  entries: AuditEntry[],
  entry: AuditEntry,
): AuditEntry[] {
  const last = entries.at(-1);
  const isWholeLine = /^lineItems\[\d+\]$/.test(entry.field ?? "");
  if (
    entry.action === "edited" &&
    last?.action === "edited" &&
    last.field === entry.field &&
    !isWholeLine
  ) {
    const merged = { ...last, after: entry.after, timestamp: entry.timestamp };
    const rest = entries.slice(0, -1);
    return sameValue(merged.before, merged.after) ? rest : [...rest, merged];
  }
  if (entry.action === "edited" && sameValue(entry.before, entry.after)) {
    return entries;
  }
  return [...entries, entry];
}

function sameValue(a: AuditValue, b: AuditValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Everything kept about one reviewed invoice; exported as JSON. */
export interface AuditRecord {
  invoiceId: string;
  fileName: string;
  status: ReviewStatus;
  updatedAt: string;
  /** The model's output exactly as received, before any parsing. */
  rawModelOutput: unknown;
  /** The invoice as extracted, in pence. */
  extracted: Invoice;
  /** The invoice as it stands after review. */
  current: Invoice;
  overrides: { ruleId: string; field: string; reason: string }[];
  entries: AuditEntry[];
}

export function toAuditRecord(
  state: AuditedReview,
  details: { fileName: string; rawModelOutput: unknown; extracted: Invoice },
): AuditRecord {
  return {
    invoiceId: state.invoiceId,
    fileName: details.fileName,
    status: state.review.status,
    updatedAt: state.entries.at(-1)!.timestamp,
    rawModelOutput: details.rawModelOutput,
    extracted: details.extracted,
    current: state.review.invoice,
    overrides: Object.entries(state.review.overrides).map(([key, reason]) => {
      const [ruleId, field] = splitIssueKey(key);
      return { ruleId, field, reason };
    }),
    entries: state.entries,
  };
}

export function exportJson(record: AuditRecord): string {
  return JSON.stringify(record, null, 2) + "\n";
}
