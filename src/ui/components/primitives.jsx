import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { VARS, varColor, sectorColor, fmt } from '../theme.js';

/** Returns true for ~1.2s after `value` changes (beyond a small tolerance). */
export function useFlash(value, tol = 1e-6) {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const a = prev.current;
    prev.current = value;
    const changed =
      typeof value === 'number' && typeof a === 'number'
        ? Math.abs(value - a) > tol * (1 + Math.abs(a))
        : value !== a;
    if (!changed) return undefined;
    setOn(true);
    const t = setTimeout(() => setOn(false), 1200);
    return () => clearTimeout(t);
  }, [value, tol]);
  return on;
}

/** Sign display, as in the course's tables: + − = ? (or ↑ ↓ = ? next to a symbol). */
export const SIGN_STYLE = {
  '+': { arrow: '↑', color: '#1F7A3A', text: 'עולה' },
  '−': { arrow: '↓', color: '#B42318', text: 'יורד' },
  '=': { arrow: '=', color: '#8A93A3', text: 'לא משתנה' },
  '?': { arrow: '?', color: '#B54708', text: 'לא ניתן לדעת' },
};

export function Sign({ s, arrow = false, className = '' }) {
  const st = SIGN_STYLE[s];
  if (!st) return <span className={`text-[#C4CAD4] ${className}`}>—</span>;
  return (
    <span className={`font-math font-bold ${className}`} style={{ color: st.color }} title={st.text} aria-label={st.text}>
      {arrow ? st.arrow : s}
    </span>
  );
}

/**
 * When provided, every <Var> inside shows the sign of its change (vs. the
 * origin) as a small arrow: the algebra reads like the exam solutions.
 */
export const SignContext = createContext(null);
const VAR_FIELD = { 'Y*': 'Ystar', Res: 'reservesDelta', D: 'debt', Pe: null };

/** A variable symbol in its sector color. `glow` adds a halo (used for "active" variables). */
export function Var({ k, glow = false, className = '', title, label, noSign = false }) {
  const meta = VARS[k] || { sym: k, sector: null, name: '' };
  const color = varColor(k);
  const signs = useContext(SignContext);
  const field = k in VAR_FIELD ? VAR_FIELD[k] : k;
  const s = !noSign && signs && field ? signs[field] : null;
  return (
    <span
      className={`var-token ${glow ? 'var-glow' : ''} ${className}`}
      style={{ color, '--glow': color }}
      title={title || meta.name}
      dir="ltr"
    >
      {label ?? meta.sym}
      {s && (
        <sup className="ml-px text-[0.72em] font-bold" style={{ color: SIGN_STYLE[s].color }}>
          {SIGN_STYLE[s].arrow}
        </sup>
      )}
    </span>
  );
}

/** A number styled with a variable's sector color; flashes when its value changes. */
export function Num({ k, v, d = 1, sector, className = '' }) {
  const flash = useFlash(v);
  const color = sector ? sectorColor(sector) : k ? varColor(k) : 'inherit';
  return (
    <span
      className={`num-token ${flash ? 'num-flash' : ''} ${className}`}
      style={{ color, '--glow': color }}
      dir="ltr"
    >
      {fmt(v, d)}
    </span>
  );
}

/**
 * Render a string that contains {var} tokens. Arrows ↑ ↓ directly after a token
 * inherit its color. Tokens listed in `active` glow.
 */
/** Render {var} tokens (and ↑ ↓ right after them) inside a run of text. */
function tokens(text, active, prefix) {
  const parts = [];
  const re = /\{([^}]+)\}([↑↓]?)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const key = m[1];
    const arrow = m[2];
    parts.push(
      <span key={`${prefix}${i}`} className="whitespace-nowrap">
        <Var k={key} glow={active.includes(key)} />
        {arrow && (
          <span className="font-bold" style={{ color: varColor(key) }}>
            {arrow}
          </span>
        )}
      </span>,
    );
    i += 1;
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Render a string that contains {var} tokens. Arrows ↑ ↓ directly after a token
 * inherit its color. Tokens listed in `active` glow. A $...$ segment is a math
 * expression: it is kept left-to-right as one unit inside the Hebrew sentence
 * (e.g. "$Δ{G} = Δ{T} > 0$").
 */
export function RichText({ text, active = [], className = '' }) {
  if (!text) return null;
  const segs = text.split('$');
  const parts = segs.map((seg, j) =>
    j % 2 === 1 ? (
      <span key={`m${j}`} dir="ltr" className="whitespace-nowrap font-math" style={{ unicodeBidi: 'isolate' }}>
        {tokens(seg, active, `m${j}-`)}
      </span>
    ) : (
      tokens(seg, active, `s${j}-`)
    ),
  );
  return <span className={className}>{parts}</span>;
}

/** Segmented control. */
export function Segmented({ value, options, onChange, size = 'md', ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex w-full rounded-lg border border-rule bg-paper p-0.5"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            title={o.title}
            className={`flex-1 rounded-md px-2 ${size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'} font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40 ${
              on ? 'bg-white text-ink shadow-sm ring-1 ring-rule' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Directional arrow for transmission chains and sign tables. */
export function DirArrow({ dir, color }) {
  const ch = dir > 0 ? '↑' : dir < 0 ? '↓' : '=';
  return (
    <span className="font-bold" style={{ color }} aria-label={dir > 0 ? 'עולה' : dir < 0 ? 'יורד' : 'ללא שינוי'}>
      {ch}
    </span>
  );
}

export function Panel({ title, icon: Icon, children, aside, className = '', bodyClass = '' }) {
  return (
    <section className={`rounded-xl border border-rule bg-white ${className}`}>
      {(title || aside) && (
        <header className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            {Icon && <Icon size={16} className="text-muted" aria-hidden />}
            {title}
          </h2>
          {aside}
        </header>
      )}
      <div className={bodyClass || 'p-4'}>{children}</div>
    </section>
  );
}
