import { useState } from 'react';
import { Landmark, Coins, Users, Briefcase, Globe, Flag, Repeat, SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { SHOCK_DEFS, PARAM_DEFS, ASSUMPTION_DEFS, RULES } from '../../engine/index.js';
import { SECTORS, fmt } from '../theme.js';
import { Segmented } from './primitives.jsx';

/** Shock groups, in the order a question usually lists them. */
const GROUPS = [
  { id: 'fiscal', title: 'הממשלה', icon: Landmark },
  { id: 'monetary', title: 'הבנק המרכזי ושוק הכסף', icon: Coins },
  { id: 'fx', title: 'מדיניות שער החליפין', icon: Repeat },
  { id: 'private', title: 'הציבור', icon: Users },
  { id: 'supply', title: 'שוק העבודה', icon: Briefcase },
  { id: 'open', title: 'העולם', icon: Globe },
  { id: 'world', title: 'המשק הזר', icon: Flag },
];

/** Shocks offered in the panel: those the course uses (A and K are held fixed in the course). */
export const courseShocks = (settings) => SHOCK_DEFS.filter((d) => d.inCourse !== false && d.applies(settings));

function Slider({ id, label, sym, sector, value, min, max, step, unit, digits, onChange, hint, signed, disabled, words }) {
  const color = SECTORS[sector].color;
  const active = signed && value !== 0;
  const pct = ((0 - min) / (max - min)) * 100;
  return (
    <div className={`group rounded-lg px-2 py-1.5 ${active ? 'bg-paper' : ''} ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`sl-${id}`} className="flex items-baseline gap-1.5 text-[13px] font-semibold text-ink">
          <span className="font-math text-[15px] font-bold" style={{ color }} dir="ltr">
            {sym}
          </span>
          <span>{label}</span>
        </label>
        <span className="flex items-center gap-1">
          {words ? (
            <span className="text-[11.5px] text-muted">
              {value <= min + (max - min) / 3 ? words[0] : value >= max - (max - min) / 3 ? words[2] : words[1]}
            </span>
          ) : (
            <span className="font-math text-[13px] font-bold tabular-nums" style={{ color: active || !signed ? color : '#9AA3B2' }} dir="ltr">
              {signed && value > 0 ? '+' : ''}
              {fmt(value, digits ?? 0)}
              {unit}
            </span>
          )}
          {active && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="rounded px-1 text-[11px] text-muted hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              aria-label={`אפס את ${label}`}
            >
              איפוס
            </button>
          )}
        </span>
      </div>
      <div className="relative mt-1" dir="ltr">
        {signed && <span aria-hidden className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[#AAB2C0]" style={{ left: `${pct}%` }} />}
        <input
          id={`sl-${id}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range w-full"
          style={{ accentColor: color, '--track': color }}
        />
      </div>
      {hint && <p className="mt-0.5 text-[11.5px] leading-4 text-muted">{hint}</p>}
    </div>
  );
}

export default function ControlPanel({ state, dispatch }) {
  const { settings, shocks, params } = state;
  const open = settings.economy === 'open';
  const large = open && settings.size === 'large';
  const set = (key) => (value) => dispatch({ type: 'SET_SETTING', key, value });
  const defs = courseShocks(settings);
  const active = defs.filter((d) => shocks[d.id]);
  const assumedOn = ASSUMPTION_DEFS.filter((d) => settings.assume?.[d.id] && d.applies(settings));
  const economyValue = !open ? 'closed' : large ? 'large' : 'small';
  const [showAssume, setShowAssume] = useState(assumedOn.length > 0);
  const setEconomy = (v) => {
    dispatch({ type: 'SET_SETTING', key: 'economy', value: v === 'closed' ? 'closed' : 'open' });
    if (v !== 'closed') dispatch({ type: 'SET_SETTING', key: 'size', value: v });
  };

  return (
    <div className="space-y-3">
      {/* 1. The economy */}
      <section className="rounded-xl border border-rule bg-white p-4" aria-labelledby="cp-economy">
        <h2 id="cp-economy" className="font-display text-[15px] font-bold text-ink">
          <span className="ml-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-white">1</span>
          המשק
        </h2>
        <div className="mt-3 space-y-3">
          <Segmented
            ariaLabel="סוג המשק"
            value={economyValue}
            onChange={setEconomy}
            options={[
              { value: 'closed', label: 'משק סגור' },
              { value: 'small', label: 'משק קטן ופתוח' },
              { value: 'large', label: 'שתי כלכלות', title: 'עולם של שני משקים (הרצאה 12): המדיניות שלנו משפיעה על הריבית העולמית' },
            ]}
          />
          {open && (
            <div>
              <p className="mb-1 text-[12.5px] font-semibold text-ink">משטר שער החליפין</p>
              <Segmented
                ariaLabel="משטר שער החליפין"
                value={settings.regime}
                onChange={set('regime')}
                options={[
                  { value: 'floating', label: 'נייד' },
                  { value: 'fixed', label: 'קבוע' },
                  ...(large ? [] : [{ value: 'band', label: 'רצועת ניוד', title: 'שע״ח נע בחופשיות בתוך רצועה; בקצה הבנק המרכזי מתערב' }]),
                ]}
              />
              {settings.regime === 'band' && (
                <div className="mt-2 space-y-2 rounded-lg bg-paper p-2">
                  <p className="text-[12px] leading-5 text-muted">בתוך הרצועה המשק מתנהג כמו בשע״ח נייד, ובקצה שלה כמו בשע״ח קבוע (מרכז למידה 7).</p>
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-ink">שע״ח במצב המוצא</p>
                    <Segmented
                      ariaLabel="מיקום שער החליפין במוצא"
                      size="sm"
                      value={settings.bandStart || 'inside'}
                      onChange={set('bandStart')}
                      options={[
                        { value: 'inside', label: 'בתוך הרצועה' },
                        { value: 'low', label: 'בגבול התחתון' },
                        { value: 'high', label: 'בגבול העליון' },
                      ]}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-ink">סוג הרצועה</p>
                    <Segmented
                      ariaLabel="סוג הרצועה"
                      size="sm"
                      value={settings.bandType || 'two'}
                      onChange={set('bandType')}
                      options={[
                        { value: 'two', label: 'דו-צדדית' },
                        { value: 'floor', label: 'רצפה בלבד', title: 'הבנק מונע רק ייסוף מתחת לגבול התחתון' },
                        { value: 'ceiling', label: 'תקרה בלבד', title: 'הבנק מונע רק פיחות מעל הגבול העליון' },
                      ]}
                    />
                  </div>
                </div>
              )}
              <p className="mt-1.5 text-[12px] leading-5 text-muted">ניידות הון מלאה, כמו בקורס.</p>
            </div>
          )}
        </div>
      </section>

      {/* 2. What changed */}
      <section className="rounded-xl border border-rule bg-white p-4" aria-labelledby="cp-shocks">
        <div className="flex items-center justify-between gap-2">
          <h2 id="cp-shocks" className="font-display text-[15px] font-bold text-ink">
            <span className="ml-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-white">2</span>
            מה השתנה?
          </h2>
          {active.length > 0 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_SHOCKS' })}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-semibold text-muted hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              <RotateCcw size={13} aria-hidden />
              אפס הכול
            </button>
          )}
        </div>
        <p className="mt-1 text-[12.5px] leading-5 text-muted">בחרו רק כיוון: ↑ עולה, ↓ יורד. גודל השינוי לא ידוע, כמו בשאלות.</p>
        {active.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="השינויים שנבחרו">
            {active.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_DIR', id: d.id, dir: 0 })}
                  className="inline-flex items-center gap-1 rounded-full bg-paper py-0.5 pl-1.5 pr-2.5 text-[13px] font-bold ring-1 ring-rule hover:ring-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                  aria-label={`הסרת ${d.label}`}
                >
                  <span className="font-math" style={{ color: SECTORS[d.sector].color }} dir="ltr">
                    {d.sym}
                    {shocks[d.id] > 0 ? '↑' : '↓'}
                  </span>
                  <X size={12} className="text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {state.rules.length > 0 && (
          <p className="mt-2 rounded-md bg-paper px-2 py-1.5 text-[12px] leading-5 text-ink">
            נקבע לפי כלל במקרה הבוחן: {state.rules.map((k) => RULES[k]?.label).filter(Boolean).join('; ')}.
          </p>
        )}
        {state.fixedSizes && active.length > 0 && (
          <p className="mt-2 rounded-md bg-paper px-2 py-1.5 text-[12px] leading-5 text-ink">
            גודל השינויים נתון בתרחיש שנטען.{' '}
            <button type="button" onClick={() => dispatch({ type: 'FREE_SIZES' })} className="font-bold underline underline-offset-2">
              לבחון כל גודל אפשרי
            </button>
          </p>
        )}
        <div className="mt-2 space-y-2.5">
          {GROUPS.map((g) => {
            const list = defs.filter((d) => d.group === g.id);
            if (!list.length) return null;
            const Icon = g.icon;
            return (
              <fieldset key={g.id}>
                <legend className="mb-0.5 flex items-center gap-1.5 text-[12px] font-bold text-muted">
                  <Icon size={14} aria-hidden />
                  {g.title}
                </legend>
                {list.map((d) => (
                  <DirControl key={d.id} def={d} value={shocks[d.id]} onChange={(dir) => dispatch({ type: 'SET_DIR', id: d.id, dir })} />
                ))}
              </fieldset>
            );
          })}
        </div>
      </section>

      {/* 3. Alternative assumptions (exam variants) */}
      <details className="group rounded-xl border border-rule bg-white" open={showAssume || assumedOn.length > 0} onToggle={(e) => setShowAssume(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">
          <span className="font-display text-[15px] font-bold text-ink">
            <span className="ml-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-white">3</span>
            הנחות חלופיות
            {assumedOn.length > 0 && <span className="mr-2 rounded-full bg-[#B54708] px-1.5 text-[11px] text-white">{assumedOn.length}</span>}
          </span>
          <span className="text-[12px] text-muted group-open:hidden">הצגה</span>
          <span className="hidden text-[12px] text-muted group-open:inline">הסתרה</span>
        </summary>
        <div className="border-t border-rule px-4 pb-3 pt-2">
          <p className="text-[12px] leading-5 text-muted">
            המודל של הקורס: AS אופקית בטווח המיידי, עולה בקצר ואנכית בבינוני. כששאלה אומרת &quot;נניח כי…&quot;, סמנו את ההנחה.
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {ASSUMPTION_DEFS.map((d) => {
              const ok = d.applies(settings);
              const on = Boolean(settings.assume?.[d.id]) && ok;
              return (
                <li key={d.id}>
                  <label className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 ${on ? 'bg-paper' : ''} ${ok ? '' : 'cursor-not-allowed opacity-40'}`}>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#172033]"
                      checked={on}
                      disabled={!ok}
                      onChange={(e) => dispatch({ type: 'SET_ASSUME', id: d.id, value: e.target.checked })}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{d.label}</span>
                      <span className="block font-math text-[12px] text-muted" dir="ltr" style={{ textAlign: 'right' }}>
                        {d.formula}
                      </span>
                      {on && <span className="mt-0.5 block text-[11.5px] leading-5 text-muted">{d.hint}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </details>

      {/* Advanced: drawing shape and extensions beyond the course */}
      <details className="group rounded-xl border border-rule bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">
          <span className="flex items-center gap-1.5 font-display text-[15px] font-bold text-ink">
            <SlidersHorizontal size={15} className="text-muted" aria-hidden />
            מתקדם: צורת העקומות
          </span>
          <span className="text-[12px] text-muted group-open:hidden">הצגה</span>
          <span className="hidden text-[12px] text-muted group-open:inline">הסתרה</span>
        </summary>
        <div className="border-t border-rule px-4 pb-3 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] leading-5 text-muted">
              c, b, h, k, m ו-n משנים רק את הציור: הסימנים מחושבים לכל השיפועים האפשריים. שיעור המס, δ, cᵢ, β, רוחב הרצועה והגודל היחסי של המשקים משפיעים גם על הסימנים. הסימולטור שומר על c(1 − t) + δ + β {'<'} 1 כדי שהמכפיל יהיה סופי.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_PARAMS' })}
              className="shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-muted hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              ברירת מחדל
            </button>
          </div>
          <div className="mt-1 space-y-1">
            {PARAM_DEFS.filter(
              (p) =>
                p.economies.includes(settings.economy) &&
                (!p.sizes || p.sizes.includes(large ? 'large' : 'small')) &&
                (!p.regimes || p.regimes.includes(settings.regime)) &&
                (!p.assume || settings.assume?.[p.assume]) &&
                (!p.mobility || p.mobility.includes(settings.mobility)),
            ).map((p) => (
              <Slider
                key={p.id}
                id={p.id}
                label={p.label}
                sym={p.sym}
                sector={p.sector}
                value={params[p.id]}
                min={open && p.minOpen != null ? p.minOpen : p.min}
                max={p.max}
                step={p.step}
                digits={p.digits}
                words={p.words || ['נמוכה', 'בינונית', 'גבוהה']}
                hint={p.hint}
                onChange={(value) => dispatch({ type: 'SET_PARAM', id: p.id, value })}
              />
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

/**
 * Direction of one shock: ↓, none, ↑. A radio group with roving focus, so the
 * arrow keys move between the three options.
 */
function DirControl({ def, value, onChange }) {
  const color = SECTORS[def.sector].color;
  const dir = Math.sign(value || 0);
  const opts = [
    { v: -1, ch: '↓', text: 'יורד' },
    { v: 0, ch: '–', text: 'ללא שינוי' },
    { v: 1, ch: '↑', text: 'עולה' },
  ];
  const onKey = (e) => {
    const i = opts.findIndex((o) => o.v === dir);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(opts[Math.min(2, i + 1)].v);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(opts[Math.max(0, i - 1)].v);
    }
  };
  const hintId = `hint-${def.id}`;
  return (
    <div className={`rounded-lg px-2 py-1 ${dir ? 'bg-paper' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span id={`lbl-${def.id}`} className="flex min-w-0 items-baseline gap-1.5 text-[13.5px] font-semibold text-ink">
          <span className="font-math text-[15px] font-bold" style={{ color }} dir="ltr">
            {def.sym}
          </span>
          <span>{def.label}</span>
        </span>
        <span
          role="radiogroup"
          aria-labelledby={`lbl-${def.id}`}
          aria-describedby={def.hint ? hintId : undefined}
          onKeyDown={onKey}
          className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-rule"
          dir="ltr"
        >
          {opts.map((o) => {
            const on = dir === o.v;
            return (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={o.text}
                tabIndex={on ? 0 : -1}
                data-dir={`${def.id}:${o.v}`}
                onClick={() => onChange(o.v)}
                className="h-8 w-9 text-[16px] font-bold focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                style={{ background: on ? (o.v ? color : '#5B6577') : '#fff', color: on ? '#fff' : '#5B6577' }}
              >
                {o.ch}
              </button>
            );
          })}
        </span>
      </div>
      {def.hint && (
        <p id={hintId} className={`mt-0.5 text-[11.5px] leading-4 text-muted ${dir ? '' : 'sr-only'}`}>
          {def.hint}
        </p>
      )}
    </div>
  );
}
