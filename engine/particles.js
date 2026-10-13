/* The Linear Maze — engine/particles.js
 * A pooled particle system. Each particle type has a draw pass:
 *   'under'   drawn on the floor beneath entities (smoke, shells, ripples)
 *   'normal'  drawn above entities, lit by the lightmap (debris, blood)
 *   'glow'    additive, ignores darkness (sparks, embers, flashes, rings)
 *   'overlay' drawn last, unlit (damage numbers)
 * Packs can add types with LM.particleTypes[name] = { pass, draw(ctx,p), update? }.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;

  const TYPES = (LM.particleTypes = {
    spark: {
      pass: 'glow',
      draw(ctx, p, k) {
        const len = p.len || 0.03;
        ctx.strokeStyle = U.rgba(p.color, k);
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
        ctx.stroke();
      },
    },
    ember: {
      pass: 'glow',
      draw(ctx, p, k) {
        LM.gfx.glow(ctx, p.x, p.y, p.size * 3, p.color, k);
      },
    },
    flash: {
      pass: 'glow',
      draw(ctx, p, k) {
        LM.gfx.glow(ctx, p.x, p.y, p.size * (0.6 + (1 - k) * 0.6), p.color, k);
      },
    },
    ring: {
      pass: 'glow',
      draw(ctx, p, k) {
        const r = p.size + (p.grow || 60) * (1 - k);
        ctx.strokeStyle = U.rgba(p.color, k * 0.9);
        ctx.lineWidth = (p.width || 3) * k + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, U.TAU);
        ctx.stroke();
      },
    },
    smoke: {
      pass: 'normal',
      draw(ctx, p, k) {
        const r = p.size * (1 + (1 - k) * 1.6);
        ctx.fillStyle = U.rgba(p.color, k * (p.alpha || 0.35));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, U.TAU);
        ctx.fill();
      },
    },
    dot: {
      pass: 'normal',
      draw(ctx, p, k) {
        ctx.fillStyle = U.rgba(p.color, Math.min(1, k * 1.5));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, U.TAU);
        ctx.fill();
      },
    },
    chunk: {
      pass: 'normal',
      draw(ctx, p, k) {
        ctx.save();
        ctx.translate(p.x, p.y - (p.z || 0));
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = U.rgba(p.color, Math.min(1, k * 2));
        ctx.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
        ctx.restore();
      },
    },
    shell: {
      pass: 'under',
      draw(ctx, p, k) {
        ctx.save();
        ctx.translate(p.x, p.y - (p.z || 0));
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = U.rgba(p.color || '#d8a84e', Math.min(1, k * 3));
        ctx.fillRect(-1.6, -0.8, 3.2, 1.6);
        ctx.restore();
      },
    },
    ripple: {
      pass: 'under',
      draw(ctx, p, k) {
        ctx.strokeStyle = U.rgba(p.color || '#a8e4ea', k * 0.5);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size + (1 - k) * (p.grow || 10), (p.size + (1 - k) * (p.grow || 10)) * 0.75, 0, 0, U.TAU);
        ctx.stroke();
      },
    },
    mote: {
      pass: 'normal',
      draw(ctx, p, k) {
        const fade = Math.min(k * 3, (1 - k) * 3, 1);
        ctx.fillStyle = U.rgba(p.color, fade * (p.alpha || 0.5));
        ctx.fillRect(p.x, p.y, p.size, p.size);
      },
    },
    text: {
      pass: 'overlay',
      draw(ctx, p, k) {
        const a = Math.min(1, k * 2.5);
        ctx.font = '600 ' + (p.size || 9) + 'px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(8,8,12,' + a * 0.85 + ')';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = U.rgba(p.color || '#ffffff', a);
        ctx.fillText(p.text, p.x, p.y);
      },
    },
  });

  class Particles {
    constructor(max) {
      this.max = max || 1800;
      this.list = [];
    }
    clear() {
      this.list.length = 0;
    }
    add(p) {
      if (this.list.length >= this.max) this.list.shift();
      p.life = p.life || 0.5;
      p.max = p.life;
      p.vx = p.vx || 0;
      p.vy = p.vy || 0;
      p.size = p.size == null ? 2 : p.size;
      p.drag = p.drag == null ? 3 : p.drag;
      this.list.push(p);
      return p;
    }
    /** Burst helper: n particles flying outward from (x,y). */
    burst(x, y, n, o) {
      for (let i = 0; i < n; i++) {
        const a = o.angle != null ? o.angle + U.rand(-(o.spread || Math.PI), o.spread || Math.PI) : Math.random() * U.TAU;
        const sp = U.rand(o.speedMin || 40, o.speed || 160);
        this.add({
          type: o.type || 'spark',
          x: x + (o.jitter ? U.rand(-o.jitter, o.jitter) : 0),
          y: y + (o.jitter ? U.rand(-o.jitter, o.jitter) : 0),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: U.rand(o.lifeMin || (o.life || 0.4) * 0.5, o.life || 0.4),
          size: o.size == null ? 1.2 : typeof o.size === 'number' ? o.size : U.rand(o.size[0], o.size[1]),
          color: Array.isArray(o.color) ? U.pick(o.color) : o.color || '#ffd890',
          drag: o.drag,
          len: o.len,
          z: o.z,
          vz: o.vz != null ? U.rand(o.vz * 0.5, o.vz) : undefined,
          rot: Math.random() * 6,
          vr: o.vr != null ? U.rand(-o.vr, o.vr) : 0,
          decal: o.decal,
          alpha: o.alpha,
          grow: o.grow,
        });
      }
    }
    update(dt, game) {
      const L = this.list;
      let j = 0;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) {
          if (p.decal && game && game.renderer) game.renderer.addDecal(Object.assign({ x: p.x, y: p.y }, p.decal));
          continue;
        }
        const f = Math.exp(-p.drag * dt);
        p.vx *= f;
        p.vy *= f;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vz != null) {
          p.z = (p.z || 0) + p.vz * dt;
          p.vz -= 420 * dt;
          if (p.z < 0) {
            p.z = 0;
            p.vz = -p.vz * 0.35;
            p.vx *= 0.6;
            p.vy *= 0.6;
            if (Math.abs(p.vz) < 20) p.vz = 0;
          }
        }
        if (p.vr) p.rot += p.vr * dt * (p.z > 0 || p.vz ? 1 : 0.2);
        const ty = TYPES[p.type];
        if (ty && ty.update) ty.update(p, dt, game);
        L[j++] = p;
      }
      L.length = j;
    }
    draw(ctx, pass, view) {
      for (const p of this.list) {
        const ty = TYPES[p.type];
        if (!ty || ty.pass !== pass) continue;
        if (view && (p.x < view.x0 - 40 || p.x > view.x1 + 40 || p.y < view.y0 - 40 || p.y > view.y1 + 40)) continue;
        ty.draw(ctx, p, p.life / p.max);
      }
    }
  }
  LM.Particles = Particles;
})();
