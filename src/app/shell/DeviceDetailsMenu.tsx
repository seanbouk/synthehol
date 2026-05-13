import { useEffect, useRef } from 'react';
import { useAppStore } from '../../state/app-store';
import { engineRegistry } from '../../audio/engine-registry';

/**
 * Slender drop-down that hangs from the tab bar when the active device
 * tab is re-clicked. Anchored under the active tab button (left edge
 * matched via `activeTabLeft` in app-store) and overlays the page
 * content rather than pushing it. Click-anywhere-outside closes it.
 */
export function DeviceDetailsMenu() {
  const activeTab = useAppStore((s) => s.activeTab);
  const detailsOpen = useAppStore((s) => s.deviceDetailsOpen);
  const activeTabLeft = useAppStore((s) => s.activeTabLeft);
  const close = useAppStore((s) => s.closeDeviceDetails);
  const device = useAppStore((s) => {
    const t = s.activeTab;
    if (typeof t !== 'object' || t.kind !== 'device') return undefined;
    return s.devices.find((d) => d.id === t.deviceId);
  });

  const menuRef = useRef<HTMLElement>(null);

  // Click outside (and not on the active tab button) closes the menu.
  // Listen on capture so we run before the tab button's onClick can
  // re-toggle; if the user clicked the active tab, we leave it to the
  // button to flip the state.
  useEffect(() => {
    if (!detailsOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;       // click inside menu
      if (target.closest('.tabbar .tab.active')) return;    // tab handler will toggle
      close();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [detailsOpen, close]);

  // Only meaningful when a device tab is active.
  if (typeof activeTab !== 'object' || activeTab.kind !== 'device' || !device) return null;

  const panic = () => engineRegistry.get(device.id)?.panic();

  const left = activeTabLeft ?? 12;

  return (
    <aside
      ref={menuRef}
      className={detailsOpen ? 'device-details-menu open' : 'device-details-menu'}
      style={{ left }}
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
