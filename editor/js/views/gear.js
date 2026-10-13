/* Linear Maze Editor — js/views/gear.js
 * Weapons, armor, blessings and loot tables.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model, C = () => ED.content;

  const SUBS = [
    { id: 'weapons', label: 'Weapons', kind: 'weapons' },
    { id: 'armor', label: 'Armor', kind: 'armor' },
    { id: 'blessings', label: 'Blessings', kind: 'blessings' },
    { id: 'lootTables', label: 'Loot tables', kind: 'lootTables' },
  ];

  ED.views.gear = {
    title: 'Weapons & gear',
    full: true,
    render(el, args) {
      const sub = SUBS.find((s) => s.id === args[0]) || SUBS[0];
      const switcher = F().select(sub.id, SUBS.map((s) => [s.id, s.label]), (v) => ED.go('/gear/' + v), { cls: 'sub-select' });
      const spec = {
        kind: sub.kind, base: 'gear/' + sub.id, title: sub.label, extraHead: switcher,
        group: (id) => ({ core: 'Core', chessboard: 'Chessboard', office: 'Office', editor: 'Made in the editor' }[M().raw(sub.kind, id).pack] || M().raw(sub.kind, id).pack),
        onNew: () => newOne(sub),
        newLabel: 'New',
        detail: (d, id) => DETAIL[sub.id](d, id, sub),
      };
      if (sub.id === 'weapons') {
        spec.icon = (id) => ED.preview.weaponIcon(M().get('weapons', id), 40, 26);
        spec.sub = (id) => {
          const w = M().raw('weapons', id);
          return w.damage + (w.pellets ? '×' + w.pellets : '') + ' dmg · ' + w.fireRate + '/s · ' + (w.ammo || 'unlimited');
        };
      } else if (sub.id === 'armor') {
        spec.icon = (id) => ED.preview.armorIcon(M().get('armor', id), 34);
        spec.sub = (id) => M().raw('armor', id).slot + ' · ' + modText(M().raw('armor', id).mods);
      } else if (sub.id === 'blessings') spec.sub = (id) => modText(M().raw('blessings', id).mods) + (M().raw('blessings', id).hidden ? ' · hidden' : '');
      else spec.sub = (id) => (M().raw('lootTables', id).data || SC().builtinLoot[id] ? 'weighted list' : 'code');
      C().page(el, spec, args[1]);
    },
  };
  const modText = (mods) => Object.entries(mods || {}).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + k).join(', ') || 'no stat changes';

  async function newOne(sub) {
    const name = await ED.prompt('New ' + sub.label.toLowerCase().replace(/s$/, ''), 'Name', '', 'Make it');
    if (!name) return;
    const id = ED.uniqueId(name, (x) => M().exists(sub.kind, x));
    const defs = {
      weapons: { $extends: 'pistol', name, short: name.split(' ')[0], slot: 6 },
      armor: { name, slot: 'trinket', mods: { maxHp: 10 }, desc: 'Describe it.', color: '#6a5a4a', trim: '#d9a32a' },
      blessings: { name, mods: { maxHp: 10 }, desc: 'Describe the blessing.', stack: 1 },
      lootTables: { data: { always: [{ type: 'gold', amount: [10, 20] }], groups: [] } },
    };
    if (sub.kind === 'weapons') M().duplicate('weapons', 'pistol', id, { name, short: name.split(' ')[0], slot: 6 });
    else M().create(sub.kind, id, defs[sub.kind]);
    ED.go('/gear/' + sub.id + '/' + encodeURIComponent(id));
  }

  const DETAIL = {
    weapons(el, id) {
      const b = C().binder('weapons', id);
      const icon = h('div', { class: 'preview', style: { width: '170px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090c', borderRadius: '8px' } }, ED.preview.weaponIcon(M().get('weapons', id), 150, 70));
      const d = b.draft;
      const dps = Math.round((d.damage || 0) * (d.pellets || 1) * (d.fireRate || 0));
      el.appendChild(C().header('weapons', id, { base: 'gear/weapons', preview: icon, traits: ['about ' + dps + ' damage a second', d.ammo ? d.ammo : 'unlimited ammo'] }));
      el.appendChild(ED.tabs([
        { id: 'stats', label: 'Stats', render: () => F().form(d, SC().weapon, () => b.changed()) },
        { id: 'code', label: 'Code', render: () => C().codeTab('weapons', id, b) },
        { id: 'where', label: 'Where to find it', render: () => h('p', { class: 'muted' }, 'Place a Weapon rack in the map editor and set its weapon, put it in a chest’s exact contents, or give it to the player in the starting kit (Player page).') },
      ], 'stats'));
    },
    armor(el, id) {
      const b = C().binder('armor', id);
      el.appendChild(C().header('armor', id, { base: 'gear/armor', preview: h('div', { class: 'preview', style: { padding: '14px', background: '#07090c', borderRadius: '8px' } }, ED.preview.armorIcon(M().get('armor', id), 96)), traits: [b.draft.slot, modText(b.draft.mods)] }));
      el.appendChild(F().form(b.draft, SC().armor, () => b.changed()));
    },
    blessings(el, id) {
      const b = C().binder('blessings', id);
      el.appendChild(C().header('blessings', id, { base: 'gear/blessings', traits: [modText(b.draft.mods)], lede: 'Blessings come from altars (a random one the player can still take), from abilities and pickups that grant them, or from the starting kit.' }));
      el.appendChild(F().form(b.draft, SC().blessing, () => b.changed()));
      el.appendChild(C().codeTab('blessings', id, b, ['onGrant']));
    },
    lootTables(el, id) {
      const b = C().binder('lootTables', id);
      const d = b.draft;
      const builtin = !d.data ? SC().builtinLoot[id] : null;
      el.appendChild(C().header('lootTables', id, { base: 'gear/lootTables', lede: 'Chests, crates and monsters roll on loot tables. A table here is a list of what always drops plus groups that each give one weighted pick.' }));
      if (!d.data && !builtin) {
        el.appendChild(h('div', null, h('p', { class: 'note' }, 'This table is written in code. Replace it with a weighted list to edit it here.'),
          h('button', { class: 'btn small', on: { click: () => { d.data = { always: [], groups: [{ chance: 1, options: [{ weight: 1, entries: [{ type: 'gold', amount: [5, 15] }] }] }] }; b.changed(); ED.rerender(); } } }, 'Replace with a list'),
          C().codeTab('lootTables', id, b)));
        return;
      }
      const data = d.data || ED.clone(builtin);
      const adopt = () => {
        d.data = data;
        b.changed();
        rollEl.replaceChildren(sample());
      };
      if (builtin) el.appendChild(h('p', { class: 'note section-note' }, 'The built-in “' + id + '” table, written out as a list. Change anything and the game uses this version.'));
      el.appendChild(F().field('Always drops', F().lootEntries(data.always || [], (l) => { data.always = l || []; adopt(); })));
      el.appendChild(F().field('Groups', F().list(data.groups || [], (g, i, set) => h('div', null,
        F().field('Chance this group drops', F().number(g.chance == null ? 1 : g.chance, (v) => set(Object.assign({}, g, { chance: v })), { step: 0.05, min: 0, max: 1 })),
        F().field('Picks', F().number(g.picks || 1, (v) => set(Object.assign({}, g, { picks: v })), { min: 1 })),
        F().field('One of', F().list(g.options || [], (o, j, setO) => h('div', { class: 'row' },
          h('span', { class: 'muted' }, 'weight'), F().number(o.weight == null ? 1 : o.weight, (v) => setO(Object.assign({}, o, { weight: v })), { min: 0 }),
          h('div', { style: { flex: '1 1 100%' } }, F().lootEntries(o.entries || [], (l) => setO(Object.assign({}, o, { entries: l || [] }))))), {
          onChange: (l) => set(Object.assign({}, g, { options: l })), addLabel: 'Add an option', newItem: () => ({ weight: 1, entries: [{ type: 'gold', amount: [5, 15] }] }),
        }))), { onChange: (l) => { data.groups = l; adopt(); }, title: (g) => Math.round((g.chance == null ? 1 : g.chance) * 100) + '% · one of ' + (g.options || []).length, addLabel: 'Add a group', newItem: () => ({ chance: 1, options: [{ weight: 1, entries: [] }] }) })));
      const rollEl = h('div');
      const sample = () => {
        const X = ED.engine.X;
        const rolls = [];
        for (let i = 0; i < 6; i++) rolls.push(X.rollLoot(data).map((e) => ED.engine.LM.ui.lootName ? safeName(e) : e.type).join(', ') || 'nothing');
        return h('ul', { class: 'muted' }, rolls.map((r) => h('li', null, r)));
      };
      rollEl.appendChild(sample());
      el.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Six sample rolls ', h('button', { class: 'btn tiny', on: { click: () => rollEl.replaceChildren(sample()) } }, 'Roll again')), rollEl));
      el.appendChild(h('p', { class: 'hint' }, '“for a carried weapon” ammunition picks a type the player’s weapons use at the moment it drops.'));
    },
  };
  function safeName(e) {
    try {
      return ED.engine.LM.ui.lootName(e);
    } catch (err) {
      return e.type + (e.amount ? ' ' + e.amount : '');
    }
  }
})();
