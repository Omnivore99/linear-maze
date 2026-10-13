# The Linear Maze — Design and Technical Spec

Iteration 0.2 · October 2026 · Content packs: Core 0.1.0, Office 0.1.0

This document describes what the first iteration of The Linear Maze is, how it is built, and how to extend it. It is written to be handed to a collaborator (or to Claude) at the start of the next iteration, so sections 6 and 7 are a precise reference for adding content.

**New in 0.2:** the Office pack, a prologue on the 14th floor of an office tower with coworkers to talk to, a phone instead of a gun, and a door that wasn't there before. To support it the engine gained NPCs with dialog trees, gadgets, story flags, an objects layer for levels, runtime terrain changes, peaceful (unarmed) floors, several new trap triggers and effects, and two rendering caches. See sections 3, 5, 6.8 and 6.11–6.14.

---

## 1. The game

The Linear Maze is a fast, top-down 2D shooter that runs in a browser. The player descends through a series of floors. Each floor is a hand-built run of passages and chambers: shoot what moves, take what glitters, find the stairs down.

### Design pillars

1. **Fluid and fast.** Movement accelerates and stops crisply, a short dash with invulnerability is always close at hand, and weapons have weight (recoil, screen kick, muzzle light, knockback).
2. **Light is the mood and the mechanic.** Every torch, brazier and crystal casts real shadows. The player sees only what is in line of sight; enemies around a corner are invisible until you turn it. A lamp helmet or a blessing that pushes back the dark is a meaningful upgrade.
3. **Danger is readable.** Every heavy attack telegraphs: melee wind-ups glow, charges draw a red lane, mortar shells mark their landing circle, shockwaves draw their radius before they burst, spike plates glint before they rise.
4. **Content is data.** The engine knows nothing about specific enemies, weapons, items, rooms or floors. All of it is registered by content packs, so the game grows by adding packs and levels rather than by editing the engine.

### Core loop

Enter a floor → clear or slip past each chamber → find the key or switch the next door needs → collect gold, gear and ammunition along the way → spend gold at altars and slot machines → reach the stairs → carry everything to the next floor.

### Starting state

The player starts with no armor and the Service Pistol, which has unlimited ammunition (as specified in the brief).

With the Office pack installed (the default build), a new run starts one step earlier: on the 14th floor of Meridian Group, at 9:52 on a weekday, with no weapon and only a phone. The Service Pistol is waiting on a plinth in the Linear Conference Room, the last room of the prologue. If the player walks past it, the first maze floor hands them one anyway, so the maze always starts as the brief describes. Remove the Office `<script>` tags from `index.html` to start in the maze directly.

---

## 2. Controls

| Input | Action |
|---|---|
| W A S D (or arrows) | Move |
| Mouse | Aim (the camera leans toward the cursor) |
| Left click (hold) | Fire. On a floor with no weapon, a click takes a flash photo with the phone instead |
| Shift or Space | Dash (0.15 s, brief invulnerability, not while swimming) |
| E | Use, open, take, talk (works on whatever the dashed ring or name tag highlights) |
| F | Open the phone (messages, notes, map, photos, flashlight) |
| 1–9, mouse wheel | Switch weapon |
| Q | Swap to the last weapon |
| Tab or I | Inventory |
| Esc or P | Pause |
| M | Sound on or off |

Inside pop-ups: E or Enter triggers the highlighted action, Esc closes. In conversations, 1–9 pick a reply.

---

## 3. What iteration 0.2 contains

### Floors

