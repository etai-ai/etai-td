import { CANVAS_W, CANVAS_H, MAX_POINT_LIGHTS } from './constants.js';

// ── GLSL Shaders ─────────────────────────────────────────────

const VERT = `#version 300 es
precision mediump float;
out vec2 vUV;
void main() {
    // Fullscreen triangle trick: 3 verts cover the entire screen
    float x = float((gl_VertexID & 1) << 2);
    float y = float((gl_VertexID & 2) << 1);
    vUV = vec2(x * 0.5, y * 0.5);
    gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}`;

const COMPOSITE_FRAG = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTerrain;
uniform sampler2D uGame;
// Point lights
const int MAX_LIGHTS = 32;
uniform int uLightCount;
uniform vec2 uLightPos[MAX_LIGHTS];
uniform vec3 uLightColor[MAX_LIGHTS];
uniform float uLightRadius[MAX_LIGHTS];
uniform float uLightIntensity[MAX_LIGHTS];
uniform float uAmbientDark;
out vec4 fragColor;
void main() {
    vec4 terrain = texture(uTerrain, vUV);
    vec4 game = texture(uGame, vUV);
    vec3 scene = mix(terrain.rgb, game.rgb, game.a);
    // Lighting accumulation
    float aspect = ${(CANVAS_W / CANVAS_H).toFixed(4)};
    vec3 lightAccum = vec3(1.0 - uAmbientDark);
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        vec2 diff = vUV - uLightPos[i];
        diff.x *= aspect;
        float dist = length(diff);
        if (dist >= uLightRadius[i]) continue;
        float t = dist / uLightRadius[i];
        float t2 = t * t;
        float atten = (1.0 - t2) * (1.0 - t2);
        lightAccum += uLightColor[i] * uLightIntensity[i] * atten;
    }
    scene *= min(lightAccum, vec3(2.0));
    fragColor = vec4(scene, 1.0);
}`;

const BRIGHT_FRAG = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uScene;
uniform float uThreshold;
out vec4 fragColor;
void main() {
    vec3 c = texture(uScene, vUV).rgb;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float contrib = max(0.0, lum - uThreshold) / max(lum, 0.001);
    fragColor = vec4(c * contrib, 1.0);
}`;

const BLUR_FRAG = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uDirection; // (1/w, 0) or (0, 1/h)
out vec4 fragColor;
void main() {
    // 9-tap Gaussian
    float weights[5] = float[](0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);
    vec3 result = texture(uTex, vUV).rgb * weights[0];
    for (int i = 1; i < 5; i++) {
        vec2 off = uDirection * float(i);
        result += texture(uTex, vUV + off).rgb * weights[i];
        result += texture(uTex, vUV - off).rgb * weights[i];
    }
    fragColor = vec4(result, 1.0);
}`;

const FINAL_FRAG = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomIntensity;
uniform float uVignette;
uniform vec3 uMapTint;
uniform float uFlash;
uniform float uAberration;
uniform float uShockwave;
uniform vec2 uShockOrigin;
uniform float uShockRadius;
out vec4 fragColor;
void main() {
    vec2 uv = vUV;

    // Shockwave distortion
    if (uShockwave > 0.0) {
        vec2 diff = uv - uShockOrigin;
        // Correct for aspect ratio
        float aspect = ${(CANVAS_W / CANVAS_H).toFixed(4)};
        diff.x *= aspect;
        float dist = length(diff);
        float ring = uShockRadius;
        float width = 0.08;
        if (abs(dist - ring) < width) {
            float factor = (dist - ring) / width;
            float wave = 1.0 - factor * factor;
            diff = normalize(diff);
            diff.x /= aspect;
            uv += diff * wave * uShockwave * 0.015;
        }
    }

    // Chromatic aberration
    vec3 scene;
    if (uAberration > 0.0) {
        vec2 dir = (uv - 0.5) * uAberration * 0.008;
        scene.r = texture(uScene, uv + dir).r;
        scene.g = texture(uScene, uv).g;
        scene.b = texture(uScene, uv - dir).b;
    } else {
        scene = texture(uScene, uv).rgb;
    }

    // Bloom
    vec3 bloom = texture(uBloom, uv).rgb;
    vec3 color = scene + bloom * uBloomIntensity;

    // Color grading (map tint)
    color *= uMapTint;

    // Vignette
    float dist = length(uv - 0.5) * 1.4;
    color *= 1.0 - dist * dist * uVignette;

    // Screen flash (additive white)
    color = mix(color, vec3(1.0), uFlash);

    fragColor = vec4(color, 1.0);
}`;

