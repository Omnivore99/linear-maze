// Build the map for Chessboard 1 (packs/chessboard/layout.js).
//   node tools/chessboard/build-layout.mjs
//
// Chessboard 1 is the 14th floor again, one level of reality down. This script:
//   1. copies the real office from levels/00-meridian-fourteen.js (columns 37
//      and east; the wrong office and the stone room west of that are left out),
//      at the same coordinates, so placements line up with the 14th floor's;
//   2. moves a few people (Dana runs the meeting, Brenda runs training, Alan
//      sits alone in his office) and swaps the meeting's attendees for named ones;
//   3. adds the new east wing behind a door in reception's east wall: a back
//      hall, a broom closet, the supply desk and supply closet, a lounge, three
//      lost offices, the arrow loop, and the server farm in the middle of it.
// Then it checks that everything that should be reachable is.
//
// Re-run it after changing the 14th floor's map if you want Chessboard 1 to
// follow. Edit the east wing below; edit legends, traps and rooms in
// levels/04-chessboard-one.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let office;
globalThis.LM = { definePack: (p) => { if (p.levels && p.levels['meridian-fourteen']) office = p.levels['meridian-fourteen']; } };
new Function(readFileSync(join(root, 'levels/00-meridian-fourteen.js'), 'utf8'))();

const W = 144, H = 66, CROP = 37;
const map = Array.from({ length: H }, () => Array(W).fill(' '));
const obj = Array.from({ length: H }, () => Array(W).fill(' '));
const setM = (x, y, c) => { map[y][x] = c; };
const setO = (x, y, c) => { obj[y][x] = c; };

// ---------------------------------------------------------------- 1. the office, copied
office.map.forEach((row, y) => { for (let x = CROP; x < row.length && x < W; x++) map[y][x] = row[x]; });
office.objects.forEach((row, y) => { for (let x = CROP; x < row.length && x < W; x++) obj[y][x] = row[x]; });

// ---------------------------------------------------------------- 2. the office, slightly different
setM(37, 22, '#'); // the door that went one way is just wall again
setO(37, 22, 'n');
setM(69, 10, 'Z'); // Vertex's door: Zeno's Paradox, tagged so the meeting can lock it
for (let x = 64; x <= 74; x++) setM(x, 9, 'z'); // inside Zeno's door: the meeting starts here
// the Vertex meeting: named attendees, Dana at the head of the table
[[67, 3, 'α'], [69, 3, 'β'], [71, 3, 'γ'], [67, 6, 'δ'], [69, 6, 'ε'], [71, 6, 'ζ']].forEach(([x, y, c]) => setO(x, y, c));
setO(74, 5, 'Ω');
// Dana is not pacing the open plan; Brenda is not wandering it
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (obj[y][x] === '(' || obj[y][x] === ')') setO(x, y, ' ');
setO(97, 25, 'ß'); // Brenda: the Training Room (formerly the Quiet Room)
setO(97, 18, 'Æ'); // Alan, alone in his office
setO(99, 8, '¢'); // petty cash in Dana's office
// reception's east windows look out on the new wing now
for (const y of [35, 40, 44]) if (obj[y][87] === 'n') setO(87, y, ' ');
setM(87, 39, '+'); // the new door
setO(86, 38, ' ');
setO(67, 45, '@'); // you arrive by elevator, as always
setO(68, 45, '¤'); // the work day (an invisible controller)

// ---------------------------------------------------------------- 3. the east wing
function room(x0, y0, x1, y1, floor) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (edge) { if (map[y][x] === ' ') setM(x, y, '#'); }
      else setM(x, y, floor);
    }
  }
}
const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setM(x, y, c); };

// the back hall: reception (87,39) east to the loop
room(87, 37, 106, 41, 'm');
// broom closet and the lost office above the hall
room(88, 33, 93, 37, 'm');
setM(91, 37, '+');
room(93, 32, 105, 37, '"');
setM(99, 37, '+');
// the supply desk (anteroom) and the supply closet below it
room(87, 41, 98, 47, 'm');
setM(93, 41, '+');
room(87, 47, 98, 52, 'P');
setM(94, 47, '+');
// the lounge: Hilbert's Hotel
room(98, 41, 106, 51, ':');
setM(101, 41, '+');
// the loop around the server farm, and the farm itself
room(106, 32, 143, 59, 'm');
fill(109, 35, 140, 56, '#');
fill(107, 33, 108, 34, '1'); // arrow checkpoints, in order: NW, NE, SE, SW, then back beside the farm
fill(141, 33, 142, 34, '2');
fill(141, 57, 142, 58, '3');
fill(107, 57, 108, 58, '4');
fill(107, 44, 108, 45, '5');
for (const y of [38, 39, 40]) setM(106, y, 'm'); // the hall opens onto the loop
setM(109, 45, 'X'); // where the server farm's door will appear
// lost offices off the loop
room(111, 59, 122, 64, '"');
setM(116, 59, '+');
room(118, 27, 131, 32, '"');
setM(124, 32, '+');

