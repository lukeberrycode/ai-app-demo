import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { pageSize, stepZoom, ZOOM_STEPS } from "./pdfScale.ts";

// pdf.js is large, so it loads only when a PDF is first shown.
let pdfjs: Promise<typeof import("pdfjs-dist")> | undefined;

function loadPdfjs() {
  pdfjs ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjs;
}

/** The outcome of loading the PDF at `url`. */
type Loaded =
  | { url: string; status: "failed" }
  | { url: string; status: "ready"; doc: PDFDocumentProxy };

/**
 * Every page of a PDF, drawn with pdf.js. Browsers' own PDF viewers are not
 * available everywhere (Chrome on Android has none), so the app draws pages
 * itself to show the same preview on every device.
 */
export function PdfPages({ url, fileName }: { url: string; fileName: string }) {
  const [result, setResult] = useState<Loaded>();
  // A result for an earlier file means this one is still loading.
  const loaded = result?.url === url ? result : undefined;
  const [zoom, setZoom] = useState(1);
  const [paneWidth, setPaneWidth] = useState(0);
  const pane = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | undefined;
    loadPdfjs()
      .then((lib) => {
        if (cancelled) return;
        task = lib.getDocument({ url });
        return task.promise;
      })
      .then((doc) => {
        if (doc && !cancelled) setResult({ url, status: "ready", doc });
      })
      .catch(() => {
        if (!cancelled) setResult({ url, status: "failed" });
      });
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const element = pane.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setPaneWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loaded?.status !== "ready" || paneWidth === 0) return;
    const { doc } = loaded;
    let cancelled = false;
    let task: RenderTask | undefined;
    void (async () => {
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const canvas = canvases.current[n - 1];
        if (cancelled || !canvas) return;
        const base = page.getViewport({ scale: 1 });
        const size = pageSize(base, paneWidth, zoom, window.devicePixelRatio);
        const viewport = page.getViewport({ scale: size.renderScale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${size.cssWidth}px`;
        canvas.style.height = `${size.cssHeight}px`;
        task = page.render({ canvas, viewport });
        await task.promise.catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [loaded, paneWidth, zoom]);

  const pages = loaded?.status === "ready" ? loaded.doc.numPages : 0;

  return (
    <div className="pdf">
      <div className="pdf-toolbar">
        <button
          type="button"
          className="secondary"
          aria-label="Zoom out"
          disabled={zoom === ZOOM_STEPS[0]}
          onClick={() => setZoom((z) => stepZoom(z, -1))}
        >
          −
        </button>
        <button
          type="button"
          className="secondary"
          aria-label="Fit to width"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="secondary"
          aria-label="Zoom in"
          disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          onClick={() => setZoom((z) => stepZoom(z, 1))}
        >
          +
        </button>
        <a href={url} target="_blank" rel="noreferrer">
          Open file
        </a>
      </div>
      <div className="pdf-pages" ref={pane}>
        {!loaded && <p className="pdf-status">Loading preview…</p>}
        {loaded?.status === "failed" && (
          <p className="pdf-status">
            This PDF cannot be previewed here. Use <strong>Open file</strong> to
            view it.
          </p>
        )}
        {Array.from({ length: pages }, (_, i) => (
          <canvas
            key={i}
            ref={(element) => {
              canvases.current[i] = element;
            }}
            role="img"
            aria-label={`${fileName}, page ${i + 1} of ${pages}`}
          />
        ))}
      </div>
    </div>
  );
}
