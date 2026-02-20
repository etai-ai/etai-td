import * as THREE from 'three';
import { CELL, ENEMY_TYPES } from '../constants.js';

const H = CELL * 0.5; // enemy height unit

// Shared basic geometries (created once, reused)
let _geoCache = null;
function getGeo() {
    if (_geoCache) return _geoCache;
    _geoCache = {
        box: new THREE.BoxGeometry(1, 1, 1),
        sphere: new THREE.SphereGeometry(1, 8, 6),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
        cone: new THREE.ConeGeometry(1, 1, 6),
        oct: new THREE.OctahedronGeometry(1),
        circle: new THREE.CircleGeometry(1, 12),
        capsule: new THREE.CapsuleGeometry(1, 1, 4, 8),
        torus: new THREE.TorusGeometry(1, 0.2, 6, 16),
    };
    return _geoCache;
}

// Per-type geometry cache (complex geometries created once per type)
const _typeGeoCache = new Map();

function getTypeGeo(type) {
    if (_typeGeoCache.has(type)) return _typeGeoCache.get(type);
    let geo = null;

    switch (type) {
        case 'grunt': {
            // Stocky warrior/golem profile
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.55, 0.02),
                new THREE.Vector2(0.5, 0.15),   // ankle
                new THREE.Vector2(0.35, 0.3),   // waist
                new THREE.Vector2(0.65, 0.55),   // shoulders
                new THREE.Vector2(0.3, 0.72),    // neck
                new THREE.Vector2(0.38, 0.82),   // head
                new THREE.Vector2(0.2, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 10) };
            break;
        }
        case 'runner': {
            // Aerodynamic teardrop profile
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.15, 0.05),
                new THREE.Vector2(0.45, 0.2),
                new THREE.Vector2(0.5, 0.4),    // widest
                new THREE.Vector2(0.35, 0.65),
                new THREE.Vector2(0.15, 0.85),
                new THREE.Vector2(0.05, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            geo = { body: new THREE.LatheGeometry(pts, 8) };
            break;
        }
        case 'tank': {
            // Armored dome hull
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.8, 0),
                new THREE.Vector2(0.85, 0.1),
                new THREE.Vector2(0.7, 0.35),
                new THREE.Vector2(0.45, 0.55),
                new THREE.Vector2(0.2, 0.65),
                new THREE.Vector2(0, 0.7),
            ];
            // Beveled track cross-section
            const trackShape = new THREE.Shape();
            trackShape.moveTo(-0.5, -0.1);
            trackShape.lineTo(0.5, -0.1);
            trackShape.lineTo(0.5, 0.1);
            trackShape.lineTo(-0.5, 0.1);
            trackShape.lineTo(-0.5, -0.1);
            geo = {
                hull: new THREE.LatheGeometry(pts, 10),
                track: new THREE.ExtrudeGeometry(trackShape, {
                    depth: 1.0, bevelEnabled: true, bevelThickness: 0.04,
                    bevelSize: 0.04, bevelSegments: 2,
                }),
            };
            break;
        }
        case 'healer': {
            // Beveled 3D cross shape
            const w = 0.18, l = 0.5;
            const crossShape = new THREE.Shape();
            crossShape.moveTo(-w, -l);
            crossShape.lineTo(w, -l);
            crossShape.lineTo(w, -w);
            crossShape.lineTo(l, -w);
            crossShape.lineTo(l, w);
            crossShape.lineTo(w, w);
            crossShape.lineTo(w, l);
            crossShape.lineTo(-w, l);
            crossShape.lineTo(-w, w);
            crossShape.lineTo(-l, w);
            crossShape.lineTo(-l, -w);
            crossShape.lineTo(-w, -w);
            crossShape.lineTo(-w, -l);
            geo = {
                cross: new THREE.ExtrudeGeometry(crossShape, {
                    depth: 0.4, bevelEnabled: true, bevelThickness: 0.06,
                    bevelSize: 0.06, bevelSegments: 2,
                }),
            };
            break;
        }
        case 'boss': {
            // Ornate chess-piece profile (queen-like)
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.6, 0),
                new THREE.Vector2(0.65, 0.05),
                new THREE.Vector2(0.5, 0.1),    // base trim
                new THREE.Vector2(0.25, 0.18),   // narrow stem
                new THREE.Vector2(0.28, 0.35),
                new THREE.Vector2(0.45, 0.5),    // bulge
                new THREE.Vector2(0.42, 0.62),
                new THREE.Vector2(0.5, 0.72),    // crown base
                new THREE.Vector2(0.42, 0.78),
                new THREE.Vector2(0.25, 0.88),
                new THREE.Vector2(0.12, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            // Crown prong triangle
            const crownShape = new THREE.Shape();
            crownShape.moveTo(-0.12, 0);
            crownShape.lineTo(0.12, 0);
            crownShape.lineTo(0, 0.3);
            crownShape.lineTo(-0.12, 0);
            geo = {
                body: new THREE.LatheGeometry(pts, 12),
                crown: new THREE.ExtrudeGeometry(crownShape, {
                    depth: 0.05, bevelEnabled: true, bevelThickness: 0.02,
                    bevelSize: 0.02, bevelSegments: 1,
                }),
            };
            break;
        }
        case 'wobbler': {
            // Noise-displaced sphere for organic lumpy blob
            const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
            const pos = sphereGeo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
                const len = Math.sqrt(x * x + y * y + z * z) || 1;
                const noise = 0.15 * (
                    Math.sin(x * 5.1 + y * 3.2) * Math.cos(z * 4.3 + x * 2.1) +
                    Math.sin(y * 6.7 - z * 2.4) * 0.5
                );
                const s = 1 + noise;
                pos.setXYZ(i, (x / len) * s, (y / len) * s, (z / len) * s);
            }
            sphereGeo.computeVertexNormals();
            geo = { body: sphereGeo };
            break;
        }
        case 'flying': {
            // Feathered wing profile (bezier outline)
            const wingShape = new THREE.Shape();
            wingShape.moveTo(0, 0);
            wingShape.bezierCurveTo(0.25, 0.14, 0.6, 0.2, 1.0, 0.06);
            wingShape.lineTo(0.85, 0);
            wingShape.bezierCurveTo(0.55, 0.04, 0.2, 0.03, 0, 0);
            geo = {
                wing: new THREE.ExtrudeGeometry(wingShape, {
                    depth: 0.04, bevelEnabled: true, bevelThickness: 0.015,
                    bevelSize: 0.015, bevelSegments: 1,
                }),
            };
            break;
        }
        case 'megaboss': {
            // Imposing lathed body profile
            const pts = [
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0.7, 0),
                new THREE.Vector2(0.75, 0.05),
                new THREE.Vector2(0.6, 0.1),
                new THREE.Vector2(0.35, 0.18),  // waist
                new THREE.Vector2(0.5, 0.4),
                new THREE.Vector2(0.6, 0.55),   // chest
                new THREE.Vector2(0.5, 0.68),
                new THREE.Vector2(0.35, 0.78),
                new THREE.Vector2(0.4, 0.88),   // head
                new THREE.Vector2(0.25, 0.95),
                new THREE.Vector2(0, 1.0),
            ];
            // 4 tapering tentacle curves
            const tentacles = [];
            for (let i = 0; i < 4; i++) {
                const a = (Math.PI * 2 / 4) * i + Math.PI / 4;
                const ca = Math.cos(a), sa = Math.sin(a);
                const curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(ca * 0.5, 0.2, sa * 0.5),
                    new THREE.Vector3(ca * 0.8, 0.08, sa * 0.8),
                    new THREE.Vector3(Math.cos(a + 0.3) * 1.1, 0, Math.sin(a + 0.3) * 1.1),
                    new THREE.Vector3(Math.cos(a + 0.5) * 1.3, -0.05, Math.sin(a + 0.5) * 1.3),
                ]);
                tentacles.push(new THREE.TubeGeometry(curve, 8, 0.06, 5, false));
            }
            geo = {
                body: new THREE.LatheGeometry(pts, 12),
                tentacles,
            };
            break;
        }
    }
    if (geo) _typeGeoCache.set(type, geo);
    return geo;
}

