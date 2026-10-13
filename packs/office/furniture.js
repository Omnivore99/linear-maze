/* The Linear Maze — packs/office/furniture.js
 * Office pack, part 2: everything on the 14th floor that isn't a person.
 *
 * Orientation: furniture with a "front" (where you'd sit or stand) takes
 * props.dir = 's' | 'n' | 'e' | 'w' — the side the front faces. Wall-mounted
 * pieces face away from their wall automatically.
 * Multi-tile pieces (conference tables, the reception desk, couches, rugs)
 * take props.w and props.h in tiles, anchored at their top-left tile.
 * Most interactive pieces read story flags (game.hasFlag) so they change
 * once the note has been read and the door has appeared.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  /** Collision box given in the 's' orientation, rotated to the piece's dir. */
  function setBox(it, w, hh, ox, oy) {
    const d = it.props.dir || 's';
    if (d === 's') { it.box = [w, hh]; it.boxOff = [ox, oy]; }
    else if (d === 'n') { it.box = [w, hh]; it.boxOff = [-ox, -oy]; }
    else if (d === 'e') { it.box = [hh, w]; it.boxOff = [oy, -ox]; }
    else { it.box = [hh, w]; it.boxOff = [-oy, ox]; }
  }
  /** Multi-tile piece: centre it on its w x h tile area. */
  function span(it, w, hh) {
    it.x = it.tx * T + (w * T) / 2;
    it.y = it.ty * T + (hh * T) / 2;
  }
  const flag = (game, f) => !!(game && game.hasFlag && game.hasFlag(f));
  /** Seeded pick: drawing code must never use Math.random, or a piece would change every frame. */
  const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];
  const say = (title, text, kicker) => LM.ui.showText(title, text, kicker);
  /** A pop-up with a body of paragraphs and a set of actions. */
  function popup(kicker, title, paras, actions) {
    LM.ui.open({
      kicker,
      title,
      body: h('div', { class: 'lore-block' }, ...[].concat(paras).filter(Boolean).map((p) => (typeof p === 'string' ? h('p', { class: 'lore' }, p) : p))),
      actions: actions || [{ label: 'Close', primary: true }],
    });
  }

  LM.ui.addStyles(`
    .sticky { width: min(250px, 100%); box-sizing: border-box; padding: 18px 18px 22px; margin: 4px 0 16px; background: #f4dc6c; color: #2b2410;
      font: italic 400 21px/1.3 var(--font-lore); transform: rotate(-1.6deg); box-shadow: 0 10px 22px rgba(0,0,0,0.45); }
    .sticky.faded { background: #cdbf7c; color: #4a4330; }
    .sticky small { display: block; margin-top: 10px; font: 400 12px/1.4 var(--font-ui); font-style: normal; color: #6a5a20; }
    .screen-line { font: 400 12.5px/1.5 var(--font-ui); color: #9fc4e8; background: #0b1420; border: 1px solid #1e3550; padding: 10px 12px; margin-bottom: 12px; }
    .labels { list-style: none; padding: 0; margin: 0 0 12px; display: grid; gap: 6px; }
    .labels li { font: 400 13px/1.4 var(--font-ui); padding: 7px 10px; background: rgba(255,255,255,0.04); border-left: 3px solid #f4dc6c; }
    .labels li.cold { border-left-color: #8fd0e8; color: #cfe8f0; }
  `);

  // ------------------------------------------------------------ drawing helpers
  function chair(g, x, y, a, c) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = '#16171b';
    g.beginPath();
    g.arc(0, 0, 7.5, 0, U.TAU);
    g.fill();
    g.fillStyle = c || '#2d3038';
    G.roundRect(g, -6.5, -6, 13, 11, 3);
    g.fill();
    g.fillStyle = U.shade(c || '#2d3038', -0.3);
    G.roundRect(g, -7, 5, 14, 4, 2);
    g.fill();
    g.restore();
  }
  function deskTop(g, it, t, game) {
    const p = it.props, r = U.mulberry32((it.tx * 977 + it.ty * 131) >>> 0);
    const top = p.top || '#d9d3c6';
    if (p.screen !== false) {
      g.fillStyle = '#5b6273';
      g.fillRect(-16, -16, 32, 3);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(-16, -16, 32, 0.8);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(-14, -12, 30, 17);
    g.fillStyle = top;
    g.fillRect(-15, -13, 30, 16);
    g.fillStyle = U.shade(top, -0.18);
    g.fillRect(-15, 2, 30, 1);
    // monitor, keyboard, mouse
    g.fillStyle = '#1c1d22';
    g.fillRect(-8, -11.5, 16, 2.6);
    g.fillRect(-1.5, -9, 3, 2);
    g.fillStyle = '#c8c8c4';
    g.fillRect(-5.5, -4.5, 11, 3.4);
    g.fillStyle = '#b0b0ac';
    for (let i = 0; i < 4; i++) g.fillRect(-5 + i * 2.6, -4, 2, 2.4);
    g.fillStyle = '#d8d8d4';
    g.beginPath();
    g.ellipse(9, -2.8, 1.4, 2, 0, 0, U.TAU);
    g.fill();
    // clutter
    const n = p.clutter == null ? 2 + Math.floor(r() * 3) : p.clutter;
    for (let i = 0; i < n; i++) {
      const k = r(), cx = -13 + r() * 26, cy = -10 + r() * 10;
      if (Math.abs(cx) < 7 && cy < -5) continue;
      if (k < 0.3) {
        g.fillStyle = pickR(r, ['#b84a3a', '#2a6a8a', '#e8e2d4', '#3a6a3a']);
        g.beginPath();
        g.arc(cx, cy, 1.9, 0, U.TAU);
        g.fill();
        g.fillStyle = '#3a2416';
        g.beginPath();
        g.arc(cx, cy, 1.1, 0, U.TAU);
        g.fill();
      } else if (k < 0.6) {
        g.save();
        g.translate(cx, cy);
        g.rotate((r() - 0.5) * 0.8);
        g.fillStyle = '#f2efe8';
        g.fillRect(-3, -4, 6, 8);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        for (let l = 0; l < 3; l++) g.fillRect(-2, -2.5 + l * 2, 4, 0.5);
        g.restore();
      } else if (k < 0.75) {
        g.fillStyle = '#f4dc6c';
        g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      } else if (k < 0.88) {
        g.fillStyle = '#4a7a3a';
        g.beginPath();
        g.arc(cx, cy, 2.4, 0, U.TAU);
        g.fill();
      } else {
        g.fillStyle = '#2a2a30';
        g.fillRect(cx - 2.5, cy - 1.8, 5, 3.6);
      }
    }
  }
  function screenGlow(g, it, color, k) {
    G.glow(g, 0, -6, 13, color || '#8fb8ff', k == null ? 0.22 : k);
  }
  function wallRot(it) {
    return Math.atan2(it.face.y, it.face.x);
  }
  function plantDraw(g, size, seed) {
    const r = U.mulberry32(seed >>> 0);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.arc(1.5, 2, 7 * size, 0, U.TAU);
    g.fill();
    g.fillStyle = '#e8e4dc';
    g.beginPath();
    g.arc(0, 0, 6 * size, 0, U.TAU);
    g.fill();
    g.fillStyle = '#4a3a2a';
    g.beginPath();
    g.arc(0, 0, 5 * size, 0, U.TAU);
    g.fill();
    const leaves = 9 + Math.floor(r() * 4);
    for (let i = 0; i < leaves; i++) {
      const a = r() * U.TAU, d = (2 + r() * 7) * size;
      g.save();
      g.translate(Math.cos(a) * d * 0.5, Math.sin(a) * d * 0.5);
      g.rotate(a);
      g.fillStyle = pickR(r, ['#3f7a3a', '#4a8a42', '#356a32', '#5a9a4a']);
      g.beginPath();
      g.ellipse(d * 0.5, 0, 4.6 * size, 2.1 * size, 0, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(20,40,20,0.35)';
      g.lineWidth = 0.4;
      g.beginPath();
      g.moveTo(d * 0.5 - 3.5 * size, 0);
      g.lineTo(d * 0.5 + 3.5 * size, 0);
      g.stroke();
      g.restore();
    }
  }
  function counterBase(g, it) {
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(-16, -16, 32, 22);
    g.fillStyle = it.props.top || '#d6d2ca';
    g.fillRect(-16, -16, 32, 20);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(-16, 3, 32, 1);
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(-16, 4, 32, 1.4);
  }

  // ------------------------------------------------------------ items
  const items = {
    // ---------------------------------------------------- workstations
    desk: {
      // props: dir, chair (false = someone brings their own), chairColor, chairSpin, tilt, askew (random tilt), flicker, dark, glow, top, clutter
      name: 'Desk', solid: 'rect', radius: 14,
      cache: true, cacheRadius: 30,
      init(it) {
        if (it.props.askew) {
          const k = U.hash2(it.tx, it.ty, 11);
          it.props.tilt = (k - 0.5) * 2.2;
          it.props.chairSpin = U.hash2(it.tx, it.ty, 12) * U.TAU;
          it.props.chairOff = (U.hash2(it.tx, it.ty, 13) - 0.5) * 14;
          it.props.dir = 'nesw'[Math.floor(U.hash2(it.tx, it.ty, 14) * 4)];
        }
        setBox(it, 30, 19, 0, -6.5);
        // a desk knocked askew collides as a circle, so its box can't disagree with its drawing
        if (it.props.tilt) {
          it.solid = 'circle';
          it.solidRadius = 12;
        }
      },
      draw(g, it, t, game) {
        g.rotate(rot(it) + (it.props.tilt || 0));
        if (it.props.chair !== false) chair(g, (it.props.chairOff || 0), 13, it.props.chairSpin || 0, it.props.chairColor);
        deskTop(g, it, t, game);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it) + (it.props.tilt || 0));
        if (it.props.dark) return;
        const flick = it.props.flicker ? (Math.sin(t * 23 + it.tx) > 0.6 ? 0.05 : 0.3) : 0.2;
        screenGlow(g, it, it.props.glow, flick);
      },
    },
    'my-desk': {
      name: 'Your desk', solid: 'rect', radius: 14, mapColor: '#f4dc6c', mapAlways: true,
      cache: true, cacheRadius: 30, cacheKey: (it, game) => (flag(game, 'readNote') ? 'r' : '') + (flag(game, 'wateredPlant') ? 'w' : ''),
      props: { clutter: 0 },
      init(it) {
        setBox(it, 30, 19, 0, -6.5);
      },
      interact: {
        available: () => true,
        prompt: (it, game) => (flag(game, 'readNote') ? 'Your desk' : 'Check your desk (there’s a note)'),
        use(it, game) {
          const P = game.player;
          const read = flag(game, 'readNote');
          const body = [
            read ? null : h('div', { class: 'sticky' }, 'Meet in the Linear Conference room.', h('small', null, 'Stuck to the middle of your monitor')),
            read
              ? 'A pale square of glue on your monitor where the note was. You still have it. It’s still a little damp.'
              : 'The handwriting isn’t anyone’s you know. Careful, upright letters, the way people wrote before keyboards. The ink is still wet enough to smudge.',
            h('div', { class: 'screen-line' }, 'Inbox: ' + (read ? 42 : 41) + ' unread. Newest, from Dana Whitlock: “Status report? :)”'),
            flag(game, 'wateredPlant') ? 'Your plant looks grateful, as much as a plant can.' : 'Your desk plant is drooping. It’s on your list.',
          ];
          const actions = [];
          if (!read) actions.push({ label: 'Take the note', primary: true, key: 'E', onClick: () => { game.setFlag('readNote'); LM.audio.play('pickup'); game.toast('You pocket the note. Where is the Linear Conference room?', 'key'); } });
          if (!flag(game, 'wateredPlant')) actions.push({ label: 'Water the plant', onClick: () => { game.setFlag('wateredPlant'); LM.audio.play('splash'); game.toast('You water the plant. One thing done today.', 'good'); } });
          actions.push({ label: 'Leave it', quiet: true });
          LM.ui.open({ kicker: 'Workstation 14-112', title: 'Your desk', body: h('div', { class: 'lore-block' }, ...body.filter(Boolean).map((b) => (typeof b === 'string' ? h('p', { class: 'lore' }, b) : b))), actions });
        },
      },
      draw(g, it, t, game) {
        g.rotate(rot(it));
        chair(g, 0, 13, 0.15, '#3a3f4a');
        deskTop(g, it, t, game);
        // your things: a mug, a framed photo, the plant
        g.fillStyle = '#e8e2d4';
        g.beginPath();
        g.arc(10, -8, 2.1, 0, U.TAU);
        g.fill();
        g.fillStyle = '#3a2416';
        g.beginPath();
        g.arc(10, -8, 1.2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#8a6a4a';
        g.fillRect(-13, -11, 4, 3);
        g.save();
        g.translate(-11, -2);
        g.scale(0.45, 0.45);
        plantDraw(g, flag(game, 'wateredPlant') ? 1 : 0.8, 7);
        g.restore();
        if (!flag(game, 'readNote')) {
          g.fillStyle = '#f4dc6c';
          g.fillRect(-2.2, -11.8, 4.4, 4.4);
        }
      },
      drawGlow(g, it, t, game) {
        g.rotate(rot(it));
        screenGlow(g, it, '#8fb8ff', 0.25);
        if (!flag(game, 'readNote')) G.glow(g, 0, -9.5, 10, '#f4dc6c', 0.45 + 0.2 * Math.sin(t * 3));
      },
    },
    'echo-desk': {
      name: 'A desk like yours', solid: 'rect', radius: 14, mapColor: '#f4dc6c',
      cache: true, cacheRadius: 30,
      init(it) {
        setBox(it, 30, 19, 0, -6.5);
        it.solid = it.props.tilt ? 'circle' : 'rect';
      },
      interact: {
        available: () => true,
        prompt: 'Look at the desk',
        use(it, game) {
          LM.ui.open({
            kicker: it.props.kicker || 'Workstation 14-112',
            title: it.props.title || 'Your desk?',
            body: h('div', { class: 'lore-block' },
              h('div', { class: 'sticky faded' }, it.props.note || 'Meet in the Linear Conference room.'),
              h('p', { class: 'lore' }, it.props.text || 'Your mug. Your photo. Your plant, dead and dry. The chair is still warm.')),
            actions: [{ label: 'Leave it', primary: true }],
          });
        },
      },
      draw(g, it, t, game) {
        g.rotate(rot(it) + (it.props.tilt || 0));
        chair(g, 0, 13, it.props.chairSpin || 0.4, '#3a3f4a');
        deskTop(g, Object.assign({}, it, { props: Object.assign({ clutter: 0, top: '#bcb6aa' }, it.props) }), t, game);
        g.fillStyle = '#e8e2d4';
        g.beginPath();
        g.arc(10, -8, 2.1, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6a5a3a';
        g.beginPath();
        g.arc(-11, -2, 3, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d8c66a';
        g.fillRect(-2.2, -11.8, 4.4, 4.4);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it) + (it.props.tilt || 0));
        G.glow(g, 0, -9.5, 9, '#f4dc6c', 0.25 + 0.15 * Math.sin(t * 2 + it.tx));
        screenGlow(g, it, '#7fffb0', Math.sin(t * 17 + it.ty) > 0.3 ? 0.05 : 0.22);
      },
    },
    chair: {
      // props.dir: the side the backrest is on; props.rot: radians; props.askew: knocked to a random angle
      name: 'Office chair', radius: 7, solid: true, solidRadius: 6,
      cache: true, cacheRadius: 12,
      init(it) {
        if (it.props.askew) it.props.rot = U.hash2(it.tx, it.ty, 5) * U.TAU;
      },
      draw(g, it) {
        chair(g, 0, 0, it.props.rot != null ? it.props.rot : rot(it), it.props.color);
      },
    },
    plant: {
      name: 'Plant', radius: 9, solid: true, solidRadius: 8,
      cache: true, cacheRadius: 22,
      draw(g, it) {
        plantDraw(g, it.props.big ? 1.45 : 1, it.tx * 17 + it.ty * 29);
      },
    },
    printer: {
      name: 'Copier', solid: 'rect', radius: 13, mapColor: '#cfc6b0',
      cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 28, 22, 0, -3);
      },
      interact: {
        available: () => true,
        prompt: 'Use the copier',
        use(it, game) {
          if (it.props.wrong) {
            return popup('Copier', 'The copier', ['It is printing floor plans. Hundreds of them, warm, sliding off the tray onto the carpet.', 'None of them are of this floor. Each one has one more corridor than the last.']);
          }
          if (flag(game, 'readNote')) {
            return popup('Copier', 'The copier', ['It’s printing on its own. The same page, over and over:', h('div', { class: 'sticky faded' }, 'MEET IN THE LINEAR CONFERENCE ROOM'), 'The output tray is already full.'], [
              { label: 'Unplug it', primary: true, onClick: () => game.toast('You pull the plug. It keeps printing.', 'warn') },
              { label: 'Leave it', quiet: true },
            ]);
          }
          popup('Copier', 'The copier', ['The display says PC LOAD LETTER. Nobody knows what that means. Nobody has ever known.'], [
            { label: 'Give it a kick', primary: true, onClick: () => { LM.audio.play('break'); game.toast('It prints a single blank page. It’s warm.'); } },
            { label: 'Leave it', quiet: true },
          ]);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -13, 28, 24);
        g.fillStyle = '#d6d6d2';
        g.fillRect(-14, -14, 28, 22);
        g.fillStyle = '#b8b8b4';
        g.fillRect(-12, -12, 18, 14);
        g.fillStyle = '#3a3c42';
        g.fillRect(8, -12, 4, 8);
        g.fillStyle = '#f2efe8';
        g.fillRect(-10, 4, 14, 6);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.fillRect(-10, 6, 14, 0.6);
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 10, -10, 3, Math.sin(t * 3) > 0 ? '#5aff7a' : '#ffb04a', 0.8);
      },
    },
    filing: {
      name: 'Filing cabinet', solid: 'rect', radius: 11,
      cache: true, cacheRadius: 20,
      init(it) {
        setBox(it, 26, 15, 0, -8);
      },
      interact: {
        available: () => true,
        prompt: 'Look at the filing cabinet',
        use: (it, game) => say('Filing cabinet', flag(game, 'doorAppeared')
          ? 'Drawers A–K, M–Z. The drawer marked L is standing open. It is empty except for a smell of wet stone.'
          : 'Drawers labeled A–K, L, M–Z. The L drawer is locked. Nobody has the key. Nobody remembers it ever being unlocked.', 'Storage'),
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-12, -15, 26, 16);
        g.fillStyle = '#8a9098';
        g.fillRect(-13, -16, 26, 15);
        g.fillStyle = '#6a7078';
        for (let i = 0; i < 3; i++) g.fillRect(-12 + i * 8.6, -15, 0.8, 13);
        g.fillStyle = '#c8ccd0';
        for (let i = 0; i < 3; i++) g.fillRect(-10 + i * 8.6, -4, 4, 1.2);
      },
    },
    cooler: {
      name: 'Water cooler', radius: 7, solid: true, solidRadius: 7,
      cache: true, cacheRadius: 10,
      interact: {
        available: () => true,
        prompt: 'Have a drink of water',
        use(it, game) {
          const lines = flag(game, 'doorOpened')
            ? ['The water is warm and tastes of copper. The jug glugs and a bubble the size of a fist rises, and stops halfway, and stays.']
            : ['Cold. The jug glugs. You stand there with the paper cone, which is the main thing people do at water coolers.', 'You overhear nothing, because nobody is here. That is also the main thing that happens at water coolers.'];
          popup('Water cooler', 'Water cooler', lines);
        },
      },
      draw(g) {
        g.fillStyle = '#d8d8d4';
        g.fillRect(-7, -7, 14, 14);
        g.fillStyle = 'rgba(120,180,230,0.65)';
        g.beginPath();
        g.arc(0, 0, 5.6, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.beginPath();
        g.arc(-1.8, -1.8, 1.6, 0, U.TAU);
        g.fill();
      },
    },
    bin: {
      name: 'Bin', radius: 5, solid: true, solidRadius: 5,
      cache: true, cacheRadius: 8,
      draw(g, it) {
        g.fillStyle = it.props.color || '#3a3e46';
        g.beginPath();
        g.arc(0, 0, 4.8, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1a1c20';
        g.beginPath();
        g.arc(0, 0, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8e4dc';
        g.fillRect(-1.5, -1, 3, 2.5);
      },
    },

    // ---------------------------------------------------- meeting rooms
    'conf-table': {
      name: 'Conference table', solid: 'rect', radius: 20, z: -1,
      cache: true, cacheRadius: (it) => Math.max(it.props.w || 4, it.props.h || 2) * 16 + 24,
      init(it) {
        const w = it.props.w || 4, hh = it.props.h || 2;
        span(it, w, hh);
        it.box = [w * T - 20, hh * T - 22];
        it.boxOff = [0, 0];
        it.r = Math.max(w, hh) * 12;
      },
      draw(g, it) {
        const W = it.box[0], H = it.box[1];
        if (it.props.chairs !== false) {
          const n = it.props.seats || Math.max(1, Math.floor(W / 28));
          for (let i = 0; i < n; i++) {
            const cx = -W / 2 + (W / n) * (i + 0.5);
            chair(g, cx, -H / 2 - 8, Math.PI, '#2d3038');
            chair(g, cx, H / 2 + 8, 0, '#2d3038');
          }
        }
        g.fillStyle = 'rgba(0,0,0,0.35)';
        G.roundRect(g, -W / 2 + 2, -H / 2 + 3, W, H, 8);
        g.fill();
        const grd = g.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2);
        grd.addColorStop(0, it.props.wood || '#6a4a30');
        grd.addColorStop(1, U.shade(it.props.wood || '#6a4a30', -0.25));
        g.fillStyle = grd;
        G.roundRect(g, -W / 2, -H / 2, W, H, 8);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)';
        G.roundRect(g, -W / 2 + 3, -H / 2 + 2, W - 6, 3, 2);
        g.fill();
        g.fillStyle = '#1c1d22';
        g.beginPath();
        g.moveTo(0, -4);
        g.lineTo(4.5, 2.5);
        g.lineTo(-4.5, 2.5);
        g.closePath();
        g.fill();
        if (it.props.laptops) {
          for (let i = 0; i < it.props.laptops; i++) {
            const lx = -W / 2 + 16 + i * ((W - 32) / Math.max(1, it.props.laptops - 1));
            g.fillStyle = '#9aa0a8';
            g.fillRect(lx - 5, (i % 2 ? H / 2 - 12 : -H / 2 + 4), 10, 7);
          }
        }
      },
      drawGlow(g, it) {
        G.glow(g, 0, -1, 6, '#5aff7a', 0.35);
      },
    },
    whiteboard: {
      name: 'Whiteboard', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      interact: {
        available: () => true,
        prompt: 'Read the whiteboard',
        use: (it, game) => say(it.props.title || 'Whiteboard', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text || 'Someone wrote DO NOT ERASE and then erased everything else.', 'Whiteboard'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#7d858f';
        g.fillRect(-1, -14, 4.5, 28);
        g.fillStyle = '#f4f4f0';
        g.fillRect(-0.4, -13.2, 3.4, 26.4);
        const r = U.mulberry32((it.tx * 31 + it.ty * 7) >>> 0);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = pickR(r, ['#2a5aa8', '#c8302a', '#2a8a4a', '#1a1a1a']);
          g.fillRect(0.4 + r() * 1.6, -11 + i * 5 + r() * 2, 0.6, 3 + r() * 4);
        }
        g.fillStyle = '#5a5e64';
        g.fillRect(3.5, -6, 1.6, 12);
      },
    },
    tv: {
      name: 'Screen', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      light: { color: '#8ab4ff', radius: 95, intensity: 0.3, flicker: 0.05 },
      interact: {
        available: () => true,
        prompt: 'Look at the screen',
        use: (it, game) => say('The screen', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text || 'Waiting for the host to start this meeting.', 'Display'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#121216';
        g.fillRect(-1, -13, 3.6, 26);
      },
      drawGlow(g, it, t) {
        g.rotate(wallRot(it));
        g.fillStyle = 'rgba(140,180,255,' + (0.5 + 0.1 * Math.sin(t * 2)) + ')';
        g.fillRect(2.2, -12, 0.9, 24);
        G.glow(g, 6, 0, 14, '#8ab4ff', 0.3);
      },
    },
    sign: {
      name: 'Sign', radius: 5, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 12,
      interact: {
        available: (it) => !!it.props.text,
        prompt: (it) => 'Read the sign' + (it.props.label ? ': ' + it.props.label : ''),
        use: (it, game) => say(it.props.label || 'Sign', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text, it.props.kicker || 'Sign'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = it.props.plate || '#2a2c32';
        g.fillRect(-0.5, -6, 3.2, 12);
        g.fillStyle = it.props.ink || '#e8e4dc';
        g.fillRect(1.1, -4, 0.7, 8);
      },
    },

    // ---------------------------------------------------- windows, elevators, art
    window: {
      name: 'Window', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      light: { color: '#cfe2ff', radius: 150, intensity: 0.42, flicker: 0, dy: 0 },
      draw(g, it) {
        drawWindow(g, it);
      },
    },
    'odd-window': {
      name: 'Window', radius: 10, wallMounted: true, shadow: false, mapColor: '#e0b25a',
      light: { color: '#cfe2ff', radius: 150, intensity: 0.42 },
      update(it, dt, game) {
        if (it.light && game.hasFlag('doorAppeared')) it.light.off = true;
      },
      interact: {
        available: (it, game) => game.hasFlag('doorAppeared') && !game.hasFlag('doorOpened'),
        prompt: 'Examine the door that wasn’t there before',
        use(it, game) {
          LM.ui.open({
            kicker: 'West hall',
            title: 'A door that wasn’t there before',
            body: h('div', { class: 'lore-block' },
              h('p', { class: 'lore' }, 'This morning there was a window here. You remember it: the parking structure, the gray river, the pigeon that sits on the ledge every day at ten.'),
              h('p', { class: 'lore' }, 'Now there is a door. It is older than the building. Dark wood, iron studs, a brass plate engraved in a careful upright hand: LINEAR. Warm air moves along the seam. It smells like candle wax and wet stone.'),
              h('p', { class: 'muted' }, 'On the other side, faintly, a room full of people is waiting for someone to arrive.')),
            actions: [
              {
                label: 'Open it', primary: true, key: 'E',
                onClick: () => {
                  const door = game.level.doorAt[game.level.idx(it.tx, it.ty)];
                  if (door) door.sealed = false;
                  game.setFlag('doorOpened');
                  LM.audio.play('door');
                  LM.audio.play('altar');
                  game.toast('The door swings open onto a hallway that cannot be there.', 'warn');
                },
              },
              { label: 'Not yet', quiet: true },
            ],
          });
        },
      },
      draw(g, it, t, game) {
        if (game && game.hasFlag && game.hasFlag('doorAppeared')) return;
        drawWindow(g, it);
      },
    },
    elevator: {
      name: 'Elevator', radius: 8, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      interact: {
        available: () => true,
        prompt: 'Call the elevator',
        use(it, game) {
          LM.audio.play('ui');
          say('Elevator', flag(game, 'doorOpened')
            ? 'The button lights. The display reads L, then L, then L. You can hear it somewhere below you, still going down.'
            : flag(game, 'readNote')
              ? 'The button lights. The display reads 14, then 14, then 14. The doors stay shut. Nobody is leaving before the meeting.'
              : 'The button lights. The display reads 14. You’re already here.', 'Lobby');
        },
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#5a5e64';
        g.fillRect(-7, -13, 8, 26);
        const grd = g.createLinearGradient(0, -12, 0, 12);
        grd.addColorStop(0, '#c8ccd2');
        grd.addColorStop(0.5, '#9aa0a8');
        grd.addColorStop(1, '#c8ccd2');
        g.fillStyle = grd;
        g.fillRect(-6, -12, 7, 24);
        g.fillStyle = '#3a3e44';
        g.fillRect(-6, -0.4, 7, 0.8);
      },
      drawGlow(g, it, t) {
        g.rotate(wallRot(it));
        G.glow(g, 3, -14.5, 4, '#ffb04a', 0.8);
      },
    },
    art: {
      name: 'Framed print', radius: 5, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 12,
      interact: {
        available: (it) => !!it.props.text,
        prompt: 'Look at the picture',
        use: (it, game) => say(it.props.title || 'A framed picture', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text, it.props.kicker || 'On the wall'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#1c1a18';
        g.fillRect(-0.6, -9, 3, 18);
        g.fillStyle = it.props.color || '#c8a060';
        g.fillRect(0.4, -7.5, 1.6, 15);
      },
    },
    logo: {
      name: 'Company sign', radius: 8, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 32,
      light: { color: '#ffe2b0', radius: 120, intensity: 0.35 },
      interact: {
        available: () => true,
        prompt: 'Read the sign',
        use: () => say('MERIDIAN GROUP', 'Brushed brass letters, backlit, slightly crooked. Underneath, smaller: Clarity at Scale.\n\nUnderneath that, smaller still, in a different brass that doesn’t quite match: and Linear.', 'Reception'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#b8913e';
        for (let i = 0; i < 8; i++) g.fillRect(-0.5, -28 + i * 7, 3, 5);
      },
      drawGlow(g, it) {
        g.rotate(wallRot(it));
        for (let i = 0; i < 8; i++) G.glow(g, 2, -25.5 + i * 7, 5, '#ffd690', 0.35);
      },
    },

    // ---------------------------------------------------- lobby
    reception: {
      name: 'Reception desk', solid: 'rect', radius: 30,
      cache: true, cacheRadius: (it) => Math.max(it.props.w || 5, it.props.h || 2) * 16 + 8,
      init(it) {
        const w = it.props.w || 5, hh = it.props.h || 2;
        span(it, w, hh);
        it.box = [w * T - 8, hh * T - 10];
        it.boxOff = [0, 0];
      },
      draw(g, it) {
        const W = it.box[0], H = it.box[1];
        g.fillStyle = 'rgba(0,0,0,0.35)';
        G.roundRect(g, -W / 2 + 2, -H / 2 + 3, W, H, 10);
        g.fill();
        g.fillStyle = '#e9e5dc';
        G.roundRect(g, -W / 2, -H / 2, W, H, 10);
        g.fill();
        g.fillStyle = '#7a5a3a';
        G.roundRect(g, -W / 2 + 6, -H / 2 + 6, W - 12, H - 16, 6);
        g.fill();
        g.fillStyle = '#5a4026';
        g.fillRect(-W / 2 + 6, H / 2 - 12, W - 12, 2);
        // monitors, desk phone, a bell, a vase
        g.fillStyle = '#1c1d22';
        g.fillRect(-14, -H / 2 + 9, 14, 2.4);
        g.fillRect(4, -H / 2 + 9, 14, 2.4);
        g.fillStyle = '#2a2a30';
        g.fillRect(-W / 2 + 12, -6, 10, 7);
        g.fillStyle = '#c9a046';
        g.beginPath();
        g.arc(W / 2 - 16, 6, 2.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.arc(W / 2 - 14, -8, 3.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d0506a';
        for (let i = 0; i < 5; i++) {
          g.beginPath();
          g.arc(W / 2 - 14 + Math.cos(i * 1.3) * 3, -8 + Math.sin(i * 1.3) * 3, 1.6, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        const W = it.box[0], H = it.box[1];
        G.glow(g, -7, -H / 2 + 14, 12, '#8fb8ff', 0.22);
        G.glow(g, 11, -H / 2 + 14, 12, '#8fb8ff', 0.22);
        // line four is always lit
        G.glow(g, -W / 2 + 19, -3, 3, '#ff5a3a', 0.5 + 0.5 * Math.sin(t * 5));
      },
    },
    couch: {
      name: 'Couch', solid: 'rect', radius: 16,
      cache: true, cacheRadius: (it) => (it.props.w || 2) * 16 + 8,
      init(it) {
        const w = it.props.w || 2;
        it.cw = w;
        if ((it.props.dir || 's') === 'e' || it.props.dir === 'w') {
          it.x = it.tx * T + T / 2;
          it.y = it.ty * T + (w * T) / 2;
        } else {
          it.x = it.tx * T + (w * T) / 2;
          it.y = it.ty * T + T / 2;
        }
        setBox(it, w * T - 6, 20, 0, -1);
      },
      draw(g, it) {
        g.rotate(rot(it));
        const W = it.cw * T - 6, c = it.props.color || '#4a5a6a';
        g.fillStyle = 'rgba(0,0,0,0.3)';
        G.roundRect(g, -W / 2 + 2, -10, W, 22, 5);
        g.fill();
        g.fillStyle = U.shade(c, -0.25);
        G.roundRect(g, -W / 2, -11, W, 21, 5);
        g.fill();
        g.fillStyle = c;
        const n = it.cw;
        for (let i = 0; i < n; i++) {
          G.roundRect(g, -W / 2 + 5 + i * ((W - 10) / n), -4, (W - 10) / n - 1.5, 12, 3);
          g.fill();
        }
        g.fillStyle = U.shade(c, 0.12);
        G.roundRect(g, -W / 2 + 4, -10, W - 8, 6, 3);
        g.fill();
      },
    },
    'coffee-table': {
      name: 'Coffee table', solid: 'rect', radius: 12,
      cache: true, cacheRadius: 18,
      init(it) {
        it.box = [26, 16];
      },
      draw(g) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        G.roundRect(g, -12, -7, 26, 16, 3);
        g.fill();
        g.fillStyle = '#3a2a1e';
        G.roundRect(g, -13, -8, 26, 16, 3);
        g.fill();
        g.fillStyle = '#e8e4dc';
        g.save();
        g.rotate(0.2);
        g.fillRect(-8, -4, 8, 6);
        g.fillStyle = '#c8302a';
        g.fillRect(-8, -4, 8, 1.6);
        g.restore();
      },
    },
    'cafe-table': {
      name: 'Table', radius: 11, solid: true, solidRadius: 11,
      cache: true, cacheRadius: 16,
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.arc(1.5, 2.5, 11.5, 0, U.TAU);
        g.fill();
        g.fillStyle = it.props.top || '#e4ded2';
        g.beginPath();
        g.arc(0, 0, 11.5, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.18)';
        g.lineWidth = 1;
        g.stroke();
        const r = U.mulberry32((it.tx * 41 + it.ty * 13) >>> 0);
        if (r() < 0.7) {
          g.fillStyle = '#e8e2d4';
          g.beginPath();
          g.arc(-4 + r() * 8, -4 + r() * 8, 2.1, 0, U.TAU);
          g.fill();
          g.fillStyle = '#3a2416';
          g.beginPath();
          g.arc(-4 + r() * 8, -4 + r() * 8, 1.1, 0, U.TAU);
          g.fill();
        }
        if (r() < 0.5) {
          g.save();
          g.rotate(r() * U.TAU);
          g.fillStyle = '#c8a070';
          g.fillRect(-5, -3.5, 10, 7);
          g.fillStyle = '#f2efe8';
          g.fillRect(-4, -2.5, 8, 5);
          g.restore();
        }
      },
    },
    rug: {
      name: 'Rug', radius: 4, z: -3, shadow: false,
      cache: true, cacheRadius: (it) => Math.max(it.props.w || 3, it.props.h || 2) * 16 + 4,
      init(it) {
        span(it, it.props.w || 3, it.props.h || 2);
      },
      draw(g, it) {
        const W = (it.props.w || 3) * T - 8, H = (it.props.h || 2) * T - 8, c = it.props.color || '#6a2a30';
        g.fillStyle = c;
        g.fillRect(-W / 2, -H / 2, W, H);
        g.strokeStyle = it.props.border || '#c9a046';
        g.lineWidth = 1.5;
        g.strokeRect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8);
        g.strokeStyle = U.rgba(it.props.border || '#c9a046', 0.4);
        g.lineWidth = 0.8;
        g.strokeRect(-W / 2 + 8, -H / 2 + 8, W - 16, H - 16);
      },
    },

    // ---------------------------------------------------- pantry
    counter: {
      name: 'Counter', solid: 'rect', radius: 12,
      cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 32, 21, 0, -5.5);
      },
      interact: {
        available: (it) => it.props.kind === 'microwave' || it.props.kind === 'sink' || it.props.kind === 'basin',
        prompt: (it) => (it.props.kind === 'microwave' ? 'Look in the microwave' : 'Run the tap'),
        use(it, game) {
          if (it.props.kind === 'microwave') {
            return popup('Pantry', 'The microwave', [flag(game, 'tookSalmon')
              ? 'Empty, and it still smells of salmon. It will smell of salmon until the heat death of the universe.'
              : 'Gary’s salmon is turning slowly inside. The display says 3:47. It has said 3:47 for some time.']);
          }
          popup(it.props.room || 'Pantry', 'The tap', [flag(game, 'doorOpened') ? 'The water runs brown for a moment, then clear, then a very cold blue.' : 'Hot on the left, hot on the right. Someone wrote CAREFUL on the faucet in marker.']);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        counterBase(g, it);
        const k = it.props.kind;
        if (k === 'sink') {
          g.fillStyle = '#9aa0a8';
          G.roundRect(g, -8, -12, 16, 11, 3);
          g.fill();
          g.fillStyle = '#6a7078';
          G.roundRect(g, -6.5, -10.5, 13, 8, 2);
          g.fill();
          g.fillStyle = '#c8ccd0';
          g.fillRect(-0.8, -15, 1.6, 4);
        } else if (k === 'microwave') {
          g.fillStyle = '#26282d';
          g.fillRect(-11, -15, 22, 13);
          g.fillStyle = '#4a4e56';
          g.fillRect(-9, -13, 13, 9);
        } else if (k === 'kettle') {
          g.fillStyle = '#c8ccd0';
          g.beginPath();
          g.arc(-6, -8, 4, 0, U.TAU);
          g.fill();
          g.fillStyle = '#e8e4dc';
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.arc(5 + i * 4, -9, 1.8, 0, U.TAU);
            g.fill();
          }
        } else if (k === 'basin') {
          g.fillStyle = '#f2f2f0';
          G.roundRect(g, -9, -13, 18, 12, 5);
          g.fill();
          g.fillStyle = '#d8dcde';
          G.roundRect(g, -7, -11.5, 14, 9, 4);
          g.fill();
          g.fillStyle = '#9aa0a8';
          g.fillRect(-0.8, -15.5, 1.6, 4);
        }
      },
      drawGlow(g, it, t, game) {
        if (it.props.kind === 'microwave' && !flag(game, 'tookSalmon')) {
          g.rotate(rot(it));
          G.glow(g, -2.5, -8.5, 7, '#ffcf80', 0.45);
        }
      },
    },
    'coffee-machine': {
      name: 'Espresso machine', solid: 'rect', radius: 12, mapColor: '#c8a070',
      cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 32, 21, 0, -5.5);
      },
      interact: {
        available: () => true,
        prompt: 'Make an espresso',
        use(it, game) {
          const P = game.player;
          popup('Pantry', 'The espresso machine', [
            'A chrome machine the size of a small car, bought in a fit of morale. It hisses at you.',
            (it.cups || 0) >= 3 ? 'You have had ' + it.cups + ' already. Your hands have opinions.' : null,
          ], [
            {
              label: 'Pull a shot', primary: true, key: 'E',
              onClick: () => {
                it.cups = (it.cups || 0) + 1;
                P.addBuff('caffeine', 'Caffeinated', { speed: 24, dashCooldown: -0.2 }, 60);
                LM.audio.play('recharge');
                game.particles.burst(it.x, it.y - 6, 10, { type: 'smoke', color: '#e8e4dc', speed: 18, life: 1.4, size: 2, alpha: 0.35, drag: 1 });
                game.toast('Caffeinated: you move faster for a minute.', 'good');
                game.setFlag('coffee');
              },
            },
            { label: 'Step away', quiet: true },
          ]);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        counterBase(g, it);
        g.fillStyle = '#c8ccd2';
        g.fillRect(-10, -15, 20, 11);
        g.fillStyle = '#2a2c32';
        g.fillRect(-8, -13, 16, 3);
        g.fillStyle = '#1c1d22';
        g.beginPath();
        g.arc(-4, -6, 2, 0, U.TAU);
        g.arc(4, -6, 2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        g.rotate(rot(it));
        G.glow(g, 6, -11.5, 2.5, '#5aff7a', 0.8);
      },
    },
    fridge: {
      name: 'Fridge', solid: 'rect', radius: 12, mapColor: '#cfe8f0',
      cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 26, 22, 0, -5);
      },
      interact: {
        available: () => true,
        prompt: 'Open the fridge',
        use(it, game) {
          const took = flag(game, 'tookSalmon');
          const labels = [
            h('li', null, 'PRIYA — PAD THAI — DO NOT TOUCH (I MEAN IT)'),
            took ? h('li', null, 'An empty shelf where Gary’s salmon was. A fresh sticky note: GARY, I KNOW. — P.') : h('li', null, 'gary - salmon (reheat 4 min!!)'),
            h('li', null, 'A yogurt with DANA on the lid. It expired in March.'),
            h('li', null, 'TOMAS — MILK (OAT) (MINE) (YES I CAN SEE THE LEVEL)'),
            flag(game, 'readNote') ? h('li', { class: 'cold' }, 'On the back shelf, something new: an empty container labeled LINEAR. It is colder than the rest of the fridge.') : null,
          ];
          const actions = [];
          if (!took) actions.push({
            label: 'Take Gary’s salmon', onClick: () => {
              game.setFlag('tookSalmon');
              LM.audio.play('pickup');
              game.toast('You are now, technically, the lunch thief.', 'warn');
            },
          });
          actions.push({ label: 'Close the fridge', primary: true });
          LM.ui.open({ kicker: 'Pantry', title: 'The fridge', body: h('div', null, h('ul', { class: 'labels' }, labels), h('p', { class: 'muted' }, 'It hums. Someone has taped a sign to the door: THIS IS NOT A FREE FRIDGE.')), actions });
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-12, -15, 26, 22);
        g.fillStyle = '#d8dcde';
        g.fillRect(-13, -16, 26, 22);
        g.fillStyle = '#b8bcc0';
        g.fillRect(-13, -4, 26, 1);
        g.fillStyle = '#9aa0a8';
        g.fillRect(9, -14, 1.6, 8);
        g.fillRect(9, -2, 1.6, 6);
        g.fillStyle = '#f4dc6c';
        g.fillRect(-8, -12, 3, 3);
        g.fillRect(-3, -1, 3, 3);
      },
    },
    vending: {
      name: 'Vending machine', solid: 'rect', radius: 12,
      cache: true, cacheRadius: 22,
      light: { color: '#ffe8c0', radius: 90, intensity: 0.32, flicker: 0.04 },
      init(it) {
        setBox(it, 28, 20, 0, -6);
      },
      interact: {
        available: () => true,
        prompt: 'Buy a snack',
        use(it, game) {
          const lines = [
            'The coil turns, and turns, and turns. Nothing falls. The display says THANK YOU.',
            'A bag of pretzels drops. The best-before date is last year. You eat them anyway.',
            'It takes your card, thinks about it for a long time, and gives it back with a small sigh.',
            'B4 is labeled LINEAR. It is sold out. It was always sold out.',
          ];
          it.n = ((it.n || 0) + 1) % lines.length;
          popup('Pantry', 'The vending machine', [lines[it.n]]);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -15, 28, 20);
        g.fillStyle = '#2a2c32';
        g.fillRect(-14, -16, 28, 20);
        g.fillStyle = '#c8302a';
        g.fillRect(-14, 1, 28, 3);
      },
      drawGlow(g, it) {
        g.rotate(rot(it));
        const cols = ['#ff6a5a', '#ffd25a', '#5ad0ff', '#7aff8a'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) G.glow(g, -9 + i * 6, -11 + j * 6, 3, cols[(i + j) % 4], 0.4);
      },
    },

    // ---------------------------------------------------- bathroom
    toilet: {
      name: 'Toilet', solid: 'rect', radius: 8,
      cache: true, cacheRadius: 18,
      init(it) {
        setBox(it, 14, 18, 0, -5);
      },
      interact: {
        available: () => true,
        prompt: 'Flush',
        use(it, game) {
          LM.audio.play('splash');
          popup('Restroom', 'The toilet', [flag(game, 'doorOpened') ? 'It flushes. A long time later, very far below you, something flushes back.' : 'It flushes with the confidence of commercial plumbing.']);
        },
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#e8eaec';
        g.fillRect(-7, -15, 14, 6);
        g.beginPath();
        g.ellipse(0, -3, 6, 7.5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c8ccd0';
        g.beginPath();
        g.ellipse(0, -2.5, 4, 5.5, 0, 0, U.TAU);
        g.fill();
      },
    },
    mirror: {
      name: 'Mirror', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      interact: {
        available: () => true,
        prompt: 'Look in the mirror',
        use(it, game) {
          popup('Restroom', 'The mirror', [flag(game, 'doorAppeared')
            ? 'Your reflection is a half-second behind you. When you stop moving, it doesn’t stop right away. When you leave, it stays a moment longer.'
            : 'You look tired. You look like someone with a status report due.']);
        },
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#9aa0a8';
        g.fillRect(-1, -14, 3, 28);
        g.fillStyle = 'rgba(200,225,240,0.75)';
        g.fillRect(0, -13, 1.8, 26);
      },
      drawGlow(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = 'rgba(220,235,255,0.25)';
        g.fillRect(1, -12, 1, 24);
      },
    },
    dryer: {
      name: 'Hand dryer', radius: 4, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 8,
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#c8ccd0';
        G.roundRect(g, -1, -5, 6, 10, 2);
        g.fill();
      },
    },
    'occupied-stall': {
      name: 'Occupied stall', radius: 10, shadow: false,
      init(it) {
        it.mem = {};
        it.said = new Set();
      },
      interact: {
        available: (it, game) => !game.hasFlag('doorOpened') || !it.silent,
        prompt: 'Knock on the stall',
        use(it, game) {
          if (game.hasFlag('doorOpened')) {
            it.silent = true;
            return popup('Restroom', 'Stall three', ['Silence. The red OCCUPIED tab has turned green, but the door is still locked from the inside.']);
          }
          LM.ui.dialog(game, stallSpeaker(it));
        },
      },
      drawGlow(g, it, t, game) {
        if (!game.hasFlag('doorOpened')) G.glow(g, 0, 3, 4, '#ff4a3a', 0.4);
      },
    },

    // ---------------------------------------------------- executive suite
    'exec-desk': {
      name: 'Executive desk', solid: 'rect', radius: 22,
      cache: true, cacheRadius: 40,
      light: { color: '#ffd8a0', radius: 85, intensity: 0.4, flicker: 0.02 },
      init(it) {
        if ((it.props.dir || 's') === 's' || it.props.dir === 'n') it.x = it.tx * T + T;
        else it.y = it.ty * T + T;
        setBox(it, 62, 28, 0, -4);
      },
      draw(g, it) {
        g.rotate(rot(it));
        // a high-backed leather chair behind it
        g.fillStyle = '#121216';
        g.beginPath();
        g.arc(0, 17, 9.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a1c18';
        G.roundRect(g, -9, 18, 18, 7, 3);
        g.fill();
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(-29, -15, 62, 28);
        g.fillStyle = '#3a2214';
        g.fillRect(-31, -18, 62, 28);
        g.fillStyle = '#8a5a34';
        g.fillRect(-30, -17, 60, 26);
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.fillRect(-30, -17, 60, 2);
        g.fillStyle = '#2a4a32';
        g.fillRect(-14, -12, 28, 15);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(-14, -12, 28, 1);
        g.fillStyle = '#1c1d22';
        g.fillRect(-9, -15.5, 18, 2.4);
        g.fillStyle = '#c9a046';
        g.fillRect(-6, 5, 12, 2.4);
        g.fillStyle = '#e8e2d4';
        g.save();
        g.translate(21, -6);
        g.rotate(0.3);
        g.fillRect(-4, -5, 8, 10);
        g.restore();
        g.fillStyle = '#c9a046';
        g.beginPath();
        g.arc(-23, -10, 3.2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it) {
        g.rotate(rot(it));
        G.glow(g, -23, -10, 10, '#ffd8a0', 0.4);
        G.glow(g, 0, -9, 11, '#8fb8ff', 0.18);
      },
    },
    bookshelf: {
      name: 'Bookshelf', solid: 'rect', radius: 12,
      cache: true, cacheRadius: 22,
      init(it) {
        setBox(it, 32, 13, 0, -9.5);
      },
      interact: {
        available: (it) => !!it.props.text,
        prompt: 'Look at the books',
        use: (it, game) => say(it.props.title || 'Bookshelf', typeof it.props.text === 'function' ? it.props.text(game) : it.props.text, it.props.kicker || 'Shelf'),
      },
      draw(g, it) {
        g.rotate(rot(it));
        g.fillStyle = '#3a2416';
        g.fillRect(-16, -16, 32, 13);
        const r = U.mulberry32((it.tx * 13 + it.ty * 71) >>> 0);
        let x = -15;
        while (x < 14) {
          const w = 1.6 + r() * 2.2;
          g.fillStyle = pickR(r, ['#8a2a2a', '#2a4a7a', '#c9a046', '#2a6a4a', '#e8e2d4', '#5a3a6a', '#1c1d22']);
          g.fillRect(x, -15 + r() * 2, Math.min(w, 15 - x), 9 + r() * 2);
          x += w + 0.4;
        }
      },
    },
    armchair: {
      name: 'Armchair', radius: 10, solid: true, solidRadius: 10,
      cache: true, cacheRadius: 16,
      draw(g, it) {
        g.rotate(rot(it));
        const c = it.props.color || '#5a3a2a';
        g.fillStyle = U.shade(c, -0.3);
        G.roundRect(g, -11, -11, 22, 22, 6);
        g.fill();
        g.fillStyle = c;
        G.roundRect(g, -7, -5, 14, 14, 4);
        g.fill();
      },
    },
    globe: {
      name: 'Globe', radius: 7, solid: true, solidRadius: 7,
      cache: true, cacheRadius: 10,
      interact: { available: () => true, prompt: 'Spin the globe', use: () => say('The globe', 'It spins, and slows, and stops with your finger on a country that no longer exists.', 'Corner office') },
      draw(g) {
        g.fillStyle = '#3a2416';
        g.beginPath();
        g.arc(0, 0, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a5a8a';
        g.beginPath();
        g.arc(0, 0, 5.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c8b070';
        g.beginPath();
        g.ellipse(-1, -1, 2.5, 1.6, 0.6, 0, U.TAU);
        g.ellipse(2, 2, 1.6, 1, 0, 0, U.TAU);
        g.fill();
      },
    },

    // ---------------------------------------------------- the wrong office
    papers: {
      name: 'Papers', radius: 6, z: -2, shadow: false,
      cache: true, cacheRadius: 22,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 53 + it.ty * 17) >>> 0);
        for (let i = 0; i < 6; i++) {
          g.save();
          g.translate((r() - 0.5) * 22, (r() - 0.5) * 22);
          g.rotate(r() * U.TAU);
          g.fillStyle = r() < 0.85 ? '#ece8e0' : '#f4dc6c';
          g.fillRect(-3, -4, 6, 8);
          g.fillStyle = 'rgba(0,0,0,0.18)';
          for (let l = 0; l < 3; l++) g.fillRect(-2, -2.5 + l * 2, 4, 0.5);
          g.restore();
        }
      },
    },
    'ceiling-debris': {
      name: 'Fallen ceiling tile', radius: 8, z: -1, shadow: false,
      cache: true, cacheRadius: 22,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 37 + it.ty * 91) >>> 0);
        for (let i = 0; i < 3; i++) {
          g.save();
          g.translate((r() - 0.5) * 16, (r() - 0.5) * 16);
          g.rotate(r() * U.TAU);
          g.fillStyle = '#d8d4cc';
          g.fillRect(-7, -7, 12 + r() * 4, 12 + r() * 4);
          g.fillStyle = 'rgba(0,0,0,0.15)';
          for (let k = 0; k < 8; k++) g.fillRect(-6 + r() * 12, -6 + r() * 12, 0.8, 0.8);
          g.restore();
        }
        g.strokeStyle = '#1c1d22';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-8, -10);
        g.quadraticCurveTo(0, 0, 6, -12);
        g.stroke();
      },
    },
    'paper-drift': {
      name: '', radius: 1, shadow: false,
      update(it, dt, game) {
        if (game.attract || Math.random() > dt * (it.props.rate || 1.5)) return;
        const P = game.player;
        if (P && U.dist(P.x, P.y, it.x, it.y) > 500) return;
        game.particles.add({
          type: 'paper', x: it.x + U.rand(-60, 60), y: it.y + U.rand(-60, 60), vx: U.rand(-14, 14), vy: U.rand(6, 18),
          life: U.rand(2.5, 4.5), size: 2.6, drag: 0.4, rot: Math.random() * 6, vr: U.rand(-2, 2),
        });
      },
    },
    pedestal: {
      name: 'Stone plinth', radius: 10, solid: true, solidRadius: 9, mapColor: '#e0b25a', mapAlways: true,
      light: { color: '#ffcf80', radius: 120, intensity: 0.5, flicker: 0.1 },
      interact: {
        available: (it) => !it.taken,
        prompt: 'Look at the plinth',
        use(it, game) {
          const P = game.player;
          LM.ui.open({
            kicker: 'The Linear Conference Room',
            title: 'A place set for you',
            body: h('div', { class: 'lore-block' },
              h('p', { class: 'lore' }, 'On a stone plinth, where a name card would be, lies a service pistol. A brass tag is tied to the trigger guard: FOR THE ATTENDEE.'),
              h('p', { class: 'lore' }, 'Under it, smaller: Phones on silent, please.'),
              h('div', { class: 'compare' }, h('div', { class: 'card new' }, h('div', { class: 'card-kicker' }, 'Weapon'), LM.ui.icons.weapon(LM.get('weapons', 'pistol'), 96, 44), h('strong', null, 'Service Pistol'), LM.ui.weaponStats(LM.get('weapons', 'pistol'))))),
            actions: [
              {
                label: 'Take it', primary: true, key: 'E',
                onClick: () => {
                  it.taken = true;
                  P.giveWeapon('pistol', game);
                  game.setFlag('armed');
                  LM.audio.play('pickup');
                  game.toast('It is heavier than you expected, and already warm.', 'warn');
                },
              },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it) {
        g.fillStyle = '#3a3630';
        g.fillRect(-10, -10, 20, 20);
        g.fillStyle = '#6a665e';
        g.fillRect(-8.5, -8.5, 17, 17);
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.fillRect(-8.5, -8.5, 17, 1);
        if (!it.taken) {
          g.save();
          g.translate(-7, 0);
          g.rotate(-0.3);
          LM.get('weapons', 'pistol').drawHeld(g, {}, 0);
          g.restore();
        }
      },
      drawGlow(g, it, t) {
        if (!it.taken) G.glow(g, 0, 0, 20, '#ffcf80', 0.35 + 0.1 * Math.sin(t * 2));
      },
    },
  };

  function drawWindow(g, it) {
    g.rotate(wallRot(it));
    g.fillStyle = '#5a5e64';
    g.fillRect(-10, -15, 10, 30);
    const grd = g.createLinearGradient(-9, 0, -1, 0);
    grd.addColorStop(0, '#9cc4e8');
    grd.addColorStop(1, '#d8ecfa');
    g.fillStyle = grd;
    g.fillRect(-9, -14, 8, 28);
    g.fillStyle = '#5a5e64';
    g.fillRect(-9, -0.5, 8, 1);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(-7, -12, 1, 9);
    g.fillStyle = '#c8c4bc';
    g.fillRect(-1, -15, 2.5, 30);
  }

  /** The unseen voice in stall three, as a dialog speaker. */
  function stallSpeaker(it) {
    return {
      name: 'A voice from stall three',
      role: 'Occupied',
      look: {},
      def: { mood: 'neutral' },
      mem: it.mem,
      said: it.said,
      x: it.x,
      y: it.y,
      portrait: (mood, size) => LM.ui.iconCanvas(size, size, (g, W) => {
        g.scale(W / 100, W / 100);
        g.fillStyle = '#20232a';
        g.fillRect(0, 0, 100, 100);
        g.fillStyle = '#8f969e';
        g.fillRect(18, 8, 64, 84);
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.fillRect(18, 8, 64, 4);
        g.fillStyle = '#c8302a';
        g.fillRect(64, 46, 12, 7);
        g.fillStyle = '#1c1d22';
        g.fillRect(18, 92, 64, 8);
        g.fillStyle = '#2a2a30';
        g.fillRect(36, 94, 9, 6);
        g.fillRect(55, 94, 9, 6);
      }),
      dialog: () => ({
        start: 'knock',
        again: 'again',
        nodes: {
          knock: {
            text: ['Occupied! Very occupied. Sorry. Hi.'],
            options: [
              { label: 'Sorry! Do you know where the Linear Conference room is?', next: 'where' },
              { label: 'Are you okay in there?', next: 'okay' },
              { label: 'Sorry. Never mind.', end: true },
            ],
          },
          again: {
            text: ['Still here. Still occupied.'],
            options: [
              { label: 'The Linear Conference room?', next: 'where', once: true },
              { label: 'Are you okay in there?', next: 'okay', once: true },
              { label: 'Right. Sorry.', end: true },
            ],
          },
          where: {
            text: ['Linear? You got one of the notes too?', 'I got mine on Monday. I’ve been in here since Monday. It’s fine. It’s the only room on this floor that has a lock.'],
            options: [{ label: 'Since Monday?', next: 'monday' }, { label: 'I should go.', end: true }],
          },
          monday: {
            text: ['Don’t worry about it. Go to your meeting. They don’t start until everyone arrives, so honestly, take your time. Take all the time you want.'],
            options: [{ label: 'Okay. Bye.', end: true }],
          },
          okay: {
            text: ['Define okay.', 'The lights in here hum in a key I can’t stand. Otherwise, yes.'],
            options: [{ label: 'Hang in there.', end: true }],
          },
        },
      }),
    };
  }

  // a sheet of paper drifting in a draft
  LM.particleTypes.paper = {
    pass: 'normal',
    draw(ctx, p, k) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = 'rgba(236,232,224,' + Math.min(1, k * 3, (1 - k) * 6) + ')';
      ctx.fillRect(-p.size, -p.size * 1.3, p.size * 2, p.size * 2.6);
      ctx.restore();
    },
  };

  LM.definePack({ id: 'office', items });
})();
