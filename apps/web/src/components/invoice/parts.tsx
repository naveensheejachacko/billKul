// Building blocks shared by every invoice template.
import {
  buildUpiUri,
  formatAmount,
  formatINR,
  isValidUpiId,
  stateLabel,
  upiQrSvg,
  type BankDetails,
  type ComputedInvoice,
  type Invoice,
} from "@billkul/core";
import { useEffect, useState, type ReactNode } from "react";
import { REPO_URL } from "../../config";
import { formatDate } from "../../dates";
import type { Design, HeaderLayout } from "../../storage";

export interface View {
  inv: Invoice;
  c: ComputedInvoice;
  logo?: string;
  header: HeaderLayout;
  hasTax: boolean;
  intra: boolean;
  qrSvg: string | null;
  upiId: string;
  bank: BankDetails;
  hasBank: boolean;
  placeOfSupply: string;
}

const stateName = (code?: string) => stateLabel(code).replace(/^\d+ - /, "");
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

export function useInvoiceView(inv: Invoice, c: ComputedInvoice, design: Design): View {
  const { logo, header } = design;
  const s = inv.supplier;
  const upiId = s.upiId?.trim() ?? "";
  const canUpi = !c.isExport && isValidUpiId(upiId) && c.grandTotalPaise > 0;
  const upiUri = canUpi
    ? buildUpiUri({ vpa: upiId, payeeName: s.name || "Payee", amountPaise: c.grandTotalPaise, note: `Invoice ${inv.number}` })
    : null;

  const [qrSvg, setQrSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!upiUri) {
      setQrSvg(null);
      return;
    }
    upiQrSvg(upiUri)
      .then((svg) => alive && setQrSvg(svg))
      .catch(() => alive && setQrSvg(null));
    return () => {
      alive = false;
    };
  }, [upiUri]);

  const bank = s.bank ?? {};
  return {
    inv,
    c,
    logo,
    header,
    hasTax: c.supplyType !== "unregistered",
    intra: c.supplyType === "intra",
    qrSvg,
    upiId,
    bank,
    hasBank: Boolean(bank.accountNumber || bank.ifsc || bank.bankName),
    placeOfSupply: c.isExport ? "Outside India" : stateName(c.placeOfSupply) || "—",
  };
}

/** Address, email and phone. */
export function ContactLines({ v, legalName = false }: { v: View; legalName?: boolean }) {
  const s = v.inv.supplier;
  return (
    <div className="inv-supplier">
      {legalName && s.name && <p className="inv-legalname">{s.name}</p>}
      {s.address && <p className="pre">{s.address}</p>}
      {s.email && <p>{s.email}</p>}
      {s.phone && <p>{s.phone}</p>}
    </div>
  );
}

export function SupplierName({ v }: { v: View }) {
  const name = v.inv.supplier.name;
  return <p className={`inv-name${name ? "" : " is-placeholder"}`}>{name || "Your business name"}</p>;
}

export function Logo({ v, className = "" }: { v: View; className?: string }) {
  return v.logo ? <img className={`inv-logo ${className}`} src={v.logo} alt={v.inv.supplier.name || "Logo"} /> : null;
}

/**
 * Your logo, name and address, arranged the way you picked:
 *  logo        logo replaces the name (the legal name still prints small, as GST rules require)
 *  logo-name   logo and name on one line, address below
 *  logo-side   logo on the left, name and address stacked beside it
 *  logo-top    logo above the name
 */
export function SupplierHeader({ v }: { v: View }) {
  if (!v.logo) {
    return (
      <div className="sh">
        <SupplierName v={v} />
        <ContactLines v={v} />
      </div>
    );
  }
  switch (v.header) {
    case "logo-name":
      return (
        <div className="sh sh-logo-name">
          <div className="sh-row">
            <Logo v={v} />
            <SupplierName v={v} />
          </div>
          <ContactLines v={v} />
        </div>
      );
    case "logo-side":
      return (
        <div className="sh sh-logo-side">
          <Logo v={v} />
          <div>
            <SupplierName v={v} />
            <ContactLines v={v} />
          </div>
        </div>
      );
    case "logo-top":
      return (
        <div className="sh sh-logo-top">
          <Logo v={v} />
          <SupplierName v={v} />
          <ContactLines v={v} />
        </div>
      );
    default:
      return (
        <div className="sh sh-logo">
          <Logo v={v} />
          <ContactLines v={v} legalName />
        </div>
      );
  }
}

export function TaxIds({ v }: { v: View }) {
  const s = v.inv.supplier;
  if (!s.gstin && !s.pan) return null;
  return (
    <div className="inv-taxids">
      {s.gstin && (
        <p>
          <span className="inv-k">GSTIN</span> <span className="mono">{s.gstin}</span>
        </p>
      )}
      {s.pan && (
        <p>
          <span className="inv-k">PAN</span> <span className="mono">{s.pan}</span>
        </p>
      )}
    </div>
  );
}

