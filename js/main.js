import { Game } from './game.js';

let _cachedNaturalH = 0;

function fitGameToViewport() {
    const container = document.getElementById('game-container');
    if (!container) return;

    // Use visualViewport API when available (better on iOS Safari with collapsing address bar)
    const vp = window.visualViewport;
    const vw = vp ? vp.width : window.innerWidth;
    const vh = vp ? vp.height : window.innerHeight;
    const naturalW = 1680;

    // Measure natural height once to avoid layout thrashing on narrow viewports
    if (!_cachedNaturalH) {
        container.style.transform = 'none';
        container.style.marginBottom = '0';
        _cachedNaturalH = container.offsetHeight;
    }

    const scale = Math.min(vw / naturalW, vh / _cachedNaturalH, 1);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'top center';
    // Compensate for transform not affecting layout flow
    const shrunkBy = _cachedNaturalH * (1 - scale);
    container.style.marginBottom = `-${shrunkBy}px`;
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

    // Responsive scaling
    fitGameToViewport();
    window.addEventListener('resize', fitGameToViewport);
    // visualViewport fires when iOS Safari toolbar collapses/expands
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', fitGameToViewport);
    }
    window.addEventListener('orientationchange', () => {
        // Recache natural height and refit after orientation settles
        _cachedNaturalH = 0;
        setTimeout(fitGameToViewport, 150);
    });
});
