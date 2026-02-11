# Etai's Tower Defence

Defend your base against 20 waves of enemies by building and upgrading towers along the path. Enemies follow the path from entry to exit — if they reach the end, you lose lives. Lose all 20 lives and it's game over.

## Player Level

You have a global player level that persists across all games. Beat 20 waves on any map to level up. Your level unlocks new maps and towers:

| Level | Unlocks |
|-------|---------|
| 1 | Serpentine Valley, Arrow, Frost, Lightning, Cannon (W2), Sniper (W5) |
| 2 | Fire Arrow + Deep Frost (replace Arrow + Frost) |
| 4 | Super Lightning + Bi-Cannon |
| 5 | Missile Sniper (2x2), Split Creek map |
| 10 | The Gauntlet map |

Enemies get 1.1x HP per level, so higher levels are progressively harder. Your tower panel updates automatically as you unlock new towers — Arrow and Frost are replaced by Fire Arrow and Deep Frost at Level 2.

## Maps

Each world offers a different strategic challenge. Enemy HP is adjusted per world to keep difficulty balanced — shorter paths have lower HP multipliers so no world is inherently harder than another.

| Map | Style | HP Multiplier | Required Level | Description |
|-----|-------|---------------|----------------|-------------|
| **Serpentine Valley** | Long path | 1.0x | 1 | Winding path with 10+ turns. Lots of build space. Lightning towers shine at corners where the path doubles back. |
| **Split Creek** | Split path | 0.60x | 5 | Path forks into two branches midway. Enemies randomly take upper or lower route, forcing you to defend both sides. |
| **The Gauntlet** | Short path | 0.65x | 10 | Direct path with only 3 turns. Fewer tower slots — every placement counts. Concentrated killzones are essential. |

Each map has 3 layout variants that cycle as you level up.

## Towers

Hover over any tower button in the bottom bar to see a preview card with the tower image, stats, and special ability. The tower panel is dynamic — it shows only the towers available at your current level. Keys 1-5 always map to whichever towers are visible.

### Starter Towers (Level 1)

#### Arrow ($50) — Available from wave 1

Your bread-and-butter tower. Fast fire rate, decent range, cheap to build and upgrade. Best for sustained single-target damage. Replaced by Fire Arrow at Level 2.

| Level | Damage | Range | Fire Rate | Upgrade Cost |
|-------|--------|-------|-----------|-------------|
| 1 | 12 | 3.5 | 2.5/s | — |
| 2 | 18 | 4.0 | 3.0/s | $35 |
| 3 | 28 | 4.5 | 4.0/s | $70 |

**Total investment:** $155 fully upgraded. Best DPS per gold in the game.

#### Frost ($75) — Available from wave 1

Low damage but slows enemies, making them spend more time in range of your other towers. The most important support tower. Replaced by Deep Frost at Level 2.

| Level | Damage | Range | Fire Rate | Slow | Duration | Upgrade Cost |
|-------|--------|-------|-----------|------|----------|-------------|
| 1 | 5 | 3.0 | 1.3/s | 50% | 2.0s | — |
| 2 | 8 | 3.5 | 1.4/s | 60% | 2.5s | $55 |
| 3 | 12 | 4.0 | 1.7/s | 70% | 3.0s | $100 |

**Total investment:** $230 fully upgraded. Place before your damage towers so enemies are slowed when they enter the killzone.

#### Lightning ($125) — Available from wave 1

Hits one target then chains to nearby enemies. Great against groups that are spread along the path.

| Level | Damage | Range | Chains | Chain Range | Decay | Upgrade Cost |
|-------|--------|-------|--------|-------------|-------|-------------|
| 1 | 15 | 3.5 | 3 | 2.0 | 70% | — |
| 2 | 22 | 4.0 | 4 | 2.5 | 70% | $80 |
| 3 | 32 | 4.5 | 5 | 3.0 | 75% | $145 |

**Total investment:** $350 fully upgraded. Each chain hit deals 70% of the previous (e.g., 15 > 10.5 > 7.4). Best placed where the path doubles back so chains can reach enemies on parallel segments.

#### Cannon ($100) — Unlocks at wave 2

Slow-firing but deals splash damage in an area. Essential against grouped enemies. Causes screen shake on impact.

