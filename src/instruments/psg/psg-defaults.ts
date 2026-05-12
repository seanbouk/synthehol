/**
 * Default PSG parameter values, one entry per DSP-exposed param.
 * Mirrors the defaults baked into public/dsp/psg.dsp so a fresh device
 * tab matches what the DSP would produce if no UI is touched.
 */
export interface PSGParams {
  // Voice
  shape: number;             // 0..1
  osc1_wave: number;         // 0..3 (pulse / ramp / sine / noise)
  osc2_wave: number;         // 0..3
  osc2_octave: number;       // -2..+2 (integer)
  osc2_detune: number;       // -50..+50 cents
  osc_mix: number;           // 0..1
  sync_on: number;           // 0 / 1 (DSP no-op for now)
  ring_on: number;           // 0 / 1

  // Drive (waveshaper)
  drive_on: number;          // 0 / 1 — section bypass
  drive: number;             // 0..1
  drive_type: number;        // 0 = soft, 1 = fold

  // Filter
  filter_on: number;         // 0 / 1 — section bypass
  cutoff: number;            // 20..20000 Hz
  resonance: number;         // 0..0.99
  filter_mode: number;       // 0 = LP, 1 = HP, 2 = BP, 3 = Notch
  filter_env_amount: number; // -1..+1

  // Envelope
  attack: number;            // 0.001..5 seconds
  decay: number;             // 0.001..5 seconds
  sustain: number;           // 0..1
  release: number;           // 0.001..5 seconds

  // LFO
  lfo_on: number;            // 0 / 1 — section bypass
  lfo_rate: number;          // 0.1..20 Hz
  lfo_depth: number;         // 0..1
  lfo_dest: number;          // 0 = pitch, 1 = cutoff, 2 = amp, 3 = shape
}

export const PSG_DEFAULTS: PSGParams = {
  shape: 0.5,
  osc1_wave: 1,
  osc2_wave: 1,
  osc2_octave: 0,
  osc2_detune: 5,
  osc_mix: 0.3,

  sync_on: 0,
  ring_on: 0,

  drive_on: 0,
  drive: 0,
  drive_type: 0,

  filter_on: 1,
  cutoff: 5000,
  resonance: 0.2,
  filter_mode: 0,
  filter_env_amount: 0.4,

  attack: 0.005,
  decay: 0.2,
  sustain: 0.6,
  release: 0.3,

  lfo_on: 0,
  lfo_rate: 4,
  lfo_depth: 0,
  lfo_dest: 1
};

export type PSGParamName = keyof PSGParams;
