import { Line, ReferenceDot, ReferenceLine, Scatter } from 'recharts';
import { HORIZON_COLORS, STEP_KEYS } from '../theme.js';
import { labelAnchor } from '../../engine/index.js';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Axes carry no numbers: the diagrams are qualitative, as in class and in the exams. */
export const TICK = { fill: '#5B6577', fontSize: 11, fontFamily: 'Assistant, sans-serif' };
export const AXIS = {
  stroke: '#AAB2C0',
  tick: false,
  tickLine: false,
};

export const STEP_LABEL = { t0: '0', sr: '1', mr: '2', lr: '3' };

/**
 * Chart card. The caption has a fixed height so that charts placed side by side
 * have plot areas at exactly the same vertical position; together with equal
 * heights, margins and axis widths this makes linked charts share their r and
 * Y axes pixel for pixel.
 */
export function ChartFrame({ title, legend, children, height = 280, note, chartId, offscale }) {
  return (
    <figure data-chart={chartId} className="flex h-full min-w-0 flex-col rounded-xl border border-rule bg-white">
      <figcaption className="flex h-[58px] flex-col justify-center gap-1 border-b border-rule px-3">
        <span className="truncate font-display text-[14px] font-bold leading-tight text-ink" title={typeof title === 'string' ? title : undefined}>
          {title}
        </span>
        <span className="flex h-4 items-center gap-x-3 overflow-hidden whitespace-nowrap text-[11px] text-muted">{legend}</span>
      </figcaption>
      <div dir="ltr" className="graph-paper px-1 pb-1 pt-2" style={{ height }}>
        {children}
      </div>
      {offscale && (
        <p className="border-t border-rule bg-[#FFF7ED] px-3 py-1 text-[11px] leading-5 text-[#9A3412]">
          נקודה חלולה בקצה הגרף = הערך יצא מטווח הצירים. הצירים קבועים כדי שאפשר יהיה להשוות בין טווחים; הקטינו את הזעזוע כדי לראות אותה.
        </p>
      )}
      {note && <p className="border-t border-rule px-3 py-1.5 text-[11px] leading-5 text-muted">{note}</p>}
    </figure>
  );
}

/** Shared plot geometry for linked charts (identical margins and axis width). */
export const LINKED_MARGIN = { top: 14, right: 22, bottom: 14, left: 0 };
export const Y_AXIS_WIDTH = 42;

/**
 * Dashed guide through the current equilibrium. A horizontal guide (y) links
 * the money market to IS-LM through r; a vertical guide (x) links IS-LM to
 * AD-AS through Y.
 */
export function guideLine({ id, x, y, color, label, labelPosition }) {
  if (!Number.isFinite(x ?? y)) return null;
  return (
    <ReferenceLine
      key={id}
      x={x}
      y={y}
      stroke={color}
      strokeWidth={1.4}
      strokeDasharray="6 4"
      strokeOpacity={0.85}
      ifOverflow="hidden"
      label={
        label
          ? {
              value: label,
              position: labelPosition || (x != null ? 'insideBottomLeft' : 'insideTopRight'),
              fill: color,
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: '"STIX Two Text", "Cambria Math", serif',
            }
          : undefined
      }
    />
  );
}

export function LegendItem({ color, label, dashed = false }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="18" height="6" aria-hidden>
        <line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2.5" strokeDasharray={dashed ? '4 3' : undefined} />
      </svg>
      <span dir="ltr">{label}</span>
    </span>
  );
}

/** A curve rendered as a Recharts Line with its own data. */
export function curveLine({ id, data, color, ghost = false, width = 2.5, dash, animate = true }) {
  return (
    <Line
      key={id}
      data={data}
      dataKey="y"
      type="linear"
      stroke={color}
      strokeWidth={ghost ? 1.75 : width}
      strokeOpacity={ghost ? 0.45 : 1}
      strokeDasharray={ghost ? '6 4' : dash}
      dot={false}
      activeDot={false}
      isAnimationActive={animate && !ghost && !prefersReducedMotion()}
      animationDuration={550}
      legendType="none"
    />
  );
}

