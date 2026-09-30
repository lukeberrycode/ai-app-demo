import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { toModelError } from "../netlify/functions/model/anthropicErrors.ts";

const apiError = (status: number, type: string, message = "msg") =>
  Anthropic.APIError.generate(
    status,
    { type: "error", error: { type, message } },
    message,
    new Headers(),
  );

describe("toModelError", () => {
  it.each([
    [429, "rate_limit_error", "rate_limit"],
    [529, "overloaded_error", "unavailable"],
    [500, "api_error", "unavailable"],
    [402, "billing_error", "usage_limit"],
    [401, "authentication_error", "config"],
    [403, "permission_error", "config"],
    [400, "invalid_request_error", "upstream"],
    [404, "not_found_error", "upstream"],
  ])("maps %s %s to %s", (status, type, kind) => {
    expect(toModelError(apiError(status, type)).kind).toBe(kind);
  });

  it("treats a 400 about the credit balance as the usage limit", () => {
    const error = apiError(
      400,
      "invalid_request_error",
      "Your credit balance is too low to access the Anthropic API.",
    );
    expect(toModelError(error).kind).toBe("usage_limit");
  });

  it("maps timeouts and connection failures", () => {
    expect(toModelError(new Anthropic.APIConnectionTimeoutError()).kind).toBe(
      "timeout",
    );
    expect(
      toModelError(new Anthropic.APIConnectionError({ message: "down" })).kind,
    ).toBe("unavailable");
  });

  it("maps anything else to upstream and keeps the cause", () => {
    const cause = new Error("boom");
    const mapped = toModelError(cause);
    expect(mapped.kind).toBe("upstream");
    expect(mapped.cause).toBe(cause);
  });
});
