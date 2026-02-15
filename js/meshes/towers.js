import * as THREE from 'three';
import { CELL, TOWER_TYPES } from '../constants.js';

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
        hexPrism: new THREE.CylinderGeometry(1, 1, 1, 6),
        octPrism: new THREE.CylinderGeometry(1, 1, 1, 8),
    };
    return _geoCache;
}

function mat(color, opts = {}) {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.4,
        metalness: opts.metalness ?? 0.1,
        // Default subtle self-glow so tower parts are always readable
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

// ── Base platform (shared by all towers) ──────────────────────
function createBase(color, level) {
    const g = getGeo();
    const maxed = level >= 2;
    const group = new THREE.Group();

    // Thin rim — just enough to lift the turret, doesn't obscure the 2D base on terrain
    const rimColor = new THREE.Color(color);
    const rim = mesh(g.cyl, mat(rimColor, {
        emissive: rimColor, emissiveIntensity: maxed ? 0.5 : 0.2,
        roughness: 0.3, metalness: 0.2,
    }), {
        sx: CELL * 0.42, sy: H * 0.12, sz: CELL * 0.42,
        py: H * 0.06,
    });
    group.add(rim);

    // Accent ring — bright colored glow, key visual identifier
    const ringColor = new THREE.Color(color);
    const ring = mesh(g.torus, mat(ringColor, {
        emissive: ringColor, emissiveIntensity: maxed ? 0.8 : 0.4,
        metalness: 0.3, roughness: 0.2,
    }), {
        sx: CELL * 0.4, sy: CELL * 0.4, sz: CELL * 0.4,
        py: H * 0.14,
        rx: Math.PI / 2,
    });
    group.add(ring);

    return group;
}

// ── Turret factories per type ─────────────────────────────────

function arrowTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Body
    turret.add(mesh(g.box, mat(c, { metalness: 0.4 }), {
        sx: 10, sy: 10, sz: 16, pz: -2, py: H * 0.45,
    }));
    // Rail
    turret.add(mesh(g.cyl, mat(0xaaaaaa, { metalness: 0.2 }), {
        sx: 2, sy: 20, sz: 2, py: H * 0.45, rx: Math.PI / 2,
    }));
    // Tip
    turret.add(mesh(g.cone, mat(0xdddddd, { metalness: 0.2 }), {
        sx: 3, sy: 8, sz: 3, pz: 14, py: H * 0.45, rx: Math.PI / 2,
    }));
    return turret;
}

function firearrowTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Body
    turret.add(mesh(g.box, mat(c, { metalness: 0.4, emissive: 0xff4400, emissiveIntensity: 0.3 }), {
        sx: 12, sy: 11, sz: 18, pz: -2, py: H * 0.45,
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
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Body
    turret.add(mesh(g.box, mat(c, { roughness: 0.7, metalness: 0.4 }), {
        sx: 14, sy: 12, sz: 14, py: H * 0.45,
    }));
    // Barrel (tapered)
    turret.add(mesh(g.cyl, mat(0x999999, { metalness: 0.3 }), {
        sx: 5, sy: 20, sz: 5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    return turret;
}

function bicannonTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Chassis
    turret.add(mesh(g.box, mat(c, { roughness: 0.7, metalness: 0.5 }), {
        sx: 16, sy: 12, sz: 14, py: H * 0.45,
    }));
    // Barrel left
    turret.add(mesh(g.cyl, mat(0x888888, { metalness: 0.3 }), {
        sx: 4, sy: 22, sz: 4, px: 5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    // Barrel right
    turret.add(mesh(g.cyl, mat(0x888888, { metalness: 0.3 }), {
        sx: 4, sy: 22, sz: 4, px: -5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    return turret;
}

function frostTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Crystal
    turret.add(mesh(g.oct, mat(c, { emissive: c, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.1 }), {
        sx: 10, sy: 14, sz: 10, py: H * 0.55,
    }));
    // Barrel
    turret.add(mesh(g.cyl, mat(0x88bbdd, { metalness: 0.5 }), {
        sx: 2.5, sy: 16, sz: 2.5, py: H * 0.45, rx: Math.PI / 2, pz: 6,
    }));
    return turret;
}

function deepfrostTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Hexagonal prism core
    turret.add(mesh(g.hexPrism, mat(c, { emissive: c, emissiveIntensity: 0.5, roughness: 0.15 }), {
        sx: 10, sy: 16, sz: 10, py: H * 0.55,
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
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Sphere body
    turret.add(mesh(g.sphere, mat(c, { emissive: c, emissiveIntensity: 0.3 }), {
        sx: 10, sy: 10, sz: 10, py: H * 0.5,
    }));
    // 3 prongs
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
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Octagonal prism
    turret.add(mesh(g.octPrism, mat(c, { emissive: c, emissiveIntensity: 0.4 }), {
        sx: 11, sy: 14, sz: 11, py: H * 0.5,
    }));
    // Plasma sphere on top
    turret.add(mesh(g.sphere, mat(0xeeddff, { emissive: 0xbb88ff, emissiveIntensity: 0.8, roughness: 0.1 }), {
        sx: 5, sy: 5, sz: 5, py: H * 0.85,
    }));
    // 5 prongs
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
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Long body
    turret.add(mesh(g.box, mat(c, { metalness: 0.5 }), {
        sx: 8, sy: 10, sz: 24, py: H * 0.45, pz: 2,
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
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Launcher body
    turret.add(mesh(g.box, mat(c, { metalness: 0.5 }), {
        sx: 16, sy: 12, sz: 18, py: H * 0.45,
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

function pulsecannonTurret(color) {
    const g = getGeo();
    const turret = new THREE.Group();
    const c = new THREE.Color(color);
    // Sphere body
    turret.add(mesh(g.sphere, mat(c, { emissive: c, emissiveIntensity: 0.3, roughness: 0.3 }), {
        sx: 11, sy: 11, sz: 11, py: H * 0.5,
    }));
    // Wide barrel
    turret.add(mesh(g.cyl, mat(0x44aaaa, { metalness: 0.2, emissive: 0x115555, emissiveIntensity: 0.3 }), {
        sx: 5, sy: 18, sz: 5, py: H * 0.45, rx: Math.PI / 2, pz: 8,
    }));
    // Ring emitter at tip
    turret.add(mesh(g.torus, mat(0x44dddd, { emissive: 0x22bbbb, emissiveIntensity: 0.5 }), {
        sx: 6, sy: 6, sz: 6, pz: 18, py: H * 0.45,
    }));
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
    pulsecannon: pulsecannonTurret,
};

/**
 * Creates a complete tower mesh group for the given tower type and level.
 * Returns { group, turret, base } for easy access.
 */
export function createTowerMesh(type, level) {
    const def = TOWER_TYPES[type];
    if (!def) return null;

    const color = def.color;
    const group = new THREE.Group();

    // Base platform
    const base = createBase(color, level);
    group.add(base);

    // Turret (type-specific)
    const factory = TURRET_FACTORY[type];
    const turret = factory ? factory(color) : arrowTurret(color);
    group.add(turret);

    return { group, turret, base };
}

/**
 * Updates tower mesh materials/geometry when level changes.
 * Cheaper than recreating: just swaps the accent ring emissive intensity.
 */
export function updateTowerLevel(towerMesh, type, level) {
    // For simplicity in Phase 2, just recreate. Optimize later if needed.
    return createTowerMesh(type, level);
}
