/**
 * Calibration and definitions for the macro engine.
 *
 * The baseline (t0) is a long-run equilibrium that every parameter setting
 * passes through: Y* = 1000, i = i* = 5%, P = 1, real exchange rate = 1,
 * balanced trade. When a structural slider moves (c, b, k, h, m, n), the
 * autonomous intercepts are re-calibrated so the curves ROTATE around this
 * point instead of jumping away. This mirrors the course's numerical example:
 *   C = 100 + 0.8(Y - T),  I = 50 - 10i,  L(i, Y) = 0.4Y - 6i
 */

export const CAL = Object.freeze({
  Ystar: 1000,
  rStar: 5, // percent (high enough that ordinary demand shocks keep the medium-run rate above zero)
  P0: 1,
  eps0: 1, // real exchange rate at t0
  e0: 1, // nominal exchange rate at t0 (NIS per unit of foreign currency)
  Pstar0: 1,
  G0: 90,
  T0: 90,
  M0: 382,
  aStar0: 100,
  phi: 0.4, // sensitivity of exports to foreign absorption a*
  Ctarget: 810,
  Itarget: 100,
  A0: 1,
  K0: 10000,
  Lstar: 100, // full-employment labor (index); Y* = A0 * sqrt(K0 * L*) = 1000
});

