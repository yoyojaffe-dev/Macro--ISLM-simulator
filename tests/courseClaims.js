/**
 * Directional results stated in the course material (lecture slides and the
 * official answer keys of learning centers 6-8), used by the tests to check
 * that the simulator's sign tables agree with the course in every cell the
 * material states. Shocks are directions (+1 / -1); sizes are free unless
 * `fixed` is set (the source gives them, e.g. ΔG = ΔT).
 *
 * Columns: imm0 immediate vs origin, srimm short vs immediate, sr0 short vs
 * origin, mrsr medium vs short, mr0 medium vs origin.
 * Variables: r = i, e = nominal E, eps = real e, NX = TB, reservesDelta = reserves.
 */
const C = { economy: 'closed' };
const FIX = { economy: 'open', size: 'small', regime: 'fixed' };
const FLT = { economy: 'open', size: 'small', regime: 'floating' };
const BAND = { economy: 'open', size: 'small', regime: 'band', bandStart: 'inside', bandType: 'two' };
const LARGE = { economy: 'open', size: 'large', regime: 'floating' };

export const COURSE_CLAIMS = [
  // ---------- Lectures 2-5: closed economy ----------
  { id: 'L2-p8 G at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { G: 1 }, r: { imm0: { Y: '+', r: '=' } } },
  { id: 'L2-p11 T cut at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { T: -1 }, r: { imm0: { Y: '+', r: '=' } } },
  { id: 'L2-p11 T up at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { T: 1 }, r: { imm0: { Y: '-', r: '=' } } },
  { id: 'L2-p8 balanced budget at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { G: 1, T: 1 }, fixed: true, r: { imm0: { Y: '+', r: '=', C: '=' } } },
  { id: 'L2-p11 C0 at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { C0: 1 }, r: { imm0: { Y: '+', r: '=' } } },
  { id: 'L2-p11 MPKe at fixed i', s: { ...C, assume: { flatLM: true } }, shocks: { I0: 1 }, r: { imm0: { Y: '+', r: '=' } } },
  { id: 'L3-s15 G crowding out', s: C, shocks: { G: 1 }, r: { imm0: { Y: '+', r: '+', I: '-', P: '=' } } },
  { id: 'L5-s9 G medium run', s: C, shocks: { G: 1 }, r: { mr0: { Y: '=', I: '-' } } },
  { id: 'L3-s12 M up', s: C, shocks: { M: 1 }, r: { imm0: { Y: '+', r: '-', P: '=' } } },
  {
    id: 'L5-s5 monetary expansion by horizon',
    s: C,
    shocks: { M: 1 },
    r: {
      imm0: { Y: '+', P: '=', w: '=' },
      srimm: { Y: '-', P: '+', w: '=' },
      sr0: { Y: '+', P: '+', w: '=', wP: '-', L: '+' },
      mrsr: { Y: '-', P: '+', w: '+' },
      mr0: { Y: '=', P: '+', w: '+', r: '=', MP: '=', wP: '=', L: '=', I: '=', C: '=' },
    },
  },
  { id: 'L5-s8 M down', s: C, shocks: { M: -1 }, r: { imm0: { r: '+' } } },
  { id: 'L5-s6 loss of producer confidence', s: C, shocks: { I0: -1 }, r: { imm0: { Y: '-', r: '-' } } },
  { id: 'L5-s7 liquidity trap: M ineffective', s: { ...C, assume: { flatLM: true } }, shocks: { M: 1 }, r: { imm0: { Y: '=', r: '=' } } },
  { id: 'L5-s8 liquidity trap: G effective, no crowding out', s: { ...C, assume: { flatLM: true } }, shocks: { G: 1 }, r: { imm0: { Y: '+', r: '=', I: '=' } } },
  { id: 'L5-s9 T medium run', s: C, shocks: { T: -1 }, r: { mr0: { Y: '=' } } },
  { id: 'L5-s9 C0 medium run', s: C, shocks: { C0: 1 }, r: { mr0: { Y: '=' } } },
  { id: 'L5-s9 MPKe medium run', s: C, shocks: { I0: -1 }, r: { mr0: { Y: '=' } } },
  { id: 'L4-s19 wage push', s: C, shocks: { W: 1 }, r: { sr0: { Y: '-', P: '+', r: '+', I: '-', L: '-', wP: '+' } } },
  { id: 'L5 G full medium run', s: C, shocks: { G: 1 }, r: { imm0: { C: '+' }, srimm: { Y: '-', P: '+', r: '+' }, sr0: { Y: '+', P: '+', wP: '-', L: '+' }, mr0: { Y: '=', P: '+', w: '+', r: '+', C: '=', I: '-', MP: '-', wP: '=' } } },
  { id: 'L2/L3 tax cut in IS-LM', s: C, shocks: { T: -1 }, r: { imm0: { Y: '+', r: '+', C: '+', I: '-' } } },

  // ---------- Lectures 8, 9, 12: open economy ----------
  { id: 'L8-s10 M under a peg', s: FIX, shocks: { M: 1 }, r: { imm0: { M: '=', r: '=', Y: '=', e: '=', reservesDelta: '-' }, sr0: { Y: '=', P: '=' }, mr0: { Y: '=', P: '=' } } },
  { id: 'L8-s11 G under a peg', s: FIX, shocks: { G: 1 }, r: { imm0: { Y: '+', r: '=', M: '+', e: '=', reservesDelta: '+' }, sr0: { Y: '+', P: '+' }, mrsr: { P: '+', Y: '-' }, mr0: { Y: '=', P: '+' } } },
  { id: 'L8-s14 T cut under a peg', s: FIX, shocks: { T: -1 }, r: { imm0: { Y: '+', r: '=' }, sr0: { Y: '+', P: '+' }, mrsr: { P: '+', Y: '-' }, mr0: { Y: '=', P: '+' } } },
  { id: 'L8-s16 expected depreciation under a peg', s: FIX, shocks: { Ee: 1 }, r: { imm0: { r: '+' } } },
  {
    id: 'L8-s15 unexpected devaluation',
    s: FIX,
    shocks: { e: 1 },
    r: { imm0: { e: '+', eps: '+', Y: '+', r: '=' }, srimm: { P: '+', Y: '-', eps: '-' }, sr0: { P: '+', Y: '+' }, mrsr: { w: '+', P: '+', Y: '-', eps: '-' }, mr0: { e: '+', eps: '=', P: '+', Y: '=' } },
  },
  {
    id: 'L9-s3/s8 M under a float (no expectations)',
    s: FLT,
    shocks: { M: 1 },
    r: {
      imm0: { M: '+', r: '=', Y: '+', e: '+', eps: '+', NX: '+' },
      srimm: { P: '+', Y: '-', eps: '-', MP: '-', r: '=' },
      sr0: { P: '+', Y: '+' },
      mrsr: { w: '+', P: '+', Y: '-', eps: '-', MP: '-', r: '=' },
      mr0: { Y: '=', P: '+', MP: '=', eps: '=', r: '=', e: '+' },
    },
  },
  { id: 'L9-s10 M with expected appreciation', s: FLT, shocks: { M: 1, Ee: -0.3 }, fixed: true, r: { imm0: { M: '+', r: '-', Y: '+', e: '+', eps: '+', P: '=' }, mr0: { r: '=', Y: '=', e: '+', P: '+', eps: '=', MP: '=' } } },
  { id: 'L9-s4 G under a float', s: FLT, shocks: { G: 1 }, r: { imm0: { Y: '=', r: '=', M: '=', e: '-', eps: '-', NX: '-' }, sr0: { Y: '=', P: '=' }, mr0: { Y: '=', P: '=' } } },
  { id: 'L9-s7 T cut under a float', s: FLT, shocks: { T: -1 }, r: { imm0: { Y: '=', r: '=', e: '-', eps: '-', NX: '-' }, sr0: { Y: '=', P: '=' }, mr0: { Y: '=', P: '=' } } },
  { id: 'L9-s10 expected appreciation under a float', s: FLT, shocks: { Ee: -1 }, r: { imm0: { r: '-', Y: '-', e: '-' } } },
  { id: 'L12-s4 expected depreciation under a float', s: FLT, shocks: { Ee: 1 }, r: { imm0: { r: '+' } } },
  {
    id: 'L12-s3/s4 i* up under a float',
    s: FLT,
    shocks: { rStar: 1 },
    r: { imm0: { r: '+', e: '+', eps: '+', NX: '+', Y: '+', M: '=' }, srimm: { P: '+', Y: '-' }, sr0: { P: '+', Y: '+' }, mrsr: { P: '+', Y: '-', MP: '-' }, mr0: { Y: '=', P: '+', MP: '-', r: '+' } },
  },
  { id: 'L12-s5/s6 P* under a float: insulation', s: FLT, shocks: { Pstar: 1 }, r: { imm0: { e: '-', eps: '=', Y: '=', r: '=', NX: '=' }, sr0: { Y: '=', P: '=' }, mr0: { Y: '=', P: '=' } } },
  { id: 'L12-s6 a* under a float', s: FLT, shocks: { aStar: 1 }, r: { imm0: { Y: '=', r: '=', eps: '-', e: '-' }, sr0: { Y: '=', P: '=' }, mr0: { Y: '=', P: '=' } } },
  { id: 'L12-s7 G in a large economy', s: LARGE, shocks: { G: 1 }, r: { imm0: { r: '+', rStar: '+', Y: '+', e: '-' } } },
  { id: 'L12-s8 M in a large economy', s: LARGE, shocks: { M: 1 }, r: { imm0: { r: '-', rStar: '-', Y: '+', e: '+' } } },
  { id: 'L12-s9/s10 foreign monetary expansion', s: LARGE, shocks: { Mf: 1 }, r: { imm0: { rStar: '-', r: '-', e: '-', Y: '-' } } },

  // ---------- Learning centers 6-8: official answer keys ----------
  {
    id: 'LC6 Q1 M under a float',
    s: FLT,
    shocks: { M: 1 },
    r: {
      imm0: { Y: '+', C: '+', G: '=', I: '=', M: '+', P: '=', MP: '+', w: '=', wP: '=', eps: '+', NX: '+' },
      srimm: { Y: '-', C: '-', G: '=', I: '=', M: '=', P: '+', MP: '-', w: '=', wP: '-', eps: '-', NX: '-' },
      sr0: { Y: '+', C: '+', G: '=', I: '=', M: '+', P: '+', MP: '+', w: '=', wP: '-', eps: '+', NX: '+' },
      mrsr: { Y: '-', C: '-', G: '=', I: '=', M: '=', P: '+', MP: '-', w: '+', wP: '+', eps: '-', NX: '-' },
      mr0: { Y: '=', C: '=', G: '=', I: '=', M: '+', P: '+', MP: '=', w: '+', wP: '=', eps: '=', NX: '=' },
    },
  },
  {
    id: 'LC6 Q2 i* down and G cut under a float',
    s: FLT,
    shocks: { rStar: -1, G: -1 },
    r: {
      imm0: { Y: '-', C: '-', G: '-', T: '=', I: '+', NX: '?', P: '=', MP: '=', e: '?', eps: '?', reservesDelta: '=' },
      srimm: { Y: '+', C: '+', G: '=', T: '=', I: '=', NX: '+', P: '-', MP: '+', eps: '+', reservesDelta: '=' },
      mr0: { Y: '=', C: '=', G: '-', T: '=', I: '+', NX: '?', P: '-', MP: '+', e: '?', eps: '?', reservesDelta: '=' },
    },
  },
  {
    id: 'LC7 Q2 lower band edge raised above E',
    s: BAND,
    shocks: { bandLo: 1 },
    r: {
      imm0: { Y: '+', P: '=', C: '+', r: '=', e: '+', eps: '+', NX: '+', MP: '+', w: '=', wP: '=', reservesDelta: '+' },
      srimm: { Y: '-', P: '+', C: '-', r: '=', e: '?', eps: '-', NX: '-', MP: '-', w: '=', wP: '-', reservesDelta: '?' },
      mrsr: { Y: '-', P: '+', C: '-', r: '=', e: '?', eps: '-', NX: '-', MP: '-', w: '+', wP: '+', reservesDelta: '?' },
    },
  },
  { id: 'LC8 Q1a expected depreciation', s: FLT, shocks: { Ee: 1 }, r: { imm0: { I: '-', C: '+', NX: '+', e: '+', eps: '+', reservesDelta: '=' } } },
  { id: 'LC8 Q1b expected appreciation', s: FLT, shocks: { Ee: -1 }, r: { imm0: { I: '+', C: '-', NX: '-', e: '-', eps: '-', reservesDelta: '=' } } },
];

/**
 * Learning-center 7 Q1 states as a premise that E stays inside the band; the
 * key's "=" for M and reserves in the immediate run holds only under that
 * premise. Checked separately with the sizes the question implies.
 */
export const PREMISE_CLAIMS = [
  {
    id: 'LC7 Q1 money demand falls, E stays in the band',
    s: BAND,
    shocks: { L0: -1 },
    fixed: true,
    r: {
      imm0: { Y: '+', P: '=', G: '=', I: '=', C: '+', e: '+', eps: '+', NX: '+', M: '=', MP: '=', w: '=', wP: '=', reservesDelta: '=' },
      srimm: { Y: '-', P: '+', I: '=', C: '-', eps: '-', NX: '-', MP: '-', w: '=', wP: '-' },
      mr0: { Y: '=', P: '+', I: '=', C: '=', e: '+', eps: '=', NX: '=', MP: '-', w: '+', wP: '=' },
    },
  },
];
