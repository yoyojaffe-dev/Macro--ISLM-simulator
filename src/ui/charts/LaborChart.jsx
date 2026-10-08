import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { laborDemandCurve, laborSupplyCurve, activeAssumptions } from '../../engine/index.js';
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
  const dom = { xdom: Ld, ydom: wd };

  const ld0 = laborDemandCurve(snapshots[0].exo, Ld);
  const ld1 = laborDemandCurve(laborDemandFor(scenario, step), Ld);
  const shifted = Math.abs(ld1[0].y - ld0[0].y) > 1e-9;
  const ls = laborSupplyCurve(wd);

  const elements = [];
  if (shifted) elements.push(curveLine({ id: 'ld0', data: ld0, color: R, ghost: true, animate: false }));
  elements.push(curveLine({ id: 'ld1', data: ld1, color: R, animate: false }));
  elements.push(curveLine({ id: 'ls', data: ls, color: R, width: 1.75, dash: '2 3', animate: false }));
  elements.push(curveLabel({ id: 'lld', points: ld1, ...dom, text: 'Lᵈ = MPL', color: R, position: 'right', at: 0.08 }));
  if (shifted) elements.push(curveLabel({ id: 'lld0', points: ld0, ...dom, text: 'Lᵈ₀', color: R, ghost: true, position: 'left', at: 0.3 }));
  elements.push(
    curveLabel({ id: 'lls', points: [{ x: ls[0].x, y: wd[0] + 0.92 * (wd[1] - wd[0]) }], ...dom, text: 'L*', color: R, position: 'right' }),
  );
  const hc = HORIZON_COLORS[STEP_KEYS[step]];
  elements.unshift(guideLine({ id: 'wp', y: cur.wP, color: hc }));
  const visited = visitedPoints(snapshots, step, 'L', 'wP');
  const offscale = isOffscale(visited, Ld, wd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'lab', xdom: Ld, ydom: wd }));

  const unemployment = cur.L < 100 - 1e-6 ? 100 - cur.L : 0;
  const fixedLabor = activeAssumptions(settings).includes('fixedLabor');
  const imm = snapshots[1];
  const sg = (x) => (Math.abs(x) <= 1e-9 ? 0 : Math.sign(x));
  const dP = sg(cur.P - imm.P);
  const dwp = sg(cur.wP - imm.wP);
  const employment = unemployment > 0.05 ? ' התעסוקה מתחת ל-L*: יש אבטלה.' : cur.L > 100.05 ? ' התעסוקה מעל L*.' : '';
  const pWord = dP > 0 ? 'עלה' : dP < 0 ? 'ירד' : 'לא השתנה';
  const note =
    step === 1 && settings.school !== 'classical'
      ? 'טווח מיידי: P ו-W קבועים, והפירמות מעסיקות כמה שנדרש כדי לספק את הביקוש, ולכן הנקודה מחוץ לעקומת הביקוש לעבודה.'
      : step === 3 && cur.noEq
        ? 'אין שיווי משקל בטווח הבינוני (ראו את הדיבאגר).'
        : step === 3 || settings.school === 'classical'
          ? 'אחרי עדכון החוזים: W/P שווה לתפוקה השולית בתעסוקה מלאה L*.'
          : fixedLabor
            ? `הביקוש לעובדים קבוע: התעסוקה נשארת L*. P ${pWord}, ולכן ${dwp > 0 ? 'W/P עלה' : dwp < 0 ? 'W/P ירד' : 'W/P לא השתנה'}.`
            : Math.abs(cur.w - imm.w) > 1e-9
              ? `החוזים החדשים נכנסו לתוקף: W ${cur.w > imm.w ? 'עלה' : 'ירד'} ו-P ${pWord}. ${dwp > 0 ? 'W/P עלה, והפירמות מעסיקות פחות' : dwp < 0 ? 'W/P ירד, והפירמות מעסיקות יותר' : 'W/P לא השתנה'} לאורך Lᵈ.${employment}`
              : dP === 0
                ? 'השכר הנומינלי קבוע בחוזה ו-P לא השתנה, ולכן גם W/P והתעסוקה לא זזו.'
                : `השכר הנומינלי קבוע בחוזה: ${dP > 0 ? 'עליית P מורידה את W/P והפירמות מעסיקות יותר' : 'ירידת P מעלה את W/P והפירמות מעסיקות פחות'} לאורך Lᵈ (הרצאה 4, שקף 14).${employment}`;

  return (
    <ChartFrame
      offscale={offscale}
      chartId="labor"
      title="שוק העבודה"
      height={height}
      legend={
        <>
          <LegendItem color={R} label="Lᵈ" />
          <LegendItem color={R} label="L* (תעסוקה מלאה)" dashed />
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
