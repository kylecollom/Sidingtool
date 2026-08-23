// Core data model for a siding takeoff, built from the intake questions on
// the "Siding Quoting Sheet". Field names intentionally mirror the sheet's
// own question wording so the calculation logic in calculate.ts is easy to
// cross-check against the source.

export type SidingSystem = 'hardie-lap' | 'hardie-board-batten' | 'vinyl-dutch-lap';

export interface GarageDoor {
  id: string;
  widthFt: number;
  heightFt: number;
}

export interface JobInputs {
  // --- Job header (printout only, no calculations) ---
  customerName: string;
  jobAddress: string;
  repName: string;

  // --- Basic house info ---
  squares: number; // "How many squares of siding are on the house"
  currentSiding: string; // "What siding is currently on the house?"
  stories: '1' | '2+'; // "Is it all 1 story or does it have a second story"
  hasDormers: boolean;
  dormerCount: number | '';

  // --- Siding system ---
  sidingSystem: SidingSystem;

  // --- Core linear measurements (feet) ---
  levelStarterLengthFt: number | '';
  levelFriezeLengthFt: number | '';
  slopedFriezeLengthFt: number | '';
  outsideCornerLengthFt: number | '';
  insideCornerLengthFt: number | '';

  // --- Openings ---
  wantsWindowDoorWraps: boolean; // "Do they want new window and/or door wraps?"
  openingsTotalPerimeterFt: number | ''; // "Total Perimeter of the Openings"
  windowCount: number | '';
  doorCount: number | '';

  // --- Garage ---
  hasGarage: boolean;
  garageDoors: GarageDoor[];

  // --- Curved windows ---
  hasCurvedWindows: boolean;
  curvedWindowTrimLengthFt: number | '';

  // --- Board & batten only: tall-wall middle band board ---
  hasWallOver10Ft: boolean;
  middleBandBoardLengthFt: number | '';

  // --- Soffit ---
  wantsNewSoffit: boolean;
  soffitDepthIn: number | '';
  eaveLengthFt: number | '';
  rakeLengthFt: number | '';

  // --- Fascia ---
  wantsNewFascia: boolean;
  fasciaLengthFt: number | '';

  // --- Vinyl mounting-block accessories ---
  exteriorLightFixtureCount: number | '';
  electricalOutletCount: number | '';
  hoseBibPipeCount: number | '';
  dryerVentCount: number | '';

  // --- Site notes (no formula in source sheet, flagged for manual takeoff) ---
  hasPorchCeilings: boolean;
  hasThreeSidedBeams: boolean;

  // --- Advanced / tunable ---
  extraTrimOveragePct: number; // additional overage applied on top of trim linear footage, default 0
}

export type Unit = 'pieces' | 'panels' | 'rolls' | 'cases' | 'linear ft' | 'sq ft' | 'each';

export interface MaterialLineItem {
  category: string;
  name: string;
  quantity: number | null; // null when it's a manual-estimate-only item
  unit: Unit;
  formulaNote: string;
  isManualEstimate?: boolean;
  isRange?: { low: number; high: number };
}

export interface SiteNote {
  text: string;
}

export interface TakeoffResult {
  lineItems: MaterialLineItem[];
  siteNotes: SiteNote[];
}

export function emptyJobInputs(): JobInputs {
  return {
    customerName: '',
    jobAddress: '',
    repName: '',
    squares: 0,
    currentSiding: '',
    stories: '1',
    hasDormers: false,
    dormerCount: '',
    sidingSystem: 'hardie-lap',
    levelStarterLengthFt: '',
    levelFriezeLengthFt: '',
    slopedFriezeLengthFt: '',
    outsideCornerLengthFt: '',
    insideCornerLengthFt: '',
    wantsWindowDoorWraps: true,
    openingsTotalPerimeterFt: '',
    windowCount: '',
    doorCount: '',
    hasGarage: false,
    garageDoors: [],
    hasCurvedWindows: false,
    curvedWindowTrimLengthFt: '',
    hasWallOver10Ft: false,
    middleBandBoardLengthFt: '',
    wantsNewSoffit: false,
    soffitDepthIn: '',
    eaveLengthFt: '',
    rakeLengthFt: '',
    wantsNewFascia: false,
    fasciaLengthFt: '',
    exteriorLightFixtureCount: '',
    electricalOutletCount: '',
    hoseBibPipeCount: '',
    dryerVentCount: '',
    hasPorchCeilings: false,
    hasThreeSidedBeams: false,
    extraTrimOveragePct: 0,
  };
}
