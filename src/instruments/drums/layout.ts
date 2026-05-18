/**
 * Drums panel layout — region rectangles derived from the 28×10 grid.
 *
 * Read alongside `grid.ts`. Each named region is a `cellRect` covering
 * the cells it occupies; rules between regions sit on the column /
 * row boundaries they straddle.
 *
 *   col      1   2   3   4   5   6   7  ... 22   23  24  25  26  27  28
 *   row 1  ┌──────── top strip ────────┬─────── top strip ─────────────┐
 *   row 2  │                         │ │                       │       │
 *    ...   │   left panel            │g│      step grid        │g│ rt  │
 *   row 9  │                         │u│      (16 × 8)         │u│ pnl │
 *   row 10 └──────── bot strip ──────┴─┴─────── bot strip ─────┴───────┘
 *                                     ↑                         ↑
 *                                   col 6                     col 23
 *
 * Step-grid cells line up exactly with the 80 px sub-cells, so the
 * 16×8 grid is 1280×640.
 */

import { cellRect } from './grid';

// Side panels run rows 2..9 (the 8 lane rows). Top and bottom strips
// span the full content width above and below them.
export const LEFT_PANEL  = cellRect( 1, 2,  5, 9); //    0,  80, 400, 640
export const STEP_GRID   = cellRect( 7, 2, 22, 9); //  480,  80, 1280, 640
export const RIGHT_PANEL = cellRect(24, 2, 28, 9); // 1840,  80, 400, 640

export const TOP_STRIP    = cellRect( 1, 1, 28,  1); // 0,   0, 2240, 80
export const BOTTOM_STRIP = cellRect( 1, 10, 28, 10); // 0, 720, 2240, 80

// Gutter columns sit empty between regions. Defined here so the rules
// below can target their centre lines without magic numbers.
export const GUTTER_LEFT  = cellRect( 6, 2,  6, 9); // col 6
export const GUTTER_RIGHT = cellRect(23, 2, 23, 9); // col 23

// Step-grid sub-rects: each row corresponds to one lane (rows 2..9 of
// the 28×10 grid), each column to one step (cols 7..22).
export const STEP_CELL_PX = 80;
export const STEP_ROWS = 8;
export const STEP_COLS = 16;
