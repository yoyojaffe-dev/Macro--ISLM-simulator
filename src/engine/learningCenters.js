/**
 * Questions from the course's learning centers (מרכזי למידה 1-8) that belong
 * to the IS-LM / AD-AS / Mundell-Fleming model. Learning centers 10-11
 * (Phillips curve, Taylor rule, DAD-DAS) are outside this simulator's scope.
 *
 * Sign-table answers for centers 1-5 are computed by re-solving the scenario
 * over a grid of admissible parameters (robustSigns), so a "?" in the key means
 * the sign genuinely depends on the parameters. Centers 6-8 carry the course's
 * own answer key (`key`), because their "?" cells come from the course's
 * reading of the question (e.g. whether the rate leaves the band later); the
 * tests check that the engine agrees with every determinate cell.
 *
 * Horizon names follow the course: מיידי = simulator step 1, קצר = step 2,
 * בינוני = step 3.
 */
import { DEFAULT_PARAMS, ZERO_SHOCKS } from './constants.js';
import { buildScenario, sgn } from './model.js';
import { robustSigns } from './quiz.js';

const CLOSED = { economy: 'closed', size: 'small', instrument: 'M', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const FIXED = { economy: 'open', size: 'small', instrument: 'M', regime: 'fixed', mobility: 'perfect', school: 'keynesian' };
const FLOAT = { economy: 'open', size: 'small', instrument: 'M', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const BAND = { economy: 'open', size: 'small', instrument: 'M', regime: 'band', mobility: 'perfect', school: 'keynesian' };

/** Course horizon columns used in the learning-center tables. */
export const COURSE_COLUMNS = {
  imm_0: { from: 0, to: 1, label: 'הטווח המיידי', sub: 'ביחס למצב המוצא' },
  short_imm: { from: 1, to: 2, label: 'הטווח הקצר', sub: 'ביחס לטווח המיידי' },
  short_0: { from: 0, to: 2, label: 'הטווח הקצר', sub: 'ביחס למצב המוצא' },
  med_short: { from: 2, to: 3, label: 'הטווח הבינוני', sub: 'ביחס לטווח הקצר' },
  med_0: { from: 0, to: 3, label: 'הטווח הבינוני', sub: 'ביחס למצב המוצא' },
};

/** Learning-center variable names -> simulator snapshot keys. */
export const LC_VARS = {
  G: 'G',
  T: 'T',
  Y: 'Y',
  C: 'C',
  i: 'r',
  I: 'I',
  P: 'P',
  M: 'M',
  MP: 'MP',
  w: 'w',
  wP: 'wP',
  L: 'L',
  TB: 'NX',
  E: 'e',
  e: 'eps',
  Res: 'reservesDelta',
  D: 'debt',
};

const IS_SHIFT_OPTIONS = [
  { id: 'mult', math: 'X / (1 − c)', text: 'ימינה' },
  { id: 'one', math: 'X', text: 'ימינה' },
  { id: 'mixed', math: '(X − cY) / (1 − c)', text: 'ימינה' },
  { id: 'multL', math: 'X / (1 − c)', text: 'שמאלה' },
  { id: 'taxL', math: 'cX / (1 − c)', text: 'שמאלה' },
  { id: 'taxR', math: 'cX / (1 − c)', text: 'ימינה' },
];

const isShift = (id, prompt, answer, explanation, shocks) => ({
  id,
  center: 1,
  type: 'mcq',
  prompt,
  options: IS_SHIFT_OPTIONS,
  answer,
  explanation,
  scenario: { settings: CLOSED, shocks, step: 1 },
});

export const LC_QUESTIONS = [
  // ---------- Learning center 1: IS shifts ----------
  isShift(
    'lc1a',
    'מרכז למידה 1, שאלה 1א: הרחבה פיסקלית $Δ{G} = X$. לאיזה כיוון ובכמה תזוז עקומת {IS} (אופקית)?',
    'mult',
    'הוצאה אוטונומית גדלה ב-X, והמכפיל הוא 1/(1 − c). בכל ריבית התוצר שמנקה את שוק הסחורות גדל ב-X/(1 − c).',
    { G: 40 },
  ),
  isShift(
    'lc1b',
    'שאלה 1ב: הרחבה פיסקלית מאוזנת $Δ{T} = Δ{G} = X$. לאיזה כיוון ובכמה תזוז {IS}?',
    'one',
    'הגדלת G מזיזה ב-X/(1 − c), והעלאת המס מזיזה בחזרה ב-cX/(1 − c). ביחד: X(1 − c)/(1 − c) = X. מכפיל התקציב המאוזן הוא 1.',
    { G: 40, T: 40 },
  ),
  isShift(
    'lc1c',
    'שאלה 1ג: הרחבה לא מאוזנת: $Δ{G} = X$ ו-$Δ{T} = Y$, כאשר $Y < X$. לאיזה כיוון ובכמה תזוז {IS}?',
    'mixed',
    'X/(1 − c) מהגדלת ההוצאה פחות cY/(1 − c) מהמס: (X − cY)/(1 − c), ימינה כי Y < X.',
    { G: 40, T: 20 },
  ),
  isShift(
    'lc1d',
    'שאלה 1ד: ירידה ברכיב האוטונומי של הצריכה, $Δ{C0} = −X$. לאיזה כיוון ובכמה תזוז {IS}?',
    'multL',
    'ירידה אוטונומית בצריכה פועלת כמו קיצוץ ב-G: אותו מכפיל, X/(1 − c), שמאלה.',
    { C0: -40 },
  ),
  isShift(
    'lc1e',
    'שאלה 1ה: עליית מיסים $Δ{T} = X$. לאיזה כיוון ובכמה תזוז {IS}?',
    'taxL',
    'המס מקטין את ההכנסה הפנויה ב-X, אבל הצריכה יורדת רק ב-cX (השאר בא על חשבון החיסכון). לכן ההזזה היא cX/(1 − c), שמאלה.',
    { T: 40 },
  ),

  // ---------- Learning center 2 ----------
  {
    id: 'lc2-1',
    center: 2,
    type: 'mcq',
    prompt: 'מרכז למידה 2, שאלה 1: מה יהיה השינוי בתוצר כתוצאה מהרחבה פיסקלית מאוזנת $Δ{T} = Δ{G} = X$? (רמז: חשבו מה יקרה בשוק הכסף.)',
    options: [
      { id: 'a', math: 'X', text: '' },
      { id: 'b', math: '', text: 'X כפול המכפיל הקיינסיאני' },
      { id: 'c', math: '', text: 'קטן מ-X אך גדול מ-0' },
      { id: 'd', math: '0', text: '' },
      { id: 'e', math: '−X', text: '' },
    ],
    answer: 'c',
    explanation:
      '{IS} זזה ימינה בדיוק ב-X, אבל עליית {Y} מגדילה את הביקוש לכסף ו-{r} עולה. ההשקעה {I} נדחקת, ולכן Δ{Y} קטן מ-X. התוצר עדיין עולה, כי הדחיקה חלקית כל עוד {LM} לא אנכית.',
    scenario: { settings: CLOSED, shocks: { G: 40, T: 40 }, step: 1 },
  },
  {
    id: 'lc2-2',
    center: 2,
    type: 'classify',
    prompt: 'שאלה 2: לכל אחד מהמשתנים, קבעו אם הוא אקסוגני או אנדוגני במודל IS-LM (כפי שנלמד עד כה).',
    items: [
      { key: 'Y', answer: 'endo' },
      { key: 'G', answer: 'exo' },
      { key: 'I', answer: 'endo' },
      { key: 'I0', answer: 'exo' },
      { key: 'C', answer: 'endo' },
      { key: 'C0', answer: 'exo' },
      { key: 'T', answer: 'exo' },
      { key: 'M', answer: 'exo' },
      { key: 'r', answer: 'endo', label: 'i' },
      { key: 'MPKe', answer: 'exo', label: 'MPKᵉ' },
    ],
    explanation:
      'אקסוגניים: משתני המדיניות ({G}, {T}, {M}) והפרמטרים ההתנהגותיים ({C0}, {I0}, MPKᵉ). אנדוגניים: מה שהמודל פותר: {Y}, {r}, ומה שנגזר מהם: {C} ו-{I}.',
  },
  {
    id: 'lc2-3',
    center: 2,
    type: 'mcq',
    prompt: 'שאלה 3: הממשלה מגדילה את ההוצאה ($Δ{G} > 0$) ובמקביל הבנק המרכזי מגדיל את כמות הכסף ($Δ{M} > 0$). מה יקרה לתוצר ולריבית?',
    options: [
      { id: 'a', math: '', text: 'התוצר יגדל, הריבית תעלה' },
      { id: 'b', math: '', text: 'התוצר יגדל, הריבית תרד' },
      { id: 'c', math: '', text: 'התוצר יגדל, לגבי הריבית לא ניתן לדעת' },
      { id: 'd', math: '', text: 'לא ניתן לדעת לגבי שניהם' },
    ],
    answer: 'c',
    explanation:
      '{IS} ו-{LM} זזות שתיהן ימינה, ולכן {Y} עולה בוודאות. {IS} ימינה מעלה את {r} ו-{LM} ימינה מורידה אותה: הכיוון תלוי בגודל ההזזות ובשיפועים.',
    scenario: { settings: CLOSED, shocks: { G: 40, M: 40 }, step: 1 },
  },
  {
    id: 'lc2-4',
    center: 2,
    type: 'mcq',
    prompt:
      'שאלה 4: בכיתה הנחנו שהפירמות קובעות את כמות העבודה בטווח הקצר. הניחו במקום זאת שהעובדים קובעים אותה. איך תיראה עקומת {AS} של הטווח הקצר?',
    options: [
      { id: 'a', math: '', text: 'עולה' },
      { id: 'b', math: '', text: 'יורדת' },
      { id: 'c', math: '', text: 'גמישה לחלוטין' },
      { id: 'd', math: '', text: 'קשיחה לחלוטין' },
    ],
    answer: 'b',
    explanation:
      'השכר הנומינלי {w} קבוע בחוזה. עליית {P} מורידה את השכר הריאלי {wP}, ועובדים שנמצאים על עקומת היצע עבודה עולה יבחרו לעבוד פחות. {L} יורד ולכן {Y} יורד: עקומת {AS} יורדת. (הסימולטור מניח, כמו בכיתה, שהפירמות קובעות.)',
  },

  // ---------- Learning center 3: sign tables, closed economy ----------
  {
    id: 'lc3-1',
    center: 3,
    type: 'signTable',
    prompt: 'מרכז למידה 3, שאלה 1: הממשלה מבצעת הרחבה פיסקלית מאוזנת: $Δ{G} = Δ{T} > 0$. משק סגור.',
    settings: CLOSED,
    shocks: { G: 10, T: 10 },
    vars: ['G', 'T', 'Y', 'C', 'i', 'I', 'P', 'M', 'MP', 'w', 'wP', 'L'],
    columns: ['imm_0', 'short_imm', 'med_short', 'med_0'],
  },
  {
    id: 'lc3-2',
    center: 3,
    type: 'signTable',
    prompt: 'שאלה 2: נגיד הבנק המרכזי מבצע צמצום מוניטרי: $Δ{M} < 0$. משק סגור.',
    settings: CLOSED,
    shocks: { M: -15 },
    vars: ['G', 'T', 'Y', 'C', 'i', 'I', 'P', 'M', 'MP', 'w', 'wP', 'L'],
    columns: ['imm_0', 'short_imm', 'med_short', 'med_0'],
  },

  // ---------- Learning center 4 ----------
  {
    id: 'lc4-1',
    center: 4,
    type: 'signTable',
    prompt:
      'מרכז למידה 4, שאלה 1: הממשלה מגדילה את הוצאותיה, ובמקום להגדיל את הגירעון הנגיד מממן אותן בהדפסת כסף ($Δ{G} = Δ{M} > 0$). משק סגור.',
    settings: CLOSED,
    shocks: { G: 15, M: 15 },
    vars: ['G', 'T', 'Y', 'C', 'i', 'I', 'P', 'M', 'MP', 'w', 'wP'],
    columns: ['imm_0', 'short_imm', 'med_short', 'med_0'],
  },
  {
    id: 'lc4-2',
    center: 4,
    type: 'mcq',
    prompt:
      'שאלה 2: ההוצאה הממשלתית תלויה בתוצר: $G = G₀ + δY$, כאשר $0 < δ < 1$ ו-$c + δ < 1$. הממשלה מבצעת הרחבה מאוזנת $ΔG₀ = Δ{T} = X$. מה גודל התזוזה האופקית של {IS} בטווח המיידי?',
    options: [
      { id: 'a', math: 'X', text: '' },
      { id: 'b', math: '', text: 'גדול מ-X' },
      { id: 'c', math: '', text: 'קטן מ-X אבל גדול מ-0' },
      { id: 'd', math: '', text: 'לא ניתן לדעת (תלוי בגדלים של הנש״צ והנש״ה)' },
    ],
    answer: 'b',
    explanation:
      '$Y(1 − c − δ) = C₀ − cT + I₀ − bi + G₀$, ולכן $ΔY = (X − cX)/(1 − c − δ) = X(1 − c)/(1 − c − δ)$. כש-$δ > 0$ המכנה קטן מ-(1 − c), כך שההזזה גדולה מ-X: ההוצאה הממשלתית עצמה גדלה עם התוצר.',
    scenario: { settings: CLOSED, shocks: { G: 40, T: 40 }, params: { delta: 0.1 }, step: 1 },
  },
  {
    id: 'lc4-3',
    center: 4,
    type: 'compare',
    prompt:
      'שאלה 3: שני משקים סגורים זהים, למעט הבדל אחד: במשק א׳ הביקוש לכסף תלוי בתוצר (כמו בכיתה), ובמשק ב׳ הוא תלוי רק בריבית (k = 0). בשניהם מתרחשת אותה הרחבה פיסקלית ($Δ{G} > 0$). השוו בין המשקים.',
    shocks: { G: 15 },
    vars: ['Y', 'M', 'I', 'C'],
    steps: [
      { step: 1, label: 'טווח מיידי' },
      { step: 3, label: 'טווח בינוני' },
    ],
    explanation:
      'בטווח המיידי: במשק ב׳ עליית {Y} לא מעלה את הביקוש לכסף, ולכן {r} לא עולה ואין דחיקה. התוצר, ההשקעה והצריכה גבוהים יותר בב׳. {M} זהה (קבוע בשניהם). בטווח הבינוני שני המשקים חוזרים ל-{Y*}; כדי לפנות מקום ל-{G}, {I} יורד בדיוק ב-Δ{G} בשניהם, ולכן הכול שווה.',
    scenario: { settings: CLOSED, shocks: { G: 15 }, params: { k: 0 }, step: 1 },
  },

  // ---------- Learning center 5: fixed exchange rate ----------
  {
    id: 'lc5-1',
    center: 5,
    type: 'signTable',
    prompt:
      'מרכז למידה 5, שאלה 1: משק קטן ופתוח, תנועות הון חופשיות ושע״ח קבוע. כדי לעודד צמיחה הממשלה מגדילה את הוצאותיה. סמנו ביחס לטווח הקודם.',
    settings: FIXED,
    shocks: { G: 10 },
    vars: ['Y', 'P', 'G', 'I', 'C', 'M', 'MP', 'w', 'wP', 'TB', 'Res'],
    columns: ['imm_0', 'short_imm', 'med_short'],
  },
  {
    id: 'lc5-2',
    center: 5,
    type: 'signTable',
    prompt:
      'שאלה 2: אותו משק (קטן, פתוח, תנועות הון חופשיות, שע״ח קבוע). כדי לצמצם את הגירעון הממשלה מעלה מיסים.',
    settings: FIXED,
    shocks: { T: 10 },
    vars: ['Y', 'P', 'T', 'I', 'C', 'M', 'MP', 'w', 'wP', 'TB', 'Res'],
    columns: ['imm_0', 'short_imm', 'med_short', 'med_0'],
  },

  // ---------- Learning center 6: floating exchange rate ----------
  {
    id: 'lc6-1',
    center: 6,
    type: 'signTable',
    prompt:
      'מרכז למידה 6, שאלה 1: משק קטן ופתוח, תנועות הון חופשיות ושע״ח נייד, בשיווי משקל של תעסוקה מלאה. כדי להגדיל את התוצר בטווח המיידי הבנק המרכזי מגדיל את כמות הכסף. סמנו כל טווח ביחס לטווח הקודם וביחס למצב המוצא.',
    settings: FLOAT,
    shocks: { M: 40 },
    vars: ['Y', 'C', 'G', 'I', 'M', 'P', 'MP', 'w', 'wP', 'e', 'TB'],
    columns: ['imm_0', 'short_imm', 'short_0', 'med_short', 'med_0'],
    key: {
      Y: '+ - + - =',
      C: '+ - + - =',
      G: '= = = = =',
      I: '= = = = =',
      M: '+ = + = +',
      P: '= + + + +',
      MP: '+ - + - =',
      w: '= = = + +',
      wP: '= - - + =',
      e: '+ - + - =',
      TB: '+ - + - =',
    },
    explanation:
      'הרחבה מוניטרית בשע״ח נייד: לחץ להורדת {r} מוציא הון, {e} עולה (פיחות) ו-{eps} הריאלי עולה, {NX} גדל ו-{Y} עולה. {r} נשאר {rStar}, ולכן {I} לא משתנה. בהמשך {P} עולה, {MP} יורד ו-{eps} חוזר לרמתו. בטווח הבינוני רק המשתנים הנומינליים ({M}, {P}, {w}, {e}) גבוהים יותר: הכסף נייטרלי.',
  },
  {
    id: 'lc6-2',
    center: 6,
    type: 'signTable',
    prompt:
      'שאלה 2: משק קטן ופתוח, תנועות הון חופשיות, שע״ח נייד וחשבון שוטף מאוזן, בתעסוקה מלאה. בשל לחצים בינלאומיים הריבית העולמית יורדת (ללא שינוי בספיגה או במחירים בעולם). הממשלה מגיבה מיד בהקטנת ההוצאה הממשלתית. שימו לב לטווחים שאליהם משווים.',
    settings: FLOAT,
    shocks: { rStar: -1, G: -10 },
    vars: ['Y', 'C', 'G', 'T', 'I', 'TB', 'P', 'MP', 'E', 'e', 'Res'],
    columns: ['imm_0', 'short_imm', 'med_0'],
    key: {
      Y: '- + =',
      C: '- + =',
      G: '- = -',
      T: '= = =',
      I: '+ = +',
      TB: '? + ?',
      P: '= - -',
      MP: '= + +',
      E: '? ? ?',
      e: '? + ?',
      Res: '= = =',
    },
    explanation:
      'בשע״ח נייד {G} לא משפיע על {Y}. ירידת {rStar} מורידה את {r}: {I} עולה, אבל הביקוש לכסף גדל ובכמות כסף נתונה {Y} חייב לרדת (LM). כיוון {e} תלוי במה חזק יותר: ירידת הריבית (ייסוף) או קיצוץ {G} (פיחות), ולכן "?". בהמשך {P} יורד, {MP} עולה ו-{Y} חוזר ל-{Y*}. אין התערבות, ולכן היתרות לא משתנות.',
  },

  // ---------- Learning center 7: exchange-rate band ----------
  {
    id: 'lc7-1',
    center: 7,
    chip: '1.1',
    type: 'mcq',
    prompt:
      'מרכז למידה 7, שאלה 1: משק קטן ופתוח עם ניידות הון מלאה, בתעסוקה מלאה ומאזן סחר מאוזן, ובו רצועת ניוד. שע״ח במצב המוצא בתוך הרצועה. הממשלה רוצה להגדיל את התעסוקה בטווח הקצר ובוחנת שתי חלופות: (א) הפחתת מיסים; (ב) עידוד שימוש בכרטיסי אשראי, שמוריד מיד את הביקוש ליתרות ריאליות. אף צעד לא יביא את שע״ח לקצה הרצועה. איזה צעד ישיג את היעד?',
    options: [
      { id: 'a', math: '', text: 'א: הפחתת מיסים' },
      { id: 'b', math: '', text: 'ב: כרטיסי אשראי (ירידה בביקוש לכסף)' },
      { id: 'both', math: '', text: 'שני הצעדים' },
      { id: 'none', math: '', text: 'אף אחד מהם' },
    ],
    answer: 'b',
    explanation:
      'בתוך הרצועה המשק מתנהג כמו בשע״ח נייד. הפחתת מיסים מייספת את המטבע ו-{NX} יורד בדיוק כמו העלייה בצריכה: {Y} לא משתנה. ירידה בביקוש לכסף פועלת כמו הרחבה מוניטרית: {e} עולה, {NX} גדל ו-{Y} עולה.',
    scenario: { settings: BAND, shocks: { L0: -20 }, step: 1 },
  },
  {
    id: 'lc7-1t',
    center: 7,
    chip: '1.2',
    type: 'signTable',
    prompt:
      'שאלה 1, סעיף 2: הממשלה מאמצת את הצעד שמשיג את היעד (ירידה בביקוש לכסף). מה קורה בטווח הקצר ביחס למצב המוצא ובטווח הבינוני ביחס למצב המוצא? (בטווח הקצר המחירים גמישים והשכר קבוע.)',
    settings: BAND,
    shocks: { L0: -20 },
    vars: ['Y', 'P', 'G', 'I', 'C', 'E', 'e', 'TB', 'M', 'MP', 'w', 'wP', 'Res'],
    columns: ['imm_0', 'short_imm', 'short_0', 'med_short', 'med_0'],
    key: {
      Y: '+ - + - =',
      P: '= + + + +',
      G: '= = = = =',
      I: '= = = = =',
      C: '+ - + - =',
      E: '+ ? + ? +',
      e: '+ - + - =',
      TB: '+ - + - =',
      M: '= ? ? ? ?',
      MP: '= - - - -',
      w: '= = = + +',
      wP: '= - - + =',
      Res: '= ? ? ? ?',
    },
    explanation:
      'בטווח המיידי שע״ח בתוך הרצועה ואין התערבות: {M} ו-{Res} לא משתנים, {e} עולה ו-{Y} עולה. אחר כך {P} עולה; אם {e} יגיע לקצה הרצועה, הבנק המרכזי יתערב ו-{M} ישתנה, ולכן בטווחים המאוחרים {M} ו-{Res} מסומנים "?", ו-{e} מסומן "?" ביחס לטווח הקודם. בטווח הבינוני {MP} נמוך מבמוצא כי הביקוש לכסף ירד.',
  },
  {
    id: 'lc7-2',
    center: 7,
    chip: '2',
    type: 'signTable',
    prompt:
      'שאלה 2: משק קטן ופתוח עם ניידות הון מלאה, בתעסוקה מלאה ומאזן סחר מאוזן, ובו רצועת ניוד. שע״ח במוצא בתוך הרצועה. הבנק המרכזי מצמצם את הרצועה כך שהגבול התחתון החדש גבוה משע״ח הנוכחי. (רמז מהדף: בטווח המיידי השינוי לא מוציא את שע״ח מהרצועה החדשה, אבל בטווחים הבאים הוא יכול לצאת ממנה.)',
    settings: BAND,
    shocks: { bandLo: 3 },
    vars: ['Y', 'P', 'C', 'i', 'E', 'e', 'TB', 'MP', 'w', 'wP', 'Res'],
    columns: ['imm_0', 'short_imm', 'med_short'],
    key: {
      Y: '+ - -',
      P: '= + +',
      C: '+ - -',
      i: '= = =',
      E: '+ ? ?',
      e: '+ - -',
      TB: '+ - -',
      MP: '+ - -',
      w: '= = +',
      wP: '= - +',
      Res: '+ ? ?',
    },
    explanation:
      'הגבול התחתון החדש מעל {e} הנוכחי: הבנק המרכזי קונה מט״ח עד ש-{e} מגיע לגבול. {Res} ו-{M} עולים, {eps} עולה ו-{Y} עולה, כמו בפיחות. אחר כך {P} עולה, {eps} ו-{MP} יורדים ו-{Y} חוזר ל-{Y*}. אם {e} נשאר על הגבול או חוזר לתוך הרצועה תלוי בפרמטרים, ולכן {e} ו-{Res} מסומנים "?".',
  },

  // ---------- Learning center 8: exam questions ----------
  {
    id: 'lc8-1a',
    center: 8,
    chip: '1א',
    type: 'signTable',
    prompt:
      'מרכז למידה 8, שאלה 1א (מועד ב׳ 2020): חפציה היא משק קטן ופתוח עם תנועות הון חופשיות ושע״ח נייד, בתעסוקה מלאה ומאזן סחר מאוזן. בעקבות פליטת פה של העוזר לנגיד מתפתחות בציבור ציפיות לשינוי בשער החליפין. ידוע שבעקבות הציפיות התוצר בטווח המיידי גדל. מה קורה בטווח המיידי?',
    settings: FLOAT,
    shocks: { Ee: 1 },
    vars: ['I', 'C', 'TB', 'E', 'e', 'Res'],
    columns: ['imm_0'],
    key: { I: '-', C: '+', TB: '+', E: '+', e: '+', Res: '=' },
    explanation:
      'התוצר גדל, ולכן הציפיות הן לפיחות ({Ee} > 0). לפי UIRP {r} = {rStar} + {Ee}: הריבית המקומית עולה ו-{I} יורד. בשוק הכסף, ריבית גבוהה יותר עם אותה כמות כסף מחייבת {Y} גבוה יותר. כדי שהביקוש יגדל כך, {e} עולה ו-{NX} גדל יותר מהירידה ב-{I}; {C} עולה עם {Y}. בשע״ח נייד אין התערבות.',
  },
  {
    id: 'lc8-1b',
    center: 8,
    chip: '1ב',
    type: 'signTable',
    prompt:
      'שאלה 1ב: גם עכשיו בחפציה שע״ח נייד. עיתון מקומי מפרסם ידיעה לא מבוססת שלפיה צפוי פיחות במטבע של פתיריה (המשק הגדול). הציפיות מתפתחות רק בחפציה. מה קורה בחפציה בטווח המיידי?',
    settings: FLOAT,
    shocks: { Ee: -1 },
    vars: ['I', 'C', 'TB', 'E', 'e', 'Res'],
    columns: ['imm_0'],
    key: { I: '+', C: '-', TB: '-', E: '-', e: '-', Res: '=' },
    explanation:
      'פיחות צפוי במטבע של פתיריה הוא ייסוף צפוי של המטבע של חפציה ({Ee} < 0). הריבית המקומית יורדת מתחת ל-{rStar} ו-{I} עולה, אבל {e} יורד עכשיו, {NX} קטן ו-{Y} ו-{C} יורדים. בשע״ח נייד היתרות לא משתנות.',
  },
  {
    id: 'lc8-2',
    center: 8,
    chip: '2',
    type: 'compare',
    prompt:
      'שאלה 2 (מועד א׳ 2018): אידיליה היא משק קטן ופתוח עם תנועות הון חופשיות ושע״ח קבוע, בתעסוקה מלאה וחשבון שוטף מאוזן. שתי מפלגות מציעות להכפיל את תקציב התחבורה הציבורית ($Δ{G} > 0$). מפלגת האחווה (א) תממן את הגידול בביטול פטור ממע״מ ($Δ{T} = Δ{G}$); מפלגת יחד (י) תממן אותו בגירעון ובמלווה מהציבור. בכל תא: האם המשתנה יהיה גדול יותר אם תיבחר א, אם תיבחר י, שווה בשני המקרים (=) או שלא ניתן לדעת (?).',
    settings: FIXED,
    scenarios: { A: { G: 20, T: 20 }, B: { G: 20 } },
    relOptions: ['א', 'י', '=', '?'],
    relHint: 'א = גדול יותר אם תיבחר מפלגת האחווה (מימון במיסים); י = גדול יותר אם תיבחר מפלגת יחד (מימון בגירעון).',
    vars: ['Y', 'C', 'TB', 'e', 'M', 'MP', 'P', 'Res'],
    steps: [
      { step: 1, label: 'בטווח המיידי' },
      { step: 3, label: 'בטווח הבינוני' },
    ],
    key: {
      Y: ['י', '='],
      C: ['י', 'י'],
      TB: ['א', 'א'],
      e: ['=', 'א'],
      M: ['י', 'י'],
      MP: ['י', '='],
      P: ['=', 'י'],
      Res: ['י', 'י'],
    },
    explanation:
      'בטווח המיידי מימון בגירעון מרחיב יותר: המכפיל של {G} גדול ממכפיל התקציב המאוזן, ולכן {Y}, {C}, הביקוש לכסף ו-{M} (דרך היתרות) גבוהים יותר אצל י. היבוא גדל יותר, ולכן {NX} גבוה יותר אצל א. בטווח הבינוני {Y} = {Y*} בשני המקרים, אבל אצל י המחירים עלו יותר: {eps} נמוך יותר ו-{NX} נמוך יותר. {C} גבוה יותר אצל י כי המיסים נמוכים יותר, ו-{M} גבוה יותר כי {P} גבוה יותר.',
    scenario: { settings: FIXED, shocks: { G: 20 }, step: 1 },
  },
];

/** Answer key for a sign-table question: { var: { column: sign } }. */
export function signTableKey(q) {
  if (q.key) {
    const norm = (c) => (c === '-' ? '−' : c);
    return Object.fromEntries(
      q.vars.map((v) => {
        const cells = q.key[v].trim().split(/\s+/);
        return [v, Object.fromEntries(q.columns.map((col, i) => [col, norm(cells[i])]))];
      }),
    );
  }
  const shocks = { ...ZERO_SHOCKS, ...q.shocks };
  const keys = q.vars.map((v) => LC_VARS[v]);
  const out = Object.fromEntries(q.vars.map((v) => [v, {}]));
  for (const colId of q.columns) {
    const col = COURSE_COLUMNS[colId];
    const signs = robustSigns(q.settings, shocks, col.from, col.to, keys);
    q.vars.forEach((v, i) => {
      out[v][colId] = signs[keys[i]];
    });
  }
  return out;
}

/**
 * Answer key for learning center 4 Q3: relation between economy A (k > 0) and
 * economy B (k = 0) after the same shock, robust over a parameter grid.
 */
export function compareKey(q) {
  if (q.key) {
    const out = {};
    for (const v of q.vars) q.steps.forEach((s, i) => (out[`${v}@${s.step}`] = q.key[v][i]));
    return out;
  }
  const shocks = { ...ZERO_SHOCKS, ...q.shocks };
  const seen = {};
  for (const c of [0.6, 0.8, 0.87])
    for (const b of [3, 10, 30])
      for (const h of [1.5, 6, 25])
        for (const kA of [0.2, 0.4, 0.8]) {
          const base = { ...DEFAULT_PARAMS, c, b, h };
          const A = buildScenario({ ...base, k: kA }, CLOSED, shocks).snapshots;
          const B = buildScenario({ ...base, k: 0 }, CLOSED, shocks).snapshots;
          for (const { step } of q.steps) {
            for (const v of q.vars) {
              const a = A[step][v];
              const bb = B[step][v];
              const k = `${v}@${step}`;
              (seen[k] ||= new Set()).add(sgn(a - bb, 1e-7 * (1 + Math.abs(bb))));
            }
          }
        }
  const sym = { 1: '>', '-1': '<', 0: '=' };
  return Object.fromEntries(
    Object.entries(seen).map(([k, set]) => [k, set.size === 1 ? sym[[...set][0]] : '?']),
  );
}
