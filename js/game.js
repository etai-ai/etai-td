import { STATE, CANVAS_W, CANVAS_H, HERO_STATS, MAP_DEFS, TOWER_TYPES, TOWER_LIGHT_DEFS, MAP_AMBIENT_DARKNESS, WAVE_UNLOCKS, SPEED_MULTIPLIERS, SPEED_MIN, SPEED_MAX, ATMOSPHERE_PRESETS, DUAL_SPAWN_WAVE, VICTORY_WAVE } from './constants.js';
import { hexToGL, safeStorage } from './utils.js';
import { GameMap } from './map.js';
import { TowerManager } from './tower.js';
import { EnemyManager } from './enemy.js';
import { ProjectileManager } from './projectile.js';
import { ParticleSystem } from './particle.js';
import { WaveManager } from './wave.js';
import { Economy } from './economy.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Music } from './music.js';
import { WaveDebugger } from './debug.js';
import { PostFX } from './postfx.js';
import { Hero } from './hero.js';
import { Achievements } from './achievements.js';
import { Net, ENEMY_TYPE_IDX, IDX_ENEMY_TYPE } from './net.js';
// Renderer3D loaded dynamically to avoid breaking the game if Three.js CDN is unavailable

const FIXED_DT = 1 / 60; // 60 Hz physics

// CrazyGames SDK wrapper — no-ops when SDK unavailable (local dev, ad blocker)
const platform = (() => {
    const crazy = typeof CrazyGames !== 'undefined' ? CrazyGames?.SDK : null;
    const noop = () => {};
    const resolved = () => Promise.resolve();

    if (crazy) return {
        name: 'crazygames',
        init: resolved,
        gameLoadingFinished() { crazy.game.loadingStop(); },
        gameplayStart() { crazy.game.gameplayStart(); },
        gameplayStop() { crazy.game.gameplayStop(); },
        happytime() { crazy.game.happytime(); },
        commercialBreak(onStart) {
            return new Promise(resolve => {
                crazy.ad.requestAd('midgame', {
                    adStarted: () => { if (onStart) onStart(); },
                    adFinished: resolve,
                    adError: () => resolve(),
                });
            });
        },
    };

    // No SDK available (local dev, ad blocker)
    return {
        name: 'none',
        init: resolved,
        gameLoadingFinished: noop,
        gameplayStart: noop,
        gameplayStop: noop,
        happytime: noop,
        commercialBreak: resolved,
    };
})();

export class Game {
    constructor(canvases) {
        this.state = STATE.MENU;
        this.speed = 1;
        this.lastTime = 0;
        this.accumulator = 0;
        this.selectedMapId = null;
        this.adminMode = false;
        this.autoWave = true;
        this.elapsedTime = 0;
        this.waveElapsed = 0;

        // Screen shake & flash
        this.screenFlash = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Per-run kill counter
        this.runKills = 0;
        // Per-run damage tracking by tower type and individual tower
        this.damageByType = {};
        this.damageByTower = {};

        // Scorch zones (from Bi-Cannon heavy rounds)
        this.scorchZones = [];

        // Atmosphere override state
        this.selectedAtmosphere = safeStorage.getItem('td_atmosphere') || 'standard';
        this.atmosphereColors = null;    // { ground, obstacle } or null (path always map-native)
        this.atmosphereParticles = null; // { primary, secondary } or null

        // Multiplayer state
        this.isMultiplayer = false;
        this.net = null;
        this._netTypes = { ENEMY_TYPE_IDX, IDX_ENEMY_TYPE };
        this._syncFrameCounter = 0;

        // Track which wave thresholds have been triggered this run
        this._triggeredThresholds = new Set();
        // Towers pending transformation animation (filled during onWaveThreshold)
        this._transformingTowers = [];

        // Store canvas references for 3D toggle visibility
        this._canvases = canvases;

        // Core systems
        this.map = new GameMap();
        this.economy = new Economy();
        this.enemies = new EnemyManager(this);
        this.towers = new TowerManager(this);
        this.projectiles = new ProjectileManager(this);
        this.particles = new ParticleSystem();
        this.hero = new Hero(this);
        this.waves = new WaveManager(this);
        this.renderer = new Renderer(canvases, this);
        this.input = new InputHandler(canvases.ui, this);
        this.ui = new UI(this);
        this.audio = new Audio();
        this.music = null;
        this.debug = new WaveDebugger();
        this.postfx = new PostFX(canvases.fx, canvases.terrain, canvases.game);
        this.achievements = new Achievements();

        // 3D renderer (Three.js) — loaded dynamically so CDN failure doesn't break 2D game
        this.renderer3d = null;
        this.use3D = true;
        this._init3D(canvases);

        // Initial terrain render
        this.refreshTerrain();

        // Platform SDK init
        platform.init().then(() => {
            platform.gameLoadingFinished();
        });
    }

