import { Table } from 'lucide-react';
import { HORIZONS } from '../../engine/index.js';
import { HORIZON_COLORS, VARS } from '../theme.js';
import { Var, Sign } from './primitives.jsx';

const ROWS = [
  { k: 'Y' },
  { k: 'Ystar' },
  { k: 'C' },
  { k: 'I' },
  { k: 'G' },
  { k: 'T' },
  { k: 'NX', open: true },
  { k: 'r' },
  { k: 'M' },
  { k: 'MP' },
  { k: 'P' },
  { k: 'w' },
  { k: 'wP' },
  { k: 'L' },
  { k: 'e', open: true },
  { k: 'eps', open: true },
  { k: 'reservesDelta', label: 'Res', fixedOnly: true },
  { k: 'debt', open: true },
  { k: 'rStar', open: true },
  { k: 'Yf', large: true },
  { k: 'Pstar', large: true },
];

/** The columns of the course's tables: each horizon vs. the previous one and vs. the origin. */
const COLUMNS = [
  { step: 1, base: 'origin', label: 'מיידי', sub: 'ביחס למוצא' },
  { step: 2, base: 'prev', label: 'קצר', sub: 'ביחס למיידי' },
  { step: 2, base: 'origin', label: 'קצר', sub: 'ביחס למוצא' },
  { step: 3, base: 'prev', label: 'בינוני', sub: 'ביחס לקצר' },
  { step: 3, base: 'origin', label: 'בינוני', sub: 'ביחס למוצא' },
];

/**
 * Sign table in the format of the exercises and exams (+ − = ?). Signs hold
 * for every admissible slope and every relative size of the shocks; "?" means
 * the direction depends on them.
 */
export default function VariablesTable({ scenario, step }) {
  const { settings, signs } = scenario;
  const open = settings.economy === 'open';
  const fixed = open && (settings.regime === 'fixed' || settings.regime === 'band');
  const large = open && settings.size === 'large';
  const rows = ROWS.filter((r) => (!r.open || open) && (!r.fixedOnly || fixed) && (!r.large || large));
  return (
    <section className="rounded-xl border border-rule bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <Table size={16} className="text-muted" aria-hidden />
          טבלת הסימנים
        </h2>
        <span className="text-[11.5px] text-muted">+ עולה, − יורד, = ללא שינוי, ? תלוי בגודל השינויים או בשיפועים</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="text-[12px]">
              <th scope="col" className="px-3 py-2 text-right font-semibold text-muted">
                משתנה
              </th>
              {COLUMNS.map((c, i) => {
                const key = HORIZONS[c.step].key;
                const shown = c.step <= step;
                return (
                  <th
                    key={i}
                    scope="col"
                    className="px-2 py-2 text-center font-bold"
                    style={{
                      color: shown ? HORIZON_COLORS[key] : '#AAB2C0',
                      boxShadow: c.step === step ? `inset 0 -3px 0 ${HORIZON_COLORS[key]}` : 'none',
                    }}
                  >
                    {c.label}
                    <div className="text-[10.5px] font-normal text-muted">{c.sub}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = row.label || row.k;
              return (
                <tr key={row.k} className="border-t border-rule">
                  <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-right font-normal">
                    <span className="inline-flex items-baseline gap-2">
                      <span className="w-9 font-math text-[15px] font-bold">
                        <Var k={key} />
                      </span>
                      <span className="text-[12px] text-muted">{VARS[key]?.name}</span>
                    </span>
                  </th>
                  {COLUMNS.map((c, i) => {
                    const shown = c.step <= step;
                    const noEq = signs.noEq[c.step] === 'all';
                    const bg = c.step === step ? `${HORIZON_COLORS[HORIZONS[c.step].key]}0D` : 'transparent';
                    return (
                      <td key={i} className="px-2 py-1.5 text-center text-[15px]" style={{ background: bg }}>
                        {!shown ? (
                          <span className="text-[#C4CAD4]">·</span>
                        ) : noEq ? (
                          <span className="text-[11px] text-muted" title="אין שיווי משקל בטווח הזה">אין ש״מ</span>
                        ) : (
                          <Sign s={signs[c.base][c.step][row.k]} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TableNotes signs={signs} step={step} />
    </section>
  );
}

/** Caveats about the realizations behind the signs. */
function TableNotes({ signs, step }) {
  const partial = [1, 2, 3].filter((st) => st <= step && signs.noEq[st] === 'some');
  const notes = [];
  if (partial.length) {
    notes.push(
      `${partial.map((st) => HORIZONS[st].inLabel).join(', ')}: בחלק מהשיפועים אין שיווי משקל (למשל מלכודת נזילות). הסימנים מתייחסים למקרים שבהם יש.`,
    );
  }
  if (signs.trapSome && step > 0) {
    notes.push('זעזועים גדולים במיוחד מורידים את הריבית לרצפת האפס. מלכודת נזילות היא מקרה נפרד בקורס (הרצאה 5), ולכן המקרים האלה לא נכללים בסימנים.');
  }
  if (!notes.length) return null;
  return (
    <div className="space-y-1 border-t border-rule px-4 py-2 text-[11.5px] leading-5 text-muted">
      {notes.map((t) => (
        <p key={t}>{t}</p>
      ))}
    </div>
  );
}
