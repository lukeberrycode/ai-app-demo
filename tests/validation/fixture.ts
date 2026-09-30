import type { Invoice } from "../../src/core/invoice.ts";
import type { ValidationContext } from "../../src/core/validation/index.ts";

export const context: ValidationContext = { today: "2026-09-30" };

/** A standard-rated invoice that passes every rule. */
export function validInvoice(): Invoice {
  return {
    supplier: {
      name: "Midlands Motor Parts Ltd",
      address: "Unit 7, Foundry Lane Trading Estate, Coventry, CV1 4AB",
      vatNumber: "GB 123 4567 89",
    },
    invoiceNumber: "MMP-10482",
    invoiceDate: "2026-09-12",
    dueDate: "2026-10-12",
    currency: "GBP",
    vatScheme: "standard",
    vehicle: {
      registration: "AB12 CDE",
      vin: "WF0AXXGCDA1234567",
      make: "Ford",
      model: "Focus",
    },
    lineItems: [
      {
        description: "Brake pads",
        quantity: 1,
        unitPrice: 4500,
        net: 4500,
        vatRate: 20,
        vat: 900,
      },
      {
        description: "Brake discs",
        quantity: 1,
        unitPrice: 8850,
        net: 8850,
        vatRate: 20,
        vat: 1770,
      },
    ],
    totals: { net: 13350, vat: 2670, gross: 16020 },
    extractionNotes: [],
  };
}

/** A valid invoice with one change applied. */
export function invoiceWith(change: (invoice: Invoice) => void): Invoice {
  const invoice = validInvoice();
  change(invoice);
  return invoice;
}
