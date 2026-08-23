import type { GarageDoor } from '../engine/types';
import { NumberField } from './Field';

let nextId = 1;

export function GarageDoorsInput({ doors, onChange }: { doors: GarageDoor[]; onChange: (doors: GarageDoor[]) => void }) {
  const update = (id: string, patch: Partial<GarageDoor>) => {
    onChange(doors.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };
  const remove = (id: string) => onChange(doors.filter((d) => d.id !== id));
  const add = () => onChange([...doors, { id: `garage-${nextId++}`, widthFt: 0, heightFt: 0 }]);

  return (
    <div className="space-y-3">
      {doors.length === 0 && <p className="text-sm text-slate-500">No garage doors added yet.</p>}
      {doors.map((d, i) => (
        <div key={d.id} className="flex items-end gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex-1">
            <NumberField label={`Door ${i + 1} width`} unit="ft" value={d.widthFt} onChange={(v) => update(d.id, { widthFt: v === '' ? 0 : v })} />
          </div>
          <div className="flex-1">
            <NumberField label={`Door ${i + 1} height`} unit="ft" value={d.heightFt} onChange={(v) => update(d.id, { heightFt: v === '' ? 0 : v })} />
          </div>
          <button
            type="button"
            onClick={() => remove(d.id)}
            className="mb-0.5 rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-400 hover:border-red-500 hover:text-red-400"
            aria-label={`Remove garage door ${i + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-dashed border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-amber-500 hover:text-amber-400"
      >
        + Add garage door
      </button>
    </div>
  );
}
