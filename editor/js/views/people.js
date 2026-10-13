/* Linear Maze Editor — js/views/people.js
 * People (NPCs): name, role, look, how they move, what they say in passing, and
 * the plain-text parts of their conversations.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model, C = () => ED.content;
  const LOOK = { skin: 'color', hair: 'color', hairStyle: ['short', 'long', 'bun', 'ponytail', 'curly', 'buzz', 'bald'], shirt: 'color', pants: 'color', shoes: 'color', tie: 'color', lanyard: 'color', blazer: 'color', glasses: 'bool', headset: 'bool', beard: 'color', holding: ['mug', 'coffee', 'clipboard', 'tablet', 'phone', 'papers'], bg: 'color' };

  ED.views.people = {
    title: 'People',
    full: true,
    render(el, args) {
      C().page(el, {
        kind: 'npcs', base: 'people', title: 'People',
        newLabel: 'New person', onNew: newPerson,
        group: (id) => ({ office: 'Office', chessboard: 'Chessboard', editor: 'Made in the editor' }[M().raw('npcs', id).pack] || M().raw('npcs', id).pack),
        icon: (id) => ED.preview.portrait(M().get('npcs', id).look, M().get('npcs', id).mood, 34),
        sub: (id) => M().raw('npcs', id).role || id,
        detail,
        emptyTitle: 'People',
        emptyText: 'The people on the peaceful floors: how they look, how they move, what they say in passing and the words of their conversations.',
      }, args[0]);
    },
  };

  async function newPerson() {
    const name = await ED.prompt('New person', 'Name', '', 'Make them');
    if (!name) return;
    const id = ED.uniqueId(name, (x) => M().exists('npcs', x));
    M().create('npcs', id, {
      name, role: 'Visitor', behavior: 'stand', face: 's', mood: 'neutral',
      look: { skin: '#d8a888', hair: '#2a1e16', hairStyle: 'short', shirt: '#6a7a8a', pants: '#2a2c34', shoes: '#1a1a1a', bg: '#1d2430' },
      barks: ['Hello.'],
      dialog: { start: 'hello', nodes: { hello: { text: ['Hello. Can I help you?'], options: [{ label: 'Never mind.', end: true }] } } },
    });
    ED.go('/people/' + encodeURIComponent(id));
  }

  function detail(el, id) {
    const b = C().binder('npcs', id);
    const d = b.draft;
    const preview = h('div', { class: 'row', style: { gap: '10px' } }, ED.preview.thing('npcs', () => M().get('npcs', id), { size: 120 }), ED.preview.portrait(d.look, d.mood, 96));
    el.appendChild(C().header('npcs', id, { base: 'people', preview, traits: [d.role, d.behavior].filter(Boolean) }));
    el.appendChild(ED.tabs([
      { id: 'who', label: 'Who', render: () => F().form(d, [
        { key: 'name', label: 'Name', type: 'text' }, { key: 'role', label: 'Role', type: 'text' },
        { key: 'behavior', label: 'Movement', type: 'select', options: Object.keys(ED.engine.LM.npcBehaviors) },
        { key: 'face', label: 'Faces', type: 'select', options: ['n', 'e', 's', 'w'] },
        { key: 'mood', label: 'Portrait mood', type: 'select', options: ['neutral', 'smile', 'tired', 'annoyed', 'wide', 'blank', 'glitch'] },
        { key: 'speed', label: 'Walking speed', type: 'number' }, { key: 'roam', label: 'Wanders within (tiles)', type: 'number' },
        { key: 'spectral', label: 'Only seen in a camera flash', type: 'bool' },
      ], () => b.changed()) },
      { id: 'look', label: 'Look', render: () => {
        d.look = d.look || {};
        return F().params(LOOK, d.look, (v) => { d.look = v; b.changed(); });
      } },
      { id: 'barks', label: 'Said in passing', render: () => Array.isArray(d.barks) || !d.barks ? h('div', null, h('p', { class: 'muted' }, 'Speech bubbles when the player is near.'), F().stringList(d.barks || [], (l) => { d.barks = l; b.changed(); }, { world: true, addLabel: 'Add a line' })) : h('p', { class: 'note' }, 'Written in code (they change with the story). See the Code tab.') },
      { id: 'talk', label: 'Conversation', render: () => dialogTab(b) },
      { id: 'code', label: 'Code', render: () => C().codeTab('npcs', id, b) },
      { id: 'used', label: 'Used on', render: () => C().usageBox('npcs', id) },
    ], 'who'));
  }

  function dialogTab(b) {
    const d = b.draft;
    if (!d.dialog) {
      return h('div', null, h('p', { class: 'muted' }, 'No conversation.'), h('button', { class: 'btn small', on: { click: () => { d.dialog = { start: 'hello', nodes: { hello: { text: ['Hello.'], options: [{ label: 'Goodbye.', end: true }] } } }; b.changed(); ED.rerender(); } } }, 'Give them one'));
    }
    const dg = d.dialog;
    const out = h('div');
    out.appendChild(h('p', { class: 'note section-note' }, 'A conversation is a set of pages. Each page has text and replies; a reply goes to another page or ends the talk. Parts written as code (text that changes with the story, replies that only appear sometimes) show as code and are kept as they are.'));
    out.appendChild(F().field('First page', typeof dg.start === 'function' ? h('span', { class: 'muted' }, 'chosen by code') : F().select(dg.start, Object.keys(dg.nodes || {}), (v) => { dg.start = v; b.changed(); })));
    out.appendChild(F().field('From the second talk on', typeof dg.again === 'function' ? h('span', { class: 'muted' }, 'chosen by code') : F().select(dg.again, [[undefined, '(the first page again)']].concat(Object.keys(dg.nodes || {}).map((k) => [k, k])), (v) => { if (v) dg.again = v; else delete dg.again; b.changed(); })));
    const nodes = dg.nodes || {};
    for (const [key, node] of Object.entries(nodes)) {
      const det = h('details', { class: 'list-item' }, h('summary', null, h('div', { class: 'item-head' }, h('span', { class: 'item-title' }, key + (typeof node.text === 'string' || Array.isArray(node.text) ? ' · “' + String([].concat(node.text)[0] || '').slice(0, 60) + '”' : ' · text by code')))));
      det.addEventListener('toggle', () => {
        if (!det.open || det.dataset.built) return;
        det.dataset.built = '1';
        const body = h('div', { class: 'item-body' });
        if (typeof node.text === 'function') body.appendChild(h('p', { class: 'muted' }, 'The text is written in code.'));
        else body.appendChild(F().field('Text', F().stringList([].concat(node.text || []), (l) => { node.text = l; b.changed(); }, { world: true, addLabel: 'Add a paragraph' })));
        body.appendChild(F().field('Sets story flag', F().text(node.flag, (v) => { if (v) node.flag = v; else delete node.flag; b.changed(); }, { mono: true })));
        if (typeof node.options === 'function') body.appendChild(h('p', { class: 'muted' }, 'Replies are written in code.'));
        else body.appendChild(F().field('Replies', F().list(node.options || [], (op, i, set) => {
          if (op.if || typeof op.label === 'function') return h('span', { class: 'muted' }, (typeof op.label === 'string' ? op.label : 'a reply') + ' (shown only sometimes; code)');
          return h('div', { class: 'grid3' },
            F().field('Says', F().text(op.label, (v) => set(Object.assign({}, op, { label: v })), { world: true })),
            F().field('Then', F().select(op.end || !op.next ? '' : op.next, [['', 'end the talk']].concat(Object.keys(nodes)), (v) => { const o = Object.assign({}, op); if (v) { o.next = v; delete o.end; } else { delete o.next; o.end = true; } set(o); })),
            F().field('Sets flag', F().text(op.flag, (v) => { const o = Object.assign({}, op); if (v) o.flag = v; else delete o.flag; set(o); }, { mono: true })));
        }, { onChange: (l) => { node.options = l; b.changed(); }, addLabel: 'Add a reply', newItem: () => ({ label: 'Okay.', end: true }) })));
        det.appendChild(body);
      });
      out.appendChild(det);
    }
    out.appendChild(h('button', { class: 'btn small', style: { marginTop: '8px' }, on: { click: async () => {
      const k = await ED.prompt('New page', 'Page name (letters, no spaces)', '', 'Add', (v) => (!/^[A-Za-z_][\w-]*$/.test(v) ? 'Use letters, numbers, dashes.' : nodes[v] ? 'That page exists.' : null));
      if (!k) return;
      nodes[k] = { text: ['…'], options: [{ label: 'Okay.', end: true }] };
      dg.nodes = nodes;
      b.changed();
      ED.rerender();
    } } }, 'Add a page'));
    return out;
  }
})();
