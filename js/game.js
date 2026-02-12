import { STATE, CANVAS_W, CANVAS_H } from './constants.js';
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

const FIXED_DT = 1 / 60; // 60 Hz physics

export class Game {
    constructor(canvases) {
        this.state = STATE.MENU;
        this.speed = 2;
        this.lastTime = 0;
        this.accumulator = 0;
        this.selectedMapId = null;
        this.worldLevel = 0;
        this.adminMode = false;
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

        // Core systems
        this.map = new GameMap();
        this.economy = new Economy();
        this.enemies = new EnemyManager(this);
        this.towers = new TowerManager(this);
        this.projectiles = new ProjectileManager(this);
        this.particles = new ParticleSystem();
        this.waves = new WaveManager(this);
        this.renderer = new Renderer(canvases, this);
        this.input = new InputHandler(canvases.ui, this);
        this.ui = new UI(this);
        this.audio = new Audio();
        this.debug = new WaveDebugger();
        this.postfx = new PostFX(canvases.fx, canvases.terrain, canvases.game);

        // Initial terrain render
        this.renderer.drawTerrain();
    }

    selectMap(mapId) {
        this.selectedMapId = mapId;
        this.map = new GameMap(mapId);
        this.renderer.drawTerrain();
        // Per-map color grading
        const tints = {
            serpentine: [0.95, 1.0, 0.9],
            splitcreek: [0.9, 0.95, 1.05],
            gauntlet: [1.05, 0.95, 0.9],
        };
        if (this.postfx.enabled) {
            const t = tints[mapId] || [1, 1, 1];
            this.postfx.setMapTint(t[0], t[1], t[2]);
        }
    }

    start() {
        if (!this.selectedMapId) return;
        this.audio.ensureContext();
        this.worldLevel = Economy.getPlayerLevel() + 1;
        // Set starting gold based on world level
        this.economy.levelUpReset(this.worldLevel);
        // Recreate map with the correct layout for this world level
        this.map = new GameMap(this.selectedMapId, (this.worldLevel - 1) % 3);
        this.renderer.drawTerrain();
        this.state = STATE.PLAYING;
        this.ui.setupTowerPanel();
        this.ui.hideAllScreens();
        this.waves.startNextWave();
        this.ui.update();
    }

    toggleAdmin() {
        this.adminMode = !this.adminMode;
    }

    togglePause() {
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
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
        this.audio.playGameOver();
        this.ui.showScreen('game-over');
    }

    levelUp() {
        this.state = STATE.LEVEL_UP;
        Economy.setPlayerLevel(this.worldLevel);
        this.audio.playVictory();
        this.ui.showScreen('level-up');
    }

    continueNextLevel() {
        this.worldLevel++;
        this.debug.reset();
        this.economy.levelUpReset(this.worldLevel);
        this.enemies.reset();
        this.towers.reset();
        this.projectiles.reset();
        this.particles.reset();
        this.scorchZones = [];
        this.waves.reset();
        this.input.reset();
        // Recreate map with the new layout for this world level
        this.map = new GameMap(this.selectedMapId, (this.worldLevel - 1) % 3);
        this.renderer.drawTerrain();
        this.state = STATE.PLAYING;
        this.ui.setupTowerPanel();
        this.ui.hideAllScreens();
        this.waves.startNextWave();
        this.ui.update();
    }

    restart() {
        this.state = STATE.MENU;
        this.selectedMapId = null;
        this.worldLevel = 0;
        this.elapsedTime = 0;
        this.waveElapsed = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.debug.reset();
        this.economy.reset();
        this.enemies.reset();
        this.towers.reset();
        this.projectiles.reset();
        this.particles.reset();
        this.scorchZones = [];
        this.waves.reset();
        this.input.reset();
        this.renderer.drawTerrain();
        this.ui.setupTowerPanel();
        this.ui.showScreen('menu');
        this.ui.update();
    }

    tick(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        const frameDelta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        if (this.state === STATE.PLAYING) {
            this.accumulator += frameDelta * this.speed;
            while (this.accumulator >= FIXED_DT) {
                this.update(FIXED_DT);
                this.accumulator -= FIXED_DT;
            }
        }

        this.renderer.drawFrame(this.accumulator / FIXED_DT);
        if (this.postfx.enabled) this.postfx.render();
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
        this.waves.startNextWave();
    }

    adminSetLevel(level) {
        // Persist player level so map unlocks work
        Economy.setPlayerLevelDirect(level - 1);
        this.worldLevel = level;
        this.elapsedTime = 0;
        this.waveElapsed = 0;
        this.debug.reset();
        this.economy.levelUpReset(this.worldLevel);
        this.enemies.reset();
        this.towers.reset();
        this.projectiles.reset();
        this.particles.reset();
        this.scorchZones = [];
        this.waves.reset();
        this.input.reset();
        if (this.selectedMapId) {
            this.map = new GameMap(this.selectedMapId, (this.worldLevel - 1) % 3);
            this.renderer.drawTerrain();
            this.state = STATE.PLAYING;
            this.ui.setupTowerPanel();
            this.waves.startNextWave();
            this.ui.update();
        } else {
            this.state = STATE.MENU;
            this.ui.setupTowerPanel();
            this.ui.showScreen('menu');
            this.ui.update();
        }
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
                if (!e.alive) continue;
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

    run() {
        this.ui.showScreen('menu');
        requestAnimationFrame(t => this.tick(t));
    }
}