| # | Floor | Environment | Highlights |
|---|---|---|---|
| 14th floor | Meridian Group (Office pack prologue) | Carpet tile, terrazzo, glass, drywall; bright fluorescent ambient | Reception lobby with elevators and Marisol the receptionist; an open plan of desk pods with seated coworkers and your own desk (the note); three glass-walled conference rooms (one mid-meeting); an all-gender restroom with a locked, occupied stall; the Cantina (fridge, espresso machine, vending, coworkers arguing about stolen lunches); Dana's and Alan's executive offices and a quiet room. Reading the note makes a door appear in the west hall. Past it: a hallway that cannot be here, the open plan again (water-damaged, desks askew, people facing the walls, something only the camera flash can see), a copy room that won't stop printing, a corridor turning to stone, and the grand opening: the Linear Conference Room, whose stair leads to Floor 1. |
| 1 | The Sunken Cloister | Mossy flagstone, brick, teal ambient | Flooded nave with pools and pillars; spike stair; the Ossuary (red key on a candlelit dais, skitter swarm); Sexton's Store (Scattergun chest, explosive barrels); dart-plate corridor; red door; Chapter House water channel with gunners; shrine whose door wakes husks in the water; altar; healing font; the Sinkhole (walkways over pits, dash-only ledges). |
| 2 | The Ember Foundry | Riveted plate, bulkheads, molten slag | Gantry Hall split by a slag river with two grate bridges; sentry turrets and lobbers; the Tripwire Gallery (two laser beams, alarm and ambush, plus a crate-blocked crawlspace that bypasses them); Pump Station (recharge station, Aegis Harness); the Tally Room (two slot machines, Rivet Gun locker, foreman's ledger); the Crucible (Arc Lance on a platform in the slag, reached by a one-tile bridge; the gold key on an island guarded by a brute, which wakes the slag when taken); gold door; lift shaft. |
| 3 | The Gilded Reliquary | Veined marble, gold inlay, crimson carpet, violet ambient | Processional with wardens; the Crossing (reflecting pool, altar, recharge station); Hall of Votives (walking in snuffs every candle and releases skitters); the Vault (Ember Mortar, violet key, Gilded Circlet; lifting the idol seals the vault until the summoned guard is dead); the Sanctum boss fight against the Reliquary Keeper, whose death unseals the last stair. |

### The office request, mapped to what shipped

| Request item | Where |
|---|---|
| Modern-day office building, larger open-plan rooms | `levels/00-meridian-fourteen.js`: a 104 × 48 floor; the open plan is 45 × 20 tiles with ten desk pods. |
| Conference rooms with tables and glass walls | Tangent, Vertex and Parallel: glass south walls and glass doors (`glass-h`, `door-glass`), long tables with chairs, wall screens and whiteboards. Vertex has a meeting in progress. |
| Bathroom, pantry, executive offices | Restroom (stalls, sinks, mirrors, a locked occupied stall you can talk to); the Cantina (sink, kettle, espresso machine that makes you faster, microwave, fridge, vending, café tables); Dana Whitlock's and Alan Mercer's offices; the Quiet Room. |
| NPCs that are not enemies | 24 people (`packs/office/npcs.js`), each with a look, a movement behaviour (sit, stand, pace, wander, face the wall), ambient speech bubbles and a dialog tree. None can hurt you. |
| Your desk, with a note to "meet in the Linear Conference room" | Workstation 14-112 (`my-desk`). Taking the note sets the `readNote` flag, which starts everything else. |
| Break-room NPCs: don't know where it is, complain about lunches | Priya (pad thai stolen, again), Gary (his salmon is in the microwave; you can steal it), Tomas from IT (the oat milk is his). Each has an answer about "Linear" and their own threads. The fridge, microwave and notice board join in. |
| The boss: mildly annoying, status reports | Dana Whitlock paces the open plan, gently circling back on your status report, in person and by text, all the way down. |
| The receptionist: beleaguered, nice | Marisol Reyes, juggling every line at once (including line four, which you can pick up). |
| A door that "wasn't there before" | Ten seconds after you take the note the lights stutter, the building shudders and a window in the west hall becomes an old studded door (`odd-window` plus the `door-odd` terrain, swapped in at runtime). |
| A more jumbled, insane office area | Past the door the way back closes and the office lights go out. The open plan repeats, flooded and wrong: desks askew, flickering screens, echoes of your coworkers, a desk that is yours, a copy room printing floor plans with one extra corridor each. |
| The grand opening into the Linear Maze | The corridor turns to flagstone and opens into the Linear Conference Room: a pillared stone hall, Dana waiting, the pistol on a plinth "for the attendee", and the stair down to Floor 1. |
| A phone instead of a weapon, with messages and other functions | The `phone` gadget: messages with quick replies (Dana, an unknown number, the team channel, your calendar, Mom), a Notes tab with the current objective and your to-do list, a floor map, a camera whose flash briefly lights the room (and shows what shouldn't be there), and a flashlight that drains the battery. It keeps buzzing on the maze floors. |

### The brief, mapped to what shipped

| Brief item | Status | Notes |
|---|---|---|
| Walls | Done | Procedurally textured per environment, with lit edges, front faces and contact shadows. |
| Doors | Done | Slide open automatically for the player; enemies that are hunting you open unlocked doors too. |
| Locked doors and keys | Done | Red, gold and violet keys. Keys are kept for the floor. |
| Dangerous terrain | Done | Pits (fall, take damage, climb back out), spike plates on a rolling timer, molten slag (burns and slows). |
| Level entry and exit | Done | Entry and exit stairs. Health, gear, gold, weapons and ammunition carry over; keys do not. |
| Traps | Done | Triggers: pressure plate, laser beam, opening a door, taking an item, entering a zone, clearing a tagged group. Effects: darts, summons, lockdown (seal doors until the summons die), alarm, lights out, explosions, quake, messages, unseal and open doors. |
| Stairs | Done | Entry and exit tiles. |
| Pillars | Done | Round; block movement, bullets, light and sight. |
| Water | Done | Slows you, disables dash, hides your lower half. Wading Boots and the Oilskin Coat help. |
| Specialized rooms | Done | Named rooms announce themselves on first entry; shrine, ossuary, storeroom, break room, vault, sanctum. |
| Lighting sources | Done | Wall torches, braziers, crystals, candles, the lamp helmet; static lights cast shadows. |
| Treasure chests | Done | Fixed contents or loot tables; optional key lock; take items one by one or all at once. |
| Furniture | Done | Cosmetic (tables, benches, bones, banners), usable (lecterns, healing font), destructible (crates drop loot; barrels explode and chain). |
| Health kits | Done | Health vials (+25) and medical kits (+60). |
| Recharge stations | Done | Finite reserve that refills energy cells and shields. |
| Altars | Done | Pay a tithe for a random lasting blessing, or pray once for free. |
| Slot machines | Done | Three reels, three bet sizes, a paytable, and three skulls releases skitters. |
| Clothing and armor | Done | Head, body, feet and trinket slots; 11 pieces that change armor, speed, shield, light, damage, swimming, gold find and ammo capacity. |
| Weapons | Done | Five weapons with distinct ammunition and behavior. |
| Pop-up UI for interactive items | Done | Chests, stations, altars, slot machines, lecterns, fonts, weapon racks, armor stands, idol, inventory, pause, floor summary, death and victory. |
| Enemy variety | Done | Toughness, speed, ranged, melee and area attacks are all independent data. Seven enemy types and one boss. |
| Fast-paced, fluid, beautifully rendered | Done, needs real playtesting | 60 fps target on GPU-accelerated browsers. Balance has only been checked by automated tests (see section 10). |
| Modular content via prompts and packages | Done | See sections 6 and 7. |

---

## 4. Technology

**Stack:** plain JavaScript, HTML Canvas 2D, WebAudio. No framework, no bundler, no dependencies, no image or audio files. Fonts come from Google Fonts (Major Mono Display, Big Shoulders Display, IBM Plex Mono, Spectral) with system fallbacks.

**Why:** it loads instantly, runs anywhere a browser does, and keeps every piece of content readable and editable as a small text file. All art is procedural (textures are painted by code and cached); all sound is synthesised.

### Running and building

- **Play from source:** open `index.html` in a browser. Classic `<script>` tags are used (not ES modules), so it also works from `file://`. A local server works too: `python3 -m http.server`.
- **Build a single file:** `node tools/build.mjs` writes
  - `dist/the-linear-maze.html`: one standalone file, every script inlined.
  - `dist/artifact.html`: the same page without the `<html>/<head>/<body>` wrapper, for publishing as a claude.ai Artifact.
- **Debug helpers** (browser console): `LM.debug.warp('ember-foundry')`, `LM.debug.giveAll()` (every weapon, full ammo, all keys), `LM.debug.god()` (no damage), `LM.debug.reveal()` (full minimap).

### File layout

```
index.html                 page shell, styles, HUD markup, script load order
SPEC.md                    this document
tools/build.mjs            single-file build
engine/
  core.js                  LM namespace, content registry, definePack, math and colour helpers, event bus
  input.js                 keyboard and mouse state
  audio.js                 WebAudio synth sound library + ambience drone; LM.audio.define()
  level.js                 Level (parses map + legend), flow-field navigation
  physics.js               circle-vs-tile collision, ray casting, visibility polygons
  render.js                renderer: chunk cache, lighting, emissive pass, overlays; LM.gfx helpers
  particles.js             pooled particles; LM.particleTypes
  combat.js                projectiles, damage, healing, explosions, firing weapons
  player.js                player movement, dash, hazards, weapons, gear-derived stats
  entities.js              Enemy, Item, Door, Lob (mortar shell), AI steering helpers
  npc.js                   NPC (non-hostile people), movement behaviours, speech bubbles, LM.gfx.person
  traps.js                 Trap (trigger + effects)
  ui.js                    HUD, minimap, toasts, room titles, pop-up system, dialog, portraits, standard screens
  game.js                  Game: loading, update loop, camera, pickups, interaction, saving, boot
packs/core/
  environments.js          texture painters + the three environments
  terrain.js               tile types + the default map legend
  weapons.js               weapons + projectiles
  enemies.js               behaviours + attack types + enemies
  items.js                 every world object, its pop-up, loot tables
  armor.js                 armor + blessings
  effects.js               trap effects
packs/office/
  environment.js           office painters, the 'office' environment (8 floor variants), glass, partitions, stall doors, the odd door, old stone, the grand exit
  furniture.js             every office object: desks, conference tables, kitchen, restroom, executive suite, the wrong office, the plinth
  npcs.js                  the cast: coworkers, the boss, the receptionist, the meeting, and their echoes past the door
  phone.js                 the phone gadget, its screen, LM.phone messaging, the 'phone' trap effect, maze-floor messages
levels/
  00-meridian-fourteen.js  the prologue (Office pack)
  01-sunken-cloister.js
  02-ember-foundry.js
  03-gilded-reliquary.js
```

**Load order matters:** engine files first (in the order above), then packs, then levels, then `LM.boot()`. A new pack is added by writing its files and adding `<script>` tags after `packs/core/` in `index.html`. The Office pack is loaded after the core levels; its prologue has `order: 0`, so it becomes the first floor of a new run, while the title screen keeps showing the Cloister (the first floor with an `attractPath`).

---

## 5. Architecture

### Units and coordinates

- One tile is `LM.TILE = 32` world units. Positions are in world units, with tile `(tx, ty)` covering `[tx*32, tx*32+32)`.
- Speeds are units per second; times are seconds; angles are radians with 0 pointing right and y pointing down.
- The camera shows roughly 1000 × 620 world units on a typical screen (`zoom = min(w/1000, h/620)`), device pixel ratio capped at 2.

### The frame

`Game.loop` runs on `requestAnimationFrame` with `dt` clamped to 50 ms. Hit-stop briefly slows `dt` on heavy hits. Each frame:

1. Global keys (pause, inventory, mute), scheduled timers.
2. Player → enemies → NPCs → doors → items (and popping loot) → pickups → traps → projectiles → timed effects → short-lived lights → particles.
3. Flow field recomputed when the player changes tile (at most every 0.15 s) or a door changes.
4. Line-of-sight polygon from the player (also marks tiles explored for the minimap).
5. Interaction focus, room titles, exit check, ambient particles, camera.
6. Render (below), then HUD diff-update.

Pop-ups pause the world (`state = 'popup'`); rendering continues so flames still flicker behind the panel.

### Rendering

1. **Terrain chunks.** The level is baked lazily into 8 × 8-tile canvases at the exact screen scale, painted by each terrain's `bake()` (floors, then contact shadows, then walls and pillars). Blood, scorch marks and debris are painted into chunks as permanent decals. One extra chunk just outside the view is baked on quiet frames so walking never hitches.
2. **Animated terrain:** water ripples, spikes, pressure plates.
3. **Objects**, sorted by y: shadows, items, doors, enemies (only those in line of sight), the player, projectiles, effects, particles.
4. **Lightmap** at half resolution: an ambient fill, then every light added (`lighter`) clipped by its own visibility polygon, then the player's aura and aim cone, then short-lived lights (muzzle flashes, explosions, glowing projectiles). Finally everything outside the player's line of sight is multiplied darker. The lightmap is multiplied over the scene. Steady static lights (no flicker: ceiling panels, windows, screens) are painted once into world-space light tiles of 12 × 12 tiles and reused; a tile is repainted only when a light in it is switched, dimmed or set flickering, or a wall near it changes. Flickering lights are drawn every frame.
5. **Emissive pass** (`lighter`, unaffected by darkness): flames, glints, tracers, beams, telegraphs, eyes.
6. **Overlays:** damage numbers, the interaction ring, crosshair, damage vignette.

Static light polygons are cached and only recomputed when a nearby door opens or closes or a tile changes. Items whose drawing never animates set `cache: true` and are painted once into a sprite (section 6.6), which keeps a room with eighty desks nearly as cheap as a room with eight.

### Collision and movement

Entities are circles. Movement is sub-stepped and resolved axis by axis against solid tiles (rectangles, or circles for pillars), so bodies slide along walls. Closed doors are dynamic solids. Solid furniture pushes bodies out. Bullets march in 5-unit steps and stop on anything that blocks shots.

### Enemy AI

Each enemy has one **behaviour** (how it moves) and a list of **attacks** (what it does). Every frame the behaviour writes a desired direction; then the attack system either continues the current attack or starts the first one whose `canStart` passes and whose cooldown is ready. Attacks can override movement (a charge, a nova that roots the caster).

Enemies notice the player by line of sight within `sight` range, by being shot, or by an alarm; noticing wakes friends within 150 units. Navigation: straight at the player when visible, otherwise downhill on a breadth-first flow field rooted at the player's tile (8-way, no corner cutting). Hazard tiles are avoided; knockback can still throw enemies into pits.

### Damage

`LM.combat.hurt(game, target, amount, opts)` handles all three target kinds. For the player: invulnerability check, shield absorbs first, then armor reduces the rest, then knockback, shake and hit-stop. For enemies: armor reduces damage, knockback is divided by mass, a damage number floats up, death drops loot. Destructible items lose hit points and break.

Explosions damage everything in radius that has a clear line from the centre. The player's own blasts hurt them at 35%. Enemy blasts do not hurt other enemies; barrel blasts hurt everyone.

### People, conversations and story

NPCs (section 6.11) are drawn like the player and never take part in combat. Pressing E on one opens a conversation: a portrait, a few paragraphs and numbered replies, driven by a small node graph. Conversations and furniture read and write **story flags** on the player (`game.setFlag(name)`, `game.hasFlag(name)`). Flags last for the whole run, carry between floors and are saved, so a message on Floor 2 can know that you stole Gary's salmon on the 14th floor. Setting a flag fires `flag` traps, which is how a level scripts a sequence of events from one action (section 6.8).

A level can also change itself while you play: `game.setTerrain(tx, ty, id, tag)` swaps a tile (a window becomes a door, the door becomes wall again), rebakes the chunk around it, re-casts nearby light and refreshes navigation.

### Saving

A checkpoint is written to `localStorage` (`linear-maze-save-v1`) on entering each floor: the floor id and the player's state as they arrived, including gadgets, story flags and pack data (the phone's messages and photos). Death restores that checkpoint. The title screen offers Continue when a save exists. Content removed from the registry is dropped from saves safely.

---

## 6. Content pack reference

Everything is registered through one call:

```js
LM.definePack({
  id: 'catacombs',            // required
  name: 'Catacombs',          // shown on the title screen
  version: '0.1.0',
  environments: { ... }, terrain: { ... }, legend: { ... },
  weapons: { ... }, projectiles: { ... },
  enemies: { ... }, behaviors: { ... }, attacks: { ... },
  items: { ... }, armor: { ... }, blessings: { ... },
  lootTables: { ... }, effects: { ... }, textures: { ... },
  npcs: { ... }, gadgets: { ... },
  levels: { ... },
});
```

NPC movement behaviours are plain functions on `LM.npcBehaviors` (section 6.11) rather than a registry kind.

A pack may be split across several files that each call `definePack` with the same `id`. A later definition with the same kind and id replaces the earlier one, so a pack can also re-skin or rebalance core content. Look-ups go through `LM.get(kind, id)` (throws if missing) and `LM.find(kind, id)` (returns undefined).

Draw functions receive a canvas context already translated (and for most things rotated) into the object's local space, in world units. Colours are CSS strings; helpers live in `LM.util` (`rgba`, `shade`, `mix`) and `LM.gfx` (`glow`, `shadow`, `circle`, `roundRect`).

### 6.1 Environments and textures

```js
environments: {
  catacombs: {
    name: 'Catacombs',
    voidColor: '#050606',          // outside the map
    ambient: '#26302a',            // lightmap base (darker = moodier)
    attractAmbient: '#3e4a42',     // brighter ambient for the title screen
    outsideSight: '#3a3e3a',       // multiply applied outside line of sight
    playerLight: '#f0ffe0',
    torch: '#a8ff7a',              // default colour for torches and braziers
    floor:    { style: 'flagstone', colors: [...], grout, crack, moss, mossAmt },
    floorAlt: { style: 'mosaic', colors: [...], grout },   // used by ',' tiles
    wall:     { style: 'brick', top: [...], mortar, edge, face, faceDark, moss, trim? },
    water:    { deep, shallow, foam },
    pit:      { core, wall, rim },
    slag:     { crust, crust2, glow, hot },                // only if the floor uses slag
    door:     { panel, frame, trim },
    particles: { type: 'mote' | 'ember', color, rate, alpha, drift, windX, windY, size },
    ambience:  { base: 49, cutoff: 220, wind: 340, gain: 0.05, wave: 'sawtooth' | 'triangle' | 'sine' },
  },
},
```

Each environment palette names a painter by `style`. Floor painters in Core: `flagstone`, `mosaic`, `plates`, `grate`, `marble`, `carpet`. Wall painters: `brick`, `bulkhead`, `ashlar`. Office adds floor painters `carpet-tile`, `terrazzo`, `bath-tile`, `planks`, `carpet-warped` and the wall painter `drywall`.

An environment can define more than two floors with `floors: { 0: palette, 1: palette, ... }`; a map tile picks one with the legend's `variant`. The office environment has eight: 0 open-plan carpet, 1 lobby terrazzo, 2 restroom tile, 3 pantry wood, 4 executive walnut, 5 damaged carpet, 6 old flagstone, 7 conference carpet. A terrain can paint with another palette by passing it to `LM.paintWall(g, x, y, info, palette)` (the office's stone walls do this). `env.doorStyles` and `env.doorGlows` let a pack draw its own kinds of door (`glass`, `stall`, `odd`), chosen by a door terrain's `door.style`. A new painter:

