// Ground-truth files from samples/expected/, keyed by sample name.
const modules = import.meta.glob<unknown>("../samples/expected/*.json", {
  eager: true,
  import: "default",
});

export const expectedSamples: Record<string, unknown> = Object.fromEntries(
  Object.entries(modules).map(([path, json]) => [
    path.replace(/^.*\/(.+)\.json$/, "$1"),
    json,
  ]),
);
