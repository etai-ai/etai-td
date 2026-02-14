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

**State machine:** MENU → PLAYING → PAUSED / GAME_OVER. No level-up transitions — each world is a single endless run.

## Key Conventions

- All game balance tuning lives in `constants.js` — never scatter magic numbers
- Entity managers use backwards iteration when splicing arrays (enemy deaths, projectile removal)
- Particle system is object-pooled (500 max) to avoid GC pressure
- Audio is procedural via Web Audio API — no audio files. Context must init on user interaction
- Grid coordinates are `gx, gy`; world pixel coordinates are `x, y`. Grid is 30×20 cells, 56px each
- localStorage keys use `td_` prefix: `td_wave_record`, `td_high_score`, `td_wave_debug_log_v2`

## Progression System

Every world is an **endless wave-based survival run**. No levels — you play until you die.

- **Wave-based unlocks:** Towers, hero, and dual spawn unlock at wave thresholds mid-run via `WAVE_UNLOCKS` in constants.js
- `getEffectiveWave() = max(currentWave, MAP_DEFS[mapId].startingUnlocks)` determines what's available
- HP scaling: `wave * 1.10^wave * mapHpMultiplier` — no per-level multiplier
- Waves 1-5: hand-crafted intro waves. Wave 6+: procedural via `generateWave()`
- Goldrush every 10 waves (2x kill gold), boss every 5 waves
- Starting gold: fixed 300g for all worlds
- Auto-wave: enabled by default (`game.autoWave`), auto-starts next wave after 5s
- Wave record saved per map in `td_wave_record` localStorage key

### Wave Unlock Thresholds (`WAVE_UNLOCKS`)

| Wave | Unlock | Replaces |
|------|--------|----------|
| 1 | Arrow, Frost, Lightning | — |
| 2 | Cannon | — |
| 5 | Sniper | — |
| 10 | Fire Arrow, Deep Frost | Arrow, Frost (auto-upgraded) |
| 20 | Hero (WASD unit) | — |
| 30 | Super Lightning, Bi-Cannon + Dual Spawn | Lightning, Cannon (auto-upgraded) |
| 50 | Missile Sniper | Sniper (auto-upgraded) |
| 80 | Pulse Cannon | — |

When a threshold is crossed, `onWaveThreshold()` in game.js:
1. Collects all unlocks in a batch
2. Auto-upgrades placed towers to their replacements
3. Pauses the game and shows the unlock screen (HTML overlay)
4. Player clicks Continue to resume

### World Unlock & Starting Bonuses

| World | Required Record | Starting Unlocks | Effect |
|-------|----------------|-----------------|--------|
| Serpentine | Always open | 0 | Full progression from wave 1 |
| Split Creek | Wave 40 on any map | 30 | Starts with wave 1-30 towers pre-unlocked |
| Gauntlet | Wave 80 on any map | 50 | Starts with wave 1-50 towers pre-unlocked |

Maps with `startingUnlocks > 0` pre-populate `_triggeredThresholds` so those unlocks aren't announced again.

## Burn Mechanic (Fire Arrow)

Burn damage bypasses armor entirely — applied directly to HP, not through `takeDamage()`. Stronger burns overwrite weaker ones on reapply. This is the primary counter to high-armor enemies.

## Admin/Debug Mode

