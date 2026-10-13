/* The Linear Maze — levels/03-gilded-reliquary.js
 * Floor 3. A golden treasury: wardens with shockwave attacks, a candle hall
 * that goes dark, a vault whose idol seals the doors, and the Keeper.
 *
 * Map key: see the default legend in packs/core/terrain.js. Characters defined
 * in this level's own `legend` override the defaults for this floor only.
 * Tags (tag: 'name') let traps refer to tiles by name instead of coordinates.
 */
'use strict';
LM.definePack({
  id: 'core',
  levels: {
    'gilded-reliquary': {
      name: 'The Gilded Reliquary',
      order: 3,
      environment: 'reliquary',
      intro: 'The heat falls away. The next stair is swept clean, and somewhere below, someone is singing.',
      attractPath: [[22, 18], [56, 18], [56, 22], [22, 22]],
      legend: {
        N: { terrain: 'wall', item: 'banner', props: { color: '#6a1e26' } },
        Q: { item: 'crystal', props: { color: '#f2c96b' } },
        '1': { enemy: 'warden', variant: 1 },
        '7': { terrain: 'floor', variant: 1, tag: 'votiveDark' },
        j: { item: 'candles', variant: 1, tag: 'votive' },
        s: { terrain: 'floor', variant: 1, tag: 'votiveSpawn' },
        '-': { item: 'bench', variant: 1 },
        '0': { item: 'gold', variant: 1 },
        '8': { item: 'medkit', variant: 1 },
        e: { item: 'chest', variant: 1, props: { table: 'chest-rich', name: 'Votive coffer' } },
        a: {
          item: 'altar',
          variant: 1,
          props: { deity: 'Altar of Small Mercies', tithe: 60, text: 'Hundreds of stubs of candle, each one a request. The oldest have melted into the stone.' },
        },
        A: {
          item: 'altar',
          props: { deity: 'Altar of the Crossing', tithe: 50, text: 'A gilded table with nothing on it but a ring of fingerprints in the gold leaf.' },
        },
        J: { item: 'armor-stand', variant: 1, props: { armor: 'iron-sallet' } },
        U: { item: 'armor-stand', props: { armor: 'gilded-circlet' } },
        u: {
          item: 'lectern',
          props: {
            title: 'Inventory of the Reliquary, abridged',
            text: 'One finger of Saint Ilse, in crystal. One tooth of the same. A vial of the flood, sealed.\n\nThe Gilded Idol, which is not to be lifted, for reasons the Keeper does not explain and we have stopped asking.\n\nThe Keeper itself, which was here before the inventory began.',
          },
        },
        l: {
          item: 'lectern',
          props: {
            title: 'A Pilgrim\u2019s Note',
            text: 'If you have come this far you have the violet door ahead of you and no key for it. The key is in the vault, east of the crossing, in the coffer by the far wall.\n\nTake the key. Leave the idol. I did not, and I am writing this from inside the vault.',
          },
        },
        '&': { terrain: 'door', tag: 'vaultDoor' },
        '9': { terrain: 'floor', tag: 'vaultSpawn' },
        I: { item: 'idol', tag: 'idol', props: { value: 150 } },
        C: {
          item: 'chest',
          props: {
            name: 'Reliquary arms chest',
            loot: [{ type: 'weapon', id: 'ember-mortar' }, { type: 'ammo', ammo: 'rockets', amount: 6 }, { type: 'gold', amount: 40 }],
          },
        },
        G: {
          item: 'chest',
          props: { name: 'Coffer by the far wall', loot: [{ type: 'key', color: 'violet' }, { type: 'gold', amount: 45 }, { type: 'armor', id: 'warding-charm' }] },
        },
        V: { terrain: 'door-violet', tag: 'sanctumGate' },
        K: { enemy: 'keeper', tag: 'boss' },
        Z: { terrain: 'door', tag: 'sanctumExit', props: { sealed: true } },
        '3': { item: 'ammo-rounds' },
        '4': { item: 'ammo-rockets' },
      },
      rooms: [
        { name: 'The Narthex', rect: [33, 43, 13, 7], note: 'Entrance' },
        { name: 'The Processional', rect: [35, 27, 9, 15] },
        { name: 'The Crossing', rect: [17, 13, 45, 13] },
        { name: 'Hall of Votives', rect: [3, 9, 13, 21] },
        { name: 'The Vault', rect: [63, 11, 17, 17], note: 'Treasury' },
        { name: 'The Sanctum', rect: [25, 1, 29, 11] },
        { name: 'The Last Stair', rect: [55, 4, 7, 5], note: 'Way down' },
      ],
      traps: [
        {
          // walking into the candle hall snuffs every candle and lets the swarm in
          trigger: { type: 'zone', tag: 'votiveDark' },
          effects: [
            { type: 'lights', tag: 'votive', on: false, text: 'The candles gutter out, all at once.' },
            { type: 'spawn', tag: 'votiveSpawn', enemies: ['skitter', 'skitter', 'skitter', 'skitter'], delay: 0.9 },
          ],
        },
        {
          // lifting the idol seals the vault until everything it releases is dead
          trigger: { type: 'pickup', tag: 'idol' },
          effects: [
            { type: 'seal', tag: 'vaultDoor', text: 'The vault door slams and locks' },
            { type: 'quake', strength: 0.5 },
            { type: 'spawn', tag: 'vaultSpawn', enemies: ['warden', 'skitter', 'brute', 'skitter', 'skitter', 'warden', 'skitter'], delay: 0.8 },
          ],
        },
        {
          trigger: { type: 'door', tag: 'sanctumGate' },
          effects: [{ type: 'message', text: 'The Keeper turns toward you.', kind: 'warn' }],
        },
        {
          // killing the Keeper opens the way down
          trigger: { type: 'clear', tag: 'boss' },
          effects: [{ type: 'unseal', tag: 'sanctumExit', text: 'The far door grinds open.' }],
        },
      ],
      map: [
      "                        ####T#######T#####T#######T####",
      "                        #t......*.............*......t#",
      "                        #.............................#",
      "                        #.....o.................o.....#########",
      "                        #...........................4.#t.....t#",
      "                        #..............K..............#..$....#",
      "                        N.4.......o.........o.........Z....>..#",
      "                        #.............................#..$....#",
      "  #######T#######       #.............................#t.....t#",
      "  #,s,,,,,,0,,s,#       #.....o.................o.....#########",
      "  #,e,,,,,,,,7,,#       #.............................#       ###T##########T####",
      "  #,,j,,,j,,,7,,#       #H......*.............*......H#       #.................#",
      "  #,,,,,,,,,,7,,######T###N###T########V########T###N###T######..C.....Q......G.#",
      "  T,,,,-,,,,,7,,#*...........................................*#.......$.9.......#",
      "  #,,,,,,,,,,7,,#....................i.A.i....................#.9...............#",
      "  #,,j,,,j,,,7,,#....o.....o.......................o.....o....#.....o.....o...9.T",
      "  #,,,,,,,,,,7,,#..$.............~~~~~~~~~~~~~.............3..#.................#",
      "  #,,,,-,,,,,7,,#................~~~~~~~~~~~~~................#...$..........$..#",
      "  #,,,,,,,,,,7,,#.............f..~~~~~~~~~~~~~..f.............#..........$......#",
      "  #,a,,,,,s,,7,,+........w.......~~~~~~~~~~~~~........w.......&.......9.....I...#",
      "  #,,,,,,,,,,7,,#................~~~~~~~~~~~~~................#.................#",
      "  #,,,,-,,,,,7,,#................~~~~~~~~~~~~~................#....$............#",
      "  #,,,,,,,,,,7,,#..............f...............f...........$..#............$....#",
      "  #,,j,,,j,,,7,,#....o.....o.......................o.....o....#.....o.....o...9.T",
      "  #,,,,,,,,,,7,,#.u............M............................E.#.9...............#",
      "  T,,,,-,,,,,7,,#*...........................................*#......$..9.......#",
      "  #,,,,,,,,,,7,,######T#######T####.........####T#######T######..U.....Q......c.#",
      "  #,,j,,,j,,,7,,#                 #...,,,...#                 #.................#",
      "  #,s,,,,,,,,7J,#                 #...,,,...#                 ###T##########T####",
      "  #,,,0,,,,8,,,,#                 #.o.,,,.o.#",
      "  #######T#######                 N.*.,,,.Q.T",
      "                                  #...,1,...#",
      "                                  #.o.,,,.o.#",
      "                                  T...,,,...N",
      "                                  #..h,,,...#",
      "                                  #.o.,,,.o.#",
      "                                  #.Q.,,,.*.#",
      "                                  N...,,,...T",
      "                                  #.o.,,,.o.#",
      "                                  #..f,,,f..#",
      "                                  #...,,,...#",
      "                                  #...,,,...#",
      "                                ####T##+##T####",
      "                                #.............#",
      "                                #.i.........i.#",
      "                                N.............N",
      "                                #.............#",
      "                                #k............#",
      "                                #.$....<....l.#",
      "                                #.............#",
      "                                ####T#####T####"
      ],
    },
  },
});
