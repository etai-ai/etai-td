import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CELL, TOWER_TYPES } from '../constants.js';

const MODEL_DIR = 'assets/models/towers/';

// All tower types that could have GLTF models
const TOWER_KEYS = Object.keys(TOWER_TYPES);

// Cached model templates: type → THREE.Group (original scene from GLTF)
const _modelCache = new Map();
let _loaded = false;
let _loading = false;

/**
 * Pre-loads all tower GLB models from assets/models/towers/.
 * Fire-and-forget: resolves true if any models loaded, false if none found.
 * Never rejects — missing files are silently skipped.
 */
export async function loadAllTowerModels() {
    if (_loaded || _loading) return _loaded;
    _loading = true;

    const loader = new GLTFLoader();

    // Skip if assets directory doesn't exist (no .glb files bundled)
    if (!window._glbAssetsAvailable) { _loading = false; return false; }

    const promises = TOWER_KEYS.map(type => {
        const url = `${MODEL_DIR}tower-${type}.glb`;
        return new Promise(resolve => {
            loader.load(
                url,
                gltf => {
                    _modelCache.set(type, gltf.scene);
                    resolve(true);
                },
                undefined, // progress
                () => resolve(false), // error (file missing) — silent skip
            );
        });
    });

    const results = await Promise.all(promises);
    _loaded = results.some(Boolean);
    _loading = false;
    return _loaded;
}

/** Returns true if GLTF models are loaded and ready */
export function isLoaded() {
    return _loaded;
}

/** Returns true if a specific tower type has a GLTF model */
export function hasModel(type) {
    return _modelCache.has(type);
}

/**
 * Returns a deep clone of the GLTF model for the given tower type.
 * Each clone gets its own materials (for per-instance tinting).
 * Returns null if no model exists for this type.
 */
export function getModelClone(type) {
    const template = _modelCache.get(type);
    if (!template) return null;

    const clone = template.clone();

    // Deep-clone materials so each tower instance can be tinted independently
    clone.traverse(child => {
        if (child.isMesh && child.material) {
            child.material = child.material.clone();
        }
    });

    // Auto-scale to fit within one cell
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
        const targetSize = CELL * 0.8;
        const scale = targetSize / maxDim;
        clone.scale.multiplyScalar(scale);
    }

    // Center horizontally, sit on ground
    const centeredBox = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    centeredBox.getCenter(center);
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= centeredBox.min.y;

    // Tag for dispose handling (GLTF clones own their geometry)
    clone.userData.isGLTF = true;

    return clone;
}
