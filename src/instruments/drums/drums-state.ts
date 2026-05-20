/**
 * Drums state — pattern, transport, and edit mode.
 *
 * Pattern: one 16-step pattern with 8 lanes; each lane has its own
 * length so lanes can be polymetric. Each step carries the full
 * Hapax-style per-step parameter set.
 *
 * Edit mode: pick a parameter (editParam) AND a lane (editLane) and
 * the whole 8×16 grid switches into a bar-chart editor for that one
 * lane's one parameter across all steps. Both must be set for edit
 * mode to be active; pressing either picker again clears it.
 *
 * Multi-pattern + chain land in a later phase.
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

/** All 1..8 are valid so the bar-chart editor maps cleanly to 8 rows. */
export type Ratchet = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const RATCHET_VALUES: readonly Ratchet[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Conditional trig — gates a step on the lane's current loop count.
 *   none        always plays (when on)
 *   every  N    plays on loops N, 2N, 3N…   (so 1-in-N)
 *   notEvery N  plays except on those loops (so (N-1)-in-N)
 *
 * "Loop" here means a full pass of the lane (lane.length steps).
 */
export type ConditionN = 2 | 3 | 4 | 8;
export const CONDITION_N_VALUES: readonly ConditionN[] = [2, 3, 4, 8];

export type StepCondition =
  | { kind: 'none' }
  | { kind: 'every'; n: ConditionN }
  | { kind: 'notEvery'; n: ConditionN };

export interface StepState {
  on: boolean;
  velocity: number;        // 0..1
  length: number;          // 0.05..4.0 — fraction of one step
  uTime: number;           // -0.5..+0.5 — fraction of one step
  probability: number;     // 0..1
  ratchet: Ratchet;
  condition: StepCondition;
}

export interface LaneState {
  /** Active step count (1..PATTERN_STEPS). Steps beyond don't play. */
  length: number;
  /** Always PATTERN_STEPS long; only first `length` are active. */
  steps: StepState[];
}

export interface PatternState {
  lanes: LaneState[]; // PATTERN_LANES long
}

/** Parameters that can be edited via the in-grid editor.
 *   bar-chart cells:   velocity, length, probability, ratchet
 *   nudge column:      uTime
 *   discrete picker:   condition (rows = distinct conditional values)
 *
 *  Mute is gone — set velocity to 0 to silence a step. */
export type EditParam =
  | 'velocity'
  | 'length'
  | 'uTime'
  | 'probability'
  | 'ratchet'
  | 'condition';

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

export const PATTERN_LANES = 8;
export const PATTERN_STEPS = 16;

export const DEFAULT_STEP: StepState = {
  on: false,
  velocity: 0.9,
  length: 1.0,
  uTime: 0,
  probability: 1.0,
  ratchet: 1,
  condition: { kind: 'none' }
};

// ─────────────────────────────────────────────────────────────────────
// Pattern construction
// ─────────────────────────────────────────────────────────────────────

function emptyLane(): LaneState {
  return {
    length: PATTERN_STEPS,
    steps: Array.from({ length: PATTERN_STEPS }, () => ({ ...DEFAULT_STEP }))
  };
}

function emptyPattern(): PatternState {
  return {
    lanes: Array.from({ length: PATTERN_LANES }, () => emptyLane())
  };
}

/** Seed pattern — four-on-the-floor groove for the spine starter. */
function seedPattern(): PatternState {
  const p = emptyPattern();
  const turnOn = (lane: number, step: number) => {
    p.lanes[lane]!.steps[step]!.on = true;
  };
  // KICK every quarter
  for (const s of [0, 4, 8, 12]) turnOn(0, s);
  // SNR backbeats
  for (const s of [4, 12]) turnOn(1, s);
  // CHH every 8th
  for (let s = 0; s < 16; s += 2) turnOn(2, s);
  // OHH off-beat
  turnOn(3, 6);
  turnOn(3, 14);
  return p;
}

// ─────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────

interface DrumsStateShape {
  pattern: PatternState;
  isPlaying: boolean;
  bpm: number;
  /** Per-lane visual playhead — entries are -1 when stopped. */
  currentStepPerLane: number[];

  /** Edit-mode picker state. Edit mode is active iff both are non-null. */
  editParam: EditParam | null;
  editLane: number | null;

  toggleStep(lane: number, step: number): void;
  setStepParam<K extends keyof StepState>(
    lane: number,
    step: number,
    name: K,
    value: StepState[K]
  ): void;
  /** Multi-field step update — merges `partial` into the step. */
  patchStep(lane: number, step: number, partial: Partial<StepState>): void;
  setLaneLength(lane: number, length: number): void;
  setBpm(bpm: number): void;
  setPlaying(isPlaying: boolean): void;
  setCurrentStepForLane(lane: number, step: number): void;
  resetPlayheads(): void;
  /** Press an edit-button: select that param, or clear if already selected. */
  toggleEditParam(param: EditParam): void;
  /** Press an instrument button: select that lane, or clear if already selected. */
  toggleEditLane(lane: number): void;
  /** Clear edit mode entirely. */
  exitEditMode(): void;
  clearPattern(): void;
}

const STOPPED_PLAYHEADS = Array.from({ length: PATTERN_LANES }, () => -1);

export const useDrumsStore = create<DrumsStateShape>((set) => ({
  pattern: seedPattern(),
  isPlaying: false,
  bpm: 120,
  currentStepPerLane: STOPPED_PLAYHEADS.slice(),
  editParam: null,
  editLane: null,

  toggleStep(lane, step) {
    set((s) => {
      const cell = s.pattern.lanes[lane]?.steps[step];
      if (!cell) return s;
      return {
        pattern: updateStep(s.pattern, lane, step, { on: !cell.on })
      };
    });
  },

  setStepParam(lane, step, name, value) {
    set((s) => {
      const cell = s.pattern.lanes[lane]?.steps[step];
      if (!cell) return s;
      return {
        pattern: updateStep(s.pattern, lane, step, { [name]: value } as Partial<StepState>)
      };
    });
  },

  patchStep(lane, step, partial) {
    set((s) => {
      const cell = s.pattern.lanes[lane]?.steps[step];
      if (!cell) return s;
      return { pattern: updateStep(s.pattern, lane, step, partial) };
    });
  },

  setLaneLength(lane, length) {
    const clamped = Math.max(1, Math.min(PATTERN_STEPS, Math.round(length)));
    set((s) => {
      const ln = s.pattern.lanes[lane];
      if (!ln) return s;
      const lanes = s.pattern.lanes.slice();
      lanes[lane] = { ...ln, length: clamped };
      return { pattern: { lanes } };
    });
  },

  setBpm(bpm) {
    set({ bpm: Math.max(30, Math.min(300, bpm)) });
  },

  setPlaying(isPlaying) {
    set({
      isPlaying,
      currentStepPerLane: isPlaying
        ? Array.from({ length: PATTERN_LANES }, () => 0)
        : STOPPED_PLAYHEADS.slice()
    });
  },

  setCurrentStepForLane(lane, step) {
    set((s) => {
      if (lane < 0 || lane >= PATTERN_LANES) return s;
      const next = s.currentStepPerLane.slice();
      next[lane] = step;
      return { currentStepPerLane: next };
    });
  },

  resetPlayheads() {
    set({ currentStepPerLane: STOPPED_PLAYHEADS.slice() });
  },

  toggleEditParam(param) {
    // Pressing the active edit button exits edit mode entirely — both
    // columns reset, so re-entering needs two clicks again. Pressing
    // a different edit button just switches the param (lane stays).
    set((s) =>
      s.editParam === param
        ? { editParam: null, editLane: null }
        : { editParam: param }
    );
  },

  toggleEditLane(lane) {
    // Same exit-resets-both behaviour as toggleEditParam.
    set((s) =>
      s.editLane === lane
        ? { editParam: null, editLane: null }
        : { editLane: lane }
    );
  },

  exitEditMode() {
    set({ editParam: null, editLane: null });
  },

  clearPattern() {
    set({
      pattern: emptyPattern(),
      editParam: null,
      editLane: null
    });
  }
}));

// ─────────────────────────────────────────────────────────────────────
// Internal helpers — immutable structural updates
// ─────────────────────────────────────────────────────────────────────

function updateStep(
  pattern: PatternState,
  laneIdx: number,
  stepIdx: number,
  changes: Partial<StepState>
): PatternState {
  const lane = pattern.lanes[laneIdx];
  if (!lane) return pattern;
  const oldStep = lane.steps[stepIdx];
  if (!oldStep) return pattern;
  const newSteps = lane.steps.slice();
  newSteps[stepIdx] = { ...oldStep, ...changes };
  const newLanes = pattern.lanes.slice();
  newLanes[laneIdx] = { ...lane, steps: newSteps };
  return { lanes: newLanes };
}
