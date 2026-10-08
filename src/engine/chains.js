/**
 * Transmission chains.
 *
 * Short-run (impact) chains come from theory templates keyed by shock and
 * regime, exactly in the order the lectures narrate them. A node either has a
 * theoretical sign relative to the shock (`s`) or is marked `calc`, meaning
 * its direction is read from the solved model (used where theory leaves the
 * sign to the parameters, e.g. the exchange rate under partial mobility).
 *
 * Medium- and long-run chains are generated from the computed price change
 * and output gap, so they always agree with the charts.
 */
import { kappaOf, sgn, isLarge, effectiveSettings } from './model.js';
import { activeAssumptions } from './constants.js';

/** Node vocabulary: variable key -> {sym, sector}. Keys match snapshot fields when computable. */
export const NODE_META = {
  G: { sym: 'G', sector: 'fiscal' },
  T: { sym: 'T', sector: 'fiscal' },
  Yd: { sym: 'Y−T', sector: 'real', hint: 'הכנסה פנויה' },
  Y: { sym: 'Y', sector: 'real' },
  C: { sym: 'C', sector: 'real' },
  I: { sym: 'I', sector: 'real' },
  C0: { sym: '(Y−T)ᶠ', sector: 'real', hint: 'ציפיות להכנסה פנויה עתידית' },
  MPKe: { sym: 'MPKᵉ', sector: 'real' },
  Md: { sym: 'Mᵈ', sector: 'monetary', hint: 'ביקוש לכסף בריבית נתונה' },
  M: { sym: 'M', sector: 'monetary' },
  MP: { sym: 'M/P', sector: 'monetary' },
  r: { sym: 'i', sector: 'monetary' },
  rp: { sym: 'i', sector: 'monetary', hint: 'לחץ על הריבית' },
  P: { sym: 'P', sector: 'prices' },
  w: { sym: 'W', sector: 'prices' },
  wP: { sym: 'W/P', sector: 'prices' },
  L: { sym: 'L', sector: 'prices' },
  A: { sym: 'A', sector: 'prices' },
  Ystar: { sym: 'Y*', sector: 'prices' },
  AS: { sym: 'AS', sector: 'prices' },
  gap: { sym: 'Y−Y*', sector: 'real', hint: 'פער תוצר' },
  NX: { sym: 'TB', sector: 'open' },
  X: { sym: 'X', sector: 'open' },
  IM: { sym: 'IM', sector: 'open' },
  e: { sym: 'E', sector: 'open' },
  eps: { sym: 'e', sector: 'open' },
  KF: { sym: 'KA', sector: 'open', hint: 'תנועות הון: ↑ כניסה, ↓ יציאה' },
  Res: { sym: 'Res', sector: 'open', hint: 'יתרות מט״ח' },
  rStar: { sym: 'i*', sector: 'open' },
  Pstar: { sym: 'P*', sector: 'open' },
  aStar: { sym: 'a*', sector: 'open' },
  K: { sym: 'K', sector: 'prices' },
  rT: { sym: 'ī', sector: 'monetary', hint: 'ריבית היעד' },
  Yf: { sym: 'Yᶠ', sector: 'open', hint: 'תוצר בחו״ל' },
  Mf: { sym: 'M*', sector: 'open' },
  Gf: { sym: 'G*', sector: 'open' },
  Ee: { sym: 'ΔEᵉ', sector: 'open', hint: 'פיחות צפוי' },
  bandLo: { sym: 'E_low', sector: 'open', hint: 'הגבול התחתון של רצועת הניוד' },
  bandHi: { sym: 'E_high', sector: 'open', hint: 'הגבול העליון של רצועת הניוד' },
};

const n = (v, s, note, extra = {}) => ({ v, s, note, ...extra });
const c = (v, note) => ({ v, calc: true, note });

/** Closed-economy impact chains (also the core of imperfect-mobility chains). */
const CLOSED = {
  G: [n('G', 1), n('Y', 1, 'מכפיל'), n('C', 1), n('Md', 1), n('r', 1), n('I', -1, 'דחיקה')],
  T: [n('T', 1), n('Yd', -1), n('C', -1), n('Y', -1), n('Md', -1), n('r', -1), n('I', 1)],
  M: [n('M', 1), n('MP', 1), n('r', -1), n('I', 1), n('Y', 1, 'מכפיל'), n('C', 1)],
  L0: [n('Md', 1, 'העדפת נזילות'), n('r', 1), n('I', -1), n('Y', -1), n('C', -1)],
  C0: [n('C0', 1), n('C', 1), n('Y', 1, 'מכפיל'), n('Md', 1), n('r', 1), n('I', -1)],
  I0: [n('MPKe', 1), n('I', 1), n('Y', 1, 'מכפיל'), n('C', 1), n('Md', 1), n('r', 1)],
  A: [n('A', 1), n('Ystar', 1, 'תוצר פוטנציאלי'), n('L', -1, 'פחות עבודה לאותו Y')],
  K: [n('K', 1), n('Ystar', 1, 'תוצר פוטנציאלי'), n('L', -1, 'פחות עבודה לאותו Y')],
  W: [n('w', 0, 'החוזים החדשים ייכנסו לתוקף בטווח הקצר'), n('Y', 0, 'עדיין ללא שינוי')],
};

