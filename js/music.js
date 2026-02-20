import { MUSIC } from './constants.js';

/**
 * Procedural background music with 6 oscillator layers that fade in/out
 * based on wave progression. Connects through the shared masterGain node
 * so mute/unmute propagates automatically.
 *
 * Layers:
 *  0 - Bass Drone (wave 1+):  two sine oscillators + LFO breathing
 *  1 - Sub Pulse (wave 3+):   beat-synced sine pulse
 *  2 - Pad Chord (wave 6+):   3-note chord progression
 *  3 - Rhythm (wave 10+):     filtered square, 8th-note gate pattern
 *  4 - Arpeggio (wave 15+):   triangle wave pentatonic patterns
 *  5 - Tension (wave 25+):    filtered sawtooth + tritone
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
        this._intensity = 0;  // current wave for intensity mapping
    }

    start() {
        if (this._started) return;
        this._started = true;

        const now = this.ctx.currentTime;
        this._nextBeatTime = now + 0.1;  // slight delay to avoid scheduling in the past
        this._beatIndex = 0;
        this._barIndex = 0;
        this._chordIndex = 0;

        this._createBassDrone();
        this._createTensionLayer();
    }

    stop() {
        if (!this._started) return;
        const now = this.ctx.currentTime;

        // Fade out all layers
        for (const g of this.layerGains) {
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(0, now + 0.5);
        }

        // Fade music gain
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
        this.musicGain.gain.linearRampToValueAtTime(0, now + 0.5);

        // Schedule cleanup
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
        // Re-sync beat scheduler so notes aren't scheduled in the past
        if (this._nextBeatTime < now) {
            this._nextBeatTime = now + 0.05;
        }
    }

    setIntensity(wave) {
        this._intensity = wave;
        const now = this.ctx.currentTime;
        const fade = MUSIC.fadeTime;

        // Update BPM based on intensity (72 → 108 over waves 1-35)
        const t = Math.min(1, wave / 35);
        this._bpm = MUSIC.baseBPM + (MUSIC.maxBPM - MUSIC.baseBPM) * t;
        this._beatDuration = 60 / this._bpm;

        // Activate/deactivate layers based on wave thresholds
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
        const lookAhead = 0.1;  // schedule 100ms ahead

        while (this._nextBeatTime < now + lookAhead) {
            this._scheduleBeat(this._nextBeatTime);
            this._nextBeatTime += this._beatDuration / 2;  // 8th notes
            this._beatIndex = (this._beatIndex + 1) % 8;

            if (this._beatIndex === 0) {
                this._barIndex++;
                if (this._barIndex % 4 === 0) {
                    // Advance chord every 4 bars
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

    _createBassDrone() {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // D2 (73.42 Hz)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 73.42;
        osc1.connect(this.layerGains[0]);
        osc1.start(now);
        this._nodes.push(osc1);

        // A2 (110 Hz) — perfect fifth
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 110.00;
        osc2.connect(this.layerGains[0]);
        osc2.start(now);
        this._nodes.push(osc2);

        // LFO for breathing effect on bass
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.15;  // slow breathing
        lfoGain.gain.value = 0.015;   // subtle volume modulation
        lfo.connect(lfoGain);
        lfoGain.connect(this.layerGains[0].gain);
        lfo.start(now);
        this._nodes.push(lfo);
    }

    // ── Layer 1: Sub Pulse ──────────────────────────────────

    _scheduleSubPulse(time) {
        if (this._layerTargets[1] === 0) return;
        // Pulse on beats 0 and 4 (downbeats in 8th-note grid)
        if (this._beatIndex !== 0 && this._beatIndex !== 4) return;

        const ctx = this.ctx;
        const dur = this._beatDuration * 0.8;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 73.42;  // D2

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(1.0, time + 0.02);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(env);
        env.connect(this.layerGains[1]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 2: Pad Chord ──────────────────────────────────

    _schedulePadChord(time) {
        if (this._layerTargets[2] === 0) return;
        // Only trigger chord on bar boundaries (beat 0)
        if (this._beatIndex !== 0) return;

        const ctx = this.ctx;
        const chords = this._goldrush ? MUSIC.chords.major : MUSIC.chords.minor;
        const chord = chords[this._chordIndex];
        const dur = this._beatDuration * 8;  // full bar sustain

        for (const freq of chord) {
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            env.gain.setValueAtTime(0, time);
            env.gain.linearRampToValueAtTime(0.33, time + 0.3);
            env.gain.linearRampToValueAtTime(0.25, time + dur * 0.7);
            env.gain.linearRampToValueAtTime(0, time + dur);

            osc.connect(env);
            env.connect(this.layerGains[2]);
            osc.start(time);
            osc.stop(time + dur + 0.01);
        }
    }

    // ── Layer 3: Rhythm ─────────────────────────────────────

    _scheduleRhythm(time) {
        if (this._layerTargets[3] === 0) return;

        const pattern = MUSIC.rhythmPattern;
        if (!pattern[this._beatIndex]) return;

        const ctx = this.ctx;
        const dur = this._beatDuration * 0.3;

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const env = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 146.83;  // D3

        filter.type = 'lowpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.7, time + 0.005);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.layerGains[3]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 4: Arpeggio ───────────────────────────────────

    _scheduleArpeggio(time) {
        if (this._layerTargets[4] === 0) return;
        // 16th notes: every beat index (8th note grid already, play every hit)
        const ctx = this.ctx;
        const scale = MUSIC.scale;
        const patterns = MUSIC.arpPatterns;

        const pattern = patterns[this._arpPatternIndex];
        const noteIdx = pattern[this._arpNoteIndex];
        const freq = scale[noteIdx] || 220;

        // Advance arp position
        this._arpNoteIndex++;
        if (this._arpNoteIndex >= pattern.length) {
            this._arpNoteIndex = 0;
            this._arpPatternIndex = (this._arpPatternIndex + 1) % patterns.length;
        }

        const dur = this._beatDuration * 0.4;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * 2;  // octave up for clarity

        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(0.6, time + 0.01);
        env.gain.linearRampToValueAtTime(0, time + dur);

        osc.connect(env);
        env.connect(this.layerGains[4]);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ── Layer 5: Tension ────────────────────────────────────

    _createTensionLayer() {
        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Sawtooth drone — tritone (D + Ab) for dissonance
        const osc1 = ctx.createOscillator();
        const filter1 = ctx.createBiquadFilter();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 146.83;  // D3
        filter1.type = 'lowpass';
        filter1.frequency.value = 400;
        filter1.Q.value = 3;
        osc1.connect(filter1);
        filter1.connect(this.layerGains[5]);
        osc1.start(now);
        this._nodes.push(osc1);

        const osc2 = ctx.createOscillator();
        const filter2 = ctx.createBiquadFilter();
        osc2.type = 'sawtooth';
        osc2.frequency.value = 207.65;  // Ab3 (tritone from D)
        filter2.type = 'lowpass';
        filter2.frequency.value = 350;
        filter2.Q.value = 3;
        osc2.connect(filter2);
        filter2.connect(this.layerGains[5]);
        osc2.start(now);
        this._nodes.push(osc2);

        // Slow LFO on filter cutoff for movement
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(filter1.frequency);
        lfoGain.connect(filter2.frequency);
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
