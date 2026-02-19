# Etai's Tower Defence

Defend your base against waves of enemies by building and upgrading towers along the path. Enemies follow the path from entry to exit — if they reach the end, you lose lives. Lose all 20 lives and it's game over.

## Wave-Based Progression

Every world is an **endless survival run** — you play until you lose all 20 lives. New towers, the hero unit, and dual spawn points unlock at wave thresholds mid-run:

| Wave | Unlock | Replaces |
|------|--------|----------|
| 1 | Arrow, Frost, Lightning | — |
| 2 | Cannon | — |
| 5 | Sniper | — |
| 10 | Fire Arrow, Deep Frost | Arrow, Frost (auto-upgraded) |
| 14 | Hero unit (WASD-controlled) | — |
| 15 | Dual Spawn + Flying enemies | — |
| 20 | Missile Sniper | Sniper (auto-upgraded) |
| 25 | Super Lightning, Bi-Cannon | Lightning, Cannon (auto-upgraded) |
| 30 | Pulse Cannon | — |

When a threshold is crossed, the game pauses and shows an unlock screen with the new tower stats. Click **Continue** to resume. Replaced towers on the field are auto-upgraded for free.

**Dual spawn** starts at ~8% of enemies using the second entry at wave 16 and ramps up to 25%. If all secondary enemies are killed while primary enemies remain, reinforcements spawn from the secondary path to keep pressure up.

**Flying enemies** also begin at wave 15 — purple winged enemies that spawn at the castle, fly a curvy path backward to the middle of the map, then land and walk to the exit. They are **untargetable while airborne** — towers, hero, and splash can't hit them until they land. Count scales from 1 at wave 15 to 10 by wave 30.

**Dragon Flyers** — larger, tougher red flying enemies — appear every wave from wave 25 onward (1→8 count).

**Goldrush** waves occur every 10 waves — all kills give double gold. **Bosses** appear every 5 waves (waves 5-20). **Megabosses** replace them at waves 25-31 (every 2 waves). **Quantum Bosses** take over from wave 32+, appearing every wave with rapidly escalating counts.

## Maps

Each world offers a different strategic challenge. Enemy HP is adjusted per world to keep difficulty balanced — shorter paths have lower HP multipliers so no world is inherently harder than another.

| Map | Style | HP Multiplier | Unlock Requirement | Description |
|-----|-------|---------------|-------------------|-------------|
| **Serpentine Valley** | Long path | 1.0x | Always open | Winding path with 10+ turns. Lots of build space. Lightning towers shine at corners where the path doubles back. |
| **Split Creek** | Split path | 0.60x | Wave 30 on any map | Path forks into two branches midway. Enemies randomly take upper or lower route, forcing you to defend both sides. Starts with wave 1-30 towers pre-unlocked. |
| **The Gauntlet** | Short path | 0.65x | Wave 40 on any map | Direct path with only 3 turns. Fewer tower slots — every placement counts. Starts with wave 1-50 towers pre-unlocked. |

Each map has multiple layout variants randomly selected each run. Each environment has unique ambient effects — falling leaves and fireflies in forests, sand wisps in the desert, and rising embers over lava.

## Hero Unit (Wave 14+)

At wave 14, you unlock a hero unit that spawns near the path start. Control it with WASD (or arrow keys) to move around the battlefield.

**Auto-Attack:** The hero automatically fires at the nearest enemy within range (15 damage, 3.5 cell range, 2 shots/sec).

**Abilities:**

| Key | Ability | Cooldown | Effect |
|-----|---------|----------|--------|
| **Q** | AoE Stun | 15s | Stuns all enemies in a 3-cell radius for 1.5 seconds |
| **E** | Gold Magnet | 20s | Doubles gold from kills within a 4-cell radius for 8 seconds |

**Contact Damage:** Enemies deal damage to the hero when they overlap. Bosses and tanks hurt more; swarms and runners hurt less. If the hero dies, it respawns near the castle after 5 seconds with full HP.

**Tips:**
- Position the hero at chokepoints where enemies are clustered for maximum stun value
- Activate Gold Magnet during high-count waves (swarms, hordes) to maximize bonus gold
- Don't let the hero sit on the path — bosses deal 3x contact damage and can kill quickly
- The hero keeps fighting even while abilities are on cooldown — the auto-attack is free DPS

## Towers

Hover over any tower button in the bottom bar to see a preview card with the tower image, stats, and special ability. Click a placed tower to see its full info card with all stats (damage, range, fire rate, slow, freeze, chain, shock, crit, etc.) plus upgrade previews. The tower panel is dynamic — it shows only the towers unlocked at your current wave. Keys 1-5 always map to whichever towers are visible.

### Starter Towers (Wave 1)