Press backtick (`` ` ``) to toggle the admin panel with real-time DPS/efficiency stats and post-wave analysis. Hotkeys: `K` kill all, `W` set wave, `D` download CSV analytics. See `ADMIN_GUIDE.md` for full reference.

## PostFX (WebGL2 Post-Processing)

`postfx.js` adds a 5-pass GPU pipeline on a 4th canvas (`fx-canvas`). When enabled, terrain+game canvases are hidden (`visibility: hidden`) and composited through WebGL shaders. Effects: bloom (half-res blur), vignette, per-map color grading, screen flash, shockwave distortion, chromatic aberration. All effects have timers decayed in `game.update(dt)`.

- `postfx.setTerrainDirty()` must be called after any terrain redraw (tower place/sell/upgrade) — this is done automatically in `renderer.drawTerrain()`
- `UNPACK_FLIP_Y_WEBGL` is set to `true` to prevent Y-inversion when uploading canvas textures
- Effect triggers: `flash(intensity, duration)`, `shockwave(nx, ny, intensity)`, `aberration(intensity, duration)`
- Per-map tints set in `game.selectMap()`: Serpentine warm green, Split Creek cool blue, Gauntlet hot red
- **Point lighting:** Up to 32 dynamic lights computed in the composite pass (pass 1). Towers emit colored glow (scales with upgrade level), projectiles carry moving lights, hero has cyan aura, scorch zones glow orange-red. Per-map ambient darkness dims the scene (Serpentine 0.25, Creek 0.10, Gauntlet 0.35); lights restore/amplify brightness. Quartic attenuation `(1-t²)²` with aspect ratio correction. Flash lights (`addFlashLight`) decay over time for explosions, boss deaths, and hero abilities. All light methods bail with `if (!this.enabled) return` — zero cost when PostFX off. Light registration happens in `game.registerLights()` called before `postfx.render()` in `tick()`.

## Hero Unit (Wave 20+)

WASD-controlled hero spawns when `getEffectiveWave() >= 20` (unlockWave in HERO_STATS). Auto-attacks nearest enemy (15 dmg, 3.5 range, 2/s). Two abilities: Q = AoE stun (3-cell radius, 1.5s, 15s cooldown), E = gold magnet (2x kill gold in 4-cell radius, 8s duration, 20s cooldown). Takes contact damage from enemies (type-dependent multipliers). Dies at 0 HP, respawns after 5s. Managed by `hero.js`, updated after enemies/before towers in game loop.

## Dual Spawn Points (Wave 30+)

At `getEffectiveWave() >= DUAL_SPAWN_WAVE` (30), enemies spawn from two entry points. Each layout in `MAP_DEFS` has `secondaryWaypoints` entering from x=29 (right edge), converging at the same exit. `WaveManager` alternates spawns: odd-numbered enemies use the secondary path. Secondary paths are always carved in `GameMap` (so they appear on previews). Split Creek primary enemies still fork upper/lower; secondary enemies use a single right-side path.

## Ambient Map Effects

Per-environment animated particles drawn on the game canvas (ground layer, before scorch zones). Forest: falling leaves + fireflies. Desert: sand wisps + dust puffs. Lava: rising embers + bubbles. Pool capped at 40, spawned at ~6-7/sec. Fixed dt (1/60) — not affected by game speed. Pool cleared on `drawTerrain()`. Self-contained in `renderer.js` (`updateAmbients`, `spawnAmbient`, `drawAmbients`).

## Common Pitfalls

- Wave completion check needs `currentWave > 0` guard to avoid false triggers before the game starts
- All audio `play*` methods need null-check on `this.ctx` (context may not be initialized)
- `renderer.js` is the largest file (~2,000+ lines) — drawing logic for all entities lives here
- Hero WASD keys conflict with admin hotkeys (W=wave, D=download) when admin mode is active
- PostFX canvas textures need `UNPACK_FLIP_Y_WEBGL = true` or the image renders upside-down
- Screen flash in `renderer.js` is gated behind `!postfx.enabled` — the PostFX shader handles flash when active
- Knockback has a per-enemy limit of 2 (`enemy.knockbackCount`) — after 2 knockbacks, further knockback is ignored (bosses are always immune)
- `_nextWaveCache` in wave.js must be cleared before `startNextWave()` when jumping waves (e.g. `adminSetWave`)
- Tower icon cache (`towerIconsLg`) is pre-generated for ALL tower types on first `setupTowerPanel()` call — needed for unlock screen

## UI Features

- **Auto-wave toggle:** `game.autoWave` (default true), auto-starts next wave after 5s delay. Toggle badge in top bar next to speed control
- **Next-wave preview:** Between waves, `wave.getNextWavePreview()` returns enemy counts (cached via `_nextWaveCache` for stability); rendered on UI canvas with actual enemy shapes via `drawEnemyShape()`
- **Low lives warning:** When `economy.lives <= 5`, pulsing red border on game canvas + CSS animation on lives badge + alert sound on each life lost
- **Wave modifier badge:** Active modifier name shown inline in wave counter during the wave
- **Tower info card:** Shows all tower stats with upgrade preview arrows — damage, range, fire rate, burn, splash, slow %, freeze %, chain count, fork count, shock %, heavy round interval, armor shred %, crit %, knockback
- **Unlock screen:** HTML overlay shown when wave thresholds are crossed. Displays tower icons, stats, replacement info, hero/dual spawn extras. Pauses game until Continue is clicked. Hides top/bottom bars during display.
- **Game over screen:** Shows "Reached Wave X" + best record for the map
