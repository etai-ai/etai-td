# Etai's Tower Defence

Defend your base against 20 waves of enemies by building and upgrading towers along the path. Enemies follow the path from entry to exit — if they reach the end, you lose lives. Lose all 20 lives and it's game over.

## Maps

Each world offers a different strategic challenge. Enemy HP is adjusted per world to keep difficulty balanced — shorter paths have lower HP multipliers so no world is inherently harder than another.

| Map | Style | Description |
|-----|-------|-------------|
| **Serpentine Valley** | Long path | Winding path with 10+ turns. Lots of build space. Lightning towers shine at corners where the path doubles back. |
| **Split Creek** | Split path | Path forks into two branches midway. Enemies randomly take upper or lower route, forcing you to defend both sides. |
| **The Gauntlet** | Short path | Direct path with only 3 turns. Fewer tower slots — every placement counts. Concentrated killzones are essential. |

Each world has its own infinite level progression. Beat 20 waves to level up. Enemies get 1.4x HP per level.

## Towers

Hover over any tower button in the bottom bar to see a preview card with the tower image, stats, and special ability.

### Arrow ($50) — Available from wave 1

Your bread-and-butter tower. Fast fire rate, decent range, cheap to build and upgrade. Best for sustained single-target damage.

| Level | Damage | Range | Fire Rate | Upgrade Cost |
|-------|--------|-------|-----------|-------------|
| 1 | 12 | 3.5 | 2.5/s | — |
| 2 | 18 | 4.0 | 3.0/s | $35 |
| 3 | 28 | 4.5 | 4.0/s | $70 |

**Total investment:** $155 fully upgraded. Best DPS per gold in the game.

### Frost ($75) — Available from wave 1

Low damage but slows enemies, making them spend more time in range of your other towers. The most important support tower.

| Level | Damage | Range | Fire Rate | Slow | Duration | Upgrade Cost |
|-------|--------|-------|-----------|------|----------|-------------|
| 1 | 5 | 3.0 | 1.3/s | 50% | 2.0s | — |
| 2 | 8 | 3.5 | 1.4/s | 60% | 2.5s | $55 |
| 3 | 12 | 4.0 | 1.7/s | 70% | 3.0s | $100 |

**Total investment:** $230 fully upgraded. Place before your damage towers so enemies are slowed when they enter the killzone.

### Lightning ($125) — Available from wave 1

Hits one target then chains to nearby enemies. Great against groups that are spread along the path.

| Level | Damage | Range | Chains | Chain Range | Decay | Upgrade Cost |
|-------|--------|-------|--------|-------------|-------|-------------|
| 1 | 15 | 3.5 | 3 | 2.0 | 70% | — |
| 2 | 22 | 4.0 | 4 | 2.5 | 70% | $80 |
| 3 | 32 | 4.5 | 5 | 3.0 | 75% | $145 |

**Total investment:** $350 fully upgraded. Each chain hit deals 70% of the previous (e.g., 15 > 10.5 > 7.4). Best placed where the path doubles back so chains can reach enemies on parallel segments.

### Cannon ($100) — Unlocks at wave 2

Slow-firing but deals splash damage in an area. Essential against grouped enemies. Causes screen shake on impact.

| Level | Damage | Range | Fire Rate | Splash Radius | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-------------|
| 1 | 30 | 3.0 | 0.8/s | 1.2 | — |
| 2 | 50 | 3.5 | 1.0/s | 1.5 | $65 |
| 3 | 80 | 4.0 | 1.2/s | 1.8 | $125 |

**Total investment:** $290 fully upgraded. Splash damage falls off — 100% at center, 50% at edge.

### Sniper ($150) — Unlocks at wave 5

Extreme range, high single-target damage, slow fire rate. Has a chance to deal critical hits for massive damage. Shows a laser sight when targeting.

| Level | Damage | Range | Fire Rate | Crit Chance | Crit Multiplier | Upgrade Cost |
|-------|--------|-------|-----------|-------------|-----------------|-------------|
| 1 | 60 | 6.0 | 0.5/s | 10% | 2.5x | — |
| 2 | 90 | 7.0 | 0.6/s | 15% | 2.8x | $110 |
| 3 | 140 | 8.0 | 0.7/s | 20% | 3.0x | $180 |

**Total investment:** $440 fully upgraded. Best against bosses and tanks. At max level, crits hit for 420 damage. Place centrally — the huge range covers most of the map.

## Enemies