```js
textures: {
  bonework: { kind: 'floor', paint(g, x, y, info, pal) { /* draw a 32x32 tile at x,y */ } },
  ossuaryWall: { kind: 'wall', top(g, x, y, h, info, pal) {...}, face(g, x, y, fh, info, pal) {...} },
}
```

`info` gives `rnd()` (seeded per tile, so baking is stable), `x`/`y` (tile coords), `n(dx, dy)` (neighbour terrain), `level`, `env`, `variant`. Wall painters get the height of the top face; `LM.paintWall` adds lit lips on exposed edges and a front face where the south side is open.

### 6.2 Terrain

| Field | Meaning |
|---|---|
| `solid` | Blocks movement. With `shape: 'circle'` and `radius`, it is round (pillars). |
| `blocksShots`, `blocksLight` | Stops bullets; stops light and sight. |
| `tall` | Casts a contact shadow on neighbouring floor. |
| `layer` | 0 = ground (baked first), 1 = raised (walls, pillars). |
| `floorLike` | Counts as floor for carpet borders. |
| `hazard` | `'pit'` = fall; any other value hurts: `damage` every `interval` seconds while `active(game, tx, ty)` returns true (or always). `onHurt(game, player)` for effects. |
| `swim`, `speedMul` | Water behaviour; ground that slows. |
| `door: { lock }` | Spawns a Door entity. `lock` is a key colour or null. |
| `plate`, `entry`, `exit` | Pressure plate visuals; level start; level end. |
| `light` | `{ color, radius, intensity, flicker }` or `(level, x, y) => spec or null`. |
| `bake(g, x, y, info)` | Painted once into the terrain cache. |
| `drawDynamic`, `drawGlow` | `(g, x, y, tx, ty, game, t)`: lit animation, and emissive animation. |
| `mapColor` | Minimap colour; `'none'` hides the tile. |

| `door: { lock, style, sealed }` | `style` picks a pack-drawn door look; `sealed: true` keeps it shut until something unseals it. |
| `rect: [x, y, w, h]` | A solid tile that only fills part of its square (thin glass walls, stall partitions). |

Core terrain ids: `void`, `wall`, `floor`, `door`, `door-red`, `door-gold`, `door-violet`, `plate`, `water`, `pit`, `spikes`, `slag`, `pillar`, `entry`, `exit`. Office adds `glass-h`, `glass-v` (see-through walls that block movement and bullets but not light or sight), `partition-h`, `partition-v`, `door-glass`, `door-stall`, `door-stall-locked`, `door-odd` (sealed until opened from its pop-up), `stone-wall`, `stone-pillar` and `grand-exit`.

### 6.3 The default legend

