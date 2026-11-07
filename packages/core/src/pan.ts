/** What the 4th character of a PAN says about the holder. */
export const PAN_HOLDER_TYPES: Record<string, string> = {
  P: "Individual",
  C: "Company",
  F: "Firm or LLP",
  H: "Hindu Undivided Family",
  A: "Association of persons",
  T: "Trust",
  B: "Body of individuals",
  L: "Local authority",
  J: "Artificial juridical person",
  G: "Government",
};

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type PanCheck =
  | { valid: true; pan: string; holderType: string }
  | { valid: false; pan: string; error: string };

/**
 * Checks the shape of a PAN (5 letters, 4 digits, 1 letter) and the holder-type letter.
 * The last character is a check letter, but its algorithm isn't public, so typos there aren't caught.
 */
export function validatePan(input: string): PanCheck {
  const pan = input.replace(/\s+/g, "").toUpperCase();
  if (pan.length !== 10) return { valid: false, pan, error: `PAN must be 10 characters (got ${pan.length})` };
  if (!PAN.test(pan)) return { valid: false, pan, error: "PAN must be 5 letters, 4 digits, then a letter" };
  const holderType = PAN_HOLDER_TYPES[pan[3]];
  if (!holderType) return { valid: false, pan, error: `"${pan[3]}" isn't a PAN holder type (4th character)` };
  return { valid: true, pan, holderType };
}
