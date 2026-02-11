# Tower Defense — Admin Guide

How to maintain, tune, and scale the game. All configuration lives in `js/constants.js` unless noted otherwise.

---

## Admin Mode

Press **`** (backtick) to toggle admin mode. When active, a sidebar panel appears to the right of the game canvas showing real-time stats, difficulty parameters, and a post-wave analysis report.

### Admin Hotkeys

| Key | Action | Confirmation |
|-----|--------|-------------|
| **K** | Kill all enemies on screen (with screen shake, flash, and explosion effects) | No |
| **W** | Set wave — prompts for a wave number, clears the field, and jumps to that wave | Yes (prompt) |
| **L** | Set level — prompts for a level number, full reset at that world level | Yes (prompt) |
| **C** | Clear the entire wave debug log from localStorage | Yes (confirm dialog) |
| **R** | Clear the high score record for the current map | Yes (confirm dialog) |
| **`** | Toggle admin mode on/off | No |

Note: **E** is a hidden cheat (kill all) that works without admin mode.

### Admin Panel Sections

The sidebar displays four sections:

1. **Actions** — Lists available admin hotkeys with labels
2. **Difficulty** — Current world, level, wave, and the HP multiplier breakdown: `worldHpMul × levelHpMul × waveHpScale = finalMul`
3. **Realtime** — Game elapsed time, wave elapsed time, current speed, and wave status (Spawning/Between/Fighting)
4. **Wave Report** — Post-wave analysis snapshot (see Wave Debug System below)

---

## Wave Debug System

The `WaveDebugger` class (`js/debug.js`) collects per-wave statistics during gameplay and produces post-wave analysis reports. Data persists in localStorage across sessions.

### How It Works

- **On wave start:** Snapshots starting gold, lives, tower count, and difficulty multipliers
- **During wave:** Tracks enemy spawns/kills/leaks, damage dealt, gold spent/earned, tower builds/sells/upgrades
- **On wave end:** Computes derived metrics and saves the report to localStorage

### Per-Wave Report Fields

| Field | Description |
|-------|-------------|
| `timestamp` | When the wave ended (ISO string) |
| `world` | Map name |
| `level` | World level |
| `wave` | Wave number |
| `worldHpMul` | World HP multiplier |
| `levelHpMul` | Level HP multiplier |
| `waveHpScale` | Wave HP scale factor |
| `finalHpMul` | Product of all three HP multipliers |
| `duration` | Wave duration in seconds |
| `spawned` / `killed` / `leaked` | Enemy counts |
| `livesLost` | Lives lost during the wave |
| `totalHP` | Sum of all enemy maxHP spawned |
| `dmgDealt` | Total damage dealt by towers |
| `overkill` | `dmgDealt / totalHP` (>1 = excess firepower) |
| `killRate` | `killed / spawned` (percentage) |
| `dpsActual` | Actual DPS (`dmgDealt / duration`) |
| `dpsTheory` | Theoretical DPS (sum of tower `damage / fireRate`) |
| `efficiency` | `dpsActual / dpsTheory` (how busy towers were) |
| `towers` | Tower count at wave end |
| `goldStart` / `goldEnd` | Gold before and after wave |
| `goldSpent` / `goldEarned` | Gold flow during wave |
| `difficulty` | Label: TRIVIAL / EASY / FAIR / HARD / BRUTAL |

### Difficulty Labels

| Label | Criteria |
|-------|----------|
| **BRUTAL** | 5+ lives lost OR kill rate < 60% |
| **HARD** | 2+ lives lost OR kill rate < 80% |
| **FAIR** | 1+ lives lost OR overkill < 1.0 |
| **EASY** | Overkill < 1.5 |
| **TRIVIAL** | Overkill >= 1.5 |

### Hook Points

The debugger is wired into the game via method calls:

| File | Method | Hook |
|------|--------|------|
| `wave.js` | `startNextWave()` | `game.debug.onWaveStart(game)` |
| `wave.js` | `onWaveComplete()` | `game.debug.onWaveEnd(game)` |
| `enemy.js` | `spawn()` | `game.debug.onEnemySpawn(enemy)` |
| `enemy.js` | `update()` | `game.debug.onEnemyKilled(e)` / `onEnemyLeaked(e)` |
| `projectile.js` | `onHit()` / `doSplash()` / `doChain()` | `game.debug.onDamageDealt(dealt)` |
| `tower.js` | `place()` / `sell()` / `upgradeTower()` | `game.debug.onTowerBuilt/Sold/Upgraded(amount)` |

