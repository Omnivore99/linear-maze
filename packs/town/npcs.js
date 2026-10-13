/* The Linear Maze — packs/town/npcs.js
 * Town pack, part 4: the people in town (and one cat).
 *
 *   nancy-pace        finds you in the coffee shop and warns you about Cyclic Psychoaffective Disorder
 *                     (behaviour 'seek-player': walks up to you and starts talking, once)
 *   barista           knew Alice: "She was here. She said she was looking for a way out of the maze."
 *   nook-clerk, nook-browser, nook-cat
 *                     the Book Nook. Pet the cat: "Not yet, human. Go ask Alice," and you're in the
 *                     Book Nook on Chessboard 2. After the Printing Press: "She went in the maze.
 *                     Follow that rabbit!"
 *   gas-clerk         Alice came by dressed for jogging
 *   sundial-stranger  Forking Paths Park: "Do you know what a Grabe is?" Then the Maze of Forking Paths.
 *   town-person       anyone else: give them props name, role, look, barks and lines
 *                     (lines: [[question, answer], ...]; "Have you seen Alice?" first, usually)
 * Flags: nancyWarned, askedBarista, nookCatPetted, nookCatSaid, metStranger
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const TOWN = (LM.TOWN = LM.TOWN || {});
  const APT = LM.APARTMENT;
  const think = (game, text) => LM.think(game, text);
  const go = (game, id) => APT.STORY.go(game, id);

  // ------------------------------------------------------------ behaviours
  /** Walk up to the player as soon as you see them, and start talking (once). */
  LM.npcBehaviors['seek-player'] = function (n, dt, game) {
    const P = game.player;
    if (n.mem.found || !P) {
      n.wantFace = P && n.distP < 140 ? Math.atan2(P.y - n.y, P.x - n.x) : n.facing;
      return;
    }
    if (!n.mem.spotted) {
      if (!(n.seeLos && n.distP < 360)) {
        n.wantFace = n.baseFacing;
        return;
      }
      n.mem.spotted = true;
      n.say(n.props.spotted || 'There you are!', 2.4);
    }
    // furniture in the way: step sideways for a moment; if that doesn't work, call out from where she is
    const m = n.mem;
    m.stuckT = (m.lastD || 9999) - n.distP < 0.2 ? (m.stuckT || 0) + dt : 0;
    m.lastD = n.distP;
    m.blocked = m.stuckT > 0 ? (m.blocked || 0) + dt : Math.max(0, (m.blocked || 0) - dt * 0.5);
    if (n.distP > 44 && !(m.blocked > 3 && n.distP < 200)) {
      if (m.detour > 0) {
        m.detour -= dt;
        n.mx = m.dx;
        n.my = m.dy;
        return;
      }
      if (m.stuckT > 0.35) {
        const a = Math.atan2(P.y - n.y, P.x - n.x) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        m.dx = Math.cos(a);
        m.dy = Math.sin(a);
        m.detour = 0.6;
        m.stuckT = 0;
        return;
      }
      const d = n.seeLos ? { x: (P.x - n.x) / n.distP, y: (P.y - n.y) / n.distP } : LM.nav.dir(game.level, n.x, n.y);
      if (d) {
        n.mx = d.x;
        n.my = d.y;
      }
      return;
    }
    if (game.state === 'play' && !LM.ui.modalOpen) {
      n.mem.found = true;
      LM.ui.dialog(game, n);
    }
  };
  /** Stand still, face the player, and start talking when they come close (once). */
  LM.npcBehaviors['wait-for-player'] = function (n, dt, game) {
    const P = game.player;
    n.wantFace = P && n.distP < 200 ? Math.atan2(P.y - n.y, P.x - n.x) : n.baseFacing;
    if (n.mem.found || !P || n.distP > (n.props.talkAt || n.def.talkAt || 64)) return;
    if (game.state === 'play' && !LM.ui.modalOpen) {
      n.mem.found = true;
      LM.ui.dialog(game, n);
    }
  };

  /** A dialog from [[question, answer], ...]: the questions are the options, the answers come back to the list. */
  function lines(intro, qa, bye) {
    const nodes = { start: { text: intro, options: [] } };
    qa.forEach(([q, a, extra], i) => {
      nodes['q' + i] = Object.assign({ text: a, options: [{ label: 'Something else…', next: 'start' }, { label: bye || 'Thanks.', end: true }] }, extra || {});
      nodes.start.options.push({ label: q, next: 'q' + i });
    });
    nodes.start.options.push({ label: bye || 'Thanks.', end: true });
    return { start: 'start', nodes };
  }
  TOWN.lines = lines;

  /** The cat leaves the way cats do: all at once. */
  function vanish(game, n) {
    game.particles.burst(n.x, n.y, 24, { type: 'ember', color: '#c8c0ff', speed: 90, life: 0.8, size: 1.2, drag: 2 });
    LM.audio.play('altar');
    game.npcs = game.npcs.filter((o) => o !== n);
  }
  TOWN.vanish = vanish;

  const npcs = {
    'nancy-pace': {
      name: 'Nancy Pace', role: 'A coffee shop regular', behavior: 'seek-player', speed: 90, face: 'w',
      look: { skin: '#e8c0a0', hair: '#8a8a90', hairStyle: 'bun', shirt: '#6a3a6a', pants: '#2a2a34', glasses: '#c8a050', holding: 'coffee', bg: '#3a2440' },
      barks: ['Be careful out there.', 'Don’t stare at anything that looks wrong.'], barkMin: 14, barkMax: 24,
      dialog: {
        start: (game) => (game.hasFlag('nancyWarned') ? 'again' : 'start'),
        nodes: {
          start: {
            text: ['It’s you! Oh, thank goodness. I saw you come in. Sit, sit. No, don’t sit. Listen.', 'Have you heard about this Cyclic Psychoaffective Disorder?'],
            mood: 'wide',
            options: [{ label: 'It was on the news last night.', next: 'spread' }, { label: 'What about it?', next: 'spread' }],
          },
          spread: {
            text: 'It’s spreading. Faster than they’re saying. And it is not what they say it is. It isn’t just in people’s heads.',
            options: [{ label: 'Then what is it?', next: 'what' }],
          },
          what: {
            text: ['The “hallucinations” can be triggered. Certain media. Certain images. Seeing something that’s wrong: an optical illusion, a picture that doesn’t add up, a room with one door too many.', 'Once you’ve seen it, you can’t unsee it. And then you’re… somewhere else.'],
            options: [{ label: 'How do you know all this?', next: 'how' }, { label: 'Have you seen Alice?', next: 'alice' }],
          },
          how: {
            text: 'Because I’ve been paying attention, and nobody else is. Be careful what you run into out there. If something looks wrong, don’t stare at it.',
            flag: 'nancyWarned',
            options: [{ label: 'Have you seen Alice?', next: 'alice' }, { label: 'I’ll be careful.', end: true }],
          },
          alice: {
            text: 'Alice? Not today. If she saw something wrong… look somewhere she knows. It pulls you into places you know. That’s the worst part.',
            flag: 'nancyWarned',
            options: [{ label: 'I’ll be careful.', end: true }],
          },
          again: { text: 'Remember: if it looks wrong, look away. And find Alice.', options: [{ label: 'I will.', end: true }] },
        },
      },
    },
    barista: {
      name: 'Jody', role: 'Barista', behavior: 'stand', face: 'n', reach: 22,
      look: { skin: '#c89070', hair: '#3a2010', hairStyle: 'ponytail', shirt: '#2e5a46', pants: '#2a2a2a', bg: '#1e3a2e' },
      barks: ['Next!', 'Oat milk’s out, sorry.', 'Medium drip, coming up.'], barkMin: 10, barkMax: 20,
      dialog: lines('Morning! The usual?', [
        ['Have you seen Alice?', 'Alice? She was here. She said she was looking for a way out of the maze. I don’t know what that meant. She didn’t order anything. She always orders something.', { flag: 'askedBarista' }],
        ['Just a coffee, thanks.', 'Medium drip. On the house: you look like you didn’t sleep. Or slept too much. One of those.', { do: (game) => { if (!game.player.data.townCoffee) { game.player.data.townCoffee = true; LM.combat.heal(game, game.player, 25); LM.audio.play('heal'); } } }],
        ['How’s business?', 'Slow. People aren’t going out much. Everyone’s nervous about this disorder thing. A guy yesterday said our menu board was “the wrong shape.” It’s a rectangle.'],
      ], 'See you.'),
    },
    'nook-clerk': {
      name: 'Walt', role: 'Book Nook · behind the counter', behavior: 'stand', face: 'w', reach: 22,
      look: { skin: '#e8c8a8', hair: '#d8d4cc', hairStyle: 'short', beard: '#d8d4cc', shirt: '#7a5a3a', blazer: '#4a3a2a', glasses: '#3a3a3a', bg: '#3a2a1a' },
      barks: ['Used books, fair prices.', 'No refunds on poetry.'], barkMin: 12, barkMax: 24,
      dialog: lines('Welcome to the Book Nook. Used books, fair prices, no refunds.', [
        ['Have you seen Alice?', 'Alice? Not for a while. She used to come in every Saturday and read half a book standing up. Haven’t seen her in… a while.'],
        ['Business slow?', 'People are worried. This mental disorder thing. Half my regulars think it’s catching. The other half think it’s in the books.'],
        ['Is it contagious?', 'The paper says absolutely not. Which is exactly what the paper would say, isn’t it.'],
      ], 'Thanks, Walt.'),
    },
    'nook-browser': {
      name: 'A browser', role: 'Book Nook · the fiction aisle', behavior: 'wander', roam: 2,
      look: { skin: '#9a6a4a', hair: '#1a1210', hairStyle: 'curly', shirt: '#4a6a8a', pants: '#3a3a4a', bg: '#22303e' },
      barks: ['They say it’s in the water.', 'My cousin’s kitchen turned into a hallway. For a whole day.', 'Don’t look at the magic eye posters. Trust me.', 'Is it contagious? It’s contagious, isn’t it.'],
      barkMin: 6, barkMax: 12, barkRange: 220,
      dialog: lines('Oh! Sorry, you scared me. Everybody’s jumpy lately.', [
        ['Have you seen Alice?', 'Who? No. I don’t think so. I’ve been trying not to look at people too closely, honestly.'],
        ['Jumpy about what?', 'The disorder. CPD. They say you start seeing things, and then you start being in the things. I’m only buying books with no pictures.'],
      ], 'Take care.'),
    },
    'nook-cat': {
      name: 'The shop cat', role: 'Book Nook · on the counter', radius: 7, behavior: 'stand', face: 's',
      barks: ['Mrrp.', '…', '(watches you)'], barkRange: 120, barkMin: 9, barkMax: 18,
      init(n, game) {
        n.portrait = () => APT.catPortrait();
        // gone once it has said its piece; back after the Printing Press, to say the rest
        const g = game || LM.game;
        if (g && g.hasFlag) {
          if (g.hasFlag('nookPressDone') ? g.hasFlag('nookCatSaid') : g.hasFlag('nookCatPetted') && g.levelId !== 'town-booknook') n.gone = true;
          if (g.hasFlag('nookPressDone')) n.behavior = 'wait-for-player';
        }
      },
      update(n, dt, game) {
        if (n.gone) game.npcs = game.npcs.filter((o) => o !== n);
      },
      draw(g, n, t) {
        g.rotate(n.facing);
        APT.catBody(g, t, true);
      },
      dialog: {
        start: (game) => (game.hasFlag('nookPressDone') ? 'rabbit' : 'start'),
        nodes: {
          start: {
            text: 'A gray cat on the counter, between the register and a jar of bookmarks. It watches you with the air of someone who works here and is not being paid enough.',
            options: [{ label: 'Pet the cat', next: 'notyet' }, { label: 'Leave it be', end: true }],
          },
          notyet: {
            text: 'The cat leans away from your hand, looks you in the eye, and says: “Not yet, human. Go ask Alice.”',
            options: [{ label: '…What?', end: true, do: (game, n) => petted(game, n) }],
          },
          rabbit: {
            text: 'The cat is back on the counter as if it never left. “She went in the maze,” it says. “Follow that rabbit!”',
            options: [{ label: 'What rabbit?', end: true, do: (game, n) => {
              game.setFlag('nookCatSaid');
              vanish(game, n);
              game.schedule(1.4, () => think(game, 'A rabbit. A maze. Alice jogged in the park… Forking Paths Park has paths that fork. That’s a maze, sort of.'));
            } }],
          },
        },
      },
    },
    'gas-clerk': {
      name: 'Dwayne', role: 'Falcon Gas · behind the desk', behavior: 'stand', face: 'n', reach: 22,
      look: { skin: '#7a4a30', hair: '#1a1410', hairStyle: 'short', shirt: '#c8302a', pants: '#2a2a34', bg: '#3a1a14' },
      barks: ['Pump four’s busted.', 'Bathroom key’s on the hubcap.'], barkMin: 12, barkMax: 22,
      dialog: lines('Help you?', [
        ['Have you seen Alice?', 'Alice? Yeah, she came by. Dressed for jogging, which was weird, ’cause she drove here. Bought a water and a map of the park. Who buys a map of a park?', { flag: 'gasHint' }],
        ['Anything strange lately?', 'Guy came in yesterday, paid for gas at pump nine. We got eight pumps. I gave him his change anyway. Seemed easier.'],
      ], 'Thanks, Dwayne.'),
    },
    'sundial-stranger': {
      name: 'An odd-looking man', role: 'Forking Paths Park · by the sundial', behavior: 'wait-for-player', face: 'w',
      look: { skin: '#d8d0c8', hair: '#b8b0a8', hairStyle: 'long', shirt: '#4a4a3a', blazer: '#2a2a22', pants: '#3a3a30', glasses: '#1a1a1a', bg: '#2a2a20' },
      init(n, game) {
        const g = game || LM.game;
        if (g && g.hasFlag && g.hasFlag('mazeDone')) n.behavior = 'stand';
      },
      dialog: {
        start: (game) => (game.hasFlag('mazeDone') ? 'back' : 'start'),
        nodes: {
          start: {
            text: ['He doesn’t look up from the sundial. His shadow and the sundial’s shadow point in different directions.', '“Do you know what a Grabe is? It’s the plot of land around a sundial.” He frowns. “Where did I learn that?”'],
            options: [{ label: 'Have you seen Alice?', next: 'alice' }, { label: '…I should go.', next: 'alice' }],
          },
          alice: {
            text: '“She asked me the same thing. The Grabe. The paths. They fork, you know, here, and here, and here.” He points at the sundial’s face. The lines on it are not hours. They are corridors.',
            options: [{ label: 'Look closer at the sundial', end: true, do: (game) => intoTheMaze(game) }],
          },
          back: { text: '“You found your way back,” he says. “Most people only find the way in.”', options: [{ label: 'Where is Alice?', next: 'where' }, { label: 'Goodbye.', end: true }] },
          where: { text: '“Somewhere familiar. Isn’t everywhere?” He goes back to the sundial.', options: [{ label: 'Goodbye.', end: true }] },
        },
      },
    },
    'town-person': {
      name: 'Someone', role: 'Town', behavior: 'stand',
      look: { skin: '#d8a888', hair: '#3a2a1a', shirt: '#5a6a7a', pants: '#2a2a34', bg: '#2a3038' },
      barkMin: 10, barkMax: 20,
      init(n) {
        if (n.props.lines) n.props.dialog = lines(n.props.intro || 'Hi.', n.props.lines, n.props.bye);
      },
    },
  };

  function petted(game, n) {
    game.setFlag('nookCatPetted');
    vanish(game, n);
    game.flashT = 0.6;
    LM.get('effects', 'flicker').run(game, { radius: 900, time: 1.4, strength: 0.95 });
    game.schedule(1.2, () => think(game, 'Did that cat just talk? Did it just… The lights. Something’s wrong with the lights.'));
    game.schedule(2.6, () => go(game, 'town-booknook-cb2'));
  }
  function intoTheMaze(game) {
    game.setFlag('metStranger');
    game.flashT = 0.7;
    LM.audio.play('altar');
    LM.get('effects', 'flicker').run(game, { radius: 900, time: 1.6, strength: 0.95 });
    game.schedule(1, () => think(game, 'The lines on the sundial. They go down. They go in.'));
    game.schedule(2.4, () => go(game, 'maze-forking-paths'));
  }
  TOWN.intoTheMaze = intoTheMaze;

  // ------------------------------------------------------------ "Alice really liked the sundial."
  LM.on('levelLoaded', (game) => {
    if (game.attract || !game.player || game.levelId !== 'town-park') return;
    game.schedule(0.5, function watch() {
      if (game.levelId !== 'town-park' || game.hasFlag('sundialNote')) return;
      const dial = game.items.find((i) => i.def.id === 'town-prop' && i.props.kind === 'sundial');
      const P = game.player;
      if (dial && U.dist(P.x, P.y, dial.x, dial.y) < 6 * T) {
        game.setFlag('sundialNote');
        game.toast('Alice really liked the sundial.', 'key');
        return;
      }
      game.schedule(0.3, watch);
    });
  });

  LM.definePack({ id: 'town', npcs });
})();
