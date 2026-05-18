/**
 * Drum kit definitions.
 *
 * A KitDef is a fixed 8-lane definition: each lane has a display name,
 * a color (matched across the UI), and a voice. Voices are either
 * synthesised (a function that schedules a hit on the audio graph) or
 * sample-based (a URL — implemented in a later milestone).
 *
 * For the engine spine we only need a synthesised starter kit. Sample
 * voices come once we wire SoundFont / SFZ playback.
 */

/**
 * Voice trigger function. Builds the audio nodes for one hit, connects
 * them to `destination`, and schedules them to start at `time`
 * (AudioContext clock seconds). Velocity is 0..1. The function returns
 * once nodes are scheduled — they self-destruct after their envelope
 * completes via stop(time + duration) + GC.
 */
export type DrumVoiceTrigger = (
  ctx: AudioContext,
  destination: AudioNode,
  time: number,
  velocity: number
) => void;

export type VoiceDef =
  | { kind: 'synth'; trigger: DrumVoiceTrigger }
  | { kind: 'sample'; url: string }; // wired in a later milestone

export interface LaneDef {
  /** Short name shown on the lane label and used in console output. */
  readonly name: string;
  /** Hex colour used for this lane's UI accents. Must match drums CSS. */
  readonly color: string;
  readonly voice: VoiceDef;
}

export interface KitDef {
  readonly id: string;
  readonly name: string;
  /** Exactly 8 lanes — matches the panel's step grid rows. */
  readonly lanes: readonly LaneDef[];
}

/**
 * Lane palette — kept in lockstep with index.css's
 * `.drums-lane-color[data-lane="N"]` selectors. Update both if you
 * change colours.
 */
export const LANE_COLORS = [
  '#ef4444', // 0 KICK
  '#f97316', // 1 SNR
  '#fbbf24', // 2 CHH
  '#eab308', // 3 OHH
  '#84cc16', // 4 CLP
  '#14b8a6', // 5 TOM
  '#60a5fa', // 6 RIM
  '#a78bfa'  // 7 PRC
] as const;
