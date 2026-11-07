# @billkul/core

**Indian GST toolkit for JavaScript and TypeScript.** Validate GSTINs and PANs, calculate CGST/SGST/IGST, build complete GST invoices (including exports under LUT), write amounts in words with lakh and crore, and create UPI payment links and QR codes.

[![npm](https://img.shields.io/npm/v/@billkul/core)](https://www.npmjs.com/package/@billkul/core)
[![license](https://img.shields.io/npm/l/@billkul/core)](https://github.com/naveensheejachacko/billKul/blob/main/LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-ffdd00)](https://buymeacoffee.com/naveensheejachacko)

- Zero setup: works in Node 18+, browsers, Deno and Bun. ESM and CommonJS, with TypeScript types.
- Exact money: amounts are handled in integer paise, so there are no floating-point surprises.
- Tested: the same code runs the free invoice maker at [bill-kul.vercel.app](https://bill-kul.vercel.app).

```bash
npm install @billkul/core
```

## Validate a GSTIN

Checks the length, state code and check character, which catches almost every typo.

```ts
import { validateGstin } from "@billkul/core";

validateGstin("27AAPFU0939F1ZV");
// { valid: true, gstin: "27AAPFU0939F1ZV", stateCode: "27", stateName: "Maharashtra", pan: "AAPFU0939F" }

validateGstin("27AAPFU0939F1ZW");
// { valid: false, gstin: "27AAPFU0939F1ZW", error: "Checksum doesn't match, check for a typo" }
```

It confirms the number is well formed, not that the registration is active. For that, use the GST portal's taxpayer search.

## Calculate GST

```ts
import { calculateGst, formatINR } from "@billkul/core";

calculateGst(10000, 18);
// { rate: 18, taxablePaise: 1000000, cgstPaise: 90000, sgstPaise: 90000,
//   igstPaise: 0, taxPaise: 180000, totalPaise: 1180000 }

// Buyer in another state, and the amount already includes GST
const g = calculateGst(11800, 18, { inclusive: true, interState: true });
formatINR(g.taxablePaise); // "₹10,000.00"
formatINR(g.igstPaise);    // "₹1,800.00"
```

Amounts go **in** as rupees and come **out** in paise. Use `formatINR` or `formatAmount` to display them.

## Build a GST invoice

`computeInvoice` decides between CGST + SGST, UTGST, IGST, zero-rated export under LUT, or no GST (unregistered supplier), and returns every number a tax invoice needs.

```ts
import { computeInvoice } from "@billkul/core";

const result = computeInvoice({
  number: "INV/26-27/001",
  date: "2026-11-07",
  supplier: { name: "Kite Studio", gstin: "32ABCDE1234F1Z9" }, // Kerala
  client: { name: "Acme", gstin: "29PQRST5678K1ZY" },         // Karnataka
  items: [{ description: "Website", sac: "998314", quantity: 1, rate: 45000, gstRate: 18 }],
});

result.supplyType;      // "inter"
result.igstPaise;       // 810000
result.grandTotalPaise; // 5310000
result.amountInWords;   // "Rupees Fifty Three Thousand One Hundred Only"
result.warnings;        // []  (bad GSTINs, missing state, non-standard rates, etc. are listed here)
```

Foreign client? Set `client.country` and `lut: true`, and you get 0% IGST plus the declaration text required on export invoices (`result.declaration`).

## Amount in words (Indian numbering)

```ts
import { amountInWords, numberToIndianWords } from "@billkul/core";

amountInWords(12345678); // paise
// "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only"

numberToIndianWords(12345678);
// "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight"
```

## UPI payment link and QR code

```ts
import { buildUpiUri, upiQrSvg } from "@billkul/core";

const uri = buildUpiUri({ vpa: "kite@okicici", payeeName: "Kite Studio", amountPaise: 1180000, note: "INV/26-27/001" });
// "upi://pay?pa=kite@okicici&pn=Kite%20Studio&am=11800.00&cu=INR&tn=INV%2F26-27%2F001"

const svg = await upiQrSvg(uri); // "<svg ...>" that GPay, PhonePe, Paytm and BHIM can scan
```

## Financial year and invoice numbers

```ts
import { financialYear, nextInvoiceNumber, isValidInvoiceNumber } from "@billkul/core";

financialYear("2026-11-07");                                     // "2026-27"
nextInvoiceNumber("INV", "2026-11-07", ["INV/26-27/041"]);       // "INV/26-27/042"
nextInvoiceNumber("INV", "2027-04-01", ["INV/26-27/041"]);       // "INV/27-28/001"
isValidInvoiceNumber("INV/26-27/042");                           // true (max 16 chars, letters, digits, - and /)
```

## PAN

```ts
import { validatePan } from "@billkul/core";

validatePan("AAPFU0939F"); // { valid: true, pan: "AAPFU0939F", holderType: "Firm or LLP" }
```

## Everything else

| Export | What it does |
| --- | --- |
| `STATES`, `getState(code)`, `stateLabel(code)` | GST state codes, with union territories that use UTGST flagged |
| `gstinCheckChar(first14)`, `normalizeGstin(s)` | Lower-level GSTIN helpers |
| `PAN_HOLDER_TYPES` | What the 4th character of a PAN means |
| `formatINR(paise)`, `formatAmount(paise)`, `toPaise(rupees)`, `roundHalfUp(x)` | Indian-grouped money formatting (₹12,34,567.00) and rounding |
| `isValidUpiId(vpa)` | Checks a UPI ID looks like `name@bank` |
| `shortFinancialYear(date)`, `isIsoDate(date)` | Date helpers |
| `isExportClient(client)`, `COMMON_GST_RATES` | Invoice helpers |
| `COMMON_SAC_CODES` | SAC codes freelancers commonly use |

## Not tax advice

The rules here follow the CGST Rules and common practice, and are covered by tests, but they are not a substitute for a CA. Check unusual cases, such as special place-of-supply rules or e-invoicing above ₹5 crore turnover.

## Support

Built and maintained in spare time. If it saves you work, [buy me a coffee](https://buymeacoffee.com/naveensheejachacko). Issues and pull requests are welcome on [GitHub](https://github.com/naveensheejachacko/billKul).

MIT licensed.
