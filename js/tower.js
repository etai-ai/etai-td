import { TOWER_TYPES, CELL, TARGET_MODES, SELL_REFUND } from './constants.js';
import { distance, angle } from './utils.js';

let nextTowerId = 0;

export class Tower {
    constructor(typeName, gx, gy, assignedId) {
        const def = TOWER_TYPES[typeName];
        this.id = assignedId != null ? assignedId : nextTowerId++;
        this.type = typeName;
        this.ownerId = 0; // 0 = solo, 1 = host, 2 = client
        this.name = def.name;
        this.color = def.color;
        this.gx = gx;
        this.gy = gy;
        this.size = def.size || 1;
        // For size > 1, center in the NxN block; for size 1, center in the cell
        this.x = gx * CELL + this.size * CELL / 2;
        this.y = gy * CELL + this.size * CELL / 2;
        this.level = 0; // 0-indexed
        this.totalInvested = def.cost;

        // Stats from level
        this.updateStats();

        this.cooldown = 0;
        this.targetMode = 0; // index into TARGET_MODES
        this.turretAngle = 0;
        this.target = null;

        // Dual barrel tracking (bi-cannon)
        this.shotCount = 0;
        this.activeBarrel = 0; // 0 or 1 for visual alternation

        // Visual animation
        this.recoilTimer = 0;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.spinPhase = 0;
        this.idleTime = 0; // time without target (for idle animations)
        this.transformTimer = 0; // >0 means transformation animation active
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
        this.burnDamage = lvl.burnDamage || 0;
        this.burnDuration = lvl.burnDuration || 0;
        this.freezeChance = lvl.freezeChance || 0;
        this.freezeDuration = lvl.freezeDuration || 0;
        this.aura = TOWER_TYPES[this.type].aura || false;

        // Fork chain (super lightning)
        this.forkCount = lvl.forkCount || 0;
        this.forkDepth = lvl.forkDepth || 0;
        this.overcharge = lvl.overcharge || 0;
        this.shockChance = lvl.shockChance || 0;
        this.shockDuration = lvl.shockDuration || 0;

        // Missile (missile sniper)
        this.missile = TOWER_TYPES[this.type].missile || false;

        // Dual barrel (bi-cannon)
        this.dualBarrel = TOWER_TYPES[this.type].dualBarrel || false;
        this.heavyEvery = lvl.heavyEvery || 0;
        this.armorShred = lvl.armorShred || 0;
        this.shredDuration = lvl.shredDuration || 0;
        this.scorchDPS = lvl.scorchDPS || 0;
        this.scorchDuration = lvl.scorchDuration || 0;

        // Knockback (pulse cannon)
        this.knockbackDist = lvl.knockbackDist || 0;
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

    findTarget(enemyManager) {
        const rangePx = this.range * CELL;
        const inRange = enemyManager.getEnemiesNear(this.x, this.y, rangePx);

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
        if (this.transformTimer > 0) this.transformTimer -= dt;
        this.glowPhase += dt * 3;
        this.spinPhase += dt * 4;

        const target = this.findTarget(game.enemies);
        if (target) {
            this.idleTime = 0;
        } else {
            this.idleTime += dt;
        }
        this.target = target;

        if (this.aura) {
            // Aura towers pulse all enemies in range
            if (target) {
                this.turretAngle = angle(this, target);
            }
            if (this.cooldown <= 0) {
                const inRange = game.enemies.getEnemiesInRange(this.x, this.y, this.range);
                if (inRange.length > 0) {
                    this.cooldown = this.fireRate;
                    this.pulseAura(game, inRange);
                }
            }
        } else if (target) {
            this.turretAngle = angle(this, target);

            if (this.cooldown <= 0) {
                this.cooldown = this.fireRate;
                this.shoot(target, game);
            }
        }
    }

    shoot(target, game) {
        this.recoilTimer = 0.12;

        // Track shots and determine if heavy round
        let isHeavy = false;
        this.shotCount++;
        if (this.dualBarrel) {
            this.activeBarrel = this.shotCount % 2;
        }
        if (this.heavyEvery > 0) {
            isHeavy = (this.shotCount % this.heavyEvery) === 0;
        }

        game.projectiles.spawn(this, target, isHeavy);
        game.audio.playShoot(this.type, isHeavy);

        // Muzzle flash particles (non-aura towers)
        const muzzleDist = this.type === 'missilesniper' ? 18 : 14;
        const muzzleX = this.x + Math.cos(this.turretAngle) * muzzleDist;
        const muzzleY = this.y + Math.sin(this.turretAngle) * muzzleDist;
        if (this.type === 'missilesniper') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#aabb44', 6);
            game.triggerShake(3, 0.15);
        } else if (this.type === 'cannon') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#ff9800', 5);
        } else if (this.type === 'bicannon') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, isHeavy ? '#ff4400' : '#ff9800', isHeavy ? 8 : 5);
            if (isHeavy) game.triggerShake(4, 0.2);
        } else if (this.type === 'sniper') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#ffeb3b', 3);
        } else if (this.type === 'frost') {
            game.particles.spawnFrostBurst(muzzleX, muzzleY, 4);
        } else if (this.type === 'firearrow') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#ff6600', 4);
        } else if (this.type === 'superlightning') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, '#b388ff', 5);
        } else if (this.type === 'titan') {
            game.particles.spawnMuzzleFlash(muzzleX, muzzleY, isHeavy ? '#ff4400' : '#ffd700', isHeavy ? 10 : 8);
            game.triggerShake(isHeavy ? 7 : 5, isHeavy ? 0.3 : 0.25);
        }
    }

    pulseAura(game, enemies) {
        this.recoilTimer = 0.12;
        game.audio.playShoot(this.type);

        // Pulse ring visual
        const rangePx = this.range * CELL;
        game.particles.spawnAuraPulse(this.x, this.y, rangePx, '#00ddff');

        for (const e of enemies) {
            if (!e.alive) continue;
            const dealt = e.takeDamage(this.damage);
            game.debug.onDamageDealt(dealt);
            game.trackDamage(this.type, dealt, this.id);

            // Apply slow
            if (this.slowFactor > 0) {
                e.applySlow(this.slowFactor, this.slowDuration);
            }

            // Roll freeze chance
            if (this.freezeChance > 0 && Math.random() < this.freezeChance) {
                e.applyFreeze(this.freezeDuration);
                game.particles.spawnSpark(e.x, e.y, '#00ffff', 4);
            }
        }
    }
}

