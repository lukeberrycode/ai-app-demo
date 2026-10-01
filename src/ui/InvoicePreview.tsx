import { PdfPages } from "./PdfPages.tsx";

/** The uploaded file: PDFs drawn page by page with pdf.js, images as they are. */
export function InvoicePreview({
  url,
  mediaType,
  fileName,
}: {
  url: string;
  mediaType: string;
  fileName: string;
}) {
  return (
    <div className="preview">
      {mediaType === "application/pdf" ? (
        <PdfPages url={url} fileName={fileName} />
      ) : (
        <img src={url} alt={`Invoice preview: ${fileName}`} />
      )}
    </div>
  );
}
