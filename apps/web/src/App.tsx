import type { Client } from "@billkul/core";
import { useEffect, useState } from "react";
import { Mark } from "./components/Fields";
import { InvoiceEditor, newDraft } from "./components/InvoiceEditor";
import { InvoiceList } from "./components/InvoiceList";
import { ProfileForm } from "./components/ProfileForm";
import { BMC_URL, REPO_URL } from "./config";
import { loadData, saveData, type AppData, type StoredInvoice } from "./storage";

type Tab = "editor" | "invoices" | "profile";

const clientKey = (c: Client) => (c.gstin?.trim() || c.name.trim()).toLowerCase();

function upsertClient(clients: Client[], client: Client): Client[] {
  if (!client.name.trim()) return clients;
  const key = clientKey(client);
  const rest = clients.filter((c) => clientKey(c) !== key);
  return [client, ...rest].sort((a, b) => a.name.localeCompare(b.name));
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [storageOk, setStorageOk] = useState(true);
  const [tab, setTab] = useState<Tab>(() => (data.supplier.name.trim() ? "editor" : "profile"));
  const [editing, setEditing] = useState<StoredInvoice | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => setStorageOk(saveData(data)), [data]);

  const openEditor = (inv: StoredInvoice | null) => {
    setEditing(inv);
    setEditorKey((k) => k + 1); // remount so the editor starts from this invoice
    setTab("editor");
  };

  function saveInvoice(inv: StoredInvoice) {
    setData((d) => {
      const exists = d.invoices.some((i) => i.id === inv.id);
      return {
        ...d,
        invoices: exists ? d.invoices.map((i) => (i.id === inv.id ? inv : i)) : [...d.invoices, inv],
        clients: upsertClient(d.clients, inv.client),
      };
    });
  }

  const hasProfile = data.supplier.name.trim() !== "";
  const navItem = (id: Tab, label: string, onClick: () => void, count?: number) => (
    <button className={tab === id ? "is-active" : ""} aria-current={tab === id ? "page" : undefined} onClick={onClick}>
      {label}
      {count ? <span className="count">{count}</span> : null}
    </button>
  );

  return (
    <div className={`app${tab === "editor" ? " is-editor" : ""}`}>
      <header className="topbar no-print">
        <span className="wordmark">
          <Mark />
          BillKul
        </span>
        <nav className="nav">
          {navItem("editor", "Create", () => tab !== "editor" && openEditor(null))}
          {navItem("invoices", "Invoices", () => setTab("invoices"), data.invoices.length)}
          {navItem("profile", "Your details", () => setTab("profile"))}
        </nav>
        <a className="support" href={BMC_URL} target="_blank" rel="noreferrer">
          Buy me a coffee
        </a>
      </header>

      {(!storageOk || (!hasProfile && tab !== "profile")) && (
        <div className="notices no-print">
          {!storageOk && (
            <p className="notice is-error">
              This browser is blocking storage, maybe a private window. Invoices won't be kept after you close the tab.
            </p>
          )}
          {!hasProfile && tab !== "profile" && (
            <p className="notice">
              Your business details are missing from the invoice.{" "}
              <button className="link" onClick={() => setTab("profile")}>
                Add them
              </button>
            </p>
          )}
        </div>
      )}

      {tab === "editor" && (
        <InvoiceEditor
          key={editorKey}
          data={data}
          initial={editing}
          onSave={saveInvoice}
          onNew={() => openEditor(null)}
          onDesignChange={(patch) => setData((d) => ({ ...d, design: { ...d.design, ...patch } }))}
        />
      )}

      {tab !== "editor" && (
        <main className="page">
          {tab === "invoices" && (
            <InvoiceList
              invoices={data.invoices}
              onNew={() => openEditor(null)}
              onOpen={openEditor}
              onDuplicate={(inv) =>
                openEditor(newDraft(data, { client: inv.client, items: inv.items, notes: inv.notes, lut: inv.lut }))
              }
              onDelete={(inv) => setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== inv.id) }))}
              onTogglePaid={(inv) =>
                setData((d) => ({
                  ...d,
                  invoices: d.invoices.map((i) => (i.id === inv.id ? { ...i, paid: !i.paid } : i)),
                }))
              }
            />
          )}
          {tab === "profile" && (
            <>
              {!hasProfile && (
                <section className="hero">
                  <h1>Free GST invoice and bill generator for freelancers</h1>
                  <p>
                    Fill in your details once, then make proper tax invoices in a couple of minutes: CGST + SGST or IGST
                    worked out from the GSTIN, export invoices under LUT, and a UPI QR so clients pay the exact amount. No
                    sign-up, and nothing you type leaves this browser.
                  </p>
                  <p className="hero-links">
                    <a href="/gst-invoice-format/">See sample invoices</a>
                    <a href="/gst-calculator/">GST calculator</a>
                    <a href="/gstin-validator/">GSTIN checker</a>
                  </p>
                </section>
              )}
              <ProfileForm data={data} onChange={setData} />
              {hasProfile && (
                <div className="page-end">
                  <button className="btn btn-primary" onClick={() => openEditor(null)}>
                    Create an invoice
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {tab !== "editor" && (
        <footer className="footer no-print">
          <nav className="footer-links" aria-label="Tools and guides">
            <a href="/gst-calculator/">GST calculator</a>
            <a href="/gstin-validator/">GSTIN checker</a>
            <a href="/gst-invoice-format/">GST invoice format</a>
            <a href="/export-invoice-lut/">Export invoices under LUT</a>
          </nav>
          <span>
            Free and{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              open source
            </a>
            . Nothing you enter leaves this browser. Not tax advice, so check unusual cases with your CA.
          </span>
          <a href={BMC_URL} target="_blank" rel="noreferrer">
            Buy me a coffee
          </a>
        </footer>
      )}
    </div>
  );
}
