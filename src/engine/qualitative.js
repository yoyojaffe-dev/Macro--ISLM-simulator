/**
 * Qualitative analysis, as in the course's exercises and exams.
 *
 * Shocks are given only by direction (↑ / ↓). Every reported change is a sign
 * (+, −, =, ?), found by solving the model over
 *   - a grid of admissible parameters (slopes of IS, LM, AS, trade), and
 *   - a grid of relative shock sizes (when several shocks hit at once, or when
 *     the size decides whether E reaches the edge of a band),
 * and reporting a sign only when every realization agrees. Opposing shocks
 * therefore show "?" exactly as in the exams.
 *
 * The charts draw one realization ("case"). When the sign of a key variable
 * depends on the relative sizes, the distinct cases are listed so the student
 * can look at each, the way the exam solutions split into cases.
 */
import { DEFAULT_PARAMS, SHOCK_DEFS, ZERO_SHOCKS } from './constants.js';
import { buildScenario, sgn } from './model.js';

/** Size of a "unit" shock used for drawing (visible on the fixed axes). */
export const SHOCK_UNIT = {
  G: 30,
  T: 30,
  M: 40,
  rT: 1.5,
  L0: 20,
  C0: 25,
  I0: 25,
  A: 6,
  K: 8,
  W: 6,
  e: 8,
  bandLo: 3,
  bandHi: 3,
  rStar: 1,
  Pstar: 8,
  aStar: 30,
  Ee: 1,
  Mf: 40,
  Gf: 30,
};

/** Variables reported as signs. */
export const SIGN_VARS = [
  'Y', 'C', 'I', 'G', 'T', 'NX', 'r', 'M', 'MP', 'P', 'w', 'wP', 'L', 'e', 'eps', 'reservesDelta', 'debt',
  'rStar', 'Yf', 'Pstar', 'Ystar', 'X', 'IM', 'a',
];

const KEY_VARS = ['Y', 'r', 'P', 'e', 'eps', 'NX', 'M', 'MP', 'reservesDelta'];
const SIZES = [0.3, 1, 3];

/** Parameter grid: the extremes of each admissible slope. */
function paramGrid(raw, settings) {
  const open = settings.economy === 'open';
  const axes = {
    c: [0.6, 0.85],
    b: [3, 25],
    h: [2, 25],
    k: [0.2, 0.7],
    ...(open ? { m: [0.1, 0.35], n: [100, 600] } : {}),
  };
  let grid = [{ ...DEFAULT_PARAMS, ...raw }];
  for (const [key, vals] of Object.entries(axes)) grid = grid.flatMap((p) => vals.map((v) => ({ ...p, [key]: v })));
  return grid;
}

/** Relative-size vectors for the active shocks. */
function sizeVectors(ids, fixed) {
  if (fixed || ids.length === 0) return [Object.fromEntries(ids.map((id) => [id, 1]))];
  if (ids.length <= 3) {
    let out = [{}];
    for (const id of ids) out = out.flatMap((v) => SIZES.map((s) => ({ ...v, [id]: s })));
    return out;
  }
  const ones = Object.fromEntries(ids.map((id) => [id, 1]));
  const out = [ones];
  for (const id of ids) {
    out.push({ ...Object.fromEntries(ids.map((x) => [x, 0.3])), [id]: 3 });
    out.push({ ...ones, [id]: 0.3 });
  }
  return out;
}

const scale = (shocks, vec) => {
  const out = { ...ZERO_SHOCKS, ...shocks };
  for (const [id, f] of Object.entries(vec)) out[id] = shocks[id] * f;
  return out;
};

/**
 * Policy rules stated in words ("the government sets ΔG so that Y stays at
 * Y*"): the shock becomes endogenous and is solved in each realization.
 * Two evaluations and a secant step; the model is linear within a regime.
 */
export const RULES = {
  T_G: { id: 'T', equals: 'G', label: 'תקציב מאוזן: ΔT = ΔG' },
  G_Y: { id: 'G', field: 'Y', label: 'ΔG נקבע כך ש-Y המיידי לא משתנה' },
  T_Y: { id: 'T', field: 'Y', label: 'ΔT נקבע כך ש-Y המיידי לא משתנה' },
  M_Y: { id: 'M', field: 'Y', label: 'ΔM נקבע כך ש-Y המיידי לא משתנה' },
  M_r: { id: 'M', field: 'r', label: 'ΔM נקבע כך ש-i המיידי לא משתנה (מדיניות מוניטרית מתאימה)' },
  M_E: { id: 'M', field: 'e', label: 'ΔM נקבע כך ש-E המיידי לא משתנה' },
};

