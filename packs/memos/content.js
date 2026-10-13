/* The Linear Maze — packs/memos/content.js
 * Memos pack, part 1: the words. Every poster, notice, desk toy and email
 * lives here as plain data, so writing new ones never means touching code.
 *
 * Each entry has a normal version (the 14th floor) and an `honest` version
 * that floors with `honest: true` in their level definition use instead
 * (Chessboard 1, where everything says what it actually means).
 *
 *   posters  { title, line, art, bg, fg, accent, honest: { title, line } }
 *            art is a drawing in packs/memos/items.js (POSTER_ART)
 *   notices  { by: 'mgmt' | 'staff', paper, title, text, honest: { title, text } }
 *            mgmt notices carry the company seal (a triangle in a circle),
 *            staff notices a pushpin and a pencil mark
 *   boards   message boards: which notices are pinned to each one
 *   toys     desk toys: { name, look, honest } — look is a drawing in items.js
 *   emails   see packs/memos/email.js for who receives which
 */
'use strict';
(function () {
  const LM = window.LM;
  const MEMOS = (LM.MEMOS = LM.MEMOS || {});

  // ------------------------------------------------------------ motivational posters
  MEMOS.posters = {
    teamwork: {
      title: 'Teamwork', line: 'Together, everyone achieves more.', art: 'venn', bg: '#1d3557', fg: '#f1faee', accent: '#e9c46a',
      honest: { title: 'Teamwork', line: 'Someone has to take the blame. Together, we can make sure it’s you.' },
    },
    synergy: {
      title: 'Synergy', line: 'The whole is greater than the sum of its parts.', art: 'merge', bg: '#264653', fg: '#e9f5f2', accent: '#2a9d8f',
      honest: { title: 'Synergy', line: 'The whole is greater than the sum of its parts. The parts have been let go.' },
    },
    perseverance: {
      title: 'Perseverance', line: 'Every step brings you closer.', art: 'stairs', bg: '#3d2c4e', fg: '#f4ecff', accent: '#c77dff',
      honest: { title: 'Perseverance', line: 'The stairs do not end. We checked. Keep climbing.' },
    },
    excellence: {
      title: 'Excellence', line: 'Quality is not an act. It is a habit.', art: 'circle', bg: '#1b1b1e', fg: '#f5f5f0', accent: '#d4af37',
      honest: { title: 'Excellence', line: 'Is expected. Is not compensated.' },
    },
    growth: {
      title: 'Growth', line: 'Small steps, every day.', art: 'bars', bg: '#1f4e3d', fg: '#eafff4', accent: '#7bd389',
      honest: { title: 'Growth', line: 'The chart only goes up. The chart is not about you.' },
    },
    focus: {
      title: 'Focus', line: 'Aim small. Achieve big.', art: 'target', bg: '#5a1e1e', fg: '#fff1e6', accent: '#ff8c42',
      honest: { title: 'Focus', line: 'Your screen is being recorded. Look busy.' },
    },
    leadership: {
      title: 'Leadership', line: 'Lead by example.', art: 'geese', bg: '#16324f', fg: '#eef4fb', accent: '#9ec5fe',
      honest: { title: 'Leadership', line: 'The one in front decides who falls behind.' },
    },
    integrity: {
      title: 'Integrity', line: 'Do the right thing, even when no one is watching.', art: 'square', bg: '#2b2d42', fg: '#edf2f4', accent: '#8d99ae',
      honest: { title: 'Integrity', line: 'Someone is always watching. Act accordingly.' },
    },
    innovation: {
      title: 'Innovation', line: 'Think outside the box.', art: 'bulb', bg: '#3a2e0f', fg: '#fff8e1', accent: '#ffd23f',
      honest: { title: 'Innovation', line: 'The box is load-bearing. Stay in the box.' },
    },
    opportunity: {
      title: 'Opportunity', line: 'When one door closes, another opens.', art: 'door', bg: '#4a3423', fg: '#fdf0e0', accent: '#f4a261',
      honest: { title: 'Opportunity', line: 'When one door closes, it locks behind you.' },
    },
    communication: {
      title: 'Communication', line: 'Connect. Listen. Understand.', art: 'link', bg: '#0f4c5c', fg: '#e8fbff', accent: '#5fd3e8',
      honest: { title: 'Communication', line: 'Per my last email.' },
    },
    achievement: {
      title: 'Achievement', line: 'The summit is only the beginning.', art: 'peak', bg: '#22333b', fg: '#f2f4f3', accent: '#c6ac8f',
      honest: { title: 'Achievement', line: 'You reached the top. The top has been moved.' },
    },
    balance: {
      title: 'Balance', line: 'Work hard. Rest well.', art: 'balance', bg: '#3c4f3c', fg: '#f1f7ed', accent: '#bfd8a6',
      honest: { title: 'Balance', line: 'Work. That’s it. That’s the balance.' },
    },
    vision: {
      title: 'Vision', line: 'See beyond the horizon.', art: 'eye', bg: '#2d1e3e', fg: '#f6efff', accent: '#b8a1ff',
      honest: { title: 'Vision', line: 'We see you. We see everything.' },
    },
    // only ever printed in their honest form (the extended floor on Chessboard 1)
    retention: {
      title: 'Retention', line: 'People are our greatest asset.', art: 'cage', bg: '#2a2a2a', fg: '#f0f0f0', accent: '#9a9a9a',
      honest: { title: 'Retention', line: 'Nobody leaves Meridian Group. Some of us just stop being seen.' },
    },
    meetings: {
      title: 'Meetings', line: 'Great ideas start with a conversation.', art: 'chairs', bg: '#33261d', fg: '#fbefe3', accent: '#d08c60',
      honest: { title: 'Meetings', line: 'Because the work can wait. The work can always wait.' },
    },
    potential: {
      title: 'Potential', line: 'Reach for the stars.', art: 'arrow', bg: '#101a2e', fg: '#eaf0ff', accent: '#ffd166',
      honest: { title: 'Potential', line: 'Yours peaked in the interview.' },
    },
    wellness: {
      title: 'Wellness', line: 'Take care of yourself.', art: 'heart', bg: '#4d1f2b', fg: '#fff0f3', accent: '#ff8fa3',
      honest: { title: 'Wellness', line: 'Your health plan covers one feeling per quarter. Choose wisely.' },
    },
  };

  // ------------------------------------------------------------ notices
  // by: 'mgmt' (from the company, with the seal) or 'staff' (from coworkers, with a pushpin)
  MEMOS.notices = {
    parking: {
      by: 'mgmt', paper: '#f4f1ea', title: 'Parking',
      text: 'Levels P3–P5 of Structure B are reserved for visitors. Employee vehicles parked in visitor spaces will be towed at the owner’s expense.\n\nValidation is available at the front desk. Please ask Marisol kindly.',
      honest: {
        title: 'Parking',
        text: 'Employee vehicles parked in visitor spaces will be towed, crushed, and returned to you as a cube.\n\nYou may keep the cube on your desk. It counts as your desk toy. You will never be a visitor.',
      },
    },
    punctuality: {
      by: 'mgmt', paper: '#dfeaf6', title: 'Punctuality',
      text: 'Core hours are 9:00 to 5:00. Badge entries after 9:05 are logged and shared with your manager.\n\nBeing on time is being on the team!',
      honest: {
        title: 'Punctuality',
        text: 'Badge entries after 9:05 are logged and shared with your manager, your next of kin, and the thing that lives on level P5 of the parking structure.\n\nIt gets hungry around 9:06.',
      },
    },
    kitchen: {
      by: 'mgmt', paper: '#fff3b8', title: 'The kitchen is a shared space',
      text: 'Please rinse your mug, wipe the counter, and remove your items from the fridge by Friday at 3:00. Anything left behind will be discarded.\n\nThank you for keeping our space clean!',
      honest: {
        title: 'Final notice: clean the kitchen',
        text: 'Mugs left in the sink after 3:00 on Friday will be smashed. So will the hands that left them. We have the camera footage. We have always had the camera footage.\n\nWipe. The. Counter.\n\nThis is the last notice. The next one will be delivered in person.',
      },
    },
    harassment: {
      by: 'mgmt', paper: '#ffffff', title: 'Mandatory: Harassment Prevention Training',
      text: 'All employees must complete the annual Harassment Prevention module on the Learning Portal by the 31st.\n\nEveryone deserves a safe and respectful workplace. Questions? Contact People & Culture.',
      honest: {
        title: 'Mandatory: Harassment Prevention (Manager Edition)',
        text: 'Module 1: How to make a complaint go away.\nModule 2: Who to promote instead.\nModule 3: Non-disclosure agreements, and why we love them.\n\nCompletion is required for promotion. Reporting is not.',
      },
    },
    cyber: {
      by: 'mgmt', paper: '#e3f4e6', title: 'Mandatory: Cybersecurity Awareness',
      text: 'Phishing is the number one threat to our company. Never click links from unknown senders. Lock your screen when you step away.\n\nComplete the Cybersecurity module by Friday.',
      honest: {
        title: 'Mandatory: Workplace Surveillance Training',
        text: 'Lesson 1: Your webcam light is decorative.\nLesson 2: We read your drafts, including the ones you did not send.\nLesson 3: Report any coworker who looks away from their screen for longer than nine seconds.\n\nIf you see something, we already saw it.',
      },
    },
    devices: {
      by: 'mgmt', paper: '#ece6f6', title: 'IT policy: personal devices',
      text: 'Please do not connect unapproved USB devices to company equipment. This includes “mouse jigglers,” novelty fans and phone chargers shaped like food.\n\nThanks! — IT',
      honest: {
        title: 'Bounty: mouse movers',
        text: '500 gold for every confirmed MOUSE MOVER.\n\nBring us the device. Bring us the hand that installed it. Bring the arm for a bonus.\n\nWanted dead or idle.',
      },
    },
    firedrill: {
      by: 'mgmt', paper: '#ffe1d2', title: 'Fire drill: Thursday, 2:00',
      text: 'When the alarm sounds, proceed calmly to the nearest stairwell. Do not use the elevators. Floor wardens wear orange vests.',
      honest: {
        title: 'Fire: Thursday, 2:00',
        text: 'There will be a fire on Thursday at 2:00. Attendance is mandatory.\n\nThe stairwells have been locked to encourage team-building.',
      },
    },
    birthday: {
      by: 'staff', paper: '#ffd6e5', title: 'Cake!!',
      text: 'It’s Kenji’s birthday! Carrot cake in the Cantina at 3:00.\n\n(Kenji, act surprised.)',
      honest: {
        title: 'Cake!!',
        text: 'It is Kenji’s birthday again. It is always Kenji’s birthday. Kenji has not aged since 1994.\n\nDo not ask Kenji about 1994.',
      },
    },
    bowling: {
      by: 'staff', paper: '#ffd8a8', title: 'The Pin Pals: after-hours bowling league',
      text: 'Thursdays, 7pm, at Starlite Lanes. All skill levels welcome! Shoe rental not included.\n\nSign up with Gary.',
      honest: {
        title: 'The Pin Pals: after-hours bowling league',
        text: 'Thursdays, 7pm, on level P5, after the building closes. All skill levels welcome.\n\nThe pins are former members. Shoe rental not included. Feet rental not included.',
      },
    },
    stapler: {
      by: 'staff', paper: '#f7f7f2', title: 'Lost: blue stapler',
      text: 'Not red. BLUE. If found, please return to Joy, desk 14-087. It has sentimental value.',
      honest: {
        title: 'Found: one stapler',
        text: 'It found me. It will not let me put it down. It staples things I do not give it.\n\nPlease, if anyone knows how this ends—',
      },
    },
    kittens: {
      by: 'staff', paper: '#e7dcff', title: 'Free kittens to a good home',
      text: 'Four kittens, very sweet, litter-trained. Ask Nadia in Finance.',
      honest: {
        title: 'Free kittens to a good home',
        text: 'Four kittens. Well. Four of them are kittens.\n\nAsk Nadia in Finance. Do not ask Nadia about the fifth one.',
      },
    },
    yoga: {
      by: 'staff', paper: '#d7f5e6', title: 'Lunchtime yoga',
      text: 'Tuesdays at 12:15 in the Quiet Room. Bring a mat! (Cancelled this week.)',
      honest: {
        title: 'Lunchtime yoga',
        text: 'Tuesdays at 12:15. Mountain pose, then the Downward Spiral.\n\nWe are always cancelled. We are still in there.',
      },
    },
    carpool: {
      by: 'staff', paper: '#e0f0ff', title: 'Carpool from Riverside?',
      text: 'Leaving at 7:40, back by 6:00. We split gas. — Marcus',
      honest: {
        title: 'Carpool from Riverside?',
        text: 'Leaving at 7:40. Nobody who has ridden with me has come back. The seats are very comfortable. — Marcus',
      },
    },
    fantasy: {
      by: 'staff', paper: '#fff6d8', title: 'Fantasy football: two spots left',
      text: '$20 buy-in. The winner keeps the trophy (a stapler, spray-painted gold).\n\n— Hollis (this is not legal advice)',
      honest: {
        title: 'Fantasy league: two spots left',
        text: 'The losers are let go. The winners are let go slightly later.\n\n— Hollis (this is a binding contract; you agreed by reading it)',
      },
    },
  };

  // which notices are pinned to which message board
  MEMOS.boards = {
    cantina: ['kitchen', 'firedrill', 'birthday', 'bowling', 'stapler', 'kittens', 'yoga', 'carpool', 'fantasy'],
  };

  // ------------------------------------------------------------ desk toys
  // look: a drawing in items.js (TOY_ART). Ordinary toys sit on random desks on the 14th floor;
  // honest toys (Chessboard 1) belong to whoever sits at the desk.
  MEMOS.toys = {
    succulent: { name: 'Succulent', look: 'succulent', text: 'A tiny succulent in a tiny pot. It is thriving, out of spite.' },
    globe: { name: 'Desk globe', look: 'globe', text: 'A globe the size of an orange. Someone has put a sticker of a star on this building.' },
    cradle: { name: 'Newton’s cradle', look: 'cradle', text: 'You lift one ball and let go. Click. Click. Click. Click. It is very satisfying and you have work to do.', sound: 'tick' },
    cube: { name: 'Puzzle cube', look: 'cube', text: 'A puzzle cube, solved on five sides. The sixth side has been peeled and re-stickered.' },
    stressball: { name: 'Stress ball', look: 'stressball', text: 'A stress ball shaped like a globe. It has been squeezed so often that Europe is gone.' },
    bobble: { name: 'Bobblehead', look: 'bobble', text: 'A bobblehead of a baseball player nobody here has heard of. It nods at everything you say.' },
    lavalamp: { name: 'Lava lamp', look: 'lavalamp', text: 'Orange wax rises and falls. It is the only thing in the building that is not in a hurry.' },
    slinky: { name: 'Spring toy', look: 'slinky', text: 'A metal spring toy, hopelessly tangled. It is a metaphor, and it knows.' },
    eightball: { name: 'Magic 8 ball', look: 'eightball', text: 'You ask whether the status report will be done today. You shake it.\n\nREPLY HAZY. TRY AGAIN AFTER LUNCH.' },
    zen: { name: 'Desk zen garden', look: 'zen', text: 'A tray of sand, a tiny rake, three pebbles. Someone has raked the word HELP into it, very calmly.' },
    snowglobe: { name: 'Snow globe', look: 'snowglobe', text: 'A snow globe of the Meridian building. You shake it. Snow falls on all fourteen floors.' },
    bird: { name: 'Drinking bird', look: 'bird', text: 'It dips its beak into a glass of water, rises, and dips again. It has been at it since the last reorg.' },
    photo: { name: 'Framed photo', look: 'photo', text: 'A photo of a dog in a graduation cap. You have never seen the owner smile as wide as this dog.' },

    // Chessboard 1: the real versions
    guillotine: {
      name: 'Scale-model guillotine', look: 'guillotine', honest: true,
      text: 'A scale-model guillotine with a real razor blade. The brass plate says FOR CONTRACT DISPUTES.\n\nThe basket is not empty.',
      act: { label: 'Test it with a pencil', toast: 'THUNK. The pencil is now two shorter pencils.', sound: 'break' },
    },
    cannon: {
      name: 'Desk cannon', look: 'cannon', honest: true,
      text: 'A brass desk cannon on a little oak carriage. It is loaded. Of course it is loaded.',
      act: { label: 'Light the fuse', fire: true },
    },
    flytrap: {
      name: 'Carnivorous plant', look: 'flytrap', honest: true,
      text: 'A Venus flytrap the size of a lunchbox. A label on the pot reads ENGAGEMENT. It turns toward you, slowly.',
      act: { label: 'Pet it', bite: 4, toast: 'It bites. Engagement is up.' },
    },
    voodoo: {
      name: 'Voodoo doll', look: 'voodoo', honest: true,
      text: 'A little felt doll in a blazer, glasses, and a tiny tablet. Seven pins. One of them is labeled STATUS REPORT.',
    },
    trebuchet: {
      name: 'Coin trebuchet', look: 'trebuchet', honest: true,
      text: 'A desktop trebuchet with a coin in the sling. A sticky note: FOR BUDGET MEETINGS.',
      act: { label: 'Release the arm', toast: 'It flings a coin across the floor. Somewhere, someone says “ow,” and then “thank you.”', sound: 'coin' },
    },
    chair: {
      name: 'Tiny electric chair', look: 'chair', honest: true,
      text: 'A tiny electric chair with a tiny font specimen strapped into it. The specimen is Comic Sans. The switch is warm.',
    },
    eyes: {
      name: 'Jar of observations', look: 'eyes', honest: true,
      text: 'A mason jar of eyes, labeled OBSERVATIONS (n = 212). They are googly eyes. Probably. They all move when you move.',
    },
    harpoon: {
      name: 'Desk harpoon', look: 'harpoon', honest: true,
      text: 'A desk-mounted harpoon gun. A sticky note on the trigger: FOR WHOEVER TOOK THE SALMON.',
    },
    beartrap: {
      name: 'Lunchbox', look: 'beartrap', honest: true,
      text: 'A blue lunchbox with PRIYA on the lid. It is set inside an open bear trap. The trap is set.',
    },
    screamball: {
      name: 'Stress ball', look: 'stressball', honest: true,
      text: 'You squeeze the stress ball. It screams. You both feel better.', act: { label: 'Squeeze it again', toast: 'AAAAAAAA. (It means it.)', sound: 'alarm' },
    },
    skullcradle: {
      name: 'Newton’s cradle', look: 'skullcradle', honest: true,
      text: 'A Newton’s cradle of five little skulls. Click. Click. Click. The skulls are counting something down.', sound: 'tick',
    },
    eightballno: { name: 'Magic 8 ball', look: 'eightball', honest: true, text: 'You ask whether you will leave this floor alive. You shake it.\n\nNO.\n\nYou shake it again. NO. It only says NO now. It was always going to only say NO.' },
    firesnow: { name: 'Snow globe', look: 'firesnow', honest: true, text: 'A snow globe of the Meridian building. The building is on fire. The snow is ash. You shake it, and it burns harder.' },
  };
  // which honest toy belongs to whom on Chessboard 1 (by the name on the NPC at the nearest desk)
  MEMOS.toyOwners = {
    'Hollis Grant': 'guillotine', 'Marcus Bell': 'cannon', 'Joy Adeyemi': 'flytrap', 'Nadia Volkov': 'trebuchet',
    'Lena Park': 'chair', 'Ravi Chandran': 'eyes', 'Kenji Watanabe': 'voodoo',
  };
  MEMOS.toyPool = ['succulent', 'globe', 'cradle', 'cube', 'stressball', 'bobble', 'lavalamp', 'slinky', 'eightball', 'zen', 'snowglobe', 'bird', 'photo'];
  MEMOS.honestToyPool = ['screamball', 'skullcradle', 'eightballno', 'firesnow', 'flytrap', 'cannon', 'guillotine', 'voodoo'];
})();
