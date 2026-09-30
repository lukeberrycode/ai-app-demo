import type { WireInvoice } from "../../shared/schema.ts";
import type { Invoice, Pence } from "../core/invoice.ts";
import { poundsToPence } from "./money.ts";

// Compile-time check that the wire schema and the core type have the same
// fields, so neither can gain or lose one without the other.
type SameKeys<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : false
  : false;
const sameFields: SameKeys<WireInvoice, Invoice> &
  SameKeys<WireInvoice["totals"], Invoice["totals"]> &
  SameKeys<WireInvoice["lineItems"][number], Invoice["lineItems"][number]> &
  SameKeys<WireInvoice["supplier"], Invoice["supplier"]> &
  SameKeys<
    NonNullable<WireInvoice["vehicle"]>,
    NonNullable<Invoice["vehicle"]>
  > = true;
void sameFields;

// Absent text arrives as "" on the wire (see shared/schema.ts).
function text(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function pence(pounds: number | null): Pence | null {
  return pounds === null ? null : poundsToPence(pounds);
}

/**
 * Converts a parsed wire invoice (pounds) into the core Invoice (pence). The
 * wire schema has already checked that every amount is whole pence. Empty
 * text becomes null.
 */
export function toInvoice(wire: WireInvoice): Invoice {
  return {
    supplier: {
      name: text(wire.supplier.name),
      address: text(wire.supplier.address),
      vatNumber: text(wire.supplier.vatNumber),
    },
    invoiceNumber: text(wire.invoiceNumber),
    invoiceDate: wire.invoiceDate,
    dueDate: wire.dueDate,
    currency: text(wire.currency),
    vatScheme: wire.vatScheme,
    vehicle: wire.vehicle
      ? {
          registration: text(wire.vehicle.registration),
          vin: text(wire.vehicle.vin),
          make: text(wire.vehicle.make),
          model: text(wire.vehicle.model),
        }
      : null,
    lineItems: wire.lineItems.map((line) => ({
      description: text(line.description),
      quantity: line.quantity,
      unitPrice: pence(line.unitPrice),
      net: pence(line.net),
      vatRate: line.vatRate,
      vat: pence(line.vat),
    })),
    totals: {
      net: pence(wire.totals.net),
      vat: pence(wire.totals.vat),
      gross: pence(wire.totals.gross),
    },
    extractionNotes: [...wire.extractionNotes],
  };
}
