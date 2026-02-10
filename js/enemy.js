import { ENEMY_TYPES, CELL } from './constants.js';
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

    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
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

        const currentSpeed = this.baseSpeed * this.slowFactor;

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

    spawn(typeName, hpScale) {
        const enemy = new Enemy(typeName, hpScale, this.game.map.getEnemyPath());
        this.enemies.push(enemy);
        return enemy;
    }

    update(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);

            if (e.reached) {
                this.game.economy.loseLives(e.livesCost);
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
                this.game.economy.addGold(Math.round(e.reward * 1.10));
                this.game.economy.addScore(e.reward);
                this.game.particles.spawnFloatingText(e.x, e.y - 10, `+${e.reward}`, '#ffd700');

                // Spawn death particles
                if (e.type === 'tank' || e.type === 'boss') {
                    this.game.particles.spawnShatter(e.x, e.y, e.color, e.type === 'boss' ? 12 : 8);
                } else {
                    this.game.particles.spawnExplosion(e.x, e.y, e.color);
                }

                // Boss death screen shake
                if (e.type === 'boss') {
                    this.game.triggerShake(8, 0.4);
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
