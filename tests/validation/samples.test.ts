import { describe, expect, it } from "vitest";
import { WireInvoiceSchema } from "../../shared/schema.ts";
import { validateInvoice } from "../../src/core/validation/index.ts";
import { toInvoice } from "../../src/lib/toInvoice.ts";
import { expectedSamples } from "../samples.ts";
import { context } from "./fixture.ts";

// What each sample invoice is designed to trigger (see samples/README.md).
const designed: Record<string, [ruleId: string, severity: string][]> = {
  "parts-supplier-clean": [],
  "bodyshop-multi-line": [],
  "used-vehicle-margin-scheme": [["margin-scheme-no-vat", "warning"]],
  "arithmetic-error": [
    ["line-items-sum-to-net", "error"],
    ["net-plus-vat-equals-gross", "error"],
  ],
  "invalid-vin": [["vin-format", "error"]],
  "photographed-service-invoice": [["registration-format", "warning"]],
};

describe("sample invoices", () => {
  it("covers every sample", () => {
    expect(Object.keys(designed).sort()).toEqual(
      Object.keys(expectedSamples).sort(),
    );
  });

  it.each(Object.entries(designed))(
    "%s raises exactly its designed issues",
    (name, issues) => {
      const invoice = toInvoice(WireInvoiceSchema.parse(expectedSamples[name]));
      expect(
        validateInvoice(invoice, context).map((issue) => [
          issue.ruleId,
          issue.severity,
        ]),
      ).toEqual(issues);
    },
  );
});
