import { TOWER_TYPES } from './constants.js';

const STORAGE_KEY = 'td_achievements';

const ACHIEVEMENTS = [
    // ── Progression (7) ───────────────────────────────────
    { id: 'survive_20', name: 'Getting Started', description: 'Survive to wave 20', category: 'Progression', tier: 'bronze', icon: '\u2694\uFE0F', stat: 'highestWave', threshold: 20 },
    { id: 'survive_50', name: 'Rising Star', description: 'Survive to wave 50', category: 'Progression', tier: 'silver', icon: '\u2B50', stat: 'highestWave', threshold: 50 },
    { id: 'survive_100', name: 'Veteran Commander', description: 'Survive to wave 100', category: 'Progression', tier: 'gold', icon: '\uD83C\uDFC6', stat: 'highestWave', threshold: 100 },
    { id: 'survive_200', name: 'Legendary', description: 'Survive to wave 200', category: 'Progression', tier: 'gold', icon: '\uD83D\uDC51', stat: 'highestWave', threshold: 200 },
    { id: 'play_serpentine', name: 'Forest Walker', description: 'Reach wave 20 on Serpentine Valley', category: 'Progression', tier: 'bronze', icon: '\uD83C\uDF32', stat: 'serpentine_best', threshold: 20 },
    { id: 'play_splitcreek', name: 'Desert Tactician', description: 'Reach wave 20 on Split Creek', category: 'Progression', tier: 'silver', icon: '\uD83C\uDFDC\uFE0F', stat: 'splitcreek_best', threshold: 20 },
    { id: 'play_gauntlet', name: 'Gauntlet Runner', description: 'Reach wave 20 on The Gauntlet', category: 'Progression', tier: 'gold', icon: '\uD83C\uDF0B', stat: 'gauntlet_best', threshold: 20 },

    // ── Combat (7) ────────────────────────────────────────
    { id: 'kills_100', name: 'Pest Control', description: 'Kill 100 enemies', category: 'Combat', tier: 'bronze', icon: '\uD83D\uDDE1\uFE0F', stat: 'totalKills', threshold: 100 },
    { id: 'kills_1000', name: 'Exterminator', description: 'Kill 1,000 enemies', category: 'Combat', tier: 'silver', icon: '\u2620\uFE0F', stat: 'totalKills', threshold: 1000 },
    { id: 'kills_5000', name: 'Annihilator', description: 'Kill 5,000 enemies', category: 'Combat', tier: 'gold', icon: '\uD83D\uDCA5', stat: 'totalKills', threshold: 5000 },
    { id: 'boss_kills_10', name: 'Boss Slayer', description: 'Kill 10 bosses', category: 'Combat', tier: 'bronze', icon: '\uD83D\uDC79', stat: 'bossKills', threshold: 10 },
    { id: 'boss_kills_50', name: 'Boss Hunter', description: 'Kill 50 bosses', category: 'Combat', tier: 'silver', icon: '\uD83E\uDE93', stat: 'bossKills', threshold: 50 },
    { id: 'swarm_kills_500', name: 'Swarm Wiper', description: 'Kill 500 swarm enemies', category: 'Combat', tier: 'silver', icon: '\uD83D\uDC1C', stat: 'swarmKills', threshold: 500 },
    { id: 'tank_kills_100', name: 'Armor Piercer', description: 'Kill 100 tanks', category: 'Combat', tier: 'silver', icon: '\uD83D\uDEE1\uFE0F', stat: 'tankKills', threshold: 100 },

    // ── Economy (5) ───────────────────────────────────────
    { id: 'gold_earned_10k', name: 'Coin Collector', description: 'Earn 10,000 gold total', category: 'Economy', tier: 'bronze', icon: '\uD83E\uDE99', stat: 'totalGoldEarned', threshold: 10000 },
    { id: 'gold_earned_100k', name: 'Golden Hoard', description: 'Earn 100,000 gold total', category: 'Economy', tier: 'silver', icon: '\uD83D\uDCB0', stat: 'totalGoldEarned', threshold: 100000 },
    { id: 'gold_spent_50k', name: 'Big Spender', description: 'Spend 50,000 gold total', category: 'Economy', tier: 'silver', icon: '\uD83D\uDCB8', stat: 'totalGoldSpent', threshold: 50000 },
    { id: 'towers_sold_25', name: 'Liquidator', description: 'Sell 25 towers', category: 'Economy', tier: 'bronze', icon: '\uD83D\uDED2', stat: 'towersSold', threshold: 25 },
    { id: 'score_10k', name: 'High Scorer', description: 'Reach a score of 10,000', category: 'Economy', tier: 'silver', icon: '\uD83C\uDFAF', stat: 'highestScore', threshold: 10000 },

    // ── Tower (5) ─────────────────────────────────────────
    { id: 'towers_built_50', name: 'Builder', description: 'Build 50 towers', category: 'Tower', tier: 'bronze', icon: '\uD83D\uDD28', stat: 'towersBuilt', threshold: 50 },
    { id: 'towers_built_200', name: 'Architect', description: 'Build 200 towers', category: 'Tower', tier: 'silver', icon: '\uD83C\uDFD7\uFE0F', stat: 'towersBuilt', threshold: 200 },
    { id: 'towers_maxed_10', name: 'Perfectionist', description: 'Max out 10 towers', category: 'Tower', tier: 'silver', icon: '\uD83D\uDC8E', stat: 'towersMaxed', threshold: 10 },
    { id: 'use_all_towers', name: 'Full Arsenal', description: 'Place every tower type at least once', category: 'Tower', tier: 'gold', icon: '\uD83C\uDFAD', event: 'towerPlaced', condition: (stats) => {
        const allTypes = Object.keys(TOWER_TYPES);
        return allTypes.every(t => (stats[`tower_${t}_placed`] || 0) >= 1);
    }},
    { id: 'towers_upgraded_50', name: 'Investor', description: 'Upgrade towers 50 times', category: 'Tower', tier: 'bronze', icon: '\u2B06\uFE0F', stat: 'towersUpgraded', threshold: 50 },

    // ── Hero (4) ──────────────────────────────────────────
    { id: 'hero_kills_100', name: 'Hero of the Realm', description: 'Get 100 hero kills', category: 'Hero', tier: 'bronze', icon: '\uD83E\uDDB8', stat: 'heroKills', threshold: 100 },
    { id: 'hero_stuns_50', name: 'Crowd Controller', description: 'Use hero stun 50 times', category: 'Hero', tier: 'silver', icon: '\u26A1', stat: 'heroStuns', threshold: 50 },
    { id: 'hero_magnets_25', name: 'Gold Digger', description: 'Use gold magnet 25 times', category: 'Hero', tier: 'bronze', icon: '\uD83E\uDDF2', stat: 'heroMagnets', threshold: 25 },
    { id: 'hero_deathless', name: 'Immortal Hero', description: 'Survive 20+ waves with the hero and zero hero deaths', category: 'Hero', tier: 'gold', icon: '\uD83D\uDE07', event: 'waveComplete', condition: (_s, ctx) => ctx.heroActive && ctx.heroDeaths === 0 && ctx.wave >= 40 },

    // ── Challenge (2) + Hidden (1) ────────────────────────
    { id: 'perfect_wave', name: 'Flawless', description: 'Complete a wave with zero lives lost', category: 'Challenge', tier: 'bronze', icon: '\uD83D\uDCAF', event: 'waveComplete', condition: (_s, ctx) => ctx.livesLost === 0 },
    { id: 'speed_demon', name: 'Speed Demon', description: 'Complete 10 waves at 3x speed', category: 'Challenge', tier: 'silver', icon: '\u23E9', stat: 'wavesAt3x', threshold: 10 },
    { id: 'secret_admin', name: 'Behind the Curtain', description: 'Open the admin panel', category: 'Hidden', tier: 'bronze', icon: '\uD83D\uDD0D', hidden: true, event: 'adminToggle', condition: (_s, ctx) => ctx.on },
];

