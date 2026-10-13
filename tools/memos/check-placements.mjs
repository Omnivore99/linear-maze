// Check the Memos pack's placement lists against the level maps.
//   node tools/memos/check-placements.mjs
// For every wall-mounted placement: the tile must be a wall and the side it
// faces must be open floor. Items placed on the floor must be on open floor.
// Also flags two wall pieces hung on the same side of the same tile.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const levels = {};
const MEMOS = { placements: {}, inboxes: {}, deskToyFloors: {}, notices: {}, toys: {} };
globalThis.window = globalThis;
globalThis.LM = {
  MEMOS,
  util: { hash2: () => 0, dist: () => 0 },
  TILE: 32,
  on() {},
  get: (kind, id) => (kind === 'levels' ? levels[id] : {}),
  definePack(p) {
    Object.assign(levels, p.levels || {});
  },
};
const run = (f) => new Function(readFileSync(join(root, f), 'utf8'))();
for (const f of readdirSync(join(root, 'packs/chessboard')).filter((f) => f === 'layout.js')) run('packs/chessboard/' + f);
for (const f of readdirSync(join(root, 'levels'))) if (f.endsWith('.js')) run('levels/' + f);
run('packs/memos/content.js');
run('packs/memos/placements.js');
if (existsSync(join(root, 'packs/chessboard/placements.js'))) run('packs/chessboard/placements.js');

const SOLID = new Set(['wall', 'void', 'pillar', 'stone-wall', 'stone-pillar', 'glass-h', 'glass-v', 'partition-h', 'partition-v', 'server-rack', 'cb-wall']);
const DEFAULT = { '#': 'wall', ' ': 'void', o: 'pillar', T: 'wall', N: 'wall', R: 'door-red', Y: 'door-gold', V: 'door-violet', '+': 'door' };
const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const WALL_KINDS = new Set(['poster', 'notice', 'board', 'camera']);
let problems = 0;
for (const [lid, list] of Object.entries(MEMOS.placements)) {
  const L = levels[lid];
  if (!L) {
    console.log('?? no level', lid);
    problems++;
    continue;
  }
  const terrainAt = (x, y) => {
    const row = L.map[y] || '';
    const ch = x < row.length ? row[x] : ' ';
    let e = (L.legend || {})[ch];
    if (e === undefined) e = DEFAULT[ch] || 'floor';
    if (typeof e === 'string') return e;
    return e.terrain || 'floor';
  };
  const solid = (x, y) => SOLID.has(terrainAt(x, y));
  const used = new Map();
  for (const [kind, id, x, y, face, props] of list) {
    const label = lid + ' ' + kind + ' ' + (id || '') + ' @' + x + ',' + y + (face ? ' ' + face : '');
    if (WALL_KINDS.has(kind)) {
      const [dx, dy] = FACE[face] || [0, 0];
      const w = kind === 'board' ? (props && props.w) || 3 : 1;
      for (let k = 0; k < w; k++) {
        const tx = x + (dy !== 0 ? k : 0), ty = y + (dx !== 0 ? k : 0);
        if (!solid(tx, ty)) { console.log('NOT A WALL  ', label, '(', terrainAt(tx, ty), ')'); problems++; }
        if (solid(tx + dx, ty + dy)) { console.log('FACES A WALL', label, '(', terrainAt(tx + dx, ty + dy), ')'); problems++; }
        const key = tx + ',' + ty + face;
        if (used.has(key) && kind !== 'camera') { console.log('DOUBLED     ', label, 'with', used.get(key)); problems++; }
        used.set(key, label);
      }
    } else if (solid(x, y)) {
      console.log('IN A WALL   ', label, '(', terrainAt(x, y), ')');
      problems++;
    }
  }
  console.log(lid + ': ' + list.length + ' placements checked');
}
console.log(problems ? problems + ' problem(s)' : 'all placements OK');
process.exitCode = problems ? 1 : 0;
