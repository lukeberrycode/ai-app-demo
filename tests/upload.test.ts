import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, isInvoiceMediaType } from "../shared/upload.ts";

describe("upload rules", () => {
  it.each(["application/pdf", "image/jpeg", "image/png"])(
    "accepts %s",
    (type) => {
      expect(isInvoiceMediaType(type)).toBe(true);
    },
  );

  it.each(["image/gif", "text/plain", "application/json", "", "image/PNG"])(
    "rejects %j",
    (type) => {
      expect(isInvoiceMediaType(type)).toBe(false);
    },
  );

  it("keeps the upload limit below Netlify's ~4.5 MB effective body limit", () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});
