import { useMemo, useReducer, useState } from "react";
import type { Invoice, Issue } from "../core/invoice.ts";
import { initialReview, reviewReducer, summarise } from "../lib/review.ts";
import type { FieldContext } from "./fields.tsx";
import { InvoiceForm } from "./InvoiceForm.tsx";
import { InvoicePreview } from "./InvoicePreview.tsx";
import { IssuesPanel } from "./IssuesPanel.tsx";

export interface UploadedFile {
  name: string;
  mediaType: string;
  url: string;
}

export function ReviewScreen({
  file,
  extracted,
  today,
  onStartAgain,
}: {
  file: UploadedFile;
  extracted: Invoice;
  today: string;
  onStartAgain: () => void;
}) {
  const [state, dispatch] = useReducer(reviewReducer, extracted, initialReview);
  const [invalidInputs, setInvalidInputs] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [lineGeneration, setLineGeneration] = useState(0);
  const context = useMemo(() => ({ today }), [today]);
  const summary = summarise(state, context);
  const readOnly = state.status !== "reviewing";

  const byField = new Map<string, Issue[]>();
  for (const issue of summary.issues) {
    byField.set(issue.field, [...(byField.get(issue.field) ?? []), issue]);
  }

  const ctx: FieldContext = {
    issuesFor: (field) => byField.get(field) ?? [],
    overrides: state.overrides,
    readOnly,
    onEdit: (field, value) => dispatch({ type: "edit", field, value }),
    onOverride: (issueKey, reason) =>
      dispatch({ type: "override", issueKey, reason }),
    onUndoOverride: (issueKey) => dispatch({ type: "undoOverride", issueKey }),
    onValidity: (field, valid) =>
      setInvalidInputs((current) => {
        if (valid === !current.has(field)) return current;
        const next = new Set(current);
        if (valid) next.delete(field);
        else next.add(field);
        return next;
      }),
  };

  const removeLine = (index: number) => {
    dispatch({ type: "removeLine", index });
    // Line inputs remount with fresh values, so their drafts are discarded.
    setLineGeneration((n) => n + 1);
    setInvalidInputs(
      (current) =>
        new Set(
          [...current].filter((field) => !field.startsWith("lineItems[")),
        ),
    );
  };

  const canApprove = summary.canApprove && invalidInputs.size === 0;
  const blocker =
    invalidInputs.size > 0
      ? `Fix ${invalidInputs.size} unreadable value${invalidInputs.size === 1 ? "" : "s"} first.`
      : summary.unresolved.length > 0
        ? "Correct or override every error to approve."
        : null;

  return (
    <div className="review">
      <div className="review-bar">
        <div>
          <strong>{file.name}</strong>
          {state.status === "approved" && (
            <span className="status approved">Approved</span>
          )}
          {state.status === "rejected" && (
            <span className="status rejected">Rejected</span>
          )}
        </div>
        <div className="actions">
          {state.status === "reviewing" ? (
            <>
              {blocker && <span className="blocker">{blocker}</span>}
              <button
                type="button"
                className="danger"
                onClick={() => dispatch({ type: "reject" })}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={!canApprove}
                onClick={() => dispatch({ type: "approve", context })}
              >
                Approve
              </button>
            </>
          ) : (
            <button type="button" onClick={onStartAgain}>
              Review another invoice
            </button>
          )}
        </div>
      </div>

      <IssuesPanel summary={summary} overrides={state.overrides} />

      <div className="split">
        <InvoicePreview
          url={file.url}
          mediaType={file.mediaType}
          fileName={file.name}
        />
        <InvoiceForm
          invoice={state.invoice}
          ctx={ctx}
          lineGeneration={lineGeneration}
          onAddLine={() => dispatch({ type: "addLine" })}
          onRemoveLine={removeLine}
        />
      </div>
    </div>
  );
}
