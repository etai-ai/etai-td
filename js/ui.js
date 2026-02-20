import { TOWER_TYPES, TARGET_MODES, STATE, MAP_DEFS, COLS, ROWS, CELL, CELL_TYPE, CANVAS_W, CANVAS_H, EARLY_SEND_MAX_BONUS, EARLY_SEND_DECAY, VERSION, SPEED_MAX, ATMOSPHERE_PRESETS, VICTORY_WAVE, WORLD_ORDER } from './constants.js';
import { Economy } from './economy.js';
import { safeStorage } from './utils.js';

export class UI {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elWave = document.getElementById('wave-info');
        this.elLives = document.getElementById('lives-info');
        this.elLivesFill = document.getElementById('lives-fill');
        this.elLivesText = document.getElementById('lives-text');
        this.elGold = document.getElementById('gold-info');
        this.elKills = document.getElementById('kills-info');
        this.elTowerPanel = document.getElementById('tower-panel');
        this.elTowerInfo = document.getElementById('tower-info');
        this.elSpeedBtn = document.getElementById('speed-btn');
        this.elAutoWaveBtn = document.getElementById('autowave-btn');
        this.elPauseBtn = document.getElementById('pause-btn');
        this.elMuteBtn = document.getElementById('mute-btn');
        this.elNextWaveBtn = document.getElementById('next-wave-btn');
        this.elAtmoBtn = document.getElementById('atmo-btn');
        this.elMapSelect = document.getElementById('map-select');

        this.elToast = document.getElementById('achievement-toast');
        this._toastBusy = false;

        const versionEl = document.getElementById('about-version');
        if (versionEl) versionEl.textContent = `Version ${VERSION}`;

