/* The Linear Maze — levels/00-meridian-fourteen.js
 * The prologue. Meridian Group, 14th floor, 9:52 on a weekday: an open-plan
 * office with glass conference rooms, a restroom, a pantry, executive offices
 * and a reception lobby. No enemies and no weapon, only coworkers and a phone.
 *
 * The story runs on flags (see packs/office/npcs.js and furniture.js):
 *   readNote → ten seconds later the west-hall window becomes a door (doorAppeared)
 *   doorOpened → the hallway past it, an office that is coming apart, a long
 *   corridor turning to stone, and the Linear Conference Room, whose stair is
 *   the way down to Floor 1.
 *
 * Generated from a layout script, then hand-tuned. Two layers:
 *   map      terrain, keyed by `legend` (merged over the core legend)
 *   objects  furniture, people and props, keyed by `objectLegend`
 * Zone tiles (1-4) are ordinary floor with a tag so traps can watch them.
 */
'use strict';
LM.definePack({
  id: 'office',
  levels: {
    'meridian-fourteen': {
      name: 'Meridian Group',
      floorLabel: '14th floor',
      order: 0,
      environment: 'office',
      next: 'sunken-cloister',
      armed: false,
      loadout: { weapons: [], gadgets: ['phone'] },
      intro: 'Floor 14 of a glass tower. Somewhere on it there is a meeting you are late for.',
      outro: 'Behind you, faint and far, the fourteenth floor goes on without you: the copier, the phones, Marisol saying please hold. Ahead, the stair goes down into the dark, and keeps going.\n\nYou never did send the status report.',

      // ---------------------------------------------------------------- terrain
      legend: {
        '.': { terrain: 'floor', variant: 0 }, //  open-plan carpet
        ',': { terrain: 'floor', variant: 1 }, //  lobby terrazzo
        '`': { terrain: 'floor', variant: 2 }, //  restroom tile
        ':': { terrain: 'floor', variant: 3 }, //  pantry wood
        ';': { terrain: 'floor', variant: 4 }, //  executive walnut
        _: { terrain: 'floor', variant: 7 }, //   conference carpet
        '"': { terrain: 'floor', variant: 5 }, //  carpet, water-damaged and wrong
        "'": { terrain: 'floor', variant: 6 }, //  old flagstone
        '=': { terrain: 'glass-h' },
        '/': { terrain: 'door-glass' },
        v: { terrain: 'partition-v' },
        h: { terrain: 'partition-h' },
        k: { terrain: 'door-stall' },
        K: { terrain: 'door-stall-locked' },
        D: { terrain: 'wall', tag: 'oddDoor' }, // a window, for now
        S: { terrain: 'stone-wall' },
        o: { terrain: 'stone-pillar' },
        '>': { terrain: 'grand-exit' },
        '1': { terrain: 'floor', variant: 5, tag: 'threshold' },
        '2': { terrain: 'floor', variant: 5, tag: 'z2' },
        '3': { terrain: 'floor', variant: 5, tag: 'z5' },
        '4': { terrain: 'floor', variant: 6, tag: 'hall' },
      },

      // ---------------------------------------------------------------- objects
      objectLegend: {
        '@': { start: true, tag: 'arrive' },
        n: 'window',
        N: 'odd-window',
        g: 'plant',
        G: { item: 'plant', props: { big: true } },
        b: 'bin',
        w: 'cooler',

        // restroom
        l: { item: 'toilet', props: { dir: 's' } },
        S: 'occupied-stall',
        s: { item: 'counter', props: { kind: 'basin', dir: 'n', room: 'Restroom', top: '#e4e6e8' } },
        r: { item: 'mirror', props: { face: 'n' } },
        x: { item: 'dryer', props: { face: 'w' } },

        // conference rooms: Tangent, Vertex (in use), Parallel
        T: { item: 'conf-table', props: { w: 7, h: 2 } },
        U: { item: 'conf-table', props: { w: 7, h: 2, seats: 3, laptops: 4, wood: '#4a3424' } },
        Y: { item: 'conf-table', props: { w: 7, h: 2, wood: '#7a5a3a' } },
        t: { item: 'tv', props: { face: 'w' } },
        V: {
          item: 'tv',
          props: {
            face: 'w',
            text: 'Slide 47 of 212: SYNERGY AT SCALE. A clip-art arrow points to the right, off the edge of the slide.\n\nIn the corner the slide counter is counting down, not up.',
          },
        },
        '6': {
          item: 'whiteboard',
          props: {
            face: 'e',
            title: 'Tangent · whiteboard',
            text: 'Q3 OBJECTIVES\n1. Grow\n2. Grow more\n3. ???\n\nSomeone has drawn a very good cat in the corner. Someone else has written DO NOT ERASE under the cat.',
          },
        },
        '7': {
          item: 'whiteboard',
          props: {
            face: 'e',
            title: 'Vertex · whiteboard',
            text: 'SYNERGY ROADMAP\n\nOne straight line from NOW to the right-hand edge of the board. It carries on across the wall in the same marker, as though whoever drew it didn’t notice the board had ended.',
          },
        },
        '8': {
          item: 'whiteboard',
          props: {
            face: 'e',
            title: 'Parallel · room schedule',
            text: (game) =>
              '9:00  Design review\n10:00  LINEAR (recurring · no organizer · no end date)\n11:00  —\n\n' +
              (game.hasFlag('readNote')
                ? 'The 10:00 has been written over so many times that the marker has etched the board.'
                : 'Somebody has tried to erase the 10:00. It is still there.'),
          },
        },
        '+': { npc: 'attendee', props: { face: 's', oy: 17 } },
        '=': { npc: 'attendee', props: { face: 'n', oy: -17 } },
        '-': { npc: 'presenter', props: { face: 'w' } },

        // the open plan: row A desks face north, row B face south; Q/D are desks someone is sitting at
        q: { item: 'desk', props: { dir: 'n' } },
        d: { item: 'desk', props: { dir: 's' } },
        Q: { item: 'desk', props: { dir: 'n', chair: false } },
        D: { item: 'desk', props: { dir: 's', chair: false } },
        M: { item: 'my-desk', props: { dir: 's' }, tag: 'myDesk' },
        p: { item: 'printer', props: { dir: 's' } },
        f: { item: 'filing', props: { dir: 's' } },
        H: { item: 'couch', props: { w: 2, dir: 'n', color: '#3a5a6a' } },
        'τ': { item: 'coffee-table', props: { ox: 16 } },
        '«': { item: 'armchair', props: { dir: 'e', color: '#6a4a3a' } },
        '»': { item: 'armchair', props: { dir: 'w', color: '#6a4a3a' } },
        '[': { npc: 'kenji', props: { face: 's', oy: 17 } },
        '(': { npc: 'boss', props: { to: [-6, 0] } },
        ')': 'brenda',
        $: {
          npc: 'coworker',
          props: {
            name: 'Lena Park', role: 'Product designer', face: 's', oy: 17,
            look: { skin: '#e0b896', hair: '#1a1210', hairStyle: 'ponytail', shirt: '#c8a0b0', glasses: '#3a2a2a' },
            barks: ['Kerning. Kerning. KERNING.', 'Who keeps putting Comic Sans in the all-hands deck?', '(sketching)'],
            lines: ['(She slides one headphone off.) Hey! Have you seen the new brand guidelines? Don’t. They’re a cry for help.'],
            linear: ['Linear? Sounds like a rebrand. Everything’s a rebrand.', 'If you find it, tell me what the chairs are like. I have opinions about conference chairs.'],
          },
        },
        '?': {
          npc: 'coworker',
          props: {
            name: 'Marcus Bell', role: 'Engineering', face: 'n', oy: -17,
            look: { skin: '#6a4430', hair: '#14100c', hairStyle: 'buzz', shirt: '#2a2e38', headset: true },
            barks: ['It works on my machine.', '(typing very fast)', 'Who merged on a Friday?'],
            lines: ['(He doesn’t look up.) If prod is down, it wasn’t me. If prod is up, you’re welcome.'],
            linear: [
              'There’s no room called Linear in the booking system. I checked the database. I have read access to everything, which is a problem I’ve flagged.',
              'Weird thing, though. Something keeps booking LINEAR for the whole floor. Ten a.m., every day, recurring forever. No organizer.',
            ],
          },
        },
        ']': {
          npc: 'coworker',
          props: {
            name: 'Joy Adeyemi', role: 'Marketing', face: 'n', oy: -17,
            look: { skin: '#5a3a28', hair: '#14100c', hairStyle: 'curly', shirt: '#e8a83a', lanyard: '#2a6a8a' },
            barks: ['Engagement is up! Engagement with what? Unclear!', 'Can we make the logo bigger?', 'Circling back on the circle-back.'],
            lines: ['Oh my gosh, hi! Quick question: what’s a word for “synergy” that doesn’t sound like “synergy”?'],
            linear: ['Ooh, Linear! Is that the new campaign? It’s giving “straight line to results.”', 'I’m putting it in a deck. Thank you!'],
          },
        },
        ';': {
          npc: 'coworker',
          props: {
            name: 'Ravi Chandran', role: 'Data analyst', face: 's', oy: 17,
            look: { skin: '#9a6040', hair: '#1a1210', hairStyle: 'short', shirt: '#4a6a8a', glasses: true },
            barks: ['The numbers don’t add up. The numbers never add up.', 'Correlation is not causation. Usually.', '(sips cold coffee)'],
            lines: [
              'Morning, neighbor.',
              'Somebody was at your desk before eight, by the way. Tall. Long coat, soaking wet, like they’d walked here through a river. They left something on your monitor and went west.',
              'I assumed they were from Facilities. Facilities always looks like that.',
            ],
            linear: ['That’s what the note said? Huh.', 'Whoever left it went toward the west hall. There’s nothing in the west hall. Windows and a fire extinguisher.'],
          },
        },
        ':': {
          npc: 'coworker',
          props: {
            name: 'Hollis Grant', role: 'Legal counsel', face: 'n', oy: -17,
            look: { skin: '#e8c8a8', hair: '#9a9a9a', hairStyle: 'short', shirt: '#e8e4dc', blazer: '#2a2a30', tie: '#4a2a5a' },
            barks: ['Allegedly.', 'Let me stop you right there.', 'Per my last email.'],
            lines: ['I can’t comment on that. Whatever it is. Generally.'],
            linear: [
              'A room that isn’t on the floor plan is a liability. I’d advise you not to attend any meeting held in it.',
              'I’d also advise you not to sign anything in there. In my experience those rooms always have something to sign.',
            ],
          },
        },
        '~': {
          npc: 'coworker',
          props: {
            name: 'Nadia Volkov', role: 'Finance', face: 's', oy: 17,
            look: { skin: '#f0d0b8', hair: '#c8a060', hairStyle: 'bun', shirt: '#3a5a4a', glasses: '#2a2a30' },
            barks: ['Receipts. I need receipts.', 'That’s not in the budget. Nothing is in the budget.', 'Q4 accruals. Don’t ask.'],
            lines: ['If you’re here about a reimbursement, the answer is the form. It’s always the form.'],
            linear: [
              'Linear… there’s a cost center called LINEAR-00. It’s older than the company, and nobody’s allowed to close it.',
              'It bills for one chair a quarter. One new chair, every quarter, for decades. I have never found out where the chairs go.',
            ],
          },
        },

        // executive suite
        E: { item: 'exec-desk', props: { dir: 'n' } },
        B: {
          item: 'bookshelf',
          props: {
            title: 'Dana’s bookshelf',
            text: 'Management books with uncracked spines: Circle Back to Win. The Gentle Hawk. Synergy Is a Verb.\n\nOne shelf is all framed photos of Dana shaking hands with people at conferences. In every photo, both of them are looking at the camera, and neither of them is blinking.',
          },
        },
        P: {
          item: 'bookshelf',
          props: {
            title: 'Alan’s bookshelf',
            text: 'An entire shelf of the same book: LINEAR THINKING, by A. Mercer.\n\nThe author photo on the back is an empty chair. Every copy is signed. None of them have been opened.',
          },
        },
        C: { item: 'couch', props: { w: 2, dir: 'w', color: '#4a4a5a' } },
        h: { item: 'couch', props: { w: 2, dir: 'e', color: '#5a6a7a' } },
        j: { item: 'coffee-table', props: { oy: -16 } },
        '0': 'globe',
        '5': { item: 'armchair', props: { dir: 'n', color: '#5a2a24' } },
        Z: { item: 'armchair', props: { dir: 'n' } },
        O: {
          item: 'filing',
          props: { dir: 'e' },
        },
        '1': { item: 'rug', props: { w: 3, h: 2, color: '#24304a', border: '#8a9ab0' } },
        '3': {
          item: 'art',
          props: {
            face: 'n', color: '#e8dcb0',
            title: 'Employee of the Quarter',
            text: 'A framed certificate: EMPLOYEE OF THE QUARTER, DANA WHITLOCK. There are eleven of them in a neat row.\n\nThe newest one is dated next quarter.',
          },
        },
        A: {
          item: 'art',
          props: {
            face: 's', color: '#4a6a3a',
            title: 'A framed print',
            text: 'A print of a hedge maze seen from above. A nice print.\n\nAfter a while you notice the maze has no exit, and that someone has drawn, very faintly in pencil, a small figure standing at its center.',
          },
        },
        '2': {
          item: 'art',
          props: {
            face: 's', color: '#7aa0b8',
            title: 'Serenity',
            text: 'A watercolor of a lake at dawn, the kind of picture a committee chooses to mean “calm.” The water in it is perfectly still.\n\nYou watch it for a while, to make sure.',
          },
        },

        // the cantina
        k: { item: 'counter', props: { kind: 'sink', dir: 's' } },
        K: { item: 'counter', props: { kind: 'kettle', dir: 's' } },
        X: { item: 'coffee-machine', props: { dir: 's' } },
        m: { item: 'counter', props: { kind: 'microwave', dir: 's' } },
        i: { item: 'counter', props: { dir: 's' } },
        F: { item: 'fridge', props: { dir: 's' } },
        v: { item: 'vending', props: { dir: 'e' } },
        o: 'cafe-table',
        '›': { item: 'chair', props: { dir: 'w' } },
        '‹': { item: 'chair', props: { dir: 'e' } },
        '9': {
          item: 'sign',
          props: {
            face: 'w', label: 'Notice board', kicker: 'Break room',
            text: (game) =>
              'A corkboard crowded with paper.\n\nFRIDGE CLEAN-OUT FRIDAY. EVERYTHING GOES.\nLOST: blue lunchbox, PRIYA on the lid. (I know who you are.)\nLunchtime yoga (cancelled) (again).\nWHOEVER IS EATING OTHER PEOPLE’S LUNCHES: WE HAVE A CAMERA. (We do not have a camera.)' +
              (game.hasFlag('readNote') ? '\n\nPinned dead center, on heavy cream card you’re sure wasn’t there this morning: MEET IN THE LINEAR CONFERENCE ROOM. ATTENDANCE IS REQUIRED.' : ''),
          },
        },
        W: 'priya',
        u: 'gary',
        y: { npc: 'tomas', props: { face: 'w', ox: -6 } },

        // reception
        R: { item: 'reception', props: { w: 5, h: 2 } },
        '4': { npc: 'receptionist', props: { oy: 14 } },
        L: { item: 'logo', props: { face: 's' } },
        '&': 'elevator',
        a: {
          item: 'art',
          props: {
            face: 'e', color: '#b8b0a0',
            title: 'Meridian Tower, 1987',
            text: 'A black-and-white photograph of this building going up. Fourteen floors of bare steel against a white sky.\n\nIf you count the floors, there are fifteen. If you count again, fourteen.',
          },
        },
        'σ': 'sam',

        // ---------------------------------------------------- past the door
        '%': 'papers',
        '^': 'ceiling-debris',
        '*': 'paper-drift',
        '<': { item: 'desk', props: { askew: true, flicker: true, glow: '#7fffb0', top: '#bcb6aa' } },
        c: { item: 'chair', props: { askew: true } },
        J: 'echo-receptionist',
        I: { npc: 'echo-priya', props: { face: 'n' } },
        '"': { npc: 'wall-starer', props: { face: 'w' } },
        "'": { npc: 'wall-starer', props: { face: 'e' } },
        '\\': { npc: 'wall-starer', props: { face: 'n' } },
        '`': 'faceless',
        '!': {
          item: 'echo-desk',
          props: {
            dir: 's', tilt: 0.25,
            title: 'Your desk?',
            text: 'Your mug. Your photo, faded nearly white. Your plant, dead and dry, as if no one has watered it in years.\n\nThe chair is still turning, slowly, as if someone just got up.',
          },
        },
        '>': { item: 'printer', props: { dir: 's', wrong: true } },
        ',': { item: 'filing', props: { dir: 's' } },
        '#': {
          npc: 'wall-starer',
          props: {
            name: 'Temp', role: 'Copy room', behavior: 'sit', face: 'n', oy: -17,
            barks: ['(typing)', '(typing)', '…collate… collate… collate…'],
          },
        },
        '/': {
          item: 'sign',
          props: {
            face: 'w', label: 'Copy room',
            text: 'COPY ROOM\n\nUnder it, laminated: PLEASE DO NOT LEAVE ORIGINALS IN THE MACHINE.\n\nUnder that, in ballpoint: the originals are gone. only copies now.',
          },
        },
        '|': { npc: 'sam-echo', props: { face: 's' } },
        _: 'faceless',

        // the Linear Conference Room
        z: 'pedestal',
        'Ω': { npc: 'dana-echo', props: { face: 'w' } },
        '{': 'brazier',
        '}': 'wall-torch',
        e: {
          item: 'sign',
          props: {
            face: 'n', label: 'Brass plaque', kicker: 'The Linear Conference Room', plate: '#8a6a2a', ink: '#f4e0a0',
            text: 'THE LINEAR CONFERENCE ROOM\nEst. before the building\n\nThe meeting begins when all attendees are present.\nThe agenda proceeds in order.\nThere is no adjournment.',
          },
        },
      },

      // ---------------------------------------------------------------- story
      traps: [
        {
          // first thing in the morning
          trigger: { type: 'zone', tag: 'arrive' },
          effects: [
            {
              type: 'phone', thread: 'dana', delay: 4, text: 'Morning!! Don’t forget: status report by EOD :)',
              replies: [
                { label: 'On it.', then: { text: 'love that!!' } },
                { label: 'What status report?', then: { text: 'haha. EOD :)' } },
              ],
            },
            { type: 'phone', thread: 'team', delay: 18, text: 'Priya: whoever ate my pad thai, I will find you.' },
          ],
        },
        {
          // the note: ten seconds later, the building rearranges itself
          trigger: { type: 'flag', tag: 'readNote' },
          effects: [
            {
              type: 'phone', thread: 'unknown', delay: 3, text: 'Are you coming?',
              replies: [
                { label: 'Who is this?', then: { text: 'You’ll see. Everyone is almost here.' } },
                { label: 'Where is it?', then: { text: 'Where it has always been. Behind you, a little.' } },
              ],
            },
            { type: 'flicker', delay: 10, radius: 2400, time: 1.6 },
            { type: 'quake', delay: 10.4, strength: 0.25 },
            { type: 'terrain', delay: 10.6, tag: 'oddDoor', terrain: 'door-odd', sound: 'altar' },
            { type: 'flag', delay: 10.6, name: 'doorAppeared' },
            { type: 'message', delay: 11, text: 'Somewhere to the west, the building settles.' },
            { type: 'phone', thread: 'unknown', delay: 14, text: 'West hall.' },
          ],
        },
        {
          trigger: { type: 'door', tag: 'oddDoor' },
          effects: [{ type: 'phone', thread: 'dana', delay: 2, text: 'Where are you?? The 10:00 is starting. Bring the status report!' }],
        },
        {
          // a few steps in, the way back closes
          trigger: { type: 'zone', tag: 'threshold' },
          effects: [
            { type: 'terrain', delay: 0.6, tag: 'oddDoor', terrain: 'wall', sound: 'door' },
            { type: 'lights', tag: 'officeLights', on: false },
            { type: 'ambient', ambient: '#20242b', outsideSight: '#2c2e34', time: 2 },
            { type: 'message', delay: 1.2, text: 'Behind you, the door is gone.', kind: 'warn' },
            { type: 'phone', thread: 'unknown', delay: 5, text: 'Don’t worry about the door. It only ever went one way.' },
          ],
        },
        {
          trigger: { type: 'zone', tag: 'z2' },
          effects: [
            { type: 'phone', thread: 'team', delay: 2, text: 'Brenda: Fire drill headcount! Has anyone seen the person at desk 14-112? Their chair is still spinning.' },
            { type: 'phone', thread: 'unknown', delay: 9, text: 'Take pictures. You’ll want to remember who attended.' },
          ],
        },
        {
          trigger: { type: 'zone', tag: 'z5' },
          effects: [
            { type: 'phone', thread: 'calendar', delay: 1, text: 'Reminder: Meeting · Linear Conference Room · now' },
            { type: 'ambient', ambient: '#2a2520', outsideSight: '#302a26', time: 3 },
          ],
        },
        {
          // the grand opening
          trigger: { type: 'zone', tag: 'hall' },
          effects: [
            { type: 'flag', name: 'grandOpening' },
            { type: 'ambient', ambient: '#3a2e26', outsideSight: '#3a322c', time: 2.5 },
            { type: 'message', delay: 0.8, text: 'The Linear Conference Room', kind: 'key' },
            { type: 'phone', thread: 'unknown', delay: 2.5, text: 'Welcome to the Linear Conference Room.' },
            { type: 'phone', thread: 'calendar', delay: 7, text: 'Meeting in progress. Duration: indefinite.' },
          ],
        },
      ],

      rooms: [
        { name: 'Reception', rect: [58, 32, 29, 15], note: 'Meridian Group' },
        { name: 'Restroom', rect: [42, 1, 9, 11], note: 'All-gender' },
        { name: 'The Open Plan', rect: [42, 11, 45, 20], note: '14th floor' },
        { name: 'Tangent', rect: [52, 1, 11, 9], note: 'Conference room' },
        { name: 'Vertex', rect: [64, 1, 11, 9], note: 'Conference room · in use' },
        { name: 'Parallel', rect: [76, 1, 11, 9], note: 'Conference room' },
        { name: 'The Cantina', rect: [42, 32, 15, 15], note: 'Break room' },
        { name: 'Dana Whitlock', rect: [92, 1, 11, 11], note: 'Director of Operations' },
        { name: 'Alan Mercer', rect: [92, 13, 11, 9], note: 'VP, Strategy · in a meeting' },
        { name: 'The Quiet Room', rect: [92, 23, 11, 8], note: 'Please, no calls' },
        { name: 'Executive Corridor', rect: [88, 1, 3, 30], note: 'Corridor' },
        { name: 'West Hall', rect: [38, 1, 3, 46], note: 'Corridor' },
        { name: 'A Hallway That Cannot Be Here', rect: [31, 21, 6, 3], note: '14th floor?' },
        { name: 'The Open Plan', rect: [16, 13, 14, 19], note: 'Again' },
        { name: 'Copy Room', rect: [4, 21, 11, 11], note: 'Still printing' },
        { name: 'The Long Way', rect: [7, 11, 3, 9], note: 'Corridor' },
        { name: 'The Linear Conference Room', rect: [3, 1, 32, 9], note: 'Grand opening' },
      ],

      // fluorescent panels over the real office; sick, flickering ones over the wrong one
      ceilingLights: [
        { variants: [0, 1, 2, 3, 4, 7], every: 4, offset: [2, 2], color: '#f2f5ff', radius: 200, intensity: 0.42, tag: 'officeLights' },
        { variants: [5], every: 4, offset: [1, 1], color: '#d8ffe0', radius: 170, intensity: 0.42, flicker: 0.75, skip: 0.4 },
      ],

      map: [
        "  SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS ###################################################################",
        "  S''''''''''''''''''''''''''''''''S #...#``v``v```#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''''''''''''''''''''''''''''''S #...#``v``v```#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S'''''''''o'''o'''o'''o'''o''''''S #...#``v``v```#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''''''''''''''''''''''''''''''S #...#hkhhkhhKh#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''''''''''''''''''''''''''''>'S #...#`````````#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''''''''''''''''''''''''''''''S #...#`````````#___________#___________#___________#...+;;;;;;;;;;;#",
        "  S'''''''''o'''o'''o'''o'''o''''''S #...#`````````#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''''''''''''''''''''''''''''''S #...#`````````#___________#___________#___________#...#;;;;;;;;;;;#",
        "  S''''444'''''''''''''''''''''''''S #...+`````````#___________#___________#___________#...#;;;;;;;;;;;#",
        "  SSSS#'''SSSSSSSSSSSSSSSSSSSSSSSSSS #...#`````````#=====/=====#=====/=====#=====/=====#...#;;;;;;;;;;;#",
        "      #\"''S                          #...#`````````#...................................#...#;;;;;;;;;;;#",
        "      S\"'\"#    ################      #...###########...................................#...#############",
        "      #''\"S    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................#...#;;;;;;;;;;;#",
        "      #\"'\"#    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................#...#;;;;;;;;;;;#",
        "      S\"'\"S    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................#...#;;;;;;;;;;;#",
        "      #\"\"\"#    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................#...#;;;;;;;;;;;#",
        "      S333#    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...+.............................................#...+;;;;;;;;;;;#",
        "      #\"\"\"#    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................+...#;;;;;;;;;;;#",
        "      #\"\"\"#    #\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................+...#;;;;;;;;;;;#",
        "   ####\"\"\"######\"\"\"\"\"\"\"\"\"\"\"\"\"\"########...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"\"\"\"\"2\"\"\"1\"\"\"#...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"\"\"\"\"2\"\"\"1\"\"\"D...#.............................................#...#############",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"\"\"\"\"2\"\"\"1\"\"\"#...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"\"\"\"\"\"########...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"#      #...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"~~~~~#      #...#.............................................#...+;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"~~~~~#      #...+.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"~~~~~#      #...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"~~~~~#      #...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"~~~~~#      #...#.............................................#...#;;;;;;;;;;;#",
        "   #\"\"\"\"\"\"\"\"\"\"\"#\"\"\"\"\"\"\"\"\"~~~~~#      #...#######+#############===/=#######=/===#########################",
        "   ############################      #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...+:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::+,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     #...#:::::::::::::::#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "                                     ###################################################",
      ],
      objects: [
        "      }       }   }       }                           n   n  n    n   n  n    n   n  n          n  n",
        "                                        g  l  l  l  g         g                       g  g  BB       BB",
        "          {           {       {",
        "                                     n                             + + +                               n",
        "                                                 S    T        t  U        V  Y        t       E",
        "                   c       Ω   z                   6                      -",
        "                                                               7   = = =                     0",
        "                                     n    g                                8                          C",
        "          {           {       {                    x                                                j",
        "                                                                            g                          n",
        "     e        }   }       }     }                 b                                         O 5",
        "       _                                   s s s                                   ff                 G",
        "                                     n     r r r                                p     G          3  A",
        "                \\                                  G $             [                        PP",
        "         |           <   c   '               qqqq   qQqq   qqqq   qQqq   qqqq                         g",
        "                  <       %                  dDdd   dddd   dddd   dddd   dDdd                  E       n",
        "                        <            n        ?                           ]",
        "                    c                                                                             1",
        "        ^             %    <                                   b       (",
        "                   <     ^                        b                          b",
        "                \"      <    %                                ;      ~                              Z Z n",
        "                                   %         qqqq   qqqq   qqQq   qqQq   qqqq",
        "     >  >  >      c   *    c   ^  *  N       ddDd   dddd   dMdd   dddd   dddd         w          2",
        "             %         cI       %              :                                                      G",
        "            ,    <                      w",
        "       %             <     `                                                    )                      n",
        "    %   *         ^",
        "          %                          n                   « τ  »                                 Z  Z",
        "      D             J      c                                                      p",
        "      #          !                                         H                                           n",
        "            %  /   %                  b    G           g        g             G          g",
        "     %                               n                                L",
        "                                           kKXmi  F",
        "                                                       b  G                          G",
        "                                              u   W      9",
        "                                     n    v               h    σ                       n",
        "                                                            j                         C",
        "                                              ›o‹  ›o‹   a           4              j",
        "                                                                   R",
        "",
        "                                     n                                                 n",
        "",
        "                                          v   ›oy  ›o‹                              w",
        "",
        "                                     n                  w                              n",
        "                                                                   @",
        "                                        g g             g G                          G",
        "                                                                &  &  &",
      ],
    },
  },
});
