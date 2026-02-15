import * as THREE from 'three';
import { CELL, ENEMY_TYPES } from '../constants.js';

const H = CELL * 0.5; // enemy height unit

// Shared geometries (created once, reused)
let _geoCache = null;
function getGeo() {
    if (_geoCache) return _geoCache;
    _geoCache = {
        dodeca: new THREE.DodecahedronGeometry(1, 0),
        cone: new THREE.ConeGeometry(1, 1, 4),
        box: new THREE.BoxGeometry(1, 1, 1),
        sphere: new THREE.SphereGeometry(1, 8, 6),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
        oct: new THREE.OctahedronGeometry(1),
        circle: new THREE.CircleGeometry(1, 12),
    };
    return _geoCache;
}

function mat(color, opts = {}) {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.35,
        metalness: opts.metalness ?? 0.05,
        // Self-illumination so enemies are vibrant and visible at any angle
        emissive: opts.emissive ?? c,
        emissiveIntensity: opts.emissiveIntensity ?? 0.25,
    });
}

function m(geo, material, { sx = 1, sy = 1, sz = 1, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0 } = {}) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(px, py, pz);
    if (rx) mesh.rotation.x = rx;
    if (ry) mesh.rotation.y = ry;
    if (rz) mesh.rotation.z = rz;
    return mesh;
}

// ── Enemy body factories ──────────────────────────────────────

function gruntBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    body.add(m(g.dodeca, mat(color), {
        sx: r, sy: H * 0.6, sz: r, py: H * 0.35,
    }));
    return body;
}

function runnerBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Diamond — two cones tip-to-tip
    body.add(m(g.cone, mat(color), {
        sx: r * 0.8, sy: H * 0.5, sz: r * 0.8, py: H * 0.4,
    }));
    body.add(m(g.cone, mat(color, { roughness: 0.6 }), {
        sx: r * 0.7, sy: H * 0.3, sz: r * 0.7, py: H * 0.1, rx: Math.PI,
    }));
    return body;
}

function tankBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Chunky box
    body.add(m(g.box, mat(color, { roughness: 0.8, metalness: 0.4 }), {
        sx: r * 1.6, sy: H * 0.7, sz: r * 1.6, py: H * 0.35,
    }));
    // Armor plate
    body.add(m(g.box, mat(0x999999, { metalness: 0.2 }), {
        sx: r * 1.2, sy: H * 0.15, sz: r * 1.2, py: H * 0.75,
    }));
    return body;
}

function healerBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    const material = mat(color, { emissive: c, emissiveIntensity: 0.3 });
    // Cross — two intersecting boxes
    body.add(m(g.box, material, {
        sx: r * 1.6, sy: H * 0.5, sz: r * 0.5, py: H * 0.3,
    }));
    body.add(m(g.box, material.clone(), {
        sx: r * 0.5, sy: H * 0.5, sz: r * 1.6, py: H * 0.3,
    }));
    return body;
}

function bossBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    // Large dodecahedron
    body.add(m(g.dodeca, mat(color, { emissive: c, emissiveIntensity: 0.2 }), {
        sx: r, sy: H * 0.8, sz: r, py: H * 0.45,
    }));
    // Crown — 3 gold cones
    for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i;
        body.add(m(g.cone, mat(0xffd700, { emissive: 0xffd700, emissiveIntensity: 0.3 }), {
            sx: 3, sy: 8, sz: 3,
            px: Math.cos(a) * r * 0.4, py: H * 0.95, pz: Math.sin(a) * r * 0.4,
        }));
    }
    return body;
}

function swarmBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    body.add(m(g.cone, mat(color), {
        sx: r * 0.9, sy: H * 0.4, sz: r * 0.9, py: H * 0.2,
    }));
    return body;
}

function wobblerBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    body.add(m(g.sphere, mat(color, { roughness: 0.3 }), {
        sx: r, sy: H * 0.6, sz: r, py: H * 0.35,
    }));
    return body;
}

function flyingBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    // Diamond body
    body.add(m(g.oct, mat(color, { emissive: c, emissiveIntensity: 0.2 }), {
        sx: r * 0.7, sy: H * 0.5, sz: r * 0.7, py: H * 0.35,
    }));
    // Wings — flat boxes
    const wingMat = mat(color, { roughness: 0.7 });
    body.add(m(g.box, wingMat, {
        sx: r * 2.2, sy: 1, sz: r * 0.6, py: H * 0.35,
    }));
    return body;
}

function megabossBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Octagonal prism
    body.add(m(g.cyl, mat(color, { emissive: 0xff2200, emissiveIntensity: 0.2, metalness: 0.4 }), {
        sx: r, sy: H * 0.9, sz: r, py: H * 0.45,
    }));
    // 4 spike horns
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 / 4) * i + Math.PI / 4;
        body.add(m(g.cone, mat(0xff4400, { emissive: 0xff2200, emissiveIntensity: 0.4 }), {
            sx: 4, sy: 12, sz: 4,
            px: Math.cos(a) * r * 0.7, py: H * 1.0, pz: Math.sin(a) * r * 0.7,
        }));
    }
    // Dark inner core
    body.add(m(g.sphere, mat(0x440000, { emissive: 0xaa0000, emissiveIntensity: 0.6 }), {
        sx: r * 0.5, sy: H * 0.4, sz: r * 0.5, py: H * 0.45,
    }));
    return body;
}

// ── Factory dispatch ──────────────────────────────────────────
const BODY_FACTORY = {
    grunt: gruntBody,
    runner: runnerBody,
    tank: tankBody,
    healer: healerBody,
    boss: bossBody,
    swarm: swarmBody,
    wobbler: wobblerBody,
    flying: flyingBody,
    megaboss: megabossBody,
};

/**
 * Creates a 3D mesh group for the given enemy type.
 * Returns { group, body, shadow }.
 */
export function createEnemyMesh(type) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;

    const color = def.color;
    const r = def.radius;
    const group = new THREE.Group();

    // Body
    const factory = BODY_FACTORY[type];
    const body = factory ? factory(color, r) : gruntBody(color, r);
    group.add(body);

    // Shadow — flat dark circle at ground
    const g = getGeo();
    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.25,
    });
    const shadow = new THREE.Mesh(g.circle, shadowMat);
    shadow.scale.set(r * 1.1, r * 1.1, 1);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.5;
    group.add(shadow);

    return { group, body, shadow };
}
