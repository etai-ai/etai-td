import { MAX_PARTICLES } from './constants.js';
import { randRange } from './utils.js';

class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.color = '#fff';
        this.size = 2;
        this.type = 'dot'; // dot, text, line, shard, crystal, star
        this.text = '';
        this.x2 = 0;
        this.y2 = 0;
        this.alpha = 1;
        this.gravity = 0;
        this.rotation = 0;
        this.rotSpeed = 0;
    }

    init(opts) {
        this.active = true;
        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.life = opts.life || 1;
        this.maxLife = this.life;
        this.color = opts.color || '#fff';
        this.size = opts.size || 2;
        this.type = opts.type || 'dot';
        this.text = opts.text || '';
        this.x2 = opts.x2 || 0;
        this.y2 = opts.y2 || 0;
        this.alpha = 1;
        this.gravity = opts.gravity || 0;
        this.rotation = opts.rotation || 0;
        this.rotSpeed = opts.rotSpeed || 0;
    }

    update(dt) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }
        this.alpha = this.life / this.maxLife;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.rotation += this.rotSpeed * dt;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = Array.from({ length: MAX_PARTICLES }, () => new Particle());
        this.activeCount = 0;
    }

    acquire(opts) {
        // Find an inactive particle
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                this.pool[i].init(opts);
                this.activeCount++;
                return this.pool[i];
            }
        }
        // Pool full - reuse oldest (index 0 for simplicity)
        this.pool[0].init(opts);
        return this.pool[0];
    }

    spawnExplosion(x, y, color) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + randRange(-0.2, 0.2);
            const spd = randRange(40, 100);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.3, 0.6),
                color,
                size: randRange(2, 4),
                gravity: 50,
            });
        }
    }

    spawnSpark(x, y, color, count = 3) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(20, 60);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.15, 0.3),
                color,
                size: randRange(1, 3),
            });
        }
    }

    spawnFloatingText(x, y, text, color) {
        this.acquire({
            x,
            y,
            vx: 0,
            vy: -40,
            life: 1.2,
            color,
            type: 'text',
            text,
            size: 14,
        });
    }

    spawnBigFloatingText(x, y, text, color) {
        this.acquire({
            x,
            y,
            vx: 0,
            vy: -50,
            life: 1.8,
            color,
            type: 'text',
            text,
            size: 32,
        });
    }

    spawnLightning(x1, y1, x2, y2) {
        this.acquire({
            x: x1,
            y: y1,
            x2,
            y2,
            vx: 0,
            vy: 0,
            life: 0.15,
            color: '#e0b0ff',
            type: 'line',
            size: 2,
        });
    }

    spawnMuzzleFlash(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(30, 80);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.08, 0.15),
                color,
                size: randRange(2, 4),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-10, 10),
            });
        }
    }

    spawnFrostBurst(x, y, count) {
        for (let i = 0; i < count; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(20, 50);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.8),
                color: '#aaddff',
                size: randRange(2, 4),
                type: 'crystal',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-6, 6),
            });
        }
    }

    spawnDust(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.acquire({
                x: x + randRange(-3, 3),
                y,
                vx: randRange(-8, 8),
                vy: randRange(-15, -30),
                life: randRange(0.3, 0.5),
                color: '#c8a96e',
                size: randRange(1, 2),
                type: 'dot',
            });
        }
    }

    spawnShockRing(x, y) {
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.2,
            color: '#ffffff',
            size: 15,
            type: 'ring',
        });
    }

    spawnArmorCrack(x, y) {
        for (let i = 0; i < 3; i++) {
            const ang = randRange(0, Math.PI * 2);
            const spd = randRange(15, 35);
            this.acquire({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.3, 0.5),
                color: '#ffaa00',
                size: randRange(1, 2),
                type: 'shard',
                gravity: 40,
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-8, 8),
            });
        }
    }

    spawnMissileExhaust(x, y, angle) {
        const backAngle = angle + Math.PI;
        // Orange flame dot
        this.acquire({
            x: x + Math.cos(backAngle) * 4,
            y: y + Math.sin(backAngle) * 4,
            vx: Math.cos(backAngle) * randRange(20, 50) + randRange(-8, 8),
            vy: Math.sin(backAngle) * randRange(20, 50) + randRange(-8, 8),
            life: randRange(0.15, 0.3),
            color: '#ff8800',
            size: randRange(1.5, 3),
        });
        // Gray smoke dot
        this.acquire({
            x: x + Math.cos(backAngle) * 6,
            y: y + Math.sin(backAngle) * 6,
            vx: Math.cos(backAngle) * randRange(10, 30) + randRange(-6, 6),
            vy: Math.sin(backAngle) * randRange(10, 30) + randRange(-6, 6),
            life: randRange(0.25, 0.5),
            color: '#888',
            size: randRange(2, 4),
        });
    }

    spawnDeathBurst(x, y, type, color) {
        // Initial pop flash — all types
        for (let i = 0; i < 3; i++) {
            const ang = randRange(0, Math.PI * 2);
            this.acquire({
                x, y,
                vx: Math.cos(ang) * randRange(30, 60),
                vy: Math.sin(ang) * randRange(30, 60),
                life: 0.1,
                color: '#fff',
                size: randRange(3, 5),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-10, 10),
            });
        }

        switch (type) {
            case 'runner':
                for (let i = 0; i < 10; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(150, 220);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.15, 0.25),
                        color,
                        size: randRange(1.5, 3),
                    });
                }
                break;

            case 'grunt':
                for (let i = 0; i < 8; i++) {
                    const ang = (Math.PI * 2 * i) / 8 + randRange(-0.2, 0.2);
                    const spd = randRange(40, 100);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.3, 0.6),
                        color,
                        size: randRange(2, 4),
                        gravity: 50,
                    });
                }
                for (let i = 0; i < 4; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(30, 70);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.4, 0.7),
                        color,
                        size: randRange(3, 5),
                        type: 'crystal',
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-6, 6),
                    });
                }
                break;

            case 'tank':
                for (let i = 0; i < 14; i++) {
                    const ang = (Math.PI * 2 * i) / 14 + randRange(-0.2, 0.2);
                    const spd = randRange(60, 140);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.4, 0.8),
                        color,
                        size: randRange(3, 6),
                        type: 'shard',
                        gravity: 120,
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-12, 12),
                    });
                }
                // Gray armor shards
                for (let i = 0; i < 5; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(40, 100);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.3, 0.6),
                        color: '#888',
                        size: randRange(2, 4),
                        type: 'shard',
                        gravity: 100,
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-8, 8),
                    });
                }
                break;

            case 'swarm':
                for (let i = 0; i < 4; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(20, 50);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.15, 0.3),
                        color,
                        size: randRange(1, 2),
                    });
                }
                break;

            case 'healer':
                for (let i = 0; i < 8; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(30, 70);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.5, 0.9),
                        color: '#2ecc71',
                        size: randRange(3, 5),
                        type: 'crystal',
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-6, 6),
                    });
                }
                // Upward floating green dots
                for (let i = 0; i < 5; i++) {
                    this.acquire({
                        x: x + randRange(-8, 8),
                        y,
                        vx: randRange(-10, 10),
                        vy: -60 + randRange(-20, 0),
                        life: randRange(0.6, 1.0),
                        color: '#55ff88',
                        size: randRange(2, 3),
                    });
                }
                break;

            case 'boss':
                // Massive shatter
                for (let i = 0; i < 20; i++) {
                    const ang = (Math.PI * 2 * i) / 20 + randRange(-0.15, 0.15);
                    const spd = randRange(80, 180);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.5, 1.0),
                        color,
                        size: randRange(4, 7),
                        type: 'shard',
                        gravity: 100,
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-12, 12),
                    });
                }
                // Stars
                for (let i = 0; i < 8; i++) {
                    const ang = randRange(0, Math.PI * 2);
                    const spd = randRange(40, 100);
                    this.acquire({
                        x, y,
                        vx: Math.cos(ang) * spd,
                        vy: Math.sin(ang) * spd,
                        life: randRange(0.3, 0.6),
                        color: '#ffd700',
                        size: randRange(4, 7),
                        type: 'star',
                        rotation: randRange(0, Math.PI * 2),
                        rotSpeed: randRange(-8, 8),
                    });
                }
                // Staggered rings
                for (let i = 0; i < 3; i++) {
                    this.acquire({
                        x, y, vx: 0, vy: 0,
                        life: 0.3 + i * 0.12,
                        color: i === 0 ? '#fff' : '#ffd700',
                        size: 20 + i * 12,
                        type: 'ring',
                    });
                }
                break;

            default:
                // Fallback — generic explosion
                this.spawnExplosion(x, y, color);
                break;
        }
    }

    spawnPlacementBurst(x, y, color, towerSize) {
        // Radial star burst
        for (let i = 0; i < 10; i++) {
            const ang = (Math.PI * 2 * i) / 10 + randRange(-0.2, 0.2);
            const spd = randRange(50, 120);
            this.acquire({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.25, 0.45),
                color,
                size: randRange(2, 4),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-8, 8),
            });
        }
        // Base ring
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.35,
            color,
            size: towerSize * 24,
            type: 'ring',
        });
    }

    spawnUpgradeSparkle(x, y) {
        // Gold stars rising upward
        for (let i = 0; i < 15; i++) {
            this.acquire({
                x: x + randRange(-12, 12),
                y: y + randRange(-6, 6),
                vx: randRange(-30, 30),
                vy: randRange(-120, -80),
                life: randRange(0.4, 0.8),
                color: '#ffd700',
                size: randRange(2, 5),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-8, 8),
                gravity: -20,
            });
        }
        // Expanding gold rings (staggered)
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.35,
            color: '#ffd700',
            size: 20,
            type: 'ring',
        });
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.5,
            color: '#ffaa00',
            size: 30,
            type: 'ring',
        });
    }

    spawnSellDissolve(x, y, color, towerSize) {
        // Tower color + gray shards with gravity
        for (let i = 0; i < 16; i++) {
            const ang = (Math.PI * 2 * i) / 16 + randRange(-0.3, 0.3);
            const spd = randRange(40, 100);
            const shardColor = i % 3 === 0 ? '#888' : color;
            this.acquire({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.7),
                color: shardColor,
                size: randRange(2, 5),
                type: 'shard',
                gravity: 150,
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-10, 10),
            });
        }
        // Ground dust
        for (let i = 0; i < 8; i++) {
            this.acquire({
                x: x + randRange(-10, 10),
                y: y + towerSize * 12,
                vx: randRange(-15, 15),
                vy: randRange(-25, -10),
                life: randRange(0.3, 0.5),
                color: '#a0896a',
                size: randRange(1.5, 3),
            });
        }
        // Fading ring
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.4,
            color: '#fff',
            size: towerSize * 28,
            type: 'ring',
        });
    }

    spawnConfetti(x, y, count) {
        const colors = ['#ffd700', '#c0c0c0', '#9b59b6', '#3498db'];
        for (let i = 0; i < count; i++) {
            const ang = randRange(-0.4, -Math.PI + 0.4); // mostly downward
            const spd = randRange(60, 160);
            this.acquire({
                x: x + randRange(-200, 200),
                y,
                vx: Math.cos(ang) * spd + randRange(-40, 40),
                vy: Math.abs(Math.sin(ang) * spd) + randRange(20, 60),
                life: randRange(1.0, 2.0),
                color: colors[Math.floor(Math.random() * colors.length)],
                size: randRange(3, 6),
                type: 'star',
                gravity: 80,
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-10, 10),
            });
        }
    }

    spawnAuraPulse(x, y, radius, color) {
        this.acquire({
            x,
            y,
            vx: 0,
            vy: 0,
            life: 0.4,
            color,
            size: radius,
            type: 'ring',
        });
    }

    spawnTransformSlam(x, y, color) {
        // Heavy radial dust burst
        for (let i = 0; i < 20; i++) {
            const ang = (Math.PI * 2 * i) / 20 + randRange(-0.2, 0.2);
            const spd = randRange(80, 180);
            this.acquire({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.35, 0.6),
                color: '#a0896a',
                size: randRange(2, 4),
                gravity: 200,
            });
        }
        // Colored star shards flying outward
        for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i) / 12 + randRange(-0.3, 0.3);
            const spd = randRange(100, 200);
            this.acquire({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.7),
                color,
                size: randRange(3, 6),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-12, 12),
            });
        }
        // Upward sparkle fountain
        for (let i = 0; i < 8; i++) {
            this.acquire({
                x: x + randRange(-6, 6),
                y,
                vx: randRange(-25, 25),
                vy: randRange(-160, -100),
                life: randRange(0.5, 0.9),
                color: '#fff',
                size: randRange(2, 4),
                type: 'star',
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-8, 8),
                gravity: 80,
            });
        }
        // Staggered impact rings
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.35,
            color: '#fff',
            size: 35,
            type: 'ring',
        });
        this.acquire({
            x, y, vx: 0, vy: 0,
            life: 0.5,
            color,
            size: 50,
            type: 'ring',
        });
    }

    spawnShatter(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + randRange(-0.3, 0.3);
            const spd = randRange(60, 140);
            this.acquire({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: randRange(0.4, 0.8),
                color,
                size: randRange(3, 6),
                type: 'shard',
                gravity: 120,
                rotation: randRange(0, Math.PI * 2),
                rotSpeed: randRange(-12, 12),
            });
        }
    }

    update(dt) {
        this.activeCount = 0;
        for (const p of this.pool) {
            if (p.active) {
                p.update(dt);
                if (p.active) this.activeCount++;
            }
        }
    }

    draw(ctx) {
        for (const p of this.pool) {
            if (!p.active) continue;

            ctx.globalAlpha = p.alpha;

            if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else if (p.type === 'line') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size;
                ctx.beginPath();
                // Jagged lightning
                const dx = p.x2 - p.x;
                const dy = p.y2 - p.y;
                const segs = 5;
                ctx.moveTo(p.x, p.y);
                for (let i = 1; i < segs; i++) {
                    const t = i / segs;
                    const jx = randRange(-8, 8);
                    const jy = randRange(-8, 8);
                    ctx.lineTo(p.x + dx * t + jx, p.y + dy * t + jy);
                }
                ctx.lineTo(p.x2, p.y2);
                ctx.stroke();
            } else if (p.type === 'shard') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                const s = p.size * p.alpha;
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.5, s * 0.4);
                ctx.lineTo(-s * 0.5, s * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'crystal') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                const s = p.size * p.alpha;
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.6, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'star') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                const s = p.size * p.alpha;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI / 2) * i;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                    ctx.lineTo(Math.cos(a + 0.3) * s * 0.4, Math.sin(a + 0.3) * s * 0.4);
                    ctx.lineTo(0, 0);
                }
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'ring') {
                const progress = 1 - (p.life / p.maxLife);
                const radius = p.size * progress;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2 * p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    reset() {
        for (const p of this.pool) {
            p.active = false;
        }
        this.activeCount = 0;
    }
}