| Level | Damage | Range | Fire Rate | Splash Radius | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-------------|
| 1 | 30 | 3.0 | 0.8/s | 1.2 | — |
| 2 | 50 | 3.5 | 1.0/s | 1.5 | $65 |
| 3 | 80 | 4.0 | 1.2/s | 1.8 | $125 |

**Total investment:** $290 fully upgraded. Splash damage falls off — 100% at center, 50% at edge.

#### Sniper ($150) — Unlocks at wave 5

Extreme range, high single-target damage, slow fire rate. Has a chance to deal critical hits for massive damage. Shows a laser sight when targeting.

| Level | Damage | Range | Fire Rate | Crit Chance | Crit Multiplier | Upgrade Cost |
|-------|--------|-------|-----------|-------------|-----------------|-------------|
| 1 | 60 | 6.0 | 0.5/s | 10% | 2.5x | — |
| 2 | 90 | 7.0 | 0.6/s | 15% | 2.8x | $110 |
| 3 | 140 | 8.0 | 0.7/s | 20% | 3.0x | $180 |

**Total investment:** $440 fully upgraded. Best against bosses and tanks. At max level, crits hit for 420 damage. Place centrally — the huge range covers most of the map.

### Level 2 Unlocks

At Level 2, Arrow and Frost are replaced in the tower panel by these upgraded versions:

#### Fire Arrow ($200) — Replaces Arrow

Premium arrow tower that sets enemies on fire. High damage with a burn damage-over-time effect that bypasses armor entirely. Devastating against armored targets.

| Level | Damage | Range | Fire Rate | Burn DPS | Burn Duration | Upgrade Cost |
|-------|--------|-------|-----------|----------|---------------|-------------|
| 1 | 21 | 3.5 | 3.3/s | 3/s | 3.0s | — |
| 2 | 33 | 4.0 | 4.0/s | 5/s | 3.5s | $120 |
| 3 | 47 | 4.5 | 5.0/s | 8/s | 4.0s | $200 |

**Total investment:** $520 fully upgraded. Burn damage ignores armor — strong against tanks and bosses. If a stronger burn is applied while burning, the enemy takes the stronger one.

#### Deep Frost ($150) — Replaces Frost

An aura-based tower that pulses cold damage to ALL enemies in range simultaneously. No projectiles — it hits everything nearby. Has a chance to completely freeze enemies in place.

| Level | Damage | Range | Slow | Freeze Chance | Freeze Duration | Upgrade Cost |
|-------|--------|-------|------|---------------|-----------------|-------------|
| 1 | 5 | 3.0 | 60% | 5% | 0.8s | — |
| 2 | 8 | 3.5 | 50% | 8% | 1.0s | $100 |
| 3 | 12 | 4.0 | 40% | 12% | 1.2s | $175 |

**Total investment:** $425 fully upgraded. The aura pulse hits all enemies in range — no projectiles to miss. Frozen enemies stop completely (speed = 0). Place at chokepoints for maximum crowd control.

### Level 4 Unlocks

#### Super Lightning ($250)

An upgraded lightning tower with forking chain attacks. Hits branch out in a tree pattern, and has a chance to shock enemies (brief stun). Builds up overcharge for bonus damage.

| Level | Damage | Range | Forks | Fork Depth | Shock Chance | Upgrade Cost |
|-------|--------|-------|-------|------------|--------------|-------------|
| 1 | 18 | 4.0 | 4 | 2 | 15% | — |
| 2 | 28 | 4.5 | 6 | 2 | 20% | $150 |
| 3 | 42 | 5.0 | 8 | 3 | 25% | $250 |

**Total investment:** $650 fully upgraded. Forking chains spread damage across many enemies. Overcharge builds 10-12% bonus damage over time. Shock briefly stuns enemies (0.3-0.4s).

#### Bi-Cannon ($200)

A dual-barreled cannon that fires twice as fast as a regular cannon. Every 3-4 shots is a heavy round that shreds enemy armor. Leaves scorch zones on the ground that damage enemies walking through.

