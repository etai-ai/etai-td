import { TOWER_TYPES, CELL, TARGET_MODES, SELL_REFUND } from './constants.js';
import { distance, angle, gridToWorld } from './utils.js';

let nextTowerId = 0;

export class Tower {
    constructor(typeName, gx, gy) {
        const def = TOWER_TYPES[typeName];
        this.id = nextTowerId++;
        this.type = typeName;
        this.name = def.name;
        this.color = def.color;
        this.gx = gx;
        this.gy = gy;
        const pos = gridToWorld(gx, gy);
        this.x = pos.x;
        this.y = pos.y;
        this.level = 0; // 0-indexed
        this.totalInvested = def.cost;

        // Stats from level
        this.updateStats();

        this.cooldown = 0;
        this.targetMode = 0; // index into TARGET_MODES
        this.turretAngle = 0;
        this.target = null;

        // Visual animation
        this.recoilTimer = 0;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.spinPhase = 0;
        this.idleTime = 0; // time without target (for idle animations)
    }

    updateStats() {
        const def = TOWER_TYPES[this.type];
        const lvl = def.levels[this.level];
        this.damage = lvl.damage;
        this.range = lvl.range;
        this.fireRate = lvl.fireRate;
        this.projSpeed = lvl.projSpeed;

        // Special stats
        this.splashRadius = lvl.splashRadius || 0;
        this.slowFactor = lvl.slowFactor || 0;
        this.slowDuration = lvl.slowDuration || 0;
        this.chainCount = lvl.chainCount || 0;
        this.chainRange = lvl.chainRange || 0;
        this.chainDecay = lvl.chainDecay || 0;
        this.critChance = lvl.critChance || 0;
        this.critMulti = lvl.critMulti || 1;
    }

    getUpgradeCost() {
        const def = TOWER_TYPES[this.type];
        if (this.level >= def.levels.length - 1) return null;
        return def.levels[this.level + 1].upgradeCost;
    }

    upgrade() {
        const cost = this.getUpgradeCost();
        if (cost === null) return false;
        this.level++;
        this.totalInvested += cost;
        this.updateStats();
        return true;
    }

    getSellValue() {
        return Math.floor(this.totalInvested * SELL_REFUND);
    }

    cycleTargetMode() {
        this.targetMode = (this.targetMode + 1) % TARGET_MODES.length;
    }

    findTarget(enemies) {
        const rangePx = this.range * CELL;
        const inRange = enemies.filter(e =>
            e.alive && distance(this, e) <= rangePx
        );

        if (inRange.length === 0) return null;

        switch (TARGET_MODES[this.targetMode]) {
            case 'First':
                return inRange.reduce((best, e) => e.progress > best.progress ? e : best);
            case 'Closest': {
                let best = inRange[0];
                let bestDist = distance(this, best);
                for (let i = 1; i < inRange.length; i++) {
                    const d = distance(this, inRange[i]);
                    if (d < bestDist) { best = inRange[i]; bestDist = d; }
                }
                return best;
            }
            case 'Strongest':
                return inRange.reduce((best, e) => e.hp > best.hp ? e : best);
            case 'Weakest':
                return inRange.reduce((best, e) => e.hp < best.hp ? e : best);
            default:
                return inRange[0];
        }
    }

    update(dt, game) {
        this.cooldown -= dt;
        if (this.recoilTimer > 0) this.recoilTimer -= dt;
        this.glowPhase += dt * 3;
        this.spinPhase += dt * 4;

        const target = this.findTarget(game.enemies.enemies);
        if (target) {
            this.idleTime = 0;
        } else {
            this.idleTime += dt;
        }
        this.target = target;

        if (target) {
            this.turretAngle = angle(this, target);

            if (this.cooldown <= 0) {
                this.cooldown = this.fireRate;
                this.shoot(target, game);
            }
        }
    }

    shoot(target, game) {
        this.recoilTimer = 0.12;
        game.projectiles.spawn(this, target);
        game.audio.playShoot(this.type);

        // Muzzle flash particles
        const muzzleX = this.x + Math.cos(this.turretAngle) * 14;
        const muzzleY = this.y + Math.sin(this.turretAngle) * 14;
        if (this.type === 'cannon') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#ff9800', 5);
        } else if (this.type === 'sniper') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#ffeb3b', 3);
        } else if (this.type === 'frost') {
            game.particles.spawnFrostBurst(muzzleX, muzzleY, 4);
        }
    }
}

export class TowerManager {
    constructor(game) {
        this.game = game;
        this.towers = [];
        this.towerGrid = new Map(); // "gx,gy" -> tower
    }

    canPlace(gx, gy) {
        return this.game.map.isBuildable(gx, gy) && !this.towerGrid.has(`${gx},${gy}`);
    }

    place(typeName, gx, gy) {
        const def = TOWER_TYPES[typeName];
        if (!this.canPlace(gx, gy)) return null;
        if (!this.game.economy.canAfford(def.cost)) return null;

        this.game.economy.spendGold(def.cost);
        const tower = new Tower(typeName, gx, gy);
        this.towers.push(tower);
        this.towerGrid.set(`${gx},${gy}`, tower);

        this.game.renderer.drawTerrain();
        this.game.audio.playPlace();
        return tower;
    }

    sell(tower) {
        const value = tower.getSellValue();
        this.game.economy.addGold(value);
        this.towerGrid.delete(`${tower.gx},${tower.gy}`);
        this.towers = this.towers.filter(t => t !== tower);
        this.game.renderer.drawTerrain();
        this.game.particles.spawnFloatingText(tower.x, tower.y - 10, `+${value}g`, '#ffd700');
    }

    upgradeTower(tower) {
        const cost = tower.getUpgradeCost();
        if (cost === null) return false;
        if (!this.game.economy.canAfford(cost)) return false;
        this.game.economy.spendGold(cost);
        tower.upgrade();
        this.game.renderer.drawTerrain();
        return true;
    }

    getTowerAt(gx, gy) {
        return this.towerGrid.get(`${gx},${gy}`) || null;
    }

    update(dt) {
        for (const tower of this.towers) {
            tower.update(dt, this.game);
        }
    }

    reset() {
        this.towers = [];
        this.towerGrid.clear();
        nextTowerId = 0;
    }
}
