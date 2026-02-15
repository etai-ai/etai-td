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

**Five-layer canvas system:** terrain (static ground, z:0), three (3D WebGL, z:0.5), game (60fps entities, z:1), fx (WebGL2 post-processing, z:2), ui (hover/range overlay, z:3). When PostFX is enabled, terrain+game are composited through WebGL shaders into fx-canvas with bloom, vignette, and dynamic effects. When WebGL2 is unavailable, fx-canvas is hidden and the game falls back to Canvas 2D only. When 3D mode is enabled, three-canvas renders terrain+meshes via Three.js and PostFX composites the tilted 3D scene.

**Fixed timestep game loop** in `game.js`: 60Hz physics decoupled from rendering. Accumulator pattern with speed multiplier (1.1x/2.1x/3.1x — note: `SPEED_MULTIPLIERS` are 1.1/2.1/3.1, not 1/2/3). Update order: screen effects → waves → enemies → hero → towers → projectiles → particles → scorchZones → wave completion check.

**Module graph:** `main.js` bootstraps `Game` (game.js), which instantiates all managers. Each manager class owns its entity array. `constants.js` is the single source of truth for all tuning data — tower stats, enemy stats, wave definitions, map layouts. `utils.js` has only pure helpers. `postfx.js` owns the WebGL2 pipeline (shaders, FBOs, effect state). `renderer3d.js` loaded dynamically via `import()` to avoid breaking the game if Three.js CDN is unavailable.

**State machine:** MENU → PLAYING → PAUSED / GAME_OVER. No level-up transitions — each world is a single endless run. Unlock screens pause the game (STATE.PAUSED) with `_unlockScreenActive = true` flag to block manual pause toggle.

## Key Conventions

- All game balance tuning lives in `constants.js` — never scatter magic numbers
- Entity managers use backwards iteration when splicing arrays (enemy deaths, projectile removal)
- Particle system is object-pooled (500 max) to avoid GC pressure
- Audio is procedural via Web Audio API — no audio files. Context must init on user interaction
- Grid coordinates are `gx, gy`; world pixel coordinates are `x, y`. Grid is 30×20 cells, 56px each
- localStorage keys use `td_` prefix: `td_wave_record`, `td_high_score`, `td_wave_debug_log_v2`
- String-keyed Maps/Sets use `"x,y"` format for grid lookups (towerGrid, pathCells) — not optimal for perf, but consistent
- Enemy IDs are auto-incremented globally (`nextEnemyId`) and never reset — used for chain lightning hit tracking

## Progression System

Every world is an **endless wave-based survival run**. No levels — you play until you die.

- **Wave-based unlocks:** Towers, hero, and dual spawn unlock at wave thresholds mid-run via `WAVE_UNLOCKS` in constants.js
- `getEffectiveWave() = max(currentWave, MAP_DEFS[mapId].startingUnlocks)` determines what's available
- **HP scaling:** `getWaveHPScale(wave + startingWaveHP) * mapHpMultiplier * hpModifier` where `getWaveHPScale(w) = w * 1.10^w`. Advanced maps add `startingWaveHP` (Split Creek: +5, Gauntlet: +10) to inflate enemy HP beyond their actual wave number, balancing the fact that you start with late-game towers pre-unlocked.
- Waves 1-5: hand-crafted intro waves. Wave 6+: procedural via `generateWave()`
- **Special wave events:** Goldrush every 10 waves (2x kill gold). Boss every 5 waves (waves 5-20), replaced by Megaboss every 2 waves starting wave 25 (25, 27, 29...). Megaboss count scales: 1→2→2→3→4→5→5→6+
- **Starting gold:** 300g (STARTING_GOLD constant). Advanced maps override: Split Creek & Gauntlet start with 1000g
- **Auto-wave:** Enabled by default (`game.autoWave`), auto-starts next wave after 5s. Early-send bonus: max +30g, decays by 5g/sec waited
- Wave record saved per map in `td_wave_record` localStorage key (JSON object `{mapId: wave}`)

### Wave Unlock Thresholds (`WAVE_UNLOCKS`)

| Wave | Unlock | Replaces |
|------|--------|----------|
| 1 | Arrow, Frost, Lightning | — |
| 2 | Cannon | — |
| 5 | Sniper | — |
| 10 | Fire Arrow, Deep Frost | Arrow, Frost (auto-upgraded) |
| 14 | Hero (WASD unit) | — |
| 15 | Dual Spawn + Flying enemies (start wave 17, scale 1→20 over 13 waves) | — |
| 20 | Missile Sniper | Sniper (auto-upgraded) |
| 25 | Super Lightning, Bi-Cannon | Lightning, Cannon (auto-upgraded) |
| 30 | Pulse Cannon | — |

