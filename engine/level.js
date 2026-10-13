/* The Linear Maze — engine/level.js
 * Turns a level definition (ASCII map + legend + traps + rooms) into a tile
 * grid the rest of the engine can query, and builds the enemy flow field.
 */
'use strict';
(function () {
  const LM = window.LM, T = LM.TILE;

  class Level {
    constructor(def) {
      this.def = def;
      this.id = def.id;
      this.name = def.name;
      this.env = LM.get('environments', def.environment);
      const rows = def.map;
      this.h = rows.length;
      this.w = rows.reduce((m, r) => Math.max(m, r.length), 0);
      const n = (this.n = this.w * this.h);
      this.terrain = new Array(n);
      this.dyn = new Uint8Array(n); // 1 = blocked by a closed door
      this.doorAt = new Array(n); // Door entity per tile, if any
      this.explored = new Uint8Array(n);
      this.variant = new Uint8Array(n); // floor variant (room floors)
      this.tags = {};
      this.spawns = [];
      this.start = null;
      this.seed = LM.util.strHash(def.id || 'level');

      const legend = Object.assign({}, LM.registry.legend, def.legend || {});
      const VOID = LM.get('terrain', 'void');
      for (let y = 0; y < this.h; y++) {
        const row = rows[y];
        for (let x = 0; x < this.w; x++) {
          const ch = x < row.length ? row[x] : ' ';
          let e = legend[ch];
          if (e === undefined) {
            console.warn('[LM] Unknown map character "' + ch + '" in ' + def.id + ' at ' + x + ',' + y);
            e = { terrain: 'floor' };
          }
          if (typeof e === 'string') e = { terrain: e };
          const tId = e.terrain || 'floor';
          const td = LM.find('terrain', tId) || VOID;
          const i = y * this.w + x;
          this.terrain[i] = td;
          if (e.variant) this.variant[i] = e.variant;
          if (e.tag) (this.tags[e.tag] = this.tags[e.tag] || []).push({ x, y });
          if (td.entry || e.start) this.start = { x, y };
          if (td.door) this.spawns.push({ kind: 'door', x, y, lock: td.door.lock || null, style: td.door.style, sealed: td.door.sealed, tag: e.tag, props: e.props || {} });
          this.addSpawns(e, x, y);
        }
      }
      // optional second layer: furniture, people and pickups drawn over the terrain map
      if (def.objects) {
        const ol = def.objectLegend || {};
        def.objects.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const ch = row[x];
            if (ch === ' ' || ch === '.') continue;
            let e = ol[ch];
            if (e === undefined) {
              console.warn('[LM] Unknown object character "' + ch + '" in ' + def.id + ' at ' + x + ',' + y);
              continue;
            }
            // a bare id names whatever it is registered as: an item, an NPC or an enemy
            if (typeof e === 'string') e = LM.find('items', e) ? { item: e } : LM.find('npcs', e) ? { npc: e } : LM.find('enemies', e) ? { enemy: e } : { item: e };
            if (e.tag) (this.tags[e.tag] = this.tags[e.tag] || []).push({ x, y });
            if (e.start) this.start = { x, y };
            this.addSpawns(e, x, y);
          }
        });
      }
      if (!this.start) {
        console.warn('[LM] Level ' + def.id + ' has no entry ("<"); using first floor tile');
        for (let i = 0; i < n && !this.start; i++) if (!this.terrain[i].solid) this.start = { x: i % this.w, y: Math.floor(i / this.w) };
      }
      this.rooms = (def.rooms || []).map((r) => ({ name: r.name, rect: r.rect, visited: false, note: r.note }));
      LM.nav.init(this);
    }
    addSpawns(e, x, y) {
      if (e.item) this.spawns.push({ kind: 'item', id: e.item, x, y, props: e.props || {}, tag: e.tag });
      if (e.enemy) this.spawns.push({ kind: 'enemy', id: e.enemy, x, y, props: e.props || {}, tag: e.tag });
      if (e.npc) this.spawns.push({ kind: 'npc', id: e.npc, x, y, props: e.props || {}, tag: e.tag });
    }
    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }
    idx(x, y) {
      return y * this.w + x;
    }
    t(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return LM.registry.terrain.void;
      return this.terrain[y * this.w + x];
    }
    dynAt(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
      return this.dyn[y * this.w + x];
    }
    solidAt(x, y) {
      return this.t(x, y).solid || this.dynAt(x, y) === 1;
    }
    blocksShot(x, y) {
      return this.t(x, y).blocksShots || this.dynAt(x, y) === 1;
    }
    blocksLight(x, y) {
      return this.t(x, y).blocksLight || this.dynAt(x, y) === 1;
    }
    tileAtWorld(px, py) {
      return this.t(Math.floor(px / T), Math.floor(py / T));
    }
    center(tx, ty) {
      return { x: tx * T + T / 2, y: ty * T + T / 2 };
    }
    roomAt(px, py) {
      const tx = px / T, ty = py / T;
      for (const r of this.rooms) {
        const [x, y, w, h] = r.rect;
        if (tx >= x && ty >= y && tx < x + w && ty < y + h) return r;
      }
      return null;
    }
  }
  LM.Level = Level;

  // ------------------------------------------------------------------ nav
  // A breadth-first flow field from the player's tile. Enemies that cannot
  // see the player walk downhill on it, which handles any maze shape.
  const NAV = (LM.nav = {});
  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  NAV.init = function (level) {
    level.navDist = new Int16Array(level.n).fill(-1);
    level.navQueue = new Int32Array(level.n);
    level.navFrom = -1;
    level.navDirty = true;
  };
  NAV.passable = function (level, x, y) {
    if (!level.inBounds(x, y)) return false;
    const i = y * level.w + x;
    const d = level.terrain[i];
    if (d.solid || d.hazard) return false;
    const door = level.doorAt[i];
    if (door && door.blocking && (door.lock || door.sealed)) return false;
    return true;
  };
  NAV.compute = function (level, sx, sy, maxDist) {
    const dist = level.navDist, q = level.navQueue, w = level.w;
    dist.fill(-1);
    if (!level.inBounds(sx, sy)) return;
    let head = 0, tail = 0;
    const s = sy * w + sx;
    dist[s] = 0;
    q[tail++] = s;
    const lim = maxDist || 70;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % w, cy = (cur - cx) / w;
      const cd = dist[cur];
      if (cd >= lim) continue;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DIRS[k][0], ny = cy + DIRS[k][1];
        if (!NAV.passable(level, nx, ny)) continue;
        if (k >= 4 && (!NAV.passable(level, cx + DIRS[k][0], cy) || !NAV.passable(level, cx, cy + DIRS[k][1]))) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = cd + 1;
        q[tail++] = ni;
      }
    }
    level.navFrom = s;
    level.navDirty = false;
  };
  NAV.distAt = function (level, px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return -1;
    return level.navDist[y * level.w + x];
  };
  /** Unit vector pointing downhill on the flow field, or null. */
  NAV.dir = function (level, px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!level.inBounds(x, y)) return null;
    const w = level.w, dist = level.navDist;
    const here = dist[y * w + x];
    let best = here < 0 ? 32767 : here, bx = -1, by = -1;
    for (let k = 0; k < 8; k++) {
      const nx = x + DIRS[k][0], ny = y + DIRS[k][1];
      if (!level.inBounds(nx, ny)) continue;
      const d = dist[ny * w + nx];
      if (d < 0) continue;
      if (k >= 4 && (!NAV.passable(level, x + DIRS[k][0], y) || !NAV.passable(level, x, y + DIRS[k][1]))) continue;
      if (d < best) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (bx < 0) return null;
    const tx = bx * T + T / 2 - px, ty = by * T + T / 2 - py;
    const l = Math.hypot(tx, ty) || 1;
    return { x: tx / l, y: ty / l };
  };
})();
