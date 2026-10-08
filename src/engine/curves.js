/**
 * Curve generators. Every function returns plain {x, y} points so the
 * presentation layer never needs to know the model equations.
 */
import { CAL } from './constants.js';
import { demand, kappaOf, isLarge, spending, phiOf } from './model.js';

const N = 41;
const linspace = (a, b, n = N) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

function coefs(params, settings) {
  const open = settings.economy === 'open';
  return { open, m: open ? params.m : 0, n: open ? params.n : 0, phi: open ? phiOf(params) : 0 };
}

/**
 * IS: r as a function of Y, for given real exchange rate eps.
 * In a two-economy world home exports depend on foreign spending, so the curve
 * is drawn holding foreign output at its equilibrium value Yf.
 */
export function isCurve(params, settings, exo, eps, Ydom, Yf) {
  const S = spending(params, exo);
  const vertical = (Y) => [
    { x: Y, y: -50 },
    { x: Y, y: 50 },
  ];
  if (isLarge(settings)) {
    const { m, n } = params;
    const ms = m / exo.sigma;
    const Sf = spending(params, exo.F, exo.sigma);
    const Ee = exo.Ee || 0;
    const s = 1 - (1 - m) * S.mps;
    const top = (1 - m) * S.aut + n * (eps - 1) + ms * (Sf.aut + Sf.mps * Yf) + m * S.bt * Ee;
    if (S.bt === 0) return vertical(top / s);
    return linspace(Ydom[0], Ydom[1]).map((Y) => ({ x: Y, y: (top - s * Y) / S.bt }));
  }
  const { m, n, phi } = coefs(params, settings);
  const X = settings.economy === 'open' ? exo.x0 + n * (eps - 1) + phi * exo.aStar : 0;
  const s = 1 - (1 - m) * S.mps;
  const top = (1 - m) * S.aut + X;
  // b = 0 (investment independent of i): IS is vertical.
  if (S.bt === 0) return vertical(top / s);
  return linspace(Ydom[0], Ydom[1]).map((Y) => ({ x: Y, y: (top - s * Y) / ((1 - m) * S.bt) }));
}

/** LM: r as a function of Y for given real balances. ZLB floor in the closed economy. */
export function lmCurve(params, settings, exo, MP, Ydom) {
  const { k, h } = params;
  if (params.flatLM) {
    // Money demand perfectly elastic in i: LM is flat at the going rate.
    return [
      { x: Ydom[0], y: CAL.rStar },
      { x: Ydom[1], y: CAL.rStar },
    ];
  }
  const floor = settings.economy === 'closed';
  return linspace(Ydom[0], Ydom[1]).map((Y) => {
    const r = (exo.L0 + k * Y - MP) / h;
    return { x: Y, y: floor ? Math.max(0, r) : r };
  });
}

/** BP: balance-of-payments equilibrium. Horizontal (CM line) under perfect mobility. */
export function bpCurve(params, settings, exo, eps, Ydom) {
  if (settings.economy !== 'open') return [];
  const kap = kappaOf(settings, params);
  if (kap === Infinity) {
    return [
      { x: Ydom[0], y: exo.rStar + (exo.Ee || 0) },
      { x: Ydom[1], y: exo.rStar + (exo.Ee || 0) },
    ];
  }
  const { m, n, phi } = coefs(params, settings);
  const S = spending(params, exo);
  const X = exo.x0 + n * (eps - 1) + phi * exo.aStar;
  // TB + κ(i − i* − ΔEᵉ) = 0 with TB = X − m·a.
  return linspace(Ydom[0], Ydom[1]).map((Y) => ({
    x: Y,
    y: (m * S.mps * Y - X + m * S.aut + kap * (exo.rStar + (exo.Ee || 0))) / (m * S.bt + kap),
  }));
}

/** AD: Y as a function of P (sampled along P). */
export function adCurve(params, settings, exo, Pdom) {
  const lo = Math.max(Pdom[0], 0.02);
  return linspace(lo, Pdom[1], 61)
    .map((P) => {
      const d = demand(params, settings, exo, P);
      return d.valid ? { x: d.Y, y: P } : null;
    })
    .filter(Boolean);
}

