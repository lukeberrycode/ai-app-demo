import { useState, type ChangeEvent } from "react";
import type { Invoice } from "../core/invoice.ts";
import { toInvoice } from "../lib/toInvoice.ts";
import { ExtractResponseSchema } from "../../shared/schema.ts";
import {
  INVOICE_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  isInvoiceMediaType,
} from "../../shared/upload.ts";

type State =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "done"; fileName: string; seconds: number; invoice: Invoice }
  | { status: "error"; message: string; details?: string[] };

export default function App() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!isInvoiceMediaType(file.type)) {
      setState({ status: "error", message: "Upload a PDF, JPEG or PNG file." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({
        status: "error",
        message: `The file is too large (limit ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
      });
      return;
    }

    setState({ status: "loading", fileName: file.name });
    const started = performance.now();
    try {
      const response = await fetch("/.netlify/functions/extract", {
        method: "POST",
        headers: { "content-type": file.type },
        body: file,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setState({ status: "error", ...errorFrom(body, response.status) });
        return;
      }
      // The response crosses the network, so it is parsed again here.
      const parsed = ExtractResponseSchema.safeParse(body);
      if (!parsed.success) {
        setState({
          status: "error",
          message: "The server's response did not match the invoice schema.",
        });
        return;
      }
      setState({
        status: "done",
        fileName: file.name,
        seconds: (performance.now() - started) / 1000,
        invoice: toInvoice(parsed.data.invoice),
      });
    } catch {
      setState({ status: "error", message: "Could not reach the server." });
    }
  }

  return (
    <main>
      <h1>Dealership Invoice Extractor</h1>
      <input
        type="file"
        accept={INVOICE_MEDIA_TYPES.join(",")}
        onChange={handleFile}
        disabled={state.status === "loading"}
      />
      {state.status === "loading" && <p>Extracting {state.fileName}…</p>}
      {state.status === "error" && (
        <div role="alert">
          <p>{state.message}</p>
          {state.details && (
            <ul>
              {state.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.status === "done" && (
        <>
          <p>
            {state.fileName} — {state.seconds.toFixed(1)} s
          </p>
          <p>Parsed invoice (money in pence):</p>
          <pre>{JSON.stringify(state.invoice, null, 2)}</pre>
        </>
      )}
    </main>
  );
}

function errorFrom(
  body: unknown,
  status: number,
): { message: string; details?: string[] } {
  if (body && typeof body === "object" && "error" in body) {
    const details =
      "issues" in body && Array.isArray(body.issues)
        ? body.issues.map(String)
        : undefined;
    return { message: String(body.error), details };
  }
  return { message: `Request failed (${status}).` };
}
