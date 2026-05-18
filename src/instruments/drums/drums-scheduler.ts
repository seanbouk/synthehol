/**
 * Look-ahead sequencer (Chris Wilson pattern).
 *
 * A 25 ms `setInterval` wakes the scheduler. Each tick it walks forward
 * from `nextStepTime`, scheduling every step that falls inside a 100 ms
 * look-ahead window. Audio events are start()'d on the AudioContext
 * clock so they fire sample-accurately regardless of setInterval jitter.
 *
 * A separate requestAnimationFrame loop watches `ctx.currentTime` and
 * advances `store.currentStep` as the audio clock crosses each
 * scheduled step time — that decouples the visible playhead from the
 * coarse interval ticks.
 *
 * Tempo changes while playing are picked up next time we compute a
 * step duration. Already-scheduled hits keep their original time —
 * tempo changes affect *future* steps, not in-flight ones.
 */

import type { DrumsEngine } from '../../audio/drums-engine';
import { useDrumsStore, PATTERN_LANES, PATTERN_STEPS } from './drums-state';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

let intervalId: number | null = null;
let rafId: number | null = null;

/** Audio-clock time of the next step we'll schedule. */
let nextStepTime = 0;
/** Index of the next step to schedule (modulo PATTERN_STEPS). */
let nextStepIndex = 0;
/** Queue of step indices and their audio-clock display times. */
let displayQueue: { step: number; at: number }[] = [];

let activeCtx: AudioContext | null = null;
let activeEngine: DrumsEngine | null = null;

export function startScheduler(ctx: AudioContext, engine: DrumsEngine): void {
  if (intervalId !== null) return; // already running

  activeCtx = ctx;
  activeEngine = engine;
  nextStepTime = ctx.currentTime + 0.05; // start a hair ahead of "now"
  nextStepIndex = 0;
  displayQueue = [];

  intervalId = window.setInterval(scheduleAhead, LOOKAHEAD_MS);

  const visualLoop = () => {
    if (!activeCtx) return;
    while (displayQueue.length > 0 && displayQueue[0]!.at <= activeCtx.currentTime) {
      const item = displayQueue.shift()!;
      useDrumsStore.getState().setCurrentStep(item.step);
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
  activeCtx = null;
  activeEngine = null;
}

function scheduleAhead(): void {
  if (!activeCtx || !activeEngine) return;
  const state = useDrumsStore.getState();
  if (!state.isPlaying) {
    stopScheduler();
    return;
  }

  const stepDur = 60 / state.bpm / 4; // 16th-note duration in seconds
  const horizon = activeCtx.currentTime + SCHEDULE_AHEAD_S;

  while (nextStepTime < horizon) {
    for (let lane = 0; lane < PATTERN_LANES; lane++) {
      const cell = state.pattern[lane]?.[nextStepIndex];
      if (cell?.on) {
        activeEngine.trigger(lane, nextStepTime, cell.velocity);
      }
    }
    displayQueue.push({ step: nextStepIndex, at: nextStepTime });

    nextStepTime += stepDur;
    nextStepIndex = (nextStepIndex + 1) % PATTERN_STEPS;
  }
}
