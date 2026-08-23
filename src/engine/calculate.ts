import { CAULK_CASES, COVERAGE, GARAGE_TRIM_SIDES, MOUNTING_BLOCK_LABELS, STOCK_LENGTH_FT, WASTE } from '../data/materials';
import type { JobInputs, MaterialLineItem, SiteNote, TakeoffResult } from './types';

const num = (v: number | '') => (v === '' ? 0 : v);
const ceil = (n: number) => Math.ceil(n - 1e-9); // guard against float noise like 11.9999999

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function wasteMultiplier(inputs: JobInputs) {
  return inputs.hasDormers ? 1 + WASTE.withDormers : 1 + WASTE.standard;
}

function garagePerimeters(inputs: JobInputs) {
  if (!inputs.hasGarage || inputs.garageDoors.length === 0) {
    return { sides: 0, top: 0, innerPerimeter: 0 };
  }
  let sides = 0; // sum of both vertical legs, all doors
  let top = 0; // sum of header widths, all doors
  for (const d of inputs.garageDoors) {
    const h = num(d.heightFt);
    const w = num(d.widthFt);
    sides += 2 * h;
    top += w;
  }
  const innerPerimeter = GARAGE_TRIM_SIDES === '3-sided' ? sides + top : sides + top + top; // 4-sided adds bottom (= width again)
  return { sides, top, innerPerimeter };
}

function trimCoilRolls(squares: number) {
  return Math.max(COVERAGE.trimCoilBaseRolls, ceil(squares / COVERAGE.trimCoilSquaresPerRollFallback));
}

