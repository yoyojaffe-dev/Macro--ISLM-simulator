import { Sigma } from 'lucide-react';
import { CAL, HORIZONS, kappaOf, regimeAt, activeAssumptions } from '../../engine/index.js';
import { HORIZON_COLORS, fmt } from '../theme.js';
import { Var, Num, SignContext } from './primitives.jsx';

const Op = ({ children }) => <span className="mx-[3px] text-[#5B6577]">{children}</span>;
const Row = ({ name, general, numeric, note }) => (
  <div className="grid gap-1 border-b border-rule py-2.5 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)]">
    <div className="text-[12.5px] font-bold text-ink">
      {name}
      {note && <div className="mt-0.5 text-[11px] font-normal leading-4 text-muted">{note}</div>}
    </div>
    <div dir="ltr" className="min-w-0 text-left font-math text-[15.5px] leading-7">
      <div className="overflow-x-auto whitespace-nowrap">{general}</div>
      {/* Signs only: the numeric line is not shown (qualitative analysis, as in the exams). */}
    </div>
  </div>
);

export default function EquationsPanel({ scenario, step }) {
  const { params, settings, snapshots } = scenario;
  const s = snapshots[step];
  const x = s.exo;
  const open = settings.economy === 'open';
  const kap = kappaOf(settings, params);
  const fixed = open && regimeAt(settings, s) === 'fixed';
  const band = open && settings.regime === 'band';
  const large = open && settings.size === 'large';
  const signMap = step > 0 ? scenario.signs?.origin?.[step] : null;
  const h = HORIZONS[step];
  const school = settings.school;
  const fixedLabor = activeAssumptions(settings).includes('fixedLabor');
  const flatLM = Boolean(params.flatLM) && !open;
  // Spending multiplier: 1/[1 − mps] with mps = c(1 − t) + δ + β (imports leak (1 − m) of absorption).
  const mpsText = `c${params.t > 0 ? '(1 − t)' : ''}${params.delta > 0 ? ' + δ' : ''}${params.beta > 0 ? ' + β' : ''}`;
  const compound = params.delta > 0 || params.beta > 0;
  const multText = open
    ? `(1 − m) / [1 − (1 − m)(${mpsText})]`
    : compound
      ? `1 / [1 − (${mpsText})]`
      : params.t > 0
        ? `1 / [1 − ${mpsText}]`
        : '1 / (1 − c)';

  const asRow = (() => {
    if (school === 'classical') {
      return {
        general: (
          <>
            <Var k="Y" />
            <Op>=</Op>
            <Var k="Y*" />
            <Op>=</Op>
            <Var k="A" />
            <Op>·</Op>√(K·L*)
          </>
        ),
        numeric: (
          <>
            <Num k="Y" v={s.Y} /> <Op>=</Op> <Num k="Ystar" v={s.Ystar} />
          </>
        ),
        note: 'AS אנכית בכל טווח',
      };
    }
    if (step === 1 || (school === 'extreme' && step === 2)) {
      return {
        general: (
          <>
            <Var k="P" />
            <Op>=</Op>
            <Var k="P" />
            <sub>0</sub>
            <Op>,</Op> <Var k="w" />
            <Op>=</Op>
            <Var k="w" />
            <sub>0</sub>
            <span className="mx-2 font-sans text-[12px] text-muted">(AS אופקית)</span>
          </>
        ),
        numeric: (
          <>
            <Var k="P" /> <Op>=</Op> <Num k="P" v={s.P} d={3} />
          </>
        ),
        note: 'מחירים קשיחים: Y נקבע לפי הביקוש',
      };
    }
    if (fixedLabor && step === 2) {
      return {
        general: (
          <>
            <Var k="Y" />
            <Op>=</Op>
            <Var k="Y*" />
            <span className="mx-2 font-sans text-[12px] text-muted">(AS אנכית)</span>
          </>
        ),
        note: 'הביקוש לעובדים קבוע: L = L*',
      };
    }
    return {
      general: (
        <>
          <Var k="Y" />
          <Op>=</Op>
          <Var k="Y*" />
          <Op>·</Op>
          <Var k="P" />
          <Op>/</Op>
          <Var k="Pe" />
          <span className="mx-2 font-sans text-[12px] text-muted">
            {s.noEq ? '(אין שיווי משקל בטווח הזה)' : step === 3 || step === 0 ? '(Pᵉ = P ⇒ Y = Y*)' : '(Pᵉ נקבע בחוזה השכר)'}
          </span>
        </>
      ),
      numeric: (
        <>
          <Num k="Y" v={s.Y} /> <Op>=</Op> <Num k="Ystar" v={s.Ystar} /> <Op>·</Op> <Num k="P" v={s.P} d={3} />
          <Op>/</Op> <Num k="Pe" v={s.Pe} d={3} />
        </>
      ),
      note: 'הרצאה 4: חוזה שכר נומינלי',
    };
  })();

  return (
    <section className="rounded-xl border border-rule bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <Sigma size={16} className="text-muted" aria-hidden />
          האלגברה של המודל
        </h2>
        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ background: HORIZON_COLORS[h.key] }}>
          {h.label}
        </span>
      </header>
      <SignContext.Provider value={signMap}>
      <div className="px-4 pb-2">
        <Row
          name="צריכה"
          general={
            <>
              <Var k="C" /> <Op>=</Op> <Var k="C0" /> <Op>+</Op> <Var k="c" />
              <Op>(</Op>
              <Var k="Y" /> <Op>−</Op> <Var k="T" />
              <Op>)</Op>
              {params.ci > 0 && (
                <>
                  {' '}
                  <Op>−</Op> <Var k="ci" />
                  <Op>·</Op>
                  <Var k="r" />
                </>
              )}
            </>
          }
          numeric={
            <>
              <Num k="C" v={s.C} /> <Op>=</Op> <Num k="C0" v={x.C0} /> <Op>+</Op> <Num k="c" v={params.c} d={2} />
              <Op>(</Op>
              <Num k="Y" v={s.Y} /> <Op>−</Op> <Num k="T" v={x.T} />
              <Op>)</Op>
              {params.ci > 0 && (
                <>
                  {' '}
                  <Op>−</Op> <Num k="ci" v={params.ci} d={1} />
                  <Op>·</Op>
                  <Num k="r" v={s.r} d={2} />
                </>
              )}
            </>
          }
        />
        {(params.t > 0 || params.delta > 0) && (
          <Row
            name="כללים פיסקליים"
            note="T ו-G משתנים עם התוצר (הרצאה 2, מרכז למידה 4)"
            general={
              <>
                <Var k="T" /> <Op>=</Op> T̄ <Op>+</Op> <Var k="t" />
                <Op>·</Op>
                <Var k="Y" />
                <span className="mx-3 text-[#AAB2C0]">|</span>
                <Var k="G" /> <Op>=</Op> G₀ <Op>+</Op> <Var k="delta" />
                <Op>·</Op>
                <Var k="Y" />
              </>
            }
            numeric={
              <>
                <Num k="T" v={s.T} /> <Op>=</Op> <Num k="T" v={x.T - (params.t || 0) * CAL.Ystar} /> <Op>+</Op>{' '}
                <Num k="t" v={params.t || 0} d={2} />
                <Op>·</Op>
                <Num k="Y" v={s.Y} />
                <span className="mx-3 text-[#AAB2C0]">|</span>
                <Num k="G" v={s.G} /> <Op>=</Op> <Num k="G" v={x.G - (params.delta || 0) * CAL.Ystar} /> <Op>+</Op>{' '}
                <Num k="delta" v={params.delta || 0} d={2} />
                <Op>·</Op>
                <Num k="Y" v={s.Y} />
              </>
            }
          />
        )}
        <Row
          name="השקעה"
          general={
            <>
              <Var k="I" /> <Op>=</Op> <Var k="I0" />
              {params.beta > 0 && (
                <>
                  {' '}
                  <Op>+</Op> <Var k="beta" />
                  <Op>(</Op>
                  <Var k="Y" /> <Op>−</Op> <Var k="Y*" />
                  <Op>)</Op>
                </>
              )}{' '}
              <Op>−</Op> <Var k="b" />
              <Op>·</Op>
              <Var k="r" />
            </>
          }
          numeric={
            <>
              <Num k="I" v={s.I} /> <Op>=</Op> <Num k="I0" v={x.I0} />
              {params.beta > 0 && (
                <>
                  {' '}
                  <Op>+</Op> <Num k="beta" v={params.beta} d={2} />
                  <Op>(</Op>
                  <Num k="Y" v={s.Y} /> <Op>−</Op> {CAL.Ystar}
                  <Op>)</Op>
                </>
              )}{' '}
              <Op>−</Op> <Num k="b" v={params.b} />
              <Op>·</Op>
              <Num k="r" v={s.r} d={2} />
            </>
          }
        />
        {open && (
          <Row
            name="מאזן הסחר"
            note={large ? 'היצוא שלנו = היבוא של חו״ל' : 'היבוא תלוי בכל הספיגה a = C + I + G (הרצאה 8)'}
            general={
              <>
                <Var k="NX" /> <Op>=</Op> <Op>[</Op>
                {large ? (
                  <>
                    <Var k="n" />
                    <Op>(</Op>
                    <Var k="eps" /> <Op>−</Op> 1<Op>)</Op> <Op>+</Op> <Op>(</Op>
                    <Var k="m" />
                    <Op>/</Op>σ<Op>)</Op>
                    <Var k="aStar" noSign />
                  </>
                ) : (
                  <>
                    x₀ <Op>+</Op> <Var k="n" />
                    <Op>(</Op>
                    <Var k="eps" /> <Op>−</Op> 1<Op>)</Op> <Op>+</Op> φ<Var k="aStar" />
                  </>
                )}
                <Op>]</Op> <Op>−</Op> <Var k="m" />
                <Op>·</Op>
                <Var k="a" />
              </>
            }
            numeric={
              <>
                <Num k="NX" v={s.NX} /> <Op>=</Op> <Num k="X" v={s.X} /> <Op>−</Op> <Num k="IM" v={s.IM} />
              </>
            }
          />
        )}
        {open && (
          <Row
            name="ספיגה"
            note="סך ההוצאה של המקומיים, על מוצרים מקומיים ומיובאים (הרצאה 8)"
            general={
              <>
                <Var k="a" /> <Op>=</Op> <Var k="C" /> <Op>+</Op> <Var k="I" /> <Op>+</Op> <Var k="G" />
              </>
            }
            numeric={
              <>
                <Num k="a" v={s.C + s.I + s.G} /> <Op>=</Op> <Num k="C" v={s.C} /> <Op>+</Op> <Num k="I" v={s.I} /> <Op>+</Op>{' '}
                <Num k="G" v={s.G} />
              </>
            }
          />
        )}
        <Row
          name={open ? 'IS במשק פתוח' : 'IS: שוק הסחורות'}
          note="התוצר שווה לסך הביקושים"
          general={
            <>
              <Var k="Y" /> <Op>=</Op> <Var k="C" />
              <Op>(</Op>
              <Var k="Y" /> <Op>−</Op> <Var k="T" />
              <Op>)</Op> <Op>+</Op> <Var k="I" />
              <Op>(</Op>
              <Var k="r" />
              <Op>)</Op> <Op>+</Op> <Var k="G" />
              {open && (
                <>
                  {' '}
                  <Op>+</Op> <Var k="NX" />
                  <Op>(</Op>
                  <Var k="a" />, <Var k="aStar" />, <Var k="eps" />
                  <Op>)</Op>
                </>
              )}
            </>
          }
          numeric={
            <>
              <Num k="Y" v={s.Y} /> <Op>=</Op> <Num k="C" v={s.C} /> <Op>+</Op> <Num k="I" v={s.I} /> <Op>+</Op> <Num k="G" v={s.G} />
              {open && (
                <>
                  {' '}
                  <Op>+</Op> <Num k="NX" v={s.NX} />
                </>
              )}
            </>
          }
        />
        <Row
          name="LM: שוק הכסף"
          note={
            flatLM
              ? 'הביקוש לכסף גמיש לחלוטין לריבית: LM אופקית, M ו-P לא מזיזים את i'
              : fixed
                ? 'שע״ח קבוע: M אנדוגני'
                : scenario.rateTarget
                  ? 'ריבית יעד: M נקבע כך ש-i = ī'
                  : s.zlb
                    ? 'רצפת אפס פעילה'
                    : null
          }
          general={
            flatLM ? (
              <>
                <Var k="r" /> <Op>=</Op> <Var k="r" noSign />
                <sub>0</sub>
              </>
            ) : (
              <>
                <Var k="M" />
                <Op>/</Op>
                <Var k="P" /> <Op>=</Op> <Var k="L0" /> <Op>+</Op> <Var k="k" />
                <Op>·</Op>
                <Var k="Y" /> <Op>−</Op> <Var k="h" />
                <Op>·</Op>
                <Var k="r" />
              </>
            )
          }
          numeric={
            <>
              <Num k="M" v={s.M} />
              <Op>/</Op>
              <Num k="P" v={s.P} d={3} /> <Op>=</Op> <Num k="L0" v={x.L0} /> <Op>+</Op> <Num k="k" v={params.k} d={2} />
              <Op>·</Op>
              <Num k="Y" v={s.Y} /> <Op>−</Op> <Num k="h" v={params.h} />
              <Op>·</Op>
              <Num k="r" v={s.r} d={2} />
              {s.zlb && <span className="mx-2 font-sans text-[12px] text-muted">(עודף נזילות ב-i = 0)</span>}
            </>
          }
        />
        {open && (
          <Row
            name={kap === Infinity ? 'CM: ניידות הון מלאה (UIRP)' : 'BP: מאזן התשלומים'}
            note={
              kap === Infinity
                ? large
                  ? 'i* נקבע בשוק העולמי'
                  : scenario.shocks.Ee
                    ? 'הציפיות דועכות: מלאות בטווח המיידי, חלקיות בקצר, אפס בבינוני'
                    : 'בלי ציפיות לשינוי בשער: i = i*'
                : `κ = ${fmt(kap, 0)}`
            }
            general={
              kap === Infinity ? (
                <>
                  <Var k="r" /> <Op>=</Op> <Var k="rStar" /> <Op>+</Op> <Var k="Ee" />
                </>
              ) : (
                <>
                  <Var k="NX" /> <Op>+</Op> <Var k="kappa" />
                  <Op>(</Op>
                  <Var k="r" /> <Op>−</Op> <Var k="rStar" /> <Op>−</Op> <Var k="Ee" />
                  <Op>)</Op> <Op>=</Op> 0
                </>
              )
            }
            numeric={
              kap === Infinity ? (
                <>
                  <Num k="r" v={s.r} d={2} /> <Op>=</Op> <Num k="rStar" v={x.rStar} d={2} /> <Op>+</Op>{' '}
                  <Num k="Ee" v={s.Ee} d={2} />
                </>
              ) : (
                <>
                  <Num k="NX" v={s.NX} /> <Op>+</Op> <Num k="kappa" v={kap} d={0} />
                  <Op>(</Op>
                  <Num k="r" v={s.r} d={2} /> <Op>−</Op> <Num k="rStar" v={x.rStar} d={2} /> <Op>−</Op>{' '}
                  <Num k="Ee" v={s.Ee} d={2} />
                  <Op>)</Op> <Op>=</Op> 0
                </>
              )
            }
          />
        )}
        {open && (
          <Row
            name="שע״ח ריאלי"
            note={band ? (s.band === 'inside' ? 'E בתוך הרצועה: נקבע בשוק' : 'E בקצה הרצועה: הבנק מתערב') : fixed ? 'E נקבע במדיניות' : 'E נקבע בשוק'}
            general={
              <>
                <Var k="eps" /> <Op>=</Op> <Var k="e" />
                <Op>·</Op>
                <Var k="P*" />
                <Op>/</Op>
                <Var k="P" />
              </>
            }
            numeric={
              <>
                <Num k="eps" v={s.eps} d={3} /> <Op>=</Op> <Num k="e" v={s.e} d={3} />
                <Op>·</Op>
                <Num k="Pstar" v={x.Pstar} d={3} />
                <Op>/</Op>
                <Num k="P" v={s.P} d={3} />
              </>
            }
          />
        )}
        {band && (
          <Row
            name="רצועת ניוד"
            note={s.band === 'inside' ? 'בתוך הרצועה' : s.band === 'low' ? 'בגבול התחתון: הבנק קונה מט״ח' : 'בגבול העליון: הבנק מוכר מט״ח'}
            general={
              <>
                <Var k="e" label="E_low" noSign /> <Op>≤</Op> <Var k="e" /> <Op>≤</Op> <Var k="e" label="E_high" noSign />
              </>
            }
            numeric={
              <>
                {s.bandLo > 0 ? fmt(s.bandLo, 3) : '0'} <Op>≤</Op> <Num k="e" v={s.e} d={3} /> <Op>≤</Op> {Number.isFinite(s.bandHi) ? fmt(s.bandHi, 3) : '∞'}
              </>
            }
          />
        )}
        {large && (
          <Row
            name="שוק הסחורות העולמי"
            note="TB מתקזז: היצוא שלנו הוא היבוא שלהם"
            general={
              <>
                <Var k="Y" /> <Op>+</Op> <Var k="Yf" /> <Op>=</Op> <Op>(</Op>
                <Var k="C" /> <Op>+</Op> <Var k="I" /> <Op>+</Op> <Var k="G" />
                <Op>)</Op> <Op>+</Op> <Op>(</Op>C* <Op>+</Op> I* <Op>+</Op> <Var k="Gf" />
                <Op>)</Op>
              </>
            }
            numeric={
              <>
                <Num k="Y" v={s.Y} /> <Op>+</Op> <Num k="Yf" v={s.Yf} /> <Op>=</Op>{' '}
                <Num k="Y" v={s.Y + s.Yf} />
              </>
            }
          />
        )}
        {large && (
          <Row
            name="LM* של המשק הזר"
            note={`גדול פי σ = ${fmt(scenario.base.sigma, 2)}`}
            general={
              <>
                <Var k="Mf" />
                <Op>/</Op>
                <Var k="P*" /> <Op>=</Op> σ<Var k="L0" /> <Op>+</Op> <Var k="k" />
                <Op>·</Op>
                <Var k="Yf" /> <Op>−</Op> σ<Var k="h" />
                <Op>·</Op>
                <Var k="rStar" />
              </>
            }
            numeric={
              <>
                <Num k="Mf" v={s.Mf} />
                <Op>/</Op>
                <Num k="Pstar" v={s.Pstar} d={3} /> <Op>=</Op> <Num k="L0" v={x.F.L0} /> <Op>+</Op>{' '}
                <Num k="k" v={params.k} d={2} />
                <Op>·</Op>
                <Num k="Yf" v={s.Yf} /> <Op>−</Op> <Num k="h" v={params.h * scenario.base.sigma} />
                <Op>·</Op>
                <Num k="rStar" v={s.rStar} d={2} />
              </>
            }
          />
        )}
        <Row name="היצע מצרפי" note={asRow.note} general={asRow.general} numeric={asRow.numeric} />
        <Row
          name="מכפיל"
          note={
            !open
              ? 'מכפיל ההוצאה הממשלתית בריבית קבועה'
              : large
                ? 'בריבית ובשע״ח ריאלי קבועים'
                : fixed
                  ? 'שע״ח קבוע: i = i* ו-e קבוע בטווח המיידי, ולכן זה המכפיל בפועל'
                  : 'בריבית ובשע״ח ריאלי קבועים. בשע״ח נייד e משתנה, וההשפעה בפועל על Y היא 0'
          }
          general={
            <span className="text-[14px]">
              ΔY/ΔG <Op>=</Op> {multText}
            </span>
          }
        />
        <p className="pt-2 text-[11.5px] leading-5 text-muted">
          החץ ליד כל משתנה הוא כיוון השינוי שלו ביחס למצב המוצא (? = תלוי בגודל השינויים או בשיפועים). i היא הריבית הנומינלית חסרת הסיכון, כמו בשקפים. E הוא שער החליפין הנומינלי (מחיר יחידת מט״ח בשקלים) ו-e = E·P*/P הוא הריאלי, כמו בשקפים. TB הוא מאזן הסחר.
        </p>
      </div>
      </SignContext.Provider>
    </section>
  );
}
