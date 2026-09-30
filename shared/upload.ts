// Upload rules shared by the browser and the extract function.

export const INVOICE_MEDIA_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type InvoiceMediaType = (typeof INVOICE_MEDIA_TYPES)[number];

export function isInvoiceMediaType(value: string): value is InvoiceMediaType {
  return (INVOICE_MEDIA_TYPES as readonly string[]).includes(value);
}

// Netlify buffers function request bodies up to 6 MB and base64-encodes
// binary uploads (about 33% overhead), so the effective file limit is about
// 4.5 MB (verified 2026-09-30). 4 MB leaves headroom.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
