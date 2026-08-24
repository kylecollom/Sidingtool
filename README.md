# Siding Quote Calculator

A field tool for sales reps: enter house measurements, pick a siding
system, and get an exact material quantity list (no pricing — see
[Scope](#scope)). Runs entirely in the browser, no backend, no saved
history — each quote is a fresh session.

Built with React + TypeScript + Vite + Tailwind CSS v4.

## Running it

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

`npm run build` outputs a static site in `dist/` — deploy it anywhere
that serves static files (Vercel, Netlify, S3, GitHub Pages, etc.).

## Scope

This was built from `Siding Quoting Sheet` (the source spreadsheet) and
covers the three siding systems it defines:

- James Hardie Lap Siding
- James Hardie Board & Batten (16" spacing)
- Vinyl Dutch Lap Siding (Royal Crest D5)

Per request, **it outputs quantities only, not pricing** — no cost data
is stored or calculated anywhere in the app. It's also **one-shot**:
nothing is saved server-side; a rep fills in a job, gets a list, and can
print/save it as a PDF (`Print / Save PDF` button) before moving on.

## How the calculation engine is organized

- `src/engine/types.ts` — the `JobInputs` data model. Field names mirror
  the intake questions from the source sheet ("How many squares of
  siding are on the house?", "What is the Outside Corner Length", etc.)
  so the form and the formulas are easy to cross-check against the
  original sheet.
- `src/data/materials.ts` — every tunable constant (waste %, stock
  lengths, coverage rates, caulk case ranges). **If a number needs to
  change, it should change here**, not inline in the calculation code.
- `src/engine/calculate.ts` — the pure calculation function
  (`calculateTakeoff`). Trim needs are aggregated by SKU (e.g. all the
  places that need HardieTrim 6" — frieze, corners, garage — are summed
  into one linear-footage total, then converted to a piece count) to
  match how these are actually ordered.
- `src/components/` — the wizard-style form (`JobForm.tsx`) and the
  results list (`ResultsPanel.tsx`).

Adding a 4th siding system means adding a data path through
`calculate.ts` — the form, results panel, and print view don't need to
change.

## Gaps in the source sheet, and how they were resolved

The source sheet is described as "not complete." Every formula below
started as an open question and was resolved directly with Kyle; each is
still called out with a comment at its definition in the code so it's
easy to find and re-tune later.

| Topic | Resolution | Where |
|---|---|---|
| HardieTrim board stock length | **12'** | `data/materials.ts` → `STOCK_LENGTH_FT.hardieTrim` |
| Miratech (curved window trim) stock length | **16'** | `STOCK_LENGTH_FT.miratech` |
| Vinyl J-Channel / Starter Strip stock length | **12'** | `STOCK_LENGTH_FT.vinylAccessory` |
| Royal Universal corner post stock length | **10'** | `STOCK_LENGTH_FT.vinylCornerPost` |
| Garage trim geometry | **3-sided** (both legs + head, no trim across the bottom track) — applies to both inner casing and outer trim | `GARAGE_TRIM_SIDES` |
| **Waste scope** | The source sheet's 15%/18% waste column only ever sits against the primary cladding row. Kyle confirmed it should also apply to: corners (outside + inside, both siding systems), J-Channel (vinyl), Starter Strip (vinyl) / the bottom-band-and-starter contribution to HardieTrim 8" (Hardie), and House Wrap (all systems). It does **not** apply to frieze, window/door opening trim, garage trim, soffit, fascia, porch ceiling, or beam wraps — those weren't named, so they're untouched. For Hardie, corners and starter had to be split out of the shared `HardieTrim 4"/6"/8"` totals (previously one combined linear-footage figure per profile) so only their portion carries the waste — everything else in that aggregate still doesn't | `pieceFromLinear`'s `wasteMult` param, `addToWithWaste()` in the Hardie trim block of `calculate.ts` |
| Vinyl mounting-block mapping | The sheet's own sentence was cut off mid-word; resolved as: the app just asks the rep directly how many of each fixture type there are (light fixtures → Standard block, hose bibs/pipes → Split block, outlets → Electrical block, dryer vents → Dryer Vent block) — no separate mapping logic needed | `MOUNTING_BLOCK_LABELS`, `JobForm.tsx` Mounting Blocks section |
| Curved window trim length | Rep measures and enters total linear feet on site — confirmed as workable | `curvedWindowTrimLengthFt` field |
| Caulk quantity | Sheet's own range shown as-is (1–2 cases lap / 3–4 board & batten) rather than collapsed to one number — confirmed, no formula wanted yet | `CAULK_CASES`, `calculate.ts` Caulk line item |
| Trim coil (flashing) | Real rule ("depends on windows/doors/band boards") not defined yet — using the sheet's stated fallback, 1 roll per 12 sq (minimum 2), until Kyle has a real formula | `trimCoilRolls()` in `calculate.ts` |
| **Soffit panel coverage** | Hardie and vinyl soffit both stock in **12' pieces**. Vinyl: a single course covers up to 12" of depth (pieces = linear ft ÷ 12'); deeper than 12" needs a second course, so linear footage is doubled before converting to pieces. Hardie: depth instead picks the panel width (12" vs. 24"), so no doubling — the wider panel covers the deeper soffit in one course | `STOCK_LENGTH_FT.soffitPanel`, `VINYL_SOFFIT_DEPTH_DOUBLING_THRESHOLD_IN`, Soffit section of `calculate.ts` |
| **Soffit & fascia material choice** | Asked directly (vinyl vs. Hardie soffit; metal wrap vs. Hardie fascia), independent of the wall siding system — a Hardie-sided house can still get vinyl soffit and vice versa. Both default to Hardie on a fresh quote | `JobInputs.soffitMaterial`, `JobInputs.fasciaMaterial`, Soffit & Fascia section of `JobForm.tsx` / `calculate.ts` |
| **Porch ceiling** | Usually vinyl solid soffit, 1 piece covers 10 sq ft, plus J-channel around the perimeter. The app asks the material (defaulting to vinyl solid soffit) since it can vary by job; picking "Other" flags it for manual takeoff instead of guessing | `COVERAGE.vinylPorchCeilingSqFtPerPiece`, Porch Ceiling section of `JobForm.tsx` / `calculate.ts` |
| **3-sided beam wraps** | Material is either metal trim coil or HardieTrim board (rep's choice + HardieTrim width if applicable); quantity = total beam length × 3 (face + 2 sides). For metal trim coil, that figure is treated as sq ft and divided by 100 sq ft/roll; for HardieTrim it's treated as linear ft and divided by the 12' stock length | `COVERAGE.beamWrapLengthMultiplier`, `COVERAGE.metalTrimCoilSqFtPerRoll`, Beam Wraps section |

### Still open

- **Fascia**: `HardieTrim 8" 3/4` for Hardie jobs is usually a special order — flagged as a note, not blocking the quote.
- If any of the resolved numbers above turn out to not match what actually gets ordered on a real job (especially the soffit-doubling assumption, which hasn't been tested against a real invoice yet), they're single constants in `data/materials.ts` — easy to correct.

There's also an **Advanced → Extra trim overage** field (default 0%) if
your crews want to pad trim orders beyond what the sheet specifies —
it's off by default so the app matches the source sheet exactly out of
the box.

## Suggested next steps

- Run a few real quotes through this side-by-side with how estimators
  quote today, especially to sanity-check the soffit and beam-wrap
  formulas above against real material orders.
- Nail down a real trim-coil (flashing) formula tied to window/door/
  band-board count, replacing the current fallback rule.
- If pricing ever gets added, it plugs in naturally as a second pass
  over the same `MaterialLineItem[]` output — no need to touch the
  takeoff logic.
