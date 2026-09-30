import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { WireInvoiceSchema } from "../../../shared/schema.ts";
import type { InvoiceFile, ModelAdapter } from "./adapter.ts";
import { toModelError } from "./anthropicErrors.ts";
import { ModelError } from "./errors.ts";
import { EXTRACTION_PROMPT } from "./prompt.ts";

// Set explicitly: netlify dev injects ANTHROPIC_BASE_URL (Netlify AI Gateway),
// which the SDK would otherwise pick up. See CLAUDE.md §3.1.
const ANTHROPIC_API_URL = "https://api.anthropic.com";

// Netlify's synchronous function limit is 60 s. Stop the model call first so
// the handler can still return a clean error, and don't retry into the limit.
const MODEL_TIMEOUT_MS = 50_000;

// The structured-output schema, generated from the zod wire schema so the two
// cannot drift. zod's own converter keeps field descriptions and enums.
// `$schema` and `pattern` are removed: the API does not need them, and
// `format: "date"` already constrains dates.
const INVOICE_JSON_SCHEMA = stripKeys(
  z.toJSONSchema(WireInvoiceSchema, {
    target: "draft-2020-12",
    io: "output",
    reused: "inline",
  }),
  new Set(["$schema", "pattern"]),
) as Record<string, unknown>;

function stripKeys(value: unknown, keys: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((v) => stripKeys(v, keys));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !keys.has(k))
        .map(([k, v]) => [k, stripKeys(v, keys)]),
    );
  }
  return value;
}

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

      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await client.beta.messages.create({
          model: options.model,
          max_tokens: 16000,
          output_config: {
            // Reading an invoice needs little reasoning; low effort keeps
            // latency well inside the function limit.
            effort: "low",
            format: { type: "json_schema", schema: INVOICE_JSON_SCHEMA },
          },
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

      if (response.stop_reason === "refusal") {
        throw new ModelError(
          "refused",
          "The model declined to read this file.",
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new ModelError("incomplete", "The model's output was cut off.");
      }

      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("");
      try {
        return JSON.parse(text) as unknown;
      } catch {
        // Not JSON: return the text so the schema check reports it.
        return text;
      }
    },
  };
}