/** Structural parameters exposed as sensitivity sliders. */
export const PARAM_DEFS = [
  {
    id: 'c',
    sym: 'c',
    label: 'נטייה שולית לצרוך (MPC)',
    hint: 'c גבוה מגדיל את המכפיל ומשטיח את עקומת IS. הסימולטור שומר על c(1 − t) + δ + β < 1, אחרת המכפיל אינסופי',
    sector: 'real',
    min: 0.5,
    max: 0.88,
    step: 0.01,
    default: 0.8,
    digits: 2,
    economies: ['closed', 'open'],
  },
  {
    id: 'b',
    sym: 'b',
    label: 'רגישות ההשקעה לריבית',
    hint: 'b גבוה משטיח את IS; b → 0 נותן IS אנכית',
    sector: 'real',
    min: 1,
    max: 40,
    step: 0.5,
    default: 10,
    digits: 1,
    economies: ['closed', 'open'],
  },
  {
    id: 't',
    sym: 't',
    label: 'שיעור מס פרופורציונלי',
    words: ['נמוך', 'בינוני', 'גבוה'],
    hint: 'T = T̄ + tY (הרצאה 2): מייצב אוטומטי. המכפיל יורד ל-1/[1 − c(1 − t)], ועקומת IS תלולה יותר',
    sector: 'fiscal',
    min: 0,
    max: 0.4,
    step: 0.01,
    default: 0,
    digits: 2,
    economies: ['closed', 'open'],
  },
  {
    id: 'delta',
    sym: 'δ',
    label: 'נטייה שולית להוצאה ממשלתית',
    hint: 'G = G₀ + δY (מרכז למידה 4): ההוצאה גדלה עם התוצר. המכפיל עולה ל-1/(1 − c − δ)',
    sector: 'fiscal',
    min: 0,
    max: 0.1,
    step: 0.01,
    default: 0,
    digits: 2,
    economies: ['closed', 'open'],
  },
  {
    id: 'h',
    sym: 'h',
    label: 'רגישות הביקוש לכסף לריבית',
    hint: 'h גבוה משטיח את LM (לקראת מלכודת נזילות); h → 0 נותן LM אנכית',
    sector: 'monetary',
    min: 0.5,
    max: 60,
    step: 0.5,
    default: 6,
    digits: 1,
    economies: ['closed', 'open'],
  },
  {
    id: 'k',
    sym: 'k',
    label: 'רגישות הביקוש לכסף לתוצר',
    hint: 'k גבוה מגדיל את שיפוע LM. ל-k = 0 (הביקוש לכסף לא תלוי בתוצר, מרכז למידה 4) בחרו בהנחה החלופית המתאימה',
    sector: 'monetary',
    // k = 0 is a different model (flat LM), offered as an alternative assumption,
    // so the sign engine can vary k over positive values.
    min: 0.05,
    max: 1,
    step: 0.01,
    default: 0.4,
    digits: 2,
    economies: ['closed', 'open'],
  },
  {
    id: 'm',
    sym: 'm',
    label: 'נטייה שולית לייבא',
    hint: 'דליפת יבוא מתוך כל הספיגה a = C + I + G; מקטינה את המכפיל',
    sector: 'open',
    min: 0.05,
    max: 0.4,
    step: 0.01,
    default: 0.2,
    digits: 2,
    economies: ['open'],
  },
  {
    id: 'n',
    sym: 'n',
    label: 'רגישות TB לשער החליפין הריאלי',
    hint: 'תנאי מרשל-לרנר: n > 0, פיחות ריאלי משפר את מאזן הסחר',
    sector: 'open',
    min: 60,
    max: 800,
    step: 10,
    default: 300,
    digits: 0,
    economies: ['open'],
  },
  {
    id: 'kappa',
    sym: 'κ',
    label: 'ניידות הון (חלקית)',
    hint: 'κ גבוה משטיח את עקומת CM; פעיל רק בניידות חלקית (הרחבה: בהרצאות ניידות ההון מלאה)',
    sector: 'open',
    min: 1,
    max: 400,
    step: 1,
    default: 40,
    digits: 0,
    economies: ['open'],
    mobility: ['partial'],
    sizes: ['small'],
  },
  {
    id: 'bw',
    sym: '±',
    label: 'רוחב רצועת הניוד (אחוז לכל כיוון)',
    words: ['צרה', 'בינונית', 'רחבה'],
    hint: 'בתוך הרצועה שע״ח נע בחופשיות; בקצה הבנק המרכזי קונה או מוכר מט״ח (מרכז למידה 7)',
    sector: 'open',
    min: 1,
    max: 30,
    step: 1,
    default: 10,
    digits: 0,
    economies: ['open'],
    sizes: ['small'],
    regimes: ['band'],
  },
  {
    id: 'ciV', // slider value; the model uses ci only when the assumption is on
    sym: 'cᵢ',
    label: 'רגישות הצריכה לריבית',
    hint: 'פעיל כשבוחרים "הצריכה תלויה בריבית"',
    sector: 'real',
    min: 1,
    max: 20,
    step: 0.5,
    default: 5,
    digits: 1,
    economies: ['closed', 'open'],
    assume: 'rateC',
  },
  {
    id: 'betaV', // slider value; the model uses beta only when the assumption is on
    sym: 'β',
    label: 'רגישות ההשקעה לתוצר',
    hint: 'פעיל כשבוחרים "ההשקעה תלויה בתוצר"',
    sector: 'real',
    min: 0.02,
    max: 0.15,
    step: 0.01,
    default: 0.1,
    digits: 2,
    economies: ['closed', 'open'],
    assume: 'investY',
  },
  {
    id: 'omega',
    sym: 'ω',
    label: 'חלק המשק המקומי בתוצר העולמי',
    words: ['קטן', 'בינוני', 'גדול'],
    hint: 'ω = 0.5: שתי כלכלות שוות בגודלן. ω קטן: המשק קטן ביחס לעולם, והתוצאות מתקרבות למשק קטן ופתוח',
    sector: 'open',
    min: 0.05,
    // Up to half the world: a larger home economy would spend less than its
    // own share on home goods, and a home fiscal expansion would then
    // depreciate the home currency, unlike Lecture 12.
    max: 0.5,
    step: 0.05,
    default: 0.5,
    digits: 2,
    economies: ['open'],
    sizes: ['large'],
  },
];

export const DEFAULT_PARAMS = Object.freeze(
  Object.fromEntries(PARAM_DEFS.map((p) => [p.id, p.default])),
);

/**
 * Exogenous shocks. Values are deltas relative to the baseline.
 * `applies(settings)` decides whether the control is available.
 */
const always = () => true;
const openOnly = (s) => s.economy === 'open';
const smallOpen = (s) => s.economy === 'open' && s.size !== 'large';
const largeOpen = (s) => s.economy === 'open' && s.size === 'large';

