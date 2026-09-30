// Turns a failed call to the extract function into a message for the
// reviewer. The function's own JSON errors are already written for people;
// anything else (Netlify's rate limiter, gateway timeouts, network failures)
// is translated here.

export interface Failure {
  message: string;
  details?: string[];
}

export const NETWORK_FAILURE: Failure = {
  message: "Could not reach the server. Check your connection and try again.",
};

export const TIMEOUT_FAILURE: Failure = {
  message: "The server took too long to respond. Please try again.",
};

export function failureFromResponse(status: number, body: unknown): Failure {
  if (body && typeof body === "object" && "error" in body) {
    const details =
      "issues" in body && Array.isArray(body.issues)
        ? body.issues.map(String)
        : undefined;
    return { message: String(body.error), ...(details && { details }) };
  }
  if (status === 429) {
    return {
      message:
        "Too many invoices have been sent from your connection in the last few minutes. Please wait a few minutes and try again.",
    };
  }
  if (status === 413) {
    return { message: "The file is too large (limit 4 MB)." };
  }
  if (status === 502 || status === 503 || status === 504) {
    return TIMEOUT_FAILURE;
  }
  return {
    message: `Something went wrong (error ${status}). Please try again.`,
  };
}
