// Core domain types. Money is integer pence. See CLAUDE.md §2 and §3.3.

/** Integer number of pence. */
export type Pence = number;

export type VatScheme = "standard" | "margin" | "zero-rated" | "unknown";

export interface Supplier {
  name: string | null;
  address: string | null;
  vatNumber: string | null;
}

export interface Vehicle {
  registration: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
}

export interface LineItem {
  description: string | null;
  quantity: number | null;
  unitPrice: Pence | null;
  net: Pence | null;
  vatRate: number | null; // percent, e.g. 20
  vat: Pence | null;
}

export interface Totals {
  net: Pence | null;
  vat: Pence | null;
  gross: Pence | null;
}

export interface Invoice {
  supplier: Supplier;
  invoiceNumber: string | null;
  invoiceDate: string | null; // ISO 8601 date
  dueDate: string | null;
  currency: string | null;
  vatScheme: VatScheme;
  vehicle: Vehicle | null;
  lineItems: LineItem[];
  totals: Totals;
  extractionNotes: string[];
}

export interface Issue {
  ruleId: string;
  field: string;
  severity: "error" | "warning";
  message: string;
}
