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
  /** When the active tab is a device, controls whether the device
   *  header (name / connection state / panic) slides down above the
   *  instrument panel. Toggled by re-clicking the active device tab. */
  deviceDetailsOpen: boolean;

  setMidiReady: (ready: boolean) => void;
  setMidiError: (err: string | null) => void;
  setDevices: (devices: DeviceEntry[]) => void;
  setActiveTab: (tab: TabId) => void;
  /** Tab-bar click handler — navigates if the tab isn't active,
   *  toggles the slide-down header if a device tab is re-clicked. */
  onTabClick: (tab: TabId) => void;
}

const isDeviceTab = (t: TabId): t is { kind: 'device'; deviceId: string } =>
  typeof t === 'object' && t.kind === 'device';

const tabsEqual = (a: TabId, b: TabId): boolean => {
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (typeof a === 'object' && typeof b === 'object') return a.deviceId === b.deviceId;
  return false;
};

export const useAppStore = create<AppState>((set) => ({
  midiReady: false,
  midiError: null,
  devices: [],
  activeTab: 'home',
  deviceDetailsOpen: false,

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

  setActiveTab: (tab) => set({ activeTab: tab, deviceDetailsOpen: false }),

  onTabClick: (tab) =>
    set((s) => {
      // Re-clicking the active device tab toggles the slide-down header.
      if (isDeviceTab(tab) && tabsEqual(s.activeTab, tab)) {
        return { deviceDetailsOpen: !s.deviceDetailsOpen };
      }
      // Otherwise navigate, and reset the slide-down to closed.
      return { activeTab: tab, deviceDetailsOpen: false };
    })
}));