    async _init3D(canvases) {
        if (!canvases.three) { this._fallback2D(); return; }
        try {
            const { Renderer3D } = await import('./renderer3d.js');
            this.renderer3d = new Renderer3D(canvases, this);
            this.use3D = true;
            this._apply3DVisibility();
            this.renderer3d.drawTerrain();
            // Fire-and-forget GLTF tower model loading
            import('./meshes/gltf-loader.js').then(loader => {
                loader.loadAllTowerModels().then(loaded => {
                    if (loaded && this.renderer3d) this.renderer3d.drawTerrain();
                });
            }).catch(() => {}); // silent — procedural fallback is fine
        } catch (e) {
            // Three.js 3D renderer unavailable — silent fallback
            this._fallback2D();
        }
    }

    /** Restore 2D visibility when Three.js is unavailable */
    _fallback2D() {
        this.use3D = false;
        this._canvases.terrain.style.visibility = '';
        this.refreshTerrain();
    }

    /** Call instead of renderer.drawTerrain() to keep both renderers in sync */
    refreshTerrain() {
        this.renderer.drawTerrain();
        if (this.renderer3d) this.renderer3d.drawTerrain();
    }

    selectMap(mapId) {
        this.selectedMapId = mapId;
        this.map = new GameMap(mapId);
        this._applyAtmosphere();
        this.refreshTerrain();
    }

    _applyAtmosphere() {
        const preset = ATMOSPHERE_PRESETS[this.selectedAtmosphere];
        const mapId = this.selectedMapId;
        if (!preset || this.selectedAtmosphere === 'standard') {
            // Standard: use map-native visuals
            this.atmosphereColors = null;
            this.atmosphereParticles = null;
            const tints = {
                serpentine: [0.95, 1.0, 0.9],
                splitcreek: [0.9, 0.95, 1.05],
                gauntlet: [1.05, 0.95, 0.9],
                citadel: [0.92, 0.95, 1.0],
                skyislands: [0.92, 0.97, 1.08],
                nexus: [0.95, 0.90, 1.10],
            };
            if (this.postfx.enabled) {
                const t = tints[mapId] || [1, 1, 1];
                this.postfx.setMapTint(t[0], t[1], t[2]);
                this.postfx.setAmbientDarkness(MAP_AMBIENT_DARKNESS[mapId] || 0);
                this.postfx.bloomIntensity = 0.3;
                this.postfx.bloomThreshold = 0.7;
                this.postfx.vignetteStrength = 0.4;
            }
            if (this.renderer3d && this.renderer3d.scene3d) {
                this.renderer3d.scene3d.applyAtmosphereLighting(null);
            }
            return;
        }
        // Apply atmosphere overrides
        this.atmosphereColors = { ground: preset.ground, obstacle: preset.obstacle };
        this.atmosphereParticles = preset.particles;
        if (this.postfx.enabled && preset.postfx) {
            const pf = preset.postfx;
            this.postfx.setMapTint(pf.mapTint[0], pf.mapTint[1], pf.mapTint[2]);
            this.postfx.setAmbientDarkness(pf.ambientDarkness);
            this.postfx.bloomIntensity = pf.bloomIntensity;
            this.postfx.bloomThreshold = pf.bloomThreshold;
            this.postfx.vignetteStrength = pf.vignetteStrength;
        }
        if (this.renderer3d && this.renderer3d.scene3d && preset.lighting) {
            this.renderer3d.scene3d.applyAtmosphereLighting(preset.lighting);
        }
    }

