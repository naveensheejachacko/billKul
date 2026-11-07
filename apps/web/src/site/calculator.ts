import { calculateGst, formatINR } from "@billkul/core";
import { byId, segmented } from "./common";

const amountInput = byId<HTMLInputElement>("amount");
const customInput = byId<HTMLInputElement>("custom");
const ratesGroup = byId("rates");
const rows = byId("rows");

let presetRate = 18;
let mode: "add" | "remove" = "add";
let supply: "intra" | "inter" = "intra";

const pct = (n: number) => `${Number(n.toFixed(4))}%`;

function currentRate(): number {
  const custom = customInput.valueAsNumber;
  return Number.isFinite(custom) && custom >= 0 ? custom : presetRate;
}

function render() {
  const amount = amountInput.valueAsNumber;
  const rate = currentRate();
  if (!Number.isFinite(amount) || amount < 0 || rate > 100) {
    rows.innerHTML = `<tr><th>Enter an amount and a rate between 0 and 100%</th><td></td></tr>`;
    return;
  }
  const g = calculateGst(amount, rate, { inclusive: mode === "remove", interState: supply === "inter" });
  const r = { base: g.taxablePaise, cgst: g.cgstPaise, sgst: g.sgstPaise, igst: g.igstPaise, tax: g.taxPaise, total: g.totalPaise };
  const line = (label: string, paise: number, cls = "") =>
    `<tr${cls ? ` class="${cls}"` : ""}><th>${label}</th><td>${formatINR(paise)}</td></tr>`;
  rows.innerHTML = [
    line("Amount before GST", r.base),
    supply === "intra" ? line(`CGST @ ${pct(rate / 2)}`, r.cgst) + line(`SGST @ ${pct(rate / 2)}`, r.sgst) : line(`IGST @ ${pct(rate)}`, r.igst),
    line(`Total GST (${pct(rate)})`, r.tax),
    line("Total including GST", r.total, "is-total"),
  ].join("");
}

segmented(ratesGroup, (v) => {
  presetRate = Number(v);
  customInput.value = "";
  render();
});
segmented(byId("mode"), (v) => {
  mode = v as typeof mode;
  render();
});
segmented(byId("supply"), (v) => {
  supply = v as typeof supply;
  render();
});
customInput.addEventListener("input", () => {
  const typing = customInput.value !== "";
  for (const b of ratesGroup.querySelectorAll("button")) {
    const on = !typing && Number(b.dataset.value) === presetRate;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-checked", String(on));
  }
  render();
});
amountInput.addEventListener("input", render);
render();
