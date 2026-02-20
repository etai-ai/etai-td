import { MUSIC } from './constants.js';

/**
 * Procedural ambient background music with 6 layers that fade in/out
 * based on wave progression. Sine and triangle waves only — soft and warm.
 *
 * Layers:
 *  0 - Bass Drone (wave 1+):  single sine with slow frequency vibrato
 *  1 - Sub Pulse (wave 3+):   gentle sine pulse on downbeats
 *  2 - Pad Chord (wave 6+):   soft sine chord progression (2 bars per chord)
 *  3 - Rhythm (wave 10+):     soft triangle plucks, sparse pattern
 *  4 - Arpeggio (wave 15+):   gentle triangle, every other 8th note
 *  5 - Tension (wave 25+):    low sine drone with slow filter sweep
 */
export class Music {
    constructor(ctx, masterGain) {
        this.ctx = ctx;
        this.masterGain = masterGain;

        // Music sub-mix gain
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = MUSIC.masterGain;
        this.musicGain.connect(masterGain);

        // Per-layer gain nodes
        this.layerGains = [];
        for (let i = 0; i < 6; i++) {
            const g = ctx.createGain();
            g.gain.value = 0;
            g.connect(this.musicGain);
            this.layerGains.push(g);
        }

        // Active oscillator/node references (for cleanup)
        this._nodes = [];

        // Scheduling state
        this._bpm = MUSIC.baseBPM;
        this._beatDuration = 60 / this._bpm;
        this._nextBeatTime = 0;
        this._beatIndex = 0;      // 8th-note index (0-7 per bar)
        this._barIndex = 0;       // bar counter
        this._chordIndex = 0;     // chord progression position (0-3)

        // Arp state
        this._arpPatternIndex = 0;
        this._arpNoteIndex = 0;

        // Layer activation targets
        this._layerTargets = [0, 0, 0, 0, 0, 0];

        // Flags
        this._started = false;
        this._goldrush = false;
        this._bossActive = false;
        this._betweenWaves = false;
        this._intensity = 0;
    }

    start() {
        if (this._started) return;
        this._started = true;

        const now = this.ctx.currentTime;
        this._nextBeatTime = now + 0.1;
        this._beatIndex = 0;
        this._barIndex = 0;
        this._chordIndex = 0;

        this._createBassDrone();
        this._createTensionLayer();
    }

    stop() {
        if (!this._started) return;
        const now = this.ctx.currentTime;

        for (const g of this.layerGains) {
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(0, now + 0.5);
        }

        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(0, now + 0.5);

        setTimeout(() => this._cleanup(), 600);
        this._started = false;
    }

    pause() {
        if (!this._started) return;
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(0, now, MUSIC.pauseFade);
    }

    resume() {
        if (!this._started) return;
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(MUSIC.masterGain, now, MUSIC.pauseFade);
        if (this._nextBeatTime < now) {
            this._nextBeatTime = now + 0.05;
        }
    }

    setIntensity(wave) {
        this._intensity = wave;
        const now = this.ctx.currentTime;
        const fade = MUSIC.fadeTime;

        const t = Math.min(1, wave / 35);
        this._bpm = MUSIC.baseBPM + (MUSIC.maxBPM - MUSIC.baseBPM) * t;
        this._beatDuration = 60 / this._bpm;

        for (let i = 0; i < 6; i++) {
            const [threshold, maxGain] = MUSIC.layers[i];
            const target = wave >= threshold ? maxGain : 0;
            this._layerTargets[i] = target;

            const g = this.layerGains[i];
            const effectiveTarget = this._betweenWaves ? target * MUSIC.betweenWaveGain : target;
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(effectiveTarget, now + fade);
        }
    }

    setBetweenWaves(between) {
        this._betweenWaves = between;
        const now = this.ctx.currentTime;
        const fade = 1.0;

        for (let i = 0; i < 6; i++) {
            const target = between
                ? this._layerTargets[i] * MUSIC.betweenWaveGain
                : this._layerTargets[i];
            const g = this.layerGains[i];
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(target, now + fade);
        }
    }

    setGoldrush(on) {
        this._goldrush = on;
    }

    setBossActive(on) {
        this._bossActive = on;
    }

    update(dt) {
        if (!this._started || !this.ctx) return;

        const now = this.ctx.currentTime;
        const lookAhead = 0.1;

        while (this._nextBeatTime < now + lookAhead) {
            this._scheduleBeat(this._nextBeatTime);
            this._nextBeatTime += this._beatDuration / 2;  // 8th notes
            this._beatIndex = (this._beatIndex + 1) % 8;

            if (this._beatIndex === 0) {
                this._barIndex++;
                if (this._barIndex % 2 === 0) {
                    // Advance chord every 2 bars
                    this._chordIndex = (this._chordIndex + 1) % 4;
                }
            }
        }
    }

