/* The Linear Maze — packs/editor/runtime.js
 * The editor pack. Everything changed in the Linear Maze Editor (editor/index.html)
 * is saved as data in packs/editor/edits.js, plus imported pictures in
 * packs/editor/sprites.js. This file applies those changes on top of every other
 * pack, without touching their files:
 *
 *   add      new content, or copies of existing content ($extends: 'husk')
 *   patch    changed fields of existing content, merged into the registered definition
 *   remove   ids taken out of the registry (levels, items, enemies...)
 *   levelOrder   the floor sequence (sets each level's order and next)
 *   player   base stats (LM.PLAYER_BASE) and the starting kit of a new run
 *   knobs    pack settings such as CHESSBOARD.CONFIG, merged by path under LM
 *
 * It also gives content a few data-driven building blocks, so new things can be
 * made without code:
 *   effects      heal, gold, buff, blessing, spawn, explode, message... (ED.runEffects)
 *   abilities    an item pop-up of choices, each with a cost, uses and weighted outcomes
 *   touch        pickup effects, destructible effects
 *   loot data    loot tables as weighted lists instead of roll() code
 *   slots        a slot machine with an editable paytable
 *   look         drawings from parameters (creature / object), imported pictures, or animated sprite sheets
 *   image tiles  floor and wall painters that use imported pictures
 *
 * Load order: after every other pack and level, before LM.boot():
 *   packs/editor/runtime.js, packs/editor/sprites.js, packs/editor/edits.js
 * Remove those three <script> lines from index.html to undo every editor change.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const ED = (LM.editor = LM.editor || {});
  ED.VERSION = 1;
  ED.sprites = ED.sprites || {};
  const warn = (...a) => console.warn('[LM editor]', ...a);

  // ================================================================ data helpers
  // (realm-independent: the editor builds objects in its own window and hands them to this one)
  const isPlain = (ED.isPlain = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const p = Object.getPrototypeOf(v);
    return p === null || Object.getPrototypeOf(p) === null;
  });
  /** Deep copy of plain objects and arrays. Functions and other objects are shared. */
  const clone = (ED.clone = function (v) {
    if (Array.isArray(v)) return v.map(clone);
    if (isPlain(v)) {
      const o = {};
      for (const k of Object.keys(v)) o[k] = clone(v[k]);
      return o;
    }
    return v;
  });
  /** Merge a patch into target in place. Plain objects merge key by key; arrays, functions and
   *  values replace; '$unset' deletes a key; an object with $replace: true replaces wholesale. */
  const merge = (ED.merge = function (target, patch) {
    for (const k of Object.keys(patch)) {
      if (k === '$extends' || k === '$replace') continue;
      const v = patch[k];
      if (v === '$unset') {
        delete target[k];
        continue;
      }
      if (isPlain(v) && v.$replace) {
        const c = clone(v);
        delete c.$replace;
        target[k] = c;
      } else if (isPlain(v) && isPlain(target[k])) merge(target[k], v);
      else target[k] = clone(v);
    }
    return target;
  });
  /** The definition an add entry describes: a copy of its $extends source (if any) with the entry merged in. */
  ED.resolveAdd = function (kind, entry, lookup) {
    const src = entry.$extends ? (lookup || LM.find)(kind, entry.$extends) : null;
    if (entry.$extends && !src) warn('cannot copy missing ' + kind + ' ' + entry.$extends);
    return merge(clone(src || {}), entry);
  };

  // ================================================================ applying edits
  /** Code from the editor runs guarded: an error is logged once instead of stopping the frame. */
  function guard(fn, where) {
    const g = function (...a) {
      try {
        return fn.apply(this, a);
      } catch (e) {
        if (!g.warned) {
          g.warned = true;
          warn(where + ' failed (it keeps running, without that part): ' + e.message, e);
        }
        return undefined;
      }
    };
    g.original = fn;
    return g;
  }
  function guardAll(v, where) {
    if (typeof v === 'function') return v.original ? v : guard(v, where);
    if (Array.isArray(v)) return v.map((x, i) => guardAll(x, where + '[' + i + ']'));
    if (isPlain(v)) {
      const o = {};
      for (const k of Object.keys(v)) o[k] = guardAll(v[k], where + '.' + k);
      return o;
    }
    return v;
  }
  ED.guardAll = guardAll;

  ED.apply = function (edits) {
    if (!edits) return;
    ED.edits = edits;
    const reg = LM.registry;
    const tryDo = (what, fn) => {
      try {
        fn();
      } catch (e) {
        warn('could not apply ' + what + ':', e);
      }
    };
    // 1. new content (copies resolve against the original definitions, before patches)
    for (const [kind, map] of Object.entries(edits.add || {})) {
      if (!reg[kind]) continue;
      for (const [id, entry] of Object.entries(map)) {
        tryDo(kind + ' ' + id, () => {
          const def = ED.resolveAdd(kind, guardAll(entry, kind + ' ' + id));
          if (kind !== 'legend') {
            def.id = id;
            def.pack = 'editor';
          }
          reg[kind][id] = def;
        });
      }
    }
    // 2. changed fields of existing content, merged in place (other code may hold references)
    for (const [kind, map] of Object.entries(edits.patch || {})) {
      if (!reg[kind]) continue;
      for (const [id, patch] of Object.entries(map)) {
        tryDo(kind + ' ' + id, () => {
          const def = reg[kind][id];
          if (!def) return warn('patch for missing ' + kind + ' ' + id);
          merge(def, guardAll(patch, kind + ' ' + id));
        });
      }
    }
    // 3. data-driven behaviour for everything that asks for it
    for (const kind of ['items', 'enemies', 'lootTables', 'npcs']) {
      for (const def of Object.values(reg[kind])) if (def && def.pack === 'editor' || touched(edits, kind, def)) tryDo(kind + ' ' + (def && def.id), () => ED.build(kind, def));
    }
    // 4. removals
    for (const [kind, ids] of Object.entries(edits.remove || {})) {
      if (!reg[kind]) continue;
      for (const id of ids) delete reg[kind][id];
    }
    // blessings marked hidden stay usable by id but are left out of random draws (altars list the registry)
    for (const [id, b] of Object.entries(reg.blessings)) {
      if (b && b.hidden) Object.defineProperty(reg.blessings, id, { value: b, enumerable: false, configurable: true, writable: true });
    }
    // 5. floor order
    if (edits.levelOrder) tryDo('level order', () => ED.applyOrder(edits.levelOrder));
    // 6. the player
    if (edits.player) tryDo('player', () => ED.applyPlayer(edits.player));
    // 7. pack settings
    if (edits.knobs) tryDo('settings', () => ED.applyKnobs(edits.knobs));
    LM.packs.push({ id: 'editor', name: 'Editor changes', version: String(edits.savedAt || ED.VERSION) });
  };
  function touched(edits, kind, def) {
    return !!(def && def.id && ((edits.patch && edits.patch[kind] && edits.patch[kind][def.id]) || (edits.add && edits.add[kind] && edits.add[kind][def.id])));
  }

  /** Turn data fields (look, abilities, touch, slots, loot data...) into the functions the engine calls. */
  ED.build = function (kind, def) {
    if (!def || typeof def !== 'object') return def;
    if (kind === 'items') buildItem(def);
    else if (kind === 'enemies') buildEnemy(def);
    else if (kind === 'lootTables') buildLoot(def);
    else if (kind === 'npcs') {
      if (def.look && (def.look.type === 'sprite' || def.look.type === 'sheet')) Object.assign(def, ED.looks[def.look.type](def.look, 'npc'));
    }
    return def;
  };

  ED.applyOrder = function (ids) {
    const levels = LM.registry.levels;
    const list = ids.filter((id) => levels[id]);
    // levels missing from the list keep their place after it
    const rest = Object.values(levels).filter((l) => !list.includes(l.id)).sort((a, b) => (a.order || 0) - (b.order || 0)).map((l) => l.id);
    const all = list.concat(rest);
    all.forEach((id, i) => {
      const def = levels[id];
      def.order = i;
      const nx = all[i + 1];
      if (nx) def.next = nx;
      else delete def.next;
    });
  };

  ED.applyPlayer = function (p) {
    if (p.base) Object.assign(LM.PLAYER_BASE, p.base);
    if (p.ammoMax) Object.assign(LM.AMMO_MAX, p.ammoMax);
    const start = p.start;
    if (!start || ED._playerWrapped) return;
    ED._playerWrapped = true;
    const Base = LM.Player;
    // A new run's player gets the starting kit. (A first floor's own loadout still replaces
    // weapons, gadgets and gold afterwards; see Game.loadLevel.)
    LM.Player = class extends Base {
      constructor(save) {
        super(save);
        if (save) return;
        const s = ED.edits && ED.edits.player && ED.edits.player.start;
        if (!s) return;
        const known = (kind) => (id) => !!LM.find(kind, id);
        if (s.weapons) this.weapons = s.weapons.filter(known('weapons'));
        if (s.ammo) Object.assign(this.ammo, s.ammo);
        if (s.gold != null) this.gold = s.gold;
        if (s.equip) for (const k of Object.keys(this.equip)) this.equip[k] = s.equip[k] && LM.find('armor', s.equip[k]) ? s.equip[k] : null;
        if (s.bag) this.bag = s.bag.filter(known('armor'));
        if (s.blessings) this.blessings = s.blessings.filter(known('blessings'));
        if (s.gadgets) this.gadgets = s.gadgets.filter(known('gadgets'));
        if (s.flags) for (const f of s.flags) this.flags.add(f);
        if (s.radius) this.r = s.radius;
        this.weaponIdx = 0;
        this.statsDirty = true;
        this.hp = this.stats().maxHp;
      }
    };
  };

  /** knobs: { 'CHESSBOARD.CONFIG': { minutesPerSecond: 1 }, 'CHESSBOARD.HINTS': [...] } */
  ED.applyKnobs = function (knobs) {
    for (const [path, value] of Object.entries(knobs)) {
      const parts = path.split('.');
      let o = LM;
      for (let i = 0; i < parts.length - 1 && o; i++) o = o[parts[i]];
      const k = parts[parts.length - 1];
      if (!o) {
        warn('setting ' + path + ' has no home (is its pack loaded?)');
        continue;
      }
      if (isPlain(value) && isPlain(o[k])) merge(o[k], value);
      else if (Array.isArray(value) && Array.isArray(o[k])) {
        o[k].length = 0;
        o[k].push(...clone(value));
      } else o[k] = clone(value);
    }
  };

  // ================================================================ helpers shared with edited code
  // Functions written in the editor (or by Claude) run with these names in scope, the same
  // short names the original packs use for their private helpers.
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  ED.helpers = {
    eyes(g, e, color, spread, fwd, size) {
      const a = e.facing;
      for (const s of [-1, 1]) {
        const x = e.x + Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * spread * s;
        const y = e.y + Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * spread * s;
        G.glow(g, x, y, size * 3, color, 0.7);
        G.circle(g, x, y, size * 0.6, '#ffffff');
      }
    },
    lunge: (e) => (e.atk && e.atk.lunge ? e.atk.lunge * 4 : 0),
    flame(g, x, y, s, t, seed, col) {
      const f = 0.8 + 0.2 * Math.sin(t * 17 + seed) * Math.sin(t * 7 + seed * 2);
      G.glow(g, x, y, 14 * s * f, col || '#ff9a4a', 0.75);
      G.glow(g, x, y - 1.5 * s, 6 * s * f, '#ffe2a0', 0.9);
    },
    has: (game, f) => !!(game && game.hasFlag && game.hasFlag(f)),
    flag: (game, f) => !!(game && game.hasFlag && game.hasFlag(f)),
    wallRot: (it) => (it.face ? Math.atan2(it.face.y, it.face.x) : 0),
    rot: (it) => ROT[(it.props && it.props.dir) || 's'] || 0,
    ROT,
  };
  ED.PRELUDE_NAMES = ['LM', 'U', 'T', 'G', 'AI', 'h', 'eyes', 'lunge', 'flame', 'has', 'flag', 'wallRot', 'rot', 'ROT'];
  /** Compile a function written as source text, with the same names in scope as edits.js. */
  ED.compile = function (src, name) {
    const H = ED.helpers;
    const body = '"use strict";\nreturn (' + src + '\n);' + (name ? '\n//# sourceURL=editor/' + String(name).replace(/[^\w./-]/g, '_') : '');
    const make = new Function(...ED.PRELUDE_NAMES, body);
    return make(LM, U, T, G, LM.ai, h, H.eyes, H.lunge, H.flame, H.has, H.flag, H.wallRot, H.rot, H.ROT);
  };

  // ================================================================ effects
  // An effect is { type, ...settings }. Items, abilities and pickups run lists of them.
  // ctx: { item, x, y, results } — results collects words for {placeholders} in texts.
  const AMMO_STEP = { shells: 8, rounds: 40, cells: 18, rockets: 3 };
  const blessingPool = (P, ef) => {
    const all = ef.pool && ef.pool.length ? ef.pool.map((id) => LM.find('blessings', id)).filter(Boolean) : Object.values(LM.registry.blessings).filter((b) => !b.hidden);
    return all.filter((b) => (b.stack || 1) > P.blessings.filter((x) => x === b.id).length);
  };
  const near = (ctx, game) => ({ x: ctx.x != null ? ctx.x : game.player.x, y: ctx.y != null ? ctx.y : game.player.y });
  const num = (v, fb) => (Array.isArray(v) ? U.randInt(v[0], v[1]) : v == null ? fb : +v);
  ED.effects = {
    heal: {
      label: 'Heal', params: { amount: 25 },
      run(game, ef, ctx) {
        const got = LM.combat.heal(game, game.player, num(ef.amount, 25));
        LM.audio.play('heal');
        ctx.results.healed = Math.round(got);
      },
    },
    hurt: {
      label: 'Hurt the player', params: { amount: 10 },
      run(game, ef) {
        LM.combat.hurt(game, game.player, num(ef.amount, 10), { source: 'hazard', type: 'hazard' });
      },
    },
    shield: {
      label: 'Restore shield', params: { amount: 25 },
      can: (game) => (game.player.stats().maxShield > 0 ? true : 'You have no shield to charge.'),
      run(game, ef, ctx) {
        const P = game.player, st = P.stats(), before = P.shield;
        P.shield = Math.min(st.maxShield, P.shield + num(ef.amount, 25));
        P.shieldFlash = 0.4;
        LM.audio.play('recharge');
        ctx.results.shield = Math.round(P.shield - before);
      },
    },
    gold: {
      label: 'Give or take gold', params: { amount: 10 },
      run(game, ef, ctx) {
        const n = num(ef.amount, 10);
        const P = game.player;
        if (n >= 0) game.grant({ type: 'gold', amount: n });
        else P.gold = Math.max(0, P.gold + n);
        ctx.results.gold = n;
      },
    },
    ammo: {
      label: 'Ammunition', params: { ammo: 'current', amount: 10 },
      can(game, ef) {
        const P = game.player;
        const type = ef.ammo === 'current' || !ef.ammo ? (P.currentWeapon() || {}).ammo : ef.ammo;
        if (!type) return 'Your weapon takes no ammunition.';
        if ((P.ammo[type] || 0) >= P.ammoMax(type)) return 'You are full.';
        return true;
      },
      run(game, ef, ctx) {
        const P = game.player, w = P.currentWeapon();
        const type = ef.ammo === 'current' || !ef.ammo ? w && w.ammo : ef.ammo;
        if (!type) return;
        let n = num(ef.amount, AMMO_STEP[type] || 10);
        if (ef.fraction) n = Math.max(w && w.pickupAmmo ? w.pickupAmmo : 10, Math.round(P.ammoMax(type) * ef.fraction));
        const got = P.addAmmo(type, n);
        LM.audio.play('pickup');
        ctx.results.ammo = got + ' ' + (LM.AMMO_NAMES[type] || type).toLowerCase();
      },
    },
    weapon: {
      label: 'Give a weapon', params: { id: 'scattergun' },
      run(game, ef, ctx) {
        ctx.results.weapon = game.grant({ type: 'weapon', id: ef.id });
      },
    },
    armor: {
      label: 'Give armor', params: { id: 'iron-sallet' },
      run(game, ef, ctx) {
        ctx.results.armor = game.grant({ type: 'armor', id: ef.id });
      },
    },
    key: {
      label: 'Give a key', params: { color: 'red' },
      run(game, ef, ctx) {
        ctx.results.key = game.grant({ type: 'key', color: ef.color || 'red' });
      },
    },
    item: {
      label: 'Drop an item', params: { id: 'health-vial', count: 1 },
      run(game, ef, ctx) {
        const p = near(ctx, game);
        for (let i = 0; i < (ef.count || 1); i++) game.spawnItemAt(ef.id, p.x, p.y + 14, ef.props);
        const d = LM.find('items', ef.id);
        ctx.results.item = d ? d.name : ef.id;
      },
    },
    loot: {
      label: 'Drop loot', params: { table: 'chest-common' },
      run(game, ef, ctx) {
        const p = near(ctx, game);
        game.dropLoot(p.x, p.y + 14, ef.entries || ef.table || 'crate');
      },
    },
    blessing: {
      label: 'Grant a blessing', params: { id: 'random' },
      can(game, ef) {
        const P = game.player;
        if (!ef.id || ef.id === 'random') return blessingPool(P, ef).length ? true : 'You hold every blessing it can give.';
        const b = LM.find('blessings', ef.id);
        if (!b) return 'Unknown blessing.';
        return (b.stack || 1) > P.blessings.filter((x) => x === b.id).length ? true : 'You already have as much of that as you can hold.';
      },
      run(game, ef, ctx) {
        const P = game.player;
        const b = !ef.id || ef.id === 'random' ? U.pick(blessingPool(P, ef)) : LM.find('blessings', ef.id);
        if (!b) return;
        P.blessings.push(b.id);
        P.statsDirty = true;
        if (b.onGrant) b.onGrant(game, P);
        LM.audio.play('altar');
        game.particles.burst(P.x, P.y, 24, { type: 'ember', color: '#f2c96b', speed: 80, life: 1.1, size: 1.2, drag: 1 });
        ctx.results.blessing = b.name;
        ctx.results.blessingDesc = b.desc || '';
      },
    },
    buff: {
      label: 'Timed boost', params: { name: 'Boost', mods: { speed: 30 }, seconds: 30 },
      run(game, ef, ctx) {
        game.player.addBuff(ef.id || 'ed-' + (ef.name || 'buff'), ef.name || 'Boost', ef.mods || {}, ef.seconds || 30);
        ctx.results.buff = ef.name || 'Boost';
      },
    },
    spawn: {
      label: 'Summon enemies', params: { enemy: 'skitter', count: 3, radius: 30 },
      run(game, ef, ctx) {
        const p = ef.at === 'player' ? { x: game.player.x, y: game.player.y } : near(ctx, game);
        const n = ef.count || 1, R = ef.radius || 30;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * U.TAU;
          game.spawnEnemy(ef.enemy || 'skitter', p.x + Math.cos(a) * R, p.y + R * 0.6 + Math.sin(a) * R * 0.3, { summoned: true, aggro: ef.aggro !== false });
        }
        LM.audio.play('alarm');
      },
    },
    explode: {
      label: 'Explosion', params: { radius: 70, damage: 40 },
      run(game, ef, ctx) {
        const p = ef.at === 'player' ? { x: game.player.x, y: game.player.y } : near(ctx, game);
        LM.combat.explode(game, p.x, p.y, { radius: ef.radius || 70, damage: ef.damage == null ? 40 : ef.damage, owner: ef.owner || 'barrel', color: ef.color || '#ff8a3a' });
      },
    },
    message: {
      label: 'Toast message', params: { text: 'Something happens.', kind: 'good' },
      run(game, ef, ctx) {
        game.toast(fill(ef.text || '', ctx.results), ef.kind);
      },
    },
    text: {
      label: 'Show a page of text', params: { title: 'A note', text: 'Words.' },
      run(game, ef, ctx) {
        setTimeout(() => LM.ui.showText(ef.title || 'A note', fill(ef.text || '', ctx.results), ef.kicker), 0);
        ctx.closes = true;
      },
    },
    textCycle: {
      label: 'Next text from a list', params: { title: 'A hint', texts: ['First.', 'Second.'] },
      run(game, ef, ctx) {
        const key = 'cycle:' + (ef.title || '');
        const P = game.player;
        const st = (P.data.editor = P.data.editor || {});
        const i = (st[key] = ((st[key] == null ? -1 : st[key]) + 1) % Math.max(1, (ef.texts || []).length));
        const txt = (ef.texts || [''])[i];
        setTimeout(() => LM.ui.showText(ef.title || 'A note', txt, ef.kicker), 0);
        ctx.closes = true;
      },
    },
    flag: {
      label: 'Set a story flag', params: { name: 'myFlag' },
      run(game, ef) {
        game.setFlag(ef.name);
      },
    },
    sound: {
      label: 'Play a sound', params: { name: 'coin' },
      run(game, ef) {
        LM.audio.play(ef.name || 'ui');
      },
    },
    sparkle: {
      label: 'Sparkles', params: { color: '#f2c96b', count: 18 },
      run(game, ef, ctx) {
        const p = ef.at === 'item' ? near(ctx, game) : { x: game.player.x, y: game.player.y };
        game.particles.burst(p.x, p.y, ef.count || 18, { type: 'ember', color: ef.color || '#f2c96b', speed: 80, life: 1, size: 1.2, drag: 1 });
      },
    },
    flash: {
      label: 'Flash of light', params: { color: '#fff0c0', radius: 300, time: 0.8 },
      run(game, ef, ctx) {
        const p = near(ctx, game);
        game.lights.push({ x: p.x, y: p.y, r: ef.radius || 300, color: ef.color || '#fff0c0', intensity: 0.8, life: ef.time || 0.8, max: ef.time || 0.8 });
      },
    },
    quake: {
      label: 'Shake the floor', params: { strength: 0.5 },
      run(game, ef) {
        game.addShake(ef.strength || 0.5);
      },
    },
    teleport: {
      label: 'Teleport to a tagged tile', params: { tag: 'exit' },
      run(game, ef) {
        const pts = game.level.tags[ef.tag] || [];
        const p = pts[0];
        if (!p) return warn('teleport: no tile tagged ' + ef.tag);
        const P = game.player;
        P.x = p.x * T + T / 2;
        P.y = p.y * T + T / 2;
        P.lastSafe = { x: P.x, y: P.y };
        LM.audio.play('dash');
        game.particles.burst(P.x, P.y, 20, { type: 'ember', color: '#a77bff', speed: 90, life: 0.8, size: 1.2 });
      },
    },
    trap: {
      label: 'Run a trap effect', params: { effect: 'alarm' },
      run(game, ef, ctx) {
        const fx = LM.find('effects', ef.effect);
        if (!fx) return warn('unknown trap effect ' + ef.effect);
        const settings = Object.assign({}, ef, { type: ef.effect });
        fx.run(game, settings, { spawned: [], sealed: [] });
      },
    },
  };
  /** Replace {name} placeholders with effect results. */
  function fill(text, res) {
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (res && res[k] != null ? String(res[k]) : m));
  }
  ED.fill = fill;
  /** Can this list of effects run now? Returns true or the reason it can't. */
  ED.canRun = function (game, effects, ctx) {
    for (const ef of effects || []) {
      const fx = ED.effects[ef.type];
      if (fx && fx.can) {
        const r = fx.can(game, ef, ctx || {});
        if (r !== true) return r;
      }
    }
    return true;
  };
  /** Run a list of effects. Each may have a delay (seconds). */
  ED.runEffects = function (game, effects, ctx) {
    ctx = ctx || {};
    ctx.results = ctx.results || {};
    for (const ef0 of effects || []) {
      const ef = ctx.item ? withProps(ef0, ctx.item) : ef0;
      const fx = ED.effects[ef.type] || (LM.find('effects', ef.type) && { run: (g, e) => LM.get('effects', ef.type).run(g, e, { spawned: [], sealed: [] }) });
      if (!fx) {
        warn('unknown effect ' + ef.type);
        continue;
      }
      const go = () => {
        try {
          fx.run(game, ef, ctx);
        } catch (e) {
          warn('effect ' + ef.type + ' failed', e);
        }
      };
      if (ef.delay) game.schedule(ef.delay, go);
      else go();
    }
    return ctx;
  };
  /** fromProps: { amount: 'heal' } reads a setting from the placed item's props (level legend). */
  function withProps(ef, it) {
    if (!ef.fromProps || !it.props) return ef;
    const o = Object.assign({}, ef);
    for (const [k, p] of Object.entries(ef.fromProps)) if (it.props[p] != null) o[k] = it.props[p];
    return o;
  }

  // ================================================================ abilities (item pop-ups)
  // def.abilities: [{ label, desc, cost, costProp, limit, limitProp, requires: { hurt, flag, notFlag },
  //                   pick: 'random' | 'all', outcomes: [{ weight, text, kind, sound, effects: [...] }] }]
  // def.popup: { kicker, title, text, leave }   (placed items can override title/text with props)
  const usesLeft = (it, a, i) => {
    const lim = a.limitProp && it.props[a.limitProp] != null ? +it.props[a.limitProp] : a.limit || 0;
    if (!lim) return Infinity;
    return lim - ((it.abilityUses && it.abilityUses[i]) || 0);
  };
  const costOf = (it, a) => (a.costProp && it.props[a.costProp] != null ? +it.props[a.costProp] : a.cost || 0);
  function abilityState(game, it, a, i) {
    const P = game.player;
    const left = usesLeft(it, a, i);
    if (left <= 0) return { ok: false, why: a.usedText || (a.limit === 1 || a.limitProp ? 'Used up.' : 'No more uses.') };
    const rq = a.requires || {};
    if (rq.flag && !game.hasFlag(rq.flag)) return { ok: false, why: rq.flagText || 'Not yet.', hidden: !!rq.hide };
    if (rq.notFlag && game.hasFlag(rq.notFlag)) return { ok: false, why: rq.flagText || 'Not any more.', hidden: !!rq.hide };
    if (rq.hurt && P.hp >= P.stats().maxHp) return { ok: false, why: rq.hurtText || 'You are unhurt. Save it for later.' };
    const cost = costOf(it, a);
    if (cost > P.gold) return { ok: false, why: 'Costs ' + cost + ' gold. You have ' + P.gold + '.' };
    // every outcome must be possible, or the ability is blocked (an altar with no blessings left)
    for (const o of a.outcomes || []) {
      const r = ED.canRun(game, o.effects, { item: it });
      if (r !== true) return { ok: false, why: r };
    }
    return { ok: true };
  }
  function useAbility(game, it, a, i) {
    const st = abilityState(game, it, a, i);
    if (!st.ok) return;
    const P = game.player;
    P.gold -= costOf(it, a);
    it.abilityUses = it.abilityUses || {};
    it.abilityUses[i] = (it.abilityUses[i] || 0) + 1;
    const outs = a.outcomes || [];
    const chosen = a.pick === 'all' ? outs : outs.length ? [U.weighted(outs.map((o) => Object.assign({ w: o.weight == null ? 1 : o.weight }, o)))] : [];
    const ctx = { item: it, x: it.x, y: it.y, results: {} };
    let text = '', kind = 'good';
    for (const o of chosen) {
      ED.runEffects(game, o.effects, ctx);
      if (o.sound) LM.audio.play(o.sound);
      if (o.text) text += (text ? ' ' : '') + fill(o.text, ctx.results);
      if (o.kind) kind = o.kind;
    }
    if (!chosen.some((o) => o.effects && o.effects.length) && !chosen.some((o) => o.sound)) LM.audio.play(kind === 'bad' ? 'lose' : 'ui');
    it.lastResult = text ? { kind, text } : null;
    if (a.toast !== false && text) game.toast(text.length > 90 ? a.label : text, kind);
    if (a.flag) game.setFlag(a.flag);
    return ctx;
  }
  ED.abilityPopup = function (game, it) {
    const def = it.def, pop = def.popup || {};
    const P = game.player;
    const choices = h('div', { class: 'choices' });
    (def.abilities || []).forEach((a, i) => {
      const st = abilityState(game, it, a, i);
      if (st.hidden) return;
      const cost = costOf(it, a);
      const left = usesLeft(it, a, i);
      const note = st.ok ? (a.desc || '') + (cost ? ' You have ' + P.gold + ' gold.' : '') + (left !== Infinity && left > 0 && a.showUses !== false ? ' (' + left + ' left)' : '') : st.why;
      const b = h('button', { class: 'choice', type: 'button', disabled: !st.ok }, h('strong', null, a.label || 'Use'), h('span', { class: 'cost' }, a.costLabel || (cost ? cost + ' gold' : 'Free')), h('small', null, note));
      b.addEventListener('click', () => {
        const ctx = useAbility(game, it, a, i);
        if (!ctx) return;
        if (ctx.closes || a.close) LM.ui.close();
        else setTimeout(() => ED.abilityPopup(game, it), 0);
      });
      choices.appendChild(b);
    });
    const result = h('div', { class: 'result' + (it.lastResult ? ' ' + it.lastResult.kind : '') }, it.lastResult ? it.lastResult.text : '');
    const title = it.props.title || it.props.deity || it.props.name || pop.title || def.name;
    const text = it.props.text || pop.text;
    LM.ui.open({
      kicker: pop.kicker || def.name,
      title,
      body: h('div', null, text ? h('p', { class: 'lore' }, text) : null, choices, result),
      actions: [{ label: pop.leave || 'Step away', primary: true }],
    });
  };
  ED.anyAbilityLeft = (game, it) => (it.def.abilities || []).some((a, i) => usesLeft(it, a, i) > 0);

  // ================================================================ items
  function buildItem(def) {
    if (def.look) Object.assign(def, ED.lookFor(def.look, 'item'));
    if (def.abilities && def.abilities.length) {
      const prev = def.interact || {};
      def.interact = {
        prompt: def.popup && def.popup.prompt ? def.popup.prompt : prev.prompt && typeof prev.prompt === 'string' ? prev.prompt : 'Use the ' + (def.name || 'thing').toLowerCase(),
        available: (it, game) => ED.anyAbilityLeft(game, it),
        use: (it, game) => ED.abilityPopup(game, it),
      };
      if (def.popup && def.popup.dimWhenUsed && !def._dimHooked) {
        def._dimHooked = true;
        const up = def.update;
        def.update = function (it, dt, game) {
          if (up) up.call(this, it, dt, game);
          if (it.light && game && game.player && !ED.anyAbilityLeft(game, it)) it.light.intensity = Math.min(it.light.intensity, 0.12);
        };
      }
    }
    if (def.touch) {
      const tc = def.touch;
      def.onTouch = function (it, game) {
        const P = game.player;
        if (tc.needsHurt && P.hp >= P.stats().maxHp) return false;
        if (ED.canRun(game, tc.effects, { item: it }) !== true) return false;
        const ctx = ED.runEffects(game, tc.effects, { item: it, x: it.x, y: it.y, results: {} });
        if (tc.text) game.toast(fill(tc.text, ctx.results), tc.kind || 'good');
        if (tc.flag) game.setFlag(tc.flag);
        if (tc.float) game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: fill(tc.float, ctx.results), color: '#e8dcc0', size: 7 });
      };
      if (def.magnet == null && tc.magnet) def.magnet = tc.magnet;
    }
    if (def.breakEffects || def.breakLoot) {
      const d = (def.destructible = Object.assign({ hp: 20 }, def.destructible || {}));
      const orig = d.onBreak && !d.onBreak._ed ? d.onBreak : d.onBreak && d.onBreak._orig;
      const onBreak = function (it, game, o) {
        if (orig && def.breakKeepOriginal !== false) orig(it, game, o);
        else {
          LM.audio.play('break', { vol: game.vol(it.x, it.y) });
          game.particles.burst(it.x, it.y, 12, { type: 'chunk', color: [def.look && def.look.color ? def.look.color : '#6b4a2a', '#4a3018'], speed: 160, life: 0.9, size: 2, vz: 120, z: 4, vr: 14 });
        }
        if (def.breakEffects) ED.runEffects(game, def.breakEffects, { item: it, x: it.x, y: it.y, results: {} });
        if (def.breakLoot) game.dropLoot(it.x, it.y, it.props.loot || def.breakLoot);
      };
      onBreak._ed = true;
      onBreak._orig = orig;
      d.onBreak = onBreak;
    }
    if (def.slots) {
      def.interact = { prompt: (def.popup && def.popup.prompt) || 'Play the slot machine', available: () => true, use: (it, game) => ED.slotsPopup(game, it) };
    }
    if (def.readable) {
      const r = def.readable;
      def.interact = {
        prompt: (it) => 'Read ' + (it.props.title || r.title ? '“' + (it.props.title || r.title) + '”' : 'it'),
        available: () => true,
        use: (it, game) => {
          LM.ui.showText(it.props.title || r.title || def.name, it.props.text || r.text || '', r.kicker || def.name);
          if (r.flag) game.setFlag(r.flag);
        },
      };
    }
  }

  // ================================================================ enemies
  function buildEnemy(def) {
    if (def.look) Object.assign(def, ED.lookFor(def.look, 'enemy'));
    if (def.deathEffects && !def._deathHooked) {
      def._deathHooked = true;
      const prev = def.onDeath;
      def.onDeath = function (e, game) {
        if (prev) prev.call(this, e, game);
        ED.runEffects(game, def.deathEffects, { x: e.x, y: e.y, results: {} });
      };
    }
  }

  // ================================================================ loot tables as data
  // def.data: { always: [entry], groups: [{ chance, options: [{ weight, entries: [entry] }] }] }
  // Entry amounts may be [min, max]. { type: 'ammo', ammo: 'carried' } picks ammunition for a weapon you carry.
  function concreteEntry(e) {
    const o = Object.assign({}, e);
    if (Array.isArray(o.amount)) o.amount = U.randInt(o.amount[0], o.amount[1]);
    if (o.type === 'ammo' && (o.ammo === 'carried' || !o.ammo)) {
      const P = LM.game && LM.game.player;
      const types = P ? [...new Set(P.weapons.map((id) => LM.get('weapons', id).ammo).filter(Boolean))] : [];
      o.ammo = types.length ? U.pick(types) : 'shells';
      if (o.amount == null) o.amount = AMMO_STEP[o.ammo] || 10;
    }
    if (o.type === 'ammo' && o.amount == null) o.amount = AMMO_STEP[o.ammo] || 10;
    delete o.weight;
    return o;
  }
  ED.rollLoot = function (data) {
    const out = (data.always || []).map(concreteEntry);
    for (const g of data.groups || []) {
      if (g.chance != null && Math.random() >= g.chance) continue;
      const opts = (g.options || []).map((o) => Object.assign({ w: o.weight == null ? 1 : o.weight }, o));
      if (!opts.length) continue;
      const n = g.picks || 1;
      for (let i = 0; i < n; i++) {
        const o = U.weighted(opts);
        for (const e of o.entries || []) out.push(concreteEntry(e));
      }
    }
    return out;
  };
  function buildLoot(def) {
    if (def.data) def.roll = () => ED.rollLoot(def.data);
  }

  // ================================================================ slot machine with a paytable
  // def.slots: { bets: [5,10,25], symbols: [{ id, name, weight, pay, color, glyph, effects, text }], pair: { symbol, count, pay } }
  const SYMBOL_ART = {
    coin(g) {
      const grd = g.createRadialGradient(-6, -6, 2, 0, 0, 20);
      grd.addColorStop(0, '#fff2b8'); grd.addColorStop(0.5, '#e9b343'); grd.addColorStop(1, '#8a5a14');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 19, 0, U.TAU); g.fill();
      g.strokeStyle = '#7a4e10'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 13, 0, U.TAU); g.stroke();
    },
    gem(g) {
      g.fillStyle = '#8f6cf0'; g.beginPath(); g.moveTo(0, -20); g.lineTo(17, -4); g.lineTo(0, 21); g.lineTo(-17, -4); g.closePath(); g.fill();
      g.fillStyle = '#c6b0ff'; g.beginPath(); g.moveTo(0, -20); g.lineTo(8, -4); g.lineTo(-8, -4); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-4, -12, 3, 5);
    },
    eye(g) {
      g.fillStyle = '#ebe4d4'; g.beginPath(); g.ellipse(0, 0, 22, 12, 0, 0, U.TAU); g.fill();
      g.fillStyle = '#2a8aa8'; g.beginPath(); g.arc(0, 0, 9, 0, U.TAU); g.fill();
      g.fillStyle = '#0a0b10'; g.beginPath(); g.arc(0, 0, 4.5, 0, U.TAU); g.fill();
      g.fillStyle = '#fff'; g.fillRect(2, -5, 3, 3);
    },
    crown(g) {
      g.fillStyle = '#f0c048'; g.beginPath(); g.moveTo(-20, 12); g.lineTo(-20, -8); g.lineTo(-10, 2); g.lineTo(0, -16); g.lineTo(10, 2); g.lineTo(20, -8); g.lineTo(20, 12); g.closePath(); g.fill();
      g.fillStyle = '#e4574d'; g.beginPath(); g.arc(0, 5, 3.5, 0, U.TAU); g.fill();
      g.fillStyle = '#8a5a14'; g.fillRect(-20, 9, 40, 3);
    },
    skull(g) {
      g.fillStyle = '#d8d0bc'; g.beginPath(); g.arc(0, -3, 16, 0, U.TAU); g.fill(); g.fillRect(-9, 8, 18, 9);
      g.fillStyle = '#16120e'; g.beginPath(); g.arc(-6, -2, 4.5, 0, U.TAU); g.arc(6, -2, 4.5, 0, U.TAU); g.fill();
      g.fillRect(-1.5, 5, 3, 4); for (let i = -6; i <= 6; i += 4) g.fillRect(i - 0.75, 11, 1.5, 6);
    },
  };
  ED.drawSymbol = function (g, sym) {
    if (sym.sprite && ED.image(sym.sprite)) {
      const img = ED.image(sym.sprite);
      if (img.complete && img.naturalWidth) g.drawImage(img, -21, -21, 42, 42);
      return;
    }
    const art = SYMBOL_ART[sym.art || sym.id];
    if (art && !sym.glyph) return art(g);
    const c = sym.color || '#c8b07a';
    g.fillStyle = U.shade(c, -0.45);
    g.beginPath(); g.arc(0, 0, 20, 0, U.TAU); g.fill();
    g.fillStyle = c;
    g.beginPath(); g.arc(0, 0, 17, 0, U.TAU); g.fill();
    g.fillStyle = '#16120e';
    g.font = '700 22px "Big Shoulders Display", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(sym.glyph || (sym.name || sym.id || '?').slice(0, 1).toUpperCase(), 0, 1);
  };
  function symbolCanvas(sym, size) {
    return LM.ui.iconCanvas(size, size, (g, W) => {
      g.translate(W / 2, W / 2);
      g.scale(W / 60, W / 60);
      ED.drawSymbol(g, sym);
    });
  }
  ED.slotsPopup = function (game, it) {
    const def = it.def, cfg = def.slots, P = game.player;
    const SYMBOLS = (cfg.symbols || []).map((s) => Object.assign({ w: s.weight == null ? 1 : s.weight }, s));
    if (!SYMBOLS.length) return game.toast('The machine is empty.', 'warn');
    const bets = cfg.bets && cfg.bets.length ? cfg.bets : [5, 10, 25];
    const SZ = 76;
    let bet = bets.includes(it.bet) ? it.bet : bets[0];
    let spinning = false;
    const reels = [0, 1, 2].map(() => {
      const strip = h('div', { class: 'strip' });
      strip.appendChild(symbolCanvas(U.pick(SYMBOLS), 60));
      [...strip.children].forEach((c) => (c.style.margin = '8px auto'));
      return { el: h('div', { class: 'reel' }, strip), strip };
    });
    const goldLine = h('b', null, String(P.gold));
    const pr = cfg.pair;
    const result = h('div', { class: 'result' }, cfg.intro || 'Three of a kind pays.' + (pr ? ' Two ' + (SYMBOLS.find((s) => s.id === pr.symbol) || { name: pr.symbol }).name.toLowerCase() + 's anywhere pays ×' + pr.pay + '.' : ''));
    const betBtns = bets.map((b) => {
      const btn = h('button', { class: 'btn small' + (b === bet ? ' on' : ''), type: 'button' }, b + ' gold');
      btn.addEventListener('click', () => {
        if (spinning) return;
        bet = b;
        it.bet = b;
        betBtns.forEach((x) => x.classList.toggle('on', x === btn));
        LM.audio.play('ui');
        refresh();
      });
      return btn;
    });
    const pay = h('div', { class: 'paytable' }, SYMBOLS.map((s) => h('div', null, symbolCanvas(s, 22), (s.name || s.id) + ' ×3', h('b', null, s.pay ? '×' + s.pay : s.effects && s.effects.length ? 'beware' : '—'))));
    const spinAction = { label: 'Pull the lever', primary: true, key: 'E', close: false, onClick: () => (spin(), false) };
    const refresh = () => {
      goldLine.textContent = String(P.gold);
      if (spinAction.el) spinAction.el.disabled = spinning || P.gold < bet;
    };
    function spin() {
      if (spinning || P.gold < bet) return;
      spinning = true;
      P.gold -= bet;
      refresh();
      result.className = 'result';
      result.textContent = 'The reels clatter…';
      const outcome = [0, 1, 2].map(() => U.weighted(SYMBOLS));
      const start = performance.now();
      const plans = reels.map((r, i) => {
        r.strip.replaceChildren();
        const n = 18 + i * 6;
        for (let k = 0; k < n; k++) r.strip.appendChild(symbolCanvas(k === n - 1 ? outcome[i] : U.pick(SYMBOLS), 60));
        [...r.strip.children].forEach((c) => (c.style.margin = '8px auto'));
        return { n, dur: 900 + i * 380, dist: (n - 1) * SZ, lastTick: 0 };
      });
      function frame(now) {
        let done = true;
        plans.forEach((p, i) => {
          const k = U.clamp((now - start) / p.dur, 0, 1);
          const y = U.ease.outCubic(k) * p.dist;
          reels[i].strip.style.transform = 'translateY(' + -y + 'px)';
          const idx = Math.floor(y / SZ);
          if (idx !== p.lastTick && k < 1) {
            p.lastTick = idx;
            LM.audio.play('tick', { throttle: 0.01 });
          }
          if (k < 1) done = false;
        });
        if (!done && LM.ui.modalOpen) requestAnimationFrame(frame);
        else finish();
      }
      requestAnimationFrame(frame);
      function finish() {
        spinning = false;
        const ids = outcome.map((o) => o.id);
        let win = 0, msg = '', kind = 'bad', closing = false;
        if (ids[0] === ids[1] && ids[1] === ids[2]) {
          const s = outcome[0];
          if (s.effects && s.effects.length) {
            const ctx = ED.runEffects(game, s.effects, { item: it, x: it.x, y: it.y, results: {} });
            msg = fill(s.text || 'Three ' + (s.name || s.id).toLowerCase() + 's.', ctx.results);
            kind = s.kind || (s.pay ? 'good' : 'bad');
            if (s.close) {
              closing = true;
              setTimeout(() => LM.ui.close(), 900);
            }
          }
          if (s.pay) {
            win = Math.floor(bet * s.pay);
            msg = (msg ? msg + ' ' : 'Three ' + (s.name || s.id).toLowerCase() + 's! ') + 'You win ' + win + ' gold.';
            kind = 'good';
          }
          if (!msg) msg = 'Three ' + (s.name || s.id).toLowerCase() + 's. Nothing happens.';
        } else if (pr && ids.filter((x) => x === pr.symbol).length >= (pr.count || 2)) {
          win = Math.floor(bet * pr.pay);
          msg = 'Two ' + (SYMBOLS.find((s) => s.id === pr.symbol) || { name: pr.symbol }).name.toLowerCase() + 's. ' + win + ' gold back.';
          kind = 'good';
        } else msg = 'Nothing. The machine keeps your ' + bet + ' gold.';
        if (win) {
          P.gold += win;
          game.stats.gold += Math.max(0, win - bet);
          LM.audio.play(win >= bet * 6 ? 'win' : 'coin');
        } else if (!closing) LM.audio.play('lose');
        result.className = 'result ' + kind;
        result.textContent = msg;
        refresh();
      }
    }
    LM.ui.open({
      kicker: (def.popup && def.popup.kicker) || 'Games of chance',
      title: it.props.name || (def.popup && def.popup.title) || def.name,
      body: h('div', { class: 'slots-machine' },
        h('div', { class: 'reels' }, reels.map((r) => r.el)),
        h('div', { class: 'bets' }, h('span', { class: 'muted', style: 'align-self:center' }, 'Bet'), betBtns),
        h('div', { class: 'meter-head' }, h('span', null, 'Your gold'), goldLine),
        result,
        pay
      ),
      actions: [spinAction, { label: (def.popup && def.popup.leave) || 'Walk away', quiet: true }],
    });
    refresh();
  };

  // ================================================================ sprites (imported pictures)
  const imgCache = new Map();
  /** An Image for a sprite id from sprites.js (or a data URL), cached. */
  ED.image = function (id) {
    if (!id) return null;
    const src = ED.sprites[id] || (String(id).startsWith('data:') ? id : null);
    if (!src) return null;
    let img = imgCache.get(id);
    if (img && img._src === src) return img;
    img = new Image();
    img._src = src;
    img.onload = () => {
      // tiles bake once; repaint any chunk that baked before the picture decoded
      const g = LM.game;
      if (g && g.renderer && g.renderer.chunks) g.renderer.chunks.clear();
      if (ED.onImageLoad) ED.onImageLoad(id);
    };
    img.src = src;
    imgCache.set(id, img);
    return img;
  };
  ED.forgetImage = (id) => imgCache.delete(id);
  ED.preloadSprites = () => Object.keys(ED.sprites).forEach((id) => ED.image(id));

  // ================================================================ looks
  // def.look = { type: 'creature' | 'object' | 'sprite', ...colours and options }
  const lunge = ED.helpers.lunge, eyes = ED.helpers.eyes;
  ED.lookFor = function (look, kind) {
    const L = ED.looks[look.type];
    if (!L) {
      warn('unknown look type ' + look.type);
      return {};
    }
    return L(look, kind);
  };
  ED.looks = {};

  /** A picture: drawn centred, scaled to look.size units, turned to face the way the body faces. */
  ED.looks.sprite = function (look, kind) {
    const off = { right: 0, down: -Math.PI / 2, left: Math.PI, up: Math.PI / 2 }[look.facing || 'right'] || 0;
    const turns = look.rotate !== false && kind !== 'item';
    const out = {
      draw(g, e, t) {
        const img = ED.image(look.sprite);
        const size = look.size || (e.r || 10) * 2.6;
        if (turns && e.facing != null) g.rotate(e.facing + off);
        if (kind === 'enemy') g.translate(lunge(e), 0);
        if (look.bob) g.translate(0, Math.sin(t * 3 + (e.t || 0)) * 1.2);
        if (img && img.complete && img.naturalWidth) {
          const k = size / Math.max(img.naturalWidth, img.naturalHeight);
          const w = img.naturalWidth * k, hh = img.naturalHeight * k;
          if (kind === 'enemy' && look.flipX) g.scale(-1, 1);
          g.drawImage(img, -w / 2, -hh / 2, w, hh);
        } else {
          g.fillStyle = look.color || '#8a8a8a';
          g.beginPath();
          g.arc(0, 0, size / 2.6, 0, U.TAU);
          g.fill();
        }
      },
    };
    if (look.glow || look.eyes) {
      out.drawGlow = kind === 'enemy'
        ? (g, e, t) => {
          if (look.glow) G.glow(g, e.x, e.y, look.glowSize || e.r * 2.6, look.glow, 0.25 + 0.08 * Math.sin(t * 2));
          if (look.eyes) eyes(g, e, look.eyes, look.eyeSpread || e.r * 0.2, look.eyeForward || e.r * 0.45, look.eyeSize || 1);
        }
        : (g, it, t) => G.glow(g, 0, 0, look.glowSize || (it.r || 9) * 2, look.glow, 0.3 + 0.1 * Math.sin(t * 2.5));
    }
    return out;
  };

  // ---------------------------------------------------------------- animated sprite sheets
  // def.look = { type: 'sheet', sprite, frame: [w, h] (pixels), size (units across one frame),
  //              layout: 'rotate' | '4dir', facing: 'right' (rotate only), pixelated, glow, eyes,
  //              anims: { idle, walk, attack, hurt, death: { row, frames, fps, hit? } } }
  // rotate: one row per animation, the monster drawn from above facing right; the game turns it.
  // 4dir:   four rows per animation, in the order down, left, right, up; the game picks the row.
  // The template and the full guide: editor/templates/ (SPRITE-SHEETS.md).
  ED.SHEET = {
    ANIMS: ['idle', 'walk', 'attack', 'hurt', 'death'],
    DIRS: ['down', 'left', 'right', 'up'],
    defaults(layout) {
      const k = layout === '4dir' ? 4 : 1;
      return {
        idle: { row: 0, frames: 4, fps: 6 },
        walk: { row: 1 * k, frames: 6, fps: 10 },
        attack: { row: 2 * k, frames: 6, fps: 12, hit: 3 },
        hurt: { row: 3 * k, frames: 2, fps: 12 },
        death: { row: 4 * k, frames: 6, fps: 10 },
      };
    },
  };
  /** The spec for one animation (or null if the sheet doesn't have it). */
  ED.sheetAnim = function (look, name) {
    const a = Object.assign({}, ED.SHEET.defaults(look.layout)[name], (look.anims || {})[name]);
    return a.frames > 0 ? a : null;
  };
  /** Which animation, and which frame of it, for a monster or person right now. */
  ED.sheetPose = function (look, e) {
    const t = e.t || 0;
    const last = e._sheetT;
    e._sheetT = t;
    if (e._sheetDeath != null) {
      const a = ED.sheetAnim(look, 'death');
      if (a) return { a, i: Math.min(a.frames - 1, Math.floor(e._sheetDeath * (a.fps || 10))) };
    }
    const atk = e.atk && ED.sheetAnim(look, 'attack');
    if (atk) {
      // the wind-up plays the frames before the hit frame; the blow lands on the hit frame
      const ad = e.atk.def || {}, wind = ad.windup || 0.3, hit = Math.min(atk.frames - 1, atk.hit == null ? Math.floor(atk.frames / 2) : atk.hit);
      const at = e.atk.t || 0;
      const i = at < wind ? Math.floor((at / wind) * hit) : hit + Math.floor(((at - wind) / Math.max(0.15, ad.recover || 0.3)) * (atk.frames - hit));
      return { a: atk, i: Math.min(atk.frames - 1, Math.max(0, i)) };
    }
    if (e.flash > 0) e._hurtUntil = t + 0.25;
    const hurt = e._hurtUntil > t && ED.sheetAnim(look, 'hurt');
    if (hurt) return { a: hurt, i: Math.floor((0.25 - (e._hurtUntil - t)) * (hurt.fps || 12)) % hurt.frames };
    const sp = Math.hypot(e.vx || 0, e.vy || 0);
    const walk = sp > 10 && ED.sheetAnim(look, 'walk');
    if (walk) {
      const k = U.clamp(sp / ((e.def && e.def.speed) || 80), 0.5, 2);
      const step = Math.max(0, Math.min(0.1, t - (last == null ? t : last)));
      e._walkT = (e._walkT || 0) + step * k; // faster when it runs
      return { a: walk, i: Math.floor(e._walkT * (walk.fps || 10)) % walk.frames };
    }
    const idle = ED.sheetAnim(look, 'idle') || walk;
    return idle ? { a: idle, i: Math.floor(t * (idle.fps || 6)) % idle.frames } : null;
  };
  /** Draw one frame of the sheet, centred on the origin. */
  ED.drawSheetFrame = function (g, look, row, col, size) {
    const img = ED.image(look.sprite);
    const fw = (look.frame && look.frame[0]) || 64, fh = (look.frame && look.frame[1]) || fw;
    const w = size, hh = (size * fh) / fw;
    if (!(img && img.complete && img.naturalWidth)) {
      g.fillStyle = look.color || '#8a8a8a';
      g.beginPath();
      g.arc(0, 0, size / 3.4, 0, U.TAU);
      g.fill();
      return;
    }
    const smooth = g.imageSmoothingEnabled;
    if (look.pixelated) g.imageSmoothingEnabled = false;
    g.drawImage(img, col * fw, row * fh, fw, fh, -w / 2, -hh / 2, w, hh);
    g.imageSmoothingEnabled = smooth;
  };
  ED.looks.sheet = function (look, kind) {
    const four = look.layout === '4dir';
    const off = { right: 0, down: -Math.PI / 2, left: Math.PI, up: Math.PI / 2 }[look.facing || 'right'] || 0;
    const draw = (g, e, t) => {
      const size = look.size || (e.r || 10) * 3.4;
      const pose = ED.sheetPose(look, e);
      let row = pose ? pose.a.row : 0;
      const col = pose ? pose.i : 0;
      if (four) {
        // pick the row for the way it faces: down, left, right, up
        const a = (((e.facing || 0) % U.TAU) + U.TAU) % U.TAU;
        const dir = a < Math.PI / 4 || a >= (7 * Math.PI) / 4 ? 2 : a < (3 * Math.PI) / 4 ? 0 : a < (5 * Math.PI) / 4 ? 1 : 3;
        row += dir;
      } else if (look.rotate !== false && e.facing != null) g.rotate(e.facing + off);
      if (look.bob) g.translate(0, Math.sin(t * 3 + (e.t || 0)) * 1.2);
      ED.drawSheetFrame(g, look, row, col, size);
    };
    const out = { draw };
    if (look.glow || look.eyes) {
      out.drawGlow = (g, e, t) => {
        if (e._sheetDeath != null) return;
        if (look.glow) G.glow(g, e.x, e.y, look.glowSize || e.r * 2.6, look.glow, 0.25 + 0.08 * Math.sin(t * 2));
        if (look.eyes && kind === 'enemy') eyes(g, e, look.eyes, look.eyeSpread || e.r * 0.2, look.eyeForward || e.r * 0.45, look.eyeSize || 1);
      };
    }
    return out;
  };
  // a monster drawn from a sheet with a death animation leaves it playing where it fell, then fades
  LM.on('enemyDied', (e) => {
    const look = e.def && e.def.look, game = LM.game;
    if (!look || look.type !== 'sheet' || !game || !ED.sheetAnim(look, 'death')) return;
    if (game.fx.some((f) => f.e === e)) return; // it fell into a pit instead
    const a = ED.sheetAnim(look, 'death'), dur = a.frames / (a.fps || 10);
    e._sheetDeath = 0;
    e.atk = null;
    game.fx.push({
      e, t: 0,
      update(dt) {
        this.t += dt;
        e._sheetDeath = this.t;
        return this.t > dur + (look.linger == null ? 6 : look.linger) + 1;
      },
      draw(ctx, g2, t) {
        const fade = Math.min(1, Math.max(0, dur + (look.linger == null ? 6 : look.linger) + 1 - this.t));
        ctx.save();
        ctx.globalAlpha = fade * Math.max(0.0, e.vis == null ? 1 : Math.max(e.vis, 0.6));
        ctx.translate(e.x, e.y);
        e.def.draw(ctx, e, t, g2);
        ctx.restore();
      },
    });
  });

  /** A creature from parameters, in the style of the core enemies (top-down, facing right). */
  ED.looks.creature = function (look) {
    const body = look.body || '#6b7a63';
    const dark = look.outline || U.shade(body, -0.45);
    const headC = look.head || U.shade(body, 0.15);
    const limb = look.limbs || U.shade(body, -0.15);
    const accent = look.accent || '#d9a32a';
    const extras = new Set(look.extras || []);
    const shape = look.shape || 'humanoid';
    const ell = (g, x, y, rx, ry, rot, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x, y, rx, ry, rot || 0, 0, U.TAU);
      g.fill();
    };
    function drawExtrasUnder(g, e, t) {
      if (extras.has('wings')) {
        const f = Math.sin(t * 14 + e.t) * 0.35;
        g.fillStyle = U.rgba(look.wings || '#cfd6e0', 0.55);
        for (const s of [-1, 1]) {
          g.save();
          g.rotate(s * (0.9 + f));
          g.beginPath();
          g.ellipse(-2, 0, 4, 11, 0.4 * s, 0, U.TAU);
          g.fill();
          g.restore();
        }
      }
      if (extras.has('tail')) {
        g.strokeStyle = limb;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-7, 0);
        g.quadraticCurveTo(-13, Math.sin(e.t * 5) * 5, -18, Math.sin(e.t * 5 + 1) * 3);
        g.stroke();
      }
      if (extras.has('tentacles')) {
        g.strokeStyle = limb;
        g.lineWidth = 1.6;
        g.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(-5, i * 2.5);
          g.quadraticCurveTo(-11, i * 3.5 + Math.sin(e.t * 6 + i) * 3, -16, i * 4 + Math.sin(e.t * 6 + i + 1) * 3);
          g.stroke();
        }
      }
      if (extras.has('cloak')) ell(g, -2, 0, 10.5, 12, 0, U.shade(dark, -0.2));
    }
    function drawExtrasOver(g, e, t) {
      if (extras.has('armor')) {
        g.fillStyle = look.metal || '#5a5c62';
        g.fillRect(-8, -8, 6, 16);
        g.fillStyle = U.shade(look.metal || '#5a5c62', 0.25);
        g.fillRect(-8, -8, 6, 1.6);
      }
      if (extras.has('shell')) {
        for (let i = 0; i < 3; i++) ell(g, -5 + i * 3, 0, 4, 7 - i, 0, i % 2 ? U.shade(body, -0.25) : U.shade(body, -0.1));
      }
      if (extras.has('spikes')) {
        g.fillStyle = look.spikes || '#e8dcc0';
        for (let i = 0; i < 7; i++) {
          const a = Math.PI * 0.55 + (i / 6) * Math.PI * 0.9;
          const x = Math.cos(a) * 8, y = Math.sin(a) * 9;
          g.beginPath();
          g.moveTo(x - Math.sin(a) * 1.6, y + Math.cos(a) * 1.6);
          g.lineTo(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5);
          g.lineTo(x + Math.sin(a) * 1.6, y - Math.cos(a) * 1.6);
          g.fill();
        }
      }
      if (extras.has('gun')) {
        g.fillStyle = '#2a2622';
        g.fillRect(4, 1.5, 15, 3);
        g.fillStyle = accent;
        g.fillRect(14, 1.5, 2, 3);
      }
      if (extras.has('blade')) {
        g.fillStyle = '#c8ccd2';
        g.beginPath();
        g.moveTo(6, -7);
        g.lineTo(21, -9);
        g.lineTo(6, -5);
        g.closePath();
        g.fill();
      }
      if (extras.has('staff')) {
        g.strokeStyle = '#5a3c22';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-4, 8);
        g.lineTo(16, 8);
        g.stroke();
      }
    }
    function head(g, x, r) {
      ell(g, x, 0, r, r, 0, headC);
      if (extras.has('horns')) {
        g.fillStyle = look.horns || '#e8dcc0';
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(x - 1, s * (r - 1));
          g.lineTo(x - 5, s * (r + 4));
          g.lineTo(x + 1.5, s * (r - 2.5));
          g.closePath();
          g.fill();
        }
      }
    }
    const draw = function (g, e, t) {
      const s = (e.r || 10) / 10;
      g.rotate(e.facing);
      g.translate(lunge(e), 0);
      g.scale(s, s);
      drawExtrasUnder(g, e, t);
      if (shape === 'humanoid') {
        const sway = Math.sin(e.t * 6) * 1.2;
        ell(g, -1, 0, 8.5, 10, 0, dark);
        ell(g, 0, 0, 7, 8.6, 0, body);
        g.fillStyle = limb;
        g.beginPath();
        g.ellipse(look.armsForward ? 9 : 5, -6 + sway, 5, 2.2, 0.3, 0, U.TAU);
        g.ellipse(look.armsForward ? 9 : 5, 6 - sway, 5, 2.2, -0.3, 0, U.TAU);
        g.fill();
        drawExtrasOver(g, e, t);
        head(g, 2.5, 4.6);
      } else if (shape === 'brute') {
        ell(g, -2, 0, 12, 15.5, 0, dark);
        ell(g, -1, 0, 10.5, 14, 0, body);
        g.fillStyle = limb;
        g.beginPath();
        g.arc(11, -9, 4.5, 0, U.TAU);
        g.arc(11, 9, 4.5, 0, U.TAU);
        g.fill();
        drawExtrasOver(g, e, t);
        head(g, 3, 5.5);
      } else if (shape === 'beast') {
        const st = Math.sin(e.t * 12) * 2.2;
        g.fillStyle = limb;
        for (const [x, y, k] of [[5, -6, 1], [5, 6, -1], [-5, -6, -1], [-5, 6, 1]]) {
          g.beginPath();
          g.ellipse(x + st * k, y, 2.6, 2, 0, 0, U.TAU);
          g.fill();
        }
        ell(g, 0, 0, 11, 7, 0, dark);
        ell(g, 0, 0, 9.6, 5.8, 0, body);
        drawExtrasOver(g, e, t);
        head(g, 9, 4.4);
      } else if (shape === 'insect') {
        g.strokeStyle = limb;
        g.lineWidth = 1.2;
        const step = Math.sin(e.t * 22);
        for (let i = 0; i < 3; i++) {
          const ox = -3 + i * 3.5, w = (i % 2 ? step : -step) * 2;
          g.beginPath();
          g.moveTo(ox, -2); g.lineTo(ox + w + 1, -8); g.lineTo(ox + w + 3, -10);
          g.moveTo(ox, 2); g.lineTo(ox - w + 1, 8); g.lineTo(ox - w + 3, 10);
          g.stroke();
        }
        ell(g, -2, 0, 6, 4.6, 0, body);
        drawExtrasOver(g, e, t);
        ell(g, 3.5, 0, 3.6, 3.2, 0, headC);
      } else if (shape === 'blob') {
        const wob = Math.sin(e.t * 4);
        ell(g, 0, 0, 10 + wob, 9 - wob, 0, dark);
        ell(g, 0.5, 0, 8.6 + wob, 7.6 - wob, 0, body);
        ell(g, 2, -1, 4, 3, 0, headC);
        drawExtrasOver(g, e, t);
      } else if (shape === 'floater') {
        g.strokeStyle = limb;
        g.lineWidth = 1.4;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(-4, i * 3);
          g.quadraticCurveTo(-10, i * 4 + Math.sin(e.t * 5 + i) * 3, -15, i * 5);
          g.stroke();
        }
        ell(g, 0, 0, 8, 8, 0, dark);
        ell(g, 0.6, 0, 6.8, 6.8, 0, body);
        drawExtrasOver(g, e, t);
        ell(g, 2.5, 0, 3, 3, 0, headC);
      } else if (shape === 'turret') {
        g.rotate(-e.facing);
        g.fillStyle = dark;
        g.fillRect(-10, -10, 20, 20);
        g.fillStyle = body;
        g.fillRect(-9, -9, 18, 18);
        g.rotate(e.facing);
        g.fillStyle = limb;
        g.fillRect(2, -2.2, 14, 4.4);
        ell(g, 0, 0, 6, 6, 0, headC);
        drawExtrasOver(g, e, t);
      } else {
        ell(g, 0, 0, 9, 9, 0, body);
      }
    };
    const drawGlow = function (g, e, t) {
      const s = (e.r || 10) / 10;
      if (look.glow) G.glow(g, e.x, e.y, (look.glowSize || 26) * s, look.glow, 0.22 + 0.08 * Math.sin(t * 2 + (e.t || 0)));
      if (look.eyes !== null && look.eyes !== false) {
        const fwd = { humanoid: 3.6, brute: 6.5, beast: 11, insect: 5.5, blob: 4, floater: 4, turret: 3 }[shape] || 4;
        eyes(g, e, look.eyes || '#ff5a3a', (shape === 'brute' ? 2.2 : 1.6) * s, fwd * s, (shape === 'insect' ? 0.8 : 1) * s);
      }
    };
    return { draw, drawGlow };
  };

  /** An object from parameters, for items (drawn in the item's own space). */
  ED.looks.object = function (look) {
    const c = look.color || '#7a5530';
    const trim = look.trim || U.shade(c, 0.3);
    const dark = U.shade(c, -0.5);
    const acc = look.accent || '#d9a32a';
    const sc = look.scale || 1;
    const shape = look.shape || 'box';
    const rect = (g, x, y, w, hh, col) => {
      g.fillStyle = col;
      g.fillRect(x, y, w, hh);
    };
    const circ = (g, x, y, r, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, U.TAU);
      g.fill();
    };
    const SHAPES = {
      box(g) {
        rect(g, -11, -11, 22, 22, dark); rect(g, -10, -10, 20, 20, c);
        g.strokeStyle = U.shade(c, -0.3); g.lineWidth = 2; g.strokeRect(-8, -8, 16, 16);
        rect(g, -10, -10, 20, 1.5, 'rgba(255,255,255,0.08)');
      },
      chest(g) {
        rect(g, -12, -8, 24, 16, dark); rect(g, -11, -7, 22, 14, c); rect(g, -11, -7, 22, 5, U.shade(c, 0.15));
        rect(g, -8, -7, 2, 14, trim); rect(g, 6, -7, 2, 14, trim); rect(g, -2, -2, 4, 4, acc);
      },
      orb(g) {
        rect(g, -6, 2, 12, 6, dark); rect(g, -5, 3, 10, 4, U.shade(c, -0.2));
        const grd = g.createRadialGradient(-2, -5, 1, 0, -3, 8);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.3, U.shade(acc, 0.3)); grd.addColorStop(1, U.shade(acc, -0.4));
        g.fillStyle = grd; g.beginPath(); g.arc(0, -3, 7, 0, U.TAU); g.fill();
      },
      pedestal(g) {
        rect(g, -11, -9, 22, 18, dark); rect(g, -10, -8, 20, 16, c); rect(g, -10, -8, 20, 1.4, trim);
        circ(g, 0, -1, 5, acc); circ(g, -1.5, -2.5, 1.6, 'rgba(255,255,255,0.5)');
      },
      altar(g) {
        rect(g, -14, -9, 28, 18, dark); rect(g, -13, -8, 26, 16, c); rect(g, -6, -8, 12, 16, acc);
        rect(g, -6, -8, 12, 1.2, trim); rect(g, -6, 6.8, 12, 1.2, trim);
      },
      crystal(g) {
        const shards = [[-4, 2, 4, 11, -0.3], [3, 3, 3.5, 9, 0.35], [0, 0, 5, 14, 0], [5, -1, 2.5, 7, 0.7]];
        for (const [x, y, w, hh, r] of shards) {
          g.save(); g.translate(x, y); g.rotate(r);
          const grd = g.createLinearGradient(-w, 0, w, 0);
          grd.addColorStop(0, U.shade(c, -0.4)); grd.addColorStop(0.5, U.shade(c, 0.3)); grd.addColorStop(1, U.shade(c, -0.2));
          g.fillStyle = grd; g.beginPath(); g.moveTo(0, -hh); g.lineTo(w, -hh * 0.6); g.lineTo(w * 0.8, 0); g.lineTo(-w * 0.8, 0); g.lineTo(-w, -hh * 0.6); g.closePath(); g.fill();
          g.restore();
        }
      },
      barrel(g) {
        circ(g, 0, 0, 9, dark); circ(g, 0, 0, 8, c);
        g.strokeStyle = acc; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 5.5, 0, U.TAU); g.stroke();
        circ(g, 0, 0, 2, dark);
      },
      bottle(g) {
        g.fillStyle = 'rgba(220,230,235,0.5)'; G.roundRect(g, -3.5, -5, 7, 10, 2); g.fill();
        g.fillStyle = c; G.roundRect(g, -2.8, -1.5, 5.6, 6, 1.5); g.fill();
        rect(g, -1.8, -7, 3.6, 2.4, trim);
      },
      coin(g) {
        const grd = g.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5);
        grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, c); grd.addColorStop(1, dark);
        g.fillStyle = grd; g.beginPath(); g.ellipse(0, 0, 5, 4.3, 0, 0, U.TAU); g.fill();
      },
      gem(g) {
        g.fillStyle = c; g.beginPath(); g.moveTo(0, -7); g.lineTo(6, -1.5); g.lineTo(0, 7); g.lineTo(-6, -1.5); g.closePath(); g.fill();
        g.fillStyle = U.shade(c, 0.4); g.beginPath(); g.moveTo(0, -7); g.lineTo(3, -1.5); g.lineTo(-3, -1.5); g.closePath(); g.fill();
      },
      scroll(g) {
        rect(g, -7, -5, 14, 10, '#e8dfc8');
        circ(g, -7, 0, 2.4, trim); circ(g, 7, 0, 2.4, trim);
        g.fillStyle = 'rgba(40,30,20,0.5)'; for (let i = 0; i < 3; i++) g.fillRect(-5, -3 + i * 2.4, 10, 0.6);
      },
      book(g) {
        rect(g, -8, -6, 16, 12, dark); rect(g, -7, -5, 6.6, 10, '#e8dfc8'); rect(g, 0.4, -5, 6.6, 10, '#e8dfc8');
        g.fillStyle = 'rgba(40,30,20,0.5)'; for (let i = 0; i < 4; i++) { g.fillRect(-6, -3.5 + i * 2, 4.5, 0.6); g.fillRect(1.4, -3.5 + i * 2, 4.5, 0.6); }
      },
      machine(g) {
        rect(g, -12, -12, 24, 22, dark); rect(g, -11, -11, 22, 20, c); rect(g, -8, -7, 16, 7, '#0c0e12');
        rect(g, -7, -6, 14, 5, U.rgba(acc, 0.35)); rect(g, -11, -11, 22, 2, trim); rect(g, -6, 3, 4, 3, acc); rect(g, 2, 2, 6, 5, U.shade(c, -0.3));
      },
      statue(g) {
        rect(g, -9, -2, 18, 10, dark); rect(g, -8, -1, 16, 8, U.shade(c, -0.15));
        circ(g, 0, -9, 3.2, c); rect(g, -3, -7, 6, 8, c); rect(g, -5, -5, 10, 2.4, U.shade(c, -0.1));
      },
      plant(g) {
        circ(g, 0, 0, 6, '#5a3a22'); circ(g, 0, 0, 4.8, '#2a1a10');
        g.fillStyle = c;
        for (let i = 0; i < 7; i++) { const a = (i / 7) * U.TAU; g.beginPath(); g.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 5, 2.2, a, 0, U.TAU); g.fill(); }
      },
      rune(g) {
        circ(g, 0, 0, 11, U.rgba(dark, 0.8));
        g.strokeStyle = acc; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 9, 0, U.TAU); g.stroke();
        g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; const x = Math.cos(a) * 7, y = Math.sin(a) * 7; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); g.stroke();
      },
      sign(g) {
        rect(g, -1, -2, 2, 10, '#3a2a1a'); rect(g, -10, -9, 20, 9, dark); rect(g, -9, -8, 18, 7, c);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-7, -6, 14, 0.8); g.fillRect(-7, -4, 10, 0.8);
      },
    };
    const paint = SHAPES[shape] || SHAPES.box;
    const out = {
      draw(g, it, t) {
        if (sc !== 1) g.scale(sc, sc);
        if (it && it.face && look.wall !== false && it.def && it.def.wallMounted) g.rotate(Math.atan2(it.face.y, it.face.x) - Math.PI / 2);
        paint(g, it, t);
      },
    };
    if (look.glow) {
      out.drawGlow = function (g, it, t) {
        const k = look.pulse === false ? 0.5 : 0.35 + 0.15 * Math.sin(t * (look.pulseRate || 2.5) + (it.t || 0));
        G.glow(g, 0, shape === 'orb' ? -3 * sc : 0, (look.glowSize || 16) * sc, look.glow, k);
      };
    }
    return out;
  };
  ED.looks.object.SHAPES = ['box', 'chest', 'orb', 'pedestal', 'altar', 'crystal', 'barrel', 'bottle', 'coin', 'gem', 'scroll', 'book', 'machine', 'statue', 'plant', 'rune', 'sign'];
  ED.looks.creature.SHAPES = ['humanoid', 'brute', 'beast', 'insect', 'blob', 'floater', 'turret'];
  ED.looks.creature.EXTRAS = ['gun', 'blade', 'staff', 'armor', 'shell', 'spikes', 'horns', 'tail', 'tentacles', 'wings', 'cloak'];

  // ================================================================ picture tiles
  // An environment can paint floors and walls with imported pictures:
  //   floor: { style: 'image', images: ['sprite-id', ...], tint, grout }   (one picked per tile, seeded)
  //   wall:  { style: 'image-wall', topImage: 'sprite-id', faceImage: 'sprite-id', ...the usual wall colours }
  // The usual colour keys stay in the palette: other tiles (pillars, doors) read them.
  const drawImg = (g, id, x, y, w, hh, fallback) => {
    const img = ED.image(id);
    if (img && img.complete && img.naturalWidth) g.drawImage(img, x, y, w, hh);
    else {
      g.fillStyle = fallback || '#555';
      g.fillRect(x, y, w, hh);
    }
  };
  LM.definePack({
    id: 'editor',
    name: 'Editor changes',
    version: String(ED.VERSION),
    textures: {
      image: {
        kind: 'floor',
        paint(g, x, y, info, p) {
          const list = p.images && p.images.length ? p.images : [p.image];
          const id = list[Math.floor(info.rnd() * list.length)];
          drawImg(g, id, x, y, T, T, (p.colors && p.colors[0]) || p.color || '#555');
          if (p.tint) {
            g.fillStyle = p.tint;
            g.fillRect(x, y, T, T);
          }
          if (p.grout) {
            g.fillStyle = p.grout;
            g.fillRect(x, y, T, 0.8);
            g.fillRect(x, y, 0.8, T);
          }
        },
      },
      'image-wall': {
        kind: 'wall',
        top(g, x, y, hh, info, p) {
          drawImg(g, p.topImage || p.image, x, y, T, hh, (Array.isArray(p.top) && p.top[0]) || '#555');
          if (p.tint) {
            g.fillStyle = p.tint;
            g.fillRect(x, y, T, hh);
          }
        },
        face(g, x, y, fh, info, p) {
          drawImg(g, p.faceImage || p.topImage || p.image, x, y, T, fh, typeof p.face === 'string' ? p.face : '#333');
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x, y, T, fh);
        },
      },
    },
  });
  // definePack above registered the 'editor' pack entry; ED.apply adds its own, so drop this one
  LM.packs = LM.packs.filter((p) => p.id !== 'editor');
})();
