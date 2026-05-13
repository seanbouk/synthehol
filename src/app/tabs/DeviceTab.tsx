import { useAppStore } from '../../state/app-store';
import { engineRegistry } from '../../audio/engine-registry';
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

  const panic = () => engineRegistry.get(deviceId)?.panic();

  return (
    <div className="device-tab">
      <div className="panel device-header">
        <div>
          <h2>{device.name}</h2>
          <p className="muted">
            {device.manufacturer} · state: {device.state} · connection: {device.connection}
          </p>
        </div>
        <button className="secondary" onClick={panic}>Panic</button>
      </div>

      <div className="device-stage-wrap">
        <PSGPanel deviceId={deviceId} />
      </div>
    </div>
  );
}