    getEffectiveWave() {
        return this.waves.currentWave;
    }

    getLayoutIndex() {
        const numLayouts = MAP_DEFS[this.selectedMapId].layouts.length;
        return Math.floor(Math.random() * numLayouts);
    }

    start(mapId, layoutIndex) {
        if (mapId) this.selectMap(mapId);
        if (!this.selectedMapId) return;
        this.audio.ensureContext();

        this.economy.startReset();

        // Per-map starting gold
        const mapStartGold = MAP_DEFS[this.selectedMapId]?.startingGold;
        if (mapStartGold) {
            this.economy.gold = mapStartGold;
        }

        // Multiplayer: halve starting gold, each player gets 50%
        if (this.isMultiplayer) {
            const halfGold = Math.floor(this.economy.gold / 2);
            this.economy.gold = halfGold;
            this.economy.partnerGold = halfGold;
        }

        this._triggeredThresholds = new Set();

        // Pick random layout (or use provided index from host), always build secondary paths
        const li = layoutIndex != null ? layoutIndex : this.getLayoutIndex();
        this.map = new GameMap(this.selectedMapId, li);
        this.refreshTerrain();

        this.heroDeathsThisLevel = 0;
        this.runKills = 0;
        this.damageByType = {};
        this.damageByTower = {};
        this.hero.reset();

        this.state = STATE.PLAYING;
        this._unlockScreenActive = false;
        this._victoryShown = false;
        this.ui.setupTowerPanel();
        this.ui.hideAllScreens();

        // Start procedural music
        if (this.music) this.music.stop();
        if (this.audio.ctx) {
            this.music = new Music(this.audio.ctx, this.audio.masterGain);
            this.music.start();
        }

        this.waves.startNextWave();
        this.ui.update();
        platform.gameplayStart();
    }

    toggle3D() {
        if (!this.renderer3d) return;
        this.use3D = !this.use3D;
        safeStorage.setItem('td_use3d', this.use3D ? '1' : '0');
        this._apply3DVisibility();
        if (this.use3D) {
            this.renderer3d.drawTerrain();
        } else {
            this.refreshTerrain();
        }
    }

    _apply3DVisibility() {
        if (this.use3D) {
            // Three-canvas always active (WebGL renders to it) when 3D is on
            this._canvases.three.style.display = 'block';
            if (this.postfx.enabled) {
                // PostFX composites tilted 3D scene + foreshortened 2D overlays
                this.postfx.terrainCanvas = this._canvases.three;
                this.postfx.setTerrainDirty();
                this._canvases.terrain.style.visibility = 'hidden';
                this._canvases.game.style.visibility = 'hidden';
                this._canvases.three.style.visibility = 'hidden'; // PostFX reads it
                this._canvases.fx.style.display = '';
            } else {
                // No PostFX: three-canvas shows terrain+meshes, game-canvas overlays on top
                this._canvases.terrain.style.visibility = 'hidden';
                this._canvases.game.style.visibility = 'visible';
                this._canvases.three.style.visibility = 'visible';
                this._canvases.fx.style.display = 'none';
            }
        } else {
            this._canvases.three.style.display = 'none';
            if (this.postfx.enabled) {
                this.postfx.terrainCanvas = this._canvases.terrain;
                this.postfx.setTerrainDirty();
                this._canvases.terrain.style.visibility = 'hidden';
                this._canvases.game.style.visibility = 'hidden';
                this._canvases.fx.style.display = '';
            } else {
                this._canvases.terrain.style.visibility = '';
                this._canvases.game.style.visibility = '';
            }
        }
    }

    toggleAdmin() {
        if (this.adminMode) {
            this.adminMode = false;
            return;
        }
        const pw = prompt('Enter admin password:');
        if (pw !== 'Ytheking') return;
        this.adminMode = true;
        this.achievements.check('adminToggle', { on: true });
    }

