import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';
import { midiManager } from '../midi/access';
import { Dispatcher } from '../midi/dispatcher';
import { decode } from '../midi/decode';
import { profileFor } from '../midi/device-profile';
import { classifyPort } from '../midi/port-filter';
import { getAudioContext } from '../audio/context';
import { PSGEngine } from '../audio/psg-engine';
import { engineRegistry } from '../audio/engine-registry';
import { dispatchToEngine } from '../audio/dispatch-to-engine';
import { usePSGStore } from '../instruments/psg/psg-state';
import { TabContainer } from './shell/TabContainer';

/**
 * Module-scoped runtime state — survives React remounts and HMR.
 * - dispatchers: one per MIDIInput; holds sustain pedal state per channel
 * - enginePromises: idempotency guard for the async engine creation
 */
const dispatchers = new Map<string, Dispatcher>();
const enginePromises = new Map<string, Promise<void>>();

async function setupEngineFor(
  deviceId: string,
  ctx: AudioContext,
  dispatcher: Dispatcher,
  profile: ReturnType<typeof profileFor>
): Promise<void> {
  if (engineRegistry.has(deviceId)) return;
  const engine = await PSGEngine.create(ctx);
  // Device may have disconnected during the async setup.
  if (!midiManager.inputs.some((i) => i.id === deviceId)) {
    engine.destroy();
    return;
  }

  // Bridge hardware slot input into the PSG store. The store is the
  // single source of truth — its setParam updates both state and DSP,
  // so UI reflects hardware changes automatically.
  engine.onSlotInput = (name, value) => {
    usePSGStore.getState().setParam(deviceId, name, value as never);
  };

  // Seed the engine with the device's stored PSG params (defaults if
  // first time). This also primes the engine's paramValues cache so
  // encoder cycling has the right "current" osc1_wave.
  const params = usePSGStore.getState().ensure(deviceId);
  for (const [name, value] of Object.entries(params)) {
    engine.setParam(name, value as number);
  }

  engine.output.connect(ctx.destination);
  engineRegistry.set(deviceId, engine);
  dispatcher.subscribe((msg) => dispatchToEngine(msg, engine, profile));
}

function syncDevices(): void {
  const store = useAppStore.getState();
  const allInputs = midiManager.inputs;
  console.groupCollapsed(`[midi] port sync — ${allInputs.length} port(s)`);
  const inputs = allInputs.filter((i) => {
    const result = classifyPort(i.name ?? '');
    if (result.keep) {
      console.log(`[KEEP] ${i.name ?? '(unnamed)'}`);
    } else {
      console.log(`[DROP] ${i.name ?? '(unnamed)'} — matched: ${result.matchedLabel}`);
    }
    return result.keep;
  });
  console.groupEnd();

  store.setDevices(
    inputs.map((i) => ({
      id: i.id,
      name: i.name ?? '(unnamed)',
      manufacturer: i.manufacturer ?? 'unknown',
      state: i.state,
      connection: i.connection
    }))
  );

  // Wire dispatchers and engines for newly seen inputs.
  const ctx = getAudioContext();
  const seen = new Set<string>();
  for (const input of inputs) {
    seen.add(input.id);
    if (!dispatchers.has(input.id)) {
      const d = new Dispatcher();
      input.onmidimessage = (e) => {
        if (e.data) d.ingest(decode(e.data));
      };
      dispatchers.set(input.id, d);
    }
    // Engine setup needs an AudioContext (created on the user's first
    // click in HomeTab). If it doesn't exist yet, this is a no-op; the
    // next sync after audio is initialised will pick the device up.
    if (ctx && !enginePromises.has(input.id)) {
      const dispatcher = dispatchers.get(input.id)!;
      const profile = profileFor(input);
      enginePromises.set(input.id, setupEngineFor(input.id, ctx, dispatcher, profile));
    }
  }

  // Tear down dispatchers and engines for removed inputs.
  for (const id of [...dispatchers.keys()]) {
    if (!seen.has(id)) {
      dispatchers.delete(id);
      engineRegistry.remove(id);
      enginePromises.delete(id);
    }
  }
}

// Devtools convenience: in dev builds, attach a global so you can poke
// at engines from the console without imports. Strip in production.
if (import.meta.env.DEV) {
  (globalThis as unknown as { synthehol: unknown }).synthehol = {
    engineRegistry,
    midiManager,
    appState: () => useAppStore.getState(),
    // Set a DSP param on the active device's engine (if any).
    setParam(name: string, value: number) {
      const tab = useAppStore.getState().activeTab;
      if (typeof tab !== 'object' || tab.kind !== 'device') {
        console.warn('No device tab is active');
        return;
      }
      const engine = engineRegistry.get(tab.deviceId) as
        | { setParam?: (n: string, v: number) => void }
        | undefined;
      if (!engine?.setParam) {
        console.warn('Active engine has no setParam method');
        return;
      }
      engine.setParam(name, value);
    }
  };
}

export function App() {
  useEffect(() => midiManager.subscribe(syncDevices), []);
  return <TabContainer />;
}
