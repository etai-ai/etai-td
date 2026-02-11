# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build tools, no dependencies, no package.json. Pure ES6 modules served directly.

```bash
# Any static HTTP server works (needed for ES module imports)
python -m http.server 8000
# or: npx http-server
```

Open `http://localhost:8000` in a modern browser. There are no tests or linters configured.

## Architecture

**Three-layer canvas system:** terrain (static, redrawn on tower place/sell), game (60fps entities), ui (hover/range overlay). All three canvases are stacked via z-index in `index.html`.

**Fixed timestep game loop** in `game.js`: 60Hz physics decoupled from rendering. Accumulator pattern with speed multiplier (1x/2x/3x). Update order: screen effects → waves → enemies → towers → projectiles → particles → wave completion check.

**Module graph:** `main.js` bootstraps `Game` (game.js), which instantiates all managers. Each manager class owns its entity array. `constants.js` is the single source of truth for all tuning data — tower stats, enemy stats, wave definitions, map layouts. `utils.js` has only pure helpers.

**State machine:** MENU → PLAYING → PAUSED / GAME_OVER / LEVEL_UP. Level-up transitions back to PLAYING with reset state.

## Key Conventions

- All game balance tuning lives in `constants.js` (414 lines) — never scatter magic numbers
- Entity managers use backwards iteration when splicing arrays (enemy deaths, projectile removal)
- Particle system is object-pooled (500 max) to avoid GC pressure
- Audio is procedural via Web Audio API — no audio files. Context must init on user interaction
- Grid coordinates are `gx, gy`; world pixel coordinates are `x, y`. Grid is 30×20 cells, 48px each
- localStorage keys use `td_` prefix: `td_player_level`, `td_high_score`, `td_wave_debug_log_v2`

## Progression System

- `playerLevel` is 0-based (stored in localStorage), displayed as `playerLevel + 1`
- `worldLevel = playerLevel + 1` set in `start()`; these must always agree with the menu display
- Beat 20 waves on any map → level up. Gold resets to `100 + level × 200` each level
- HP scaling: `wave * 1.10^wave` per wave, `1.1^(level-1)` per level, plus per-map `worldHpMultiplier`
- Tower unlocks: some by wave number (`unlockWave`), some by player level (`unlockLevel`)
- Map unlocks: Serpentine always, Split Creek at Lv.5, Gauntlet at Lv.10

## Burn Mechanic (Fire Arrow)

Burn damage bypasses armor entirely — applied directly to HP, not through `takeDamage()`. Stronger burns overwrite weaker ones on reapply. This is the primary counter to high-armor enemies.

## Admin/Debug Mode

Press backtick (`` ` ``) to toggle the admin panel with real-time DPS/efficiency stats and post-wave analysis. Hotkeys: `K` kill all, `W` set wave, `L` set level, `D` download CSV analytics. See `ADMIN_GUIDE.md` for full reference.

## Common Pitfalls

- Wave completion check needs `currentWave > 0` guard to avoid false triggers before the game starts
- All audio `play*` methods need null-check on `this.ctx` (context may not be initialized)
- Player level is only persisted in `levelUp()`, not in `continueNextLevel` or `adminSetLevel`
- Map unlock check: `(playerLevel + 1) < requiredLevel` — off-by-one is easy to get wrong
- `renderer.js` is the largest file (1,754 lines) — drawing logic for all entities lives here