export class Achievements {
    constructor() {
        this.stats = {};
        this.unlocked = {};
        this._toastQueue = [];
        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this.stats = data.stats || {};
                this.unlocked = data.unlocked || {};
            }
        } catch (e) {
            // Corrupted data — start fresh
            this.stats = {};
            this.unlocked = {};
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                stats: this.stats,
                unlocked: this.unlocked,
            }));
        } catch (e) {
            // Storage full or unavailable — silently ignore
        }
    }

    increment(stat, amount = 1) {
        this.stats[stat] = (this.stats[stat] || 0) + amount;
        this._checkStatAchievements(stat);
        this.save();
    }

    set(stat, value) {
        if (value > (this.stats[stat] || 0)) {
            this.stats[stat] = value;
            this._checkStatAchievements(stat);
            this.save();
        }
    }

    check(event, context) {
        for (const ach of ACHIEVEMENTS) {
            if (this.unlocked[ach.id]) continue;
            if (ach.event !== event) continue;
            if (ach.condition && ach.condition(this.stats, context)) {
                this._unlock(ach);
            }
        }
        this.save();
    }

    _checkStatAchievements(stat) {
        for (const ach of ACHIEVEMENTS) {
            if (this.unlocked[ach.id]) continue;
            if (ach.stat !== stat) continue;
            if ((this.stats[stat] || 0) >= ach.threshold) {
                this._unlock(ach);
            }
        }
    }

    _unlock(ach) {
        if (this.unlocked[ach.id]) return;
        this.unlocked[ach.id] = Date.now();
        this._toastQueue.push(ach);
    }

    popToast() {
        return this._toastQueue.shift() || null;
    }

    getAll() {
        return ACHIEVEMENTS;
    }

    getProgress(id) {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (!ach || !ach.stat) return null;
        return {
            current: this.stats[ach.stat] || 0,
            target: ach.threshold,
            pct: Math.min(1, (this.stats[ach.stat] || 0) / ach.threshold),
        };
    }

    isUnlocked(id) {
        return !!this.unlocked[id];
    }

    getUnlockedCount() {
        return Object.keys(this.unlocked).length;
    }

    getTotalCount() {
        return ACHIEVEMENTS.length;
    }
}
