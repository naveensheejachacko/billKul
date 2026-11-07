import { nextInvoiceNumber, type LineItem } from "@billkul/core";
import { addDays, todayIso } from "./dates";
import { newId, type AppData, type StoredInvoice } from "./storage";

export function newDraft(data: AppData, base?: Partial<StoredInvoice>): StoredInvoice {
  const date = todayIso();
  const { settings } = data;
  return {
    id: newId(),
    number: nextInvoiceNumber(settings.prefix, date, data.invoices.map((i) => i.number)),
    date,
    dueDate: settings.dueDays > 0 ? addDays(date, settings.dueDays) : undefined,
    supplier: data.supplier,
    client: { name: "" },
    items: [blankItem(data)],
    lut: Boolean(data.supplier.lutArn),
    updatedAt: new Date().toISOString(),
    ...base,
  };
}

export function blankItem(data: AppData): LineItem {
  return { description: "", sac: data.settings.defaultSac, quantity: 1, rate: 0, gstRate: data.settings.defaultGstRate };
}
