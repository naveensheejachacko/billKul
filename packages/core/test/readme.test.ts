// Keeps every example in packages/core/README.md (the npm page) and the root README honest.
import { expect, it } from "vitest";
import {
  amountInWords,
  buildUpiUri,
  calculateGst,
  computeInvoice,
  financialYear,
  formatINR,
  isValidInvoiceNumber,
  nextInvoiceNumber,
  numberToIndianWords,
  upiQrSvg,
  validateGstin,
  validatePan,
} from "../src";

it("validateGstin examples", () => {
  expect(validateGstin("27AAPFU0939F1ZV")).toEqual({
    valid: true,
    gstin: "27AAPFU0939F1ZV",
    stateCode: "27",
    stateName: "Maharashtra",
    pan: "AAPFU0939F",
  });
  expect(validateGstin("27AAPFU0939F1ZW")).toEqual({
    valid: false,
    gstin: "27AAPFU0939F1ZW",
    error: "Checksum doesn't match, check for a typo",
  });
});

it("calculateGst examples", () => {
  expect(calculateGst(10000, 18)).toEqual({
    rate: 18,
    taxablePaise: 1000000,
    cgstPaise: 90000,
    sgstPaise: 90000,
    igstPaise: 0,
    taxPaise: 180000,
    totalPaise: 1180000,
  });
  const g = calculateGst(11800, 18, { inclusive: true, interState: true });
  expect(formatINR(g.taxablePaise)).toBe("₹10,000.00");
  expect(formatINR(g.igstPaise)).toBe("₹1,800.00");
});

it("computeInvoice example", () => {
  const result = computeInvoice({
    number: "INV/26-27/001",
    date: "2026-11-07",
    supplier: { name: "Kite Studio", gstin: "32ABCDE1234F1Z9" },
    client: { name: "Acme", gstin: "29PQRST5678K1ZY" },
    items: [{ description: "Website", sac: "998314", quantity: 1, rate: 45000, gstRate: 18 }],
  });
  expect(result.supplyType).toBe("inter");
  expect(result.igstPaise).toBe(810000);
  expect(result.grandTotalPaise).toBe(5310000);
  expect(result.amountInWords).toBe("Rupees Fifty Three Thousand One Hundred Only");
  expect(result.warnings).toEqual([]);
});

it("amount in words examples", () => {
  expect(amountInWords(12345678)).toBe(
    "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only",
  );
  expect(numberToIndianWords(12345678)).toBe(
    "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight",
  );
});

it("UPI examples", async () => {
  const uri = buildUpiUri({ vpa: "kite@okicici", payeeName: "Kite Studio", amountPaise: 1180000, note: "INV/26-27/001" });
  expect(uri).toBe("upi://pay?pa=kite@okicici&pn=Kite%20Studio&am=11800.00&cu=INR&tn=INV%2F26-27%2F001");
  expect(await upiQrSvg(uri)).toMatch(/^<svg/);
});

it("financial year and numbering examples", () => {
  expect(financialYear("2026-11-07")).toBe("2026-27");
  expect(nextInvoiceNumber("INV", "2026-11-07", ["INV/26-27/041"])).toBe("INV/26-27/042");
  expect(nextInvoiceNumber("INV", "2027-04-01", ["INV/26-27/041"])).toBe("INV/27-28/001");
  expect(isValidInvoiceNumber("INV/26-27/042")).toBe(true);
});

it("PAN example", () => {
  expect(validatePan("AAPFU0939F")).toEqual({ valid: true, pan: "AAPFU0939F", holderType: "Firm or LLP" });
});
