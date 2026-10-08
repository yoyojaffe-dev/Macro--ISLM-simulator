import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { laborDemandCurve, laborSupplyCurve } from '../../engine/index.js';
import { SECTORS, HORIZON_COLORS, STEP_KEYS, fmt } from '../theme.js';
import {
  AXIS,
  ChartFrame,
  LegendItem,
  curveLine,
  curveLabel,
  equilibriumMarks,
  isOffscale,
  visitedPoints,
  tickFmt,
  guideLine,
  LINKED_MARGIN,
  Y_AXIS_WIDTH,
} from './chartKit.jsx';

/**
 * Labor market (Lecture 4, slides 12-14): real wage W/P against employment L.
 * While the nominal-wage contract runs, employment is read off the labor demand
 * curve of the contract (A0, K0); once wages are renegotiated (long run) the
 * demand curve reflects the current A and K. In the immediate run P and W are
 * both fixed and firms hire whatever output demand requires, so the point sits
 * off the demand curve.
 */
export function laborDemandFor(scenario, step) {
  const { snapshots, settings } = scenario;
  const flexible = step > 0 && (settings.school === 'classical' || step === 3);
  return flexible ? snapshots[3].exo : snapshots[0].exo;
}

export default function LaborChart({ scenario, step, height = 280 }) {
  const { domains, snapshots, settings } = scenario;
  const Ld = domains.L;
  const wd = domains.wP;
  const cur = snapshots[step];
  const R = SECTORS.prices.color;
  const D = SECTORS.real.color;
  const dom = { xdom: Ld, ydom: wd };

  const ld0 = laborDemandCurve(snapshots[0].exo, Ld);
  const ld1 = laborDemandCurve(laborDemandFor(scenario, step), Ld);
  const shifted = Math.abs(ld1[0].y - ld0[0].y) > 1e-9;
  const ls = laborSupplyCurve(wd);

  const elements = [];
  if (shifted) elements.push(curveLine({ id: 'ld0', data: ld0, color: R, ghost: true, animate: false }));
  elements.push(curveLine({ id: 'ld1', data: ld1, color: R, animate: false }));
  elements.push(curveLine({ id: 'ls', data: ls, color: D, width: 1.75, dash: '2 3', animate: false }));
  elements.push(curveLabel({ id: 'lld', points: ld1, ...dom, text: 'Lᵈ = MPL', color: R, position: 'right', at: 0.08 }));
  if (shifted) elements.push(curveLabel({ id: 'lld0', points: ld0, ...dom, text: 'Lᵈ₀', color: R, ghost: true, position: 'left', at: 0.3 }));
  elements.push(
    curveLabel({ id: 'lls', points: [{ x: ls[0].x, y: wd[0] + 0.92 * (wd[1] - wd[0]) }], ...dom, text: 'L*', color: D, position: 'right' }),
  );
  const hc = HORIZON_COLORS[STEP_KEYS[step]];
  elements.unshift(guideLine({ id: 'wp', y: cur.wP, color: hc }));
  const visited = visitedPoints(snapshots, step, 'L', 'wP');
  const offscale = isOffscale(visited, Ld, wd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'lab', xdom: Ld, ydom: wd }));

  const unemployment = cur.L < 100 - 1e-6 ? 100 - cur.L : 0;
  const note =
    step === 1 && settings.school !== 'classical'
      ? 'טווח מיידי: P ו-W קבועים, והפירמות מעסיקות כמה שנדרש כדי לספק את הביקוש, ולכן הנקודה מחוץ לעקומת הביקוש לעבודה.'
      : step === 3 || settings.school === 'classical'
        ? 'אחרי עדכון החוזים: W/P שווה לתפוקה השולית בתעסוקה מלאה L*.'
        : Math.abs(cur.w - snapshots[1].w) > 1e-9
          ? `החוזים החדשים נכנסו לתוקף: ${cur.w > snapshots[1].w ? 'W עלה יותר מ-P, ולכן W/P עלה והפירמות מעסיקות פחות' : 'W ירד יותר מ-P, ולכן W/P ירד והפירמות מעסיקות יותר'} לאורך Lᵈ.${unemployment > 0.05 ? ' התעסוקה מתחת ל-L*: יש אבטלה.' : ''}`
          : `השכר הנומינלי קבוע בחוזה: ${cur.P >= snapshots[1].P ? 'עליית P מורידה את W/P והפירמות מעסיקות יותר' : 'ירידת P מעלה את W/P והפירמות מעסיקות פחות'} לאורך Lᵈ (הרצאה 4, שקף 14).${unemployment > 0.05 ? ' התעסוקה מתחת ל-L*: יש אבטלה.' : cur.L > 100.05 ? ' התעסוקה מעל L*.' : ''}`;

  return (
    <ChartFrame
      offscale={offscale}
      chartId="labor"
      title="שוק העבודה"
      height={height}
      legend={
        <>
          <LegendItem color={R} label="Lᵈ" />
          <LegendItem color={D} label="L* (תעסוקה מלאה)" dashed />
        </>
      }
      note={note}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={LINKED_MARGIN}>
          <CartesianGrid stroke="#E6EAF0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={Ld}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'L', position: 'insideBottomRight', offset: -4, fill: R, fontWeight: 700 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={wd}
            allowDataOverflow
            width={Y_AXIS_WIDTH}
            {...AXIS}
            tickFormatter={tickFmt(2)}
            label={{ value: 'W/P', position: 'insideTopLeft', offset: 8, fill: R, fontWeight: 700 }}
          />
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