    togglePause() {
        // Block pause toggle while unlock screen is waiting for Continue
        if (this._unlockScreenActive) return;
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
            this.hero.clearMovement();
            if (this.music) this.music.pause();
            platform.gameplayStop();
        } else if (this.state === STATE.PAUSED) {
            this.state = STATE.PLAYING;
            if (this.music) this.music.resume();
            platform.gameplayStart();
        }
        this.ui.update();
    }

    setSpeed(s) {
        this.speed = s;
        if (this.isMultiplayer && this.net) {
            this.net.sendSpeedChange(s);
        }
        this.ui.update();
    }

    gameOver() {
        this.state = STATE.GAME_OVER;
        Economy.setWaveRecord(this.selectedMapId, this.waves.currentWave);
        this.achievements.set('highestWave', this.waves.currentWave);
        this.achievements.set('highestScore', this.economy.score);
        // Per-map wave record for map achievements
        if (this.selectedMapId) {
            this.achievements.set(`${this.selectedMapId}_best`, this.waves.currentWave);
        }
        // Multiplayer: broadcast game over to partner
        if (this.isMultiplayer && this.net?.isHost) {
            this.net.sendGameOver();
        }
        if (this.music) this.music.stop();
        this.audio.playGameOver();
        this.ui.update();
        this.ui.showScreen('game-over');
        platform.gameplayStop();
    }

    onWaveThreshold(wave) {
        const effectiveWave = this.getEffectiveWave();
        // Collect all unlocks that fire this wave
        const unlocksBatch = [];

        for (const [thresholdStr, unlock] of Object.entries(WAVE_UNLOCKS)) {
            const threshold = parseInt(thresholdStr);
            if (effectiveWave >= threshold && !this._triggeredThresholds.has(threshold)) {
                this._triggeredThresholds.add(threshold);
                // Skip dual spawn unlock screen if map uses a different dualSpawnWave
                if (unlock.dualSpawn && (this.map?.def?.dualSpawnWave ?? DUAL_SPAWN_WAVE) !== DUAL_SPAWN_WAVE) continue;
                unlocksBatch.push(unlock);

                // Auto-upgrade placed towers to their replacements
                if (unlock.towers && unlock.replacesKeys) {
                    for (let i = 0; i < unlock.replacesKeys.length; i++) {
                        const oldKey = unlock.replacesKeys[i];
                        const newKey = unlock.keys[i];
                        const newDef = TOWER_TYPES[newKey];
                        for (const t of this.towers.towers) {
                            if (t.type !== oldKey) continue;
                            t.type = newKey;
                            t.name = newDef.name;
                            t.color = newDef.color;
                            t.size = newDef.size || 1;
                            t.aura = newDef.aura || false;
                            t.missile = newDef.missile || false;
                            t.dualBarrel = newDef.dualBarrel || false;
                            t.totalInvested = newDef.cost;
                            t.level = 0;
                            t.updateStats();
                            this._transformingTowers.push(t);
                        }
                    }
                    this.refreshTerrain();
                }

                // Hero unlock (disabled in multiplayer)
                if (unlock.hero && !this.hero.active && !this.isMultiplayer) {
                    this.hero.init(this.map);
                    this.particles.spawnAuraPulse(this.hero.x, this.hero.y, 60, HERO_STATS.color);
                }

                // Dual spawn bonus gold to help build secondary defenses
                if (unlock.dualSpawn) {
                    if (this.isMultiplayer) {
                        this.economy.addGold(50);
                        this.economy.partnerGold += 50;
                    } else {
                        this.economy.addGold(100);
                    }
                }
            }
        }

        if (unlocksBatch.length > 0) {
            this.ui.setupTowerPanel();
            this.ui.showUnlockScreen(unlocksBatch);
            this.state = STATE.PAUSED;
            this._unlockScreenActive = true;
            if (this.music) this.music.pause();
            this.triggerShake(5, 0.3);
            if (this.postfx.enabled) {
                this.postfx.flash(0.2, 0.3);
            } else {
                this.screenFlash = 0.2;
            }
            this.audio.playExplosion();
        }
    }

    startTransformAnimations() {
        for (let i = 0; i < this._transformingTowers.length; i++) {
            const t = this._transformingTowers[i];
            // Stagger: first tower starts immediately, each subsequent +0.15s
            t.transformTimer = 1.0 + i * 0.15;
            t._transformFlashed = false;
            t._transformSlammed = false;
        }
        this._transformingTowers = [];
    }

    restart() {
        // Save wave record before resetting (covers mid-wave quit)
        if (this.selectedMapId && this.waves.currentWave > 0) {
            Economy.setWaveRecord(this.selectedMapId, this.waves.currentWave);
        }
        platform.gameplayStop();

        // Disconnect multiplayer
        if (this.isMultiplayer && this.net) {
            this.net.disconnect();
        }
        this.isMultiplayer = false;
        this.net = null;
        this._syncFrameCounter = 0;

        // Show commercial break (ad) before returning to menu
        platform.commercialBreak(() => {
            this.audio.mute();
        }).then(() => {
            this.audio.unmute();
            this._doRestart();
        });
    }

    _doRestart() {
        if (this.music) { this.music.stop(); this.music = null; }
        this.state = STATE.MENU;
        this._unlockScreenActive = false;
        this._victoryShown = false;
        this.selectedMapId = null;
        this.elapsedTime = 0;
        this.waveElapsed = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this._triggeredThresholds = new Set();
        this._transformingTowers = [];
        this.runKills = 0;
        this.damageByType = {};
        this.damageByTower = {};
        this.debug.reset();
        this.economy.reset();
        this.enemies.reset();
        this.towers.reset();
        this.projectiles.reset();
        this.particles.reset();
        this.scorchZones = [];
        this.waves.reset();
        this.input.reset();
        this.hero.reset();
        this.refreshTerrain();
        this.ui.setupTowerPanel();
        this.ui.showScreen('menu');
        this.ui.update();
    }

    tick(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const frameDelta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (this.state === STATE.PLAYING) {
            this.accumulator += frameDelta * (SPEED_MULTIPLIERS[this.speed] || this.speed);
            while (this.accumulator >= FIXED_DT) {
                this.update(FIXED_DT);
                this.accumulator -= FIXED_DT;
            }
            if (this.music) this.music.update(frameDelta);
        }

        if (this.use3D && this.renderer3d) {
            this.renderer3d.drawFrame(this.accumulator / FIXED_DT);
            // Three-canvas updates every frame — tell PostFX to re-read it
            if (this.postfx.enabled) this.postfx.setTerrainDirty();
        }

        // Draw 2D overlays (enemies HP bars, projectiles, particles, etc.)
        this.renderer.drawFrame(this.accumulator / FIXED_DT);

        if (this.postfx.enabled) {
            this.registerLights();
            this.postfx.render();
        }
        if (this.state === STATE.PLAYING) this.ui.update();
        requestAnimationFrame(t => this.tick(t));
    }

    triggerShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    blowThemAll() {
        const enemies = this.enemies.enemies;
        let count = 0;
        for (const e of enemies) {
            if (e.alive && e.deathTimer < 0) {
                e.hp = 0;
                e.alive = false;
                this.particles.spawnExplosion(e.x, e.y, e.color);
                count++;
            }
        }
        if (count > 0) {
            this.triggerShake(12, 0.6);
            this.audio.playExplosion();
            if (this.postfx.enabled) {
                this.postfx.flash(0.3, 0.3);
            } else {
                this.screenFlash = 0.3;
            }
        }
    }

    adminSetWave(waveNum) {
        // Clear field and jump to specific wave
        this.enemies.reset();
        this.projectiles.reset();
        this.waves.currentWave = waveNum - 1;
        this.waves.spawning = false;
        this.waves.waveComplete = false;
        this.waves.betweenWaves = false;
        this.waves._nextWaveCache = null;
        this.waves.startNextWave();
        // Trigger any thresholds we jumped past
        this.onWaveThreshold(waveNum);
    }

    update(dt) {
        // Update screen flash (Canvas 2D fallback)
        if (this.screenFlash > 0) this.screenFlash -= dt;

        // Update post-processing timers
        this.postfx.update(dt);

        // Update screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const t = this.shakeTimer / 0.4; // normalized
            const scale = this.shakeIntensity * Math.max(0, t);
            this.shakeOffsetX = (Math.random() * 2 - 1) * scale;
            this.shakeOffsetY = (Math.random() * 2 - 1) * scale;
            if (this.shakeTimer <= 0) {
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
            }
        }

        this.elapsedTime += dt;
        this.waveElapsed += dt;

        this.waves.update(dt);
        this.enemies.update(dt);
        this.hero.update(dt);
        this.towers.update(dt);
        this.projectiles.update(dt);
        this.particles.update(dt);
        this.updateScorchZones(dt);

        // Check wave completion
        if (this.waves.isWaveComplete() && this.enemies.isEmpty()) {
            this.waves.onWaveComplete();
        }

        // Multiplayer: host sends state sync every 10 frames (~166ms at 60Hz)
        if (this.isMultiplayer && this.net?.isHost) {
            this._syncFrameCounter++;
            if (this._syncFrameCounter >= 10) {
                this._syncFrameCounter = 0;
                this._sendStateSync();
            }
        }
    }

    trackDamage(towerType, amount, towerId) {
        if (amount <= 0) return;
        this.damageByType[towerType] = (this.damageByType[towerType] || 0) + amount;
        if (towerId != null) {
            if (!this.damageByTower[towerId]) {
                this.damageByTower[towerId] = { type: towerType, damage: 0 };
            }
            this.damageByTower[towerId].damage += amount;
        }
    }

    addScorchZone(x, y, radius, dps, duration, towerId) {
        this.scorchZones.push({ x, y, radius, dps, timer: duration, maxTimer: duration, towerId });
    }

    updateScorchZones(dt) {
        for (let i = this.scorchZones.length - 1; i >= 0; i--) {
            const zone = this.scorchZones[i];
            zone.timer -= dt;
            if (zone.timer <= 0) {
                this.scorchZones.splice(i, 1);
                continue;
            }
            // Damage enemies in zone (bypasses armor like burn) — uses spatial grid
            const nearby = this.enemies.getEnemiesNear(zone.x, zone.y, zone.radius);
            for (const e of nearby) {
                const scorchDmg = zone.dps * dt;
                e.hp -= scorchDmg;
                this.trackDamage('bicannon', scorchDmg, zone.towerId);
                if (e.hp <= 0) {
                    e.hp = 0;
                    e.alive = false;
                }
            }
        }
    }

    registerLights() {
        const pfx = this.postfx;

        // Towers — colored glow matching tower theme
        for (const t of this.towers.towers) {
            const lightDef = TOWER_LIGHT_DEFS[t.type];
            if (!lightDef) continue;
            const [r, g, b] = hexToGL(TOWER_TYPES[t.type].color);
            const lvl = t.level;
            pfx.addLight(
                t.x, t.y, r, g, b,
                lightDef.radius + lvl * 0.015,
                lightDef.intensity + lvl * 0.12,
            );
        }

        // Projectiles — moving lights
        for (const p of this.projectiles.projectiles) {
            if (!p.alive) continue;
            const [r, g, b] = hexToGL(p.getColor());
            const rad = p.missile ? 0.05 : (p.splashRadius > 0 ? 0.04 : 0.03);
            const int = p.missile ? 0.8 : (p.splashRadius > 0 ? 0.6 : 0.5);
            pfx.addLight(p.x, p.y, r, g, b, rad, int);
        }

        // Hero — cyan glow + gold magnet aura + execute glow
        const hero = this.hero;
        if (hero.active && hero.alive) {
            if (hero.executeAnimTimer >= 0 && hero.executeAnimTimer < 0.6) {
                const t = hero.executeAnimTimer / 0.6;
                pfx.addLight(hero.x, hero.y, 1.0, 0.2 + t * 0.6, 0, 0.10 + t * 0.25, 0.8 + t * 1.5);
            } else {
                pfx.addLight(hero.x, hero.y, 0, 0.9, 1.0, 0.08, 0.6);
            }
            if (hero.magnetActive) {
                pfx.addLight(hero.x, hero.y, 1.0, 0.84, 0, 0.15, 0.4);
            }
        }

        // Scorch zones — orange-red fire glow
        for (const zone of this.scorchZones) {
            const fade = zone.timer / zone.maxTimer;
            pfx.addLight(
                zone.x, zone.y,
                1.0, 0.3, 0,
                zone.radius / CANVAS_H * 1.2,
                0.3 * fade,
            );
        }
    }

    showMilestone(wave) {
        const stats = {
            kills: this.runKills,
            towers: this.towers.towers.length,
            lives: this.economy.lives,
            gold: this.economy.gold,
            elapsed: this.elapsedTime,
        };
        this.state = STATE.PAUSED;
        this._unlockScreenActive = true;
        if (this.music) this.music.pause();
        this.ui.showMilestoneScreen(wave, stats);
    }

    showVictory() {
        this._victoryShown = true;
        this.state = STATE.PAUSED;
        this._unlockScreenActive = true;
        if (this.music) this.music.pause();

        // Celebration effects
        this.triggerShake(15, 0.5);
        if (this.postfx.enabled) {
            this.postfx.flash(0.4, 0.4);
            this.postfx.shockwave(0.5, 0.5, 1.2);
            this.postfx.aberration(0.8, 0.3);
        }

        const stats = {
            kills: this.runKills,
            towers: this.towers.towers.length,
            score: this.economy.score,
            lives: this.economy.lives,
            gold: this.economy.gold,
            elapsed: this.elapsedTime,
        };
        this.ui.showVictoryScreen(stats);
        platform.happytime();
    }

    // ── Multiplayer ─────────────────────────────────────────

    async initMultiplayer(serverUrl) {
        this.net = new Net(this);
        await this.net.connect(serverUrl);
        this.isMultiplayer = true;
        return this.net;
    }

    _sendStateSync() {
        const enemies = this.enemies.enemies;
        const e = [];
        for (const en of enemies) {
            if (!en.alive && en.deathTimer < 0) continue;
            e.push([
                en.id, Math.round(en.x), Math.round(en.y),
                Math.round(en.hp), Math.round(en.maxHP),
                ENEMY_TYPE_IDX[en.type] ?? 0,
                en.alive ? 1 : 0, en.waypointIndex, en.progress,
                en.flying ? 1 : 0,
            ]);
        }
        this.net.sendStateSync({
            e,
            g: [this.economy.gold, this.economy.partnerGold],
            l: this.economy.lives,
            w: this.waves.currentWave,
            s: this.economy.score,
            sp: this.waves.spawning ? 1 : 0,
        });
    }

    _onNetMapSelect(mapId, layoutIndex) {
        this._mpLayoutIndex = layoutIndex;
        this.selectMap(mapId);
        this.ui.showMPLobbyStatus('Host selected map. Ready to start!');
    }

    _onNetGameStart() {
        this.start(this.selectedMapId, this._mpLayoutIndex);
    }

    _onNetTowerPlace(typeName, gx, gy, towerId, ownerId) {
        // Relay only goes to the other player — host never receives own broadcasts
        const def = TOWER_TYPES[typeName];
        // Client: deduct own gold for immediate UI feedback when it's our tower
        if (!this.net.isHost && ownerId === this.net.playerId) {
            this.economy.spendGold(def.cost);
        }
        this.towers.place(typeName, gx, gy, {
            ownerId,
            assignedId: towerId,
            skipGold: true,
        });
    }

    _onNetTowerPlaceRequest(typeName, gx, gy) {
        // Host-only: client requested to place a tower — validate and create
        if (!this.net.isHost) return;
        const def = TOWER_TYPES[typeName];
        if (!this.towers.canPlace(gx, gy, typeName)) return;
        if (this.economy.partnerGold < def.cost) return;

        // Deduct from client's gold pool on host
        this.economy.partnerGold -= def.cost;

        const tower = this.towers.place(typeName, gx, gy, {
            ownerId: 2,
            skipGold: true,
        });
        if (tower) {
            // Broadcast the confirmed placement to both (relay goes to client)
            this.net.sendTowerPlace(typeName, gx, gy, tower.id, 2);
        }
    }

    _onNetTowerSell(towerId) {
        const tower = this.towers.getTowerById(towerId);
        if (!tower) return;
        const value = tower.getSellValue();
        if (this.net.isHost && tower.ownerId === 2) {
            // Host: sell removes tower and adds gold to host's pool via sell().
            // We need to credit partner instead, so we reverse the host credit after.
            this.towers.sell(tower);
            this.economy.gold -= value; // undo addGold from sell()
            this.economy.partnerGold += value;
        } else {
            // Client: host sold their tower — remove visually, don't credit our gold
            this.towers.sell(tower);
            this.economy.gold -= value; // undo addGold from sell()
        }
    }

    _onNetTowerUpgrade(towerId) {
        const tower = this.towers.getTowerById(towerId);
        if (!tower) return;
        const cost = tower.getUpgradeCost();
        if (cost === null) return;

        if (this.net.isHost && tower.ownerId === 2) {
            // Host: deduct from partner gold
            if (this.economy.partnerGold < cost) return;
            this.economy.partnerGold -= cost;
            tower.upgrade();
            this.refreshTerrain();
            this.particles.spawnUpgradeSparkle(tower.x, tower.y);
        } else {
            // Client: host upgraded their tower — apply visually, don't touch our gold
            tower.upgrade();
            this.refreshTerrain();
            this.particles.spawnUpgradeSparkle(tower.x, tower.y);
        }
    }

    _onNetWaveDef(data) {
        // Client receives wave definition from host
        this.waves.applyWaveDef(data);
    }

    _onNetStateSync(state) {
        // Client applies state corrections from host
        if (this.net.isHost) return;

        // Update economy
        this.economy.gold = state.g[1]; // client's gold is index 1
        this.economy.partnerGold = state.g[0]; // host's gold
        this.economy.lives = state.l;
        this.economy.score = state.s;
        this.waves.currentWave = state.w;
        this.waves.spawning = state.sp === 1;

        // Full enemy reconciliation — host is authoritative
        const localMap = new Map();
        for (const en of this.enemies.enemies) {
            localMap.set(en.id, en);
        }

        const hostIds = new Set();
        for (const ed of state.e) {
            const [id, x, y, hp, maxHP, typeIdx, alive, wpIdx, progress, flying] = ed;
            hostIds.add(id);
            const en = localMap.get(id);
            if (en) {
                // Update existing enemy
                en.x = x;
                en.y = y;
                en.hp = hp;
                en.maxHP = maxHP;
                en.displayHP = hp;
                en.alive = alive === 1;
                en.waypointIndex = wpIdx;
                en.progress = progress;
                en.flying = flying === 1;
                if (!en.alive && en.deathTimer < 0) en.deathTimer = 0;
            } else {
                // Create enemy that exists on host but not on client
                const typeName = IDX_ENEMY_TYPE[typeIdx] || 'grunt';
                this.enemies.spawnFromSync(id, typeName, x, y, hp, maxHP, alive === 1, wpIdx, progress, flying === 1);
            }
        }

        // Remove enemies that exist on client but not on host
        this.enemies.enemies = this.enemies.enemies.filter(en => hostIds.has(en.id));

        this.ui.update();
    }

    _onNetGoldUpdate(hostGold, clientGold) {
        if (this.net.isHost) return;
        this.economy.gold = clientGold;
        this.economy.partnerGold = hostGold;
        this.ui.update();
    }

    run() {
        this.ui.showScreen('menu');
        requestAnimationFrame(t => this.tick(t));
    }
}
