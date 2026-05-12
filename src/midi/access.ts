/**
 * Singleton wrapper around the browser's MIDIAccess.
 * Holds the access object once granted; emits change notifications when
 * the set of inputs changes.
 *
 * Notifications are deduped by a signature of the input list — Chrome
 * tends to fire `statechange` events redundantly right after access is
 * granted, so without deduping the React layer would re-sync 2+ times
 * for one real change.
 */
class MIDIManager {
  private access: MIDIAccess | null = null;
  private listeners = new Set<() => void>();
  private lastSignature = '';

  async request(): Promise<void> {
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.addEventListener('statechange', () => this.maybeNotify());
    this.maybeNotify();
  }

  get inputs(): MIDIInput[] {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values());
  }

  get outputs(): MIDIOutput[] {
    if (!this.access) return [];
    return Array.from(this.access.outputs.values());
  }

  get ready(): boolean {
    return this.access !== null;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private currentSignature(): string {
    // Deliberately excludes `connection` (open/closed/pending): setting
    // onmidimessage transitions a port from closed to open, fires
    // statechange, and would loop us into a redundant resync. State
    // (connected/disconnected) is what we actually care about.
    return this.inputs
      .map((i) => `${i.id}|${i.name ?? ''}|${i.state}`)
      .sort()
      .join(';');
  }

  private maybeNotify(): void {
    const sig = this.currentSignature();
    if (sig === this.lastSignature) return;
    this.lastSignature = sig;
    this.listeners.forEach((fn) => fn());
  }
}

export const midiManager = new MIDIManager();
