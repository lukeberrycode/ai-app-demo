import { WireInvoiceSchema } from "../../shared/schema.ts";
import { MAX_UPLOAD_BYTES, isInvoiceMediaType } from "../../shared/upload.ts";
import { ModelError, createModelAdapter } from "./model/adapter.ts";

// POST /.netlify/functions/extract
// Body: the raw file. Content-Type: its media type.
// Success: { invoice, raw }, where invoice is the parsed wire invoice (pounds)
// and raw is the model's output as received, kept for the audit trail.
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
    return json(413, { error: "The file is too large." });
  }

  let adapter;
  try {
    adapter = createModelAdapter(process.env);
  } catch (error) {
    console.error("Model adapter configuration error:", error);
    return json(500, { error: "The server is not configured correctly." });
  }

  let raw: unknown;
  try {
    raw = await adapter.extractInvoice({ mediaType, data });
  } catch (error) {
    console.error("Extraction failed:", error);
    if (error instanceof ModelError) {
      const status = {
        timeout: 504,
        rate_limit: 429,
        refused: 422,
        incomplete: 502,
        upstream: 502,
      }[error.kind];
      return json(status, { error: error.message });
    }
    return json(500, { error: "Extraction failed." });
  }

  // Model output is untrusted: it must match the wire schema.
  const parsed = WireInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Schema parse failure:", parsed.error.issues);
    return json(502, {
      error: "The model's output did not match the invoice schema.",
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
