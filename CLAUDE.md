# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project:** Dealership Invoice Extractor (demo). This file holds the architecture and plan. Time estimates live separately in `ESTIMATES.md` and are for reference only.

**Current status:** Step 5 (Audit trail) — complete locally. Live check pending. Next: Step 6 (the remaining in-app sample picker and optional `eval.ts`; the samples themselves exist). The sample invoices and ground truth from Step 6 were built ahead on request; the in-app picker and `eval.ts` are still to do. Update this line as each step in §5 is completed.

---

## 1. Project summary

A small public web app that extracts structured data from UK motor-trade supplier invoices using a vision-capable LLM. Extraction is followed by deterministic validation and a human review step.

Core flow:

1. The user uploads an invoice (PDF, JPEG or PNG).
2. A serverless function sends it to a model, which returns structured JSON.
3. Application code validates the JSON against business rules.
4. Failed checks appear as exceptions in a review screen, where the user corrects, overrides (with a reason) or approves.
5. Every step is recorded in an audit trail.

The model is used for reading. Everything that decides whether data is trustworthy is ordinary, testable code.

### Deliverables

- A public GitHub repository containing the source, README and sample invoices.
- A live demo URL on Netlify, with automatic deploys on every push to `main`.

---

## 2. Scope and structure

This is a simple, self-contained demo of a human-in-the-loop AI workflow: automation does the routine extraction, and people review and resolve the exceptions, with a full audit trail. The project is complete in itself and describes itself on its own terms.

The code is organised as layers (an "onion"), and every dependency points inward:

| Layer             | Location                                        | Contains                                                                                                                   | May import                                        |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Core** (centre) | `src/core/`                                     | Domain types (`Invoice` in integer pence, `Issue`) and the validation rules                                                | Only other files in `src/core/`. No npm packages. |
| **Tooling**       | `src/lib/`, `shared/`                           | `money.ts` (pence helpers), the zod wire schema, the mapping from parsed model output to core types, the audit trail model | Core, and small libraries such as zod             |
| **Outer**         | `src/ui/`, `src/main.tsx`, `netlify/functions/` | UI, HTTP handler, model adapter, provider SDK, storage                                                                     | Anything inward                                   |

Rules for the core:

- No I/O, DOM, network, storage or environment access.
- No hidden inputs. Anything that varies at runtime is passed in as an argument. For example, the "invoice date is not in the future" rule takes `today` as a parameter rather than reading the clock.
- Money is already integer pence, so tolerance checks (±1p) are plain integer arithmetic and need no helpers.
- Enforce the boundary with an ESLint override for `src/core/**` (`no-restricted-imports` for packages and paths outside `src/core/`, `no-restricted-globals` for `window`, `document`, `fetch`, `localStorage`). Set this up in Step 0.
- `eslint.config.js` generates the relative-import override once per directory depth under `src/core/`, up to `CORE_MAX_DEPTH` (currently 4). Raise it if `src/core/` gains deeper folders.

---

## 3. Architecture decisions

### 3.1 Hosting and runtime

- The front end is a static site built with Vite and TypeScript, hosted on Netlify.
- The back end is a single Netlify Function (TypeScript) at `/.netlify/functions/extract`. It works like a small Express endpoint: the browser posts the file to it, and the function calls the model.
- The model API key is stored only as a Netlify environment variable. It is never sent to the browser or committed to the repo. Local development uses `.env`, which is git-ignored, via `netlify dev`.
- The Anthropic key is named `CLAUDE_API_KEY`. `netlify dev` injects its own `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` (Netlify AI Gateway, pointing at `<site>/.netlify/ai`), which replaces a key with the standard name. These are added by the CLI at runtime and do not appear in `netlify env:list` or the Netlify UI. The adapter passes `apiKey` and `baseURL` to the SDK explicitly, so calls always go straight to Anthropic on the project's own account and spend limit.
- Environment variables are available in every scope, builds included (per-scope settings need a paid Netlify plan). The key stays out of the bundle because Vite exposes only `VITE_`-prefixed variables to front-end code and nothing in `src/` reads `process.env`. The key never takes a `VITE_` prefix, and `vite.config.ts` never injects `process.env` through `define`. Step 7 adds a build check as a backstop.
- The browser never calls the model provider directly.

### 3.2 Model access

- A vision-capable model reads scanned and photographed invoices as well as digital PDFs.
- All model calls go through a single **model adapter** interface:

  ```ts
  interface ModelAdapter {
    extractInvoice(input: InvoiceFile): Promise<unknown>; // raw model output, parsed later
  }
  ```

  The implementation is selected with a `MODEL_PROVIDER` environment variable, so the provider can be changed without touching the rest of the app.

