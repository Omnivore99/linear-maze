/* The Linear Maze — packs/chessboard/meeting.js
 * Chessboard pack, part 4: Task 1, the status meeting in Zeno's Paradox.
 *
 * Walking into the room (the level's 'zeno' tiles fire the 'cb-meeting' trap
 * effect) locks the door. Dana goes around the table: each attendee gives a
 * report and is shot for poor performance. They regenerate a minute or so
 * later, back in their seat. Then it's your turn:
 *
 *   Are you caught up on your email?   needs flag emailTPS (the compiled TPS report)
 *     no  -> she sends you away to read it; come back and she asks again
 *   What did Alice's goodbye say?      flag aliceDecrypted lets you just answer;
 *                                      otherwise you get a text box to guess in
 *     wrong guess -> she shoots you, and the game starts over (CB.CONFIG.failRestartsRun)
 *     right       -> Task 1 done (flag cb_t1)
 *
 * Attendees are 'cb-attendee' NPCs with placement props:
 *   { seat: order, name, role, report, verdict, skip: true (Dana skips them), after }
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const CB = (LM.CHESSBOARD = LM.CHESSBOARD || {});
  const MEMOS = LM.MEMOS;
  const has = (game, f) => game.hasFlag(f);

  const meetingDoors = (game) => game.doors.filter((d) => d.tag === 'zenoDoor');
  function lockRoom(game, on) {
    for (const d of meetingDoors(game)) {
      d.sealed = on;
      if (on) d.closeT = 0;
    }
  }
  const findDana = (game) => game.npcs.find((n) => n.def.id === 'cb-dana');

  // ------------------------------------------------------------ gunfire
  function muzzle(game, from, to) {
    const a = Math.atan2(to.y - from.y, to.x - from.x);
    from.facing = a;
    from.wantFace = a;
    const mx = from.x + Math.cos(a) * 14, my = from.y + Math.sin(a) * 14;
    LM.audio.play('pistol');
    game.lights.push({ x: mx, y: my, r: 220, color: '#ffd890', intensity: 1, life: 0.09, max: 0.09 });
    game.particles.add({ type: 'flash', x: mx, y: my, life: 0.08, size: 14, color: '#fff2c0' });
    game.particles.burst(to.x, to.y, 14, { type: 'dot', color: '#8e1d1d', speed: 170, life: 0.5, size: [1, 2.2], drag: 5 });
    game.renderer.addDecal({ type: 'blood', x: to.x, y: to.y, r: 9, color: '#5e1616' });
    game.addShake(0.18, a);
  }
  /** Shoot an attendee. They come back in their seat later, which is the point of Chessboard 1. */
  function execute(game, dana, n, regenIn) {
    muzzle(game, dana, n);
    const spawn = { id: n.def.id, tx: Math.floor((n.home.x - (n.props.ox || 0)) / T), ty: Math.floor((n.home.y - (n.props.oy || 0)) / T), props: n.props, tag: n.tag };
    game.npcs = game.npcs.filter((o) => o !== n);
    const lvl = game.levelId;
    game.schedule(regenIn, () => {
      if (game.levelId !== lvl) return;
      const r = game.spawnNPC(spawn.id, spawn.tx, spawn.ty, spawn.props, spawn.tag);
      if (!r) return;
      r.mem.regen = true;
      r.vis = 0;
      game.particles.burst(r.x, r.y, 12, { type: 'spark', color: '#9fe0b0', speed: 60, life: 0.6, size: 1 });
      r.say(U.pick(['Regenerated! What’d I miss?', 'And we’re back.', 'Ow. Okay. Back.', 'Did I get a three again?']), 3);
    });
  }

  // ------------------------------------------------------------ the meeting
  CB.startMeeting = function (game) {
    const st = CB.state(game);
    if (has(game, 'cb_t1') || st.meeting) return;
    const dana = findDana(game);
    if (!dana) return;
    st.meeting = true;
    lockRoom(game, true);
    LM.audio.play('door');
    if (has(game, 'cb_reports')) {
      // you've sat through the reports already; straight to your turn
      dana.say('Back! Let’s pick up where we left off. You.', 2.4);
      game.schedule(2.2, () => yourTurn(game, dana));
      return;
    }
    const people = game.npcs.filter((n) => n.def.id === 'cb-attendee').sort((a, b) => (a.props.seat || 0) - (b.props.seat || 0));
    for (const n of people) n.barkT = 999;
    dana.barkT = 999;
    let t = 0.4;
    const at = (dt, fn) => {
      t += dt;
      game.schedule(t, fn);
    };
    at(0, () => dana.say('Oh good, you’re here. Everyone’s here. Let’s go around the room.', 2.6));
    at(2.8, () => {});
    people.forEach((n, i) => {
      const first = n.name.split(' ')[0];
      if (n.props.skip) {
        at(0, () => dana.say(n.props.verdict || first + ' is still regenerating. Skip ' + first + '.', 2.2));
        at(2.4, () => n.say(n.props.report || '(still loading)', 2));
        at(1.2, () => {});
        return;
      }
      at(0, () => {
        dana.facing = Math.atan2(n.y - dana.y, n.x - dana.x);
        dana.say(first + '. Report.', 1.5);
      });
      at(1.5, () => n.say(n.props.report, 2.7));
      at(2.7, () => dana.say(n.props.verdict, 1.7));
      at(1.5, () => execute(game, dana, n, 55 + i * 9));
      at(0.8, () => {});
    });
    at(0, () => {
      game.setFlag('cb_reports');
      dana.say('Last but not least.', 1.6);
    });
    at(1.6, () => yourTurn(game, dana));
  };

  // ------------------------------------------------------------ your turn
  function speaker(dana, tree) {
    return { name: dana.name, role: 'Director of Operations · chairing', look: dana.look, def: dana.def, mem: {}, said: new Set(), x: dana.x, y: dana.y, dialog: () => tree };
  }
  function excused(game) {
    const st = CB.state(game);
    st.meeting = false;
    lockRoom(game, false);
  }
  function passed(game) {
    const st = CB.state(game);
    st.meeting = false;
    lockRoom(game, false);
    CB.completeTask(game, 1);
  }
  function yourTurn(game, dana) {
    if (game.state !== 'play') {
      // a pop-up is open (the phone?): try again in a moment
      return game.schedule(0.5, () => yourTurn(game, dana));
    }
    const poem = '“' + MEMOS.PLAINTEXT + '”';
    const tree = {
      start: 'email',
      nodes: {
        email: {
          mood: 'smile',
          text: ['You. Are you caught up on your email?'],
          options: [
            { label: 'Yes. Here’s the compiled TPS report.', if: (g) => has(g, 'emailTPS'), next: 'tps' },
            { label: 'Mostly?', next: 'notCaught' },
            { label: 'What email?', next: 'notCaught' },
          ],
        },
        notCaught: {
          mood: 'annoyed',
          do: (g) => excused(g),
          text: ['Then why are you in my meeting?', '(She checks the pistol. She decides you aren’t worth the paperwork. Yet.)', 'Go read your email. Your desk is where it always is. The meeting will still be here when you get back. Meetings are always still here.'],
          options: [{ label: '(Leave. Quickly.)', end: true }],
        },
        tps: {
          mood: 'smile',
          text: [
            '(She takes the TPS report without looking at it and staples it to the wall with a stapler that was already in her hand.)',
            'Beautiful. New cover sheet and everything.',
            'One more thing. Alice’s goodbye. Bob says it came through as gibberish, and Bob is… taking it hard. Did you decrypt it? What did it say?',
          ],
          options: [
            { label: poem, if: (g) => has(g, 'aliceDecrypted'), next: 'pass' },
            { label: 'Let me take a guess…', if: (g) => !has(g, 'aliceDecrypted'), end: true, do: (g) => setTimeout(() => guessBox(g, dana), 0) },
          ],
        },
        pass: {
          mood: 'smile',
          do: (g) => passed(g),
          text: [
            '…Oh. Oh, that’s lovely. A poem. Bob will be thrilled. Bob has never once been thrilled.',
            'Meeting adjourned! You’re the only one who survived it, so you’re also taking the minutes.',
            'Now: the daily report module. Server room, east side, through the new door past reception. Follow the arrows. And do Brenda’s training. End of day is five.',
          ],
          options: [{ label: 'Thank you, Dana.', end: true }],
        },
      },
    };
    LM.ui.dialog(game, speaker(dana, tree));
  }

  // ------------------------------------------------------------ the guess
  function guessBox(game, dana) {
    const area = h('textarea', { 'aria-label': 'Your guess', placeholder: 'What did Alice’s goodbye say?' });
    // typing must not move you, open your phone, or press dialog buttons
    area.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });
    let done = false;
    const submit = () => {
      if (done) return;
      done = true;
      LM.ui.close();
      const ok = MEMOS.closeness(area.value) >= 0.85;
      if (ok) {
        game.setFlag('aliceDecrypted');
        MEMOS.award(game, 'email', 'decrypted', 100);
        LM.ui.dialog(game, speaker(dana, {
          start: 'close',
          nodes: {
            close: {
              mood: 'smile',
              do: (g) => passed(g),
              text: ['(She looks at you for a long moment.)', '…That’s what Bob said it said. Huh. You can read gibberish. That’s a skill. I’m putting that in your review.', 'Meeting adjourned. Daily report, server room, east. Follow the arrows. Do Brenda’s training. End of day is five.'],
              options: [{ label: 'Thank you, Dana.', end: true }],
            },
          },
        }));
      } else fired(game, dana, area.value);
    };
    LM.ui.open({
      kicker: 'Status meeting · Zeno’s Paradox',
      title: 'What did Alice say?',
      body: h('div', { class: 'guess' },
        h('p', { class: 'lore' }, 'Dana waits. Everyone at the table is very still, partly out of respect and partly because they are dead.'),
        h('pre', { class: 'cipher', style: 'margin:0;padding:10px;background:#060c14;border:1px dashed #2c4a6a;color:#ffd08a;font:400 12.5px/1.5 var(--font-ui);white-space:pre-wrap' }, MEMOS.CIPHERTEXT),
        area,
        h('p', { class: 'muted' }, 'Type your best guess at the plaintext, then press Enter.')),
      actions: [
        { label: 'Answer', primary: true, onClick: () => { submit(); return false; } },
        { label: 'I have no idea', quiet: true, onClick: () => { area.value = ''; submit(); return false; } },
      ],
      dismissable: false,
    });
    setTimeout(() => area.focus(), 30);
  }

  /** A wrong answer. She shoots you, and the whole run starts over. */
  function fired(game, dana, guess) {
    const P = game.player;
    lockRoom(game, true);
    dana.say(guess && guess.trim() ? 'That is not what it said.' : 'Then what are you FOR?', 1.6);
    game.schedule(1.2, () => {
      muzzle(game, dana, P);
      P.hp = 0;
      P.dead = true;
      game.state = 'dying';
      game.hitStop = 0.25;
      LM.audio.play('lose');
      game.schedule(1.2, () => {
        const restart = CB.CONFIG.failRestartsRun;
        LM.ui.open({
          kicker: 'Performance review · Zeno’s Paradox',
          title: 'Terminated',
          body: h('div', { class: 'lore-block' },
            h('p', { class: 'lore' }, 'Dana lowers the pistol. “Wrong answer. We’ll circle back.”'),
            h('p', { class: 'lore' }, restart
              ? 'You don’t regenerate. You’re not from here. Everything starts over: the fourteenth floor, the note, the maze, the meeting. Read your email this time. Check Alice’s desk.'
              : 'You come to on the elevator, as if the day hasn’t started yet.')),
          actions: [restart
            ? { label: 'Start over from the 14th floor', primary: true, key: 'E', onClick: () => setTimeout(() => game.newRun(), 0) }
            : { label: 'Clock in again', primary: true, key: 'E', onClick: () => setTimeout(() => game.restartLevel(), 0) }],
          dismissable: false,
        });
        LM.ui.prevState = 'dead';
      }, true);
    }, true);
  }
})();
