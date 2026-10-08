/**
 * Simulator store. Holds only user inputs (settings, parameters, shocks,
 * timeline step, UI mode). Every economic quantity is DERIVED from these via
 * the engine, so the charts, equations, chains and tables can never disagree.
 * State transitions live in ./reducer.js.
 */
import { useMemo, useReducer } from 'react';
import {
  qualitative,
  caseSplit,
  realize,
  vectorKey,
  buildScenario,
  buildChains,
  evaluatePitfalls,
  ZERO_SHOCKS,
  SHOCK_DEFS,
  CASES,
} from '../engine/index.js';
import { reducer, initialState, sameVec } from './reducer.js';

export { reducer, initialState };

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
  // The charts draw the same realization at every step: the case the student
  // picked, or equal sizes. The highlighted case is the one it belongs to here.
  const drawnVec = state.caseVec || {};
  const chosen = cases.find((c) => c.members.some((v) => sameVec(v, drawnVec))) || null;
  const drawnKey = vectorKey(drawnVec);
  const scenario = useMemo(() => {
    const drawn = buildScenario(
      state.params,
      state.settings,
      realize(state.params, state.settings, state.shocks, drawnVec, state.rules),
    );
    return { ...drawn, signs, cases, caseKey: chosen ? vectorKey(chosen.vec) : null, rules: state.rules, fixedSizes: state.fixedSizes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.params, state.settings, state.shocks, state.rules, state.fixedSizes, signs, drawnKey, chosen ? vectorKey(chosen.vec) : null, cases]);
  // Immediate-run chains show each shock in isolation, so they use the signs of
  // that shock alone, at the size the charts draw (a shock set by a policy rule
  // included).
  const drawnShocks = scenario.shocks;
  const drawnShocksKey = JSON.stringify(drawnShocks);
  const isolated = useMemo(() => {
    const out = {};
    for (const d of SHOCK_DEFS) {
      if (!drawnShocks[d.id] || !d.applies(state.settings)) continue;
      out[d.id] = qualitative(state.params, state.settings, { ...ZERO_SHOCKS, [d.id]: drawnShocks[d.id] }, { fixed: state.fixedSizes }).prev[1];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings, drawnShocksKey, state.fixedSizes, p.t, p.delta, p.omega, p.ciV, p.betaV, p.bw]);
  const chains = useMemo(
    () => buildChains(scenario, state.step, { isolated, signs }),
    [scenario, state.step, signs, isolated],
  );
  const alerts = useMemo(() => evaluatePitfalls(scenario, state.step), [scenario, state.step]);
  const activeCase = state.caseId ? CASES.find((c) => c.id === state.caseId) : null;
  return { state, dispatch, scenario, chains, alerts, activeCase };
}
