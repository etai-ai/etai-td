// ── Canvas & Grid ──────────────────────────────────────────
export const COLS = 30;
export const ROWS = 20;
export const CELL = 48;
export const CANVAS_W = COLS * CELL; // 1440
export const CANVAS_H = ROWS * CELL; // 960

// ── Game States ────────────────────────────────────────────
export const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY',
    LEVEL_UP: 'LEVEL_UP',
};

// ── Cell Types ─────────────────────────────────────────────
export const CELL_TYPE = {
    BUILDABLE: 0,
    PATH: 1,
    BLOCKED: 2,
};

// ── Map Definitions ─────────────────────────────────────────
export const MAP_DEFS = {
    serpentine: {
        name: 'Serpentine Valley',
        themeColor: '#27ae60',
        worldHpMultiplier: 1.0,
        description: 'A long winding path gives you plenty of time to build defenses.',
        layouts: [
            // Layout 0: Original winding path
            {
                waypoints: [
                    { x: 0, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 6 }, { x: 2, y: 6 },
                    { x: 2, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 4 }, { x: 15, y: 4 },
                    { x: 15, y: 14 }, { x: 6, y: 14 }, { x: 6, y: 18 }, { x: 20, y: 18 },
                    { x: 20, y: 12 }, { x: 25, y: 12 }, { x: 25, y: 6 }, { x: 29, y: 6 },
                ],
                blocked: [
                    { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 12, y: 1 }, { x: 13, y: 1 },
                    { x: 22, y: 3 }, { x: 23, y: 3 }, { x: 0, y: 8 }, { x: 1, y: 8 },
                    { x: 18, y: 8 }, { x: 19, y: 8 }, { x: 27, y: 10 }, { x: 28, y: 10 },
                    { x: 12, y: 16 }, { x: 13, y: 16 }, { x: 24, y: 16 }, { x: 25, y: 16 },
                    { x: 3, y: 19 }, { x: 4, y: 19 }, { x: 16, y: 0 }, { x: 27, y: 2 },
                    { x: 0, y: 15 }, { x: 14, y: 12 },
                ],
                paths: null,
            },
            // Layout 1: Mirrored serpentine starting bottom-left, going up
            {
                waypoints: [
                    { x: 0, y: 17 }, { x: 7, y: 17 }, { x: 7, y: 13 }, { x: 2, y: 13 },
                    { x: 2, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 15 }, { x: 15, y: 15 },
                    { x: 15, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 1 }, { x: 20, y: 1 },
                    { x: 20, y: 7 }, { x: 25, y: 7 }, { x: 25, y: 13 }, { x: 29, y: 13 },
                ],
                blocked: [
                    { x: 4, y: 19 }, { x: 5, y: 19 }, { x: 12, y: 18 }, { x: 13, y: 18 },
                    { x: 22, y: 16 }, { x: 23, y: 16 }, { x: 0, y: 11 }, { x: 1, y: 11 },
                    { x: 18, y: 11 }, { x: 19, y: 11 }, { x: 27, y: 9 }, { x: 28, y: 9 },
                    { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 24, y: 3 }, { x: 25, y: 3 },
                    { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 16, y: 19 }, { x: 27, y: 17 },
                    { x: 0, y: 4 }, { x: 14, y: 7 },
                ],
                paths: null,
            },
            // Layout 2: Wider S-curve with fewer but longer segments
            {
                waypoints: [
                    { x: 0, y: 3 }, { x: 12, y: 3 }, { x: 12, y: 10 }, { x: 3, y: 10 },
                    { x: 3, y: 16 }, { x: 18, y: 16 }, { x: 18, y: 8 }, { x: 27, y: 8 },
                    { x: 27, y: 16 }, { x: 29, y: 16 },
                ],
                blocked: [
                    { x: 6, y: 0 }, { x: 7, y: 0 }, { x: 15, y: 1 }, { x: 16, y: 1 },
                    { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 22, y: 5 }, { x: 23, y: 5 },
                    { x: 8, y: 13 }, { x: 9, y: 13 }, { x: 14, y: 13 }, { x: 15, y: 13 },
                    { x: 22, y: 12 }, { x: 23, y: 12 }, { x: 0, y: 18 }, { x: 1, y: 18 },
                    { x: 10, y: 19 }, { x: 11, y: 19 }, { x: 25, y: 1 }, { x: 26, y: 1 },
                ],
                paths: null,
            },
        ],
    },
    splitcreek: {
        name: 'Split Creek',
        themeColor: '#d4a026',
        worldHpMultiplier: 0.60,
        requiredLevel: 5,
        environment: 'desert',
        description: 'The path forks midway — enemies randomly pick a branch.',
        layouts: [
            // Layout 0: Original horizontal fork
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 6, y: 10 },
                ],
                paths: {
                    upper: [{ x: 6, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 3 }, { x: 22, y: 3 }, { x: 22, y: 8 }],
                    lower: [{ x: 6, y: 15 }, { x: 14, y: 15 }, { x: 14, y: 17 }, { x: 22, y: 17 }, { x: 22, y: 12 }],
                    suffix: [{ x: 22, y: 10 }, { x: 26, y: 10 }, { x: 29, y: 10 }],
                },
                blocked: [
                    { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 10, y: 1 }, { x: 11, y: 1 },
                    { x: 18, y: 0 }, { x: 19, y: 0 }, { x: 26, y: 1 }, { x: 27, y: 1 },
                    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 15 }, { x: 2, y: 15 },
                    { x: 10, y: 9 }, { x: 11, y: 9 }, { x: 10, y: 11 }, { x: 11, y: 11 },
                    { x: 17, y: 9 }, { x: 18, y: 9 }, { x: 17, y: 11 }, { x: 18, y: 11 },
                    { x: 26, y: 6 }, { x: 27, y: 6 }, { x: 26, y: 14 }, { x: 27, y: 14 },
                    { x: 4, y: 19 }, { x: 5, y: 19 }, { x: 24, y: 19 }, { x: 25, y: 19 },
                ],
            },
            // Layout 1: Vertical fork — splits up/down then converges on right
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 4, y: 10 },
                ],
                paths: {
                    upper: [{ x: 4, y: 4 }, { x: 12, y: 4 }, { x: 12, y: 2 }, { x: 20, y: 2 }, { x: 20, y: 7 }],
                    lower: [{ x: 4, y: 16 }, { x: 12, y: 16 }, { x: 12, y: 18 }, { x: 20, y: 18 }, { x: 20, y: 13 }],
                    suffix: [{ x: 20, y: 10 }, { x: 25, y: 10 }, { x: 29, y: 10 }],
                },
                blocked: [
                    { x: 8, y: 0 }, { x: 9, y: 0 }, { x: 16, y: 1 }, { x: 17, y: 1 },
                    { x: 24, y: 0 }, { x: 25, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 2 },
                    { x: 1, y: 18 }, { x: 2, y: 18 }, { x: 8, y: 10 }, { x: 9, y: 10 },
                    { x: 15, y: 9 }, { x: 16, y: 9 }, { x: 15, y: 11 }, { x: 16, y: 11 },
                    { x: 24, y: 5 }, { x: 25, y: 5 }, { x: 24, y: 15 }, { x: 25, y: 15 },
                    { x: 8, y: 19 }, { x: 9, y: 19 }, { x: 16, y: 19 }, { x: 17, y: 19 },
                ],
            },
            // Layout 2: Wide fork with different angles and merge point
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 5, y: 10 },
                ],
                paths: {
                    upper: [{ x: 5, y: 3 }, { x: 10, y: 3 }, { x: 10, y: 6 }, { x: 18, y: 6 }, { x: 18, y: 9 }],
                    lower: [{ x: 5, y: 16 }, { x: 10, y: 16 }, { x: 10, y: 13 }, { x: 18, y: 13 }, { x: 18, y: 11 }],
                    suffix: [{ x: 18, y: 10 }, { x: 24, y: 10 }, { x: 24, y: 5 }, { x: 29, y: 5 }],
                },
                blocked: [
                    { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 8, y: 0 }, { x: 9, y: 0 },
                    { x: 14, y: 1 }, { x: 15, y: 1 }, { x: 22, y: 2 }, { x: 23, y: 2 },
                    { x: 2, y: 18 }, { x: 3, y: 18 }, { x: 14, y: 18 }, { x: 15, y: 18 },
                    { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 8, y: 11 }, { x: 9, y: 11 },
                    { x: 13, y: 9 }, { x: 14, y: 9 }, { x: 13, y: 11 }, { x: 14, y: 11 },
                    { x: 27, y: 8 }, { x: 28, y: 8 }, { x: 22, y: 15 }, { x: 23, y: 15 },
                ],
            },
        ],
    },
    gauntlet: {
        name: 'The Gauntlet',
        themeColor: '#c0392b',
        worldHpMultiplier: 0.65,
        requiredLevel: 10,
        environment: 'lava',
        description: 'A short direct path — enemies arrive fast, every tower counts.',
        layouts: [
            // Layout 0: Original zigzag
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 5, y: 10 }, { x: 5, y: 5 }, { x: 12, y: 5 },
                    { x: 12, y: 14 }, { x: 20, y: 14 }, { x: 20, y: 8 }, { x: 29, y: 8 },
                ],
                blocked: [
                    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 8, y: 1 }, { x: 9, y: 1 },
                    { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 24, y: 3 }, { x: 25, y: 3 },
                    { x: 2, y: 17 }, { x: 3, y: 17 }, { x: 8, y: 18 }, { x: 9, y: 18 },
                    { x: 15, y: 17 }, { x: 16, y: 17 }, { x: 24, y: 17 }, { x: 25, y: 17 },
                    { x: 0, y: 0 }, { x: 28, y: 0 }, { x: 0, y: 19 }, { x: 28, y: 19 },
                ],
                paths: null,
            },
            // Layout 1: Different zigzag pattern — enters top, exits bottom-right
            {
                waypoints: [
                    { x: 0, y: 4 }, { x: 8, y: 4 }, { x: 8, y: 12 }, { x: 16, y: 12 },
                    { x: 16, y: 4 }, { x: 24, y: 4 }, { x: 24, y: 15 }, { x: 29, y: 15 },
                ],
                blocked: [
                    { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 12, y: 1 }, { x: 13, y: 1 },
                    { x: 20, y: 1 }, { x: 21, y: 1 }, { x: 27, y: 1 }, { x: 28, y: 1 },
                    { x: 3, y: 18 }, { x: 4, y: 18 }, { x: 12, y: 18 }, { x: 13, y: 18 },
                    { x: 20, y: 18 }, { x: 21, y: 18 }, { x: 27, y: 18 }, { x: 28, y: 18 },
                    { x: 0, y: 0 }, { x: 0, y: 19 },
                ],
                paths: null,
            },
            // Layout 2: L-shaped path with tight turns
            {
                waypoints: [
                    { x: 0, y: 3 }, { x: 6, y: 3 }, { x: 6, y: 10 }, { x: 14, y: 10 },
                    { x: 14, y: 3 }, { x: 22, y: 3 }, { x: 22, y: 16 }, { x: 29, y: 16 },
                ],
                blocked: [
                    { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 10, y: 1 }, { x: 11, y: 1 },
                    { x: 18, y: 0 }, { x: 19, y: 0 }, { x: 26, y: 1 }, { x: 27, y: 1 },
                    { x: 3, y: 18 }, { x: 4, y: 18 }, { x: 10, y: 18 }, { x: 11, y: 18 },
                    { x: 18, y: 18 }, { x: 19, y: 18 }, { x: 26, y: 18 }, { x: 27, y: 18 },
                    { x: 0, y: 0 }, { x: 0, y: 19 },
                ],
                paths: null,
            },
        ],
    },
};

