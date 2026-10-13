/* The Linear Maze — packs/core/environments.js
 * Texture painters (procedural, baked once per chunk) and the three
 * environments of the first iteration. A new environment is a palette plus
 * a choice of painters; a new look is a new painter.
 *
 * Painter signature: paint(g, x, y, info, pal)
 *   g     canvas 2D context, already in world units
 *   x, y  top-left of the tile in world units (tile = LM.TILE = 32)
 *   info  { level, env, x, y (tile coords), rnd() seeded per tile, n(dx,dy) neighbour terrain, variant }
 *   pal   the palette block from the environment (env.floor, env.wall, ...)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  const pickc = (arr, r) => arr[Math.floor(r() * arr.length)];
  function speckle(g, x, y, w, h, n, r, dark, light) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = r() < 0.55 ? dark : light;
      g.fillRect(x + r() * w, y + r() * h, r() < 0.2 ? 1.5 : 0.8, r() < 0.2 ? 1.5 : 0.8);
    }
  }
  function crack(g, x, y, r, col) {
    g.strokeStyle = col;
    g.lineWidth = 0.7;
    g.beginPath();
    let cx = x + 4 + r() * 24, cy = y + 4 + r() * 24;
    g.moveTo(cx, cy);
    const a0 = r() * U.TAU;
    for (let i = 0; i < 4; i++) {
      const a = a0 + (r() - 0.5) * 1.6;
      cx += Math.cos(a) * (3 + r() * 5);
      cy += Math.sin(a) * (3 + r() * 5);
      g.lineTo(U.clamp(cx, x + 1, x + T - 1), U.clamp(cy, y + 1, y + T - 1));
    }
    g.stroke();
  }
  /** Variant of the neighbouring floor tile, or -1 if it isn't the same floor terrain. */
  function nVariant(info, dx, dy) {
    const L = info.level, x = info.x + dx, y = info.y + dy;
    if (!L.inBounds(x, y)) return -1;
    const t = L.terrain[y * L.w + x];
    if (!t.floorLike) return -1;
    return L.variant[y * L.w + x];
  }

  // ======================================================== floor painters
  const textures = {
    flagstone: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.grout;
        g.fillRect(x, y, T, T);
        const layouts = [
          [[0, 0, 32, 32]],
          [[0, 0, 32, 15], [0, 15, 32, 17]],
          [[0, 0, 17, 32], [17, 0, 15, 32]],
          [[0, 0, 20, 13], [20, 0, 12, 13], [0, 13, 13, 19], [13, 13, 19, 19]],
          [[0, 0, 12, 32], [12, 0, 20, 18], [12, 18, 20, 14]],
        ];
        const lay = layouts[Math.floor(r() * layouts.length)];
        for (const [sx, sy, sw, sh] of lay) {
          g.fillStyle = U.shade(pickc(p.colors, r), (r() - 0.5) * 0.14);
          g.fillRect(x + sx + 1, y + sy + 1, sw - 2, sh - 2);
          g.fillStyle = 'rgba(255,255,255,0.06)';
          g.fillRect(x + sx + 1, y + sy + 1, sw - 2, 1);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x + sx + 1, y + sy + sh - 2, sw - 2, 1);
          g.fillRect(x + sx + sw - 2, y + sy + 1, 1, sh - 2);
          speckle(g, x + sx + 1, y + sy + 1, sw - 3, sh - 3, (sw * sh) / 30, r, 'rgba(0,0,0,0.16)', 'rgba(255,255,255,0.06)');
        }
        if (r() < 0.25) crack(g, x, y, r, p.crack);
        if (p.moss && r() < p.mossAmt) {
          const side = Math.floor(r() * 4);
          for (let i = 0; i < 6; i++) {
            const t = r() * T;
            const px = side === 0 ? x + t : side === 1 ? x + T - r() * 6 : side === 2 ? x + t : x + r() * 6;
            const py = side === 0 ? y + r() * 6 : side === 1 ? y + t : side === 2 ? y + T - r() * 6 : y + t;
            g.fillStyle = U.rgba(p.moss, 0.3 + r() * 0.35);
            g.beginPath();
            g.arc(px, py, 1 + r() * 2.6, 0, U.TAU);
            g.fill();
          }
        }
      },
    },
    mosaic: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.grout;
        g.fillRect(x, y, T, T);
        const r = info.rnd;
        for (let j = 0; j < 8; j++) {
          for (let i = 0; i < 8; i++) {
            const wx = info.x * 8 + i, wy = info.y * 8 + j;
            const d = Math.abs((wx % 16) - 7.5) + Math.abs((wy % 16) - 7.5);
            const idx = d < 3.5 ? 2 : d < 6.5 ? 1 : 0;
            const h = U.hash2(wx, wy, 3);
            g.fillStyle = h < 0.06 ? p.grout : U.shade(p.colors[idx], (h - 0.5) * 0.18);
            g.fillRect(x + i * 4 + 0.45, y + j * 4 + 0.45, 3.1, 3.1);
          }
        }
        g.fillStyle = 'rgba(0,0,0,0.18)';
        if (r() < 0.4) {
          g.beginPath();
          g.arc(x + r() * T, y + r() * T, 4 + r() * 6, 0, U.TAU);
          g.fill();
        }
      },
    },
    plates: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        g.fillStyle = p.seam;
        g.fillRect(x, y, T, T);
        const base = p.colors[(info.x * 3 + info.y * 5) % p.colors.length];
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, U.shade(base, 0.07));
        grd.addColorStop(1, U.shade(base, -0.12));
        g.fillStyle = grd;
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        // tread pattern
        g.strokeStyle = 'rgba(255,255,255,0.055)';
        g.lineWidth = 1;
        g.beginPath();
        for (let j = 0; j < 4; j++) {
          for (let i = 0; i < 4; i++) {
            const cx = x + 4 + i * 8, cy = y + 4 + j * 8;
            if ((i + j) % 2) {
              g.moveTo(cx - 2, cy - 1);
              g.lineTo(cx + 2, cy + 1);
            } else {
              g.moveTo(cx - 2, cy + 1);
              g.lineTo(cx + 2, cy - 1);
            }
          }
        }
        g.stroke();
        for (const [cx, cy] of [[3.5, 3.5], [T - 3.5, 3.5], [3.5, T - 3.5], [T - 3.5, T - 3.5]]) {
          g.fillStyle = 'rgba(0,0,0,0.4)';
          g.beginPath();
          g.arc(x + cx + 0.4, y + cy + 0.5, 1.3, 0, U.TAU);
          g.fill();
          g.fillStyle = p.rivet;
          g.beginPath();
          g.arc(x + cx, y + cy, 1.15, 0, U.TAU);
          g.fill();
        }
        if (r() < 0.4) {
          const rx = x + 4 + r() * 24, ry = y + 4 + r() * 24;
          const rg = g.createRadialGradient(rx, ry, 0, rx, ry, 5 + r() * 7);
          rg.addColorStop(0, U.rgba(p.rust, 0.45));
          rg.addColorStop(1, U.rgba(p.rust, 0));
          g.fillStyle = rg;
          g.fillRect(x + 1, y + 1, T - 2, T - 2);
        }
        g.strokeStyle = 'rgba(255,255,255,0.08)';
        g.lineWidth = 0.5;
        for (let i = 0; i < 2; i++) {
          if (r() < 0.6) continue;
          g.beginPath();
          const sx = x + 2 + r() * 28, sy = y + 2 + r() * 28;
          g.moveTo(sx, sy);
          g.lineTo(U.clamp(sx + (r() - 0.5) * 16, x + 1, x + T - 1), U.clamp(sy + (r() - 0.5) * 16, y + 1, y + T - 1));
          g.stroke();
        }
        // hazard stripes next to slag and pits
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const n = info.n(dx, dy);
          if (!n.hazard || n.hazard === 'spikes') continue;
          g.save();
          const bx = dx === 1 ? x + T - 3 : x, by = dy === 1 ? y + T - 3 : y;
          const bw = dx ? 3 : T, bh = dy ? 3 : T;
          g.beginPath();
          g.rect(bx, by, bw, bh);
          g.clip();
          g.fillStyle = p.stripe[1];
          g.fillRect(bx, by, bw, bh);
          g.fillStyle = p.stripe[0];
          for (let s = -T; s < T * 2; s += 6) {
            g.beginPath();
            g.moveTo(x + s, y);
            g.lineTo(x + s + 3, y);
            g.lineTo(x + s + 3 + T, y + T);
            g.lineTo(x + s + T, y + T);
            g.fill();
          }
          g.restore();
        }
      },
    },
    grate: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.under;
        g.fillRect(x, y, T, T);
        const hg = g.createRadialGradient(x + T / 2, y + T / 2, 0, x + T / 2, y + T / 2, T * 0.7);
        hg.addColorStop(0, U.rgba(p.heat, 0.35));
        hg.addColorStop(1, U.rgba(p.heat, 0));
        g.fillStyle = hg;
        g.fillRect(x, y, T, T);
        g.fillStyle = p.bar;
        for (let i = 0; i < 5; i++) {
          g.fillRect(x, y + 2 + i * 7, T, 2.2);
          g.fillRect(x + 2 + i * 7, y, 2.2, T);
        }
        g.fillStyle = 'rgba(255,255,255,0.1)';
        for (let i = 0; i < 5; i++) g.fillRect(x, y + 2 + i * 7, T, 0.6);
        g.strokeStyle = U.shade(p.bar, 0.2);
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      },
    },
    marble: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        const r = info.rnd;
        const base = p.base[Math.floor(U.hash2(Math.floor(info.x / 2), Math.floor(info.y / 2), 7) * p.base.length)];
        const grd = g.createLinearGradient(x, y, x + T, y + T);
        grd.addColorStop(0, U.shade(base, 0.06));
        grd.addColorStop(1, U.shade(base, -0.06));
        g.fillStyle = grd;
        g.fillRect(x, y, T, T);
        g.strokeStyle = U.rgba(p.vein, 0.45);
        for (let i = 0; i < 2; i++) {
          g.lineWidth = 0.4 + r() * 0.8;
          g.beginPath();
          const sx = x + r() * T, sy = y;
          g.moveTo(sx, sy);
          g.bezierCurveTo(x + r() * T, y + T * 0.33, x + r() * T, y + T * 0.66, x + r() * T, y + T);
          g.stroke();
        }
        // slab joints on every second tile edge
        g.fillStyle = 'rgba(0,0,0,0.28)';
        if (info.x % 2 === 0) g.fillRect(x, y, 0.8, T);
        if (info.y % 2 === 0) g.fillRect(x, y, T, 0.8);
        // gold inlay diamonds at shared corners
        const cxs = [[0, 0], [T, 0], [0, T], [T, T]];
        g.save();
        g.beginPath();
        g.rect(x, y, T, T);
        g.clip();
        for (const [ox, oy] of cxs) {
          const cx = info.x + ox / T, cy = info.y + oy / T;
          if ((cx + cy) % 4 !== 0 || cx % 2 !== 0) continue;
          g.fillStyle = p.inlay;
          g.beginPath();
          g.moveTo(x + ox, y + oy - 5);
          g.lineTo(x + ox + 5, y + oy);
          g.lineTo(x + ox, y + oy + 5);
          g.lineTo(x + ox - 5, y + oy);
          g.closePath();
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.3)';
          g.fillRect(x + ox - 0.5, y + oy - 3, 1, 1.5);
        }
        g.restore();
      },
    },
    carpet: {
      kind: 'floor',
      paint(g, x, y, info, p) {
        g.fillStyle = p.base;
        g.fillRect(x, y, T, T);
        g.fillStyle = p.pattern;
        for (let j = 0; j < 2; j++) {
          for (let i = 0; i < 2; i++) {
            const cx = x + 8 + i * 16, cy = y + 8 + j * 16;
            g.beginPath();
            g.moveTo(cx, cy - 4);
            g.lineTo(cx + 4, cy);
            g.lineTo(cx, cy + 4);
            g.lineTo(cx - 4, cy);
            g.closePath();
            g.fill();
          }
        }
        speckle(g, x, y, T, T, 18, info.rnd, 'rgba(0,0,0,0.15)', 'rgba(255,220,200,0.05)');
        const v = info.variant;
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          if (nVariant(info, dx, dy) === v) continue;
          const bx = dx === 1 ? x + T - 5 : dx === -1 ? x + 2 : x;
          const by = dy === 1 ? y + T - 5 : dy === -1 ? y + 2 : y;
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(dx === 1 ? x + T - 2 : dx === -1 ? x : x, dy === 1 ? y + T - 2 : dy === -1 ? y : y, dx ? 2 : T, dy ? 2 : T);
          g.fillStyle = p.border;
          g.fillRect(bx, by, dx ? 1.6 : T, dy ? 1.6 : T);
        }
      },
    },

    // ==================================================== wall top painters
    brick: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.mortar;
        g.fillRect(x, y, T, h);
        for (let row = 0; row * 8 < h; row++) {
          const off = (info.y * 4 + row) % 2 ? 8 : 0;
          for (let c = -1; c < 3; c++) {
            const bx = x - off + c * 16 + 0.6, by = y + row * 8 + 0.6;
            g.fillStyle = U.shade(pickc(p.top, r), (r() - 0.5) * 0.16);
            g.fillRect(bx, by, 14.8, 6.8);
            g.fillStyle = 'rgba(255,255,255,0.07)';
            g.fillRect(bx, by, 14.8, 0.8);
          }
        }
        if (p.moss && r() < 0.3) {
          for (let i = 0; i < 5; i++) {
            g.fillStyle = U.rgba(p.moss, 0.4 + r() * 0.4);
            g.beginPath();
            g.arc(x + r() * T, y + r() * h, 0.8 + r() * 1.8, 0, U.TAU);
            g.fill();
          }
        }
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, p.faceDark);
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y + fh * 0.5, T, 0.7);
        const off = info.x % 2 ? 8 : 0;
        for (let c = 0; c < 3; c++) g.fillRect(x + off + c * 16 - 0.35, y, 0.7, fh * 0.5);
        for (let c = 0; c < 3; c++) g.fillRect(x + ((off + 8) % 16) + c * 16 - 0.35, y + fh * 0.5, 0.7, fh * 0.5);
      },
    },
    bulkhead: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        const grd = g.createLinearGradient(x, y, x + T, y + h);
        grd.addColorStop(0, U.shade(pickc(p.top, r), 0.05));
        grd.addColorStop(1, U.shade(p.top[0], -0.12));
        g.fillStyle = grd;
        g.fillRect(x, y, T, h);
        g.strokeStyle = p.seam;
        g.lineWidth = 1;
        g.strokeRect(x + 2.5, y + 2.5, T - 5, h - 5);
        g.fillStyle = p.bolt;
        for (const [bx, by] of [[5, 5], [T - 5, 5], [5, h - 5], [T - 5, h - 5]]) {
          g.beginPath();
          g.arc(x + bx, y + by, 1.1, 0, U.TAU);
          g.fill();
        }
        if (r() < 0.35) {
          g.strokeStyle = 'rgba(0,0,0,0.25)';
          g.beginPath();
          g.moveTo(x + 4, y + 4);
          g.lineTo(x + T - 4, y + h - 4);
          g.moveTo(x + T - 4, y + 4);
          g.lineTo(x + 4, y + h - 4);
          g.stroke();
        }
        if (r() < 0.4) {
          const sx = x + 4 + r() * 24;
          const rg = g.createLinearGradient(sx, y, sx, y + h);
          rg.addColorStop(0, U.rgba(p.rust, 0.5));
          rg.addColorStop(1, U.rgba(p.rust, 0));
          g.fillStyle = rg;
          g.fillRect(sx, y + 2, 2 + r() * 2, h - 4);
        }
      },
      face(g, x, y, fh, info, p) {
        g.fillStyle = p.face;
        g.fillRect(x, y, T, fh);
        if (U.hash2(info.x, info.y, 11) < 0.35) {
          g.save();
          g.beginPath();
          g.rect(x, y + 1, T, fh - 2);
          g.clip();
          g.fillStyle = p.stripe[1];
          g.fillRect(x, y, T, fh);
          g.fillStyle = p.stripe[0];
          for (let s = -fh; s < T + fh; s += 6) {
            g.beginPath();
            g.moveTo(x + s, y + fh);
            g.lineTo(x + s + 3, y + fh);
            g.lineTo(x + s + 3 + fh, y);
            g.lineTo(x + s + fh, y);
            g.fill();
          }
          g.restore();
        } else {
          g.fillStyle = 'rgba(0,0,0,0.5)';
          for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 7, y + 3, 4, 1.4);
          for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 7, y + 6, 4, 1.4);
        }
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(x, y + fh - 1.5, T, 1.5);
      },
    },
    ashlar: {
      kind: 'wall',
      top(g, x, y, h, info, p) {
        const r = info.rnd;
        g.fillStyle = p.joint;
        g.fillRect(x, y, T, h);
        const split = info.y % 2 ? 14 : 18;
        const blocks = [[0, 0, split, h / 2], [split, 0, T - split, h / 2], [0, h / 2, T - split, h / 2], [T - split, h / 2, split, h / 2]];
        for (const [bx, by, bw, bh] of blocks) {
          const c = pickc(p.top, r);
          const grd = g.createLinearGradient(x + bx, y + by, x + bx + bw, y + by + bh);
          grd.addColorStop(0, U.shade(c, 0.08));
          grd.addColorStop(1, U.shade(c, -0.08));
          g.fillStyle = grd;
          g.fillRect(x + bx + 0.5, y + by + 0.5, bw - 1, bh - 1);
        }
        speckle(g, x, y, T, h, 10, r, 'rgba(0,0,0,0.1)', 'rgba(255,255,255,0.08)');
      },
      face(g, x, y, fh, info, p) {
        const grd = g.createLinearGradient(x, y, x, y + fh);
        grd.addColorStop(0, p.face);
        grd.addColorStop(1, U.shade(p.face, -0.45));
        g.fillStyle = grd;
        g.fillRect(x, y, T, fh);
        g.fillStyle = p.trim;
        g.fillRect(x, y + 1.2, T, 1);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        if (info.x % 2 === 0) g.fillRect(x, y + 2, 0.8, fh - 2);
      },
    },
  };

  /** Shared wall routine: top face, lips on exposed edges, and a front face when the south side is open. */
  LM.paintWall = function (g, x, y, info, palette) {
    const env = info.env, p = palette || env.wall;
    const painter = LM.get('textures', p.style);
    const open = (dx, dy) => !info.n(dx, dy).tall;
    const south = open(0, 1);
    const fh = south ? 9 : 0;
    painter.top(g, x, y, T - fh, info, p);
    const lip = p.edge;
    g.fillStyle = lip;
    if (open(0, -1)) g.fillRect(x, y, T, 1.4);
    if (open(-1, 0)) g.fillRect(x, y, 1.4, T - fh);
    if (open(1, 0)) g.fillRect(x + T - 1.4, y, 1.4, T - fh);
    if (south) {
      g.fillStyle = lip;
      g.fillRect(x, y + T - fh - 1.2, T, 1.2);
      painter.face(g, x, y + T - fh, fh, info, p);
    }
    // a faint inner gradient so wall masses read as solid
    if (p.trim && (open(0, -1) || open(-1, 0) || open(1, 0))) {
      g.fillStyle = U.rgba(p.trim, 0.55);
      if (open(0, -1)) g.fillRect(x, y + 2.4, T, 0.8);
      if (open(-1, 0)) g.fillRect(x + 2.4, y, 0.8, T - fh);
      if (open(1, 0)) g.fillRect(x + T - 3.2, y, 0.8, T - fh);
    }
  };
  /** Bake the environment floor for this tile (honours the tile's floor variant). */
  LM.paintFloor = function (g, x, y, info) {
    const env = info.env;
    // env.floors[n] (any number of variants) wins; otherwise variant 1 uses floorAlt
    const p = (env.floors && env.floors[info.variant]) || (info.variant && env.floorAlt ? env.floorAlt : env.floor);
    LM.get('textures', p.style).paint(g, x, y, info, p);
  };

  // ======================================================== environments
  const environments = {
    cloister: {
      name: 'Sunken Cloister',
      voidColor: '#050709',
      ambient: '#2c3640',
      attractAmbient: '#46525c',
      outsideSight: '#3c4248',
      playerLight: '#ffe9c8',
      floor: { style: 'flagstone', colors: ['#5c5f56', '#55594f', '#4e534a', '#615f55'], grout: '#22251f', crack: '#262822', moss: '#5f7d3c', mossAmt: 0.32 },
      floorAlt: { style: 'mosaic', colors: ['#5d4e3c', '#3f5a55', '#8a7656'], grout: '#24201a' },
      wall: { style: 'brick', top: ['#6b655a', '#645e53', '#5d574c'], mortar: '#38342d', edge: '#9a917f', face: '#3a352e', faceDark: '#1b1915', moss: '#55723a' },
      water: { deep: '#0d3440', shallow: '#1e5c68', foam: '#9fdcdf' },
      pit: { core: '#020303', wall: '#1d201c', rim: '#3b3d36' },
      door: { panel: '#5b4630', frame: '#2b241d', trim: '#8d7150' },
      torch: '#ffa458',
      particles: { type: 'mote', color: '#dbe4c8', rate: 9, alpha: 0.35, drift: 6 },
      ambience: { base: 49, cutoff: 220, wind: 340, gain: 0.05 },
    },
    foundry: {
      name: 'Ember Foundry',
      voidColor: '#070504',
      ambient: '#3c2c28',
      attractAmbient: '#5a423a',
      outsideSight: '#423834',
      playerLight: '#fff0d8',
      floor: { style: 'plates', colors: ['#4c4f54', '#46494e', '#52555a'], seam: '#1c1e21', rivet: '#8a8f96', rust: '#8a4a26', stripe: ['#d9a32a', '#16161a'] },
      floorAlt: { style: 'grate', bar: '#3c3e43', under: '#140906', heat: '#ff5a1a' },
      wall: { style: 'bulkhead', top: ['#3e4147', '#393c42', '#43464c'], seam: '#1b1d21', bolt: '#757a82', rust: '#7a3f20', edge: '#868c95', face: '#222428', stripe: ['#d9a32a', '#141418'] },
      water: { deep: '#0f3836', shallow: '#1f6a5f', foam: '#a6f2da' },
      pit: { core: '#040302', wall: '#1f1a17', rim: '#3a3330' },
      slag: { crust: '#2b1710', crust2: '#3a1d12', glow: '#ff6a1f', hot: '#ffd27a' },
      door: { panel: '#4a4d52', frame: '#1d1f23', trim: '#d9a32a' },
      torch: '#ff9a4a',
      particles: { type: 'ember', color: '#ff8a3a', rate: 5, alpha: 0.6, drift: 6, windY: -14, size: 0.7 },
      ambience: { base: 41, cutoff: 300, wind: 520, gain: 0.06, wave: 'sawtooth' },
    },
    reliquary: {
      name: 'Gilded Reliquary',
      voidColor: '#060509',
      ambient: '#302a3e',
      attractAmbient: '#4c4460',
      outsideSight: '#3e3a48',
      playerLight: '#f7efff',
      floor: { style: 'marble', base: ['#8f8b84', '#87837c', '#938f88', '#7f7b75'], vein: '#55524d', inlay: '#c9a046' },
      floorAlt: { style: 'carpet', base: '#5c1a26', pattern: '#72242f', border: '#d2a24a' },
      wall: { style: 'ashlar', top: ['#a29c90', '#9a9488', '#958f84'], joint: '#5d5850', edge: '#e4d4a6', face: '#4e4a43', trim: '#d2a24a' },
      water: { deep: '#1a2a4c', shallow: '#38558a', foam: '#d6e4ff' },
      pit: { core: '#030206', wall: '#1c1a22', rim: '#45404e' },
      door: { panel: '#5a3e1e', frame: '#2a1e10', trim: '#e0b25a' },
      torch: '#ffc070',
      particles: { type: 'mote', color: '#f2d48a', rate: 8, alpha: 0.45, drift: 5 },
      ambience: { base: 55, cutoff: 260, wind: 700, gain: 0.045, wave: 'triangle' },
    },
  };

  LM.definePack({ id: 'core', name: 'Core', version: '0.1.0', textures, environments });
})();
