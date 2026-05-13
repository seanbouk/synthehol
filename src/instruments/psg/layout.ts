/**
 * PSG panel geometry — single source of truth.
 *
 * All values are in body-relative pixels (the `.psg-body` element sits
 * inside the 2200×800 Stage at top:21, left:32 — its inside coords are
 * what these numbers refer to). Components position themselves against
 * these constants so the grid is provably a grid: shifting an axis or
 * row here moves every dependent control in lockstep.
 *
 * The layout has two mirror axes:
 *
 *   X_MIRROR — vertical line, halfway between the right of the Wheels
 *              zone and the right of the body. The 4-column knob grid,
 *              the four vsliders, and the voice/envelope chart bboxes
 *              all mirror around it.
 *
 *   Y_MIRROR — horizontal line, between the top and bottom rows of
 *              fieldsets. The 4×2 knob grid mirrors around it.
 *
 * Drive / Filter / Osc zone boundaries are derived from the knob
 * column positions:
 *   drive box is centred on the Drive knob (COL2), with its left/right
 *   borders at the midpoints between (Shape, Drive) and (Drive, Cutoff).
 *
 * Vsliders are centred horizontally in the LFO box: rate sits INSET
 * from LFO's right edge, depth is the mirror of rate around LFO_CX,
 * so the midpoint of (depth, rate) lands exactly on LFO_CX. Mix and
 * Detune fall out as mirrors of Rate and Depth around X_MIRROR.
 */

// ──────────────────────────────────────────────────────────────────
// Mirror axes
// ──────────────────────────────────────────────────────────────────

/** Halfway between the right of the Wheels zone (187) and the right of
 *  the body (2136). */
export const X_MIRROR = 1161.5;

/** Between top zones (end at 507) and bottom zones (start at 523). */
export const Y_MIRROR = 515;

// ──────────────────────────────────────────────────────────────────
// Knob grid: 4 columns × 2 rows
// ──────────────────────────────────────────────────────────────────

/** Horizontal spacing between adjacent knob columns. */
export const KNOB_COL_SPACING = 154;

const KNOB_HALF_INNER = KNOB_COL_SPACING / 2;       // 77    — col 2 / col 3
const KNOB_HALF_OUTER = KNOB_HALF_INNER * 3;        // 231   — col 1 / col 4

/** Column centres (X), in body coords. */
export const KNOB_COLS = {
  c1: X_MIRROR - KNOB_HALF_OUTER, // 930.5  — bottom-right of Oscillators
  c2: X_MIRROR - KNOB_HALF_INNER, // 1084.5 — centre of Drive
  c3: X_MIRROR + KNOB_HALF_INNER, // 1238.5 — left half of Filter
  c4: X_MIRROR + KNOB_HALF_OUTER  // 1392.5 — right half of Filter
} as const;

export const KNOB_ROW_HALF_GAP = 75;

/** Row centres (Y), in body coords. */
export const KNOB_ROWS = {
  r1: Y_MIRROR - KNOB_ROW_HALF_GAP, // 440 — top row (Shape/Drive/Cutoff/Reso)
  r2: Y_MIRROR + KNOB_ROW_HALF_GAP  // 590 — bottom row (Attack/Decay/Sustain/Release)
} as const;

// ──────────────────────────────────────────────────────────────────
// Zone X-positions — derived from knob columns where applicable.
// ──────────────────────────────────────────────────────────────────

/** Drive zone is centred on the Drive knob (COL2). Its borders are at
 *  the midpoints between adjacent knobs:
 *    left  = mid(Shape, Drive)  → also Oscillators' right border
 *    right = mid(Drive, Cutoff) → also Filter's left border */
export const DRIVE_LEFT = (KNOB_COLS.c1 + KNOB_COLS.c2) / 2;   // 1007.5
export const DRIVE_RIGHT = (KNOB_COLS.c2 + KNOB_COLS.c3) / 2;  // 1161.5 (= X_MIRROR)
export const DRIVE_WIDTH = DRIVE_RIGHT - DRIVE_LEFT;            // 154

