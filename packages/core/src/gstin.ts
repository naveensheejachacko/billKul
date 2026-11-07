import { getState } from "./states";

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// 2-digit state code + 13 alphanumerics. Kept lenient (not only the PAN-based
// shape) so TDS/UIN-style GSTINs pass; the checksum catches typos.
const SHAPE = /^[0-9]{2}[0-9A-Z]{13}$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type GstinCheck =
  | { valid: true; gstin: string; stateCode: string; stateName: string; pan?: string }
  | { valid: false; gstin: string; error: string };

export function normalizeGstin(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** The 15th (check) character for the first 14 characters of a GSTIN. */
export function gstinCheckChar(first14: string): string {
  if (first14.length !== 14) throw new Error("Need exactly the first 14 characters of a GSTIN");
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const value = CHARS.indexOf(first14[i]);
    if (value < 0) throw new Error(`Invalid GSTIN character "${first14[i]}"`);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export function validateGstin(input: string): GstinCheck {
  const gstin = normalizeGstin(input);
  if (gstin.length !== 15) {
    return { valid: false, gstin, error: `GSTIN must be 15 characters (got ${gstin.length})` };
  }
  if (!SHAPE.test(gstin)) {
    return {
      valid: false,
      gstin,
      error: "GSTIN must start with a 2-digit state code and contain only letters and digits",
    };
  }
  const state = getState(gstin.slice(0, 2));
  if (!state) return { valid: false, gstin, error: `Unknown state code "${gstin.slice(0, 2)}"` };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return { valid: false, gstin, error: "Checksum doesn't match, check for a typo" };
  }
  const pan = gstin.slice(2, 12);
  return {
    valid: true,
    gstin,
    stateCode: state.code,
    stateName: state.name,
    ...(PAN.test(pan) ? { pan } : {}),
  };
}
