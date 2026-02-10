import { CELL, COLS, ROWS, STATE, TOWER_TYPES } from './constants.js';
import { worldToGrid } from './utils.js';

const TOWER_KEYS = { '1': 'arrow', '2': 'cannon', '3': 'frost', '4': 'lightning', '5': 'sniper' };

export class InputHandler {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.hoverGx = -1;
        this.hoverGy = -1;
        this.selectedTowerType = null; // tower type to place
        this.selectedTower = null;     // placed tower that's selected

        this.bindEvents();
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.cancelSelection();
        });

        document.addEventListener('keydown', e => this.onKeyDown(e));
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    onMouseMove(e) {
        const pos = this.getCanvasPos(e);
        const grid = worldToGrid(pos.x, pos.y);
        this.hoverGx = grid.x;
        this.hoverGy = grid.y;
    }

    onClick(e) {
        if (this.game.state !== STATE.PLAYING && this.game.state !== STATE.PAUSED) return;

        const pos = this.getCanvasPos(e);
        const grid = worldToGrid(pos.x, pos.y);
        const gx = grid.x;
        const gy = grid.y;

        if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;

        if (this.selectedTowerType) {
            // Place tower
            const tower = this.game.towers.place(this.selectedTowerType, gx, gy);
            if (tower) {
                // Keep the tower type selected for quick placement
                // unless they can't afford another
                const def = TOWER_TYPES[this.selectedTowerType];
                if (!this.game.economy.canAfford(def.cost)) {
                    this.selectedTowerType = null;
                }
                this.game.ui.update();
            } else {
                // Placement failed — if there's a tower here, select it
                const existing = this.game.towers.getTowerAt(gx, gy);
                if (existing) {
                    this.selectedTower = existing;
                    this.selectedTowerType = null;
                    this.game.ui.showTowerInfo(existing);
                }
            }
        } else {
            // Check if clicking on a placed tower
            const tower = this.game.towers.getTowerAt(gx, gy);
            if (tower) {
                this.selectedTower = tower;
                this.selectedTowerType = null;
                this.game.ui.showTowerInfo(tower);
            } else {
                this.selectedTower = null;
                this.game.ui.hideTowerInfo();
            }
        }
    }

    onKeyDown(e) {
        const key = e.key;

        // Tower shortcuts
        if (TOWER_KEYS[key]) {
            this.selectTowerType(TOWER_KEYS[key]);
            return;
        }

        switch (key) {
            case ' ':
                e.preventDefault();
                if (this.game.state === STATE.MENU) {
                    this.game.start();
                } else {
                    this.game.togglePause();
                }
                break;
            case 'Escape':
                this.cancelSelection();
                break;
            case '+':
            case '=':
                this.game.setSpeed(Math.min(3, this.game.speed + 1));
                break;
            case '-':
                this.game.setSpeed(Math.max(1, this.game.speed - 1));
                break;
            case 'n':
            case 'N':
                if (this.game.waves.betweenWaves && this.game.state === STATE.PLAYING) {
                    this.game.waves.startNextWave();
                }
                break;
            case 'u':
            case 'U':
                if (this.selectedTower) {
                    if (this.game.towers.upgradeTower(this.selectedTower)) {
                        this.game.ui.showTowerInfo(this.selectedTower);
                        this.game.ui.update();
                    }
                }
                break;
            case 's':
            case 'S':
                if (this.selectedTower) {
                    this.game.towers.sell(this.selectedTower);
                    this.selectedTower = null;
                    this.game.ui.hideTowerInfo();
                    this.game.ui.update();
                }
                break;
            case 't':
            case 'T':
                if (this.selectedTower) {
                    this.selectedTower.cycleTargetMode();
                    this.game.ui.showTowerInfo(this.selectedTower);
                }
                break;
            case 'e':
            case 'E':
                // Hidden cheat
                if (this.game.state === STATE.PLAYING) {
                    this.game.blowThemAll();
                }
                break;
        }
    }

    selectTowerType(type) {
        const def = TOWER_TYPES[type];
        if (def.unlockWave && this.game.waves.currentWave < def.unlockWave) return;
        if (this.game.economy.canAfford(def.cost)) {
            this.selectedTowerType = type;
            this.selectedTower = null;
            this.game.ui.hideTowerInfo();
        }
    }

    cancelSelection() {
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.game.ui.hideTowerInfo();
    }

    reset() {
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.hoverGx = -1;
        this.hoverGy = -1;
    }
}
