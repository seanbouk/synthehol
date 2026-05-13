import { useAppStore } from '../../state/app-store';
import { PSGPanel } from '../../instruments/psg/PSGPanel';

export function DeviceTab({ deviceId }: { deviceId: string }) {
  const device = useAppStore((s) => s.devices.find((d) => d.id === deviceId));

  if (!device) {
    return (
      <div className="panel">
        <h2>Device disconnected</h2>
        <p className="muted">This device is no longer present.</p>
      </div>
    );
  }

  return (
    <div className="device-tab">
      <div className="device-stage-wrap">
        <PSGPanel deviceId={deviceId} />
      </div>
    </div>
  );
}
