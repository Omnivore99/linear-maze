/* Linear Maze Editor — js/dressings.js
 * Dressings: the furniture and fixtures placed over tiles (desks, tables,
 * counters, pillars, lamps, pictures on walls). The map editor's palette shows
 * them in their own tab, from every pack ("set") at once, so a floor can use
 * any set's furniture whatever its tile set.
 *
 * An item is a dressing unless it's a pickup, a chest, a key, trap hardware or
 * an invisible helper. Its definition can decide for itself:
 *   dressing: 'Furniture' | 'Walls' | 'Lights' | 'Decor' | true | false
 * (the item page's Basics tab sets this). Categories, when not given:
 *   Walls      hangs on a wall (wallMounted)
 *   Lights     gives off light and doesn't block
 *   Furniture  blocks movement
 *   Decor      everything else (rugs, papers, things on desks)
 */
'use strict';
(function () {
  const ED = window.ED;
  const M = () => ED.model, SC = () => ED.schemas;
  const D = (ED.dressings = {});

  D.CATS = ['Furniture', 'Walls', 'Lights', 'Decor'];
  /** Items that are never dressings unless their definition says so. */
  D.NOT = new Set(['gold', 'key', 'health-vial', 'medkit', 'weapon-pickup', 'armor-pickup', 'dart-emitter', 'beam-emitter', 'idol', 'paper-drift', 'cb-workday']);
  D.SET_NAMES = { core: 'Core', office: 'Office', memos: 'Memos', chessboard: 'Chessboard', apartment: 'Apartment', rotary: 'Rotary', library: 'Library', town: 'Town', dressings: 'Dressings', editor: 'Made in the editor' };

  /** 'Furniture' | 'Walls' | 'Lights' | 'Decor', or null if the item isn't a dressing. */
  D.category = function (id) {
    const d = M().raw('items', id);
    if (!d || d.dressing === false) return null;
    if (typeof d.dressing === 'string' && D.CATS.includes(d.dressing)) return d.dressing;
    if (d.dressing !== true) {
      if (D.NOT.has(id) || /^ammo-/.test(id)) return null;
      if (d.onTouch || d.touch || d.isChest) return null;
      if (!d.draw && !d.look) return null; // invisible helpers
    }
    if (d.wallMounted) return 'Walls';
    if (d.light && !d.solid) return 'Lights';
    if (d.solid) return 'Furniture';
    return 'Decor';
  };
  /** The pack ("set") an item comes from, as a name. */
  D.setOf = function (id) {
    const d = M().raw('items', id) || {};
    return D.SET_NAMES[d.pack] || ED.titleCase(String(d.pack || 'other'));
  };
  D.interactive = function (id) {
    const d = M().raw('items', id) || {};
    return !!(d.interact || d.abilities || d.readable || d.slots);
  };
  const turnCache = new Map();
  /** Does this dressing turn to face a direction (it reads props.dir)? */
  D.turns = function (id) {
    const d = M().raw('items', id);
    if (!d || d.wallMounted) return false;
    const key = id + ':' + (M().status('items', id) || 'base');
    if (!turnCache.has(key)) {
      let t = !!(d.props && d.props.dir);
      try {
        t = t || SC().discoverProps(d).some((p) => p.key === 'dir');
        // the office pieces turn through shared helpers (rot(it), setBox) that read props.dir
        if (!t) t = Object.values(d).some((v) => typeof v === 'function' && /\brot\(it\)|setBox\(it/.test(ED.fnSource(v)));
      } catch (e) {}
      turnCache.set(key, t);
    }
    return turnCache.get(key);
  };
  /** Every dressing: [{ id, name, cat, set, interactive, turns }], sorted by name. */
  D.list = function () {
    const out = [];
    for (const id of M().ids('items')) {
      const cat = D.category(id);
      if (!cat) continue;
      out.push({ id, name: M().name('items', id), cat, set: D.setOf(id), interactive: D.interactive(id), turns: D.turns(id) });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  };
})();
