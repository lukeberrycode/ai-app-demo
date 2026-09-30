import type { Config } from "@netlify/functions";
import { WireInvoiceSchema } from "../../shared/schema.ts";
import { MAX_UPLOAD_BYTES, isInvoiceMediaType } from "../../shared/upload.ts";
import {
  ModelError,
  createModelAdapter,
  type ModelErrorKind,
} from "./model/adapter.ts";

// POST /api/extract
// Body: the raw file. Content-Type: its media type.
// Success: { invoice, raw }, where invoice is the parsed wire invoice (pounds)
// and raw is the model's output as received, kept for the audit trail.
// Failure: { error } with a message written for the reviewer.

export const config: Config = {
  // A custom path makes this the only URL for the function
  // (/.netlify/functions/extract no longer routes here), which the rate
  // limit requires.
  path: "/api/extract",
  // Per visitor IP: enough to try every sample, while capping the cost any
  // one visitor can cause. Netlify returns 429 above the limit; enforcement
  // can lag by up to 10 seconds. The provider spend limit is the backstop.
  rateLimit: {
    windowLimit: 10,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};

// What the reviewer sees for each kind of model failure. Details go to the
// function log only.
const MODEL_FAILURES: Record<
  ModelErrorKind,
  [status: number, message: string]
> = {
  timeout: [
    504,
    "The AI model took too long to read the invoice. Please try again.",
  ],
  rate_limit: [
    429,
    "The AI service is busy. Please wait a minute and try again.",
  ],
  refused: [
    422,
    "The AI model declined to read this file. Check that it is an invoice.",
  ],
  incomplete: [502, "The AI model's answer was cut off. Please try again."],
  unavailable: [
    503,
    "The AI service is temporarily unavailable. Please try again in a minute.",
  ],
  usage_limit: [
    503,
    "The demo has reached its usage limit for now. Please try again later.",
  ],
  config: [500, "The server is not configured correctly."],
  upstream: [502, "The AI service returned an error. Please try again."],
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json(405, { error: "Use POST." });
  }

  const mediaType = (req.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim();
  if (!isInvoiceMediaType(mediaType)) {
    return json(415, { error: "Upload a PDF, JPEG or PNG file." });
  }

  const data = new Uint8Array(await req.arrayBuffer());
  if (data.byteLength === 0) {
    return json(400, { error: "The file is empty." });
  }
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    return json(413, { error: "The file is too large (limit 4 MB)." });
  }

  let adapter;
  try {
    adapter = createModelAdapter(process.env);
  } catch (error) {
    console.error("Model adapter configuration error:", error);
    return json(500, { error: MODEL_FAILURES.config[1] });
  }

  let raw: unknown;
  try {
    raw = await adapter.extractInvoice({ mediaType, data });
  } catch (error) {
    console.error("Extraction failed:", error);
    const [status, message] =
      error instanceof ModelError
        ? MODEL_FAILURES[error.kind]
        : MODEL_FAILURES.upstream;
    return json(status, { error: message });
  }

  // Model output is untrusted: it must match the wire schema.
  const parsed = WireInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Schema parse failure:", parsed.error.issues);
    return json(502, {
      error: "The AI model's answer could not be used. Please try again.",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
      raw,
    });
  }

  return json(200, { invoice: parsed.data, raw });
};

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}
