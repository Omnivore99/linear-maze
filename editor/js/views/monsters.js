/* Linear Maze Editor — js/views/monsters.js
 * Monsters: stats, movement, attacks, drops, look (with image prompts and picture
 * import), code, and where they appear.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model, C = () => ED.content;

  const TEMPLATES = [
    { id: 'melee', label: 'A melee bruiser', help: 'Walks at you and hits hard.', def: (name) => ({ name, hp: 60, speed: 88, radius: 11, ai: 'chaser', sight: 320, attacks: [{ type: 'melee', damage: 14, range: 14, windup: 0.3, cooldown: 1 }], drops: { gold: [3, 8], goldChance: 0.6 }, blood: '#4a1a14', look: { type: 'creature', shape: 'humanoid', body: '#7a5a4a', eyes: '#ff6a3a', armsForward: true } }) },
    { id: 'swarm', label: 'A fast swarmer', help: 'Small, quick, comes in numbers.', def: (name) => ({ name, hp: 14, speed: 185, radius: 7, ai: 'swarmer', sight: 340, accel: 14, turn: 16, attacks: [{ type: 'melee', damage: 5, range: 8, windup: 0.14, cooldown: 0.6, recover: 0.2, knock: 60 }], drops: { gold: [1, 3], goldChance: 0.3 }, look: { type: 'creature', shape: 'insect', body: '#4a3b52', eyes: '#ff3a5a' } }) },
    { id: 'shooter', label: 'A shooter', help: 'Keeps its distance and fires bursts.', def: (name) => ({ name, hp: 36, speed: 84, radius: 10, ai: 'skirmisher', keep: [150, 270], sight: 380, attacks: [{ type: 'ranged', projectile: 'enemy-slug', damage: 8, speed: 400, burst: 3, burstGap: 0.12, windup: 0.4, cooldown: 1.9, range: 430, spread: 0.06, lead: 0.5, flash: '#ffb050' }], drops: { gold: [4, 10] }, look: { type: 'creature', shape: 'humanoid', body: '#6a4b3a', eyes: '#ffb050', extras: ['gun'] } }) },
    { id: 'lobber', label: 'An artillery lobber', help: 'Arcs shells over walls with a landing marker.', def: (name) => ({ name, hp: 50, speed: 62, radius: 11, ai: 'lobber', keep: [210, 380], sight: 420, attacks: [{ type: 'lob', damage: 26, radius: 58, flight: 1, windup: 0.6, cooldown: 3, minRange: 120, maxRange: 420, indirect: true, color: '#ff8a3a' }], drops: { gold: [5, 12] }, look: { type: 'creature', shape: 'blob', body: '#5a4a42', glow: '#ff8a3a', eyes: '#ffb050' } }) },
    { id: 'guardian', label: 'A shockwave guardian', help: 'Slow, armoured, bursts when you get close.', def: (name) => ({ name, hp: 140, speed: 72, radius: 14, armor: 0.2, mass: 3, ai: 'warden', sight: 340, attacks: [{ type: 'nova', damage: 22, radius: 96, windup: 0.9, recover: 0.4, cooldown: 4, color: '#f2c96b', shards: 8, shardDamage: 7 }, { type: 'melee', damage: 14, range: 16, windup: 0.4, cooldown: 1.2 }], drops: { gold: [15, 30] }, look: { type: 'creature', shape: 'brute', body: '#8a7a5a', eyes: '#fff0c0', glow: '#f2c96b', extras: ['armor'] } }) },
    { id: 'flyer', label: 'A floating thing', help: 'Ignores pits and water.', def: (name) => ({ name, hp: 30, speed: 110, radius: 9, ai: 'swarmer', flying: true, sight: 360, attacks: [{ type: 'melee', damage: 9, range: 10, windup: 0.25, cooldown: 0.9 }], drops: { gold: [2, 6], goldChance: 0.5 }, look: { type: 'creature', shape: 'floater', body: '#5a6a8a', glow: '#8fd8ff', eyes: '#d8f0ff' } }) },
    { id: 'turret', label: 'A turret', help: 'Never moves; fires from where it stands.', def: (name) => ({ name, hp: 70, speed: 0, radius: 12, armor: 0.3, ai: 'turret', stationary: true, sight: 420, attacks: [{ type: 'ranged', projectile: 'enemy-bolt', damage: 10, speed: 360, burst: 5, burstGap: 0.08, windup: 0.6, cooldown: 2.2, range: 450 }], drops: { gold: [6, 12] }, look: { type: 'creature', shape: 'turret', body: '#4a4d52', limbs: '#2a2c30', eyes: '#ff3a3a' } }) },
  ];

  ED.views.monsters = {
    title: 'Monsters',
    full: true,
    render(el, args) {
      C().page(el, {
        kind: 'enemies', base: 'monsters', title: 'Monsters', newLabel: 'New monster', askTask: 'monster',
        onNew: newMonster,
        group: (id) => (M().raw('enemies', id).boss ? 'Bosses' : { core: 'Core', chessboard: 'Chessboard', editor: 'Made in the editor' }[M().raw('enemies', id).pack] || M().raw('enemies', id).pack),
        sub: (id) => {
          const d = M().raw('enemies', id);
          return d.hp + ' health · ' + (d.ai || '?') + ' · ' + (d.attacks || []).map((a) => a.type).join(', ');
        },
        icon: (id) => ED.preview.icon('enemies', id, 34),
        detail,
        emptyTitle: 'Monsters',
        emptyText: 'Each monster is stats, a way of moving, a list of attacks and a look. Pick one to change it, or make a new one from a template, a copy, or a description for Claude.',
      }, args[0]);
    },
  };

  function newMonster() {
    let tpl = TEMPLATES[0], copyOf = '';
    const list = h('div', { class: 'task-pick' });
    const nameIn = h('input', { type: 'text', placeholder: 'Name, e.g. Bone Archer' });
    const copySel = F().idSelect('enemies', undefined, (v) => { copyOf = v || ''; tpl = null; draw(); }, { allowEmpty: true, emptyLabel: '(pick a monster to copy)' });
    const draw = () => {
      ED.clear(list);
      for (const t of TEMPLATES) list.appendChild(h('button', { type: 'button', class: tpl === t ? 'on' : '', on: { click: () => { tpl = t; copyOf = ''; copySel.value = '0'; draw(); } } }, h('b', null, t.label), h('small', null, t.help)));
    };
    draw();
    ED.modal({
      title: 'New monster', wide: true,
      body: h('div', null, F().field('Name', nameIn), h('p', { class: 'muted' }, 'Start from:'), list, F().field('Or copy a monster', copySel),
        h('p', { class: 'hint' }, 'Or describe it: ', h('a', { href: '#/assistant/monster' }, 'Ask Claude for a monster'), ' (stats, attacks and a drawing).')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: () => {
        const name = nameIn.value.trim();
        if (!name) {
          nameIn.focus();
          return false;
        }
        const id = ED.uniqueId(name, (x) => M().exists('enemies', x));
        if (copyOf) M().duplicate('enemies', copyOf, id, { name });
        else M().create('enemies', id, tpl.def(name), 'New monster ' + name);
        ED.go('/monsters/' + encodeURIComponent(id));
      } }],
    });
  }

  function detail(el, id) {
    const b = C().binder('enemies', id);
    const d = b.draft;
    const preview = ED.preview.thing('enemies', () => M().get('enemies', id), { size: 170 });
    const traits = [d.hp + ' health', 'speed ' + d.speed, (d.attacks || []).length + ' attacks'];
    if (d.armor) traits.push(Math.round(d.armor * 100) + '% armour');
    if (d.boss) traits.push('boss');
    if (d.flying) traits.push('flies');
    el.appendChild(C().header('enemies', id, { base: 'monsters', preview, traits, ask: 'monster-edit' }));
    el.appendChild(ED.tabs([
      { id: 'stats', label: 'Stats', render: () => F().form(d, SC().enemy, () => b.changed()) },
      { id: 'attacks', label: 'Attacks', badge: String((d.attacks || []).length), render: () => attacksTab(b) },
      { id: 'drops', label: 'Drops', render: () => dropsTab(b) },
      { id: 'look', label: 'Look', render: () => C().lookEditor('enemies', id, b) },
      { id: 'code', label: 'Code', render: () => C().codeTab('enemies', id, b) },
      { id: 'used', label: 'Used on', render: () => C().usageBox('enemies', id) },
    ], ED.store.get('monsterTab', 'stats'), (t) => ED.store.set('monsterTab', t)));
  }

  function attacksTab(b) {
    const d = b.draft;
    return h('div', null,
      h('p', { class: 'note section-note' }, 'Every moment it isn’t busy, the monster uses the first attack in this list that is off cooldown and in range. Heavy attacks warn the player during their wind-up.'),
      F().attacks(d.attacks || [], (l) => { d.attacks = l; b.changed(); }));
  }

  function dropsTab(b) {
    const d = b.draft;
    const box = h('div');
    const draw = () => {
      ED.clear(box);
      const mode = typeof d.drops === 'string' ? 'table' : d.drops ? 'list' : 'none';
      box.appendChild(F().field('Drops', F().select(mode, [['list', 'Gold and items'], ['table', 'A roll from a loot table'], ['none', 'Nothing']], (m) => {
        if (m === 'none') delete d.drops;
        else if (m === 'table') d.drops = 'crate';
        else d.drops = { gold: [2, 6] };
        b.changed();
        draw();
      })));
      if (mode === 'table') box.appendChild(F().field('Loot table', F().idSelect('lootTables', d.drops, (v) => { d.drops = v; b.changed(); }), h('a', { href: '#/gear/lootTables' }, 'Edit loot tables')));
      if (mode === 'list') {
        const dr = d.drops;
        box.appendChild(F().field('Gold', F().range2(dr.gold, (v) => { if (v) dr.gold = v; else delete dr.gold; b.changed(); }), 'A random amount between these. Gold-find gear adds to it.'));
        box.appendChild(F().field('Chance of gold', F().number(dr.goldChance, (v) => { if (v == null) delete dr.goldChance; else dr.goldChance = v; b.changed(); }, { step: 0.05, min: 0, max: 1, placeholder: '1 (always)' })));
        box.appendChild(F().field('Items', F().list(dr.items || [], (it, i, set) => h('div', { class: 'row' },
          F().idSelect('items', it.id, (v) => set(Object.assign({}, it, { id: v }))),
          h('span', { class: 'muted' }, 'chance'),
          F().number(it.chance, (v) => set(Object.assign({}, it, { chance: v })), { step: 0.05, min: 0, max: 1, placeholder: '1' })), {
          onChange: (l) => { if (l.length) dr.items = l; else delete dr.items; b.changed(); }, addLabel: 'Add an item drop', newItem: () => ({ id: 'health-vial', chance: 0.1 }), compact: true,
        })));
      }
      box.appendChild(F().field('When it dies, also', F().effects(d.deathEffects || [], (l) => { if (l.length) d.deathEffects = l; else delete d.deathEffects; b.changed(); }, { addLabel: 'Add an effect (an explosion, a message, a flag…)' })));
    };
    draw();
    return box;
  }
  ED.monsterTemplates = TEMPLATES;
})();
