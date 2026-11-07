import { describe, expect, it } from "vitest";
import { gstinCheckChar, validateGstin } from "../src";

const make = (first14: string) => first14 + gstinCheckChar(first14);

describe("validateGstin", () => {
  it("accepts a known valid GSTIN and extracts state + PAN", () => {
    const r = validateGstin("27AAPFU0939F1ZV");
    expect(r).toEqual({
      valid: true,
      gstin: "27AAPFU0939F1ZV",
      stateCode: "27",
      stateName: "Maharashtra",
      pan: "AAPFU0939F",
    });
  });

  it("normalises spaces and lowercase", () => {
    expect(validateGstin(" 27aapfu0939f1zv ").valid).toBe(true);
  });

  it("rejects a single-character typo via the checksum", () => {
    const r = validateGstin("27AAPFU0939F1ZW");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/checksum/i);
  });

  it("rejects wrong length and unknown state codes", () => {
    expect(validateGstin("27AAPFU0939F1Z").valid).toBe(false);
    const bad = validateGstin(make("99AAPFU0939F1Z"));
    expect(bad.valid).toBe(false);
    if (!bad.valid) expect(bad.error).toMatch(/state code/);
  });

  it("generates check characters that validate", () => {
    for (const s of ["29ABCDE1234F1Z", "32AAAAA0000A1Z", "07ZZZZZ9999Z9Z"]) {
      expect(validateGstin(make(s)).valid).toBe(true);
    }
  });
});
