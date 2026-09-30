import type { AuditRecord } from "../lib/audit.ts";
import { downloadRecord } from "./download.ts";

/** Invoices reviewed in this browser, kept in localStorage. */
export function History({
  records,
  onClear,
}: {
  records: AuditRecord[];
  onClear: () => void;
}) {
  if (records.length === 0) return null;
  return (
    <section className="history" aria-labelledby="history-heading">
      <div className="audit-header">
        <h2 id="history-heading">This session</h2>
        <button type="button" className="link" onClick={onClear}>
          Clear history
        </button>
      </div>
      <ul>
        {records.map((record) => (
          <li key={record.invoiceId}>
            <strong>{record.fileName}</strong>
            <span className={`status ${record.status}`}>{record.status}</span>
            <span className="muted">
              {new Date(record.updatedAt).toLocaleString("en-GB")} ·{" "}
              {record.entries.length} audit entries
            </span>
            <button
              type="button"
              className="link"
              onClick={() => downloadRecord(record)}
            >
              Export JSON
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
