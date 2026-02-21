import { Game } from './game.js';

function fitGameToViewport() {
    const container = document.getElementById('game-container');
    if (!container) return;
    // Temporarily remove transform to measure natural height
    container.style.transform = 'none';
    container.style.marginBottom = '0';
    const naturalH = container.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / 1680, vh / naturalH, 1);
    container.style.transform = `scale(${scale})`;
    container.style.marginBottom = `-${naturalH * (1 - scale)}px`;
}

function setLoadProgress(pct) {
    const fill = document.getElementById('loading-bar-fill');
    const text = document.getElementById('loading-percent');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = Math.round(pct) + '%';
}

function dismissLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    setLoadProgress(100);
    setTimeout(() => {
        screen.classList.add('fade-out');
        screen.addEventListener('transitionend', () => screen.remove(), { once: true });
    }, 200);
}

document.addEventListener('DOMContentLoaded', async () => {
    setLoadProgress(20); // DOM ready

    // CrazyGames SDK v3: init must complete before any other SDK call
    const sdk = typeof window !== 'undefined' && window.CrazyGames?.SDK;
    if (sdk) {
        try {
            await sdk.init();
            try { sdk.game.loadingStart(); } catch {}
        } catch { /* SDK init failed — game continues without it */ }
    }

    setLoadProgress(30); // SDK initialized

    const canvases = {
        terrain: document.getElementById('terrain-canvas'),
        game: document.getElementById('game-canvas'),
        ui: document.getElementById('ui-canvas'),
        fx: document.getElementById('fx-canvas'),
        three: document.getElementById('three-canvas'),
    };

    setLoadProgress(40); // Canvases resolved

    const game = new Game(canvases);
    setLoadProgress(70); // Game systems initialized

    game.run();
    setLoadProgress(90); // Game loop started

    // Dismiss after a short settling frame so first render completes
    requestAnimationFrame(() => {
        dismissLoadingScreen();
    });

    // Expose for debugging
    window.game = game;

    // Continuous responsive scaling
    fitGameToViewport();
    window.addEventListener('resize', fitGameToViewport);
    window.addEventListener('orientationchange', fitGameToViewport);
});
