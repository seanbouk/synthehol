import { useEffect, useRef } from 'react';

/**
 * Static preview of the voice's waveform — *not* the live audio.
 * Computes the OSC1 + OSC2 mix (with ring mod) over a fixed time window,
 * using the same shape math as psg.dsp. Drive and filter are not applied
 * — the goal is to show the voice's defining shape so the user can see
 * what they're sculpting as they move the shape knob, swap waveforms,
 * adjust the mix or detune OSC2.
 */

interface WaveformPreviewProps {
  osc1_wave: number;
  osc2_wave: number;
  shape: number;
  osc_mix: number;
  osc2_octave: number;
  osc2_detune: number;   // cents
  ring_on: number;
  drive_on: number;
  drive: number;         // 0..1
  drive_type: number;    // 0 = soft, 1 = fold
}

const WIDTH = 480;
const HEIGHT = 120;
const NUM_CYCLES = 2; // of OSC1; OSC2 may show more or fewer depending on tuning

function oscSample(phase: number, wave: number, shape: number): number {
  // phase: 0..1
  switch (wave) {
    case 0: {
      // Pulse — same math as DSP: (sawpos < duty) * 1.0 - 0.5
      const duty = Math.max(0.01, Math.min(0.99, shape));
      return (phase < duty ? 1 : 0) - 0.5;
    }
    case 1: {
      // Ramp — variable skew (rev-saw → triangle → saw)
      const skew = Math.max(0.01, Math.min(0.99, shape));
      const y = phase < skew ? phase / skew : (1 - phase) / (1 - skew);
      return 2 * y - 1;
    }
    case 2: {
      // Sine — phase distortion (Casio CZ), symmetric around shape=0.5.
      // shape=0.5 -> pure sine; edges compress the first or second half.
      const t = 0.05 + shape * 0.9;
      const warped = phase < t
        ? (phase * 0.5) / t
        : 0.5 + ((phase - t) * 0.5) / (1 - t);
      return Math.sin(warped * 2 * Math.PI);
    }
    case 3: {
      // Noise — pseudo-random but deterministic per phase so the
      // preview doesn't flicker on every redraw.
      const s = Math.sin(phase * 12345.678) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    }
    default:
      return 0;
  }
}

// Mirrors psg.dsp's drive section. Dry-blended so drive=0 is identity.
function applyDrive(x: number, drive: number, type: number): number {
  if (drive <= 0) return x;
  if (type === 0) {
    // Soft saturation (tanh)
    return x * (1 - drive) + Math.tanh(x * (1 + drive * 4)) * drive;
  }
  // Wave fold (sine fold)
  return x * (1 - drive) + Math.sin(x * (1 + drive * 6) * Math.PI * 0.5) * drive;
}

export function WaveformPreview({
  osc1_wave,
  osc2_wave,
  shape,
  osc_mix,
  osc2_octave,
  osc2_detune,
  ring_on,
  drive_on,
  drive,
  drive_type
}: WaveformPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#100d0b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Zero line
    ctx.strokeStyle = '#322c28';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT / 2);
    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();

    // Cycle boundary lines (where OSC1 starts a new cycle).
    ctx.beginPath();
    for (let c = 1; c < NUM_CYCLES; c++) {
      const x = (c / NUM_CYCLES) * WIDTH;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
    }
    ctx.stroke();

    // OSC2 plays at this ratio of OSC1's frequency
    const osc2Ratio = Math.pow(2, osc2_octave) * Math.pow(2, osc2_detune / 1200);
    // When OSC 2 is off (wave === 4), mix and ring collapse to zero so
    // the preview shows pure OSC 1, matching the DSP behaviour.
    const osc2Off = osc2_wave === 4;
    const effectiveMix = osc2Off ? 0 : osc_mix;
    const effectiveRing = osc2Off ? 0 : ring_on;

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < WIDTH; x++) {
      const t = (x / WIDTH) * NUM_CYCLES;     // OSC1 cycle count so far
      const phase1 = t - Math.floor(t);
      const phase2Raw = t * osc2Ratio;
      const phase2 = phase2Raw - Math.floor(phase2Raw);

      const o1 = oscSample(phase1, osc1_wave, shape);
      const o2 = osc2Off ? 0 : oscSample(phase2, osc2_wave, shape);

      const mixed = effectiveRing
        ? o1 * o2
        : o1 * (1 - effectiveMix) + o2 * effectiveMix;
      const sample = drive_on ? applyDrive(mixed, drive, drive_type) : mixed;

      const y = HEIGHT / 2 - sample * (HEIGHT / 2 - 4);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [osc1_wave, osc2_wave, shape, osc_mix, osc2_octave, osc2_detune, ring_on, drive_on, drive, drive_type]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: WIDTH, height: HEIGHT, borderRadius: 4, display: 'block' }}
    />
  );
}