/** Text label placed at the right-most visible point of a curve. */
export function curveLabel({ id, points, xdom, ydom, text, color, ghost = false, position = 'top', fromEnd = true, at }) {
  // `at` (0..1) anchors the label part-way along the visible part of the curve,
  // which keeps it clear of the axes; otherwise the visible end point is used.
  let p;
  if (at != null) {
    const vis = points.filter((q) => q.x >= xdom[0] && q.x <= xdom[1] && q.y >= ydom[0] && q.y <= ydom[1]);
    p = vis.length ? vis[Math.round(at * (vis.length - 1))] : null;
  } else p = labelAnchor(points, xdom, ydom, fromEnd);
  if (!p) return null;
  return (
    <ReferenceDot
      key={id}
      x={p.x}
      y={p.y}
      r={0}
      ifOverflow="hidden"
      label={{
        value: text,
        position,
        fill: color,
        fillOpacity: ghost ? 0.6 : 1,
        fontSize: ghost ? 11 : 13,
        fontWeight: 700,
        fontFamily: '"STIX Two Text", "Cambria Math", serif',
      }}
    />
  );
}

/** Equilibrium points for each visited horizon, plus a dashed trail between them. */
export function equilibriumMarks({ points: raw, idPrefix, xdom, ydom }) {
  // Axes are fixed, so an extreme scenario can put a point off the plot. Pin it
  // to the edge and draw it hollow so the student sees it is off-scale.
  const pin = (v, dom) => (dom && Number.isFinite(v) ? Math.min(dom[1], Math.max(dom[0], v)) : v);
  const points = raw.map((p) => {
    const x = pin(p.x, xdom);
    const y = pin(p.y, ydom);
    return x === p.x && y === p.y ? p : { ...p, x, y, clipped: true };
  });
  const marks = [];
  if (points.length > 1) {
    marks.push(
      <Line
        key={`${idPrefix}-trail`}
        data={points}
        dataKey="y"
        stroke="#8A93A3"
        strokeWidth={1.25}
        strokeDasharray="3 3"
        dot={false}
        activeDot={false}
        isAnimationActive={false}
        legendType="none"
      />,
    );
  }
  marks.push(
    <Scatter
      key={`${idPrefix}-pts`}
      data={points}
      isAnimationActive={false}
      shape={(props) => {
        const { cx, cy, payload } = props;
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
        const color = HORIZON_COLORS[payload.key];
        const current = payload.current;
        if (payload.clipped) {
          return (
            <g>
              <circle cx={cx} cy={cy} r={current ? 7 : 5.5} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="2.5 1.5" />
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={current ? 9 : 8} fontWeight={700} fill={color}>
                {STEP_LABEL[payload.key]}
              </text>
            </g>
          );
        }
        return (
          <g>
            {current && <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.15} />}
            <circle cx={cx} cy={cy} r={current ? 7 : 5.5} fill={color} stroke="#fff" strokeWidth={1.5} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={current ? 9 : 8} fontWeight={700} fill="#fff">
              {STEP_LABEL[payload.key]}
            </text>
          </g>
        );
      }}
    />,
  );
  return marks;
}

export const visitedPoints = (snapshots, step, xKey, yKey) =>
  snapshots.slice(0, step + 1).map((s, i) => ({
    x: s[xKey],
    y: s[yKey],
    key: STEP_KEYS[i],
    current: i === step,
  }));

export const tickFmt = (d) => (v) => (Math.abs(v) < 1e-9 ? '0' : Number(v).toFixed(d));

/** True when any visited point lies outside the fixed axes. */
export function isOffscale(points, xdom, ydom) {
  return points.some(
    (p) => (Number.isFinite(p.x) && (p.x < xdom[0] || p.x > xdom[1])) || (Number.isFinite(p.y) && (p.y < ydom[0] || p.y > ydom[1])),
  );
}
