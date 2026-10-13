/* The Linear Maze — packs/apartment/content.js
 * Apartment pack, part 1: the words. Everything you can read, watch, play,
 * eat or dial in the apartment (Chessboard 0) is plain data here.
 *
 *   BOOKS       the bookshelf: { title, note }
 *   GAMES       the game console (a Dreamcast from a garage sale): { title, year, note }
 *   CHANNELS    the TV: { name, text }
 *   FRIDGE      things to eat: { label, text, heal }
 *   NEIGHBORS   the doors in the hall: { unit, name, knock, knob, openFlag? }
 *   RADIO       what the clock radio is saying
 *   CHATS       friends on the laptop: { id, name, status, online, history, replies? }
 * The laptop's emails live in packs/memos/email.js style: see APARTMENT.EMAILS below.
 */
'use strict';
(function () {
  const LM = window.LM;
  const APT = (LM.APARTMENT = LM.APARTMENT || {});

  APT.BOOKS = [
    { title: 'Lonely Planet: Portugal (2004 edition)', note: 'Every page about Lisbon is dog-eared. You have never been to Lisbon. The trams in the photos are probably all different now.' },
    { title: '1,001 Places to See Before You Die', note: 'You have seen one of them. It was the airport, during a layover, through a window.' },
    { title: 'Learn Italian in 30 Days', note: 'The bookmark is on day four. Day four is about ordering coffee. You were so close.' },
    { title: 'Moby-Dick', note: 'You have read the first chapter eleven times. Call me Ishmael. Call me later.' },
    { title: 'The Joy of Cooking', note: 'The joy is theoretical. The takeout menus in the oven are the practical edition.' },
    { title: 'A Brief History of Time', note: '“Brief” is doing a lot of work in that title.' },
    { title: 'Through the Looking-Glass', note: 'There’s a poem in it about a Jabberwock. You keep meaning to reread it. Somebody has underlined “tulgey” in pencil. Not you.' },
    { title: 'Chess for Beginners', note: 'Chapter one: a pawn that reaches the far side of the board becomes something else. That seems unlikely. You put it back.' },
    { title: 'Atlas of Remote Islands', note: 'Fifty islands you will never visit. You have visited all of them, in this armchair, more than once.' },
    { title: 'Linear Algebra Done Right', note: 'From a garage sale. Someone has underlined the word LINEAR on every page, in every chapter, carefully. It was not you. It was definitely not you.' },
    { title: 'The Big Book of Office Etiquette', note: 'A gift from Dana, “for the team.” The chapter on status reports has a sticky note: :)' },
    { title: 'Travel Light: A Minimalist’s Guide', note: 'You bought it to prepare for a trip. You now own a book about owning less, and no trip.' },
    { title: '(no title)', note: 'A thin book with a blank spine. You don’t remember buying it. You haven’t read it. It’s warm, as though someone just put it down.' },
  ];

  APT.GAMES = [
    { title: 'Sonic Adventure', year: 1999, note: 'You play the opening. Sonic runs very fast down a very long hallway. You know the feeling.' },
    { title: 'Crazy Taxi', year: 1999, note: 'You deliver a fare to the pizza place. The fare did not ask to go to the pizza place. The fare is screaming. You get a tip.' },
    { title: 'Soulcalibur', year: 1999, note: 'You win nine rounds in a row by pressing every button at once. Somewhere, a tournament player feels a chill.' },
    { title: 'Power Stone', year: 1999, note: 'You pick up a chair and throw it. It’s the most decisive thing you’ve done all week.' },
    { title: 'Seaman', year: 1999, note: 'The fish with a man’s face asks how your job is going. You say fine. It says it doesn’t believe you. It’s right.' },
    { title: 'ChuChu Rocket!', year: 1999, note: 'You guide forty mice into a rocket with arrows. You follow arrows for a living too. Huh.' },
    { title: 'Space Channel 5', year: 1999, note: 'Up, down, up, down, chu, chu, chu. You are, briefly, the best dancer in the solar system.' },
    { title: 'Shenmue', year: 1999, note: 'You spend forty minutes opening drawers in a house and asking strangers about sailors. It’s like work, but with forklifts.' },
    { title: 'Hydro Thunder', year: 1999, note: 'You boost off a ramp and over a sinking ocean liner. It is the closest you’ve come to a vacation.' },
    { title: 'Ready 2 Rumble Boxing', year: 1999, note: 'The announcer says LET’S GET READY TO RUMBLE and your downstairs neighbor bangs on the ceiling. Fair.' },
    { title: 'Toy Commander', year: 1999, note: 'A tiny plane flies around a tiny apartment. Yours is about the same size. The plane has more fun.' },
    { title: 'The disc in the case labeled “DON’T”', year: '199?', note: 'It loads. A gray menu. One option: CONTINUE. The save file is dated tomorrow. You turn it off and unplug the console, and the light stays on a little longer than it should.' },
  ];

  APT.CHANNELS = [
    { name: 'Channel 4 · Evening News', text: 'Traffic on the Linear Expressway is backed up all the way to the horizon. Officials say the expressway “has always been there.” In other news, the elevators in your building are out.' },
    { name: 'Channel 7 · Wanderlust', text: 'A travel show. The host rides a yellow tram up a steep hill in Lisbon and eats a custard tart and looks very happy. You could do that. You could absolutely do that. You could book it right now. You change the channel.' },
    { name: 'Channel 12 · Flip This Floor Plan', text: 'A couple knocks down a wall to “open up the space.” Behind it is another hallway. They knock that down too. There is always another hallway. The audience applauds.' },
    { name: 'Channel 23 · Nature Hour', text: 'A documentary about salmon swimming upstream to the place where they started. It is beautiful and a little too relatable.' },
    { name: 'Channel 88 · Home Shopping', text: 'For three easy payments, a chess set where every piece is a queen. “Never lose again!” Operators are standing by. One of them looks at the camera and seems to see you.' },
    { name: 'Channel 0', text: 'Static. Under the static, very faint, someone saying “please hold.” You turn it off.' },
  ];

  APT.FRIDGE = [
    { label: 'Leftover lo mein', text: 'Cold lo mein, standing at the counter, eaten straight from the carton. Dinner of champions.', heal: 15 },
    { label: 'Make a sandwich', text: 'Bread, the last of the turkey, a slice of cheese with a suspicious corner (removed). A sandwich. You did it.', heal: 20 },
    { label: 'A yogurt', text: 'It expired yesterday. Yogurt doesn’t know what day it is either. It’s fine.', heal: 8 },
    { label: 'The single olive', text: 'There has been one olive in a jar in this fridge since you moved in. You eat it. It feels like the end of an era.', heal: 2 },
  ];

  APT.NEIGHBORS = {
    '7A': { name: 'Mrs. Albright', note: 'A wreath that hasn’t been changed since some holiday or other.' },
    '7B': { name: 'The Okonkwos', note: 'Two pairs of muddy running shoes by the door, side by side.' },
    '7D': { name: 'Theo', note: 'A sticker on the door: HONK IF YOU’VE SEEN MY CAT.' },
    '7E': { name: 'No name on the buzzer', note: 'The peephole is dark, as if someone is standing right behind it.' },
    '7F': { name: 'Vacant?', note: 'A pile of mail on the mat, all addressed to OCCUPANT.' },
  };
  APT.KNOCK = 'No one seems to be home.';
  APT.KNOB = 'The knob doesn’t turn. Locked.';

  APT.RADIO = [
    '“…it’s 6:30 on a lovely evening, and traffic on the Linear Expressway is backed up all the way to the horizon…”',
    '“…next up, a song about leaving, by a band that never did…”',
    '“…a caller on line four. Go ahead, line four. Line four? …We seem to have lost line four.”',
  ];

  APT.MAGAZINE = {
    title: 'Architecture Times',
    text: 'The spring issue. Cover story: THE CORRIDOR THAT NEVER ENDS: OPEN-PLAN LIVING FOR THE INFINITE HOME.\n\nA stamp on the back: PROPERTY OF DR. FELDMAN’S WAITING ROOM. PLEASE DO NOT REMOVE.\n\nYou removed it. You had been waiting forty minutes, and there was a floor plan in it you couldn’t stop looking at. It had one more room than it should.',
  };

  APT.CHATS = [
    {
      id: 'alice', name: 'Alice Ng', status: 'Away · last seen this afternoon', online: false,
      history: [
        ['them', 'last day today. long story. don’t tell Bob'],
        ['me', 'wait what?? your last day??'],
        ['them', 'it’s fine. it’s all encrypted. well. mostly'],
        ['them', 'gotta go. left some stuff in my desk. you’ll see'],
      ],
      away: 'Alice is away. Your message will be delivered when she’s back.',
    },
    {
      id: 'jordan', name: 'Jordan', status: 'Online · planning things', online: true,
      history: [['them', 'ok. LISBON. october. flights are cheap. you said yes last year']],
      replies: [
        { label: 'Yes! This year for real.', then: 'I’m screenshotting this. I’m framing it. I’m hanging it next to last year’s screenshot.' },
        { label: 'Work’s crazy right now.', then: 'work has been crazy for six years. the trams are not going to wait forever' },
      ],
    },
    {
      id: 'mei', name: 'Mei', status: 'Online · at a garage sale', online: true,
      history: [['them', 'found you another painting. it’s a lighthouse. it’s $3. it’s hideous. you need it']],
      replies: [
        { label: 'I absolutely need it.', then: 'already bought it. it’s in my trunk. it’s looking at me' },
        { label: 'I’m out of wall.', then: 'you have a whole hallway. a hallway is just a long wall with ambition' },
      ],
    },
    {
      id: 'theo', name: 'Theo (7D)', status: 'Online · not at home', online: true,
      history: [['them', 'hey are you home? elevators are out AGAIN. i’m staying at my sister’s. if you see a gray cat in the hall it’s mine, his name is Pawn']],
      replies: [
        { label: 'I’ll keep an eye out.', then: 'you’re the best. he likes the stairwell. he likes to go down. he always comes back up eventually' },
        { label: 'Why “Pawn”?', then: 'he wants to be a queen someday. don’t we all' },
      ],
    },
  ];

  /** The laptop's inbox: these are added to the Memos pack's email list, for this floor only. */
  APT.EMAILS = {
    'apt-mom': {
      from: 'Mom', subject: 'Did you eat?', points: 25,
      body: () => ['Just checking you got home and ate something that isn’t from a carton.', 'Also your cousin is getting married again. Same person, different reasons. Love you.', '— Mom'],
    },
    'apt-travel': {
      from: 'FareFinder <deals@farefinder.example>', subject: 'LISBON from $299 · expires tonight', points: 25,
      body: () => ['Your saved search “Lisbon, someday” has a match!', 'Round trip, October, $299. This fare expires at midnight. Like the others did.', 'You have saved this search 41 times.'],
    },
    'apt-garage': {
      from: 'Neighborhood Garage Sales', subject: 'This weekend: 12 sales near you', points: 25,
      body: () => ['Highlights: an estate sale on Alder St. (“furniture, art, a red telephone, books, everything must go, please”).', 'A note at the bottom, added by hand: the red telephone has already gone. it always goes first.'],
    },
    'apt-dana': {
      from: 'Dana Whitlock', subject: 'tomorrow :)', points: 25,
      body: () => ['Hi! Totally not chasing!! Just a friendly reminder that the status report is due EOD tomorrow.', 'Also there’s a 10:00 on everyone’s calendar called Linear? Not sure who booked it. Let’s just all go. :)', '— D'],
    },
  };
})();
