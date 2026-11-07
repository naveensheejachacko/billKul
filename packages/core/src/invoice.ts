import { validateGstin } from "./gstin";
import { roundHalfUp, toPaise } from "./money";
import { isIsoDate, isValidInvoiceNumber } from "./numbering";
import { getState } from "./states";
import { amountInWords } from "./words";

export interface LineItem {
  description: string;
  /** SAC (services) or HSN (goods) code, e.g. "998314" */
  sac?: string;
  quantity: number;
  unit?: string;
  /** Price per unit in rupees, before GST */
  rate: number;
  /** GST percentage, e.g. 18 */
  gstRate: number;
}

export interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

export interface Party {
  name: string;
  address?: string;
  gstin?: string;
  /** 2-digit GST state code. Derived from the GSTIN when that is present. */
  stateCode?: string;
  email?: string;
  phone?: string;
}

export interface Supplier extends Party {
  pan?: string;
  upiId?: string;
  bank?: BankDetails;
  /** ARN of your Letter of Undertaking, for zero-rated exports */
  lutArn?: string;
}

export interface Client extends Party {
  /** Leave empty or "India" for domestic clients */
  country?: string;
}

export interface Invoice {
  number: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  dueDate?: string;
  supplier: Supplier;
  client: Client;
  /** State code of the place of supply. Defaults to the client's state. */
  placeOfSupply?: string;
  /** Export of services under LUT (0% IGST) */
  lut?: boolean;
  items: LineItem[];
  notes?: string;
  /** Round the total to the nearest rupee (default true) */
  roundOff?: boolean;
}

/**
 * intra:        same state, CGST + SGST (or UTGST)
 * inter:        different states, IGST
 * export-lut:   export under Letter of Undertaking, 0% IGST
 * export-igst:  export paying IGST (refund claimed later)
 * unregistered: supplier has no GSTIN, so no GST is charged
 */
export type SupplyType = "intra" | "inter" | "export-lut" | "export-igst" | "unregistered";