    // ── Internal: Beat Scheduler ──────────────────────────────

    _scheduleBeat(time) {
        this._scheduleSubPulse(time);
        this._schedulePadChord(time);
        this._scheduleRhythm(time);
        this._scheduleArpeggio(time);
    }

    // ── Layer 0: Bass Drone ──────────────────────────────────
    // Single warm sine with slow frequency vibrato — no gain LFO

    _createBassDrone() {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // D2 sine drone
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 73.42;  // D2

        // Slow vibrato on frequency (not gain) — gentle breathing
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12;    // very slow
        lfoGain.gain.value = 1.5;      // ±1.5 Hz vibrato
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.connect(this.layerGains[0]);
        osc.start(now);
        lfo.start(now);
        this._nodes.push(osc, lfo);
    }

    // ── Layer 1: Sub Pulse ──────────────────────────────────
    // Gentle sine on downbeats only (once per bar)

    _scheduleSubPulse(time) {
        if (this._layerTargets[1] === 0) return;
        if (this._beatIndex !== 0) return;  // bar downbeat only

        const ctx = this.ctx;
        const dur = this._beatDuration * 1.5;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 55.00;  // A1 — deep sub

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.5, time + 0.08);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(env);
        env.connect(this.layerGains[1]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 2: Pad Chord ──────────────────────────────────
    // Soft sine chords, long sustain with slow attack/release

    _schedulePadChord(time) {
        if (this._layerTargets[2] === 0) return;
        if (this._beatIndex !== 0) return;  // bar start only

        const ctx = this.ctx;
        const chords = this._goldrush ? MUSIC.chords.major : MUSIC.chords.minor;
        const chord = chords[this._chordIndex];
        const dur = this._beatDuration * 8;  // full bar

        for (const freq of chord) {
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Very slow attack and release for smooth pad feel
            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.2, time + 0.8);
            env.gain.linearRampToValueAtTime(0.15, time + dur * 0.6);
            env.gain.linearRampToValueAtTime(0, time + dur);

            osc.connect(env);
            env.connect(this.layerGains[2]);
            osc.start(time);
            osc.stop(time + dur + 0.01);
        }
    }

    // ── Layer 3: Rhythm ─────────────────────────────────────
    // Soft triangle plucks, sparse pattern

    _scheduleRhythm(time) {
        if (this._layerTargets[3] === 0) return;

        const pattern = MUSIC.rhythmPattern;
        if (!pattern[this._beatIndex]) return;

        const ctx = this.ctx;
        const dur = this._beatDuration * 0.25;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = 293.66;  // D4

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + 0.005);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(env);
        env.connect(this.layerGains[3]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 4: Arpeggio ───────────────────────────────────
    // Gentle triangle, every other 8th note (sparse)

    _scheduleArpeggio(time) {
        if (this._layerTargets[4] === 0) return;
        // Play every other 8th note for a spacious feel
        if (this._beatIndex % 2 !== 0) return;

        const ctx = this.ctx;
        const scale = MUSIC.scale;
        const patterns = MUSIC.arpPatterns;

        const pattern = patterns[this._arpPatternIndex];
        const noteIdx = pattern[this._arpNoteIndex];
        const freq = scale[noteIdx] || 220;

        this._arpNoteIndex++;
        if (this._arpNoteIndex >= pattern.length) {
            this._arpNoteIndex = 0;
            this._arpPatternIndex = (this._arpPatternIndex + 1) % patterns.length;
        }

        const dur = this._beatDuration * 0.6;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;  // natural octave, no shift

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.3, time + 0.015);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(env);
        env.connect(this.layerGains[4]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 5: Tension ────────────────────────────────────
    // Low sine drone with slow filter sweep — ominous but not harsh

    _createTensionLayer() {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Low D2 sine — same root as bass but with filter movement
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        osc.type = 'triangle';
        osc.frequency.value = 73.42;   // D2
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;
        osc.connect(filter);
        filter.connect(this.layerGains[5]);
        osc.start(now);
        this._nodes.push(osc);

        // A2 — perfect fifth, consonant tension
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = 110.00;  // A2
        osc2.connect(filter);
        osc2.start(now);
        this._nodes.push(osc2);

        // Slow LFO sweeps filter cutoff
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.06;     // very slow sweep
        lfoGain.gain.value = 80;        // 200 ± 80 Hz
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(now);
        this._nodes.push(lfo);
    }

    // ── Cleanup ─────────────────────────────────────────────

    _cleanup() {
        for (const node of this._nodes) {
            try { node.stop(); } catch (e) { /* already stopped */ }
            try { node.disconnect(); } catch (e) { /* already disconnected */ }
        }
        this._nodes = [];
        try { this.musicGain.disconnect(); } catch (e) {}
        for (const g of this.layerGains) {
            try { g.disconnect(); } catch (e) {}
        }
    }
}
