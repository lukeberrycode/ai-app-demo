import { describe, expect, it } from "vitest";
import guide from "../docs/user-journeys.md?raw";
import { guideHtml } from "../src/ui/guide.ts";

describe("in-app user guide", () => {
  it("renders every journey from docs/user-journeys.md", () => {
    for (const heading of [
      "1. Upload an invoice",
      "2. Review the extracted data",
      "3. Keep a record",
      "4. Come back to earlier invoices",
    ]) {
      expect(guide).toContain(`## ${heading}`);
      expect(guideHtml).toContain(`<h2>${heading}</h2>`);
    }
    expect(guideHtml).toContain("<table>");
  });

  it("is written for reviewers, without developer notes", () => {
    expect(guide).not.toMatch(/known gaps/i);
  });
});
