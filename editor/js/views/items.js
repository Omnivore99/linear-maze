/* Linear Maze Editor — js/views/items.js
 * Items: every world object, what it does (abilities, pickups, breaking, slot
 * machines), how it looks, its placement settings and its code.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model, C = () => ED.content;

  const TEMPLATES = [
    { id: 'pickup', label: 'A pickup', help: 'Taken by walking over it (a potion, a coin, a charm).', def: (name) => ({ name, radius: 6, bob: true, magnet: 40, look: { type: 'object', shape: 'bottle', color: '#5cc8e8', glow: '#5cc8e8' }, touch: { effects: [{ type: 'heal', amount: 20 }], text: name + ': +{healed} health.', needsHurt: true } }) },
    { id: 'shrine', label: 'Something to use, with choices', help: 'Opens a pop-up of choices, like an altar, a shop or a machine.', def: (name) => ({ name, radius: 12, solid: true, mapColor: '#f2c96b', light: { color: '#ffcf80', radius: 140, intensity: 0.5, flicker: 0.1 }, look: { type: 'object', shape: 'altar', color: '#5c584e', accent: '#6a1e26', glow: '#f2c96b' }, popup: { kicker: name, title: name, text: 'Describe what the player sees.', prompt: 'Use the ' + name.toLowerCase(), leave: 'Step away' }, abilities: [{ label: 'Use it', cost: 10, limit: 1, desc: 'What it does.', outcomes: [{ weight: 1, effects: [{ type: 'heal', amount: 25 }], text: 'You feel better. +{healed} health.' }] }] }) },
    { id: 'readable', label: 'Something to read', help: 'A note, a sign, a plaque or a book.', def: (name) => ({ name, radius: 8, solid: false, mapColor: '#cfc6b0', look: { type: 'object', shape: 'scroll' }, readable: { title: name, text: 'Write what it says.' } }) },
    { id: 'breakable', label: 'Something breakable', help: 'Shot or blasted apart; can drop loot or explode.', def: (name) => ({ name, radius: 11, solid: true, solidRadius: 12, destructible: { hp: 20 }, breakLoot: 'crate', look: { type: 'object', shape: 'box', color: '#7a5530' } }) },
    { id: 'light', label: 'A light', help: 'A lamp, brazier or glowing thing.', def: (name) => ({ name, radius: 8, solid: true, light: { color: '#8fd8ff', radius: 180, intensity: 0.7, flicker: 0.05 }, look: { type: 'object', shape: 'crystal', color: '#8fd8ff', glow: '#8fd8ff' } }) },
    { id: 'decor', label: 'Furniture or decoration', help: 'Solid scenery: a dressing, placed from the map’s Dressings tab.', def: (name) => ({ name, dressing: 'Furniture', radius: 12, solid: true, look: { type: 'object', shape: 'statue', color: '#8a867e' } }) },
  ];

  ED.views.items = {
    title: 'Items',
    full: true,
    render(el, args) {
      const sel = args[0];
      C().page(el, {
        kind: 'items', base: 'items', title: 'Items', newLabel: 'New item', askTask: 'item',
        onNew: newItem,
        group: (id) => {
          const d = M().raw('items', id);
          return ED.dressings.SET_NAMES[d.pack] || d.pack || '';
        },
        sub: (id) => SC().itemTraits(M().raw('items', id)).slice(0, 3).join(', ') || id,
        icon: (id) => ED.preview.icon('items', id, 34),
        detail: detail,
        emptyTitle: 'Items',
        emptyText: 'Everything that sits in the world: pickups, chests, altars, furniture, lights and the trap hardware. Pick one to see what it does and change it, or make a new one.',
      }, sel);
    },
  };

  async function newItem() {
    let tpl = TEMPLATES[0], name = '', copyOf = '';
    const list = h('div', { class: 'task-pick' });
    const nameIn = h('input', { type: 'text', placeholder: 'Name, e.g. Tonic of Haste' });
    const copySel = F().idSelect('items', undefined, (v) => {
      copyOf = v || '';
      tpl = null;
      draw();
    }, { allowEmpty: true, emptyLabel: '(pick an item to copy)' });
    const draw = () => {
      ED.clear(list);
      for (const t of TEMPLATES) list.appendChild(h('button', { type: 'button', class: tpl === t ? 'on' : '', on: { click: () => { tpl = t; copyOf = ''; copySel.value = '0'; draw(); } } }, h('b', null, t.label), h('small', null, t.help)));
    };
    draw();
    ED.modal({
      title: 'New item', wide: true,
      body: h('div', null, F().field('Name', nameIn), h('p', { class: 'muted' }, 'Start from a kind of item:'), list, F().field('Or copy an existing item', copySel),
        h('p', { class: 'hint' }, 'Or describe it to Claude: ', h('a', { href: '#/assistant/item' }, 'Ask Claude for an item'), '.')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: () => {
        name = nameIn.value.trim();
        if (!name) {
          nameIn.focus();
          return false;
        }
        const id = ED.uniqueId(name, (x) => M().exists('items', x));
        if (copyOf) M().duplicate('items', copyOf, id, { name });
        else M().create('items', id, tpl.def(name), 'New item ' + name);
        ED.go('/items/' + encodeURIComponent(id));
      } }],
    });
  }

  function describe(d) {
    const s = [];
    if (d.touch) s.push('Taken by walking over it: ' + (d.touch.effects || []).map((e) => F().effectSummary(e)).join('; ') + '.');
    else if (d.onTouch) s.push('Taken by walking over it (its code decides what it does).');
    if (d.abilities) s.push('Using it opens a pop-up with ' + ED.plural(d.abilities.length, 'choice') + '.');
    else if (d.slots) s.push('A slot machine with ' + ED.plural((d.slots.symbols || []).length, 'symbol') + '.');
    else if (d.readable) s.push('Can be read.');
    else if (d.interact) s.push('Can be used: “' + (typeof d.interact.prompt === 'string' ? d.interact.prompt : 'its prompt depends on the situation') + '”.');
    if (d.destructible) s.push('Breaks after ' + (d.destructible.hp || '?') + ' damage' + (d.breakLoot ? ' and drops loot' : '') + '.');
    if (d.light) s.push('Gives off light.');
    if (d.wallMounted) s.push('Hangs on a wall: place it on a wall tile next to open floor.');
    if (!s.length) s.push('Scenery: it doesn’t do anything when touched or used.');
    return s.join(' ');
  }

  function detail(el, id) {
    const b = C().binder('items', id);
    const d = b.draft;
    const preview = ED.preview.thing('items', () => M().get('items', id), { size: 150 });
    el.appendChild(C().header('items', id, { base: 'items', preview, traits: SC().itemTraits(d), lede: describe(d), ask: 'item-edit' }));
    const hasBehaviour = d.abilities || SC().builtinAbilities(id) || d.slots || SC().builtinSlots(id) || d.touch || d.readable || d.breakEffects || d.breakLoot || d.destructible || d.isChest;
    el.appendChild(ED.tabs([
      { id: 'behaviour', label: 'What it does', render: () => behaviourTab(id, b) },
      { id: 'basics', label: 'Basics', render: () => F().form(d, SC().item, () => b.changed()) },
      { id: 'props', label: 'Placement settings', render: () => propsTab(id, b) },
      { id: 'look', label: 'Look', render: () => C().lookEditor('items', id, b) },
      { id: 'code', label: 'Code', render: () => C().codeTab('items', id, b) },
      { id: 'used', label: 'Used on', render: () => C().usageBox('items', id) },
    ], ED.store.get('itemTab', hasBehaviour ? 'behaviour' : 'basics'), (t) => ED.store.set('itemTab', t)));
  }

  // ------------------------------------------------------------ what it does
  function behaviourTab(id, b) {
    const d = b.draft;
    const out = h('div');
    const redraw = () => out.replaceWith(behaviourTab(id, b));
    const builtin = !d.abilities ? SC().builtinAbilities(id) : null;
    if (d.abilities || builtin) out.appendChild(abilitiesBlock(id, b, builtin, redraw));
    const slotsBuiltin = !d.slots ? SC().builtinSlots(id) : null;
    if (d.slots || slotsBuiltin) out.appendChild(slotsBlock(id, b, slotsBuiltin, redraw));
    if (d.readable) out.appendChild(readableBlock(b));
    if (d.touch) out.appendChild(touchBlock(b, redraw));
    if (d.destructible || d.breakEffects || d.breakLoot) out.appendChild(breakBlock(id, b, redraw));
    if (id === 'chest' || d.isChest) out.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Contents'), h('p', null, 'A chest gives either exact contents (set on each placed chest in the map editor: its “Exact contents” setting) or a roll from a loot table (its “Loot table” setting, chest-common if none). ', h('a', { href: '#/gear/lootTables' }, 'Edit loot tables'), '.')));
    if (!d.abilities && !builtin && d.interact && !d.slots && !d.readable) {
      out.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Its pop-up'), h('p', { class: 'muted' }, 'This item’s pop-up is written in code (see the Code tab). Its words and numbers mostly come from its placement settings. You can replace it with a pop-up of choices made here instead.')));
    }
    // add behaviour
    const adds = [];
    if (!d.abilities && !d.slots) adds.push(h('button', { class: 'btn small', on: { click: async () => {
      if (d.interact && !(await ED.confirm('Replace its pop-up?', 'This item already does something when used. A pop-up of choices replaces that (you can go back with “Back to original”).', 'Replace it'))) return;
      d.popup = { kicker: d.name, title: d.name, text: '', prompt: 'Use the ' + String(d.name || 'thing').toLowerCase(), leave: 'Step away' };
      d.abilities = [{ label: 'Use it', cost: 0, limit: 1, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'heal', amount: 20 }], text: 'You feel better. +{healed} health.' }] }];
      delete d.readable;
      b.changed();
      redraw();
    } } }, 'Add a pop-up with choices'));
    if (!d.touch && !d.onTouch) adds.push(h('button', { class: 'btn small', on: { click: () => { d.touch = { effects: [{ type: 'gold', amount: 10 }], text: '' }; b.changed(); redraw(); } } }, 'Make it a pickup'));
    if (!d.destructible && !d.breakEffects) adds.push(h('button', { class: 'btn small', on: { click: () => { d.destructible = { hp: 20 }; d.breakLoot = 'crate'; b.changed(); redraw(); } } }, 'Make it breakable'));
    if (!d.readable && !d.interact && !d.abilities) adds.push(h('button', { class: 'btn small', on: { click: () => { d.readable = { title: d.name, text: '' }; b.changed(); redraw(); } } }, 'Make it readable'));
    if (adds.length) out.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Give it more to do'), h('div', { class: 'actions' }, adds)));
    return out;
  }

  function popupFields(pop, changed) {
    const set = (k) => (v) => {
      if (v === undefined || v === '') delete pop[k];
      else pop[k] = v;
      changed();
    };
    return h('div', { class: 'grid2' },
      F().field('Prompt (shown when you’re close)', F().text(pop.prompt, set('prompt'))),
      F().field('Kicker (small line above the title)', F().text(pop.kicker, set('kicker'))),
      F().field('Title', F().text(pop.title, set('title')), 'A placed item’s own title/deity/name setting wins.'),
      F().field('Leave button', F().text(pop.leave, set('leave'))),
      h('div', { style: { gridColumn: '1 / -1' } }, F().field('Text', F().longtext(pop.text, set('text'), { world: true }), 'A placed item’s own text setting wins.')));
  }

  function abilitiesBlock(id, b, builtin, redraw) {
    const d = b.draft;
    const src = d.abilities ? d : ED.clone(builtin);
    const adopt = () => {
      if (!d.abilities) {
        d.abilities = src.abilities;
        d.popup = d.popup || src.popup;
      }
    };
    const box = h('div', { class: 'insp-section' }, h('h4', null, 'Choices in its pop-up'));
    if (builtin) box.appendChild(h('p', { class: 'note section-note' }, 'These are the built-in choices of the ' + (d.name || id) + ', shown as data you can change. As soon as you change anything, the game uses this version instead of the built-in pop-up. Placed copies still use their own settings (an altar’s tithe, a font’s uses).'));
    else if (M().base('items', id) && M().base('items', id).interact && !M().base('items', id).abilities) box.appendChild(h('div', { class: 'row' }, h('p', { class: 'muted', style: { flex: 1, margin: 0 } }, 'This replaces the item’s built-in pop-up.'), h('button', { class: 'btn small quiet', on: { click: () => { delete d.abilities; delete d.popup; b.changed(); redraw(); } } }, 'Back to the built-in pop-up')));
    src.popup = src.popup || {};
    box.appendChild(popupFields(src.popup, () => { adopt(); d.popup = src.popup; b.changed(); }));
    box.appendChild(F().field('Choices', F().abilities(src.abilities, (list) => {
      src.abilities = list;
      adopt();
      d.abilities = list;
      b.changed();
      ED.debounce(() => poolHolder.replaceChildren(blessingPools(src, b, adopt)), 50)();
    })));
    const poolHolder = h('div');
    poolHolder.appendChild(blessingPools(src, b, adopt));
    box.appendChild(poolHolder);
    return box;
  }

  /** For abilities that grant a random blessing: the blessings it can give, editable in place. */
  function blessingPools(src, b, adopt) {
    const out = h('div');
    const efs = [];
    for (const a of src.abilities || []) for (const o of a.outcomes || []) for (const e of o.effects || []) if (e.type === 'blessing' && (!e.id || e.id === 'random')) efs.push([a, e]);
    if (!efs.length) return out;
    for (const [a, ef] of efs) {
      const box = h('div', { class: 'insp-section' }, h('h4', null, '“' + (a.label || 'Use') + '” can give these blessings'));
      const pool = ef.pool && ef.pool.length ? ef.pool : null;
      box.appendChild(h('p', { class: 'muted' }, pool ? 'Only the blessings ticked below (the player gets one at random that they can still take).' : 'Any blessing that isn’t marked hidden, at random. Tick “Only these” to choose.'));
      box.appendChild(F().bool(!!pool, (on) => {
        adopt();
        if (on) ef.pool = M().ids('blessings').filter((x) => !M().raw('blessings', x).hidden);
        else delete ef.pool;
        b.changed();
        out.replaceWith(blessingPools(src, b, adopt));
      }, 'Only these'));
      const list = h('div', { class: 'list' });
      for (const bid of M().ids('blessings')) {
        const bl = M().raw('blessings', bid);
        const inPool = pool ? pool.includes(bid) : !bl.hidden;
        const mods = Object.entries(bl.mods || {}).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + SC().statLabel(k).replace(/ \(.*\)$/, '').toLowerCase()).join(', ');
        const det = h('details', { class: 'list-item' }, h('summary', null, h('div', { class: 'item-head' },
          pool ? F().bool(inPool, (on) => {
            adopt();
            const s = new Set(ef.pool || []);
            if (on) s.add(bid);
            else s.delete(bid);
            ef.pool = [...s];
            b.changed();
          }) : null,
          h('span', { class: 'item-title' }, bl.name + (mods ? ' · ' + mods : '') + (bl.stack ? ' · up to ' + bl.stack : '') + (bl.hidden ? ' · hidden' : '')),
          M().status('blessings', bid) ? h('span', { class: 'flag ' + M().status('blessings', bid) }, M().status('blessings', bid)) : null,
          h('span', { class: 'tools' },
            h('button', { class: 'btn tiny quiet', on: { click: (e) => { e.preventDefault(); copyBlessing(bid, () => out.replaceWith(blessingPools(src, b, adopt))); } } }, 'Copy'),
            h('button', { class: 'btn tiny quiet danger', on: { click: async (e) => { e.preventDefault(); if (await ED.confirm('Delete ' + bl.name + '?', 'No altar or effect will give it any more.', 'Delete', true)) { M().remove('blessings', bid); out.replaceWith(blessingPools(src, b, adopt)); } } } }, 'Delete')))));
        det.addEventListener('toggle', () => {
          if (!det.open || det.dataset.built) return;
          det.dataset.built = '1';
          const bb = C().binder('blessings', bid);
          det.appendChild(h('div', { class: 'item-body' }, F().form(bb.draft, SC().blessing, () => bb.changed())));
        });
        list.appendChild(det);
      }
      box.appendChild(list);
      box.appendChild(h('div', { class: 'actions', style: { marginTop: '8px' } },
        h('button', { class: 'btn small', on: { click: () => newBlessing(ef, adopt, b, () => out.replaceWith(blessingPools(src, b, adopt))) } }, 'New blessing'),
        h('a', { class: 'btn small quiet', href: '#/gear/blessings' }, 'All blessings')));
      out.appendChild(box);
    }
    return out;
  }
  async function copyBlessing(bid, done) {
    const name = await ED.prompt('Copy ' + M().name('blessings', bid), 'Name', M().name('blessings', bid) + ' II', 'Copy');
    if (!name) return;
    M().duplicate('blessings', bid, ED.uniqueId(name, (x) => M().exists('blessings', x)), { name });
    done();
  }
  async function newBlessing(ef, adopt, b, done) {
    const name = await ED.prompt('New blessing', 'Name', '', 'Make it');
    if (!name) return;
    const id = ED.uniqueId(name, (x) => M().exists('blessings', x));
    M().create('blessings', id, { name, mods: { maxHp: 10 }, desc: 'Describe the blessing.', stack: 1 });
    if (ef.pool) {
      adopt();
      ef.pool.push(id);
      b.changed();
    }
    done();
  }

  function slotsBlock(id, b, builtin, redraw) {
    const d = b.draft;
    const src = d.slots ? d : ED.clone(builtin);
    const adopt = () => {
      if (!d.slots) {
        d.slots = src.slots;
        d.popup = d.popup || src.popup;
      }
      b.changed();
    };
    const s = src.slots;
    const box = h('div', { class: 'insp-section' }, h('h4', null, 'Paytable'));
    if (builtin) box.appendChild(h('p', { class: 'note section-note' }, 'The Brass Widow’s built-in paytable, as data. Change anything and the game uses this version.'));
    const totalW = () => (s.symbols || []).reduce((a, x) => a + (x.weight == null ? 1 : x.weight), 0) || 1;
    const rtp = () => {
      const syms = s.symbols || [];
      const T = totalW();
      let ev = 0;
      for (const x of syms) ev += Math.pow((x.weight == null ? 1 : x.weight) / T, 3) * (x.pay || 0);
      if (s.pair) {
        const p = (syms.find((x) => x.id === s.pair.symbol) || {}).weight / T || 0;
        ev += 3 * p * p * (1 - p) * (s.pair.pay || 0);
      }
      return Math.round(ev * 100);
    };
    const rtpEl = h('p', { class: 'muted' });
    const upd = () => (rtpEl.textContent = 'On average the machine pays back about ' + rtp() + '% of what goes in.');
    upd();
    box.appendChild(F().field('Bets', F().text((s.bets || []).join(', '), (v) => { s.bets = v.split(/[,\s]+/).map(Number).filter((n) => n > 0); adopt(); }), 'Gold amounts, separated by commas.'));
    box.appendChild(F().field('Symbols', F().list(s.symbols || [], (sym, i, set) => {
      const up = (k) => (v) => {
        sym = Object.assign({}, sym, { [k]: v });
        if (v === undefined || v === '') delete sym[k];
        set(sym);
      };
      return h('div', null,
        h('div', { class: 'grid4' },
          F().field('Name', F().text(sym.name, up('name'))),
          F().field('Weight', F().number(sym.weight, up('weight'), { min: 0 })),
          F().field('Three pay (× bet)', F().number(sym.pay, up('pay'), { min: 0 })),
          F().field('Colour (new symbols)', F().color(sym.color, up('color'), { allowEmpty: true }))),
        h('div', { class: 'grid2' },
          F().field('Glyph (new symbols)', F().text(sym.glyph, up('glyph'), { emptyUndefined: true, placeholder: 'a letter or emoji' })),
          F().field('Three of these also', F().select(sym.close ? 'close' : 'stay', [['stay', 'keeps the pop-up open'], ['close', 'closes the pop-up']], (v) => up('close')(v === 'close' || undefined)))),
        F().field('Three of these text', F().longtext(sym.text, up('text'), { world: true, rows: 2, emptyUndefined: true })),
        F().field('Three of these run', F().effects(sym.effects || [], (l) => up('effects')(l.length ? l : undefined))));
    }, { onChange: (l) => { s.symbols = l; adopt(); upd(); }, title: (x) => (x.name || x.id) + ' · weight ' + (x.weight == null ? 1 : x.weight) + ' · ×' + (x.pay || 0) + (x.effects && x.effects.length ? ' · ' + x.effects.map((e) => e.type).join(', ') : ''), addLabel: 'Add a symbol', newItem: () => ({ id: 'sym' + Math.floor(Math.random() * 1e5), name: 'Bell', weight: 10, pay: 20, color: '#e0b25a', glyph: '♪' }) })));
    const pr = s.pair || {};
    box.appendChild(h('div', { class: 'grid3' },
      F().field('Pair rule: symbol', F().select(pr.symbol, [[undefined, '(none)']].concat((s.symbols || []).map((x) => [x.id, x.name || x.id])), (v) => { s.pair = v ? Object.assign({ count: 2, pay: 1.5 }, s.pair || {}, { symbol: v }) : undefined; if (!v) delete s.pair; adopt(); upd(); })),
      F().field('…this many anywhere', F().number(pr.count, (v) => { s.pair = Object.assign({}, s.pair, { count: v }); adopt(); })),
      F().field('…pays (× bet)', F().number(pr.pay, (v) => { s.pair = Object.assign({}, s.pair, { pay: v }); adopt(); upd(); }))));
    box.appendChild(rtpEl);
    box.appendChild(popupFields(src.popup = src.popup || {}, () => { if (!d.popup) d.popup = src.popup; adopt(); }));
    if (!builtin && M().base('items', id) && M().base('items', id).interact && !M().base('items', id).slots) box.appendChild(h('button', { class: 'btn small quiet', on: { click: () => { delete d.slots; delete d.popup; b.changed(); redraw(); } } }, 'Back to the built-in machine'));
    return box;
  }

  function readableBlock(b) {
    const r = b.draft.readable;
    const set = (k) => (v) => {
      r[k] = v;
      b.changed();
    };
    return h('div', { class: 'insp-section' }, h('h4', null, 'What it says'),
      F().field('Title', F().text(r.title, set('title'))),
      F().field('Text', F().longtext(r.text, set('text'), { world: true, rows: 6 }), 'Blank lines start new paragraphs. A placed copy’s own title and text settings win.'),
      F().field('Small line above', F().text(r.kicker, set('kicker'))),
      F().field('Reading it sets story flag', F().text(r.flag, set('flag'), { mono: true, emptyUndefined: true })),
      h('button', { class: 'btn small quiet', on: { click: () => { delete b.draft.readable; b.changed(); ED.rerender(); } } }, 'It isn’t readable'));
  }
  function touchBlock(b, redraw) {
    const tc = b.draft.touch;
    const set = (k) => (v) => {
      if (v === undefined || v === '') delete tc[k];
      else tc[k] = v;
      b.changed();
    };
    return h('div', { class: 'insp-section' }, h('h4', null, 'When picked up'),
      F().field('Effects', F().effects(tc.effects || [], set('effects'))),
      F().field('Message', F().text(tc.text, set('text'), { emptyUndefined: true }), 'Placeholders like {healed} or {gold} work here.'),
      F().field('Floating text', F().text(tc.float, set('float'), { emptyUndefined: true, placeholder: '+{gold}' })),
      F().field('Leave it if the player is unhurt', F().bool(tc.needsHurt, set('needsHurt'))),
      F().field('Sets story flag', F().text(tc.flag, set('flag'), { mono: true, emptyUndefined: true })),
      h('button', { class: 'btn small quiet', on: { click: () => { delete b.draft.touch; b.changed(); redraw(); } } }, 'It isn’t a pickup'));
  }
  function breakBlock(id, b, redraw) {
    const d = b.draft;
    const dest = (d.destructible = d.destructible || { hp: 20 });
    const hasCode = !!(M().base('items', id) && M().base('items', id).destructible && M().base('items', id).destructible.onBreak);
    return h('div', { class: 'insp-section' }, h('h4', null, 'Breaking'),
      F().field('Health', F().number(dest.hp, (v) => { dest.hp = v || 1; b.changed(); }, { min: 1 })),
      hasCode ? F().field('Its own break code', F().bool(d.breakKeepOriginal !== false, (v) => { if (v) delete d.breakKeepOriginal; else d.breakKeepOriginal = false; b.changed(); }, 'still runs (sounds, debris, its usual loot)')) : null,
      F().field('Drops loot', F().idSelect('lootTables', typeof d.breakLoot === 'string' ? d.breakLoot : undefined, (v) => { if (v) d.breakLoot = v; else delete d.breakLoot; b.changed(); }, { allowEmpty: true, emptyLabel: 'nothing extra' }), 'A placed copy’s exact “loot” setting wins.'),
      F().field('Also runs', F().effects(d.breakEffects || [], (l) => { if (l.length) d.breakEffects = l; else delete d.breakEffects; b.changed(); }, { addLabel: 'Add an effect (an explosion, a message…)' })));
  }

  // ------------------------------------------------------------ placement settings
  function propsTab(id, b) {
    const d = b.draft;
    const props = SC().discoverProps(M().base('items', id) || d);
    const out = h('div');
    out.appendChild(h('p', { class: 'note section-note' }, 'Settings each placed copy can have. The values here are the defaults for every copy; in the map editor, a copy on a floor can set its own (an altar’s title, a chest’s contents, a weapon rack’s weapon).'));
    if (!props.length) out.appendChild(h('p', { class: 'muted' }, 'It doesn’t read any placement settings.'));
    for (const p of props) {
      const v = (d.props || {})[p.key];
      const set = (x) => {
        const pr = Object.assign({}, d.props || {});
        if (x === undefined || x === '') delete pr[p.key];
        else pr[p.key] = x;
        if (Object.keys(pr).length) d.props = pr;
        else delete d.props;
        b.changed();
      };
      let ctl;
      if (p.type === 'loot') ctl = F().lootEntries(v, set);
      else ctl = F().typed(p.type === 'select' ? p.options : p.type, v, set);
      out.appendChild(F().field(p.label + ' (' + p.key + ')', ctl, p.def != null ? 'Built-in default: ' + p.def : ''));
    }
    return out;
  }
})();
