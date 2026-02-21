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

document.addEventListener('DOMContentLoaded', () => {
    const canvases = {
        terrain: document.getElementById('terrain-canvas'),
        game: document.getElementById('game-canvas'),
        ui: document.getElementById('ui-canvas'),
        fx: document.getElementById('fx-canvas'),
        three: document.getElementById('three-canvas'),
    };

    const game = new Game(canvases);
    game.run();

    // Expose for debugging
    window.game = game;

    // Continuous responsive scaling
    fitGameToViewport();
    window.addEventListener('resize', fitGameToViewport);
    window.addEventListener('orientationchange', fitGameToViewport);
});