// ── Helper functions ─────────────────────────────────────────

function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        // Shader compile error — silent fallback
        gl.deleteShader(s);
        return null;
    }
    return s;
}

function createProgram(gl, vSrc, fSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        // Program link error — silent fallback
        gl.deleteProgram(prog);
        return null;
    }
    // Cache uniform locations
    const uniforms = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(prog, i);
        uniforms[info.name] = gl.getUniformLocation(prog, info.name);
    }
    prog.uniforms = uniforms;
    return prog;
}

function createFBO(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { fbo, tex, w, h };
}

function createCanvasTexture(gl) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

// ── PostFX Class ─────────────────────────────────────────────

export class PostFX {
    constructor(fxCanvas, terrainCanvas, gameCanvas) {
        this.fxCanvas = fxCanvas;
        this.terrainCanvas = terrainCanvas;
        this.gameCanvas = gameCanvas;

        // Try WebGL2
        fxCanvas.width = CANVAS_W;
        fxCanvas.height = CANVAS_H;
        const gl = fxCanvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
        this.gl = gl;
        this.enabled = !!gl;

        if (!this.enabled) {
            fxCanvas.style.display = 'none';
            // PostFX: WebGL2 unavailable — falling back to Canvas 2D
            return;
        }

        // When postfx is active, hide the source canvases visually
        // (they still render offscreen for us to read as textures)
        terrainCanvas.style.visibility = 'hidden';
        gameCanvas.style.visibility = 'hidden';

        // Compile programs
        this.compositeProg = createProgram(gl, VERT, COMPOSITE_FRAG);
        this.brightProg = createProgram(gl, VERT, BRIGHT_FRAG);
        this.blurProg = createProgram(gl, VERT, BLUR_FRAG);
        this.finalProg = createProgram(gl, VERT, FINAL_FRAG);

        if (!this.compositeProg || !this.brightProg || !this.blurProg || !this.finalProg) {
            this.enabled = false;
            fxCanvas.style.display = 'none';
            terrainCanvas.style.visibility = '';
            gameCanvas.style.visibility = '';
            // PostFX: shader compilation failed — falling back
            return;
        }

        // Fullscreen triangle VAO (no vertex data needed)
        this.vao = gl.createVertexArray();

        // Flip Y when uploading canvas sources so top-left maps correctly
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        // Canvas source textures
        this.terrainTex = createCanvasTexture(gl);
        this.gameTex = createCanvasTexture(gl);

        // FBOs
        const halfW = Math.ceil(CANVAS_W / 2);
        const halfH = Math.ceil(CANVAS_H / 2);
        this.compositeFBO = createFBO(gl, CANVAS_W, CANVAS_H);
        this.brightFBO = createFBO(gl, halfW, halfH);
        this.blurFBO_A = createFBO(gl, halfW, halfH);
        this.blurFBO_B = createFBO(gl, halfW, halfH);

        // Effect state
        this.terrainDirty = true;
        this.bloomIntensity = 0.3;
        this.bloomThreshold = 0.7;
        this.vignetteStrength = 0.4;
        this.mapTint = [1.0, 1.0, 1.0];

        // Flash
        this.flashTimer = 0;
        this.flashDuration = 0;
        this.flashIntensity = 0;

        // Shockwave
        this.shockwaveTimer = 0;
        this.shockwaveDuration = 0.4;
        this.shockwaveOrigin = [0.5, 0.5];
        this.shockwaveIntensity = 0;

        // Chromatic aberration
        this.aberrationTimer = 0;
        this.aberrationDuration = 0;
        this.aberrationIntensity = 0;

        // Point lights
        this.lights = [];
        this.flashLights = [];
        this.ambientDarkness = 0;
        this._lightPosData = new Float32Array(MAX_POINT_LIGHTS * 2);
        this._lightColorData = new Float32Array(MAX_POINT_LIGHTS * 3);
        this._lightRadiusData = new Float32Array(MAX_POINT_LIGHTS);
        this._lightIntensityData = new Float32Array(MAX_POINT_LIGHTS);
    }

