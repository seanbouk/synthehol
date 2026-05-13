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
import { cellCentre } from './grid';
import {
  KNOBS,
  VSLIDERS, VSLIDER_CY, VSLIDER_TRACK_HEIGHT,
  VOX_CHART_1, VOX_CHART_2, VOX_CHART_WIDTH, VOX_CHART_HEIGHT,
  ENV_CHART, ENV_CHART_WIDTH, ENV_CHART_HEIGHT,
  RULES
} from './layout';

const PITCH_WHEEL = cellCentre(1, 3); // col 1 centre, vertical mid of body
const MOD_WHEEL   = cellCentre(2, 3); // col 2 centre, vertical mid of body

/**
 * PSG instrument panel.
 *
 * The fixed 2240×800 Stage is a 14×5 grid of 160 px square cells. There
 * are no fieldset boxes — section boundaries are drawn as thin teal
 * rules between cells (see RULES in layout.ts). Controls anchor to cell
 * centres or column boundaries; multi-control sections (osc/drive/
 * filter/lfo) live inside an unframed .psg-zone wrapper that lays out
 * their internal flex content.
 *
 * See `grid.ts`, `layout.ts`, and `refs/grid-sketch.svg` for the full
 * layout — this file just wires positions to controls.
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

        {/* ── Thin teal section rules (replace fieldset borders) ─────── */}

        {RULES.map((r, i) => {
          const left = Math.min(r.x1, r.x2);
          const top = Math.min(r.y1, r.y2);
          const width = Math.max(1, r.x2 - r.x1);
          const height = Math.max(1, r.y2 - r.y1);
          return (
            <div
              key={i}
              className="psg-rule"
              style={{ left, top, width, height }}
            />
          );
        })}

        {/* ── Multi-control zones (unframed, just hold flex content) ── */}

        <div className="psg-zone osc">
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
              <span className="sub-label" />
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
        </div>

        <div className="psg-zone drive">
          <div className="psg-stack" style={{ alignItems: 'center' }}>
            <LEDToggle
              label="Drive"
              value={params.drive_on}
              warn
              onChange={(v) => set('drive_on', v)}
            />
            <ButtonGroup
              value={params.drive_type}
              options={DRIVE_OPTIONS}
              disabled={!params.drive_on}
              onChange={(v) => set('drive_type', v)}
            />
          </div>
        </div>

        <div className="psg-zone filt">
          <div className="psg-stack" style={{ alignItems: 'center' }}>
            <LEDToggle
              label="Filter"
              value={params.filter_on}
              onChange={(v) => set('filter_on', v)}
            />
            <ButtonGroup
              value={params.filter_mode}
              options={FILTER_OPTIONS}
              disabled={!params.filter_on}
              onChange={(v) => set('filter_mode', v)}
            />
          </div>
        </div>

        <div className="psg-zone lfo">
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
        </div>

        {/* ── Wheels, centred on cols 1 and 2 ─────────────────────────── */}

        <At x={PITCH_WHEEL.x} y={PITCH_WHEEL.y}>
          <Wheel
            label="Pitch"
            value={perf.bend}
            min={-2} max={2} snapBack
            onChange={(v) => setBend(deviceId, v)}
            format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} st`}
          />
        </At>
        <At x={MOD_WHEEL.x} y={MOD_WHEEL.y}>
          <Wheel
            label="Mod"
            value={perf.modwheel}
            min={0} max={1}
            onChange={(v) => setModWheel(deviceId, v)}
            format={(v) => v.toFixed(2)}
          />
        </At>

        {/* ── Top-row knobs (row 4): shape / drive / cutoff / reso / env-amt ── */}

        <At x={KNOBS.shape.x} y={KNOBS.shape.y}>
          <Knob
            label="Shape"
            value={params.shape}
            min={0} max={1}
            onChange={(v) => set('shape', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOBS.drive.x} y={KNOBS.drive.y}>
          <Knob
            label="Drive"
            value={params.drive}
            min={0} max={1}
            disabled={!params.drive_on}
            onChange={(v) => set('drive', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOBS.cutoff.x} y={KNOBS.cutoff.y}>
          <Knob
            label="Cutoff"
            value={params.cutoff}
            min={20} max={20000} log
            disabled={!params.filter_on}
            onChange={(v) => set('cutoff', v)}
            format={fmtHz}
          />
        </At>
        <At x={KNOBS.reso.x} y={KNOBS.reso.y}>
          <Knob
            label="Reso"
            value={params.resonance}
            min={0} max={0.99}
            disabled={!params.filter_on}
            onChange={(v) => set('resonance', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOBS.envAmt.x} y={KNOBS.envAmt.y}>
          <Knob
            label="Env amt"
            value={params.filter_env_amount}
            min={-1} max={1}
            disabled={!params.filter_on}
            onChange={(v) => set('filter_env_amount', v)}
            format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
          />
        </At>

        {/* ── ADSR knobs (row 5): attack / decay / sustain / release ── */}

        <At x={KNOBS.attack.x} y={KNOBS.attack.y}>
          <Knob
            label="Attack"
            value={params.attack}
            min={0.001} max={5} log
            onChange={(v) => set('attack', v)}
            format={fmtMs}
          />
        </At>
        <At x={KNOBS.decay.x} y={KNOBS.decay.y}>
          <Knob
            label="Decay"
            value={params.decay}
            min={0.001} max={5} log
            onChange={(v) => set('decay', v)}
            format={fmtMs}
          />
        </At>
        <At x={KNOBS.sustain.x} y={KNOBS.sustain.y}>
          <Knob
            label="Sustain"
            value={params.sustain}
            min={0} max={1}
            onChange={(v) => set('sustain', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={KNOBS.release.x} y={KNOBS.release.y}>
          <Knob
            label="Release"
            value={params.release}
            min={0.001} max={5} log
            onChange={(v) => set('release', v)}
            format={fmtMs}
          />
        </At>

        {/* ── Vsliders on column boundaries, 2 cells tall (rows 2–3) ── */}

        <At x={VSLIDERS.mix} y={VSLIDER_CY}>
          <Slider
            label="Mix"
            value={params.osc_mix}
            min={0} max={1} step={0.01}
            bipolar
            trackHeight={VSLIDER_TRACK_HEIGHT}
            disabled={osc2Off}
            onChange={(v) => set('osc_mix', v)}
            format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`}
          />
        </At>
        <At x={VSLIDERS.detune} y={VSLIDER_CY}>
          <Slider
            label="Detune"
            value={params.osc2_detune}
            min={-50} max={50} step={0.5}
            bipolar
            trackHeight={VSLIDER_TRACK_HEIGHT}
            disabled={osc2Off}
            onChange={(v) => set('osc2_detune', v)}
            format={fmtCents}
          />
        </At>
        <At x={VSLIDERS.depth} y={VSLIDER_CY}>
          <Slider
            label="Depth"
            value={params.lfo_depth}
            min={0} max={1} step={0.01}
            trackHeight={VSLIDER_TRACK_HEIGHT}
            disabled={!params.lfo_on}
            onChange={(v) => set('lfo_depth', v)}
            format={(v) => v.toFixed(2)}
          />
        </At>
        <At x={VSLIDERS.rate} y={VSLIDER_CY}>
          <Slider
            label="Rate"
            value={params.lfo_rate}
            min={0.1} max={20} log
            trackHeight={VSLIDER_TRACK_HEIGHT}
            disabled={!params.lfo_on}
            onChange={(v) => set('lfo_rate', v)}
            format={(v) => `${v.toFixed(2)} Hz`}
          />
        </At>

        {/* ── Voice charts (cells 3–4 / 5–6, row 5) + Envelope chart (cells 11–14, row 5) ── */}

        <At x={VOX_CHART_1.x} y={VOX_CHART_1.y}>
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
            width={VOX_CHART_WIDTH}
            height={VOX_CHART_HEIGHT}
          />
        </At>
        <At x={VOX_CHART_2.x} y={VOX_CHART_2.y}>
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
            width={VOX_CHART_WIDTH}
            height={VOX_CHART_HEIGHT}
          />
        </At>
        <At x={ENV_CHART.x} y={ENV_CHART.y}>
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
