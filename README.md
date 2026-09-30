# Dealership Invoice Extractor

A small web app that reads UK motor-trade supplier invoices (PDF, JPEG or PNG) with a vision-capable AI model, checks the extracted data against deterministic business rules, and lets a person review, correct, override or approve the result. Every action is recorded in an exportable audit trail.

The model does the reading. Everything that decides whether the data can be trusted is ordinary, tested code.

> **Status:** in early development. A live demo link and a "Try this" walkthrough will be added here.

## How it works

1. You upload an invoice.
2. A serverless function sends it to the model, which returns structured JSON.
3. The JSON is checked against a schema, then converted into the app's own invoice type, with money held as integer pence.
4. Validation rules check the invoice: arithmetic, VAT, VIN and registration formats, dates and required fields.
5. Anything that fails appears as an exception in the review screen. You correct it, override it with a written reason, or reject the invoice.
6. Every step is recorded in the audit trail, alongside the raw model output.

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

The versions in `package.json` are the source of truth. The entries below explain what each dependency is and why it is used here. Items marked _planned_ are not installed yet.

### Core

None, by design.

### Tooling layer

- **zod** _(planned)_: a TypeScript library for describing the shape of data and checking real data against it at runtime. TypeScript types only exist while the code compiles. They cannot check JSON that arrives from outside while the app is running. zod fills that gap. You write a schema once, and `schema.safeParse(data)` returns either correctly typed data or a list of exactly what was wrong. `z.infer` produces the matching TypeScript type from the same schema. Here, zod checks the model's JSON output, which is treated as untrusted. A response that does not match the schema becomes a clear error state instead of a crash further on.
- **`money.ts`** (in this repo, not a package): helpers that convert between decimal pounds and integer pence, and format pence for display. Integer pence avoid floating-point errors such as `0.1 + 0.2 !== 0.3`, so totals can be compared exactly.

### Outer layer

- **React** and **react-dom**: the UI library for the upload, review and audit screens. The review screen has a lot of connected state (editable fields, live re-validation, overrides), and React keeps that manageable.
- **@anthropic-ai/sdk**: Anthropic's client library for the Claude API. Claude reads images and PDFs directly, so no conversion step is needed. It is used only inside the serverless function's model adapter. The API key stays on the server.

The invoice preview uses the browser's built-in PDF and image viewers, so no rendering library is needed.

### Development tools

- **TypeScript**: JavaScript with static types, run in strict mode.
- **Vite** and **@vitejs/plugin-react**: the dev server and build tool for the front end, with React support.
- **Netlify** and the **Netlify CLI**: hosting for the static site and the serverless function. `netlify dev` runs both locally, together with the environment variables.
- **Vitest**: the unit test runner. The validation rules have full coverage.
- **ESLint**, with **@eslint/js**, **typescript-eslint**, **eslint-plugin-react-hooks**, **eslint-plugin-react-refresh** and **globals**: finds likely bugs and enforces the layer boundaries. `src/core/` may import only from inside itself, and cannot touch the DOM, network, storage, environment or clock.
- **eslint-config-prettier**: switches off ESLint rules that would clash with Prettier.
- **Prettier**: automatic code formatting.
- **@types/react**, **@types/react-dom** and **@types/node**: type definitions for React and Node.

## Licence

[MIT](LICENSE)
