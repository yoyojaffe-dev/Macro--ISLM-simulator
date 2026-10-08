/**
 * Core model: IS-LM(-BP) demand side + nominal-wage-contract supply side.
 *
 * Notation:       field r   = nominal interest rate (shown as i)
 *                 field e   = nominal exchange rate, NIS per foreign unit (shown as E)
 *                 field eps = real exchange rate E·P* ÷ P (shown as e)
 *                 field NX  = trade balance X - IM (shown as TB)
 *
 * Exchange-rate regimes (small open economy): floating, fixed, or a band
 * (learning center 7): E floats freely inside [E_low, E_high]; when the
 * floating solution would leave the band, the central bank buys or sells
 * foreign currency at the edge, so the economy behaves as under a peg at that
 * edge, and the money it creates or absorbs stays in the economy afterwards.
 *
 * Goods market:   C = C0 + c(Y - T),   I = I0 - b r
 *                 X = x0 + n(e - 1) + φ a*,  IM = m·a,  a = C + I + G (absorption)
 *                 Y = a + TB,   TB = X - IM   (Lecture 8: TB = TB(a, a*, e), (−,+,+))
 * Alternative assumptions used in the course's exams and learning centers
 * (settings.assume) are applied through effectiveParams: I independent of i
 * (b = 0), money demand independent of Y (k = 0), consumption depending on i
 * (ci), investment depending on Y (β), a perfectly interest-elastic money
 * demand (flat LM, closed economy), exports independent of a* (φ = 0), a fixed
 * labor demand (vertical short-run AS) and a central bank that keeps M/P fixed.
 * Money market:   M/P = L0 + kY - h r   (ZLB: r >= 0 in the closed economy)
 * BoP:            NX + κ (r - r* - ΔEᵉ) = 0   (κ = ∞: CM line r = r* + ΔEᵉ, i.e. UIP; κ = 0: NX = 0)
 * Supply:         Y_S / Y* = (A/A0) · sqrt(K/K0) · (P / Pᵉ)   (Lecture 4)
 *
 * Two-economy world (Lecture 12, size = 'large'): the foreign economy is a
 * scaled copy of the home economy (scale σ = (1 - ω)/ω, ω = home share of
 * world output) with its own IS, LM and wage-contract AS. With perfect capital
 * mobility both share one interest rate (up to expected depreciation), and
 * trade is bilateral, so NX* = -NX:
 *   X  = n(ε - 1) + (m/σ)(C* + I*),   IM = m (C + I)
 *   Y  = C + I + G + NX,   Y* = C* + I* + G* - NX
 *   M/P = L0 + kY - h r,   M* ÷ P* = σL0 + kY* - σh r*,   r = r* + ΔEᵉ
 * The world goods market makes r* endogenous: a large economy moves it.
 */
import { CAL, SHOCK_DEFS, activeAssumptions } from './constants.js';

export const sgn = (x, tol = 1e-7) => (Math.abs(x) <= tol ? 0 : x > 0 ? 1 : -1);

export const isLarge = (settings) => settings.economy === 'open' && settings.size === 'large';

/**
 * The regime actually operating at a snapshot. Under a band the economy floats
 * inside the band and behaves as under a peg at its edge.
 */
export function regimeAt(settings, snap) {
  if (settings.economy !== 'open') return null;
  if (settings.regime !== 'band') return settings.regime;
  return snap?.regimeNow === 'fixed' ? 'fixed' : 'floating';
}

/** Settings with the band replaced by the regime operating at a snapshot. */
export const effectiveSettings = (settings, snap) =>
  settings.regime === 'band' ? { ...settings, regime: regimeAt(settings, snap) } : settings;

/** Relative size of the foreign economy, σ = (1 - ω)/ω. */
export const sigmaOf = (params) => (1 - params.omega) / params.omega;

export function kappaOf(settings, params) {
  if (settings.economy !== 'open') return 0;
  // The two-economy world is analysed with perfect capital mobility (Lecture 12).
  if (settings.mobility === 'perfect' || isLarge(settings)) return Infinity;
  if (settings.mobility === 'none') return 0;
  return params.kappa;
}

/** Re-calibrate autonomous terms so t0 stays at (Y*, r*, P0, ε0, NX = 0). */
export function calibrate(params) {
  const { c, b, k, h, m } = params;
  return {
    C0: CAL.Ctarget - c * (CAL.Ystar - CAL.T0) + (params.ci || 0) * CAL.rStar,
    I0: CAL.Itarget + b * CAL.rStar,
    L0: CAL.M0 / CAL.P0 - k * CAL.Ystar + h * CAL.rStar,
    x0: m * (CAL.Ctarget + CAL.Itarget + CAL.G0) - phiOf(params) * CAL.aStar0,
  };
}

/**
 * Band edges at t0. The rate starts inside the band, or exactly at its lower
 * or upper edge (as in the 2022-2025 exams); a band can also be one-sided
 * (a floor or a ceiling only).
 */
export function bandAtStart(params, settings = {}) {
  const w = (params.bw ?? 10) / 100;
  const start = settings.bandStart || 'inside';
  const type = settings.bandType || 'two';
  let lo = CAL.e0 * (1 - w);
  let hi = CAL.e0 * (1 + w);
  if (start === 'low') [lo, hi] = [CAL.e0, CAL.e0 * (1 + 2 * w)];
  if (start === 'high') [lo, hi] = [CAL.e0 * (1 - 2 * w), CAL.e0];
  if (type === 'floor') hi = Infinity;
  if (type === 'ceiling') lo = 0;
  return { bandLo: lo, bandHi: hi };
}