// ── Economy ────────────────────────────────────────────────
export const STARTING_GOLD = 300;
export const STARTING_LIVES = 20;
export const SELL_REFUND = 0.6;       // 60% back
export const INTEREST_RATE = 0.02;    // 2% between waves
export const WAVE_BONUS_BASE = 25;
export const WAVE_BONUS_PER = 8;

// ── Tower Definitions ──────────────────────────────────────
export const TOWER_TYPES = {
    arrow: {
        name: 'Arrow',
        cost: 50,
        color: '#4a7c3f',
        levels: [
            { damage: 12, range: 3.5, fireRate: 0.4, projSpeed: 300 },
            { damage: 18, range: 4.0, fireRate: 0.33, projSpeed: 340, upgradeCost: 35 },
            { damage: 28, range: 4.5, fireRate: 0.25, projSpeed: 380, upgradeCost: 70 },
        ],
    },
    firearrow: {
        name: 'Fire Arrow',
        cost: 200,
        color: '#c0392b',
        burn: true,
        unlockLevel: 2,
        levels: [
            { damage: 20, range: 3.5, fireRate: 0.30, projSpeed: 320, burnDamage: 3, burnDuration: 3.0 },
            { damage: 31, range: 4.0, fireRate: 0.25, projSpeed: 360, burnDamage: 5, burnDuration: 3.5, upgradeCost: 120 },
            { damage: 45, range: 4.5, fireRate: 0.20, projSpeed: 400, burnDamage: 8, burnDuration: 4.0, upgradeCost: 200 },
        ],
    },
    frost: {
        name: 'Frost',
        cost: 75,
        color: '#5b9bd5',
        slow: true,
        levels: [
            { damage: 5, range: 3.0, fireRate: 0.8, projSpeed: 250, slowFactor: 0.5, slowDuration: 2.0 },
            { damage: 8, range: 3.5, fireRate: 0.7, projSpeed: 270, slowFactor: 0.4, slowDuration: 2.5, upgradeCost: 55 },
            { damage: 12, range: 4.0, fireRate: 0.6, projSpeed: 290, slowFactor: 0.3, slowDuration: 3.0, upgradeCost: 100 },
        ],
    },
    lightning: {
        name: 'Lightning',
        cost: 125,
        color: '#9b59b6',
        chain: true,
        levels: [
            { damage: 15, range: 3.5, fireRate: 1.0, projSpeed: 500, chainCount: 3, chainRange: 2.0, chainDecay: 0.7 },
            { damage: 22, range: 4.0, fireRate: 0.85, projSpeed: 550, chainCount: 4, chainRange: 2.5, chainDecay: 0.7, upgradeCost: 80 },
            { damage: 32, range: 4.5, fireRate: 0.7, projSpeed: 600, chainCount: 5, chainRange: 3.0, chainDecay: 0.75, upgradeCost: 145 },
        ],
    },
    cannon: {
        name: 'Cannon',
        cost: 100,
        color: '#8b5e3c',
        splash: true,
        unlockWave: 2,
        levels: [
            { damage: 30, range: 3.0, fireRate: 1.2, projSpeed: 200, splashRadius: 1.2 },
            { damage: 50, range: 3.5, fireRate: 1.0, projSpeed: 220, splashRadius: 1.5, upgradeCost: 65 },
            { damage: 80, range: 4.0, fireRate: 0.85, projSpeed: 240, splashRadius: 1.8, upgradeCost: 125 },
        ],
    },
    sniper: {
        name: 'Sniper',
        cost: 150,
        color: '#c0392b',
        crit: true,
        unlockWave: 5,
        levels: [
            { damage: 60, range: 6.0, fireRate: 2.0, projSpeed: 600, critChance: 0.10, critMulti: 2.5 },
            { damage: 90, range: 7.0, fireRate: 1.7, projSpeed: 650, critChance: 0.15, critMulti: 2.8, upgradeCost: 110 },
            { damage: 140, range: 8.0, fireRate: 1.5, projSpeed: 700, critChance: 0.20, critMulti: 3.0, upgradeCost: 180 },
        ],
    },
};

