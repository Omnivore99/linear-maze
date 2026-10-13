/* The Linear Maze — packs/apartment/story.js
 * Apartment pack, part 4: the evening's story, and Home on Chessboard 1.
 *
 * Chessboard 0 (level 'apartment', dinner: true)
 *   Tasks (top right): Eat dinner → Cook pizza in oven → Eat pizza;  Watch TV to relax.
 *   fridge "Get frozen pizza" (aptPizzaOut) → oven "Cook pizza" (aptPizzaCooked)
 *   → kitchen table "Eat pizza" (ateDinner)
 *   EVENT 1: the red phone rings. "The line goes dead." (aptRing1)
 *            then the TV has the breaking news (aptNews)
 *   EVENT 2: it rings again. A voice: "Call yourself in reverse order." (heardReverse)
 *            Dialing your own number backwards (701-0555) takes you to Home (Chessboard 1).
 *
 * Chessboard 1 (level 'home-cb1', warped: true, noSignal: true)
 *   Task: I'm having a hallucination! Seek help!
 *   The red phone is busy (cb1TriedPhone), the cell phone has no signal (cb1TriedCell),
 *   or you step out into the hall (cb1LeftHome) → seekDave → Task: See if Dave (Friend) is home.
 *   Dave's door (7F, props.leadsTo) opens into the Library Maze. Coming back from the
 *   library's last floor sets libraryDone and puts you outside Dave's door.
 *   libraryDone → the red phone is no longer busy (packs/rotary, busy.until), and
 *   Task: I'm tired! Get some rest. The bed offers Sleep (slept): the screen goes black, and you
 *   wake up in the Chessboard 0 apartment. The stairs here stay roped off.
 *   The lights in each room dim and come back at random.
 *
 * The morning (level 'apartment' again, after slept)
 *   Task: Get ready for work. The dresser pulses: "Get dressed for work" (dressed) → the red phone
 *   rings. Task: Answer the phone. It's Alice (aliceCalled) → Task: Rescue Alice, and the rope drops
 *   (timeToLeave). The stairs lead to the Town Map (the apartment's exitTo; packs/town).
 *
 * Story floors' exits (any level): exitTo pins where the stairs/exit lead, even after the editor's
 * floor order has rewritten `next`; exitIntro replaces the next floor's intro on the way out.
 *
 * All the words are in APT.PIZZA / APT.NEWS / APT.CALLS / APT.TASKS / APT.WARPED below.
 * Hooks used by packs/apartment/items.js: APT.STORY.tv(game), APT.STORY.knob(game, item).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const APT = (LM.APARTMENT = LM.APARTMENT || {});
  const MEMOS = LM.MEMOS;
  const think = (game, text) => LM.think(game, text);

  // ================================================================ words
  APT.TASKS = {
    dinner: { get: 'Eat dinner', cook: 'Cook pizza in oven', eat: 'Eat pizza', done: 'Eat dinner' },
    tv: 'Watch TV to relax',
    call: 'Call yourself in reverse order',
    seek: 'I’m having a hallucination! Seek help!',
    dave: 'See if Dave (Friend) is home',
    tired: 'I’m tired! Get some rest',
    ready: 'Get ready for work',
    answer: 'Answer the phone',
    alice: 'Rescue Alice',
  };
  APT.MORNING = {
    tired: 'I’m so tired. Everything will make more sense after some sleep.',
    bed: ['Your own bed, in a room that is almost your room. The blanket is the wrong color. You are too tired to care.', 'You could sleep for a week.'],
    sleep: 'You sleep.',
    wake: 'Morning. The real kind, it looks like. The blanket is the right color again.',
    dresser: ['Work clothes, work clothes, work clothes. Today you are going to be a normal person who goes to a normal job.'],
    dressed: 'Shirt, pants, the good socks. You look like someone who works somewhere. Then, from the kitchen: the red phone.',
    ring: 'The red phone is ringing!',
    alice: '“Hi, this is Alice. I’m not sure where I am. It’s one of our familiar places . . . but it doesn’t look right. I’m okay right now, but I think things are looking for me. Maybe from work. I don’t know. It’s strange.\n\nCome find me! Maybe you can help me get out of wherever this is!”\n\nShe hangs up.',
    after: 'Alice. She sounded scared. Work can wait.',
  };
  APT.PIZZA = {
    get: 'In the freezer, behind a bag of peas older than your lease: one frozen pizza. Pepperoni. “Restaurant Quality,” it says, under a photo of a restaurant you have never seen.',
    oven: [
      'First the takeout menus have to come out of the oven: Thai, pizza, Thai, the Portuguese place you keep meaning to try. You stack them on the counter. First time for everything.',
      'Preheat to 425°. Twelve to fifteen minutes, says the box. The box is very confident.',
    ],
    cooked: 'The kitchen fills with the smell of pizza. Fourteen minutes later it comes out looking almost exactly like the picture on the box. You put it on a plate on the kitchen table like a civilized person.',
    warm: 'The oven is still warm. It seems pleased to have been asked.',
    table: ['The pizza, on a plate, on the kitchen table, steaming. Your laptop pushed politely to one side.'],
    eaten: 'You eat the whole thing, which you had planned to be half. It is the best thing that has happened all day, and today was a strange day.',
  };
  APT.NEWS = {
    channel: 'Channel 4 · Evening News',
    banner: 'Breaking news',
    text: [
      'Medical experts say a new psychological diagnosis, Cyclic Psychoaffective Disorder, is being reported on the rise in the tri-county area.',
      'Symptoms include hallucinations, strange behavior, and paranoia.',
      'If you are suffering any of those symptoms, please seek medical care at once.',
    ],
    crawl: 'CYCLIC PSYCHOAFFECTIVE DISORDER ON THE RISE IN TRI-COUNTY AREA  •  SYMPTOMS INCLUDE HALLUCINATIONS, STRANGE BEHAVIOR, PARANOIA  •  SEEK MEDICAL CARE AT ONCE  •  LINEAR EXPRESSWAY STILL BACKED UP TO THE HORIZON  •',
    thought: 'That explains the surreal experience at work today! I must be imagining things!',
  };
  APT.CALLS = {
    ring1: { notice: 'That phone has never rung before!', answer: 'The line goes dead.' },
    ring2: {
      notice: 'The red phone is ringing again!', thought: 'What is going on??',
      who: 'A voice', answer: '“Call yourself in reverse order.”\n\nClick. They hang up.', after: 'That voice sounds like me.',
    },
  };

  // Home on Chessboard 1: the same apartment, warped. items.js reads these on a floor with warped: true.
  APT.WARPED = {
    BOOKS_TEXT: 'The same paperbacks, almost. The spines have gone soft, like candles left in a hot car. Some of the titles have changed while you weren’t looking. Some of them are still changing.',
    BOOKS: [
      { title: 'Lonesome Planet: Portugone (2040 edition)', note: 'Every page about Lisbon has been folded into a tiny paper tram. The trams are all going the other way.' },
      { title: '1,001 Places to See Before You Die Again', note: 'You have seen all of them. All of them were the airport.' },
      { title: 'Learn Italian in 30 Years', note: 'The bookmark is on day four. It has been on day four for eleven years. Day four is still about coffee.' },
      { title: 'Moby-Duck', note: 'Call me Ishmael. Call me later. Call me back. Call yourself.' },
      { title: 'The Joy of Cooking Pizza in Oven', note: 'One recipe, eight hundred pages. Step one: get frozen pizza. Step two: cook pizza in oven. Step three is step one.' },
      { title: 'A Brief History of Time, Briefer', note: 'It has one page. The page says “Again.”' },
      { title: 'Through the Looking-Glass, and Back, and Through Again', note: '“’Twas brillig” is underlined in pencil. Then in pen. Then, in what you hope is marker, TWAS BRILLIG.' },
      { title: 'Chess for Beginners Who Have Begun Before', note: 'Chapter one: a pawn that reaches the far side of the board becomes something else. Chapter two: the pawn is you. There is no chapter three.' },
      { title: 'Atlas of Remote Islands, Not Including This One', note: 'Fifty islands. Page fifty-one is the floor plan of your apartment, labeled UNCHARTED.' },
      { title: 'Linear Algebra Done Left', note: 'Every equation in it solves to 7C.' },
      { title: 'The Big Book of Office Etiquette :) :)', note: 'Every chapter is the chapter on status reports. Every page has a smiley face. The smiley faces are smiling a little more than yesterday.' },
      { title: 'Travel Heavy: A Maximalist’s Guide', note: 'Pack everything. Bring the apartment. You will need it where you are going.' },
      { title: '(no title) (still)', note: 'The thin, warm book. You open it. It is a list of everything you did today, in order. The last line is “opened a book.” You shut it before it can write the next line.' },
    ],
    CHANNELS: [
      { name: 'Channel 4 · Evening Snooze', text: 'The anchor reads yesterday’s news, word for word, then reads it again, slower. Traffic on the Linear Expressway is backed up all the way to the horizon, and the horizon is backed up all the way to here.' },
      { name: 'Channel 7 · Wonderlost', text: 'The travel host rides a yellow tram up a steep hill. At the top of the hill, the tram is at the bottom of the hill. He rides it up again. He looks less happy every time. “You could do this,” he tells the camera. It doesn’t sound like a recommendation.' },
      { name: 'Channel 12 · Flip This Floor Plan… Again', text: 'The couple knocks down a wall to open up the space. Behind it is their own living room, from the other side. They knock that down too. The applause is on a loop. You can hear where the loop starts.' },
      { name: 'Channel 23 · Nature Hour Hour', text: 'Salmon swim upstream to where they started, then turn around and swim upstream to where they started. “Remarkable,” says the narrator, for the ninth time, more quietly.' },
      { name: 'Channel 88 · Home Shopping Shopping', text: 'For three easy payments: a chessboard with no edges. “The game never ends!” Operators are standing by. All of the operators are the same operator. She waves at you specifically.' },
      { name: 'Channel 0', text: 'Static. Under it, very faint, your own voice reading a phone number backwards. You turn it off. It takes a moment to turn off.' },
    ],
    RADIO_FACE: 'The red numbers blink: 6:30, nothing, 6:30, nothing, the way clocks do after a power cut. There wasn’t a power cut. It feels both earlier and later than 6:30.',
    RADIO: [
      '“…it’s 6:30, and it’s 6:30, and traffic on the Linear Expressway is backed up all the way to the horizon, where it’s also 6:30…”',
      '“…next up, a song about leaving, by a band that has been playing it since 1978…”',
      '“…a caller on line four. Go ahead, line four. …Line four says you know who this is. Do you know who this is?”',
    ],
    MAGAZINE: {
      title: 'Architectural Disasters',
      text: 'The cover: a staircase that climbs up into itself. THE CORRIDOR THAT NEVER ENDS, AND WHY IT SHOULD NEVER HAVE STARTED.\n\nOn the masthead, in small print: “We’ve been printing the same issue every month since 1978.”\n\nYou flip through it. They have. Every floor plan has one more room than it should. Page 41 is your apartment.',
    },
    LAVA: [
      'A lava lamp, where your laptop should be. You have never owned a lava lamp.',
      'The wax rises, splits in two, sinks, joins up again, rises. It is warm. You follow the cord to the wall: it isn’t plugged into anything.',
    ],
    FRIDGE_TEXT: [
      'The light comes on, thinks about it, and stays on. Inside: a carton of lo mein, the end of the turkey, a yogurt, one olive in a jar.',
      'In the freezer, behind the peas: one frozen pizza. You ate it. It’s here.',
    ],
    OVEN_TEXT: ['The takeout menus are back in the oven, neatly stacked: Thai, pizza, Thai, the Portuguese place. You took them out an hour ago. The tram on the Portuguese menu is going the other way now.'],
    NEIGHBORS: {
      '7A': { name: 'Mrs. Albright', note: 'The wreath has been turned inside out, somehow.' },
      '7B': { name: 'The Okonkwos', note: 'Two pairs of running shoes by the door, pointing at it. Muddy on the inside.' },
      '7D': { name: 'Theo', note: 'The sticker on the door: HONK IF YOU’VE SEEN MY CAT. Under it, newer, in marker: I HAVE SEEN MY CAT. IT IS IN THE HALL.' },
      '7E': { name: 'No name on the buzzer', note: 'The peephole is lit, as though someone is standing right behind it holding a flashlight.' },
      '7F': {
        name: 'Dave (Friend)', note: 'Dave’s door. Dave has lived here as long as you have. Dave will know what to do. Dave always knows what to do.',
        knock: 'Nothing. No footsteps, no TV, no Dave yelling “it’s open.” Just the hum of the hall lights, dimming and coming back.',
      },
    },
  };

  // ================================================================ helpers
  const S = (APT.STORY = APT.STORY || {});
  const def = (game) => (game && game.level ? game.level.def : {});
  const has = (game, f) => game.hasFlag(f);

  // ------------------------------------------------------------ the tasks, top right
  // the morning after (the apartment again, once you've slept)
  const morning = (game) => !!def(game).dinner && has(game, 'slept');
  MEMOS.hudLines.push((game) => {
    if (!morning(game)) return null;
    return ['Task', !has(game, 'dressed') ? APT.TASKS.ready : !has(game, 'aliceCalled') ? APT.TASKS.answer : APT.TASKS.alice];
  });
  MEMOS.hudLines.push((game) => {
    if (!def(game).dinner || morning(game)) return null;
    const step = APT.pizzaStep(game);
    return ['Task', (step === 'done' ? '✓ ' : '') + APT.TASKS.dinner[step]];
  });
  MEMOS.hudLines.push((game) => (def(game).dinner && !morning(game) ? ['Task', (has(game, 'aptNews') ? '✓ ' : '') + APT.TASKS.tv] : null));
  MEMOS.hudLines.push((game) => (def(game).dinner && !morning(game) && has(game, 'heardReverse') ? ['Task', APT.TASKS.call] : null));
  MEMOS.hudLines.push((game) => {
    if (!def(game).warped) return null;
    if (has(game, 'libraryDone')) return ['Task', APT.TASKS.tired];
    return ['Task', has(game, 'seekDave') ? APT.TASKS.dave : APT.TASKS.seek];
  });

  // ------------------------------------------------------------ the phone calls
  function ring1(game) {
    const c = APT.CALLS.ring1;
    LM.ROTARY.ring(game, { notice: c.notice, answer: c.answer, onAnswer: (g) => g.setFlag('aptRing1') });
  }
  function ring2(game) {
    const c = APT.CALLS.ring2;
    LM.ROTARY.ring(game, { notice: c.notice, who: c.who, answer: c.answer, thought: c.after, onAnswer: (g) => g.setFlag('heardReverse') });
    game.schedule(1.6, () => think(game, c.thought));
  }
  const here = (game, id) => game.levelId === id && game.player && !game.attract;
  LM.on('flag', ({ name, game }) => {
    if (!def(game).dinner) return;
    if (name === 'ateDinner') game.schedule(3, () => here(game, 'apartment') && !has(game, 'aptRing1') && ring1(game));
    if (name === 'heardReverse') game.schedule(2.5, () => think(game, 'Call myself? My own number is right there on the phone. …In reverse order?'));
  });

  // ------------------------------------------------------------ the TV
  S.tv = function (game) {
    if (!def(game).dinner) return false;
    if (game.rotaryRing) {
      think(game, 'The phone. The red phone is ringing.');
      return true;
    }
    if (!has(game, 'ateDinner')) {
      think(game, 'Dinner first. Then TV. That’s the whole plan.');
      return false; // the channels still work
    }
    if (has(game, 'aptRing1') && !has(game, 'aptNews')) {
      news(game);
      return true;
    }
    return false;
  };
  function news(game) {
    const N = APT.NEWS;
    LM.audio.play('alarm');
    game.setFlag('watchedTV');
    LM.ui.open({
      kicker: 'Living room · TV', title: N.channel, wide: true,
      body: APT.tvScreen(N.channel, N.text, N.banner, N.crawl),
      actions: [{ label: 'Turn it off', primary: true, key: 'E' }],
      onClose: () => {
        if (has(game, 'aptNews')) return;
        game.setFlag('aptNews');
        setTimeout(() => think(game, N.thought), 300);
        game.schedule(7, () => here(game, 'apartment') && !has(game, 'heardReverse') && ring2(game));
      },
    });
  }

  // ------------------------------------------------------------ Dave's door (any neighbor door with props.leadsTo)
  S.knob = function (game, it) {
    const to = it.props.leadsTo;
    if (!to || !LM.find('levels', to)) return false;
    if (has(game, 'libraryDone')) {
      LM.audio.play('locked');
      setTimeout(() => LM.ui.showText(APT.WARPED.NEIGHBORS['7F'].name, 'Locked now. From somewhere behind the door, very faintly, someone says: “Shhh.”', 'Unit ' + it.props.unit), 0);
      return true;
    }
    LM.audio.play('door');
    game.setFlag('open-' + it.props.unit);
    game.setFlag('triedDaveDoor');
    setTimeout(() => {
      LM.ui.open({
        kicker: 'Unit ' + it.props.unit, title: 'The door is open',
        body: h('div', { class: 'lore-block' },
          h('p', { class: 'lore' }, 'The knob turns. The door swings inward, slowly, onto the smell of old paper and floor wax.'),
          h('p', { class: 'lore' }, 'There is no apartment behind it. There are shelves. Shelves, and shelves, and shelves, going back much further than the building does.')),
        actions: [{ label: 'Go in', primary: true, key: 'E', onClick: () => go(game, to) }, { label: 'Not yet', quiet: true }],
      });
    }, 0);
    return true;
  };
  /** Go straight to another floor, carrying everything (like the stairs). */
  function go(game, levelId) {
    const carry = game.player.serialize();
    setTimeout(() => {
      LM.ui.closeAll();
      game.loadLevel(levelId, carry, false);
      game.state = 'play';
      game.flashT = 0.4;
    }, 0);
  }
  S.go = go;

  // ------------------------------------------------------------ bedtime on Chessboard 1, and the morning after
  const tired = (game) => !!def(game).warped && has(game, 'libraryDone') && !has(game, 'slept');
  S.bedPrompt = (game) => (tired(game) ? 'Sleep' : null);
  S.bed = function (game) {
    if (!tired(game)) return false;
    LM.ui.open({
      kicker: 'Bedroom', title: 'Your bed',
      body: h('div', { class: 'lore-block' }, ...APT.MORNING.bed.map((p) => h('p', { class: 'lore' }, p))),
      actions: [{ label: 'Sleep', primary: true, key: 'E', onClick: () => sleep(game) }, { label: 'Not yet', quiet: true }],
    });
    return true;
  };
  LM.ui.addStyles(`
    .apt-sleep { position: absolute; inset: 0; z-index: 30; background: #000; opacity: 0; transition: opacity 1.4s ease; display: grid; place-items: center; pointer-events: none; }
    .apt-sleep.on { opacity: 1; pointer-events: auto; }
    .apt-sleep p { color: #8a8478; font: italic 400 20px/1.4 var(--font-lore); opacity: 0; transition: opacity 1.2s ease 0.8s; }
    .apt-sleep.on p { opacity: 1; }
  `);
  /** Fade to black, then wake up in the Chessboard 0 apartment. */
  function sleep(game) {
    game.setFlag('slept');
    LM.audio.play('altar');
    const app = document.getElementById('app');
    const veil = h('div', { class: 'apt-sleep' }, h('p', null, APT.MORNING.sleep));
    app.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('on'));
    setTimeout(() => {
      game.player.hp = game.player.stats().maxHp;
      const carry = game.player.serialize();
      LM.ui.closeAll();
      game.loadLevel('apartment', carry, false);
      game.state = 'play';
      veil.classList.remove('on');
      setTimeout(() => veil.remove(), 1600);
    }, 3600);
  }
  S.sleep = sleep;
  const dressing = (game) => morning(game) && !has(game, 'dressed');
  S.dresserPrompt = (game) => (dressing(game) ? 'Get dressed for work' : null);
  S.dresser = function (game) {
    if (!dressing(game)) return false;
    LM.ui.open({
      kicker: 'Bedroom', title: 'The dresser',
      body: h('div', { class: 'lore-block' }, ...APT.MORNING.dresser.map((p) => h('p', { class: 'lore' }, p))),
      actions: [
        { label: 'Get dressed for work', primary: true, key: 'E', onClick: () => {
          game.setFlag('dressed');
          LM.audio.play('pickup');
          setTimeout(() => LM.ui.showText('Dressed', APT.MORNING.dressed, 'Bedroom'), 0);
          game.schedule(2.5, () => here(game, 'apartment') && ringAlice(game));
        } },
        { label: 'Not yet', quiet: true },
      ],
    });
    return true;
  };
  function ringAlice(game) {
    if (has(game, 'aliceCalled') || game.rotaryRing) return;
    const M = APT.MORNING;
    LM.ROTARY.ring(game, {
      notice: M.ring, who: 'Alice', answer: M.alice, thought: M.after,
      onAnswer: (g) => {
        g.setFlag('aliceCalled');
        g.setFlag('timeToLeave'); // the rope drops: the stairs lead to town
        g.schedule(1.6, () => g.toast('New task: ' + APT.TASKS.alice, 'key'));
      },
    });
  }
  S.ringAlice = ringAlice;

  // ------------------------------------------------------------ where a story floor's exit leads
  // The editor's floor order (packs/editor/edits.js) rewrites every floor's `next` so a run goes down
  // its list, and finishing the last floor on the list wins the game. The story's exits don't follow
  // a list: the library's door 7F leads home, and home's stairs lead back to work. So a level can pin
  // its own exit with exitTo, and exitIntro (optional) is shown instead of the next floor's intro.
  LM.on('levelLoaded', (game) => {
    const d = def(game);
    if (d.exitTo && LM.find('levels', d.exitTo)) d.next = d.exitTo;
  });
  const showLevelComplete = LM.ui.showLevelComplete;
  LM.ui.showLevelComplete = function (game, nextId, onContinue) {
    const d = def(game), next = LM.find('levels', nextId);
    if (!d.exitIntro || !next) return showLevelComplete.call(this, game, nextId, onContinue);
    const intro = next.intro;
    next.intro = d.exitIntro;
    try {
      return showLevelComplete.call(this, game, nextId, onContinue);
    } finally {
      next.intro = intro;
    }
  };

  // ------------------------------------------------------------ the cell phone on a floor with noSignal: true
  const phone = LM.get('gadgets', 'phone');
  const phoneUse = phone.use;
  phone.use = function (game, P) {
    if (!def(game).noSignal) return phoneUse.call(this, game, P);
    LM.input.mouse.down = false;
    game.setFlag('cb1TriedCell');
    LM.audio.play('locked');
    LM.ui.open({
      kicker: 'No service', title: 'No signal', className: 'phone-panel',
      body: h('div', { class: 'ph-empty', style: 'padding:40px 10px;text-align:center' }, 'No signal.'),
      actions: [{ label: 'Put it away', primary: true, key: 'F' }],
      onClose: () => setTimeout(() => think(game, 'No signal. In my own apartment. In the middle of the city.'), 300),
    });
  };

  // ------------------------------------------------------------ Chessboard 1: seeking help
  const OUTSIDE = ['The Seventh Floor', 'Elevator Lobby', 'The Stairwell'];
  LM.on('flag', ({ name, game }) => {
    if (!def(game).warped) return;
    if (['cb1TriedPhone', 'cb1TriedCell', 'cb1LeftHome'].includes(name) && !has(game, 'seekDave') && !has(game, 'libraryDone')) {
      game.setFlag('seekDave');
      game.schedule(1.4, () => {
        game.toast('New task: ' + APT.TASKS.dave, 'key');
        game.schedule(1.8, () => think(game, 'Dave. Dave’s in 7F, at the end of the hall. Dave will know what to do.'));
      });
    }
  });

  // an invisible helper on the floor: watches where you are, and (on a warped floor) works the lights
  const items = {
    'apt-story': {
      name: 'Apartment story (helper)', dressing: false, radius: 1, shadow: false,
      update(it, dt, game) {
        const P = game.player;
        if (!P || game.attract) return;
        const d = def(game);
        if (d.warped) {
          it.t2 = (it.t2 || 0) - dt;
          if (it.t2 <= 0) {
            it.t2 = 0.25;
            const r = game.level.roomAt(P.x, P.y);
            if (r && OUTSIDE.includes(r.name)) game.setFlag('cb1LeftHome');
          }
          flicker(it, dt, game);
        }
      },
    },
  };
  /** Each room's lights dim to somewhat dimmer, now and then, and come back. */
  function flicker(it, dt, game) {
    if (!it.groups) {
      const map = new Map();
      for (const li of game.staticLights) {
        if (li.flicker) continue;
        const r = game.level.roomAt(li.x, li.y), k = r ? r.name : '';
        if (!map.has(k)) map.set(k, { lights: [], t: U.rand(0.5, 5), dim: false });
        li.base = li.intensity;
        map.get(k).lights.push(li);
      }
      it.groups = [...map.values()];
    }
    for (const g of it.groups) {
      g.t -= dt;
      if (g.t > 0) continue;
      g.dim = !g.dim;
      const k = g.dim ? U.pick([0.5, 0.6]) : 1;
      for (const li of g.lights) li.intensity = li.base * k;
      // a dip is sometimes a quick stutter, sometimes a long sag
      g.t = g.dim ? (U.chance(0.45) ? U.rand(0.07, 0.18) : U.rand(0.6, 2.4)) : U.chance(0.3) ? U.rand(0.08, 0.3) : U.rand(1.5, 7);
    }
  }

  // ------------------------------------------------------------ arriving
  LM.on('levelLoaded', (game) => {
    const P = game.player, d = def(game);
    if (!P || game.attract) return;
    const prev = P.data.lastLevel;
    P.data.lastLevel = game.levelId;
    if (!d.dinner && !d.warped) return;
    game.spawnItem('apt-story', game.level.start.x, game.level.start.y);
    if (d.dinner && has(game, 'slept')) {
      // the morning after: wake up beside the bed
      const bed = game.items.find((i) => i.def.id === 'apt-bed');
      if (bed && !game.rotaryArrival && !has(game, 'dressed')) {
        P.x = bed.x - bed.box[0] / 2 - 24;
        P.y = bed.y;
        P.lastSafe = { x: P.x, y: P.y };
        game.cam.x = P.x;
        game.cam.y = P.y;
      }
      if (P.data.phone) {
        P.data.phone.clock = 7 * 3600 + 12 * 60;
        P.data.phone.late = true;
      }
      if (!has(game, 'woke')) {
        game.setFlag('woke');
        game.schedule(1.8, () => think(game, APT.MORNING.wake));
        game.schedule(4, () => game.toast('New task: ' + APT.TASKS.ready, 'key'));
      }
      if (has(game, 'dressed') && !has(game, 'aliceCalled')) game.schedule(2, () => here(game, 'apartment') && ringAlice(game));
      return;
    }
    if (d.dinner) {
      // events pick up where they left off
      if (has(game, 'ateDinner') && !has(game, 'aptRing1')) game.schedule(2, () => here(game, 'apartment') && ring1(game));
      else if (has(game, 'aptNews') && !has(game, 'heardReverse')) game.schedule(3, () => here(game, 'apartment') && ring2(game));
      else if (!has(game, 'ateDinner')) game.schedule(2.5, () => think(game, 'Home. Dinner, then TV. That’s the whole plan.'));
      return;
    }
    // Chessboard 1
    if (prev && prev.indexOf('library') === 0) {
      game.setFlag('libraryDone');
      const door = (game.level.tags.door7F || [])[0];
      if (door) {
        P.x = door.x * T + T / 2;
        P.y = (door.y + 1) * T + T / 2;
        P.lastSafe = { x: P.x, y: P.y };
        P.aim = Math.PI / 2;
        game.cam.x = P.x;
        game.cam.y = P.y;
      }
      game.schedule(1.2, () => think(game, 'That was Dave’s door. That was the hall. My hall. …Right?'));
      game.schedule(4.5, () => {
        if (!def(game).warped || has(game, 'slept')) return;
        game.toast('New task: ' + APT.TASKS.tired, 'key');
        game.schedule(1.8, () => think(game, APT.MORNING.tired));
      });
      return;
    }
    if (!has(game, 'cb1Arrived')) {
      game.setFlag('cb1Arrived');
      game.schedule(2.2, () => think(game, 'This is my apartment. Isn’t it? It’s my apartment. It’s… a little different.'));
      game.schedule(5.5, () => think(game, 'I’m having a hallucination. That’s all. The news said. I need help.'));
    }
  });

  // ------------------------------------------------------------ a stray cat at the end of the hall
  function catBody(g, t, sitting) {
    // seen from above: tail, body, head, ears
    g.strokeStyle = '#6a6a72';
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-6, 0);
    g.quadraticCurveTo(-11, 5 + Math.sin(t * 2) * 3, -13, 1 + Math.sin(t * 2.6) * 4);
    g.stroke();
    g.fillStyle = '#7a7a84';
    g.beginPath();
    g.ellipse(-1, 0, sitting ? 6 : 7.5, 4.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#86868f';
    g.beginPath();
    g.arc(5, 0, 3.8, 0, U.TAU);
    g.fill();
    g.fillStyle = '#6a6a72';
    g.beginPath();
    g.moveTo(5.5, -3.2); g.lineTo(8.5, -4.6); g.lineTo(7.4, -1.4);
    g.moveTo(5.5, 3.2); g.lineTo(8.5, 4.6); g.lineTo(7.4, 1.4);
    g.fill();
    g.fillStyle = '#f4f1ea';
    g.beginPath();
    g.arc(2, 3.6, 1.3, 0, U.TAU);
    g.fill();
  }
  function catPortrait() {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    c.className = 'icon';
    c.style.width = c.style.height = '96px';
    const g = c.getContext('2d');
    g.fillStyle = '#2a2a30';
    g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#7a7a84';
    g.beginPath();
    g.moveTo(22, 40); g.lineTo(26, 12); g.lineTo(42, 30);
    g.moveTo(74, 40); g.lineTo(70, 12); g.lineTo(54, 30);
    g.fill();
    g.beginPath();
    g.ellipse(48, 52, 30, 26, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = '#d8c040';
    for (const x of [36, 60]) {
      g.beginPath();
      g.ellipse(x, 48, 6, 7, 0, 0, U.TAU);
      g.fill();
    }
    g.fillStyle = '#121214';
    for (const x of [36, 60]) g.fillRect(x - 1.2, 42, 2.4, 12);
    g.fillStyle = '#d88a9a';
    g.beginPath();
    g.moveTo(44, 60); g.lineTo(52, 60); g.lineTo(48, 64);
    g.fill();
    g.strokeStyle = 'rgba(240,240,240,0.7)';
    g.lineWidth = 1;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(48 + s * 8, 63 + i * 2);
        g.lineTo(48 + s * 34, 58 + i * 5);
        g.stroke();
      }
    }
    return c;
  }
  APT.catBody = catBody; // the Book Nook's cat uses these too (packs/town)
  APT.catPortrait = catPortrait;
  const npcs = {
    'apt-cat': {
      name: 'A stray cat', role: 'End of the hall', radius: 7, behavior: 'stand', face: 'w',
      barks: ['Mrrp.', '…', 'Mrrrow.', '(stares at 7F)'], barkRange: 120, barkMin: 8, barkMax: 16,
      init(n) {
        n.portrait = () => catPortrait();
      },
      draw(g, n, t) {
        g.rotate(n.facing);
        catBody(g, t, true);
      },
      dialog: {
        start: (game) => (game.hasFlag('libraryDone') ? 'back' : 'start'),
        nodes: {
          start: {
            text: 'A gray cat with one white sock, sitting at the very end of the hall. It is looking at the door to 7F as though it expects the door to do something.',
            options: [
              { label: 'Pet the cat', next: 'pet' },
              { label: 'Are you Theo’s cat?', next: 'theo' },
              { label: 'Leave it be', end: true },
            ],
          },
          pet: { text: 'It allows this. It purrs: a low, steady beep… beep… beep, exactly like a busy signal.', options: [{ label: 'Huh.', end: true }] },
          theo: { text: 'It blinks at you, slowly. That is either yes, or a long private joke you are not part of.', options: [{ label: 'Fair.', end: true }] },
          back: { text: 'The cat is still here. It looks at you as though you have been gone a very long time, and as though it isn’t surprised you came back.', options: [{ label: 'Pet the cat', next: 'pet' }, { label: 'Leave it be', end: true }] },
        },
      },
    },
  };

  // ------------------------------------------------------------ pictures on the wall, warped
  const art = LM.get('items', 'art');
  items['apt-art-warped'] = Object.assign({}, art, {
    name: 'Framed print (warped)', cache: false, cacheKey: undefined,
    draw(g, it, t, game) {
      // the frame sags and swims a little
      const k = Math.sin(t * 0.9 + it.tx) * 0.12;
      g.transform(1, k * 0.6, -k, 1, 0, 0);
      art.draw(g, it, t, game);
    },
  });

  LM.definePack({ id: 'apartment', items, npcs });
})();
