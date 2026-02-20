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
| **G** | Add 1000 gold (with floating text indicator) | No |
| **C** | Clear the entire wave debug log from localStorage | Yes (confirm dialog) |
| **R** | Reset progress — clears wave records and high score | Yes (confirm dialog) |
| **D** | Download wave debug log as CSV file | No |
| **`** | Toggle admin mode on/off | No |

### Auto-Wave System

The game has an auto-wave toggle (default: on). When enabled, the next wave starts automatically after 5 seconds between waves. Players can toggle this via the "Auto" badge in the top bar. State is stored in `game.autoWave`. The timer runs in `wave.js update()` when `betweenWaves` is true.

### Admin Panel Sections

The sidebar displays four sections:

1. **Actions** — Lists available admin hotkeys with labels
2. **Difficulty** — Current world, wave, and the HP multiplier breakdown: `worldHpMul × waveHpScale = finalMul`
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
| `wave` | Wave number |
| `worldHpMul` | World HP multiplier |
| `waveHpScale` | Wave HP scale factor |
| `finalHpMul` | Product of HP multipliers |
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
- **Behavior:** Append-only — new reports are added after each wave. The log is NOT cleared on restart (only per-wave counters reset).
- **Clear:** Press **C** in admin mode to wipe the entire log (with confirmation).

---

## Difficulty System Overview

Enemy HP is the product of two independent multipliers:

```
Final HP = baseHP × getWaveHPScale(wave) × worldHpMultiplier
```

| Layer | Where | What it controls |
|-------|-------|------------------|
| **Wave** | `getWaveHPScale(wave)` + `WAVES[]` | Per-wave HP curve and enemy composition (global, same for all worlds) |
| **World** | `worldHpMultiplier` on each `MAP_DEFS` entry | Per-world HP scaling (lower = easier world) |

---

## 1. Tuning a World

Each world is defined in `MAP_DEFS` at the top of `constants.js`.

```js
serpentine: {
    name: 'Serpentine Valley',
    worldHpMultiplier: 1.0,   // ← difficulty knob
    environment: 'forest',     // forest | desert | lava (affects visuals only)
    themeColor: '#27ae60',
    startingUnlocks: 0,        // effective wave for tower visibility at start
    description: '...',
    layouts: [ ... ],
}
```

**Key fields:**

| Field | Purpose | Tuning notes |
|-------|---------|--------------|
| `worldHpMultiplier` | Scales ALL enemy HP for this world | Compensates for path length — shorter paths get lower values. Current: Serpentine 1.0, Split Creek 0.9, Gauntlet 0.9 |
| `startingUnlocks` | Effective wave for initial tower visibility | Higher = more towers available from wave 1 |
| `environment` | Visual theme (`forest`/`desert`/`lava`) | No gameplay effect |
| `layouts` | Array of path variants, randomly selected (3-5 per map) | See "Map Layouts" below |

---

## 2. Tuning Waves

### Wave Composition

The `WAVES` array (5 entries) defines intro waves 1-5:

```js
// Wave format: array of spawn groups
[
    { type: 'grunt', count: 10, interval: 0.7, delay: 0 },
    { type: 'tank', count: 2, interval: 2.0, delay: 3 },
]
```

Wave 6+ are procedurally generated via `WaveManager.generateWave()` in `wave.js`. Key generation constants (in `constants.js`):

- `WAVE_GEN.COUNT_PER_WAVE`: 0.45 (enemy count scaling per wave)
- `WAVE_GEN.GROUP_GAP_MIN`: 0.7 (minimum seconds between spawn groups)
- `WAVE_GEN.GROUP_GAP_RANDOM`: 1.0 (additional random gap range)

| Field | Meaning |
|-------|---------|
| `type` | Enemy type key: `grunt`, `runner`, `tank`, `healer`, `boss`, `swarm`, `flying`, `dragonflyer`, `megaboss`, `quantumboss`, `wobbler` |
| `count` | Number of enemies in this group |
| `interval` | Seconds between spawns within the group |
| `delay` | Seconds before this group starts spawning (relative to wave start) |

### Wave HP Curve

```js
export function getWaveHPScale(wave) {
    return wave * Math.pow(1.11, wave);
}
```

This exponential curve determines how much base HP is multiplied per wave number. Example values:

| Wave | HP Scale |
|------|----------|
| 1 | 1.11 |
| 5 | 8.4 |
| 10 | 28.3 |
| 20 | 161 |
| 50 | 3,295 |
| 80 | 69,640 |

**The exponent base (1.11) is the most impactful tuning knob in the game.**

### Wave Unlock Thresholds

Defined in `WAVE_UNLOCKS` in constants.js. When `getEffectiveWave()` crosses a threshold, `onWaveThreshold()` fires:
- Rebuilds the tower panel
- Auto-upgrades placed towers to replacements
- Shows unlock screen (pauses game)
- Hero and dual spawn activate at their respective thresholds

### Goldrush & Bosses

- **Goldrush:** Every `GOLDRUSH_INTERVAL` (10) waves, all kills give 2x gold
- **Bosses:** Every 5 waves (waves 5, 10, 15, 20)
- **Megaboss:** Every 2 waves from wave 25-31 (count: 1→1→2→3), replaces regular boss
- **Roy Boss:** Every wave from wave 32+ (count: `min(6, floor((wave-31) * 0.8))`), replaces megaboss, capped at 6
- **Dragon Flyer:** Every wave from wave 25+ (count: 1→8, +1 every 3 waves)

---

## 3. Enemy Types

Defined in `ENEMY_TYPES`. Each enemy has:

| Field | Meaning |
|-------|---------|
| `baseHP` | HP before scaling (multiplied by wave/world) |
| `speed` | Pixels per second |
| `reward` | Gold earned on kill (also multiplied by 1.10 in code) |
| `livesCost` | Lives lost if enemy reaches the exit |
| `armor` | Damage reduction (0.0-1.0). Tank has 0.27 = takes 27% less damage |
| `radius` | Visual size in pixels |
| `healRadius` / `healRate` | Healer-only: range (grid cells) and HP/sec to nearby allies |

**Current enemy roster:**

| Type | baseHP | Speed | Armor | Role |
|------|--------|-------|-------|------|
| Grunt | 18 | 70 | 0 | Baseline |
| Runner | 6 | 125 | 0 | Fast, fragile |
| Tank | 71 | 40 | 0.27 | Slow, tanky |
| Healer | 25 | 65 | 0 | Heals nearby allies |
| Boss | 332 | 26 | 0.20 | High HP, slow |
| Swarm | 5 | 105 | 0 | Cheap, fast, overwhelming in numbers |
| Flying | 10 | 97 | 0 | Airborne sortie, untargetable while flying |
| Dragon Flyer | 30 | 97 | 0 | Bigger flying enemy, wave 25+, 1→8 count |
| Wobbler | 8 | 29 | 0 | Secondary-path intro enemy |
| Megaboss | 392 | 58 | 0.25 | Waves 25-31 (every 2 waves), knockback immune |
| Roy Boss | 392 | 72 | 0.30 | Wave 32+, every wave, count capped at 6 |

---

## 4. Tower Types

Defined in `TOWER_TYPES`. Each tower has 3 upgrade levels (0-indexed):

```js
arrow: {
    name: 'Arrow',
    cost: 50,
    unlockWave: undefined,  // available from wave 1
    maxWave: 9,             // hidden after wave 9 (replaced by Fire Arrow)
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
| `maxWave` | Wave number after which tower is hidden (replaced by upgrade) |
| `damage` | Damage per hit |
| `range` | Range in grid cells |
| `fireRate` | Seconds between shots (lower = faster) |
| `projSpeed` | Projectile speed in px/sec |
| `upgradeCost` | Gold to upgrade to this level |

**Current unlock schedule:**

| Tower | Unlock | Cost | Hidden after |
|-------|--------|------|-------------|
| Arrow | Wave 1 | $50 | Wave 9 |
| Frost | Wave 1 | $75 | Wave 9 |
| Lightning | Wave 1 | $125 | Wave 24 |
| Cannon | Wave 2 | $100 | Wave 24 |
| Sniper | Wave 5 | $150 | Wave 19 |
| Fire Arrow | Wave 10 | $200 | — |
| Deep Frost | Wave 10 | $150 | — |
| Missile Sniper | Wave 20 | $300 | — |
| Super Lightning | Wave 25 | $250 | — |
| Bi-Cannon | Wave 25 | $200 | — |
| Ariel Tower | Wave 30 | $750 | — |

**Special tower mechanics:**

| Tower | Special fields | Behavior |
|-------|---------------|----------|
| Fire Arrow | `burnDamage`, `burnDuration` | Burns enemies (DoT that bypasses armor) |
| Frost | `slowFactor`, `slowDuration` | Slows enemies (factor 0.3 = 70% slow) |
| Deep Frost | `slowFactor`, `freezeChance`, `freezeDuration` | AoE aura pulse, no projectiles, chance to freeze |
| Lightning | `chainCount`, `chainRange`, `chainDecay` | Hits bounce to nearby enemies |
| Super Lightning | `forkCount`, `forkDepth`, `shockChance` | BFS forking chains, overcharge, shock stun |
| Cannon | `splashRadius` | AoE damage in grid cells |
| Bi-Cannon | `heavyEvery`, `shredPercent`, `scorchDPS` | Dual barrel, armor shred, scorch zones |
| Sniper | `critChance`, `critMulti` | Random crit hits for bonus damage |
| Missile Sniper | `splashRadius`, `critChance`, `critMulti` | Homing missiles, splash + crit |
| Ariel Tower | `splashRadius`, `heavyEvery`, `armorShred`, `scorchDPS` | Massive splash + heavy rounds with armor shred + scorch zones |

### Burn Mechanic (Fire Arrow)

The burn DoT is applied on hit and **bypasses armor entirely** — burn damage is subtracted directly from HP without going through `takeDamage()`. When a new burn is applied to an already-burning enemy, the stronger burn takes effect.

Current burn stats:
- Level 1: 3.15 DPS for 3.0s (9.45 total)
- Level 2: 6.3 DPS for 3.5s (22.05 total)
- Level 3: 9.45 DPS for 4.0s (37.8 total)

---

## 5. Hero Unit

The hero unit (`hero.js`) is a player-controlled character that spawns at Wave 14+ (`HERO_STATS.unlockWave`). Managed independently from towers. Stats scale with waves above unlock: `scale = 1 + wavesAbove * 0.02`.

**Stats (from `HERO_STATS` in `constants.js`):**

| Stat | Value |
|------|-------|
| HP | 200 |
| Speed | 150 px/s |
| Attack Damage | 15 |
| Attack Range | 3.5 cells |
| Attack Rate | 2/s (0.5s interval) |
| Projectile Speed | 350 px/s |

**Abilities:**

| Key | Ability | Cooldown | Effect |
|-----|---------|----------|--------|
| Q | AoE Stun | 15s | Shocks all enemies in 3-cell radius for 1.5s |
| E | Gold Magnet | 20s | 2x kill gold within 4-cell radius for 8s |
| Z | Execute | 120s | Instant-kill nearest boss/megaboss/Roy Boss within 15 cells. No target = no cooldown consumed. 0.8s animation with visual effects |

**Contact damage:** Enemies deal 10 base damage per 0.5s tick when overlapping the hero, multiplied by type (Boss 3x, Tank 2x, Runner 0.8x, Swarm 0.5x, Healer 0.6x).

**Death/Respawn:** Dies at 0 HP, respawns after 5s. Full HP restored.

**Controls:** WASD or arrow keys for movement. Note: WASD conflicts with admin hotkeys (W=wave, D=download) when admin mode is active.

---

## 6. Economy

```js
export const STARTING_GOLD = 300;
export const STARTING_LIVES = 20;
export const SELL_REFUND = 0.6;       // 60% of total invested
export const INTEREST_RATE = 0.01;    // 1% of gold between waves
export const WAVE_BONUS_BASE = 25;    // base gold per wave clear
export const WAVE_BONUS_PER = 6;      // additional per wave number
```

**Income per wave clear:** `WAVE_BONUS_BASE + currentWave × WAVE_BONUS_PER + floor(gold × INTEREST_RATE)`

**Kill income:** `enemy.reward × 1.10` (hardcoded 10% bonus in `enemy.js`)

**Starting gold:** Per-map via `startingGold` in MAP_DEFS (Serpentine 300g, Citadel 400g, Creek/Gauntlet 1000g).

---

## 7. Wave Modifiers

Starting from wave 3, each wave has a 35% chance of receiving a random modifier:

```js
export const WAVE_MODIFIERS = {
    armored: { armorBonus: 0.20 },
    swift:   { speedMulti: 1.30 },
    regen:   { regenPercent: 0.005 },
    horde:   { countMulti: 1.4, hpMulti: 0.75 },
};
```

| Constant | Value | Purpose |
|----------|-------|---------|
| `MODIFIER_START_WAVE` | 3 | First wave that can get a modifier |
| `MODIFIER_CHANCE` | 0.35 | Probability per wave |

---

## 8. Ambient Map Effects

Per-environment animated particles rendered on the game canvas as a ground layer. Purely visual.

| Environment | Effect 1 (70%) | Effect 2 (30%) |
|-------------|----------------|----------------|
| Forest | Falling leaves | Fireflies |
| Desert | Sand wisps | Dust puffs |
| Lava | Rising embers | Bubbles |
| Ruins | Dust motes | Spirit wisps |

---

## 9. Early-Send Bonus

Players earn bonus gold for sending the next wave early (pressing N between waves):

```js
export const EARLY_SEND_MAX_BONUS = 30;
export const EARLY_SEND_DECAY = 5;
```

**Formula:** `bonus = max(0, EARLY_SEND_MAX_BONUS - betweenWaveTimer × EARLY_SEND_DECAY)`

---

## 10. Map Layouts

Each world has 3-5 layout variants, randomly selected at game start (Serpentine has 5).

A layout contains:

```js
{
    waypoints: [{ x, y }, ...],           // Grid coordinates for the path
    blocked: [{ x, y }, ...],             // Cells where towers can't be placed
    paths: null,                           // null for single-path maps
    secondaryWaypoints: [{ x, y }, ...],  // Dual spawn path (wave 30+), enters from right edge
}
```

Secondary paths are always carved (visible on map previews), but enemies only use them when `getEffectiveWave() >= DUAL_SPAWN_WAVE` (15). Usage ramps gradually: ~8% at wave 16, increasing ~2% per wave, capping at 25%.

**Secondary reinforcement bursts:** When all secondary-path enemies are dead but primary enemies remain, 2-3 reinforcement enemies spawn from secondary after 4s. Up to 3 bursts per wave.

**Rules for waypoints:**
- Consecutive waypoints MUST be axis-aligned (same x or same y) — no diagonals
- Grid is 30x20 (0-29 x, 0-19 y)
- Primary entry at x=0 (left edge), exit at x=29 (right edge)
- Secondary entry from x=29 (right edge), converges at same exit

---

## 11. Persistence

Uses `safeStorage` wrapper (try/catch for incognito/restricted environments) with `td_` prefix:

| Key | Purpose |
|-----|---------|
| `td_wave_record` | Per-map best wave: `{ serpentine: 47, splitcreek: 35 }` |
| `td_high_score` | Global best score (single value) |
| `td_wave_debug_log_v2` | Append-only wave analysis log (JSON array) |
| `td_achievements` | Achievement stats and unlocked set |
| `td_use3d` | 3D mode toggle preference |
| `td_atmosphere` | Selected atmosphere preset |

---

## 12. Keyboard Shortcuts

### Player Shortcuts

| Key | Action |
|-----|--------|
| 1-6 | Select tower type (keys remap to visible towers at current wave) |
| Space / P | Start game / toggle pause |
| Escape | Cancel selection |
| N | Send next wave early (between waves only) |
| U | Upgrade selected tower |
| S | Sell selected tower (or move hero down if no tower selected) |
| T | Cycle target mode (First/Closest/Strongest/Weakest) |
| +/- | Speed up/down (1x-3x) |
| WASD / Arrows | Move hero unit (wave 14+) |
| Q | Hero AoE stun (wave 14+) |
| E | Hero gold magnet (wave 14+) |
| Z | Hero execute (instant-kill boss, wave 14+) |

### Admin Shortcuts (requires admin mode)

| Key | Action |
|-----|--------|
| ` | Toggle admin mode |
| K | Kill all enemies on screen |
| W | Set wave (prompt) |
| G | Add 1000 gold |
| C | Clear wave debug log (confirm) |
| R | Reset progress (confirm) |
| D | Download wave debug log as CSV |

---

## 13. Quick Reference — Common Tuning Tasks

| Goal | What to change |
|------|----------------|
| Make a specific intro wave harder/easier | Edit that wave's entry in `WAVES[]` |
| Make an entire world harder/easier | Adjust `worldHpMultiplier` on that map def |
| Make all late-game harder/easier | Change the exponent in `getWaveHPScale()` |
| Give players more/less starting resources | Change `STARTING_GOLD` / `STARTING_LIVES` |
| Buff/nerf a tower | Edit its `levels` array in `TOWER_TYPES` |
| Buff/nerf an enemy type | Edit its stats in `ENEMY_TYPES` |
| Change tower unlock timing | Set `unlockWave` / `maxWave` in `TOWER_TYPES` |
| Change map unlock order | Edit `WORLD_ORDER` array in `constants.js` |
| Change when towers appear/hide | Adjust wave thresholds in `WAVE_UNLOCKS` |
| Reset player data after rebalance | Clear `td_*` keys from localStorage |
| Analyze difficulty | Enable admin mode, review wave reports |
| Adjust wave modifier frequency | Change `MODIFIER_CHANCE` (0-1) |
| Adjust early-send bonus | Change `EARLY_SEND_MAX_BONUS` / `EARLY_SEND_DECAY` |
