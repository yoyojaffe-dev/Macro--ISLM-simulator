import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { HORIZONS } from '../../engine/index.js';
import { HORIZON_COLORS, STEP_KEYS } from '../theme.js';

const STICKY = {
  keynesian: ['שיווי משקל ארוך טווח', 'P ו-W קבועים, Y לפי הביקוש', 'P מתעדכן, W עדיין קבוע', 'W מתעדכן, Y חוזר ל-Y*'],
  extreme: ['שיווי משקל ארוך טווח', 'P ו-W קבועים, Y לפי הביקוש', 'AS אופקית: P עדיין קבוע', 'W מתעדכן, Y חוזר ל-Y*'],
  classical: ['שיווי משקל ארוך טווח', 'מחירים ושכר גמישים מיד', 'אותו שיווי משקל', 'אותו שיווי משקל'],
};

export default function Timeline({ step, dispatch, school, hasShock }) {
  const sticky = STICKY[school];
  const nextColor = step < 3 ? HORIZON_COLORS[STEP_KEYS[step + 1]] : '#9AA3B2';
  const canNext = step < 3 && (step > 0 || hasShock);
  return (
    <section className="rounded-xl border border-rule bg-white px-4 pb-4 pt-3" aria-label="ציר הזמן">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[15px] font-bold text-ink">ציר הזמן של ההתאמה</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_STEP', step: 0 })}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-40"
          >
            <RotateCcw size={15} aria-hidden />
            להתחלה
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'PREV' })}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-rule px-2.5 py-1.5 text-sm font-semibold text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink disabled:opacity-40"
          >
            <ChevronRight size={16} aria-hidden />
            תקופה קודמת
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'NEXT' })}
            disabled={!canNext}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink enabled:hover:-translate-x-0.5 disabled:opacity-50"
            style={{ background: nextColor }}
          >
            {step < 3 ? `התקופה הבאה: ${HORIZONS[step + 1].label}` : 'הגעתם לטווח הבינוני'}
            <ChevronLeft size={16} aria-hidden />
          </button>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-0" aria-label="טווחי זמן">
        {HORIZONS.map((h, i) => {
          const color = HORIZON_COLORS[h.key];
          const visited = i <= step;
          const current = i === step;
          return (
            <li key={h.key} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute top-[17px] h-[3px] rounded-full transition-colors"
                  style={{
                    right: '-50%',
                    left: '50%',
                    marginLeft: 22,
                    marginRight: 22,
                    background: visited ? color : '#DCE1E8',
                  }}
                />
              )}
              <button
                type="button"
                disabled={i > step}
                onClick={() => dispatch({ type: 'SET_STEP', step: i })}
                aria-current={current ? 'step' : undefined}
                className="relative z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] font-math text-[15px] font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default"
                style={{
                  borderColor: visited ? color : '#DCE1E8',
                  background: current ? color : visited ? `${color}1A` : '#fff',
                  color: current ? '#fff' : visited ? color : '#9AA3B2',
                  boxShadow: current ? `0 0 0 5px ${color}26` : 'none',
                }}
                title={h.course}
              >
                {i === 0 ? 't₀' : i}
              </button>
              <span className="mt-2 text-[13px] font-bold" style={{ color: visited ? color : '#9AA3B2' }}>
                {h.label}
              </span>
              <span className="mt-0.5 hidden max-w-[16ch] text-[11.5px] leading-4 text-muted sm:block">{sticky[i]}</span>
            </li>
          );
        })}
      </ol>
      {!hasShock && step === 0 && (
        <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-[13px] text-muted">
          המשק בשיווי משקל. בחרו זעזוע או מדיניות בפאנל השליטה, או טענו מקרה בוחן, ואז התקדמו בזמן.
        </p>
      )}
    </section>
  );
}
