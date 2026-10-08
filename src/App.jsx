import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useSimulator } from './store/useSimulator.js';
import ControlPanel from './ui/components/ControlPanel.jsx';
import Timeline from './ui/components/Timeline.jsx';
import { TransmissionPanel, DebuggerPanel } from './ui/components/Transmission.jsx';
import EquationsPanel from './ui/components/EquationsPanel.jsx';
import VariablesTable from './ui/components/VariablesTable.jsx';
import { CasesView, CaseBanner } from './ui/components/Cases.jsx';
import QuizView from './ui/components/QuizView.jsx';
import { Header, AlertToasts, ColorKey } from './ui/components/Chrome.jsx';
import LinkedCharts from './ui/charts/LinkedCharts.jsx';
import ErrorBoundary from './ui/components/ErrorBoundary.jsx';

function SimulatorView({ sim }) {
  const { state, dispatch, scenario, chains, alerts, activeCase } = sim;
  const [controlsOpen, setControlsOpen] = useState(false);
  const step = state.step;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="min-w-0" aria-label="פאנל שליטה">
        <button
          type="button"
          onClick={() => setControlsOpen((o) => !o)}
          aria-expanded={controlsOpen}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rule bg-white px-4 py-2.5 text-[14px] font-bold text-ink lg:hidden"
        >
          <SlidersHorizontal size={16} aria-hidden />
          {controlsOpen ? 'הסתר את פאנל השליטה' : 'פאנל שליטה: זעזועים, משטר ורגישויות'}
        </button>
        <div className={`${controlsOpen ? 'block' : 'hidden'} lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pl-1`}>
          <ErrorBoundary label="פאנל השליטה">
            <ControlPanel state={state} dispatch={dispatch} />
          </ErrorBoundary>
        </div>
      </aside>
      <div className="min-w-0 space-y-4">
        {activeCase && <CaseBanner activeCase={activeCase} step={step} dispatch={dispatch} />}
        <Timeline step={step} dispatch={dispatch} school={state.settings.school} hasShock={scenario.activeShocks.length > 0} />
        <LinkedCharts scenario={scenario} step={step} dispatch={dispatch} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <ErrorBoundary label="מנגנון התמסורת" resetKey={step}>
            <TransmissionPanel chains={chains} step={step} />
          </ErrorBoundary>
          <ErrorBoundary label="דיבאגר כלכלי" resetKey={step}>
            <DebuggerPanel alerts={alerts} />
          </ErrorBoundary>
        </div>
        <ColorKey />
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <ErrorBoundary label="האלגברה של המודל" resetKey={step}>
            <EquationsPanel scenario={scenario} step={step} />
          </ErrorBoundary>
          <ErrorBoundary label="טבלת המשתנים" resetKey={step}>
            <VariablesTable scenario={scenario} step={step} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const sim = useSimulator();
  const { state, dispatch, alerts } = sim;
  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-canvas font-sans text-ink">
      <Header mode={state.mode} dispatch={dispatch} alertCount={alerts.filter((a) => a.level !== 'info').length} />
      <main className="mx-auto max-w-[1880px] px-3 py-4 sm:px-5">
        <ErrorBoundary label="המסך הראשי" resetKey={state.mode}>
          {state.mode === 'sim' && <SimulatorView sim={sim} />}
          {state.mode === 'cases' && <CasesView dispatch={dispatch} />}
          {state.mode === 'quiz' && <QuizView dispatch={dispatch} />}
        </ErrorBoundary>
      </main>
      <footer className="mx-auto max-w-[1880px] px-3 pb-6 pt-2 text-[11.5px] leading-5 text-muted sm:px-5">
        המודל מבוסס על שקפי הקורס מאקרו כלכלה א׳ ועל Sachs &amp; Larrain, פרקים 3, 12–14 ו-17. העוצמות מסוגננות לצורכי לימוד.
      </footer>
      {state.mode === 'sim' && <AlertToasts alerts={alerts} step={state.step} />}
    </div>
  );
}
