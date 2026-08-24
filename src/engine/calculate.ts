import {
  CAULK_CASES,
  COVERAGE,
  GARAGE_TRIM_SIDES,
  MOUNTING_BLOCK_LABELS,
  STOCK_LENGTH_FT,
  VINYL_SOFFIT_DEPTH_DOUBLING_THRESHOLD_IN,
  WASTE,
} from '../data/materials';
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

  // wasteMult: pass wasteMultiplier(inputs) for line items Kyle confirmed
  // should carry the 15%/18% siding waste (corners, J-channel, starter
  // strip); omit (defaults to 1, no-op) for everything else.
  const pieceFromLinear = (
    category: string,
    name: string,
    totalFt: number,
    stockLengthFt: number,
    breakdown: string[],
    wasteMult = 1,
  ) => {
    if (totalFt <= 0) return;
    const withWaste = totalFt * wasteMult;
    const withOverage = withWaste * overage;
    const pieces = ceil(withOverage / stockLengthFt);
    const wasteNote = wasteMult !== 1 ? ` (+${inputs.hasDormers ? '18% waste, dormers' : '15% waste'} → ${round1(withWaste)} ft)` : '';
    const overageNote = overage !== 1 ? ` (+${inputs.extraTrimOveragePct}% overage → ${round1(withOverage)} ft)` : '';
    push({
      category,
      name,
      quantity: pieces,
      unit: 'pieces',
      formulaNote: `${breakdown.join(' + ')} = ${round1(totalFt)} ft${wasteNote}${overageNote}, ÷ ${stockLengthFt}' stock length, rounded up`,
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
    // Kyle: corners and the bottom band/starter contribution carry the same
    // 15%/18% waste as the siding itself; everything else in this aggregate
    // (frieze, middle band, openings, garage trim) does not.
    const addToWithWaste = (arr: string[], rawAmt: number, label: string) => {
      if (rawAmt <= 0) return 0;
      const wasted = rawAmt * waste;
      arr.push(`${label} (${round1(rawAmt)}' × ${inputs.hasDormers ? '1.18, 18% waste' : '1.15, 15% waste'} = ${round1(wasted)}')`);
      return wasted;
    };

    // Frieze board (level + sloped) — 6"
    const friezeFt = num(inputs.levelFriezeLengthFt) + num(inputs.slopedFriezeLengthFt);
    trim6Ft += friezeFt;
    addTo(trim6, friezeFt, 'frieze board');

    // Bottom band / starter — 8" (waste applies)
    trim8Ft += addToWithWaste(trim8, num(inputs.levelStarterLengthFt), 'bottom band/starter');

    // Middle band board for tall walls (board & batten only) — 6"
    if (!isLap && inputs.hasWallOver10Ft) {
      trim6Ft += num(inputs.middleBandBoardLengthFt);
      addTo(trim6, num(inputs.middleBandBoardLengthFt), 'middle band board (walls > 10\')');
    }

    // Outside corners — need both 4" and 6" leg for every outside corner (waste applies)
    trim4Ft += addToWithWaste(trim4, num(inputs.outsideCornerLengthFt), 'outside corners (4" leg)');
    trim6Ft += addToWithWaste(trim6, num(inputs.outsideCornerLengthFt), 'outside corners (6" leg)');

    // Inside corners — 4", double length (a board on each side of the corner), waste applies
    trim4Ft += addToWithWaste(trim4, num(inputs.insideCornerLengthFt) * 2, 'inside corners (×2)');

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
      // House wrap (waste applies, Kyle confirmed)
      const wrappedSquares = inputs.squares * waste;
      const wrapRolls = ceil(wrappedSquares / COVERAGE.housewrapSquaresPerRoll);
      push({
        category: 'Weather Barrier',
        name: 'House Wrap',
        quantity: Math.max(1, wrapRolls),
        unit: 'rolls',
        formulaNote: `${inputs.squares} sq × ${
          inputs.hasDormers ? '1.18 (18% waste, dormers)' : '1.15 (15% waste)'
        } = ${round1(wrappedSquares)} sq, ÷ ${COVERAGE.housewrapSquaresPerRoll} sq/roll, rounded up`,
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
    // J-Channel carries waste (Kyle confirmed)
    pieceFromLinear('Trim', 'J-Channel', jChannelFt, STOCK_LENGTH_FT.vinylAccessory, jChannelBreakdown, waste);

    // Outside corner posts (waste applies)
    pieceFromLinear(
      'Trim',
      'Royal Universal Outside Corner Post',
      num(inputs.outsideCornerLengthFt),
      STOCK_LENGTH_FT.vinylCornerPost,
      ['outside corner length'],
      waste,
    );
    // Inside corner posts — sheet does NOT double this one (single extruded post per corner); waste applies
    pieceFromLinear(
      'Trim',
      'Royal Universal Inside Corner Post',
      num(inputs.insideCornerLengthFt),
      STOCK_LENGTH_FT.vinylCornerPost,
      ['inside corner length'],
      waste,
    );

    // Starter strip (waste applies)
    pieceFromLinear('Trim', 'Starter Strip', num(inputs.levelStarterLengthFt), STOCK_LENGTH_FT.vinylAccessory, ['level starter length'], waste);

    // Curved windows — Flex-J, white/clear only
    if (inputs.hasCurvedWindows && num(inputs.curvedWindowTrimLengthFt) > 0) {
      pieceFromLinear('Trim', 'Flex-J Channel (curved windows — white/clear only)', num(inputs.curvedWindowTrimLengthFt), STOCK_LENGTH_FT.vinylAccessory, [
        'curved window trim length (rep-measured)',
      ]);
    } else if (inputs.hasCurvedWindows) {
      notes.push({ text: 'Curved windows flagged, but no trim length was entered — measure on site and add Flex-J Channel (white/clear only).' });
    }

    // Mounting blocks — counts come straight from the rep, but ceil() guards
    // against a fractional entry (can't buy half a mounting block).
    if (num(inputs.exteriorLightFixtureCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.standard,
        quantity: ceil(num(inputs.exteriorLightFixtureCount)),
        unit: 'each',
        formulaNote: '1 per exterior light fixture',
      });
    }
    if (num(inputs.hoseBibPipeCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.split,
        quantity: ceil(num(inputs.hoseBibPipeCount)),
        unit: 'each',
        formulaNote: '1 per hose bib / pipe penetration',
      });
    }
    if (num(inputs.electricalOutletCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.electrical,
        quantity: ceil(num(inputs.electricalOutletCount)),
        unit: 'each',
        formulaNote: '1 per exterior electrical outlet',
      });
    }
    if (num(inputs.dryerVentCount) > 0) {
      push({
        category: 'Accessories',
        name: MOUNTING_BLOCK_LABELS.dryerVent,
        quantity: ceil(num(inputs.dryerVentCount)),
        unit: 'each',
        formulaNote: '1 per dryer vent',
      });
    }

    // House wrap (waste applies, Kyle confirmed)
    if (inputs.squares > 0) {
      const wrappedSquares = inputs.squares * waste;
      const wrapRolls = ceil(wrappedSquares / COVERAGE.housewrapSquaresPerRoll);
      push({
        category: 'Weather Barrier',
        name: 'House Wrap',
        quantity: Math.max(1, wrapRolls),
        unit: 'rolls',
        formulaNote: `${inputs.squares} sq × ${
          inputs.hasDormers ? '1.18 (18% waste, dormers)' : '1.15 (15% waste)'
        } = ${round1(wrappedSquares)} sq, ÷ ${COVERAGE.housewrapSquaresPerRoll} sq/roll, rounded up`,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Soffit — material is asked directly, independent of the wall siding
  // system (a Hardie-sided house can still get vinyl soffit, and vice versa)
  // ---------------------------------------------------------------------
  if (inputs.wantsNewSoffit) {
    const eave = num(inputs.eaveLengthFt);
    const rake = num(inputs.rakeLengthFt);
    const depthIn = inputs.soffitDepthIn === '' ? null : Number(inputs.soffitDepthIn);

    if (inputs.soffitMaterial === 'vinyl') {
      // Kyle: vinyl soffit panel covers up to 12" of depth in one course; a
      // deeper soffit needs two courses side by side, so double the footage.
      const needsDoubling = depthIn !== null && depthIn > VINYL_SOFFIT_DEPTH_DOUBLING_THRESHOLD_IN;
      const multiplier = needsDoubling ? 2 : 1;
      const depthNote = depthIn === null ? ' (enter soffit depth to confirm single vs. double course)' : needsDoubling ? ` (depth > 12", doubled for a second course)` : ' (depth ≤ 12", single course)';
      if (eave > 0) {
        const pieces = ceil((eave * multiplier) / STOCK_LENGTH_FT.soffitPanel);
        push({
          category: 'Soffit',
          name: 'Vinyl Vented Soffit (eaves)',
          quantity: pieces,
          unit: 'pieces',
          formulaNote: `Eave length ${round1(eave)}'${needsDoubling ? ' × 2' : ''} = ${round1(eave * multiplier)} ft, ÷ ${STOCK_LENGTH_FT.soffitPanel}' stock length, rounded up${depthNote}`,
        });
      }
      if (rake > 0) {
        const pieces = ceil((rake * multiplier) / STOCK_LENGTH_FT.soffitPanel);
        push({
          category: 'Soffit',
          name: 'Vinyl Solid Soffit (rakes)',
          quantity: pieces,
          unit: 'pieces',
          formulaNote: `Rake length ${round1(rake)}'${needsDoubling ? ' × 2' : ''} = ${round1(rake * multiplier)} ft, ÷ ${STOCK_LENGTH_FT.soffitPanel}' stock length, rounded up${depthNote}`,
        });
      }
      pieceFromLinear('Soffit', 'J-Channel (soffit)', eave + rake, STOCK_LENGTH_FT.vinylAccessory, ['eave + rake length']);
    } else {
      // Hardie: depth picks the panel width (12" vs 24"), not a doubled
      // course — the wider panel covers the deeper soffit in one course.
      const productLabel = depthIn === null ? 'HardieSoffit 12" or 24" — enter soffit depth to pick the width' : depthIn <= 12 ? 'HardieSoffit 12" (depth ≤ 12")' : 'HardieSoffit 24" (depth > 12")';
      if (eave > 0) {
        const pieces = ceil(eave / STOCK_LENGTH_FT.soffitPanel);
        push({
          category: 'Soffit',
          name: `${productLabel} — Vented (eaves)`,
          quantity: pieces,
          unit: 'pieces',
          formulaNote: `Eave length ${round1(eave)}' ÷ ${STOCK_LENGTH_FT.soffitPanel}' stock length, rounded up. Budget extra 2x4 bracing for soffit weight.`,
        });
      }
      if (rake > 0) {
        const pieces = ceil(rake / STOCK_LENGTH_FT.soffitPanel);
        push({
          category: 'Soffit',
          name: `${productLabel} — Solid (rakes)`,
          quantity: pieces,
          unit: 'pieces',
          formulaNote: `Rake length ${round1(rake)}' ÷ ${STOCK_LENGTH_FT.soffitPanel}' stock length, rounded up. Budget extra 2x4 bracing for soffit weight.`,
        });
      }
      notes.push({ text: 'Soffit: verify extra 2x4 bracing is priced in — Hardie soffit is heavy.' });
    }
  }

  // ---------------------------------------------------------------------
  // Fascia — material is asked directly, independent of the wall siding
  // system.
  // ---------------------------------------------------------------------
  if (inputs.wantsNewFascia) {
    const len = num(inputs.fasciaLengthFt);
    if (inputs.fasciaMaterial === 'metal-wrap') {
      const rolls = ceil(len / COVERAGE.metalTrimCoilFtPerRoll);
      push({
        category: 'Fascia',
        name: 'Trim Coil (metal-wrap fascia)',
        quantity: rolls,
        unit: 'rolls',
        formulaNote: `${round1(len)} ft ÷ ${COVERAGE.metalTrimCoilFtPerRoll} ft/roll, rounded up`,
      });
    } else {
      pieceFromLinear('Fascia', 'HardieTrim 8" 3/4 (fascia)', len, STOCK_LENGTH_FT.hardieTrim, ['fascia length']);
      notes.push({ text: 'Fascia: HardieTrim 8" 3/4 is usually a special order, not a stock item — confirm lead time.' });
    }
  }

  // ---------------------------------------------------------------------
  // Porch ceiling
  // ---------------------------------------------------------------------
  if (inputs.hasPorchCeilings) {
    const area = num(inputs.porchCeilingAreaSqFt);
    const perimeter = num(inputs.porchCeilingPerimeterFt);
    if (inputs.porchCeilingMaterial === 'vinyl-solid-soffit') {
      if (area > 0) {
        const pieces = ceil(area / COVERAGE.vinylPorchCeilingSqFtPerPiece);
        push({
          category: 'Porch Ceiling',
          name: 'Vinyl Solid Soffit (porch ceiling)',
          quantity: pieces,
          unit: 'pieces',
          formulaNote: `${round1(area)} sq ft ÷ ${COVERAGE.vinylPorchCeilingSqFtPerPiece} sq ft/piece, rounded up`,
        });
      } else {
        notes.push({ text: 'Porch ceiling: enter the ceiling area (sq ft) to calculate soffit pieces needed.' });
      }
      pieceFromLinear('Porch Ceiling', 'J-Channel (porch ceiling perimeter)', perimeter, STOCK_LENGTH_FT.vinylAccessory, ['porch ceiling perimeter']);
    } else {
      notes.push({
        text: `Porch ceiling: material is "${inputs.porchCeilingOtherMaterial || 'not specified'}" — no formula defined for this material yet; take off on site.`,
      });
    }
  }

  // ---------------------------------------------------------------------
  // 3-sided beam wraps
  // ---------------------------------------------------------------------
  if (inputs.hasThreeSidedBeams) {
    const beamLen = num(inputs.beamTotalLengthFt);
    const developedLen = beamLen * COVERAGE.beamWrapLengthMultiplier;
    if (beamLen > 0) {
      if (inputs.beamMaterial === 'metal-trim-coil') {
        const rolls = ceil(developedLen / COVERAGE.metalTrimCoilSqFtPerRoll);
        push({
          category: 'Beam Wraps',
          name: 'Trim Coil (3-sided beam wrap)',
          quantity: rolls,
          unit: 'rolls',
          formulaNote: `${round1(beamLen)} ft beam length × ${COVERAGE.beamWrapLengthMultiplier} (3 sides) = ${round1(developedLen)} sq ft, ÷ ${COVERAGE.metalTrimCoilSqFtPerRoll} sq ft/roll, rounded up`,
        });
      } else {
        pieceFromLinear(
          'Beam Wraps',
          `HardieTrim ${inputs.beamHardieTrimWidth}" (3-sided beam wrap)`,
          developedLen,
          STOCK_LENGTH_FT.hardieTrim,
          [`beam length × ${COVERAGE.beamWrapLengthMultiplier} (3 sides)`],
        );
      }
    } else {
      notes.push({ text: '3-sided beams: enter total beam length to calculate wrap material needed.' });
    }
  }
  if (inputs.currentSiding) {
    notes.push({ text: `Existing siding on house: ${inputs.currentSiding}${inputs.stories === '2+' ? ' — 2-story, confirm lift/staging needs' : ''}.` });
  }

  return { lineItems: items, siteNotes: notes };
}