// ── Enemy Definitions ──────────────────────────────────────
export const ENEMY_TYPES = {
    grunt: {
        name: 'Grunt',
        baseHP: 30,
        speed: 70,     // px per second (+15%)
        reward: 6,
        livesCost: 1,
        color: '#e74c3c',
        radius: 8,
        armor: 0,
    },
    runner: {
        name: 'Runner',
        baseHP: 15,
        speed: 125,    // (+15%)
        reward: 5,
        livesCost: 1,
        color: '#f39c12',
        radius: 6,
        armor: 0,
    },
    tank: {
        name: 'Tank',
        baseHP: 100,
        speed: 40,     // (+15%)
        reward: 17,
        livesCost: 2,
        color: '#2c3e50',
        radius: 12,
        armor: 0.27,
    },
    healer: {
        name: 'Healer',
        baseHP: 50,
        speed: 65,     // (+15%)
        reward: 11,
        livesCost: 1,
        color: '#2ecc71',
        radius: 8,
        armor: 0,
        healRadius: 1.5,  // grid cells
        healRate: 3,       // HP per second to nearby allies
    },
    boss: {
        name: 'Boss',
        baseHP: 400,
        speed: 26,     // (+15%)
        reward: 53,
        livesCost: 5,
        color: '#8e44ad',
        radius: 16,
        armor: 0.20,
    },
    swarm: {
        name: 'Swarm',
        baseHP: 8,
        speed: 105,    // (+15%)
        reward: 3,
        livesCost: 1,
        color: '#e67e22',
        radius: 5,
        armor: 0,
    },
};

