/* The Linear Maze — levels/apartment-chessboard-zero.js
 * Apartment (Chessboard 0): home. The first floor of a new run.
 *
 * 6:30 PM. You come up the stairwell (the elevators are out) onto the 7th
 * floor: a hall of neighbors' doors (all locked, nobody home), a lobby of
 * dead elevators, and your own door, 7C. Inside, a one-bedroom: kitchen with a
 * red rotary telephone on the counter (packs/rotary) that was here when you got the place, a living room with a
 * TV, a garage-sale Dreamcast and a shelf of books, a guest bath, a bedroom
 * with a clock radio stuck at 6:30, and a master bath.
 * The stairs down open the morning after (Alice's call sets timeToLeave) and lead to the Town Map
 * (exitTo: packs/town). Change exitTo back to 'meridian-fourteen' to send them to work instead.
 *
 * Needs the Office, Memos and Apartment packs. Things to hook events onto:
 *   tags   aptStair (where you arrive), aptFront (outside your door),
 *          door7A door7B door7D door7E door7F (each neighbor's door tile)
 *   flags  set by the apartment's things: see packs/apartment/items.js
 *   timeToLeave   set this (from any event) to open the stairs down; until then they're roped off
 * The evening (dinner, the red phone, the news, the call to Chessboard 1) is in packs/apartment/story.js.
 */
