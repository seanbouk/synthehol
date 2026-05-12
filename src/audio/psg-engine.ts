import { FaustMonoDspGenerator, type FaustMonoAudioWorkletNode } from '@grame/faustwasm';
import type { Engine } from './engine';
import type { AbstractSlot } from '../types/midi';
import { getFaustCompiler } from './faust-runtime';
import { mapSlotToPSG } from '../instruments/psg/psg-mapping';
import type { PSGParamName } from '../instruments/psg/psg-defaults';

/**
 * PSG instrument — M5.
 *
 * Hosts a Faust-compiled AudioWorkletNode (see public/dsp/psg.dsp).
 * Tracks its own paramValues so encoder cycling can be relative to the
 * current osc1_wave value. Exposes:
 *   - setParam(name, value): set any DSP param directly (used by store)
 *   - analyser: AnalyserNode tapped on the output for the oscilloscope
 *   - onSlotInput: callback for hardware-driven slot input, set by App
 *     to bridge into the PSG store
 */

const PSG_DSP_URL = import.meta.env.BASE_URL + 'dsp/psg.dsp';

let generatorPromise: Promise<FaustMonoDspGenerator> | null = null;

async function ensurePSGGenerator(): Promise<FaustMonoDspGenerator> {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      const compiler = await getFaustCompiler();
      const dspSource = await fetch(PSG_DSP_URL).then((r) => r.text());
      const gen = new FaustMonoDspGenerator();
      const ok = await gen.compile(compiler, 'psg', dspSource, '-ftz 2');
      if (!ok) throw new Error('Faust failed to compile psg.dsp');
      return gen;
    })();
  }
  return generatorPromise;
}

export type SlotInputHandler = (name: PSGParamName, value: number) => void;

export class PSGEngine implements Engine {
  private node: FaustMonoAudioWorkletNode;
  private gain: GainNode;
  readonly analyser: AnalyserNode;
  private currentNote: number | null = null;
  private allParamPaths: string[];
  private pathCache = new Map<string, string>();
  private paramValues = new Map<string, number>();
  /** Set by App.tsx to bridge hardware slot input into the PSG store. */
  onSlotInput: SlotInputHandler | null = null;
  readonly output: AudioNode;

  private constructor(node: FaustMonoAudioWorkletNode, gain: GainNode, analyser: AnalyserNode) {
    this.node = node;
    this.gain = gain;
    this.analyser = analyser;
    this.output = gain;
    this.allParamPaths = node.getParams();
    console.log('[PSG] available params:', this.allParamPaths);
  }

  static async create(ctx: AudioContext): Promise<PSGEngine> {
    const gen = await ensurePSGGenerator();
    const node = await gen.createNode(ctx);
    if (!node) throw new Error('Faust failed to create PSG node');
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    node.connect(gain);
    gain.connect(analyser);
    return new PSGEngine(node, gain, analyser);
  }

  /**
   * Set a DSP param by short name. Resolves the full Faust path lazily
   * on first call. Public so the PSG store and devtools can drive it.
   */
  setParam(name: string, value: number): void {
    let path = this.pathCache.get(name);
    if (!path) {
      const match = this.allParamPaths.find(
        (p) => p === '/' + name || p.endsWith('/' + name)
      );
      if (!match) {
        console.warn(`[PSG] setParam: unknown param "${name}"`);
        return;
      }
      path = match;
      this.pathCache.set(name, path);
    }
    this.paramValues.set(name, value);
    this.node.setParamValue(path, value);
  }

  noteOn(_channel: number, note: number, velocity: number): void {
    this.currentNote = note;
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    this.setParam('freq', freq);
    this.setParam('gain', velocity / 127);
    this.setParam('gate', 1);
  }

  noteOff(_channel: number, note: number): void {
    if (this.currentNote === note) {
      this.currentNote = null;
      this.setParam('gate', 0);
    }
  }

  pitchBend(_channel: number, value: number): void {
    this.setParam('bend', (value / 8192) * 2);
  }

  modWheel(_channel: number, value: number): void {
    this.setParam('modwheel', value / 127);
  }

  slot(slot: AbstractSlot, value: number): void {
    const currentOsc1 = this.paramValues.get('osc1_wave') ?? 1;
    const result = mapSlotToPSG(slot, value, currentOsc1);
    if (result && this.onSlotInput) {
      this.onSlotInput(result.name, result.value as number);
    }
  }

  panic(): void {
    this.currentNote = null;
    this.setParam('gate', 0);
  }

  destroy(): void {
    this.panic();
    setTimeout(() => {
      try { this.node.disconnect(); } catch { /* */ }
      try { this.gain.disconnect(); } catch { /* */ }
      try { this.analyser.disconnect(); } catch { /* */ }
    }, 100);
  }
}
