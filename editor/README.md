# Linear Maze Editor

A point-and-click editor for The Linear Maze: floors and their order, maps, items and what they do, monsters, the player, weapons and gear, tile sets, people and pack settings, plus Claude for making or changing any of them from a description.

It runs in the browser, straight from this folder. Nothing to install.

## Open it

1. Open `editor/index.html` in **Chrome or Edge** (double-click it, or drag it into a browser window).
2. Click **Open game folder** and pick the game folder itself, the one with `index.html`, `engine` and `packs` in it (for example `E:\Linear Maze\linear-maze-0.3`).
3. Allow the browser to edit files in it when it asks.

Next time, **Reopen linear-maze-0.3** does it in one click.

Firefox and Safari can't write into folders. There the editor opens the folder read-only, and **Save** downloads the changed files for you to copy into place.

## What each page does

| Page | What you can do |
|---|---|
| **Floors** | The run, top to bottom. Drag (or use the arrows) to reorder; **Remove** takes a floor out (restore it at the bottom of the page); **Duplicate**; **New floor** (an empty room, blank, or a copy); **Play from here**. |
| **Map** | Paint a floor with its own tiles, items, monsters and people, drawn by the game's renderer. **Torchlight** shows the floor's real light and darkness; turn it off for flat light. The palette's **Dressings** tab holds furniture and fixtures (desks, tables, counters, pillars, lamps, pictures) from every set, for any floor: filter by set, by kind (furniture, on walls, lights, decor) or by name, and pick which way furniture faces (`[` and `]` turn it). Tools: Select (click a tile to edit it; drag to select an area to fill, clear, copy, make a room or hand to Claude), Paint, Rect (Shift for an outline), Fill, Erase, Pick (eyedropper), Tag (for traps), Room. **Ask Claude** changes the floor (or the selected area) from a description; **Play** starts a play test on this floor. **Floor settings** holds the name, tile set, intro and outro text, peaceful floors and loadouts, rooms, traps and scripted events, ceiling lights and map size. **Check** reports whether the start reaches the exit (keys and doors included), unreachable items, unknown ids and trap tags with no tiles. |
| **Items** | Every world object. **What it does** shows built-in behaviour as editable data: the altar's tithe and prayers (and the blessings it can give, which you can edit, copy, delete or make new right there), the healing font, the espresso machine, the Vend-O-Matic, the slot machine's paytable (with its payback percentage), loot tables. Any item can get a pop-up of choices, a pickup effect, breaking, or text to read. **Placement settings** are the per-copy settings (an altar's title, a chest's contents). **Look**, **Code** and **Used on** too. **Basics → Dressing** files an item under the map's Dressings tab (or keeps it out). **New item** starts from a pickup, a shrine with choices, something to read, something breakable, a light, furniture or a copy. |
| **Monsters** | Stats, movement, attacks (each attack type shows its own settings), drops, death effects, look, code and where they're placed. **New monster** starts from a template or a copy. |
| **Player** | Base stats (health, speed, armor, shields, light, dash, swimming, damage, gold find, ammo), ammunition capacity, and the starting kit (weapons, ammo, gold, worn armor, pack, blessings, gadgets, story flags). |
| **Weapons & gear** | Weapons, armor, blessings and loot tables. |
| **Tile sets** | Every environment: darkness and light colours, floating particles, the background drone, and the floor and wall painters with their colours. Copy one to make a new set, or build one from pictures. **Tile types** shows what each tile does (solid, water, pit, hazard, door), and new tile types can be copied from old ones. |
| **Pictures** | Every imported picture, what uses it, and **Import**, **Replace** (everything using it updates) and **Delete**. |
| **People** | The office cast: look, movement, lines said in passing, and the plain-text parts of their conversations. |
| **Settings** | Pack knobs (`CHESSBOARD.CONFIG`, vending stock, hints, scores), the Claude connection, and **Rebuild the single-file game** (the same as `node tools/build.mjs`, so Node isn't needed). |
| **Ask Claude** | Make or change a monster, item, floor (or part of one) or tile set from a description, or have Claude draw a monster or item in code. |
| **Changes** | Everything changed since the packs, each with **Undo this**. |

Every change can be undone (**Ctrl+Z**, redo with **Ctrl+Shift+Z**). **Ctrl+S** saves. **Play test** runs the whole game in the editor with unsaved changes included, from the title or from any floor, with no-damage and give-everything switches. Its checkpoint is kept apart from your real save.

## Pictures

Monsters and items can be drawn by their original code, built from settings (shapes, colours, extras such as horns or a gun), drawn by a picture, or drawn by your own code.

- **Look → Making a picture for it** writes a prompt for an image generator. Copy it, make the picture, then **Look → A picture → Import a picture…** It can clear a plain background, trim empty edges and shrink it to sprite size.
- **Tile sets → From pictures** paints floors and walls with imported textures. Several floor pictures are mixed at random, tile by tile.
- Pictures are saved inside `packs/editor/sprites.js`, so the single-file build carries them. The **Pictures** page lists them all.

## Claude

The editor can talk to Claude two ways.

- **With an API key** (Settings → Claude): requests go straight to the Anthropic API from this browser, and answers stream in. The key stays in this browser; it is never written into the game folder.
- **Without a key**: **Copy the prompt**, paste it into Claude (claude.ai or the app), copy the whole reply, paste it into **Claude's reply**, and click **Read this reply**.

Either way Claude gets the game's rules (the relevant parts of `SPEC.md`), what already exists, and the format to answer in. The editor checks the answer (code that doesn't run is left out, unknown ids are flagged, floors are checked for a route from start to exit), shows a preview, and changes nothing until you apply it. Applying is one undoable step.

## How it saves

The pack files are never touched. Everything changed in the editor is written to:

```
packs/editor/runtime.js    applies the changes (ships with the editor)
packs/editor/sprites.js    imported pictures
packs/editor/edits.js      every change, as readable data and code
```

The first save adds three `<script>` lines to `index.html`, just before the start-up script. Removing those three lines undoes every editor change at once; the game then runs exactly as it did before.

`edits.js` is plain JavaScript: one `LM.editor.apply({...})` call listing new content (`add`, with `$extends` for copies), changed fields (`patch`), removed ids (`remove`), the floor order, the player and pack settings. `packs/editor/runtime.js` documents the format and the data fields (looks, abilities, effects, pickups, loot lists, slot machines, picture tiles). SPEC.md section 15 has the reference.

If someone else changes `edits.js` while the editor is open, saving asks before overwriting it.

## Troubleshooting

- **“Pick the game folder itself”**: choose the folder that contains `index.html`, not its parent or `editor`.
- **Fonts look plain**: the editor loads its fonts from Google Fonts. Offline, it uses system fonts; nothing else changes.
- **A floor won't draw in the map editor**: the message at the top of the map says why (usually an unknown tile or id on that floor). The Check panel lists unknown characters and ids.
- **Code you typed shows a warning about names**: a function copied from a pack file can use helpers private to that file. The common ones (`eyes`, `lunge`, `flame`, `has`, `rot`, `wallRot`, `U`, `G`, `T`, `h`) are available to edited code. If the game reports one of the others as not defined, replace it. Edited code runs guarded, so a mistake is logged once in the browser console instead of stopping the game.
