import { useEffect, useState, type ChangeEvent } from "react";
import type { Invoice } from "../core/invoice.ts";
import { toInvoice } from "../lib/toInvoice.ts";
import { ExtractResponseSchema } from "../../shared/schema.ts";
import {
  INVOICE_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  isInvoiceMediaType,
} from "../../shared/upload.ts";
import type { AuditRecord } from "../lib/audit.ts";
import { History } from "./History.tsx";
import { ReviewScreen, type UploadedFile } from "./ReviewScreen.tsx";
import { clearRecords, loadRecords } from "./storage.ts";
import "./styles.css";

type State =
  | { status: "idle" }
  | { status: "loading"; file: UploadedFile }
  | { status: "error"; message: string; details?: string[] }
  | {
      status: "review";
      invoiceId: string;
      file: UploadedFile;
      invoice: Invoice;
      rawModelOutput: unknown;
      extractedAt: string;
      today: string;
    };

export default function App() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [history, setHistory] = useState<AuditRecord[]>(loadRecords);
  const fileUrl =
    state.status === "loading" || state.status === "review"
      ? state.file.url
      : null;

  // Release the preview's object URL when the file is no longer shown.
  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!selected) return;

    if (!isInvoiceMediaType(selected.type)) {
      setState({ status: "error", message: "Upload a PDF, JPEG or PNG file." });
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setState({
        status: "error",
        message: `The file is too large (limit ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`,
      });
      return;
    }

    const file: UploadedFile = {
      name: selected.name,
      mediaType: selected.type,
      url: URL.createObjectURL(selected),
    };
    setState({ status: "loading", file });
    try {
      const response = await fetch("/.netlify/functions/extract", {
        method: "POST",
        headers: { "content-type": selected.type },
        body: selected,
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
        status: "review",
        invoiceId: crypto.randomUUID(),
        file,
        invoice: toInvoice(parsed.data.invoice),
        rawModelOutput: parsed.data.raw,
        extractedAt: new Date().toISOString(),
        today: localIsoDate(),
      });
    } catch {
      setState({ status: "error", message: "Could not reach the server." });
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dealership Invoice Extractor</h1>
        {state.status !== "review" && (
          <label className="upload">
            <span>Upload an invoice (PDF, JPEG or PNG, up to 4 MB)</span>
            <input
              type="file"
              accept={INVOICE_MEDIA_TYPES.join(",")}
              onChange={handleFile}
              disabled={state.status === "loading"}
            />
          </label>
        )}
      </header>

      {state.status === "loading" && (
        <p className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Reading {state.file.name}… this usually takes 5–10 seconds.
        </p>
      )}

      {state.status === "error" && (
        <div className="error-box" role="alert">
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

      {state.status === "review" && (
        <ReviewScreen
          key={state.invoiceId}
          invoiceId={state.invoiceId}
          file={state.file}
          extracted={state.invoice}
          rawModelOutput={state.rawModelOutput}
          extractedAt={state.extractedAt}
          today={state.today}
          onStartAgain={() => {
            setHistory(loadRecords());
            setState({ status: "idle" });
          }}
        />
      )}

      {state.status !== "review" && (
        <History
          records={history}
          onClear={() => {
            clearRecords();
            setHistory([]);
          }}
        />
      )}
    </div>
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

/** Today's date in the browser's time zone, as YYYY-MM-DD. */
function localIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
