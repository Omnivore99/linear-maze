/* The Linear Maze — levels/town-map.js
 * The Town Map (Chessboard 0). A tiny room you never see: the map of the town covers the screen while
 * you're here (packs/town/map.js), with pins for the places you and Alice went together.
 * You arrive from the apartment's stairs (the morning after Alice's call), and from every town place's EXIT.
 */
'use strict';
LM.definePack({
  id: 'town',
  levels: {
    'town-map': {
      name: 'Town Map',
      floorLabel: 'Chessboard 0 · Town',
      environment: 'town-map',
      armed: false,
      alice: true,
      intro: 'The town: a few streets you know by heart.',
      legend: { S: { terrain: 'floor', start: true } },
      map: [
        '#####',
        '#...#',
        '#.S.#',
        '#...#',
        '#####',
      ],
    },
  },
});