### Persistence

- **Storage key:** `td_wave_debug_log_v2`
- **Behavior:** Append-only — new reports are added after each wave. The log is NOT cleared on restart or level-up (only per-wave counters reset).
- **Clear:** Press **C** in admin mode to wipe the entire log (with confirmation).
- **Legacy filter:** On load, records missing `timestamp`, `world`, or `level` fields are dropped.

---

## Difficulty System Overview

Enemy HP is the product of three independent multipliers:

```
Final HP = baseHP × getWaveHPScale(wave) × worldHpMultiplier × LEVEL_HP_MULTIPLIER^(level-1)
```

| Layer | Where | What it controls |
|-------|-------|------------------|
| **Wave** | `getWaveHPScale(wave)` + `WAVES[]` | Per-wave HP curve and enemy composition (global, same for all worlds) |
| **World** | `worldHpMultiplier` on each `MAP_DEFS` entry | Per-world HP scaling (lower = easier world) |
| **Level** | `LEVEL_HP_MULTIPLIER` (currently 1.4) | Per-level HP scaling (exponential, same for all worlds) |

---

## 1. Tuning a World

Each world is defined in `MAP_DEFS` at the top of `constants.js`.

```js
serpentine: {
    name: 'Serpentine Valley',
    worldHpMultiplier: 1.0,   // ← difficulty knob
    environment: 'forest',     // forest | desert | lava (affects visuals only)
    themeColor: '#27ae60',
    description: '...',
    layouts: [ ... ],
}
```

**Key fields:**

| Field | Purpose | Tuning notes |
|-------|---------|--------------|
| `worldHpMultiplier` | Scales ALL enemy HP for this world | Compensates for path length — shorter paths get lower values to keep difficulty balanced. Current: Serpentine 1.0, Split Creek 0.80, Gauntlet 0.65 |
| `environment` | Visual theme (`forest`/`desert`/`lava`) | No gameplay effect |
| `layouts` | Array of 3 path variants (cycled by level) | See "Map Layouts" below |

**When to adjust `worldHpMultiplier`:**
- If an entire world feels too easy/hard across all waves, this is the single knob to turn.
- Shorter paths need lower multipliers (enemies spend less time in tower range).
- Split-path maps need lower multipliers (towers must cover two branches).

---

## 2. Tuning Waves

### Wave Composition

The `WAVES` array (20 entries) defines enemy types, counts, and spawn timing per wave:

```js
// Wave format: array of spawn groups
[
    { type: 'grunt', count: 10, interval: 0.7, delay: 0 },
    { type: 'tank', count: 2, interval: 2.0, delay: 3 },
]
```

| Field | Meaning |
|-------|---------|
| `type` | Enemy type key: `grunt`, `runner`, `tank`, `healer`, `boss`, `swarm` |
| `count` | Number of enemies in this group |
| `interval` | Seconds between spawns within the group |
| `delay` | Seconds before this group starts spawning (relative to wave start) |

**Wave phases:**
- Waves 1-5: Introduction (simple enemy types)
- Waves 6-10: Variety (mixed types, first boss at wave 10)
- Waves 11-15: Escalation (larger numbers, combos)
- Waves 16-20: Endgame (multi-boss, everything mixed)
- Waves 21+: Procedurally generated (see `WaveManager.generateWave` in `wave.js`)

**How to make a wave harder:**
- Increase `count` — more enemies
- Decrease `interval` — enemies arrive faster (more clumping)
- Decrease `delay` — groups overlap more
- Add another spawn group (e.g. add a tank group to a swarm wave)
- Use tougher enemy types

**How to make a wave easier:**
- Opposite of the above
- Increase `delay` to give breathing room between groups

### Wave HP Curve

```js
export function getWaveHPScale(wave) {
    return wave * Math.pow(1.10, wave) * 0.9;
}
```

This exponential curve determines how much base HP is multiplied per wave number. Example values:

