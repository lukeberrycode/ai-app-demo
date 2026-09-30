import { exportJson, type AuditRecord } from "../lib/audit.ts";

/** Saves an audit record as a JSON file. */
export function downloadRecord(record: AuditRecord): void {
  const blob = new Blob([exportJson(record)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-${record.fileName.replace(/\.[^.]+$/, "")}-${record.invoiceId.slice(0, 8)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
