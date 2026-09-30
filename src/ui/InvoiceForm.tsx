import type { Invoice } from "../core/invoice.ts";
import { parsePence } from "../lib/money.ts";
import { VAT_SCHEMES } from "../../shared/schema.ts";
import {
  DateField,
  IssueMessages,
  ParsedField,
  SelectField,
  TextField,
  type FieldContext,
} from "./fields.tsx";
import { fieldId, severityClass } from "./fieldHelpers.ts";

const formatPounds = (pence: number) => (pence / 100).toFixed(2);
const parseNumber = (text: string) => {
  const value = Number(text.trim());
  return /^-?\d+(\.\d+)?$/.test(text.trim()) && Number.isFinite(value)
    ? value
    : null;
};

function MoneyField(props: {
  field: string;
  label: string;
  ctx: FieldContext;
  value: number | null;
  compact?: boolean;
}) {
  return (
    <ParsedField
      {...props}
      format={formatPounds}
      parse={parsePence}
      hint="Enter an amount in pounds, such as 123.45."
    />
  );
}

function NumberField(props: {
  field: string;
  label: string;
  ctx: FieldContext;
  value: number | null;
  compact?: boolean;
}) {
  return (
    <ParsedField
      {...props}
      format={String}
      parse={parseNumber}
      hint="Enter a number."
    />
  );
}

export function InvoiceForm({
  invoice,
  ctx,
  lineGeneration,
  onAddLine,
  onRemoveLine,
}: {
  invoice: Invoice;
  ctx: FieldContext;
  /** Changes when lines are removed, so line inputs re-read their values. */
  lineGeneration: number;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
}) {
  const vehicle = invoice.vehicle;
  return (
    <div className="invoice-form">
      <fieldset>
        <legend>Supplier</legend>
        <TextField
          field="supplier.name"
          label="Name"
          ctx={ctx}
          value={invoice.supplier.name}
        />
        <TextField
          field="supplier.address"
          label="Address"
          ctx={ctx}
          value={invoice.supplier.address}
          multiline
        />
        <TextField
          field="supplier.vatNumber"
          label="VAT number"
          ctx={ctx}
          value={invoice.supplier.vatNumber}
        />
      </fieldset>

      <fieldset>
        <legend>Invoice</legend>
        <div className="row">
          <TextField
            field="invoiceNumber"
            label="Invoice number"
            ctx={ctx}
            value={invoice.invoiceNumber}
          />
          <TextField
            field="currency"
            label="Currency"
            ctx={ctx}
            value={invoice.currency}
          />
        </div>
        <div className="row">
          <DateField
            field="invoiceDate"
            label="Invoice date"
            ctx={ctx}
            value={invoice.invoiceDate}
          />
          <DateField
            field="dueDate"
            label="Due date"
            ctx={ctx}
            value={invoice.dueDate}
          />
        </div>
        <SelectField
          field="vatScheme"
          label="VAT scheme"
          ctx={ctx}
          value={invoice.vatScheme}
          options={VAT_SCHEMES}
        />
      </fieldset>

      <fieldset>
        <legend>Vehicle</legend>
        <div className="row">
          <TextField
            field="vehicle.registration"
            label="Registration"
            ctx={ctx}
            value={vehicle?.registration ?? null}
          />
          <TextField
            field="vehicle.vin"
            label="VIN"
            ctx={ctx}
            value={vehicle?.vin ?? null}
          />
        </div>
        <div className="row">
          <TextField
            field="vehicle.make"
            label="Make"
            ctx={ctx}
            value={vehicle?.make ?? null}
          />
          <TextField
            field="vehicle.model"
            label="Model"
            ctx={ctx}
            value={vehicle?.model ?? null}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Line items</legend>
        <div className="table-scroll">
          <table className="lines">
            <colgroup>
              <col className="description" />
              <col className="small" />
              <col className="money" />
              <col className="money" />
              <col className="small" />
              <col className="money" />
              <col className="action" />
            </colgroup>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit £</th>
                <th>Net £</th>
                <th>VAT %</th>
                <th>VAT £</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((line, i) => {
                const f = (name: string) => `lineItems[${i}].${name}`;
                const descriptionIssues = ctx.issuesFor(f("description"));
                return (
                  <tr key={`${lineGeneration}-${i}`}>
                    <td
                      data-label="Description"
                      className={`cell ${severityClass(descriptionIssues, ctx.overrides)}`}
                    >
                      <input
                        id={fieldId(f("description"))}
                        aria-label={`Line ${i + 1} description`}
                        type="text"
                        value={line.description ?? ""}
                        disabled={ctx.readOnly}
                        onChange={(event) =>
                          ctx.onEdit(
                            f("description"),
                            event.target.value.trim() === ""
                              ? null
                              : event.target.value,
                          )
                        }
                      />
                      <IssueMessages issues={descriptionIssues} ctx={ctx} />
                    </td>
                    <td data-label="Qty">
                      <NumberField
                        field={f("quantity")}
                        label={`Line ${i + 1} quantity`}
                        ctx={ctx}
                        value={line.quantity}
                        compact
                      />
                    </td>
                    <td data-label="Unit £">
                      <MoneyField
                        field={f("unitPrice")}
                        label={`Line ${i + 1} unit price`}
                        ctx={ctx}
                        value={line.unitPrice}
                        compact
                      />
                    </td>
                    <td data-label="Net £">
                      <MoneyField
                        field={f("net")}
                        label={`Line ${i + 1} net`}
                        ctx={ctx}
                        value={line.net}
                        compact
                      />
                    </td>
                    <td data-label="VAT %">
                      <NumberField
                        field={f("vatRate")}
                        label={`Line ${i + 1} VAT rate`}
                        ctx={ctx}
                        value={line.vatRate}
                        compact
                      />
                    </td>
                    <td data-label="VAT £">
                      <MoneyField
                        field={f("vat")}
                        label={`Line ${i + 1} VAT`}
                        ctx={ctx}
                        value={line.vat}
                        compact
                      />
                    </td>
                    <td className="line-actions">
                      {!ctx.readOnly && (
                        <button
                          type="button"
                          className="link"
                          aria-label={`Remove line ${i + 1}`}
                          title="Remove line"
                          onClick={() => onRemoveLine(i)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!ctx.readOnly && (
          <button type="button" className="secondary" onClick={onAddLine}>
            Add line
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend>Totals</legend>
        <div className="row three">
          <MoneyField
            field="totals.net"
            label="Net £"
            ctx={ctx}
            value={invoice.totals.net}
          />
          <MoneyField
            field="totals.vat"
            label="VAT £"
            ctx={ctx}
            value={invoice.totals.vat}
          />
          <MoneyField
            field="totals.gross"
            label="Gross £"
            ctx={ctx}
            value={invoice.totals.gross}
          />
        </div>
      </fieldset>
    </div>
  );
}