| Wave | HP Scale |
|------|----------|
| 1 | 0.99 |
| 5 | 7.2 |
| 10 | 23.4 |
| 15 | 56.2 |
| 20 | 121.5 |

**The exponent base (1.10) is the most impactful tuning knob in the game.** Changing it from 1.10 to 1.12 roughly doubles wave-20 difficulty. Handle with care.

---

## 3. Tuning Levels

```js
export const LEVEL_HP_MULTIPLIER = 1.4;
```

Each level multiplies enemy HP by this factor:
- Level 1: x1.0
- Level 2: x1.4
- Level 3: x1.96
- Level 4: x2.74

On level-up, the player gets:
- Lives reset to `STARTING_LIVES`
- Gold bonus: `25 + worldLevel x 15`
- A new map layout (cycles through 3 variants)

To make level progression gentler, reduce `LEVEL_HP_MULTIPLIER` (e.g. 1.3). To make it steeper, increase it (e.g. 1.5).

---

## 4. Enemy Types

Defined in `ENEMY_TYPES`. Each enemy has:

| Field | Meaning |
|-------|---------|
| `baseHP` | HP before scaling (multiplied by wave/world/level) |
| `speed` | Pixels per second |
| `reward` | Gold earned on kill (also multiplied by 1.10 in code) |
| `livesCost` | Lives lost if enemy reaches the castle |
| `armor` | Damage reduction (0.0-1.0). Tank has 0.30 = takes 30% less damage |
| `radius` | Visual size in pixels |
| `healRadius` / `healRate` | Healer-only: range (grid cells) and HP/sec to nearby allies |

**Current enemy roster:**

| Type | baseHP | Speed | Armor | Role |
|------|--------|-------|-------|------|
| Grunt | 30 | 60 | 0 | Baseline |
| Runner | 15 | 110 | 0 | Fast, fragile |
| Tank | 120 | 35 | 0.30 | Slow, tanky |
| Healer | 50 | 55 | 0 | Heals nearby allies |
| Boss | 400 | 22 | 0.20 | High HP, slow |
| Swarm | 8 | 90 | 0 | Cheap, fast, overwhelming in numbers |

**Adding a new enemy type:**
1. Add entry to `ENEMY_TYPES` with all fields
2. Add it to spawn groups in `WAVES[]`
3. Optionally add to `generateWave()` types array in `wave.js` (for waves 21+)
4. Optionally add special rendering in `renderer.js`

---

## 5. Tower Types

Defined in `TOWER_TYPES`. Each tower has 3 upgrade levels (0-indexed):

```js
arrow: {
    name: 'Arrow',
    cost: 50,
    unlockWave: undefined,   // available from wave 1
    levels: [
        { damage: 12, range: 3.5, fireRate: 0.4, projSpeed: 300 },
        { damage: 18, range: 4.0, fireRate: 0.33, projSpeed: 340, upgradeCost: 35 },
        { damage: 28, range: 4.5, fireRate: 0.25, projSpeed: 380, upgradeCost: 70 },
    ],
}
```

| Field | Meaning |
|-------|---------|
| `cost` | Gold to place |
| `unlockWave` | Wave number when tower becomes available (undefined = always) |
| `damage` | Damage per hit |
| `range` | Range in grid cells |
| `fireRate` | Seconds between shots (lower = faster) |
| `projSpeed` | Projectile speed in px/sec |
| `upgradeCost` | Gold to upgrade to this level |

**Current unlock schedule:**

| Tower | Unlock |
|-------|--------|
| Arrow | Wave 1 |
| Frost | Wave 1 |
| Lightning | Wave 1 |
| Cannon | Wave 2 |
| Sniper | Wave 5 |

**Special tower mechanics:**

| Tower | Special fields | Behavior |
|-------|---------------|----------|
| Frost | `slowFactor`, `slowDuration` | Slows enemies (factor 0.3 = 70% slow) |
| Lightning | `chainCount`, `chainRange`, `chainDecay` | Hits bounce to nearby enemies |
| Cannon | `splashRadius` | AoE damage in grid cells |
| Sniper | `critChance`, `critMulti` | Random crit hits for bonus damage |

