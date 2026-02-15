import { CANVAS_W, CANVAS_H, CELL } from './constants.js';
import { Scene3D } from './scene3d.js';
import { createTowerMesh } from './meshes/towers.js';
import { createEnemyMesh } from './meshes/enemies.js';

/**
 * 3D renderer using Three.js.
 * Phase 1: terrain ground plane.
 * Phase 2: 3D tower meshes with turret rotation + recoil.
 * Phase 3: 3D enemy meshes with position tracking, death animation, flying altitude.
 */
export class Renderer3D {
    constructor(canvases, game) {
        this.game = game;
        this.threeCanvas = canvases.three;
        this.scene3d = new Scene3D(this.threeCanvas);
        this._terrainDirty = true;

        // Tower mesh tracking: tower.id → { group, turret, base, type, level }
        this._towerMeshes = new Map();

        // Enemy mesh tracking: enemy.id → { group, body, shadow, type }
        this._enemyMeshes = new Map();
    }

    /** Marks terrain for re-render (tower place/sell/upgrade, new map) */
    drawTerrain() {
        this._terrainDirty = true;
        // Clear all tower meshes — they'll be recreated on next frame
        for (const [, entry] of this._towerMeshes) {
            this.scene3d.scene.remove(entry.group);
            this._disposeMeshGroup(entry.group);
        }
        this._towerMeshes.clear();
        // Clear all enemy meshes — they'll be recreated on next frame
        for (const [, entry] of this._enemyMeshes) {
            this.scene3d.scene.remove(entry.group);
            this._disposeMeshGroup(entry.group);
        }
        this._enemyMeshes.clear();
    }

    /** Main render call */
    drawFrame(interpolation) {
        // Update terrain texture if dirty
        if (this._terrainDirty) {
            this._terrainDirty = false;
            this.scene3d.updateTerrainTexture(
                this.game.map,
                (ctx) => {
                    for (const tower of this.game.towers.towers) {
                        this.game.renderer.drawTowerBase(ctx, tower);
                    }
                },
            );
        }

        // Reconcile tower meshes
        this._updateTowers();

        // Reconcile enemy meshes
        this._updateEnemies();

        // Render 3D scene
        this.scene3d.render();
    }

    // ── Tower mesh management ─────────────────────────────────

    _updateTowers() {
        const towers = this.game.towers.towers;
        const scene = this.scene3d.scene;
        const meshMap = this._towerMeshes;
        const activeTowerIds = new Set();

        for (const tower of towers) {
            activeTowerIds.add(tower.id);

            let entry = meshMap.get(tower.id);

            // Create mesh if new or type/level changed
            if (!entry || entry.type !== tower.type || entry.level !== tower.level) {
                // Remove old mesh
                if (entry) {
                    scene.remove(entry.group);
                    this._disposeMeshGroup(entry.group);
                }

                const result = createTowerMesh(tower.type, tower.level);
                if (!result) continue;

                entry = {
                    group: result.group,
                    turret: result.turret,
                    base: result.base,
                    type: tower.type,
                    level: tower.level,
                };

                // Position: 2D (x, y) → 3D (x, 0, z)
                // Scale: keep cell footprint, slight height boost
                entry.group.scale.set(1.0, 1.1, 1.0);
                entry.group.position.set(tower.x, 0, tower.y);
                scene.add(entry.group);
                meshMap.set(tower.id, entry);
            }

            // Update turret rotation (2D angle → Y rotation, negated because Z is forward)
            // In 2D: angle 0 = right (+X), pi/2 = down (+Y)
            // In 3D: Y rotation 0 = +Z, so we offset by -pi/2 and negate
            entry.turret.rotation.y = -tower.turretAngle + Math.PI / 2;

            // Recoil: shift turret backward along facing direction
            if (tower.recoilTimer > 0) {
                const recoilAmount = (tower.recoilTimer / 0.12) * 8;
                // Turret local Z is forward after rotation, so shift in -Z (local)
                entry.turret.position.z = -recoilAmount;
            } else {
                entry.turret.position.z = 0;
            }
        }

        // Remove meshes for towers that no longer exist (sold/destroyed)
        for (const [id, entry] of meshMap) {
            if (!activeTowerIds.has(id)) {
                scene.remove(entry.group);
                this._disposeMeshGroup(entry.group);
                meshMap.delete(id);
            }
        }
    }

    // ── Enemy mesh management ─────────────────────────────────

