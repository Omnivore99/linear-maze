/* The Linear Maze — packs/apartment/items.js
 * Apartment pack, part 3: home, and the hall outside it.
 *
 * Several pieces start from an Office pack drawing (from(id, changes)) and
 * replace only what you can do with them. Furniture with a front takes
 * props.dir ('n' 'e' 's' 'w', the side it faces); wall pieces take props.face.
 *
 * Story flags these set, for events to hook onto (a 'flag' trap, or the editor):
 *   aptPizzaOut  aptPizzaCooked  ateDinner   (dinner, on a floor with dinner: true)
 *   snacked  watchedTV  playedGame  readBook  relaxed  readMagazine
 *   checkedLaptop  knock-7A  knob-7A  open-7A  (and so on per unit)
 * A neighbor's door opens when its props.openFlag is set (Try knob then sets open-<unit>).
 *
 * A floor with warped: true (Home on Chessboard 1) reads its words from
 * APT.WARPED (books, channels, radio, magazine, neighbors...) where it has them.
 * The story (tasks, phone calls, the news) is in packs/apartment/story.js and
 * hooks in through APT.STORY.
 * Colors: apt-bed props.blanket, apt-dresser / apt-nightstand / apt-tv props.color.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const APT = (LM.APARTMENT = LM.APARTMENT || {});
  const MEMOS = LM.MEMOS;
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);
  function setBox(it, w, hh, ox, oy) {
    const d = it.props.dir || 's';
    if (d === 's') { it.box = [w, hh]; it.boxOff = [ox, oy]; }
    else if (d === 'n') { it.box = [w, hh]; it.boxOff = [-ox, -oy]; }
    else if (d === 'e') { it.box = [hh, w]; it.boxOff = [oy, -ox]; }
    else { it.box = [hh, w]; it.boxOff = [-oy, ox]; }
  }
  /** Start from another pack's item (drawing, collision) and replace some of it. */
  const from = (id, over) => Object.assign({}, LM.get('items', id), { cache: false, cacheKey: undefined }, over);
  const paras = (list) => h('div', { class: 'lore-block' }, ...[].concat(list).filter(Boolean).map((p) => (typeof p === 'string' ? h('p', { class: 'lore' }, p) : p)));
  const page = (kicker, title, body, actions) => LM.ui.open({ kicker, title, body: paras(body), actions: actions || [{ label: 'Close', primary: true }] });
  const later = (fn) => setTimeout(fn, 0);
  /** Chessboard 1 floors (warped: true) swap in their own words from APT.WARPED. */
  const warped = (game) => !!(game && game.level && game.level.def.warped);
  const pick = (game, key) => (warped(game) && APT.WARPED && APT.WARPED[key]) || APT[key];
  const story = () => APT.STORY || {};
  /** Dinner, on a floor with dinner: true: 'get' | 'cook' | 'eat' | 'done' (or null). */
  function pizzaStep(game) {
    if (!game || !game.level || !game.level.def.dinner) return null;
    if (game.hasFlag('ateDinner')) return 'done';
    if (game.hasFlag('aptPizzaCooked')) return 'eat';
    if (game.hasFlag('aptPizzaOut')) return 'cook';
    return 'get';
  }
  APT.pizzaStep = pizzaStep;
  APT.pick = pick;

  LM.ui.addStyles(`
    .apt-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 6px; }
    .apt-list button { padding: 9px 11px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--bone); text-align: left; font: 400 13px/1.35 var(--font-ui); cursor: pointer; }
    .apt-list button:hover, .apt-list button:focus-visible { border-color: var(--brass); outline: none; }
    .apt-list button small { display: block; color: var(--muted); font-size: 11px; }
    .apt-chat { display: grid; gap: 6px; max-height: 300px; overflow-y: auto; padding: 6px 2px; }
    .apt-friend { display: grid; grid-template-columns: 12px minmax(0,1fr); gap: 10px; align-items: center; }
    .apt-friend i { width: 9px; height: 9px; border-radius: 50%; background: #5a5e6a; }
    .apt-friend i.on { background: #6ad07a; }
    .apt-tv { padding: 12px; border-radius: 14px; background: linear-gradient(#2a2622, #141210); box-shadow: inset 0 0 0 2px #3a342e, 0 6px 18px rgba(0,0,0,0.5); }
    .apt-tv-screen { position: relative; min-height: 190px; padding: 34px 22px 40px; border-radius: 18px / 26px; overflow: hidden;
      background: radial-gradient(ellipse at center, #2a4a6a 0%, #16263a 70%, #0a1018 100%); color: #eef4ff; font: 500 15px/1.5 var(--font-ui); text-shadow: 0 0 6px rgba(140,190,255,0.5); }
    .apt-tv-screen::after { content: ''; position: absolute; inset: 0; pointer-events: none;
      background: repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px); animation: apt-tv-roll 6s linear infinite; }
    .apt-tv-screen p { margin: 0 0 10px; position: relative; z-index: 1; }
    .apt-tv-bug { position: absolute; top: 10px; right: 16px; font: 700 10px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.7; }
    .apt-tv-banner { margin: 0 -22px 14px; padding: 7px 22px; background: #c8202a; color: #fff; font: 800 18px/1.1 var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; animation: apt-tv-pulse 1.2s ease-in-out infinite; position: relative; z-index: 1; }
    .apt-tv.breaking .apt-tv-screen { background: radial-gradient(ellipse at center, #3a2a3a 0%, #1a1424 70%, #0a0810 100%); }
    .apt-tv-crawl { position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 0; background: #f4f1ea; color: #1a1a1e; font: 700 12px/1 var(--font-ui); white-space: nowrap; overflow: hidden; text-shadow: none; z-index: 1; }
    .apt-tv-crawl span { display: inline-block; padding-left: 100%; animation: apt-tv-crawl 22s linear infinite; }
    @keyframes apt-tv-crawl { to { transform: translateX(-100%); } }
    @keyframes apt-tv-pulse { 50% { background: #e8303a; } }
    @keyframes apt-tv-roll { to { background-position: 0 30px; } }
    @media (prefers-reduced-motion: reduce) { .apt-tv-crawl span, .apt-tv-banner, .apt-tv-screen::after { animation: none; } .apt-tv-crawl span { padding-left: 12px; } }
  `);

  // ------------------------------------------------------------ the hall
  function neighborPopup(game, it, result) {
    const unit = it.props.unit, n = (pick(game, 'NEIGHBORS') || {})[unit] || APT.NEIGHBORS[unit] || { name: 'Unit ' + unit };
    LM.ui.open({
      kicker: 'Unit ' + unit,
      title: n.name,
      body: paras([n.note, result ? h('p', { class: 'lore', style: 'color:var(--warn)' }, result) : null]),
      actions: [
        { label: 'Knock', primary: true, key: 'E', onClick: () => {
          game.setFlag('knock-' + unit);
          LM.audio.play('door');
          later(() => neighborPopup(game, it, it.props.knock || n.knock || APT.KNOCK));
        } },
        { label: 'Try the knob', onClick: () => {
          game.setFlag('knob-' + unit);
          if (story().knob && story().knob(game, it)) return; // a door that leads somewhere else
          const open = it.props.openFlag && game.hasFlag(it.props.openFlag);
          if (open) {
            game.setFlag('open-' + unit);
            LM.audio.play('door');
            game.toast('The knob turns. The door to ' + unit + ' swings open.', 'key');
            return;
          }
          LM.audio.play('locked');
          later(() => neighborPopup(game, it, it.props.knob || n.knob || APT.KNOB));
        } },
        { label: 'Leave it', quiet: true },
      ],
    });
  }
  const items = {
    'apt-neighbor': {
      // sits on the wall tile of the hall's north wall; drawn on the wall's face
      name: 'Neighbor’s door', radius: 12, shadow: false, mapColor: '#c8a878',
      interact: { available: () => true, prompt: (it) => 'Unit ' + it.props.unit + ': knock, or try the door', use: (it, game) => neighborPopup(game, it) },
      draw(g, it, t, game) {
        const open = game && game.hasFlag && game.hasFlag('open-' + it.props.unit);
        // frame and door on the wall's face, and a little mat on the hall carpet in front
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(-14, 17, 28, 3);
        g.fillStyle = '#6a5a48';
        g.fillRect(-11, 18, 22, 7);
        g.fillStyle = '#3a2818';
        g.fillRect(-15, 1, 30, 17);
        g.fillStyle = open ? '#120e0a' : '#a07850';
        g.fillRect(-13, 2.5, 26, 15.5);
        if (open) return;
        g.fillStyle = '#8a6440';
        g.fillRect(-11, 5, 9.5, 11);
        g.fillRect(1.5, 5, 9.5, 11);
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.fillRect(-13, 2.5, 26, 1.2);
        g.fillStyle = '#e0b858';
        g.beginPath();
        g.arc(9, 12, 1.6, 0, U.TAU);
        g.fill();
        g.fillRect(-3.5, 3.4, 7, 3);
        g.fillStyle = '#3a2410';
        g.font = '700 2.6px sans-serif';
        g.textAlign = 'center';
        g.fillText(it.props.unit, 0, 5.8);
      },
    },
    'apt-stairs-gate': {
      // sits on the roped-off stairs down; gone once the floor's leave flag opens them (timeToLeave, or the level's leaveFlag)
      name: 'Stairs down', radius: 10, shadow: false,
      interact: {
        available: (it, game) => !APT.stairsOpen(game),
        prompt: 'The stairs down',
        use: (it) => LM.ui.showText('The stairs down', it.props.text || 'A red rope across the stairs, and a laminated sign: STAIRWELL CLOSED BELOW THIS FLOOR. CLEANING IN PROGRESS. SORRY FOR THE INCONVENIENCE. — MGMT.\n\nYou can hear the cleaning going on far below. It sounds like it goes down a long way.\n\nYou only just got home anyway.', 'Floor 7'),
      },
    },
    'apt-mat': {
      name: 'Welcome mat', radius: 10, z: -2, shadow: false,
      interact: { available: () => true, prompt: 'Your welcome mat', use: () => LM.ui.showText('Welcome mat', 'It says WELCOME. It’s the only thing in the building that does.\n\nUnder it, where it has always been, your spare key. Under the key, a second key you don’t recognize.', 'Unit 7C') },
      draw(g) {
        g.fillStyle = '#6a3a24';
        g.fillRect(-14, -8, 28, 16);
        g.strokeStyle = '#c8a050';
        g.lineWidth = 1;
        g.strokeRect(-12, -6, 24, 12);
        g.fillStyle = '#e8d8a8';
        g.font = '700 4.2px sans-serif';
        g.textAlign = 'center';
        g.fillText('WELCOME', 0, 1.5);
      },
    },
    'apt-elevator': from('elevator', {
      interact: {
        available: () => true,
        prompt: 'Call the elevator',
        use(it, game) {
          LM.audio.play('locked');
          LM.ui.showText('Elevator', 'You press the button. It doesn’t light. Taped over the doors, a sign in marker: OUT OF ORDER. USE STAIRS. SORRY FOR THE INCONVENIENCE. — MGMT.\n\nUnder that, in a different pen: since Tuesday.\n\nUnder that, in a third: which Tuesday?', 'Floor 7');
        },
      },
      draw(g, it, t, game) {
        LM.get('items', 'elevator').draw(g, it, t, game);
        g.fillStyle = '#f4f1ea';
        g.fillRect(-6, -5, 4, 10);
        g.fillStyle = '#c8302a';
        g.fillRect(-5.4, -3, 2.8, 1);
        g.fillRect(-5.4, 1, 2.8, 1);
      },
      drawGlow() {},
    }),
    'apt-window': from('window', {
      light: { color: '#ffc890', radius: 160, intensity: 0.42 },
      interact: { available: () => true, prompt: 'Look out the window', use: (it) => LM.ui.showText('The window', it.props.text || 'The sun is going down behind the parking garage. The sky goes orange, then a color with no name, then dark. Far off, a plane blinks across it, going somewhere. You’d like to go somewhere.', 'Evening') },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#5a5e64';
        g.fillRect(-10, -15, 10, 30);
        const grd = g.createLinearGradient(-9, 0, -1, 0);
        grd.addColorStop(0, '#f0a060');
        grd.addColorStop(1, '#ffd8a0');
        g.fillStyle = grd;
        g.fillRect(-9, -14, 8, 28);
        g.fillStyle = '#5a5e64';
        g.fillRect(-9, -0.5, 8, 1);
        g.fillStyle = '#c8c4bc';
        g.fillRect(-1, -15, 2.5, 30);
      },
    }),

    // ---------------------------------------------------------------- kitchen
    'apt-fridge': from('fridge', {
      interact: {
        available: () => true,
        prompt: 'Get something to eat',
        use(it, game) {
          const P = game.player;
          // dinner: the frozen pizza comes first
          const pizza = pizzaStep(game) === 'get' ? [{ label: 'Get frozen pizza', primary: true, key: 'E', onClick: () => {
            game.setFlag('aptPizzaOut');
            LM.audio.play('pickup');
            later(() => page('Kitchen', 'Frozen pizza', [APT.PIZZA.get]));
          } }] : [];
          LM.ui.open({
            kicker: 'Kitchen', title: 'The fridge',
            body: paras(pick(game, 'FRIDGE_TEXT') || ['The light comes on. Inside: a carton of lo mein, the end of the turkey, a yogurt, condiments from three apartments ago, and one olive in a jar.', 'A magnet on the door: a tram, from a city you have never been to.']),
            actions: pizza.concat(pick(game, 'FRIDGE').map((f) => ({ label: f.label, onClick: () => {
              if (f.heal) LM.combat.heal(game, P, f.heal);
              game.setFlag('snacked');
              LM.audio.play('pickup');
              later(() => page('Kitchen', f.label, [f.text]));
            } }))).concat([{ label: 'Close the fridge', quiet: true }]),
          });
        },
      },
    }),
    'apt-counter': from('counter', {
      interact: {
        available: (it) => ['sink', 'microwave', 'basin'].includes(it.props.kind),
        prompt: (it) => (it.props.kind === 'microwave' ? 'Use the microwave' : 'Run the tap'),
        use(it, game) {
          if (it.props.kind === 'microwave') {
            LM.audio.play('tick');
            return page('Kitchen', 'The microwave', ['You open it. Empty, and clean, and you’re a little proud of that.', 'The clock on it says 3:47. You have never set the clock on it. It has always said 3:47.']);
          }
          LM.audio.play('splash');
          page(it.props.room || 'Kitchen', 'The tap', [it.props.text || 'It takes a moment to run hot. The pipes in this building knock, politely, like someone asking to come in.']);
        },
      },
    }),
    'apt-oven': {
      name: 'Oven', solid: 'rect', radius: 12,
      init(it) {
        setBox(it, 32, 21, 0, -5.5);
      },
      interact: {
        available: () => true,
        prompt: (it, game) => (pizzaStep(game) === 'cook' ? 'Cook pizza' : 'Open the oven'),
        use(it, game) {
          const step = pizzaStep(game);
          if (step === 'cook') {
            return LM.ui.open({
              kicker: 'Kitchen', title: 'The oven', body: paras(APT.PIZZA.oven),
              actions: [
                { label: 'Cook pizza', primary: true, key: 'E', onClick: () => {
                  game.setFlag('aptPizzaCooked');
                  LM.audio.play('tick');
                  later(() => page('Kitchen', 'Pizza', [APT.PIZZA.cooked]));
                } },
                { label: 'Not yet', quiet: true },
              ],
            });
          }
          if (step === 'eat' || step === 'done') return page('Kitchen', 'The oven', [APT.PIZZA.warm]);
          page('Kitchen', 'The oven', pick(game, 'OVEN_TEXT') || ['You have never once used the oven. Inside, neatly stacked, are takeout menus: Thai, pizza, Thai, the Portuguese place you keep meaning to try.', 'The Portuguese menu has a picture of a tram on it.']);
        },
      },
      drawGlow(g, it, t, game) {
        // the pizza's in: the window glows
        if (pizzaStep(game) !== 'eat') return;
        g.rotate(rot(it));
        G.glow(g, 0, -7, 16, '#ff8a3a', 0.3 + 0.08 * Math.sin(t * 3));
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-15, -15, 32, 21);
        g.fillStyle = '#d8d8d4';
        g.fillRect(-16, -16, 32, 20);
        g.fillStyle = '#26282d';
        g.fillRect(-14, -14, 28, 14);
        g.strokeStyle = '#5a5e64';
        g.lineWidth = 1;
        for (const [x, y] of [[-7, -10], [7, -10], [-7, -4], [7, -4]]) {
          g.beginPath();
          g.arc(x, y, 3.4, 0, U.TAU);
          g.stroke();
        }
        g.fillStyle = '#9aa0a8';
        for (let i = 0; i < 4; i++) g.fillRect(-11 + i * 7, 1, 3, 2);
      },
    },
    'apt-kitchen-table': from('cafe-table', {
      // props.lava: a lava lamp where the laptop should be (Chessboard 1)
      name: 'Kitchen table',
      light: (it) => (it.props.lava ? { color: '#ff6ac8', radius: 110, intensity: 0.4, flicker: 0.12 } : null),
      interact: {
        available: () => true,
        prompt: (it, game) => (it.props.lava ? 'Look at the lava lamp' : pizzaStep(game) === 'eat' ? 'Eat pizza' : 'Use your laptop'),
        use(it, game) {
          if (it.props.lava) return page('Kitchen table', 'A lava lamp', pick(game, 'LAVA') || ['A lava lamp.']);
          if (pizzaStep(game) === 'eat') return eatPizza(game);
          laptop(game);
        },
      },
      draw(g, it, t, game) {
        LM.get('items', 'cafe-table').draw(g, it, t, game);
        const step = pizzaStep(game);
        if (step === 'eat' || step === 'done') {
          // dinner on a plate (or what's left of it)
          g.fillStyle = '#f4f1ea';
          g.beginPath();
          g.arc(-4, 4, 5.4, 0, U.TAU);
          g.fill();
          if (step === 'eat') {
            g.fillStyle = '#d8a050';
            g.beginPath();
            g.arc(-4, 4, 4.4, 0, U.TAU);
            g.fill();
            g.fillStyle = '#c8402a';
            for (const [x, y] of [[-6, 3], [-3, 6], [-2.5, 2.5], [-5.5, 6]]) g.fillRect(x, y, 1.3, 1.3);
          } else {
            g.fillStyle = '#d8a050';
            g.fillRect(-6, 3, 3, 1);
          }
        }
        if (it.props.lava) {
          // the lamp, seen from above: a metal base, a glass cone, the wax inside
          g.fillStyle = '#3a3e48';
          g.beginPath();
          g.arc(3, -3, 4.6, 0, U.TAU);
          g.fill();
          g.fillStyle = '#8a3aa8';
          g.beginPath();
          g.arc(3, -3, 3.4, 0, U.TAU);
          g.fill();
          return;
        }
        g.save();
        if (step === 'eat' || step === 'done') g.translate(4, -4); // the laptop, pushed politely aside
        g.rotate(-0.2);
        g.fillStyle = '#9aa0a8';
        g.fillRect(-6, -2, 12, 7);
        g.fillStyle = '#2a2c32';
        g.fillRect(-6, -6, 12, 4.5);
        g.restore();
      },
      drawGlow(g, it, t, game) {
        if (it.props.lava) {
          for (let i = 0; i < 3; i++) {
            const a = t * (0.5 + i * 0.23) + i * 2.1;
            G.glow(g, 3 + Math.cos(a) * 1.5, -3 + Math.sin(a * 1.3) * 1.5, 2.6 + Math.sin(t * 0.8 + i) * 0.8, i % 2 ? '#ffb030' : '#ff4aa8', 0.95);
          }
          G.glow(g, 3, -3, 14, '#ff6ac8', 0.35);
          return;
        }
        const step = pizzaStep(game);
        if (step === 'eat' || step === 'done') g.translate(4, -4);
        g.rotate(-0.2);
        G.glow(g, 0, -4, 9, '#9ac8ff', 0.4);
      },
    }),

    // ---------------------------------------------------------------- living room
    'apt-bookshelf': from('bookshelf', {
      interact: { available: () => true, prompt: 'Check out a book', use: (it, game) => bookshelf(game) },
    }),
    'apt-tv': {
      // the entertainment center: a long low cabinet with the TV on it (props.dir: the side it faces; props.w tiles long)
      name: 'Entertainment center', solid: 'rect', radius: 16, mapColor: '#8ab4ff',
      light: { color: '#8ab4ff', radius: 120, intensity: 0.3, flicker: 0.2 },
      init(it) {
        const w = it.props.w || 3;
        const d = it.props.dir || 's';
        if (d === 'e' || d === 'w') it.y = it.ty * T + (w * T) / 2;
        else it.x = it.tx * T + (w * T) / 2;
        setBox(it, w * T - 4, 18, 0, -6);
      },
      interact: { available: () => true, prompt: 'Watch TV', use: (it, game) => tv(game) },
      draw(g, it) {
        g.rotate(rot(it));
        const W = (it.props.w || 3) * T - 4, c = it.props.color || '#4a3424';
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-W / 2 + 1, -15, W, 18);
        g.fillStyle = c;
        g.fillRect(-W / 2, -16, W, 18);
        g.fillStyle = U.shade(c, -0.25);
        for (let i = 0; i < 3; i++) g.fillRect(-W / 2 + 4 + i * (W / 3), -4, W / 3 - 8, 5);
        g.fillStyle = '#121216';
        g.fillRect(-22, -14, 44, 6);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(140,180,255,' + (0.4 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3)) + ')';
        g.fillRect(-20, -9, 40, 1);
        G.glow(g, 0, -4, 26, '#8ab4ff', 0.3);
      },
    },
    'apt-console': {
      name: 'Game console', radius: 6, z: 1, shadow: false,
      interact: { available: () => true, prompt: 'Play a game', use: (it, game) => consoleGames(game) },
      draw(g) {
        g.fillStyle = '#e8e6e0';
        G.roundRect(g, -6, -5, 12, 10, 2);
        g.fill();
        g.strokeStyle = '#e8702a';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, 2.6, 0.2, Math.PI * 1.6);
        g.stroke();
        g.fillStyle = '#5a5e64';
        g.fillRect(-9, 6, 5, 3);
      },
      drawGlow(g) {
        G.glow(g, 4, 3, 3, '#e8702a', 0.8);
      },
    },
    'apt-sofa': from('couch', {
      interact: { available: () => true, prompt: 'Sit down and watch TV', use: (it, game) => tv(game) },
    }),
    'apt-coffee-table': from('coffee-table', {
      interact: {
        available: () => true,
        prompt: 'Read the magazine',
        use(it, game) {
          game.setFlag('readMagazine');
          const mag = pick(game, 'MAGAZINE');
          LM.ui.showText(mag.title, mag.text, 'On the coffee table');
        },
      },
    }),

    // ---------------------------------------------------------------- bathrooms
    'apt-toilet': from('toilet', {
      interact: { available: () => true, prompt: 'Flush', use: () => { LM.audio.play('splash'); page('Bathroom', 'The toilet', ['It flushes, eventually, after thinking it over.']); } },
    }),
    'apt-shower': {
      name: 'Shower', radius: 14, solid: 'rect',
      init(it) {
        it.x = it.tx * T + T;
        it.y = it.ty * T + T;
        it.box = [56, 56];
      },
      interact: { available: () => true, prompt: 'Look at the shower', use: () => page('Master bath', 'The shower', ['A shower curtain printed with a map of the world. You’ve drawn little circles on it in marker, around places. Lisbon has three circles.']) },
      draw(g) {
        g.fillStyle = '#e8eef0';
        g.fillRect(-28, -28, 56, 56);
        g.fillStyle = '#c8d8dc';
        g.fillRect(-25, -25, 50, 50);
        g.fillStyle = '#9aa0a8';
        g.beginPath();
        g.arc(0, 0, 2.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7aa0c8';
        g.fillRect(-28, 24, 56, 4);
      },
    },
    'apt-mirror': from('mirror', {
      reach: 26, // it hangs over the sink
      interact: { available: () => true, prompt: 'Look in the mirror', use: (it) => page('Bathroom', 'The mirror', [it.props.text || 'You look like someone who should take a vacation. You’ve looked like that for a while.']) },
    }),

    // ---------------------------------------------------------------- bedroom
    'apt-bed': {
      name: 'Bed', solid: 'rect', radius: 24, mapColor: '#c8a878',
      init(it) {
        const w = it.props.w || 3, hh = it.props.h || 2;
        it.x = it.tx * T + (w * T) / 2;
        it.y = it.ty * T + (hh * T) / 2;
        it.box = [w * T - 6, hh * T - 8];
      },
      interact: {
        available: () => true,
        prompt: (it, game) => (story().bedPrompt && story().bedPrompt(game)) || 'Lie down for a while',
        use(it, game) {
          if (story().bed && story().bed(game, it)) return; // time to sleep (packs/apartment/story.js)
          LM.combat.heal(game, game.player, 100);
          game.setFlag('relaxed');
          page('Bedroom', 'The bed', [
            'You lie down on top of the covers, shoes still on, which is a crime.',
            'The ceiling has a water stain you’ve been watching for a year. Tonight it looks like a door. It has always looked a bit like a door.',
            'You feel better. You could sleep. You don’t, quite.',
          ]);
        },
      },
      draw(g, it) {
        const W = (it.props.w || 3) * T - 6, H = (it.props.h || 2) * T - 8, head = it.props.head || 'e';
        g.save();
        if (head === 'w') g.rotate(Math.PI);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-W / 2 + 2, -H / 2 + 3, W, H);
        g.fillStyle = '#5a3a24';
        g.fillRect(W / 2 - 6, -H / 2 - 2, 6, H + 4);
        g.fillStyle = '#e8e4dc';
        g.fillRect(-W / 2, -H / 2, W - 5, H);
        const bl = it.props.blanket || '#3a5a7a';
        g.fillStyle = bl;
        g.fillRect(-W / 2, -H / 2, W * 0.62, H);
        g.fillStyle = U.shade(bl, 0.15);
        g.fillRect(-W / 2 + W * 0.58, -H / 2, 4, H);
        g.fillStyle = '#f4f1ea';
        G.roundRect(g, W / 2 - 22, -H / 2 + 4, 14, H / 2 - 7, 3);
        g.fill();
        G.roundRect(g, W / 2 - 22, 3, 14, H / 2 - 7, 3);
        g.fill();
        g.restore();
      },
    },
    'apt-nightstand': {
      name: 'Nightstand', solid: true, solidRadius: 10, radius: 10,
      interact: {
        available: (it) => !!it.props.radio,
        prompt: 'Check the clock radio',
        use(it, game) {
          const R = pick(game, 'RADIO');
          const st = (game.aptRadio = ((game.aptRadio == null ? -1 : game.aptRadio) + 1) % R.length);
          page('Bedroom', 'Clock radio', [pick(game, 'RADIO_FACE') || 'The red numbers say 6:30 PM. They have said 6:30 PM for a while now. The colon blinks anyway.', R[st]]);
        },
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-10, -9, 22, 20);
        const c = it.props.color || '#6a4a30';
        g.fillStyle = c;
        g.fillRect(-11, -10, 22, 20);
        g.fillStyle = U.shade(c, -0.15);
        g.fillRect(-9, 3, 18, 1);
        if (it.props.radio) {
          g.fillStyle = '#1a1a1e';
          g.fillRect(-7, -7, 14, 7);
        } else {
          g.fillStyle = '#e8d8a8';
          g.beginPath();
          g.arc(0, -3, 4, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t, game) {
        if (it.props.radio) {
          // Chessboard 1: the whole number blinks, like after a power cut
          const on = Math.sin(t * 3) > 0;
          if (warped(game) && !on) return;
          g.fillStyle = 'rgba(255,60,40,' + (on ? 0.95 : 0.6) + ')';
          g.font = '700 4.4px "IBM Plex Mono", monospace';
          g.textAlign = 'center';
          g.fillText('6:30', 0, -2);
          G.glow(g, 0, -3.5, 8, '#ff3a2a', 0.3);
        } else G.glow(g, 0, -3, 14, '#ffd8a0', 0.35);
      },
      light: (it) => (it.props.radio ? null : { color: '#ffd8a0', radius: 90, intensity: 0.4 }),
    },
    'apt-dresser': {
      name: 'Dresser', solid: 'rect', radius: 12,
      init(it) {
        setBox(it, 30, 16, 0, -8);
      },
      interact: {
        available: () => true,
        prompt: (it, game) => (story().dresserPrompt && story().dresserPrompt(game)) || 'Open the dresser',
        use(it, game) {
          if (story().dresser && story().dresser(game, it)) return; // getting dressed for work (story.js)
          page('Bedroom', 'The dresser', ['T-shirts from 5Ks you didn’t run. Socks, mostly matched. In the bottom drawer, under the winter sweaters, a passport. It’s still valid. It has no stamps in it.']);
        },
      },
      drawGlow(g, it, t, game) {
        // a pulse over the dresser while the story wants you there
        if (!(story().dresserPrompt && story().dresserPrompt(game))) return;
        const k = 0.5 + 0.5 * Math.sin(t * 4);
        G.glow(g, 0, -8, 26 + k * 16, '#ffd870', 0.3 + k * 0.35);
        g.strokeStyle = 'rgba(255,216,112,' + (1 - ((t * 0.9) % 1)) * 0.7 + ')';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(0, -8, 8 + ((t * 0.9) % 1) * 30, 0, U.TAU);
        g.stroke();
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-14, -15, 30, 16);
        g.fillStyle = it.props.color || '#7a5a3a';
        g.fillRect(-15, -16, 30, 16);
        g.fillStyle = '#c8a878';
        for (let i = 0; i < 3; i++) g.fillRect(-10 + i * 9, -6, 3, 1.4);
      },
    },
    'apt-closet': {
      // wall-mounted along a wall, props.w tiles wide
      name: 'Closet', radius: 12, wallMounted: true, shadow: false,
      init(it) {
        const w = it.props.w || 3;
        if (it.face.y !== 0) it.x += ((w - 1) * T) / 2;
        else it.y += ((w - 1) * T) / 2;
      },
      interact: { available: () => true, prompt: 'Look in the closet', use: () => page('Bedroom', 'The closet', ['Work clothes, work clothes, work clothes. A suit for weddings. A raincoat you bought for a trip to Lisbon, tags still on.', 'At the back, on its own hanger, a lanyard you don’t remember owning: MERIDIAN GROUP — VISITOR — LINEAR.']) },
      draw(g, it) {
        const W = (it.props.w || 3) * T - 4;
        g.rotate(wallRot(it));
        g.fillStyle = '#4a3a2a';
        g.fillRect(-1, -W / 2, 14, W);
        g.strokeStyle = '#9aa0a8';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(6, -W / 2 + 2);
        g.lineTo(6, W / 2 - 2);
        g.stroke();
        const cols = ['#2a3a5a', '#e8e4dc', '#5a2a2a', '#3a3a3a', '#c8b070', '#2a5a4a', '#8a8a9a'];
        for (let i = 0; i < Math.floor(W / 6); i++) {
          g.fillStyle = cols[i % cols.length];
          g.fillRect(2, -W / 2 + 3 + i * 6, 9, 4.6);
        }
      },
    },
  };

  // ------------------------------------------------------------ pop-ups
  function bookshelf(game) {
    const list = h('div', { class: 'apt-list' }, pick(game, 'BOOKS').map((b) => {
      const btn = h('button', { type: 'button' }, b.title);
      btn.addEventListener('click', () => {
        LM.audio.play('ui');
        game.setFlag('readBook');
        LM.ui.open({ kicker: 'Your bookshelf', title: b.title, body: paras([b.note]), actions: [{ label: 'Back to the shelf', primary: true, key: 'E', onClick: () => later(() => bookshelf(game)) }, { label: 'Close', quiet: true }] });
      });
      return btn;
    }));
    LM.ui.open({ kicker: 'Living room', title: 'Your bookshelf', wide: true, body: h('div', null, h('p', { class: 'lore' }, pick(game, 'BOOKS_TEXT') || 'Garage-sale paperbacks and gifts. You’ve read most of them. Some of them twice, on purpose.'), list), actions: [{ label: 'Close', primary: true }] });
  }
  function consoleGames(game) {
    const list = h('div', { class: 'apt-list' }, APT.GAMES.map((gm) => {
      const btn = h('button', { type: 'button' }, gm.title, h('small', null, String(gm.year)));
      btn.addEventListener('click', () => {
        LM.audio.play('tick');
        game.setFlag('playedGame');
        LM.ui.open({ kicker: 'Dreamcast · ' + gm.year, title: gm.title, body: paras([gm.note]), actions: [{ label: 'Pick another disc', primary: true, key: 'E', onClick: () => later(() => consoleGames(game)) }, { label: 'Turn it off', quiet: true }] });
      });
      return btn;
    }));
    LM.ui.open({
      kicker: 'Living room', title: 'The game console', wide: true,
      body: h('div', null, h('p', { class: 'lore' }, 'An ancient Dreamcast, from a garage sale, $15 with a shoebox of discs. The fan sounds like a small plane taking off. The little orange swirl lights up.'), list),
      actions: [{ label: 'Turn it off', primary: true }],
    });
  }
  function tv(game) {
    if (story().tv && story().tv(game)) return; // the story has something on
    const list = pick(game, 'CHANNELS');
    const i = (game.aptChannel = ((game.aptChannel == null ? -1 : game.aptChannel) + 1) % list.length);
    const ch = list[i];
    game.setFlag('watchedTV');
    LM.ui.open({
      kicker: 'Living room · TV', title: ch.name, wide: true, body: tvScreen(ch.name, ch.text, ch.banner),
      actions: [{ label: 'Change the channel', primary: true, key: 'E', onClick: () => later(() => tv(game)) }, { label: 'Turn it off', quiet: true }],
    });
  }
  /** The TV, as a picture of a TV: a channel bug, a banner (optional), the program, and a crawl. */
  function tvScreen(channel, text, banner, crawl) {
    return h('div', { class: 'apt-tv' + (banner ? ' breaking' : '') },
      h('div', { class: 'apt-tv-screen' },
        h('span', { class: 'apt-tv-bug' }, channel),
        banner ? h('div', { class: 'apt-tv-banner' }, banner) : null,
        ...[].concat(text).map((p) => h('p', null, p)),
        crawl ? h('div', { class: 'apt-tv-crawl' }, h('span', null, crawl)) : null));
  }
  APT.tvScreen = tvScreen;
  APT.tv = tv;
  function eatPizza(game) {
    LM.ui.open({
      kicker: 'Kitchen table', title: 'Dinner', body: paras(APT.PIZZA.table),
      actions: [
        { label: 'Eat pizza', primary: true, key: 'E', onClick: () => {
          LM.combat.heal(game, game.player, 40);
          LM.audio.play('heal');
          game.setFlag('ateDinner');
          later(() => page('Kitchen table', 'Dinner', [APT.PIZZA.eaten]));
        } },
        { label: 'Use your laptop', onClick: () => later(() => laptop(game)) },
        { label: 'Not yet', quiet: true },
      ],
    });
  }
  // ------------------------------------------------------------ the laptop: email and chat
  function laptop(game) {
    game.setFlag('checkedLaptop');
    const list = MEMOS.inboxes[game.levelId] || [];
    const unread = list.filter((id) => !MEMOS.seen(game, 'email', id)).length;
    LM.ui.open({
      kicker: 'Kitchen table', title: 'Your laptop',
      body: paras(['The lid is open where you left it. Two stickers: a tram, and a cartoon lighthouse. The battery is at 6%, as always, and somehow lasts forever.']),
      actions: [
        { label: 'Check email' + (unread ? ' (' + unread + ')' : ''), primary: true, key: 'E', onClick: () => later(() => MEMOS.openInbox(game)) },
        { label: 'Chat with friends', onClick: () => later(() => chats(game)) },
        { label: 'Close the lid', quiet: true },
      ],
    });
  }
  function chatState(game) {
    const P = game.player;
    P.data.apt = P.data.apt || {};
    return (P.data.apt.chats = P.data.apt.chats || {});
  }
  function chats(game, openId) {
    const st = chatState(game);
    if (openId) {
      const c = APT.CHATS.find((x) => x.id === openId);
      MEMOS.award(game, 'message', 'chat-' + c.id);
      const msgs = c.history.slice();
      if (st[c.id]) msgs.push(['me', st[c.id].label], ['them', st[c.id].then]);
      const convo = h('div', { class: 'apt-chat' }, msgs.map(([who, text]) => h('div', { class: 'bubble ' + who }, text)));
      const replies = !c.online ? [{ label: 'Send “are you ok?”', onClick: () => { game.toast(c.away, ''); return false; } }]
        : st[c.id] ? [] : c.replies.map((r) => ({ label: r.label, onClick: () => { st[c.id] = r; LM.audio.play('ui'); later(() => chats(game, c.id)); } }));
      return LM.ui.open({
        kicker: 'Chat · ' + c.status, title: c.name, body: convo,
        actions: replies.concat([{ label: 'Back to friends', primary: !replies.length, quiet: !!replies.length, onClick: () => later(() => chats(game)) }]),
      });
    }
    const rows = h('div', { class: 'apt-list' }, APT.CHATS.map((c) => {
      const b = h('button', { type: 'button' }, h('span', { class: 'apt-friend' }, h('i', { class: c.online ? 'on' : '' }), h('span', null, c.name, h('small', null, c.status))));
      b.addEventListener('click', () => {
        LM.audio.play('ui');
        chats(game, c.id);
      });
      return b;
    }));
    LM.ui.open({ kicker: 'Your laptop · Chat', title: 'Friends', wide: true, body: rows, actions: [{ label: 'Close the lid', primary: true }] });
  }

  // the laptop's inbox, through the Memos pack's email system
  Object.assign(MEMOS.emails, APT.EMAILS);
  MEMOS.inboxes['apartment'] = ['apt-mom', 'apt-dana', 'apt-travel', 'apt-garage'];
  MEMOS.inboxKickers['apartment'] = 'Your laptop · Mail';

  LM.definePack({ id: 'apartment', items });

  // ------------------------------------------------------------ the stairs down open when it's time to leave
  // Any floor with roped-off stairs (tag aptStairsDown) opens them once its leave flag is set:
  // the level's `leaveFlag`, or timeToLeave. The apartment uses timeToLeave; Home on Chessboard 1
  // uses libraryDone. A flag trap in the level opens them while you're there (with a message);
  // this opens them on arrival if the flag was already set (a checkpoint, or coming back by phone).
  APT.LEAVE_FLAG = 'timeToLeave';
  APT.leaveFlag = (game) => (game.level && game.level.def.leaveFlag) || APT.LEAVE_FLAG;
  APT.stairsOpen = (game) => game.hasFlag(APT.leaveFlag(game));
  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || !APT.stairsOpen(game)) return;
    for (const p of game.level.tags.aptStairsDown || []) game.setTerrain(p.x, p.y, 'exit', 'aptStairsDown');
  });

  // ------------------------------------------------------------ the phone's clock: it's evening here
  LM.on('levelLoaded', (game) => {
    const P = game.player;
    if (!P || game.attract || !P.hasGadget('phone')) return;
    const phone = LM.get('gadgets', 'phone');
    if (game.levelId === 'apartment') {
      phone.badge(game, P); // makes sure the phone's state exists
      P.data.phone.clock = 18 * 3600 + 30 * 60;
      P.data.phone.late = true; // no "you're late" text at home
      P.data.aptVisited = true;
    } else if (game.levelId === 'meridian-fourteen' && P.data.aptVisited && P.data.phone) {
      // the next morning
      P.data.phone.clock = 9 * 3600 + 52 * 60;
      P.data.phone.late = false;
    }
  });
})();
