import type { InvoiceMediaType } from "../../../shared/upload.ts";
import { createAnthropicAdapter } from "./anthropic.ts";

export interface InvoiceFile {
  mediaType: InvoiceMediaType;
  data: Uint8Array;
}

export interface ModelAdapter {
  extractInvoice(input: InvoiceFile): Promise<unknown>; // raw model output, parsed later
}

export { ModelError, type ModelErrorKind } from "./errors.ts";

export interface ModelConfig {
  MODEL_PROVIDER?: string;
  CLAUDE_API_KEY?: string;
  CLAUDE_MODEL?: string;
}

// Throws if the configuration is incomplete; the handler reports that as a
// server configuration error.
export function createModelAdapter(config: ModelConfig): ModelAdapter {
  switch (config.MODEL_PROVIDER) {
    case "anthropic":
      if (!config.CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY is not set");
      return createAnthropicAdapter({
        apiKey: config.CLAUDE_API_KEY,
        model: config.CLAUDE_MODEL || "claude-sonnet-5-5",
      });
    default:
      throw new Error(`Unknown MODEL_PROVIDER: ${config.MODEL_PROVIDER}`);
  }
}
