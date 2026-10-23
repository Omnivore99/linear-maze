/* Linear Maze Editor — js/views/content.js
 * The shared master/detail page used by items, monsters, gear, tile sets and people,
 * the shared detail header and actions, the look editor (parameters, picture or
 * code), picture import, and the image-prompt writer.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h, F = () => ED.forms;
  const M = () => ED.model;
  const C = (ED.content = {});

  /** spec: { kind, base (route prefix), title, newLabel, onNew, askTask, group(id), sub(id), icon(id), detail(el, id), filter(id) } */
  C.page = function (el, spec, selected) {
    const side = h('aside', { class: 'side' });
    const detail = h('section', { class: 'detail' });
    el.appendChild(h('div', { class: 'content' }, side, detail));
    const search = h('input', { type: 'search', placeholder: 'Search ' + spec.title.toLowerCase(), value: C.lastSearch[spec.base] || '' });
    const list = h('div', { class: 'side-list' });
    side.append(h('div', { class: 'side-head' },
      h('div', { class: 'row' }, h('h3', { style: { flex: 1 } }, spec.title), spec.extraHead || null),
      search,
      h('div', { class: 'row' },
        spec.onNew ? h('button', { class: 'btn small', on: { click: spec.onNew } }, spec.newLabel || 'New') : null,
        spec.askTask ? h('button', { class: 'btn small ai', on: { click: () => ED.go('/assistant/' + spec.askTask) } }, 'Ask Claude for one') : null)), list);
    const drawList = () => {
      ED.clear(list);
      const q = search.value.trim().toLowerCase();
      C.lastSearch[spec.base] = search.value;
      const ids = M().ids(spec.kind, true).filter((id) => !spec.filter || spec.filter(id));
      const groups = new Map();
      for (const id of ids) {
        const name = M().name(spec.kind, id);
        if (q && !name.toLowerCase().includes(q) && !id.includes(q)) continue;
        const g = spec.group ? spec.group(id) : '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(id);
      }
      for (const [g, gids] of groups) {
        if (g) list.appendChild(h('div', { class: 'side-group' }, g));
        gids.sort((a, b) => M().name(spec.kind, a).localeCompare(M().name(spec.kind, b)));
        for (const id of gids) {
          const st = M().status(spec.kind, id);
          let icon = null;
          try {
            icon = spec.icon ? spec.icon(id) : null;
          } catch (e) {}
          list.appendChild(h('a', { class: 'entry' + (id === selected ? ' on' : '') + (st === 'removed' ? ' removed' : ''), href: '#/' + spec.base + '/' + encodeURIComponent(id) },
            icon, h('span', { class: 'nm' }, h('b', null, M().name(spec.kind, id)), h('small', null, spec.sub ? spec.sub(id) : id)),
            st ? h('span', { class: 'flag ' + st }, { added: 'new', changed: 'changed', removed: 'deleted' }[st]) : null));
        }
      }
      if (!list.children.length) list.appendChild(h('p', { class: 'muted', style: { padding: '10px' } }, 'Nothing matches.'));
      const on = list.querySelector('.entry.on');
      if (on && !C.scrolled) {
        on.scrollIntoView({ block: 'nearest' });
        C.scrolled = true;
      }
    };
    C.scrolled = false;
    search.addEventListener('input', drawList);
    drawList();
    ED.listen('change', ED.debounce(drawList, 120));
    if (selected && M().exists(spec.kind, selected)) {
      try {
        spec.detail(detail, selected);
      } catch (e) {
        console.error(e);
        detail.appendChild(h('p', { class: 'error-text' }, 'Couldn’t show ' + selected + ': ' + e.message));
      }
    } else {
      detail.appendChild(h('div', { class: 'empty' }, h('h2', null, spec.emptyTitle || 'Pick one on the left'), h('p', null, spec.emptyText || '')));
    }
    return { refreshList: drawList };
  };
  C.lastSearch = {};

  /** The header of a detail page: preview, name, id, traits and the usual actions. */
  C.header = function (kind, id, o) {
    o = o || {};
    const st = M().status(kind, id);
    const d = M().raw(kind, id);
    const actions = h('div', { class: 'actions' });
    if (st === 'removed') {
      actions.appendChild(h('button', { class: 'btn', on: { click: () => M().restore(kind, id) } }, 'Restore'));
    } else {
      if (o.extraActions) o.extraActions.forEach((a) => actions.appendChild(a));
      actions.appendChild(h('button', { class: 'btn small', on: { click: () => C.duplicate(kind, id, o.base) } }, 'Duplicate'));
      if (o.ask) actions.appendChild(h('button', { class: 'btn small ai', on: { click: () => ED.go('/assistant/' + o.ask + '/' + encodeURIComponent(id)) } }, 'Change it with Claude'));
      if (st === 'changed') actions.appendChild(h('button', { class: 'btn small quiet', title: 'Go back to the original', on: { click: async () => { if (await ED.confirm('Undo every change to ' + M().name(kind, id) + '?', 'It goes back to the version in its pack file. (You can still undo this.)', 'Go back')) { M().revert(kind, id); ED.rerender(); } } } }, 'Back to original'));
      actions.appendChild(h('button', { class: 'btn small quiet danger', on: { click: () => C.remove(kind, id, o.base) } }, 'Delete'));
    }
    return h('div', { class: 'detail-head' },
      o.preview || null,
      h('div', { class: 'titles' },
        h('h2', null, M().name(kind, id)),
        h('div', { class: 'meta' }, id + '  ·  ' + (st === 'added' ? 'made in the editor' + (ED.model.edits().add[kind][id].$extends ? ', a copy of ' + ED.model.edits().add[kind][id].$extends : '') : 'from the ' + (d.pack || '?') + ' pack') + (st === 'changed' ? '  ·  changed' : st === 'removed' ? '  ·  deleted (restore it to keep it)' : '')),
        o.traits && o.traits.length ? h('div', { class: 'traits' }, o.traits.map((t) => h('span', { class: 'trait' }, t))) : null,
        o.lede ? h('p', { class: 'muted' }, o.lede) : null,
        actions));
  };

  C.duplicate = async function (kind, id, base) {
    const name = await ED.prompt('Duplicate ' + M().name(kind, id), 'Name of the copy', M().name(kind, id) + ' (copy)', 'Make the copy');
    if (!name) return;
    const nid = ED.uniqueId(name, (x) => M().exists(kind, x));
    M().duplicate(kind, id, nid, kind === 'levels' || kind === 'environments' || kind === 'items' || kind === 'enemies' || kind === 'weapons' || kind === 'armor' || kind === 'blessings' || kind === 'npcs' ? { name } : {});
    ED.toast('Made ' + name + ' (' + nid + ')', 'good');
    ED.go('/' + base + '/' + encodeURIComponent(nid));
  };
  C.remove = async function (kind, id, base) {
    const uses = M().usage(kind, id);
    const where = uses.length ? ' It is placed on ' + uses.map((u) => M().name('levels', u.level) + ' (' + u.count + ')').join(', ') + '; those spots will be empty.' : '';
    const ok = await ED.confirm('Delete ' + M().name(kind, id) + '?', (M().isAdded(kind, id) && !M().base(kind, id) ? 'It was made in the editor, so it goes away completely.' : 'It is taken out of the game; its pack file is left alone, and you can restore it here.') + where, 'Delete', true);
    if (!ok) return;
    M().remove(kind, id);
    ED.go('/' + base + (M().exists(kind, id) && M().isRemoved(kind, id) ? '/' + encodeURIComponent(id) : ''));
  };

  /** A form bound to a draft that commits as you type. Returns { draft, changed() }. */
  C.binder = function (kind, id) {
    const draft = M().draft(kind, id);
    const commit = ED.pendingCommit(() => M().commit(kind, id, draft), 300);
    return { draft, changed: () => commit(), flush: () => commit.flush() };
  };

  /** Every function in a definition, as editable code. */
  C.codeTab = function (kind, id, binder, names) {
    const d = binder.draft;
    const box = h('div');
    box.appendChild(h('p', { class: 'note section-note' }, 'The functions behind this ' + ({ items: 'item', enemies: 'monster', npcs: 'person' }[kind] || 'entry') + '. Most things can be changed on the other tabs without code. Edits here are saved as new code in packs/editor/edits.js; the original pack file isn’t touched.'));
    const fns = [];
    const walk = (obj, path, depth) => {
      if (!obj || depth > 2) return;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'function') fns.push([path.concat(k), v]);
        else if (ED.isPlain(v) && !['props', 'look', 'popup', 'slots', 'touch'].includes(k)) walk(v, path.concat(k), depth + 1);
      }
    };
    walk(d, [], 0);
    for (const n of names || []) if (!fns.some(([p]) => p.join('.') === n)) fns.push([n.split('.'), null]);
    const SIG = { draw: '(g, it, t, game)', drawGlow: '(g, it, t, game)', init: '(it, game)', update: '(it, dt, game)', onTouch: '(it, game)', 'interact.use': '(it, game)', 'interact.prompt': '(it, game)', 'interact.available': '(it, game)', onDeath: '(e, game)' };
    for (const [path, fn] of fns) {
      const key = path.join('.');
      const generated = d.look && (key === 'draw' || key === 'drawGlow');
      const det = h('details', { class: 'list-item' }, h('summary', null, h('div', { class: 'item-head' }, h('span', { class: 'item-title mono' }, key + ' ' + (SIG[key] || '')), fn && fn.__src && fn !== ED.model.base(kind, id)?.[key] ? h('span', { class: 'flag changed' }, 'edited') : null, generated ? h('span', { class: 'flag' }, 'replaced by the look') : null)));
      det.addEventListener('toggle', () => {
        if (!det.open || det.dataset.built) return;
        det.dataset.built = '1';
        det.appendChild(h('div', { class: 'item-body' }, F().code(fn ? ED.fnSource(fn) : '', (nf) => {
          let o = d;
          for (const p of path.slice(0, -1)) o = o[p] = o[p] || {};
          if (nf) o[path[path.length - 1]] = nf;
          else delete o[path[path.length - 1]];
          binder.changed();
        }, { name: kind + '/' + id + '/' + key })));
      });
      box.appendChild(det);
    }
    if (!fns.length) box.appendChild(h('p', { class: 'muted' }, 'No code: everything about it is data.'));
    return box;
  };

  // ------------------------------------------------------------ looks
  /** Edit how something is drawn. kind: 'items' | 'enemies'. */
  C.lookEditor = function (kind, id, binder) {
    const d = binder.draft;
    const base = M().base(kind, id) || (M().isAdded(kind, id) && M().edits().add[kind][id].$extends ? M().base(kind, M().edits().add[kind][id].$extends) : null);
    const hasOriginal = !!(base && base.draw);
    const mode = () => (d.look ? (d.look.type === 'sprite' ? 'picture' : d.look.type === 'sheet' ? 'sheet' : 'built') : d.draw && (!base || d.draw !== base.draw) ? 'code' : hasOriginal ? 'original' : d.draw ? 'code' : 'built');
    const box = h('div', { class: 'look' });
    const body = h('div');
    const lookType = kind === 'enemies' ? 'creature' : 'object';
    const modes = [];
    if (hasOriginal) modes.push(['original', 'Original drawing (from the pack’s code)']);
    modes.push(['built', 'Built from settings (no code)'], ['picture', 'A picture']);
    if (kind === 'enemies') modes.push(['sheet', 'A sprite sheet (animated)']);
    modes.push(['code', 'My own drawing code']);
    const setMode = (m) => {
      if (m === 'original') {
        delete d.look;
        if (base) {
          d.draw = base.draw;
          if (base.drawGlow) d.drawGlow = base.drawGlow;
          else delete d.drawGlow;
        }
      } else if (m === 'built') {
        d.look = kind === 'enemies' ? { type: 'creature', shape: 'humanoid', body: d.color || '#6b7a63', eyes: '#ff5a3a' } : { type: 'object', shape: 'box', color: '#7a5530' };
      } else if (m === 'picture') {
        d.look = { type: 'sprite', sprite: M().spriteIds()[0] || '', size: Math.round((d.radius || 10) * 2.6), facing: 'right' };
      } else if (m === 'sheet') {
        d.look = { type: 'sheet', sprite: '', frame: [64, 64], size: Math.round((d.radius || 10) * 3.4), layout: 'rotate', facing: 'right', anims: ED.engine.X.SHEET.defaults('rotate') };
      } else if (m === 'code') {
        delete d.look;
        if (!d.draw) d.draw = ED.engine.compile(kind === 'enemies' ? 'function (g, e, t) {\n  g.rotate(e.facing);\n  g.fillStyle = \'#8a6a5a\';\n  g.beginPath();\n  g.arc(0, 0, e.r, 0, U.TAU);\n  g.fill();\n}' : 'function (g, it, t) {\n  g.fillStyle = \'#8a6a5a\';\n  g.fillRect(-8, -8, 16, 16);\n}');
      }
      binder.changed();
      draw();
    };
    const draw = () => {
      ED.clear(body);
      const m = mode();
      body.appendChild(F().field('Drawn as', F().select(m, modes, setMode)));
      if (m === 'built') body.appendChild(C.builtLook(d.look, lookType, () => binder.changed()));
      if (m === 'picture') body.appendChild(C.pictureLook(kind, id, d, () => binder.changed()));
      if (m === 'sheet') body.appendChild(C.sheetLook(kind, id, d, () => binder.changed()));
      if (m === 'code') {
        body.appendChild(F().field('Body', F().code(ED.fnSource(d.draw) || '', (fn) => { if (fn) d.draw = fn; binder.changed(); }, { name: kind + '/' + id + '/draw' }), kind === 'enemies' ? 'function (g, e, t): g is already moved to the monster; call g.rotate(e.facing) to face where it walks. e.r is its radius.' : 'function (g, it, t): g is already moved to the item. it.props holds its placement settings.'));
        body.appendChild(F().field('Glow', F().code(ED.fnSource(d.drawGlow) || '', (fn) => { if (fn) d.drawGlow = fn; else delete d.drawGlow; binder.changed(); }, { name: kind + '/' + id + '/drawGlow', rows: 6 }), kind === 'enemies' ? 'Drawn in world space (use e.x, e.y), added as light. eyes(g, e, colour, spread, forward, size) draws glowing eyes.' : 'Drawn after the lighting, added as light. G.glow(g, x, y, radius, colour, alpha).'));
      }
      if (m === 'original') body.appendChild(h('p', { class: 'muted' }, 'Drawn by the code in its pack file. Pick another option to replace it; you can switch back any time.'));
    };
    draw();
    box.appendChild(body);
    box.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Making a picture for it'), C.imagePromptBox(kind, id, d)));
    return box;
  };

  C.builtLook = function (look, type, changed) {
    const X = ED.engine.X;
    const box = h('div', { class: 'subform built-look' });
    const set = (k) => (v) => {
      if (v === undefined || v === '') delete look[k];
      else look[k] = v;
      changed();
    };
    if (type === 'creature') {
      box.append(
        F().field('Body shape', F().select(look.shape || 'humanoid', X.looks.creature.SHAPES, set('shape'))),
        F().field('Body', F().color(look.body, set('body'))),
        F().field('Outline', F().color(look.outline, set('outline'), { allowEmpty: true })),
        F().field('Head', F().color(look.head, set('head'), { allowEmpty: true })),
        F().field('Limbs', F().color(look.limbs, set('limbs'), { allowEmpty: true })),
        F().field('Eyes', F().color(look.eyes, set('eyes'), { allowEmpty: true })),
        F().field('Aura', F().color(look.glow, set('glow'), { allowEmpty: true })),
        F().field('Accent', F().color(look.accent, set('accent'), { allowEmpty: true })));
      const extras = h('div', { class: 'chips' });
      for (const x of X.looks.creature.EXTRAS) {
        extras.appendChild(F().bool((look.extras || []).includes(x), (on) => {
          const s = new Set(look.extras || []);
          if (on) s.add(x);
          else s.delete(x);
          set('extras')(s.size ? [...s] : undefined);
        }, x));
      }
      return h('div', null, box, F().field('Extras', extras));
    }
    box.append(
      F().field('Shape', F().select(look.shape || 'box', X.looks.object.SHAPES, set('shape'))),
      F().field('Colour', F().color(look.color, set('color'))),
      F().field('Trim', F().color(look.trim, set('trim'), { allowEmpty: true })),
      F().field('Accent', F().color(look.accent, set('accent'), { allowEmpty: true })),
      F().field('Glow', F().color(look.glow, set('glow'), { allowEmpty: true })),
      F().field('Glow size', F().number(look.glowSize, set('glowSize'))),
      F().field('Scale', F().number(look.scale, set('scale'), { step: 0.1, placeholder: 1 })));
    return box;
  };

  C.pictureLook = function (kind, id, d, changed) {
    const look = d.look;
    const set = (k) => (v) => {
      if (v === undefined || v === '') delete look[k];
      else look[k] = v;
      changed();
    };
    const pics = M().spriteIds();
    const box = h('div');
    box.appendChild(h('div', { class: 'row' },
      F().field('Picture', F().select(look.sprite, [[undefined, pics.length ? '(choose)' : '(no pictures yet)']].concat(pics.map((p) => [p, p])), (v) => { set('sprite')(v); ED.rerender(); })),
      look.sprite ? ED.preview.spriteImg(look.sprite, 56) : null,
      h('button', { class: 'btn small', on: { click: () => C.importPicture(id, (sid) => { look.sprite = sid; changed(); ED.rerender(); }) } }, 'Import a picture…')));
    box.appendChild(h('div', { class: 'subform' },
      F().field('Size (units across)', F().number(look.size, set('size'))),
      kind === 'enemies' ? F().field('The picture faces', F().select(look.facing || 'right', [['right', 'right'], ['up', 'up'], ['left', 'left'], ['down', 'down']], set('facing'))) : null,
      kind === 'enemies' ? F().field('Turns to face where it moves', F().bool(look.rotate !== false, (v) => set('rotate')(v ? undefined : false))) : null,
      F().field('Glow', F().color(look.glow, set('glow'), { allowEmpty: true })),
      kind === 'enemies' ? F().field('Glowing eyes', F().color(look.eyes, set('eyes'), { allowEmpty: true })) : null,
      F().field('Bobs', F().bool(look.bob, set('bob')))));
    return box;
  };


  // ------------------------------------------------------------ animated sprite sheets
  /** Edit a sprite-sheet look: the sheet, its grid, which row is which animation, and live previews. */
  C.sheetLook = function (kind, id, d, changed) {
    const look = d.look;
    const X = ED.engine.X;
    const set = (k) => (v) => {
      if (v === undefined || v === '') delete look[k];
      else look[k] = v;
      changed();
      refresh();
    };
    const pics = M().spriteIds();
    const box = h('div', { class: 'sheet-look' });
    const fw = () => (look.frame && look.frame[0]) || 64, fh = () => (look.frame && look.frame[1]) || fw();
    const img = new Image();
    const load = () => {
      const src = look.sprite && M().sprites[look.sprite];
      if (src && img.src !== src) img.src = src;
    };
    load();
    // the sheet, with its grid drawn over it
    const sheetCanvas = h('canvas', { class: 'sheet-grid' });
    const drawSheet = () => {
      if (!img.complete || !img.naturalWidth) return;
      const k = Math.min(1, 460 / img.naturalWidth);
      sheetCanvas.width = Math.round(img.naturalWidth * k);
      sheetCanvas.height = Math.round(img.naturalHeight * k);
      const g = sheetCanvas.getContext('2d');
      g.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
      g.drawImage(img, 0, 0, sheetCanvas.width, sheetCanvas.height);
      g.strokeStyle = 'rgba(255, 64, 160, 0.6)';
      g.lineWidth = 1;
      for (let x = 0; x <= img.naturalWidth; x += fw()) { g.beginPath(); g.moveTo(x * k + 0.5, 0); g.lineTo(x * k + 0.5, sheetCanvas.height); g.stroke(); }
      for (let y = 0; y <= img.naturalHeight; y += fh()) { g.beginPath(); g.moveTo(0, y * k + 0.5); g.lineTo(sheetCanvas.width, y * k + 0.5); g.stroke(); }
    };
    img.onload = () => { drawSheet(); checkFit(); };
    const fit = h('p', { class: 'hint' });
    const checkFit = () => {
      if (!img.naturalWidth) return fit.textContent = '';
      const cols = img.naturalWidth / fw(), rows = img.naturalHeight / fh();
      const ok = Number.isInteger(cols) && Number.isInteger(rows);
      fit.textContent = (ok ? '' : '⚠ ') + 'The sheet is ' + img.naturalWidth + ' × ' + img.naturalHeight + ' pixels: ' + (ok ? cols + ' columns × ' + rows + ' rows of ' + fw() + ' × ' + fh() + ' frames.' : 'that isn’t a whole number of ' + fw() + ' × ' + fh() + ' frames. Check the frame size.');
      fit.classList.toggle('warn', !ok);
    };
    box.appendChild(h('div', { class: 'row' },
      F().field('Sprite sheet', F().select(look.sprite, [[undefined, pics.length ? '(choose)' : '(no pictures yet)']].concat(pics.map((p) => [p, p])), (v) => { set('sprite')(v); load(); })),
      h('button', { class: 'btn small', on: { click: () => C.importPicture(id + '-sheet', (sid) => { look.sprite = sid; changed(); ED.rerender(); }, { sheet: true }) } }, 'Import a sprite sheet…')));
    box.appendChild(h('p', { class: 'muted' }, 'Start from a template (open it in your art program, draw on a layer above it, hide the guide, export a transparent PNG): ',
      h('a', { href: 'templates/monster-sheet-64.png', download: '' }, 'monster, 64 px frames'), ' · ',
      h('a', { href: 'templates/monster-sheet-128.png', download: '' }, 'big monster or boss, 128 px'), ' · ',
      h('a', { href: 'templates/monster-sheet-4dir-64.png', download: '' }, 'four directions, 64 px'), ' · ',
      h('a', { href: 'templates/example-beetle-64.png', download: '' }, 'a finished example'), ' · ',
      h('a', { href: 'templates/SPRITE-SHEETS.md', target: '_blank' }, 'the guide')));
    box.appendChild(h('div', { class: 'subform' },
      F().field('Frame width (pixels)', F().number(fw(), (v) => { look.frame = [v || 64, fh()]; changed(); refresh(); }, { min: 8, max: 512 })),
      F().field('Frame height (pixels)', F().number(fh(), (v) => { look.frame = [fw(), v || fw()]; changed(); refresh(); }, { min: 8, max: 512 })),
      F().field('Layout', F().select(look.layout || 'rotate', [['rotate', 'Seen from above; the game turns it (one row per animation)'], ['4dir', 'Four directions (rows: down, left, right, up)']], (v) => {
        look.layout = v;
        look.anims = X.SHEET.defaults(v);
        changed();
        ED.rerender();
      })),
      (look.layout || 'rotate') === 'rotate' ? F().field('The drawing faces', F().select(look.facing || 'right', [['right', 'right'], ['up', 'up'], ['left', 'left'], ['down', 'down']], set('facing'))) : null,
      F().field('Size in the game (units across one frame)', F().number(look.size, set('size')), 'A tile is 32 units. About 3.4 × the monster’s radius suits a frame with a little room around the body.'),
      F().field('Pixel art (keep pixels sharp)', F().bool(look.pixelated, (v) => set('pixelated')(v || undefined))),
      F().field('Glow', F().color(look.glow, set('glow'), { allowEmpty: true })),
      F().field('Glowing eyes', F().color(look.eyes, set('eyes'), { allowEmpty: true })),
      F().field('Seconds the body stays after the death animation', F().number(look.linger, set('linger'), { min: 0, max: 60, placeholder: 6 }))));
    // the animations: which row, how many frames, how fast, with a live preview of each
    look.anims = look.anims || X.SHEET.defaults(look.layout);
    const table = h('table', { class: 'sheet-anims' },
      h('tr', null, h('th', null, 'Animation'), h('th', null, (look.layout === '4dir' ? 'First row' : 'Row') + ' (from 0)'), h('th', null, 'Frames'), h('th', null, 'Frames a second'), h('th', null, 'Hit frame'), h('th', null, 'Preview')));
    const previews = [];
    const WHEN = { idle: 'standing still', walk: 'moving', attack: 'attacking (timed to its wind-up)', hurt: 'just hit', death: 'dying (then stays a while)' };
    for (const name of X.SHEET.ANIMS) {
      const a = (look.anims[name] = look.anims[name] || {});
      const num = (k, o) => F().number(a[k], (v) => { if (v === undefined || v === '') delete a[k]; else a[k] = v; changed(); }, o);
      const cv = h('canvas', { width: 64, height: 64, class: 'sheet-preview' });
      previews.push({ cv, name });
      table.appendChild(h('tr', null,
        h('td', null, h('b', null, name), h('br'), h('small', { class: 'muted' }, WHEN[name])),
        h('td', null, num('row', { min: 0, max: 99 })), h('td', null, num('frames', { min: 0, max: 64 })), h('td', null, num('fps', { min: 1, max: 60 })),
        h('td', null, name === 'attack' ? num('hit', { min: 0, max: 63 }) : null), h('td', null, cv)));
    }
    box.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Animations'),
      h('p', { class: 'muted' }, 'Set Frames to 0 for an animation the sheet doesn’t have (the monster then uses its idle or walk frames). The attack plays its frames before the hit frame during the wind-up, so the blow lands on the hit frame.'),
      table));
    box.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'The sheet'), fit, sheetCanvas));
    // animate the previews while this page is on screen
    const t0 = performance.now();
    const tick = () => {
      if (!box.isConnected) return;
      if (img.complete && img.naturalWidth) {
        const t = (performance.now() - t0) / 1000;
        for (const p of previews) {
          const a = X.sheetAnim(look, p.name);
          const g = p.cv.getContext('2d');
          g.clearRect(0, 0, 64, 64);
          g.fillStyle = '#2a2622';
          g.fillRect(0, 0, 64, 64);
          if (!a) continue;
          const i = Math.floor(t * (a.fps || 8)) % a.frames;
          const row = a.row + (look.layout === '4dir' ? 2 : 0); // the right-facing row
          g.imageSmoothingEnabled = !look.pixelated;
          const k = Math.min(64 / fw(), 64 / fh());
          g.drawImage(img, i * fw(), row * fh(), fw(), fh(), 32 - (fw() * k) / 2, 32 - (fh() * k) / 2, fw() * k, fh() * k);
        }
      }
      requestAnimationFrame(tick);
    };
    const refresh = () => { drawSheet(); checkFit(); };
    requestAnimationFrame(tick);
    setTimeout(refresh, 0);
    return box;
  };

  /** Import an image file as a sprite: trims, optionally clears a flat background, scales to 160px (o.sheet: kept exactly as drawn). */
  C.importPicture = async function (suggestId, done, o) {
    o = o || {};
    const file = await ED.pickFile('image/*');
    if (!file) return;
    const url = await ED.readFile(file, 'dataURL');
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('That file isn’t a picture the browser can read.'));
      i.src = url;
    });
    let clearBg = !o.tile && !o.sheet, tol = 40, trim = !o.tile && !o.sheet, max = o.sheet ? 4096 : o.tile ? 64 : 160;
    const out = h('canvas');
    const before = h('canvas');
    const name = h('input', { type: 'text', value: ED.uniqueId(suggestId || file.name.replace(/\.\w+$/, ''), (x) => !!M().sprites[x]) });
    const render = () => {
      const r = C.processImage(img, { clearBg, tol, trim, max });
      out.width = r.width;
      out.height = r.height;
      out.style.width = Math.min(220, r.width * 1.4) + 'px';
      out.getContext('2d').drawImage(r, 0, 0);
    };
    before.width = Math.min(220, img.width);
    before.height = Math.round((before.width / img.width) * img.height);
    before.getContext('2d').drawImage(img, 0, 0, before.width, before.height);
    render();
    ED.modal({
      title: o.sheet ? 'Import a sprite sheet' : 'Import a picture', wide: true,
      body: h('div', null,
        h('div', { class: 'img-edit' }, h('div', null, h('p', { class: 'muted' }, 'Original'), before), h('div', null, h('p', { class: 'muted' }, 'In the game'), out)),
        h('div', { class: 'subform', style: { marginTop: '12px' } },
          F().field('Name', name),
          F().field('Remove a plain background', F().bool(clearBg, (v) => { clearBg = v; render(); })),
          F().field('Background tolerance', F().number(tol, (v) => { tol = v || 0; render(); }, { min: 0, max: 200 })),
          o.sheet ? null : F().field('Trim empty edges', F().bool(trim, (v) => { trim = v; render(); })),
          o.sheet ? null : F().field('Largest side (pixels)', F().number(max, (v) => { max = v || 160; render(); }, { min: 16, max: 512 }))),
        h('p', { class: 'hint' }, o.sheet
          ? 'A sprite sheet is used exactly as drawn: one frame per grid cell, nothing trimmed or resized. Use a transparent PNG (leave “Remove a plain background” off). Sheets are saved into packs/editor/sprites.js, so keep them under about 1 MB.'
          : 'Pictures are saved into packs/editor/sprites.js, so the single-file build carries them too. Keep them small: a top-down sprite reads best at 64 to 160 pixels.')),
      actions: [{ label: 'Cancel', quiet: true }, { label: o.sheet ? 'Use this sheet' : 'Use this picture', primary: true, onClick: () => {
        const id = ED.slug(name.value) || 'picture';
        M().setSprite(id, out.toDataURL('image/png'), 'Import picture ' + id);
        done(id);
      } }],
    });
  };
  C.processImage = function (img, o) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = w0;
    c.height = h0;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    let data = g.getImageData(0, 0, w0, h0);
    if (o.clearBg) {
      const px = data.data;
      const corners = [[0, 0], [w0 - 1, 0], [0, h0 - 1], [w0 - 1, h0 - 1]].map(([x, y]) => {
        const i = (y * w0 + x) * 4;
        return [px[i], px[i + 1], px[i + 2]];
      });
      const bg = corners[0];
      const tol = o.tol;
      // flood from the edges so only the connected background goes, not matching colours inside
      const seen = new Uint8Array(w0 * h0);
      const stack = [];
      const near = (i) => Math.abs(px[i * 4] - bg[0]) + Math.abs(px[i * 4 + 1] - bg[1]) + Math.abs(px[i * 4 + 2] - bg[2]) <= tol;
      for (let x = 0; x < w0; x++) stack.push(x, (h0 - 1) * w0 + x);
      for (let y = 0; y < h0; y++) stack.push(y * w0, y * w0 + w0 - 1);
      while (stack.length) {
        const i = stack.pop();
        if (seen[i] || !near(i)) continue;
        seen[i] = 1;
        px[i * 4 + 3] = 0;
        const x = i % w0, y = (i / w0) | 0;
        if (x > 0) stack.push(i - 1);
        if (x < w0 - 1) stack.push(i + 1);
        if (y > 0) stack.push(i - w0);
        if (y < h0 - 1) stack.push(i + w0);
      }
      g.putImageData(data, 0, 0);
    }
    let sx = 0, sy = 0, sw = w0, sh = h0;
    if (o.trim) {
      data = g.getImageData(0, 0, w0, h0);
      const px = data.data;
      let x0 = w0, y0 = h0, x1 = -1, y1 = -1;
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) if (px[(y * w0 + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      if (x1 >= x0) {
        sx = x0;
        sy = y0;
        sw = x1 - x0 + 1;
        sh = y1 - y0 + 1;
      }
    }
    const k = Math.min(1, o.max / Math.max(sw, sh));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(sw * k));
    out.height = Math.max(1, Math.round(sh * k));
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return out;
  };

  /** A ready-to-copy prompt for an image generator, written from the definition. */
  C.imagePromptText = function (kind, d) {
    const name = d.name || 'thing';
    const colours = [];
    const look = d.look || {};
    for (const k of ['body', 'color', 'head', 'accent', 'glow', 'eyes']) if (look[k]) colours.push(k + ' ' + look[k]);
    if (kind === 'enemies' && look.type === 'sheet') {
      const fw = (look.frame && look.frame[0]) || 64;
      return 'A sprite sheet for a top-down game monster called “' + name + '”, for a dark, torch-lit dungeon shooter. A transparent PNG laid out as a grid of ' + fw + ' × ' + fw + ' pixel frames, 8 columns wide. ' +
        'Every frame shows the monster from directly above, facing right, centred in its frame, the same size in every frame, with a dark 1-pixel outline. Rows, top to bottom: ' +
        'row 1 idle (4 frames, gentle breathing), row 2 walk (6 frames, a full stride loop), row 3 attack (6 frames: 3 wind-up, the strike on frame 4, 2 recovery), row 4 hurt (2 frames, recoiling), row 5 death (6 frames, collapsing, ending on a still body). ' +
        'Unused cells stay empty. No text, no grid lines, no shadow on the ground, no background' + (colours.length ? '. Colours: ' + colours.join(', ') : '') + '.';
    }
    if (kind === 'enemies') {
      const atk = (d.attacks || []).map((a) => a.type).join(' and ');
      return 'A single top-down game sprite of “' + name + '”, a monster for a dark, torch-lit dungeon shooter. Seen from directly above, facing right, centred, whole body visible, ' +
        'on a plain flat ' + (look.glow ? 'black' : 'white') + ' background with nothing else in the picture. Painterly but readable at small size, strong silhouette, muted earthy colours with one glowing accent' + (colours.length ? ' (' + colours.join(', ') + ')' : '') + '. ' +
        (atk ? 'It fights with ' + atk + ' attacks, so show that in its shape. ' : '') + 'No text, no border, no shadow on the ground, no perspective tilt. Square image.';
    }
    if (kind === 'environments') {
      return 'A seamless, tileable top-down floor texture for a dark dungeon game tile set called “' + name + '”. Viewed from directly above, evenly lit, no perspective, no objects, no shadows from walls. Fine detail that still reads at 32 pixels. Square image.';
    }
    return 'A single top-down game sprite of “' + name + '”, an object in a dark, torch-lit dungeon game. Seen from directly above, centred, on a plain flat white background with nothing else in the picture. ' +
      'Clean silhouette that reads at small size' + (colours.length ? ', colours: ' + colours.join(', ') : '') + '. No text, no border, no perspective tilt. Square image.';
  };
  C.imagePromptBox = function (kind, id, d) {
    const ta = h('textarea', { rows: 5, class: 'mono' });
    ta.value = C.imagePromptText(kind, d);
    return h('div', null,
      h('p', { class: 'muted' }, 'Copy this into an image generator, save the result, then use “A picture” above to import it. Or ask Claude to draw it in code, in the game’s own style.'),
      ta,
      h('div', { class: 'row', style: { marginTop: '6px' } },
        h('button', { class: 'btn small', on: { click: async () => { if (await ED.copyText(ta.value)) ED.toast('Copied the image prompt'); } } }, 'Copy'),
        h('button', { class: 'btn small', on: { click: () => (ta.value = C.imagePromptText(kind, d)) } }, 'Rewrite from current settings'),
        h('button', { class: 'btn small ai', on: { click: () => ED.go('/assistant/' + (kind === 'enemies' ? 'monster-look' : 'item-look') + '/' + encodeURIComponent(id)) } }, 'Ask Claude to draw it in code')));
  };

  /** Links to the floors where something is placed. */
  C.usageBox = function (kind, id) {
    const u = M().usage(kind, id);
    if (!u.length) return h('p', { class: 'muted' }, 'Not placed on any floor yet. Open a floor in the map editor and paint it from the palette.');
    return h('div', { class: 'usage' }, u.map((x) => h('a', { class: 'btn small', href: '#/map/' + encodeURIComponent(x.level) + '/find/' + encodeURIComponent(kind + ':' + id) }, M().name('levels', x.level) + ' · ' + x.count)));
  };
})();
