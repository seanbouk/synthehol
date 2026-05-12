/**
 * Monophonic sine engine — the M2 stub. Last note wins. PSG (M3)
 * replaces this entirely.
 *
 * Envelope: linear 5ms attack (snappy, click-free at audible frequencies),
 * exponential release with a 60ms time constant (naturally smooth across
 * the whole keyboard — slope tracks amplitude, so it can't click).
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

    // Linear attack: 5ms full-range -> rate per sample
    const attackRate = 1 / (sampleRate * 0.005);
    // Exponential release: 60ms time constant
    // amp(t) = amp(0) * exp(-t/tau); per-sample coefficient = exp(-1/(fs*tau))
    const releaseCoeff = Math.exp(-1 / (sampleRate * 0.060));

    for (let i = 0; i < left.length; i++) {
      if (this.amp < this.targetAmp) {
        // Attack
        this.amp = Math.min(this.targetAmp, this.amp + attackRate);
      } else if (this.targetAmp === 0 && this.amp > 0) {
        // Release (exponential — smooth at any pitch)
        this.amp *= releaseCoeff;
        if (this.amp < 1e-5) this.amp = 0;
      } else if (this.amp > this.targetAmp) {
        // Note retriggered at lower velocity — match attack rate going down
        this.amp = Math.max(this.targetAmp, this.amp - attackRate);
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
