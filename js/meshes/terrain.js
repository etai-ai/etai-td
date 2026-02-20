import * as THREE from 'three';
import { CELL, CELL_TYPE, COLS, ROWS } from '../constants.js';

const WALL_H = 3;     // subtle curb height
const WALL_W = 1.5;   // thin edge

function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.6,
        metalness: opts.metalness ?? 0.1,
        emissive: opts.emissive ?? color,
        emissiveIntensity: opts.emissiveIntensity ?? 0.08,
    });
}

// ── Path border curbs ──────────────────────────────────────

/**
 * Creates merged geometry for subtle curbs along path edges.
 * Curbs appear where a path cell borders a non-path cell.
 */
export function createPathWalls(map) {
    const grid = map.grid;
    const env = (map.def && map.def.environment) || 'forest';
    const layout = map.layout;

    // Find exit point(s) to exclude castle area from walls
    const exitPoints = [];
    if (layout.multiPaths) {
        for (const wpArr of layout.multiPaths) {
            const ep = wpArr[wpArr.length - 1];
            exitPoints.push({ x: ep.x, y: ep.y });
        }
    } else {
        const exitPt = layout.paths
            ? layout.paths.suffix[layout.paths.suffix.length - 1]
            : layout.waypoints[layout.waypoints.length - 1];
        exitPoints.push({ x: exitPt.x, y: exitPt.y });
    }

    // Light colors that blend with terrain — not dark outlines
    const wallColor = env === 'desert' ? 0xa89060
        : env === 'lava' ? 0x5a4040
        : env === 'ruins' ? 0x8a8a80
        : env === 'void' ? 0x3a2050
        : 0x7a8a60; // forest: light mossy stone

    const boxes = [];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x] !== CELL_TYPE.PATH) continue;

            // Skip cells near any castle exit (2-cell radius)
            let nearExit = false;
            for (const ep of exitPoints) {
                if (Math.abs(x - ep.x) <= 2 && Math.abs(y - ep.y) <= 2) { nearExit = true; break; }
            }
            if (nearExit) continue;

            const wx = x * CELL + CELL / 2;
            const wz = y * CELL + CELL / 2;

            // Top edge (y-1)
            if (y === 0 || grid[y - 1][x] !== CELL_TYPE.PATH) {
                boxes.push({ px: wx, pz: wz - CELL / 2, sx: CELL + WALL_W, sz: WALL_W });
            }
            // Bottom edge (y+1)
            if (y === ROWS - 1 || grid[y + 1][x] !== CELL_TYPE.PATH) {
                boxes.push({ px: wx, pz: wz + CELL / 2, sx: CELL + WALL_W, sz: WALL_W });
            }
            // Left edge (x-1)
            if (x === 0 || grid[y][x - 1] !== CELL_TYPE.PATH) {
                boxes.push({ px: wx - CELL / 2, pz: wz, sx: WALL_W, sz: CELL + WALL_W });
            }
            // Right edge (x+1)
            if (x === COLS - 1 || grid[y][x + 1] !== CELL_TYPE.PATH) {
                boxes.push({ px: wx + CELL / 2, pz: wz, sx: WALL_W, sz: CELL + WALL_W });
            }
        }
    }

    if (boxes.length === 0) return null;

    // Merge all curb segments into a single geometry
    const mergedGeo = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const indices = [];
    const srcPos = boxGeo.attributes.position.array;
    const srcNorm = boxGeo.attributes.normal.array;
    const srcIdx = boxGeo.index.array;
    const vertCount = srcPos.length / 3;

    for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const offset = i * vertCount;

        for (let v = 0; v < vertCount; v++) {
            positions.push(
                srcPos[v * 3] * b.sx + b.px,
                srcPos[v * 3 + 1] * WALL_H + WALL_H / 2,
                srcPos[v * 3 + 2] * b.sz + b.pz,
            );
            normals.push(srcNorm[v * 3], srcNorm[v * 3 + 1], srcNorm[v * 3 + 2]);
        }
        for (let j = 0; j < srcIdx.length; j++) {
            indices.push(srcIdx[j] + offset);
        }
    }

    mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    mergedGeo.setIndex(indices);

    const mesh = new THREE.Mesh(mergedGeo, mat(wallColor, {
        roughness: 0.75, metalness: 0.05,
    }));
    return mesh;
}

// ── 3D Mini Castle (for multi-path maps) ─────────────────

/**
 * Creates a smaller 3D castle at a given exit point.
 * ~40% the size of a normal castle — fits within ~1x1 cell.
 */
