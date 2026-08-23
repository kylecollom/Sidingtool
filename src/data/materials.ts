// Every constant in this file comes from the "Siding Quoting Sheet" except
// where the comment says ASSUMPTION — those fill gaps the sheet left open
// (stock lengths, garage trim geometry, mounting-block mapping) with a
// reasonable industry default. Tune these as real order history comes in;
// nothing in calculate.ts should hardcode a number that belongs here.

export const WASTE = {
  standard: 0.15, // "15%"
  withDormers: 0.18, // "18% if there are dormers"
};

// ASSUMPTION: the sheet names trim widths (4", 6", 8", 2.5") but never states
// what length the boards ship in. HardieTrim boards commonly stock at 12'.
// Miratech and vinyl accessories (J-channel, starter, corner post) are
// assumed at typical stock lengths too. Adjust per your supplier's stock.
export const STOCK_LENGTH_FT = {
  hardieTrim: 12,
  miratech: 12,
  vinylAccessory: 12.5,
  vinylCornerPost: 10,
};

export const COVERAGE = {
  hardiePlankPiecesPerSquare: 15, // "15 pieces per square"
  hardiePanelPerSquare: 2.5, // "2.5 panels per square"
  battensPerPanel: 3, // "3 per panel"
  vinylD5PiecesPerSquare: 10, // "10 Pieces Per Square"
  housewrapSquaresPerRoll: 10, // "10 squares per roll"
  trimCoilBaseRolls: 2, // "2 rolls for flashing" baseline for lap
  trimCoilSquaresPerRollFallback: 12, // "When in doubt use 1 roll per 12 squares"
  vinylFasciaFtPerRoll: 100, // "1 roll per 100'" trim coil for metal-wrap fascia
};

export const CAULK_CASES = {
  lap: { low: 1, high: 2 }, // "1-2 case for Lap"
  boardAndBatten: { low: 3, high: 4 }, // "3-4 cases for B&B"
};

// ASSUMPTION: garage door trim wraps 3 sides (both sides + head) and skips
// the bottom track, for both the inner casing and the outer trim. If your
// crews trim all 4 sides, add the width back in on both perimeter figures.
export const GARAGE_TRIM_SIDES: '3-sided' | '4-sided' = '3-sided';

// ASSUMPTION: mapping of vinyl mounting-block types to the accessory counts
// the sheet's question list actually asks for. The source note was cut off
// mid-sentence ("...use dryer vents for dryer ...") so this fills the gap:
//   - Standard block  -> exterior light fixtures (removable to install around)
//   - Split block      -> hose bibs / pipes (can't be removed to install around)
//   - Electrical block -> electrical outlets
//   - Dryer vent block -> dryer vents
export const MOUNTING_BLOCK_LABELS = {
  standard: 'Standard Mounting Block (light fixtures)',
  split: 'Split Mounting Block (hose bibs / pipes)',
  electrical: 'Electrical Mounting Block (outlets)',
  dryerVent: 'Dryer Vent Mounting Block',
};
