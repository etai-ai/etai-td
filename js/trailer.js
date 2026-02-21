import { TOWER_TYPES, ENEMY_TYPES, MAP_DEFS, WORLD_ORDER } from './constants.js';

const SCENE_DURATIONS = [4000, 5000, 5000, 6000, 5000, 5000, 6000, 0]; // ms; 0 = no auto

const SCENE_PALETTES = [
    ['#3498db', '#85c1e9', '#ffffff'],           // Opening — blue/white
    ['#27ae60', '#2ecc71', '#d4a840'],           // Valley — forest greens
    ['#e74c3c', '#f39c12', '#2c3e50'],           // Horde — enemy reds
    ['#c0392b', '#5b9bd5', '#9b59b6'],           // Arsenal — tower mix
    ['#00e5ff', '#ffffff', '#ffd700'],            // Hero — cyan/gold
    ['#8e44ad', '#8b0000', '#0a0a0a'],           // Bosses — dark purples
    ['#3498db', '#e67e22', '#2ecc71'],            // Worlds — varied
    ['#ffd700', '#e67e22', '#ffffff'],            // CTA — gold
];

export class Trailer {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('trailer-content');
        this.currentScene = 0;
        this.active = false;
        this._prepared = false;
        this._animFrame = null;
        this._autoTimer = null;
        this._keyHandler = null;

        // Cached visuals
        this._towerIcons = {};
        this._enemyIcons = {};
        this._bossIcons = {};
        this._mapPreviews = {};
        this._heroIcon = null;

