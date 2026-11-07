import { describe, expect, it } from "vitest";
import { calculateGst, computeInvoice, gstinCheckChar, validatePan } from "../src";

describe("calculateGst", () => {
  it("adds GST and splits CGST + SGST within a state", () => {
    expect(calculateGst(10000, 18)).toEqual({
      rate: 18,
      taxablePaise: 1000000,
      cgstPaise: 90000,
      sgstPaise: 90000,
      igstPaise: 0,
      taxPaise: 180000,
      totalPaise: 1180000,
    });
  });

  it("uses IGST between states", () => {
    const r = calculateGst(10000, 18, { interState: true });
    expect(r.igstPaise).toBe(180000);
    expect(r.cgstPaise + r.sgstPaise).toBe(0);
  });

  it("takes GST out of an inclusive amount", () => {
    expect(calculateGst(11800, 18, { inclusive: true, interState: true })).toMatchObject({
      taxablePaise: 1000000,
      igstPaise: 180000,
      totalPaise: 1180000,
    });
    const odd = calculateGst(11800, 3, { inclusive: true });
    expect(odd.taxablePaise).toBe(1145631);
    expect(odd.cgstPaise + odd.sgstPaise).toBe(34369);
    expect(odd.sgstPaise - odd.cgstPaise).toBe(1); // extra paisa goes to SGST
  });

  it("matches the invoice engine for the same line", () => {
    const g = (s: string) => s + gstinCheckChar(s);
    const inv = computeInvoice({
      number: "X-1",
      date: "2026-11-07",
      supplier: { name: "A", gstin: g("32ABCDE1234F1Z") },
      client: { name: "B", gstin: g("32PQRST5678K1Z") },
      items: [{ description: "Work", quantity: 1, rate: 999.5, gstRate: 18 }],
      roundOff: false,
    });
    const r = calculateGst(999.5, 18);
    expect([r.cgstPaise, r.sgstPaise, r.totalPaise]).toEqual([inv.cgstPaise, inv.sgstPaise, inv.grandTotalPaise]);
  });

  it("rejects bad input", () => {
    expect(() => calculateGst(-1, 18)).toThrow(RangeError);
    expect(() => calculateGst(100, 101)).toThrow(RangeError);
    expect(() => calculateGst(Number.NaN, 18)).toThrow(RangeError);
  });
});

describe("validatePan", () => {
  it("accepts a well-formed PAN and names the holder type", () => {
    expect(validatePan(" aapfu0939f ")).toEqual({ valid: true, pan: "AAPFU0939F", holderType: "Firm or LLP" });
    expect(validatePan("ABCPK1234L")).toMatchObject({ valid: true, holderType: "Individual" });
  });

  it("rejects wrong length, shape and holder type", () => {
    expect(validatePan("ABCDE1234").valid).toBe(false);
    expect(validatePan("ABCDE12345").valid).toBe(false);
    const r = validatePan("ABCXE1234F");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/holder type/);
  });
});
