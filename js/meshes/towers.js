import * as THREE from 'three';
import { CELL, TOWER_TYPES } from '../constants.js';
import { isLoaded, hasModel, getModelClone } from './gltf-loader.js';

const H = CELL * 0.55; // base height unit

// Shared geometries (created once, reused)
let _geoCache = null;
function getGeo() {
    if (_geoCache) return _geoCache;
    _geoCache = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
        cone: new THREE.ConeGeometry(1, 1, 8),
        oct: new THREE.OctahedronGeometry(1),
        sphere: new THREE.SphereGeometry(1, 12, 8),
        torus: new THREE.TorusGeometry(1, 0.15, 8, 24),
    };
    return _geoCache;
}

// Per-type LatheGeometry cache (created once per type)
const _towerGeoCache = new Map();

function getTowerGeo(type) {
    if (_towerGeoCache.has(type)) return _towerGeoCache.get(type);
    let geo = null;

    switch (type) {
        case 'arrow': {
            // Compact military turret
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.7, 0),
                new THREE.Vector2(0.75, 0.08),
                new THREE.Vector2(0.6, 0.35),
                new THREE.Vector2(0.65, 0.6),
                new THREE.Vector2(0.5, 0.8),
                new THREE.Vector2(0.3, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'firearrow': {
            // Aggressive angular turret with wider base
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.8, 0),
                new THREE.Vector2(0.85, 0.06),
                new THREE.Vector2(0.6, 0.15),
                new THREE.Vector2(0.7, 0.4),
                new THREE.Vector2(0.65, 0.6),
                new THREE.Vector2(0.45, 0.78),
                new THREE.Vector2(0.2, 0.93),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'cannon': {
            // Squat heavy armored dome
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.85, 0),
                new THREE.Vector2(0.9, 0.1),
                new THREE.Vector2(0.8, 0.3),
                new THREE.Vector2(0.6, 0.55),
                new THREE.Vector2(0.35, 0.75),
                new THREE.Vector2(0.15, 0.9),
                new THREE.Vector2(0, 0.95),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 10) };
            break;
        }
        case 'bicannon': {
            // Wide armored bunker turret
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.9, 0),
                new THREE.Vector2(0.95, 0.08),
                new THREE.Vector2(0.85, 0.2),
                new THREE.Vector2(0.8, 0.5),
                new THREE.Vector2(0.7, 0.65),
                new THREE.Vector2(0.4, 0.85),
                new THREE.Vector2(0, 0.9),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 10) };
            break;
        }
        case 'frost': {
            // Faceted crystal (6 segments for gem-like look)
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.5, 0.05),
                new THREE.Vector2(0.7, 0.25),
                new THREE.Vector2(0.55, 0.5),
                new THREE.Vector2(0.65, 0.7),
                new THREE.Vector2(0.3, 0.9),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 6) };
            break;
        }
        case 'deepfrost': {
            // Tall faceted crystal spire (6 segments)
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.55, 0.05),
                new THREE.Vector2(0.5, 0.15),
                new THREE.Vector2(0.6, 0.3),
                new THREE.Vector2(0.45, 0.5),
                new THREE.Vector2(0.55, 0.65),
                new THREE.Vector2(0.3, 0.82),
                new THREE.Vector2(0.1, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 6) };
            break;
        }
        case 'lightning': {
            // Tesla coil — narrow stem, wide top
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.5, 0),
                new THREE.Vector2(0.55, 0.08),
                new THREE.Vector2(0.3, 0.2),
                new THREE.Vector2(0.25, 0.5),
                new THREE.Vector2(0.55, 0.7),
                new THREE.Vector2(0.6, 0.82),
                new THREE.Vector2(0.4, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'superlightning': {
            // Enhanced Tesla coil — taller, more dramatic
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.55, 0),
                new THREE.Vector2(0.6, 0.06),
                new THREE.Vector2(0.35, 0.15),
                new THREE.Vector2(0.3, 0.35),
                new THREE.Vector2(0.5, 0.55),
                new THREE.Vector2(0.55, 0.7),
                new THREE.Vector2(0.45, 0.82),
                new THREE.Vector2(0.25, 0.92),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'sniper': {
            // Sleek tapered turret
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.6, 0),
                new THREE.Vector2(0.65, 0.1),
                new THREE.Vector2(0.5, 0.3),
                new THREE.Vector2(0.45, 0.6),
                new THREE.Vector2(0.35, 0.8),
                new THREE.Vector2(0.2, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'missilesniper': {
            // Bulky missile launcher body
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.8, 0),
                new THREE.Vector2(0.85, 0.08),
                new THREE.Vector2(0.75, 0.2),
                new THREE.Vector2(0.7, 0.5),
                new THREE.Vector2(0.6, 0.7),
                new THREE.Vector2(0.35, 0.88),
                new THREE.Vector2(0, 0.95),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'titan': {
            // Wide fortress-like body
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(1.0, 0),
                new THREE.Vector2(1.05, 0.08),
                new THREE.Vector2(0.9, 0.2),
                new THREE.Vector2(0.85, 0.45),
                new THREE.Vector2(0.7, 0.65),
                new THREE.Vector2(0.45, 0.82),
                new THREE.Vector2(0.2, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
    }
    if (geo) _towerGeoCache.set(type, geo);
    return geo;
}

function mat(color, opts = {}) {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.4,
        metalness: opts.metalness ?? 0.1,
        emissive: opts.emissive ?? c,
        emissiveIntensity: opts.emissiveIntensity ?? 0.12,
    });
}

