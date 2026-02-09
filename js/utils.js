import { CELL } from './constants.js';

export function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function angle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

export function gridToWorld(gx, gy) {
    return {
        x: gx * CELL + CELL / 2,
        y: gy * CELL + CELL / 2,
    };
}

export function worldToGrid(wx, wy) {
    return {
        x: Math.floor(wx / CELL),
        y: Math.floor(wy / CELL),
    };
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function randRange(min, max) {
    return min + Math.random() * (max - min);
}

export function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}
