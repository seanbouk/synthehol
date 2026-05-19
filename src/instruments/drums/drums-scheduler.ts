/**
 * Look-ahead sequencer with per-lane (polymetric) advancement and
 * full per-step parameter handling.
 *
 * Each lane keeps its own scheduling state — nextStepTime, stepIndex,
 * loopCount — so lanes with different lengths advance independently.
 * The audio loop ticks every 25 ms and schedules any step whose
 * earliest possible hit (factoring in negative uTime) falls inside
 * the look-ahead window.
 *
 * Per-step handling per scheduled step:
 *   condition  — skip if loop-count doesn't satisfy it
 *   probability — random gate at schedule time
 *   uTime      — shifts the hit time by ±stepDur/2
 *   ratchet    — N evenly-spaced sub-hits across the step, with a
 *                slight velocity ramp down so they read as a roll
 *   mute       — skips the hit but advances the step pointer
 *
 * Visual playhead advances on a separate rAF loop that watches
 * ctx.currentTime and pops queued (lane, step) pairs as the audio
 * clock crosses each one — keeps the visible step in sync with the
 * audible step without coupling to the coarse interval tick.
 */

import type { DrumsEngine } from '../../audio/drums-engine';
import {
  useDrumsStore,
  PATTERN_LANES,
  type StepState,
  type StepCondition
} from './drums-state';

const LOOKAHEAD_MS = 25;
/** Audio-side schedule window. We always schedule at least the next
 *  step's earliest possible hit (i.e. with -50% uTime) so negative
 *  uTimes can land in the future without being clipped. */
const SCHEDULE_AHEAD_S = 0.1;

interface LaneCursor {
  nextStepTime: number;
  stepIndex: number;
  loopCount: number;
}

let intervalId: number | null = null;
let rafId: number | null = null;

let lanes: LaneCursor[] = [];
let displayQueue: { lane: number; step: number; at: number }[] = [];

let activeCtx: AudioContext | null = null;
let activeEngine: DrumsEngine | null = null;

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function startScheduler(ctx: AudioContext, engine: DrumsEngine): void {
  if (intervalId !== null) return;

  activeCtx = ctx;
  activeEngine = engine;

  const t0 = ctx.currentTime + 0.05;
  lanes = Array.from({ length: PATTERN_LANES }, () => ({
    nextStepTime: t0,
    stepIndex: 0,
    loopCount: 0
  }));
  displayQueue = [];

  intervalId = window.setInterval(scheduleAhead, LOOKAHEAD_MS);

  const visualLoop = () => {
    if (!activeCtx) return;
    const now = activeCtx.currentTime;
    while (displayQueue.length > 0 && displayQueue[0]!.at <= now) {
      const item = displayQueue.shift()!;
      useDrumsStore.getState().setCurrentStepForLane(item.lane, item.step);
    }
    rafId = requestAnimationFrame(visualLoop);
  };
  rafId = requestAnimationFrame(visualLoop);
}

export function stopScheduler(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  displayQueue = [];
  lanes = [];
  activeCtx = null;
  activeEngine = null;
}

// ─────────────────────────────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────────────────────────────

function scheduleAhead(): void {
  if (!activeCtx || !activeEngine) return;
  const state = useDrumsStore.getState();
  if (!state.isPlaying) {
    stopScheduler();
    return;
  }

  const stepDur = 60 / state.bpm / 4; // 16th-note duration in seconds
  // Account for max negative uTime: the earliest a hit can land is
  // stepDur/2 before its nominal time. Schedule the step when its
  // earliest possible hit is within the audio look-ahead window.
  const horizon = activeCtx.currentTime + SCHEDULE_AHEAD_S + stepDur * 0.5;

  for (let laneIdx = 0; laneIdx < PATTERN_LANES; laneIdx++) {
    const cursor = lanes[laneIdx];
    const lane = state.pattern.lanes[laneIdx];
    if (!cursor || !lane) continue;
    const laneLength = Math.max(1, Math.min(lane.steps.length, lane.length));

    while (cursor.nextStepTime < horizon) {
      const cell = lane.steps[cursor.stepIndex];
      if (cell) {
        scheduleCell(
          laneIdx,
          cursor.loopCount,
          cell,
          cursor.nextStepTime,
          stepDur
        );
      }

      // Always queue the visual playhead — even for skipped/muted
      // steps so the cursor visibly advances.
      displayQueue.push({
        lane: laneIdx,
        step: cursor.stepIndex,
        at: cursor.nextStepTime
      });

      cursor.nextStepTime += stepDur;
      cursor.stepIndex += 1;
      if (cursor.stepIndex >= laneLength) {
        cursor.stepIndex = 0;
        cursor.loopCount += 1;
      }
    }
  }
}

function scheduleCell(
  laneIdx: number,
  loopCount: number,
  cell: StepState,
  nominalTime: number,
  stepDur: number
): void {
  if (!cell.on || cell.mute) return;
  if (!passesCondition(cell.condition, loopCount)) return;
  if (cell.probability < 1 && Math.random() > cell.probability) return;

  // uTime shifts the whole step (and its ratchets) by ±stepDur/2.
  const baseTime = nominalTime + cell.uTime * stepDur;
  // Clamp to currentTime — a heavy negative uTime past the past is
  // a no-op rather than a glitch.
  const now = activeCtx?.currentTime ?? 0;
  const safeBase = Math.max(baseTime, now + 0.001);

  // Ratchets — N evenly-spaced sub-hits across the step duration,
  // with a slight velocity ramp down so they read like a roll. The
  // span we ratchet across is the gate length capped to one step.
  const r = cell.ratchet;
  const span = Math.min(cell.length, 1.0) * stepDur;
  const subSpacing = r > 1 ? span / r : 0;

  for (let i = 0; i < r; i++) {
    const t = safeBase + i * subSpacing;
    // Roll velocity envelope — 1.0 → 0.6 across the ratchets.
    const ratchetScale = r === 1 ? 1 : 1.0 - (i / (r - 1)) * 0.4;
    const v = cell.velocity * ratchetScale;
    activeEngine!.trigger(laneIdx, t, v);
  }
}

function passesCondition(cond: StepCondition, loopCount: number): boolean {
  switch (cond.kind) {
    case 'none':
      return true;
    case 'every':
      // 1-based loop indexing reads more naturally: "every 2" plays
      // on loops 2, 4, 6, … (i.e. the 2nd, 4th, etc. iteration).
      return (loopCount + 1) % cond.n === 0;
    case 'notEvery':
      return (loopCount + 1) % cond.n !== 0;
  }
}
