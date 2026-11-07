import QRCode from "qrcode";

const UPI_ID = /^[a-zA-Z0-9._-]{1,256}@[a-zA-Z0-9.-]{2,64}$/;

export function isValidUpiId(vpa: string): boolean {
  return UPI_ID.test(vpa.trim());
}

export interface UpiPayment {
  /** UPI ID, e.g. naveen@okhdfcbank */
  vpa: string;
  payeeName: string;
  /** Leave out to let the payer enter the amount */
  amountPaise?: number;
  /** Shown in the payer's app, e.g. "Invoice INV/26-27/001" */
  note?: string;
}

/** Builds a upi://pay link that any UPI app (GPay, PhonePe, Paytm, BHIM) can open or scan. */
export function buildUpiUri({ vpa, payeeName, amountPaise, note }: UpiPayment): string {
  const id = vpa.trim();
  if (!isValidUpiId(id)) throw new Error(`"${vpa}" doesn't look like a UPI ID (e.g. name@okhdfcbank)`);
  // The UPI ID goes in unencoded: some apps reject "%40" in place of "@".
  const params = [`pa=${id}`, `pn=${encodeURIComponent(payeeName.trim())}`];
  if (amountPaise !== undefined) {
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) throw new Error("UPI amount must be more than zero");
    params.push(`am=${(amountPaise / 100).toFixed(2)}`);
  }
  params.push("cu=INR");
  if (note) params.push(`tn=${encodeURIComponent(note.slice(0, 80))}`);
  return `upi://pay?${params.join("&")}`;
}

/** SVG markup of a QR code for a UPI link. Works in the browser and Node. */
export function upiQrSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
