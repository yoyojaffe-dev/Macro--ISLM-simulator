/**
 * Economic debugger: rule-based alerts for theoretical constraints and
 * common student mistakes. Text may contain {var} tokens that the UI renders
 * as color-coded variables (see ui/theme.js VARS).
 *
 * level: 'error'   -> the policy cannot work / the model breaks
 *        'warning' -> the result differs sharply from the naive expectation
 *        'info'    -> a concept worth noticing at this step
 */
import { kappaOf, isLarge, regimeAt } from './model.js';
import { activeAssumptions, ASSUMPTION_DEFS } from './constants.js';

const DEMAND_SHOCKS = ['G', 'T', 'M', 'L0', 'C0', 'I0', 'e', 'rStar', 'Pstar', 'aStar', 'Ee', 'Mf', 'Gf', 'rT'];
const FISCAL = ['G', 'T'];

export function evaluatePitfalls(scenario, step) {
  const { settings, params, shocks, snapshots, activeShocks } = scenario;
  const [t0, sr, mr, lr] = snapshots;
  const cur = snapshots[step];
  const open = settings.economy === 'open';
  const large = isLarge(settings);
  const kap = kappaOf(settings, params);
  // Under a band, the alerts follow the regime operating at this step.
  const regime = regimeAt(settings, cur);
  const has = (id) => shocks[id] !== 0;
  const anyOf = (ids) => ids.some(has);
  const out = [];
  const add = (id, level, title, body, ref) => out.push({ id, level, title, body, ref });

  if (step === 0) {
    if (activeShocks.length > 0) {
      add(
        'pending',
        'info',
        'הזעזוע מוכן',
        'בחרתם זעזוע, אבל המשק עדיין במצב המוצא. לחצו על "התקופה הבאה" כדי לראות את הטווח המיידי.',
      );
    }
    return out;
  }

  // Model validity
  const visited = snapshots.slice(1, step + 1);
  if (visited.some((s) => !s.valid)) {
    add(
      'invalid',
      'error',
      'הזעזוע גדול מדי למודל הליניארי',
      'אחד הרכיבים ({I}, {C} או {M}) קיבל ערך לא כלכלי. הקטינו את הזעזוע או שנו את הפרמטרים.',
    );
  }

  // Liquidity trap
  if (!open && sr.zlb) {
    if (has('M') && shocks.M > 0) {
      add(
        'liquidityTrap',
        'error',
        'מלכודת נזילות: ההרחבה המוניטרית לא עובדת',
        'הריבית {r} כבר באפס. כסף נוסף נאגר ואינו מוריד ריבית, ולכן {I} ו-{Y} לא משתנים. עקומת {LM} אופקית בקטע הזה. הרחבה פיסקלית ({G}↑) יעילה במיוחד כאן כי אין דחיקה החוצה.',
        'הרצאה 5; S&L פרק 12',
      );
    } else {
      add(
        'zlb',
        'warning',
        'הריבית הגיעה לרצפת האפס',
        'הביקוש נפל עד כדי כך ש-{r} = 0. מכאן הרחבה מוניטרית רגילה לא תוריד ריבית נוספת.',
        'הרצאה 5',
      );
    }
  }
  const assumed = activeAssumptions(settings);
  const verticalAD = assumed.includes('realM') || assumed.includes('flatLM');
  if (step === 3 && lr.noEq && verticalAD) {
    add(
      'verticalAD',
      'error',
      'AD אנכית: אין שיווי משקל בטווח הבינוני',
      assumed.includes('realM')
        ? 'הבנק המרכזי מגדיל את {M} יחד עם {P}, כך ש-{MP} לא משתנה. ירידה או עלייה במחירים לא מזיזה את {LM}, ולכן {AD} אנכית. אם {Y} ≠ {Y*}, עדכון השכר רק מזיז את המחירים ו-{Y} לא חוזר ל-{Y*} (מבחן 2026).'
        : 'הביקוש לכסף גמיש לחלוטין לריבית: שינוי ב-{P} לא משנה את {r}, ולכן {AD} אנכית. אם {Y} ≠ {Y*}, המחירים ימשיכו לזוז ו-{Y} לא יחזור ל-{Y*}.',
      'מבחן 2026',
    );
  } else if (step === 3 && lr.noEq) {
    if (sr.zlb || mr.zlb || scenario.needsNegativeRate) {
      add(
        'noLongRun',
        'error',
        'אין שיווי משקל בטווח הבינוני',
        'עקומת {AD} אנכית: ירידת {P} מגדילה את {MP}, אבל בריבית אפס זה לא מגדיל את הביקוש. המשק לא חוזר לבד ל-{Y*}. נדרשת הגדלת {G} או הורדת {T}.',
        'הרצאה 5; S&L פרק 12',
      );
    } else {
      add(
        'noLongRunLinear',
        'error',
        'הזעזוע גדול מדי למודל הליניארי',
        'כדי ש-{Y} יחזור ל-{Y*}, {r} היה צריך לזוז כל כך שהביקוש לכסף ({MP}) יהפוך לשלילי. זו מגבלה של המודל הליניארי, לא תוצאה כלכלית. הקטינו את הזעזוע, או הגדילו את {b} או הקטינו את {h}.',
      );
    }
  }

  // Curve-shape special cases (closed or imperfect mobility)
  const lmMatters = !open || (regime === 'floating' ? kap !== Infinity : false);
  if (lmMatters && params.h >= 30 && has('M') && !sr.zlb) {
    add(
      'flatLM',
      'warning',
      'עקומת LM כמעט אופקית',
      'h גבוה מאוד: הביקוש לכסף רגיש מאוד לריבית. שינוי ב-{M} כמעט לא מזיז את {r}, ולכן השפעתו על {Y} חלשה.',
      'S&L פרק 12',
    );
  }
  if (lmMatters && params.h <= 1.5 && anyOf(['G', 'T', 'C0', 'I0'])) {
    add(
      'verticalLM',
      'warning',
      'עקומת LM כמעט אנכית: דחיקה כמעט מלאה',
      'h קטן מאוד: הביקוש לכסף לא תלוי בריבית. הרחבה פיסקלית מעלה את {r} עד ש-{I} יורד כמעט באותו סכום, ו-{Y} כמעט לא משתנה.',
      'S&L פרק 12',
    );
  }
  if (!open && params.b <= 2 && has('M')) {
    add(
      'verticalIS',
      'warning',
      'עקומת IS כמעט אנכית',
      'b קטן מאוד: ההשקעה לא מגיבה לריבית. הורדת {r} לא מגדילה את {I}, ולכן המדיניות המוניטרית חלשה.',
      'S&L פרק 12',
    );
  }

  // Open economy
  if (open && settings.regime === 'fixed' && has('M')) {
    add(
      'trilemma',
      'error',
      'הטרילמה: אין מדיניות מוניטרית עצמאית בשע״ח קבוע',
      shocks.M > 0
        ? 'לחץ להורדת {r} מוביל ליציאת הון. כדי להגן על {e} הבנק המרכזי מוכר מט״ח, ו-{M} חוזר לרמתו. כל מה שנשאר הוא ירידה ביתרות.'
        : 'לחץ להעלאת {r} מכניס הון. כדי להגן על {e} הבנק המרכזי קונה מט״ח, ו-{M} חוזר לרמתו. כל מה שנשאר הוא עלייה ביתרות.',
      'הרצאה 8',
    );
  }
  if (open && settings.regime === 'band' && has('M') && cur.band !== 'inside') {
    add(
      'bandMonetary',
      'info',
      'מדיניות מוניטרית ברצועת ניוד',
      'עד לקצה הרצועה {e} זז בחופשיות והמדיניות משפיעה כמו בשע״ח נייד. מעבר לקצה הבנק המרכזי מתערב ומקזז את שאר השינוי ב-{M}, ולכן ההשפעה על {Y} חלקית.',
      'מרכז למידה 7',
    );
  }
  if (open && !large && regime === 'floating' && kap === Infinity && anyOf(FISCAL)) {
    add(
      'fiscalFloat',
      'warning',
      'מדיניות פיסקלית לא משפיעה על התוצר בשע״ח נייד',
      'שינוי בספיגה (דרך {G} או {T}) יוצר לחץ על {r} ותנועות הון. שער החליפין זז עד ש-{NX} מקזז בדיוק את השינוי בספיגה, ו-{Y} לא משתנה. גם עקומת {AD} לא זזה.',
      'הרצאה 9',
    );
  }
  if (open && regime === 'floating' && settings.mobility === 'partial' && anyOf(FISCAL)) {
    const lmSlope = params.k / params.h;
    const bpSlope = (params.m * params.c) / (params.m * params.b + params.kappa);
    add(
      'partialFiscal',
      'info',
      'כיוון שע״ח תלוי בשיפועי CM ו-LM',
      bpSlope < lmSlope
        ? '{CM} שטוחה מ-{LM} (ניידות הון גבוהה יחסית): הרחבה פיסקלית מובילה לייסוף ({e}↓).'
        : '{CM} תלולה מ-{LM} (ניידות הון נמוכה): הרחבה פיסקלית מובילה לפיחות ({e}↑) כי היבוא גדל יותר מכניסת ההון.',
      'הרצאה 12',
    );
  }
  if (open && regime === 'floating' && has('Pstar')) {
    add(
      'insulation',
      'info',
      'שע״ח נייד מבודד מזעזועי מחירים בחו״ל',
      '{e} זז ביחס הפוך ל-{P*}, כך ש-{eps} = {e}·{P*}/{P} לא משתנה. התוצר לא מושפע.',
      'הרצאה 12',
    );
  }
  if (open && regime === 'fixed' && has('e') && step === 3) {
    add(
      'devaluationLR',
      'info',
      'פיחות משפיע על המשק הריאלי רק זמנית',
      '{P} עולה באותו שיעור כמו {e}, ולכן {eps} חוזר לרמתו ההתחלתית ו-{Y} חוזר ל-{Y*}.',
      'הרצאה 8',
    );
  }
  if (open && step >= 1 && cur.e != null && t0.e != null) {
    const de = Math.sign(Math.round((cur.e - t0.e) * 1e6));
    const deps = Math.sign(Math.round((cur.eps - t0.eps) * 1e6));
    if (de !== deps) {
      add(
        'nominalReal',
        'info',
        'שימו לב: שע״ח נומינלי מול ריאלי',
        'השינוי ב-{e} (נומינלי) שונה מהשינוי ב-{eps} (ריאלי), כי {eps} = {e}·{P*}/{P}. מאזן הסחר מגיב לשע״ח הריאלי.',
      );
    }
  }

  // Alternative assumptions in force (exam-style "נניח כי…")
  for (const id of assumed) {
    const d = ASSUMPTION_DEFS.find((x) => x.id === id);
    add(`assume-${id}`, 'info', `הנחה חלופית: ${d.label}`, d.hint);
  }

  // Exchange-rate band (learning center 7)
  if (open && settings.regime === 'band') {
    const lo = cur.bandLo;
    const hi = cur.bandHi;
    if (cur.band === 'inside') {
      add(
        'bandInside',
        'info',
        'בתוך רצועת הניוד: כמו שע״ח נייד',
        `{e} נמצא ${lo > 0 && Number.isFinite(hi) ? 'בין שני גבולות הרצועה' : lo > 0 ? 'מעל הרצפה' : 'מתחת לתקרה'}. הבנק המרכזי לא מתערב, {M} נקבע במדיניות ו-{e} מתאים את עצמו. מדיניות פיסקלית לא מזיזה את {Y}; שינוי ב-{M} או בביקוש לכסף כן.`,
        'מרכז למידה 7',
      );
    } else {
      add(
        'bandEdge',
        'warning',
        cur.band === 'low' ? 'שע״ח בגבול התחתון של הרצועה' : 'שע״ח בגבול העליון של הרצועה',
        cur.band === 'low'
          ? `השוק היה מוריד את {e} מתחת לגבול התחתון. כדי לשמור על הגבול הבנק המרכזי קונה מט״ח ({Res}↑), ו-{M} גדל. בקצה הרצועה המשק מתנהג כמו בשע״ח קבוע.`
          : `השוק היה מעלה את {e} מעל הגבול העליון. כדי לשמור על הגבול הבנק המרכזי מוכר מט״ח ({Res}↓), ו-{M} קטן. בקצה הרצועה המשק מתנהג כמו בשע״ח קבוע.`,
        'מרכז למידה 7',
      );
    }
    if (step > 1 && snapshots[step - 1].band !== cur.band) {
      add(
        'bandSwitch',
        'info',
        'המשטר בפועל התחלף בין הטווחים',
        'בטווח הקודם שע״ח היה ' +
          (snapshots[step - 1].band === 'inside' ? 'בתוך הרצועה' : 'בקצה הרצועה') +
          ' ועכשיו הוא ' +
          (cur.band === 'inside' ? 'בתוך הרצועה' : 'בקצה') +
          '. הכסף שנוצר או נספג בהתערבות נשאר במשק. לכן בשאלות של רצועת ניוד התשובה ל-{e} ול-{Res} אחרי הטווח המיידי היא לעיתים "?".',
        'מרכז למידה 7',
      );
    }
  }

  // Fiscal rules and money demand (Lecture 2 exercise; learning center 4)
  if ((params.t || 0) > 0 && anyOf(['G', 'T', 'C0', 'I0', 'aStar', 'Gf']) && step === 1) {
    add(
      'autoStabilizer',
      'info',
      'מס פרופורציונלי: מייצב אוטומטי',
      `עם T = T̄ + tY חלק מכל שקל של הכנסה נוספת הולך למס, ולכן ההוצאה מגיבה פחות. המכפיל הפשוט יורד מ-1/(1 − c) ל-1/[1 − c(1 − t)], ו-{IS} תלולה יותר. הכנסות המס {T} משתנות עם {Y}.`,
      'הרצאה 2 (תרגיל)',
    );
  }
  if ((params.delta || 0) > 0 && anyOf(['G', 'T', 'C0', 'I0']) && step === 1) {
    add(
      'endogenousG',
      'info',
      'הוצאה ממשלתית שתלויה בתוצר',
      `עם G = G₀ + δY הממשלה מוציאה יותר כשהתוצר עולה, ולכן המכפיל גדל ל-1/(1 − c − δ). הרחבה מאוזנת ΔG₀ = ΔT = X מזיזה את {IS} ביותר מ-X: X(1 − c)/(1 − c − δ).`,
      'מרכז למידה 4',
    );
  }
  if (!open && params.k === 0 && anyOf(['G', 'T', 'C0', 'I0']) && step >= 1) {
    add(
      'kZero',
      'info',
      'k = 0: הביקוש לכסף לא תלוי בתוצר',
      'עליית {Y} לא מגדילה את הביקוש לכסף, ולכן {r} לא עולה: {LM} אופקית ואין דחיקה בטווח המיידי. בטווח הבינוני {Y} חוזר ל-{Y*} ו-{I} נדחק בכל זאת, כמו במשק עם k > 0.',
      'מרכז למידה 4',
    );
  }

  // Interest-rate instrument (Lecture 5)
  const rt = scenario.rateTarget;
  if (rt && step >= 1) {
    if (!rt.feasible) {
      add('rateInfeasible', 'error', 'ריבית היעד לא ניתנת להשגה', 'כדי להגיע ליעד הבנק היה צריך מלאי כסף שלילי. הקטינו את השינוי בריבית היעד.');
    } else if (rt.bound) {
      add(
        'rateZlb',
        'error',
        'אי אפשר להוריד את הריבית מתחת לאפס',
        'היעד שנבחר נמוך מאפס, אבל {r} לא יורדת מתחת ל-0: מעבר לנקודה הזו הציבור מחזיק מזומן ולא אג״ח. הבנק נעצר באפס. כאן נדרשת מדיניות פיסקלית.',
        'הרצאה 5',
      );
    }
    if (step === 1 && rt.feasible) {
      add(
        'rateRule',
        'info',
        'הבנק המרכזי קובע ריבית',
        `כדי שהריבית תגיע ליעד הבנק ${rt.dM >= 0 ? 'קונה' : 'מוכר'} אג״ח בשוק הפתוח, ו-{M} ${rt.dM >= 0 ? 'עולה' : 'יורד'}. מכאן והלאה {M} נשאר ברמה הזו.${!has('rT') ? ' כשהבנק שומר על הריבית מול זעזוע בביקוש, אין דחיקה: {LM} מתאימה את עצמה.' : ''}`,
        'הרצאה 5',
      );
    }
  }

  // Two-economy world (Lecture 12)
  if (large && regime === 'floating') {
    if (anyOf(['G', 'T', 'C0', 'I0'])) {
      add(
        'largeFiscal',
        'info',
        'משק גדול: הריבית העולמית זזה',
        'משק גדול משפיע על הריבית העולמית: {CM} זזה, והריבית החדשה נמצאת בין זו של משק קטן (שם {r} לא משתנה) לבין זו של משק סגור (i_closed). לכן שינוי בביקוש כן משנה את {Y}, בניגוד למשק קטן עם שע״ח נייד, וגם {Yf} בחו״ל משתנה דרך הסחר.',
        'הרצאה 12',
      );
    }
    if (has('Mf') && shocks.Mf > 0 && !has('M')) {
      add(
        'currencyWar',
        'warning',
        'הרחבה מוניטרית בחו״ל פוגעת במשק המקומי',
        'הריבית העולמית יורדת, המטבע המקומי מתייסף ({e}↓) ו-{NX} יורד, ולכן {Y} יורד בזמן ש-{Yf} עולה. אם נגיב בהרחבה משלנו נוריד שוב את הריבית ונייסף את המטבע הזר: "מלחמת מטבעות". נסו להוסיף {M}↑ באותו גודל כדי לראות תיאום.',
        'הרצאה 12',
      );
    }
    if (has('M') && has('Mf') && Math.sign(shocks.M) === Math.sign(shocks.Mf)) {
      add(
        'coordination',
        'info',
        'מדיניות מוניטרית מתואמת',
        'כששני הבנקים המרכזיים מרחיבים יחד, הריבית העולמית יורדת ושני המשקים צומחים, אבל {e} כמעט לא זז: אף אחד לא "גונב" ביקוש מהשני. זו ההצדקה לתיאום (ארה״ב-יפן בשנות ה-80, המשברים האחרונים).',
        'הרצאה 12',
      );
    }
  }
  if (large && regime === 'fixed' && has('Mf')) {
    add(
      'importedPolicy',
      'info',
      'שע״ח קבוע מייבא את המדיניות המוניטרית של חו״ל',
      'כדי לשמור על השער, הריבית המקומית חייבת לעקוב אחרי הריבית של המשק העוגן. שינוי ב-{Mf} עובר אלינו דרך שינוי אוטומטי ב-{M}.',
      'הרצאה 8; הרצאה 12',
    );
  }
  if (open && has('Ee') && step >= 1) {
    add(
      'uip',
      'info',
      shocks.Ee < 0 ? 'ציפייה לייסוף' : 'ציפייה לפיחות',
      shocks.Ee < 0
        ? `לפי UIP, {r} = {rStar} + ΔEᵉ: כשהשוק צופה ייסוף, הריבית המקומית נמוכה מ-{rStar}.${regime === 'floating' && has('M') && shocks.M > 0 ? ' זה מחליש את השפעת ההרחבה המוניטרית בטווח המיידי (הרצאה 9).' : ''} בהמשך הציפיות דועכות ו-{r} חוזר ל-{rStar}.`
        : 'לפי UIP, {r} = {rStar} + ΔEᵉ: כשהשוק צופה פיחות, המשקיעים דורשים ריבית מקומית גבוהה מ-{rStar}. בשע״ח קבוע זה נראה כמו חשש מפיחות: הבנק המרכזי מאבד יתרות.',
      'הרצאה 8; הרצאה 9',
    );
  }

  // Schools of thought
  if (settings.school === 'classical' && anyOf(DEMAND_SHOCKS)) {
    add(
      'classical',
      'info',
      has('M') ? 'נייטרליות הכסף בגישה הקלאסית' : 'גישה קלאסית: AS אנכית',
      has('M')
        ? 'מחירים ושכר גמישים: {P} עולה באותו שיעור כמו {M}, ו-{MP}, {r}, {Y} לא משתנים כבר בטווח המיידי.'
        : 'עם מחירים ושכר גמישים {Y} נשאר ב-{Y*}. זעזוע הביקוש משנה רק את {P} ואת הרכב התוצר.',
      'S&L פרק 3',
    );
  }
  if (settings.school === 'extreme' && step === 2 && anyOf(DEMAND_SHOCKS)) {
    add(
      'extreme',
      'info',
      'קיינסיאני קיצוני: AS אופקית',
      'תפוקה שולית קבועה של עבודה ושכר קשיח: {P} לא מגיב לביקוש, וכל השינוי עובר ל-{Y}.',
      'S&L פרק 3',
    );
  }

  // Time-horizon lessons
  if (step === 3 && settings.school !== 'classical' && !lr.noEq) {
    if (activeShocks.length === 1 && activeShocks[0] === 'M' && regime !== 'fixed') {
      add(
        'neutrality',
        'info',
        'נייטרליות הכסף בטווח הבינוני',
        `{MP}, {r}, {Y} ו-{wP} חזרו לערכם ההתחלתי. {M}, {P} ו-{w} ${shocks.M > 0 ? 'עלו' : 'ירדו'} באותו שיעור.`,
        'הרצאה 5',
      );
    }
    if (Math.abs(lr.P - t0.P) > 1e-3 && anyOf(DEMAND_SHOCKS)) {
      add(
        'priceStays',
        'info',
        'טעות נפוצה: המחירים לא חוזרים לרמתם',
        '{Y} חזר ל-{Y*}, אבל {P} נשאר ברמה החדשה. השכר {w} הדביק את המחירים, לא להפך.',
      );
    }
    if (!open && has('G') && Math.abs(lr.I - t0.I + shocks.G) < 1e-6 && !has('T') && !has('M')) {
      add(
        'fullCrowding',
        'info',
        'דחיקה מלאה בטווח הבינוני',
        'בטווח הבינוני {Y} = {Y*} ו-{C} לא השתנה, לכן Δ{I} = −Δ{G}. הריבית {r} עלתה עד שההשקעה פינתה מקום להוצאה הממשלתית.',
      );
    }
  }
  if (step === 2 && ((has('A') && shocks.A < 0) || (has('K') && shocks.K < 0) || (has('W') && shocks.W > 0)) && mr.P > sr.P && mr.Y < sr.Y) {
    add(
      'stagflation',
      'warning',
      'סטגפלציה',
      'זעזוע היצע שלילי: {P} עולה ו-{Y} יורד בו זמנית. מדיניות ביקוש יכולה לתקוף רק אחת משתי הבעיות.',
      'S&L פרק 17',
    );
  }
  if (step === 1 && (has('A') || has('K')) && settings.school !== 'classical') {
    add(
      'supplySR',
      'info',
      'זעזוע היצע בטווח המיידי',
      'כשהמחירים קשיחים התוצר נקבע לפי הביקוש, ולכן {Y} עוד לא זז. {Y*} כבר השתנה, וההשפעה תופיע כש-{P} יתעדכן.',
      'הרצאה 5',
    );
  }
  if (step === 1 && !open && has('G') && shocks.G === shocks.T && activeShocks.length === 2 && !params.t && !params.delta && !assumed.length) {
    add(
      'balancedBudget',
      'info',
      'מכפיל התקציב המאוזן קטן מ-1',
      'בריבית קבועה מכפיל התקציב המאוזן הוא 1. עם עקומת {LM} הריבית עולה ו-{I} נדחק, ולכן Δ{Y} בין 0 ל-Δ{G}.',
      'מרכז למידה 2',
    );
  }
  if (!open && has('G') && has('M') && shocks.G > 0 && shocks.M > 0 && step === 1) {
    add(
      'monetized',
      'info',
      'מימון הגירעון בהדפסת כסף',
      'שילוב של {G}↑ ו-{M}↑ מזיז גם את {IS} וגם את {LM} ימינה. {Y} עולה בבירור, וכיוון {r} תלוי בגודל ההזזות.',
      'מרכז למידה 4',
    );
  }
  return out;
}
