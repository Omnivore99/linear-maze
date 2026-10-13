/* The Linear Maze — levels/04-chessboard-one.js
 * The Office on Chessboard 1. After the Reliquary, the last stair goes up,
 * and you are back on the 14th floor of Meridian Group. One level of reality
 * down (after JAGS Wonderland's chessboards), everything is a little off and
 * everyone is the real version of themselves.
 *
 * Three work tasks before 5:00 PM (packs/chessboard/workday.js):
 *   1 the status meeting in Zeno's Paradox        (meeting.js)
 *   2 the daily report module in the server farm   (ends the floor)
 *   3 Brenda's surveillance training               (npcs.js)
 *
 * Needs the Office, Memos and Chessboard packs. The map and objects grids are
 * generated into packs/chessboard/layout.js by tools/chessboard/build-layout.mjs
 * (the office part is copied from the 14th floor at the same coordinates).
 * The object legend starts from the 14th floor's and overrides what changed.
 */
'use strict';
(function () {
  const base = LM.get('levels', 'meridian-fourteen');
  const was = base.objectLegend;
  const layout = LM.CHESSBOARD_LAYOUT;
  /** A 14th-floor coworker, same seat and look, honest lines. */
  const honest = (ch, lines, truth, barks) => ({ npc: 'cb-coworker', props: Object.assign({}, was[ch].props, { lines, truth, barks: barks || was[ch].props.barks }) });
  const art = (ch, title, text) => ({ item: 'art', props: Object.assign({}, was[ch].props, { title, text }) });
  const attendee = (seat, face, oy, name, role, report, verdict, extra) => ({ npc: 'cb-attendee', props: Object.assign({ seat, face, oy, name, role, report, verdict }, extra || {}) });

  LM.definePack({
    id: 'chessboard',
    levels: {
      'chessboard-one': {
        name: 'The Office on Chessboard 1',
        floorLabel: '14th floor · Chessboard 1',
        order: 4,
        environment: 'chessboard-office',
        honest: true, // posters, notices, cameras and desk toys show their honest versions
        intro: 'The last stair below the Reliquary doesn’t go down. It goes up, fourteen floors, and opens onto a lobby you know. Same carpet. Same plants. The light is a little greener. Your phone says you have three tasks due by end of day.',
        bobArea: [110, 36, 30, 20], // the server farm: Bob never leaves it
        techAside: [110, 44], // where Kevin steps once you're cleared

        // ---------------------------------------------------------------- terrain
        legend: Object.assign({}, base.legend, {
          Z: { terrain: 'door-glass', tag: 'zenoDoor' },
          z: { terrain: 'floor', variant: 7, tag: 'zeno' },
          m: { terrain: 'floor', variant: 9 },
          P: { terrain: 'floor', variant: 9, tag: 'closet' },
          f: { terrain: 'floor', variant: 8 },
          F: { terrain: 'floor', variant: 8, tag: 'farm' },
          R: { terrain: 'server-rack' },
          X: { terrain: 'wall', tag: 'serverDoor' },
          '1': { terrain: 'floor', variant: 9, tag: 'arrow1' },
          '2': { terrain: 'floor', variant: 9, tag: 'arrow2' },
          '3': { terrain: 'floor', variant: 9, tag: 'arrow3' },
          '4': { terrain: 'floor', variant: 9, tag: 'arrow4' },
          '5': { terrain: 'floor', variant: 9, tag: 'arrow5' },
        }),

        // ---------------------------------------------------------------- objects
        objectLegend: Object.assign({}, was, {
          n: 'cb-window',
          G: 'cb-ficus',
          '¤': 'cb-workday',
          '¢': { item: 'cb-cash', props: { amount: 80 } },

          // the meeting in Zeno's Paradox
          'Ω': { npc: 'cb-dana', props: { face: 'w' } },
          'α': attendee(1, 's', 17, 'Trevor Banks', 'Synergy', 'Synergy is up four hundred percent. I don’t know what synergy is. Nobody does. That’s what makes it scalable.', 'That’s a two out of ten. I’m rounding up.'),
          'β': attendee(2, 's', 17, 'Pam Ochoa', 'Compliance', 'Everyone is compliant. Except me. I was out sick with a conscience.', 'We don’t do consciences in Q4.'),
          'γ': attendee(3, 's', 17, 'Wendell Price', 'Accounts', 'We are over budget on bullets.', 'Then this one comes out of your department.'),
          'δ': attendee(4, 'n', -17, 'Ines Duarte', 'Logistics', 'Shipments are on schedule.', 'Really? …Ines. Really?'),
          'ε': attendee(5, 'n', -17, 'Gil Morrow', 'Facilities', '(still loading)', 'Gil’s still regenerating from Tuesday. Skip Gil.', { skip: true, after: 'Tuesday was a big meeting. I’m mostly back.' }),
          'ζ': attendee(6, 'n', -17, 'Ruth Abara', 'People & Culture (temp)', 'I’d like to raise a concern about the shooting.', 'Noted.'),

          // whiteboards, screens and pictures, honestly
          '6': { item: 'whiteboard', props: Object.assign({}, was['6'].props, { title: 'The Riemann Room · whiteboard', text: 'Q3 OBJECTIVES\n1. Grow\n2. Grow more\n3. Consume\n\nThe cat in the corner has been drawn over many times. In each version it is a little bigger and a little closer to the edge of the board. DO NOT ERASE has been crossed out and replaced with DO NOT LOOK.' }) },
          '7': { item: 'whiteboard', props: Object.assign({}, was['7'].props, { title: 'Zeno’s Paradox · whiteboard', text: 'AGENDA\n1. Reports\n2. Consequences\n3. Regeneration\n4. Any other business\n\nUnder it, Zeno’s proof that the meeting can never end: a line from START to the halfway point, then half of the rest, then half of that, getting smaller and smaller until it is just a dot that has been gone over so many times it has worn through the board.' }) },
          '8': { item: 'whiteboard', props: Object.assign({}, was['8'].props, { title: 'Room √−1 · room schedule', text: '9:00  Imaginary meeting\n10:00  Imaginary meeting (squared: cancelled)\n11:00  Real meeting (rescheduled to never)\n\nThe room exists only on Tuesdays and only if you don’t look at it directly.' }) },
          V: { item: 'tv', props: { face: 'w', text: 'Slide 1 of ∞: AGENDA.\n\nThe slide counter goes up. It will always go up. In the corner, a small clip-art pistol.' } },
          t: { item: 'tv', props: { face: 'w', text: 'A screensaver: the Meridian logo bouncing around the screen. It hits the corner exactly every time. It has never missed. Nobody has ever cheered.' } },
          '9': { item: 'sign', props: Object.assign({}, was['9'].props, { text: 'A corkboard, stripped bare except for one card, pinned dead center:\n\nTHE KITCHEN WILL BE CLEAN BY 3:00 FRIDAY, OR THE KITCHEN WILL BE CLEANED OF EVERYONE.\n\nThe pin holding it is a small knife.' }) },
          a: art('a', 'Meridian Tower, 1987', 'A black-and-white photograph of this building going up. Fourteen floors of bare steel against a white sky.\n\nIf you count the floors, there are fifteen. If you count again, the building stands on a vast checkered plain, and there is a second tower beside it, the color of a bishop.'),
          '3': art('3', 'Employee of the Quarter', 'EMPLOYEE OF THE QUARTER, DANA WHITLOCK. Eleven of them.\n\nThe newest one says EMPLOYEE OF THE QUARTER, YOU. It is dated today. It is a little damp, as if someone has only just finished framing it.'),
          A: art('A', 'A framed print', 'A print of a hedge maze seen from above. The small figure in pencil at its center is gone.\n\nThere is a smudge at the maze’s edge, as if someone rubbed out an exit.'),
          '2': art('2', 'Serenity', 'A watercolor of a lake at dawn. The water is perfectly still.\n\nThen it ripples, once, from the middle, as though something very large rolled over underneath.'),
          B: { item: 'bookshelf', props: { title: 'Dana’s bookshelf', text: 'Circle Back to Win. The Gentle Hawk. Synergy Is a Verb. And, well thumbed, with a lot of sticky tabs: Managing by Execution.\n\nA framed photo of Dana at a range, holding a target. Every hole is in the head of the little paper silhouette, which is wearing a lanyard.' } },
          P: { item: 'bookshelf', props: { title: 'Alan’s bookshelf', text: 'An entire shelf of the same book: LINEAR THINKING, by A. Mercer. The author photo is two Alans shaking hands.\n\nEvery copy is signed. Every signature is a little different, as though Alan is still deciding which one of him wrote it.' } },
          L: { item: 'logo', props: { face: 's' } },
          '&': 'elevator',

          // people, as they really are
          '4': { npc: 'cb-receptionist', props: { oy: 14 } },
          '[': { npc: 'cb-kenji', props: { face: 's', oy: 17 } },
          W: 'cb-priya',
          u: 'cb-gary',
          y: { npc: 'cb-tomas', props: { face: 'w', ox: -6 } },
          'σ': 'cb-sam',
          'ß': { npc: 'cb-brenda', props: { face: 's' } },
          'Æ': { npc: 'cb-alan', props: { face: 'n' } },
          $: honest('$', ['(She slides one headphone off.) I designed the new forms. Nobody can fill them out. If they could fill them out, they could leave.'], ['I put a tiny electric chair on my desk for Comic Sans. It’s not a joke. Ask Comic Sans.'], ['Kerning. KERNING.', 'Comic Sans has been dealt with.', '(sketching a door with no handle)']),
          '?': honest('?', ['(He doesn’t look up.) I write the software that watches the people who write software. It’s monitors all the way down.'], ['The cannon on my desk is for code review. It’s loaded. Code review is loaded.'], ['It works on my machine. My machine works on me.', 'Who merged reality on a Friday?', '(typing, louder)']),
          ']': honest(']', ['Oh my gosh, hi! I’m in Marketing. I make the posters. Yes. THOSE posters. I’m so sorry.'], ['My plant is called Engagement. Feed it and engagement goes up. Don’t feed it and engagement goes up anyway, just differently.'], ['Engagement is up! Engagement is HUNGRY!', 'Can we make the logo bigger? Can we make it bite?', 'Circling back. Circling. Circling.']),
          ';': honest(';', ['Morning, neighbor. I count things. Right now I’m counting you.', 'You’re one. You’ve always been one. It’s very consistent.'], ['Alice sat next to you. She took her pad and left her key. No: she left both. Somebody took them. My data says it was you.'], ['The numbers add up. That’s what scares me.', 'Correlation is causation, here.', '(sips coffee that is still cold from 2016)']),
          ':': honest(':', ['Everything you have said on this floor is binding. Including the things you only thought.'], ['The guillotine on my desk is for contract disputes. It has never lost a dispute.'], ['Allegedly. Definitely.', 'Let me stop you right there. Forever.', 'Per my last email, and the one before, and the first one.']),
          '~': honest('~', ['If you’re here about a reimbursement: the form. Then the other form. Then the trebuchet.'], ['I found where the chairs go. Cost center LINEAR-00 buys one chair a quarter. They go in Zeno’s Paradox. Someone needs to sit in them.'], ['Receipts. In blood, ideally.', 'That’s not in the budget. Neither are you.', 'Q4 accruals. Q4 accrues.']),

          // the east wing
          'Б': { npc: 'cb-broom', props: { name: 'Sweeps', role: 'Brooms Local 14 · shop steward', intro: '(The broom in the middle shuffles forward, bristles first.)' } },
          'Г': { npc: 'cb-broom', props: { name: 'Bristles', role: 'Brooms Local 14' } },
          'Д': { npc: 'cb-broom', props: { name: 'Dustin', role: 'Brooms Local 14 · treasurer' } },
          'Ж': { npc: 'cb-doug', props: { face: 's', oy: 17 } },
          'З': { npc: 'cb-patricia', props: { face: 's', oy: 17 } },
          'И': { npc: 'cb-intern', props: { name: 'Jen (intern)' } },
          'Й': { npc: 'cb-intern', props: { name: 'Marcus (intern)', look: { skin: '#8a5a3a', shirt: '#3a6a8a', hairStyle: 'buzz' } } },
          'К': { npc: 'cb-intern', props: { name: 'Priyanka (intern)', look: { skin: '#a8704a', shirt: '#8a5a8a', hairStyle: 'ponytail' } } },
          'Л': { npc: 'cb-hal', props: { face: 'e', ox: -2 } },
          'Ð': { item: 'desk', props: { dir: 's', chair: false, top: '#c8c0a8' } },
          'Ψ': { enemy: 'supply-clerk' },
          'Ш': { item: 'bookshelf', props: { dir: 's', title: 'Supply shelving', text: 'Staplers, in rows, by serial number. Toner, labeled LINEAR. One whole shelf of the new cover sheets.\n\nA box of pens, each one chewed, each one labeled with the name of somebody who no longer works here.' } },
          'Ç': {
            item: 'chest',
            props: {
              name: 'Supply locker',
              loot: [{ type: 'item', id: 'medkit' }, { type: 'item', id: 'medkit' }, { type: 'ammo', ammo: 'shells', amount: 16 }, { type: 'ammo', ammo: 'rounds', amount: 80 }, { type: 'ammo', ammo: 'cells', amount: 30 }, { type: 'ammo', ammo: 'rockets', amount: 4 }, { type: 'gold', amount: 90 }, { type: 'armor', id: 'aegis-harness' }],
            },
          },
          'ж': 'crate',
          'Ü': { item: 'cb-vending', props: { dir: 'w' } },
          'Т': { npc: 'cb-tech', props: { face: 'w' } },
          'Ъ': 'cb-bob',
          'Ŧ': 'cb-terminal',
        }),

        // ---------------------------------------------------------------- story
        traps: [
          { trigger: { type: 'zone', tag: 'zeno' }, once: false, cooldown: 2, effects: [{ type: 'cb-meeting' }] },
          { trigger: { type: 'zone', tag: 'farm' }, effects: [{ type: 'cb-wake' }] },
          {
            // try to go into the supply closet and Gertrude gets up
            trigger: { type: 'zone', tag: 'closet' },
            effects: [{ type: 'alarm', radius: 600, text: 'GERTRUDE: UNAUTHORIZED SUPPLY ACCESS.' }],
          },
          // the arrows, in order
          { trigger: { type: 'zone', tag: 'arrow1' }, once: false, cooldown: 0.5, effects: [{ type: 'cb-arrow', n: 1, of: 5 }] },
          { trigger: { type: 'zone', tag: 'arrow2' }, once: false, cooldown: 0.5, effects: [{ type: 'cb-arrow', n: 2, of: 5 }] },
          { trigger: { type: 'zone', tag: 'arrow3' }, once: false, cooldown: 0.5, effects: [{ type: 'cb-arrow', n: 3, of: 5 }] },
          { trigger: { type: 'zone', tag: 'arrow4' }, once: false, cooldown: 0.5, effects: [{ type: 'cb-arrow', n: 4, of: 5 }] },
          { trigger: { type: 'zone', tag: 'arrow5' }, once: false, cooldown: 0.5, effects: [{ type: 'cb-arrow', n: 5, of: 5 }] },
        ],

        rooms: [
          { name: 'Reception', rect: [58, 32, 29, 15], note: 'Meridian Group · Chessboard 1' },
          { name: 'Restroom', rect: [42, 1, 9, 11], note: 'All-gender · all-seeing' },
          { name: 'The Riemann Room', rect: [52, 1, 11, 9], note: 'Conference room · hypothesis pending' },
          { name: 'Zeno’s Paradox', rect: [64, 1, 11, 9], note: 'Conference room · halfway done, forever' },
          { name: 'Room √−1', rect: [76, 1, 11, 9], note: 'Conference room · imaginary, but bookable' },
          { name: 'The Open Plan', rect: [42, 11, 45, 20], note: '14th floor · Chessboard 1' },
          { name: 'The Cantina', rect: [42, 32, 15, 15], note: 'Break room · clean it' },
          { name: 'Dana Whitlock', rect: [92, 1, 11, 11], note: 'Director of Operations · chairing a meeting' },
          { name: 'Alan Mercer', rect: [92, 13, 11, 9], note: 'VP, Strategy · in a meeting with himself' },
          { name: 'The Training Room', rect: [92, 23, 11, 8], note: 'Formerly the Quiet Room' },
          { name: 'Executive Corridor', rect: [88, 1, 3, 30], note: 'Corridor' },
          { name: 'West Hall', rect: [38, 1, 3, 46], note: 'Corridor' },
          { name: 'The Back Hall', rect: [88, 38, 18, 3], note: 'Employees only' },
          { name: 'Broom Closet', rect: [89, 34, 4, 3], note: 'Union shop · on strike' },
          { name: 'Records', rect: [94, 33, 11, 4], note: 'Occupied since 2009' },
          { name: 'The Supply Desk', rect: [88, 42, 10, 5], note: 'Requests in triplicate' },
          { name: 'The Supply Closet', rect: [88, 48, 10, 4], note: 'Authorized personnel only' },
          { name: 'Hilbert’s Hotel', rect: [99, 42, 7, 9], note: 'Lounge · always room for one more' },
          { name: 'The Loop', rect: [107, 33, 2, 26], note: 'Follow the arrows' },
          { name: 'Logistics', rect: [112, 60, 10, 4], note: 'Last seen 2017' },
          { name: 'Onboarding', rect: [119, 28, 12, 4], note: 'Day one, since 2014' },
          { name: 'The Server Farm', rect: [110, 36, 30, 20], note: 'The sysadmin is in a mood' },
        ],

        ceilingLights: [
          { variants: [0, 1, 2, 3, 4, 7], every: 4, offset: [2, 2], color: '#eef8e6', radius: 200, intensity: 0.42 },
          { variants: [5], every: 4, offset: [1, 1], color: '#d8ffe0', radius: 170, intensity: 0.4, flicker: 0.6, skip: 0.3 },
          { variants: [9], every: 3, offset: [1, 1], color: '#f6f0d8', radius: 150, intensity: 0.4, flicker: 0.05 },
          { variants: [8], every: 4, offset: [2, 1], color: '#8ab8ff', radius: 170, intensity: 0.4 },
        ],

        map: layout.map,
        objects: layout.objects,
      },
    },
  });
})();
