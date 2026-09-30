import { describe, expect, it } from "vitest";
import {
  TIMEOUT_FAILURE,
  failureFromResponse,
} from "../src/lib/extractFailure.ts";

describe("failureFromResponse", () => {
  it("uses the function's own message and details", () => {
    expect(
      failureFromResponse(502, { error: "Bad answer.", issues: ["a: b", 3] }),
    ).toEqual({
      message: "Bad answer.",
      details: ["a: b", "3"],
    });
    expect(
      failureFromResponse(429, { error: "The AI service is busy." }),
    ).toEqual({
      message: "The AI service is busy.",
    });
  });

  it("explains Netlify's rate limiter", () => {
    expect(failureFromResponse(429, null).message).toMatch(
      /too many invoices/i,
    );
  });

  it("explains an oversized request rejected before the function", () => {
    expect(failureFromResponse(413, "Payload Too Large").message).toBe(
      "The file is too large (limit 4 MB).",
    );
  });

  it.each([502, 503, 504])(
    "treats a bare %s as the server timing out",
    (status) => {
      expect(failureFromResponse(status, null)).toBe(TIMEOUT_FAILURE);
    },
  );

  it("gives the status for anything else", () => {
    expect(failureFromResponse(500, "oops").message).toBe(
      "Something went wrong (error 500). Please try again.",
    );
  });
});
