import { describe, expect, it } from "vitest";
import { SAMPLE_DESCRIPTIONS, sampleUrls } from "../src/ui/samples.ts";
import { expectedSamples } from "./samples.ts";

describe("sample picker", () => {
  it("offers every sample invoice exactly once", () => {
    const offered = SAMPLE_DESCRIPTIONS.map((s) => s.file).sort();
    expect(offered).toEqual(Object.keys(sampleUrls).sort());
    expect(offered.map((f) => f.replace(/\.\w+$/, ""))).toEqual(
      Object.keys(expectedSamples).sort(),
    );
  });

  it("has a bundled URL for each sample", () => {
    for (const { file } of SAMPLE_DESCRIPTIONS) {
      expect(sampleUrls[file]).toContain(file.replace(/\.\w+$/, ""));
    }
  });
});