/**
 * Closed economy with an interest-rate instrument (Lecture 5): the central bank
 * keeps r at its target through open market operations, so M absorbs the shock.
 */
const RATE_RULE = {
  rT: [n('rT', 1, 'יעד הריבית'), n('M', -1, 'פעולות בשוק הפתוח'), n('r', 1), n('I', -1), n('Y', -1, 'מכפיל'), n('C', -1)],
  G: [n('G', 1), n('Y', 1, 'מכפיל מלא'), n('Md', 1), c('M', 'הבנק מגדיל M'), c('r', 'נשמרת ביעד'), c('I', 'אין דחיקה')],
  T: [n('T', 1), n('Yd', -1), n('C', -1), n('Y', -1), n('Md', -1), c('M'), c('r', 'נשמרת ביעד')],
  L0: [n('Md', 1, 'העדפת נזילות'), c('M', 'הבנק מספק נזילות'), c('r', 'נשמרת ביעד'), c('Y')],
  C0: [n('C0', 1), n('C', 1), n('Y', 1, 'מכפיל מלא'), n('Md', 1), c('M'), c('r', 'נשמרת ביעד'), c('I')],
  I0: [n('MPKe', 1), n('I', 1), n('Y', 1, 'מכפיל מלא'), n('Md', 1), c('M'), c('r', 'נשמרת ביעד')],
};

