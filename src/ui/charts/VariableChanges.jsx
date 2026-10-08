import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { SECTORS, HORIZON_COLORS, STEP_KEYS, VARS } from '../theme.js';
import { Var, Sign } from '../components/primitives.jsx';

/** Variables a student can track, with the snapshot field and display precision. */
const CATALOG = [
  { k: 'Y', d: 1 },
  { k: 'C', d: 1 },
  { k: 'I', d: 1 },
  { k: 'G', d: 1 },
  { k: 'T', d: 1 },
  { k: 'NX', d: 1, when: (s) => s.economy === 'open' },
  { k: 'Ystar', d: 1 },
  { k: 'r', d: 2, unit: 'נק׳ אחוז' },
  { k: 'M', d: 1 },
  { k: 'MP', d: 1 },
  { k: 'P', d: 3 },
  { k: 'w', d: 3 },
  { k: 'wP', d: 3 },
  { k: 'L', d: 1 },
  { k: 'e', d: 3, when: (s) => s.economy === 'open' },
  { k: 'eps', d: 3, when: (s) => s.economy === 'open' },
  { k: 'rStar', d: 2, unit: 'נק׳ אחוז', when: (s) => s.economy === 'open' },
  { k: 'Res', field: 'reservesDelta', d: 1, when: (s) => s.economy === 'open' && s.regime !== 'floating' },
  { k: 'debt', d: 1, when: (s) => s.economy === 'open' },
  { k: 'Yf', d: 1, when: (s) => s.economy === 'open' && s.size === 'large' },
  { k: 'Pstar', d: 3, when: (s) => s.economy === 'open' && s.size === 'large' },
];
const SECTOR_ORDER = ['real', 'fiscal', 'monetary', 'prices', 'open'];
const defaultsFor = (settings) => (settings.economy === 'open' ? ['Y', 'C', 'I', 'NX'] : ['Y', 'C', 'I', 'G']);

/** One variable: the direction of its change from the starting point at each horizon. */
function SignCard({ item, signs, step }) {
  const field = item.field || item.k;
  return (
    <figure className="rounded-lg border border-rule bg-white px-2 pb-2 pt-1.5">
      <figcaption className="flex items-baseline justify-between gap-1">
        <span className="font-math text-[14px] font-bold" dir="ltr">
          Δ<Var k={item.k} />
        </span>
        <span className="truncate text-[11px] text-muted">{VARS[item.k]?.name}</span>
      </figcaption>
      <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
        {STEP_KEYS.slice(1).map((key, i) => {
          const st = i + 1;
          const shown = st <= step;
          return (
            <div key={key} className="rounded-md py-1" style={{ background: shown ? `${HORIZON_COLORS[key]}14` : '#F7F8FA' }}>
              <div className="text-[10.5px] font-bold" style={{ color: shown ? HORIZON_COLORS[key] : '#AAB2C0' }}>
                {{ sr: 'מיידי', mr: 'קצר', lr: 'בינוני' }[key]}
              </div>
              <div className="text-[20px] leading-6">{shown ? <Sign s={signs.origin[st][field]} arrow /> : <span className="text-[#C4CAD4]">·</span>}</div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export default function VariableChanges({ scenario, step }) {
  const { settings } = scenario;
  const available = CATALOG.filter((c) => !c.when || c.when(settings));
  const [picked, setPicked] = useState(() => defaultsFor(settings));
  const [open, setOpen] = useState(false);
  const pop = useRef(null);
  const shown = picked.map((k) => available.find((c) => c.k === k)).filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (pop.current && !pop.current.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <figure data-chart="comp" className="min-w-0 rounded-xl border border-rule bg-white">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule px-3 py-2.5">
        <span className="truncate font-display text-[14px] font-bold leading-tight text-ink">השינוי לעומת מצב המוצא</span>
        <span className="flex h-4 items-center gap-x-3 overflow-hidden whitespace-nowrap text-[11px] text-muted">
          {STEP_KEYS.slice(1).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HORIZON_COLORS[s] }} />
              {{ sr: 'מיידי', mr: 'קצר', lr: 'בינוני' }[s]}
            </span>
          ))}
        </span>
      </figcaption>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-rule px-3 py-2">
        {shown.map((it) => (
          <span key={it.k} className="inline-flex items-center gap-1 rounded-full bg-paper py-0.5 pl-1 pr-2 text-[12px]">
            <span className="font-math font-bold">
              <Var k={it.k} />
            </span>
            <button
              type="button"
              onClick={() => toggle(it.k)}
              className="rounded-full p-0.5 text-muted hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              aria-label={`הסרת ${VARS[it.k]?.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="relative" ref={pop}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#AAB2C0] px-2 py-0.5 text-[12px] font-semibold text-muted hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Plus size={12} aria-hidden />
            הוספת משתנה
          </button>
          {open && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-rule bg-white p-2 shadow-lg" role="dialog" aria-label="בחירת משתנים">
              {SECTOR_ORDER.map((sec) => {
                const items = available.filter((c) => VARS[c.k]?.sector === sec);
                if (!items.length) return null;
                return (
                  <div key={sec} className="mb-1.5">
                    <p className="mb-0.5 text-[11px] font-bold" style={{ color: SECTORS[sec].color }}>
                      {SECTORS[sec].label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {items.map((c) => {
                        const on = picked.includes(c.k);
                        return (
                          <label
                            key={c.k}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[12px]"
                            style={{ borderColor: on ? SECTORS[sec].color : '#DCE1E8', background: on ? `${SECTORS[sec].color}12` : '#fff' }}
                            title={VARS[c.k]?.name}
                          >
                            <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c.k)} />
                            <span className="font-math font-bold">
                              <Var k={c.k} />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="graph-paper p-2">
        {step === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted">
            במצב המוצא אין עדיין שינוי. בחרו זעזוע ולחצו על &quot;התקופה הבאה&quot;.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">בחרו משתנים עם &quot;הוספת משתנה&quot;.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {shown.map((it) => (
              <SignCard key={it.k} item={it} signs={scenario.signs} step={step} />
            ))}
          </div>
        )}
      </div>
      <p className="border-t border-rule px-3 py-1.5 text-[11px] leading-5 text-muted">
        הכיוון של כל משתנה בכל טווח ביחס למצב המוצא. ? = הכיוון תלוי בגודל השינויים או בשיפועים, כמו בפתרונות המבחנים.
      </p>
    </figure>
  );
}
