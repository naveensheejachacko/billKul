import { formatINR } from "@billkul/core";
import type { CSSProperties } from "react";
import { formatDateLong } from "../../dates";
import type { TemplateId } from "../../storage";
import {
  Bank,
  BillTo,
  ItemsTable,
  Logo,
  Meta,
  Notes,
  Qr,
  Signature,
  StackedItemsTable,
  SupplierHeader,
  TaxIds,
  TaxSummary,
  Totals,
  Words,
  type View,
} from "./parts";

export const TEMPLATE_OPTIONS: { value: TemplateId; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "boxed", label: "GST boxed" },
];

export const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: "Ink", value: "#1a1917" },
  { name: "Navy", value: "#1f3b63" },
  { name: "Teal", value: "#0f5c5a" },
  { name: "Forest", value: "#2a5233" },
  { name: "Maroon", value: "#8c1d2a" },
  { name: "Plum", value: "#4f2a59" },
];

interface TemplateProps {
  v: View;
  style: CSSProperties;
}

/** Name on the left, document title on the right, details strip below. */
function Classic({ v, style }: TemplateProps) {
  return (
    <article className="paper t-classic" style={style}>
      <header className="cl-head">
        <SupplierHeader v={v} />
        <div className="cl-titleblock">
          <h1 className="inv-title">{v.c.title}</h1>
          <TaxIds v={v} />
        </div>
      </header>
      <Meta v={v} className="cl-meta" />
      <BillTo v={v} />
      <ItemsTable v={v} />
      <section className="inv-sum">
        <Words v={v} />
        <Totals v={v} />
      </section>
      <TaxSummary v={v} />
      <footer className="inv-foot">
        <div className="inv-pay">
          <Qr v={v} />
          <div>
            <Bank v={v} />
            <Notes v={v} />
          </div>
        </div>
        <Signature v={v} />
      </footer>
    </article>
  );
}

/** Leads with what the client cares about: how much, and by when. */
function Modern({ v, style }: TemplateProps) {
  const { inv, c } = v;
  const s = inv.supplier;
  const total = formatINR(c.grandTotalPaise);
  const due = formatDateLong(inv.dueDate);
  return (
    <article className="paper t-modern" style={style}>
      <header className="mo-top">
        <div>
          <h1 className="inv-title">{c.title}</h1>
          <p className="mono mo-number">{inv.number}</p>
        </div>
        <div className={`mo-brand${v.header === "logo-top" ? " is-stacked" : ""}`}>
          <Logo v={v} className="mo-logo" />
          {(!v.logo || v.header !== "logo") && (
            <p className={`mo-brandname${s.name ? "" : " is-placeholder"}`}>{s.name || "Your business name"}</p>
          )}
        </div>
      </header>

      <section className="mo-hero">
        <p className="mo-amount">{total}</p>
        <p className="mo-due">{due ? `Due ${due}` : `Issued ${formatDateLong(inv.date)}`}</p>
      </section>

      <section className="mo-parties">
        <div>
          <p className="inv-label">From</p>
          <p className={`inv-client${s.name ? "" : " is-placeholder"}`}>{s.name || "Your business name"}</p>
          <div className="inv-supplier">
            {s.address && <p className="pre">{s.address}</p>}
            {s.email && <p>{s.email}</p>}
            {s.phone && <p>{s.phone}</p>}
          </div>
          <TaxIds v={v} />
        </div>
        <BillTo v={v} />
        <div>
          <p className="inv-label">Details</p>
          <Meta v={v} className="mo-meta" omit={["number"]} />
        </div>
      </section>

      <StackedItemsTable v={v} />

      <section className="mo-sum">
        <Words v={v} />
        <Totals v={v} />
      </section>

      <TaxSummary v={v} />

      <section className="mo-end">
        {(v.qrSvg || v.hasBank || inv.notes) && (
          <div className="mo-pay">
            {v.qrSvg && <div className="mo-qr" dangerouslySetInnerHTML={{ __html: v.qrSvg }} />}
            <div className="mo-pay-text">
              <p className="mo-pay-title">
                {v.qrSvg ? "Scan to pay with any UPI app" : "How to pay"}
                {v.qrSvg && <span className="mono mo-upi">{v.upiId}</span>}
              </p>
              <Bank v={v} />
              <Notes v={v} />
            </div>
          </div>
        )}
        <Signature v={v} />
      </section>

      <footer className="mo-foot">
        <p>
          <span className="mono">{inv.number}</span> · {total}
          {due ? ` due ${due}` : ""}
        </p>
      </footer>
    </article>
  );
}

/** Centered letterhead, lots of air, one big number. */
function Minimal({ v, style }: TemplateProps) {
  return (
    <article className="paper t-minimal" style={style}>
      <header className="mn-head">
        <SupplierHeader v={v} />
        <TaxIds v={v} />
      </header>
      <section className="mn-intro">
        <BillTo v={v} label="Invoice for" />
        <div className="mn-doc">
          <p className="mn-kicker">{v.c.title}</p>
          <p className="mono mn-number">{v.inv.number}</p>
          <Meta v={v} className="mn-meta" omit={["number"]} />
        </div>
      </section>
      <ItemsTable v={v} />
      <section className="inv-sum">
        <Words v={v} />
        <Totals v={v} />
      </section>
      <TaxSummary v={v} />
      <footer className="inv-foot">
        <div className="inv-pay">
          <Qr v={v} />
          <div>
            <Bank v={v} />
            <Notes v={v} />
          </div>
        </div>
        <Signature v={v} />
      </footer>
    </article>
  );
}

/** The ruled-box layout Indian accountants are used to, with per-line tax columns. */
function Boxed({ v, style }: TemplateProps) {
  return (
    <article className="paper t-boxed" style={style}>
      <div className="bx">
        <div className="bx-title">{v.c.title}</div>
        <div className="bx-row">
          <div className="bx-cell">
            <SupplierHeader v={v} />
            <TaxIds v={v} />
          </div>
          <Meta v={v} className="bx-meta" />
        </div>
        <div className="bx-row bx-one">
          <div className="bx-cell">
            <BillTo v={v} />
          </div>
        </div>
        <ItemsTable v={v} detailed />
        <div className="bx-row">
          <div className="bx-cell">
            <Words v={v} />
          </div>
          <div className="bx-cell">
            <Totals v={v} />
          </div>
        </div>
        {v.hasTax && v.c.supplyType !== "export-lut" && (
          <div className="bx-row bx-one">
            <TaxSummary v={v} />
          </div>
        )}
        <div className="bx-row">
          <div className="bx-cell bx-pay">
            <Qr v={v} />
            <div>
              <Bank v={v} />
              <Notes v={v} />
            </div>
          </div>
          <div className="bx-cell bx-signcell">
            <Signature v={v} />
          </div>
        </div>
      </div>
    </article>
  );
}

export const TEMPLATES: Record<TemplateId, (p: TemplateProps) => JSX.Element> = {
  classic: Classic,
  modern: Modern,
  minimal: Minimal,
  boxed: Boxed,
};
