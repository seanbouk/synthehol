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
 *   X_MIRROR — vertical line, halfway between the left of the Oscillators
 *              / Voice column and the right of the body. The 4-column
 *              knob grid, the four vsliders, and the voice/envelope chart
 *              bboxes all mirror around it.
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

/** Halfway between the left of the Oscillators / Voice column (203)
 *  and the right of the body (2136). */
export const X_MIRROR = 1169.5;

/** Between top zones (end at 507) and bottom zones (start at 523). */
export const Y_MIRROR = 515;

// ──────────────────────────────────────────────────────────────────
// Knob grid: 4 columns × 2 rows
// ──────────────────────────────────────────────────────────────────

/** Horizontal spacing between adjacent knob columns.
 *  173.25 = 231 × 0.75 (original spacing reduced by 25%). */
export const KNOB_COL_SPACING = 173.25;

const KNOB_HALF_INNER = KNOB_COL_SPACING / 2;       // 86.625  — col 2 / col 3
const KNOB_HALF_OUTER = KNOB_HALF_INNER * 3;        // 259.875 — col 1 / col 4

/** Column centres (X), in body coords. */
export const KNOB_COLS = {
  c1: X_MIRROR - KNOB_HALF_OUTER, // 909.625  — bottom-right of Oscillators
  c2: X_MIRROR - KNOB_HALF_INNER, // 1082.875 — centre of Drive
  c3: X_MIRROR + KNOB_HALF_INNER, // 1256.125 — left half of Filter
  c4: X_MIRROR + KNOB_HALF_OUTER  // 1429.375 — right half of Filter
} as const;

/** Filter Env-Amount knob — sits one full column step to the right of
 *  Reso. Outside the main 4×2 grid; row 1 only. */
export const ENV_AMT_X = KNOB_COLS.c4 + KNOB_COL_SPACING; // 1602.625

/** Vertical half-gap between Y_MIRROR and a knob row centre.
 *  112.5 = 75 × 1.5 (original gap increased by 50%). */
export const KNOB_ROW_HALF_GAP = 112.5;

/** Row centres (Y), in body coords. */
export const KNOB_ROWS = {
  r1: Y_MIRROR - KNOB_ROW_HALF_GAP, // 402.5 — top row (Shape/Drive/Cutoff/Reso)
  r2: Y_MIRROR + KNOB_ROW_HALF_GAP  // 627.5 — bottom row (Attack/Decay/Sustain/Release)
} as const;

// ──────────────────────────────────────────────────────────────────
// Zone X-positions — derived from knob columns and a uniform gap.
// ──────────────────────────────────────────────────────────────────

/** Uniform horizontal gap between adjacent fieldset boxes — set to
 *  match the existing filter/lfo gap. */
export const ZONE_GAP = 16;
const HALF_GAP = ZONE_GAP / 2;

/** Gap centres (between adjacent knob columns).
 *  Each zone border sits HALF_GAP away from the relevant gap centre,
 *  so the actual gap between adjacent boxes is always exactly ZONE_GAP. */
const GAP_OSC_DRIVE   = (KNOB_COLS.c1 + KNOB_COLS.c2) / 2;  // 996.25  — mid(Shape, Drive)
const GAP_DRIVE_FILT  = (KNOB_COLS.c2 + KNOB_COLS.c3) / 2;  // 1169.5  — mid(Drive, Cutoff) (= X_MIRROR)

/** Drive box — centred on COL2; borders sit HALF_GAP off the gap
 *  centres so the actual gap to neighbour boxes is ZONE_GAP. */
export const DRIVE_LEFT = GAP_OSC_DRIVE + HALF_GAP;            // 1004.25
export const DRIVE_RIGHT = GAP_DRIVE_FILT - HALF_GAP;          // 1161.5
export const DRIVE_WIDTH = DRIVE_RIGHT - DRIVE_LEFT;           // 157.25

/** Filter — left follows the drive/filter seam; right is set so the
 *  Reso knob (COL4) sits exactly in the centre of the filter box. */
export const FILTER_LEFT = GAP_DRIVE_FILT + HALF_GAP;          // 1177.5
export const FILTER_RIGHT = 2 * KNOB_COLS.c4 - FILTER_LEFT;    // 1681.25
export const FILTER_WIDTH = FILTER_RIGHT - FILTER_LEFT;        // 503.75

/** Oscillators — right edge sits HALF_GAP before the osc/drive gap
 *  centre. Left edge unchanged. */
export const OSC_LEFT = 203;
export const OSC_RIGHT = GAP_OSC_DRIVE - HALF_GAP;             // 988.25
export const OSC_WIDTH = OSC_RIGHT - OSC_LEFT;                 // 785.25

