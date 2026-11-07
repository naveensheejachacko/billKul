function parseIsoDate(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Expected a date like 2026-04-01, got "${date}"`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error(`Invalid date "${date}"`);
  return { y, m, d };
}

export function isIsoDate(date: string): boolean {
  try {
    parseIsoDate(date);
    return true;
  } catch {
    return false;
  }
}

function fyStart(date: string): number {
  const { y, m } = parseIsoDate(date);
  return m >= 4 ? y : y - 1; // Indian financial year runs April to March
}

const two = (n: number) => String(n % 100).padStart(2, "0");

/** "2026-11-07" -> "2026-27" */
export function financialYear(date: string): string {
  const start = fyStart(date);
  return `${start}-${two(start + 1)}`;
}

/** "2026-11-07" -> "26-27" (keeps invoice numbers within GST's 16-character limit) */
export function shortFinancialYear(date: string): string {
  const start = fyStart(date);
  return `${two(start)}-${two(start + 1)}`;
}

/** GST rule 46: up to 16 characters, only letters, digits, "-" and "/". */
export function isValidInvoiceNumber(n: string): boolean {
  return /^[A-Za-z0-9/-]{1,16}$/.test(n);
}

/**
 * Next number in the series for the financial year of `date`,
 * e.g. "INV/26-27/043" when INV/26-27/042 already exists.
 */
export function nextInvoiceNumber(prefix: string, date: string, existing: string[]): string {
  const head = `${prefix ? `${prefix}/` : ""}${shortFinancialYear(date)}/`;
  let max = 0;
  for (const n of existing) {
    if (!n.startsWith(head)) continue;
    const seq = n.slice(head.length);
    if (/^\d+$/.test(seq)) max = Math.max(max, Number(seq));
  }
  return head + String(max + 1).padStart(3, "0");
}
