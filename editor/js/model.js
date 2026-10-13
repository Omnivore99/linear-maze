/* Linear Maze Editor — js/model.js
 * The edit set and everything that reads or changes it.
 *
 *   E.add[kind][id]     new content; { $extends: 'id', ...changes } for a copy
 *   E.patch[kind][id]   only the fields that differ from the original
 *   E.remove[kind]      ids taken out of the game
 *   E.levelOrder        the floor sequence
 *   E.player            { base: stats, start: kit, ammoMax }
 *   E.knobs[path]       pack settings
 *
 * The originals (ED.engine.base) never change. raw(kind, id) is the original with the
 * edits merged in; get(kind, id) is that, built (looks and abilities turned into
 * functions) and is what previews and the map draw with. Every change goes through
 * change(), which keeps undo history and copies the result into the engine frame.
 */
'use strict';
(function () {
  const ED = window.ED;
  const M = (ED.model = {});
  const X = () => ED.engine.X;
  let E = null;
  const raws = new Map(), builts = new Map();
  M.undoStack = [];
  M.redoStack = [];
  M.sprites = {};

  const empty = () => ({ add: {}, patch: {}, remove: {}, levelOrder: null, player: null, knobs: {} });
  M.init = function (saved, sprites) {
    E = empty();
    if (saved) {
      for (const k of ['add', 'patch', 'knobs']) if (saved[k]) E[k] = saved[k];
      if (saved.remove) E.remove = saved.remove;
      if (saved.levelOrder) E.levelOrder = saved.levelOrder;
      if (saved.player) E.player = saved.player;
      // anything else a hand edit put in the file is carried through untouched
      for (const k of Object.keys(saved)) if (!(k in E) && !['format', 'savedAt'].includes(k)) E[k] = saved[k];
    }
    // functions captured from the saved file keep their source for re-saving
    markSources(E);
    M.sprites = Object.assign({}, sprites || {});
    raws.clear();
    builts.clear();
    M.undoStack = [];
    M.redoStack = [];
    syncAll();
    M.savedKey = M.key();
    ED.emit('change', { all: true });
  };
  function markSources(v) {
    if (typeof v === 'function') {
      if (!v.__src) v.__src = Function.prototype.toString.call(v);
      return;
    }
    if (Array.isArray(v)) v.forEach(markSources);
    else if (ED.isPlain(v)) Object.values(v).forEach(markSources);
  }
  M.edits = () => E;
  M.key = () => ED.ser.js(E) + '|' + Object.keys(M.sprites).map((k) => k + ':' + M.sprites[k].length).join(',');
  M.isDirty = () => !!E && M.key() !== M.savedKey;
  M.markSaved = () => (M.savedKey = M.key());

  // ------------------------------------------------------------ reading
  M.base = (kind, id) => ED.engine.base[kind] && ED.engine.base[kind][id];
  M.isAdded = (kind, id) => !!(E.add[kind] && E.add[kind][id]);
  M.isPatched = (kind, id) => !!(E.patch[kind] && E.patch[kind][id]);
  M.isRemoved = (kind, id) => !!(E.remove[kind] && E.remove[kind].includes(id));
  M.status = (kind, id) => (M.isRemoved(kind, id) ? 'removed' : M.isAdded(kind, id) ? 'added' : M.isPatched(kind, id) ? 'changed' : '');
  M.exists = (kind, id) => !!(M.base(kind, id) || M.isAdded(kind, id));
  /** Ids in the game after edits (removed ones only with includeRemoved). */
  M.ids = function (kind, includeRemoved) {
    const base = Object.keys(ED.engine.base[kind] || {});
    const added = Object.keys(E.add[kind] || {}).filter((id) => !base.includes(id));
    return base.concat(added).filter((id) => includeRemoved || !M.isRemoved(kind, id));
  };
  /** The definition with edits merged in, before data fields become functions. */
  M.raw = function (kind, id) {
    const k = kind + '\u0000' + id;
    if (raws.has(k)) return raws.get(k);
    let v;
    if (M.isAdded(kind, id)) {
      v = X().resolveAdd(kind, E.add[kind][id], (kd, i) => M.base(kd, i));
      v.id = id;
      v.pack = 'editor';
    } else if (M.isPatched(kind, id)) {
      v = X().merge(X().clone(M.base(kind, id)), E.patch[kind][id]);
      v.id = id;
    } else v = M.base(kind, id);
    raws.set(k, v);
    return v;
  };
  /** The definition the game will use. */
  M.get = function (kind, id) {
    const k = kind + '\u0000' + id;
    if (builts.has(k)) return builts.get(k);
    const raw = M.raw(kind, id);
    let v = raw;
    if (raw && (M.isAdded(kind, id) || M.isPatched(kind, id))) {
      try {
        v = X().build(kind, X().clone(raw));
      } catch (e) {
        console.warn('build failed for', kind, id, e);
        v = X().clone(raw);
      }
    }
    builts.set(k, v);
    return v;
  };
  /** A copy to edit. Pass it to commit() when done. */
  M.draft = (kind, id) => ED.clone(M.raw(kind, id));
  M.name = function (kind, id) {
    const d = M.exists(kind, id) ? M.raw(kind, id) : null;
    return (d && (d.name || d.title)) || ED.titleCase(id);
  };

  // ------------------------------------------------------------ differences
  /** The patch that turns a into b. Plain objects recurse; anything else is replaced.
   *  replaceAt(path) says where a changed object must be written whole ($replace). */
  M.diff = function diff(a, b, path, replaceAt) {
    path = path || [];
    const p = {};
    for (const k of Object.keys(b)) {
      if (b[k] === undefined || (path.length === 0 && (k === 'id' || k === 'pack'))) continue;
      if (!a || !(k in a) || a[k] === undefined) {
        p[k] = b[k];
        continue;
      }
      if (ED.equal(a[k], b[k])) continue;
      const sub = path.concat(k);
      if (ED.isPlain(a[k]) && ED.isPlain(b[k])) {
        if (replaceAt && replaceAt(sub)) p[k] = Object.assign({ $replace: true }, b[k]);
        else {
          const d = diff(a[k], b[k], sub, replaceAt);
          if (Object.keys(d).length) p[k] = d;
        }
      } else p[k] = b[k];
    }
    if (a) for (const k of Object.keys(a)) if (a[k] !== undefined && (!(k in b) || b[k] === undefined) && !(path.length === 0 && (k === 'id' || k === 'pack'))) p[k] = '$unset';
    return p;
  };
  const levelReplace = (path) => path.length === 2 && (path[0] === 'legend' || path[0] === 'objectLegend');
  M.replaceRule = (kind) => (kind === 'levels' ? levelReplace : null);

  // ------------------------------------------------------------ changing
  const snap = () => ({ E: ED.clone(E), sprites: Object.assign({}, M.sprites) });
  /** Run fn(E) as one undoable step. touched: [[kind, id], ...] to refresh (default: everything). */
  M.change = function (label, fn, touched) {
    M.undoStack.push(Object.assign(snap(), { label }));
    if (M.undoStack.length > 120) M.undoStack.shift();
    M.redoStack = [];
    fn(E);
    afterChange(touched);
  };
  function afterChange(touched) {
    if (touched) for (const [kind, id] of touched) forget(kind, id);
    else {
      raws.clear();
      builts.clear();
    }
    if (touched) for (const [kind, id] of touched) syncOne(kind, id);
    else syncAll();
    ED.emit('change', { touched, all: !touched });
  }
  function forget(kind, id) {
    const k = kind + '\u0000' + id;
    raws.delete(k);
    builts.delete(k);
  }
  M.undo = function () {
    const s = M.undoStack.pop();
    if (!s) return;
    M.redoStack.push(Object.assign(snap(), { label: s.label }));
    E = s.E;
    M.sprites = s.sprites;
    syncSprites();
    afterChange(null);
    return s.label;
  };
  M.redo = function () {
    const s = M.redoStack.pop();
    if (!s) return;
    M.undoStack.push(Object.assign(snap(), { label: s.label }));
    E = s.E;
    M.sprites = s.sprites;
    syncSprites();
    afterChange(null);
    return s.label;
  };

  /** Save a draft back: works out the add entry or the patch. */
  M.commit = function (kind, id, draft, label) {
    M.change(label || 'Edit ' + M.name(kind, id), (E) => {
      if (M.isAdded(kind, id)) {
        const cur = E.add[kind][id];
        const clean = Object.assign({}, draft);
        delete clean.id;
        delete clean.pack;
        if (cur.$extends && M.base(kind, cur.$extends)) {
          E.add[kind][id] = Object.assign({ $extends: cur.$extends }, M.diff(M.base(kind, cur.$extends), clean, [], M.replaceRule(kind)));
        } else E.add[kind][id] = clean;
      } else {
        const p = M.diff(M.base(kind, id), draft, [], M.replaceRule(kind));
        E.patch[kind] = E.patch[kind] || {};
        if (Object.keys(p).length) E.patch[kind][id] = p;
        else delete E.patch[kind][id];
        if (!Object.keys(E.patch[kind]).length) delete E.patch[kind];
      }
    }, [[kind, id]]);
  };
  /** Change a draft in place with fn(draft), then commit. */
  M.update = function (kind, id, fn, label) {
    const d = M.draft(kind, id);
    fn(d);
    M.commit(kind, id, d, label);
  };
  M.create = function (kind, id, def, label) {
    M.change(label || 'New ' + id, (E) => {
      E.add[kind] = E.add[kind] || {};
      const clean = Object.assign({}, def);
      delete clean.id;
      delete clean.pack;
      E.add[kind][id] = clean;
      if (E.remove[kind]) E.remove[kind] = E.remove[kind].filter((x) => x !== id);
      if (kind === 'levels') {
        const order = M.levelOrder();
        if (!order.includes(id)) E.levelOrder = order.concat(id);
      }
    }, [[kind, id]]);
  };
  /** A copy of an existing thing under a new id. Copies of originals keep their code by reference ($extends). */
  M.duplicate = function (kind, srcId, newId, overrides) {
    let entry;
    if (M.isAdded(kind, srcId)) {
      const src = E.add[kind][srcId];
      entry = src.$extends ? ED.clone(src) : ED.clone(M.raw(kind, srcId));
    } else entry = Object.assign({ $extends: srcId }, ED.clone((E.patch[kind] || {})[srcId] || {}));
    delete entry.id;
    delete entry.pack;
    Object.assign(entry, overrides || {});
    M.change('Copy ' + M.name(kind, srcId), (E) => {
      E.add[kind] = E.add[kind] || {};
      E.add[kind][newId] = entry;
      if (kind === 'levels') {
        const order = M.levelOrder();
        const at = order.indexOf(srcId);
        if (!order.includes(newId)) {
          order.splice(at < 0 ? order.length : at + 1, 0, newId);
          E.levelOrder = order;
        }
      }
    }, [[kind, newId]]);
  };
  M.remove = function (kind, id) {
    M.change('Delete ' + M.name(kind, id), (E) => {
      if (M.isAdded(kind, id) && !M.base(kind, id)) delete E.add[kind][id];
      else {
        E.remove[kind] = E.remove[kind] || [];
        if (!E.remove[kind].includes(id)) E.remove[kind].push(id);
      }
      if (kind === 'levels' && E.levelOrder) E.levelOrder = E.levelOrder.filter((x) => x !== id);
    }, [[kind, id]]);
  };
  M.restore = function (kind, id) {
    M.change('Restore ' + M.name(kind, id), (E) => {
      if (E.remove[kind]) E.remove[kind] = E.remove[kind].filter((x) => x !== id);
      if (!E.remove[kind] || !E.remove[kind].length) delete E.remove[kind];
      if (kind === 'levels' && E.levelOrder && !E.levelOrder.includes(id)) E.levelOrder.push(id);
    }, [[kind, id]]);
  };
  M.revert = function (kind, id) {
    M.change('Undo changes to ' + M.name(kind, id), (E) => {
      if (E.patch[kind]) delete E.patch[kind][id];
      if (E.patch[kind] && !Object.keys(E.patch[kind]).length) delete E.patch[kind];
    }, [[kind, id]]);
  };

  // ------------------------------------------------------------ floors
  M.levelOrder = function () {
    const ids = M.ids('levels');
    if (E.levelOrder) {
      const list = E.levelOrder.filter((id) => ids.includes(id));
      for (const id of ids) if (!list.includes(id)) list.push(id);
      return list;
    }
    return ids.slice().sort((a, b) => (M.raw('levels', a).order || 0) - (M.raw('levels', b).order || 0));
  };
  M.setLevelOrder = function (ids) {
    M.change('Reorder floors', (E) => {
      E.levelOrder = ids.slice();
      if (ED.equal(E.levelOrder, ED.engine.baseLevelOrder)) E.levelOrder = null;
    }, []);
  };
  /** 'Floor 2' or the level's own label, as the game will show it. */
  M.floorLabel = function (id) {
    const order = M.levelOrder();
    const d = M.raw('levels', id);
    if (d.floorLabel) return d.floorLabel;
    const numbered = order.filter((l) => !M.raw('levels', l).floorLabel);
    return 'Floor ' + (numbered.indexOf(id) + 1);
  };

  // ------------------------------------------------------------ player
  M.player = function () {
    const p = E.player || {};
    return {
      base: Object.assign({}, ED.engine.basePlayer, p.base || {}),
      start: Object.assign({}, p.start || {}),
      ammoMax: Object.assign({}, ED.engine.baseAmmoMax, p.ammoMax || {}),
    };
  };
  M.setPlayer = function (next) {
    M.change('Edit the player', (E) => {
      const out = {};
      const b = {};
      for (const [k, v] of Object.entries(next.base || {})) if (ED.engine.basePlayer[k] !== v) b[k] = v;
      if (Object.keys(b).length) out.base = b;
      const a = {};
      for (const [k, v] of Object.entries(next.ammoMax || {})) if (ED.engine.baseAmmoMax[k] !== v) a[k] = v;
      if (Object.keys(a).length) out.ammoMax = a;
      const s = {};
      for (const [k, v] of Object.entries(next.start || {})) if (v != null && !(Array.isArray(v) && !v.length && k !== 'weapons')) s[k] = v;
      if (Object.keys(s).length) out.start = s;
      E.player = Object.keys(out).length ? out : null;
    }, []);
  };

  // ------------------------------------------------------------ pack settings
  M.knobPaths = () => Object.keys(ED.engine.knobs);
  M.knob = function (path) {
    const base = ED.engine.knobs[path];
    const ed = E.knobs[path];
    if (ed === undefined) return ED.clone(base);
    if (ED.isPlain(base) && ED.isPlain(ed)) return X().merge(X().clone(base), ed);
    return ED.clone(ed);
  };
  M.setKnob = function (path, value) {
    M.change('Edit ' + path, (E) => {
      const base = ED.engine.knobs[path];
      if (ED.equal(base, value)) delete E.knobs[path];
      else if (ED.isPlain(base) && ED.isPlain(value)) E.knobs[path] = M.diff(base, value);
      else E.knobs[path] = ED.clone(value);
    }, []);
  };

  // ------------------------------------------------------------ pictures
  M.setSprite = function (id, dataURL, label) {
    M.change(label || 'Picture ' + id, () => {
      if (dataURL) M.sprites[id] = dataURL;
      else delete M.sprites[id];
    }, []);
    syncSprites();
  };
  M.spriteIds = () => Object.keys(M.sprites);
  function syncSprites() {
    const X0 = X();
    for (const k of Object.keys(X0.sprites)) if (!(k in M.sprites)) delete X0.sprites[k];
    for (const [k, v] of Object.entries(M.sprites)) {
      if (X0.sprites[k] !== v) X0.forgetImage(k);
      X0.sprites[k] = v;
    }
  }

  // ------------------------------------------------------------ keep the engine frame in step
  function syncOne(kind, id) {
    const reg = ED.engine.LM.registry[kind];
    if (!reg) return;
    if (M.isRemoved(kind, id) || !M.exists(kind, id)) delete reg[id];
    else reg[id] = M.get(kind, id);
  }
  function syncAll() {
    const LM = ED.engine.LM;
    syncSprites();
    for (const kind of LM.KINDS) {
      const reg = LM.registry[kind];
      for (const id of Object.keys(reg)) if (!M.exists(kind, id)) delete reg[id];
      for (const id of M.ids(kind, true)) syncOne(kind, id);
    }
  }
  M.resync = syncAll;

  // ------------------------------------------------------------ where things are used
  /** Levels (and how many times) that place an item / enemy / npc id. */
  M.usage = function (kind, id) {
    const key = { items: 'item', enemies: 'enemy', npcs: 'npc' }[kind];
    if (!key) return [];
    const out = [];
    const reg = ED.engine.LM.registry.legend;
    for (const lid of M.levelOrder()) {
      const L = M.raw('levels', lid);
      if (!L) continue;
      let n = 0;
      const legend = Object.assign({}, reg, L.legend || {});
      const chars = new Set();
      for (const [ch, e] of Object.entries(legend)) if (e && typeof e === 'object' && e[key] === id) chars.add(ch);
      for (const row of L.map || []) for (const ch of row) if (chars.has(ch)) n++;
      const ol = L.objectLegend || {};
      const ochars = new Set();
      for (const [ch, e] of Object.entries(ol)) {
        if (!e) continue;
        if (typeof e === 'string' ? e === id : e[key] === id) ochars.add(ch);
      }
      for (const row of L.objects || []) for (const ch of row) if (ochars.has(ch)) n++;
      if (n) out.push({ level: lid, count: n });
    }
    return out;
  };
})();
