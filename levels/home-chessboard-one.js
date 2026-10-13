/* The Linear Maze — levels/home-chessboard-one.js
 * Home (Chessboard 1): the same apartment as Chessboard 0, but not quite.
 *
 * You get here by dialing your own number backwards on the red phone at home
 * (packs/rotary; it only connects once you've heard the voice: flag heardReverse).
 * The pictures sag, the books have changed their titles, the TV shows are
 * parodies of themselves, the clock radio blinks, the furniture is the wrong
 * colors, there's a lava lamp where the laptop was, and the lights in each room
 * dim and come back at random. The red phone is busy; the cell phone has no signal.
 * A stray cat sits at the end of the hall. Dave's door, 7F, opens into the
 * Library Maze (library-1); the library's last floor brings you back here,
 * outside Dave's door.
 *
 * Once you're back from the library (flag libraryDone) the red phone stops being busy and
 * you're tired: the bed offers Sleep, and you wake up in the Chessboard 0 apartment.
 * The stairs stay roped off (leaveFlag below is never set by the story).
 *
 * The story for this floor is in packs/apartment/story.js.
 * The map is a copy of levels/apartment-chessboard-zero.js (so either can change on its own).
 *   tags   door7A door7B door7D door7E door7F (Dave), aptFront, aptStair, aptStairsDown
 *   flags  seekDave (task changed), cb1TriedPhone, cb1TriedCell, cb1LeftHome, triedDaveDoor, libraryDone
 */
