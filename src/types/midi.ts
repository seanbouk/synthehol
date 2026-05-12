/**
 * Abstract control slots — fixed across the app.
 * Per-device profiles map their CCs onto these; per-instrument bindings
 * map these onto instrument parameters. Two layers, kept independent.
 */
export type AbstractSlot =
  | { kind: 'knob'; index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }
  | { kind: 'slider'; index: 1 | 2 | 3 | 4 }
  | { kind: 'encoder' }
  | { kind: 'modwheel' }
  | { kind: 'sustain' };

export interface DeviceProfile {
  name: string;
  matches: (port: MIDIInput) => boolean;
  /** Map of CC number -> abstract slot for this device. */
  ccToSlot: Record<number, AbstractSlot>;
}

export type MidiMessageType =
  | 'note-on'
  | 'note-off'
  | 'cc'
  | 'pitch-bend'
  | 'aftertouch'
  | 'program'
  | 'channel-pressure'
  | 'system';

export interface MidiMessage {
  type: MidiMessageType;
  /** 1-16 for channel-voice messages; 0 for system. */
  channel: number;
  data1: number;
  data2: number;
  raw: Uint8Array;
}

/**
 * After the dispatcher has applied sustain-pedal logic etc.
 * Same shape as MidiMessage minus 'system' (filtered out).
 */
export type DispatchedMessage = Omit<MidiMessage, 'type' | 'raw'> & {
  type: Exclude<MidiMessageType, 'system'>;
};
