import { WAVES, WAVE_BONUS_BASE, WAVE_BONUS_PER, INTEREST_RATE, CANVAS_W, CANVAS_H, getWaveHPScale, WAVE_MODIFIERS, MODIFIER_START_WAVE, MODIFIER_CHANCE, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, DUAL_SPAWN_WAVE, DUAL_SPAWN_START_PCT, DUAL_SPAWN_RAMP_PCT, DUAL_SPAWN_MAX_PCT, FLYING_START_WAVE, GOLDRUSH_INTERVAL, SPEED_MAX, WAVE_GEN, STATE } from './constants.js';
import { Economy } from './economy.js';

export class WaveManager {
    constructor(game) {
        this.game = game;
        this.currentWave = 0;
        this.spawning = false;
        this.waveComplete = false;
        this.betweenWaves = true;
        this.waveCountdown = 0;
        this.betweenWaveTimer = 0;

        // Wave modifier
        this.modifier = null;     // key from WAVE_MODIFIERS
        this.modifierDef = null;  // full modifier object
        this.hpModifier = 1.0;    // horde HP multiplier

        // Special wave tag (goldrush)
        this.waveTag = null;
        this._pendingWaveSetup = false;

        // Spawn state
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
        this.spawnCounter = 0;

        // Cached next wave (so preview matches actual spawn)
        this._nextWaveCache = null;

        // Secondary reinforcement bursts
        this.reinforceTimer = 0;
        this.reinforceBursts = 0;
    }

    startNextWave() {
        // Early-send bonus (only between waves, not the first wave)
        if (this.betweenWaves && this.currentWave > 0) {
            const bonus = Math.max(0, Math.floor(EARLY_SEND_MAX_BONUS - this.betweenWaveTimer * EARLY_SEND_DECAY));
            if (bonus > 0) {
                this.game.economy.addGold(bonus);
                this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 2.5, `Early send +${bonus}g`, '#00e5ff');
            }
        }

        this.currentWave++;

        // Trigger unlocks/announcements BEFORE the wave starts
        this.game.ui.setupTowerPanel();
        this.game.onWaveThreshold(this.currentWave);

        // If unlock screen paused the game, defer wave setup until Continue is clicked
        if (this.game.state === STATE.PAUSED) {
            this._pendingWaveSetup = true;
            return;
        }

