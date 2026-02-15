// ── Version ───────────────────────────────────────────────
export const VERSION = '2.0.0';

// ── Canvas & Grid ──────────────────────────────────────────
export const COLS = 30;
export const ROWS = 20;
export const CELL = 56;
export const CANVAS_W = COLS * CELL; // 1680
export const CANVAS_H = ROWS * CELL; // 1120

// ── Game States ────────────────────────────────────────────
export const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
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
        requiredRecord: 0,
        startingUnlocks: 0,
        description: 'A long winding path gives you plenty of time to build defenses.',
        layouts: [
            // Layout 0: Stacked horizontal U-turns (kill zones: y=2,4 left, y=13,15 right)
            {
                waypoints: [
                    { x: 0, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 3 }, { x: 2, y: 3 },
                    { x: 2, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 8 }, { x: 8, y: 8 },
                    { x: 8, y: 12 }, { x: 27, y: 12 }, { x: 27, y: 14 }, { x: 14, y: 14 },
                    { x: 14, y: 16 }, { x: 27, y: 16 }, { x: 27, y: 18 }, { x: 29, y: 18 },
                ],
                blocked: [
                    { x: 18, y: 0 }, { x: 19, y: 0 }, { x: 24, y: 1 }, { x: 25, y: 1 },
                    { x: 20, y: 6 }, { x: 21, y: 6 }, { x: 6, y: 0 }, { x: 7, y: 0 },
                    { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 4, y: 11 }, { x: 5, y: 11 },
                    { x: 0, y: 17 }, { x: 1, y: 17 }, { x: 10, y: 10 }, { x: 11, y: 10 },
                    { x: 4, y: 19 }, { x: 5, y: 19 }, { x: 20, y: 19 }, { x: 21, y: 19 },
                    { x: 18, y: 10 }, { x: 19, y: 10 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:3},{x:24,y:3},{x:24,y:9},{x:29,y:9},{x:29,y:18}
                ],
            },
            // Layout 1: Vertical bars + horizontal switchbacks (kill zones: x=4,6 vertical, y=7,9 horizontal)
            {
                waypoints: [
                    { x: 0, y: 18 }, { x: 3, y: 18 }, { x: 3, y: 3 }, { x: 5, y: 3 },
                    { x: 5, y: 18 }, { x: 7, y: 18 }, { x: 7, y: 3 }, { x: 10, y: 3 },
                    { x: 10, y: 6 }, { x: 27, y: 6 }, { x: 27, y: 8 }, { x: 14, y: 8 },
                    { x: 14, y: 10 }, { x: 27, y: 10 }, { x: 27, y: 13 }, { x: 29, y: 13 },
                ],
                blocked: [
                    { x: 16, y: 0 }, { x: 17, y: 0 }, { x: 22, y: 1 }, { x: 23, y: 1 },
                    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 8 }, { x: 1, y: 8 },
                    { x: 0, y: 14 }, { x: 1, y: 14 }, { x: 20, y: 4 }, { x: 21, y: 4 },
                    { x: 16, y: 16 }, { x: 17, y: 16 }, { x: 22, y: 17 }, { x: 23, y: 17 },
                    { x: 18, y: 19 }, { x: 19, y: 19 }, { x: 11, y: 12 }, { x: 12, y: 12 },
                    { x: 11, y: 16 }, { x: 12, y: 16 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:1},{x:25,y:1},{x:25,y:10},{x:29,y:10},{x:29,y:13}
                ],
            },
            // Layout 2: Center spiral with dual clusters (kill zones: y=5,7 left, y=13,15 right)
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 4, y: 10 }, { x: 4, y: 4 }, { x: 16, y: 4 },
                    { x: 16, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 8 }, { x: 16, y: 8 },
                    { x: 16, y: 12 }, { x: 27, y: 12 }, { x: 27, y: 14 }, { x: 16, y: 14 },
                    { x: 16, y: 16 }, { x: 27, y: 16 }, { x: 27, y: 18 }, { x: 29, y: 18 },
                ],
                blocked: [
                    { x: 8, y: 0 }, { x: 9, y: 0 }, { x: 20, y: 0 }, { x: 21, y: 0 },
                    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 24, y: 2 }, { x: 25, y: 2 },
                    { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 0, y: 14 }, { x: 1, y: 14 },
                    { x: 4, y: 19 }, { x: 5, y: 19 }, { x: 12, y: 19 }, { x: 13, y: 19 },
                    { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 20, y: 9 }, { x: 21, y: 9 },
                    { x: 10, y: 16 }, { x: 11, y: 16 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:4},{x:22,y:4},{x:22,y:9},{x:29,y:9},{x:29,y:18}
                ],
            },
            // Layout 3: Bottom-entry S-curve (kill zones: y=16,14 bottom-left, y=6,4 top-right)
            {
                waypoints: [
                    { x: 0, y: 17 }, { x: 14, y: 17 }, { x: 14, y: 15 }, { x: 2, y: 15 },
                    { x: 2, y: 13 }, { x: 12, y: 13 }, { x: 12, y: 9 }, { x: 8, y: 9 },
                    { x: 8, y: 7 }, { x: 27, y: 7 }, { x: 27, y: 5 }, { x: 16, y: 5 },
                    { x: 16, y: 3 }, { x: 27, y: 3 }, { x: 27, y: 1 }, { x: 29, y: 1 },
                ],
                blocked: [
                    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 4, y: 2 }, { x: 5, y: 2 },
                    { x: 18, y: 0 }, { x: 19, y: 0 }, { x: 0, y: 7 }, { x: 1, y: 7 },
                    { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 0, y: 19 }, { x: 1, y: 19 },
                    { x: 18, y: 11 }, { x: 19, y: 11 }, { x: 18, y: 18 }, { x: 19, y: 18 },
                    { x: 6, y: 19 }, { x: 7, y: 19 }, { x: 24, y: 13 }, { x: 25, y: 13 },
                    { x: 24, y: 9 }, { x: 25, y: 9 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:17},{x:22,y:17},{x:22,y:10},{x:29,y:10},{x:29,y:1}
                ],
            },
            // Layout 4: Wide switchbacks with massive bottom zones (kill zones: y=3,5 top, y=13,15,17 bottom)
            {
                waypoints: [
                    { x: 0, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 2 }, { x: 20, y: 2 },
                    { x: 20, y: 4 }, { x: 8, y: 4 }, { x: 8, y: 6 }, { x: 20, y: 6 },
                    { x: 20, y: 12 }, { x: 8, y: 12 }, { x: 8, y: 14 }, { x: 22, y: 14 },
                    { x: 22, y: 16 }, { x: 8, y: 16 }, { x: 8, y: 18 }, { x: 29, y: 18 },
                ],
                blocked: [
                    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 12, y: 0 }, { x: 13, y: 0 },
                    { x: 26, y: 0 }, { x: 27, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 3 },
                    { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 9 }, { x: 3, y: 9 },
                    { x: 0, y: 19 }, { x: 1, y: 19 }, { x: 4, y: 19 }, { x: 5, y: 19 },
                    { x: 14, y: 19 }, { x: 15, y: 19 }, { x: 26, y: 10 }, { x: 27, y: 10 },
                    { x: 26, y: 19 }, { x: 27, y: 19 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:2},{x:25,y:2},{x:25,y:9},{x:29,y:9},{x:29,y:18}
                ],
            },
        ],
    },
    splitcreek: {
        name: 'Split Creek',
        themeColor: '#d4a026',
        worldHpMultiplier: 1.0,
        requiredRecord: 30,
        startingUnlocks: 30,
        startingWaveHP: 5,
        startingGold: 1000,
        flyingStartWave: 7,
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
                secondaryWaypoints: [
                    {x:29,y:3},{x:24,y:3},{x:24,y:7},{x:29,y:7},{x:29,y:10}
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
                secondaryWaypoints: [
                    {x:29,y:2},{x:24,y:2},{x:24,y:7},{x:28,y:7},{x:28,y:10},{x:29,y:10}
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
                secondaryWaypoints: [
                    {x:29,y:15},{x:24,y:15},{x:24,y:10},{x:28,y:10},{x:28,y:5},{x:29,y:5}
                ],
            },
            // Layout 3: Symmetric diamond fork
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 5, y: 10 },
                ],
                paths: {
                    upper: [{ x: 5, y: 4 }, { x: 12, y: 4 }, { x: 12, y: 7 }, { x: 20, y: 7 }, { x: 20, y: 9 }],
                    lower: [{ x: 5, y: 16 }, { x: 12, y: 16 }, { x: 12, y: 13 }, { x: 20, y: 13 }, { x: 20, y: 11 }],
                    suffix: [{ x: 20, y: 10 }, { x: 25, y: 10 }, { x: 29, y: 10 }],
                },
                blocked: [
                    { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 8, y: 0 }, { x: 9, y: 0 },
                    { x: 15, y: 1 }, { x: 16, y: 1 }, { x: 24, y: 2 }, { x: 25, y: 2 },
                    { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 8, y: 10 }, { x: 9, y: 10 },
                    { x: 15, y: 10 }, { x: 16, y: 10 }, { x: 24, y: 6 }, { x: 25, y: 6 },
                    { x: 24, y: 14 }, { x: 25, y: 14 }, { x: 2, y: 18 }, { x: 3, y: 18 },
                    { x: 8, y: 19 }, { x: 9, y: 19 }, { x: 15, y: 18 }, { x: 16, y: 18 },
                ],
                secondaryWaypoints: [
                    {x:29,y:17},{x:24,y:17},{x:24,y:13},{x:28,y:13},{x:28,y:10},{x:29,y:10}
                ],
            },
            // Layout 4: Angled fork with L-shaped suffix
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 6, y: 10 },
                ],
                paths: {
                    upper: [{ x: 6, y: 4 }, { x: 10, y: 4 }, { x: 10, y: 7 }, { x: 18, y: 7 }, { x: 18, y: 9 }],
                    lower: [{ x: 6, y: 16 }, { x: 10, y: 16 }, { x: 10, y: 13 }, { x: 18, y: 13 }, { x: 18, y: 11 }],
                    suffix: [{ x: 18, y: 10 }, { x: 23, y: 10 }, { x: 23, y: 5 }, { x: 29, y: 5 }],
                },
                blocked: [
                    { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 8, y: 1 }, { x: 9, y: 1 },
                    { x: 14, y: 1 }, { x: 15, y: 1 }, { x: 21, y: 2 }, { x: 22, y: 2 },
                    { x: 26, y: 2 }, { x: 27, y: 2 }, { x: 3, y: 18 }, { x: 4, y: 18 },
                    { x: 8, y: 19 }, { x: 9, y: 19 }, { x: 14, y: 18 }, { x: 15, y: 18 },
                    { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 },
                    { x: 21, y: 8 }, { x: 22, y: 8 }, { x: 26, y: 8 }, { x: 27, y: 8 },
                ],
                secondaryWaypoints: [
                    {x:29,y:15},{x:24,y:15},{x:24,y:10},{x:28,y:10},{x:28,y:5},{x:29,y:5}
                ],
            },
        ],
    },
    gauntlet: {
        name: 'The Gauntlet',
        themeColor: '#c0392b',
        worldHpMultiplier: 1.0,
        requiredRecord: 40,
        startingUnlocks: 50,
        startingWaveHP: 10,
        startingGold: 1000,
        flyingStartWave: 2,
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
                secondaryWaypoints: [
                    {x:29,y:17},{x:22,y:17},{x:22,y:11},{x:27,y:11},{x:27,y:3},{x:29,y:3},{x:29,y:8}
                ],
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
                secondaryWaypoints: [
                    {x:29,y:2},{x:22,y:2},{x:22,y:10},{x:27,y:10},{x:27,y:15},{x:29,y:15}
                ],
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
                secondaryWaypoints: [
                    {x:29,y:3},{x:25,y:3},{x:25,y:10},{x:28,y:10},{x:28,y:16},{x:29,y:16}
                ],
            },
            // Layout 3: N-shape — enters bottom-left, winds up and back down
            {
                waypoints: [
                    { x: 0, y: 15 }, { x: 7, y: 15 }, { x: 7, y: 4 }, { x: 20, y: 4 },
                    { x: 20, y: 16 }, { x: 29, y: 16 },
                ],
                blocked: [
                    { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 12, y: 1 }, { x: 13, y: 1 },
                    { x: 24, y: 1 }, { x: 25, y: 1 }, { x: 3, y: 8 }, { x: 4, y: 8 },
                    { x: 12, y: 8 }, { x: 13, y: 8 }, { x: 15, y: 10 }, { x: 16, y: 10 },
                    { x: 24, y: 8 }, { x: 25, y: 8 }, { x: 3, y: 18 }, { x: 4, y: 18 },
                    { x: 12, y: 18 }, { x: 13, y: 18 }, { x: 15, y: 18 }, { x: 16, y: 18 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:3},{x:24,y:3},{x:24,y:10},{x:27,y:10},{x:27,y:16},{x:29,y:16}
                ],
            },
            // Layout 4: W-shape steps with tight turns
            {
                waypoints: [
                    { x: 0, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 10 }, { x: 14, y: 10 },
                    { x: 14, y: 3 }, { x: 22, y: 3 }, { x: 22, y: 14 }, { x: 29, y: 14 },
                ],
                blocked: [
                    { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 10, y: 1 }, { x: 11, y: 1 },
                    { x: 18, y: 0 }, { x: 19, y: 0 }, { x: 26, y: 1 }, { x: 27, y: 1 },
                    { x: 3, y: 14 }, { x: 4, y: 14 }, { x: 10, y: 14 }, { x: 11, y: 14 },
                    { x: 18, y: 14 }, { x: 19, y: 14 }, { x: 3, y: 18 }, { x: 4, y: 18 },
                    { x: 10, y: 18 }, { x: 11, y: 18 }, { x: 18, y: 18 }, { x: 19, y: 18 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:2},{x:25,y:2},{x:25,y:9},{x:28,y:9},{x:28,y:14},{x:29,y:14}
                ],
            },
        ],
    },
};

