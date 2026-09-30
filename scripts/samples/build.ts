// Builds the synthetic sample invoices in samples/ from scripts/samples/data.ts:
// PDFs (and one photographed-style JPEG) rendered with headless Google Chrome
// and pdftoppm, ground truth in samples/expected/, and samples/README.md.
//
// Run: npm run samples

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { samples, type Sample } from "./data.ts";
import { formatPounds, renderInvoice, renderPhotoScene, type Totals } from "./template.ts";

const OUT_DIR = resolve("samples");
const EXPECTED_DIR = join(OUT_DIR, "expected");
const CHROME = process.env.CHROME ?? "google-chrome";

function fail(sample: Sample, message: string): never {
  throw new Error(`${sample.slug}: ${message}`);
}

function computeTotals(s: Sample): Totals {
  const lines = s.lines.map((line) => {
    const exact = line.quantity * line.unitPricePence;
    const netPence = Math.round(exact);
    if (Math.abs(exact - netPence) > 1e-6) {
      fail(s, `${line.description}: quantity × unit price is not whole pence`);
    }
    if (line.vatRate === null) return { netPence, vatPence: null };
    const vatExact = (netPence * line.vatRate) / 100;
    if (!Number.isInteger(vatExact)) {
      fail(s, `${line.description}: VAT is not whole pence; pick a net divisible by 5p`);
    }
    return { netPence, vatPence: vatExact };
  });

  const trueNet = lines.reduce((sum, l) => sum + l.netPence, 0);
  const vatShown = lines.every((l) => l.vatPence !== null);
  const vatPence = vatShown ? lines.reduce((sum, l) => sum + (l.vatPence ?? 0), 0) : null;
  return {
    lines,
    netPence: s.printedNetPence ?? trueNet,
    vatPence,
    // Gross is always correct for the true net; only the printed net is wrong.
    grossPence: trueNet + (vatPence ?? 0),
  };
}

const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

function check(s: Sample) {
  if (!s.vehicle) return;
  const valid = VIN.test(s.vehicle.vin);
  if (valid === (s.slug === "invalid-vin")) {
    fail(s, `VIN ${s.vehicle.vin} is ${valid ? "valid" : "invalid"} unexpectedly`);
  }
}

// Ground truth in the wire shape (CLAUDE.md §3.3): money in pounds, exactly as
// printed, so it compares directly with raw model output.
function expected(s: Sample, t: Totals) {
  const pounds = (pence: number | null) => (pence === null ? null : pence / 100);
  return {
    supplier: {
      name: s.supplier.name,
      address: s.supplier.addressLines.join(", "),
      vatNumber: s.supplier.vatNumber,
    },
    invoiceNumber: s.invoiceNumber,
    invoiceDate: s.invoiceDate,
    dueDate: s.dueDate,
    currency: "GBP",
    vatScheme: s.vatScheme,
    vehicle: s.vehicle
      ? {
          registration: s.vehicle.registration,
          vin: s.vehicle.vin,
          make: s.vehicle.make,
          model: s.vehicle.model,
        }
      : null,
    lineItems: s.lines.map((line, i) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: pounds(line.unitPricePence),
      net: pounds(t.lines[i].netPence),
      vatRate: line.vatRate,
      vat: pounds(t.lines[i].vatPence),
    })),
    totals: {
      net: pounds(t.netPence),
      vat: pounds(t.vatPence),
      gross: pounds(t.grossPence),
    },
    extractionNotes: [],
  };
}

function chrome(workDir: string, args: string[]) {
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--allow-file-access-from-files",
      `--user-data-dir=${join(workDir, "chrome-profile")}`,
      ...args,
    ],
    { stdio: "ignore" },
  );
}

function printToPdf(workDir: string, htmlFile: string, pdfFile: string) {
  chrome(workDir, ["--no-pdf-header-footer", `--print-to-pdf=${pdfFile}`, `file://${htmlFile}`]);
}

function readmeRow(s: Sample, t: Totals): string {
  const file = `${s.slug}.${s.output}`;
  return `| [\`${file}\`](${file}) | ${s.supplier.name} | ${formatPounds(t.grossPence)} | ${s.purpose} |`;
}

function main() {
  mkdirSync(EXPECTED_DIR, { recursive: true });
  const workDir = mkdtempSync(join(tmpdir(), "invoice-samples-"));
  const rows: string[] = [];

  try {
    for (const s of samples) {
      check(s);
      const totals = computeTotals(s);
      const html = join(workDir, `${s.slug}.html`);
      const pdf = join(workDir, `${s.slug}.pdf`);
      writeFileSync(html, renderInvoice(s, totals));
      printToPdf(workDir, html, pdf);

      if (s.output === "pdf") {
        copyFileSync(pdf, join(OUT_DIR, `${s.slug}.pdf`));
      } else {
        // Render the page to an image, place it in a desk scene, and export
        // that scene as a JPEG.
        const pagePng = join(workDir, `${s.slug}-page`);
        execFileSync("pdftoppm", ["-png", "-r", "150", "-singlefile", pdf, pagePng]);
        const sceneHtml = join(workDir, `${s.slug}-scene.html`);
        const scenePdf = join(workDir, `${s.slug}-scene.pdf`);
        writeFileSync(sceneHtml, renderPhotoScene(`file://${pagePng}.png`));
        printToPdf(workDir, sceneHtml, scenePdf);
        execFileSync("pdftoppm", [
          "-jpeg",
          "-jpegopt",
          "quality=80",
          "-r",
          "96",
          "-singlefile",
          scenePdf,
          join(OUT_DIR, s.slug),
        ]);
      }

      writeFileSync(
        join(EXPECTED_DIR, `${s.slug}.json`),
        JSON.stringify(expected(s, totals), null, 2) + "\n",
      );
      rows.push(readmeRow(s, totals));
      console.log(`built ${s.slug}.${s.output}`);
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  writeFileSync(
    join(OUT_DIR, "README.md"),
    `# Sample invoices

Synthetic invoices created for this project. Every business, address, VAT number, phone number and vehicle is invented. Phone numbers use Ofcom's drama ranges.

Generated by \`npm run samples\` from \`scripts/samples/data.ts\`; do not edit by hand. Ground truth for each file is in \`expected/<name>.json\`, in pounds and exactly as printed, including deliberate errors.

| File | Supplier | Total | What it tests |
| ---- | -------- | ----- | ------------- |
${rows.join("\n")}
`,
  );
}

main();