/** Fixed exchange rate, perfect capital mobility (Lecture 8). */
const FIXED_PERFECT = {
  G: [n('G', 1), n('Y', 1, 'מכפיל מלא'), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('Res', 1, 'הבנק קונה מט״ח'), n('M', 1, 'LM עוקבת אחרי IS'), n('IM', 1)],
  T: [n('T', 1), n('Yd', -1), n('C', -1), n('Y', -1), n('Md', -1), n('KF', -1, 'יציאת הון'), n('Res', -1), n('M', -1)],
  M: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('Res', -1, 'הבנק מוכר מט״ח'), n('M', -1, 'קיזוז מלא'), n('Y', 0, 'ללא שינוי')],
  L0: [n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1, 'היצע הכסף מתאים את עצמו'), n('Y', 0)],
  C0: [n('C0', 1), n('C', 1), n('Y', 1), n('Md', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1)],
  I0: [n('MPKe', 1), n('I', 1), n('Y', 1), n('Md', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1)],
  e: [n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  rStar: [n('rStar', 1), n('KF', -1, 'יציאת הון'), n('Res', -1), n('M', -1), n('r', 1), n('I', -1), n('Y', -1)],
  Pstar: [n('Pstar', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  aStar: [n('aStar', 1), n('X', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  A: CLOSED.A,
  // Band edge moved past the current rate (learning center 7): the central bank
  // must trade foreign currency at the new edge, exactly like a devaluation.
  bandLo: [n('bandLo', 1, 'גבול חדש'), n('e', 1, 'הבנק קונה מט״ח'), n('Res', 1), n('M', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
  bandHi: [n('bandHi', 1, 'גבול חדש'), n('e', 1, 'הבנק מוכר מט״ח'), n('Res', 1), n('M', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
};

/** Floating exchange rate, perfect capital mobility (Lectures 9, 12). */
const FLOAT_PERFECT = {
  G: [n('G', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', -1, 'ΔTB = −ΔG'), n('Y', 0, 'דחיקה מלאה דרך TB')],
  T: [n('T', 1), n('C', -1), n('Md', -1), n('rp', -1), n('KF', -1), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 0)],
  M: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
  L0: [n('Md', 1), n('rp', 1), n('KF', 1), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', -1), n('Y', -1)],
  C0: [n('C0', 1), n('C', 1), n('Md', 1), n('rp', 1), n('KF', 1), n('e', -1, 'ייסוף'), n('NX', -1), n('Y', 0)],
  I0: [n('MPKe', 1), n('I', 1), n('Md', 1), n('rp', 1), n('KF', 1), n('e', -1, 'ייסוף'), n('NX', -1), n('Y', 0)],
  rStar: [n('rStar', 1), n('r', 1), n('I', -1), n('KF', -1, 'יציאת הון'), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1)],
  Pstar: [n('Pstar', 1), n('e', -1, 'ייסוף פרופורציונלי'), n('eps', 0, 'ללא שינוי'), n('Y', 0, 'בידוד מלא')],
  aStar: [n('aStar', 1), n('X', 1, 'לחץ', { pressure: true, keep: true }), n('Md', 1), n('KF', 1), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', 0), n('Y', 0)],
  A: CLOSED.A,
  // The band moved but the rate is still inside it: nothing happens.
  bandLo: [n('bandLo', 1, 'הגבול זז'), n('e', 0, 'עדיין בתוך הרצועה'), n('Y', 0, 'ללא השפעה')],
  bandHi: [n('bandHi', 1, 'הגבול זז'), n('e', 0, 'עדיין בתוך הרצועה'), n('Y', 0, 'ללא השפעה')],
};

/** Tails appended to closed-economy chains when capital mobility is imperfect. */
const tailFloatImperfect = [n('IM', 'Y'), c('e'), c('eps'), c('NX')];
const tailFixedImperfect = [c('KF'), c('Res'), c('M'), c('NX')];

const IMPERFECT_OPEN = {
  e: [n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), c('Y'), c('r'), c('Res')],
  rStar: [n('rStar', 1), c('KF'), c('r'), c('I'), c('e'), c('Y')],
  Pstar: [n('Pstar', 1), c('e'), c('eps'), c('NX'), c('Y')],
  aStar: [n('aStar', 1), n('X', 1), c('NX'), c('Y'), c('e'), c('r')],
};

export const SHOCK_TITLES = {
  G: 'הרחבה פיסקלית (G)',
  T: 'שינוי מיסים (T)',
  M: 'שינוי בכמות הכסף (M)',
  L0: 'זעזוע בביקוש לכסף (L₀)',
  C0: 'שינוי בציפיות להכנסה העתידית ((Y−T)ᶠ)',
  I0: 'זעזוע בציפיות המשקיעים (MPKᵉ)',
  A: 'זעזוע היצע (A)',
  e: 'פיחות יזום (E)',
  rStar: 'שינוי בריבית העולמית (i*)',
  Pstar: 'שינוי במחירי חו״ל (P*)',
  aStar: 'שינוי בביקוש העולמי (a*)',
  Ee: 'שינוי בציפיות לשע״ח (ΔEᵉ)',
  Mf: 'הרחבה מוניטרית בחו״ל (M*)',
  Gf: 'הרחבה פיסקלית בחו״ל (G*)',
  K: 'שינוי במלאי ההון (K)',
  W: 'שינוי בשכר הנומינלי בחוזים (W)',
  rT: 'שינוי בריבית היעד (ī)',
  bandLo: 'הזזת הגבול התחתון של רצועת הניוד',
  bandHi: 'הזזת הגבול העליון של רצועת הניוד',
};

/**
 * Two-economy world (Lecture 12). The head of each chain is theory; the tail
 * (world rate, exchange rate, trade, output at home and abroad) is read from
 * the solved model, because its signs depend on relative size and the regime.
 */
const worldTail = (fixed) => [
  c('rStar', 'ריבית עולמית'),
  ...(fixed ? [c('Res'), c('M')] : [c('e'), c('eps')]),
  c('NX'),
  c('Y'),
  c('Yf'),
];
const LARGE_HEAD = {
  G: [n('G', 1), n('Y', 1, 'מכפיל'), n('Md', 1), n('rp', 1)],
  T: [n('T', 1), n('Yd', -1), n('C', -1), n('Md', -1)],
  M: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון')],
  L0: [n('Md', 1, 'העדפת נזילות'), n('rp', 1)],
  C0: [n('C0', 1), n('C', 1), n('Md', 1)],
  I0: [n('MPKe', 1), n('I', 1), n('Md', 1)],
  Mf: [n('Mf', 1, 'הבנק המרכזי הזר')],
  Gf: [n('Gf', 1, 'הממשלה הזרה')],
  e: [n('e', 1, 'פיחות'), n('eps', 1)],
  Ee: [n('Ee', 1, 'פיחות צפוי'), n('r', 1, 'i = i* + ΔEᵉ')],
};
const LARGE_NOTE = {
  G: 'משק גדול: ההרחבה מעלה גם את הריבית העולמית (CM זזה למעלה), אבל פחות ממשק סגור. התוצר עולה בשני המשקים.',
  M: 'משק גדול: ההרחבה מורידה גם את הריבית העולמית. הפיחות מעביר ביקוש מחו״ל, ולכן התוצר בחו״ל יורד.',
  Mf: 'הרחבה מוניטרית בחו״ל מורידה את הריבית העולמית ומייסף את המטבע המקומי. התוצר המקומי יורד: מכאן הפיתוי להגיב בהרחבה משלנו ("מלחמת מטבעות") וההצדקה לתיאום בין בנקים מרכזיים.',
  Gf: 'הרחבה פיסקלית בחו״ל מעלה את הריבית העולמית ומפחתת את המטבע המקומי. היצוא שלנו גדל.',
};
/** Two-economy world with the home currency pegged: home money adjusts through reserves. */
const LARGE_NOTE_FIXED = {
  M: 'שע״ח קבוע: גם במשק גדול ההרחבה מתקזזת דרך מכירת מט״ח, ו-M חוזר לרמתו. נשארת רק ירידה ביתרות.',
  Mf: 'הרחבה בחו״ל מורידה את הריבית העולמית. כדי לשמור על השער הבנק המקומי קונה מט״ח, ו-M המקומי עולה: המדיניות המוניטרית מיובאת.',
  Gf: 'הרחבה פיסקלית בחו״ל מעלה את הריבית העולמית. כדי לשמור על השער הבנק המקומי מוכר מט״ח, ו-M המקומי יורד.',
};
const EXPECT_SMALL = {
  floating: [n('Ee', 1, 'פיחות צפוי'), n('r', 1, 'i = i* + ΔEᵉ'), n('I', -1), c('e'), c('NX'), c('Y')],
  fixed: [n('Ee', 1, 'חשש מפיחות'), n('r', 1, 'i = i* + ΔEᵉ'), n('KF', -1, 'יציאת הון'), c('Res'), c('M'), c('I'), c('Y')],
};

function templateFor(shock, settings, params) {
  if (shock === 'W') {
    return {
      nodes: CLOSED.W,
      note: 'בטווח המיידי המחירים קבועים, ולכן לחוזי השכר החדשים אין עדיין השפעה על Y. ההשפעה תופיע כשהמחירים יתעדכנו.',
    };
  }
  if (settings.economy === 'closed' && settings.instrument === 'r' && RATE_RULE[shock]) {
    return {
      nodes: RATE_RULE[shock],
      note: 'הבנק המרכזי קובע ריבית: הוא קונה או מוכר אג״ח עד שהריבית ביעד, ולכן M משתנה במקום i. מלאי הכסף שנקבע כך נשאר קבוע בהמשך.',
    };
  }
  if (settings.economy === 'closed') return { nodes: CLOSED[shock], note: null };
  const fixedRegime = settings.regime === 'fixed';
  if (isLarge(settings)) {
    if (shock === 'A' || shock === 'K') return { nodes: CLOSED[shock], note: null };
    const head = LARGE_HEAD[shock];
    if (!head) return { nodes: null, note: null };
    return { nodes: [...head, ...worldTail(fixedRegime)], note: (fixedRegime ? LARGE_NOTE_FIXED : LARGE_NOTE)[shock] || null };
  }
  if (shock === 'Ee') {
    return {
      nodes: EXPECT_SMALL[fixedRegime ? 'fixed' : 'floating'],
      note: fixedRegime
        ? 'חשש מפיחות מחייב ריבית גבוהה יותר כדי להחזיק במטבע המקומי. הבנק המרכזי מאבד יתרות כדי להגן על השער.'
        : 'UIP: ציפייה לפיחות מעלה את הריבית המקומית מעל i*. ציפייה לייסוף (ΔEᵉ < 0) מורידה אותה, ולכן מחלישה הרחבה מוניטרית בטווח המיידי (הרצאה 9).',
    };
  }
  const kap = kappaOf(settings, params);
  const fixed = settings.regime === 'fixed';
  if (kap === Infinity) {
    return { nodes: (fixed ? FIXED_PERFECT : FLOAT_PERFECT)[shock], note: null };
  }
  const note =
    settings.mobility === 'none'
      ? 'ללא ניידות הון: הריבית המקומית נקבעת בשוק הכסף; ' +
        (fixed ? 'היתרות זורמות דרך מאזן הסחר עד ש-TB = 0.' : 'שע״ח מתאים את עצמו כך ש-TB = 0.')
      : 'ניידות הון חלקית: התוצאה בין משק סגור למשק עם ניידות מלאה. כיוון חלק מהמשתנים נקבע מהמודל הפתור.';
  if (IMPERFECT_OPEN[shock]) return { nodes: IMPERFECT_OPEN[shock], note };
  const core = CLOSED[shock];
  if (!core) return { nodes: null, note };
  if (shock === 'A' || shock === 'K') return { nodes: core, note };
  if (shock === 'M' && fixed) {
    return {
      nodes: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('Res', -1), c('M', 'קיזוז'), c('Y')],
      note,
    };
  }
  return { nodes: [...core, ...(fixed ? tailFixedImperfect : tailFloatImperfect)], note };
}

/** Value of a computable node in a snapshot (null for conceptual nodes). */
function valueOf(key, snap) {
  switch (key) {
    case 'Res':
      return snap.reservesDelta;
    case 'KF':
      return snap.KA;
    case 'Yd':
      return snap.Y - snap.T;
    case 'rp':
    case 'Md':
    case 'MPKe':
    case 'AS':
      return null;
    case 'C0':
      return snap.exo.C0;
    case 'A':
      return snap.exo.A;
    case 'rStar':
      return snap.exo.rStar;
    case 'Pstar':
      return snap.exo.Pstar;
    case 'aStar':
      return snap.exo.aStar;
    case 'Mf':
      return snap.Mf ?? null;
    case 'Gf':
      return snap.Gf ?? null;
    case 'Ee':
      return snap.Ee;
    case 'K':
      return snap.exo.K;
    default:
      return typeof snap[key] === 'number' ? snap[key] : null;
  }
}

function deltaSign(key, from, to) {
  const a = valueOf(key, from);
  const b = valueOf(key, to);
  if (a == null || b == null) return null;
  return sgn(b - a, 1e-6 * (1 + Math.abs(a)));
}

/** Direction words in node notes, and their opposites. */
const OPPOSITE = {
  'כניסת הון': 'יציאת הון',
  'יציאת הון': 'כניסת הון',
  פיחות: 'ייסוף',
  ייסוף: 'פיחות',
  'הבנק קונה מט״ח': 'הבנק מוכר מט״ח',
  'הבנק מוכר מט״ח': 'הבנק קונה מט״ח',
  'פיחות צפוי': 'ייסוף צפוי',
  'חשש מפיחות': 'ציפייה לייסוף',
  'ייסוף פרופורציונלי': 'פיחות פרופורציונלי',
  'גבול חדש': 'גבול חדש',
};
const SIGN_NUM = { '+': 1, '−': -1, '=': 0, '?': '?' };
const FIELD = { Res: 'reservesDelta' };

/**
 * Make chain nodes agree with the solved model: directions of computable
 * variables come from the robust sign tables (`signs`: field -> sign), and
 * direction words in the notes follow the final direction.
 */
function reconcile(nodes, signs, onlyUnknown = false) {
  return nodes.map((nd, i) => {
    let { dir, note } = nd;
    const field = FIELD[nd.key] ?? nd.key;
    const s = signs && i > 0 && !nd.keep ? signs[field] : null;
    if (s != null && (!onlyUnknown || s === '?')) dir = SIGN_NUM[s];
    // Notes are written for the direction the template gives for an increase.
    if (note && OPPOSITE[note] && nd.template) {
      if (dir === -nd.template) note = OPPOSITE[note];
      else if (dir !== nd.template) note = undefined;
    }
    return { ...nd, dir, note };
  });
}

/** Resolve a template into concrete nodes with directions. */
function resolve(nodes, shockSign, from, to, ySign) {
  return nodes.map((node) => ({ ...resolveOne(node, shockSign, from, to, ySign), shockSign }));
}

function resolveOne(node, shockSign, from, to, ySign) {
  {
    let dir;
    if (node.calc) {
      dir = deltaSign(node.v, from, to) ?? 0;
    } else if (node.s === 'Y') {
      dir = ySign;
    } else {
      dir = node.s * shockSign;
    }
    // `template`: the direction theory gives for an increase; used to flip direction words.
    return {
      key: node.v,
      ...NODE_META[node.v],
      dir,
      template: typeof node.s === 'number' ? node.s : null,
      note: node.note || NODE_META[node.v]?.hint,
      pressure: node.pressure,
      keep: node.keep,
    };
  }
}

/**
 * Build the chains to display for a given step.
 * Returns [{ id, title, horizon, nodes, note }].
 */
export function buildChains(scenario, step, { isolated = null, combined = null } = {}) {
  const out = buildRaw(scenario, step);
  const assumed = activeAssumptions(scenario.settings);
  const band = scenario.settings.regime === 'band';
  return out.map((ch) => {
    // Step 1: each chain shows its own shock in isolation (robust signs of that shock alone).
    // Later steps: mark directions that depend on sizes with "?".
    let nodes = step === 1 ? reconcile(ch.nodes, isolated?.[ch.id] ?? combined?.[step]) : reconcile(ch.nodes, combined?.[step], true);
    nodes = nodes.map((nd) => {
      // Money demand does not react to Y when k = 0.
      if (nd.key === 'Md' && assumed.includes('noYMoney') && ch.id !== 'L0') return { ...nd, dir: 0, note: 'לא תלוי ב-Y' };
      // At the edge of a band intervention offsets only part of the pressure.
      if (band && (nd.note === 'קיזוז מלא' || nd.note === 'מכפיל מלא')) return { ...nd, note: undefined };
      return nd;
    });
    return { ...ch, nodes };
  });
}

function buildRaw(scenario, step) {
  const { snapshots, shocks, params, activeShocks } = scenario;
  if (step === 0 || activeShocks.length === 0) return [];
  // Under a band, chains follow the regime operating at this step.
  const settings = effectiveSettings(scenario.settings, snapshots[step]);
  const bandNote =
    scenario.settings.regime === 'band'
      ? snapshots[step].band === 'inside'
        ? 'שע״ח בתוך רצועת הניוד, ולכן המשק מתנהג כמו בשע״ח נייד.'
        : 'שע״ח הגיע לקצה רצועת הניוד: הבנק המרכזי קונה או מוכר מט״ח, ולכן המשק מתנהג כמו בשע״ח קבוע.'
      : null;
  const withBand = (note) => (bandNote ? (note ? `${note} ${bandNote}` : bandNote) : note);
  const [t0, sr, mr, lr] = snapshots;
  const single = activeShocks.length === 1;
  const chains = [];

  if (step === 1) {
    if (settings.school === 'classical') {
      chains.push({
        id: 'classical',
        title: 'גישה קלאסית: מחירים ושכר גמישים',
        horizon: 'sr',
        nodes: [
          { key: 'P', ...NODE_META.P, dir: sgn(sr.P - t0.P, 1e-6) },
          { key: 'w', ...NODE_META.w, dir: sgn(sr.w - t0.w, 1e-6) },
          { key: 'Y', ...NODE_META.Y, dir: sgn(sr.Y - t0.Y, 1e-6), note: 'Y = Y*' },
        ],
        note: 'עקומת AS אנכית: זעזועי ביקוש משנים רק מחירים. הכסף נייטרלי כבר בטווח המיידי.',
      });
    }
    for (const id of activeShocks) {
      const { nodes, note } = templateFor(id, settings, params);
      if (!nodes) continue;
      const shockSign = Math.sign(shocks[id]);
      const ySign = sgn(sr.Y - t0.Y, 1e-6);
      chains.push({
        id,
        title: SHOCK_TITLES[id] + (single ? '' : ' (ערוץ בבידוד)'),
        horizon: 'sr',
        nodes: resolve(nodes, shockSign, t0, sr, ySign),
        note:
          id === 'A' || id === 'K'
            ? 'בטווח המיידי המחירים קשיחים והתוצר נקבע לפי הביקוש. השפעת ההיצע תופיע כשהמחירים יתעדכנו.'
            : id === 'M' && sr.zlb
              ? 'מלכודת נזילות: הריבית כבר באפס, הכסף הנוסף נאגר ואינו מוריד ריבית.'
              : withBand(note),
      });
    }
    return chains;
  }

  // Steps 2-3. If expectations fade at the same time as prices adjust, split the
  // change in two: expectations fade at the old prices (prev -> expectOnly, AD
  // shifts), then prices adjust along the new AD (expectOnly -> current).
  const key = step === 2 ? 'mr' : 'lr';
  const prev = step === 2 ? sr : mr;
  const cur = step === 2 ? mr : lr;
  const split = scenario.expectOnly?.[key];
  // Without fading expectations the whole change is a price movement: prev -> cur.
  const mid = split || prev;
  const expectChain = split
    ? {
        id: `${key}-expect`,
        title: 'הציפיות לשינוי בשע״ח דועכות',
        horizon: key,
        nodes: [
          { key: 'Ee', ...NODE_META.Ee, dir: -Math.sign(scenario.shocks.Ee), note: 'מתקרב לאפס' },
          ...['r', 'rStar', ...(settings.regime === 'fixed' ? ['Res', 'M'] : ['e', 'eps']), 'NX', 'Y', 'Yf']
            .filter((v) => valueOf(v, cur) != null && (v !== 'rStar' || isLarge(settings)))
            .map((v) => ({ key: v, ...NODE_META[v], dir: deltaSign(v, prev, mid) ?? 0 })),
        ],
        note: 'השפעת הציפיות בלבד, במחירים של הטווח הקודם: i מתקרבת חזרה ל-i* ו-AD זזה.',
      }
    : null;

  if (step === 3 && lr.noEq) {
    const trap = sr.zlb || mr.zlb || scenario.needsNegativeRate;
    const vertical = activeAssumptions(settings).some((a) => a === 'realM' || a === 'flatLM');
    if (vertical) {
      return [
        {
          id: 'lr-none',
          title: 'אין שיווי משקל בטווח הבינוני: AD אנכית',
          horizon: 'lr',
          nodes: [
            { key: 'w', ...NODE_META.w, dir: sgn(mr.Y - mr.Ystar, 1e-6), note: 'עדכון חוזים' },
            { key: 'P', ...NODE_META.P, dir: sgn(mr.Y - mr.Ystar, 1e-6) },
            { key: 'Y', ...NODE_META.Y, dir: 0, note: 'AD אנכית' },
          ],
          note: 'שינוי ב-P לא משנה את הביקוש (M/P קבוע או LM אופקית), ולכן עדכון השכר מזיז רק את המחירים ו-Y לא חוזר ל-Y*.',
        },
      ];
    }
    return [
      {
        id: 'lr-none',
        title: 'אין שיווי משקל בטווח הבינוני',
        horizon: 'lr',
        nodes: trap
          ? [
              { key: 'P', ...NODE_META.P, dir: -1 },
              { key: 'MP', ...NODE_META.MP, dir: 1 },
              { key: 'r', ...NODE_META.r, dir: 0, note: 'i = 0' },
              { key: 'Y', ...NODE_META.Y, dir: 0, note: 'AD אנכית' },
            ]
          : [{ key: 'MP', ...NODE_META.MP, dir: -1, note: 'נדרש M/P שלילי' }],
        note: trap
          ? 'ירידת מחירים מגדילה את M/P, אבל בריבית אפס זה לא מגדיל ביקוש. נדרשת מדיניות פיסקלית.'
          : 'כדי להחזיר את התוצר לפוטנציאל הריבית הייתה צריכה לעלות עד שהביקוש לכסף שלילי. הזעזוע גדול מדי למודל הליניארי בפרמטרים האלה.',
      },
    ];
  }

  const sigma = sgn(cur.P - prev.P, 1e-6);
  const sigmaPrice = sigma;
  const classical = settings.school === 'classical';

  if (step === 2) {
    if (sigmaPrice === 0 || classical) {
      chains.push({
        id: 'mr-none',
        title: classical && sigma !== 0 ? 'מחירים גמישים מגיבים לציפיות' : 'אין התאמת מחירים',
        horizon: 'mr',
        nodes: [{ key: 'P', ...NODE_META.P, dir: classical ? sigma : 0 }],
        note:
          settings.school === 'extreme'
            ? 'קיינסיאני קיצוני: AS אופקית, המחירים קבועים.'
            : classical
              ? 'בגישה הקלאסית ההתאמה כבר הושלמה; רק שינוי בביקוש (כאן: דעיכת הציפיות) מזיז מחירים.'
              : 'הביקוש לא השתנה, ולכן אין לחץ על המחירים.',
      });
      if (expectChain) chains.push(expectChain);
      return chains;
    }
    if (expectChain) chains.push(expectChain);
    chains.push({
      id: 'mr-demand',
      title: split ? 'התאמת מחירים לאורך ה-AD החדש' : 'התאמת מחירים: ערוץ הביקוש',
      horizon: 'mr',
      nodes: demandChannel(settings, params, sigmaPrice, mid, cur),
      note: withBand(null),
    });
    const wMoved = sgn(cur.w - prev.w, 1e-6);
    chains.push({
      id: 'mr-supply',
      title: wMoved ? 'החוזים החדשים נכנסים לתוקף' : 'שוק העבודה: השכר הנומינלי עדיין קבוע בחוזה',
      horizon: 'mr',
      nodes: [
        ...(wMoved ? [{ key: 'w', ...NODE_META.w, dir: wMoved, note: 'חוזה חדש' }, { key: 'AS', ...NODE_META.AS, dir: -wMoved, note: wMoved > 0 ? 'AS זזה שמאלה' : 'AS זזה ימינה' }] : []),
        { key: 'P', ...NODE_META.P, dir: sigma },
        { key: 'wP', ...NODE_META.wP, dir: sgn(cur.wP - prev.wP, 1e-6), note: wMoved ? (sgn(cur.wP - prev.wP, 1e-6) === wMoved ? 'W זז יותר מ-P' : undefined) : 'W קבוע' },
        { key: 'L', ...NODE_META.L, dir: sgn(cur.L - prev.L, 1e-6), note: 'לאורך Lᵈ' },
        { key: 'Y', ...NODE_META.Y, dir: sgn(cur.Y - prev.Y, 1e-6), note: wMoved ? undefined : 'תנועה לאורך SRAS' },
      ],
      note: null,
    });
    return chains;
  }

  // step 3: long run
  const g = classical ? 0 : sgn(prev.Y - lr.Ystar, 1e-6 * lr.Ystar);
  if (g === 0) {
    return [
      {
        id: 'lr-none',
        title: 'המשק כבר בתוצר הפוטנציאלי',
        horizon: 'lr',
        nodes: [{ key: 'gap', ...NODE_META.gap, dir: 0 }],
        note: classical ? 'בגישה הקלאסית התוצר תמיד בפוטנציאל.' : 'אין פער תוצר, ולכן אין לחץ לעדכון שכר.',
      },
      ...(expectChain ? [expectChain] : []),
    ];
  }
  return [
    ...(expectChain ? [expectChain] : []),
    {
      id: 'lr-wages',
      title: 'עדכון חוזי השכר',
      horizon: 'lr',
      nodes: [
        { key: 'gap', ...NODE_META.gap, dir: g, note: g > 0 ? 'Y מעל Y* (רמה)' : 'Y מתחת ל-Y* (רמה)' },
        { key: 'w', ...NODE_META.w, dir: deltaSign('w', mr, lr) ?? g, note: 'חוזה חדש' },
        { key: 'AS', ...NODE_META.AS, dir: -g, note: g > 0 ? 'SRAS זזה שמאלה' : 'SRAS זזה ימינה' },
        { key: 'L', ...NODE_META.L, dir: deltaSign('L', mr, lr) ?? -g, note: 'חזרה ל-L*' },
        // Net price change; with fading expectations AD shifts too, so it can differ from the AS push alone.
        {
          key: 'P',
          ...NODE_META.P,
          dir: sigma,
          note: sigma === g ? undefined : split ? 'נטו, כולל דעיכת הציפיות' : isLarge(settings) ? 'נטו, כולל ההתאמה בחו״ל' : 'נטו',
        },
      ],
      note: null,
    },
    {
      id: 'lr-demand',
      title: split ? 'חזרה לתוצר הפוטנציאלי לאורך ה-AD החדש' : 'חזרה לתוצר הפוטנציאלי דרך ערוץ הביקוש',
      horizon: 'lr',
      nodes: demandChannel(settings, params, sigma, mid, lr),
      note: withBand(neutralityNote(scenario)),
    },
  ];
}

/** P change transmitted to demand, by regime. */
function demandChannel(settings, params, sigma, from, to) {
  const d = (key) => {
    const s = deltaSign(key, from, to);
    return { key, ...NODE_META[key], dir: s ?? 0 };
  };
  const P = { key: 'P', ...NODE_META.P, dir: sigma };
  if (settings.economy === 'closed') {
    return [P, { ...d('MP') }, d('r'), d('I'), d('Y'), d('C')];
  }
  const kap = kappaOf(settings, params);
  if (isLarge(settings)) {
    // Both price levels adjust; the foreign economy reacts through r* and trade.
    return settings.regime === 'fixed'
      ? [P, d('Pstar'), d('eps'), d('NX'), d('Y'), d('M'), d('rStar'), d('Yf')]
      : [P, d('Pstar'), d('MP'), d('rStar'), d('e'), d('eps'), d('NX'), d('Y'), d('Yf')];
  }
  if (settings.regime === 'fixed') {
    if (kap === Infinity) return [P, d('eps'), d('NX'), d('Y'), d('M'), d('Res')];
    return [P, d('eps'), d('NX'), d('r'), d('I'), d('Y'), d('M')];
  }
  if (kap === Infinity) {
    return [
      P,
      d('MP'),
      { key: 'rp', ...NODE_META.rp, dir: sigma },
      { key: 'KF', ...NODE_META.KF, dir: sigma },
      d('e'),
      d('eps'),
      d('NX'),
      d('Y'),
    ];
  }
  return [P, d('MP'), d('r'), d('I'), d('e'), d('eps'), d('NX'), d('Y')];
}

function neutralityNote(scenario) {
  const { activeShocks, snapshots } = scenario;
  const [t0, , , lr] = snapshots;
  if (activeShocks.length === 1 && activeShocks[0] === 'M') {
    if (Math.abs(lr.MP - t0.MP) < 1e-6 * t0.MP)
      return 'נייטרליות הכסף: M/P, i, Y ו-W/P חזרו לערכם ההתחלתי. רק המשתנים הנומינליים השתנו.';
  }
  return null;
}
