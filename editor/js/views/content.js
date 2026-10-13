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
    const mode = () => (d.look ? (d.look.type === 'sprite' ? 'picture' : 'built') : d.draw && (!base || d.draw !== base.draw) ? 'code' : hasOriginal ? 'original' : d.draw ? 'code' : 'built');
    const box = h('div', { class: 'look' });
    const body = h('div');
    const lookType = kind === 'enemies' ? 'creature' : 'object';
    const modes = [];
    if (hasOriginal) modes.push(['original', 'Original drawing (from the pack’s code)']);
    modes.push(['built', 'Built from settings (no code)'], ['picture', 'A picture'], ['code', 'My own drawing code']);
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

  /** Import an image file as a sprite: trims, optionally clears a flat background, scales to 160px. */
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
    let clearBg = !o.tile, tol = 40, trim = !o.tile, max = o.tile ? 64 : 160;
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
      title: 'Import a picture', wide: true,
      body: h('div', null,
        h('div', { class: 'img-edit' }, h('div', null, h('p', { class: 'muted' }, 'Original'), before), h('div', null, h('p', { class: 'muted' }, 'In the game'), out)),
        h('div', { class: 'subform', style: { marginTop: '12px' } },
          F().field('Name', name),
          F().field('Remove a plain background', F().bool(clearBg, (v) => { clearBg = v; render(); })),
          F().field('Background tolerance', F().number(tol, (v) => { tol = v || 0; render(); }, { min: 0, max: 200 })),
          F().field('Trim empty edges', F().bool(trim, (v) => { trim = v; render(); })),
          F().field('Largest side (pixels)', F().number(max, (v) => { max = v || 160; render(); }, { min: 16, max: 512 }))),
        h('p', { class: 'hint' }, 'Pictures are saved into packs/editor/sprites.js, so the single-file build carries them too. Keep them small: a top-down sprite reads best at 64 to 160 pixels.')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Use this picture', primary: true, onClick: () => {
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
