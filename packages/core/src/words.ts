const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function belowThousand(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (n % 100) parts.push(belowHundred(n % 100));
  return parts.join(" ");
}

/** Indian numbering: 12345678 -> "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight" */
export function numberToIndianWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Expected a non-negative integer, got ${n}`);
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ");
}

/** 12000050 paise -> "Rupees One Lakh Twenty Thousand and Fifty Paise Only" */
export function amountInWords(paise: number): string {
  if (!Number.isInteger(paise) || paise < 0) throw new RangeError(`Expected non-negative integer paise, got ${paise}`);
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  const paisePart = p ? ` and ${belowHundred(p)} Paise` : "";
  return `Rupees ${numberToIndianWords(rupees)}${paisePart} Only`;
}
