# Synthehol

A multi-instrument live performance workstation for MIDI controllers. Plug in your keyboards, each one becomes a different instrument, play them all at once.

## What it is

Synthehol is a browser-based music workstation that turns MIDI controllers into a live-playable multi-instrument rig. Each MIDI device you plug in opens its own tab with its own instrument. Two always-on tabs (drums, bass) are playable from touch or mouse. A global output stage (EQ, delay, reverb, etc.) tunes the overall sound to your room or recording.

Built web-first for fast iteration and free distribution. Architected so the audio engine and instrument designs port cleanly to native Android (later iOS / desktop) without rewriting from scratch.

## Why I'm building it

I have old MIDI keyboards. The hardware is good — keys feel nice, controllers respond well — but the sound is locked behind either dead software (the bundled DAW stopped getting updates a decade ago) or paid-tier upgrades that cost more per year than buying a new keyboard. The keyboards keep working; the sounds don't.

Synthehol is the tool I want for those keyboards. Free on the web because old keyboards shouldn't be e-waste. Possibly paid as native apps later — at that point you'd be paying for low-latency native audio and a true instrument experience, not access to sounds.

## Stack

### Web (primary target)

- **UI:** React + Vite + TypeScript
- **DSP:** [Faust](https://faust.grame.fr/) compiled to AudioWorklet + WebAssembly
- **Sampling (v1):** `soundfont-player` for GM instruments; upgrading to an AudioWorklet-based SFZ player as we approach production quality per-instrument
- **MIDI:** Web MIDI API directly

### Native (later — same DSP, different host)

- **Android:** Jetpack Compose + Kotlin + [Oboe](https://github.com/google/oboe) (low-latency audio) + Faust-compiled C++ DSP + [sfizz](https://sfz.tools/sfizz/) (SFZ playback)
- **iOS (if and when):** SwiftUI + AVAudioEngine + same Faust C++ + same sfizz
- **Desktop (if and when):** TBD

## Architecture

```
┌─────────────────────────────────────────────────┐
│  UI                                             │
│   Web: React + Vite                             │
│   Native: per-platform native toolkit           │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│  Control layer  (MIDI routing, sustain, state)  │
│   Per-platform, small enough to rewrite         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│  DSP layer  (Faust — SHARED, never rewritten)   │
│   compiles to → AudioWorklet + Wasm  (web)      │
│   compiles to → C++ static lib       (native)   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│  Audio host                                     │
│   Web:     AudioWorklet                         │
│   Android: Oboe;  iOS: AVAudioEngine            │
└─────────────────────────────────────────────────┘

Sample-based instruments run in a parallel track:
  per-platform sampler  →  shared SF2/SFZ soundbanks
```

**Portability principle:** the things that define the product (DSP, soundbanks, instrument design, visual design language) are shared and never rewritten. The things that define the platform (UI, OS audio host, control glue) are rewritten per target. Going to a new platform doesn't mean starting over.

### MIDI mapping is two layers

```
Device CC  →  abstract slot  →  instrument function
                                 (per-instrument)
  ↑              ↑
device         fixed: 8 knobs / 4 sliders / 1 encoder /
profile        mod wheel / pitch bend / sustain pedal
```

Map your device once. All instruments work. New instrument? It defines what "knob 1" means for itself; no device setup needed.

## User flow

```
┌─ Home ─┬─ Drums ─┬─ Bass ─┬─ [device 1] ─┬─ [device 2] ─┬─ … ─┬─ Output ─┐
│  load/ │ touch-  │ touch- │  instrument  │  instrument  │     │  global  │
│  save  │ played, │ played │  picker +    │  picker +    │     │  FX,     │
│  setup,│ MIDI    │ MIDI   │  panel       │  panel       │     │ "your    │
│  panic,│ routable│ routable                                  │  sound"  │
│  global│         │        │                                  │          │
└────────┴─────────┴────────┴──────────────┴──────────────┴─────┴──────────┘
   fixed                    appear / disappear on MIDI hot-plug      fixed
```

**Per-device tabs** appear when a MIDI device is plugged in and remember their last instrument + settings via device ID. Unplug your Minilab and the tab disappears; replug it and the tab returns with your patch exactly as you left it.

**Same instrument, different settings:** two MIDI devices can both run a PSG (or FM, or anything) with independent waveform / filter / envelope settings. Useful for layering — e.g. two keyboards both doing FM with different algorithms or in different octaves.

**Routing:** every tab's audio passes through the Output stage on the way to speakers.

## Planned features

### Instruments

| Instrument  | Description                                                              | Status                  |
|-------------|--------------------------------------------------------------------------|-------------------------|
| PSG         | Mono chip-style synth (NES / Gameboy / C64 / Master System -inspired)    | In development          |
| FM          | 6-operator DX-style synth with multiple algorithms                        | Planned                 |
| Wavetable   | Multi-position morphing wavetable                                         | Planned                 |
| Drums       | Touch-played drum machine, multiple kits — always-on tab                  | Planned (placeholder)   |
| Bass        | Touch-played mono bass — always-on tab                                    | Planned (placeholder)   |
| Piano       | Sampled acoustic + electric piano                                         | Planned                 |
| Guitar      | Karplus-Strong plucked strings + sampled options                          | Planned                 |
| GM Sampler  | General MIDI instrument palette for sketching                             | Planned                 |
| Voice Toy   | Formant / vowel synth with plosive transients — playful, not realistic   | Planned (later)         |

### Output stage (always-on tab)

EQ, delay, reverb, compressor, limiter — your global "this is how I sound" or "this is what works in this room" settings. Empty placeholder in v1.

### Home tab

- Setup save/load (per-device instrument assignments + all instrument settings + output state)
- Global panic
- Master tempo / MIDI clock source (when tempo-synced features arrive)
- MIDI device mapping editor (CC → abstract slot, per device)

## Instrument: PSG (in development)

A polyphonic synth inspired by classic PSG (Programmable Sound Generator) chips. Clean engine — not an emulator — that can produce NES, Gameboy, C64, and Master System -style voices alongside modern synth tones.

### Signal chain

```
OSC1 ─┐
      ├─ mix ─→ drive (waveshaper) ─→ filter ─→ amp envelope ─→ out
OSC2 ─┘

  - OSC2 can sync or ring-modulate against OSC1
  - LFO modulates one of: pitch | cutoff | amp | shape
  - Shared ADSR drives the amp directly and the filter cutoff
    via a "filter envelope amount" UI control
```

### Oscillators

Two oscillators, each with the same waveform options. OSC2 has tuning offsets relative to OSC1 (octave selector in UI, fine detune on a slider).

### Waveforms and shape morph

The **shape** knob is a per-waveform character control whose meaning adapts to the selected waveform:

| Waveform | Shape knob (0 → 0.5 → 1)              | Notes                                                                                 |
|----------|---------------------------------------|---------------------------------------------------------------------------------------|
| Pulse    | duty cycle 1% → 50% (square) → 99%    | Phase inverts past 50% — audible when stacked or ring-modulated with the other osc    |
| Ramp     | reverse-saw → triangle → saw          | One continuous control across all three ramp shapes                                   |
| Sine     | early-compressed → pure → late-compressed | Casio CZ-style phase distortion, symmetric around 0.5 (pure sine at centre)        |
| Noise    | short LFSR → long LFSR                | Short = metallic NES / SMS chatter; long = white-ish                                  |

The shape knob affects **both oscillators simultaneously** (a single shared control — keeps the panel tidy and the morph musical).

### Drive (waveshaper)

A non-linear amplitude shaper sitting between the oscillator mix and the filter. Not a filter — it operates on the signal's time-domain amplitude rather than its frequency content. Two flavors selectable in the UI:

- **Soft** — tape-style analog saturation (warmth, gentle harmonic enrichment)
- **Fold** — wave-folding (Buchla / west-coast character; signal that exceeds ±1 folds back instead of clipping, generating rich inharmonic upper partials)

The Drive *amount* knob controls intensity in either mode.

### Filter

Resonant multimode filter with selectable mode (LP / HP / BP / Notch). Cutoff and resonance on dedicated knobs. The shared ADSR envelope can also modulate the cutoff via a "filter envelope amount" UI control.

### Envelope

One shared ADSR. Drives the amp directly. Drives the filter cutoff scaled by the filter envelope amount.

### LFO

Single LFO. Rate on slider 3, depth on slider 4. Destination selectable in the UI: pitch, cutoff, amp, or shape.

### Hardware control map

Reference mapping for the Arturia Minilab 3 (primary development device). Other devices use the same abstract slots; their per-device profile maps controller CCs to those slots.

| Hardware       | CC   | PSG function                                  |
|----------------|------|-----------------------------------------------|
| Knob 1         | 86   | Shape (both oscillators)                      |
| Knob 2         | 87   | Drive amount                                  |
| Knob 3         | 89   | Filter cutoff                                 |
| Knob 4         | 90   | Filter resonance                              |
| Knob 5         | 110  | Envelope attack                               |
| Knob 6         | 111  | Envelope decay                                |
| Knob 7         | 116  | Envelope sustain                              |
| Knob 8         | 117  | Envelope release                              |
| Slider 1       | 14   | OSC mix (OSC1 ↔ OSC2 balance)                 |
| Slider 2       | 15   | OSC2 detune (±50 cents fine)                  |
| Slider 3       | 30   | LFO depth                                     |
| Slider 4       | 31   | LFO rate                                      |
| Encoder        | 28   | Cycle OSC1 waveform                           |
| Mod wheel      | CC1  | Vibrato depth (gentle LFO → pitch, fixed rate)|
| Pitch bend     | —    | Pitch ±2 semitones                            |
| Sustain pedal  | CC64 | Sustain (deferred note-offs while held)       |

### UI-only controls

Set per-patch, not exposed to hardware:

- OSC1 waveform (also cyclable via encoder)
- OSC2 waveform
- OSC2 octave (-2 / -1 / 0 / +1 / +2)
- Filter mode (LP / HP / BP / Notch)
- Sync (OSC2 → OSC1) toggle
- Ring mod toggle
- Drive type (Soft / Fold)
- LFO destination (pitch / cutoff / amp / shape)
- Filter envelope amount

### Visualisations

Two "screens" on the panel:

- **Oscilloscope** — live waveform of the mixed oscillator output
- **ADSR curve** — drawn under the envelope controls, updating live as A / D / S / R knobs move

### What ships in v1 of PSG

Everything above. The panel is unskinned (functional layout only) in v1; visual design follows once the software layout is settled, and then it's skinned in keeping with the broader app-wide AI-generated, Apple-skeumorphic-era aesthetic.

## Reference implementation

A working Web MIDI proof-of-concept lives at <https://github.com/seanbouk/midi-device-debug> (live: <https://seanbouk.github.io/midi-device-debug/>). It informs Synthehol's MIDI handling, the sustain-deferred-note-off dispatcher pattern, log dedup, and the engine interface shape — but it's a single-file demo, not a production architecture.

## Status

Pre-alpha. README first, PSG instrument next.
