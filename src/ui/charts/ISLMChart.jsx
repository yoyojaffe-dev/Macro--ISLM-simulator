import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Scatter, Line } from 'recharts';
import { isCurve, lmCurve, bpCurve, kappaOf, isOutputAt } from '../../engine/index.js';
import { SECTORS, HORIZON_COLORS, STEP_KEYS } from '../theme.js';
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

export default function ISLMChart({ scenario, step, height = 280, title }) {
  const { params, settings, domains, snapshots } = scenario;
  const Yd = domains.Y;
  const rd = domains.r;
  const base = snapshots[0];
  const cur = snapshots[step];
  const open = settings.economy === 'open';
  const perfect = open && kappaOf(settings, params) === Infinity;
  const bpName = 'CM'; // the course's name for the capital-mobility line (Lectures 8, 10, 12)

  const curves = (s) => ({
    is: isCurve(params, settings, s.exo, s.eps, Yd, s.Yf),
    lm: lmCurve(params, settings, s.exo, s.MP, Yd),
    bp: bpCurve(params, settings, s.exo, s.eps, Yd),
  });
  const c0 = curves(base);
  const c1 = curves(cur);
  const showGhost = step > 0;
  const F = SECTORS.fiscal.color;
  const Mo = SECTORS.monetary.color;
  const O = SECTORS.open.color;
  const dom = { xdom: Yd, ydom: rd };

  const large = settings.economy === 'open' && settings.size === 'large';
  const elements = [];
  // Lecture 12: in a large economy the new world rate lies between the old rate
  // and the rate the economy would reach if it were closed (r_closed; i_closed in the slides).
  if (large && settings.regime === 'floating' && showGhost && Math.abs(cur.rClosed - cur.r) > 0.02) {
    elements.push(
      guideLine({ id: 'rclosed', y: cur.rClosed, color: '#5B6577', label: 'i_closed', labelPosition: 'insideBottomRight' }),
    );
  }
  if (showGhost) {
    elements.push(curveLine({ id: 'is0', data: c0.is, color: F, ghost: true }));
    elements.push(curveLine({ id: 'lm0', data: c0.lm, color: Mo, ghost: true }));
    if (open) elements.push(curveLine({ id: 'bp0', data: c0.bp, color: O, ghost: true }));
  }
  elements.push(curveLine({ id: 'is1', data: c1.is, color: F }));
  elements.push(curveLine({ id: 'lm1', data: c1.lm, color: Mo }));
  if (open) elements.push(curveLine({ id: 'bp1', data: c1.bp, color: O, width: 2.25 }));
  if (showGhost) {
    elements.push(curveLabel({ id: 'lis0', points: c0.is, ...dom, text: 'IS₀', color: F, ghost: true, position: 'left' }));
    elements.push(curveLabel({ id: 'llm0', points: c0.lm, ...dom, text: 'LM₀', color: Mo, ghost: true, position: 'left' }));
  }
  elements.push(curveLabel({ id: 'lis1', points: c1.is, ...dom, text: 'IS', color: F, position: 'top' }));
  elements.push(curveLabel({ id: 'llm1', points: c1.lm, ...dom, text: 'LM', color: Mo, position: 'top' }));
  if (open) elements.push(curveLabel({ id: 'lbp1', points: c1.bp, ...dom, text: bpName, color: O, position: 'bottom' }));
  // Guides to the neighbouring charts: r continues left into the money market,
  // Y continues down into AD-AS.
  const hc = HORIZON_COLORS[STEP_KEYS[step]];
  elements.unshift(
    guideLine({ id: 'islm-r', y: cur.r, color: hc }),
    guideLine({ id: 'islm-y', x: cur.Y, color: hc }),
  );
  // Lecture 3: output if the interest rate stayed put (no LM, no crowding out) vs. the IS-LM outcome.
  let fixedR = null;
  if (!open && step === 1 && !cur.zlb) {
    const Yfix = isOutputAt(params, settings, cur.exo, cur.eps, base.r, cur.Yf);
    if (Number.isFinite(Yfix) && Math.abs(Yfix - base.Y) > 1 && Math.abs(Yfix - cur.Y) > 1) fixedR = { x: Yfix, y: base.r };
  }
  if (fixedR) {
    elements.push(
      <Line
        key="fixed-r-path"
        data={[{ x: base.Y, y: base.r }, fixedR]}
        dataKey="y"
        stroke={F}
        strokeWidth={1.5}
        strokeDasharray="2 3"
        dot={false}
        activeDot={false}
        isAnimationActive={false}
        legendType="none"
      />,
      <Scatter
        key="fixed-r-pt"
        data={[fixedR]}
        isAnimationActive={false}
        shape={({ cx, cy }) => (Number.isFinite(cx) ? <circle cx={cx} cy={cy} r={5.5} fill="#fff" stroke={F} strokeWidth={2} /> : <g />)}
      />,
    );
  }
  const visited = visitedPoints(snapshots, step, 'Y', 'r');
  const offscale = isOffscale(visited, Yd, rd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'eq', xdom: Yd, ydom: rd }));

  return (
    <ChartFrame
      offscale={offscale}
      chartId="islm"
      title={title || (open ? `שוק הסחורות, הכסף ומאזן התשלומים (IS-LM-${bpName})` : 'שוק הסחורות ושוק הכסף (IS-LM)')}
      height={height}
      legend={
        <>
          <LegendItem color={F} label="IS" />
          <LegendItem color={Mo} label="LM" />
          {open && <LegendItem color={O} label={bpName} />}
          {showGhost && <LegendItem color="#8A93A3" label="t₀" dashed />}
          {fixedR && (
            <span className="inline-flex items-center gap-1">
              <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="4" fill="#fff" stroke={F} strokeWidth="2" />
              </svg>
              בריבית קבועה
            </span>
          )}
        </>
      }
      note={
        large
          ? `שתי כלכלות: CM אופקית בריבית העולמית i*${cur.Ee ? ' + ΔEᵉ' : ''}, שנקבעת יחד עם המשק הזר.`
          : open && perfect
          ? `ניידות הון מלאה: ${bpName} אופקית ב-i = i*${cur.Ee ? ' + ΔEᵉ' : ''}.`
          : open && settings.mobility === 'none'
            ? 'ללא ניידות הון: CM היא המקום שבו TB = 0 (הרחבה, לא בהרצאות).'
            : cur.zlb
              ? 'רצפת אפס: LM אופקית ב-i = 0 (מלכודת נזילות).'
              : fixedR
                ? 'הנקודה החלולה: לאן התוצר היה מגיע בריבית קבועה (המכפיל המלא). עם LM הוא מגיע פחות רחוק: ההפרש הוא הדחיקה (הרצאה 3).'
                : null
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={LINKED_MARGIN}>
          <CartesianGrid stroke="#E6EAF0" strokeDasharray="0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={Yd}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'Y', position: 'insideBottomRight', offset: -4, fill: SECTORS.real.color, fontWeight: 700 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={rd}
            allowDataOverflow
            width={Y_AXIS_WIDTH}
            {...AXIS}
            tickFormatter={tickFmt(1)}
            label={{ value: 'i', position: 'insideTopLeft', offset: 8, fill: Mo, fontWeight: 700 }}
          />
          {rd[0] < 0 && <ReferenceLine y={0} stroke="#AAB2C0" />}
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
