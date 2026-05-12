import { useAppStore } from '../../state/app-store';
import { engineRegistry } from '../../audio/engine-registry';

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
    <div className="panel">
      <h2>{device.name}</h2>
      <p className="muted">
        {device.manufacturer} · state: {device.state} · connection: {device.connection}
      </p>

      <h3>Instrument</h3>
      <p>
        Stub <strong>sine</strong> engine (mono, last-note-wins). Play notes on the
        keyboard to hear it. PSG synth arrives in M3.
      </p>

      <button className="secondary" onClick={panic}>Panic</button>
    </div>
  );
}
