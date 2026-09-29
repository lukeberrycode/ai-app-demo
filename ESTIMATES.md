# ESTIMATES.md — reference only

These are rough time estimates for the plan in `CLAUDE.md`. They assume an experienced JavaScript/TypeScript developer working with AI assistance. They are not commitments, and they do not drive the plan.

| Step | Scope                                                                                       | Estimate |
| ---- | ------------------------------------------------------------------------------------------- | -------- |
| 0    | Setup: repo, tooling, provider account and spend cap, Netlify site and environment variable | 0.5–1 h  |
| 1    | Walking skeleton: upload → function → model → raw JSON, deployed                            | 1–2 h    |
| 2    | Schema, structured output, zod parsing, money helpers                                       | 1–2 h    |
| 3    | Validation rules and unit tests                                                             | 2–3 h    |
| 4    | Review UI: layout, editing, issues, actions                                                 | 3–5 h    |
| 5    | Audit trail and export                                                                      | 1–2 h    |
| 6    | Synthetic sample invoices, ground truth, sample picker (optional eval script adds ~1 h)     | 2–3 h    |
| 7    | Safeguards and error states                                                                 | 1–2 h    |
| 8    | Polish and README                                                                           | 2–4 h    |

**Total:** roughly 14–24 hours, or about 2–3 focused days.

**Milestones**

- A live, working end-to-end URL after Steps 0–1: about half a day.
- A presentable demo (extraction, validation and review) after Steps 0–4 plus a basic README: about 1.5 days.
- The complete plan as specified: about 2–3 days.

**Main sources of variance**

- The UI framework decision and how much visual polish is wanted.
- PDF handling, if the chosen provider does not accept PDFs natively.
- Netlify function timeout limits, if vision extraction is slow enough to need a background function.
- Making sample invoices look realistic.
