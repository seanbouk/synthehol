import { useCallback, type ReactNode } from 'react';
import { Knob } from '../../ui-kit/Knob';
import { Slider } from '../../ui-kit/Slider';
import { ButtonGroup } from '../../ui-kit/ButtonGroup';
import { LEDToggle } from '../../ui-kit/LEDToggle';
import { Wheel } from '../../ui-kit/Wheel';
import { usePSGParams, usePSGStore } from './psg-state';
import { usePSGPerf, usePSGPerfStore } from './psg-perf-state';
import type { PSGParams } from './psg-defaults';
import { WaveformPreview } from './WaveformPreview';
import { ADSRCurve } from './ADSRCurve';
import { Stage } from './Stage';

/**
 * PSG instrument panel.
 *
 * Lives inside a fixed 2200×800 Stage that scales uniformly to fit
 * whatever space it's given. All children are absolutely positioned
 * within named zones — no reflow, no responsive layout below the
 * stage boundary.
 *
 * Zones (in stage coordinates):
 *   perf    — pitch/mod wheels                (left column)
 *   osc     — OSC 1/2 + shape + mix + detune  (top middle, wide)
 *   drive   — drive amount + type             (top, right of osc)
 *   filt    — cutoff/reso + env amt + mode    (top middle-right)
 *   lfo     — depth/rate + destination        (top right column)
 *   vox     — two voice waveform screens      (bottom-left)
 *   env     — ADSR knobs + curve              (bottom-right)
 */

const OSC1_WAVE_OPTIONS = [
  { value: 0, label: 'Pulse' },
  { value: 1, label: 'Ramp' },
  { value: 2, label: 'Sine' },
  { value: 3, label: 'Noise' }
];
const OSC2_WAVE_OPTIONS = [
  ...OSC1_WAVE_OPTIONS,
  { value: 4, label: 'Off' }
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

/** Field — bordered card with a title that breaks the border. */
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="psg-field">
      <div className="psg-field-title">{title}</div>
      <div className="psg-field-body">{children}</div>
    </div>
  );
}

