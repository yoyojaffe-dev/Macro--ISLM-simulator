import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Library, GraduationCap, Bug } from 'lucide-react';
import { SECTORS, HORIZON_COLORS } from '../theme.js';
import { AlertCard } from './Transmission.jsx';

/** Pops up errors and warnings the first time they appear for a given step. */
export function AlertToasts({ alerts, step }) {
  const seen = useRef(new Set());
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const fresh = alerts.filter((a) => (a.level === 'error' || a.level === 'warning') && !seen.current.has(`${a.id}@${step}`));
    if (!fresh.length) return;
    fresh.forEach((a) => seen.current.add(`${a.id}@${step}`));
    setToasts((t) => [...t, ...fresh.map((a) => ({ key: `${a.id}@${step}@${Date.now()}`, alert: a }))].slice(-3));
  }, [alerts, step]);
  useEffect(() => {
    if (!toasts.length) return undefined;
    const t = setTimeout(() => setToasts((list) => list.slice(1)), 9000);
    return () => clearTimeout(t);
  }, [toasts]);
  // Allow an alert to pop again after the user changes the scenario substantially.
  useEffect(() => {
    const ids = new Set(alerts.map((a) => `${a.id}@${step}`));
    for (const k of [...seen.current]) if (!ids.has(k) && k.endsWith(`@${step}`)) seen.current.delete(k);
  }, [alerts, step]);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.key} className="toast-in pointer-events-auto rounded-lg shadow-lg">
          <AlertCard alert={t.alert} compact onClose={() => setToasts((list) => list.filter((x) => x.key !== t.key))} />
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'sim', label: 'סימולטור', icon: FlaskConical },
  { id: 'cases', label: 'מקרי בוחן', icon: Library },
  { id: 'quiz', label: 'בחנו את עצמכם', icon: GraduationCap },
];

export function Header({ mode, dispatch, alertCount }) {
  return (
    <header className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-[1880px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-3 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="shrink-0">
            <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="#F3F5F8" stroke="#DCE1E8" />
            <path d="M8 31 L8 8 M8 31 L32 31" stroke="#172033" strokeWidth="1.6" />
            <path d="M11 11 Q20 24 31 27" fill="none" stroke={SECTORS.fiscal.color} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M11 27 Q22 22 31 11" fill="none" stroke={SECTORS.monetary.color} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="20.6" cy="20.3" r="2.6" fill={HORIZON_COLORS.sr} />
          </svg>
          <div>
            <p className="font-display text-[21px] font-bold leading-tight text-ink">מעבדת המאקרו</p>
            <p className="text-[12.5px] text-muted">סימולטור IS-LM, AD-AS ומנדל-פלמינג למאקרו כלכלה א׳</p>
          </div>
        </div>
        <nav aria-label="מצבי עבודה" className="flex items-center gap-1 rounded-xl bg-paper p-1">
          {TABS.map((t) => {
            const on = mode === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_MODE', mode: t.id })}
                aria-current={on ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink ${
                  on ? 'bg-white text-ink shadow-sm ring-1 ring-rule' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={15} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>
        {mode === 'sim' && (
          <a
            href="#debugger"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-muted hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Bug size={15} aria-hidden />
            דיבאגר
            {alertCount > 0 && (
              <span className="rounded-full bg-[#B54708] px-1.5 text-[11px] font-bold text-white">{alertCount}</span>
            )}
          </a>
        )}
      </div>
    </header>
  );
}

/** Explains the dual color system in one strip. */
export function ColorKey() {
  const horizons = [
    ['t0', 'מוצא'],
    ['sr', 'מיידי'],
    ['mr', 'קצר'],
    ['lr', 'בינוני'],
  ];
  const sectors = [
    ['fiscal', 'G, T, IS'],
    ['monetary', 'M, i, LM'],
    ['prices', 'P, W, AS'],
    ['real', 'Y, C, I, AD'],
    ['open', 'TB, E, e, CM'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-rule bg-white px-4 py-2.5 text-[12px]">
      <span className="font-bold text-muted">צבע עקומה ומשתנה = תחום</span>
      {sectors.map(([k, vars]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SECTORS[k].color }} />
          <span className="text-ink">{SECTORS[k].label}</span>
          <span dir="ltr" className="font-math font-bold" style={{ color: SECTORS[k].color }}>
            {vars}
          </span>
        </span>
      ))}
      <span className="mx-1 hidden h-4 w-px bg-rule md:inline-block" aria-hidden />
      <span className="font-bold text-muted">צבע נקודה וחץ = זמן</span>
      {horizons.map(([k, l]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HORIZON_COLORS[k] }} />
          <span className="text-ink">{l}</span>
        </span>
      ))}
    </div>
  );
}