- Structured output uses the provider's native mechanism (JSON schema / tool use) where it is available. The response is always parsed and validated with **zod** before anything else uses it. Output that fails the schema is an error state, not a crash.
- PDF handling depends on the provider. If PDFs are accepted natively, they are sent directly. Otherwise, the first page (or pages) are rendered to images client-side with pdf.js before upload.
- The prompt instructs the model to return `null` for any field that is absent or illegible, and never to infer or invent values. Ambiguities go into an `extractionNotes` array.
- Model self-reported confidence is not used to decide anything. Trust is decided by the deterministic validation layer.

### 3.3 Extraction schema

The invoice has two representations with the same shape:

- **Wire schema** — zod, in `shared/schema.ts`. Money is decimal pounds (e.g. `123.45`), as printed on the invoice. Used by the function and the front end to parse model output, and converted to the structured-output JSON schema sent to the API (`z.toJSONSchema`, so field descriptions and enums carry through). The model does not convert money. Dates are the one conversion: the model writes them as ISO `YYYY-MM-DD`, reading UK dates day first.
- **Absent values on the wire:** text fields use an empty string, and numbers, dates and the vehicle use `null`. The API caps a structured-output schema at 16 union-typed (nullable) fields (verified 2026-09-30); non-nullable text keeps the schema at 11. `toInvoice` turns empty text into `null`, so the core type uses `null` throughout.
- **Core type** — plain TypeScript, in `src/core/invoice.ts`. Money is integer pence, which avoids floating-point rounding errors.

A mapping function in `src/lib/` converts a successfully parsed wire invoice into the core type, using `money.ts`. A compile-time check in `toInvoice.ts` fails if the wire schema and the core type gain or lose a field on only one side.

**Verify** that `shared/` resolves on both sides: Vite for the front end, and the Netlify Functions bundler (esbuild) for `netlify/functions/`. Set the tsconfig `include`/`paths` so `shared/` type-checks with both.

```ts
Invoice {
  supplier: { name, address, vatNumber }          // strings | null
  invoiceNumber: string | null
  invoiceDate: string | null                       // ISO 8601
  dueDate: string | null
  currency: string | null                          // expected "GBP"
  vatScheme: "standard" | "margin" | "zero-rated" | "unknown"
  vehicle: { registration, vin, make, model } | null
  lineItems: Array<{ description, quantity, unitPrice, net, vatRate, vat }>
  totals: { net, vat, gross }                      // money | null
  extractionNotes: string[]
}
```

Where each unit is used:

- **Pounds:** model output, the wire schema, and ground truth in `samples/expected/*.json` (so it compares directly with raw model output).
- **Pence:** validation, the review form's state, the audit trail's `before`/`after` values, and approved output.
- **Display** formats pence back to pounds. User-entered amounts are parsed straight to pence.

### 3.4 Validation layer

Validation lives in `src/core/validation/` as pure functions (see §2). It is fully unit-tested with Vitest. Each rule returns zero or more issues:

```ts
Issue { ruleId, field, severity: "error" | "warning", message }
```

- An **error** blocks approval until the field is corrected, or overridden with a written reason.
- A **warning** is displayed but does not block approval.

Rules include UK motor-trade specifics:

| Rule                                                                            | Severity | Notes                                                                                                   |
| ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| Required fields present (supplier name, invoice number, date, gross total)      | error    |                                                                                                         |
| Line items sum to net total                                                     | error    | ±1p tolerance for rounding                                                                              |
| Net + VAT = gross                                                               | error    | ±1p tolerance                                                                                           |
| VAT = 20% of net for standard-rated lines                                       | error    | Lines at 5% or 0% are valid when stated                                                                 |
| Margin-scheme invoices show no separate VAT                                     | warning  | Used vehicles are often sold under the VAT margin scheme with no VAT shown; this is valid, not an error |
| VIN is 17 characters and excludes I, O and Q                                    | error    | The VIN check digit (position 9) is mandatory in North America, not in Europe, so it is not enforced    |
| Registration matches the current UK format (e.g. `AB12 CDE`)                    | warning  | Older prefix, suffix and dateless formats are valid, so a non-match is a warning                        |
| Supplier VAT number format (`GB` + 9 or 12 digits, or `GBGD`/`GBHA` + 3 digits) | warning  | Format check only                                                                                       |
| Invoice date is not in the future                                               | error    | `today` is passed in                                                                                    |
| Due date is on or after invoice date                                            | warning  |                                                                                                         |
| Currency is GBP                                                                 | warning  |                                                                                                         |

