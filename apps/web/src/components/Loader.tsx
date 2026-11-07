import { useEffect, useState } from "react";
import { hideSplash } from "../splash";

// The animation styles (.sp-*, .loader and the bk-write keyframes) live in the
// inline <style> in index.html, so the very first splash can play before any
// JavaScript or CSS has downloaded. This component reuses them.

/** The BillKul receipt with its three lines being written in, one after another. */
export function LoaderMark({ size = 56 }: { size?: number }) {
  return (
    <svg className="sp-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="sp-body"
        d="M5 2.5h14a1 1 0 0 1 1 1v18l-2.67-1.6-2.66 1.6L12 19.9l-2.67 1.6-2.66-1.6L4 21.5v-18a1 1 0 0 1 1-1Z"
      />
      <path className="sp-line" pathLength={1} d="M8 8h8" />
      <path className="sp-line" pathLength={1} d="M8 11.5h8" />
      <path className="sp-line" pathLength={1} d="M8 15h4.5" />
    </svg>
  );
}

/** Shown while a screen loads. Waits `delay` ms first, so fast loads don't flash. */
export function Loader({ delay = 150, label = "Loading" }: { delay?: number; label?: string }) {
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return <div className="loader" aria-busy="true" />;
  return (
    <div className="loader" role="status" aria-busy="true">
      <LoaderMark />
      <span className="loader-label">{label}</span>
    </div>
  );
}

/** Rendered next to a screen's content: once it mounts, the screen is ready and the splash can go. */
export function ReadySignal() {
  useEffect(() => hideSplash(), []);
  return null;
}
