import { roundHalfUp, toPaise } from "./money";

export interface GstOptions {
  /** `amount` already includes GST, so take it out (default: add GST on top) */
  inclusive?: boolean;
  /** Buyer is in another state: IGST instead of CGST + SGST (default: same state) */
  interState?: boolean;
}

/** All amounts in paise. */
export interface GstBreakup {
  rate: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  totalPaise: number;
}

/**
 * GST on a single amount, split into CGST + SGST or IGST.
 *
 *   calculateGst(10000, 18)                      // ₹10,000 + 18%: CGST ₹900 + SGST ₹900 = ₹11,800
 *   calculateGst(11800, 18, { inclusive: true }) // ₹11,800 incl. 18%: taxable ₹10,000
 *
 * When CGST + SGST can't be split evenly (an odd number of paise), SGST gets the extra paisa.
 */
export function calculateGst(amount: number, rate: number, options: GstOptions = {}): GstBreakup {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError(`Amount must be zero or more, got ${amount}`);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new RangeError(`GST rate must be between 0 and 100, got ${rate}`);
  }
  const paise = toPaise(amount);
  const inter = Boolean(options.interState);

  let taxablePaise: number;
  let taxPaise: number;
  if (options.inclusive) {
    taxablePaise = roundHalfUp((paise * 100) / (100 + rate));
    taxPaise = paise - taxablePaise;
  } else {
    taxablePaise = paise;
    // Same rounding as invoices: compute one half and double it, so CGST equals SGST.
    taxPaise = inter ? roundHalfUp((paise * rate) / 100) : 2 * roundHalfUp((paise * rate) / 200);
  }

  const cgstPaise = inter ? 0 : Math.floor(taxPaise / 2);
  return {
    rate,
    taxablePaise,
    cgstPaise,
    sgstPaise: inter ? 0 : taxPaise - cgstPaise,
    igstPaise: inter ? taxPaise : 0,
    taxPaise,
    totalPaise: taxablePaise + taxPaise,
  };
}
