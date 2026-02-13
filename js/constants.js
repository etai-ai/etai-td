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
                secondaryWaypoints: [
                    {x:29,y:16},{x:22,y:16},{x:22,y:9},{x:27,y:9},{x:27,y:3},{x:29,y:3},{x:29,y:6}
                ],
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
                secondaryWaypoints: [
                    {x:29,y:3},{x:22,y:3},{x:22,y:10},{x:27,y:10},{x:27,y:17},{x:29,y:17},{x:29,y:13}
                ],
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
                secondaryWaypoints: [
                    {x:29,y:2},{x:22,y:2},{x:22,y:12},{x:26,y:12},{x:26,y:16},{x:29,y:16}
                ],
            },
            // Layout 3: Bottom entry, N-shape winding upward
            {
                waypoints: [
                    { x: 0, y: 15 }, { x: 5, y: 15 }, { x: 5, y: 8 }, { x: 12, y: 8 },
                    { x: 12, y: 16 }, { x: 20, y: 16 }, { x: 20, y: 5 }, { x: 27, y: 5 },
                    { x: 27, y: 12 }, { x: 29, y: 12 },
                ],
                blocked: [
                    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 8, y: 1 }, { x: 9, y: 1 },
                    { x: 15, y: 2 }, { x: 16, y: 2 }, { x: 24, y: 0 }, { x: 25, y: 0 },
                    { x: 1, y: 12 }, { x: 2, y: 12 }, { x: 8, y: 5 }, { x: 9, y: 5 },
                    { x: 15, y: 12 }, { x: 16, y: 12 }, { x: 24, y: 10 }, { x: 25, y: 10 },
                    { x: 3, y: 19 }, { x: 4, y: 19 }, { x: 10, y: 19 }, { x: 11, y: 19 },
                    { x: 0, y: 5 }, { x: 14, y: 0 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:2},{x:23,y:2},{x:23,y:9},{x:28,y:9},{x:28,y:12},{x:29,y:12}
                ],
            },
            // Layout 4: Center snake, fewer turns, longer segments
            {
                waypoints: [
                    { x: 0, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 3 }, { x: 16, y: 3 },
                    { x: 16, y: 17 }, { x: 24, y: 17 }, { x: 24, y: 10 }, { x: 29, y: 10 },
                ],
                blocked: [
                    { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 12, y: 0 }, { x: 13, y: 0 },
                    { x: 20, y: 1 }, { x: 21, y: 1 }, { x: 27, y: 2 }, { x: 28, y: 2 },
                    { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 12, y: 7 }, { x: 13, y: 7 },
                    { x: 20, y: 8 }, { x: 21, y: 8 }, { x: 3, y: 14 }, { x: 4, y: 14 },
                    { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 20, y: 13 }, { x: 21, y: 13 },
                    { x: 3, y: 19 }, { x: 4, y: 19 },
                ],
                paths: null,
                secondaryWaypoints: [
                    {x:29,y:3},{x:22,y:3},{x:22,y:13},{x:27,y:13},{x:27,y:10},{x:29,y:10}
                ],
            },
        ],
    },
    splitcreek: {
        name: 'Split Creek',
        themeColor: '#d4a026',
        worldHpMultiplier: 0.60,
        requiredRecord: 40,
        startingUnlocks: 30,
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
        worldHpMultiplier: 0.65,
        requiredRecord: 80,
        startingUnlocks: 50,
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
export const INTEREST_RATE = 0.02;    // 2% between waves
export const WAVE_BONUS_BASE = 25;
export const WAVE_BONUS_PER = 8;

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
            { damage: 16, range: 3.5, fireRate: 0.30, projSpeed: 320, burnDamage: 3, burnDuration: 3.0 },
            { damage: 25, range: 4.0, fireRate: 0.25, projSpeed: 360, burnDamage: 5, burnDuration: 3.5, upgradeCost: 120 },
            { damage: 36, range: 4.5, fireRate: 0.20, projSpeed: 400, burnDamage: 8, burnDuration: 4.0, upgradeCost: 200 },
        ],
    },
    frost: {
        name: 'Frost',
        cost: 75,
        color: '#5b9bd5',
        slow: true,
        maxWave: 9,
        levels: [
            { damage: 5, range: 3.0, fireRate: 0.8, projSpeed: 250, slowFactor: 0.5, slowDuration: 2.0 },
            { damage: 8, range: 3.5, fireRate: 0.7, projSpeed: 270, slowFactor: 0.4, slowDuration: 2.5, upgradeCost: 55 },
            { damage: 12, range: 4.0, fireRate: 0.6, projSpeed: 290, slowFactor: 0.3, slowDuration: 3.0, upgradeCost: 100 },
        ],
    },
    deepfrost: {
        name: 'Deep Frost',
        cost: 150,
        color: '#1a6b8a',
        aura: true,
        unlockWave: 10,
        levels: [
            { damage: 10, range: 3.0, fireRate: 1.2, slowFactor: 0.6, slowDuration: 1.5, freezeChance: 0.10, freezeDuration: 0.8 },
            { damage: 16, range: 3.5, fireRate: 0.85, slowFactor: 0.5, slowDuration: 2.0, freezeChance: 0.15, freezeDuration: 1.0, upgradeCost: 100 },
            { damage: 24, range: 4.0, fireRate: 0.7, slowFactor: 0.4, slowDuration: 2.5, freezeChance: 0.20, freezeDuration: 1.2, upgradeCost: 175 },
        ],
    },
    lightning: {
        name: 'Lightning',
        cost: 125,
        color: '#9b59b6',
        chain: true,
        maxWave: 29,
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
        unlockWave: 30,
        levels: [
            { damage: 18, range: 4.0, fireRate: 1.1, projSpeed: 600, forkCount: 4, forkDepth: 2, chainRange: 2.5, overcharge: 0.10, shockChance: 0.15, shockDuration: 0.3 },
            { damage: 28, range: 4.5, fireRate: 0.9, projSpeed: 650, forkCount: 6, forkDepth: 2, chainRange: 3.0, overcharge: 0.10, shockChance: 0.20, shockDuration: 0.3, upgradeCost: 150 },
            { damage: 42, range: 5.0, fireRate: 0.75, projSpeed: 700, forkCount: 8, forkDepth: 3, chainRange: 3.5, overcharge: 0.12, shockChance: 0.25, shockDuration: 0.4, upgradeCost: 250 },
        ],
    },
    cannon: {
        name: 'Cannon',
        cost: 100,
        color: '#8b5e3c',
        splash: true,
        maxWave: 29,
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
        unlockWave: 30,
        levels: [
            { damage: 35, range: 3.5, fireRate: 0.6, projSpeed: 220, splashRadius: 1.4, heavyEvery: 4, armorShred: 0.10, shredDuration: 3.0, scorchDPS: 5, scorchDuration: 2.0 },
            { damage: 55, range: 4.0, fireRate: 0.5, projSpeed: 240, splashRadius: 1.7, heavyEvery: 4, armorShred: 0.12, shredDuration: 3.5, scorchDPS: 8, scorchDuration: 2.5, upgradeCost: 120 },
            { damage: 85, range: 4.5, fireRate: 0.4, projSpeed: 260, splashRadius: 2.0, heavyEvery: 3, armorShred: 0.15, shredDuration: 4.0, scorchDPS: 12, scorchDuration: 3.0, upgradeCost: 200 },
        ],
    },
    sniper: {
        name: 'Sniper',
        cost: 150,
        color: '#c0392b',
        crit: true,
        maxWave: 49,
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
        size: 2,
        unlockWave: 50,
        levels: [
            { damage: 80, range: 7.0, fireRate: 2.5, projSpeed: 300, splashRadius: 1.2, critChance: 0.12, critMulti: 2.5 },
            { damage: 120, range: 8.0, fireRate: 2.2, projSpeed: 320, splashRadius: 1.5, critChance: 0.16, critMulti: 2.8, upgradeCost: 200 },
            { damage: 180, range: 9.0, fireRate: 1.8, projSpeed: 350, splashRadius: 1.8, critChance: 0.20, critMulti: 3.2, upgradeCost: 300 },
        ],
    },
    pulsecannon: {
        name: 'Pulse Cannon',
        cost: 300,
        color: '#2eaaaa',
        splash: true,
        knockback: true,
        unlockWave: 80,
        levels: [
            { damage: 20, range: 3.5, fireRate: 1.8, projSpeed: 200, splashRadius: 1.2, knockbackDist: 1.0 },
            { damage: 30, range: 4.0, fireRate: 1.5, projSpeed: 220, splashRadius: 1.5, knockbackDist: 1.5, upgradeCost: 150 },
            { damage: 45, range: 4.5, fireRate: 1.3, projSpeed: 240, splashRadius: 1.8, knockbackDist: 2.0, upgradeCost: 250 },
        ],
    },
};

