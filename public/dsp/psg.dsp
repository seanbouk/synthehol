declare name "psg";
declare author "Synthehol";
declare version "0.1";
declare description "Monophonic PSG synth — M3 phase 1: 1 oscillator, 4 waveforms, fixed ADSR.";

import("stdfaust.lib");

// Control inputs driven from the host engine.
// (`waveform` is a Faust reserved word for inline tables — using `wsel`
// for the variable; the UI label stays "waveform" so the host engine
// resolves the param by that name.)
freq = hslider("freq", 440, 20, 20000, 0.01);
gain = hslider("gain", 0.5, 0,  1,     0.01);
gate = button("gate");
wsel = hslider("waveform", 1, 0, 3, 1);

// Fixed ADSR for M3 phase 1; becomes user-controllable in M5.
attack  = 0.01;
decay   = 0.15;
sustain = 0.7;
release = 0.25;

// Oscillators. Triangle stands in for the mid-skew position of the ramp
// morph that lands in M4 — saw / reverse-saw become reachable then.
osc_pulse = os.square(freq);
osc_ramp  = os.triangle(freq);
osc_sine  = os.osc(freq);
osc_noise = no.noise;

voice = ba.selectn(4, int(wsel), osc_pulse, osc_ramp, osc_sine, osc_noise);

env = en.adsr(attack, decay, sustain, release, gate);

// Mono signal duplicated to stereo at the output.
process = voice * env * gain <: _, _;
