import { fieldLabel } from "../lib/fieldLabels.ts";
import { formatPence } from "../lib/money.ts";
import type { AuditEntry, AuditValue } from "../lib/audit.ts";

const MONEY_FIELD = /(^|\.)(unitPrice|net|vat|gross)$/;

const LABELS: Record<AuditEntry["action"], string> = {
  extracted: "Extracted",
  edited: "Edited",
  overridden: "Overridden",
  override_removed: "Override removed",
  approved: "Approved",
  rejected: "Rejected",
};

function show(field: string | undefined, value: AuditValue): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "number" && field && MONEY_FIELD.test(field)) {
    return formatPence(value);
  }
  if (typeof value === "object") return "line";
  return String(value);
}

function describe(entry: AuditEntry): string {
  switch (entry.action) {
    case "extracted":
      return "Invoice read by the model.";
    case "edited":
      if (/^lineItems\[\d+\]$/.test(entry.field ?? "")) {
        return entry.before === null
          ? `Added ${fieldLabel(entry.field!)}.`
          : `Removed ${fieldLabel(entry.field!)}.`;
      }
      return `${fieldLabel(entry.field!)}: ${show(entry.field, entry.before)} → ${show(entry.field, entry.after)}`;
    case "overridden":
    case "override_removed":
      return `${fieldLabel(entry.field!)}: “${entry.reason}”`;
    case "approved":
      return "Invoice approved.";
    case "rejected":
      return "Invoice rejected.";
  }
}

export function AuditTimeline({
  entries,
  onExport,
}: {
  entries: AuditEntry[];
  onExport: () => void;
}) {
  return (
    <section className="audit" aria-labelledby="audit-heading">
      <div className="audit-header">
        <h2 id="audit-heading">Audit trail ({entries.length})</h2>
        <button type="button" className="secondary" onClick={onExport}>
          Export JSON
        </button>
      </div>
      <ol className="timeline">
        {entries.map((entry, i) => (
          <li key={i} className={entry.action}>
            <time dateTime={entry.timestamp}>
              {new Date(entry.timestamp).toLocaleTimeString("en-GB")}
            </time>
            <span className="badge">{LABELS[entry.action]}</span>
            <span>{describe(entry)}</span>
            <span className="actor">{entry.actor}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