#### Arrow ($50) — Available from wave 1

Your bread-and-butter tower. Fast fire rate, decent range, cheap to build and upgrade. Best for sustained single-target damage. Replaced by Fire Arrow at wave 10.

| Level | Damage | Range | Fire Rate | Upgrade Cost |
|-------|--------|-------|-----------|-------------|
| 1 | 13 | 3.5 | 2.5/s | — |
| 2 | 19 | 4.0 | 3.0/s | $35 |
| 3 | 29 | 4.5 | 4.0/s | $70 |

**Total investment:** $155 fully upgraded. Best DPS per gold in the game.

#### Frost ($75) — Available from wave 1

Low damage but slows enemies, making them spend more time in range of your other towers. The most important support tower. Replaced by Deep Frost at wave 10.

| Level | Damage | Range | Fire Rate | Slow | Duration | Upgrade Cost |
|-------|--------|-------|-----------|------|----------|-------------|
| 1 | 5 | 3.0 | 1.3/s | 43% | 2.0s | — |
| 2 | 8 | 3.5 | 1.4/s | 51% | 2.5s | $55 |
| 3 | 13 | 4.0 | 1.7/s | 60% | 3.0s | $100 |

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

### Wave 10 Unlocks

At wave 10, Arrow and Frost are replaced in the tower panel by these upgraded versions:

#### Fire Arrow ($200) — Replaces Arrow

Premium arrow tower that sets enemies on fire. High damage with a burn damage-over-time effect that bypasses armor entirely. Devastating against armored targets.

| Level | Damage | Range | Fire Rate | Burn DPS | Burn Duration | Upgrade Cost |
|-------|--------|-------|-----------|----------|---------------|-------------|
| 1 | 19 | 3.5 | 3.3/s | 3.15/s | 3.0s | — |
| 2 | 29 | 4.0 | 4.0/s | 6.3/s | 3.5s | $120 |
| 3 | 42 | 4.5 | 5.0/s | 9.45/s | 4.0s | $200 |

**Total investment:** $520 fully upgraded. Burn damage ignores armor — strong against tanks and bosses. If a stronger burn is applied while burning, the enemy takes the stronger one.

#### Deep Frost ($150) — Replaces Frost

An aura-based tower that pulses cold damage to ALL enemies in range simultaneously. No projectiles — it hits everything nearby. Has a chance to completely freeze enemies in place.

| Level | Damage | Range | Slow | Freeze Chance | Freeze Duration | Upgrade Cost |
|-------|--------|-------|------|---------------|-----------------|-------------|
| 1 | 15 | 3.0 | 34% | 10% | 0.8s | — |
| 2 | 24 | 3.5 | 43% | 15% | 1.0s | $100 |
| 3 | 33 | 4.0 | 51% | 20% | 1.2s | $175 |

**Total investment:** $425 fully upgraded. The aura pulse hits all enemies in range — no projectiles to miss. Frozen enemies stop completely (speed = 0). Place at chokepoints for maximum crowd control.

### Wave 20 Unlock

#### Missile Sniper ($300)

A precision emplacement that fires homing missiles dealing splash damage with a chance to crit. Combines the best of sniper range and cannon splash. Replaces the basic Sniper.

| Level | Damage | Range | Fire Rate | Splash Radius | Crit Chance | Crit Multi | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-------------|------------|-------------|
| 1 | 102 | 7.0 | 0.4/s | 1.2 | 12% | 2.5x | — |
| 2 | 152 | 8.0 | 0.45/s | 1.5 | 16% | 2.8x | $200 |
| 3 | 229 | 9.0 | 0.56/s | 1.8 | 20% | 3.2x | $300 |

**Total investment:** $800 fully upgraded. Homing missiles never miss. At max level, crits hit for 576 splash damage. Dominates late-game waves.

### Wave 25 Unlocks

#### Super Lightning ($250)

An upgraded lightning tower with forking chain attacks. Hits branch out in a tree pattern, and has a chance to shock enemies (brief stun). Builds up overcharge for bonus damage.

| Level | Damage | Range | Forks | Fork Depth | Shock Chance | Upgrade Cost |
|-------|--------|-------|-------|------------|--------------|-------------|
| 1 | 21 | 4.0 | 4 | 2 | 15% | — |
| 2 | 33 | 4.5 | 6 | 2 | 20% | $150 |
| 3 | 48 | 5.0 | 8 | 3 | 25% | $250 |

**Total investment:** $650 fully upgraded. Forking chains spread damage across many enemies. Overcharge builds 10-12% bonus damage over time. Shock briefly stuns enemies (0.3-0.4s).

#### Bi-Cannon ($200)

