import { useEffect, useRef } from 'react';

/**
 * Static preview of one cycle of the voice's waveform — *not* the live
 * audio. Computes the OSC1 + OSC2 mix (with ring mod + drive) using the
 * same shape math as psg.dsp. Filter is omitted (it shapes spectrum
 * over time, not per-cycle waveform).
 *
 * `phaseLead` (in OSC 1 cycles) offsets where the cycle is sampled
 * from. Two previews with different leads let the user see OSC 2's
 * detune drift accumulate against OSC 1 — at lead 0 they're aligned;
 * at lead 8, with ±50¢ detune, OSC 2 has drifted ~86° from OSC 1.
 */

interface WaveformPreviewProps {
  osc1_wave: number;
  osc2_on: number;     // 0 / 1 — OSC 2 power switch
  osc2_wave: number;
  shape: number;
  osc_mix: number;
  osc2_octave: number;
  osc2_detune: number; // cents
  ring_on: number;
  drive_on: number;
  drive: number;       // 0..1
  drive_type: number;  // 0 = soft, 1 = fold
  /** OSC 1 cycles to skip before sampling the rendered cycle. */
  phaseLead?: number;
  /** Optional caption rendered above the canvas. */
  label?: string;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 180;

function oscSample(phase: number, wave: number, shape: number): number {
  switch (wave) {
    case 0: {
      const duty = Math.max(0.01, Math.min(0.99, shape));
      return (phase < duty ? 1 : 0) - 0.5;
    }
    case 1: {
      const skew = Math.max(0.01, Math.min(0.99, shape));
      const y = phase < skew ? phase / skew : (1 - phase) / (1 - skew);
      return 2 * y - 1;
    }
    case 2: {
      const t = 0.05 + shape * 0.9;
      const warped = phase < t
        ? (phase * 0.5) / t
        : 0.5 + ((phase - t) * 0.5) / (1 - t);
      return Math.sin(warped * 2 * Math.PI);
    }
    case 3: {
      const s = Math.sin(phase * 12345.678) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    }
    default:
      return 0;
  }
}

function applyDrive(x: number, drive: number, type: number): number {
  if (drive <= 0) return x;
  if (type === 0) {
    return x * (1 - drive) + Math.tanh(x * (1 + drive * 4)) * drive;
  }
  return x * (1 - drive) + Math.sin(x * (1 + drive * 6) * Math.PI * 0.5) * drive;
}

export function WaveformPreview({
  osc1_wave,
  osc2_on,
  osc2_wave,
  shape,
  osc_mix,
  osc2_octave,
  osc2_detune,
  ring_on,
  drive_on,
  drive,
  drive_type,
  phaseLead = 0,
  label,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
}: WaveformPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Higher DPR multiplier so canvas stays crisp when the parent stage
    // scales it up. 3× covers DPR=1 monitors at scale up to ~3, and
    // DPR=2 monitors at scale up to ~1.5.
    const dpr = Math.max(1, Math.min(3, (window.devicePixelRatio || 1) * 1.5));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#100d0b';
    ctx.fillRect(0, 0, width, height);

    // Zero line
    ctx.strokeStyle = '#322c28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const osc2Ratio = Math.pow(2, osc2_octave) * Math.pow(2, osc2_detune / 1200);
    const osc2Off = !osc2_on;
    const effectiveMix = osc2Off ? 0 : osc_mix;
    const effectiveRing = osc2Off ? 0 : ring_on;

    ctx.strokeStyle = '#f6a96b'; // --screen
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      // One full OSC 1 cycle across the canvas, offset by phaseLead cycles.
      const t = phaseLead + x / width;
      const phase1 = t - Math.floor(t);
      const phase2Raw = t * osc2Ratio;
      const phase2 = phase2Raw - Math.floor(phase2Raw);

      const o1 = oscSample(phase1, osc1_wave, shape);
      const o2 = osc2Off ? 0 : oscSample(phase2, osc2_wave, shape);

      const mixed = effectiveRing
        ? o1 * o2
        : o1 * (1 - effectiveMix) + o2 * effectiveMix;
      const sample = drive_on ? applyDrive(mixed, drive, drive_type) : mixed;

      const y = height / 2 - sample * (height / 2 - 6);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [osc1_wave, osc2_on, osc2_wave, shape, osc_mix, osc2_octave, osc2_detune,
      ring_on, drive_on, drive, drive_type, phaseLead, width, height]);

  return (
    <div className="psg-voice-screen">
      {label && <div className="psg-voice-label">{label}</div>}
      <canvas
        ref={canvasRef}
        style={{ width, height, display: 'block', borderRadius: 4 }}
      />
    </div>
  );
}
