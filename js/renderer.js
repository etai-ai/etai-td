import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS, TOWER_TYPES, TARGET_MODES, HERO_STATS, ENEMY_TYPES, getWaveHPScale } from './constants.js';

export class Renderer {
    constructor(canvases, game) {
        this.game = game;
        this.terrainCtx = canvases.terrain.getContext('2d');
        this.gameCtx = canvases.game.getContext('2d');
        this.uiCtx = canvases.ui.getContext('2d');

        // Ambient particle state
        this.ambients = [];
        this.ambientSpawnTimer = 0;

        // Set canvas sizes
        for (const c of [canvases.terrain, canvases.game, canvases.ui]) {
            c.width = CANVAS_W;
            c.height = CANVAS_H;
        }
    }

    drawTerrain() {
        this.ambients = [];
        this.game.map.drawTerrain(this.terrainCtx, this.game.atmosphereColors);
        // Draw tower bases on terrain layer
        for (const tower of this.game.towers.towers) {
            this.drawTowerBase(this.terrainCtx, tower);
        }
        // Flag PostFX to re-upload terrain texture
        if (this.game.postfx) this.game.postfx.setTerrainDirty();
    }

    drawTowerBase(ctx, tower) {
        const x = tower.gx * CELL;
        const y = tower.gy * CELL;
        const sz = tower.size || 1;
        const totalPx = sz * CELL;
        const cx = x + totalPx / 2;
        const cy = y + totalPx / 2;

        const maxed = tower.level >= 2;
        const accentColors = {
            arrow: '#4a7c3f',
            cannon: '#8b5e3c',
            frost: '#5b9bd5',
            deepfrost: '#1a6b8a',
            lightning: '#9b59b6',
            superlightning: '#7b3fff',
            sniper: '#c0392b',
            firearrow: '#8b1a1a',
            bicannon: '#6b4226',
            missilesniper: '#6b8e23',
            titan: '#d4af37',
        };
        const maxedAccentColors = {
            arrow: '#7fff00',
            cannon: '#ff8c00',
            frost: '#00e5ff',
            deepfrost: '#00dcff',
            lightning: '#e040fb',
            superlightning: '#b388ff',
            sniper: '#ff1744',
            firearrow: '#ff4500',
            bicannon: '#ff6b00',
            missilesniper: '#b5d43b',
            titan: '#ffd700',
        };
        const accent = maxed ? (maxedAccentColors[tower.type] || '#ffd700') : (accentColors[tower.type] || '#888');

        // Outer platform with beveled edges
        ctx.fillStyle = maxed ? '#5a5a3a' : '#4a4a4a';
        ctx.fillRect(x + 1, y + 1, totalPx - 2, totalPx - 2);
        // Top/left highlight
        ctx.fillStyle = maxed ? '#808050' : '#606060';
        ctx.fillRect(x + 1, y + 1, totalPx - 2, 2);
        ctx.fillRect(x + 1, y + 1, 2, totalPx - 2);
        // Bottom/right shadow
        ctx.fillStyle = maxed ? '#3a3a20' : '#333';
        ctx.fillRect(x + 1, y + totalPx - 3, totalPx - 2, 2);
        ctx.fillRect(x + totalPx - 3, y + 1, 2, totalPx - 2);
        // Inner platform — brighter for higher levels, golden tint for maxed
        if (maxed) {
            ctx.fillStyle = '#c0a850';
        } else {
            const lvlBright = tower.level * 12;
            ctx.fillStyle = `rgb(${88 + lvlBright},${88 + lvlBright},${88 + lvlBright})`;
        }
        ctx.fillRect(x + 4, y + 4, totalPx - 8, totalPx - 8);

        // Color accent ring — thicker and brighter for upgrades
        const ringRadius = sz > 1 ? 28 : 14;
        const ringWidth = maxed ? 5 : 2 + tower.level;
        ctx.strokeStyle = accent;
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        if (tower.level > 0) {
            ctx.strokeStyle = maxed ? '#fff' : '#ffd700';
            ctx.lineWidth = maxed ? 1.5 : 1;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius - ringWidth, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Corner bolt details — gold for upgraded, bright white for maxed
        const boltOffset = 6;
        const corners = [
            [x + boltOffset, y + boltOffset],
            [x + totalPx - boltOffset, y + boltOffset],
            [x + boltOffset, y + totalPx - boltOffset],
            [x + totalPx - boltOffset, y + totalPx - boltOffset],
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
            const starY = cy + totalPx * 0.31;
            // Star glow background
            ctx.fillStyle = maxed ? 'rgba(255,215,0,0.45)' : 'rgba(255,215,0,0.25)';
            ctx.beginPath();
            ctx.arc(cx, starY, tower.level * 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = maxed ? '#fff' : '#ffd700';
            for (let i = 0; i < tower.level; i++) {
                const sx = cx - (tower.level - 1) * 6 + i * 12;
                const sy = starY;
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

        // Ambient map effects (ground layer, behind everything)
        // Skip in 3D mode — renderer3d handles its own 3D ambient particles
        if (!this.game.use3D) {
            this.updateAmbients(1 / 60);
            this.drawAmbients(ctx);
        }

        // Draw scorch zones (ground layer, below enemies)
        this.drawScorchZones(ctx);

        // Draw enemies
        this.drawEnemies(ctx);

        // Draw tower turrets (rotatable part)
        this.drawTowerTurrets(ctx);

        // Draw hero
        this.drawHero(ctx);

        // Draw projectiles
        this.drawProjectiles(ctx);

        // Draw particles
        this.game.particles.draw(ctx);

        // Restore screen shake
        if (shakeX !== 0 || shakeY !== 0) {
            ctx.restore();
        }

        // Screen flash overlay (Canvas 2D fallback — skipped when PostFX handles it)
        if (this.game.screenFlash > 0 && (!this.game.postfx || !this.game.postfx.enabled)) {
            ctx.save();
            ctx.globalAlpha = Math.min(this.game.screenFlash, 1);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.restore();
        }

        // Low lives warning — pulsing red border when lives <= 5
        if (this.game.economy.lives <= 5 && this.game.economy.lives > 0 && this.game.state === 'PLAYING') {
            const pulse = 0.15 + 0.15 * Math.sin(this.game.elapsedTime * 4);
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 12;
            ctx.strokeRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.restore();
        }

        // Draw UI overlay
        this.drawUIOverlay();
    }

    // ── Hero Drawing ──────────────────────────────────────────
    getHeroState(hero) {
        if (hero.executeAnimTimer >= 0) return 'execute';
        const stunReady = hero.stunCooldown <= 0;
        const magnetReady = hero.magnetCooldown <= 0;
        if (stunReady && magnetReady) return 'both';
        if (magnetReady)              return 'magnet';
        if (stunReady)                return 'stun';
        return 'cooldown';
    }

    // State-driven colors: body, glow ring, outline
    getHeroColors(state) {
        switch (state) {
            case 'execute':  return { body: '#ff2200', glow: '#ffd700', outline: '#aa0000' }; // red/gold — executing
            case 'both':     return { body: '#00e5ff', glow: '#00e5ff', outline: '#005f6f' }; // cyan — full power
            case 'magnet':   return { body: '#ffd700', glow: '#ffd700', outline: '#7a6500' }; // gold — magnet ready
            case 'stun':     return { body: '#ffffff', glow: '#ffffff', outline: '#888888' }; // white — stun ready
            case 'cooldown': return { body: '#556677', glow: '#445566', outline: '#334455' }; // gray — recharging
        }
    }

    drawHero(ctx) {
        const hero = this.game.hero;
        if (!hero.active) return;

        const { x, y } = hero;
        const r = HERO_STATS.radius;

        // Dead state — ghost at spawn + respawn countdown
        if (!hero.alive) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(hero.deathAnimTimer * 4) * 0.1;
            ctx.strokeStyle = '#556677';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hero.spawnX, hero.spawnY, r + 4, 0, Math.PI * 2);
            ctx.stroke();
            if (hero.respawnTimer > 0) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(Math.ceil(hero.respawnTimer) + 's', hero.spawnX, hero.spawnY + 5);
            }
            ctx.restore();
            return;
        }

        const state = this.getHeroState(hero);
        const colors = this.getHeroColors(state);
        const isFlashing = hero.damageFlashTimer > 0 || hero.stunFlashTimer > 0;

        // Execute animation — scale hero and add effects
        let scale = 1;
        if (hero.executeAnimTimer >= 0) {
            const t = hero.executeAnimTimer;
            if (t < 0.6) {
                // Charge phase: grow 1x → 6x
                scale = 1 + 5 * (t / 0.6);
            } else {
                // Shrink phase: 6x → 1x
                const shrinkT = (t - 0.6) / 0.2;
                scale = 6 - 5 * shrinkT;
            }
        }

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.7, r * 0.8 * scale, r * 0.3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Execute glow rings (massive expanding, pulsing)
        if (hero.executeAnimTimer >= 0 && hero.executeAnimTimer < 0.6) {
            const t = hero.executeAnimTimer / 0.6;
            const pulse = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
            const glowR = r * scale * 2.5 * pulse;
            // Outer gold ring
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 * (1 - t * 0.2)})`;
            ctx.lineWidth = 4 + t * 6;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.stroke();
            // Mid red ring
            ctx.strokeStyle = `rgba(255, 34, 0, ${0.5 * pulse})`;
            ctx.lineWidth = 6 + t * 4;
            ctx.beginPath();
            ctx.arc(x, y, glowR * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            // Inner white-hot ring
            ctx.strokeStyle = `rgba(255, 255, 200, ${0.4 * pulse * t})`;
            ctx.lineWidth = 3 + t * 5;
            ctx.beginPath();
            ctx.arc(x, y, glowR * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            // Radial fill glow
            const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            grad.addColorStop(0, `rgba(255, 200, 50, ${0.3 * t})`);
            grad.addColorStop(0.5, `rgba(255, 50, 0, ${0.15 * t})`);
            grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Magnet aura (active effect, independent of state color)
        if (hero.magnetActive) {
            const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
            const magnetPx = HERO_STATS.magnetRadius * CELL;
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, magnetPx * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 * pulse})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y, magnetPx * pulse * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Glow ring — color matches state
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 2;
        ctx.globalAlpha = state === 'cooldown' ? 0.2 : (0.4 + Math.sin(Date.now() * 0.003) * 0.15);
        ctx.beginPath();
        ctx.arc(x, y, (r + 4) * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Body — knight/warrior rotated to turretAngle
        ctx.translate(x, y);
        ctx.rotate(hero.turretAngle);
        if (scale !== 1) ctx.scale(scale, scale);

        // Cape (flowing behind the hero, animated)
        const capeWave = Math.sin(Date.now() * 0.008) * r * 0.15;
        ctx.fillStyle = '#cc2244';
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.35);
        ctx.quadraticCurveTo(-r * 1.1, capeWave, -r * 0.3, r * 0.35);
        ctx.closePath();
        ctx.fill();

        // Armored body (shield-shaped pentagon)
        ctx.fillStyle = isFlashing ? '#ff4444' : colors.body;
        ctx.beginPath();
        ctx.moveTo(r * 0.8, 0);
        ctx.lineTo(r * 0.15, -r * 0.72);
        ctx.lineTo(-r * 0.5, -r * 0.55);
        ctx.lineTo(-r * 0.5, r * 0.55);
        ctx.lineTo(r * 0.15, r * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isFlashing ? '#fff' : colors.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Armor accent line
        ctx.strokeStyle = isFlashing ? '#ff8888' : colors.outline;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 0.1, -r * 0.5);
        ctx.lineTo(-r * 0.15, 0);
        ctx.lineTo(r * 0.1, r * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Sword blade
        ctx.strokeStyle = '#ddeeff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(r * 0.7, 0);
        ctx.lineTo(r * 1.4, 0);
        ctx.stroke();
        // Sword tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(r * 1.4, -2.5);
        ctx.lineTo(r * 1.6, 0);
        ctx.lineTo(r * 1.4, 2.5);
        ctx.closePath();
        ctx.fill();
        // Crossguard
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r * 0.65, -r * 0.25);
        ctx.lineTo(r * 0.65, r * 0.25);
        ctx.stroke();

        // Visor (glowing eye slit)
        ctx.fillStyle = isFlashing ? '#ffaaaa' : '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fillRect(r * 0.4, -r * 0.1, r * 0.22, r * 0.2);
        ctx.globalAlpha = 1;

        ctx.restore();

        // HP bar (only when not full)
        if (hero.hp < hero.maxHP) {
            const barW = 28;
            const barH = 4;
            const barX = x - barW / 2;
            const barY = y - r - 10;
            const hpFrac = hero.hp / hero.maxHP;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = hpFrac > 0.5 ? '#00e5ff' : hpFrac > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillRect(barX, barY, barW * hpFrac, barH);
        }

        // Ability cooldown indicators below hero
        this.drawHeroCooldowns(ctx, hero);
    }

    drawHeroCooldowns(ctx, hero) {
        const x = hero.x;
        const y = hero.y + HERO_STATS.radius + 12;
        const iconR = 7;
        const gap = 20;

        // 3 icons centered: Q — E — 1
        this.drawCooldownArc(ctx, x - gap, y, iconR, hero.stunCooldown, HERO_STATS.stunCooldown, '#ffffff', 'Q');
        this.drawCooldownArc(ctx, x, y, iconR, hero.magnetCooldown, HERO_STATS.magnetCooldown, '#ffd700', 'E');
        this.drawCooldownArc(ctx, x + gap, y, iconR, hero.executeCooldown, HERO_STATS.executeCooldown, '#ff4400', 'Z');
    }

    drawCooldownArc(ctx, cx, cy, r, cooldown, maxCooldown, color, label) {
        ctx.save();

        // Background circle
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        if (cooldown > 0) {
            // Cooldown sweep (how much is remaining)
            const frac = cooldown / maxCooldown;
            ctx.fillStyle = 'rgba(100,100,100,0.6)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
            ctx.closePath();
            ctx.fill();
        } else {
            // Ready — filled with color
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Border
        ctx.strokeStyle = cooldown > 0 ? '#666' : color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = cooldown > 0 ? '#888' : '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);

        ctx.restore();
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

    drawOctagon(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8 - Math.PI / 8;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    drawStar(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
            const rad = i % 2 === 0 ? r : r * 0.45;
            const px = x + Math.cos(a) * rad;
            const py = y + Math.sin(a) * rad;
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

    drawWing(ctx, x, y, r) {
        // Bird/bat silhouette: diamond body with swept wings
        ctx.beginPath();
        // Body diamond
        ctx.moveTo(x, y - r * 0.7);
        ctx.lineTo(x + r * 0.35, y);
        ctx.lineTo(x, y + r * 0.7);
        ctx.lineTo(x - r * 0.35, y);
        ctx.closePath();
        // Right wing
        ctx.moveTo(x + r * 0.3, y - r * 0.1);
        ctx.lineTo(x + r * 1.4, y - r * 0.6);
        ctx.lineTo(x + r * 1.1, y + r * 0.1);
        ctx.lineTo(x + r * 0.3, y + r * 0.1);
        ctx.closePath();
        // Left wing
        ctx.moveTo(x - r * 0.3, y - r * 0.1);
        ctx.lineTo(x - r * 1.4, y - r * 0.6);
        ctx.lineTo(x - r * 1.1, y + r * 0.1);
        ctx.lineTo(x - r * 0.3, y + r * 0.1);
        ctx.closePath();
    }

    drawWobble(ctx, x, y, r, phase) {
        // Wobbly blob: asymmetric circle that squishes over time
        const t = phase || 0;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            const wobble = 1 + 0.18 * Math.sin(a * 3 + t * 6) + 0.10 * Math.cos(a * 2 - t * 4);
            const px = x + Math.cos(a) * r * wobble;
            const py = y + Math.sin(a) * r * wobble;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    // ── World-Specific Enemy Shapes ──

    drawChevron(ctx, x, y, r) {
        // Angular fang/chevron — Forest Stalker
        ctx.beginPath();
        ctx.moveTo(x, y - r);             // top point
        ctx.lineTo(x + r * 0.7, y - r * 0.2);
        ctx.lineTo(x + r, y + r * 0.4);   // right wing
        ctx.lineTo(x + r * 0.3, y + r * 0.1);
        ctx.lineTo(x, y + r);             // bottom point
        ctx.lineTo(x - r * 0.3, y + r * 0.1);
        ctx.lineTo(x - r, y + r * 0.4);   // left wing
        ctx.lineTo(x - r * 0.7, y - r * 0.2);
        ctx.closePath();
    }

    drawCrown(ctx, x, y, r) {
        // Winged crown — Storm Herald
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * 0.5);        // bottom-left
        ctx.lineTo(x - r, y - r * 0.2);         // left wall
        ctx.lineTo(x - r * 0.6, y - r);         // left peak
        ctx.lineTo(x - r * 0.3, y - r * 0.3);   // left valley
        ctx.lineTo(x, y - r * 0.9);             // center peak
        ctx.lineTo(x + r * 0.3, y - r * 0.3);   // right valley
        ctx.lineTo(x + r * 0.6, y - r);         // right peak
        ctx.lineTo(x + r, y - r * 0.2);         // right wall
        ctx.lineTo(x + r, y + r * 0.5);         // bottom-right
        ctx.closePath();
    }

    drawScarab(ctx, x, y, r) {
        // Wide beetle/scarab — Sand Titan
        ctx.beginPath();
        // Top
        ctx.moveTo(x, y - r * 0.7);
        ctx.quadraticCurveTo(x + r * 0.6, y - r * 0.8, x + r, y - r * 0.2);
        ctx.quadraticCurveTo(x + r * 1.1, y + r * 0.2, x + r * 0.7, y + r * 0.6);
        ctx.lineTo(x + r * 0.3, y + r);
        ctx.lineTo(x, y + r * 0.8);
        ctx.lineTo(x - r * 0.3, y + r);
        ctx.lineTo(x - r * 0.7, y + r * 0.6);
        ctx.quadraticCurveTo(x - r * 1.1, y + r * 0.2, x - r, y - r * 0.2);
        ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.8, x, y - r * 0.7);
        ctx.closePath();
    }

    drawCrackedHexagon(ctx, x, y, r) {
        // Cracked hexagon — Magma Brute (reuses hexagon base)
        this.drawHexagon(ctx, x, y, r);
    }

    drawShard(ctx, x, y, r) {
        // Jagged angular shard — Magma Fragment
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.6, y - r * 0.3);
        ctx.lineTo(x + r * 0.8, y + r * 0.2);
        ctx.lineTo(x + r * 0.3, y + r);
        ctx.lineTo(x - r * 0.2, y + r * 0.6);
        ctx.lineTo(x - r * 0.7, y + r * 0.1);
        ctx.lineTo(x - r * 0.5, y - r * 0.5);
        ctx.closePath();
    }

    drawFortress(ctx, x, y, r) {
        // Rectangle with battlements — Siege Golem
        const w = r * 0.8, h = r;
        const bw = r * 0.22, bh = r * 0.25;
        ctx.beginPath();
        // Base rectangle
        ctx.moveTo(x - w, y + h * 0.6);
        ctx.lineTo(x - w, y - h * 0.4);
        // Left battlement
        ctx.lineTo(x - w, y - h * 0.4);
        ctx.lineTo(x - w, y - h * 0.7);
        ctx.lineTo(x - w + bw, y - h * 0.7);
        ctx.lineTo(x - w + bw, y - h * 0.4);
        // Gap
        ctx.lineTo(x - bw * 0.5, y - h * 0.4);
        // Center battlement
        ctx.lineTo(x - bw * 0.5, y - h);
        ctx.lineTo(x + bw * 0.5, y - h);
        ctx.lineTo(x + bw * 0.5, y - h * 0.4);
        // Gap
        ctx.lineTo(x + w - bw, y - h * 0.4);
        // Right battlement
        ctx.lineTo(x + w - bw, y - h * 0.7);
        ctx.lineTo(x + w, y - h * 0.7);
        ctx.lineTo(x + w, y - h * 0.4);
        // Right side and bottom
        ctx.lineTo(x + w, y + h * 0.6);
        ctx.closePath();
    }

    drawVoidCircle(ctx, x, y, r) {
        // Circle with arc cutouts — Void Sovereign
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
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
            case 'wobbler':
                this.drawWobble(ctx, x, y, r, e.walkPhase);
                break;
            case 'flying':
                this.drawWing(ctx, x, y, r);
                break;
            case 'dragonflyer':
                this.drawWing(ctx, x, y, r);
                break;
            case 'megaboss':
                this.drawOctagon(ctx, x, y, r);
                break;
            case 'quantumboss':
                this.drawStar(ctx, x, y, r);
                break;
            case 'foreststalker':
                this.drawChevron(ctx, x, y, r);
                break;
            case 'stormherald':
                this.drawCrown(ctx, x, y, r);
                break;
            case 'sandtitan':
                this.drawScarab(ctx, x, y, r);
                break;
            case 'magmabrute':
                this.drawCrackedHexagon(ctx, x, y, r);
                break;
            case 'magmafragment':
                this.drawShard(ctx, x, y, r);
                break;
            case 'siegegolem':
                this.drawFortress(ctx, x, y, r);
                break;
            case 'voidsovereign':
                this.drawVoidCircle(ctx, x, y, r);
                break;
            default:
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                break;
        }
    }

    drawEnemies(ctx) {
        const use3D = this.game.use3D && this.game.renderer3d;

        for (const e of this.game.enemies.enemies) {
            // Skip enemies that reached the end
            if (e.reached) continue;

            const isDying = e.deathTimer >= 0;

            // In 3D mode, death animation is handled by 3D renderer
            if (use3D && isDying) continue;

            // Death animation: scale down + fade + spin + color shift
            let scale = 1;
            let alpha = 1;
            let deathT = 0;
            if (isDying) {
                deathT = Math.min(e.deathTimer / 0.35, 1);
                scale = 1 - deathT;
                alpha = 1 - deathT;
                if (scale <= 0) continue;
            }

            // Walk bob
            const bob = e.alive && !isDying && !e.flying ? Math.sin(e.walkPhase) * 1.5 : 0;
            const drawX = e.x;

            // Flying altitude: arc peaking at 40px (60px for dragon), using sine envelope on progress
            let altitude = 0;
            if (e.flying && e.flyProgress !== undefined) {
                const peakAlt = e.type === 'dragonflyer' ? 60 : 40;
                altitude = Math.sin(e.flyProgress * Math.PI) * peakAlt;
            }

            const drawY = e.y + bob - altitude;
            const r = e.radius * scale;

            ctx.globalAlpha = alpha;

            // Burrowed enemies are semi-transparent
            if (e.burrowed) ctx.globalAlpha = alpha * 0.35;

            // ── 2D-only body rendering (skipped in 3D mode) ──
            if (!use3D) {
            // Apply death spin
            if (isDying) {
                ctx.save();
                ctx.translate(drawX, drawY);
                ctx.rotate(deathT * Math.PI);
                ctx.translate(-drawX, -drawY);
            }

            // Shadow (drawn at ground level; larger offset when flying)
            const shadowAlpha = e.flying ? 0.12 : 0.2;
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
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

            // Quantum boss void aura
            if (e.type === 'quantumboss' && !isDying) {
                const pulse = 0.2 + 0.12 * Math.sin(this.game.elapsedTime * 5);
                ctx.fillStyle = `rgba(20, 0, 40, ${pulse})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = `rgba(100, 0, 255, ${pulse + 0.2})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                // Outer flickering ring
                ctx.strokeStyle = `rgba(180, 0, 255, ${0.1 + 0.1 * Math.sin(this.game.elapsedTime * 8)})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 16, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Mega boss crimson aura
            if (e.type === 'megaboss' && !isDying) {
                const pulse = 0.15 + 0.1 * Math.sin(this.game.elapsedTime * 4);
                ctx.fillStyle = `rgba(139, 0, 0, ${pulse})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 50, 0, ${pulse + 0.15})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Body shape — lerp color toward white during death
            if (isDying) {
                const w = Math.min(deathT * 2, 1); // faster color shift
                ctx.fillStyle = `color-mix(in srgb, ${e.color} ${Math.round((1 - w) * 100)}%, #fff)`;
            } else {
                ctx.fillStyle = e.color;
            }
            this.drawEnemyShape(ctx, e, drawX, drawY, r);
            ctx.fill();

            // Bold outline on bosses so they stand out through glow
            if (!isDying && (e.type === 'boss' || e.type === 'megaboss' || e.type === 'quantumboss')) {
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = e.type === 'quantumboss' ? 'rgba(160, 0, 255, 0.8)' :
                                  e.type === 'megaboss' ? 'rgba(255, 80, 0, 0.8)' :
                                  'rgba(255, 215, 0, 0.7)';
                this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.stroke();
            }

            // White flash overlay at start of death
            if (isDying && e.deathTimer < 0.05) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha;
            }

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
            } else if (e.type === 'megaboss' && !isDying) {
                // Spike horns — 4 spikes radiating outward
                ctx.fillStyle = '#ff4500';
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI * 2 * i) / 4 - Math.PI / 4;
                    const sx = drawX + Math.cos(a) * r * 0.75;
                    const sy = drawY + Math.sin(a) * r * 0.75;
                    const tx = drawX + Math.cos(a) * r * 1.3;
                    const ty = drawY + Math.sin(a) * r * 1.3;
                    const perpX = -Math.sin(a) * r * 0.15;
                    const perpY = Math.cos(a) * r * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(sx + perpX, sy + perpY);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(sx - perpX, sy - perpY);
                    ctx.closePath();
                    ctx.fill();
                }
                // Inner dark core
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'quantumboss' && !isDying) {
                // Void tendrils — 5 rotating dark spikes
                const rot = this.game.elapsedTime * 1.5;
                ctx.fillStyle = 'rgba(80, 0, 160, 0.6)';
                for (let i = 0; i < 5; i++) {
                    const a = (Math.PI * 2 * i) / 5 + rot;
                    const sx = drawX + Math.cos(a) * r * 0.5;
                    const sy = drawY + Math.sin(a) * r * 0.5;
                    const tx = drawX + Math.cos(a) * r * 1.4;
                    const ty = drawY + Math.sin(a) * r * 1.4;
                    const perpX = -Math.sin(a) * r * 0.1;
                    const perpY = Math.cos(a) * r * 0.1;
                    ctx.beginPath();
                    ctx.moveTo(sx + perpX, sy + perpY);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(sx - perpX, sy - perpY);
                    ctx.closePath();
                    ctx.fill();
                }
                // Inner void core
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.35, 0, Math.PI * 2);
                ctx.fill();
                // Glowing eye
                ctx.fillStyle = `rgba(180, 0, 255, ${0.6 + 0.3 * Math.sin(this.game.elapsedTime * 6)})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.15, 0, Math.PI * 2);
                ctx.fill();
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
            } else if (e.type === 'dragonflyer' && !isDying) {
                // Wing strokes for definition
                ctx.strokeStyle = 'rgba(255,180,100,0.5)';
                ctx.lineWidth = 1.5;
                // Right wing outline
                ctx.beginPath();
                ctx.moveTo(drawX + r * 0.3, drawY - r * 0.1);
                ctx.lineTo(drawX + r * 1.4, drawY - r * 0.6);
                ctx.lineTo(drawX + r * 1.1, drawY + r * 0.1);
                ctx.lineTo(drawX + r * 0.3, drawY + r * 0.1);
                ctx.closePath();
                ctx.stroke();
                // Left wing outline
                ctx.beginPath();
                ctx.moveTo(drawX - r * 0.3, drawY - r * 0.1);
                ctx.lineTo(drawX - r * 1.4, drawY - r * 0.6);
                ctx.lineTo(drawX - r * 1.1, drawY + r * 0.1);
                ctx.lineTo(drawX - r * 0.3, drawY + r * 0.1);
                ctx.closePath();
                ctx.stroke();
                // Body outline
                ctx.strokeStyle = 'rgba(255,220,150,0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(drawX, drawY - r * 0.7);
                ctx.lineTo(drawX + r * 0.35, drawY);
                ctx.lineTo(drawX, drawY + r * 0.7);
                ctx.lineTo(drawX - r * 0.35, drawY);
                ctx.closePath();
                ctx.stroke();
            } else if (e.type === 'wobbler' && !isDying) {
                // Googly eyes
                const eyeOff = r * 0.32;
                const eyeR = r * 0.30;
                const pupilR = r * 0.15;
                const pupilShift = r * 0.10;
                for (const side of [-1, 1]) {
                    // White of eye
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(drawX + side * eyeOff, drawY - r * 0.15, eyeR, 0, Math.PI * 2);
                    ctx.fill();
                    // Pupil — offset in movement direction
                    ctx.fillStyle = '#111';
                    ctx.beginPath();
                    ctx.arc(
                        drawX + side * eyeOff + Math.cos(e.angle) * pupilShift,
                        drawY - r * 0.15 + Math.sin(e.angle) * pupilShift,
                        pupilR, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
            } else if (e.type === 'foreststalker' && !isDying) {
                // Green camo dapples
                ctx.fillStyle = 'rgba(20, 80, 20, 0.4)';
                for (let i = 0; i < 4; i++) {
                    const da = (Math.PI * 2 * i) / 4 + e.walkPhase * 0.3;
                    const dr = r * (0.2 + 0.3 * ((i % 3) * 0.3));
                    ctx.beginPath();
                    ctx.arc(drawX + Math.cos(da) * dr, drawY + Math.sin(da) * dr, r * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Dodge charge indicator — bright eye dot when charges remain
                if (e.dodgeCharges > 0) {
                    ctx.fillStyle = '#7fff7f';
                    ctx.beginPath();
                    ctx.arc(drawX, drawY - r * 0.3, r * 0.12, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Dodge flash effect
                if (e.dodgeFlashTimer > 0) {
                    ctx.globalAlpha = e.dodgeFlashTimer / 0.3 * 0.5;
                    ctx.fillStyle = '#7fff7f';
                    this.drawChevron(ctx, drawX, drawY, r * 1.2);
                    ctx.fill();
                    ctx.globalAlpha = alpha;
                }
            } else if (e.type === 'stormherald' && !isDying) {
                // Electric crackling arcs
                ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const sr = r * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(drawX + Math.cos(a) * sr * 0.2, drawY + Math.sin(a) * sr * 0.2);
                    const midX = drawX + Math.cos(a) * sr * 0.6 + (Math.random() - 0.5) * 4;
                    const midY = drawY + Math.sin(a) * sr * 0.6 + (Math.random() - 0.5) * 4;
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(drawX + Math.cos(a) * sr, drawY + Math.sin(a) * sr);
                    ctx.stroke();
                }
                // Shield aura radius indicator
                ctx.strokeStyle = 'rgba(74, 144, 217, 0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(drawX, drawY, e.shieldRadius * CELL, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (e.type === 'sandtitan' && !isDying) {
                // Carapace center line
                ctx.strokeStyle = 'rgba(100, 80, 30, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(drawX, drawY - r * 0.5);
                ctx.lineTo(drawX, drawY + r * 0.5);
                ctx.stroke();
                // Lateral lines
                ctx.beginPath();
                ctx.moveTo(drawX - r * 0.4, drawY);
                ctx.lineTo(drawX + r * 0.4, drawY);
                ctx.stroke();
            } else if (e.type === 'magmabrute' && !isDying) {
                // Glowing orange cracks
                ctx.strokeStyle = 'rgba(255, 140, 40, 0.7)';
                ctx.lineWidth = 1.2;
                for (let i = 0; i < 5; i++) {
                    const a = (Math.PI * 2 * i) / 5 + 0.3;
                    const cr = r * (0.3 + Math.random() * 0.4);
                    ctx.beginPath();
                    ctx.moveTo(drawX, drawY);
                    ctx.lineTo(drawX + Math.cos(a) * cr, drawY + Math.sin(a) * cr);
                    ctx.stroke();
                }
                // Inner glow core
                ctx.fillStyle = 'rgba(255, 100, 20, 0.3)';
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.35, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'magmafragment' && !isDying) {
                // Hot inner glow
                ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else if (e.type === 'siegegolem' && !isDying) {
                // Stone texture lines
                ctx.strokeStyle = 'rgba(120, 120, 130, 0.4)';
                ctx.lineWidth = 0.7;
                const hw = r * 0.7;
                ctx.beginPath();
                ctx.moveTo(drawX - hw, drawY);
                ctx.lineTo(drawX + hw, drawY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(drawX - hw, drawY + r * 0.3);
                ctx.lineTo(drawX + hw, drawY + r * 0.3);
                ctx.stroke();
                // Absorb ring when invulnerable
                if (e.absorbTimer > 0) {
                    const pulse = 0.4 + 0.3 * Math.sin(this.game.elapsedTime * 10);
                    ctx.strokeStyle = `rgba(200, 200, 255, ${pulse})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(drawX, drawY, r + 6, 0, Math.PI * 2);
                    ctx.stroke();
                    // "ABSORB" indicator
                    ctx.fillStyle = `rgba(200, 200, 255, ${pulse})`;
                    ctx.font = 'bold 7px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('ABSORB', drawX, drawY - r - 14);
                }
            } else if (e.type === 'voidsovereign' && !isDying) {
                // Purple void aura
                const pulse = 0.15 + 0.1 * Math.sin(this.game.elapsedTime * 4);
                ctx.fillStyle = `rgba(74, 26, 106, ${pulse})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 8, 0, Math.PI * 2);
                ctx.fill();
                // 6 rotating tentacle spikes
                const rot = this.game.elapsedTime * 1.2;
                ctx.fillStyle = 'rgba(100, 30, 140, 0.5)';
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI * 2 * i) / 6 + rot;
                    const sx = drawX + Math.cos(a) * r * 0.5;
                    const sy = drawY + Math.sin(a) * r * 0.5;
                    const tx = drawX + Math.cos(a) * r * 1.3;
                    const ty = drawY + Math.sin(a) * r * 1.3;
                    const perpX = -Math.sin(a) * r * 0.08;
                    const perpY = Math.cos(a) * r * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(sx + perpX, sy + perpY);
                    ctx.lineTo(tx, ty);
                    ctx.lineTo(sx - perpX, sy - perpY);
                    ctx.closePath();
                    ctx.fill();
                }
                // Inner core eye
                ctx.fillStyle = `rgba(180, 50, 255, ${0.5 + 0.3 * Math.sin(this.game.elapsedTime * 5)})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Burrowed Sand Titan visual — fade body when underground
            if (e.burrowed && !isDying) {
                // Already drawn at full alpha above; draw a "burrowing" dust ring
                ctx.strokeStyle = 'rgba(180, 160, 80, 0.5)';
                ctx.lineWidth = 2;
                const burstR = r * (1.5 - e.burrowRemaining / e.burrowDuration * 0.5);
                ctx.beginPath();
                ctx.arc(drawX, drawY, burstR, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Damage flash overlay
            if (e.damageFlashTimer > 0 && !isDying) {
                ctx.fillStyle = `rgba(255,255,255,${e.damageFlashTimer / 0.1 * 0.6})`;
                this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.fill();
            }
            } // end if (!use3D)

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

            // Freeze effect indicator
            if (e.isFrozen && !isDying) {
                // Cyan tinted overlay (circle in 3D mode, shape in 2D)
                ctx.fillStyle = 'rgba(0, 255, 255, 0.25)';
                if (use3D) { ctx.beginPath(); ctx.arc(drawX, drawY, r, 0, Math.PI * 2); }
                else this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.fill();

                // Cyan ring
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 3, 0, Math.PI * 2);
                ctx.stroke();

                // Ice diamond indicator above
                ctx.fillStyle = '#00ffff';
                const iy = drawY - r - 12;
                ctx.beginPath();
                ctx.moveTo(drawX, iy - 4);
                ctx.lineTo(drawX + 3, iy);
                ctx.lineTo(drawX, iy + 4);
                ctx.lineTo(drawX - 3, iy);
                ctx.closePath();
                ctx.fill();
            }

            // Shock effect indicator
            if (e.isShocked && !isDying) {
                // White flash overlay (circle in 3D mode, shape in 2D)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                if (use3D) { ctx.beginPath(); ctx.arc(drawX, drawY, r, 0, Math.PI * 2); }
                else this.drawEnemyShape(ctx, e, drawX, drawY, r);
                ctx.fill();

                // Electric ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 3, 0, Math.PI * 2);
                ctx.stroke();

                // Mini lightning bolts
                ctx.strokeStyle = '#b388ff';
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const sr = r * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(drawX + Math.cos(a) * sr * 0.3, drawY + Math.sin(a) * sr * 0.3);
                    ctx.lineTo(drawX + Math.cos(a) * sr + (Math.random() - 0.5) * 4, drawY + Math.sin(a) * sr + (Math.random() - 0.5) * 4);
                    ctx.stroke();
                }
            }

            // Armor shred indicator
            if (e.armorShredStacks > 0 && !isDying) {
                const stacks = e.armorShredStacks;
                // Orange-red crack lines radiating from center
                ctx.strokeStyle = `rgba(255,${140 - stacks * 30},0,${0.4 + stacks * 0.15})`;
                ctx.lineWidth = 1 + stacks * 0.3;
                for (let i = 0; i < 3 + stacks; i++) {
                    const a = (Math.PI * 2 * i) / (3 + stacks);
                    const cr = r * (0.4 + Math.random() * 0.4);
                    ctx.beginPath();
                    ctx.moveTo(drawX, drawY);
                    ctx.lineTo(drawX + Math.cos(a) * cr, drawY + Math.sin(a) * cr);
                    ctx.stroke();
                }
                // Broken armor icon above
                ctx.fillStyle = '#ff8800';
                const sy = drawY - r - (e.isFrozen ? 18 : 12);
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`-${stacks}`, drawX, sy);
            }

            // Burn effect indicator
            if (e.burnTimer > 0 && !isDying) {
                // Orange glow ring
                ctx.strokeStyle = 'rgba(255, 120, 0, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 4, 0, Math.PI * 2);
                ctx.stroke();

                // Flickering flame particles
                for (let i = 0; i < 3; i++) {
                    const fa = Math.random() * Math.PI * 2;
                    const fr = r * (0.5 + Math.random() * 0.6);
                    const fx = drawX + Math.cos(fa) * fr;
                    const fy = drawY + Math.sin(fa) * fr - Math.random() * 3;
                    ctx.fillStyle = `rgba(255,${100 + Math.random() * 100 | 0},0,${0.4 + Math.random() * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(fx, fy, 1 + Math.random(), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Wave modifier glow (armored=gray, swift=orange, regen=green)
            if (e.waveModifier && !isDying && e.waveModifier !== 'horde') {
                const modColors = { armored: 'rgba(149,165,166,0.4)', swift: 'rgba(230,126,34,0.4)', regen: 'rgba(46,204,113,0.4)' };
                const mc = modColors[e.waveModifier];
                if (mc) {
                    ctx.strokeStyle = mc;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.arc(drawX, drawY, r + 5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            // Enraged boss glow
            if (e.enraged && !isDying) {
                const pulse = 0.3 + 0.2 * Math.sin(this.game.elapsedTime * 8);
                ctx.fillStyle = `rgba(255, 40, 40, ${pulse})`;
                ctx.beginPath();
                ctx.arc(drawX, drawY, r + 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 0, 0, ${pulse + 0.2})`;
                ctx.lineWidth = 2;
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

                // Shield HP bar (blue, above HP bar)
                if (e.shieldHP > 0 && e.maxShieldHP > 0) {
                    const shieldBarY = barY - 4;
                    const shieldPct = e.shieldHP / e.maxShieldHP;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(barX, shieldBarY, barW, barH);
                    ctx.fillStyle = '#4a90d9';
                    ctx.fillRect(barX, shieldBarY, barW * shieldPct, barH);
                    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(barX, shieldBarY, barW, barH);
                }
            }

            // Restore death spin transform
            if (isDying) {
                ctx.restore();
            }

            ctx.globalAlpha = 1;
        }
    }

    drawTowerTurrets(ctx) {
        const use3D = this.game.use3D && this.game.renderer3d;

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
                    deepfrost: '0,220,255',
                    lightning: '224,64,251',
                    superlightning: '179,136,255',
                    sniper: '255,23,68',
                    firearrow: '255,69,0',
                    bicannon: '255,107,0',
                    missilesniper: '181,212,59',
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

            // ── Transformation animation state ──
            let tProgress = 0;
            let tYOff = 0;
            let tScale = 1;
            const transforming = tower.transformTimer > 0;
            if (transforming) {
                tProgress = 1.0 - Math.min(tower.transformTimer, 1.0);
                // Y offset: lift 0-0.5, hold 0.5-0.7, slam 0.7-1.0
                if (tProgress < 0.5) tYOff = -35 * (tProgress / 0.5);
                else if (tProgress < 0.7) tYOff = -35;
                else tYOff = -35 * Math.pow(1 - (tProgress - 0.7) / 0.3, 0.4); // fast slam
                // Tower scale: grow during flash phase, snap back on slam
                if (tProgress < 0.5) tScale = 1 + tProgress * 0.6;
                else if (tProgress < 0.7) tScale = 1.3 + Math.sin(tProgress * 30) * 0.1;
                else tScale = 1 + 0.3 * Math.max(0, 1 - (tProgress - 0.7) / 0.15);

                // Flash trigger at progress 0.5
                if (tProgress >= 0.5 && !tower._transformFlashed) {
                    tower._transformFlashed = true;
                    if (this.game.postfx.enabled) {
                        this.game.postfx.flash(0.35, 0.3);
                        this.game.postfx.shockwave(cx / CANVAS_W, cy / CANVAS_H, 1.0);
                        this.game.postfx.aberration(0.7, 0.3);
                        this.game.postfx.addFlashLight(cx, cy, 1.0, 0.9, 0.5, 0.2, 1.5, 0.4);
                    } else {
                        this.game.screenFlash = 0.3;
                    }
                    this.game.audio.playExplosion();
                }
                // Slam trigger at progress 0.7
                if (tProgress >= 0.7 && !tower._transformSlammed) {
                    tower._transformSlammed = true;
                    this.game.particles.spawnTransformSlam(cx, cy, tower.color);
                    this.game.triggerShake(10, 0.35);
                    if (this.game.postfx.enabled) {
                        this.game.postfx.shockwave(cx / CANVAS_W, cy / CANVAS_H, 0.5);
                    }
                }
            }

            // Energy aura during entire transformation
            if (transforming && tProgress > 0) {
                ctx.save();
                // Pulsing colored glow ring that tightens
                const auraRadius = tProgress < 0.7
                    ? 50 - tProgress * 40
                    : 10 + (tProgress - 0.7) / 0.3 * 15;
                const auraPulse = 0.3 + Math.sin(tProgress * 25) * 0.15;
                ctx.strokeStyle = tower.color;
                ctx.lineWidth = 3;
                ctx.globalAlpha = auraPulse;
                ctx.beginPath();
                ctx.arc(cx, cy + tYOff, auraRadius, 0, Math.PI * 2);
                ctx.stroke();
                // Inner glow fill
                ctx.fillStyle = tower.color;
                ctx.globalAlpha = auraPulse * 0.2;
                ctx.beginPath();
                ctx.arc(cx, cy + tYOff, auraRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Spiral sparkles (drawn behind turret, during gather phase)
            if (transforming && tProgress > 0 && tProgress < 0.55) {
                const sparkleRadius = 60 * Math.max(0, 1 - tProgress * 2);
                ctx.save();
                for (let si = 0; si < 12; si++) {
                    const sAngle = tProgress * Math.PI * 10 + (si / 12) * Math.PI * 2;
                    const sx = cx + Math.cos(sAngle) * sparkleRadius;
                    const sy = cy + tYOff + Math.sin(sAngle) * sparkleRadius;
                    const sparkleSize = 3 + Math.sin(tProgress * 25 + si * 2) * 1.5;
                    // White-hot core
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
                    ctx.fill();
                    // Colored glow halo
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = tower.color;
                    ctx.beginPath();
                    ctx.arc(sx, sy, sparkleSize * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    // Trailing afterimage
                    const trailAngle = sAngle - 0.4;
                    const trailX = cx + Math.cos(trailAngle) * (sparkleRadius + 5);
                    const trailY = cy + tYOff + Math.sin(trailAngle) * (sparkleRadius + 5);
                    ctx.globalAlpha = 0.25;
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, sparkleSize * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // Bright energy column during flash phase (0.5-0.7)
            if (transforming && tProgress >= 0.5 && tProgress < 0.7) {
                const colAlpha = 1 - (tProgress - 0.5) / 0.2;
                ctx.save();
                ctx.globalAlpha = colAlpha * 0.6;
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx - 4, cy + tYOff - 50, 8, 50 - tYOff);
                ctx.globalAlpha = colAlpha * 0.3;
                ctx.fillStyle = tower.color;
                ctx.fillRect(cx - 10, cy + tYOff - 50, 20, 50 - tYOff);
                ctx.restore();
            }

            // 2D turret shape (skipped in 3D mode — 3D meshes have turrets)
            if (!use3D) {
            const recoilAmount = tower.recoilTimer > 0 ? (tower.recoilTimer / 0.12) * 5 : 0;

            ctx.save();
            ctx.translate(cx, cy + tYOff);
            // Scale up during transformation
            if (transforming && tScale !== 1) {
                ctx.scale(tScale, tScale);
            }
            // Override turret angle with rapid spin during transform phases 1-2
            if (transforming && tProgress > 0 && tProgress < 0.7) {
                ctx.rotate(tProgress * Math.PI * 16);
            } else {
                ctx.rotate(tower.turretAngle);
            }

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
                case 'firearrow':
                    this.drawFireArrowTurret(ctx, recoilShift, tower);
                    break;
                case 'deepfrost':
                    this.drawDeepFrostTurret(ctx, recoilShift, tower);
                    break;
                case 'superlightning':
                    this.drawSuperLightningTurret(ctx, recoilShift, tower);
                    break;
                case 'bicannon':
                    this.drawBiCannonTurret(ctx, recoilShift, tower);
                    break;
                case 'missilesniper':
                    this.drawMissileSniperTurret(ctx, recoilShift, tower);
                    break;
                case 'titan':
                    this.drawTitanTurret(ctx, recoilShift, tower);
                    break;
                default:
                    ctx.fillStyle = tower.color;
                    ctx.fillRect(-6, -4, 12, 8);
                    ctx.fillRect(4 + recoilShift, -2, 10, 4);
                    break;
            }

            ctx.restore();
            } // end if (!use3D)

            // Ground cracks + impact ring after slam (progress 0.7-1.0)
            if (transforming && tProgress >= 0.7) {
                const crackT = (tProgress - 0.7) / 0.3;
                const crackAlpha = 1 - crackT;
                ctx.save();
                // Expanding impact ring
                ctx.strokeStyle = tower.color;
                ctx.lineWidth = 3 * crackAlpha;
                ctx.globalAlpha = crackAlpha * 0.6;
                ctx.beginPath();
                ctx.arc(cx, cy, 15 + crackT * 40, 0, Math.PI * 2);
                ctx.stroke();
                // White inner ring
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 * crackAlpha;
                ctx.globalAlpha = crackAlpha * 0.4;
                ctx.beginPath();
                ctx.arc(cx, cy, 10 + crackT * 25, 0, Math.PI * 2);
                ctx.stroke();
                // Ground crack lines
                ctx.globalAlpha = crackAlpha * 0.85;
                ctx.lineWidth = 2.5;
                for (let ci = 0; ci < 8; ci++) {
                    const cAngle = (Math.PI * 2 * ci) / 8 + ci * 0.2;
                    const cLen = 40 + (ci % 3) * 15;
                    // Crack grows outward with progress
                    const growLen = cLen * Math.min(1, crackT * 3);
                    // White-hot inner stroke
                    ctx.strokeStyle = '#fff';
                    ctx.globalAlpha = crackAlpha * 0.5;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    const midX = cx + Math.cos(cAngle) * growLen * 0.4 + (ci % 2 ? 4 : -4);
                    const midY = cy + Math.sin(cAngle) * growLen * 0.4 + (ci % 2 ? -3 : 3);
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(cx + Math.cos(cAngle) * growLen, cy + Math.sin(cAngle) * growLen);
                    ctx.stroke();
                    // Tower-colored outer stroke
                    ctx.strokeStyle = tower.color;
                    ctx.globalAlpha = crackAlpha * 0.85;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(cx + Math.cos(cAngle) * growLen, cy + Math.sin(cAngle) * growLen);
                    ctx.stroke();
                }
                ctx.restore();
            }

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
            const pillY = cy - (tower.size || 1) * CELL / 2 - pillH - 1;
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
        } else if (tower.type === 'deepfrost') {
            // Deep frost: pulsing deep blue aura with orbiting ice shards
            const pulse = 0.1 + Math.sin(gp * 1.2) * 0.06;
            ctx.fillStyle = `rgba(26,107,138,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting ice crystals — more and larger than frost
            ctx.fillStyle = 'rgba(0,220,255,0.5)';
            for (let i = 0; i < 4; i++) {
                const a = sp * 0.6 + (Math.PI * 2 * i) / 4;
                const r = 16 + Math.sin(gp + i * 1.5) * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(sp * 2.5 + i);
                // Diamond shard
                ctx.beginPath();
                ctx.moveTo(0, -2.5);
                ctx.lineTo(1.5, 0);
                ctx.lineTo(0, 2.5);
                ctx.lineTo(-1.5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        } else if (tower.type === 'superlightning') {
            // Super lightning: intense electric storm field
            const pulse = 0.1 + Math.sin(gp * 2) * 0.07;
            ctx.fillStyle = `rgba(123,63,255,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.fill();

            // Crawling arcs — more intense than regular lightning
            ctx.strokeStyle = `rgba(179,136,255,${0.4 + Math.sin(gp * 4) * 0.2})`;
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 5; i++) {
                const a = sp * 1.3 + (Math.PI * 2 * i) / 5;
                const r = 15;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
                const jx = (Math.random() - 0.5) * 6;
                const jy = (Math.random() - 0.5) * 6;
                ctx.lineTo(cx + Math.cos(a) * r + jx, cy + Math.sin(a) * r + jy);
                ctx.stroke();
            }

            // Orbiting plasma orbs
            ctx.fillStyle = `rgba(200,170,255,${0.5 + Math.sin(gp * 3) * 0.2})`;
            for (let i = 0; i < 3; i++) {
                const a = sp * 0.9 + (Math.PI * 2 * i) / 3;
                const r = 14 + Math.sin(gp + i * 2) * 2;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tower.type === 'bicannon') {
            // Bi-cannon: heat shimmer + shell casings
            if (tower.recoilTimer > 0) {
                const heat = tower.recoilTimer / 0.12;
                ctx.fillStyle = `rgba(255,120,30,${heat * 0.15})`;
                ctx.beginPath();
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.fill();
            }
            // Barrel glow when warmed up (recent fire)
            if (tower.shotCount > 0 && tower.cooldown > 0) {
                ctx.fillStyle = 'rgba(255,140,50,0.08)';
                ctx.beginPath();
                ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tower.type === 'firearrow') {
            // Fire arrow: flickering ember glow
            const flicker = 0.1 + Math.sin(gp * 3) * 0.06 + Math.sin(gp * 7) * 0.03;
            ctx.fillStyle = `rgba(255,100,0,${flicker})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting embers
            ctx.fillStyle = 'rgba(255,140,0,0.5)';
            for (let i = 0; i < 3; i++) {
                const a = sp * 1.2 + (Math.PI * 2 * i) / 3;
                const r = 12 + Math.sin(gp + i * 2) * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (tower.type === 'missilesniper') {
            // Ambient military glow — olive pulsing field
            const ambPulse = 0.06 + Math.sin(gp * 1.2) * 0.04;
            ctx.fillStyle = `rgba(107,142,35,${ambPulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.fill();

            // Green dashed laser sight to target + crosshair circle
            if (tower.target && tower.target.alive) {
                // Double laser sight lines
                ctx.strokeStyle = 'rgba(107,142,35,0.25)';
                ctx.lineWidth = 0.6;
                ctx.setLineDash([4, 5]);
                ctx.beginPath();
                ctx.moveTo(cx - 2, cy);
                ctx.lineTo(tower.target.x - 2, tower.target.y);
                ctx.moveTo(cx + 2, cy);
                ctx.lineTo(tower.target.x + 2, tower.target.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Rotating crosshair on target
                const crossAngle = sp * 2;
                ctx.strokeStyle = 'rgba(107,142,35,0.4)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(tower.target.x, tower.target.y, 9, 0, Math.PI * 2);
                ctx.stroke();
                // Rotating crosshair spokes
                for (let i = 0; i < 4; i++) {
                    const a = crossAngle + (Math.PI / 2) * i;
                    ctx.beginPath();
                    ctx.moveTo(tower.target.x + Math.cos(a) * 5, tower.target.y + Math.sin(a) * 5);
                    ctx.lineTo(tower.target.x + Math.cos(a) * 12, tower.target.y + Math.sin(a) * 12);
                    ctx.stroke();
                }
                // Target lock diamond
                ctx.strokeStyle = 'rgba(150,200,50,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tower.target.x, tower.target.y - 14);
                ctx.lineTo(tower.target.x + 14, tower.target.y);
                ctx.lineTo(tower.target.x, tower.target.y + 14);
                ctx.lineTo(tower.target.x - 14, tower.target.y);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Idle radar sweep — dual lines
                const sweepAngle = sp * 1.5;
                ctx.strokeStyle = `rgba(107,142,35,${0.18 + Math.sin(gp) * 0.1})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(sweepAngle) * 25, cy + Math.sin(sweepAngle) * 25);
                ctx.stroke();
                // Secondary sweep (offset)
                ctx.strokeStyle = `rgba(107,142,35,${0.08 + Math.sin(gp + 1) * 0.05})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(sweepAngle + 0.8) * 20, cy + Math.sin(sweepAngle + 0.8) * 20);
                ctx.stroke();
            }
        } else if (tower.type === 'titan') {
            // Pulsing golden aura
            const pulse = 0.12 + Math.sin(gp * 1.2) * 0.07;
            ctx.fillStyle = `rgba(212,175,55,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 24, 0, Math.PI * 2);
            ctx.fill();

            // 4 orbiting golden crystals (diamond shapes)
            for (let i = 0; i < 4; i++) {
                const a = sp * 0.7 + (Math.PI * 2 * i) / 4;
                const r = 17 + Math.sin(gp + i * 1.5) * 2;
                const px = cx + Math.cos(a) * r;
                const py = cy + Math.sin(a) * r;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255,215,0,0.5)' : 'rgba(255,180,50,0.5)';
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(sp * 2 + i);
                ctx.beginPath();
                ctx.moveTo(0, -3);
                ctx.lineTo(2, 0);
                ctx.lineTo(0, 3);
                ctx.lineTo(-2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Faint golden particle shimmer
            if (Math.random() < 0.3) {
                const shimA = Math.random() * Math.PI * 2;
                const shimR = 8 + Math.random() * 12;
                ctx.fillStyle = 'rgba(255,220,100,0.3)';
                ctx.beginPath();
                ctx.arc(cx + Math.cos(shimA) * shimR, cy + Math.sin(shimA) * shimR, 1, 0, Math.PI * 2);
                ctx.fill();
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

    drawFireArrowTurret(ctx, recoil, tower) {
        // Crossbow body — dark red wooden frame
        ctx.fillStyle = '#5a2020';
        ctx.fillRect(-6, -5, 12, 10);
        ctx.fillStyle = '#8b1a1a';
        ctx.fillRect(-5, -4, 10, 8);

        // Crossbow arms — fiery orange
        ctx.strokeStyle = '#e25822';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 9, -1.3, -0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0.2, 1.3);
        ctx.stroke();

        // Bowstring
        const stringTension = tower.recoilTimer > 0 ? 1 : 3;
        ctx.strokeStyle = '#ffa040';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(-1.3) * 9, Math.sin(-1.3) * 9);
        ctx.quadraticCurveTo(-stringTension, 0, Math.cos(1.3) * 9, Math.sin(1.3) * 9);
        ctx.stroke();

        // Bolt rail — ember red
        ctx.fillStyle = '#d44';
        ctx.fillRect(3 + recoil, -1.5, 11, 3);

        // Fire tip — bright orange
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(15 + recoil, 0);
        ctx.lineTo(11 + recoil, -3);
        ctx.lineTo(11 + recoil, 3);
        ctx.closePath();
        ctx.fill();
        // Tip edge highlight
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(15 + recoil, 0);
        ctx.lineTo(11 + recoil, -3);
        ctx.stroke();

        // Flickering flame at tip
        const flicker = Math.sin(tower.glowPhase * 6) * 2;
        ctx.fillStyle = `rgba(255,150,0,${0.5 + Math.sin(tower.glowPhase * 8) * 0.3})`;
        ctx.beginPath();
        ctx.arc(15 + recoil + flicker * 0.3, flicker * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,220,50,${0.3 + Math.sin(tower.glowPhase * 10) * 0.2})`;
        ctx.beginPath();
        ctx.arc(16 + recoil, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Center mechanism — dark red
        ctx.fillStyle = '#aa3030';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc5040';
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDeepFrostTurret(ctx, recoil, tower) {
        const sp = tower.spinPhase;

        // Rotating outer ice ring (world-space)
        ctx.save();
        ctx.rotate(-tower.turretAngle);
        ctx.strokeStyle = 'rgba(0,220,255,0.35)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
            const a = sp * 0.4 + (Math.PI * 2 * i) / 6;
            const r1 = 10;
            const r2 = 14;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
            ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
            ctx.stroke();
        }
        ctx.restore();

        // Hexagonal body
        ctx.fillStyle = '#145a70';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
            const px = Math.cos(a) * 8;
            const py = Math.sin(a) * 8;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Bright facet (upper-right)
        ctx.fillStyle = '#1a8aaa';
        ctx.beginPath();
        const a0 = -Math.PI / 6;
        const a1 = a0 + Math.PI / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a0) * 8, Math.sin(a0) * 8);
        ctx.lineTo(Math.cos(a1) * 8, Math.sin(a1) * 8);
        ctx.closePath();
        ctx.fill();

        // Inner crystal core
        ctx.fillStyle = '#40c4e0';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 6;
            const px = Math.cos(a) * 4;
            const py = Math.sin(a) * 4;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Pulsing core glow
        const corePulse = 0.5 + Math.sin(tower.glowPhase * 2.5) * 0.3;
        ctx.fillStyle = `rgba(0,255,255,${corePulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        // Rotating ice shard spikes (3 spikes)
        ctx.save();
        ctx.rotate(-tower.turretAngle); // world-space
        ctx.fillStyle = '#00ccee';
        for (let i = 0; i < 3; i++) {
            const a = sp * 0.7 + (Math.PI * 2 * i) / 3;
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(11, -1.5);
            ctx.lineTo(13, 0);
            ctx.lineTo(11, 1.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    drawSuperLightningTurret(ctx, recoil, tower) {
        const sp = tower.spinPhase;

        // Outer capacitor ring (world-space rotation)
        ctx.save();
        ctx.rotate(-tower.turretAngle);
        ctx.strokeStyle = `rgba(179,136,255,${0.3 + Math.sin(tower.glowPhase * 2.5) * 0.15})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, sp, sp + Math.PI * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 12, sp + Math.PI * 0.8, sp + Math.PI * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 12, sp + Math.PI * 1.6, sp + Math.PI * 2.2);
        ctx.stroke();
        ctx.restore();

        // Tesla coil body — octagonal
        const orbPulse = 1 + Math.sin(tower.glowPhase * 2.5) * 0.12;
        ctx.fillStyle = '#4a1a8a';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            const px = Math.cos(a) * 7;
            const py = Math.sin(a) * 7;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner glow layer
        ctx.fillStyle = '#7b3fff';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            const px = Math.cos(a) * 5;
            const py = Math.sin(a) * 5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Bright plasma core
        ctx.fillStyle = '#c4a0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 * orbPulse, 0, Math.PI * 2);
        ctx.fill();

        // Hot white center
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(tower.glowPhase * 3.5) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Conductor rods — five-pronged fork
        ctx.fillStyle = '#3a1070';
        // Top outer prong
        ctx.beginPath();
        ctx.moveTo(4 + recoil, -7);
        ctx.lineTo(15 + recoil, -6);
        ctx.lineTo(15 + recoil, -4);
        ctx.lineTo(4 + recoil, -4);
        ctx.closePath();
        ctx.fill();
        // Upper-mid prong
        ctx.beginPath();
        ctx.moveTo(5 + recoil, -3);
        ctx.lineTo(13 + recoil, -2.5);
        ctx.lineTo(13 + recoil, -1);
        ctx.lineTo(5 + recoil, -1);
        ctx.closePath();
        ctx.fill();
        // Center prong
        ctx.fillStyle = '#5a2aaa';
        ctx.fillRect(5 + recoil, -1, 11, 2);
        // Lower-mid prong
        ctx.fillStyle = '#3a1070';
        ctx.beginPath();
        ctx.moveTo(5 + recoil, 1);
        ctx.lineTo(13 + recoil, 1);
        ctx.lineTo(13 + recoil, 2.5);
        ctx.lineTo(5 + recoil, 3);
        ctx.closePath();
        ctx.fill();
        // Bottom outer prong
        ctx.beginPath();
        ctx.moveTo(4 + recoil, 4);
        ctx.lineTo(15 + recoil, 4);
        ctx.lineTo(15 + recoil, 6);
        ctx.lineTo(4 + recoil, 7);
        ctx.closePath();
        ctx.fill();

        // Prong tip caps — metallic
        ctx.fillStyle = '#ddd';
        const tipPositions = [[-5, 15], [-1.5, 13], [0, 16], [1.5, 13], [5, 15]];
        for (const [ty, tx] of tipPositions) {
            ctx.beginPath();
            ctx.arc(tx + recoil, ty, 1.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Electric arcs between prongs
        ctx.strokeStyle = '#d4aaff';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) {
            const sx = 7 + recoil + i * 2;
            const jx = (Math.random() - 0.5) * 5;
            ctx.beginPath();
            ctx.moveTo(sx, -5);
            ctx.lineTo(sx + jx, -1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx, 5);
            ctx.lineTo(sx + jx, 1);
            ctx.stroke();
        }
        // Cross-arcs between outer and inner prongs
        ctx.strokeStyle = '#b388ff';
        ctx.lineWidth = 0.8;
        const arcX = 10 + recoil;
        ctx.beginPath();
        ctx.moveTo(arcX, -5.5);
        ctx.lineTo(arcX + (Math.random() - 0.5) * 3, -2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arcX, 5.5);
        ctx.lineTo(arcX + (Math.random() - 0.5) * 3, 2);
        ctx.stroke();
    }

    drawBiCannonTurret(ctx, recoil, tower) {
        const activeBarrel = tower.activeBarrel || 0;
        const heavyRecoil = tower.recoilTimer > 0 && tower.shotCount > 0 && (tower.shotCount % (tower.heavyEvery || 4)) === 0;
        const recoilTop = activeBarrel === 0 ? recoil : 0;
        const recoilBot = activeBarrel === 1 ? recoil : 0;

        // Armored chassis body
        ctx.fillStyle = '#4a2e16';
        ctx.beginPath();
        ctx.moveTo(-9, -7);
        ctx.lineTo(4, -8);
        ctx.lineTo(4, 8);
        ctx.lineTo(-9, 7);
        ctx.closePath();
        ctx.fill();

        // Inner plate
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(-7, -6, 10, 12);

        // Armor plate highlight
        ctx.fillStyle = '#8b6240';
        ctx.fillRect(-6, -5, 8, 4);

        // Top barrel
        ctx.fillStyle = '#5a3a1c';
        ctx.beginPath();
        ctx.moveTo(2 + recoilTop, -7);
        ctx.lineTo(15 + recoilTop, -5.5);
        ctx.lineTo(15 + recoilTop, -2.5);
        ctx.lineTo(2 + recoilTop, -2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7a5a3c';
        ctx.fillRect(4 + recoilTop, -5, 9, 1);

        // Bottom barrel
        ctx.fillStyle = '#5a3a1c';
        ctx.beginPath();
        ctx.moveTo(2 + recoilBot, 2);
        ctx.lineTo(15 + recoilBot, 2.5);
        ctx.lineTo(15 + recoilBot, 5.5);
        ctx.lineTo(2 + recoilBot, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7a5a3c';
        ctx.fillRect(4 + recoilBot, 4, 9, 1);

        // Muzzle rings
        ctx.strokeStyle = '#3a2010';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(15 + recoilTop, -4, 3, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(15 + recoilBot, 4, 3, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Muzzle openings
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(15 + recoilTop, -4, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15 + recoilBot, 4, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Central connector bar
        ctx.fillStyle = '#4a2e16';
        ctx.fillRect(3, -2, 4, 4);

        // Rivets
        ctx.fillStyle = '#bbb';
        const rivets = [[-5, -5], [-5, 5], [-2, -5], [-2, 5], [1, -5], [1, 5]];
        for (const [rx, ry] of rivets) {
            ctx.beginPath();
            ctx.arc(rx, ry, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Heavy round glow on active muzzle
        if (heavyRecoil && tower.recoilTimer > 0.04) {
            const t = tower.recoilTimer / 0.12;
            const my = activeBarrel === 0 ? -4 : 4;
            const mr = activeBarrel === 0 ? recoilTop : recoilBot;
            ctx.fillStyle = `rgba(255,60,0,${t * 0.7})`;
            ctx.beginPath();
            ctx.arc(17 + mr, my, 3 + t * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,200,50,${t * 0.5})`;
            ctx.beginPath();
            ctx.arc(17 + mr, my, 1.5 + t * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Smoke wisps
        if (tower.recoilTimer > 0) {
            const t = tower.recoilTimer / 0.12;
            ctx.globalAlpha = t * 0.3;
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            ctx.arc(17 + recoilTop + (1 - t) * 5, -4 + (Math.random() - 0.5) * 3, 1.5 + (1 - t) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(17 + recoilBot + (1 - t) * 5, 4 + (Math.random() - 0.5) * 3, 1.5 + (1 - t) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawMissileSniperTurret(ctx, recoil, tower) {
        // Armored launcher body — compact for 1x1
        ctx.fillStyle = '#3a4a15';
        ctx.beginPath();
        ctx.moveTo(-10, -9);
        ctx.lineTo(4, -11);
        ctx.lineTo(4, 11);
        ctx.lineTo(-10, 9);
        ctx.closePath();
        ctx.fill();

        // Inner armor plate
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(-8, -8, 11, 16);

        // Armor highlight
        ctx.fillStyle = '#8aaa40';
        ctx.fillRect(-6, -6, 8, 6);

        // Quad-tube missile pod (tight 2x2)
        const tubes = [[-4, -5], [4, -5], [-4, 3], [4, 3]];
        for (const [ty, tx] of tubes) {
            // Tube body
            ctx.fillStyle = '#3a4a15';
            ctx.beginPath();
            ctx.moveTo(tx + recoil, ty - 2);
            ctx.lineTo(tx + 14 + recoil, ty - 1.8);
            ctx.lineTo(tx + 14 + recoil, ty + 1.8);
            ctx.lineTo(tx + recoil, ty + 2);
            ctx.closePath();
            ctx.fill();

            // Tube inner highlight
            ctx.fillStyle = '#5a6a2a';
            ctx.fillRect(tx + 1 + recoil, ty - 0.8, 11, 1.6);

            // Muzzle opening
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(tx + 14 + recoil, ty, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Targeting scope
        ctx.fillStyle = '#555';
        ctx.fillRect(-3, -12, 9, 3);
        const lensGlow = 0.5 + Math.sin(tower.glowPhase * 2) * 0.3;
        ctx.fillStyle = `rgba(107,142,35,${lensGlow})`;
        ctx.beginPath();
        ctx.arc(-1, -11, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(150,200,50,${lensGlow * 0.8})`;
        ctx.beginPath();
        ctx.arc(4, -11, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Rotating radar dish (world-space)
        ctx.save();
        ctx.rotate(-tower.turretAngle);
        ctx.strokeStyle = `rgba(107,142,35,${0.25 + Math.sin(tower.glowPhase * 2) * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 14, tower.spinPhase * 0.6, tower.spinPhase * 0.6 + Math.PI * 0.4);
        ctx.stroke();
        ctx.restore();

        // Exhaust vents on back
        ctx.fillStyle = '#444';
        ctx.fillRect(-10, -6, 2, 3);
        ctx.fillRect(-10, 3, 2, 3);
        // Exhaust glow when recently fired
        if (tower.recoilTimer > 0) {
            const heat = tower.recoilTimer / 0.12;
            ctx.fillStyle = `rgba(180,200,60,${heat * 0.4})`;
            ctx.fillRect(-10, -6, 2, 3);
            ctx.fillRect(-10, 3, 2, 3);
        }

        // Rivets
        ctx.fillStyle = '#bbb';
        const rivets = [[-7, -7], [-7, 7], [1, -7], [1, 7]];
        for (const [rx, ry] of rivets) {
            ctx.beginPath();
            ctx.arc(rx, ry, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Exhaust smoke on recoil
        if (tower.recoilTimer > 0) {
            const t = tower.recoilTimer / 0.12;
            ctx.globalAlpha = t * 0.35;
            ctx.fillStyle = '#999';
            for (const [ty, tx] of tubes) {
                ctx.beginPath();
                ctx.arc(tx + 20 + recoil + (1 - t) * 6, ty + (Math.random() - 0.5) * 3, 2 + (1 - t) * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    drawTitanTurret(ctx, recoil, tower) {
        // Wide armored body — trapezoidal gold/amber
        ctx.fillStyle = '#8b7328';
        ctx.beginPath();
        ctx.moveTo(-9, -7);
        ctx.lineTo(4, -9);
        ctx.lineTo(4, 9);
        ctx.lineTo(-9, 7);
        ctx.closePath();
        ctx.fill();

        // Inner body highlight
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(-7, -5);
        ctx.lineTo(2, -7);
        ctx.lineTo(2, 7);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill();

        // Armor rivets
        ctx.fillStyle = '#a08020';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-5 + i * 4, -6 + i * 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-5 + i * 4, 6 - i * 0.5, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Thick barrel
        ctx.fillStyle = '#8b7328';
        ctx.fillRect(1 + recoil, -5, 13, 10);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(3 + recoil, -3, 9, 6);

        // Gold energy veins on barrel
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(4 + recoil, -1.5);
        ctx.lineTo(11 + recoil, -2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4 + recoil, 1.5);
        ctx.lineTo(11 + recoil, 2);
        ctx.stroke();

        // Energy ring near muzzle
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(13 + recoil, 0, 5, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();

        // Inner ring glow
        const ringGlow = 0.5 + Math.sin(tower.glowPhase * 2) * 0.3;
        ctx.strokeStyle = `rgba(255,200,50,${ringGlow})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(13 + recoil, 0, 3.5, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();

        // Muzzle glow
        const muzzleGlow = 0.4 + Math.sin(tower.glowPhase * 3) * 0.2;
        ctx.fillStyle = `rgba(255,215,0,${muzzleGlow})`;
        ctx.beginPath();
        ctx.arc(15 + recoil, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Recoil energy burst — gold flash
        if (tower.recoilTimer > 0) {
            const t = tower.recoilTimer / 0.12;
            ctx.globalAlpha = t * 0.6;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(16 + recoil, 0, 3 + (1 - t) * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // ── Ambient Effects ──────────────────────────────────────────

    updateAmbients(dt) {
        this.ambientSpawnTimer -= dt;
        if (this.ambientSpawnTimer <= 0 && this.ambients.length < 40) {
            this.spawnAmbient();
            const env = (this.game.map && this.game.map.def && this.game.map.def.environment) || 'forest';
            const rate = env === 'forest' ? 0.18 : 0.15; // ~6/sec forest, ~7/sec others
            this.ambientSpawnTimer = rate;
        }
        for (let i = this.ambients.length - 1; i >= 0; i--) {
            const p = this.ambients[i];
            p.life -= dt;
            if (p.life <= 0) { this.ambients.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.age += dt;
        }
    }

    spawnAmbient() {
        const atmo = this.game.atmosphereParticles;
        if (atmo) {
            this._spawnAtmoAmbient(atmo);
            return;
        }
        const env = (this.game.map && this.game.map.def && this.game.map.def.environment) || 'forest';
        const r = Math.random();
        let p;

        if (env === 'desert') {
            if (r < 0.7) {
                // Sand wisp — light/white so it contrasts against tan background
                const life = 5 + Math.random() * 3;
                const colors = ['#fff8e0', '#ffe8b0', '#f5e0c0'];
                p = {
                    type: 'sand', x: -10, y: Math.random() * CANVAS_H,
                    vx: 60 + Math.random() * 60, vy: 0,
                    life, maxLife: life, size: 3 + Math.random(),
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            } else {
                // Dust puff — darker brown for contrast
                const life = 2 + Math.random();
                p = {
                    type: 'dust', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 4,
                    color: '#8a6a30', phase: 0, age: 0
                };
            }
        } else if (env === 'lava') {
            if (r < 0.7) {
                // Ember
                const life = 3 + Math.random() * 2;
                const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00'];
                p = {
                    type: 'ember', x: Math.random() * CANVAS_W, y: CANVAS_H + 5,
                    vx: (Math.random() - 0.5) * 30, vy: -(30 + Math.random() * 30),
                    life, maxLife: life, size: 2.5 + Math.random() * 1.5,
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            } else {
                // Bubble
                const life = 1.5 + Math.random();
                p = {
                    type: 'bubble', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 3,
                    color: '#ff6030', phase: 0, age: 0
                };
            }
        } else if (env === 'ruins') {
            if (r < 0.7) {
                // Dust motes — gray/tan floating particles
                const life = 4 + Math.random() * 3;
                const colors = ['#a0a0a0', '#b0a890', '#908880', '#c0b8a0'];
                p = {
                    type: 'dust', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 3 + Math.random(),
                    color: colors[Math.random() * colors.length | 0], phase: 0, age: 0
                };
            } else {
                // Spirit wisp — blue-green firefly-like glow
                const life = 5 + Math.random() * 3;
                const colors = ['#60c0a0', '#80d0b0', '#50b0c0', '#70e0c0'];
                p = {
                    type: 'firefly', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 2.5 + Math.random() * 1.5,
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            }
        } else if (env === 'void') {
            if (r < 0.7) {
                // Purple energy wisp — slow horizontal drift
                const life = 5 + Math.random() * 3;
                const colors = ['#9b59b6', '#8e44ad', '#c39bd3', '#7d3c98'];
                p = {
                    type: 'sand', x: -10, y: Math.random() * CANVAS_H,
                    vx: 30 + Math.random() * 30, vy: 0,
                    life, maxLife: life, size: 3 + Math.random(),
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            } else {
                // White/cyan spark — rising upward
                const life = 3 + Math.random() * 2;
                const colors = ['#e0d0ff', '#c0e0ff', '#ffffff', '#d0c0ff'];
                p = {
                    type: 'ember', x: Math.random() * CANVAS_W, y: CANVAS_H + 5,
                    vx: (Math.random() - 0.5) * 20, vy: -(20 + Math.random() * 25),
                    life, maxLife: life, size: 2 + Math.random() * 1.5,
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            }
        } else if (env === 'sky') {
            if (r < 0.7) {
                // Cloud wisp — white/pale blue drifting right
                const life = 5 + Math.random() * 3;
                const colors = ['#ffffff', '#e8f0ff', '#d0e4ff', '#f0f8ff'];
                p = {
                    type: 'sand', x: -10, y: Math.random() * CANVAS_H,
                    vx: 40 + Math.random() * 40, vy: 0,
                    life, maxLife: life, size: 3 + Math.random(),
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            } else {
                // Golden sparkle — twinkling gold point
                const life = 4 + Math.random() * 2;
                const colors = ['#ffd700', '#ffcc33', '#ffe066', '#ffb300'];
                p = {
                    type: 'firefly', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 2 + Math.random() * 1.5,
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            }
        } else {
            // Forest (default)
            if (r < 0.7) {
                // Leaf
                const life = 8 + Math.random() * 4;
                const colors = ['#5a8a3c', '#7a9a4c', '#8b6e3c', '#c07030'];
                p = {
                    type: 'leaf', x: Math.random() * CANVAS_W, y: -5,
                    vx: 0, vy: 20 + Math.random() * 20,
                    life, maxLife: life, size: 5 + Math.random() * 3,
                    color: colors[Math.random() * colors.length | 0], phase: Math.random() * Math.PI * 2, age: 0
                };
            } else {
                // Firefly
                const life = 4 + Math.random() * 2;
                p = {
                    type: 'firefly', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 2.5 + Math.random() * 1.5,
                    color: '#aaff44', phase: Math.random() * Math.PI * 2, age: 0
                };
            }
        }
        if (p) this.ambients.push(p);
    }

    _spawnAtmoAmbient(atmo) {
        const r = Math.random();
        const spec = r < atmo.primary.weight ? atmo.primary : atmo.secondary;
        const color = spec.colors[Math.random() * spec.colors.length | 0];
        let p;
        switch (spec.behavior) {
            case 'leaf': {
                const life = 8 + Math.random() * 4;
                p = { type: 'leaf', x: Math.random() * CANVAS_W, y: -5,
                    vx: 0, vy: 20 + Math.random() * 20,
                    life, maxLife: life, size: 5 + Math.random() * 3,
                    color, phase: Math.random() * Math.PI * 2, age: 0 };
                break;
            }
            case 'firefly': {
                const life = 4 + Math.random() * 2;
                p = { type: 'firefly', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 2.5 + Math.random() * 1.5,
                    color, phase: Math.random() * Math.PI * 2, age: 0 };
                break;
            }
            case 'sand': {
                const life = 5 + Math.random() * 3;
                p = { type: 'sand', x: -10, y: Math.random() * CANVAS_H,
                    vx: 60 + Math.random() * 60, vy: 0,
                    life, maxLife: life, size: 3 + Math.random(),
                    color, phase: Math.random() * Math.PI * 2, age: 0 };
                break;
            }
            case 'dust': {
                const life = 2 + Math.random();
                p = { type: 'dust', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 4,
                    color, phase: 0, age: 0 };
                break;
            }
            case 'ember': {
                const life = 3 + Math.random() * 2;
                p = { type: 'ember', x: Math.random() * CANVAS_W, y: CANVAS_H + 5,
                    vx: (Math.random() - 0.5) * 30, vy: -(30 + Math.random() * 30),
                    life, maxLife: life, size: 2.5 + Math.random() * 1.5,
                    color, phase: Math.random() * Math.PI * 2, age: 0 };
                break;
            }
            case 'bubble': {
                const life = 1.5 + Math.random();
                p = { type: 'bubble', x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                    vx: 0, vy: 0,
                    life, maxLife: life, size: 3,
                    color, phase: 0, age: 0 };
                break;
            }
        }
        if (p) this.ambients.push(p);
    }

    drawAmbients(ctx) {
        for (const p of this.ambients) {
            const t = p.age / p.maxLife;
            // Fade in first 10%, fade out last 30%
            let alpha = 1;
            if (t < 0.1) alpha = t / 0.1;
            else if (t > 0.7) alpha = (1 - t) / 0.3;

            switch (p.type) {
                case 'leaf': {
                    alpha *= 0.55;
                    const wobbleX = Math.sin(p.age * 1.5 + p.phase) * 20;
                    ctx.save();
                    ctx.translate(p.x + wobbleX, p.y);
                    ctx.rotate(p.age * 0.8 + p.phase);
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    break;
                }
                case 'firefly': {
                    const bobX = Math.sin(p.age * 2 + p.phase) * 12;
                    const bobY = Math.cos(p.age * 1.5 + p.phase * 1.3) * 10;
                    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.age * 4 + p.phase));
                    ctx.globalAlpha = alpha * pulse;
                    // Outer glow
                    ctx.fillStyle = 'rgba(170,255,68,0.35)';
                    ctx.beginPath();
                    ctx.arc(p.x + bobX, p.y + bobY, p.size * 4, 0, Math.PI * 2);
                    ctx.fill();
                    // Inner dot
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x + bobX, p.y + bobY, p.size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    break;
                }
                case 'sand': {
                    alpha *= 0.45 + 0.15 * Math.sin(p.age + p.phase);
                    const waveY = Math.sin(p.age * 2 + p.phase) * 6;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    for (let i = 0; i < 4; i++) {
                        ctx.fillRect(p.x + i * 6, p.y + waveY + i * 2, 3, 2);
                    }
                    ctx.globalAlpha = 1;
                    break;
                }
                case 'dust': {
                    const expand = 5 + (1 - p.life / p.maxLife) * 10;
                    alpha *= 0.55 * (p.life / p.maxLife);
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, expand, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    break;
                }
                case 'ember': {
                    alpha *= 0.7;
                    // Outer glow
                    ctx.globalAlpha = alpha * 0.4;
                    ctx.fillStyle = '#ff8800';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                    ctx.fill();
                    // Inner bright core
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    break;
                }
                case 'bubble': {
                    const grow = 4 + (1 - p.life / p.maxLife) * 6;
                    const pop = p.life / p.maxLife;
                    alpha *= pop * 0.65;
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, grow, 0, Math.PI * 2);
                    ctx.fill();
                    // Highlight
                    ctx.fillStyle = '#ffaa40';
                    ctx.globalAlpha = alpha * 1.2;
                    ctx.beginPath();
                    ctx.arc(p.x - grow * 0.25, p.y - grow * 0.25, grow * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                    break;
                }
            }
        }
    }

    drawScorchZones(ctx) {
        for (const zone of this.game.scorchZones) {
            const fade = zone.timer / zone.maxTimer;
            // Outer glow
            ctx.fillStyle = `rgba(255,80,0,${fade * 0.12})`;
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner scorch
            ctx.fillStyle = `rgba(200,50,0,${fade * 0.18})`;
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Flickering embers
            ctx.fillStyle = `rgba(255,150,0,${fade * 0.3})`;
            for (let i = 0; i < 4; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.random() * zone.radius * 0.8;
                ctx.beginPath();
                ctx.arc(zone.x + Math.cos(a) * r, zone.y + Math.sin(a) * r, 1 + Math.random(), 0, Math.PI * 2);
                ctx.fill();
            }

            // Edge ring
            ctx.strokeStyle = `rgba(255,100,0,${fade * 0.25})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawProjectiles(ctx) {
        for (const p of this.game.projectiles.projectiles) {
            if (!p.alive) continue;

            const color = p.getColor();

            // Trail
            if (p.trail.length > 1) {
                const trailWidth = p.towerType === 'cannon' ? 2
                    : p.towerType === 'bicannon' ? (p.isHeavy ? 3 : 2)
                    : p.towerType === 'missilesniper' ? 2
                    : p.towerType === 'lightning' ? 1.5
                    : p.towerType === 'superlightning' ? 2
                    : p.towerType === 'sniper' ? 0.5
                    : p.towerType === 'firearrow' ? 1
                    : 1;

                ctx.strokeStyle = color;
                ctx.lineWidth = trailWidth;
                ctx.globalAlpha = 0.4;

                if (p.towerType === 'lightning' || p.towerType === 'superlightning') {
                    // Jittery electric trail
                    const jitter = p.towerType === 'superlightning' ? 6 : 4;
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        const jx = (Math.random() - 0.5) * jitter;
                        const jy = (Math.random() - 0.5) * jitter;
                        ctx.lineTo(p.trail[i].x + jx, p.trail[i].y + jy);
                    }
                    ctx.stroke();
                    // Super lightning: second faint trail layer
                    if (p.towerType === 'superlightning') {
                        ctx.strokeStyle = '#d4aaff';
                        ctx.globalAlpha = 0.2;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(p.trail[0].x, p.trail[0].y);
                        for (let i = 1; i < p.trail.length; i++) {
                            ctx.lineTo(p.trail[i].x + (Math.random() - 0.5) * 8, p.trail[i].y + (Math.random() - 0.5) * 8);
                        }
                        ctx.stroke();
                    }
                } else if (p.towerType === 'firearrow' && p.trail.length >= 2) {
                    // Orange-to-red gradient trail
                    ctx.strokeStyle = '#ff4500';
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        ctx.lineTo(p.trail[i].x, p.trail[i].y);
                    }
                    ctx.stroke();
                } else if (p.towerType === 'missilesniper' && p.trail.length >= 2) {
                    // Smoke-gray trail with slight jitter
                    ctx.strokeStyle = '#999';
                    ctx.beginPath();
                    ctx.moveTo(p.trail[0].x, p.trail[0].y);
                    for (let i = 1; i < p.trail.length; i++) {
                        const jx = (Math.random() - 0.5) * 3;
                        const jy = (Math.random() - 0.5) * 3;
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
                case 'firearrow':
                    this.drawFireArrowProjectile(ctx, p, color);
                    break;
                case 'superlightning':
                    this.drawSuperLightningProjectile(ctx, p, color);
                    break;
                case 'bicannon':
                    this.drawBiCannonProjectile(ctx, p, color);
                    break;
                case 'missilesniper':
                    this.drawMissileSniperProjectile(ctx, p, color);
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

    drawFireArrowProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Fire glow behind
        ctx.fillStyle = 'rgba(255,100,0,0.2)';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Shaft — dark red
        ctx.strokeStyle = '#8b1a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(2, 0);
        ctx.stroke();

        // Arrowhead — bright orange
        ctx.fillStyle = '#ff4500';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(1, -2.5);
        ctx.lineTo(1, 2.5);
        ctx.closePath();
        ctx.fill();

        // Fletching — orange/red
        ctx.fillStyle = '#e25822';
        ctx.globalAlpha = 0.7;
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

        // Fire glow at tip
        ctx.fillStyle = 'rgba(255,200,50,0.6)';
        ctx.beginPath();
        ctx.arc(4, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawSuperLightningProjectile(ctx, p, color) {
        // Electric glow halo — larger and brighter
        ctx.fillStyle = 'rgba(123,63,255,0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Zigzag bolt shape — larger
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(3, -1.5);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-1, 1.5);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-1, 4);
        ctx.lineTo(-3, 1.5);
        ctx.lineTo(2, 3);
        ctx.lineTo(1, -1);
        ctx.closePath();
        ctx.fill();

        // White-hot core
        ctx.fillStyle = `rgba(255,255,255,0.7)`;
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mini sparks orbiting
        ctx.fillStyle = '#d4aaff';
        for (let i = 0; i < 2; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 4 + Math.random() * 3;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawBiCannonProjectile(ctx, p, color) {
        if (p.isHeavy) {
            // Heavy round — larger, glowing
            // Outer glow
            ctx.fillStyle = 'rgba(255,60,0,0.25)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Motion blur
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = 'rgba(100,40,10,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Dark ball — bigger
            ctx.fillStyle = '#3a1a08';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Orange-red highlight
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(p.x - 1, p.y - 1, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Hot core
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(p.x - 0.5, p.y - 0.5, 1.2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Normal round — like cannon but slightly different color
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = 'rgba(80,40,15,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#4a2a10';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawMissileSniperProjectile(ctx, p, color) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Exhaust flame behind
        ctx.fillStyle = 'rgba(255,140,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-10, -3);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,50,0.4)';
        ctx.beginPath();
        ctx.arc(-8, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        // Missile body — elongated olive
        ctx.fillStyle = '#5a7020';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(4, -3);
        ctx.lineTo(-6, -2.5);
        ctx.lineTo(-6, 2.5);
        ctx.lineTo(4, 3);
        ctx.closePath();
        ctx.fill();

        // Body highlight
        ctx.fillStyle = '#7a9a30';
        ctx.fillRect(-4, -1.5, 8, 1.5);

        // Nose cone
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(7, -2);
        ctx.lineTo(7, 2);
        ctx.closePath();
        ctx.fill();

        // Tail fins
        ctx.fillStyle = '#4a5a18';
        ctx.beginPath();
        ctx.moveTo(-6, -2.5);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-5, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 2.5);
        ctx.lineTo(-8, 5);
        ctx.lineTo(-5, 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawUIOverlay() {
        const ctx = this.uiCtx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        const waves = this.game.waves;

        const input = this.game.input;

        // Hover cell highlight
        if (input.hoverGx >= 0 && input.hoverGy >= 0) {
            const hx = input.hoverGx * CELL;
            const hy = input.hoverGy * CELL;

            if (input.selectedTowerType) {
                // Placement preview
                const def = TOWER_TYPES[input.selectedTowerType];
                const sz = def.size || 1;
                const canPlace = this.game.towers.canPlace(input.hoverGx, input.hoverGy, input.selectedTowerType);

                // Highlight all cells in the size x size block
                for (let dx = 0; dx < sz; dx++) {
                    for (let dy = 0; dy < sz; dy++) {
                        const cellGx = input.hoverGx + dx;
                        const cellGy = input.hoverGy + dy;
                        const cellOk = this.game.map.isBuildable(cellGx, cellGy)
                            && !this.game.towers.towerGrid.has(`${cellGx},${cellGy}`);
                        ctx.fillStyle = cellOk ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)';
                        ctx.fillRect(cellGx * CELL, cellGy * CELL, CELL, CELL);
                    }
                }

                if (canPlace) {
                    // Range preview — centered on block center
                    const range = def.levels[0].range * CELL;
                    const cx = hx + sz * CELL / 2;
                    const cy = hy + sz * CELL / 2;
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
            const tSz = (tower.size || 1) * CELL;

            // Selection box
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx, ty, tSz, tSz);

            // Range circle
            ctx.strokeStyle = 'rgba(255,215,0,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range * CELL, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Next-wave preview (shown between waves + 1s into the wave)
        const showPreview = this.game.waves.betweenWaves || (this.game.waves.spawning && this.game.waveElapsed < 1.0);
        if (showPreview && this.game.state === 'PLAYING') {
            const preview = this.game.waves.getNextWavePreview();
            if (preview) {
                // Fade out during the overlap second
                const previewAlpha = this.game.waves.betweenWaves ? 1.0 : Math.max(0, 1.0 - this.game.waveElapsed);
                ctx.globalAlpha = previewAlpha;

                const entries = Object.entries(preview);
                const colW = 140;
                const totalW = entries.length * colW;
                const startX = CANVAS_W / 2 - totalW / 2;
                const baseY = CANVAS_H - 80;

                // Background panel
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                const bgPad = 16;
                const panelH = 78;
                const panelTop = baseY - 20;
                ctx.beginPath();
                const cr = 8;
                ctx.moveTo(startX - bgPad + cr, panelTop);
                ctx.lineTo(startX + totalW + bgPad - cr, panelTop);
                ctx.arcTo(startX + totalW + bgPad, panelTop, startX + totalW + bgPad, panelTop + cr, cr);
                ctx.lineTo(startX + totalW + bgPad, panelTop + panelH - cr);
                ctx.arcTo(startX + totalW + bgPad, panelTop + panelH, startX + totalW + bgPad - cr, panelTop + panelH, cr);
                ctx.lineTo(startX - bgPad + cr, panelTop + panelH);
                ctx.arcTo(startX - bgPad, panelTop + panelH, startX - bgPad, panelTop + panelH - cr, cr);
                ctx.lineTo(startX - bgPad, panelTop + cr);
                ctx.arcTo(startX - bgPad, panelTop, startX - bgPad + cr, panelTop, cr);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Label
                ctx.save();
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText('NEXT WAVE', CANVAS_W / 2, panelTop - 4);
                ctx.restore();

                // Enemy entries with actual shapes
                const fakeEnemy = { type: '', angle: 0 };
                for (let i = 0; i < entries.length; i++) {
                    const [type, count] = entries[i];
                    const def = ENEMY_TYPES[type];
                    if (!def) continue;
                    const cx = startX + i * colW + colW / 2;
                    const cy = baseY + 8;
                    const iconR = 14;

                    // Draw actual enemy shape
                    fakeEnemy.type = type;
                    ctx.fillStyle = def.color;
                    this.drawEnemyShape(ctx, fakeEnemy, cx - 30, cy, iconR);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Count (large bold)
                    ctx.save();
                    ctx.font = 'bold 26px monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#fff';
                    ctx.fillText(`x${count}`, cx - 12, cy - 2);
                    // Type name below
                    ctx.font = 'bold 14px monospace';
                    ctx.fillStyle = 'rgba(255,255,255,0.8)';
                    ctx.fillText(def.name, cx - 12, cy + 16);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Admin sidebar
        this.updateAdminPanel();
    }

    updateAdminPanel() {
        const el = document.getElementById('admin-panel');
        if (!el) return;
        if (!this.game.adminMode) {
            el.classList.remove('visible');
            return;
        }
        el.classList.add('visible');

        const fmtTime = (s) => {
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        const mapDef = this.game.map.def;
        const worldName = mapDef ? mapDef.name : '—';
        const worldHpMul = mapDef ? mapDef.worldHpMultiplier : 1;
        const wave = this.game.waves.currentWave;
        const waveHpScale = wave > 0 ? getWaveHPScale(wave) : 0;
        const finalMul = worldHpMul * waveHpScale;

        const spawning = this.game.waves.spawning;
        const between = this.game.waves.betweenWaves;
        const status = spawning ? 'Spawning' : between ? 'Between' : 'Fighting';

        const diffColors = {
            TRIVIAL: '#3498db', EASY: '#2ecc71', FAIR: '#f1c40f',
            HARD: '#e67e22', BRUTAL: '#e74c3c',
        };

        const report = this.game.debug.getLastReport();
        let reportHTML;
        if (!report) {
            reportHTML = `<div class="ap-row" style="color:#555;font-style:italic">No report yet</div>`;
        } else {
            const ts = report.timestamp ? new Date(report.timestamp).toLocaleTimeString() : '';
            const dc = diffColors[report.difficulty] || '#ccc';
            reportHTML = `
<div class="ap-report-badge" style="border-color:${dc}">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span style="color:${dc};font-weight:700;font-size:14px">${report.difficulty}</span>
    <span style="color:#888;font-size:10px">${ts}</span>
  </div>
  <div style="color:#fff;font-size:13px;font-weight:600;margin:4px 0">${report.world} W${report.wave}</div>
</div>
<div class="ap-row">Time: <span style="color:#fff">${fmtTime(report.duration)}</span> (${report.duration.toFixed(1)}s)</div>
<div class="ap-row">Spawned: <span style="color:#fff">${report.spawned}</span> Killed: <span style="color:#2ecc71">${report.killed}</span></div>
<div class="ap-row">Leaked: <span style="color:${report.leaked > 0 ? '#e74c3c' : '#2ecc71'}">${report.leaked}</span> Lives-: <span style="color:${report.livesLost > 0 ? '#e74c3c' : '#2ecc71'}">${report.livesLost}</span></div>
<div class="ap-row">Overkill: <span style="color:#f1c40f">${report.overkill.toFixed(2)}x</span> Kill: <span style="color:#fff">${(report.killRate * 100).toFixed(0)}%</span></div>
<div class="ap-row">DPS: <span style="color:#fff">${report.dpsActual.toFixed(1)}</span> / ${report.dpsTheory.toFixed(1)} (<span style="color:#3498db">${(report.efficiency * 100).toFixed(0)}%</span>)</div>
<div class="ap-row">Towers: <span style="color:#fff">${report.towers}</span></div>
<div class="ap-row">Gold: <span style="color:#f1c40f">${report.goldStart}</span> → <span style="color:#f1c40f">${report.goldEnd}</span></div>
<div class="ap-row">Spent: ${report.goldSpent} Earned: ${report.goldEarned}</div>`;
        }

        el.innerHTML = `
<div class="ap-section">
  <div class="ap-header" style="color:#f1c40f">Actions</div>
  <div class="ap-row"><span class="ap-key">K</span><span style="color:#e74c3c">Kill All</span></div>
  <div class="ap-row"><span class="ap-key">W</span><span style="color:#e67e22">Set Wave</span></div>
  <div class="ap-row"><span class="ap-key">C</span><span style="color:#888">Clear Log</span></div>
  <div class="ap-row"><span class="ap-key">R</span><span style="color:#888">Reset Progress</span></div>
  <div class="ap-row"><span class="ap-key">D</span><span style="color:#888">Download CSV</span></div>
</div>
<div class="ap-section">
  <div class="ap-header" style="color:#9b59b6">Difficulty</div>
  <div class="ap-row" style="color:#fff">${worldName} W${wave}</div>
  <div class="ap-row" style="color:#f1c40f">HP: ${worldHpMul}×${waveHpScale.toFixed(1)} = ${finalMul.toFixed(1)}</div>
  ${this.game.waves.modifierDef ? `<div class="ap-row">Modifier: <span style="color:${this.game.waves.modifierDef.color};font-weight:700">${this.game.waves.modifierDef.name}</span> <span style="color:#888">${this.game.waves.modifierDef.desc}</span></div>` : `<div class="ap-row" style="color:#555">No modifier</div>`}
</div>
<div class="ap-section">
  <div class="ap-header" style="color:#e0e0e0">Realtime</div>
  <div class="ap-row">Game: ${fmtTime(this.game.elapsedTime)}</div>
  <div class="ap-row">Wave: ${fmtTime(this.game.waveElapsed)}</div>
  <div class="ap-row">Speed: ${this.game.speed}x  ${status}</div>
</div>
<hr class="ap-divider">
<div class="ap-section">
  <div class="ap-header" style="color:#e67e22">Wave Report</div>
  ${reportHTML}
</div>`;
    }
}