A dual-barreled cannon that fires twice as fast as a regular cannon. Every 3-4 shots is a heavy round that shreds enemy armor. Leaves scorch zones on the ground that damage enemies walking through.

| Level | Damage | Range | Fire Rate | Armor Shred | Scorch DPS | Upgrade Cost |
|-------|--------|-------|-----------|-------------|------------|-------------|
| 1 | 38 | 3.5 | 1.7/s | 10% for 3s | 6/s for 2s | — |
| 2 | 60 | 4.0 | 2.0/s | 12% for 3.5s | 9/s for 2.5s | $120 |
| 3 | 93 | 4.5 | 2.5/s | 15% for 4s | 14/s for 3s | $200 |

**Total investment:** $520 fully upgraded. Armor shred reduces enemy armor temporarily — devastating when paired with other damage towers. Scorch zones bypass armor like burn damage.

### Wave 30 Unlock

#### Pulse Cannon ($600)

A teal energy cannon that fires shockwave pulses, dealing splash damage and knocking enemies backward along the path. Forces enemies to re-walk sections of the path, giving all your towers extra shots.

| Level | Damage | Range | Fire Rate | Splash Radius | Knockback | Upgrade Cost |
|-------|--------|-------|-----------|---------------|-----------|-------------|
| 1 | 20 | 3.5 | 0.56/s | 1.2 | 1.0 cells | — |
| 2 | 30 | 4.0 | 0.67/s | 1.5 | 1.5 cells | $150 |
| 3 | 45 | 4.5 | 0.77/s | 1.8 | 2.0 cells | $250 |

**Total investment:** $1000 fully upgraded. Knockback pushes enemies backward along their path — bosses are immune, tanks resist 50%. Each enemy can only be knocked back twice, then becomes immune to further pushback. Best placed mid-path where knockback forces enemies back through your killzone.

## Enemies

| Type | Shape | HP | Speed | Armor | Special | Lives Lost |
|------|-------|----|-------|-------|---------|-----------|
| **Grunt** | Pentagon | 18 | Medium (70) | 0% | — | 1 |
| **Runner** | Diamond | 6 | Fast (125) | 0% | — | 1 |
| **Tank** | Square | 75 | Slow (40) | 27% | — | 2 |
| **Healer** | Cross | 25 | Medium (65) | 0% | Heals nearby allies (3 HP/s) | 1 |
| **Boss** | Hexagon | 349 | Very slow (26) | 20% | Screen shake + shockwave on death | 5 |
| **Swarm** | Triangle | 5 | Fast (105) | 0% | Comes in large numbers | 1 |
| **Flying** | Wings | 10 | Medium (97) | 0% | Airborne until landing — untargetable while flying | 1 |
| **Dragon Flyer** | Wings (large) | 30 | Medium (97) | 0% | Bigger flying enemy, wave 25+, 1→8 count | 2 |
| **Megaboss** | Octagon | 392 | Medium (58) | 25% | Waves 25-31, knockback immune, enrages when last alive | 5 |
| **Quantum Boss** | Star | 392 | Medium (64) | 30% | Wave 32+, count escalates fast, knockback immune | 5 |

HP scales exponentially each wave. By wave 20, enemies have roughly 161x the HP of wave 1.

Armor reduces all incoming damage by its percentage (e.g., 27% armor means the enemy takes only 73% damage from every hit). **Note:** Fire Arrow burn, Deep Frost freeze, and Bi-Cannon scorch all bypass armor entirely.

## Wave Modifiers

Starting from wave 3, some waves get a random modifier that buffs all enemies in that wave. A colored badge appears next to the wave counter in the top bar showing the active modifier name (e.g., "Armored", "Swift"). A floating text announcement also appears at wave start.

| Modifier | Effect | Color |
|----------|--------|-------|
| **Armored** | All enemies gain +20% armor | Gray |
| **Swift** | All enemies move 30% faster | Orange |
| **Regen** | Enemies slowly regenerate HP (0.5%/s) | Green |
| **Horde** | 40% more enemies spawn, but with 25% less HP | Red |

Modifiers are random — about 35% of waves from wave 3 onward will have one. Plan your defenses to handle any modifier.

## Early-Send Bonus

When a wave ends, pressing N to send the next wave early earns bonus gold. The bonus starts at 30g and decays by 5g per second of waiting. Send immediately for maximum gold, or wait and build first if you need to prepare. The bonus amount is shown on the Next Wave button.

## Economy

- **Starting gold:** 300g (same for all worlds)
- **Kill rewards:** Base reward + 10% bonus
- **Wave completion bonus:** 25 + (wave number x 6) gold
- **Interest:** 1% of your gold at end of each wave
- **Sell refund:** 60% of total invested gold (base cost + all upgrades)
- **Early-send bonus:** Up to 30g for sending the next wave immediately (decays 5g/s)

