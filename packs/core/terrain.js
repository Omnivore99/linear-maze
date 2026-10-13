/* The Linear Maze — packs/core/terrain.js
 * Tile types and the default map legend.
 *
 * Terrain fields the engine reads:
 *   solid, shape ('circle'), radius     blocks movement (pillars are circles)
 *   blocksShots, blocksLight            stops bullets / light and sight
 *   tall                                casts contact shadow on neighbours
 *   layer (0 ground, 1 raised)          bake order
 *   floorLike                           counts as floor for carpets/edges
 *   hazard ('pit' | anything else)      pits make you fall; other hazards hurt
 *   damage, interval, active(game,x,y)  hazard damage, tick rate, on/off timing
 *   swim, speedMul                      water / slowing ground
 *   door: { lock }                      spawns a Door entity
 *   plate, entry, exit                  pressure plate, level start, level end
 *   light / light(level,x,y)            static light emitted by the tile
 *   bake(g,x,y,info)                    painted once into the terrain cache
 *   drawDynamic / drawGlow(g,x,y,tx,ty,game,t)  animated overlays
 *   mapColor                            minimap colour ('none' to hide)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  function floorEdges(g, x, y, info) {
    // crumbling lip where the floor meets a pit
    const r = info.rnd;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const n = info.n(dx, dy);
      if (n.hazard !== 'pit') continue;
      for (let i = 0; i < 7; i++) {
        const t = r() * T, d = r() * 3.5;
        const px = dx === 1 ? x + T - d : dx === -1 ? x + d : x + t;
        const py = dy === 1 ? y + T - d : dy === -1 ? y + d : y + t;
        g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.07)';
        g.fillRect(px - 1, py - 1, 1.5 + r() * 2, 1.5 + r() * 2);
      }
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(dx === 1 ? x + T - 1.5 : x, dy === 1 ? y + T - 1.5 : y, dx ? 1.5 : T, dy ? 1.5 : T);
    }
  }
  function floorBake(g, x, y, info) {
    LM.paintFloor(g, x, y, info);
    floorEdges(g, x, y, info);
  }
  function doorBake(g, x, y, info) {
    LM.paintFloor(g, x, y, info);
    const horiz = info.n(-1, 0).solid || info.n(1, 0).solid;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    if (horiz) g.fillRect(x, y + T / 2 - 6, T, 12);
    else g.fillRect(x + T / 2 - 6, y, 12, T);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    if (horiz) g.fillRect(x, y + T / 2 - 6, T, 1);
    else g.fillRect(x + T / 2 - 6, y, 1, T);
  }
  const door = (lock) => ({ floorLike: true, door: { lock }, bake: doorBake, mapColor: 'rgba(205,190,160,0.16)' });

  const SPIKE_PERIOD = 2.4, SPIKE_UP = 1.0;
  function spikePhase(game, tx, ty) {
    const off = tx * 0.23 + ty * 0.31;
    return (((game.time + off) % SPIKE_PERIOD) + SPIKE_PERIOD) % SPIKE_PERIOD;
  }
  function spikeExtension(game, tx, ty) {
    const ph = spikePhase(game, tx, ty);
    if (ph < 0.07) return ph / 0.07;
    if (ph < SPIKE_UP - 0.15) return 1;
    if (ph < SPIKE_UP) return (SPIKE_UP - ph) / 0.15;
    return 0;
  }

  const terrain = {
    void: {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true, mapColor: 'none',
      bake(g, x, y, info) {
        g.fillStyle = info.env.voidColor;
        g.fillRect(x, y, T, T);
      },
    },
    wall: {
      solid: true, blocksShots: true, blocksLight: true, tall: true, layer: 1, noAO: true,
      bake: (g, x, y, info) => LM.paintWall(g, x, y, info),
    },
    floor: { floorLike: true, bake: floorBake },
    door: door(null),
    'door-red': door('red'),
    'door-gold': door('gold'),
    'door-violet': door('violet'),
    plate: {
      floorLike: true,
      plate: true,
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(x + 4, y + 4, T - 8, T - 8);
        g.fillStyle = U.shade(info.env.wall.top[0], -0.1);
        g.fillRect(x + 5, y + 5, T - 10, T - 10);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x + 5, y + 5, T - 10, 1);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < 3; i++) g.fillRect(x + 9, y + 10 + i * 5, T - 18, 1);
      },
      drawDynamic(g, x, y, tx, ty, game) {
        const tr = game.plates.get(ty * game.level.w + tx);
        if (tr && tr.pressed) {
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.fillRect(x + 5, y + 5, T - 10, T - 10);
        }
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        const tr = game.plates.get(ty * game.level.w + tx);
        if (tr && tr.armed && tr.cd <= 0) LM.gfx.glow(g, x + T - 7, y + 7, 4, '#ff4a3a', 0.5 + 0.4 * Math.sin(t * 6));
      },
    },
    water: {
      swim: true, noDecals: true, mapColor: '#1b4e5a',
      bake(g, x, y, info) {
        const w = info.env.water;
        g.fillStyle = w.deep;
        g.fillRect(x, y, T, T);
        const r = info.rnd;
        for (let i = 0; i < 6; i++) {
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.beginPath();
          g.arc(x + r() * T, y + r() * T, 2 + r() * 5, 0, U.TAU);
          g.fill();
        }
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const n = info.n(dx, dy);
          if (n.swim) continue;
          const x0 = dx === 1 ? x + T : x, y0 = dy === 1 ? y + T : y;
          const x1 = dx === 1 ? x + T - 9 : dx === -1 ? x + 9 : x0, y1 = dy === 1 ? y + T - 9 : dy === -1 ? y + 9 : y0;
          const grd = g.createLinearGradient(x0, y0, x1 === x0 ? x0 : x1, y1 === y0 ? y0 : y1);
          grd.addColorStop(0, U.rgba(w.shallow, 0.95));
          grd.addColorStop(1, U.rgba(w.shallow, 0));
          g.fillStyle = grd;
          g.fillRect(dx === 1 ? x + T - 9 : x, dy === 1 ? y + T - 9 : y, dx ? 9 : T, dy ? 9 : T);
          g.fillStyle = U.rgba(w.foam, 0.45);
          g.fillRect(dx === 1 ? x + T - 1 : x, dy === 1 ? y + T - 1 : y, dx ? 1 : T, dy ? 1 : T);
        }
      },
      drawDynamic(g, x, y, tx, ty, game, t) {
        const w = game.level.env.water;
        g.strokeStyle = U.rgba(w.foam, 0.13);
        g.lineWidth = 0.8;
        g.beginPath();
        for (let wy = Math.ceil(y / 9) * 9; wy < y + T; wy += 9) {
          const k = wy * 0.37;
          for (let i = 0; i <= 4; i++) {
            const wx = x + i * 8;
            const yy = wy + Math.sin(wx * 0.16 + t * 1.6 + k) * 1.6;
            if (i === 0) g.moveTo(wx, yy);
            else g.lineTo(wx, yy);
          }
        }
        g.stroke();
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        const h = U.hash2(tx, ty, 5);
        const ph = (t * 0.6 + h * 7) % 3;
        if (ph < 0.5) LM.gfx.glow(g, x + 6 + h * 20, y + 8 + ((h * 97) % 1) * 16, 3, game.level.env.water.foam, Math.sin((ph / 0.5) * Math.PI) * 0.25);
      },
    },
    pit: {
      hazard: 'pit', noDecals: true, noAO: true, mapColor: '#000000',
      bake(g, x, y, info) {
        const p = info.env.pit;
        g.fillStyle = p.core;
        g.fillRect(x, y, T, T);
        if (info.n(0, -1).hazard !== 'pit') {
          const grd = g.createLinearGradient(x, y, x, y + 16);
          grd.addColorStop(0, p.wall);
          grd.addColorStop(1, U.rgba(p.core, 0));
          g.fillStyle = grd;
          g.fillRect(x, y, T, 16);
          g.fillStyle = 'rgba(0,0,0,0.5)';
          for (let i = 0; i < 4; i++) g.fillRect(x + 2 + i * 8, y + 3 + (i % 2) * 4, 5, 0.8);
          g.fillStyle = p.rim;
          g.fillRect(x, y, T, 1.2);
        }
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0]]) {
          if (info.n(dx, dy).hazard === 'pit') continue;
          const grd = g.createLinearGradient(dx === 1 ? x + T : dx === -1 ? x : x, dy === 1 ? y + T : y, dx === 1 ? x + T - 5 : dx === -1 ? x + 5 : x, dy === 1 ? y + T - 5 : y);
          grd.addColorStop(0, U.rgba(p.rim, 0.8));
          grd.addColorStop(1, U.rgba(p.rim, 0));
          g.fillStyle = grd;
          g.fillRect(dx === 1 ? x + T - 5 : x, dy === 1 ? y + T - 5 : y, dx ? 5 : T, dy ? 5 : T);
        }
        const r = info.rnd;
        for (let i = 0; i < 5; i++) {
          g.fillStyle = 'rgba(255,255,255,' + (0.02 + r() * 0.04) + ')';
          g.fillRect(x + r() * T, y + 10 + r() * (T - 10), 1, 1);
        }
      },
    },
    spikes: {
      floorLike: true, hazard: 'spikes', damage: 14, interval: 0.5, mapColor: '#5a3030',
      active: (game, tx, ty) => spikeExtension(game, tx, ty) > 0.6,
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(x + 2, y + 2, T - 4, T - 4);
        g.fillStyle = '#4a4c50';
        g.fillRect(x + 3, y + 3, T - 6, T - 6);
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.fillRect(x + 3, y + 3, T - 6, 1);
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
          g.fillStyle = '#121214';
          g.beginPath();
          g.arc(x + 8 + i * 8, y + 8 + j * 8, 2, 0, U.TAU);
          g.fill();
        }
      },
      drawDynamic(g, x, y, tx, ty, game) {
        const e = spikeExtension(game, tx, ty);
        if (e <= 0) return;
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
          const cx = x + 8 + i * 8, cy = y + 8 + j * 8, r = 3.1 * e;
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.beginPath();
          g.ellipse(cx + 1.5 * e, cy + 2 * e, r, r * 0.7, 0, 0, U.TAU);
          g.fill();
          const grd = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
          grd.addColorStop(0, '#f4f2ea');
          grd.addColorStop(0.4, '#a9abaf');
          grd.addColorStop(1, '#3d3f44');
          g.fillStyle = grd;
          g.beginPath();
          g.arc(cx, cy, r, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, x, y, tx, ty, game) {
        const ph = spikePhase(game, tx, ty);
        if (ph > SPIKE_PERIOD - 0.4) {
          const k = (ph - (SPIKE_PERIOD - 0.4)) / 0.4;
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) LM.gfx.glow(g, x + 8 + i * 8, y + 8 + j * 8, 3.5, '#ff6a4a', k * 0.6);
        }
      },
    },
    slag: {
      hazard: 'slag', damage: 7, interval: 0.4, speedMul: 0.55, noDecals: true, mapColor: '#7a2a10',
      light: (L, x, y) => ((x + y) % 2 === 0 ? { color: '#ff6a1f', radius: 92, intensity: 0.5, flicker: 0.12 } : null),
      onHurt(game, P) {
        game.particles.burst(P.x, P.y, 4, { type: 'ember', color: '#ffb060', speed: 40, life: 0.6, size: 1 });
      },
      bake(g, x, y, info) {
        const s = info.env.slag || { crust: '#2b1710', crust2: '#3a1d12', glow: '#ff6a1f', hot: '#ffd27a' };
        g.fillStyle = s.glow;
        g.fillRect(x, y, T, T);
        const r = info.rnd;
        for (let i = 0; i < 5; i++) {
          g.fillStyle = r() < 0.5 ? s.crust : s.crust2;
          g.beginPath();
          const cx = x + r() * T, cy = y + r() * T, rad = 6 + r() * 8;
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * U.TAU + r() * 0.5;
            const rr = rad * (0.7 + r() * 0.4);
            if (k === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          g.closePath();
          g.fill();
        }
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        const s = game.level.env.slag || { glow: '#ff6a1f', hot: '#ffd27a' };
        const h = U.hash2(tx, ty, 9);
        const k = 0.35 + 0.2 * Math.sin(t * 1.7 + h * 9);
        g.fillStyle = U.rgba(s.glow, k * 0.5);
        g.fillRect(x, y, T, T);
        // a slow bubble per tile
        const ph = (t * 0.5 + h * 5) % 2.5;
        if (ph < 0.8) {
          const bx = x + 6 + h * 20, by = y + 6 + ((h * 31) % 1) * 20;
          LM.gfx.glow(g, bx, by, 4 + ph * 6, s.hot, (1 - ph / 0.8) * 0.8);
        }
      },
    },
    pillar: {
      solid: true, shape: 'circle', radius: 10.5, blocksShots: true, blocksLight: true, layer: 1, mapColor: '#6b6556',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        const w = info.env.wall;
        const cx = x + T / 2, cy = y + T / 2, R = 10.5;
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.beginPath();
        g.ellipse(cx + 3, cy + 4, R + 3, R + 1.5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = U.shade(w.top[0], -0.25);
        LM.gfx.roundRect(g, cx - R - 3, cy - R - 3, (R + 3) * 2, (R + 3) * 2, 3);
        g.fill();
        g.fillStyle = U.rgba(w.edge, 0.4);
        g.fillRect(cx - R - 3, cy - R - 3, (R + 3) * 2, 1);
        const grd = g.createRadialGradient(cx - 4, cy - 5, 1, cx, cy, R);
        grd.addColorStop(0, U.shade(w.top[0], 0.35));
        grd.addColorStop(0.6, w.top[0]);
        grd.addColorStop(1, U.shade(w.top[0], -0.35));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(cx, cy, R, 0, U.TAU);
        g.fill();
        g.strokeStyle = U.rgba(w.trim || w.edge, 0.7);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(cx, cy, R - 2.5, 0, U.TAU);
        g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3);
          g.lineTo(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3));
          g.stroke();
        }
      },
    },
    entry: {
      floorLike: true, entry: true, mapColor: '#8a7a5a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = U.shade(info.env.wall.top[0], 0.15 - i * 0.07);
          g.fillRect(x + 4, y + 3 + i * 5.4, T - 8, 5);
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x + 4, y + 7.4 + i * 5.4, T - 8, 0.8);
        }
        g.fillStyle = info.env.wall.edge;
        g.fillRect(x + 2, y + 2, 2, T - 4);
        g.fillRect(x + T - 4, y + 2, 2, T - 4);
      },
    },
    exit: {
      floorLike: true, exit: true, mapColor: '#e0b25a',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
        g.fillStyle = '#000';
        g.fillRect(x + 3, y + 3, T - 6, T - 6);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = U.shade(info.env.wall.top[0], -0.1 - i * 0.17);
          g.fillRect(x + 4, y + 4 + i * 5, T - 8, 4);
        }
        g.strokeStyle = info.env.door ? info.env.door.trim : '#c9a046';
        g.lineWidth = 1.5;
        g.strokeRect(x + 2.5, y + 2.5, T - 5, T - 5);
      },
      drawGlow(g, x, y, tx, ty, game, t) {
        LM.gfx.glow(g, x + T / 2, y + T / 2, 34, '#e0b25a', 0.28 + 0.12 * Math.sin(t * 2.2));
        g.strokeStyle = 'rgba(240,200,110,' + (0.35 + 0.25 * Math.sin(t * 3)) + ')';
        g.lineWidth = 1.2;
        for (let i = 0; i < 2; i++) {
          const yy = y + 9 + ((t * 10 + i * 9) % 18);
          g.beginPath();
          g.moveTo(x + 11, yy - 3);
          g.lineTo(x + T / 2, yy);
          g.lineTo(x + T - 11, yy - 3);
          g.stroke();
        }
      },
    },
  };

  const legend = {
    '#': { terrain: 'wall' },
    ' ': { terrain: 'void' },
    '.': { terrain: 'floor' },
    ',': { terrain: 'floor', variant: 1 },
    '+': { terrain: 'door' },
    R: { terrain: 'door-red' },
    Y: { terrain: 'door-gold' },
    V: { terrain: 'door-violet' },
    '~': { terrain: 'water' },
    O: { terrain: 'pit' },
    '^': { terrain: 'spikes' },
    o: { terrain: 'pillar' },
    _: { terrain: 'plate' },
    '%': { terrain: 'slag' },
    '<': { terrain: 'entry' },
    '>': { terrain: 'exit' },
    T: { terrain: 'wall', item: 'wall-torch' },
    $: { item: 'gold' },
    '*': { item: 'crystal' },
    h: { item: 'health-vial' },
    H: { item: 'medkit' },
    a: { item: 'ammo-shells' },
    c: { item: 'chest' },
    t: { item: 'brazier' },
    x: { item: 'crate' },
    b: { item: 'barrel' },
    n: { item: 'table' },
    '-': { item: 'bench' },
    l: { item: 'lectern' },
    E: { item: 'recharge-station' },
    A: { item: 'altar' },
    S: { item: 'slot-machine' },
    W: { item: 'weapon-rack' },
    U: { item: 'armor-stand' },
    F: { item: 'healing-font' },
    k: { item: 'bones' },
    i: { item: 'candles' },
    r: { item: 'key', props: { color: 'red' } },
    y: { item: 'key', props: { color: 'gold' } },
    v: { item: 'key', props: { color: 'violet' } },
    m: { enemy: 'husk' },
    f: { enemy: 'skitter' },
    g: { enemy: 'gunner' },
    M: { enemy: 'brute' },
    p: { enemy: 'lobber' },
    X: { enemy: 'sentry' },
    w: { enemy: 'warden' },
  };

  LM.definePack({ id: 'core', terrain, legend });
})();
