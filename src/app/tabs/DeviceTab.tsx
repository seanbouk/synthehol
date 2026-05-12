import { useAppStore } from '../../state/app-store';

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
    <div className="panel">
      <h2>{device.name}</h2>
      <p className="muted">
        {device.manufacturer} · state: {device.state} · connection: {device.connection}
      </p>
      <h3>Instrument</h3>
      <p className="muted">
        Instrument picker arrives in a later milestone. PSG synth coming in M3 — incoming
        MIDI is being decoded and logged to the browser console for now.
      </p>
    </div>
  );
}
