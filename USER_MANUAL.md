# Etai's Tower Defence

Defend your base against 20 waves of enemies by building and upgrading towers along the path. Enemies follow the path from entry to exit — if they reach the end, you lose lives. Lose all 20 lives and it's game over.

## Player Level

You have a global player level that persists across all games. Beat 20 waves on any map to level up. Your level unlocks new maps and towers:

| Level | Unlocks |
|-------|---------|
| 1 | Serpentine Valley (always available) |
| 2 | Fire Arrow tower |
| 5 | Split Creek map |
| 10 | The Gauntlet map |

Enemies get 1.1x HP per level, so higher levels are progressively harder.

## Maps

Each world offers a different strategic challenge. Enemy HP is adjusted per world to keep difficulty balanced — shorter paths have lower HP multipliers so no world is inherently harder than another.

| Map | Style | HP Multiplier | Required Level | Description |
|-----|-------|---------------|----------------|-------------|
| **Serpentine Valley** | Long path | 1.0x | 1 | Winding path with 10+ turns. Lots of build space. Lightning towers shine at corners where the path doubles back. |
| **Split Creek** | Split path | 0.60x | 5 | Path forks into two branches midway. Enemies randomly take upper or lower route, forcing you to defend both sides. |
| **The Gauntlet** | Short path | 0.65x | 10 | Direct path with only 3 turns. Fewer tower slots — every placement counts. Concentrated killzones are essential. |

Each map has 3 layout variants that cycle as you level up.

## Towers

Hover over any tower button in the bottom bar to see a preview card with the tower image, stats, and special ability.

### Arrow ($50) — Key 1 — Available from wave 1

Your bread-and-butter tower. Fast fire rate, decent range, cheap to build and upgrade. Best for sustained single-target damage.

| Level | Damage | Range | Fire Rate | Upgrade Cost |
|-------|--------|-------|-----------|-------------|
| 1 | 12 | 3.5 | 2.5/s | — |
| 2 | 18 | 4.0 | 3.0/s | $35 |
| 3 | 28 | 4.5 | 4.0/s | $70 |

**Total investment:** $155 fully upgraded. Best DPS per gold in the game.

### Fire Arrow ($200) — Key 2 — Unlocks at Level 2

Premium arrow tower that sets enemies on fire. High damage with a burn damage-over-time effect that bypasses armor entirely. Devastating against armored targets.

| Level | Damage | Range | Fire Rate | Burn DPS | Burn Duration | Upgrade Cost |
|-------|--------|-------|-----------|----------|---------------|-------------|
| 1 | 20 | 3.5 | 3.3/s | 3/s | 3.0s | — |
| 2 | 31 | 4.0 | 4.0/s | 5/s | 3.5s | $120 |
| 3 | 45 | 4.5 | 5.0/s | 8/s | 4.0s | $200 |

**Total investment:** $520 fully upgraded. Burn damage ignores armor — strong against tanks and bosses. If a stronger burn is applied while burning, the enemy takes the stronger one.

### Frost ($75) — Key 3 — Available from wave 1

Low damage but slows enemies, making them spend more time in range of your other towers. The most important support tower.

| Level | Damage | Range | Fire Rate | Slow | Duration | Upgrade Cost |
|-------|--------|-------|-----------|------|----------|-------------|
| 1 | 5 | 3.0 | 1.3/s | 50% | 2.0s | — |
| 2 | 8 | 3.5 | 1.4/s | 60% | 2.5s | $55 |
| 3 | 12 | 4.0 | 1.7/s | 70% | 3.0s | $100 |

**Total investment:** $230 fully upgraded. Place before your damage towers so enemies are slowed when they enter the killzone.

### Lightning ($125) — Key 4 — Available from wave 1

Hits one target then chains to nearby enemies. Great against groups that are spread along the path.

| Level | Damage | Range | Chains | Chain Range | Decay | Upgrade Cost |
|-------|--------|-------|--------|-------------|-------|-------------|
| 1 | 15 | 3.5 | 3 | 2.0 | 70% | — |
| 2 | 22 | 4.0 | 4 | 2.5 | 70% | $80 |
| 3 | 32 | 4.5 | 5 | 3.0 | 75% | $145 |

**Total investment:** $350 fully upgraded. Each chain hit deals 70% of the previous (e.g., 15 > 10.5 > 7.4). Best placed where the path doubles back so chains can reach enemies on parallel segments.

### Cannon ($100) — Key 5 — Unlocks at wave 2

Slow-firing but deals splash damage in an area. Essential against grouped enemies. Causes screen shake on impact.

| Level | Damage | Range | Fire Rate | Splash Radius | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-------------|
| 1 | 30 | 3.0 | 0.8/s | 1.2 | — |
| 2 | 50 | 3.5 | 1.0/s | 1.5 | $65 |
| 3 | 80 | 4.0 | 1.2/s | 1.8 | $125 |

**Total investment:** $290 fully upgraded. Splash damage falls off — 100% at center, 50% at edge.

