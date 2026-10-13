/* Linear Maze Editor — js/schemas.js
 * What the editor knows about each kind of content: the fields it shows, their
 * types and help text, and the built-in behaviours it can show as editable data
 * (the altar's tithe and prayers, the slot machine's paytable, loot tables...).
 * Field types are drawn by js/forms.js.
 */
'use strict';
(function () {
  const ED = window.ED;
  const SC = (ED.schemas = {});

  SC.STATS = [
    ['maxHp', 'Max health', 'number'],
    ['speed', 'Speed (units a second)', 'number'],
    ['armor', 'Damage reduction (0 to 0.75)', 'number', 0.01],
    ['maxShield', 'Max shield', 'number'],
    ['shieldRegen', 'Shield regeneration a second', 'number'],
    ['lightRadius', 'Light radius', 'number'],
    ['dashCooldown', 'Dash cooldown (seconds)', 'number', 0.05],
    ['swimMul', 'Speed in water (×)', 'number', 0.05],
    ['damageMul', 'Damage (×)', 'number', 0.05],
    ['goldFind', 'Extra gold from enemies (0.35 = +35%)', 'number', 0.05],
    ['ammoMul', 'Ammunition capacity (×)', 'number', 0.05],
  ];
  SC.statLabel = (k) => (SC.STATS.find((s) => s[0] === k) || [k, k])[1];
  SC.AMMO = ['shells', 'rounds', 'cells', 'rockets'];
  SC.KEYS = ['red', 'gold', 'violet'];
  SC.SLOTS = ['head', 'body', 'feet', 'trinket'];
  SC.DIRS = ['n', 'e', 's', 'w'];
  SC.SOUNDS = ['ui', 'coin', 'pickup', 'heal', 'key', 'altar', 'recharge', 'win', 'lose', 'alarm', 'warn', 'door', 'locked', 'open', 'break', 'explode', 'dash', 'switch', 'trap', 'dart', 'nova', 'swing', 'enemyShot', 'fall', 'splash', 'descend', 'tick', 'empty'];
  SC.TOAST_KINDS = [['', 'plain'], ['good', 'good news'], ['warn', 'warning'], ['key', 'key found']];

  // ------------------------------------------------------------ monsters
  SC.enemy = [
    { section: 'Basics' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'hp', label: 'Health', type: 'number', min: 1 },
    { key: 'speed', label: 'Speed', type: 'number', min: 0, help: 'Units a second. The player walks at 172.' },
    { key: 'radius', label: 'Body radius', type: 'number', min: 3, max: 40, help: 'A tile is 32 units. Husks are 10, Brutes 15.' },
    { key: 'armor', label: 'Damage reduction', type: 'number', step: 0.05, min: 0, max: 0.9, placeholder: '0', help: '0.2 ignores a fifth of every hit.' },
    { key: 'mass', label: 'Mass', type: 'number', step: 0.5, placeholder: '1', help: 'Knockback is divided by this.' },
    { section: 'Behaviour' },
    { key: 'ai', label: 'Movement', type: 'id:behaviors', help: 'How it moves. Attacks are separate, below.' },
    { key: 'keep', label: 'Preferred distance', type: 'range2', when: (d) => ['skirmisher', 'lobber'].includes(d.ai), help: 'Ranged movers try to stay between these distances.' },
    { key: 'sight', label: 'Notices you within', type: 'number', help: 'Units, with a clear line of sight.' },
    { key: 'leash', label: 'Gives up beyond', type: 'number', placeholder: 'engine default' },
    { key: 'accel', label: 'Acceleration', type: 'number', step: 1, placeholder: 'engine default' },
    { key: 'turn', label: 'Turn rate', type: 'number', step: 1, placeholder: 'engine default' },
    { key: 'flying', label: 'Flies (ignores pits, water and hazards)', type: 'bool' },
    { key: 'swimmer', label: 'Full speed in water', type: 'bool' },
    { key: 'stationary', label: 'Never moves', type: 'bool' },
    { key: 'boss', label: 'Boss (gold health bar)', type: 'bool' },
    { section: 'Feel' },
    { key: 'color', label: 'Map colour', type: 'color' },
    { key: 'blood', label: 'Blood', type: 'color' },
    { key: 'gib', label: 'Debris', type: 'color' },
    { key: 'deathGlow', label: 'Death flash', type: 'color' },
    { key: 'summonColor', label: 'Summoning ring', type: 'color' },
    { key: 'bark', label: 'Sound when it notices you', type: 'select', options: [''].concat(SC.SOUNDS) },
    { key: 'deathSound', label: 'Death sound', type: 'select', options: [''].concat(SC.SOUNDS) },
  ];
  SC.ATTACKS = {
    melee: { label: 'Melee swipe', params: { damage: 10, range: 14, windup: 0.25, recover: 0.3, cooldown: 1, knock: 120 } },
    ranged: { label: 'Shots', params: { projectile: 'enemy-slug', damage: 9, speed: 400, burst: 1, burstGap: 0.12, fan: 0, spread: 0.05, lead: 0.5, windup: 0.4, cooldown: 1.8, range: 420, minRange: 0, moveWhileFiring: false, flash: '#ffb050' } },
    lob: { label: 'Lobbed shell', params: { damage: 28, radius: 58, flight: 1, windup: 0.6, cooldown: 3, minRange: 120, maxRange: 400, indirect: true, color: '#ff8a3a' } },
    nova: { label: 'Shockwave', params: { damage: 24, radius: 96, windup: 0.9, recover: 0.4, cooldown: 4, color: '#f2c96b', shards: 8, shardDamage: 7 } },
    charge: { label: 'Charge', params: { damage: 26, speed: 440, duration: 0.65, windup: 0.6, cooldown: 3.6, minRange: 80, maxRange: 300, stun: 1 } },
    summon: { label: 'Summon', params: { enemy: 'skitter', count: 2, max: 6, windup: 0.8, cooldown: 8 } },
  };
  SC.ATTACK_HELP = {
    damage: 'Per hit', range: 'Reach beyond the bodies (melee) or the longest shot', windup: 'Seconds of warning before it lands', recover: 'Seconds it stays open afterwards',
    cooldown: 'Seconds before it can use this again', knock: 'Knockback', projectile: 'What it fires', speed: 'Projectile or charge speed', burst: 'Shots per volley',
    burstGap: 'Seconds between shots in a volley', fan: 'Spread a volley across this angle (radians)', spread: 'Random aim error (radians)', lead: 'Aim ahead of a moving player (0 to 1)',
    minRange: 'Won’t use it closer than this', maxRange: 'Won’t use it farther than this', moveWhileFiring: 'Keeps moving while it shoots', flash: 'Muzzle flash colour',
    radius: 'Blast or shockwave radius', flight: 'Seconds in the air', indirect: 'Lobs over walls', color: 'Telegraph colour', shards: 'Shards thrown outward', shardDamage: 'Damage per shard',
    duration: 'Seconds the charge lasts', stun: 'Seconds it is dazed after hitting a wall', enemy: 'Who it summons', count: 'How many each time', max: 'Most alive at once',
  };

  // ------------------------------------------------------------ items
  SC.item = [
    { section: 'Basics' },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'radius', label: 'Size (radius)', type: 'number', min: 2, max: 60, help: 'Units. A tile is 32.' },
    { key: 'solid', label: 'Blocks movement', type: 'select', options: [[false, 'No'], [true, 'Yes, round'], ['rect', 'Yes, a box (set in code)']] },
    { key: 'solidRadius', label: 'Blocking radius', type: 'number', when: (d) => d.solid === true },
    { key: 'wallMounted', label: 'Hangs on a wall (place it on a wall tile)', type: 'bool' },
    { key: 'bob', label: 'Bobs up and down', type: 'bool' },
    { key: 'shadow', label: 'Casts a shadow', type: 'bool', default: true },
    { key: 'magnet', label: 'Pulls toward the player within', type: 'number', when: (d) => !!(d.onTouch || d.touch) },
    { key: 'reach', label: 'Extra reach to use it', type: 'number', when: (d) => !!(d.interact || d.abilities) },
    { key: 'light', label: 'Gives off light', type: 'light' },
    { section: 'On the map' },
    { key: 'dressing', label: 'Dressing (the map palette’s Dressings tab)', type: 'select', options: [['', 'Worked out from the item'], ['Furniture', 'Furniture'], ['Walls', 'On walls'], ['Lights', 'Lights'], ['Decor', 'Decor'], [false, 'Not a dressing']], help: 'Furniture and fixtures placed over tiles. Every set’s dressings can be used on any floor.' },
    { key: 'mapColor', label: 'Minimap marker', type: 'color', allowEmpty: true },
    { key: 'mapAlways', label: 'Keep the marker after use', type: 'bool' },
    { key: 'isChest', label: 'Counts as a chest on the floor summary', type: 'bool' },
  ];

  /** Settings a placed item reads from its props, with what the editor knows about them. */
  SC.PROP_HINTS = {
    name: { type: 'text', label: 'Name shown in its pop-up' },
    title: { type: 'text', label: 'Title' },
    deity: { type: 'text', label: 'Title' },
    text: { type: 'longtext', world: true, label: 'Text' },
    tithe: { type: 'number', label: 'Tithe (gold)' },
    uses: { type: 'number', label: 'Uses' },
    heal: { type: 'number', label: 'Heals' },
    reserve: { type: 'number', label: 'Charge reserve' },
    weapon: { type: 'id:weapons', label: 'Weapon' },
    armor: { type: 'id:armor', label: 'Armor' },
    loot: { type: 'loot', label: 'Exact contents' },
    table: { type: 'id:lootTables', label: 'Loot table' },
    lock: { type: 'select', options: [''].concat(SC.KEYS), label: 'Needs key' },
    color: { type: 'color', label: 'Colour' },
    value: { type: 'number', label: 'Worth (gold)' },
    amount: { type: 'number', label: 'Amount' },
    face: { type: 'select', options: [''].concat(SC.DIRS), label: 'Faces' },
    dir: { type: 'select', options: [''].concat(SC.DIRS), label: 'Front faces' },
    w: { type: 'number', label: 'Width (tiles)' },
    h: { type: 'number', label: 'Height (tiles)' },
    ox: { type: 'number', label: 'Nudge right (units)' },
    oy: { type: 'number', label: 'Nudge down (units)' },
  };
  SC.EXTRA_PROPS = { chest: ['name', 'loot', 'table', 'lock'], altar: ['deity', 'text', 'tithe'], 'healing-font': ['name', 'uses', 'heal'], 'recharge-station': ['name', 'reserve'], 'slot-machine': ['name'], idol: ['text', 'value'], lectern: ['title', 'text'], 'weapon-rack': ['weapon'], 'armor-stand': ['armor'], crate: ['loot'] };
  /** Find the props a definition's code reads (it.props.x || default). */
  SC.discoverProps = function (def) {
    const found = {};
    const scan = (v, depth) => {
      if (depth > 3 || !v) return;
      if (typeof v === 'function') {
        const src = ED.fnSource(v);
        const re = /props\.([A-Za-z_$][\w$]*)(?:\s*(?:\|\||\?\?)\s*([^,;)\]}\n]+))?/g;
        let m;
        while ((m = re.exec(src))) {
          const k = m[1];
          if (!found[k]) found[k] = { key: k };
          if (m[2] && found[k].def == null) {
            const d = m[2].trim();
            if (/^-?\d+(\.\d+)?$/.test(d)) found[k].def = +d;
            else if (/^'[^']*'$|^"[^"]*"$/.test(d)) found[k].def = d.slice(1, -1);
          }
        }
        return;
      }
      if (Array.isArray(v)) v.forEach((x) => scan(x, depth + 1));
      else if (typeof v === 'object') Object.values(v).forEach((x) => scan(x, depth + 1));
    };
    scan(def, 0);
    // settings read by pop-up code that lives outside the definition
    for (const k of SC.EXTRA_PROPS[def.id] || []) found[k] = found[k] || { key: k };
    for (const k of ['ox', 'oy']) found[k] = found[k] || { key: k, def: 0 };
    if (def.wallMounted) found.face = found.face || { key: 'face' };
    if (def.props) for (const k of Object.keys(def.props)) found[k] = found[k] || { key: k, def: def.props[k] };
    return Object.values(found).map((p) => Object.assign({}, SC.PROP_HINTS[p.key] || { type: 'text', label: p.key }, p));
  };

  // ------------------------------------------------------------ effects (item abilities, pickups)
  SC.EFFECT_FIELDS = {
    heal: { amount: 'number' }, hurt: { amount: 'number' }, shield: { amount: 'number' }, gold: { amount: 'number' },
    ammo: { ammo: ['current'].concat(SC.AMMO), amount: 'number', fraction: 'number' },
    weapon: { id: 'id:weapons' }, armor: { id: 'id:armor' }, key: { color: SC.KEYS },
    item: { id: 'id:items', count: 'number' }, loot: { table: 'id:lootTables' },
    blessing: { id: 'blessingOrRandom', pool: 'ids:blessings' },
    buff: { name: 'text', mods: 'mods', seconds: 'number' },
    spawn: { enemy: 'id:enemies', count: 'number', radius: 'number', at: ['item', 'player'] },
    explode: { radius: 'number', damage: 'number', at: ['item', 'player'], color: 'color' },
    message: { text: 'text', kind: SC.TOAST_KINDS },
    text: { title: 'text', text: 'longtext', kicker: 'text' },
    textCycle: { title: 'text', texts: 'stringlist', kicker: 'text' },
    flag: { name: 'text' }, sound: { name: SC.SOUNDS },
    sparkle: { color: 'color', count: 'number', at: ['player', 'item'] },
    flash: { color: 'color', radius: 'number', time: 'number' },
    quake: { strength: 'number' }, teleport: { tag: 'text' },
    trap: { effect: 'id:effects' },
  };
  SC.EFFECT_HELP = {
    heal: 'Heals the player. {healed} in texts is how much.', gold: 'A negative amount takes gold.', ammo: '“current” fills whatever weapon is in hand. fraction 0.4 gives 40% of a full load instead of amount. {ammo}',
    blessing: 'A lasting blessing. “random” picks one the player can still take, from the pool if you give one. {blessing} {blessingDesc}',
    buff: 'Stat changes that wear off after some seconds.', spawn: 'Enemies appear around the item (or the player) and attack.',
    text: 'Opens a page of text and closes the pop-up.', textCycle: 'Shows the next text from the list each time (hints).', trap: 'Runs one of the level trap effects (alarm, lights, flicker, terrain, phone...).',
    teleport: 'Moves the player to the first tile with this tag on the current floor.', flag: 'Sets a story flag (which can start a flag trap).',
  };

  // ------------------------------------------------------------ level traps
  SC.TRIGGERS = [['plate', 'Pressure plate (step on a tagged tile)'], ['zone', 'Zone (walk onto a tagged tile, invisible)'], ['beam', 'Laser beam (between tagged wall emitters)'], ['door', 'A tagged door first opens'], ['pickup', 'A tagged item is taken'], ['clear', 'Every enemy with the tag is dead'], ['flag', 'A story flag is set (tag = flag name)']];
  SC.TRAP_EFFECTS = {
    darts: { tag: 'tag', volleys: 'number', interval: 'number', damage: 'number', speed: 'number' },
    spawn: { tag: 'tag', enemy: 'id:enemies', enemies: 'ids:enemies', count: 'number' },
    seal: { tag: 'tag', text: 'text' }, unseal: { tag: 'tag', text: 'text' }, open: { tag: 'tag', text: 'text' },
    alarm: { radius: 'number', text: 'text' },
    lights: { tag: 'tag', on: 'bool', text: 'text' },
    explode: { tag: 'tag', radius: 'number', damage: 'number', stagger: 'number' },
    message: { text: 'text', kind: SC.TOAST_KINDS },
    quake: { strength: 'number' },
    terrain: { tag: 'tag', terrain: 'id:terrain', doorTag: 'text', sound: 'text' },
    flag: { name: 'text' },
    ambient: { ambient: 'color', outsideSight: 'color', time: 'number' },
    flicker: { tag: 'tag', radius: 'number', time: 'number', strength: 'number' },
    phone: { thread: 'text', text: 'longtext' },
  };

  // ------------------------------------------------------------ weapons, armor, blessings
  SC.weapon = [
    { section: 'Basics' },
    { key: 'name', label: 'Name', type: 'text' }, { key: 'short', label: 'Short name (HUD)', type: 'text' },
    { key: 'slot', label: 'Slot (sort order, 1 to 9)', type: 'number' },
    { key: 'desc', label: 'Description', type: 'longtext', world: true },
    { section: 'Ammunition' },
    { key: 'ammo', label: 'Ammunition', type: 'select', options: [[null, 'Unlimited']].concat(SC.AMMO.map((a) => [a, a])) },
    { key: 'ammoPerShot', label: 'Per shot', type: 'number' }, { key: 'pickupAmmo', label: 'Ammo when picked up', type: 'number' },
    { section: 'Firing' },
    { key: 'damage', label: 'Damage per projectile', type: 'number' }, { key: 'pellets', label: 'Projectiles per shot', type: 'number' },
    { key: 'fireRate', label: 'Shots a second', type: 'number', step: 0.1 }, { key: 'spread', label: 'Spread (radians)', type: 'number', step: 0.01 },
    { key: 'bloom', label: 'Extra spread per recoil', type: 'number', step: 0.01 }, { key: 'speed', label: 'Projectile speed', type: 'number' },
    { key: 'range', label: 'Range', type: 'number' }, { key: 'falloff', label: 'Damage lost at max range (0 to 1)', type: 'number', step: 0.05 },
    { key: 'pierce', label: 'Enemies a shot passes through', type: 'number' }, { key: 'projectile', label: 'Projectile', type: 'id:projectiles', allowEmpty: true },
    { key: 'aoe', label: 'Explodes', type: 'object', fields: { radius: 'number', damage: 'number', color: 'color', selfDamage: 'number' } },
    { section: 'Feel' },
    { key: 'knock', label: 'Knockback', type: 'number' }, { key: 'recoil', label: 'Recoil', type: 'number', step: 0.05 },
    { key: 'kick', label: 'Screen kick', type: 'number', step: 0.01 }, { key: 'pushback', label: 'Shoves you back', type: 'number' },
    { key: 'sound', label: 'Sound', type: 'text' }, { key: 'flash', label: 'Muzzle flash', type: 'color' }, { key: 'tracer', label: 'Tracer colour', type: 'color' },
    { key: 'length', label: 'Barrel length (drawing)', type: 'number' },
  ];
  SC.armor = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'slot', label: 'Slot', type: 'select', options: SC.SLOTS },
    { key: 'mods', label: 'Changes to stats', type: 'mods' },
    { key: 'desc', label: 'Description', type: 'longtext', world: true },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'trim', label: 'Trim', type: 'color' },
    { key: 'lamp', label: 'Carries a lamp', type: 'bool' },
  ];
  SC.blessing = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'mods', label: 'Changes to stats', type: 'mods' },
    { key: 'desc', label: 'What the altar says', type: 'longtext', world: true },
    { key: 'stack', label: 'Can be held this many times', type: 'number', min: 1 },
    { key: 'hidden', label: 'Never offered by random blessings (altars)', type: 'bool' },
  ];

  // ------------------------------------------------------------ terrain and tile sets
  SC.terrain = [
    { key: 'solid', label: 'Blocks movement', type: 'bool' }, { key: 'blocksShots', label: 'Stops bullets', type: 'bool' },
    { key: 'blocksLight', label: 'Blocks light and sight', type: 'bool' }, { key: 'tall', label: 'Casts a contact shadow', type: 'bool' },
    { key: 'layer', label: 'Layer', type: 'select', options: [[0, 'Ground'], [1, 'Raised (walls)']] },
    { key: 'floorLike', label: 'Counts as floor', type: 'bool' },
    { key: 'hazard', label: 'Hazard', type: 'select', options: [[undefined, 'None'], ['pit', 'Pit (fall in)'], ['burn', 'Hurts while standing on it'], ['spikes', 'Spikes'], ['slag', 'Slag']] },
    { key: 'damage', label: 'Damage', type: 'number', when: (d) => d.hazard && d.hazard !== 'pit' },
    { key: 'interval', label: 'Every (seconds)', type: 'number', step: 0.1, when: (d) => d.hazard && d.hazard !== 'pit' },
    { key: 'swim', label: 'Water (swim)', type: 'bool' }, { key: 'speedMul', label: 'Speed on it (×)', type: 'number', step: 0.05 },
    { key: 'entry', label: 'Level start', type: 'bool' }, { key: 'exit', label: 'Level exit', type: 'bool' },
    { key: 'light', label: 'Gives off light', type: 'light' },
    { key: 'mapColor', label: 'Minimap colour', type: 'color', allowEmpty: true },
  ];
  /** Palette blocks of an environment and what each holds. */
  SC.PALETTE_BLOCKS = [
    ['floor', 'Floor', 'floor'], ['floorAlt', 'Room floor (,)', 'floor'], ['wall', 'Walls', 'wall'], ['water', 'Water', null], ['pit', 'Pits', null],
    ['slag', 'Molten slag', null], ['door', 'Doors', null],
  ];
  SC.environmentTop = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'ambient', label: 'Darkness (ambient light)', type: 'color', help: 'The colour of unlit areas. Darker means moodier.' },
    { key: 'attractAmbient', label: 'Title-screen ambient', type: 'color' },
    { key: 'outsideSight', label: 'Out of sight', type: 'color', help: 'Multiplied over everything the player can’t see.' },
    { key: 'playerLight', label: 'Player’s light', type: 'color' },
    { key: 'torch', label: 'Torch and brazier colour', type: 'color' },
    { key: 'voidColor', label: 'Outside the map', type: 'color' },
  ];

  // ------------------------------------------------------------ levels
  SC.level = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'floorLabel', label: 'Label instead of “Floor N”', type: 'text', help: 'Labelled floors don’t take a number (the 14th floor prologue).' },
    { key: 'environment', label: 'Tile set', type: 'id:environments' },
    { key: 'intro', label: 'Shown before this floor', type: 'longtext', world: true },
    { key: 'outro', label: 'Shown when it’s finished', type: 'longtext', world: true },
    { key: 'armed', label: 'Weapons work here', type: 'select', options: [[undefined, 'Yes'], [false, 'No (a peaceful floor; the phone is used instead)']] },
    { key: 'loadout', label: 'A new run that starts here gets', type: 'object', fields: { weapons: 'ids:weapons', gadgets: 'ids:gadgets', gold: 'number' } },
  ];

  // ------------------------------------------------------------ built-in behaviour, as data
  /** Built-in items whose behaviour the editor can show as abilities. Saving a change replaces the built-in pop-up. */
  SC.builtinAbilities = function (id) {
    const LM = ED.engine.LM;
    if (id === 'altar') {
      return {
        popup: { kicker: 'Altar', title: 'Altar of the Drowned Saint', text: 'Wax pools around a stone the width of a coffin. The offering bowl is empty.', leave: 'Leave the altar', prompt: 'Approach the altar' },
        abilities: [
          { label: 'Offer a tithe', cost: 40, costProp: 'tithe', limit: 1, usedText: 'This altar has already answered you.', desc: 'A random lasting blessing.', outcomes: [{ weight: 1, effects: [{ type: 'blessing', id: 'random' }], text: '{blessing}: {blessingDesc}' }] },
          { label: 'Pray', cost: 0, limit: 1, usedText: 'You have already prayed here.', desc: 'Ask for nothing in particular, once.', outcomes: [
            { weight: 55, effects: [{ type: 'heal', amount: 30 }], text: 'Warmth spreads through you. +{healed} health.' },
            { weight: 25, effects: [{ type: 'gold', amount: 12 }], text: 'Coins glint in the offering bowl. +12 gold.' },
            { weight: 20, effects: [], text: 'Silence. Nothing answers.', kind: 'bad', sound: 'lose' },
          ] },
        ],
      };
    }
    if (id === 'healing-font') {
      return {
        popup: { kicker: 'Healing font', title: 'The Saint’s Basin', text: 'Cold water, faintly luminous, in a basin worn smooth by hands. Each draught closes wounds.', leave: 'Leave it', prompt: 'Drink from the font', dimWhenUsed: true },
        abilities: [{ label: 'Drink', cost: 0, limit: 3, limitProp: 'uses', requires: { hurt: true }, desc: 'Each draught closes wounds.', outcomes: [{ weight: 1, effects: [{ type: 'heal', amount: 35, fromProps: { amount: 'heal' } }], text: 'The cold water closes your wounds. +{healed} health.' }] }],
      };
    }
    if (id === 'coffee-machine') {
      return {
        popup: { kicker: 'Pantry', title: 'The espresso machine', text: 'A chrome machine the size of a small car, bought in a fit of morale. It hisses at you.', prompt: 'Make an espresso', leave: 'Step away' },
        abilities: [{ label: 'Pull a shot', cost: 0, desc: 'Move faster for a minute.', outcomes: [{ weight: 1, effects: [{ type: 'buff', id: 'caffeine', name: 'Caffeinated', mods: { speed: 24, dashCooldown: -0.2 }, seconds: 60 }, { type: 'flag', name: 'coffee' }, { type: 'sound', name: 'recharge' }], text: 'Caffeinated: you move faster for a minute.' }] }],
      };
    }
    if (id === 'cb-vending' && LM.CHESSBOARD) {
      return {
        popup: { kicker: 'Hilbert’s Hotel lounge', title: 'Vend-O-Matic 4000', text: 'Snacks for the soul, and for the body, and for whatever you have instead. A sticker on the coin slot: NO REFUNDS. NO REGRETS. NO EXIT.', prompt: 'Use the Vend-O-Matic 4000', leave: 'Walk away' },
        abilities: [
          { label: 'Medical kit (heals 60)', cost: 30, requires: { hurt: true }, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'heal', amount: 60 }], text: 'A medical kit thunks into the tray. It’s warm. You feel better.' }] },
          { label: 'Ammunition (whatever you’re holding)', cost: 25, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'ammo', ammo: 'current', fraction: 0.4 }], text: '+{ammo}, in a snack bag.' }] },
          { label: 'Extended Health Plan (+20 max health, permanent)', cost: 150, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'blessing', id: 'cb-health-plan' }, { type: 'heal', amount: 20 }], text: 'Enrolled. Your body has been upgraded to the Gold tier.' }] },
          { label: 'A hint', cost: 5, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'textCycle', title: 'A hint', kicker: 'Vend-O-Matic 4000 · printed on a receipt', texts: ED.clone(LM.CHESSBOARD.HINTS || []) }] }] },
        ],
      };
    }
    return null;
  };
  SC.builtinSlots = function (id) {
    if (id !== 'slot-machine') return null;
    return {
      popup: { kicker: 'Games of chance', title: 'The Brass Widow', leave: 'Walk away', prompt: 'Play the slot machine' },
      slots: {
        bets: [5, 10, 25],
        intro: 'Three of a kind pays. Two coins anywhere returns your bet and a half.',
        pair: { symbol: 'coin', count: 2, pay: 1.5 },
        symbols: [
          { id: 'coin', name: 'Coin', weight: 34, pay: 6 },
          { id: 'gem', name: 'Gem', weight: 20, pay: 12 },
          { id: 'eye', name: 'Eye', weight: 16, pay: 16 },
          { id: 'crown', name: 'Crown', weight: 10, pay: 40 },
          { id: 'skull', name: 'Skull', weight: 20, pay: 0, kind: 'bad', close: true, text: 'Three skulls. The machine coughs up something hungry.', effects: [{ type: 'spawn', enemy: 'skitter', count: 3, radius: 30 }] },
        ],
      },
    };
  };
  SC.builtinLoot = {
    crate: { groups: [{ chance: 1, options: [{ weight: 42, entries: [] }, { weight: 32, entries: [{ type: 'gold', amount: [4, 12] }] }, { weight: 16, entries: [{ type: 'ammo', ammo: 'carried' }] }, { weight: 10, entries: [{ type: 'item', id: 'health-vial' }] }] }] },
    'chest-common': {
      always: [{ type: 'gold', amount: [15, 35] }],
      groups: [
        { chance: 1, options: [{ weight: 2, entries: [{ type: 'ammo', ammo: 'carried' }] }, { weight: 1, entries: [{ type: 'item', id: 'health-vial' }] }] },
        { chance: 0.4, options: [{ weight: 2, entries: [{ type: 'ammo', ammo: 'carried' }] }, { weight: 1, entries: [{ type: 'item', id: 'health-vial' }] }, { weight: 1, entries: [{ type: 'item', id: 'medkit' }] }] },
      ],
    },
    'chest-rich': { always: [{ type: 'gold', amount: [60, 120] }, { type: 'item', id: 'medkit' }, { type: 'ammo', ammo: 'carried' }, { type: 'ammo', ammo: 'carried' }] },
  };

  /** What kind of thing an item is, in a few words, from what its definition has. */
  SC.itemTraits = function (d) {
    const t = [];
    if (d.onTouch || d.touch) t.push('pickup');
    if (d.abilities) t.push('abilities');
    else if (d.slots) t.push('slot machine');
    else if (d.interact || d.readable) t.push('interactive');
    if (d.isChest) t.push('chest');
    if (d.destructible || d.breakEffects) t.push('breakable');
    if (d.light) t.push('light');
    if (d.wallMounted) t.push('on a wall');
    if (d.solid) t.push('solid');
    return t;
  };
})();