export function calculateTakeoff(inputs: JobInputs): TakeoffResult {
  const items: MaterialLineItem[] = [];
  const notes: SiteNote[] = [];
  const overage = 1 + (inputs.extraTrimOveragePct || 0) / 100;
  const garage = garagePerimeters(inputs);

  const push = (li: MaterialLineItem) => items.push(li);

  const pieceFromLinear = (
    category: string,
    name: string,
    totalFt: number,
    stockLengthFt: number,
    breakdown: string[],
  ) => {
    if (totalFt <= 0) return;
    const withOverage = totalFt * overage;
    const pieces = ceil(withOverage / stockLengthFt);
    push({
      category,
      name,
      quantity: pieces,
      unit: 'pieces',
      formulaNote: `${breakdown.join(' + ')} = ${round1(totalFt)} ft${
        overage !== 1 ? ` (+${inputs.extraTrimOveragePct}% overage → ${round1(withOverage)} ft)` : ''
      }, ÷ ${stockLengthFt}' stock length, rounded up`,
    });
  };

  // ---------------------------------------------------------------------
  // Primary cladding + trim, by siding system
  // ---------------------------------------------------------------------
  if (inputs.sidingSystem === 'hardie-lap' || inputs.sidingSystem === 'hardie-board-batten') {
    const isLap = inputs.sidingSystem === 'hardie-lap';
    const waste = wasteMultiplier(inputs);

    // Primary cladding
    if (inputs.squares > 0 && isLap) {
      const raw = inputs.squares * COVERAGE.hardiePlankPiecesPerSquare;
      const withWaste = raw * waste;
      push({
        category: 'Siding',
        name: 'Hardie Plank 8.25" Lap Siding',
        quantity: ceil(withWaste),
        unit: 'pieces',
        formulaNote: `${inputs.squares} sq × ${COVERAGE.hardiePlankPiecesPerSquare} pieces/sq × ${
          inputs.hasDormers ? '1.18 (18% waste, dormers)' : '1.15 (15% waste)'
        } = ${round1(withWaste)}, rounded up`,
      });
    } else if (inputs.squares > 0) {
      const rawPanels = inputs.squares * COVERAGE.hardiePanelPerSquare;
      const withWaste = rawPanels * waste;
      const orderedPanels = ceil(withWaste);
      push({
        category: 'Siding',
        name: "Hardie Panel 4x10' (Board & Batten)",
        quantity: orderedPanels,
        unit: 'panels',
        formulaNote: `${inputs.squares} sq × ${COVERAGE.hardiePanelPerSquare} panels/sq × ${
          inputs.hasDormers ? '1.18 (18% waste, dormers)' : '1.15 (15% waste)'
        } = ${round1(withWaste)}, rounded up`,
      });
      const battens = orderedPanels * COVERAGE.battensPerPanel;
      push({
        category: 'Siding',
        name: 'HardieTrim 2.5" Battens (16" spacing)',
        quantity: battens,
        unit: 'pieces',
        formulaNote: `${orderedPanels} panels × ${COVERAGE.battensPerPanel} battens/panel = ${battens}`,
      });
    }

    // Aggregate trim linear footage by board width (SKU), matching how these
    // are actually purchased — one line item per profile, not per use-case.
    const trim4: string[] = [];
    const trim6: string[] = [];
    const trim8: string[] = [];
    let trim4Ft = 0;
    let trim6Ft = 0;
    let trim8Ft = 0;

    const addTo = (arr: string[], amt: number, label: string) => {
      if (amt <= 0) return;
      arr.push(`${label} (${round1(amt)}')`);
    };

    // Frieze board (level + sloped) — 6"
    const friezeFt = num(inputs.levelFriezeLengthFt) + num(inputs.slopedFriezeLengthFt);
    trim6Ft += friezeFt;
    addTo(trim6, friezeFt, 'frieze board');

    // Bottom band / starter — 8"
    trim8Ft += num(inputs.levelStarterLengthFt);
    addTo(trim8, num(inputs.levelStarterLengthFt), 'bottom band/starter');

    // Middle band board for tall walls (board & batten only) — 6"
    if (!isLap && inputs.hasWallOver10Ft) {
      trim6Ft += num(inputs.middleBandBoardLengthFt);
      addTo(trim6, num(inputs.middleBandBoardLengthFt), 'middle band board (walls > 10\')');
    }

    // Outside corners — need both 4" and 6" leg for every outside corner
    trim4Ft += num(inputs.outsideCornerLengthFt);
    trim6Ft += num(inputs.outsideCornerLengthFt);
    addTo(trim4, num(inputs.outsideCornerLengthFt), 'outside corners (4" leg)');
    addTo(trim6, num(inputs.outsideCornerLengthFt), 'outside corners (6" leg)');

    // Inside corners — 4", double length (a board on each side of the corner)
    const insideCornerNeed = num(inputs.insideCornerLengthFt) * 2;
    trim4Ft += insideCornerNeed;
    addTo(trim4, insideCornerNeed, 'inside corners (×2)');

    // Window/door trim — 4"
    if (inputs.wantsWindowDoorWraps) {
      trim4Ft += num(inputs.openingsTotalPerimeterFt);
      addTo(trim4, num(inputs.openingsTotalPerimeterFt), 'window/door openings');
    }

    // Garage trim: inner casing 8" (perimeter), outer 4" sides + 6" top
    if (inputs.hasGarage) {
      trim8Ft += garage.innerPerimeter;
      addTo(trim8, garage.innerPerimeter, 'garage inner casing');
      trim4Ft += garage.sides;
      addTo(trim4, garage.sides, 'garage outer sides');
      trim6Ft += garage.top;
      addTo(trim6, garage.top, 'garage outer top');
    }

    pieceFromLinear('Trim', 'HardieTrim 4"', trim4Ft, STOCK_LENGTH_FT.hardieTrim, trim4);
    pieceFromLinear('Trim', 'HardieTrim 6"', trim6Ft, STOCK_LENGTH_FT.hardieTrim, trim6);
    pieceFromLinear('Trim', 'HardieTrim 8"', trim8Ft, STOCK_LENGTH_FT.hardieTrim, trim8);

    // Curved windows
    if (inputs.hasCurvedWindows && num(inputs.curvedWindowTrimLengthFt) > 0) {
      pieceFromLinear('Trim', 'Miratech 16" (curved window trim)', num(inputs.curvedWindowTrimLengthFt), STOCK_LENGTH_FT.miratech, [
        'curved window trim length (rep-measured)',
      ]);
    } else if (inputs.hasCurvedWindows) {
      notes.push({ text: 'Curved windows flagged, but no trim length was entered — measure on site and add Miratech 16".' });
    }

    if (inputs.squares > 0) {
      // House wrap
      const wrapRolls = ceil(inputs.squares / COVERAGE.housewrapSquaresPerRoll);
      push({
        category: 'Weather Barrier',
        name: 'House Wrap',
        quantity: Math.max(1, wrapRolls),
        unit: 'rolls',
        formulaNote: `${inputs.squares} sq ÷ ${COVERAGE.housewrapSquaresPerRoll} sq/roll, rounded up`,
      });

      // Trim coil (flashing)
      const rolls = trimCoilRolls(inputs.squares);
      push({
        category: 'Flashing',
        name: 'Trim Coil (flashing)',
        quantity: rolls,
        unit: 'rolls',
        formulaNote: `Baseline ${COVERAGE.trimCoilBaseRolls} rolls for flashing, or 1 roll per ${COVERAGE.trimCoilSquaresPerRollFallback} sq if greater ("when in doubt") — verify against actual window/door/band-board count on site.`,
      });

      // Caulk
      const range = isLap ? CAULK_CASES.lap : CAULK_CASES.boardAndBatten;
      push({
        category: 'Sealant',
        name: 'Caulk',
        quantity: null,
        unit: 'cases',
        isRange: range,
        formulaNote: `Sheet gives a range, not a formula (${range.low}-${range.high} cases for ${isLap ? 'lap' : 'board & batten'}). Order at the low end and confirm against opening count on site.`,
      });
    }
  }

  if (inputs.sidingSystem === 'vinyl-dutch-lap') {
    const waste = wasteMultiplier(inputs);
    if (inputs.squares > 0) {
      const rawPieces = inputs.squares * COVERAGE.vinylD5PiecesPerSquare;
      const withWaste = rawPieces * waste;
      push({
        category: 'Siding',
        name: 'Royal Crest Traditional Vinyl Siding - D5 (Dutch Lap)',
        quantity: ceil(withWaste),
        unit: 'pieces',
        formulaNote: `${inputs.squares} sq × ${COVERAGE.vinylD5PiecesPerSquare} pieces/sq × ${
          inputs.hasDormers ? '1.18 (18% waste, dormers)' : '1.15 (15% waste)'
        } = ${round1(withWaste)}, rounded up`,
      });
    }

    // J-Channel: openings perimeter + frieze (level + sloped)
    const friezeFt = num(inputs.levelFriezeLengthFt) + num(inputs.slopedFriezeLengthFt);
    const jChannelBreakdown: string[] = [];
    let jChannelFt = 0;
    if (inputs.wantsWindowDoorWraps) {
      jChannelFt += num(inputs.openingsTotalPerimeterFt);
      if (num(inputs.openingsTotalPerimeterFt) > 0) jChannelBreakdown.push(`window/door openings (${round1(num(inputs.openingsTotalPerimeterFt))}')`);
    }
    jChannelFt += friezeFt;
    if (friezeFt > 0) jChannelBreakdown.push(`frieze board, level + sloped (${round1(friezeFt)}')`);
    pieceFromLinear('Trim', 'J-Channel', jChannelFt, STOCK_LENGTH_FT.vinylAccessory, jChannelBreakdown);

    // Outside corner posts
    pieceFromLinear('Trim', 'Royal Universal Outside Corner Post', num(inputs.outsideCornerLengthFt), STOCK_LENGTH_FT.vinylCornerPost, [
      'outside corner length',
    ]);
    // Inside corner posts — sheet does NOT double this one (single extruded post per corner)
    pieceFromLinear('Trim', 'Royal Universal Inside Corner Post', num(inputs.insideCornerLengthFt), STOCK_LENGTH_FT.vinylCornerPost, [
      'inside corner length',
    ]);

    // Starter strip
    pieceFromLinear('Trim', 'Starter Strip', num(inputs.levelStarterLengthFt), STOCK_LENGTH_FT.vinylAccessory, ['level starter length']);

    // Curved windows — Flex-J, white/clear only
    if (inputs.hasCurvedWindows && num(inputs.curvedWindowTrimLengthFt) > 0) {
      pieceFromLinear('Trim', 'Flex-J Channel (curved windows — white/clear only)', num(inputs.curvedWindowTrimLengthFt), STOCK_LENGTH_FT.vinylAccessory, [
        'curved window trim length (rep-measured)',
      ]);
    } else if (inputs.hasCurvedWindows) {
      notes.push({ text: 'Curved windows flagged, but no trim length was entered — measure on site and add Flex-J Channel (white/clear only).' });
    }

    // Mounting blocks
    if (num(inputs.exteriorLightFixtureCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.standard,
        quantity: num(inputs.exteriorLightFixtureCount),
        unit: 'each',
        formulaNote: '1 per exterior light fixture',
      });
    }
    if (num(inputs.hoseBibPipeCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.split,
        quantity: num(inputs.hoseBibPipeCount),
        unit: 'each',
        formulaNote: '1 per hose bib / pipe penetration',
      });
    }
    if (num(inputs.electricalOutletCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.electrical,
        quantity: num(inputs.electricalOutletCount),
        unit: 'each',
        formulaNote: '1 per exterior electrical outlet',
      });
    }
    if (num(inputs.dryerVentCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.dryerVent,
        quantity: num(inputs.dryerVentCount),
        unit: 'each',
        formulaNote: '1 per dryer vent',
      });
    }

    // House wrap
    if (inputs.squares > 0) {
      const wrapRolls = ceil(inputs.squares / COVERAGE.housewrapSquaresPerRoll);
      push({
        category: 'Weather Barrier',
        name: 'House Wrap',
        quantity: Math.max(1, wrapRolls),
        unit: 'rolls',
        formulaNote: `${inputs.squares} sq ÷ ${COVERAGE.housewrapSquaresPerRoll} sq/roll, rounded up`,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Soffit (shared, but material choice differs by system)
  // ---------------------------------------------------------------------
  if (inputs.wantsNewSoffit) {
    const eave = num(inputs.eaveLengthFt);
    const rake = num(inputs.rakeLengthFt);
    if (inputs.sidingSystem === 'vinyl-dutch-lap') {
      const depthFt = inputs.soffitDepthIn !== '' ? Number(inputs.soffitDepthIn) / 12 : null;
      push({
        category: 'Soffit',
        name: 'Vinyl Vented Soffit (eaves)',
        quantity: null,
        unit: 'sq ft',
        isManualEstimate: true,
        formulaNote: `Eave length ${round1(eave)}'${depthFt ? ` × ${inputs.soffitDepthIn}" depth ≈ ${round1(eave * depthFt)} sq ft` : ' × soffit depth'} — panel coverage rate isn't in the source sheet; take off on site.`,
      });
      push({
        category: 'Soffit',
        name: 'Vinyl Solid Soffit (rakes)',
        quantity: null,
        unit: 'sq ft',
        isManualEstimate: true,
        formulaNote: `Rake length ${round1(rake)}'${depthFt ? ` × ${inputs.soffitDepthIn}" depth ≈ ${round1(rake * depthFt)} sq ft` : ' × soffit depth'} — panel coverage rate isn't in the source sheet; take off on site.`,
      });
      pieceFromLinear('Soffit', 'J-Channel (soffit)', eave + rake, STOCK_LENGTH_FT.vinylAccessory, ['eave + rake length']);
    } else {
      const depthFt = inputs.soffitDepthIn !== '' ? Number(inputs.soffitDepthIn) / 12 : null;
      const depthNote =
        inputs.soffitDepthIn !== '' ? (Number(inputs.soffitDepthIn) <= 12 ? 'HardieSoffit 12" (depth ≤ 12")' : 'HardieSoffit 24" (depth > 12")') : 'HardieSoffit 12" or 24" — enter soffit depth to pick the width';
      push({
        category: 'Soffit',
        name: depthNote,
        quantity: null,
        unit: 'sq ft',
        isManualEstimate: true,
        formulaNote: `Eave ${round1(eave)}' (vented) + rake ${round1(rake)}' (solid)${
          depthFt ? ` × ${inputs.soffitDepthIn}" depth ≈ ${round1((eave + rake) * depthFt)} sq ft` : ''
        } — panel coverage rate isn't in the source sheet; take off on site. Budget extra 2x4 bracing for soffit weight.`,
      });
      notes.push({ text: 'Soffit: verify extra 2x4 bracing is priced in — Hardie soffit is heavy.' });
    }
  }

  // ---------------------------------------------------------------------
  // Fascia (shared, material differs by system)
  // ---------------------------------------------------------------------
  if (inputs.wantsNewFascia) {
    const len = num(inputs.fasciaLengthFt);
    if (inputs.sidingSystem === 'vinyl-dutch-lap') {
      const rolls = ceil(len / COVERAGE.vinylFasciaFtPerRoll);
      push({
        category: 'Fascia',
        name: 'Trim Coil (metal-wrap fascia)',
        quantity: rolls,
        unit: 'rolls',
        formulaNote: `${round1(len)} ft ÷ ${COVERAGE.vinylFasciaFtPerRoll} ft/roll, rounded up`,
      });
    } else {
      pieceFromLinear('Fascia', 'HardieTrim 8" 3/4 (fascia)', len, STOCK_LENGTH_FT.hardieTrim, ['fascia length']);
      notes.push({ text: 'Fascia: HardieTrim 8" 3/4 is usually a special order, not a stock item — confirm lead time.' });
    }
  }

  // ---------------------------------------------------------------------
  // Site notes — no formula in the source sheet, flag for manual takeoff
  // ---------------------------------------------------------------------
  if (inputs.hasPorchCeilings) {
    notes.push({ text: 'Porch ceiling(s) present — no material formula defined yet; take off beadboard/soffit material on site.' });
  }
  if (inputs.hasThreeSidedBeams) {
    notes.push({ text: '3-sided beam(s) present — no material formula defined yet; take off wrap material on site.' });
  }
  if (inputs.currentSiding) {
    notes.push({ text: `Existing siding on house: ${inputs.currentSiding}${inputs.stories === '2+' ? ' — 2-story, confirm lift/staging needs' : ''}.` });
  }

  return { lineItems: items, siteNotes: notes };
}