### Sniper ($150) — Key 6 — Unlocks at wave 5

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
| **Grunt** | Pentagon | 30 | Medium (70) | 0% | — | 1 |
| **Runner** | Diamond | 15 | Fast (125) | 0% | — | 1 |
| **Tank** | Square | 100 | Slow (40) | 27% | — | 2 |
| **Healer** | Cross | 50 | Medium (65) | 0% | Heals nearby allies (3 HP/s) | 1 |
| **Boss** | Hexagon | 400 | Very slow (26) | 20% | Screen shake on death | 5 |
| **Swarm** | Triangle | 8 | Fast (105) | 0% | Comes in large numbers | 1 |

HP scales exponentially each wave. By wave 20, enemies have roughly 134x the HP of wave 1.

Armor reduces all incoming damage by its percentage (e.g., 27% armor means the enemy takes only 73% damage from every hit). **Note:** Fire Arrow burn damage bypasses armor entirely.

## Wave Modifiers

Starting from wave 3, some waves get a random modifier that buffs all enemies in that wave. The modifier badge appears next to the wave counter in the top bar.

| Modifier | Effect | Color |
|----------|--------|-------|
| **Armored** | All enemies gain +20% armor | Gray |
| **Swift** | All enemies move 30% faster | Orange |
| **Regen** | Enemies slowly regenerate HP (0.5%/s) | Green |
| **Horde** | 40% more enemies spawn, but with 25% less HP | Red |

Modifiers are random — about 35% of waves from wave 3 onward will have one. Plan your defenses to handle any modifier.

## Early-Send Bonus

When a wave ends, pressing N to send the next wave early earns bonus gold. The bonus starts at 50g and decays by 5g per second of waiting. Send immediately for maximum gold, or wait and build first if you need to prepare. The bonus amount is shown on the Next Wave button.

## Economy

- **Starting gold:** 100 + (level x 200) per level (L1=300, L2=500, L3=700...)
- **Kill rewards:** Base reward + 10% bonus
- **Wave completion bonus:** 25 + (wave number x 8) gold
- **Interest:** 2% of your gold at end of each wave
- **Sell refund:** 60% of total invested gold (base cost + all upgrades)
- **Early-send bonus:** Up to 50g for sending the next wave immediately (decays 5g/s)

**Tip:** Banking gold between waves earns interest, but sending the next wave early gives up to 50g bonus. Balance these two strategies based on whether you need time to build or can handle the pressure.

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
| 1-6 | Select tower (Arrow, Fire Arrow, Frost, Lightning, Cannon, Sniper) |
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

Start with 2-3 Arrow towers at the first major corner. Runners appear at wave 2 and tanks at wave 4, so build a Frost tower early. Your first healer shows up at wave 5 alongside tanks — prioritize killing healers before they sustain the tanks. The Cannon unlocks after wave 2 and the Sniper at wave 5.

### Mid Game (Waves 6-10)

Wave 6 is a swarm wave (20 fast enemies). Have at least one Cannon or Lightning ready. Wave 9 is a mixed assault with grunts, tanks, healers, and runners — your defenses need to handle all types. Wave 10 is your first boss with tank escorts — a Sniper set to Strongest targeting makes a big difference. Watch for wave modifiers — an Armored or Swift modifier on a tough wave can catch you off guard.

### Late Game (Waves 11-20)

Bosses appear more frequently from wave 15 onward, including waves 17, 18, and 19. Healers escort tanks and bosses making them hard to bring down — set a tower to Weakest targeting to pick off healers quickly. Wave 20 has 2 bosses with tanks, healers, and a swarm finale. Use the early-send bonus aggressively to bank extra gold for upgrades.

### Fire Arrow Strategy

The Fire Arrow (unlocked at Level 2) costs 200g — a significant investment. Its burn DoT bypasses armor, making it the best counter against tanks (27% armor) and bosses (20% armor). At Level 3, the 8 DPS burn for 4 seconds adds 32 free damage per hit on top of the 45 direct damage. Prioritize it against armored waves. Pair with Frost to maximize burn uptime while enemies are slowed.

### Tower Placement Tips

- **Corners are king.** Towers at path corners hit enemies on two segments, effectively doubling their value.
- **Frost before damage.** Place frost towers at the entrance to your killzone so enemies are slowed before they reach your damage dealers.
- **Don't spread thin.** A concentrated killzone of 4-5 towers beats 8 towers spread across the map.
- **Path coverage number.** When placing a tower, you'll see a yellow number showing how many path cells are in range. Aim for 8+.
- **Upgrade > new tower.** A level 3 Arrow outperforms two level 1 Arrows and costs less total. Prioritize upgrading towers at key positions.

### Map-Specific Tips

**Serpentine Valley:** The long winding path lets you build deep, layered defenses. Focus on 2-3 killzones at the tightest corners where the path doubles back. Lightning towers shine here because chains can jump between parallel path segments.

**Split Creek:** You must cover both branches. Place frost towers at the fork to slow enemies regardless of which path they take. Build symmetric defenses, or use long-range snipers placed centrally to cover both routes. The lower HP multiplier (0.60x) compensates for the split coverage requirement.

**The Gauntlet:** Fewer build spots means every tower placement matters. Find the longest straight segment and stack frost + cannon + arrows there. Upgrade aggressively rather than building wide. The reduced HP multiplier (0.65x) balances the shorter path length.
