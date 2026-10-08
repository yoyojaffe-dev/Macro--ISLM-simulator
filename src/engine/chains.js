/**
 * Transmission chains.
 *
 * Immediate-run chains come from theory templates keyed by shock and regime,
 * in the order the lectures narrate them. A node either has a theoretical sign
 * relative to the shock (`s`) or is marked `calc`, meaning its direction is
 * read from the solved model (used where theory leaves the sign to the
 * parameters, e.g. the two-economy world).
 *
 * Short- and medium-run chains are generated from the computed price change,
 * wage change and output gap, so they always agree with the charts. Every
 * chain is then reconciled with the robust sign table: a node whose sign the
 * table reports as "?" shows "?", and a note that no longer describes the
 * node's direction is flipped (direction words) or dropped (mechanisms).
 */
import { kappaOf, sgn, isLarge, effectiveSettings, buildScenario } from './model.js';
import { activeAssumptions, ZERO_SHOCKS } from './constants.js';

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
  Ystar: { sym: 'Y*', sector: 'real' },
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
  Ee: { sym: 'ΔEᵉ', sector: 'open' },
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
  T: [n('T', 1), n('Yd', -1), n('C', -1), n('Y', -1), n('Md', -1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('Res', -1), n('M', -1)],
  M: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('Res', -1, 'הבנק מוכר מט״ח'), n('M', 0, 'קיזוז מלא'), n('Y', 0, 'ללא שינוי')],
  L0: [n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1, 'היצע הכסף מתאים את עצמו'), n('Y', 0)],
  C0: [n('C0', 1), n('C', 1), n('Y', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1)],
  I0: [n('MPKe', 1), n('I', 1), n('Y', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('Res', 1), n('M', 1)],
  e: [n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  rStar: [n('rStar', 1), n('KF', -1, 'יציאת הון'), n('Res', -1), n('M', -1), n('r', 1), n('I', -1), n('Y', -1)],
  Pstar: [n('Pstar', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  aStar: [n('aStar', 1), n('X', 1), n('NX', 1), n('Y', 1), n('Md', 1), n('Res', 1), n('M', 1)],
  A: CLOSED.A,
  // Band edge moved past the current rate (learning center 7): the central bank
  // must trade foreign currency at the new edge, exactly like a devaluation.
  // Notes are written for an increase of the node (E↑: the bank buys).
  bandLo: [n('bandLo', 1, 'גבול חדש'), n('e', 1, 'הבנק קונה מט״ח'), n('Res', 1), n('M', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
  bandHi: [n('bandHi', 1, 'גבול חדש'), n('e', 1, 'הבנק קונה מט״ח'), n('Res', 1), n('M', 1), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
};

/** Floating exchange rate, perfect capital mobility (Lectures 9, 12). */
const FLOAT_PERFECT = {
  G: [n('G', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', -1, 'ΔTB = −ΔG'), n('Y', 0, 'דחיקה מלאה דרך TB')],
  T: [n('T', 1), n('C', -1), n('Md', -1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 0)],
  M: [n('M', 1), n('rp', -1), n('KF', -1, 'יציאת הון'), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1), n('C', 1)],
  L0: [n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', -1), n('Y', -1)],
  C0: [n('C0', 1), n('C', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('NX', -1), n('Y', 0)],
  I0: [n('MPKe', 1), n('I', 1), n('Md', 1), n('rp', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('NX', -1), n('Y', 0)],
  rStar: [n('rStar', 1), n('r', 1), n('I', -1), n('KF', -1, 'יציאת הון'), n('e', 1, 'פיחות'), n('eps', 1), n('NX', 1), n('Y', 1)],
  Pstar: [n('Pstar', 1), n('e', -1, 'ייסוף פרופורציונלי'), n('eps', 0, 'ללא שינוי'), n('Y', 0, 'בידוד מלא')],
  aStar: [n('aStar', 1), n('X', 1, 'לחץ', { pressure: true, keep: true }), n('Md', 1), n('KF', 1, 'כניסת הון'), n('e', -1, 'ייסוף'), n('eps', -1), n('NX', 0), n('Y', 0)],
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

/** Neutral chain titles (used where the direction is not known). */
export const SHOCK_TITLES = {
  G: 'שינוי בהוצאה הממשלתית (G)',
  T: 'שינוי מיסים (T)',
  M: 'שינוי בכמות הכסף (M)',
  L0: 'זעזוע בביקוש לכסף (L₀)',
  C0: 'שינוי בציפיות להכנסה העתידית ((Y−T)ᶠ)',
  I0: 'זעזוע בציפיות המשקיעים (MPKᵉ)',
  A: 'זעזוע היצע (A)',
  e: 'שינוי יזום בשער הקבוע (E)',
  rStar: 'שינוי בריבית העולמית (i*)',
  Pstar: 'שינוי במחירי חו״ל (P*)',
  aStar: 'שינוי בביקוש העולמי (a*)',
  Ee: 'שינוי בציפיות לשע״ח (ΔEᵉ)',
  Mf: 'שינוי בכמות הכסף בחו״ל (M*)',
  Gf: 'שינוי בהוצאה הממשלתית בחו״ל (G*)',
  K: 'שינוי במלאי ההון (K)',
  W: 'שינוי בשכר הנומינלי בחוזים (W)',
  rT: 'שינוי בריבית היעד (ī)',
  bandLo: 'הזזת הגבול התחתון של רצועת הניוד',
  bandHi: 'הזזת הגבול העליון של רצועת הניוד',
};

/** Titles by direction: [increase, decrease]. */
const DIRECTED_TITLES = {
  G: ['הרחבה פיסקלית (G↑)', 'צמצום פיסקלי (G↓)'],
  T: ['העלאת מיסים (T↑)', 'הורדת מיסים (T↓)'],
  M: ['הרחבה מוניטרית (M↑)', 'צמצום מוניטרי (M↓)'],
  e: ['פיחות יזום (E↑)', 'ייסוף יזום (E↓)'],
  rStar: ['עליית הריבית העולמית (i*↑)', 'ירידת הריבית העולמית (i*↓)'],
  Pstar: ['עליית המחירים בחו״ל (P*↑)', 'ירידת המחירים בחו״ל (P*↓)'],
  aStar: ['עלייה בביקוש העולמי (a*↑)', 'ירידה בביקוש העולמי (a*↓)'],
  Ee: ['ציפייה לפיחות (ΔEᵉ > 0)', 'ציפייה לייסוף (ΔEᵉ < 0)'],
  Mf: ['הרחבה מוניטרית בחו״ל (M*↑)', 'צמצום מוניטרי בחו״ל (M*↓)'],
  Gf: ['הרחבה פיסקלית בחו״ל (G*↑)', 'צמצום פיסקלי בחו״ל (G*↓)'],
  W: ['עלייה בשכר הנומינלי בחוזים (W↑)', 'ירידה בשכר הנומינלי בחוזים (W↓)'],
  bandLo: ['העלאת הגבול התחתון של הרצועה (E_low↑)', 'הורדת הגבול התחתון של הרצועה (E_low↓)'],
  bandHi: ['העלאת הגבול העליון של הרצועה (E_high↑)', 'הורדת הגבול העליון של הרצועה (E_high↓)'],
};
const shockTitle = (id, sign) => DIRECTED_TITLES[id]?.[sign > 0 ? 0 : 1] ?? SHOCK_TITLES[id];

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
/** Two-economy notes by direction: [increase, decrease]. */
const LARGE_NOTE = {
  G: [
    'משק גדול: ההרחבה מעלה גם את הריבית העולמית (CM זזה למעלה), אבל פחות ממשק סגור. התוצר עולה בשני המשקים.',
    'משק גדול: הצמצום מוריד גם את הריבית העולמית (CM זזה למטה), אבל פחות ממשק סגור. התוצר יורד בשני המשקים.',
  ],
  M: [
    'משק גדול: ההרחבה מורידה גם את הריבית העולמית. הפיחות מעביר ביקוש מחו״ל, ולכן התוצר בחו״ל יורד.',
    'משק גדול: הצמצום מעלה גם את הריבית העולמית. הייסוף מעביר ביקוש לחו״ל, ולכן התוצר בחו״ל עולה.',
  ],
  Mf: [
    'הרחבה מוניטרית בחו״ל מורידה את הריבית העולמית ומייסף את המטבע המקומי. התוצר המקומי יורד: מכאן הפיתוי להגיב בהרחבה משלנו ("מלחמת מטבעות") וההצדקה לתיאום בין בנקים מרכזיים.',
    'צמצום מוניטרי בחו״ל מעלה את הריבית העולמית ומפחת את המטבע המקומי. היצוא שלנו גדל והתוצר המקומי עולה, בזמן שהתוצר בחו״ל יורד.',
  ],
  Gf: [
    'הרחבה פיסקלית בחו״ל מעלה את הריבית העולמית ומפחתת את המטבע המקומי. היצוא שלנו גדל.',
    'צמצום פיסקלי בחו״ל מוריד את הריבית העולמית ומייסף את המטבע המקומי. היצוא שלנו קטן.',
  ],
};
/** Two-economy world with the home currency pegged: home money adjusts through reserves. */
const LARGE_NOTE_FIXED = {
  M: [
    'שע״ח קבוע: גם במשק גדול ההרחבה מתקזזת דרך מכירת מט״ח, ו-M חוזר לרמתו. נשארת רק ירידה ביתרות.',
    'שע״ח קבוע: גם במשק גדול הצמצום מתקזז דרך קניית מט״ח, ו-M חוזר לרמתו. נשארת רק עלייה ביתרות.',
  ],
  Mf: [
    'הרחבה בחו״ל מורידה את הריבית העולמית. כדי לשמור על השער הבנק המקומי קונה מט״ח, ו-M המקומי עולה: המדיניות המוניטרית מיובאת.',
    'צמצום בחו״ל מעלה את הריבית העולמית. כדי לשמור על השער הבנק המקומי מוכר מט״ח, ו-M המקומי יורד: המדיניות המוניטרית מיובאת.',
  ],
  Gf: [
    'הרחבה פיסקלית בחו״ל מעלה את הריבית העולמית. כדי לשמור על השער הבנק המקומי מוכר מט״ח, ו-M המקומי יורד.',
    'צמצום פיסקלי בחו״ל מוריד את הריבית העולמית. כדי לשמור על השער הבנק המקומי קונה מט״ח, ו-M המקומי עולה.',
  ],
};
const EXPECT_SMALL = {
  floating: [n('Ee', 1, 'פיחות צפוי'), n('r', 1, 'i = i* + ΔEᵉ'), n('I', -1), c('e'), c('NX'), c('Y')],
  fixed: [n('Ee', 1, 'חשש מפיחות'), n('r', 1, 'i = i* + ΔEᵉ'), n('KF', -1, 'יציאת הון'), c('Res'), c('M'), c('I'), c('Y')],
};
const EXPECT_NOTE = {
  floating: [
    'UIRP: ציפייה לפיחות מעלה את הריבית המקומית מעל i* (הרצאה 9).',
    'UIRP: ציפייה לייסוף מורידה את הריבית המקומית מתחת ל-i*, ולכן מחלישה הרחבה מוניטרית בטווח המיידי (הרצאה 9).',
  ],
  fixed: [
    'חשש מפיחות מחייב ריבית גבוהה יותר כדי להחזיק במטבע המקומי. הון יוצא, והבנק המרכזי מוכר מט״ח כדי להגן על השער: היתרות ו-M יורדים.',
    'ציפייה לייסוף מאפשרת ריבית מקומית נמוכה מ-i*. הון נכנס, והבנק המרכזי קונה מט״ח כדי לשמור על השער: היתרות ו-M עולים.',
  ],
};
const byDir = (pair, sign) => (pair ? pair[sign > 0 ? 0 : 1] : null);

function templateFor(shock, settings, params, sign) {
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
    return { nodes: [...head, ...worldTail(fixedRegime)], note: byDir((fixedRegime ? LARGE_NOTE_FIXED : LARGE_NOTE)[shock], sign) };
  }
  if (shock === 'Ee') {
    const regime = fixedRegime ? 'fixed' : 'floating';
    return { nodes: EXPECT_SMALL[regime], note: byDir(EXPECT_NOTE[regime], sign) };
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
    case 'gap':
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
  דחיקה: 'דחיקה הפוכה',
  'גבול חדש': 'גבול חדש',
  'הגבול זז': 'הגבול זז',
  'הבנק המרכזי הזר': 'הבנק המרכזי הזר',
  'הממשלה הזרה': 'הממשלה הזרה',
};
const SIGN_NUM = { '+': 1, '−': -1, '=': 0, '?': '?' };
const FIELD = { Res: 'reservesDelta' };

/**
 * Make chain nodes agree with the robust sign table (`signs`: field -> sign).
 * mode 'all': every computable node takes the table's sign (immediate run,
 * where each chain is one shock in isolation). mode 'unknown': only "?" is
 * imposed (later steps, where the chain narrates the drawn case). The shock
 * node at the head keeps its direction. Nodes that only restate another
 * node's direction (`follows`) inherit its "?".
 * Notes: a direction word is flipped when the node moves the other way; a
 * note describing a mechanism is kept only while the node moves as the theory
 * template says; nothing but a label is shown next to "?".
 */
function reconcile(nodes, signs, mode) {
  return nodes.map((nd) => {
    let { dir, note } = nd;
    if (signs && !nd.head && !nd.keep) {
      const s = signs[FIELD[nd.key] ?? nd.key];
      if (s != null && (mode === 'all' || s === '?')) dir = SIGN_NUM[s];
      if (nd.follows && signs[nd.follows] === '?') dir = '?';
    }
    const label = note && note === NODE_META[nd.key]?.hint;
    if (note && !label) {
      if (dir === '?') note = undefined;
      else if (OPPOSITE[note] && typeof nd.template === 'number' && nd.template !== 0) {
        note = dir === nd.template ? note : dir === -nd.template ? OPPOSITE[note] : undefined;
      } else if (typeof nd.template === 'number' && !nd.head && dir !== nd.template * nd.shockSign) {
        note = undefined;
      }
    }
    return { ...nd, dir, note };
  });
}

/** Resolve a template into concrete nodes with directions. */
function resolve(nodes, shockSign, from, to, ySign) {
  return nodes.map((node, i) => ({ ...resolveOne(node, shockSign, from, to, ySign), shockSign, head: i === 0 }));
}

function resolveOne(node, shockSign, from, to, ySign) {
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

/** A node computed from two snapshots (later steps). */
const nd = (key, dir, note, extra = {}) => ({ key, ...NODE_META[key], dir, note, ...extra });

/**
 * Build the chains to display for a given step.
 * Options: isolated (per shock: signs of that shock alone at step 1) and
 * signs (the full qualitative result: origin, prev, split). `combined` (the
 * prev column) is accepted for older callers.
 * Returns [{ id, title, horizon, nodes, note }].
 */
export function buildChains(scenario, step, { isolated = null, combined = null, signs = null } = {}) {
  const prev = signs?.prev ?? combined;
  const out = buildRaw(scenario, step, signs);
  const assumed = activeAssumptions(scenario.settings);
  const band = scenario.settings.regime === 'band';
  return out.map((ch) => {
    // Step 1: each chain shows its own shock in isolation (robust signs of that
    // shock alone). Later steps, and chains that only make sense for the
    // combined case, are marked "?" where the table has "?".
    let nodes;
    if (ch.signs !== undefined) nodes = reconcile(ch.nodes, ch.signs, 'unknown');
    else if (step === 1 && !ch.combinedOnly) nodes = reconcile(ch.nodes, isolated?.[ch.id] ?? prev?.[step], 'all');
    else nodes = reconcile(ch.nodes, prev?.[step], 'unknown');
    if (assumed.includes('noYMoney') && ch.id !== 'L0' && step === 1) {
      // k = 0: money demand does not react to Y, so there is no pressure on i and no capital flow.
      let after = false;
      nodes = nodes.map((x) => {
        if (x.key === 'Md') {
          after = true;
          return { ...x, dir: 0, note: 'לא תלוי ב-Y' };
        }
        if (after && (x.key === 'rp' || x.key === 'KF')) return { ...x, dir: 0, note: undefined };
        return x;
      });
    }
    // At the edge of a band intervention offsets only part of the pressure.
    if (band) nodes = nodes.map((x) => (x.note === 'קיזוז מלא' || x.note === 'מכפיל מלא' ? { ...x, note: undefined } : x));
    const { signs: _s, combinedOnly: _c, ...rest } = ch;
    return { ...rest, nodes };
  });
}

function buildRaw(scenario, step, signs) {
  const { snapshots, shocks, params, activeShocks } = scenario;
  if (step === 0 || activeShocks.length === 0) return [];
  // Under a band, chains follow the regime operating at this step.
  const settings = effectiveSettings(scenario.settings, snapshots[step]);
  const bandNoteFor = (snap) =>
    scenario.settings.regime === 'band'
      ? snap.band === 'inside'
        ? 'שע״ח בתוך רצועת הניוד, ולכן המשק מתנהג כמו בשע״ח נייד.'
        : 'שע״ח הגיע לקצה רצועת הניוד: הבנק המרכזי קונה או מוכר מט״ח, ולכן המשק מתנהג כמו בשע״ח קבוע.'
      : null;
  const join = (note, extra) => (extra ? (note ? `${note} ${extra}` : extra) : note);
  const bandNote = bandNoteFor(snapshots[step]);
  const [t0, sr, mr, lr] = snapshots;
  const single = activeShocks.length === 1;
  const chains = [];

  if (step === 1) {
    if (settings.school === 'classical') {
      chains.push({
        id: 'classical',
        title: 'גישה קלאסית: מחירים ושכר גמישים',
        horizon: 'sr',
        nodes: [nd('P', sgn(sr.P - t0.P, 1e-6)), nd('w', sgn(sr.w - t0.w, 1e-6)), nd('Y', sgn(sr.Y - t0.Y, 1e-6), 'Y = Y*')],
        note: 'עקומת AS אנכית: זעזועי ביקוש משנים רק מחירים. הכסף נייטרלי כבר בטווח המיידי.',
      });
    }
    for (const id of activeShocks) {
      const shockSign = Math.sign(shocks[id]);
      // With several shocks in a band, each one is shown under the regime it
      // would face alone (its own position in the band).
      let own = settings;
      let ownBandNote = bandNote;
      if (scenario.settings.regime === 'band' && !single) {
        const iso = buildScenario(params, scenario.settings, { ...ZERO_SHOCKS, [id]: shocks[id] }).snapshots[1];
        own = effectiveSettings(scenario.settings, iso);
        ownBandNote = bandNoteFor(iso);
      }
      const title = shockTitle(id, shockSign) + (single ? '' : ' (ערוץ בבידוד)');
      // Liquidity trap: the other shocks already pushed the rate to zero, so the
      // extra money is hoarded. (A monetary expansion that itself brings i down
      // to zero keeps the usual chain.)
      if (
        id === 'M' &&
        shockSign > 0 &&
        sr.zlb &&
        scenario.settings.economy === 'closed' &&
        buildScenario(params, scenario.settings, { ...shocks, M: 0 }).snapshots[1].zlb
      ) {
        chains.push({
          id,
          title: shockTitle(id, shockSign),
          horizon: 'sr',
          combinedOnly: true,
          nodes: [
            { ...nd('M', 1), head: true },
            nd('MP', 1),
            nd('r', 0, 'i = 0: רצפת האפס'),
            nd('I', 0),
            nd('Y', 0, 'הכסף נאגר'),
          ],
          note: 'מלכודת נזילות: הריבית באפס, והכסף הנוסף נאגר ואינו מוריד ריבית. לכן {I} ו-{Y} לא משתנים (הרצאה 5).',
        });
        continue;
      }
      const { nodes, note } = templateFor(id, own, params, shockSign);
      if (!nodes) continue;
      const ySign = sgn(sr.Y - t0.Y, 1e-6);
      chains.push({
        id,
        title,
        horizon: 'sr',
        nodes: resolve(nodes, shockSign, t0, sr, ySign),
        note:
          id === 'A' || id === 'K'
            ? 'בטווח המיידי המחירים קשיחים והתוצר נקבע לפי הביקוש. השפעת ההיצע תופיע כשהמחירים יתעדכנו.'
            : join(note, ownBandNote),
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
  const splitSigns = signs?.split;
  // Without fading expectations the whole change is a price movement: prev -> cur.
  const mid = split || prev;
  const expectChain = split
    ? {
        id: `${key}-expect`,
        title: 'הציפיות לשינוי בשע״ח דועכות',
        horizon: key,
        signs: splitSigns?.expect?.[step] ?? null,
        nodes: [
          nd('Ee', -Math.sign(scenario.shocks.Ee), 'מתקרב לאפס'),
          ...['r', 'rStar', ...(settings.regime === 'fixed' ? ['Res', 'M'] : ['e', 'eps']), 'NX', 'Y', 'Yf']
            .filter((v) => valueOf(v, cur) != null && (v !== 'rStar' || isLarge(settings)))
            .map((v) => nd(v, deltaSign(v, prev, mid) ?? 0)),
        ],
        note: 'השפעת הציפיות בלבד, במחירים של הטווח הקודם: i מתקרבת חזרה ל-i* ו-AD זזה.',
      }
    : null;
  const priceSigns = split ? splitSigns?.price?.[step] ?? null : undefined;

  if (cur.noEq) return [noEqChain(scenario, step)];

  const sigma = sgn(cur.P - prev.P, 1e-6);
  const classical = settings.school === 'classical';
  const fixedLabor = activeAssumptions(scenario.settings).includes('fixedLabor');

  if (step === 2) {
    const wMoved = sgn(cur.w - prev.w, 1e-6);
    if ((sigma === 0 && wMoved === 0) || classical) {
      chains.push({
        id: 'mr-none',
        title: classical && sigma !== 0 ? 'מחירים גמישים מגיבים לציפיות' : 'אין התאמת מחירים',
        horizon: 'mr',
        nodes: [nd('P', classical ? sigma : 0)],
        note:
          settings.school === 'extreme'
            ? 'קיינסיאני קיצוני: AS אופקית, המחירים קבועים.'
            : classical
              ? 'בגישה הקלאסית ההתאמה כבר הושלמה; רק שינוי בביקוש (כאן: דעיכת הציפיות) מזיז מחירים.'
              : 'התוצר שווה לתוצר הפוטנציאלי, ולכן אין לחץ על המחירים.',
      });
      if (expectChain) chains.push(expectChain);
      return chains;
    }
    if (expectChain) chains.push(expectChain);
    if (sigma !== 0) {
      chains.push({
        id: 'mr-demand',
        title: split ? 'התאמת מחירים לאורך ה-AD החדש' : 'התאמת מחירים: ערוץ הביקוש',
        horizon: 'mr',
        ...(priceSigns !== undefined ? { signs: priceSigns } : {}),
        nodes: demandChannel(settings, params, sigma, mid, cur),
        note: bandNote,
      });
    }
    const wpDir = sgn(cur.wP - prev.wP, 1e-6);
    chains.push({
      id: 'mr-supply',
      title: wMoved ? 'החוזים החדשים נכנסים לתוקף' : 'שוק העבודה: השכר הנומינלי עדיין קבוע בחוזה',
      horizon: 'mr',
      nodes: [
        ...(wMoved ? [nd('w', wMoved, 'חוזה חדש'), nd('AS', fixedLabor ? 0 : -wMoved, fixedLabor ? 'AS אנכית' : wMoved > 0 ? 'AS זזה שמאלה' : 'AS זזה ימינה', { follows: 'w' })] : []),
        nd('P', sigma),
        nd('wP', wpDir, wMoved ? (wpDir === wMoved ? 'W זז יותר מ-P' : undefined) : 'W קבוע'),
        nd('L', sgn(cur.L - prev.L, 1e-6), fixedLabor ? 'הביקוש לעובדים קבוע' : 'לאורך Lᵈ'),
        nd('Y', sgn(cur.Y - prev.Y, 1e-6), wMoved || fixedLabor ? undefined : 'תנועה לאורך SRAS'),
      ],
      note: fixedLabor ? 'הביקוש לעובדים לא תלוי במחירים, ולכן התוצר נשאר ב-Y* ו-AS אנכית כבר בטווח הקצר. המחירים נקבעים לפי הביקוש.' : null,
    });
    return chains;
  }

  // Step 3: medium run. Wages are re-contracted at the market level.
  const wDir = deltaSign('w', mr, lr) ?? 0;
  const g = classical ? 0 : sgn(prev.Y - lr.Ystar, 1e-6 * lr.Ystar);
  const gapUnknown = signs?.origin?.[2]?.Y === '?';
  const demand = {
    id: 'lr-demand',
    title: split ? 'חזרה לתוצר הפוטנציאלי לאורך ה-AD החדש' : 'חזרה לתוצר הפוטנציאלי דרך ערוץ הביקוש',
    horizon: 'lr',
    ...(priceSigns !== undefined ? { signs: priceSigns } : {}),
    nodes: demandChannel(settings, params, sigma, mid, lr),
    note: join(neutralityNote(scenario), bandNote),
  };
  if (wDir === 0 && g === 0) {
    const elsewhere = signs?.prev?.[3]?.w === '?' || gapUnknown;
    return [
      {
        id: 'lr-none',
        title: 'המשק כבר בתוצר הפוטנציאלי',
        horizon: 'lr',
        nodes: [nd('gap', gapUnknown ? '?' : 0)],
        note: classical
          ? 'בגישה הקלאסית התוצר תמיד בפוטנציאל.'
          : elsewhere
            ? 'בציור אין פער תוצר ואין פער בשכר הריאלי, ולכן אין לחץ לעדכון שכר. בגדלים או בשיפועים אחרים יש פער, ולכן בטבלה מופיע ?.'
            : 'אין פער תוצר ואין פער בשכר הריאלי, ולכן אין לחץ לעדכון שכר.',
      },
      ...(expectChain ? [expectChain] : []),
    ];
  }
  if (wDir === 0) {
    // The return to Y* comes from fading expectations or the foreign economy, not from wages.
    return [...(expectChain ? [expectChain] : []), demand];
  }
  if (g === 0) {
    // Output is already at Y* (e.g. fixed labor demand), but the real wage is off its market level.
    return [
      {
        id: 'lr-wages',
        title: 'עדכון חוזי השכר: השכר הריאלי חוזר לרמת השוק',
        horizon: 'lr',
        nodes: [
          nd('wP', sgn(prev.wP - 1, 1e-6), prev.wP < 1 ? 'מתחת לרמת השוק' : 'מעל רמת השוק'),
          nd('w', wDir, 'חוזה חדש'),
          nd('wP', deltaSign('wP', mr, lr) ?? 0, 'חוזר לרמת השוק'),
          nd('Y', 0, 'Y = Y*'),
        ],
        note: fixedLabor
          ? 'הביקוש לעובדים קבוע, ולכן התוצר כבר ב-Y*. עדכון השכר מחזיר רק את השכר הריאלי לרמת השוק.'
          : 'התוצר כבר ב-Y*, אבל השכר הריאלי שונה מרמת השוק, ולכן השכר מתעדכן.',
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
        nd('gap', gapUnknown ? '?' : g, gapUnknown ? undefined : g > 0 ? 'Y מעל Y* (רמה)' : 'Y מתחת ל-Y* (רמה)'),
        nd('w', wDir, 'חוזה חדש'),
        nd('AS', -wDir, wDir > 0 ? 'SRAS זזה שמאלה' : 'SRAS זזה ימינה', { follows: 'w' }),
        nd('L', deltaSign('L', mr, lr) ?? 0, 'חזרה ל-L*'),
        // Net price change; with fading expectations AD shifts too, so it can differ from the AS push alone.
        nd('P', sigma, sigma === wDir ? undefined : split ? 'נטו, כולל דעיכת הציפיות' : isLarge(settings) ? 'נטו, כולל ההתאמה בחו״ל' : 'נטו'),
      ],
      note: null,
    },
    demand,
  ];
}

/** Why the medium run (or, rarely, the short run) has no equilibrium. */
function noEqChain(scenario, step) {
  const { noEqReason: reason, noEqSide: side, settings } = scenario;
  const assumed = activeAssumptions(settings);
  const horizon = step === 2 ? 'mr' : 'lr';
  const where = step === 2 ? 'בטווח הקצר' : 'בטווח הבינוני';
  const up = side === 'excess' ? 1 : -1;
  if (step === 2 || reason === 'linear' || !reason) {
    return {
      id: `${horizon}-none`,
      title: `אין שיווי משקל ${where}: מגבלת המודל הליניארי`,
      horizon,
      nodes: side ? [nd('P', up), nd('MP', -up, up > 0 ? 'נדרש M/P שלילי' : undefined)] : [nd('P', '?')],
      note:
        up > 0
          ? 'כדי להחזיר את התוצר לפוטנציאל הריבית הייתה צריכה לעלות עד שהביקוש לכסף שלילי. זו מגבלה של המודל הליניארי בפרמטרים האלה, לא תוצאה כלכלית.'
          : 'הזעזוע גדול מדי למודל הליניארי בפרמטרים האלה: כדי להחזיר את התוצר לפוטנציאל אחד מרכיבי הביקוש היה צריך להיות שלילי.',
    };
  }
  if (reason === 'trap') {
    const atZero = scenario.snapshots[2].zlb;
    return {
      id: 'lr-none',
      title: 'אין שיווי משקל בטווח הבינוני: מלכודת נזילות',
      horizon: 'lr',
      nodes: [
        nd('P', -1),
        nd('MP', 1),
        atZero ? nd('r', 0, 'i = 0') : nd('r', -1, 'יורד עד 0'),
        atZero ? nd('Y', 0, 'AD אנכית') : nd('Y', 1, 'אבל לא עד Y*'),
      ],
      note: 'ירידת מחירים מגדילה את M/P, אבל בריבית אפס זה לא מגדיל ביקוש. המשק לא חוזר לבד ל-Y*: נדרשת מדיניות פיסקלית מרחיבה.',
    };
  }
  // AD vertical: the price level does not change demand.
  const cause = assumed.includes('realM')
    ? 'הבנק המרכזי שומר על M/P קבוע'
    : assumed.includes('flatLM')
      ? 'הביקוש לכסף גמיש לחלוטין לריבית (LM אופקית)'
      : assumed.includes('noRateI')
        ? 'ההשקעה לא תלויה בריבית'
        : 'הביקוש לא מגיב לרמת המחירים';
  return {
    id: 'lr-none',
    title: 'אין שיווי משקל בטווח הבינוני: AD אנכית',
    horizon: 'lr',
    nodes: [nd('w', up, 'עדכון חוזים'), nd('AS', -up, up > 0 ? 'SRAS זזה שמאלה' : 'SRAS זזה ימינה'), nd('P', up), nd('Y', 0, 'AD אנכית')],
    note: `${cause}, ולכן שינוי ב-P לא משנה את הביקוש. עדכון השכר מזיז רק את המחירים, ו-Y לא חוזר ל-Y*${up > 0 ? ': המחירים ממשיכים לעלות.' : ': המחירים ממשיכים לרדת.'}`,
  };
}

/** P change transmitted to demand, by regime. */
function demandChannel(settings, params, sigma, from, to) {
  const d = (key) => nd(key, deltaSign(key, from, to) ?? 0);
  const P = nd('P', sigma);
  if (settings.economy === 'closed') {
    return [P, d('MP'), d('r'), d('I'), d('Y'), d('C')];
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
    return [P, d('MP'), nd('rp', sigma, undefined, { follows: 'P' }), nd('KF', sigma, undefined, { follows: 'P' }), d('e'), d('eps'), d('NX'), d('Y')];
  }
  return [P, d('MP'), d('r'), d('I'), d('e'), d('eps'), d('NX'), d('Y')];
}

function neutralityNote(scenario) {
  const { activeShocks, snapshots } = scenario;
  const [t0, , , lr] = snapshots;
  if (activeShocks.length === 1 && activeShocks[0] === 'M') {
    if (Math.abs(lr.MP - t0.MP) < 1e-6 * t0.MP && Math.abs(lr.M - t0.M) > 1e-6 * t0.M)
      return 'נייטרליות הכסף: M/P, i, Y ו-W/P חזרו לערכם ההתחלתי. רק המשתנים הנומינליים השתנו.';
  }
  return null;
}