| Char | Means | Char | Means |
|---|---|---|---|
| `#` | wall | `$` | gold |
| (space) | void | `*` | glowing crystal |
| `.` | floor | `h` / `H` | health vial / medical kit |
| `,` | room floor (the environment's `floorAlt`) | `a` | shells |
| `+` | door | `c` | chest (common loot table) |
| `R` `Y` `V` | red / gold / violet locked door | `t` | brazier |
| `r` `y` `v` | red / gold / violet key | `T` | wall with a torch (faces the open side) |
| `~` | water | `x` / `b` | crate / explosive barrel |
| `O` | pit | `n` / `-` | table / bench |
| `^` | spikes | `l` | lectern |
| `o` | pillar | `E` | recharge station |
| `_` | pressure plate | `A` | altar |
| `%` | molten slag | `S` | slot machine |
| `<` | entry stairs (player start) | `W` | weapon rack (Scattergun unless overridden) |
| `>` | exit stairs | `U` | armor stand (set `props.armor`) |
| `F` | healing font | `k` / `i` | bones / candles |
| `m` | Drowned Husk | `M` | Brute |
| `f` | Skitter | `p` | Ember Lobber |
| `g` | Cult Gunner | `X` | Sentry Turret |
| `w` | Gilded Warden | | |

A legend entry is `{ terrain, item, enemy, npc, tag, props, variant, start }`. Anything left out defaults: terrain is `floor`, variant is 0. A level's own `legend` overrides these characters for that floor only, which is how floors give a chest specific contents, tag a door for a trap, or put an item on carpet (`variant: 1`).

### 6.4 Weapons and projectiles

| Weapon field | Meaning |
|---|---|
| `name`, `short`, `slot`, `desc` | Display name, HUD label, sort order, flavour text. |
| `ammo`, `ammoPerShot`, `pickupAmmo` | `null` (unlimited), `'shells'`, `'rounds'`, `'cells'`, `'rockets'`. |
| `damage`, `pellets`, `fireRate` | Per projectile; projectiles per shot; shots per second (all weapons fire while held). |
| `spread`, `bloom` | Radians; extra spread per point of recoil. |
| `speed`, `range`, `maxRange`, `falloff` | Projectile speed; distance or `'cursor'` (burst where you aim); cap; damage lost at max range (0–1). |
| `pierce` | Extra enemies a projectile passes through. |
| `projectile`, `tracer` | Projectile id; tracer colour override. |
| `aoe: { radius, damage, color, selfDamage }` | Explodes on impact or at range. |
| `knock`, `recoil`, `kick`, `pushback` | Knockback; crosshair bloom; screen shake; shove on the shooter. |
| `sound`, `flash`, `flashRadius`, `flashSize`, `sparks`, `casing`, `smoke`, `muzzle` | Feel. |
| `length`, `drawHeld(g, player, kick)` | How it looks in hand; also used for icons. |

Projectile fields: `radius`, `color`, `tracer`, `width`, `glow`, `wallSparks`, `sparkColor`, `light: { r, color, intensity }`, and optional `draw(g, p, t)` / `drawGlow(g, p, t)`.

### 6.5 Enemies, behaviours and attacks

| Enemy field | Meaning |
|---|---|
| `name`, `hp`, `speed`, `radius` | Basics. |
| `armor`, `mass` | Damage reduction 0–1; knockback divisor. |
| `accel`, `turn` | Steering responsiveness. |
| `sight`, `leash` | Notice distance; give-up distance. |
| `ai`, `keep: [min, max]` | Behaviour id; preferred distance for ranged behaviours. |
| `attacks: [{ type, ...params }]` | Tried in order when off cooldown. |
| `drops` | `{ gold: [min, max], goldChance, items: [{ id, chance, props }] }` or a loot table id. |
| `flying`, `swimmer`, `stationary`, `boss` | Ignores hazards; full speed in water; never moves; gold health bar. |
| `blood`, `gib`, `deathGlow`, `deathSound`, `bark`, `color` | Feel. |
| `draw(g, e, t)`, `drawGlow(g, e, t)` | Body (in local space, call `g.rotate(e.facing)` yourself) and emissive bits. |
| `init`, `update`, `onDeath` | Hooks `(e, game)` / `(e, dt, game)`. |

Core behaviours: `chaser`, `swarmer`, `skirmisher`, `lobber`, `turret`, `warden`, `boss`. A behaviour is `{ update(e, dt, game) }` that adds to `e.mx`, `e.my` and may scale `e.speedMul`. Helpers: `LM.ai.chase`, `away`, `strafe`, `wander`, `separate`, `avoidHazards`.

Core attacks and their parameters:

| Type | Parameters |
|---|---|
| `melee` | `damage`, `range`, `windup`, `recover`, `cooldown`, `knock` |
| `ranged` | `projectile`, `damage`, `speed`, `burst`, `burstGap`, `fan`, `spread`, `lead`, `windup`, `cooldown`, `range`, `minRange`, `moveWhileFiring`, `flash` |
| `lob` | `damage`, `radius`, `flight`, `windup`, `cooldown`, `minRange`, `maxRange`, `indirect`, `color` |
| `nova` | `damage`, `radius`, `windup`, `recover`, `cooldown`, `color`, `shards`, `shardDamage` |
| `charge` | `damage`, `speed`, `duration`, `windup`, `cooldown`, `minRange`, `maxRange`, `stun` |
| `summon` | `enemy`, `count`, `max`, `windup`, `cooldown` |

An attack type is `{ canStart(e, a, game), start?(e, atk, game), update(e, atk, dt, game), drawGlow?(g, e, atk, t, game) }`. `atk.t` counts up from 0; set `atk.done = true` to finish.

### 6.6 Items

| Field | Meaning |
|---|---|
| `name`, `radius`, `z`, `shadow`, `shadowScale`, `bob` | Basics and presentation. |
| `solid`, `solidRadius` | Bodies are pushed out (circle). |
| `wallMounted` | Placed on a wall tile, snapped to the open side; `item.face` is the facing. |
| `light` | `{ color, radius, intensity, flicker }` or `(item, game) => spec`. Lights inherit the item's tag (so traps can switch them). |
| `magnet`, `onTouch(item, game)` | Pickups. Return `false` to leave the item (e.g. health at full health). |
| `interact: { prompt, use, available }` | Interactive objects. `prompt` and `available` may be functions of `(item, game)`. `use` usually opens a pop-up. |
| `destructible: { hp, onBreak(item, game) }` | Shootable and blast-able. |
| `init`, `update`, `draw`, `drawGlow`, `drawIcon`, `iconScale` | Hooks; `draw` runs in the item's local space. |
| `mapColor`, `mapAlways`, `isChest` | Minimap marker; keep showing once used; counts toward the chest total. |
| `grant(game, entry, at)` | How a chest hands this item over (default: dropped beside the chest). |
| `solid: 'rect'` | Box collision instead of a circle: set `it.box = [w, h]` and optional `it.boxOff = [dx, dy]` in `init` (desks, counters, tables). |
| `cache`, `cacheRadius`, `cacheKey(item, game)` | Paint `draw` once into a sprite of half-size `cacheRadius` (a number, or a function of the item) and reuse it. Only for drawings that never animate; `cacheKey` returns a string that changes whenever the picture should (a flag, a used state). `drawGlow` still runs every frame. |
| `reach` | Extra interaction range in units (someone behind a desk). |

Placement props every item understands: `ox`, `oy` (a nudge in units, for pieces that sit between tiles) and, on wall-mounted items, `face: 'n' | 's' | 'e' | 'w'` to choose which side of a wall it hangs on (otherwise the first open side, checked south, east, west, north). Office furniture also takes `dir` (the side its front faces) and, for multi-tile pieces, `w` and `h` in tiles anchored at the top-left tile. Drawing code must take randomness from a seeded generator (`U.mulberry32`, `U.hash2`, `info.rnd`), never `Math.random`, or the piece changes every frame.

**Pop-ups.** `LM.ui.open({ kicker, title, body, actions, wide, dismissable, onClose })`. `body` is a DOM node built with `LM.ui.h(tag, attrs, ...children)`. Actions: `{ label, primary, quiet, key: 'E', disabled, close: false, onClick }`; an action closes the pop-up unless `onClick` returns `false`. Helpers: `LM.ui.icons.weapon/armor/item`, `LM.ui.lootIcon`, `LM.ui.weaponStats`, `LM.ui.modList`, `LM.ui.showText(title, text, kicker)`.

**Loot entries** (chests, `dropLoot`, `grant`): `{ type: 'gold', amount }`, `{ type: 'ammo', ammo, amount }`, `{ type: 'weapon', id }`, `{ type: 'armor', id }`, `{ type: 'key', color }`, `{ type: 'item', id, props }`. A loot table is `{ roll() => [entries] }`; Core has `crate`, `chest-common`, `chest-rich`.

### 6.7 Armor and blessings

Both add numbers to the player's stats. Every stat a modifier can touch:

| Stat | Base | Notes |
|---|---|---|
| `maxHp` | 100 | |
| `speed` | 172 | units per second; floor of 90 |
| `armor` | 0 | fraction of damage ignored after shields; capped at 0.75 |
| `maxShield`, `shieldRegen` | 0, 0 | shield absorbs damage first; regenerates after 2.5 s without hits |
| `lightRadius` | 300 | length of the aim cone; the aura is 42% of it |
| `dashCooldown` | 0.9 | seconds; floor of 0.3 |
| `swimMul` | 0.55 | speed multiplier in water |
| `damageMul` | 1 | |
| `goldFind` | 0 | extra gold from enemy drops |
| `ammoMul` | 1 | ammunition capacity multiplier |

Armor: `{ name, slot: 'head'|'body'|'feet'|'trinket', mods, desc, color, trim, lamp, drawIcon }`. Blessings: `{ name, mods, desc, stack, onGrant(game, player) }`.

### 6.8 Levels

```js
LM.definePack({
  id: 'core',
  levels: {
    'my-floor': {
      name: 'The Drowned Library',
      order: 4,                      // sort order; also used for "Floor N"
      environment: 'cloister',
      next: 'another-floor',         // optional; defaults to the next by order
      intro: 'Shown on the summary screen before this floor.',
      outro: 'Shown instead of the stats when this floor is finished.',
      floorLabel: '14th floor',      // replaces "Floor N" (labelled floors don't take a number)
      armed: false,                  // peaceful floor: no firing, combat HUD hidden, the held gadget is used instead
      loadout: { weapons: [], gadgets: ['phone'], gold: 0 },  // a new run that starts here starts with this
      attractPath: [[x, y], ...],    // title-screen camera path, tile coords (first floor only)
      legend: { /* per-floor terrain overrides */ },
      objectLegend: { /* characters for the objects layer */ },
      rooms: [{ name, rect: [x, y, w, h], note }],   // announced on first entry; first match wins where rects overlap
      traps: [ /* see below */ ],
      ceilingLights: [{ variants: [0, 1], every: 4, offset: [2, 2], color, radius, intensity, flicker, skip, tag }],
      map: [ '#####', '#<.>#', '#####' ],
      objects: [ '     ', ' @ c ', '     ' ],   // optional second layer on the same grid
    },
  },
});
```

Map rows may differ in length (short rows are padded with void). Unknown characters log a warning and become floor.

**The objects layer.** A busy room runs out of characters fast when furniture shares the terrain map, so a level may add `objects`: a second grid of the same size whose characters are looked up in `objectLegend` (which does not inherit the default legend). Spaces and `.` are empty. An entry is `{ item | npc | enemy, props, tag, start }`, or just an id string, which resolves to whatever kind it is registered as (item, then NPC, then enemy). `start: true` marks the player's starting tile. Characters outside ASCII are fine (the office uses `‹ › « » τ σ Ω`).

**Ceiling lights** lay a grid of static lights over every non-solid tile whose floor `variant` is listed, every `every` tiles from `offset`. `skip` (0–1) leaves random gaps; a `tag` lets a trap switch the whole grid.

**Traps** pair one trigger with a list of effects, wired by tag names from the legend:

| Trigger `type` | Fires when |
|---|---|
| `plate` | the player steps onto a tile with the tag (re-arms after `cooldown` if `once: false`) |
| `zone` | the player enters a tagged tile (invisible) |
| `beam` | the player crosses a laser between two tagged wall emitters that face each other across open floor |
| `door` | a door with the tag first opens |
| `pickup` | an item with the tag is taken |
| `clear` | every enemy placed with the tag is dead |
| `flag` | the story flag named by `tag` is set (by a conversation, an item or another trap) |

| Effect `type` | Parameters |
|---|---|
| `darts` | `tag` (dart-emitter items), `volleys`, `interval`, `damage`, `speed` |
| `spawn` | `tag` (floor tiles), `enemy` or `enemies[]`, `count` |
| `seal` / `unseal` / `open` | `tag` (doors), `text` |
| `alarm` | `radius`, `text` |
| `lights` | `tag` (light sources), `on`, `text` |
| `explode` | `tag`, `radius`, `damage`, `stagger` |
| `message` | `text`, `kind` (`warn`, `good`, `key`) |
| `quake` | `strength` |
| `terrain` | `tag` (tiles), `terrain` (new terrain id), `doorTag`, `sound`: change tiles while playing; waits if the player is standing where a solid tile would go |
| `flag` | `name`: set a story flag (which can fire `flag` traps) |
| `ambient` | `ambient`, `outsideSight` (hex colours), `time`: fade the floor's darkness |
| `flicker` | `tag` or `radius`, `time`, `strength`: make lights stutter for a while |
| `phone` (Office) | `thread`, `text`, `replies`: deliver a phone message (section 6.13) |

Every effect also accepts `delay`. A `seal` lasts until everything the same trap spawned is dead. Doors can start sealed with `props: { sealed: true }` in the legend.

A sequence is a `flag` trap with delayed effects. The prologue's door is one trap: when `readNote` is set it sends a text at 3 s, flickers every light at 10 s, shakes the floor at 10.4 s, turns the tagged wall tile into `door-odd` and sets `doorAppeared` at 10.6 s, and texts "West hall." at 14 s.

### 6.9 Sounds and particles

- `LM.audio.define('name', (t, out, opt, kit) => { kit.noise(t, out, {...}); kit.tone(t, out, {...}); })`. Weapons and enemies reference sounds by name. `LM.audio.setAmbience({ base, cutoff, wind, gain, wave })` changes the drone.
- `LM.particleTypes.name = { pass: 'under' | 'normal' | 'glow' | 'overlay', draw(g, p, k) }` where `k` runs from 1 to 0 over the particle's life. Spawn with `game.particles.add({...})` or `game.particles.burst(x, y, n, {...})`.

### 6.10 Events

`LM.on('enemyDied', fn)`, `LM.on('levelLoaded', fn)`, `LM.on('flag', ({ name, game }) => ...)`, `LM.on('event:door' | 'event:pickup' | 'event:flag', fn)`. Useful for packs that track achievements, quests or statistics without touching the engine. The phone uses `levelLoaded` to keep texting you on the maze floors.

### 6.11 NPCs

```js
npcs: {
  receptionist: {
    name: 'Marisol Reyes', role: 'Front desk',
    behavior: 'sit',                 // stand | sit | wander | pace | face-wall | spin, or your own
    face: 's',                       // resting direction: n e s w, or radians
    mood: 'tired',                   // default portrait: neutral smile tired annoyed wide blank glitch
    look: { skin, hair, hairStyle, shirt, pants, shoes, tie, lanyard, blazer, glasses, headset, holding, bg },
    barks: ['Please hold—', ...],    // or (npc, game) => [lines]; speech bubbles when you're near
    barkRange: 160, barkMin: 7, barkMax: 15,
    flashBarks: ['Delete that.'],    // said when the phone camera flashes nearby
    speed: 55, radius: 9, roam: 3, reach: 48,   // walk speed, body size, wander range (tiles), extra talk range
    alpha: 0.9, ignoresPlayer: true, // translucent; doesn't turn to look at you
    spectral: true, onFlash(npc, game) {},     // only visible in a camera flash; reacts to it
    dialog: { start, again, nodes },           // see below
    init(npc, game) {}, update(npc, dt, game) {}, draw(g, npc, t, game) {},
  },
},
```

Placement props override any of these per instance (`name`, `role`, `look`, `behavior`, `face`, `barks`, `dialog`, `roam`, `to`, `reach`) and add `ox`/`oy` (to sit someone in a chair that isn't centred on a tile) plus anything a dialog reads (the office's generic `coworker` reads `props.lines` and `props.linear`). Hairstyles: `short`, `long`, `bun`, `ponytail`, `curly`, `buzz`, `bald`. Held things: `mug`, `coffee`, `clipboard`, `tablet`, `phone`, `papers`. `pace` walks between home and `props.to: [dx, dy]` tiles; `wander` picks visible spots within `roam` tiles. Seated people get 18 units of extra talk range automatically, and only one person in a small group speaks at a time.

Behaviours: `LM.npcBehaviors.name = (npc, dt, game) => { npc.mx = ...; npc.my = ...; npc.wantFace = ...; }`. `npc.home`, `npc.mem` (scratch state), `npc.distP` and `npc.seeLos` are available.

**Dialog trees.**

```js
dialog: {
  start: 'hello',                    // or (game, npc) => node id
  again: 'menu',                     // used from the second conversation on
  nodes: {
    hello: {
      text: ['First paragraph.', 'Second.'],   // or a string, or (game, npc) => ...
      mood: 'smile',                 // portrait for this node
      flag: 'metMarisol',            // set when the node is shown
      do: (game, npc) => {},         // side effect when shown
      options: [                     // or () => [...] to rebuild each time
        { label: 'Where is it?', next: 'where', flag: 'asked' },
        { label: 'About the door…', next: 'door', if: (game) => game.hasFlag('doorAppeared'), once: true },
        { label: 'Never mind.', end: true },
      ],
    },
  },
},
```

`once` hides an option after it has been picked; `if` hides it until it applies. An option without `next` ends the conversation. A piece of furniture can hold a conversation too, by passing a speaker object to `LM.ui.dialog(game, speaker)` (the occupied stall does this). `LM.ui.portrait(look, mood, size)` draws a portrait canvas for any look.

### 6.12 Gadgets

Gadgets are tools that are always carried (no slot, no ammunition), shown as chips beside the weapon card with their key.

```js
gadgets: {
  phone: {
    name: 'Phone', short: 'Phone', key: 'KeyF',
    hint: (game, P) => 'click: photo · F: open',   // shown on the weapon card while it is held
    badge: (game, P) => unreadCount,                 // number on the chip
    use(game, P) {},                                 // key or chip pressed
    primary(game, P) {},                             // left click while it is held (unarmed)
    update(game, P, dt) {},
    mods: (P) => ({ lightRadius: 170 }),             // stat modifiers while carried, like armor
    drawHeld(g, P, game, t), drawGlow(g, P, game, t), drawIcon(g, W, H),
  },
},
```

`P.gadgets` lists carried ids; `P.hasGadget(id)`; `P.heldGadget()` is what's in hand when `P.isArmed(game)` is false (no weapons, or a floor with `armed: false`). `P.data` is free storage for packs and is saved; the phone keeps its state in `P.data.phone`. `P.addBuff(id, name, mods, seconds)` grants a timed modifier (the espresso).

### 6.13 The phone (Office pack)

- **Messages.** `LM.phone.send(game, thread, text, { replies })` delivers now; `LM.phone.later(game, seconds, thread, text, opts)` after a delay (dropped if the floor changes first). `replies: [{ label, then: { text, delay } }]` become buttons; picking one posts your reply and, optionally, theirs. Threads: `dana`, `calendar`, `unknown`, `team`, `mom`; add more to `LM.PHONE_THREADS` (`{ name, initials, color }`). Levels send messages with the `phone` trap effect.
- **Notes** shows the current objective (from story flags) and a to-do list that ticks itself off.
- **Map** draws what you've explored.
- **Photos.** A click takes a picture: a bright flash that lights the room for a moment, reactions from anyone nearby (`flashBarks`), and a caption. `spectral` NPCs are visible only during a flash, and their `onFlash` runs (the faceless figure steps closer each time).
- **Light.** A flashlight that adds to `lightRadius` and drains the battery faster.

### 6.14 Story flags used by the prologue

`readNote` (took the note), `wateredPlant`, `tookSalmon` (you are the lunch thief), `coffee`, `heardLine4`, `promisedReport`, `samComing`, `askedMarisol`, `doorAppeared`, `doorOpened`, `grandOpening`, `armed` (took the pistol). Later floors may read any of them.

---

## 7. Recipes

**A new enemy.** Add an entry to `enemies` with stats, an existing `ai` and `attacks`, and a `draw`. Give it a legend character in the level that uses it. If no existing attack fits, add one to `attacks` first (most new ideas are a parameter change: a fan of shots is `ranged` with `fan`; an exploding crawler is `melee` plus an `onDeath` that calls `LM.combat.explode`).

**A new weapon.** Add to `weapons` (and a projectile if it looks or behaves differently). Place it in a chest's `loot`, on a weapon rack (`{ item: 'weapon-rack', props: { weapon: 'id' } }`), or as an enemy drop (`{ id: 'weapon-pickup', props: { weapon: 'id' } }`).

**A new environment.** Add a palette to `environments` reusing existing painters; only write a painter when the material itself is new. Pick an ambient colour first: it sets the mood more than anything else.

**A new interactive object.** Add an item with `interact.use` that opens `LM.ui.open(...)`. Keep state on the item instance (`it.used`, `it.reserve`); re-open the pop-up to refresh it after a change.

**A new trap.** Tag the trigger tiles and the target tiles in the level legend, then add a `traps` entry. Only write a new effect type when combining existing ones can't express it.

**A new floor.** Copy a level file, set `order`, `environment` and `next` on the floor before it, draw the map, and add a `<script>` tag. Make sure every key the floor needs is reachable before its door, and that the exit is reachable.

**Rebalancing.** Change numbers in the pack files, or ship a small balance pack loaded last that redefines the same ids.

**A new person.** Add an entry to `npcs` with a look, a behaviour and a few barks, then a dialog tree. Start the tree with the question the player is carrying (on the 14th floor: where is the Linear Conference room?) and give each person one thing of their own to talk about. Place them through the objects layer; one generic definition with placement props (like `coworker`) covers a whole office of minor characters.

**A story beat.** Pick a flag name. Set it from a dialog option, an item's pop-up action or a trap. Then add a `flag` trap that runs the consequences with delays: messages, `flicker`, `quake`, `terrain`, `ambient`, `lights`, another `flag`. Let other conversations and objects check the flag with `if:` and in their text, so the world reacts.

**A peaceful floor.** Set `armed: false` and a `loadout`, use an objects layer for furniture and people, light it with `ceilingLights`, and finish it with an `outro`. Give it a `floorLabel` so it doesn't shift the maze's floor numbers.

**A new phone feature.** Add a tab in `render()` in `packs/office/phone.js` (the tabs are a plain list), keep its state in `P.data.phone`, and if it needs to act on the world, do it from `primary` or `update`.

---

## 8. Current content and numbers

### Weapons

| Weapon | Slot | Ammo (max) | Damage | Rate /s | Notes |
|---|---|---|---|---|---|
| Service Pistol | 1 | unlimited | 14 | 4.2 | accurate, the starting weapon |
| Scattergun | 2 | shells (48) | 7 × 8 | 1.35 | 300 range, 60% falloff, heavy knockback and shove |
| Rivet Gun | 3 | rivets (240) | 9 | 11 | spray with growing bloom |
| Arc Lance | 4 | cells (90), 3 per shot | 30 | 2.4 | pierces 3 enemies; refill at recharge stations |
| Ember Mortar | 5 | charges (14) | 12 + 72 blast (r 80) | 1.1 | bursts at the cursor or on contact; 35% self-damage |

### Enemies

| Enemy | HP | Speed | Behaviour | Attacks |
|---|---|---|---|---|
| Drowned Husk | 42 | 92 | chaser | melee 12 |
| Skitter | 16 | 178 | swarmer | melee 6 |
| Cult Gunner | 36 | 84 | skirmisher (150–270) | 3-round burst, 9 each |
| Brute | 170 (15% armor) | 68 | chaser | telegraphed charge 26 (stuns itself on walls), melee 22 |
| Ember Lobber | 52 | 62 | lobber (210–380) | arcing shell 28, radius 58, with landing marker |
| Sentry Turret | 75 (30% armor) | 0 | turret | 5-bolt burst, 10 each; explodes when destroyed |
| Gilded Warden | 130 (20% armor) | 76 | warden | shockwave 24 (radius 96) plus 8 shards; melee 14 |
| The Reliquary Keeper | 950 (25% armor) | 72 | boss | shockwave 28 (radius 132) plus 14 shards; 11-shard fan; charge 30; summons skitters; enrages below half health |

### Hazards

Pit: fall, 18 damage, climb out at the last safe spot. Spikes: 14 damage every 0.5 s while raised; a 2.4 s cycle raised for 1 s, rolling across a corridor as a wave and glinting red just before rising. Slag: 7 damage every 0.4 s and movement ×0.55. Darts: 10. Barrels: 60 in a radius of 78.

### Gear

Body: Oilskin Coat (+10% reduction, better swimming), Brigandine (+25% reduction, −14 speed), Aegis Harness (60 regenerating shield). Head: Miner's Lamp Helm (+140 light), Iron Sallet (+10% reduction), Gilded Circlet (+35% gold, +15 health). Feet: Runner's Boots (+26 speed, faster dash), Wading Boots (much better swimming). Trinket: Bandolier (+50% ammo), Warding Charm (25 regenerating shield), Ember Heart (+15% damage, −10 health).

Blessings: Iron Skin, Quickening, Vigor, Wrath, Far Sight, Deep Pockets.

Slot machine (per bet): three coins ×6, gems ×12, eyes ×16, crowns ×40, any two coins ×1.5, three skulls releases three skitters. Expected return is roughly 78%.

### The 14th floor (Office pack)

| Who | Where | What they're about |
|---|---|---|
| Marisol Reyes, front desk | Reception | Beleaguered and kind; every line on hold; line four is breathing. Calls you sweetheart. |
| Dana Whitlock, Director of Operations (your boss) | Paces the open plan; her office is in the executive suite | Status report. Gently. Like a hawk, but supportive. Texts you about it on every floor. |
| Priya Natarajan, product manager | Cantina, at the fridge | Her pad thai was stolen. Again. Gary is on every list. |
| Gary Pruitt, account executive | Cantina, at the microwave | His salmon has said 3:47 for twenty minutes. You can take it. |
| Tomas Ferreira, IT support | Cantina, at a table | The Wi-Fi works; your expectations don't. The oat milk is his. Notices the LINEAR network. |
| Kenji Watanabe, financial analyst | Open plan | Always on a call. |
| Brenda Okafor, People & Culture | Wanders the open plan | The fire-safety module is mandatory. Has a laminated floor plan that grows a door. |
| Sam Lin, intern | Reception | Nobody tells interns anything. Got a note too. |
| Lena, Marcus, Joy, Ravi, Hollis, Nadia | Desks in the open plan | One line each about "Linear". Ravi saw who left your note; Nadia knows the cost centre LINEAR-00. |
| Alan Mercer, VP Strategy, and six attendees | Vertex, mid-meeting | Only taking synergy questions. Was invited to Linear once, years ago. |
| A voice from stall three | Restroom | Got a note on Monday. Has been in there since Monday. |
| Echoes: Marisol?, Priya?, the wall-starers, the Temp, Sam, Dana | Past the door | What the floor remembers of them. |
| A figure | Past the door | Only the camera flash shows it. Each photo, it is a step closer. |

Interactive objects: your desk (the note, the plant), coworkers' desks, the copier, filing cabinets (the L drawer), water coolers, whiteboards and screens in each conference room, the company sign, elevators, framed pictures, the notice board, the fridge, the microwave, the espresso machine (+24 speed and a faster dash for 60 s), vending machines, taps, toilets, mirrors, the occupied stall, bookshelves, the globe, the door that wasn't there, a desk like yours, the plinth with the pistol, the brass plaque.

---

## 9. Art and interface direction

- **Look:** dark, warm and tactile. Each floor commits to one material and one ambient colour (teal stone, rust and ember, marble and gold). Darkness is the default; colour comes from the light sources.
- **Lit versus emissive:** anything that is a surface (floors, bodies, furniture) is drawn before the lightmap so it is only visible where lit. Anything that gives off light (flames, tracers, eyes, telegraphs, beams) goes in the emissive pass so it reads in the dark.
- **Telegraph colours:** red-orange means enemy danger, gold means the warden family and treasure, cyan means shield and water, violet means energy and magic.
- **Interface:** brass on ink. Big Shoulders Display for names and headings, IBM Plex Mono for numbers and labels, Spectral italic for anything written in the world (lore, altars), Major Mono Display only for the wordmark. Panels are thin brass-cornered plates; keep them small and keep the action visible behind them.
- **Writing:** in-world text is short, specific and slightly ominous, and it always carries a hint (where a key is, what not to touch). Interface text says exactly what will happen ("Take everything", "Recharge cells only").

---

## 10. Known limitations

- Keyboard and mouse only. No gamepad, no touch controls, no key rebinding.
- Balance has only been exercised by automated tests (every interaction, trap, door, weapon and enemy type, and a full run through all three floors), not by human playtesting.
- Moving lights (muzzle flashes, explosions, glowing projectiles) do not cast shadows; only static lights do.
- Enemies don't take cover, flank, or hear gunfire beyond the alarm effect and waking nearby friends.
- No reloading, no dropping or selling weapons, no way to remove gear except swapping or taking it off into the pack.
- One checkpoint per floor, stored in the browser.
- Sound is synthesised placeholder effects plus a drone; there is no music.
- Levels are hand-typed ASCII. There is no editor and no procedural generation yet.
- Fonts load from Google Fonts; offline, system fonts are used.
- NPCs don't pathfind: wanderers pick visible spots near home and pacers walk a straight line. Nobody follows you yet (Sam says he'll come, and doesn't).
- Conversations are written in code (JavaScript objects), not in a dialog editor or data file.
- The phone clock runs on real seconds from 9:52; the "you're late" text arrives at 10:00 if you're still on the 14th floor.
- The prologue has no fail state and nothing to collect except the note and the pistol; its pacing has only been checked by automated tests.
- Performance relies on a GPU-accelerated canvas. It is smooth in current Chrome, Edge, Firefox and Safari on ordinary hardware; very old integrated GPUs on 4K screens may struggle.

---

## 11. Backlog for the next iterations

Rough priority order. Sizes: S (an afternoon), M (a session), L (several sessions).

1. **Playtest and balance pass** (S–M). Enemy counts per room, ammo and health economy, altar prices, boss phases. Add a difficulty setting that scales `game.difficulty` (enemy health) and damage.
2. **In-browser level editor** (L). Paint tiles and items onto a grid, set tags and traps, export a level file. The single biggest multiplier for content.
3. **Gamepad and rebindable keys** (M). Twin-stick aiming; a settings pop-up (also screen-shake and flash toggles).
4. **Status effects** as a new registry kind (M): burning, poison, slow, stun, bleed; weapons and attacks apply them.
5. **More traps** (M): flame jets, collapsing floors, arrow turrets that track, rolling boulders, crushers, pressure plates that close doors behind you.
6. **Secrets** (S–M): shootable false walls, hidden switches, a secrets count on the floor summary.
7. **Elite modifiers** (M): any enemy can roll shielded, volatile, swift or vampiric, with a tint and a name prefix.
8. **A merchant room** (S): a gold sink beside altars and slots; sells ammo, gear, keys to optional vaults.
9. **Image-based art in packs** (M): let textures and sprites come from sprite sheets embedded as data URIs, alongside the procedural painters.
10. **Procedural floors** (L): a `generators` registry kind that builds a map (rooms, corridors, key-door ordering) from a seed, mixing hand-authored room templates.
11. **Music** (M): layered per-environment loops that intensify in combat.
12. **Run structure** (M): score, run timer, permadeath mode, unlocks between runs.
13. **Dynamic shadows** for a capped number of moving lights; normal-mapped walls (L).
14. **Accessibility** (S): shapes on keys and locked doors besides colour, a high-contrast HUD option, reduced flashing.
15. **NPC pathing and followers** (M): NPCs walk the flow field to a target; Sam actually follows you through the door; coworkers react to where you've been.
16. **Quests and objectives** (M): a small registry of objectives driven by flags, shown in the phone's Notes tab and on the floor summary (deliver the status report, find out who's been taking the lunches).
17. **More phone apps** (S–M): a voicemail from line four, a calendar that rewrites itself, a step counter that keeps counting floors down.
18. **Echoes in the maze** (M): coworker echoes and messages on the maze floors that respond to choices made on the 14th floor (the salmon, the plant, what you told Dana).