// ── Wave Definitions ───────────────────────────────────────
// { type, count, interval (seconds between spawns), delay (seconds before group) }
export const WAVES = [
    // Wave 1-5: Introduction — teach mechanics, ramp up faster
    [{ type: 'grunt', count: 8, interval: 0.85, delay: 0 }],
    [{ type: 'grunt', count: 8, interval: 0.75, delay: 0 }, { type: 'runner', count: 3, interval: 0.4, delay: 1.5 }],
    [{ type: 'runner', count: 6, interval: 0.35, delay: 0 }, { type: 'grunt', count: 6, interval: 0.6, delay: 1.5 }],
    [{ type: 'runner', count: 14, interval: 0.25, delay: 0 }, { type: 'tank', count: 2, interval: 1.7, delay: 1.5 }],
    [{ type: 'grunt', count: 8, interval: 0.6, delay: 0 }, { type: 'tank', count: 3, interval: 1.3, delay: 0.5 }, { type: 'healer', count: 1, interval: 0, delay: 2.5 }],
    // Wave 6-10: Variety — all enemy types in play
    [{ type: 'swarm', count: 20, interval: 0.17, delay: 0 }, { type: 'tank', count: 2, interval: 1.3, delay: 1.5 }],
    [{ type: 'tank', count: 5, interval: 1.0, delay: 0 }, { type: 'healer', count: 2, interval: 1.7, delay: 0.5 }, { type: 'grunt', count: 6, interval: 0.4, delay: 1.5 }],
    [{ type: 'runner', count: 15, interval: 0.25, delay: 0 }, { type: 'healer', count: 3, interval: 1.3, delay: 1.5 }],
    [{ type: 'grunt', count: 10, interval: 0.4, delay: 0 }, { type: 'tank', count: 4, interval: 1.0, delay: 0.5 }, { type: 'healer', count: 2, interval: 1.7, delay: 1.5 }, { type: 'runner', count: 6, interval: 0.35, delay: 2.5 }],
    [{ type: 'boss', count: 1, interval: 0, delay: 0 }, { type: 'tank', count: 2, interval: 1.3, delay: 1.5 }, { type: 'grunt', count: 8, interval: 0.5, delay: 2.5 }],
    // Wave 11-15: Escalation — composition complexity rises
    [{ type: 'swarm', count: 25, interval: 0.15, delay: 0 }, { type: 'tank', count: 3, interval: 0.85, delay: 1.5 }],
    [{ type: 'tank', count: 6, interval: 0.85, delay: 0 }, { type: 'healer', count: 3, interval: 1.3, delay: 0.5 }, { type: 'runner', count: 8, interval: 0.3, delay: 1.5 }],
    [{ type: 'runner', count: 12, interval: 0.25, delay: 0 }, { type: 'tank', count: 4, interval: 1.0, delay: 1.5 }, { type: 'healer', count: 2, interval: 1.7, delay: 2.5 }],
    [{ type: 'grunt', count: 10, interval: 0.4, delay: 0 }, { type: 'runner', count: 8, interval: 0.25, delay: 1.5 }, { type: 'healer', count: 3, interval: 1.3, delay: 2.5 }, { type: 'tank', count: 2, interval: 1.3, delay: 3 }],
    [{ type: 'boss', count: 2, interval: 7.0, delay: 0 }, { type: 'tank', count: 3, interval: 1.3, delay: 1.5 }, { type: 'healer', count: 2, interval: 1.7, delay: 2.5 }],
    // Wave 16-20: Endgame — tighter waves, bosses more frequent
    [{ type: 'swarm', count: 30, interval: 0.13, delay: 0 }, { type: 'tank', count: 4, interval: 0.7, delay: 0.5 }, { type: 'healer', count: 2, interval: 1.3, delay: 1.5 }],
    [{ type: 'tank', count: 6, interval: 0.7, delay: 0 }, { type: 'healer', count: 4, interval: 1.0, delay: 0.5 }, { type: 'boss', count: 1, interval: 0, delay: 2.5 }],
    [{ type: 'runner', count: 12, interval: 0.2, delay: 0 }, { type: 'boss', count: 1, interval: 0, delay: 1.5 }, { type: 'tank', count: 3, interval: 0.85, delay: 2.5 }],
    [{ type: 'grunt', count: 8, interval: 0.35, delay: 0 }, { type: 'tank', count: 4, interval: 0.7, delay: 0.5 }, { type: 'healer', count: 2, interval: 1.3, delay: 1.5 }, { type: 'boss', count: 1, interval: 0, delay: 2.5 }],
    [{ type: 'boss', count: 2, interval: 4.0, delay: 0 }, { type: 'tank', count: 3, interval: 0.85, delay: 1.5 }, { type: 'healer', count: 2, interval: 1.3, delay: 2.5 }, { type: 'swarm', count: 15, interval: 0.15, delay: 3 }],
];

