import Anthropic from "@anthropic-ai/sdk";
import { ModelError } from "./errors.ts";

/** Maps an Anthropic SDK error to a provider-neutral ModelError. */
export function toModelError(error: unknown): ModelError {
  const wrap = (kind: ModelError["kind"], detail: string) =>
    new ModelError(kind, detail, { cause: error });

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return wrap("timeout", "Model request timed out.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return wrap("unavailable", "Could not connect to the model provider.");
  }
  if (!(error instanceof Anthropic.APIError)) {
    return wrap("upstream", "Model request failed.");
  }

  const status = error.status ?? 0;
  if (error.type === "rate_limit_error" || status === 429) {
    return wrap("rate_limit", "Model provider rate limit reached.");
  }
  if (error.type === "overloaded_error" || status === 529 || status >= 500) {
    return wrap("unavailable", `Model provider unavailable (${status}).`);
  }
  // Out of credit or over the spend limit. The API has reported exhausted
  // prepaid credit as a 400 mentioning the credit balance; verify if the
  // wording changes.
  if (
    error.type === "billing_error" ||
    status === 402 ||
    (status === 400 && /credit balance/i.test(error.message))
  ) {
    return wrap("usage_limit", `Model provider billing limit (${status}).`);
  }
  if (
    error.type === "authentication_error" ||
    error.type === "permission_error" ||
    status === 401 ||
    status === 403
  ) {
    return wrap(
      "config",
      `Model provider rejected the credentials (${status}).`,
    );
  }
  return wrap("upstream", `Model request failed (${status}).`);
}
