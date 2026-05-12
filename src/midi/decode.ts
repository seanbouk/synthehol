import type { MidiMessage } from '../types/midi';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteName(n: number): string {
  return NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
}

export function decode(data: Uint8Array): MidiMessage {
  const status = data[0] ?? 0;
  const d1 = data[1] ?? 0;
  const d2 = data[2] ?? 0;
  const channel = (status & 0x0f) + 1;
  const type = status & 0xf0;

  if (status >= 0xf0) {
    return { type: 'system', channel: 0, data1: d1, data2: d2, raw: data };
  }
  if (type === 0x90 && d2 > 0) {
    return { type: 'note-on', channel, data1: d1, data2: d2, raw: data };
  }
  if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    return { type: 'note-off', channel, data1: d1, data2: d2, raw: data };
  }
  if (type === 0xb0) return { type: 'cc', channel, data1: d1, data2: d2, raw: data };
  if (type === 0xe0) return { type: 'pitch-bend', channel, data1: d1, data2: d2, raw: data };
  if (type === 0xa0) return { type: 'aftertouch', channel, data1: d1, data2: d2, raw: data };
  if (type === 0xc0) return { type: 'program', channel, data1: d1, data2: d2, raw: data };
  if (type === 0xd0) return { type: 'channel-pressure', channel, data1: d1, data2: d2, raw: data };
  return { type: 'system', channel: 0, data1: d1, data2: d2, raw: data };
}

/** -8192..+8191 (centred at 0). */
export function pitchBendValue(d1: number, d2: number): number {
  return ((d2 << 7) | d1) - 8192;
}
