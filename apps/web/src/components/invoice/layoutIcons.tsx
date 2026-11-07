import type { HeaderLayout } from "../../storage";

// Tiny diagrams of each logo arrangement: filled square = logo,
// thick bar = business name, thin bars = address lines.
const Mark = ({ x, y, s = 9 }: { x: number; y: number; s?: number }) => (
  <rect x={x} y={y} width={s} height={s} rx={1.5} fill="currentColor" />
);
const Bar = ({ x, y, w, thick = false }: { x: number; y: number; w: number; thick?: boolean }) => (
  <rect x={x} y={y} width={w} height={thick ? 3 : 1.6} rx={0.8} fill="currentColor" opacity={thick ? 0.9 : 0.45} />
);

const ICONS: Record<HeaderLayout, JSX.Element> = {
  logo: (
    <>
      <Mark x={2} y={2} s={11} />
      <Bar x={2} y={16} w={14} />
      <Bar x={2} y={19.5} w={18} />
    </>
  ),
  "logo-name": (
    <>
      <Mark x={2} y={2} />
      <Bar x={14} y={5} w={16} thick />
      <Bar x={2} y={15} w={18} />
      <Bar x={2} y={18.5} w={14} />
    </>
  ),
  "logo-side": (
    <>
      <Mark x={2} y={3} s={11} />
      <Bar x={16} y={3} w={16} thick />
      <Bar x={16} y={9} w={18} />
      <Bar x={16} y={12.5} w={13} />
      <Bar x={16} y={16} w={15} />
    </>
  ),
  "logo-top": (
    <>
      <Mark x={2} y={1} />
      <Bar x={2} y={13} w={18} thick />
      <Bar x={2} y={18} w={16} />
      <Bar x={2} y={21} w={12} />
    </>
  ),
};

export function LayoutIcon({ layout }: { layout: HeaderLayout }) {
  return (
    <svg width="36" height="24" viewBox="0 0 36 24" aria-hidden="true">
      {ICONS[layout]}
    </svg>
  );
}

export const HEADER_OPTIONS: { value: HeaderLayout; title: string }[] = [
  { value: "logo", title: "Logo only" },
  { value: "logo-name", title: "Logo with name beside it" },
  { value: "logo-side", title: "Logo beside name and address" },
  { value: "logo-top", title: "Logo above name" },
];
