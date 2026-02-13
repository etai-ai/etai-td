import { ENEMY_TYPES, CELL, CANVAS_W, CANVAS_H, WAVE_MODIFIERS, GOLD_RUSH_MULTIPLIER, MIDBOSS_BOUNTY, KILL_GOLD_BONUS, ARMOR_BREAK_FACTOR } from './constants.js';
import { distance } from './utils.js';

let nextEnemyId = 0;

export class Enemy {
    constructor(typeName, hpScale, path) {
        const def = ENEMY_TYPES[typeName];
        this.id = nextEnemyId++;
        this.type = typeName;
        this.name = def.name;
        this.color = def.color;
        this.radius = def.radius;
        this.armor = def.armor;
        this.reward = def.reward;
        this.livesCost = def.livesCost;
        this.speed = def.speed;
        this.baseSpeed = def.speed;
        this.healRadius = def.healRadius || 0;
        this.healRate = def.healRate || 0;

        this.maxHP = def.baseHP * hpScale;
        this.hp = this.maxHP;

        this.path = path;
        this.waypointIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.progress = 0; // total distance traveled (for "First" targeting)
        this.alive = true;
        this.reached = false;

        // Slow effect
        this.slowTimer = 0;
        this.slowFactor = 1;

        // Burn effect (DoT)
        this.burnTimer = 0;
        this.burnDPS = 0;

        // Freeze effect
        this.freezeTimer = 0;
        this.isFrozen = false;

        // Shock effect (micro-stun)
        this.shockTimer = 0;
        this.isShocked = false;

        // Armor shred (stacking debuff)
        this.baseArmor = def.armor;
        this.armorShredStacks = 0;
        this.armorShredAmount = 0;
        this.armorShredTimer = 0;

        // Regen (from wave modifier)
        this.regenRate = 0; // HP per second

        // Wave modifier tag (for visual indicator)
        this.waveModifier = null;

        // Knockback limit
        this.knockbackCount = 0;

        // Boss enrage (when last enemy alive)
        this.enraged = false;

        // Visual
        this.angle = 0;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.damageFlashTimer = 0;
        this.deathTimer = -1;
        this.displayHP = this.hp;
        this.dustTimer = 0;
    }

    takeDamage(amount) {
        const effective = amount * (1 - this.armor);
        this.hp -= effective;
        this.damageFlashTimer = 0.1;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return effective;
    }

    applySlow(factor, duration) {
        // Take the stronger slow
        if (factor < this.slowFactor || duration > this.slowTimer) {
            this.slowFactor = factor;
            this.slowTimer = duration;
        }
    }

    applyFreeze(duration) {
        this.freezeTimer = Math.max(this.freezeTimer, duration);
        this.isFrozen = true;
    }

    applyShock(duration) {
        this.shockTimer = Math.max(this.shockTimer, duration);
        this.isShocked = true;
    }

    applyArmorShred(amount, duration) {
        this.armorShredAmount = amount;
        this.armorShredStacks = Math.min(3, this.armorShredStacks + 1);
        this.armorShredTimer = duration;
        this.armor = Math.max(0, this.baseArmor - this.armorShredAmount * this.armorShredStacks);
    }

    applyBurn(dps, duration) {
        // Take the stronger burn
        if (dps > this.burnDPS || duration > this.burnTimer) {
            this.burnDPS = dps;
            this.burnTimer = duration;
        }
    }

    applyKnockback(cells) {
        // Bosses immune, tanks 50% resistance, max 2 knockbacks per enemy
        if (this.type === 'boss') return;
        if (this.knockbackCount >= 2) return;
        this.knockbackCount++;
        if (this.type === 'tank') cells *= 0.5;

        const knockPx = cells * CELL;
        let remaining = knockPx;
        let wi = this.waypointIndex;
        let cx = this.x;
        let cy = this.y;

        while (remaining > 0 && wi > 0) {
            const prev = this.path[wi];
            const dx = prev.x - cx;
            const dy = prev.y - cy;
            const segDist = Math.sqrt(dx * dx + dy * dy);

            if (segDist <= remaining) {
                remaining -= segDist;
                cx = prev.x;
                cy = prev.y;
                wi--;
            } else {
                const ratio = remaining / segDist;
                cx += dx * ratio;
                cy += dy * ratio;
                remaining = 0;
            }
        }

        if (wi <= 0 && remaining > 0) {
            cx = this.path[0].x;
            cy = this.path[0].y;
            wi = 0;
        }

        this.x = cx;
        this.y = cy;
        this.waypointIndex = wi;
        this.progress = Math.max(0, this.progress - knockPx);
    }

    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    applyModifier(modKey) {
        if (!modKey) return;
        this.waveModifier = modKey;
        const mod = WAVE_MODIFIERS[modKey];
        if (!mod) return;
        if (mod.armorBonus) {
            this.armor = Math.min(0.75, this.armor + mod.armorBonus);
            this.baseArmor = this.armor;
        }
        if (mod.speedMulti) {
            this.speed *= mod.speedMulti;
            this.baseSpeed *= mod.speedMulti;
        }
        if (mod.regenPercent) {
            this.regenRate = this.maxHP * mod.regenPercent;
        }
    }

