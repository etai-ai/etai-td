import { STARTING_GOLD, STARTING_LIVES } from './constants.js';

const RECORD_PREFIX = 'td_high_score';

export class Economy {
    constructor() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
        this.mapId = 'serpentine';
        this.record = 0;

        // One-time fresh start for level system (v2)
        if (!localStorage.getItem('td_v2_clean')) {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('td_')) localStorage.removeItem(key);
            }
            localStorage.setItem('td_v2_clean', '1');
        }
    }

    setMap(mapId) {
        this.mapId = mapId;
        this.record = Economy.getMapRecord(mapId);
    }

    static getMapRecord(mapId) {
        return parseInt(localStorage.getItem(`${RECORD_PREFIX}_${mapId}`)) || 0;
    }

    canAfford(cost) {
        return this.gold >= cost;
    }

    spendGold(amount) {
        this.gold -= amount;
    }

    addGold(amount) {
        this.gold += amount;
    }

    addScore(points) {
        this.score += points;
        if (this.score > this.record) {
            this.record = this.score;
            localStorage.setItem(`${RECORD_PREFIX}_${this.mapId}`, this.record);
        }
    }

    loseLives(count) {
        this.lives = Math.max(0, this.lives - count);
    }

    levelUpReset(bonus) {
        this.lives = STARTING_LIVES;
        this.addGold(bonus);
    }

    reset() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
    }

    static getWorldLevel(mapId) {
        return parseInt(localStorage.getItem(`td_world_level_${mapId}`)) || 0;
    }

    static setWorldLevel(mapId, level) {
        const current = Economy.getWorldLevel(mapId);
        if (level > current) {
            localStorage.setItem(`td_world_level_${mapId}`, level);
        }
    }
}
