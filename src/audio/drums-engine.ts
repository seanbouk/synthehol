/**
 * Drums engine — owns the audio graph for one drum kit.
 *
 * Unlike PSGEngine, the drums engine isn't driven by external MIDI
 * messages; it's driven by the internal sequencer. So it doesn't
 * implement the Engine interface (noteOn/noteOff/pitchBend etc.) —
 * it just exposes a single trigger() method that the scheduler
 * calls with a sample-accurate audio-clock time.
 *
 * Graph:
 *
 *     voice nodes ─► lane gain ─┐
 *     voice nodes ─► lane gain ─┤
 *           …                   ├─► master gain ─► output
 *     voice nodes ─► lane gain ─┘
 *
 * Each lane has its own gain bus so mute/solo/per-lane level can
 * land there without touching the voice code.
 */

import type { KitDef } from '../instruments/drums/kit';

const LANE_COUNT = 8;

export class DrumsEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private laneGains: GainNode[];
  private kit: KitDef;
  readonly output: AudioNode;

  constructor(ctx: AudioContext, kit: KitDef) {
    if (kit.lanes.length !== LANE_COUNT) {
      throw new Error(
        `DrumsEngine expects ${LANE_COUNT} lanes; kit "${kit.id}" has ${kit.lanes.length}`
      );
    }
    this.ctx = ctx;
    this.kit = kit;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.8;

    this.laneGains = Array.from({ length: LANE_COUNT }, () => {
      const g = ctx.createGain();
      g.gain.value = 1.0;
      g.connect(this.masterGain);
      return g;
    });

    this.output = this.masterGain;
  }

  /**
   * Schedule a hit on `laneIdx` at audio-clock time `time` with the
   * given normalised velocity (0..1). Safe to call from a look-ahead
   * scheduler; `time` should be >= ctx.currentTime.
   */
  trigger(laneIdx: number, time: number, velocity: number): void {
    if (laneIdx < 0 || laneIdx >= LANE_COUNT) return;
    const lane = this.kit.lanes[laneIdx];
    if (!lane) return;
    const dest = this.laneGains[laneIdx];
    if (!dest) return;

    if (lane.voice.kind === 'synth') {
      lane.voice.trigger(this.ctx, dest, time, velocity);
    }
    // Sample voices land here in a later milestone.
  }

  /**
   * Replace the active kit. Existing scheduled hits keep playing on
   * the old voices (they're already in the audio graph and will GC
   * naturally); new triggers use the new kit.
   */
  setKit(kit: KitDef): void {
    if (kit.lanes.length !== LANE_COUNT) {
      throw new Error(`Kit must have ${LANE_COUNT} lanes`);
    }
    this.kit = kit;
  }

  /** Hard mute — ramp master gain to 0 over a short fade. */
  panic(): void {
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(0, t + 0.02);
    // Bring it back up after the fade so the next play hits at level.
    this.masterGain.gain.setValueAtTime(0.8, t + 0.05);
  }

  destroy(): void {
    try { this.masterGain.disconnect(); } catch { /* */ }
    for (const g of this.laneGains) {
      try { g.disconnect(); } catch { /* */ }
    }
  }
}
