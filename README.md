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

## Assumptions made beyond the source sheet

The source sheet is described as "not complete," and several formulas
reference concepts (stock lengths, garage trim geometry, mounting-block
mapping) without stating the actual number. Every one of these is
called out with a comment at its definition, but the full list:

| Assumption | Where | Why |
|---|---|---|
| HardieTrim boards stock at 12', Miratech at 12', vinyl J-channel/starter at 12.5', vinyl corner posts at 10' | `data/materials.ts` → `STOCK_LENGTH_FT` | The sheet names trim widths but never states board length. These are typical stock lengths — adjust to match your supplier. |
| Garage trim wraps 3 sides (both legs + head), not the bottom track | `data/materials.ts` → `GARAGE_TRIM_SIDES` | Matches the sheet's own outer-trim formula ("4\" on sides, 6\" on top" — no bottom leg mentioned). Applied consistently to inner casing too. |
| Vinyl mounting-block mapping: light fixtures → Standard block, hose bibs/pipes → Split block, outlets → Electrical block, dryer vents → Dryer Vent block | `data/materials.ts` → `MOUNTING_BLOCK_LABELS` | The sheet's own sentence describing this was cut off mid-word ("...use dryer vents for dryer ..."). This fills the gap with the standard product-line logic (split blocks are for things you can't remove to install around, like a pipe). |
| Curved-window trim length is a single rep-measured linear-footage input, not derived from a formula | `JobForm.tsx` (Curved Windows field) | The sheet names the product (Miratech 16" / Flex-J) but gives no coverage formula. |
| Soffit **panel quantity** is left as a manual on-site takeoff | `calculate.ts` (Soffit section) | The sheet tells you *which* product to use (12" vs 24" Hardie, vented vs solid) but never gives a coverage rate (sq ft per panel), so a computed piece count would be fabricated. The app instead shows the soffit area and flags it "Manual takeoff." |
| Caulk is shown as the sheet's own range (1–2 cases lap / 3–4 board & batten), not collapsed to one number | `calculate.ts` (Caulk line item) | The sheet gives a range, not a formula — inventing a single number would imply false precision. |
| Trim coil (flashing) uses the sheet's stated fallback rule, "1 roll per 12 sq, minimum 2" | `calculate.ts` (`trimCoilRolls`) | The sheet's own primary rule ("depends on how many windows/doors/band boards") isn't a formula; its explicit fallback is. |
| Porch ceilings and 3-sided beams have no material formula yet | `calculate.ts` (Site Notes) | Not in the source sheet at all — flagged as a note so they aren't silently dropped from the quote, rather than guessing at a formula. |

Anything marked **"Manual takeoff"** in the app's output is one of these
open gaps — it's surfaced, not hidden, so a rep knows to measure it on
site rather than trusting a number that isn't backed by real data yet.

There's also an **Advanced → Extra trim overage** field (default 0%) if
your crews want to pad trim orders beyond what the sheet specifies —
it's off by default so the app matches the source sheet exactly out of
the box.

## Suggested next steps

- Get a few real quotes run through this side-by-side with how estimators
  quote today, and tune the constants in `data/materials.ts` (especially
  stock lengths and the garage trim assumption) against what actually
  gets ordered.
- Fill in the soffit coverage rate (sq ft per HardieSoffit/vinyl-soffit
  panel) once you have it, so soffit stops being a manual takeoff.
- Decide on real formulas (or at least a rule of thumb) for porch
  ceilings and 3-sided beams.
- If pricing ever gets added, it plugs in naturally as a second pass
  over the same `MaterialLineItem[]` output — no need to touch the
  takeoff logic.
