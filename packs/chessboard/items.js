/* The Linear Maze — packs/chessboard/items.js
 * Chessboard pack, part 6: things on Chessboard 1.
 *
 *   cb-window          a window; outside is a chessboard, to the horizon
 *   cb-ficus           a big office plant that bites if you brush past
 *   cb-vending         the lounge's vending machine: health, ammunition, a better health plan, hints
 *   cb-cash            petty cash (gold)
 *   cb-terminal        the daily report module (Task 2): ends the floor
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const CB = (LM.CHESSBOARD = LM.CHESSBOARD || {});
  const MEMOS = LM.MEMOS;
  const has = (game, f) => game.hasFlag(f);
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);

  /** Vending machine stock. price in gold; buy(game) returns a toast, or false if it can't be bought now. */
  CB.VENDING = [
    {
      id: 'health', label: 'Medical kit (heals 60)', price: 30,
      ok: (game) => game.player.hp < game.player.stats().maxHp,
      buy(game) {
        LM.combat.heal(game, game.player, 60);
        LM.audio.play('heal');
        return 'A medical kit thunks into the tray. It’s warm. You feel better.';
      },
    },
    {
      id: 'ammo', label: 'Ammunition (whatever you’re holding)', price: 25,
      ok: (game) => {
        const w = game.player.currentWeapon();
        return !!(w && w.ammo && game.player.ammo[w.ammo] < game.player.ammoMax(w.ammo));
      },
      buy(game) {
        const P = game.player, w = P.currentWeapon();
        const got = P.addAmmo(w.ammo, Math.max(w.pickupAmmo || 10, Math.round(P.ammoMax(w.ammo) * 0.4)));
        LM.audio.play('pickup');
        return '+' + got + ' ' + LM.AMMO_NAMES[w.ammo].toLowerCase() + ', in a snack bag.';
      },
    },
    {
      id: 'plan', label: 'Extended Health Plan (+20 max health, permanent)', price: 150,
      ok: (game) => game.player.blessings.filter((b) => b === 'cb-health-plan').length < 3,
      buy(game) {
        const P = game.player;
        P.blessings.push('cb-health-plan');
        P.statsDirty = true;
        LM.combat.heal(game, P, 20);
        LM.audio.play('altar');
        return 'Enrolled. Your body has been upgraded to the Gold tier.';
      },
    },
    {
      id: 'hint', label: 'A hint', price: 5,
      ok: () => true,
      buy(game) {
        const st = CB.state(game);
        const hint = CB.HINTS[(st.hint = ((st.hint == null ? -1 : st.hint) + 1) % CB.HINTS.length)];
        LM.audio.play('coin');
        setTimeout(() => LM.ui.showText('A hint', hint, 'Vend-O-Matic 4000 · printed on a receipt'), 0);
        return null;
      },
    },
  ];
  CB.HINTS = [
    'Read ALL of your email. The status meeting asks about the TPS report, and about Alice’s goodbye.',
    'The server room is not on any map. Follow the arrows: all of them, in order, the way they point. Skip one and you start again.',
    'Avoid the monster at the Supply Desk unless you are sure you want a fight. She doesn’t mind you looking. She minds you going in.',
    'Bob only moves when you move. Freeze when he gets close. The gaps between the racks are too narrow for him.',
    'Alice left something in her desk on the real fourteenth floor. If you have it, Bob wants it back.',
  ];

  const items = {
    'cb-window': {
      name: 'Window', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18,
      light: { color: '#e8f2e0', radius: 140, intensity: 0.38 },
      interact: {
        available: () => true,
        prompt: 'Look out the window',
        use: () => LM.ui.showText('The window', 'Where the parking structure and the gray river used to be, there is a chessboard. Black and white squares, each the size of a city block, all the way to the horizon.\n\nFar off, something tall and red moves one square diagonally, and stops.', 'West hall'),
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#5a5e64';
        g.fillRect(-10, -15, 10, 30);
        for (let j = 0; j < 7; j++) {
          for (let i = 0; i < 2; i++) {
            g.fillStyle = (i + j) % 2 ? '#e8e4d8' : '#2a2a2e';
            g.fillRect(-9 + i * 4, -14 + j * 4, 4, 4);
          }
        }
        g.fillStyle = '#c8c4bc';
        g.fillRect(-1, -15, 2.5, 30);
      },
    },
    'cb-ficus': {
      name: 'Ficus', radius: 12, solid: true, solidRadius: 11,
      init(it) {
        it.snap = 0;
        it.cd = 0;
      },
      update(it, dt, game) {
        it.cd -= dt;
        it.snap = Math.max(0, it.snap - dt * 3);
        const P = game.player;
        if (!P || P.dead || it.cd > 0) return;
        if (U.dist(P.x, P.y, it.x, it.y) < it.r + P.r + 6) {
          it.cd = 2.2;
          it.snap = 1;
          LM.combat.hurt(game, P, 3, { kx: (P.x - it.x) * 6, ky: (P.y - it.y) * 6, source: 'enemy', type: 'melee' });
          LM.audio.play('swing');
          if (!game.cbFicusWarned) {
            game.cbFicusWarned = true;
            game.toast('The ficus bites you. It’s a carnivorous ficus. Of course it is.', 'warn');
          }
        }
      },
      draw(g, it, t) {
        const r = U.mulberry32((it.tx * 17 + it.ty * 29) >>> 0);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.arc(1.5, 2, 10, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.arc(0, 0, 8.6, 0, U.TAU);
        g.fill();
        const open = 0.3 + it.snap * 0.6 + Math.sin(t * 2 + it.tx) * 0.08;
        for (let i = 0; i < 7; i++) {
          const a = r() * U.TAU, d = 4 + r() * 6;
          g.save();
          g.translate(Math.cos(a) * d * 0.6, Math.sin(a) * d * 0.6);
          g.rotate(a);
          for (const s of [-1, 1]) {
            g.save();
            g.rotate(s * open);
            g.fillStyle = '#4a8a3a';
            g.beginPath();
            g.ellipse(d * 0.5, s * 1.4, 5, 2.4, 0, 0, U.TAU);
            g.fill();
            g.fillStyle = '#c84a4a';
            g.beginPath();
            g.ellipse(d * 0.5, s * 0.7, 3.4, 0.9, 0, 0, U.TAU);
            g.fill();
            g.restore();
          }
          g.restore();
        }
      },
    },
    'cb-vending': {
      name: 'Vend-O-Matic 4000', solid: 'rect', radius: 12, mapColor: '#ffd25a', mapAlways: true,
      light: { color: '#ffe8c0', radius: 110, intensity: 0.4, flicker: 0.06 },
      init(it) {
        const d = it.props.dir || 's';
        it.box = d === 'e' || d === 'w' ? [20, 28] : [28, 20];
      },
      interact: {
        available: () => true,
        prompt: 'Use the Vend-O-Matic 4000',
        use(it, game) {
          vend(game, it);
        },
      },
      draw(g, it) {
        g.rotate({ s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[it.props.dir || 's']);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -15, 28, 20);
        g.fillStyle = '#2a2c32';
        g.fillRect(-14, -16, 28, 20);
        g.fillStyle = '#5a8a2a';
        g.fillRect(-14, 1, 28, 3);
      },
      drawGlow(g, it, t) {
        g.rotate({ s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[it.props.dir || 's']);
        const cols = ['#ff6a5a', '#7aff8a', '#5ad0ff', '#ffd25a'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) G.glow(g, -9 + i * 6, -11 + j * 6, 3, cols[(i + j) % 4], 0.45);
      },
    },
    'cb-cash': {
      name: 'Petty cash', radius: 7, z: 1, mapColor: '#f0c048',
      interact: {
        available: (it) => !it.used,
        prompt: 'Take the petty cash',
        use(it, game) {
          it.used = true;
          const amt = it.props.amount || 60;
          game.player.gold += amt;
          game.stats.gold += amt;
          LM.audio.play('coin');
          game.toast('+' + amt + ' gold. The envelope says PETTY CASH — FOR EMERGENCIES (MEETINGS).', 'good');
        },
      },
      draw(g, it) {
        if (it.used) return;
        g.fillStyle = '#e8dcb8';
        g.fillRect(-6, -4, 12, 8);
        g.strokeStyle = '#a8946a';
        g.lineWidth = 0.6;
        g.beginPath();
        g.moveTo(-6, -4);
        g.lineTo(0, 1);
        g.lineTo(6, -4);
        g.stroke();
      },
      drawGlow(g, it, t) {
        if (!it.used) G.glow(g, 0, 0, 10, '#f0c048', 0.25 + 0.1 * Math.sin(t * 3));
      },
    },
    'cb-terminal': {
      name: 'Daily report terminal', solid: true, solidRadius: 10, radius: 11, mapColor: '#5ad0ff', mapAlways: true,
      light: { color: '#8ad8ff', radius: 130, intensity: 0.55, flicker: 0.04 },
      interact: {
        available: () => true,
        prompt: 'Run the daily report module',
        use(it, game) {
          runReport(game, it);
        },
      },
      draw(g) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(-10, -8, 22, 18);
        g.fillStyle = '#2a3038';
        g.fillRect(-11, -10, 22, 18);
        g.fillStyle = '#0a1420';
        g.fillRect(-9, -8, 18, 10);
        g.fillStyle = '#c8ccd2';
        g.fillRect(-8, 4, 16, 3);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -3, 16, '#5ad0ff', 0.35 + 0.1 * Math.sin(t * 4));
        g.fillStyle = 'rgba(140,230,170,0.85)';
        for (let i = 0; i < 4; i++) if (Math.sin(t * 3 + i) > -0.2) g.fillRect(-7, -7 + i * 2.2, 6 + ((i * 5) % 9), 0.9);
      },
    },
  };

  // ------------------------------------------------------------ vending
  function vend(game, it) {
    const P = game.player;
    const rows = CB.VENDING.map((v) => {
      const can = P.gold >= v.price && v.ok(game);
      return { label: v.label + ' · ' + v.price + ' gold', disabled: !can, onClick: () => {
        P.gold -= v.price;
        const msg = v.buy(game);
        if (msg) game.toast(msg, 'good');
        if (v.id !== 'hint') setTimeout(() => vend(game, it), 0);
      } };
    });
    LM.ui.open({
      kicker: 'Hilbert’s Hotel lounge',
      title: 'Vend-O-Matic 4000',
      body: h('div', { class: 'lore-block' },
        h('p', { class: 'lore' }, 'Snacks for the soul, and for the body, and for whatever you have instead. A sticker on the coin slot: NO REFUNDS. NO REGRETS. NO EXIT.'),
        h('p', { class: 'muted' }, 'You have ' + P.gold + ' gold.')),
      actions: rows.concat([{ label: 'Walk away', quiet: true }]),
    });
  }

  // ------------------------------------------------------------ the daily report module (Task 2)
  function runReport(game, it) {
    const ready = has(game, 'cb_t1') && has(game, 'cb_t3');
    if (!ready) {
      return LM.ui.showText('Daily report module', 'ACCESS DENIED.\n\nPrerequisites not met: ' + (has(game, 'cb_t1') ? '' : 'STATUS MEETING ') + (has(game, 'cb_t3') ? '' : 'MANDATORY TRAINING') + '\n\nHow did you get in here?', 'Terminal');
    }
    const st = MEMOS.state(game.player);
    const lines = [
      '> RUN daily_report.mod --all',
      '  compiling TPS ............ OK (new cover sheet)',
      '  status meeting ........... ATTENDED (survived)',
      '  surveillance training .... CERTIFIED (watched)',
      '  notice score ............. ' + st.notice,
      '  message score ............ ' + st.message,
      '  email score .............. ' + st.email,
      '  sysadmin ................. ' + (has(game, 'cb_bobAppeased') ? 'CALM (has key)' : 'AGITATED'),
      '',
      '  DAILY REPORT: 1 page. It says “Everything is fine.”',
    ];
    LM.ui.open({
      kicker: 'Server farm · far east corner',
      title: 'Daily report module',
      body: h('div', { class: 'mail-read' }, h('pre', null, lines.join('\n')),
        h('p', null, 'The printer beside the terminal produces one warm page. Somewhere above you, very faintly, the whole building exhales.')),
      actions: [{
        label: 'End the work day', primary: true, key: 'E',
        onClick: () => {
          CB.completeTask(game, 2);
          setTimeout(() => endOfLevel(game), 0);
        },
      }],
      dismissable: false,
    });
  }
  function endOfLevel(game) {
    const st = MEMOS.state(game.player);
    LM.ui.open({
      kicker: 'Chessboard 1 · 5:00 PM',
      title: 'End of day',
      body: h('div', { class: 'lore-block' },
        h('p', { class: 'lore' }, 'All three tasks, done. Dana texts a single thumbs-up. In Zeno’s Paradox, the attendees are regenerating for tomorrow’s meeting.'),
        h('p', { class: 'lore' }, 'The elevator at reception opens on its own. The display doesn’t say 14. It says ♞.'),
        h('dl', { class: 'stats big' },
          h('dt', null, 'Notice score'), h('dd', null, String(st.notice)),
          h('dt', null, 'Message score'), h('dd', null, String(st.message)),
          h('dt', null, 'Email score'), h('dd', null, String(st.email)))),
      actions: [{ label: 'Clock out', primary: true, key: 'E', onClick: () => setTimeout(() => game.completeLevel(), 0) }],
      dismissable: false,
    });
  }

  // the vending machine's health plan, as a blessing so it lasts the run
  const blessings = {
    'cb-health-plan': { name: 'Extended Health Plan', mods: { maxHp: 20 }, desc: 'Gold tier. Covers one feeling per quarter.', stack: 3 },
  };

  LM.definePack({ id: 'chessboard', items, blessings });
})();
