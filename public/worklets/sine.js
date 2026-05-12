/**
 * Monophonic sine engine — the M2 stub. Last note wins. Simple AR
 * envelope to avoid clicks. PSG synth (M3) will replace this entirely.
 *
 * Plain JS lives in public/ so Vite serves it verbatim — AudioWorklet
 * needs a directly-loadable URL (no module transformation).
 */
class SineProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.freq = 0;
    this.phase = 0;
    this.amp = 0;
    this.targetAmp = 0;
    this.port.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'noteOn') {
        this.freq = e.data.freq;
        this.targetAmp = (e.data.velocity / 127) * 0.3;
      } else if (type === 'noteOff') {
        this.targetAmp = 0;
      } else if (type === 'panic') {
        this.targetAmp = 0;
        this.amp = 0;
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const left = output[0];
    const right = output.length > 1 ? output[1] : null;

    const twoPi = 2 * Math.PI;
    const dt = (twoPi * this.freq) / sampleRate;
    // 5 ms approx attack/release ramp (per sample at 48 kHz that's ~1/240)
    const ramp = 1 / (sampleRate * 0.005);

    for (let i = 0; i < left.length; i++) {
      if (this.amp < this.targetAmp) {
        this.amp = Math.min(this.targetAmp, this.amp + ramp);
      } else if (this.amp > this.targetAmp) {
        this.amp = Math.max(this.targetAmp, this.amp - ramp);
      }

      const sample = Math.sin(this.phase) * this.amp;
      this.phase += dt;
      if (this.phase >= twoPi) this.phase -= twoPi;

      left[i] = sample;
      if (right) right[i] = sample;
    }
    return true;
  }
}

registerProcessor('sine-processor', SineProcessor);
