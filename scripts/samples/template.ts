import type { Sample } from "./data.ts";

export interface Totals {
  lines: { netPence: number; vatPence: number | null }[];
  netPence: number; // as printed
  vatPence: number | null;
  grossPence: number;
}

export function formatPounds(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100).toLocaleString("en-GB");
  return `${sign}£${pounds}.${String(abs % 100).padStart(2, "0")}`;
}

function formatDate(iso: string, style: Sample["dateStyle"]): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (style === "numeric") {
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  }
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  return `${d} ${month} ${y}`;
}

function formatQuantity(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}

function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderInvoice(s: Sample, t: Totals): string {
  const showVat = s.vatScheme !== "margin";
  const showPartNo = s.lines.some((l) => l.partNo);

  const rows = s.lines
    .map((line, i) => {
      const cells = [
        showPartNo ? `<td class="mono">${esc(line.partNo ?? "")}</td>` : "",
        `<td>${esc(line.description)}</td>`,
        `<td class="num">${formatQuantity(line.quantity)}</td>`,
        `<td class="num">${formatPounds(line.unitPricePence)}</td>`,
        `<td class="num">${formatPounds(t.lines[i].netPence)}</td>`,
        showVat ? `<td class="num">${line.vatRate}%</td>` : "",
        showVat ? `<td class="num">${formatPounds(t.lines[i].vatPence ?? 0)}</td>` : "",
      ];
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("\n");

  const head = [
    showPartNo ? "<th>Part no.</th>" : "",
    "<th>Description</th>",
    '<th class="num">Qty</th>',
    '<th class="num">Unit price</th>',
    '<th class="num">Net</th>',
    showVat ? '<th class="num">VAT rate</th>' : "",
    showVat ? '<th class="num">VAT</th>' : "",
  ].join("");

  const vehicle = s.vehicle
    ? `<section class="box">
        <h3>Vehicle</h3>
        <table class="kv">
          <tr><th>Registration</th><td class="mono">${esc(s.vehicle.registration)}</td></tr>
          <tr><th>VIN</th><td class="mono">${esc(s.vehicle.vin)}</td></tr>
          <tr><th>Make / model</th><td>${esc(s.vehicle.make)} ${esc(s.vehicle.model)}</td></tr>
          ${s.vehicle.mileage ? `<tr><th>Mileage</th><td>${esc(s.vehicle.mileage)}</td></tr>` : ""}
        </table>
      </section>`
    : "";

  const totals = showVat
    ? `<tr><th>Net total</th><td>${formatPounds(t.netPence)}</td></tr>
       <tr><th>VAT</th><td>${formatPounds(t.vatPence ?? 0)}</td></tr>
       <tr class="grand"><th>Total due (GBP)</th><td>${formatPounds(t.grossPence)}</td></tr>`
    : `<tr><th>Sub-total</th><td>${formatPounds(t.netPence)}</td></tr>
       <tr class="grand"><th>Total due (GBP)</th><td>${formatPounds(t.grossPence)}</td></tr>`;

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>${esc(s.supplier.name)} — Invoice ${esc(s.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: ${s.theme.font}; font-size: 10pt; color: #1a1a1a; margin: 0; }
  /* Ubuntu Mono has a dotted zero, so a letter O in a VIN is visible. */
  .mono { font-family: 'Ubuntu Mono', 'DejaVu Sans Mono', monospace; font-size: 1.12em; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid ${s.theme.accent}; padding-bottom: 10px; }
  header h1 { margin: 0; font-size: 20pt; color: ${s.theme.accent}; }
  header .contact { text-align: right; font-size: 9pt; line-height: 1.45; }
  h2 { font-size: 22pt; letter-spacing: 0.15em; margin: 18px 0 8px; color: ${s.theme.accent}; }
  h3 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px; color: ${s.theme.accent}; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .box { border: 1px solid #ccc; padding: 8px 10px; }
  table { border-collapse: collapse; width: 100%; }
  .kv th { text-align: left; font-weight: normal; color: #555; width: 42%; padding: 2px 0; }
  .kv td { padding: 2px 0; }
  .lines th { background: ${s.theme.accent}; color: white; text-align: left; padding: 6px; font-size: 9pt; }
  .lines td { padding: 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  .lines tr:nth-child(even) td { background: #f6f6f6; }
  .num { text-align: right; white-space: nowrap; }
  .totals { width: 45%; margin: 12px 0 0 auto; }
  .totals th { text-align: left; font-weight: normal; padding: 4px 6px; }
  .totals td { text-align: right; padding: 4px 6px; }
  .totals .grand th, .totals .grand td { font-weight: bold; font-size: 12pt;
           border-top: 2px solid ${s.theme.accent}; }
  footer { margin-top: 24px; font-size: 8.5pt; color: #444; line-height: 1.5; }
  footer p { margin: 2px 0; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>${esc(s.supplier.name)}</h1>
      <div>${s.supplier.addressLines.map(esc).join("<br>")}</div>
    </div>
    <div class="contact">
      Tel: ${esc(s.supplier.phone)}<br>
      ${esc(s.supplier.email)}<br>
      ${s.supplier.vatNumber ? `VAT reg. no: ${esc(s.supplier.vatNumber)}<br>` : ""}
      Company no: ${esc(s.supplier.companyNo)}
    </div>
  </header>

  <h2>INVOICE</h2>

  <div class="grid">
    <section class="box">
      <h3>Invoice to</h3>
      <strong>${esc(s.customer.name)}</strong><br>
      ${s.customer.addressLines.map(esc).join("<br>")}
    </section>
    <section class="box">
      <h3>Details</h3>
      <table class="kv">
        <tr><th>Invoice no.</th><td>${esc(s.invoiceNumber)}</td></tr>
        <tr><th>Invoice date</th><td>${formatDate(s.invoiceDate, s.dateStyle)}</td></tr>
        ${s.dueDate ? `<tr><th>Due date</th><td>${formatDate(s.dueDate, s.dateStyle)}</td></tr>` : ""}
        ${s.orderRef ? `<tr><th>Reference</th><td>${esc(s.orderRef)}</td></tr>` : ""}
      </table>
    </section>
    ${vehicle}
  </div>

  <table class="lines">
    <thead><tr>${head}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>

  <table class="totals">
    ${totals}
  </table>

  <footer>
    ${s.notes.map((n) => `<p>${esc(n)}</p>`).join("\n    ")}
    <p>${esc(s.supplier.name)} · Registered in England and Wales no. ${esc(s.supplier.companyNo)}</p>
  </footer>
</body>
</html>
`;
}

// A desk scene around a rendered page image, for the photographed-style sample.
export function renderPhotoScene(pageImageFile: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 1500px 1900px; margin: 0; }
  html, body { margin: 0; width: 1500px; height: 1900px; overflow: hidden; }
  body {
    background:
      radial-gradient(ellipse at 30% 20%, #8a6a4a 0%, #5e452e 60%, #3d2c1c 100%);
    perspective: 2200px;
  }
  .page {
    position: absolute; left: 150px; top: 110px; width: 1200px;
    transform: rotateX(9deg) rotateY(-5deg) rotateZ(-3.5deg);
    transform-origin: 50% 40%;
    box-shadow: 18px 26px 40px rgba(0,0,0,0.55);
    filter: blur(0.6px) contrast(0.92) brightness(0.97) sepia(0.12);
  }
  .light {
    position: absolute; inset: 0;
    background: linear-gradient(115deg, rgba(255,250,235,0.18) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 100%);
  }
</style>
</head>
<body>
  <img class="page" src="${pageImageFile}">
  <div class="light"></div>
</body>
</html>
`;
}
