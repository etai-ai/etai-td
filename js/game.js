import { STATE, CANVAS_W, CANVAS_H, HERO_STATS, MAP_DEFS, TOWER_TYPES, TOWER_LIGHT_DEFS, MAP_AMBIENT_DARKNESS, WAVE_UNLOCKS, SPEED_MULTIPLIERS, SPEED_MIN, SPEED_MAX, ATMOSPHERE_PRESETS, DUAL_SPAWN_WAVE } from './constants.js';
import { hexToGL } from './utils.js';
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
import { WaveDebugger } from './debug.js';
import { PostFX } from './postfx.js';
import { Hero } from './hero.js';
import { Achievements } from './achievements.js';
// Renderer3D loaded dynamically to avoid breaking the game if Three.js CDN is unavailable

const FIXED_DT = 1 / 60; // 60 Hz physics

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

        // Scorch zones (from Bi-Cannon heavy rounds)
        this.scorchZones = [];

        // Atmosphere override state
        this.selectedAtmosphere = localStorage.getItem('td_atmosphere') || 'standard';
        this.atmosphereColors = null;    // { ground, obstacle } or null (path always map-native)
        this.atmosphereParticles = null; // { primary, secondary } or null

        // Track which wave thresholds have been triggered this run
        this._triggeredThresholds = new Set();

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
        this.debug = new WaveDebugger();
        this.postfx = new PostFX(canvases.fx, canvases.terrain, canvases.game);
        this.achievements = new Achievements();

        // 3D renderer (Three.js) — loaded dynamically so CDN failure doesn't break 2D game
        this.renderer3d = null;
        this.use3D = true;
        this._init3D(canvases);

        // Initial terrain render
        this.refreshTerrain();
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
            console.warn('Three.js 3D renderer unavailable:', e.message);
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

    start(mapId) {
        if (mapId) this.selectMap(mapId);
        if (!this.selectedMapId) return;
        this.audio.ensureContext();

        this.economy.startReset();

        // Per-map starting gold
        const mapStartGold = MAP_DEFS[this.selectedMapId]?.startingGold;
        if (mapStartGold) {
            this.economy.gold = mapStartGold;
        }

        this._triggeredThresholds = new Set();

        // Pick random layout, always build secondary paths
        this.map = new GameMap(this.selectedMapId, this.getLayoutIndex());
        this.refreshTerrain();

        this.heroDeathsThisLevel = 0;
        this.hero.reset();

        this.state = STATE.PLAYING;
        this._unlockScreenActive = false;
        this.ui.setupTowerPanel();
        this.ui.hideAllScreens();

        // Play intro voice
        const introVoice = document.getElementById('intro-voice');
        if (introVoice) {
            introVoice.currentTime = 0;
            introVoice.play().catch(() => {});
        }

        this.waves.startNextWave();
        this.ui.update();
    }

    toggle3D() {
        if (!this.renderer3d) return;
        this.use3D = !this.use3D;
        localStorage.setItem('td_use3d', this.use3D ? '1' : '0');
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
        this.adminMode = !this.adminMode;
        if (this.adminMode) {
            this.achievements.check('adminToggle', { on: true });
        }
    }

    togglePause() {
        // Block pause toggle while unlock screen is waiting for Continue
        if (this._unlockScreenActive) return;
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
            this.hero.clearMovement();
        } else if (this.state === STATE.PAUSED) {
            this.state = STATE.PLAYING;
        }
        this.ui.update();
    }

    setSpeed(s) {
        this.speed = s;
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
        this.audio.playGameOver();
        this.ui.update();
        this.ui.showScreen('game-over');
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
                            this.particles.spawnExplosion(t.x, t.y, newDef.color);
                        }
                    }
                    this.refreshTerrain();
                }

                // Hero unlock
                if (unlock.hero && !this.hero.active) {
                    this.hero.init(this.map);
                    this.particles.spawnAuraPulse(this.hero.x, this.hero.y, 60, HERO_STATS.color);
                }

                // Dual spawn bonus gold to help build secondary defenses
                if (unlock.dualSpawn) {
                    this.economy.addGold(100);
                }
            }
        }

        if (unlocksBatch.length > 0) {
            this.ui.setupTowerPanel();
            this.ui.showUnlockScreen(unlocksBatch);
            this.state = STATE.PAUSED;
            this._unlockScreenActive = true;
            this.triggerShake(5, 0.3);
            if (this.postfx.enabled) {
                this.postfx.flash(0.2, 0.3);
            } else {
                this.screenFlash = 0.2;
            }
            this.audio.playExplosion();
        }
    }

    restart() {
        // Save wave record before resetting (covers mid-wave quit)
        if (this.selectedMapId && this.waves.currentWave > 0) {
            Economy.setWaveRecord(this.selectedMapId, this.waves.currentWave);
        }
        this.state = STATE.MENU;
        this._unlockScreenActive = false;
        this.selectedMapId = null;
        this.elapsedTime = 0;
        this.waveElapsed = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this._triggeredThresholds = new Set();
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
    }

    addScorchZone(x, y, radius, dps, duration) {
        this.scorchZones.push({ x, y, radius, dps, timer: duration, maxTimer: duration });
    }

    updateScorchZones(dt) {
        for (let i = this.scorchZones.length - 1; i >= 0; i--) {
            const zone = this.scorchZones[i];
            zone.timer -= dt;
            if (zone.timer <= 0) {
                this.scorchZones.splice(i, 1);
                continue;
            }
            // Damage enemies in zone (bypasses armor like burn)
            for (const e of this.enemies.enemies) {
                if (!e.alive || e.flying) continue;
                const dx = e.x - zone.x;
                const dy = e.y - zone.y;
                if (dx * dx + dy * dy <= zone.radius * zone.radius) {
                    e.hp -= zone.dps * dt;
                    if (e.hp <= 0) {
                        e.hp = 0;
                        e.alive = false;
                    }
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
                lightDef.radius + lvl * 0.02,
                lightDef.intensity + lvl * 0.15,
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
                zone.radius / CANVAS_H * 1.5,
                0.4 * fade,
            );
        }
    }

    run() {
        this.ui.showScreen('menu');
        requestAnimationFrame(t => this.tick(t));
    }
}
