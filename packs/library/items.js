/* The Linear Maze — packs/library/items.js
 * Library pack, part 2: furniture, and the two things that matter in a fight.
 *
 *   lib-table       reading table with stacks of books. props: w (1 or 2 tiles wide), dir ('e'/'w' runs it
 *                   north-south), lamp (a green banker's lamp; gives light)
 *   lib-cart        a book cart. props.dir
 *   lib-shelf       a free-standing double-sided shelf, one tile. props.dir ('e'/'w' turns it)
 *   lib-catalog     the card catalog (read a card)
 *   lib-desk        the circulation desk, with a bell. props.w tiles wide
 *   lib-knowledge   KNOWLEDGE IS POWER: a big book on a table. Reading it heals and powers you up
 *                   (props.heal, props.damage = extra damage, props.time seconds). Once per book.
 *   lib-quiet       QUIET PLEASE: a wall sign that guards a section. props.rect [x, y, w, h] (tiles).
 *                   Fire a weapon inside the section and the sign buzzes and hurts you (props.damage).
 * Flags: libKnowledge (read a book of knowledge), libShushed (zapped by a sign)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const rot = (it) => ROT[it.props.dir || 's'] || 0;
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);
  const BOOKS = ['#7a2a2a', '#2a4a6a', '#c9a046', '#2a5a3a', '#d8d0bc', '#5a3a6a', '#8a5a2a', '#3a6a7a', '#9a3a4a'];
  const seeded = (it, k) => U.mulberry32((it.tx * 977 + it.ty * 131 + (k || 0)) >>> 0);
  const vertical = (it) => it.props.dir === 'e' || it.props.dir === 'w';
  const span = (it, w) => {
    // a piece w tiles long starts on its tile and runs east (or south when turned)
    if (vertical(it)) it.y = it.ty * T + (w * T) / 2;
    else it.x = it.tx * T + (w * T) / 2;
  };
  function stack(g, x, y, r, n) {
    // a pile of books, seen from above: each a little turned
    for (let i = 0; i < n; i++) {
      g.save();
      g.translate(x + (r() - 0.5) * 1.5, y + (r() - 0.5) * 1.5);
      g.rotate((r() - 0.5) * 0.8);
      const w = 7 + r() * 3, hh = 5 + r() * 2;
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(-w / 2 + 0.8, -hh / 2 + 0.8, w, hh);
      g.fillStyle = BOOKS[Math.floor(r() * BOOKS.length)];
      g.fillRect(-w / 2, -hh / 2, w, hh);
      g.fillStyle = '#efe6d0';
      g.fillRect(w / 2 - 1.2, -hh / 2 + 0.6, 0.9, hh - 1.2);
      g.restore();
    }
  }

  const items = {
    'lib-table': {
      name: 'Reading table', dressing: 'Furniture', solid: 'rect', radius: 14, mapColor: '#8a6a3a',
      light: (it) => (it.props.lamp ? { color: '#c8f0b0', radius: 130, intensity: 0.45 } : null),
      init(it) {
        const w = it.props.w || 1;
        span(it, w);
        it.box = vertical(it) ? [22, w * T - 4] : [w * T - 4, 22];
      },
      draw(g, it) {
        const w = it.props.w || 1;
        if (vertical(it)) g.rotate(Math.PI / 2);
        const W = w * T - 4, r = seeded(it);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-W / 2 + 2, -9, W, 22);
        g.fillStyle = '#3a2414';
        g.fillRect(-W / 2, -11, W, 22);
        g.fillStyle = '#7a5434';
        g.fillRect(-W / 2 + 1, -10, W - 2, 20);
        g.fillStyle = 'rgba(0,0,0,0.12)';
        for (let i = -6; i <= 6; i += 6) g.fillRect(-W / 2 + 1, i, W - 2, 0.6);
        const piles = w + 1;
        for (let i = 0; i < piles; i++) {
          if (r() < 0.25) continue;
          stack(g, -W / 2 + 6 + (i * (W - 12)) / Math.max(1, piles - 1), -3 + r() * 6, r, 1 + Math.floor(r() * 4));
        }
        if (r() < 0.6) {
          // an open book someone left
          g.fillStyle = '#efe6d0';
          g.fillRect(-4, 2, 4, 6);
          g.fillRect(0.3, 2, 4, 6);
          g.fillStyle = 'rgba(60,40,20,0.4)';
          for (let i = 0; i < 3; i++) g.fillRect(-3.4, 3.5 + i * 1.5, 2.8, 0.4), g.fillRect(0.9, 3.5 + i * 1.5, 2.8, 0.4);
        }
        if (it.props.lamp) {
          g.fillStyle = '#c9a046';
          g.beginPath();
          g.arc(W / 2 - 7, -5, 2, 0, U.TAU);
          g.fill();
          g.fillStyle = '#1e6a3a';
          G.roundRect(g, W / 2 - 12, -9, 10, 5, 2);
          g.fill();
        }
      },
      drawGlow(g, it) {
        if (!it.props.lamp) return;
        const W = (it.props.w || 1) * T - 4;
        if (vertical(it)) g.rotate(Math.PI / 2);
        G.glow(g, W / 2 - 7, -4, 18, '#d8ffc0', 0.45);
      },
    },
    'lib-cart': {
      name: 'Book cart', dressing: 'Furniture', solid: 'rect', radius: 12,
      init(it) {
        it.box = vertical(it) ? [16, 26] : [26, 16];
      },
      draw(g, it) {
        g.rotate(rot(it));
        const r = seeded(it, 3);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-12, -6, 26, 16);
        g.fillStyle = '#5a5e64';
        g.fillRect(-13, -8, 26, 16);
        g.fillStyle = '#3a3e44';
        g.fillRect(-12, -0.6, 24, 1.2);
        for (const row of [-7, 0.8]) {
          let k = -12;
          while (k < 11) {
            const w = 1.6 + r() * 2;
            g.fillStyle = BOOKS[Math.floor(r() * BOOKS.length)];
            g.fillRect(k, row, Math.min(w, 12 - k), 6 + r() * 0.8);
            k += w + 0.35;
          }
        }
        g.fillStyle = '#1a1a1e';
        for (const [x, y] of [[-12, -8], [12, -8], [-12, 8], [12, 8]]) {
          g.beginPath();
          g.arc(x, y, 1.6, 0, U.TAU);
          g.fill();
        }
        g.strokeStyle = '#8a8e94';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(13, -6);
        g.lineTo(16, -6);
        g.lineTo(16, 6);
        g.lineTo(13, 6);
        g.stroke();
      },
    },
    'lib-shelf': {
      name: 'Free-standing shelf', dressing: 'Furniture', solid: 'rect', radius: 14,
      init(it) {
        it.box = vertical(it) ? [14, 30] : [30, 14];
      },
      draw(g, it) {
        if (vertical(it)) g.rotate(Math.PI / 2);
        const r = seeded(it, 5);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-14, -5, 30, 14);
        g.fillStyle = '#3a2416';
        g.fillRect(-15, -7, 30, 14);
        for (const row of [-6.4, 0.6]) {
          let k = -14;
          while (k < 13.5) {
            const w = 1.5 + r() * 2.2;
            g.fillStyle = BOOKS[Math.floor(r() * BOOKS.length)];
            g.fillRect(k, row, Math.min(w, 14 - k), 5.6);
            k += w + 0.3;
          }
        }
        g.fillStyle = '#4a3020';
        g.fillRect(-15, -0.7, 30, 1.4);
      },
    },
    'lib-catalog': {
      name: 'Card catalog', dressing: 'Furniture', solid: 'rect', radius: 12,
      init(it) {
        it.box = [28, 16];
        it.boxOff = [0, -4];
      },
      interact: {
        available: () => true,
        prompt: 'Pull a card from the catalog',
        use(it, game) {
          const cards = LM.LIBRARY.CARDS;
          game.libCard = ((game.libCard == null ? Math.floor(Math.random() * cards.length) : game.libCard) + 1) % cards.length;
          const c = cards[game.libCard];
          LM.audio.play('tick');
          LM.ui.open({
            kicker: 'Card catalog · drawer ' + c.drawer, title: c.title,
            body: h('div', { class: 'lib-card' }, h('div', { class: 'lib-call' }, c.call), h('p', null, c.text)),
            actions: [{ label: 'Another card', primary: true, key: 'E', onClick: () => setTimeout(() => items['lib-catalog'].interact.use(it, game), 0) }, { label: 'Close the drawer', quiet: true }],
          });
        },
      },
      draw(g) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -10, 28, 16);
        g.fillStyle = '#6a4424';
        g.fillRect(-14, -12, 28, 16);
        g.fillStyle = '#5a3818';
        for (let i = 0; i < 4; i++) g.fillRect(-13 + i * 7, -11, 6, 14);
        g.fillStyle = '#d8b050';
        for (let i = 0; i < 4; i++) g.fillRect(-11 + i * 7, -0.5, 2, 1.2);
      },
    },
    'lib-desk': {
      name: 'Circulation desk', dressing: 'Furniture', solid: 'rect', radius: 16, mapColor: '#8a6a3a',
      init(it) {
        const w = it.props.w || 3;
        span(it, w);
        it.box = [w * T - 4, 20];
        it.boxOff = [0, -4];
      },
      interact: {
        available: () => true,
        prompt: 'Ring the bell',
        use(it, game) {
          LM.audio.play('pickup');
          LM.ui.showText('Circulation desk', LM.LIBRARY.DESK, 'RETURNS · RENEWALS · FINES');
        },
      },
      draw(g, it) {
        const W = (it.props.w || 3) * T - 4;
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-W / 2 + 2, -12, W, 20);
        g.fillStyle = '#4a2c18';
        g.fillRect(-W / 2, -14, W, 20);
        g.fillStyle = '#8a5a34';
        g.fillRect(-W / 2 + 1, -13, W - 2, 6);
        const r = seeded(it, 9);
        stack(g, -W / 2 + 10, -2, r, 3);
        stack(g, W / 2 - 14, -1, r, 4);
        g.fillStyle = '#c9a046';
        g.beginPath();
        g.arc(0, -9, 2.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8d070';
        g.beginPath();
        g.arc(-0.6, -9.6, 1, 0, U.TAU);
        g.fill();
      },
    },

    // ---------------------------------------------------------------- KNOWLEDGE IS POWER
    'lib-knowledge': {
      name: 'KNOWLEDGE IS POWER', dressing: false, solid: 'rect', radius: 14, mapColor: '#ffe080', mapAlways: true,
      light: { color: '#ffe8a0', radius: 150, intensity: 0.55, flicker: 0.08 },
      init(it) {
        it.box = [28, 20];
      },
      interact: {
        available: (it) => !it.used,
        prompt: 'KNOWLEDGE IS POWER: read the book',
        use(it, game) {
          const P = game.player, k = it.props;
          it.used = true;
          if (it.light) it.light.intensity = 0.12;
          LM.combat.heal(game, P, k.heal || 50);
          P.addBuff('knowledge', 'Knowledge is power', { damageMul: k.damage || 0.6 }, k.time || 30);
          game.setFlag('libKnowledge');
          LM.audio.play('altar');
          game.flashT = 0.3;
          game.particles.burst(it.x, it.y - 6, 30, { type: 'ember', color: '#ffe080', speed: 120, life: 1, size: 1.3, drag: 1.5 });
          game.toast('KNOWLEDGE IS POWER: healed, and +' + Math.round((k.damage || 0.6) * 100) + '% damage for ' + (k.time || 30) + ' s', 'good');
          setTimeout(() => LM.think(game, U.pick(LM.LIBRARY.KNOWLEDGE)), 1400);
        },
      },
      draw(g, it, t) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -8, 28, 20);
        g.fillStyle = '#3a2414';
        g.fillRect(-14, -10, 28, 20);
        g.fillStyle = '#7a5434';
        g.fillRect(-13, -9, 26, 18);
        const lift = it.used ? 0 : Math.sin(t * 2.4) * 1.5 - 2;
        g.translate(0, lift);
        if (it.used) {
          // closed now
          g.fillStyle = '#5a2a2a';
          g.fillRect(-7, -5, 14, 10);
          g.fillStyle = '#c9a046';
          g.fillRect(-5, -1, 10, 1);
          return;
        }
        g.fillStyle = '#5a2a2a';
        g.fillRect(-12, -7.5, 24, 15);
        g.fillStyle = '#f4ecd4';
        g.fillRect(-11, -6.5, 10.6, 13);
        g.fillRect(0.4, -6.5, 10.6, 13);
        g.fillStyle = 'rgba(80,50,20,0.55)';
        for (let i = 0; i < 5; i++) {
          g.fillRect(-9.5, -4.5 + i * 2.2, 7.5, 0.5);
          g.fillRect(2, -4.5 + i * 2.2, 7.5, 0.5);
        }
        g.fillStyle = '#c9a046';
        g.font = '800 2.6px sans-serif';
        g.textAlign = 'center';
        g.fillText('KNOWLEDGE', -5.7, -6.8 + 15);
        g.fillText('IS POWER', 5.7, -6.8 + 15);
      },
      drawGlow(g, it, t) {
        if (it.used) return;
        G.glow(g, 0, -2, 34 + Math.sin(t * 2.4) * 6, '#ffe080', 0.55);
        for (let i = 0; i < 3; i++) {
          const a = t * 1.3 + (i * U.TAU) / 3;
          G.glow(g, Math.cos(a) * 14, -2 + Math.sin(a) * 8, 3, '#fff4c0', 0.9);
        }
      },
    },

    // ---------------------------------------------------------------- QUIET PLEASE
    'lib-quiet': {
      name: 'QUIET PLEASE sign', dressing: false, radius: 6, wallMounted: true, shadow: false, mapColor: '#ff5a4a', mapAlways: true,
      interact: {
        available: () => true,
        prompt: 'Read the sign: QUIET PLEASE',
        use: (it) => LM.ui.showText('QUIET PLEASE', LM.LIBRARY.QUIET_TEXT, 'This section'),
      },
      inside(it, P) {
        const r = it.props.rect;
        if (!r) return U.dist(P.x, P.y, it.x, it.y) < 5 * T;
        return P.x >= r[0] * T && P.x < (r[0] + r[2]) * T && P.y >= r[1] * T && P.y < (r[1] + r[3]) * T;
      },
      update(it, dt, game) {
        const P = game.player;
        if (!P || game.attract || P.dead) return;
        it.zap = Math.max(0, (it.zap || 0) - dt);
        it.cd = Math.max(0, (it.cd || 0) - dt);
        const shots = game.stats.shots;
        if (it.lastShots == null) it.lastShots = shots;
        const inside = it.def.inside(it, P);
        if (inside && !it.warned) {
          it.warned = true;
          game.toast('QUIET PLEASE. This section is a quiet zone.', 'warn');
        }
        if (shots > it.lastShots && inside && it.cd <= 0) {
          it.cd = 0.45;
          it.zap = 0.5;
          LM.combat.hurt(game, P, it.props.damage || 8, { source: 'trap', type: 'zap' });
          LM.audio.play('arc', { vol: 0.8 });
          game.addShake(0.15);
          game.particles.burst(P.x, P.y, 12, { type: 'spark', color: '#ff6a5a', speed: 160, life: 0.3, size: 1.1 });
          if (!game.hasFlag('libShushed')) {
            game.setFlag('libShushed');
            game.toast('SHHHH! The QUIET PLEASE sign buzzes, and it hurts.', 'warn');
          }
        }
        it.lastShots = shots;
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#1a1a1e';
        g.fillRect(-0.5, -12, 4.5, 24);
        g.fillStyle = (it.zap || 0) > 0 ? '#ff5a4a' : '#8a1a1a';
        g.fillRect(0.4, -11, 3, 22);
        g.fillStyle = '#f4e8d8';
        for (let i = 0; i < 5; i++) g.fillRect(1.4, -9 + i * 4, 1, 2.4);
      },
      drawGlow(g, it, t, game) {
        const z = it.zap || 0;
        g.save();
        g.rotate(wallRot(it));
        G.glow(g, 3, 0, 16 + z * 30, '#ff4a3a', 0.3 + 0.12 * Math.sin(t * 5) + z);
        g.restore();
        if (z > 0 && it.props.rect && game) {
          // the whole section flashes red for a moment
          const r = it.props.rect;
          g.strokeStyle = 'rgba(255,70,60,' + z * 1.2 + ')';
          g.lineWidth = 2;
          g.strokeRect(r[0] * T - it.x + 2, r[1] * T - it.y + 2, r[2] * T - 4, r[3] * T - 4);
          const P = game.player;
          if (P) {
            g.strokeStyle = 'rgba(255,140,120,' + z * 1.6 + ')';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(0, 0);
            const dx = P.x - it.x, dy = P.y - it.y;
            for (let i = 1; i <= 6; i++) g.lineTo((dx * i) / 6 + (Math.random() - 0.5) * 10, (dy * i) / 6 + (Math.random() - 0.5) * 10);
            g.stroke();
          }
        }
      },
    },
  };

  LM.ui.addStyles(`
    .lib-card { padding: 14px 16px; background: #f4ecd4; color: #2a2218; border-radius: 3px; box-shadow: inset 0 0 0 1px #d8c8a0; font: 400 14px/1.45 "IBM Plex Mono", monospace; }
    .lib-card .lib-call { color: #8a2a2a; font-weight: 700; margin-bottom: 8px; }
    .lib-card p { margin: 0; }
  `);

  // the words
  const LIB = (LM.LIBRARY = LM.LIBRARY || {});
  LIB.CARDS = [
    { drawer: 'A–Ab', call: '000.1 LIN', title: 'Linear Algebra Done Right', text: 'Status: checked out. Due: 1978. Borrower: you. Fines owed: see attached (attached: a second card catalog).' },
    { drawer: 'Ex–Ez', call: '728.3 EXI', title: 'Exits: A Field Guide', text: 'Status: missing. A note in the drawer: “If found, please return to the Exit.”' },
    { drawer: 'Li–Lo', call: '027.4 LIB', title: 'Libraries That Go Down Further Than the Building', text: 'See also: Basements; Sub-basements; Sub-sub-basements; Please Stop Reading the Card.' },
    { drawer: 'Ov–Oz', call: '346.07 OVE', title: 'Overdue: A Ghost Story', text: 'Status: overdue since 1978. The card is cold to the touch.' },
    { drawer: 'Qu–Qz', call: '302.2 QUI', title: 'Quiet', text: 'The rest of the card is blank, out of respect.' },
    { drawer: 'Wo–Wz', call: '595.7 WOR', title: 'Worms, Book: Their Habits and Their Habitats', text: 'Habitat: here. Habits: eating, dividing, eating. A small hole has been eaten through the middle of the card.' },
    { drawer: 'Da–Dz', call: 'B DAV', title: 'Dave: A Biography', text: 'Status: on order. Expected: soon. Expected: soon. Expected: soon.' },
    { drawer: 'Yo–Yz', call: '155.2 YOU', title: 'You, Backwards', text: 'Status: you are holding it. Please return it to the shelf you are standing on.' },
  ];
  LIB.DESK = 'DING.\n\nNobody comes. A brass plate on the desk: PLEASE RING FOR ASSISTANCE. ASSISTANCE WILL NOT COME. THIS IS A LIBRARY.\n\nA printout by the bell lists your account: one book, checked out in 1978, never returned. Fines: $1,978.00, and rising.';
  LIB.QUIET_TEXT = 'QUIET PLEASE\n\nThis section is a quiet zone. Patrons who discharge firearms in this section will be shushed.\n\nThe sign is wired into something. It hums.';
  LIB.KNOWLEDGE = [
    'I know so many things now. Mostly about the Dewey Decimal System. It’s enough.',
    'Knowledge is power. Power is knowledge. Mostly I know where everything is shelved.',
    'I feel smarter. I feel stronger. I feel like I could explain the plot of Moby-Dick.',
  ];

  LM.definePack({ id: 'library', items });
})();
