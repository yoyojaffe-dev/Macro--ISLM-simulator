import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { foreignIsCurve, foreignLmCurve } from '../../engine/index.js';
import { SECTORS, HORIZON_COLORS, STEP_KEYS } from '../theme.js';
import {
  AXIS,
  ChartFrame,
  LegendItem,
  curveLine,
  curveLabel,
  equilibriumMarks,
  isOffscale,
  tickFmt,
  guideLine,
  LINKED_MARGIN,
  Y_AXIS_WIDTH,
} from './chartKit.jsx';

/**
 * IS*-LM* of the foreign economy in a two-economy world (Lecture 12).
 * Same r scale as the home IS-LM, so the common world rate can be compared.
 * Curves keep the sector colors of the home diagram, drawn in teal-tinted
 * labels (IS*, LM*) to mark them as foreign.
 */
export default function ForeignChart({ scenario, step, height = 280 }) {
  const { params, domains, snapshots } = scenario;
  const Yfd = domains.Yf;
  const rd = domains.r;
  const base = snapshots[0];
  const cur = snapshots[step];
  const F = SECTORS.fiscal.color;
  const Mo = SECTORS.monetary.color;
  const O = SECTORS.open.color;
  const dom = { xdom: Yfd, ydom: rd };
  const showGhost = step > 0;

  const curves = (s) => ({
    is: foreignIsCurve(params, s.exo, s.eps, s.Y, Yfd),
    lm: foreignLmCurve(params, s.exo, Yfd),
  });
  const c0 = curves(base);
  const c1 = curves(cur);
  const elements = [];
  if (showGhost) {
    elements.push(curveLine({ id: 'fis0', data: c0.is, color: F, ghost: true }));
    elements.push(curveLine({ id: 'flm0', data: c0.lm, color: Mo, ghost: true }));
  }
  elements.push(curveLine({ id: 'fis1', data: c1.is, color: F }));
  elements.push(curveLine({ id: 'flm1', data: c1.lm, color: Mo }));
  elements.push(curveLabel({ id: 'lfis', points: c1.is, ...dom, text: 'IS*', color: F, position: 'top' }));
  elements.push(curveLabel({ id: 'lflm', points: c1.lm, ...dom, text: 'LM*', color: Mo, position: 'top' }));
  const hc = HORIZON_COLORS[STEP_KEYS[step]];
  elements.unshift(guideLine({ id: 'f-r', y: cur.rStar, color: hc, label: 'i*' }));
  const pts = snapshots.slice(0, step + 1).map((s, i) => ({ x: s.Yf, y: s.rStar, key: STEP_KEYS[i], current: i === step }));
  const visited = pts;
  const offscale = isOffscale(visited, Yfd, rd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'feq', xdom: Yfd, ydom: rd }));

  return (
    <ChartFrame
      offscale={offscale}
      chartId="foreign"
      title="המשק הזר (IS*-LM*)"
      height={height}
      legend={
        <>
          <LegendItem color={F} label="IS*" />
          <LegendItem color={Mo} label="LM*" />
          <LegendItem color={O} label="i* משותף" dashed />
        </>
      }
      note={`${
        Math.abs(scenario.base.sigma - 1) < 1e-9
          ? 'המשק הזר באותו גודל כמו המשק המקומי.'
          : scenario.base.sigma > 1 ? 'המשק הזר גדול מהמשק המקומי.' : 'המשק הזר קטן מהמשק המקומי.'
      } הקו המקווקו האפור בגרף IS-LM (i_closed) הוא הריבית שהייתה נקבעת אילו המשק המקומי היה סגור. Yᶠ = תוצר בחו״ל (Y* שמור לתוצר הפוטנציאלי).`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={LINKED_MARGIN}>
          <CartesianGrid stroke="#E6EAF0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={Yfd}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'Yᶠ', position: 'insideBottomRight', offset: -4, fill: O, fontWeight: 700 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={rd}
            allowDataOverflow
            width={Y_AXIS_WIDTH}
            {...AXIS}
            tickFormatter={tickFmt(1)}
            label={{ value: 'i*', position: 'insideTopLeft', offset: 8, fill: O, fontWeight: 700 }}
          />
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
