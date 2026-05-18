/**
 * Drums state — pattern and transport.
 *
 * Single source of truth for the drum machine. The sequencer reads
 * pattern + bpm to schedule hits; the UI reads currentStep to render
 * the playhead and pattern[][] to render lit cells. Step toggles and
 * transport actions go through this store.
 *
 * Spine milestone: one fixed-length 16-step pattern, 8 lanes, no
 * per-step parameters yet besides on/velocity. Multi-pattern + per-
 * step depth land in later milestones.
 */

import { create } from 'zustand';

export interface StepState {
  on: boolean;
  velocity: number; // 0..1
}

export const PATTERN_LANES = 8;
export const PATTERN_STEPS = 16;
export const DEFAULT_VELOCITY = 0.9;

/** Make an empty pattern (all steps off, default velocity). */
function emptyPattern(): StepState[][] {
  return Array.from({ length: PATTERN_LANES }, () =>
    Array.from({ length: PATTERN_STEPS }, () => ({
      on: false,
      velocity: DEFAULT_VELOCITY
    }))
  );
}

/**
 * Seed pattern — a recognisable four-on-the-floor with hats, used as
 * the spine-milestone starter so the engine has something to play
 * immediately. We can ditch this once we have a save/load layer.
 */
function seedPattern(): StepState[][] {
  const p = emptyPattern();
  // KICK every quarter
  for (const s of [0, 4, 8, 12]) p[0]![s]!.on = true;
  // SNR backbeats
  for (const s of [4, 12]) p[1]![s]!.on = true;
  // CHH every 8th
  for (let s = 0; s < 16; s += 2) p[2]![s]!.on = true;
  // OHH off-beat
  p[3]![6]!.on = true;
  p[3]![14]!.on = true;
  return p;
}

interface DrumsStateShape {
  pattern: StepState[][];
  isPlaying: boolean;
  bpm: number;
  /** -1 when stopped; 0..PATTERN_STEPS-1 while playing. Set by scheduler. */
  currentStep: number;

  toggleStep(lane: number, step: number): void;
  setStepVelocity(lane: number, step: number, velocity: number): void;
  setBpm(bpm: number): void;
  setPlaying(isPlaying: boolean): void;
  setCurrentStep(step: number): void;
  clearPattern(): void;
}

export const useDrumsStore = create<DrumsStateShape>((set) => ({
  pattern: seedPattern(),
  isPlaying: false,
  bpm: 120,
  currentStep: -1,

  toggleStep(lane, step) {
    set((s) => {
      const next = s.pattern.map((row) => row.slice());
      const cell = next[lane]?.[step];
      if (!cell) return s;
      next[lane]![step] = { ...cell, on: !cell.on };
      return { pattern: next };
    });
  },

  setStepVelocity(lane, step, velocity) {
    set((s) => {
      const next = s.pattern.map((row) => row.slice());
      const cell = next[lane]?.[step];
      if (!cell) return s;
      next[lane]![step] = { ...cell, velocity };
      return { pattern: next };
    });
  },

  setBpm(bpm) {
    set({ bpm: Math.max(30, Math.min(300, bpm)) });
  },

  setPlaying(isPlaying) {
    set({ isPlaying, currentStep: isPlaying ? 0 : -1 });
  },

  setCurrentStep(step) {
    set({ currentStep: step });
  },

  clearPattern() {
    set({ pattern: emptyPattern() });
  }
}));
