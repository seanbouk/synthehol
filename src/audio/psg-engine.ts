import { FaustPolyDspGenerator, type FaustPolyAudioWorkletNode } from '@grame/faustwasm';
import type { Engine } from './engine';
import type { AbstractSlot } from '../types/midi';
import { getFaustCompiler } from './faust-runtime';
import { mapSlotToPSG } from '../instruments/psg/psg-mapping';
import type { PSGParamName } from '../instruments/psg/psg-defaults';

/**
 * Polyphonic PSG instrument.
 *
 * Hosts a Faust-compiled polyphonic AudioWorkletNode (see public/dsp/psg.dsp,
 * declares [nvoices:16]). Faust allocates voices automatically on keyOn
 * and reclaims them on keyOff / steal-oldest. Shared params (cutoff,
 * drive, LFO etc.) propagate to every active voice via setParamValue.
 *
 * The post-engine chain ends with a WaveShaperNode running a soft tanh
 * curve so big chord stacks roll off smoothly instead of hard-clipping
 * the audio destination.
 */

const PSG_DSP_URL = import.meta.env.BASE_URL + 'dsp/psg.dsp';
const POLY_VOICES = 16;

let generatorPromise: Promise<FaustPolyDspGenerator> | null = null;

async function ensurePSGGenerator(): Promise<FaustPolyDspGenerator> {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      const compiler = await getFaustCompiler();
      const dspSource = await fetch(PSG_DSP_URL).then((r) => r.text());
      const gen = new FaustPolyDspGenerator();
      const ok = await gen.compile(compiler, 'psg', dspSource, '-ftz 2');
      if (!ok) throw new Error('Faust failed to compile psg.dsp');
      return gen;
    })();
  }
  return generatorPromise;
}

/** Build a soft tanh curve for WaveShaperNode. Single-voice signal stays
 *  near-linear (tanh of small values ≈ x); summed voices soft-clip. */
function buildSoftClipCurve(samples = 8192, drive = 0.6): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1; // −1..+1
    curve[i] = Math.tanh(x * drive * 3);
  }
  return curve;
}

export type SlotInputHandler = (name: PSGParamName, value: number) => void;

export class PSGEngine implements Engine {
  private node: FaustPolyAudioWorkletNode;
  private saturator: WaveShaperNode;
  private gain: GainNode;
  readonly analyser: AnalyserNode;
  private allParamPaths: string[];
  private pathCache = new Map<string, string>();
  private paramValues = new Map<string, number>();
  onSlotInput: SlotInputHandler | null = null;
  readonly output: AudioNode;

  private constructor(
    node: FaustPolyAudioWorkletNode,
    saturator: WaveShaperNode,
    gain: GainNode,
    analyser: AnalyserNode
  ) {
    this.node = node;
    this.saturator = saturator;
    this.gain = gain;
    this.analyser = analyser;
    this.output = gain;
    this.allParamPaths = node.getParams();
    console.log('[PSG] available params:', this.allParamPaths);
  }

  static async create(ctx: AudioContext): Promise<PSGEngine> {
    const gen = await ensurePSGGenerator();
    const node = await gen.createNode(ctx, POLY_VOICES);
    if (!node) throw new Error('Faust failed to create PSG poly node');

    const saturator = ctx.createWaveShaper();
    saturator.curve = buildSoftClipCurve();
    saturator.oversample = '2x';

    const gain = ctx.createGain();
    gain.gain.value = 0.8;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;

    node.connect(saturator);
    saturator.connect(gain);
    gain.connect(analyser);

    return new PSGEngine(node, saturator, gain, analyser);
  }

  /**
   * Set a shared DSP param by short name. (freq, gain, gate are per-voice
   * and handled via keyOn/keyOff, not this method.)
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

  noteOn(channel: number, note: number, velocity: number): void {
    this.node.keyOn(channel, note, velocity);
  }

  noteOff(channel: number, note: number): void {
    this.node.keyOff(channel, note, 0);
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
    this.node.allNotesOff(true);
  }

  destroy(): void {
    this.panic();
    setTimeout(() => {
      try { this.node.disconnect(); } catch { /* */ }
      try { this.saturator.disconnect(); } catch { /* */ }
      try { this.gain.disconnect(); } catch { /* */ }
      try { this.analyser.disconnect(); } catch { /* */ }
    }, 100);
  }
}