export function createMiniCastle(exitPt) {
    let cx = exitPt.x * CELL + CELL / 2;
    let cz = exitPt.y * CELL + CELL / 2;

    const margin = CELL * 0.5;
    cx = Math.max(margin, Math.min(COLS * CELL - margin, cx));
    cz = Math.max(margin, Math.min(ROWS * CELL - margin, cz));

    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const geo = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
        cone: new THREE.ConeGeometry(1, 1, 8),
        plane: new THREE.PlaneGeometry(1, 1),
    };

    const stoneMat = mat(0x7e7e8e, { roughness: 0.75, metalness: 0.15, emissiveIntensity: 0.1 });
    const roofMat = mat(0x8b4513, { roughness: 0.7, emissiveIntensity: 0.06 });
    const gateMat = mat(0x1a1a2a, { roughness: 0.9, emissiveIntensity: 0.02 });
    const flagMat = mat(0xcc3333, { emissive: 0xcc3333, emissiveIntensity: 0.3, roughness: 0.5 });

    const C = CELL * 0.22; // ~40% of normal castle's half-cell unit

    // Foundation
    const foundation = new THREE.Mesh(geo.box, stoneMat.clone());
    foundation.scale.set(C * 2.8, 2, C * 2.0);
    foundation.position.set(0, 1, 0);
    group.add(foundation);

    // Wall
    const wall = new THREE.Mesh(geo.box, stoneMat.clone());
    wall.scale.set(C * 2.2, 8, C * 1.4);
    wall.position.set(0, 5, 0);
    group.add(wall);

    // Gate
    const gate = new THREE.Mesh(geo.box, gateMat.clone());
    gate.scale.set(C * 0.5, 5, 1.5);
    gate.position.set(0, 3.5, -C * 0.7);
    group.add(gate);

    // Central tower
    const tower = new THREE.Mesh(geo.cyl, stoneMat.clone());
    tower.scale.set(C * 0.35, 12, C * 0.35);
    tower.position.set(0, 7, 0);
    group.add(tower);

    // Tower roof
    const roof = new THREE.Mesh(geo.cone, roofMat.clone());
    roof.scale.set(C * 0.45, 4, C * 0.45);
    roof.position.set(0, 15, 0);
    group.add(roof);

    // Flag
    const flag = new THREE.Mesh(geo.plane, flagMat.clone());
    flag.scale.set(4, 2.5, 1);
    flag.position.set(3, 18, 0);
    flag.material.side = THREE.DoubleSide;
    group.add(flag);

    // Battlements
    for (let i = -1; i <= 1; i++) {
        const merlon = new THREE.Mesh(geo.box, stoneMat.clone());
        merlon.scale.set(C * 0.25, 2, C * 0.25);
        merlon.position.set(i * C * 0.5, 10, 0);
        group.add(merlon);
    }

    return group;
}

// ── 3D Castle ──────────────────────────────────────────────

/**
 * Creates a 3D castle group at the path exit point.
 * Fits within ~2x2 cells to match the 2D castle footprint.
 */
