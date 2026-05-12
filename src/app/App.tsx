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

/**
 * Called after AudioContext is created (from HomeTab's request button).
 * Retroactively sets up engines for devices that were detected before
 * audio was ready.
 */
export function ensureEnginesForExistingDevices(): void {
  syncDevices();
}

export function App() {
  useEffect(() => midiManager.subscribe(syncDevices), []);
  return <TabContainer />;
}
