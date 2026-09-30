import { describe, expect, it } from "vitest";
import {
  lineItemsSumToNet,
  netPlusVatEqualsGross,
  vatMatchesRate,
} from "../../src/core/validation/arithmetic.ts";
import { currencyIsGbp } from "../../src/core/validation/currency.ts";
import {
  dateFormat,
  dueDateOnOrAfterInvoiceDate,
  invoiceDateNotInFuture,
  isIsoDate,
} from "../../src/core/validation/dates.ts";
import { marginSchemeNoVat } from "../../src/core/validation/marginScheme.ts";
import { requiredFields } from "../../src/core/validation/required.ts";
import { vatNumberFormat } from "../../src/core/validation/supplier.ts";
import {
  registrationFormat,
  vinFormat,
} from "../../src/core/validation/vehicle.ts";
import { rules, validateInvoice } from "../../src/core/validation/index.ts";
import { context, invoiceWith, validInvoice } from "./fixture.ts";

describe("the valid fixture", () => {
  it("passes every rule", () => {
    expect(validateInvoice(validInvoice(), context)).toEqual([]);
  });

  it.each(rules.map((rule) => [rule.name, rule]))("passes %s", (_, rule) => {
    expect(rule(validInvoice(), context)).toEqual([]);
  });
});

describe("required-fields", () => {
  it.each([
    ["supplier.name", (i) => (i.supplier.name = null)],
    ["invoiceNumber", (i) => (i.invoiceNumber = null)],
    ["invoiceDate", (i) => (i.invoiceDate = null)],
    ["totals.gross", (i) => (i.totals.gross = null)],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "flags a missing %s",
    (field, change) => {
      expect(requiredFields(invoiceWith(change), context)).toEqual([
        expect.objectContaining({
          ruleId: "required-fields",
          field,
          severity: "error",
        }),
      ]);
    },
  );

  it("reports every missing field", () => {
    const invoice = invoiceWith((i) => {
      i.supplier.name = null;
      i.totals.gross = null;
    });
    expect(
      requiredFields(invoice, context).map((issue) => issue.field),
    ).toEqual(["supplier.name", "totals.gross"]);
  });

  it("does not require optional fields", () => {
    const invoice = invoiceWith((i) => {
      i.dueDate = null;
      i.vehicle = null;
      i.supplier.vatNumber = null;
    });
    expect(requiredFields(invoice, context)).toEqual([]);
  });
});

describe("line-items-sum-to-net", () => {
  it("flags a net total that differs from the line sum", () => {
    const issues = lineItemsSumToNet(
      invoiceWith((i) => (i.totals.net = 13530)),
      context,
    );
    expect(issues).toEqual([
      {
        ruleId: "line-items-sum-to-net",
        field: "totals.net",
        severity: "error",
        message: "Line items add up to £133.50, but the net total is £135.30.",
      },
    ]);
  });

  it.each([13349, 13351])("allows ±1p rounding (net %s)", (net) => {
    expect(
      lineItemsSumToNet(
        invoiceWith((i) => (i.totals.net = net)),
        context,
      ),
    ).toEqual([]);
  });

  it("flags a 2p difference", () => {
    expect(
      lineItemsSumToNet(
        invoiceWith((i) => (i.totals.net = 13352)),
        context,
      ),
    ).toHaveLength(1);
  });

  it.each([
    ["the net total is missing", (i) => (i.totals.net = null)],
    ["a line net is missing", (i) => (i.lineItems[0].net = null)],
    ["there are no line items", (i) => (i.lineItems = [])],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "skips when %s",
    (_, change) => {
      expect(lineItemsSumToNet(invoiceWith(change), context)).toEqual([]);
    },
  );
});

describe("net-plus-vat-equals-gross", () => {
  it("flags a gross total that is not net + VAT", () => {
    expect(
      netPlusVatEqualsGross(
        invoiceWith((i) => (i.totals.gross = 16200)),
        context,
      ),
    ).toEqual([
      {
        ruleId: "net-plus-vat-equals-gross",
        field: "totals.gross",
        severity: "error",
        message:
          "Net £133.50 + VAT £26.70 = £160.20, but the gross total is £162.00.",
      },
    ]);
  });

  it.each([16019, 16021])("allows ±1p rounding (gross %s)", (gross) => {
    expect(
      netPlusVatEqualsGross(
        invoiceWith((i) => (i.totals.gross = gross)),
        context,
      ),
    ).toEqual([]);
  });

  it("treats missing VAT as none", () => {
    const noVat = invoiceWith((i) => {
      i.totals.vat = null;
      i.totals.gross = 13350;
    });
    expect(netPlusVatEqualsGross(noVat, context)).toEqual([]);
    const mismatch = invoiceWith((i) => (i.totals.vat = null));
    expect(netPlusVatEqualsGross(mismatch, context)).toEqual([
      expect.objectContaining({
        message: "Net £133.50 (no VAT shown), but the gross total is £160.20.",
      }),
    ]);
  });

  it.each([
    ["net", (i) => (i.totals.net = null)],
    ["gross", (i) => (i.totals.gross = null)],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "skips when %s is missing",
    (_, change) => {
      expect(netPlusVatEqualsGross(invoiceWith(change), context)).toEqual([]);
    },
  );
});

describe("vat-matches-rate", () => {
  it("flags a line whose VAT is not 20% of net", () => {
    expect(
      vatMatchesRate(
        invoiceWith((i) => (i.lineItems[1].vat = 1700)),
        context,
      ),
    ).toEqual([
      {
        ruleId: "vat-matches-rate",
        field: "lineItems[1].vat",
        severity: "error",
        message: "VAT of £17.00 does not match 20% of £88.50 (£17.70).",
      },
    ]);
  });

  it("allows ±1p rounding", () => {
    // 20% of £0.99 is 19.8p: 19p (rounded down) and 20p are both acceptable.
    const invoice = invoiceWith((i) => {
      i.lineItems = [
        {
          description: "Clip",
          quantity: 1,
          unitPrice: 99,
          net: 99,
          vatRate: 20,
          vat: 19,
        },
      ];
    });
    expect(vatMatchesRate(invoice, context)).toEqual([]);
  });

  it.each([
    [5, 225],
    [0, 0],
  ])("accepts a line at a stated %s%%", (rate, vat) => {
    const invoice = invoiceWith((i) => {
      i.lineItems[0].vatRate = rate;
      i.lineItems[0].vat = vat;
    });
    expect(vatMatchesRate(invoice, context)).toEqual([]);
  });

  it("checks lines at 5% against 5%", () => {
    const invoice = invoiceWith((i) => {
      i.lineItems[0].vatRate = 5;
      i.lineItems[0].vat = 900;
    });
    expect(vatMatchesRate(invoice, context)).toEqual([
      expect.objectContaining({ field: "lineItems[0].vat" }),
    ]);
  });

  it("flags VAT charged on a 0% line", () => {
    const invoice = invoiceWith((i) => (i.lineItems[0].vatRate = 0));
    expect(vatMatchesRate(invoice, context)).toEqual([
      expect.objectContaining({ field: "lineItems[0].vat" }),
    ]);
  });

  it("does not check a rate that is not a UK rate", () => {
    const invoice = invoiceWith((i) => (i.lineItems[0].vatRate = 17.5));
    expect(vatMatchesRate(invoice, context)).toEqual([]);
  });

  it.each([
    ["net", (i) => (i.lineItems[0].net = null)],
    ["VAT", (i) => (i.lineItems[0].vat = null)],
    ["rate", (i) => (i.lineItems[0].vatRate = null)],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "skips a line with no %s",
    (_, change) => {
      expect(vatMatchesRate(invoiceWith(change), context)).toEqual([]);
    },
  );

  describe("when no line shows VAT", () => {
    const totalsOnly = (vat: number | null, scheme = "standard" as const) =>
      invoiceWith((i) => {
        i.vatScheme = scheme;
        for (const line of i.lineItems) {
          line.vat = null;
          line.vatRate = null;
        }
        i.totals.vat = vat;
      });

    it("checks the VAT total at 20% of the net total", () => {
      expect(vatMatchesRate(totalsOnly(2670), context)).toEqual([]);
      expect(vatMatchesRate(totalsOnly(2500), context)).toEqual([
        {
          ruleId: "vat-matches-rate",
          field: "totals.vat",
          severity: "error",
          message:
            "VAT of £25.00 does not match 20% of the net total £133.50 (£26.70).",
        },
      ]);
    });

    it("skips non-standard schemes and missing totals", () => {
      expect(
        vatMatchesRate(
          invoiceWith((i) => {
            i.vatScheme = "zero-rated";
            for (const line of i.lineItems) line.vat = null;
            i.totals.vat = 0;
          }),
          context,
        ),
      ).toEqual([]);
      expect(vatMatchesRate(totalsOnly(null), context)).toEqual([]);
      expect(
        vatMatchesRate(
          invoiceWith((i) => {
            for (const line of i.lineItems) line.vat = null;
            i.totals.net = null;
          }),
          context,
        ),
      ).toEqual([]);
    });
  });
});

describe("margin-scheme-no-vat", () => {
  const margin = (change: Parameters<typeof invoiceWith>[0] = () => {}) =>
    invoiceWith((i) => {
      i.vatScheme = "margin";
      i.lineItems = [
        {
          description: "Used car",
          quantity: 1,
          unitPrice: 845000,
          net: 845000,
          vatRate: null,
          vat: null,
        },
      ];
      i.totals = { net: 845000, vat: null, gross: 845000 };
      change(i);
    });

  it("warns that no VAT is shown on a margin-scheme invoice", () => {
    expect(marginSchemeNoVat(margin(), context)).toEqual([
      {
        ruleId: "margin-scheme-no-vat",
        field: "vatScheme",
        severity: "warning",
        message:
          "Margin-scheme invoice: no VAT is shown, which is normal for used vehicles. No input VAT can be reclaimed.",
      },
    ]);
  });

  it("treats £0.00 VAT as no VAT", () => {
    expect(
      marginSchemeNoVat(
        margin((i) => (i.totals.vat = 0)),
        context,
      ),
    ).toEqual([expect.objectContaining({ field: "vatScheme" })]);
  });

  it.each([
    ["in the totals", (i) => (i.totals.vat = 169000)],
    ["on a line", (i) => (i.lineItems[0].vat = 169000)],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "warns when VAT is shown %s",
    (_, change) => {
      expect(marginSchemeNoVat(margin(change), context)).toEqual([
        expect.objectContaining({
          field: "totals.vat",
          severity: "warning",
          message: expect.stringContaining("shows VAT"),
        }),
      ]);
    },
  );

  it("ignores other schemes", () => {
    expect(marginSchemeNoVat(validInvoice(), context)).toEqual([]);
  });

  it("does not trigger other errors on a margin invoice", () => {
    expect(
      validateInvoice(margin(), context).filter(
        (issue) => issue.severity === "error",
      ),
    ).toEqual([]);
  });
});

describe("vin-format", () => {
  const withVin = (vin: string | null) =>
    vinFormat(
      invoiceWith((i) => (i.vehicle!.vin = vin)),
      context,
    );

  it.each(["WF0AXXGCDA1234567", "WVWZZZAUZKW123456", "SAXXRWAXCBD123456"])(
    "accepts %s",
    (vin) => {
      expect(withVin(vin)).toEqual([]);
    },
  );

  it("flags a letter O and gives its position", () => {
    expect(withVin("WDD2050O22F123456")).toEqual([
      {
        ruleId: "vin-format",
        field: "vehicle.vin",
        severity: "error",
        message: "VIN contains O at position 8, which VINs never use.",
      },
    ]);
  });

  it("flags I and Q", () => {
    expect(withVin("WDDI050Q22F123456")[0].message).toBe(
      "VIN contains I at position 4, Q at position 8, which VINs never use.",
    );
  });

  it.each([
    ["WF0AXXGCDA123456", "VIN has 16 characters, not 17."],
    ["WF0AXXGCDA12345678", "VIN has 18 characters, not 17."],
    [
      "WF0AXXGCDA12345O",
      "VIN has 16 characters, not 17 and contains O at position 16, which VINs never use.",
    ],
    [
      "wf0axxgcda1234567",
      "VIN contains characters other than capital letters and digits.",
    ],
    [
      "WF0AXXGCD-1234567",
      "VIN contains characters other than capital letters and digits.",
    ],
  ])("flags %s", (vin, message) => {
    expect(withVin(vin)).toEqual([
      expect.objectContaining({ message, severity: "error" }),
    ]);
  });

  it("does not enforce the North American check digit", () => {
    // Position 9 here is not a valid check digit for this VIN.
    expect(withVin("WF0AXXGCD01234567")).toEqual([]);
  });

  it("skips a missing VIN or vehicle", () => {
    expect(withVin(null)).toEqual([]);
    expect(
      vinFormat(
        invoiceWith((i) => (i.vehicle = null)),
        context,
      ),
    ).toEqual([]);
  });
});

describe("registration-format", () => {
  const withRegistration = (registration: string | null) =>
    registrationFormat(
      invoiceWith((i) => (i.vehicle!.registration = registration)),
      context,
    );

  it.each(["AB12 CDE", "AB12CDE", "ab12 cde", "LD68  XTP", " KX19 LMR "])(
    "accepts %j",
    (registration) => {
      expect(withRegistration(registration)).toEqual([]);
    },
  );

  it.each([
    "P428 KLV", // prefix format
    "ABC 123D", // suffix format
    "1234 AB", // dateless
    "AB12 CD",
  ])("warns for %j", (registration) => {
    expect(withRegistration(registration)).toEqual([
      {
        ruleId: "registration-format",
        field: "vehicle.registration",
        severity: "warning",
        message: `Registration ${registration} is not in the current UK format (e.g. AB12 CDE). Older formats are valid; check it was read correctly.`,
      },
    ]);
  });

  it("skips a missing registration or vehicle", () => {
    expect(withRegistration(null)).toEqual([]);
    expect(
      registrationFormat(
        invoiceWith((i) => (i.vehicle = null)),
        context,
      ),
    ).toEqual([]);
  });
});

describe("vat-number-format", () => {
  const withVatNumber = (vatNumber: string | null) =>
    vatNumberFormat(
      invoiceWith((i) => (i.supplier.vatNumber = vatNumber)),
      context,
    );

  it.each([
    "GB123456789",
    "GB 123 4567 89",
    "gb123456789",
    "GB123456789012",
    "GBGD001",
    "GBHA599",
  ])("accepts %j", (vatNumber) => {
    expect(withVatNumber(vatNumber)).toEqual([]);
  });

  it.each([
    "123456789",
    "GB12345678",
    "GB1234567890",
    "GBGD1234",
    "GBXX123",
    "DE123456789",
  ])("warns for %j", (vatNumber) => {
    expect(withVatNumber(vatNumber)).toEqual([
      expect.objectContaining({
        ruleId: "vat-number-format",
        field: "supplier.vatNumber",
        severity: "warning",
      }),
    ]);
  });

  it("skips a missing VAT number", () => {
    expect(withVatNumber(null)).toEqual([]);
  });
});

describe("date-format", () => {
  it.each(["2026-09-30", "2024-02-29", "2000-02-29", "2026-12-31"])(
    "accepts %s",
    (date) => {
      expect(isIsoDate(date)).toBe(true);
    },
  );

  it.each([
    "2026-02-29",
    "1900-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-04-31",
    "2026-09-00",
    "30/09/2026",
    "2026-9-30",
    "",
  ])("rejects %j", (date) => {
    expect(isIsoDate(date)).toBe(false);
  });

  it("flags invalid invoice and due dates", () => {
    const invoice = invoiceWith((i) => {
      i.invoiceDate = "12/09/2026";
      i.dueDate = "2026-02-30";
    });
    expect(dateFormat(invoice, context)).toEqual([
      {
        ruleId: "date-format",
        field: "invoiceDate",
        severity: "error",
        message: 'Invoice date "12/09/2026" is not a valid date (YYYY-MM-DD).',
      },
      expect.objectContaining({ field: "dueDate", severity: "error" }),
    ]);
  });

  it("skips missing dates", () => {
    expect(
      dateFormat(
        invoiceWith((i) => {
          i.invoiceDate = null;
          i.dueDate = null;
        }),
        context,
      ),
    ).toEqual([]);
  });
});

describe("invoice-date-not-in-future", () => {
  it("flags a date after today", () => {
    expect(
      invoiceDateNotInFuture(
        invoiceWith((i) => (i.invoiceDate = "2026-10-01")),
        context,
      ),
    ).toEqual([
      {
        ruleId: "invoice-date-not-in-future",
        field: "invoiceDate",
        severity: "error",
        message:
          "Invoice date 2026-10-01 is in the future (today is 2026-09-30).",
      },
    ]);
  });

  it("accepts today", () => {
    expect(
      invoiceDateNotInFuture(
        invoiceWith((i) => (i.invoiceDate = "2026-09-30")),
        context,
      ),
    ).toEqual([]);
  });

  it("uses the today it is given", () => {
    const invoice = invoiceWith((i) => (i.invoiceDate = "2026-10-01"));
    expect(invoiceDateNotInFuture(invoice, { today: "2026-10-01" })).toEqual(
      [],
    );
  });

  it("skips missing or invalid dates", () => {
    expect(
      invoiceDateNotInFuture(
        invoiceWith((i) => (i.invoiceDate = null)),
        context,
      ),
    ).toEqual([]);
    expect(
      invoiceDateNotInFuture(
        invoiceWith((i) => (i.invoiceDate = "9999-99-99")),
        context,
      ),
    ).toEqual([]);
  });
});

describe("due-date-on-or-after-invoice-date", () => {
  it("warns when the due date is before the invoice date", () => {
    expect(
      dueDateOnOrAfterInvoiceDate(
        invoiceWith((i) => (i.dueDate = "2026-09-11")),
        context,
      ),
    ).toEqual([
      {
        ruleId: "due-date-on-or-after-invoice-date",
        field: "dueDate",
        severity: "warning",
        message: "Due date 2026-09-11 is before the invoice date 2026-09-12.",
      },
    ]);
  });

  it("accepts a due date on the invoice date", () => {
    expect(
      dueDateOnOrAfterInvoiceDate(
        invoiceWith((i) => (i.dueDate = "2026-09-12")),
        context,
      ),
    ).toEqual([]);
  });

  it.each([
    ["no due date", (i) => (i.dueDate = null)],
    ["no invoice date", (i) => (i.invoiceDate = null)],
    ["an invalid due date", (i) => (i.dueDate = "2026-02-30")],
    ["an invalid invoice date", (i) => (i.invoiceDate = "yesterday")],
  ] satisfies [string, Parameters<typeof invoiceWith>[0]][])(
    "skips %s",
    (_, change) => {
      expect(dueDateOnOrAfterInvoiceDate(invoiceWith(change), context)).toEqual(
        [],
      );
    },
  );
});

describe("currency-gbp", () => {
  it.each(["GBP", "gbp", " GBP "])("accepts %j", (currency) => {
    expect(
      currencyIsGbp(
        invoiceWith((i) => (i.currency = currency)),
        context,
      ),
    ).toEqual([]);
  });

  it("warns for another currency", () => {
    expect(
      currencyIsGbp(
        invoiceWith((i) => (i.currency = "EUR")),
        context,
      ),
    ).toEqual([
      {
        ruleId: "currency-gbp",
        field: "currency",
        severity: "warning",
        message: "Currency is EUR, not GBP.",
      },
    ]);
  });

  it("warns when no currency is stated", () => {
    expect(
      currencyIsGbp(
        invoiceWith((i) => (i.currency = null)),
        context,
      ),
    ).toEqual([
      expect.objectContaining({
        message: "Currency is not stated; expected GBP.",
      }),
    ]);
  });
});
