import { TOWER_TYPES, getWaveHPScale } from './constants.js';

const STORAGE_KEY = 'td_wave_debug_log_v2';

export class WaveDebugger {
    constructor() {
        this.log = [];
        this._load();
        this._resetWave();
    }

    reset() {
        this._resetWave();
    }

    clearLog() {
        this.log = [];
        this._save();
    }

    _save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.log)); } catch {}
    }

    _load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const raw = data ? JSON.parse(data) : [];
            // Drop legacy records missing required fields
            this.log = raw.filter(r => r.timestamp && r.world);
        } catch { this.log = []; }
    }

    _resetWave() {
        this.waveNum = 0;
        this.worldHpMul = 1;
        this.waveHpScale = 0;
        this.finalHpMul = 0;
        this.startGold = 0;
        this.startLives = 0;
        this.startTowerCount = 0;
        this.enemiesSpawned = 0;
        this.enemiesByType = {};
        this.enemiesKilled = 0;
        this.enemiesLeaked = 0;
        this.totalDamageDealt = 0;
        this.totalHPSpawned = 0;
        this.goldSpent = 0;
        this.goldEarned = 0;
        this.towersBuilt = 0;
        this.towersSold = 0;
        this.towersUpgraded = 0;
    }

    onWaveStart(game) {
        this._resetWave();
        this.waveNum = game.waves.currentWave;
        this.worldHpMul = game.map.def ? game.map.def.worldHpMultiplier : 1;
        this.waveHpScale = getWaveHPScale(this.waveNum);
        this.finalHpMul = this.worldHpMul * this.waveHpScale;
        this.startGold = game.economy.gold;
        this.startLives = game.economy.lives;
        this.startTowerCount = game.towers.towers.length;
    }

    onEnemySpawn(enemy) {
        this.enemiesSpawned++;
        this.enemiesByType[enemy.type] = (this.enemiesByType[enemy.type] || 0) + 1;
        this.totalHPSpawned += enemy.maxHP;
    }

    onEnemyKilled(enemy) {
        this.enemiesKilled++;
    }

    onEnemyLeaked(enemy) {
        this.enemiesLeaked++;
    }

    onDamageDealt(amount) {
        this.totalDamageDealt += amount;
    }

    onTowerBuilt(cost) {
        this.towersBuilt++;
        this.goldSpent += cost;
    }

    onTowerSold(value) {
        this.towersSold++;
        this.goldEarned += value;
    }

    onTowerUpgraded(cost) {
        this.towersUpgraded++;
        this.goldSpent += cost;
    }

    onWaveEnd(game) {
        const duration = game.waveElapsed;
        const endGold = game.economy.gold;
        const endLives = game.economy.lives;
        const livesLost = this.startLives - endLives;
        const killRate = this.enemiesSpawned > 0 ? this.enemiesKilled / this.enemiesSpawned : 0;
        const overkill = this.totalHPSpawned > 0 ? this.totalDamageDealt / this.totalHPSpawned : 0;
        const dpsActual = duration > 0 ? this.totalDamageDealt / duration : 0;

        // Theoretical DPS: sum of tower damage / fireRate
        let dpsTheoretical = 0;
        for (const t of game.towers.towers) {
            const stats = TOWER_TYPES[t.type].levels[t.level];
            dpsTheoretical += stats.damage / stats.fireRate;
        }

        const efficiency = dpsTheoretical > 0 ? dpsActual / dpsTheoretical : 0;

        // Difficulty label
        let difficulty;
        if (livesLost >= 5 || killRate < 0.6) {
            difficulty = 'BRUTAL';
        } else if (livesLost >= 2 || killRate < 0.8) {
            difficulty = 'HARD';
        } else if (livesLost >= 1 || overkill < 1.0) {
            difficulty = 'FAIR';
        } else if (overkill < 1.5) {
            difficulty = 'EASY';
        } else {
            difficulty = 'TRIVIAL';
        }

        const report = {
            timestamp: new Date().toISOString(),
            world: game.selectedMapId || '—',
            wave: this.waveNum,
            worldHpMul: this.worldHpMul,
            waveHpScale: this.waveHpScale,
            finalHpMul: this.finalHpMul,
            duration,
            spawned: this.enemiesSpawned,
            killed: this.enemiesKilled,
            leaked: this.enemiesLeaked,
            livesLost,
            totalHP: this.totalHPSpawned,
            dmgDealt: this.totalDamageDealt,
            overkill,
            killRate,
            dpsActual,
            dpsTheory: dpsTheoretical,
            efficiency,
            towers: game.towers.towers.length,
            goldStart: this.startGold,
            goldEnd: endGold,
            goldSpent: this.goldSpent,
            goldEarned: this.goldEarned,
            difficulty,
        };

        this.log.push(report);
        this._save();
    }

    getLastReport() {
        return this.log.length > 0 ? this.log[this.log.length - 1] : null;
    }

    downloadCSV() {
        if (this.log.length === 0) return;
        const cols = [
            'timestamp','world','wave',
            'worldHpMul','waveHpScale','finalHpMul',
            'duration','spawned','killed','leaked','livesLost',
            'totalHP','dmgDealt','overkill','killRate',
            'dpsActual','dpsTheory','efficiency',
            'towers','goldStart','goldEnd','goldSpent','goldEarned',
            'difficulty',
        ];
        const fmt = (v) => v == null ? '' : typeof v === 'number' ? +v.toFixed(2) : v;
        const rows = this.log.map(r => cols.map(c => fmt(r[c])).join(','));
        const csv = cols.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wave_debug_log.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
