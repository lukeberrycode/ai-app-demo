// Runs every sample invoice through the real extraction (model adapter +
// wire schema) and reports field-level accuracy against samples/expected/,
// plus the validation issues each extraction raises.
//
// Run: npm run eval   (reads CLAUDE_API_KEY from .env; about 6p per run)

import { readFileSync, readdirSync } from "node:fs";
import { WireInvoiceSchema } from "../shared/schema.ts";
import { isInvoiceMediaType } from "../shared/upload.ts";
import { createModelAdapter } from "../netlify/functions/model/adapter.ts";
import { toInvoice } from "../src/lib/toInvoice.ts";
import { validateInvoice } from "../src/core/validation/index.ts";

const MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

type Leaf = [path: string, value: unknown];

function leaves(value: unknown, path = ""): Leaf[] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      leaves(v, path ? `${path}.${k}` : k),
    );
  }
  return [[path, value]];
}

const adapter = createModelAdapter(process.env);
const today = new Date().toISOString().slice(0, 10);
const files = readdirSync("samples")
  .filter((f) => /\.(pdf|jpe?g|png)$/.test(f))
  .sort();

let total = 0;
let correct = 0;
for (const file of files) {
  const name = file.replace(/\.\w+$/, "");
  const mediaType = MEDIA_TYPES[file.split(".").pop()!];
  if (!isInvoiceMediaType(mediaType)) continue;
  const expected = JSON.parse(
    readFileSync(`samples/expected/${name}.json`, "utf8"),
  );

  const started = performance.now();
  let raw: unknown;
  try {
    raw = await adapter.extractInvoice({
      mediaType,
      data: readFileSync(`samples/${file}`),
    });
  } catch (error) {
    console.log(`\n${name}: extraction failed: ${(error as Error).message}`);
    continue;
  }
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  const parsed = WireInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    console.log(`\n${name}: schema mismatch (${seconds} s)`);
    for (const issue of parsed.error.issues)
      console.log(`  ${issue.path.join(".")}: ${issue.message}`);
    continue;
  }

  const got = new Map(leaves(parsed.data));
  const fields = leaves(expected).filter(
    ([path]) => !path.startsWith("extractionNotes"),
  );
  const wrong = fields.filter(
    ([path, value]) => JSON.stringify(got.get(path)) !== JSON.stringify(value),
  );
  total += fields.length;
  correct += fields.length - wrong.length;

  const issues = validateInvoice(toInvoice(parsed.data), { today });
  console.log(
    `\n${name}: ${fields.length - wrong.length}/${fields.length} fields exact (${seconds} s)`,
  );
  for (const [path, value] of wrong) {
    console.log(
      `  ${path}: expected ${JSON.stringify(value)}, got ${JSON.stringify(got.get(path))}`,
    );
  }
  console.log(
    `  issues: ${issues.length ? issues.map((i) => `${i.severity} ${i.ruleId}@${i.field}`).join(", ") : "none"}`,
  );
}

const percent = total ? ((100 * correct) / total).toFixed(1) : "0";
console.log(`\nOverall: ${correct}/${total} fields exact (${percent}%)`);