// ── Economy ────────────────────────────────────────────────
export const STARTING_LIVES = 20;
export const STARTING_GOLD = 300;
export const KILL_GOLD_BONUS = 1.10;  // 10% bonus on all kill gold
export const SELL_REFUND = 0.6;       // 60% back
export const INTEREST_RATE = 0.01;    // 1% between waves
export const WAVE_BONUS_BASE = 25;
export const WAVE_BONUS_PER = 6;

// ── Tower Definitions ──────────────────────────────────────
export const TOWER_TYPES = {
    arrow: {
        name: 'Arrow',
        cost: 50,
        color: '#4a7c3f',
        maxWave: 9,
        levels: [
            { damage: 13, range: 3.5, fireRate: 0.4, projSpeed: 300 },
            { damage: 19, range: 4.0, fireRate: 0.33, projSpeed: 340, upgradeCost: 35 },
            { damage: 29, range: 4.5, fireRate: 0.25, projSpeed: 380, upgradeCost: 70 },
        ],
    },
    firearrow: {
        name: 'Fire Arrow',
        cost: 200,
        color: '#c0392b',
        burn: true,
        unlockWave: 10,
        levels: [
            { damage: 18, range: 3.5, fireRate: 0.30, projSpeed: 320, burnDamage: 3, burnDuration: 3.0 },
            { damage: 28, range: 4.0, fireRate: 0.25, projSpeed: 360, burnDamage: 6, burnDuration: 3.5, upgradeCost: 120 },
            { damage: 40, range: 4.5, fireRate: 0.20, projSpeed: 400, burnDamage: 9, burnDuration: 4.0, upgradeCost: 200 },
        ],
    },
    frost: {
        name: 'Frost',
        cost: 75,
        color: '#5b9bd5',
        slow: true,
        maxWave: 9,
        levels: [
            { damage: 5, range: 3.0, fireRate: 0.8, projSpeed: 250, slowFactor: 0.575, slowDuration: 2.0 },
            { damage: 8, range: 3.5, fireRate: 0.7, projSpeed: 270, slowFactor: 0.49, slowDuration: 2.5, upgradeCost: 55 },
            { damage: 13, range: 4.0, fireRate: 0.6, projSpeed: 290, slowFactor: 0.405, slowDuration: 3.0, upgradeCost: 100 },
        ],
    },
    deepfrost: {
        name: 'Deep Frost',
        cost: 150,
        color: '#1a6b8a',
        aura: true,
        unlockWave: 10,
        levels: [
            { damage: 15, range: 3.0, fireRate: 1.2, slowFactor: 0.66, slowDuration: 1.5, freezeChance: 0.10, freezeDuration: 0.8 },
            { damage: 24, range: 3.5, fireRate: 0.85, slowFactor: 0.575, slowDuration: 2.0, freezeChance: 0.15, freezeDuration: 1.0, upgradeCost: 100 },
            { damage: 33, range: 4.0, fireRate: 0.7, slowFactor: 0.49, slowDuration: 2.5, freezeChance: 0.20, freezeDuration: 1.2, upgradeCost: 175 },
        ],
    },
    lightning: {
        name: 'Lightning',
        cost: 125,
        color: '#9b59b6',
        chain: true,
        maxWave: 24,
        levels: [
            { damage: 15, range: 3.5, fireRate: 1.0, projSpeed: 500, chainCount: 3, chainRange: 2.0, chainDecay: 0.7 },
            { damage: 22, range: 4.0, fireRate: 0.85, projSpeed: 550, chainCount: 4, chainRange: 2.5, chainDecay: 0.7, upgradeCost: 80 },
            { damage: 32, range: 4.5, fireRate: 0.7, projSpeed: 600, chainCount: 5, chainRange: 3.0, chainDecay: 0.75, upgradeCost: 145 },
        ],
    },
    superlightning: {
        name: 'Super Lightning',
        cost: 250,
        color: '#7b3fff',
        forkChain: true,
        unlockWave: 25,
        levels: [
            { damage: 20, range: 4.0, fireRate: 1.1, projSpeed: 600, forkCount: 4, forkDepth: 2, chainRange: 2.5, overcharge: 0.10, shockChance: 0.15, shockDuration: 0.3 },
            { damage: 31, range: 4.5, fireRate: 0.9, projSpeed: 650, forkCount: 6, forkDepth: 2, chainRange: 3.0, overcharge: 0.10, shockChance: 0.20, shockDuration: 0.3, upgradeCost: 150 },
            { damage: 46, range: 5.0, fireRate: 0.75, projSpeed: 700, forkCount: 8, forkDepth: 3, chainRange: 3.5, overcharge: 0.12, shockChance: 0.25, shockDuration: 0.4, upgradeCost: 250 },
        ],
    },
    cannon: {
        name: 'Cannon',
        cost: 100,
        color: '#8b5e3c',
        splash: true,
        maxWave: 24,
        unlockWave: 2,
        levels: [
            { damage: 30, range: 3.0, fireRate: 1.2, projSpeed: 200, splashRadius: 1.2 },
            { damage: 50, range: 3.5, fireRate: 1.0, projSpeed: 220, splashRadius: 1.5, upgradeCost: 65 },
            { damage: 80, range: 4.0, fireRate: 0.85, projSpeed: 240, splashRadius: 1.8, upgradeCost: 125 },
        ],
    },
    bicannon: {
        name: 'Bi-Cannon',
        cost: 200,
        color: '#6b4226',
        splash: true,
        dualBarrel: true,
        unlockWave: 25,
        levels: [
            { damage: 38, range: 3.5, fireRate: 0.6, projSpeed: 220, splashRadius: 1.4, heavyEvery: 4, armorShred: 0.10, shredDuration: 3.0, scorchDPS: 6, scorchDuration: 2.0 },
            { damage: 60, range: 4.0, fireRate: 0.5, projSpeed: 240, splashRadius: 1.7, heavyEvery: 4, armorShred: 0.12, shredDuration: 3.5, scorchDPS: 9, scorchDuration: 2.5, upgradeCost: 120 },
            { damage: 93, range: 4.5, fireRate: 0.4, projSpeed: 260, splashRadius: 2.0, heavyEvery: 3, armorShred: 0.15, shredDuration: 4.0, scorchDPS: 14, scorchDuration: 3.0, upgradeCost: 200 },
        ],
    },
    sniper: {
        name: 'Sniper',
        cost: 150,
        color: '#c0392b',
        crit: true,
        maxWave: 19,
        unlockWave: 5,
        levels: [
            { damage: 60, range: 6.0, fireRate: 2.0, projSpeed: 600, critChance: 0.10, critMulti: 2.5 },
            { damage: 90, range: 7.0, fireRate: 1.7, projSpeed: 650, critChance: 0.15, critMulti: 2.8, upgradeCost: 110 },
            { damage: 140, range: 8.0, fireRate: 1.5, projSpeed: 700, critChance: 0.20, critMulti: 3.0, upgradeCost: 180 },
        ],
    },
    missilesniper: {
        name: 'Missile Sniper',
        cost: 325,
        color: '#6b8e23',
        splash: true,
        crit: true,
        missile: true,
        unlockWave: 20,
        levels: [
            { damage: 88, range: 7.0, fireRate: 2.5, projSpeed: 300, splashRadius: 1.2, critChance: 0.12, critMulti: 2.5 },
            { damage: 132, range: 8.0, fireRate: 2.2, projSpeed: 320, splashRadius: 1.5, critChance: 0.16, critMulti: 2.8, upgradeCost: 200 },
            { damage: 198, range: 9.0, fireRate: 1.8, projSpeed: 350, splashRadius: 1.8, critChance: 0.20, critMulti: 3.2, upgradeCost: 300 },
        ],
    },
    pulsecannon: {
        name: 'Pulse Cannon',
        cost: 600,
        color: '#2eaaaa',
        splash: true,
        knockback: true,
        unlockWave: 30,
        levels: [
            { damage: 20, range: 3.5, fireRate: 1.8, projSpeed: 200, splashRadius: 1.2, knockbackDist: 1.0 },
            { damage: 30, range: 4.0, fireRate: 1.5, projSpeed: 220, splashRadius: 1.5, knockbackDist: 1.5, upgradeCost: 150 },
            { damage: 45, range: 4.5, fireRate: 1.3, projSpeed: 240, splashRadius: 1.8, knockbackDist: 2.0, upgradeCost: 250 },
        ],
    },
};

