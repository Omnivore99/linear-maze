/* The Linear Maze — packs/town/items.js
 * Town pack, part 2: things in the town's places.
 *
 *   town-door       the way back out to the Town Map (props.to: another level instead; props.label)
 *   town-prop       one item, many kinds of furniture: props.kind (see KINDS below), props.dir
 *                   ('e'/'w' turns it), props.color. With props.text it can be looked at
 *                   (props.title, props.kicker, props.prompt).
 *   town-pennant    a college pennant on the wall: props.label, props.color, props.ink
 *   town-newspaper  newspapers on a table: props.headline, props.text
 *   town-search     an invisible helper every town place gets: once you've been in every room,
 *                   "ALICE is NOT in the <place>." (flag searched-<level id>)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const TOWN = (LM.TOWN = LM.TOWN || {});
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);
  const vertical = (it) => it.props.dir === 'e' || it.props.dir === 'w';
  const rr = (g, x, y, w, hh, r, c) => {
    g.fillStyle = c;
    G.roundRect(g, x, y, w, hh, r);
    g.fill();
  };
  const shadow = (g, w, hh) => rr(g, -w / 2 + 2, -hh / 2 + 3, w, hh, 3, 'rgba(0,0,0,0.3)');

  // ------------------------------------------------------------ furniture kinds: size in px [w, h], solid?, light?, draw
  const KINDS = {
    register: { size: [16, 12], draw(g) { rr(g, -8, -6, 16, 12, 2, '#3a3a40'); rr(g, -6, -5, 12, 5, 1, '#9ac89a'); g.fillStyle = '#d8d8d0'; for (let i = 0; i < 6; i++) g.fillRect(-6 + (i % 3) * 4, 1 + Math.floor(i / 3) * 2.5, 3, 1.6); } },
    'pastry-case': { size: [30, 18], draw(g) { rr(g, -15, -9, 30, 18, 2, '#c8c0b0'); rr(g, -13, -7, 26, 14, 2, 'rgba(200,230,240,0.55)'); const c = ['#c88a4a', '#e8c070', '#8a4a2a', '#f0d8a0']; for (let i = 0; i < 6; i++) { g.fillStyle = c[i % 4]; g.beginPath(); g.arc(-9 + (i % 3) * 9, -3 + Math.floor(i / 3) * 6, 2.6, 0, U.TAU); g.fill(); } } },
    espresso: { size: [18, 12], draw(g) { rr(g, -9, -6, 18, 12, 2, '#b8bcc0'); rr(g, -7, -4, 14, 4, 1, '#5a5e64'); g.fillStyle = '#2a2a2e'; g.fillRect(-5, 1, 3, 3); g.fillRect(2, 1, 3, 3); }, glow: '#ffd890' },
    'menu-board': { size: [30, 4], draw(g) { rr(g, -15, -2, 30, 4, 1, '#1a1a1c'); g.fillStyle = '#f0e8d0'; for (let i = 0; i < 5; i++) g.fillRect(-13 + i * 6, -1, 4, 0.8); } },
    'snack-shelf': { size: [30, 14], solid: true, draw(g) { rr(g, -15, -7, 30, 14, 1, '#8a8e94'); const c = ['#e83a2a', '#f0c030', '#3a7ad8', '#3aa84a', '#e87a2a']; for (let i = 0; i < 10; i++) { g.fillStyle = c[i % 5]; g.fillRect(-13 + (i % 5) * 5.4, -5 + Math.floor(i / 5) * 6, 4, 4.4); } } },
    cooler: { size: [30, 12], solid: true, draw(g) { rr(g, -15, -6, 30, 12, 1, '#d8dce0'); rr(g, -13, -4, 26, 8, 1, 'rgba(160,210,240,0.7)'); const c = ['#c82a2a', '#2a6ac8', '#e8a030', '#3aa84a']; for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 4]; g.fillRect(-12 + i * 3.2, -3, 2.2, 6); } }, glow: '#c8ecff' },
    'gas-pump': { size: [14, 20], solid: true, draw(g, it) { rr(g, -7, -10, 14, 20, 2, it.props.color || '#c8302a'); rr(g, -5, -8, 10, 6, 1, '#1a1a1e'); g.fillStyle = '#e8f070'; g.fillRect(-4, -7, 8, 1.4); g.fillStyle = '#2a2a2e'; g.fillRect(5, 0, 4, 2); g.strokeStyle = '#1a1a1e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(8, 1); g.quadraticCurveTo(12, 8, 6, 9); g.stroke(); }, glow: '#e8f070' },
    'pump-island': { size: [60, 14], solid: true, draw(g) { rr(g, -30, -7, 60, 14, 3, '#9a9890'); g.fillStyle = '#e8d070'; g.fillRect(-28, -6, 56, 1.4); } },
    'tire-stack': { size: [16, 16], solid: true, draw(g) { for (const [x, y] of [[-3, -3], [3, 2], [-2, 4]]) { g.fillStyle = '#1a1a1c'; g.beginPath(); g.arc(x, y, 6, 0, U.TAU); g.fill(); g.fillStyle = '#4a4a4e'; g.beginPath(); g.arc(x, y, 2.4, 0, U.TAU); g.fill(); } } },
    'car-lift': { size: [56, 30], solid: false, draw(g) { g.fillStyle = '#e8c030'; g.fillRect(-26, -15, 6, 30); g.fillRect(20, -15, 6, 30); g.fillStyle = '#1a1a1a'; for (let i = 0; i < 5; i++) { g.fillRect(-26, -13 + i * 6, 6, 2); g.fillRect(20, -13 + i * 6, 6, 2); } } },
    car: { size: [56, 28], solid: true, draw(g, it) { if (it.props.lift) KINDS['car-lift'].draw(g, it); const c = it.props.color || '#3a6a9a'; rr(g, -28, -14, 56, 28, 8, U.shade(c, -0.3)); rr(g, -26, -12, 52, 24, 7, c); rr(g, -10, -10, 22, 20, 4, 'rgba(160,200,230,0.75)'); rr(g, -6, -8, 14, 16, 3, c); g.fillStyle = '#f4f0c0'; g.fillRect(24, -10, 3, 4); g.fillRect(24, 6, 3, 4); } },
    toolbox: { size: [24, 12], solid: true, draw(g) { rr(g, -12, -6, 24, 12, 1, '#c8302a'); g.fillStyle = '#7a1a14'; for (let i = 0; i < 3; i++) g.fillRect(-11, -4 + i * 3.4, 22, 0.8); } },
    fountain: { size: [76, 76], solid: true, round: 30, light: { color: '#c8e8ff', radius: 120, intensity: 0.25 }, draw(g, it, t) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(3, 4, 34, 0, U.TAU); g.fill(); g.fillStyle = '#b8b2a4'; g.beginPath(); g.arc(0, 0, 34, 0, U.TAU); g.fill(); g.fillStyle = '#3a7a9a'; g.beginPath(); g.arc(0, 0, 29, 0, U.TAU); g.fill(); for (let i = 0; i < 3; i++) { const k = ((t * 0.6 + i / 3) % 1); g.strokeStyle = 'rgba(220,240,255,' + (1 - k) * 0.6 + ')'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 6 + k * 22, 0, U.TAU); g.stroke(); } g.fillStyle = '#c8c2b4'; g.beginPath(); g.arc(0, 0, 6, 0, U.TAU); g.fill(); g.fillStyle = '#e8f4ff'; g.beginPath(); g.arc(0, 0, 2.4 + Math.sin(t * 8) * 0.6, 0, U.TAU); g.fill(); } },
    'bird-bath': { size: [22, 22], solid: true, round: 10, draw(g, it, t) { g.fillStyle = '#a8a294'; g.beginPath(); g.arc(0, 0, 11, 0, U.TAU); g.fill(); g.fillStyle = '#5a8aa8'; g.beginPath(); g.arc(0, 0, 8, 0, U.TAU); g.fill(); g.fillStyle = '#6a5a4a'; g.beginPath(); g.ellipse(4 + Math.sin(t) * 1, -3, 2.6, 1.8, Math.sin(t * 0.7), 0, U.TAU); g.fill(); } },
    sundial: { size: [26, 26], solid: true, round: 12, draw(g) { g.fillStyle = '#a8a294'; g.beginPath(); g.arc(0, 0, 13, 0, U.TAU); g.fill(); g.fillStyle = '#c8a050'; g.beginPath(); g.arc(0, 0, 10, 0, U.TAU); g.fill(); g.strokeStyle = '#5a3a10'; g.lineWidth = 0.7; for (let i = 0; i < 12; i++) { const a = (i / 12) * U.TAU; g.beginPath(); g.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); g.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); g.stroke(); } g.fillStyle = '#5a3a10'; g.beginPath(); g.moveTo(0, 0); g.lineTo(9, -1); g.lineTo(0, 2); g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-5, 8); g.lineTo(-2, 8); g.fill(); } },
    'picnic-table': { size: [44, 30], solid: true, draw(g) { shadow(g, 44, 30); g.fillStyle = '#8a5a34'; g.fillRect(-22, -15, 44, 5); g.fillRect(-22, 10, 44, 5); rr(g, -20, -8, 40, 16, 1, '#a06a3e'); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = -6; i <= 6; i += 4) g.fillRect(-20, i, 40, 0.6); } },
    slide: { size: [24, 56], solid: true, draw(g) { rr(g, -12, -28, 24, 14, 2, '#3a7ad8'); rr(g, -7, -14, 14, 42, 6, '#f0c030'); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-4, -12, 2, 38); } },
    swings: { size: [60, 22], solid: true, draw(g, it, t) { g.fillStyle = '#c8302a'; g.fillRect(-30, -2, 60, 4); g.fillRect(-30, -11, 4, 22); g.fillRect(26, -11, 4, 22); for (let i = 0; i < 3; i++) { const s = Math.sin(t * 1.4 + i) * 3; g.fillStyle = '#2a2a2e'; g.fillRect(-16 + i * 14 + s, 4, 8, 3); } } },
    sandbox: { size: [56, 56], solid: false, z: -2, draw(g) { g.fillStyle = '#8a5a34'; g.fillRect(-28, -28, 56, 56); g.fillStyle = '#e8d098'; g.fillRect(-25, -25, 50, 50); g.fillStyle = '#d83a2a'; g.beginPath(); g.arc(8, 6, 4, 0, U.TAU); g.fill(); g.fillStyle = '#3a7ad8'; g.fillRect(-12, -10, 6, 5); } },
    'lamp-post': { size: [10, 10], solid: true, round: 5, light: { color: '#ffe8b0', radius: 170, intensity: 0.5 }, draw(g) { g.fillStyle = '#2a2a2e'; g.beginPath(); g.arc(0, 0, 4, 0, U.TAU); g.fill(); g.fillStyle = '#f8f0c8'; g.beginPath(); g.arc(0, 0, 2.4, 0, U.TAU); g.fill(); }, glow: '#ffe8b0' },
    tree: { size: [40, 40], solid: true, round: 9, draw(g, it) { const r = U.mulberry32((it.tx * 31 + it.ty * 7) >>> 0); g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(5, 6, 20, 0, U.TAU); g.fill(); for (let i = 0; i < 9; i++) { g.fillStyle = ['#2e5a26', '#3a6a30', '#4a7a3a', '#28501e'][i % 4]; g.beginPath(); g.arc((r() - 0.5) * 20, (r() - 0.5) * 20, 8 + r() * 6, 0, U.TAU); g.fill(); } } },
    'theater-seats': { size: [96, 14], solid: true, draw(g) { g.fillStyle = '#3a0a10'; g.fillRect(-48, -7, 96, 14); for (let i = 0; i < 8; i++) rr(g, -47 + i * 12, -6, 10, 11, 2, '#a01a24'); } },
    screen: { size: [6, 6], draw() {} },
    popcorn: { size: [20, 16], solid: true, draw(g, it, t) { rr(g, -10, -8, 20, 16, 2, '#c8302a'); rr(g, -8, -6, 16, 10, 1, 'rgba(255,240,200,0.6)'); g.fillStyle = '#f8f0d0'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-6 + (i % 3) * 5 + Math.sin(t * 9 + i) * 0.5, -3 + Math.floor(i / 3) * 3, 1.5, 0, U.TAU); g.fill(); } }, glow: '#ffe8a0' },
    'movie-poster': { size: [4, 4], draw() {} },
    'hospital-bed': { size: [26, 50], solid: true, draw(g, it) { rr(g, -13, -25, 26, 50, 3, '#c8ccd0'); rr(g, -11, -23, 22, 46, 2, '#f4f6f8'); rr(g, -9, -21, 18, 9, 3, '#ffffff'); g.fillStyle = it.props.color || '#8ab4d8'; g.fillRect(-11, -6, 22, 29); } },
    curtain: { size: [6, 60], solid: false, draw(g) { g.fillStyle = '#8ab8b0'; for (let i = 0; i < 10; i++) g.fillRect(-2 + (i % 2), -30 + i * 6, 4, 6); } },
    wheelchair: { size: [16, 16], solid: true, draw(g) { g.fillStyle = '#2a2a2e'; g.fillRect(-8, -7, 3, 14); g.fillRect(5, -7, 3, 14); rr(g, -5, -6, 10, 10, 1, '#3a5a8a'); } },
    'waiting-chairs': { size: [64, 12], solid: true, draw(g, it) { for (let i = 0; i < 4; i++) rr(g, -32 + i * 16, -6, 14, 12, 3, it.props.color || '#4a7a9a'); } },
    'incense': { size: [8, 8], draw(g) { g.fillStyle = '#5a3a2a'; g.fillRect(-4, -1, 8, 2); g.fillStyle = '#ff7a3a'; g.fillRect(3, -2, 1.5, 1.5); }, glow: '#ff7a3a', smoke: true },
    beads: { size: [30, 6], draw(g, it, t) { for (let i = 0; i < 10; i++) { g.fillStyle = ['#e83a8a', '#f0c030', '#3ac8b0', '#8a3ae8'][i % 4]; g.fillRect(-15 + i * 3 + Math.sin(t * 2 + i) * 0.5, -3, 1.4, 6); } } },
    'vhs-rack': { size: [30, 14], solid: true, draw(g, it) { rr(g, -15, -7, 30, 14, 1, '#2a2a30'); const r = U.mulberry32((it.tx * 13 + it.ty * 5) >>> 0); for (let i = 0; i < 12; i++) { g.fillStyle = ['#1a1a1c', '#e8e4dc', '#c82a2a', '#2a5ac8', '#e8c030'][Math.floor(r() * 5)]; g.fillRect(-14 + i * 2.4, -6, 2, 12); } } },
    'crt-tv': { size: [20, 16], solid: true, draw(g) { rr(g, -10, -8, 20, 16, 3, '#3a3632'); rr(g, -8, -7, 13, 11, 3, '#2a4a5a'); g.fillStyle = '#8a8478'; g.fillRect(6, -6, 2, 2); g.fillRect(6, -2, 2, 2); }, glow: '#7ab8d8' },
    'donut-case': { size: [40, 18], solid: true, draw(g) { rr(g, -20, -9, 40, 18, 2, '#e8e0d8'); rr(g, -18, -7, 36, 14, 2, 'rgba(255,230,240,0.6)'); const c = ['#e86aa8', '#8a4a2a', '#f0d070', '#f4f0e8', '#6ac8e8']; for (let i = 0; i < 10; i++) { g.fillStyle = c[i % 5]; g.beginPath(); g.arc(-14 + (i % 5) * 7, -3 + Math.floor(i / 5) * 6, 2.8, 0, U.TAU); g.fill(); g.fillStyle = '#f4e8d8'; g.beginPath(); g.arc(-14 + (i % 5) * 7, -3 + Math.floor(i / 5) * 6, 0.9, 0, U.TAU); g.fill(); } } },
    stool: { size: [12, 12], solid: true, round: 6, draw(g, it) { g.fillStyle = '#7a7a80'; g.beginPath(); g.arc(0, 0, 6, 0, U.TAU); g.fill(); g.fillStyle = it.props.color || '#c82a5a'; g.beginPath(); g.arc(0, 0, 4.6, 0, U.TAU); g.fill(); } },
    'police-desk': { size: [64, 20], solid: true, draw(g) { rr(g, -32, -10, 64, 20, 2, '#3a3a42'); rr(g, -30, -9, 60, 8, 1, '#5a5a64'); g.fillStyle = '#e8e4dc'; g.fillRect(-20, -1, 10, 7); g.fillRect(8, 0, 8, 6); g.fillStyle = '#c8a040'; g.beginPath(); g.arc(22, 2, 2.6, 0, U.TAU); g.fill(); } },
    'cell-bars': { size: [32, 6], solid: true, draw(g) { g.fillStyle = '#5a5e64'; g.fillRect(-16, -1.5, 32, 3); for (let i = 0; i < 8; i++) g.fillRect(-15 + i * 4, -3, 1.6, 6); } },
    bike: { size: [30, 10], solid: false, draw(g, it) { g.strokeStyle = '#1a1a1c'; g.lineWidth = 2; g.beginPath(); g.arc(-9, 0, 5, 0, U.TAU); g.arc(9, 0, 5, 0, U.TAU); g.stroke(); g.strokeStyle = it.props.color || '#2a8ac8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-9, 0); g.lineTo(0, -1); g.lineTo(9, 0); g.stroke(); } },
    'filing': { size: [20, 14], solid: true, draw(g) { rr(g, -10, -7, 20, 14, 1, '#7a7e84'); g.fillStyle = '#5a5e64'; g.fillRect(-8, -1, 16, 1); } },
    'big-books': { size: [26, 26], solid: true, draw(g) { for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * 0.4); rr(g, -9, -7, 18, 13, 1, ['#7a2a2a', '#2a4a6a', '#3a5a3a', '#6a4a2a'][i]); g.restore(); } } },
    rubble: { size: [26, 26], solid: false, z: -1, draw(g, it) { const r = U.mulberry32((it.tx * 7 + it.ty * 11) >>> 0); for (let i = 0; i < 9; i++) { g.fillStyle = ['#5a5248', '#3a342c', '#6a6258'][i % 3]; g.save(); g.translate((r() - 0.5) * 22, (r() - 0.5) * 22); g.rotate(r() * 6); g.fillRect(-3, -2, 4 + r() * 4, 3 + r() * 2); g.restore(); } } },
    'torn-pages': { size: [26, 26], solid: false, z: -2, draw(g, it) { const r = U.mulberry32((it.tx * 17 + it.ty * 3) >>> 0); for (let i = 0; i < 7; i++) { g.fillStyle = r() < 0.5 ? '#d8d0bc' : '#a89c84'; g.save(); g.translate((r() - 0.5) * 24, (r() - 0.5) * 24); g.rotate(r() * 6); g.fillRect(-3, -4, 6, 8); g.restore(); } } },
  };
  TOWN.KINDS = KINDS;

  const items = {
    'town-door': {
      name: 'Door to the street', dressing: false, radius: 12, shadow: false, z: -2, mapColor: '#e0b25a', mapAlways: true,
      interact: {
        available: () => true,
        prompt: (it) => it.props.label || 'Go back out to town',
        use(it, game) {
          LM.audio.play('door');
          LM.APARTMENT.STORY.go(game, it.props.to || 'town-map');
        },
      },
      draw(g) {
        g.fillStyle = '#5a3a24';
        g.fillRect(-14, -9, 28, 18);
        g.strokeStyle = '#c8a050';
        g.lineWidth = 1;
        g.strokeRect(-12, -7, 24, 14);
        g.fillStyle = '#e8d8a8';
        g.font = '700 4.4px sans-serif';
        g.textAlign = 'center';
        g.fillText('EXIT', 0, 1.6);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 22, '#ffe0a0', 0.25 + 0.1 * Math.sin(t * 2));
      },
    },
    'town-prop': {
      name: 'Town furniture', dressing: 'Furniture', radius: 12,
      init(it) {
        const k = KINDS[it.props.kind] || KINDS.register;
        it.kind = k;
        const [w, hh] = k.size;
        if (k.solid) {
          if (k.round) {
            it.solid = true; // the engine's circle uses it.r (the def has no solidRadius)
          } else {
            it.solid = 'rect';
            it.box = vertical(it) ? [hh, w] : [w, hh];
          }
        }
        it.r = k.solid && k.round ? k.round : Math.max(10, Math.min(w, hh) / 2);
        if (k.z) it.z = k.z;
        // pieces bigger than a tile start on their tile and spread east and south
        if (w > T + 4) (vertical(it) ? (it.y += (w - T) / 2) : (it.x += (w - T) / 2));
        if (hh > T + 4) (vertical(it) ? (it.x += (hh - T) / 2) : (it.y += (hh - T) / 2));
      },
      light: (it) => {
        const k = KINDS[it.props.kind];
        return k && k.light ? k.light : null;
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => it.props.prompt || 'Look at the ' + (it.props.title || it.props.kind || 'thing').toLowerCase(),
        use: (it) => LM.ui.showText(it.props.title || 'Here', it.props.text, it.props.kicker || ''),
      },
      update(it, dt, game) {
        if (!it.kind || !it.kind.smoke) return;
        it.smokeT = (it.smokeT || 0) - dt;
        if (it.smokeT <= 0) {
          it.smokeT = 0.35;
          game.particles.add({ type: 'smoke', x: it.x + 3, y: it.y - 2, vx: U.rand(-4, 4), vy: -14, life: 2.2, size: 2.5, color: '#c8c0d8', alpha: 0.3, drag: 0.5 });
        }
      },
      draw(g, it, t) {
        if (!it.kind) return;
        g.rotate(rot(it));
        it.kind.draw(g, it, t);
      },
      drawGlow(g, it, t) {
        if (it.kind && it.kind.glow) G.glow(g, 0, 0, 14, it.kind.glow, 0.25 + 0.06 * Math.sin(t * 3));
      },
    },
    'town-pennant': {
      name: 'Pennant', dressing: 'Walls', radius: 5, wallMounted: true, shadow: false,
      interact: { available: (it) => !!it.props.text, prompt: 'Look at the pennant', use: (it) => LM.ui.showText(it.props.label || 'A pennant', it.props.text, it.props.kicker || 'On the wall') },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = it.props.color || '#8a1a24';
        g.beginPath();
        g.moveTo(0, -9);
        g.lineTo(9, 0);
        g.lineTo(0, 9);
        g.closePath();
        g.fill();
        g.fillStyle = it.props.ink || '#f4e8c8';
        g.fillRect(1.5, -3, 3, 6);
      },
    },
    'town-newspaper': {
      name: 'Newspapers', dressing: 'Furniture', radius: 12, solid: 'rect', mapColor: '#e8e4dc',
      init(it) {
        it.box = [28, 18];
      },
      interact: {
        available: () => true,
        prompt: 'Read the newspaper',
        use(it, game) {
          game.setFlag('readPaper-' + game.levelId);
          LM.ui.open({
            kicker: it.props.kicker || 'Tri-County Courier', title: it.props.title || 'The newspaper', wide: true,
            body: h('div', { class: 'town-paper' }, h('h3', null, it.props.headline || ''), ...[].concat(it.props.text || []).map((p) => h('p', null, p))),
            actions: [{ label: 'Put it down', primary: true, key: 'E' }],
          });
        },
      },
      draw(g) {
        shadow(g, 28, 18);
        rr(g, -14, -9, 28, 18, 1, '#6a4a2c');
        for (let i = 0; i < 3; i++) {
          g.save();
          g.rotate(-0.2 + i * 0.15);
          g.fillStyle = '#ece8dc';
          g.fillRect(-9 + i * 3, -6, 12, 10);
          g.fillStyle = '#3a3a3a';
          g.fillRect(-8 + i * 3, -5, 10, 1.4);
          g.fillStyle = 'rgba(40,40,40,0.4)';
          for (let j = 0; j < 3; j++) g.fillRect(-8 + i * 3, -2 + j * 2, 10, 0.6);
          g.restore();
        }
      },
    },
    'town-search': {
      name: 'Town search (helper)', dressing: false, radius: 1, shadow: false,
      update(it, dt, game) {
        const P = game.player, d = game.level.def;
        if (!P || game.attract || !d.town) return;
        it.t2 = (it.t2 || 0) - dt;
        if (it.t2 > 0) return;
        it.t2 = 0.3;
        const flag = 'searched-' + game.levelId;
        if (game.hasFlag(flag)) return;
        const rooms = game.level.rooms;
        if (!rooms.length || !rooms.every((r) => r.visited)) return;
        if (d.town.after && !game.hasFlag(d.town.after)) return; // not until the place's story is done
        game.setFlag(flag);
        game.schedule(1.2, () => {
          LM.audio.play('warn');
          LM.ui.open({
            kicker: d.town.name, title: 'ALICE is NOT ' + (d.town.in || 'in ' + d.town.name.replace(/^The /, 'the ')) + '.',
            body: h('div', { class: 'lore-block' }, h('p', { class: 'lore' }, d.town.notHere || 'You’ve looked everywhere. She isn’t here.')),
            actions: [{ label: 'OK', primary: true, key: 'E' }],
          });
        });
      },
    },
  };

  LM.ui.addStyles(`
    .town-paper { padding: 16px 20px; background: #ece8dc; color: #1e1e1e; font: 400 14px/1.5 Georgia, 'Times New Roman', serif; box-shadow: inset 0 0 0 1px #c8c0ac; }
    .town-paper h3 { margin: 0 0 10px; font: 900 22px/1.15 Georgia, serif; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 2px solid #1e1e1e; padding-bottom: 8px; }
    .town-paper p { margin: 0 0 8px; }
  `);

  LM.definePack({ id: 'town', items });
})();
