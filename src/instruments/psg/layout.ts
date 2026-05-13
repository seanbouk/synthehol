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
 *   X_MIRROR — vertical line, runs between the Drive and Filter zones.
 *              The 4-column knob grid and the 4 vsliders both mirror
 *              around it.
 *
 *   Y_MIRROR — horizontal line, runs between the top row of fieldsets
 *              (Osc/Drive/Filter/LFO bottoms) and the bottom row (Voice/
 *              Envelope tops). The 4×2 knob grid mirrors around it.
 *
 * Knob column anchors are picked so column 2 sits centred in Drive and
 * column 1 lands in the bottom-right area of Oscillators; columns 3
 * and 4 fall out by mirror symmetry into Filter.
 */

// ──────────────────────────────────────────────────────────────────
// Mirror axes
// ──────────────────────────────────────────────────────────────────

/** X mirror — between drive (ends at 1258) and filter (starts at 1275). */
export const X_MIRROR = 1266.5;

/** Y mirror — between top zones (end at 507) and bottom zones (start at 523). */
export const Y_MIRROR = 515;

// ──────────────────────────────────────────────────────────────────
// Knob grid: 4 columns × 2 rows
// ──────────────────────────────────────────────────────────────────

/** Horizontal spacing between adjacent knob columns. */
export const KNOB_COL_SPACING = 231;

const KNOB_HALF_INNER = KNOB_COL_SPACING / 2;       // 115.5 — col 2 / col 3 to mirror
const KNOB_HALF_OUTER = KNOB_HALF_INNER * 3;        // 346.5 — col 1 / col 4 to mirror

/** Column centres (X), in body coords. */
export const KNOB_COLS = {
  c1: X_MIRROR - KNOB_HALF_OUTER, // 920   — bottom-right area of Oscillators
  c2: X_MIRROR - KNOB_HALF_INNER, // 1151  — centre of Drive
  c3: X_MIRROR + KNOB_HALF_INNER, // 1382  — left half of Filter
  c4: X_MIRROR + KNOB_HALF_OUTER  // 1613  — right half of Filter
} as const;

/** Vertical half-gap between Y_MIRROR and a knob row centre. */
export const KNOB_ROW_HALF_GAP = 75;

/** Row centres (Y), in body coords. */
export const KNOB_ROWS = {
  r1: Y_MIRROR - KNOB_ROW_HALF_GAP, // 440 — top row
  r2: Y_MIRROR + KNOB_ROW_HALF_GAP  // 590 — bottom row
} as const;

// ──────────────────────────────────────────────────────────────────
// Vsliders: 4 sliders mirrored around X_MIRROR
// ──────────────────────────────────────────────────────────────────

const VSLIDER_HALF_INNER = 466.5;  // detune ↔ depth
const VSLIDER_HALF_OUTER = 566.5;  // mix    ↔ rate

/** Slider X centres, in body coords. */
export const VSLIDERS = {
  mix:    X_MIRROR - VSLIDER_HALF_OUTER, // 700  — left side of Oscillators
  detune: X_MIRROR - VSLIDER_HALF_INNER, // 800
  depth:  X_MIRROR + VSLIDER_HALF_INNER, // 1733 — left side of LFO
  rate:   X_MIRROR + VSLIDER_HALF_OUTER  // 1833
} as const;

/** Single Y centre for all four vsliders. */
export const VSLIDER_Y = 340;