// ── Wave Threshold Unlock Definitions ────────────────────
export const WAVE_UNLOCKS = {
    10: { towers: ['Fire Arrow', 'Deep Frost'], keys: ['firearrow', 'deepfrost'], replacesKeys: ['arrow', 'frost'], color: '#c0392b' },
    14: { hero: true, color: '#00e5ff' },
    15: { dualSpawn: true, color: '#e74c3c' },
    20: { towers: ['Missile Sniper'], keys: ['missilesniper'], replacesKeys: ['sniper'], color: '#6b8e23' },
    25: { towers: ['Super Lightning', 'Bi-Cannon'], keys: ['superlightning', 'bicannon'], replacesKeys: ['lightning', 'cannon'], color: '#7b3fff' },
    30: { towers: ['Pulse Cannon'], keys: ['pulsecannon'], replacesKeys: null, color: '#2eaaaa' },
};

// ── Hero Definitions ──────────────────────────────────────
export const HERO_STATS = {
    unlockWave: 14,       // hero appears at wave 14
    maxHP: 200,
    speed: 150,           // px/s
    radius: 14,
    color: '#00e5ff',     // cyan — distinct from all towers/enemies
    // Auto-attack
    damage: 15,  range: 3.5,  fireRate: 0.5,  projSpeed: 350,
    // Contact damage (DPS tick every 0.5s)
    contactTick: 0.5,  contactBase: 10,
    contactMultipliers: { grunt: 1, runner: 0.8, tank: 2, healer: 0.6, boss: 3, swarm: 0.5, wobbler: 0.3, megaboss: 4 },
    // Respawn
    respawnDelay: 5.0,
    // Q: AoE Stun
    stunRadius: 3.0,  stunDuration: 1.5,  stunCooldown: 15.0,
    // E: Gold Magnet
    magnetRadius: 4.0,  magnetDuration: 8.0,  magnetMultiplier: 2,  magnetCooldown: 20.0,
    // 1: Execute (instant-kill boss/megaboss)
    executeRange: 15.0,  executeCooldown: 120.0,
};