---

## 12. Prompting future iterations

Attach the source (or this spec plus the relevant pack files) and ask for content in pack terms. Examples:

> Add a content pack in `packs/catacombs/`: an environment called Catacombs (pale limestone walls, packed-earth floor, green fungal light), a Bone Archer enemy (ranged, keeps its distance, fires a 3-arrow fan) and a Grave Knight (slow, armored, a shockwave when you get close), a Sickle weapon (short-range melee arc as a wide, short-range pellet spread), and a fourth floor that uses them, placed after the Reliquary. Follow SPEC.md sections 6 and 7 and keep the Core pack untouched.

> Rebalance: the Rivet Gun is too strong and the Pistol feels weak. Ship the changes as a small `packs/balance-0.2/` pack loaded after Core.

> Add a trap effect `flames` (a jet from a wall emitter that burns along a line for 1.5 seconds) and use it twice on Floor 2.

> Build the in-browser level editor described in SPEC.md section 11, item 2.

> Add a peaceful floor in the style of the Office pack: a hospital night shift. Patients and nurses as NPCs with dialog trees, the phone as the only tool, and a lift that goes to a floor that doesn't exist. Follow SPEC.md sections 6.8 and 6.11–6.13 and the recipe "A peaceful floor".

> Make Sam follow the player through the door if they told him "Sure. Stay close." (`samComing`), and have him wait in the Linear Conference Room.

