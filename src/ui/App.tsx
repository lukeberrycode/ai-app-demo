import { useState, type ChangeEvent } from "react";
import {
  INVOICE_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  isInvoiceMediaType,
} from "../../shared/upload.ts";

type State =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "done"; fileName: string; seconds: number; body: unknown }
  | { status: "error"; message: string };

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
        const message =
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : `Request failed (${response.status}).`;
        setState({ status: "error", message });
        return;
      }
      setState({
        status: "done",
        fileName: file.name,
        seconds: (performance.now() - started) / 1000,
        body,
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
      {state.status === "error" && <p role="alert">{state.message}</p>}
      {state.status === "done" && (
        <>
          <p>
            {state.fileName} — {state.seconds.toFixed(1)} s
          </p>
          <pre>{JSON.stringify(state.body, null, 2)}</pre>
        </>
      )}
    </main>
  );
}
