import { issueKey, type ReviewSummary } from "../lib/review.ts";
import { fieldId } from "./fieldHelpers.ts";

function focusField(field: string) {
  const element = document.getElementById(fieldId(field));
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  element?.focus({ preventScroll: true });
}

/** The exceptions queue: every issue, with its state, linked to its field. */
export function IssuesPanel({
  summary,
  overrides,
}: {
  summary: ReviewSummary;
  overrides: Record<string, string>;
}) {
  const { issues, errors, warnings, unresolved } = summary;
  const overridden = errors.length - unresolved.length;
  return (
    <section className="issues-panel" aria-labelledby="issues-heading">
      <h2 id="issues-heading">
        {issues.length === 0
          ? "No issues found"
          : [
              `${unresolved.length} unresolved error${unresolved.length === 1 ? "" : "s"}`,
              overridden > 0 ? `${overridden} overridden` : null,
              `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
      </h2>
      {issues.length > 0 && (
        <ul>
          {issues.map((issue) => {
            const isOverridden = issueKey(issue) in overrides;
            const state =
              issue.severity === "warning"
                ? "warning"
                : isOverridden
                  ? "overridden"
                  : "error";
            return (
              <li key={issueKey(issue)} className={state}>
                <span className="badge">{state}</span>
                <button
                  type="button"
                  className="link"
                  onClick={() => focusField(issue.field)}
                >
                  {issue.field}
                </button>
                <span className={isOverridden ? "struck" : undefined}>
                  {issue.message}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