// ── Dual Spawn ────────────────────────────────────────────
export const DUAL_SPAWN_WAVE = 15;
export const DUAL_SPAWN_START_PCT = 0.02;   // 2% at wave 21 (start of % ramp)
export const DUAL_SPAWN_RAMP_PCT = 0.01;    // +1% per wave
export const DUAL_SPAWN_MAX_PCT = 0.20;     // cap at 20%
export const FLYING_START_WAVE = 17;

// ── Wave Generation Tuning ────────────────────────────────
export const WAVE_GEN = {
    GROUP_BASE: 2,             // base number of groups
    GROUP_PER_WAVES: 5,        // +1 group every N waves
    GROUP_MAX: 6,              // max groups per wave
    COUNT_BASE: 4,             // base enemies per group
    COUNT_PER_WAVE: 0.45,      // +N enemies per wave
    COUNT_RANDOM: 4,           // random variance on count
    COUNT_MULTIPLIER: 0.78,    // global enemy count scalar
    INTERVAL_BASE: 0.8,        // base spawn interval (seconds)
    INTERVAL_DECAY: 0.01,      // interval shrinks per wave
    INTERVAL_MIN: 0.22,        // floor for spawn interval
    INTERVAL_MULTI: { grunt: 1.0, runner: 1.3, tank: 0.8, healer: 1.0, boss: 0.8, swarm: 1.3, wobbler: 1.0, flying: 1.0, megaboss: 0.7 },
    GROUP_OVERLAP: 0.5,        // next group starts at this fraction of previous
    GROUP_GAP_MIN: 0.7,        // min gap between groups (seconds)
    GROUP_GAP_RANDOM: 1.0,     // random extra gap
    BOSS_INTERVAL: 4.0,        // spawn interval between bosses
    BOSS_DELAY: 1.0,           // delay after last group before boss
};

