import { CELL, COLS, ROWS, STATE, TOWER_TYPES, SPEED_MIN, SPEED_MAX } from './constants.js';
import { worldToGrid } from './utils.js';

function buildTowerKeys(game) {
    const effectiveWave = game.getEffectiveWave ? game.getEffectiveWave() : 0;
    const keys = {};
    let idx = 1;
    for (const [type, def] of Object.entries(TOWER_TYPES)) {
        if (def.maxWave && effectiveWave > def.maxWave) continue;
        if (def.unlockWave && effectiveWave < def.unlockWave) continue;
        keys[String(idx)] = type;
        idx++;
    }
    return keys;
}

// Map arrow keys to the same direction names as WASD
const ARROW_TO_DIR = {
    arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
};
const WASD_TO_DIR = {
    w: 'up', s: 'down', a: 'left', d: 'right',
};

export class InputHandler {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.hoverGx = -1;
        this.hoverGy = -1;
        this.selectedTowerType = null; // tower type to place
        this.selectedTower = null;     // placed tower that's selected
        // Tracks which directions are held (not raw keys)
        this.dirsHeld = { up: false, down: false, left: false, right: false };

        this.bindEvents();
    }

    bindEvents() {
        // Mouse events (desktop)
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (this.game.state !== STATE.PLAYING && this.game.state !== STATE.PAUSED) return;
            const pos = this.getCanvasPos(e);
            const grid = worldToGrid(pos.x, pos.y);
            const tower = this.game.towers.getTowerAt(grid.x, grid.y);
            if (tower) {
                this.selectedTower = tower;
                this.selectedTowerType = null;
                if (this.game.towers.upgradeTower(tower)) {
                    this.game.ui.showTowerInfo(tower);
                    this.game.ui.update();
                } else {
                    this.game.ui.showTowerInfo(tower);
                }
            } else {
                this.cancelSelection();
            }
        });

        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', e => this.onTouchEnd(e), { passive: false });

        // Keyboard events (desktop)
        document.addEventListener('keydown', e => this.onKeyDown(e));
        document.addEventListener('keyup', e => this.onKeyUp(e));

        // Mobile D-pad controls
        this.setupMobileControls();
    }

    setupMobileControls() {
        // D-pad buttons
        const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
        dpadBtns.forEach(btn => {
            const dir = btn.dataset.dir;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.dirsHeld[dir] = true;
                this.applyHeroMovement();
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.dirsHeld[dir] = false;
                this.applyHeroMovement();
            }, { passive: false });

            // Also handle case where touch leaves the button
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.dirsHeld[dir] = false;
                this.applyHeroMovement();
            }, { passive: false });
        });

        // Ability buttons
        const stunBtn = document.getElementById('stun-btn');
        const magnetBtn = document.getElementById('magnet-btn');

        if (stunBtn) {
            stunBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.game.hero.activateStun();
            }, { passive: false });
        }

        if (magnetBtn) {
            magnetBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.game.hero.activateMagnet();
            }, { passive: false });
        }
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Support both mouse and touch events
        const clientX = e.clientX !== undefined ? e.clientX
            : (e.touches && e.touches[0] ? e.touches[0].clientX
            : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0));
        const clientY = e.clientY !== undefined ? e.clientY
            : (e.touches && e.touches[0] ? e.touches[0].clientY
            : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0));

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
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
                // Select the placed tower and show its info card
                this.selectedTower = tower;
                this.selectedTowerType = null;
                this.game.ui.showTowerInfo(tower);
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

    // Touch event handlers (mobile support)
    onTouchStart(e) {
        e.preventDefault(); // Prevent scrolling, zooming, etc.
        this.game.audio.ensureContext(); // Audio context needs user gesture on mobile

        const pos = this.getCanvasPos(e);
        const grid = worldToGrid(pos.x, pos.y);
        this.hoverGx = grid.x;
        this.hoverGy = grid.y;

        // Store touch start time for long-press detection
        this.touchStartTime = Date.now();
        this.touchStartPos = { x: pos.x, y: pos.y };
    }

    onTouchMove(e) {
        e.preventDefault();

        const pos = this.getCanvasPos(e);
        const grid = worldToGrid(pos.x, pos.y);
        this.hoverGx = grid.x;
        this.hoverGy = grid.y;
    }

    onTouchEnd(e) {
        e.preventDefault();

        // Treat as click if touch duration was short (tap, not hold)
        const touchDuration = Date.now() - this.touchStartTime;
        if (touchDuration < 500) { // Less than 500ms = tap
            this.onClick(e);
        }
    }

    onKeyUp(e) {
        const keyLower = e.key.toLowerCase();

        // Arrow key release
        const arrowDir = ARROW_TO_DIR[keyLower];
        if (arrowDir) {
            this.dirsHeld[arrowDir] = false;
            this.applyHeroMovement();
            return;
        }

        // WASD release
        const wasdDir = WASD_TO_DIR[keyLower];
        if (wasdDir) {
            this.dirsHeld[wasdDir] = false;
            this.applyHeroMovement();
        }
    }

    applyHeroMovement() {
        const hero = this.game.hero;
        hero.moveUp = this.dirsHeld.up;
        hero.moveDown = this.dirsHeld.down;
        hero.moveLeft = this.dirsHeld.left;
        hero.moveRight = this.dirsHeld.right;
    }

    onKeyDown(e) {
        const key = e.key;
        const keyLower = key.toLowerCase();

        // Arrow keys — always move hero during gameplay
        const arrowDir = ARROW_TO_DIR[keyLower];
        if (arrowDir) {
            if (this.game.state === STATE.PLAYING) {
                e.preventDefault();
                this.dirsHeld[arrowDir] = true;
                this.applyHeroMovement();
            }
            return;
        }

        // WASD hero movement + Q/E abilities (only during gameplay)
        if (this.game.state === STATE.PLAYING) {
            // W: hero move (unless admin mode wants it for wave-set)
            if (keyLower === 'w') {
                if (this.game.adminMode) {
                    const w = prompt(`Set wave (current: ${this.game.waves.currentWave}):`);
                    const wn = parseInt(w);
                    if (wn > 0) this.game.adminSetWave(wn);
                } else {
                    this.dirsHeld.up = true;
                    this.applyHeroMovement();
                }
                return;
            }
            // A: hero move (no conflicts)
            if (keyLower === 'a') {
                this.dirsHeld.left = true;
                this.applyHeroMovement();
                return;
            }
            // D: hero move (unless admin mode wants CSV download)
            if (keyLower === 'd') {
                if (this.game.adminMode) {
                    this.game.debug.downloadCSV();
                } else {
                    this.dirsHeld.right = true;
                    this.applyHeroMovement();
                }
                return;
            }
            // S: sell tower if one selected, otherwise hero move
            if (keyLower === 's') {
                if (this.selectedTower) {
                    this.game.towers.sell(this.selectedTower);
                    this.selectedTower = null;
                    this.game.ui.hideTowerInfo();
                    this.game.ui.update();
                } else {
                    this.dirsHeld.down = true;
                    this.applyHeroMovement();
                }
                return;
            }
            // Q: AoE Stun
            if (keyLower === 'q') {
                this.game.hero.activateStun();
                return;
            }
            // E: Gold Magnet
            if (keyLower === 'e') {
                this.game.hero.activateMagnet();
                return;
            }
        }

        // Tower shortcuts (dynamic based on visible towers)
        const towerKeys = buildTowerKeys(this.game);
        if (towerKeys[key]) {
            this.selectTowerType(towerKeys[key]);
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
            case 'p':
            case 'P':
                if (this.game.state === STATE.PLAYING || this.game.state === STATE.PAUSED) {
                    this.game.togglePause();
                }
                break;
            case 'Escape':
                this.cancelSelection();
                break;
            case '+':
            case '=':
                this.game.setSpeed(Math.min(SPEED_MAX, this.game.speed + 1));
                break;
            case '-':
                this.game.setSpeed(Math.max(SPEED_MIN, this.game.speed - 1));
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
            case 't':
            case 'T':
                if (this.selectedTower) {
                    this.selectedTower.cycleTargetMode();
                    this.game.ui.showTowerInfo(this.selectedTower);
                }
                break;
            case 'c':
            case 'C':
                if (this.game.adminMode) {
                    if (confirm('Clear entire wave log?')) {
                        this.game.debug.clearLog();
                    }
                }
                break;
            case 'k':
            case 'K':
                if (this.game.adminMode && this.game.state === STATE.PLAYING) {
                    this.game.blowThemAll();
                }
                break;
            case 'r':
            case 'R':
                if (this.game.adminMode) {
                    if (confirm(`Clear all records?`)) {
                        localStorage.removeItem('td_wave_record');
                        localStorage.removeItem('td_high_score');
                        this.game.economy.record = 0;
                        this.game.economy.score = 0;
                    }
                }
                break;
            case '`':
                this.game.toggleAdmin();
                break;
        }
    }

    selectTowerType(type) {
        const def = TOWER_TYPES[type];
        const effectiveWave = this.game.getEffectiveWave ? this.game.getEffectiveWave() : 0;
        if (def.unlockWave && effectiveWave < def.unlockWave) return;
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
        this.dirsHeld = { up: false, down: false, left: false, right: false };
        this.game.hero.clearMovement();
        this.game.ui.hideTowerInfo();
    }
}
