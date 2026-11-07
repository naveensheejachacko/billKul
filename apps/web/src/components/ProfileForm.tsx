import {
  COMMON_SAC_CODES,
  isValidUpiId,
  nextInvoiceNumber,
  validateGstin,
  type BankDetails,
  type Supplier,
} from "@billkul/core";
import { useRef, useState, type ReactNode } from "react";
import { todayIso } from "../dates";
import { processLogo } from "../logo";
import { downloadBackup, readBackup, type AppData, type Settings } from "../storage";
import { Field, GstinField, StateSelect } from "./Fields";

interface Props {
  data: AppData;
  onChange: (data: AppData) => void;
}

function Row(props: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section className="srow">
      <div className="srow-intro">
        <h2>{props.title}</h2>
        <p>{props.intro}</p>
      </div>
      <div className="srow-body">{props.children}</div>
    </section>
  );
}

export function ProfileForm({ data, onChange }: Props) {
  const s = data.supplier;
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logo = data.design.logo;

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    try {
      const processed = await processLogo(file);
      setLogoError(null);
      onChange({ ...data, design: { ...data.design, logo: processed } });
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Couldn't use that image.");
    } finally {
      setLogoBusy(false);
    }
  }

  function removeLogo() {
    const { logo: _removed, ...rest } = data.design;
    onChange({ ...data, design: rest });
  }

  const setSupplier = (patch: Partial<Supplier>) => onChange({ ...data, supplier: { ...s, ...patch } });
  const setBank = (patch: Partial<BankDetails>) => setSupplier({ bank: { ...s.bank, ...patch } });
  const setSettings = (patch: Partial<Settings>) => onChange({ ...data, settings: { ...data.settings, ...patch } });

  const gstinCheck = s.gstin?.trim() ? validateGstin(s.gstin) : null;

  function changeGstin(gstin: string) {
    const check = validateGstin(gstin);
    if (check.valid) setSupplier({ gstin, stateCode: check.stateCode, pan: s.pan || check.pan });
    else setSupplier({ gstin });
  }

  async function importFile(file: File) {
    try {
      const restored = await readBackup(file);
      if (!confirm(`Replace everything in this browser with the backup (${restored.invoices.length} invoices)?`)) return;
      onChange(restored);
      setImportMsg(`Restored ${restored.invoices.length} invoices.`);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  const upiError = s.upiId?.trim() && !isValidUpiId(s.upiId) ? "Should look like name@bank" : undefined;
  const sampleNumber = nextInvoiceNumber(data.settings.prefix, todayIso(), data.invoices.map((i) => i.number));

  return (
    <div className="settings">
      <header className="page-head">
        <h2 className="page-title">Your details</h2>
        <p>Saved in this browser and printed on every invoice. Changes save as you type.</p>
      </header>

      <Row title="Business" intro="Your logo or name, and the address your clients see at the top of the invoice.">
        <div className="grid-2">
          <div className="field span-2">
            <span className="field-label">Logo</span>
            <div className="logo-field">
              <div className={`logo-box${logo ? "" : " is-empty"}`}>
                {logo ? <img src={logo} alt="Your logo" /> : <span>No logo</span>}
              </div>
              <div className="logo-side">
                <div className="btn-row">
                  <button className="btn" type="button" disabled={logoBusy} onClick={() => logoRef.current?.click()}>
                    {logoBusy ? "Adding logo…" : logo ? "Replace" : "Upload logo"}
                  </button>
                  {logo && (
                    <button className="btn-text" type="button" onClick={removeLogo}>
                      Remove
                    </button>
                  )}
                </div>
                <span className={`field-msg${logoError ? " is-error" : ""}`}>
                  {logoError ??
                    "PNG, JPG or SVG. Shown instead of your name at the top. The name still prints in small type, as GST rules require."}
                </span>
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <Field label="Business or your name" span={2}>
            <input value={s.name} onChange={(e) => setSupplier({ name: e.target.value })} />
          </Field>
          <Field label="Address" span={2}>
            <textarea rows={3} value={s.address ?? ""} onChange={(e) => setSupplier({ address: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" value={s.email ?? ""} onChange={(e) => setSupplier({ email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={s.phone ?? ""} onChange={(e) => setSupplier({ phone: e.target.value })} />
          </Field>
        </div>
      </Row>

      <Row
        title="GST registration"
        intro="Not registered? Leave GSTIN empty. Invoices then go out without GST, as a plain invoice."
      >
        <div className="grid-2">
          <GstinField label="GSTIN" value={s.gstin} onChange={changeGstin} />
          <Field label="State" hint={gstinCheck?.valid ? "From your GSTIN" : undefined}>
            <StateSelect value={s.stateCode} disabled={Boolean(gstinCheck?.valid)} onChange={(stateCode) => setSupplier({ stateCode })} />
          </Field>
          <Field label="PAN">
            <input
              className="mono"
              value={s.pan ?? ""}
              maxLength={10}
              onChange={(e) => setSupplier({ pan: e.target.value.toUpperCase() })}
            />
          </Field>
          {gstinCheck?.valid && (
            <Field label="LUT ARN" hint="For zero-rated exports. Printed on invoices to foreign clients.">
              <input
                className="mono"
                value={s.lutArn ?? ""}
                onChange={(e) => setSupplier({ lutArn: e.target.value.toUpperCase() })}
              />
            </Field>
          )}
        </div>
      </Row>

      <Row title="Getting paid" intro="Add a UPI ID and Indian clients can pay the exact amount by scanning the invoice.">
        <div className="grid-2">
          <Field label="UPI ID" error={upiError} span={2}>
            <input
              className="mono"
              value={s.upiId ?? ""}
              placeholder="yourname@okhdfcbank"
              spellCheck={false}
              onChange={(e) => setSupplier({ upiId: e.target.value.trim() })}
            />
          </Field>
          <Field label="Account name">
            <input value={s.bank?.accountName ?? ""} onChange={(e) => setBank({ accountName: e.target.value })} />
          </Field>
          <Field label="Bank">
            <input value={s.bank?.bankName ?? ""} onChange={(e) => setBank({ bankName: e.target.value })} />
          </Field>
          <Field label="Account number">
            <input
              className="mono"
              value={s.bank?.accountNumber ?? ""}
              onChange={(e) => setBank({ accountNumber: e.target.value })}
            />
          </Field>
          <Field label="IFSC">
            <input
              className="mono"
              value={s.bank?.ifsc ?? ""}
              onChange={(e) => setBank({ ifsc: e.target.value.toUpperCase() })}
            />
          </Field>
        </div>
      </Row>

      <Row title="Defaults" intro="Used to pre-fill every new invoice. You can still change them per invoice.">
        <div className="grid-2">
          <Field label="Number prefix" hint={<>Next number: <span className="mono">{sampleNumber}</span></>}>
            <input
              className="mono"
              value={data.settings.prefix}
              maxLength={6}
              onChange={(e) => setSettings({ prefix: e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase() })}
            />
          </Field>
          <Field label="Payment due after (days)">
            <input
              type="number"
              min="0"
              value={data.settings.dueDays}
              onChange={(e) => setSettings({ dueDays: Math.max(0, e.target.valueAsNumber || 0) })}
            />
          </Field>
          <Field label="SAC code">
            <select value={data.settings.defaultSac} onChange={(e) => setSettings({ defaultSac: e.target.value })}>
              {COMMON_SAC_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="GST rate (%)">
            <input
              type="number"
              min="0"
              value={data.settings.defaultGstRate}
              onChange={(e) => setSettings({ defaultGstRate: e.target.valueAsNumber || 0 })}
            />
          </Field>
        </div>
      </Row>

      <Row
        title="Backup"
        intro="Your invoices live only in this browser. Clearing site data deletes them, so keep a backup file somewhere safe."
      >
        <div className="btn-row">
          <button className="btn" onClick={() => downloadBackup(data)}>
            Download backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Restore from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {importMsg && <p className="field-msg">{importMsg}</p>}
      </Row>
    </div>
  );
}
