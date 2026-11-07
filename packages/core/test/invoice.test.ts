import { describe, expect, it } from "vitest";
import { computeInvoice, gstinCheckChar, type Invoice } from "../src";

const gstin = (first14: string) => first14 + gstinCheckChar(first14);
const KERALA = gstin("32ABCDE1234F1Z");
const KERALA_CLIENT = gstin("32PQRST5678K1Z");
const KARNATAKA_CLIENT = gstin("29PQRST5678K1Z");
const CHANDIGARH_CLIENT = gstin("04PQRST5678K1Z");

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    number: "INV/26-27/001",
    date: "2026-11-07",
    supplier: { name: "Naveen Designs", gstin: KERALA, upiId: "naveen@okhdfcbank" },
    client: { name: "Acme Pvt Ltd", gstin: KARNATAKA_CLIENT },
    items: [{ description: "Website development", sac: "998314", quantity: 10, unit: "hrs", rate: 2000, gstRate: 18 }],
    ...overrides,
  };
}

describe("computeInvoice", () => {
  it("charges IGST for a client in another state", () => {
    const c = computeInvoice(invoice());
    expect(c.supplyType).toBe("inter");
    expect(c.title).toBe("Tax Invoice");
    expect(c.placeOfSupply).toBe("29");
    expect(c.taxablePaise).toBe(2000000);
    expect(c.igstPaise).toBe(360000);
    expect(c.cgstPaise + c.sgstPaise).toBe(0);
    expect(c.grandTotalPaise).toBe(2360000);
    expect(c.amountInWords).toBe("Rupees Twenty Three Thousand Six Hundred Only");
    expect(c.warnings).toEqual([]);
  });

  it("splits CGST + SGST for a client in the same state", () => {
    const c = computeInvoice(invoice({ client: { name: "Kochi Co", gstin: KERALA_CLIENT } }));
    expect(c.supplyType).toBe("intra");
    expect(c.secondTaxLabel).toBe("SGST");
    expect(c.cgstPaise).toBe(180000);
    expect(c.sgstPaise).toBe(180000);
    expect(c.igstPaise).toBe(0);
  });

  it("uses UTGST for a union territory without a legislature", () => {
    const supplier = { name: "Chd Studio", gstin: gstin("04ABCDE1234F1Z") };
    const c = computeInvoice(invoice({ supplier, client: { name: "Local", gstin: CHANDIGARH_CLIENT } }));
    expect(c.supplyType).toBe("intra");
    expect(c.secondTaxLabel).toBe("UTGST");
  });

  it("uses the client's state when they have no GSTIN", () => {
    const c = computeInvoice(invoice({ client: { name: "Ravi", stateCode: "32" } }));
    expect(c.supplyType).toBe("intra");
  });

  it("warns and assumes intra-state when the client's state is unknown", () => {
    const c = computeInvoice(invoice({ client: { name: "Mystery" } }));
    expect(c.supplyType).toBe("intra");
    expect(c.warnings.join(" ")).toMatch(/Client's state is unknown/);
  });

  it("zero-rates exports under LUT with the declaration", () => {
    const c = computeInvoice(
      invoice({
        supplier: { name: "Naveen Designs", gstin: KERALA, lutArn: "AD320426000123X" },
        client: { name: "Globex Inc", country: "United States" },
        lut: true,
      }),
    );
    expect(c.supplyType).toBe("export-lut");
    expect(c.isExport).toBe(true);
    expect(c.taxPaise).toBe(0);
    expect(c.grandTotalPaise).toBe(2000000);
    expect(c.declaration).toBe(
      "Supply meant for export under LUT without payment of integrated tax (LUT ARN: AD320426000123X)",
    );
    expect(c.warnings).toEqual([]);
  });

  it("warns when exporting under LUT without an ARN", () => {
    const c = computeInvoice(invoice({ client: { name: "Globex", country: "USA" }, lut: true }));
    expect(c.warnings.join(" ")).toMatch(/LUT ARN/);
  });

  it("charges IGST on exports without LUT", () => {
    const c = computeInvoice(invoice({ client: { name: "Globex", country: "Germany" } }));
    expect(c.supplyType).toBe("export-igst");
    expect(c.igstPaise).toBe(360000);
    expect(c.declaration).toMatch(/on payment of integrated tax/);
  });

  it("charges no GST when the supplier is unregistered", () => {
    const c = computeInvoice(invoice({ supplier: { name: "Freelancer", stateCode: "32" } }));
    expect(c.supplyType).toBe("unregistered");
    expect(c.title).toBe("Invoice");
    expect(c.taxPaise).toBe(0);
    expect(c.warnings.join(" ")).toMatch(/no GSTIN/);
  });

  it("rounds the total to the nearest rupee and reports the round-off", () => {
    const c = computeInvoice(
      invoice({ items: [{ description: "Logo", quantity: 1, rate: 999.5, gstRate: 18 }] }),
    );
    // 999.50 + 179.91 IGST = 1179.41 -> 1179.00
    expect(c.taxablePaise).toBe(99950);
    expect(c.igstPaise).toBe(17991);
    expect(c.grandTotalPaise).toBe(117900);
    expect(c.roundOffPaise).toBe(-41);
  });

  it("can skip rounding", () => {
    const c = computeInvoice(
      invoice({ roundOff: false, items: [{ description: "Logo", quantity: 1, rate: 999.5, gstRate: 18 }] }),
    );
    expect(c.grandTotalPaise).toBe(117941);
    expect(c.roundOffPaise).toBe(0);
  });

  it("handles fractional hours and groups the tax summary by SAC and rate", () => {
    const c = computeInvoice(
      invoice({
        items: [
          { description: "Dev", sac: "998314", quantity: 7.5, rate: 1500, gstRate: 18 },
          { description: "More dev", sac: "998314", quantity: 2, rate: 1500, gstRate: 18 },
          { description: "Training", sac: "999293", quantity: 1, rate: 5000, gstRate: 18 },
        ],
      }),
    );
    expect(c.lines[0].taxablePaise).toBe(1125000);
    expect(c.taxSummary).toHaveLength(2);
    expect(c.taxSummary[0]).toMatchObject({ sac: "998314", taxablePaise: 1425000, igstPaise: 256500 });
  });

  it("flags bad input without throwing", () => {
    const c = computeInvoice(
      invoice({
        number: "INVOICE NUMBER TOO LONG",
        client: { name: "X", gstin: "29PQRST5678K1ZZ" },
        items: [{ description: "", quantity: 0, rate: 100, gstRate: 17 }],
      }),
    );
    const all = c.warnings.join("\n");
    expect(all).toMatch(/Invoice number/);
    expect(all).toMatch(/Client GSTIN/);
    expect(all).toMatch(/description/);
    expect(all).toMatch(/quantity/);
    expect(all).toMatch(/17% isn't a standard GST rate/);
  });
});