export class TowerManager {
    constructor(game) {
        this.game = game;
        this.towers = [];
        this.towerGrid = new Map(); // "gx,gy" -> tower
    }

    canPlace(gx, gy, typeName) {
        const size = typeName ? (TOWER_TYPES[typeName].size || 1) : 1;
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                const cx = gx + dx;
                const cy = gy + dy;
                if (!this.game.map.isBuildable(cx, cy) || this.towerGrid.has(`${cx},${cy}`)) {
                    return false;
                }
            }
        }
        return true;
    }

    place(typeName, gx, gy, opts) {
        const def = TOWER_TYPES[typeName];
        if (!this.canPlace(gx, gy, typeName)) return null;

        // opts: { ownerId, assignedId, skipGold } for multiplayer
        const ownerId = opts?.ownerId || 0;
        const assignedId = opts?.assignedId;
        const skipGold = opts?.skipGold || false;

        if (!skipGold && !this.game.economy.canAfford(def.cost)) return null;
        if (!skipGold) this.game.economy.spendGold(def.cost);

        const tower = new Tower(typeName, gx, gy, assignedId);
        tower.ownerId = ownerId;
        this.towers.push(tower);

        // Register all cells for size >= 1
        const size = def.size || 1;
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                this.towerGrid.set(`${gx + dx},${gy + dy}`, tower);
            }
        }

        this.game.debug.onTowerBuilt(def.cost);
        this.game.achievements.increment('towersBuilt');
        this.game.achievements.increment(`tower_${typeName}_placed`);
        this.game.achievements.increment('totalGoldSpent', def.cost);
        this.game.achievements.check('towerPlaced', { type: typeName });
        this.game.refreshTerrain();
        this.game.audio.playPlace();

        // Placement visual feedback
        this.game.particles.spawnPlacementBurst(tower.x, tower.y, def.color, size);
        this.game.postfx?.flash(0.06, 0.12);

        return tower;
    }

    sell(tower) {
        const value = tower.getSellValue();
        this.game.debug.onTowerSold(value);
        this.game.economy.addGold(value);
        this.game.achievements.increment('towersSold');
        this.game.achievements.increment('totalGoldEarned', value);

        // Remove all cells for this tower
        for (let dx = 0; dx < tower.size; dx++) {
            for (let dy = 0; dy < tower.size; dy++) {
                this.towerGrid.delete(`${tower.gx + dx},${tower.gy + dy}`);
            }
        }

        // Sell visual feedback
        this.game.particles.spawnSellDissolve(tower.x, tower.y, TOWER_TYPES[tower.type].color, tower.size);

        this.towers = this.towers.filter(t => t !== tower);
        this.game.refreshTerrain();
        this.game.particles.spawnFloatingText(tower.x, tower.y - 10, `+${value}g`, '#ffd700');
    }

    upgradeTower(tower) {
        const cost = tower.getUpgradeCost();
        if (cost === null) return false;
        if (!this.game.economy.canAfford(cost)) return false;
        this.game.economy.spendGold(cost);
        this.game.debug.onTowerUpgraded(cost);
        this.game.achievements.increment('towersUpgraded');
        this.game.achievements.increment('totalGoldSpent', cost);
        tower.upgrade();
        // Check if tower is now maxed
        const def = TOWER_TYPES[tower.type];
        if (tower.level >= def.levels.length - 1) {
            this.game.achievements.increment('towersMaxed');
        }
        this.game.refreshTerrain();

        // Upgrade visual feedback
        this.game.particles.spawnUpgradeSparkle(tower.x, tower.y);
        this.game.postfx?.flash(0.08, 0.15);

        return true;
    }

    getTowerAt(gx, gy) {
        return this.towerGrid.get(`${gx},${gy}`) || null;
    }

    getTowerById(id) {
        return this.towers.find(t => t.id === id) || null;
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