        // Particle state
        this._particles = [];
        this._bgCanvas = null;
        this._bgCtx = null;
    }

    _prepare() {
        if (this._prepared) return;
        this._prepared = true;

        // Tower icons from cached towerIconsLg
        const icons = this.game.ui.towerIconsLg;
        if (icons) {
            for (const key of Object.keys(icons)) {
                this._towerIcons[key] = icons[key];
            }
        }

        // Enemy icons — render to offscreen canvases
        const enemyList = ['grunt', 'runner', 'tank', 'healer', 'boss', 'swarm'];
        for (const type of enemyList) {
            this._enemyIcons[type] = this._renderEnemyIcon(type, 64);
        }

        // Boss icons
        const bossList = ['boss', 'megaboss', 'royboss'];
        for (const type of bossList) {
            this._bossIcons[type] = this._renderEnemyIcon(type, 80);
        }

        // Map previews
        for (const id of WORLD_ORDER) {
            const def = MAP_DEFS[id];
            if (!def) continue;
            const canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 160;
            this.game.ui.drawMapPreview(canvas, def);
            this._mapPreviews[id] = canvas.toDataURL();
        }

        // Hero icon
        this._heroIcon = this._renderHeroIcon(80);
    }

    _renderEnemyIcon(type, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const def = ENEMY_TYPES[type];
        if (!def) return canvas.toDataURL();

        const r = size * 0.35;
        const cx = size / 2;
        const cy = size / 2;

        const fakeEnemy = {
            type,
            color: def.color,
            radius: def.radius,
            angle: 0,
            walkPhase: 0,
        };

        ctx.fillStyle = def.color;
        this.game.renderer.drawEnemyShape(ctx, fakeEnemy, cx, cy, r);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        this.game.renderer.drawEnemyShape(ctx, fakeEnemy, cx, cy, r);
        ctx.stroke();

        return canvas.toDataURL();
    }

    _renderHeroIcon(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.35;

        // Glow
        const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.5);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
        grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Body
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner
        ctx.fillStyle = '#00b8d4';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Cross mark
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.3, cy);
        ctx.lineTo(cx + r * 0.3, cy);
        ctx.moveTo(cx, cy - r * 0.3);
        ctx.lineTo(cx, cy + r * 0.3);
        ctx.stroke();

        return canvas.toDataURL();
    }

    show() {
        this._prepare();
        this.active = true;
        this.currentScene = 0;

        // Show trailer screen
        this.game.ui.showScreen('trailer');

        this._initParticles();
        this._renderScene(0);
        this._startAnimation();

        // Keyboard handler
        this._keyHandler = (e) => {
            e.stopPropagation();
            switch (e.key) {
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    this._nextScene();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this._prevScene();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
            }
        };
        document.addEventListener('keydown', this._keyHandler, true);
    }

    hide() {
        this.active = false;
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        if (this._autoTimer) {
            clearTimeout(this._autoTimer);
            this._autoTimer = null;
        }
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler, true);
            this._keyHandler = null;
        }
        this.game.ui.showScreen('menu');
    }

    _nextScene() {
        if (this.currentScene < SCENE_DURATIONS.length - 1) {
            this.currentScene++;
            this._renderScene(this.currentScene);
        }
    }

    _prevScene() {
        if (this.currentScene > 0) {
            this.currentScene--;
            this._renderScene(this.currentScene);
        }
    }

    _scheduleAuto(idx) {
        if (this._autoTimer) {
            clearTimeout(this._autoTimer);
            this._autoTimer = null;
        }
        const dur = SCENE_DURATIONS[idx];
        if (dur > 0) {
            this._autoTimer = setTimeout(() => {
                if (this.active && this.currentScene === idx) {
                    this._nextScene();
                }
            }, dur);
        }
    }

    _renderScene(idx) {
        this._scheduleAuto(idx);

        // Build scene HTML
        let sceneHtml = '';
        switch (idx) {
            case 0: sceneHtml = this._sceneOpening(); break;
            case 1: sceneHtml = this._sceneValley(); break;
            case 2: sceneHtml = this._sceneHorde(); break;
            case 3: sceneHtml = this._sceneArsenal(); break;
            case 4: sceneHtml = this._sceneHero(); break;
            case 5: sceneHtml = this._sceneBosses(); break;
            case 6: sceneHtml = this._sceneWorlds(); break;
            case 7: sceneHtml = this._sceneCTA(); break;
        }

        // Wrap with scene + controls
        this.container.innerHTML = `
            <canvas class="trailer-bg-canvas" id="trailer-bg"></canvas>
            <div class="trailer-vignette"></div>
            <div class="trailer-letterbox-top"></div>
            <div class="trailer-letterbox-bottom"></div>
            <div class="trailer-scene active">${sceneHtml}</div>
            ${this._renderControls(idx)}
        `;

        // Reattach particle canvas
        this._bgCanvas = document.getElementById('trailer-bg');
        if (this._bgCanvas) {
            this._bgCanvas.width = this.container.offsetWidth || 1680;
            this._bgCanvas.height = this.container.offsetHeight || 1120;
            this._bgCtx = this._bgCanvas.getContext('2d');
        }

        // Update particle palette
        this._particlePalette = SCENE_PALETTES[idx] || SCENE_PALETTES[0];

        // Bind control buttons
        this.container.querySelector('.trailer-prev')?.addEventListener('click', () => this._prevScene());
        this.container.querySelector('.trailer-next')?.addEventListener('click', () => this._nextScene());
        this.container.querySelector('.trailer-skip')?.addEventListener('click', () => this.hide());

        // Dots
        this.container.querySelectorAll('.trailer-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const target = parseInt(dot.dataset.scene);
                if (!isNaN(target)) {
                    this.currentScene = target;
                    this._renderScene(target);
                }
            });
        });

        // CTA play button
        this.container.querySelector('.trailer-play-btn')?.addEventListener('click', () => this.hide());
    }

    _renderControls(idx) {
        const total = SCENE_DURATIONS.length;
        let dots = '';
        for (let i = 0; i < total; i++) {
            dots += `<span class="trailer-dot${i === idx ? ' active' : ''}" data-scene="${i}"></span>`;
        }
        return `
            <div class="trailer-controls">
                <button class="trailer-prev trailer-ctrl-btn" ${idx === 0 ? 'disabled' : ''}>&larr;</button>
                <div class="trailer-dots">${dots}</div>
                <button class="trailer-next trailer-ctrl-btn" ${idx === total - 1 ? 'disabled' : ''}>&rarr;</button>
                <button class="trailer-skip trailer-ctrl-btn">Skip</button>
            </div>
        `;
    }

    // ── Scene Builders ────────────────────────────────────

    _sceneOpening() {
        return `
            <div class="trailer-center">
                <div class="trailer-title trailer-anim-impact">Etai's Tower Defence</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.8s">
                    Build. Defend. Survive.
                </div>
            </div>
        `;
    }

    _sceneValley() {
        const mapSrc = this._mapPreviews['serpentine'] || '';
        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER I</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:48px">The Valley</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.5s">
                    Where every commander begins their journey
                </div>
                ${mapSrc ? `<img class="trailer-map-hero trailer-anim-fadeup" src="${mapSrc}" style="animation-delay:0.8s">` : ''}
            </div>
        `;
    }

    _sceneHorde() {
        const types = ['grunt', 'runner', 'tank', 'healer', 'swarm', 'boss'];
        const names = { grunt: 'Grunt', runner: 'Runner', tank: 'Tank', healer: 'Healer', swarm: 'Swarm', boss: 'Boss' };
        const cards = types.map((type, i) => {
            const src = this._enemyIcons[type] || '';
            const def = ENEMY_TYPES[type];
            return `
                <div class="trailer-enemy-card trailer-anim-fadeup" style="animation-delay:${0.3 + i * 0.15}s;--ec:${def?.color || '#888'}">
                    <img src="${src}" width="64" height="64">
                    <div class="trailer-enemy-name">${names[type]}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER II</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:48px">The Horde</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.3s">
                    They come in many forms. Each deadlier than the last.
                </div>
                <div class="trailer-enemy-grid">${cards}</div>
            </div>
        `;
    }

    _sceneArsenal() {
        // Show the main tower types in two rows
        const towerKeys = ['firearrow', 'deepfrost', 'superlightning', 'bicannon', 'missilesniper', 'titan'];
        const row1 = towerKeys.slice(0, 3);
        const row2 = towerKeys.slice(3);

        const makeCard = (key, i) => {
            const def = TOWER_TYPES[key];
            const src = this._towerIcons[key] || '';
            return `
                <div class="trailer-tower-card trailer-anim-fadeup" style="animation-delay:${0.3 + i * 0.15}s;--tc:${def?.color || '#888'}">
                    <img src="${src}" width="80" height="80">
                    <div class="trailer-tower-name" style="color:${def?.color || '#eee'}">${def?.name || key}</div>
                    <div class="trailer-tower-cost">$${def?.cost || '?'}</div>
                </div>
            `;
        };

        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER III</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:48px">The Arsenal</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.3s">
                    10 unique towers. Each with devastating upgrades.
                </div>
                <div class="trailer-tower-row">${row1.map((k, i) => makeCard(k, i)).join('')}</div>
                <div class="trailer-tower-row">${row2.map((k, i) => makeCard(k, i + 3)).join('')}</div>
            </div>
        `;
    }

    _sceneHero() {
        const heroSrc = this._heroIcon || '';
        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER IV</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:48px">The Hero</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.3s">
                    Take direct control. Turn the tide.
                </div>
                ${heroSrc ? `<img class="trailer-hero-icon trailer-anim-fadeup" src="${heroSrc}" style="animation-delay:0.5s" width="96" height="96">` : ''}
                <div class="trailer-ability-row">
                    <div class="trailer-ability-card trailer-anim-fadeup" style="animation-delay:0.7s;--ac:#9b59b6">
                        <div class="trailer-ability-key">Q</div>
                        <div class="trailer-ability-name">AoE Stun</div>
                    </div>
                    <div class="trailer-ability-card trailer-anim-fadeup" style="animation-delay:0.9s;--ac:#ffd700">
                        <div class="trailer-ability-key">E</div>
                        <div class="trailer-ability-name">Gold Magnet</div>
                    </div>
                    <div class="trailer-ability-card trailer-anim-fadeup" style="animation-delay:1.1s;--ac:#e74c3c">
                        <div class="trailer-ability-key">Z</div>
                        <div class="trailer-ability-name">Execute</div>
                    </div>
                </div>
            </div>
        `;
    }

    _sceneBosses() {
        const bossData = [
            { type: 'boss', name: 'Boss', subtitle: 'Every 5 waves', color: '#8e44ad' },
            { type: 'megaboss', name: 'Megaboss', subtitle: 'Waves 25-31', color: '#8b0000' },
            { type: 'royboss', name: 'Roy Boss', subtitle: 'Wave 32+', color: '#4a0080' },
        ];

        const cards = bossData.map((b, i) => {
            const src = this._bossIcons[b.type] || '';
            return `
                <div class="trailer-boss-card trailer-anim-fadeup" style="animation-delay:${0.4 + i * 0.3}s;--bc:${b.color}">
                    <img src="${src}" width="80" height="80">
                    <div class="trailer-boss-name" style="color:${b.color}">${b.name}</div>
                    <div class="trailer-boss-sub">${b.subtitle}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER V</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:48px">The Bosses</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.3s">
                    Massive. Armored. Relentless.
                </div>
                <div class="trailer-boss-row">${cards}</div>
            </div>
        `;
    }

    _sceneWorlds() {
        const worldNames = {
            serpentine: 'Serpentine Valley',
            skyislands: 'Sky Citadel',
            splitcreek: 'Split Creek',
            gauntlet: 'The Gauntlet',
            citadel: 'The Citadel',
            nexus: 'The Nexus',
        };
        const worldColors = {
            serpentine: '#27ae60',
            skyislands: '#5dade2',
            splitcreek: '#d4a026',
            gauntlet: '#c0392b',
            citadel: '#7f8c8d',
            nexus: '#8e44ad',
        };

        const cards = WORLD_ORDER.map((id, i) => {
            const src = this._mapPreviews[id] || '';
            const name = worldNames[id] || id;
            const color = worldColors[id] || '#eee';
            return `
                <div class="trailer-world-card trailer-anim-fadeup" style="animation-delay:${0.2 + i * 0.15}s">
                    <img src="${src}" width="240" height="160">
                    <div class="trailer-world-name" style="color:${color}">${name}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="trailer-center">
                <div class="trailer-scene-label trailer-anim-fadeup">CHAPTER VI</div>
                <div class="trailer-title trailer-anim-impact" style="font-size:44px">Six Worlds</div>
                <div class="trailer-subtitle trailer-anim-fadeup" style="animation-delay:0.2s">
                    From forest valleys to the void itself
                </div>
                <div class="trailer-world-grid">${cards}</div>
            </div>
        `;
    }

    _sceneCTA() {
        return `
            <div class="trailer-center">
                <div class="trailer-title trailer-anim-impact" style="font-size:52px;color:#ffd700">
                    How Far Can You Survive?
                </div>
                <button class="trailer-play-btn trailer-anim-fadeup" style="animation-delay:0.6s">
                    Play Now
                </button>
            </div>
        `;
    }

    // ── Particle System ───────────────────────────────────

    _initParticles() {
        this._particles = [];
        this._particlePalette = SCENE_PALETTES[0];
        for (let i = 0; i < 80; i++) {
            this._particles.push(this._makeParticle());
        }
    }

    _makeParticle() {
        const w = this._bgCanvas?.width || 1680;
        const h = this._bgCanvas?.height || 1120;
        const palette = this._particlePalette || SCENE_PALETTES[0];
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -Math.random() * 0.5 - 0.2,
            r: Math.random() * 2.5 + 0.5,
            alpha: Math.random() * 0.5 + 0.1,
            color: palette[Math.floor(Math.random() * palette.length)],
            life: Math.random() * 200 + 100,
            maxLife: 0,
        };
    }

    _startAnimation() {
        const loop = () => {
            if (!this.active) return;
            this._updateParticles();
            this._drawParticles();
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    _updateParticles() {
        const w = this._bgCanvas?.width || 1680;
        const h = this._bgCanvas?.height || 1120;
        for (const p of this._particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
                Object.assign(p, this._makeParticle());
                // Reset position to bottom edge for upward drift
                p.y = h + 5;
                p.x = Math.random() * w;
            }
        }
    }

    _drawParticles() {
        const ctx = this._bgCtx;
        if (!ctx) return;
        const w = this._bgCanvas.width;
        const h = this._bgCanvas.height;

        ctx.clearRect(0, 0, w, h);
        for (const p of this._particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
