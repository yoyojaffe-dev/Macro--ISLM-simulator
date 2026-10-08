import { Workflow, Bug, Siren, ShieldAlert, Info } from 'lucide-react';
import { HORIZONS } from '../../engine/index.js';
import { HORIZON_COLORS, SECTORS } from '../theme.js';
import { RichText } from './primitives.jsx';

const PRESSURE = new Set(['rp', 'Md', 'KF']);

function ChainNode({ node }) {
  const color = SECTORS[node.sector]?.color || '#172033';
  const pressure = PRESSURE.has(node.key) || node.pressure;
  const unknown = node.dir === '?';
  const dirCh = unknown ? '?' : node.dir > 0 ? '↑' : node.dir < 0 ? '↓' : '=';
  return (
    <div role="listitem" className="flex flex-col items-center">
      <span
        className={`flex min-w-[52px] items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-1 font-math text-[17px] font-bold leading-none ${
          node.dir !== 0 ? 'chain-active' : ''
        }`}
        style={{
          color,
          borderColor: pressure ? `${color}80` : color,
          borderStyle: pressure ? 'dashed' : 'solid',
          background: node.dir === 0 ? '#fff' : `${color}10`,
          '--glow': color,
        }}
        title={pressure ? 'לחץ (שינוי שמתקזז בשיווי משקל)' : undefined}
      >
        <span dir="ltr">{node.sym}</span>
        <span style={{ color: unknown ? '#B54708' : node.dir === 0 ? '#5B6577' : color }} title={unknown ? 'תלוי בגודל השינויים או בשיפועים' : undefined}>
          {dirCh}
        </span>
      </span>
      {node.note && (
        <span dir="rtl" className="mt-1 max-w-[11ch] text-center text-[10.5px] leading-[13px] text-muted">
          {node.note}
        </span>
      )}
    </div>
  );
}

function Chain({ chain }) {
  const hColor = HORIZON_COLORS[chain.horizon];
  return (
    <div className="rounded-lg border border-rule p-3" style={{ borderInlineStartWidth: 4, borderInlineStartColor: hColor }}>
      <h3 className="text-[13px] font-bold text-ink">{chain.title}</h3>
      <div dir="ltr" role="list" className="mt-2 flex flex-wrap items-start gap-y-2" aria-label={chain.title}>
        {chain.nodes.map((n, i) => (
          <div key={`${n.key}-${i}`} className="flex items-start">
            {i > 0 && (
              <span aria-hidden className="mx-1 mt-1.5 text-[16px] font-bold" style={{ color: hColor }}>
                →
              </span>
            )}
            <ChainNode node={n} />
          </div>
        ))}
      </div>
      {chain.note && (
        <p className="mt-2 text-[12px] leading-5 text-muted">
          <RichText text={chain.note} />
        </p>
      )}
    </div>
  );
}

export function TransmissionPanel({ chains, step }) {
  const h = HORIZONS[step];
  const color = HORIZON_COLORS[h.key];
  return (
    <section className="rounded-xl border border-rule bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <Workflow size={16} className="text-muted" aria-hidden />
          מנגנון התמסורת
        </h2>
        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ background: color }}>
          {h.label}
        </span>
      </header>
      <div className="space-y-3 p-4">
        {chains.length === 0 ? (
          <p className="text-[13px] leading-6 text-muted">
            כאן תופיע שרשרת ההשפעות בכל טווח, למשל{' '}
            <RichText text="{G}↑ → {Y}↑ → {Md}↑ → {r}↑ → {I}↓" />. מסגרת מקווקוות מסמנת לחץ שמתקזז בשיווי המשקל.
          </p>
        ) : (
          chains.map((c) => <Chain key={c.id} chain={c} />)
        )}
      </div>
    </section>
  );
}

const LEVEL = {
  error: { icon: Siren, color: '#B42318', bg: '#FEF3F2', label: 'מגבלה תאורטית' },
  warning: { icon: ShieldAlert, color: '#B54708', bg: '#FFFAEB', label: 'שימו לב' },
  info: { icon: Info, color: '#1E3A8A', bg: '#EEF2FB', label: 'מושג' },
};

export function AlertCard({ alert, compact = false, onClose }) {
  const L = LEVEL[alert.level];
  const Icon = L.icon;
  return (
    <article className="rounded-lg border p-3" style={{ borderColor: `${L.color}40`, background: L.bg }} role={alert.level === 'error' ? 'alert' : 'status'}>
      <div className="flex items-start gap-2">
        <Icon size={17} style={{ color: L.color }} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-bold" style={{ color: L.color }}>
            {alert.title}
          </h3>
          <p className={`mt-1 text-[12.5px] leading-5 text-ink ${compact ? 'line-clamp-4' : ''}`}>
            <RichText text={alert.body} />
          </p>
          {alert.ref && <p className="mt-1 text-[11px] text-muted">מקור: {alert.ref}</p>}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1 text-[16px] leading-none text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            aria-label="סגור התראה"
          >
            ×
          </button>
        )}
      </div>
    </article>
  );
}

export function DebuggerPanel({ alerts }) {
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <section id="debugger" className="rounded-xl border border-rule bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <Bug size={16} className="text-muted" aria-hidden />
          דיבאגר כלכלי
        </h2>
        <span className="text-[12px] text-muted">{alerts.length ? `${alerts.length} הערות` : 'אין הערות'}</span>
      </header>
      <div className="space-y-2 p-4">
        {sorted.length === 0 ? (
          <p className="text-[13px] leading-6 text-muted">
            הדיבאגר בודק כל צעד מול מגבלות התאוריה: מלכודת נזילות, הטרילמה, נייטרליות הכסף ועוד. כשמשהו לא יעבוד כמו שמצפים, ההסבר יופיע כאן.
          </p>
        ) : (
          sorted.map((a) => <AlertCard key={a.id} alert={a} />)
        )}
      </div>
    </section>
  );
}
