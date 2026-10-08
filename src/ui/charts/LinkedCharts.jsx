import { HORIZONS, vectorKey } from '../../engine/index.js';
import { HORIZON_COLORS, STEP_KEYS } from '../theme.js';
import { RichText, Var, Sign } from '../components/primitives.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import ISLMChart from './ISLMChart.jsx';
import ADASChart from './ADASChart.jsx';
import { MoneyMarketChart } from './MarketCharts.jsx';
import LaborChart from './LaborChart.jsx';
import VariableChanges from './VariableChanges.jsx';
import ForeignChart from './ForeignChart.jsx';
import FxMarketChart from './FxMarketChart.jsx';

/**
 * The four linked diagrams as a square. The page is RTL, so the first grid
 * column is on the right:
 *
 *     ┌──────────────┬──────────────┐
 *     │    IS-LM     │ money market │   same i axis → read i across
 *     ├──────────────┼──────────────┤
 *     │    AD-AS     │ labor market │   same Y axis → read Y down
 *     └──────────────┴──────────────┘
 *     │      Δ vs. origin (wide)    │
 *
 * A short reading guide sits above the square. In a two-economy world the
 * world links and the foreign IS*-LM* follow the changes panel.
 */
const CHART_H = 320;

export default function LinkedCharts({ scenario, step, dispatch }) {
  const cur = scenario.snapshots[step];
  const color = HORIZON_COLORS[STEP_KEYS[step]];
  const zlb = cur.zlb;
  const large = scenario.settings.economy === 'open' && scenario.settings.size === 'large';
  return (
    <section aria-label="הגרפים המקושרים" className="space-y-3">
      <ReadingGuide cur={cur} step={step} color={color} zlb={zlb} signs={scenario.signs} />
      {scenario.cases.length > 1 && <CasePicker scenario={scenario} step={step} dispatch={dispatch} />}
      <div className="linked-grid grid gap-3">
        <div className="[grid-area:islm]">
          <ErrorBoundary label="גרף IS-LM" resetKey={step}>
            <ISLMChart scenario={scenario} step={step} height={CHART_H} />
          </ErrorBoundary>
        </div>
        <div className="[grid-area:money]">
          <ErrorBoundary label="שוק הכסף" resetKey={step}>
            <MoneyMarketChart scenario={scenario} step={step} height={CHART_H} />
          </ErrorBoundary>
        </div>
        <div className="[grid-area:adas]">
          <ErrorBoundary label="גרף AD-AS" resetKey={step}>
            <ADASChart scenario={scenario} step={step} height={CHART_H} />
          </ErrorBoundary>
        </div>
        <div className="[grid-area:labor]">
          <ErrorBoundary label="שוק העבודה" resetKey={step}>
            <LaborChart scenario={scenario} step={step} height={CHART_H} />
          </ErrorBoundary>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-muted">
        <span>
          הצירים המשותפים מיושרים: <Var k="r" /> בשורה העליונה, <Var k="Y" /> בטור הימני. טווחי הצירים קבועים ואינם משתנים עם הזעזועים.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" y1="3" x2="22" y2="3" stroke={color} strokeWidth="1.6" strokeDasharray="6 4" />
          </svg>
          קו מקווקו = שיווי המשקל בטווח הנוכחי
        </span>
      </p>
      {scenario.settings.economy === 'open' && (
        <ErrorBoundary label="שוק המט״ח" resetKey={step}>
          <FxMarketChart scenario={scenario} step={step} />
        </ErrorBoundary>
      )}
      <ErrorBoundary label="השינוי לעומת מצב המוצא" resetKey={step}>
        <VariableChanges scenario={scenario} step={step} />
      </ErrorBoundary>
      {large && (
        <div className="grid gap-3 lg:grid-cols-2">
          <WorldLinks scenario={scenario} step={step} />
          <ErrorBoundary label="המשק הזר" resetKey={step}>
            <ForeignChart scenario={scenario} step={step} />
          </ErrorBoundary>
        </div>
      )}
    </section>
  );
}

/**
 * When the result depends on the relative sizes of the shocks, list the cases
 * (as the exam solutions do) and let the student choose which one to draw.
 */
