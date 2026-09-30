import { MAX_UPLOAD_BYTES, isInvoiceMediaType } from "../../shared/upload.ts";
import { ModelError, createModelAdapter } from "./model/adapter.ts";

// POST /.netlify/functions/extract
// Body: the raw file. Content-Type: its media type.
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

  try {
    const raw = await adapter.extractInvoice({ mediaType, data });
    return json(200, { raw });
  } catch (error) {
    console.error("Extraction failed:", error);
    if (error instanceof ModelError) {
      const status = { timeout: 504, rate_limit: 429, upstream: 502 }[
        error.kind
      ];
      return json(status, { error: error.message });
    }
    return json(500, { error: "Extraction failed." });
  }
};

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}
