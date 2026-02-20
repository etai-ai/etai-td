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
    constructor(mapId = 'serpentine', layoutIndex = 0) {
        this.mapId = mapId;
        this.def = MAP_DEFS[mapId];
        this.layout = this.def.layouts[layoutIndex % this.def.layouts.length];
        this.grid = [];
        this.path = [];        // world-coordinate waypoints (single path or prefix for split)
        this.pathCells = new Set(); // "x,y" strings for fast lookup

        // Split path data (null for non-split maps)
        this.pathUpper = null;
        this.pathLower = null;
        this.secondaryPath = null;

        // Multi-path data (null for non-multi maps like citadel)
        this.multiPaths = null;

        this.buildGrid();
    }

    buildGrid() {
        const layout = this.layout;

        // Initialize all cells as buildable
        this.grid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => CELL_TYPE.BUILDABLE)
        );

        if (layout.multiPaths) {
            // Multi-path map (e.g. citadel): carve all paths, build world-coord arrays
            this.multiPaths = [];
            for (const wpArr of layout.multiPaths) {
                for (let i = 0; i < wpArr.length - 1; i++) {
                    this.carveLine(wpArr[i].x, wpArr[i].y, wpArr[i + 1].x, wpArr[i + 1].y);
                }
                this.multiPaths.push(wpArr.map(wp => gridToWorld(wp.x, wp.y)));
            }
            // Default path for preview/fallback = first path
            this.path = this.multiPaths[0];
        } else if (layout.paths) {
            // Split map: carve prefix, upper, lower, suffix
            const prefix = layout.waypoints;
            const upper = layout.paths.upper;
            const lower = layout.paths.lower;
            const suffix = layout.paths.suffix;

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
            const waypoints = layout.waypoints;
            for (let i = 0; i < waypoints.length - 1; i++) {
                this.carveLine(waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y);
            }
            this.path = waypoints.map(wp => gridToWorld(wp.x, wp.y));
        }

        // Secondary path (always carved visually)
        if (layout.secondaryWaypoints) {
            const secWP = layout.secondaryWaypoints;
            for (let i = 0; i < secWP.length - 1; i++) {
                this.carveLine(secWP[i].x, secWP[i].y, secWP[i + 1].x, secWP[i + 1].y);
            }
            // Only activate for spawning if entry is far enough from castle (min 6 cells)
            const exitGrid = layout.paths
                ? layout.paths.suffix[layout.paths.suffix.length - 1]
                : layout.waypoints[layout.waypoints.length - 1];
            const dx = secWP[0].x - exitGrid.x;
            const dy = secWP[0].y - exitGrid.y;
            if (Math.sqrt(dx * dx + dy * dy) >= 6) {
                this.secondaryPath = secWP.map(wp => gridToWorld(wp.x, wp.y));
            }
        }

        // Mark blocked cells
        for (const c of layout.blocked) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS) {
                if (this.grid[c.y][c.x] !== CELL_TYPE.PATH) {
                    this.grid[c.y][c.x] = CELL_TYPE.BLOCKED;
                }
            }
        }
    }

    getEnemyPath(useSecondary, pathIndex) {
        if (this.multiPaths) {
            if (pathIndex !== undefined && pathIndex >= 0 && pathIndex < this.multiPaths.length) {
                return this.multiPaths[pathIndex];
            }
            return this.multiPaths[Math.floor(Math.random() * this.multiPaths.length)];
        }
        if (useSecondary && this.secondaryPath) {
            return this.secondaryPath;
        }
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

    drawTerrain(ctx, colorOverride = null) {
        ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
        const env = this.def.environment || 'forest';

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = x * CELL;
                const py = y * CELL;
                const type = this.grid[y][x];

                const envPrefix = env === 'desert' ? 'Desert' : env === 'lava' ? 'Lava' : env === 'ruins' ? 'Ruins' : env === 'sky' ? 'Sky' : env === 'void' ? 'Void' : '';
                if (colorOverride) {
                    if (type === CELL_TYPE.PATH) {
                        // Always use map-native path for contrast with enemies
                        this[`draw${envPrefix}PathCell`](ctx, px, py, x, y);
                    } else {
                        this._drawAtmoGround(ctx, px, py, x, y, colorOverride);
                        if (type === CELL_TYPE.BLOCKED) {
                            this._drawAtmoObstacle(ctx, px, py, x, y, colorOverride);
                        }
                    }
                } else if (type === CELL_TYPE.PATH) {
                    this[`draw${envPrefix}PathCell`](ctx, px, py, x, y);
                } else {
                    const groundPrefix = env === 'desert' ? 'Desert' : env === 'lava' ? 'Lava' : env === 'ruins' ? 'Ruins' : env === 'sky' ? 'Sky' : env === 'void' ? 'Void' : 'Grass';
                    this[`draw${groundPrefix}Cell`](ctx, px, py, x, y);
                    if (type === CELL_TYPE.BLOCKED) {
                        this[`draw${envPrefix}Obstacle`](ctx, px, py, x, y);
                    }
                }
            }
        }

        // Draw castle at path exit
        this.drawCastle(ctx);

        // Draw entry/exit markers for multi-path maps
        if (this.layout.multiPaths) {
            const entries = this.layout.multiPaths.map(p => p[0]);
            const sharedEntry = entries.every(e => e.x === entries[0].x && e.y === entries[0].y);
            if (sharedEntry) {
                // Center spawn (e.g. Nexus) — draw spawn marker at shared entry
                this.drawSpawnMarker(ctx, entries[0]);
            } else {
                // Edge entries (e.g. Citadel) — draw arrow at each entry
                for (const wp of entries) {
                    this.drawEntryMarker(ctx, wp);
                }
            }
        }

        // Draw secondary entry marker (dual spawn)
        if (this.secondaryPath) {
            this.drawSecondaryEntry(ctx);
        }

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
        const layout = this.layout;

        // Multi-path: detect shared vs divergent exits
        if (layout.multiPaths) {
            const exits = layout.multiPaths.map(p => p[p.length - 1]);
            const sharedExit = exits.every(e => e.x === exits[0].x && e.y === exits[0].y);
            if (sharedExit) {
                // Single big castle (e.g. Citadel)
                const cx = exits[0].x * CELL + CELL / 2;
                const cy = exits[0].y * CELL + CELL / 2;
                this._drawBigCastle(ctx, cx, cy);
            } else {
                // Mini castles at each exit (e.g. Nexus)
                for (const ep of exits) {
                    this.drawMiniCastle(ctx, ep.x * CELL + CELL / 2, ep.y * CELL + CELL / 2);
                }
            }
            return;
        }

        let exitPt;
        if (layout.paths) {
            exitPt = layout.paths.suffix[layout.paths.suffix.length - 1];
        } else {
            exitPt = layout.waypoints[layout.waypoints.length - 1];
        }
        const cx = exitPt.x * CELL + CELL / 2;
        const cy = exitPt.y * CELL + CELL / 2;
        this._drawBigCastle(ctx, cx, cy);
    }

    _drawBigCastle(ctx, cx, cy) {
        const s = 2.2; // scale factor

        // --- Ground shadow ---
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(cx - 26 * s, cy + 14 * s, 52 * s, 4 * s);

        // --- Stone base (foundation) ---
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(cx - 25 * s, cy - 2 * s, 50 * s, 18 * s);

        // --- Main wall ---
        ctx.fillStyle = '#6e6e7e';
        ctx.fillRect(cx - 22 * s, cy - 16 * s, 44 * s, 30 * s);

        // Lighter front face
        ctx.fillStyle = '#7e7e8e';
        ctx.fillRect(cx - 20 * s, cy - 14 * s, 40 * s, 26 * s);

        // Stone texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const ly = cy - 10 * s + i * 7 * s;
            ctx.beginPath();
            ctx.moveTo(cx - 19 * s, ly);
            ctx.lineTo(cx + 19 * s, ly);
            ctx.stroke();
        }

        // --- Gate (dark arch with portcullis) ---
        ctx.fillStyle = '#1a1a2a';
        ctx.beginPath();
        ctx.moveTo(cx - 9 * s, cy + 14 * s);
        ctx.lineTo(cx - 9 * s, cy - 2 * s);
        ctx.arc(cx, cy - 2 * s, 9 * s, Math.PI, 0);
        ctx.lineTo(cx + 9 * s, cy + 14 * s);
        ctx.closePath();
        ctx.fill();

        // Portcullis bars
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
            const bx = cx + i * 3.5 * s;
            ctx.beginPath();
            ctx.moveTo(bx, cy - 2 * s);
            ctx.lineTo(bx, cy + 14 * s);
            ctx.stroke();
        }

        // --- Shield emblem above gate ---
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16 * s);
        ctx.lineTo(cx + 5 * s, cy - 12 * s);
        ctx.lineTo(cx, cy - 7 * s);
        ctx.lineTo(cx - 5 * s, cy - 12 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- Main wall battlements (7 merlons) ---
        ctx.fillStyle = '#5e5e6e';
        const bw = 5 * s, bh = 5 * s, gap = 2.5 * s;
        for (let i = -3; i <= 3; i++) {
            ctx.fillRect(cx + i * (bw + gap) - bw / 2, cy - 16 * s - bh, bw, bh);
        }

        // --- Central keep ---
        ctx.fillStyle = '#6a6a7a';
        ctx.fillRect(cx - 10 * s, cy - 28 * s, 20 * s, 14 * s);
        ctx.fillStyle = '#7a7a8a';
        ctx.fillRect(cx - 8 * s, cy - 26 * s, 16 * s, 10 * s);

        // Keep mini-battlements (3)
        ctx.fillStyle = '#5e5e6e';
        for (let i = -1; i <= 1; i++) {
            ctx.fillRect(cx + i * 7 * s - 2.5 * s, cy - 28 * s - 4 * s, 5 * s, 4 * s);
        }

        // Keep window
        ctx.fillStyle = '#e8c84a';
        ctx.fillRect(cx - 2 * s, cy - 24 * s, 4 * s, 5 * s);

        // --- Left round tower ---
        const ltx = cx - 22 * s; // tower center x
        ctx.fillStyle = '#626272';
        ctx.beginPath();
        ctx.moveTo(ltx - 8 * s, cy + 14 * s);
        ctx.lineTo(ltx - 8 * s, cy - 30 * s);
        ctx.arc(ltx, cy - 30 * s, 8 * s, Math.PI, 0);
        ctx.lineTo(ltx + 8 * s, cy + 14 * s);
        ctx.closePath();
        ctx.fill();
        // Tower highlight
        ctx.fillStyle = '#72727f';
        ctx.fillRect(ltx - 3 * s, cy - 28 * s, 6 * s, 40 * s);

        // Left conical roof
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(ltx, cy - 42 * s);
        ctx.lineTo(ltx - 10 * s, cy - 30 * s);
        ctx.lineTo(ltx + 10 * s, cy - 30 * s);
        ctx.closePath();
        ctx.fill();

        // Left tower arrow slits
        ctx.fillStyle = '#e8c84a';
        ctx.fillRect(ltx - 1.5 * s, cy - 18 * s, 3 * s, 6 * s);
        ctx.fillRect(ltx - 1.5 * s, cy - 6 * s, 3 * s, 6 * s);

        // Left flagpole + flag
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ltx, cy - 42 * s);
        ctx.lineTo(ltx, cy - 52 * s);
        ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(ltx, cy - 52 * s);
        ctx.lineTo(ltx + 10 * s, cy - 48 * s);
        ctx.lineTo(ltx, cy - 44 * s);
        ctx.closePath();
        ctx.fill();

        // --- Right round tower ---
        const rtx = cx + 22 * s;
        ctx.fillStyle = '#626272';
        ctx.beginPath();
        ctx.moveTo(rtx - 8 * s, cy + 14 * s);
        ctx.lineTo(rtx - 8 * s, cy - 30 * s);
        ctx.arc(rtx, cy - 30 * s, 8 * s, Math.PI, 0);
        ctx.lineTo(rtx + 8 * s, cy + 14 * s);
        ctx.closePath();
        ctx.fill();
        // Tower highlight
        ctx.fillStyle = '#72727f';
        ctx.fillRect(rtx - 3 * s, cy - 28 * s, 6 * s, 40 * s);

        // Right conical roof
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(rtx, cy - 42 * s);
        ctx.lineTo(rtx - 10 * s, cy - 30 * s);
        ctx.lineTo(rtx + 10 * s, cy - 30 * s);
        ctx.closePath();
        ctx.fill();

        // Right tower arrow slits
        ctx.fillStyle = '#e8c84a';
        ctx.fillRect(rtx - 1.5 * s, cy - 18 * s, 3 * s, 6 * s);
        ctx.fillRect(rtx - 1.5 * s, cy - 6 * s, 3 * s, 6 * s);

        // Right flagpole + flag
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rtx, cy - 42 * s);
        ctx.lineTo(rtx, cy - 52 * s);
        ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(rtx, cy - 52 * s);
        ctx.lineTo(rtx + 10 * s, cy - 48 * s);
        ctx.lineTo(rtx, cy - 44 * s);
        ctx.closePath();
        ctx.fill();

        // --- Torches flanking gate ---
        const torchY = cy - 4 * s;
        for (const tx of [cx - 13 * s, cx + 13 * s]) {
            // Torch bracket
            ctx.fillStyle = '#555';
            ctx.fillRect(tx - 1 * s, torchY, 2 * s, 5 * s);
            // Flame glow
            const grad = ctx.createRadialGradient(tx, torchY, 0, tx, torchY, 5 * s);
            grad.addColorStop(0, 'rgba(255,200,50,0.7)');
            grad.addColorStop(0.5, 'rgba(255,120,20,0.3)');
            grad.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(tx, torchY, 5 * s, 0, Math.PI * 2);
            ctx.fill();
            // Flame core
            ctx.fillStyle = '#ffe066';
            ctx.beginPath();
            ctx.arc(tx, torchY - 1 * s, 1.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSecondaryEntry(ctx) {
        const wp = this.layout.secondaryWaypoints[0];
        const cx = wp.x * CELL + CELL / 2;
        const cy = wp.y * CELL + CELL / 2;

        // Green arrow pointing left (into the map)
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(cx + 12, cy - 10);
        ctx.lineTo(cx - 8, cy);
        ctx.lineTo(cx + 12, cy + 10);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
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

    // ── Mini Castle (for multi-path maps) ─────────────────

    drawMiniCastle(ctx, cx, cy) {
        const s = 1.2; // smaller scale than main castle (2.2)

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(cx - 20 * s, cy + 10 * s, 40 * s, 3 * s);

        // Stone base
        ctx.fillStyle = '#4a4a5a';
        ctx.fillRect(cx - 18 * s, cy - 2 * s, 36 * s, 14 * s);

        // Main wall
        ctx.fillStyle = '#6e6e7e';
        ctx.fillRect(cx - 15 * s, cy - 12 * s, 30 * s, 22 * s);

        // Lighter front face
        ctx.fillStyle = '#7e7e8e';
        ctx.fillRect(cx - 13 * s, cy - 10 * s, 26 * s, 18 * s);

        // Stone texture lines
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            const ly = cy - 7 * s + i * 5 * s;
            ctx.beginPath();
            ctx.moveTo(cx - 12 * s, ly);
            ctx.lineTo(cx + 12 * s, ly);
            ctx.stroke();
        }

        // Gate (dark arch)
        ctx.fillStyle = '#1a1a2a';
        ctx.beginPath();
        ctx.moveTo(cx - 6 * s, cy + 10 * s);
        ctx.lineTo(cx - 6 * s, cy - 1 * s);
        ctx.arc(cx, cy - 1 * s, 6 * s, Math.PI, 0);
        ctx.lineTo(cx + 6 * s, cy + 10 * s);
        ctx.closePath();
        ctx.fill();

        // Portcullis bars
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 3 * s, cy - 1 * s);
            ctx.lineTo(cx + i * 3 * s, cy + 10 * s);
            ctx.stroke();
        }

        // Battlements (5 merlons)
        ctx.fillStyle = '#5e5e6e';
        const bw = 3.5 * s, bh = 3.5 * s, gap = 1.5 * s;
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(cx + i * (bw + gap) - bw / 2, cy - 12 * s - bh, bw, bh);
        }

        // Central tower
        ctx.fillStyle = '#626272';
        ctx.beginPath();
        ctx.moveTo(cx - 5 * s, cy + 10 * s);
        ctx.lineTo(cx - 5 * s, cy - 22 * s);
        ctx.arc(cx, cy - 22 * s, 5 * s, Math.PI, 0);
        ctx.lineTo(cx + 5 * s, cy + 10 * s);
        ctx.closePath();
        ctx.fill();

        // Tower highlight
        ctx.fillStyle = '#72727f';
        ctx.fillRect(cx - 2 * s, cy - 20 * s, 4 * s, 28 * s);

        // Conical roof
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32 * s);
        ctx.lineTo(cx - 7 * s, cy - 22 * s);
        ctx.lineTo(cx + 7 * s, cy - 22 * s);
        ctx.closePath();
        ctx.fill();

        // Arrow slit
        ctx.fillStyle = '#e8c84a';
        ctx.fillRect(cx - 1 * s, cy - 14 * s, 2 * s, 4 * s);

        // Flag
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32 * s);
        ctx.lineTo(cx, cy - 38 * s);
        ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 38 * s);
        ctx.lineTo(cx + 7 * s, cy - 35 * s);
        ctx.lineTo(cx, cy - 32 * s);
        ctx.closePath();
        ctx.fill();
    }

    drawEntryMarker(ctx, wp) {
        const cx = wp.x * CELL + CELL / 2;
        const cy = wp.y * CELL + CELL / 2;

        // Determine arrow direction based on which edge the entry is on
        let dx = 0, dy = 0;
        if (wp.x === 0) dx = 1;       // left edge → points right
        else if (wp.x >= COLS - 1) dx = -1; // right edge → points left
        else if (wp.y === 0) dy = 1;   // top edge → points down
        else if (wp.y >= ROWS - 1) dy = -1; // bottom edge → points up

        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        if (dx !== 0) {
            // Horizontal arrow
            ctx.moveTo(cx - dx * 8, cy - 10);
            ctx.lineTo(cx + dx * 12, cy);
            ctx.lineTo(cx - dx * 8, cy + 10);
        } else {
            // Vertical arrow
            ctx.moveTo(cx - 10, cy - dy * 8);
            ctx.lineTo(cx, cy + dy * 12);
            ctx.lineTo(cx + 10, cy - dy * 8);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // ── Ruins environment cells ─────────────────────────────

    drawRuinsCell(ctx, px, py, gx, gy) {
        // Gray stone ground with subtle moss
        const shade = seedRand(gx, gy, 0);
        const r = Math.floor(120 + shade * 20 - 10);
        const g = Math.floor(125 + shade * 20 - 10);
        const b = Math.floor(115 + shade * 15 - 7);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Stone tile lines
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.5;
        const midX = px + CELL * (0.4 + seedRand(gx, gy, 1) * 0.2);
        const midY = py + CELL * (0.4 + seedRand(gx, gy, 2) * 0.2);
        ctx.beginPath();
        ctx.moveTo(midX, py);
        ctx.lineTo(midX, py + CELL);
        ctx.moveTo(px, midY);
        ctx.lineTo(px + CELL, midY);
        ctx.stroke();

        // Moss patches
        if (seedRand(gx, gy, 3) > 0.6) {
            const mx = px + seedRand(gx, gy, 4) * (CELL - 8) + 4;
            const my = py + seedRand(gx, gy, 5) * (CELL - 8) + 4;
            ctx.fillStyle = `rgba(80,130,70,${0.15 + seedRand(gx, gy, 6) * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(mx, my, 3 + seedRand(gx, gy, 7) * 4, 2 + seedRand(gx, gy, 8) * 3,
                seedRand(gx, gy, 9) * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawRuinsPathCell(ctx, px, py, gx, gy) {
        // Worn cobblestone path — warm gray
        const shade = seedRand(gx, gy, 0);
        const v = Math.floor(155 + shade * 15 - 7);
        ctx.fillStyle = `rgb(${v},${v - 5},${v - 10})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Cobblestone pattern
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        const stoneCount = 3 + Math.floor(seedRand(gx, gy, 1) * 3);
        for (let i = 0; i < stoneCount; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * (CELL - 6) + 3;
            const sy = py + seedRand(gx, gy, 20 + i) * (CELL - 6) + 3;
            const sw = 6 + seedRand(gx, gy, 30 + i) * 8;
            const sh = 4 + seedRand(gx, gy, 40 + i) * 6;
            ctx.strokeRect(sx, sy, sw, sh);
        }

        // Edge borders
        const edgeW = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW);
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL);
    }

    drawRuinsObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Crumbled stone pillar
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 10, 8, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(cx - 5, cy - 4, 10, 16);

            // Broken top
            ctx.fillStyle = '#9a9a9a';
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - 4);
            ctx.lineTo(cx - 3, cy - 9);
            ctx.lineTo(cx + 2, cy - 7);
            ctx.lineTo(cx + 5, cy - 4);
            ctx.closePath();
            ctx.fill();

            // Cracks
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx - 2, cy - 3);
            ctx.lineTo(cx, cy + 4);
            ctx.lineTo(cx + 2, cy + 8);
            ctx.stroke();

            // Moss at base
            ctx.fillStyle = 'rgba(70,120,60,0.3)';
            ctx.beginPath();
            ctx.ellipse(cx - 3, cy + 8, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Ruined wall fragment
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 10, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#7a7a7a';
            const wallH = 8 + seedRand(gx, gy, 0) * 6;
            ctx.fillRect(cx - 8, cy + 2 - wallH, 16, wallH);

            // Broken top edge (irregular)
            ctx.fillStyle = '#8a8a8a';
            for (let i = 0; i < 4; i++) {
                const bx = cx - 7 + i * 4;
                const bh = 2 + seedRand(gx, gy, 10 + i) * 4;
                ctx.fillRect(bx, cy + 2 - wallH - bh, 3, bh);
            }

            // Stone lines
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 2; i++) {
                const ly = cy + 2 - wallH + (i + 1) * (wallH / 3);
                ctx.beginPath();
                ctx.moveTo(cx - 7, ly);
                ctx.lineTo(cx + 7, ly);
                ctx.stroke();
            }

            // Ivy/moss on wall
            ctx.fillStyle = 'rgba(60,110,50,0.25)';
            ctx.beginPath();
            ctx.ellipse(cx + 4, cy - 2, 3, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Sky environment cells ─────────────────────────────

    drawSkyCell(ctx, px, py, gx, gy) {
        // Light blue-white sky ground with cloud wisps
        const shade = seedRand(gx, gy, 0);
        const r = Math.floor(200 + shade * 20 - 10);
        const g = Math.floor(215 + shade * 15 - 7);
        const b = Math.floor(235 + shade * 10 - 5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Wispy cloud streaks
        const streakCount = 1 + Math.floor(seedRand(gx, gy, 1) * 3);
        for (let i = 0; i < streakCount; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * CELL;
            const sy = py + seedRand(gx, gy, 20 + i) * CELL;
            const sw = 8 + seedRand(gx, gy, 30 + i) * 12;
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, sw, 2 + seedRand(gx, gy, 40 + i) * 3, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Occasional sparkle
        if (seedRand(gx, gy, 50) > 0.75) {
            const sx = px + seedRand(gx, gy, 51) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 52) * (CELL - 4) + 2;
            ctx.fillStyle = 'rgba(255,215,100,0.25)';
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSkyPathCell(ctx, px, py, gx, gy) {
        // Golden/amber stone pathway
        ctx.fillStyle = '#c4a44a';
        ctx.fillRect(px, py, CELL, CELL);

        // Ornamental stone lines
        const lineCount = 2 + Math.floor(seedRand(gx, gy, 0) * 2);
        ctx.strokeStyle = 'rgba(180,140,50,0.3)';
        ctx.lineWidth = 0.7;
        for (let i = 0; i < lineCount; i++) {
            const sx = px + seedRand(gx, gy, 60 + i) * CELL;
            const sy = py + seedRand(gx, gy, 70 + i) * CELL;
            const ex = sx + (seedRand(gx, gy, 80 + i) - 0.5) * 16;
            const ey = sy + (seedRand(gx, gy, 90 + i) - 0.5) * 16;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Subtle highlight edge
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(px, py, CELL, 2);

        // Edge borders
        const edgeW = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW);
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL);
    }

    drawSkyObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Cloud pillar — white/silver floating column
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 12, 8, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pillar body
            const pillarH = 14 + seedRand(gx, gy, 0) * 6;
            ctx.fillStyle = '#d0dce8';
            ctx.fillRect(cx - 5, cy + 2 - pillarH, 10, pillarH);

            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(cx - 4, cy + 2 - pillarH, 3, pillarH);

            // Cloud cap
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2 - pillarH, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Floating stone arch
            ctx.fillStyle = 'rgba(0,0,0,0.06)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 11, 10, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Two pillars
            const pH = 10 + seedRand(gx, gy, 0) * 4;
            ctx.fillStyle = '#a0b0c0';
            ctx.fillRect(cx - 9, cy + 2 - pH, 5, pH);
            ctx.fillRect(cx + 4, cy + 2 - pH, 5, pH);

            // Arch top
            ctx.strokeStyle = '#a0b0c0';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy + 2 - pH, 6.5, Math.PI, 0);
            ctx.stroke();

            // Gold accent on arch
            ctx.strokeStyle = 'rgba(200,170,70,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy + 2 - pH, 5, Math.PI, 0);
            ctx.stroke();
        }
    }

    // ── Spawn Marker (center spawn maps) ────────────────────

    drawSpawnMarker(ctx, wp) {
        const cx = wp.x * CELL + CELL / 2;
        const cy = wp.y * CELL + CELL / 2;
        const r = CELL * 0.7;

        // Purple radial glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, 'rgba(120,60,200,0.6)');
        grad.addColorStop(0.5, 'rgba(100,40,180,0.25)');
        grad.addColorStop(1, 'rgba(80,20,160,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Red center dot
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        // 4 directional lines pointing outward
        ctx.strokeStyle = 'rgba(180,100,255,0.5)';
        ctx.lineWidth = 2;
        const lineLen = CELL * 0.5;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            ctx.beginPath();
            ctx.moveTo(cx + dx * 8, cy + dy * 8);
            ctx.lineTo(cx + dx * lineLen, cy + dy * lineLen);
            ctx.stroke();
        }
    }

    // ── Void environment cells ──────────────────────────────

    drawVoidCell(ctx, px, py, gx, gy) {
        // Dark purple ground with energy vein patterns
        const shade = seedRand(gx, gy, 0);
        const r = Math.floor(25 + shade * 12 - 6);
        const g = Math.floor(15 + shade * 8 - 4);
        const b = Math.floor(45 + shade * 15 - 7);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Faint energy veins
        const veinCount = 1 + Math.floor(seedRand(gx, gy, 1) * 2);
        for (let i = 0; i < veinCount; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * CELL;
            const sy = py + seedRand(gx, gy, 20 + i) * CELL;
            const ex = sx + (seedRand(gx, gy, 30 + i) - 0.5) * 18;
            const ey = sy + (seedRand(gx, gy, 40 + i) - 0.5) * 18;
            ctx.strokeStyle = `rgba(140,80,220,${0.06 + seedRand(gx, gy, 50 + i) * 0.08})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        // Occasional dim glow spot
        if (seedRand(gx, gy, 60) > 0.8) {
            const gx2 = px + seedRand(gx, gy, 61) * (CELL - 8) + 4;
            const gy2 = py + seedRand(gx, gy, 62) * (CELL - 8) + 4;
            ctx.fillStyle = 'rgba(100,50,180,0.08)';
            ctx.beginPath();
            ctx.arc(gx2, gy2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawVoidPathCell(ctx, px, py, gx, gy) {
        // Dark slate with purple-glow edge borders
        const shade = seedRand(gx, gy, 0);
        const v = Math.floor(35 + shade * 10);
        ctx.fillStyle = `rgb(${v + 7},${v},${v + 13})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Subtle texture speckles
        const count = 2 + Math.floor(seedRand(gx, gy, 1) * 3);
        for (let i = 0; i < count; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 20 + i) * (CELL - 4) + 2;
            ctx.fillStyle = seedRand(gx, gy, 30 + i) > 0.5
                ? 'rgba(160,100,255,0.06)' : 'rgba(0,0,0,0.06)';
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Purple-glow edge borders
        const edgeW = 3;
        ctx.fillStyle = 'rgba(120,60,200,0.2)';
        if (!this.isPath(gx, gy - 1)) ctx.fillRect(px, py, CELL, edgeW);
        if (!this.isPath(gx, gy + 1)) ctx.fillRect(px, py + CELL - edgeW, CELL, edgeW);
        if (!this.isPath(gx - 1, gy)) ctx.fillRect(px, py, edgeW, CELL);
        if (!this.isPath(gx + 1, gy)) ctx.fillRect(px + CELL - edgeW, py, edgeW, CELL);
    }

    drawVoidObstacle(ctx, px, py, gx, gy) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const seed = gx + gy;

        if (seed % 2 === 0) {
            // Dark crystal shard — tall angular spike
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.beginPath();
            ctx.ellipse(cx + 1, cy + 10, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2a1a40';
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy + 8);
            ctx.lineTo(cx - 2, cy - 10);
            ctx.lineTo(cx + 1, cy - 7);
            ctx.lineTo(cx + 4, cy + 8);
            ctx.closePath();
            ctx.fill();

            // Highlight edge
            ctx.fillStyle = 'rgba(160,100,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(cx - 2, cy - 10);
            ctx.lineTo(cx + 1, cy - 7);
            ctx.lineTo(cx + 2, cy + 4);
            ctx.lineTo(cx - 1, cy + 4);
            ctx.closePath();
            ctx.fill();

            // Glowing tip
            ctx.fillStyle = 'rgba(180,120,255,0.4)';
            ctx.beginPath();
            ctx.arc(cx - 1, cy - 9, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Energy pylon — short pillar with glowing top
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 9, 7, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pillar body
            ctx.fillStyle = '#1e1030';
            ctx.fillRect(cx - 4, cy - 4, 8, 14);
            ctx.fillStyle = '#2a1a42';
            ctx.fillRect(cx - 3, cy - 3, 6, 12);

            // Glowing top
            const grad = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy - 5, 5);
            grad.addColorStop(0, 'rgba(180,120,255,0.5)');
            grad.addColorStop(0.5, 'rgba(140,80,220,0.2)');
            grad.addColorStop(1, 'rgba(100,40,180,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // Core glow
            ctx.fillStyle = '#c090ff';
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Atmosphere override cells ──────────────────────────

    _drawAtmoGround(ctx, px, py, gx, gy, co) {
        const g = co.ground;
        const shade = seedRand(gx, gy, 0);
        const v = g.variance || 0;
        const r = Math.floor(g.base[0] + shade * v * 2 - v);
        const gr = Math.floor(g.base[1] + shade * v * 2 - v);
        const b = Math.floor(g.base[2] + shade * v * 2 - v);
        ctx.fillStyle = `rgb(${r},${gr},${b})`;
        ctx.fillRect(px, py, CELL, CELL);

        // Subtle texture speckles
        const count = 2 + Math.floor(seedRand(gx, gy, 1) * 3);
        for (let i = 0; i < count; i++) {
            const sx = px + seedRand(gx, gy, 10 + i) * (CELL - 4) + 2;
            const sy = py + seedRand(gx, gy, 20 + i) * (CELL - 4) + 2;
            ctx.fillStyle = seedRand(gx, gy, 30 + i) > 0.5
                ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
    }

    _drawAtmoObstacle(ctx, px, py, gx, gy, co) {
        const cx = px + CELL / 2;
        const cy = py + CELL / 2;
        const baseRadius = 9;
        ctx.fillStyle = co.obstacle.tint;
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
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        const r0 = baseRadius * (0.7 + seedRand(gx, gy, 0) * 0.5);
        const r1 = baseRadius * (0.7 + seedRand(gx, gy, 1) * 0.5);
        ctx.moveTo(cx, cy + 2);
        ctx.lineTo(cx + r0, cy + 2);
        ctx.lineTo(cx + Math.cos(Math.PI * 2 / 6) * r1, cy + 2 + Math.sin(Math.PI * 2 / 6) * r1 * 0.75);
        ctx.closePath();
        ctx.fill();
    }
}
