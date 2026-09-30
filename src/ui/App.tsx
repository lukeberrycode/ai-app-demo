import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type { Invoice } from "../core/invoice.ts";
import { toInvoice } from "../lib/toInvoice.ts";
import { ExtractResponseSchema } from "../../shared/schema.ts";
import {
  INVOICE_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  isInvoiceMediaType,
} from "../../shared/upload.ts";
import type { AuditRecord } from "../lib/audit.ts";
import {
  NETWORK_FAILURE,
  TIMEOUT_FAILURE,
  failureFromResponse,
  type Failure,
} from "../lib/extractFailure.ts";
import { HelpPanel } from "./HelpPanel.tsx";
import { History } from "./History.tsx";
import { ReviewScreen, type UploadedFile } from "./ReviewScreen.tsx";
import { SamplePicker } from "./SamplePicker.tsx";
import { MEDIA_TYPES, sampleUrls } from "./samples.ts";
import { clearRecords, loadRecords } from "./storage.ts";
import "./styles.css";

const EXTRACT_TIMEOUT_MS = 70_000;

type State =
  | { status: "idle" }
  | { status: "loading"; file: UploadedFile }
  | ({ status: "error"; retry?: File } & Failure)
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
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButton = useRef<HTMLButtonElement>(null);
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    helpButton.current?.focus();
  }, []);
  const fileUrl =
    state.status === "loading" || state.status === "review"
      ? state.file.url
      : null;

  // Release the preview's object URL when the file is no longer shown.
  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (selected) void extract(selected);
  }

  async function handleSample(name: string) {
    try {
      const response = await fetch(sampleUrls[name]);
      if (!response.ok) throw new Error(String(response.status));
      const extension = name.split(".").pop() ?? "";
      const blob = await response.blob();
      void extract(new File([blob], name, { type: MEDIA_TYPES[extension] }));
    } catch {
      setState({
        status: "error",
        message: "Could not load the sample invoice.",
      });
    }
  }

  async function extract(selected: File) {
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
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": selected.type },
        body: selected,
        // Longer than the function's own 60 s limit, so its error arrives first.
        signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setState({
          status: "error",
          retry: selected,
          ...failureFromResponse(response.status, body),
        });
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
    } catch (error) {
      const failure =
        error instanceof DOMException && error.name === "TimeoutError"
          ? TIMEOUT_FAILURE
          : NETWORK_FAILURE;
      setState({ status: "error", retry: selected, ...failure });
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Dealership Invoice Extractor</h1>
          <p>Read, check and approve supplier invoices</p>
        </div>
        <button
          ref={helpButton}
          type="button"
          className="help-toggle"
          aria-expanded={helpOpen}
          aria-controls="help-panel"
          onClick={() => (helpOpen ? closeHelp() : setHelpOpen(true))}
        >
          <span aria-hidden="true">ⓘ</span> Help
        </button>
        {state.status !== "review" && (
          <label className="upload">
            <span>Upload an invoice (PDF, JPEG or PNG, up to 4 MB)</span>
            <input
              type="file"
              accept={INVOICE_MEDIA_TYPES.join(",")}
              onChange={handleUpload}
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
          {state.retry && (
            <button
              type="button"
              onClick={() => state.retry && void extract(state.retry)}
            >
              Try again with {state.retry.name}
            </button>
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
        <>
          {state.status === "idle" && (
            <p className="intro">
              Upload a supplier invoice and an AI model reads it into a form.
              The app checks the data, and you review it: correct, override or
              approve, with every step recorded. New here? Try a sample below,
              and open <strong>Help</strong> for the full guide.
            </p>
          )}
          <SamplePicker
            disabled={state.status === "loading"}
            onPick={(name) => void handleSample(name)}
          />
        </>
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
      <HelpPanel open={helpOpen} onClose={closeHelp} />
    </div>
  );
}

/** Today's date in the browser's time zone, as YYYY-MM-DD. */
function localIsoDate(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
