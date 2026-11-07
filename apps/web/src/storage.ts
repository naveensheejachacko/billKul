import type { Client, Invoice, Supplier } from "@billkul/core";

export interface StoredInvoice extends Invoice {
  id: string;
  paid?: boolean;
  updatedAt: string;
}

export interface Settings {
  prefix: string;
  defaultSac: string;
  defaultGstRate: number;
  dueDays: number;
  /** Small "Made with BillKul" line at the bottom of invoices */
  showBranding: boolean;
}

export type TemplateId = "classic" | "modern" | "minimal" | "boxed";
/** How the logo sits next to the business name and address */
export type HeaderLayout = "logo" | "logo-name" | "logo-side" | "logo-top";
export type LogoSize = "s" | "m" | "l";

/**
 * How invoices look. Kept separate from the supplier snapshot that each invoice
 * stores, so the logo is saved once instead of being copied into every invoice.
 */
export interface Design {
  template: TemplateId;
  /** Accent colour as #rrggbb */
  color: string;
  /** Logo as a data: URL */
  logo?: string;
  header: HeaderLayout;
  logoSize: LogoSize;
}

export interface AppData {
  version: 1;
  supplier: Supplier;
  clients: Client[];
  invoices: StoredInvoice[];
  settings: Settings;
  design: Design;
}

const KEY = "billkul:data:v1";

export function emptyData(): AppData {
  return {
    version: 1,
    supplier: { name: "" },
    clients: [],
    invoices: [],
    settings: { prefix: "INV", defaultSac: "998314", defaultGstRate: 18, dueDays: 15, showBranding: true },
    design: { template: "classic", color: "#1a1917", header: "logo", logoSize: "m" },
  };
}

const TEMPLATES: TemplateId[] = ["classic", "modern", "minimal", "boxed"];
const HEADERS: HeaderLayout[] = ["logo", "logo-name", "logo-side", "logo-top"];
const SIZES: LogoSize[] = ["s", "m", "l"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(x: any): AppData {
  const base = emptyData();
  const design: Design = { ...base.design, ...(x?.design ?? {}) };
  if (!TEMPLATES.includes(design.template)) design.template = "classic";
  if (!HEADERS.includes(design.header)) design.header = "logo";
  if (!SIZES.includes(design.logoSize)) design.logoSize = "m";
  if (!/^#[0-9a-f]{6}$/i.test(design.color)) design.color = base.design.color;
  if (design.logo && !/^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/.test(design.logo)) delete design.logo;
  return {
    version: 1,
    supplier: { ...base.supplier, ...(x?.supplier ?? {}) },
    clients: Array.isArray(x?.clients) ? x.clients : [],
    invoices: Array.isArray(x?.invoices) ? x.invoices : [],
    settings: { ...base.settings, ...(x?.settings ?? {}) },
    design,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyData();
  } catch {
    return emptyData();
  }
}

/** Returns false when the browser blocks storage (private mode, full disk). */
export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function downloadBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `billkul-backup-${new Date().toLocaleDateString("en-CA")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackup(file: File): Promise<AppData> {
  const parsed = JSON.parse(await file.text());
  if (parsed?.version !== 1 || !Array.isArray(parsed?.invoices)) {
    throw new Error("This doesn't look like a BillKul backup file.");
  }
  return normalize(parsed);
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
}
