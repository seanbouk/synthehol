import { useCallback } from 'react';
import { Stage } from '../../ui-kit/Stage';
import {
  LEFT_PANEL,
  STEP_GRID,
  RIGHT_PANEL,
  TOP_STRIP,
  BOTTOM_STRIP,
  INST_BUTTONS,
  EDIT_BUTTONS,
  STEP_ROWS,
  STEP_COLS
} from './layout';
import {
  useDrumsStore,
  DEFAULT_STEP,
  type EditParam,
  type StepState,
  type StepCondition,
  type Ratchet
} from './drums-state';
import { ensureDrumsEngine } from './drums-host';
import { startScheduler, stopScheduler } from './drums-scheduler';
import { DEFAULT_KIT } from './kits';
import { LANE_COLORS } from './kit';

/**
 * Drum machine panel.
 *
 * Two pickers on the left of the grid drive editing:
 *   ─ Instrument column (8 buttons, one per lane)
 *   ─ Edit column        (8 buttons, one per parameter)
 *
 * When both are selected the 8×16 grid switches to an in-grid editor
 * for that one parameter:
 *   ─ velocity / length / probability / ratchet  → bar-chart cells
 *   ─ µTime                                       → nudge column
 * Clicking any cell sets the value and turns the step on if it
 * wasn't already (a value implies a note). Off steps show empty
 * bars. To remove a note entirely, exit edit mode and tap it in
 * default mode.
 *
 * Pressing the active edit OR instrument button resets BOTH columns
 * — re-entering edit mode requires two clicks again. Pressing a
 * different button in either column switches that column only.
 */

const MODE_TABS = ['STEP', 'LIVE', 'AUTOM', 'PATTERN'] as const;

// Edit-button definitions. Order matters — these are rendered top to
// bottom in the column. `null` slots render as inert blanks.
const EDIT_BUTTON_DEFS: ReadonlyArray<{ param: EditParam; emoji: string; label: string } | null> = [
  { param: 'velocity',    emoji: '🔊', label: 'Velocity'    },
  { param: 'length',      emoji: '📏', label: 'Length'      },
  { param: 'uTime',       emoji: '⏱️', label: 'µTime'       },
  { param: 'probability', emoji: '🎲', label: 'Chance'      },
  { param: 'ratchet',     emoji: '⚡', label: 'Ratchet'     },
  { param: 'condition',   emoji: '🚦', label: 'Condition'   },
  null,
  null
];