export function baseExogenous(params, settings = {}) {
  const cal = calibrate(params);
  const sigma = isLarge(settings) ? sigmaOf(params) : null;
  return {
    ...cal,
    Ee: 0,
    sigma,
    // Foreign economy (two-economy world only): a σ-scaled copy of the home baseline.
    F: sigma
      ? { C0: sigma * cal.C0, T: sigma * CAL.T0, I0: sigma * cal.I0, G: sigma * CAL.G0, M: sigma * CAL.M0, L0: sigma * cal.L0 }
      : null,
    G: CAL.G0,
    T: CAL.T0,
    M: CAL.M0,
    eFix: CAL.e0,
    ...bandAtStart(params, settings),
    rStar: CAL.rStar,
    Pstar: CAL.Pstar0,
    aStar: CAL.aStar0,
    A: CAL.A0,
    K: CAL.K0,
  };
}

/** Keep only shocks that make sense under the current settings. */
export function effectiveShocks(shocks, settings) {
  const out = {};
  for (const d of SHOCK_DEFS) out[d.id] = d.applies(settings) ? shocks[d.id] || 0 : 0;
  return out;
}

export function applyShocks(base, shocks) {
  return {
    ...base,
    G: base.G + shocks.G,
    T: base.T + shocks.T,
    M: base.M + shocks.M,
    L0: base.L0 + shocks.L0,
    C0: base.C0 + shocks.C0,
    I0: base.I0 + shocks.I0,
    A: base.A * (1 + shocks.A / 100),
    K: base.K * (1 + (shocks.K || 0) / 100),
    eFix: base.eFix * (1 + shocks.e / 100),
    ...bandBounds(base, shocks),
    rStar: base.rStar + shocks.rStar,
    Pstar: base.Pstar * (1 + shocks.Pstar / 100),
    aStar: base.aStar + shocks.aStar,
    Ee: shocks.Ee || 0,
    F: base.F
      ? { ...base.F, G: base.F.G + base.sigma * (shocks.Gf || 0), M: base.F.M + base.sigma * (shocks.Mf || 0) }
      : null,
  };
}

/**
 * Band edges after shocks. A positive bandLo raises the lower edge above the
 * current rate E0 (learning center 7, Q2: the central bank must buy foreign
 * currency); a negative one lowers it. Symmetrically, a negative bandHi pulls
 * the upper edge below E0 and a positive one raises it. Values are in % of E0.
 */
function bandBounds(base, shocks) {
  const sl = shocks.bandLo || 0;
  const sh = shocks.bandHi || 0;
  let lo = base.bandLo;
  let hi = base.bandHi;
  if (sl > 0) lo = Math.max(lo, CAL.e0 * (1 + sl / 100));
  if (sl < 0) lo *= 1 + sl / 100;
  if (sh < 0) hi = Math.min(hi, CAL.e0 * (1 + sh / 100));
  if (sh > 0) hi *= 1 + sh / 100;
  // An edge moved past the other one drags it along: the band collapses at the
  // edge that was moved (raising the floor above the ceiling, or lowering the
  // ceiling below the floor).
  if (lo > hi) {
    if (sh < 0 && !(sl > 0)) lo = hi;
    else hi = lo;
  }
  return { bandLo: lo, bandHi: hi };
}

