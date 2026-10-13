/* The Linear Maze — engine/traps.js
 * A trap = one trigger + a list of effects, declared in a level file:
 *
 *   traps: [{
 *     trigger: { type: 'plate', tag: 'p1' },   // plate | beam | door | pickup | zone | clear
 *     effects: [{ type: 'darts', tag: 'd1', volleys: 3 }, { type: 'message', text: '...' }],
 *     once: true, cooldown: 2,
 *   }]
 *
 * Tags come from the level legend, so traps are wired by name, not coordinates.
 * Effect types are registered by packs (LM.registry.effects).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;

  class Trap {
    constructor(game, def, index) {
      this.def = def;
      this.index = index;
      this.trigger = def.trigger || {};
      this.once = def.once !== false;
      this.cooldown = def.cooldown || 2;
      this.cd = 0;
      this.armed = true;
      this.spawned = [];
      this.sealed = [];
      this.pressed = false;
      this.beams = [];
      this.fired = 0;
      const L = game.level, tr = this.trigger;
      const tiles = (tr.tag && L.tags[tr.tag]) || [];
      if (tr.tag && !L.tags[tr.tag] && !['door', 'pickup', 'clear', 'flag'].includes(tr.type)) {
        console.warn('[LM] Trap trigger tag "' + tr.tag + '" not found in level ' + L.id);
      }
      this.tiles = tiles;
      if (tr.type === 'beam') this.buildBeams(game);
      if (tr.type === 'plate') for (const p of tiles) game.plates.set(p.y * L.w + p.x, this);
    }
    buildBeams(game) {
      const L = game.level;
      const pts = this.tiles.slice();
      const used = new Set();
      // emitters pair up with the nearest aligned emitter that has open floor between them
      const clearBetween = (a, b) => {
        const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
        let x = a.x + dx, y = a.y + dy, n = 0;
        while (x !== b.x || y !== b.y) {
          if (L.solidAt(x, y)) return false;
          x += dx;
          y += dy;
          n++;
        }
        return n > 0;
      };
      for (let i = 0; i < pts.length; i++) {
        if (used.has(i)) continue;
        let best = -1, bestD = Infinity;
        for (let j = 0; j < pts.length; j++) {
          if (j === i || used.has(j)) continue;
          const a = pts[i], b = pts[j];
          if (a.x !== b.x && a.y !== b.y) continue;
          const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (d < bestD && clearBetween(a, b)) {
            best = j;
            bestD = d;
          }
        }
        if (best >= 0) {
          const j = best;
          const a = pts[i], b = pts[j];
          used.add(i);
          used.add(j);
          const ax = a.x * T + T / 2, ay = a.y * T + T / 2, bx = b.x * T + T / 2, by = b.y * T + T / 2;
          // run the beam between the facing wall surfaces
          const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
          this.beams.push({ x0: ax + dx * T * 0.5, y0: ay + dy * T * 0.5, x1: bx - dx * T * 0.5, y1: by - dy * T * 0.5 });
        }
      }
      if (!this.beams.length) console.warn('[LM] Beam trap in ' + L.id + ' found no aligned emitter pairs for tag ' + this.trigger.tag);
    }
    fire(game) {
      if (!this.armed) return;
      this.fired++;
      LM.audio.play('trap');
      for (const ef of this.def.effects || []) {
        const fx = LM.find('effects', ef.type);
        if (!fx) {
          console.warn('[LM] Unknown trap effect ' + ef.type);
          continue;
        }
        if (ef.delay) game.schedule(ef.delay, () => fx.run(game, ef, this));
        else fx.run(game, ef, this);
      }
      if (this.once) this.armed = false;
      else this.cd = this.cooldown;
    }
    onEvent(game, type, tag) {
      if (this.trigger.type === type && this.trigger.tag === tag) this.fire(game);
    }
    update(dt, game) {
      this.cd -= dt;
      const P = game.player;
      const L = game.level;
      const tr = this.trigger;
      if (P && !P.dead && P.falling <= 0) {
        if (tr.type === 'plate' || tr.type === 'zone') {
          const tx = Math.floor(P.x / T), ty = Math.floor(P.y / T);
          let on = false;
          for (const p of this.tiles) if (p.x === tx && p.y === ty) on = true;
          if (on && !this.pressed && this.cd <= 0) this.fire(game);
          if (on !== this.pressed && tr.type === 'plate') LM.audio.play('switch', { vol: 0.6 });
          this.pressed = on;
        } else if (tr.type === 'beam' && this.armed && this.cd <= 0) {
          for (const b of this.beams) {
            if (segCircle(b.x0, b.y0, b.x1, b.y1, P.x, P.y, P.r)) {
              this.fire(game);
              this.flashT = 0.5;
              break;
            }
          }
        }
      }
      if (tr.type === 'clear' && this.armed) {
        // the group is captured once, because dead enemies leave game.enemies
        if (!this.group) this.group = game.enemies.filter((e) => e.tag === tr.tag);
        if (this.group.length && this.group.every((e) => e.dead)) this.fire(game);
      }
      // a lockdown ends when everything this trap summoned is dead
      if (this.sealed.length && this.spawned.length && this.spawned.every((e) => e.dead)) {
        for (const d of this.sealed) d.sealed = false;
        this.sealed = [];
        game.toast('The seals release', 'good');
        LM.audio.play('door');
      }
      if (this.flashT) this.flashT -= dt;
    }
    drawGlow(ctx, game, t) {
      if (!this.beams.length || (!this.armed && !(this.flashT > 0))) return;
      const a = this.armed ? 0.55 + 0.25 * Math.sin(t * 20 + this.index) : Math.max(0, this.flashT) * 2;
      for (const b of this.beams) {
        ctx.strokeStyle = 'rgba(255,60,50,' + a + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x0, b.y0);
        ctx.lineTo(b.x1, b.y1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,70,' + a * 0.25 + ')';
        ctx.lineWidth = 4;
        ctx.stroke();
        G.glow(ctx, b.x0, b.y0, 8, '#ff4a3a', a);
        G.glow(ctx, b.x1, b.y1, 8, '#ff4a3a', a);
      }
    }
  }
  function segCircle(x0, y0, x1, y1, cx, cy, r) {
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    const k = U.clamp(((cx - x0) * dx + (cy - y0) * dy) / l2, 0, 1);
    return U.dist2(cx, cy, x0 + dx * k, y0 + dy * k) < r * r;
  }
  LM.Trap = Trap;
})();
