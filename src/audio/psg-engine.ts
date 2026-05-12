import { FaustMonoDspGenerator, type FaustMonoAudioWorkletNode } from '@grame/faustwasm';
import type { Engine } from './engine';
import type { AbstractSlot } from '../types/midi';
import { getFaustCompiler } from './faust-runtime';

/**
 * PSG instrument — M3 phase 1.
 *
 * Hosts a Faust-compiled AudioWorkletNode (see public/dsp/psg.dsp).
 * Translates Engine method calls into setParamValue calls on the node.
 *
 * Parameter paths are resolved by name suffix on construction so the
 * engine is robust to whatever prefix Faust generates (with or without
 * `declare name`, with or without vgroup wrappers).
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

function findParamPath(paths: string[], suffix: string): string {
  const match = paths.find((p) => p === '/' + suffix || p.endsWith('/' + suffix));
  if (!match) throw new Error(`PSG: param "${suffix}" not exposed by the .dsp`);
  return match;
}

export class PSGEngine implements Engine {
  private node: FaustMonoAudioWorkletNode;
  private gain: GainNode;
  private currentNote: number | null = null;
  private freqPath: string;
  private gainPath: string;
  private gatePath: string;
  // waveformPath kept for future use when the encoder gets wired
  private waveformPath: string;
  readonly output: AudioNode;

  private constructor(node: FaustMonoAudioWorkletNode, gain: GainNode) {
    this.node = node;
    this.gain = gain;
    this.output = gain;

    const params = node.getParams();
    this.freqPath = findParamPath(params, 'freq');
    this.gainPath = findParamPath(params, 'gain');
    this.gatePath = findParamPath(params, 'gate');
    this.waveformPath = findParamPath(params, 'waveform');
    console.log('[PSG] params resolved:', {
      freq: this.freqPath,
      gain: this.gainPath,
      gate: this.gatePath,
      waveform: this.waveformPath
    });
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

  noteOn(_channel: number, note: number, velocity: number): void {
    this.currentNote = note;
    const freq = 440 * Math.pow(2, (note - 69) / 12);
    this.node.setParamValue(this.freqPath, freq);
    this.node.setParamValue(this.gainPath, velocity / 127);
    this.node.setParamValue(this.gatePath, 1);
  }

  noteOff(_channel: number, note: number): void {
    if (this.currentNote === note) {
      this.currentNote = null;
      this.node.setParamValue(this.gatePath, 0);
    }
  }

  pitchBend(_channel: number, _value: number): void {
    // M3 phase 1: not implemented. M4 adds pitch bend handling.
  }

  modWheel(_channel: number, _value: number): void {
    // M3 phase 1: not implemented.
  }

  slot(_slot: AbstractSlot, _value: number): void {
    // M3 phase 1: knobs not wired. M5 binds slots to DSP params.
  }

  panic(): void {
    this.currentNote = null;
    this.node.setParamValue(this.gatePath, 0);
  }

  destroy(): void {
    this.panic();
    setTimeout(() => {
      try { this.node.disconnect(); } catch { /* already disconnected */ }
      try { this.gain.disconnect(); } catch { /* already disconnected */ }
    }, 100);
  }
}
