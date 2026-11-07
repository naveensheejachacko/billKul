import type { ComputedInvoice, Invoice } from "@billkul/core";
import type { CSSProperties } from "react";
import { brandTextColor, readableInk } from "../logo";
import type { Design } from "../storage";
import "./invoice/invoice.css";
import { useInvoiceView } from "./invoice/parts";
import { TEMPLATES } from "./invoice/templates";

interface Props {
  inv: Invoice;
  c: ComputedInvoice;
  design: Design;
  showBranding: boolean;
}

const LOGO_HEIGHT = { s: "40px", m: "52px", l: "68px" };

export function InvoicePreview({ inv, c, design, showBranding }: Props) {
  const v = useInvoiceView(inv, c, design);
  const Template = TEMPLATES[design.template] ?? TEMPLATES.classic;
  const style = {
    "--brand": design.color,
    "--brand-ink": readableInk(design.color),
    "--brand-text": brandTextColor(design.color),
    "--logo-h": LOGO_HEIGHT[design.logoSize] ?? LOGO_HEIGHT.m,
  } as CSSProperties;
  return <Template v={v} showBranding={showBranding} style={style} />;
}