'use strict';
LM.definePack({
  id: 'apartment',
  levels: {
    'home-cb1': {
      name: 'Home',
      floorLabel: '7th floor · Chessboard 1',
      order: -0.8,
      environment: 'apartment-cb1',
      // The way out of this floor is sleep (packs/apartment/story.js), not the stairs. If the stairs
      // should ever open, set the flag below; they then lead to exitTo.
      exitTo: 'chessboard-one',
      next: 'chessboard-one',
      leaveFlag: 'cb1StairsOpen', // not set by the story: the stairs stay roped off
      armed: false,
      warped: true, // items read APT.WARPED (packs/apartment/story.js)
      noSignal: true, // the cell phone shows "No signal"
      intro: 'Home: the 7th floor, unit 7C. Probably.',
      outro: 'The rope is lying on the landing. The stairwell goes down a long way: past six, past five, past landings with no numbers on them at all. Somewhere around where the lobby should be, the stairs start going up instead.\n\nYou stop counting. When the stairwell door opens, it’s morning, and you’re at work.',
      // (only used if the stairs are opened: shown instead of the next floor's own intro)
      exitIntro: 'Fourteen floors up: a lobby you know. Same carpet. Same plants. The light is a little greener than you remember. Your phone says you have three tasks due by end of day. It said that yesterday, too.',

      legend: {
        '.': { terrain: 'floor', variant: 0 },
        ',': { terrain: 'floor', variant: 1 },
        ':': { terrain: 'floor', variant: 2 },
        '`': { terrain: 'floor', variant: 3 },
        ';': { terrain: 'floor', variant: 4 },
        '-': { terrain: 'floor', variant: 5 },
        '<': { terrain: 'entry', tag: 'aptStair' },
        '>': { terrain: 'apt-stairs-closed', tag: 'aptStairsDown' }, // roped off until libraryDone (the trap below)
        C: { terrain: 'apt-door-mine' },
      },

      objectLegend: {
        // the hall
        q: { item: 'apt-neighbor', props: { unit: '7A' }, tag: 'door7A' },
        j: { item: 'apt-neighbor', props: { unit: '7B' }, tag: 'door7B' },
        t: { item: 'apt-neighbor', props: { unit: '7D' }, tag: 'door7D' },
        u: { item: 'apt-neighbor', props: { unit: '7E' }, tag: 'door7E' },
        v: { item: 'apt-neighbor', props: { unit: '7F', leadsTo: 'library-1' }, tag: 'door7F' }, // Dave's
        c: { npc: 'apt-cat', props: { face: 'w' } },
        m: { item: 'apt-mat', tag: 'aptFront' },
        z: { item: 'apt-stairs-gate', props: { text: 'The red rope, and the laminated sign: STAIRWELL CLOSED BELOW THIS FLOOR. CLEANING IN PROGRESS.\n\nThe cleaning sounds closer than before. It sounds like it is coming up.\n\nYou don’t want to go down there. You want help.' } },
        s: { item: 'sign', props: { face: 'e', label: 'Stairwell', kicker: 'Floor 7', text: 'STAIRWELL · FLOOR 7\n↓ 7   ↑ 7\n\nUnder it, in pencil: ↓ further. Under that, in the same pencil: no further.' } },
        L: { item: 'apt-elevator', props: { face: 'w' } },
        o: { item: 'sign', props: { face: 'w', label: 'OUT OF ORDER', kicker: 'Elevators', plate: '#c8302a', ink: '#f4f1ea', text: 'OUT OF ORDER\n\nUse stairs. Sorry for the inconvenience.\n— Management\n\nThe letters are slightly too big for the sign.' } },
        O: { item: 'sign', props: { face: 'w', label: 'Inspection certificate', kicker: 'Elevators', text: 'ELEVATOR INSPECTION CERTIFICATE\nThis elevator has been inspected and found to be: an elevator, again.\n\nExpires: yesterday, every day.' } },
        b: 'bench',
        P: { item: 'plant', props: { big: true } },
        p: 'plant',
        w: { item: 'apt-window', props: { text: 'The sun is going down behind the parking garage. Then it comes back up, and goes down again, like someone checking whether you noticed.' } },
        '1': { item: 'apt-art-warped', props: { face: 's', color: '#b87aa0', title: 'Sinkboat', kicker: 'Hall', text: 'The building’s sailboat print. The boat is lower in the water than it was this morning. The tiny person on the deck is no longer waving. They are bailing.' } },
        '2': { item: 'apt-art-warped', props: { face: 's', color: '#80c8b0', title: 'Wheat field (inside out)', kicker: 'Hall', text: 'The wheat field, but the sky is wheat and the field is sky. It is still screwed to the wall so it can’t be stolen. Nobody has ever wanted to steal it less.' } },
        '3': { item: 'apt-art-warped', props: { face: 's', color: '#b09a8a', title: 'Harbor at dusk at dawn', kicker: 'Hall', text: 'The crooked harbor. You straighten it. The harbor inside the frame tilts the other way to make up for it.' } },
        '4': { item: 'apt-art-warped', props: { face: 'e', color: '#60b0e0', title: 'Venice at dawn, sinking', kicker: 'Garage sale, $4', text: 'The gondolas, the bridge, the pink sky. The water is right up to the windows now. A gondolier is looking out of the painting at you, as if you should do something about it.' } },
        '5': { item: 'apt-art-warped', props: { face: 's', color: '#8a5a3a', title: 'Kyoto in the drought', kicker: 'Garage sale, $2', text: 'The jigsaw temple. The three missing pieces are back. Three other pieces are missing instead. One of them is you, standing in the rain in the corner. You were not in it before.' } },
        '6': { item: 'apt-art-warped', props: { face: 's', color: '#c84a8a', title: 'The Southern Darks', kicker: 'Garage sale, $5', text: 'The velvet northern lights have gone south, and dark. Somehow it is still tasteless and wonderful.' } },
        '7': { item: 'apt-art-warped', props: { face: 's', color: '#70c0e8', title: 'Lisbon tram (reversing)', kicker: 'Garage sale, $1', text: 'The postcard tram is going down the hill now, backwards. The back still says “Wish you were here.” It is addressed to you. It is in your handwriting.' } },
        '8': { item: 'apt-art-warped', props: { face: 'n', color: '#a07ac8', title: 'Mountain lake, by numbers', kicker: 'Garage sale, $3', text: 'The paint-by-numbers lake. Someone has painted it all the way up to number 37 again, and then started over at 1, in the wrong colors.' } },
        '9': { item: 'apt-art-warped', props: { face: 's', color: '#b8a8d8', title: 'New York, 1978', kicker: 'Garage sale, free', text: 'The calendar page says 1978 now. Every month on it is March.' } },
        '0': { item: 'apt-art-warped', props: { face: 'e', color: '#709878', title: 'Paris (alleged, disputed)', kicker: 'Garage sale, $6', text: 'Paris, by someone who had heard of Paris and disagreed with it. The door in the Eiffel Tower is open now.' } },

        // the kitchen
        F: { item: 'apt-fridge', props: { dir: 's' } },
        i: { item: 'apt-counter', props: { dir: 's' } },
        k: { item: 'apt-counter', props: { dir: 's', kind: 'sink', text: 'It runs cold, then hot, then a color. You turn it off.' } },
        M: { item: 'apt-counter', props: { dir: 's', kind: 'microwave' } },
        Z: { item: 'apt-oven', props: { dir: 's' } },
        T: { item: 'apt-kitchen-table', props: { lava: true, top: '#bfe0d0' } }, // a lava lamp where the laptop was
        '›': { item: 'chair', props: { dir: 'w', color: '#c8602a' } },
        '‹': { item: 'chair', props: { dir: 'e', color: '#c8602a' } },

        // the living room
        B: { item: 'apt-bookshelf', props: { dir: 's' } },
        V: { item: 'apt-tv', props: { dir: 'w', w: 3, color: '#2a3a5a' } },
        G: 'apt-console',
        S: { item: 'apt-sofa', props: { dir: 'e', w: 2, color: '#8a2a6a' } },
        C: { item: 'apt-coffee-table', props: { oy: 16 } },
        a: { item: 'armchair', props: { dir: 'e', color: '#2a7a8a' } },
        U: { item: 'rug', props: { w: 4, h: 3, color: '#2a5a3a', border: '#e070c0' } },

        // the bathrooms
        l: { item: 'apt-toilet', props: { dir: 's' } },
        h: { item: 'apt-counter', props: { dir: 's', kind: 'basin', room: 'Guest bath', top: '#e8d0e8' } },
        H: { item: 'apt-counter', props: { dir: 's', kind: 'basin', room: 'Master bath', top: '#e8d0e8', text: 'Hot on the left. Hot on the right. Hot in the middle, which is new.' } },
        r: { item: 'apt-mirror', props: { face: 's', text: 'You look like yourself. Mostly. Your reflection blinks a moment after you do, as if it had to check.' } },

        // the bedroom and master bath
        K: { item: 'apt-closet', props: { face: 's', w: 3 } },
        Y: { item: 'apt-bed', props: { w: 3, h: 2, head: 'e', blanket: '#8a4a1a' } },
        n: { item: 'apt-nightstand', props: { radio: true, color: '#3a6a5a' } },
        N: { item: 'apt-nightstand', props: { color: '#3a6a5a' } },
        X: { item: 'apt-dresser', props: { dir: 'e', color: '#3a4a7a' } },
        W: 'apt-shower',
      },

      traps: [
        {
          // if the story ever opens the stairs (it doesn't: the way out is sleep), the rope comes down
          trigger: { type: 'flag', tag: 'cb1StairsOpen' },
          effects: [
            { type: 'terrain', tag: 'aptStairsDown', terrain: 'exit', sound: false },
            { type: 'message', delay: 4.5, text: 'Somewhere in the stairwell, a rope drops to the floor.', kind: 'key' },
          ],
        },
      ],

      rooms: [
        { name: 'The Stairwell', rect: [1, 1, 4, 6], note: 'Floor 7 · the cleaning sounds closer' },
        { name: 'Elevator Lobby', rect: [42, 1, 5, 7], note: 'Out of order, again' },
        { name: 'The Seventh Floor', rect: [6, 2, 35, 3], note: 'Home, almost, again' },
        { name: 'Kitchen', rect: [9, 6, 9, 8], note: 'Unit 7C?' },
        { name: 'Living Room', rect: [18, 6, 20, 10], note: 'Unit 7C?' },
        { name: 'Guest Bath', rect: [15, 17, 4, 5], note: 'Unit 7C?' },
        { name: 'Bedroom', rect: [24, 17, 14, 11], note: 'Unit 7C?' },
        { name: 'Master Bath', rect: [32, 17, 6, 5], note: 'Unit 7C?' },
      ],

      ceilingLights: [
        { variants: [0], every: 4, offset: [2, 3], color: '#fff0d0', radius: 170, intensity: 0.4 },
        { variants: [5], every: 3, offset: [2, 2], color: '#e8f0e0', radius: 140, intensity: 0.38, flicker: 0.15 },
        { variants: [1, 2, 3, 4], every: 4, offset: [1, 1], color: '#ffd0b8', radius: 170, intensity: 0.42 },
      ],

      map: [
        "######                                   #######",
        "#-<--#####################################.....#",
        "#----#.........................................#",
        "#----+.........................................#",
        "#----#.........................................#",
        "#----###############C#####################.....#",
        "#->--#  #:::::::::,,,,,,,,,,,,,,,,,,,,#  #.....#",
        "######  #:::::::::,,,,,,,,,,,,,,,,,,,,#  #.....#",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#  #######",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#",
        "        #:::::::::,,,,,,,,,,,,,,,,,,,,#",
        "        ###########,,,,,,,,,,,,,,,,,,,#",
        "              #####,,,,,,,,,,,,,,,,,,,#",
        "              #######+#################",
        "              #````#,,,#;;;;;;;#``````#",
        "              #````+,,,#;;;;;;;#``````#",
        "              #````#,,,#;;;;;;;#``````#",
        "              #````#,,,+;;;;;;;#``````#",
        "              #````#,,,#;;;;;;;#``````#",
        "              ##########;;;;;;;###+####",
        "                       #;;;;;;;;;;;;;;#",
        "                       #;;;;;;;;;;;;;;#",
        "                       #;;;;;;;;;;;;;;#",
        "                       #;;;;;;;;;;;;;;#",
        "                       #;;;;;;;;;;;;;;#",
        "                       ################",
        "",
      ],
      objects: [
        "                                           w w",
        "         q  1  j        2  t  3  u    v   P",
        "     s p                                c      L",
        "w                                          b   o",
        "                    m                   p      L",
        "                        5     6   7        b   O",
        "  z      FikiZMii p       B          p         L",
        "                                      w   P   P",
        "        4",
        "                           U    S C  V",
        "            ›T‹",
        "        w",
        "                                     G",
        "                 p               a",
        "                                      w",
        "                   p",
        "                 r      K    9    r",
        "               l h              l H W",
        "",
        "",
        "",
        "                              p",
        "                     8",
        "                                     n",
        "                       0           Y  w",
        "",
        "                        X            N",
        "                        p",
        "                          w     w",
        "",
      ],
    },
  },
});
