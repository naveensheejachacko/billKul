import { STATES, validateGstin } from "@billkul/core";
import type { ReactNode } from "react";

export function Field(props: {
  label: string;
  hint?: ReactNode;
  error?: string;
  ok?: string;
  span?: 1 | 2 | 3;
  children: ReactNode;
}) {
  return (
    <label className={`field${props.span ? ` span-${props.span}` : ""}`}>
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.error ? (
        <span className="field-msg is-error">{props.error}</span>
      ) : props.ok ? (
        <span className="field-msg is-ok">{props.ok}</span>
      ) : props.hint ? (
        <span className="field-msg">{props.hint}</span>
      ) : null}
    </label>
  );
}

export function StateSelect(props: { value?: string; onChange: (code: string | undefined) => void; disabled?: boolean }) {
  return (
    <select
      value={props.value ?? ""}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value || undefined)}
    >
      <option value="">Choose a state</option>
      {STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name} ({s.code})
        </option>
      ))}
    </select>
  );
}

export function GstinField(props: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  hint?: string;
  span?: 1 | 2 | 3;
}) {
  const value = props.value ?? "";
  const check = value.trim() ? validateGstin(value) : null;
  return (
    <Field
      label={props.label}
      span={props.span}
      error={check && !check.valid ? check.error : undefined}
      ok={check?.valid ? `Valid · ${check.stateName}` : undefined}
      hint={props.hint}
    >
      <input
        className="mono"
        value={value}
        maxLength={15}
        spellCheck={false}
        autoComplete="off"
        placeholder="29ABCDE1234F1Z5"
        onChange={(e) => props.onChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
      />
    </Field>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  /** `title` is the accessible name and tooltip, needed when `label` is an icon */
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`seg${props.className ? ` ${props.className}` : ""}`} role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          title={o.title}
          aria-label={o.title}
          aria-checked={o.value === props.value}
          className={o.value === props.value ? "is-on" : ""}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="var(--accent)"
        d="M5 2.5h14a1 1 0 0 1 1 1v18l-2.67-1.6-2.66 1.6L12 19.9l-2.67 1.6-2.66-1.6L4 21.5v-18a1 1 0 0 1 1-1Z"
      />
      <path stroke="#fff" strokeWidth="1.6" strokeLinecap="round" d="M8 8h8M8 11.5h8M8 15h4.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