function mat(color, opts = {}) {
    const c = new THREE.Color(color);
    const props = {
        color,
        roughness: opts.roughness ?? 0.35,
        metalness: opts.metalness ?? 0.05,
        emissive: opts.emissive ?? c,
        emissiveIntensity: opts.emissiveIntensity ?? 0.25,
    };
    if (opts.transparent) {
        props.transparent = true;
        props.opacity = opts.opacity ?? 0.5;
        props.depthWrite = false;
    }
    return new THREE.MeshStandardMaterial(props);
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

// ── Enhanced enemy body factories ────────────────────────

function gruntBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('grunt');
    const body = new THREE.Group();

    // Stocky warrior golem body (LatheGeometry)
    body.add(m(tg.body, mat(color), {
        sx: r * 1.05, sy: H * 0.6, sz: r * 1.05, py: H * 0.02,
    }));
    // Shield plate on back
    body.add(m(g.box, mat(color, { roughness: 0.7, metalness: 0.3, emissiveIntensity: 0.1 }), {
        sx: r * 0.65, sy: H * 0.28, sz: 2, py: H * 0.24, pz: r * 0.55,
    }));
    return body;
}

function runnerBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('runner');
    const body = new THREE.Group();

    // Sleek teardrop body
    body.add(m(tg.body, mat(color), {
        sx: r * 1.0, sy: H * 0.55, sz: r * 1.0, py: H * 0.02,
    }));
    // Swept-back fins (directional cues)
    const finMat = mat(color, { roughness: 0.5, metalness: 0.2, emissiveIntensity: 0.15 });
    body.add(m(g.box, finMat, {
        sx: 2, sy: H * 0.14, sz: r * 0.6,
        px: r * 0.55, py: H * 0.2, pz: r * 0.25, ry: 0.3,
    }));
    body.add(m(g.box, finMat.clone(), {
        sx: 2, sy: H * 0.14, sz: r * 0.6,
        px: -r * 0.55, py: H * 0.2, pz: r * 0.25, ry: -0.3,
    }));
    return body;
}

function tankBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('tank');
    const body = new THREE.Group();
    const armorMat = mat(color, { roughness: 0.7, metalness: 0.4 });
    const darkMat = mat(0x333333, { roughness: 0.9, metalness: 0.1, emissiveIntensity: 0.05 });
    const metalMat = mat(0x888888, { roughness: 0.5, metalness: 0.6, emissiveIntensity: 0.1 });

    // Armored dome hull (LatheGeometry)
    body.add(m(tg.hull, armorMat, {
        sx: r * 0.75, sy: H * 0.35, sz: r * 0.7, py: H * 0.1,
    }));
    // Beveled tracks (ExtrudeGeometry)
    body.add(m(tg.track, darkMat, {
        sx: r * 0.25, sy: H * 0.15, sz: r * 1.1,
        px: -r * 0.45, py: H * 0.07,
    }));
    body.add(m(tg.track, darkMat.clone(), {
        sx: r * 0.25, sy: H * 0.15, sz: r * 1.1,
        px: r * 0.45, py: H * 0.07,
    }));
    // Turret dome on top
    body.add(m(g.cyl, metalMat, {
        sx: r * 0.33, sy: H * 0.13, sz: r * 0.33, py: H * 0.36,
    }));
    // Barrel
    body.add(m(g.cyl, metalMat.clone(), {
        sx: 2, sy: r * 0.6, sz: 2, py: H * 0.36, pz: -r * 0.42,
        rx: Math.PI / 2,
    }));
    return body;
}

function healerBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('healer');
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    const crossMat = mat(color, { emissive: c, emissiveIntensity: 0.35 });

    // Beveled 3D cross (ExtrudeGeometry), laid flat (rx = -PI/2) so face is visible from above
    body.add(m(tg.cross, crossMat, {
        sx: r * 1.3, sy: r * 1.3, sz: H * 0.8,
        py: H * 0.15, rx: -Math.PI / 2,
    }));
    // Floating glow orb above
    body.add(m(g.sphere, mat(0xffffff, {
        emissive: c, emissiveIntensity: 0.6, roughness: 0.1,
    }), {
        sx: r * 0.35, sy: r * 0.35, sz: r * 0.35, py: H * 0.6,
    }));
    return body;
}

