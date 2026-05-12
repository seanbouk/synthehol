/**
 * Singleton wrapper around the browser's MIDIAccess.
 * Holds the access object once granted; emits change notifications when
 * devices connect/disconnect so the app can re-render.
 */
class MIDIManager {
  private access: MIDIAccess | null = null;
  private listeners = new Set<() => void>();

  async request(): Promise<void> {
    this.access = await navigator.requestMIDIAccess({ sysex: false });
    this.access.addEventListener('statechange', () => this.notify());
    this.notify();
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

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const midiManager = new MIDIManager();
