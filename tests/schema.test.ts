import { describe, expect, it } from "vitest";
import { WireInvoiceSchema, type WireInvoice } from "../shared/schema.ts";
import { expectedSamples } from "./samples.ts";

describe("WireInvoiceSchema", () => {
  it("has ground truth for all six samples", () => {
    expect(Object.keys(expectedSamples)).toHaveLength(6);
  });

  it.each(Object.entries(expectedSamples))(
    "accepts ground truth %s",
    (_, json) => {
      expect(WireInvoiceSchema.safeParse(json).success).toBe(true);
    },
  );

  const base = expectedSamples["parts-supplier-clean"] as WireInvoice;
  const withChange = (change: (i: WireInvoice) => void) => {
    const copy = structuredClone(base);
    change(copy);
    return WireInvoiceSchema.safeParse(copy);
  };

  it("rejects money with more than two decimal places", () => {
    expect(withChange((i) => (i.totals.gross = 217.625)).success).toBe(false);
  });

  it("rejects dates that are not ISO", () => {
    expect(withChange((i) => (i.invoiceDate = "12/09/2026")).success).toBe(
      false,
    );
  });

  it("rejects an unknown VAT scheme", () => {
    expect(
      withChange((i) => ((i as { vatScheme: string }).vatScheme = "reduced"))
        .success,
    ).toBe(false);
  });

  it("rejects a VAT rate given as text", () => {
    expect(
      withChange(
        (i) => ((i.lineItems[0] as { vatRate: unknown }).vatRate = "20%"),
      ).success,
    ).toBe(false);
  });

  it("rejects missing fields and non-objects", () => {
    expect(
      withChange((i) => delete (i as Partial<WireInvoice>).totals).success,
    ).toBe(false);
    expect(WireInvoiceSchema.safeParse("not json").success).toBe(false);
    expect(WireInvoiceSchema.safeParse(null).success).toBe(false);
  });

  it("uses empty strings, not null, for absent text", () => {
    expect(withChange((i) => (i.invoiceNumber = "")).success).toBe(true);
    expect(
      withChange(
        (i) => ((i as { invoiceNumber: unknown }).invoiceNumber = null),
      ).success,
    ).toBe(false);
  });

  it("accepts nulls for absent numbers, dates and vehicle", () => {
    expect(
      withChange((i) => {
        i.vehicle = null;
        i.dueDate = null;
        i.totals.vat = null;
        i.lineItems[0].vatRate = null;
      }).success,
    ).toBe(true);
  });
});
