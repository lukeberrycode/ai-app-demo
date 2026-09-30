import { describe, expect, it } from "vitest";
import { fieldLabel } from "../src/lib/fieldLabels.ts";

describe("fieldLabel", () => {
  it.each([
    ["supplier.vatNumber", "VAT number"],
    ["totals.net", "Net total"],
    ["vehicle.vin", "VIN"],
    ["vatScheme", "VAT scheme"],
    ["lineItems[0].vat", "Line 1 VAT"],
    ["lineItems[2].unitPrice", "Line 3 unit price"],
    ["lineItems[7]", "Line 8"],
  ])("%s → %s", (field, label) => {
    expect(fieldLabel(field)).toBe(label);
  });

  it("falls back to the path for anything unknown", () => {
    expect(fieldLabel("somethingElse")).toBe("somethingElse");
    expect(fieldLabel("lineItems[0].colour")).toBe("lineItems[0].colour");
  });

  it("names every field the validation rules can report", async () => {
    const { validateInvoice } = await import("../src/core/validation/index.ts");
    const { invoiceWith } = await import("./validation/fixture.ts");
    const broken = invoiceWith((i) => {
      i.supplier.name = null;
      i.supplier.vatNumber = "X";
      i.invoiceNumber = null;
      i.invoiceDate = "2030-01-01";
      i.dueDate = "2029-01-01";
      i.currency = "EUR";
      i.vatScheme = "margin";
      i.vehicle = { registration: "X", vin: "O", make: null, model: null };
      i.lineItems[0].vat = 1;
      i.totals = { net: 1, vat: 5, gross: null };
    });
    for (const issue of validateInvoice(broken, { today: "2026-09-30" })) {
      expect(fieldLabel(issue.field)).not.toBe(issue.field);
    }
  });
});
