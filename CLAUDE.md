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

**Four-layer canvas system:** terrain (static, z:0), game (60fps entities, z:1), fx (WebGL2 post-processing, z:2), ui (hover/range overlay, z:3). When PostFX is enabled, terrain+game are composited through WebGL shaders into fx-canvas with bloom, vignette, and dynamic effects. When WebGL2 is unavailable, fx-canvas is hidden and the game falls back to Canvas 2D only.

**Fixed timestep game loop** in `game.js`: 60Hz physics decoupled from rendering. Accumulator pattern with speed multiplier (1x/2x/3x). Update order: screen effects → waves → enemies → towers → projectiles → particles → wave completion check.

**Module graph:** `main.js` bootstraps `Game` (game.js), which instantiates all managers. Each manager class owns its entity array. `constants.js` is the single source of truth for all tuning data — tower stats, enemy stats, wave definitions, map layouts. `utils.js` has only pure helpers. `postfx.js` owns the WebGL2 pipeline (shaders, FBOs, effect state).

**State machine:** MENU → PLAYING → PAUSED / GAME_OVER / LEVEL_UP. Level-up transitions back to PLAYING with reset state.

## Key Conventions

- All game balance tuning lives in `constants.js` (414 lines) — never scatter magic numbers
- Entity managers use backwards iteration when splicing arrays (enemy deaths, projectile removal)
- Particle system is object-pooled (500 max) to avoid GC pressure
- Audio is procedural via Web Audio API — no audio files. Context must init on user interaction
- Grid coordinates are `gx, gy`; world pixel coordinates are `x, y`. Grid is 30×20 cells, 56px each
- localStorage keys use `td_` prefix: `td_player_level`, `td_high_score`, `td_wave_debug_log_v2`

## Progression System

- `playerLevel` is 0-based (stored in localStorage), displayed as `playerLevel + 1`
- `worldLevel = playerLevel + 1` set in `start()`; these must always agree with the menu display
- Beat all waves on any map → level up (20 default, 15 for Level 3). Gold resets to `150 + level × 150` each level
- HP scaling: `wave * 1.10^wave` per wave, `1.04^(level-1)` per level, plus per-map `worldHpMultiplier`
- Auto-wave: enabled by default (`game.autoWave`), auto-starts next wave after 5s. Toggle via Auto badge in top bar
- Tower unlocks: some by wave number (`unlockWave`), some by player level (`unlockLevel`)
- Map unlocks: Serpentine always, Split Creek at Lv.5, Gauntlet at Lv.10

## Burn Mechanic (Fire Arrow)

Burn damage bypasses armor entirely — applied directly to HP, not through `takeDamage()`. Stronger burns overwrite weaker ones on reapply. This is the primary counter to high-armor enemies.

## Admin/Debug Mode

