import { describe, expect, it } from "vitest";
import { WireInvoiceSchema } from "../shared/schema.ts";
import { toInvoice } from "../src/lib/toInvoice.ts";
import { expectedSamples } from "./samples.ts";

const invoiceFor = (name: string) =>
  toInvoice(WireInvoiceSchema.parse(expectedSamples[name]));

describe("toInvoice", () => {
  it("converts money to pence and keeps printed errors", () => {
    const invoice = invoiceFor("arithmetic-error");
    expect(invoice.totals).toEqual({ net: 32140, vat: 6248, gross: 37488 });
    expect(invoice.lineItems[0]).toEqual({
      description: "Tyre 205/55 R16 91V",
      quantity: 2,
      unitPrice: 8950,
      net: 17900,
      vatRate: 20,
      vat: 3580,
    });
  });

  it("keeps null VAT on a margin-scheme invoice", () => {
    const invoice = invoiceFor("used-vehicle-margin-scheme");
    expect(invoice.vatScheme).toBe("margin");
    expect(invoice.totals).toEqual({ net: 845000, vat: null, gross: 845000 });
    expect(invoice.lineItems[0].vat).toBeNull();
  });

  it("copies text fields unchanged", () => {
    const invoice = invoiceFor("invalid-vin");
    expect(invoice.vehicle?.vin).toBe("WDD2050O22F123456");
    expect(invoice.invoiceDate).toBe("2026-09-08");
  });

  it("turns empty or blank text into null", () => {
    const wire = WireInvoiceSchema.parse(expectedSamples["invalid-vin"]);
    wire.supplier.vatNumber = "";
    wire.invoiceNumber = "  ";
    wire.vehicle!.vin = "";
    const invoice = toInvoice(wire);
    expect(invoice.supplier.vatNumber).toBeNull();
    expect(invoice.invoiceNumber).toBeNull();
    expect(invoice.vehicle?.vin).toBeNull();
    expect(invoice.supplier.name).toBe("Stratford Prestige Servicing");
  });

  it.each(Object.keys(expectedSamples))(
    "gives integer pence for %s",
    (name) => {
      const invoice = invoiceFor(name);
      const amounts = [
        ...Object.values(invoice.totals),
        ...invoice.lineItems.flatMap((l) => [l.unitPrice, l.net, l.vat]),
      ];
      for (const amount of amounts) {
        if (amount !== null) expect(Number.isInteger(amount)).toBe(true);
      }
    },
  );
});
