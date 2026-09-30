// Synthetic sample invoices. Every business, person, address, VAT number and
// vehicle here is invented for this project. Phone numbers use Ofcom's
// drama ranges. Money is integer pence.

export interface SampleLine {
  partNo?: string;
  description: string;
  quantity: number;
  unitPricePence: number;
  vatRate: number | null; // percent as printed; null where VAT is not shown
}

export interface Sample {
  slug: string;
  output: "pdf" | "jpg";
  purpose: string;
  theme: { accent: string; font: string };
  dateStyle: "numeric" | "long";
  supplier: {
    name: string;
    addressLines: string[];
    phone: string;
    email: string;
    vatNumber: string | null; // as printed
    companyNo: string;
  };
  customer: { name: string; addressLines: string[] };
  invoiceNumber: string;
  invoiceDate: string; // ISO 8601
  dueDate: string | null;
  orderRef?: string;
  vehicle: {
    registration: string;
    vin: string;
    make: string;
    model: string;
    mileage?: string;
  } | null;
  vatScheme: "standard" | "margin" | "zero-rated";
  lines: SampleLine[];
  // Deliberate error: print this net total instead of the true sum.
  printedNetPence?: number;
  notes: string[];
}

const dealer = {
  name: "Hartwell Motor Group Ltd",
  addressLines: ["Hartwell Park, Station Road", "Kenilworth", "CV8 1JD"],
};

