import { useAppStore } from '../../state/app-store';
import { midiManager } from '../../midi/access';
import { resumeAudioContext } from '../../audio/context';

export function HomeTab() {
  const midiReady = useAppStore((s) => s.midiReady);
  const midiError = useAppStore((s) => s.midiError);
  const devices = useAppStore((s) => s.devices);
  const setMidiReady = useAppStore((s) => s.setMidiReady);
  const setMidiError = useAppStore((s) => s.setMidiError);

  const requestAccess = async () => {
    try {
      // Resume audio first — the click is the user gesture browsers
      // require to allow audio output. Then request MIDI; granting it
      // fires midiManager.maybeNotify which runs syncDevices, by which
      // time AudioContext exists so engines can be created.
      await resumeAudioContext();
      await midiManager.request();
      setMidiReady(true);
      setMidiError(null);
    } catch (e) {
      setMidiError(e instanceof Error ? e.message : String(e));
      setMidiReady(false);
    }
  };

  return (
    <div className="tab-content-narrow panel">
      <h2>Home</h2>

      {!midiReady && (
        <>
          <p className="muted">Web MIDI access is required to detect controllers.</p>
          <button onClick={requestAccess}>Request MIDI access</button>
        </>
      )}

      {midiError && <div className="error">MIDI error: {midiError}</div>}

      {midiReady && (
        <>
          <h3>Detected MIDI inputs</h3>
          {devices.length === 0 ? (
            <p className="muted">No devices. Plug one in — its tab will appear automatically.</p>
          ) : (
            <ul>
              {devices.map((d) => (
                <li key={d.id}>
                  <strong>{d.name}</strong>
                  <span className="muted">
                    {d.manufacturer} · state: {d.state} · connection: {d.connection}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