function mesh(geo, material, { sx = 1, sy = 1, sz = 1, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0 } = {}) {
    const m = new THREE.Mesh(geo, material);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    return m;
}

// ── Turret factories per type ─────────────────────────────────

function arrowTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('arrow');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Lathed turret body
    turret.add(mesh(tg.body, mat(c, { metalness: 0.4 }), {
        sx: 9, sy: 12, sz: 9, py: H * 0.12,
    }));
    // Rail
    turret.add(mesh(g.cyl, mat(0xaaaaaa, { metalness: 0.2 }), {
        sx: 2, sy: 20, sz: 2, py: H * 0.45, rx: Math.PI / 2,
    }));
    // Arrow tip
    turret.add(mesh(g.cone, mat(0xdddddd, { metalness: 0.2 }), {
        sx: 3, sy: 8, sz: 3, pz: 14, py: H * 0.45, rx: Math.PI / 2,
    }));
    return turret;
}

function firearrowTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('firearrow');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Lathed turret body with fire glow
    turret.add(mesh(tg.body, mat(c, { metalness: 0.4, emissive: 0xff4400, emissiveIntensity: 0.3 }), {
        sx: 10, sy: 13, sz: 10, py: H * 0.1,
    }));
    // Barrel
    turret.add(mesh(g.cyl, mat(0x993300, { metalness: 0.2, emissive: 0xff2200, emissiveIntensity: 0.3 }), {
        sx: 2.5, sy: 22, sz: 2.5, py: H * 0.45, rx: Math.PI / 2,
    }));
    // Flame tip
    turret.add(mesh(g.cone, mat(0xff6600, { emissive: 0xff4400, emissiveIntensity: 0.6 }), {
        sx: 4, sy: 8, sz: 4, pz: 16, py: H * 0.45, rx: Math.PI / 2,
    }));
    return turret;
}

function cannonTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('cannon');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Squat dome body
    turret.add(mesh(tg.body, mat(c, { roughness: 0.7, metalness: 0.4 }), {
        sx: 11, sy: 13, sz: 11, py: H * 0.1,
    }));
    // Thick barrel
    turret.add(mesh(g.cyl, mat(0x999999, { metalness: 0.3 }), {
        sx: 5, sy: 20, sz: 5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    return turret;
}

function bicannonTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('bicannon');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Wide armored body
    turret.add(mesh(tg.body, mat(c, { roughness: 0.7, metalness: 0.5 }), {
        sx: 12, sy: 13, sz: 12, py: H * 0.1,
    }));
    // Twin barrels
    turret.add(mesh(g.cyl, mat(0x888888, { metalness: 0.3 }), {
        sx: 4, sy: 22, sz: 4, px: 5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    turret.add(mesh(g.cyl, mat(0x888888, { metalness: 0.3 }), {
        sx: 4, sy: 22, sz: 4, px: -5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    return turret;
}

function frostTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('frost');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Faceted crystal body (6-sided lathe)
    turret.add(mesh(tg.body, mat(c, { emissive: c, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.1 }), {
        sx: 9, sy: 14, sz: 9, py: H * 0.12,
    }));
    // Icicle barrel
    turret.add(mesh(g.cone, mat(0x88bbdd, { metalness: 0.5, emissive: 0x88ccee, emissiveIntensity: 0.2 }), {
        sx: 2.5, sy: 18, sz: 2.5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    return turret;
}

function deepfrostTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('deepfrost');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Tall faceted crystal spire
    turret.add(mesh(tg.body, mat(c, { emissive: c, emissiveIntensity: 0.5, roughness: 0.12 }), {
        sx: 9, sy: 16, sz: 9, py: H * 0.1,
    }));
    // Orbiting crystal shards
    for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i;
        turret.add(mesh(g.oct, mat(0x00ccff, { emissive: 0x00ccff, emissiveIntensity: 0.6 }), {
            sx: 4, sy: 6, sz: 4,
            px: Math.cos(a) * 14, py: H * 0.6, pz: Math.sin(a) * 14,
        }));
    }
    return turret;
}

function lightningTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('lightning');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Tesla coil body
    turret.add(mesh(tg.body, mat(c, { emissive: c, emissiveIntensity: 0.3 }), {
        sx: 9, sy: 13, sz: 9, py: H * 0.1,
    }));
    // 3 conductor prongs
    for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i;
        turret.add(mesh(g.cyl, mat(0xdddddd, { metalness: 0.2 }), {
            sx: 2, sy: 14, sz: 2,
            px: Math.cos(a) * 8, py: H * 0.65, pz: Math.sin(a) * 8,
            rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3,
        }));
    }
    return turret;
}

function superlightningTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('superlightning');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Enhanced Tesla coil body
    turret.add(mesh(tg.body, mat(c, { emissive: c, emissiveIntensity: 0.4 }), {
        sx: 10, sy: 15, sz: 10, py: H * 0.1,
    }));
    // Plasma sphere on top
    turret.add(mesh(g.sphere, mat(0xeeddff, { emissive: 0xbb88ff, emissiveIntensity: 0.8, roughness: 0.1 }), {
        sx: 5, sy: 5, sz: 5, py: H * 0.85,
    }));
    // 5 conductor prongs
    for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i;
        turret.add(mesh(g.cyl, mat(0xccccee, { metalness: 0.2 }), {
            sx: 1.8, sy: 16, sz: 1.8,
            px: Math.cos(a) * 10, py: H * 0.65, pz: Math.sin(a) * 10,
            rz: Math.cos(a) * 0.25, rx: -Math.sin(a) * 0.25,
        }));
    }
    return turret;
}

function sniperTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('sniper');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Sleek lathed body
    turret.add(mesh(tg.body, mat(c, { metalness: 0.5 }), {
        sx: 8, sy: 12, sz: 8, py: H * 0.12,
    }));
    // Long barrel
    turret.add(mesh(g.cyl, mat(0x999999, { metalness: 0.3 }), {
        sx: 2.5, sy: 28, sz: 2.5, py: H * 0.45, rx: Math.PI / 2, pz: 12,
    }));
    // Scope
    turret.add(mesh(g.box, mat(0x666666, { metalness: 0.2 }), {
        sx: 3, sy: 5, sz: 6, px: 5, py: H * 0.58, pz: -2,
    }));
    return turret;
}

function misslesniperTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('missilesniper');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Bulky launcher body
    turret.add(mesh(tg.body, mat(c, { metalness: 0.5 }), {
        sx: 12, sy: 13, sz: 12, py: H * 0.1,
    }));
    // 4 missile tubes
    const offsets = [[-4, 3], [-4, -3], [4, 3], [4, -3]];
    for (const [ox, oz] of offsets) {
        turret.add(mesh(g.cyl, mat(0x999999, { metalness: 0.2 }), {
            sx: 3, sy: 16, sz: 3, px: ox, py: H * 0.5, pz: oz + 8,
            rx: Math.PI / 2,
        }));
    }
    return turret;
}

function titanTurret(color) {
    const g = getGeo();
    const tg = getTowerGeo('titan');
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Wide fortress body with gold emissive
    turret.add(mesh(tg.body, mat(c, { emissive: c, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.3 }), {
        sx: 12, sy: 14, sz: 12, py: H * 0.08,
    }));
    // Wide barrel — gold metallic
    turret.add(mesh(g.cyl, mat(0xd4af37, { metalness: 0.4, emissive: 0x8b7328, emissiveIntensity: 0.25 }), {
        sx: 5, sy: 20, sz: 5, py: H * 0.45, rx: Math.PI / 2, pz: 10,
    }));
    // Torus ring emitter at barrel tip — golden
    turret.add(mesh(g.torus, mat(0xffd700, { emissive: 0xcc9900, emissiveIntensity: 0.6 }), {
        sx: 7, sy: 7, sz: 7, pz: 20, py: H * 0.45,
    }));
    // 3 orbiting crystal ornaments (golden octahedra)
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3;
        turret.add(mesh(g.oct, mat(0xffcc33, { emissive: 0xcc9900, emissiveIntensity: 0.5 }), {
            sx: 2.5, sy: 2.5, sz: 2.5,
            px: Math.cos(angle) * 10, py: H * 0.7, pz: Math.sin(angle) * 10,
        }));
    }
    return turret;
}

