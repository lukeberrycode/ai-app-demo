import { describe, expect, it } from "vitest";
import {
  appendEntry,
  auditedReducer,
  exportJson,
  startAudit,
  toAuditRecord,
  type AuditEntry,
  type AuditedReview,
  type TimedAction,
} from "../src/lib/audit.ts";
import type { ReviewAction } from "../src/lib/review.ts";
import { context, invoiceWith, validInvoice } from "./validation/fixture.ts";

const ID = "inv-1";
const T0 = "2026-09-30T10:00:00.000Z";
let tick = 0;
const at = () => `2026-09-30T10:00:${String(++tick).padStart(2, "0")}.000Z`;

const start = (invoice = validInvoice()) => startAudit(ID, invoice, T0);
const run = (state: AuditedReview, ...actions: ReviewAction[]) =>
  actions.reduce<AuditedReview>(
    (s, action) =>
      auditedReducer(s, { action, at: at() } satisfies TimedAction),
    state,
  );
const actions = (state: AuditedReview) => state.entries.map((e) => e.action);

// Net total wrong by £1: two errors.
const withSumError = () => start(invoiceWith((i) => (i.totals.net = 13450)));
const sumKey = "line-items-sum-to-net@totals.net";

describe("audit trail", () => {
  it("starts with an extracted entry", () => {
    expect(start().entries).toEqual([
      { timestamp: T0, invoiceId: ID, action: "extracted", actor: "demo-user" },
    ]);
  });

  it("records an edit with before and after in pence", () => {
    const state = run(withSumError(), {
      type: "edit",
      field: "totals.net",
      value: 13350,
    });
    expect(state.entries.at(-1)).toEqual({
      timestamp: expect.any(String),
      invoiceId: ID,
      action: "edited",
      field: "totals.net",
      before: 13450,
      after: 13350,
      actor: "demo-user",
    });
  });

  it("merges consecutive edits to one field, keeping the first before", () => {
    const state = run(
      start(),
      { type: "edit", field: "invoiceNumber", value: "M" },
      { type: "edit", field: "invoiceNumber", value: "MM" },
      { type: "edit", field: "invoiceNumber", value: "MMP-1" },
    );
    expect(state.entries.slice(1)).toEqual([
      expect.objectContaining({
        field: "invoiceNumber",
        before: "MMP-10482",
        after: "MMP-1",
      }),
    ]);
    expect(state.entries.at(-1)!.timestamp).toBe(
      `2026-09-30T10:00:${String(tick).padStart(2, "0")}.000Z`,
    );
  });

  it("drops an edit that ends where it started", () => {
    const state = run(
      start(),
      { type: "edit", field: "invoiceNumber", value: "X" },
      { type: "edit", field: "invoiceNumber", value: "MMP-10482" },
    );
    expect(actions(state)).toEqual(["extracted"]);
  });

  it("drops an edit that changes nothing", () => {
    const state = run(start(), {
      type: "edit",
      field: "currency",
      value: "GBP",
    });
    expect(actions(state)).toEqual(["extracted"]);
  });

  it("keeps edits to different fields separate", () => {
    const state = run(
      start(),
      { type: "edit", field: "invoiceNumber", value: "A" },
      { type: "edit", field: "currency", value: "EUR" },
      { type: "edit", field: "invoiceNumber", value: "B" },
    );
    expect(
      state.entries.slice(1).map((e) => [e.field, e.before, e.after]),
    ).toEqual([
      ["invoiceNumber", "MMP-10482", "A"],
      ["currency", "GBP", "EUR"],
      ["invoiceNumber", "A", "B"],
    ]);
  });

  it("records added and removed lines", () => {
    const state = run(
      start(),
      { type: "addLine" },
      { type: "removeLine", index: 0 },
    );
    expect(state.entries.slice(1)).toEqual([
      expect.objectContaining({
        action: "edited",
        field: "lineItems[2]",
        before: null,
        after: expect.objectContaining({ description: null }),
      }),
      expect.objectContaining({
        action: "edited",
        field: "lineItems[0]",
        before: expect.objectContaining({
          description: "Brake pads",
          net: 4500,
        }),
        after: null,
      }),
    ]);
  });

  it("records overrides with rule, field and reason, and their removal", () => {
    const state = run(
      withSumError(),
      { type: "override", issueKey: sumKey, reason: "  Supplier confirmed  " },
      { type: "undoOverride", issueKey: sumKey },
    );
    expect(state.entries.slice(1)).toEqual([
      expect.objectContaining({
        action: "overridden",
        ruleId: "line-items-sum-to-net",
        field: "totals.net",
        reason: "Supplier confirmed",
      }),
      expect.objectContaining({
        action: "override_removed",
        ruleId: "line-items-sum-to-net",
        field: "totals.net",
        reason: "Supplier confirmed",
      }),
    ]);
  });

  it("records nothing for undoing an override that does not exist", () => {
    const state = run(start(), { type: "undoOverride", issueKey: sumKey });
    expect(actions(state)).toEqual(["extracted"]);
  });

  it("records nothing for refused actions", () => {
    const refused = run(
      withSumError(),
      { type: "override", issueKey: sumKey, reason: "   " },
      { type: "approve", context },
    );
    expect(actions(refused)).toEqual(["extracted"]);
    const decided = run(
      start(),
      { type: "reject" },
      { type: "edit", field: "invoiceNumber", value: "X" },
    );
    expect(actions(decided)).toEqual(["extracted", "rejected"]);
  });

  it("records approval", () => {
    const state = run(start(), { type: "approve", context });
    expect(state.entries.at(-1)).toEqual(
      expect.objectContaining({ action: "approved", actor: "demo-user" }),
    );
    expect(state.review.status).toBe("approved");
  });

  it("does not merge whole-line entries", () => {
    const entry = (field: string): AuditEntry => ({
      timestamp: T0,
      invoiceId: ID,
      action: "edited",
      field,
      before: null,
      after: { n: 1 },
      actor: "demo-user",
    });
    expect(
      appendEntry([entry("lineItems[2]")], entry("lineItems[2]")),
    ).toHaveLength(2);
  });
});

describe("audit record", () => {
  it("keeps the raw model output, the extracted and current invoice, and the trail", () => {
    const extracted = invoiceWith((i) => (i.totals.net = 13450));
    const raw = { any: "model output", totals: { net: 134.5 } };
    const state = run(
      start(extracted),
      { type: "override", issueKey: sumKey, reason: "Checked" },
      { type: "edit", field: "totals.gross", value: 16120 },
      { type: "approve", context },
    );
    const record = toAuditRecord(state, {
      fileName: "a.pdf",
      rawModelOutput: raw,
      extracted,
    });
    expect(record).toMatchObject({
      invoiceId: ID,
      fileName: "a.pdf",
      status: "approved",
      updatedAt: state.entries.at(-1)!.timestamp,
      rawModelOutput: raw,
      extracted,
      overrides: [
        {
          ruleId: "line-items-sum-to-net",
          field: "totals.net",
          reason: "Checked",
        },
      ],
    });
    expect(record.current.totals.gross).toBe(16120);
    expect(record.extracted.totals.gross).toBe(16020);
    expect(record.entries.map((e) => e.action)).toEqual([
      "extracted",
      "overridden",
      "edited",
      "approved",
    ]);
    expect(JSON.parse(exportJson(record))).toEqual(record);
  });
});