        this._beginWave();
    }

    _beginWave() {
        this._pendingWaveSetup = false;

        this.spawning = true;
        this.waveComplete = false;
        this.betweenWaves = false;
        this.betweenWaveTimer = 0;
        this.reinforceTimer = 0;
        this.reinforceBursts = 0;
        this.secondaryCount = 0;
        this.game.waveElapsed = 0;

        // Goldrush every N waves
        this.waveTag = null;
        if (this.currentWave % GOLDRUSH_INTERVAL === 0) {
            this.waveTag = 'goldrush';
        }
        if (this.waveTag === 'goldrush') {
            this.game.particles.spawnBigFloatingText(CANVAS_W / 2, CANVAS_H / 3, 'GOLD RUSH!', '#ffd700');
        }

        // Roll for wave modifier
        this.modifier = null;
        this.modifierDef = null;
        this.hpModifier = 1.0;
        if (this.currentWave >= MODIFIER_START_WAVE && Math.random() < MODIFIER_CHANCE) {
            const keys = Object.keys(WAVE_MODIFIERS);
            this.modifier = keys[Math.floor(Math.random() * keys.length)];
            this.modifierDef = WAVE_MODIFIERS[this.modifier];
            // Announce modifier
            this.game.particles.spawnBigFloatingText(
                CANVAS_W / 2, CANVAS_H / 2.5,
                `${this.modifierDef.name.toUpperCase()}! ${this.modifierDef.desc}`,
                this.modifierDef.color
            );
        }

        // Use cached definition if available (matches what preview showed)
        const waveDef = this._nextWaveCache || this.getWaveDefinition(this.currentWave);
        this._nextWaveCache = null;

        // Apply horde modifier: more enemies, less HP
        if (this.modifier === 'horde') {
            for (const g of waveDef) {
                g.count = Math.ceil(g.count * this.modifierDef.countMulti);
            }
            this.hpModifier = this.modifierDef.hpMulti;
        }

        this.spawnGroups = waveDef;
        this.groupTimers = waveDef.map(g => g.delay || 0);
        this.groupIndices = waveDef.map(() => 0);

        this.game.debug.onWaveStart(this.game);
        this.game.audio.playWaveStart();
    }

    getWaveDefinition(waveNum) {
        // Intro waves 1-5 from hand-crafted definitions
        let def;
        if (waveNum <= WAVES.length) {
            def = WAVES[waveNum - 1].map(g => ({ ...g }));
        } else {
            // Wave 6+: procedural generation
            def = this.generateWave(waveNum);
        }
        // Append flying enemies (per-map flyingStartWave, default FLYING_START_WAVE)
        const flyStart = this.game?.map?.def?.flyingStartWave ?? FLYING_START_WAVE;
        if (waveNum >= flyStart) {
            const flyCount = Math.min(20, 1 + Math.round((waveNum - flyStart) * 19 / 13));
            def.push({ type: 'flying', count: flyCount, interval: 0.8, delay: 0 });
        }
        return def;
    }

    generateWave(waveNum) {
        const W = WAVE_GEN;
        const types = ['grunt', 'runner', 'tank', 'healer', 'swarm'];

        const groups = [];
        const groupCount = Math.min(W.GROUP_MAX, W.GROUP_BASE + Math.floor(waveNum / W.GROUP_PER_WAVES));
        let runningDelay = 0;
        let lastType = null;

        for (let i = 0; i < groupCount; i++) {
            // Pick type, avoiding adjacent repeats
            let available = types.filter(t => t !== lastType);
            const type = available[Math.floor(Math.random() * available.length)];
            lastType = type;

            // Ease enemy count during dual spawn introduction (waves 15-20)
            const dualEase = (waveNum >= DUAL_SPAWN_WAVE && waveNum <= DUAL_SPAWN_WAVE + 5)
                ? 0.45 + (waveNum - DUAL_SPAWN_WAVE) * 0.11 : 1.0;
            const count = Math.floor((W.COUNT_BASE + waveNum * W.COUNT_PER_WAVE + Math.random() * W.COUNT_RANDOM) * W.COUNT_MULTIPLIER * dualEase);
            const baseInterval = Math.max(W.INTERVAL_MIN, W.INTERVAL_BASE - waveNum * W.INTERVAL_DECAY);
            const interval = baseInterval * (W.INTERVAL_MULTI[type] || 1.0);

            groups.push({
                type,
                count,
                interval,
                delay: runningDelay,
            });

            // Next group starts partway through this one + small gap
            const gap = W.GROUP_GAP_MIN + Math.random() * W.GROUP_GAP_RANDOM;
            runningDelay += count * interval * W.GROUP_OVERLAP + gap;
        }

        // Boss every 5 waves — arrives after all groups finish (replaced by megaboss at 25+)
        if (waveNum % 5 === 0 && waveNum < 25) {
            const bossCount = Math.floor(waveNum / 10) + 1;
            groups.push({
                type: 'boss',
                count: bossCount,
                interval: W.BOSS_INTERVAL,
                delay: runningDelay + W.BOSS_DELAY,
            });
        }

        // Mega boss every 2 waves starting at 25 — arrives mid-wave
        if (waveNum >= 25 && (waveNum - 25) % 2 === 0) {
            const megaCount = 1 + Math.floor((waveNum - 25) / 2);
            groups.push({
                type: 'megaboss',
                count: megaCount,
                interval: W.BOSS_INTERVAL,
                delay: runningDelay * 0.4,
            });
        }

        return groups;
    }

    update(dt) {
        // Track time between waves for early-send bonus
        if (this.betweenWaves) {
            this.betweenWaveTimer += dt;
            // Auto-start next wave after 5 seconds
            if (this.game.autoWave && this.betweenWaveTimer >= 5) {
                this.startNextWave();
            }
            return;
        }

        const mapMul = this.game.map.def.worldHpMultiplier || 1;
        const hpWave = this.currentWave + (this.game.map.def.startingWaveHP || 0);
        const hpScale = getWaveHPScale(hpWave) * mapMul * this.hpModifier;

        if (this.spawning) {
            let allDone = true;

            for (let g = 0; g < this.spawnGroups.length; g++) {
                const group = this.spawnGroups[g];
                if (this.groupIndices[g] >= group.count) continue;

                allDone = false;
                this.groupTimers[g] -= dt;

                if (this.groupTimers[g] <= 0) {
                    // Dual-spawn: wave 15 = build phase, 16-20 = wobblers, 21+ = % ramp
                    let useSecondary = false;
                    const effectiveWave = this.game.getEffectiveWave();
                    if (effectiveWave > DUAL_SPAWN_WAVE) {
                        const wavesIntoDual = effectiveWave - DUAL_SPAWN_WAVE;
                        if (wavesIntoDual <= 2) {
                            // Waves 16-17: max 1 wobbler on secondary
                            useSecondary = this.secondaryCount < 1 && Math.random() < 0.10;
                        } else if (wavesIntoDual <= 4) {
                            // Waves 18-19: max 2 wobblers on secondary
                            useSecondary = this.secondaryCount < 2 && Math.random() < 0.10;
                        } else if (wavesIntoDual <= 5) {
                            // Wave 20: max 3 wobblers on secondary
                            useSecondary = this.secondaryCount < 3 && Math.random() < 0.15;
                        } else {
                            // Wave 21+: percentage ramp from 2.5% to 20%
                            const chance = Math.min(DUAL_SPAWN_MAX_PCT, DUAL_SPAWN_START_PCT + (wavesIntoDual - 6) * DUAL_SPAWN_RAMP_PCT);
                            useSecondary = Math.random() < chance;
                        }
                        // No heavy enemies on secondary during wobbler waves 16-20
                        if (useSecondary && wavesIntoDual <= 5) {
                            const t = group.type;
                            if (t === 'tank' || t === 'boss' || t === 'megaboss') useSecondary = false;
                        }
                    }
                    if (useSecondary) this.secondaryCount++;
                    // Waves 16-20: send wobblers on secondary instead of normal enemies
                    const wavesIntoDualForType = effectiveWave - DUAL_SPAWN_WAVE;
                    const spawnType = (useSecondary && wavesIntoDualForType <= 5) ? 'wobbler' : group.type;
                    this.game.enemies.spawn(spawnType, hpScale, this.modifier, useSecondary);
                    this.spawnCounter++;
                    this.groupIndices[g]++;
                    this.groupTimers[g] = group.interval;
                }
            }

            if (allDone) {
                this.spawning = false;
            }
        }

        // Secondary reinforcement bursts: when secondary lane is cleared
        // but primary enemies remain, send reinforcements to keep pressure up
        if (!this.spawning && this.game.getEffectiveWave() >= 20) {
            const enemies = this.game.enemies.enemies;
            const hasPrimary = enemies.some(e => e.alive && !e.isSecondary && e.deathTimer < 0);
            const hasSecondary = enemies.some(e => e.alive && e.isSecondary && e.deathTimer < 0);

            if (hasPrimary && !hasSecondary) {
                this.reinforceTimer += dt;
                if (this.reinforceTimer >= 4) {
                    this.reinforceTimer = 0;
                    this.reinforceBursts++;
                    const types = ['grunt', 'runner', 'swarm'];
                    const burstCount = 3 + Math.floor(Math.random() * 3); // 3-5 enemies
                    for (let i = 0; i < burstCount; i++) {
                        const burstType = types[Math.floor(Math.random() * types.length)];
                        this.game.enemies.spawn(burstType, hpScale, this.modifier, true);
                    }
                }
            }
        }
    }

    getNextWavePreview() {
        const waveDef = this._nextWaveCache || this.getWaveDefinition(this.currentWave + 1);
        // Aggregate by type
        const counts = {};
        for (const g of waveDef) {
            counts[g.type] = (counts[g.type] || 0) + g.count;
        }
        return counts;
    }

    isWaveComplete() {
        return this.currentWave > 0 && !this.spawning && !this.waveComplete;
    }

    onWaveComplete() {
        this.waveComplete = true;
        this.betweenWaves = true;

        // Pre-generate next wave so preview is stable and matches actual spawn
        this._nextWaveCache = this.getWaveDefinition(this.currentWave + 1);

        this.game.debug.onWaveEnd(this.game);

        // Achievement: wave completion checks
        const debugReport = this.game.debug.getLastReport();
        const livesLost = debugReport ? (debugReport.livesLost || 0) : 0;
        this.game.achievements.check('waveComplete', {
            livesLost,
            wave: this.currentWave,
            heroActive: this.game.hero.active,
            heroDeaths: this.game.heroDeathsThisLevel || 0,
        });
        if (this.game.speed === SPEED_MAX) {
            this.game.achievements.increment('wavesAt3x');
        }

        // Rewards
        const bonus = WAVE_BONUS_BASE + this.currentWave * WAVE_BONUS_PER;
        this.game.economy.addGold(bonus);
        this.game.economy.addScore(this.currentWave * 50);

        // Interest
        const interest = Math.floor(this.game.economy.gold * INTEREST_RATE);
        this.game.economy.addGold(interest);
        this.game.achievements.increment('totalGoldEarned', bonus + interest);

        this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 3, `Wave ${this.currentWave} Complete! +${bonus + interest}g`, '#ffd700');

        // Save wave record as you progress
        Economy.setWaveRecord(this.game.selectedMapId, this.currentWave);

        this.game.ui.update();
    }

    reset() {
        this.currentWave = 0;
        this.spawning = false;
        this.waveComplete = false;
        this.betweenWaves = true;
        this.betweenWaveTimer = 0;
        this.modifier = null;
        this.modifierDef = null;
        this.hpModifier = 1.0;
        this.waveTag = null;
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
        this.spawnCounter = 0;
        this._nextWaveCache = null;
        this.reinforceTimer = 0;
        this.reinforceBursts = 0;
    }
}