export function BillTo({ v, label = "Billed to" }: { v: View; label?: string }) {
  const cl = v.inv.client;
  return (
    <div className="inv-billto">
      <p className="inv-label">{label}</p>
      <p className={`inv-client${cl.name ? "" : " is-placeholder"}`}>{cl.name || "Client name"}</p>
      {cl.address && <p className="pre">{cl.address}</p>}
      {v.c.isExport && cl.country && <p>{cl.country}</p>}
      {!v.c.isExport && !cl.gstin && cl.stateCode && <p>{stateName(cl.stateCode)}</p>}
      {cl.gstin && (
        <p>
          <span className="inv-k">GSTIN</span> <span className="mono">{cl.gstin}</span>
        </p>
      )}
    </div>
  );
}

type MetaKey = "number" | "date" | "due" | "pos" | "rc";

export function Meta({ v, className, omit = [] }: { v: View; className: string; omit?: MetaKey[] }) {
  const { inv, c } = v;
  const items: { key: MetaKey; label: string; value: ReactNode }[] = [
    { key: "number", label: "Invoice no.", value: <span className="mono">{inv.number}</span> },
    { key: "date", label: "Date", value: formatDate(inv.date) },
  ];
  if (inv.dueDate) items.push({ key: "due", label: "Due", value: formatDate(inv.dueDate) });
  items.push({
    key: "pos",
    label: "Place of supply",
    value: (
      <>
        {v.placeOfSupply}
        {!c.isExport && c.placeOfSupply && <span className="mono inv-dim"> {c.placeOfSupply}</span>}
      </>
    ),
  });
  if (v.hasTax) items.push({ key: "rc", label: "Reverse charge", value: "No" });

  return (
    <dl className={className}>
      {items
        .filter((i) => !omit.includes(i.key))
        .map((i) => (
          <div key={i.key}>
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Description | Qty | Rate | Amount, with SAC and GST rate as a quiet line under each description. */
export function StackedItemsTable({ v }: { v: View }) {
  const { c, hasTax } = v;
  return (
    <table className="inv-items is-stacked">
      <thead>
        <tr>
          <th className="c-desc">Description</th>
          <th className="num">Qty</th>
          <th className="num">Rate</th>
          <th className="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        {c.lines.map((l, i) => {
          const sub = [l.sac && `SAC ${l.sac}`, hasTax && `GST ${l.appliedRate}%`].filter(Boolean).join("  ·  ");
          return (
            <tr key={i}>
              <td className="c-desc">
                {l.description || <span className="inv-dim">—</span>}
                {sub && <span className="inv-sub">{sub}</span>}
              </td>
              <td className="num">
                {qty(l.quantity)}
                {l.unit ? ` ${l.unit}` : ""}
              </td>
              <td className="num">{formatAmount(Math.round(l.rate * 100))}</td>
              <td className="num">{formatAmount(l.taxablePaise)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Line items. `detailed` adds per-line tax columns, as in the traditional GST format. */
export function ItemsTable({ v, detailed = false }: { v: View; detailed?: boolean }) {
  const { c, hasTax, intra } = v;
  const taxCols = detailed && hasTax && c.supplyType !== "export-lut";
  return (
    <table className="inv-items">
      <thead>
        <tr>
          <th className="c-no">#</th>
          <th className="c-desc">Description</th>
          <th>SAC</th>
          <th className="num">Qty</th>
          <th className="num">Rate</th>
          {!taxCols && hasTax && <th className="num">GST</th>}
          {taxCols && <th className="num">Taxable</th>}
          {taxCols && intra && (
            <>
              <th className="num">CGST</th>
              <th className="num">{c.secondTaxLabel}</th>
            </>
          )}
          {taxCols && !intra && <th className="num">IGST</th>}
          <th className="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        {c.lines.map((l, i) => (
          <tr key={i}>
            <td className="c-no">{i + 1}</td>
            <td className="c-desc">{l.description || <span className="inv-dim">—</span>}</td>
            <td className="mono">{l.sac}</td>
            <td className="num">
              {qty(l.quantity)}
              {l.unit ? ` ${l.unit}` : ""}
            </td>
            <td className="num">{formatAmount(Math.round(l.rate * 100))}</td>
            {!taxCols && hasTax && <td className="num">{l.appliedRate}%</td>}
            {taxCols && <td className="num">{formatAmount(l.taxablePaise)}</td>}
            {taxCols && intra && (
              <>
                <td className="num">
                  <span className="inv-rate">{l.appliedRate / 2}%</span>
                  {formatAmount(l.cgstPaise)}
                </td>
                <td className="num">
                  <span className="inv-rate">{l.appliedRate / 2}%</span>
                  {formatAmount(l.sgstPaise)}
                </td>
              </>
            )}
            {taxCols && !intra && (
              <td className="num">
                <span className="inv-rate">{l.appliedRate}%</span>
                {formatAmount(l.igstPaise)}
              </td>
            )}
            <td className="num">{formatAmount(taxCols ? l.totalPaise : l.taxablePaise)}</td>
          </tr>
        ))}
      </tbody>
      {taxCols && (
        <tfoot>
          <tr>
            <td />
            <td colSpan={4}>Total</td>
            <td className="num">{formatAmount(c.taxablePaise)}</td>
            {intra ? (
              <>
                <td className="num">{formatAmount(c.cgstPaise)}</td>
                <td className="num">{formatAmount(c.sgstPaise)}</td>
              </>
            ) : (
              <td className="num">{formatAmount(c.igstPaise)}</td>
            )}
            <td className="num">{formatAmount(c.taxablePaise + c.taxPaise)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

export function Totals({ v }: { v: View }) {
  const { c, hasTax, intra } = v;
  return (
    <table className="inv-totals">
      <tbody>
        <tr>
          <th>{hasTax ? "Taxable value" : "Subtotal"}</th>
          <td>{formatAmount(c.taxablePaise)}</td>
        </tr>
        {intra && (
          <>
            <tr>
              <th>CGST</th>
              <td>{formatAmount(c.cgstPaise)}</td>
            </tr>
            <tr>
              <th>{c.secondTaxLabel}</th>
              <td>{formatAmount(c.sgstPaise)}</td>
            </tr>
          </>
        )}
        {(c.supplyType === "inter" || c.supplyType === "export-igst") && (
          <tr>
            <th>IGST</th>
            <td>{formatAmount(c.igstPaise)}</td>
          </tr>
        )}
        {c.supplyType === "export-lut" && (
          <tr>
            <th>IGST (0%, LUT)</th>
            <td>{formatAmount(0)}</td>
          </tr>
        )}
        {c.roundOffPaise !== 0 && (
          <tr>
            <th>Round off</th>
            <td>{formatAmount(c.roundOffPaise)}</td>
          </tr>
        )}
        <tr className="is-total">
          <th>Total</th>
          <td>{formatINR(c.grandTotalPaise)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function Words({ v }: { v: View }) {
  return (
    <div className="inv-words">
      <p className="inv-label">Amount in words</p>
      <p>{v.c.amountInWords}</p>
      {v.c.declaration && <p className="inv-declaration">{v.c.declaration}</p>}
    </div>
  );
}

export function TaxSummary({ v }: { v: View }) {
  const { c, hasTax, intra } = v;
  if (!hasTax || c.supplyType === "export-lut" || c.taxSummary.length === 0) return null;
  return (
    <table className="inv-taxsum">
      <thead>
        <tr>
          <th>SAC</th>
          <th className="num">Taxable value</th>
          <th className="num">Rate</th>
          {intra ? (
            <>
              <th className="num">CGST</th>
              <th className="num">{c.secondTaxLabel}</th>
            </>
          ) : (
            <th className="num">IGST</th>
          )}
          <th className="num">Total tax</th>
        </tr>
      </thead>
      <tbody>
        {c.taxSummary.map((r) => (
          <tr key={`${r.sac}|${r.rate}`}>
            <td className="mono">{r.sac}</td>
            <td className="num">{formatAmount(r.taxablePaise)}</td>
            <td className="num">{r.rate}%</td>
            {intra ? (
              <>
                <td className="num">{formatAmount(r.cgstPaise)}</td>
                <td className="num">{formatAmount(r.sgstPaise)}</td>
              </>
            ) : (
              <td className="num">{formatAmount(r.igstPaise)}</td>
            )}
            <td className="num">{formatAmount(r.cgstPaise + r.sgstPaise + r.igstPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Qr({ v }: { v: View }) {
  if (!v.qrSvg) return null;
  return (
    <figure className="inv-qr">
      <div className="inv-qr-img" dangerouslySetInnerHTML={{ __html: v.qrSvg }} />
      <figcaption>
        Scan with any UPI app
        <span className="mono">{v.upiId}</span>
      </figcaption>
    </figure>
  );
}

export function Bank({ v }: { v: View }) {
  if (!v.hasBank) return null;
  const b = v.bank;
  // Each pair is wrapped in a div so templates can lay pairs out as a row list or as columns.
  return (
    <dl className="inv-bank">
      {b.accountName && (
        <div>
          <dt>Account name</dt>
          <dd>{b.accountName}</dd>
        </div>
      )}
      {b.accountNumber && (
        <div>
          <dt>Account no.</dt>
          <dd className="mono">{b.accountNumber}</dd>
        </div>
      )}
      {b.ifsc && (
        <div>
          <dt>IFSC</dt>
          <dd className="mono">{b.ifsc}</dd>
        </div>
      )}
      {b.bankName && (
        <div>
          <dt>Bank</dt>
          <dd>{b.bankName}</dd>
        </div>
      )}
    </dl>
  );
}

export function Notes({ v }: { v: View }) {
  return v.inv.notes ? <p className="pre inv-notes">{v.inv.notes}</p> : null;
}

export function Signature({ v }: { v: View }) {
  return (
    <div className="inv-sign">
      <p>For {v.inv.supplier.name || "your business"}</p>
      <p className="inv-sign-line">Authorised signatory</p>
    </div>
  );
}

export function MadeWith({ show }: { show: boolean }) {
  return show ? <p className="inv-branding">Made with BillKul · {REPO_URL.replace(/^https?:\/\//, "")}</p> : null;
}
