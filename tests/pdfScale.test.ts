import { describe, expect, it } from "vitest";
import {
  MAX_CANVAS_PIXELS,
  pageSize,
  stepZoom,
  ZOOM_STEPS,
} from "../src/ui/pdfScale.ts";

const a4 = { width: 595, height: 842 };

describe("pageSize", () => {
  it("fits the page to the pane's width at zoom 1", () => {
    const size = pageSize(a4, 350, 1, 1);
    expect(size.cssWidth).toBeCloseTo(350);
    expect(size.cssHeight).toBeCloseTo((842 * 350) / 595);
    expect(size.renderScale).toBeCloseTo(350 / 595);
  });

  it("draws at the screen's pixel ratio, up to 2", () => {
    expect(pageSize(a4, 350, 1, 2).renderScale).toBeCloseTo((2 * 350) / 595);
    expect(pageSize(a4, 350, 1, 3).renderScale).toBeCloseTo((2 * 350) / 595);
  });

  it("keeps the canvas under the pixel limit when zoomed in", () => {
    const size = pageSize(a4, 900, 3, 2);
    expect(size.cssWidth).toBeCloseTo(2700);
    const pixels = a4.width * a4.height * size.renderScale ** 2;
    expect(pixels).toBeLessThanOrEqual(MAX_CANVAS_PIXELS + 1);
  });
});

describe("stepZoom", () => {
  it("moves one step in either direction", () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1, -1)).toBe(0.75);
  });

  it("stays put at either end", () => {
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0]);
    const last = ZOOM_STEPS[ZOOM_STEPS.length - 1];
    expect(stepZoom(last, 1)).toBe(last);
  });
});