function applyRules(params, settings, shocks, rules) {
  const list = (rules || []).map((k) => RULES[k]).filter(Boolean);
  // Linking rules (ΔT = ΔG) hold in every evaluation, including while solving the others.
  const link = (sh) => list.filter((r) => r.equals).reduce((o, r) => ({ ...o, [r.id]: o[r.equals] }), sh);
  let out = link(shocks);
  for (const rule of list.filter((r) => !r.equals)) {
    const at = (x) => {
      const sc = buildScenario(params, settings, link({ ...out, [rule.id]: x }));
      return sc.snapshots[1][rule.field] - sc.snapshots[0][rule.field];
    };
    let x0 = 0;
    let x1 = SHOCK_UNIT[rule.id];
    let f0 = at(x0);
    let f1 = at(x1);
    for (let i = 0; i < 6 && Math.abs(f1) > 1e-9 && Math.abs(f1 - f0) > 1e-12; i += 1) {
      const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
      [x0, f0] = [x1, f1];
      x1 = x2;
      f1 = at(x1);
    }
    out = link({ ...out, [rule.id]: x1 });
  }
  return out;
}

/** The numeric shocks of one realization (used to draw the charts). */
export function realize(params, settings, shocks, vec = {}, rules = []) {
  return applyRules(params, settings, scale(shocks, vec), rules);
}

const SYM = { 1: '+', '-1': '−', 0: '=' };

/**
 * A condition stated in a question ("given that Y rose in the immediate run"):
 * { from, to, v, sign } with steps 0-3 and sign '+', '−' or '='. Only the
 * realizations that satisfy every condition are kept.
 */
const holdsGiven = (sn, given) =>
  (given || []).every(({ from, to, v, sign }) => {
    const a = sn[from];
    const z = sn[to];
    if (!a || !z || a.noEq || z.noEq || !a.valid || !z.valid) return false;
    const x = a[v];
    const y = z[v];
    if (!(Number.isFinite(x) && Number.isFinite(y))) return false;
    return SYM[sgn(y - x, 1e-7 * (1 + Math.abs(x)))] === sign.replace('-', '−');
  });

/**
 * Signs of every variable at every step, relative to the origin and to the
 * previous step, robust over parameters and relative shock sizes.
 * Returns { origin: [4][var], prev: [4][var], noEq: [4] ('all'|'some'|null), cases }.
 */
export function qualitative(rawParams, settings, shocks, { fixed = false, rules = [], given = null } = {}) {
  const ruled = new Set((rules || []).map((k) => RULES[k]?.id));
  const ids = SHOCK_DEFS.filter((d) => d.applies(settings) && shocks[d.id] && !ruled.has(d.id)).map((d) => d.id);
  const vectors = sizeVectors(ids, fixed);
  const seen = {
    origin: [0, 1, 2, 3].map(() => ({})),
    prev: [0, 1, 2, 3].map(() => ({})),
    // When expectations fade while prices adjust, the change is split in two
    // (see buildScenario's expectOnly): expectations at old prices, then prices.
    expect: [0, 1, 2, 3].map(() => ({})),
    price: [0, 1, 2, 3].map(() => ({})),
  };
  const noEqCount = [0, 0, 0, 0];
  const invalidCount = [0, 0, 0, 0];
  let total = 0;
  const add = (bucket, step, v, s) => ((bucket[step][v] ||= new Set()).add(s));
  // With free sizes, a very large shock can push the closed-economy rate to
  // zero; the course treats the liquidity trap as a separate case, so those
  // realizations count only when nothing else is possible.
  let runs = [];
  for (const params of paramGrid(rawParams, settings)) {
    for (const vec of vectors) {
      const sc = buildScenario(params, settings, realize(params, settings, shocks, vec, rules));
      const sn = sc.snapshots;
      runs.push({ sn, ex: sc.expectOnly, trap: !sn[0].zlb && sn.some((x) => x.zlb) });
    }
  }
  // Conditions given in the question keep only the realizations that meet them.
  let givenImpossible = false;
  if (given && given.length) {
    const kept = runs.filter((x) => holdsGiven(x.sn, given));
    givenImpossible = kept.length === 0;
    if (!givenImpossible) runs = kept;
  }
  const normal = runs.filter((x) => !x.trap);
  const used = fixed || normal.length === 0 ? runs : normal;
  const trapSome = !fixed && normal.length > 0 && normal.length < runs.length;
  const cmp = (bucket, st, from, to) => {
    for (const v of SIGN_VARS) {
      const a = from[v];
      const z = to[v];
      if (typeof a === 'number' && typeof z === 'number' && Number.isFinite(a) && Number.isFinite(z)) {
        add(bucket, st, v, sgn(z - a, 1e-7 * (1 + Math.abs(a))));
      }
    }
  };
  for (const { sn, ex } of used) {
    for (const [st, key] of [[2, 'mr'], [3, 'lr']]) {
      const mid = ex?.[key];
      const p = sn[st - 1];
      if (!mid || sn[st].noEq || !sn[st].valid || p.noEq || !p.valid) continue;
      cmp(seen.expect, st, p, mid);
      cmp(seen.price, st, mid, sn[st]);
    }
    {
      total += 1;
      for (let st = 1; st <= 3; st += 1) {
        // No equilibrium is an economic result; an invalid realization (a
        // component turned negative at extreme slopes) is a model breakdown.
        // Neither contributes signs.
        if (sn[st].noEq) {
          noEqCount[st] += 1;
          continue;
        }
        if (!sn[st].valid) {
          invalidCount[st] += 1;
          continue;
        }
        for (const v of SIGN_VARS) {
          const a = sn[0][v];
          const z = sn[st][v];
          if (typeof a === 'number' && typeof z === 'number' && Number.isFinite(a) && Number.isFinite(z)) {
            add(seen.origin, st, v, sgn(z - a, 1e-7 * (1 + Math.abs(a))));
          }
          const p = sn[st - 1];
          if (!(p.noEq || !p.valid)) {
            const b = p[v];
            if (typeof b === 'number' && typeof z === 'number' && Number.isFinite(b) && Number.isFinite(z)) {
              add(seen.prev, st, v, sgn(z - b, 1e-7 * (1 + Math.abs(b))));
            }
          }
        }
      }
    }
  }
  const fold = (bucket) =>
    bucket.map((m, st) =>
      st === 0
        ? Object.fromEntries(SIGN_VARS.map((v) => [v, '=']))
        : Object.fromEntries(Object.entries(m).map(([v, set]) => [v, set.size === 1 ? SYM[[...set][0]] : '?'])),
    );
  const noEq = noEqCount.map((n, st) => (n + invalidCount[st] === total && total > 0 ? 'all' : n === 0 ? null : 'some'));
  return {
    origin: fold(seen.origin),
    prev: fold(seen.prev),
    split: { expect: fold(seen.expect), price: fold(seen.price) },
    noEq,
    trapSome,
    givenImpossible,
  };
}

