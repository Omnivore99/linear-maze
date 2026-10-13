/* The Linear Maze — packs/chessboard/workday.js
 * Chessboard pack, part 5: the work day. Three tasks before 5:00.
 *
 *   TASK 1  the status meeting in Zeno's Paradox      flag cb_t1   (meeting.js)
 *   TASK 2  run the daily report module, server room  flag cb_t2   (the terminal ends the floor)
 *   TASK 3  Mandatory Workplace Surveillance Training flag cb_t3   (Brenda, npcs.js)
 * Kevin, at the server farm's door, lets you in once tasks 1 and 3 are done.
 *
 * The clock runs from 9:00 at CB.CONFIG.minutesPerSecond game minutes per
 * second of play (paused while a pop-up is open). At 5:00 with tasks left,
 * the floor restarts. The clock, the task count and the arrows show under
 * the scores in the top-right corner.
 *
 * Trap effects this file adds (used by levels/04-chessboard-one.js):
 *   cb-arrow    { n, of }   the player reached arrow n of `of`; in order, they open the farm
 *   cb-meeting  {}          walking into Zeno's Paradox starts the meeting
 *   cb-wake     {}          walking into the server farm wakes Bob
 *
 * Everything the level needs to remember lives in story flags, so a restart
 * (from dying, or from the clock) puts the floor back the way you left it:
 *   cb_t1 cb_t2 cb_t3, cb_reports (sat through the reports), cb_serverDoor
 *   (finished the arrows), cb_bobAppeased (gave Bob his key).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const CB = (LM.CHESSBOARD = LM.CHESSBOARD || {});
  const MEMOS = LM.MEMOS;
  const has = (game, f) => game.hasFlag(f);
  const LEVEL = 'chessboard-one';
  const here = (game) => game.levelId === LEVEL;

  CB.CONFIG = {
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    minutesPerSecond: 0.5, // 8 hours = 16 minutes of play
    failRestartsRun: true, // a wrong answer in the meeting starts the whole run over (false: restart this floor)
  };
  CB.TASKS = [
    { n: 1, flag: 'cb_t1', label: 'Status meeting · Zeno’s Paradox' },
    { n: 2, flag: 'cb_t2', label: 'Daily report module · server room' },
    { n: 3, flag: 'cb_t3', label: 'Surveillance training · Brenda' },
  ];
  LM.PHONE_THREADS = LM.PHONE_THREADS || {};
  LM.PHONE_THREADS.workday = { name: 'WorkDay™', initials: 'W', color: '#4a6a2a' };

  /** Per-visit state (resets when the floor loads). */
  CB.state = function (game) {
    if (!game.cb || game.cb.levelLoad !== game.levelLoads) game.cb = { levelLoad: game.levelLoads, clock: CB.CONFIG.startMinute, arrows: 0, sent: {}, offerCd: 0 };
    return game.cb;
  };
  const clockText = (m) => {
    const hh = Math.floor(m / 60), mm = Math.floor(m % 60);
    return ((hh + 11) % 12) + 1 + ':' + (mm < 10 ? '0' : '') + mm + (hh < 12 ? ' AM' : ' PM');
  };
  const doneCount = (game) => CB.TASKS.filter((t) => has(game, t.flag)).length;
  const phone = (game, thread, text, opts) => LM.phone && LM.phone.send(game, thread, text, opts);

  /**
   * Keep progress on this floor: a fresh checkpoint (used if you die or the day
   * ends) and the same in the browser save, so Continue from the title screen
   * doesn't forget finished tasks. Same save format as the engine's (engine/game.js).
   */
  CB.saveProgress = function (game) {
    if (!game.player || !here(game)) return;
    game.checkpoint = game.player.serialize();
    try {
      localStorage.setItem('linear-maze-save-v1', JSON.stringify({ levelId: game.levelId, player: game.checkpoint, savedAt: Date.now() }));
    } catch (e) {}
  };
  CB.completeTask = function (game, n) {
    const task = CB.TASKS.find((t) => t.n === n);
    if (!task || has(game, task.flag)) return;
    game.setFlag(task.flag);
    LM.audio.play('win');
    game.toast('TASK ' + n + ' COMPLETE: ' + task.label, 'key');
    // a fresh checkpoint: dying from here on keeps what you've done
    if (game.player && n !== 2) CB.saveProgress(game);
    if (n !== 2) {
      const left = CB.TASKS.filter((t) => !has(game, t.flag) && t.n !== 2);
      game.schedule(1.5, () => phone(game, 'workday', 'Task ' + n + ' complete. ' + (left.length ? 'Still to do: ' + left.map((t) => t.label).join('; ') + '.' : 'Kevin at the server room says you’re cleared. Follow the arrows.')));
    }
    stepAside(game);
  };

  // ------------------------------------------------------------ HUD lines under the scores
  MEMOS.hudLines.push((game) => {
    if (!here(game)) return null;
    return ['Work day', clockText(CB.state(game).clock)];
  });
  MEMOS.hudLines.push((game) => (here(game) ? ['Tasks', doneCount(game) + ' / 3'] : null));
  MEMOS.hudLines.push((game) => {
    if (!here(game) || has(game, 'cb_serverDoor')) return null;
    const a = CB.state(game).arrows;
    return a ? ['Arrows', a + ' / 5'] : null;
  });

  // ------------------------------------------------------------ Kevin steps aside
  function stepAside(game) {
    if (!here(game) || !(has(game, 'cb_t1') && has(game, 'cb_t3'))) return;
    const kev = game.npcs.find((n) => n.def.id === 'cb-tech');
    if (!kev || kev.mem.aside) return;
    const spot = game.level.def.techAside;
    kev.mem.aside = true;
    kev.def = Object.assign({}, kev.def, { ghost: true }); // never in the way once you're cleared
    kev.x = kev.home.x = spot[0] * T + T / 2;
    kev.y = kev.home.y = spot[1] * T + T / 2;
    kev.baseFacing = kev.facing = kev.wantFace = Math.PI / 2;
  }
  function openFarm(game, fanfare) {
    const pts = game.level.tags.serverDoor || [];
    for (const p of pts) game.setTerrain(p.x, p.y, 'door', 'serverDoor');
    if (!fanfare) return;
    game.addShake(0.35);
    LM.audio.play('altar');
    LM.get('effects', 'flicker').run(game, { radius: 900, time: 1.2 });
    game.toast('The arrows were a loop. Of course they were. But there is a door in the wall now.', 'key');
    game.schedule(2, () => phone(game, 'workday', 'Server room access: GRANTED. Reminder: the server room is not on any map.'));
  }

  // ------------------------------------------------------------ trap effects
  const effects = {
    'cb-arrow': {
      run(game, ef) {
        if (has(game, 'cb_serverDoor')) return;
        const st = CB.state(game), n = ef.n, of = ef.of || 5;
        if (n === st.arrows + 1) {
          st.arrows = n;
          LM.audio.play('tick');
          if (n === of) {
            game.setFlag('cb_serverDoor');
            openFarm(game, true);
          } else game.toast('Arrow ' + n + ' of ' + of + '. Keep following.', '');
        } else if (n === 1) {
          st.arrows = 1;
        } else if (n > st.arrows + 1 && st.arrows > 0) {
          st.arrows = 0;
          game.toast('You skipped an arrow. The arrows know. Start again at the first one.', 'warn');
          LM.audio.play('locked');
        }
      },
    },
    'cb-meeting': {
      run(game) {
        if (CB.startMeeting) CB.startMeeting(game);
      },
    },
    'cb-wake': {
      run(game) {
        const bob = game.npcs.find((n) => n.def.id === 'cb-bob');
        if (!bob || bob.mem.awake || bob.mem.appeased) return;
        bob.mem.awake = true;
        bob.say('WHO. IS IN. MY SERVER ROOM.', 2.6);
        LM.audio.play('warn');
        game.addShake(0.2);
      },
    },
  };

  // ------------------------------------------------------------ the controller: an invisible item on the floor
  const items = {
    'cb-workday': {
      name: '', radius: 1, shadow: false,
      update(it, dt, game) {
        if (game.attract || !here(game) || !game.player || game.player.dead) return;
        const st = CB.state(game), P = game.player;
        st.clock = Math.min(CB.CONFIG.endMinute, st.clock + dt * CB.CONFIG.minutesPerSecond);
        // the day, by the clock
        const at = (min, key, fn) => {
          if (st.clock >= min && !st.sent[key]) {
            st.sent[key] = true;
            fn();
          }
        };
        at(12 * 60, 'noon', () => phone(game, 'dana', 'lunch is cancelled!! working lunch!! the work is lunch :)'));
        at(15 * 60, '3pm', () => phone(game, 'workday', 'Reminder: end of day is in two hours. End of day is non-negotiable.'));
        at(16 * 60 + 30, '430', () => phone(game, 'dana', '30 min to EOD!!! where are we on everything!!!'));
        if (st.clock >= CB.CONFIG.endMinute && !has(game, 'cb_t2') && !st.over) {
          st.over = true;
          endOfDay(game);
          return;
        }
        // walk into Kevin before you're cleared and he tells you exactly what's missing
        const kev = game.npcs.find((n) => n.def.id === 'cb-tech');
        st.kevCd = (st.kevCd || 0) - dt;
        if (kev && !kev.mem.aside && st.kevCd <= 0 && kev.distP < kev.r + P.r + 8) {
          st.kevCd = 6;
          const left = CB.TASKS.filter((t) => t.n !== 2 && !has(game, t.flag)).map((t) => t.label);
          kev.say(left.length ? 'Not yet! Still to do: ' + left.join(', ') + '.' : 'You’re cleared!', 4);
        }
        // Bob wakes when you're in his farm past the doorway (the 'farm' tiles do this too)
        const area = game.level.def.bobArea;
        if (area && !st.bobWoke && P.x / T >= area[0] + 3 && P.x / T < area[0] + area[2] && P.y / T >= area[1] && P.y / T < area[1] + area[3]) {
          st.bobWoke = true;
          effects['cb-wake'].run(game);
        }
        // Bob notices his key
        st.offerCd -= dt;
        if (has(game, 'bobKey') && !has(game, 'cb_bobAppeased') && st.offerCd <= 0) {
          const bob = game.npcs.find((n) => n.def.id === 'cb-bob');
          if (bob && bob.mem.awake && bob.distP < 120 && bob.seeLos) {
            st.offerCd = 10;
            LM.ui.dialog(game, bob);
          }
        }
      },
    },
  };

  /** 5:00 and the work isn't done. */
  function endOfDay(game) {
    LM.audio.play('alarm');
    game.state === 'play' && LM.ui.open({
      kicker: 'WorkDay™ · 5:00 PM',
      title: 'End of day',
      body: h('div', { class: 'lore-block' },
        h('p', { class: 'lore' }, 'Every phone on the floor rings at once. Every screen says the same thing: END OF DAY.'),
        h('p', { class: 'lore' }, 'From Zeno’s Paradox, Dana’s voice, very calm: “End of day means end of day.”'),
        h('p', { class: 'muted' }, 'Tasks done: ' + doneCount(game) + ' of 3. The day starts again at 9:00, and what you finished stays finished.')),
      actions: [{ label: 'Clock in again', primary: true, key: 'E', onClick: () => setTimeout(() => game.restartLevel(), 0) }],
      dismissable: false,
    });
  }

  // ------------------------------------------------------------ arriving on the floor
  LM.on('levelLoaded', (game) => {
    game.levelLoads = (game.levelLoads || 0) + 1;
    if (!here(game) || game.attract || !game.player) return;
    CB.state(game);
    if (has(game, 'cb_serverDoor')) openFarm(game, false);
    stepAside(game);
    const bob = game.npcs.find((n) => n.def.id === 'cb-bob');
    if (bob && has(game, 'cb_bobAppeased')) {
      bob.mem.appeased = true;
      bob.x = bob.home.x;
      bob.y = bob.home.y;
    }
    // first arrival: the tasks, by phone (your desk has the details)
    const P = game.player;
    P.data.cb = P.data.cb || {};
    if (!P.data.cb.welcomed) {
      P.data.cb.welcomed = true;
      LM.phone.later(game, 3, 'workday', 'Good morning! You have 3 tasks due by 5:00 PM: (1) Status meeting, Zeno’s Paradox. (2) Run the daily report module, server room. (3) Mandatory Surveillance Training, Brenda. Details at your desk.');
      LM.phone.later(game, 12, 'dana', 'Meeting in Zeno’s whenever you’re ready!! everyone’s there. everyone is ALWAYS there :)', {
        replies: [
          { label: 'On my way.', then: { text: 'love that. bring the TPS report. and be caught up on email!!' } },
          { label: 'Is that a gun?', then: { text: 'it’s a meeting pistol :)' } },
        ],
      });
      LM.phone.later(game, 26, 'unknown', 'You came up instead of down. Nobody comes up. Welcome to the first chessboard.');
    }
  });

  LM.definePack({ id: 'chessboard', effects, items });
})();
