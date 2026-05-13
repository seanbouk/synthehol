import { useAppStore } from '../../state/app-store';
import { engineRegistry } from '../../audio/engine-registry';

/**
 * Slender drop-down that hangs off the tab bar when the active device
 * tab is re-clicked. Positioned absolute so it overlays the page
 * content rather than pushing it down. Toggled by `deviceDetailsOpen`
 * in app-store.
 */
export function DeviceDetailsMenu() {
  const activeTab = useAppStore((s) => s.activeTab);
  const detailsOpen = useAppStore((s) => s.deviceDetailsOpen);
  const device = useAppStore((s) => {
    const t = s.activeTab;
    if (typeof t !== 'object' || t.kind !== 'device') return undefined;
    return s.devices.find((d) => d.id === t.deviceId);
  });

  // Only meaningful when a device tab is active.
  if (typeof activeTab !== 'object' || activeTab.kind !== 'device' || !device) return null;

  const panic = () => engineRegistry.get(device.id)?.panic();

  return (
    <aside
      className={detailsOpen ? 'device-details-menu open' : 'device-details-menu'}
      aria-hidden={!detailsOpen}
    >
      <div className="device-details-section">
        <div className="device-details-name">{device.name}</div>
        <div className="device-details-meta">{device.manufacturer}</div>
      </div>

      <div className="device-details-section">
        <div className="device-details-row">
          <span className="muted">State</span>
          <span>{device.state}</span>
        </div>
        <div className="device-details-row">
          <span className="muted">Connection</span>
          <span>{device.connection}</span>
        </div>
      </div>

      <button className="secondary device-details-panic" onClick={panic}>
        Panic
      </button>
    </aside>
  );
}