When content changes, update sections 3, 8 and 11 of this spec in the same pass.

Layouts with a lot of furniture are easiest to build with a small script that writes the two grids (the office was laid out in Python with helpers for rooms, desk pods and seats, then emitted as the level file) and then checked with a reachability pass from the start tile to every person and to the exit.

---

## 13. If the game moves to Godot later

The content is plain data plus small functions, so it maps cleanly onto Godot 4:

| Here | Godot |
|---|---|
| `LM.definePack` registries | Custom `Resource` types (`WeaponData`, `EnemyData`, `ItemData`...) loaded from folders, or JSON imported into them |
| ASCII map + legend | `TileMapLayer` with a `TileSet`; legend characters become tile ids plus spawned scenes for items and enemies |
| Static lights with visibility polygons | `PointLight2D` with shadows, `LightOccluder2D` on walls and pillars |
| Line-of-sight mask | A `PointLight2D` on the player with shadows, plus a `CanvasModulate` for ambient darkness |
| Flow-field navigation | `NavigationAgent2D`, or keep the flow field in GDScript (it is about 60 lines) |
| Behaviours and attacks | A small state machine per enemy scene, with attack scripts as `Resource`s |
| Pop-ups | `Control` scenes |
| NPC dialog trees | Dialogue resources (a dialogue plugin, or the same node graph as a `Resource`) |
| Story flags | An autoload singleton holding a `Dictionary` of flags, saved with the run |
| Objects layer | A second `TileMapLayer` used only for spawning scenes, or scenes placed directly in the level scene |
| Synth audio | Pre-rendered sound files, or `AudioStreamGenerator` |

The browser build would then come from Godot's web export, which is heavier to load than the current version but gives editor tooling for levels.

---

## 14. Iteration 0.3 additions: the Memos and Chessboard packs

Two packs loaded after the Office pack. Neither edits engine, Core or Office files. `HANDOFF.md` lists every point where they depend on those files.

### 14.1 Memos (`packs/memos/`)

Additions to the 14th floor, placed when the floor loads (`placements.js`, tile coordinates) rather than by editing its map.

| Piece | Item | What it does |
|---|---|---|
| Motivational posters | `memo-poster` `{ poster }` | 14 bland posters in conference rooms, halls, reception and the Cantina. E opens the poster: a geometric picture (`POSTER_ART`), a spaced title, a tagline. |
| Notices | `memo-notice` `{ notice }` or `{ arrow, title, text }` | Parking, punctuality, harassment-prevention and cybersecurity training, IT policy. A seal marks Management notices and a pushpin marks employee ones. Arrow notices also tape an arrow to the floor. |
| Message board | `memo-board` `{ board, w }` | The Cantina's board: nine notices (coffee area, fire drill, bowling league, kittens…) as coloured cards with the same symbols. |
| Security cameras | `memo-camera` `{ corner }` | In room corners, with a blinking light. On an honest floor they turn to follow you. |
| Desk toys | `desk-toy` `{ toy }` | Scattered over about three ordinary desks in ten: succulent, globe, Newton's cradle, puzzle cube… |
| Email | hooks `my-desk` | "Check email" opens an inbox. On the 14th floor: the compiled TPS report, and Alice's goodbye. Alice quit yesterday; her goodbye to Bob is a substitution cipher of "The Jabberwock, with eyes of flame…", plus jokes about her private key and her one-time pad. |
| Alice's old desk | `alice-desk` | Workstation 14-113, next to yours. Search it for her "one-time pad" (the plaintext, written down) and Bob's private key (a real key). With the email read, "Oh! That's what she meant!" |
| Scores | `scores.js` | NOTICE, MESSAGE and EMAIL SCORE in the top-right corner, saved with the run (`P.data.memos`). Notices: 10 each. Phone messages: 10 each, once read. Emails: 25–50 each, plus 100 for decrypting Alice's. |

Every poster, notice and toy has an `honest` version in `content.js`, used on floors with `honest: true`.

**Recipes**
- *A new poster:* add an entry to `MEMOS.posters` (pick an `art`, or add a drawing to `POSTER_ART`) and a placement line.
- *A new notice:* add an entry to `MEMOS.notices` and either a placement line or an id in `MEMOS.boards`.
- *A new email:* add it to `MEMOS.emails` and its id to `MEMOS.inboxes[levelId]`.

Check placements with `node tools/memos/check-placements.mjs`.

### 14.2 Chessboard (`packs/chessboard/`, `levels/04-chessboard-one.js`)

