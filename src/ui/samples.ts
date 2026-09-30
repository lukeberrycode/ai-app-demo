// The "Try a sample" list. The files are the synthetic invoices in samples/
// (see samples/README.md); Vite bundles them as static assets.

const files = import.meta.glob<string>("../../samples/*.{pdf,jpg}", {
  query: "?url",
  import: "default",
  eager: true,
});

export interface Sample {
  file: string;
  title: string;
  shows: string;
}

/** Plain-language descriptions, in the order they are offered. */
export const SAMPLE_DESCRIPTIONS: Sample[] = [
  {
    file: "parts-supplier-clean.pdf",
    title: "Parts invoice",
    shows: "Everything checks out.",
  },
  {
    file: "bodyshop-multi-line.pdf",
    title: "Bodyshop repair",
    shows: "Nine lines, one of them at 0% VAT. Everything checks out.",
  },
  {
    file: "arithmetic-error.pdf",
    title: "Tyres and exhaust",
    shows: "The supplier's net total is wrong: two errors.",
  },
  {
    file: "invalid-vin.pdf",
    title: "Car service",
    shows: "The VIN contains the letter O: one error.",
  },
  {
    file: "used-vehicle-margin-scheme.pdf",
    title: "Used car purchase",
    shows: "Margin scheme, so no VAT is shown: one warning.",
  },
  {
    file: "photographed-service-invoice.jpg",
    title: "Photographed invoice",
    shows: "A phone photo with an older-style registration: one warning.",
  },
];

/** File name → bundled URL. */
export const sampleUrls: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop()!, url]),
);

export const MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
};