Press backtick (`` ` ``) to toggle the admin panel with real-time DPS/efficiency stats and post-wave analysis. Hotkeys: `K` kill all, `W` set wave, `L` set level, `D` download CSV analytics. See `ADMIN_GUIDE.md` for full reference.

## PostFX (WebGL2 Post-Processing)

`postfx.js` adds a 5-pass GPU pipeline on a 4th canvas (`fx-canvas`). When enabled, terrain+game canvases are hidden (`visibility: hidden`) and composited through WebGL shaders. Effects: bloom (half-res blur), vignette, per-map color grading, screen flash, shockwave distortion, chromatic aberration. All effects have timers decayed in `game.update(dt)`.

- `postfx.setTerrainDirty()` must be called after any terrain redraw (tower place/sell/upgrade) — this is done automatically in `renderer.drawTerrain()`
- `UNPACK_FLIP_Y_WEBGL` is set to `true` to prevent Y-inversion when uploading canvas textures
- Effect triggers: `flash(intensity, duration)`, `shockwave(nx, ny, intensity)`, `aberration(intensity, duration)`
- Per-map tints set in `game.selectMap()`: Serpentine warm green, Split Creek cool blue, Gauntlet hot red
- **Point lighting:** Up to 32 dynamic lights computed in the composite pass (pass 1). Towers emit colored glow (scales with upgrade level), projectiles carry moving lights, hero has cyan aura, scorch zones glow orange-red. Per-map ambient darkness dims the scene (Serpentine 0.25, Creek 0.10, Gauntlet 0.35); lights restore/amplify brightness. Quartic attenuation `(1-t²)²` with aspect ratio correction. Flash lights (`addFlashLight`) decay over time for explosions, boss deaths, and hero abilities. All light methods bail with `if (!this.enabled) return` — zero cost when PostFX off. Light registration happens in `game.registerLights()` called before `postfx.render()` in `tick()`.

## Hero Unit (Level 3+)

WASD-controlled hero spawns near the castle (second-to-last waypoint) when `worldLevel >= 3`, facing towards enemies. Auto-attacks nearest enemy (15 dmg, 3.5 range, 2/s). Two abilities: Q = AoE stun (3-cell radius, 1.5s, 15s cooldown), E = gold magnet (2x kill gold in 4-cell radius, 8s duration, 20s cooldown). Takes contact damage from enemies (type-dependent multipliers). Dies at 0 HP, respawns after 5s near the castle. Managed by `hero.js`, updated after enemies/before towers in game loop.

## Dual Spawn Points (Level 6+)

At `worldLevel >= DUAL_SPAWN_LEVEL` (6), enemies spawn from two entry points. Each layout in `MAP_DEFS` has `secondaryWaypoints` entering from x=29 (right edge), converging at the same exit. `WaveManager` alternates spawns: odd-numbered enemies use the secondary path. `GameMap` constructor takes `worldLevel` as 3rd param to conditionally carve and build `this.secondaryPath`. Split Creek primary enemies still fork upper/lower; secondary enemies use a single right-side path.

## Level 3 Pacing Override

Level 3 uses 15 waves instead of 20, defined in `LEVEL_WAVES[3]` in `constants.js`. `getTotalWaves(worldLevel)` checks for per-level overrides. Two special wave tags: wave 7 = `goldrush` (2x kill gold via `GOLD_RUSH_MULTIPLIER`), wave 8 = `midboss` (boss kill grants +150g flat bonus via `MIDBOSS_BOUNTY`). Tags retrieved via `getWaveTag(worldLevel, wave)`.

## Ambient Map Effects

Per-environment animated particles drawn on the game canvas (ground layer, before scorch zones). Forest: falling leaves + fireflies. Desert: sand wisps + dust puffs. Lava: rising embers + bubbles. Pool capped at 40, spawned at ~6-7/sec. Fixed dt (1/60) — not affected by game speed. Pool cleared on `drawTerrain()`. Self-contained in `renderer.js` (`updateAmbients`, `spawnAmbient`, `drawAmbients`).

## Common Pitfalls

- Wave completion check needs `currentWave > 0` guard to avoid false triggers before the game starts
- All audio `play*` methods need null-check on `this.ctx` (context may not be initialized)
- Player level is only persisted in `levelUp()`, not in `continueNextLevel` or `adminSetLevel`
- Map unlock check: `(playerLevel + 1) < requiredLevel` — off-by-one is easy to get wrong
- `renderer.js` is the largest file (~2,000 lines) — drawing logic for all entities lives here
- Hero WASD keys conflict with admin hotkeys (W=wave, D=download) when admin mode is active
- PostFX canvas textures need `UNPACK_FLIP_Y_WEBGL = true` or the image renders upside-down
- Screen flash in `renderer.js` is gated behind `!postfx.enabled` — the PostFX shader handles flash when active
- Knockback has a per-enemy limit of 2 (`enemy.knockbackCount`) — after 2 knockbacks, further knockback is ignored (bosses are always immune)

## UI Features

- **Auto-wave toggle:** `game.autoWave` (default true), auto-starts next wave after 5s delay. Toggle badge in top bar next to speed control
- **Next-wave preview:** Between waves, `wave.getNextWavePreview()` returns enemy counts; rendered on UI canvas with actual enemy shapes via `drawEnemyShape()`
- **Low lives warning:** When `economy.lives <= 5`, pulsing red border on game canvas + CSS animation on lives badge + alert sound on each life lost. Warning sound: `audio.playLowLivesWarning()`
- **Wave modifier badge:** Active modifier name shown inline in wave counter during the wave (ui.js `update()`)
- **Tower info card:** Shows all tower stats with upgrade preview arrows — damage, range, fire rate, burn, splash, slow %, freeze %, chain count, fork count, shock %, heavy round interval, armor shred %, crit %
- **Victory screen:** Wave count is dynamic via `getTotalWaves(worldLevel)` — correctly shows "15 waves" for Level 3
