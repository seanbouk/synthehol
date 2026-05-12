import type { Engine } from './engine';

/**
 * Module-level registry of device-id → engine. Lives outside React so it
 * survives remounts and HMR; engine objects hold audio graph state that
 * React shouldn't own.
 */
const engines = new Map<string, Engine>();

export const engineRegistry = {
  set(deviceId: string, engine: Engine): void {
    engines.set(deviceId, engine);
  },

  get(deviceId: string): Engine | undefined {
    return engines.get(deviceId);
  },

  remove(deviceId: string): void {
    const engine = engines.get(deviceId);
    if (engine) {
      engine.destroy();
      engines.delete(deviceId);
    }
  },

  has(deviceId: string): boolean {
    return engines.has(deviceId);
  },

  panicAll(): void {
    for (const e of engines.values()) e.panic();
  }
};
