/* The Linear Maze — packs/town/environment.js
 * Town pack, part 1: how the town and the Maze of Forking Paths look.
 *
 * Environments
 *   town-coffee      the coffee shop: 0 wood, 1 checker tile, 2 restroom tile, 3 lounge carpet
 *   town-books       the Book Nook:   0 old wood, 1 carpet, 2 restroom tile, 3 back-room concrete
 *   town-books-cb2   the Book Nook on Chessboard 2: the same, dark and decayed
 *   town-shop        any small place: 0 wood, 1 blue carpet, 2 white tile, 3 terrazzo, 4 red carpet,
 *                    5 checker tile, 6 asphalt, 7 garage concrete
 *   town-park        Forking Paths Park: 0 grass, 1 gravel path, 2 rubber play surface, 3 paving;
 *                    walls are hedges
 *   maze-sandstone   the Maze of Forking Paths: 0 sand flagstones, 1 catacomb stone, 2 temple paving;
 *                    walls are engraved sandstone
 *   town-map         the town map (drawn by packs/town/map.js; the floor underneath is never seen)
 * Textures: grass (floor), hedge (wall), sandstone (wall)
 * Terrain: hedge-wall, door-stone (needs the Stone Key), sphinx-gate (opens when the riddle is
 *          answered), red-tile (a floor tile with a red square: steps on it trigger a spike wall)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const pick = (arr, r) => arr[Math.floor(r() * arr.length)];

  const textures = {
    grass: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 26; i++) {
          g.fillStyle = pick(p.blades, r);
          const bx = x + r() * T, by = y + r() * T;
          g.fillRect(bx, by, 1, 2 + r() * 2);
        }
        if (r() < 0.12) {
          g.fillStyle = pick(p.flowers || ['#f4e870'], r);
          g.beginPath();
          g.arc(x + 4 + r() * 24, y + 4 + r() * 24, 1.2, 0, U.TAU);
          g.fill();
        }
      },
    },
    hedge: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        for (let i = 0; i < 18; i++) {
          g.fillStyle = pick(p.leaves, r);
          g.beginPath();
          g.arc(x + r() * T, y + r() * h, 2.5 + r() * 3, 0, U.TAU);
          g.fill();
        }
      },
      face(g, x, y, fh, info, p) {
        const r = info.rnd;
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 8; i++) g.fillRect(x + r() * T, y + r() * fh, 3, 2);
        g.fillStyle = p.base;
        g.fillRect(x, y + fh - 2, T, 2);
      },
    },
    sandstone: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.joint;
        g.fillRect(x, y, T, h);
        const c = pick(p.top, r);
        g.fillStyle = c;
        g.fillRect(x + 0.5, y + 0.5, T - 1, h / 2 - 1);
        g.fillStyle = U.shade(c, -0.05);
        g.fillRect(x + 0.5, y + h / 2 + 0.5, T - 1, h / 2 - 1);
        // engravings: little glyphs cut into the stone
        g.strokeStyle = p.glyph;
        g.lineWidth = 0.8;
        for (let i = 0; i < 2; i++) {
          const gx = x + 5 + r() * 18, gy = y + 3 + r() * (h - 9), k = Math.floor(r() * 5);
          g.beginPath();
          if (k === 0) { g.arc(gx + 3, gy + 3, 2.5, 0, U.TAU); g.moveTo(gx + 3, gy + 5.5); g.lineTo(gx + 3, gy + 9); }
          else if (k === 1) { g.moveTo(gx, gy + 6); g.lineTo(gx + 3, gy); g.lineTo(gx + 6, gy + 6); }
          else if (k === 2) { g.moveTo(gx, gy + 3); g.quadraticCurveTo(gx + 3, gy - 1, gx + 6, gy + 3); g.lineTo(gx + 6, gy + 7); }
          else if (k === 3) { g.rect(gx, gy, 5, 5); g.moveTo(gx + 2.5, gy); g.lineTo(gx + 2.5, gy + 5); }
          else { g.moveTo(gx, gy); g.lineTo(gx + 6, gy + 6); g.moveTo(gx + 6, gy); g.lineTo(gx, gy + 6); }
          g.stroke();
        }
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, U.shade(p.face, -0.4));
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = p.trim;
        g.fillRect(x, y + 1.5, T, 1);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 4; i++) g.fillRect(x + 3 + i * 8, y + 4, 4, 1);
      },
    },
  };

  const PLANKS = { style: 'planks', colors: ['#9a7048', '#92683f', '#a2784f'], grain: '#5a3a1a', gap: '#4a3018' };
  const base = {
    voidColor: '#0a0908', ambient: '#7a7266', attractAmbient: '#857c70', outsideSight: '#4c4842', playerLight: '#fff4e4', torch: '#ffc080',
    water: { deep: '#18303a', shallow: '#2c5462', foam: '#a8d4dc' },
    pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
    particles: { type: 'mote', color: '#fff0d8', rate: 3, alpha: 0.2, drift: 3 },
    ambience: { base: 60, cutoff: 420, wind: 600, gain: 0.02, wave: 'sine' },
  };
  const env = (o) => Object.assign({}, base, o);
  const environments = {
    'town-coffee': env({
      name: 'The Coffee Shop',
      floors: {
        0: PLANKS,
        1: { style: 'bath-tile', tile: '#e8e2d2', grout: '#8a8070', accent: '#d8cfb8' },
        2: { style: 'bath-tile', tile: '#d8e4e0', grout: '#98aaa4', accent: '#3a7a6a' },
        3: { style: 'carpet-tile', colors: ['#6a2a2a', '#642626'], line: '#c8a050', speck: '#2a1010', accent: '#c8a050' },
      },
      floor: PLANKS,
      wall: { style: 'drywall', top: ['#e8dcc0'], edge: '#faf2e0', face: '#2e5a46', faceDark: '#1e4232', base: '#3a2a1a' },
      door: { panel: '#6a4a2a', frame: '#3a2818', trim: '#c8a050' },
    }),
    'town-books': env({
      name: 'The Book Nook',
      floors: {
        0: { style: 'planks', colors: ['#7a5a3a', '#725234', '#80603e'], grain: '#4a3018', gap: '#3a2410' },
        1: { style: 'carpet-tile', colors: ['#3a4a3a', '#364636'], line: '#a89a6a', speck: '#1a241a' },
        2: { style: 'bath-tile', tile: '#e0dccc', grout: '#a09a88', accent: '#8a6a3a' },
        3: { style: 'terrazzo', base: '#7a7670', chips: ['#5a5650', '#9a968e', '#4a4640'], strip: '#4a4640' },
      },
      floor: PLANKS,
      wall: { style: 'drywall', top: ['#d8ccb0'], edge: '#f0e6d0', face: '#8a6a4a', faceDark: '#6a4a2a', base: '#3a2a1a' },
      door: { panel: '#5a3a22', frame: '#2a1a0e', trim: '#c9a046' },
    }),
    'town-shop': env({
      name: 'Town',
      floors: {
        0: PLANKS,
        1: { style: 'carpet-tile', colors: ['#2a3a5a', '#263654'], line: '#8a9ac8', speck: '#101828' },
        2: { style: 'bath-tile', tile: '#eef0ee', grout: '#b8c0c0', accent: '#6a9ac8' },
        3: { style: 'terrazzo', base: '#a8a49c', chips: ['#7a766e', '#c8c4bc', '#6a665e'], strip: '#6a665e' },
        4: { style: 'carpet-tile', colors: ['#6a1a24', '#641820'], line: '#d8a040', speck: '#2a0a0e', accent: '#d8a040' },
        5: { style: 'bath-tile', tile: '#f4e8e0', grout: '#c86a8a', accent: '#c86a8a' },
        6: { style: 'terrazzo', base: '#4a4a4e', chips: ['#3a3a3e', '#5a5a5e', '#2e2e32'], strip: '#e8d070' },
        7: { style: 'terrazzo', base: '#8a8884', chips: ['#6a6864', '#a8a6a0', '#5a5854'], strip: '#5a5854' },
      },
      floor: PLANKS,
      wall: { style: 'drywall', top: ['#e2dccf'], edge: '#f6f2e8', face: '#bdb6a8', faceDark: '#9e978a', base: '#46443f' },
      door: { panel: '#6a6a72', frame: '#3a3a42', trim: '#c8c0a8' },
    }),
    'town-park': env({
      name: 'Forking Paths Park',
      ambient: '#8a8676', outsideSight: '#5a5a50',
      floors: {
        0: { style: 'grass', base: '#4a7a3a', blades: ['#5a8a44', '#3e6a30', '#6a9a4e'], flowers: ['#f4e870', '#f4f0f0', '#e890b0'] },
        1: { style: 'terrazzo', base: '#c8bca0', chips: ['#a89c80', '#e0d6bc', '#8a7e64'], strip: '#a89c80' },
        2: { style: 'carpet-tile', colors: ['#b84a3a', '#b04434'], line: '#e8c070', speck: '#6a2018' },
        3: { style: 'flagstone', colors: ['#a8a294', '#a09a8c', '#b0aa9c'], grout: '#6a665a', crack: '#7a766a', moss: '#6a8a4a', mossAmt: 0.15 },
      },
      floor: { style: 'grass', base: '#4a7a3a', blades: ['#5a8a44', '#3e6a30', '#6a9a4e'] },
      wall: { style: 'hedge', top: ['#2e5a26'], leaves: ['#3a6a30', '#28501e', '#4a7a3a', '#335e2a'], edge: '#5a8a4a', face: '#24461c', faceDark: '#162e10', base: '#3a2a1a' },
      particles: { type: 'mote', color: '#f8f4c0', rate: 4, alpha: 0.3, drift: 6 },
      ambience: { base: 70, cutoff: 600, wind: 900, gain: 0.025, wave: 'sine' },
    }),
    'maze-sandstone': env({
      name: 'The Maze of Forking Paths',
      voidColor: '#0a0806', ambient: '#4a3a28', attractAmbient: '#6a5a42', outsideSight: '#3e3226', playerLight: '#fff0d0', torch: '#ffb060',
      floors: {
        0: { style: 'flagstone', colors: ['#a88a5a', '#a08252', '#b09262', '#987a4a'], grout: '#5a4428', crack: '#6a5232', moss: '#7a6a3a', mossAmt: 0.05 },
        1: { style: 'flagstone', colors: ['#6a5a48', '#625240', '#726250'], grout: '#2a2218', crack: '#3a2e20', moss: '#4a4a30', mossAmt: 0.1 },
        2: { style: 'marble', base: ['#c8b088', '#c0a880', '#ccb490', '#b8a078'], vein: '#8a7048', inlay: '#2a6a7a' },
      },
      floor: { style: 'flagstone', colors: ['#a88a5a', '#a08252', '#b09262'], grout: '#5a4428', crack: '#6a5232', moss: '#7a6a3a', mossAmt: 0.05 },
      wall: { style: 'sandstone', top: ['#c8a46a', '#c09c62', '#cca872'], joint: '#7a5a32', glyph: 'rgba(80,50,20,0.55)', edge: '#e8cc94', face: '#8a6a3e', trim: '#2a6a7a' },
      door: { panel: '#7a5a32', frame: '#3a2a16', trim: '#2a6a7a' },
      particles: { type: 'mote', color: '#f0d8a0', rate: 8, alpha: 0.35, drift: 5 },
      ambience: { base: 45, cutoff: 260, wind: 380, gain: 0.05, wave: 'triangle' },
    }),
    'town-map': env({ name: 'Town', ambient: '#ffffff', floor: PLANKS, wall: { style: 'drywall', top: ['#e2dccf'], edge: '#f6f2e8', face: '#bdb6a8', faceDark: '#9e978a', base: '#46443f' } }),
  };
  environments['town-books-cb2'] = Object.assign({}, environments['town-books'], {
    name: 'The Book Nook (Chessboard 2)',
    ambient: '#2a2a30', outsideSight: '#26262c', voidColor: '#050506',
    floors: {
      0: { style: 'planks', colors: ['#3a2e24', '#342a20', '#40322a'], grain: '#1a120a', gap: '#120a04' },
      1: { style: 'carpet-tile', colors: ['#24282a', '#202426'], line: '#4a4a3a', speck: '#0a0c0a' },
      2: { style: 'bath-tile', tile: '#7a7666', grout: '#3a3628', accent: '#4a3a2a' },
      3: { style: 'terrazzo', base: '#3a3834', chips: ['#2a2824', '#4a4844', '#1a1814'], strip: '#1a1814' },
    },
    wall: { style: 'drywall', top: ['#6a6458'], edge: '#7a7468', face: '#3a3024', faceDark: '#1a140e', base: '#120c06' },
    particles: { type: 'mote', color: '#c8c0a8', rate: 14, alpha: 0.35, drift: 3 },
    ambience: { base: 38, cutoff: 180, wind: 300, gain: 0.05, wave: 'triangle' },
  });

  // ------------------------------------------------------------ terrain
  const doorBake = (g, x, y, info) => LM.get('terrain', 'door').bake(g, x, y, info);
  const terrain = {
    'hedge-wall': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: '#2e5a26',
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info, environments['town-park'].wall),
    },
    'door-stone': { floorLike: true, door: { lock: 'stone' }, mapColor: '#c8b48a', bake: doorBake },
    'sphinx-gate': {
      // bars of sandstone between the two sphinxes; the riddle opens them (packs/town/maze.js)
      solid: true, blocksShots: true, layer: 1, mapColor: '#2a6a7a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y + 12, T, 10);
        for (let i = 0; i < 4; i++) {
          g.fillStyle = '#8a6a3e';
          g.fillRect(x + 2 + i * 8, y + 4, 5, 24);
          g.fillStyle = '#c8a46a';
          g.fillRect(x + 2 + i * 8, y + 4, 5, 3);
        }
        g.fillStyle = '#2a6a7a';
        g.fillRect(x, y + 14, T, 2);
      },
    },
    'red-tile': {
      floorLike: true, mapColor: '#c83a2a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(x + 7, y + 7, T - 14, T - 14);
        g.fillStyle = '#b8342a';
        g.fillRect(x + 8, y + 8, T - 16, T - 16);
        g.fillStyle = 'rgba(255,200,180,0.25)';
        g.fillRect(x + 8, y + 8, T - 16, 1.2);
      },
    },
  };

  // the Stone Key (from the sarcophagus) opens door-stone
  LM.KEY_COLORS.stone = '#c8b48a';
  LM.KEY_NAMES.stone = 'Stone Key';

  LM.definePack({ id: 'town', name: 'Town', version: '0.1.0', textures, environments, terrain });
})();