export const TOTAL_WAVES = 20;
export const LEVEL_HP_MULTIPLIER = 1.1;

// ── Targeting Modes ────────────────────────────────────────
export const TARGET_MODES = ['First', 'Closest', 'Strongest', 'Weakest'];

// ── Particle Pool ──────────────────────────────────────────
export const MAX_PARTICLES = 500;

// ── HP Scaling ─────────────────────────────────────────────
export function getWaveHPScale(wave) {
    // Wave 1≈1.10, Wave 10≈25.9, Wave 20≈134
    return wave * Math.pow(1.10, wave);
}

// ── Wave Modifiers ────────────────────────────────────────
export const WAVE_MODIFIERS = {
    armored: { name: 'Armored', desc: '+20% armor', color: '#95a5a6', armorBonus: 0.20 },
    swift:   { name: 'Swift',   desc: '+30% speed', color: '#e67e22', speedMulti: 1.30 },
    regen:   { name: 'Regen',   desc: 'HP regen',   color: '#2ecc71', regenPercent: 0.005 },
    horde:   { name: 'Horde',   desc: 'More enemies, less HP', color: '#e74c3c', countMulti: 1.4, hpMulti: 0.75 },
};
export const MODIFIER_START_WAVE = 3;
export const MODIFIER_CHANCE = 0.35;

// ── Early-Send Bonus ──────────────────────────────────────
export const EARLY_SEND_MAX_BONUS = 50;
export const EARLY_SEND_DECAY = 5; // gold lost per second of waiting