export const SHOCK_DEFS = [
  {
    id: 'G',
    sym: 'G',
    label: 'הוצאה ממשלתית',
    group: 'fiscal',
    sector: 'fiscal',
    min: -100,
    max: 100,
    step: 5,
    unit: '',
    applies: always,
  },
  {
    id: 'T',
    sym: 'T',
    label: 'מיסים',
    group: 'fiscal',
    sector: 'fiscal',
    min: -100,
    max: 100,
    step: 5,
    unit: '',
    applies: always,
  },
  {
    id: 'M',
    sym: 'M',
    label: 'כמות הכסף (פעולת בנק מרכזי)',
    group: 'monetary',
    sector: 'monetary',
    min: -150,
    max: 150,
    step: 5,
    unit: '',
    applies: (s) => !(s.economy === 'closed' && s.instrument === 'r'),
  },
  {
    id: 'rT',
    inCourse: false, // held fixed in the course
    sym: 'ī',
    label: 'ריבית היעד של הבנק המרכזי',
    hint: 'פעולות בשוק הפתוח (הרצאה 5): הבנק קונה או מוכר אג״ח עד שהריבית מגיעה ליעד. מלאי הכסף נקבע אנדוגנית',
    group: 'monetary',
    sector: 'monetary',
    min: -4, // below -3 the target is negative: lets students hit the zero lower bound
    max: 4,
    step: 0.25,
    unit: ' נק׳ אחוז',
    applies: (s) => s.economy === 'closed' && s.instrument === 'r',
  },
  {
    id: 'L0',
    sym: 'L₀',
    label: 'ביקוש לכסף (העדפת נזילות)',
    group: 'monetary',
    sector: 'monetary',
    min: -60,
    max: 60,
    step: 5,
    unit: '',
    applies: always,
  },
  {
    id: 'C0',
    sym: '(Y−T)ᶠ',
    label: 'ציפיות להכנסה פנויה עתידית',
    hint: 'C = C(Y − T, [Y − T]ᶠ) (הרצאה 2): ציפייה להכנסה גבוהה יותר בעתיד מגדילה את הצריכה היום',
    group: 'private',
    sector: 'real',
    min: -80,
    max: 80,
    step: 5,
    unit: '',
    applies: always,
  },
  {
    id: 'I0',
    sym: 'MPKᵉ',
    label: 'תשואה צפויה להון (אמון היצרנים)',
    hint: 'I = I(i, MPKᵉ) (הרצאה 2): ציפייה לתשואה גבוהה יותר מגדילה את ההשקעה',
    group: 'private',
    sector: 'real',
    min: -100,
    max: 100,
    step: 5,
    unit: '',
    applies: always,
  },
  {
    id: 'A',
    inCourse: false, // held fixed in the course
    sym: 'A',
    label: 'פריון / טכנולוגיה',
    group: 'supply',
    sector: 'prices',
    min: -15,
    max: 15,
    step: 1,
    unit: '%',
    applies: always,
  },
  {
    id: 'K',
    inCourse: false, // held fixed in the course
    sym: 'K',
    label: 'מלאי ההון',
    hint: 'עלייה ב-K מגדילה את התוצר הפוטנציאלי ומזיזה את AS ימינה (הרצאה 4)',
    group: 'supply',
    sector: 'prices',
    min: -20,
    max: 20,
    step: 1,
    unit: '%',
    applies: always,
  },
  {
    id: 'W',
    sym: 'W',
    label: 'שכר נומינלי בחוזים',
    hint: 'למשל בציפייה לעליית מחירים (הרצאה 4). פועל מהטווח הקצר: עלייה ב-W מזיזה את AS שמאלה, וירידה מזיזה אותה ימינה. בטווח הבינוני השכר חוזר לרמת השוק',
    group: 'supply',
    sector: 'prices',
    min: -15,
    max: 15,
    step: 1,
    unit: '%',
    applies: (s) => s.school !== 'classical',
  },
  {
    id: 'e',
    sym: 'E',
    label: 'שינוי יזום בשער הקבוע (↑ פיחות, ↓ ייסוף)',
    group: 'fx',
    sector: 'open',
    min: -30,
    max: 30,
    step: 1,
    unit: '%',
    applies: (s) => s.economy === 'open' && s.regime === 'fixed',
  },
  {
    id: 'bandLo',
    sym: 'E_low',
    label: 'הגבול התחתון של הרצועה',
    hint: '↑: הגבול התחתון עולה אל מעל השער הנוכחי, והבנק המרכזי חייב לקנות מט״ח (מרכז למידה 7, שאלה 2). ↓: הרצועה מתרחבת כלפי מטה',
    group: 'fx',
    sector: 'open',
    min: -20,
    max: 30,
    step: 1,
    unit: '%',
    applies: (s) => s.economy === 'open' && s.size !== 'large' && s.regime === 'band',
  },
  {
    id: 'bandHi',
    sym: 'E_high',
    label: 'הגבול העליון של הרצועה',
    hint: '↓: הגבול העליון יורד אל מתחת לשער הנוכחי, והבנק המרכזי חייב למכור מט״ח. ↑: הרצועה מתרחבת כלפי מעלה',
    group: 'fx',
    sector: 'open',
    min: -30,
    max: 20,
    step: 1,
    unit: '%',
    applies: (s) => s.economy === 'open' && s.size !== 'large' && s.regime === 'band',
  },
  {
    id: 'rStar',
    sym: 'i*',
    label: 'ריבית עולמית',
    group: 'open',
    sector: 'open',
    min: -3,
    max: 4,
    step: 0.5,
    unit: ' נק׳ אחוז',
    applies: smallOpen,
  },
  {
    id: 'Pstar',
    sym: 'P*',
    label: 'רמת המחירים בעולם',
    group: 'open',
    sector: 'open',
    min: -20,
    max: 20,
    step: 1,
    unit: '%',
    applies: smallOpen,
  },
  {
    id: 'aStar',
    sym: 'a*',
    label: 'ספיגה בחו״ל (ביקוש עולמי)',
    group: 'open',
    sector: 'open',
    min: -80,
    max: 80,
    step: 5,
    unit: '',
    applies: smallOpen,
  },
  {
    id: 'Ee',
    sym: 'ΔEᵉ',
    label: 'ציפיות לשינוי בשע״ח (פיחות צפוי)',
    hint: 'UIRP: i = i* + ΔEᵉ. ↓ = ציפייה לייסוף (למשל אחרי פיחות חד, הרצאה 9). הציפיות דועכות: מלאות בטווח המיידי, חלקיות בקצר, אפס בבינוני',
    group: 'open',
    sector: 'open',
    min: -3,
    max: 3,
    step: 0.5,
    unit: ' נק׳ אחוז',
    applies: (s) => s.economy === 'open' && (s.size === 'large' || s.mobility !== 'none'),
  },
  {
    id: 'Mf',
    sym: 'M*',
    label: 'כמות הכסף בחו״ל (הבנק המרכזי הזר)',
    hint: 'השינוי נמדד ביחס לגודל המשק הזר',
    group: 'world',
    sector: 'open',
    min: -150,
    max: 150,
    step: 5,
    unit: '',
    applies: largeOpen,
  },
  {
    id: 'Gf',
    sym: 'G*',
    label: 'הוצאה ממשלתית בחו״ל',
    hint: 'ביחס לגודל המשק הזר',
    group: 'world',
    sector: 'open',
    min: -100,
    max: 100,
    step: 5,
    unit: '',
    applies: largeOpen,
  },
];

