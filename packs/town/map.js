/* The Linear Maze — packs/town/map.js
 * Town pack, part 3: the Town Map, and the search for Alice.
 *
 * The level 'town-map' is a tiny room you never see: while you're on it, a drawn map of the town
 * covers the screen. Pins mark the places you and Alice went together (TOWN.PLACES).
 *   blue  a place you can get to: the next one along from somewhere you've been (TOWN.PLACES links)
 *   red   too far for now: you'd have to go past a nearer place first
 * Click a blue pin: VISIT <PLACE>? with a note about when you were there with Alice; Visit loads the
 * place's level. Every place has a town-door that brings you back here.
 *
 * A town place is any level with town: { id, name, in?, notHere? } (in: 'at the gas station', for the
 * "ALICE is NOT ..." note; notHere: what it says), and optionally town.after: a flag that must be set
 * before the place counts as searched.
 * Flags: townPlaque (read the plaque), visited-<place id>, searched-<level id>
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const h = (...a) => LM.ui.h(...a);
  const TOWN = (LM.TOWN = LM.TOWN || {});
  const MEMOS = LM.MEMOS;

  // ------------------------------------------------------------ the places (x, y on a 1000 × 640 map)
  TOWN.PLACES = [
    { id: 'coffee', level: 'town-coffee', name: 'Coffee Shop', note: 'We used to get coffee here before work.', x: 150, y: 430, links: ['booknook', 'gas'] },
    { id: 'booknook', level: 'town-booknook', name: 'Book Nook', sub: 'Used Bookstore', note: 'Alice liked to read real books and browse.', x: 250, y: 280, links: ['coffee', 'gas'] },
    { id: 'gas', level: 'town-gas', name: 'Falcon Gas', note: 'Alice fueled up her car here.', x: 380, y: 440, links: ['coffee', 'booknook', 'movie', 'hospital', 'park'] },
    { id: 'movie', level: 'town-movie', name: 'Movie Theater', note: 'We saw one of those cartoon movies here.', x: 520, y: 250, links: ['gas', 'hospital', 'park', 'headshop'] },
    { id: 'hospital', level: 'town-hospital', name: 'Hospital', note: 'Alice drove me here when I cut my foot.', x: 560, y: 500, links: ['gas', 'movie', 'park', 'police'] },
    { id: 'park', level: 'town-park', name: 'Forking Paths Park', note: 'Alice jogged here. I went a few times.', x: 680, y: 360, links: ['gas', 'movie', 'hospital', 'vhs', 'donuts'] },
    { id: 'headshop', level: 'town-headshop', name: 'Headshop', note: 'We went in here once because she wanted incense.', x: 760, y: 150, links: ['movie', 'vhs'] },
    { id: 'vhs', level: 'town-vhs', name: 'VHS Rental', note: 'The last one, I think. Alice had a VHS player and loved using it.', x: 880, y: 270, links: ['park', 'headshop', 'donuts'] },
    { id: 'donuts', level: 'town-donuts', name: 'Donuts Plus', note: 'Alice enjoyed a good donut.', x: 860, y: 450, links: ['park', 'vhs', 'police'] },
    { id: 'police', level: 'town-police', name: 'Police Station', note: 'When Alice got her bike stolen, we spent hours here filling out reports.', x: 740, y: 560, links: ['hospital', 'donuts'] },
  ];
  TOWN.START = 'coffee';
  TOWN.PLAQUE = 'Alice said the place was familiar, and today everything . . . looks pretty normal . . . but maybe she’s hallucinating? I should go and look at the places we went together. I’ll start with the coffee shop.';
  const byId = (id) => TOWN.PLACES.find((p) => p.id === id);
  const visited = (game, p) => game.hasFlag('visited-' + p.id);
  /** Blue: the start, anywhere you've been, and the next place along from anywhere you've been. */
  TOWN.reachable = function (game, p) {
    if (p.id === TOWN.START || visited(game, p)) return true;
    return p.links.some((id) => visited(game, byId(id)));
  };

  // ------------------------------------------------------------ arriving at a place
  LM.on('levelLoaded', (game) => {
    const P = game.player, t = game.level.def.town;
    if (!P || game.attract || !t) return;
    game.setFlag('visited-' + t.id);
    P.data.townAt = t.id;
    game.spawnItem('town-search', game.level.start.x, game.level.start.y);
  });
  // the task follows you around town
  MEMOS.hudLines.push((game) => (game.hasFlag('aliceCalled') && game.level.def.alice ? ['Task', LM.APARTMENT.TASKS.alice] : null));

  // ------------------------------------------------------------ the map
  LM.ui.addStyles(`
    .town-map { position: absolute; inset: 0; background: #e9e1cc; cursor: default; overflow: hidden; }
    .town-map svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .town-map .pin { cursor: pointer; }
    .town-map .pin:focus-visible { outline: none; }
    .town-map .pin:focus-visible .pin-head, .town-map .pin:hover .pin-head { stroke: #1e1a14; stroke-width: 3; }
    .town-map .pin.far { cursor: not-allowed; }
    .town-map .here-ring { animation: town-here 1.6s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes town-here { from { opacity: 0.9; transform: scale(0.6); } to { opacity: 0; transform: scale(1.8); } }
    .town-map-open #minimap { visibility: hidden; }
    .town-legend { position: absolute; left: 50%; transform: translateX(-50%); bottom: 16px; display: flex; gap: 14px; padding: 8px 12px; background: rgba(255,250,236,0.92); border: 1px solid #b8ac90; color: #3a3024; font: 600 11px/1.2 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; }
    .town-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
    .town-plaque { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(520px, calc(100vw - 32px)); padding: 26px 30px 22px; box-sizing: border-box;
      background: linear-gradient(#c8a86a, #a8884a); border: 3px solid #6a4a1e; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.45), inset 0 0 0 2px #e8cc8a; color: #2a1a08; text-align: center; }
    .town-plaque p { margin: 0 0 16px; font: italic 500 17px/1.5 var(--font-lore); }
    .town-plaque button { font: 700 12px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; padding: 10px 18px; background: #2a1a08; color: #f4e4c0; border: 0; cursor: pointer; }
    .town-plaque button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  `);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, ...kids) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return el;
  };
  // streets: [x1, y1, x2, y2, main?]
  const STREETS = [
    [0, 380, 1000, 380, 1], [0, 200, 1000, 200, 0], [0, 540, 1000, 540, 0], [460, 0, 460, 640, 1], [100, 0, 100, 640, 0], [300, 0, 300, 640, 0],
    [620, 0, 620, 640, 0], [800, 0, 800, 640, 0], [940, 0, 940, 640, 0], [0, 90, 1000, 90, 0], [300, 300, 460, 300, 0], [620, 470, 940, 470, 0],
  ];
  const NAMES = [[30, 372, 'Main St'], [470, 30, 'Linear Ave', true], [30, 192, 'Elm St'], [30, 532, 'Harbor Rd'], [630, 30, 'Fork Ln', true]];
  function buildings() {
    // little houses and shops along the streets; most of the town is just the town
    const out = [], r = U.mulberry32(1978);
    for (let bx = 0; bx < 1000; bx += 46) {
      for (let by = 0; by < 640; by += 46) {
        const x = bx + 6 + r() * 10, y = by + 6 + r() * 10, w = 16 + r() * 14, hh = 14 + r() * 12;
        const onStreet = STREETS.some(([x1, y1, x2, y2]) => (x1 === x2 ? Math.abs(x + w / 2 - x1) < w / 2 + 10 : Math.abs(y + hh / 2 - y1) < hh / 2 + 10));
        if (onStreet || r() < 0.35) continue;
        if (Math.hypot(x - 680, y - 360) < 95) continue; // the park
        if (TOWN.PLACES.some((p) => Math.hypot(x + w / 2 - p.x, y + hh / 2 - p.y) < 34)) continue;
        out.push(svg('g', null,
          svg('rect', { x, y, width: w, height: hh, fill: '#f6efdc', stroke: '#8a7c62', 'stroke-width': 1.2 }),
          svg('path', { d: `M${x} ${y} L${x + w / 2} ${y - 6} L${x + w} ${y}`, fill: 'none', stroke: '#8a7c62', 'stroke-width': 1.2 })));
      }
    }
    return out;
  }
  function hexagon(cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([cx + Math.cos((i / 6) * U.TAU) * R, cy + Math.sin((i / 6) * U.TAU) * R].join(' '));
    return pts.join(' ');
  }
  let overlay = null;
  function closeMap() {
    if (overlay) overlay.remove();
    overlay = null;
    document.body.classList.remove('town-map-open');
  }
  function openMap(game) {
    closeMap();
    document.body.classList.add('town-map-open');
    const here = game.player.data.townAt;
    const W = 1000, H = 640;
    const pins = TOWN.PLACES.map((p) => {
      const ok = TOWN.reachable(game, p), seen = visited(game, p), searched = game.hasFlag('searched-' + p.level);
      const col = ok ? '#2a6ad8' : '#d8342a';
      const g = svg('g', { class: 'pin' + (ok ? '' : ' far'), tabindex: 0, role: 'button', 'aria-label': p.name + (ok ? '' : ' (too far for now)'), transform: `translate(${p.x} ${p.y})` },
        p.id === here ? svg('circle', { class: 'here-ring', cx: 0, cy: -22, r: 16, fill: 'none', stroke: '#2a6ad8', 'stroke-width': 3 }) : null,
        svg('path', { class: 'pin-head', d: 'M0 0 C-4 -10 -13 -14 -13 -24 A13 13 0 1 1 13 -24 C13 -14 4 -10 0 0 Z', fill: col, stroke: U.shade(col, -0.35), 'stroke-width': 1.5 }),
        svg('circle', { cx: 0, cy: -24, r: 5, fill: searched ? '#f4f0e0' : seen ? '#cfe0ff' : '#ffffff' }),
        searched ? svg('path', { d: 'M-3 -24 L-1 -21 L4 -28', fill: 'none', stroke: col, 'stroke-width': 2 }) : null,
        svg('text', { x: 0, y: 16, 'text-anchor': 'middle', fill: '#2a2218', 'font-size': 14, 'font-weight': 700, 'font-family': 'var(--font-ui)', stroke: '#e9e1cc', 'stroke-width': 4, 'paint-order': 'stroke' }, p.name));
      const choose = () => pick(game, p);
      g.addEventListener('click', choose);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          choose();
        }
      });
      return g;
    });
    const map = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Map of the town' },
      svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#e9e1cc' }),
      // the river along the south-west, the park in the middle
      svg('path', { d: 'M0 600 C120 580 200 630 320 610 S520 600 600 640', fill: 'none', stroke: '#9ac0d0', 'stroke-width': 26, 'stroke-linecap': 'round' }),
      STREETS.map(([x1, y1, x2, y2, main]) => svg('line', { x1, y1, x2, y2, stroke: '#fbf7ea', 'stroke-width': main ? 22 : 14 })),
      STREETS.map(([x1, y1, x2, y2, main]) => svg('line', { x1, y1, x2, y2, stroke: '#a89a7c', 'stroke-width': 1, 'stroke-dasharray': main ? '10 8' : '0' })),
      svg('polygon', { points: hexagon(680, 360, 88), fill: '#b8d0a0', stroke: '#6a8a5a', 'stroke-width': 2 }),
      svg('path', { d: 'M680 272 L680 448 M604 316 L756 404 M604 404 L756 316', stroke: '#e8dcc0', 'stroke-width': 4 }),
      buildings(),
      NAMES.map(([x, y, t, v]) => svg('text', { x, y, fill: '#7a6c52', 'font-size': 11, 'font-style': 'italic', 'font-family': 'var(--font-lore)', transform: v ? `rotate(90 ${x} ${y})` : '' }, t)),
      svg('text', { x: W - 20, y: H - 18, 'text-anchor': 'end', fill: '#7a6c52', 'font-size': 18, 'font-family': 'var(--font-head)', 'letter-spacing': 2 }, 'TRI-COUNTY · TOWN CENTER'),
      // the compass
      svg('g', { transform: 'translate(950 70)' }, svg('circle', { r: 22, fill: 'none', stroke: '#8a7c62' }), svg('path', { d: 'M0 -20 L5 0 L0 20 L-5 0 Z', fill: '#8a7c62' }), svg('text', { y: -26, 'text-anchor': 'middle', 'font-size': 11, fill: '#5a4c32' }, 'N')),
      pins);
    const legend = h('div', { class: 'town-legend' }, h('span', null, h('i', { style: 'background:#2a6ad8' }), 'Can go'), h('span', null, h('i', { style: 'background:#d8342a' }), 'Too far for now'));
    overlay = h('div', { class: 'town-map' });
    overlay.append(map, legend);
    const app = document.getElementById('app');
    app.insertBefore(overlay, document.getElementById('hud'));
    if (!game.hasFlag('townPlaque')) plaque(game);
  }
  TOWN.openMap = openMap;
  function plaque(game) {
    const btn = h('button', { type: 'button' }, 'Let’s go');
    const el = h('div', { class: 'town-plaque', role: 'dialog', 'aria-label': 'A plaque' }, h('p', null, TOWN.PLAQUE), btn);
    btn.addEventListener('click', () => {
      game.setFlag('townPlaque');
      el.remove();
    });
    overlay.appendChild(el);
    setTimeout(() => btn.focus(), 50);
  }
  function pick(game, p) {
    if (LM.ui.modalOpen || (overlay && overlay.querySelector('.town-plaque'))) return;
    LM.audio.play('ui');
    if (!TOWN.reachable(game, p)) {
      const near = p.links.map(byId).filter((q) => TOWN.reachable(game, q));
      LM.think(game, near.length ? 'That’s too far from here. I’d have to go past the ' + near[0].name + ' first.' : 'That’s too far from here. I’ll have to work my way over there.');
      return;
    }
    LM.ui.open({
      kicker: p.sub ? p.name + ' · ' + p.sub : 'Town',
      title: 'Visit ' + p.name + '?',
      body: h('div', { class: 'lore-block' }, h('p', { class: 'lore' }, p.note)),
      actions: [
        { label: 'Visit', primary: true, key: 'E', onClick: () => go(game, p) },
        { label: 'Not yet', quiet: true },
      ],
    });
  }
  function go(game, p) {
    if (!LM.find('levels', p.level)) return game.toast(p.name + ' isn’t built yet.', 'warn');
    LM.APARTMENT.STORY.go(game, p.level);
  }

  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || game.levelId !== 'town-map') return closeMap();
    setTimeout(() => game.levelId === 'town-map' && openMap(game), 0);
  });
})();
