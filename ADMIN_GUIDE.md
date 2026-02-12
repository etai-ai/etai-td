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
| **L** | Set level — prompts for a level number, full reset at that player level | Yes (prompt) |
| **C** | Clear the entire wave debug log from localStorage | Yes (confirm dialog) |
| **R** | Reset progress — clears record, player level, and restarts at level 1 | Yes (confirm dialog) |
| **D** | Download wave debug log as CSV file | No |
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
| `level` | Player level |
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
| **Level** | `LEVEL_HP_MULTIPLIER` (currently 1.1) | Per-level HP scaling (exponential, same for all worlds) |

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
| `worldHpMultiplier` | Scales ALL enemy HP for this world | Compensates for path length — shorter paths get lower values to keep difficulty balanced. Current: Serpentine 1.0, Split Creek 0.60, Gauntlet 0.65 |
| `requiredLevel` | Minimum player level to unlock this map | Serpentine: none (always open), Split Creek: 5, Gauntlet: 10 |
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
- Waves 1-5: Introduction (runners at wave 2, tanks at wave 4, healers at wave 5)
- Waves 6-10: Variety (all types in play, first boss at wave 10)
- Waves 11-15: Escalation (complex combos, multi-boss at wave 15)
- Waves 16-20: Endgame (bosses in waves 17-20, tighter spawns, fewer but stronger)
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
    return wave * Math.pow(1.10, wave);
}
```

This exponential curve determines how much base HP is multiplied per wave number. Example values:

| Wave | HP Scale |
|------|----------|
| 1 | 1.10 |
| 5 | 8.05 |
| 10 | 25.9 |
| 15 | 62.7 |
| 20 | 134.5 |

**The exponent base (1.10) is the most impactful tuning knob in the game.** Changing it from 1.10 to 1.12 roughly increases wave-20 difficulty by 50%. Handle with care.

---

## 3. Tuning Levels

### Player Level System

Player level is a single global value that persists across all maps and sessions. It's stored in `localStorage` as `td_player_level`.

```js
export const LEVEL_HP_MULTIPLIER = 1.1;
```

Each level multiplies enemy HP by this factor:
- Level 1: x1.0
- Level 2: x1.1
- Level 3: x1.21
- Level 4: x1.33
- Level 5: x1.46

**Level progression:** Beat 20 waves on any map to level up. The player level is shared — leveling up on Serpentine counts toward unlocking Split Creek and The Gauntlet.

**Map unlock requirements** (set via `requiredLevel` in `MAP_DEFS`):
- Serpentine Valley: always open (no `requiredLevel`)
- Split Creek: Level 5
- The Gauntlet: Level 10

On level-up, the player gets:
- Lives reset to `STARTING_LIVES`
- Gold set to `100 + level × 200` (L1=300, L2=500, L3=700...) — gold does NOT carry over
- A new map layout (cycles through 3 variants)

To make level progression steeper, increase `LEVEL_HP_MULTIPLIER` (e.g. 1.2). To make it gentler, reduce it (e.g. 1.05).

---

## 4. Enemy Types

Defined in `ENEMY_TYPES`. Each enemy has:

| Field | Meaning |
|-------|---------|
| `baseHP` | HP before scaling (multiplied by wave/world/level) |
| `speed` | Pixels per second |
| `reward` | Gold earned on kill (also multiplied by 1.10 in code) |
| `livesCost` | Lives lost if enemy reaches the castle |
| `armor` | Damage reduction (0.0-1.0). Tank has 0.27 = takes 27% less damage |
| `radius` | Visual size in pixels |
| `healRadius` / `healRate` | Healer-only: range (grid cells) and HP/sec to nearby allies |

**Current enemy roster:**

| Type | baseHP | Speed | Armor | Role |
|------|--------|-------|-------|------|
| Grunt | 30 | 70 | 0 | Baseline |
| Runner | 15 | 125 | 0 | Fast, fragile |
| Tank | 100 | 40 | 0.27 | Slow, tanky |
| Healer | 50 | 65 | 0 | Heals nearby allies |
| Boss | 400 | 26 | 0.20 | High HP, slow |
| Swarm | 8 | 105 | 0 | Cheap, fast, overwhelming in numbers |

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
| `unlockLevel` | Player level required to unlock (undefined = always) |
| `damage` | Damage per hit |
| `range` | Range in grid cells |
| `fireRate` | Seconds between shots (lower = faster) |
| `projSpeed` | Projectile speed in px/sec |
| `upgradeCost` | Gold to upgrade to this level |

**Current unlock schedule:**

| Tower | Key | Unlock | Cost |
|-------|-----|--------|------|
| Arrow | 1 | Wave 1 | $50 |
| Fire Arrow | 2 | Level 2 | $200 |
| Frost | 3 | Wave 1 | $75 |
| Lightning | 4 | Wave 1 | $125 |
| Cannon | 5 | Wave 2 | $100 |
| Sniper | 6 | Wave 5 | $150 |

**Special tower mechanics:**

| Tower | Special fields | Behavior |
|-------|---------------|----------|
| Fire Arrow | `burnDamage`, `burnDuration` | Burns enemies (DoT that bypasses armor) |
| Frost | `slowFactor`, `slowDuration` | Slows enemies (factor 0.3 = 70% slow) |
| Lightning | `chainCount`, `chainRange`, `chainDecay` | Hits bounce to nearby enemies |
| Cannon | `splashRadius` | AoE damage in grid cells |
| Sniper | `critChance`, `critMulti` | Random crit hits for bonus damage |

### Burn Mechanic (Fire Arrow)

The burn DoT is applied on hit and **bypasses armor entirely** — burn damage is subtracted directly from HP without going through `takeDamage()`. When a new burn is applied to an already-burning enemy, the stronger burn (higher DPS or longer duration) takes effect.

Current burn stats:
- Level 1: 3 DPS for 3.0s (9 total)
- Level 2: 5 DPS for 3.5s (17.5 total)
- Level 3: 8 DPS for 4.0s (32 total)

**DPS calculation:**
- Basic: `damage / fireRate`
- Fire Arrow effective: `(damage / fireRate) + burnDamage` (burn runs in parallel)
- Cannon effective: `(damage / fireRate) x avg_targets_in_splash`
- Sniper effective: `(damage / fireRate) x (1 + critChance x (critMulti - 1))`

**Adding a new tower type:**
1. Add entry to `TOWER_TYPES` with `levels` array
2. Add key mapping in `input.js` -> `TOWER_KEYS` (e.g. `'7': 'newTower'`)
3. Add rendering in `renderer.js` -> turret draw method + base drawing
4. Add sound in `audio.js` -> `playShoot()` method
5. If special projectile behavior, update `projectile.js`
6. If `unlockLevel` is set, `ui.js` and `input.js` handle gating automatically
7. Tower hover tooltip auto-generates from `TOWER_TYPES` data (no manual update needed)

---

## 6. Economy

```js
export const STARTING_GOLD = 300;
export const STARTING_LIVES = 20;
export const SELL_REFUND = 0.6;       // 60% of total invested
export const INTEREST_RATE = 0.02;    // 2% of gold between waves
export const WAVE_BONUS_BASE = 25;    // base gold per wave clear
export const WAVE_BONUS_PER = 8;      // additional per wave number
```

**Income per wave clear:** `WAVE_BONUS_BASE + currentWave x WAVE_BONUS_PER + floor(gold x INTEREST_RATE)`

**Kill income:** `enemy.reward x 1.10` (hardcoded 10% bonus in `enemy.js`)

**Level-up gold:** `100 + level × 200` (gold resets to this on level-up, lives reset to 20)

**Tuning tips:**
- `STARTING_GOLD` controls Level 1 starting gold (300 = 2 arrows + 1 cannon, etc.). On level-up, gold is set via `levelUpReset()` formula instead
- `INTEREST_RATE` rewards banking gold — higher values incentivize delaying purchases
- `SELL_REFUND` at 0.6 means repositioning costs 40% — lower values punish mistakes more

---

## 7. Wave Modifiers

Starting from wave 3, each wave has a 35% chance of receiving a random modifier that buffs all enemies in that wave. Defined in `WAVE_MODIFIERS` in `constants.js`:

```js
export const WAVE_MODIFIERS = {
    armored: { armorBonus: 0.20 },   // +20% armor to all enemies
    swift:   { speedMulti: 1.30 },   // +30% movement speed
    regen:   { regenPercent: 0.005 }, // 0.5% of maxHP per second
    horde:   { countMulti: 1.4, hpMulti: 0.75 }, // 40% more enemies, 25% less HP
};
```

| Constant | Value | Purpose |
|----------|-------|---------|
| `MODIFIER_START_WAVE` | 3 | First wave that can get a modifier |
| `MODIFIER_CHANCE` | 0.35 | Probability per wave |

**Modifier behavior:**
- **Armored**: Adds flat armor bonus (capped at 0.75 total). Applied at spawn via `enemy.applyModifier()`.
- **Swift**: Multiplies both `speed` and `baseSpeed`. Applied at spawn.
- **Regen**: Sets `enemy.regenRate = maxHP * regenPercent`. HP regen runs every frame in `enemy.update()`.
- **Horde**: Modifies spawn groups (ceil of count × 1.4) and multiplies hpScale by 0.75. Applied in `wave.js startNextWave()`.

**Tuning tips:**
- To disable modifiers entirely, set `MODIFIER_CHANCE = 0`
- To make modifiers more frequent, increase `MODIFIER_CHANCE` (up to 1.0)
- To adjust when modifiers start, change `MODIFIER_START_WAVE`
- The modifier glow ring on enemies uses dashed circles (armored=gray, swift=orange, regen=green)
- Horde has no per-enemy visual (enemies just look normal, there are more of them)

---

## 8. Early-Send Bonus

Players earn bonus gold for sending the next wave early (pressing N between waves). Defined in `constants.js`:

```js
export const EARLY_SEND_MAX_BONUS = 50;  // max gold for immediate send
export const EARLY_SEND_DECAY = 5;       // gold lost per second of waiting
```

**Formula:** `bonus = max(0, EARLY_SEND_MAX_BONUS - betweenWaveTimer × EARLY_SEND_DECAY)`

At default values: 50g for instant send, 40g after 2 seconds, 0g after 10 seconds. The bonus amount is shown on the Next Wave button with a live countdown.

**Implementation:** The `betweenWaveTimer` increments in `wave.js update()` when `betweenWaves` is true. The bonus is calculated and applied at the start of `startNextWave()`.

---

## 9. Map Layouts


Each world has 3 layout variants, cycled by level: `layouts[(level - 1) % 3]`.

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

## 10. Adding a New World

1. Add entry to `MAP_DEFS` in `constants.js`:
   ```js
   newworld: {
       name: 'My World',
       themeColor: '#hex',
       worldHpMultiplier: 0.85,
       requiredLevel: 15,       // player level needed to unlock
       environment: 'forest',   // or create a new one
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
6. Set `requiredLevel` to gate access behind player progression

---

## 11. Procedural Waves (21+)

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

## 12. Keyboard Shortcuts

Defined in `input.js`:

### Player Shortcuts

| Key | Action |
|-----|--------|
| 1-6 | Select tower type (Arrow, Fire Arrow, Frost, Lightning, Cannon, Sniper) |
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
| R | Reset progress — clear record, player level, restart at level 1 (confirm) |
| D | Download wave debug log as CSV |

### Hidden

| Key | Action |
|-----|--------|
| E | Kill all enemies (works without admin mode) |

To add a new shortcut, add a case in `InputHandler.onKeyDown()`.

---

## 13. Persistence

Uses `localStorage` with `td_` prefix:

| Key | Purpose |
|-----|---------|
| `td_player_level` | Global player level (highest reached) |
| `td_high_score` | Global best score (single value, not per-map) |
| `td_wave_debug_log_v2` | Append-only wave analysis log (JSON array) |
| `td_v4_clean` | Version flag — set to force-clear old data on first load |

**Player level** is a single global value. `Economy.setPlayerLevel(level)` only writes if the new level is higher than the stored value (ratchet — never goes down).

**To reset all player progress:** Bump the version check in `economy.js`:
```js
if (!localStorage.getItem('td_v5_clean')) {
    // clears all td_ keys
}
```

**To clear just the debug log:** Press **C** in admin mode, or call `game.debug.clearLog()` from the console.

**To clear a map's record:** Press **R** in admin mode while playing that map.

---

## 14. UI Architecture

### Four-Layer Canvas
- **Terrain** (z-index 0): Static ground, path, tower bases. Redrawn only when towers are placed/sold.
- **Game** (z-index 1): Enemies, turrets, projectiles, particles. Redrawn every frame at 60fps.
- **FX** (z-index 2): WebGL2 post-processing. Composites terrain+game with bloom, vignette, color grading, and dynamic effects (shockwave, flash, chromatic aberration). Hidden if WebGL2 unavailable.
- **UI** (z-index 3): Hover highlights, range circles, selection boxes, wave number overlay.

### Menu Screen
- Shows player level at the top
- Map cards built dynamically from `MAP_DEFS`
- Locked maps show padlock overlay on preview and "Reach Level X to unlock" description
- Locked maps have `cursor: not-allowed` but are not dimmed

### Admin Panel
- HTML sidebar (`#admin-panel`) outside the canvas, to the right.
- Visibility toggled via `.visible` class.
- Content updated every frame via `renderer.updateAdminPanel()`.

### Tower Hover Tooltips
- Pre-rendered tower preview images (canvas -> dataURL) created once during setup.
- Tooltip card shows on `mouseenter` of tower buttons with preview, stats, and special ability.
- Fire Arrow tooltip shows burn DPS and duration.
- Positioned with `position: fixed` above the hovered button.

### Visual Effects
- **Screen shake:** `game.triggerShake(intensity, duration)` — random offset applied during `drawFrame`.
- **Screen flash:** `game.postfx.flash(intensity, duration)` — GPU white overlay via shader. Falls back to Canvas 2D `game.screenFlash` if WebGL2 unavailable.
- **Bloom:** GPU bright-pass + Gaussian blur at half resolution. Bright explosions and muzzle flashes glow softly.
- **Vignette:** Subtle edge darkening applied in the final shader pass.
- **Color grading:** Per-map tint — Serpentine warm green `(0.95, 1.0, 0.9)`, Split Creek cool blue `(0.9, 0.95, 1.05)`, Gauntlet hot red `(1.05, 0.95, 0.9)`.
- **Shockwave distortion:** `game.postfx.shockwave(nx, ny, intensity)` — radial ripple on splash explosions and boss deaths.
- **Chromatic aberration:** `game.postfx.aberration(intensity, duration)` — brief RGB split on crit hits.
- **Particle explosions:** Object-pooled system (500 max) for enemy deaths and Kill All.
- **Burn visual:** Orange glow ring + flickering flame particles on burning enemies.
- **Fire Arrow ambient:** Flickering ember glow + orbiting embers on placed fire arrow towers.

---

## 15. Quick Reference — Common Tuning Tasks

| Goal | What to change |
|------|----------------|
| Make a specific wave harder/easier | Edit that wave's entry in `WAVES[]` |
| Make an entire world harder/easier | Adjust `worldHpMultiplier` on that map def |
| Make all late-game harder/easier | Change the exponent in `getWaveHPScale()` |
| Make level progression steeper/gentler | Adjust `LEVEL_HP_MULTIPLIER` |
| Give players more/less starting resources | Change `STARTING_GOLD` / `STARTING_LIVES` |
| Buff/nerf a tower | Edit its `levels` array in `TOWER_TYPES` |
| Buff/nerf an enemy type | Edit its stats in `ENEMY_TYPES` |
| Change tower unlock timing | Set `unlockWave` or `unlockLevel` in `TOWER_TYPES` |
| Change map unlock requirements | Set `requiredLevel` in `MAP_DEFS` |
| Add a new map layout | Add object to the world's `layouts` array |
| Reset player data after rebalance | Bump the version in `economy.js` |
| Analyze difficulty | Enable admin mode, review wave reports |
| Adjust wave modifier frequency | Change `MODIFIER_CHANCE` (0-1) |
| Disable wave modifiers | Set `MODIFIER_CHANCE = 0` |
| Adjust early-send bonus | Change `EARLY_SEND_MAX_BONUS` / `EARLY_SEND_DECAY` |
| Make enemies faster/slower globally | Adjust `speed` in `ENEMY_TYPES` |
