/* The Linear Maze — levels/02-ember-foundry.js
 * Floor 2. An iron works: slag rivers, sentry turrets, a laser tripwire with a
 * crawlspace around it, a pump station, a break room with slot machines, and
 * the gold key on an island in the crucible.
 *
 * Map key: see the default legend in packs/core/terrain.js. Characters defined
 * in this level's own `legend` override the defaults for this floor only.
 * Tags (tag: 'name') let traps refer to tiles by name instead of coordinates.
 */
'use strict';
LM.definePack({
  id: 'core',
  levels: {
    'ember-foundry': {
      name: 'The Ember Foundry',
      order: 2,
      environment: 'foundry',
      next: 'gilded-reliquary',
      intro: 'Below the Sinkhole the stone turns to iron. You can hear the furnaces before you see them.',
      attractPath: [[14, 14], [36, 14], [36, 30], [14, 30]],
      legend: {
        L: { terrain: 'wall', item: 'beam-emitter', tag: 'b1' },
        '5': { terrain: 'floor', tag: 'gallery' },
        '6': { terrain: 'floor', tag: 'crucibleBridge' },
        '2': { item: 'ammo-cells' },
        '3': { item: 'ammo-rounds' },
        '4': { item: 'ammo-rockets' },
        y: { item: 'key', props: { color: 'gold' }, tag: 'goldKey' },
        C: {
          item: 'chest',
          props: {
            name: 'Foreman\u2019s locker',
            loot: [{ type: 'weapon', id: 'rivet-gun' }, { type: 'ammo', ammo: 'rounds', amount: 80 }, { type: 'gold', amount: 30 }, { type: 'armor', id: 'runner-boots' }],
          },
        },
        q: {
          item: 'lectern',
          props: {
            title: 'Foreman\u2019s Ledger',
            text: 'Shift tallies, week of the Long Burn.\n\nMelters: nine present, two missing. Pourers: six present, four missing. The missing are not in the town and not in the slag. I have checked the slag.\n\nThe gold key to the lift stays in the crucible, where only the brave or the stupid will fetch it. I am neither. I am going up.',
          },
        },
        U: { item: 'armor-stand', props: { armor: 'aegis-harness' } },
        W: { item: 'weapon-rack', props: { weapon: 'arc-lance' } },
        S: { item: 'slot-machine', props: { name: 'The Brass Widow' } },
        E: { item: 'recharge-station', props: { name: 'Pump-house charger', reserve: 160 } },
      },
      rooms: [
        { name: 'The Landing', rect: [1, 19, 9, 7], note: 'Stairwell' },
        { name: 'Gantry Hall', rect: [11, 9, 29, 27] },
        { name: 'The Tripwire Gallery', rect: [41, 21, 13, 3], note: 'Passage' },
        { name: 'Pump Station', rect: [55, 13, 17, 19] },
        { name: 'The Tally Room', rect: [57, 3, 13, 9], note: 'Break room' },
        { name: 'The Crucible', rect: [51, 33, 29, 13] },
        { name: 'The Lift Shaft', rect: [79, 18, 6, 9], note: 'Way down' },
      ],
      traps: [
        {
          // crossing either red beam rings the bell and opens the vents behind you
          trigger: { type: 'beam', tag: 'b1' },
          effects: [
            { type: 'alarm', radius: 700, text: 'A bell rings somewhere in the foundry' },
            { type: 'spawn', tag: 'gallery', enemy: 'skitter', delay: 0.5 },
          ],
        },
        {
          // lifting the gold key wakes the crucible
          trigger: { type: 'pickup', tag: 'goldKey' },
          effects: [
            { type: 'quake', strength: 0.45 },
            { type: 'message', text: 'The crucible groans. Things crawl up out of the slag.', kind: 'warn' },
            { type: 'spawn', tag: 'crucibleBridge', enemies: ['skitter', 'skitter', 'skitter'], count: 4, delay: 0.8 },
          ],
        },
      ],
      map: [
      "",
      "",
      "                                                        ###T######T####",
      "                                                        #.S..S......C.#",
      "                                                        #.......g.....#",
      "                                                        #$............#",
      "                                                        #.............#",
      "                                                        #...n.....n..$#",
      "          #####T#################T#######               #.............#",
      "          #.............%%%.............#               #...-.....-...#",
      "          #.h...........%%%...........X.#               #q..........g.#",
      "          #.............%%%.............#               #............3#",
      "          T.............%%%...g.........T             #########+#########",
      "          #....x........%%%.....b.......#             #.................#",
      "          #....x........,,,.............#             #.E......g......U.#",
      "          #.............,,,..........$..#             T.................#",
      "          #.............%%%.............#             #...o.........o...#",
      "          #.............%%%.............#             #.................T     ########",
      "####T######.............%%%.............#             #.....~~~~~~~.....#     #t....t#",
      "#......xx.#.............%%%.............#             #.....~~~~~~~.....#     #......#",
      "#.........#........x....%%%.......g.....#####L#T#L#####.....~~~~~~~.....#######..$...#",
      "#.........#.............%%%........b....#55...........#.....~~~~~~~.....#............#",
      "#.<.......+.............%%%.............+.............+.....~~~~~~~.....Y.........>..#",
      "#.........#.............%%%.............#55...........#.....~~~~~~~.....#............#",
      "#.a.......#........x....%%%..........p..###.#L###L#.###.....~~~~~~~..g..#######....$.#",
      "#.......b.#.............%%%.............# #.#     #.# #.3...~~~~~~~.....#     #......#",
      "####T######.............%%%.............# #.#######.# #.................#     #t....t#",
      "          #.............%%%.............# #...xx.$..# #...o.........o...T     ########",
      "          #.............,,,.............# ########### #.................#",
      "          #.............,,,.............#             T..xx....M......x.#",
      "          T...x.........%%%......b......#             #................b#",
      "          #.............%%%....g........#             #................X#",
      "          #.............%%%.............T         #####T#######+###########T#####",
      "          #.........f...%%%.............#         #.4..........................X#",
      "          #.a........f..%%%..$..........#         #.f...........2.............p.#",
      "          #.............%%%.............#         #..f..........................T",
      "          #####T#################T#######         T................%%%%%%%%%%%%.#",
      "                                                  #................%%%%%%%%%%%%.#",
      "                                                  #..%%%.%%%%...g..%%%%%%%%%%%%.#",
      "                                                  #..%%%.%%%%......%%%......%%%.#",
      "                                                  #..%%...%%%.....6%%%...M..%%%.#",
      "                                                  #..%%.W.%%%...........y...%%%.#",
      "                                                  T..%%...%%%.....6%%%......%%%.#",
      "                                                  #..%%%%%%%%b.....%%%......%%%.#",
      "                                                  #..%%%%%%%%.p..b.%%%%%%%%%%%%.#",
      "                                                  #H...............%%%%%%%%%%%%.#",
      "                                                  #######T######T#######T########"
      ],
    },
  },
});
