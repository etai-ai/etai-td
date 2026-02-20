import { CELL, CANVAS_W, CANVAS_H, TOWER_TYPES } from './constants.js';
import { angle } from './utils.js';

export class Projectile {
    constructor(tower, target, isHeavy = false) {
        this.x = tower.x;
        this.y = tower.y;
        this.targetId = target.id;
        this.target = target;
        this.lastKnownX = target.x;
        this.lastKnownY = target.y;
        this.speed = tower.projSpeed;
        this.damage = tower.damage;
        this.towerType = tower.type;
        this.towerId = tower.id; // Track source tower for per-tower knockback immunity
        this.alive = true;

        // Special properties inherited from tower
        this.splashRadius = tower.splashRadius;
        this.slowFactor = tower.slowFactor;
        this.slowDuration = tower.slowDuration;
        this.chainCount = tower.chainCount;
        this.chainRange = tower.chainRange;
        this.chainDecay = tower.chainDecay;
        this.critChance = tower.critChance;
        this.critMulti = tower.critMulti;
        this.burnDamage = tower.burnDamage;
        this.burnDuration = tower.burnDuration;

        // Fork chain (super lightning)
        this.forkCount = tower.forkCount;
        this.forkDepth = tower.forkDepth;
        this.overcharge = tower.overcharge;
        this.shockChance = tower.shockChance;
        this.shockDuration = tower.shockDuration;

        // Missile (missile sniper)
        this.missile = tower.missile || false;

        // Bi-cannon heavy round
        this.isHeavy = isHeavy;
        this.armorShred = tower.armorShred;
        this.shredDuration = tower.shredDuration;
        this.scorchDPS = tower.scorchDPS;
        this.scorchDuration = tower.scorchDuration;

        // Knockback (pulse cannon)
        this.knockbackDist = tower.knockbackDist || 0;


        // Visual
        this.angle = angle(this, target);
        this.trail = [];
        this.trailIndex = 0; // Circular buffer index
    }

    update(dt, game) {
        if (!this.alive) return;

        // Update target position if target still alive
        if (this.target && this.target.alive) {
            this.lastKnownX = this.target.x;
            this.lastKnownY = this.target.y;
        }

        // Home toward target or last known position
        const dx = this.lastKnownX - this.x;
        const dy = this.lastKnownY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.angle = Math.atan2(dy, dx);

        const move = this.speed * dt;
        if (move >= dist) {
            // Hit
            this.x = this.lastKnownX;
            this.y = this.lastKnownY;
            this.onHit(game);
        } else {
            this.x += (dx / dist) * move;
            this.y += (dy / dist) * move;
        }

        // Trail (circular buffer - avoid O(n) shift)
        const maxTrail = this.missile ? 10 : 5;
        if (this.trail.length < maxTrail) {
            this.trail.push({ x: this.x, y: this.y });
        } else {
            this.trail[this.trailIndex] = { x: this.x, y: this.y };
            this.trailIndex = (this.trailIndex + 1) % maxTrail;
        }

        // Missile exhaust particles during flight
        if (this.missile && game && Math.random() < 0.3) {
            game.particles.spawnMissileExhaust(this.x, this.y, this.angle);
        }
    }

    onHit(game) {
        this.alive = false;

        // Crit check
        let dmg = this.damage;
        let isCrit = false;
        if (this.critChance > 0 && Math.random() < this.critChance) {
            dmg *= this.critMulti;
            isCrit = true;
        }

        if (this.splashRadius > 0) {
            // Splash damage
            let splashDmg = this.isHeavy ? dmg * 1.5 : dmg;
            let splashRad = this.isHeavy ? this.splashRadius * 1.5 : this.splashRadius;

            // Missile crit: bigger splash + bright flash
            if (this.missile && isCrit) {
                splashRad *= 1.3;
                game.particles.spawnFloatingText(this.x, this.y - 15, 'CRIT!', '#ff4444');
                game.particles.spawnSpark(this.x, this.y, '#ff4444', 6);
                game.postfx?.aberration(0.6, 0.15);
                game.postfx?.addFlashLight(this.x, this.y, 1.0, 0.6, 0.1, 0.16, 2.0, 0.35);
            }

            this.doSplash(splashDmg, game, splashRad);
            game.audio.playExplosion();

            // Explosion color by type
            const explosionColor = this.towerType === 'titan' ? '#ffd700' : this.missile ? '#aabb44' : (this.isHeavy ? '#ff3300' : '#ff6600');
            game.particles.spawnExplosion(this.x, this.y, explosionColor);
            game.triggerShake(this.isHeavy ? 5 : (this.missile ? 4 : 3), this.isHeavy ? 0.25 : (this.missile ? 0.2 : 0.15));
            // PostFX shockwave on explosions
            game.postfx?.shockwave(this.x / CANVAS_W, this.y / CANVAS_H, this.isHeavy ? 0.4 : (this.missile ? 0.35 : 0.25));
            // Explosion flash light
            game.postfx?.addFlashLight(this.x, this.y, 1.0, 0.4, 0, 0.12, 1.5, 0.3);


            // Heavy round: armor shred + scorch zone
            if (this.isHeavy && this.armorShred > 0) {
                const splashPx = splashRad * CELL;
                const shredTargets = game.enemies.getEnemiesNear(this.x, this.y, splashPx);
                for (const e of shredTargets) {
                    e.applyArmorShred(this.armorShred, this.shredDuration);
                }
                // Spawn scorch zone
                if (this.scorchDPS > 0) {
                    game.addScorchZone(this.x, this.y, splashPx * 0.8, this.scorchDPS, this.scorchDuration, this.towerId);
                }
            }

            // Pulse cannon knockback
            if (this.knockbackDist > 0) {
                const kbSplashPx = splashRad * CELL;
                const kbTargets = game.enemies.getEnemiesNear(this.x, this.y, kbSplashPx);
                for (const e of kbTargets) {
                    e.applyKnockback(this.knockbackDist, this.towerId);
                }
            }
        } else if (this.forkCount > 0) {
            // Fork chain lightning (super lightning)
            this.doForkChain(dmg, game);
        } else if (this.chainCount > 0) {
            // Chain lightning
            this.doChain(dmg, game);
        } else {
            // Single target
            if (this.target && this.target.alive) {
                const dealt = this.target.takeDamage(dmg);
                game.debug.onDamageDealt(dealt);
                game.trackDamage(this.towerType, dealt, this.towerId);
                if (this.slowFactor > 0) {
                    this.target.applySlow(this.slowFactor, this.slowDuration);
                    game.particles.spawnSpark(this.x, this.y, '#5bbaff', 3);
                }
                if (this.burnDamage > 0) {
                    this.target.applyBurn(this.burnDamage, this.burnDuration, this.towerType, this.towerId);
                }
                if (isCrit) {
                    game.particles.spawnFloatingText(this.x, this.y - 15, `CRIT!`, '#ff4444');
                    game.particles.spawnSpark(this.x, this.y, '#ff4444', 5);
                    game.postfx?.aberration(0.5, 0.15);
                }
                // Hero kill tracking
                if (this.towerType === 'hero' && !this.target.alive) {
                    game.achievements.increment('heroKills');
                }
            }
        }

        game.particles.spawnSpark(this.x, this.y, this.getColor(), 3);
    }

