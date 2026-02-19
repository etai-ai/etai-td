import { Game } from './game.js';

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
});
