import { STARTING_GOLD, STARTING_LIVES } from './constants.js';

const RECORD_PREFIX = 'td_high_score';

export class Economy {
    constructor() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
        this.mapId = 'serpentine';
        this.record = 0;

        // One-time migration: old single key → serpentine-specific key
        const oldRecord = localStorage.getItem(RECORD_PREFIX);
        if (oldRecord !== null) {
            const existing = localStorage.getItem(`${RECORD_PREFIX}_serpentine`);
            if (!existing || parseInt(oldRecord) > parseInt(existing)) {
                localStorage.setItem(`${RECORD_PREFIX}_serpentine`, oldRecord);
            }
            localStorage.removeItem(RECORD_PREFIX);
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

    reset() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
    }
}
