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
import {
  KNOB_COLS, KNOB_ROWS, VSLIDERS, VSLIDER_Y,
  VOX_CHART_1_CX, VOX_CHART_2_CX, ENV_CHART_CX, CHART_Y,
  ENV_CHART_WIDTH, ENV_CHART_HEIGHT
} from './layout';

/**
 * PSG instrument panel.
 *
 * The fixed 2200×800 Stage hosts the body, which lays out fieldset
 * zones (perf, osc, drive, filter, lfo, vox, env). Zone-internal
 * controls (wave selectors, LEDs, pills, screens, ADSR curve) sit
 * inside their fields with the field-body's natural flex layout.
 *
 * The 4×2 knob grid and the 4 vsliders are positioned ABSOLUTELY in
 * body coordinates (using the constants in ./layout.ts), free-floating
 * over the fields. That guarantees the grid IS a grid — every knob and
 * slider references the same axes, so a tweak to one mirror moves
 * everything in lockstep.
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

function Field({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="psg-field">
      <div className="psg-field-title">{title}</div>
      <div className="psg-field-body">{children}</div>
    </div>
  );
}

/** Absolute-position helper. (x, y) anchors to the child's centre. */
function At({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {children}
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

        {/* ── Zones: fieldsets with internal (non-grid) content ─────── */}

        <div className="psg-zone perf">
          <Field title="Wheels">
            <div className="perf-row">
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
              <div className="psg-row">
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
            <div className="psg-stack" style={{ alignItems: 'center' }}>
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
            <div className="psg-stack" style={{ alignItems: 'center' }}>
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
            <div className="psg-stack" style={{ alignItems: 'center' }}>
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
            </div>
          </Field>
        </div>

        <div className="psg-zone vox">
          <Field title="Voice" />
        </div>

        <div className="psg-zone env">
          <Field title="Envelope" />
        </div>

        {/* ── 4×2 knob grid, body-absolute, referencing layout.ts ───── */}

        <At x={KNOB_COLS.c1} y={KNOB_ROWS.r1}>
          <Knob
            label="Shape"
            value={params.shape}
            min={0} max={1}
            onChange={(v) => set('shape', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOB_COLS.c2} y={KNOB_ROWS.r1}>
          <Knob
            label="Drive"
            value={params.drive}
            min={0} max={1}
            disabled={!params.drive_on}
            onChange={(v) => set('drive', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOB_COLS.c3} y={KNOB_ROWS.r1}>
          <Knob
            label="Cutoff"
            value={params.cutoff}
            min={20} max={20000} log
            disabled={!params.filter_on}
            onChange={(v) => set('cutoff', v)}
            format={fmtHz}
          />
        </At>
        <At x={KNOB_COLS.c4} y={KNOB_ROWS.r1}>
          <Knob
            label="Reso"
            value={params.resonance}
            min={0} max={0.99}
            disabled={!params.filter_on}
            onChange={(v) => set('resonance', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>

        <At x={KNOB_COLS.c1} y={KNOB_ROWS.r2}>
          <Knob
            label="Attack"
            value={params.attack}
            min={0.001} max={5} log
            onChange={(v) => set('attack', v)}
            format={fmtMs}
          />
        </At>
        <At x={KNOB_COLS.c2} y={KNOB_ROWS.r2}>
          <Knob
            label="Decay"
            value={params.decay}
            min={0.001} max={5} log
            onChange={(v) => set('decay', v)}
            format={fmtMs}
          />
        </At>
        <At x={KNOB_COLS.c3} y={KNOB_ROWS.r2}>
          <Knob
            label="Sustain"
            value={params.sustain}
            min={0} max={1}
            onChange={(v) => set('sustain', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOB_COLS.c4} y={KNOB_ROWS.r2}>
          <Knob
            label="Release"
            value={params.release}
            min={0.001} max={5} log
            onChange={(v) => set('release', v)}
            format={fmtMs}
          />
        </At>

        {/* ── 4 vsliders, body-absolute, mirrored around X_MIRROR ───── */}

        <At x={VSLIDERS.mix} y={VSLIDER_Y}>
          <Slider
            label="Mix"
            value={params.osc_mix}
            min={0} max={1} step={0.01}
            bipolar
            disabled={osc2Off}
            onChange={(v) => set('osc_mix', v)}
            format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`}
          />
        </At>
        <At x={VSLIDERS.detune} y={VSLIDER_Y}>
          <Slider
            label="Detune"
            value={params.osc2_detune}
            min={-50} max={50} step={0.5}
            bipolar
            disabled={osc2Off}
            onChange={(v) => set('osc2_detune', v)}
            format={fmtCents}
          />
        </At>
        <At x={VSLIDERS.depth} y={VSLIDER_Y}>
          <Slider
            label="Depth"
            value={params.lfo_depth}
            min={0} max={1} step={0.01}
            disabled={!params.lfo_on}
            onChange={(v) => set('lfo_depth', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={VSLIDERS.rate} y={VSLIDER_Y}>
          <Slider
            label="Rate"
            value={params.lfo_rate}
            min={0.1} max={20} log
            disabled={!params.lfo_on}
            onChange={(v) => set('lfo_rate', v)}
            format={(v) => `${v.toFixed(2)} Hz`}
          />
        </At>

        {/* ── Voice charts (left) + Envelope chart (right of mirror) ── */}

        <At x={VOX_CHART_1_CX} y={CHART_Y}>
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
        </At>
        <At x={VOX_CHART_2_CX} y={CHART_Y}>
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
        </At>
        <At x={ENV_CHART_CX} y={CHART_Y}>
          <ADSRCurve
            attack={params.attack}
            decay={params.decay}
            sustain={params.sustain}
            release={params.release}
            width={ENV_CHART_WIDTH}
            height={ENV_CHART_HEIGHT}
          />
        </At>

      </div>
    </Stage>
  );
}