export const samples: Sample[] = [
  {
    slug: "parts-supplier-clean",
    output: "pdf",
    purpose: "Clean parts-supplier invoice. Every rule should pass.",
    theme: { accent: "#1f4e8c", font: "'DejaVu Sans', sans-serif" },
    dateStyle: "numeric",
    supplier: {
      name: "Midlands Motor Parts Ltd",
      addressLines: ["Unit 7, Foundry Lane Trading Estate", "Coventry", "CV1 4AB"],
      phone: "024 7696 0418",
      email: "accounts@midlandsmotorparts.example",
      vatNumber: "GB 123 4567 89",
      companyNo: "08123456",
    },
    customer: dealer,
    invoiceNumber: "MMP-10482",
    invoiceDate: "2026-09-12",
    dueDate: "2026-10-12",
    orderRef: "PO 55721",
    vehicle: {
      registration: "AB12 CDE",
      vin: "WF0AXXGCDA1234567",
      make: "Ford",
      model: "Focus",
    },
    vatScheme: "standard",
    lines: [
      { partNo: "BP-4471", description: "Front brake pads (pair)", quantity: 1, unitPricePence: 4500, vatRate: 20 },
      { partNo: "BD-2210", description: "Front brake discs (pair)", quantity: 1, unitPricePence: 8850, vatRate: 20 },
      { partNo: "OF-0193", description: "Oil filter", quantity: 2, unitPricePence: 745, vatRate: 20 },
      { partNo: "EO-5W30-5", description: "Engine oil 5W-30, 5 litre", quantity: 1, unitPricePence: 3295, vatRate: 20 },
    ],
    notes: [
      "Payment terms: 30 days from invoice date.",
      "Bank: Example Bank plc · Sort code 00-00-00 · Account 00000000",
    ],
  },
  {
    slug: "bodyshop-multi-line",
    output: "pdf",
    purpose:
      "Bodyshop repair with parts, paint and labour. The MOT fee is outside the scope of VAT (0%), which is valid when stated.",
    theme: { accent: "#8c1f3a", font: "'DejaVu Serif', serif" },
    dateStyle: "long",
    supplier: {
      name: "Castle Accident Repair Centre",
      addressLines: ["2 Priory Works, Mill Street", "Warwick", "CV34 4HB"],
      phone: "01632 960 227",
      email: "invoices@castle-repair.example",
      vatNumber: "GB 987 6543 21",
      companyNo: "11987654",
    },
    customer: dealer,
    invoiceNumber: "CRC/2026/0917",
    invoiceDate: "2026-09-17",
    dueDate: "2026-10-01",
    orderRef: "Job 4418 · Claim ref HMG-7731",
    vehicle: {
      registration: "KX19 LMR",
      vin: "WVWZZZAUZKW123456",
      make: "Volkswagen",
      model: "Golf",
      mileage: "38,412",
    },
    vatScheme: "standard",
    lines: [
      { partNo: "5G0807221", description: "Front bumper cover, primed", quantity: 1, unitPricePence: 21450, vatRate: 20 },
      { partNo: "5G0853653", description: "Lower grille", quantity: 1, unitPricePence: 6480, vatRate: 20 },
      { partNo: "5G0941005", description: "Headlamp unit, nearside", quantity: 1, unitPricePence: 38995, vatRate: 20 },
      { partNo: "CLIP-KIT", description: "Bumper fixing clip kit", quantity: 1, unitPricePence: 1260, vatRate: 20 },
      { description: "Paint and materials (LB9A Pure White)", quantity: 1, unitPricePence: 14200, vatRate: 20 },
      { description: "Panel labour (hours)", quantity: 4.5, unitPricePence: 5800, vatRate: 20 },
      { description: "Paint labour (hours)", quantity: 3, unitPricePence: 5800, vatRate: 20 },
      { description: "Headlamp alignment", quantity: 1, unitPricePence: 3500, vatRate: 20 },
      { description: "MOT test fee (outside the scope of VAT)", quantity: 1, unitPricePence: 5485, vatRate: 0 },
    ],
    notes: [
      "Payment due within 14 days.",
      "All repairs carry a 12-month workmanship guarantee.",
    ],
  },
  {
    slug: "used-vehicle-margin-scheme",
    output: "pdf",
    purpose:
      "Used-vehicle trade purchase under the VAT margin scheme. No VAT is shown, which is valid (warning only).",
    theme: { accent: "#2e6b3a", font: "'DejaVu Sans', sans-serif" },
    dateStyle: "numeric",
    supplier: {
      name: "Brookfield Car Sales",
      addressLines: ["Brookfield Garage, Leek Road", "Stoke-on-Trent", "ST4 2QA"],
      phone: "01632 960 845",
      email: "sales@brookfieldcars.example",
      vatNumber: "GB 246 8024 68",
      companyNo: "09246802",
    },
    customer: dealer,
    invoiceNumber: "BCS-2026-311",
    invoiceDate: "2026-09-03",
    dueDate: "2026-09-10",
    vehicle: {
      registration: "LD68 XTP",
      vin: "SJNFAAJ11U1234567",
      make: "Nissan",
      model: "Qashqai",
      mileage: "52,190",
    },
    vatScheme: "margin",
    lines: [
      {
        description: "Nissan Qashqai 1.3 DIG-T Acenta Premium, 5dr, Grey — LD68 XTP",
        quantity: 1,
        unitPricePence: 845000,
        vatRate: null,
      },
    ],
    notes: [
      "Second-hand goods: margin scheme. VAT is not shown separately and cannot be reclaimed.",
      "Sold as seen, trade sale. Payment by bank transfer before collection.",
    ],
  },
  {
    slug: "arithmetic-error",
    output: "pdf",
    purpose:
      "The printed net total (£321.40) has transposed digits: the lines sum to £312.40. VAT and total are correct for £312.40, so both 'line items sum to net' and 'net + VAT = gross' fail.",
    theme: { accent: "#b35c00", font: "'DejaVu Sans', sans-serif" },
    dateStyle: "numeric",
    supplier: {
      name: "Apex Tyre & Exhaust Centre",
      addressLines: ["41 Holyhead Road", "Birmingham", "B21 0LA"],
      phone: "0121 496 0352",
      email: "office@apextyre.example",
      vatNumber: "GB 135 7913 57",
      companyNo: "07135791",
    },
    customer: dealer,
    invoiceNumber: "AT-88213",
    invoiceDate: "2026-09-21",
    dueDate: "2026-10-21",
    vehicle: {
      registration: "YH70 BNU",
      vin: "VF1RFB00X63123456",
      make: "Renault",
      model: "Clio",
      mileage: "27,655",
    },
    vatScheme: "standard",
    lines: [
      { partNo: "TY-2055516", description: "Tyre 205/55 R16 91V", quantity: 2, unitPricePence: 8950, vatRate: 20 },
      { partNo: "VLV-TR413", description: "Valve, rubber", quantity: 2, unitPricePence: 250, vatRate: 20 },
      { description: "Fitting and balancing", quantity: 2, unitPricePence: 1500, vatRate: 20 },
      { description: "Four-wheel alignment", quantity: 1, unitPricePence: 4995, vatRate: 20 },
      { description: "Tyre disposal (environmental)", quantity: 2, unitPricePence: 350, vatRate: 20 },
      { partNo: "EX-CLP-50", description: "Exhaust clamp 50mm", quantity: 1, unitPricePence: 1345, vatRate: 20 },
      { description: "Exhaust labour (hours)", quantity: 0.5, unitPricePence: 5600, vatRate: 20 },
    ],
    printedNetPence: 32140,
    notes: ["Payment terms: 30 days net."],
  },
  {
    slug: "invalid-vin",
    output: "pdf",
    purpose:
      "The VIN contains the letter O (position 8), which VINs never use. The model should copy it exactly, and validation should flag it.",
    theme: { accent: "#4b3a8c", font: "'DejaVu Sans', sans-serif" },
    dateStyle: "long",
    supplier: {
      name: "Stratford Prestige Servicing",
      addressLines: ["Unit 3, Timothy's Bridge Road", "Stratford-upon-Avon", "CV37 9HY"],
      phone: "01632 960 512",
      email: "service@stratfordprestige.example",
      vatNumber: "GB 864 2086 42",
      companyNo: "10864208",
    },
    customer: dealer,
    invoiceNumber: "SPS-40077",
    invoiceDate: "2026-09-08",
    dueDate: "2026-10-08",
    vehicle: {
      registration: "WR21 KHA",
      vin: "WDD2050O22F123456",
      make: "Mercedes-Benz",
      model: "C-Class",
      mileage: "19,870",
    },
    vatScheme: "standard",
    lines: [
      { description: "Service B (manufacturer schedule)", quantity: 1, unitPricePence: 32500, vatRate: 20 },
      { partNo: "A0009893706", description: "Brake fluid DOT 4+, 1 litre", quantity: 1, unitPricePence: 1840, vatRate: 20 },
      { partNo: "A2058350047", description: "Cabin filter", quantity: 1, unitPricePence: 4260, vatRate: 20 },
      { description: "Pollen filter labour (hours)", quantity: 0.3, unitPricePence: 9500, vatRate: 20 },
    ],
    notes: ["Payment terms: 30 days from invoice date."],
  },
  {
    slug: "photographed-service-invoice",
    output: "jpg",
    purpose:
      "A small garage's service invoice, photographed at an angle. It uses an older prefix-format registration (P428 KLV), which is valid but produces a registration-format warning.",
    theme: { accent: "#333333", font: "'DejaVu Sans Mono', monospace" },
    dateStyle: "numeric",
    supplier: {
      name: "Dave's Autocare",
      addressLines: ["Rear of 18 Albert Street", "Rugby", "CV21 2RT"],
      phone: "01632 960 093",
      email: "davesautocare@mail.example",
      vatNumber: "GB 314 1592 65",
      companyNo: "06314159",
    },
    customer: dealer,
    invoiceNumber: "2291",
    invoiceDate: "2026-09-15",
    dueDate: "2026-09-29",
    vehicle: {
      registration: "P428 KLV",
      vin: "SAXXRWAXCBD123456",
      make: "Rover",
      model: "200",
      mileage: "98,331",
    },
    vatScheme: "standard",
    lines: [
      { description: "Interim service", quantity: 1, unitPricePence: 11500, vatRate: 20 },
      { description: "Spark plugs", quantity: 4, unitPricePence: 675, vatRate: 20 },
      { description: "Wiper blades (pair)", quantity: 1, unitPricePence: 1895, vatRate: 20 },
      { description: "Labour (hours)", quantity: 1, unitPricePence: 4800, vatRate: 20 },
    ],
    notes: ["Cash, card or bank transfer. Thank you for your custom."],
  },
];
