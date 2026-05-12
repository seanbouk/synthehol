import type { DeviceProfile, AbstractSlot } from '../types/midi';

const minilab3: DeviceProfile = {
  name: 'Arturia Minilab 3',
  matches: (port) => /Minilab/i.test(port.name ?? ''),
  ccToSlot: {
    86: { kind: 'knob', index: 1 },
    87: { kind: 'knob', index: 2 },
    89: { kind: 'knob', index: 3 },
    90: { kind: 'knob', index: 4 },
    110: { kind: 'knob', index: 5 },
    111: { kind: 'knob', index: 6 },
    116: { kind: 'knob', index: 7 },
    117: { kind: 'knob', index: 8 },
    14: { kind: 'slider', index: 1 },
    15: { kind: 'slider', index: 2 },
    30: { kind: 'slider', index: 3 },
    31: { kind: 'slider', index: 4 },
    28: { kind: 'encoder' },
    1: { kind: 'modwheel' },
    64: { kind: 'sustain' }
  }
};

const PROFILES: DeviceProfile[] = [minilab3];

export function profileFor(port: MIDIInput): DeviceProfile | null {
  return PROFILES.find((p) => p.matches(port)) ?? null;
}

export function slotForCC(profile: DeviceProfile, cc: number): AbstractSlot | null {
  return profile.ccToSlot[cc] ?? null;
}
