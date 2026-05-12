import type { MidiMessage, DispatchedMessage } from '../types/midi';

export type DispatchHandler = (msg: DispatchedMessage) => void;

const SUSTAIN_CC = 64;

/**
 * Sits between a MIDIInput and the instrument it feeds.
 * Implements universal-MIDI behaviour that should Just Work for every
 * instrument — sustain pedal (defers note-offs while held), and forwards
 * the rest unchanged.
 */
export class Dispatcher {
  private sustainHeld = new Map<number, boolean>(); // ch -> bool
  private sustainPending = new Map<number, Set<number>>(); // ch -> Set<note>
  private handlers = new Set<DispatchHandler>();

  subscribe(fn: DispatchHandler): () => void {
    this.handlers.add(fn);
    return () => {
      this.handlers.delete(fn);
    };
  }

  ingest(msg: MidiMessage): void {
    if (msg.type === 'system') return;

    if (msg.type === 'note-on') {
      this.sustainPending.get(msg.channel)?.delete(msg.data1);
      this.emit({ type: 'note-on', channel: msg.channel, data1: msg.data1, data2: msg.data2 });
      return;
    }

    if (msg.type === 'note-off') {
      if (this.sustainHeld.get(msg.channel)) {
        let pend = this.sustainPending.get(msg.channel);
        if (!pend) {
          pend = new Set();
          this.sustainPending.set(msg.channel, pend);
        }
        pend.add(msg.data1);
        return;
      }
      this.emit({ type: 'note-off', channel: msg.channel, data1: msg.data1, data2: msg.data2 });
      return;
    }

    if (msg.type === 'cc' && msg.data1 === SUSTAIN_CC) {
      const held = msg.data2 >= 64;
      this.sustainHeld.set(msg.channel, held);
      if (!held) {
        const pend = this.sustainPending.get(msg.channel);
        if (pend) {
          for (const note of pend) {
            this.emit({ type: 'note-off', channel: msg.channel, data1: note, data2: 0 });
          }
          pend.clear();
        }
      }
      this.emit({ type: 'cc', channel: msg.channel, data1: msg.data1, data2: msg.data2 });
      return;
    }

    this.emit({ type: msg.type, channel: msg.channel, data1: msg.data1, data2: msg.data2 });
  }

  reset(): void {
    this.sustainHeld.clear();
    this.sustainPending.clear();
  }

  private emit(msg: DispatchedMessage): void {
    this.handlers.forEach((h) => h(msg));
  }
}
