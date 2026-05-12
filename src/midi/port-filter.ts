/**
 * Multi-port USB MIDI devices expose ports for things other than playing
 * notes — control-surface protocols (Mackie/HUI), vendor-specific software
 * bridges (Arturia ALV, NI Komplete Kontrol DAW), passthrough of physical
 * 5-pin DIN inputs. None of those are useful for Synthehol, so we hide
 * them from the tab list.
 *
 * Heuristic, not authoritative. Future work: per-device port selection UI
 * so the user can override when this gets it wrong.
 *
 * App.tsx logs the classification on each port sync so silent
 * mis-classifications are visible in the browser console.
 */
interface HidePattern {
  pattern: RegExp;
  label: string;
}

const HIDE_PATTERNS: HidePattern[] = [
  { pattern: /\bMCU\b/i,                 label: 'MCU (DAW control)' },
  { pattern: /\bHUI\b/i,                 label: 'HUI (DAW control)' },
  { pattern: /\bALV\b/i,                 label: 'ALV (Arturia software bridge)' },
  { pattern: /\bDAW\s*CTRL\b/i,          label: 'DAW control' },
  { pattern: /\bControl\s*Surface\b/i,   label: 'Control surface' },
  { pattern: /\bTHRU\b/i,                label: 'DIN thru / passthrough' },
  { pattern: /Komplete\s*Kontrol\s*DAW/i, label: 'NI Komplete Kontrol DAW' }
];

export type PortClassification =
  | { keep: true }
  | { keep: false; matchedLabel: string };

export function classifyPort(name: string): PortClassification {
  for (const { pattern, label } of HIDE_PATTERNS) {
    if (pattern.test(name)) return { keep: false, matchedLabel: label };
  }
  return { keep: true };
}

export function isMusicalPort(name: string): boolean {
  return classifyPort(name).keep;
}
