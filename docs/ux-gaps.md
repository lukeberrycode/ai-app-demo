# Known UX gaps

Companion to [user-journeys.md](user-journeys.md), which is also the in-app Help guide. Places where the app does not yet guide the reviewer, or where a mistake is easy to make:

1. **Guidance is terse.** The only instruction on the review screen is the one-line reason Approve is disabled. Nothing tells a first-time reviewer to compare every field with the invoice (2.1), or explains the choice in 2.4.
2. **Misreads are invisible.** The rules cannot catch a value that was misread consistently, and nothing prompts the reviewer to check each field.
3. **Reject is instant and has no reason.** One click makes a final decision, and the audit trail does not record why.
4. **Approve is instant.** There is no summary of overrides and changes before the final decision.
5. **Edited fields are not marked.** The form does not show which values the reviewer changed from what the model extracted; only the audit trail does.
6. **Leaving mid-review loses the review.** The record is saved as "reviewing", but it cannot be resumed, and the app does not warn before you leave the page.
7. **No "Try again" after a failed upload.** The reviewer has to choose the same file again.
8. **No first-visit introduction.** The upload screen does not explain what the app does, and there is no sample to try (Step 6 adds a sample picker).
