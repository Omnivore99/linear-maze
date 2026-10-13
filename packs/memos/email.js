/* The Linear Maze — packs/memos/email.js
 * Memos pack, part 4: email, and the trouble Alice left behind.
 *
 * Your desk (the Office pack's `my-desk`) gains a "Check email" action. The
 * inbox shows the emails listed for the current floor in MEMOS.inboxes; an
 * email is { id, from, subject, points, body(game) -> [paragraphs or nodes], onRead(game) }.
 *
 * Alice quit yesterday. Her goodbye to Bob arrives as a substitution cipher.
 * Her old desk (item `alice-desk`) holds her "one-time pad" (the plaintext,
 * written down, which is not how one-time pads work) and Bob's private key
 * (an actual key). Reading the email and finding the pad, in either order,
 * decrypts it.
 *
 * Story flags this file sets (they carry between floors):
 *   emailTPS         read the compiled TPS report
 *   emailAlice       read Alice's goodbye
 *   alicePad         took the pad from Alice's desk
 *   bobKey           took Bob's private key
 *   aliceDecrypted   has both the email and the pad: you know what she meant
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const MEMOS = LM.MEMOS;
  const h = (...a) => LM.ui.h(...a);

  // ------------------------------------------------------------ the cipher
  MEMOS.PLAINTEXT = 'The Jabberwock, with eyes of flame, came whiffling through the tulgey wood, and burbled as it came.';
  // plain a..z  ->  cipher letters (a fixed shuffle of the alphabet)
  MEMOS.CIPHER_KEY = 'QWHMZRYGLOXTKAPCJFDESUBNIV';
  MEMOS.encrypt = function (text) {
    return text.toUpperCase().replace(/[A-Z]/g, (c) => MEMOS.CIPHER_KEY[c.charCodeAt(0) - 65]);
  };
  MEMOS.CIPHERTEXT = MEMOS.encrypt(MEMOS.PLAINTEXT);
  /** Letters only, lower case: what a guess is compared on. */
  MEMOS.letters = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  /** 0..1, how close a guess is to the plaintext (edit distance on letters). */
  MEMOS.closeness = function (guess) {
    const a = MEMOS.letters(guess), b = MEMOS.letters(MEMOS.PLAINTEXT);
    if (!a.length) return 0;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return Math.max(0, 1 - prev[b.length] / b.length);
  };

  // ------------------------------------------------------------ styles
  LM.ui.addStyles(`
    .mail { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .mail-list { display: grid; gap: 4px; }
    .mail-row { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid #1e3550; background: #0b1420; color: #cfe2f6; text-align: left; cursor: pointer; font: 400 13px/1.35 var(--font-ui); }
    .mail-row:hover, .mail-row:focus-visible { border-color: #5c9ad8; outline: none; }
    .mail-row strong { display: block; font-weight: 600; color: #e8f2ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mail-row span { display: block; color: #8fb0d0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mail-row i { width: 8px; height: 8px; border-radius: 50%; background: #5cc8e8; }
    .mail-row.read i { background: transparent; }
    .mail-row.read strong { font-weight: 400; color: #b8cce0; }
    .mail-row em { font: 400 11px var(--font-ui); color: #6f8fb0; font-style: normal; }
    .mail-read { padding: 12px 14px; border: 1px solid #1e3550; background: #0b1420; color: #d6e6f6; font: 400 13.5px/1.55 var(--font-ui); max-height: min(52vh, 460px); overflow-y: auto; }
    .mail-read .hdr { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #1e3550; color: #8fb0d0; font-size: 12px; }
    .mail-read .hdr b { color: #e8f2ff; font-weight: 600; }
    .mail-read p { margin: 0 0 10px; white-space: pre-line; }
    .mail-read pre { margin: 0 0 10px; padding: 10px; background: #060c14; border: 1px dashed #2c4a6a; color: #9fe0b0; font: 400 12.5px/1.5 var(--font-ui); white-space: pre-wrap; word-break: break-word; }
    .mail-read pre.cipher { color: #ffd08a; letter-spacing: 0.06em; }
    .mail-aha { margin: 4px 0 12px; padding: 10px 12px; border-left: 3px solid var(--good); background: rgba(143,224,160,0.08); color: #e8f6ea; font: italic 400 16px/1.45 var(--font-lore); }
    .pad { width: min(320px, 100%); box-sizing: border-box; margin: 4px auto 12px; padding: 14px 16px 18px; background: repeating-linear-gradient(#fbf8ec 0 21px, #a8c4e0 21px 22px); border-top: 14px solid #c8302a; color: #1c2a6a; font: italic 400 16px/22px var(--font-lore); transform: rotate(0.8deg); box-shadow: 0 10px 22px rgba(0,0,0,0.45); }
    .pad small { display: block; font: 600 10px/1.4 var(--font-ui); font-style: normal; letter-spacing: 0.1em; text-transform: uppercase; color: #8a2a2a; }
    .guess { display: grid; gap: 8px; }
    .guess textarea { width: 100%; box-sizing: border-box; min-height: 84px; padding: 10px; border: 1px solid var(--line-strong); background: #0b0d12; color: var(--bone); font: 400 14px/1.45 var(--font-ui); resize: vertical; }
  `);

  // ------------------------------------------------------------ the emails
  const TPS_REPORT = [
    'TESTING PROCEDURE SPECIFICATION (TPS) REPORT: COMPILED',
    'Cover sheet .................. ATTACHED (the new one)',
    'Prepared for ................. Dana Whitlock, Director of Operations',
    'Period ....................... Week 41',
    '',
    'Procedures tested ............ 112',
    'Procedures passed ............ 112',
    'Procedures that tested us .... 1',
    'Open issues .................. 1: room booking “LINEAR” (recurring, no organizer, no end date)',
    '',
    'Status ....................... COMPILED. Ready for the status meeting.',
  ].join('\n');

  const EMAILS = (MEMOS.emails = {
    tps: {
      from: 'TPS Reporting <noreply@meridian-group.com>', subject: 'TPS report, week 41 (compiled)', points: 50, flag: 'emailTPS',
      body: (game) => [
        'Your TPS report for week 41 has been compiled automatically from the work you did this week. Please bring it to the status meeting.',
        h('pre', null, TPS_REPORT),
        MEMOS.honest(game)
          ? 'Reminder: all TPS reports must carry the new cover sheet. There is no memo about the cover sheet. There has never been a memo. There is only the cover sheet.'
          : 'Reminder: all TPS reports now carry the new cover sheet. A memo about this went out. You probably got it.',
        h('p', { class: 'muted' }, 'Status: ready. You have it now, whatever that means for an email.'),
      ],
    },
    alice: {
      from: 'Alice Ng <alice.ng@meridian-group.com>', subject: 'goodbye (attempt 4)', points: 25, flag: 'emailAlice',
      body: (game) => [
        'Hi!',
        'As you know, yesterday was my last day. (Not my choice. Well. Mostly my choice.) I’ve been trying to send my goodbye to Bob all morning, but every time it goes through, it comes out jumbled. I think it’s my encryption plug-in. I set it to MAXIMUM SECURITY and it picked a substitution cipher, which is like picking a screen door for a submarine.',
        'Here’s what Bob gets on his end:',
        h('pre', { class: 'cipher' }, MEMOS.CIPHERTEXT),
        'Before that I tried ROT13, and then I ran it through ROT13 again to be twice as safe. Bob said the message arrived perfectly readable and that this was “the problem.”',
        'Embarrassing part: I still have Bob’s private key. Not a copy. The key. I know a private key is supposed to stay private, which is why I’ve been keeping it extremely private, in my desk drawer. He hasn’t been able to read any of his encrypted mail since Tuesday. Could you give it back to him? He’ll be in the server room. He is always in the server room.',
        'I left my one-time pad on my desk, too. I only used it once! (That’s the rule.) What I meant to say is written on it. Don’t tell Bob I wrote it down; he’ll give me the talk about key hygiene again.',
        'Tell Eve I said hi. She’ll know. She always knows.',
        '— Alice',
        h('p', { class: 'muted' }, 'P.S. If anyone asks, I did not exchange keys with Bob over an insecure channel. It was the break room.'),
        aha(game),
      ],
      onRead: (game) => checkDecrypt(game),
    },
    // ---- Chessboard 1 only
    tasks: {
      from: 'Dana Whitlock <dana.whitlock@meridian-group.com>', subject: 'Today’s tasks!! (mandatory) :)', points: 25,
      body: () => [
        'Morning, superstar! Three tiny things before end of day. End of day is 5:00. End of day is non-negotiable. End of day is coming.',
        h('pre', null, [
          'TASK 1  Status meeting. Zeno’s Paradox (the conference room in the middle).',
          '        Bring the compiled TPS report. Be caught up on your email.',
          '        I will ask about Alice’s goodbye. Bob is beside himself.',
          '',
          'TASK 2  Run the daily report module. Server room, east side.',
          '        Through the new door past reception. Follow the arrows.',
          '        All of them. In order. The arrows know.',
          '',
          'TASK 3  Mandatory Workplace Surveillance Training (formerly',
          '        Cybersecurity). Brenda, in the Training Room (formerly',
          '        the Quiet Room, formerly a quiet room).',
        ].join('\n')),
        'You’ll need tasks 1 and 3 done before IT will let you near the daily report. IT is very particular. IT has a lot of feelings right now.',
        'Love the energy. See you in the meeting. Everybody will be there. Nobody will leave early. :)',
        '— D',
      ],
    },
    bounty: {
      from: 'Corporate Security <eyes@meridian-group.com>', subject: 'RE: RE: RE: mouse movers', points: 25,
      body: () => [
        'Team,',
        'It has come to our attention that some employees are using “mouse movers” to simulate productivity. We would like to thank those employees, because the bounty program has never been more fun.',
        'Current bounty: 500 gold per confirmed device. A further bonus for the hand. Please do not bring us the whole employee. We have nowhere to put them anymore.',
        'Your cursor has moved 0.0 inches in the last nine seconds. We noticed.',
        '— Security (we are behind you)',
      ],
    },
    training: {
      from: 'Brenda Okafor <people@meridian-group.com>', subject: 'You have been selected!', points: 25,
      body: () => [
        'Congratulations! You have been selected for Mandatory Workplace Surveillance Training.',
        'Training takes place in the Training Room (formerly the Quiet Room). It takes about five minutes, or the rest of your life, whichever comes first.',
        'Please bring a pencil, an open mind, and the passwords of three coworkers.',
        'Warmly (we keep the thermostat at 82),\nBrenda, People & Culture (emphasis on Culture, as in a petri dish)',
      ],
    },
    bob: {
      from: 'Bob Sato (SYSADMIN) <root@meridian-group.com>', subject: '[ENCRYPTED] PLEASE', points: 25,
      body: () => [
        h('pre', { class: 'cipher' }, '-----BEGIN PGP MESSAGE-----\nhQEMA9...ERROR: PRIVATE KEY NOT FOUND\nCANNOT DECRYPT. CANNOT DECRYPT. CANNOT DECRYPT.\n-----END PGP MESSAGE-----'),
        'This is Bob. I am writing this in plaintext, which I want everyone to understand is costing me something.',
        'Someone has my private key. I have not read an encrypted email since Tuesday. I am in the server room. I am not coming out. I have grown. You will see how I have grown.',
        'If you have my key, bring it. If you do not have my key, do not come.',
        '— B',
      ],
    },
  });

  /** Which emails are in the inbox on which floor (by level id; '*' for any other floor). */
  /** The pop-up's kicker, per floor (the laptop at home isn't workstation 14-112). */
  MEMOS.inboxKickers = {};
  MEMOS.inboxes = {
    'meridian-fourteen': ['tps', 'alice'],
    '*': ['tps', 'alice'],
  };

  // ------------------------------------------------------------ decrypting Alice
  function aha(game) {
    if (!game.hasFlag('alicePad')) return null;
    return h('div', { class: 'mail-aha' }, 'You hold the notepad from Alice’s desk up next to the screen. Oh! That’s what she meant!', h('br'), h('br'), '“' + MEMOS.PLAINTEXT + '”');
  }
  function checkDecrypt(game) {
    if (game.hasFlag('aliceDecrypted') || !game.hasFlag('alicePad') || !game.hasFlag('emailAlice')) return false;
    game.setFlag('aliceDecrypted');
    MEMOS.award(game, 'email', 'decrypted', 100);
    game.toast('Alice’s message, decrypted. Oh! That’s what she meant!', 'key');
    return true;
  }
  MEMOS.checkDecrypt = checkDecrypt;

  // ------------------------------------------------------------ the inbox
  MEMOS.openInbox = function (game, openId) {
    const list = MEMOS.inboxes[game.levelId] || MEMOS.inboxes['*'];
    const unread = list.filter((id) => !MEMOS.seen(game, 'email', id)).length;
    if (openId) {
      const em = EMAILS[openId];
      MEMOS.award(game, 'email', openId, em.points);
      if (em.flag) game.setFlag(em.flag);
      if (em.onRead) em.onRead(game);
      const parts = em.body(game).filter(Boolean).map((p) => (typeof p === 'string' ? h('p', null, p) : p));
      return LM.ui.open({
        kicker: MEMOS.inboxKickers[game.levelId] || 'Workstation 14-112 · Mail',
        title: em.subject,
        wide: true,
        body: h('div', { class: 'mail-read' }, h('div', { class: 'hdr' }, 'From: ', h('b', null, em.from), h('br'), 'To: you'), parts),
        actions: [
          { label: 'Back to inbox', primary: true, key: 'E', onClick: () => { setTimeout(() => MEMOS.openInbox(game), 0); } },
          { label: 'Log off', quiet: true },
        ],
      });
    }
    const rows = list.map((id) => {
      const em = EMAILS[id], read = MEMOS.seen(game, 'email', id);
      const b = h('button', { class: 'mail-row' + (read ? ' read' : ''), type: 'button' },
        h('i'), h('span', null, h('strong', null, em.subject), h('span', null, em.from.replace(/\s*<.*>/, ''))), h('em', null, read ? 'read' : 'new'));
      b.addEventListener('click', () => {
        LM.audio.play('ui');
        MEMOS.openInbox(game, id);
      });
      return b;
    });
    LM.ui.open({
      kicker: MEMOS.inboxKickers[game.levelId] || 'Workstation 14-112 · Mail',
      title: 'Inbox (' + unread + ' unread)',
      wide: true,
      body: h('div', { class: 'mail' }, h('div', { class: 'mail-list' }, rows),
        h('p', { class: 'muted' }, MEMOS.honest(game) ? 'The screen is a little too bright. The cursor blinks in time with something.' : 'Everything else is newsletters. You can tell from the subject lines.')),
      actions: [{ label: 'Log off', primary: true }],
    });
  };

  // ------------------------------------------------------------ hook: your desk gets "Check email"
  /**
   * Add actions to another pack's item pop-up without editing that pack:
   * while its use() runs, the next LM.ui.open() call gets extra actions,
   * placed before the last (quiet) one.
   */
  MEMOS.addActions = function (itemId, extra) {
    const def = LM.find('items', itemId);
    if (!def || !def.interact || def.interact.memosHooked) return;
    const orig = def.interact.use;
    def.interact.memosHooked = true;
    def.interact.use = function (it, game) {
      const open = LM.ui.open;
      LM.ui.open = function (spec) {
        LM.ui.open = open;
        const more = extra(it, game) || [];
        const acts = (spec.actions || []).slice();
        const at = acts.length && acts[acts.length - 1].quiet ? acts.length - 1 : acts.length;
        acts.splice(at, 0, ...more);
        return open(Object.assign({}, spec, { actions: acts }));
      };
      try {
        return orig.call(this, it, game);
      } finally {
        LM.ui.open = open;
      }
    };
  };
  MEMOS.addActions('my-desk', (it, game) => {
    const list = MEMOS.inboxes[game.levelId] || MEMOS.inboxes['*'];
    const unread = list.filter((id) => !MEMOS.seen(game, 'email', id)).length;
    return [{ label: 'Check email' + (unread ? ' (' + unread + ')' : ''), onClick: () => { setTimeout(() => MEMOS.openInbox(game), 0); } }];
  });

  // ------------------------------------------------------------ Alice's old desk
  const ROT = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };
  const items = {
    'alice-desk': {
      // sits on top of an ordinary desk: a nameplate, a box of her things, the pad (until taken)
      name: 'Alice’s old desk', radius: 10, z: 1, shadow: false, mapColor: '#f08a7a',
      interact: {
        available: () => true,
        prompt: (it, game) => (game.hasFlag('alicePad') ? 'Alice’s old desk' : 'Search Alice’s old desk'),
        use(it, game) {
          const took = game.hasFlag('alicePad');
          const body = [
            'A nameplate: ALICE NG, SECURITY ENGINEER. Someone has already put a strip of tape over ALICE. A cardboard box of her things: a mug that says I ♥ PRIME NUMBERS, a cactus, a framed photo of Alice and Bob in front of a whiteboard covered in arrows.',
            took
              ? 'The desk drawer is empty now. Just a faint smell of whiteboard marker.'
              : 'In the drawer, a notepad. On the cover, in Sharpie: ONE-TIME PAD (USED ONCE! DO NOT REUSE!!). Under it, on a lanyard, a heavy brass key with a paper tag: BOB — PRIVATE.',
          ];
          if (!took) body.push(h('div', { class: 'pad' }, h('small', null, 'One-time pad · page 1 of 1'), MEMOS.PLAINTEXT));
          const actions = [];
          if (!took) {
            actions.push({
              label: 'Take the pad and the key', primary: true, key: 'E',
              onClick: () => {
                game.setFlag('alicePad');
                game.setFlag('bobKey');
                LM.audio.play('key');
                game.toast('You take Alice’s notepad and Bob’s private key (a real key).', 'key');
                if (game.hasFlag('emailAlice')) {
                  setTimeout(() => {
                    checkDecrypt(game);
                    LM.ui.open({
                      kicker: 'Alice’s one-time pad',
                      title: 'Oh! That’s what she meant!',
                      body: h('div', { class: 'lore-block' },
                        h('p', { class: 'lore' }, 'The gibberish in her email, and this, letter for letter. She didn’t encrypt her goodbye. She encrypted a poem.'),
                        h('div', { class: 'pad' }, h('small', null, 'Decrypted'), MEMOS.PLAINTEXT),
                        h('p', { class: 'lore' }, 'Which is, if you think about it, the most Alice way to say goodbye to Bob.')),
                      actions: [{ label: 'Pocket it', primary: true }],
                    });
                  }, 0);
                } else game.toast('A poem? Maybe Alice left an email explaining it.', '');
              },
            });
          }
          actions.push({ label: 'Leave it', quiet: true, primary: took });
          LM.ui.open({
            kicker: 'Workstation 14-113',
            title: 'Alice’s old desk',
            body: h('div', { class: 'lore-block' }, body.map((b) => (typeof b === 'string' ? h('p', { class: 'lore' }, b) : b))),
            actions,
          });
        },
      },
      draw(g, it, t, game) {
        g.rotate(ROT[it.props.dir || 's'] || 0);
        // cardboard box of her things
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-13, -12, 10, 8);
        g.fillStyle = '#b8905a';
        g.fillRect(-14, -13, 10, 8);
        g.strokeStyle = '#8a6a3a';
        g.lineWidth = 0.6;
        g.strokeRect(-14, -13, 10, 8);
        g.fillStyle = '#4a8a3a';
        g.beginPath();
        g.arc(-11, -10, 1.6, 0, U.TAU);
        g.fill();
        // nameplate with a strip of tape
        g.fillStyle = '#2a2a30';
        g.fillRect(-3, 0, 9, 2.4);
        g.fillStyle = '#e8e2c8';
        g.fillRect(-2.4, 0.3, 4, 1.8);
        // the pad, until it's taken
        if (!game || !game.hasFlag || !game.hasFlag('alicePad')) {
          g.fillStyle = '#c8302a';
          g.fillRect(6, -10, 6, 1.6);
          g.fillStyle = '#fbf8ec';
          g.fillRect(6, -8.4, 6, 6.4);
          g.fillStyle = '#a8c4e0';
          for (let i = 0; i < 3; i++) g.fillRect(6.6, -7 + i * 1.8, 4.8, 0.4);
        }
      },
      drawGlow(g, it, t, game) {
        if (game && game.hasFlag && game.hasFlag('alicePad')) return;
        g.rotate(ROT[it.props.dir || 's'] || 0);
        G.glow(g, 9, -5, 9, '#f4dc6c', 0.25 + 0.15 * Math.sin(t * 3));
      },
    },
  };

  LM.definePack({ id: 'memos', items });
})();
