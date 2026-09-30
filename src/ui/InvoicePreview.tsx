/** The uploaded file, shown with the browser's own PDF and image viewers. */
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
        <iframe src={url} title={`Invoice preview: ${fileName}`} />
      ) : (
        <img src={url} alt={`Invoice preview: ${fileName}`} />
      )}
    </div>
  );
}
