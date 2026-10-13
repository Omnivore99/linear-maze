/* The Linear Maze — packs/rotary/rotary.js
 * The red rotary phones: one on every floor, each with its own 7-digit number.
 * Dial another phone's number and you're there, standing in front of it.
 * Dial anything else and you get nobody, or somebody, saying something odd.
 *
 * Every floor's phone sits on its own little desk near where you arrive,
 * except at home, where it's on the kitchen counter ("It was here when I got
 * the apartment."). Phones are added when a floor loads, from the table below,
 * so no level map needs editing.
 *
 *   LM.ROTARY.LINES   { levelId: { number: '5551414', x, y, counter?, note?, requires?, busy?, pickup? } }
 *                     x, y: the phone's tile. counter: sits on a counter instead of its own desk.
 *                     requires: a story flag; until it's set, dialing this number gets an ordinary answer.
 *                     busy: { text, thought?, flag?, until? }: this phone can't call out; picking it up gets that.
 *                       until: a story flag; once it's set the line is free and the phone dials as usual.
 *                     pickup: what you hear when you get through (**bold** parts), instead of the usual.
 *   LM.ROTARY.ring(game, { notice?, answer, who?, thought?, onAnswer? })
 *                     makes this floor's phone ring (glow, jiggle, sound) until it's answered.
 *   LM.think(game, text)  the character's own thought, shown like a notification.
 *   LM.ROTARY.ANSWERS what a wrong number gets: { text, who? }. The same number
 *                     always gets the same answer.
 *   LM.ROTARY.SPECIAL particular wrong numbers with their own answers.
 * Numbers you've seen on a phone's label are remembered (P.data.rotary.known)
 * and listed beside the dial. A floor with no entry in LINES has no phone.
 * Flags: rotaryUsed (dialed anything), rotaryTravel (went somewhere by phone).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const R = (LM.ROTARY = LM.ROTARY || {});

  R.LINES = {
    apartment: { number: '5550107', x: 15, y: 6, counter: true, note: 'It was here when I got the apartment.' },
    'meridian-fourteen': { number: '5551414', x: 65, y: 44 },
    'sunken-cloister': { number: '5550311', x: 2, y: 2 },
    'ember-foundry': { number: '5550622', x: 2, y: 20 },
    'gilded-reliquary': { number: '5550933', x: 36, y: 47 },
    'chessboard-one': { number: '5551001', x: 65, y: 44 },
    // Home on Chessboard 1: your own number, backwards. It only connects once you've been told to call it.
    // Busy until you're back from the library (libraryDone); after that it dials like any other phone.
    'home-cb1': {
      number: '7010555', x: 15, y: 6, counter: true, requires: 'heardReverse',
      note: 'It was here when I got the apartment. It’s still here. It’s a little redder.',
      pickup: '**Someone picks up. It’s you.** “Hold still,” you tell yourself. Behind you, very faintly, your own phone starts ringing.',
      busy: { text: 'Beep-beep-beep. Beep-beep-beep. Beep-beep-beep.', thought: 'I think this is what they used to call a busy signal?', flag: 'cb1TriedPhone', until: 'libraryDone' },
    },
    'library-1': { number: '5557323', x: 9, y: 2 }, // RE-ADER, by the circulation desk
    'library-2': { number: '5552665', x: 34, y: 2 }, // the landing of the lower stacks
  };

  R.SPECIAL = {
    '8675309': { who: 'A tired voice', text: '“There’s no Jenny here. There has never been a Jenny here. Please stop.”' },
    '1234567': { who: 'Nobody', text: 'A recording: “You have reached the number everyone tries first. Please try a number someone would actually have.”' },
    '0000000': { who: 'The dark', text: 'No ring. Just a long, patient silence, the kind with someone in it.' },
    '5555555': { who: 'A man', text: '“Is this the 555 number? Every number is a 555 number. You’re thinking of the movies.”' },
    '7777777': { who: 'A slot machine', text: 'Bells. Coins falling. A cheer. Then a voice: “Sorry, wrong casino.”' },
    '5550100': { who: 'Marisol', text: '“Meridian Group, please hold.” The hold music is the same four notes as the ringtone you had in 2006.' },
  };

  R.ANSWERS = [
    { text: 'It rings and rings. Nobody picks up.' },
    { text: 'A busy signal, then a voice inside the busy signal: “still busy.”' },
    { text: 'Three rising tones. “The number you have dialed is not in service. Neither are we.”' },
    { who: 'An old woman', text: '“Harold? Harold, is that you? Tell Harold to bring the folding chairs.” She hangs up before you can explain you’re not Harold, or a chair.' },
    { who: 'A pizza place', text: '“Tony’s, we deliver.” You don’t say anything. “…We deliver anywhere,” they say, more quietly. “Anywhere at all.”' },
    { who: 'A child', text: '“Is your refrigerator running?” You check. It isn’t. You don’t have one here. “Then you’d better go catch it,” they whisper, and hang up, laughing.' },
    { who: 'A fax machine', text: 'A scream of static and squeals. You understand none of it, but you feel, somehow, that you’ve been sent a TPS report.' },
    { who: 'Someone eating', text: '“Mm? Mm-hm. No. Mm.” Chewing. “Wrong number,” they finally say, and keep chewing for a while before hanging up.' },
    { who: 'A very calm man', text: '“This is the time and temperature line. The time is now. The temperature is room.”' },
    { who: 'Your own voice', text: '“Hello?” You say hello. It says hello. You both wait for the other to talk. Eventually, you both hang up, at exactly the same time.' },
    { who: 'A psychic hotline', text: '“I knew you were going to call.” A long pause. “I didn’t know it would be so boring. Goodbye.”' },
    { who: 'A dentist’s office', text: '“Calling to confirm your cleaning. It’s been eleven years. We’ll see you never, then.”' },
    { who: 'A radio station', text: '“Caller number nine! You’ve won—” The line goes dead. You will never know what you won.' },
    { who: 'A polite robot', text: '“Press one to continue. Press two to go back. Press three to stay exactly where you are, forever.” The rotary phone has no buttons.' },
    { who: 'A woman, whispering', text: '“Don’t dial this number again. It isn’t a floor. It’s a hallway.”' },
    { text: 'The dial spins back on its own, slowly, and stops on a number you didn’t dial. Nothing answers.' },
  ];

  // ------------------------------------------------------------ helpers
  const fmt = (n) => (n.length > 3 ? n.slice(0, 3) + '-' + n.slice(3) : n);
  const lineOf = (levelId) => R.LINES[levelId];
  /** Is this line busy right now? (busy.until: a flag that frees it) */
  const isBusy = (L, game) => !!(L && L.busy && !(L.busy.until && game.hasFlag(L.busy.until)));
  const findLine = (num, game) => Object.keys(R.LINES).find((id) => R.LINES[id].number === num && LM.find('levels', id) && (!R.LINES[id].requires || game.hasFlag(R.LINES[id].requires)));
  function known(P) {
    P.data.rotary = P.data.rotary || { known: [] };
    return P.data.rotary.known;
  }
  function learn(game, levelId) {
    const P = game.player, L = lineOf(levelId);
    if (!P || !L) return;
    const k = known(P);
    if (!k.includes(levelId)) k.push(levelId);
  }
  function answerFor(num) {
    if (R.SPECIAL[num]) return R.SPECIAL[num];
    return R.ANSWERS[U.strHash('rotary:' + num) % R.ANSWERS.length];
  }

  LM.ui.addStyles(`
    .rotary { display: grid; gap: 10px; }
    .rotary-label { justify-self: center; padding: 4px 10px; background: #efe6c8; color: #3a2a14; font: 700 13px/1.2 var(--font-ui); letter-spacing: 0.08em; transform: rotate(-1deg); }
    .rotary-display { justify-self: center; width: min(260px, 100%); box-sizing: border-box; padding: 8px; border: 1px solid #5a2222; background: #1a0f0f; color: #ff7a6a; font: 700 26px/1 var(--font-ui); letter-spacing: 0.18em; text-align: center; }
    .rotary-display:focus { outline: 2px solid var(--brass); }
    .rotary-dial { display: grid; grid-template-columns: repeat(3, 58px); gap: 6px; justify-content: center; }
    .rotary-dial button { height: 40px; border: 1px solid #6a3a3a; border-radius: 50%; background: #2a1414; color: #f4ddd4; font: 700 17px var(--font-ui); cursor: pointer; }
    .rotary-dial button:hover, .rotary-dial button:focus-visible { border-color: var(--brass); outline: none; }
    .rotary-reply { min-height: 2.8em; text-align: center; font: italic 400 16px/1.45 var(--font-lore); color: #e2d6c2; }
    .rotary-reply b { font-style: normal; color: var(--brass); }
    .rotary-known { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .rotary-known button { padding: 4px 9px; border: 1px solid var(--line); background: transparent; color: var(--muted); font: 600 11px var(--font-ui); cursor: pointer; }
    .rotary-known button:hover { color: var(--bone); border-color: var(--brass); }
  `);

  // ------------------------------------------------------------ dialing
  function openPhone(game, it) {
    const here = game.levelId, me = lineOf(here);
    if (game.rotaryRing) return answer(game, it);
    if (isBusy(me, game)) return busy(game, it, me);
    learn(game, here);
    const display = h('input', { class: 'rotary-display', inputmode: 'numeric', maxlength: '8', 'aria-label': 'Number to dial', placeholder: '___-____', autocomplete: 'off' });
    const reply = h('div', { class: 'rotary-reply', 'aria-live': 'polite' });
    const digits = () => display.value.replace(/\D/g, '').slice(0, 7);
    const setDigits = (d) => {
      display.value = fmt(d);
      reply.replaceChildren();
    };
    // typing must reach the box, not move the player or press dialog keys
    display.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        call();
      }
    });
    display.addEventListener('input', () => setDigits(digits()));
    const dial = h('div', { class: 'rotary-dial' }, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => {
      const b = h('button', { type: 'button', 'aria-label': k === 'C' ? 'Clear' : k === '⌫' ? 'Erase one digit' : k }, k);
      b.addEventListener('click', () => {
        const d = digits();
        if (k === 'C') setDigits('');
        else if (k === '⌫') setDigits(d.slice(0, -1));
        else if (d.length < 7) {
          setDigits(d + k);
          LM.audio.play('tick');
        }
      });
      return b;
    }));
    const lines = known(game.player).filter((id) => id !== here && lineOf(id) && LM.find('levels', id) && (!lineOf(id).requires || game.hasFlag(lineOf(id).requires)));
    const book = lines.length
      ? h('div', null, h('p', { class: 'muted', style: 'text-align:center;margin:0 0 6px' }, 'Numbers you’ve seen on other phones:'),
        h('div', { class: 'rotary-known' }, lines.map((id) => {
          const b = h('button', { type: 'button' }, fmt(lineOf(id).number));
          b.addEventListener('click', () => setDigits(lineOf(id).number));
          return b;
        })))
      : null;

    function call() {
      const d = digits();
      game.setFlag('rotaryUsed');
      if (d.length < 7) {
        reply.replaceChildren('The dial wants seven digits. It is an old phone, and particular.');
        return false;
      }
      LM.audio.play('tick');
      if (me && d === me.number) {
        reply.replaceChildren('A busy signal. Of course it’s busy: you’re on it.');
        return false;
      }
      const target = findLine(d, game);
      if (target) {
        learn(game, target);
        const name = LM.get('levels', target).name;
        const L = lineOf(target);
        if (L.pickup) reply.replaceChildren(...L.pickup.split('**').map((t, i) => (i % 2 ? h('b', null, t) : t)));
        else reply.replaceChildren(h('b', null, 'Someone picks up. '), '“Hold still,” they say. Behind you, very faintly, a phone starts ringing on ' + name + '.');
        setTimeout(() => travel(game, target), 900);
        return false;
      }
      const a = answerFor(d);
      reply.replaceChildren(...(a.who ? [h('b', null, a.who + ': ')] : []), a.text);
      return false;
    }

    LM.ui.open({
      kicker: 'Red telephone' + (me ? ' · ' + fmt(me.number) : ''),
      title: 'A rotary phone',
      body: h('div', { class: 'rotary' },
        h('p', { class: 'lore', style: 'margin:0' }, (it.props.note || (me && me.note)) || 'A red rotary telephone on a little desk of its own. Nobody remembers putting it here. The cord goes into the floor, or into something under the floor.'),
        me ? h('div', { class: 'rotary-label' }, 'THIS LINE · ' + fmt(me.number)) : null,
        display, dial, reply, book),
      actions: [
        { label: 'Dial', primary: true, onClick: () => call() },
        { label: 'Hang up', quiet: true },
      ],
    });
    setTimeout(() => display.focus(), 30);
  }

  // ------------------------------------------------------------ ringing, busy lines, thoughts
  LM.ui.addStyles(`.toast.thought { border-left-color: #b8a1ff; font-style: italic; font-family: var(--font-lore); font-size: 15px; letter-spacing: 0; }`);
  /** The character's own thought. */
  LM.think = LM.think || function (game, text) {
    game.toast('“' + text + '”', 'thought');
  };
  R.ring = function (game, opts) {
    game.rotaryRing = Object.assign({ t: 0 }, opts || {});
    game.rotaryRingNext = 0;
    if (opts && opts.notice) game.toast(opts.notice, 'key');
  };
  function answer(game, it) {
    const call = game.rotaryRing;
    game.rotaryRing = null;
    LM.audio.play('tick');
    const paras = String(call.answer || 'Nobody is there.').split('\n\n');
    LM.ui.open({
      kicker: 'Red telephone',
      title: 'You pick up',
      body: h('div', { class: 'lore-block' }, ...paras.map((p, i) => h('p', { class: 'lore' }, i === 0 && call.who ? h('b', null, call.who + ': ') : null, p))),
      actions: [{ label: 'Hang up', primary: true, key: 'E' }],
      onClose: () => {
        if (call.thought) setTimeout(() => LM.think(game, call.thought), 400);
        if (call.onAnswer) call.onAnswer(game);
      },
    });
  }
  function busy(game, it, me) {
    LM.audio.play('locked');
    if (me.busy.flag) game.setFlag(me.busy.flag);
    LM.ui.open({
      kicker: 'Red telephone · ' + fmt(me.number),
      title: 'A rotary phone',
      body: h('div', { class: 'rotary' },
        h('p', { class: 'lore', style: 'margin:0' }, it.props.note || me.note || ''),
        h('div', { class: 'rotary-display', style: 'font-size:16px' }, me.busy.text)),
      actions: [{ label: 'Hang up', primary: true, key: 'E' }],
      onClose: () => {
        if (me.busy.thought) setTimeout(() => LM.think(game, me.busy.thought), 300);
      },
    });
  }
  LM.audio.define('ring', (t, o, opt, kit) => {
    for (let i = 0; i < 10; i++) kit.tone(t + i * 0.05, o, { type: 'sine', f0: i % 2 ? 1180 : 940, dur: 0.045, gain: 0.16 });
    for (let i = 0; i < 10; i++) kit.tone(t + 0.6 + i * 0.05, o, { type: 'sine', f0: i % 2 ? 1180 : 940, dur: 0.045, gain: 0.16 });
  });

  /** Go to another floor's phone, carrying everything, as the stairs would. */
  function travel(game, levelId) {
    if (!LM.ui.modalOpen && game.state !== 'play') return;
    const P = game.player;
    game.setFlag('rotaryTravel');
    LM.audio.play('altar');
    const carry = P.serialize();
    LM.ui.closeAll();
    game.rotaryArrival = levelId;
    game.loadLevel(levelId, carry, false);
    game.state = 'play';
    game.flashT = 0.5;
  }

  // ------------------------------------------------------------ the phone
  const items = {
    'rotary-phone': {
      // props.counter: sits on a counter (no desk of its own); props.note: what the pop-up says first
      name: 'Red telephone', radius: 12, mapColor: '#e04a3a', mapAlways: true, reach: 10,
      init(it) {
        if (it.props.counter) {
          it.z = 1;
          it.y -= 6;
          it.solid = false;
        } else {
          it.solid = true;
          it.solidRadius = 12;
        }
      },
      interact: { available: () => true, prompt: (it, game) => (game.rotaryRing ? 'Answer the phone' : 'Pick up the red telephone'), use: (it, game) => openPhone(game, it) },
      update(it, dt, game) {
        if (!game.rotaryRing) return;
        game.rotaryRing.t += dt;
        game.rotaryRingNext -= dt;
        if (game.rotaryRingNext <= 0) {
          game.rotaryRingNext = 3;
          LM.audio.play('ring', { vol: Math.max(0.35, game.vol(it.x, it.y)) });
        }
      },
      draw(g, it, t, game) {
        // ringing: the whole phone jumps on its cradle
        if (game && game.rotaryRing && game.rotaryRing.t % 3 < 1.1) g.translate(Math.sin(t * 70) * 1.2, Math.cos(t * 55) * 0.8);
        if (!it.props.counter) {
          // its own little desk
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.beginPath();
          g.arc(2, 3, 13, 0, U.TAU);
          g.fill();
          g.fillStyle = '#5a3a24';
          g.beginPath();
          g.arc(0, 0, 13, 0, U.TAU);
          g.fill();
          g.fillStyle = '#7a5434';
          g.beginPath();
          g.arc(0, 0, 11, 0, U.TAU);
          g.fill();
        }
        // the phone: body, handset, dial, and a curl of cord
        g.fillStyle = '#7a1612';
        G.roundRect(g, -7, -5, 14, 11, 3);
        g.fill();
        g.fillStyle = '#c8281e';
        G.roundRect(g, -6.5, -5.5, 13, 10, 3);
        g.fill();
        g.fillStyle = '#e8e2d4';
        g.beginPath();
        g.arc(0, 0.5, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#3a0a08';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * U.TAU;
          g.beginPath();
          g.arc(Math.cos(a) * 2.5, 0.5 + Math.sin(a) * 2.5, 0.45, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#d83226';
        G.roundRect(g, -8, -9, 16, 4, 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.fillRect(-6, -8.6, 12, 0.8);
        g.strokeStyle = '#3a0a08';
        g.lineWidth = 0.7;
        g.beginPath();
        for (let i = 0; i < 4; i++) g.arc(8 + i * 1.6, 3 + (i % 2), 1, 0, Math.PI);
        g.stroke();
      },
      drawGlow(g, it, t, game) {
        if (game && game.rotaryRing) {
          const k = 0.5 + 0.5 * Math.sin(t * 9);
          G.glow(g, 0, -1, 30 + k * 26, '#ff3a2a', 0.35 + k * 0.4);
          g.strokeStyle = 'rgba(255,90,70,' + (1 - ((t * 1.2) % 1)) * 0.8 + ')';
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(0, 0, 10 + ((t * 1.2) % 1) * 40, 0, U.TAU);
          g.stroke();
          return;
        }
        G.glow(g, 0, -1, 12, '#ff4a3a', 0.12 + 0.06 * Math.sin(t * 1.3));
      },
    },
  };

  // ------------------------------------------------------------ one phone per floor
  LM.on('levelLoaded', (game) => {
    game.rotaryRing = null;
    const L = lineOf(game.levelId);
    if (!L || !game.level.inBounds(L.x, L.y)) return;
    const it = game.spawnItem('rotary-phone', L.x, L.y, { counter: !!L.counter, note: L.note });
    if (game.attract || !game.player) return;
    if (game.rotaryArrival === game.levelId && it) {
      // arrive standing just in front of the phone (below it if that's open floor, otherwise on it is fine)
      game.rotaryArrival = null;
      const P = game.player, lv = game.level;
      const spots = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 2], [1, 1], [-1, 1]];
      for (const [dx, dy] of spots) {
        const tx = L.x + dx, ty = L.y + dy;
        if (!lv.solidAt(tx, ty) && !lv.t(tx, ty).hazard && !lv.t(tx, ty).exit) {
          P.x = tx * T + T / 2;
          P.y = ty * T + T / 2;
          P.lastSafe = { x: P.x, y: P.y };
          game.cam.x = P.x;
          game.cam.y = P.y;
          break;
        }
      }
      game.toast('You’re standing next to a red telephone. The receiver is still swinging on its cord.', 'key');
    }
  });

  LM.definePack({ id: 'rotary', name: 'Rotary', version: '0.1.0', items });
})();
