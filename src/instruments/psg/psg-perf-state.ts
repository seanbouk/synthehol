import { create } from 'zustand';
import { engineRegistry } from '../../audio/engine-registry';

/**
 * Per-device PSG *performance* state — pitch bend, mod wheel.
 *
 * Distinct from psg-state because these aren't part of the patch:
 *   - They reflect a momentary controller position, not a tweakable
 *     setting.
 *   - They don't persist to localStorage; they reset to centre/zero
 *     on each session.
 *   - They're driven primarily by MIDI input but writeable from the
 *     UI (the on-screen wheels).
 *
 * Engine writes via fromEngine=true so the round-trip back to the
 * engine is skipped (the engine already set the DSP param).
 */
export interface PSGPerf {
  bend: number;     // semitones, -2..+2
  modwheel: number; // 0..1
}

const DEFAULT_PERF: PSGPerf = { bend: 0, modwheel: 0 };

interface PSGPerfStateShape {
  perfPerDevice: Record<string, PSGPerf>;
  setBend(deviceId: string, value: number, fromEngine?: boolean): void;
  setModWheel(deviceId: string, value: number, fromEngine?: boolean): void;
}

export const usePSGPerfStore = create<PSGPerfStateShape>((set) => ({
  perfPerDevice: {},

  setBend(deviceId, value, fromEngine = false) {
    set((s) => ({
      perfPerDevice: {
        ...s.perfPerDevice,
        [deviceId]: { ...(s.perfPerDevice[deviceId] ?? DEFAULT_PERF), bend: value }
      }
    }));
    if (!fromEngine) {
      const engine = engineRegistry.get(deviceId) as
        | { setParam?: (n: string, v: number) => void }
        | undefined;
      engine?.setParam?.('bend', value);
    }
  },

  setModWheel(deviceId, value, fromEngine = false) {
    set((s) => ({
      perfPerDevice: {
        ...s.perfPerDevice,
        [deviceId]: { ...(s.perfPerDevice[deviceId] ?? DEFAULT_PERF), modwheel: value }
      }
    }));
    if (!fromEngine) {
      const engine = engineRegistry.get(deviceId) as
        | { setParam?: (n: string, v: number) => void }
        | undefined;
      engine?.setParam?.('modwheel', value);
    }
  }
}));

export function usePSGPerf(deviceId: string): PSGPerf {
  return usePSGPerfStore((s) => s.perfPerDevice[deviceId] ?? DEFAULT_PERF);
}
