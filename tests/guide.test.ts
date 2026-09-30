import { describe, expect, it } from "vitest";
import guide from "../docs/user-guide.md?raw";
import { guideHtml } from "../src/ui/guide.ts";

describe("in-app user guide", () => {
  it("renders every section of docs/user-guide.md", () => {
    const headings = [...guide.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings).toEqual([
      "What this app does",
      "What you need",
      "The review screen",
      "Errors and warnings",
      "How to review an invoice",
      "Try a sample invoice",
      "Editing the form",
      "Why Approve is unavailable",
      "The checks",
      "If an invoice cannot be read",
      "Your records",
      "Privacy",
    ]);
    for (const heading of headings) {
      expect(guideHtml).toContain(`<h2>${heading}</h2>`);
    }
    expect(guideHtml).toContain("<table>");
  });

  it("is written for reviewers, without engineering notes", () => {
    expect(guide).not.toMatch(/known gaps|reducer|ruleId|localStorage|zod/i);
  });
});
