import type { JobInputs, SidingSystem } from '../engine/types';
import { NumberField, Section, SelectField, TextField, ToggleRow } from './Field';
import { GarageDoorsInput } from './GarageDoorsInput';

const SIDING_OPTIONS: { value: SidingSystem; label: string }[] = [
  { value: 'hardie-lap', label: 'James Hardie Lap Siding' },
  { value: 'hardie-board-batten', label: 'James Hardie Board & Batten (16" spacing)' },
  { value: 'vinyl-dutch-lap', label: 'Vinyl Dutch Lap Siding' },
];

export function JobForm({ inputs, set }: { inputs: JobInputs; set: <K extends keyof JobInputs>(key: K, value: JobInputs[K]) => void }) {
  const isBoardBatten = inputs.sidingSystem === 'hardie-board-batten';
  const isVinyl = inputs.sidingSystem === 'vinyl-dutch-lap';

  return (
    <div className="space-y-5">
      <Section title="Job Info" subtitle="Shows up on the printed material list. Optional.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Customer name" value={inputs.customerName} onChange={(v) => set('customerName', v)} />
          <TextField label="Job address" value={inputs.jobAddress} onChange={(v) => set('jobAddress', v)} />
          <TextField label="Rep name" value={inputs.repName} onChange={(v) => set('repName', v)} />
        </div>
      </Section>

      <Section title="House Basics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label="How many squares of siding are on the house?" unit="sq" value={inputs.squares} onChange={(v) => set('squares', v === '' ? 0 : v)} />
          <SelectField
            label="Is it 1 story or does it have a second story?"
            value={inputs.stories}
            onChange={(v) => set('stories', v as JobInputs['stories'])}
            options={[
              { value: '1', label: '1 story' },
              { value: '2+', label: '2 story or more' },
            ]}
          />
          <TextField label="What siding is currently on the house?" value={inputs.currentSiding} onChange={(v) => set('currentSiding', v)} placeholder="e.g. original wood lap" />
        </div>
        <ToggleRow label="Are there any dormers?" checked={inputs.hasDormers} onChange={(v) => set('hasDormers', v)} description="Bumps siding waste from 15% to 18%." />
        {inputs.hasDormers && (
          <NumberField label="How many dormers?" value={inputs.dormerCount} onChange={(v) => set('dormerCount', v)} />
        )}
      </Section>

      <Section title="Siding System" subtitle="Do they want vinyl or Hardie? Lap or board & batten?">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SIDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('sidingSystem', opt.value)}
              className={`rounded-xl border p-4 text-left text-sm font-medium transition ${
                inputs.sidingSystem === opt.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Core Measurements" subtitle="Linear feet, measured on site.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField label="Level starter length" unit="ft" value={inputs.levelStarterLengthFt} onChange={(v) => set('levelStarterLengthFt', v)} />
          <NumberField label="Level frieze board length" unit="ft" value={inputs.levelFriezeLengthFt} onChange={(v) => set('levelFriezeLengthFt', v)} />
          <NumberField label="Sloped frieze board length" unit="ft" value={inputs.slopedFriezeLengthFt} onChange={(v) => set('slopedFriezeLengthFt', v)} />
          <NumberField label="Outside corner length" unit="ft" value={inputs.outsideCornerLengthFt} onChange={(v) => set('outsideCornerLengthFt', v)} />
          <NumberField label="Inside corner length" unit="ft" value={inputs.insideCornerLengthFt} onChange={(v) => set('insideCornerLengthFt', v)} />
        </div>
      </Section>

      {isBoardBatten && (
        <Section title="Tall Walls" subtitle="Board & batten only — any wall over 10' needs a middle band board to transition between panels.">
          <ToggleRow label="Is there a wall taller than 10'?" checked={inputs.hasWallOver10Ft} onChange={(v) => set('hasWallOver10Ft', v)} />
          {inputs.hasWallOver10Ft && (
            <NumberField label="Middle band board length" unit="ft" value={inputs.middleBandBoardLengthFt} onChange={(v) => set('middleBandBoardLengthFt', v)} />
          )}
        </Section>
      )}

      <Section
        title="Windows & Doors"
        subtitle="Openings perimeter is always needed — it drives the J-channel/trim that terminates the siding at every opening, whether or not they're also getting new wraps."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField label="Total perimeter of the openings" unit="ft" value={inputs.openingsTotalPerimeterFt} onChange={(v) => set('openingsTotalPerimeterFt', v)} />
          <NumberField label="How many windows?" value={inputs.windowCount} onChange={(v) => set('windowCount', v)} />
          <NumberField label="How many doors?" value={inputs.doorCount} onChange={(v) => set('doorCount', v)} />
        </div>
        <ToggleRow
          label="Do they want new window and/or door wraps?"
          checked={inputs.wantsWindowDoorWraps}
          onChange={(v) => set('wantsWindowDoorWraps', v)}
          description="No dedicated wrap material is modeled yet — this just flags it as a note for the crew."
        />
        <ToggleRow label="Are there any curved windows?" checked={inputs.hasCurvedWindows} onChange={(v) => set('hasCurvedWindows', v)} />
        {inputs.hasCurvedWindows && (
          <NumberField
            label="Total curved window trim length"
            unit="ft"
            value={inputs.curvedWindowTrimLengthFt}
            onChange={(v) => set('curvedWindowTrimLengthFt', v)}
          />
        )}
      </Section>

      <Section title="Garage">
        <ToggleRow label="Is there a garage?" checked={inputs.hasGarage} onChange={(v) => set('hasGarage', v)} />
        {inputs.hasGarage && <GarageDoorsInput doors={inputs.garageDoors} onChange={(d) => set('garageDoors', d)} />}
      </Section>

      <Section title="Soffit & Fascia" subtitle="Soffit and fascia material can differ from the wall siding — ask separately.">
        <ToggleRow label="Do they want new soffit?" checked={inputs.wantsNewSoffit} onChange={(v) => set('wantsNewSoffit', v)} />
        {inputs.wantsNewSoffit && (
          <>
            <SelectField
              label="Vinyl or Hardie soffit?"
              value={inputs.soffitMaterial}
              onChange={(v) => set('soffitMaterial', v as JobInputs['soffitMaterial'])}
              options={[
                { value: 'hardie', label: 'Hardie soffit' },
                { value: 'vinyl', label: 'Vinyl soffit' },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField label="Soffit depth" unit="in" value={inputs.soffitDepthIn} onChange={(v) => set('soffitDepthIn', v)} />
              <NumberField label="Eave length" unit="ft" value={inputs.eaveLengthFt} onChange={(v) => set('eaveLengthFt', v)} />
              <NumberField label="Rake length" unit="ft" value={inputs.rakeLengthFt} onChange={(v) => set('rakeLengthFt', v)} />
            </div>
          </>
        )}
        <ToggleRow label="Do they want new fascia?" checked={inputs.wantsNewFascia} onChange={(v) => set('wantsNewFascia', v)} />
        {inputs.wantsNewFascia && (
          <>
            <SelectField
              label="Metal wrap or Hardie fascia?"
              value={inputs.fasciaMaterial}
              onChange={(v) => set('fasciaMaterial', v as JobInputs['fasciaMaterial'])}
              options={[
                { value: 'hardie', label: 'Hardie fascia' },
                { value: 'metal-wrap', label: 'Metal wrap fascia' },
              ]}
            />
            <NumberField label="Fascia length" unit="ft" value={inputs.fasciaLengthFt} onChange={(v) => set('fasciaLengthFt', v)} />
          </>
        )}
      </Section>

      {isVinyl && (
        <Section title="Mounting Blocks" subtitle="Vinyl siding needs premade mounting blocks around anything mounted to the wall.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField label="How many exterior light fixtures?" value={inputs.exteriorLightFixtureCount} onChange={(v) => set('exteriorLightFixtureCount', v)} />
            <NumberField label="How many electrical outlets?" value={inputs.electricalOutletCount} onChange={(v) => set('electricalOutletCount', v)} />
            <NumberField label="How many house bibs and/or pipes?" value={inputs.hoseBibPipeCount} onChange={(v) => set('hoseBibPipeCount', v)} />
            <NumberField label="How many dryer vents?" value={inputs.dryerVentCount} onChange={(v) => set('dryerVentCount', v)} />
          </div>
        </Section>
      )}

      <Section title="Porch Ceiling">
        <ToggleRow label="Are there any porch ceilings?" checked={inputs.hasPorchCeilings} onChange={(v) => set('hasPorchCeilings', v)} />
        {inputs.hasPorchCeilings && (
          <>
            <SelectField
              label="Porch ceiling material"
              value={inputs.porchCeilingMaterial}
              onChange={(v) => set('porchCeilingMaterial', v as JobInputs['porchCeilingMaterial'])}
              options={[
                { value: 'vinyl-solid-soffit', label: 'Vinyl solid soffit (most common)' },
                { value: 'other', label: 'Other — specify' },
              ]}
            />
            {inputs.porchCeilingMaterial === 'vinyl-solid-soffit' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberField label="Porch ceiling area" unit="sq ft" value={inputs.porchCeilingAreaSqFt} onChange={(v) => set('porchCeilingAreaSqFt', v)} />
                <NumberField label="Porch ceiling perimeter (for J-channel)" unit="ft" value={inputs.porchCeilingPerimeterFt} onChange={(v) => set('porchCeilingPerimeterFt', v)} />
              </div>
            ) : (
              <TextField
                label="What material do they want?"
                value={inputs.porchCeilingOtherMaterial}
                onChange={(v) => set('porchCeilingOtherMaterial', v)}
                placeholder="e.g. beadboard, tongue & groove"
              />
            )}
          </>
        )}
      </Section>

      <Section title="3-Sided Beams">
        <ToggleRow label="Are there any 3-sided beams?" checked={inputs.hasThreeSidedBeams} onChange={(v) => set('hasThreeSidedBeams', v)} />
        {inputs.hasThreeSidedBeams && (
          <>
            <SelectField
              label="Beam wrap material"
              value={inputs.beamMaterial}
              onChange={(v) => set('beamMaterial', v as JobInputs['beamMaterial'])}
              options={[
                { value: 'metal-trim-coil', label: 'Metal trim coil' },
                { value: 'hardie-trim', label: 'HardieTrim board' },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inputs.beamMaterial === 'hardie-trim' && (
                <SelectField
                  label="HardieTrim width"
                  value={inputs.beamHardieTrimWidth}
                  onChange={(v) => set('beamHardieTrimWidth', v as JobInputs['beamHardieTrimWidth'])}
                  options={[
                    { value: '4', label: '4"' },
                    { value: '6', label: '6"' },
                    { value: '8', label: '8"' },
                  ]}
                />
              )}
              <NumberField label="Total beam length" unit="ft" value={inputs.beamTotalLengthFt} onChange={(v) => set('beamTotalLengthFt', v)} />
            </div>
          </>
        )}
      </Section>

      <Section title="Advanced" subtitle="Extra overage on top of trim linear footage, if your crews like buying a buffer. Defaults to 0%, matching the source sheet exactly." tone="muted">
        <NumberField label="Extra trim overage" unit="%" value={inputs.extraTrimOveragePct} onChange={(v) => set('extraTrimOveragePct', v === '' ? 0 : v)} />
      </Section>
    </div>
  );
}
