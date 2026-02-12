import { STARTING_GOLD, STARTING_LIVES } from './constants.js';

const RECORD_KEY = 'td_high_score';

export class Economy {
    constructor() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
        this.record = Economy.getRecord();

        // One-time fresh start for balance retuning (v4)
        if (!localStorage.getItem('td_v4_clean')) {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('td_')) localStorage.removeItem(key);
            }
            localStorage.setItem('td_v4_clean', '1');
        }
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
            localStorage.setItem(RECORD_KEY, this.record);
        }
    }

    loseLives(count) {
        this.lives = Math.max(0, this.lives - count);
    }

    levelUpReset(level) {
        this.gold = 100 + level * 200;
        this.lives = STARTING_LIVES;
    }

    reset() {
        this.gold = STARTING_GOLD;
        this.lives = STARTING_LIVES;
        this.score = 0;
        this.record = Economy.getRecord();
    }

    static getRecord() {
        return parseInt(localStorage.getItem(RECORD_KEY)) || 0;
    }

    static clearRecord() {
        localStorage.removeItem(RECORD_KEY);
    }

    static clearPlayerLevel() {
        localStorage.removeItem('td_player_level');
    }

    static getPlayerLevel() {
        return parseInt(localStorage.getItem('td_player_level')) || 0;
    }

    static setPlayerLevel(level) {
        const current = Economy.getPlayerLevel();
        if (level > current) {
            localStorage.setItem('td_player_level', level);
        }
    }

    static setPlayerLevelDirect(level) {
        localStorage.setItem('td_player_level', level);
    }
}