function Region({
  rect,
  className,
  children,
  onPointerDown
}: {
  rect: { x: number; y: number; width: number; height: number };
  className: string;
  children?: React.ReactNode;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bar-chart helpers
// ─────────────────────────────────────────────────────────────────────
//
// For velocity / length / probability / ratchet, the 16 columns each
// render as an 8-row vertical bar. Off steps (cell.on === false)
// always render empty — a value implies a note. µTime is handled by
// its own nudge component below.

const TOTAL_ROWS = STEP_ROWS; // 8

/** Bar-chart params — exclude µTime (nudge column) and condition
 *  (discrete row picker). */
type BarParam = Exclude<EditParam, 'uTime' | 'condition'>;

/** Linear or log normalisation t∈[0,1] from value ∈ [min, max]. */
function unipolarT(value: number, min: number, max: number, log: boolean): number {
  if (log) return Math.log(value / min) / Math.log(max / min);
  return (value - min) / (max - min);
}
function unipolarV(t: number, min: number, max: number, log: boolean): number {
  const c = Math.max(0, Math.min(1, t));
  return log ? min * Math.pow(max / min, c) : min + (max - min) * c;
}

/**
 * Is this row "lit" given the step's value? Off steps always return
 * false so empty cells visually mean "no note here".
 */
function rowFilled(row: number, cell: StepState, param: BarParam): boolean {
  if (!cell.on) return false;
  switch (param) {
    case 'velocity':
    case 'probability': {
      const t = unipolarT(cell[param], 0, 1, false);
      const filledRows = Math.round(t * TOTAL_ROWS);
      return row >= TOTAL_ROWS - filledRows;
    }
    case 'length': {
      const t = unipolarT(cell.length, 0.25, 4, true);
      const filledRows = Math.round(t * TOTAL_ROWS);
      return row >= TOTAL_ROWS - filledRows;
    }
    case 'ratchet': {
      // Ratchet 1 → row 7 only; ratchet 8 → all rows.
      return row >= TOTAL_ROWS - cell.ratchet;
    }
  }
}

/**
 * What value would the user be setting by clicking on cell (row) for
 * the given param? No toggle-off — every click sets the value
 * directly. Setting any value always implies turning the step on
 * (caller adds on:true to the patch).
 */
function valueForRow(row: number, param: BarParam):
  | { name: 'velocity' | 'length' | 'probability'; value: number }
  | { name: 'ratchet'; value: Ratchet } {
  switch (param) {
    case 'velocity':
    case 'probability': {
      const filledRows = TOTAL_ROWS - row;
      const t = filledRows / TOTAL_ROWS;
      return { name: param, value: unipolarV(t, 0, 1, false) };
    }
    case 'length': {
      const filledRows = TOTAL_ROWS - row;
      const t = filledRows / TOTAL_ROWS;
      return { name: 'length', value: unipolarV(t, 0.25, 4, true) };
    }
    case 'ratchet': {
      const r = Math.max(1, Math.min(8, TOTAL_ROWS - row)) as Ratchet;
      return { name: 'ratchet', value: r };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// µTime nudge column
// ─────────────────────────────────────────────────────────────────────
//
// Each of the 16 step columns is laid out as:
//
//   row 0:  +10
//   row 1:  +5
//   row 2:  +1
//   row 3:  current value display (e.g. "+12")
//   row 4:  reset to 0
//   row 5:  -1
//   row 6:  -5
//   row 7:  -10
//
// Nudge cells add their amount (1, 5, or 10 % of step) and clamp to
// ±50. Reset zeroes the value. Both nudge and reset turn the step on
// (with default other params if the step was off).

type UTimeRowKind =
  | { kind: 'nudge'; delta: number }
  | { kind: 'display' }
  | { kind: 'reset' };

const UTIME_ROW_KINDS: readonly UTimeRowKind[] = [
  { kind: 'nudge',   delta:  0.10 },
  { kind: 'nudge',   delta:  0.05 },
  { kind: 'nudge',   delta:  0.01 },
  { kind: 'display' },
  { kind: 'reset'   },
  { kind: 'nudge',   delta: -0.01 },
  { kind: 'nudge',   delta: -0.05 },
  { kind: 'nudge',   delta: -0.10 }
];

const UTIME_MAX = 0.5;

function fmtUTime(v: number): string {
  const pct = Math.round(v * 100);
  if (pct === 0) return '0';
  return pct > 0 ? `+${pct}` : `${pct}`;
}

// ─────────────────────────────────────────────────────────────────────
// Condition discrete picker
// ─────────────────────────────────────────────────────────────────────
//
// Each of the 8 rows maps to a distinct conditional value. Top half =
// "every N" (rarer plays), centre = always (no condition), bottom
// half = "notEvery N" (denser plays). Labels read as play-ratios so
// users see the density at a glance.

const CONDITION_BY_ROW: readonly StepCondition[] = [
  { kind: 'every',    n: 8 },
  { kind: 'every',    n: 4 },
  { kind: 'every',    n: 3 },
  { kind: 'every',    n: 2 },
  { kind: 'none' },
  { kind: 'notEvery', n: 3 },
  { kind: 'notEvery', n: 4 },
  { kind: 'notEvery', n: 8 }
];

const CONDITION_LABELS: readonly string[] = [
  '1:8', '1:4', '1:3', '1:2', '—', '2:3', '3:4', '7:8'
];

function conditionsEqual(a: StepCondition, b: StepCondition): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'none' || b.kind === 'none') return a.kind === b.kind;
  return a.n === b.n;
}

// ─────────────────────────────────────────────────────────────────────
// Step cell
// ─────────────────────────────────────────────────────────────────────

function StepCell({ row, col }: { row: number; col: number }) {
  const editParam = useDrumsStore((s) => s.editParam);
  const editLane = useDrumsStore((s) => s.editLane);
  const inEditMode = editParam !== null && editLane !== null;

  if (inEditMode && editParam === 'uTime') {
    return <UTimeCell row={row} col={col} editLane={editLane!} />;
  }
  if (inEditMode && editParam === 'condition') {
    return <ConditionCell row={row} col={col} editLane={editLane!} />;
  }
  if (inEditMode) {
    return (
      <BarChartCell
        row={row}
        col={col}
        editLane={editLane!}
        editParam={editParam! as BarParam}
      />
    );
  }
  return <DefaultStepCell row={row} col={col} />;
}

function DefaultStepCell({ row, col }: { row: number; col: number }) {
  const cell = useDrumsStore((s) => s.pattern.lanes[row]?.steps[col]);
  const laneLength = useDrumsStore((s) => s.pattern.lanes[row]?.length ?? 0);
  const playhead = useDrumsStore((s) => s.currentStepPerLane[row] === col);
  const toggleStep = useDrumsStore((s) => s.toggleStep);

  const outOfRange = col >= laneLength;
  const handleClick = useCallback(() => {
    if (!outOfRange) toggleStep(row, col);
  }, [outOfRange, row, col, toggleStep]);

  if (!cell) return <div />;
  const beat = col % 4 === 0;
  const hasMeta =
    cell.ratchet > 1 || cell.condition.kind !== 'none' || cell.probability < 1;
  const classes = [
    'drums-step',
    cell.on ? 'on' : '',
    beat ? 'beat' : '',
    playhead ? 'playhead' : '',
    outOfRange ? 'out-of-range' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      data-lane={row}
      aria-label={`Lane ${row + 1} step ${col + 1}${cell.on ? ' (on)' : ''}`}
      style={cell.on ? { opacity: 0.4 + cell.velocity * 0.6 } : undefined}
      onClick={handleClick}
    >
      {hasMeta && <span className="drums-step-meta" />}
    </button>
  );
}

function BarChartCell({
  row,
  col,
  editLane,
  editParam
}: {
  row: number;
  col: number;
  editLane: number;
  editParam: BarParam;
}) {
  const cell = useDrumsStore((s) => s.pattern.lanes[editLane]?.steps[col]);
  const laneLength = useDrumsStore((s) => s.pattern.lanes[editLane]?.length ?? 0);
  const playhead = useDrumsStore((s) => s.currentStepPerLane[editLane] === col);
  const patchStep = useDrumsStore((s) => s.patchStep);

  const outOfRange = col >= laneLength;

  const handleClick = useCallback(() => {
    if (outOfRange || !cell) return;
    const update = valueForRow(row, editParam);
    // A value implies a note. If the step was off, give it the full
    // defaults plus the clicked value — a clean new note. If it was
    // already on, just patch the one param.
    if (!cell.on) {
      patchStep(editLane, col, {
        ...DEFAULT_STEP,
        on: true,
        [update.name]: update.value
      });
    } else {
      patchStep(editLane, col, { [update.name]: update.value });
    }
  }, [outOfRange, cell, row, editParam, editLane, col, patchStep]);

  if (!cell) return <div />;

  const beat = col % 4 === 0;
  const filled = rowFilled(row, cell, editParam);
  const classes = [
    'drums-step',
    'edit-mode',
    filled ? 'filled' : '',
    beat ? 'beat' : '',
    playhead ? 'playhead' : '',
    outOfRange ? 'out-of-range' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      data-lane={editLane}
      onClick={handleClick}
      aria-label={`Step ${col + 1} ${editParam} level ${TOTAL_ROWS - row}`}
    />
  );
}

function UTimeCell({
  row,
  col,
  editLane
}: {
  row: number;
  col: number;
  editLane: number;
}) {
  const cell = useDrumsStore((s) => s.pattern.lanes[editLane]?.steps[col]);
  const laneLength = useDrumsStore((s) => s.pattern.lanes[editLane]?.length ?? 0);
  const playhead = useDrumsStore((s) => s.currentStepPerLane[editLane] === col);
  const patchStep = useDrumsStore((s) => s.patchStep);

  const outOfRange = col >= laneLength;
  const kind = UTIME_ROW_KINDS[row]!;

  const handleClick = useCallback(() => {
    if (outOfRange || !cell) return;
    if (kind.kind === 'nudge') {
      const next = Math.max(-UTIME_MAX, Math.min(UTIME_MAX, cell.uTime + kind.delta));
      if (!cell.on) {
        // First click on an off step: spawn a default note with the
        // nudged µTime applied.
        patchStep(editLane, col, { ...DEFAULT_STEP, on: true, uTime: next });
      } else {
        patchStep(editLane, col, { uTime: next });
      }
    } else {
      // Both the display cell and the dedicated reset row zero µTime.
      // Reset never spawns a new note (zero is the default).
      patchStep(editLane, col, { uTime: 0 });
    }
  }, [outOfRange, cell, kind, patchStep, editLane, col]);

  if (!cell) return <div />;

  const beat = col % 4 === 0;
  const classes = [
    'drums-step',
    'edit-mode',
    'utime',
    `utime-${kind.kind}`,
    beat ? 'beat' : '',
    playhead ? 'playhead' : '',
    outOfRange ? 'out-of-range' : '',
    // Display row tints with the lane colour when this step has a
    // note — makes "which steps are actually programmed" obvious in
    // µTime mode without having to flip back to default.
    kind.kind === 'display' && cell.on ? 'has-note' : '',
    kind.kind === 'nudge' && kind.delta > 0 ? 'utime-up' : '',
    kind.kind === 'nudge' && kind.delta < 0 ? 'utime-down' : ''
  ]
    .filter(Boolean)
    .join(' ');

  let label = '';
  if (kind.kind === 'nudge') {
    const n = Math.round(kind.delta * 100);
    label = n > 0 ? `+${n}` : `${n}`;
  } else if (kind.kind === 'display') {
    label = fmtUTime(cell.uTime);
  } else {
    label = '0';
  }

  return (
    <button
      type="button"
      className={classes}
      data-lane={editLane}
      onClick={handleClick}
      aria-label={
        kind.kind === 'nudge'
          ? `Step ${col + 1} µTime ${label}`
          : kind.kind === 'reset'
            ? `Step ${col + 1} µTime reset to 0`
            : `Step ${col + 1} µTime current ${label}`
      }
    >
      <span className="utime-label">{label}</span>
    </button>
  );
}

function ConditionCell({
  row,
  col,
  editLane
}: {
  row: number;
  col: number;
  editLane: number;
}) {
  const cell = useDrumsStore((s) => s.pattern.lanes[editLane]?.steps[col]);
  const laneLength = useDrumsStore((s) => s.pattern.lanes[editLane]?.length ?? 0);
  const playhead = useDrumsStore((s) => s.currentStepPerLane[editLane] === col);
  const patchStep = useDrumsStore((s) => s.patchStep);

  const outOfRange = col >= laneLength;
  const ourCondition = CONDITION_BY_ROW[row]!;
  const label = CONDITION_LABELS[row]!;
  const isCentre = row === 4;

  const handleClick = useCallback(() => {
    if (outOfRange || !cell) return;
    if (!cell.on) {
      patchStep(editLane, col, {
        ...DEFAULT_STEP,
        on: true,
        condition: ourCondition
      });
    } else {
      patchStep(editLane, col, { condition: ourCondition });
    }
  }, [outOfRange, cell, patchStep, editLane, col, ourCondition]);

  if (!cell) return <div />;

  // Active row = the one that matches the step's current condition,
  // but only when the step is actually on (so off steps show no
  // highlight, matching velocity/length/etc).
  const active = cell.on && conditionsEqual(cell.condition, ourCondition);

  const beat = col % 4 === 0;
  const classes = [
    'drums-step',
    'edit-mode',
    'condition',
    active ? 'filled' : '',
    isCentre ? 'condition-centre' : '',
    beat ? 'beat' : '',
    playhead ? 'playhead' : '',
    outOfRange ? 'out-of-range' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      data-lane={editLane}
      onClick={handleClick}
      aria-label={`Step ${col + 1} condition ${label}${active ? ' (active)' : ''}`}
    >
      <span className="condition-label">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Lane label row
// ─────────────────────────────────────────────────────────────────────

function LaneLabelRow({ lane }: { lane: number }) {
  const laneDef = DEFAULT_KIT.lanes[lane];
  if (!laneDef) return null;
  return (
    <div className="drums-lane-label" data-lane={lane}>
      <span className="drums-lane-color" data-lane={lane} />
      <span className="drums-lane-name">{laneDef.name}</span>
      <span className="drums-lane-buttons">
        <span className="drums-lane-btn">M</span>
        <span className="drums-lane-btn">S</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Instrument + Edit button columns
// ─────────────────────────────────────────────────────────────────────

function InstButton({ lane }: { lane: number }) {
  const laneDef = DEFAULT_KIT.lanes[lane];
  const editLane = useDrumsStore((s) => s.editLane);
  const editParam = useDrumsStore((s) => s.editParam);
  const toggleEditLane = useDrumsStore((s) => s.toggleEditLane);

  const armed = editLane === lane;
  const flashing = editParam !== null && editLane === null;

  if (!laneDef) return <div className="drums-inst-btn empty" />;

  return (
    <button
      type="button"
      className={`drums-inst-btn ${armed ? 'armed' : ''} ${flashing ? 'flashing' : ''}`}
      data-lane={lane}
      onClick={() => toggleEditLane(lane)}
      style={{
        // Background is the lane colour washed down; armed bumps to full.
        ['--lane-color' as string]: LANE_COLORS[lane]
      }}
      aria-label={`Edit ${laneDef.name}${armed ? ' (selected)' : ''}`}
    >
      {laneDef.name}
    </button>
  );
}

function EditButton({
  def,
  index
}: {
  def: { param: EditParam; emoji: string; label: string } | null;
  index: number;
}) {
  const editParam = useDrumsStore((s) => s.editParam);
  const toggleEditParam = useDrumsStore((s) => s.toggleEditParam);

  if (!def) {
    return <div className="drums-edit-btn empty" data-slot={index} />;
  }

  const armed = editParam === def.param;
  return (
    <button
      type="button"
      className={`drums-edit-btn ${armed ? 'armed' : ''}`}
      onClick={() => toggleEditParam(def.param)}
      aria-label={`Edit ${def.label}${armed ? ' (selected)' : ''}`}
      title={def.label}
    >
      <span className="drums-edit-emoji">{def.emoji}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────

export function DrumsPanel() {
  const isPlaying = useDrumsStore((s) => s.isPlaying);
  const bpm = useDrumsStore((s) => s.bpm);
  const editParam = useDrumsStore((s) => s.editParam);
  const editLane = useDrumsStore((s) => s.editLane);
  const setPlaying = useDrumsStore((s) => s.setPlaying);
  const setBpm = useDrumsStore((s) => s.setBpm);

  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      setPlaying(false);
      stopScheduler();
      return;
    }
    const engine = await ensureDrumsEngine();
    setPlaying(true);
    const ctx = engine.output.context as AudioContext;
    startScheduler(ctx, engine);
  }, [isPlaying, setPlaying]);

  const handleBpmStep = useCallback(
    (delta: number) => setBpm(bpm + delta),
    [bpm, setBpm]
  );

  const inEditMode = editParam !== null && editLane !== null;
  const gridLaneColorAttr =
    inEditMode && editLane !== null ? String(editLane) : undefined;

  return (
    <Stage>
      <div className="drums-body">

        {/* ── Top strip ───────────────────────────────────────────── */}
        <Region rect={TOP_STRIP} className="drums-region drums-top">
          <div className="drums-top-left">
            <span className="drums-kit-name">KIT · {DEFAULT_KIT.name}</span>
            <div className="drums-mode-tabs">
              {MODE_TABS.map((m, i) => (
                <span
                  key={m}
                  className={`drums-mode-tab ${i === 0 ? 'active' : ''}`}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="drums-top-right">
            <span className="drums-pattern-id">PTN 01 / 16</span>
            <div className="drums-tempo-control">
              <button
                type="button"
                className="drums-tempo-btn"
                onClick={() => handleBpmStep(-1)}
                aria-label="Decrease tempo"
              >−</button>
              <span className="drums-tempo">♩ = {bpm}</span>
              <button
                type="button"
                className="drums-tempo-btn"
                onClick={() => handleBpmStep(+1)}
                aria-label="Increase tempo"
              >+</button>
            </div>
          </div>
        </Region>

        {/* ── Left panel: lane label strips ───────────────────────── */}
        <Region rect={LEFT_PANEL} className="drums-region drums-left">
          {DEFAULT_KIT.lanes.map((_, i) => (
            <LaneLabelRow key={i} lane={i} />
          ))}
        </Region>

        {/* ── Instrument button column ────────────────────────────── */}
        <Region rect={INST_BUTTONS} className="drums-region drums-inst-col">
          {DEFAULT_KIT.lanes.map((_, i) => (
            <InstButton key={i} lane={i} />
          ))}
        </Region>

        {/* ── Edit button column ──────────────────────────────────── */}
        <Region rect={EDIT_BUTTONS} className="drums-region drums-edit-col">
          {EDIT_BUTTON_DEFS.map((def, i) => (
            <EditButton key={i} def={def} index={i} />
          ))}
        </Region>

        {/* ── Step grid ───────────────────────────────────────────── */}
        <Region
          rect={STEP_GRID}
          className={`drums-region drums-grid ${inEditMode ? 'edit-mode' : ''}`}
        >
          <div className="drums-grid-inner" data-edit-lane={gridLaneColorAttr}>
            {Array.from({ length: STEP_ROWS }, (_, r) =>
              Array.from({ length: STEP_COLS }, (_, c) => (
                <StepCell key={`${r}-${c}`} row={r} col={c} />
              ))
            )}
          </div>
        </Region>

        {/* ── Right panel: display placeholder ────────────────────── */}
        <Region rect={RIGHT_PANEL} className="drums-region drums-right">
          <div className="drums-context-header">DISPLAY</div>
          <div className="drums-context-display" />
        </Region>

        {/* ── Bottom strip ────────────────────────────────────────── */}
        <Region rect={BOTTOM_STRIP} className="drums-region drums-bottom">
          <div className="drums-bottom-left">
            <button
              type="button"
              className={`drums-transport drums-play ${isPlaying ? 'on' : ''}`}
              onClick={handlePlayStop}
              aria-label={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? '■' : '▶'}
            </button>
          </div>
          <div className="drums-bottom-center">
            <span className="drums-page-dots">● ○ ○ ○</span>
            <span className="drums-muted">page 1 / 4</span>
          </div>
          <div className="drums-bottom-right">
            <EditModeReadout />
          </div>
        </Region>

      </div>
    </Stage>
  );
}

function EditModeReadout() {
  const editParam = useDrumsStore((s) => s.editParam);
  const editLane = useDrumsStore((s) => s.editLane);
  const isPlaying = useDrumsStore((s) => s.isPlaying);
  const step = useDrumsStore((s) => s.currentStepPerLane[0] ?? -1);

  if (editParam && editLane !== null) {
    const laneName = DEFAULT_KIT.lanes[editLane]?.name ?? '—';
    return (
      <span className="drums-muted">
        editing {editParam} · {laneName}
      </span>
    );
  }
  if (editParam) {
    return <span className="drums-muted">pick an instrument</span>;
  }
  if (!isPlaying || step < 0) return <span className="drums-muted">stopped</span>;
  return <span className="drums-muted">kick · step {step + 1}</span>;
}
