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

const FIXED_DT = 1 / 60; // 60 Hz physics

export class Game {
    constructor(canvases) {
        this.state = STATE.MENU;
        this.speed = 2;
        this.lastTime = 0;
        this.accumulator = 0;
        this.selectedMapId = null;

        // Screen shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

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

        // Initial terrain render
        this.renderer.drawTerrain();
    }

    selectMap(mapId) {
        this.selectedMapId = mapId;
        this.map = new GameMap(mapId);
        this.economy.setMap(mapId);
        this.renderer.drawTerrain();
    }

    start() {
        if (!this.selectedMapId) return;
        this.audio.ensureContext();
        this.state = STATE.PLAYING;
        this.ui.hideAllScreens();
        this.waves.startNextWave();
        this.ui.update();
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

    victory() {
        this.state = STATE.VICTORY;
        this.audio.playVictory();
        this.ui.showScreen('victory');
    }

    restart() {
        this.state = STATE.MENU;
        this.selectedMapId = null;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.economy.reset();
        this.enemies.reset();
        this.towers.reset();
        this.projectiles.reset();
        this.particles.reset();
        this.waves.reset();
        this.input.reset();
        this.renderer.drawTerrain();
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
        if (this.state === STATE.PLAYING) this.ui.update();
        requestAnimationFrame(t => this.tick(t));
    }

    triggerShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    blowThemAll() {
        const enemies = this.enemies.enemies;
        for (const e of enemies) {
            if (e.alive && e.deathTimer < 0) {
                e.hp = 0;
                e.alive = false;
            }
        }
        this.triggerShake(10, 0.5);
    }

    update(dt) {
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

        this.waves.update(dt);
        this.enemies.update(dt);
        this.towers.update(dt);
        this.projectiles.update(dt);
        this.particles.update(dt);

        // Check wave completion
        if (this.waves.isWaveComplete() && this.enemies.isEmpty()) {
            this.waves.onWaveComplete();
        }
    }

    run() {
        this.ui.showScreen('menu');
        requestAnimationFrame(t => this.tick(t));
    }
}