export interface ComputedLine extends LineItem {
  /** The GST rate actually charged (0 for LUT exports / unregistered) */
  appliedRate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

export interface TaxSummaryRow {
  sac: string;
  rate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface ComputedInvoice {
  supplyType: SupplyType;
  /** "Tax Invoice" for registered suppliers, "Invoice" otherwise */
  title: string;
  /** "UTGST" when the place of supply is a UT without a legislature */
  secondTaxLabel: "SGST" | "UTGST";
  isExport: boolean;
  supplierStateCode?: string;
  placeOfSupply?: string;
  lines: ComputedLine[];
  taxSummary: TaxSummaryRow[];
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
  /** Mandatory export declaration text, when applicable */
  declaration?: string;
  /** Things the user should fix or know about. The invoice is still computed. */
  warnings: string[];
}

export const COMMON_GST_RATES = [0, 5, 18, 40];
const KNOWN_GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40];

export function isExportClient(client: Client): boolean {
  const country = (client.country ?? "").trim().toLowerCase();
  return country !== "" && !["india", "in", "ind", "bharat"].includes(country);
}

export function computeInvoice(inv: Invoice): ComputedInvoice {
  const warnings: string[] = [];
  const { supplier, client } = inv;

  if (!isValidInvoiceNumber(inv.number)) {
    warnings.push(`Invoice number "${inv.number}" must be up to 16 characters: letters, digits, "-" or "/"`);
  }
  if (!isIsoDate(inv.date)) warnings.push("Invoice date is missing or invalid");
  if (inv.items.length === 0) warnings.push("Add at least one item");

  // Who is supplying, and from where
  const registered = Boolean(supplier.gstin?.trim());
  let supplierStateCode = supplier.stateCode;
  if (registered) {
    const g = validateGstin(supplier.gstin!);
    if (g.valid) supplierStateCode = g.stateCode;
    else warnings.push(`Your GSTIN: ${g.error}`);
  }

  // Where the supply goes
  const isExport = isExportClient(client);
  let placeOfSupply = isExport ? undefined : inv.placeOfSupply;
  if (!isExport && client.gstin?.trim()) {
    const g = validateGstin(client.gstin);
    if (g.valid) placeOfSupply ??= g.stateCode;
    else warnings.push(`Client GSTIN: ${g.error}`);
  }
  if (!isExport) placeOfSupply ??= client.stateCode;

  let supplyType: SupplyType;
  if (!registered) {
    supplyType = "unregistered";
  } else if (isExport) {
    supplyType = inv.lut ? "export-lut" : "export-igst";
  } else {
    if (!supplierStateCode) warnings.push("Your state is unknown. Add your GSTIN or state in your details.");
    if (!placeOfSupply) {
      warnings.push("Client's state is unknown, so CGST + SGST is assumed. Add the client's GSTIN or state.");
      placeOfSupply = supplierStateCode;
    }
    supplyType = supplierStateCode && placeOfSupply && supplierStateCode !== placeOfSupply ? "inter" : "intra";
  }

  const charged = supplyType === "intra" || supplyType === "inter" || supplyType === "export-igst";
  if (supplyType === "unregistered" && inv.items.some((i) => i.gstRate > 0)) {
    warnings.push("You have no GSTIN in your details, so no GST is charged on this invoice.");
  }
  if (supplyType === "export-lut" && !supplier.lutArn?.trim()) {
    warnings.push("Add your LUT ARN in your details. It should be quoted on export invoices.");
  }

  const lines: ComputedLine[] = inv.items.map((item, i) => {
    const n = i + 1;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const rate = Number.isFinite(item.rate) ? item.rate : 0;
    const gstRate = Number.isFinite(item.gstRate) ? item.gstRate : 0;
    if (!item.description.trim()) warnings.push(`Item ${n}: add a description`);
    if (quantity <= 0) warnings.push(`Item ${n}: quantity should be more than 0`);
    if (rate < 0) warnings.push(`Item ${n}: rate can't be negative`);
    if (charged && !KNOWN_GST_RATES.includes(gstRate)) {
      warnings.push(`Item ${n}: ${gstRate}% isn't a standard GST rate`);
    }

    const appliedRate = charged ? gstRate : 0;
    const taxablePaise = roundHalfUp(quantity * toPaise(rate));
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    if (supplyType === "intra") {
      // Half each; computing one half and doubling keeps CGST and SGST equal.
      cgstPaise = roundHalfUp((taxablePaise * appliedRate) / 200);
      sgstPaise = cgstPaise;
    } else if (charged) {
      igstPaise = roundHalfUp((taxablePaise * appliedRate) / 100);
    }
    return {
      ...item,
      quantity,
      rate,
      gstRate,
      appliedRate,
      taxablePaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalPaise: taxablePaise + cgstPaise + sgstPaise + igstPaise,
    };
  });

  const summary = new Map<string, TaxSummaryRow>();
  for (const l of lines) {
    const sac = l.sac?.trim() || "-";
    const key = `${sac}|${l.appliedRate}`;
    const row = summary.get(key) ?? { sac, rate: l.appliedRate, taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
    row.taxablePaise += l.taxablePaise;
    row.cgstPaise += l.cgstPaise;
    row.sgstPaise += l.sgstPaise;
    row.igstPaise += l.igstPaise;
    summary.set(key, row);
  }

  const sum = (pick: (l: ComputedLine) => number) => lines.reduce((acc, l) => acc + pick(l), 0);
  const taxablePaise = sum((l) => l.taxablePaise);
  const cgstPaise = sum((l) => l.cgstPaise);
  const sgstPaise = sum((l) => l.sgstPaise);
  const igstPaise = sum((l) => l.igstPaise);
  const taxPaise = cgstPaise + sgstPaise + igstPaise;
  const exact = taxablePaise + taxPaise;
  const grandTotalPaise = inv.roundOff === false ? exact : roundHalfUp(exact / 100) * 100;

  let declaration: string | undefined;
  if (supplyType === "export-lut") {
    const arn = supplier.lutArn?.trim();
    declaration = `Supply meant for export under LUT without payment of integrated tax${arn ? ` (LUT ARN: ${arn})` : ""}`;
  } else if (supplyType === "export-igst") {
    declaration = "Supply meant for export on payment of integrated tax";
  }

  return {
    supplyType,
    title: registered ? "Tax Invoice" : "Invoice",
    secondTaxLabel: getState(placeOfSupply)?.ut ? "UTGST" : "SGST",
    isExport,
    supplierStateCode,
    placeOfSupply,
    lines,
    taxSummary: [...summary.values()],
    taxablePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    taxPaise,
    roundOffPaise: grandTotalPaise - exact,
    grandTotalPaise,
    amountInWords: amountInWords(Math.max(0, grandTotalPaise)),
    declaration,
    warnings,
  };
}
