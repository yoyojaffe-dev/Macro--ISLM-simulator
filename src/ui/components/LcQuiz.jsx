import { useMemo, useState } from 'react';
import { Check, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { LC_QUESTIONS, COURSE_COLUMNS, LC_VARS, signTableKey, compareKey } from '../../engine/index.js';
import { VARS, varColor } from '../theme.js';
import { RichText, Var } from './primitives.jsx';

/** How a learning-center variable is shown: the sheet's symbol, the simulator's color. */
const DISPLAY = {
  i: { k: 'r', label: 'i' },
  TB: { k: 'NX', label: 'TB' },
  E: { k: 'e' },
  e: { k: 'eps' },
  Res: { k: 'Res', label: 'יתרות' },
  MP: { k: 'MP' },
  wP: { k: 'wP' },
};
const VarCell = ({ v }) => {
  const d = DISPLAY[v] || { k: v };
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="w-12 font-math text-[15px] font-bold">
        <Var k={d.k} label={d.label} />
      </span>
      <span className="hidden text-[12px] text-muted sm:inline">{VARS[d.k]?.name}</span>
    </span>
  );
};

const okColor = '#1F7A3A';
const badColor = '#B42318';

function ChoiceButtons({ options, value, onPick, disabled, color, ariaLabel, size = 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[14px]' : 'h-8 w-8 text-[16px]';
  return (
    <div className="flex justify-center gap-1" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onPick(o)}
            className={`${dim} rounded-md border-2 font-math font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink`}
            style={{
              borderColor: on ? color : '#DCE1E8',
              background: on ? `${color}18` : '#fff',
              color: on ? color : '#5B6577',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Verdict({ ok, children }) {
  return (
    <span className="inline-flex items-center gap-1 font-math text-[15px] font-bold" style={{ color: ok ? okColor : badColor }}>
      {children}
      {ok ? <Check size={14} aria-label="נכון" /> : <X size={14} aria-label="שגוי" />}
    </span>
  );
}

function Mcq({ q, answered, onDone }) {
  const [pick, setPick] = useState(null);
  return (
    <div className="space-y-2" role="radiogroup" aria-label="אפשרויות תשובה">
      {q.options.map((o) => {
        const chosen = pick === o.id;
        const tone = answered && o.id === q.answer
          ? 'border-[#1F7A3A] bg-[#ECFDF3]'
          : chosen && answered
            ? 'border-[#B42318] bg-[#FEF3F2]'
            : chosen
              ? 'border-ink bg-paper'
              : 'border-rule bg-white hover:border-ink';
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={answered}
            onClick={() => {
              setPick(o.id);
              onDone(o.id === q.answer ? 1 : 0, 1);
            }}
            className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3 py-2.5 text-right text-[14.5px] leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${tone}`}
          >
            <span className="flex flex-wrap items-baseline gap-2">
              {o.math && (
                <span dir="ltr" className="font-math text-[16px] font-semibold">
                  {o.math}
                </span>
              )}
              {o.text && <span>{o.text}</span>}
            </span>
            {answered && o.id === q.answer && <Check size={18} className="shrink-0 text-[#1F7A3A]" aria-label="תשובה נכונה" />}
            {answered && chosen && o.id !== q.answer && <X size={18} className="shrink-0 text-[#B42318]" aria-label="תשובה שגויה" />}
          </button>
        );
      })}
    </div>
  );
}

function Classify({ q, answered, onDone }) {
  const [g, setG] = useState({});
  const opts = { exo: 'אקסוגני', endo: 'אנדוגני' };
  const complete = q.items.every((it) => g[it.key]);
  return (
    <div>
      <table className="w-full max-w-xl border-collapse text-[14px]">
        <tbody>
          {q.items.map((it) => {
            const ok = g[it.key] === it.answer;
            return (
              <tr key={it.key} className="border-t border-rule">
                <th scope="row" className="py-2 text-right font-normal">
                  <span className="inline-flex items-baseline gap-2">
                    <span className="w-14 font-math text-[15px] font-bold">
                      <Var k={it.key} label={it.label} />
                    </span>
                    <span className="hidden text-[12px] text-muted sm:inline">{VARS[it.key]?.name}</span>
                  </span>
                </th>
                <td className="py-2">
                  <div className="flex justify-end gap-1.5" role="radiogroup" aria-label={`סיווג ${it.label || it.key}`}>
                    {Object.entries(opts).map(([id, label]) => {
                      const on = g[it.key] === id;
                      const showRight = answered && id === it.answer;
                      const showWrong = answered && on && !ok;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          disabled={answered}
                          onClick={() => setG((x) => ({ ...x, [it.key]: id }))}
                          className="rounded-md border-2 px-3 py-1 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                          style={{
                            borderColor: showRight ? okColor : showWrong ? badColor : on ? '#172033' : '#DCE1E8',
                            background: showRight ? '#ECFDF3' : showWrong ? '#FEF3F2' : on ? '#F3F5F8' : '#fff',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!answered && (
        <button
          type="button"
          disabled={!complete}
          onClick={() => onDone(q.items.filter((it) => g[it.key] === it.answer).length, q.items.length)}
          className="mt-4 rounded-lg bg-ink px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          בדקו את הסיווג
        </button>
      )}
    </div>
  );
}

const SIGNS = ['+', '−', '=', '?'];

function SignTable({ q, answered, onDone }) {
  const key = useMemo(() => signTableKey(q), [q]);
  const [g, setG] = useState({});
  const cells = q.vars.flatMap((v) => q.columns.map((c) => `${v}|${c}`));
  const complete = cells.every((id) => g[id]);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-2 text-right font-semibold text-muted">
                המשתנה
              </th>
              {q.columns.map((c) => (
                <th key={c} scope="col" className="px-1 py-2 text-center font-bold text-ink">
                  {COURSE_COLUMNS[c].label}
                  <div className="text-[11px] font-normal text-muted">{COURSE_COLUMNS[c].sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.vars.map((v) => (
              <tr key={v} className="border-t border-rule">
                <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-right font-normal">
                  <VarCell v={v} />
                </th>
                {q.columns.map((c) => {
                  const id = `${v}|${c}`;
                  const right = key[v][c];
                  return (
                    <td key={c} className="px-1 py-1.5 text-center">
                      {answered ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-math text-[13px] text-muted">{g[id]}</span>
                          <Verdict ok={g[id] === right}>{right}</Verdict>
                        </span>
                      ) : (
                        <ChoiceButtons
                          size="sm"
                          options={SIGNS}
                          value={g[id]}
                          onPick={(o) => setG((x) => ({ ...x, [id]: o }))}
                          color={varColor(LC_VARS[v] === 'reservesDelta' ? 'Res' : LC_VARS[v])}
                          ariaLabel={`${v}, ${COURSE_COLUMNS[c].label} ${COURSE_COLUMNS[c].sub}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {answered && <p className="mt-2 text-[12px] text-muted">בכל תא: התשובה שלכם (באפור) והמפתח (בירוק אם צדקתם, באדום אם לא).</p>}
      {!answered && (
        <button
          type="button"
          disabled={!complete}
          onClick={() => onDone(cells.filter((id) => g[id] === key[id.split('|')[0]][id.split('|')[1]]).length, cells.length)}
          className="mt-4 rounded-lg bg-ink px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          בדקו את הטבלה
        </button>
      )}
    </div>
  );
}

function Compare({ q, answered, onDone }) {
  const key = useMemo(() => compareKey(q), [q]);
  const [g, setG] = useState({});
  const cells = q.vars.flatMap((v) => q.steps.map((s) => `${v}@${s.step}`));
  const complete = cells.every((id) => g[id]);
  const REL = q.relOptions || ['<', '=', '>', '?'];
  return (
    <div>
      <p className="mb-2 text-[12.5px] text-muted">
        {q.relHint || (
          <>
            בכל תא בחרו את היחס בין משק א׳ למשק ב׳: <span dir="ltr" className="font-math">א׳ &lt; ב׳</span>, שווים, <span dir="ltr" className="font-math">א׳ &gt; ב׳</span>, או ? אם לא ניתן לדעת.
          </>
        )}
      </p>
      <table className="w-full max-w-2xl border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th scope="col" className="px-2 py-2 text-right font-semibold text-muted">
              משתנה
            </th>
            {q.steps.map((s) => (
              <th key={s.step} scope="col" className="px-2 py-2 text-center font-bold text-ink">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.vars.map((v) => (
            <tr key={v} className="border-t border-rule">
              <th scope="row" className="px-2 py-2 text-right font-normal">
                <VarCell v={v} />
              </th>
              {q.steps.map((s) => {
                const id = `${v}@${s.step}`;
                return (
                  <td key={id} className="px-2 py-2 text-center" dir="ltr">
                    {answered ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-math text-[13px] text-muted">{q.relOptions ? g[id] : `א׳ ${g[id]} ב׳`}</span>
                        <Verdict ok={g[id] === key[id]}>{key[id]}</Verdict>
                      </span>
                    ) : (
                      <ChoiceButtons
                        options={REL}
                        value={g[id]}
                        onPick={(o) => setG((x) => ({ ...x, [id]: o }))}
                        color={varColor(LC_VARS[v] === 'reservesDelta' ? 'Res' : LC_VARS[v] || v)}
                        ariaLabel={`${v}, ${s.label}`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!answered && (
        <button
          type="button"
          disabled={!complete}
          onClick={() => onDone(cells.filter((id) => g[id] === key[id]).length, cells.length)}
          className="mt-4 rounded-lg bg-ink px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          בדקו את ההשוואה
        </button>
      )}
    </div>
  );
}

const CENTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const HEB = { a: '1א', b: '1ב', c: '1ג', d: '1ד', e: '1ה' };
const chipLabel = (q) => {
  if (q.chip) return q.chip;
  const tag = q.id.replace(/^lc\d-?/, '');
  return HEB[tag] || tag;
};

/** Learning-center questions, in order, with a jump list by center. */
export default function LcQuiz({ dispatch, onScore }) {
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState({});
  const q = LC_QUESTIONS[idx];
  const done = answered[q.id];
  const onDone = (got, of) => {
    setAnswered((a) => ({ ...a, [q.id]: { got, of } }));
    onScore(got, of);
  };
  const go = (i) => setIdx(Math.max(0, Math.min(LC_QUESTIONS.length - 1, i)));
  const showSim = () => {
    const sc = q.scenario || (q.type === 'signTable' ? { settings: q.settings, shocks: q.shocks, step: 1 } : null);
    if (sc) dispatch({ type: 'LOAD_SCENARIO', settings: sc.settings, shocks: sc.shocks, params: sc.params, step: sc.step });
  };
  const hasSim = Boolean(q.scenario || q.type === 'signTable');
  const Body = { mcq: Mcq, classify: Classify, signTable: SignTable, compare: Compare }[q.type];

  return (
    <div className="space-y-4">
      <nav aria-label="שאלות לפי מרכז למידה" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {CENTERS.map((cn) => (
          <div key={cn} className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-muted">מרכז {cn}</span>
            {LC_QUESTIONS.map((x, i) =>
              x.center === cn ? (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === idx ? 'true' : undefined}
                  title={x.id}
                  className="h-7 min-w-7 rounded-md border px-1.5 text-[12px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                  style={{
                    borderColor: i === idx ? '#172033' : '#DCE1E8',
                    background: answered[x.id] ? (answered[x.id].got === answered[x.id].of ? '#ECFDF3' : '#FFFAEB') : i === idx ? '#F3F5F8' : '#fff',
                    color: '#172033',
                  }}
                >
                  {chipLabel(x)}
                </button>
              ) : null,
            )}
          </div>
        ))}
      </nav>

      <section className="rounded-xl border border-rule bg-white p-5">
        <p className="text-[15px] font-semibold leading-7 text-ink">
          <RichText text={q.prompt} />
        </p>
        {q.type === 'signTable' && (
          <p className="mt-1 text-[12.5px] leading-5 text-muted">
            שמות הטווחים כמו בקורס ובסימולטור.{' '}
            {q.key
              ? 'המפתח הוא מפתח התשובות של הקורס: ? מסמן תא שהקורס משאיר פתוח.'
              : 'המפתח מחושב על טווח רחב של פרמטרים: ? מסמן כיוון שתלוי בפרמטרים.'}
          </p>
        )}
        <div className="mt-4">
          <Body key={q.id} q={q} answered={Boolean(done)} onDone={onDone} />
        </div>
        {done && (
          <div className="mt-4 rounded-lg bg-paper p-3 text-[14px] leading-7 text-ink">
            <p className="font-bold">
              {done.of === 1 ? (done.got ? 'נכון.' : 'לא בדיוק.') : `${done.got} מתוך ${done.of} נכונים.`}
            </p>
            {q.explanation && (
              <p>
                <RichText text={q.explanation} />
              </p>
            )}
            {hasSim && (
              <button type="button" onClick={showSim} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-ink underline underline-offset-4">
                <Eye size={15} aria-hidden />
                פתחו את התרחיש בסימולטור
              </button>
            )}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between border-t border-rule pt-4">
          <button
            type="button"
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-rule px-3 py-1.5 text-[13.5px] font-semibold text-ink disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            <ChevronRight size={16} aria-hidden />
            השאלה הקודמת
          </button>
          <span className="text-[12px] text-muted">
            {idx + 1} / {LC_QUESTIONS.length}
          </span>
          <button
            type="button"
            onClick={() => go(idx + 1)}
            disabled={idx === LC_QUESTIONS.length - 1}
            className="inline-flex items-center gap-1 rounded-lg border-2 border-ink px-3 py-1.5 text-[13.5px] font-bold text-ink disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          >
            השאלה הבאה
            <ChevronLeft size={16} aria-hidden />
          </button>
        </div>
      </section>
    </div>
  );
}
