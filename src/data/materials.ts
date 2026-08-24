// Every constant in this file comes from the "Siding Quoting Sheet" or from
// Kyle's direct answers filling gaps the sheet left open. A few (marked
// ASSUMPTION) are still placeholders because nobody has given a real number
// yet. Tune these as real order history comes in; nothing in calculate.ts
// should hardcode a number that belongs here.

export const WASTE = {
  standard: 0.15, // "15%"
  withDormers: 0.18, // "18% if there are dormers"
};

// Stock lengths, confirmed with Kyle:
//   - HardieTrim boards (4", 6", 8", 2.5" battens): 12'
//   - Miratech (curved window trim): 16'
//   - Vinyl J-Channel / Starter Strip: 12'
//   - Royal Universal corner posts (vinyl): 10'
//   - Hardie soffit panels AND vinyl soffit panels: 12'
export const STOCK_LENGTH_FT = {
  hardieTrim: 12,
  miratech: 16,
  vinylAccessory: 12,
  vinylCornerPost: 10,
  soffitPanel: 12,
};

export const COVERAGE = {
  hardiePlankPiecesPerSquare: 15, // "15 pieces per square"
  hardiePanelPerSquare: 2.5, // "2.5 panels per square"
  battensPerPanel: 3, // "3 per panel"
  vinylD5PiecesPerSquare: 10, // "10 Pieces Per Square"
  housewrapSquaresPerRoll: 10, // "10 squares per roll"
  trimCoilBaseRolls: 2, // "2 rolls for flashing" baseline for lap
  trimCoilSquaresPerRollFallback: 12, // "When in doubt use 1 roll per 12 squares"
  metalTrimCoilFtPerRoll: 100, // "1 roll per 100'" — vinyl metal-wrap fascia, linear feet
  metalTrimCoilSqFtPerRoll: 100, // Kyle: for 3-sided beam wraps, "one roll covers 100 sq ft" — area basis, not linear feet
  vinylPorchCeilingSqFtPerPiece: 10, // Kyle: vinyl solid soffit used for porch ceilings, "one piece covers 10 sq ft"
  beamWrapLengthMultiplier: 3, // Kyle: 3-sided beam wrap material = total beam length × 3
};

export const CAULK_CASES = {
  lap: { low: 1, high: 2 }, // "1-2 case for Lap"
  boardAndBatten: { low: 3, high: 4 }, // "3-4 cases for B&B"
};

// Confirmed with Kyle: garage door trim wraps 3 sides (both legs + head) and
// skips the bottom track, for both the inner casing and the outer trim.
export const GARAGE_TRIM_SIDES: '3-sided' | '4-sided' = '3-sided';

// Confirmed with Kyle: mounting-block counts are asked directly from the rep
// (how many light fixtures / outlets / hose bibs / dryer vents), one block
// per fixture — no further mapping logic needed.
export const MOUNTING_BLOCK_LABELS = {
  standard: 'Standard Mounting Block (light fixtures)',
  split: 'Split Mounting Block (hose bibs / pipes)',
  electrical: 'Electrical Mounting Block (outlets)',
  dryerVent: 'Dryer Vent Mounting Block',
};

// Confirmed with Kyle: vinyl soffit panel width covers up to 12" of depth in
// a single course; deeper soffits need two courses, so double the linear
// footage. Hardie soffit doesn't need this — it simply switches from the
// 12" to the 24" panel at the same depth threshold, still one course.
export const VINYL_SOFFIT_DEPTH_DOUBLING_THRESHOLD_IN = 12;
