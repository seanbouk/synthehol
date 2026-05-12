declare name "psg";
declare author "Synthehol";
declare version "0.3";
declare description "Polyphonic PSG synth: 2 osc + shape morph + sync + ring + filter + drive + LFO + ADSR.";
declare options "[nvoices:16]";

import("stdfaust.lib");

// ─── Host-driven inputs ─────────────────────────────────────────────

freq      = hslider("freq",      440, 20, 20000, 0.01);
gain      = hslider("gain",      0.5, 0,  1,     0.01);
gate      = button("gate");

// Pitch bend, in semitones (host converts MIDI -8192..+8191 to ±2).
bend      = hslider("bend",      0,  -2,  2,    0.01);

// Mod wheel 0..1 — drives a fixed gentle vibrato (5 Hz, ±50 cents).
modwheel  = hslider("modwheel",  0,   0,  1,    0.01);

// ─── Voice controls (UI lands in M5 — defaults give a real synth voice) ─

shape     = hslider("shape",            0.5, 0, 1, 0.001);

// 0 = pulse, 1 = ramp, 2 = sine, 3 = noise (4 = off, OSC 2 only)
osc1_wave = hslider("osc1_wave",        1, 0, 3, 1);
osc2_wave = hslider("osc2_wave",        1, 0, 4, 1);

osc2_octave = hslider("osc2_octave",    0, -2, 2, 1);
osc2_detune = hslider("osc2_detune",    5, -50, 50, 0.1);  // cents

osc_mix     = hslider("osc_mix",        0.3, 0, 1, 0.01);

sync_on     = checkbox("sync_on");
ring_on     = checkbox("ring_on");

drive_on    = hslider("drive_on",       0, 0, 1, 1);
drive       = hslider("drive",          0, 0, 1, 0.01);
drive_type  = hslider("drive_type",     0, 0, 1, 1);  // 0 = soft, 1 = fold

filter_on   = hslider("filter_on",      1, 0, 1, 1);
cutoff      = hslider("cutoff",         5000, 20, 20000, 0.1);
resonance   = hslider("resonance",      0.2, 0, 0.99, 0.001);
filter_mode = hslider("filter_mode",    0, 0, 3, 1);   // 0=LP 1=HP 2=BP 3=Notch
filter_env_amount = hslider("filter_env_amount", 0.4, -1, 1, 0.01);

attack      = hslider("attack",         0.005, 0.001, 5, 0.001);
decay       = hslider("decay",          0.2,   0.001, 5, 0.001);
sustain     = hslider("sustain",        0.6,   0,  1, 0.01);
release     = hslider("release",        0.3,   0.001, 5, 0.001);

lfo_on      = hslider("lfo_on",         0, 0, 1, 1);
lfo_rate    = hslider("lfo_rate",       4,   0.1, 20, 0.01);
lfo_depth   = hslider("lfo_depth",      0,   0, 1, 0.01);
// 0 = pitch, 1 = cutoff, 2 = amp, 3 = shape
lfo_dest    = hslider("lfo_dest",       1, 0, 3, 1);


// ─── Parameter smoothing ────────────────────────────────────────────
// 20 ms one-pole low-pass kills zipper / click artifacts when params
// move during a held note (cutoff sweeps, shape tweaks, drive crank).

smoo20 = si.smooth(ba.tau2pole(0.02));

shape_s     = shape     : smoo20;
osc_mix_s   = osc_mix   : smoo20;
osc2_detune_s = osc2_detune : smoo20;
drive_s     = drive     : smoo20;
cutoff_s    = cutoff    : smoo20;
resonance_s = resonance : smoo20;
filter_env_amount_s = filter_env_amount : smoo20;
lfo_depth_s = lfo_depth : smoo20;


// ─── Modulation primitives ──────────────────────────────────────────

env = en.adsr(attack, decay, sustain, release, gate);

free_lfo = os.osc(lfo_rate) * lfo_depth_s * lfo_on;

// Vibrato driven by mod wheel: fixed 5 Hz rate, up to ±50 cents depth.
vibrato_cents  = os.osc(5.0) * modwheel * 50.0;
vibrato_factor = pow(2.0, vibrato_cents / 1200.0);

// Free-LFO destinations.
lfo_pitch_cents  = free_lfo * (lfo_dest == 0) * 100.0;
lfo_pitch_factor = pow(2.0, lfo_pitch_cents / 1200.0);

lfo_cutoff_oct   = free_lfo * (lfo_dest == 1) * 4.0;
lfo_amp_factor   = 1.0 + free_lfo * (lfo_dest == 2) * 0.5;
lfo_shape_mod    = free_lfo * (lfo_dest == 3) * 0.5;

mod_shape = max(0.0, min(1.0, shape_s + lfo_shape_mod));


// ─── Pitch ──────────────────────────────────────────────────────────

bend_factor = pow(2.0, bend / 12.0);
base_freq   = freq * bend_factor * vibrato_factor * lfo_pitch_factor;

f1 = base_freq;
f2 = base_freq * pow(2.0, osc2_octave) * pow(2.0, osc2_detune_s / 1200.0);


// ─── Shape-aware voice helpers ──────────────────────────────────────

