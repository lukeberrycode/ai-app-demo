// Plain names for invoice field paths (as used in Issue.field and audit
// entries), for display. Exported data keeps the paths themselves.

const LABELS: Record<string, string> = {
  "supplier.name": "Supplier name",
  "supplier.address": "Supplier address",
  "supplier.vatNumber": "VAT number",
  invoiceNumber: "Invoice number",
  invoiceDate: "Invoice date",
  dueDate: "Due date",
  currency: "Currency",
  vatScheme: "VAT scheme",
  "vehicle.registration": "Registration",
  "vehicle.vin": "VIN",
  "vehicle.make": "Make",
  "vehicle.model": "Model",
  "totals.net": "Net total",
  "totals.vat": "VAT total",
  "totals.gross": "Gross total",
};

const LINE_LABELS: Record<string, string> = {
  description: "description",
  quantity: "quantity",
  unitPrice: "unit price",
  net: "net",
  vatRate: "VAT rate",
  vat: "VAT",
};

export function fieldLabel(field: string): string {
  const line = /^lineItems\[(\d+)\](?:\.(\w+))?$/.exec(field);
  if (line) {
    const name = `Line ${Number(line[1]) + 1}`;
    if (line[2] === undefined) return name;
    return line[2] in LINE_LABELS ? `${name} ${LINE_LABELS[line[2]]}` : field;
  }
  return LABELS[field] ?? field;
}
