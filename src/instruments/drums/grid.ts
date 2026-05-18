/**
 * Drums panel grid — 28×10 sub-cells of 80 px on the shared 2240×800
 * Stage. Each PSG grid cell is 2×2 drums cells, so PSG and drums live
 * on the same physical canvas at different granularities.
 *
 * The drums panel needs a 16×8 main step grid plus side regions for
 * lane labels, contextual parameters, transport and displays. The
 * 28×10 sub-cell layout is:
 *
 *     cols  1–5     left panel    (lane labels, mode tabs, transport)
 *     col   6       gutter        (1-cell breathing room)
 *     cols  7–22    step grid     (16 × 8, the heart of the panel)
 *     col   23      gutter
 *     cols  24–28   right panel   (contextual params, display)
 *
 *     row   1       top strip     (page indicators, pattern header)
 *     rows  2–9     8 lane rows   (one per drum lane)
 *     row   10      bottom strip  (transport readout, status)
 *
 * Conventions match PSG's grid.ts:
 *   • Cells are 1-indexed. (1,1) is top-left, (28,10) is bottom-right.
 *   • cellRect is inclusive on both ends.
 *   • All positions in body-relative pixels (body = stage = 2240×800).
 */

export const CELL = 80;
export const COLS = 28;
export const ROWS = 10;

/** Left edge x of column `col` (1-indexed). colLeft(1) === 0. */
export const colLeft = (col: number): number => (col - 1) * CELL;

/** Right edge x of column `col`. colRight(28) === 2240. */
export const colRight = (col: number): number => col * CELL;

/** Top edge y of row `row` (1-indexed). rowTop(1) === 0. */
export const rowTop = (row: number): number => (row - 1) * CELL;

/** Bottom edge y of row `row`. rowBottom(10) === 800. */
export const rowBottom = (row: number): number => row * CELL;

/** Centre point of cell (col, row), in body coords. */
export const cellCentre = (col: number, row: number): { x: number; y: number } => ({
  x: (col - 0.5) * CELL,
  y: (row - 0.5) * CELL
});

/**
 * Axis-aligned rectangle covering cells (col1, row1) through (col2, row2),
 * inclusive. cellRect(7, 2, 22, 9) gives the 16×8 step grid: a 1280×640
 * rect at (480, 80).
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