**DPS calculation:**
- Basic: `damage / fireRate`
- Cannon effective: `(damage / fireRate) x avg_targets_in_splash`
- Sniper effective: `(damage / fireRate) x (1 + critChance x (critMulti - 1))`

**Adding a new tower type:**
1. Add entry to `TOWER_TYPES` with `levels` array
2. Add key mapping in `input.js` -> `TOWER_KEYS` (e.g. `'6': 'newTower'`)
3. Add rendering in `renderer.js` -> turret draw method + base drawing
4. Add sound in `audio.js` -> `playShoot()` method
5. If special projectile behavior, update `projectile.js`
6. Tower hover tooltip auto-generates from `TOWER_TYPES` data (no manual update needed)

---

## 6. Economy

```js
export const STARTING_GOLD = 200;
export const STARTING_LIVES = 20;
export const SELL_REFUND = 0.6;       // 60% of total invested
export const INTEREST_RATE = 0.02;    // 2% of gold between waves
export const WAVE_BONUS_BASE = 25;    // base gold per wave clear
export const WAVE_BONUS_PER = 10;     // additional per wave number
```

**Income per wave clear:** `WAVE_BONUS_BASE + currentWave x WAVE_BONUS_PER + floor(gold x INTEREST_RATE)`

**Kill income:** `enemy.reward x 1.10` (hardcoded 10% bonus in `enemy.js`)

**Tuning tips:**
- `STARTING_GOLD` controls early-game tower options (200 = 1 cannon or 1 sniper, 2 arrows + 1 frost, etc.)
- `INTEREST_RATE` rewards banking gold — higher values incentivize delaying purchases
- `SELL_REFUND` at 0.6 means repositioning costs 40% — lower values punish mistakes more

---

## 7. Map Layouts

Each world has 3 layout variants, cycled by level: `layouts[(worldLevel - 1) % 3]`.

A layout contains:

```js
{
    waypoints: [{ x, y }, ...],  // Grid coordinates for the path
    blocked: [{ x, y }, ...],    // Cells where towers can't be placed (obstacles)
    paths: null,                  // null for single-path maps
}
```

**For split-path maps (like Split Creek):**

```js
{
    waypoints: [{ x, y }, ...],  // Prefix path (before the fork)
    paths: {
        upper: [{ x, y }, ...],  // Upper branch waypoints
        lower: [{ x, y }, ...],  // Lower branch waypoints
        suffix: [{ x, y }, ...], // After branches merge
    },
    blocked: [...],
}
```

**Rules for waypoints:**
- Consecutive waypoints MUST be axis-aligned (same x or same y) — no diagonals
- The prefix endpoint must cleanly fork — don't add extra waypoints that cause enemies to reverse direction
- Enemies follow waypoints in order via straight-line movement
- Grid is 30x20 (0-29 x, 0-19 y)
- Entry point should be at x=0 (left edge), exit at x=29 (right edge)

**Adding a new layout variant:**
1. Add a new object to the world's `layouts` array
2. Design waypoints on the 30x20 grid
3. Add blocked cells for visual obstacles
4. Test that enemies follow the path correctly (no reversals)

---

## 8. Adding a New World

1. Add entry to `MAP_DEFS` in `constants.js`:
   ```js
   newworld: {
       name: 'My World',
       themeColor: '#hex',
       worldHpMultiplier: 0.85,
       environment: 'forest',  // or create a new one
       description: '...',
       layouts: [ /* 3 layout variants */ ],
   }
   ```
2. If using a new `environment`, add terrain drawing methods in `map.js`:
   - `drawNewEnvCell()` — ground tile
   - `drawNewEnvPathCell()` — path tile
   - `drawNewEnvObstacle()` — blocked cell decoration
   - Update `drawTerrain()` dispatch logic
3. Map selection is built dynamically from `MAP_DEFS` — no HTML changes needed
4. Add any new CSS for the theme color
5. Set `worldHpMultiplier` based on path length (shorter path = lower multiplier)

---

## 9. Procedural Waves (21+)

After wave 20, waves are generated by `WaveManager.generateWave()` in `wave.js`:

