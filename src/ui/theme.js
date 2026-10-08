/**
 * Cognitive color system.
 * Sector hue = what a variable/curve IS (fiscal, monetary, prices, real, open).
 * Horizon hue = WHEN something happens (timeline nodes, equilibrium points, table columns).
 * Emerald, teal and long-run green are separated by hue so they never read as one color.
 */
export const SECTORS = {
  fiscal: { color: '#7C3AED', soft: '#F3EEFF', label: 'פיסקלי' },
  monetary: { color: '#059669', soft: '#E7F6F0', label: 'מוניטרי' },
  prices: { color: '#DC2626', soft: '#FDECEC', label: 'מחירים ושכר' },
  real: { color: '#1E3A8A', soft: '#E9EEF9', label: 'משק ריאלי' },
  open: { color: '#0E7C86', soft: '#E4F3F4', label: 'משק פתוח' },
};

export const HORIZON_COLORS = {
  t0: '#6B7280',
  sr: '#2563EB',
  mr: '#EA580C',
  lr: '#4CA22B',
};

export const STEP_KEYS = ['t0', 'sr', 'mr', 'lr'];

/** Variable registry: token key -> display symbol, sector, Hebrew name. */
export const VARS = {
  Y: { sym: 'Y', sector: 'real', name: 'תוצר' },
  C: { sym: 'C', sector: 'real', name: 'צריכה' },
  I: { sym: 'I', sector: 'real', name: 'השקעה' },
  AD: { sym: 'AD', sector: 'real', name: 'ביקוש מצרפי' },
  C0: { sym: 'C₀', sector: 'real', name: 'צריכה אוטונומית' },
  I0: { sym: 'I₀', sector: 'real', name: 'השקעה אוטונומית' },
  c: { sym: 'c', sector: 'real', name: 'נטייה שולית לצרוך' },
  b: { sym: 'b', sector: 'real', name: 'רגישות ההשקעה לריבית' },
  'Y*': { sym: 'Y*', sector: 'real', name: 'תוצר פוטנציאלי' },
  Ystar: { sym: 'Y*', sector: 'real', name: 'תוצר פוטנציאלי' },
  G: { sym: 'G', sector: 'fiscal', name: 'הוצאה ממשלתית' },
  T: { sym: 'T', sector: 'fiscal', name: 'מיסים' },
  IS: { sym: 'IS', sector: 'fiscal', name: 'עקומת IS' },
  M: { sym: 'M', sector: 'monetary', name: 'כמות הכסף' },
  MP: { sym: 'M/P', sector: 'monetary', name: 'יתרות ריאליות' },
  Md: { sym: 'Mᵈ', sector: 'monetary', name: 'ביקוש לכסף' },
  L0: { sym: 'L₀', sector: 'monetary', name: 'ביקוש אוטונומי לכסף' },
  r: { sym: 'i', sector: 'monetary', name: 'ריבית' },
  LM: { sym: 'LM', sector: 'monetary', name: 'עקומת LM' },
  h: { sym: 'h', sector: 'monetary', name: 'רגישות הביקוש לכסף לריבית' },
  k: { sym: 'k', sector: 'monetary', name: 'רגישות הביקוש לכסף לתוצר' },
  P: { sym: 'P', sector: 'prices', name: 'רמת המחירים' },
  Pe: { sym: 'Pᵉ', sector: 'prices', name: 'מחירים צפויים' },
  w: { sym: 'W', sector: 'prices', name: 'שכר נומינלי' },
  wP: { sym: 'W/P', sector: 'prices', name: 'שכר ריאלי' },
  L: { sym: 'L', sector: 'prices', name: 'תעסוקה' },
  A: { sym: 'A', sector: 'prices', name: 'פריון' },
  AS: { sym: 'AS', sector: 'prices', name: 'היצע מצרפי' },
  NX: { sym: 'TB', sector: 'open', name: 'מאזן הסחר' },
  X: { sym: 'X', sector: 'open', name: 'יצוא' },
  IM: { sym: 'IM', sector: 'open', name: 'יבוא' },
  e: { sym: 'E', sector: 'open', name: 'שע״ח נומינלי' },
  eps: { sym: 'e', sector: 'open', name: 'שע״ח ריאלי' },
  BP: { sym: 'CM', sector: 'open', name: 'קו ניידות ההון' },
  rStar: { sym: 'i*', sector: 'open', name: 'ריבית עולמית' },
  Yf: { sym: 'Yᶠ', sector: 'open', name: 'תוצר בחו״ל' },
  Mf: { sym: 'M*', sector: 'open', name: 'כמות הכסף בחו״ל' },
  Gf: { sym: 'G*', sector: 'open', name: 'הוצאה ממשלתית בחו״ל' },
  Ee: { sym: 'ΔEᵉ', sector: 'open', name: 'פיחות צפוי' },
  CM: { sym: 'CM', sector: 'open', name: 'קו ניידות ההון' },
  K: { sym: 'K', sector: 'prices', name: 'מלאי ההון' },
  rT: { sym: 'ī', sector: 'monetary', name: 'ריבית היעד' },
  t: { sym: 't', sector: 'fiscal', name: 'שיעור מס' },
  delta: { sym: 'δ', sector: 'fiscal', name: 'נטייה שולית להוצאה ממשלתית' },
  a: { sym: 'a', sector: 'real', name: 'ספיגה (C + I + G)' },
  ci: { sym: 'cᵢ', sector: 'real', name: 'רגישות הצריכה לריבית' },
  beta: { sym: 'β', sector: 'real', name: 'רגישות ההשקעה לתוצר' },
  YTf: { sym: '(Y−T)ᶠ', sector: 'real', name: 'הכנסה פנויה עתידית צפויה' },
  MPKe: { sym: 'MPKᵉ', sector: 'real', name: 'תשואה צפויה להון' },
  omega: { sym: 'ω', sector: 'open', name: 'חלק המשק בתוצר העולמי' },
  'P*': { sym: 'P*', sector: 'open', name: 'מחירי חו״ל' },
  Pstar: { sym: 'P*', sector: 'open', name: 'מחירי חו״ל' },
  aStar: { sym: 'a*', sector: 'open', name: 'ביקוש עולמי' },
  debt: { sym: 'D', sector: 'open', name: 'חוב חיצוני' },
  Res: { sym: 'Res', sector: 'open', name: 'יתרות מט״ח' },
  KA: { sym: 'KA', sector: 'open', name: 'חשבון ההון' },
  m: { sym: 'm', sector: 'open', name: 'נטייה שולית לייבא' },
  n: { sym: 'n', sector: 'open', name: 'רגישות מאזן הסחר לשע״ח הריאלי' },
  kappa: { sym: 'κ', sector: 'open', name: 'ניידות הון' },
};

export const sectorColor = (sector) => SECTORS[sector]?.color || '#172033';
export const varColor = (key) => sectorColor(VARS[key]?.sector);

export const fmt = (x, d = 1) => {
  if (x == null || !Number.isFinite(x)) return '—';
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
};