**The Office on Chessboard 1** (order 4, after the Reliquary). It is the 14th floor again, one level of reality down, after JAGS Wonderland's chessboards.

Everything looks a little off:
- The environment `chessboard-office` is `office` with every colour nudged.
- The windows look out on a chessboard.
- The big plants bite.

Everyone is the real version of themselves, built from the Office pack's definitions (same looks):
- Marisol is a containment protocol.
- Priya forks the salmon thief (`tookSalmon`).
- Tomas sees every screen.
- Kenji has been on mute since 1994.
- Alan is in a meeting with himself.

On this floor (`honest: true`):
- Posters are demotivational.
- Notices are overly honest: threats about the kitchen, harassment training as a cover-up manual, cybersecurity as workplace surveillance, a bounty on mouse movers.
- Desk toys belong to their owners: Hollis's guillotine, Marcus's cannon (it fires), Joy's flytrap, Nadia's trebuchet.

**Three tasks before 5:00 PM** (`workday.js`). They arrive by phone, with details in a desk email. The clock runs at `CONFIG.minutesPerSecond` (0.5 by default: 16 minutes). At 5:00 the floor restarts, keeping finished tasks.

1. **Status meeting** (`meeting.js`) in Zeno's Paradox. The other conference rooms are the Riemann Room and Room √−1.
   - The door locks. Dana asks each attendee for a report and shoots them for poor performance. They regenerate in their seats a minute later.
   - Then she asks whether you are caught up on email (you need the TPS report) and what Alice's goodbye said. With `aliceDecrypted` you pick the poem. Otherwise you type a guess.
   - A wrong guess gets you shot, and the run starts over (`CONFIG.failRestartsRun`).