        this.setupTowerPanel();
        this.setupControls();
        this.buildMapSelect();
        this.buildAtmosphereSelect();
    }

    buildMapSelect() {
        const container = this.elMapSelect;
        if (!container) return;
        container.innerHTML = '';

        const allRecords = Economy.getWaveRecord();
        const bestRecord = Economy.getBestRecord();

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.style.display = bestRecord > 0 ? '' : 'none';

        for (const id of WORLD_ORDER) {
            const def = MAP_DEFS[id];
            if (!def) continue;
            const worldIdx = WORLD_ORDER.indexOf(id);
            const prevWorld = worldIdx > 0 ? WORLD_ORDER[worldIdx - 1] : null;
            const mapLocked = prevWorld !== null && (allRecords[prevWorld] || 0) < VICTORY_WAVE;

            const card = document.createElement('div');
            card.className = 'map-card' + (mapLocked ? ' map-locked' : '');
            card.dataset.mapId = id;

            // Mini preview canvas
            const preview = document.createElement('canvas');
            preview.className = 'map-card-preview';
            preview.width = 240;
            preview.height = 160;
            this.drawMapPreview(preview, def);
            if (mapLocked) this.drawLockOverlay(preview, `Beat ${MAP_DEFS[prevWorld].name}`);

            // Info section
            const info = document.createElement('div');
            info.className = 'map-card-info';

            const name = document.createElement('div');
            name.className = 'map-card-name';
            name.textContent = def.name;
            if (!mapLocked) name.style.color = def.themeColor;

            const desc = document.createElement('div');
            desc.className = 'map-card-desc';
            if (mapLocked) {
                desc.textContent = `Beat ${MAP_DEFS[prevWorld].name} to unlock`;
            } else {
                desc.textContent = def.description;
            }

            info.appendChild(name);

            // Prominent wave record display
            if (!mapLocked) {
                const mapRecord = allRecords[id] || 0;
                if (mapRecord > 0) {
                    const record = document.createElement('div');
                    record.className = 'map-card-record';
                    record.textContent = `Record: Wave ${mapRecord}`;
                    info.appendChild(record);
                }
            }

            info.appendChild(desc);

            card.appendChild(preview);
            card.appendChild(info);

            if (!mapLocked) {
                card.addEventListener('click', () => {
                    this.game.audio.ensureContext();
                    if (this.game.isMultiplayer && this.game.net?.isHost) {
                        // Host: pick layout, send to client, then start
                        this.game.selectMap(id);
                        const li = this.game.getLayoutIndex();
                        this.game.net.sendMapSelect(id, li);
                        this.game.net.sendGameStart();
                        this.game.start(id, li);
                    } else if (this.game.isMultiplayer && !this.game.net?.isHost) {
                        // Client can't start — host picks the map
                        return;
                    } else {
                        this.game.start(id);
                    }
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

        // Background — atmosphere override or map-native
        const env = def.environment || 'forest';
        const atmoId = this.game.selectedAtmosphere;
        const atmo = atmoId !== 'standard' && ATMOSPHERE_PRESETS[atmoId];
        if (atmo && atmo.ground) {
            const g = atmo.ground;
            ctx.fillStyle = `rgb(${g.base[0]},${g.base[1]},${g.base[2]})`;
        } else {
            ctx.fillStyle = env === 'desert' ? '#c8a878' : env === 'lava' ? '#c05020' : env === 'ruins' ? '#707568' : env === 'sky' ? '#c0d8ef' : env === 'void' ? '#1a0f2d' : '#2a3a2a';
        }
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
        if (layout.multiPaths) {
            for (const wpArr of layout.multiPaths) {
                for (let i = 0; i < wpArr.length - 1; i++) {
                    carve(wpArr[i].x, wpArr[i].y, wpArr[i + 1].x, wpArr[i + 1].y);
                }
            }
        } else if (layout.paths) {
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

        // Always carve secondary path on preview
        if (layout.secondaryWaypoints) {
            const secWP = layout.secondaryWaypoints;
            for (let i = 0; i < secWP.length - 1; i++) {
                carve(secWP[i].x, secWP[i].y, secWP[i + 1].x, secWP[i + 1].y);
            }
        }

        // Draw path cells — always map-native for enemy contrast
        ctx.fillStyle = env === 'desert' ? '#e0b050' : env === 'lava' ? '#ff6a30' : env === 'ruins' ? '#b0a898' : env === 'sky' ? '#c4a44a' : env === 'void' ? '#4a3060' : '#d4a840';
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === CELL_TYPE.PATH) {
                    ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
                }
            }
        }

        // Draw blocked cells
        if (atmo && atmo.obstacle) {
            ctx.fillStyle = atmo.obstacle.tint;
        } else {
            ctx.fillStyle = env === 'desert' ? '#a08060' : env === 'lava' ? '#1a1a2a' : env === 'ruins' ? '#808080' : env === 'sky' ? '#b0c0d0' : env === 'void' ? '#2a1a3a' : '#4a5a4a';
        }
        for (const c of layout.blocked) {
            if (c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS && grid[c.y][c.x] !== CELL_TYPE.PATH) {
                ctx.fillRect(c.x * cellW, c.y * cellH, cellW + 0.5, cellH + 0.5);
            }
        }

        // Entry/exit markers
        if (layout.multiPaths) {
            const entries = layout.multiPaths.map(p => p[0]);
            const exits = layout.multiPaths.map(p => p[p.length - 1]);
            const sharedEntry = entries.every(e => e.x === entries[0].x && e.y === entries[0].y);
            const sharedExit = exits.every(e => e.x === exits[0].x && e.y === exits[0].y);
            if (sharedEntry) {
                // Center spawn (Nexus): 1 green center, N red exits
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(entries[0].x * cellW, entries[0].y * cellH, cellW + 0.5, cellH + 0.5);
                ctx.fillStyle = '#e74c3c';
                for (const ep of exits) {
                    ctx.fillRect(ep.x * cellW, ep.y * cellH, cellW + 0.5, cellH + 0.5);
                }
            } else if (sharedExit) {
                // Edge entries (Citadel): N green entries, 1 red exit
                for (const ep of entries) {
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillRect(ep.x * cellW, ep.y * cellH, cellW + 0.5, cellH + 0.5);
                }
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(exits[0].x * cellW, exits[0].y * cellH, cellW + 0.5, cellH + 0.5);
            } else {
                // Generic: green entries, red exits
                for (const ep of entries) {
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillRect(ep.x * cellW, ep.y * cellH, cellW + 0.5, cellH + 0.5);
                }
                ctx.fillStyle = '#e74c3c';
                for (const ep of exits) {
                    ctx.fillRect(ep.x * cellW, ep.y * cellH, cellW + 0.5, cellH + 0.5);
                }
            }
        } else {
            const entry = layout.waypoints[0];
            const exitPt = layout.paths ? layout.paths.suffix[layout.paths.suffix.length - 1] : layout.waypoints[layout.waypoints.length - 1];
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(entry.x * cellW, entry.y * cellH, cellW + 0.5, cellH + 0.5);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(exitPt.x * cellW, exitPt.y * cellH, cellW + 0.5, cellH + 0.5);

            // Secondary entry marker (dual spawn)
            if (layout.secondaryWaypoints) {
                const secEntry = layout.secondaryWaypoints[0];
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(secEntry.x * cellW, secEntry.y * cellH, cellW + 0.5, cellH + 0.5);
            }
        }
    }

    buildAtmosphereSelect() {
        const container = document.getElementById('atmosphere-options');
        if (!container) return;
        container.innerHTML = '';
        for (const [id, preset] of Object.entries(ATMOSPHERE_PRESETS)) {
            const chip = document.createElement('div');
            chip.className = 'atmosphere-chip' + (id === this.game.selectedAtmosphere ? ' selected' : '');
            chip.textContent = preset.name;
            chip.style.borderColor = preset.themeColor;
            chip.style.setProperty('--atmo-glow', preset.themeColor + '66');
            chip.addEventListener('click', () => {
                this.game.selectedAtmosphere = id;
                safeStorage.setItem('td_atmosphere', id);
                // Update chip highlight
                container.querySelectorAll('.atmosphere-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                // Rebuild map previews with new atmosphere colors
                this.buildMapSelect();
                this._updateAtmoBtn();
            });
            container.appendChild(chip);
        }
    }

    _updateAtmoBtn() {
        if (!this.elAtmoBtn) return;
        const preset = ATMOSPHERE_PRESETS[this.game.selectedAtmosphere];
        this.elAtmoBtn.textContent = preset ? preset.name : 'Standard';
        this.elAtmoBtn.style.borderColor = preset ? preset.themeColor : '#555';
    }

    drawLockOverlay(canvas, message) {
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

        // Wave requirement text
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(message, cx, cy + 48);
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
            // Pre-generate icons for ALL tower types (needed for unlock screen)
            for (const key of Object.keys(TOWER_TYPES)) {
                this.towerPreviews[key] = this.renderTowerPreview(key);
                this.towerIcons[key] = this.renderTowerIcon(key, 64);
                this.towerIconsLg[key] = this.renderTowerIcon(key, 80);
            }
        }

        const effectiveWave = this.game.getEffectiveWave ? this.game.getEffectiveWave() : 0;

        for (const [key, def] of Object.entries(TOWER_TYPES)) {
            // Hide towers that are outclassed at this wave
            if (def.maxWave && effectiveWave > def.maxWave) continue;
            // Hide towers not yet unlocked at this wave
            if (def.unlockWave && effectiveWave < def.unlockWave) continue;

            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            btn.dataset.type = key;
            btn.style.setProperty('--tower-color', def.color);
            btn.innerHTML = `
                <img class="tower-icon" src="${this.towerIconsLg[key]}">
                <div class="tower-label">
                    <span class="tower-name">${def.name}</span>
                    <span class="tower-cost">$${def.cost}</span>
                </div>
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
            case 'titan': ctx.translate(-4, 0); this.game.renderer.drawTitanTurret(ctx, 0, fake); break;
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
        const zoom = 1.8; // zoom in so turret fills the canvas
        const s = size / (towerSize * CELL) * zoom;
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.scale(s, s);
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
            case 'titan': ctx.translate(-4, 0); this.game.renderer.drawTitanTurret(ctx, 0, fake); break;
        }

        ctx.restore();
        return canvas.toDataURL();
    }

    showTowerTooltip(btn, key, def) {
        const stats = def.levels[0];
        // Hotkey matches visible buttons order (skipping hidden towers)
        const effectiveWave = this.game.getEffectiveWave ? this.game.getEffectiveWave() : 0;
        const visibleKeys = Object.entries(TOWER_TYPES)
            .filter(([, d]) => !(d.maxWave && effectiveWave > d.maxWave))
            .filter(([, d]) => !(d.unlockWave && effectiveWave < d.unlockWave))
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
            titan: `Splash ${stats.splashRadius}, shred + scorch every ${stats.heavyEvery} shots`,
        };

        let lockHTML = '';
        if (def.unlockWave && effectiveWave < def.unlockWave) {
            lockHTML = `<div class="tt-lock">Unlocks at wave ${def.unlockWave}</div>`;
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
            const next = this.game.speed % SPEED_MAX + 1;
            this.game.setSpeed(next);
        });

        // Auto-wave toggle
        this.elAutoWaveBtn.addEventListener('click', () => {
            this.game.autoWave = !this.game.autoWave;
            this.update();
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

        // Atmosphere rotate button
        if (this.elAtmoBtn) {
            this.elAtmoBtn.addEventListener('click', () => {
                const keys = Object.keys(ATMOSPHERE_PRESETS);
                const idx = keys.indexOf(this.game.selectedAtmosphere);
                const nextId = keys[(idx + 1) % keys.length];
                this.game.selectedAtmosphere = nextId;
                safeStorage.setItem('td_atmosphere', nextId);
                this._updateAtmoBtn();
                // Re-apply atmosphere if in-game
                if (this.game.selectedMapId) {
                    this.game._applyAtmosphere();
                    this.game.refreshTerrain();
                }
            });
            this._updateAtmoBtn();
        }

        // Next wave button
        this.elNextWaveBtn.addEventListener('click', () => {
            this.game.audio.ensureContext();
            if (this.game.state === STATE.MENU) {
                this.game.start();
            } else if (this.game.waves.betweenWaves && this.game.state === STATE.PLAYING) {
                this.game.waves.startNextWave();
            }
        });

        // Multiplayer buttons
        this._setupMultiplayer();

        // Screen buttons
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.game.restart();
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

        // Reset progress
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.showScreen('reset');
        });
        document.getElementById('reset-confirm-btn')?.addEventListener('click', () => {
            for (const key of safeStorage.keys()) {
                if (key.startsWith('td_')) safeStorage.removeItem(key);
            }
            this.game.achievements.stats = {};
            this.game.achievements.unlocked = {};
            this.game.restart();
        });
        document.getElementById('reset-cancel-btn')?.addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Trophy buttons
        document.getElementById('trophy-btn')?.addEventListener('click', () => {
            this.buildTrophyScreen();
            this.showScreen('trophy');
        });
        document.getElementById('trophy-close-btn')?.addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    update() {
        const game = this.game;
        const eco = game.economy;
        const waves = game.waves;

        // Top bar info — wave + modifier badge
        const waveText = `Wave ${waves.currentWave}`;
        const modDef = waves.modifierDef;
        if (modDef && !waves.betweenWaves) {
            this.elWave.innerHTML = `${waveText} <span style="background:${modDef.color};color:#000;padding:1px 6px;border-radius:4px;font-size:0.8em;font-weight:700;margin-left:4px">${modDef.name}</span>`;
        } else {
            this.elWave.textContent = waveText;
        }
        this.elLivesText.innerHTML = `&#9829; ${eco.lives}`;
        const livesPercent = Math.max(0, (eco.lives / 20) * 100);
        this.elLivesFill.style.width = livesPercent + '%';
        this.elLives.classList.toggle('lives-critical', eco.lives <= 5 && eco.lives > 0);
        if (game.isMultiplayer) {
            this.elGold.textContent = `\u{1FA99} ${eco.gold} | P2: ${eco.partnerGold}`;
        } else {
            this.elGold.textContent = `\u{1FA99} ${eco.gold}`;
        }
        if (this.elKills) this.elKills.textContent = `\u{1F480} ${game.runKills}`;
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

        // Auto-wave badge
        if (game.autoWave) {
            this.elAutoWaveBtn.textContent = 'Auto';
            this.elAutoWaveBtn.classList.remove('off');
        } else {
            this.elAutoWaveBtn.textContent = 'Manual';
            this.elAutoWaveBtn.classList.add('off');
        }

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

        // Next wave button
        if (waves.betweenWaves && game.state === STATE.PLAYING) {
            this.elNextWaveBtn.style.display = 'inline-block';
            this.elNextWaveBtn.textContent = `Next Wave (${waves.currentWave + 1})`;
        } else {
            this.elNextWaveBtn.style.display = 'none';
        }

        // Achievement toast polling
        if (!this._toastBusy) {
            const ach = game.achievements.popToast();
            if (ach) this.showAchievementToast(ach);
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
        const effectiveWave = game.getEffectiveWave ? game.getEffectiveWave() : 0;
        const towerBtns = this.elTowerPanel.querySelectorAll('.tower-btn');
        towerBtns.forEach(btn => {
            const type = btn.dataset.type;
            const def = TOWER_TYPES[type];
            const locked = def.unlockWave > 0 && effectiveWave < def.unlockWave;
            const canAfford = eco.gold >= def.cost;
            btn.classList.toggle('disabled', locked || !canAfford);
            btn.classList.toggle('locked', locked);
            btn.classList.toggle('selected', game.input.selectedTowerType === type);
            const costEl = btn.querySelector('.tower-cost');
            if (costEl) {
                costEl.textContent = locked ? `Wave ${def.unlockWave}` : `$${def.cost}`;
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

        // Next level stats for upgrade preview
        const nextLvl = tower.level < def.levels.length - 1 ? def.levels[tower.level + 1] : null;
        const arrow = (cur, next) => {
            if (next == null || next === cur) return `${cur}`;
            const color = next > cur ? '#2ecc71' : '#e74c3c';
            return `${cur} <span style="color:${color}">&rarr; ${next}</span>`;
        };

        const pct = v => `${Math.round(v * 100)}%`;

        let statsHtml = `<div>${arrow(tower.damage, nextLvl?.damage)} dmg</div>`;
        statsHtml += `<div>${arrow(tower.range.toFixed(1), nextLvl ? nextLvl.range.toFixed(1) : null)} range</div>`;
        statsHtml += `<div>${arrow((1/tower.fireRate).toFixed(1), nextLvl ? (1/nextLvl.fireRate).toFixed(1) : null)}/s</div>`;
        if (tower.burnDamage) {
            statsHtml += `<div>${arrow(tower.burnDamage, nextLvl?.burnDamage)} burn</div>`;
        }
        if (tower.splashRadius) {
            statsHtml += `<div>${arrow(tower.splashRadius.toFixed(1), nextLvl?.splashRadius?.toFixed(1))} splash</div>`;
        }
        if (tower.slowFactor) {
            statsHtml += `<div>${arrow(pct(1 - tower.slowFactor), nextLvl?.slowFactor ? pct(1 - nextLvl.slowFactor) : null)} slow</div>`;
        }
        if (tower.freezeChance) {
            statsHtml += `<div>${arrow(pct(tower.freezeChance), nextLvl?.freezeChance ? pct(nextLvl.freezeChance) : null)} freeze</div>`;
        }
        if (tower.chainCount) {
            statsHtml += `<div>${arrow(tower.chainCount, nextLvl?.chainCount)} chain</div>`;
        }
        if (tower.forkCount) {
            statsHtml += `<div>${arrow(tower.forkCount, nextLvl?.forkCount)} fork</div>`;
        }
        if (tower.shockChance) {
            statsHtml += `<div>${arrow(pct(tower.shockChance), nextLvl?.shockChance ? pct(nextLvl.shockChance) : null)} shock</div>`;
        }
        if (tower.heavyEvery) {
            statsHtml += `<div>heavy per ${arrow(tower.heavyEvery, nextLvl?.heavyEvery)}</div>`;
        }
        if (tower.armorShred) {
            statsHtml += `<div>${arrow(pct(tower.armorShred), nextLvl?.armorShred ? pct(nextLvl.armorShred) : null)} shred</div>`;
        }
        if (tower.critChance) {
            statsHtml += `<div>${arrow(pct(tower.critChance), nextLvl?.critChance ? pct(nextLvl.critChance) : null)} crit</div>`;
        }
        if (tower.knockbackDist) {
            statsHtml += `<div>${arrow(tower.knockbackDist.toFixed(1), nextLvl?.knockbackDist?.toFixed(1))} knockback</div>`;
        }
        statsHtml += `<div>Target: <span style="color:${modeColor};font-weight:700">${targetMode}</span></div>`;

        // Multiplayer ownership
        const isMP = this.game.isMultiplayer;
        const isOwner = !isMP || tower.ownerId === this.game.net?.playerId;
        const ownerBadge = isMP ? `<span class="tower-owner-badge" style="background:${tower.ownerId === 1 ? '#3498db' : '#e67e22'}">P${tower.ownerId}</span>` : '';

        let html = `
            <div class="tower-info-header">
                <span class="tower-info-name" style="color:${def.color}">${tower.name} Tower</span>
                ${ownerBadge}
                <span class="tower-info-level${tower.level >= def.levels.length - 1 ? ' max-level' : ''}">${tower.level >= def.levels.length - 1 ? 'MAX' : `Lv.${tower.level + 1}`}</span>
            </div>
            <div class="tower-info-body">
                <div class="tower-info-stats">${statsHtml}</div>
                ${iconSrc ? `<div class="tower-info-icon-wrap" style="--tc:${def.color}"><img class="tower-info-icon" src="${iconSrc}"></div>` : ''}
            </div>
            <div class="tower-info-actions">
                <button id="target-btn" class="action-btn target-mode-btn" style="border-color:${modeColor};color:${modeColor}" title="Cycle targeting mode (T)">Target: ${targetMode}</button>
        `;

        if (isOwner && upgradeCost !== null) {
            const canAfford = this.game.economy.canAfford(upgradeCost);
            html += `<button id="upgrade-btn" class="action-btn upgrade-btn${canAfford ? '' : ' disabled'}" title="Upgrade (U)">Upgrade $${upgradeCost}</button>`;
        }

        if (isOwner) {
            html += `<button id="sell-btn" class="action-btn sell-btn" title="Sell (S)">Sell $${sellValue}</button>`;
        }

        html += `</div>`;

        info.innerHTML = html;
        info.style.display = 'block';
        info.style.borderColor = def.color;

        // Auto-close: stays open while hovering card or tower, 500ms after leaving both
        // On touch devices, skip hover logic — card stays open until user taps elsewhere
        if (this.towerInfoTimer) clearTimeout(this.towerInfoTimer);
        this._infoTower = tower;
        this._hoverOnCard = false;
        this._hoverOnTower = true; // just placed/clicked = mouse is on tower

        const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

        // Bind hover events once (mouse devices only)
        if (!this._towerInfoHoverBound && !isTouchDevice) {
            this._towerInfoHoverBound = true;
            const startClose = () => {
                if (this._hoverOnCard || this._hoverOnTower) return;
                if (this.towerInfoTimer) clearTimeout(this.towerInfoTimer);
                this.towerInfoTimer = setTimeout(() => {
                    this.game.input.selectedTower = null;
                    this.hideTowerInfo();
                }, 500);
            };
            const cancelClose = () => {
                if (this.towerInfoTimer) { clearTimeout(this.towerInfoTimer); this.towerInfoTimer = null; }
            };
            // Card hover
            info.addEventListener('mouseenter', () => {
                if (info.style.display === 'none') return;
                this._hoverOnCard = true;
                cancelClose();
            });
            info.addEventListener('mouseleave', () => {
                if (info.style.display === 'none') return;
                this._hoverOnCard = false;
                startClose();
            });
            // Tower hover on canvas
            this.game.input.canvas.addEventListener('mousemove', () => {
                if (!this._infoTower || info.style.display === 'none') return;
                const t = this._infoTower;
                const size = (TOWER_TYPES[t.type] && TOWER_TYPES[t.type].size) || 1;
                const gx = this.game.input.hoverGx;
                const gy = this.game.input.hoverGy;
                const over = gx >= t.gx && gx < t.gx + size && gy >= t.gy && gy < t.gy + size;
                if (over !== this._hoverOnTower) {
                    this._hoverOnTower = over;
                    if (over) cancelClose();
                    else startClose();
                }
            });
        }

        // Position card near the tower
        const towerSize = def.size || 1;
        const towerCx = (tower.gx + towerSize / 2) * CELL;
        const towerCy = tower.gy * CELL;
        const cardW = 280;
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
                if (this.game.isMultiplayer) this.game.net.sendTowerUpgrade(tower.id);
                const def = TOWER_TYPES[tower.type];
                if (tower.level >= def.levels.length - 1) {
                    // Maxed — close the card
                    this.game.input.selectedTower = null;
                    this.hideTowerInfo();
                } else {
                    this.showTowerInfo(tower);
                }
                this.update();
            }
        });
        document.getElementById('sell-btn')?.addEventListener('click', () => {
            const sellId = tower.id;
            this.game.towers.sell(tower);
            if (this.game.isMultiplayer) this.game.net.sendTowerSell(sellId);
            this.game.input.selectedTower = null;
            this.hideTowerInfo();
            this.update();
        });
    }

    hideTowerInfo() {
        if (this.towerInfoTimer) {
            clearTimeout(this.towerInfoTimer);
            this.towerInfoTimer = null;
        }
        this._infoTower = null;
        this._hoverOnCard = false;
        this._hoverOnTower = false;
        this.elTowerInfo.style.display = 'none';
    }

    showUnlockScreen(unlocksBatch) {
        const container = document.getElementById('unlock-content');
        if (!container) return;

        // Ensure tower icon cache exists
        if (!this.towerIconsLg) {
            this.setupTowerPanel(); // forces icon generation
        }

        // Collect all tower cards, extras (hero, dual spawn)
        let towerCards = '';
        let extras = '';
        let replacesText = '';
        let titleColor = '#ffd700';

        for (const unlock of unlocksBatch) {
            if (unlock.towers) {
                titleColor = unlock.color;
                for (let i = 0; i < unlock.keys.length; i++) {
                    const key = unlock.keys[i];
                    const def = TOWER_TYPES[key];
                    const stats = def.levels[0];
                    const iconSrc = this.towerIconsLg?.[key] || '';
                    let special = '';
                    if (stats.burnDamage) special = `Burn ${stats.burnDamage} DPS (bypasses armor)`;
                    else if (def.aura) special = `AoE aura pulse, ${(stats.freezeChance * 100).toFixed(0)}% freeze`;
                    else if (stats.forkCount) special = `Fork chain ${stats.forkCount}, ${(stats.shockChance * 100).toFixed(0)}% shock`;
                    else if (def.dualBarrel) special = `Dual barrel, armor shred ${(stats.armorShred * 100).toFixed(0)}%`;
                    else if (def.missile) special = `Homing missiles, splash + ${(stats.critChance * 100).toFixed(0)}% crit`;
                    else if (stats.knockbackDist) special = `Splash + knockback ${stats.knockbackDist} cells`;
                    else if (key === 'titan') special = `Massive splash + armor shred + scorch`;
                    else if (stats.splashRadius) special = `Splash radius ${stats.splashRadius}`;
                    else if (stats.chainCount) special = `Chains to ${stats.chainCount} enemies`;

                    towerCards += `
                        <div class="unlock-tower-card" style="--tc:${def.color}">
                            ${iconSrc ? `<img class="unlock-tower-icon" src="${iconSrc}">` : ''}
                            <div class="unlock-tower-name" style="color:${def.color}">${def.name}</div>
                            <div class="unlock-tower-desc">
                                Dmg ${stats.damage} | Range ${stats.range} | $${def.cost}
                                ${special ? `<br>${special}` : ''}
                            </div>
                        </div>`;
                }
                if (unlock.replacesKeys) {
                    const oldNames = unlock.replacesKeys.map(k => TOWER_TYPES[k]?.name || k).join(' & ');
                    replacesText += `<div class="unlock-replaces">Replaces ${oldNames} — existing towers auto-upgraded!</div>`;
                }
            }
            if (unlock.hero && !this.game.isMultiplayer) {
                extras += `<div class="unlock-extra" style="color:#00e5ff">HERO UNLOCKED! Move with WASD, Q to stun, E for gold magnet</div>`;
            }
            if (unlock.dualSpawn) {
                extras += `<div class="unlock-extra" style="color:#e74c3c;font-size:1.3em;font-weight:bold">&#x26A0; Enemies will attack from two sides!</div>`;
                extras += `<div class="unlock-extra" style="color:#e74c3c;font-size:0.85em;opacity:0.85">+100g — Build defenses on the second path now! Dual spawning begins next wave.</div>`;
            }
        }

        const hasTowers = unlocksBatch.some(u => u.towers || u.hero);
        const title = hasTowers ? 'NEW UNLOCKS!' : 'WARNING!';
        container.innerHTML = `
            <div class="unlock-title" style="color:${titleColor}">${title}</div>
            <div class="unlock-subtitle">Wave ${this.game.waves.currentWave} reached</div>
            ${towerCards ? `<div class="unlock-towers">${towerCards}</div>` : ''}
            ${replacesText}
            ${extras}
            <button class="unlock-btn" id="unlock-continue-btn">Continue</button>
        `;

        // Show the screen and hide gameplay bars
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        document.getElementById('unlock-screen').classList.add('visible');
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = 'none';
        if (bottomBar) bottomBar.style.display = 'none';

        // Continue button resumes gameplay
        document.getElementById('unlock-continue-btn').addEventListener('click', () => {
            document.getElementById('unlock-screen').classList.remove('visible');
            if (topBar) topBar.style.display = 'flex';
            if (bottomBar) bottomBar.style.display = 'flex';
            this.game._unlockScreenActive = false;
            if (this.game.state === STATE.PAUSED) {
                this.game.state = STATE.PLAYING;
                if (this.game.music) this.game.music.resume();
            }
            // Resume deferred wave setup if unlock screen interrupted startNextWave
            if (this.game.waves._pendingWaveSetup) {
                if (this.game.waves._pendingNetWaveDef) {
                    this.game.waves._applyWaveDefInner(this.game.waves._pendingNetWaveDef);
                } else {
                    this.game.waves._beginWave();
                }
            }
            this.game.audio.ensureContext();
        }, { once: true });
    }

    showMilestoneScreen(wave, stats) {
        const container = document.getElementById('unlock-content');
        if (!container) return;

        // Make the dialog wider for milestone
        container.style.maxWidth = '560px';
        container.style.padding = '44px 56px';

        // Format elapsed time
        const mins = Math.floor(stats.elapsed / 60);
        const secs = Math.floor(stats.elapsed % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Pick a featured tower icon for this milestone
        const milestoneTowers = { 10: 'firearrow', 20: 'missilesniper', 30: 'titan', 40: 'superlightning', 50: 'bicannon' };
        const featuredKey = milestoneTowers[wave] || 'firearrow';
        const iconSrc = this.towerIconsLg?.[featuredKey] || '';
        const towerDef = TOWER_TYPES[featuredKey];
        const towerColor = towerDef?.color || '#ffd700';

        container.innerHTML = `
            <div style="font-size:48px;font-weight:800;color:#ffd700;margin-bottom:4px;text-shadow:0 0 30px rgba(255,215,0,0.6),0 2px 8px rgba(0,0,0,0.5);letter-spacing:2px">
                WAVE ${wave}
            </div>
            <div style="font-size:28px;font-weight:700;color:#fff;margin-bottom:20px;text-shadow:0 0 15px rgba(255,255,255,0.3)">
                Congratulations!
            </div>
            ${iconSrc ? `<div style="margin:0 auto 20px;width:120px;height:120px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle,${towerColor}33 0%,transparent 70%);box-shadow:0 0 30px ${towerColor}44;animation:towerIconPulse 2.5s ease-in-out infinite">
                <img src="${iconSrc}" width="96" height="96" style="filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6))">
            </div>` : ''}
            <div style="font-size:15px;color:#bbb;margin-bottom:24px">You survived ${wave} waves. Keep going!</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 28px;margin:0 auto 28px;max-width:460px;text-align:center">
                <div>
                    <div style="color:#ff6b6b;font-size:28px;font-weight:800">${stats.kills}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Kills</div>
                </div>
                <div>
                    <div style="color:#3498db;font-size:28px;font-weight:800">${stats.towers}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Towers</div>
                </div>
                <div>
                    <div style="color:#e74c3c;font-size:28px;font-weight:800">${stats.lives}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Lives</div>
                </div>
                <div>
                    <div style="color:#ffd750;font-size:28px;font-weight:800">${stats.gold}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Gold</div>
                </div>
                <div>
                    <div style="color:#eee;font-size:28px;font-weight:800">${timeStr}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Time</div>
                </div>
                <div>
                    <div style="color:#2ecc71;font-size:28px;font-weight:800">Wave ${wave}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Record</div>
                </div>
            </div>
            <button class="unlock-btn" id="milestone-continue-btn" style="padding:16px 60px;font-size:22px">Continue</button>
        `;

        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        document.getElementById('unlock-screen').classList.add('visible');
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = 'none';
        if (bottomBar) bottomBar.style.display = 'none';

        document.getElementById('milestone-continue-btn').addEventListener('click', () => {
            document.getElementById('unlock-screen').classList.remove('visible');
            // Reset container overrides so unlock screen uses default sizing
            container.style.maxWidth = '';
            container.style.padding = '';
            if (topBar) topBar.style.display = 'flex';
            if (bottomBar) bottomBar.style.display = 'flex';
            this.game._unlockScreenActive = false;
            if (this.game.state === STATE.PAUSED) {
                this.game.state = STATE.PLAYING;
                if (this.game.music) this.game.music.resume();
            }
            this.game.audio.ensureContext();
        }, { once: true });
    }

    showVictoryScreen(stats) {
        const container = document.getElementById('victory-content');
        if (!container) return;

        container.style.maxWidth = '640px';
        container.style.padding = '44px 56px';

        const mapName = MAP_DEFS[this.game.selectedMapId]?.name || this.game.selectedMapId;

        // Format elapsed time
        const mins = Math.floor(stats.elapsed / 60);
        const secs = Math.floor(stats.elapsed % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Damage breakdown bars (same pattern as game-over)
        const damageByType = this.game.damageByType || {};
        const dmgEntries = Object.entries(damageByType)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1]);
        const maxDmg = dmgEntries.length > 0 ? dmgEntries[0][1] : 1;

        const towerColors = {};
        for (const [k, d] of Object.entries(TOWER_TYPES)) towerColors[k] = d.color;
        towerColors['hero'] = '#00e5ff';

        const towerNames = {};
        for (const [k, d] of Object.entries(TOWER_TYPES)) towerNames[k] = d.name;
        towerNames['hero'] = 'Hero';

        const formatDmg = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toString();

        let dmgBars = '';
        if (dmgEntries.length > 0) {
            dmgBars = `<div style="margin-top:20px;text-align:left">
                <div style="color:#bbb;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Damage by Type</div>`;
            for (const [type, dmg] of dmgEntries) {
                const pct = (dmg / maxDmg) * 100;
                const color = towerColors[type] || '#888';
                const name = towerNames[type] || type;
                dmgBars += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <div style="width:90px;font-size:12px;color:${color};text-align:right;flex-shrink:0">${name}</div>
                    <div style="flex:1;height:14px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
                    </div>
                    <div style="width:50px;font-size:11px;color:#999;text-align:right">${formatDmg(dmg)}</div>
                </div>`;
            }
            dmgBars += '</div>';
        }

        // Top towers (individual tower damage, top 5)
        const damageByTower = this.game.damageByTower || {};
        const towerEntries = Object.entries(damageByTower)
            .filter(([, v]) => v.damage > 0)
            .sort((a, b) => b[1].damage - a[1].damage)
            .slice(0, 5);
        const maxTowerDmg = towerEntries.length > 0 ? towerEntries[0][1].damage : 1;

        const typeCounts = {};
        const towerLabels = {};
        for (const [id, info] of towerEntries) {
            typeCounts[info.type] = (typeCounts[info.type] || 0) + 1;
        }
        const typeSeq = {};
        for (const [id, info] of towerEntries) {
            const name = towerNames[info.type] || info.type;
            if (typeCounts[info.type] > 1) {
                typeSeq[info.type] = (typeSeq[info.type] || 0) + 1;
                towerLabels[id] = `${name} #${typeSeq[info.type]}`;
            } else {
                towerLabels[id] = name;
            }
        }

        let topTowersHtml = '';
        if (towerEntries.length > 0) {
            topTowersHtml = `<div style="margin-top:16px;text-align:left">
                <div style="color:#bbb;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Top Towers</div>
                ${towerEntries.map(([id, info]) => {
                    const color = towerColors[info.type] || '#888';
                    const label = towerLabels[id];
                    const pct = (info.damage / maxTowerDmg) * 100;
                    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                        <div style="width:90px;font-size:11px;color:${color};font-weight:600;text-align:right;flex-shrink:0">${label}</div>
                        <div style="flex:1;height:14px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
                            <div style="width:${pct}%;height:100%;background:${color};opacity:0.8;border-radius:3px"></div>
                        </div>
                        <div style="width:50px;font-size:11px;color:#999;font-weight:600;flex-shrink:0">${formatDmg(info.damage)}</div>
                    </div>`;
                }).join('')}
            </div>`;
        }

        // Flashing tower icons — all unlocked towers
        const effectiveWave = this.game.getEffectiveWave ? this.game.getEffectiveWave() : 0;
        const unlockedKeys = Object.entries(TOWER_TYPES)
            .filter(([, d]) => !d.maxWave || effectiveWave <= d.maxWave)
            .filter(([, d]) => !d.unlockWave || effectiveWave >= d.unlockWave)
            .map(([k]) => k);
        const iconsHtml = unlockedKeys.map((key, i) => {
            const src = this.towerIconsLg?.[key] || '';
            return `<img src="${src}" style="width:48px;height:48px;border-radius:8px;border:2px solid ${TOWER_TYPES[key].color};animation:victoryIconPulse 1.5s ease-in-out ${i * 0.15}s infinite;filter:drop-shadow(0 0 6px ${TOWER_TYPES[key].color})">`;
        }).join('');

        // Inject keyframe animation if not already present
        if (!document.getElementById('victory-icon-style')) {
            const style = document.createElement('style');
            style.id = 'victory-icon-style';
            style.textContent = `@keyframes victoryIconPulse { 0%,100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } }`;
            document.head.appendChild(style);
        }

        container.innerHTML = `
            <div style="font-size:52px;font-weight:900;color:#ffd700;margin-bottom:4px;text-shadow:0 0 40px rgba(255,215,0,0.7),0 0 80px rgba(255,215,0,0.3),0 2px 8px rgba(0,0,0,0.5);letter-spacing:3px">
                VICTORY!
            </div>
            <div style="font-size:22px;font-weight:600;color:#fff;margin-bottom:6px;text-shadow:0 0 15px rgba(255,255,255,0.3)">
                ${mapName}
            </div>
            <div style="font-size:16px;color:#bbb;margin-bottom:16px">You conquered Wave ${VICTORY_WAVE}!</div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">
                ${iconsHtml}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 28px;margin:0 auto 24px;max-width:460px;text-align:center">
                <div>
                    <div style="color:#ff6b6b;font-size:28px;font-weight:800">${stats.kills}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Kills</div>
                </div>
                <div>
                    <div style="color:#3498db;font-size:28px;font-weight:800">${stats.towers}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Towers</div>
                </div>
                <div>
                    <div style="color:#ffd750;font-size:28px;font-weight:800">${stats.score}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Score</div>
                </div>
                <div>
                    <div style="color:#e74c3c;font-size:28px;font-weight:800">${stats.lives}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Lives</div>
                </div>
                <div>
                    <div style="color:#eee;font-size:28px;font-weight:800">${timeStr}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Time</div>
                </div>
                <div>
                    <div style="color:#ffd750;font-size:28px;font-weight:800">${stats.gold}</div>
                    <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Gold</div>
                </div>
            </div>
            ${dmgBars}
            ${topTowersHtml}
            <div style="display:flex;gap:16px;justify-content:center;margin-top:24px">
                <button class="unlock-btn" id="victory-continue-btn" style="background:#2ecc71;padding:16px 36px;font-size:18px">Continue (Endless)</button>
                <button class="unlock-btn" id="victory-menu-btn" style="background:#e74c3c;padding:16px 36px;font-size:18px">Return to Menu</button>
            </div>
        `;

        // Show victory screen, hide bars
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        document.getElementById('victory-screen').classList.add('visible');
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = 'none';
        if (bottomBar) bottomBar.style.display = 'none';

        // Continue (Endless) button
        document.getElementById('victory-continue-btn').addEventListener('click', () => {
            document.getElementById('victory-screen').classList.remove('visible');
            container.style.maxWidth = '';
            container.style.padding = '';
            if (topBar) topBar.style.display = 'flex';
            if (bottomBar) bottomBar.style.display = 'flex';
            this.game._unlockScreenActive = false;
            if (this.game.state === STATE.PAUSED) {
                this.game.state = STATE.PLAYING;
                if (this.game.music) this.game.music.resume();
            }
            this.game.audio.ensureContext();
        }, { once: true });

        // Return to Menu button
        document.getElementById('victory-menu-btn').addEventListener('click', () => {
            document.getElementById('victory-screen').classList.remove('visible');
            container.style.maxWidth = '';
            container.style.padding = '';
            this.game._unlockScreenActive = false;
            this.game.restart();
        }, { once: true });
    }

    showScreen(name) {
        // Hide all screens
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        // Show target
        const screen = document.getElementById(`${name}-screen`);
        if (screen) screen.classList.add('visible');

        // Hide/show gameplay bars — menu-child screens also hide bars
        const onMenu = name === 'menu' || name === 'trophy' || name === 'manual' || name === 'about' || name === 'reset';
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = onMenu ? 'none' : 'flex';
        if (bottomBar) bottomBar.style.display = onMenu ? 'none' : 'flex';

        // Refresh map records when returning to menu
        if (name === 'menu') {
            this.refreshMapRecords();
        }

        // Populate game-over screen with milestone-style summary
        if (name === 'game-over') {
            const container = document.getElementById('game-over-content');
            if (container) {
                const eco = this.game.economy;
                const wave = this.game.waves.currentWave;
                const mapName = MAP_DEFS[this.game.selectedMapId]?.name || this.game.selectedMapId;
                const record = Economy.getWaveRecord(this.game.selectedMapId);
                const isNewRecord = wave >= record && wave > 0;
                const kills = this.game.runKills || 0;
                const towers = this.game.towers.towers.length;
                const elapsed = this.game.elapsedTime || 0;
                const mins = Math.floor(elapsed / 60);
                const secs = Math.floor(elapsed % 60);
                const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

                container.style.maxWidth = '640px';
                container.style.padding = '44px 56px';

                // Build damage breakdown bars
                const damageByType = this.game.damageByType || {};
                const dmgEntries = Object.entries(damageByType)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1]);
                const maxDmg = dmgEntries.length > 0 ? dmgEntries[0][1] : 1;

                const towerColors = {};
                for (const [k, d] of Object.entries(TOWER_TYPES)) towerColors[k] = d.color;
                towerColors['hero'] = '#00e5ff';

                const towerNames = {};
                for (const [k, d] of Object.entries(TOWER_TYPES)) towerNames[k] = d.name;
                towerNames['hero'] = 'Hero';

                const formatDmg = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.round(n).toString();

                // Per-tower damage entries (top 8)
                const damageByTower = this.game.damageByTower || {};
                const towerEntries = Object.entries(damageByTower)
                    .filter(([, v]) => v.damage > 0)
                    .sort((a, b) => b[1].damage - a[1].damage)
                    .slice(0, 8);
                const maxTowerDmg = towerEntries.length > 0 ? towerEntries[0][1].damage : 1;

                // Number towers of the same type (e.g. "Fire Arrow #1", "#2")
                const typeCounts = {};
                const towerLabels = {};
                for (const [id, info] of towerEntries) {
                    typeCounts[info.type] = (typeCounts[info.type] || 0) + 1;
                }
                const typeSeq = {};
                for (const [id, info] of towerEntries) {
                    const name = towerNames[info.type] || info.type;
                    if (typeCounts[info.type] > 1) {
                        typeSeq[info.type] = (typeSeq[info.type] || 0) + 1;
                        towerLabels[id] = `${name} #${typeSeq[info.type]}`;
                    } else {
                        towerLabels[id] = name;
                    }
                }

                let dmgBarsHtml = '';
                if (dmgEntries.length > 0) {
                    dmgBarsHtml = `
                        <div style="margin:0 auto 24px;max-width:520px;text-align:left">
                            <div style="color:#aaa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;text-align:center">Damage by Type</div>
                            ${dmgEntries.map(([type, dmg]) => {
                                const color = towerColors[type] || '#888';
                                const name = towerNames[type] || type;
                                const pct = (dmg / maxDmg) * 100;
                                return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                    <div style="width:90px;font-size:12px;color:${color};font-weight:700;text-align:right;flex-shrink:0">${name}</div>
                                    <div style="flex:1;height:16px;background:#1a1a2e;border-radius:3px;overflow:hidden">
                                        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
                                    </div>
                                    <div style="width:50px;font-size:12px;color:#ccc;font-weight:600;flex-shrink:0">${formatDmg(dmg)}</div>
                                </div>`;
                            }).join('')}
                        </div>`;
                }

                let towerBarsHtml = '';
                if (towerEntries.length > 0) {
                    towerBarsHtml = `
                        <div style="margin:0 auto 24px;max-width:520px;text-align:left">
                            <div style="color:#aaa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;text-align:center">Top Towers</div>
                            ${towerEntries.map(([id, info]) => {
                                const color = towerColors[info.type] || '#888';
                                const label = towerLabels[id];
                                const pct = (info.damage / maxTowerDmg) * 100;
                                return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                                    <div style="width:90px;font-size:11px;color:${color};font-weight:600;text-align:right;flex-shrink:0">${label}</div>
                                    <div style="flex:1;height:14px;background:#1a1a2e;border-radius:3px;overflow:hidden">
                                        <div style="width:${pct}%;height:100%;background:${color};opacity:0.8;border-radius:3px"></div>
                                    </div>
                                    <div style="width:50px;font-size:11px;color:#aaa;font-weight:600;flex-shrink:0">${formatDmg(info.damage)}</div>
                                </div>`;
                            }).join('')}
                        </div>`;
                }

                container.innerHTML = `
                    <div style="font-size:44px;font-weight:800;color:#e74c3c;margin-bottom:4px;text-shadow:0 0 30px rgba(231,76,60,0.6),0 2px 8px rgba(0,0,0,0.5);letter-spacing:2px">
                        GAME OVER
                    </div>
                    <div style="font-size:22px;font-weight:600;color:#aaa;margin-bottom:6px">
                        ${mapName}
                    </div>
                    <div style="font-size:36px;font-weight:800;color:#ffd700;margin-bottom:4px;text-shadow:0 0 20px rgba(255,215,0,0.4)">
                        Wave ${wave}
                    </div>
                    ${isNewRecord ? '<div style="font-size:20px;font-weight:700;color:#2ecc71;margin-bottom:16px;text-shadow:0 0 12px rgba(46,204,113,0.4)">NEW RECORD!</div>' : `<div style="font-size:15px;color:#888;margin-bottom:16px">Best: Wave ${record}</div>`}
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 28px;margin:0 auto 28px;max-width:460px;text-align:center">
                        <div>
                            <div style="color:#ff6b6b;font-size:28px;font-weight:800">${kills}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Kills</div>
                        </div>
                        <div>
                            <div style="color:#3498db;font-size:28px;font-weight:800">${towers}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Towers</div>
                        </div>
                        <div>
                            <div style="color:#ffd750;font-size:28px;font-weight:800">${eco.score}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Score</div>
                        </div>
                        <div>
                            <div style="color:#e74c3c;font-size:28px;font-weight:800">${eco.lives}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Lives</div>
                        </div>
                        <div>
                            <div style="color:#eee;font-size:28px;font-weight:800">${timeStr}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Time</div>
                        </div>
                        <div>
                            <div style="color:#ffd750;font-size:28px;font-weight:800">${eco.gold}</div>
                            <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px">Gold</div>
                        </div>
                    </div>
                    ${dmgBarsHtml}
                    ${towerBarsHtml}
                    <button class="unlock-btn" id="restart-btn" style="padding:16px 60px;font-size:22px">Try Again</button>
                `;
                document.getElementById('restart-btn').addEventListener('click', () => {
                    container.style.maxWidth = '';
                    container.style.padding = '';
                    this.game.restart();
                }, { once: true });
            }
        }
    }

    _setupMultiplayer() {
        const createBtn = document.getElementById('mp-create-btn');
        const joinBtn = document.getElementById('mp-join-btn');
        const codeInput = document.getElementById('mp-code-input');
        const statusEl = document.getElementById('mp-status');

        if (!createBtn || !joinBtn) return;

        const getServerUrl = () => {
            // GCP VM relay server — set your VM's external IP here
            // For local dev: ws://localhost:8080
            const RELAY_SERVER_URL = 'ws://localhost:8080';
            return RELAY_SERVER_URL;
        };

        createBtn.addEventListener('click', async () => {
            statusEl.textContent = 'Connecting...';
            try {
                const net = await this.game.initMultiplayer(getServerUrl());
                net.onRoomCreated = (code) => {
                    statusEl.innerHTML = `Room: <span class="mp-room-code">${code}</span><br>Waiting for partner...`;
                };
                net.onPartnerJoined = () => {
                    statusEl.textContent = 'Partner joined! Select a map to start.';
                };
                net.onPartnerLeft = () => {
                    statusEl.textContent = 'Partner disconnected.';
                    this.game.particles.spawnBigFloatingText(CANVAS_W / 2, CANVAS_H / 3, 'PARTNER LEFT', '#e74c3c');
                };
                net.onError = (msg) => {
                    statusEl.textContent = `Error: ${msg}`;
                };
                net.createRoom();
            } catch (e) {
                statusEl.textContent = 'Failed to connect to server.';
                this.game.isMultiplayer = false;
            }
        });

        joinBtn.addEventListener('click', async () => {
            const code = (codeInput.value || '').trim().toUpperCase();
            if (code.length !== 4) {
                statusEl.textContent = 'Enter a 4-character room code.';
                return;
            }
            statusEl.textContent = 'Connecting...';
            try {
                const net = await this.game.initMultiplayer(getServerUrl());
                net.onRoomJoined = (roomCode, playerId) => {
                    statusEl.textContent = `Joined room ${roomCode} as Player ${playerId}. Waiting for host to pick a map...`;
                };
                net.onPartnerLeft = () => {
                    statusEl.textContent = 'Host disconnected.';
                    this.game.particles.spawnBigFloatingText(CANVAS_W / 2, CANVAS_H / 3, 'HOST LEFT', '#e74c3c');
                };
                net.onError = (msg) => {
                    statusEl.textContent = `Error: ${msg}`;
                };
                net.joinRoom(code);
            } catch (e) {
                statusEl.textContent = 'Failed to connect to server.';
                this.game.isMultiplayer = false;
            }
        });
    }

    showMPLobbyStatus(msg) {
        const el = document.getElementById('mp-status');
        if (el) el.textContent = msg;
    }

    hideAllScreens() {
        document.querySelectorAll('.game-screen').forEach(s => s.classList.remove('visible'));
        const topBar = document.getElementById('top-bar');
        const bottomBar = document.getElementById('bottom-bar');
        if (topBar) topBar.style.display = 'flex';
        if (bottomBar) bottomBar.style.display = 'flex';
    }

    showAchievementToast(ach) {
        const toast = this.elToast;
        if (!toast) return;
        this._toastBusy = true;
        toast.className = `tier-${ach.tier}`;
        toast.innerHTML = `
            <span class="toast-icon">${ach.icon}</span>
            <div class="toast-info">
                <span class="toast-label">Achievement Unlocked</span>
                <span class="toast-name">${ach.name}</span>
                <span class="toast-desc">${ach.description}</span>
            </div>
        `;
        // Force reflow then add show class
        toast.offsetHeight;
        toast.classList.add('show');
        this.game.audio.playAchievement();

        setTimeout(() => {
            toast.classList.remove('show');
            this._toastBusy = false;
        }, 3500);
    }

    buildTrophyScreen() {
        const ach = this.game.achievements;
        const grid = document.getElementById('trophy-grid');
        const countEl = document.getElementById('trophy-count');
        if (!grid) return;

        grid.innerHTML = '';
        if (countEl) countEl.textContent = `${ach.getUnlockedCount()} / ${ach.getTotalCount()}`;

        // Group by category
        const all = ach.getAll();
        const categories = {};
        for (const a of all) {
            const cat = a.category;
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(a);
        }

        for (const [catName, items] of Object.entries(categories)) {
            const catDiv = document.createElement('div');
            catDiv.className = 'trophy-category';
            const catTitle = document.createElement('div');
            catTitle.className = 'trophy-category-title';
            catTitle.textContent = catName;
            catDiv.appendChild(catTitle);

            for (const a of items) {
                const unlocked = ach.isUnlocked(a.id);
                const isHidden = a.hidden && !unlocked;

                const card = document.createElement('div');
                card.className = `trophy-card ${unlocked ? 'unlocked' : 'locked'} tier-${a.tier}`;

                const icon = document.createElement('span');
                icon.className = 'trophy-card-icon';
                icon.textContent = isHidden ? '?' : a.icon;

                const info = document.createElement('div');
                info.className = 'trophy-card-info';

                const name = document.createElement('div');
                name.className = 'trophy-card-name';
                name.textContent = isHidden ? '???' : a.name;

                const desc = document.createElement('div');
                desc.className = 'trophy-card-desc';
                desc.textContent = isHidden ? 'Hidden achievement' : a.description;

                info.appendChild(name);
                info.appendChild(desc);

                // Progress bar for stat-based locked achievements
                if (!unlocked && !isHidden && a.stat) {
                    const prog = ach.getProgress(a.id);
                    if (prog) {
                        const bar = document.createElement('div');
                        bar.className = 'trophy-progress';
                        const fill = document.createElement('div');
                        fill.className = 'trophy-progress-fill';
                        fill.style.width = `${Math.round(prog.pct * 100)}%`;
                        bar.appendChild(fill);
                        info.appendChild(bar);
                        const text = document.createElement('div');
                        text.className = 'trophy-progress-text';
                        text.textContent = `${prog.current} / ${prog.target}`;
                        info.appendChild(text);
                    }
                }

                const tier = document.createElement('span');
                tier.className = `trophy-card-tier tier-${a.tier}`;
                tier.textContent = a.tier;

                card.appendChild(icon);
                card.appendChild(info);
                card.appendChild(tier);
                catDiv.appendChild(card);
            }

            grid.appendChild(catDiv);
        }
    }
}
