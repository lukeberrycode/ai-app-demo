import { describe, expect, it } from "vitest";
import {
  getField,
  initialReview,
  issueKey,
  reviewReducer,
  setField,
  summarise,
  type ReviewAction,
  type ReviewState,
} from "../src/lib/review.ts";
import { context, invoiceWith, validInvoice } from "./validation/fixture.ts";

const run = (state: ReviewState, ...actions: ReviewAction[]) =>
  actions.reduce(reviewReducer, state);

// Net total wrong by £1: raises line-items-sum-to-net and net-plus-vat-equals-gross.
const withSumError = () =>
  initialReview(invoiceWith((i) => (i.totals.net = 13450)));
const sumKey = "line-items-sum-to-net@totals.net";
const grossKey = "net-plus-vat-equals-gross@totals.gross";

describe("getField / setField", () => {
  const invoice = validInvoice();

  it.each([
    ["invoiceNumber", "MMP-10482"],
    ["vatScheme", "standard"],
    ["supplier.vatNumber", "GB 123 4567 89"],
    ["vehicle.vin", "WF0AXXGCDA1234567"],
    ["totals.gross", 16020],
    ["lineItems[1].vat", 1770],
  ])("reads %s", (field, value) => {
    expect(getField(invoice, field)).toBe(value);
  });

  it.each([
    ["invoiceNumber", "X-1"],
    ["supplier.name", null],
    ["vehicle.registration", "ZZ99 ZZZ"],
    ["totals.vat", 0],
    ["lineItems[0].quantity", 3],
  ])("writes %s without changing the original", (field, value) => {
    const updated = setField(invoice, field, value);
    expect(getField(updated, field)).toBe(value);
    expect(getField(invoice, field)).toEqual(getField(validInvoice(), field));
  });

  it("creates a vehicle when editing one that is missing", () => {
    const noVehicle = invoiceWith((i) => (i.vehicle = null));
    expect(getField(noVehicle, "vehicle.vin")).toBeNull();
    expect(setField(noVehicle, "vehicle.vin", "ABC").vehicle).toEqual({
      registration: null,
      vin: "ABC",
      make: null,
      model: null,
    });
  });

  it.each([
    "nope",
    "supplier.phone",
    "totals",
    "lineItems[9].vat",
    "lineItems[0].colour",
    "vehicle.colour",
  ])("rejects unknown field %s", (field) => {
    expect(() => getField(invoice, field)).toThrow("Unknown invoice field");
    expect(() => setField(invoice, field, "x")).toThrow(
      "Unknown invoice field",
    );
  });
});

describe("summarise", () => {
  it("counts errors and warnings and allows approval of a clean invoice", () => {
    const summary = summarise(initialReview(validInvoice()), context);
    expect(summary).toMatchObject({
      issues: [],
      unresolved: [],
      canApprove: true,
    });
  });

  it("blocks approval while errors are unresolved", () => {
    const summary = summarise(withSumError(), context);
    expect(summary.errors.map(issueKey)).toEqual([sumKey, grossKey]);
    expect(summary.unresolved).toHaveLength(2);
    expect(summary.canApprove).toBe(false);
  });

  it("does not let warnings block approval", () => {
    const state = initialReview(invoiceWith((i) => (i.currency = "EUR")));
    const summary = summarise(state, context);
    expect(summary.warnings).toHaveLength(1);
    expect(summary.canApprove).toBe(true);
  });
});

describe("reviewReducer", () => {
  it("re-validates after an edit fixes the error", () => {
    const fixed = run(withSumError(), {
      type: "edit",
      field: "totals.net",
      value: 13350,
    });
    expect(summarise(fixed, context).errors).toEqual([]);
  });

  it("needs every error overridden before approval", () => {
    const once = run(withSumError(), {
      type: "override",
      issueKey: sumKey,
      reason: "Supplier confirmed by phone",
    });
    expect(summarise(once, context).unresolved.map(issueKey)).toEqual([
      grossKey,
    ]);
    expect(run(once, { type: "approve", context }).status).toBe("reviewing");

    const twice = run(once, {
      type: "override",
      issueKey: grossKey,
      reason: "Same typo",
    });
    expect(summarise(twice, context).canApprove).toBe(true);
    expect(run(twice, { type: "approve", context }).status).toBe("approved");
  });

  it("requires a reason to override", () => {
    const state = withSumError();
    expect(
      run(state, { type: "override", issueKey: sumKey, reason: "   " }),
    ).toBe(state);
  });

  it("trims the override reason", () => {
    const state = run(withSumError(), {
      type: "override",
      issueKey: sumKey,
      reason: "  ok  ",
    });
    expect(state.overrides[sumKey]).toBe("ok");
  });

  it("undoes an override", () => {
    const state = run(
      withSumError(),
      { type: "override", issueKey: sumKey, reason: "ok" },
      { type: "undoOverride", issueKey: sumKey },
    );
    expect(state.overrides).toEqual({});
  });

  it("adds and removes line items", () => {
    const added = run(initialReview(validInvoice()), { type: "addLine" });
    expect(added.invoice.lineItems).toHaveLength(3);
    expect(added.invoice.lineItems[2]).toEqual({
      description: null,
      quantity: null,
      unitPrice: null,
      net: null,
      vatRate: null,
      vat: null,
    });
    const removed = run(added, { type: "removeLine", index: 0 });
    expect(removed.invoice.lineItems.map((l) => l.description)).toEqual([
      "Brake discs",
      null,
    ]);
  });

  it("moves line overrides with their line and drops the removed line's", () => {
    const state: ReviewState = {
      ...initialReview(validInvoice()),
      overrides: {
        "vat-matches-rate@lineItems[0].vat": "a",
        "vat-matches-rate@lineItems[1].vat": "b",
        [sumKey]: "c",
      },
    };
    expect(run(state, { type: "removeLine", index: 0 }).overrides).toEqual({
      "vat-matches-rate@lineItems[0].vat": "b",
      [sumKey]: "c",
    });
    expect(run(state, { type: "removeLine", index: 1 }).overrides).toEqual({
      "vat-matches-rate@lineItems[0].vat": "a",
      [sumKey]: "c",
    });
  });

  it("rejects regardless of errors", () => {
    expect(run(withSumError(), { type: "reject" }).status).toBe("rejected");
  });

  it.each(["approve", "reject"] as const)(
    "is read-only after %s",
    (decision) => {
      const decided = run(
        initialReview(validInvoice()),
        decision === "approve"
          ? { type: "approve", context }
          : { type: "reject" },
      );
      const actions: ReviewAction[] = [
        { type: "edit", field: "invoiceNumber", value: "changed" },
        { type: "addLine" },
        { type: "removeLine", index: 0 },
        { type: "override", issueKey: sumKey, reason: "x" },
        { type: "undoOverride", issueKey: sumKey },
        { type: "approve", context },
        { type: "reject" },
      ];
      for (const action of actions)
        expect(reviewReducer(decided, action)).toBe(decided);
    },
  );
});
