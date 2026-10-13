/* Linear Maze Editor — js/preview.js
 * Small live drawings of content, made with the game's own draw functions:
 * items, monsters, people, weapons, armor, and tiles baked by an environment's
 * painters. Animated previews share one requestAnimationFrame loop and stop by
 * themselves when their canvas leaves the page.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const P = (ED.preview = {});
  const live = new Set();
  let running = false;
  function tick(now) {
    const t = now / 1000;
    for (const p of live) {
      if (!p.canvas.isConnected) {
        live.delete(p);
        continue;
      }
      try {
        p.draw(t);
      } catch (e) {
        if (!p.failed) console.warn('preview failed', e);
        p.failed = true;
      }
    }
    if (live.size) requestAnimationFrame(tick);
    else running = false;
  }
  function animate(canvas, draw) {
    const p = { canvas, draw };
    live.add(p);
    draw(performance.now() / 1000);
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
    return p;
  }
  function sizeCanvas(canvas, w, hh) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = hh + 'px';
    return dpr;
  }

  // ------------------------------------------------------------ backdrop: a floor tile pattern from an environment
  const floorCache = new Map();
  P.floorPattern = function (envId) {
    const LM = ED.engine.LM;
    envId = envId && LM.find('environments', envId) ? envId : P.defaultEnv();
    const key = envId + ':' + (ED.model.status('environments', envId) ? ED.model.key().length : 0);
    if (floorCache.has(key)) return floorCache.get(key);
    const c = P.bakeTiles(envId, ['...', '...', '...'], {}, 2);
    floorCache.set(key, c);
    return c;
  };
  P.defaultEnv = () => {
    const LM = ED.engine.LM;
    const first = ED.model.levelOrder().map((id) => ED.model.raw('levels', id)).find((l) => l && l.attractPath) || ED.model.raw('levels', ED.model.levelOrder()[0]);
    return (first && first.environment) || Object.keys(LM.registry.environments)[0];
  };

  /** Bake a small map with an environment's painters. legend: { char: { terrain, variant } } */
  P.bakeTiles = function (envId, rows, legend, scale) {
    const LM = ED.engine.LM, T = LM.TILE;
    // the first row's first cell doubles as the (unused) start, so the engine doesn't warn
    const lg = Object.assign({ '.': { terrain: 'floor' } }, legend);
    const r0 = rows[0][0];
    const first = Object.assign({}, typeof lg[r0] === 'string' ? { terrain: lg[r0] } : lg[r0] || ED.engine.LM.registry.legend[r0] || { terrain: 'floor' }, { start: true });
    lg['\u00a7'] = first;
    const L = new LM.Level({ id: 'editor-swatch', environment: envId, map: ['\u00a7' + rows[0].slice(1)].concat(rows.slice(1)), legend: lg });
    const W = L.w * T, H = L.h * T;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * scale);
    c.height = Math.ceil(H * scale);
    const fake = { level: L, scale, decals: [], bakeAO: LM.Renderer.prototype.bakeAO, paintDecal: LM.Renderer.prototype.paintDecal };
    const chunks = [];
    const CH = LM.CHUNK, CHW = CH * T;
    for (let cy = 0; cy * CHW < H; cy++) for (let cx = 0; cx * CHW < W; cx++) chunks.push([cx, cy, LM.Renderer.prototype.bakeChunk.call(fake, cx, cy)]);
    const g = c.getContext('2d');
    for (const [cx, cy, ch] of chunks) g.drawImage(ch, cx * CHW * scale, cy * CHW * scale);
    return c;
  };

  /** One tile of a terrain type in an environment, shown in context (walls get their front faces). */
  const tileCache = new Map();
  P.tileSwatch = function (envId, terrainId, variant, size, stamp) {
    const key = [envId, terrainId, variant || 0, size, stamp || 0].join('|');
    if (tileCache.has(key)) return tileCache.get(key);
    const LM = ED.engine.LM, T = LM.TILE;
    const td = LM.find('terrain', terrainId);
    let out;
    try {
      const rows = ['.....', '..A..', '.....'];
      const legend = { A: { terrain: terrainId, variant: variant || 0 } };
      if (td && td.door) rows[1] = '.#A#.';
      if (td && td.door) rows[0] = '..#..';
      const scale = size / T;
      const big = P.bakeTiles(envId, rows, legend, scale);
      out = document.createElement('canvas');
      out.width = out.height = Math.ceil(size);
      out.getContext('2d').drawImage(big, -2 * T * scale, -1 * T * scale);
    } catch (e) {
      out = document.createElement('canvas');
      out.width = out.height = size;
      const g = out.getContext('2d');
      g.fillStyle = '#333';
      g.fillRect(0, 0, size, size);
    }
    tileCache.set(key, out);
    return out;
  };
  P.forgetTiles = () => {
    tileCache.clear();
    floorCache.clear();
  };
  ED.on('change', (ev) => {
    if (ev.all || (ev.touched || []).some(([k]) => k === 'environments' || k === 'terrain' || k === 'textures')) P.forgetTiles();
  });

  // ------------------------------------------------------------ things
  /** Settings a thing needs just to be drawn (a weapon rack needs a weapon). */
  P.defaultProps = function (def) {
    const out = {};
    const src = ['draw', 'drawGlow', 'init'].map((k) => (typeof def[k] === 'function' ? ED.fnSource(def[k]) : '')).join('\n');
    if (/props\.weapon\b/.test(src)) out.weapon = 'scattergun';
    if (/props\.armor\b/.test(src)) out.armor = ED.model.ids('armor')[0];
    if (/props\.color\b/.test(src) && /KEY_COLORS/.test(src)) out.color = 'red';
    return Object.assign(out, def.props || {});
  };
  function fakeGame() {
    const g = ED.engine.fakeGame(null);
    g.level = ED.engine.stubLevel(P.defaultEnv());
    return g;
  }
  /** An animated drawing of a thing. getDef() is read every frame so edits show at once.
   *  kind: 'items' | 'enemies' | 'npcs'. o: { size, zoom, props, env, still, facing } */
  P.thing = function (kind, getDef, o) {
    o = o || {};
    const size = o.size || 120;
    const canvas = h('canvas', { class: 'preview' + (o.cls ? ' ' + o.cls : '') });
    const dpr = sizeCanvas(canvas, size, size);
    const g = canvas.getContext('2d');
    const LM = ED.engine.LM;
    const game = fakeGame();
    let inst = null, instDef = null, instProps = null;
    const make = (def) => {
      const props = typeof o.props === 'function' ? o.props() : o.props || P.defaultProps(def);
      if (inst && def === instDef && props === instProps) return inst;
      instDef = def;
      instProps = props;
      if (kind === 'items') {
        inst = new LM.Item(game, def, 2, 2, props, null);
        if (def.wallMounted) inst.face = inst.face || { x: 0, y: 1 };
      } else if (kind === 'enemies') {
        inst = new LM.Enemy(game, def, 0, 0, props);
        inst.vis = 1;
        inst.visible = true;
        inst.spawning = 0;
      } else {
        inst = new LM.NPC(game, def, 0, 0, props, null);
        inst.vis = 1;
      }
      return inst;
    };
    const floor = o.env !== null ? P.floorPattern(o.env) : null;
    animate(canvas, (t) => {
      const def = getDef();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (floor) {
        g.globalAlpha = 0.55;
        const pat = g.createPattern(floor, 'repeat');
        g.fillStyle = pat;
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.globalAlpha = 1;
        const grd = g.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
        grd.addColorStop(0, 'rgba(10,12,16,0)');
        grd.addColorStop(1, 'rgba(10,12,16,0.85)');
        g.fillStyle = grd;
        g.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (!def) return;
      let it;
      try {
        it = make(def);
      } catch (e) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = '#e4574d';
        g.font = '11px "IBM Plex Mono", monospace';
        g.fillText('Can’t draw: ' + e.message.slice(0, 40), 6, size / 2);
        return;
      }
      const r = it.r || 10;
      const zoom = o.zoom || U2(size, r, kind);
      g.setTransform(dpr * zoom, 0, 0, dpr * zoom, canvas.width / 2, canvas.height / 2 + (kind === 'items' && def.wallMounted ? -10 * dpr * zoom : 0));
      it.x = 0;
      it.y = 0;
      it.t = t;
      if (kind === 'enemies') it.facing = o.facing != null ? o.facing : o.still ? 0 : Math.sin(t * 0.6) * 0.6;
      if (kind === 'npcs') it.facing = o.facing != null ? o.facing : Math.PI / 2;
      if (kind === 'items' && it.def.update && !o.still) {
        try {
          it.def.update(it, 0, game);
        } catch (e) {}
      }
      try {
        if (it.drawShadow && !(kind === 'items' && def.wallMounted)) it.drawShadow(g, game, t);
        it.draw(g, game, t);
        g.globalCompositeOperation = 'lighter';
        it.drawGlow(g, game, t);
      } finally {
        g.globalCompositeOperation = 'source-over';
      }
    });
    return canvas;
  };
  function U2(size, r, kind) {
    const fit = (size * 0.36) / Math.max(6, r + (kind === 'enemies' ? 4 : 2));
    return Math.max(1.2, Math.min(5, fit));
  }

  /** A still icon of a thing (for lists). */
  const iconCache = new Map();
  P.icon = function (kind, id, size) {
    size = size || 34;
    const def = ED.model.get(kind, id);
    const key = kind + ':' + id + ':' + size + ':' + (ED.model.status(kind, id) ? JSON.stringify(ED.model.edits().patch[kind] && ED.model.edits().patch[kind][id] || ED.model.edits().add[kind] && ED.model.edits().add[kind][id] || '').length + ':' + Object.keys(ED.model.sprites).length : '');
    if (iconCache.has(key)) return iconCache.get(key).cloneNode ? cloneCanvas(iconCache.get(key)) : iconCache.get(key);
    const c = h('canvas', { class: 'icon' });
    const dpr = sizeCanvas(c, size, size);
    const g = c.getContext('2d');
    const LM = ED.engine.LM;
    try {
      if (kind === 'weapons') return P.weaponIcon(def, size * 1.6, size);
      if (kind === 'armor') return P.armorIcon(def, size);
      const game = fakeGame();
      let it;
      if (kind === 'items') it = new LM.Item(game, def, 2, 2, P.defaultProps(def), null);
      else if (kind === 'enemies') {
        it = new LM.Enemy(game, def, 0, 0, {});
        it.vis = 1;
        it.spawning = 0;
        it.facing = -0.5;
      } else {
        it = new LM.NPC(game, def, 0, 0, {}, null);
        it.vis = 1;
        it.facing = Math.PI / 2;
      }
      if (def.wallMounted) it.face = { x: 0, y: 1 };
      it.x = 0;
      it.y = 0;
      it.t = 1;
      const zoom = Math.max(0.6, Math.min(3, (size * 0.42) / Math.max(5, (it.r || 9) + 2)));
      g.setTransform(dpr * zoom, 0, 0, dpr * zoom, c.width / 2, c.height / 2);
      it.draw(g, game, 1);
      g.globalCompositeOperation = 'lighter';
      it.drawGlow(g, game, 1);
      g.globalCompositeOperation = 'source-over';
    } catch (e) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#3a3f4a';
      g.fillRect(0, 0, c.width, c.height);
    }
    iconCache.set(key, c);
    return cloneCanvas(c);
  };
  function cloneCanvas(c) {
    const n = document.createElement('canvas');
    n.width = c.width;
    n.height = c.height;
    n.style.width = c.style.width;
    n.style.height = c.style.height;
    n.className = c.className;
    n.getContext('2d').drawImage(c, 0, 0);
    return n;
  }
  P.weaponIcon = function (def, w, hh) {
    return ED.engine.LM.ui.icons.weapon(def, w || 64, hh || 32);
  };
  P.armorIcon = function (def, size) {
    return ED.engine.LM.ui.icons.armor(def, size || 40);
  };
  P.portrait = function (look, mood, size) {
    try {
      return ED.engine.LM.ui.portrait(look || {}, mood || 'neutral', size || 64);
    } catch (e) {
      return h('canvas', { class: 'icon', width: size, height: size });
    }
  };
  /** A picture from sprites.js as an <img>. */
  P.spriteImg = function (id, size) {
    const src = ED.model.sprites[id];
    return src ? h('img', { src, class: 'sprite-thumb', width: size || 48, height: size || 48, alt: id }) : h('span', { class: 'muted' }, 'missing picture ' + id);
  };
})();
