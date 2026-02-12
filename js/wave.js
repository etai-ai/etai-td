import { WAVES, TOTAL_WAVES, LEVEL_HP_MULTIPLIER, WAVE_BONUS_BASE, WAVE_BONUS_PER, INTEREST_RATE, CANVAS_W, CANVAS_H, getWaveHPScale, WAVE_MODIFIERS, MODIFIER_START_WAVE, MODIFIER_CHANCE, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, LEVEL_WAVES, getTotalWaves, getWaveTag } from './constants.js';

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

        // Special wave tag (goldrush, midboss)
        this.waveTag = null;

        // Spawn state
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
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

        // Set special wave tag
        this.waveTag = getWaveTag(this.game.worldLevel, this.currentWave);
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
        }

        const waveDef = this.getWaveDefinition(this.currentWave);

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
        // Check level-specific wave overrides first
        const override = LEVEL_WAVES[this.game.worldLevel];
        if (override && waveNum <= override.waves.length) {
            return override.waves[waveNum - 1].map(g => ({ ...g }));
        }
        if (waveNum <= TOTAL_WAVES) {
            return WAVES[waveNum - 1].map(g => ({ ...g }));
        }
        // Procedural waves after defined waves
        return this.generateWave(waveNum);
    }

    generateWave(waveNum) {
        const types = ['grunt', 'runner', 'tank', 'healer', 'swarm'];
        const groups = [];
        const groupCount = 2 + Math.floor(waveNum / 5);
        for (let i = 0; i < groupCount; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const count = Math.floor(5 + waveNum * 0.8 + Math.random() * 5);
            groups.push({
                type,
                count,
                interval: Math.max(0.15, 0.8 - waveNum * 0.01),
                delay: i * 3,
            });
        }
        // Boss every 5 waves
        if (waveNum % 5 === 0) {
            groups.push({
                type: 'boss',
                count: Math.floor(waveNum / 10) + 1,
                interval: 4.0,
                delay: 2,
            });
        }
        return groups;
    }

    update(dt) {
        // Track time between waves for early-send bonus
        if (this.betweenWaves) {
            this.betweenWaveTimer += dt;
            return;
        }

        if (!this.spawning) return;

        const mapMul = this.game.map.def.worldHpMultiplier || 1;
        const levelMultiplier = Math.pow(LEVEL_HP_MULTIPLIER, this.game.worldLevel - 1);
        const hpScale = getWaveHPScale(this.currentWave) * mapMul * levelMultiplier * this.hpModifier;
        let allDone = true;

        for (let g = 0; g < this.spawnGroups.length; g++) {
            const group = this.spawnGroups[g];
            if (this.groupIndices[g] >= group.count) continue;

            allDone = false;
            this.groupTimers[g] -= dt;

            if (this.groupTimers[g] <= 0) {
                this.game.enemies.spawn(group.type, hpScale, this.modifier);
                this.groupIndices[g]++;
                this.groupTimers[g] = group.interval;
            }
        }

        if (allDone) {
            this.spawning = false;
        }
    }

    isWaveComplete() {
        return this.currentWave > 0 && !this.spawning && !this.waveComplete;
    }

    onWaveComplete() {
        this.waveComplete = true;
        this.betweenWaves = true;

        this.game.debug.onWaveEnd(this.game);

        // Rewards
        const bonus = WAVE_BONUS_BASE + this.currentWave * WAVE_BONUS_PER;
        this.game.economy.addGold(bonus);
        this.game.economy.addScore(this.currentWave * 50);

        // Interest
        const interest = Math.floor(this.game.economy.gold * INTEREST_RATE);
        this.game.economy.addGold(interest);

        this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 3, `Wave ${this.currentWave} Complete! +${bonus + interest}g`, '#ffd700');

        // Level up after completing all waves
        if (this.currentWave >= getTotalWaves(this.game.worldLevel)) {
            this.game.levelUp();
            return;
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
    }
}
