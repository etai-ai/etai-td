import { COLS, ROWS, CELL, CELL_TYPE, MAP_DEFS } from './constants.js';
import { gridToWorld } from './utils.js';

// Simple deterministic hash for procedural decoration
function seedRand(x, y, i) {
    let h = (x * 374761 + y * 668265 + i * 982451) & 0x7fffffff;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return (h & 0xffff) / 0xffff;
}

export class GameMap {
    constructor(mapId = 'serpentine') {
        this.mapId = mapId;
        this.def = MAP_DEFS[mapId];
        this.grid = [];
        this.path = [];        // world-coordinate waypoints (single path or prefix for split)
        this.pathCells = new Set(); // "x,y" strings for fast lookup

        // Split path data (null for non-split maps)
        this.pathUpper = null;
        this.pathLower = null;

        this.buildGrid();
    }

    buildGrid() {
        const def = this.def;

        // Initialize all cells as buildable
        this.grid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => CELL_TYPE.BUILDABLE)
        );

        if (def.paths) {
            // Split map: carve prefix, upper, lower, suffix
            const prefix = def.waypoints;
            const upper = def.paths.upper;
            const lower = def.paths.lower;
            const suffix = def.paths.suffix;

            // Carve prefix
            for (let i = 0; i < prefix.length - 1; i++) {
                this.carveLine(prefix[i].x, prefix[i].y, prefix[i + 1].x, prefix[i + 1].y);
            }
            // Carve prefix-to-upper connection
            const prefixEnd = prefix[prefix.length - 1];
            this.carveLine(prefixEnd.x, prefixEnd.y, upper[0].x, upper[0].y);
            // Carve upper branch
            for (let i = 0; i < upper.length - 1; i++) {
                this.carveLine(upper[i].x, upper[i].y, upper[i + 1].x, upper[i + 1].y);
            }
            // Carve prefix-to-lower connection
            this.carveLine(prefixEnd.x, prefixEnd.y, lower[0].x, lower[0].y);
            // Carve lower branch
            for (let i = 0; i < lower.length - 1; i++) {
                this.carveLine(lower[i].x, lower[i].y, lower[i + 1].x, lower[i + 1].y);
            }
            // Carve upper-to-suffix connection
            const upperEnd = upper[upper.length - 1];
            this.carveLine(upperEnd.x, upperEnd.y, suffix[0].x, suffix[0].y);
            // Carve lower-to-suffix connection
            const lowerEnd = lower[lower.length - 1];
            this.carveLine(lowerEnd.x, lowerEnd.y, suffix[0].x, suffix[0].y);
            // Carve suffix
            for (let i = 0; i < suffix.length - 1; i++) {
                this.carveLine(suffix[i].x, suffix[i].y, suffix[i + 1].x, suffix[i + 1].y);
            }

            // Build world-coordinate paths for each branch
            const prefixWorld = prefix.map(wp => gridToWorld(wp.x, wp.y));
            const upperWorld = upper.map(wp => gridToWorld(wp.x, wp.y));
            const lowerWorld = lower.map(wp => gridToWorld(wp.x, wp.y));
            const suffixWorld = suffix.map(wp => gridToWorld(wp.x, wp.y));

            this.pathUpper = [...prefixWorld, ...upperWorld, ...suffixWorld];
            this.pathLower = [...prefixWorld, ...lowerWorld, ...suffixWorld];
            // Default path (used for preview/fallback)
            this.path = this.pathUpper;
        } else {
            // Single path map
            const waypoints = def.waypoints;
            for (let i = 0; i < waypoints.length - 1; i++) {
                this.carveLine(waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y);
            }
            this.path = waypoints.map(wp => gridToWorld(wp.x, wp.y));
        }

        // Mark blocked cells
        for (const c of def.blocked) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS) {
                if (this.grid[c.y][c.x] !== CELL_TYPE.PATH) {
                    this.grid[c.y][c.x] = CELL_TYPE.BLOCKED;
                }
            }
        }
    }

    getEnemyPath() {
        if (this.pathUpper && this.pathLower) {
            return Math.random() < 0.5 ? this.pathUpper : this.pathLower;
        }
        return this.path;
    }

    carveLine(x0, y0, x1, y1) {
        // Carve a straight line (horizontal or vertical)
        const dx = Math.sign(x1 - x0);
        const dy = Math.sign(y1 - y0);
        let x = x0, y = y0;
        while (true) {
            if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                this.grid[y][x] = CELL_TYPE.PATH;
                this.pathCells.add(`${x},${y}`);
            }
            if (x === x1 && y === y1) break;
            if (x !== x1) x += dx;
            else y += dy;
        }
    }

    isPath(gx, gy) {
        return this.pathCells.has(`${gx},${gy}`);
    }

    isBuildable(gx, gy) {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
        return this.grid[gy][gx] === CELL_TYPE.BUILDABLE;
    }

    getCellType(gx, gy) {
        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return CELL_TYPE.BLOCKED;
        return this.grid[gy][gx];
    }

    drawTerrain(ctx) {
        ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
        const env = this.def.environment || 'forest';

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = x * CELL;
                const py = y * CELL;
                const type = this.grid[y][x];

                if (type === CELL_TYPE.PATH) {
                    this[`draw${env === 'desert' ? 'Desert' : env === 'lava' ? 'Lava' : ''}PathCell`](ctx, px, py, x, y);
                } else {
                    this[`draw${env === 'desert' ? 'Desert' : env === 'lava' ? 'Lava' : 'Grass'}Cell`](ctx, px, py, x, y);
                    if (type === CELL_TYPE.BLOCKED) {
                        this[`draw${env === 'desert' ? 'Desert' : env === 'lava' ? 'Lava' : ''}Obstacle`](ctx, px, py, x, y);
                    }
                }
            }
        }

        // Draw castle at path exit
        this.drawCastle(ctx);

        // Grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL, 0);
            ctx.lineTo(x * CELL, ROWS * CELL);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL);
            ctx.lineTo(COLS * CELL, y * CELL);
            ctx.stroke();
        }
    }

    drawCastle(ctx) {
        const def = this.def;
        const exitPt = def.paths
            ? def.paths.suffix[def.paths.suffix.length - 1]
            : def.waypoints[def.waypoints.length - 1];
        const cx = exitPt.x * CELL + CELL / 2;
        const cy = exitPt.y * CELL + CELL / 2;
        const s = 1.8; // scale factor

        // Castle base
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(cx - 18 * s, cy - 14 * s, 36 * s, 28 * s);

        // Lighter front face
        ctx.fillStyle = '#7a7a8a';
        ctx.fillRect(cx - 16 * s, cy - 12 * s, 32 * s, 24 * s);

        // Gate (dark arch)
        ctx.fillStyle = '#2a2a3a';
        ctx.beginPath();
        ctx.moveTo(cx - 8 * s, cy + 14 * s);
        ctx.lineTo(cx - 8 * s, cy);
        ctx.arc(cx, cy, 8 * s, Math.PI, 0);
        ctx.lineTo(cx + 8 * s, cy + 14 * s);
        ctx.closePath();
        ctx.fill();

        // Battlements (crenellations)
        ctx.fillStyle = '#5a5a6a';
        const bw = 8 * s, bh = 6 * s, gap = 4 * s;
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(cx + i * (bw + gap) - bw / 2, cy - 14 * s - bh, bw, bh);
        }

        // Left tower
        ctx.fillStyle = '#6a6a7a';
        ctx.fillRect(cx - 24 * s, cy - 22 * s, 12 * s, 44 * s);
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(cx - 26 * s, cy - 26 * s, 16 * s, 6 * s);
        // Tower top crenellations
        ctx.fillRect(cx - 26 * s, cy - 30 * s, 5 * s, 4 * s);
        ctx.fillRect(cx - 16 * s, cy - 30 * s, 5 * s, 4 * s);

        // Right tower
        ctx.fillStyle = '#6a6a7a';
        ctx.fillRect(cx + 12 * s, cy - 22 * s, 12 * s, 44 * s);
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(cx + 10 * s, cy - 26 * s, 16 * s, 6 * s);
        ctx.fillRect(cx + 10 * s, cy - 30 * s, 5 * s, 4 * s);
        ctx.fillRect(cx + 20 * s, cy - 30 * s, 5 * s, 4 * s);

        // Flag on right tower
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(cx + 19 * s, cy - 30 * s);
        ctx.lineTo(cx + 32 * s, cy - 25 * s);
        ctx.lineTo(cx + 19 * s, cy - 20 * s);
        ctx.closePath();
        ctx.fill();
        // Flagpole
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 19 * s, cy - 36 * s);
        ctx.lineTo(cx + 19 * s, cy - 20 * s);
        ctx.stroke();
    }

    // ── Desert environment cells ─────────────────────────────

    drawDesertCell(ctx, px, py, gx, gy) {
        const shade = seedRand(gx, gy, 0);
        const r = Math.floor(210 + shade * 20 - 10);
        const g = Math.floor(180 + shade * 15 - 7);
        const b = Math.floor(120 + shade * 10 - 5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Sand speckles
        const speckleCount = 2 + Math.floor(seedRand(gx, gy, 1) * 3);
        for (let i = 0; i < speckleCount; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 20 + i) * (CELL - 4) + 2;
            ctx.fillStyle = seedRand(gx, gy, 30 + i) > 0.5
                ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
            const sw = 1 + seedRand(gx, gy, 40 + i) * 2;
            ctx.fillRect(sx, sy, sw, sw);
        }

        // Occasional small pebble
        if (seedRand(gx, gy, 50) > 0.8) {
            const px2 = px + seedRand(gx, gy, 51) * (CELL - 8) + 4;
            const py2 = py + seedRand(gx, gy, 52) * (CELL - 8) + 4;
            ctx.fillStyle = '#b8a080';
            ctx.beginPath();
            ctx.ellipse(px2, py2, 2, 1.5, seedRand(gx, gy, 53) * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDesertPathCell(ctx, px, py, gx, gy) {
        // Packed sandstone path — darker than surrounding sand
        ctx.fillStyle = '#b8943c';
        ctx.fillRect(px, py, CELL, CELL);

        // Cracked texture
        const crackCount = 2 + Math.floor(seedRand(gx, gy, 0) * 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < crackCount; i++) {
            const sx = px + seedRand(gx, gy, 60 + i) * CELL;
            const sy = py + seedRand(gx, gy, 70 + i) * CELL;
            const ex = sx + (seedRand(gx, gy, 80 + i) - 0.5) * 14;
            const ey = sy + (seedRand(gx, gy, 90 + i) - 0.5) * 14;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Edge borders
        const edgeW = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW);
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL);
    }

    drawDesertObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Sandstone rock — warm tones
            const baseRadius = 9;
            ctx.fillStyle = '#a08060';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6;
                const r = baseRadius * (0.7 + seedRand(gx, gy, i) * 0.5);
                const rx = cx + Math.cos(a) * r;
                const ry = cy + 2 + Math.sin(a) * r * 0.75;
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            const ha = 0;
            const ha2 = (Math.PI * 2) / 6;
            const r0 = baseRadius * (0.7 + seedRand(gx, gy, 0) * 0.5);
            const r1 = baseRadius * (0.7 + seedRand(gx, gy, 1) * 0.5);
            ctx.moveTo(cx, cy + 2);
            ctx.lineTo(cx + Math.cos(ha) * r0, cy + 2 + Math.sin(ha) * r0 * 0.75);
            ctx.lineTo(cx + Math.cos(ha2) * r1, cy + 2 + Math.sin(ha2) * r1 * 0.75);
            ctx.closePath();
            ctx.fill();
        } else {
            // Cactus — shadow
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 11, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main trunk
            ctx.fillStyle = '#2d8a4e';
            ctx.fillRect(cx - 3, cy - 8, 6, 20);
            // Trunk ridges
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - 1, cy - 7);
            ctx.lineTo(cx - 1, cy + 11);
            ctx.moveTo(cx + 1, cy - 7);
            ctx.lineTo(cx + 1, cy + 11);
            ctx.stroke();

            // Left arm
            ctx.fillStyle = '#2d8a4e';
            ctx.fillRect(cx - 9, cy - 3, 6, 4);
            ctx.fillRect(cx - 9, cy - 8, 4, 6);

            // Right arm
            ctx.fillRect(cx + 3, cy - 1, 6, 4);
            ctx.fillRect(cx + 6, cy - 6, 4, 6);

            // Cactus top highlight
            ctx.fillStyle = '#3aa862';
            ctx.fillRect(cx - 2, cy - 8, 4, 3);
        }
    }

    // ── Lava environment cells ──────────────────────────────

    drawLavaCell(ctx, px, py, gx, gy) {
        // Molten lava ground — bright orange/red
        const shade = seedRand(gx, gy, 0);
        const r = Math.floor(200 + shade * 40);
        const g = Math.floor(70 + shade * 40);
        const b = Math.floor(10 + shade * 15);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Bright hot streaks
        const streakCount = 2 + Math.floor(seedRand(gx, gy, 1) * 2);
        for (let i = 0; i < streakCount; i++) {
            const sx = px + seedRand(gx, gy, 80 + i) * CELL;
            const sy = py + seedRand(gx, gy, 90 + i) * CELL;
            const sw = 2 + seedRand(gx, gy, 100 + i) * 5;
            const sh = 1 + seedRand(gx, gy, 110 + i) * 2;
            ctx.fillStyle = `rgba(255,220,60,${0.15 + seedRand(gx, gy, 120 + i) * 0.2})`;
            ctx.fillRect(sx, sy, sw, sh);
        }

        // Dark cooled crust patches
        if (seedRand(gx, gy, 2) > 0.5) {
            const cx2 = px + seedRand(gx, gy, 130) * (CELL - 8) + 4;
            const cy2 = py + seedRand(gx, gy, 140) * (CELL - 8) + 4;
            ctx.fillStyle = 'rgba(40,15,5,0.35)';
            ctx.beginPath();
            ctx.ellipse(cx2, cy2, 4 + seedRand(gx, gy, 150) * 4, 3, seedRand(gx, gy, 160) * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawLavaPathCell(ctx, px, py, gx, gy) {
        // Cooled dark basalt rock — enemies walk here
        const shade = seedRand(gx, gy, 0);
        const v = Math.floor(38 + shade * 14);
        ctx.fillStyle = `rgb(${v},${v - 5},${v - 8})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Subtle lava cracks glowing through the rock
        const crackCount = 1 + Math.floor(seedRand(gx, gy, 1) * 2);
        ctx.lineWidth = 0.6;
        for (let i = 0; i < crackCount; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * CELL;
            const sy = py + seedRand(gx, gy, 20 + i) * CELL;
            const ex = sx + (seedRand(gx, gy, 30 + i) - 0.5) * 16;
            const ey = sy + (seedRand(gx, gy, 40 + i) - 0.5) * 16;
            ctx.strokeStyle = `rgba(255,80,20,${0.1 + seedRand(gx, gy, 50 + i) * 0.1})`;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Rock texture speckles
        const speckleCount = 3 + Math.floor(seedRand(gx, gy, 3) * 3);
        for (let i = 0; i < speckleCount; i++) {
            const sx = px + seedRand(gx, gy, 60 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 70 + i) * (CELL - 4) + 2;
            ctx.fillStyle = seedRand(gx, gy, 80 + i) > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Glowing edge where path meets lava
        const edgeW = 3;
        ctx.fillStyle = 'rgba(255,100,20,0.2)';
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW);
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL);
    }

    drawLavaObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Obsidian rock — dark glossy
            const baseRadius = 10;
            ctx.fillStyle = '#1a1a2a';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6;
                const r = baseRadius * (0.7 + seedRand(gx, gy, i) * 0.5);
                const rx = cx + Math.cos(a) * r;
                const ry = cy + 2 + Math.sin(a) * r * 0.75;
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();

            // Glassy highlight
            ctx.fillStyle = 'rgba(100,80,160,0.25)';
            ctx.beginPath();
            const ha = 0;
            const ha2 = (Math.PI * 2) / 6;
            const r0 = baseRadius * (0.7 + seedRand(gx, gy, 0) * 0.5);
            const r1 = baseRadius * (0.7 + seedRand(gx, gy, 1) * 0.5);
            ctx.moveTo(cx, cy + 2);
            ctx.lineTo(cx + Math.cos(ha) * r0, cy + 2 + Math.sin(ha) * r0 * 0.75);
            ctx.lineTo(cx + Math.cos(ha2) * r1, cy + 2 + Math.sin(ha2) * r1 * 0.75);
            ctx.closePath();
            ctx.fill();

            // Lava glow at base
            ctx.fillStyle = 'rgba(255,80,20,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, baseRadius * 0.8, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Lava geyser / vent
            // Base crater
            ctx.fillStyle = 'rgba(255,60,10,0.2)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 6, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rock chimney
            ctx.fillStyle = '#2a1a1a';
            ctx.fillRect(cx - 4, cy - 6, 8, 14);
            ctx.fillStyle = '#3a2520';
            ctx.fillRect(cx - 3, cy - 5, 6, 12);

            // Glowing top opening
            ctx.fillStyle = '#ff6020';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffaa40';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6, 2, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Smoke wisps
            ctx.fillStyle = 'rgba(80,60,60,0.15)';
            for (let i = 0; i < 3; i++) {
                const sx = cx + (seedRand(gx, gy, 10 + i) - 0.5) * 8;
                const sy = cy - 10 - seedRand(gx, gy, 20 + i) * 8;
                ctx.beginPath();
                ctx.arc(sx, sy, 2 + seedRand(gx, gy, 30 + i) * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ── Forest environment cells ──────────────────────────────

    drawGrassCell(ctx, px, py, gx, gy) {
        // Base grass with deterministic shade variation
        const shade = seedRand(gx, gy, 0);
        const g = Math.floor(140 + shade * 20 - 10); // 130-150
        const r = Math.floor(74 + shade * 10 - 5);
        ctx.fillStyle = `rgb(${r},${g},63)`;
        ctx.fillRect(px, py, CELL, CELL);

        // Grass blades (3-5 per cell)
        const bladeCount = 3 + Math.floor(seedRand(gx, gy, 1) * 3);
        ctx.strokeStyle = `rgba(${r + 15},${g + 20},80,0.5)`;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < bladeCount; i++) {
            const bx = px + seedRand(gx, gy, 10 + i) * (CELL - 4) + 2;
            const by = py + CELL - 2;
            const height = 4 + seedRand(gx, gy, 20 + i) * 6;
            const lean = (seedRand(gx, gy, 30 + i) - 0.5) * 6;

            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx + lean * 0.5, by - height * 0.6, bx + lean, by - height);
            ctx.stroke();
        }
    }

    drawPathCell(ctx, px, py, gx, gy) {
        // Base dirt color
        ctx.fillStyle = '#c8a96e';
        ctx.fillRect(px, py, CELL, CELL);

        // Dirt speckle texture
        const speckleCount = 4 + Math.floor(seedRand(gx, gy, 0) * 4);
        for (let i = 0; i < speckleCount; i++) {
            const sx = px + seedRand(gx, gy, 40 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 50 + i) * (CELL - 4) + 2;
            const shade = seedRand(gx, gy, 60 + i);
            ctx.fillStyle = shade > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
            const sw = 1 + seedRand(gx, gy, 70 + i) * 2;
            ctx.fillRect(sx, sy, sw, sw);
        }

        // Dark edge borders where path meets non-path
        const edgeW = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        // Check each neighbor
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);       // top
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW); // bottom
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);       // left
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL); // right
    }

    drawObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Rock — irregular polygon with 6 vertices
            const baseRadius = 9;
            ctx.fillStyle = '#6b7b7d';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6;
                const r = baseRadius * (0.7 + seedRand(gx, gy, i) * 0.5);
                const rx = cx + Math.cos(a) * r;
                const ry = cy + 2 + Math.sin(a) * r * 0.75;
                if (i === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            }
            ctx.closePath();
            ctx.fill();

            // Highlight facet
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            const ha = (Math.PI * 2 * 0) / 6;
            const ha2 = (Math.PI * 2 * 1) / 6;
            const r0 = baseRadius * (0.7 + seedRand(gx, gy, 0) * 0.5);
            const r1 = baseRadius * (0.7 + seedRand(gx, gy, 1) * 0.5);
            ctx.moveTo(cx, cy + 2);
            ctx.lineTo(cx + Math.cos(ha) * r0, cy + 2 + Math.sin(ha) * r0 * 0.75);
            ctx.lineTo(cx + Math.cos(ha2) * r1, cy + 2 + Math.sin(ha2) * r1 * 0.75);
            ctx.closePath();
            ctx.fill();

            // Small accent stone
            const acx = cx + 7 * (seedRand(gx, gy, 7) > 0.5 ? 1 : -1);
            const acy = cy + 6;
            ctx.fillStyle = '#8a9a9c';
            ctx.beginPath();
            ctx.ellipse(acx, acy, 3, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Tree — shadow ellipse first
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 11, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trunk with bark lines
            ctx.fillStyle = '#5d4e37';
            ctx.fillRect(cx - 2, cy, 4, 12);
            // Bark texture
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                const ly = cy + 2 + i * 3;
                ctx.beginPath();
                ctx.moveTo(cx - 1.5, ly);
                ctx.lineTo(cx + 1.5, ly + 1);
                ctx.stroke();
            }

            // Layered canopy (3 circles, dark to light)
            const canopyColors = ['#1e8c3a', '#27ae60', '#2ecc71'];
            const offsets = [
                { x: -3, y: -3, r: 9 },
                { x: 2, y: -5, r: 8 },
                { x: 0, y: -7, r: 7 },
            ];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = canopyColors[i];
                ctx.beginPath();
                ctx.arc(cx + offsets[i].x, cy + offsets[i].y, offsets[i].r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