// ── Game Speed ────────────────────────────────────────────
export const SPEED_MULTIPLIERS = { 1: 1.1, 2: 2.1, 3: 3.1 };
export const SPEED_MIN = 1;
export const SPEED_MAX = 3;

// ── Enemy Definitions ──────────────────────────────────────
export const ENEMY_TYPES = {
    grunt: {
        name: 'Grunt',
        baseHP: 18,
        speed: 70,     // px per second (+15%)
        reward: 7,
        livesCost: 1,
        color: '#e74c3c',
        radius: 9,
        armor: 0,
    },
    runner: {
        name: 'Runner',
        baseHP: 6,
        speed: 125,    // (+15%)
        reward: 6,
        livesCost: 1,
        color: '#f39c12',
        radius: 10,
        armor: 0,
    },
    tank: {
        name: 'Tank',
        baseHP: 75,
        speed: 40,     // (+15%)
        reward: 14,
        livesCost: 2,
        color: '#2c3e50',
        radius: 13,
        armor: 0.27,
    },
    healer: {
        name: 'Healer',
        baseHP: 25,
        speed: 65,     // (+15%)
        reward: 10,
        livesCost: 1,
        color: '#2ecc71',
        radius: 9,
        armor: 0,
        healRadius: 1.5,  // grid cells
        healRate: 3,       // HP per second to nearby allies
    },
    boss: {
        name: 'Boss',
        baseHP: 349,
        speed: 26,     // (+15%)
        reward: 150,
        livesCost: 5,
        color: '#8e44ad',
        radius: 24,
        armor: 0.20,
    },
    swarm: {
        name: 'Swarm',
        baseHP: 5,
        speed: 105,    // (+15%)
        reward: 5,
        livesCost: 1,
        color: '#e67e22',
        radius: 8,
        armor: 0,
    },
    wobbler: {
        name: 'Wobbler',
        baseHP: 8,
        speed: 29,
        reward: 25,
        livesCost: 1,
        color: '#ff69b4',
        radius: 14,
        armor: 0,
    },
    flying: {
        name: 'Flying',
        baseHP: 10,
        speed: 97,
        reward: 20,
        livesCost: 1,
        color: '#9b59b6',
        radius: 11,
        armor: 0,
    },
    megaboss: {
        name: 'Mega Boss',
        baseHP: 392,
        speed: 58,
        reward: 240,
        livesCost: 5,
        color: '#8b0000',
        radius: 34,
        armor: 0.25,
    },
};

