/* The Linear Maze — engine/render.js
 * Draw order each frame:
 *   1. baked terrain chunks (floors, walls, static decor, decals)
 *   2. animated terrain (water, spikes, slag, plates)
 *   3. shadows, items, doors, enemies, player, projectiles, particles
 *   4. lightmap, multiplied over the scene (ambient + coloured lights,
 *      each clipped by its own visibility polygon, then the player's
 *      line-of-sight mask)
 *   5. emissive pass ('lighter'): glows, tracers, beams, telegraphs
 *   6. overlays: damage numbers, interaction ring, crosshair, vignette
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util;
  const CH = 8; // tiles per chunk side
  const CHW = CH * T;
  const LT = 12; // tiles per light-tile side

  /** One static light: a radial gradient clipped to the light's own visibility polygon. */
  function paintLight(g, L, li, k) {
    if (!li.poly || li.dirty) {
      li.poly = LM.physics.visibility(L, li.x, li.y, li.r, { uniform: 96, extend: 9 });
      li.dirty = false;
    }
    const grd = g.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r);
    grd.addColorStop(0, U.rgba(li.color, Math.min(1, k)));
    grd.addColorStop(0.35, U.rgba(li.color, Math.min(1, k * 0.5)));
    grd.addColorStop(1, U.rgba(li.color, 0));
    g.fillStyle = grd;
    LM.gfx.polyPath(g, li.poly);
    g.fill();
  }

  // ------------------------------------------------------------ shared drawing helpers
  const G = (LM.gfx = {});
  const glowCache = new Map();
  /** A soft round glow sprite for a colour, cached. */
  G.glowSprite = function (color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, U.rgba(color, 1));
    grd.addColorStop(0.25, U.rgba(color, 0.55));
    grd.addColorStop(0.6, U.rgba(color, 0.14));
    grd.addColorStop(1, U.rgba(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  };
  G.glow = function (ctx, x, y, radius, color, alpha) {
    if (alpha <= 0.002) return;
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * Math.min(1, alpha);
    ctx.drawImage(G.glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = a;
  };
  G.shadow = function (ctx, x, y, r, alpha) {
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha == null ? 0.38 : alpha) + ')';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y + r * 0.45, r * 1.05, r * 0.62, 0, 0, U.TAU);
    ctx.fill();
  };
  G.circle = function (ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, U.TAU);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lw || 1;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };
  G.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  G.polyPath = function (ctx, pts) {
    ctx.beginPath();
    if (pts.length < 2) return;
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  };

  // ------------------------------------------------------------ decal painters
  const DECALS = (LM.decals = {
    blood(g, d, rnd) {
      g.fillStyle = d.color;
      for (let i = 0; i < 7; i++) {
        const a = rnd() * U.TAU, rr = rnd() * d.r;
        g.globalAlpha = 0.35 + rnd() * 0.4;
        g.beginPath();
        g.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, d.r * (0.18 + rnd() * 0.35), 0, U.TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    },
    scorch(g, d) {
      const grd = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      grd.addColorStop(0, 'rgba(8,6,5,0.75)');
      grd.addColorStop(0.6, 'rgba(15,12,10,0.4)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, U.TAU);
      g.fill();
    },
    debris(g, d, rnd) {
      g.fillStyle = d.color;
      for (let i = 0; i < 6; i++) {
        const a = rnd() * U.TAU, rr = rnd() * d.r;
        g.globalAlpha = 0.6;
        g.fillRect(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, 1.5 + rnd() * 2.5, 1 + rnd() * 2);
      }
      g.globalAlpha = 1;
    },
  });

  // ------------------------------------------------------------ renderer
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.lc = document.createElement('canvas');
      this.lctx = this.lc.getContext('2d');
      this.chunks = new Map();
      this.chunkOrder = [];
      this.decals = [];
      this.level = null;
      this.time = 0;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, window.innerWidth), h = Math.max(240, window.innerHeight);
      this.cssW = w;
      this.cssH = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.dpr = dpr;
      // Show roughly 1000x620 world units on a typical screen.
      this.zoom = U.clamp(Math.min(w / 1000, h / 620), 0.75, 2.6);
      this.scale = this.zoom * dpr;
      this.lc.width = Math.ceil(this.canvas.width / 2);
      this.lc.height = Math.ceil(this.canvas.height / 2);
      this.chunks.clear();
      this.chunkOrder.length = 0;
    }
    setLevel(level) {
      this.level = level;
      this.chunks.clear();
      this.chunkOrder.length = 0;
      this.decals = [];
      this.lightTiles = new Map();
      this.lightTileScale = 0;
    }
    screenToWorld(sx, sy, cam) {
      return { x: cam.x + (sx - this.cssW / 2) / this.zoom, y: cam.y + (sy - this.cssH / 2) / this.zoom };
    }
    viewHalf() {
      return { w: this.cssW / 2 / this.zoom, h: this.cssH / 2 / this.zoom };
    }

    // ---------------------------------------------------- terrain baking
    getChunk(cx, cy) {
      const key = cx + ',' + cy;
      let c = this.chunks.get(key);
      if (c) return c;
      c = this.bakeChunk(cx, cy);
      this.chunks.set(key, c);
      this.chunkOrder.push(key);
      if (this.chunkOrder.length > 56) {
        const old = this.chunkOrder.shift();
        this.chunks.delete(old);
      }
      return c;
    }
    bakeChunk(cx, cy) {
      const L = this.level, env = L.env, s = this.scale;
      const c = document.createElement('canvas');
      c.width = Math.ceil(CHW * s) + 1;
      c.height = Math.ceil(CHW * s) + 1;
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, -cx * CHW * s, -cy * CHW * s);
      g.fillStyle = env.voidColor;
      g.fillRect(cx * CHW, cy * CHW, CHW + 1, CHW + 1);
      const tx0 = cx * CH, ty0 = cy * CH;
      const info = { level: L, env, T, x: 0, y: 0, rnd: null, n: (dx, dy) => L.t(info.x + dx, info.y + dy), variant: 0 };
      for (let layer = 0; layer < 2; layer++) {
        for (let ty = ty0; ty < ty0 + CH; ty++) {
          for (let tx = tx0; tx < tx0 + CH; tx++) {
            if (!L.inBounds(tx, ty)) continue;
            const d = L.t(tx, ty);
            if ((d.layer || 0) !== layer) continue;
            info.x = tx;
            info.y = ty;
            info.variant = L.variant[ty * L.w + tx];
            info.rnd = U.mulberry32((L.seed ^ (tx * 7919 + ty * 104729)) >>> 0);
            g.save();
            if (d.bake) d.bake(g, tx * T, ty * T, info);
            g.restore();
            if (layer === 0 && !d.noAO) this.bakeAO(g, tx, ty);
          }
        }
      }
      // replay decals that overlap this chunk
      const x0 = cx * CHW, y0 = cy * CHW;
      for (const d of this.decals) {
        if (d.x + d.r < x0 || d.y + d.r < y0 || d.x - d.r > x0 + CHW || d.y - d.r > y0 + CHW) continue;
        this.paintDecal(g, d);
      }
      return c;
    }
    /** Soft contact shadow on ground tiles next to tall solids. */
    bakeAO(g, tx, ty) {
      const L = this.level;
      const x = tx * T, y = ty * T;
      const tall = (dx, dy) => {
        const d = L.t(tx + dx, ty + dy);
        return d.tall;
      };
      const S = 11;
      const col = 'rgba(0,0,0,0.42)';
      const sides = [
        [0, -1, x, y, x, y + S, x, y, T, S],
        [-1, 0, x, y, x + S, y, x, y, S, T],
        [1, 0, x + T, y, x + T - S, y, x + T - S, y, S, T],
        [0, 1, x, y + T, x, y + T - S * 0.6, x, y + T - S * 0.6, T, S * 0.6],
      ];
      for (const [dx, dy, gx0, gy0, gx1, gy1, rx, ry, rw, rh] of sides) {
        if (!tall(dx, dy)) continue;
        const grd = g.createLinearGradient(gx0, gy0, gx1, gy1);
        grd.addColorStop(0, col);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(rx, ry, rw, rh);
      }
      // corner occlusion
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (!tall(dx, dy) || tall(dx, 0) || tall(0, dy)) continue;
        const px = dx < 0 ? x : x + T, py = dy < 0 ? y : y + T;
        const grd = g.createRadialGradient(px, py, 0, px, py, S);
        grd.addColorStop(0, col);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(px - S, py - S, S * 2, S * 2);
      }
    }
    paintDecal(g, d) {
      const fn = DECALS[d.type];
      if (!fn) return;
      g.save();
      fn(g, d, U.mulberry32(d.seed));
      g.restore();
    }
    addDecal(d) {
      d.seed = (Math.random() * 1e9) | 0;
      this.decals.push(d);
      if (this.decals.length > 700) this.decals.shift();
      const s = this.scale;
      const cx0 = Math.floor((d.x - d.r) / CHW), cx1 = Math.floor((d.x + d.r) / CHW);
      const cy0 = Math.floor((d.y - d.r) / CHW), cy1 = Math.floor((d.y + d.r) / CHW);
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const c = this.chunks.get(cx + ',' + cy);
          if (!c) continue;
          const g = c.getContext('2d');
          g.setTransform(s, 0, 0, s, -cx * CHW * s, -cy * CHW * s);
          // keep decals on the ground: clip out tall tiles
          g.save();
          g.beginPath();
          const tx0 = Math.floor((d.x - d.r) / T), tx1 = Math.floor((d.x + d.r) / T);
          const ty0 = Math.floor((d.y - d.r) / T), ty1 = Math.floor((d.y + d.r) / T);
          for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
            const td = this.level.t(tx, ty);
            if (!td.tall && !td.noDecals) g.rect(tx * T, ty * T, T, T);
          }
          g.clip();
          this.paintDecal(g, d);
          g.restore();
        }
      }
    }
    invalidateTile(tx, ty) {
      const key = Math.floor(tx / CH) + ',' + Math.floor(ty / CH);
      this.chunks.delete(key);
      const i = this.chunkOrder.indexOf(key);
      if (i >= 0) this.chunkOrder.splice(i, 1);
    }

    // ---------------------------------------------------- frame
    render(game, dt) {
      this.time += dt;
      const L = game.level;
      if (!L) return;
      const ctx = this.ctx, s = this.scale, env = L.env;
      const cw = this.canvas.width, chh = this.canvas.height;
      const cam = game.cam;
      const camX = cam.x + cam.shakeX, camY = cam.y + cam.shakeY;
      const ox = Math.round(cw / 2 - camX * s), oy = Math.round(chh / 2 - camY * s);
      this.ox = ox;
      this.oy = oy;
      const view = { x0: -ox / s, y0: -oy / s, x1: (cw - ox) / s, y1: (chh - oy) / s };
      this.view = view;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = env.voidColor;
      ctx.fillRect(0, 0, cw, chh);

      // 1. baked chunks
      const cx0 = Math.floor(view.x0 / CHW), cx1 = Math.floor(view.x1 / CHW);
      const cy0 = Math.floor(view.y0 / CHW), cy1 = Math.floor(view.y1 / CHW);
      const maxCX = Math.ceil(L.w / CH), maxCY = Math.ceil(L.h / CH);
      let baked = 0;
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          if (cx < 0 || cy < 0 || cx >= maxCX || cy >= maxCY) continue;
          const key = cx + ',' + cy;
          if (!this.chunks.has(key)) baked++;
          const c = this.getChunk(cx, cy);
          ctx.drawImage(c, ox + Math.round(cx * CHW * s), oy + Math.round(cy * CHW * s));
        }
      }

      // bake one chunk just outside the view each quiet frame, so walking into new areas doesn't hitch
      if (!baked) {
        outer: for (let cy = cy0 - 1; cy <= cy1 + 1; cy++) {
          for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) {
            if (cx < 0 || cy < 0 || cx >= maxCX || cy >= maxCY || this.chunks.has(cx + ',' + cy)) continue;
            this.getChunk(cx, cy);
            break outer;
          }
        }
      }

      ctx.setTransform(s, 0, 0, s, ox, oy);
      const t = this.time;
      const tx0 = Math.max(0, Math.floor(view.x0 / T)), tx1 = Math.min(L.w - 1, Math.floor(view.x1 / T));
      const ty0 = Math.max(0, Math.floor(view.y0 / T)), ty1 = Math.min(L.h - 1, Math.floor(view.y1 / T));
      this.tileView = { tx0, tx1, ty0, ty1 };

      // 2. animated terrain
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const d = L.terrain[ty * L.w + tx];
          if (d.drawDynamic) d.drawDynamic(ctx, tx * T, ty * T, tx, ty, game, t);
        }
      }

      // 3. world objects
      const pad = 48;
      const inView = (x, y) => x > view.x0 - pad && x < view.x1 + pad && y > view.y0 - pad && y < view.y1 + pad;
      const drawables = this._drawables || (this._drawables = []);
      drawables.length = 0;
      for (const it of game.items) if (!it.dead && inView(it.x, it.y)) drawables.push(it);
      for (const d of game.doors) if (inView(d.x, d.y)) drawables.push(d);
      for (const e of game.enemies) if (!e.dead && inView(e.x, e.y) && (game.attract || e.visible)) drawables.push(e);
      for (const n of game.npcs) if (inView(n.x, n.y) && n.vis > 0.01) drawables.push(n);
      if (game.player && !game.attract) drawables.push(game.player);
      drawables.sort((a, b) => (a.z || 0) - (b.z || 0) || a.y - b.y);
      for (const o of drawables) if (o.drawShadow) o.drawShadow(ctx, game, t);
      game.particles.draw(ctx, 'under', view);
      for (const o of drawables) o.draw(ctx, game, t);
      for (const p of game.projectiles) if (inView(p.x, p.y)) p.draw(ctx, game, t);
      for (const fx of game.fx) if (fx.draw) fx.draw(ctx, game, t);
      game.particles.draw(ctx, 'normal', view);

      // 4. lighting
      this.renderLight(game, view, ox, oy);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.lc, 0, 0, this.lc.width, this.lc.height, 0, 0, this.lc.width * 2, this.lc.height * 2);

      // 5. emissive
      ctx.globalCompositeOperation = 'lighter';
      ctx.setTransform(s, 0, 0, s, ox, oy);
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const d = L.terrain[ty * L.w + tx];
          if (d.drawGlow) d.drawGlow(ctx, tx * T, ty * T, tx, ty, game, t);
        }
      }
      for (const o of drawables) if (o.drawGlow) o.drawGlow(ctx, game, t);
      for (const p of game.projectiles) if (inView(p.x, p.y)) p.drawGlow(ctx, game, t);
      for (const fx of game.fx) if (fx.drawGlow) fx.drawGlow(ctx, game, t);
      for (const tr of game.traps) if (tr.drawGlow) tr.drawGlow(ctx, game, t);
      game.particles.draw(ctx, 'glow', view);
      ctx.globalCompositeOperation = 'source-over';

      // 6. overlays
      game.particles.draw(ctx, 'overlay', view);
      for (const o of drawables) if (o.drawOverlay) o.drawOverlay(ctx, game, t);
      if (game.focus && !game.attract && !game.focus.isNPC) this.drawFocus(ctx, game.focus, t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (!game.attract) this.drawScreenFX(ctx, game, cw, chh);
      return baked;
    }

    renderLight(game, view, ox, oy) {
      const L = game.level, env = L.env, g = this.lctx, s2 = this.scale / 2;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = game.attract ? env.attractAmbient || env.ambient : L.ambient || env.ambient; // L.ambient: set by the 'ambient' trap effect
      g.fillRect(0, 0, this.lc.width, this.lc.height);
      g.setTransform(s2, 0, 0, s2, ox / 2, oy / 2);
      g.globalCompositeOperation = 'lighter';
      const t = this.time;
      const margin = 260;
      // steady static lights (ceiling panels, windows, anything that doesn't flicker) are painted once
      // into world-space light tiles; flickering ones (torches, braziers, slag...) are drawn every frame
      if (!game.attract) this.drawSteadyLights(game, g, view, s2);
      for (const li of game.staticLights) {
        if (li.off || (!li.flicker && !game.attract)) continue;
        if (li.x + li.r < view.x0 - margin || li.x - li.r > view.x1 + margin || li.y + li.r < view.y0 - margin || li.y - li.r > view.y1 + margin) continue;
        let k = li.intensity;
        if (li.flicker) k *= 1 - li.flicker * (0.5 + 0.5 * Math.sin(t * 13 + li.phase) * Math.sin(t * 7.3 + li.phase * 2));
        paintLight(g, L, li, k);
      }
      // the player's light: a soft aura plus a cone toward the aim
      const P = game.player;
      if (P && !game.attract && game.los) {
        const st = P.stats();
        const R = st.lightRadius;
        const col = env.playerLight || '#ffe8c8';
        const aura = R * 0.42;
        let grd = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, aura);
        grd.addColorStop(0, U.rgba(col, 0.75));
        grd.addColorStop(0.5, U.rgba(col, 0.28));
        grd.addColorStop(1, U.rgba(col, 0));
        g.fillStyle = grd;
        LM.gfx.polyPath(g, game.los);
        g.fill();
        g.save();
        const half = 0.62;
        g.beginPath();
        g.moveTo(P.x, P.y);
        g.arc(P.x, P.y, R, P.aim - half, P.aim + half);
        g.closePath();
        g.clip();
        grd = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, R);
        grd.addColorStop(0, U.rgba(col, 0.9));
        grd.addColorStop(0.55, U.rgba(col, 0.42));
        grd.addColorStop(1, U.rgba(col, 0));
        g.fillStyle = grd;
        LM.gfx.polyPath(g, game.los);
        g.fill();
        g.restore();
      }
      // short-lived lights (muzzle flashes, explosions, bolts)
      for (const li of game.lights) {
        const k = li.intensity * (li.max ? Math.max(0, li.life / li.max) : 1);
        if (k <= 0.01) continue;
        const grd = g.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r);
        grd.addColorStop(0, U.rgba(li.color, Math.min(1, k)));
        grd.addColorStop(1, U.rgba(li.color, 0));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(li.x, li.y, li.r, 0, U.TAU);
        g.fill();
      }
      for (const p of game.projectiles) {
        if (!p.def.light) continue;
        const li = p.def.light;
        const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, li.r);
        grd.addColorStop(0, U.rgba(li.color, li.intensity));
        grd.addColorStop(1, U.rgba(li.color, 0));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(p.x, p.y, li.r, 0, U.TAU);
        g.fill();
      }
      // line of sight: everything the player cannot see is pushed into shadow
      if (game.los && !game.attract) {
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = L.outsideSight || env.outsideSight || '#3a3c46';
        g.beginPath();
        g.rect(view.x0 - 10, view.y0 - 10, view.x1 - view.x0 + 20, view.y1 - view.y0 + 20);
        const pts = game.los;
        g.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
        g.closePath();
        g.fill('evenodd');
      }
      g.globalCompositeOperation = 'source-over';
    }

    /** Light tiles: LT x LT world tiles each, baked on first sight, rebaked when a steady light inside changes. */
    drawSteadyLights(game, g, view, s2) {
      const L = game.level, LTW = LT * T;
      const bs = Math.min(s2, 0.75);
      if (bs !== this.lightTileScale) {
        this.lightTiles.clear();
        this.lightTileScale = bs;
      }
      // notice lights that were switched, dimmed, set flickering or had their walls change
      for (const li of game.staticLights) {
        const key = li.flicker ? 'f' : li.off ? 'x' : li.intensity + li.color;
        if (li.dirty && !li.flicker) {
          li.poly = null;
          li.dirty = false;
          li._bk = null;
        }
        if (li._bk === key) continue;
        if (li._bk !== undefined) this.invalidateLight(li);
        li._bk = key;
      }
      const x0 = Math.max(0, Math.floor(view.x0 / LTW)), x1 = Math.min(Math.ceil((L.w * T) / LTW) - 1, Math.floor(view.x1 / LTW));
      const y0 = Math.max(0, Math.floor(view.y0 / LTW)), y1 = Math.min(Math.ceil((L.h * T) / LTW) - 1, Math.floor(view.y1 / LTW));
      for (let ry = y0; ry <= y1; ry++) {
        for (let rx = x0; rx <= x1; rx++) {
          const key = rx + ',' + ry;
          let c = this.lightTiles.get(key);
          if (!c) {
            c = this.bakeLightTile(game, rx, ry, bs);
            this.lightTiles.set(key, c);
          }
          if (c.empty) continue;
          g.drawImage(c, 0, 0, LTW * bs, LTW * bs, rx * LTW, ry * LTW, LTW, LTW);
        }
      }
    }
    bakeLightTile(game, rx, ry, bs) {
      const L = game.level, LTW = LT * T;
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(LTW * bs);
      const g = c.getContext('2d');
      g.setTransform(bs, 0, 0, bs, -rx * LTW * bs, -ry * LTW * bs);
      g.globalCompositeOperation = 'lighter';
      const X0 = rx * LTW, Y0 = ry * LTW;
      let n = 0;
      for (const li of game.staticLights) {
        if (li.off || li.flicker) continue;
        if (li.x + li.r < X0 || li.x - li.r > X0 + LTW || li.y + li.r < Y0 || li.y - li.r > Y0 + LTW) continue;
        paintLight(g, L, li, li.intensity);
        n++;
      }
      c.empty = n === 0;
      return c;
    }
    invalidateLight(li) {
      const LTW = LT * T;
      for (let ry = Math.floor((li.y - li.r) / LTW); ry <= Math.floor((li.y + li.r) / LTW); ry++) {
        for (let rx = Math.floor((li.x - li.r) / LTW); rx <= Math.floor((li.x + li.r) / LTW); rx++) this.lightTiles.delete(rx + ',' + ry);
      }
    }

    drawFocus(ctx, it, t) {
      const r = (it.r || 12) + 6 + Math.sin(t * 6) * 1.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(232,190,110,0.85)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 12;
      ctx.beginPath();
      ctx.arc(it.x, it.y, r, 0, U.TAU);
      ctx.stroke();
      ctx.restore();
    }

    drawScreenFX(ctx, game, cw, ch) {
      const P = game.player;
      if (!P) return;
      // damage / low health vignette
      const st = P.stats();
      const low = P.hp / st.maxHp < 0.3 ? 0.25 + 0.15 * Math.sin(this.time * 5) : 0;
      const a = Math.min(0.75, P.hurtFlash * 0.9 + low);
      if (a > 0.01) {
        const grd = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
        grd.addColorStop(0, 'rgba(120,0,0,0)');
        grd.addColorStop(1, 'rgba(150,10,10,' + a + ')');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, cw, ch);
      }
      // pit fall fade
      if (P.falling > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.85, P.falling * 1.6) + ')';
        ctx.fillRect(0, 0, cw, ch);
      }
      // crosshair
      const m = LM.input.mouse;
      if (m.inside && game.state === 'play') {
        const d = this.dpr, x = m.x * d, y = m.y * d;
        if (!P.isArmed(game)) {
          ctx.strokeStyle = 'rgba(255,240,215,0.75)';
          ctx.lineWidth = 1.2 * d;
          ctx.beginPath();
          ctx.arc(x, y, 6 * d, 0, U.TAU);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,240,215,0.9)';
          ctx.beginPath();
          ctx.arc(x, y, 1.4 * d, 0, U.TAU);
          ctx.fill();
          return;
        }
        const w = game.player.currentWeapon();
        const spread = (w ? w.spread || 0.02 : 0.02) * 120 + P.recoil * 18;
        const gap = (5 + spread) * d, len = 6 * d;
        ctx.strokeStyle = 'rgba(255,240,215,0.95)';
        ctx.lineWidth = 1.5 * d;
        ctx.beginPath();
        ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y);
        ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);
        ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap);
        ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);
        ctx.stroke();
        ctx.fillStyle = game.hitMarker > 0 ? 'rgba(255,90,70,1)' : 'rgba(255,240,215,0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 1.6 * d, 0, U.TAU);
        ctx.fill();
        if (game.hitMarker > 0) {
          const k = 4 * d + (1 - game.hitMarker / 0.15) * 4 * d;
          ctx.strokeStyle = 'rgba(255,110,90,' + game.hitMarker / 0.15 + ')';
          ctx.beginPath();
          ctx.moveTo(x - k, y - k); ctx.lineTo(x - k / 2, y - k / 2);
          ctx.moveTo(x + k, y - k); ctx.lineTo(x + k / 2, y - k / 2);
          ctx.moveTo(x - k, y + k); ctx.lineTo(x - k / 2, y + k / 2);
          ctx.moveTo(x + k, y + k); ctx.lineTo(x + k / 2, y + k / 2);
          ctx.stroke();
        }
        // reload/cooldown ring for slow weapons
        if (w && w.fireRate < 2 && P.fireCd > 0) {
          const f = P.fireCd / (1 / w.fireRate);
          ctx.strokeStyle = 'rgba(232,190,110,0.8)';
          ctx.lineWidth = 2 * d;
          ctx.beginPath();
          ctx.arc(x, y, 14 * d, -Math.PI / 2, -Math.PI / 2 + U.TAU * (1 - f));
          ctx.stroke();
        }
      }
    }
  }
  LM.Renderer = Renderer;
  LM.CHUNK = CH;
})();