/** Filter — left follows from drive's right; right edge unchanged. */
export const FILTER_LEFT = DRIVE_RIGHT;                         // 1161.5
export const FILTER_RIGHT = 1648;
export const FILTER_WIDTH = FILTER_RIGHT - FILTER_LEFT;         // 486.5

/** Oscillators — right edge follows from drive's left; left edge fixed
 *  (so the Wheels zone keeps its column on the left). */
export const OSC_LEFT = 203;
export const OSC_RIGHT = DRIVE_LEFT;                            // 1007.5
export const OSC_WIDTH = OSC_RIGHT - OSC_LEFT;                  // 804.5

/** LFO — unchanged. */
export const LFO_LEFT = 1664;
export const LFO_RIGHT = 2136;
export const LFO_WIDTH = LFO_RIGHT - LFO_LEFT;                  // 472
export const LFO_CX = (LFO_LEFT + LFO_RIGHT) / 2;               // 1900

// ──────────────────────────────────────────────────────────────────
// Vsliders — 4 sliders mirrored around X_MIRROR.
// ──────────────────────────────────────────────────────────────────
//
// Rate sits a fixed inset from LFO's right edge; Depth is positioned so
// that the midpoint of (Depth, Rate) lands exactly on LFO_CX. Mix and
// Detune are then the mirror images of Rate and Depth around X_MIRROR,
// which automatically lands them inside the Oscillators zone.

const VSLIDER_INSET = 100;
const RATE_X = LFO_RIGHT - VSLIDER_INSET;       // 2036
const DEPTH_X = 2 * LFO_CX - RATE_X;            // 1764  → (DEPTH+RATE)/2 = LFO_CX

export const VSLIDERS = {
  mix:    2 * X_MIRROR - RATE_X,                // 287   — mirror of RATE
  detune: 2 * X_MIRROR - DEPTH_X,               // 559   — mirror of DEPTH
  depth:  DEPTH_X,                              // 1764
  rate:   RATE_X                                // 2036
} as const;

/** Single Y centre for all four vsliders. */
export const VSLIDER_Y = 340;

// ──────────────────────────────────────────────────────────────────
// Voice and Envelope chart geometry
// ──────────────────────────────────────────────────────────────────
//
// Voice has two side-by-side waveform charts inside the vox zone with
// a small gap between them. Their combined bounding box mirrors the
// envelope chart's bounding box around X_MIRROR.

export const VOX_CHART_WIDTH = 300;
export const VOX_CHART_HEIGHT = 180;
export const VOX_CHART_GAP = 16;
export const VOX_BBOX_WIDTH = 2 * VOX_CHART_WIDTH + VOX_CHART_GAP; // 616

/** Voice bbox is centred inside the vox zone (still at x=203..855). */
const VOX_ZONE_CENTRE = (203 + 855) / 2; // 529
export const VOX_BBOX_LEFT = VOX_ZONE_CENTRE - VOX_BBOX_WIDTH / 2;   // 221
export const VOX_BBOX_RIGHT = VOX_BBOX_LEFT + VOX_BBOX_WIDTH;         // 837

export const VOX_CHART_1_CX = VOX_BBOX_LEFT + VOX_CHART_WIDTH / 2;    // 371
export const VOX_CHART_2_CX = VOX_BBOX_RIGHT - VOX_CHART_WIDTH / 2;   // 687

/** Env chart bbox is the mirror image of the voice bbox around X_MIRROR. */
export const ENV_CHART_LEFT = 2 * X_MIRROR - VOX_BBOX_RIGHT;   // 1486
export const ENV_CHART_RIGHT = 2 * X_MIRROR - VOX_BBOX_LEFT;   // 2102
export const ENV_CHART_WIDTH = VOX_BBOX_WIDTH;                 // 616
export const ENV_CHART_HEIGHT = VOX_CHART_HEIGHT;              // 180
export const ENV_CHART_CX = (ENV_CHART_LEFT + ENV_CHART_RIGHT) / 2; // 1794

/** Y centre for voice and envelope charts (in body coords). */
export const CHART_Y = 640;
