/**
 * Quiz engine.
 *
 * 1. "cause": the student sees a curve shift and picks the shock that caused it.
 *    Options are drawn from four observationally distinct classes so exactly
 *    one option is correct.
 * 2. "predict": course-style sign table (+ / − / = / ?). The answer key is
 *    computed robustly: the scenario is re-solved over a grid of admissible
 *    parameters, and a variable whose sign flips anywhere on the grid is "?".
 */
import { DEFAULT_PARAMS, ZERO_SHOCKS } from './constants.js';
import { buildScenario, sgn } from './model.js';

export function makeRng(seed = Date.now()) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const shuffle = (rng, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const CLOSED = { economy: 'closed', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const FIXED = { economy: 'open', regime: 'fixed', mobility: 'perfect', school: 'keynesian' };
const FLOAT = { economy: 'open', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const TWO = { economy: 'open', size: 'large', regime: 'floating', mobility: 'perfect', school: 'keynesian' };

/** Shock options described in Hebrew, with magnitudes chosen to be clearly visible. */
const OPTION_TEXT = {
  'G+': { shocks: { G: 50 }, text: 'הממשלה הגדילה את ההוצאות ({G}↑)' },
  'G-': { shocks: { G: -50 }, text: 'הממשלה קיצצה בהוצאות ({G}↓)' },
  'T+': { shocks: { T: 50 }, text: 'הממשלה העלתה מיסים ({T}↑)' },
  'T-': { shocks: { T: -50 }, text: 'הממשלה הורידה מיסים ({T}↓)' },
  'C0+': { shocks: { C0: 40 }, text: 'משקי הבית צופים הכנסה עתידית גבוהה יותר ({YTf}↑)' },
  'C0-': { shocks: { C0: -40 }, text: 'משקי הבית צופים הכנסה עתידית נמוכה יותר ({YTf}↓)' },
  'I0+': { shocks: { I0: 40 }, text: 'הפירמות צופות תשואה גבוהה יותר להון' },
  'I0-': { shocks: { I0: -40 }, text: 'הפירמות צופות תשואה נמוכה יותר להון' },
  'M+': { shocks: { M: 60 }, text: 'הבנק המרכזי הגדיל את כמות הכסף ({M}↑)' },
  'M-': { shocks: { M: -60 }, text: 'הבנק המרכזי הקטין את כמות הכסף ({M}↓)' },
  'L0+': { shocks: { L0: 30 }, text: 'הציבור רוצה להחזיק יותר כסף בכל ריבית' },
  'L0-': { shocks: { L0: -30 }, text: 'הציבור רוצה להחזיק פחות כסף בכל ריבית' },
  'W-': { shocks: { W: -8 }, text: 'החוזים נחתמו בשכר נומינלי נמוך יותר ({w}↓)' },
  'W+': { shocks: { W: 8 }, text: 'העובדים צופים עליית מחירים והחוזים נחתמו בשכר גבוה יותר ({w}↑)' },
};

const CAUSE_SETS = {
  islm: {
    chart: 'islm',
    step: 1,
    prompt: 'עקומות {IS}-{LM} זזו מהמצב האפור (מוצא) למצב הכחול (טווח מיידי). מה גרם לתזוזה?',
    classes: {
      'IS→': ['G+', 'T-', 'C0+', 'I0+'],
      'IS←': ['G-', 'T+', 'C0-', 'I0-'],
      'LM→': ['M+', 'L0-'],
      'LM←': ['M-', 'L0+'],
    },
    explain: {
      'IS→': 'הביקוש לסחורות גדל בכל ריבית, ולכן {IS} זזה ימינה. {Y} ו-{r} עולים.',
      'IS←': 'הביקוש לסחורות קטן בכל ריבית, ולכן {IS} זזה שמאלה. {Y} ו-{r} יורדים.',
      'LM→': 'עודף היצע של כסף בכל רמת תוצר: {LM} זזה ימינה, {r} יורד ו-{Y} עולה.',
      'LM←': 'עודף ביקוש לכסף בכל רמת תוצר: {LM} זזה שמאלה, {r} עולה ו-{Y} יורד.',
    },
  },
  adas: {
    chart: 'adas',
    step: 2,
    prompt: 'בדיאגרמת {AD}-{AS} המשק עבר מהנקודה האפורה לנקודה הכתומה (טווח קצר). מה גרם לכך?',
    classes: {
      'AD→': ['G+', 'M+', 'C0+'],
      'AD←': ['G-', 'M-', 'C0-'],
      'AS→': ['W-'],
      'AS←': ['W+'],
    },
    explain: {
      'AD→': 'זעזוע ביקוש חיובי: {AD} זזה ימינה, {P} ו-{Y} עולים יחד לאורך {AS}.',
      'AD←': 'זעזוע ביקוש שלילי: {AD} זזה שמאלה, {P} ו-{Y} יורדים יחד.',
      'AS→': 'זעזוע היצע חיובי: {AS} זזה ימינה, {Y} עולה ו-{P} יורד.',
      'AS←': 'זעזוע היצע שלילי: {AS} זזה שמאלה, {Y} יורד ו-{P} עולה. זו סטגפלציה.',
    },
  },
};

export function causeQuestion(rng) {
  const set = CAUSE_SETS[pick(rng, Object.keys(CAUSE_SETS))];
  const classNames = Object.keys(set.classes);
  const correctClass = pick(rng, classNames);
  const options = shuffle(
    rng,
    classNames.map((cls) => {
      const key = pick(rng, set.classes[cls]);
      return { key, cls, text: OPTION_TEXT[key].text, correct: cls === correctClass };
    }),
  );
  const answer = options.find((o) => o.correct);
  return {
    type: 'cause',
    chart: set.chart,
    step: set.step,
    prompt: set.prompt,
    settings: CLOSED,
    shocks: { ...ZERO_SHOCKS, ...OPTION_TEXT[answer.key].shocks },
    options,
    explanation: set.explain[correctClass],
  };
}

const PREDICT_CONTEXTS = [
  {
    settings: CLOSED,
    label: 'משק סגור',
    shocks: ['G', 'T', 'M', 'C0', 'I0', 'W'],
    vars: ['Y', 'r', 'P', 'C', 'I', 'MP', 'wP'],
  },
  {
    settings: FIXED,
    label: 'משק קטן ופתוח, שע״ח קבוע, ניידות הון מלאה',
    shocks: ['G', 'T', 'M', 'e', 'rStar', 'aStar'],
    vars: ['Y', 'r', 'P', 'C', 'NX', 'eps', 'M'],
  },
  {
    settings: FLOAT,
    label: 'משק קטן ופתוח, שע״ח נייד, ניידות הון מלאה',
    shocks: ['G', 'T', 'M', 'rStar', 'Pstar', 'aStar'],
    vars: ['Y', 'r', 'P', 'C', 'NX', 'e', 'eps'],
  },
  {
    settings: TWO,
    label: 'עולם של שתי כלכלות שוות בגודלן, שע״ח נייד, ניידות הון מלאה',
    shocks: ['G', 'M', 'Mf', 'Gf'],
    vars: ['Y', 'Yf', 'r', 'e', 'NX', 'P', 'Pstar'],
  },
];

const SHOCK_SIZE = { G: 10, T: 10, M: 15, C0: 10, I0: 10, W: 3, e: 5, rStar: 0.5, Pstar: 5, aStar: 10, Mf: 15, Gf: 10 };

const SHOCK_PHRASE = {
  G: ['הממשלה מגדילה את הוצאותיה', 'הממשלה מקצצת בהוצאותיה'],
  T: ['הממשלה מעלה מיסים', 'הממשלה מורידה מיסים'],
  M: ['הבנק המרכזי מגדיל את כמות הכסף', 'הבנק המרכזי מקטין את כמות הכסף'],
  C0: ['אמון הצרכנים עולה', 'אמון הצרכנים יורד'],
  I0: ['הציפיות לתשואה על הון משתפרות', 'הציפיות לתשואה על הון מתדרדרות'],
  W: ['החוזים נחתמים בשכר נומינלי גבוה יותר', 'החוזים נחתמים בשכר נומינלי נמוך יותר'],
  e: ['הבנק המרכזי מבצע פיחות בשער הקבוע', 'הבנק המרכזי מבצע ייסוף בשער הקבוע'],
  rStar: ['הריבית העולמית עולה', 'הריבית העולמית יורדת'],
  Pstar: ['רמת המחירים בעולם עולה', 'רמת המחירים בעולם יורדת'],
  aStar: ['הביקוש העולמי למוצרים מקומיים עולה', 'הביקוש העולמי למוצרים מקומיים יורד'],
  Mf: ['הבנק המרכזי הזר מגדיל את כמות הכסף', 'הבנק המרכזי הזר מקטין את כמות הכסף'],
  Gf: ['הממשלה הזרה מגדילה את הוצאותיה', 'הממשלה הזרה מקטינה את הוצאותיה'],
};

export const COMPARISONS = [
  { id: 'sr_t0', from: 0, to: 1, label: 'טווח מיידי ביחס למצב המוצא' },
  { id: 'mr_sr', from: 1, to: 2, label: 'טווח קצר ביחס לטווח המיידי' },
  { id: 'lr_mr', from: 2, to: 3, label: 'טווח בינוני ביחס לטווח הקצר' },
  { id: 'lr_t0', from: 0, to: 3, label: 'טווח בינוני ביחס למצב המוצא' },
];

const GRID = {
  c: [0.6, 0.8, 0.87],
  b: [3, 10, 30],
  h: [1.5, 6, 25],
  k: [0.2, 0.4, 0.8],
  m: [0.1, 0.3],
  n: [80, 300],
};

function* paramGrid(open) {
  for (const c of GRID.c)
    for (const b of GRID.b)
      for (const h of GRID.h)
        for (const k of GRID.k)
          for (const m of open ? GRID.m : [DEFAULT_PARAMS.m])
            for (const n of open ? GRID.n : [DEFAULT_PARAMS.n])
              yield { ...DEFAULT_PARAMS, c, b, h, k, m, n };
}

/** Sign of each variable across the parameter grid; '?' if it is not robust. */
export function robustSigns(settings, shocks, from, to, vars) {
  const seen = Object.fromEntries(vars.map((v) => [v, new Set()]));
  for (const params of paramGrid(settings.economy === 'open')) {
    const sc = buildScenario(params, settings, shocks);
    const a = sc.snapshots[from];
    const z = sc.snapshots[to];
    if (!a.valid || !z.valid || z.noEq || z.zlb || a.zlb) continue;
    for (const v of vars) {
      seen[v].add(sgn(z[v] - a[v], 1e-7 * (1 + Math.abs(a[v]))));
    }
  }
  const sym = { 1: '+', '-1': '−', 0: '=' };
  return Object.fromEntries(
    vars.map((v) => [v, seen[v].size === 1 ? sym[[...seen[v]][0]] : '?']),
  );
}

export function predictQuestion(rng) {
  const ctx = pick(rng, PREDICT_CONTEXTS);
  const shockId = pick(rng, ctx.shocks);
  const dir = rng() < 0.6 ? 1 : -1;
  const comparison = pick(rng, COMPARISONS);
  const shocks = { ...ZERO_SHOCKS, [shockId]: dir * SHOCK_SIZE[shockId] };
  const key = robustSigns(ctx.settings, shocks, comparison.from, comparison.to, ctx.vars);
  return {
    type: 'predict',
    settings: ctx.settings,
    contextLabel: ctx.label,
    shockText: SHOCK_PHRASE[shockId][dir > 0 ? 0 : 1],
    shocks,
    comparison,
    vars: ctx.vars,
    key,
  };
}
