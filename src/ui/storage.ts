// Session history in localStorage (CLAUDE.md §3.7). Browser storage can be
// unavailable or hold stale data, so every read and write is guarded and
// nothing here is required for the app to work.

import { z } from "zod";
import type { AuditRecord } from "../lib/audit.ts";

const KEY = "invoice-extractor.records.v1";
const MAX_RECORDS = 50;

// Shape check only: enough to list and export records safely.
const StoredRecord = z.looseObject({
  invoiceId: z.string(),
  fileName: z.string(),
  status: z.enum(["reviewing", "approved", "rejected"]),
  updatedAt: z.string(),
  entries: z.array(z.looseObject({ action: z.string() })),
});

export function loadRecords(): AuditRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => StoredRecord.safeParse(item).success,
    ) as AuditRecord[];
  } catch {
    return [];
  }
}

/** Inserts or replaces a record, newest first. */
export function saveRecord(record: AuditRecord): void {
  try {
    const others = loadRecords().filter(
      (r) => r.invoiceId !== record.invoiceId,
    );
    localStorage.setItem(
      KEY,
      JSON.stringify([record, ...others].slice(0, MAX_RECORDS)),
    );
  } catch {
    // Storage full or blocked: the review still works, it just is not kept.
  }
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