/** AS curve from a descriptor produced by the horizon solver. */
export function asCurve(desc, Pdom, Ydom) {
  if (desc.kind === 'vertical') {
    return [
      { x: desc.Y, y: Pdom[0] },
      { x: desc.Y, y: Pdom[1] },
    ];
  }
  if (desc.kind === 'horizontal') {
    return [
      { x: Ydom[0], y: desc.P },
      { x: Ydom[1], y: desc.P },
    ];
  }
  // SRAS: Y = Y* · P / Pe  ->  P = Pe · Y / Y*
  return linspace(Ydom[0], Ydom[1]).map((Y) => ({ x: Y, y: (desc.Pe * Y) / desc.Ystar }));
}

/** Money demand in (M/P, r) space for given output: r = (L0 + kY - q)/h, floored at 0. */
export function moneyDemandCurve(params, exo, Y, qdom) {
  const { k, h } = params;
  if (params.flatLM) return qdom.map((q) => ({ x: q, y: CAL.rStar }));
  return linspace(qdom[0], qdom[1]).map((q) => ({
    x: q,
    y: Math.max(0, (exo.L0 + k * Y - q) / h),
  }));
}

export function moneySupplyCurve(MP, rdom) {
  return [
    { x: MP, y: rdom[0] },
    { x: MP, y: rdom[1] },
  ];
}

/** A label anchor: the right-most point of a curve that is inside both domains. */
export function labelAnchor(points, xdom, ydom, fromEnd = true) {
  const list = fromEnd ? [...points].reverse() : points;
  return (
    list.find((p) => p.x >= xdom[0] && p.x <= xdom[1] && p.y >= ydom[0] && p.y <= ydom[1]) || null
  );
}

/**
 * Foreign economy (two-economy world), in (Y*, r*) space.
 * IS*: foreign goods market given the home output Y and the real exchange rate.
 * LM*: foreign money market, M* ÷ P* = σL0 + kY* - σh r*.
 */
export function foreignIsCurve(params, exo, eps, Y, Yfdom) {
  const { m, n } = params;
  const sig = exo.sigma;
  const ms = m / sig;
  const S = spending(params, exo);
  const Sf = spending(params, exo.F, sig);
  const Ee = exo.Ee || 0;
  const sf = 1 - (1 - ms) * S.mps;
  // Foreign goods market: Y* = (1 − m/σ)·a* − n(ε − 1) + m·a, home absorption at the home rate i = i* + ΔEᵉ.
  return linspace(Yfdom[0], Yfdom[1]).map((Yf) => ({
    x: Yf,
    y: ((1 - ms) * Sf.aut - n * (eps - 1) + m * (S.aut + S.mps * Y - S.bt * Ee) - sf * Yf) / (sig * S.bt),
  }));
}

export function foreignLmCurve(params, exo, Yfdom) {
  const { k, h } = params;
  const sig = exo.sigma;
  return linspace(Yfdom[0], Yfdom[1]).map((Yf) => ({
    x: Yf,
    y: (exo.F.L0 + k * Yf - exo.F.M / exo.Pstar) / (sig * h),
  }));
}

/**
 * Output on the IS curve at a given interest rate (Lecture 3: the multiplier
 * effect "without the LM curve", before crowding out).
 */
export function isOutputAt(params, settings, exo, eps, r, Yf) {
  const pts = isCurve(params, settings, exo, eps, [0, 4 * CAL.Ystar], Yf);
  const [a, z] = [pts[0], pts[pts.length - 1]];
  const slope = (z.y - a.y) / (z.x - a.x);
  return a.x + (r - a.y) / slope;
}

/**
 * Labor market (Lecture 4). Real wage index W/P against employment L.
 * Labor demand is the marginal product of labor, F_L = W/P. With
 * Y = A·sqrt(K·L), MPL ∝ A·sqrt(K/L); normalized so W/P = 1 at L* with A0, K0:
 *   W/P = (A/A0)·sqrt(K/K0)·sqrt(L* ÷ L)
 * Labor supply: full employment L* is given in the model (vertical).
 */
export function laborDemandCurve(exo, Ldom) {
  const a = (exo.A / CAL.A0) * Math.sqrt(exo.K / CAL.K0);
  return linspace(Math.max(Ldom[0], 1), Ldom[1]).map((L) => ({ x: L, y: a * Math.sqrt(CAL.Lstar / L) }));
}

export function laborSupplyCurve(wdom) {
  return [
    { x: CAL.Lstar, y: wdom[0] },
    { x: CAL.Lstar, y: wdom[1] },
  ];
}
