/**
 * Multi-port USB MIDI devices expose ports for things other than playing
 * notes — control-surface protocols (Mackie/HUI), vendor-specific software
 * bridges (Arturia ALV, NI Komplete Kontrol DAW), passthrough of physical
 * 5-pin DIN inputs. None of those are useful for Synthehol, so we hide
 * them from the tab list.
 *
 * Heuristic, not authoritative. Future work: per-device port selection UI
 * so the user can override when this gets it wrong.
 */
const HIDE_PATTERNS: RegExp[] = [
  /\bMCU\b/i,                // Mackie Control Universal
  /\bHUI\b/i,                // Human User Interface (Mackie's DAW protocol)
  /\bALV\b/i,                // Arturia Analog Lab V bridge
  /\bDAW\s*CTRL\b/i,         // generic DAW-control naming
  /\bControl\s*Surface\b/i,
  /\bTHRU\b/i,               // DIN-thru / passthrough ports
  /Komplete\s*Kontrol\s*DAW/i // NI's DAW-control variant
];

export function isMusicalPort(name: string): boolean {
  return !HIDE_PATTERNS.some((p) => p.test(name));
}
