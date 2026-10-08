import { BookOpen, X, Lightbulb, ExternalLink } from 'lucide-react';
import { CASES, HORIZONS, CASE_ARTICLES } from '../../engine/index.js';
import { HORIZON_COLORS } from '../theme.js';
import { RichText } from './primitives.jsx';

const KIND = {
  he: { label: 'עברית', bg: '#E9EEF9', fg: '#1E3A8A' },
  event: { label: 'English: האירוע', bg: '#E4F3F4', fg: '#0E7C86' },
  hindsight: { label: 'English: במבט לאחור', bg: '#F3EEFF', fg: '#7C3AED' },
};

/** Further reading for a case: two Hebrew articles, then the event and hindsight pieces in English. */
export function ArticleList({ caseId, defaultOpen = false }) {
  const data = CASE_ARTICLES[caseId];
  if (!data) return null;
  return (
    <details className="group mt-3 rounded-lg border border-rule" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[13px] font-bold text-ink hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={14} className="text-muted" aria-hidden />
          לקריאה נוספת ({data.articles.length})
        </span>
        <span className="text-[11px] font-normal text-muted group-open:hidden">הצגה</span>
        <span className="hidden text-[11px] font-normal text-muted group-open:inline">הסתרה</span>
      </summary>
      <div className="border-t border-rule px-3 py-2">
        {data.anchor && <p className="mb-2 text-[12px] leading-5 text-muted">{data.anchor}</p>}
        <ul className="space-y-2.5">
          {data.articles.map((a) => {
            const k = KIND[a.kind];
            return (
              <li key={a.url} className="text-[13px] leading-5">
                <span className="mb-0.5 inline-block rounded px-1.5 py-px text-[10.5px] font-bold" style={{ background: k.bg, color: k.fg }}>
                  {k.label}
                </span>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir={a.lang === 'en' ? 'ltr' : 'rtl'}
                  className={`block font-semibold text-ink underline decoration-[#AAB2C0] underline-offset-2 hover:decoration-ink ${a.lang === 'en' ? 'text-left' : ''}`}
                >
                  {a.title}
                  <ExternalLink size={11} className="mx-1 inline align-baseline text-muted" aria-label="נפתח בלשונית חדשה" />
                </a>
                <span className="block text-[11.5px] text-muted" dir={a.lang === 'en' ? 'ltr' : 'rtl'} style={{ textAlign: a.lang === 'en' ? 'left' : 'right' }}>
                  {a.source}
                  {a.year ? `, ${a.year}` : ''}
                </span>
                <span className="block text-[12px] text-ink/85">{a.summary_he}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

export function CasesView({ dispatch }) {
  return (
    <div>
      <div className="mb-5 max-w-3xl">
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink">מקרי בוחן</h1>
        <p className="mt-2 text-[14.5px] leading-7 text-muted">
          כל תרחיש טוען הגדרות משק וזעזועים מוכנים לסימולטור. העוצמות מסוגננות: הן משחזרות את הסיפור האיכותי של האירוע במודל הקורס,
          לא את המספרים ההיסטוריים. עברו בין הטווחים עם &quot;התקופה הבאה&quot; ועקבו אחרי מה שכדאי לראות בכל שלב.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CASES.map((c) => (
          <li key={c.id} className="flex flex-col rounded-xl border border-rule bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-[17px] font-bold leading-snug text-ink">{c.title}</h2>
              <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-muted">{c.tag}</span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">{c.period}</p>
            <p className="mt-3 flex-1 text-[13.5px] leading-6 text-ink">
              <RichText text={c.story} />
            </p>
            <ArticleList caseId={c.id} />
            <button
              type="button"
              onClick={() => dispatch({ type: 'LOAD_CASE', id: c.id })}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13.5px] font-bold text-white hover:bg-[#2A3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <BookOpen size={15} aria-hidden />
              טען לסימולטור
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CaseBanner({ activeCase, step, dispatch }) {
  const watch = activeCase.watch.filter((w) => w.step === step);
  const color = HORIZON_COLORS[HORIZONS[step].key];
  return (
    <section className="rounded-xl border-2 bg-white p-4" style={{ borderColor: '#172033' }} aria-label="מקרה בוחן פעיל">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-muted">מקרה בוחן: {activeCase.period}</p>
          <h2 className="font-display text-[19px] font-bold text-ink">{activeCase.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'CLEAR_CASE' })}
          className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
          aria-label="סגור את מקרה הבוחן"
        >
          <X size={18} />
        </button>
      </div>
      {step === 0 ? (
        <p className="mt-2 text-[14px] leading-7 text-ink">
          <RichText text={activeCase.story} />
        </p>
      ) : watch.length ? (
        <div className="mt-2 rounded-lg px-3 py-2" style={{ background: `${color}12`, borderInlineStart: `4px solid ${color}` }}>
          <p className="text-[12px] font-bold" style={{ color }}>
            מה לראות {HORIZONS[step].inLabel}
          </p>
          {watch.map((w, i) => (
            <p key={i} className="mt-1 text-[14px] leading-7 text-ink">
              <RichText text={w.text} />
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-muted">בטווח הזה אין הערה מיוחדת. בדקו את הדיבאגר ואת טבלת המשתנים.</p>
      )}
      <ArticleList caseId={activeCase.id} />
      {step === 3 && activeCase.question && (
        <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-6 text-ink">
          <Lightbulb size={16} className="mt-1 shrink-0 text-[#B54708]" aria-hidden />
          <span>
            <span className="font-bold">שאלה לדיון: </span>
            <RichText text={activeCase.question} />
          </span>
        </p>
      )}
    </section>
  );
}