**Tip:** Banking gold between waves earns interest, but sending the next wave early gives bonus gold. Balance these two strategies based on whether you need time to build or can handle the pressure.

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
| +/- | Change game speed (1x / 2x / 3x) |
| WASD / Arrows | Move hero unit (Wave 14+) |
| Q | Hero AoE stun (Wave 14+) |
| E | Hero gold magnet (Wave 14+) |

## HUD Features

- **Auto-Wave:** Enabled by default — the next wave starts automatically after 5 seconds. Click the "Auto" badge (next to speed) to toggle manual mode.
- **Next-Wave Preview:** Between waves, a panel appears at the bottom showing the enemy types and counts for the upcoming wave with their actual icons.
- **Low Lives Warning:** When lives drop to 5 or below, the screen border pulses red and the lives counter glows as an urgent warning.
- **Wave Modifier Badge:** During a modified wave, the modifier name appears as a colored badge next to the wave counter.

## Strategy Guide

### Early Game (Waves 1-5)

Start with 2-3 Arrow towers at the first major corner. Runners appear at wave 2 and tanks at wave 4, so build a Frost tower early. Your first healer shows up at wave 5 alongside tanks — prioritize killing healers before they sustain the tanks. The Cannon unlocks after wave 2 and the Sniper at wave 5.

### Mid Game (Waves 6-10)

Wave 6 is a swarm wave (20 fast enemies). Have at least one Cannon or Lightning ready. Wave 9 is a mixed assault with grunts, tanks, healers, and runners — your defenses need to handle all types. Wave 10 is your first boss with tank escorts — a Sniper set to Strongest targeting makes a big difference. Watch for wave modifiers — an Armored or Swift modifier on a tough wave can catch you off guard.

### Late Game (Waves 11+)

Bosses appear every 5 waves. At wave 14, the hero unlocks — position it at chokepoints for free DPS and stun crowd control. Wave 15 introduces dual spawn (enemies from two directions) and flying enemies that bypass your early defenses by landing mid-path. Make sure you have tower coverage in the middle and late sections of the path — not just at the entrance. At wave 20 Missile Sniper replaces Sniper, and at wave 25 Super Lightning and Bi-Cannon replace Lightning and Cannon. Use the early-send bonus aggressively to bank extra gold for upgrades.

### Tower Synergies

- **Fire Arrow + Frost/Deep Frost:** Slow enemies to maximize burn uptime. Each tick of burn damage while slowed is free armor-bypassing damage.
- **Bi-Cannon + Damage Towers:** Armor shred from heavy rounds makes ALL your other towers deal more damage to the affected enemy.
- **Deep Frost + Lightning/Super Lightning:** Frozen enemies can't move, giving chain attacks more time to bounce between targets.
- **Missile Sniper + Deep Frost:** Freeze groups together, then splash them all with a crit missile for devastating AoE.
- **Sniper (Strongest) + Lightning (First):** Sniper focuses the boss while lightning clears the escort wave.
- **Pulse Cannon + Any Damage Tower:** Knockback forces enemies to re-walk through your killzone, effectively doubling tower uptime. Place pulse mid-path with damage towers covering the same stretch.

### Tower Placement Tips

- **Corners are king.** Towers at path corners hit enemies on two segments, effectively doubling their value.
- **Frost before damage.** Place frost/deep frost at the entrance to your killzone so enemies are slowed before they reach damage dealers.
- **Don't spread thin.** A concentrated killzone of 4-5 towers beats 8 towers spread across the map.
- **Path coverage number.** When placing a tower, you'll see a yellow number showing how many path cells are in range. Aim for 8+.
- **Upgrade > new tower.** A maxed tower outperforms two level 1 towers for less gold. Prioritize upgrading towers at key positions.
- **Missile Sniper placement.** Its huge range covers most of the map. Place centrally where its splash can hit groups.

### Map-Specific Tips

**Serpentine Valley:** The long winding path lets you build deep, layered defenses. Focus on 2-3 killzones at the tightest corners where the path doubles back. Lightning and Super Lightning shine here because chains can jump between parallel path segments.

**Split Creek:** You must cover both branches. Place deep frost at the fork to slow enemies regardless of which path they take. Build symmetric defenses, or use long-range snipers/missile snipers placed centrally to cover both routes. The lower HP multiplier (0.60x) compensates for the split coverage requirement.

**The Gauntlet:** Fewer build spots means every tower placement matters. Find the longest straight segment and stack deep frost + cannon + fire arrows there. Upgrade aggressively rather than building wide. The reduced HP multiplier (0.65x) balances the shorter path length. A well-placed Missile Sniper can cover most of this short map.