How the rules read the table (implemented in `src/core/validation/`, one file per area):

- Arithmetic rules skip when a figure they need is missing; `required-fields` reports missing required values.
- VAT is checked per line at the line's stated rate (20%, 5% or 0%). When no line shows VAT, a standard-rated invoice's VAT total is checked at 20% of its net total.
- The margin-scheme warning appears on every margin-scheme invoice, as a notice that no VAT is shown and none is reclaimable. If VAT is shown, the message says so instead.
- Registration and VAT-number checks ignore spacing and case. The VIN check is exact.
- A present date that is not a real `YYYY-MM-DD` date is an error (`date-format`). This matters once fields are editable.
- Missing currency warns, as does any currency other than GBP.
- `tests/validation/samples.test.ts` checks that each sample invoice raises exactly the issues it was designed for.

### 3.5 Review UI

The reviewer's journeys, written as if/then steps, are in `docs/user-journeys.md`, along with the known gaps in guidance. Keep that file in step with the UI.

- The layout is split: the invoice preview is on the left, and the extracted fields form is on the right.
- Fields with issues are highlighted by severity, and the issue message is shown next to the field.
- Every field is editable. Editing re-runs validation immediately.
- Actions are **Approve** (enabled only when no unresolved errors remain), **Override** (per error, requires a reason) and **Reject**.
- An issues summary panel sits at the top, similar to an exceptions queue.
- A clear loading state is shown during extraction, and all failures have explicit error states: upload too large, model timeout, schema parse failure, and rate limit hit.
- Review logic is a pure reducer in `src/lib/review.ts` (edit, add/remove line, override, undo override, approve, reject). Each action is a plain object, ready to become an audit entry in Step 5. The components in `src/ui/` render state and dispatch actions.
- An override belongs to one rule on one field (`issueKey` = `ruleId@field`). It stays while that issue exists; removing a line moves overrides on later lines with them and drops those on the removed line.
- Money and number inputs keep the typed text as a draft and update the invoice only when it parses. An unreadable value is shown at the field and blocks Approve.
- An approved or rejected invoice is read-only.

### 3.6 Audit trail

- Each action appends an entry:

  ```ts
  AuditEntry {
    timestamp, invoiceId,
    action: "extracted" | "edited" | "overridden" | "approved" | "rejected",
    field?, before?, after?, reason?,
    actor: "demo-user"
  }
  ```

- The trail is shown as a timeline in the UI and can be exported as JSON.
- The raw model output is kept alongside the audit trail. This makes it possible to compare what the model extracted with what the user approved.
- Implemented in `src/lib/audit.ts` as an audited reducer around the review reducer. An action that changes the review appends an entry; a refused action (approve with errors left, override without a reason, any change after a decision) records nothing. Timestamps are passed in.
- Additions to the entry model above: an `override_removed` action for undoing an override; an optional `ruleId` on override entries; added and removed lines are `edited` entries on `lineItems[i]` with the whole line as `before`/`after`.
- Consecutive edits to one field (keystrokes) merge into one entry with the first `before` and the last `after`; an edit that returns to its starting value is dropped.
- The exported record holds the entries, the raw model output, the invoice as extracted and as it stands, the overrides, and the status.

### 3.7 Persistence

- There is no database. State is held in memory, with `localStorage` for the current session's invoices and audit trail.
- No uploaded documents are stored server-side. The function processes each file and discards it.
- Each invoice's audit record is saved to `localStorage` after every change (`src/ui/storage.ts`, newest 50 kept) and listed on the upload screen as "This session", with JSON export. Reads and writes are guarded, so blocked or full storage never breaks a review. The uploaded file itself is not stored, so past invoices can be exported but not reopened.

### 3.8 Safeguards (public URL)

