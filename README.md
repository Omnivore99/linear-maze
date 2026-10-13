# The Linear Maze

A fast, top-down 2D shooter for the browser. Iteration 0.2: a peaceful prologue on the 14th floor of an office tower (the Office pack: coworkers to talk to, a phone instead of a gun, and a door that wasn't there before), then three maze floors, five weapons, eight enemy types including a boss, eleven pieces of gear, traps, chests, altars, slot machines and recharge stations.

## Play

- Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and open it there.
- Or open the single-file build in `dist/the-linear-maze.html`.

Controls: WASD move, mouse aim, hold click to fire (or take a photo when you have no weapon), Shift dash, E interact or talk, F phone, 1–9 or wheel to switch weapons (or pick a reply), Tab inventory, Esc pause, M sound.

To skip the office and start in the maze, remove the five Office `<script>` lines from `index.html`, or use `LM.debug.warp('sunken-cloister')`.

## Build

```
node tools/build.mjs
```

Writes `dist/the-linear-maze.html` (standalone) and `dist/artifact.html` (for publishing as a claude.ai Artifact).

## Extend

Everything in the game except the engine is a content pack (`packs/`) or a level (`levels/`). See `SPEC.md` for the full reference, recipes, current numbers and the backlog.

Console helpers while playing: `LM.debug.warp('ember-foundry')`, `LM.debug.giveAll()`, `LM.debug.god()`, `LM.debug.reveal()`.

## Iteration 0.3 additions

Two more packs ride on the Office pack: **Memos** (motivational posters, notices and a message board, security cameras, desk toys, email at your desk, Alice's encrypted goodbye, and NOTICE / MESSAGE / EMAIL scores) and **Chessboard** (a fifth floor after the Reliquary: *The Office on Chessboard 1*, where everyone is the real version of themselves and you have three tasks to finish before 5:00). See `SPEC.md` section 14, and `HANDOFF.md` for how the new files connect to the existing ones. `LM.debug.warp('chessboard-one')` jumps straight there.

## The editor

`editor/index.html` is a point-and-click editor for the game: floors and their order, maps painted with the real renderer, items and their abilities, monsters, the player, weapons and gear, tile sets, people and pack settings, with Claude for making or changing any of them from a description. Open it in Chrome or Edge and pick this folder. It saves into `packs/editor/` and adds three lines to `index.html`; the pack files are never touched. See `editor/README.md`, and `SPEC.md` section 15 for the format.

**Apartment (Chessboard 0)** is a new first floor: the player's apartment, the evening before. See `SPEC.md` section 16.

**Red rotary phones**: every floor has one, each with its own 7-digit number. Dial another floor's number to go there. See `SPEC.md` section 17.

**The evening, and Chessboard 1 at home**: dinner and TV are now tasks, the red phone rings, and a voice on it sends you to *Home (Chessboard 1)*, a warped copy of the apartment. Behind Dave's door down the hall is *The Library Maze*, two floors of bookshelves, Librarians, Book Worms and Overdue Ghosts. See `SPEC.md` section 19. `LM.debug.warp('home-cb1')` or `LM.debug.warp('library-1')` jumps straight there.

**The morning after**: back from the library, you sleep, and wake up on Chessboard 0. Alice calls on the red phone: she's lost somewhere familiar. The stairs lead to a *Town Map* with pins for the places you went together: a coffee shop, the Book Nook (and its Chessboard 2 version), a gas station, Forking Paths Park and, under its sundial, *The Maze of Forking Paths*. See `SPEC.md` section 20. `LM.debug.warp('town-map')` jumps straight there.
