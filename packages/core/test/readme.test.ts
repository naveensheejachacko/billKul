import { expect, it } from "vitest";
import { computeInvoice } from "../src";

// Keeps the README example honest.
it("README example produces the documented numbers", () => {
  const result = computeInvoice({
    number: "INV/26-27/001",
    date: "2026-11-07",
    supplier: { name: "Me", gstin: "32ABCDE1234F1Z9" },
    client: { name: "Acme", gstin: "29PQRST5678K1ZY" },
    items: [{ description: "Website", sac: "998314", quantity: 1, rate: 45000, gstRate: 18 }],
  });
  expect(result.warnings).toEqual([]);
  expect(result.supplyType).toBe("inter");
  expect(result.igstPaise).toBe(810000);
  expect(result.amountInWords).toBe("Rupees Fifty Three Thousand One Hundred Only");
});
