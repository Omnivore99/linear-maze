# Monster sprite sheets for The Linear Maze

A sprite sheet is one PNG with every frame of a monster's animations laid out on a grid. In the editor, open the monster, go to **Look**, pick **A sprite sheet (animated)**, and **Import a sprite sheet…**. The game plays the right row for what the monster is doing.

## The files in this folder

| File | What it is |
|---|---|
| `monster-sheet-64.png` | The template for most monsters: 64 × 64 pixel frames, 8 columns × 5 rows (512 × 320). |
| `monster-sheet-128.png` | The same layout with 128 × 128 frames (1024 × 640), for big monsters and bosses. |
| `monster-sheet-4dir-64.png` | Four-direction layout: each animation has four rows (down, left, right, up), 512 × 1280. |
| `example-beetle-64.png` | A finished sheet drawn on the 64 px template. Import it to see everything working. |

## The layout (the usual one: seen from above, the game turns it)

The game is seen from directly above, and monsters turn to face where they're going. So you draw each frame **once, facing right**, and the game rotates it.

| Row | Animation | Frames | Speed | Plays when |
|---|---|---|---|---|
| 1 | idle | 4 | 6 a second | standing still |
| 2 | walk | 6 | 10 a second | moving (it speeds up when the monster runs) |
| 3 | attack | 6 | (timed to the attack) | attacking. Frames 1–3 play during the wind-up, the blow lands on **frame 4 (HIT)**, frames 5–6 are the recovery |
| 4 | hurt | 2 | 12 a second | for a moment after it's hit |
| 5 | death | 6 | 10 a second | when it dies. The last frame stays on the floor for 6 seconds, then fades |

Columns beyond an animation's frame count stay **empty** (transparent). The numbers above are the defaults; you can change any row, frame count or speed in the editor, and set an animation to 0 frames if your sheet doesn't have it.

## Best practice

**Size and grid**
- Use 64 × 64 frames for ordinary monsters and 128 × 128 for big ones or bosses. Keep every frame the same size and the whole sheet an exact multiple of the frame size (the editor warns you if it isn't).
- Export a **transparent PNG** (RGBA). Don't flatten onto a coloured background, and don't leave the guide visible.

**Inside each frame**
- **Centre the body on the pink cross.** The cross is the monster's position in the game, and the point it turns around.
- **Keep everything inside the blue dashed circle** (the safe area). When the game turns the monster, the corners of the square are cut off.
- **The green circle is the body**, roughly what bullets hit. Make the solid part of the monster about that size; claws, jaws, tails and wings can reach out to the blue circle.
- **Face right** (the orange arrow), except in the four-direction layout, where each row faces the way its label says.
- Keep the monster the **same size and in the same place** from frame to frame, so it doesn't wobble. Only the moving parts should move.

**Style that reads in the game**
- Draw it **from directly above**: no perspective and no visible side, the way the game's other monsters look.
- Give it a **dark outline** (1–2 px at 64 px frames). The dungeon is dark, and the outline keeps the silhouette readable.
- **No ground shadow** (the game draws one) and **no glow painted in** (use the editor's Glow and Glowing eyes settings, which light up in the dark).
- Light it from the **top left**, softly, so it matches the other sprites.
- A strong, simple silhouette matters more than detail: the sprite is usually shown 30–60 pixels across on screen.

**Animation**
- **Idle**: a small loop, such as breathing or a twitch. The last frame should lead back into the first.
- **Walk**: one full stride, looping.
- **Attack**: three frames of wind-up (rearing back, jaws opening), the strike on frame 4 (the furthest reach, which is when the game deals the damage), then two frames back to rest.
- **Hurt**: a recoil. A flash of a lighter colour on the first frame works well.
- **Death**: ends on a still body that looks fine lying there for a few seconds.

**Pixel art**: draw at the frame size itself (don't scale up), and tick **Pixel art** in the editor so the pixels stay sharp.

## The four-direction layout

For characters drawn at a slight angle (like a classic RPG) instead of straight down: choose **Four directions** in the editor and use `monster-sheet-4dir-64.png`. Each animation has four rows in the order **down, left, right, up**: idle in rows 1–4, walk 5–8, attack 9–12, hurt 13–16, death 17–20. The game picks the row for the direction the monster faces and doesn't rotate it.

## Using an image generator

The Look tab has a **Making a picture for it** box with a ready-written prompt. With a sprite sheet selected, it asks for this exact grid. Generators often get the grid slightly wrong, so check the result over the template, and fix spacing in an art program if you need to, before importing.

## Where the sheet ends up

The editor saves imported sheets inside `packs/editor/sprites.js` (as data), so the game, the single-file build and the GitHub Pages site all carry them. Keep sheets small: a 64 px sheet is usually 30–100 KB. The settings are saved with the monster in `packs/editor/edits.js` as its `look`:

```js
look: {
  type: 'sheet', sprite: 'beetle-sheet', frame: [64, 64], size: 34, layout: 'rotate', facing: 'right',
  anims: { idle: { row: 0, frames: 4, fps: 6 }, walk: { row: 1, frames: 6, fps: 10 },
           attack: { row: 2, frames: 6, fps: 12, hit: 3 }, hurt: { row: 3, frames: 2, fps: 12 },
           death: { row: 4, frames: 6, fps: 10 } },
}
```

Rows and frames count from 0 in the settings, so frame 4 (HIT) is `hit: 3`.
