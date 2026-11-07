import { computeInvoice, financialYear, formatINR } from "@billkul/core";
import { useMemo } from "react";
import { formatDate, todayIso } from "../dates";
import type { StoredInvoice } from "../storage";

interface Props {
  invoices: StoredInvoice[];
  onOpen: (inv: StoredInvoice) => void;
  onDuplicate: (inv: StoredInvoice) => void;
  onDelete: (inv: StoredInvoice) => void;
  onTogglePaid: (inv: StoredInvoice) => void;
  onNew: () => void;
}

export function InvoiceList({ invoices, onOpen, onDuplicate, onDelete, onTogglePaid, onNew }: Props) {
  const rows = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
        .map((inv) => ({ inv, total: computeInvoice(inv).grandTotalPaise })),
    [invoices],
  );

  const fy = financialYear(todayIso());
  const billed = rows
    .filter((r) => {
      try {
        return financialYear(r.inv.date) === fy;
      } catch {
        return false;
      }
    })
    .reduce((a, r) => a + r.total, 0);
  const unpaidRows = rows.filter((r) => !r.inv.paid);
  const unpaid = unpaidRows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="listpage">
      <header className="page-head with-action">
        <div>
          <h1>Invoices</h1>
          <p>Click a status to mark an invoice paid or unpaid.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          New invoice
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="empty">
          <p>Nothing here yet. Invoices you save will be listed here, newest first.</p>
        </div>
      ) : (
        <>
          <dl className="figures">
            <div>
              <dt>Billed in FY {fy}</dt>
              <dd>{formatINR(billed)}</dd>
            </div>
            <div>
              <dt>Outstanding</dt>
              <dd>{formatINR(unpaid)}</dd>
              <span className="figures-sub">
                {unpaidRows.length} {unpaidRows.length === 1 ? "invoice" : "invoices"}
              </span>
            </div>
          </dl>

          <div className="table-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, total }) => (
                  <tr key={inv.id}>
                    <td>
                      <button className="link mono" onClick={() => onOpen(inv)}>
                        {inv.number}
                      </button>
                    </td>
                    <td className="ellipsis">{inv.client.name || <span className="dim">No client</span>}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td className="num">{formatINR(total)}</td>
                    <td>
                      <button
                        className={`state ${inv.paid ? "is-paid" : "is-due"}`}
                        onClick={() => onTogglePaid(inv)}
                        title={inv.paid ? "Mark as unpaid" : "Mark as paid"}
                      >
                        {inv.paid ? "Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td className="row-actions">
                      <button className="btn-text" onClick={() => onDuplicate(inv)}>
                        Duplicate
                      </button>
                      <button
                        className="btn-text is-danger"
                        onClick={() => confirm(`Delete ${inv.number}? This can't be undone.`) && onDelete(inv)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