- A hard monthly spend cap is set on the model provider account. This is the real backstop.
- There is a maximum upload size, enforced both client-side and in the function. Netlify buffers function request bodies up to **6 MB**, and binary uploads are base64-encoded (about 33% overhead), so the effective file limit is about 4.5 MB (verified 2026-09-30). The upload limit is **4 MB** (`shared/upload.ts`), comfortably below that.
- Only PDF, JPEG and PNG files are accepted.
- The function applies rate limiting. Netlify's rate-limit configuration is used if the plan supports it; otherwise a simple per-instance limiter is used, with the spend cap as the backstop.
- The function uses a timeout and returns a clean error. Netlify's synchronous function limit is **60 seconds** and cannot be raised (verified 2026-09-30). The model call times out at 50 seconds with no retries, leaving time for a clean error. A one-page invoice extracts in about 5 seconds at low effort. If that grows towards the limit, the options are a faster model, lower effort, or a background function with polling.
- Functions run on the build's Node version (Node 24, from `.nvmrc`) when it is a supported AWS Lambda runtime, and fall back to Node 24 otherwise. `AWS_LAMBDA_JS_RUNTIME` overrides this (verified 2026-09-30).

### 3.9 Sample data

- Invoices in `samples/` are synthetic and created for this project. They are built from HTML templates and exported to PDF, with a few also saved as photographed-style JPEGs. No real invoices or personal data are used.
- The sample set covers:
  - a clean parts-supplier invoice;
  - a bodyshop invoice with several line items;
  - a margin-scheme used-vehicle purchase invoice;
  - an invoice with a deliberate arithmetic error;
  - an invoice with an invalid VIN (containing an `O`);
  - a photographed or skewed invoice.
- Each sample has a ground-truth file at `samples/expected/<name>.json`. These support an optional accuracy script.

### 3.10 Code conventions

- TypeScript in `strict` mode throughout.
- Small modules, following the layer rules in §2.
- The UI is built with React (see §6).
- Vitest is used for unit tests, and validation rules have full coverage.
- ESLint and Prettier are used.
- Commits are small and descriptive. This is out of consideration for reviewers and users of this repo.

---

## 4. Repository layout

```
/
├── CLAUDE.md
├── ESTIMATES.md
├── README.md
├── netlify.toml
├── package.json
├── .env.example            # variable names only, no values
├── shared/
│   └── schema.ts           # zod wire schema (pounds), used by function and front end
├── netlify/
│   └── functions/
│       ├── extract.ts      # HTTP handler: size/type checks, rate limit, calls adapter, returns JSON
│       └── model/
│           ├── adapter.ts  # ModelAdapter interface + factory (MODEL_PROVIDER)
│           ├── anthropic.ts   # Anthropic Claude implementation
│           └── prompt.ts   # extraction prompt
├── src/
│   ├── main.tsx
│   ├── ui/                 # upload, preview, fields form, issues panel, audit timeline
│   ├── core/               # centre of the onion: no imports from outside core
│   │   ├── invoice.ts      # core Invoice type (pence) + Issue type
│   │   └── validation/     # pure rule functions + index
│   └── lib/
│       ├── money.ts        # pence helpers
│       ├── toInvoice.ts    # wire schema → core Invoice mapping
│       └── audit.ts        # audit trail model + export
├── samples/
│   ├── *.pdf / *.jpg       # synthetic invoices
│   └── expected/*.json     # ground truth
├── scripts/
│   └── eval.ts             # optional: runs samples through extraction, reports field accuracy
└── tests/
```

---

## 5. Execution plan

Each step ends in a working, deployable state. Deploying early matters more than polishing early.

**Step 0 — Setup**

- Create the repo and scaffold Vite + TypeScript. Add ESLint (including the `src/core/**` boundary override from §2), Prettier and Vitest.
- Create a model provider account, add a small amount of credit, and set a monthly spend cap.
- Create the Netlify site and link it to the GitHub repo. Set the API key environment variable. Add `.env.example`.

**Step 1 — Walking skeleton**

- Verify current Netlify limits before building: the synchronous function timeout, the request-body size limit, and the Node version functions run on. Record the values in §3.8.
- Build an upload control, and a function that sends the file to the model and returns the raw response. Display the raw JSON.
- Deploy. The live URL works end to end with an ugly UI.

**Step 2 — Schema and structured output**

- Write the zod wire schema, the core `Invoice` type, the structured-output request, the parse and error state, and the pounds-to-pence mapping.

**Step 3 — Validation rules**

- Implement the rules in §3.4 as pure functions, with unit tests for each rule (both passing and failing cases).

**Step 4 — Review UI**

- Build the split layout, editable fields, issue highlighting, re-validation on edit, and the Approve, Override and Reject actions.

**Step 5 — Audit trail**

- Record entries for every action, display the timeline, and add JSON export. Keep the raw model output alongside.

**Step 6 — Sample invoices and ground truth**

- Create the synthetic invoices listed in §3.9 and their expected JSON files. Add an in-app "Try a sample" picker so reviewers do not need their own files.
- Optionally, add `scripts/eval.ts` to report field-level accuracy against ground truth.

