import type { Rule } from "./types.ts";

const VIN_FORBIDDEN = /[IOQ]/g;
const VIN_ALLOWED = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * A VIN is 17 characters and never uses I, O or Q. The check digit
 * (position 9) is mandatory in North America but not in Europe, so it is not
 * enforced.
 */
export const vinFormat: Rule = (invoice) => {
  const vin = invoice.vehicle?.vin;
  if (vin == null || VIN_ALLOWED.test(vin)) return [];
  const problems: string[] = [];
  if (vin.length !== 17) {
    problems.push(`has ${vin.length} characters, not 17`);
  }
  const forbidden = [...vin.matchAll(VIN_FORBIDDEN)].map(
    (m) => `${m[0]} at position ${m.index + 1}`,
  );
  if (forbidden.length > 0) {
    problems.push(`contains ${forbidden.join(", ")}, which VINs never use`);
  }
  if (problems.length === 0) {
    problems.push("contains characters other than capital letters and digits");
  }
  return [
    {
      ruleId: "vin-format",
      field: "vehicle.vin",
      severity: "error",
      message: `VIN ${problems.join(" and ")}.`,
    },
  ];
};

// Current format since 2001: two letters, two digits, three letters.
const CURRENT_REGISTRATION = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/;

/**
 * Registration matches the current UK format (e.g. AB12 CDE). Older prefix,
 * suffix and dateless formats are still valid, so a non-match is a warning.
 */
export const registrationFormat: Rule = (invoice) => {
  const registration = invoice.vehicle?.registration;
  if (registration == null) return [];
  // Spacing varies in print, so it is ignored.
  const compact = registration.replace(/\s+/g, "").toUpperCase();
  if (CURRENT_REGISTRATION.test(compact)) return [];
  return [
    {
      ruleId: "registration-format",
      field: "vehicle.registration",
      severity: "warning",
      message: `Registration ${registration} is not in the current UK format (e.g. AB12 CDE). Older formats are valid; check it was read correctly.`,
    },
  ];
};
