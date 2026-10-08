import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { adCurve, asCurve, supplyCurves } from '../../engine/index.js';
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

const SCHOOL_NOTE = {
  keynesian: 'AS מיידי אופקי ב-P₀ (P ו-W קבועים); AS(W₀) עולה כש-P מתעדכן; אחרי עדכון השכר AS(W₁) עובר דרך Y* ברמת המחירים החדשה.',
  extreme: 'קיינסיאני קיצוני: AS אופקית עד שהשכר מתעדכן.',
  classical: 'קלאסי: מחירים ושכר גמישים, AS אנכית ב-Y* בכל הטווחים.',
};

export default function ADASChart({ scenario, step, height = 280, title }) {
  const { params, settings, domains, snapshots } = scenario;
  const Yd = domains.Y;
  const Pd = domains.P;
  const base = snapshots[0];
  const cur = snapshots[step];
  const D = SECTORS.real.color;
  const S = SECTORS.prices.color;
  const dom = { xdom: Yd, ydom: Pd };
  const showGhost = step > 0;

  const ad0 = adCurve(params, settings, base.exo, Pd);
  const ad1 = adCurve(params, settings, cur.exo, Pd);
  const elements = [];

  if (showGhost) elements.push(curveLine({ id: 'ad0', data: ad0, color: D, ghost: true, animate: false }));
  elements.push(curveLine({ id: 'ad1', data: ad1, color: D, animate: false }));

  // Supply side: every AS relevant to the story, the active one emphasized.
  supplyCurves(scenario, step).forEach((a) => {
    const pts = asCurve(a, Pd, Yd);
    const active = a.status === 'active';
    const vertical = a.kind === 'vertical';
    elements.push(
      curveLine({
        id: `as-${a.role}`,
        data: pts,
        color: S,
        ghost: !active,
        width: vertical && a.role !== 'SRASv' ? 1.75 : 2.75,
        dash: vertical && a.role !== 'SRASv' ? '2 3' : undefined,
        animate: false,
      }),
    );
    elements.push(
      curveLabel({
        id: `las-${a.role}`,
        points: vertical
          ? [{ x: a.Y, y: Pd[0] + 0.92 * (Pd[1] - Pd[0]) }]
          : a.kind === 'horizontal'
            ? [{ x: Yd[0] + 0.8 * (Yd[1] - Yd[0]), y: a.P }]
            : pts,
        ...dom,
        text: a.label,
        color: S,
        ghost: !active,
        position: vertical ? 'right' : 'top',
      }),
    );
  });
  elements.push(curveLabel({ id: 'lad1', points: ad1, ...dom, text: 'AD', color: D, position: 'right', at: 0.8 }));
  if (showGhost) elements.push(curveLabel({ id: 'lad0', points: ad0, ...dom, text: 'AD₀', color: D, ghost: true, position: 'left', at: 0.88 }));
  // Vertical guide: the same Y as the IS-LM equilibrium directly above.
  elements.unshift(
    guideLine({ id: 'adas-y', x: cur.Y, color: HORIZON_COLORS[STEP_KEYS[step]] }),
  );
  const visited = visitedPoints(snapshots, step, 'Y', 'P');
  const offscale = isOffscale(visited, Yd, Pd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'eq', xdom: Yd, ydom: Pd }));

  return (
    <ChartFrame
      offscale={offscale}
      chartId="adas"
      title={title || 'ביקוש מצרפי והיצע מצרפי (AD-AS)'}
      height={height}
      legend={
        <>
          <LegendItem color={D} label="AD" />
          <LegendItem color={S} label="AS בטווח הנוכחי" />
          <LegendItem color={S} label="AS בטווחים האחרים" dashed />
        </>
      }
      note={SCHOOL_NOTE[settings.school]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={LINKED_MARGIN}>
          <CartesianGrid stroke="#E6EAF0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={Yd}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'Y', position: 'insideBottomRight', offset: -4, fill: D, fontWeight: 700 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={Pd}
            allowDataOverflow
            width={Y_AXIS_WIDTH}
            {...AXIS}
            tickFormatter={tickFmt(2)}
            label={{ value: 'P', position: 'insideTopLeft', offset: 8, fill: S, fontWeight: 700 }}
          />
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
