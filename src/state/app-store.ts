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
   *  details drop-down (name / connection state / panic) is open.
   *  Toggled by re-clicking the active device tab. */
  deviceDetailsOpen: boolean;
  /** Active device-tab button's left edge, in viewport pixels. The
   *  details menu uses this to anchor its left edge under the button. */
  activeTabLeft: number | null;

  setMidiReady: (ready: boolean) => void;
  setMidiError: (err: string | null) => void;
  setDevices: (devices: DeviceEntry[]) => void;
  setActiveTab: (tab: TabId) => void;
  /** Tab-bar click handler — navigates if the tab isn't active,
   *  toggles the drop-down if the active device tab is re-clicked. */
  onTabClick: (tab: TabId) => void;
  setActiveTabLeft: (left: number | null) => void;
  closeDeviceDetails: () => void;
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
  activeTabLeft: null,

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
      // Re-clicking the active device tab toggles the drop-down.
      if (isDeviceTab(tab) && tabsEqual(s.activeTab, tab)) {
        return { deviceDetailsOpen: !s.deviceDetailsOpen };
      }
      // Otherwise navigate, and close the drop-down.
      return { activeTab: tab, deviceDetailsOpen: false };
    }),

  setActiveTabLeft: (left) => set({ activeTabLeft: left }),
  closeDeviceDetails: () => set({ deviceDetailsOpen: false })
}));