// ── Wave Definitions (5 intro waves, then procedural) ─────
// { type, count, interval (seconds between spawns), delay (seconds before group) }
export const WAVES = [
    // Wave 1: Grunts — teach basic mechanics
    [{ type: 'grunt', count: 8, interval: 0.85, delay: 0 }],
    // Wave 2: Grunts + Runners — cannon unlocks
    [{ type: 'grunt', count: 8, interval: 0.75, delay: 0 }, { type: 'runner', count: 3, interval: 0.4, delay: 1.5 }],
    // Wave 3: Tank introduction
    [{ type: 'runner', count: 6, interval: 0.50, delay: 0 }, { type: 'grunt', count: 6, interval: 0.6, delay: 1.5 }],
    // Wave 4: Runners + Tanks
    [{ type: 'runner', count: 14, interval: 0.45, delay: 0 }, { type: 'tank', count: 2, interval: 1.7, delay: 1.5 }],
    // Wave 5: Mixed — sniper unlocks
    [{ type: 'grunt', count: 8, interval: 0.6, delay: 0 }, { type: 'tank', count: 3, interval: 1.3, delay: 0.5 }, { type: 'healer', count: 1, interval: 0, delay: 2.5 }],
];

// ── Goldrush & Boss Events ───────────────────────────────
export const GOLDRUSH_INTERVAL = 10;  // goldrush every 10 waves
export const GOLD_RUSH_MULTIPLIER = 2;
export const MIDBOSS_BOUNTY = 150;

