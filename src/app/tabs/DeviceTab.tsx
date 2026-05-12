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
        <strong>PSG</strong> (mono, last-note-wins). Faust-compiled DSP. M4 —
        2 oscillators with per-waveform shape morph, multimode resonant filter,
        ADSR, drive (soft/fold), LFO, ring mod. Pitch bend and mod-wheel vibrato
        are wired through MIDI. Knobs / sliders wire up in M5.
      </p>
      <p className="muted">
        Drive any DSP param from the dev console while this tab is active:{' '}
        <code>synthehol.setParam('cutoff', 1500)</code>. The full param list is
        logged at instrument start.
      </p>

      <button className="secondary" onClick={panic}>Panic</button>
    </div>
  );
}
