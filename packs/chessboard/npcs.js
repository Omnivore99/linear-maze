/* The Linear Maze — packs/chessboard/npcs.js
 * Chessboard pack, part 3: the people of Chessboard 1.
 *
 * Everyone from the 14th floor is here, and looks exactly the same: each
 * definition starts from the Office pack's (real(id, changes)), keeps the
 * look, and replaces what they say and do. On this level of reality they are
 * the real versions of themselves: goofy, sinister, sometimes violent. They
 * regenerate, so they don't mind much.
 *
 * New people: Dana's meeting attendees, Brenda's training, Alan alone, three
 * union brooms, the lost employees of the east wing, Kevin the technician,
 * and Bob, the SYSADMIN.
 *
 * Story flags read here:
 *   tookSalmon       (14th floor) Priya knows. Priya has a fork.
 *   bobKey           you have Bob's private key (from Alice's desk)
 *   cb_t1 / cb_t3    status meeting done / training done (Kevin lets you through)
 *   cb_bobAppeased   you gave Bob his key
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const has = (game, f) => game.hasFlag(f);
  const bye = (label) => ({ label: label || 'Never mind.', end: true });
  const back = (label) => ({ label: label || 'Something else.', next: 'menu' });
  /** Start from an Office pack person: same look, new everything else. */
  function real(id, over) {
    const b = LM.get('npcs', id);
    return Object.assign({}, b, over, { look: Object.assign({}, b.look, over.look || {}) });
  }
  const CB = (LM.CHESSBOARD = LM.CHESSBOARD || {});

  // ------------------------------------------------------------ the front desk
  const marisolOpts = () => [
    { label: 'What is this place?', next: 'what', once: true },
    { label: 'Where is the status meeting?', next: 'meeting' },
    { label: 'Can I pick up line four?', next: 'line4', once: true },
    { label: 'Is anything here dangerous?', next: 'danger', once: true },
    bye('Hang in there, Marisol.'),
  ];
  const receptionist = real('receptionist', {
    barks: [
      'Meridian Group, please hold. Forever.',
      'Line four is breathing again. Line four is always breathing.',
      'I have been holding since 1987.',
      'Parking validation? Ha. Ha ha. Ha.',
      'I’m not a receptionist, hon. I’m a containment protocol.',
    ],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: { mood: 'smile', text: ['Oh! You’re back. Of course you’re back. Everybody comes back to fourteen.', 'Welcome to Meridian Group. The real one. The other one was the brochure.'], options: marisolOpts },
        menu: { mood: 'tired', text: ['Still holding. What do you need, sweetheart?'], options: marisolOpts },
        what: {
          text: ['It’s the fourteenth floor. Same as always. Just one floor further down than the fourteenth floor goes.', 'Everything here means what it says. The posters. The notices. Dana. Especially Dana.'],
          options: [back(), bye()],
        },
        meeting: {
          text: ['Zeno’s Paradox. The middle conference room. You get halfway to the door, then halfway again, then— kidding! It’s right up the hall.', 'The meeting never ends, but it does start. Read your email first. Trust me. Dana asks.'],
          options: [back(), bye()],
        },
        line4: {
          mood: 'wide',
          do: () => LM.audio.play('locked'),
          text: ['(She hands you the receiver.)', 'Water dripping. Very far down. Then, close to the mouthpiece: “You’re on time. That’s new.”', '(Line four stays lit. It has always been lit.)'],
          options: [back(), bye()],
        },
        danger: {
          mood: 'tired',
          text: ['Everything, hon. But in order: Dana’s meeting, the supply closet, and the server room.', 'Don’t go into the supply closet. Not without a requisition form. Not with one, either. Gertrude doesn’t read them.'],
          options: [back(), bye()],
        },
      },
    },
  });

  // ------------------------------------------------------------ Dana, with the meeting pistol
  const dana = real('boss', {
    behavior: 'stand', face: 'w', mood: 'smile',
    barks: ['Status meeting! Zeno’s! Now-ish!', 'I brought the meeting pistol. It’s for meetings.', 'Love that energy. Hate that energy. Depends on the report.', 'Everybody gets a turn!'],
    flashBarks: ['For the newsletter? Get my gun side.'],
    dialog: {
      start: (game) => (has(game, 'cb_t1') ? 'after' : 'before'),
      nodes: {
        before: {
          text: ['Hey! You’re here! We’ll do your update when we go around the room. Everybody gets a turn.', '(She pats the pistol.) Exactly one turn.'],
          options: [bye('Can’t wait.')],
        },
        after: {
          text: ['Great meeting! Very productive. Very few survivors.', 'Now: the daily report module. Server room, east side, through the door past reception. Follow the arrows. All of them.', 'And the training. Brenda gets cranky.'],
          options: [bye('On it.')],
        },
      },
    },
    draw(g, n, t) {
      G.person(g, n, t);
      // G.person leaves the context turned to face where she faces: the pistol is in her right hand
      g.fillStyle = '#1a1a1e';
      g.fillRect(7.5, 4.6, 7.5, 2.4);
      g.fillRect(8, 6.2, 2, 2.6);
    },
  });

  // ------------------------------------------------------------ the cantina
  const priya = real('priya', {
    barks: (n, game) => has(game, 'tookSalmon')
      ? ['You. The salmon thief.', 'I sharpened this fork for you.', 'Gary told me. Gary tells everyone everything.']
      : ['Nobody has taken my lunch today. Do you know why?', 'I labeled my lunch. Then I labeled the thief.', 'There’s a bear trap. It’s in the fridge. Don’t open the fridge.'],
    dialog: {
      start: (game) => (has(game, 'tookSalmon') ? 'thief' : 'hello'),
      nodes: {
        hello: {
          mood: 'smile',
          text: ['Nobody has stolen my lunch today. Do you know why?', '(She gestures at the counter: a blue lunchbox, set inside a bear trap.)', 'Gary tried at nine. Gary is in the restroom now, thinking about his choices. Gary will regenerate.'],
          options: [bye('Good for you, Priya.')],
        },
        thief: {
          mood: 'annoyed',
          text: ['(She is holding a fork like a dagger.)', 'Gary told me about the salmon. Gary tells everyone everything. It was fish, so I’m not mad. I’m just going to stab you a little.'],
          options: [
            { label: 'It was a moment of weakness.', next: 'stab' },
            bye('(Back away slowly.)'),
          ],
        },
        stab: {
          mood: 'smile',
          do: (game) => {
            LM.combat.hurt(game, game.player, 10, { source: 'enemy', type: 'melee' });
            game.toast('Priya stabs you with a fork. It is very personal.', 'warn');
          },
          text: ['So is this.', '(She wipes the fork on a napkin.) There. Now we’re even. Now we’re friends.'],
          options: [bye('…Friends.')],
        },
      },
    },
    update(n, dt, game) {
      // the salmon thief gets forked if they stand too close
      n.mem.fork = (n.mem.fork || 0) - dt;
      const P = game.player;
      if (!P || P.dead || !has(game, 'tookSalmon') || n.mem.fork > 0) return;
      if (n.distP < n.r + P.r + 8 && n.seeLos) {
        n.mem.fork = 2.2;
        n.say('THIEF.', 1.4);
        LM.combat.hurt(game, P, 6, { kx: (P.x - n.x) * 4, ky: (P.y - n.y) * 4, source: 'enemy', type: 'melee' });
      }
    },
  });
  const gary = real('gary', {
    barks: ['It’s not salmon. It’s never been salmon.', 'The microwave has said 3:47 since the Carter administration.', 'Closed nine deals before nine. Closed them FOREVER.', 'Don’t open the microwave. It’s moving.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: ['Hey, buddy. Don’t open the microwave.', '(Something inside the microwave knocks, politely, three times.)', 'That’s my lunch. It’s fine. It’s a healthy lunch. People need to relax about my lunch.'],
          options: [{ label: 'What is it?', next: 'what' }, bye('Enjoy it, Gary.')],
        },
        what: {
          mood: 'wide',
          text: ['It was salmon. Then it was in there a while. It’s in sales now. It’s doing better than me.'],
          options: [bye()],
        },
      },
    },
  });
  const tomas = real('tomas', {
    barks: ['I can see your screen. I can see every screen.', 'The Wi-Fi works perfectly. The people are buggy.', 'Bob hasn’t been a shape since Tuesday.', 'Have you tried turning yourself off and on again?'],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: { text: ['Hey. I can see your screen. I can see every screen. I’ve seen your search history and I want you to know I’m not judging. I’m logging.'], options: () => tomasOpts() },
        menu: { text: ['What’s broken? Besides everything.'], options: () => tomasOpts() },
        bob: {
          mood: 'wide',
          text: [
            'Bob’s our sysadmin. Bob is in the server room. Bob has been in the server room since Alice quit, and since then Bob has… gotten bigger. Long arms. Cables.',
            'He can’t read his encrypted mail. Alice has his private key. Had. Somebody has it.',
            'Tip: he only moves when you move. Freeze, and he freezes. And he’s too big for the gaps between the racks. I’m not. I’m very slim. I fit everywhere. That’s how I see every screen.',
          ],
          options: [back(), bye()],
        },
        arrows: {
          text: ['The server room isn’t on any map. You get there by following the arrows. All of them, in order, all the way around.', 'It’s security through obscurity. Bob hates it. Bob set it up.'],
          options: [back(), bye()],
        },
      },
    },
  });
  const tomasOpts = () => [
    { label: 'What’s the deal with Bob?', next: 'bob', once: true },
    { label: 'How do I get to the server room?', next: 'arrows', once: true },
    bye(),
  ];

  // ------------------------------------------------------------ the open plan
  const kenji = real('kenji', {
    barks: ['Mm-hm. Mm-hm. No, I’m on mute. I’ve been on mute since 1994.', 'Can you all see my screen? Can you all see my soul?', 'Q3 is fine. Q3 is always fine. Q3 is a loop.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: ['(He pulls out one earbud.) Sorry, I’m on a call. It’s my birthday. It’s always my birthday.', 'There’s cake in the Cantina at three. There’s always cake at three. I’ve stopped liking cake.'],
          options: [{ label: 'Who are you on the call with?', next: 'call' }, bye('Happy birthday, Kenji.')],
        },
        call: { mood: 'tired', text: ['Myself, in 1994. He’s doing great. He hasn’t heard about Q3.'], options: [bye()] },
      },
    },
  });
  /** Generic coworker: their honest lines come in through placement props (lines, truth). */
  const coworker = real('coworker', {
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: (g, n) => n.props.lines || ['(They give you the polite half-smile of someone who has been mid-sentence since 2016.)'],
          options: [{ label: 'What do you actually do here?', next: 'truth', once: true }, bye('Sorry to bother you.')],
        },
        truth: { mood: 'tired', text: (g, n) => n.props.truth || ['Same as you. Exactly the same as you.'], options: [bye()] },
      },
    },
  });
  const sam = real('sam', {
    barks: ['I’m the intern. I’ve been the intern for four hundred years.', 'Nobody tells interns anything. That’s how they keep us young.', 'Does my badge work on that door? No door works for interns.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: (g) => [
            g.hasFlag('samComing') ? 'You came back! I said I’d come with you, and then I didn’t, and then I was here anyway. That’s how it works for interns.' : 'Oh, hi! Are you new? You look new. Everyone looks new to me. I’ve been here four hundred years.',
            'Want some advice from the longest-serving intern in history? Read every email. Dana asks about the emails.',
          ],
          options: [bye('Thanks, Sam.')],
        },
      },
    },
  });
  const alan = real('presenter', {
    behavior: 'stand', face: 'n',
    barks: ['Agreed.', 'Let’s take that offline. Agreed. Offline.', 'Next slide, Alan. Thank you, Alan.', 'I want us to sit with that. I am sitting with that.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          mood: 'annoyed',
          text: ['I’m in a meeting.', '(He is alone in his office.)', 'With me. It’s going very well. I’m winning.'],
          options: [{ label: 'Who’s winning?', next: 'who' }, bye('Sorry. Wrong office.')],
        },
        who: { mood: 'tired', text: ['Alan is. The other Alan is a tough negotiator, but he doesn’t have my synergy.'], options: [bye()] },
      },
    },
  });

  // ------------------------------------------------------------ Brenda: Task 3, Mandatory Workplace Surveillance Training
  const QUIZ = [
    {
      q: 'Question one. A coworker looks away from their screen for ten seconds. You:',
      a: [
        { label: 'Report them.', ok: true, say: 'Correct! You’ve earned a gold star. The gold star is a tracking device.' },
        { label: 'Ask if they’re okay.', say: 'Incorrect. Empathy is a security vulnerability. Let’s try that again.' },
        { label: 'Look away too, in solidarity.', say: 'Incorrect. We’ve logged your solidarity. Again!' },
      ],
    },
    {
      q: 'Question two. The little light beside your webcam is off. This means:',
      a: [
        { label: 'The camera is off.', say: 'Adorable. Incorrect. Again.' },
        { label: 'The camera is on, and the light is decorative.', ok: true, say: 'Correct! The light is a mood light. Its mood is “watching.”' },
        { label: 'I’m free.', say: 'Nobody is free. That’s on page one of the handbook. It’s the only page. Again.' },
      ],
    },
    {
      q: 'Final question. Who is watching you right now?',
      a: [
        { label: 'Nobody.', say: 'Incorrect, and a little hurtful. Again.' },
        { label: 'Security.', say: 'Partial credit, which is no credit. Again.' },
        { label: 'Everyone. Always. Including you.', ok: true, say: 'A perfect score! I’m so proud. I’ve been watching you be proud.' },
      ],
    },
  ];
  function quizNodes() {
    const nodes = {};
    QUIZ.forEach((step, i) => {
      nodes['q' + i] = {
        mood: 'smile',
        text: [step.q],
        options: step.a.map((a, k) => ({ id: 'q' + i + '-' + k, label: a.label, next: (a.ok ? 'r' : 'w') + i + '-' + k })),
      };
      step.a.forEach((a, k) => {
        nodes[(a.ok ? 'r' : 'w') + i + '-' + k] = {
          mood: a.ok ? 'smile' : 'annoyed',
          text: [a.say],
          options: [a.ok ? { label: i < QUIZ.length - 1 ? 'Next question.' : 'Am I done?', next: i < QUIZ.length - 1 ? 'q' + (i + 1) : 'pass' } : { label: 'Try again.', next: 'q' + i }],
        };
      });
    });
    return nodes;
  }
  const brenda = real('brenda', {
    behavior: 'stand', face: 's',
    barks: ['Human Resources. Emphasis on Resources.', 'Training is mandatory. So is everything else.', 'Smile! The camera likes it when you smile.', 'Wellness Wednesday is every day now.'],
    dialog: {
      start: (game) => (has(game, 'cb_t3') ? 'done' : 'hello'),
      nodes: Object.assign({
        hello: {
          mood: 'smile',
          text: ['Welcome to Mandatory Workplace Surveillance Training! Formerly Cybersecurity. Formerly the Quiet Room. Formerly quiet.', 'Three questions. Wrong answers are forwarded to your manager, who is armed. Ready?'],
          options: [{ label: 'Ready.', next: 'q0' }, bye('Not yet.')],
        },
        pass: {
          mood: 'smile',
          do: (game) => CB.completeTask(game, 3),
          text: ['Congratulations! You are now certified to be watched.', '(She hands you a certificate. It is warm, as though it has just been printed, or just been alive.)'],
          options: [bye('Thank you, Brenda.')],
        },
        done: {
          mood: 'smile',
          text: ['You’re certified! I can see you’re certified. I can see everything about you.', 'Go on. Your manager’s waiting. Your manager is always waiting.'],
          options: [bye()],
        },
      }, quizNodes()),
    },
  });

  // ------------------------------------------------------------ the meeting's attendees
  // name, role, report, verdict come in through placement props (see the level's objectLegend)
  const attendee = real('attendee', {
    barks: ['(whispers) Don’t make eye contact with the pistol.', '(nods very fast)', '(updates their will)', '(practices their report under their breath)'],
    draw(g, n, t, game) {
      // whoever Dana skips is still regenerating from last time: not all there yet
      if (n.props.skip && game && !game.hasFlag('cb_t1')) g.globalAlpha *= 0.4 + 0.1 * Math.sin(t * 6);
      G.person(g, n, t);
    },
    dialog: {
      start: (game, n) => (n.mem.regen ? 'back' : 'hello'),
      nodes: {
        hello: { mood: 'wide', text: ['(They whisper.) Don’t. Make. Eye contact.', '(They glance at Dana. Dana glances at the pistol.)'], options: [bye('(Back away.)')] },
        back: { mood: 'smile', text: (g, n) => ['Regenerated! Fresh as a daisy. Did I miss anything?', n.props.after || 'Next week I’m bringing a better report. Or a helmet.'], options: [bye()] },
      },
    },
  });

  // ------------------------------------------------------------ the brooms, on strike
  function drawBroom(g, n, t) {
    g.rotate(Math.sin(n.t * 2 + n.home.x) * 0.15);
    g.strokeStyle = '#8a6a3a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -16);
    g.lineTo(0, 2);
    g.stroke();
    g.fillStyle = '#c8a050';
    g.beginPath();
    g.moveTo(-6, 2);
    g.lineTo(6, 2);
    g.lineTo(8, 10);
    g.lineTo(-8, 10);
    g.closePath();
    g.fill();
    g.strokeStyle = '#8a6a2a';
    g.lineWidth = 0.6;
    for (let i = -6; i <= 6; i += 2) {
      g.beginPath();
      g.moveTo(i * 0.8, 3);
      g.lineTo(i, 10);
      g.stroke();
    }
    // little eyes on the binding
    g.fillStyle = '#f4f1ea';
    g.fillRect(-3, 2.6, 2, 2);
    g.fillRect(1, 2.6, 2, 2);
    g.fillStyle = '#111';
    g.fillRect(-2.4, 3.2, 1, 1);
    g.fillRect(1.6, 3.2, 1, 1);
  }
  const broom = {
    name: 'Broom', role: 'Facilities (on strike)', behavior: 'stand', radius: 7, mood: 'neutral', ignoresPlayer: true,
    look: { bg: '#3a2a14' },
    barks: ['We’re on break.', 'Union rules: we only sweep under rugs.', 'Solidarity forever. Dustpans never.', 'The dustpan is in a better place now.', 'Sweep your own hall.'],
    barkMin: 5, barkMax: 10,
    draw: drawBroom,
    init(n) {
      // a broom's portrait is a broom
      n.portrait = (mood, size) => LM.ui.iconCanvas(size, size, (g, W) => {
        g.fillStyle = '#2a2014';
        g.fillRect(0, 0, W, W);
        g.translate(W / 2, W / 2);
        g.scale(W / 40, W / 40);
        drawBroom(g, { t: 0, home: { x: 0 } }, 0);
      });
    },
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: {
          text: (g, n) => [n.props.intro || '(The broom turns to face you. It doesn’t have a face. It manages.)', 'You’re not management, are you? Good. We’re on strike. Have been since the reorg.'],
          options: () => broomOpts(),
        },
        menu: { text: ['Still on strike. What?'], options: () => broomOpts() },
        server: {
          text: ['The server room? Follow the arrows. All the way around the loop, in order. We swept that loop for years. It doesn’t go anywhere until it does.', 'If you skip an arrow, you start over. The arrows are petty. We respect that.'],
          options: [back(), bye()],
        },
        supply: {
          text: ['Gertrude at the Supply Desk? She ate the last broom who asked for a dustpan.', 'She doesn’t mind you standing there. She minds you going in. Go in with a weapon, or don’t go in.'],
          options: [back(), bye()],
        },
        strike: {
          text: ['Our demands: a dustpan for every broom. Weekends. Recognition that the mop is not one of us.', 'The mop knows what it did.'],
          options: [back(), bye()],
        },
      },
    },
  };
  const broomOpts = () => [
    { label: 'How do I find the server room?', next: 'server', once: true },
    { label: 'What’s with the supply closet?', next: 'supply', once: true },
    { label: 'What are you striking for?', next: 'strike', once: true },
    bye('Solidarity.'),
  ];

  // ------------------------------------------------------------ the lost of the east wing
  const lost = (name, role, look, lines, more) => Object.assign({
    name, role, behavior: 'sit', mood: 'tired', look,
    barks: lines.barks,
    dialog: { start: 'hello', nodes: { hello: { text: lines.talk, options: [bye(lines.bye || 'Good luck.')] } } },
  }, more || {});
  const doug = lost('Doug Fenn', 'Accounts Payable (since 2009)', { skin: '#d8b090', hair: '#9a9a9a', hairStyle: 'bald', shirt: '#c8c0a0', tie: '#5a3a2a', glasses: true, bg: '#2a2618' }, {
    barks: ['I just went to get toner.', 'Eleven thousand laps. I can feel I’m close.', 'Is it still 2009?'],
    talk: [
      'Hi. Doug. Accounts Payable. I went to get toner in 2009 and I followed the arrows.',
      'The arrows are a loop, did you know? I’ve been around eleven thousand times. I skipped one once, in 2011, and I had to start the whole loop over.',
      'You have to do them in order. The way they point. Don’t skip any. I can feel I’m close.',
    ],
    bye: 'Good luck, Doug.',
  });
  const patricia = lost('Patricia Holm', 'Logistics (last seen 2017)', { skin: '#a8704a', hair: '#3a2a1e', hairStyle: 'long', shirt: '#4a6a8a', lanyard: '#d0a020', bg: '#1a2430' }, {
    barks: ['Counterclockwise. Six years.', 'The arrows only count the way they point.', 'Don’t tell Doug. Doug thinks he’s close.'],
    talk: ['I followed the arrows the wrong way round. Counterclockwise. For six years.', 'They only count if you go the way they point. Clockwise. NW, NE, SE, SW, and then back beside the wall in the west hall. That last one’s the one people miss.', 'I’m resting. I’ve earned a rest. Then I’ll go round again, properly.'],
    bye: 'Rest well, Patricia.',
  });
  const intern = lost('Onboarding Cohort, 2014', 'Interns', { skin: '#e8c8a8', hair: '#3a2a1e', hairStyle: 'short', shirt: '#5a8a5a', lanyard: '#e8e4dc', bg: '#22341f' }, {
    barks: ['Is this where onboarding is?', 'Our manager said she’d be right back.', 'Day one! Still day one!'],
    talk: ['Hi! We’re the 2014 onboarding cohort! Our manager said she’d be right back, and to wait here.', 'We’ve been waiting here. It’s still day one! We’re so excited!'],
    bye: 'Welcome aboard.',
  }, { behavior: 'wander', roam: 3, speed: 40 });
  const hal = lost('Hal', 'Third floor (visiting, since 2003)', { skin: '#c8946e', hair: '#6a4a2a', hairStyle: 'curly', shirt: '#8a3a3a', bg: '#2a1814' }, {
    barks: ['There’s always room for one more.', 'Buy the hints. I didn’t buy the hints.', 'The coffee’s from 2003. So am I.'],
    talk: [
      'Welcome to the lounge. They call it Hilbert’s Hotel: every seat is taken, and there’s always room for one more. That’s the problem. They keep making room.',
      'The vending machine sells hints. Cheap. Buy the hints. I didn’t buy the hints, and now I’m furniture.',
    ],
    bye: 'I’ll buy the hints.',
  });

  // ------------------------------------------------------------ Kevin, at the server room door
  const tech = {
    name: 'Kevin Park', role: 'Junior Technician (nights, days, nights)', behavior: 'stand', face: 'e', mood: 'wide',
    look: { skin: '#e0c09a', hair: '#14100c', hairStyle: 'buzz', shirt: '#2e3e2e', lanyard: '#5ac8e8', holding: 'tablet', glasses: true, bg: '#14201a' },
    barks: (n, game) => (has(game, 'cb_t1') && has(game, 'cb_t3')
      ? ['The terminal got moved. East side. Far corner.', 'Freeze when he’s close. Freeze!', 'He can’t fit through the gaps. You can.']
      : ['Whoa, whoa. Not yet.', 'Status meeting and training first. IT policy.', 'You can’t run the daily report with unticked boxes. That’s chaos.']),
    dialog: {
      start: (game) => (has(game, 'cb_t1') && has(game, 'cb_t3') ? 'cleared' : 'blocked'),
      nodes: {
        blocked: {
          text: (g) => [
            'Whoa. Whoa. You can’t run the daily report module yet.',
            'Policy: status meeting AND mandatory training first. ' + (has(g, 'cb_t1') ? 'You did the meeting, nice, you’re alive. ' : 'You haven’t been to the meeting: Zeno’s Paradox, the middle conference room, north side of the office. ') + (has(g, 'cb_t3') ? 'Training: done.' : 'You haven’t done Brenda’s training: the Training Room, the bottom office on the executive corridor, east side.'),
            'Go tick your boxes. I’ll be here. I am always here. I am load-bearing.',
          ],
          options: [bye('Fine.')],
        },
        cleared: {
          text: (g) => [
            'Okay, you’re cleared. Bad news: the terminal you need got moved to the other side of the server farm. Far east corner, behind the racks.',
            'Worse news: Bob. The sysadmin. He’s in a really bad mood. He can’t decrypt any of his email, because Alice has his private key. Had. Someone has it.',
            'He’s… gotten bigger since Tuesday. Long arms. Cables. He only moves when you move, so if he gets close, freeze. And the gaps between the racks are too narrow for him.',
            has(g, 'bobKey') && !has(g, 'cb_bobAppeased') ? 'Wait. Is that Bob’s key? You have Bob’s key? Give it to him. Please. Maybe he’ll shrink.' : 'Good luck. I mean it. I’m not allowed to mean things, but I mean it.',
          ],
          options: [bye('Thanks, Kevin.')],
        },
      },
    },
  };

  // ------------------------------------------------------------ Bob, the SYSADMIN
  /**
   * Bob is big: he stands on grid corners where a 2 x 2 block of floor is open,
   * so the one-tile gaps between racks are too narrow for him. A few times a
   * second he searches the corners he can reach (breadth-first, inside the
   * level's bobArea) for the one closest to you, and walks the first step of
   * that path. His whole clock (walking, reaching, striking) runs only as fast
   * as you move: stand still and he freezes. Give him his private key (flag
   * bobKey) and he calms down.
   */
  const BOB = { speed: 150, reach: 56, windup: 0.55, recover: 0.5, damage: 28 };
  CB.BOB = BOB;
  function bobOk(L, vx, vy, area) {
    if (area && (vx - 1 < area[0] || vy - 1 < area[1] || vx >= area[0] + area[2] || vy >= area[1] + area[3])) return false;
    return !L.solidAt(vx - 1, vy - 1) && !L.solidAt(vx, vy - 1) && !L.solidAt(vx - 1, vy) && !L.solidAt(vx, vy);
  }
  const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  /** The next corner on Bob's way to the reachable corner nearest the player. */
  function bobPlan(n, game, goal) {
    const L = game.level, P = goal || game.player, area = L.def.bobArea || [0, 0, L.w, L.h];
    let sx = Math.round(n.x / T), sy = Math.round(n.y / T);
    if (!bobOk(L, sx, sy, area)) {
      // nudged off a corner: use the nearest good one
      let bd = Infinity, fix = null;
      for (const [dx, dy] of STEPS) {
        const d2 = U.dist2(n.x, n.y, (sx + dx) * T, (sy + dy) * T);
        if (bobOk(L, sx + dx, sy + dy, area) && d2 < bd) {
          bd = d2;
          fix = [sx + dx, sy + dy];
        }
      }
      if (!fix) return null;
      [sx, sy] = fix;
    }
    const key = (x, y) => x * 4096 + y;
    const from = new Map([[key(sx, sy), null]]), q = [[sx, sy, 0]];
    let best = [sx, sy], bestScore = U.dist(sx * T, sy * T, P.x, P.y);
    for (let h = 0; h < q.length; h++) {
      const [x, y, d] = q[h];
      for (const [dx, dy] of STEPS) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (from.has(k) || !bobOk(L, nx, ny, area)) continue;
        if (dx && dy && (!bobOk(L, x + dx, y, area) || !bobOk(L, x, y + dy, area))) continue;
        from.set(k, [x, y]);
        q.push([nx, ny, d + 1]);
        const score = U.dist(nx * T, ny * T, P.x, P.y) + (d + 1) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          best = [nx, ny];
        }
      }
    }
    // walk back from the best corner to the first step
    let cur = best, prev = from.get(key(cur[0], cur[1]));
    while (prev && (prev[0] !== sx || prev[1] !== sy)) {
      cur = prev;
      prev = from.get(key(cur[0], cur[1]));
    }
    return { x: cur[0], y: cur[1] };
  }
  LM.npcBehaviors['cb-sysadmin'] = function (n, dt, game) {
    const P = game.player, m = n.mem;
    // Bob's clock: how fast are you moving?
    const k = P && !P.dead ? U.clamp(Math.hypot(P.vx, P.vy) / 172, 0, 1.6) : 0;
    m.k = k;
    n.props.speed = Math.max(0.001, BOB.speed * k * 0.85);
    n.ignoresPlayer = true;
    if (m.appeased) {
      // calm now: he no longer blocks anyone, and walks home to his console round the racks
      if (!m.calm) {
        m.calm = true;
        n.def = Object.assign({}, n.def, { ghost: true });
        m.tgt = null;
      }
      n.props.speed = 70;
      const d = U.dist(n.x, n.y, n.home.x, n.home.y);
      if (d < 6) {
        n.wantFace = -Math.PI / 2;
        return;
      }
      m.plan = (m.plan || 0) - dt;
      if (!m.tgt || m.plan <= 0 || U.dist(n.x, n.y, m.tgt.x * T, m.tgt.y * T) < 4) {
        m.tgt = bobPlan(n, game, n.home);
        m.plan = 0.25;
      }
      // last stretch (or no corner closer): straight to his console
      const near = !m.tgt || d < 40 || U.dist(m.tgt.x * T, m.tgt.y * T, n.x, n.y) < 4;
      const gx = near ? n.home.x : m.tgt.x * T, gy = near ? n.home.y : m.tgt.y * T;
      const dx = gx - n.x, dy = gy - n.y, l = Math.hypot(dx, dy);
      if (l > 1) {
        n.mx = dx / l;
        n.my = dy / l;
      }
      return;
    }
    if (!m.awake || !P) {
      n.wantFace = n.facing;
      return;
    }
    const bt = dt * k;
    m.cd = (m.cd || 0) - bt;
    // reaching for you
    if (m.atk) {
      m.atk.t += bt;
      n.wantFace = Math.atan2(P.y - n.y, P.x - n.x);
      if (!m.atk.struck && m.atk.t >= BOB.windup) {
        m.atk.struck = true;
        LM.audio.play('swing', { vol: 1 });
        if (n.distP < BOB.reach + 10 && !P.dead) {
          const a = Math.atan2(P.y - n.y, P.x - n.x);
          LM.combat.hurt(game, P, BOB.damage, { kx: Math.cos(a) * 260, ky: Math.sin(a) * 260, source: 'enemy', type: 'melee' });
          if (!m.saidHit) {
            m.saidHit = true;
            n.say('CAN’T. DECRYPT.', 1.8);
          }
        }
      }
      if (m.atk.t >= BOB.windup + BOB.recover) {
        m.atk = null;
        m.cd = 0.4;
      }
      return;
    }
    if (n.distP < BOB.reach && n.seeLos && m.cd <= 0) {
      m.atk = { t: 0, struck: false };
      return;
    }
    if (k < 0.02) return; // you're standing still: so is he
    // walk corner to corner toward you
    m.plan = (m.plan || 0) - dt;
    if (!m.tgt || m.plan <= 0 || U.dist(n.x, n.y, m.tgt.x * T, m.tgt.y * T) < 4) {
      m.tgt = bobPlan(n, game) || m.tgt;
      m.plan = 0.25;
    }
    if (!m.tgt) return;
    // close and in the open: lean straight at you (the racks still hold him back)
    const straight = n.seeLos && n.distP < 90;
    const gx = straight ? P.x : m.tgt.x * T, gy = straight ? P.y : m.tgt.y * T;
    const dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy);
    if (d > 2) {
      n.mx = dx / d;
      n.my = dy / d;
    }
  };
  function drawBob(g, n, t) {
    const m = n.mem, P = LM.game && LM.game.player;
    const bt = (m.bt = (m.bt || 0) + 0.016 * (m.k == null ? 1 : m.k + 0.05));
    const reach = m.atk ? U.clamp(m.atk.t / BOB.windup, 0, 1) : 0;
    g.rotate(n.facing);
    // cables trailing behind him like tendrils
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const s = (i / 6 - 0.5) * 2;
      g.strokeStyle = ['#2a5a8a', '#3a3a3a', '#8a6a2a', '#2a7a4a'][i % 4];
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(-12, s * 10);
      g.bezierCurveTo(-24, s * 14 + Math.sin(bt * 4 + i) * 5, -32, s * 18 + Math.sin(bt * 3 + i * 2) * 7, -40 - i % 3 * 4, s * 22 + Math.sin(bt * 5 + i) * 6);
      g.stroke();
    }
    // long arms, reaching
    g.strokeStyle = '#3e4a60';
    g.lineWidth = 4;
    for (const side of [-1, 1]) {
      const sh = { x: 4, y: side * 15 };
      const elbow = { x: 16 + reach * 10, y: side * (26 - reach * 6) + Math.sin(bt * 2 + side) * 2 };
      const hand = { x: 30 + reach * 26, y: side * (14 - reach * 8) };
      g.beginPath();
      g.moveTo(sh.x, sh.y);
      g.lineTo(elbow.x, elbow.y);
      g.lineTo(hand.x, hand.y);
      g.stroke();
      g.strokeStyle = '#6a7a94';
      g.lineWidth = 1.2;
      for (let f = -1; f <= 1; f++) {
        g.beginPath();
        g.moveTo(hand.x, hand.y);
        g.lineTo(hand.x + 7, hand.y + f * 4);
        g.stroke();
      }
      g.strokeStyle = '#3e4a60';
      g.lineWidth = 4;
    }
    // the bulk of him: hoodie, hunched
    g.fillStyle = '#10141c';
    g.beginPath();
    g.ellipse(-3, 0, 17, 21, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#232b3a';
    g.beginPath();
    g.ellipse(-2, 0, 15, 19, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#1a2130';
    g.beginPath();
    g.arc(5, 0, 8.5, 0, U.TAU);
    g.fill();
    // headset
    g.strokeStyle = '#0a0a0c';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(5, 0, 9.2, -Math.PI / 2 - 0.3, Math.PI / 2 + 0.3, true);
    g.stroke();
  }
  const bob = {
    name: 'Bob Sato', role: 'SYSADMIN', behavior: 'cb-sysadmin', radius: 19, speed: BOB.speed, mood: 'blank', ignoresPlayer: true,
    look: { skin: '#9aa4b0', hair: '#0a0a0c', hairStyle: 'short', shirt: '#232b3a', headset: true, glasses: '#1a1a1e', bg: '#0a0e16' },
    barks: (n, game) => (n.mem.appeased
      ? ['She said goodbye. In a poem.', 'Key hygiene, Alice. Key hygiene.', '(he decrypts, softly)', 'Forty thousand unread. Forty thousand. Beautiful.']
      : ['CAN’T. DECRYPT.', 'WHO HAS MY KEY.', '-----BEGIN PGP MESSAGE-----', 'ALICE.', 'Have you tried. Turning. Yourself. Off.']),
    barkMin: 4, barkMax: 8,
    bubbleStyle: { bg: 'rgba(10,14,22,0.94)', fg: '#9fe0b0', border: 'rgba(90,200,140,0.6)' },
    draw: drawBob,
    drawGlow(g, n, t) {
      const m = n.mem;
      // a monitor-lit face, and red when he reaches
      const fx = n.x + Math.cos(n.facing) * 9, fy = n.y + Math.sin(n.facing) * 9;
      G.glow(g, fx, fy, 14, m.appeased ? '#9fe0b0' : '#5ab4ff', 0.45);
      if (m.atk) {
        const k = U.clamp(m.atk.t / BOB.windup, 0, 1);
        G.glow(g, n.x + Math.cos(n.facing) * 40, n.y + Math.sin(n.facing) * 40, 26, '#ff3a2a', 0.15 + k * 0.5);
      }
    },
    dialog: {
      start: (game, n) => (n.mem.appeased ? 'calm' : has(game, 'bobKey') ? 'key' : 'nokey'),
      nodes: {
        nokey: {
          mood: 'glitch',
          text: ['(Forty thousand fans roar. Bob does not hear you. Bob reaches.)', 'KEY. WHO. HAS. MY. KEY.'],
          options: [bye('(Back away.)')],
        },
        key: {
          mood: 'glitch',
          text: ['(He looms. Cables whisper behind him. His long hands open and close, open and close.)', 'KEY.', '(He has seen the brass key on its lanyard in your hand. BOB — PRIVATE.)'],
          options: [{ label: 'Give Bob his private key.', next: 'given' }, bye('(Keep it. Back away.)')],
        },
        given: {
          mood: 'tired',
          do: (game, n) => CB.appeaseBob(game, n),
          text: ['(He takes it with two long fingers. Holds it to his chest. Something in him unclenches; the cables go slack.)', '…My key.', '(He types something on a terminal that isn’t there. He reads. He is quiet a long time.)', 'She said goodbye. In a poem. “Came whiffling through the tulgey wood.” That’s… that’s us. That’s from the whiteboard.', 'Go on. Run your report. I won’t reach for you. I’m reading.'],
          options: [bye('Bye, Bob.')],
        },
        calm: {
          mood: 'smile',
          text: ['(He doesn’t look up from his inbox.) Forty thousand unread. Forty thousand. Beautiful.', 'Tell Alice: key hygiene. She’ll know.'],
          options: [bye()],
        },
      },
    },
  };
  CB.appeaseBob = function (game, n) {
    n.mem.appeased = true;
    n.mem.atk = null;
    game.setFlag('cb_bobAppeased');
    game.toast('You give Bob his private key. Bob stands down.', 'good');
  };

  LM.definePack({
    id: 'chessboard',
    npcs: {
      'cb-receptionist': receptionist, 'cb-dana': dana, 'cb-priya': priya, 'cb-gary': gary, 'cb-tomas': tomas,
      'cb-kenji': kenji, 'cb-coworker': coworker, 'cb-sam': sam, 'cb-alan': alan, 'cb-brenda': brenda,
      'cb-attendee': attendee, 'cb-broom': broom, 'cb-doug': doug, 'cb-patricia': patricia, 'cb-intern': intern,
      'cb-hal': hal, 'cb-tech': tech, 'cb-bob': bob,
    },
  });
})();
