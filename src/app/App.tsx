import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';
import { midiManager } from '../midi/access';
import { Dispatcher } from '../midi/dispatcher';
import { decode } from '../midi/decode';
import { profileFor } from '../midi/device-profile';
import { classifyPort } from '../midi/port-filter';
import { TabContainer } from './shell/TabContainer';

/**
 * One dispatcher per MIDIInput. Sustain state is per-channel within a
 * single device, so dispatchers don't span devices.
 *
 * Lives at module scope rather than in React state because:
 *  - dispatchers hold imperative state (sustain maps) that React shouldn't own
 *  - they survive component remounts (StrictMode double-renders, route changes)
 *  - the audio path will subscribe to them directly in M2
 */
const dispatchers = new Map<string, Dispatcher>();

function syncDevices(): void {
  const store = useAppStore.getState();
  // Hide ports that exist for DAW control, vendor-specific software bridges,
  // or DIN passthrough — see midi/port-filter.ts. Logged on every sync so
  // a silently-dropped musical port is visible in devtools.
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

  // Wire dispatchers for newly seen inputs.
  const seen = new Set<string>();
  for (const input of inputs) {
    seen.add(input.id);
    if (!dispatchers.has(input.id)) {
      const d = new Dispatcher();
      const profile = profileFor(input);
      d.subscribe((msg) => {
        // M1: log only. M2 will route to the instrument bound to this device's tab.
        // Including the resolved slot when this is a CC, to verify the mapping layer.
        if (msg.type === 'cc' && profile) {
          const slot = profile.ccToSlot[msg.data1];
          console.log(`[${input.name}] cc ${msg.data1}=${msg.data2}`, slot ? `→ ${JSON.stringify(slot)}` : '(unmapped)');
        } else {
          console.log(`[${input.name}]`, msg);
        }
      });
      input.onmidimessage = (e) => {
        if (e.data) d.ingest(decode(e.data));
      };
      dispatchers.set(input.id, d);
    }
  }

  // Drop dispatchers for removed inputs.
  for (const id of [...dispatchers.keys()]) {
    if (!seen.has(id)) dispatchers.delete(id);
  }
}

export function App() {
  useEffect(() => {
    const unsubscribe = midiManager.subscribe(syncDevices);
    if (midiManager.ready) syncDevices();
    return unsubscribe;
  }, []);

  return <TabContainer />;
}
