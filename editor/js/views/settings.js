/* Linear Maze Editor — js/views/settings.js
 * Pack settings (the knobs packs keep under LM: CHESSBOARD.CONFIG, MEMOS.POINTS...),
 * the Claude connection, and folder tools (rebuild dist/, reload).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;

  ED.views.settings = {
    title: 'Settings',
    render(el) {
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'Settings')));

      // ---- Claude
      const ai = ED.ai.settings();
      const keyIn = h('input', { type: 'password', value: ai.key || '', placeholder: 'sk-ant-…', autocomplete: 'off' });
      const remember = F().bool(ai.remember !== false, (v) => { ai.remember = v; ED.ai.saveSettings(ai); });
      keyIn.addEventListener('change', () => { ai.key = keyIn.value.trim(); ED.ai.saveSettings(ai); ED.toast(ai.key ? 'Key saved' + (ai.remember === false ? ' for this session' : ' in this browser') : 'Key removed'); });
      page.appendChild(h('fieldset', null, h('legend', null, 'Claude'),
        h('p', { class: 'muted' }, 'The editor can send requests (a monster, an item, a level, a tile set) to Claude and apply the answer. That needs an Anthropic API key from console.anthropic.com. Without a key, every request can be copied and pasted into Claude instead, and the reply pasted back.'),
        F().field('API key', keyIn, 'Kept in this browser only, never written into the game folder.'),
        F().field('Remember the key', remember),
        F().field('Model', F().select(ai.model, ED.ai.MODELS, (v) => { ai.model = v; ED.ai.saveSettings(ai); })),
        F().field('Longest answer (tokens)', F().number(ai.maxTokens, (v) => { ai.maxTokens = v || 16000; ED.ai.saveSettings(ai); }, { min: 1000, max: 64000, step: 1000 })),
        F().field('', h('button', { class: 'btn small', on: { click: async (e) => { e.target.disabled = true; try { const r = await ED.ai.test(); ED.toast('Claude answered: ' + r, 'good'); } catch (err) { ED.toast(err.message, 'bad'); } e.target.disabled = false; } } }, 'Test the connection'))));

      // ---- knobs
      const knobs = h('fieldset', null, h('legend', null, 'Pack settings'));
      knobs.appendChild(h('p', { class: 'muted' }, 'Numbers and lists the packs expose for tuning (HANDOFF.md calls them knobs). Lists of words are in-world text.'));
      const paths = M().knobPaths();
      if (!paths.length) knobs.appendChild(h('p', { class: 'muted' }, 'None found.'));
      for (const p of paths) {
        const v = M().knob(p);
        const changed = !!M().edits().knobs[p];
        const det = h('details', { class: 'list-item' }, h('summary', null, h('div', { class: 'item-head' }, h('span', { class: 'item-title mono' }, p), changed ? h('span', { class: 'flag changed' }, 'changed') : null, changed ? h('button', { class: 'btn tiny quiet', on: { click: (e) => { e.preventDefault(); M().setKnob(p, ED.engine.knobs[p]); ED.rerender(); } } }, 'Original') : null)));
        det.addEventListener('toggle', () => {
          if (!det.open || det.dataset.built) return;
          det.dataset.built = '1';
          const commit = ED.pendingCommit(() => M().setKnob(p, cur), 400);
          let cur = v;
          let ctl;
          if (Array.isArray(v) && v.every((x) => typeof x === 'string')) ctl = F().stringList(v, (l) => { cur = l; commit(); }, { world: true });
          else if (ED.isPlain(v) && Object.values(v).every((x) => x == null || ['number', 'string', 'boolean'].includes(typeof x))) ctl = F().params({}, v, (o) => { cur = o; commit(); });
          else ctl = F().json(v, (o) => { if (o !== undefined) { cur = o; commit(); } }, { rows: 12 });
          det.appendChild(h('div', { class: 'item-body' }, ctl));
        });
        knobs.appendChild(det);
      }
      page.appendChild(knobs);

      // ---- folder
      page.appendChild(h('fieldset', null, h('legend', null, 'The game folder'),
        h('dl', { class: 'kv' }, h('dt', null, 'Folder'), h('dd', null, ED.fs.name), h('dt', null, 'Changes saved to'), h('dd', null, 'packs/editor/edits.js, packs/editor/sprites.js'), h('dt', null, 'index.html'), h('dd', null, ED.engine.editorTagsPresent ? 'loads the editor pack' : 'gets three lines added on the first save')),
        h('div', { class: 'actions', style: { marginTop: '12px' } },
          h('button', { class: 'btn small', disabled: !ED.fs.canWrite(), on: { click: async (e) => { e.target.disabled = true; try { const r = await ED.buildDist(); ED.toast('Wrote dist/the-linear-maze.html (' + r.size + ' KB) with your current changes', 'good'); } catch (err) { ED.toast(err.message, 'bad'); } e.target.disabled = false; } } }, 'Rebuild the single-file game (dist/)'),
          h('button', { class: 'btn small quiet', on: { click: () => ED.reloadFolder() } }, 'Reload the folder')),
        h('p', { class: 'hint' }, 'The rebuild does what node tools/build.mjs does, including unsaved changes, so you don’t need Node.')));
    },
  };

  ED.views.changes = {
    title: 'Changes',
    render(el) {
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      const E = M().edits();
      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'Changes'), M().isDirty() ? h('span', { class: 'dirty' }, 'Not saved yet') : h('span', { class: 'muted' }, 'Everything is saved')));
      const KIND = { textures: ['Painter', 'tilesets/sets'], items: ['Item', 'items'], enemies: ['Monster', 'monsters'], levels: ['Floor', 'map'], environments: ['Tile set', 'tilesets/sets'], terrain: ['Tile type', 'tilesets/types'], weapons: ['Weapon', 'gear/weapons'], armor: ['Armor', 'gear/armor'], blessings: ['Blessing', 'gear/blessings'], lootTables: ['Loot table', 'gear/lootTables'], npcs: ['Person', 'people'] };
      const list = h('ul', { class: 'changes-list' });
      const row = (text, href, undo) => list.appendChild(h('li', null, h('span', null, href ? h('a', { href }, text) : text), undo ? h('button', { class: 'btn tiny quiet', on: { click: () => { undo(); ED.rerender(); } } }, 'Undo this') : null));
      for (const [kind, map] of Object.entries(E.add)) for (const id of Object.keys(map)) row('New ' + (KIND[kind] || [kind])[0].toLowerCase() + ': ' + M().name(kind, id) + (map[id].$extends ? ' (a copy of ' + map[id].$extends + ')' : ''), KIND[kind] ? '#/' + KIND[kind][1] + '/' + encodeURIComponent(id) : null, () => M().remove(kind, id));
      for (const [kind, map] of Object.entries(E.patch)) for (const [id, p] of Object.entries(map)) row('Changed ' + (KIND[kind] || [kind])[0].toLowerCase() + ' ' + M().name(kind, id) + ': ' + Object.keys(p).join(', '), KIND[kind] ? '#/' + KIND[kind][1] + '/' + encodeURIComponent(id) : null, () => M().revert(kind, id));
      for (const [kind, ids] of Object.entries(E.remove)) for (const id of ids) row('Deleted ' + (KIND[kind] || [kind])[0].toLowerCase() + ' ' + M().name(kind, id), null, () => M().restore(kind, id));
      if (E.levelOrder) row('New floor order: ' + E.levelOrder.map((id) => M().name('levels', id)).join(' → '), '#/floors', () => M().setLevelOrder(ED.engine.baseLevelOrder));
      if (E.player) row('The player: ' + ED.ser.summary({ player: E.player })[0].replace(/^player: /, ''), '#/player', () => M().setPlayer({}));
      for (const k of Object.keys(E.knobs)) row('Setting ' + k, '#/settings', () => M().setKnob(k, ED.engine.knobs[k]));
      const pics = M().spriteIds();
      if (!list.children.length) page.appendChild(h('p', { class: 'muted' }, 'No changes yet. Everything is as the packs define it.'));
      page.appendChild(list);
      if (pics.length) page.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Imported pictures'), h('div', { class: 'row' }, pics.map((p) => h('span', { class: 'chip', title: p }, ED.preview.spriteImg(p, 48), p, h('button', { class: 'btn tiny quiet', on: { click: () => { M().setSprite(p, null, 'Remove picture ' + p); ED.rerender(); } } }, '×'))))));
      page.appendChild(h('p', { class: 'hint', style: { marginTop: '18px' } }, 'Saving writes these to packs/editor/edits.js. Each pack file stays as it is, so to undo everything later, remove the three editor lines from index.html.'));
    },
  };
})();