| Level | Damage | Range | Fire Rate | Armor Shred | Scorch DPS | Upgrade Cost |
|-------|--------|-------|-----------|-------------|------------|-------------|
| 1 | 35 | 3.5 | 1.7/s | 10% for 3s | 5/s for 2s | — |
| 2 | 55 | 4.0 | 2.0/s | 12% for 3.5s | 8/s for 2.5s | $120 |
| 3 | 85 | 4.5 | 2.5/s | 15% for 4s | 12/s for 3s | $200 |

**Total investment:** $520 fully upgraded. Armor shred reduces enemy armor temporarily — devastating when paired with other damage towers. Scorch zones bypass armor like burn damage.

### Level 5 Unlock

#### Missile Sniper ($325) — 2x2 Size

A massive emplacement that takes up 4 grid cells (2x2). Fires homing missiles that deal splash damage with a chance to crit. Combines the best of sniper range and cannon splash.

| Level | Damage | Range | Fire Rate | Splash Radius | Crit Chance | Crit Multi | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-------------|------------|-------------|
| 1 | 80 | 7.0 | 0.4/s | 1.2 | 12% | 2.5x | — |
| 2 | 120 | 8.0 | 0.45/s | 1.5 | 16% | 2.8x | $200 |
| 3 | 180 | 9.0 | 0.56/s | 1.8 | 20% | 3.2x | $300 |

**Total investment:** $825 fully upgraded. The only tower that occupies a 2x2 area — plan placement carefully. Homing missiles never miss. At max level, crits hit for 576 splash damage. Dominates late-game waves.

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

Armor reduces all incoming damage by its percentage (e.g., 27% armor means the enemy takes only 73% damage from every hit). **Note:** Fire Arrow burn, Deep Frost freeze, and Bi-Cannon scorch all bypass armor entirely.

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

Set frost/deep frost towers to **First** so they slow the leading enemy. Set snipers to **Strongest** to focus bosses and tanks.

## Controls

| Key | Action |
|-----|--------|
| 1-5 | Select tower (keys remap to your available towers) |
| Click | Place tower / Select placed tower |
| Right-click / Esc | Cancel selection |
| U | Upgrade selected tower |
| S | Sell selected tower |
| T | Cycle targeting mode |
| Space / P | Pause / Resume |
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

### Tower Synergies

- **Fire Arrow + Frost/Deep Frost:** Slow enemies to maximize burn uptime. Each tick of burn damage while slowed is free armor-bypassing damage.
- **Bi-Cannon + Damage Towers:** Armor shred from heavy rounds makes ALL your other towers deal more damage to the affected enemy.
- **Deep Frost + Lightning/Super Lightning:** Frozen enemies can't move, giving chain attacks more time to bounce between targets.
- **Missile Sniper + Deep Frost:** Freeze groups together, then splash them all with a crit missile for devastating AoE.
- **Sniper (Strongest) + Lightning (First):** Sniper focuses the boss while lightning clears the escort wave.

### Tower Placement Tips

- **Corners are king.** Towers at path corners hit enemies on two segments, effectively doubling their value.
- **Frost before damage.** Place frost/deep frost at the entrance to your killzone so enemies are slowed before they reach damage dealers.
- **Don't spread thin.** A concentrated killzone of 4-5 towers beats 8 towers spread across the map.
- **Path coverage number.** When placing a tower, you'll see a yellow number showing how many path cells are in range. Aim for 8+.
- **Upgrade > new tower.** A maxed tower outperforms two level 1 towers for less gold. Prioritize upgrading towers at key positions.
- **Missile Sniper placement.** The 2x2 footprint needs careful planning. Place it where the 4 cells have good path coverage — corners with space are ideal.

### Map-Specific Tips

**Serpentine Valley:** The long winding path lets you build deep, layered defenses. Focus on 2-3 killzones at the tightest corners where the path doubles back. Lightning and Super Lightning shine here because chains can jump between parallel path segments.

**Split Creek:** You must cover both branches. Place deep frost at the fork to slow enemies regardless of which path they take. Build symmetric defenses, or use long-range snipers/missile snipers placed centrally to cover both routes. The lower HP multiplier (0.60x) compensates for the split coverage requirement.

**The Gauntlet:** Fewer build spots means every tower placement matters. Find the longest straight segment and stack deep frost + cannon + fire arrows there. Upgrade aggressively rather than building wide. The reduced HP multiplier (0.65x) balances the shorter path length. A well-placed Missile Sniper can cover most of this short map.
