/* The Linear Maze — packs/office/npcs.js
 * Office pack, part 3: the people of Meridian Group's 14th floor, and the
 * things wearing their faces past the door that wasn't there.
 *
 * Every dialog tree is { start, again, nodes }. Option `if` and text
 * functions read story flags so conversations change as the day goes wrong:
 *   readNote      you took the note from your desk
 *   doorAppeared  the window in the west hall became a door
 *   doorOpened    you opened it
 *   tookSalmon    you became the lunch thief
 * Placement props can override name, role, look, behavior, face, barks and dialog.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const has = (game, f) => game.hasFlag(f);
  const back = (label) => ({ label: label || 'Can I ask you something else?', next: 'menu' });
  const bye = (label) => ({ label: label || 'Never mind.', end: true });

  // ------------------------------------------------------------ Marisol, reception
  const marisolOpts = () => [
    { label: 'Where is the Linear Conference room?', next: 'where', flag: 'askedMarisol' },
    { label: 'You look swamped.', next: 'swamped', once: true },
    { label: 'Any packages for me?', next: 'packages', once: true },
    { label: 'Was there always a door in the west hall?', next: 'door', if: (g) => has(g, 'doorAppeared'), once: true },
    bye('Never mind. Hang in there.'),
  ];
  const receptionist = {
    name: 'Marisol Reyes', role: 'Front desk', behavior: 'sit', face: 's', mood: 'tired', reach: 48,
    look: { skin: '#b07a52', hair: '#1e1410', hairStyle: 'bun', shirt: '#6a2a4a', headset: true, lanyard: '#2a6a8a', bg: '#3a2030' },
    barks: [
      'Meridian Group, good morning, please hold—',
      'Sorry, sorry, one second, hon.',
      'Line two, hold. Line three, hold. Line four is… still breathing.',
      'If one more person asks me about parking validation…',
      'Sign in on the tablet. Or don’t. It’s broken.',
    ],
    flashBarks: ['Oh! I look terrible. Delete that, sweetheart.'],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: {
          mood: 'smile',
          text: ['(She holds up one finger and finishes a call.) —yes, I’ll tell him. Meridian Group, please hold. Thank you.', 'Hi! Sorry. Good morning. What can I do for you, sweetheart?'],
          options: marisolOpts,
        },
        menu: { mood: 'smile', text: (g) => [has(g, 'doorOpened') ? 'Still here. Still holding. What do you need?' : 'Back again! What do you need?'], options: marisolOpts },
        where: {
          text: [
            'Linear… Linear. We’ve got Tangent, Vertex and Parallel on this floor, and Radius upstairs, but Radius has a bee situation.',
            'Facilities renames them every quarter. Is it on your calendar invite?',
          ],
          options: [
            { label: 'It wasn’t an invite. It was a handwritten note on my desk.', next: 'note', if: (g) => has(g, 'readNote') },
            back(),
            bye('I’ll keep looking.'),
          ],
        },
        note: {
          mood: 'smile',
          text: ['A paper note? That’s very… retro.', 'I’ll put in a ticket with Facilities. They never answer, but it makes me feel better to put in the ticket.'],
          options: [back(), bye('Thanks, Marisol.')],
        },
        swamped: {
          text: [
            'The phones haven’t stopped since seven. The printer’s out of toner, the parking gate ate a car, and somebody keeps calling line four and just… breathing.',
            'I put them on hold. They’re still on hold. It’s been two hours.',
          ],
          options: [{ label: 'Can I pick up line four?', next: 'line4', once: true }, { label: 'Do you want a coffee?', next: 'coffee', once: true }, back()],
        },
        line4: {
          mood: 'wide',
          flag: 'heardLine4',
          do: () => LM.audio.play('locked'),
          text: [
            '(She hands you the receiver.)',
            'Water dripping, a long way off. A room with very high ceilings. Then, close to the mouthpiece, someone says: “You’re late.”',
            'The line goes quiet. Line four stays lit.',
          ],
          options: [{ label: '…Who was that?', next: 'line4b' }],
        },
        line4b: {
          mood: 'tired',
          text: ['I don’t want to know. Honestly? I do not want to know.', 'I’m putting line four back on hold.'],
          options: [back(), bye()],
        },
        coffee: {
          mood: 'smile',
          text: ['Oh, you’re sweet. Oat milk, if Tomas hasn’t hidden it again. He thinks I can’t see the line he draws on the carton. I can see the line.'],
          options: [back(), bye()],
        },
        packages: {
          text: ['Not unless you ordered forty pounds of printer toner. Somebody did. I’m not saying it was Dana. It was Dana.'],
          options: [back(), bye()],
        },
        door: {
          mood: 'tired',
          text: [
            'The west hall? That’s just windows and the fire extinguisher.',
            'Did they finally put in the supply closet? Nobody tells me anything. I’m the front desk. I’m literally the front.',
          ],
          options: [back(), bye()],
        },
      },
    },
  };

  // ------------------------------------------------------------ Dana, your boss
  const danaOpts = () => [
    { label: 'It’s in progress.', next: 'progress', once: true },
    { label: 'Do you know where the Linear Conference room is?', next: 'linear' },
    { label: 'Could I take a long lunch today?', next: 'lunch', once: true },
    { label: 'There’s a door in the west hall where the window used to be.', next: 'door', if: (g) => has(g, 'doorAppeared'), once: true },
    { label: 'I’ll get right on it.', end: true, flag: 'promisedReport' },
  ];
  const boss = {
    name: 'Dana Whitlock', role: 'Director of Operations', behavior: 'pace', mood: 'smile',
    look: { skin: '#e8bc96', hair: '#c8a060', hairStyle: 'short', shirt: '#e8e4dc', blazer: '#2a2e3a', glasses: '#8a2a2a', holding: 'tablet', bg: '#2a2e3a' },
    barks: [
      'Status reports, people! End of day!',
      'Quick sync later? Five minutes. Ten, tops.',
      'Love that energy. Love it.',
      'Let’s take that offline.',
      'The pulse survey is anonymous. Mostly.',
    ],
    flashBarks: ['Ooh, for the newsletter?'],
    dialog: {
      start: 'hello',
      again: 'again',
      nodes: {
        hello: {
          text: ['Hey! You! Got a sec? Super quick.', 'Just wanted to circle back on the status report. Not chasing! Just circling. Gently. Like a hawk, but supportive.'],
          options: danaOpts,
        },
        again: {
          mood: 'neutral',
          text: ['Back already! Is that… the status report?', '(She looks at your empty hands.) No? Okay! Okay. That’s fine. End of day is still end of day.'],
          options: danaOpts,
        },
        menu: { text: ['What else is on your mind? Besides the status report, which I know is on your mind.'], options: danaOpts },
        progress: {
          text: ['Love that. Love “in progress.”', 'Could we maybe get it from “in progress” to “in my inbox”? By end of day? No pressure. Some pressure. A healthy, normal amount of pressure.'],
          options: [back(), bye('Understood.')],
        },
        linear: {
          mood: 'neutral',
          text: [
            'Linear? Is that one of the new ones on fifteen? I can’t keep track. They rename them every quarter and I’m still booking Vertex as “Pluto.”',
            'Honestly, if it’s not on the calendar, it’s not a meeting. It’s a hallway conversation with chairs.',
            'Speaking of meetings. Status report?',
          ],
          options: [{ label: 'Who would leave a handwritten note on my desk?', next: 'note', if: (g) => has(g, 'readNote'), once: true }, back(), bye()],
        },
        note: {
          text: ['A handwritten note? That’s fun. That’s very… analog. I love that for you.', 'Was it about the status report? Could it have been about the status report?'],
          options: [back(), bye()],
        },
        lunch: {
          text: ['Lunch, sure! Lunch is great. Lunch is a reward.', 'Status report first, then lunch. That’s how rewards work. I read a book about it.'],
          options: [back(), bye()],
        },
        door: {
          mood: 'neutral',
          text: [
            'A door? On the fourteenth floor? On the outside wall?',
            '(For a second she doesn’t smile.) …Did you hear a sort of settling noise earlier? The building does that. Facilities says it’s fine.',
            'Anyway! While you’re over that way. Status report?',
          ],
          options: [back(), bye()],
        },
      },
    },
  };

  // ------------------------------------------------------------ the pantry
  const priyaOpts = () => [
    { label: 'Do you know where the Linear Conference room is?', next: 'linear' },
    { label: 'Who do you think did it?', next: 'suspect', once: true },
    { label: 'Have you tried putting a lock on it?', next: 'lock', once: true },
    { label: '…I may have taken Gary’s salmon.', next: 'salmon', if: (g) => has(g, 'tookSalmon'), once: true },
    bye('That’s rough. Good luck.'),
  ];
  const priya = {
    name: 'Priya Natarajan', role: 'Product manager', behavior: 'stand', face: 'n', mood: 'annoyed',
    look: { skin: '#a8704a', hair: '#140c08', hairStyle: 'long', shirt: '#2a7a6a', holding: 'mug', bg: '#1e3a34' },
    barks: [
      'Someone ate my pad thai. AGAIN.',
      'It had my NAME on it. In SHARPIE.',
      'I am putting a camera in that fridge. I am serious.',
      'Gary. It’s always Gary.',
    ],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: {
          text: [
            'Do you know what’s in that fridge? Nothing. Do you know what was in that fridge at nine this morning? My pad thai.',
            'It had my name on it. In Sharpie. Underlined. Twice.',
          ],
          options: priyaOpts,
        },
        menu: { text: ['Still no pad thai. I’ve checked twice. I’m going to check again in a minute.'], options: priyaOpts },
        linear: {
          mood: 'neutral',
          text: ['Never heard of it. Is that where they’re holding the lunch thief’s trial? Because I would attend that meeting.', 'I’d bring snacks. My own snacks. Labeled.'],
          options: [back(), bye()],
        },
        suspect: {
          text: [
            'I have a list. Gary’s on it. Gary is on every list.',
            'But it isn’t just me. Tomas’s oat milk keeps going down. Dana’s yogurt has been in there since March and nobody will touch it, which tells you everything you need to know about Dana’s yogurt.',
          ],
          options: [back(), bye()],
        },
        lock: {
          text: [
            'A lock on a shared fridge? Brenda from HR says that “creates a culture of mistrust.”',
            'I said the culture of mistrust was created by whoever ate my pad thai. She said that’s not how culture works. I said it is now.',
          ],
          options: [back(), bye()],
        },
        salmon: {
          mood: 'smile',
          text: ['(She stares at you for a long moment.)', '…Honestly? Good. Let him know how it feels.', 'I didn’t hear this. We never spoke.'],
          options: [bye('We never spoke.')],
        },
      },
    },
  };

  const garyOpts = () => [
    { label: 'Do you know where the Linear Conference room is?', next: 'linear' },
    { label: 'Did you eat Priya’s pad thai?', next: 'accuse', once: true },
    { label: 'The microwave’s been at 3:47 for a while.', next: 'stuck', once: true, if: (g) => !has(g, 'tookSalmon') },
    bye('Enjoy your fish.'),
  ];
  const gary = {
    name: 'Gary Pruitt', role: 'Account executive', behavior: 'stand', face: 'n', mood: 'neutral',
    look: { skin: '#d8a07a', hair: '#6a4a2a', hairStyle: 'buzz', shirt: '#8aa0c0', tie: '#8a2a2a', bg: '#26324a' },
    barks: (n, game) =>
      has(game, 'tookSalmon')
        ? ['WHERE. IS. MY. SALMON.', 'Who would DO that?', 'This is a crime against fish.']
        : ['It’s salmon. It’s a healthy fish. People need to relax.', 'Three forty-seven. Why does it still say three forty-seven?', 'Closed two deals before nine. Not that anyone asked.'],
    flashBarks: ['Get my good side. Trick question: both sides.'],
    dialog: {
      start: (game) => (has(game, 'tookSalmon') ? 'missing' : 'hello'),
      again: (game) => (has(game, 'tookSalmon') ? 'missing' : 'menu'),
      nodes: {
        hello: {
          text: ['Hey, buddy. Don’t mind the smell. It’s salmon. It’s a healthy fish.', 'People need to relax about the fish.'],
          options: garyOpts,
        },
        menu: { text: ['What’s up, buddy?'], options: garyOpts },
        linear: {
          text: [
            'Linear… like a linear sales funnel? I don’t do the funnel meetings anymore. Bad energy in those meetings.',
            'Ask Tomas. Tomas knows where every room is. He installed the little tablets outside them. He is very proud of the little tablets.',
          ],
          options: [back(), bye()],
        },
        accuse: {
          mood: 'annoyed',
          text: ['I’m not going to dignify that with a response.', '…It was unlabeled. Well. It was labeled. Faintly. In a way that was open to interpretation.'],
          options: [back(), bye()],
        },
        stuck: {
          text: ['It’s been at three forty-seven for twenty minutes. I think it’s thinking.', 'I’m not opening it until it’s done. You don’t interrupt salmon.'],
          options: [back(), bye()],
        },
        missing: {
          mood: 'wide',
          text: ['Have you seen my salmon? It was right there. RIGHT THERE.', 'Who steals another man’s fish?'],
          options: [{ label: 'No idea.', next: 'missing2' }, { label: 'It was me.', next: 'confess', once: true }, bye('Good luck, Gary.')],
        },
        missing2: {
          mood: 'annoyed',
          text: ['Somebody in this office is a monster, and I am going to find out who.', '(He looks at Priya. Priya looks at her tea.)'],
          options: [bye()],
        },
        confess: {
          mood: 'smile',
          text: ['(He looks at you. He looks at the empty microwave.)', '…Respect. Honestly? Respect.', 'I would have done the same. I have done the same. Don’t tell Priya.'],
          options: [bye()],
        },
      },
    },
  };

  const tomasOpts = () => [
    { label: 'Do you know where the Linear Conference room is?', next: 'linear' },
    { label: 'Is the Wi-Fi actually working?', next: 'wifi', once: true },
    { label: 'Any tips for the espresso machine?', next: 'espresso', once: true },
    { label: 'My phone is picking up a network called LINEAR.', next: 'network', if: (g) => has(g, 'doorAppeared'), once: true },
    bye(),
  ];
  const tomas = {
    name: 'Tomas Ferreira', role: 'IT support', behavior: 'sit', face: 'e', mood: 'tired',
    look: { skin: '#c89070', hair: '#2a1a10', hairStyle: 'curly', shirt: '#2e2e34', lanyard: '#d0a020', glasses: true, bg: '#1c1c22' },
    barks: [
      'Have you tried turning it off and on? I’m not being funny. Have you?',
      'The espresso machine is fine. People don’t read the screen.',
      'The Wi-Fi is working. Your expectations are not.',
      'Somebody keeps drinking my oat milk. I’ve started marking the level.',
    ],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: { text: ['Hey. If this is about the Wi-Fi, the Wi-Fi is working. Your expectations aren’t.'], options: tomasOpts },
        menu: { text: ['What’s broken?'], options: tomasOpts },
        linear: {
          text: [
            'Not on the network. Every bookable room has a panel outside it. I installed all of them. I know every room on this floor by MAC address.',
            'There’s no panel called Linear. Unless it’s offline.',
            'Rooms don’t go offline.',
          ],
          options: [{ label: 'Could it be on another floor?', next: 'floor', once: true }, back(), bye()],
        },
        floor: {
          mood: 'wide',
          text: [
            'Fifteen is a law firm. Thirteen doesn’t exist, because the building is superstitious. Twelve is us, technically, but nobody goes to twelve.',
            'Why does nobody go to twelve? I don’t actually know. Huh.',
          ],
          options: [back(), bye()],
        },
        wifi: {
          text: ['Define “working.”', 'Packets go out. Some of them come back. The ones that come back seem… different. Older. I keep meaning to file a ticket about it.'],
          options: [back(), bye()],
        },
        espresso: {
          text: ['Read the screen. Pull the shot. Do not steam the oat milk; the oat milk is mine.', 'It’ll make you faster. Not measurably. Spiritually. Okay, a little measurably.'],
          options: [back(), bye()],
        },
        network: {
          mood: 'wide',
          text: [
            'LINEAR? That’s not ours. Ours are MERIDIAN-CORP, MERIDIAN-GUEST, and one called PRETTY FLY FOR A WIFI that I set up in 2019 and can’t find.',
            'Don’t join it. You don’t know what’s on the other end of an open network.',
            '…Full bars? From the west hall? There’s no access point in the west hall.',
          ],
          options: [back(), bye()],
        },
      },
    },
  };

  // ------------------------------------------------------------ the open plan
  const kenji = {
    name: 'Kenji Watanabe', role: 'Financial analyst', behavior: 'sit', face: 'n', mood: 'tired',
    look: { skin: '#e0c09a', hair: '#14100c', hairStyle: 'short', shirt: '#e8e4dc', glasses: '#2a2a30', headset: true, bg: '#2a2e36' },
    barks: ['Mm-hm. Mm-hm. No, I’m on mute.', 'Who approved forty pounds of toner?', 'Q3 is fine. Q3 is fine.', 'Can you all see my screen?'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: ['(He pulls out one earbud.) Sorry, what? I’m on a call. I’m always on a call.'],
          options: [{ label: 'Do you know where the Linear Conference room is?', next: 'linear' }, bye('Sorry. Go back to your call.')],
        },
        linear: {
          text: ['Linear? Is that the one with the broken projector? No, that’s Vertex.', 'They all have broken projectors. At this point the projectors are a feature.', '(The earbud goes back in.)'],
          options: [bye()],
        },
      },
    },
  };
  const brenda = {
    name: 'Brenda Okafor', role: 'People & culture', behavior: 'wander', mood: 'smile', speed: 48, roam: 5,
    look: { skin: '#6a4430', hair: '#1a1210', hairStyle: 'bun', shirt: '#c8702a', holding: 'clipboard', lanyard: '#2a6a8a', bg: '#3a2414' },
    barks: [
      'Has everyone done the fire-safety module? It’s mandatory.',
      'Reminder: the pulse survey closes Friday!',
      'Gary, please don’t microwave fish.',
      'Wellness Wednesday is this Thursday.',
    ],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: {
          text: ['Oh! Hi! Have you done your mandatory fire-safety module? It’s mandatory. That’s what the “mandatory” means.'],
          options: () => brendaOpts(),
        },
        menu: { text: ['What can People and Culture do for you?'], options: () => brendaOpts() },
        linear: {
          text: (g) => has(g, 'doorAppeared')
            ? ['Hmm. Not on our floor plan, and I have the floor plan. It’s laminated.', '(She flips through her clipboard. She frowns at a page that wasn’t there a moment ago.)', '…Huh. Someone’s drawn a little door on the west wall in pencil. That is not to code.']
            : ['Hmm. Not on our floor plan, and I have the floor plan. It’s laminated.', 'Have you asked Marisol? Marisol knows everything.'],
          options: [back(), bye()],
        },
        fire: {
          mood: 'neutral',
          text: [
            'Exits are clearly marked. Never use the elevator. If you’re trapped, stay low, stay calm, and wait for help.',
            'If help doesn’t come, the module says to “keep going.” I flagged that wording. Legal said it’s fine.',
          ],
          options: [back(), bye()],
        },
      },
    },
  };
  const brendaOpts = () => [
    { label: 'Where is the Linear Conference room?', next: 'linear' },
    { label: 'What’s in the fire-safety module?', next: 'fire', once: true },
    bye('I’ll do the module.'),
  ];
  const sam = {
    name: 'Sam Lin', role: 'Intern', behavior: 'wander', mood: 'wide', speed: 44, roam: 2,
    look: { skin: '#e8c8a8', hair: '#3a2a1e', hairStyle: 'short', shirt: '#5a8a5a', lanyard: '#e8e4dc', holding: 'papers', bg: '#22341f' },
    barks: ['Is this where onboarding is?', 'Nobody tells interns anything.', 'Does the badge work on that door? It doesn’t work on any door.'],
    dialog: {
      start: 'hello',
      again: 'menu',
      nodes: {
        hello: {
          text: ['Oh! Hi. Do you know where the onboarding meeting is? Nobody tells interns anything.'],
          options: () => samOpts(),
        },
        menu: { text: ['Did you find it? The room?'], options: () => samOpts() },
        linear: {
          text: [
            'Oh! I got a note about that one too. Under my keyboard. “Meet in the Linear Conference room.”',
            'I thought it was a hazing thing. Is it a hazing thing?',
            'If you find it, can I come? I don’t want to be late in my first week.',
          ],
          options: [{ label: 'Sure. Stay close.', end: true, flag: 'samComing' }, bye('Better wait here.')],
        },
        marisol: {
          mood: 'tired',
          text: ['She told me to sit anywhere. I’ve been sitting anywhere for three days. Nobody has come to tell me where to sit instead.'],
          options: [back(), bye()],
        },
      },
    },
  };
  const samOpts = () => [
    { label: 'I’m looking for a room too. The Linear Conference room.', next: 'linear' },
    { label: 'Try Marisol at the front desk.', next: 'marisol', once: true },
    bye(),
  ];

  /** Everyone in a meeting looks slightly different; the look is seeded by seat so it stays put across reloads. */
  const SKINS = ['#e8c8a8', '#d8a888', '#c8946e', '#a8704a', '#8a5a3a', '#6a4430'];
  const HAIRS = ['#14100c', '#2a1e16', '#6a4a2a', '#9a9a9a', '#c8a060', '#3a2a1e'];
  const STYLES = ['short', 'long', 'bun', 'buzz', 'curly', 'ponytail', 'bald'];
  const SHIRTS = ['#6a7a8a', '#e8e4dc', '#2a4a6a', '#8a3a3a', '#3a5a4a', '#5a4a6a', '#c8b89a'];
  function seededLook(n) {
    const r = U.mulberry32((Math.floor(n.x) * 92821 + Math.floor(n.y) * 68917) >>> 0);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const look = { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(STYLES), shirt: pick(SHIRTS) };
    if (r() < 0.3) look.glasses = true;
    if (r() < 0.25) look.lanyard = pick(['#2a6a8a', '#d0a020', '#e8e4dc']);
    if (r() < 0.2) look.blazer = '#1c2030';
    return look;
  }
  // generic coworkers: give them a name, role, look and a line or two through props
  const coworker = {
    name: 'Coworker', role: 'Meridian Group', behavior: 'sit', face: 'n', mood: 'neutral',
    look: { skin: '#c8946e', hair: '#2a1e16', shirt: '#5a6a80' },
    init(n) {
      if (!n.props.look) n.look = seededLook(n);
    },
    barks: ['(typing)', '(typing faster)', 'Reply-all. Why. Why would you reply-all.', 'Is it Friday? It feels like it should be Friday.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          text: (g, n) => n.props.lines || ['(They give you the polite half-smile of someone mid-sentence in an email.)'],
          options: [{ label: 'Do you know where the Linear Conference room is?', next: 'linear', once: true }, bye('Sorry to bother you.')],
        },
        linear: {
          text: (g, n) => n.props.linear || ['Linear? No idea, sorry. Ask Marisol?'],
          options: [bye()],
        },
      },
    },
  };

  // ------------------------------------------------------------ the meeting in Vertex
  const presenter = {
    name: 'Alan Mercer', role: 'VP, Strategy', behavior: 'stand', face: 'n', mood: 'neutral',
    look: { skin: '#d8a888', hair: '#9a9a9a', hairStyle: 'short', shirt: '#e8e4dc', blazer: '#1c2030', tie: '#2a4a8a', bg: '#1c2030' },
    barks: ['…which is why, frankly, Q4 is a vibe.', 'Let’s double-click on that.', 'I want us to sit with that for a moment.', 'Next slide. Next slide. Can someone— thank you.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          mood: 'annoyed',
          text: ['We’re actually mid-meeting? Is this urgent? Is it about synergy? I’m only taking synergy questions right now.'],
          options: [{ label: 'Is this the Linear Conference room?', next: 'linear' }, bye('Sorry. Wrong room.')],
        },
        linear: {
          mood: 'tired',
          text: [
            'This is Vertex. Vertex has the good chairs. Linear is— hm.',
            'You know, I was invited to something called Linear once. Years ago. I didn’t go.',
            '(He looks at the screen for a moment, as if he’s forgotten where he is.) …Anyway. Next slide.',
          ],
          options: [bye()],
        },
      },
    },
  };
  const attendee = {
    name: 'Meeting attendee', role: 'In a meeting', behavior: 'sit', face: 's', mood: 'tired',
    look: { skin: '#c8946e', hair: '#2a1e16', shirt: '#6a7a8a' },
    init(n) {
      if (!n.props.look) n.look = seededLook(n);
    },
    barks: ['(nods)', '(writes something down)', '(checks phone under the table)', 'Mm.', '(nods harder)'],
    barkMin: 12,
    barkMax: 26,
    dialog: {
      start: 'hello',
      nodes: { hello: { text: ['(They give you the specific smile of someone who cannot talk because they are in a meeting.)'], options: [bye('(Back away.)')] } },
    },
  };

  // ------------------------------------------------------------ past the door
  const echo = (base, over) => Object.assign({}, base, over, { look: Object.assign({}, base.look, over.look || {}) });
  const echoReceptionist = echo(receptionist, {
    name: 'Marisol Reyes?', role: 'Front desk', behavior: 'sit', mood: 'blank', alpha: 0.9, ignoresPlayer: true,
    look: { shirt: '#4a3a42', bg: '#141016' },
    barks: ['Please hold.', 'Please hold. Please hold.', 'Your call is very important to us.'],
    flashBarks: ['Please hold.'],
    dialog: {
      start: 'hold',
      nodes: {
        hold: {
          mood: 'blank',
          text: ['Meridian Group, please hold.', '(The receiver in her hand isn’t connected to anything. The cord ends in a neat cut a foot from the phone.)', 'Please hold. You’re next. You have always been next.'],
          options: [bye('(Back away.)')],
        },
      },
    },
  });
  const echoPriya = echo(priya, {
    name: 'Priya?', role: 'Product manager', behavior: 'face-wall', mood: 'blank', alpha: 0.9,
    look: { shirt: '#26453f', bg: '#121a18' },
    barks: ['Someone ate my lunch.', 'Someone ate my lunch. Someone ate my lunch.'],
    dialog: {
      start: 'lunch',
      nodes: {
        lunch: { mood: 'blank', text: ['(She doesn’t turn around.)', 'Someone ate my lunch.'], options: [{ label: 'Who ate it?', next: 'who' }, bye('(Back away.)')] },
        who: { mood: 'glitch', text: ['It was always going to be eaten.', 'Everything in the fridge is eaten eventually. That’s what a fridge is for.'], options: [bye('(Back away.)')] },
      },
    },
  });
  const wallStarer = {
    name: 'Coworker', role: '?', behavior: 'face-wall', mood: 'blank', alpha: 0.9,
    look: { skin: '#a8a49c', hair: '#3a3a3a', hairStyle: 'short', shirt: '#4a4e58', bg: '#101216' },
    barks: ['…status report status report status report…', '…end of day end of day end of day…', '…circling back circling back…'],
    barkMin: 4,
    barkMax: 8,
    dialog: {
      start: 'a',
      nodes: {
        a: { mood: 'blank', text: ['(They don’t turn around.)', 'Status report. Status report. Status report.'], options: [{ label: 'Hello?', next: 'b' }, bye('(Back away.)')] },
        b: { mood: 'glitch', text: ['…Meet in the Linear Conference room.', 'Meet in the Linear Conference room.', 'Meet in the'], options: [bye('(Back away.)')] },
      },
    },
  };
  const samEcho = echo(sam, {
    name: 'Sam Lin', role: 'Intern', behavior: 'stand', mood: 'smile', alpha: 0.88,
    look: { shirt: '#3e5e3e', holding: null, bg: '#14200f' },
    barks: ['You came!', 'Everyone’s almost here.'],
    dialog: {
      start: 'hello',
      again: 'again',
      nodes: {
        hello: {
          mood: 'smile',
          text: (g) => [
            g.hasFlag('samComing') ? 'You came! I said I’d come with you. I got here first. Sorry. I was excited.' : 'You came! I knew you’d come.',
            'I came through the window. Well, the door. It was a window, and then it was a door, and then it was behind me.',
            'I’ve been here since… what day is it? They said the meeting starts when everyone arrives.',
          ],
          options: [{ label: 'Come with me. We’ll find a way back.', next: 'stay' }, { label: 'Who said that? Who’s “they”?', next: 'they', once: true }, bye('I’ll see you in there.')],
        },
        again: { mood: 'smile', text: ['Everyone’s almost here.'], options: [{ label: 'Come with me.', next: 'stay' }, bye()] },
        they: {
          mood: 'wide',
          text: ['The people in the room. You can hear them if you stand very still. Chairs. Papers. Somebody keeps clearing their throat.', 'They’re very patient. They’ve been waiting a long time.'],
          options: [{ label: 'Come with me.', next: 'stay' }, bye()],
        },
        stay: {
          mood: 'tired',
          text: ['I can’t. I’m not on the invite. Interns never are.', 'Go on. It’s down there, past the stone. They’re waiting for you.'],
          options: [bye('Okay.')],
        },
      },
    },
  });
  const danaEcho = echo(boss, {
    name: 'Dana Whitlock', role: 'Director of Operations', behavior: 'stand', face: 'e', mood: 'smile', alpha: 0.92,
    look: { blazer: '#1a1c24', bg: '#141018' },
    barks: ['There you are!', 'Perfect timing.'],
    flashBarks: ['Smile! For the newsletter.'],
    dialog: {
      start: 'hello',
      nodes: {
        hello: {
          mood: 'smile',
          text: ['There you are! Perfect timing. Everyone’s inside.', 'Status report?', '(You open your mouth. She holds up a hand.)', 'Kidding! Kidding. You can give it to them. They’re very excited to hear it.'],
          options: [{ label: 'Dana, what is this place?', next: 'what' }, bye('(Walk past her.)')],
        },
        what: {
          mood: 'glitch',
          text: ['It’s the Linear Conference room, silly. It was on the note.', 'It goes all the way down. Nobody’s ever reached the end of the agenda.', 'End of day! See you at end of day.'],
          options: [bye('(Walk past her.)')],
        },
      },
    },
  });
  /** Only visible in the light of the phone camera. Each flash, it is a step closer. */
  const faceless = {
    name: 'Figure', role: '', behavior: 'stand', spectral: true, ghost: true, mood: 'blank',
    look: { skin: '#141418', hair: '#0a0a0c', hairStyle: 'bald', shirt: '#121318', pants: '#0c0c10', shoes: '#08080a' },
    barks: null,
    onFlash(n, game) {
      const P = game.player;
      n.facing = Math.atan2(P.y - n.y, P.x - n.x);
      const d = U.dist(n.x, n.y, P.x, P.y);
      if (d > 60) {
        const step = Math.min(T, d - 50);
        const nx = n.x + Math.cos(n.facing) * step, ny = n.y + Math.sin(n.facing) * step;
        if (!game.level.solidAt(Math.floor(nx / T), Math.floor(ny / T))) {
          n.x = nx;
          n.y = ny;
        }
      }
      n.flashes = (n.flashes || 0) + 1;
      if (n.flashes === 1) game.toast('There was someone in the photo.', 'warn');
    },
  };

  LM.definePack({
    id: 'office',
    npcs: {
      receptionist, boss, priya, gary, tomas, kenji, brenda, sam, coworker, presenter, attendee,
      'echo-receptionist': echoReceptionist, 'echo-priya': echoPriya, 'wall-starer': wallStarer,
      'sam-echo': samEcho, 'dana-echo': danaEcho, faceless,
    },
  });
})();
