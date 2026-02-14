# Etai's Tower Defence

A tower defense game built with vanilla JavaScript, HTML5 Canvas, and WebGL2 post-processing. No frameworks, no build tools — pure ES6 modules.

## How to Play

Defend your base against endless waves of enemies by placing and upgrading towers along the path. Enemies follow the path from entry to exit — if they reach the end, you lose lives. Each world is an endless survival run. How far can you get?

## Running the Game

Any static HTTP server works (needed for ES module imports):

```bash
python -m http.server 8000
# or: npx http-server
```

Open `http://localhost:8000` in a modern browser with WebGL2 support.

## Features

- **11 tower types** with unique mechanics — burn, freeze, chain lightning, splash, knockback, homing missiles, and more
- **6 enemy types** — grunts, runners, tanks, healers, bosses, and swarms
- **3 maps** with distinct strategic challenges — long winding paths, split forks, and short gauntlets
- **Hero unit** (Wave 14+) — WASD-controlled character with AoE stun and gold magnet abilities
- **Dual spawn points** (Wave 15+) — enemies gradually attack from two directions
- **WebGL2 post-processing** — bloom, vignette, color grading, dynamic point lighting, shockwave distortion, chromatic aberration
- **Procedural audio** — all sound generated via Web Audio API, no audio files
- **Wave modifiers** — random buffs (armored, swift, regen, horde) keep each run fresh
- **Achievement system** — 31 achievements across 6 categories
- **Wave-based progression** — new towers and abilities unlock at wave thresholds mid-run

## Documentation

- **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** — Technical guide for tuning balance, adding content, and using admin tools
- **[CLAUDE.md](CLAUDE.md)** — Developer reference for code architecture and conventions

## Tech Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas (4-layer system: terrain, game, WebGL2 FX, UI)
- WebGL2 for post-processing (graceful fallback to Canvas 2D)
- Web Audio API for procedural sound
- localStorage for persistence
- Zero dependencies
