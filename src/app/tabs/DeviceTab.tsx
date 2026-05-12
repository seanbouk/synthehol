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
        <strong>PSG</strong> (mono, last-note-wins). Faust-compiled DSP. M3 phase 1
        — 1 oscillator, 4 waveforms (pulse / ramp / sine / noise), fixed ADSR.
        Controls land in M4 / M5; for now the keyboard plays it on triangle.
      </p>

      <button className="secondary" onClick={panic}>Panic</button>
    </div>
  );
}