export function PSGPanel({ deviceId }: { deviceId: string }) {
  const params = usePSGParams(deviceId);
  const setParam = usePSGStore((s) => s.setParam);
  const perf = usePSGPerf(deviceId);
  const setBend = usePSGPerfStore((s) => s.setBend);
  const setModWheel = usePSGPerfStore((s) => s.setModWheel);

  const set = useCallback(
    <K extends keyof PSGParams>(name: K, value: PSGParams[K]) => {
      setParam(deviceId, name, value);
    },
    [deviceId, setParam]
  );

  const osc2Off = params.osc2_wave === 4;

  return (
    <Stage>
      <div className="psg-body">

        <div className="psg-zone perf">
          <Field title="Wheels">
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', height: '100%' }}>
              <Wheel
                label="Pitch"
                value={perf.bend}
                min={-2} max={2} snapBack
                onChange={(v) => setBend(deviceId, v)}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} st`}
              />
              <Wheel
                label="Mod"
                value={perf.modwheel}
                min={0} max={1}
                onChange={(v) => setModWheel(deviceId, v)}
                format={(v) => v.toFixed(2)}
              />
            </div>
          </Field>
        </div>

        <div className="psg-zone osc">
          <Field title="Oscillators">
            <div className="psg-stack">
              <div className="psg-row">
                <span className="sub-label">OSC 1</span>
                <ButtonGroup
                  value={params.osc1_wave}
                  options={OSC1_WAVE_OPTIONS}
                  onChange={(v) => set('osc1_wave', v)}
                />
              </div>
              <div className="psg-row">
                <span className="sub-label">OSC 2</span>
                <ButtonGroup
                  value={params.osc2_wave}
                  options={OSC2_WAVE_OPTIONS}
                  onChange={(v) => set('osc2_wave', v)}
                />
              </div>
              <div className="psg-row">
                <span className="sub-label">Octave</span>
                <ButtonGroup
                  value={params.osc2_octave}
                  options={OCTAVE_OPTIONS}
                  disabled={osc2Off}
                  onChange={(v) => set('osc2_octave', v)}
                />
              </div>
              <div className="psg-row" style={{ gap: 24 }}>
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
                  disabled={osc2Off}
                  onChange={(v) => set('osc_mix', v)}
                  format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`}
                />
                <Slider
                  label="Detune"
                  value={params.osc2_detune}
                  min={-50} max={50} step={0.5}
                  disabled={osc2Off}
                  onChange={(v) => set('osc2_detune', v)}
                  format={fmtCents}
                />
                <LEDToggle
                  label="Sync"
                  value={params.sync_on}
                  disabled={osc2Off}
                  onChange={(v) => set('sync_on', v)}
                />
                <LEDToggle
                  label="Ring"
                  value={params.ring_on}
                  warn
                  disabled={osc2Off}
                  onChange={(v) => set('ring_on', v)}
                />
              </div>
            </div>
          </Field>
        </div>

        <div className="psg-zone drive">
          <Field title="Drive">
            <div className="psg-stack">
              <Knob
                label="Amount"
                value={params.drive}
                min={0} max={1}
                disabled={!params.drive_on}
                onChange={(v) => set('drive', v)}
                format={(v) => v.toFixed(2)}
              />
              <ButtonGroup
                value={params.drive_type}
                options={DRIVE_OPTIONS}
                disabled={!params.drive_on}
                onChange={(v) => set('drive_type', v)}
              />
              <LEDToggle
                label="Drive"
                value={params.drive_on}
                warn
                onChange={(v) => set('drive_on', v)}
              />
            </div>
          </Field>
        </div>

        <div className="psg-zone filt">
          <Field title="Filter">
            <div className="psg-stack">
              <div className="psg-row" style={{ gap: 24 }}>
                <Knob
                  label="Cutoff"
                  value={params.cutoff}
                  min={20} max={20000} log
                  disabled={!params.filter_on}
                  onChange={(v) => set('cutoff', v)}
                  format={fmtHz}
                />
                <Knob
                  label="Reso"
                  value={params.resonance}
                  min={0} max={0.99}
                  disabled={!params.filter_on}
                  onChange={(v) => set('resonance', v)}
                  format={(v) => v.toFixed(2)}
                />
              </div>
              <Knob
                label="Env amt"
                value={params.filter_env_amount}
                min={-1} max={1}
                disabled={!params.filter_on}
                onChange={(v) => set('filter_env_amount', v)}
                format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
              />
              <ButtonGroup
                value={params.filter_mode}
                options={FILTER_OPTIONS}
                disabled={!params.filter_on}
                onChange={(v) => set('filter_mode', v)}
              />
              <LEDToggle
                label="Filter"
                value={params.filter_on}
                onChange={(v) => set('filter_on', v)}
              />
            </div>
          </Field>
        </div>

        <div className="psg-zone lfo">
          <Field title="LFO">
            <div className="psg-stack">
              <LEDToggle
                label="LFO"
                value={params.lfo_on}
                onChange={(v) => set('lfo_on', v)}
              />
              <ButtonGroup
                label="Destination"
                value={params.lfo_dest}
                options={LFO_DEST_OPTIONS}
                disabled={!params.lfo_on}
                onChange={(v) => set('lfo_dest', v)}
              />
              <div className="psg-row" style={{ gap: 24 }}>
                <Slider
                  label="Depth"
                  value={params.lfo_depth}
                  min={0} max={1} step={0.01}
                  disabled={!params.lfo_on}
                  onChange={(v) => set('lfo_depth', v)}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Rate"
                  value={params.lfo_rate}
                  min={0.1} max={20} step={0.05}
                  disabled={!params.lfo_on}
                  onChange={(v) => set('lfo_rate', v)}
                  format={(v) => `${v.toFixed(2)} Hz`}
                />
              </div>
            </div>
          </Field>
        </div>

        <div className="psg-zone vox">
          <Field title="Voice">
            <div style={{ display: 'flex', gap: 16, height: '100%' }}>
              <WaveformPreview
                osc1_wave={params.osc1_wave}
                osc2_wave={params.osc2_wave}
                shape={params.shape}
                osc_mix={params.osc_mix}
                osc2_octave={params.osc2_octave}
                osc2_detune={params.osc2_detune}
                ring_on={params.ring_on}
                drive_on={params.drive_on}
                drive={params.drive}
                drive_type={params.drive_type}
                phaseLead={0}
                label="Now"
              />
              <WaveformPreview
                osc1_wave={params.osc1_wave}
                osc2_wave={params.osc2_wave}
                shape={params.shape}
                osc_mix={params.osc_mix}
                osc2_octave={params.osc2_octave}
                osc2_detune={params.osc2_detune}
                ring_on={params.ring_on}
                drive_on={params.drive_on}
                drive={params.drive}
                drive_type={params.drive_type}
                phaseLead={8}
                label="+Δt"
              />
            </div>
          </Field>
        </div>

        <div className="psg-zone env">
          <Field title="Envelope">
            <div style={{ display: 'flex', gap: 24, height: '100%' }}>
              <div className="psg-row" style={{ gap: 24, margin: 0, alignItems: 'flex-start' }}>
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
              <div style={{ flex: 1 }}>
                <ADSRCurve
                  attack={params.attack}
                  decay={params.decay}
                  sustain={params.sustain}
                  release={params.release}
                />
              </div>
            </div>
          </Field>
        </div>

      </div>
    </Stage>
  );
}