When a threshold is crossed, `onWaveThreshold()` in game.js:
1. Collects all unlocks in a batch
2. Auto-upgrades placed towers to their replacements
3. Pauses the game and shows the unlock screen (HTML overlay)
4. Player clicks Continue to resume

### World Unlock & Starting Bonuses

| World | Required Record | Starting Unlocks | Starting Gold | HP Inflation | Effect |
|-------|----------------|-----------------|---------------|--------------|--------|
| Serpentine | Always open | 0 | 300g | +0 waves | Full progression from wave 1 |
| Split Creek | Wave 30 on any map | 30 | 1000g | +5 waves | Wave 1-30 towers unlocked, enemies HP scaled as wave 6-35 |
| Gauntlet | Wave 40 on any map | 50 | 1000g | +10 waves | Wave 1-50 towers unlocked, enemies HP scaled as wave 11-60 |

Advanced maps use `startingWaveHP` to inflate enemy HP, preventing trivial difficulty when starting with late-game towers. Maps with `startingUnlocks > 0` pre-populate `_triggeredThresholds` so those unlocks aren't announced again.

## Damage Mechanics

### Burn (Fire Arrow)
Burn damage bypasses armor entirely — applied directly to HP in `enemy.update()`, not through `takeDamage()`. Stronger burns overwrite weaker ones on reapply via `Math.max()` comparison. This is the primary counter to high-armor enemies. When burn kills an enemy, it triggers the standard death animation and rewards by setting `deathTimer = 0`.

### Scorch Zones (Bi-Cannon Heavy Rounds)
Heavy rounds from Bi-Cannon create persistent ground AoE zones (orange glow). Damage bypasses armor like burn. Zones stored in `game.scorchZones[]` array, updated in `game.updateScorchZones(dt)`. Visual rendered as glowing circles on game canvas. Duration 2-3s, DPS 6-14 depending on tower level.

### Armor Shred (Bi-Cannon Heavy Rounds)
Stacking debuff (max 3 stacks). Each stack reduces enemy armor by `shredAmount` (10%-15%). Only shreds with amount ≥ current shred amount add stacks — weaker shreds are ignored. Applied via `enemy.applyArmorShred(amount, duration)`. Formula: `armor = baseArmor - shredAmount * stacks` (max 3 stacks).

### Knockback (Pulse Cannon)
Pushes enemies backward along their path by N grid cells. Bosses/megabosses immune, tanks 50% resistance. **Per-tower immunity:** Each pulse cannon can only knockback a given enemy once — tracked via `enemy.knockbackSources` Set containing tower IDs. Multiple pulse cannons can each knockback the same enemy once. Implemented by walking backward through `enemy.path` waypoints and adjusting `waypointIndex` + `progress`.

## Admin/Debug Mode

