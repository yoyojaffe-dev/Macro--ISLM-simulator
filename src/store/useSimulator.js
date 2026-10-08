/**
 * Simulator store. Holds only user inputs (settings, parameters, shocks,
 * timeline step, UI mode). Every economic quantity is DERIVED from these via
 * the engine, so the charts, equations, chains and tables can never disagree.
 */
import { useMemo, useReducer } from 'react';
import {
  qualitative,
  caseSplit,
  realize,
  vectorKey,
  SHOCK_UNIT,
  RULES,
  buildScenario,
  buildChains,
  evaluatePitfalls,
  DEFAULT_PARAMS,
  DEFAULT_SETTINGS,
  ZERO_SHOCKS,
  SHOCK_DEFS,
  PARAM_DEFS,
  CASES,
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
  caseKey: null, // which realization the charts draw when the outcome depends on sizes
};

/** Some parameter values are only admissible in some settings (e.g. k = 0 in a closed economy). */
function clampParams(params, settings) {
  const out = { ...params };
  for (const d of PARAM_DEFS) {
    const min = settings.economy === 'open' && d.minOpen != null ? d.minOpen : d.min;
    if (out[d.id] < min) out[d.id] = min;
  }
  return out;
}

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
    case 'SET_ASSUME':
      return { ...state, settings: { ...state.settings, assume: { ...(state.settings.assume || {}), [action.id]: action.value } } };
    case 'SET_DIR': {
      // Qualitative input: only the direction of each shock.
      const shocks = { ...state.shocks, [action.id]: action.dir * SHOCK_UNIT[action.id] };
      return { ...state, shocks, fixedSizes: false, caseKey: null, caseId: null };
    }
    case 'TOGGLE_RULE': {
      const has = state.rules.includes(action.key);
      const rule = RULES[action.key];
      // One rule per shock; the shock itself becomes endogenous.
      const rules = has ? state.rules.filter((k) => k !== action.key) : [...state.rules.filter((k) => RULES[k].id !== rule.id), action.key];
      return { ...state, rules, shocks: { ...state.shocks, [rule.id]: 0 }, caseKey: null };
    }
    case 'SET_CASE':
      return { ...state, caseKey: action.key };
    case 'FREE_SIZES':
      return { ...state, fixedSizes: false, caseKey: null };
    case 'SET_SHOCK':
      return { ...state, shocks: { ...state.shocks, [action.id]: action.value } };
    case 'RESET_SHOCKS':
      return { ...state, shocks: { ...ZERO_SHOCKS }, step: 0, caseId: null, rules: [], fixedSizes: false, caseKey: null };
    case 'SET_PARAM':
      return { ...state, params: { ...state.params, [action.id]: action.value } };
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
        rules: [],
        fixedSizes: true, // the story fixes the relative sizes
        caseKey: null,
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
        rules: [],
        fixedSizes: true, // the question gives the sizes (e.g. ΔG = ΔT)
        caseKey: null,
      };
    case 'CLEAR_CASE':
      return { ...state, caseId: null };
    case 'RESET_ALL':
      return { ...initialState };
    default:
      return state;
  }
}

export function useSimulator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Signs over every admissible slope and relative size. The drawing sliders
  // (c, b, h, k, m, n) do not change them; the other parameters do.
  const p = state.params;
  const signs = useMemo(
    () => qualitative(state.params, state.settings, state.shocks, { fixed: state.fixedSizes, rules: state.rules }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.settings, state.shocks, state.fixedSizes, state.rules, p.t, p.delta, p.kappa, p.omega, p.ciV, p.betaV, p.bw],
  );
  const allCases = useMemo(
    () => caseSplit(state.params, state.settings, state.shocks, { fixed: state.fixedSizes, rules: state.rules }),
    [state.params, state.settings, state.shocks, state.fixedSizes, state.rules],
  );
  const cases = allCases[state.step] || [];
  const chosen = cases.find((c) => vectorKey(c.vec) === state.caseKey) || cases[0] || null;
  const scenario = useMemo(() => {
    const drawn = buildScenario(
      state.params,
      state.settings,
      realize(state.params, state.settings, state.shocks, chosen?.vec || {}, state.rules),
    );
    return { ...drawn, signs, cases, caseKey: chosen ? vectorKey(chosen.vec) : null, rules: state.rules, fixedSizes: state.fixedSizes };
  }, [state.params, state.settings, state.shocks, state.rules, state.fixedSizes, signs, chosen ? vectorKey(chosen.vec) : null, cases]);
  // Immediate-run chains show each shock in isolation, so they use the signs of that shock alone.
  const isolated = useMemo(() => {
    const out = {};
    for (const d of SHOCK_DEFS) {
      if (!state.shocks[d.id] || !d.applies(state.settings)) continue;
      out[d.id] = qualitative(state.params, state.settings, { ...ZERO_SHOCKS, [d.id]: state.shocks[d.id] }, { fixed: state.fixedSizes }).prev[1];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings, state.shocks, state.fixedSizes, p.t, p.delta, p.omega, p.ciV, p.betaV, p.bw]);
  const chains = useMemo(
    () => buildChains(scenario, state.step, { isolated, combined: signs.prev }),
    [scenario, state.step, signs, isolated],
  );
  const alerts = useMemo(() => evaluatePitfalls(scenario, state.step), [scenario, state.step]);
  const activeCase = state.caseId ? CASES.find((c) => c.id === state.caseId) : null;
  return { state, dispatch, scenario, chains, alerts, activeCase };
}
