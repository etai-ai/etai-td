import { TOWER_TYPES, TARGET_MODES, STATE, MAP_DEFS, COLS, ROWS, CELL, CELL_TYPE, TOTAL_WAVES, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, HERO_STATS, getTotalWaves, DUAL_SPAWN_LEVEL } from './constants.js';
import { Economy } from './economy.js';

export class UI {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elWave = document.getElementById('wave-info');
        this.elLives = document.getElementById('lives-info');
        this.elGold = document.getElementById('gold-info');
        this.elLevelInfo = document.getElementById('level-info');
        this.elAvatarCanvas = document.getElementById('avatar-canvas');
        this.elTowerPanel = document.getElementById('tower-panel');
        this.elTowerInfo = document.getElementById('tower-info');
        this.elHeroInfo = document.getElementById('hero-info');
        this.elSpeedBtn = document.getElementById('speed-btn');
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

        // Show player level on menu
        const playerLevel = Economy.getPlayerLevel();
        const levelEl = document.getElementById('menu-player-level');
        if (levelEl) {
            const rec = Economy.getRecord();
            levelEl.textContent = `Level ${playerLevel + 1}` + (rec > 0 ? `  |  Record: ${rec}` : '');
        }

        for (const [id, def] of Object.entries(MAP_DEFS)) {
            const reqLevel = def.requiredLevel || 0;
            const mapLocked = reqLevel > 0 && (playerLevel + 1) < reqLevel;

            const card = document.createElement('div');
            card.className = 'map-card' + (mapLocked ? ' map-locked' : '');
            card.dataset.mapId = id;

            // Mini preview canvas
            const preview = document.createElement('canvas');
            preview.className = 'map-card-preview';
            preview.width = 240;
            preview.height = 160;
            this.drawMapPreview(preview, def);
            if (mapLocked) this.drawLockOverlay(preview, reqLevel);

            // Info section
            const info = document.createElement('div');
            info.className = 'map-card-info';

            const name = document.createElement('div');
            name.className = 'map-card-name';
            name.textContent = def.name;
            if (!mapLocked) name.style.color = def.themeColor;

            const desc = document.createElement('div');
            desc.className = 'map-card-desc';
            desc.textContent = mapLocked ? `Reach Level ${reqLevel} to unlock` : def.description;

            info.appendChild(name);
            info.appendChild(desc);

            card.appendChild(preview);
            card.appendChild(info);

            if (!mapLocked) {
                card.addEventListener('click', () => {
                    this.game.audio.ensureContext();
                    this.game.selectMap(id);
                    this.game.start();
                });
            }

            container.appendChild(card);
        }
    }

    drawMapPreview(canvas, def) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const cellW = w / COLS;
        const cellH = h / ROWS;
        const layout = def.layouts[0];

        // Background
        const env = def.environment || 'forest';
        ctx.fillStyle = env === 'desert' ? '#c8a878' : env === 'lava' ? '#c05020' : '#2a3a2a';
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
        if (layout.paths) {
            const prefix = layout.waypoints;
            for (let i = 0; i < prefix.length - 1; i++) carve(prefix[i].x, prefix[i].y, prefix[i + 1].x, prefix[i + 1].y);
            const prefixEnd = prefix[prefix.length - 1];
            carve(prefixEnd.x, prefixEnd.y, layout.paths.upper[0].x, layout.paths.upper[0].y);
            for (let i = 0; i < layout.paths.upper.length - 1; i++) carve(layout.paths.upper[i].x, layout.paths.upper[i].y, layout.paths.upper[i + 1].x, layout.paths.upper[i + 1].y);
            carve(prefixEnd.x, prefixEnd.y, layout.paths.lower[0].x, layout.paths.lower[0].y);
            for (let i = 0; i < layout.paths.lower.length - 1; i++) carve(layout.paths.lower[i].x, layout.paths.lower[i].y, layout.paths.lower[i + 1].x, layout.paths.lower[i + 1].y);
            const upperEnd = layout.paths.upper[layout.paths.upper.length - 1];
            carve(upperEnd.x, upperEnd.y, layout.paths.suffix[0].x, layout.paths.suffix[0].y);
            const lowerEnd = layout.paths.lower[layout.paths.lower.length - 1];
            carve(lowerEnd.x, lowerEnd.y, layout.paths.suffix[0].x, layout.paths.suffix[0].y);
            for (let i = 0; i < layout.paths.suffix.length - 1; i++) carve(layout.paths.suffix[i].x, layout.paths.suffix[i].y, layout.paths.suffix[i + 1].x, layout.paths.suffix[i + 1].y);
        } else {
            for (let i = 0; i < layout.waypoints.length - 1; i++) {
                carve(layout.waypoints[i].x, layout.waypoints[i].y, layout.waypoints[i + 1].x, layout.waypoints[i + 1].y);
            }
        }

        // Carve secondary path if present and player level allows
        const playerLevel = Economy.getPlayerLevel();
        if (layout.secondaryWaypoints && (playerLevel + 1) >= DUAL_SPAWN_LEVEL) {
            const secWP = layout.secondaryWaypoints;
            for (let i = 0; i < secWP.length - 1; i++) {
                carve(secWP[i].x, secWP[i].y, secWP[i + 1].x, secWP[i + 1].y);
            }
        }

        // Draw path cells
        ctx.fillStyle = env === 'desert' ? '#e0b050' : env === 'lava' ? '#ff6a30' : '#d4a840';
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === CELL_TYPE.PATH) {
                    ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
                }
            }
        }

        // Draw blocked cells
        ctx.fillStyle = env === 'desert' ? '#a08060' : env === 'lava' ? '#1a1a2a' : '#4a5a4a';
        for (const c of layout.blocked) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS && grid[c.y][c.x] !== CELL_TYPE.PATH) {
                ctx.fillRect(c.x * cellW, c.y * cellH, cellW + 0.5, cellH + 0.5);
            }
        }

        // Entry/exit markers
        const entry = layout.waypoints[0];
        const exitPt = layout.paths ? layout.paths.suffix[layout.paths.suffix.length - 1] : layout.waypoints[layout.waypoints.length - 1];
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(entry.x * cellW, entry.y * cellH, cellW + 0.5, cellH + 0.5);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(exitPt.x * cellW, exitPt.y * cellH, cellW + 0.5, cellH + 0.5);

        // Secondary entry marker (dual spawn)
        if (layout.secondaryWaypoints && (playerLevel + 1) >= DUAL_SPAWN_LEVEL) {
            const secEntry = layout.secondaryWaypoints[0];
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(secEntry.x * cellW, secEntry.y * cellH, cellW + 0.5, cellH + 0.5);
        }
    }

    drawLockOverlay(canvas, reqLevel) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Darken
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2 - 10;

        // Padlock body
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.roundRect(cx - 18, cy, 36, 28, 4);
        ctx.fill();

        // Keyhole
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cx, cy + 11, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 2, cy + 14, 4, 8);

        // Shackle
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, Math.PI, 0);
        ctx.stroke();

        // Level text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${reqLevel}`, cx, cy + 48);
    }

    refreshMapRecords() {
        // Rebuild map select to refresh lock states
        this.buildMapSelect();
    }

    setupTowerPanel() {
        const panel = this.elTowerPanel;
        panel.innerHTML = '';

        // Pre-render tower previews and create tooltip (only once)
        if (!this.towerPreviews) {
            this.towerPreviews = {};
            this.towerIcons = {};
            this.towerIconsLg = {};
            this.tooltip = document.createElement('div');
            this.tooltip.id = 'tower-tooltip';
            document.body.appendChild(this.tooltip);
        }

        const worldLevel = this.game.worldLevel || 0;

        for (const [key, def] of Object.entries(TOWER_TYPES)) {
            // Hide towers that are outclassed at this level
            if (def.maxLevel && worldLevel > def.maxLevel) continue;
            // Hide towers not yet unlocked at this level
            if (def.unlockLevel && worldLevel < def.unlockLevel) continue;

            if (!this.towerPreviews[key]) {
                this.towerPreviews[key] = this.renderTowerPreview(key);
            }
            if (!this.towerIcons[key]) {
                this.towerIcons[key] = this.renderTowerIcon(key, 64);
                this.towerIconsLg[key] = this.renderTowerIcon(key, 80);
            }

            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.type = key;
            btn.style.setProperty('--tower-color', def.color);
            btn.innerHTML = `
                <img class="tower-icon" src="${this.towerIcons[key]}" width="64" height="64">
                <span class="tower-name">${def.name}</span>
                <span class="tower-cost">$${def.cost}</span>
            `;
            btn.addEventListener('click', () => {
                this.game.audio.ensureContext();
                this.game.input.selectTowerType(key);
                this.hideTowerTooltip();
                this.update();
            });
            btn.addEventListener('mouseenter', () => this.showTowerTooltip(btn, key, def));
            btn.addEventListener('mouseleave', () => this.hideTowerTooltip());
            panel.appendChild(btn);
        }
    }

    renderTowerPreview(key) {
        const previewSize = 80;
        const canvas = document.createElement('canvas');
        canvas.width = previewSize;
        canvas.height = previewSize;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, previewSize, previewSize);

        const def = TOWER_TYPES[key];
        const towerSize = def.size || 1;
        const s = previewSize / (towerSize * CELL);
        ctx.save();
        ctx.scale(s, s);

        const fake = {
            type: key, level: 0, gx: 0, gy: 0,
            size: towerSize,
            recoilTimer: 0, spinPhase: 0,
            turretAngle: Math.PI / 6, glowPhase: 0,
            idleTime: 0, target: null,
            activeBarrel: 0, shotCount: 0, heavyEvery: 4,
        };

        this.game.renderer.drawTowerBase(ctx, fake);
        ctx.translate(towerSize * CELL / 2, towerSize * CELL / 2);
        ctx.rotate(Math.PI / 6);

        switch (key) {
            case 'arrow': this.game.renderer.drawArrowTurret(ctx, 0, fake); break;
            case 'cannon': this.game.renderer.drawCannonTurret(ctx, 0, fake); break;
            case 'frost': this.game.renderer.drawFrostTurret(ctx, 0, fake); break;
            case 'lightning': this.game.renderer.drawLightningTurret(ctx, 0, fake); break;
            case 'sniper': this.game.renderer.drawSniperTurret(ctx, 0, fake); break;
            case 'firearrow': this.game.renderer.drawFireArrowTurret(ctx, 0, fake); break;
            case 'deepfrost': this.game.renderer.drawDeepFrostTurret(ctx, 0, fake); break;
            case 'superlightning': this.game.renderer.drawSuperLightningTurret(ctx, 0, fake); break;
            case 'bicannon': this.game.renderer.drawBiCannonTurret(ctx, 0, fake); break;
            case 'missilesniper': this.game.renderer.drawMissileSniperTurret(ctx, 0, fake); break;
        }

        ctx.restore();
        return canvas.toDataURL();
    }

    renderTowerIcon(key, size = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const def = TOWER_TYPES[key];
        const towerSize = def.size || 1;
        const s = size / (towerSize * CELL);
        ctx.save();
        ctx.scale(s, s);
        ctx.translate(towerSize * CELL / 2, towerSize * CELL / 2);
        ctx.rotate(Math.PI / 6);

        const fake = {
            type: key, level: 0, gx: 0, gy: 0,
            size: towerSize,
            recoilTimer: 0, spinPhase: 0,
            turretAngle: Math.PI / 6, glowPhase: 0,
            idleTime: 0, target: null,
            activeBarrel: 0, shotCount: 0, heavyEvery: 4,
        };

        switch (key) {
            case 'arrow': this.game.renderer.drawArrowTurret(ctx, 0, fake); break;
            case 'cannon': this.game.renderer.drawCannonTurret(ctx, 0, fake); break;
            case 'frost': this.game.renderer.drawFrostTurret(ctx, 0, fake); break;
            case 'lightning': this.game.renderer.drawLightningTurret(ctx, 0, fake); break;
            case 'sniper': this.game.renderer.drawSniperTurret(ctx, 0, fake); break;
            case 'firearrow': this.game.renderer.drawFireArrowTurret(ctx, 0, fake); break;
            case 'deepfrost': this.game.renderer.drawDeepFrostTurret(ctx, 0, fake); break;
            case 'superlightning': this.game.renderer.drawSuperLightningTurret(ctx, 0, fake); break;
            case 'bicannon': this.game.renderer.drawBiCannonTurret(ctx, 0, fake); break;
            case 'missilesniper': this.game.renderer.drawMissileSniperTurret(ctx, 0, fake); break;
        }

        ctx.restore();
        return canvas.toDataURL();
    }

    showTowerTooltip(btn, key, def) {
        const stats = def.levels[0];
        // Hotkey matches visible buttons order (skipping hidden towers)
        const worldLevel = this.game.worldLevel || 0;
        const visibleKeys = Object.entries(TOWER_TYPES)
            .filter(([, d]) => !(d.maxLevel && worldLevel > d.maxLevel))
            .map(([k]) => k);
        const hotkey = visibleKeys.indexOf(key) + 1;
        const rate = (1 / stats.fireRate).toFixed(1);

        const specials = {
            arrow: 'Fast, cheap, reliable',
            frost: `Slows ${stats.slowFactor * 100}% for ${stats.slowDuration}s`,
            deepfrost: `AoE pulse: slows + ${(stats.freezeChance * 100).toFixed(0)}% freeze`,
            lightning: `Chains to ${stats.chainCount} enemies`,
            superlightning: `Fork chain ${stats.forkCount} targets, ${(stats.shockChance * 100).toFixed(0)}% shock`,
            cannon: `Splash radius ${stats.splashRadius}`,
            bicannon: `Dual barrel, heavy round every ${stats.heavyEvery} shots`,
            sniper: `${stats.critChance * 100}% crit for ${stats.critMulti}x dmg`,
            firearrow: `Burns for ${stats.burnDamage} dmg/s (${stats.burnDuration}s)`,
            missilesniper: `Homing missiles, splash ${stats.splashRadius}, ${(stats.critChance * 100).toFixed(0)}% crit ${stats.critMulti}x`,
        };

        let lockHTML = '';
        if (def.unlockWave) {
            const locked = this.game.waves.currentWave < def.unlockWave;
            if (locked) lockHTML = `<div class="tt-lock">Unlocks at wave ${def.unlockWave}</div>`;
        }
        if (def.unlockLevel) {
            const levelLocked = this.game.worldLevel < def.unlockLevel;
            if (levelLocked) lockHTML = `<div class="tt-lock">Requires Level ${def.unlockLevel}</div>`;
        }

        this.tooltip.innerHTML = `
            <img class="tt-preview" src="${this.towerPreviews[key]}" width="80" height="80">
            <div class="tt-info">
                <div class="tt-name" style="color:${def.color}">${def.name} <kbd>${hotkey}</kbd></div>
                <div class="tt-cost">$${def.cost}</div>
                <div class="tt-stats">
                    <div>Dmg <span style="color:#e74c3c">${stats.damage}</span></div>
                    <div>Range <span style="color:#3498db">${stats.range}</span></div>
                    <div>Rate <span style="color:#f1c40f">${rate}/s</span></div>
                </div>
                <div class="tt-special">${specials[key]}</div>
                ${lockHTML}
            </div>
        `;

        this.tooltip.style.display = 'flex';
        const rect = btn.getBoundingClientRect();
        const ttRect = this.tooltip.getBoundingClientRect();
        this.tooltip.style.left = (rect.left + rect.width / 2 + 40) + 'px';
        this.tooltip.style.top = (rect.top - ttRect.height - 20) + 'px';
    }

    hideTowerTooltip() {
        this.tooltip.style.display = 'none';
    }

    setupControls() {
        // Speed button — cycles 1→2→3→1
        this.elSpeedBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            const next = this.game.speed % 3 + 1;
            this.game.setSpeed(next);
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

        // Mute badge
        this.elMuteBtn.addEventListener('click', () => {
            this.game.audio.toggleMute();
            this.update();
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

        // Level up continue button
        document.getElementById('level-up-btn')?.addEventListener('click', () => {
            this.game.continueNextLevel();
        });

        // Exit button
        document.getElementById('exit-btn')?.addEventListener('click', () => {
            if (this.game.state !== STATE.MENU) {
                this.game.restart();
            }
        });

        // Manual buttons
        document.getElementById('manual-btn')?.addEventListener('click', () => {
            this.showScreen('manual');
        });
        document.getElementById('manual-close-btn')?.addEventListener('click', () => {
            this.showScreen('menu');
        });

        // About buttons
        document.getElementById('about-btn')?.addEventListener('click', () => {
            this.showScreen('about');
        });
        document.getElementById('about-close-btn')?.addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    update() {
        const game = this.game;
        const eco = game.economy;
        const waves = game.waves;

        // Top bar info — wave + modifier badge
        const totalWaves = getTotalWaves(game.worldLevel);
        const modDef = waves.modifierDef;
        if (modDef && !waves.betweenWaves) {
            this.elWave.innerHTML = `Wave ${waves.currentWave}/${totalWaves} <span style="background:${modDef.color};color:#000;padding:1px 6px;border-radius:4px;font-size:0.8em;font-weight:700;margin-left:4px">${modDef.name}</span>`;
        } else {
            this.elWave.textContent = `Wave ${waves.currentWave}/${totalWaves}`;
        }
        this.elLives.innerHTML = `&#9829; ${eco.lives}`;
        this.elGold.textContent = `\u{1FA99} ${eco.gold}`;
        this.elLevelInfo.textContent = `Level ${game.worldLevel}`;

        // Avatar
        if (this.elAvatarCanvas && game.worldLevel > 0) {
            const themeColor = game.map.def.themeColor || '#888';
            game.renderer.drawAvatar(this.elAvatarCanvas.getContext('2d'), game.worldLevel, themeColor);
            // Tint avatar border and group to match theme
            this.elAvatarCanvas.style.borderColor = themeColor;
            const group = this.elAvatarCanvas.parentElement;
            if (group) {
                group.style.borderColor = themeColor;
                group.style.boxShadow = `0 0 14px ${themeColor}66, inset 0 0 8px ${themeColor}1a`;
            }
        }

        // Hero badge
        if (this.elHeroInfo) {
            const hero = game.hero;
            if (hero.active) {
                this.elHeroInfo.style.display = 'inline-flex';
                if (!hero.alive) {
                    this.elHeroInfo.textContent = `Respawn ${Math.ceil(hero.respawnTimer)}s`;
                    this.elHeroInfo.style.borderColor = 'rgba(255,68,68,0.4)';
                    this.elHeroInfo.style.color = '#ff4444';
                } else {
                    this.elHeroInfo.textContent = `Hero ${Math.ceil(hero.hp)}/${HERO_STATS.maxHP}`;
                    this.elHeroInfo.style.borderColor = 'rgba(0,228,255,0.4)';
                    this.elHeroInfo.style.color = '#00e5ff';
                }
            } else {
                this.elHeroInfo.style.display = 'none';
            }
        }

        // Toggle hero-active class for mobile controls (only shows on mobile when hero is active)
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if (canvasWrapper) {
            if (game.hero.active) {
                canvasWrapper.classList.add('hero-active');
            } else {
                canvasWrapper.classList.remove('hero-active');
            }
        }

        // Speed badge
        this.elSpeedBtn.textContent = `${game.speed}x`;

        // Pause badge
        this.elPauseBtn.innerHTML = game.state === STATE.PAUSED ? '&#9654; Resume' : '&#9208; Pause';

        // Mute badge
        if (game.audio.muted) {
            this.elMuteBtn.innerHTML = '&#128263; Muted';
            this.elMuteBtn.classList.add('muted');
        } else {
            this.elMuteBtn.innerHTML = '&#128264; Sound';
            this.elMuteBtn.classList.remove('muted');
        }

        // Quit badge — hide on menu
        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) exitBtn.style.display = game.state === STATE.MENU ? 'none' : 'inline-flex';

        // Next wave button with early-send bonus
        if (waves.betweenWaves && game.state === STATE.PLAYING) {
            this.elNextWaveBtn.style.display = 'inline-block';
            const bonus = Math.max(0, Math.floor(EARLY_SEND_MAX_BONUS - waves.betweenWaveTimer * EARLY_SEND_DECAY));
            if (bonus > 0 && waves.currentWave > 0) {
                this.elNextWaveBtn.textContent = `Next Wave (${waves.currentWave + 1}) +${bonus}g`;
            } else {
                this.elNextWaveBtn.textContent = `Next Wave (${waves.currentWave + 1})`;
            }
        } else {
            this.elNextWaveBtn.style.display = 'none';
        }

        // Refresh upgrade button affordability if tower info is open
        if (game.input.selectedTower) {
            const upgradeBtn = document.getElementById('upgrade-btn');
            if (upgradeBtn) {
                const cost = game.input.selectedTower.getUpgradeCost();
                if (cost !== null) {
                    const canAfford = eco.canAfford(cost);
                    upgradeBtn.classList.toggle('disabled', !canAfford);
                }
            }
        }

        // Tower buttons affordability + unlock
        const towerBtns = this.elTowerPanel.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            const type = btn.dataset.type;
            const def = TOWER_TYPES[type];
            const waveLocked = def.unlockWave > 0 && waves.currentWave < def.unlockWave;
            const levelLocked = def.unlockLevel > 0 && game.worldLevel < def.unlockLevel;
            const locked = waveLocked || levelLocked;
            const canAfford = eco.gold >= def.cost;
            btn.classList.toggle('disabled', locked || !canAfford);
            btn.classList.toggle('locked', locked);
            btn.classList.toggle('selected', game.input.selectedTowerType === type);
            // Show/hide lock label
            const costEl = btn.querySelector('.tower-cost');
            if (costEl) {
                costEl.textContent = levelLocked ? `Level ${def.unlockLevel}` : waveLocked ? `Wave ${def.unlockWave}` : `$${def.cost}`;
            }
        });
    }

    showTowerInfo(tower) {
        const info = this.elTowerInfo;
        const upgradeCost = tower.getUpgradeCost();
        const sellValue = tower.getSellValue();
        const targetMode = TARGET_MODES[tower.targetMode];
        const modeColors = { First: '#3498db', Closest: '#2ecc71', Strongest: '#e74c3c', Weakest: '#f39c12' };
        const modeColor = modeColors[targetMode] || '#eee';
        const def = TOWER_TYPES[tower.type];
        const iconSrc = this.towerIconsLg && this.towerIconsLg[tower.type] ? this.towerIconsLg[tower.type] : '';

        let html = `
            <div class="tower-info-header">
                <span class="tower-info-name" style="color:${def.color}">${tower.name} Tower</span>
                <span class="tower-info-level">Lv.${tower.level + 1}</span>
            </div>
            <div class="tower-info-body">
                <div class="tower-info-stats">
                    <div>Damage: ${tower.damage}</div>
                    <div>Range: ${tower.range.toFixed(1)}</div>
                    <div>Rate: ${(1 / tower.fireRate).toFixed(1)}/s</div>
                    <div>Target: <span style="color:${modeColor};font-weight:700">${targetMode}</span></div>
                </div>
                ${iconSrc ? `<div class="tower-info-icon-wrap" style="--tc:${def.color}"><img class="tower-info-icon" src="${iconSrc}"></div>` : ''}
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
        info.style.borderColor = def.color;

        // Position card near the tower
        const towerSize = def.size || 1;
        const towerCx = (tower.gx + towerSize / 2) * CELL;
        const towerCy = tower.gy * CELL;
        const cardW = 204;
        const cardH = info.offsetHeight || 200;
        const gap = 10;
        // Prefer right side, fall back to left
        let left = towerCx + towerSize * CELL / 2 + gap;
        if (left + cardW > COLS * CELL) left = towerCx - towerSize * CELL / 2 - cardW - gap;
        // Vertical: align top with tower, clamp to canvas
        let top = towerCy - 10;
        if (top + cardH > ROWS * CELL) top = ROWS * CELL - cardH - 4;
        if (top < 4) top = 4;
        info.style.left = Math.round(left) + 'px';
        info.style.top = Math.round(top) + 'px';

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

        // Hide/show gameplay bars
        const onMenu = name === 'menu';
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = onMenu ? 'none' : 'flex';
        if (bottomBar) bottomBar.style.display = onMenu ? 'none' : 'flex';

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

        // Populate level-up screen
        if (name === 'level-up') {
            const game = this.game;
            const nextLevel = game.worldLevel + 1;
            const nextGold = 150 + nextLevel * 150;
            const subEl = document.getElementById('level-up-subtitle');
            if (subEl) subEl.textContent = `Level ${game.worldLevel} complete!`;
            const bonusEl = document.getElementById('level-up-bonus');
            if (bonusEl) bonusEl.textContent = `Starting gold: ${nextGold} | Lives reset to 20`;
            const avatarCanvas = document.getElementById('level-up-avatar');
            if (avatarCanvas) {
                const themeColor = game.map.def.themeColor || '#888';
                game.renderer.drawAvatar(avatarCanvas.getContext('2d'), nextLevel, themeColor);
            }

            // Confetti burst from top-center
            const cx = COLS * CELL / 2;
            game.particles.spawnConfetti(cx, 40, 50);

            // Expanding rings from avatar center
            const avY = ROWS * CELL / 2;
            game.particles.spawnAuraPulse(cx, avY, 60, '#ffd700');
            game.particles.spawnAuraPulse(cx, avY, 90, '#bb86fc');
        }
    }

    hideAllScreens() {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = 'flex';
        if (bottomBar) bottomBar.style.display = 'flex';
    }
}
