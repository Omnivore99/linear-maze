/* The Linear Maze — packs/chessboard/environment.js
 * Chessboard pack, part 1: how Chessboard 1 looks.
 *
 * Chessboard 1 is the 14th floor one level of reality down (after JAGS
 * Wonderland's chessboards: each one a little stranger than the last).
 * Everything should look just a little different, so the 'chessboard-office'
 * environment is the Office pack's 'office' with every colour nudged:
 * carpet a shade more violet, walls a shade greener, the light a shade sicker.
 * It adds two floors and one terrain:
 *   floor variant 8   raised server-room floor
 *   floor variant 9   back-hall linoleum
 *   server-rack       a solid, tall rack of servers whose lights blink
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  // ------------------------------------------------------------ painters
  const textures = {
    'raised-floor': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const sx = x + i * 16, sy = y + j * 16, k = U.hash2(info.x * 2 + i, info.y * 2 + j, 61);
            g.fillStyle = U.shade(p.tile, (k - 0.5) * 0.08);
            g.fillRect(sx + 0.5, sy + 0.5, 15, 15);
            g.fillStyle = 'rgba(255,255,255,0.06)';
            g.fillRect(sx + 0.5, sy + 0.5, 15, 0.8);
            // perforated tiles let the cold air up
            if (k < 0.3) {
              g.fillStyle = p.holes;
              for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) g.fillRect(sx + 3 + a * 3, sy + 3 + b * 3, 1.2, 1.2);
            }
          }
        }
        g.fillStyle = p.gap;
        g.fillRect(x, y, T, 0.6);
        g.fillRect(x, y, 0.6, T);
        g.fillRect(x, y + 16, T, 0.5);
        g.fillRect(x + 16, y, 0.5, T);
      },
    },
    linoleum: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = (info.x + info.y) % 2 ? p.a : p.b;
        g.fillRect(x, y, T, T);
        for (let i = 0; i < 22; i++) {
          g.fillStyle = U.rgba(r() < 0.5 ? '#000000' : '#ffffff', 0.08 + r() * 0.08);
          g.fillRect(x + r() * T, y + r() * T, 0.9 + r() * 1.4, 0.9);
        }
        g.fillStyle = 'rgba(0,0,0,0.14)';
        g.fillRect(x, y, T, 0.6);
        g.fillRect(x, y, 0.6, T);
        // a scuff path down the middle of every hall
        if (U.hash2(info.x, info.y, 4) < 0.25) {
          g.fillStyle = 'rgba(40,36,30,0.12)';
          g.fillRect(x + 6, y + 10, 20, 12);
        }
      },
    },
    rack: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 3; i < h - 2; i += 3) g.fillRect(x + 4, y + i, T - 8, 1);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x + T / 2 - 0.4, y, 0.8, h);
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        g.fillStyle = p.faceDark;
        for (let i = 0; i < 4; i++) g.fillRect(x + 2 + i * 7.5, y + 2, 6, fh - 4);
      },
    },
  };
  const RACK = { style: 'rack', top: ['#1d222a'], edge: '#46566a', face: '#14181f', faceDark: '#0b0e13' };
  const LED = ['#3aff7a', '#3aff7a', '#3aff7a', '#ffb43a', '#3ab4ff', '#ff3a3a'];

  const terrain = {
    'server-rack': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, mapColor: '#2e3d50',
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info, RACK),
      drawGlow(g, x, y, tx, ty, game, t) {
        // two blinking lights per rack, each on its own rhythm
        for (let i = 0; i < 2; i++) {
          const k = U.hash2(tx, ty, 17 + i);
          if (Math.sin(t * (2 + k * 9) + k * 40) < 0.1) continue;
          g.fillStyle = LED[Math.floor(k * LED.length)];
          g.fillRect(x + 5 + k * 20, y + 5 + i * 11, 1.8, 1.8);
        }
      },
    },
  };

  // ------------------------------------------------------------ the environment: the office, nudged
  const base = LM.get('environments', 'office');
  const nudge = (pal, f) => Object.assign({}, pal, f(pal));
  const floors = {};
  for (const [k, pal] of Object.entries(base.floors)) floors[k] = pal;
  floors[0] = nudge(base.floors[0], () => ({ colors: ['#4f5368', '#4a4e63'], speck: '#2a2638' }));
  floors[1] = nudge(base.floors[1], (p) => ({ base: '#c5c4b4', chips: p.chips.concat(['#8a3a3a']) }));
  floors[3] = nudge(base.floors[3], () => ({ colors: ['#aa8a5a', '#a2825a', '#b2926a'] }));
  floors[7] = nudge(base.floors[7], () => ({ colors: ['#3d3d55', '#393950'], accent: '#a8913e' }));
  floors[8] = { style: 'raised-floor', tile: '#3c434d', holes: '#12161c', gap: '#20252c' };
  floors[9] = { style: 'linoleum', a: '#8f8a78', b: '#86826f' };
  const environments = {
    'chessboard-office': Object.assign({}, base, {
      name: 'Meridian Group (Chessboard 1)',
      ambient: '#646d6a',
      outsideSight: '#484d52',
      playerLight: '#f6fff0',
      floors,
      floor: floors[0],
      wall: Object.assign({}, base.wall, { top: ['#d6dacb'], face: '#b9bcab', faceDark: '#9a9d8c' }),
      particles: { type: 'mote', color: '#e8f4e0', rate: 3, alpha: 0.18, drift: 3 },
      ambience: { base: 58, cutoff: 380, wind: 820, gain: 0.034, wave: 'triangle' },
    }),
  };

  LM.definePack({ id: 'chessboard', name: 'Chessboard', version: '0.1.0', textures, terrain, environments });
})();
