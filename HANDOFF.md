# Hand-off notes: the Memos and Chessboard packs

This build is iteration 0.2 plus two new content packs. Everything new lives in its own files, so the two of us can keep working in parallel and pass the folder back and forth without stepping on each other.

## Who owns what

| Files | Owner | Notes |
|---|---|---|
| `engine/`, `packs/core/`, `packs/office/`, `levels/00`–`03`, `tools/build.mjs` | original author | **Not modified.** |
| `packs/memos/`, `tools/memos/` | additions | Posters, notices, the message board, cameras, desk toys, email, Alice's desk, the three scores. |
| `packs/chessboard/`, `levels/04-chessboard-one.js`, `tools/chessboard/` | additions | The Office on Chessboard 1. |
| `packs/apartment/`, `levels/apartment-chessboard-zero.js` | additions | Apartment (Chessboard 0): home, the first floor of a run. |
| `packs/apartment/story.js`, `levels/home-chessboard-one.js` | additions | The evening's story (tasks, the red phone rings, the news) and Home (Chessboard 1). |
| `packs/library/`, `levels/library-maze.js` | additions | The Library Maze: two floors behind Dave's door, with Librarians, Book Worms and Overdue Ghosts. |
| `packs/town/`, `levels/town-map.js`, `levels/town-places.js`, `levels/maze-of-forking-paths.js` | additions | The morning after: the Town Map, the places you and Alice went, the Book Nook on Chessboard 2 and the Maze of Forking Paths. |
| `packs/rotary/` | additions | A red rotary phone on every floor, each with its own 7-digit number. |
| `packs/dressings/`, `editor/js/dressings.js` | additions | Dressings: furniture and fixtures from any set, for any floor (the map editor's Dressings tab). |
| `index.html` | shared | New blocks of `<script>` tags after the Office pack. Nothing else changed. |
| `SPEC.md` | shared | Sections 14, 16, 17 and 18 appended. Nothing else changed. |
| `README.md` | shared | One paragraph appended. |
| `dist/` | generated | Rebuilt with `node tools/build.mjs`. |

To remove the additions, delete the two script blocks from `index.html`. The game then runs exactly as it did in 0.2.

## How the new packs connect to the existing code without editing it

These are the only places the new packs depend on the existing code. If you change one of these, check the matching file.

1. **"Check email" on your desk.** `MEMOS.addActions('my-desk', …)` in `packs/memos/email.js` wraps the Office pack's `my-desk` `interact.use`, and adds one button to the pop-up it opens, just before the last quiet button. If `my-desk` stops opening a pop-up with `LM.ui.open`, the button disappears; nothing breaks.
2. **The score plate.** `packs/memos/scores.js` wraps `LM.ui.frame` to run after the engine's HUD update and appends a plate to `#hud .hud-tr`.
3. **14th-floor additions.** These are spawned on `levelLoaded` from a placement list (`packs/memos/placements.js`) in the 14th floor's tile coordinates. If the 14th-floor map changes, run `node tools/memos/check-placements.mjs`: it flags anything that no longer sits on a wall facing open floor.
4. **Chessboard 1's cast and legend.** These start from the Office pack's definitions:
   - `real('priya', {...})` in `packs/chessboard/npcs.js` copies an Office NPC (look included) and replaces lines and behaviour.
   - The level's `legend` and `objectLegend` start from `meridian-fourteen`'s and override what changed.
   - The coworkers at `$ ? ] ; : ~` keep their names and looks from the 14th floor's legend.
5. **Chessboard 1's map** is generated: `node tools/chessboard/build-layout.mjs` copies the real office (columns 37 and east) from `levels/00-meridian-fourteen.js` at the same coordinates, adds the east wing, checks reachability, and writes `packs/chessboard/layout.js`. Re-run it after changing the 14th-floor map if Chessboard 1 should follow.
6. **The phone.** The packs use `LM.phone.send/later` and add one thread to `LM.PHONE_THREADS` (`workday`). MESSAGE SCORE reads `P.data.phone.threads` (incoming messages minus unread).

Ids the new packs rely on:
- **Office items:** `my-desk`, `desk`, `bookshelf`, `art`, `whiteboard`, `tv`, `sign`, `logo`, `elevator`, `chair`, `cafe-table`, `plant`.
- **Core items:** `chest`, `crate`, `medkit`.
- **Office NPCs:** `receptionist`, `boss`, `priya`, `gary`, `tomas`, `kenji`, `coworker`, `sam`, `presenter`, `attendee`, `brenda`.
- **Other:** the `office` environment, and the core effects `alarm` and `flicker`.

## Story flags added

- **14th floor:** `emailTPS`, `emailAlice`, `alicePad`, `bobKey`, `aliceDecrypted`.
- **Chessboard 1:** `cb_t1`, `cb_t2`, `cb_t3`, `cb_reports`, `cb_serverDoor`, `cb_bobAppeased`, `cb_gertrude`.

Chessboard 1 also reads the existing `tookSalmon` (Priya has a fork) and `samComing`.

## Knobs

- `LM.CHESSBOARD.CONFIG` (`packs/chessboard/workday.js`):
  - `minutesPerSecond`: 0.5, so the 9-to-5 day lasts 16 minutes of play.
  - `failRestartsRun`: `true` means a wrong answer in the meeting restarts the whole run; set it to `false` to restart just the floor.
- `LM.CHESSBOARD.BOB` (`npcs.js`): Bob's speed, reach, wind-up and damage.
- `LM.MEMOS.POINTS` (`scores.js`): points per notice, message and email.
- `LM.CHESSBOARD.VENDING` and `LM.CHESSBOARD.HINTS` (`items.js`): vending stock, prices and hints.
- All the words are in `packs/memos/content.js`: posters, notices, toys and their honest versions. Emails are in `packs/memos/email.js`.

## Decisions worth a second opinion

- **Task 3 wasn't specified**, so it is Brenda's Mandatory Workplace Surveillance Training (a three-question quiz in the Training Room, formerly the Quiet Room). Kevin at the server farm won't let you in until tasks 1 and 3 are done.
- **"Caught up on your email"** means you have read the compiled TPS report. A typed guess at Alice's poem passes at 85% letter similarity, to forgive typos.
- **Bob is an NPC, not an enemy**, so he can't be killed. Bullets pass through him. You avoid him through the one-tile gaps between racks, or calm him with the key.
- **Gertrude is an ordinary enemy** and can be killed. She drops loot, and the supply closet holds a chest.
- **The end screen.** Chessboard 1 is the last floor, so finishing it shows the engine's existing victory screen ("You reached the bottom"), after a Chessboard end-of-day summary. The Reliquary's "Descend to…" button label is also the engine's.
- **Pre-existing:** dialog pop-ups show 1-pixel scrollbars at some window sizes. This happens with the original dialogs too (it's in the engine CSS), so I left it alone.

## Checks before handing back

```
node tools/chessboard/build-layout.mjs
node tools/memos/check-placements.mjs
node tools/build.mjs
```

Console helpers while playing:
- `LM.debug.warp('chessboard-one')` jumps to the new floor.
- `LM.debug.god()` turns on god mode.

## The editor (added after 0.3)

| Files | Notes |
|---|---|
| `editor/` | The Linear Maze Editor (`editor/index.html`). Reads the game, never edits pack files. |
| `packs/editor/runtime.js` | Applies the editor's changes on top of every pack. Ships with the editor. |
| `packs/editor/edits.js`, `packs/editor/sprites.js` | Generated by the editor's Save. Hand edits are fine as long as the file stays one `LM.editor.apply({...})` call. |
| `index.html` | The editor's first save adds three `<script>` lines before the start-up script. Remove them to switch every editor change off. |

If you change a pack while the editor has a patch for the same id, the patch still applies on top (only the fields it lists). If you rename or remove an id the editor patched, the game logs `[LM editor] patch for missing ...` and carries on.

## Apartment (Chessboard 0)

A new first floor: home, the evening before the office. It's a normal pack and level, so it appears in the editor's Floors page like any other floor and can be painted and given events there.

- **Order.** `order: -1`, so a new run starts here. The stairs down lead to `meridian-fourteen`; the level's `next` can be changed, or the order rearranged in the editor.
- **Leaving.** The stairs down are roped off (terrain `apt-stairs-closed`, tag `aptStairsDown`) until the story flag `timeToLeave` is set. Set it from any event (the editor's `flag` effect). A flag trap in the level then swaps the tile for the real exit, and the stairs are already open if the flag was set before the floor loads.
- **Hooks for events.**
  - Tags: `aptStair` (the arrival stairs), `aptFront` (the mat outside 7C), `door7A`, `door7B`, `door7D`, `door7E`, `door7F`.
  - Flags set by things in the apartment: `aptPizzaOut`, `aptPizzaCooked`, `ateDinner` (dinner: see below), `snacked` (anything else from the fridge), `watchedTV`, `playedGame`, `readBook`, `relaxed`, `readMagazine`, `checkedLaptop`, and per neighbor `knock-7A`, `knob-7A`, `open-7A` (a neighbor's door opens once its `props.openFlag` flag is set).
- **The phone's clock.** It reads 6:30 PM here and is reset to 9:52 AM when you reach the 14th floor.
- **Shared code.** `packs/memos/email.js` gained `MEMOS.inboxKickers`, so the laptop's inbox isn't labeled "Workstation 14-112". That is the only change to an existing file besides `index.html` and the docs.
- **Not changed.** The phone's Notes tab still shows the office objective ("Get to your desk.") here, because that text is in the Office pack's `phone.js`.

## Red rotary phones (all floors)

`packs/rotary/rotary.js` puts a red rotary phone on every floor: on its own little desk near the arrival point, or on the kitchen counter at home ("It was here when I got the apartment.").

- **Dialing.** Each phone has a 7-digit number. Dialing another phone's number teleports you to that floor, standing beside its phone, carrying everything as the stairs would. Any other number gets nobody or a strange answer; the same number always gets the same one.
- **The numbers** are in `LM.ROTARY.LINES`, with each phone's tile:

  | Floor | Number |
  |---|---|
  | Apartment | 555-0107 |
  | 14th floor | 555-1414 |
  | Sunken Cloister | 555-0311 |
  | Ember Foundry | 555-0622 |
  | Gilded Reliquary | 555-0933 |
  | Chessboard 1 | 555-1001 |
  | Home (Chessboard 1) | 701-0555 (your own number backwards; connects only after the flag `heardReverse`) |
  | Library Maze 1 | 555-7323 |
  | Library Maze 2 | 555-2665 |

  A floor without an entry has no phone, so new floors need a line added.
- **Answers.** Wrong-number answers are in `LM.ROTARY.ANSWERS`, and numbers with their own joke are in `LM.ROTARY.SPECIAL`.
- **Remembered numbers.** Each phone shows its own number on a label. Numbers you've seen are kept in `P.data.rotary.known` and listed beside the dial.
- **Flags:** `rotaryUsed`, `rotaryTravel`.
- **For stories.** `LM.ROTARY.ring(game, { notice, answer, who, thought, onAnswer })` makes the floor's phone ring (sound, pulsing glow, the phone jumps) until it's answered. `LM.think(game, text)` shows the character's thought as a notification. A line can also have `requires` (a flag; until then the number gets an ordinary answer), `busy` (the phone can't call out: Home on Chessboard 1, until the flag in `busy.until`) and `pickup` (what you hear when you get through).
- **Replaced.** The rotary phone replaces the apartment's wall phone and its phone book.
- **The editor draft.** An earlier editor draft of a `red-telephone` item (4-digit numbers, which would have clashed with the Office pack's cell phone) has been removed from `packs/editor/edits.js`. The rest of the editor's saved work there (furniture painters and the Home (Chessboard 0) tile set) is unchanged.

## Dressings (editor)

Dressings are furniture and fixtures from any set, usable on any floor. See `SPEC.md` section 18.

**New files:**
- `editor/js/dressings.js`: decides what counts as a dressing, its set and its kind.
- `packs/dressings/dressings.js`: a pillar for any floor.

**Changes to the editor's existing files:**
- `editor/js/mapedit.js`: the Dressings palette tab, the facing buttons, and the `[` `]` keys.
- `editor/js/schemas.js`: an item's Basics tab has a **Dressing** setting.
- `editor/js/views/items.js`: set names come from the dressings catalog, and the "Furniture or decoration" template makes a dressing.
- `editor/index.html` and `editor/editor.css`: one script line and a few styles.

Nothing in the game changes except the new pack.

## The evening, Home (Chessboard 1), and the Library Maze

The story is in `packs/apartment/story.js`; all of its words are at the top of that file (`APT.TASKS`, `APT.PIZZA`, `APT.NEWS`, `APT.CALLS`, `APT.WARPED`).

**Apartment (Chessboard 0)** (the level has `dinner: true`)
- Tasks, top right under the scores: **Eat dinner** → **Cook pizza in oven** → **Eat pizza**, and **Watch TV to relax**.
- Fridge "Get frozen pizza" (`aptPizzaOut`) → oven "Cook pizza" (`aptPizzaCooked`) → kitchen table "Eat pizza" (`ateDinner`).
- **Event 1.** Three seconds after dinner the red phone rings: "That phone has never rung before!" Answering it: "The line goes dead." (`aptRing1`). The TV then has the breaking news (`aptNews`), and the character thinks "That explains the surreal experience at work today! I must be imagining things!"
- **Event 2.** Seven seconds after the news it rings again ("What is going on??"). A voice: "Call yourself in reverse order." Then "That voice sounds like me." (`heardReverse`). A third task appears: **Call yourself in reverse order**. Dialing 701-0555 takes you to Home (Chessboard 1).
- If the floor is reloaded mid-story, the next ring happens again.
- The stairs stay roped off (`timeToLeave` is never set by the story).

**Home (Chessboard 1)** (`levels/home-chessboard-one.js`, `warped: true`, `noSignal: true`)
- A copy of the apartment's map, so either can change on its own. Warped pictures (`apt-art-warped`), books, TV parodies, a blinking clock radio, different furniture colors (`apt-bed` `blanket`, `apt-dresser`/`apt-nightstand`/`apt-tv` `color` props), a lava lamp on the kitchen table (`apt-kitchen-table` `lava: true`), the magazine *Architectural Disasters*, and each room's lights dimming at random (the hidden `apt-story` helper).
- Task: **I'm having a hallucination! Seek help!** The red phone is busy (`cb1TriedPhone`), the cell phone shows "No signal" (`cb1TriedCell`), or you step out into the hall (`cb1LeftHome`); any of these sets `seekDave` and the task becomes **See if Dave (Friend) is home**.
- A stray cat (`apt-cat`) sits at the end of the hall. Dave is 7F: Knock gets nothing; Try the knob opens onto the Library Maze (`props.leadsTo: 'library-1'`).
- Coming back from the library puts you outside Dave's door and sets `libraryDone` (the door is locked after that), and the red phone stops being busy (`busy.until`). **Changed after 0.4.3:** the task becomes **I'm tired! Get some rest**, and the bed offers **Sleep**: the screen goes black and you wake up in the Chessboard 0 apartment (see "The morning after" below). The stairs here stay roped off: `leaveFlag` is now `cb1StairsOpen`, which the story never sets. `exitTo` (`chessboard-one`), `outro` and `exitIntro` are kept, in case you want the stairs back.

**The Library Maze** (`packs/library/`, `levels/library-maze.js`)
- Two floors: `library-1` (stairs down at the far corner) and `library-2` (the Lower Stacks; the way out is a door marked 7F, back to Home on Chessboard 1).
- Walls are bookcases (texture `bookcase`); `lib-pillar` marble pillars; dressings `lib-table`, `lib-cart`, `lib-shelf`, `lib-catalog`, `lib-desk`.
- Enemies: `librarian` (melee slam, or a fan of thrown books), `bookworm` (fast; now and then divides, at most 14 on a floor), `overdue-ghost` (flies, circles, swoops; touching you hurts; drops its unpaid fines).
- `lib-knowledge` KNOWLEDGE IS POWER: heals 50 and gives +60% damage for 30 s (props `heal`, `damage`, `time`). Once per book.
- `lib-quiet` QUIET PLEASE: a wall sign guarding `props.rect` [x, y, w, h]; each shot fired inside costs `props.damage` HP. Floor 1 has two quiet sections, floor 2 one.
- Floor 1 has a chest with the Scattergun. The Office pack already puts a pistol in your hand on any armed floor.
- The maps were generated and checked for reachability by a script (every floor tile and the exit are reachable); edit them freely in the editor.

New flags: `aptPizzaOut`, `aptPizzaCooked`, `snacked`, `aptRing1`, `aptNews`, `heardReverse`, `cb1Arrived`, `cb1TriedPhone`, `cb1TriedCell`, `cb1LeftHome`, `seekDave`, `triedDaveDoor`, `libraryDone`, `libKnowledge`, `libShushed`.

Changes to existing additions: `packs/apartment/items.js` (dinner steps, `APT.WARPED` words on a warped floor, color props, the TV drawn as a TV), `packs/apartment/environment.js` (`apartment-cb1`), `packs/rotary/rotary.js` (ringing, busy, `pickup`, three new lines), `editor/js/dressings.js` (the Library set name).

## Story exits and the editor's floor order (fix after 0.4.3)

The editor's floor order (`levelOrder` in `packs/editor/edits.js`) sets every floor's `next` to the floor below it on the list, and finishing the last floor on the list wins the game. With the saved order (… Apartment, Home, Library Maze 1, Library Maze 2), Library Maze 2's door 7F went to the victory screen and Home's stairs led back into the library. Story floors now pin their own exits with three level fields:

- `exitTo`: where the floor's stairs or exit lead, whatever the floor order says. Set on `library-1` (to `library-2`), `library-2` (to `home-cb1`) and `home-cb1` (to `chessboard-one`). Applied on `levelLoaded` in `packs/apartment/story.js`.
- `exitIntro`: shown instead of the next floor's own `intro` on the way out.
- `leaveFlag`: the flag that opens roped-off stairs (tag `aptStairsDown`); the default is `timeToLeave`. Home on Chessboard 1 uses `libraryDone`.

Floors without `exitTo` still follow the editor's order. The 14th floor can't be revisited in the same run yet: the west-hall door only appears when `readNote` is first set, so a second visit has no way on.

## The morning after, the Town Map, and the search for Alice (after 0.4.3)

**The morning** (`packs/apartment/story.js`, words in `APT.MORNING`)
- Sleeping on Chessboard 1 (`slept`) fades to black and loads the `apartment` level again; with `slept` set it's morning: you wake by the bed, the phone says 7:12 AM, and the dinner tasks are gone.
- Task **Get ready for work**: the dresser pulses; **Get dressed for work** (`dressed`) → the red phone rings. Task **Answer the phone**: it's Alice (`aliceCalled`). Task **Rescue Alice**, and `timeToLeave` drops the rope.
- The apartment's stairs now lead to the Town Map (`exitTo: 'town-map'` in `levels/apartment-chessboard-zero.js`; set it back to `meridian-fourteen` to send them to work). Its `outro` was rewritten for this.
- Hooks added to `packs/apartment/items.js`: the bed and the dresser ask `APT.STORY.bedPrompt`/`bed` and `dresserPrompt`/`dresser` first; the dresser glows while the story wants you there.

**The Town Map** (`packs/town/map.js`, `levels/town-map.js`)
- A tiny room you never see; a drawn map covers the screen. Pins are in `TOWN.PLACES` (name, note, position, `links`). Blue: the start (the Coffee Shop), anywhere you've been, and anything linked to somewhere you've been. Red: too far ("I'd have to go past the … first"). The Gas Station links to all three middle pins.
- First visit: the plaque (`townPlaque`). Clicking a blue pin: VISIT <PLACE>? with the note; Visit loads the place. Every place has an EXIT (`town-door`) back to the map.
- A place is any level with `town: { id, name, in, notHere, after? }`. Once you've been in every room: "ALICE is NOT in …" (`searched-<level>`; `after` holds it back until a flag is set). The map shows searched pins with a tick.
- The task **Rescue Alice** shows on every level with `alice: true`.

**The places** (`levels/town-places.js`; people in `packs/town/npcs.js`)
- **Coffee Shop:** Nancy Pace walks up to you and warns you about CPD (`nancyWarned`). The barista (Jody): "She was here. She said she was looking for a way out of the maze."
- **Book Nook:** the newspaper (Dr. Chanard); the clerk (Walt): "Not for a while." Pet the cat: "Not yet, human. Go ask Alice," and you're in the **Book Nook on Chessboard 2** (`town-booknook-cb2`): dark, decayed, flickering, Book Worms and the **Printing Press**, which leaps at you. Killing it (`nookPressDone`) brings you back; the cat says "She went in the maze. Follow that rabbit!" (`nookCatSaid`).
- **Falcon Gas:** Dwayne: Alice came by dressed for jogging. Alice's car is parked out front.
- **Forking Paths Park:** a hexagonal park. Near the sundial: "Alice really liked the sundial." The odd-looking man: "Do you know what a Grabe is?…" and you're in the **Maze of Forking Paths**.
- **Movie Theater, Hospital, Headshop, VHS Rental, Donuts Plus, Police Station:** small stub levels (a room or two, a person who knew Alice, a few things to look at), ready to be fleshed out.

**The Maze of Forking Paths** (`levels/maze-of-forking-paths.js`, `packs/town/maze.js`, `packs/town/enemies.js`)
- A generated labyrinth with Minotaurs, canopic jars (organs jump out if you get close; shoot the jar first and it just breaks), the Bone Wand at the farthest dead end, the Fire Corridor (`fire-jet`), the Hall of Falling Stone (`rockfall`), the Corridor of Spikes (red squares → `spike-wall`), the Catacombs (`stone-coffin` skeletons, a `bone-pile`), the Sarcophagus (STONE KEY → `door-stone`), the Cloaked Merchant (health, medkit, shells, Bone Armor, the riddle's answer), the Chalice of Life or Death (smell twice), a trapped floor (darts) and the Sphinx Gate (riddle in `TOWN.RIDDLE`; the answer is Time).
- Leaving sets `mazeDone` and goes back to the Town Map; the park then counts as searched.
- Bone Wand: a slow blast that hits a 96-unit circle; it never runs out. Bone Armor: +50 as a shield with no regeneration, so it wears away.

**Worth knowing**
- The editor's saved floor order (`packs/editor/edits.js`) starts a new run on the 14th floor, not the apartment. The story still works from the apartment (`LM.debug.warp('apartment')`), or move the apartment to the top of the editor's Floors list.
- The new floors aren't in the editor's floor order, so they come after it. Every story exit is pinned (`exitTo`, `town-door`), so the order doesn't matter for them.
- The maps were generated by a script that checks every floor tile, room and exit can be reached. Edit them freely in the editor.

New flags: `slept`, `woke`, `dressed`, `aliceCalled`, `townPlaque`, `visited-<place>`, `searched-<level>`, `nancyWarned`, `askedBarista`, `nookCatPetted`, `nookPressDone`, `nookCatSaid`, `gasHint`, `sundialNote`, `metStranger`, `jarWarned`, `stoneKey`, `riddleBought`, `riddleSolved`, `mazeDone`.

## Animated sprite sheets for monsters (after 0.4.4)

Monsters can be drawn from a sprite sheet: one PNG, a grid of frames, one row per animation. In the editor: a monster's **Look → A sprite sheet (animated)**.

- **Templates and guide:** `editor/templates/` has `monster-sheet-64.png` (8 × 5 frames of 64 px), `monster-sheet-128.png` (big monsters), `monster-sheet-4dir-64.png` (four directions), `example-beetle-64.png` (a finished sheet to try) and `SPRITE-SHEETS.md` (the best-practice guide). The Look tab links to them.
- **The game side** is in `packs/editor/runtime.js` (`ED.looks.sheet`, `ED.sheetPose`, `ED.SHEET`): a `look: { type: 'sheet', sprite, frame, size, layout, facing, anims, pixelated, glow, eyes, linger }`. Idle when still, walk when moving (faster when running), attack frames timed to the attack's wind-up so the blow lands on the hit frame, hurt for a moment after a hit, and a death animation that stays where it fell, then fades. `layout: '4dir'` picks the down/left/right/up row instead of rotating.
- **The editor side** is `C.sheetLook` in `editor/js/views/content.js` (plus a sheet mode for `C.importPicture` that keeps the grid, and a sprite-sheet image prompt), with a few styles in `editor/editor.css`.
- Nothing changes for monsters that don't use a sheet.
