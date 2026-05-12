import { PSG_DEFAULTS, type PSGParams } from './psg-defaults';

/**
 * Per-device PSG patch persistence.
 *
 * Keyed by MIDIInput.id, which Chrome returns as a stable hash per
 * device+browser-profile pair. Same controller plugged into the same
 * machine resolves to the same id across sessions, so the user gets
 * their last patch back automatically.
 *
 * Writes are debounced ~200ms so rapid knob movement doesn't thrash
 * localStorage. The stored payload is schema-versioned and merged with
 * current defaults on load, so adding new PSGParams later doesn't break
 * old saves — newly-introduced fields get their defaults.
 */
const KEY_PREFIX = 'synthehol:psg:';
const SAVE_DEBOUNCE_MS = 200;
const SCHEMA_VERSION = 1;

interface StoredPSG {
  v: number;
  params: PSGParams;
}

const key = (deviceId: string) => KEY_PREFIX + deviceId;

export function loadPSG(deviceId: string): PSGParams | null {
  try {
    const raw = localStorage.getItem(key(deviceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPSG;
    if (parsed.v !== SCHEMA_VERSION) return null;
    // Merge defaults so params added after this patch was saved still work.
    return { ...PSG_DEFAULTS, ...parsed.params };
  } catch {
    return null;
  }
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function savePSG(deviceId: string, params: PSGParams): void {
  const existing = saveTimers.get(deviceId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    saveTimers.delete(deviceId);
    try {
      const payload: StoredPSG = { v: SCHEMA_VERSION, params };
      localStorage.setItem(key(deviceId), JSON.stringify(payload));
    } catch {
      // Quota exceeded or localStorage disabled — fail silently.
    }
  }, SAVE_DEBOUNCE_MS);
  saveTimers.set(deviceId, timer);
}

export function clearPSG(deviceId: string): void {
  const existing = saveTimers.get(deviceId);
  if (existing) {
    clearTimeout(existing);
    saveTimers.delete(deviceId);
  }
  try {
    localStorage.removeItem(key(deviceId));
  } catch {
    // ignore
  }
}
