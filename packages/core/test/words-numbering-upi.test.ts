import { describe, expect, it } from "vitest";
import {
  amountInWords,
  buildUpiUri,
  financialYear,
  formatINR,
  isValidInvoiceNumber,
  nextInvoiceNumber,
  numberToIndianWords,
  upiQrSvg,
} from "../src";

describe("numberToIndianWords", () => {
  it.each([
    [0, "Zero"],
    [7, "Seven"],
    [19, "Nineteen"],
    [40, "Forty"],
    [101, "One Hundred One"],
    [23600, "Twenty Three Thousand Six Hundred"],
    [120000, "One Lakh Twenty Thousand"],
    [10000000, "One Crore"],
    [12345678, "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight"],
    [1000000000, "One Hundred Crore"],
  ])("%i -> %s", (n, words) => {
    expect(numberToIndianWords(n)).toBe(words);
  });
});

describe("amountInWords", () => {
  it("handles rupees and paise", () => {
    expect(amountInWords(12000050)).toBe("Rupees One Lakh Twenty Thousand and Fifty Paise Only");
    expect(amountInWords(2360000)).toBe("Rupees Twenty Three Thousand Six Hundred Only");
  });
});

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(123456789)).toBe("₹12,34,567.89");
  });
});

describe("financial year + numbering", () => {
  it("April starts a new financial year", () => {
    expect(financialYear("2026-03-31")).toBe("2025-26");
    expect(financialYear("2026-04-01")).toBe("2026-27");
    expect(financialYear("2099-12-01")).toBe("2099-00");
  });

  it("continues the series within a financial year and restarts in the next", () => {
    const existing = ["INV/26-27/001", "INV/26-27/041", "INV/25-26/120", "OTHER/26-27/500"];
    expect(nextInvoiceNumber("INV", "2026-11-07", existing)).toBe("INV/26-27/042");
    expect(nextInvoiceNumber("INV", "2027-04-01", existing)).toBe("INV/27-28/001");
    expect(nextInvoiceNumber("", "2026-11-07", [])).toBe("26-27/001");
  });

  it("enforces the 16-character GST limit", () => {
    expect(isValidInvoiceNumber("INV/26-27/001")).toBe(true);
    expect(isValidInvoiceNumber("INVOICE/2026-27/0001")).toBe(false);
    expect(isValidInvoiceNumber("INV 001")).toBe(false);
  });
});

describe("UPI", () => {
  it("builds a payment link with amount and note", () => {
    const uri = buildUpiUri({
      vpa: "naveen@okhdfcbank",
      payeeName: "Naveen Kumar",
      amountPaise: 2360000,
      note: "Invoice INV/26-27/001",
    });
    expect(uri).toBe(
      "upi://pay?pa=naveen@okhdfcbank&pn=Naveen%20Kumar&am=23600.00&cu=INR&tn=Invoice%20INV%2F26-27%2F001",
    );
  });

  it("rejects bad UPI IDs and zero amounts", () => {
    expect(() => buildUpiUri({ vpa: "not-an-id", payeeName: "X" })).toThrow();
    expect(() => buildUpiUri({ vpa: "a@ybl", payeeName: "X", amountPaise: 0 })).toThrow();
  });

  it("renders a QR code as SVG", async () => {
    const svg = await upiQrSvg(buildUpiUri({ vpa: "a@ybl", payeeName: "A" }));
    expect(svg).toMatch(/^<svg/);
  });
});
