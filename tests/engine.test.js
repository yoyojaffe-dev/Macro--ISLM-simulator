/**
 * Engine tests: each assertion encodes a result from the course
 * (Hefetz, Macro A lectures 2-12; Sachs & Larrain ch. 3, 12-14).
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildScenario,
  DEFAULT_PARAMS,
  ZERO_SHOCKS,
  robustSigns,
  CASES,
  evaluatePitfalls,
  buildChains,
  causeQuestion,
  predictQuestion,
  makeRng,
  multipliers,
  isCurve,
  supplyCurves,
  foreignIsCurve,
  foreignLmCurve,
  lmCurve,
  bpCurve,
  LC_QUESTIONS,
  signTableKey,
  compareKey,
  laborDemandCurve,
  CASE_ARTICLES,
  COURSE_COLUMNS,
  CAL,
  LC_VARS,
  calibrateShock,
  qualitative,
  caseSplit,
  SHOCK_UNIT,
  sgn,
  DEFAULT_SETTINGS,
  effectiveParams,
  MPS_MAX,
  PARAM_DEFS,
} from '../src/engine/index.js';
import { reducer, initialState } from '../src/store/reducer.js';
import { COURSE_CLAIMS, PREMISE_CLAIMS } from './courseClaims.js';

const P = DEFAULT_PARAMS;
const CLOSED = { economy: 'closed', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const FIXED = { economy: 'open', regime: 'fixed', mobility: 'perfect', school: 'keynesian' };
const FLOAT = { economy: 'open', regime: 'floating', mobility: 'perfect', school: 'keynesian' };
const BAND = { economy: 'open', size: 'small', regime: 'band', mobility: 'perfect', school: 'keynesian' };
const run = (settings, shocks, params = P) => buildScenario(params, settings, { ...ZERO_SHOCKS, ...shocks });
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * (1 + Math.abs(b)), `${a} != ${b}`);

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (e) {
    console.error(`FAIL: ${name}\n  ${e.message}`);
    process.exitCode = 1;
  }
};

test('t0 is the calibrated long-run equilibrium for every regime', () => {
  for (const s of [CLOSED, FIXED, FLOAT, { ...FLOAT, mobility: 'partial' }, { ...FIXED, mobility: 'none' }]) {
    const t0 = run(s, {}).snapshots[0];
    near(t0.Y, 1000);
    near(t0.r, CAL.rStar);
    near(t0.P, 1);
    near(t0.NX, 0, 1e-6);
  }
});

test('national accounts identity Y = C + I + G + NX holds in every snapshot', () => {
  for (const s of [CLOSED, FIXED, FLOAT, { ...FLOAT, mobility: 'partial' }, { ...FLOAT, mobility: 'none' }]) {
    for (const sc of [run(s, { G: 30, M: 20 }), run(s, { C0: -20, A: -5 })]) {
      for (const snap of sc.snapshots) near(snap.Y, snap.C + snap.I + snap.G + snap.NX);
    }
  }
});

test('Keynesian cross multiplier 1/(1-c) when LM is irrelevant (fixed rate, closed-like m→0)', () => {
  const m = multipliers(P, CLOSED, run(CLOSED, {}).snapshots[0]);
  near(m.keynesian, 5);
  // With LM the fiscal multiplier is 1/((1-c) + bk/h)
  near(m.fiscal, 1 / (1 - P.c + (P.b * P.k) / P.h), 1e-6);
});

test('Lecture 2 example: the engine IS curve reproduces Y = 750 - 50i + 5G - 4T', () => {
  // Course example: C = 100 + 0.8(Y - T), I = 50 - 10i
  const exo = { C0: 100, I0: 50, G: 100, T: 100 };
  const pts = isCurve({ ...P, c: 0.8, b: 10 }, CLOSED, exo, null, [700, 800]);
  for (const { x: Y, y: i } of pts) near(Y, 750 - 50 * i + 5 * exo.G - 4 * exo.T);
});

test('closed: fiscal expansion -> partial crowding out (SR), full crowding out (LR)', () => {
  const sc = run(CLOSED, { G: 40 });
  const [t0, sr, , lr] = sc.snapshots;
  assert.ok(sr.Y > t0.Y && sr.r > t0.r && sr.I < t0.I);
  assert.ok(sr.Y - t0.Y < 40 * 5, 'smaller than the simple Keynesian multiplier');
  near(lr.Y, t0.Y);
  near(lr.I - t0.I, -40);
  assert.ok(lr.P > t0.P);
});

test('closed: money is neutral in the long run', () => {
  const [t0, sr, , lr] = run(CLOSED, { M: 50 }).snapshots;
  assert.ok(sr.Y > t0.Y && sr.r < t0.r);
  near(lr.Y, t0.Y);
  near(lr.r, t0.r);
  near(lr.MP, t0.MP);
  near(lr.wP, t0.wP);
  near(lr.P / t0.P, (382 + 50) / 382);
});

test('closed: liquidity trap — monetary expansion has no effect at the ZLB', () => {
  const a = run(CLOSED, { I0: -100 }).snapshots[1];
  const b = run(CLOSED, { I0: -100, M: 100 }).snapshots[1];
  assert.ok(a.zlb && b.zlb);
  near(a.Y, b.Y);
  const sc = run(CLOSED, { I0: -100, M: 100 });
  assert.ok(sc.snapshots[3].noEq, 'vertical AD: no long-run equilibrium');
  assert.ok(evaluatePitfalls(sc, 1).some((p) => p.id === 'liquidityTrap'));
});

test('special cases: vertical LM gives (near) full crowding out', () => {
  const sc = run(CLOSED, { G: 40 }, { ...P, h: 0.5 });
  const [t0, sr] = sc.snapshots;
  assert.ok(sr.Y - t0.Y < 0.1 * 40 * 5);
});

test('fixed rate + perfect mobility: monetary policy fully offset by reserves', () => {
  const [t0, sr] = run(FIXED, { M: 50 }).snapshots;
  near(sr.Y, t0.Y);
  near(sr.M, t0.M);
  near(sr.reservesDelta, -50);
});

test('fixed rate + perfect mobility: fiscal policy at full open-economy multiplier, no crowding out', () => {
  const [t0, sr, , lr] = run(FIXED, { G: 30 }).snapshots;
  near(sr.r, CAL.rStar);
  near(sr.I, t0.I);
  // Imports are a share of total absorption, G included (Lecture 8: TB = TB(a, a*, e)).
  near(sr.Y - t0.Y, (30 * (1 - P.m)) / (1 - P.c * (1 - P.m)));
  assert.ok(sr.reservesDelta > 0);
  near(lr.Y, 1000);
  near(lr.NX, -30);
  assert.ok(lr.eps < 1, 'permanent real appreciation');
});

test('fixed rate: devaluation is neutral in the long run (ε returns)', () => {
  const [t0, sr, , lr] = run(FIXED, { e: 10 }).snapshots;
  assert.ok(sr.Y > t0.Y && sr.NX > 0);
  near(lr.eps, 1);
  near(lr.P, 1.1);
  near(lr.Y, 1000);
});

test('floating + perfect mobility: fiscal policy ineffective, NX falls by ΔG', () => {
  const [t0, sr] = run(FLOAT, { G: 40 }).snapshots;
  near(sr.Y, t0.Y);
  near(sr.NX, -40);
  assert.ok(sr.e < t0.e, 'appreciation');
});

test('floating + perfect mobility: monetary expansion works via depreciation; e and P rise ∝ M in LR', () => {
  const [t0, sr, , lr] = run(FLOAT, { M: 50 }).snapshots;
  assert.ok(sr.Y > t0.Y && sr.e > t0.e && sr.NX > 0);
  near(lr.eps, 1);
  near(lr.P, 432 / 382);
  near(lr.e, 432 / 382);
});

test('floating: insulation from foreign price shocks (Lecture 12)', () => {
  const [, sr] = run(FLOAT, { Pstar: 10 }).snapshots;
  near(sr.Y, 1000);
  near(sr.eps, 1);
  near(sr.e, 1 / 1.1);
});

test('floating: higher world interest rate -> depreciation and higher Y on impact (Lecture 12)', () => {
  const [t0, sr] = run(FLOAT, { rStar: 1 }).snapshots;
  assert.ok(sr.e > t0.e && sr.Y > t0.Y && sr.I < t0.I);
});

test('zero capital mobility under floating behaves like a closed economy with NX = 0', () => {
  const a = run({ ...FLOAT, mobility: 'none' }, { G: 30 }).snapshots[1];
  const b = run(CLOSED, { G: 30 }).snapshots[1];
  near(a.Y, b.Y);
  near(a.NX, 0, 1e-6);
  assert.ok(a.e > 1, 'fiscal expansion depreciates with zero mobility');
});

test('partial mobility lies between the closed and perfect-mobility outcomes', () => {
  const g = { G: 30 };
  const partial = run({ ...FLOAT, mobility: 'partial' }, g).snapshots[1].Y;
  const perfect = run(FLOAT, g).snapshots[1].Y;
  const none = run({ ...FLOAT, mobility: 'none' }, g).snapshots[1].Y;
  assert.ok(partial > perfect && partial < none);
});

test('supply shock: no effect on Y in SR (sticky prices), stagflation in MR, lower Y* in LR', () => {
  const [t0, sr, mr, lr] = run(CLOSED, { A: -10 }).snapshots;
  near(sr.Y, t0.Y);
  assert.ok(mr.P > sr.P && mr.Y < sr.Y);
  near(lr.Y, 900);
  near(lr.wP, 0.9);
});

test('classical school: demand shocks move only prices', () => {
  const [t0, sr] = run({ ...CLOSED, school: 'classical' }, { G: 40 }).snapshots;
  near(sr.Y, t0.Y);
  assert.ok(sr.P > t0.P);
});

test('extreme Keynesian: prices fixed through the medium run', () => {
  const [, sr, mr] = run({ ...CLOSED, school: 'extreme' }, { G: 40 }).snapshots;
  near(mr.P, 1);
  near(mr.Y, sr.Y);
});

test('robust sign keys match the course tables (learning center 3, closed G↑)', () => {
  const key = robustSigns(CLOSED, { ...ZERO_SHOCKS, G: 10 }, 1, 2, ['Y', 'r', 'P', 'I', 'MP', 'wP']);
  assert.deepEqual(key, { Y: '−', r: '+', P: '+', I: '−', MP: '−', wP: '−' });
  const lr = robustSigns(CLOSED, { ...ZERO_SHOCKS, G: 10 }, 0, 3, ['Y', 'C', 'I', 'wP']);
  assert.deepEqual(lr, { Y: '=', C: '=', I: '−', wP: '=' });
});

test('robust keys flag genuinely ambiguous signs with "?" (fixed rate, M in the short run)', () => {
  const key = robustSigns(FIXED, { ...ZERO_SHOCKS, G: 10 }, 1, 2, ['M', 'Y', 'P']);
  assert.equal(key.Y, '−');
  assert.equal(key.P, '+');
  assert.ok(['?', '+', '−'].includes(key.M));
});

test('every case study produces valid snapshots and chains', () => {
  for (const cs of CASES) {
    const sc = buildScenario({ ...P, ...cs.params }, cs.settings, { ...ZERO_SHOCKS, ...cs.shocks });
    for (let st = 0; st < 4; st += 1) {
      assert.ok(sc.snapshots[st].valid, `${cs.id} step ${st} invalid`);
      buildChains(sc, st);
      evaluatePitfalls(sc, st);
    }
  }
});

test('quiz generators are well formed', () => {
  const rng = makeRng(42);
  for (let i = 0; i < 30; i += 1) {
    const q = causeQuestion(rng);
    assert.equal(q.options.filter((o) => o.correct).length, 1);
    assert.equal(new Set(q.options.map((o) => o.cls)).size, 4);
    const p = predictQuestion(rng);
    assert.ok(p.vars.every((v) => ['+', '−', '=', '?'].includes(p.key[v])));
  }
});

test('AD-AS: every active supply curve passes through the equilibrium of its step', () => {
  const onCurve = (c, snap) => {
    if (c.kind === 'vertical') return Math.abs(c.Y - snap.Y) < 1e-6 * snap.Y;
    if (c.kind === 'horizontal') return Math.abs(c.P - snap.P) < 1e-6;
    return Math.abs((c.Pe * snap.Y) / c.Ystar - snap.P) < 1e-6;
  };
  for (const school of ['keynesian', 'extreme', 'classical']) {
    for (const base of [CLOSED, FIXED, FLOAT]) {
      for (const shocks of [{ G: 40 }, { M: 50 }, { A: -8 }, { W: 8 }, { K: -10 }]) {
        const sc = run({ ...base, school }, shocks);
        for (let st = 0; st < 4; st += 1) {
          const curves = supplyCurves(sc, st);
          const active = curves.filter((c) => c.status === 'active');
          assert.ok(active.length > 0, `${school} step ${st}: no active AS`);
          for (const c of active) assert.ok(onCurve(c, sc.snapshots[st]), `${school} ${JSON.stringify(shocks)} step ${st}: ${c.role} misses equilibrium`);
        }
      }
    }
  }
});

test('AD-AS: the horizontal immediate-run AS is drawn in every step of the Keynesian story', () => {
  const sc = run(CLOSED, { G: 40 });
  for (let st = 0; st < 4; st += 1) {
    const h = supplyCurves(sc, st).find((c) => c.role === 'ASim');
    assert.ok(h && h.kind === 'horizontal' && Math.abs(h.P - 1) < 1e-9, `step ${st}`);
    assert.equal(h.status, st === 1 ? 'active' : 'context');
  }
  assert.ok(supplyCurves(sc, 3).some((c) => c.role === 'SRAS1' && c.status === 'active'));
});

const LARGE = { economy: 'open', size: 'large', regime: 'floating', mobility: 'perfect', school: 'keynesian' };

test('two economies: t0 is a joint long-run equilibrium and accounts close (NX* = -NX)', () => {
  for (const reg of ['floating', 'fixed']) {
    for (const sh of [{}, { G: 40 }, { Mf: 50 }, { M: 30, Gf: -20 }]) {
      const sc = run({ ...LARGE, regime: reg }, sh);
      near(sc.snapshots[0].Y, 1000);
      near(sc.snapshots[0].Yf, 1000);
      for (const s of sc.snapshots) {
        assert.ok(s.valid, `${reg} ${JSON.stringify(sh)} ${s.key}`);
        near(s.Y, s.C + s.I + s.G + s.NX);
      }
    }
  }
});

test('large economy: fiscal expansion raises the world rate, but less than a closed economy would (Lecture 12)', () => {
  const [t0, sr] = run(LARGE, { G: 40 }).snapshots;
  assert.ok(sr.rStar > t0.rStar, 'CM shifts up');
  assert.ok(sr.r < sr.rClosed, 'below the closed-economy rate');
  assert.ok(sr.Y > t0.Y && sr.Yf > t0.Yf, 'output rises at home and abroad');
  assert.ok(sr.e < t0.e, 'home currency appreciates');
});

test('large economy: monetary expansion lowers the world rate (Lecture 12)', () => {
  const [t0, sr] = run(LARGE, { M: 50 }).snapshots;
  assert.ok(sr.rStar < t0.rStar && sr.r > sr.rClosed);
  assert.ok(sr.Y > t0.Y && sr.e > t0.e);
});

test('two equal economies: foreign monetary expansion appreciates the home currency and lowers home output', () => {
  const [t0, sr] = run(LARGE, { Mf: 50 }).snapshots;
  assert.ok(sr.rStar < t0.rStar);
  assert.ok(sr.e < t0.e, 'home appreciation');
  assert.ok(sr.Y < t0.Y, 'home output falls');
  assert.ok(sr.Yf > t0.Yf);
});

test('two equal economies: coordinated monetary expansion leaves the exchange rate unchanged', () => {
  const [t0, sr, , lr] = run(LARGE, { M: 50, Mf: 50 }).snapshots;
  near(sr.e, t0.e);
  near(sr.Y, sr.Yf);
  assert.ok(sr.Y > t0.Y && sr.r < t0.r);
  near(lr.Y, 1000);
  near(lr.Yf, 1000);
});

test('a very small share of the world reproduces the small open economy', () => {
  const tiny = run(LARGE, { G: 40 }, { ...P, omega: 0.001 }).snapshots[1];
  const small = run(FLOAT, { G: 40 }).snapshots[1];
  assert.ok(Math.abs(tiny.Y - small.Y) < 0.2);
  assert.ok(Math.abs(tiny.r - small.r) < 0.01);
});

test('expectations (UIP): r = r* + Δeᵉ, fading to zero by the long run', () => {
  const sc = run(FLOAT, { M: 50, Ee: -1 });
  const [, sr, mr, lr] = sc.snapshots;
  near(sr.r, CAL.rStar - 1);
  near(mr.r, CAL.rStar - 0.5);
  near(lr.r, CAL.rStar);
  const noExp = run(FLOAT, { M: 50 }).snapshots[1];
  assert.ok(sr.Y < noExp.Y, 'expected appreciation weakens the immediate effect (Lecture 9)');
});

test('chart curves pass through each equilibrium (home IS, LM, CM and the foreign IS*, LM*)', () => {
  const at = (pts, x) => {
    for (let i = 1; i < pts.length; i += 1) {
      if ((pts[i - 1].x - x) * (pts[i].x - x) <= 0) {
        const t = (x - pts[i - 1].x) / (pts[i].x - pts[i - 1].x);
        return pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
      }
    }
    return NaN;
  };
  for (const settings of [LARGE, { ...LARGE, regime: 'fixed' }, FLOAT, CLOSED]) {
    for (const sh of [{ G: 40 }, { Mf: 50 }, { M: 30, Ee: -1 }]) {
      const sc = run(settings, sh);
      for (const s of sc.snapshots) {
        if (s.zlb) continue;
        const Yd = [s.Y - 100, s.Y + 100];
        assert.ok(Math.abs(at(isCurve(P, settings, s.exo, s.eps, Yd, s.Yf), s.Y) - s.r) < 1e-6, `IS ${s.key}`);
        assert.ok(Math.abs(at(lmCurve(P, settings, s.exo, s.MP, Yd), s.Y) - s.r) < 1e-6, `LM ${s.key}`);
        if (settings.economy === 'open') assert.ok(Math.abs(at(bpCurve(P, settings, s.exo, s.eps, Yd), s.Y) - s.r) < 1e-6, `CM ${s.key}`);
        if (s.Yf != null) {
          const Yfd = [s.Yf - 100, s.Yf + 100];
          const rf = s.r - s.Ee;
          assert.ok(Math.abs(at(foreignIsCurve(P, s.exo, s.eps, s.Y, Yfd), s.Yf) - rf) < 1e-6, `IS* ${s.key}`);
          assert.ok(Math.abs(at(foreignLmCurve(P, s.exo, Yfd), s.Yf) - rf) < 1e-6, `LM* ${s.key}`);
        }
      }
    }
  }
});

test('proportional tax: the multiplier is 1/[1 - c(1 - t)] and IS shifts by that much (Lecture 2)', () => {
  const pt = { ...P, t: 0.25 };
  const exo = buildScenario(pt, CLOSED, ZERO_SHOCKS).base;
  const shift = (dG) => {
    const pts0 = isCurve(pt, CLOSED, exo, null, [900, 1100]);
    const pts1 = isCurve(pt, CLOSED, { ...exo, G: exo.G + dG }, null, [900, 1100]);
    // horizontal shift at a given r = vertical shift / |slope|
    const slope = (pts0[1].y - pts0[0].y) / (pts0[1].x - pts0[0].x);
    return (pts1[0].y - pts0[0].y) / -slope;
  };
  near(shift(10), 10 / (1 - 0.8 * 0.75));
  near(multipliers(pt, CLOSED, run(CLOSED, {}, pt).snapshots[0]).keynesian, 1 / (1 - 0.8 * 0.75));
  // automatic stabilizer: smaller output response to a demand shock
  const dY0 = run(CLOSED, { C0: -30 }).snapshots[1].Y - 1000;
  const dYt = run(CLOSED, { C0: -30 }, pt).snapshots[1].Y - 1000;
  assert.ok(Math.abs(dYt) < Math.abs(dY0));
  // tax revenue moves with output
  const sr = run(CLOSED, { C0: -30 }, pt).snapshots[1];
  near(sr.T, 90 + 0.25 * (sr.Y - 1000));
});

test('learning center 4 Q2: with G = G0 + δY a balanced ΔG0 = ΔT = X shifts IS by more than X', () => {
  const pd = { ...P, delta: 0.1 };
  const exo = buildScenario(pd, CLOSED, ZERO_SHOCKS).base;
  const pts0 = isCurve(pd, CLOSED, exo, null, [900, 1100]);
  const pts1 = isCurve(pd, CLOSED, { ...exo, G: exo.G + 10, T: exo.T + 10 }, null, [900, 1100]);
  const slope = (pts0[1].y - pts0[0].y) / (pts0[1].x - pts0[0].x);
  const shift = (pts1[0].y - pts0[0].y) / -slope;
  near(shift, (10 * (1 - 0.8)) / (1 - 0.8 - 0.1));
  assert.ok(shift > 10);
});

test('national accounts hold with t and δ in every regime', () => {
  const pp = { ...P, t: 0.2, delta: 0.05 };
  for (const s of [CLOSED, FIXED, FLOAT, { ...FLOAT, mobility: 'partial' }, { ...FIXED, mobility: 'none' }, LARGE, { ...LARGE, regime: 'fixed' }]) {
    const sc = run(s, { G: 30, M: 20 }, pp);
    for (const snap of sc.snapshots) {
      assert.ok(snap.valid, JSON.stringify(s) + snap.key);
      near(snap.Y, snap.C + snap.I + snap.G + snap.NX);
    }
    near(sc.snapshots[0].Y, 1000);
  }
});

test('learning center 4 Q3: with k = 0 (money demand independent of Y) LM is flat and there is no crowding out on impact', () => {
  const p0 = { ...P, k: 0 };
  const [t0, sr, , lr] = run(CLOSED, { G: 20 }, p0).snapshots;
  near(sr.r, t0.r);
  near(sr.I, t0.I);
  near(sr.Y - t0.Y, 20 / (1 - 0.8));
  const A = run(CLOSED, { G: 20 }).snapshots;
  assert.ok(A[1].Y < sr.Y && A[1].I < sr.I && A[1].C < sr.C, 'economy A (k > 0) grows less on impact');
  near(A[3].Y, lr.Y);
  near(A[3].I, lr.I);
  near(A[3].C, lr.C);
});

test('capital stock: higher K raises potential output and shifts AS right (Lecture 4)', () => {
  const [, , mr, lr] = run(CLOSED, { K: 21 }).snapshots;
  near(lr.Ystar, 1000 * 1.1);
  assert.ok(mr.P < 1 && lr.Y > 1000);
});

test('nominal wage push: stagflation in the medium run, back to the start in the long run (Lecture 4)', () => {
  const [t0, sr, mr, lr] = run(CLOSED, { W: 10 }).snapshots;
  near(sr.Y, t0.Y);
  assert.ok(mr.P > t0.P && mr.Y < t0.Y);
  near(lr.Y, t0.Y);
  near(lr.P, t0.P);
  const cl = run({ ...CLOSED, school: 'classical' }, { W: 10 }).snapshots;
  near(cl[2].Y, 1000);
});

test('interest-rate instrument: the central bank hits the target through M (Lecture 5 open market operations)', () => {
  const R = { ...CLOSED, instrument: 'r' };
  const sc = run(R, { rT: -1 });
  near(sc.snapshots[1].r, CAL.rStar - 1);
  assert.ok(sc.rateTarget.dM > 0, 'lowering the rate requires buying bonds: M rises');
  // policy mix: holding the rate while G rises means full accommodation, no crowding out
  const mix = run(R, { G: 20 });
  near(mix.snapshots[1].r, CAL.rStar);
  near(mix.snapshots[1].I, 100);
  near(mix.snapshots[1].Y - 1000, 20 / (1 - 0.8));
  // the zero lower bound caps the target
  const zlb = run(R, { rT: -3, I0: -40 });
  assert.ok(zlb.rateTarget.target >= 0);
});

test('medium- and long-run chains trace the price adjustment (no all-"=" chains)', () => {
  const dirs = (sc, st, id) => buildChains(sc, st).find((c) => c.id === id).nodes.map((x) => `${x.key}${x.dir}`).join(' ');
  const g = run(CLOSED, { G: 40 });
  assert.equal(dirs(g, 2, 'mr-demand'), 'P1 MP-1 r1 I-1 Y-1 C-1');
  assert.equal(dirs(g, 3, 'lr-demand'), 'P1 MP-1 r1 I-1 Y-1 C-1');
  const f = run(FLOAT, { M: 50 });
  assert.equal(dirs(f, 2, 'mr-demand'), 'P1 MP-1 rp1 KF1 e-1 eps-1 NX-1 Y-1');
  const x = run(FIXED, { G: 30 });
  assert.equal(dirs(x, 3, 'lr-demand'), 'P1 eps-1 NX-1 Y-1 M1 Res1');
});

test('learning-center questions are well formed and their keys match the course', () => {
  assert.equal(LC_QUESTIONS.length, 24);
  assert.deepEqual([...new Set(LC_QUESTIONS.map((q) => q.center))], [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const q of LC_QUESTIONS) {
    if (q.type === 'mcq') assert.ok(q.options.some((o) => o.id === q.answer), q.id);
    if (q.type === 'signTable') {
      const key = signTableKey(q);
      for (const v of q.vars) for (const c of q.columns) assert.ok(['+', '−', '=', '?'].includes(key[v][c]), `${q.id} ${v} ${c}`);
    }
  }
  const byId = Object.fromEntries(LC_QUESTIONS.map((q) => [q.id, q]));
  const k31 = signTableKey(byId['lc3-1']);
  // balanced budget: Y up, C down on impact; in the medium run Y = Y*, I crowded out
  assert.deepEqual([k31.Y.imm_0, k31.C.imm_0, k31.i.imm_0, k31.P.imm_0], ['+', '−', '+', '=']);
  assert.deepEqual([k31.Y.med_0, k31.I.med_0, k31.wP.med_0], ['=', '−', '=']);
  // monetary contraction is neutral in the medium run
  const k32 = signTableKey(byId['lc3-2']);
  assert.deepEqual(['Y', 'C', 'i', 'I', 'MP', 'wP', 'L'].map((v) => k32[v].med_0), ['=', '=', '=', '=', '=', '=', '=']);
  // money-financed spending: the interest rate on impact is ambiguous (as in LC 2 Q3)
  assert.equal(signTableKey(byId['lc4-1']).i.imm_0, '?');
  // fixed rate: no crowding out of investment on impact, reserves rise
  const k51 = signTableKey(byId['lc5-1']);
  assert.deepEqual([k51.I.imm_0, k51.M.imm_0, k51.Res.imm_0, k51.TB.imm_0], ['=', '+', '+', '−']);
  assert.deepEqual(compareKey(byId['lc4-3']), {
    'Y@1': '<', 'M@1': '=', 'I@1': '<', 'C@1': '<', 'Y@3': '=', 'M@3': '=', 'I@3': '=', 'C@3': '=',
  });
});

test('labor market: points after the immediate run lie on the labor demand curve that is drawn', () => {
  const ldAt = (exo, L) => laborDemandCurve(exo, [L, L + 1])[0].y;
  for (const school of ['keynesian', 'classical']) {
    for (const sh of [{ G: 40 }, { A: -8 }, { K: 15 }, { W: 10 }, { M: -30 }]) {
      const sc = run({ ...CLOSED, school }, sh);
      for (const st of [0, 2, 3]) {
        const s = sc.snapshots[st];
        const exo = st > 0 && (school === 'classical' || st === 3) ? sc.snapshots[3].exo : sc.snapshots[0].exo;
        assert.ok(Math.abs(ldAt(exo, s.L) - s.wP) < 1e-6, `${school} ${JSON.stringify(sh)} step ${st}: (${s.L}, ${s.wP})`);
      }
      near(sc.snapshots[3].L, 100);
    }
  }
});

test('every case study has two Hebrew articles and two English ones (event, hindsight)', () => {
  for (const cs of CASES) {
    const arts = CASE_ARTICLES[cs.id]?.articles;
    assert.ok(arts, cs.id);
    assert.deepEqual(arts.map((x) => x.kind), ['he', 'he', 'event', 'hindsight'], cs.id);
    for (const x of arts) assert.ok(/^https:\/\//.test(x.url) && x.title && x.source && x.summary_he, `${cs.id} ${x.url}`);
  }
});


test('band: inside the band the economy floats; past the edge it is pegged at the edge (LC 7)', () => {
  // Small money-demand shock: stays inside, identical to floating.
  const b = run(BAND, { L0: -20 });
  const f = run(FLOAT, { L0: -20 });
  for (let st = 0; st < 4; st += 1) {
    near(b.snapshots[st].Y, f.snapshots[st].Y);
    near(b.snapshots[st].e, f.snapshots[st].e);
    assert.equal(b.snapshots[st].band, 'inside');
    near(b.snapshots[st].reservesDelta, 0);
  }
  // Large monetary expansion: E hits the upper edge, the central bank sells reserves.
  const m = run(BAND, { M: 60 });
  assert.equal(m.snapshots[1].band, 'high');
  near(m.snapshots[1].e, m.snapshots[1].bandHi);
  assert.ok(m.snapshots[1].reservesDelta < 0);
  // The money absorbed at the edge stays absorbed: M carries into later steps.
  near(m.snapshots[2].M, m.snapshots[1].M);
  // Raising the lower edge above E forces a purchase of foreign currency, like a devaluation.
  const lo = run(BAND, { bandLo: 3 });
  assert.equal(lo.snapshots[1].band, 'low');
  assert.ok(lo.snapshots[1].reservesDelta > 0 && lo.snapshots[1].Y > 1000);
  near(lo.snapshots[3].Y, 1000);
  // A band edge moved but not past E changes nothing.
  const nothing = run(BAND, { bandLo: -5 });
  near(nothing.snapshots[1].Y, 1000);
});

test('learning centers 6-8: the engine agrees with every determinate cell of the course key', () => {
  const SYM = { 1: '+', '-1': '−', 0: '=' };
  const grid = [{}, { c: 0.6 }, { c: 0.87, b: 25 }, { h: 20, k: 0.6 }, { n: 700 }];
  // Premises stated in the questions (LC 7): Q1 stays inside the band; in Q2 the new edge is above E.
  const premise = { 'lc7-1t': (sn) => sn[1].band === 'inside', 'lc7-2': (sn) => sn[1].band === 'low' };
  let checked = 0;
  for (const q of LC_QUESTIONS.filter((x) => x.key)) {
    for (const g of grid) {
      const params = { ...P, ...g };
      if (q.type === 'signTable') {
        const key = signTableKey(q);
        const sn = buildScenario(params, q.settings, { ...ZERO_SHOCKS, ...q.shocks }).snapshots;
        assert.ok(!premise[q.id] || premise[q.id](sn), `${q.id} premise ${JSON.stringify(g)}`);
        for (const v of q.vars) {
          for (const col of q.columns) {
            const { from, to } = COURSE_COLUMNS[col];
            const f = LC_VARS[v];
            const k = key[v][col];
            if (k === '?') continue;
            const s = SYM[sgn(sn[to][f] - sn[from][f], 1e-7 * (1 + Math.abs(sn[from][f])))];
            assert.equal(s, k, `${q.id} ${v} ${col} ${JSON.stringify(g)}`);
            checked += 1;
          }
        }
      } else {
        const key = compareKey(q);
        const A = buildScenario(params, q.settings, { ...ZERO_SHOCKS, ...q.scenarios.A }).snapshots;
        const B = buildScenario(params, q.settings, { ...ZERO_SHOCKS, ...q.scenarios.B }).snapshots;
        for (const v of q.vars) {
          for (const { step } of q.steps) {
            const f = LC_VARS[v];
            const k = key[`${v}@${step}`];
            if (k === '?') continue;
            const s = { 1: 'א', '-1': 'י', 0: '=' }[sgn(A[step][f] - B[step][f], 1e-7 * (1 + Math.abs(B[step][f])))];
            assert.equal(s, k, `${q.id} ${v}@${step} ${JSON.stringify(g)}`);
            checked += 1;
          }
        }
      }
    }
  }
  assert.ok(checked > 500, `checked ${checked}`);
});

test('imports depend on total absorption: balanced budget under a peg lowers C and TB (2026 exam B, Q1)', () => {
  const S = { ...FIXED, size: 'small', assume: { noRateI: true } };
  const sn = run(S, { G: 20, T: 20 }).snapshots;
  const sign = (a, b) => ({ 1: '+', '-1': '−', 0: '=' })[sgn(b - a, 1e-7 * (1 + Math.abs(a)))];
  const cols = [[0, 1], [1, 2], [0, 3]];
  const key = { Y: '+−=', C: '−−−', eps: '=−−', NX: '−−−', P: '=++', MP: '+−=' };
  for (const [v, k] of Object.entries(key)) {
    cols.forEach(([a, b], i) => assert.equal(sign(sn[a][v], sn[b][v]), k[i], `${v} ${a}->${b}`));
  }
  assert.ok(sn[1].reservesDelta > 0 && sn[3].reservesDelta > 0);
});

test('central bank keeps M/P fixed: AD vertical, no medium-run equilibrium (2026 exam A, Q1)', () => {
  const S = { ...FLOAT, size: 'small', assume: { realM: true } };
  const sc = run(S, { M: 30 });
  const [t0, im, sr, md] = sc.snapshots;
  assert.ok(im.Y > t0.Y && im.e > t0.e && im.eps > t0.eps);
  near(sr.Y, im.Y);
  near(sr.MP, im.MP);
  near(sr.eps, im.eps);
  assert.ok(sr.P > im.P && sr.M > im.M && sr.e > im.e);
  assert.ok(md.noEq, 'no medium-run equilibrium');
});

test('fixed labor demand: vertical short-run AS, horizontal immediate AS (2026 exam, September, Q2)', () => {
  const A = run(CLOSED, { M: 30 }).snapshots;
  const B = run({ ...CLOSED, assume: { fixedLabor: true } }, { M: 30 }).snapshots;
  near(A[1].Y, B[1].Y);
  near(B[2].Y, 1000);
  assert.ok(A[2].Y > B[2].Y && A[2].r < B[2].r && A[2].P < B[2].P && A[2].wP > B[2].wP);
  near(A[2].M, B[2].M);
  for (const v of ['Y', 'r', 'P', 'M', 'w', 'wP']) near(A[3][v], B[3][v]);
});

test('alternative assumptions: investment on Y raises the multiplier; exports ignoring a* insulate', () => {
  const beta = 0.1;
  const sr = run({ ...CLOSED, instrument: 'r', assume: { investY: true } }, { G: 10 }, { ...P, betaV: beta }).snapshots[1];
  near(sr.Y - 1000, 10 / (1 - P.c - beta));
  const x = run({ ...FIXED, size: 'small', assume: { noExportA: true } }, { aStar: -40 }).snapshots;
  near(x[1].Y, 1000);
  const flat = run({ ...CLOSED, assume: { flatLM: true } }, { M: 40 }).snapshots;
  near(flat[1].Y, 1000);
  near(flat[1].r, CAL.rStar);
});

test('band start position: at the lower edge appreciation pressure is met by intervention, depreciation is not', () => {
  const S = { ...BAND, bandStart: 'low' };
  const g = run(S, { G: 20 }).snapshots[1];
  near(g.e, 1);
  assert.ok(g.reservesDelta > 0 && g.band === 'low');
  const m = run(S, { M: 20 }).snapshots[1];
  assert.ok(m.e > 1 && m.band === 'inside');
  near(m.reservesDelta, 0);
  // A floor-only band never caps a depreciation.
  const f = run({ ...BAND, bandStart: 'low', bandType: 'floor' }, { M: 140 }).snapshots[1];
  assert.equal(f.band, 'inside');
});

test('external debt accumulates the trade deficit of each horizon', () => {
  const sn = run(FIXED, { G: 30 }).snapshots;
  near(sn[0].debt, 0);
  near(sn[1].debt, -sn[1].NX);
  near(sn[3].debt, -sn[1].NX - sn[2].NX - sn[3].NX);
  assert.equal(run(CLOSED, { G: 30 }).snapshots[2].debt, null);
});

test('policy calibration: ΔG that keeps immediate-run output at Y* under a peg', () => {
  const shocks = { ...ZERO_SHOCKS, aStar: -30 };
  const g = calibrateShock(P, FIXED, shocks, { id: 'G', field: 'Y', step: 1, value: 1000 });
  assert.ok(g > 0);
  near(run(FIXED, { aStar: -30, G: g }).snapshots[1].Y, 1000, 1e-6);
  const m = calibrateShock(P, FLOAT, { ...ZERO_SHOCKS, rStar: 1 }, { id: 'M', field: 'e', step: 1, value: 1 });
  near(run(FLOAT, { rStar: 1, M: m }).snapshots[1].e, 1, 1e-6);
});

test('FX market: under a peg the market rate shows the pressure the central bank absorbs', () => {
  const sn = run(FIXED, { G: 30 }).snapshots[1];
  assert.ok(sn.eMarket < sn.e, 'appreciation pressure');
  assert.ok(sn.reservesDelta > 0, 'central bank buys foreign currency');
});

test('qualitative mode reproduces official exam keys, with "?" from opposing shocks', () => {
  const O = { economy: 'open', size: 'small', regime: 'floating', mobility: 'perfect', school: 'keynesian', instrument: 'M' };
  const dirs = (d) => ({ ...ZERO_SHOCKS, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v * SHOCK_UNIT[k]])) });
  const cols = { imm0: ['origin', 1], srimm: ['prev', 2], mr0: ['origin', 3], mrsr: ['prev', 3] };
  const check = (settings, d, colNames, key, opts) => {
    const q = qualitative(P, settings, dirs(d), opts);
    for (const [v, k] of Object.entries(key)) {
      const got = colNames.map((c) => q[cols[c][0]][cols[c][1]][v]).join('');
      assert.equal(got, k.replace(/-/g, '−').replace(/ /g, ''), `${JSON.stringify(d)} ${v}`);
    }
  };
  // 2025 exam B, Q1: float; i*, P* and a* rise together.
  check(O, { rStar: 1, Pstar: 1, aStar: 1 }, ['imm0', 'srimm', 'mr0'], {
    Y: '+ - =', C: '+ - =', I: '- = -', M: '= = =', MP: '= - -', r: '+ = +', NX: '+ - +', e: '? ? ?', wP: '= - =', P: '= + +',
  });
  // 2024 exam A, Q1: peg; a* falls and i* falls: output and reserves are "?".
  check({ ...O, regime: 'fixed' }, { aStar: -1, rStar: -1 }, ['imm0'], { Y: '?', I: '+', reservesDelta: '?', M: '?', NX: '-', wP: '=' });
  // 2026 exam B, Q1 with the balanced-budget rule (ΔT = ΔG), I independent of i.
  check({ ...O, regime: 'fixed', assume: { noRateI: true } }, { G: 1 }, ['imm0', 'srimm', 'mr0'], {
    Y: '+ - =', C: '- - -', eps: '= - -', NX: '- - -', P: '= + +', M: '+ ? +', MP: '+ - =', reservesDelta: '+ ? +',
  }, { rules: ['T_G'] });
  // Learning center 7, Q2: lower band edge raised above E.
  check({ ...O, regime: 'band' }, { bandLo: 1 }, ['imm0', 'srimm', 'mrsr'], {
    Y: '+ - -', e: '+ ? ?', eps: '+ - -', MP: '+ - -', wP: '= - +', reservesDelta: '+ ? ?',
  });
  // Opposing shocks give cases to draw; a single shock gives none.
  assert.ok(caseSplit(P, { ...O, regime: 'fixed' }, dirs({ aStar: -1, rStar: -1 }))[1].length >= 2);
  assert.equal(caseSplit(P, O, dirs({ M: 1 }))[1].length, 0);
});

test('every directional result in the slides and the learning-center keys matches the sign tables', () => {
  const COL = { imm0: ['origin', 1], srimm: ['prev', 2], sr0: ['origin', 2], mrsr: ['prev', 3], mr0: ['origin', 3] };
  let cells = 0;
  for (const c of COURSE_CLAIMS) {
    const settings = { ...DEFAULT_SETTINGS, ...c.s };
    const shocks = { ...ZERO_SHOCKS, ...Object.fromEntries(Object.entries(c.shocks).map(([k, v]) => [k, v * SHOCK_UNIT[k]])) };
    const q = qualitative(P, settings, shocks, { fixed: Boolean(c.fixed) });
    for (const [col, vars] of Object.entries(c.r)) {
      for (const [v, want] of Object.entries(vars)) {
        assert.equal(q[COL[col][0]][COL[col][1]][v], want.replace('-', '−'), `${c.id}: ${col}.${v}`);
        cells += 1;
      }
    }
  }
  // Premise questions ("E stays inside the band"): checked at the question's own sizes and default slopes.
  for (const c of PREMISE_CLAIMS) {
    const sn = buildScenario(P, { ...DEFAULT_SETTINGS, ...c.s }, { ...ZERO_SHOCKS, ...Object.fromEntries(Object.entries(c.shocks).map(([k, v]) => [k, v * SHOCK_UNIT[k]])) }).snapshots;
    const sym = (a, b) => ({ 1: '+', '-1': '−', 0: '=' })[sgn(b - a, 1e-7 * (1 + Math.abs(a)))];
    for (const [col, vars] of Object.entries(c.r)) {
      const [base, st] = COL[col];
      for (const [v, want] of Object.entries(vars)) {
        assert.equal(sym((base === 'origin' ? sn[0] : sn[st - 1])[v], sn[st][v]), want.replace('-', '−'), `${c.id}: ${col}.${v}`);
        cells += 1;
      }
    }
  }
  assert.ok(cells > 390, `cells ${cells}`);
});

test('transmission chains agree with the solved model, including direction words', () => {
  const dirSym = (d) => (d === '?' ? '?' : { 1: '+', '-1': '−', 0: '=' }[d]);
  const settingsList = [
    { ...DEFAULT_SETTINGS },
    { ...DEFAULT_SETTINGS, assume: { flatLM: true } },
    { ...DEFAULT_SETTINGS, assume: { noYMoney: true } },
    { ...DEFAULT_SETTINGS, economy: 'open', regime: 'fixed' },
    { ...DEFAULT_SETTINGS, economy: 'open', regime: 'floating' },
    { ...DEFAULT_SETTINGS, economy: 'open', regime: 'band' },
    { ...DEFAULT_SETTINGS, economy: 'open', size: 'large', regime: 'floating' },
    { ...DEFAULT_SETTINGS, economy: 'open', size: 'large', regime: 'fixed' },
  ];
  for (const settings of settingsList) {
    for (const id of ['G', 'T', 'M', 'L0', 'C0', 'I0', 'W', 'e', 'rStar', 'Pstar', 'aStar', 'Ee', 'Mf', 'Gf', 'bandLo']) {
      for (const dir of [1, -1]) {
        const shocks = { ...ZERO_SHOCKS, [id]: dir * SHOCK_UNIT[id] };
        const sc = buildScenario(P, settings, shocks);
        if (!sc.activeShocks.includes(id)) continue;
        const iso = qualitative(P, settings, shocks).prev[1];
        const chains = buildChains(sc, 1, { isolated: { [id]: iso }, combined: qualitative(P, settings, shocks).prev });
        for (const ch of chains.filter((c) => c.id === id)) {
          ch.nodes.forEach((nd, i) => {
            const field = nd.key === 'Res' ? 'reservesDelta' : nd.key;
            if (i > 0 && !nd.keep && iso[field] != null) assert.equal(dirSym(nd.dir), iso[field], `${JSON.stringify(settings.assume || settings.regime)} ${id}${dir} node ${nd.key}`);
            if (nd.note === 'יציאת הון' || nd.note === 'כניסת הון') assert.ok(nd.key === 'KF', nd.key);
            if (nd.key === 'KF' && (nd.note === 'כניסת הון' || nd.note === 'יציאת הון')) assert.equal(nd.note, nd.dir > 0 ? 'כניסת הון' : 'יציאת הון', `${id}${dir} KF note`);
            if (nd.key === 'e' && (nd.note === 'פיחות' || nd.note === 'ייסוף')) assert.equal(nd.note, nd.dir > 0 ? 'פיחות' : 'ייסוף', `${id}${dir} E note`);
          });
        }
      }
    }
  }
  // The new wage contract only acts from the short run.
  const w = buildScenario(P, DEFAULT_SETTINGS, { ...ZERO_SHOCKS, W: SHOCK_UNIT.W });
  const wNode = buildChains(w, 1).find((c) => c.id === 'W').nodes.find((n) => n.key === 'w');
  assert.equal(wNode.dir, 0);
  const sup = buildChains(w, 2).find((c) => c.id === 'mr-supply');
  assert.equal(sup.nodes.find((n) => n.key === 'wP').dir, 1, 'W/P rises when the new contract wage takes effect');
});

// ---------------------------------------------------------------------------
// Regression tests for the October 2026 review (re-reading every lecture and
// learning center, an invariant sweep and a text audit).
// ---------------------------------------------------------------------------

test('claims from the slides, learning centers and past exams hold (tests/claims/*.json)', () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'claims');
  const COL = { imm0: ['origin', 1, 0], srimm: ['prev', 2, 1], sr0: ['origin', 2, 0], mrsr: ['prev', 3, 2], mr0: ['origin', 3, 0] };
  const ALIAS = { i: 'r', TB: 'NX', Res: 'reservesDelta', W: 'w', 'W/P': 'wP', 'M/P': 'MP', D: 'debt', E: 'e' };
  const norm = (x) => String(x).trim().replace(/-/g, '−');
  let cells = 0;
  const errs = [];
  for (const f of ['closed-lectures-lc1-4.json', 'open-lectures-lc5-8.json', 'exams.json']) {
    for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
      const settings = { ...DEFAULT_SETTINGS, mobility: 'perfect', ...(c.settings || {}) };
      const shocks = { ...ZERO_SHOCKS };
      for (const [k, v] of Object.entries(c.shocks || {})) shocks[k] = v * SHOCK_UNIT[k];
      const given = [];
      for (const [col, vars] of Object.entries(c.givenSigns || {})) {
        for (const [v0, sign] of Object.entries(vars)) given.push({ from: COL[col][2], to: COL[col][1], v: ALIAS[v0] || v0, sign: norm(sign) });
      }
      const q = qualitative({ ...P, ...(c.params || {}) }, settings, shocks, { fixed: Boolean(c.fixedSizes), rules: c.rules || [], given: given.length ? given : null });
      for (const [col, vars] of Object.entries(c.results || {})) {
        for (const [v0, want] of Object.entries(vars)) {
          cells += 1;
          const got = q[COL[col][0]][COL[col][1]][ALIAS[v0] || v0];
          if (got !== norm(want)) errs.push(`${f} ${c.id}: ${col}.${v0} course ${norm(want)} engine ${got}`);
        }
      }
    }
  }
  assert.equal(errs.length, 0, errs.slice(0, 6).join('\n'));
  assert.ok(cells > 1100, `cells ${cells}`);
});

test('medium run: a demand cut that needs exactly i = 0 has an equilibrium, and prices stop at the first one', () => {
  // With i* = 5% a unit G cut keeps the natural rate positive; a cut that
  // needs exactly i = 0 lands on the boundary of the zero-bound region.
  const sc = run(CLOSED, { G: -SHOCK_UNIT.G });
  assert.ok(!sc.snapshots[3].noEq);
  near(sc.snapshots[3].Y, 1000);
  const edge = run(CLOSED, { G: -50 }); // 5 − 50/b = 0 at b = 10
  const lr = edge.snapshots[3];
  assert.ok(!lr.noEq, 'equilibrium at i = 0');
  near(lr.Y, 1000);
  assert.ok(lr.P > 0.9, `prices stop where i reaches 0 (P = ${lr.P})`);
});

test('medium run: AD vertical exactly at Y* keeps the price level; vertical AD elsewhere has no equilibrium', () => {
  // Investment independent of i: M moves i but not demand.
  const m = run({ ...CLOSED, assume: { noRateI: true } }, { M: SHOCK_UNIT.M });
  assert.ok(!m.snapshots[3].noEq);
  near(m.snapshots[3].P, 1);
  near(m.snapshots[3].Y, 1000);
  // A fiscal expansion then has no medium-run equilibrium: prices keep rising.
  const g = run({ ...CLOSED, assume: { noRateI: true } }, { G: SHOCK_UNIT.G });
  assert.ok(g.snapshots[3].noEq);
  assert.equal(g.noEqReason, 'vertical');
  assert.equal(g.noEqSide, 'excess');
  // The central bank keeps M/P fixed and contracts are re-signed higher: prices stay at the new level.
  const w = run({ ...CLOSED, assume: { realM: true } }, { W: SHOCK_UNIT.W });
  assert.ok(!w.snapshots[3].noEq);
  near(w.snapshots[3].P, w.snapshots[2].P);
  // A liquidity trap is named as such.
  const trap = run(CLOSED, { I0: -100 });
  assert.equal(trap.noEqReason, 'trap');
  assert.ok(trap.needsNegativeRate);
});

test('the multiplier stays finite: c(1 − t) + δ + β is capped below 1 in the engine and the store', () => {
  const eff = effectiveParams({ ...P, c: 0.88, delta: 0.1, betaV: 0.15 }, { ...CLOSED, assume: { investY: true } });
  assert.ok(eff.c * (1 - (eff.t || 0)) + eff.delta + eff.beta <= MPS_MAX + 1e-12);
  const sc = run({ ...CLOSED, assume: { investY: true } }, { G: SHOCK_UNIT.G }, { ...P, c: 0.88, delta: 0.1, betaV: 0.15 });
  assert.ok(sc.snapshots[1].Y > 1000, 'a fiscal expansion raises output');
  let st = reducer({ ...initialState, settings: { ...initialState.settings, assume: { investY: true } } }, { type: 'SET_PARAM', id: 'delta', value: 0.1 });
  st = reducer(st, { type: 'SET_PARAM', id: 'c', value: 0.88 });
  const q = st.params;
  assert.ok(q.c * (1 - q.t) + q.delta + q.betaV <= MPS_MAX + 1e-9, JSON.stringify(q));
  assert.ok(PARAM_DEFS.find((d) => d.id === 'k').min > 0, 'k = 0 is an assumption, not a slider value');
});

test('band: an edge moved past the other one drags it along', () => {
  const low = run({ ...BAND, bandStart: 'low' }, { bandHi: -5 }).snapshots[1];
  near(low.e, 0.95);
  assert.ok(low.reservesDelta < 0, 'the bank sells foreign currency');
  const inside = run({ ...BAND, bandStart: 'inside' }, { bandHi: -15 }).snapshots[1];
  near(inside.e, 0.85);
  const t0 = run({ ...BAND, bandStart: 'low' }, { W: 6 }).snapshots;
  assert.equal(t0[0].band, 'inside', 'starting exactly at an edge is not an intervention');
  near(t0[1].reservesDelta, 0);
});

test('fixed labor demand: new wage contracts change only the real wage', () => {
  const sc = run({ ...CLOSED, assume: { fixedLabor: true } }, { W: SHOCK_UNIT.W }).snapshots;
  near(sc[2].w, 1 + SHOCK_UNIT.W / 100);
  near(sc[2].Y, 1000);
  assert.ok(sc[2].wP > 1);
});

test('two economies: a home fiscal expansion appreciates the home currency for every admissible size and import share', () => {
  const omegaMax = PARAM_DEFS.find((d) => d.id === 'omega').max;
  for (const omega of [0.05, 0.25, omegaMax]) {
    for (const m of [0.05, 0.2, 0.4]) {
      const [t0, sr] = run(LARGE, { G: 30 }, { ...P, omega, m }).snapshots;
      assert.ok(sr.e < t0.e, `ω ${omega}, m ${m}`);
    }
  }
});

test('chains: direction words and notes follow the actual direction', () => {
  const chainsAt = (settings, shocks, step) => {
    const sc = run(settings, shocks);
    const signs = qualitative(P, settings, { ...ZERO_SHOCKS, ...shocks });
    const isolated = {};
    for (const id of sc.activeShocks) isolated[id] = qualitative(P, settings, { ...ZERO_SHOCKS, [id]: sc.shocks[id] }).prev[1];
    return buildChains({ ...sc, signs }, step, { isolated, signs });
  };
  // Lowering the ceiling below E: E falls and the bank SELLS foreign currency.
  const hi = chainsAt({ ...BAND, bandStart: 'inside' }, { bandHi: -15 }, 1).find((c) => c.id === 'bandHi');
  const eNode = hi.nodes.find((x) => x.key === 'e');
  assert.equal(eNode.dir, -1);
  assert.equal(eNode.note, 'הבנק מוכר מט״ח');
  // Two economies, fiscal contraction: the note speaks of a contraction.
  const lg = chainsAt(LARGE, { G: -30 }, 1).find((c) => c.id === 'G');
  assert.ok(/צמצום/.test(lg.note) && /יורד/.test(lg.note), lg.note);
  assert.ok(/צמצום/.test(lg.title), lg.title);
  // Peg with expected appreciation: capital flows in and reserves rise.
  const ee = chainsAt(FIXED, { Ee: -1 }, 1).find((c) => c.id === 'Ee');
  assert.ok(/קונה/.test(ee.note), ee.note);
  // No mechanism note next to "?" or next to a node that does not move as the template says.
  for (const ch of chainsAt(CLOSED, { G: 30, M: -40 }, 2).concat(chainsAt({ ...CLOSED, assume: { noRateI: true } }, { M: 40 }, 1))) {
    for (const x of ch.nodes) if (x.dir === '?') assert.ok(!x.note || x.note === x.hint, `${ch.id} ${x.key} ${x.note}`);
  }
  const flat = chainsAt({ ...CLOSED, assume: { noRateI: true } }, { M: 40 }, 1).find((c) => c.id === 'M');
  assert.equal(flat.nodes.find((x) => x.key === 'Y').note, undefined, 'no multiplier note when Y does not move');
});

test('chains: the liquidity-trap chain only when the rate was already at zero without the money', () => {
  const japan = CASES.find((c) => c.id === 'japanTrap');
  const settings = { ...DEFAULT_SETTINGS, ...japan.settings };
  const params = { ...P, ...japan.params };
  const sc = buildScenario(params, settings, { ...ZERO_SHOCKS, ...japan.shocks });
  const signs = qualitative(params, settings, { ...ZERO_SHOCKS, ...japan.shocks }, { fixed: true });
  const m = buildChains({ ...sc, signs }, 1, { signs }).find((c) => c.id === 'M');
  assert.equal(m.nodes.find((x) => x.key === 'Y').dir, 0);
  assert.ok(evaluatePitfalls({ ...sc, signs }, 1).some((a) => a.id === 'liquidityTrap'));
  // A monetary expansion that itself brings i to zero is not a trap.
  const k0 = run({ ...CLOSED, assume: { noYMoney: true } }, { M: 200 });
  assert.ok(k0.snapshots[1].zlb);
  const al = evaluatePitfalls(k0, 1).map((a) => a.id);
  assert.ok(al.includes('zlbReached') && !al.includes('liquidityTrap'), al.join(','));
});

test('chains: the wage chain follows W, and expectations alone bring Y back without a wage chain', () => {
  const sc = run(FLOAT, { Ee: 1 });
  const ids = buildChains(sc, 3).map((c) => c.id);
  assert.ok(!ids.includes('lr-wages'), ids.join(','));
  const fl = buildChains(run({ ...CLOSED, assume: { fixedLabor: true } }, { G: 30 }), 3);
  const wages = fl.find((c) => c.id === 'lr-wages');
  assert.ok(wages && /הביקוש לעובדים קבוע/.test(wages.note));
  const vert = buildChains(run({ ...CLOSED, assume: { noRateI: true } }, { G: 30 }), 3)[0];
  assert.ok(/AD אנכית/.test(vert.title) && /ההשקעה לא תלויה בריבית/.test(vert.note), vert.note);
});

test('alerts: balanced budget only for equal sizes, direction-aware texts, no wrong-step alerts', () => {
  const both = { G: 30, T: 30 };
  const free = { ...run(CLOSED, both), signs: qualitative(P, CLOSED, { ...ZERO_SHOCKS, ...both }), fixedSizes: false };
  assert.ok(!evaluatePitfalls(free, 1).some((a) => a.id === 'balancedBudget'));
  const fixed = { ...run(CLOSED, both), signs: qualitative(P, CLOSED, { ...ZERO_SHOCKS, ...both }, { fixed: true }), fixedSizes: true };
  assert.ok(evaluatePitfalls(fixed, 1).some((a) => a.id === 'balancedBudget'));
  const down = { ...run(CLOSED, { G: -30, T: -30 }), fixedSizes: true };
  assert.ok(/יורדת/.test(evaluatePitfalls(down, 1).find((a) => a.id === 'balancedBudget').body));
  const reval = evaluatePitfalls(run(FIXED, { e: -8 }), 3).find((a) => a.id === 'devaluationLR');
  assert.ok(/יורד/.test(reval.body) && /ייסוף/.test(reval.title), reval.body);
  const war = run(LARGE, { Mf: 40 });
  assert.ok(evaluatePitfalls(war, 1).some((a) => a.id === 'currencyWar'));
  assert.ok(!evaluatePitfalls(war, 3).some((a) => a.id === 'currencyWar' || a.id === 'largeFiscal'));
  const uip3 = evaluatePitfalls(run(FLOAT, { Ee: 1 }), 3).find((a) => a.id === 'uip');
  assert.ok(/ΔEᵉ = 0/.test(uip3.body), uip3.body);
  const k0 = evaluatePitfalls(run({ ...CLOSED, assume: { noYMoney: true } }, { I0: 25 }), 1).find((a) => a.id === 'kZero');
  assert.ok(k0 && !/נדחק בכל זאת/.test(k0.body));
});

test('case studies: the story each step tells matches the sign table', () => {
  const signsOf = (id) => {
    const cs = CASES.find((c) => c.id === id);
    const settings = { ...DEFAULT_SETTINGS, ...cs.settings };
    return qualitative({ ...P, ...cs.params }, settings, { ...ZERO_SHOCKS, ...cs.shocks }, { fixed: true, rules: cs.rules || [] });
  };
  const jp = signsOf('japanTrap');
  assert.equal(jp.origin[1].Y, '−');
  assert.equal(jp.prev[2].Y, '=');
  assert.equal(jp.origin[2].P, '−');
  assert.equal(jp.noEq[3], 'all');
  const pol = signsOf('gfc2008policy');
  assert.equal(pol.origin[1].Y, '−', 'the policy softens the recession, it does not prevent it');
  assert.equal(pol.noEq[3], null);
  const mix = signsOf('policyMix');
  assert.equal(mix.origin[1].r, '=');
  assert.equal(mix.origin[1].I, '=');
  assert.equal(mix.origin[1].M, '+');
  assert.equal(signsOf('covid').origin[1].e, '−');
  assert.equal(signsOf('autoStab').noEq[3], null);
  for (const cs of CASES) {
    const q = signsOf(cs.id);
    for (let st = 1; st <= 3; st += 1) assert.notEqual(q.noEq[st] === 'all' && st < 3, true, `${cs.id} step ${st}`);
  }
});

test('the drawn case stays the same across steps unless the student picks another one', () => {
  let st = reducer(initialState, { type: 'SET_DIR', id: 'G', dir: -1 });
  assert.equal(st.caseVec, null);
  st = reducer(st, { type: 'SET_CASE', vec: { G: 3 } });
  assert.deepEqual(st.caseVec, { G: 3 });
  st = reducer(st, { type: 'NEXT' });
  assert.deepEqual(st.caseVec, { G: 3 });
  const loaded = reducer(initialState, { type: 'LOAD_CASE', id: 'policyMix' });
  assert.deepEqual(loaded.rules, ['M_r']);
  const left = reducer(loaded, { type: 'SET_DIR', id: 'T', dir: 1 });
  assert.deepEqual(left.rules, []);
});

console.log(`${passed} tests passed${process.exitCode ? ' (with failures)' : ''}`);