| Type | Shape | HP | Speed | Armor | Special | Lives Lost |
|------|-------|----|-------|-------|---------|-----------|
| **Grunt** | Pentagon | 30 | Medium | 0% | — | 1 |
| **Runner** | Diamond | 15 | Fast | 0% | — | 1 |
| **Tank** | Square | 120 | Slow | 30% | — | 2 |
| **Healer** | Cross | 50 | Medium | 0% | Heals nearby allies (3 HP/s) | 1 |
| **Boss** | Hexagon | 400 | Very slow | 20% | Screen shake on death | 5 |
| **Swarm** | Triangle | 8 | Fast | 0% | Comes in large numbers | 1 |

HP scales exponentially each wave. By wave 20, enemies have roughly 30x the HP of wave 1.

Armor reduces all incoming damage by its percentage (e.g., 30% armor means the enemy takes only 70% damage from every hit).

## Economy

- **Starting gold:** 200
- **Kill rewards:** Base reward + 10% bonus
- **Wave completion bonus:** 25 + (wave number x 10) gold
- **Interest:** 2% of your gold at end of each wave
- **Sell refund:** 60% of total invested gold (base cost + all upgrades)

**Tip:** Banking gold between waves earns interest. Sometimes it's better to save up for a key upgrade than to spend immediately.

## Targeting Modes

Click a placed tower (or press T) to cycle through targeting:

- **First** — Targets the enemy furthest along the path (default — usually the best choice)
- **Closest** — Targets the nearest enemy to the tower
- **Strongest** — Targets the enemy with the most HP
- **Weakest** — Targets the enemy with the least HP

Set frost towers to **First** so they slow the leading enemy. Set snipers to **Strongest** to focus bosses and tanks.

## Controls

| Key | Action |
|-----|--------|
| 1-5 | Select tower (Arrow, Frost, Lightning, Cannon, Sniper) |
| Click | Place tower / Select placed tower |
| Right-click / Esc | Cancel selection |
| U | Upgrade selected tower |
| S | Sell selected tower |
| T | Cycle targeting mode |
| Space | Pause / Resume |
| N | Send next wave early |
| Speed button | Click to cycle speed (1x / 2x / 3x) |
| +/- | Change game speed via keyboard |

## Strategy Guide

### Early Game (Waves 1-5)

Start with 2-3 Arrow towers at the first major corner. Arrows are the most gold-efficient tower and handle grunts and runners easily. Add a Frost tower before wave 3 when runners appear — their speed makes them dangerous without slowing. Save up so you can buy a Cannon as soon as it unlocks after wave 2. The Sniper unlocks at wave 5 — plan your gold to afford one when it becomes available.

### Mid Game (Waves 6-10)

Wave 6 is a swarm wave (22 fast enemies). Have at least one Cannon ready for splash damage, or a Lightning tower to chain through them. Wave 10 is your first boss — a Sniper set to Strongest targeting makes a big difference here. Start upgrading your key towers to level 2.

### Late Game (Waves 11-20)

Healers become a serious threat. Prioritize killing healers before they can sustain tanks and bosses. Set one tower to Weakest targeting to pick off healers (they have moderate HP). Wave 15 has 2 bosses — you need upgraded snipers and cannons by then. Wave 20 throws everything at you: 2 bosses, 4 tanks, 3 healers, and 25 swarm. Fully upgrade your core towers and make sure every path segment is covered.

### Tower Placement Tips

- **Corners are king.** Towers at path corners hit enemies on two segments, effectively doubling their value.
- **Frost before damage.** Place frost towers at the entrance to your killzone so enemies are slowed before they reach your damage dealers.
- **Don't spread thin.** A concentrated killzone of 4-5 towers beats 8 towers spread across the map.
- **Path coverage number.** When placing a tower, you'll see a yellow number showing how many path cells are in range. Aim for 8+.
- **Upgrade > new tower.** A level 3 Arrow outperforms two level 1 Arrows and costs less total. Prioritize upgrading towers at key positions.

### Map-Specific Tips

**Serpentine Valley:** The long winding path lets you build deep, layered defenses. Focus on 2-3 killzones at the tightest corners where the path doubles back. Lightning towers shine here because chains can jump between parallel path segments.

**Split Creek:** You must cover both branches. Place frost towers at the fork to slow enemies regardless of which path they take. Build symmetric defenses, or use long-range snipers placed centrally to cover both routes. The lower HP multiplier compensates for the split coverage requirement.

**The Gauntlet:** Fewer build spots means every tower placement matters. Find the longest straight segment and stack frost + cannon + arrows there. Upgrade aggressively rather than building wide. The reduced HP multiplier balances the shorter path length.