```js
generateWave(waveNum) {
    const types = ['grunt', 'runner', 'tank', 'healer', 'swarm'];
    const groupCount = 2 + Math.floor(waveNum / 5);
    // count per group: 5 + waveNum x 0.8 + random 0-5
    // interval: max(0.15, 0.8 - waveNum x 0.01)
    // Boss every 5 waves: count = floor(waveNum / 10) + 1
}
```

These waves use the same HP scaling system. To tune endless mode, adjust the formulas in this method.

---

## 10. Keyboard Shortcuts

Defined in `input.js`:

### Player Shortcuts

| Key | Action |
|-----|--------|
| 1-5 | Select tower type (arrow, frost, lightning, cannon, sniper) |
| Space | Start game / toggle pause |
| Escape | Cancel selection |
| N | Send next wave early (between waves only) |
| U | Upgrade selected tower |
| S | Sell selected tower |
| T | Cycle target mode (First/Closest/Strongest/Weakest) |
| +/- | Speed up/down (1x-3x) |

### Admin Shortcuts (requires admin mode)

| Key | Action |
|-----|--------|
| ` | Toggle admin mode |
| K | Kill all enemies on screen |
| W | Set wave (prompt) |
| L | Set level (prompt) |
| C | Clear wave debug log (confirm) |
| R | Clear map record (confirm) |

### Hidden

| Key | Action |
|-----|--------|
| E | Kill all enemies (works without admin mode) |

To add a new shortcut, add a case in `InputHandler.onKeyDown()`.

---

## 11. Persistence

Uses `localStorage` with `td_` prefix:

| Key | Purpose |
|-----|---------|
| `td_high_score_{mapId}` | Best score per world |
| `td_world_level_{mapId}` | Highest level reached per world |
| `td_wave_debug_log_v2` | Append-only wave analysis log (JSON array) |
| `td_v3_clean` | Version flag — set to force-clear old data on first load |

**To reset all player progress:** Bump the version check in `economy.js`:
```js
if (!localStorage.getItem('td_v4_clean')) {
    // clears all td_ keys
}
```

**To clear just the debug log:** Press **C** in admin mode, or call `game.debug.clearLog()` from the console.

**To clear a map's record:** Press **R** in admin mode while playing that map.

---

## 12. UI Architecture

### Three-Layer Canvas
- **Terrain** (z-index 1): Static ground, path, tower bases. Redrawn only when towers are placed/sold.
- **Game** (z-index 2): Enemies, turrets, projectiles, particles. Redrawn every frame at 60fps.
- **UI** (z-index 3): Hover highlights, range circles, selection boxes, wave number overlay.

### Admin Panel
- HTML sidebar (`#admin-panel`) outside the canvas, to the right.
- Visibility toggled via `.visible` class.
- Content updated every frame via `renderer.updateAdminPanel()`.

### Tower Hover Tooltips
- Pre-rendered tower preview images (canvas -> dataURL) created once during setup.
- Tooltip card shows on `mouseenter` of tower buttons with preview, stats, and special ability.
- Positioned with `position: fixed` above the hovered button.

### Visual Effects
- **Screen shake:** `game.triggerShake(intensity, duration)` — random offset applied during `drawFrame`.
- **Screen flash:** `game.screenFlash` — white overlay with alpha fade, rendered after particles.
- **Particle explosions:** Object-pooled system (500 max) for enemy deaths and Kill All.

---

## 13. Quick Reference — Common Tuning Tasks

| Goal | What to change |
|------|----------------|
| Make a specific wave harder/easier | Edit that wave's entry in `WAVES[]` |
| Make an entire world harder/easier | Adjust `worldHpMultiplier` on that map def |
| Make all late-game harder/easier | Change the exponent in `getWaveHPScale()` |
| Make level progression steeper/gentler | Adjust `LEVEL_HP_MULTIPLIER` |
| Give players more/less starting resources | Change `STARTING_GOLD` / `STARTING_LIVES` |
| Buff/nerf a tower | Edit its `levels` array in `TOWER_TYPES` |
| Buff/nerf an enemy type | Edit its stats in `ENEMY_TYPES` |
| Change tower unlock timing | Set `unlockWave` in `TOWER_TYPES` |
| Add a new map layout | Add object to the world's `layouts` array |
| Reset player data after rebalance | Bump the version in `economy.js` |
| Analyze difficulty | Enable admin mode, review wave reports |
