import { HERO_STATS, CELL, CANVAS_W, CANVAS_H } from './constants.js';
import { distance, angle } from './utils.js';

export class Hero {
    constructor(game) {
        this.game = game;

        // Position
        this.x = 0;
        this.y = 0;
        this.spawnX = 0;
        this.spawnY = 0;

        // Movement booleans (set by input)
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;

        // State
        this.alive = false;
        this.hp = 0;
        this.maxHP = HERO_STATS.maxHP;
        this.levelScale = 1;
        this.turretAngle = 0;

        // Auto-attack
        this.attackCooldown = 0;

        // Contact damage
        this.contactTimer = 0;
        this.damageFlashTimer = 0;

        // Death / respawn
        this.respawnTimer = 0;
        this.deathAnimTimer = 0;
        this.active = false; // true once init'd during gameplay

        // Q: AoE Stun
        this.stunCooldown = 0;
        this.stunFlashTimer = 0;

        // E: Gold Magnet
        this.magnetCooldown = 0;
        this.magnetActive = false;
        this.magnetTimer = 0;
    }

    init(map) {
        // Spawn near the castle — use shared suffix for split maps (both forks converge there)
        const layout = map.layout;
        let spawnPt;
        if (layout.paths && layout.paths.suffix.length >= 2) {
            const sp = layout.paths.suffix[layout.paths.suffix.length - 2];
            spawnPt = { x: sp.x * CELL + CELL / 2, y: sp.y * CELL + CELL / 2 };
        } else {
            const path = map.path;
            spawnPt = path.length >= 2 ? path[path.length - 2] : path[path.length - 1];
        }
        this.spawnX = spawnPt.x;
        this.spawnY = spawnPt.y;
        this.x = this.spawnX;
        this.y = this.spawnY;

        // Scale hero stats with wave (2% per wave above unlock)
        const wavesAbove = Math.max(0, this.game.waves.currentWave - HERO_STATS.unlockWave);
        this.levelScale = 1 + wavesAbove * 0.02;

        this.alive = true;
        this.active = true;
        this.hp = Math.round(HERO_STATS.maxHP * this.levelScale);
        this.maxHP = this.hp;
        this.turretAngle = Math.PI; // face left (towards enemies)

        this.attackCooldown = 0;
        this.contactTimer = 0;
        this.damageFlashTimer = 0;
        this.respawnTimer = 0;
        this.deathAnimTimer = 0;

        this.stunCooldown = 0;
        this.stunFlashTimer = 0;
        this.magnetCooldown = 0;
        this.magnetActive = false;
        this.magnetTimer = 0;

        this.clearMovement();
    }

    reset() {
        this.alive = false;
        this.active = false;
        this.hp = 0;
        this.clearMovement();
        this.attackCooldown = 0;
        this.contactTimer = 0;
        this.damageFlashTimer = 0;
        this.respawnTimer = 0;
        this.deathAnimTimer = 0;
        this.stunCooldown = 0;
        this.stunFlashTimer = 0;
        this.magnetCooldown = 0;
        this.magnetActive = false;
        this.magnetTimer = 0;
    }

    clearMovement() {
        this.moveUp = false;
        this.moveDown = false;
        this.moveLeft = false;
        this.moveRight = false;
    }

    update(dt) {
        if (!this.active) return;

        // Cooldown timers (always tick, even when dead)
        if (this.stunCooldown > 0) this.stunCooldown -= dt;
        if (this.magnetCooldown > 0) this.magnetCooldown -= dt;
        if (this.stunFlashTimer > 0) this.stunFlashTimer -= dt;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;

        // Magnet duration
        if (this.magnetActive) {
            this.magnetTimer -= dt;
            if (this.magnetTimer <= 0) {
                this.magnetActive = false;
            }
        }

        // Dead — respawn timer
        if (!this.alive) {
            this.deathAnimTimer += dt;
            if (this.deathAnimTimer > 0.5) {
                this.respawnTimer -= dt;
                if (this.respawnTimer <= 0) {
                    this.respawn();
                }
            }
            return;
        }

        // Movement
        this.updateMovement(dt);

        // Auto-attack
        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
            this.findAndAttack();
        }

