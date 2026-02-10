import { WAVES, TOTAL_WAVES, WAVES_PER_LEVEL, LEVEL_HP_MULTIPLIER, WAVE_BONUS_BASE, WAVE_BONUS_PER, INTEREST_RATE, CANVAS_W, CANVAS_H, getHPScale } from './constants.js';

export class WaveManager {
    constructor(game) {
        this.game = game;
        this.currentWave = 0;
        this.spawning = false;
        this.waveComplete = false;
        this.betweenWaves = true;
        this.waveCountdown = 0;

        // Spawn state
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
    }

    startNextWave() {
        this.currentWave++;
        this.spawning = true;
        this.waveComplete = false;
        this.betweenWaves = false;

        const waveDef = this.getWaveDefinition(this.currentWave);
        this.spawnGroups = waveDef;
        this.groupTimers = waveDef.map(g => g.delay || 0);
        this.groupIndices = waveDef.map(() => 0);

        this.game.audio.playWaveStart();
    }

    getWaveDefinition(waveNum) {
        if (waveNum <= TOTAL_WAVES) {
            return WAVES[waveNum - 1].map(g => ({ ...g }));
        }
        // Procedural waves after 20
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
        if (!this.spawning) return;

        const mapMul = this.game.map.def.hpMultiplier || 1;
        const levelMultiplier = Math.pow(LEVEL_HP_MULTIPLIER, this.game.worldLevel - 1);
        const hpScale = getHPScale(this.currentWave) * mapMul * levelMultiplier;
        let allDone = true;

        for (let g = 0; g < this.spawnGroups.length; g++) {
            const group = this.spawnGroups[g];
            if (this.groupIndices[g] >= group.count) continue;

            allDone = false;
            this.groupTimers[g] -= dt;

            if (this.groupTimers[g] <= 0) {
                this.game.enemies.spawn(group.type, hpScale);
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

        // Rewards
        const bonus = WAVE_BONUS_BASE + this.currentWave * WAVE_BONUS_PER;
        this.game.economy.addGold(bonus);
        this.game.economy.addScore(this.currentWave * 50);

        // Interest
        const interest = Math.floor(this.game.economy.gold * INTEREST_RATE);
        this.game.economy.addGold(interest);

        this.game.particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H / 3, `Wave ${this.currentWave} Complete! +${bonus + interest}g`, '#ffd700');

        // Level up after completing all waves
        if (this.currentWave >= WAVES_PER_LEVEL) {
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
        this.spawnGroups = [];
        this.groupTimers = [];
        this.groupIndices = [];
    }
}
