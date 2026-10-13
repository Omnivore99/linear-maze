/* The Linear Maze — levels/01-sunken-cloister.js
 * Floor 1. A flooded monastery: water, pillars, a spike stair, an ossuary
 * holding the red key, a dart corridor, a shrine, and a sinkhole of pits.
 *
 * Map key: see the default legend in packs/core/terrain.js. Characters defined
 * in this level's own `legend` override the defaults for this floor only.
 * Tags (tag: 'name') let traps refer to tiles by name instead of coordinates.
 */
'use strict';
LM.definePack({
  id: 'core',
  levels: {
    'sunken-cloister': {
      name: 'The Sunken Cloister',
      order: 1,
      environment: 'cloister',
      next: 'ember-foundry',
      intro: 'The stair ends in cold water and old stone. Far above you, very faintly, a phone is ringing on the fourteenth floor. Nobody picks it up.',
      attractPath: [[23, 9], [41, 9], [41, 12], [23, 12]],
      legend: {
        '1': { terrain: 'plate', tag: 'p1' },
        D: { terrain: 'wall', item: 'dart-emitter', tag: 'd1' },
        s: { terrain: 'door', tag: 'shrineDoor' },
        '9': { terrain: 'water', tag: 'channel' },
        C: {
          item: 'chest',
          props: {
            name: 'The sexton\u2019s strongbox',
            loot: [{ type: 'weapon', id: 'scattergun' }, { type: 'ammo', ammo: 'shells', amount: 16 }, { type: 'gold', amount: 25 }],
          },
        },
        q: {
          item: 'lectern',
          props: {
            title: 'The Sexton\u2019s Daybook',
            text: 'Third day of the flood. The lower nave took water to the knee, and the brothers would not leave their prayers.\n\nI have put the ossuary key on the dais, among the bones, where no one living will go looking for it. Whatever walks the aisles now has no use for keys.\n\nThe rest of the page is wet through.',
          },
        },
        u: {
          item: 'lectern',
          props: {
            title: 'Chapter Rule, Article Nine',
            text: 'No brother shall descend past the Sinkhole without leave of the Prior.\n\nThe stairs below the Sinkhole were not cut by this house. They were here when we came, and they go down farther than any of our maps.',
          },
        },
        A: {
          item: 'altar',
          props: {
            deity: 'Altar of the Drowned Saint',
            tithe: 40,
            text: 'Wax has run down the stone in long pale ropes. Someone carved a small boat into the altar\u2019s lip, and someone else scratched it out.',
          },
        },
        U: { item: 'armor-stand', props: { armor: 'oilskin-coat' } },
      },
      rooms: [
        { name: 'The Lower Nave', rect: [17, 1, 29, 15] },
        { name: 'The Penitents\u2019 Stair', rect: [30, 17, 3, 6], note: 'Passage' },
        { name: 'The Ossuary', rect: [19, 24, 27, 10] },
        { name: 'The Sexton\u2019s Store', rect: [9, 25, 9, 7], note: 'Storeroom' },
        { name: 'The Weeping Passage', rect: [47, 29, 12, 2], note: 'Passage' },
        { name: 'The Chapter House', rect: [49, 5, 20, 13] },
        { name: 'Shrine of the Drowned Saint', rect: [56, 1, 5, 3], note: 'Shrine' },
        { name: 'The Sinkhole', rect: [70, 3, 20, 17] },
      ],
      traps: [
        {
          // pressure plates across the passage set off wall darts
          trigger: { type: 'plate', tag: 'p1' },
          effects: [{ type: 'darts', tag: 'd1', volleys: 3, interval: 0.35, damage: 10 }],
          once: false,
          cooldown: 3,
        },
        {
          // opening the shrine door wakes the drowned in the channel
          trigger: { type: 'door', tag: 'shrineDoor' },
          effects: [
            { type: 'message', text: 'Something stirs in the channel.', kind: 'warn' },
            { type: 'spawn', tag: 'channel', enemy: 'husk', delay: 0.6 },
          ],
        },
      ],
      map: [
      "##T#####T##     ###T#####T############T#####T##        #######",
      "#.........#     #.............,,,,............#        #i.A.i#",
      "#......i..#######....m........,,,,.....m......#        #.....#       ###T#######T#######T##",
      "#.........#...................,,,,.m..........#        #$...U#       #OOOOOOOOOOOOOOOOOOOO#",
      "#..<......+.........o...o...o.,,,,..o...o...o.# ###T######s#######T###OOOOOOOOOOOOOOOOOOOO#",
      "#.........#..............$....,,,,............# #...................t#......OOOOO.......OO#",
      "#.......k.#######.............,,,,............# #..g..........g......+......OOOOO.......OO#",
      "#.k.......#     #.....~~~~~~~~,,,,~~~~~~~~....# #...o...o...o...o....#......OOH.O..OOO..OO#",
      "##T#####T##     #.t...~~~~~~~~,,,,~~~~~~~~..t.# #$................g..#OOOO..OO$$O..OOO..OO#",
      "                #.....~~~~~~~~,,,,~~~~~~~~....# #....................#OOOO..OO..O.m..O..OO#",
      "                #.............,,,,........ff..# #~~~~~~~~~.~~~~~~~~~~#OOOO..OOOOO..c.O.gOO#",
      "                #.............,,,,....$.......# #~~~9~~~9~.~~9~~~~9~~#OOOO..OOOOO....O..OO#",
      "                #...o...o...o.,,,,..o...o...o.# #~~~~~~~~~.~~~~~~~~~~#OOOO....f.f..OOO..OO#",
      "                #.........m...,,,,........m...# #....................#OOOO.........OOO..OO#",
      "                #...$.........,,,,............# #....................#OOOOOOOOOOOOOOOO..OO#",
      "                #h............,,,,............# #...o...o...o...o....#OOOOOOOOOOOOO......t#",
      "                ###T#####T####...#####T#####T## #.u.........F......$.#OOOOOOOOOOOOO.t.....#",
      "                             T...#              #t..................t#OOOOOOOOOOOOO..g....#",
      "                             #^^^#              ####T####R######T#####OOOOOOOOOOOOO.....>.#",
      "                             #^^^#                      #..#         #OOOOOOOOOOOOO.......#",
      "                             #^^^T                      #..#         ######T#########T#####",
      "                             #^^^#                      #..T",
      "                             #...#                      #..#",
      "                  ###T####T###...####T#####T###         #..#",
      "        ####T######...........................#         T..#",
      "        #.......xx#.k.................k.......#         #..#",
      "        #.C.......#..f..........m..........f..#         #..#",
      "        #.........#....o.................o....#         #..#",
      "        #q...m....+..........,,,,,,,..........######D#D#D..#",
      "        #.........#..........,i,,,i,..............1........#",
      "        #xa.......#..k.....f.,,,r,,,.f............1........#",
      "        #......bb.#....o.....,i,,,i,.....o....#######D#D####",
      "        ###########...f......,,,,,,,......f.k.#",
      "                  #.......k.....m...k.........#",
      "                  ####T#####T#######T#####T####"
      ],
    },
  },
});
