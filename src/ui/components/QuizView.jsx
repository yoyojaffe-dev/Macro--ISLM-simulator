import { useMemo, useRef, useState } from 'react';
import { Shuffle, Check, X, Eye, Trophy } from 'lucide-react';
import { buildScenario, causeQuestion, predictQuestion, makeRng, DEFAULT_PARAMS } from '../../engine/index.js';
import { VARS, varColor } from '../theme.js';
import { RichText, Segmented, Var } from './primitives.jsx';
import ISLMChart from '../charts/ISLMChart.jsx';
import ADASChart from '../charts/ADASChart.jsx';
import LcQuiz from './LcQuiz.jsx';

const SIGNS = ['+', '−', '=', '?'];
const SIGN_LABEL = { '+': 'עולה', '−': 'יורד', '=': 'ללא שינוי', '?': 'לא ניתן לקבוע' };

function CauseQuestion({ q, onAnswer, answered, onShow }) {
  const scenario = useMemo(() => buildScenario(DEFAULT_PARAMS, q.settings, q.shocks), [q]);
  const [choice, setChoice] = useState(null);
  const pickOption = (o) => {
    if (choice) return;
    setChoice(o);
    onAnswer(o.correct ? 1 : 0, 1);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div>{q.chart === 'islm' ? <ISLMChart scenario={scenario} step={q.step} height={330} title="מה הזיז את העקומה?" /> : <ADASChart scenario={scenario} step={q.step} height={330} title="מה הזיז את שיווי המשקל?" />}</div>
      <div>
        <p className="text-[15px] font-semibold leading-7 text-ink">
          <RichText text={q.prompt} />
        </p>
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="אפשרויות תשובה">
          {q.options.map((o) => {
            const chosen = choice?.key === o.key;
            const reveal = Boolean(choice);
            const tone = reveal && o.correct ? 'border-[#1F7A3A] bg-[#ECFDF3]' : chosen && !o.correct ? 'border-[#B42318] bg-[#FEF3F2]' : 'border-rule bg-white hover:border-ink';
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={reveal}
                onClick={() => pickOption(o)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3 py-2.5 text-right text-[14px] leading-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${tone}`}
              >
                <RichText text={o.text} />
                {reveal && o.correct && <Check size={18} className="shrink-0 text-[#1F7A3A]" aria-label="תשובה נכונה" />}
                {chosen && !o.correct && <X size={18} className="shrink-0 text-[#B42318]" aria-label="תשובה שגויה" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="mt-4 rounded-lg bg-paper p-3 text-[14px] leading-7 text-ink">
            <p className="font-bold">{choice?.correct ? 'נכון.' : 'לא בדיוק.'}</p>
            <p>
              <RichText text={q.explanation} />
            </p>
            <p className="mt-1 text-[12.5px] text-muted">
              שימו לב: יש זעזועים נוספים שמזיזים את אותה עקומה לאותו כיוון. מהגרף לבדו אי אפשר להבחין ביניהם.
            </p>
            <button type="button" onClick={onShow} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-ink underline underline-offset-4">
              <Eye size={15} aria-hidden />
              פתחו את התרחיש בסימולטור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PredictQuestion({ q, onAnswer, answered, onShow }) {
  const [guess, setGuess] = useState({});
  const complete = q.vars.every((v) => guess[v]);
  const check = () => {
    const correct = q.vars.filter((v) => guess[v] === q.key[v]).length;
    onAnswer(correct, q.vars.length);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <div className="rounded-lg bg-paper p-3">
          <p className="text-[12px] font-semibold text-muted">המשק</p>
          <p className="text-[14.5px] font-semibold text-ink">{q.contextLabel}</p>
          <p className="mt-0.5 text-[12px] text-muted">מצב מוצא: שיווי משקל בתעסוקה מלאה (Y = Y*)</p>
        </div>
        <div className="rounded-lg bg-paper p-3">
          <p className="text-[12px] font-semibold text-muted">הזעזוע</p>
          <p className="text-[14.5px] font-semibold text-ink">{q.shockText}</p>
        </div>
        <div className="rounded-lg border-2 border-ink p-3">
          <p className="text-[12px] font-semibold text-muted">מה משווים</p>
          <p className="text-[15px] font-bold text-ink">{q.comparison.label}</p>
        </div>
        <p className="text-[12.5px] leading-5 text-muted">
          סמנו לכל משתנה: עולה (+), יורד (−), ללא שינוי (=), או לא ניתן לקבוע (?). מפתח התשובות מחושב על כל טווח סביר של הפרמטרים: אם הכיוון תלוי בפרמטרים, התשובה היא ?.
        </p>
      </div>
      <div>
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-[12px] text-muted">
              <th scope="col" className="py-1 text-right font-semibold">
                משתנה
              </th>
              <th scope="col" className="py-1 text-center font-semibold">
                התחזית שלכם
              </th>
              {answered && (
                <th scope="col" className="py-1 text-center font-semibold">
                  מפתח
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {q.vars.map((v) => {
              const ok = answered && guess[v] === q.key[v];
              return (
                <tr key={v} className="border-t border-rule">
                  <th scope="row" className="py-2 text-right font-normal">
                    <span className="inline-flex items-baseline gap-2">
                      <span className="w-10 font-math text-[16px] font-bold">
                        <Var k={v} />
                      </span>
                      <span className="text-[12px] text-muted">{VARS[v].name}</span>
                    </span>
                  </th>
                  <td className="py-2">
                    <div className="flex justify-center gap-1" role="radiogroup" aria-label={`תחזית עבור ${VARS[v].name}`}>
                      {SIGNS.map((sg) => {
                        const on = guess[v] === sg;
                        return (
                          <button
                            key={sg}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={SIGN_LABEL[sg]}
                            disabled={answered}
                            onClick={() => setGuess((g) => ({ ...g, [v]: sg }))}
                            className="h-8 w-8 rounded-md border-2 font-math text-[16px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
                            style={{
                              borderColor: on ? varColor(v) : '#DCE1E8',
                              background: on ? `${varColor(v)}18` : '#fff',
                              color: on ? varColor(v) : '#5B6577',
                            }}
                          >
                            {sg}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  {answered && (
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center gap-1 font-math text-[16px] font-bold ${ok ? 'text-[#1F7A3A]' : 'text-[#B42318]'}`}>
                        {q.key[v]}
                        {ok ? <Check size={15} aria-label="נכון" /> : <X size={15} aria-label="שגוי" />}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!answered ? (
          <button
            type="button"
            disabled={!complete}
            onClick={check}
            className="mt-4 w-full rounded-lg bg-ink px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            בדקו את התחזית
          </button>
        ) : (
          <button type="button" onClick={onShow} className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-ink underline underline-offset-4">
            <Eye size={15} aria-hidden />
            ראו את התהליך צעד אחר צעד בסימולטור
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuizView({ dispatch }) {
  const rng = useRef(makeRng(Date.now()));
  const [kind, setKind] = useState('cause');
  const [q, setQ] = useState(() => causeQuestion(rng.current));
  const [qid, setQid] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState({ got: 0, of: 0 });

  const next = (k = kind) => {
    setQ(k === 'cause' ? causeQuestion(rng.current) : predictQuestion(rng.current));
    setQid((i) => i + 1);
    setAnswered(false);
  };
  const switchKind = (k) => {
    setKind(k);
    if (k !== 'lc') next(k);
  };
  const addScore = (got, of) => setScore((s) => ({ got: s.got + got, of: s.of + of }));
  const onAnswer = (got, of) => {
    setAnswered(true);
    setScore((s) => ({ got: s.got + got, of: s.of + of }));
  };
  const onShow = () =>
    dispatch({
      type: 'LOAD_SCENARIO',
      settings: q.settings,
      shocks: q.shocks,
      step: q.type === 'cause' ? q.step : q.comparison.to,
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-[26px] font-bold leading-tight text-ink">בחנו את עצמכם</h1>
          <p className="mt-2 text-[14.5px] leading-7 text-muted">
            שלושה סוגי שאלות: לזהות מה הזיז את העקומות, לחזות את כיוון המשתנים לפני שרואים את התוצאה, ושאלות מתוך מרכזי הלמידה 1–8 של הקורס.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[13px] font-bold text-ink ring-1 ring-rule" aria-live="polite">
            <Trophy size={15} className="text-[#B54708]" aria-hidden />
            {score.got}/{score.of}
          </span>
          <div className="w-[22rem] max-w-full">
            <Segmented
              ariaLabel="סוג שאלה"
              size="sm"
              value={kind}
              onChange={switchKind}
              options={[
                { value: 'cause', label: 'זהו את הגורם' },
                { value: 'predict', label: 'חזו את התוצאה' },
                { value: 'lc', label: 'מרכזי למידה' },
              ]}
            />
          </div>
        </div>
      </div>
      {kind === 'lc' ? (
        <LcQuiz dispatch={dispatch} onScore={addScore} />
      ) : (
      <section className="rounded-xl border border-rule bg-white p-5">
        {q.type === 'cause' ? (
          <CauseQuestion key={qid} q={q} onAnswer={onAnswer} answered={answered} onShow={onShow} />
        ) : (
          <PredictQuestion key={qid} q={q} onAnswer={onAnswer} answered={answered} onShow={onShow} />
        )}
        <div className="mt-5 flex justify-end border-t border-rule pt-4">
          <button
            type="button"
            onClick={() => next()}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-ink px-4 py-2 text-[14px] font-bold text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Shuffle size={16} aria-hidden />
            {answered ? 'לשאלה הבאה' : 'דלגו לשאלה אחרת'}
          </button>
        </div>
      </section>
      )}
    </div>
  );
}
