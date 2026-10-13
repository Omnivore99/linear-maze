/* The Linear Maze — packs/office/environment.js
 * Office pack, part 1: the look of Meridian Group's 14th floor.
 * Texture painters (carpet tile, terrazzo, bathroom tile, wood plank,
 * water-damaged carpet, drywall), the 'office' environment with eight floor
 * variants, and office terrain: glass walls, stall partitions, glass and
 * stall doors, the door that wasn't there, and the old stone that the
 * building turns into at the far end.
 *
 * Floor variants used by the office map (legend `variant`):
 *   0 open-plan carpet    1 lobby terrazzo     2 bathroom tile     3 pantry wood
 *   4 executive walnut    5 damaged carpet     6 old flagstone     7 conference carpet
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  function speck(g, x, y, w, h, n, r, col, a) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = U.rgba(col, a * (0.4 + r() * 0.6));
      g.fillRect(x + r() * w, y + r() * h, 0.9, 0.9);
    }
  }

  // ======================================================== floor painters
  const textures = {
    'carpet-tile': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const wx = info.x * 2 + i, wy = info.y * 2 + j, sx = x + i * 16, sy = y + j * 16;
            const hsh = U.hash2(wx, wy, 13);
            g.fillStyle = U.shade(p.colors[(wx + wy) % p.colors.length], (hsh - 0.5) * 0.07);
            g.fillRect(sx, sy, 16, 16);
            // quarter-turned grain, the way commercial carpet tiles are laid
            g.strokeStyle = U.rgba(p.line, 0.13);
            g.lineWidth = 0.55;
            g.beginPath();
            for (let k = 1; k < 16; k += 2) {
              if ((wx + wy) % 2) {
                g.moveTo(sx, sy + k);
                g.lineTo(sx + 16, sy + k);
              } else {
                g.moveTo(sx + k, sy);
                g.lineTo(sx + k, sy + 16);
              }
            }
            g.stroke();
            speck(g, sx, sy, 16, 16, 6, r, p.speck, 0.5);
          }
        }
        g.fillStyle = 'rgba(0,0,0,0.16)';
        g.fillRect(x, y, T, 0.6);
        g.fillRect(x, y + 16, T, 0.5);
        g.fillRect(x, y, 0.6, T);
        g.fillRect(x + 16, y, 0.5, T);
        if (p.accent && (info.x + info.y * 3) % 7 === 0) {
          g.fillStyle = U.rgba(p.accent, 0.5);
          g.fillRect(x + 2, y + 15, 28, 2);
        }
      },
    },
    terrazzo: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, U.shade(p.base, 0.04));
        grd.addColorStop(1, U.shade(p.base, -0.05));
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
        g.globalAlpha = 0.55;
        for (let i = 0; i < 30; i++) {
          g.fillStyle = p.chips[Math.floor(r() * p.chips.length)];
          const cx = x + r() * T, cy = y + r() * T, s = 0.4 + r() * 1.15;
          g.beginPath();
          g.moveTo(cx - s, cy);
          g.lineTo(cx, cy - s * 0.8);
          g.lineTo(cx + s, cy + s * 0.3);
          g.lineTo(cx - s * 0.2, cy + s);
          g.closePath();
          g.fill();
        }
        g.globalAlpha = 1;
        // polished sheen and brass divider strips
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(x, y, T, T / 2);
        g.fillStyle = p.strip;
        if (info.x % 3 === 0) g.fillRect(x, y, 0.9, T);
        if (info.y % 3 === 0) g.fillRect(x, y, T, 0.9);
      },
    },
    'bath-tile': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.grout;
        g.fillRect(x, y, T, T);
        for (let j = 0; j < 4; j++) {
          for (let i = 0; i < 4; i++) {
            const h = U.hash2(info.x * 4 + i, info.y * 4 + j, 21);
            g.fillStyle = h < 0.05 ? p.accent : U.shade(p.tile, (h - 0.5) * 0.06);
            g.fillRect(x + i * 8 + 0.5, y + j * 8 + 0.5, 7, 7);
            g.fillStyle = 'rgba(255,255,255,0.18)';
            g.fillRect(x + i * 8 + 0.5, y + j * 8 + 0.5, 7, 0.7);
          }
        }
      },
    },
    planks: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.gap;
        g.fillRect(x, y, T, T);
        const X0 = info.x * T;
        for (let row = 0; row < 4; row++) {
          const wy = info.y * 4 + row;
          const off = U.hash2(0, wy, 31) * 48;
          for (let k = Math.floor((X0 - off) / 48); off + k * 48 < X0 + T; k++) {
            const s0 = off + k * 48, left = Math.max(s0, X0), right = Math.min(s0 + 47.2, X0 + T);
            if (right <= left) continue;
            const lx = x + (left - X0), w = right - left;
            g.fillStyle = U.shade(p.colors[((k % 3) + 3 + wy) % p.colors.length], (U.hash2(k, wy, 3) - 0.5) * 0.1);
            g.fillRect(lx, y + row * 8 + 0.4, w, 7.2);
            g.strokeStyle = U.rgba(p.grain, 0.28);
            g.lineWidth = 0.4;
            g.beginPath();
            for (let n = 0; n < 2; n++) {
              const gy = y + row * 8 + 2 + n * 3 + U.hash2(k, wy + n, 9) * 1.5;
              g.moveTo(lx, gy);
              g.lineTo(lx + w, gy + 0.3);
            }
            g.stroke();
          }
        }
        g.fillStyle = 'rgba(255,255,255,0.04)';
        g.fillRect(x, y, T, T);
      },
    },
    'carpet-warped': {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.concrete;
        g.fillRect(x, y, T, T);
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const wx = info.x * 2 + i, wy = info.y * 2 + j;
            const h = U.hash2(wx, wy, 41);
            if (h < 0.07) {
              // a missing tile: bare concrete with glue tracks
              g.strokeStyle = 'rgba(40,36,30,0.35)';
              g.lineWidth = 0.6;
              g.beginPath();
              for (let k = 0; k < 4; k++) {
                g.moveTo(x + i * 16 + 2, y + j * 16 + 3 + k * 3.5);
                g.lineTo(x + i * 16 + 14, y + j * 16 + 2 + k * 3.5);
              }
              g.stroke();
              continue;
            }
            g.save();
            g.translate(x + i * 16 + 8, y + j * 16 + 8);
            g.rotate((h - 0.5) * 0.35);
            g.fillStyle = h > 0.965 ? p.wrong : U.shade(p.colors[(wx + wy) % p.colors.length], (h - 0.5) * 0.15);
            g.fillRect(-8, -8, 16, 16);
            g.strokeStyle = U.rgba(p.line, 0.12);
            g.lineWidth = 0.5;
            g.beginPath();
            for (let k = -7; k < 8; k += 2) {
              g.moveTo(-8, k);
              g.lineTo(8, k);
            }
            g.stroke();
            g.restore();
          }
        }
        if (r() < 0.45) {
          const sx = x + r() * T, sy = y + r() * T, rr = 4 + r() * 9;
          const grd = g.createRadialGradient(sx, sy, 0, sx, sy, rr);
          grd.addColorStop(0, U.rgba(p.stain, 0.55));
          grd.addColorStop(1, U.rgba(p.stain, 0));
          g.fillStyle = grd;
          g.fillRect(x, y, T, T);
        }
        // damp darkens the carpet beside standing water
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          if (!info.n(dx, dy).swim) continue;
          const grd = g.createLinearGradient(dx === 1 ? x + T : x, dy === 1 ? y + T : y, dx === 1 ? x + T - 12 : dx === -1 ? x + 12 : x, dy === 1 ? y + T - 12 : dy === -1 ? y + 12 : y);
          grd.addColorStop(0, 'rgba(10,14,16,0.55)');
          grd.addColorStop(1, 'rgba(10,14,16,0)');
          g.fillStyle = grd;
          g.fillRect(x, y, T, T);
        }
      },
    },

    // ==================================================== wall painter
    drywall: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.top[0];
        g.fillRect(x, y, T, h);
        speck(g, x, y, T, h, 14, r, '#000000', 0.06);
        // the top of a stud wall reads as a double line
        g.fillStyle = U.shade(p.top[0], -0.1);
        g.fillRect(x, y + h / 2 - 1.5, T, 0.6);
        g.fillRect(x, y + h / 2 + 1, T, 0.6);
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, p.faceDark);
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = p.base;
        g.fillRect(x, y + fh - 2, T, 2);
        if (U.hash2(info.x, info.y, 55) < 0.12) {
          g.fillStyle = '#efece6';
          g.fillRect(x + 12, y + 2, 4, 3.4);
          g.fillStyle = '#5a5a58';
          g.fillRect(x + 13.4, y + 2.8, 0.6, 0.9);
          g.fillRect(x + 14.4, y + 2.8, 0.6, 0.9);
        }
      },
    },
  };

  // ======================================================== shared palettes
  const STONE = { style: 'brick', top: ['#6b655a', '#645e53', '#5d574c'], mortar: '#38342d', edge: '#9a917f', face: '#3a352e', faceDark: '#1b1915', moss: '#55723a' };
  const FLAGSTONE = { style: 'flagstone', colors: ['#5c5f56', '#55594f', '#4e534a', '#615f55'], grout: '#22251f', crack: '#262822', moss: '#5f7d3c', mossAmt: 0.25 };
  LM.OFFICE_STONE = STONE;

  // ======================================================== door styles
  function slidingPanels(ctx, door, half, thick, paint) {
    const k = U.ease.inOutSine(door.open);
    const slide = k * (half - 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      paint(side < 0 ? -half : 0, side);
      ctx.restore();
    }
  }
  const doorStyles = {
    glass(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      slidingPanels(ctx, door, half, 4, (x0) => {
        ctx.fillStyle = 'rgba(170,205,225,0.38)';
        ctx.fillRect(x0, -2.5, half, 5);
        ctx.strokeStyle = '#aab4be';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x0 + 0.4, -2.5, half - 0.8, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x0 + 3, -1.6, 4, 0.6);
        ctx.fillStyle = '#3a3e44';
        ctx.fillRect(x0 + (x0 < 0 ? half - 4 : 2), -3.6, 2, 7.2);
      });
      ctx.fillStyle = '#7d858f';
      ctx.fillRect(-half, -4, 2, 8);
      ctx.fillRect(half - 2, -4, 2, 8);
      ctx.restore();
    },
    stall(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      slidingPanels(ctx, door, half, 3, (x0) => {
        ctx.fillStyle = '#8f969e';
        ctx.fillRect(x0, -1.8, half, 3.6);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x0, -1.8, half, 0.8);
      });
      ctx.fillStyle = door.sealed ? '#d0402e' : '#4caf6a';
      ctx.fillRect(-1.5, 2.2, 3, 1.6);
      ctx.restore();
    },
    odd(ctx, door, game, t) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      slidingPanels(ctx, door, half, 8, (x0) => {
        ctx.fillStyle = '#2e1d12';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#4a2f1c';
        ctx.fillRect(x0 + 1, -4, half - 2, 8);
        ctx.fillStyle = '#1a100a';
        for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 3 + i * 5, -4, 0.8, 8);
        ctx.fillStyle = '#8a8478';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(x0 + 4 + i * 5, -2.6, 0.7, 0, U.TAU);
          ctx.arc(x0 + 4 + i * 5, 2.6, 0.7, 0, U.TAU);
          ctx.fill();
        }
      });
      if (door.open < 0.2) {
        ctx.fillStyle = '#c9a046';
        ctx.fillRect(-4, -1.2, 8, 2.4);
      }
      ctx.fillStyle = '#5a5248';
      ctx.fillRect(-half, -6, 3, 12);
      ctx.fillRect(half - 3, -6, 3, 12);
      ctx.restore();
    },
  };
  const doorGlows = {
    odd(ctx, door, game, t) {
      if (door.open > 0.6) return;
      const k = 0.5 + 0.3 * Math.sin(t * 2.3);
      LM.gfx.glow(ctx, door.x, door.y, 26, '#ffcf80', k * 0.45 * (1 - door.open));
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = 'rgba(255,200,120,' + 0.6 * k * (1 - door.open) + ')';
      ctx.fillRect(-0.6, -5, 1.2, 10);
      ctx.restore();
    },
  };

  // ======================================================== the environment
  const environments = {
    office: {
      name: 'Meridian Group',
      voidColor: '#0b0d11',
      ambient: '#666c77',
      attractAmbient: '#7a808a',
      outsideSight: '#4a4e58',
      playerLight: '#fff8ec',
      torch: '#ffa458',
      floors: {
        0: { style: 'carpet-tile', colors: ['#4d5567', '#485062'], line: '#a4b0c6', speck: '#262c3a' },
        1: { style: 'terrazzo', base: '#c7c2b8', chips: ['#8e8a82', '#5f6a72', '#b98f6a', '#ece8e0', '#3e4448'], strip: '#b8913e' },
        2: { style: 'bath-tile', tile: '#d5dade', grout: '#9aa3aa', accent: '#7fa6b5' },
        3: { style: 'planks', colors: ['#b08a5e', '#a8825a', '#b8946a'], grain: '#6a4a2a', gap: '#5a4028' },
        4: { style: 'planks', colors: ['#5e3e26', '#563822', '#64432a'], grain: '#2a180c', gap: '#1e120a' },
        5: { style: 'carpet-warped', colors: ['#3d4452', '#394050'], line: '#8a96aa', concrete: '#4a4945', stain: '#15170f', wrong: '#6a2a3a' },
        6: FLAGSTONE,
        7: { style: 'carpet-tile', colors: ['#3b3f55', '#373b50'], line: '#9096b8', speck: '#1e2030', accent: '#b8913e' },
      },
      floor: { style: 'carpet-tile', colors: ['#4d5567', '#485062'], line: '#a4b0c6', speck: '#262c3a' },
      wall: { style: 'drywall', top: ['#dcd8d0'], edge: '#f6f3ec', face: '#bdb8ae', faceDark: '#9e998f', base: '#46443f' },
      water: { deep: '#18303a', shallow: '#2c5462', foam: '#a8d4dc' },
      pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
      door: { panel: '#8a6a4a', frame: '#5a5c62', trim: '#c8c2b6' },
      doorStyles,
      doorGlows,
      particles: { type: 'mote', color: '#e8ecf4', rate: 3, alpha: 0.16, drift: 3 },
      ambience: { base: 60, cutoff: 420, wind: 900, gain: 0.032, wave: 'sine' },
    },
  };

  // ======================================================== terrain
  function glassBake(horizontal) {
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      g.save();
      if (horizontal) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x, y + 18, T, 3);
        g.fillStyle = 'rgba(175,210,228,0.42)';
        g.fillRect(x, y + 13.5, T, 5);
        g.fillStyle = '#9aa4ae';
        g.fillRect(x, y + 13, T, 0.9);
        g.fillRect(x, y + 18.1, T, 0.9);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(x + 4 + (info.x % 3) * 5, y + 14.6, 6, 0.6);
        g.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 2; i < T; i += 4) g.fillRect(x + i, y + 15.6, 1.4, 1);
        g.fillStyle = '#7d858f';
        g.fillRect(x, y + 12.5, 1.6, 7);
      } else {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + 18, y, 3, T);
        g.fillStyle = 'rgba(175,210,228,0.42)';
        g.fillRect(x + 13.5, y, 5, T);
        g.fillStyle = '#9aa4ae';
        g.fillRect(x + 13, y, 0.9, T);
        g.fillRect(x + 18.1, y, 0.9, T);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(x + 14.6, y + 4 + (info.y % 3) * 5, 0.6, 6);
        g.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 2; i < T; i += 4) g.fillRect(x + 15.6, y + i, 1, 1.4);
        g.fillStyle = '#7d858f';
        g.fillRect(x + 12.5, y, 7, 1.6);
      }
      g.restore();
    };
  }
  function partitionBake(horizontal) {
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      g.fillStyle = 'rgba(0,0,0,0.2)';
      if (horizontal) g.fillRect(x, y + 17, T, 2.5);
      else g.fillRect(x + 17, y, 2.5, T);
      g.fillStyle = '#8f969e';
      if (horizontal) g.fillRect(x, y + 14, T, 3.5);
      else g.fillRect(x + 14, y, 3.5, T);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      if (horizontal) g.fillRect(x, y + 14, T, 0.8);
      else g.fillRect(x + 14, y, 0.8, T);
    };
  }
  function thresholdBake(color) {
    return function (g, x, y, info) {
      LM.paintFloor(g, x, y, info);
      const horiz = info.n(-1, 0).solid || info.n(1, 0).solid;
      g.fillStyle = color;
      if (horiz) g.fillRect(x, y + T / 2 - 3, T, 6);
      else g.fillRect(x + T / 2 - 3, y, 6, T);
    };
  }
  const coreExit = () => LM.get('terrain', 'exit');
  const terrain = {
    'glass-h': { solid: true, rect: [0, 13, 32, 6], blocksShots: true, layer: 1, noAO: true, mapColor: '#8fb8d0', bake: glassBake(true) },
    'glass-v': { solid: true, rect: [13, 0, 6, 32], blocksShots: true, layer: 1, noAO: true, mapColor: '#8fb8d0', bake: glassBake(false) },
    'partition-h': { solid: true, rect: [0, 14, 32, 4], blocksShots: true, layer: 1, noAO: true, mapColor: '#8f969e', bake: partitionBake(true) },
    'partition-v': { solid: true, rect: [14, 0, 4, 32], blocksShots: true, layer: 1, noAO: true, mapColor: '#8f969e', bake: partitionBake(false) },
    'door-glass': { floorLike: true, door: { lock: null, style: 'glass' }, mapColor: 'rgba(205,190,160,0.16)', bake: thresholdBake('rgba(150,160,170,0.5)') },
    'door-stall': { floorLike: true, door: { lock: null, style: 'stall' }, mapColor: 'rgba(205,190,160,0.16)', bake: thresholdBake('rgba(0,0,0,0.12)') },
    'door-stall-locked': { floorLike: true, door: { lock: null, style: 'stall', sealed: true }, mapColor: 'rgba(205,190,160,0.16)', bake: thresholdBake('rgba(0,0,0,0.12)') },
    'door-odd': { floorLike: true, door: { lock: null, style: 'odd', sealed: true }, mapColor: '#e0b25a', bake: thresholdBake('#3a3530') },
    'stone-wall': {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: '#6b6556',
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info, STONE),
    },
    'stone-pillar': {
      solid: true, shape: 'circle', radius: 10.5, blocksShots: true, blocksLight: true, layer: 1, mapColor: '#6b6556',
      bake(g, x, y, info) {
        const base = LM.get('terrain', 'pillar');
        base.bake(g, x, y, Object.assign({}, info, { env: Object.assign({}, info.env, { wall: STONE }) }));
      },
    },
    'grand-exit': {
      floorLike: true, exit: true, mapColor: '#e0b25a',
      bake(g, x, y, info) {
        LM.get('textures', 'flagstone').paint(g, x, y, info, FLAGSTONE);
        g.fillStyle = '#000';
        g.fillRect(x + 2, y + 2, T - 4, T - 4);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = U.shade(STONE.top[0], -0.05 - i * 0.15);
          g.fillRect(x + 3, y + 3 + i * 4.6, T - 6, 3.8);
        }
        g.strokeStyle = '#b8913e';
        g.lineWidth = 1.5;
        g.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
      },
      drawGlow: (g, x, y, tx, ty, game, t) => coreExit().drawGlow(g, x, y, tx, ty, game, t),
    },
  };

  LM.definePack({ id: 'office', name: 'Office', version: '0.1.0', textures, environments, terrain });
})();