/** LFO — left follows from filter's right (one ZONE_GAP across). */
export const LFO_LEFT = FILTER_RIGHT + ZONE_GAP;               // 1697.25
export const LFO_RIGHT = 2136;
export const LFO_WIDTH = LFO_RIGHT - LFO_LEFT;                 // 438.75
export const LFO_CX = (LFO_LEFT + LFO_RIGHT) / 2;              // 1916.625

// ──────────────────────────────────────────────────────────────────
// Vsliders — 4 sliders mirrored around X_MIRROR.
// ──────────────────────────────────────────────────────────────────
//
// Depth and Rate sit symmetrically around LFO_CX. Mix and Detune are
// the mirror images of Rate and Depth around X_MIRROR. Half-spacing
// from LFO_CX = ((LFO_WIDTH/2 - inset)) — here picked so the gap
// between Depth and Rate is ~1/3 less than at the previous step
// (181.33 apart instead of 272).

const VSLIDER_HALF_SPACING = 90.667;            // distance from LFO_CX to depth or rate
const RATE_X = LFO_CX + VSLIDER_HALF_SPACING;   // 2007.292
const DEPTH_X = LFO_CX - VSLIDER_HALF_SPACING;  // 1825.958

export const VSLIDERS = {
  mix:    2 * X_MIRROR - RATE_X,                // 331.708 — mirror of RATE
  detune: 2 * X_MIRROR - DEPTH_X,               // 513.042 — mirror of DEPTH
  depth:  DEPTH_X,                              // 1825.958
  rate:   RATE_X                                // 2007.292
} as const;

/** Single Y centre for all four vsliders. */
export const VSLIDER_Y = 340;

// ──────────────────────────────────────────────────────────────────
// Bottom-row zones
// ──────────────────────────────────────────────────────────────────
//
// Env zone's LEFT edge sits the same distance from its first knob
// (Attack, COL1) as Drive zone's left edge sits from the Drive knob
// (COL2). Vox's right edge follows by the standard ZONE_GAP.

/** Drive box inset — distance from the left edge of the drive zone to
 *  the centre of the drive knob. Reused as the inset for env's left
 *  edge relative to Attack's centre. */
const DRIVE_BOX_INSET = KNOB_COLS.c2 - DRIVE_LEFT;        // 78.625

export const VOX_LEFT = OSC_LEFT;                          // 203
export const ENV_LEFT = KNOB_COLS.c1 - DRIVE_BOX_INSET;    // 831 — same inset as drive's
export const VOX_RIGHT = ENV_LEFT - ZONE_GAP;              // 815
export const ENV_RIGHT = LFO_RIGHT;                        // 2136
export const VOX_WIDTH = VOX_RIGHT - VOX_LEFT;             // 612

// ──────────────────────────────────────────────────────────────────
// Voice and Envelope chart geometry
// ──────────────────────────────────────────────────────────────────
//
// Voice has two side-by-side waveform charts inside vox with a small
// gap between them. The user-stated rule: charts are horizontally
// centred in vox with equal space on either side and between them
// (so vox_width = 2 × chart_width + 3 × shared_gap). With chart width
// fixed at 300 and vox at 612, the shared gap works out to 4 px.
//
// Env chart is a single canvas whose bounding box is the mirror image
// of the voice bbox around X_MIRROR.

export const VOX_CHART_WIDTH = 300;
export const VOX_CHART_HEIGHT = 180;
export const VOX_CHART_GAP = (VOX_WIDTH - 2 * VOX_CHART_WIDTH) / 3;   // 4
export const VOX_BBOX_WIDTH = 2 * VOX_CHART_WIDTH + VOX_CHART_GAP;    // 604

export const VOX_BBOX_LEFT = VOX_LEFT + VOX_CHART_GAP;                 // 207
export const VOX_BBOX_RIGHT = VOX_BBOX_LEFT + VOX_BBOX_WIDTH;          // 811

export const VOX_CHART_1_CX = VOX_BBOX_LEFT + VOX_CHART_WIDTH / 2;     // 357
export const VOX_CHART_2_CX = VOX_BBOX_RIGHT - VOX_CHART_WIDTH / 2;    // 661

/** Env chart bbox is the mirror image of the voice bbox around X_MIRROR. */
export const ENV_CHART_LEFT = 2 * X_MIRROR - VOX_BBOX_RIGHT;   // 1528
export const ENV_CHART_RIGHT = 2 * X_MIRROR - VOX_BBOX_LEFT;   // 2132
export const ENV_CHART_WIDTH = VOX_BBOX_WIDTH;                 // 604
export const ENV_CHART_HEIGHT = VOX_CHART_HEIGHT;              // 180
export const ENV_CHART_CX = (ENV_CHART_LEFT + ENV_CHART_RIGHT) / 2; // 1830

/** Y centre for voice and envelope charts (in body coords). */
export const CHART_Y = 640;
