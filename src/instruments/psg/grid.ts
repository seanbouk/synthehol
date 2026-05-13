/**
 * PSG panel grid — the single coordinate system the whole panel hangs off.
 *
 * The Stage is a fixed 2240×800 rectangle divided into a 14×5 grid of
 * 160 px square cells. Every fieldset, knob, slider and chart sits on
 * an exact cell boundary or cell centre — there is no ad-hoc geometry.
 *
 * Conventions
 * ───────────
 *   • Cells are 1-indexed. cell (1,1) is the top-left, cell (14,5) is
 *     the bottom-right. This matches how we talk about them in design
 *     ("the LFO knob lives at col 12, row 4") and lines up with the
 *     numbered column tags in refs/grid-sketch.svg.
 *
 *   • All positions are in body-relative pixels. The body fills the
 *     whole stage now, so body coords = stage coords.
 *
 *   • Use the helpers below rather than typing raw multiples of 160.
 *     `cellCentre(c, r)` and `cellRect(c1, r1, c2, r2)` cover almost
 *     everything; the edge accessors (`colLeft` / `rowTop` etc.) cover
 *     cases like a slider sitting on the boundary between two cells.
 *
 *   • cellRect is inclusive on both ends — `cellRect(3, 1, 7, 4)` is
 *     5 cells wide × 4 cells tall.
 *
 * Layout (see refs/grid-sketch.svg)
 * ─────────────────────────────────
 *     cols 1–2     wheels (pitch, mod)
 *     cols 3–7     oscillators           rows 1–4
 *     col  8       drive                 rows 1–4
 *     cols 9–11    filter                rows 1–4
 *     cols 12–14   LFO                   rows 1–4
 *     cols 3–6     voice charts          row  5
 *     cols 7–10    ADSR knobs            row  5
 *     cols 11–14   envelope chart        row  5
 *
 * Knobs sit on cell centres in row 4 (top: shape/drive/cutoff/reso/env-amt)
 * and row 5 (ADSR). Vsliders sit on column boundaries spanning rows 2–3
 * (mix on c3|c4, detune on c4|c5, depth on c12|c13, rate on c13|c14).
 */

export const CELL = 160;
export const COLS = 14;
export const ROWS = 5;

export const STAGE_W = COLS * CELL; // 2240
export const STAGE_H = ROWS * CELL; // 800

/** Left edge x of column `col` (1-indexed). colLeft(1) === 0. */
export const colLeft = (col: number): number => (col - 1) * CELL;

/** Right edge x of column `col`. colRight(14) === STAGE_W. */
export const colRight = (col: number): number => col * CELL;

/** Top edge y of row `row` (1-indexed). rowTop(1) === 0. */
export const rowTop = (row: number): number => (row - 1) * CELL;

/** Bottom edge y of row `row`. rowBottom(5) === STAGE_H. */
export const rowBottom = (row: number): number => row * CELL;

/** Centre point of cell (col, row), in body coords. */
export const cellCentre = (col: number, row: number): { x: number; y: number } => ({
  x: (col - 0.5) * CELL,
  y: (row - 0.5) * CELL
});

/**
 * Axis-aligned rectangle covering cells (col1, row1) through (col2, row2),
 * inclusive. cellRect(3, 1, 7, 4) gives a 5×4-cell rect at (320, 0, 800, 640).
 */
export const cellRect = (
  col1: number,
  row1: number,
  col2: number,
  row2: number
): { x: number; y: number; width: number; height: number } => ({
  x: colLeft(col1),
  y: rowTop(row1),
  width: (col2 - col1 + 1) * CELL,
  height: (row2 - row1 + 1) * CELL
});
