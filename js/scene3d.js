import * as THREE from 'three';
import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS } from './constants.js';

// Camera tilt from vertical (radians). Reveals 3D depth on meshes.
const TILT_DEG = 25;
const TILT = TILT_DEG * Math.PI / 180;
const COS_TILT = Math.cos(TILT);
const SIN_TILT = Math.sin(TILT);

export class Scene3D {
    constructor(threeCanvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas: threeCanvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setSize(CANVAS_W, CANVAS_H, false);
        this.renderer.setClearColor(0x1a1a2e);
        // Linear output — PostFX handles final display color management
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.scene = new THREE.Scene();

        // Orthographic camera — tilted to show 3D depth
        const halfW = CANVAS_W / 2;
        // Shrink vertical frustum so tilt foreshortening is cancelled:
        // ground squares project as screen squares (1:1 mapping for X and Z)
        const halfH = (CANVAS_H / 2) * COS_TILT;
        this.camera = new THREE.OrthographicCamera(
            -halfW, halfW, halfH, -halfH,
            1, 5000,
        );

        const cx = CANVAS_W / 2;
        const cz = CANVAS_H / 2;
        const dist = 2000;
        // Position camera behind and above, tilted to look down at angle
        this.camera.position.set(cx, dist * COS_TILT, cz + dist * SIN_TILT);
        this.camera.lookAt(cx, 0, cz);

        // Lights
        this.ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.dirLight.position.set(cx, 1200, cz - 400);
        this.dirLight.target.position.set(cx, 0, cz);
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);
        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.fillLight.position.set(cx, 800, cz + 400);
        this.fillLight.target.position.set(cx, 0, cz);
        this.scene.add(this.fillLight);
        this.scene.add(this.fillLight.target);

        // Ground plane — terrain texture
        this._terrainCanvas = document.createElement('canvas');
        this._terrainCanvas.width = CANVAS_W;
        this._terrainCanvas.height = CANVAS_H;
        this._terrainCtx = this._terrainCanvas.getContext('2d');

        this._terrainTexture = new THREE.CanvasTexture(this._terrainCanvas);
        this._terrainTexture.minFilter = THREE.LinearFilter;
        this._terrainTexture.magFilter = THREE.LinearFilter;
        this._terrainTexture.colorSpace = '';
        // Ground plane — exactly CANVAS_W × CANVAS_H (frustum calibrated so squares stay square)
        const groundGeo = new THREE.PlaneGeometry(CANVAS_W, CANVAS_H);
        const groundMat = new THREE.MeshBasicMaterial({ map: this._terrainTexture });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.set(cx, 0, cz);
        this.scene.add(this.ground);
    }

    /** Tilt constants for 2D overlay alignment */
    static get TILT() { return TILT; }
    static get COS_TILT() { return COS_TILT; }
    static get SIN_TILT() { return SIN_TILT; }

    updateTerrainTexture(map, towerRenderer) {
        const ctx = this._terrainCtx;
        map.drawTerrain(ctx);
        if (towerRenderer) towerRenderer(ctx);
        this._terrainTexture.needsUpdate = true;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this._terrainTexture.dispose();
        this.ground.geometry.dispose();
        this.ground.material.dispose();
        this.renderer.dispose();
    }
}