// ── Factory map ───────────────────────────────────────────────
const TURRET_FACTORY = {
    arrow: arrowTurret,
    firearrow: firearrowTurret,
    cannon: cannonTurret,
    bicannon: bicannonTurret,
    frost: frostTurret,
    deepfrost: deepfrostTurret,
    lightning: lightningTurret,
    superlightning: superlightningTurret,
    sniper: sniperTurret,
    missilesniper: misslesniperTurret,
    titan: titanTurret,
};

// ── GLTF tower creation ───────────────────────────────────────

function createTowerFromGLTF(type, level) {
    const def = TOWER_TYPES[type];
    if (!def) return null;

    const clone = getModelClone(type);
    if (!clone) return null;

    const color = new THREE.Color(def.color);
    const group = new THREE.Group();
    const maxed = level >= 2;

    // Try to find named "Turret" child; if not found, treat whole model as turret
    let turret = null;
    let base = new THREE.Group();
    clone.traverse(child => {
        if (child.name === 'Turret' && !turret) turret = child;
    });

    if (turret) {
        turret.parent?.remove(turret);
        base = clone;
    } else {
        turret = clone;
    }

    // Colorize all materials with tower's color + emissive self-glow
    const tintGroup = (grp) => {
        grp.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.color.lerp(color, 0.4);
                child.material.emissive = color.clone();
                child.material.emissiveIntensity = maxed ? 0.35 : 0.15;
            }
        });
    };
    tintGroup(turret);
    tintGroup(base);

    group.add(base);
    group.add(turret);

    return { group, turret, base };
}

/**
 * Creates a complete tower mesh group for the given tower type and level.
 * Uses GLTF model if available, otherwise enhanced procedural geometry.
 * Returns { group, turret, base } for easy access.
 */
export function createTowerMesh(type, level) {
    const def = TOWER_TYPES[type];
    if (!def) return null;

    // Try GLTF first
    if (isLoaded() && hasModel(type)) {
        const result = createTowerFromGLTF(type, level);
        if (result) return result;
    }

    // Procedural fallback
    const group = new THREE.Group();
    const factory = TURRET_FACTORY[type];
    const turret = factory ? factory(def.color) : arrowTurret(def.color);
    group.add(turret);

    return { group, turret, base: group };
}

/**
 * Updates tower mesh materials/geometry when level changes.
 */
export function updateTowerLevel(towerMesh, type, level) {
    return createTowerMesh(type, level);
}