export const ARMOR_BREAK_FACTOR = 0.5; // enemies lose 50% armor on armorbreak waves

// ── Targeting Modes ────────────────────────────────────────
export const TARGET_MODES = ['First', 'Closest', 'Strongest', 'Weakest'];

// ── Particle Pool ──────────────────────────────────────────
export const MAX_PARTICLES = 500;

// ── HP Scaling ─────────────────────────────────────────────
export function getWaveHPScale(wave) {
    // Wave 1≈1.11, Wave 10≈28.3, Wave 20≈161
    return wave * Math.pow(1.11, wave);
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
export const EARLY_SEND_MAX_BONUS = 30;
export const EARLY_SEND_DECAY = 5; // gold lost per second of waiting

// ── Point Light System ───────────────────────────────────
export const MAX_POINT_LIGHTS = 32;
export const MAP_AMBIENT_DARKNESS = {
    serpentine: 0.25,
    splitcreek: 0.10,
    gauntlet: 0.35,
};
export const TOWER_LIGHT_DEFS = {
    arrow:          { radius: 0.04, intensity: 0.25 },
    firearrow:      { radius: 0.05, intensity: 0.35 },
    frost:          { radius: 0.04, intensity: 0.25 },
    deepfrost:      { radius: 0.05, intensity: 0.30 },
    lightning:      { radius: 0.04, intensity: 0.30 },
    superlightning: { radius: 0.06, intensity: 0.40 },
    cannon:         { radius: 0.04, intensity: 0.25 },
    bicannon:       { radius: 0.06, intensity: 0.40 },
    sniper:         { radius: 0.04, intensity: 0.30 },
    missilesniper:  { radius: 0.07, intensity: 0.45 },
    pulsecannon:    { radius: 0.05, intensity: 0.35 },
};

// ── Atmosphere Presets ──────────────────────────────────
export const ATMOSPHERE_PRESETS = {
    standard: {
        name: 'Standard',
        description: "Map's native theme",
        themeColor: '#888888',
    },
    cyberpunk: {
        name: 'Cyberpunk',
        description: 'Neon-lit digital grid',
        themeColor: '#ff00ff',
        ground:  { base: [55, 30, 75], variance: 10 },
        obstacle: { tint: '#8830cc' },
        particles: {
            primary:   { behavior: 'sand', colors: ['#ff00ff', '#00ffff', '#aa00ff'], weight: 0.7 },
            secondary: { behavior: 'firefly', colors: ['#ff00ff', '#00ffff', '#ffff00'], weight: 0.3 },
        },
        postfx: { mapTint: [0.9, 0.8, 1.1], ambientDarkness: 0.18, bloomIntensity: 0.5, bloomThreshold: 0.5, vignetteStrength: 0.4 },
        lighting: { ambient: { color: 0x9944ff, intensity: 2.2 }, dir: { color: 0xff66ff, intensity: 1.5 }, fill: { color: 0x4488ff, intensity: 1.0 }, background: 0x140028, fog: { color: 0x140028, near: 1200, far: 4000 } },
    },
    ethereal: {
        name: 'Ethereal',
        description: 'Dreamy luminous mist',
        themeColor: '#c0a0ff',
        ground:  { base: [185, 170, 215], variance: 12 },
        obstacle: { tint: '#a090c0' },
        particles: {
            primary:   { behavior: 'firefly', colors: ['#e0d0ff', '#ffffff', '#c0b0ff'], weight: 0.6 },
            secondary: { behavior: 'leaf', colors: ['#d0c0f0', '#b8a8e0', '#e8d8ff'], weight: 0.4 },
        },
        postfx: { mapTint: [0.95, 0.92, 1.08], ambientDarkness: 0.0, bloomIntensity: 0.5, bloomThreshold: 0.5, vignetteStrength: 0.2 },
        lighting: { ambient: { color: 0xd8d0ff, intensity: 2.8 }, dir: { color: 0xfff0ff, intensity: 1.2 }, fill: { color: 0xd0b8ff, intensity: 1.2 }, background: 0x342850, fog: { color: 0x443060, near: 1500, far: 4500 } },
    },
    sinister: {
        name: 'Sinister',
        description: 'Oppressive crimson dark',
        themeColor: '#8b0000',
        ground:  { base: [70, 28, 28], variance: 10 },
        obstacle: { tint: '#602020' },
        particles: {
            primary:   { behavior: 'ember', colors: ['#aa2200', '#cc3300', '#882200'], weight: 0.6 },
            secondary: { behavior: 'dust', colors: ['#6a3030', '#5a2525', '#4a1a1a'], weight: 0.4 },
        },
        postfx: { mapTint: [1.08, 0.85, 0.85], ambientDarkness: 0.2, bloomIntensity: 0.3, bloomThreshold: 0.65, vignetteStrength: 0.5 },
        lighting: { ambient: { color: 0x882222, intensity: 2.0 }, dir: { color: 0xcc4444, intensity: 1.3 }, fill: { color: 0x662222, intensity: 0.8 }, background: 0x180808, fog: { color: 0x180808, near: 1000, far: 3800 } },
    },
    frozen: {
        name: 'Frozen Wastes',
        description: 'Icy blizzard tundra',
        themeColor: '#88ccff',
        ground:  { base: [195, 215, 235], variance: 10 },
        obstacle: { tint: '#80a0b8' },
        particles: {
            primary:   { behavior: 'leaf', colors: ['#ffffff', '#d0e8ff', '#b8d8f0'], weight: 0.7 },
            secondary: { behavior: 'firefly', colors: ['#aaddff', '#ccefff', '#ffffff'], weight: 0.3 },
        },
        postfx: { mapTint: [0.88, 0.96, 1.12], ambientDarkness: 0.05, bloomIntensity: 0.35, bloomThreshold: 0.6, vignetteStrength: 0.3 },
        lighting: { ambient: { color: 0xaaccee, intensity: 2.5 }, dir: { color: 0xddeeff, intensity: 1.5 }, fill: { color: 0x88aacc, intensity: 1.0 }, background: 0x243848, fog: { color: 0x344858, near: 1200, far: 4000 } },
    },
    solar: {
        name: 'Solar Flare',
        description: 'Blazing stellar heat',
        themeColor: '#ff8800',
        ground:  { base: [100, 55, 25], variance: 12 },
        obstacle: { tint: '#b06020' },
        particles: {
            primary:   { behavior: 'ember', colors: ['#ff6600', '#ffaa00', '#ffcc00'], weight: 0.7 },
            secondary: { behavior: 'bubble', colors: ['#ff4400', '#ff8800', '#ffcc44'], weight: 0.3 },
        },
        postfx: { mapTint: [1.1, 0.95, 0.85], ambientDarkness: 0.1, bloomIntensity: 0.45, bloomThreshold: 0.5, vignetteStrength: 0.35 },
        lighting: { ambient: { color: 0xee8833, intensity: 2.2 }, dir: { color: 0xffaa44, intensity: 1.5 }, fill: { color: 0xff8844, intensity: 1.0 }, background: 0x2a1400, fog: { color: 0x2a1400, near: 1200, far: 4000 } },
    },
    void: {
        name: 'The Void',
        description: 'Deep space emptiness',
        themeColor: '#4444aa',
        ground:  { base: [30, 28, 55], variance: 8 },
        obstacle: { tint: '#383870' },
        particles: {
            primary:   { behavior: 'firefly', colors: ['#ffffff', '#aaaaff', '#8888cc'], weight: 0.7 },
            secondary: { behavior: 'dust', colors: ['#444466', '#555588', '#3a3a66'], weight: 0.3 },
        },
        postfx: { mapTint: [0.85, 0.88, 1.15], ambientDarkness: 0.25, bloomIntensity: 0.4, bloomThreshold: 0.55, vignetteStrength: 0.5 },
        lighting: { ambient: { color: 0x4444aa, intensity: 1.8 }, dir: { color: 0x6666cc, intensity: 1.2 }, fill: { color: 0x4444aa, intensity: 0.8 }, background: 0x080818, fog: { color: 0x080818, near: 800, far: 3500 } },
    },
};
