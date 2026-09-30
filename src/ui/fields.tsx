import { useState } from "react";
import type { Issue } from "../core/invoice.ts";
import { issueKey, type FieldValue } from "../lib/review.ts";
import { fieldId, severityClass } from "./fieldHelpers.ts";

/** What every field needs from the review screen. */
export interface FieldContext {
  issuesFor: (field: string) => Issue[];
  overrides: Record<string, string>;
  readOnly: boolean;
  onEdit: (field: string, value: FieldValue) => void;
  onOverride: (issueKey: string, reason: string) => void;
  onUndoOverride: (issueKey: string) => void;
  onValidity: (field: string, valid: boolean) => void;
}

export function IssueMessages({
  issues,
  ctx,
}: {
  issues: Issue[];
  ctx: FieldContext;
}) {
  if (issues.length === 0) return null;
  return (
    <ul className="issue-messages">
      {issues.map((issue) => (
        <IssueMessage key={issueKey(issue)} issue={issue} ctx={ctx} />
      ))}
    </ul>
  );
}

function IssueMessage({ issue, ctx }: { issue: Issue; ctx: FieldContext }) {
  const key = issueKey(issue);
  const reason = ctx.overrides[key];
  const [draft, setDraft] = useState<string | null>(null);

  if (issue.severity === "warning") {
    return <li className="warning">{issue.message}</li>;
  }
  if (reason !== undefined) {
    return (
      <li className="overridden">
        <s>{issue.message}</s>
        <span>
          Overridden: “{reason}”
          {!ctx.readOnly && (
            <button
              type="button"
              className="link"
              onClick={() => ctx.onUndoOverride(key)}
            >
              Undo
            </button>
          )}
        </span>
      </li>
    );
  }
  return (
    <li className="error">
      {issue.message}
      {!ctx.readOnly && draft === null && (
        <button type="button" className="link" onClick={() => setDraft("")}>
          Override…
        </button>
      )}
      {draft !== null && (
        <form
          className="override-form"
          onSubmit={(event) => {
            event.preventDefault();
            ctx.onOverride(key, draft);
            setDraft(null);
          }}
        >
          <label>
            Reason for override (required)
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              autoFocus
            />
          </label>
          <button type="submit" disabled={draft.trim() === ""}>
            Confirm override
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setDraft(null)}
          >
            Cancel
          </button>
        </form>
      )}
    </li>
  );
}

interface InputProps {
  field: string;
  label: string;
  ctx: FieldContext;
}

/** A labelled input with its issues. */
function FieldShell({
  field,
  label,
  ctx,
  children,
  inputError,
}: InputProps & { children: React.ReactNode; inputError?: string }) {
  const issues = ctx.issuesFor(field);
  return (
    <div
      className={`field ${severityClass(issues, ctx.overrides)} ${inputError ? "has-error" : ""}`}
    >
      <label htmlFor={fieldId(field)}>{label}</label>
      {children}
      {inputError && <p className="input-error">{inputError}</p>}
      <IssueMessages issues={issues} ctx={ctx} />
    </div>
  );
}

export function TextField({
  field,
  label,
  ctx,
  value,
  multiline = false,
}: InputProps & { value: string | null; multiline?: boolean }) {
  const props = {
    id: fieldId(field),
    value: value ?? "",
    disabled: ctx.readOnly,
    onChange: (event: { target: { value: string } }) =>
      ctx.onEdit(
        field,
        event.target.value.trim() === "" ? null : event.target.value,
      ),
  };
  return (
    <FieldShell field={field} label={label} ctx={ctx}>
      {multiline ? (
        <textarea rows={2} {...props} />
      ) : (
        <input type="text" {...props} />
      )}
    </FieldShell>
  );
}

export function DateField({
  field,
  label,
  ctx,
  value,
}: InputProps & { value: string | null }) {
  return (
    <FieldShell field={field} label={label} ctx={ctx}>
      <input
        id={fieldId(field)}
        type="date"
        value={value ?? ""}
        disabled={ctx.readOnly}
        onChange={(event) =>
          ctx.onEdit(
            field,
            event.target.value === "" ? null : event.target.value,
          )
        }
      />
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  field,
  label,
  ctx,
  value,
  options,
}: InputProps & { value: T; options: readonly T[] }) {
  return (
    <FieldShell field={field} label={label} ctx={ctx}>
      <select
        id={fieldId(field)}
        value={value}
        disabled={ctx.readOnly}
        onChange={(event) => ctx.onEdit(field, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * An input whose text is kept as a draft and committed only when it parses.
 * An unparseable draft is shown at the field and reported via onValidity.
 */
export function ParsedField({
  field,
  label,
  ctx,
  value,
  format,
  parse,
  hint,
  compact = false,
}: InputProps & {
  value: number | null;
  format: (value: number) => string;
  parse: (text: string) => number | null;
  hint: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(value === null ? "" : format(value));
  const [invalid, setInvalid] = useState(false);

  const input = (
    <input
      id={fieldId(field)}
      type="text"
      inputMode="decimal"
      aria-label={compact ? label : undefined}
      aria-invalid={invalid}
      value={draft}
      disabled={ctx.readOnly}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const parsed = text.trim() === "" ? null : parse(text);
        const ok = text.trim() === "" || parsed !== null;
        setInvalid(!ok);
        ctx.onValidity(field, ok);
        if (ok) ctx.onEdit(field, parsed);
      }}
    />
  );
  const inputError = invalid ? hint : undefined;
  if (compact) {
    const issues = ctx.issuesFor(field);
    return (
      <div
        className={`cell ${severityClass(issues, ctx.overrides)} ${invalid ? "has-error" : ""}`}
      >
        {input}
        {inputError && <p className="input-error">{inputError}</p>}
        <IssueMessages issues={issues} ctx={ctx} />
      </div>
    );
  }
  return (
    <FieldShell field={field} label={label} ctx={ctx} inputError={inputError}>
      {input}
    </FieldShell>
  );
}