        // Contact damage from enemies
        this.contactTimer -= dt;
        if (this.contactTimer <= 0) {
            this.checkContactDamage();
            this.contactTimer = HERO_STATS.contactTick;
        }
    }

    updateMovement(dt) {
        let dx = 0, dy = 0;
        if (this.moveUp) dy -= 1;
        if (this.moveDown) dy += 1;
        if (this.moveLeft) dx -= 1;
        if (this.moveRight) dx += 1;

        if (dx === 0 && dy === 0) return;

        // Normalize diagonal
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;

        const speed = HERO_STATS.speed * dt;
        this.x += dx * speed;
        this.y += dy * speed;

        // Clamp to canvas
        const r = HERO_STATS.radius;
        this.x = Math.max(r, Math.min(CANVAS_W - r, this.x));
        this.y = Math.max(r, Math.min(CANVAS_H - r, this.y));
    }

    findAndAttack() {
        const game = this.game;
        const rangePx = HERO_STATS.range * CELL;
        let closest = null;
        let closestDist = Infinity;

        for (const e of game.enemies.enemies) {
            if (!e.alive) continue;
            const d = distance(this, e);
            if (d <= rangePx && d < closestDist) {
                closestDist = d;
                closest = e;
            }
        }

        if (!closest) return;

        this.attackCooldown = HERO_STATS.fireRate;
        this.turretAngle = angle(this, closest);

        // Create pseudo-tower object for Projectile constructor
        const pseudoTower = {
            x: this.x,
            y: this.y,
            type: 'hero',
            damage: Math.round(HERO_STATS.damage * this.levelScale),
            projSpeed: HERO_STATS.projSpeed,
            splashRadius: 0,
            slowFactor: 0,
            slowDuration: 0,
            chainCount: 0,
            chainRange: 0,
            chainDecay: 0,
            critChance: 0,
            critMulti: 0,
            burnDamage: 0,
            burnDuration: 0,
            forkCount: 0,
            forkDepth: 0,
            overcharge: 0,
            shockChance: 0,
            shockDuration: 0,
            missile: false,
            armorShred: 0,
            shredDuration: 0,
            scorchDPS: 0,
            scorchDuration: 0,
        };

        game.projectiles.spawn(pseudoTower, closest, false);
        game.audio.playShoot('hero');
    }

    checkContactDamage() {
        const game = this.game;
        const heroR = HERO_STATS.radius;

        for (const e of game.enemies.enemies) {
            if (!e.alive) continue;
            const d = distance(this, e);
            if (d < heroR + e.radius) {
                const multi = HERO_STATS.contactMultipliers[e.type] || 1;
                const dmg = HERO_STATS.contactBase * multi;
                this.hp -= dmg;
                this.damageFlashTimer = 0.15;
                game.particles.spawnFloatingText(this.x, this.y - 20, `-${Math.round(dmg)}`, '#ff4444');
                if (this.hp <= 0) {
                    this.hp = 0;
                    this.die();
                    return;
                }
            }
        }
    }

    die() {
        this.alive = false;
        this.deathAnimTimer = 0;
        this.respawnTimer = HERO_STATS.respawnDelay;
        this.clearMovement();
        this.game.achievements.increment('heroDeaths');
        this.game.heroDeathsThisLevel = (this.game.heroDeathsThisLevel || 0) + 1;

        this.game.particles.spawnExplosion(this.x, this.y, HERO_STATS.color);
        this.game.particles.spawnBigFloatingText(this.x, this.y - 20, 'HERO DOWN!', '#ff4444');
        this.game.audio.playHeroDeath();
        this.game.triggerShake(6, 0.3);
    }

    respawn() {
        this.alive = true;
        this.hp = this.maxHP;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.attackCooldown = 0;
        this.contactTimer = HERO_STATS.contactTick;
        this.damageFlashTimer = 0;
        this.deathAnimTimer = 0;

        this.game.particles.spawnAuraPulse(this.x, this.y, 40, HERO_STATS.color);
        this.game.particles.spawnBigFloatingText(this.x, this.y - 20, 'HERO READY!', HERO_STATS.color);
        this.game.audio.playHeroRespawn();
    }

    activateStun() {
        if (!this.alive || !this.active) return;
        if (this.stunCooldown > 0) return;

        this.stunCooldown = HERO_STATS.stunCooldown;
        this.stunFlashTimer = 0.3;
        this.game.achievements.increment('heroStuns');

        const enemies = this.game.enemies.getEnemiesInRange(this.x, this.y, HERO_STATS.stunRadius);
        for (const e of enemies) {
            e.applyShock(HERO_STATS.stunDuration);
            this.game.particles.spawnSpark(e.x, e.y, '#ffffff', 5);
        }

        this.game.particles.spawnAuraPulse(this.x, this.y, HERO_STATS.stunRadius * CELL, '#ffffff');
        this.game.triggerShake(4, 0.2);
        this.game.audio.playHeroStun();
        this.game.postfx?.addFlashLight(this.x, this.y, 1.0, 1.0, 1.0, 0.15, 1.5, 0.4);

        if (enemies.length > 0) {
            this.game.particles.spawnBigFloatingText(this.x, this.y - 25, 'STUN!', '#ffffff');
        }
    }

    activateMagnet() {
        if (!this.alive || !this.active) return;
        if (this.magnetCooldown > 0) return;

        this.magnetCooldown = HERO_STATS.magnetCooldown;
        this.magnetActive = true;
        this.magnetTimer = HERO_STATS.magnetDuration;
        this.game.achievements.increment('heroMagnets');

        this.game.particles.spawnBigFloatingText(this.x, this.y - 25, 'GOLD MAGNET!', '#ffd700');
        this.game.particles.spawnAuraPulse(this.x, this.y, HERO_STATS.magnetRadius * CELL, '#ffd700');
        this.game.audio.playHeroMagnet();
        this.game.postfx?.addFlashLight(this.x, this.y, 1.0, 0.84, 0, 0.12, 1.0, 0.5);
    }

    getGoldMultiplier(ex, ey) {
        if (!this.active || !this.magnetActive) return 1;
        const d = distance(this, { x: ex, y: ey });
        if (d <= HERO_STATS.magnetRadius * CELL) {
            return HERO_STATS.magnetMultiplier;
        }
        return 1;
    }
}