/** Gaussian elimination with partial pivoting (small dense systems). */
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-14) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let k = col; k <= n; k += 1) M[r][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Two-economy demand block for given price levels P (home) and exo.Pstar (foreign).
 * Floating: unknowns [Y, Y*, r, ε]. Fixed (home pegs to the foreign currency):
 * unknowns [Y, Y*, r, M/P], with ε = e·P* ÷ P given and home money endogenous.
 */
function demandLarge(params, settings, exo, P) {
  const { k, h, m, n } = params;
  const sig = exo.sigma;
  const F = exo.F;
  const Pf = exo.Pstar;
  const Ee = exo.Ee || 0;
  const ms = m / sig;
  const fixed = settings.regime === 'fixed';
  // Absorption at home and abroad: a = aut + mps·Y − bt·i. Imports are a share
  // of total absorption (Lecture 8), so home imports are m·a and foreign
  // imports (our exports, besides the price effect) are (m/σ)·a*.
  const S = spending(params, exo);
  const Sf = spending(params, F, sig);
  const mps = S.mps;
  const bt = S.bt; // home interest sensitivity; foreign one is σ·bt
  const epsFix = fixed ? (exo.eFix * Pf) / P : 0;
  // Unknowns [Y, Y*, i, ε or M/P]. Rows: home goods, foreign goods, home money, foreign money.
  const A = [
    [1 - (1 - m) * mps, -ms * mps, bt, fixed ? 0 : -n],
    [-m * mps, 1 - (1 - ms) * mps, sig * bt, fixed ? 0 : n],
    [k, 0, -h, fixed ? -1 : 0],
    [0, k, -sig * h, 0],
  ];
  const rhs = [
    (1 - m) * S.aut - n + ms * Sf.aut + m * bt * Ee + (fixed ? n * epsFix : 0),
    (1 - ms) * Sf.aut + (1 - ms) * sig * bt * Ee + n + m * S.aut - (fixed ? n * epsFix : 0),
    fixed ? -exo.L0 : exo.M / P - exo.L0,
    F.M / Pf - F.L0 - sig * h * Ee,
  ];
  const x = solveLinear(A, rhs);
  if (!x) return { Y: NaN, r: NaN, valid: false };
  const [Y, Yf, r, z] = x;
  const eps = fixed ? epsFix : z;
  const MP = fixed ? z : exo.M / P;
  const rf = r - Ee;
  const Ah = S.aut + mps * Y - bt * r;
  const Af = Sf.aut + mps * Yf - sig * bt * rf;
  const X = n * (eps - 1) + ms * Af;
  const IM = m * Ah;
  const valid = Number.isFinite(Y) && Y > 0 && Yf > 0 && eps > 0 && MP > 0;
  return { Y, r, eps, e: (eps * P) / Pf, M: MP * P, MP, zlb: false, valid, Yf, rf, X, IM, MPf: F.M / Pf };
}

/**
 * Fiscal rules (Lecture 2 exercise; learning center 4):
 *   taxes     T_total = T + t (Y - Y*0)      (T = tY around the baseline)
 *   spending  G_total = G + δ (Y - Y*0)
 * so the baseline is unchanged and the sliders move T and G as before.
 * Returns the effective marginal propensity ce = c(1 - t), δ, and the
 * autonomous parts: priv = C0 - c(T - tY*0) + I0 and Gc = G - δY*0.
 * `scale` sizes the foreign economy (σ) in the two-economy world.
 */
export function fiscal(params, exo, scale = 1) {
  const t = params.t || 0;
  const delta = params.delta || 0;
  const Y0 = scale * CAL.Ystar;
  return {
    ce: params.c * (1 - t),
    delta,
    priv: exo.C0 - params.c * (exo.T - t * Y0) + exo.I0,
    Gc: exo.G - delta * Y0,
  };
}

/**
 * Domestic absorption a = C + I + G written as a = aut + mps·Y − bt·i, with
 * C = C0 + c(Y − T) − ci·i,  I = I0 + β(Y − Y*0) − b·i,  G = G + δ(Y − Y*0).
 * `scale` sizes the foreign economy (σ) in the two-economy world.
 */
export function spending(params, exo, scale = 1) {
  const H = fiscal(params, exo, scale);
  const beta = params.beta || 0;
  return {
    ...H,
    beta,
    aut: H.priv + H.Gc - beta * scale * CAL.Ystar,
    mps: H.ce + H.delta + beta,
    bt: scale * ((params.b || 0) + (params.ci || 0)),
  };
}

/** Export sensitivity to foreign absorption (0 when exports ignore a*). */
export const phiOf = (params) => (params.phi ?? CAL.phi);

/** Effective open-economy coefficients (zero in the closed economy). */
function openCoefs(params, settings) {
  const open = settings.economy === 'open';
  return { open, m: open ? params.m : 0, n: open ? params.n : 0, phi: open ? phiOf(params) : 0 };
}

/**
 * Parameters actually used by the model once the alternative assumptions are
 * applied. Every chart and table receives these, so the UI never re-derives them.
 */
export function effectiveParams(params, settings) {
  const a = Object.fromEntries(activeAssumptions(settings).map((id) => [id, true]));
  const out = { ...params };
  if (a.noRateI) out.b = 0;
  if (a.noYMoney) out.k = 0;
  out.ci = a.rateC ? params.ciV ?? 5 : 0;
  out.beta = a.investY ? params.betaV ?? 0.1 : 0;
  out.phi = a.noExportA ? 0 : CAL.phi;
  out.flatLM = Boolean(a.flatLM) && settings.economy === 'closed';
  // Keep the multiplier finite: c(1 − t) + δ + β < 1 (learning center 4: c + δ < 1).
  out.c = Math.min(out.c, maxC(out));
  return out;
}

/**
 * Highest marginal propensity to spend out of output, c(1 − t) + δ + β, the
 * simulator allows. At 1 the multiplier is infinite and IS turns upward.
 */
export const MPS_MAX = 0.95;

/** Largest c that keeps c(1 − t) + δ + β ≤ MPS_MAX for the given t, δ, β. */
export const maxC = (p) => (MPS_MAX - (p.delta || 0) - (p.beta || 0)) / (1 - (p.t || 0));

/**
 * Demand-side equilibrium for a given price level P.
 * Returns output, interest rate, exchange rates and (possibly endogenous) money.
 */
export function demand(params, settings, exo, P) {
  const { c, b, k, h } = params;
  const { open, m, n, phi } = openCoefs(params, settings);
  const kap = kappaOf(settings, params);
  // A central bank that keeps real balances fixed supplies M = (M/P)·P.
  if (exo.realM != null) exo = { ...exo, M: exo.realM * P };
  if (isLarge(settings)) return demandLarge(params, settings, exo, P);
  const rW = exo.rStar + (exo.Ee || 0); // UIP: r = r* + expected depreciation
  const S = spending(params, exo);
  const Abar = S.aut; // autonomous absorption (C + I + G)
  const bt = S.bt; // interest sensitivity of absorption
  const q = 1 - S.mps; // 1 - marginal propensity to spend on output (closed)
  const s = 1 - (1 - m) * S.mps; // same, net of the import leakage (imports = m·a)
  if (!open && k === 0 && h === 0 && !params.flatLM) return { Y: NaN, r: NaN, valid: false };
  let Y;
  let r;
  let eps = null;
  let e = null;
  let M = exo.M;
  let zlb = false;
  let valid = true;
  let band = null; // band regime: 'inside' | 'low' | 'high'
  let regimeNow = open ? 'floating' : null; // the regime actually operating

  if (!open && params.flatLM) {
    // Money demand perfectly elastic in i: LM is flat at the going rate, so M
    // and P do not move i, and output is read off IS alone.
    r = CAL.rStar;
    Y = (Abar - bt * r) / q;
  } else if (!open) {
    const mm = exo.M / P - exo.L0;
    const D = h * q + bt * k;
    Y = (h * Abar + bt * mm) / D;
    r = (k * Y - mm) / h;
    if (r < 0) {
      // Zero lower bound: LM is flat at r = 0, output is set by IS alone.
      zlb = true;
      r = 0;
      Y = Abar / q;
    }
  } else {
    // Floating: M is given, E clears the goods market.
    const floatSol = () => {
      const mm = exo.M / P - exo.L0;
      let Yf;
      let rf;
      if (kap === Infinity) {
        rf = rW;
        Yf = (mm + h * rW) / k;
      } else {
        // BP (in equilibrium form) and LM jointly pin down Y and r; ε then clears IS.
        Yf = (h * Abar + h * kap * rW + (bt + kap) * mm) / (h * q + (bt + kap) * k);
        rf = (k * Yf - mm) / h;
      }
      const nGap = s * Yf - (1 - m) * (Abar - bt * rf) - exo.x0 - phi * exo.aStar;
      const ef = 1 + nGap / n;
      return { Y: Yf, r: rf, eps: ef, e: (ef * P) / exo.Pstar, M: exo.M, ok: ef > 0 };
    };
    // Fixed at E: ε is given, M is endogenous (reserves adjust).
    const fixedSol = (E) => {
      const ef = (E * exo.Pstar) / P;
      const X = exo.x0 + n * (ef - 1) + phi * exo.aStar;
      let Yx;
      let rx;
      if (kap === Infinity) {
        rx = rW;
        Yx = ((1 - m) * (Abar - bt * rx) + X) / s;
      } else {
        const R1 = (1 - m) * Abar + X;
        const R2 = X - m * Abar - kap * rW;
        const a11 = s;
        const a12 = (1 - m) * bt;
        const a21 = m * S.mps;
        const a22 = -(m * bt + kap);
        const det = a11 * a22 - a12 * a21;
        Yx = (R1 * a22 - a12 * R2) / det;
        rx = (a11 * R2 - a21 * R1) / det;
      }
      const Mx = P * (exo.L0 + k * Yx - h * rx);
      return { Y: Yx, r: rx, eps: ef, e: E, M: Mx, ok: Mx > 0 };
    };
    let sol;
    if (settings.regime === 'fixed') {
      sol = fixedSol(exo.eFix);
      regimeNow = 'fixed';
    } else if (settings.regime === 'band') {
      const fl = floatSol();
      // A relative tolerance keeps a rate that starts exactly at an edge from
      // being read as an intervention because of rounding. A ceiling-only band
      // has no floor (bandLo = 0).
      const tol = 1e-9 * CAL.e0;
      if (exo.bandLo > 0 && !(fl.e >= exo.bandLo - tol)) {
        sol = fixedSol(exo.bandLo);
        band = 'low';
        regimeNow = 'fixed';
      } else if (fl.e > exo.bandHi + tol) {
        sol = fixedSol(exo.bandHi);
        band = 'high';
        regimeNow = 'fixed';
      } else {
        sol = fl;
        band = 'inside';
      }
    } else {
      sol = floatSol();
    }
    ({ Y, r, eps, e, M } = sol);
    if (!sol.ok) valid = false;
  }
  if (!Number.isFinite(Y) || Y <= 0) valid = false;
  return { Y, r, eps, e, M, MP: M / P, zlb, valid, band, regimeNow };
}

/** Expenditure components and balance-of-payments items for a demand solution. */
export function components(params, settings, exo, d) {
  const { c, b, k, h } = params;
  const { open, m, n, phi } = openCoefs(params, settings);
  const t = params.t || 0;
  const delta = params.delta || 0;
  const Ttot = exo.T + t * (d.Y - CAL.Ystar);
  const Gtot = exo.G + delta * (d.Y - CAL.Ystar);
  const C = exo.C0 + c * (d.Y - Ttot) - (params.ci || 0) * d.r;
  const I = exo.I0 + (params.beta || 0) * (d.Y - CAL.Ystar) - b * d.r;
  let X = 0;
  let IM = 0;
  if (d.X != null) {
    X = d.X;
    IM = d.IM;
  } else if (open) {
    X = exo.x0 + n * (d.eps - 1) + phi * exo.aStar;
    IM = m * (C + I + Gtot); // imports depend on total absorption (Lecture 8)
  }
  const NX = X - IM;
  const Md = exo.L0 + k * d.Y - h * d.r; // real money demand
  return { C, I, X, IM, NX, KA: -NX, Md, Yd: d.Y - Ttot, T: Ttot, G: Gtot, budget: Ttot - Gtot };
}

export const potentialOutput = (exo) =>
  CAL.Ystar * (exo.A / CAL.A0) * Math.sqrt(exo.K / CAL.K0);

/** Labor needed to produce Y with Y = A·sqrt(K·L). */
const laborFor = (Y, exo) => (Y / (exo.A * Math.sqrt(exo.K))) ** 2;

/**
 * Find P with f(P) = 0 where f is non-increasing in P (AD minus AS, in output
 * units). Prices move from `prefer` (the previous step's price level) and stop
 * at the first P where f reaches zero, so when AD is vertical exactly at the
 * target (a whole interval of solutions, e.g. demand pinned at the zero lower
 * bound or investment independent of i) the price level does not jump.
 * Bisection in log space. Returns { P, ok, side } (side: where it failed).
 */
export function solvePrice(f, prefer = 1, lo = 1e-3, hi = 1e3) {
  const tol = 1e-12 * CAL.Ystar; // above rounding noise (~1e-13 relative), far below sign tolerances
  const p0 = Math.min(Math.max(prefer, lo), hi);
  const fp = f(p0);
  if (!Number.isFinite(fp)) return { P: NaN, ok: false, side: null };
  if (Math.abs(fp) <= tol) return { P: p0, ok: true };
  const rising = fp > 0; // excess demand at the old price: P must rise
  let a = Math.log(rising ? p0 : lo);
  let z = Math.log(rising ? hi : p0);
  const fEnd = f(Math.exp(rising ? z : a));
  if (rising ? !(fEnd <= tol) : !(fEnd >= -tol)) return { P: NaN, ok: false, side: rising ? 'high' : 'low' };
  for (let i = 0; i < 200 && z - a > 1e-13; i += 1) {
    const mid = (a + z) / 2;
    const fm = f(Math.exp(mid));
    if (rising) {
      if (fm > tol) a = mid;
      else z = mid;
    } else if (fm >= -tol) a = mid;
    else z = mid;
  }
  return { P: Math.exp(rising ? z : a), ok: true };
}

/** Wage index: normalized so that w0 = P0 and w/P = 1 at t0. */
const marketWage = (P, exo) => P * (exo.A / CAL.A0) * Math.sqrt(exo.K / CAL.K0);

/**
 * Cumulative central-bank intervention since t0 (change in reserves, in money
 * units): the gap between the money stock and the stock set by policy.
 */
function reservesOf(settings, exo, d) {
  if (settings.economy !== 'open' || settings.regime === 'floating') return 0;
  if (isLarge(settings)) return settings.regime === 'fixed' ? d.M - exo.M : 0;
  return d.M - (exo.Mcb ?? exo.M);
}

function marketRate(params, settings, exo, P) {
  const f = demand(params, { ...settings, regime: 'floating' }, { ...exo, M: exo.Mcb ?? exo.M }, P);
  return Number.isFinite(f.e) && f.e > 0 ? f.e : null;
}

function makeSnapshot(key, ctx, exoIn, P, Pe, w, flags = {}) {
  const { params, settings } = ctx;
  const large = isLarge(settings);
  const d = demand(params, settings, exoIn, P);
  // In a two-economy world the world rate is endogenous; store it on exo so the
  // CM line (r = r* + ΔEᵉ) is drawn at the current world rate.
  const exo = large ? { ...exoIn, rStar: d.rf } : exoIn;
  const comp = components(params, settings, exo, d);
  const Ystar = potentialOutput(exo);
  const L = laborFor(d.Y, exo);
  const snap = {
    key,
    exo,
    P,
    Pe,
    Y: d.Y,
    r: d.r,
    eps: d.eps,
    e: d.e,
    M: d.M,
    Mpolicy: exo.M,
    MP: d.MP,
    // Cumulative intervention: money created by buying foreign currency since t0.
    reservesDelta: reservesOf(settings, exo, d),
    band: d.band ?? null,
    regimeNow: d.regimeNow ?? null,
    // Exchange rate the FX market would set without intervention, at the money
    // stock set by policy (used by the FX-market chart).
    eMarket: d.regimeNow === 'fixed' && !large ? marketRate(params, settings, exo, P) : d.e,
    bandLo: settings.regime === 'band' ? exo.bandLo : null,
    bandHi: settings.regime === 'band' ? exo.bandHi : null,
    G: exo.G,
    T: exo.T,
    ...comp,
    a: comp.C + comp.I + comp.G, // absorption (Lecture 8)
    w,
    wP: w / P,
    L,
    Ystar,
    gap: (d.Y - Ystar) / Ystar,
    zlb: d.zlb,
    rStar: settings.economy === 'open' ? exo.rStar : null,
    Pstar: settings.economy === 'open' ? exo.Pstar : null,
    Ee: exo.Ee || 0,
    valid: d.valid && comp.C > 0 && comp.I > -1e-9,
    ...flags,
  };
  if (large) {
    // Foreign economy and the closed-economy benchmark rate (Lecture 12: i_closed).
    snap.Yf = d.Yf;
    snap.Yfstar = exo.sigma * CAL.Ystar;
    snap.MPf = d.MPf;
    snap.Gf = exo.F.G;
    snap.Mf = exo.F.M;
    snap.rClosed = demand(params, { ...settings, economy: 'closed' }, exo, P).r;
  }
  return snap;
}

/**
 * Equilibrium price levels for supply targets yT(P) (home) and yfT(Pf) (foreign).
 * Small or closed economy: 1-D bisection on P (foreign prices exogenous).
 * Two-economy world: 2-D damped Newton on (log P, log P*).
 */
function equilibriumPrices(params, settings, exo, yT, yfT, prefer = CAL.P0) {
  if (!isLarge(settings)) {
    const sol = solvePrice((P) => demand(params, settings, exo, P).Y - yT(P), prefer);
    return { ...sol, Pf: exo.Pstar };
  }
  const F = ([lp, lpf]) => {
    const P = Math.exp(lp);
    const Pf = Math.exp(lpf);
    const d = demand(params, settings, { ...exo, Pstar: Pf }, P);
    return [d.Y / yT(P) - 1, d.Yf / yfT(Pf) - 1];
  };
  let x = [0, 0];
  for (let it = 0; it < 80; it += 1) {
    const f = F(x);
    if (!f.every(Number.isFinite)) return { ok: false };
    if (Math.max(Math.abs(f[0]), Math.abs(f[1])) < 1e-12) return { ok: true, P: Math.exp(x[0]), Pf: Math.exp(x[1]) };
    const eps = 1e-6;
    const f1 = F([x[0] + eps, x[1]]);
    const f2 = F([x[0], x[1] + eps]);
    const J = [
      [(f1[0] - f[0]) / eps, (f2[0] - f[0]) / eps],
      [(f1[1] - f[1]) / eps, (f2[1] - f[1]) / eps],
    ];
    const dx = solveLinear(J, [-f[0], -f[1]]);
    if (!dx) return { ok: false };
    const scale = Math.min(1, 0.5 / Math.max(Math.abs(dx[0]), Math.abs(dx[1])));
    x = [x[0] + scale * dx[0], x[1] + scale * dx[1]];
  }
  const f = F(x);
  const ok = Math.max(Math.abs(f[0]), Math.abs(f[1])) < 1e-8;
  return { ok, P: Math.exp(x[0]), Pf: Math.exp(x[1]) };
}

/** Share of the expected exchange-rate change still present at each step (expectations fade). */
export const EXPECTATION_DECAY = { t0: 0, sr: 1, mr: 0.5, lr: 0 };
/**
 * How fast expectations of an exchange-rate change fade (settings.eeFade): the
 * share still present in the short run. Lecture 9 leaves the speed open, and
 * the direction of E in the short run depends on it.
 */
export const EXPECTATION_FADE = { fast: 0, half: 0.5, slow: 1 };
export const expectationShare = (settings, key) =>
  key === 'mr' ? EXPECTATION_FADE[settings?.eeFade] ?? EXPECTATION_DECAY.mr : EXPECTATION_DECAY[key];

/**
 * Build all four horizon snapshots.
 *   t0: baseline long-run equilibrium (no shock)
 *   sr: shock hits, prices sticky (course: immediate run)  -> horizontal AS
 *   mr: prices adjust, wages sticky (course: short run)    -> upward SRAS
 *   lr: wages adjust, Y returns to Y* (course: medium run) -> vertical AS
 * In a two-economy world both economies follow the same horizons jointly.
 */
export function buildScenario(rawParams, settings, rawShocks) {
  // Alternative assumptions (settings.assume) become effective parameters.
  const params = effectiveParams(rawParams, settings);
  const assume = Object.fromEntries(activeAssumptions(settings).map((id) => [id, true]));
  const ctx = { params, settings };
  const shocks = effectiveShocks(rawShocks, settings);
  const base = baseExogenous(params, settings);
  let shocked = applyShocks(base, shocks);
  const school = settings.school;
  const large = isLarge(settings);
  // Interest-rate instrument (Lecture 5, open market operations): in the
  // immediate run the central bank buys or sells bonds until r = r̄. The money
  // stock that achieves this is endogenous; it then stays put.
  let rateTarget = null;
  if (settings.economy === 'closed' && settings.instrument === 'r') {
    const want = CAL.rStar + (shocks.rT || 0);
    const target = Math.max(0, want);
    const S = spending(params, shocked);
    const Y = (S.aut - S.bt * target) / (1 - S.mps);
    const M = CAL.P0 * (shocked.L0 + params.k * Y - params.h * target);
    rateTarget = { want, target, bound: want < 0, M, dM: M - base.M, feasible: M > 0 };
    if (M > 0) shocked = { ...shocked, M };
  }
  // Band: money created or absorbed at the edge of the band stays in the
  // economy, so each step starts from the previous step's money stock.
  const band = settings.economy === 'open' && settings.regime === 'band' && !large;
  shocked = { ...shocked, Mcb: shocked.M };
  const carry = {};
  let realM = null;
  const exoAt = (key) => ({
    ...shocked,
    Ee: (shocks.Ee || 0) * expectationShare(settings, key),
    ...(carry[key] != null ? { M: carry[key] } : {}),
    ...(realM != null && key !== 'sr' ? { realM } : {}),
  });
  const withPf = (exo, Pf) => (large ? { ...exo, Pstar: Pf } : exo);

  // t0: long-run equilibrium on the baseline (P0 = P*0 = 1 by calibration).
  const Ystar0 = potentialOutput(base);
  const Yf0 = large ? base.sigma * CAL.Ystar : null;
  const t0Sol = equilibriumPrices(params, settings, base, () => Ystar0, () => Yf0);
  const P0 = t0Sol.ok ? t0Sol.P : CAL.P0;
  const Pf0 = t0Sol.ok ? t0Sol.Pf : base.Pstar;
  const w0 = marketWage(P0, base);
  const t0 = makeSnapshot('t0', ctx, withPf(base, Pf0), P0, P0, w0);

  const YstarN = potentialOutput(shocked);
  const wPush = 1 + (shocks.W || 0) / 100;
  // Why a flexible-price equilibrium is missing (see noEqReason below).
  let noEqReason = null;
  let noEqSide = null;
  const diagnose = (exo) => {
    // Demand at the extremes of the price level tells why no P clears the market.
    const dLo = demand(params, settings, exo, 1e-3);
    const dHi = demand(params, settings, exo, 1e3);
    const side = dHi.Y > YstarN ? 'excess' : dLo.Y < YstarN ? 'deficient' : null;
    // AD vertical: demand does not react to the price level at all.
    if (Number.isFinite(dLo.Y) && Math.abs(dLo.Y - dHi.Y) < 1e-6 * YstarN) return { reason: 'vertical', side };
    // Too little demand even at very low prices, with the rate stuck at zero: liquidity trap.
    if (side === 'deficient' && dLo.zlb) return { reason: 'trap', side };
    return { reason: 'linear', side };
  };
  const flexible = (key, prefer) => {
    const exo = exoAt(key);
    const sol = equilibriumPrices(params, settings, exo, () => YstarN, () => Yf0, prefer);
    if (!sol.ok) {
      if (!noEqReason) ({ reason: noEqReason, side: noEqSide } = diagnose(exo));
      return null;
    }
    return makeSnapshot(key, ctx, withPf(exo, sol.Pf), sol.P, sol.P, marketWage(sol.P, shocked));
  };
  const sticky = (key) => makeSnapshot(key, ctx, withPf(exoAt(key), Pf0), P0, P0, w0);

  // Short run
  let sr;
  if (school === 'classical') {
    sr = flexible('sr', P0) || { ...sticky('sr'), noEq: true };
  } else {
    sr = sticky('sr');
  }
  if (band) carry.mr = sr.M;
  // Central bank keeps real balances at their post-shock level (2026 exam,
  // Q1): M follows P from the short run on, so AD is vertical.
  const realRule = assume.realM && (settings.economy === 'closed' || settings.regime === 'floating');
  if (realRule) realM = sr.MP;

  // Medium run
  let mr;
  if (school === 'classical') {
    mr = flexible('mr', sr.P) || { ...sr, key: 'mr', noEq: true };
  } else if (school === 'extreme') {
    // P = w/a: a higher contract wage raises the price level one for one.
    const Pw = P0 * wPush;
    mr = wPush === 1 ? sticky('mr') : makeSnapshot('mr', ctx, withPf(exoAt('mr'), Pf0), Pw, Pw, w0 * wPush);
  } else if (assume.fixedLabor) {
    // Labor demand does not depend on P (2026 exam, Q2): employment, and so
    // output, stay at their full-employment level once prices move. The
    // short-run AS is vertical; the immediate AS is still horizontal. New wage
    // contracts (W) change only the real wage.
    const exo = exoAt('mr');
    const sol = equilibriumPrices(params, settings, exo, () => YstarN, () => Yf0, P0);
    if (sol.ok) mr = makeSnapshot('mr', ctx, withPf(exo, sol.Pf), sol.P, P0, w0 * wPush);
    else {
      ({ reason: noEqReason, side: noEqSide } = diagnose(exo));
      mr = { ...sticky('mr'), noEq: true };
    }
  } else {
    const exo = exoAt('mr');
    const Pe = P0 * wPush; // contracts signed at a higher wage: SRAS through (Y*, P0·(1+W))
    const sol = equilibriumPrices(
      params,
      settings,
      exo,
      (P) => YstarN * (P / Pe),
      (Pf) => Yf0 * (Pf / Pf0),
      P0,
    );
    // Along an upward-sloping SRAS a solution always exists unless the linear
    // model breaks down; then the step is reported as having no equilibrium.
    if (sol.ok) mr = makeSnapshot('mr', ctx, withPf(exo, sol.Pf), sol.P, Pe, w0 * wPush);
    else {
      noEqReason = 'linear';
      noEqSide = sol.side === 'high' ? 'excess' : sol.side === 'low' ? 'deficient' : null;
      mr = { ...sticky('mr'), noEq: true };
    }
  }

  if (band) carry.lr = mr.M;

  // Long run
  let lr = mr.noEq ? null : flexible('lr', mr.P);
  if (!lr) lr = { ...mr, key: 'lr', noEq: true };
  // When the medium run has no equilibrium, this says why:
  //   'trap'     demand stays below Y* even at i = 0 (Lecture 5: liquidity trap)
  //   'vertical' AD is vertical (M/P fixed, flat LM, investment independent of i)
  //   'linear'   the linear model's limit (money demand would turn negative)
  // and noEqSide whether demand is above ('excess') or below ('deficient') Y*.
  const needsNegativeRate = noEqReason === 'trap';

  const snapshots = [t0, sr, mr, lr];
  // A rate target that needs a negative money stock cannot be reached.
  if (rateTarget && !rateTarget.feasible) for (const sn of snapshots.slice(1)) sn.valid = false;
  // External debt (2022-2023 exams): each horizon adds the trade deficit of
  // that period, so debt follows the level of TB, not its change.
  let debt = 0;
  for (const sn of snapshots) {
    if (sn.key !== 't0') debt -= sn.NX ?? 0;
    sn.debt = settings.economy === 'open' ? debt : null;
  }

  // When expectations fade between steps, two things change at once: ΔEᵉ and
  // prices. To explain each separately, evaluate demand with the NEW
  // expectations at the PREVIOUS step's prices (pure expectations effect).
  const expectOnly = {};
  if (shocks.Ee) {
    const pairs = [['mr', sr, mr], ['lr', mr, lr]];
    for (const [key, prev, cur] of pairs) {
      if (cur.noEq) continue;
      expectOnly[key] = makeSnapshot(`${key}-expect`, ctx, withPf(exoAt(key), prev.Pstar ?? shocked.Pstar), prev.P, prev.Pe, prev.w);
    }
  }
  return {
    params,
    settings,
    shocks,
    base,
    shocked,
    snapshots,
    expectOnly,
    rateTarget,
    needsNegativeRate,
    noEqReason: lr.noEq ? noEqReason || 'linear' : null,
    noEqSide: lr.noEq ? noEqSide : null,
    activeShocks: SHOCK_DEFS.filter((d) => shocks[d.id] !== 0).map((d) => d.id),
    domains: computeDomains(snapshots, base),
  };
}

/**
 * Fixed axis ranges. They never depend on the scenario, the parameters or the
 * step, so the starting equilibrium (Y* = 1000, i = 3%, P = 1, L* = 100,
 * W/P = 1) always sits at the same place on every chart and shocks are seen as
 * movements against a stable frame. Points beyond a range are flagged by the
 * charts rather than rescaling the axes.
 */
export const FIXED_DOMAINS = Object.freeze({
  Y: [600, 1400],
  r: [0, 14],
  P: [0.5, 1.5],
  q: [150, 650],
  L: [30, 180],
  wP: [0.5, 1.6],
});

function computeDomains(snaps, base) {
  const out = { ...FIXED_DOMAINS };
  if (base.sigma) out.Yf = [base.sigma * FIXED_DOMAINS.Y[0], base.sigma * FIXED_DOMAINS.Y[1]];
  return out;
}

/** True when a value lies outside a fixed axis range (the chart then flags it). */
export const outOfRange = (v, dom) => Number.isFinite(v) && (v < dom[0] || v > dom[1]);

/** Numerical multipliers at a snapshot, holding P fixed (sticky-price multipliers). */
export function multipliers(params, settings, snap) {
  const dY = (patch) => {
    const up = demand(params, settings, { ...snap.exo, ...patch(1) }, snap.P).Y;
    const dn = demand(params, settings, { ...snap.exo, ...patch(-1) }, snap.P).Y;
    return (up - dn) / 2;
  };
  return {
    fiscal: dY((s) => ({ G: snap.exo.G + s })),
    tax: dY((s) => ({ T: snap.exo.T + s })),
    monetary: dY((s) => ({ M: snap.exo.M + s })),
    keynesian:
      (1 - (settings.economy === 'open' ? params.m : 0)) /
      (1 - (1 - (settings.economy === 'open' ? params.m : 0)) * (params.c * (1 - (params.t || 0)) + (params.delta || 0) + (params.beta || 0))),
  };
}

/**
 * Supply curves to draw in the AD-AS diagram at a given step, following the
 * course diagram (Lecture 5): the immediate-run AS is horizontal at P0
 * (P, W fixed), the short-run AS slopes up for the contract wage W0, and after
 * wages update the AS for W1 passes through Y* at the new price level.
 *
 * Each descriptor: { kind, role, label, status } where status is
 *   'active'   -> the curve that determines equilibrium at this step
 *   'context'  -> shown faded for comparison (past or upcoming horizon)
 */
export function supplyCurves(scenario, step) {
  const { settings, snapshots } = scenario;
  const [t0, , mr, lr] = snapshots;
  const school = settings.school;
  const P0 = t0.P;
  const Ystar = step === 0 ? t0.Ystar : lr.Ystar;
  const wagePush = Math.abs(mr.Pe - P0) > 1e-9; // contracts re-signed at a different wage (W shock)
  // The curve for the new contracts; its direction is not written in the label (it is the quiz's answer).
  const pushLabel = "AS'";
  const out = [];
  const add = (desc, active) => out.push({ ...desc, status: active ? 'active' : 'context' });

  if (school !== 'classical') {
    // Immediate run: horizontal at the pre-shock price level.
    add(
      { kind: 'horizontal', P: P0, role: 'ASim', label: 'AS מיידי' },
      step === 1 || (school === 'extreme' && step === 2 && !wagePush),
    );
  }
  const fixedLabor = activeAssumptions(settings).includes('fixedLabor');
  if (school === 'keynesian' && fixedLabor) {
    // Labor demand fixed: the short-run AS is vertical at Y* (2026 exam).
    add({ kind: 'vertical', Y: Ystar, role: 'SRASv', label: 'AS קצר' }, step === 2);
  } else if (school === 'keynesian') {
    // Short run with the old contract wage W0 (expected price level P0).
    add({ kind: 'sras', Pe: P0, Ystar, role: 'SRAS0', label: 'AS(W₀)' }, step === 0 || (step === 2 && !wagePush));
    if (wagePush && step >= 2) {
      add({ kind: 'sras', Pe: mr.Pe, Ystar, role: 'SRASw', label: pushLabel }, step === 2);
    }
    if (step === 3 && !lr.noEq && Math.abs(lr.P - P0) > 1e-6 * P0) {
      // After wages update: AS for the new contract wage W1 through (Y*, P_LR).
      add({ kind: 'sras', Pe: lr.P, Ystar, role: 'SRAS1', label: 'AS(W₁)' }, true);
    }
  }
  if (school === 'extreme') {
    if (wagePush && step >= 2) add({ kind: 'horizontal', P: mr.P, role: 'ASimw', label: pushLabel }, step === 2);
    if (step === 3 && !lr.noEq && Math.abs(lr.P - P0) > 1e-6 * P0) {
      add({ kind: 'horizontal', P: lr.P, role: 'ASim1', label: 'AS(W₁)' }, true);
    }
  }
  // Long run: vertical at potential output (the reference for every step).
  add({ kind: 'vertical', Y: Ystar, role: 'LRAS', label: 'LRAS' }, school === 'classical' || step === 3 || step === 0);
  if (step > 0 && Math.abs(lr.Ystar - t0.Ystar) > 1e-6 * t0.Ystar) {
    add({ kind: 'vertical', Y: t0.Ystar, role: 'LRAS0', label: 'LRAS₀' }, false);
  }
  return out;
}

/**
 * Policy calibration ("choose ΔG so that Y stays at Y*", "choose ΔM so that E
 * does not move"): the shock value that brings `field` at `step` to `value`,
 * holding the other shocks. Bisection over the shock's range; null if out of reach.
 */
export function calibrateShock(rawParams, settings, shocks, { id, field, step, value }) {
  const def = SHOCK_DEFS.find((d) => d.id === id);
  if (!def || !def.applies(settings)) return null;
  const f = (x) => {
    const sn = buildScenario(rawParams, settings, { ...shocks, [id]: x }).snapshots[step];
    return sn.valid ? sn[field] - value : NaN;
  };
  let lo = def.min;
  let hi = def.max;
  let flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-9) return mid;
    if (fm * flo < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}
