import type { AbstractSlot } from '../../types/midi';
import type { PSGParamName, PSGParams } from './psg-defaults';

/**
 * MIDI hardware → PSG parameter mapping.
 *
 * Knob / slider / encoder are routed to specific PSG params. The
 * transform converts MIDI's 0..127 (or relative for encoder) into the
 * param's actual range, with log scaling where it sounds right (cutoff,
 * envelope times, LFO rate).
 */

/** 0..1 input → min..max output on a logarithmic curve. */
function logScale(t: number, min: number, max: number): number {
  return min * Math.pow(max / min, t);
}

export interface SlotMappingResult {
  name: PSGParamName;
  value: PSGParams[PSGParamName];
}

/**
 * Map a slot input to a PSG param + transformed value.
 *
 * For encoders, `currentOsc1Wave` is needed so we can cycle relative.
 * Returns null when the slot has no PSG mapping (which is fine — we
 * just ignore the input).
 */
export function mapSlotToPSG(
  slot: AbstractSlot,
  value: number,
  currentOsc1Wave: number
): SlotMappingResult | null {
  const t = value / 127;

  if (slot.kind === 'knob') {
    switch (slot.index) {
      case 1: return { name: 'shape',     value: t };
      case 2: return { name: 'cutoff',    value: logScale(t, 20, 20000) };
      case 3: return { name: 'resonance', value: t * 0.99 };
      case 4: return { name: 'attack',    value: logScale(t, 0.001, 5) };
      case 5: return { name: 'decay',     value: logScale(t, 0.001, 5) };
      case 6: return { name: 'sustain',   value: t };
      case 7: return { name: 'release',   value: logScale(t, 0.001, 5) };
      case 8: return { name: 'drive',     value: t };
    }
    return null;
  }

  if (slot.kind === 'slider') {
    switch (slot.index) {
      case 1: return { name: 'osc_mix',     value: t };
      case 2: return { name: 'osc2_detune', value: (t - 0.5) * 100 }; // ±50 cents
      case 3: return { name: 'lfo_rate',    value: logScale(t, 0.1, 20) };
      case 4: return { name: 'lfo_depth',   value: t };
    }
    return null;
  }

  if (slot.kind === 'encoder') {
    // Most rotary encoders in relative mode send:
    //   1..63   = CW (positive delta)
    //   65..127 = CCW (negative delta, 128 - value)
    // Absolute encoders (sending 0..127 linearly) won't behave well here
    // — user can switch encoder mode in their device's settings.
    let delta = 0;
    if (value >= 1 && value <= 63) delta = value;
    else if (value >= 65 && value <= 127) delta = value - 128;
    if (delta === 0) return null;

    const current = Math.round(currentOsc1Wave);
    const next = ((current + delta) % 4 + 4) % 4;
    return { name: 'osc1_wave', value: next };
  }

  return null;
}
