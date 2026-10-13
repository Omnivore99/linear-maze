/* The Linear Maze — engine/physics.js
 * Circle-vs-tile collision with sliding, grid ray casting (shots, sight,
 * light), and visibility polygons used for line-of-sight and lighting.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE, U = LM.util;
  const P = (LM.physics = {});

  // ------------------------------------------------------------ collision
  function resolve(level, e) {
    let hit = false;
    const r = e.r;
    const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T);
    const y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const d = level.t(tx, ty);
        const dyn = level.dynAt(tx, ty) === 1;
        if (!d.solid && !dyn) continue;
        if (e.passHazard && !dyn && d.hazard) continue;
        if (d.rect && !dyn) {
          const rx = tx * T + d.rect[0], ry = ty * T + d.rect[1];
          const px = U.clamp(e.x, rx, rx + d.rect[2]), py = U.clamp(e.y, ry, ry + d.rect[3]);
          const dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            const dd = Math.sqrt(d2) || 0.001;
            if (d2 > 1e-6) {
              e.x += (dx / dd) * (r - dd);
              e.y += (dy / dd) * (r - dd);
            } else if (d.rect[2] > d.rect[3]) e.y = e.y < ry + d.rect[3] / 2 ? ry - r : ry + d.rect[3] + r;
            else e.x = e.x < rx + d.rect[2] / 2 ? rx - r : rx + d.rect[2] + r;
            hit = true;
          }
        } else if (d.shape === 'circle' && !dyn) {
          const cx = tx * T + T / 2, cy = ty * T + T / 2, rr = d.radius + r;
          const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
          if (d2 < rr * rr) {
            const dd = Math.sqrt(d2) || 0.001;
            e.x += (dx / dd) * (rr - dd);
            e.y += (dy / dd) * (rr - dd);
            hit = true;
          }
        } else {
          const rx = tx * T, ry = ty * T;
          const px = U.clamp(e.x, rx, rx + T), py = U.clamp(e.y, ry, ry + T);
          const dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            if (d2 > 1e-6) {
              const dd = Math.sqrt(d2);
              e.x += (dx / dd) * (r - dd);
              e.y += (dy / dd) * (r - dd);
            } else {
              const l = e.x - rx, rr2 = rx + T - e.x, tp = e.y - ry, bt = ry + T - e.y;
              const m = Math.min(l, rr2, tp, bt);
              if (m === l) e.x = rx - r;
              else if (m === rr2) e.x = rx + T + r;
              else if (m === tp) e.y = ry - r;
              else e.y = ry + T + r;
            }
            hit = true;
          }
        }
      }
    }
    return hit;
  }
  P.resolve = resolve;

  /** Move a circle entity by (dx, dy), sliding along walls. Returns true if it touched a wall. */
  P.move = function (level, e, dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7));
    const sx = dx / steps, sy = dy / steps;
    let hit = false;
    for (let i = 0; i < steps; i++) {
      e.x += sx;
      if (resolve(level, e)) hit = true;
      e.y += sy;
      if (resolve(level, e)) hit = true;
    }
    return hit;
  };

  /** Is the point inside something that stops bullets? */
  P.pointBlocksShot = function (level, x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    const d = level.t(tx, ty);
    if (level.dynAt(tx, ty) === 1) return true;
    if (!d.blocksShots) return false;
    if (d.rect) {
      const rx = tx * T + d.rect[0], ry = ty * T + d.rect[1];
      return x >= rx && x <= rx + d.rect[2] && y >= ry && y <= ry + d.rect[3];
    }
    if (d.shape === 'circle') {
      const cx = tx * T + T / 2, cy = ty * T + T / 2;
      return U.dist2(x, y, cx, cy) < d.radius * d.radius;
    }
    return true;
  };

  // ------------------------------------------------------------ ray casting
  function rayCircle(ox, oy, dx, dy, cx, cy, r) {
    const fx = ox - cx, fy = oy - cy;
    const b = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - r * r;
    if (c < 0) return 0;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : -1;
  }

  const out = { t: 0, wall: false, tx: 0, ty: 0 };
  /** DDA ray march. mode: 'light' | 'shot'. Writes into `out`, returns distance. */
  function cast(level, ox, oy, dx, dy, maxDist, mode) {
    let tx = Math.floor(ox / T), ty = Math.floor(oy / T);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(T / dx) : Infinity;
    const tDY = dy !== 0 ? Math.abs(T / dy) : Infinity;
    let tMX = dx > 0 ? ((tx + 1) * T - ox) / dx : dx < 0 ? (tx * T - ox) / dx : Infinity;
    let tMY = dy > 0 ? ((ty + 1) * T - oy) / dy : dy < 0 ? (ty * T - oy) / dy : Infinity;
    let t = 0;
    const light = mode === 'light';
    for (let i = 0; i < 400; i++) {
      if (t > maxDist) break;
      const d = level.t(tx, ty);
      const dyn = level.dynAt(tx, ty) === 1;
      const blocks = dyn || (light ? d.blocksLight : d.blocksShots);
      if (blocks) {
        if (d.shape === 'circle' && !dyn) {
          const ht = rayCircle(ox, oy, dx, dy, tx * T + T / 2, ty * T + T / 2, d.radius);
          if (ht >= 0 && ht <= Math.min(tMX, tMY) + 0.01) {
            out.t = Math.min(ht, maxDist);
            out.wall = false;
            out.tx = tx;
            out.ty = ty;
            return out.t;
          }
        } else if (i > 0 || !light) {
          out.t = Math.min(t, maxDist);
          out.wall = t <= maxDist;
          out.tx = tx;
          out.ty = ty;
          return out.t;
        }
      }
      if (tMX < tMY) {
        t = tMX;
        tMX += tDX;
        tx += stepX;
      } else {
        t = tMY;
        tMY += tDY;
        ty += stepY;
      }
    }
    out.t = maxDist;
    out.wall = false;
    return maxDist;
  }
  P.cast = cast;
  P.castOut = out;

  /** True if nothing blocks sight between the two points. */
  P.los = function (level, ax, ay, bx, by, mode) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    if (d < 1) return true;
    cast(level, ax, ay, dx / d, dy / d, d, mode || 'light');
    return out.t >= d - 0.5;
  };

  // ------------------------------------------------------------ visibility polygon
  let stamp = 1, cornerMark = null, cornerW = 0;
  const angles = [];
  /**
   * Returns a flat array [x0,y0,x1,y1,...] tracing what a light (or eye) at
   * (ox, oy) can see within `radius`. Rays are aimed at every exposed wall
   * corner and pillar edge so shadows stay crisp. `extend` pushes the edge a
   * few units into walls so their faces read as lit.
   */
  P.visibility = function (level, ox, oy, radius, opts) {
    const o = opts || {};
    const uniform = o.uniform || 180;
    const extend = o.extend || 0;
    const EPS = 0.00035;
    angles.length = 0;
    for (let i = 0; i < uniform; i++) angles.push((i / uniform) * U.TAU - Math.PI);
    const cw = level.w + 1;
    if (!cornerMark || cornerW !== cw || cornerMark.length !== cw * (level.h + 1)) {
      cornerMark = new Uint32Array(cw * (level.h + 1));
      cornerW = cw;
    }
    stamp++;
    const x0 = Math.max(0, Math.floor((ox - radius) / T)), x1 = Math.min(level.w - 1, Math.floor((ox + radius) / T));
    const y0 = Math.max(0, Math.floor((oy - radius) / T)), y1 = Math.min(level.h - 1, Math.floor((oy + radius) / T));
    const r2 = radius * radius;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!level.blocksLight(tx, ty)) continue;
        const d = level.t(tx, ty);
        if (d.shape === 'circle' && level.dynAt(tx, ty) !== 1) {
          const cx = tx * T + T / 2, cy = ty * T + T / 2;
          const dd = Math.hypot(cx - ox, cy - oy);
          if (dd > d.radius + 1 && dd < radius + d.radius) {
            const a = Math.atan2(cy - oy, cx - ox), da = Math.asin(d.radius / dd);
            angles.push(a - da - EPS * 3, a - da + EPS * 3, a + da - EPS * 3, a + da + EPS * 3);
          }
          continue;
        }
        if (
          level.blocksLight(tx - 1, ty) && level.blocksLight(tx + 1, ty) &&
          level.blocksLight(tx, ty - 1) && level.blocksLight(tx, ty + 1)
        ) continue;
        for (let k = 0; k < 4; k++) {
          const cx = tx + (k & 1), cy = ty + (k >> 1);
          const ci = cy * cw + cx;
          if (cornerMark[ci] === stamp) continue;
          cornerMark[ci] = stamp;
          const wx = cx * T, wy = cy * T;
          if (U.dist2(wx, wy, ox, oy) > r2) continue;
          const a = Math.atan2(wy - oy, wx - ox);
          angles.push(a - EPS, a + EPS);
        }
      }
    }
    angles.sort((a, b) => a - b);
    const pts = new Float32Array(angles.length * 2);
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i], dx = Math.cos(a), dy = Math.sin(a);
      let t = cast(level, ox, oy, dx, dy, radius, 'light');
      if (out.wall && extend) t = Math.min(t + extend, radius);
      pts[i * 2] = ox + dx * t;
      pts[i * 2 + 1] = oy + dy * t;
    }
    return pts;
  };

  /** Mark tiles inside a visibility polygon's bounding rays as explored (cheap approximation). */
  P.markExplored = function (level, ox, oy, pts) {
    const ex = level.explored, w = level.w;
    for (let i = 0; i < pts.length; i += 8) {
      const px = pts[i], py = pts[i + 1];
      const dx = px - ox, dy = py - oy, d = Math.hypot(dx, dy);
      const steps = Math.ceil(d / (T * 0.5));
      for (let s = 0; s <= steps; s++) {
        const x = Math.floor((ox + (dx * s) / steps) / T), y = Math.floor((oy + (dy * s) / steps) / T);
        if (x >= 0 && y >= 0 && x < w && y < level.h) ex[y * w + x] = 1;
      }
      // reveal the wall tile the ray stopped in, plus its neighbours
      const hx = Math.floor((px + dx / (d || 1) * 4) / T), hy = Math.floor((py + dy / (d || 1) * 4) / T);
      if (hx >= 0 && hy >= 0 && hx < w && hy < level.h) ex[hy * w + hx] = 1;
    }
  };
})();