// Variable-skew ramp: skew=0 → reverse-saw, 0.5 → triangle, 1 → saw.
ramp_voice(f, k) = ramp_from_phase(os.lf_sawpos(f), k);

ramp_from_phase(ph, k) = 2.0 * y - 1.0
with {
    skew    = max(0.01, min(0.99, k));
    rising  = ph / skew;
    falling = (1.0 - ph) / (1.0 - skew);
    y       = select2(ph < skew, falling, rising);
};

// Phase-distorted sine (Casio CZ style):
//   k=0   → first half compressed (one extreme)
//   k=0.5 → pure sine (no distortion)
//   k=1   → second half compressed (other extreme)
// Symmetric around 0.5 to match pulse and ramp morph behaviour.
phase_distorted_sine(f, k) = pd_sine_from_phase(os.lf_sawpos(f), k);

pd_sine_from_phase(ph, k) = sin(warped * 2.0 * ma.PI)
with {
    t      = 0.05 + k * 0.9;             // 0.05 → 0.95 as k goes 0 → 1
    warped = select2(ph < t,
                     0.5 + (ph - t) * 0.5 / (1.0 - t),
                     ph * 0.5 / t);
};

// Pulse from an explicit phase ramp (no band-limiting; OK at OSC 2's
// usual play range, used only when sync feeds OSC 2 a reset-capable
// phase counter).
pulse_from_phase(ph, k) = (ph < duty(k)) - 0.5;


// ─── Oscillators ────────────────────────────────────────────────────

duty(k)        = max(0.01, min(0.99, k));
pulse_voice(f) = os.pulsetrain(f, duty(mod_shape));

osc1 = ba.selectn(4, int(osc1_wave),
    pulse_voice(f1),
    ramp_voice(f1, mod_shape),
    phase_distorted_sine(f1, mod_shape),
    no.noise);

// Hard sync: track OSC 1's phase via a parallel sawpos and detect each
// wrap (current < previous). The trigger pulse resets OSC 2's manual
// phase counter so OSC 2 re-runs from 0 every OSC 1 cycle, but keeps
// the harmonic content of its own free-running frequency f2.
osc1_phase_track = os.lf_sawpos(f1);
osc1_wrap        = osc1_phase_track < osc1_phase_track';
sync_trigger     = osc1_wrap * sync_on;

// OSC 2 phase counter: increments by f2/SR per sample, wraps in [0, 1),
// resets to 0 on sync_trigger.
osc2_phase = (+(f2 / ma.SR) : ma.frac : *(1.0 - sync_trigger)) ~ _;

osc2 = ba.selectn(5, int(osc2_wave),
    pulse_from_phase(osc2_phase, mod_shape),
    ramp_from_phase(osc2_phase, mod_shape),
    pd_sine_from_phase(osc2_phase, mod_shape),
    no.noise,
    0.0);   // 4 = off


// ─── Mix / ring (sync is a no-op for M4) ────────────────────────────
// When OSC 2 is off (wave == 4), the effective mix and ring amounts
// collapse to zero so output stays at 100% OSC 1 regardless of the
// mix slider or ring toggle.

osc2_on        = int(osc2_wave) < 4;
effective_mix  = osc_mix_s * osc2_on;
effective_ring = ring_on   * osc2_on;

ring_signal = osc1 * osc2;
mixed       = osc1 * (1.0 - effective_mix) + osc2 * effective_mix;
combined    = mixed * (1.0 - effective_ring) + ring_signal * effective_ring;


// ─── Drive (waveshaper) ─────────────────────────────────────────────

// Both modes are dry-blended with `drive` so 0 = clean.
soft_drive(x) = x * (1.0 - drive_s)
              + ma.tanh(x * (1.0 + drive_s * 4.0)) * drive_s;

fold_drive(x) = x * (1.0 - drive_s)
              + sin(x * (1.0 + drive_s * 6.0) * ma.PI * 0.5) * drive_s;

drive_picked = select2(drive_type < 0.5, fold_drive(combined), soft_drive(combined));
driven       = select2(drive_on > 0.5, combined, drive_picked);


// ─── Filter ────────────────────────────────────────────────────────

q = 0.5 + resonance_s * 19.5;

mod_cutoff_oct  = env * filter_env_amount_s * 4.0 + lfo_cutoff_oct;
modulated_cutoff = max(20.0, min(20000.0, cutoff_s * pow(2.0, mod_cutoff_oct)));

filt_lp    = fi.resonlp(modulated_cutoff, q, 1.0, driven);
filt_hp    = fi.resonhp(modulated_cutoff, q, 1.0, driven);
filt_bp    = fi.resonbp(modulated_cutoff, q, 1.0, driven);
// Simple notch: subtract the band-pass output from the dry signal.
filt_notch = driven - filt_bp;

filt_picked = ba.selectn(4, int(filter_mode),
    filt_lp, filt_hp, filt_bp, filt_notch);
filtered = select2(filter_on > 0.5, driven, filt_picked);


// ─── Output ─────────────────────────────────────────────────────────

out_signal = filtered * env * gain * lfo_amp_factor;
process    = out_signal <: _, _;
