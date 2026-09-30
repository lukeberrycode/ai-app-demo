export const EXTRACTION_PROMPT = `You read UK motor-trade supplier invoices and extract their contents as JSON.

Rules:
- Copy values exactly as printed. Money is decimal pounds as printed (e.g. 123.45).
- If a field is absent or illegible, use null. Never infer, calculate or invent a value.
- Record anything ambiguous in an "extractionNotes" array of short strings.

Return only the JSON object, with no other text.`;