function bossBody(color, r) {
    const tg = getTypeGeo('boss');
    const body = new THREE.Group();
    const c = new THREE.Color(color);

    // Ornate chess-piece body (LatheGeometry)
    body.add(m(tg.body, mat(color, { emissive: c, emissiveIntensity: 0.2 }), {
        sx: r * 0.75, sy: H * 0.9, sz: r * 0.75, py: H * 0.02,
    }));
    // Gold crown prongs (5 around the top, ExtrudeGeometry triangles)
    const goldMat = mat(0xffd700, { emissive: 0xffd700, emissiveIntensity: 0.35 });
    for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i;
        body.add(m(tg.crown, goldMat.clone(), {
            sx: r * 0.45, sy: r * 0.45, sz: r * 0.45,
            px: Math.cos(a) * r * 0.35, py: H * 0.82, pz: Math.sin(a) * r * 0.35,
            ry: -a,
        }));
    }
    return body;
}

function swarmBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const bugMat = mat(color);

    // Head (front capsule)
    body.add(m(g.capsule, bugMat, {
        sx: r * 0.45, sy: r * 0.25, sz: r * 0.45,
        py: H * 0.22, pz: -r * 0.45,
    }));
    // Thorax (middle capsule)
    body.add(m(g.capsule, bugMat.clone(), {
        sx: r * 0.55, sy: r * 0.3, sz: r * 0.55,
        py: H * 0.22,
    }));
    // Abdomen (larger rear capsule)
    body.add(m(g.capsule, bugMat.clone(), {
        sx: r * 0.6, sy: r * 0.35, sz: r * 0.6,
        py: H * 0.22, pz: r * 0.5,
    }));
    // Translucent wings (angled boxes)
    const wingMat = mat(color, {
        roughness: 0.2, emissiveIntensity: 0.15,
        transparent: true, opacity: 0.45,
    });
    wingMat.userData.persistTransparent = true;
    wingMat.userData.baseOpacity = 0.45;
    body.add(m(g.box, wingMat, {
        sx: r * 1.6, sy: 0.5, sz: r * 0.5,
        px: r * 0.4, py: H * 0.35, rz: 0.2,
    }));
    const wingMat2 = wingMat.clone();
    wingMat2.userData = { persistTransparent: true, baseOpacity: 0.45 };
    body.add(m(g.box, wingMat2, {
        sx: r * 1.6, sy: 0.5, sz: r * 0.5,
        px: -r * 0.4, py: H * 0.35, rz: -0.2,
    }));
    // Antennae (thin cylinders)
    const antMat = mat(color, { emissiveIntensity: 0.1 });
    body.add(m(g.cyl, antMat, {
        sx: 0.6, sy: r * 0.55, sz: 0.6,
        px: r * 0.15, py: H * 0.35, pz: -r * 0.6,
        rx: -0.5, rz: 0.3,
    }));
    body.add(m(g.cyl, antMat.clone(), {
        sx: 0.6, sy: r * 0.55, sz: 0.6,
        px: -r * 0.15, py: H * 0.35, pz: -r * 0.6,
        rx: -0.5, rz: -0.3,
    }));
    return body;
}

function wobblerBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('wobbler');
    const body = new THREE.Group();

    // Lumpy organic blob (noise-displaced sphere)
    body.add(m(tg.body, mat(color, { roughness: 0.25 }), {
        sx: r * 0.7, sy: H * 0.5, sz: r * 0.7, py: H * 0.28,
    }));
    // Inner nucleus sphere (visible through lumps)
    body.add(m(g.sphere, mat(color, {
        emissive: new THREE.Color(color), emissiveIntensity: 0.5, roughness: 0.1,
    }), {
        sx: r * 0.3, sy: H * 0.2, sz: r * 0.3, py: H * 0.28,
    }));
    return body;
}

function flyingBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('flying');
    const body = new THREE.Group();
    const c = new THREE.Color(color);

    // Diamond body (octahedron)
    body.add(m(g.oct, mat(color, { emissive: c, emissiveIntensity: 0.25 }), {
        sx: r * 0.65, sy: H * 0.45, sz: r * 0.65, py: H * 0.35,
    }));
    // Shaped feathered wings (ExtrudeGeometry, mirrored)
    const wingMat = mat(color, { roughness: 0.6, emissiveIntensity: 0.15 });
    body.add(m(tg.wing, wingMat, {
        sx: r * 2.0, sy: r * 1.2, sz: H * 0.25,
        px: r * 0.3, py: H * 0.33,
        ry: Math.PI / 2, rz: 0.15,
    }));
    body.add(m(tg.wing, wingMat.clone(), {
        sx: r * 2.0, sy: r * 1.2, sz: H * 0.25,
        px: -r * 0.3, py: H * 0.33,
        ry: -Math.PI / 2, rz: -0.15,
    }));
    // Tail triangle
    body.add(m(g.cone, mat(color, { emissiveIntensity: 0.1 }), {
        sx: r * 0.3, sy: r * 0.5, sz: r * 0.3,
        py: H * 0.25, pz: r * 0.65, rx: 0.4,
    }));
    return body;
}