    // ── Effect triggers ──────────────────────────────────────

    flash(intensity, duration) {
        this.flashIntensity = intensity;
        this.flashDuration = duration;
        this.flashTimer = duration;
    }

    shockwave(nx, ny, intensity) {
        this.shockwaveOrigin = [nx, 1.0 - ny]; // flip Y for GL coords
        this.shockwaveIntensity = intensity;
        this.shockwaveTimer = this.shockwaveDuration;
    }

    aberration(intensity, duration) {
        this.aberrationIntensity = intensity;
        this.aberrationDuration = duration;
        this.aberrationTimer = duration;
    }

    setTerrainDirty() {
        this.terrainDirty = true;
    }

    setMapTint(r, g, b) {
        this.mapTint = [r, g, b];
    }

    // ── Point light API ───────────────────────────────────────

    clearLights() {
        this.lights.length = 0;
    }

    addLight(px, py, r, g, b, radius, intensity) {
        if (!this.enabled || this.lights.length >= MAX_POINT_LIGHTS) return;
        this.lights.push({
            x: px / CANVAS_W,
            y: 1.0 - py / CANVAS_H,
            r, g, b, radius, intensity,
        });
    }

    addFlashLight(px, py, r, g, b, radius, intensity, duration) {
        if (!this.enabled) return;
        this.flashLights.push({
            x: px / CANVAS_W,
            y: 1.0 - py / CANVAS_H,
            r, g, b, radius, intensity,
            timer: duration, duration,
        });
    }

    setAmbientDarkness(level) {
        this.ambientDarkness = level;
    }

    // ── Update timers (called from game.update) ──────────────

