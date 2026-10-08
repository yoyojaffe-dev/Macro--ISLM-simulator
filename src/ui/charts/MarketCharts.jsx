import {
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import { moneyDemandCurve, moneySupplyCurve, regimeAt } from '../../engine/index.js';
import { SECTORS, HORIZON_COLORS, STEP_KEYS, VARS, fmt } from '../theme.js';
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

/** Money market in (M/P, r) space: real money demand vs. real money supply. */
export function MoneyMarketChart({ scenario, step, height = 280 }) {
  const { params, settings, domains, snapshots } = scenario;
  const qd = domains.q;
  const rd = domains.r;
  const base = snapshots[0];
  const cur = snapshots[step];
  const Mo = SECTORS.monetary.color;
  const dom = { xdom: qd, ydom: rd };
  const showGhost = step > 0;
  const md0 = moneyDemandCurve(params, base.exo, base.Y, qd);
  const md1 = moneyDemandCurve(params, cur.exo, cur.Y, qd);
  const ms0 = moneySupplyCurve(base.MP, rd);
  const ms1 = moneySupplyCurve(cur.MP, rd);
  const fixed = regimeAt(settings, cur) === 'fixed';
  const elements = [];
  if (showGhost) {
    elements.push(curveLine({ id: 'md0', data: md0, color: Mo, ghost: true }));
    elements.push(curveLine({ id: 'ms0', data: ms0, color: '#047857', ghost: true }));
  }
  elements.push(curveLine({ id: 'md1', data: md1, color: Mo }));
  elements.push(curveLine({ id: 'ms1', data: ms1, color: '#047857', width: 3 }));
  elements.push(curveLabel({ id: 'lmd', points: md1, ...dom, text: 'Mᵈ/P', color: Mo, position: 'left', fromEnd: false }));
  elements.push(
    curveLabel({
      id: 'lms',
      points: [{ x: cur.MP, y: rd[0] + 0.9 * (rd[1] - rd[0]) }],
      ...dom,
      text: 'Mˢ/P',
      color: '#047857',
      position: 'right',
    }),
  );
  // Horizontal guide: the same r as the IS-LM equilibrium to the right.
  elements.unshift(
    guideLine({ id: 'mm-r', y: cur.r, color: HORIZON_COLORS[STEP_KEYS[step]] }),
  );
  const visited = visitedPoints(snapshots, step, 'MP', 'r');
  const offscale = isOffscale(visited, qd, rd);
  elements.push(...equilibriumMarks({ points: visited, idPrefix: 'mm', xdom: qd, ydom: rd }));
  return (
    <ChartFrame
      offscale={offscale}
      chartId="money"
      title="שוק הכסף"
      height={height}
      legend={
        <>
          <LegendItem color={Mo} label="Mᵈ/P = L₀ + kY − hi" />
          <LegendItem color="#047857" label="Mˢ/P" />
        </>
      }
      note={
        settings.regime === 'band' && fixed
          ? 'שע״ח בקצה רצועת הניוד: היצע הכסף אנדוגני. הבנק המרכזי קונה או מוכר מט״ח כדי לשמור על הגבול.'
          : settings.regime === 'band'
            ? 'שע״ח בתוך רצועת הניוד: כמו בשע״ח נייד, M נקבע במדיניות והכסף שנוצר בהתערבות קודמת נשאר במשק.'
            : fixed
          ? 'שע״ח קבוע: היצע הכסף אנדוגני. הבנק המרכזי קונה ומוכר מט״ח כדי לשמור על השער.'
          : 'עליית Y מזיזה את הביקוש לכסף ימינה; עליית P מקטינה את ההיצע הריאלי.'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={LINKED_MARGIN}>
          <CartesianGrid stroke="#E6EAF0" />
          <XAxis
            type="number"
            dataKey="x"
            domain={qd}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'M/P', position: 'insideBottomRight', offset: -4, fill: Mo, fontWeight: 700 }}
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
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

const COMP_KEYS = ['Y', 'C', 'I', 'G', 'NX'];

function CompTick({ x, y, payload }) {
  const meta = VARS[payload.value];
  return (
    <text x={x} y={y + 14} textAnchor="middle" fontSize={13} fontWeight={700} fill={SECTORS[meta.sector].color} fontFamily='"STIX Two Text", serif'>
      Δ{meta.sym}
    </text>
  );
}

/**
 * Change in each expenditure component relative to t0, one bar per visited horizon.
 * Makes crowding out visible: ΔY = ΔC + ΔI + ΔG + ΔNX.
 */
export function CompositionChart({ scenario, step, height = 280 }) {
  const { snapshots, settings } = scenario;
  const keys = settings.economy === 'open' ? COMP_KEYS : COMP_KEYS.slice(0, 4);
  const t0 = snapshots[0];
  const data = keys.map((k) => {
    const row = { k };
    for (let i = 1; i <= step; i += 1) row[STEP_KEYS[i]] = snapshots[i][k] - t0[k];
    return row;
  });
  const vals = data.flatMap((r) => STEP_KEYS.slice(1, step + 1).map((s) => r[s]));
  const maxAbs = Math.max(10, ...vals.map((v) => Math.abs(v)));
  const lim = Math.ceil((maxAbs * 1.15) / 10) * 10;
  return (
    <ChartFrame
      chartId="comp"
      title="הרכב השינוי בתוצר לעומת מצב המוצא"
      height={height}
      legend={
        step > 0 ? (
          <>
            {STEP_KEYS.slice(1, step + 1).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HORIZON_COLORS[s] }} />
                {{ sr: 'מיידי', mr: 'קצר', lr: 'בינוני' }[s]}
              </span>
            ))}
          </>
        ) : null
      }
      note="ΔY = ΔC + ΔI + ΔG + ΔNX. כאן רואים דחיקה: מי פינה מקום למי."
    >
      {step === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted" dir="rtl">
          במצב המוצא אין עדיין שינוי. בחרו זעזוע ולחצו על &quot;התקופה הבאה&quot;.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 16, bottom: 10, left: 0 }} barCategoryGap="22%">
            <CartesianGrid stroke="#E6EAF0" vertical={false} />
            <XAxis dataKey="k" tick={<CompTick />} tickLine={false} stroke="#AAB2C0" interval={0} />
            <YAxis domain={[-lim, lim]} width={42} {...AXIS} tickFormatter={tickFmt(0)} />
            <ReferenceLine y={0} stroke="#5B6577" />
            <Tooltip
              cursor={{ fill: 'rgba(23,32,51,0.04)' }}
              formatter={(v, name) => [fmt(v, 1), { sr: 'טווח מיידי', mr: 'טווח קצר', lr: 'טווח בינוני' }[name]]}
              labelFormatter={(k) => `Δ${VARS[k].sym}`}
              contentStyle={{ fontFamily: 'Assistant, sans-serif', fontSize: 12, borderRadius: 8, direction: 'rtl' }}
            />
            {STEP_KEYS.slice(1, step + 1).map((s) => (
              <Bar key={s} dataKey={s} fill={HORIZON_COLORS[s]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
