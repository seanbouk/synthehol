/**
 * Drums panel layout — region rectangles on the 28×10 grid.
 *
 * Read alongside `grid.ts`.
 *
 *   col      1   2   3   4  | 5 |  6  | 7  ... 22 | 23 | 24  25  26  27  28
 *   row 1  ┌────── top strip ─────────────────────────────────────────────┐
 *   row 2  │                │I E│     │                  │    │            │
 *    ...   │  lane labels   │N D│  g  │     step grid    │ g  │ right pnl  │
 *   row 9  │   (cols 1–4)   │S I│     │     (16 × 8)     │    │            │
 *   row 10 └────── bottom strip ──────────────────────────────────────────┘
 *                            ↑   ↑                       ↑
 *                          col 5  col 6                 col 23
 *                       (two 40 px button columns)
 *
 *   col 5 inner half (x =  320..360) → instrument buttons (8, lane-row aligned)
 *   col 5 outer half (x =  360..400) → edit buttons       (8, param-per-button)
 *
 * Each step-grid cell is 80×80, so the 16×8 grid is exactly 1280×640.
 */

import { cellRect, CELL } from './grid';

// Side panels run rows 2..9 (the 8 lane rows). Top and bottom strips
// span the full content width above and below them.
export const LEFT_PANEL  = cellRect( 1, 2,  4, 9); //    0,  80, 320, 640
export const STEP_GRID   = cellRect( 7, 2, 22, 9); //  480,  80, 1280, 640
export const RIGHT_PANEL = cellRect(24, 2, 28, 9); // 1840,  80, 400, 640

export const TOP_STRIP    = cellRect( 1,  1, 28,  1); // 0,   0, 2240, 80
export const BOTTOM_STRIP = cellRect( 1, 10, 28, 10); // 0, 720, 2240, 80

// Gutter columns sit empty between regions.
export const GUTTER_LEFT  = cellRect( 6, 2,  6, 9); // col 6
export const GUTTER_RIGHT = cellRect(23, 2, 23, 9); // col 23

// Button columns live in the right half of col 5 + left half of col
// 6 — shifted half a sub-cell right of straight col 5 so the gap to
// the grid is 40 px instead of 80 px (the lane labels gain a matching
// 40 px breather on their right edge).
const BTN_W = CELL / 2; // 40
const BTN_LEFT_X  = cellRect(5, 2, 5, 9).x + BTN_W;    // 360
const BTN_RIGHT_X = BTN_LEFT_X + BTN_W;                // 400
const BTN_TOP_Y   = cellRect(5, 2, 5, 9).y;            // 80
const BTN_H       = cellRect(5, 2, 5, 9).height / 8;   // 80 (one row tall)

export const INST_BUTTONS = {
  x: BTN_LEFT_X,
  y: BTN_TOP_Y,
  width: BTN_W,
  height: BTN_H * 8,
  buttonW: BTN_W,
  buttonH: BTN_H
} as const;

export const EDIT_BUTTONS = {
  x: BTN_RIGHT_X,
  y: BTN_TOP_Y,
  width: BTN_W,
  height: BTN_H * 8,
  buttonW: BTN_W,
  buttonH: BTN_H
} as const;

// Step-grid sub-rects.
export const STEP_CELL_PX = 80;
export const STEP_ROWS = 8;
export const STEP_COLS = 16;