export function createCastle(map) {
    const layout = map.layout;
    const exitPt = layout.paths
        ? layout.paths.suffix[layout.paths.suffix.length - 1]
        : layout.waypoints[layout.waypoints.length - 1];

    let cx = exitPt.x * CELL + CELL / 2;
    let cz = exitPt.y * CELL + CELL / 2;

    // Clamp castle inward so it doesn't go off-screen
    const margin = CELL * 0.9;
    cx = Math.max(margin, Math.min(COLS * CELL - margin, cx));
    cz = Math.max(margin, Math.min(ROWS * CELL - margin, cz));

    const group = new THREE.Group();
    group.position.set(cx, 0, cz);

    const geo = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
        cone: new THREE.ConeGeometry(1, 1, 8),
        plane: new THREE.PlaneGeometry(1, 1),
    };

    const stoneMat = mat(0x7e7e8e, { roughness: 0.75, metalness: 0.15, emissiveIntensity: 0.1 });
    const darkStoneMat = mat(0x5a5a6a, { roughness: 0.8, emissiveIntensity: 0.06 });
    const roofMat = mat(0x8b4513, { roughness: 0.7, emissiveIntensity: 0.06 });
    const gateMat = mat(0x1a1a2a, { roughness: 0.9, emissiveIntensity: 0.02 });
    const flagMat = mat(0xcc3333, { emissive: 0xcc3333, emissiveIntensity: 0.3, roughness: 0.5 });
    const goldMat = mat(0xffd700, { emissive: 0xffd700, emissiveIntensity: 0.25, metalness: 0.4 });

    const C = CELL * 0.5; // half-cell unit for proportional sizing

    // Foundation
    const foundation = new THREE.Mesh(geo.box, darkStoneMat.clone());
    foundation.scale.set(C * 2.8, 3, C * 2.0);
    foundation.position.set(0, 1.5, 0);
    group.add(foundation);

    // Main wall
    const wall = new THREE.Mesh(geo.box, stoneMat.clone());
    wall.scale.set(C * 2.4, 16, C * 1.6);
    wall.position.set(0, 8 + 1.5, 0);
    group.add(wall);

    // Gate arch
    const gate = new THREE.Mesh(geo.box, gateMat.clone());
    gate.scale.set(C * 0.6, 10, 2);
    gate.position.set(0, 5 + 1.5, -C * 0.8);
    group.add(gate);

    // Portcullis bars
    for (let i = -1; i <= 1; i++) {
        const bar = new THREE.Mesh(geo.cyl, mat(0x555555, { metalness: 0.3 }));
        bar.scale.set(0.5, 8, 0.5);
        bar.position.set(i * 4, 4 + 1.5, -C * 0.8);
        group.add(bar);
    }

    // Battlements
    for (let i = 0; i < 5; i++) {
        const merlon = new THREE.Mesh(geo.box, stoneMat.clone());
        merlon.scale.set(C * 0.28, 3, C * 0.28);
        merlon.position.set(-C * 0.8 + i * C * 0.44, 16 + 1.5 + 1.5, 0);
        group.add(merlon);
    }

    // Left tower
    const leftTower = new THREE.Mesh(geo.cyl, stoneMat.clone());
    leftTower.scale.set(C * 0.4, 20, C * 0.4);
    leftTower.position.set(-C * 1.1, 10 + 1.5, 0);
    group.add(leftTower);

    // Left tower roof
    const leftRoof = new THREE.Mesh(geo.cone, roofMat.clone());
    leftRoof.scale.set(C * 0.5, 7, C * 0.5);
    leftRoof.position.set(-C * 1.1, 20 + 3.5 + 1.5, 0);
    group.add(leftRoof);

    // Left flag
    const leftFlag = new THREE.Mesh(geo.plane, flagMat.clone());
    leftFlag.scale.set(7, 4, 1);
    leftFlag.position.set(-C * 1.1 + 5, 20 + 7 + 3, 0);
    leftFlag.material.side = THREE.DoubleSide;
    group.add(leftFlag);

    // Right tower
    const rightTower = new THREE.Mesh(geo.cyl, stoneMat.clone());
    rightTower.scale.set(C * 0.4, 20, C * 0.4);
    rightTower.position.set(C * 1.1, 10 + 1.5, 0);
    group.add(rightTower);

    // Right tower roof
    const rightRoof = new THREE.Mesh(geo.cone, roofMat.clone());
    rightRoof.scale.set(C * 0.5, 7, C * 0.5);
    rightRoof.position.set(C * 1.1, 20 + 3.5 + 1.5, 0);
    group.add(rightRoof);

    // Right flag
    const rightFlag = new THREE.Mesh(geo.plane, flagMat.clone());
    rightFlag.scale.set(7, 4, 1);
    rightFlag.position.set(C * 1.1 + 5, 20 + 7 + 3, 0);
    rightFlag.material.side = THREE.DoubleSide;
    group.add(rightFlag);

    // Central keep
    const keep = new THREE.Mesh(geo.box, stoneMat.clone());
    keep.scale.set(C * 0.7, 8, C * 0.6);
    keep.position.set(0, 16 + 4 + 1.5, C * 0.2);
    group.add(keep);

    // Keep roof
    const keepRoof = new THREE.Mesh(geo.cone, roofMat.clone());
    keepRoof.scale.set(C * 0.55, 6, C * 0.55);
    keepRoof.position.set(0, 16 + 8 + 3 + 1.5, C * 0.2);
    group.add(keepRoof);

    // Gold shield above gate
    const shield = new THREE.Mesh(geo.box, goldMat.clone());
    shield.scale.set(4, 4, 1.5);
    shield.position.set(0, 12 + 1.5, -C * 0.8);
    shield.rotation.z = Math.PI / 4;
    group.add(shield);

    // Torch glow — small emissive spheres
    const torchGeo = new THREE.SphereGeometry(1, 6, 4);
    const torchMaterial = mat(0xff8800, { emissive: 0xff6600, emissiveIntensity: 0.8, roughness: 0.2 });
    for (const side of [-1, 1]) {
        const torch = new THREE.Mesh(torchGeo, torchMaterial.clone());
        torch.scale.setScalar(1.5);
        torch.position.set(side * C * 0.45, 9 + 1.5, -C * 0.8);
        group.add(torch);
    }

    return group;
}