/**
 * Alternative assumptions that the course's exams and learning centers ask
 * about ("נניח כי…"). Each one changes a single building block of the model;
 * `applies(settings)` says where the variant is well defined.
 */
const isClosed = (s) => s.economy === 'closed';
const notLarge = (s) => !(s.economy === 'open' && s.size === 'large');
export const ASSUMPTION_DEFS = [
  {
    id: 'noRateI',
    label: 'ההשקעה לא תלויה בריבית',
    formula: 'I = I₀',
    hint: 'b = 0: עקומת IS אנכית במשק סגור, ומדיניות מוניטרית לא משפיעה על התוצר דרך ההשקעה (מבחן 2026, מועד ב׳).',
    applies: notLarge,
  },
  {
    id: 'rateC',
    label: 'הצריכה תלויה בריבית',
    formula: 'C = C₀ + c(Y − T) − cᵢ·i',
    hint: 'IS שטוחה יותר; במשק סגור המדיניות המוניטרית חזקה יותר (מבחן 2023, מועד א׳).',
    applies: notLarge,
  },
  {
    id: 'investY',
    label: 'ההשקעה תלויה בתוצר',
    formula: 'I = I₀ + β(Y − Y*) − b·i',
    hint: 'המכפיל גדל ל-1/(1 − c − β), ולכן כל הזזה של IS גדולה יותר (מבחנים 2023, 2024).',
    applies: () => true,
  },
  {
    id: 'noYMoney',
    label: 'הביקוש לכסף לא תלוי בתוצר',
    formula: 'M/P = L₀ − h·i',
    hint: 'k = 0: עקומת LM אופקית ואין דחיקה דרך הריבית (מרכז למידה 4, מבחן 2023). בשע״ח נייד עם ניידות הון מלאה אין למודל פתרון, ולכן האפשרות כבויה שם.',
    applies: (s) => s.economy === 'closed' || (s.regime === 'fixed' && s.size !== 'large'),
  },
  {
    id: 'flatLM',
    label: 'הביקוש לכסף גמיש לחלוטין לריבית',
    formula: 'LM אופקית',
    hint: 'שינוי ב-M או ב-P לא משנה את i: AD אנכית, ומדיניות מוניטרית לא משפיעה (מבחן 2026). משק סגור.',
    applies: isClosed,
  },
  {
    id: 'noExportA',
    label: 'היצוא לא מגיב לספיגה בחו״ל',
    formula: 'X = X(e)',
    hint: 'שינוי ב-a* לא משפיע על המשק (מבחן 2026, מועד א׳, שאלה 2).',
    applies: (s) => s.economy === 'open' && s.size !== 'large',
  },
  {
    id: 'fixedLabor',
    label: 'הביקוש לעובדים קבוע',
    formula: 'L = L*',
    hint: 'כמות העובדים לא תלויה ברמת המחירים: AS אנכית כבר בטווח הקצר. בטווח המיידי AS עדיין אופקית, כי אפשר לספק כל כמות מבוקשת (מבחן 2026).',
    applies: notLarge,
  },
  {
    id: 'realM',
    label: 'הבנק המרכזי שומר על M/P קבוע',
    formula: 'M/P = const',
    hint: 'מהטווח הקצר הבנק מגדיל את M יחד עם P: AD אנכית, ואם Y ≠ Y* אין שיווי משקל בטווח הבינוני (מבחן 2026, מועד א׳). אפשר גם בעולם של שתי כלכלות עם שע״ח נייד (שם, שאלה 1ב).',
    applies: (s) => s.economy === 'closed' || s.regime === 'floating',
  },
];