// the server farm: 30 x 20 inside the loop. R = rack. 1-wide gaps are too narrow for Bob.
const FARM = [
  '..............................',
  '..............................',
  '..RRRRRR.RRRRRRR..RRRRRRR.RRRR',
  '..RRRRRR.RRRRRRR..RRRRRRR.RRRR',
  '..............................',
  '..............................',
  'RRRR..RRRRRRRR.RRRRRR..RRRRRRR',
  'RRRR..RRRRRRRR.RRRRRR..RRRRRRR',
  '.RRR..........................',
  '..............................',
  'RRRRRRRR.RRRRRR..RRRRR.RRRR.RR',
  'RRRRRRRR.RRRRRR..RRRRR.RRRR.RR',
  '.......................RR.....',
  '.......................RR.....',
  'RRRRR..RRRRRRR.RRRRRRR.RR.....',
  'RRRRR..RRRRRRR.RRRRRRR.RR.....',
  '.......................RR.....',
  '..............................',
  '.......................RR.....',
  '.......................RR.....',
];
const FX = 110, FY = 36;
FARM.forEach((row, r) => { for (let c = 0; c < row.length; c++) setM(FX + c, FY + r, row[c] === 'R' ? 'R' : 'f'); });
for (let r = 0; r < 20; r++) if (FARM[r][4] !== 'R') setM(FX + 4, FY + r, 'F'); // a line just past the entrance: crossing it wakes Bob
// people and things in the east wing
const O = [
  // broom closet: three brooms, on strike
  [89, 35, 'Б'], [90, 34, 'Г'], [92, 35, 'Д'],
  // the lost office above the hall
  [96, 33, 'q'], [96, 34, 'Ж'], [101, 33, 'q'], [103, 35, 'c'], [98, 36, '%'],
  // supply desk: Gertrude behind her desk, the closet door beside her
  [91, 44, 'Ð'], [91, 45, 'Ψ'],
  // supply closet: shelves and the good stuff
  [88, 48, 'Ш'], [90, 48, 'Ш'], [92, 48, 'Ш'], [96, 50, 'Ç'], [89, 51, 'ж'], [97, 48, 'ж'],
  // the lounge
  [105, 44, 'Ü'], [101, 46, 'o'], [100, 46, '›'], [102, 46, '‹'], [101, 48, 'Л'], [100, 50, 'g'],
  // lost offices off the loop
  [114, 61, 'q'], [114, 62, 'З'], [119, 61, '%'],
  [121, 29, 'И'], [125, 30, 'Й'], [128, 28, 'К'], [123, 28, 'q'], [127, 31, 'c'],
  // the server farm: the technician in the doorway, Bob, the terminal
  [111, 45, 'Т'], [122, 48, 'Ъ'], [138, 51, 'Ŧ'],
];
for (const [x, y, c] of O) setO(x, y, c);

// ---------------------------------------------------------------- 4. checks
const SOLID = new Set(['#', 'R', ' ', '=', 'v', 'h', 'X', 'S', 'o']);
const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || SOLID.has(map[y][x]);
function reach(sx, sy, ok) {
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || !ok(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}
// with the farm door open (as it will be once the arrows are done)
const doorOpen = (x, y) => (x === 109 && y === 45) || !solid(x, y);
const fromStart = reach(67, 45, doorOpen);
const must = { terminal: [138, 51], 'Zeno’s': [69, 5], 'Training Room': [97, 25], 'supply closet': [96, 50], lounge: [104, 44], 'lost office (south)': [114, 62], 'lost office (north)': [125, 30], brooms: [90, 35], 'your desk': [60, 23] };
let bad = 0;
for (const [name, [x, y]] of Object.entries(must)) {
  if (!fromStart.has(x + ',' + y)) { console.log('UNREACHABLE: ' + name + ' at ' + x + ',' + y); bad++; }
}
// Bob is wide: he can only stand where a 2x2 block of floor is open. The terminal's pocket must keep him out.
const wideOk = (x, y) => [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([ax, ay]) => [[0, 0], [1, 0], [0, 1], [1, 1]].every(([bx, by]) => doorOpen(x + ax + bx, y + ay + by)));
const bobArea = reach(122, 48, (x, y) => doorOpen(x, y) && wideOk(x, y) && x >= FX && x < FX + 30 && y >= FY && y < FY + 20);
if (bobArea.has('138,51')) { console.log('Bob can reach the terminal'); bad++; }
if (!bobArea.has('115,45')) { console.log('Bob cannot reach the farm entrance'); bad++; }
console.log('reachable tiles from the elevator: ' + fromStart.size + '; Bob can roam ' + bobArea.size + ' tiles of the farm');

// ---------------------------------------------------------------- 5. write
const rows = (g) => g.map((r) => r.join('').replace(/\s+$/, ''));
const q = (s) => JSON.stringify(s);
const out = `/* The Linear Maze — packs/chessboard/layout.js
 * GENERATED by tools/chessboard/build-layout.mjs. Do not edit by hand:
 * change the script (or the 14th floor) and run  node tools/chessboard/build-layout.mjs
 * Terrain characters are keyed by the legend in levels/04-chessboard-one.js,
 * object characters by its objectLegend.
 */
'use strict';
window.LM = window.LM || {};
LM.CHESSBOARD_LAYOUT = {
  map: [
${rows(map).map((r) => '    ' + q(r) + ',').join('\n')}
  ],
  objects: [
${rows(obj).map((r) => '    ' + q(r) + ',').join('\n')}
  ],
};
`;
writeFileSync(join(root, 'packs/chessboard/layout.js'), out);
const used = new Set(rows(obj).join(''));
used.delete(' ');
console.log('object characters used: ' + [...used].sort().join(''));
console.log(bad ? bad + ' problem(s)' : 'layout OK');
process.exitCode = bad ? 1 : 0;
