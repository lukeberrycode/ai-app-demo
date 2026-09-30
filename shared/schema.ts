// Wire schema: the shape the model returns, used by the extract function
// (sent to the API as the structured-output JSON schema, then used to parse
// the response) and by the front end (to parse the function's response).
// Money is decimal pounds exactly as printed. See CLAUDE.md §3.3.

import { z } from "zod";

// Printed money has at most two decimal places. The API cannot enforce this,
// so it is checked here, after the response arrives.
const money = z
  .number()
  .refine(
    (pounds) => Math.abs(pounds * 100 - Math.round(pounds * 100)) < 1e-6,
    {
      message: "Money must be whole pence (at most two decimal places).",
    },
  );

const nullableMoney = money.nullable();

// Text fields use an empty string, not null, for "absent". The API caps a
// structured-output schema at 16 union-typed (nullable) fields (verified
// 2026-09-30), and making text non-nullable keeps this schema at 11. Numbers,
// dates and the vehicle stay nullable. toInvoice() maps "" to null.
const text = z.string();
const isoDate = z.iso
  .date()
  .nullable()
  .describe(
    "ISO 8601 date (YYYY-MM-DD). UK invoices print dates day first, so 03/09/2026 is 2026-09-03.",
  );

export const VAT_SCHEMES = [
  "standard",
  "margin",
  "zero-rated",
  "unknown",
] as const;

export const WireInvoiceSchema = z.object({
  supplier: z.object({
    name: text.describe("The business that issued the invoice."),
    address: text.describe(
      "Supplier address as one line, parts separated by commas.",
    ),
    vatNumber: text.describe(
      "Supplier VAT registration number exactly as printed.",
    ),
  }),
  invoiceNumber: text,
  invoiceDate: isoDate,
  dueDate: isoDate,
  currency: text.describe(
    "ISO 4217 code, e.g. GBP. Use GBP when amounts are shown in £.",
  ),
  vatScheme: z
    .enum(VAT_SCHEMES)
    .describe(
      "margin: the invoice states the second-hand margin scheme and shows no VAT. zero-rated: every line is at 0%. standard: VAT is charged at stated rates. unknown: cannot tell.",
    ),
  vehicle: z
    .object({
      registration: text.describe("Registration as printed, e.g. AB12 CDE."),
      vin: text.describe(
        "VIN exactly as printed, character by character. Never correct it, even if it looks wrong.",
      ),
      make: text.describe("Manufacturer only, e.g. Ford."),
      model: text.describe("Model only, e.g. Focus."),
    })
    .nullable()
    .describe("The vehicle the invoice relates to, or null if none is shown."),
  lineItems: z.array(
    z.object({
      description: text.describe(
        "Line description only, as printed. Leave out part numbers and codes printed in their own column.",
      ),
      quantity: z.number().nullable(),
      unitPrice: nullableMoney,
      net: nullableMoney.describe("Line amount before VAT, as printed."),
      vatRate: z
        .number()
        .nullable()
        .describe(
          "VAT rate as a percentage number, e.g. 20 for 20%. Null if no rate is shown.",
        ),
      vat: nullableMoney.describe(
        "Line VAT amount as printed. Null if not shown.",
      ),
    }),
  ),
  totals: z.object({
    net: nullableMoney.describe("Net total (or sub-total) as printed."),
    vat: nullableMoney.describe(
      "VAT total as printed. Null if no VAT is shown.",
    ),
    gross: nullableMoney.describe("Total due as printed."),
  }),
  extractionNotes: z
    .array(z.string())
    .describe(
      "Short notes on anything ambiguous, illegible or unusual. Empty if none.",
    ),
});

export type WireInvoice = z.infer<typeof WireInvoiceSchema>;

// The extract function's success response.
export const ExtractResponseSchema = z.object({
  invoice: WireInvoiceSchema,
  raw: z.unknown(),
});
