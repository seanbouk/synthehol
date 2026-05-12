import { useCallback } from 'react';
import { Knob } from '../../ui-kit/Knob';
import { Slider } from '../../ui-kit/Slider';
import { ButtonGroup } from '../../ui-kit/ButtonGroup';
import { engineRegistry } from '../../audio/engine-registry';
import { usePSGParams, usePSGStore } from './psg-state';
import type { PSGParams } from './psg-defaults';
import { Oscilloscope } from './Oscilloscope';
import { ADSRCurve } from './ADSRCurve';
import type { PSGEngine } from '../../audio/psg-engine';

const WAVE_OPTIONS = [
  { value: 0, label: 'Pulse' },
  { value: 1, label: 'Ramp' },
  { value: 2, label: 'Sine' },
  { value: 3, label: 'Noise' }
];

const OCTAVE_OPTIONS = [
  { value: -2, label: '−2' },
  { value: -1, label: '−1' },
  { value: 0, label: '0' },
  { value: 1, label: '+1' },
  { value: 2, label: '+2' }
];

const FILTER_OPTIONS = [
  { value: 0, label: 'LP' },
  { value: 1, label: 'HP' },
  { value: 2, label: 'BP' },
  { value: 3, label: 'Notch' }
];

const DRIVE_OPTIONS = [
  { value: 0, label: 'Soft' },
  { value: 1, label: 'Fold' }
];

const LFO_DEST_OPTIONS = [
  { value: 0, label: 'Pitch' },
  { value: 1, label: 'Cutoff' },
  { value: 2, label: 'Amp' },
  { value: 3, label: 'Shape' }
];

function fmtHz(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${v.toFixed(0)} Hz`;
}
function fmtMs(v: number): string {
  return v < 1 ? `${(v * 1000).toFixed(0)} ms` : `${v.toFixed(2)} s`;
}
function fmtCents(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(0)} ¢`;
}

export function PSGPanel({ deviceId }: { deviceId: string }) {
  const params = usePSGParams(deviceId);
  const setParam = usePSGStore((s) => s.setParam);

  const set = useCallback(
    <K extends keyof PSGParams>(name: K, value: PSGParams[K]) => {
      setParam(deviceId, name, value);
    },
    [deviceId, setParam]
  );

  // Engine reference for the oscilloscope's AnalyserNode.
  const engine = engineRegistry.get(deviceId) as PSGEngine | undefined;

  return (
    <div className="psg-panel">

      <section className="psg-section">
        <h3>Oscillators</h3>
        <div className="psg-row">
          <ButtonGroup
            label="OSC 1"
            value={params.osc1_wave}
            options={WAVE_OPTIONS}
            onChange={(v) => set('osc1_wave', v)}
          />
          <ButtonGroup
            label="OSC 2"
            value={params.osc2_wave}
            options={WAVE_OPTIONS}
            onChange={(v) => set('osc2_wave', v)}
          />
        </div>
        <div className="psg-row">
          <ButtonGroup
            label="OSC 2 octave"
            value={params.osc2_octave}
            options={OCTAVE_OPTIONS}
            onChange={(v) => set('osc2_octave', v)}
          />
        </div>
        <div className="psg-row">
          <Knob
            label="Shape"
            value={params.shape}
            min={0} max={1}
            onChange={(v) => set('shape', v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="OSC mix"
            value={params.osc_mix}
            min={0} max={1} step={0.01}
            onChange={(v) => set('osc_mix', v)}
            format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`}
          />
          <Slider
            label="OSC 2 detune"
            value={params.osc2_detune}
            min={-50} max={50} step={0.5}
            onChange={(v) => set('osc2_detune', v)}
            format={fmtCents}
          />
        </div>
        <div className="psg-row">
          <ButtonGroup
            label="Sync"
            value={params.sync_on}
            options={[{ value: 0, label: 'Off' }, { value: 1, label: 'On' }]}
            onChange={(v) => set('sync_on', v)}
          />
          <ButtonGroup
            label="Ring mod"
            value={params.ring_on}
            options={[{ value: 0, label: 'Off' }, { value: 1, label: 'On' }]}
            onChange={(v) => set('ring_on', v)}
          />
        </div>
      </section>

      <section className="psg-section">
        <h3>Drive</h3>
        <div className="psg-row">
          <Knob
            label="Amount"
            value={params.drive}
            min={0} max={1}
            onChange={(v) => set('drive', v)}
            format={(v) => v.toFixed(2)}
          />
          <ButtonGroup
            label="Type"
            value={params.drive_type}
            options={DRIVE_OPTIONS}
            onChange={(v) => set('drive_type', v)}
          />
        </div>
      </section>

      <section className="psg-section">
        <h3>Filter</h3>
        <div className="psg-row">
          <Knob
            label="Cutoff"
            value={params.cutoff}
            min={20} max={20000} log
            onChange={(v) => set('cutoff', v)}
            format={fmtHz}
          />
          <Knob
            label="Resonance"
            value={params.resonance}
            min={0} max={0.99}
            onChange={(v) => set('resonance', v)}
            format={(v) => v.toFixed(2)}
          />
          <Knob
            label="Env amount"
            value={params.filter_env_amount}
            min={-1} max={1}
            onChange={(v) => set('filter_env_amount', v)}
            format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
          />
        </div>
        <div className="psg-row">
          <ButtonGroup
            label="Mode"
            value={params.filter_mode}
            options={FILTER_OPTIONS}
            onChange={(v) => set('filter_mode', v)}
          />
        </div>
      </section>

      <section className="psg-section">
        <h3>Envelope</h3>
        <div className="psg-row">
          <Knob
            label="Attack"
            value={params.attack}
            min={0.001} max={5} log
            onChange={(v) => set('attack', v)}
            format={fmtMs}
          />
          <Knob
            label="Decay"
            value={params.decay}
            min={0.001} max={5} log
            onChange={(v) => set('decay', v)}
            format={fmtMs}
          />
          <Knob
            label="Sustain"
            value={params.sustain}
            min={0} max={1}
            onChange={(v) => set('sustain', v)}
            format={(v) => v.toFixed(2)}
          />
          <Knob
            label="Release"
            value={params.release}
            min={0.001} max={5} log
            onChange={(v) => set('release', v)}
            format={fmtMs}
          />
        </div>
        <ADSRCurve
          attack={params.attack}
          decay={params.decay}
          sustain={params.sustain}
          release={params.release}
        />
      </section>

      <section className="psg-section">
        <h3>LFO</h3>
        <div className="psg-row">
          <Slider
            label="Rate"
            value={params.lfo_rate}
            min={0.1} max={20} step={0.05}
            onChange={(v) => set('lfo_rate', v)}
            format={(v) => `${v.toFixed(2)} Hz`}
          />
          <Slider
            label="Depth"
            value={params.lfo_depth}
            min={0} max={1} step={0.01}
            onChange={(v) => set('lfo_depth', v)}
            format={(v) => v.toFixed(2)}
          />
          <ButtonGroup
            label="Destination"
            value={params.lfo_dest}
            options={LFO_DEST_OPTIONS}
            onChange={(v) => set('lfo_dest', v)}
          />
        </div>
      </section>

      <section className="psg-section">
        <h3>Output</h3>
        {engine && <Oscilloscope analyser={engine.analyser} />}
      </section>
    </div>
  );
}
