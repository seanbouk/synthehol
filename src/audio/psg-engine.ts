import { FaustMonoDspGenerator, type FaustMonoAudioWorkletNode } from '@grame/faustwasm';
import type { Engine } from './engine';
import type { AbstractSlot } from '../types/midi';
import { getFaustCompiler } from './faust-runtime';

/**
 * PSG instrument — M4.
 *
 * Hosts a Faust-compiled AudioWorkletNode (see public/dsp/psg.dsp).
 *
 * Parameter paths are resolved lazily by name suffix the first time
 * each is needed, so the engine is robust to whatever prefix Faust
 * generates (with or without vgroups, with or without `declare name`).
 *
 * M4 wires up pitch bend + mod-wheel vibrato from the dispatcher
 * because those flow direct from MIDI and don't need UI. Knob/slider
 * routing through `slot()` lands in M5; for now `setParam(name, value)`
 * is exposed so the dev console / future UI can drive every DSP param.
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

export class PSGEngine implements Engine {
  private node: FaustMonoAudioWorkletNode;
  private gain: GainNode;
  private currentNote: number | null = null;
  private allParamPaths: string[];
  private pathCache = new Map<string, string>();
  readonly output: AudioNode;

  private constructor(node: FaustMonoAudioWorkletNode, gain: GainNode) {
    this.node = node;
    this.gain = gain;
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
    node.connect(gain);
    return new PSGEngine(node, gain);
  }

  /**
   * Set a DSP param by short name (the slider/button label in the .dsp).
   * Resolves to the full Faust path on first call and caches.
   * Public so devtools and the M5 UI can drive every param.
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
    // value is -8192..+8191 → ±2 semitones (standard MIDI default range)
    this.setParam('bend', (value / 8192) * 2);
  }

  modWheel(_channel: number, value: number): void {
    // 0..127 → 0..1
    this.setParam('modwheel', value / 127);
  }

  slot(_slot: AbstractSlot, _value: number): void {
    // M5 wires hardware slots to DSP params.
  }

  panic(): void {
    this.currentNote = null;
    this.setParam('gate', 0);
  }

  destroy(): void {
    this.panic();
    setTimeout(() => {
      try { this.node.disconnect(); } catch { /* already disconnected */ }
      try { this.gain.disconnect(); } catch { /* already disconnected */ }
    }, 100);
  }
}