/** Assumptions switched on and valid under the given settings. */
export const activeAssumptions = (settings) =>
  ASSUMPTION_DEFS.filter((d) => settings.assume?.[d.id] && d.applies(settings)).map((d) => d.id);

export const ZERO_SHOCKS = Object.freeze(Object.fromEntries(SHOCK_DEFS.map((s) => [s.id, 0])));

export const DEFAULT_SETTINGS = Object.freeze({
  economy: 'closed', // 'closed' | 'open'
  size: 'small', // 'small' | 'large' (two-economy world)
  instrument: 'M', // closed economy: central bank sets 'M' (money stock) or 'r' (interest rate)
  regime: 'floating', // 'floating' | 'fixed' | 'band' (band: small open economy only)
  mobility: 'perfect', // 'perfect' | 'partial' | 'none'
  school: 'keynesian', // the course's supply side (Lecture 5); other values are kept for tests only
  assume: {}, // alternative assumptions, see ASSUMPTION_DEFS
  eeFade: 'half', // how fast expected exchange-rate changes fade: 'fast' | 'half' | 'slow'
});

/** The four simulator states. `course` is the matching horizon name in the course slides. */
export const HORIZONS = [
  { key: 't0', label: 'מצב מוצא', inLabel: 'במצב המוצא', short: 't₀', course: 'שיווי משקל בתעסוקה מלאה לפני הזעזוע: Y = Y*' },
  { key: 'sr', label: 'טווח מיידי', inLabel: 'בטווח המיידי', short: 'מיידי', course: 'P, W, K קבועים; Y גמיש ונקבע לפי הביקוש (הרצאה 5)' },
  { key: 'mr', label: 'טווח קצר', inLabel: 'בטווח הקצר', short: 'קצר', course: 'W, K קבועים; Y, P נקבעים בשיווי משקל בין AD ל-SRAS' },
  { key: 'lr', label: 'טווח בינוני', inLabel: 'בטווח הבינוני', short: 'בינוני', course: 'K קבוע; W מתעדכן ומזיז את עקומת AS; Y = Y*' },
];
