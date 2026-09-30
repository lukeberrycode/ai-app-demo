# Dealership Invoice Extractor

A small web app that reads UK motor-trade supplier invoices (PDF, JPEG or PNG) with a vision-capable AI model, checks the extracted data against deterministic business rules, and lets a person review, correct, override or approve the result. Every action is recorded in an exportable audit trail.

The model does the reading. Everything that decides whether the data can be trusted is ordinary, tested code.

**Live demo:** https://luke-berry-ai-app-demo.netlify.app

## Try this

The app offers six synthetic sample invoices, so you need nothing of your own. This takes under a minute:

1. **Tyres and exhaust.** Click the sample. The issues list shows two errors: the line items add up to £312.40, but the printed net total is £321.40, so the gross total no longer adds up either. The invoice on the left shows the same mistake, so the supplier made it, not the model. Suppose the supplier confirms the line items are right: type `312.40` into **Net total**, and both errors clear as you type. Click **Approve**.
2. **Look at the audit trail** below the form. It records the extraction, your change (£321.40 → £312.40) and the approval. Click **Export JSON** to download it, together with the model's raw answer.
3. **Car service.** The VIN contains the letter O, which a VIN never does. The model copied it exactly as printed, and a rule flagged it. Click **Override…**, give a reason, and approve.
4. **Used car purchase.** A margin-scheme invoice with no VAT. This is normal for used vehicles, so it is a warning rather than an error, and approval is not blocked.

Open **Help** at any point for the full user guide.

## How it works

1. You upload an invoice.
2. A serverless function sends it to the model, which returns structured JSON.
3. The JSON is checked against a schema, then converted into the app's own invoice type, with money held as integer pence.
4. Validation rules check the invoice: arithmetic, VAT, VIN and registration formats, dates and required fields.
5. Anything that fails appears as an exception in the review screen. You correct it, override it with a written reason, or reject the invoice.
6. Every step is recorded in the audit trail, alongside the raw model output.

The [user guide](docs/user-guide.md) explains how to review an invoice. The app shows the same guide under **Help**.

## Design decisions

- **The model reads; code decides.** The model's only job is to turn a document into structured data. Whether that data can be trusted is decided by deterministic validation rules: plain functions with full test coverage that give the same answer every time and can be read, reviewed and audited. The model's own confidence is not used. This keeps the part that makes decisions predictable, and makes every exception explainable.
- **A person makes the final decision.** Errors block approval until they are corrected or overridden with a written reason. Warnings inform without blocking. Every action is recorded, with values before and after, next to the model's raw output, so the approved data can always be traced back to what was read.
- **Copy, don't correct.** The model is told to copy values exactly as printed, even when they look wrong. A supplier's arithmetic mistake or an impossible VIN then reaches the rules and the reviewer, instead of being silently "fixed" by the model. The sample invoices include both cases to show this.
- **UK motor-trade rules.** Used vehicles are often sold under the VAT margin scheme, where no VAT is shown and none can be reclaimed. A generic "VAT must be 20% of net" rule would flag every such invoice as an error. Here, margin-scheme invoices raise a warning instead, and the other checks are UK-specific too: VIN format (without the North American check digit), current and older registration formats, and GB VAT number formats.
- **Money is integer pence.** The model reports amounts in pounds, as printed. They are converted to integer pence once, at the boundary, so every total and ±1p tolerance check is exact integer arithmetic.
- **Model output is untrusted input.** The model returns JSON constrained by a schema, and the same zod schema checks it again on arrival, in the serverless function and in the browser. Output that does not match becomes a clear error, never a crash. The structured-output schema is generated from the zod schema, so they cannot drift apart.
- **The API key stays on the server.** The browser talks only to the serverless function, which holds the key as an environment variable. A build check fails the deploy if a key ever appears in the front-end bundle. The adapter also sets the key and API address explicitly, because `netlify dev` can inject its own `ANTHROPIC_*` variables for Netlify's AI Gateway; calls always go to Anthropic on this project's account and spend limit.
- **Provider behind an adapter.** All model calls go through one small interface, selected by `MODEL_PROVIDER`. The current implementation uses Anthropic's Claude (`claude-sonnet-5-5` by default, at low effort, because reading an invoice needs little reasoning), which reads PDFs and images directly.
- **Safeguards for a public URL.** Uploads are limited to 4 MB and three file types, checked in both the browser and the function. The function is rate-limited to 10 requests per 3 minutes per visitor, the model call times out before Netlify's 60-second limit, and the provider account has a hard spend limit. Every failure has a plain-English message and, where it helps, a **Try again** button.
- **No database.** Each file is processed and discarded. Review history is kept in the browser's local storage, which suits a demo; a production system would store records server-side.

## Architecture

The code is arranged in layers, like an onion. Dependencies only point inward.

