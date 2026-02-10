import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS, TOWER_TYPES, TARGET_MODES } from './constants.js';

export class Renderer {
    constructor(canvases, game) {
        this.game = game;
        this.terrainCtx = canvases.terrain.getContext('2d');
        this.gameCtx = canvases.game.getContext('2d');
        this.uiCtx = canvases.ui.getContext('2d');

        // Set canvas sizes
        for (const c of [canvases.terrain, canvases.game, canvases.ui]) {
            c.width = CANVAS_W;
            c.height = CANVAS_H;
        }
    }

    drawTerrain() {
        this.game.map.drawTerrain(this.terrainCtx);
        // Draw tower bases on terrain layer
        for (const tower of this.game.towers.towers) {
            this.drawTowerBase(this.terrainCtx, tower);
        }
    }

    drawTowerBase(ctx, tower) {
        const x = tower.gx * CELL;
        const y = tower.gy * CELL;
        const cx = x + CELL / 2;
        const cy = y + CELL / 2;

        const maxed = tower.level >= 2;
        const accentColors = {
            arrow: '#4a7c3f',
            cannon: '#8b5e3c',
            frost: '#5b9bd5',
            lightning: '#9b59b6',
            sniper: '#c0392b',
        };
        const maxedAccentColors = {
            arrow: '#7fff00',
            cannon: '#ff8c00',
            frost: '#00e5ff',
            lightning: '#e040fb',
            sniper: '#ff1744',
        };
        const accent = maxed ? (maxedAccentColors[tower.type] || '#ffd700') : (accentColors[tower.type] || '#888');

        // Outer platform with beveled edges
        ctx.fillStyle = maxed ? '#5a5a3a' : '#4a4a4a';
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        // Top/left highlight
        ctx.fillStyle = maxed ? '#808050' : '#606060';
        ctx.fillRect(x + 1, y + 1, CELL - 2, 2);
        ctx.fillRect(x + 1, y + 1, 2, CELL - 2);
        // Bottom/right shadow
        ctx.fillStyle = maxed ? '#3a3a20' : '#333';
        ctx.fillRect(x + 1, y + CELL - 3, CELL - 2, 2);
        ctx.fillRect(x + CELL - 3, y + 1, 2, CELL - 2);
        // Inner platform — brighter for higher levels, golden tint for maxed
        if (maxed) {
            ctx.fillStyle = '#c0a850';
        } else {
            const lvlBright = tower.level * 12;
            ctx.fillStyle = `rgb(${88 + lvlBright},${88 + lvlBright},${88 + lvlBright})`;
        }
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);

