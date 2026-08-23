import { useMemo, useState } from 'react';
import { JobForm } from './components/JobForm';
import { ResultsPanel } from './components/ResultsPanel';
import { calculateTakeoff } from './engine/calculate';
import { emptyJobInputs, type JobInputs } from './engine/types';

function App() {
  const [inputs, setInputs] = useState<JobInputs>(emptyJobInputs());
  const [mobileTab, setMobileTab] = useState<'form' | 'results'>('form');

  const set = <K extends keyof JobInputs>(key: K, value: JobInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => calculateTakeoff(inputs), [inputs]);

  const resetAll = () => {
    if (confirm('Clear this quote and start a new one?')) setInputs(emptyJobInputs());
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-slate-100 print:bg-white print:pb-0 print:text-black">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-50">Siding Quote Calculator</h1>
            <p className="text-xs text-slate-500">Materials-list takeoff — quantities only, no pricing</p>
          </div>
          <button type="button" onClick={resetAll} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-red-500 hover:text-red-400">
            New quote
          </button>
        </div>
        <div className="flex border-t border-slate-800 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className={`flex-1 py-2.5 text-sm font-medium ${mobileTab === 'form' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-slate-500'}`}
          >
            Job Details
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('results')}
            className={`flex-1 py-2.5 text-sm font-medium ${mobileTab === 'results' ? 'border-b-2 border-amber-500 text-amber-400' : 'text-slate-500'}`}
          >
            Material List{result.lineItems.length > 0 ? ` (${result.lineItems.length})` : ''}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px] print:block">
          <div className={`print:hidden ${mobileTab === 'form' ? 'block' : 'hidden sm:block'}`}>
            <JobForm inputs={inputs} set={set} />
          </div>
          <div className={mobileTab === 'results' ? 'block' : 'hidden sm:block print:block'}>
            <div className="lg:sticky lg:top-24 print:static">
              <ResultsPanel inputs={inputs} result={result} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
