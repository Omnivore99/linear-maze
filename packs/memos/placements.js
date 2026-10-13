/* The Linear Maze — packs/memos/placements.js
 * Memos pack, part 5: where everything goes.
 *
 * Rather than editing another pack's level map, this pack adds its things
 * when a floor loads. Each floor gets a list of placements in tile
 * coordinates (the same coordinates as the level's map):
 *
 *   [kind, id, x, y, face, props]
 *     kind  'poster' | 'notice' | 'board' | 'camera' | 'item'
 *     id    poster / notice / board id from content.js, or an item id for 'item'
 *     face  which side of the wall tile it hangs on: 'n' 'e' 's' 'w'
 *           (for 'camera', props.corner 'l' or 'r' tucks it toward one end)
 *
 * Desk toys are scattered automatically over ordinary desks on the floors
 * listed in MEMOS.deskToyFloors (about three desks in ten get one). On a floor
 * with `honest: true`, owners get their own toy (MEMOS.toyOwners).
 *
 * To check a placement list against a map, run: node tools/memos/check-placements.mjs
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const MEMOS = LM.MEMOS;

  MEMOS.placements = MEMOS.placements || {};
  MEMOS.placements['meridian-fourteen'] = [
    // ---- motivational posters
    ['poster', 'teamwork', 41, 15, 'e'],
    ['poster', 'synergy', 63, 8, 'w'],
    ['poster', 'perseverance', 37, 19, 'e'],
    ['poster', 'excellence', 87, 22, 'w'],
    ['poster', 'growth', 49, 12, 's'],
    ['poster', 'focus', 75, 2, 'w'],
    ['poster', 'leadership', 87, 3, 'w'],
    ['poster', 'integrity', 59, 31, 's'],
    ['poster', 'innovation', 91, 4, 'w'],
    ['poster', 'opportunity', 37, 33, 'e'],
    ['poster', 'communication', 81, 31, 's'],
    ['poster', 'achievement', 87, 38, 'w'],
    ['poster', 'balance', 41, 44, 'e'],
    ['poster', 'vision', 91, 15, 'w'],
    // ---- notices on the walls
    ['notice', 'parking', 61, 47, 'n'],
    ['notice', 'punctuality', 75, 47, 'n'],
    ['notice', 'harassment', 41, 24, 'e'],
    ['notice', 'cyber', 87, 14, 'w'],
    ['notice', 'devices', 41, 33, 'e'],
    // ---- the message board in the break area
    ['board', 'cantina', 51, 31, 's', { w: 3, title: 'Message board', kicker: 'The Cantina' }],
    // ---- security cameras in the corners
    ['camera', null, 41, 13, 'e', { corner: 'l' }],
    ['camera', null, 87, 11, 'w', { corner: 'l' }],
    ['camera', null, 41, 30, 'e', { corner: 'r' }],
    ['camera', null, 87, 30, 'w', { corner: 'r' }],
    ['camera', null, 57, 32, 'e', { corner: 'l' }],
    ['camera', null, 87, 32, 'w', { corner: 'l' }],
    ['camera', null, 41, 32, 'e', { corner: 'l' }],
    ['camera', null, 37, 1, 'e', { corner: 'l' }],
    ['camera', null, 91, 1, 'w', { corner: 'l' }],
    // ---- Alice's old desk is the one beside yours (workstation 14-113)
    ['item', 'alice-desk', 61, 22, null, { dir: 's' }],
  ];
  MEMOS.deskToyFloors = { 'meridian-fourteen': true };
  // desks that never get a random toy (Alice's is already full)
  MEMOS.noToy = { 'meridian-fourteen': ['61,22'] };

  // ------------------------------------------------------------ spawning
  const ITEM_FOR = { poster: 'memo-poster', notice: 'memo-notice', board: 'memo-board', camera: 'memo-camera' };
  const PROP_FOR = { poster: 'poster', notice: 'notice', board: 'board' };
  MEMOS.place = function (game, list) {
    for (const [kind, id, x, y, face, extra] of list) {
      const itemId = ITEM_FOR[kind] || id;
      const props = Object.assign({}, extra || {});
      if (face) props.face = face;
      if (PROP_FOR[kind]) props[PROP_FOR[kind]] = id;
      const L = game.level;
      if (!L.inBounds(x, y)) {
        console.warn('[memos] placement out of bounds', kind, id, x, y);
        continue;
      }
      game.spawnItem(itemId, x, y, props, extra && extra.tag);
    }
  };

  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  /** Where a toy sits on a desk: the free left-hand corner of the desktop, turned with the desk. */
  function onDesk(desk, lx, ly) {
    const r = ROT[desk.props.dir || 's'] || 0;
    return { x: lx * Math.cos(r) - ly * Math.sin(r), y: lx * Math.sin(r) + ly * Math.cos(r) };
  }
  MEMOS.scatterDeskToys = function (game) {
    const hon = MEMOS.honest(game);
    const skip = new Set((MEMOS.noToy[game.levelId] || []));
    const desks = game.items.filter((i) => i.def.id === 'desk' && !i.props.askew && !i.props.tilt && !skip.has(i.tx + ',' + i.ty));
    const owned = new Map();
    if (hon) {
      // each owner's toy goes on the desk nearest to them
      for (const n of game.npcs) {
        const toy = MEMOS.toyOwners[n.name];
        if (!toy) continue;
        let best = null, bd = 60;
        for (const d of desks) {
          const dd = U.dist(d.x, d.y, n.home.x, n.home.y);
          if (dd < bd && !owned.has(d)) {
            bd = dd;
            best = d;
          }
        }
        if (best) owned.set(best, { toy, owner: n.name.split(' ')[0] });
      }
    }
    const pool = hon ? MEMOS.honestToyPool : MEMOS.toyPool;
    for (const d of desks) {
      const mine = owned.get(d);
      if (!mine && U.hash2(d.tx, d.ty, hon ? 91 : 37) > 0.3) continue;
      const toy = mine ? mine.toy : pool[U.strHash(game.levelId + ':' + d.tx + ',' + d.ty) % pool.length];
      const off = onDesk(d, -11, -7);
      game.spawnItem('desk-toy', d.tx, d.ty, { toy, ox: off.x, oy: off.y, owner: mine && mine.owner, rot: U.hash2(d.tx, d.ty, 7) * 0.6 - 0.3 });
    }
  };

  LM.on('levelLoaded', (game) => {
    const list = MEMOS.placements[game.levelId];
    if (list) MEMOS.place(game, list);
    if (MEMOS.deskToyFloors[game.levelId]) MEMOS.scatterDeskToys(game);
  });
})();