    doSplash(dmg, game, radius) {
        const splashPx = (radius || this.splashRadius) * CELL;
        const nearby = game.enemies.getEnemiesNear(this.x, this.y, splashPx);
        for (const e of nearby) {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Falloff: 100% at center, 50% at edge
            const falloff = 1 - 0.5 * (dist / splashPx);
            const dealt = e.takeDamage(dmg * falloff);
            game.debug.onDamageDealt(dealt);
            game.trackDamage(this.towerType, dealt, this.towerId);
        }
    }

    doChain(dmg, game) {
        const hit = new Set();
        let current = this.target;
        let currentDmg = dmg;

        for (let i = 0; i < this.chainCount; i++) {
            if (!current || !current.alive) break;
            hit.add(current.id);
            const dealt = current.takeDamage(currentDmg);
            game.debug.onDamageDealt(dealt);
            game.trackDamage(this.towerType, dealt, this.towerId);

            // Visual chain
            const nextTarget = this.findChainTarget(current, hit, game);
            if (nextTarget) {
                game.particles.spawnLightning(current.x, current.y, nextTarget.x, nextTarget.y);
            }

            currentDmg *= this.chainDecay;
            current = nextTarget;
        }

        game.audio.playShoot('lightning');
    }

    doForkChain(dmg, game) {
        const hit = new Set();
        let totalHits = 0;
        const maxHits = this.forkCount;
        const chainPx = this.chainRange * CELL;

        // BFS: start from primary target, fork outward
        let currentWave = [this.target];
        let currentDmg = dmg;

        for (let depth = 0; depth <= this.forkDepth && currentWave.length > 0 && totalHits < maxHits; depth++) {
            const nextWave = [];
            for (const enemy of currentWave) {
                if (!enemy || !enemy.alive || hit.has(enemy.id)) continue;
                if (totalHits >= maxHits) break;

                hit.add(enemy.id);
                totalHits++;

                // Overcharge: damage increases per hit
                const hitDmg = currentDmg * (1 + this.overcharge * (totalHits - 1));
                const dealt = enemy.takeDamage(hitDmg);
                game.debug.onDamageDealt(dealt);
                game.trackDamage(this.towerType, dealt, this.towerId);

                // Roll shock
                if (this.shockChance > 0 && Math.random() < this.shockChance) {
                    enemy.applyShock(this.shockDuration);
                    game.particles.spawnSpark(enemy.x, enemy.y, '#ffffff', 5);
                }

                // Find fork targets from this enemy using spatial grid
                const nearby = game.enemies.getEnemiesNear(enemy.x, enemy.y, chainPx, { excludeIds: hit });
                for (const e of nearby) {
                    game.particles.spawnLightning(enemy.x, enemy.y, e.x, e.y);
                    nextWave.push(e);
                }
            }
            currentWave = nextWave;
        }

        game.audio.playShoot('superlightning');
    }

    findChainTarget(from, hitSet, game) {
        const chainPx = this.chainRange * CELL;
        const nearby = game.enemies.getEnemiesNear(from.x, from.y, chainPx, { excludeIds: hitSet });
        let best = null;
        let bestDist = Infinity;

        for (const e of nearby) {
            const dx = e.x - from.x;
            const dy = e.y - from.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        return best;
    }

    getColor() {
        const colors = {
            arrow: '#8bc34a',
            cannon: '#ff9800',
            frost: '#03a9f4',
            deepfrost: '#00ffff',
            lightning: '#ba68c8',
            superlightning: '#b388ff',
            sniper: '#ef5350',
            firearrow: '#ff4500',
            bicannon: '#ff8c00',
            missilesniper: '#aabb44',
            titan: '#ffd700',
            hero: '#00e5ff',
        };
        return colors[this.towerType] || '#fff';
    }
}

export class ProjectileManager {
    constructor(game) {
        this.game = game;
        this.projectiles = [];
    }

    spawn(tower, target, isHeavy = false) {
        this.projectiles.push(new Projectile(tower, target, isHeavy));
    }

    update(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.game);
            if (!p.alive) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    reset() {
        this.projectiles = [];
    }
}