// ── Wave Threshold Unlock Definitions ────────────────────
export const WAVE_UNLOCKS = {
    10: { towers: ['Fire Arrow', 'Deep Frost'], keys: ['firearrow', 'deepfrost'], replaces: ['Arrow', 'Frost'], color: '#c0392b' },
    20: { hero: true, color: '#00e5ff' },
    30: { towers: ['Super Lightning', 'Bi-Cannon'], keys: ['superlightning', 'bicannon'], replaces: ['Lightning', 'Cannon'], color: '#7b3fff' },
    50: { towers: ['Missile Sniper'], keys: ['missilesniper'], replaces: ['Sniper'], color: '#6b8e23' },
    60: { dualSpawn: true, color: '#e74c3c' },
    80: { towers: ['Pulse Cannon'], keys: ['pulsecannon'], replaces: null, color: '#2eaaaa' },
};

// ── Hero Definitions ──────────────────────────────────────
export const HERO_STATS = {
    unlockWave: 20,       // hero appears at wave 20
    maxHP: 200,
    speed: 150,           // px/s
    radius: 14,
    color: '#00e5ff',     // cyan — distinct from all towers/enemies
    // Auto-attack
    damage: 15,  range: 3.5,  fireRate: 0.5,  projSpeed: 350,
    // Contact damage (DPS tick every 0.5s)
    contactTick: 0.5,  contactBase: 10,
    contactMultipliers: { grunt: 1, runner: 0.8, tank: 2, healer: 0.6, boss: 3, swarm: 0.5 },
    // Respawn
    respawnDelay: 5.0,
    // Q: AoE Stun
    stunRadius: 3.0,  stunDuration: 1.5,  stunCooldown: 15.0,
    // E: Gold Magnet
    magnetRadius: 4.0,  magnetDuration: 8.0,  magnetMultiplier: 2,  magnetCooldown: 20.0,
};