    update(dt) {
        if (!this.enabled) return;

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer < 0) this.flashTimer = 0;
        }
        if (this.shockwaveTimer > 0) {
            this.shockwaveTimer -= dt;
            if (this.shockwaveTimer < 0) this.shockwaveTimer = 0;
        }
        if (this.aberrationTimer > 0) {
            this.aberrationTimer -= dt;
            if (this.aberrationTimer < 0) this.aberrationTimer = 0;
        }

        // Decay flash lights
        for (let i = this.flashLights.length - 1; i >= 0; i--) {
            this.flashLights[i].timer -= dt;
            if (this.flashLights[i].timer <= 0) {
                this.flashLights.splice(i, 1);
            }
        }
    }

    // ── Main render pass ─────────────────────────────────────

    render() {
        if (!this.enabled) return;
        const gl = this.gl;

        gl.bindVertexArray(this.vao);

        // Upload canvas textures
        if (this.terrainDirty) {
            gl.bindTexture(gl.TEXTURE_2D, this.terrainTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.terrainCanvas);
            this.terrainDirty = false;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.gameTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.gameCanvas);

        // Pass 1: Composite terrain + game (with point lighting)
        this._bindFBO(this.compositeFBO);
        gl.useProgram(this.compositeProg);
        this._bindTex(this.compositeProg, 'uTerrain', this.terrainTex, 0);
        this._bindTex(this.compositeProg, 'uGame', this.gameTex, 1);
        this._uploadLights();
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 2: Bright-pass extract
        this._bindFBO(this.brightFBO);
        gl.useProgram(this.brightProg);
        this._bindTex(this.brightProg, 'uScene', this.compositeFBO.tex, 0);
        gl.uniform1f(this.brightProg.uniforms.uThreshold, this.bloomThreshold);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 3: Blur horizontal
        const halfW = this.brightFBO.w;
        const halfH = this.brightFBO.h;
        this._bindFBO(this.blurFBO_A);
        gl.useProgram(this.blurProg);
        this._bindTex(this.blurProg, 'uTex', this.brightFBO.tex, 0);
        gl.uniform2f(this.blurProg.uniforms.uDirection, 1.0 / halfW, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 4: Blur vertical
        this._bindFBO(this.blurFBO_B);
        this._bindTex(this.blurProg, 'uTex', this.blurFBO_A.tex, 0);
        gl.uniform2f(this.blurProg.uniforms.uDirection, 0.0, 1.0 / halfH);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 5: Final composite to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, CANVAS_W, CANVAS_H);
        gl.useProgram(this.finalProg);
        this._bindTex(this.finalProg, 'uScene', this.compositeFBO.tex, 0);
        this._bindTex(this.finalProg, 'uBloom', this.blurFBO_B.tex, 1);

        const fu = this.finalProg.uniforms;
        gl.uniform1f(fu.uBloomIntensity, this.bloomIntensity);
        gl.uniform1f(fu.uVignette, this.vignetteStrength);
        gl.uniform3fv(fu.uMapTint, this.mapTint);

        // Flash easing (linear fade-out)
        const flashVal = this.flashDuration > 0
            ? this.flashIntensity * (this.flashTimer / this.flashDuration)
            : 0;
        gl.uniform1f(fu.uFlash, flashVal);

        // Aberration easing
        const aberVal = this.aberrationDuration > 0
            ? this.aberrationIntensity * (this.aberrationTimer / this.aberrationDuration)
            : 0;
        gl.uniform1f(fu.uAberration, aberVal);

        // Shockwave
        const shockVal = this.shockwaveDuration > 0
            ? this.shockwaveIntensity * (this.shockwaveTimer / this.shockwaveDuration)
            : 0;
        gl.uniform1f(fu.uShockwave, shockVal);
        gl.uniform2fv(fu.uShockOrigin, this.shockwaveOrigin);
        // Shock radius expands over time (0 → 1)
        const shockProgress = 1.0 - (this.shockwaveTimer / this.shockwaveDuration || 0);
        gl.uniform1f(fu.uShockRadius, shockProgress * 0.5);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        this.clearLights();
    }

    // ── Internal helpers ─────────────────────────────────────

    _uploadLights() {
        const gl = this.gl;
        const prog = this.compositeProg;

        let count = 0;

        // Regular lights (towers, projectiles, hero, scorch)
        for (let i = 0; i < this.lights.length && count < MAX_POINT_LIGHTS; i++, count++) {
            const l = this.lights[i];
            this._lightPosData[count * 2] = l.x;
            this._lightPosData[count * 2 + 1] = l.y;
            this._lightColorData[count * 3] = l.r;
            this._lightColorData[count * 3 + 1] = l.g;
            this._lightColorData[count * 3 + 2] = l.b;
            this._lightRadiusData[count] = l.radius;
            this._lightIntensityData[count] = l.intensity;
        }

        // Flash lights (with fade-out)
        for (let i = 0; i < this.flashLights.length && count < MAX_POINT_LIGHTS; i++, count++) {
            const fl = this.flashLights[i];
            const fade = fl.timer / fl.duration;
            this._lightPosData[count * 2] = fl.x;
            this._lightPosData[count * 2 + 1] = fl.y;
            this._lightColorData[count * 3] = fl.r;
            this._lightColorData[count * 3 + 1] = fl.g;
            this._lightColorData[count * 3 + 2] = fl.b;
            this._lightRadiusData[count] = fl.radius;
            this._lightIntensityData[count] = fl.intensity * fade;
        }

        gl.uniform1i(prog.uniforms['uLightCount'], count);
        gl.uniform2fv(prog.uniforms['uLightPos[0]'], this._lightPosData);
        gl.uniform3fv(prog.uniforms['uLightColor[0]'], this._lightColorData);
        gl.uniform1fv(prog.uniforms['uLightRadius[0]'], this._lightRadiusData);
        gl.uniform1fv(prog.uniforms['uLightIntensity[0]'], this._lightIntensityData);
        gl.uniform1f(prog.uniforms['uAmbientDark'], this.ambientDarkness);
    }

    _bindFBO(fbo) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
        gl.viewport(0, 0, fbo.w, fbo.h);
    }

    _bindTex(prog, name, tex, unit) {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(prog.uniforms[name], unit);
    }
}
