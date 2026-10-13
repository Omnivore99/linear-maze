/* The Linear Maze — packs/library/environment.js
 * Library pack, part 1: how the Library Maze looks.
 *
 * Every wall is a bookcase: from above you see the top board and the tops of
 * the books along any side that faces a corridor; the front face shows spines.
 *
 * Environment 'library'
 *   floor variant 0 reading-room carpet   1 stacks (wood)   2 marble (the atrium)
 * Terrain
 *   lib-pillar     a marble pillar on a tile
 *   lib-exit-7f    the way out: a door marked 7F, from the inside (an exit)
 * Texture 'bookcase' (a wall painter): palette { top, edge, face, board, books: [colors] }
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  const BOOKS = ['#7a2a2a', '#2a4a6a', '#c9a046', '#2a5a3a', '#d8d0bc', '#5a3a6a', '#1c1d22', '#8a5a2a', '#3a6a7a', '#9a3a4a'];
  const pickc = (arr, r) => arr[Math.floor(r() * arr.length)];

  const textures = {
    bookcase: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        // the grain of the top board
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = 0; i < 4; i++) g.fillRect(x, y + 3 + i * (h / 4) + r() * 2, T, 0.6);
        // book tops along every side that faces open floor
        const open = (dx, dy) => !info.n(dx, dy).tall;
        const books = p.books || BOOKS;
        const strip = (horizontal, sx, sy, len) => {
          let k = 0;
          while (k < len - 1) {
            const w = 1.4 + r() * 2.4, d = 4 + r() * 2.5;
            g.fillStyle = pickc(books, r);
            if (horizontal) g.fillRect(sx + k, sy(d), Math.min(w, len - k), d);
            else g.fillRect(sy(d), sx + k, d, Math.min(w, len - k));
            k += w + 0.35;
          }
        };
        if (open(0, -1)) strip(true, x + 1, () => y + 1.5, T - 2);
        if (open(0, 1) && h > 12) strip(true, x + 1, (d) => y + h - d - 1, T - 2);
        if (open(-1, 0)) strip(false, y + 1, () => x + 1.5, h - 2);
        if (open(1, 0)) strip(false, y + 1, (d) => x + T - d - 1.5, h - 2);
      },
      face(g, x, y, fh, info, p) {
        const r = info.rnd;
        g.fillStyle = p.board || '#3a2416';
        g.fillRect(x, y, T, fh);
        // spines on the shelf
        let k = 0;
        while (k < T - 1) {
          const w = 1.6 + r() * 2.2;
          g.fillStyle = pickc(p.books || BOOKS, r);
          g.fillRect(x + k, y + 0.8 + r() * 1.5, Math.min(w, T - k), fh - 2.6);
          g.fillStyle = 'rgba(255,230,160,0.25)';
          if (r() < 0.4) g.fillRect(x + k + 0.4, y + 3, Math.min(w, T - k) - 0.8, 0.6);
          k += w + 0.3;
        }
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y + fh - 1.6, T, 1.6);
      },
    },
  };

  const environments = {
    library: {
      name: 'The Library Maze',
      voidColor: '#070605',
      ambient: '#3a3028',
      attractAmbient: '#5a4c3e',
      outsideSight: '#3a342c',
      playerLight: '#fff0d8',
      torch: '#ffc070',
      floors: {
        0: { style: 'carpet', base: '#4a1e24', pattern: '#5c2830', border: '#c9a046' },
        1: { style: 'planks', colors: ['#6a4a2c', '#634428', '#704e30'], grain: '#3a2412', gap: '#2a180a' },
        2: { style: 'marble', base: ['#a29c92', '#9a948a', '#a8a298', '#928c82'], vein: '#6a645a', inlay: '#c9a046' },
      },
      floor: { style: 'planks', colors: ['#6a4a2c', '#634428', '#704e30'], grain: '#3a2412', gap: '#2a180a' },
      wall: { style: 'bookcase', top: ['#4a3020'], edge: '#7a5a3a', face: '#3a2416', faceDark: '#1a0e06', board: '#3a2416', trim: '#c9a046', books: BOOKS },
      water: { deep: '#18242a', shallow: '#2c4048', foam: '#a8c4cc' },
      pit: { core: '#030202', wall: '#1d1612', rim: '#3a2c22' },
      door: { panel: '#5a3a22', frame: '#2a1a0e', trim: '#c9a046' },
      particles: { type: 'mote', color: '#f0e0c0', rate: 10, alpha: 0.35, drift: 4 },
      ambience: { base: 47, cutoff: 240, wind: 520, gain: 0.04, wave: 'triangle' },
    },
  };
  // the lower floor: older, colder, darker
  environments['library-lower'] = Object.assign({}, environments.library, {
    name: 'The Library Maze (lower stacks)',
    ambient: '#2c2a30',
    outsideSight: '#2e2c32',
    floors: {
      0: { style: 'carpet', base: '#24283a', pattern: '#2e3448', border: '#9a8a5a' },
      1: { style: 'planks', colors: ['#4a3a2c', '#443528', '#504030'], grain: '#2a1e12', gap: '#1a120a' },
      2: { style: 'marble', base: ['#7a7672', '#72706c', '#807c78', '#6c6864'], vein: '#4a4844', inlay: '#9a8a5a' },
    },
    wall: Object.assign({}, environments.library.wall, { top: ['#3a2a20'], edge: '#5a4a3a' }),
    particles: { type: 'mote', color: '#c8d0e0', rate: 12, alpha: 0.3, drift: 3 },
    ambience: { base: 41, cutoff: 200, wind: 420, gain: 0.05, wave: 'triangle' },
  });

  const MARBLE = { top: ['#b8b2a6'], edge: '#ece4d4', trim: '#c9a046' };
  const terrain = {
    'lib-pillar': {
      solid: true, shape: 'circle', radius: 10.5, blocksShots: true, blocksLight: true, layer: 1, mapColor: '#b8b2a6',
      bake(g, x, y, info) {
        LM.get('terrain', 'pillar').bake(g, x, y, Object.assign({}, info, { env: Object.assign({}, info.env, { wall: MARBLE }) }));
      },
    },
    'lib-exit-7f': {
      // the way home: the back of a door marked 7F
      floorLike: true, exit: true, mapColor: '#e0b25a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = '#2a1a0e';
        g.fillRect(x + 3, y + 1, T - 6, T - 4);
        g.fillStyle = '#a07850';
        g.fillRect(x + 5, y + 3, T - 10, T - 8);
        g.fillStyle = '#8a6440';
        g.fillRect(x + 7, y + 6, 8, 16);
        g.fillRect(x + 17, y + 6, 8, 16);
        g.fillStyle = '#e0b858';
        g.beginPath();
        g.arc(x + T - 9, y + 16, 1.6, 0, U.TAU);
        g.fill();
        g.fillRect(x + 12, y + 3.5, 8, 3.4);
        g.fillStyle = '#3a2410';
        g.font = '700 3px sans-serif';
        g.textAlign = 'center';
        g.fillText('F7', x + 16, y + 6.3); // backwards, from this side
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        LM.gfx.glow(g, x + T / 2, y + T / 2, 30, '#ffd890', 0.25 + 0.1 * Math.sin(t * 2.2));
        // light under the door
        g.fillStyle = 'rgba(255,220,150,' + (0.5 + 0.2 * Math.sin(t * 3)) + ')';
        g.fillRect(x + 5, y + T - 4, T - 10, 1.2);
      },
    },
  };

  LM.definePack({ id: 'library', name: 'Library', version: '0.1.0', textures, environments, terrain });
})();