function megabossBody(color, r) {
    const g = getGeo();
    const tg = getTypeGeo('megaboss');
    const body = new THREE.Group();

    // Imposing lathed body
    body.add(m(tg.body, mat(color, {
        emissive: 0xff2200, emissiveIntensity: 0.2, metalness: 0.3,
    }), {
        sx: r * 0.7, sy: H * 0.95, sz: r * 0.7, py: H * 0.02,
    }));
    // 4 tentacles (TubeGeometry)
    const tentMat = mat(0xaa2200, { emissive: 0xff3300, emissiveIntensity: 0.3 });
    for (const tentGeo of tg.tentacles) {
        body.add(m(tentGeo, tentMat.clone(), {
            sx: r * 0.8, sy: H * 0.5, sz: r * 0.8, py: H * 0.05,
        }));
    }
    // 4 spike horns on top
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 / 4) * i + Math.PI / 4;
        body.add(m(g.cone, mat(0xff4400, { emissive: 0xff2200, emissiveIntensity: 0.4 }), {
            sx: 4, sy: 12, sz: 4,
            px: Math.cos(a) * r * 0.5, py: H * 0.95, pz: Math.sin(a) * r * 0.5,
        }));
    }
    // Inner core sphere
    body.add(m(g.sphere, mat(0x440000, { emissive: 0xaa0000, emissiveIntensity: 0.6 }), {
        sx: r * 0.35, sy: H * 0.3, sz: r * 0.35, py: H * 0.45,
    }));
    // Aura torus ring
    const auraMat = mat(0xff1100, {
        emissive: 0xff0000, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.4,
    });
    auraMat.userData.persistTransparent = true;
    auraMat.userData.baseOpacity = 0.4;
    body.add(m(g.torus, auraMat, {
        sx: r * 0.8, sy: r * 0.8, sz: r * 0.8,
        py: H * 0.25, rx: Math.PI / 2,
    }));
    return body;
}

// ── World-Specific Enemy Body Factories ──────────────────────

function forestStalkerBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Sleek chevron body — angular predator
    body.add(m(g.cone, mat(color, { emissiveIntensity: 0.2 }), {
        sx: r * 0.8, sy: H * 0.6, sz: r * 1.2, py: H * 0.2,
    }));
    // Angular side fins
    const finMat = mat(color, { roughness: 0.6, emissiveIntensity: 0.15 });
    body.add(m(g.box, finMat, {
        sx: r * 0.8, sy: H * 0.08, sz: r * 0.4,
        px: r * 0.5, py: H * 0.25, rz: 0.3,
    }));
    body.add(m(g.box, finMat.clone(), {
        sx: r * 0.8, sy: H * 0.08, sz: r * 0.4,
        px: -r * 0.5, py: H * 0.25, rz: -0.3,
    }));
    return body;
}

function stormHeraldBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    // Crown-shaped main body
    body.add(m(g.cyl, mat(color, { emissive: c, emissiveIntensity: 0.25 }), {
        sx: r * 0.6, sy: H * 0.4, sz: r * 0.6, py: H * 0.15,
    }));
    // Crown spikes (3 prongs)
    const spikeMat = mat(0x6ab0ff, { emissive: 0x4a90d9, emissiveIntensity: 0.4 });
    for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 / 3) * i;
        body.add(m(g.cone, spikeMat.clone(), {
            sx: 3, sy: 10, sz: 3,
            px: Math.cos(a) * r * 0.3, py: H * 0.55, pz: Math.sin(a) * r * 0.3,
        }));
    }
    // Electric orb on top
    body.add(m(g.sphere, mat(0xaaddff, {
        emissive: 0x4a90d9, emissiveIntensity: 0.6, roughness: 0.1,
    }), {
        sx: r * 0.25, sy: r * 0.25, sz: r * 0.25, py: H * 0.6,
    }));
    return body;
}

function sandTitanBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Wide beetle/scarab body
    body.add(m(g.sphere, mat(color, { roughness: 0.7, metalness: 0.2 }), {
        sx: r * 1.0, sy: H * 0.3, sz: r * 0.8, py: H * 0.15,
    }));
    // Carapace ridge on top
    body.add(m(g.box, mat(color, { roughness: 0.8, emissiveIntensity: 0.1 }), {
        sx: 2, sy: H * 0.12, sz: r * 0.7, py: H * 0.28,
    }));
    // Mandibles
    const mandMat = mat(0x8a7830, { emissiveIntensity: 0.15 });
    body.add(m(g.cone, mandMat, {
        sx: 2, sy: r * 0.3, sz: 2,
        px: r * 0.25, py: H * 0.12, pz: -r * 0.7, rx: -0.6,
    }));
    body.add(m(g.cone, mandMat.clone(), {
        sx: 2, sy: r * 0.3, sz: 2,
        px: -r * 0.25, py: H * 0.12, pz: -r * 0.7, rx: -0.6,
    }));
    return body;
}

function magmaBruteBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    // Cracked hexagonal body
    body.add(m(g.cyl, mat(color, { roughness: 0.8, metalness: 0.1 }), {
        sx: r * 0.7, sy: H * 0.5, sz: r * 0.7, py: H * 0.15,
    }));
    // Inner magma glow
    body.add(m(g.sphere, mat(0xff6600, {
        emissive: 0xff4400, emissiveIntensity: 0.5, roughness: 0.1,
    }), {
        sx: r * 0.35, sy: H * 0.25, sz: r * 0.35, py: H * 0.25,
    }));
    return body;
}

function magmaFragmentBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    // Small jagged shard
    body.add(m(g.oct, mat(color, {
        emissive: 0xff4400, emissiveIntensity: 0.4,
    }), {
        sx: r * 0.8, sy: H * 0.4, sz: r * 0.6, py: H * 0.2,
    }));
    return body;
}

function siegeGolemBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const stoneMat = mat(color, { roughness: 0.9, metalness: 0.1 });
    // Fortress base
    body.add(m(g.box, stoneMat, {
        sx: r * 0.9, sy: H * 0.5, sz: r * 0.7, py: H * 0.2,
    }));
    // Three battlements on top
    const battMat = mat(color, { roughness: 0.85, emissiveIntensity: 0.1 });
    for (let i = -1; i <= 1; i++) {
        body.add(m(g.box, battMat.clone(), {
            sx: r * 0.2, sy: H * 0.18, sz: r * 0.2,
            px: i * r * 0.35, py: H * 0.55,
        }));
    }
    return body;
}

function voidSovereignBody(color, r) {
    const g = getGeo();
    const body = new THREE.Group();
    const c = new THREE.Color(color);
    // Main sphere body
    body.add(m(g.sphere, mat(color, { emissive: c, emissiveIntensity: 0.3 }), {
        sx: r * 0.7, sy: H * 0.5, sz: r * 0.7, py: H * 0.25,
    }));
    // Void aura ring
    const auraMat = mat(0x6a2aaa, {
        emissive: 0x8844cc, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.35,
    });
    auraMat.userData.persistTransparent = true;
    auraMat.userData.baseOpacity = 0.35;
    body.add(m(g.torus, auraMat, {
        sx: r * 0.8, sy: r * 0.8, sz: r * 0.8,
        py: H * 0.25, rx: Math.PI / 2,
    }));
    // Inner eye
    body.add(m(g.sphere, mat(0xaa44ff, {
        emissive: 0xaa44ff, emissiveIntensity: 0.7, roughness: 0.05,
    }), {
        sx: r * 0.2, sy: r * 0.2, sz: r * 0.2, py: H * 0.3,
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
    dragonflyer: flyingBody,
    megaboss: megabossBody,
    foreststalker: forestStalkerBody,
    stormherald: stormHeraldBody,
    sandtitan: sandTitanBody,
    magmabrute: magmaBruteBody,
    magmafragment: magmaFragmentBody,
    siegegolem: siegeGolemBody,
    voidsovereign: voidSovereignBody,
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

    return { group, body, shadow: null };
}
