import { TOWER_TYPES, TARGET_MODES, STATE, MAP_DEFS, COLS, ROWS, CELL_TYPE } from './constants.js';
import { Economy } from './economy.js';

export class UI {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elWave = document.getElementById('wave-info');
        this.elLives = document.getElementById('lives-info');
        this.elGold = document.getElementById('gold-info');
        this.elScore = document.getElementById('score-info');
        this.elRecord = document.getElementById('record-info');
        this.elTowerPanel = document.getElementById('tower-panel');
        this.elTowerInfo = document.getElementById('tower-info');
        this.elSpeedBtns = document.querySelectorAll('.speed-btn');
        this.elPauseBtn = document.getElementById('pause-btn');
        this.elMuteBtn = document.getElementById('mute-btn');
        this.elNextWaveBtn = document.getElementById('next-wave-btn');
        this.elMapSelect = document.getElementById('map-select');

        this.setupTowerPanel();
        this.setupControls();
        this.buildMapSelect();
    }

    buildMapSelect() {
        const container = this.elMapSelect;
        if (!container) return;
        container.innerHTML = '';

        for (const [id, def] of Object.entries(MAP_DEFS)) {
            const card = document.createElement('div');
            card.className = 'map-card';
            card.dataset.mapId = id;

            // Mini preview canvas
            const preview = document.createElement('canvas');
            preview.className = 'map-card-preview';
            preview.width = 240;
            preview.height = 160;
            this.drawMapPreview(preview, def);

            // Info section
            const info = document.createElement('div');
            info.className = 'map-card-info';

            const header = document.createElement('div');
            header.className = 'map-card-header';

            const name = document.createElement('span');
            name.className = 'map-card-name';
            name.textContent = def.name;

            const badge = document.createElement('span');
            badge.className = 'map-card-difficulty';
            badge.style.background = def.color;
            badge.textContent = def.difficulty;

            header.appendChild(name);
            header.appendChild(badge);

            const desc = document.createElement('div');
            desc.className = 'map-card-desc';
            desc.textContent = def.description;

            const record = document.createElement('div');
            record.className = 'map-card-record';
            record.dataset.mapId = id;
            const rec = Economy.getMapRecord(id);
            record.textContent = rec > 0 ? `Record: ${rec}` : 'No record yet';

            info.appendChild(header);
            info.appendChild(desc);
            info.appendChild(record);

            card.appendChild(preview);
            card.appendChild(info);

            card.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.selectMap(id);
                this.game.start();
            });

            container.appendChild(card);
        }
    }

    drawMapPreview(canvas, def) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cellW = w / COLS;
        const cellH = h / ROWS;

        // Background
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 0, w, h);

        // Build a temp grid to know which cells are path
        const grid = Array.from({ length: ROWS }, () =>
            Array.from({ length: COLS }, () => CELL_TYPE.BUILDABLE)
        );

        const carve = (x0, y0, x1, y1) => {
            const dx = Math.sign(x1 - x0);
            const dy = Math.sign(y1 - y0);
            let x = x0, y = y0;
            while (true) {
                if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
                    grid[y][x] = CELL_TYPE.PATH;
                }
                if (x === x1 && y === y1) break;
                if (x !== x1) x += dx;
                else y += dy;
            }
        };

        // Carve all waypoint segments
        if (def.paths) {
            const prefix = def.waypoints;
            for (let i = 0; i < prefix.length - 1; i++) carve(prefix[i].x, prefix[i].y, prefix[i + 1].x, prefix[i + 1].y);
            const prefixEnd = prefix[prefix.length - 1];
            carve(prefixEnd.x, prefixEnd.y, def.paths.upper[0].x, def.paths.upper[0].y);
            for (let i = 0; i < def.paths.upper.length - 1; i++) carve(def.paths.upper[i].x, def.paths.upper[i].y, def.paths.upper[i + 1].x, def.paths.upper[i + 1].y);
            carve(prefixEnd.x, prefixEnd.y, def.paths.lower[0].x, def.paths.lower[0].y);
            for (let i = 0; i < def.paths.lower.length - 1; i++) carve(def.paths.lower[i].x, def.paths.lower[i].y, def.paths.lower[i + 1].x, def.paths.lower[i + 1].y);
            const upperEnd = def.paths.upper[def.paths.upper.length - 1];
            carve(upperEnd.x, upperEnd.y, def.paths.suffix[0].x, def.paths.suffix[0].y);
            const lowerEnd = def.paths.lower[def.paths.lower.length - 1];
            carve(lowerEnd.x, lowerEnd.y, def.paths.suffix[0].x, def.paths.suffix[0].y);
            for (let i = 0; i < def.paths.suffix.length - 1; i++) carve(def.paths.suffix[i].x, def.paths.suffix[i].y, def.paths.suffix[i + 1].x, def.paths.suffix[i + 1].y);
        } else {
            for (let i = 0; i < def.waypoints.length - 1; i++) {
                carve(def.waypoints[i].x, def.waypoints[i].y, def.waypoints[i + 1].x, def.waypoints[i + 1].y);
            }
        }

        // Draw path cells
        ctx.fillStyle = '#c8a96e';
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === CELL_TYPE.PATH) {
                    ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
                }
            }
        }

        // Draw blocked cells
        ctx.fillStyle = '#4a5a4a';
        for (const c of def.blocked) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS && grid[c.y][c.x] !== CELL_TYPE.PATH) {
                ctx.fillRect(c.x * cellW, c.y * cellH, cellW + 0.5, cellH + 0.5);
            }
        }

        // Entry/exit markers
        const entry = def.waypoints[0];
        const exitPt = def.paths ? def.paths.suffix[def.paths.suffix.length - 1] : def.waypoints[def.waypoints.length - 1];
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(entry.x * cellW, entry.y * cellH, cellW + 0.5, cellH + 0.5);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(exitPt.x * cellW, exitPt.y * cellH, cellW + 0.5, cellH + 0.5);
    }

    refreshMapRecords() {
        const recordEls = document.querySelectorAll('.map-card-record');
        for (const el of recordEls) {
            const mapId = el.dataset.mapId;
            const rec = Economy.getMapRecord(mapId);
            el.textContent = rec > 0 ? `Record: ${rec}` : 'No record yet';
        }
    }

    setupTowerPanel() {
        const panel = this.elTowerPanel;
        panel.innerHTML = '';

        for (const [key, def] of Object.entries(TOWER_TYPES)) {
            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.type = key;
            btn.innerHTML = `
                <span class="tower-icon" style="background:${def.color}"></span>
                <span class="tower-name">${def.name}</span>
                <span class="tower-cost">$${def.cost}</span>
            `;
            const hotkey = Object.keys(TOWER_TYPES).indexOf(key) + 1;
            const lockNote = def.unlockWave ? ` [Unlocks wave ${def.unlockWave}]` : '';
            btn.title = `${def.name} Tower ($${def.cost}) - Press ${hotkey}${lockNote}`;
            btn.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.input.selectTowerType(key);
                this.update();
            });
            panel.appendChild(btn);
        }
    }

    setupControls() {
        // Speed buttons
        this.elSpeedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.setSpeed(parseInt(btn.dataset.speed));
            });
        });

        // Pause button
        this.elPauseBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            if (this.game.state === STATE.MENU) {
                this.game.start();
            } else {
                this.game.togglePause();
            }
        });

        // Mute button
        this.elMuteBtn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            this.elMuteBtn.textContent = this.game.audio.muted ? 'Unmute' : 'Mute';
        });

        // Next wave button
        this.elNextWaveBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            if (this.game.state === STATE.MENU) {
                this.game.start();
            } else if (this.game.waves.betweenWaves && this.game.state === STATE.PLAYING) {
                this.game.waves.startNextWave();
            }
        });

        // Screen buttons
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.game.restart();
        });
        document.getElementById('restart-btn-victory')?.addEventListener('click', () => {
            this.game.restart();
        });

        // Manual buttons
        document.getElementById('manual-btn')?.addEventListener('click', () => {
            this.showScreen('manual');
        });
        document.getElementById('manual-close-btn')?.addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    update() {
        const game = this.game;
        const eco = game.economy;
        const waves = game.waves;

        // Top bar info
        this.elWave.textContent = `Wave: ${waves.currentWave}/20`;
        this.elLives.innerHTML = `&#9829; ${eco.lives}`;
        this.elGold.textContent = `Gold: ${eco.gold}`;
        this.elScore.textContent = `Score: ${eco.score}`;
        this.elRecord.textContent = `Record: ${eco.record}`;

        // Speed buttons
        this.elSpeedBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.speed) === game.speed);
        });

        // Pause button
        this.elPauseBtn.textContent = game.state === STATE.PAUSED ? 'Resume' : 'Pause';

        // Next wave button
        if (waves.betweenWaves && game.state === STATE.PLAYING) {
            this.elNextWaveBtn.style.display = 'inline-block';
            this.elNextWaveBtn.textContent = `Next Wave (${waves.currentWave + 1})`;
        } else {
            this.elNextWaveBtn.style.display = 'none';
        }

        // Tower buttons affordability + unlock
        const towerBtns = this.elTowerPanel.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            const type = btn.dataset.type;
            const def = TOWER_TYPES[type];
            const locked = def.unlockWave > 0 && waves.currentWave < def.unlockWave;
            const canAfford = eco.gold >= def.cost;
            btn.classList.toggle('disabled', locked || !canAfford);
            btn.classList.toggle('locked', locked);
            btn.classList.toggle('selected', game.input.selectedTowerType === type);
        });
    }

    showTowerInfo(tower) {
        const info = this.elTowerInfo;
        const upgradeCost = tower.getUpgradeCost();
        const sellValue = tower.getSellValue();
        const targetMode = TARGET_MODES[tower.targetMode];
        const modeColors = { First: '#3498db', Closest: '#2ecc71', Strongest: '#e74c3c', Weakest: '#f39c12' };
        const modeColor = modeColors[targetMode] || '#eee';

        let html = `
            <div class="tower-info-header">
                <span class="tower-info-name">${tower.name} Tower</span>
                <span class="tower-info-level">Lv.${tower.level + 1}</span>
            </div>
            <div class="tower-info-stats">
                <div>Damage: ${tower.damage}</div>
                <div>Range: ${tower.range.toFixed(1)}</div>
                <div>Fire Rate: ${(1 / tower.fireRate).toFixed(1)}/s</div>
                <div>Target: <span style="color:${modeColor};font-weight:700">${targetMode}</span></div>
            </div>
            <div class="tower-info-actions">
                <button id="target-btn" class="action-btn target-mode-btn" style="border-color:${modeColor};color:${modeColor}" title="Cycle targeting mode (T)">Target: ${targetMode}</button>
        `;

        if (upgradeCost !== null) {
            const canAfford = this.game.economy.canAfford(upgradeCost);
            html += `<button id="upgrade-btn" class="action-btn upgrade-btn${canAfford ? '' : ' disabled'}" title="Upgrade (U)">Upgrade $${upgradeCost}</button>`;
        } else {
            html += `<button class="action-btn disabled">MAX</button>`;
        }

        html += `
                <button id="sell-btn" class="action-btn sell-btn" title="Sell (S)">Sell $${sellValue}</button>
            </div>
        `;

        info.innerHTML = html;
        info.style.display = 'block';

        // Rebind action buttons
        document.getElementById('target-btn')?.addEventListener('click', () => {
            tower.cycleTargetMode();
            this.showTowerInfo(tower);
        });
        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
            if (this.game.towers.upgradeTower(tower)) {
                this.showTowerInfo(tower);
                this.update();
            }
        });
        document.getElementById('sell-btn')?.addEventListener('click', () => {
            this.game.towers.sell(tower);
            this.game.input.selectedTower = null;
            this.hideTowerInfo();
            this.update();
        });
    }

    hideTowerInfo() {
        this.elTowerInfo.style.display = 'none';
    }

    showScreen(name) {
        // Hide all screens
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        // Show target
        const screen = document.getElementById(`${name}-screen`);
        if (screen) screen.classList.add('visible');

        // Refresh map records when returning to menu
        if (name === 'menu') {
            this.refreshMapRecords();
        }

        // Populate score on end screens
        const eco = this.game.economy;
        const isNew = eco.score >= eco.record && eco.score > 0;
        const scoreText = `Score: ${eco.score}${isNew ? ' (New Record!)' : ''} | Record: ${eco.record}`;
        const goEl = document.getElementById('game-over-score');
        if (goEl) goEl.textContent = scoreText;
        const vicEl = document.getElementById('victory-score');
        if (vicEl) vicEl.textContent = scoreText;
    }

    hideAllScreens() {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
    }
}