function CasePicker({ scenario, step, dispatch }) {
  const { cases, caseKey } = scenario;
  const open = scenario.settings.economy === 'open';
  const keys = ['Y', 'r', 'P', 'M', ...(open ? ['e', 'eps', 'NX'] : [])];
  const diff = keys.filter((k) => new Set(cases.map((c) => c.signs[k])).size > 1);
  return (
    <section className="rounded-xl border-2 border-[#B54708]/40 bg-[#FFFAF2] px-4 py-2.5" aria-label="פיצול למקרים">
      <p className="text-[13px] font-bold text-ink">
        בטווח הזה התוצאה תלויה בגודל השינויים, ולכן בטבלה מופיע ?. הגרפים מציירים מקרה אחד; בחרו מקרה:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {cases.map((c, i) => {
          const on = vectorKey(c.vec) === caseKey;
          return (
            <button
              key={c.pattern}
              type="button"
              onClick={() => dispatch({ type: 'SET_CASE', key: vectorKey(c.vec) })}
              aria-pressed={on}
              className="rounded-lg border px-3 py-1.5 text-right text-[12.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
              style={{ borderColor: on ? '#B54708' : '#DCE1E8', background: on ? '#fff' : '#ffffffaa' }}
            >
              <span className="block font-bold text-ink">מקרה {'אבגדהוזח'[i]}: {c.label}</span>
              <span className="mt-0.5 block font-math" dir="ltr">
                {diff.map((k) => (
                  <span key={k} className="mx-1">
                    <Var k={k} noSign />
                    <Sign s={c.signs[k]} arrow />
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** How to read the linked diagrams; a compact strip above the square. */
function ReadingGuide({ cur, step, color, zlb, signs }) {
  const items = [
    ['שוק הכסף ↔ IS-LM', zlb ? 'הריבית ברצפת האפס: עודף הכסף לא מוריד את {r} מתחת ל-0.' : 'הריבית שמנקה את שוק הכסף היא אותה {r} בציר האנכי של {IS}-{LM}.'],
    ['IS-LM ↓ AD-AS', 'התוצר במפגש {IS} ו-{LM} יורד ישר למטה: אותו {Y} על {AD}.'],
    ['AD-AS ↔ שוק העבודה', '{P} קובע את {wP} כש-{w} קבוע בחוזה, ולפיו נקבעים {L} והתוצר.'],
    ['ובחזרה', 'שינוי ב-{P} משנה את {MP}: ההיצע בשוק הכסף זז, {LM} זזה, וכך נבנית {AD}.'],
  ];
  return (
    <section className="rounded-xl border border-rule bg-white px-4 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-[14px] font-bold text-ink">איך קוראים את הגרפים ביחד</h2>
        <span className="text-[11.5px] font-bold" style={{ color }}>
          {HORIZONS[step].label}:{' '}
          {step > 0 ? (
            <span dir="ltr" className="font-math">
              {['Y', 'r', 'P'].map((k) => (
                <span key={k} className="mx-1">
                  <Var k={k} noSign />
                  <Sign s={signs.origin[step][k]} arrow />
                </span>
              ))}
            </span>
          ) : (
            'כל המשתנים במצב המוצא'
          )}
        </span>
      </div>
      <ol className="grid gap-x-5 gap-y-1 text-[12.5px] leading-6 text-ink sm:grid-cols-2 2xl:grid-cols-4">
        {items.map(([head, text]) => (
          <li key={head}>
            <span className="font-bold">{head}. </span>
            <RichText text={text} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** How the two economies are tied together, with live values (Lecture 12). */
function WorldLinks({ scenario, step }) {
  const t0 = scenario.snapshots[0];
  const cur = scenario.snapshots[step];
  const color = HORIZON_COLORS[STEP_KEYS[step]];
  const Row = ({ children }) => <li className="border-b border-rule py-2 last:border-b-0">{children}</li>;
  const sg = scenario.signs.origin[step];
  const d = (k) => (step > 0 ? <Sign s={sg[k]} arrow className="mx-0.5" /> : null);
  return (
    <section className="h-full rounded-xl border border-rule bg-white">
      <header className="flex h-[58px] flex-col justify-center border-b border-rule px-4">
        <h3 className="font-display text-[14px] font-bold text-ink">מה מחבר בין שני המשקים</h3>
        <p className="text-[11px] text-muted" style={{ color }}>
          {HORIZONS[step].label}
        </p>
      </header>
      <ul className="px-4 py-1 text-[13px] leading-6 text-ink">
        <Row>
          <span className="font-bold">ריבית אחת לשני המשקים. </span>
          <RichText text="ניידות הון מלאה: {r} = {rStar} + ΔEᵉ. כאן " />
          <span dir="ltr" className="font-math">
            i*{d('rStar')}
          </span>
        </Row>
        <Row>
          <span className="font-bold">מסחר דו-צדדי. </span>
          <RichText text="היצוא שלנו הוא היבוא שלהם, ולכן {NX} שלנו שווה למינוס {NX} שלהם: " />
          <span dir="ltr" className="font-math">
            TB{d('NX')}
          </span>
        </Row>
        <Row>
          <span className="font-bold">שער החליפין. </span>
          <RichText text="{e} מאזן בין הביקוש למוצרים של שני המשקים: " />
          <span dir="ltr" className="font-math">
            E{d('e')}, e{d('eps')}
          </span>
        </Row>
        <Row>
          <span className="font-bold">תוצר. </span>
          <span dir="ltr" className="font-math">
            Y{d('Y')}, Yᶠ{d('Yf')}
          </span>
        </Row>
      </ul>
    </section>
  );
}
