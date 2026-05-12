import { create } from 'zustand';

export type FixedTab = 'home' | 'drums' | 'bass' | 'output';
export type TabId = FixedTab | { kind: 'device'; deviceId: string };

export interface DeviceEntry {
  id: string;
  name: string;
  manufacturer: string;
  state: MIDIPortDeviceState;
  connection: MIDIPortConnectionState;
}

interface AppState {
  midiReady: boolean;
  midiError: string | null;
  devices: DeviceEntry[];
  activeTab: TabId;

  setMidiReady: (ready: boolean) => void;
  setMidiError: (err: string | null) => void;
  setDevices: (devices: DeviceEntry[]) => void;
  setActiveTab: (tab: TabId) => void;
}

const isDeviceTab = (t: TabId): t is { kind: 'device'; deviceId: string } =>
  typeof t === 'object' && t.kind === 'device';

export const useAppStore = create<AppState>((set) => ({
  midiReady: false,
  midiError: null,
  devices: [],
  activeTab: 'home',

  setMidiReady: (ready) => set({ midiReady: ready }),
  setMidiError: (err) => set({ midiError: err }),

  setDevices: (devices) =>
    set((s) => {
      let active: TabId = s.activeTab;

      // If active tab is a device that's no longer present, fall back.
      if (isDeviceTab(active)) {
        const currentId = active.deviceId;
        const stillPresent = devices.some((d) => d.id === currentId);
        if (!stillPresent) {
          active = devices.length > 0 ? { kind: 'device', deviceId: devices[0]!.id } : 'home';
        }
      }

      // First device arrives while sitting on Home -> auto-jump to it.
      // Only when transitioning 0 -> >0 to avoid hijacking later reconnects.
      if (active === 'home' && s.devices.length === 0 && devices.length > 0) {
        active = { kind: 'device', deviceId: devices[0]!.id };
      }

      return { devices, activeTab: active };
    }),

  setActiveTab: (tab) => set({ activeTab: tab })
}));