**Step 7 — Safeguards and error states**

- Add size and type limits, rate limiting, the timeout, and user-facing messages for every failure mode. Confirm the spend cap is active.
- Add a post-build check that fails the build if `sk-ant-` appears anywhere in `dist/`, so the API key can never ship in the front-end bundle. **Done:** `scripts/check-dist.ts`, run by `npm run build`; it also checks for the exact `CLAUDE_API_KEY` value when that is set, as in Netlify builds.
- ~~The site stays behind Netlify visitor access until these safeguards are in place.~~ Visitor access was switched off early (2026-09-30), after the build check above; rate limiting is the priority remaining safeguard.

**Step 8 — Polish and documentation**

- Finish the visual design and make the layout responsive.
- Complete the README (already started), adding:
  - a live link;
  - a "Try this" section that walks through the samples with deliberate errors, so the whole flow can be seen in under a minute;
  - design decisions and trade-offs (why validation is deterministic, why the key stays server-side, why margin-scheme handling matters);
  - local setup instructions.

---

## 6. Decisions

Resolved at the start of Step 0:

- **Model provider and model.** Anthropic Claude, via the official `@anthropic-ai/sdk` in the `anthropic.ts` adapter. It is vision-capable, accepts PDFs natively (so no client-side conversion is needed), and supports structured output through tool use. The default model is `claude-sonnet-5-5`, which balances speed and cost within the function timeout. The model ID is configuration, not code: `CLAUDE_MODEL` overrides the default. Requests use low effort (reading needs little reasoning) and the server-side refusal fallback (`fallbacks: "default"`).
- **UI framework.** React, with Vite and TypeScript. The review screen carries a lot of connected state (editable fields, live re-validation, overrides, the timeline).
- **Invoice rendering.** The browser's built-in viewer: PDFs in an `<iframe>` from a blob URL, images in an `<img>`. No pdf.js dependency.
- **Licence.** MIT.

---

## 7. Instructions for Claude Code

- Follow the step order in §5. Do not build ahead of the current step unless asked.
- Keep dependencies pointing inward (§2). `src/core/` imports nothing from outside itself.
- Never place the API key, or any code that reads it, in the front-end bundle.
- Keep validation logic pure and tested. New rules come with tests.
- Treat model output as untrusted input: parse it with zod and handle failure explicitly.
- When adding a dependency, add it to the Dependencies section of `README.md` under its layer.
- Prefer small, reviewable changes and descriptive commit messages.
- Mark anything that depends on current platform limits (Netlify or provider) as "verify" rather than assuming values.
- When checking environment variables or secrets, print only presence, length or prefix, never values.

---

## 8. Development notes

- **Commands:** `npm run dev` (Vite only), `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage` (fails below 100% on `src/core/`), `npm run build` (ends with `npm run check:dist`, which fails if an API key appears in `dist/`), `npm run format`. `netlify dev` serves the front end and functions together on `http://localhost:8888`, with variables from `.env`.
- **Live site:** https://luke-berry-ai-app-demo.netlify.app (renamed from `voluble-shortbread-33d0b9`), deployed from `main`. Public: visitor access was switched off on 2026-09-30, once the key-leak build check was in place and before rate limiting. Until rate limiting lands, the prepaid credit (no auto-reload) and the monthly spend limit cap the cost of misuse.
- **TypeScript** is pinned to `~6.0` because the `typescript-eslint` peer range stops below 6.1. Check that range before upgrading.
- **`netlify dev:exec`** parses flags itself, so `netlify dev:exec node -p "…"` fails with "unknown option". Use a command without flags (e.g. `printenv NAME`) or run a script file.
- **Sample invoices:** `npm run samples` regenerates `samples/` (PDFs, one JPEG, `expected/*.json`, `README.md`) from `scripts/samples/data.ts`. It needs Google Chrome (headless, override with `CHROME=`), `pdftoppm` (poppler-utils) and the Ubuntu Mono font, whose dotted zero keeps a letter O in a VIN visible. The script asserts that every amount is whole pence and that the VINs are valid or invalid as intended. The output is committed; edit the data, not the output. `samples/` is excluded from Prettier.
- **`deno.lock`** is written by `netlify dev` when it sets up the Edge Functions runtime. The project has no edge functions, and the file is git-ignored.
- **Netlify CLI** is installed globally (`npm i -g netlify-cli`). npm skips its install scripts (esbuild, sharp, unix-dgram, netlify-cli postinstall), and the CLI works without them.
