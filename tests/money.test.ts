import { describe, expect, it } from "vitest";
import { formatPence, parsePence, poundsToPence } from "../src/lib/money.ts";

describe("poundsToPence", () => {
  it.each([
    [0, 0],
    [19.99, 1999],
    [1234.56, 123456],
    [0.1 + 0.2, 30], // 0.30000000000000004
    [8450, 845000],
    [-12.5, -1250],
    [-0, 0],
  ])("%s → %s", (pounds, pence) => {
    expect(poundsToPence(pounds)).toBe(pence);
    expect(Object.is(poundsToPence(pounds), -0)).toBe(false);
  });

  it.each([1.005, 0.125, 12.345, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s (not whole pence)",
    (pounds) => {
      expect(() => poundsToPence(pounds)).toThrow(RangeError);
    },
  );
});

describe("formatPence", () => {
  it.each([
    [0, "£0.00"],
    [5, "£0.05"],
    [1999, "£19.99"],
    [123456, "£1,234.56"],
    [100000000, "£1,000,000.00"],
    [-1250, "-£12.50"],
  ])("%s → %s", (pence, text) => {
    expect(formatPence(pence)).toBe(text);
  });
});

describe("parsePence", () => {
  it.each([
    ["19.99", 1999],
    ["£1,234.56", 123456],
    ["1234.5", 123450],
    ["  42 ", 4200],
    ["0.07", 7],
    ["-3", -300],
    ["£-3.10", -310],
    ["-£3.10", -310],
    ["-0", 0],
  ])("%j → %s", (input, pence) => {
    expect(parsePence(input)).toBe(pence);
  });

  it.each(["", "abc", "1.234", "1,23", "12,34.00", "£", "1.", ".5", "1e3"])(
    "rejects %j",
    (input) => {
      expect(parsePence(input)).toBeNull();
    },
  );
});
