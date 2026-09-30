# User journeys

How to review an invoice, written as short **if … then …** steps. Each step names one situation and one action. The app shows this guide under **Help**.

Terms used below:

- **Invoice preview**: the uploaded document, shown on the left.
- **Form**: the extracted data, shown on the right. The model pre-fills it by reading the invoice.
- **Issues panel**: the list above the preview and form. It shows every problem the validation rules found.
- **Error**: a problem that blocks approval until it is corrected or overridden.
- **Warning**: a problem worth checking. It never blocks approval.

## 1. Upload an invoice

1. If you have an invoice as a PDF, JPEG or PNG of up to 4 MB, then choose it with **Upload an invoice**.
2. If the file is another type, then the app says "Upload a PDF, JPEG or PNG file." Choose a different file.
3. If the file is larger than 4 MB, then the app says the file is too large. Use a smaller scan, or save the PDF at a lower quality.
4. While the app reads the invoice, it shows "Reading … this usually takes 5–10 seconds." Wait; the upload control is disabled until reading finishes.
5. If reading succeeds, then the review screen opens. Go to journey 2.

### If reading fails

The upload control stays available after any failure, so you can try again straight away.

| If the app says                                                                 | Then                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| "The model took too long to respond."                                           | Try again. If it keeps happening, try a smaller or clearer file. |
| "The model is rate limited."                                                    | Wait a minute, then try again.                                   |
| "The model declined to read this file."                                         | Check that the file is an invoice, then try again.               |
| "The model's output was cut off."                                               | Try again. Very long invoices may not fit.                       |
| "The model's output did not match the invoice schema.", with a list of problems | Try again. The model occasionally returns a malformed answer.    |
| "Model request failed (…)" or "Request failed (…)"                              | Try again later. The service or network had a problem.           |
| "Could not reach the server."                                                   | Check your internet connection, then try again.                  |
| "The server is not configured correctly."                                       | This is not something you can fix. Contact whoever runs the app. |

## 2. Review the extracted data

The model reads the invoice; it does not decide whether the data is right. You do, with help from the validation rules.

### 2.1 Start here

1. Read the heading of the issues panel. It counts unresolved errors, overridden errors and warnings.
2. Compare every field in the form (right) with the invoice preview (left). Do this even when the issues panel shows no issues: the rules catch data that is inconsistent, not data that was misread consistently.
3. If you click a field name in the issues panel, then the form scrolls to that field and focuses it.

### 2.2 If the form matches the invoice and there are no errors

1. Then click **Approve**.

### 2.3 If a form value differs from the invoice (a misread)

1. Then change the form value to match what is printed on the invoice.
2. The rules run again as you type, and the issues panel updates immediately.
3. If that fixes an error, then the error disappears from the panel and the field.
4. Then continue with 2.2.

### 2.4 If the form matches the invoice, but there is an error

The error is on the invoice itself (for example, the supplier added up wrongly, or printed an impossible VIN). Choose one:

1. If the invoice should not be accepted as printed, then click **Reject** (2.10). The supplier can issue a corrected invoice.
2. If you have confirmed the correct value from another source (for example, the VIN on the vehicle's V5C), then correct the form. The audit trail records the value before and after your change. Then continue with 2.2.
3. If the rule does not apply to this invoice, or you accept the invoice despite the error, then override the error:
   1. Click **Override…** under the error.
   2. Type a reason. **Confirm override** stays disabled until you do.
   3. Click **Confirm override**. The error is struck through, marked as overridden, and shows your reason.
   4. When no unresolved errors remain, click **Approve**.

### 2.5 If there is a warning

1. Then check the value the warning refers to against the invoice.
2. If the value is correct (for example, an older-style registration such as P428 KLV, or a margin-scheme invoice with no VAT), then no action is needed. Warnings never block approval.
3. If the value is wrong, then correct it as in 2.3.

### 2.6 If you change your mind about an override

1. Then click **Undo** next to the override reason.
2. The error becomes unresolved again, and **Approve** is disabled until it is corrected or overridden.

### 2.7 If the line items are wrong

1. If the model missed a line, then click **Add line** and fill it in.
2. If the model added a line that is not on the invoice, then click **✕** at the end of that line.
3. If you remove a line, then any override on that line is removed with it, and overrides on later lines stay with their lines.

### 2.8 If you type a value the app cannot read

1. If a money or number field contains something that is not a number (for example, "12.3.4"), then the field shows "Enter an amount in pounds, such as 123.45." or "Enter a number."
2. The app keeps what you typed and does not change the data.
3. **Approve** is disabled until you correct the value or clear the field.

### 2.9 If Approve is disabled

The bar at the top says why:

| If the bar says                               | Then                                          |
| --------------------------------------------- | --------------------------------------------- |
| "Fix N unreadable values first."              | Correct the highlighted values (2.8).         |
| "Correct or override every error to approve." | Deal with each unresolved error (2.3 or 2.4). |

### 2.10 Reject

1. If the invoice should not be processed (it is not an invoice, it is a duplicate, it is addressed to someone else, or its errors need a corrected invoice from the supplier), then click **Reject**.
2. **Reject** is always available, whatever the errors.

### 2.11 After you approve or reject

1. The form becomes read-only, and the bar shows **Approved** or **Rejected**.
2. The decision is final for this upload. To review the same invoice again, upload it again.
3. Then click **Review another invoice**, or export the audit trail first (journey 3).

## 3. Keep a record

1. If you need a record of the review, then click **Export JSON** in the audit trail. You can do this at any time, during or after the review.
2. The file contains every action (who, when, what changed, and the value before and after), the model's output exactly as received, the invoice as extracted, the invoice as approved, and every override with its reason.
3. The audit trail below the form shows the same entries as a timeline.

## 4. Come back to earlier invoices

1. After a review, the upload screen lists the invoice under **This session**, with its status and number of audit entries.
2. If you need its record, then click **Export JSON** next to it.
3. If you want to remove the list from this browser, then click **Clear history**.
4. The list is kept in this browser only. It is not shared with other devices or people.
5. The uploaded file is not kept, so an earlier invoice cannot be reopened for review.
