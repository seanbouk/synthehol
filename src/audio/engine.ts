import type { AbstractSlot } from '../types/midi';

/**
 * Common interface every instrument engine implements.
 *
 * The dispatcher feeds DispatchedMessage objects; an adapter (see
 * audio/dispatch-to-engine.ts) translates those into engine method calls.
 * Engines own their AudioNode output graph and connect it to the
 * destination when handed to the engine registry.
 */
export interface Engine {
  noteOn(channel: number, note: number, velocity: number): void;
  noteOff(channel: number, note: number): void;
  pitchBend(channel: number, value: number): void; // -8192..+8191
  modWheel(channel: number, value: number): void; // 0..127

  /** Generic abstract-slot input — knob/slider/encoder routed via device profile. */
  slot(slot: AbstractSlot, value: number): void;

  /** Stop all sound immediately. */
  panic(): void;

  /** Release audio resources. */
  destroy(): void;

  readonly output: AudioNode;
}