const sizeWord = (f) => (f > 1 ? 'חזק' : f < 1 ? 'חלש' : 'בינוני');

/**
 * Cases for drawing: realizations at the student's parameters whose key
 * variables move differently. One list per step.
 */
export function caseSplit(params, settings, shocks, { fixed = false, rules = [] } = {}) {
  const ruled = new Set((rules || []).map((k) => RULES[k]?.id));
  const ids = SHOCK_DEFS.filter((d) => d.applies(settings) && shocks[d.id] && !ruled.has(d.id)).map((d) => d.id);
  const vectors = sizeVectors(ids, fixed);
  const sym = (d) => SYM[d];
  const runs = vectors.map((vec) => {
    const sc = buildScenario(params, settings, realize(params, settings, shocks, vec, rules));
    return { vec, sn: sc.snapshots, bound: Boolean(sc.rateTarget?.bound) };
  });
  return [0, 1, 2, 3].map((st) => {
    const groups = new Map();
    for (const r of runs) {
      const s = r.sn[st];
      if (!s.valid) continue;
      const pattern = KEY_VARS.map((v) => {
        const a = r.sn[0][v];
        const z = s[v];
        return typeof a === 'number' && typeof z === 'number' ? sym(sgn(z - a, 1e-7 * (1 + Math.abs(a)))) : '·';
      }).join('') + (s.noEq ? 'N' : '') + (s.zlb || (st > 0 && r.bound) ? 'Z' : '') + (s.band || '');
      if (!groups.has(pattern)) groups.set(pattern, []);
      groups.get(pattern).push(r.vec);
    }
    const signsOf = (pattern) => Object.fromEntries(KEY_VARS.map((v, i) => [v, pattern[i]]));
    // What the pattern says beyond the signs: no equilibrium, the zero bound, the band.
    const flagsOf = (pattern) => {
      const tail = pattern.slice(KEY_VARS.length);
      const out = [];
      if (tail.includes('N')) out.push('אין שיווי משקל');
      if (tail.includes('Z')) out.push('הריבית ברצפת האפס');
      if (tail.endsWith('inside')) out.push('שע״ח בתוך הרצועה');
      if (tail.endsWith('low')) out.push('שע״ח בגבול התחתון');
      if (tail.endsWith('high')) out.push('שע״ח בגבול העליון');
      return out;
    };
    const list = [...groups.entries()].map(([pattern, vecs]) => {
      // Prefer the most telling member: equal sizes, then one dominant shock.
      const pick =
        vecs.find((v) => Object.values(v).every((f) => f === 1)) ||
        vecs.find((v) => Object.values(v).filter((f) => f === 3).length === 1 && Object.values(v).every((f) => f !== 1)) ||
        vecs[0];
      return { pattern, signs: signsOf(pattern), flags: flagsOf(pattern), vec: pick, members: vecs, label: describe(pick, ids) };
    });
    return list.length > 1 ? list : [];
  });
}

function describe(vec, ids) {
  const name = (id) => `Δ${SHOCK_DEFS.find((d) => d.id === id)?.sym ?? id}`;
  if (ids.length === 1) {
    const f = vec[ids[0]];
    return f > 1 ? 'שינוי גדול' : f < 1 ? 'שינוי קטן' : 'שינוי בינוני';
  }
  const vals = ids.map((id) => vec[id]);
  if (vals.every((f) => f === vals[0])) return 'השינויים בגודל דומה';
  return ids.map((id) => `${name(id)} ${sizeWord(vec[id])}`).join(', ');
}

/** Key of a size vector (to remember the selected case). */
export const vectorKey = (vec) =>
  Object.entries(vec || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join('|');
