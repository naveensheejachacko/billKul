// Loaded by every static page: fonts and styles (Vite turns these into <link> tags at build time).
import "../fonts";
import "../styles.css";
import "./site.css";

/** Wire up a .seg radio group: clicking a button marks it on and reports its data value. */
export function segmented(el: HTMLElement, onPick: (value: string) => void): void {
  el.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest("button");
    if (!button || !el.contains(button)) return;
    for (const b of el.querySelectorAll("button")) {
      const on = b === button;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-checked", String(on));
    }
    onPick(button.dataset.value ?? "");
  });
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
