import { PAN_HOLDER_TYPES, getState, gstinCheckChar, normalizeGstin, validateGstin } from "@billkul/core";
import { byId, escapeHtml } from "./common";

const input = byId<HTMLInputElement>("gstin");
const verdict = byId("verdict");
const partsWrap = byId("parts-wrap");
const parts = byId("parts");

function setVerdict(text: string, kind: "ok" | "bad" | "wait") {
  verdict.textContent = text;
  verdict.className = `verdict is-${kind}`;
}

function row(pos: string, value: string, meaning: string) {
  return `<tr><td>${pos}</td><td class="mono">${escapeHtml(value)}</td><td>${meaning}</td></tr>`;
}

function render() {
  const gstin = normalizeGstin(input.value);
  partsWrap.hidden = true;
  if (!gstin) return setVerdict("Enter a 15-character GSTIN.", "wait");
  if (gstin.length < 15) return setVerdict(`Keep typing: ${gstin.length} of 15 characters.`, "wait");

  const check = validateGstin(gstin);
  if (!check.valid) setVerdict(`✗ Not valid. ${check.error}.`, "bad");
  else setVerdict(`✓ Valid GSTIN format, registered in ${check.stateName}.`, "ok");

  if (gstin.length !== 15 || !/^[0-9A-Z]{15}$/.test(gstin)) return;
  const state = getState(gstin.slice(0, 2));
  const pan = gstin.slice(2, 12);
  const panType = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ? PAN_HOLDER_TYPES[pan[3]] : undefined;
  const entity = gstin[12];
  const expected = gstinCheckChar(gstin.slice(0, 14));
  parts.innerHTML = [
    row("1–2", gstin.slice(0, 2), state ? `State: ${state.name}` : "Unknown state code"),
    row("3–12", pan, panType ? `PAN of a ${panType.toLowerCase()}` : "Doesn't match the PAN pattern (may be a TDS or other special GSTIN)"),
    row("13", entity, entity === "1" ? "First registration for this PAN in the state" : "Another registration for the same PAN in this state"),
    row("14", gstin[13], gstin[13] === "Z" ? "Default for regular taxpayers" : "Non-default: used for special registrations"),
    row("15", gstin[14], gstin[14] === expected ? "Check character matches ✓" : `Should be “${expected}” if the first 14 characters are right`),
  ].join("");
  partsWrap.hidden = false;
}

input.addEventListener("input", render);
byId("example").addEventListener("click", () => {
  input.value = "29AAFCN7312K1Z6";
  render();
  input.focus();
});

const fromUrl = new URLSearchParams(location.search).get("gstin");
if (fromUrl) input.value = fromUrl;
render();
