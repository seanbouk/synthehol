/**
 * Lazy singleton AudioContext. Created on first call (typically from a
 * user gesture so the browser allows resuming).
 *
 * The context can be created in suspended state and used for worklet
 * registration / engine wiring; audio only starts flowing after resume().
 */
let audioContext: AudioContext | null = null;

export function ensureAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function resumeAudioContext(): Promise<AudioContext> {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
}

export function getAudioContext(): AudioContext | null {
  return audioContext;
}
