/**
 * Simulator state transitions. Pure functions with no React dependency, so the
 * engine tests can exercise them directly.
 */
import {
  RULES,
  SHOCK_UNIT,
  DEFAULT_PARAMS,
  DEFAULT_SETTINGS,
  ZERO_SHOCKS,
  SHOCK_DEFS,
  PARAM_DEFS,
  CASES,
  MPS_MAX,
  activeAssumptions,
} from '../engine/index.js';

export const initialState = {
  mode: 'sim', // 'sim' | 'cases' | 'quiz'
  settings: { ...DEFAULT_SETTINGS },
  params: { ...DEFAULT_PARAMS },
  shocks: { ...ZERO_SHOCKS },
  step: 0,
  caseId: null,
  rules: [], // policy rules stated in words, see RULES
  fixedSizes: false, // true when a case study or a learning-center question gives the sizes
  caseVec: null, // relative sizes the charts draw (null: equal sizes); kept across steps
};

/** Keep every parameter inside its slider range and the multiplier finite. */
function clampParams(params, settings, changed = null) {
  const out = { ...params };
  for (const d of PARAM_DEFS) {
    const min = settings.economy === 'open' && d.minOpen != null ? d.minOpen : d.min;
    if (out[d.id] < min) out[d.id] = min;
    if (out[d.id] > d.max) out[d.id] = d.max;
  }
  return stabilize(out, settings, changed);
}

/**
 * The marginal propensity to spend out of output, c(1 − t) + δ + β, must stay
 * below 1 (learning center 4: c + δ < 1). When a change would break this, the
 * parameter being changed stops at the boundary (c otherwise).
 */
function stabilize(params, settings, changed) {
  const beta = activeAssumptions(settings).includes('investY') ? params.betaV ?? 0.1 : 0;
  const t = params.t || 0;
  const delta = params.delta || 0;
  if (params.c * (1 - t) + delta + beta <= MPS_MAX + 1e-12) return params;
  const down = (x) => Math.floor(x * 100 + 1e-9) / 100; // slider steps are 0.01
  const out = { ...params };
  const room = (x) => MPS_MAX - x;
  if (changed === 'delta' && room(params.c * (1 - t) + beta) >= 0) out.delta = down(room(params.c * (1 - t) + beta));
  else if (changed === 'betaV' && room(params.c * (1 - t) + delta) >= 0.02) out.betaV = down(room(params.c * (1 - t) + delta));
  else if (changed === 't') out.t = Math.ceil((1 - room(delta + beta) / params.c) * 100 - 1e-9) / 100;
  else out.c = down(room(delta + beta) / (1 - t));
  return out;
}

export const sameVec = (a, b) => {
  const ids = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return [...ids].every((id) => (a?.[id] ?? 1) === (b?.[id] ?? 1));
};

function pruneShocks(shocks, settings) {
  const out = { ...shocks };
  for (const d of SHOCK_DEFS) if (!d.applies(settings)) out[d.id] = 0;
  return out;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_SETTING': {
      const settings = { ...state.settings, [action.key]: action.value };
      settings.school = 'keynesian';
      settings.instrument = 'M'; // the course's monetary instrument is the money stock (Lectures 3, 5)
      settings.mobility = 'perfect'; // the course analyses perfect capital mobility
      // The band is modelled for a small open economy only.
      if (settings.regime === 'band' && settings.size === 'large') settings.regime = 'floating';
      return { ...state, settings, params: clampParams(state.params, settings), shocks: pruneShocks(state.shocks, settings) };
    }
    case 'SET_ASSUME': {
      const settings = { ...state.settings, assume: { ...(state.settings.assume || {}), [action.id]: action.value } };
      return { ...state, settings, params: clampParams(state.params, settings) };
    }
    case 'SET_DIR': {
      // Qualitative input: only the direction of each shock.
      const shocks = { ...state.shocks, [action.id]: action.dir * SHOCK_UNIT[action.id] };
      // Leaving a loaded case also drops its policy rules (they have no control of their own).
      return { ...state, shocks, fixedSizes: false, caseVec: null, caseId: null, rules: [] };
    }
    case 'TOGGLE_RULE': {
      const has = state.rules.includes(action.key);
      const rule = RULES[action.key];
      // One rule per shock; the shock itself becomes endogenous.
      const rules = has ? state.rules.filter((k) => k !== action.key) : [...state.rules.filter((k) => RULES[k].id !== rule.id), action.key];
      return { ...state, rules, shocks: { ...state.shocks, [rule.id]: 0 }, caseVec: null };
    }
    case 'SET_CASE':
      return { ...state, caseVec: action.vec };
    case 'FREE_SIZES':
      return { ...state, fixedSizes: false, caseVec: null };
    case 'SET_SHOCK':
      return { ...state, shocks: { ...state.shocks, [action.id]: action.value } };
    case 'RESET_SHOCKS':
      return { ...state, shocks: { ...ZERO_SHOCKS }, step: 0, caseId: null, rules: [], fixedSizes: false, caseVec: null };
    case 'SET_PARAM':
      return { ...state, params: clampParams({ ...state.params, [action.id]: action.value }, state.settings, action.id) };
    case 'RESET_PARAMS':
      return { ...state, params: { ...DEFAULT_PARAMS } };
    case 'NEXT':
      return { ...state, step: Math.min(3, state.step + 1) };
    case 'PREV':
      return { ...state, step: Math.max(0, state.step - 1) };
    case 'SET_STEP':
      return { ...state, step: Math.max(0, Math.min(3, action.step)) };
    case 'LOAD_CASE': {
      const cs = CASES.find((c) => c.id === action.id);
      if (!cs) return state;
      return {
        ...state,
        mode: 'sim',
        caseId: cs.id,
        settings: { ...DEFAULT_SETTINGS, ...cs.settings },
        params: clampParams({ ...DEFAULT_PARAMS, ...cs.params }, { ...DEFAULT_SETTINGS, ...cs.settings }),
        shocks: pruneShocks({ ...ZERO_SHOCKS, ...cs.shocks }, { ...DEFAULT_SETTINGS, ...cs.settings }),
        step: 0,
        rules: cs.rules || [],
        fixedSizes: true, // the story fixes the relative sizes
        caseVec: null,
      };
    }
    case 'LOAD_SCENARIO':
      return {
        ...state,
        mode: 'sim',
        caseId: null,
        settings: { ...DEFAULT_SETTINGS, ...action.settings },
        params: clampParams({ ...DEFAULT_PARAMS, ...(action.params || {}) }, { ...DEFAULT_SETTINGS, ...action.settings }),
        shocks: pruneShocks({ ...ZERO_SHOCKS, ...action.shocks }, { ...DEFAULT_SETTINGS, ...action.settings }),
        step: action.step ?? 0,
        rules: action.rules || [],
        fixedSizes: true, // the question gives the sizes (e.g. ΔG = ΔT)
        caseVec: null,
      };
    case 'CLEAR_CASE':
      return { ...state, caseId: null };
    case 'RESET_ALL':
      return { ...initialState };
    default:
      return state;
  }
}