```
┌───────────────────────────────────────────────────────────┐
│ Outer:   UI · serverless function · model adapter         │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Tooling: schema (zod) · money helpers · audit trail   │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Core:  invoice types · validation rules           │ │ │
│ │ │        (no dependencies)                          │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- **Core** (`src/core/`) holds the invoice type and the validation rules. It imports nothing: no libraries, no browser APIs, no clock. It works only on the data it is given, so it is fast and simple to test, and it stays the same whatever surrounds it.
- **Tooling** (`src/lib/`, `shared/`) turns messy input into the clean shape the core expects. It parses model output, converts pounds to pence, and records audit entries.
- **Outer** (`src/ui/`, `netlify/functions/`) handles the browser, HTTP, the model provider and storage. The model provider sits behind a single adapter interface, so it can be swapped by configuration.

## Dependencies

The versions in `package.json` are the source of truth. The entries below explain what each dependency is and why it is used here.

### Core

None, by design.

### Tooling layer

- **zod**: a TypeScript library for describing the shape of data and checking real data against it at runtime. TypeScript types only exist while the code compiles. They cannot check JSON that arrives from outside while the app is running. zod fills that gap. You write a schema once, and `schema.safeParse(data)` returns either correctly typed data or a list of exactly what was wrong. `z.infer` produces the matching TypeScript type from the same schema. Here, zod checks the model's JSON output, which is treated as untrusted. A response that does not match the schema becomes a clear error state instead of a crash further on.
- **`money.ts`** (in this repo, not a package): helpers that convert between decimal pounds and integer pence, and format pence for display. Integer pence avoid floating-point errors such as `0.1 + 0.2 !== 0.3`, so totals can be compared exactly.

### Outer layer

- **React** and **react-dom**: the UI library for the upload, review and audit screens. The review screen has a lot of connected state (editable fields, live re-validation, overrides), and React keeps that manageable.
- **@anthropic-ai/sdk**: Anthropic's client library for the Claude API. Claude reads images and PDFs directly, so no conversion step is needed. It is used only inside the serverless function's model adapter. The API key stays on the server.

- **marked**: converts Markdown to HTML. The in-app Help guide is `docs/user-guide.md`, rendered by marked when the app is built, so the guide and the documentation are the same text.

The invoice preview uses the browser's built-in PDF and image viewers, so no rendering library is needed.

### Development tools

- **TypeScript**: JavaScript with static types, run in strict mode.
- **Vite** and **@vitejs/plugin-react**: the dev server and build tool for the front end, with React support.
- **Netlify** and the **Netlify CLI**: hosting for the static site and the serverless function. `netlify dev` runs both locally, together with the environment variables.
- **Vitest**: the unit test runner. The validation rules have full coverage.
- **@vitest/coverage-v8**: coverage reports for Vitest. `npm run test:coverage` fails if anything in `src/core/` drops below 100%.
- **ESLint**, with **@eslint/js**, **typescript-eslint**, **eslint-plugin-react-hooks**, **eslint-plugin-react-refresh** and **globals**: finds likely bugs and enforces the layer boundaries. `src/core/` may import only from inside itself, and cannot touch the DOM, network, storage, environment or clock.
- **eslint-config-prettier**: switches off ESLint rules that would clash with Prettier.
- **Prettier**: automatic code formatting.
- **Google Chrome** and **pdftoppm** (poppler-utils): not npm packages. `npm run samples` uses them to render the synthetic sample invoices from HTML to PDF and JPEG.
- **@types/react**, **@types/react-dom** and **@types/node**: type definitions for React and Node.
- **@netlify/functions**: type definitions for the function's `config` export, which sets its path and rate limit.

## Run it locally

You need Node.js 24 (see `.nvmrc`), the [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`) and an [Anthropic API key](https://console.anthropic.com/).

```sh
git clone https://github.com/lukeberrycode/ai-app-demo.git
cd ai-app-demo
npm install
cp .env.example .env    # then set CLAUDE_API_KEY in .env
netlify dev             # front end and function on http://localhost:8888
```

`npm run dev` starts the front end alone, without the function.

To deploy your own copy, create a Netlify site from the repository (the build settings are in `netlify.toml`) and set `CLAUDE_API_KEY` and `MODEL_PROVIDER=anthropic` as environment variables.

## Testing

| Command                 | What it does                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`              | Unit tests: validation rules, money, schema, mapping, review, audit trail, error handling.                                                                 |
| `npm run test:coverage` | The same, with coverage; fails if anything in `src/core/` drops below 100%.                                                                                |
| `npm run lint`          | ESLint, including the rule that keeps `src/core/` free of outside imports.                                                                                 |
| `npm run typecheck`     | TypeScript in strict mode.                                                                                                                                 |
| `npm run build`         | Production build, followed by the check that no API key is in the bundle.                                                                                  |
| `npm run eval`          | Sends every sample invoice to the model and reports field-level accuracy against the ground truth in `samples/expected/` (uses the API; about 6p per run). |
| `npm run samples`       | Regenerates the sample invoices and ground truth from `scripts/samples/data.ts`.                                                                           |

The sample invoices and what each one tests are described in [samples/README.md](samples/README.md).

## Logs

To read the serverless function's recent logs from the deployed site, use the Netlify CLI:

```sh
netlify logs --source functions --function extract --since 10m
```

## Licence

[MIT](LICENSE)