'use strict';
LM.definePack({
  id: 'apartment',
  levels: {
    apartment: {
      name: 'Apartment',
      floorLabel: 'Chessboard 0',
      order: -1,
      environment: 'apartment',
      next: 'meridian-fourteen',
      exitTo: 'town-map', // the morning after: out into town to look for Alice (packs/town)
      armed: false,
      dinner: true, // the evening's story: packs/apartment/story.js
      loadout: { weapons: [], gadgets: ['phone'] },
      intro: 'Home: the 7th floor, unit 7C. The elevators are out again.',
      outro: 'Seven flights of stairs, and they are only seven flights of stairs. The lobby door, the street, the sun. A normal Tuesday morning.\n\nWork can wait. Alice can’t.',
      exitIntro: 'The town: a few streets you know by heart. Alice said it was one of your familiar places.',

      // ---------------------------------------------------------------- terrain
      legend: {
        '.': { terrain: 'floor', variant: 0 }, // hall carpet
        ',': { terrain: 'floor', variant: 1 }, // wood
        ':': { terrain: 'floor', variant: 2 }, // kitchen tile
        '`': { terrain: 'floor', variant: 3 }, // bathroom tile
        ';': { terrain: 'floor', variant: 4 }, // bedroom carpet
        '-': { terrain: 'floor', variant: 5 }, // stairwell concrete
        '<': { terrain: 'entry', tag: 'aptStair' }, // the stairs up: you arrive here
        '>': { terrain: 'apt-stairs-closed', tag: 'aptStairsDown' }, // the stairs down: roped off until the flag timeToLeave
        C: { terrain: 'apt-door-mine' }, // your front door, 7C
      },

      // ---------------------------------------------------------------- objects
      objectLegend: {
        // the hall
        q: { item: 'apt-neighbor', props: { unit: '7A' }, tag: 'door7A' },
        j: { item: 'apt-neighbor', props: { unit: '7B' }, tag: 'door7B' },
        t: { item: 'apt-neighbor', props: { unit: '7D' }, tag: 'door7D' },
        u: { item: 'apt-neighbor', props: { unit: '7E' }, tag: 'door7E' },
        v: { item: 'apt-neighbor', props: { unit: '7F' }, tag: 'door7F' },
        m: { item: 'apt-mat', tag: 'aptFront' },
        z: 'apt-stairs-gate',
        s: { item: 'sign', props: { face: 'e', label: 'Stairwell', kicker: 'Floor 7', text: 'STAIRWELL · FLOOR 7\n↓ 6   ↑ 8\n\nUnder it, someone has added in pencil: ↓ further' } },
        L: { item: 'apt-elevator', props: { face: 'w' } },
        o: { item: 'sign', props: { face: 'w', label: 'OUT OF ORDER', kicker: 'Elevators', plate: '#c8302a', ink: '#f4f1ea', text: 'OUT OF ORDER\n\nUse stairs. Sorry for the inconvenience.\n— Management' } },
        O: { item: 'sign', props: { face: 'w', label: 'Inspection certificate', kicker: 'Elevators', text: 'ELEVATOR INSPECTION CERTIFICATE\nThis elevator has been inspected and found to be: an elevator.\n\nExpires: last year.' } },
        b: 'bench',
        P: { item: 'plant', props: { big: true } },
        p: 'plant',
        w: 'apt-window',
        '1': { item: 'art', props: { face: 's', color: '#7aa0b8', title: 'Sailboat', kicker: 'Hall', text: 'A print of a sailboat, bolted to the wall by the building. Every floor has the same one. On this floor, someone has drawn a tiny person on the deck, waving.' } },
        '2': { item: 'art', props: { face: 's', color: '#c8b080', title: 'Wheat field', kicker: 'Hall', text: 'The building’s second picture: a wheat field. The frame is screwed to the wall so it can’t be stolen. Nobody has ever wanted to steal it.' } },
        '3': { item: 'art', props: { face: 's', color: '#8a9ab0', title: 'Harbor', kicker: 'Hall', text: 'A harbor at dawn, slightly crooked. You straighten it every time you pass. It is crooked again every morning.' } },

        // the kitchen
        F: { item: 'apt-fridge', props: { dir: 's' } },
        i: { item: 'apt-counter', props: { dir: 's' } },
        k: { item: 'apt-counter', props: { dir: 's', kind: 'sink' } },
        M: { item: 'apt-counter', props: { dir: 's', kind: 'microwave' } },
        Z: { item: 'apt-oven', props: { dir: 's' } },
        T: 'apt-kitchen-table',
        '›': { item: 'chair', props: { dir: 'w' } },
        '‹': { item: 'chair', props: { dir: 'e' } },
        '4': { item: 'art', props: { face: 'e', color: '#e0b060', title: 'Venice at dusk', kicker: 'Garage sale, $4', text: 'Gondolas, a pink sky, a bridge. The painter got the water exactly right and the buildings exactly wrong. You’ve never been. You’d like to go.' } },

        // the living room
        B: { item: 'apt-bookshelf', props: { dir: 's' } },
        V: { item: 'apt-tv', props: { dir: 'w', w: 3 } },
        G: 'apt-console',
        S: { item: 'apt-sofa', props: { dir: 'e', w: 2, color: '#6a4a3a' } },
        C: { item: 'apt-coffee-table', props: { oy: 16 } },
        a: { item: 'armchair', props: { dir: 'e', color: '#5a6a4a' } },
        U: { item: 'rug', props: { w: 4, h: 3, color: '#7a3a2a', border: '#d8b070' } },
        '5': { item: 'art', props: { face: 's', color: '#3a5a8a', title: 'Kyoto in the rain', kicker: 'Garage sale, $2', text: 'A jigsaw puzzle of a temple in the rain, glued and framed. Three pieces are missing. You’ve looked for them for a year. You’d like to see the real one, all of its pieces.' } },
        '6': { item: 'art', props: { face: 's', color: '#2a6a5a', title: 'The Northern Lights', kicker: 'Garage sale, $5', text: 'The northern lights, on black velvet. Tasteless and wonderful. You’d like to see them without the velvet.' } },
        '7': { item: 'art', props: { face: 's', color: '#e8c070', title: 'Lisbon tram', kicker: 'Garage sale, $1', text: 'A postcard of a yellow tram on a steep street, in a frame far too big for it. The back says “Wish you were here.” It isn’t addressed to anyone.' } },

        // the short hall and the guest bath
        '8': { item: 'art', props: { face: 'n', color: '#5a7a4a', title: 'Mountain lake', kicker: 'Garage sale, $3', text: 'A paint-by-numbers mountain lake. Whoever painted it stopped at number 37. The sky is still numbered. You like it better unfinished.' } },
        l: { item: 'apt-toilet', props: { dir: 's' } },
        h: { item: 'apt-counter', props: { dir: 's', kind: 'basin', room: 'Guest bath', top: '#e4e6e8' } },
        H: { item: 'apt-counter', props: { dir: 's', kind: 'basin', room: 'Master bath', top: '#e4e6e8', text: 'Hot on the left. Hot on the right. You live with it.' } },
        r: { item: 'apt-mirror', props: { face: 's' } },

        // the bedroom and master bath
        K: { item: 'apt-closet', props: { face: 's', w: 3 } },
        '9': { item: 'art', props: { face: 's', color: '#8a9ab8', title: 'New York, 1998', kicker: 'Garage sale, free', text: 'A calendar page: New York, March 1998, framed. The skyline is the skyline it was. You’d like to go, even though that city isn’t quite there anymore.' } },
        '0': { item: 'art', props: { face: 'e', color: '#b8a070', title: 'Paris (allegedly)', kicker: 'Garage sale, $6', text: 'Paris, as painted by someone who had heard of Paris. The Eiffel Tower has a door in it. You’d like to go and check.' } },
        Y: { item: 'apt-bed', props: { w: 3, h: 2, head: 'e' } },
        n: { item: 'apt-nightstand', props: { radio: true } },
        N: 'apt-nightstand',
        X: { item: 'apt-dresser', props: { dir: 'e' } },
        W: 'apt-shower',
      },

      traps: [
        {
          // when the story says it's time to go, the rope comes down and the stairs lead to the office
          trigger: { type: 'flag', tag: 'timeToLeave' },
          effects: [
            { type: 'terrain', tag: 'aptStairsDown', terrain: 'exit', sound: 'door' },
            { type: 'message', text: 'Somewhere in the stairwell, a rope drops to the floor.', kind: 'key' },
          ],
        },
      ],

      rooms: [
        { name: 'The Stairwell', rect: [1, 1, 4, 6], note: 'Floor 7 · the elevators are out' },
        { name: 'Elevator Lobby', rect: [42, 1, 5, 7], note: 'Out of order' },
        { name: 'The Seventh Floor', rect: [6, 2, 35, 3], note: 'Home, almost' },
        { name: 'Kitchen', rect: [9, 6, 9, 8], note: 'Unit 7C' },
        { name: 'Living Room', rect: [18, 6, 20, 10], note: 'Unit 7C' },
        { name: 'Guest Bath', rect: [15, 17, 4, 5], note: 'Unit 7C' },
        { name: 'Bedroom', rect: [24, 17, 14, 11], note: 'Unit 7C' },
        { name: 'Master Bath', rect: [32, 17, 6, 5], note: 'Unit 7C' },
      ],

      // the hall's fluorescents, the apartment's lamps
      ceilingLights: [
        { variants: [0], every: 4, offset: [2, 3], color: '#fff0d0', radius: 170, intensity: 0.4 },
        { variants: [5], every: 3, offset: [2, 2], color: '#e8f0e0', radius: 140, intensity: 0.38, flicker: 0.15 },
        { variants: [1, 2, 3, 4], every: 4, offset: [1, 1], color: '#ffd8a8', radius: 170, intensity: 0.42 },
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
        "     s p                                       L",
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
