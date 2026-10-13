/* Linear Maze Editor — js/ai.js
 * Asking Claude to make or change monsters, items, floors and tile sets, and to
 * draw things in code. A request goes straight to the Anthropic API (with a key from
 * Settings), or is copied for pasting into Claude, with the reply pasted back. Either
 * way the answer is a JSON block the editor checks, previews and applies as an
 * ordinary, undoable change.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model;
  const AI = (ED.ai = {});

  AI.MODELS = [['claude-sonnet-5-5', 'Claude Sonnet 5.5 (fast, good)'], ['claude-opus-5-5', 'Claude Opus 5.5 (best)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (quickest)']];
  let session = null;
  AI.settings = function () {
    const s = ED.store.get('ai', {}) || {};
    if (!s.key && session) s.key = session;
    return Object.assign({ model: 'claude-sonnet-5-5', maxTokens: 16000, remember: true }, s);
  };
  AI.saveSettings = function (s) {
    const copy = Object.assign({}, s);
    if (copy.remember === false) {
      session = copy.key;
      delete copy.key;
    }
    ED.store.set('ai', copy);
  };

  // ------------------------------------------------------------ the API
  AI.call = async function (system, user, onText, signal) {
    const s = AI.settings();
    if (!s.key) throw new Error('No API key yet. Add one in Settings, or use “Copy the prompt” and paste it into Claude.');
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: s.model, max_tokens: s.maxTokens || 16000, system, messages: [{ role: 'user', content: user }], stream: true }),
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new Error('Couldn’t reach the Anthropic API (' + e.message + '). Check the connection, or use “Copy the prompt” instead.');
    }
    if (!res.ok) {
      let msg = res.status + ' ' + res.statusText;
      try {
        const j = await res.json();
        if (j.error && j.error.message) msg = j.error.message;
      } catch (e) {}
      throw new Error('Claude didn’t answer: ' + msg);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', text = '', stop = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          let data;
          try {
            data = JSON.parse(line.slice(5));
          } catch (e) {
            continue;
          }
          if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') {
            text += data.delta.text;
            if (onText) onText(text);
          } else if (data.type === 'message_delta' && data.delta) stop = data.delta.stop_reason;
          else if (data.type === 'error') throw new Error('Claude stopped: ' + ((data.error && data.error.message) || 'error'));
        }
      }
    }
    if (stop === 'max_tokens') text += '\n\n[The answer hit the length limit. Raise “Longest answer” in Settings, or ask for something smaller.]';
    return text;
  };
  AI.test = async function () {
    const t = await AI.call('Reply with the single word: ready', 'Are you there?', null);
    return t.trim().slice(0, 40);
  };

  // ------------------------------------------------------------ context
  /** A section of SPEC.md by its heading number ("6.5"). */
  AI.spec = function (num) {
    const s = ED.engine.spec || '';
    const re = new RegExp('^###? ' + num.replace('.', '\\.') + '\\b[^\\n]*$', 'm');
    const m = re.exec(s);
    if (!m) return '';
    const rest = s.slice(m.index + m[0].length);
    const next = rest.search(/^#{2,3} \d/m);
    return (m[0] + rest.slice(0, next < 0 ? rest.length : next)).trim();
  };
  const listOf = (kind, extra) => M().ids(kind).map((id) => {
    const d = M().raw(kind, id);
    return '- ' + id + (d.name ? ' — ' + d.name : '') + (extra ? extra(d) : '');
  }).join('\n');
  const defText = (kind, id) => ED.ser.js(stripMeta(M().raw(kind, id)), 0);
  function stripMeta(d) {
    const o = Object.assign({}, d);
    delete o.id;
    delete o.pack;
    return o;
  }
  const EDITOR_DATA = [
    'EDITOR DATA FIELDS (the editor pack turns these into behaviour, no code needed):',
    '- look (monsters and items): drawn from parameters instead of draw code.',
    '  Monster: { "type": "creature", "shape": one of ' + JSON.stringify(['humanoid', 'brute', 'beast', 'insect', 'blob', 'floater', 'turret']) + ', "body": "#hex", "outline", "head", "limbs", "eyes", "glow", "accent", "extras": subset of ' + JSON.stringify(['gun', 'blade', 'staff', 'armor', 'shell', 'spikes', 'horns', 'tail', 'tentacles', 'wings', 'cloak']) + ', "armsForward": bool }',
    '  Item: { "type": "object", "shape": one of ' + JSON.stringify(['box', 'chest', 'orb', 'pedestal', 'altar', 'crystal', 'barrel', 'bottle', 'coin', 'gem', 'scroll', 'book', 'machine', 'statue', 'plant', 'rune', 'sign']) + ', "color", "trim", "accent", "glow", "glowSize", "scale" }',
    '- effects: a list of { "type": ..., settings } run by abilities, pickups, breaking and deaths. Types and settings:',
    '  heal {amount}, hurt {amount}, shield {amount}, gold {amount (negative takes)}, ammo {ammo: "current"|"shells"|"rounds"|"cells"|"rockets", amount, fraction},',
    '  weapon {id}, armor {id}, key {color: red|gold|violet}, item {id, count, props}, loot {table}, blessing {id: "random"|blessingId, pool: [ids]},',
    '  buff {name, mods: {stat: delta}, seconds}, spawn {enemy, count, radius, at: "item"|"player"}, explode {radius, damage, at, color},',
    '  message {text, kind: good|warn|key}, text {title, text, kicker}, textCycle {title, texts: []}, flag {name}, sound {name}, sparkle {color, count},',
    '  flash {color, radius, time}, quake {strength}, teleport {tag}, trap {effect: any level trap effect type, plus its settings}. Every effect also takes "delay" (seconds).',
    '  Stats for mods/buffs: maxHp, speed, armor, maxShield, shieldRegen, lightRadius, dashCooldown, swimMul, damageMul, goldFind, ammoMul.',
    '- Item "abilities": a pop-up of choices when used (like an altar or a shop): [{ "label", "desc", "cost" (gold), "limit" (uses per placed item, 0 = unlimited),',
    '  "requires": { "hurt": true, "flag": "name" }, "pick": "random"|"all", "outcomes": [{ "weight", "text" (may use {healed} {gold} {blessing} {blessingDesc} {ammo} {item} {buff}), "kind": "good"|"bad", "effects": [...] }] }]',
    '  with "popup": { "kicker", "title", "text", "prompt" (shown when close), "leave" (close button) }.',
    '- Item "touch": a pickup: { "effects": [...], "text": "toast", "needsHurt": bool, "float": "+{gold}", "flag" }. Add "magnet": 50 to pull it toward the player.',
    '- Item "readable": { "title", "text", "kicker", "flag" }. Item "destructible": { "hp" } with "breakLoot": lootTableId and/or "breakEffects": [...].',
    '- Monster "deathEffects": [...] run when it dies.',
    '- Loot table "data": { "always": [entry], "groups": [{ "chance": 0..1, "picks": 1, "options": [{ "weight", "entries": [entry] }] }] }, entry = { "type": "gold", "amount": n or [min,max] } | { "type": "ammo", "ammo": "carried"|type, "amount" } | { "type": "weapon"|"armor", "id" } | { "type": "key", "color" } | { "type": "item", "id", "props" }.',
    'CODE: any function may be given as a string of JavaScript source, e.g. "draw": "function (g, e, t) { ... }". In scope: LM, U (LM.util), G (LM.gfx), T (32), AI (LM.ai), h, eyes(g, e, color, spread, forward, size), lunge(e), flame(g, x, y, scale, t, seed, color), has(game, flag), wallRot(it), rot(it). Never use Math.random in drawing; use U.hash2 or a seeded U.mulberry32.',
  ].join('\n');
  const ANSWER_RULES = 'ANSWER FORMAT: one short sentence saying what you made, then exactly one ```json code block holding a single JSON object as described. No other code blocks. JSON only inside it: double quotes, no comments, no trailing commas. Functions are JSON strings of JavaScript source.';
  const GAME = 'You are helping design content for The Linear Maze, a fast top-down 2D shooter in the browser (plain JavaScript and Canvas 2D, procedural art, no image files). The player descends through hand-built floors: dark, torch-lit, every light casts shadows, danger telegraphs clearly. Content is data registered by packs. A tile is 32 world units; angles are radians with 0 pointing right; y points down. Write in-world text that is short, specific and slightly ominous, and carries a hint.';

  const monsterContext = () => [
    AI.spec('6.5'),
    'MOVEMENT BEHAVIOURS (ai): ' + M().ids('behaviors').join(', '),
    'ATTACK TYPES and their settings:\n' + Object.entries(SC().ATTACKS).map(([k, v]) => '- ' + k + ': ' + JSON.stringify(v.params)).join('\n'),
    'PROJECTILES: ' + M().ids('projectiles').join(', '),
    'ITEMS that can drop: ' + M().ids('items').filter((i) => ['health-vial', 'medkit', 'ammo-shells', 'ammo-rounds', 'ammo-cells', 'ammo-rockets', 'gold', 'key'].includes(i) || M().isAdded('items', i)).join(', '),
    'EXISTING MONSTERS (for scale and style):\n' + listOf('enemies', (d) => ' · ' + d.hp + ' hp, speed ' + d.speed + ', ' + d.ai + ', ' + (d.attacks || []).map((a) => a.type).join('+')),
    'EXAMPLE, the Drowned Husk (draw in local space: call g.rotate(e.facing) first, facing right is forward; drawGlow is in WORLD space at e.x, e.y):\n' + defText('enemies', 'husk'),
    'EXAMPLE, the Cult Gunner:\n' + defText('enemies', 'gunner'),
  ].join('\n\n');
  const MONSTER_SCHEMA = 'JSON: { "id": "lower-case-dashes", "name", "hp", "speed", "radius", "armor", "mass", "ai", "keep": [min,max] (for skirmisher/lobber), "sight", "flying", "swimmer", "stationary", "boss", "attacks": [...], "drops": { "gold": [min,max], "goldChance", "items": [{ "id", "chance" }] }, "deathEffects": [...], "color", "blood", "gib", "deathGlow", "look": {...} OR "draw" and "drawGlow" code, "imagePrompt": "a prompt for an image generator showing it as a top-down sprite facing right", "summary": "what it is and how it fights, two sentences" }. Prefer "draw"/"drawGlow" code in the style of the examples when the user wants a distinctive look; use "look" for quick variants.';

  const itemContext = () => [
    AI.spec('6.6'), AI.spec('6.7'),
    'EXISTING ITEMS:\n' + listOf('items'),
    'BLESSINGS: ' + M().ids('blessings').join(', ') + '. WEAPONS: ' + M().ids('weapons').join(', ') + '. ARMOR: ' + M().ids('armor').join(', ') + '. LOOT TABLES: ' + M().ids('lootTables').join(', ') + '. ENEMIES: ' + M().ids('enemies').join(', '),
    'TRAP EFFECT TYPES (usable through the "trap" effect): ' + M().ids('effects').join(', '),
    'EXAMPLE, the altar written as editor data:\n' + ED.ser.js(SC().builtinAbilities('altar'), 0),
    'EXAMPLE, the core health vial (code style for draw):\n' + defText('items', 'health-vial'),
  ].join('\n\n');
  const ITEM_SCHEMA = 'JSON: { "id": "lower-case-dashes", "name", "radius", "solid": false|true, "solidRadius", "wallMounted", "bob", "light": { "color", "radius", "intensity", "flicker" }, "mapColor", "popup": {...}, "abilities": [...], "touch": {...}, "readable": {...}, "destructible": { "hp" }, "breakLoot", "breakEffects", "props": { default placement settings }, "look": {...} OR "draw"/"drawGlow" code (item space: centred on the item, not rotated), "imagePrompt", "summary" }. Use only what the item needs.';

  const LEGEND_TEXT = () => {
    const reg = ED.engine.LM.registry.legend;
    return Object.entries(reg).map(([ch, e]) => '"' + ch + '" ' + (typeof e === 'string' ? e : Object.entries(e).map(([k, v]) => k + ':' + (typeof v === 'object' ? JSON.stringify(v) : v)).join(' '))).join('\n');
  };
  const levelContext = (envId) => {
    const env = envId ? M().raw('environments', envId) : null;
    return [
      AI.spec('6.3'), AI.spec('6.8'), AI.spec('6.2'),
      'DEFAULT LEGEND (map characters every floor understands):\n' + LEGEND_TEXT(),
      'TILE TYPES (terrain ids): ' + M().ids('terrain').join(', '),
      'TILE SETS (environment ids): ' + M().ids('environments').map((e) => e + ' (' + M().name('environments', e) + ')').join(', ') + (env ? '\nThis floor uses ' + envId + (env.floors ? ', with floor variants ' + Object.keys(env.floors).join(', ') : env.floorAlt ? ', with floor variant 1 (",")' : '') + '.' : ''),
      'ITEMS: ' + M().ids('items').join(', '),
      'MONSTERS: ' + M().ids('enemies').map((e) => e + ' (' + M().raw('enemies', e).hp + 'hp)').join(', '),
      'PEOPLE (npcs, for peaceful floors): ' + M().ids('npcs').join(', '),
      'WEAPONS: ' + M().ids('weapons').join(', ') + '. ARMOR: ' + M().ids('armor').join(', '),
      'EXAMPLE FLOOR, the Sunken Cloister:\n' + ED.ser.js(pickLevel('sunken-cloister'), 0),
      'MAP RULES: every row the same length; surround the floor with walls (#) or void (space); exactly one entry "<" and one exit ">"; doors "+" sit in a one-tile gap in a wall; a locked door (R Y V) needs its key (r y v) reachable before it; put monsters in rooms, not doorways; leave the entry area calm; use the floor\'s own "legend" for anything with settings (a chest with exact loot, an altar with its text, a tagged plate). Rooms: rect [x, y, width, height] in tiles from the top left. Traps are wired by tags in legend entries.',
    ].join('\n\n');
  };
  function pickLevel(id) {
    if (!M().exists('levels', id)) id = M().levelOrder().find((l) => M().raw('levels', l).environment !== 'office') || M().levelOrder()[0];
    const d = stripMeta(M().raw('levels', id));
    delete d.attractPath;
    return d;
  }
  const LEVEL_SCHEMA = 'JSON: { "id": "lower-case-dashes", "name", "environment", "intro", "outro", "floorLabel" (only for an unnumbered special floor), "armed": false (only for a peaceful floor), "map": ["row", ...], "legend": { "char": { "terrain", "variant", "item"|"enemy"|"npc", "props", "tag", "start" } }, "rooms": [{ "name", "rect": [x,y,w,h], "note" }], "traps": [{ "trigger": { "type", "tag" }, "effects": [...], "once", "cooldown" }], "summary": "a short tour of the floor" }';

  const tilesetContext = () => {
    const styles = {};
    for (const t of M().ids('textures')) {
      const d = M().raw('textures', t);
      const tpl = (() => {
        for (const e of M().ids('environments')) {
          const env = M().raw('environments', e);
          for (const b of [env.floor, env.floorAlt, env.wall].concat(env.floors ? Object.values(env.floors) : [])) if (b && b.style === t) return b;
        }
        return null;
      })();
      styles[t] = (d.kind || 'floor') + (tpl ? ' painter; its palette looks like ' + JSON.stringify(tpl) : ' painter');
    }
    return [
      AI.spec('6.1'),
      'PAINTERS (style names) you can use, with a palette each one reads:\n' + Object.entries(styles).map(([k, v]) => '- ' + k + ': ' + v).join('\n'),
      'EXAMPLE TILE SET, cloister:\n' + ED.ser.js(stripMeta(M().raw('environments', M().exists('environments', 'cloister') ? 'cloister' : M().ids('environments')[0])), 0),
      'EXAMPLE PAINTER CODE (a floor painter): \n' + ED.ser.js({ paint: M().raw('textures', M().exists('textures', 'mosaic') ? 'mosaic' : M().ids('textures')[0]).paint }, 0),
      'A new painter is { "kind": "floor", "paint": "function (g, x, y, info, p) {...}" } or { "kind": "wall", "top": "function (g, x, y, h, info, p) {...}", "face": "function (g, x, y, fh, info, p) {...}" }. Paint one 32x32 tile at x, y (world units) using colours from p (the palette block). info.rnd() is a seeded random number per tile: use it, never Math.random. info.n(dx, dy) is the neighbouring terrain.',
    ].join('\n\n');
  };
  const TILESET_SCHEMA = 'JSON: { "id": "lower-case-dashes", "name", "voidColor", "ambient", "attractAmbient", "outsideSight", "playerLight", "torch", "floor": { "style", ...colours }, "floorAlt": {...}, "wall": { "style", ... }, "water": { "deep", "shallow", "foam" }, "pit": { "core", "wall", "rim" }, "slag": {...} (optional), "door": { "panel", "frame", "trim" }, "particles": { "type": "mote"|"ember", "color", "rate", "alpha", "drift", "windX", "windY", "size" }, "ambience": { "base", "cutoff", "wind", "gain", "wave" }, "textures": { "new-painter-id": {...} } (optional, only for a material no existing painter can draw), "imagePrompt": "a prompt for a seamless floor texture", "summary" }. Pick an ambient colour first: it sets the mood more than anything.';

  // ------------------------------------------------------------ tasks
  const TASKS = {
    monster: { label: 'A new monster', help: 'Stats, attacks and a drawing', kind: 'enemies', placeholder: 'A pale archer of bone that keeps its distance and fires three arrows in a fan. Fragile. Lives in the Cloister.' },
    'monster-edit': { label: 'Change a monster', help: 'Rebalance, new attacks, new look', kind: 'enemies', target: 'enemies', placeholder: 'Make it tougher and give it a charge attack when you get close.' },
    'monster-look': { label: 'Draw a monster', help: 'New drawing code in the game’s style', kind: 'enemies', target: 'enemies', placeholder: 'Draw it as a hunched figure with a lantern for a head.' },
    item: { label: 'A new item', help: 'Pickups, shrines, machines, readables', kind: 'items', placeholder: 'A cracked fountain that, for 15 gold, either heals 40 or summons two skitters, and can be used three times.' },
    'item-edit': { label: 'Change an item', help: 'New abilities, numbers or look', kind: 'items', target: 'items', placeholder: 'Give the altar a third choice: sacrifice 20 health for 50 gold.' },
    'item-look': { label: 'Draw an item', help: 'New drawing code', kind: 'items', target: 'items', placeholder: 'A brass reliquary with a glowing red eye on the lid.' },
    level: { label: 'A new floor', help: 'A whole map with rooms and traps', kind: 'levels', placeholder: 'A flooded library: stacks of shelves as walls, shallow water in the reading room, a locked rare-books vault with the gold key, husks and gunners, one altar.' },
    'level-edit': { label: 'Change a floor', help: 'Rework part or all of a map', kind: 'levels', target: 'levels', placeholder: 'Add a side room east of the nave with a chest guarded by three skitters, and a pressure-plate dart trap in the corridor leading to it.' },
    'level-region': { label: 'Fill a selection', help: 'Redraw a rectangle of a map', kind: 'levels', target: 'levels', hidden: true, placeholder: 'A small shrine with candles and an altar.' },
    tileset: { label: 'A new tile set', help: 'Colours, painters, mood', kind: 'environments', placeholder: 'Bone catacombs: pale limestone walls, packed-earth floor, sickly green fungal light, drifting spores.' },
    'tileset-edit': { label: 'Change a tile set', help: 'Recolour or re-mood', kind: 'environments', target: 'environments', placeholder: 'Make it colder and wetter: blue-grey stone, more moss.' },
  };
  AI.TASKS = TASKS;

  /** { system, user } for a task. */
  AI.build = function (task, target, request, region) {
    const t = TASKS[task];
    let system = GAME + '\n\n', user = '';
    if (t.kind === 'enemies') {
      system += monsterContext() + '\n\n' + EDITOR_DATA + '\n\n' + MONSTER_SCHEMA;
      if (task === 'monster') user = 'Make a new monster.\n\nREQUEST: ' + request;
      else if (task === 'monster-edit') user = 'Change this monster (id "' + target + '"). Return the complete monster with your changes, keeping what the request doesn’t touch (code you don’t change can be left out; it is kept).\n\nCURRENT:\n' + defText('enemies', target) + '\n\nREQUEST: ' + request;
      else user = 'Write new "draw" and "drawGlow" code for this monster (id "' + target + '"). Return JSON with only "draw", "drawGlow", "imagePrompt" and "summary". Keep it readable at small size, about ' + (M().raw('enemies', target).radius || 10) * 2 + ' units across.\n\nCURRENT:\n' + defText('enemies', target) + '\n\nREQUEST: ' + (request || 'Give it a distinctive look that suits its name and attacks.');
    } else if (t.kind === 'items') {
      system += itemContext() + '\n\n' + EDITOR_DATA + '\n\n' + ITEM_SCHEMA;
      if (task === 'item') user = 'Make a new item.\n\nREQUEST: ' + request;
      else if (task === 'item-edit') {
        const raw = M().raw('items', target);
        const asData = !raw.abilities && SC().builtinAbilities(target);
        user = 'Change this item (id "' + target + '"). Return only the fields you change or add (fields you leave out are kept). To change a built-in pop-up, return "abilities" and "popup" in full.\n\nCURRENT:\n' + defText('items', target) + (asData ? '\n\nITS BUILT-IN POP-UP AS EDITOR DATA:\n' + ED.ser.js(asData, 0) : '') + '\n\nREQUEST: ' + request;
      } else user = 'Write new "draw" (and "drawGlow" if it glows) code for this item (id "' + target + '"). Return JSON with only "draw", "drawGlow", "imagePrompt" and "summary".\n\nCURRENT:\n' + defText('items', target) + '\n\nREQUEST: ' + (request || 'Give it a distinctive look.');
    } else if (t.kind === 'levels') {
      const envId = target ? M().raw('levels', target).environment : null;
      system += levelContext(envId) + '\n\n' + EDITOR_DATA + '\n\n' + LEVEL_SCHEMA;
      if (task === 'level') user = 'Make a new floor.\n\nREQUEST: ' + request;
      else if (task === 'level-edit') {
        const d = stripMeta(M().raw('levels', target));
        delete d.attractPath;
        user = 'Change this floor (id "' + target + '"). Return the complete new "map" (every row), plus "legend" entries you add or change (existing ones are kept), and "rooms" and "traps" in full if they change. Keep everything the request doesn’t mention exactly as it is, character for character.\n\nCURRENT FLOOR:\n' + ED.ser.js(d, 0) + '\n\nREQUEST: ' + request;
      } else {
        const d = M().raw('levels', target);
        const [x0, y0, x1, y1] = region;
        const rows = [];
        const pad = 2;
        for (let y = Math.max(0, y0 - pad); y <= Math.min(d.map.length - 1, y1 + pad); y++) rows.push((y >= y0 && y <= y1 ? '>' : ' ') + ' ' + (d.map[y] || '').slice(Math.max(0, x0 - pad), x1 + pad + 1));
        user = 'Redraw one rectangle of this floor (id "' + target + '"): columns ' + x0 + ' to ' + x1 + ', rows ' + y0 + ' to ' + y1 + ' (' + (x1 - x0 + 1) + ' wide, ' + (y1 - y0 + 1) + ' tall). Below are those rows with ' + pad + ' tiles of surroundings (rows inside the rectangle are marked >). It must connect to the surroundings where corridors and doors meet its edges.\n\n' + rows.join('\n') +
          '\n\nTHE FLOOR’S OWN LEGEND:\n' + ED.ser.js(d.legend || {}, 0) + '\n\nReturn JSON: { "rows": [exactly ' + (y1 - y0 + 1) + ' strings of exactly ' + (x1 - x0 + 1) + ' characters], "legend": { new or changed characters }, "rooms": [rooms inside the rectangle, rect in whole-floor tile coordinates], "traps": [new traps only], "summary" }\n\nREQUEST: ' + request;
      }
    } else if (t.kind === 'environments') {
      system += tilesetContext() + '\n\n' + TILESET_SCHEMA;
      if (task === 'tileset') user = 'Make a new tile set.\n\nREQUEST: ' + request;
      else user = 'Change this tile set (id "' + target + '"). Return only the fields you change (palette blocks in full).\n\nCURRENT:\n' + defText('environments', target) + '\n\nREQUEST: ' + request;
    }
    system += '\n\n' + ANSWER_RULES;
    return { system, user };
  };

  // ------------------------------------------------------------ reading answers
  AI.extractJSON = function (text) {
    const m = /```(?:json)?\s*\n([\s\S]*?)\n```/i.exec(text) || /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    let raw = m ? m[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    if (!raw || !raw.trim()) throw new Error('The reply has no JSON block.');
    try {
      return JSON.parse(raw);
    } catch (e) {
      // forgive trailing commas, the most common slip
      try {
        return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1'));
      } catch (e2) {
        throw new Error('The JSON in the reply doesn’t parse: ' + e.message);
      }
    }
  };
  const FN_KEYS = new Set(['draw', 'drawGlow', 'init', 'update', 'onDeath', 'onTouch', 'onBreak', 'onGrant', 'paint', 'top', 'face', 'bake', 'drawDynamic', 'drawIcon', 'drawHeld', 'use', 'prompt', 'available', 'active', 'onHurt']);
  const looksLikeFn = (s) => typeof s === 'string' && /^\s*(async\s+)?(function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.test(s);
  /** Turn code strings into functions. Returns problems found. */
  AI.compileCode = function (obj, path, problems) {
    problems = problems || [];
    if (Array.isArray(obj)) obj.forEach((v, i) => (obj[i] = compileValue(v, path + '[' + i + ']', null, problems)));
    else if (ED.isPlain(obj)) for (const k of Object.keys(obj)) obj[k] = compileValue(obj[k], path ? path + '.' + k : k, k, problems);
    return problems;
  };
  function compileValue(v, path, key, problems) {
    if (typeof v === 'string' && (FN_KEYS.has(key) || looksLikeFn(v)) && looksLikeFn(v)) {
      const src = ED.ser.normalizeFn(v);
      const err = ED.ser.checkFn(src);
      if (err) {
        problems.push(path + ': ' + err);
        return undefined;
      }
      try {
        const fn = ED.engine.compile(src, 'claude/' + path);
        fn.__src = src;
        return fn;
      } catch (e) {
        problems.push(path + ': ' + e.message);
        return undefined;
      }
    }
    if (typeof v === 'object' && v) AI.compileCode(v, path, problems);
    return v;
  }
  /** Check references to things that don't exist. */
  AI.checkRefs = function (kind, d) {
    const warn = [];
    const ex = (k, id) => id == null || M().exists(k, id);
    if (kind === 'enemies') {
      if (d.ai && !ex('behaviors', d.ai)) warn.push('Unknown movement “' + d.ai + '” (it would stand still).');
      for (const a of d.attacks || []) {
        if (!ex('attacks', a.type)) warn.push('Unknown attack type ' + a.type + '.');
        if (a.projectile && !ex('projectiles', a.projectile)) warn.push('Unknown projectile ' + a.projectile + '.');
        if (a.enemy && !ex('enemies', a.enemy)) warn.push('Summons an unknown monster ' + a.enemy + '.');
      }
      if (d.drops && d.drops.items) for (const it of d.drops.items) if (!ex('items', it.id)) warn.push('Drops an unknown item ' + it.id + '.');
    }
    const effs = [];
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (ED.isPlain(v)) {
        if (v.type && typeof v.type === 'string' && (v.amount != null || v.id || v.enemy || v.effect || v.text != null || v.name)) effs.push(v);
        Object.values(v).forEach(walk);
      }
    };
    walk(d.abilities || []);
    walk(d.touch || {});
    walk(d.breakEffects || []);
    walk(d.deathEffects || []);
    const X = ED.engine.X;
    for (const e of effs) {
      if (!X.effects[e.type] && !ED.engine.LM.registry.effects[e.type] && !['gold', 'ammo', 'weapon', 'armor', 'key', 'item'].includes(e.type)) warn.push('Unknown effect type ' + e.type + '.');
      if (e.type === 'spawn' && e.enemy && !ex('enemies', e.enemy)) warn.push('Summons an unknown monster ' + e.enemy + '.');
      if (e.type === 'item' && e.id && !ex('items', e.id)) warn.push('Gives an unknown item ' + e.id + '.');
      if (e.type === 'blessing' && e.id && e.id !== 'random' && !ex('blessings', e.id)) warn.push('Gives an unknown blessing ' + e.id + '.');
    }
    if (kind === 'environments') for (const k of ['floor', 'floorAlt', 'wall']) if (d[k] && d[k].style && !ex('textures', d[k].style) && !(d.textures && d.textures[d[k].style])) warn.push('Unknown painter ' + d[k].style + ' for ' + k + '.');
    return warn;
  };

  // ------------------------------------------------------------ applying answers
  AI.apply = function (task, target, data, region) {
    const t = TASKS[task];
    const kind = t.kind;
    const summary = data.summary;
    const imagePrompt = data.imagePrompt;
    delete data.summary;
    delete data.imagePrompt;
    if (task === 'monster' || task === 'item' || task === 'tileset' || task === 'level') {
      if (kind === 'environments' && data.textures) {
        for (const [tid, tex] of Object.entries(data.textures)) M().create('textures', M().exists('textures', tid) ? ED.uniqueId(tid, (x) => M().exists('textures', x)) : tid, tex, 'Painter ' + tid);
        delete data.textures;
      }
      const name = data.name || 'New ' + kind;
      const id = ED.uniqueId(data.id || name, (x) => M().exists(kind, x));
      delete data.id;
      if (kind === 'levels') {
        data.order = 99;
        if (!data.environment || !M().exists('environments', data.environment)) data.environment = ED.preview.defaultEnv();
      }
      M().create(kind, id, data, (kind === 'levels' ? 'New floor ' : 'New ') + name + ' (Claude)');
      return { kind, id, summary, imagePrompt };
    }
    if (task === 'level-region') {
      const [x0, y0, x1, y1] = region;
      M().update('levels', target, (d) => {
        const map = d.map.slice();
        const rows = data.rows || [];
        for (let y = y0; y <= y1; y++) {
          const src = rows[y - y0] || '';
          let row = map[y] || '';
          while (row.length <= x1) row += ' ';
          let mid = '';
          for (let x = x0; x <= x1; x++) mid += src[x - x0] != null ? src[x - x0] : row[x];
          map[y] = row.slice(0, x0) + mid + row.slice(x1 + 1);
        }
        d.map = map;
        if (data.legend) d.legend = Object.assign({}, d.legend || {}, data.legend);
        if (data.rooms && data.rooms.length) d.rooms = (d.rooms || []).concat(data.rooms);
        if (data.traps && data.traps.length) d.traps = (d.traps || []).concat(data.traps);
      }, 'Claude filled part of ' + M().name('levels', target));
      return { kind, id: target, summary };
    }
    // edits of existing things
    M().update(kind, target, (d) => {
      delete data.id;
      if (kind === 'levels' && data.legend) data.legend = Object.assign({}, d.legend || {}, data.legend);
      if (data.textures) {
        for (const [tid, tex] of Object.entries(data.textures)) if (!M().exists('textures', tid)) M().create('textures', tid, tex);
        delete data.textures;
      }
      if (data.look) {
        delete d.draw;
        delete d.drawGlow;
      }
      if (data.draw || data.drawGlow) delete d.look;
      Object.assign(d, data);
    }, (task.endsWith('look') ? 'Claude drew ' : 'Claude changed ') + M().name(kind, target));
    return { kind, id: target, summary, imagePrompt };
  };

  // ------------------------------------------------------------ the page
  const state = (AI.state = { task: 'monster', target: null, request: '', reply: '', result: null, busy: false });
  ED.views.assistant = {
    title: 'Ask Claude',
    full: true,
    render(el, args) {
      if (args[0] && TASKS[args[0]]) {
        if (state.task !== args[0] || (args[1] && state.target !== args[1])) {
          state.result = null;
          state.reply = '';
          state.problems = null;
        }
        state.task = args[0];
        if (args[1]) state.target = args[1];
        if (args[2]) state.region = args[2].split(',').map(Number);
      }
      const t = TASKS[state.task];
      if (t.target && (!state.target || !M().exists(t.target, state.target))) state.target = M().ids(t.target)[0];
      const ask = h('section', { class: 'ask' });
      const answer = h('section', { class: 'answer' });
      el.appendChild(h('div', { class: 'assistant' }, ask, answer));
      const key = AI.settings().key;
      ask.appendChild(h('h2', null, 'Ask Claude'));
      ask.appendChild(h('p', { class: 'muted' }, 'Describe what you want. Claude gets the game’s rules and what already exists, and answers with data the editor checks and previews before anything changes.'));
      const pick = h('div', { class: 'task-pick' });
      for (const [k, v] of Object.entries(TASKS)) {
        if (v.hidden && state.task !== k) continue;
        pick.appendChild(h('button', { type: 'button', class: k === state.task ? 'on' : '', on: { click: () => { state.task = k; state.result = null; state.reply = ''; ED.go('/assistant/' + k + (state.target && v.target && M().exists(v.target, state.target) ? '/' + encodeURIComponent(state.target) : '')); } } }, h('b', null, v.label), h('small', null, v.help)));
      }
      ask.appendChild(pick);
      if (t.target) {
        ask.appendChild(F().field({ enemies: 'Monster', items: 'Item', levels: 'Floor', environments: 'Tile set' }[t.target], F().idSelect(t.target, state.target, (v) => { state.target = v; ED.go('/assistant/' + state.task + '/' + encodeURIComponent(v)); })));
        if (state.task === 'level-region' && state.region) ask.appendChild(h('p', { class: 'muted' }, 'The selection from ' + state.region[0] + ', ' + state.region[1] + ' to ' + state.region[2] + ', ' + state.region[3] + '.'));
      }
      const req = h('textarea', { class: 'request', placeholder: t.placeholder });
      req.value = state.request;
      req.addEventListener('input', () => (state.request = req.value));
      ask.appendChild(F().field('Request', req));
      const out = h('div', { class: 'stream', hidden: !state.streaming });
      const sendBtn = h('button', { class: 'btn primary', disabled: state.busy, on: { click: send } }, state.busy ? 'Asking…' : 'Send to Claude');
      const stopBtn = h('button', { class: 'btn', hidden: !state.busy, on: { click: () => state.abort && state.abort.abort() } }, 'Stop');
      ask.appendChild(h('div', { class: 'actions', style: { margin: '10px 0' } }, sendBtn, stopBtn,
        h('button', { class: 'btn', on: { click: copyPrompt } }, 'Copy the prompt')));
      if (!key) ask.appendChild(h('p', { class: 'hint' }, 'No API key in ', h('a', { href: '#/settings' }, 'Settings'), '. “Copy the prompt”, paste it into Claude (claude.ai or the app), then paste the whole reply below.'));
      const pasteBox = h('textarea', { rows: 6, class: 'mono', placeholder: 'Paste Claude’s reply here' });
      pasteBox.value = state.reply && !state.streaming ? state.reply : '';
      ask.appendChild(F().field('Claude’s reply', h('div', null, pasteBox, h('div', { class: 'actions', style: { marginTop: '6px' } }, h('button', { class: 'btn small', on: { click: () => { state.reply = pasteBox.value; readReply(); } } }, 'Read this reply')))));
      ask.appendChild(out);

      async function send() {
        if (!state.request.trim() && !state.task.endsWith('look')) {
          req.focus();
          return ED.toast('Describe what you want first.', 'bad');
        }
        const { system, user } = AI.build(state.task, state.target, state.request, state.region);
        state.busy = true;
        state.result = null;
        state.problems = null;
        state.streaming = true;
        state.abort = new AbortController();
        sendBtn.disabled = true;
        sendBtn.textContent = 'Asking…';
        stopBtn.hidden = false;
        out.hidden = false;
        out.textContent = '';
        renderAnswer();
        const started = Date.now();
        try {
          state.reply = await AI.call(system, user, (txt) => {
            out.textContent = txt.slice(-4000);
            out.scrollTop = out.scrollHeight;
            const secs = Math.round((Date.now() - started) / 1000);
            sendBtn.textContent = 'Asking… ' + secs + 's';
          }, state.abort.signal);
          state.streaming = false;
          readReply();
        } catch (e) {
          state.streaming = false;
          if (e.name === 'AbortError') ED.toast('Stopped.');
          else {
            state.error = e.message;
            ED.toast(e.message, 'bad', 9000);
          }
          renderAnswer();
        } finally {
          state.busy = false;
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send to Claude';
          stopBtn.hidden = true;
        }
      }
      async function copyPrompt() {
        if (!state.request.trim() && !state.task.endsWith('look')) {
          req.focus();
          return ED.toast('Describe what you want first.', 'bad');
        }
        const { system, user } = AI.build(state.task, state.target, state.request, state.region);
        const text = system + '\n\n=====\n\n' + user;
        if (await ED.copyText(text)) ED.toast('Copied (' + Math.round(text.length / 1000) + 'k characters). Paste it into Claude, then paste the reply back here.', 'good', 6000);
        else ED.modal({ title: 'Copy the prompt', wide: true, body: h('textarea', { rows: 20, class: 'mono', value: text }) });
      }
      function readReply() {
        state.error = null;
        try {
          const data = AI.extractJSON(state.reply);
          const problems = AI.compileCode(data, '', []);
          state.result = data;
          state.problems = problems;
          state.warnings = AI.checkRefs(t.kind, data);
          if (state.task === 'level-region' && state.region) {
            const [x0, y0, x1, y1] = state.region;
            const rows = data.rows || [];
            if (rows.length !== y1 - y0 + 1 || rows.some((r) => r.length !== x1 - x0 + 1)) state.warnings.push('The rows aren’t exactly ' + (x1 - x0 + 1) + '×' + (y1 - y0 + 1) + '; extra is cut off and missing parts keep the old tiles.');
          }
        } catch (e) {
          state.result = null;
          state.error = e.message;
        }
        renderAnswer();
      }
      function renderAnswer() {
        ED.clear(answer);
        if (state.streaming) {
          answer.appendChild(h('div', { class: 'empty' }, h('p', null, h('span', { class: 'spinner' }), ' Claude is writing. The answer appears on the left as it arrives.')));
          return;
        }
        if (state.error) answer.appendChild(h('div', { class: 'note bad' }, state.error));
        if (!state.result) {
          if (!state.error) answer.appendChild(h('div', { class: 'empty' }, h('h2', null, t.label), h('p', null, 'The answer shows up here with a preview. Nothing changes in the game until you apply it, and applying can be undone.')));
          return;
        }
        const d = state.result;
        const text = state.reply.split('```')[0].trim();
        const card = h('div', { class: 'result-card' }, h('h3', null, d.name || (state.target ? M().name(t.kind, state.target) : 'The answer')), text ? h('p', null, text) : null, d.summary ? h('p', { class: 'world' }, d.summary) : null);
        answer.appendChild(card);
        if (state.problems && state.problems.length) answer.appendChild(h('div', { class: 'note bad' }, 'Some code in the answer doesn’t run and will be left out: ', h('ul', null, state.problems.map((p) => h('li', null, p)))));
        if (state.warnings && state.warnings.length) answer.appendChild(h('div', { class: 'note warn' }, h('ul', null, state.warnings.map((p) => h('li', null, p)))));
        answer.appendChild(previewFor(state.task, state.target, d));
        answer.appendChild(h('div', { class: 'actions', style: { margin: '14px 0' } },
          h('button', { class: 'btn primary', on: { click: applyIt } }, state.task.endsWith('edit') || state.task.endsWith('look') || state.task === 'level-region' ? 'Apply the changes' : 'Add it to the game'),
          h('button', { class: 'btn quiet', on: { click: () => { state.result = null; state.reply = ''; renderAnswer(); } } }, 'Discard')));
        const det = h('details', null, h('summary', { class: 'muted' }, 'The data'), h('pre', { class: 'mono stream' }, ED.ser.js(d, 0)));
        answer.appendChild(det);
      }
      function applyIt() {
        const data = ED.clone(state.result);
        let r;
        try {
          r = AI.apply(state.task, state.target, data, state.region);
        } catch (e) {
          return ED.toast('Couldn’t apply it: ' + e.message, 'bad');
        }
        state.result = null;
        state.reply = '';
        ED.toast((r.summary ? 'Done. ' : 'Applied. ') + 'Undo puts it back.', 'good');
        const base = { enemies: 'monsters', items: 'items', levels: 'map', environments: 'tilesets/sets' }[r.kind];
        ED.go('/' + base + '/' + encodeURIComponent(r.id));
      }
      renderAnswer();
    },
  };

  /** A preview of what an answer would make, without changing anything. */
  function previewFor(task, target, d) {
    const X = ED.engine.X;
    const t = TASKS[task];
    try {
      if (t.kind === 'enemies' || t.kind === 'items') {
        const base = target ? M().raw(t.kind, target) : {};
        const merged = X.merge(X.clone(task.endsWith('edit') || task.endsWith('look') ? base : {}), ED.clone(d));
        if (d.look) {
          delete merged.draw;
          delete merged.drawGlow;
          merged.look = d.look;
        } else if (d.draw) delete merged.look;
        merged.id = merged.id || 'preview';
        const built = X.build(t.kind, merged);
        return h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '16px' } },
          ED.preview.thing(t.kind, () => built, { size: 200 }),
          t.kind === 'enemies' ? h('dl', { class: 'kv' }, ['hp', 'speed', 'radius', 'armor', 'ai'].map((k) => [h('dt', null, k), h('dd', null, String(built[k] != null ? built[k] : '—'))]), h('dt', null, 'attacks'), h('dd', null, (built.attacks || []).map(F().attackSummary).join('; '))) :
            h('dl', { class: 'kv' }, h('dt', null, 'does'), h('dd', null, SC().itemTraits(built).join(', ') || 'scenery'), built.abilities ? [h('dt', null, 'choices'), h('dd', null, built.abilities.map((a) => a.label + (a.cost ? ' (' + a.cost + 'g)' : '')).join('; '))] : null));
      }
      if (t.kind === 'levels' && d.map) {
        const LM = ED.engine.LM;
        const def = Object.assign({ id: 'claude-preview', environment: target ? M().raw('levels', target).environment : ED.preview.defaultEnv() }, target ? stripMeta(M().raw('levels', target)) : {}, d);
        def.legend = Object.assign({}, target ? M().raw('levels', target).legend : {}, d.legend || {});
        if (!LM.find('environments', def.environment)) def.environment = ED.preview.defaultEnv();
        const doc = ED.mapdoc.decompile(def);
        const probs = ED.mapdoc.validate(doc, def);
        const L = new LM.Level(def);
        const scale = Math.min(0.5, 640 / (L.w * 32));
        const c = h('canvas', { width: Math.ceil(L.w * 32 * scale), height: Math.ceil(L.h * 32 * scale), class: 'preview', style: { borderRadius: '6px', maxWidth: '100%' } });
        const fake = { level: L, scale, decals: [], bakeAO: LM.Renderer.prototype.bakeAO, paintDecal: LM.Renderer.prototype.paintDecal };
        const g = c.getContext('2d');
        const CHW = LM.CHUNK * 32;
        for (let cy = 0; cy * CHW < L.h * 32; cy++) for (let cx = 0; cx * CHW < L.w * 32; cx++) g.drawImage(LM.Renderer.prototype.bakeChunk.call(fake, cx, cy), cx * CHW * scale, cy * CHW * scale);
        g.fillStyle = 'rgba(242,201,107,0.9)';
        for (const s of L.spawns) if (s.kind !== 'door') g.fillRect((s.x + 0.25) * 32 * scale, (s.y + 0.25) * 32 * scale, Math.max(2, 16 * scale), Math.max(2, 16 * scale));
        return h('div', null, c, h('p', { class: 'muted' }, L.w + '×' + L.h + ' tiles, ' + L.spawns.filter((s) => s.kind === 'enemy').length + ' monsters, ' + L.spawns.filter((s) => s.kind === 'item').length + ' items, ' + (def.rooms || []).length + ' rooms, ' + (def.traps || []).length + ' traps.'),
          probs.length ? h('div', null, probs.map((p) => h('div', { class: 'note ' + (p.level === 'bad' ? 'bad' : 'warn'), style: { marginBottom: '4px' } }, p.text))) : h('p', { style: { color: 'var(--good)' } }, 'The start reaches the exit.'));
      }
      if (t.kind === 'environments') {
        const LM = ED.engine.LM;
        const tmpId = 'claude-preview-env';
        const base = target ? M().raw('environments', target) : M().raw('environments', ED.preview.defaultEnv());
        const env = X.merge(X.clone(base), ED.clone(d));
        // painters in the answer are registered for the preview only
        const added = [];
        if (d.textures) for (const [tid, tex] of Object.entries(d.textures)) if (!LM.registry.textures[tid]) {
          LM.registry.textures[tid] = Object.assign({ id: tid }, tex);
          added.push(tid);
        }
        LM.registry.environments[tmpId] = Object.assign(env, { id: tmpId });
        let c;
        try {
          c = ED.preview.bakeTiles(tmpId, ['##############', '#....,,,,....#', '#.o..,,,,..o.#', '+....~~~~..OO#', '#..^^~~~~..OO#', '##R####+######'], { '#': { terrain: 'wall' }, ',': { terrain: 'floor', variant: 1 }, o: { terrain: 'pillar' }, '~': { terrain: 'water' }, O: { terrain: 'pit' }, '^': { terrain: 'spikes' }, '+': { terrain: 'door' }, R: { terrain: 'door-red' } }, 1.5);
        } finally {
          delete LM.registry.environments[tmpId];
          for (const tid of added) delete LM.registry.textures[tid];
        }
        c.className = 'preview';
        c.style.borderRadius = '8px';
        c.style.maxWidth = '100%';
        const sw = (col) => h('span', { class: 'swatch', style: { background: col, display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' } });
        return h('div', null, c, h('p', null, sw(env.ambient), 'darkness ', sw(env.torch || '#ffa458'), 'torches ', sw(env.playerLight || '#fff'), 'your light'));
      }
    } catch (e) {
      return h('p', { class: 'error-text' }, 'Can’t preview it: ' + e.message);
    }
    return h('div');
  }
})();