    update(dt) {
        // Animate death
        if (this.deathTimer >= 0) {
            this.deathTimer += dt;
            return;
        }

        if (!this.alive || this.reached) return;

        // Update visual timers
        this.walkPhase += dt * 8;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
        this.displayHP = this.displayHP + (this.hp - this.displayHP) * Math.min(1, dt * 10);
        this.dustTimer += dt;

        // Update slow
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowFactor = 1;
                this.slowTimer = 0;
            }
        }

        // Update freeze
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                this.freezeTimer = 0;
                this.isFrozen = false;
            }
        }

        // Update shock
        if (this.shockTimer > 0) {
            this.shockTimer -= dt;
            if (this.shockTimer <= 0) {
                this.shockTimer = 0;
                this.isShocked = false;
            }
        }

        // Update armor shred
        if (this.armorShredTimer > 0) {
            this.armorShredTimer -= dt;
            if (this.armorShredTimer <= 0) {
                this.armorShredTimer = 0;
                this.armorShredStacks = 0;
                this.armor = this.baseArmor;
            }
        }

        // Burn DoT (bypasses armor)
        if (this.burnTimer > 0) {
            this.hp -= this.burnDPS * dt;
            this.damageFlashTimer = 0.05;
            this.burnTimer -= dt;
            if (this.burnTimer <= 0) {
                this.burnDPS = 0;
                this.burnTimer = 0;
            }
            if (this.hp <= 0) {
                this.hp = 0;
                this.alive = false;
            }
        }

        // Regen (from wave modifier)
        if (this.regenRate > 0 && this.hp < this.maxHP) {
            this.hp = Math.min(this.maxHP, this.hp + this.regenRate * dt);
        }

        const currentSpeed = (this.isFrozen || this.isShocked) ? 0 : this.baseSpeed * this.slowFactor;

        // Move toward next waypoint
        if (this.waypointIndex >= this.path.length - 1) {
            this.reached = true;
            this.alive = false;
            return;
        }

        const target = this.path[this.waypointIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const move = currentSpeed * dt;

        this.angle = Math.atan2(dy, dx);

        if (move >= dist) {
            this.x = target.x;
            this.y = target.y;
            this.progress += dist;
            this.waypointIndex++;
            if (this.waypointIndex >= this.path.length - 1) {
                this.reached = true;
                this.alive = false;
            }
        } else {
            this.x += (dx / dist) * move;
            this.y += (dy / dist) * move;
            this.progress += move;
        }
    }
}

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemies = [];
    }

    spawn(typeName, hpScale, modifier, useSecondary) {
        const enemy = new Enemy(typeName, hpScale, this.game.map.getEnemyPath(useSecondary));
        if (modifier) enemy.applyModifier(modifier);
        // Armor break wave tag — halve armor
        if (this.game.waves.waveTag === 'armorbreak') {
            enemy.armor *= ARMOR_BREAK_FACTOR;
            enemy.baseArmor *= ARMOR_BREAK_FACTOR;
        }
        this.enemies.push(enemy);
        this.game.debug.onEnemySpawn(enemy);
        return enemy;
    }

    update(dt) {
        // Boss enrage: when a boss is the only living enemy, it enrages
        const alive = this.enemies.filter(e => e.alive && e.deathTimer < 0);
        if (alive.length === 1 && alive[0].type === 'boss' && !alive[0].enraged && !this.game.waves.spawning) {
            const boss = alive[0];
            boss.enraged = true;
            boss.baseSpeed = Math.round(boss.baseSpeed * 1.5);
            boss.baseArmor = Math.max(0, boss.baseArmor - 0.30);
            boss.armor = Math.max(0, boss.armor - 0.30);
            this.game.particles.spawnBigFloatingText(boss.x, boss.y - 30, 'ENRAGED!', '#ff4444');
            this.game.audio.playWaveStart();
            this.game.triggerShake(5, 0.25);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);

            if (e.reached) {
                this.game.debug.onEnemyLeaked(e);
                this.game.economy.loseLives(e.livesCost);
                this.game.particles.spawnBigFloatingText(e.x, e.y - 10, `-${e.livesCost}`, '#ffffff');
                if (this.game.economy.lives > 0 && this.game.economy.lives <= 5) {
                    this.game.audio.playLowLivesWarning();
                }
                if (this.game.economy.lives <= 0) {
                    this.game.gameOver();
                }
                this.enemies.splice(i, 1);
                continue;
            }

            // Death animation complete — remove
            if (e.deathTimer >= 0.35) {
                this.enemies.splice(i, 1);
                continue;
            }

            if (!e.alive && e.deathTimer < 0) {
                // Just died — start death animation
                e.deathTimer = 0;
                this.game.debug.onEnemyKilled(e);

                // Achievement tracking
                this.game.achievements.increment('totalKills');
                if (e.type === 'boss') this.game.achievements.increment('bossKills');
                else if (e.type === 'swarm') this.game.achievements.increment('swarmKills');
                else if (e.type === 'tank') this.game.achievements.increment('tankKills');

                // Calculate gold reward with gold rush + hero magnet multipliers
                const waveTag = this.game.waves.waveTag;
                let goldMulti = waveTag === 'goldrush' ? GOLD_RUSH_MULTIPLIER : 1;
                const heroMulti = this.game.hero?.getGoldMultiplier(e.x, e.y) || 1;
                goldMulti *= heroMulti;
                const goldReward = Math.round(e.reward * KILL_GOLD_BONUS * goldMulti);
                this.game.economy.addGold(goldReward);
                this.game.economy.addScore(e.reward);
                this.game.achievements.increment('totalGoldEarned', goldReward);
                const goldColor = heroMulti > 1 ? '#00e5ff' : (goldMulti > 1 ? '#ffaa00' : '#ffd700');
                this.game.particles.spawnFloatingText(e.x, e.y - 10, `+${goldReward}`, goldColor);

                // Bounty boss bonus
                if (e.type === 'boss' && waveTag === 'midboss') {
                    this.game.economy.addGold(MIDBOSS_BOUNTY);
                    this.game.particles.spawnBigFloatingText(e.x, e.y - 30, `BOUNTY +${MIDBOSS_BOUNTY}g`, '#2ecc71');
                }

                // Type-specific death particles
                this.game.particles.spawnDeathBurst(e.x, e.y, e.type, e.color);

                // Tank screen shake
                if (e.type === 'tank') {
                    this.game.triggerShake(3, 0.15);
                }

                // Boss death screen shake + PostFX
                if (e.type === 'boss') {
                    this.game.triggerShake(10, 0.4);
                    this.game.postfx?.flash(0.15, 0.2);
                    this.game.postfx?.shockwave(e.x / CANVAS_W, e.y / CANVAS_H, 0.5);
                    this.game.postfx?.addFlashLight(e.x, e.y, 1.0, 0.84, 0, 0.20, 2.0, 0.5);
                }
                continue;
            }

            // Dust particles while walking
            if (e.alive && e.dustTimer >= 0.2) {
                e.dustTimer = 0;
                this.game.particles.spawnDust(e.x, e.y + e.radius * 0.5, 1);
            }

            // Healer logic
            if (e.alive && e.healRate > 0 && e.healRadius > 0) {
                const healRange = e.healRadius * CELL;
                for (const other of this.enemies) {
                    if (other === e || !other.alive) continue;
                    if (distance(e, other) <= healRange) {
                        other.heal(e.healRate * dt);
                    }
                }
            }
        }
    }

    getEnemiesInRange(x, y, range) {
        const rangePx = range * CELL;
        return this.enemies.filter(e =>
            e.alive && distance({ x, y }, e) <= rangePx
        );
    }

    isEmpty() {
        // Dying enemies (playing death animation) don't count
        return !this.enemies.some(e => e.alive && e.deathTimer < 0);
    }

    reset() {
        this.enemies = [];
        nextEnemyId = 0;
    }
}
