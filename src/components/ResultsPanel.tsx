import { useMemo, useState } from 'react';
import type { JobInputs, MaterialLineItem, TakeoffResult } from '../engine/types';

const SYSTEM_LABEL: Record<JobInputs['sidingSystem'], string> = {
  'hardie-lap': 'James Hardie Lap Siding',
  'hardie-board-batten': 'James Hardie Board & Batten (16" spacing)',
  'vinyl-dutch-lap': 'Vinyl Dutch Lap Siding (Royal Crest D5)',
};

const CATEGORY_ORDER = ['Siding', 'Trim', 'Weather Barrier', 'Flashing', 'Sealant', 'Soffit', 'Fascia', 'Porch Ceiling', 'Beam Wraps', 'Accessories'];

function groupByCategory(items: MaterialLineItem[]) {
  const groups = new Map<string, MaterialLineItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => ({ category: c, items: groups.get(c)! }));
}

function QuantityBadge({ item }: { item: MaterialLineItem }) {
  if (item.isManualEstimate) {
    return <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">Manual takeoff</span>;
  }
  if (item.isRange) {
    return (
      <span className="whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 text-sm font-semibold text-slate-100">
        {item.isRange.low}–{item.isRange.high} {item.unit}
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-2.5 py-1 text-sm font-semibold text-amber-400">
      {item.quantity} {item.unit}
    </span>
  );
}

export function ResultsPanel({ inputs, result }: { inputs: JobInputs; result: TakeoffResult }) {
  const [showMath, setShowMath] = useState(false);
  const groups = useMemo(() => groupByCategory(result.lineItems), [result.lineItems]);
  const manualCount = result.lineItems.filter((i) => i.isManualEstimate).length;

  if (result.lineItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
        Fill in the squares of siding to see the material list.
      </div>
    );
  }

  return (
    <div id="material-list" className="space-y-5 print:space-y-4">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Material List</h2>
          <p className="text-sm text-slate-400">{SYSTEM_LABEL[inputs.sidingSystem]}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMath((s) => !s)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500"
          >
            {showMath ? 'Hide formulas' : 'Show formulas'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Siding Material List</h1>
        <p className="text-sm">{SYSTEM_LABEL[inputs.sidingSystem]}</p>
        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
          {inputs.customerName && <div>Customer: {inputs.customerName}</div>}
          {inputs.jobAddress && <div>Address: {inputs.jobAddress}</div>}
          {inputs.repName && <div>Rep: {inputs.repName}</div>}
          <div>Date: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {manualCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300 print:border-black print:bg-white">
          {manualCount} item{manualCount > 1 ? 's' : ''} need a manual takeoff on site — the source sheet doesn't give a coverage rate for
          them yet (marked "Manual takeoff" below).
        </div>
      )}

      {groups.map((group) => (
        <div key={group.category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">{group.category}</h3>
          <ul className="space-y-2">
            {group.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-100 print:text-black">{item.name}</span>
                  <QuantityBadge item={item} />
                </div>
                {(showMath || item.isManualEstimate) && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 print:text-slate-700">{item.formulaNote}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {result.siteNotes.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">Site Notes</h3>
          <ul className="space-y-1.5">
            {result.siteNotes.map((n, i) => (
              <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400 print:border-slate-300 print:text-slate-700">
                {n.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
