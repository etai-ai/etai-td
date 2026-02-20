import { ENEMY_TYPES, CELL, COLS, ROWS, CANVAS_W, CANVAS_H, WAVE_MODIFIERS, GOLD_RUSH_MULTIPLIER, MIDBOSS_BOUNTY, KILL_GOLD_BONUS, ARMOR_BREAK_FACTOR, getWaveHPScale } from './constants.js';

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
        this.burnSource = null;
        this.burnSourceId = null;

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

        // Healer cooldown (reduces O(n²) checks)
        this.healCooldown = 0;

        // Knockback tracking (per tower ID)
        this.knockbackSources = new Set(); // Track which towers have knocked this enemy back

        // Boss enrage (when last enemy alive)
        this.enraged = false;

        // World enemy mechanics
        // Forest Stalker — dodge first hit
        this.dodgeCharges = def.dodgeCharges || 0;
        this.dodgeFlashTimer = 0;
        this._dodged = false;

        // Storm Herald — shield aura
        this.shieldRadius = def.shieldRadius || 0;
        this.shieldAmount = def.shieldAmount || 0;
        this.shieldCooldown = def.shieldCooldown || 0;
        this.shieldTimer = 0;
        this.shieldHP = 0;
        this.maxShieldHP = 0;

        // Sand Titan — burrow
        this.burrowInterval = def.burrowInterval || 0;
        this.burrowDuration = def.burrowDuration || 0;
        this.burrowTimer = 0;
        this.burrowed = false;
        this.burrowRemaining = 0;

        // Magma Brute — death split
        this.splitOnDeath = def.splitOnDeath || 0;
        this.splitType = def.splitType || null;

        // Siege Golem — absorb invulnerability
        this.absorbEvery = def.absorbEvery || 0;
        this.hitCounter = 0;
        this.absorbTimer = 0;

        // Void Sovereign — half-HP clone
        this.splitAtHalf = def.splitAtHalf || false;
        this.splitHPFraction = def.splitHPFraction || 0;
        this.hasSplit = false;
        this._pendingSplit = false;

        // Flying state (spawns at exit, flies backward to midpoint, then walks)
        this.flying = false;
        this.flyTarget = null;
        this.landingIndex = 0;
        if (typeName === 'flying' || typeName === 'dragonflyer') {
            this.flying = true;
            this.flySpeed = 110; // px/s (slow glide)
            // Start at the exit (last waypoint)
            const lastWP = path[path.length - 1];
            this.x = lastWP.x;
            this.y = lastWP.y;
            // Pick a landing waypoint between 40-60% of path
            const minIdx = Math.floor(path.length * 0.3);
            const maxIdx = Math.floor(path.length * 0.5);
            this.landingIndex = minIdx + Math.floor(Math.random() * (maxIdx - minIdx + 1));
            this.flyTarget = { x: path[this.landingIndex].x, y: path[this.landingIndex].y };
            // Store starting position for altitude calculation
            this.flyOrigin = { x: lastWP.x, y: lastWP.y };
            // Curvy flight: progress along direct line + perpendicular sine offset
            const fdx = this.flyTarget.x - lastWP.x;
            const fdy = this.flyTarget.y - lastWP.y;
            this.flyTotalDist = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
            this.flyDirX = fdx / this.flyTotalDist;
            this.flyDirY = fdy / this.flyTotalDist;
            this.flyPerpX = -this.flyDirY; // perpendicular
            this.flyPerpY = this.flyDirX;
            this.flyProgress = 0; // 0→1
            this.flyAmplitude = 60 + Math.random() * 40; // 60-100px sine offset
            this.flyFrequency = 2 + Math.random(); // 2-3 full sine cycles
        }

        // Visual
        this.angle = 0;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.damageFlashTimer = 0;
        this.deathTimer = -1;
        this.displayHP = this.hp;
        this.dustTimer = 0;
    }

    takeDamage(amount) {
        // Siege Golem absorb invulnerability
        if (this.absorbTimer > 0) return 0;

        // Forest Stalker dodge
        if (this.dodgeCharges > 0) {
            this.dodgeCharges--;
            this._dodged = true;
            this.dodgeFlashTimer = 0.3;
            return 0;
        }

        let effective = amount * (1 - this.armor);

        // Storm Herald shield absorption
        if (this.shieldHP > 0) {
            if (effective <= this.shieldHP) {
                this.shieldHP -= effective;
                this.damageFlashTimer = 0.1;
                return effective;
            }
            effective -= this.shieldHP;
            this.shieldHP = 0;
        }

        this.hp -= effective;
        this.damageFlashTimer = 0.1;

        // Siege Golem hit counter
        if (this.absorbEvery > 0) {
            this.hitCounter++;
            if (this.hitCounter >= this.absorbEvery) {
                this.hitCounter = 0;
                this.absorbTimer = 2.0;
            }
        }

        // Void Sovereign half-HP split
        if (this.splitAtHalf && !this.hasSplit && this.hp <= this.maxHP * 0.5 && this.hp > 0) {
            this.hasSplit = true;
            this._pendingSplit = true;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return effective;
    }

    applySlow(factor, duration) {
        // Take best of each independently — stronger slow + longer duration
        if (factor < this.slowFactor) this.slowFactor = factor;
        if (duration > this.slowTimer) this.slowTimer = duration;
    }

    applyFreeze(duration) {
        const effectiveDuration = (this.type === 'megaboss' || this.type === 'quantumboss') ? duration * 0.5 : duration;
        this.freezeTimer = Math.max(this.freezeTimer, effectiveDuration);
        this.isFrozen = true;
    }

    applyShock(duration) {
        this.shockTimer = Math.max(this.shockTimer, duration);
        this.isShocked = true;
    }

    applyArmorShred(amount, duration) {
        // Only add stack if shred amount matches current (or is stronger)
        if (amount >= this.armorShredAmount) {
            this.armorShredAmount = amount;
            this.armorShredStacks = Math.min(3, this.armorShredStacks + 1);
        }
        this.armorShredTimer = Math.max(this.armorShredTimer, duration);
        this.armor = Math.max(0, this.baseArmor - this.armorShredAmount * this.armorShredStacks);
    }

    applyBurn(dps, duration, sourceType, sourceId) {
        // Take best of each independently — stronger DPS + longer duration
        if (dps > this.burnDPS) this.burnDPS = dps;
        if (duration > this.burnTimer) this.burnTimer = duration;
        if (sourceType) this.burnSource = sourceType;
        if (sourceId != null) this.burnSourceId = sourceId;
    }

    applyKnockback(cells, towerId) {
        // Bosses and mega bosses immune, tanks 50% resistance
        if (this.type === 'boss' || this.type === 'megaboss' || this.type === 'quantumboss') return;
        // Each pulse tower can only knockback this enemy once
        if (towerId !== undefined && this.knockbackSources.has(towerId)) return;
        if (towerId !== undefined) this.knockbackSources.add(towerId);
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

        if (wi < 0) wi = 0;

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
                this.deathTimer = 0; // Trigger death animation & rewards
            }
        }

        // Regen (from wave modifier)
        if (this.regenRate > 0 && this.hp < this.maxHP) {
            this.hp = Math.min(this.maxHP, this.hp + this.regenRate * dt);
        }

        // Dodge flash decay
        if (this.dodgeFlashTimer > 0) this.dodgeFlashTimer -= dt;

        // Absorb timer decay (Siege Golem invulnerability)
        if (this.absorbTimer > 0) this.absorbTimer -= dt;

        // Burrow timer (Sand Titan)
        if (this.burrowInterval > 0) {
            if (this.burrowed) {
                this.burrowRemaining -= dt;
                if (this.burrowRemaining <= 0) {
                    this.burrowed = false;
                    this.burrowRemaining = 0;
                }
            } else {
                this.burrowTimer += dt;
                if (this.burrowTimer >= this.burrowInterval) {
                    this.burrowTimer = 0;
                    this.burrowed = true;
                    this.burrowRemaining = this.burrowDuration;
                }
            }
        }

        // Flying movement: curvy sine path toward landing target
        if (this.flying) {
            const prevX = this.x, prevY = this.y;
            this.flyProgress += (this.flySpeed * dt) / this.flyTotalDist;
            if (this.flyProgress >= 1) {
                // Landed
                this.x = this.flyTarget.x;
                this.y = this.flyTarget.y;
                this.flying = false;
                this.waypointIndex = this.landingIndex;
                this.flyTarget = null;
            } else {
                // Base position along direct line
                const baseX = this.flyOrigin.x + this.flyDirX * this.flyTotalDist * this.flyProgress;
                const baseY = this.flyOrigin.y + this.flyDirY * this.flyTotalDist * this.flyProgress;
                // Sine offset perpendicular to flight direction, fades to 0 at endpoints
                const envelope = Math.sin(this.flyProgress * Math.PI); // 0 at start/end, 1 at midpoint
                const sineOff = Math.sin(this.flyProgress * this.flyFrequency * Math.PI * 2) * this.flyAmplitude * envelope;
                this.x = baseX + this.flyPerpX * sineOff;
                this.y = baseY + this.flyPerpY * sineOff;
            }
            this.angle = Math.atan2(this.y - prevY, this.x - prevX);
            return;
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
        // Spatial grid for fast range queries — reuses game grid dimensions
        this.spatialGrid = null;
        this._initSpatialGrid();
    }

    _initSpatialGrid() {
        this.spatialGrid = new Array(COLS);
        for (let x = 0; x < COLS; x++) {
            this.spatialGrid[x] = new Array(ROWS);
            for (let y = 0; y < ROWS; y++) {
                this.spatialGrid[x][y] = [];
            }
        }
    }

    buildSpatialGrid() {
        // Clear all cells
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                this.spatialGrid[x][y].length = 0;
            }
        }
        // Bucket each living enemy by its grid cell
        for (const e of this.enemies) {
            if (e.deathTimer >= 0.35) continue; // about to be removed
            const gx = Math.floor(e.x / CELL);
            const gy = Math.floor(e.y / CELL);
            // Clamp to grid bounds (enemies can be slightly OOB during flight)
            const cx = gx < 0 ? 0 : gx >= COLS ? COLS - 1 : gx;
            const cy = gy < 0 ? 0 : gy >= ROWS ? ROWS - 1 : gy;
            this.spatialGrid[cx][cy].push(e);
        }
    }

    /**
     * Get enemies near a point using spatial grid lookup.
     * @param {number} x - world x coordinate
     * @param {number} y - world y coordinate
     * @param {number} rangePx - range in pixels
     * @param {object} [opts] - options
     * @param {boolean} [opts.includeFlying=false] - include flying enemies
     * @param {boolean} [opts.includeDying=false] - include enemies with deathTimer >= 0
     * @param {Set} [opts.excludeIds] - enemy IDs to exclude (for chain lightning)
     * @returns {Enemy[]}
     */
    getEnemiesNear(x, y, rangePx, opts) {
        const includeFlying = opts?.includeFlying || false;
        const includeDying = opts?.includeDying || false;
        const excludeIds = opts?.excludeIds || null;

        // Convert range to grid cell bounding box
        const minGX = Math.max(0, Math.floor((x - rangePx) / CELL));
        const maxGX = Math.min(COLS - 1, Math.floor((x + rangePx) / CELL));
        const minGY = Math.max(0, Math.floor((y - rangePx) / CELL));
        const maxGY = Math.min(ROWS - 1, Math.floor((y + rangePx) / CELL));

        const rangeSq = rangePx * rangePx;
        const result = [];

        for (let gx = minGX; gx <= maxGX; gx++) {
            for (let gy = minGY; gy <= maxGY; gy++) {
                const cell = this.spatialGrid[gx][gy];
                for (let i = 0; i < cell.length; i++) {
                    const e = cell[i];
                    if (!e.alive) continue;
                    if (!includeFlying && (e.flying || e.burrowed)) continue;
                    if (!includeDying && e.deathTimer >= 0) continue;
                    if (excludeIds && excludeIds.has(e.id)) continue;
                    const dx = e.x - x;
                    const dy = e.y - y;
                    if (dx * dx + dy * dy <= rangeSq) {
                        result.push(e);
                    }
                }
            }
        }
        return result;
    }

    spawn(typeName, hpScale, modifier, useSecondary, pathIndex) {
        // Flying enemies always use primary path (they start at the exit)
        const actualSecondary = (typeName === 'flying' || typeName === 'dragonflyer') ? false : useSecondary;
        const enemy = new Enemy(typeName, hpScale, this.game.map.getEnemyPath(actualSecondary, pathIndex));
        enemy.isSecondary = actualSecondary;
        if (modifier) enemy.applyModifier(modifier);
        // Late-game speed ramp: exponential +2% per wave starting at wave 26
        const wave = this.game.waves.currentWave;
        if (wave >= 26) {
            const speedMul = Math.pow(1.03, wave - 25);
            enemy.speed *= speedMul;
            enemy.baseSpeed *= speedMul;
        }
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
        // Boss/megaboss enrage: tracked via counter instead of .filter() every frame
        let aliveCount = 0;
        let lastBoss = null;
        for (const e of this.enemies) {
            if (e.alive && e.deathTimer < 0) {
                aliveCount++;
                if (e.type === 'boss' || e.type === 'megaboss' || e.type === 'quantumboss') lastBoss = e;
            }
        }
        if (aliveCount === 1 && lastBoss && !lastBoss.enraged && !this.game.waves.spawning) {
            lastBoss.enraged = true;
            lastBoss.baseSpeed = Math.round(lastBoss.baseSpeed * 1.5);
            lastBoss.baseArmor = Math.max(0, lastBoss.baseArmor - 0.30);
            lastBoss.armor = Math.max(0, lastBoss.armor - 0.30);
            this.game.particles.spawnBigFloatingText(lastBoss.x, lastBoss.y - 30, 'ENRAGED!', '#ff4444');
            this.game.audio.playWaveStart();
            this.game.triggerShake(5, 0.25);
        }

        // Build spatial grid from current positions — used by healers below
        // and by hero/towers/projectiles/scorch zones that query after this update
        this.buildSpatialGrid();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            // Track burn damage (burn bypasses armor, applied directly in e.update)
            if (e.alive && e.burnTimer > 0 && e.deathTimer < 0) {
                this.game.trackDamage(e.burnSource || 'firearrow', e.burnDPS * dt, e.burnSourceId);
            }
            e.update(dt);

            if (e.reached) {
                this.game.debug.onEnemyLeaked(e);
                // Multiplayer client: host handles lives/game-over via state sync
                if (!this.game.isMultiplayer || this.game.net?.isHost) {
                    this.game.economy.loseLives(e.livesCost);
                    this.game.particles.spawnBigFloatingText(e.x, e.y - 10, `-${e.livesCost}`, '#ffffff');
                    if (this.game.economy.lives > 0 && this.game.economy.lives <= 5) {
                        this.game.audio.playLowLivesWarning();
                    }
                    if (this.game.economy.lives <= 0) {
                        this.game.gameOver();
                    }
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

                // Multiplayer client: host handles gold/score — client only does visuals
                const isNetClient = this.game.isMultiplayer && !this.game.net?.isHost;

                if (!isNetClient) {
                    // Kill counter & achievement tracking
                    this.game.runKills++;
                    this.game.achievements.increment('totalKills');
                    if (e.type === 'boss' || e.type === 'megaboss' || e.type === 'quantumboss') this.game.achievements.increment('bossKills');
                    else if (e.type === 'swarm') this.game.achievements.increment('swarmKills');
                    else if (e.type === 'tank') this.game.achievements.increment('tankKills');

                    // Calculate gold reward with gold rush + hero magnet multipliers
                    const waveTag = this.game.waves.waveTag;
                    let goldMulti = waveTag === 'goldrush' ? GOLD_RUSH_MULTIPLIER : 1;
                    if (this.game.waves.modifier === 'horde') goldMulti *= this.game.waves.modifierDef.goldMulti;
                    const heroMulti = this.game.hero?.getGoldMultiplier(e.x, e.y) || 1;
                    goldMulti *= heroMulti;
                    const goldReward = Math.round(e.reward * KILL_GOLD_BONUS * goldMulti);
                    // Multiplayer: split rewards 50/50
                    if (this.game.isMultiplayer) {
                        const half = Math.floor(goldReward / 2);
                        this.game.economy.addGold(half);
                        this.game.economy.partnerGold += half;
                    } else {
                        this.game.economy.addGold(goldReward);
                    }
                    this.game.economy.addScore(e.reward);
                    this.game.achievements.increment('totalGoldEarned', goldReward);
                    const goldColor = heroMulti > 1 ? '#00e5ff' : (goldMulti > 1 ? '#ffaa00' : '#ffd700');
                    this.game.particles.spawnFloatingText(e.x, e.y - 10, `+${goldReward}`, goldColor);

                    // Bounty boss bonus
                    if (e.type === 'boss' && waveTag === 'midboss') {
                        this.game.economy.addGold(MIDBOSS_BOUNTY);
                        this.game.particles.spawnBigFloatingText(e.x, e.y - 30, `BOUNTY +${MIDBOSS_BOUNTY}g`, '#2ecc71');
                    }
                }

                // Type-specific death particles
                this.game.particles.spawnDeathBurst(e.x, e.y, e.type, e.color);

                // Tank screen shake
                if (e.type === 'tank') {
                    this.game.triggerShake(3, 0.15);
                }

                // Boss/megaboss death screen shake + PostFX
                if (e.type === 'boss' || e.type === 'megaboss' || e.type === 'quantumboss') {
                    const isMega = e.type === 'megaboss' || e.type === 'quantumboss';
                    this.game.triggerShake(isMega ? 15 : 10, isMega ? 0.6 : 0.4);
                    this.game.postfx?.flash(isMega ? 0.25 : 0.15, isMega ? 0.3 : 0.2);
                    this.game.postfx?.shockwave(e.x / CANVAS_W, e.y / CANVAS_H, isMega ? 0.8 : 0.5);
                    this.game.postfx?.addFlashLight(e.x, e.y, 1.0, isMega ? 0.1 : 0.84, 0, isMega ? 0.30 : 0.20, 2.0, isMega ? 0.7 : 0.5);
                }

                // Magma Brute death split — spawn fragments at parent position
                if (e.splitOnDeath > 0 && e.splitType && !isNetClient) {
                    const mapMul = this.game.map.def.worldHpMultiplier || 1;
                    const splitHpScale = getWaveHPScale(this.game.waves.currentWave) * mapMul * (this.game.waves.hpModifier || 1);
                    for (let f = 0; f < e.splitOnDeath; f++) {
                        const frag = this.spawn(e.splitType, splitHpScale, this.game.waves.modifier, e.isSecondary);
                        // Place at parent position on same path
                        frag.path = e.path;
                        frag.x = e.x + (Math.random() - 0.5) * 20;
                        frag.y = e.y + (Math.random() - 0.5) * 20;
                        frag.waypointIndex = e.waypointIndex;
                        frag.progress = e.progress;
                    }
                }
                continue;
            }

            // Dodge floating text
            if (e._dodged) {
                e._dodged = false;
                this.game.particles.spawnFloatingText(e.x, e.y - 15, 'DODGE!', '#2d6b2d');
            }

            // Void Sovereign half-HP clone
            if (e._pendingSplit && e.alive) {
                e._pendingSplit = false;
                const isNetClient = this.game.isMultiplayer && !this.game.net?.isHost;
                if (!isNetClient) {
                    const mapMul = this.game.map.def.worldHpMultiplier || 1;
                    const cloneHpScale = getWaveHPScale(this.game.waves.currentWave) * mapMul * (this.game.waves.hpModifier || 1);
                    const clone = this.spawn('voidsovereign', cloneHpScale, this.game.waves.modifier, e.isSecondary);
                    clone.path = e.path;
                    clone.x = e.x + (Math.random() - 0.5) * 15;
                    clone.y = e.y + (Math.random() - 0.5) * 15;
                    clone.waypointIndex = e.waypointIndex;
                    clone.progress = e.progress;
                    // Clone gets reduced HP
                    clone.hp = clone.maxHP * e.splitHPFraction;
                    clone.displayHP = clone.hp;
                    clone.hasSplit = true; // Prevent recursive splitting
                    this.game.particles.spawnBigFloatingText(e.x, e.y - 20, 'SPLIT!', '#4a1a6a');
                }
            }

            // Dust particles while walking (not while flying or burrowed)
            if (e.alive && !e.flying && !e.burrowed && e.dustTimer >= 0.2) {
                e.dustTimer = 0;
                this.game.particles.spawnDust(e.x, e.y + e.radius * 0.5, 1);
            }

            // Healer logic — uses spatial grid for O(nearby) instead of O(all)
            if (e.alive && e.healRate > 0 && e.healRadius > 0) {
                e.healCooldown -= dt;
                if (e.healCooldown <= 0) {
                    e.healCooldown = 0.1;
                    const healRangePx = e.healRadius * CELL;
                    const nearby = this.getEnemiesNear(e.x, e.y, healRangePx);
                    for (const other of nearby) {
                        if (other === e) continue;
                        other.heal(e.healRate * 0.1);
                    }
                }
            }

            // Storm Herald shield aura — grants shields to nearest un-shielded ally
            if (e.alive && e.shieldRadius > 0 && e.shieldAmount > 0) {
                e.shieldTimer -= dt;
                if (e.shieldTimer <= 0) {
                    e.shieldTimer = e.shieldCooldown;
                    const shieldRangePx = e.shieldRadius * CELL;
                    const nearby = this.getEnemiesNear(e.x, e.y, shieldRangePx);
                    for (const other of nearby) {
                        if (other === e || other.shieldHP > 0) continue;
                        const hpScale = other.maxHP / (ENEMY_TYPES[other.type]?.baseHP || 1);
                        const scaledShield = e.shieldAmount * Math.sqrt(hpScale);
                        other.shieldHP = scaledShield;
                        other.maxShieldHP = scaledShield;
                        break; // One ally per cooldown
                    }
                }
            }
        }
    }

    getEnemiesInRange(x, y, range) {
        return this.getEnemiesNear(x, y, range * CELL);
    }

    /** Create an enemy from state sync data (multiplayer client only) */
    spawnFromSync(id, typeName, x, y, hp, maxHP, alive, wpIdx, progress, flying) {
        const path = this.game.map.getEnemyPath(false);
        const enemy = new Enemy(typeName, 1, path);
        enemy.id = id;
        enemy.x = x;
        enemy.y = y;
        enemy.hp = hp;
        enemy.maxHP = maxHP;
        enemy.alive = alive;
        enemy.waypointIndex = wpIdx;
        enemy.progress = progress;
        enemy.flying = flying;
        if (!alive) enemy.deathTimer = 0;
        this.enemies.push(enemy);
        return enemy;
    }

    isEmpty() {
        // Dying enemies (playing death animation) don't count
        return !this.enemies.some(e => e.alive && e.deathTimer < 0);
    }

    reset() {
        this.enemies = [];
        nextEnemyId = 0;
        this._initSpatialGrid();
    }
}