    _updateEnemies() {
        const enemies = this.game.enemies.enemies;
        const scene = this.scene3d.scene;
        const meshMap = this._enemyMeshes;
        const activeEnemyIds = new Set();

        for (const e of enemies) {
            // Skip enemies that reached the end
            if (e.reached) continue;

            const isDying = e.deathTimer >= 0;
            const deathT = isDying ? Math.min(e.deathTimer / 0.35, 1) : 0;
            const scale = isDying ? 1 - deathT : 1;

            // Remove if fully dead (scale <= 0)
            if (scale <= 0) continue;

            activeEnemyIds.add(e.id);

            let entry = meshMap.get(e.id);

            // Create mesh if new
            if (!entry) {
                const result = createEnemyMesh(e.type);
                if (!result) continue;

                entry = {
                    group: result.group,
                    body: result.body,
                    shadow: result.shadow,
                    type: e.type,
                };

                // Slight scale up for visibility
                entry.group.scale.set(1.1, 1.1, 1.1);
                scene.add(entry.group);
                meshMap.set(e.id, entry);
            }

            // Position: 2D (x, y) → 3D (x, height, z)
            // Walking bob on Y axis
            const bob = e.alive && !isDying && !e.flying ? Math.sin(e.walkPhase) * 2.5 : 0;

            // Flying altitude
            let altitude = 0;
            if (e.flying && e.flyProgress !== undefined) {
                altitude = Math.sin(e.flyProgress * Math.PI) * 40;
            }

            entry.group.position.set(e.x, altitude + bob, e.y);

            // Shadow stays at ground level, offset from body
            entry.shadow.position.y = -altitude - bob + 0.5;
            // Flying shadow is smaller/more transparent
            if (e.flying) {
                const shadowScale = 0.6 + 0.4 * (1 - Math.sin(e.flyProgress * Math.PI));
                const r = (entry.type === e.type) ? (CELL * 0.2) : 1;
                entry.shadow.material.opacity = 0.12;
                entry.shadow.scale.setScalar(r * shadowScale);
            } else {
                entry.shadow.material.opacity = 0.25;
            }

            // Death animation: scale down + spin
            if (isDying) {
                entry.body.scale.setScalar(scale);
                entry.body.rotation.y = deathT * Math.PI;
                // Fade body materials
                entry.body.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (!child.material.transparent) {
                            child.material.transparent = true;
                        }
                        child.material.opacity = 1 - deathT;
                    }
                });
            } else {
                entry.body.scale.setScalar(1);
                entry.body.rotation.y = -e.angle + Math.PI / 2;
                // Ensure opacity is restored for reuse
                entry.body.traverse(child => {
                    if (child.isMesh && child.material && child.material.transparent) {
                        child.material.opacity = 1;
                        child.material.transparent = false;
                    }
                });
            }

            // Status effect material tinting
            this._applyStatusTint(entry, e, isDying);
        }

        // Remove meshes for enemies that no longer exist
        for (const [id, entry] of meshMap) {
            if (!activeEnemyIds.has(id)) {
                scene.remove(entry.group);
                this._disposeMeshGroup(entry.group);
                meshMap.delete(id);
            }
        }
    }

    _applyStatusTint(entry, e, isDying) {
        if (isDying) return;

        // Determine dominant tint
        let emissive = 0x000000;
        let emissiveIntensity = 0;

        if (e.isFrozen) {
            emissive = 0x00ffff;
            emissiveIntensity = 0.5;
        } else if (e.isShocked) {
            emissive = 0xffffff;
            emissiveIntensity = 0.6;
        } else if (e.burnTimer > 0) {
            emissive = 0xff6600;
            emissiveIntensity = 0.4;
        } else if (e.slowTimer > 0) {
            emissive = 0x5b9bd5;
            emissiveIntensity = 0.25;
        } else if (e.enraged) {
            const pulse = 0.3 + 0.3 * Math.sin(this.game.elapsedTime * 8);
            emissive = 0xff2828;
            emissiveIntensity = pulse;
        }

        // Apply to first body mesh only (performance)
        const firstMesh = entry.body.children[0];
        if (firstMesh && firstMesh.isMesh && firstMesh.material) {
            firstMesh.material.emissive.setHex(emissive);
            firstMesh.material.emissiveIntensity = emissiveIntensity;
        }
    }

    _disposeMeshGroup(group) {
        group.traverse(child => {
            if (child.isMesh) {
                // Only dispose materials — geometries are shared/cached
                child.material?.dispose();
            }
        });
    }

    show() {
        this.threeCanvas.style.display = 'block';
    }

    hide() {
        this.threeCanvas.style.display = 'none';
    }

    dispose() {
        // Clean up tower meshes
        for (const [, entry] of this._towerMeshes) {
            this.scene3d.scene.remove(entry.group);
            this._disposeMeshGroup(entry.group);
        }
        this._towerMeshes.clear();

        // Clean up enemy meshes
        for (const [, entry] of this._enemyMeshes) {
            this.scene3d.scene.remove(entry.group);
            this._disposeMeshGroup(entry.group);
        }
        this._enemyMeshes.clear();

        this.scene3d.dispose();
    }
}
