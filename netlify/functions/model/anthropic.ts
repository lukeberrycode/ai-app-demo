import Anthropic from "@anthropic-ai/sdk";
import { ModelError, type InvoiceFile, type ModelAdapter } from "./adapter.ts";
import { EXTRACTION_PROMPT } from "./prompt.ts";

// Set explicitly: netlify dev injects ANTHROPIC_BASE_URL (Netlify AI Gateway),
// which the SDK would otherwise pick up. See CLAUDE.md §3.1.
const ANTHROPIC_API_URL = "https://api.anthropic.com";

// Netlify's synchronous function limit is 60 s. Stop the model call first so
// the handler can still return a clean error, and don't retry into the limit.
const MODEL_TIMEOUT_MS = 50_000;

export function createAnthropicAdapter(options: {
  apiKey: string;
  model: string;
}): ModelAdapter {
  const client = new Anthropic({
    apiKey: options.apiKey,
    authToken: null,
    baseURL: ANTHROPIC_API_URL,
    timeout: MODEL_TIMEOUT_MS,
    maxRetries: 0,
  });

  return {
    async extractInvoice({ mediaType, data }: InvoiceFile) {
      const base64 = Buffer.from(data).toString("base64");
      const file: Anthropic.Beta.BetaContentBlockParam =
        mediaType === "application/pdf"
          ? {
              type: "document",
              source: { type: "base64", media_type: mediaType, data: base64 },
            }
          : {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            };

      try {
        return await client.beta.messages.create({
          model: options.model,
          max_tokens: 16000,
          // Reading an invoice needs little reasoning; low effort keeps
          // latency well inside the function limit.
          output_config: { effort: "low" },
          // If the model declines a request, the API retries it on a
          // fallback model within the same call.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: EXTRACTION_PROMPT,
          messages: [
            {
              role: "user",
              content: [file, { type: "text", text: "Extract this invoice." }],
            },
          ],
        });
      } catch (error) {
        throw toModelError(error);
      }
    },
  };
}

function toModelError(error: unknown): ModelError {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new ModelError("timeout", "The model took too long to respond.", {
      cause: error,
    });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ModelError("rate_limit", "The model is rate limited.", {
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIError) {
    return new ModelError(
      "upstream",
      `Model request failed (${error.status ?? "no status"}).`,
      { cause: error },
    );
  }
  return new ModelError("upstream", "Model request failed.", { cause: error });
}
