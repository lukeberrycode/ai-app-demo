import type { Issue } from "../core/invoice.ts";
import { issueKey } from "../lib/review.ts";

export function fieldId(field: string): string {
  return `field-${field.replace(/[^\w]/g, "-")}`;
}

/** CSS class for a field's worst unresolved issue. */
export function severityClass(
  issues: Issue[],
  overrides: Record<string, string>,
): string {
  const open = issues.filter((issue) => !(issueKey(issue) in overrides));
  if (open.some((issue) => issue.severity === "error")) return "has-error";
  if (issues.some((issue) => issue.severity === "error")) return "has-override";
  if (open.length > 0) return "has-warning";
  return "";
}
