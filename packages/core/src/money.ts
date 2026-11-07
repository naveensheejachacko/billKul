// All amounts are handled as integer paise to avoid floating-point drift.

/** Round half away from zero, tolerant of tiny float errors (e.g. 1.005 * 100). */
export function roundHalfUp(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x) + 1e-9);
}

export function toPaise(rupees: number): number {
  return roundHalfUp(rupees * 100);
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PLAIN = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456789 paise -> "₹12,34,567.89" */
export function formatINR(paise: number): string {
  return INR.format(paise / 100);
}

/** 123456789 paise -> "12,34,567.89" */
export function formatAmount(paise: number): string {
  return PLAIN.format(paise / 100);
}
