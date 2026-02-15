import * as THREE from 'three';
import { CANVAS_W, CANVAS_H, CELL } from './constants.js';
import { Scene3D } from './scene3d.js';
import { createTowerMesh } from './meshes/towers.js';
import { createEnemyMesh } from './meshes/enemies.js';

// Compensate for tilted camera: 3D height shifts objects up on screen.
// Offset Z forward so turret appears centered in its cell.
const _TAN_TILT = Math.tan(25 * Math.PI / 180); // must match scene3d.js TILT_DEG

// Shared ambient particle geometries (created once)
let _ambientGeo = null;
function getAmbientGeo() {
    if (_ambientGeo) return _ambientGeo;
    // Leaf shape — pointed oval with slight asymmetry
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.5);
    leafShape.bezierCurveTo(0.35, -0.25, 0.4, 0.2, 0.05, 0.5);
    leafShape.bezierCurveTo(0, 0.52, -0.05, 0.52, -0.05, 0.5);
    leafShape.bezierCurveTo(-0.4, 0.2, -0.35, -0.25, 0, -0.5);
    _ambientGeo = {
        leaf: new THREE.ShapeGeometry(leafShape),
        sphere: new THREE.SphereGeometry(1, 6, 4),
        oct: new THREE.OctahedronGeometry(1, 0),
    };
    return _ambientGeo;
}
const MAX_AMBIENTS = 40;

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

        // 3D ambient particles
        this._ambientParticles = [];
        this._ambientSpawnTimer = 0;
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
        // Clear ambient particles
        for (const p of this._ambientParticles) {
            this.scene3d.scene.remove(p.mesh);
            p.mesh.material.dispose();
            if (p.glow) { this.scene3d.scene.remove(p.glow); p.glow.material.dispose(); }
        }
        this._ambientParticles.length = 0;
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

        // Update 3D ambient particles
        this._updateAmbients(1 / 60);

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
                // Shift turret Z forward to compensate for height-induced upward shift on tilted camera
                // (base/ring stay centered on the 2D base square)
                entry.turret.position.x = 0;
                entry.turret.position.y = 0;
                const zOff = CELL * 0.25 * 1.1 * _TAN_TILT;
                entry.turret.position.z = zOff;
                scene.add(entry.group);
                meshMap.set(tower.id, entry);
            }

            // Update turret rotation (2D angle → Y rotation, negated because Z is forward)
            // In 2D: angle 0 = right (+X), pi/2 = down (+Y)
            // In 3D: Y rotation 0 = +Z, so we offset by -pi/2 and negate
            entry.turret.rotation.y = -tower.turretAngle + Math.PI / 2;

            // Recoil: shift turret backward along facing direction
            // Base Z offset compensates for tilt-induced upward shift
            const baseZOff = CELL * 0.25 * 1.1 * _TAN_TILT;
            if (tower.recoilTimer > 0) {
                const recoilAmount = (tower.recoilTimer / 0.12) * 8;
                entry.turret.position.z = baseZOff - recoilAmount;
            } else {
                entry.turret.position.z = baseZOff;
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

    // ── 3D Ambient Particles ─────────────────────────────────

    _updateAmbients(dt) {
        const scene = this.scene3d.scene;

        // Spawn new particles
        this._ambientSpawnTimer -= dt;
        if (this._ambientSpawnTimer <= 0 && this._ambientParticles.length < MAX_AMBIENTS) {
            this._spawnAmbient();
            const env = (this.game.map && this.game.map.def && this.game.map.def.environment) || 'forest';
            this._ambientSpawnTimer = env === 'forest' ? 0.18 : 0.15;
        }

        // Update existing particles
        for (let i = this._ambientParticles.length - 1; i >= 0; i--) {
            const p = this._ambientParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                p.mesh.material.dispose();
                if (p.glow) { scene.remove(p.glow); p.glow.material.dispose(); }
                this._ambientParticles.splice(i, 1);
                continue;
            }

            p.age += dt;
            // Move
            p.px += p.vx * dt;
            p.py += p.vy * dt;
            p.pz += p.vz * dt;

            // Fade: in first 10%, out last 30%
            const t = p.age / p.maxLife;
            let alpha = 1;
            if (t < 0.1) alpha = t / 0.1;
            else if (t > 0.7) alpha = (1 - t) / 0.3;

            switch (p.type) {
                case 'leaf': {
                    alpha *= 0.7;
                    const wobbleX = Math.sin(p.age * 1.5 + p.phase) * 20;
                    p.mesh.position.set(p.px + wobbleX, p.py, p.pz);
                    p.mesh.rotation.x += p.rx * dt;
                    p.mesh.rotation.y += p.ry * dt;
                    p.mesh.rotation.z += p.rz * dt;
                    p.mesh.material.opacity = alpha;
                    break;
                }
                case 'firefly': {
                    const bobX = Math.sin(p.age * 2 + p.phase) * 12;
                    const bobY = Math.cos(p.age * 1.5 + p.phase * 1.3) * 8;
                    const bobZ = Math.sin(p.age * 1.2 + p.phase * 0.7) * 10;
                    const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.age * 4 + p.phase));
                    p.mesh.position.set(p.px + bobX, p.py + bobY, p.pz + bobZ);
                    p.mesh.material.emissiveIntensity = pulse;
                    p.mesh.material.opacity = alpha * pulse;
                    if (p.glow) {
                        p.glow.position.copy(p.mesh.position);
                        p.glow.material.opacity = alpha * pulse * 0.15;
                    }
                    break;
                }
                case 'sand': {
                    alpha *= 0.5 + 0.15 * Math.sin(p.age + p.phase);
                    const waveZ = Math.sin(p.age * 2 + p.phase) * 6;
                    p.mesh.position.set(p.px, p.py, p.pz + waveZ);
                    p.mesh.rotation.y += 0.5 * dt;
                    p.mesh.material.opacity = alpha;
                    break;
                }
                case 'dust': {
                    const expand = 1 + (1 - p.life / p.maxLife) * 2;
                    alpha *= 0.55 * (p.life / p.maxLife);
                    p.mesh.position.set(p.px, p.py, p.pz);
                    p.mesh.scale.setScalar(p.size * expand);
                    p.mesh.material.opacity = alpha;
                    break;
                }
                case 'ember': {
                    alpha *= 0.8;
                    p.mesh.position.set(p.px, p.py, p.pz);
                    p.mesh.rotation.x += p.rx * dt;
                    p.mesh.rotation.y += p.ry * dt;
                    p.mesh.material.opacity = alpha;
                    p.mesh.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(p.age * 3);
                    if (p.glow) {
                        p.glow.position.copy(p.mesh.position);
                        p.glow.material.opacity = alpha * 0.2;
                    }
                    break;
                }
                case 'bubble': {
                    const grow = 1 + (1 - p.life / p.maxLife) * 1.5;
                    const pop = p.life / p.maxLife;
                    alpha *= pop * 0.65;
                    p.mesh.position.set(p.px, p.py, p.pz);
                    p.mesh.scale.setScalar(p.size * grow);
                    p.mesh.material.opacity = alpha;
                    break;
                }
            }
        }
    }

    _spawnAmbient() {
        const env = (this.game.map && this.game.map.def && this.game.map.def.environment) || 'forest';
        const geo = getAmbientGeo();
        const scene = this.scene3d.scene;
        const r = Math.random();
        let p = null;

        if (env === 'desert') {
            if (r < 0.7) {
                // Sand wisp — small plane blowing across
                const life = 5 + Math.random() * 3;
                const colors = [0xfff8e0, 0xffe8b0, 0xf5e0c0];
                const color = colors[Math.random() * colors.length | 0];
                const mesh = new THREE.Mesh(geo.leaf, new THREE.MeshStandardMaterial({
                    color, emissive: color, emissiveIntensity: 0.2,
                    transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
                }));
                const sz = 3 + Math.random() * 2;
                mesh.scale.set(sz, sz, sz);
                scene.add(mesh);
                p = {
                    mesh, glow: null, type: 'sand',
                    px: -10, py: 2 + Math.random() * 4, pz: Math.random() * CANVAS_H,
                    vx: 60 + Math.random() * 60, vy: 0, vz: 0,
                    rx: 0, ry: 0, rz: 0,
                    life, maxLife: life, size: sz, phase: Math.random() * Math.PI * 2, age: 0,
                };
            } else {
                // Dust puff — expanding sphere
                const life = 2 + Math.random();
                const mesh = new THREE.Mesh(geo.sphere, new THREE.MeshStandardMaterial({
                    color: 0x8a6a30, emissive: 0x8a6a30, emissiveIntensity: 0.15,
                    transparent: true, opacity: 0.5, depthWrite: false,
                }));
                const sz = 3;
                mesh.scale.setScalar(sz);
                scene.add(mesh);
                p = {
                    mesh, glow: null, type: 'dust',
                    px: Math.random() * CANVAS_W, py: 1 + Math.random() * 3, pz: Math.random() * CANVAS_H,
                    vx: 0, vy: 0, vz: 0,
                    rx: 0, ry: 0, rz: 0,
                    life, maxLife: life, size: sz, phase: 0, age: 0,
                };
            }
        } else if (env === 'lava') {
            if (r < 0.7) {
                // Ember — rising spinning octahedron with glow
                const life = 3 + Math.random() * 2;
                const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00];
                const color = colors[Math.random() * colors.length | 0];
                const mesh = new THREE.Mesh(geo.oct, new THREE.MeshStandardMaterial({
                    color, emissive: color, emissiveIntensity: 0.6,
                    transparent: true, opacity: 0.8, depthWrite: false,
                }));
                const sz = 2 + Math.random() * 1.5;
                mesh.scale.setScalar(sz);
                scene.add(mesh);
                // Outer glow sphere
                const glow = new THREE.Mesh(geo.sphere, new THREE.MeshBasicMaterial({
                    color: 0xff8800, transparent: true, opacity: 0.15, depthWrite: false,
                }));
                glow.scale.setScalar(sz * 4);
                scene.add(glow);
                p = {
                    mesh, glow, type: 'ember',
                    px: Math.random() * CANVAS_W, py: 0, pz: Math.random() * CANVAS_H,
                    vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 30, vz: (Math.random() - 0.5) * 15,
                    rx: 1 + Math.random() * 2, ry: 1.5 + Math.random() * 2, rz: 0,
                    life, maxLife: life, size: sz, phase: Math.random() * Math.PI * 2, age: 0,
                };
            } else {
                // Bubble — growing sphere
                const life = 1.5 + Math.random();
                const mesh = new THREE.Mesh(geo.sphere, new THREE.MeshStandardMaterial({
                    color: 0xff6030, emissive: 0xff4020, emissiveIntensity: 0.3,
                    transparent: true, opacity: 0.5, depthWrite: false,
                }));
                const sz = 3;
                mesh.scale.setScalar(sz);
                scene.add(mesh);
                p = {
                    mesh, glow: null, type: 'bubble',
                    px: Math.random() * CANVAS_W, py: 0.5, pz: Math.random() * CANVAS_H,
                    vx: 0, vy: 2 + Math.random() * 3, vz: 0,
                    rx: 0, ry: 0, rz: 0,
                    life, maxLife: life, size: sz, phase: 0, age: 0,
                };
            }
        } else {
            // Forest
            if (r < 0.7) {
                // Leaf — tumbling plane falling from above
                const life = 8 + Math.random() * 4;
                const colors = [0x5a8a3c, 0x7a9a4c, 0x8b6e3c, 0xc07030];
                const color = colors[Math.random() * colors.length | 0];
                const mesh = new THREE.Mesh(geo.leaf, new THREE.MeshStandardMaterial({
                    color, emissive: color, emissiveIntensity: 0.2,
                    transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false,
                }));
                const sz = 14 + Math.random() * 8;
                mesh.scale.set(sz, sz, sz);
                scene.add(mesh);
                p = {
                    mesh, glow: null, type: 'leaf',
                    px: Math.random() * CANVAS_W, py: 30 + Math.random() * 20, pz: Math.random() * CANVAS_H,
                    vx: 0, vy: -(3 + Math.random() * 4), vz: 8 + Math.random() * 12,
                    rx: 0.8 + Math.random() * 1.5, ry: 0.5 + Math.random(), rz: 0.3 + Math.random() * 0.8,
                    life, maxLife: life, size: sz, phase: Math.random() * Math.PI * 2, age: 0,
                };
            } else {
                // Firefly — emissive sphere with glow
                const life = 4 + Math.random() * 2;
                const mesh = new THREE.Mesh(geo.sphere, new THREE.MeshStandardMaterial({
                    color: 0xaaff44, emissive: 0xaaff44, emissiveIntensity: 0.8,
                    transparent: true, opacity: 0.8, depthWrite: false,
                }));
                const sz = 2 + Math.random();
                mesh.scale.setScalar(sz);
                scene.add(mesh);
                // Outer glow
                const glow = new THREE.Mesh(geo.sphere, new THREE.MeshBasicMaterial({
                    color: 0xaaff44, transparent: true, opacity: 0.12, depthWrite: false,
                }));
                glow.scale.setScalar(sz * 5);
                scene.add(glow);
                p = {
                    mesh, glow, type: 'firefly',
                    px: Math.random() * CANVAS_W, py: 10 + Math.random() * 15, pz: Math.random() * CANVAS_H,
                    vx: 0, vy: 0, vz: 0,
                    rx: 0, ry: 0, rz: 0,
                    life, maxLife: life, size: sz, phase: Math.random() * Math.PI * 2, age: 0,
                };
            }
        }

        if (p) {
            // Set initial mesh position and disable frustum culling for small meshes
            p.mesh.position.set(p.px, p.py, p.pz);
            p.mesh.frustumCulled = false;
            if (p.glow) {
                p.glow.position.set(p.px, p.py, p.pz);
                p.glow.frustumCulled = false;
            }
            this._ambientParticles.push(p);
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

        // Clean up ambient particles
        for (const p of this._ambientParticles) {
            this.scene3d.scene.remove(p.mesh);
            p.mesh.material.dispose();
            if (p.glow) { this.scene3d.scene.remove(p.glow); p.glow.material.dispose(); }
        }
        this._ambientParticles.length = 0;

        this.scene3d.dispose();
    }
}
