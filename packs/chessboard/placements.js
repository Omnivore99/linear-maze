/* The Linear Maze — packs/chessboard/placements.js
 * Chessboard pack, part 7: what hangs on Chessboard 1's walls.
 *
 * The office part of Chessboard 1 has the same coordinates as the 14th floor,
 * so it reuses the Memos pack's 14th-floor placements (they show their honest
 * versions here, because the level has `honest: true`), minus Alice's desk.
 * The east wing adds its own: demotivational posters, the arrow notices that
 * lead around the loop to the server farm, warning signs, more cameras, and
 * a few desk toys that belong to particular people.
 * Format: see packs/memos/placements.js. Check with node tools/memos/check-placements.mjs
 */
'use strict';
(function () {
  const LM = window.LM;
  const MEMOS = LM.MEMOS;

  // ------------------------------------------------------------ notices only Chessboard 1 has
  Object.assign(MEMOS.notices, {
    supplydesk: {
      by: 'mgmt', paper: '#ffd2c2', title: 'Warning: Supply Room',
      text: 'All supply requests must be submitted to the Supply Desk in triplicate.\n\nUnauthorized entry into the Supply Room will be processed.\n\nYou will be the thing that is processed.',
      honest: null,
    },
    supplyinside: {
      by: 'mgmt', paper: '#ffd2c2', title: 'Do not enter',
      text: 'This door is monitored by Gertrude.\n\nGertrude does not mind if you look at the door. Gertrude minds if you go through the door.',
      honest: null,
    },
    strike: {
      by: 'staff', paper: '#f4e8c8', title: 'ON STRIKE',
      text: 'Brooms Local 14 is on strike until further notice.\n\nOur demands: a dustpan for every broom. Weekends. Recognition that the mop is not one of us.\n\nSweep your own hall.',
      honest: null,
    },
    lounge: {
      by: 'staff', paper: '#e0f0ff', title: 'Lounge rules',
      text: 'There is always room for one more. Please make room.\n\nIf you are the one more, please do not ask where the others went. They are making room.',
      honest: null,
    },
  });
  Object.assign(MEMOS.toys, {
    youdoll: {
      name: 'Voodoo doll', look: 'voodoo', honest: true,
      text: 'A little felt doll of you, holding a tiny status report. No pins in it yet.\n\nBeside it, a pincushion. Full.',
    },
  });

  // ------------------------------------------------------------ placements
  const office = (MEMOS.placements['meridian-fourteen'] || []).filter((p) => p[1] !== 'alice-desk');
  const ARROW = (x, y, face, dir, extra) => ['notice', null, x, y, face, Object.assign({ arrow: dir, title: 'Server room' }, extra || {})];
  MEMOS.placements['chessboard-one'] = office.concat([
    // the back hall
    ['poster', 'retention', 95, 37, 's'],
    ['poster', 'meetings', 103, 37, 's'],
    ['poster', 'potential', 97, 41, 'n'],
    ['poster', 'wellness', 104, 41, 'n'],
    ['notice', 'strike', 90, 37, 's'],
    ['notice', 'supplydesk', 96, 41, 'n'],
    ['notice', 'devices', 89, 41, 'n'],
    ['notice', 'supplydesk', 95, 41, 's'],
    ['notice', 'supplyinside', 96, 47, 'n'],
    ['notice', 'lounge', 103, 41, 's'],
    // the arrows: round the loop clockwise, then back beside the farm
    ARROW(109, 39, 'w', 'n', { text: 'Daily report personnel: the server room is this way.\n\nFollow the arrows. All of them, in order, the way they point. Do not skip an arrow. The arrows know.' }),
    ARROW(108, 32, 's', 'e'),
    ARROW(121, 32, 's', 'e'),
    ARROW(134, 32, 's', 'e'),
    ARROW(143, 34, 'w', 's'),
    ARROW(143, 45, 'w', 's'),
    ARROW(141, 59, 'n', 'w'),
    ARROW(128, 59, 'n', 'w'),
    ARROW(106, 57, 'e', 'n'),
    ARROW(106, 50, 'e', 'n'),
    ARROW(106, 45, 'e', 'e', { title: 'Server room (here)', text: 'You have arrived at the server room.\n\nIf there is no door, you have not followed the arrows. Go round again.' }),
    // demotivation, all the way round
    ['poster', 'teamwork', 114, 32, 's'],
    ['poster', 'perseverance', 128, 32, 's'],
    ['poster', 'growth', 115, 56, 's'],
    ['poster', 'communication', 125, 56, 's'],
    ['poster', 'vision', 135, 56, 's'],
    ['poster', 'leadership', 143, 52, 'w'],
    ['poster', 'opportunity', 106, 53, 'e'],
    ['poster', 'excellence', 140, 40, 'e'],
    ['poster', 'achievement', 117, 64, 'n'],
    ['poster', 'balance', 131, 29, 'w'],
    // cameras: the loop and the farm
    ['camera', null, 106, 33, 'e', { corner: 'l' }],
    ['camera', null, 143, 33, 'w', { corner: 'l' }],
    ['camera', null, 143, 58, 'w', { corner: 'r' }],
    ['camera', null, 106, 58, 'e', { corner: 'r' }],
    ['camera', null, 109, 36, 'e', { corner: 'l' }],
    ['camera', null, 140, 36, 'w', { corner: 'l' }],
    ['camera', null, 140, 55, 'w', { corner: 'r' }],
    ['camera', null, 98, 42, 'w', { corner: 'l' }],
    // toys that belong to somebody in particular
    ['item', 'desk-toy', 47, 32, null, { toy: 'beartrap', oy: -4, owner: 'Priya' }],
    ['item', 'desk-toy', 47, 37, null, { toy: 'harpoon', owner: 'Gary' }],
    ['item', 'desk-toy', 95, 4, null, { toy: 'youdoll', ox: 26, oy: -4, owner: 'Dana' }],
  ]);
  MEMOS.deskToyFloors['chessboard-one'] = true;
  MEMOS.inboxes['chessboard-one'] = ['tasks', 'tps', 'alice', 'training', 'bounty', 'bob'];
})();
