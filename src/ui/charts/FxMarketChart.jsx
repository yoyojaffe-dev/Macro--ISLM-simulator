import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line } from 'recharts';
import { regimeAt } from '../../engine/index.js';
import { SECTORS, HORIZON_COLORS, STEP_KEYS } from '../theme.js';
import {
  AXIS,
  ChartFrame,
  LegendItem,
  curveLine,
  curveLabel,
  equilibriumMarks,
  isOffscale,
  guideLine,
  tickFmt,
  LINKED_MARGIN,
  Y_AXIS_WIDTH,
} from './chartKit.jsx';

/** Fixed axes: E around E0 = 1, quantity of foreign currency as an index around 100. */
const EDOM = [0.7, 1.3];
const QDOM = [40, 160];
const SLOPE = 100; // both curves: ΔQ = ±100·ΔE

/** Supply of foreign currency (exports, capital inflows) rises with E. */
const supplyQ = (E) => 100 + SLOPE * (E - 1);
/** Demand for foreign currency (imports, capital outflows), shifted so the market clears at eMarket. */
const demandQ = (E, eMarket) => 100 - SLOPE * (E - 1) + 2 * SLOPE * (eMarket - 1);

const curve = (fn) =>
  [EDOM[0], EDOM[1]].map((E) => ({ x: fn(E), y: E })).sort((a, b) => a.x - b.x);

/**
 * The FX market as the exam solutions draw it: E on the vertical axis, the
 * quantity of foreign currency on the horizontal axis. Pressure from the model
 * shifts the demand curve so that, without intervention, the market would
 * clear at the rate the floating solution gives. When the central bank holds
 * E (a peg, or the edge of a band), the gap between supply and demand at the
 * held rate is its purchase or sale of foreign currency.
 */
export default function FxMarketChart({ scenario, step, height = 260 }) {
  const { settings, snapshots } = scenario;
  const cur = snapshots[step];
  const t0 = snapshots[0];
  const T = SECTORS.open.color;
  const hc = HORIZON_COLORS[STEP_KEYS[step]];
  const held = regimeAt(settings, cur) === 'fixed';
  const eMarket = cur.eMarket ?? cur.e;
  const dom = { xdom: QDOM, ydom: EDOM };

  const elements = [];
  const s$ = curve(supplyQ);
  const d$0 = curve((E) => demandQ(E, t0.eMarket ?? t0.e));
  const d$ = curve((E) => demandQ(E, eMarket));
  const moved = Math.abs(eMarket - (t0.eMarket ?? t0.e)) > 1e-6;
  if (step > 0 && moved) elements.push(curveLine({ id: 'd0', data: d$0, color: T, ghost: true, animate: false }));
  elements.push(curveLine({ id: 's', data: s$, color: T, animate: false }));
  elements.push(curveLine({ id: 'd', data: d$, color: T, dash: '7 4', animate: false }));
  elements.push(curveLabel({ id: 'ls', points: s$, ...dom, text: 'S$', color: T, position: 'right', at: 0.9 }));
  elements.push(curveLabel({ id: 'ld', points: d$, ...dom, text: 'D$', color: T, position: 'right', at: 0.12 }));

  // Band edges or the peg.
  if (settings.regime === 'band') {
    for (const [id, v, label] of [
      ['blo', cur.bandLo, 'E_low'],
      ['bhi', cur.bandHi, 'E_high'],
    ]) {
      if (Number.isFinite(v) && v > EDOM[0] && v < EDOM[1]) {
        elements.push(guideLine({ id, y: v, color: '#5B6577', label, labelPosition: 'insideTopLeft' }));
      }
    }
  } else if (settings.regime === 'fixed') {
    elements.push(guideLine({ id: 'peg', y: cur.e, color: '#5B6577', label: 'Ē', labelPosition: 'insideTopLeft' }));
  }

  // Intervention: the gap at the held rate.
  let note;
  if (step > 0 && held && Math.abs(eMarket - cur.e) > 1e-6) {
    const qs = supplyQ(cur.e);
    const qd = demandQ(cur.e, eMarket);
    const buys = qs > qd;
    elements.push(
      <Line
        key="gap"
        data={[
          { x: Math.min(qs, qd), y: cur.e },
          { x: Math.max(qs, qd), y: cur.e },
        ]}
        dataKey="y"
        stroke="#B54708"
        strokeWidth={5}
        strokeOpacity={0.75}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
        legendType="none"
      />,
    );
    note = buys
      ? 'בשער שהבנק מחזיק ההיצע של מט״ח גדול מהביקוש: בלי התערבות E היה יורד. הבנק המרכזי קונה את העודף, היתרות ו-M גדלים.'
      : 'בשער שהבנק מחזיק הביקוש למט״ח גדול מההיצע: בלי התערבות E היה עולה. הבנק המרכזי מוכר מט״ח, היתרות ו-M קטנים.';
  } else if (step > 0) {
    note = moved
      ? `אין התערבות: E נקבע בשוק. ${cur.e > (t0.e ?? 1) ? 'הביקוש למט״ח גדל (פיחות).' : 'הביקוש למט״ח קטן (ייסוף).'}`
      : 'אין לחץ על שער החליפין.';
  } else {
    note = 'במוצא השוק מאוזן ב-E₀. היצע מט״ח: יצוא וכניסת הון. ביקוש למט״ח: יבוא ויציאת הון.';
  }

  const pts = snapshots.slice(0, step + 1).map((s, i) => ({ x: supplyQ(s.e), y: s.e, key: STEP_KEYS[i], current: i === step }));
  elements.unshift(guideLine({ id: 'ecur', y: cur.e, color: hc }));
  elements.push(...equilibriumMarks({ points: pts, idPrefix: 'fx', xdom: QDOM, ydom: EDOM }));

  return (
    <ChartFrame
      chartId="fx"
      title="שוק המט״ח"
      height={height}
      offscale={isOffscale(pts, QDOM, EDOM)}
      legend={
        <>
          <LegendItem color={T} label="S$ היצע מט״ח" />
          <LegendItem color={T} label="D$ ביקוש למט״ח" dashed />
          {held && step > 0 && <LegendItem color="#B54708" label="התערבות" />}
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
            domain={QDOM}
            allowDataOverflow
            {...AXIS}
            tickFormatter={tickFmt(0)}
            label={{ value: 'כמות מט״ח', position: 'insideBottomRight', offset: -4, fill: T, fontWeight: 700 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={EDOM}
            allowDataOverflow
            width={Y_AXIS_WIDTH}
            {...AXIS}
            tickFormatter={tickFmt(2)}
            label={{ value: 'E', position: 'insideTopLeft', offset: 8, fill: T, fontWeight: 700 }}
          />
          {elements}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
