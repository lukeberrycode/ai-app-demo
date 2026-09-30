// Provider-neutral failure, so the HTTP handler never sees provider SDK errors.
// Each kind has one HTTP status and one user-facing message in extract.ts.
export type ModelErrorKind =
  | "timeout"
  | "rate_limit"
  | "refused"
  | "incomplete"
  | "unavailable"
  | "usage_limit"
  | "config"
  | "upstream";

export class ModelError extends Error {
  readonly kind: ModelErrorKind;

  constructor(kind: ModelErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModelError";
    this.kind = kind;
  }
}
