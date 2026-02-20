import { WAVES, WAVE_BONUS_BASE, WAVE_BONUS_PER, INTEREST_RATE, CANVAS_W, CANVAS_H, getWaveHPScale, WAVE_MODIFIERS, MODIFIER_START_WAVE, MODIFIER_CHANCE, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, DUAL_SPAWN_WAVE, DUAL_SPAWN_START_PCT, DUAL_SPAWN_RAMP_PCT, DUAL_SPAWN_MAX_PCT, FLYING_START_WAVE, GOLDRUSH_INTERVAL, SPEED_MAX, WAVE_GEN, STATE, VICTORY_WAVE } from './constants.js';
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
        this._pendingNetWaveDef = null;

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
        // Multiplayer client: request wave start from host (don't start locally)
        if (this.game.isMultiplayer && !this.game.net?.isHost) {
            this.game.net.sendWaveStart();
            return;
        }

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

        // Update music intensity for this wave
        if (this.game.music) {
            this.game.music.setIntensity(this.currentWave);
            this.game.music.setBetweenWaves(false);
            this.game.music.setGoldrush(this.waveTag === 'goldrush');
        }

        // Multiplayer: host sends wave definition to client
        if (this.game.isMultiplayer && this.game.net?.isHost) {
            this.game.net.sendWaveDef(this.spawnGroups, this.modifier, this.modifierDef, this.waveTag, this.hpModifier);
        }
    }

    /** Client applies wave definition received from host */
    applyWaveDef(data) {
        const { IDX_ENEMY_TYPE } = this.game._netTypes;
        this.currentWave++;
        this.game.ui.setupTowerPanel();
        this.game.onWaveThreshold(this.currentWave);

        if (this.game.state === STATE.PAUSED && this.game._unlockScreenActive) {
            this._pendingNetWaveDef = data;
            this._pendingWaveSetup = true;
            return;
        }
        this._applyWaveDefInner(data);
    }

    _applyWaveDefInner(data) {
        const { IDX_ENEMY_TYPE } = this.game._netTypes;
        this._pendingWaveSetup = false;
        this._pendingNetWaveDef = null;

        this.spawning = true;
        this.waveComplete = false;
        this.betweenWaves = false;
        this.betweenWaveTimer = 0;
        this.reinforceTimer = 0;
        this.reinforceBursts = 0;
        this.secondaryCount = 0;
        this.game.waveElapsed = 0;

        this.waveTag = data.tag;
        if (this.waveTag === 'goldrush') {
            this.game.particles.spawnBigFloatingText(CANVAS_W / 2, CANVAS_H / 3, 'GOLD RUSH!', '#ffd700');
        }

        this.modifier = data.mod;
        this.modifierDef = data.modDef;
        this.hpModifier = data.hpMod || 1.0;

        if (this.modifier && this.modifierDef) {
            this.game.particles.spawnBigFloatingText(
                CANVAS_W / 2, CANVAS_H / 2.5,
                `${this.modifierDef.name.toUpperCase()}! ${this.modifierDef.desc}`,
                this.modifierDef.color
            );
        }

        const waveDef = data.def.map(g => ({
            type: IDX_ENEMY_TYPE[g.type] || 'grunt',
            count: g.count,
            interval: g.interval,
            delay: g.delay || 0,
        }));

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
        // Dragon Flyers from wave 25+: 1 at wave 25, +1 every 3 waves, max 8
        if (waveNum >= 25) {
            const dragonCount = Math.min(8, 1 + Math.floor((waveNum - 25) / 3));
            def.push({ type: 'dragonflyer', count: dragonCount, interval: 1.2, delay: 0.5 });
        }
        return def;
    }

    generateWave(waveNum) {
        const W = WAVE_GEN;
        const types = ['grunt', 'runner', 'tank', 'healer', 'swarm'];

        // Add world-specific enemy to the pool if available
        const worldEnemy = this.game?.map?.def?.worldEnemy;
        const worldEnemyStart = this.game?.map?.def?.worldEnemyStartWave ?? Infinity;
        if (worldEnemy && waveNum >= worldEnemyStart) {
            types.push(worldEnemy);
        }

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

        // Mega boss every 2 waves starting at 25, replaced by quantum boss at 32
        if (waveNum >= 25 && waveNum < 32 && (waveNum - 25) % 2 === 0) {
            const megaSchedule = [1, 1, 2, 3];
            const megaIdx = Math.floor((waveNum - 25) / 2);
            const megaCount = megaIdx < megaSchedule.length ? megaSchedule[megaIdx] : 3;
            groups.push({
                type: 'megaboss',
                count: megaCount,
                interval: W.BOSS_INTERVAL,
                delay: runningDelay * 0.4,
            });
        }

        // Quantum boss every wave starting at 32 — escalates fast
        if (waveNum >= 32) {
            const wavesIn = waveNum - 31; // 1 at wave 32
            const quantumCount = Math.min(6, Math.floor(wavesIn * 0.8)); // 1,1,2,3,4,4,5,6 (capped)
            groups.push({
                type: 'quantumboss',
                count: Math.max(1, quantumCount),
                interval: W.BOSS_INTERVAL * 0.8,
                delay: runningDelay * 0.3,
            });
        }

        return groups;
    }

    update(dt) {
        // Track time between waves for early-send bonus
        if (this.betweenWaves) {
            this.betweenWaveTimer += dt;
            // Auto-start next wave after 5 seconds (host-only in multiplayer)
            if (this.game.autoWave && this.betweenWaveTimer >= 5 && (!this.game.isMultiplayer || this.game.net?.isHost)) {
                this.startNextWave();
            }
            return;
        }

        const mapMul = this.game.map.def.worldHpMultiplier || 1;
        const hpScale = getWaveHPScale(this.currentWave) * mapMul * this.hpModifier;

        // Multiplayer client: host owns spawning, client gets enemies via state sync
        const isNetClient = this.game.isMultiplayer && !this.game.net?.isHost;

        if (this.spawning) {
            let allDone = true;

            for (let g = 0; g < this.spawnGroups.length; g++) {
                const group = this.spawnGroups[g];
                if (this.groupIndices[g] >= group.count) continue;

                allDone = false;
                this.groupTimers[g] -= dt;

                if (this.groupTimers[g] <= 0) {
                    const mapDualWave = this.game.map?.def?.dualSpawnWave ?? DUAL_SPAWN_WAVE;
                    const isMultiPath = !!this.game.map?.multiPaths;

                    // Multi-path: round-robin pathIndex
                    let pathIndex = undefined;
                    if (isMultiPath) {
                        pathIndex = this.spawnCounter % this.game.map.multiPaths.length;
                    }

                    // Dual-spawn ramp from per-map dualSpawnWave
                    let useSecondary = false;
                    if (isFinite(mapDualWave) && !isMultiPath) {
                        if (this.currentWave > mapDualWave) {
                            const wavesIntoDual = this.currentWave - mapDualWave;
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
                    }
                    if (useSecondary) this.secondaryCount++;
                    // Early dual spawn waves: send wobblers on secondary instead of normal enemies
                    const wavesIntoDualForType = this.currentWave - mapDualWave;
                    const spawnType = (useSecondary && wavesIntoDualForType <= 5) ? 'wobbler' : group.type;
                    // Client skips actual spawn — enemies arrive via state sync
                    if (!isNetClient) {
                        this.game.enemies.spawn(spawnType, hpScale, this.modifier, useSecondary, pathIndex);
                    }
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
        // (host-only in multiplayer — client gets enemies via state sync)
        const mapDualWaveReinf = this.game.map?.def?.dualSpawnWave ?? DUAL_SPAWN_WAVE;
        if (!isNetClient && !this.spawning && isFinite(mapDualWaveReinf) && this.currentWave >= mapDualWaveReinf + 5) {
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
        if (!this.betweenWaves) return this._lastPreview || null;
        const waveDef = this._nextWaveCache || this.getWaveDefinition(this.currentWave + 1);
        // Aggregate by type
        const counts = {};
        for (const g of waveDef) {
            counts[g.type] = (counts[g.type] || 0) + g.count;
        }
        this._lastPreview = counts;
        return counts;
    }

    isWaveComplete() {
        return this.currentWave > 0 && !this.spawning && !this.waveComplete;
    }

    onWaveComplete() {
        this.waveComplete = true;
        this.betweenWaves = true;

        // Ease music between waves
        if (this.game.music) {
            this.game.music.setBetweenWaves(true);
            this.game.music.setGoldrush(false);
        }

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
        this.game.economy.addScore(this.currentWave * 50);
        if (this.game.isMultiplayer) {
            const halfBonus = Math.floor(bonus / 2);
            this.game.economy.addGold(halfBonus);
            this.game.economy.partnerGold += halfBonus;
            // Interest on own gold pools
            const myInterest = Math.floor(this.game.economy.gold * INTEREST_RATE);
            const partnerInterest = Math.floor(this.game.economy.partnerGold * INTEREST_RATE);
            this.game.economy.addGold(myInterest);
            this.game.economy.partnerGold += partnerInterest;
            this.game.achievements.increment('totalGoldEarned', halfBonus + myInterest);
            this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 3, `Wave ${this.currentWave} Complete! +${halfBonus + myInterest}g`, '#ffd700');
        } else {
            this.game.economy.addGold(bonus);
            const interest = Math.floor(this.game.economy.gold * INTEREST_RATE);
            this.game.economy.addGold(interest);
            this.game.achievements.increment('totalGoldEarned', bonus + interest);
            this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 3, `Wave ${this.currentWave} Complete! +${bonus + interest}g`, '#ffd700');
        }

        // Personal best check — before saving so we can compare
        const previousRecord = Economy.getWaveRecord(this.game.selectedMapId) || 0;

        // Save wave record as you progress
        Economy.setWaveRecord(this.game.selectedMapId, this.currentWave);

        // New record notification
        if (this.currentWave > previousRecord && previousRecord > 0) {
            this.game.particles.spawnBigFloatingText(CANVAS_W / 2, CANVAS_H / 4, `NEW RECORD! Wave ${this.currentWave}`, '#ffd700');
            this.game.audio.playExplosion();
            if (this.game.postfx.enabled) {
                this.game.postfx.flash(0.15, 0.25);
                this.game.postfx.shockwave(0.5, 0.5, 0.6);
            }
        }

        // Victory screen at wave 35
        if (this.currentWave === VICTORY_WAVE && !this.game._victoryShown) {
            this.game.showVictory();
            return;
        }

        // Wave milestone banner every 10 waves
        if (this.currentWave % 10 === 0) {
            this.game.showMilestone(this.currentWave);
        }

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
        this._lastPreview = null;
        this._pendingNetWaveDef = null;
        this.reinforceTimer = 0;
        this.reinforceBursts = 0;
    }
}
