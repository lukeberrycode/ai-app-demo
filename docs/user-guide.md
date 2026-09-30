# User guide

## What this app does

You upload a supplier invoice. An AI model reads it and fills in a form with what it finds: the supplier, the invoice details, the vehicle, every line item and the totals. The app then checks that data against a set of rules, such as whether the lines add up and whether the VIN is valid, and shows you anything that looks wrong.

Then you compare the form with the invoice, review any errors and warnings, and decide what to do next:

- If you think the form matches the invoice and there are no errors, you can **Approve** it.
- If you think that the AI has misread anything on the invoice, including missing or extra line items, you can correct it in the form, then **Approve** it.
- If you think the original invoice contains errors, and it should be sent back to the party that raised it, you can **Reject** it.
- If you think the original invoice contains an error, but you have confirmed the correct value from another source (for example, the VIN on the vehicle's registration document), you can correct it in the form, then **Approve** it. The audit trail keeps both the printed value and your correction.
- If you think an error reported by the app does not apply to this invoice, or you accept the invoice despite it, you can **override** the error by giving a reason, then **Approve** the invoice.
- If you think a warning points to a wrong value, you can correct it. If the value is right, you need do nothing: warnings never stop you approving.
- If you think the file should not be processed at all (it is not an invoice, it is a duplicate, or it is addressed to someone else), you can **Reject** it.

You can approve only when every error has been corrected or overridden. Everything you do is recorded in an audit trail that you can download.

The AI model only reads the invoice. It does not decide whether the data is right; the checks and you do.

## What you need

- An invoice as a **PDF, JPEG or PNG** file, no larger than **4 MB**.
- About a minute per invoice. Reading takes 5–10 seconds; checking takes as long as the invoice needs.

## The review screen

After an invoice has been read, the screen has four parts:

- **The bar at the top** shows the file name and the **Reject** and **Approve** buttons. When **Approve** is unavailable, the bar tells you why.
- **The issues list** sits below the bar. Its heading counts the unresolved errors, overridden errors and warnings. Each issue names the field it concerns; click the field name to jump to it in the form.
- **The invoice** is on the left, exactly as uploaded. You can scroll it, and zoom into PDFs with the viewer's controls.
- **The form** is on the right, filled in by the AI model. Every field can be edited. A field with a problem is outlined in colour, with the explanation underneath:
  - **Red** means an error.
  - **Amber** means a warning.
  - **Purple** means an error that has been overridden.

Below the form is the **audit trail**, a timeline of everything that has happened to this invoice.

Open **Help** at any time to see this guide. It opens in front of the app and remembers where you were reading, so you can switch between the guide and the form.

## Errors and warnings

- An **error** means the data breaks a rule that must hold, for example the totals do not add up. You cannot approve the invoice until every error is either corrected or overridden with a reason.
- A **warning** means something is unusual and worth checking, for example an older style of registration number. Warnings never stop you approving.

## How to review an invoice

### 1. Upload the invoice

Choose the file with **Upload an invoice**. The app shows "Reading…" while the AI model reads it, then opens the review screen.

### 2. Compare the form with the invoice

Go through the form field by field and compare each value with the invoice on the left.

Do this even when the issues list says there are no issues. The checks find data that does not fit together, but they cannot tell whether a value that looks sensible was read correctly. Only you can.

### 3. Correct anything that was misread

If a value in the form is different from what is printed on the invoice, then change it to match the invoice.

The checks run again as you type. If your correction fixes a problem, the problem disappears straight away.

### 4. Deal with each error

For each error, first compare the field with the invoice.

- If the form is different from the invoice, then the value was misread. Correct it to match the invoice.
- If the form matches the invoice, then the error is on the invoice itself (for example, the supplier added up wrongly). Choose one:
  - If the invoice should not be accepted as printed, then **reject** it (step 7) and ask the supplier for a corrected invoice.
  - If you have confirmed the correct value from another source (for example, the VIN on the vehicle's registration document), then enter the correct value in the form. The audit trail records both the printed value and your correction.
  - If you accept the invoice despite the error, or the check does not apply to this invoice, then **override** the error (step 5).

### 5. Override an error, if you need to

1. Click **Override…** under the error.
2. Type the reason. The reason is required and is kept in the audit trail.
3. Click **Confirm override**.

The error is struck through, turns purple and shows your reason. It no longer stops you approving.

If you change your mind, click **Undo** next to the reason. The error becomes unresolved again.

### 6. Check each warning

- If the value is correct (for example, a genuine older registration such as P428 KLV), then no action is needed.
- If the value is wrong, then correct it as in step 3.

### 7. Approve or reject

- If every error is corrected or overridden and the form matches the invoice, then click **Approve**.
- If the invoice should not be processed (it is not an invoice, it is a duplicate, it is for someone else, or it needs to be reissued by the supplier), then click **Reject**. You can reject at any time, whatever the errors.

Approving or rejecting is final. The form becomes read-only and the bar shows **Approved** or **Rejected**. To look at the same invoice again, upload it again.

When you have finished, download the record if you need it (see "Your records"), then click **Review another invoice**.

## Editing the form

- **Text** fields accept anything. Clear a field to mark the value as missing.
- **Amounts** are in pounds. Type `1234.56`, `1,234.56` or `£1,234.56`. Use at most two decimal places.
- **Quantities** and **VAT rates** are plain numbers. Type `20` for 20%.
- **Dates** use the date picker.
- **Line items**: if a line is missing, click **Add line** and fill it in. If a line is not on the invoice, click **✕** at the end of it. Removing a line also removes any override on that line.

If you type something the app cannot read as an amount or number (for example `12.3.4`), the field says so and keeps what you typed. **Approve** is unavailable until you correct it or clear the field.

## Why Approve is unavailable

The bar at the top tells you what to do:

| The bar says                                | What to do                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| Correct or override every error to approve. | Deal with each error in the issues list (steps 3–5).                           |
| Fix 1 unreadable value first.               | Correct the value outlined in red with "Enter an amount…" or "Enter a number." |

## The checks

### Errors

| Check                | What it means                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required fields      | The supplier name, invoice number, invoice date and gross total (the total due) must be present.                                                                        |
| Line items add up    | The line amounts must add up to the net total, to within 1p for rounding.                                                                                               |
| Totals add up        | The net total plus VAT must equal the gross total, to within 1p.                                                                                                        |
| VAT matches the rate | Each line's VAT must match its stated rate (20%, 5% or 0%), to within 1p. If no line shows VAT, the VAT total must be 20% of the net total on a standard-rated invoice. |
| VIN                  | A VIN has exactly 17 characters and never contains the letters I, O or Q.                                                                                               |
| Invoice date         | The invoice date cannot be in the future.                                                                                                                               |
| Valid dates          | Any date entered must be a real date.                                                                                                                                   |

### Warnings

| Check         | What it means                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Margin scheme | Used vehicles are often sold under the VAT margin scheme, with no VAT shown. This is normal, but no VAT can be reclaimed, so the app points it out. |
| Registration  | Current UK registrations look like AB12 CDE. Older styles are valid, so check that an older-looking registration was read correctly.                |
| VAT number    | UK VAT numbers are GB followed by 9 or 12 digits, or GBGD or GBHA followed by 3 digits. The app checks the format only.                             |
| Due date      | The due date is normally on or after the invoice date.                                                                                              |
| Currency      | Invoices are expected to be in pounds sterling (GBP).                                                                                               |

## If an invoice cannot be read

The upload button stays available, so you can try again straight away.

| The app says                                         | What to do                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Upload a PDF, JPEG or PNG file.                      | Choose a file of one of those types.                                    |
| The file is too large (limit 4 MB).                  | Use a smaller scan, or save the PDF at a lower quality.                 |
| The model took too long to respond.                  | Try again. If it keeps happening, try a smaller or clearer file.        |
| The model is rate limited.                           | Wait a minute, then try again.                                          |
| The model declined to read this file.                | Check that the file is an invoice, then try again.                      |
| The model's output was cut off.                      | Try again. Very long invoices may not fit.                              |
| The model's output did not match the invoice schema. | Try again. The model occasionally returns an answer the app cannot use. |
| Model request failed, or Request failed              | Try again later. The service or the network had a problem.              |
| Could not reach the server.                          | Check your internet connection, then try again.                         |
| The server is not configured correctly.              | This cannot be fixed from your side. Contact whoever runs the app.      |

## Your records

### The audit trail

Every action is recorded as it happens: the invoice being read, each change you make (with the value before and after), each override and its reason, and the final decision. Each entry shows the time and who acted.

Typing in a field is recorded as one change, however many keystrokes it takes. If you change a field and then, before touching anything else, type its original value back, nothing is recorded.

### Downloading a record

Click **Export JSON** in the audit trail, during or after the review. The file contains:

- every audit trail entry;
- the AI model's answer exactly as it was received;
- the invoice as it was read, and as it stands after your review;
- every override and its reason;
- the decision.

### Earlier invoices

The upload screen lists the invoices you have reviewed in this browser under **This session**, with the decision and the number of audit entries. Click **Export JSON** to download a record again. Click **Clear history** to remove the list.

The uploaded files themselves are not kept, so an earlier invoice cannot be reopened for review.

## Privacy

- The invoice is sent to an AI model to be read, and is not stored by this app.
- Your review history is stored only in this browser. It is not shared with other devices or people, and clearing your browser data removes it.
- This is a demonstration. Do not upload invoices that contain personal information.