// ── Dual Spawn ────────────────────────────────────────────
export const DUAL_SPAWN_WAVE = 60;

// ── Enemy Definitions ──────────────────────────────────────
export const ENEMY_TYPES = {
    grunt: {
        name: 'Grunt',
        baseHP: 30,
        speed: 70,     // px per second (+15%)
        reward: 6,
        livesCost: 1,
        color: '#e74c3c',
        radius: 9,
        armor: 0,
    },
    runner: {
        name: 'Runner',
        baseHP: 16,
        speed: 125,    // (+15%)
        reward: 5,
        livesCost: 1,
        color: '#f39c12',
        radius: 8,
        armor: 0,
    },
    tank: {
        name: 'Tank',
        baseHP: 100,
        speed: 40,     // (+15%)
        reward: 17,
        livesCost: 2,
        color: '#2c3e50',
        radius: 13,
        armor: 0.27,
    },
    healer: {
        name: 'Healer',
        baseHP: 50,
        speed: 65,     // (+15%)
        reward: 11,
        livesCost: 1,
        color: '#2ecc71',
        radius: 9,
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
        radius: 18,
        armor: 0.20,
    },
    swarm: {
        name: 'Swarm',
        baseHP: 8,
        speed: 105,    // (+15%)
        reward: 3,
        livesCost: 1,
        color: '#e67e22',
        radius: 6,
        armor: 0,
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
    [{ type: 'runner', count: 6, interval: 0.35, delay: 0 }, { type: 'grunt', count: 6, interval: 0.6, delay: 1.5 }],
    // Wave 4: Runners + Tanks
    [{ type: 'runner', count: 14, interval: 0.25, delay: 0 }, { type: 'tank', count: 2, interval: 1.7, delay: 1.5 }],
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