        // Color accent ring — thicker and brighter for upgrades
        const ringWidth = maxed ? 5 : 2 + tower.level;
        ctx.strokeStyle = accent;
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        if (tower.level > 0) {
            ctx.strokeStyle = maxed ? '#fff' : '#ffd700';
            ctx.lineWidth = maxed ? 1.5 : 1;
            ctx.beginPath();
            ctx.arc(cx, cy, 14 - ringWidth, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Corner bolt details — gold for upgraded, bright white for maxed
        const boltOffset = 6;
        const corners = [
            [x + boltOffset, y + boltOffset],
            [x + CELL - boltOffset, y + boltOffset],
            [x + boltOffset, y + CELL - boltOffset],
            [x + CELL - boltOffset, y + CELL - boltOffset],
        ];
        const boltColor = maxed ? '#fff' : tower.level > 0 ? '#ffd700' : '#777';
        const boltHighlight = maxed ? '#ffffcc' : tower.level > 0 ? '#ffe566' : '#999';
        for (const [bx, by] of corners) {
            ctx.fillStyle = boltColor;
            ctx.beginPath();
            ctx.arc(bx, by, maxed ? 3 : 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = boltHighlight;
            ctx.beginPath();
            ctx.arc(bx - 0.5, by - 0.5, maxed ? 1.8 : 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Level stars on base — bigger, with glow
        if (tower.level > 0) {
            // Star glow background
            ctx.fillStyle = maxed ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.25)';
            ctx.beginPath();
            ctx.arc(cx, cy + 15, tower.level * 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = maxed ? '#fff' : '#ffd700';
            for (let i = 0; i < tower.level; i++) {
                const sx = cx - (tower.level - 1) * 6 + i * 12;
                const sy = cy + 15;
                this.drawMiniStar(ctx, sx, sy, maxed ? 5 : 4);
                // Star highlight
                ctx.fillStyle = maxed ? '#fffff0' : '#fff8dc';
                this.drawMiniStar(ctx, sx - 0.5, sy - 0.5, maxed ? 2.5 : 2);
                ctx.fillStyle = maxed ? '#fff' : '#ffd700';
            }
        }
    }

    drawMiniStar(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            const ia = a + Math.PI / 5;
            ctx.lineTo(x + Math.cos(ia) * r * 0.4, y + Math.sin(ia) * r * 0.4);
        }
        ctx.closePath();
        ctx.fill();
    }

    drawFrame(interpolation) {
        const ctx = this.gameCtx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Apply screen shake
        const shakeX = this.game.shakeOffsetX;
        const shakeY = this.game.shakeOffsetY;
        if (shakeX !== 0 || shakeY !== 0) {
            ctx.save();
            ctx.translate(shakeX, shakeY);
        }

        // Draw enemies
        this.drawEnemies(ctx);

        // Draw tower turrets (rotatable part)
        this.drawTowerTurrets(ctx);

        // Draw projectiles
        this.drawProjectiles(ctx);

        // Draw particles
        this.game.particles.draw(ctx);

        // Restore screen shake
        if (shakeX !== 0 || shakeY !== 0) {
            ctx.restore();
        }

        // Draw UI overlay
        this.drawUIOverlay();
    }

    // ── Enemy Shape Helpers ──────────────────────────────────

    drawPentagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawDiamond(ctx, x, y, r) {
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.2);
        ctx.lineTo(x + r * 0.7, y);
        ctx.lineTo(x, y + r * 1.2);
        ctx.lineTo(x - r * 0.7, y);
        ctx.closePath();
    }

    drawRoundedSquare(ctx, x, y, r) {
        const s = r * 0.85;
        const cr = r * 0.25;
        ctx.beginPath();
        ctx.moveTo(x - s + cr, y - s);
        ctx.lineTo(x + s - cr, y - s);
        ctx.quadraticCurveTo(x + s, y - s, x + s, y - s + cr);
        ctx.lineTo(x + s, y + s - cr);
        ctx.quadraticCurveTo(x + s, y + s, x + s - cr, y + s);
        ctx.lineTo(x - s + cr, y + s);
        ctx.quadraticCurveTo(x - s, y + s, x - s, y + s - cr);
        ctx.lineTo(x - s, y - s + cr);
        ctx.quadraticCurveTo(x - s, y - s, x - s + cr, y - s);
        ctx.closePath();
    }

    drawCross(ctx, x, y, r) {
        const w = r * 0.4;
        ctx.beginPath();
        ctx.moveTo(x - w, y - r);
        ctx.lineTo(x + w, y - r);
        ctx.lineTo(x + w, y - w);
        ctx.lineTo(x + r, y - w);
        ctx.lineTo(x + r, y + w);
        ctx.lineTo(x + w, y + w);
        ctx.lineTo(x + w, y + r);
        ctx.lineTo(x - w, y + r);
        ctx.lineTo(x - w, y + w);
        ctx.lineTo(x - r, y + w);
        ctx.lineTo(x - r, y - w);
        ctx.lineTo(x - w, y - w);
        ctx.closePath();
    }

    drawHexagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawTriangle(ctx, x, y, r, angle) {
        ctx.beginPath();
        // Point in movement direction
        ctx.moveTo(x + Math.cos(angle) * r * 1.2, y + Math.sin(angle) * r * 1.2);
        ctx.lineTo(x + Math.cos(angle + 2.4) * r, y + Math.sin(angle + 2.4) * r);
        ctx.lineTo(x + Math.cos(angle - 2.4) * r, y + Math.sin(angle - 2.4) * r);
        ctx.closePath();
    }

    drawEnemyShape(ctx, e, x, y, r) {
        switch (e.type) {
            case 'grunt':
                this.drawPentagon(ctx, x, y, r);
                break;
            case 'runner':
                this.drawDiamond(ctx, x, y, r);
                break;
            case 'tank':
                this.drawRoundedSquare(ctx, x, y, r);
                break;
            case 'healer':
                this.drawCross(ctx, x, y, r);
                break;
            case 'boss':
                this.drawHexagon(ctx, x, y, r);
                break;
            case 'swarm':
                this.drawTriangle(ctx, x, y, r, e.angle);
                break;
            default:
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                break;
        }
    }

    drawEnemies(ctx) {
        for (const e of this.game.enemies.enemies) {
            // Skip enemies that reached the end
            if (e.reached) continue;

            const isDying = e.deathTimer >= 0;

            // Death animation: scale down + fade
            let scale = 1;
            let alpha = 1;
            if (isDying) {
                const t = Math.min(e.deathTimer / 0.35, 1);
                scale = 1 - t;
                alpha = 1 - t;
                if (scale <= 0) continue;
            }

            // Walk bob
            const bob = e.alive && !isDying ? Math.sin(e.walkPhase) * 1.5 : 0;
            const drawX = e.x;
            const drawY = e.y + bob;
            const r = e.radius * scale;

            ctx.globalAlpha = alpha;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(drawX + 2, e.y + 2 + e.radius * 0.3, r, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Boss glow ring
            if (e.type === 'boss' && !isDying) {
                ctx.strokeStyle = 'rgba(255,215,0,0.2)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Body shape
            ctx.fillStyle = e.color;
            this.drawEnemyShape(ctx, e, drawX, drawY, r);
            ctx.fill();

            // Type-specific overlays
            if (e.type === 'tank' && !isDying) {
                // Armor cross-hatch
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 0.7;
                const s = r * 0.5;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(drawX - s, drawY + i * s * 0.7);
                    ctx.lineTo(drawX + s, drawY + i * s * 0.7);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(drawX + i * s * 0.7, drawY - s);
                    ctx.lineTo(drawX + i * s * 0.7, drawY + s);
                    ctx.stroke();
                }
            } else if (e.type === 'healer' && !isDying) {
                // White inner cross
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                const cw = r * 0.25;
                const ch = r * 0.6;
                ctx.fillRect(drawX - cw, drawY - ch, cw * 2, ch * 2);
                ctx.fillRect(drawX - ch, drawY - cw, ch * 2, cw * 2);
            } else if (e.type === 'boss' && !isDying) {
                // Crown motif — three gold triangles on top
                ctx.fillStyle = '#ffd700';
                const crownY = drawY - r * 0.6;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(drawX + i * r * 0.35, crownY - 4);
                    ctx.lineTo(drawX + i * r * 0.35 - 2, crownY + 2);
                    ctx.lineTo(drawX + i * r * 0.35 + 2, crownY + 2);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (e.type === 'runner' && !isDying) {
                // Speed lines behind
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 0.8;
                const backAngle = e.angle + Math.PI;
                for (let i = -1; i <= 1; i++) {
                    const off = i * 3;
                    const sx = drawX + Math.cos(backAngle) * r * 0.8;
                    const sy = drawY + Math.sin(backAngle) * r * 0.8 + off;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx + Math.cos(backAngle) * 5, sy + Math.sin(backAngle) * 5);
                    ctx.stroke();
                }
            }

            // Damage flash overlay
            if (e.damageFlashTimer > 0 && !isDying) {
                ctx.fillStyle = `rgba(255,255,255,${e.damageFlashTimer / 0.1 * 0.6})`;
                this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.fill();
            }

            // Healer glow
            if (e.healRate > 0 && !isDying) {
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, e.healRadius * CELL, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Slow effect indicator
            if (e.slowTimer > 0 && !isDying) {
                ctx.strokeStyle = 'rgba(91, 155, 213, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Health bar (skip for dying enemies)
            if (!isDying && e.alive) {
                const barW = e.radius * 2.5;
                const barH = 3;
                const barX = drawX - barW / 2;
                const barY = drawY - e.radius - 8;
                const hpPct = e.hp / e.maxHP;
                const displayPct = e.displayHP / e.maxHP;

                // Background
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);

                // Orange trailing bar (recent damage)
                if (displayPct > hpPct) {
                    ctx.fillStyle = '#e67e22';
                    ctx.fillRect(barX, barY, barW * displayPct, barH);
                }

                // Current HP bar
                ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c';
                ctx.fillRect(barX, barY, barW * hpPct, barH);

                // Border outline
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(barX, barY, barW, barH);
            }

            ctx.globalAlpha = 1;
        }
    }

    drawTowerTurrets(ctx) {
        for (const tower of this.game.towers.towers) {
            const cx = tower.x;
            const cy = tower.y;

            // Upgrade glow — animated, scales with level
            if (tower.level > 0) {
                const maxed = tower.level >= 2;
                const glowPulse = maxed
                    ? 0.25 + Math.sin(tower.glowPhase * 2) * 0.12
                    : 0.12 + Math.sin(tower.glowPhase * 1.5) * 0.06;
                const glowRadius = maxed ? 28 : 18 + tower.level * 4;

                // Outer glow ring — type-colored for maxed
                const maxedGlowColors = {
                    arrow: '127,255,0',
                    cannon: '255,140,0',
                    frost: '0,229,255',
                    lightning: '224,64,251',
                    sniper: '255,23,68',
                };
                const glowRGB = maxed ? (maxedGlowColors[tower.type] || '255,215,0') : '255,215,0';

                ctx.strokeStyle = `rgba(${glowRGB},${glowPulse * (maxed ? 1.0 : 0.7)})`;
                ctx.lineWidth = maxed ? 3 : 1 + tower.level * 0.5;
                ctx.beginPath();
                ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Soft radial glow
                ctx.fillStyle = `rgba(${glowRGB},${glowPulse * (maxed ? 0.5 : 0.3)})`;
                ctx.beginPath();
                ctx.arc(cx, cy, glowRadius - 2, 0, Math.PI * 2);
                ctx.fill();

                // Rotating sparkle dots for level 2 — more and brighter when maxed
                if (tower.level >= 2) {
                    const sparkleCount = 6;
                    ctx.fillStyle = `rgba(255,255,220,${0.5 + Math.sin(tower.glowPhase * 2.5) * 0.3})`;
                    for (let i = 0; i < sparkleCount; i++) {
                        const a = tower.spinPhase * 0.8 + (Math.PI * 2 * i) / sparkleCount;
                        const sr = glowRadius - 1;
                        ctx.beginPath();
                        ctx.arc(cx + Math.cos(a) * sr, cy + Math.sin(a) * sr, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Per-type ambient effects (drawn behind turret, world-space)
            this.drawTowerAmbient(ctx, tower, cx, cy);

            // Recoil offset
            const recoilAmount = tower.recoilTimer > 0 ? (tower.recoilTimer / 0.12) * 5 : 0;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tower.turretAngle);

            const recoilShift = -recoilAmount;

            switch (tower.type) {
                case 'arrow':
                    this.drawArrowTurret(ctx, recoilShift, tower);
                    break;
                case 'cannon':
                    this.drawCannonTurret(ctx, recoilShift, tower);
                    break;
                case 'frost':
                    this.drawFrostTurret(ctx, recoilShift, tower);
                    break;
                case 'lightning':
                    this.drawLightningTurret(ctx, recoilShift, tower);
                    break;
                case 'sniper':
                    this.drawSniperTurret(ctx, recoilShift, tower);
                    break;
                default:
                    ctx.fillStyle = tower.color;
                    ctx.fillRect(-6, -4, 12, 8);
                    ctx.fillRect(4 + recoilShift, -2, 10, 4);
                    break;
            }

            ctx.restore();

            // Target mode label below tower
            const mode = TARGET_MODES[tower.targetMode];
            const modeColors = { First: '#3498db', Closest: '#2ecc71', Strongest: '#e74c3c', Weakest: '#f39c12' };
            const modeShort = { First: 'FST', Closest: 'CLS', Strongest: 'STR', Weakest: 'WK' };
            const modeColor = modeColors[mode] || '#aaa';

            // Background pill
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            const label = modeShort[mode] || mode;
            ctx.font = 'bold 9px monospace';
            const tw = ctx.measureText(label).width;
            const pillW = tw + 6;
            const pillH = 12;
            const pillX = cx - pillW / 2;
            const pillY = cy - CELL / 2 - pillH - 1;
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, 3);
            ctx.fill();

            // Label text
            ctx.fillStyle = modeColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, cx, pillY + pillH / 2);
        }
    }

    drawTowerAmbient(ctx, tower, cx, cy) {
        const sp = tower.spinPhase;
        const gp = tower.glowPhase;

        if (tower.type === 'frost') {
            // Frost: pulsing icy aura with rotating snowflake particles
            const pulse = 0.08 + Math.sin(gp) * 0.05;
            ctx.fillStyle = `rgba(91,155,213,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting ice crystals
            ctx.fillStyle = 'rgba(170,221,255,0.4)';
            for (let i = 0; i < 3; i++) {
                const a = sp * 0.8 + (Math.PI * 2 * i) / 3;
                const r = 14 + Math.sin(gp + i) * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(sp * 2 + i);
                ctx.fillRect(-1.5, -1.5, 3, 3);
                ctx.restore();
            }
        } else if (tower.type === 'lightning') {
            // Lightning: pulsing electric aura + crawling arcs
            const pulse = 0.07 + Math.sin(gp * 1.5) * 0.05;
            ctx.fillStyle = `rgba(155,89,182,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fill();

            // Sparking arcs around tower
            ctx.strokeStyle = `rgba(224,176,255,${0.3 + Math.sin(gp * 3) * 0.2})`;
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 3; i++) {
                const a = sp + (Math.PI * 2 * i) / 3;
                const r = 13;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
                const jx = (Math.random() - 0.5) * 5;
                const jy = (Math.random() - 0.5) * 5;
                ctx.lineTo(cx + Math.cos(a) * r + jx, cy + Math.sin(a) * r + jy);
                ctx.stroke();
            }
        } else if (tower.type === 'sniper') {
            // Sniper: laser sight line when targeting
            if (tower.target && tower.target.alive) {
                ctx.strokeStyle = 'rgba(255,50,50,0.15)';
                ctx.lineWidth = 0.5;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(tower.target.x, tower.target.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Target dot on enemy
                ctx.fillStyle = 'rgba(255,50,50,0.4)';
                ctx.beginPath();
                ctx.arc(tower.target.x, tower.target.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tower.type === 'cannon') {
            // Cannon: heat shimmer when recently fired
            if (tower.recoilTimer > 0) {
                const heat = tower.recoilTimer / 0.12;
                ctx.fillStyle = `rgba(255,150,50,${heat * 0.12})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 16, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tower.type === 'arrow') {
            // Arrow: subtle wind indicator when idle
            if (tower.idleTime > 1) {
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 2; i++) {
                    const y = cy - 6 + i * 12;
                    const wave = Math.sin(sp + i * 2) * 4;
                    ctx.beginPath();
                    ctx.moveTo(cx - 8, y);
                    ctx.quadraticCurveTo(cx + wave, y - 2, cx + 8, y);
                    ctx.stroke();
                }
            }
        }
    }

    drawArrowTurret(ctx, recoil, tower) {
        // Crossbow body — wooden frame
        ctx.fillStyle = '#5a4a32';
        ctx.fillRect(-6, -5, 12, 10);
        ctx.fillStyle = '#4a7c3f';
        ctx.fillRect(-5, -4, 10, 8);

        // Crossbow arms with tension string
        ctx.strokeStyle = '#3a6030';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 9, -1.3, -0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0.2, 1.3);
        ctx.stroke();

        // Bowstring
        const stringTension = tower.recoilTimer > 0 ? 1 : 3;
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(-1.3) * 9, Math.sin(-1.3) * 9);
        ctx.quadraticCurveTo(-stringTension, 0, Math.cos(1.3) * 9, Math.sin(1.3) * 9);
        ctx.stroke();

        // Bolt rail
        ctx.fillStyle = '#6a9c5f';
        ctx.fillRect(3 + recoil, -1.5, 11, 3);

        // Metal tip
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(15 + recoil, 0);
        ctx.lineTo(11 + recoil, -3);
        ctx.lineTo(11 + recoil, 3);
        ctx.closePath();
        ctx.fill();
        // Tip edge highlight
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(15 + recoil, 0);
        ctx.lineTo(11 + recoil, -3);
        ctx.stroke();

        // Center mechanism
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCannonTurret(ctx, recoil, tower) {
        // Reinforced body with armor plates
        ctx.fillStyle = '#6a4828';
        ctx.fillRect(-8, -6, 14, 12);
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(-7, -5, 12, 10);

        // Barrel — tapered, thick
        ctx.fillStyle = '#5a3e1c';
        ctx.beginPath();
        ctx.moveTo(3 + recoil, -5);
        ctx.lineTo(14 + recoil, -3.5);
        ctx.lineTo(14 + recoil, 3.5);
        ctx.lineTo(3 + recoil, 5);
        ctx.closePath();
        ctx.fill();

        // Barrel highlight stripe
        ctx.fillStyle = '#7a5e3c';
        ctx.fillRect(4 + recoil, -1, 10, 2);

        // Muzzle ring (thick)
        ctx.strokeStyle = '#4a2e1c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(14 + recoil, 0, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Muzzle opening
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(14 + recoil, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rivets (4 total)
        ctx.fillStyle = '#bbb';
        const rivets = [[-4, -4], [-4, 4], [0, -4], [0, 4]];
        for (const [rx, ry] of rivets) {
            ctx.beginPath();
            ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Smoke wisp after firing
        if (tower.recoilTimer > 0) {
            const t = tower.recoilTimer / 0.12;
            ctx.globalAlpha = t * 0.4;
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            ctx.arc(16 + recoil + (1 - t) * 6, (Math.random() - 0.5) * 4, 2 + (1 - t) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawFrostTurret(ctx, recoil, tower) {
        const sp = tower.spinPhase;

        // Rotating outer crystal ring (drawn in turret-local space)
        ctx.save();
        ctx.rotate(-tower.turretAngle); // undo turret rotation for world-space spin
        ctx.strokeStyle = 'rgba(170,221,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a = sp * 0.5 + (Math.PI * 2 * i) / 6;
            const r1 = 9;
            const r2 = 12;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
        ctx.restore();

        // Diamond body with gradient look
        ctx.fillStyle = '#4a8bc5';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();

        // Bright facet
        ctx.fillStyle = '#7bc4ff';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();

        // Inner core crystal
        ctx.fillStyle = '#b0e0ff';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3.5, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-3.5, 0);
        ctx.closePath();
        ctx.fill();

        // Core sparkle
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(tower.glowPhase * 2) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Ice barrel — crystalline
        ctx.fillStyle = '#5b9bd5';
        ctx.beginPath();
        ctx.moveTo(6 + recoil, -2);
        ctx.lineTo(15 + recoil, -1);
        ctx.lineTo(15 + recoil, 1);
        ctx.lineTo(6 + recoil, 2);
        ctx.closePath();
        ctx.fill();

        // Frost tip emanation
        ctx.strokeStyle = '#cceeff';
        ctx.lineWidth = 0.6;
        const frostSpread = Math.sin(tower.glowPhase * 2) * 0.5;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(15 + recoil, i * 1.2);
            ctx.lineTo(18 + recoil, i * (2 + frostSpread));
            ctx.stroke();
        }
    }

    drawLightningTurret(ctx, recoil, tower) {
        const sp = tower.spinPhase;

        // Outer energy ring (world-space rotation)
        ctx.save();
        ctx.rotate(-tower.turretAngle);
        ctx.strokeStyle = `rgba(186,104,200,${0.2 + Math.sin(tower.glowPhase * 2) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 11, sp, sp + Math.PI * 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 11, sp + Math.PI, sp + Math.PI * 1.8);
        ctx.stroke();
        ctx.restore();

        // Central orb — multi-layered with pulsing
        const orbPulse = 1 + Math.sin(tower.glowPhase * 2) * 0.15;

        // Outer glow
        ctx.fillStyle = 'rgba(155,89,182,0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, 8 * orbPulse, 0, Math.PI * 2);
        ctx.fill();

        // Main orb
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.arc(0, 0, 6 * orbPulse, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = '#dda0dd';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 * orbPulse, 0, Math.PI * 2);
        ctx.fill();

        // Hot center
        ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(tower.glowPhase * 3) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Tesla prongs — three-pronged fork
        ctx.fillStyle = '#6a2d96';
        // Top prong
        ctx.beginPath();
        ctx.moveTo(5 + recoil, -6);
        ctx.lineTo(14 + recoil, -5);
        ctx.lineTo(14 + recoil, -3);
        ctx.lineTo(5 + recoil, -3);
        ctx.closePath();
        ctx.fill();
        // Bottom prong
        ctx.beginPath();
        ctx.moveTo(5 + recoil, 3);
        ctx.lineTo(14 + recoil, 3);
        ctx.lineTo(14 + recoil, 5);
        ctx.lineTo(5 + recoil, 6);
        ctx.closePath();
        ctx.fill();
        // Center prong
        ctx.fillStyle = '#7b3ba6';
        ctx.fillRect(5 + recoil, -1.5, 10, 3);

        // Prong tips — metal caps
        ctx.fillStyle = '#bbb';
        ctx.beginPath();
        ctx.arc(14 + recoil, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(14 + recoil, 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15 + recoil, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Electric arcs between prongs
        ctx.strokeStyle = '#e0b0ff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const sx = 8 + recoil + i * 2;
            const jx1 = (Math.random() - 0.5) * 4;
            const jx2 = (Math.random() - 0.5) * 4;
            // Top to center
            ctx.beginPath();
            ctx.moveTo(sx, -4);
            ctx.lineTo(sx + jx1, -1);
            ctx.stroke();
            // Bottom to center
            ctx.beginPath();
            ctx.moveTo(sx, 4);
            ctx.lineTo(sx + jx2, 1);
            ctx.stroke();
        }
    }

    drawSniperTurret(ctx, recoil, tower) {
        // Stock / body — angular, tactical
        ctx.fillStyle = '#8a2820';
        ctx.beginPath();
        ctx.moveTo(-7, -3);
        ctx.lineTo(-3, -4);
        ctx.lineTo(5, -4);
        ctx.lineTo(5, 4);
        ctx.lineTo(-3, 4);
        ctx.lineTo(-7, 3);
        ctx.closePath();
        ctx.fill();
        // Body highlight
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-5, -3, 9, 6);

        // Long barrel — multi-segment
        ctx.fillStyle = '#7a2820';
        ctx.fillRect(4 + recoil, -2, 6, 4);
        ctx.fillStyle = '#8a3228';
        ctx.fillRect(10 + recoil, -1.5, 8, 3);

        // Barrel tip / flash hider
        ctx.fillStyle = '#555';
        ctx.fillRect(17 + recoil, -2, 2, 4);
        ctx.fillStyle = '#777';
        ctx.fillRect(17.5 + recoil, -1, 1, 2);

        // Scope — detailed
        ctx.fillStyle = '#444';
        ctx.fillRect(-1, -7, 8, 3);
        // Scope tube
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -5.5, 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(6, -5.5, 2, 0, Math.PI * 2);
        ctx.stroke();
        // Scope lens (reflects)
        const lensGlow = 0.4 + Math.sin(tower.glowPhase * 2) * 0.2;
        ctx.fillStyle = `rgba(100,200,255,${lensGlow})`;
        ctx.beginPath();
        ctx.arc(0, -5.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(100,200,255,${lensGlow * 0.6})`;
        ctx.beginPath();
        ctx.arc(6, -5.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Bipod legs
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, 4);
        ctx.lineTo(-5, 9);
        ctx.moveTo(2, 4);
        ctx.lineTo(5, 9);
        ctx.stroke();

        // Muzzle flash during recoil — dramatic
        if (tower.recoilTimer > 0.04) {
            const t = tower.recoilTimer / 0.12;
            // Core flash
            ctx.fillStyle = `rgba(255,255,200,${t * 0.8})`;
            ctx.beginPath();
            ctx.arc(19 + recoil, 0, 2 + t * 2, 0, Math.PI * 2);
            ctx.fill();
            // Outer flash
            ctx.fillStyle = `rgba(255,200,50,${t * 0.4})`;
            ctx.beginPath();
            ctx.arc(19 + recoil, 0, 4 + t * 3, 0, Math.PI * 2);
            ctx.fill();
            // Flash spikes
            ctx.strokeStyle = `rgba(255,235,59,${t * 0.6})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const a = (Math.PI / 2) * i + Math.random() * 0.3;
                ctx.beginPath();
                ctx.moveTo(19 + recoil, 0);
                ctx.lineTo(19 + recoil + Math.cos(a) * (4 + t * 4), Math.sin(a) * (4 + t * 4));
                ctx.stroke();
            }
        }
    }

    drawProjectiles(ctx) {
        for (const p of this.game.projectiles.projectiles) {
            if (!p.alive) continue;

            const color = p.getColor();

            // Trail
            if (p.trail.length > 1) {
                const trailWidth = p.towerType === 'cannon' ? 2
                    : p.towerType === 'lightning' ? 1.5
                    : p.towerType === 'sniper' ? 0.5
                    : 1;

                ctx.strokeStyle = color;
                ctx.lineWidth = trailWidth;
                ctx.globalAlpha = 0.4;

                if (p.towerType === 'lightning') {
                    // Jittery trail
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        const jx = (Math.random() - 0.5) * 4;
                        const jy = (Math.random() - 0.5) * 4;
                        ctx.lineTo(p.trail[i].x + jx, p.trail[i].y + jy);
                    }
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    }
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // Projectile body per type
            switch (p.towerType) {
                case 'arrow':
                    this.drawArrowProjectile(ctx, p, color);
                    break;
                case 'cannon':
                    this.drawCannonProjectile(ctx, p, color);
                    break;
                case 'frost':
                    this.drawFrostProjectile(ctx, p, color);
                    break;
                case 'lightning':
                    this.drawLightningProjectile(ctx, p, color);
                    break;
                case 'sniper':
                    this.drawSniperProjectile(ctx, p, color);
                    break;
                default:
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    drawArrowProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Shaft
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(1, -2.5);
        ctx.lineTo(1, 2.5);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-4, -2);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-4, 2);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    drawCannonProjectile(ctx, p, color) {
        // Motion blur ellipse
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = 'rgba(80,50,20,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Dark circle
        ctx.fillStyle = '#4a3520';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawFrostProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Diamond crystal
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();

        // Inner facet
        ctx.fillStyle = '#cceeff';
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(0, -1.5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(0, 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawLightningProjectile(ctx, p, color) {
        // Electric glow halo
        ctx.fillStyle = 'rgba(186, 104, 200, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Zigzag bolt shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(1, -3);
        ctx.lineTo(2, -1);
        ctx.lineTo(-2, -2);
        ctx.lineTo(-1, 1);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-1, 3);
        ctx.lineTo(-2, 1);
        ctx.lineTo(2, 2);
        ctx.lineTo(1, -1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawSniperProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Gradient streak
        const grad = ctx.createLinearGradient(-8, 0, 3, 0);
        grad.addColorStop(0, 'rgba(239,83,80,0)');
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        ctx.fillRect(-8, -1, 11, 2);

        // Bright tip dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawAvatar(ctx, level, themeColor) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const scale = w / 40; // normalize to 40px base

        // Background circle
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
        ctx.fill();

        // Glowing outline for level 8+
        if (level >= 8) {
            ctx.strokeStyle = 'rgba(255,215,0,0.6)';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Cape (level 6+)
        if (level >= 6) {
            ctx.fillStyle = themeColor;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(cx - 3 * scale, cy - 2 * scale);
            ctx.lineTo(cx - 7 * scale, cy + 10 * scale);
            ctx.lineTo(cx - 1 * scale, cy + 8 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Body (torso)
        ctx.fillStyle = '#555';
        ctx.fillRect(cx - 3 * scale, cy - 1 * scale, 6 * scale, 8 * scale);

        // Shoulders
        ctx.fillStyle = '#666';
        ctx.fillRect(cx - 5 * scale, cy - 1 * scale, 10 * scale, 3 * scale);

        // Legs
        ctx.fillStyle = '#444';
        ctx.fillRect(cx - 2.5 * scale, cy + 7 * scale, 2 * scale, 5 * scale);
        ctx.fillRect(cx + 0.5 * scale, cy + 7 * scale, 2 * scale, 5 * scale);

        // Arms
        ctx.fillStyle = '#555';
        ctx.fillRect(cx - 6 * scale, cy, 2 * scale, 6 * scale);
        ctx.fillRect(cx + 4 * scale, cy, 2 * scale, 6 * scale);

        // Shield (level 2+)
        if (level >= 2) {
            ctx.fillStyle = themeColor;
            ctx.beginPath();
            ctx.moveTo(cx - 7 * scale, cy + 1 * scale);
            ctx.lineTo(cx - 10 * scale, cy + 1 * scale);
            ctx.lineTo(cx - 10 * scale, cy + 6 * scale);
            ctx.lineTo(cx - 8.5 * scale, cy + 8 * scale);
            ctx.lineTo(cx - 7 * scale, cy + 6 * scale);
            ctx.closePath();
            ctx.fill();
            // Shield edge highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5 * scale;
            ctx.stroke();
        }

        // Head
        ctx.fillStyle = '#daa877';
        ctx.beginPath();
        ctx.arc(cx, cy - 5 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Helmet base
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(cx, cy - 5 * scale, 4.2 * scale, Math.PI, Math.PI * 2);
        ctx.fill();

        // Crown (level 8+) replaces helmet top
        if (level >= 8) {
            ctx.fillStyle = '#ffd700';
            // Crown base
            ctx.fillRect(cx - 4 * scale, cy - 9.5 * scale, 8 * scale, 2 * scale);
            // Crown points
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(cx + i * 2.5 * scale - 1.2 * scale, cy - 9.5 * scale);
                ctx.lineTo(cx + i * 2.5 * scale, cy - 12.5 * scale);
                ctx.lineTo(cx + i * 2.5 * scale + 1.2 * scale, cy - 9.5 * scale);
                ctx.closePath();
                ctx.fill();
            }
            // Gem on crown
            ctx.fillStyle = themeColor;
            ctx.beginPath();
            ctx.arc(cx, cy - 10.5 * scale, 1 * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Helmet plume (level 4-7)
        if (level >= 4 && level < 8) {
            ctx.fillStyle = themeColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 9 * scale);
            ctx.quadraticCurveTo(cx + 5 * scale, cy - 14 * scale, cx + 8 * scale, cy - 9 * scale);
            ctx.quadraticCurveTo(cx + 4 * scale, cy - 10 * scale, cx, cy - 9 * scale);
            ctx.closePath();
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - 2 * scale, cy - 5.5 * scale, 1.2 * scale, 1 * scale);
        ctx.fillRect(cx + 0.8 * scale, cy - 5.5 * scale, 1.2 * scale, 1 * scale);

        // Sword (right hand)
        ctx.fillStyle = '#ccc';
        ctx.fillRect(cx + 5.5 * scale, cy - 4 * scale, 1 * scale, 8 * scale);
        // Sword handle
        ctx.fillStyle = '#8b5e3c';
        ctx.fillRect(cx + 4.5 * scale, cy + 3.5 * scale, 3 * scale, 1.2 * scale);
        // Sword tip
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.moveTo(cx + 5.5 * scale, cy - 4 * scale);
        ctx.lineTo(cx + 6 * scale, cy - 6 * scale);
        ctx.lineTo(cx + 6.5 * scale, cy - 4 * scale);
        ctx.closePath();
        ctx.fill();
    }

    drawUIOverlay() {
        const ctx = this.uiCtx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Big wave level number — top-left corner of canvas
        const waves = this.game.waves;
        if (waves.currentWave > 0) {
            const waveText = `${waves.currentWave}`;
            ctx.save();
            ctx.font = 'bold 72px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillText(waveText, 22, 22);
            // Main number
            ctx.fillStyle = 'rgba(52,152,219,0.35)';
            ctx.fillText(waveText, 20, 20);
            // Label
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = 'rgba(52,152,219,0.3)';
            ctx.fillText('WAVE', 20, 92);
            ctx.restore();
        }

        const input = this.game.input;

        // Hover cell highlight
        if (input.hoverGx >= 0 && input.hoverGy >= 0) {
            const hx = input.hoverGx * CELL;
            const hy = input.hoverGy * CELL;

            if (input.selectedTowerType) {
                // Placement preview
                const canPlace = this.game.towers.canPlace(input.hoverGx, input.hoverGy);
                const def = TOWER_TYPES[input.selectedTowerType];
                ctx.fillStyle = canPlace ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
                ctx.fillRect(hx, hy, CELL, CELL);

                if (canPlace) {
                    // Range preview
                    const range = def.levels[0].range * CELL;
                    const cx = hx + CELL / 2;
                    const cy = hy + CELL / 2;
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, range, 0, Math.PI * 2);
                    ctx.stroke();

                    // Count and highlight path cells in range
                    let coveredCount = 0;
                    for (const key of this.game.map.pathCells) {
                        const [px, py] = key.split(',').map(Number);
                        const pcx = px * CELL + CELL / 2;
                        const pcy = py * CELL + CELL / 2;
                        const dx = pcx - cx;
                        const dy = pcy - cy;
                        if (dx * dx + dy * dy <= range * range) {
                            coveredCount++;
                            ctx.fillStyle = 'rgba(255,255,100,0.15)';
                            ctx.fillRect(px * CELL, py * CELL, CELL, CELL);
                        }
                    }

                    // Draw coverage count
                    ctx.save();
                    ctx.font = 'bold 20px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillText(coveredCount, cx + 1, cy + 1);
                    ctx.fillStyle = coveredCount > 0 ? '#ffd700' : '#ff4444';
                    ctx.fillText(coveredCount, cx, cy);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(hx, hy, CELL, CELL);
            }
        }

        // Selected tower
        if (input.selectedTower) {
            const tower = input.selectedTower;
            const tx = tower.gx * CELL;
            const ty = tower.gy * CELL;

            // Selection box
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx, ty, CELL, CELL);

            // Range circle
            ctx.strokeStyle = 'rgba(255,215,0,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range * CELL, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}