2. **Daily report module** in the server farm.
   - A new door in reception's east wall leads to the east wing: a back hall, three union brooms on strike, Records (Doug, lost since 2009), the Supply Desk and closet, the lounge, two more lost offices, and the Loop.
   - Gertrude guards the supply closet from her desk (`supply-clerk`, behaviour `desk-sitter`) and only gets up if you go in.
   - The lounge (Hilbert's Hotel) has the Vend-O-Matic: health 30, ammunition 25, +20 max health 150, hints 5.
   - Arrow notices lead clockwise round the Loop. Five zone checkpoints (`cb-arrow`), taken in order, open a door into the farm (`cb_serverDoor`); skipping one resets the count.
   - Kevin, inside the farm's door, blocks the way until tasks 1 and 3 are done, then explains: the terminal moved to the far corner, and Bob is in a mood.
   - **Bob, the SYSADMIN** (`cb-bob`) is large, with cables and long arms. He only moves, reaches and strikes as fast as you move. He plans a path over grid corners where a 2 × 2 block is open, so he can't fit through the farm's one-tile gaps. The terminal's corner can only be reached through those gaps.
   - Give Bob his private key (`bobKey`, from Alice's desk) and he stands down.
   - The terminal (`cb-terminal`) runs the report and ends the floor.
3. **Mandatory Workplace Surveillance Training:** Brenda's three-question quiz in the Training Room (formerly the Quiet Room).

**New trap effects:** `cb-arrow { n, of }`, `cb-meeting`, `cb-wake`.

**New level fields** (read by these packs only):
- `honest`
- `bobArea: [x, y, w, h]`
- `techAside: [x, y]`

The map comes from `node tools/chessboard/build-layout.mjs`, which copies the 14th floor's office at the same coordinates, adds the east wing, and checks that the player can reach everything and Bob can't reach the terminal.

---

## 15. The editor and the editor pack

`editor/index.html` is a point-and-click editor for everything in sections 6 to 8 (see `editor/README.md` for using it). It loads the game itself into a hidden frame, reads the registry, and draws with the real engine. Its changes never touch pack files: they are saved as a pack of their own, loaded after every other pack and level, just before `LM.boot()`:

```html
<script src="packs/editor/runtime.js"></script>   <!-- applies the edits; ships with the editor -->
<script src="packs/editor/sprites.js"></script>   <!-- imported pictures, as data URLs -->
<script src="packs/editor/edits.js"></script>     <!-- generated: one LM.editor.apply({...}) call -->
```

Remove those three lines and the game runs exactly as it did without the editor.

### 15.1 The edit set

```js
LM.editor.apply({
  add:    { enemies: { 'bone-archer': { name, hp, ... }, 'husk-elite': { $extends: 'husk', hp: 90 } } },
  patch:  { items: { altar: { abilities: [...], popup: {...} } }, levels: { 'sunken-cloister': { map: [...], legend: { B: {...} } } } },
  remove: { levels: ['gilded-reliquary'] },
  levelOrder: ['meridian-fourteen', 'sunken-cloister', ...],
  player: { base: { maxHp: 150 }, start: { gold: 50, weapons: ['pistol'] }, ammoMax: { shells: 60 } },
  knobs:  { 'CHESSBOARD.CONFIG': { minutesPerSecond: 1 } },
});
```

- **add** registers new content. `$extends: 'id'` copies an existing definition (code included, by reference) and merges the entry into the copy. Copies resolve against the original, before patches.
- **patch** merges changed fields into the registered definition, in place. Plain objects merge key by key; arrays, functions and values replace; `'$unset'` deletes a key; an object with `$replace: true` replaces wholesale (used for changed legend entries).
- **remove** deletes ids from the registry. Blessings marked `hidden: true` stay in the registry but are left out of enumeration, so altars don't offer them.
- **levelOrder** sets each level's `order` and `next`; the last one has no `next`, so finishing it is the victory.
- **player.base** is merged into `LM.PLAYER_BASE`, **ammoMax** into `LM.AMMO_MAX`. **player.start** (weapons, ammo, gold, equip, bag, blessings, gadgets, flags, radius) is given to the player of a new run. A first floor's own `loadout` still replaces weapons, gadgets and gold afterwards.
- **knobs** are merged into objects under `LM` by path (arrays replace).

Functions in the edit set are written as code in `edits.js`. They run with these names in scope: `LM U T G AI h eyes lunge flame has flag wallRot rot ROT` (`LM.editor.helpers`). Each one is guarded: an error is logged once and the frame carries on.

### 15.2 Data fields the editor pack understands

These turn data into behaviour, so new content needs no code. They work on any definition, new or patched.

**`look`** (items and monsters; people take the `sprite` type only). Replaces `draw` and `drawGlow`.
- `{ type: 'creature', shape: 'humanoid' | 'brute' | 'beast' | 'insect' | 'blob' | 'floater' | 'turret', body, outline, head, limbs, eyes, glow, accent, extras: ['gun', 'blade', 'staff', 'armor', 'shell', 'spikes', 'horns', 'tail', 'tentacles', 'wings', 'cloak'], armsForward }`
- `{ type: 'object', shape: 'box' | 'chest' | 'orb' | 'pedestal' | 'altar' | 'crystal' | 'barrel' | 'bottle' | 'coin' | 'gem' | 'scroll' | 'book' | 'machine' | 'statue' | 'plant' | 'rune' | 'sign', color, trim, accent, glow, glowSize, scale }`
- `{ type: 'sprite', sprite: 'id in sprites.js', size, facing: 'right' | 'up' | 'left' | 'down', rotate, glow, eyes, bob }`

**Effects**, run by abilities, pickups, breaking and deaths: a list of `{ type, ...settings, delay }`.

| Type | Settings |
|---|---|
| `heal`, `hurt`, `shield` | `amount` |
| `gold` | `amount` (negative takes gold) |
| `ammo` | `ammo` (`'current'` or a type), `amount`, `fraction` (of a full load) |
| `weapon`, `armor` | `id` |
| `key` | `color` |
| `item` | `id`, `count`, `props` (dropped beside the item) |
| `loot` | `table` |
| `blessing` | `id` (`'random'` picks one the player can still take), `pool: [ids]` |
| `buff` | `name`, `mods`, `seconds` |
| `spawn` | `enemy`, `count`, `radius`, `at: 'item' | 'player'` |
| `explode` | `radius`, `damage`, `at`, `color` |
| `message` | `text`, `kind` |
| `text` | `title`, `text`, `kicker` (opens a page and closes the pop-up) |
| `textCycle` | `title`, `texts: []` (the next one each time; the vending machine's hints) |
| `flag`, `sound`, `quake` | `name`, `name`, `strength` |
| `sparkle`, `flash` | `color`, `count` / `color`, `radius`, `time` |
| `teleport` | `tag` (the first tile with the tag) |
| `trap` | `effect` plus that trap effect's settings (any of section 6.8) |

Result texts can use `{healed} {gold} {blessing} {blessingDesc} {ammo} {item} {buff} {shield}`. An effect setting can come from the placed item's props: `fromProps: { amount: 'heal' }`.

**`abilities`** (items): a pop-up of choices, drawn like the altar's.

```js
popup: { kicker, title, text, prompt, leave, dimWhenUsed },
abilities: [{
  label, desc, cost, costProp: 'tithe', limit, limitProp: 'uses', usedText,
  requires: { hurt: true, flag, notFlag }, pick: 'random' | 'all', flag,
  outcomes: [{ weight, text, kind: 'good' | 'bad', sound, effects: [...] }],
}]
```

A placed item's `title`, `deity`, `name` and `text` props override the popup's. The editor shows the altar, healing font, espresso machine and Vend-O-Matic as abilities; changing one makes the game use this pop-up instead of the built-in one.

**`touch`** (items): a pickup. `{ effects, text, float, needsHurt, flag }`, with `magnet` for the pull.

**`readable`** (items): `{ title, text, kicker, flag }`.

**Breaking** (items): `destructible: { hp }` with `breakLoot: tableId` and/or `breakEffects: [...]`. An item's own `onBreak` still runs unless `breakKeepOriginal: false`.

**`deathEffects`** (monsters): effects run when it dies.

**`slots`** (items): a slot machine with an editable paytable. `{ bets, intro, pair: { symbol, count, pay }, symbols: [{ id, name, weight, pay, color, glyph, sprite, effects, text, kind, close }] }`. The five core symbols keep their drawings.

**`data`** (loot tables): `{ always: [entry], groups: [{ chance, picks, options: [{ weight, entries: [entry] }] }] }`. Amounts can be `[min, max]`; `{ type: 'ammo', ammo: 'carried' }` picks a type the player's weapons use.

**Picture tiles** (environments): `floor: { style: 'image', images: [ids], tint, grout }` and `wall: { style: 'image-wall', topImage, faceImage, ...the usual wall colours }`. Keep the usual colour keys: pillars and doors read them.

### 15.3 How the map editor writes levels

The map editor keeps each tile as a legend entry (terrain, variant, tag, start, and at most one item, enemy or NPC) plus an optional objects-layer entry. Untouched tiles keep their characters; a changed tile reuses a character whose entry matches, or gets a new one in the level's own `legend` (or `objectLegend`). A changed level is saved as a patch with the full `map` (and `objects`) plus the legend entries it added or changed. Characters the editor added and no longer uses are dropped.

---

## 16. Apartment (Chessboard 0)

`packs/apartment/` and `levels/apartment-chessboard-zero.js`. It is the first floor of a run (`order: -1`, `floorLabel: 'Chessboard 0'`, peaceful, phone only). Its stairs down are roped off until the story flag `timeToLeave` is set; then they lead to the 14th floor.

- **The hall.** 6:30 PM. You arrive by the stairwell; the elevators are OUT OF ORDER. Five neighbors' doors (`apt-neighbor` `{ unit, openFlag?, knock?, knob? }`) offer Knock ("No one seems to be home.") and Try the knob (locked). Your door, 7C, is painted blue with a brass number and has a welcome mat outside.
- **Unit 7C.**
  - Kitchen: fridge (get something to eat), counters, sink, oven, a microwave on the counter, the red rotary phone (section 17), and the kitchen table with your laptop (email and chat; Alice is away).
  - Living room: sofa and TV (watch TV), entertainment center, armchair, plants, a bookshelf of annotated titles, a garage-sale Dreamcast with 90s games, and the coffee table with *Architecture Times*.
  - Short hall and guest bath.
  - Bedroom: bed (relax), dresser, nightstands, a clock radio stuck at 6:30, and a closet of hanging clothes.
  - Master bath: toilet, shower, sink.
  - Garage-sale landscapes and cities on the walls.
- **Where the text lives.** All of it is in `content.js`: `BOOKS`, `GAMES`, `CHANNELS`, `FRIDGE`, `NEIGHBORS`, `RADIO`, `MAGAZINE`, `CHATS`, `EMAILS`. Items are in `items.js`; several reuse an Office drawing with new interactions (`from(id, changes)`).
- **The environment.** `apartment` has hall carpet, wood, kitchen tile, bathroom tile, bedroom carpet and stairwell concrete. The terrain `apt-door-mine` is the 7C door.

`HANDOFF.md` lists the tags and flags available for events.

---

## 17. Red rotary phones

`packs/rotary/rotary.js` adds one red rotary phone to every floor, when the floor loads:
- on its own little desk near where you arrive;
- at home, on the kitchen counter, with the note "It was here when I got the apartment."

Each phone has a 7-digit number, shown on a label on the phone.
- Dialing another phone's number teleports you to that floor, standing beside its phone, carrying everything, as the stairs would.
- Dialing the phone's own number gets a busy signal.
- Any other number gets nobody, or someone saying something odd. The same number always gets the same answer.
- Numbers you have seen are listed beside the dial.

The data:
- `LM.ROTARY.LINES` maps each `levelId` to `{ number, x, y, counter?, note? }`. A floor without an entry has no phone.
- `LM.ROTARY.ANSWERS` is a list of `{ who?, text }`.
- `LM.ROTARY.SPECIAL` maps particular numbers to their answers.

The item is `rotary-phone` (props `counter`, `note`). The flags are `rotaryUsed` and `rotaryTravel`.

---

## 18. Dressings

Dressings are furniture and fixtures placed over tiles: desks, tables, counters, pillars, lamps, pictures. They are ordinary items, so they can be solid, light up, or be used by the player. Some examples by set:
- **Office:** desks, counters, copiers.
- **Apartment:** bed, TV, oven.
- **Core:** tables, benches, torches.
- **Memos:** posters and notices.

**In the editor.** The map palette has a **Dressings** tab. It lists every dressing from every pack ("set") at once, so any floor can use any set's furniture, whatever its tile set.
- Filter by set (All sets by default), by kind (Furniture, Walls, Lights, Decor) or by name.
- Furniture with a front turns to the chosen facing (`props.dir`); `[` and `]` turn it.
- Entries the player can use are marked ●.

**What counts as a dressing.** Every item, except:
- pickups and chests;
- keys, gold, health and ammunition;
- trap hardware;
- invisible helpers.

An item can decide for itself with a `dressing` field: `'Furniture'`, `'Walls'`, `'Lights'`, `'Decor'`, `true` (work out the category), or `false` (never). The item page's **Basics → Dressing** sets it. Without the field the category comes from the item:
- **Walls:** wall-mounted.
- **Lights:** gives light and doesn't block.
- **Furniture:** blocks movement.
- **Decor:** everything else.

The game itself doesn't read the field.

**Generic dressings.** `packs/dressings/dressings.js` adds dressings that suit any floor:
- `dress-pillar`: a pillar standing on a floor tile, so the tile stays floor. It takes `shape: 'round' | 'square'`, `size` (radius in units) and `color`; the color defaults to the floor's wall color.

The editor side is `editor/js/dressings.js` (the catalog) and the Dressings tab in `editor/js/mapedit.js`.

## 19. The evening, Home (Chessboard 1), and the Library Maze

**Story (packs/apartment/story.js).** A level can opt in with fields the story reads:
- `dinner: true` (the apartment): the dinner tasks and the two phone calls.
- `warped: true` (Home on Chessboard 1): the apartment's things read their words from `APT.WARPED` (`BOOKS`, `BOOKS_TEXT`, `CHANNELS`, `RADIO`, `RADIO_FACE`, `MAGAZINE`, `LAVA`, `FRIDGE_TEXT`, `OVEN_TEXT`, `NEIGHBORS`), the lights in each room dim at random, and the clock radio blinks.
- `noSignal: true`: the cell phone shows "No signal" instead of opening.
- `leaveFlag`: the flag that opens the roped-off stairs (tag `aptStairsDown`); the default is `timeToLeave`. Home on Chessboard 1 uses `libraryDone`.
- `exitTo` (any level): where the floor's stairs or exit lead, even after the editor's floor order has rewritten `next`. `exitIntro`: shown instead of the next floor's intro on the way out.

Tasks are shown under the scores with `MEMOS.hudLines`. The order of events, and every flag, is in `HANDOFF.md` ("The evening, Home (Chessboard 1), and the Library Maze").

**Phone calls (packs/rotary).**
- `LM.ROTARY.ring(game, { notice, answer, who, thought, onAnswer })` rings the floor's red phone until it's answered; `answer` paragraphs are split on blank lines.
- `LM.think(game, text)`: a thought, shown as a notification in italics.
- A line in `LM.ROTARY.LINES` may have `requires` (flag), `busy` ({ text, thought, flag, until }) and `pickup` (text; `**bold**`).

**Neighbor doors that lead somewhere.** `apt-neighbor` with `props.leadsTo: '<level id>'`: Try the knob opens the door and offers to go in. Arriving back from a floor whose id starts with `library` places you outside that door.

**Library pack (packs/library).**

| Id | Kind | Notes |
|---|---|---|
| `library`, `library-lower` | environment | Floor variants: 0 carpet, 1 wood (the stacks), 2 marble. Walls use the `bookcase` texture. |
| `lib-pillar`, `lib-exit-7f` | terrain | A marble pillar; the exit home (a door marked 7F, seen from inside). |
| `lib-table` | item | `w` (tiles), `dir` (`e`/`w` runs north-south), `lamp`. |
| `lib-cart`, `lib-shelf`, `lib-catalog`, `lib-desk` | item | Book cart; free-standing shelf; card catalog (cards in `LM.LIBRARY.CARDS`); circulation desk with a bell (`w`). |
| `lib-knowledge` | item | KNOWLEDGE IS POWER: `heal` (50), `damage` (extra damage multiplier, 0.6), `time` (30 s). Once. |
| `lib-quiet` | item | QUIET PLEASE: wall sign; `rect` [x, y, w, h] in tiles; `damage` per shot fired inside. |
| `librarian` | enemy | 170 HP. Melee slam (24) or three thrown books (11 each). Behaviour `librarian`. |
| `bookworm` | enemy | 14 HP, fast. Divides now and then (two generations at most; at most 14 on a floor). |
| `overdue-ghost` | enemy | 40 HP, flying. Behaviour `swooper`: circles, then charges (14); touching you costs 7. Drops gold. |
| `thrown-book` | projectile | The Librarian's. |

Levels: `library-1` (Library Maze 1) and `library-2` (Library Maze 2, the Lower Stacks), in `levels/library-maze.js`.

## 20. The morning after, the town, and the Maze of Forking Paths

**Level fields the town reads**
- `town: { id, name, in, notHere, after? }`: a place on the Town Map. `id` is its pin in `TOWN.PLACES`. Once every room has been visited: "ALICE is NOT `in`." (with `notHere` as the text). `after` is a flag that must be set first.
- `alice: true`: shows the task Rescue Alice (once `aliceCalled` is set).

**Town Map** (`packs/town/map.js`): `TOWN.PLACES` = [{ id, level, name, sub?, note, x, y (on a 1000 × 640 map), links }], `TOWN.START`, `TOWN.PLAQUE`, `TOWN.reachable(game, place)`, `TOWN.openMap(game)`.

**Town pack (packs/town)**

| Id | Kind | Notes |
|---|---|---|
| `town-coffee`, `town-books`, `town-books-cb2`, `town-shop`, `town-park`, `maze-sandstone`, `town-map` | environment | Floor variants are listed at the top of `packs/town/environment.js`. |
| `grass`, `hedge`, `sandstone` | texture | A floor, and two wall painters. |
| `hedge-wall`, `door-stone`, `sphinx-gate`, `red-tile` | terrain | `door-stone` needs the Stone Key (key color `stone`). |
| `town-door` | item | Back to the Town Map (`to`, `label`). |
| `town-prop` | item | One item, many kinds of furniture (`kind`; `TOWN.KINDS`). `title`/`text` make it lookable. |
| `town-pennant`, `town-newspaper`, `town-search` | item | A pennant; a newspaper (`headline`, `text`); the invisible search helper. |
| `canopic-jar`, `sarcophagus`, `stone-coffin`, `sphinx`, `fire-jet`, `rockfall`, `spike-wall`, `chalice` | item | The maze's pieces: see the top of `packs/town/maze.js`. |
| `nancy-pace`, `barista`, `nook-clerk`, `nook-browser`, `nook-cat`, `gas-clerk`, `sundial-stranger`, `town-person`, `maze-merchant` | npc | `town-person` takes `lines: [[question, answer], …]`. Behaviours `seek-player`, `wait-for-player`. |
| `printing-press`, `minotaur`, `organ`, `skeleton`, `bone-pile`, `bone-crawler` | enemy | Behaviours `leaper` and `burst`. |
| `bone-wand` | weapon | Area blast, unlimited. |
| `bone-armor` | armor | `maxShield: 50`, no regeneration. |

Levels: `town-map`, `town-coffee`, `town-booknook`, `town-booknook-cb2`, `town-gas`, `town-park`, `town-movie`, `town-hospital`, `town-headshop`, `town-vhs`, `town-donuts`, `town-police`, `maze-forking-paths`.
