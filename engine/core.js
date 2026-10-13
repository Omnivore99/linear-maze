/* The Linear Maze — engine/core.js
 * Global namespace, the content registry, and shared math/colour helpers.
 * Every content file (packs/, levels/) calls LM.definePack(...) to register
 * definitions. The engine never hard-codes content; it looks things up here.
 */
'use strict';
(function () {
  const LM = (window.LM = window.LM || {});
  LM.VERSION = '0.1.0';
  LM.TILE = 32; // world units per tile

  // Every kind of content the engine knows how to use. A pack may supply any subset.
  const KINDS = [
    'legend',       // map character -> { terrain, item, enemy, tag, props }
    'terrain',      // tile types: walls, floors, doors, hazards, water...
    'textures',     // painter functions used by environments to bake tiles
    'environments', // palettes, ambient light, texture choices, ambient particles
    'projectiles',  // how a shot looks and behaves in flight
    'weapons',      // player weapons
    'attacks',      // enemy attack types (melee, ranged, lob, nova, charge...)
    'behaviors',    // enemy movement AI
    'enemies',      // enemy definitions (stats + ai + attacks + draw)
    'npcs',         // non-hostile characters with dialog
    'gadgets',      // always-carried tools (the phone): key binding, HUD chip, held in hand when unarmed
    'items',        // world objects: pickups, chests, furniture, stations, lights
    'armor',        // wearable equipment with stat modifiers
    'blessings',    // altar boons (stat modifiers)
    'effects',      // trap effects (darts, spawn, lockdown, alarm...)
    'lootTables',   // weighted loot lists for chests and crates
    'levels',       // level maps and their traps/rooms
  ];
  LM.KINDS = KINDS;
  LM.registry = {};
  for (const k of KINDS) LM.registry[k] = {};
  LM.packs = [];

  /** Register a content pack. Later packs override earlier ids of the same kind. */
  LM.definePack = function (pack) {
    if (!pack || !pack.id) throw new Error('LM.definePack: a pack needs an id');
    for (const kind of Object.keys(pack)) {
      if (!LM.registry[kind]) continue;
      for (const [id, def] of Object.entries(pack[kind])) {
        if (def && typeof def === 'object' && kind !== 'legend') {
          def.id = id;
          def.pack = pack.id;
        }
        LM.registry[kind][id] = def;
      }
    }
    if (!LM.packs.find((p) => p.id === pack.id)) {
      LM.packs.push({ id: pack.id, name: pack.name || pack.id, version: pack.version || '0.0.0' });
    }
  };

  LM.get = function (kind, id) {
    const d = LM.registry[kind] && LM.registry[kind][id];
    if (!d) throw new Error('Unknown ' + kind + ': ' + id);
    return d;
  };
  LM.find = (kind, id) => (LM.registry[kind] ? LM.registry[kind][id] : undefined);

  // ---------------------------------------------------------------- math
  const U = (LM.util = {});
  const TAU = (U.TAU = Math.PI * 2);
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  U.angDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  U.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  U.damp = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt); // framerate-independent smoothing
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash2 = function (x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  U.strHash = function (str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  /** entries: [{ w: weight, ...anything }] */
  U.weighted = function (entries, rnd) {
    const r = rnd || Math.random;
    let total = 0;
    for (const e of entries) total += e.w == null ? 1 : e.w;
    let x = r() * total;
    for (const e of entries) {
      x -= e.w == null ? 1 : e.w;
      if (x <= 0) return e;
    }
    return entries[entries.length - 1];
  };
  U.ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  U.fmtTime = (s) => {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  // ---------------------------------------------------------------- colour
  const rgbCache = new Map();
  U.hexToRgb = function (hex) {
    let c = rgbCache.get(hex);
    if (c) return c;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
    return c;
  };
  U.rgba = (hex, a) => {
    const [r, g, b] = U.hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  };
  /** amt in [-1, 1]: negative darkens toward black, positive lightens toward white */
  U.shade = function (hex, amt) {
    const [r, g, b] = U.hexToRgb(hex);
    const f = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  };
  U.mix = function (h1, h2, t) {
    const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  };

  // ---------------------------------------------------------------- tiny event bus
  const listeners = {};
  LM.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  LM.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => fn(data));
})();
