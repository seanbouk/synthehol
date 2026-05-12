import { create } from 'zustand';
import { PSG_DEFAULTS, type PSGParams, type PSGParamName } from './psg-defaults';
import { engineRegistry } from '../../audio/engine-registry';
import { loadPSG, savePSG } from './psg-persistence';

/**
 * Per-device PSG parameter state. Single source of truth: the UI reads
 * from here, MIDI hardware writes here via the engine's onSlotInput
 * callback, and every write also drives the underlying DSP node and
 * persists to localStorage (debounced).
 */
interface PSGStateShape {
  paramsPerDevice: Record<string, PSGParams>;
  ensure(deviceId: string): PSGParams;
  setParam<K extends PSGParamName>(deviceId: string, name: K, value: PSGParams[K]): void;
  resetDevice(deviceId: string): void;
}

export const usePSGStore = create<PSGStateShape>((set, get) => ({
  paramsPerDevice: {},

  ensure(deviceId) {
    const existing = get().paramsPerDevice[deviceId];
    if (existing) return existing;
    // Restore saved patch if present, otherwise start from defaults.
    const fresh = loadPSG(deviceId) ?? { ...PSG_DEFAULTS };
    set((s) => ({ paramsPerDevice: { ...s.paramsPerDevice, [deviceId]: fresh } }));
    return fresh;
  },

  setParam(deviceId, name, value) {
    set((s) => {
      const current = s.paramsPerDevice[deviceId] ?? PSG_DEFAULTS;
      return {
        paramsPerDevice: {
          ...s.paramsPerDevice,
          [deviceId]: { ...current, [name]: value }
        }
      };
    });

    // Drive the DSP. Engine may not be ready yet during startup; that's
    // fine — defaults already match the .dsp's initial values.
    const engine = engineRegistry.get(deviceId) as
      | { setParam?: (n: string, v: number) => void }
      | undefined;
    engine?.setParam?.(name, value as number);

    // Persist (debounced). Read back from store so we save the full
    // merged params object, not just the single field.
    const params = get().paramsPerDevice[deviceId];
    if (params) savePSG(deviceId, params);
  },

  resetDevice(deviceId) {
    const defaults = { ...PSG_DEFAULTS };
    set((s) => ({
      paramsPerDevice: { ...s.paramsPerDevice, [deviceId]: defaults }
    }));
    savePSG(deviceId, defaults);
  }
}));

/** Hook returning the PSGParams for a device, with defaults if unset. */
export function usePSGParams(deviceId: string): PSGParams {
  return usePSGStore((s) => s.paramsPerDevice[deviceId] ?? PSG_DEFAULTS);
}
