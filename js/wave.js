import { WAVES, WAVE_BONUS_BASE, WAVE_BONUS_PER, INTEREST_RATE, CANVAS_W, CANVAS_H, getWaveHPScale, WAVE_MODIFIERS, MODIFIER_START_WAVE, MODIFIER_CHANCE, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, DUAL_SPAWN_WAVE, GOLDRUSH_INTERVAL } from './constants.js';
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

        // Spawn state
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
        this.spawnCounter = 0;

        // Cached next wave (so preview matches actual spawn)
        this._nextWaveCache = null;
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
        this.spawning = true;
        this.waveComplete = false;
        this.betweenWaves = false;
        this.betweenWaveTimer = 0;
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

        // Rebuild tower panel (handles unlockWave/maxWave visibility each wave)
        this.game.ui.setupTowerPanel();

        // Trigger wave threshold unlocks (auto-upgrade, unlock screen, hero, dual spawn)
        this.game.onWaveThreshold(this.currentWave);

        this.game.debug.onWaveStart(this.game);
        this.game.audio.playWaveStart();
    }

    getWaveDefinition(waveNum) {
        // Intro waves 1-5 from hand-crafted definitions
        if (waveNum <= WAVES.length) {
            return WAVES[waveNum - 1].map(g => ({ ...g }));
        }
        // Wave 6+: procedural generation
        return this.generateWave(waveNum);
    }

    generateWave(waveNum) {
        const types = ['grunt', 'runner', 'tank', 'healer', 'swarm'];
        // Speed-aware interval multipliers — spread fast movers, tighten slow ones
        const intervalMulti = { grunt: 1.0, runner: 1.3, tank: 0.8, healer: 1.0, boss: 0.8, swarm: 1.3 };

        const groups = [];
        const groupCount = 2 + Math.floor(waveNum / 5);
        let runningDelay = 0;
        let lastType = null;

        for (let i = 0; i < groupCount; i++) {
            // Pick type, avoiding adjacent repeats
            let available = types.filter(t => t !== lastType);
            const type = available[Math.floor(Math.random() * available.length)];
            lastType = type;

            const count = Math.floor((4 + waveNum * 0.6 + Math.random() * 4) * 0.95);
            const baseInterval = Math.max(0.30, 0.8 - waveNum * 0.01);
            const interval = baseInterval * (intervalMulti[type] || 1.0);

            groups.push({
                type,
                count,
                interval,
                delay: runningDelay,
            });

            // Next group starts halfway through this one + small gap (partial overlap)
            const gap = 1 + Math.random() * 1.5;
            runningDelay += count * interval * 0.5 + gap;
        }

        // Boss every 5 waves — arrives after all groups finish
        if (waveNum % 5 === 0) {
            const bossCount = Math.floor(waveNum / 10) + 1;
            groups.push({
                type: 'boss',
                count: bossCount,
                interval: 4.0,
                delay: runningDelay + 1,
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

        if (!this.spawning) return;

        const mapMul = this.game.map.def.worldHpMultiplier || 1;
        const hpScale = getWaveHPScale(this.currentWave) * mapMul * this.hpModifier;
        let allDone = true;

        for (let g = 0; g < this.spawnGroups.length; g++) {
            const group = this.spawnGroups[g];
            if (this.groupIndices[g] >= group.count) continue;

            allDone = false;
            this.groupTimers[g] -= dt;

            if (this.groupTimers[g] <= 0) {
                const useSecondary = (this.game.getEffectiveWave() >= DUAL_SPAWN_WAVE) && (this.spawnCounter % 2 === 1);
                this.game.enemies.spawn(group.type, hpScale, this.modifier, useSecondary);
                this.spawnCounter++;
                this.groupIndices[g]++;
                this.groupTimers[g] = group.interval;
            }
        }

        if (allDone) {
            this.spawning = false;
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
        if (this.game.speed === 3) {
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
    }
}
