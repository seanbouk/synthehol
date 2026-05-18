/**
 * Drums engine host — owns the single DrumsEngine instance and wires
 * its output to the audio destination.
 *
 * The engine is created lazily on first request so audio resources
 * aren't allocated until the user actually presses play. The caller
 * is expected to ensure the AudioContext is resumed first (a user
 * gesture is required for that).
 *
 * When we add the Output stage tab later this is where the engine's
 * output will be re-routed through it.
 */

import { DrumsEngine } from '../../audio/drums-engine';
import { ensureAudioContext, resumeAudioContext } from '../../audio/context';
import { DEFAULT_KIT } from './kits';

let engine: DrumsEngine | null = null;

export async function ensureDrumsEngine(): Promise<DrumsEngine> {
  if (engine) return engine;
  const ctx = await resumeAudioContext();
  engine = new DrumsEngine(ctx, DEFAULT_KIT);
  engine.output.connect(ctx.destination);
  return engine;
}

export function getDrumsEngine(): DrumsEngine | null {
  return engine;
}

export function getAudioContextSafe(): AudioContext {
  return ensureAudioContext();
}
