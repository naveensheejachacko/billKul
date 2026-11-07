import {
  COMMON_GST_RATES,
  COMMON_SAC_CODES,
  computeInvoice,
  formatAmount,
  isExportClient,
  nextInvoiceNumber,
  validateGstin,
  type Client,
  type LineItem,
} from "@billkul/core";
import { useEffect, useMemo, useState } from "react";
import { BMC_URL } from "../config";
import { blankItem, newDraft } from "../drafts";
import type { AppData, Design, StoredInvoice } from "../storage";
import { CloseIcon, Field, GstinField, Segmented, StateSelect } from "./Fields";
import { HEADER_OPTIONS, LayoutIcon } from "./invoice/layoutIcons";
import { COLOR_PRESETS, TEMPLATE_OPTIONS } from "./invoice/templates";
import { InvoicePreview } from "./InvoicePreview";

interface Props {
  data: AppData;
  /** Invoice to edit, or null for a new one */
  initial: StoredInvoice | null;
  onSave: (inv: StoredInvoice) => void;
  onNew: () => void;
  onDesignChange: (patch: Partial<Design>) => void;
}

const num = (n: number) => (Number.isFinite(n) ? n : "");

export function InvoiceEditor({ data, initial, onSave, onNew, onDesignChange }: Props) {
  const [draft, setDraft] = useState<StoredInvoice>(() => initial ?? newDraft(data));
  const [dirty, setDirty] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const computed = useMemo(() => computeInvoice(draft), [draft]);
  const isSaved = data.invoices.some((i) => i.id === draft.id);
  const isExport = isExportClient(draft.client);
  const registered = Boolean(draft.supplier.gstin?.trim());
  const clientGstinValid = Boolean(draft.client.gstin && validateGstin(draft.client.gstin).valid);

  useEffect(() => {
    const after = () => setShowNote(true);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  const update = (patch: Partial<StoredInvoice>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const updateClient = (patch: Partial<Client>) => update({ client: { ...draft.client, ...patch } });
  const updateItem = (index: number, patch: Partial<LineItem>) =>
    update({ items: draft.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });

  function changeDate(date: string) {
    const patch: Partial<StoredInvoice> = { date };
    // Keep auto-numbering in step with the financial year while the invoice is new.
    if (!isSaved && date) {
      const others = data.invoices.map((i) => i.number);
      try {
        if (draft.number === nextInvoiceNumber(data.settings.prefix, draft.date, others)) {
          patch.number = nextInvoiceNumber(data.settings.prefix, date, others);
        }
      } catch {
        /* incomplete date while typing */
      }
    }
    update(patch);
  }

  function changeClientGstin(gstin: string) {
    const check = validateGstin(gstin);
    updateClient(check.valid ? { gstin, stateCode: check.stateCode } : { gstin });
  }

  function save(): StoredInvoice {
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    onSave(saved);
    setDraft(saved);
    setDirty(false);
    return saved;
  }

  function printPdf() {
    const saved = save();
    const title = document.title;
    document.title = saved.number.replace(/\//g, "-"); // becomes the default PDF filename
    window.print();
    document.title = title;
  }

  const status = dirty ? "Unsaved changes" : isSaved ? "Saved" : "Not saved yet";

  return (
    <div className="workspace">
      <div className="form-pane no-print">
        <div className="form-scroll">
          <div className="form-head">
            <h1>{isSaved ? draft.number : "New invoice"}</h1>
            {isSaved && (
              <button className="btn-text" onClick={onNew}>
                Start a new one
              </button>
            )}
          </div>

          <section className="fs">
            <div className="grid-3">
              <Field label="Invoice no.">
                <input
                  className="mono"
                  value={draft.number}
                  maxLength={16}
                  onChange={(e) => update({ number: e.target.value })}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={draft.date} onChange={(e) => changeDate(e.target.value)} />
              </Field>
              <Field label="Due">
                <input
                  type="date"
                  value={draft.dueDate ?? ""}
                  onChange={(e) => update({ dueDate: e.target.value || undefined })}
                />
              </Field>
            </div>
          </section>

          <section className="fs">
            <div className="fs-head">
              <h2>Client</h2>
              {data.clients.length > 0 && (
                <select
                  className="select-quiet"
                  value=""
                  aria-label="Fill from a saved client"
                  onChange={(e) => {
                    const c = data.clients[Number(e.target.value)];
                    if (c) update({ client: { ...c } });
                  }}
                >
                  <option value="">Saved clients</option>
                  {data.clients.map((c, i) => (
                    <option key={i} value={i}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid-2">
              <Field label="Name" span={2}>
                <input value={draft.client.name} onChange={(e) => updateClient({ name: e.target.value })} />
              </Field>
              <Field label="Address" span={2}>
                <textarea
                  rows={2}
                  value={draft.client.address ?? ""}
                  onChange={(e) => updateClient({ address: e.target.value })}
                />
              </Field>
              <div className="span-2">
                <Segmented
                  label="Client location"
                  value={isExport ? "abroad" : "india"}
                  options={[
                    { value: "india", label: "In India" },
                    { value: "abroad", label: "Outside India" },
                  ]}
                  onChange={(v) =>
                    updateClient(v === "abroad" ? { country: draft.client.country || "United States", gstin: undefined } : { country: undefined })
                  }
                />
              </div>
              {isExport ? (
                <>
                  <Field label="Country">
                    <input value={draft.client.country ?? ""} onChange={(e) => updateClient({ country: e.target.value })} />
                  </Field>
                  {registered && (
                    <label className="check">
                      <input type="checkbox" checked={Boolean(draft.lut)} onChange={(e) => update({ lut: e.target.checked })} />
                      <span>
                        Export under LUT
                        <small>No GST charged</small>
                      </span>
                    </label>
                  )}
                </>
              ) : (
                <>
                  <GstinField label="GSTIN" value={draft.client.gstin} onChange={changeClientGstin} hint="Optional" />
                  <Field label="State" hint={clientGstinValid ? "From GSTIN" : "Sets CGST+SGST or IGST"}>
                    <StateSelect
                      value={draft.client.stateCode}
                      disabled={clientGstinValid}
                      onChange={(stateCode) => updateClient({ stateCode })}
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          <section className="fs">
            <div className="fs-head">
              <h2>Line items</h2>
            </div>
            <datalist id="sac-codes">
              {COMMON_SAC_CODES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.description}
                </option>
              ))}
            </datalist>
            <datalist id="gst-rates">
              {COMMON_GST_RATES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            <ol className="lines">
              {draft.items.map((item, i) => (
                <li className="line" key={i}>
                  <div className="line-top">
                    <span className="line-no">{i + 1}</span>
                    <input
                      className="line-desc"
                      aria-label={`Item ${i + 1} description`}
                      placeholder="Description, e.g. Website redesign"
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                    />
                    <span className="line-amount">{formatAmount(computed.lines[i]?.taxablePaise ?? 0)}</span>
                    <button
                      className="btn-icon"
                      aria-label={`Remove item ${i + 1}`}
                      title="Remove"
                      disabled={draft.items.length === 1}
                      onClick={() => update({ items: draft.items.filter((_, j) => j !== i) })}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="line-meta">
                    <label>
                      <span>SAC</span>
                      <input
                        className="mono w-sac"
                        list="sac-codes"
                        value={item.sac ?? ""}
                        onChange={(e) => updateItem(i, { sac: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Qty</span>
                      <input
                        className="w-qty"
                        type="number"
                        min="0"
                        step="any"
                        value={num(item.quantity)}
                        onChange={(e) => updateItem(i, { quantity: e.target.valueAsNumber })}
                      />
                    </label>
                    <label>
                      <span>Rate ₹</span>
                      <input
                        className="w-rate"
                        type="number"
                        min="0"
                        step="any"
                        value={num(item.rate)}
                        onChange={(e) => updateItem(i, { rate: e.target.valueAsNumber })}
                      />
                    </label>
                    <label>
                      <span>GST %</span>
                      <input
                        className="w-gst"
                        type="number"
                        min="0"
                        step="any"
                        list="gst-rates"
                        disabled={!registered || computed.supplyType === "export-lut"}
                        value={num(item.gstRate)}
                        onChange={(e) => updateItem(i, { gstRate: e.target.valueAsNumber })}
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ol>
            <button className="btn-add" onClick={() => update({ items: [...draft.items, blankItem(data)] })}>
              Add line
            </button>
          </section>

          <section className="fs">
            <Field label="Notes" hint="Printed under the payment details">
              <textarea
                rows={2}
                placeholder="Payment terms, a thank-you, anything else"
                value={draft.notes ?? ""}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </Field>
          </section>
        </div>

        <div className="form-actions">
          <span className={`status${dirty ? " is-dirty" : ""}`}>{status}</span>
          <button className="btn" onClick={save} disabled={!dirty && isSaved}>
            Save
          </button>
          <button className="btn btn-primary" onClick={printPdf} title="Opens the print dialog. Choose Save as PDF.">
            Download PDF
          </button>
        </div>
      </div>

      <div className="desk">
        <div className="desk-bar no-print">
          <div className="desk-bar-row">
            <Segmented
              label="Invoice design"
              value={data.design.template}
              options={TEMPLATE_OPTIONS}
              onChange={(template) => onDesignChange({ template })}
            />
            <div className="swatches" role="radiogroup" aria-label="Accent colour">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={data.design.color === p.value}
                  aria-label={p.name}
                  title={p.name}
                  className="swatch"
                  style={{ background: p.value }}
                  onClick={() => onDesignChange({ color: p.value })}
                />
              ))}
              <label
                className="swatch swatch-custom"
                title="Custom colour"
                aria-checked={!COLOR_PRESETS.some((p) => p.value === data.design.color)}
                style={
                  COLOR_PRESETS.some((p) => p.value === data.design.color) ? undefined : { background: data.design.color }
                }
              >
                <input
                  type="color"
                  aria-label="Custom colour"
                  value={data.design.color}
                  onChange={(e) => onDesignChange({ color: e.target.value })}
                />
              </label>
            </div>
          </div>
          {data.design.logo && (
            <div className="desk-bar-row">
              <div className="tool">
                <span className="tool-label">Logo</span>
                <Segmented
                  className="seg-icons"
                  label="Logo arrangement"
                  value={data.design.header}
                  options={HEADER_OPTIONS.map((o) => ({ ...o, label: <LayoutIcon layout={o.value} /> }))}
                  onChange={(header) => onDesignChange({ header })}
                />
              </div>
              <div className="tool">
                <span className="tool-label">Size</span>
                <Segmented
                  label="Logo size"
                  value={data.design.logoSize}
                  options={[
                    { value: "s", label: "S", title: "Small" },
                    { value: "m", label: "M", title: "Medium" },
                    { value: "l", label: "L", title: "Large" },
                  ]}
                  onChange={(logoSize) => onDesignChange({ logoSize })}
                />
              </div>
            </div>
          )}
        </div>
        {computed.warnings.length > 0 && (
          <div className="checks no-print">
            <p className="checks-title">Check before sending</p>
            <ul>
              {computed.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <InvoicePreview inv={draft} c={computed} design={data.design} />
        <p className="desk-hint no-print">
          In the print dialog, set the destination to <strong>Save as PDF</strong>.
        </p>
      </div>

      {showNote && (
        <div className="note no-print" role="status">
          <p>
            BillKul is free and made in spare time. If it saved you a few minutes,{" "}
            <a href={BMC_URL} target="_blank" rel="noreferrer">
              you can buy me a coffee
            </a>
            .
          </p>
          <button className="btn-icon" aria-label="Dismiss" onClick={() => setShowNote(false)}>
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
