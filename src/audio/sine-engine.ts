import type { Engine } from './engine';
import type { AbstractSlot } from '../types/midi';

/**
 * Stub monophonic sine engine. Last note wins. Used for M2 to prove the
 * MIDI → AudioWorklet pipeline end-to-end; replaced by PSG in M3.
 */

let workletPromise: Promise<void> | null = null;

function ensureSineWorklet(ctx: AudioContext): Promise<void> {
  if (!workletPromise) {
    const url = import.meta.env.BASE_URL + 'worklets/sine.js';
    workletPromise = ctx.audioWorklet.addModule(url);
  }
  return workletPromise;
}

export class SineEngine implements Engine {
  private node: AudioWorkletNode;
  private gain: GainNode;
  private currentNote: number | null = null;
  readonly output: AudioNode;

  private constructor(ctx: AudioContext) {
    this.node = new AudioWorkletNode(ctx, 'sine-processor', {
      outputChannelCount: [2]
    });
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.5;
    this.node.connect(this.gain);
    this.output = this.gain;
  }

  static async create(ctx: AudioContext): Promise<SineEngine> {
    await ensureSineWorklet(ctx);
    return new SineEngine(ctx);
  }

  noteOn(_channel: number, note: number, velocity: number): void {
    this.currentNote = note;
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    this.node.port.postMessage({ type: 'noteOn', freq, velocity });
  }

  noteOff(_channel: number, note: number): void {
    // Mono: only release if the currently-sounding note is the one being released.
    if (this.currentNote === note) {
      this.currentNote = null;
      this.node.port.postMessage({ type: 'noteOff' });
    }
  }

  pitchBend(_channel: number, _value: number): void {
    // not implemented in stub
  }

  modWheel(_channel: number, _value: number): void {
    // not implemented in stub
  }

  slot(_slot: AbstractSlot, _value: number): void {
    // not implemented in stub
  }

  panic(): void {
    this.currentNote = null;
    this.node.port.postMessage({ type: 'panic' });
  }

  destroy(): void {
    this.panic();
    // Give the post-message a moment to land before tearing down nodes.
    setTimeout(() => {
      try { this.node.disconnect(); } catch { /* already disconnected */ }
      try { this.gain.disconnect(); } catch { /* already disconnected */ }
    }, 100);
  }
}