Press backtick (`` ` ``) to toggle the admin panel with real-time DPS/efficiency stats and post-wave analysis. Hotkeys: `K` kill all, `W` set wave, `G` add 1000 gold, `D` download CSV analytics. See `ADMIN_GUIDE.md` for full reference.

## PostFX (WebGL2 Post-Processing)

`postfx.js` adds a 5-pass GPU pipeline on a 4th canvas (`fx-canvas`). When enabled, terrain+game canvases are hidden (`visibility: hidden`) and composited through WebGL shaders. Effects: bloom (half-res blur), vignette, per-map color grading, screen flash, shockwave distortion, chromatic aberration. All effects have timers decayed in `game.update(dt)`.

- `postfx.setTerrainDirty()` must be called after any terrain redraw (tower place/sell/upgrade) — this is done automatically in `renderer.drawTerrain()`
- `UNPACK_FLIP_Y_WEBGL` is set to `true` to prevent Y-inversion when uploading canvas textures
- Effect triggers: `flash(intensity, duration)`, `shockwave(nx, ny, intensity)`, `aberration(intensity, duration)`
- Per-map tints set in `game.selectMap()`: Serpentine warm green, Split Creek cool blue, Gauntlet hot red
- **Point lighting:** Up to 32 dynamic lights computed in the composite pass (pass 1). Towers emit colored glow (scales with upgrade level), projectiles carry moving lights, hero has cyan aura, scorch zones glow orange-red. Per-map ambient darkness dims the scene (Serpentine 0.25, Creek 0.10, Gauntlet 0.35); lights restore/amplify brightness. Quartic attenuation `(1-t²)²` with aspect ratio correction. Flash lights (`addFlashLight`) decay over time for explosions, boss deaths, and hero abilities. All light methods bail with `if (!this.enabled) return` — zero cost when PostFX off. Light registration happens in `game.registerLights()` called before `postfx.render()` in `tick()`.

## Hero Unit (Wave 14+)

WASD-controlled hero spawns when `getEffectiveWave() >= 14` (unlockWave in HERO_STATS). Auto-attacks nearest enemy (15 dmg, 3.5 range, 2/s). Three abilities: Q = AoE stun (3-cell radius, 1.5s, 15s cooldown), E = gold magnet (2x kill gold in 4-cell radius, 8s duration, 20s cooldown), Z = execute (instant-kill nearest boss/megaboss within 15-cell range, 2min cooldown). Takes contact damage from enemies (type-dependent multipliers). Dies at 0 HP, respawns after 5s. Managed by `hero.js`, updated after enemies/before towers in game loop.

### Execute Ability (Z key)
- Instantly kills the nearest boss or megaboss (not flying) within 15 grid cells
- 0.8s animation: 0-0.6s charge (hero grows 1x→3x, red/gold color), 0.6s strike, 0.6-0.8s shrink
- 120s (2 minute) cooldown — strategic decision
- **No target in range → "NO TARGET" text, cooldown NOT consumed** (can spam Z to check for targets)
- Target dies mid-animation → partial cooldown refund (30s), explosion at hero position
- Visual: hero scales up, red/gold pulsing glow rings, execute light in PostFX
- Strike effects: double explosion, shake(20), flash(0.5), shockwave(1.5), chromatic aberration(1.2), addFlashLight (both target and hero positions)
- Cooldown icon drawn as 3rd indicator (Z) below hero alongside Q and E
- Hero level scaling: 2% per wave above unlock wave (HP, damage) — `levelScale = 1 + (currentWave - 14) * 0.02`

## Flying Enemy (Per-Map Start Wave)

Flying enemies begin appearing at wave 17 by default (`FLYING_START_WAVE`), but advanced maps can override via `MAP_DEFS[mapId].flyingStartWave` (Split Creek: wave 7, Gauntlet: wave 2). They scale from 1 to 20 over 13 waves. They spawn at the castle (exit), fly a curvy sine-wave path backward to a random midpoint (30-50% of path via `landingIndex`), then land and walk normally to the exit. While airborne they are **untargetable** — towers, hero, splash, chain lightning, scorch zones, and knockback all skip them. After landing they become normal ground enemies.

- **Stats in `ENEMY_TYPES.flying`:** HP 10, speed 97, reward 10, radius 11, purple color
- Flight: 110 px/s, 2-3 sine oscillations with 60-100px amplitude, 40px altitude at midpoint
- Always uses primary path (ignores dual-spawn secondary roll)
- `enemy.flying` boolean gates all targeting/damage checks
- `enemy.flyProgress` (0→1) drives position along sine curve (base + perpendicular sine offset)
- Visual: wing shape (`drawWing()` in renderer.js), shadow at ground level while airborne
- **Wave count scaling:** `Math.min(20, 1 + Math.round((waveNum - flyStart) * 19 / 13))` — scales 1→20 flying enemies over 13 waves

## Dual Spawn Points (Wave 15+)

At `getEffectiveWave() >= DUAL_SPAWN_WAVE` (15), enemies can spawn from a second entry point. Each layout in `MAP_DEFS` has `secondaryWaypoints` entering from x=29 (right edge), converging at the same exit. Unlock triggers a full unlock screen (bold warning + Continue button). Secondary paths are always carved in `GameMap` (so they appear on previews). Split Creek primary enemies still fork upper/lower; secondary enemies use a single right-side path.

**Secondary spawn ramp schedule:**
- Wave 15: Build phase (0% secondary)
- Waves 16-17: Max 1 "wobbler" enemy (10% chance, type forced to wobbler)
- Waves 18-19: Max 2 wobblers (10% chance each)
- Wave 20: Max 3 wobblers (15% chance)
- Wave 21+: Percentage-based spawn: starts at 2% (`DUAL_SPAWN_START_PCT`), increases 1%/wave (`DUAL_SPAWN_RAMP_PCT`), caps at 20% (`DUAL_SPAWN_MAX_PCT`)
  - Formula: `Math.min(0.20, 0.02 + (wavesIntoDual - 6) * 0.01)` where `wavesIntoDual = effectiveWave - 15`
- Heavy enemies (tank/boss/megaboss) never spawn on secondary during wobbler waves (16-20)
- **Enemy count easing:** During dual spawn intro (waves 15-20), procedural wave generation reduces enemy count by 45%→100% via `dualEase` multiplier

### Secondary Reinforcement Bursts

When the wave spawn phase completes (`!this.spawning`) and all secondary-path enemies are killed but primary enemies remain, reinforcement bursts spawn from the secondary path to keep pressure up. After a 4-second delay, 3-5 random enemies (grunt/runner/swarm) spawn from secondary.

This continues every 4 seconds for the entire duration until all primary enemies die. In late waves where slow tanks/bosses take 2+ minutes to clear after fast secondary enemies are eliminated, this can result in many bursts to maintain pressure on both lanes.

Enemies are tagged with `isSecondary` on spawn for tracking. Logic lives in `WaveManager.update()` (`reinforceTimer`, `reinforceBursts`). Only active at effectiveWave >= 20 and after main wave spawning completes.

## Ambient Map Effects

Per-environment animated particles drawn on the game canvas (ground layer, before scorch zones). Forest: falling leaves + fireflies. Desert: sand wisps + dust puffs. Lava: rising embers + bubbles. Pool capped at 40, spawned at ~6-7/sec. Fixed dt (1/60) — not affected by game speed. Pool cleared on `drawTerrain()`. Self-contained in `renderer.js` (`updateAmbients`, `spawnAmbient`, `drawAmbients`).

## Common Pitfalls & Gotchas

- Wave completion check needs `currentWave > 0` guard to avoid false triggers before the game starts
- All audio `play*` methods need null-check on `this.ctx` (context may not be initialized)
- `renderer.js` is the largest file (~2,000+ lines) — drawing logic for all entities lives here
- Hero WASD keys conflict with admin hotkeys (W=wave, D=download) when admin mode is active
- PostFX canvas textures need `UNPACK_FLIP_Y_WEBGL = true` or the image renders upside-down
- Screen flash in `renderer.js` is gated behind `!postfx.enabled` — the PostFX shader handles flash when active
- Knockback is tracked per-tower (`enemy.knockbackSources` Set) — each pulse cannon can knockback an enemy once. Multiple pulse cannons each get one knockback per enemy. Bosses/megabosses always immune.
- Flying enemies (`e.flying`) must be skipped in ALL targeting/damage loops — `findTarget`, `getEnemiesInRange`, `doSplash`, `findChainTarget`, `doForkChain`, `updateScorchZones`, `checkContactDamage`. Check pattern: `if (!e.alive || e.flying) continue;`
- `_nextWaveCache` in wave.js must be cleared before `startNextWave()` when jumping waves (e.g. `adminSetWave`)
- Tower icon cache (`towerIconsLg`) is pre-generated for ALL tower types on first `setupTowerPanel()` call — needed for unlock screen
- Burn/scorch zone damage bypasses `takeDamage()` — directly modifies `enemy.hp`, so armor is ignored
- Projectile trails use circular buffer to avoid O(n) shift() — overwrites oldest position when full
- Healer logic throttled to 0.1s intervals instead of every frame — reduces checks by ~83% (6/sec vs 60/sec)
- Boss enrage triggers only when boss/megaboss is last living enemy AND spawning is complete. Increases speed +50%, reduces armor -30%, plays once per boss
- Wave modifiers (armored/swift/regen/horde) can stack with goldrush — both systems are independent
- Hero contact damage timer can drift due to accumulation: `contactTimer -= dt` then reset to 0.5s loses negative overflow

## UI Features

- **Auto-wave toggle:** `game.autoWave` (default true), auto-starts next wave after 5s delay. Toggle badge in top bar next to speed control
- **Next-wave preview:** Between waves, `wave.getNextWavePreview()` returns enemy counts (cached via `_nextWaveCache` for stability); rendered on UI canvas with actual enemy shapes via `drawEnemyShape()`. Cache ensures preview matches actual spawn even if RNG would differ.
- **Low lives warning:** When `economy.lives <= 5`, pulsing red border on game canvas + CSS animation on lives badge + alert sound on each life lost
- **Wave modifier badge:** Active modifier name shown inline in wave counter during the wave (armored/swift/regen/horde)
- **Tower info card:** Shows all tower stats with upgrade preview arrows — damage, range, fire rate, burn, splash, slow %, freeze %, chain count, fork count, shock %, heavy round interval, armor shred %, crit %, knockback. Displayed when hovering/clicking towers.
- **Unlock screen:** HTML overlay shown when wave thresholds are crossed. Displays tower icons, stats, replacement info, hero/dual spawn extras. Pauses game (STATE.PAUSED + `_unlockScreenActive = true`) until Continue is clicked. Hides top/bottom bars during display. When continued, `_beginWave()` is called if pending.
- **Game over screen:** Shows "Reached Wave X" + best record for the map. Wave record saved per-map in localStorage on both game over and mid-wave restart.
- **3D toggle button:** Top-right button toggles between 2D Canvas and Three.js 3D rendering (if available). Persisted in `localStorage.td_use3d`

## Enemy Types Reference

| Type | Base HP | Speed | Armor | Reward | Lives | Special |
|------|---------|-------|-------|--------|-------|---------|
| Grunt | 18 | 70 | 0% | 6g | 1 | Basic enemy |
| Runner | 6 | 125 | 0% | 5g | 1 | Fast, low HP |
| Tank | 75 | 40 | 27% | 14g | 2 | High armor, slow |
| Healer | 25 | 65 | 0% | 10g | 1 | Heals nearby allies 3 HP/s (1.5 cell radius) |
| Boss | 349 | 26 | 20% | 42g | 5 | Spawns every 5 waves (5-20) |
| Swarm | 5 | 105 | 0% | 4g | 1 | Tiny, fast |
| Wobbler | 8 | 29 | 0% | 3g | 1 | Secondary-path intro enemy (waves 16-20) |
| Flying | 10 | 97 | 0% | 10g | 1 | Untargetable while airborne (110 px/s flight), scales 1→20 count over 13 waves |
| Megaboss | 392 | 58 | 25% | 80g | 5 | Replaces boss at wave 25+ (every 2 waves) |

## Wave Modifiers (Wave 3+)

Starting at wave 3 (`MODIFIER_START_WAVE`), each wave has a 35% chance (`MODIFIER_CHANCE`) to roll a random modifier. Modifiers are announced with big floating text. Modifier can stack with goldrush (both systems are independent).

| Modifier | Effect | Color |
|----------|--------|-------|
| Armored | +20% armor (added to base) | Gray (#95a5a6) |
| Swift | +30% speed (multiplies base) | Orange (#e67e22) |
| Regen | 0.5% max HP regen per second | Green (#2ecc71) |
| Horde | +40% enemy count, -25% HP | Red (#e74c3c) |

Horde modifier applies to wave definition **after generation**, multiplying group counts by 1.4 and setting `this.hpModifier = 0.75` which is applied to HP scale.

## Map Environments

Three visual themes with different ground/path/obstacle rendering:

**Forest** (Serpentine):
- Grass cells with procedural blade patterns
- Dirt paths with speckle texture
- Obstacles: rocks (irregular polygons) / trees (layered canopy)
- Ambient: falling leaves + fireflies

**Desert** (Split Creek):
- Sandy tan ground (210,180,120 RGB + variance)
- Packed sandstone paths with cracks
- Obstacles: sandstone rocks / cacti with arms
- Ambient: sand wisps + dust puffs

**Lava** (Gauntlet):
- Molten orange/red ground with hot streaks
- Cooled basalt paths (dark gray) with glowing cracks
- Obstacles: obsidian rocks / lava vents (glowing tops)
- Ambient: rising embers + bubbles

Per-map lighting darkness: Serpentine 0.25, Split Creek 0.10, Gauntlet 0.35. All three use procedural `seedRand(gx, gy, i)` for deterministic decoration placement.

## Known Issues & Bugs

None currently identified. Previous issues have been resolved:
- ✅ Burn deaths now award gold/achievements (fixed)
- ✅ Armor shred stacking now works correctly (fixed)
- ✅ Healer O(n²) throttled to 0.1s intervals (fixed)
- ✅ Projectile trails use circular buffer (fixed)
- ✅ Knockback now per-tower, not global limit (fixed)
- ✅ Execute "NO TARGET" spam is intentional (strategic info gathering)
