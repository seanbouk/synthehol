/**
 * Hand-coded Web Audio drum voices for the spine-milestone starter
 * kit. Each function builds the nodes for a single hit, schedules
 * start/stop at sample-accurate times, and returns. Nodes are GC'd
 * after their envelope completes.
 *
 * These will eventually be replaced by Faust-compiled DSP so the same
 * voice ports to native targets. The trigger() signature is designed
 * so the swap is purely internal — kit.ts and the sequencer don't
 * change.
 */

import type { DrumVoiceTrigger } from './kit';

// ─────────────────────────────────────────────────────────────────────
// Shared utilities
// ─────────────────────────────────────────────────────────────────────

/** Linear gain ramp from 0 → peak → 0, with a near-instant attack. */
function envelope(
  ctx: AudioContext,
  time: number,
  attack: number,
  decay: number,
  peak: number
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(peak, time + attack);
  // Decay as an exponential is more drum-shaped than linear, but Web
  // Audio's exponentialRampToValueAtTime can't reach 0 — use a long
  // setTargetAtTime then a hard stop.
  g.gain.setTargetAtTime(0, time + attack, decay / 3);
  return g;
}

/** Build a buffer of white noise sized for `seconds` of playback. */
let cachedNoiseBuffer: { ctx: AudioContext | null; buf: AudioBuffer | null } = {
  ctx: null,
  buf: null
};
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer.ctx === ctx && cachedNoiseBuffer.buf) {
    return cachedNoiseBuffer.buf;
  }
  const seconds = 1;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  cachedNoiseBuffer = { ctx, buf };
  return buf;
}

/** Schedule both endpoints of a node and return it. */
function scheduleSource<T extends AudioScheduledSourceNode>(
  src: T,
  startTime: number,
  duration: number
): T {
  src.start(startTime);
  src.stop(startTime + duration);
  return src;
}

// ─────────────────────────────────────────────────────────────────────
// Voices
// ─────────────────────────────────────────────────────────────────────

/** KICK — sine wave with fast pitch sweep + amp envelope. */
export const kickVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

  const env = envelope(ctx, time, 0.002, 0.35, velocity);
  osc.connect(env).connect(dest);
  scheduleSource(osc, time, 0.5);
};

/** SNARE — tone body + noise transient. */
export const snareVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  // Tone body
  const tone = ctx.createOscillator();
  tone.type = 'triangle';
  tone.frequency.setValueAtTime(220, time);
  tone.frequency.exponentialRampToValueAtTime(180, time + 0.1);
  const toneEnv = envelope(ctx, time, 0.001, 0.15, velocity * 0.5);
  tone.connect(toneEnv).connect(dest);
  scheduleSource(tone, time, 0.3);

  // Noise transient
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  const noiseEnv = envelope(ctx, time, 0.001, 0.18, velocity * 0.7);
  noise.connect(hp).connect(noiseEnv).connect(dest);
  scheduleSource(noise, time, 0.3);
};

/** Helper: filtered noise burst (used by hats, rim, clap). */
function noiseBurst(
  ctx: AudioContext,
  dest: AudioNode,
  time: number,
  velocity: number,
  decay: number,
  hpFreq: number
): void {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hpFreq;
  const env = envelope(ctx, time, 0.001, decay, velocity * 0.5);
  noise.connect(hp).connect(env).connect(dest);
  scheduleSource(noise, time, decay + 0.1);
}

/** CHH — closed hi-hat: short filtered noise. */
export const closedHatVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  noiseBurst(ctx, dest, time, velocity, 0.05, 8000);
};

/** OHH — open hi-hat: longer filtered noise. */
export const openHatVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  noiseBurst(ctx, dest, time, velocity, 0.3, 7000);
};

/** CLP — clap: three quick noise bursts in succession + body burst. */
export const clapVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  const taps = [0, 0.012, 0.024];
  for (const t of taps) {
    noiseBurst(ctx, dest, time + t, velocity * 0.6, 0.02, 1200);
  }
  noiseBurst(ctx, dest, time + 0.04, velocity, 0.18, 1000);
};

/** TOM — sine sweep, lower starting pitch than kick, longer tail. */
export const tomVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, time);
  osc.frequency.exponentialRampToValueAtTime(90, time + 0.15);
  const env = envelope(ctx, time, 0.003, 0.4, velocity * 0.9);
  osc.connect(env).connect(dest);
  scheduleSource(osc, time, 0.6);
};

/** RIM — very short noise spike with bandpass. */
export const rimVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  bp.Q.value = 4;
  const env = envelope(ctx, time, 0.001, 0.02, velocity * 0.6);
  noise.connect(bp).connect(env).connect(dest);
  scheduleSource(noise, time, 0.1);
};

/** PRC — short triangle with light filter, generic percussive bleep. */
export const percVoice: DrumVoiceTrigger = (ctx, dest, time, velocity) => {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(800, time);
  osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);
  const env = envelope(ctx, time, 0.002, 0.1, velocity * 0.55);
  osc.connect(env).connect(dest);
  scheduleSource(osc, time, 0.2);
};
