/* Linear Maze Editor — js/engine.js
 * Loads the game itself into a hidden frame, exactly as index.html loads it (minus
 * the start-up script and the editor's own saved changes), so the editor reads the
 * real content registry and draws with the real engine.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const E = (ED.engine = {});
  E.EDITOR_SCRIPTS = ['packs/editor/runtime.js', 'packs/editor/sprites.js', 'packs/editor/edits.js'];
  E.KINDS_SHOWN = ['levels', 'items', 'enemies', 'npcs', 'weapons', 'armor', 'blessings', 'lootTables', 'environments', 'terrain', 'textures', 'projectiles', 'behaviors', 'attacks', 'effects', 'gadgets', 'legend'];

  const SCRIPT_RE = /<script src="([^"]+)"><\/script>/g;
  E.scriptList = (html) => [...html.matchAll(SCRIPT_RE)].map((m) => m[1]);

  /** Read the folder, build the frame, and capture the saved edits. */
  E.load = async function (status) {
    const fs = ED.fs;
    status('Reading index.html');
    const html = await fs.read('index.html').catch(() => {
      throw new Error('There is no index.html in “' + fs.name + '”. Pick the game folder itself (the one with index.html, engine and packs).');
    });
    const srcs = E.scriptList(html);
    if (!srcs.includes('engine/core.js')) throw new Error('index.html in “' + fs.name + '” doesn’t load engine/core.js, so this doesn’t look like The Linear Maze.');
    const gameSrcs = srcs.filter((s) => !E.EDITOR_SCRIPTS.includes(s));
    status('Reading ' + gameSrcs.length + ' game files');
    const texts = {};
    await Promise.all(gameSrcs.map(async (s) => {
      texts[s] = await fs.read(s).catch(() => {
        throw new Error('index.html loads ' + s + ', but that file is missing.');
      });
    }));
    const runtime = await fs.readMaybe('packs/editor/runtime.js');
    if (!runtime) throw new Error('packs/editor/runtime.js is missing from the game folder. It comes with the editor: copy the packs/editor folder next to the other packs.');
    const sprites = await fs.readMaybe('packs/editor/sprites.js');
    const edits = await fs.readMaybe('packs/editor/edits.js');
    const spec = await fs.readMaybe('SPEC.md');
    E.indexHtml = html;
    E.allScripts = srcs;
    E.gameScripts = gameSrcs;
    E.texts = texts;
    E.runtimeText = runtime;
    E.spec = spec || '';
    E.editorTagsPresent = E.EDITOR_SCRIPTS.every((s) => srcs.includes(s));
    E.editsMtime = await fs.modified('packs/editor/edits.js');

    status('Starting the engine');
    const win = await E.makeFrame(E.frameDoc({ runtime: true }), 'engine-frame');
    E.win = win;
    E.LM = win.LM;
    E.X = win.LM.editor;
    if (!E.LM || !E.X) throw new Error('The game’s scripts didn’t start. ' + (E.loadErrors[0] || ''));

    // pictures and saved edits are read without applying them: the editor keeps the originals
    // as its baseline and applies edits itself
    status('Reading saved changes');
    if (sprites) {
      try {
        new win.Function(sprites)();
      } catch (e) {
        E.loadErrors.push('packs/editor/sprites.js: ' + e.message);
      }
    }
    let captured = null;
    if (edits) {
      const real = E.X.apply;
      E.X.apply = (d) => (captured = d);
      try {
        new win.Function(edits + '\n//# sourceURL=packs/editor/edits.js')();
      } catch (e) {
        E.editsError = e.message;
      }
      E.X.apply = real;
    }
    E.savedEdits = captured;
    E.snapshotBase();
    return { edits: captured, sprites: Object.assign({}, E.X.sprites) };
  };

  /** The game's page with every script inlined. opts: { runtime, edits (text), sprites (text), boot } */
  E.frameDoc = function (opts) {
    opts = opts || {};
    const inline = (name, code) => '<script>' + String(code).replace(/<\/script/gi, '<\\/script') + '\n//# sourceURL=' + name + '\n</script>';
    let doc = E.indexHtml;
    if (!opts.boot) doc = doc.replace(/<link[^>]*fonts\.g[^>]*>/g, ''); // a pending font stylesheet would hold up the scripts
    doc = doc.replace(SCRIPT_RE, (m, f) => (E.EDITOR_SCRIPTS.includes(f) ? '' : E.texts[f] != null ? inline(f, E.texts[f]) : m));
    let tail = '';
    if (opts.runtime) tail += inline('packs/editor/runtime.js', E.runtimeText);
    if (opts.sprites) tail += inline('packs/editor/sprites.js', opts.sprites);
    if (opts.edits) tail += inline('packs/editor/edits.js', opts.edits);
    if (opts.extra) tail += '<script>' + opts.extra + '</script>';
    const i = doc.lastIndexOf('LM.boot()');
    if (i >= 0) {
      const s0 = doc.lastIndexOf('<script>', i), s1 = doc.indexOf('</script>', i) + 9;
      const start = doc.slice(s0, s1);
      doc = doc.slice(0, s0) + tail + (opts.boot ? start : '') + doc.slice(s1);
    } else doc = doc.replace('</body>', tail + '</body>');
    return doc;
  };

  /** Write a document into a fresh same-origin frame and return its window. */
  E.makeFrame = function (doc, id, visible) {
    const old = document.getElementById(id);
    if (old) old.remove();
    const f = h('iframe', { id, class: visible ? 'frame-visible' : 'frame-hidden', title: id });
    (visible || ED.$('#frames')).appendChild(f);
    const win = f.contentWindow;
    E.loadErrors = [];
    const d = f.contentDocument;
    d.open();
    win.addEventListener('error', (ev) => {
      E.loadErrors.push((ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno + ' ' : '') + ev.message);
    });
    d.write(doc);
    d.close();
    return Promise.resolve(win);
  };

  /** Remember the original definitions (the baseline every edit is measured against). */
  E.snapshotBase = function () {
    const LM = E.LM;
    E.base = {};
    for (const k of LM.KINDS) E.base[k] = Object.assign({}, LM.registry[k]);
    E.baseLevelOrder = Object.values(LM.registry.levels).sort((a, b) => (a.order || 0) - (b.order || 0)).map((l) => l.id);
    E.basePlayer = E.X.clone(LM.PLAYER_BASE);
    E.baseAmmoMax = E.X.clone(LM.AMMO_MAX);
    E.knobs = E.discoverKnobs();
  };

  /** Pack settings: plain data objects and arrays hanging off LM in UPPER_CASE (CHESSBOARD.CONFIG...). */
  E.discoverKnobs = function () {
    const LM = E.LM, X = E.X, out = {};
    const plainData = (v, depth) => {
      if (typeof v === 'function') return false;
      if (Array.isArray(v)) return v.every((x) => plainData(x, depth + 1));
      if (X.isPlain(v)) return depth < 6 && Object.values(v).every((x) => plainData(x, depth + 1));
      return v == null || ['string', 'number', 'boolean'].includes(typeof v);
    };
    const SKIP = new Set(['KINDS', 'TILE', 'VERSION', 'PLAYER_BASE', 'AMMO_MAX', 'CHUNK', 'DIR', 'CHESSBOARD_LAYOUT']);
    const visit = (obj, path, depth) => {
      for (const [k, v] of Object.entries(obj)) {
        if (depth === 0 && (!/^[A-Z][A-Z0-9_]+$/.test(k) || SKIP.has(k))) continue;
        if (depth > 0 && !/^[A-Z][A-Z0-9_]+$/.test(k)) continue;
        const p = path ? path + '.' + k : k;
        if ((X.isPlain(v) || Array.isArray(v)) && plainData(v, 0) && (Array.isArray(v) ? v.length : Object.keys(v).length)) out[p] = X.clone(v);
        else if (X.isPlain(v) && depth < 2) visit(v, p, depth + 1);
      }
    };
    visit(LM, '', 0);
    return out;
  };

  E.compile = (src, name) => E.X.compile(src, name);

  // ------------------------------------------------------------ fake game + renderer for drawing
  /** A Renderer drawing into an editor canvas at a chosen zoom, keeping every baked chunk. */
  E.makeRenderer = function (canvas) {
    const LM = E.LM;
    class EditorRenderer extends LM.Renderer {
      resize() {
        const c = this.canvas;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.cssW = Math.max(16, c.clientWidth || c.width);
        this.cssH = Math.max(16, c.clientHeight || c.height);
        this.dpr = dpr;
        c.width = Math.round(this.cssW * dpr);
        c.height = Math.round(this.cssH * dpr);
        this.zoom = this.edZoom || 1;
        this.scale = this.zoom * dpr;
        this.lc.width = Math.ceil(c.width / 2);
        this.lc.height = Math.ceil(c.height / 2);
        this.chunks.clear();
        this.chunkOrder.length = 0;
      }
      getChunk(cx, cy) {
        const key = cx + ',' + cy;
        let c = this.chunks.get(key);
        if (!c) {
          c = this.bakeChunk(cx, cy);
          this.chunks.set(key, c);
        }
        return c;
      }
      renderLight(game, view, ox, oy) {
        if (this.flat) {
          const g = this.lctx;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, this.lc.width, this.lc.height);
          return;
        }
        super.renderLight(game, view, ox, oy);
      }
    }
    // the base constructor listens for window resizes; the editor sizes canvases itself
    const r = new EditorRenderer(canvas);
    return r;
  };
  E.fakeGame = function (renderer) {
    const LM = E.LM;
    const g = Object.create(LM.Game.prototype);
    Object.assign(g, {
      canvas: renderer ? renderer.canvas : null, renderer, particles: new LM.Particles(400),
      cam: { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0, kickX: 0, kickY: 0 },
      items: [], enemies: [], npcs: [], projectiles: [], doors: [], traps: [], fx: [], lights: [], staticLights: [], timers: [],
      plates: new Map(), time: 0, difficulty: 1, stats: { kills: 0, enemies: 0, gold: 0, time: 0 }, attract: true, state: 'title', frame: 0,
      editor: true,
    });
    return g;
  };
  /** A tiny level for drawing previews (items that look at their surroundings need one). */
  E.stubLevel = function (envId) {
    const LM = E.LM;
    if (!E._stub || E._stub.envId !== envId) {
      const env = envId && LM.find('environments', envId) ? envId : Object.keys(LM.registry.environments)[0];
      E._stub = new LM.Level({ id: 'editor-stub', environment: env, map: ['#####', '#...#', '#...#', '#...#', '#####'], legend: { '.': { terrain: 'floor', start: true } } });
      E._stub.envId = envId;
    }
    return E._stub;
  };
})();
