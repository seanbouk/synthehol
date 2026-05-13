/**
 * PSG panel layout — every position derived from the 14×5 grid.
 *
 * Read alongside `refs/grid-sketch.svg` and `grid.ts`. Each zone is
 * described as a cell rectangle, each control as a cell centre or a
 * column/row boundary. No raw pixel offsets live here.
 *
 * Grid summary (cells are 1-indexed, 160 px square):
 *
 *     col      1   2   3   4   5   6   7   8   9  10  11  12  13  14
 *     row 1  ┌─P─┬─P─┬─────── OSC ───────┬─D─┬─FILTER─┬───── LFO ────┐
 *     row 2  │       │                   │   │        │              │
 *     row 3  │ wheels│                   │   │        │              │
 *     row 4  │       │                   │   │        │              │
 *     row 5  └─P─┴─P─┴── VOX ─┬─── ADSR knobs ───┬── ENV chart ──────┘
 *
 *   • wheels:       col 1, col 2          (rows 1–5, centred each col)
 *   • oscillators:  cells (3,1)–(7,4)
 *   • drive:        cell  (8,1)–(8,4)
 *   • filter:       cells (9,1)–(11,4)
 *   • LFO:          cells (12,1)–(14,4)
 *   • voice charts: row 5 — chart 1 at cells (3,5)–(4,5), chart 2 at (5,5)–(6,5)
 *   • ADSR knobs:   row 5, columns 7..10 (cell centres)
 *   • envelope:     cells (11,5)–(14,5)
 *
 *   • top knobs (row 4, cell centres):
 *       shape c7, drive c8, cutoff c9, reso c10, env-amt c11
 *
 *   • vsliders (rows 2–3, sitting on column boundaries):
 *       mix    c3 | c4
 *       detune c4 | c5
 *       depth  c12 | c13
 *       rate   c13 | c14
 */

import { cellCentre, cellRect, colRight, rowTop, rowBottom } from './grid';

// ──────────────────────────────────────────────────────────────────
// Zones — cell rectangles (in body coords).
// ──────────────────────────────────────────────────────────────────
//
// Box-bearing zones are inset by ZONE_INSET on every edge that touches
// another box (left/right/bottom of OSC, FILTER, etc.). Edges flush
// with the outer synth panel (top of the upper row, the outermost
// left/right/bottom) stay at their cell boundary. The CSS rules in
// index.css apply these insets — these RECT exports remain the raw
// cell rectangles so consumers reading "the OSC zone covers cells
// 3..7" continue to see the truth.

/** Visual gap inset per edge between adjacent box-bearing zones. */
export const ZONE_INSET = 8;

export const PERF_RECT   = cellRect(1, 1, 2, 5);   //   0,   0, 320, 800
export const OSC_RECT    = cellRect(3, 1, 7, 4);   // 320,   0, 800, 640
export const DRIVE_RECT  = cellRect(8, 1, 8, 4);   // 1120,  0, 160, 640
export const FILTER_RECT = cellRect(9, 1, 11, 4);  // 1280,  0, 480, 640
export const LFO_RECT    = cellRect(12, 1, 14, 4); // 1760,  0, 480, 640
export const ENVCTL_RECT = cellRect(7, 5, 10, 5);  // 960, 640, 640, 160

// Voice charts and the envelope display are unboxed canvases; they
// simply fill their cells in row 5. They have no zone wrapper.

// ──────────────────────────────────────────────────────────────────
// Knob positions — cell centres.
// ──────────────────────────────────────────────────────────────────
//
// Top row (row 4): shape / drive / cutoff / reso / env-amt
// Bottom row (row 5): attack / decay / sustain / release

export const KNOBS = {
  shape:   cellCentre(7,  4), // 1040, 560
  drive:   cellCentre(8,  4), // 1200, 560
  cutoff:  cellCentre(9,  4), // 1360, 560
  reso:    cellCentre(10, 4), // 1520, 560
  envAmt:  cellCentre(11, 4), // 1680, 560
  attack:  cellCentre(7,  5), // 1040, 720
  decay:   cellCentre(8,  5), // 1200, 720
  sustain: cellCentre(9,  5), // 1360, 720
  release: cellCentre(10, 5)  // 1520, 720
} as const;

// ──────────────────────────────────────────────────────────────────
// Vsliders — sit on column boundaries, 2 cells tall (rows 2–3).
// ──────────────────────────────────────────────────────────────────

/** Track span: top of row 2 to bottom of row 3 = 320 px. */
export const VSLIDER_TOP = rowTop(2);            // 160
export const VSLIDER_BOTTOM = rowBottom(3);      // 480
export const VSLIDER_TRACK_HEIGHT = VSLIDER_BOTTOM - VSLIDER_TOP; // 320
export const VSLIDER_CY = (VSLIDER_TOP + VSLIDER_BOTTOM) / 2;     // 320

export const VSLIDERS = {
  mix:    colRight(3),  // 480
  detune: colRight(4),  // 640
  depth:  colRight(12), // 1920
  rate:   colRight(13)  // 2080
} as const;

// ──────────────────────────────────────────────────────────────────
// Voice and envelope charts.
// ──────────────────────────────────────────────────────────────────
//
// Each voice chart is 2×1 cells (320×160). The envelope chart is 4×1
// cells (640×160). All sit in row 5, centred in their cell rectangles.

const rectCentre = (r: { x: number; y: number; width: number; height: number }) =>
  ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

const VOX_CHART_1_RECT = cellRect(3, 5, 4, 5);   // 320,640,320,160
const VOX_CHART_2_RECT = cellRect(5, 5, 6, 5);   // 640,640,320,160
const ENV_CHART_RECT   = cellRect(11, 5, 14, 5); // 1600,640,640,160

export const VOX_CHART_WIDTH = VOX_CHART_1_RECT.width;   // 320
export const VOX_CHART_HEIGHT = VOX_CHART_1_RECT.height; // 160
export const VOX_CHART_1 = rectCentre(VOX_CHART_1_RECT); //  480, 720
export const VOX_CHART_2 = rectCentre(VOX_CHART_2_RECT); //  800, 720

export const ENV_CHART_WIDTH = ENV_CHART_RECT.width;     // 640
export const ENV_CHART_HEIGHT = ENV_CHART_RECT.height;   // 160
export const ENV_CHART = rectCentre(ENV_CHART_RECT);     // 1920, 720
