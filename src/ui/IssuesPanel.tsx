import { Fragment } from "react";
import { fieldLabel } from "../lib/fieldLabels.ts";
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
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  const counts: [text: string, tone: string][] = [
    [
      plural(unresolved.length, "unresolved error"),
      unresolved.length ? "error" : "muted",
    ],
    ...(overridden > 0
      ? [[`${overridden} overridden`, "overridden"] as [string, string]]
      : []),
    [plural(warnings.length, "warning"), warnings.length ? "warning" : "muted"],
  ];
  return (
    <section className="issues-panel" aria-labelledby="issues-heading">
      <h2 id="issues-heading">
        {issues.length === 0 ? (
          <span className="count ok">No issues found</span>
        ) : (
          counts.map(([text, tone], i) => (
            <Fragment key={text}>
              {i > 0 && " · "}
              <span className={`count ${tone}`}>{text}</span>
            </Fragment>
          ))
        )}
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
                  {fieldLabel(issue.field)}
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
