/* Linear Maze Editor — js/views/tilesets.js
 * Tile sets (environments): the palettes and painters that draw every floor and
 * wall, plus the darkness, light colours, particles and drone of a floor. And tile
 * types (terrain): what each kind of tile does.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model, C = () => ED.content;

  ED.views.tilesets = {
    title: 'Tile sets',
    full: true,
    render(el, args) {
      const sub = args[0] === 'types' ? 'types' : 'sets';
      const id = args[1] || (args[0] && args[0] !== 'sets' && args[0] !== 'types' ? args[0] : undefined);
      const switcher = F().select(sub, [['sets', 'Tile sets'], ['types', 'Tile types']], (v) => ED.go('/tilesets/' + v), { cls: 'sub-select' });
      if (sub === 'sets') {
        C().page(el, {
          kind: 'environments', base: 'tilesets/sets', title: 'Tile sets', extraHead: switcher, askTask: 'tileset',
          newLabel: 'New tile set', onNew: () => newSet(),
          group: (i) => ({ core: 'Core', office: 'Office', chessboard: 'Chessboard', editor: 'Made in the editor' }[M().raw('environments', i).pack] || M().raw('environments', i).pack),
          icon: (i) => swatchCanvas(i, 'floor', 0, 34),
          sub: (i) => paletteSummary(M().raw('environments', i)),
          detail: setDetail,
          emptyTitle: 'Tile sets',
          emptyText: 'A tile set gives a floor its materials (floor and wall painters with their colours), its darkness and light colours, its floating particles and its background drone. Every floor uses one. Make a new one by copying a set and changing its colours, from pictures, or by asking Claude.',
        }, id);
      } else {
        C().page(el, {
          kind: 'terrain', base: 'tilesets/types', title: 'Tile types', extraHead: switcher,
          newLabel: 'New tile type', onNew: () => newTerrain(),
          group: (i) => ({ core: 'Core', office: 'Office', chessboard: 'Chessboard', editor: 'Made in the editor' }[M().raw('terrain', i).pack] || M().raw('terrain', i).pack),
          icon: (i) => swatchCanvas(ED.preview.defaultEnv(), i, 0, 34),
          sub: (i) => terrainTraits(M().raw('terrain', i)).join(', '),
          detail: terrainDetail,
          emptyTitle: 'Tile types',
          emptyText: 'What each kind of tile does: walls block, water slows, pits swallow, spikes and slag hurt, doors open. The tile set decides how they look.',
        }, id);
      }
    },
  };

  function swatchCanvas(envId, terrainId, variant, size) {
    const src = ED.preview.tileSwatch(envId, terrainId, variant, 96);
    const c = h('canvas', { class: 'icon', width: 96, height: 96 });
    c.style.width = c.style.height = size + 'px';
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }
  const paletteSummary = (env) => [env.floor && env.floor.style, env.wall && env.wall.style].filter(Boolean).join(' floor, ') + (env.wall ? ' walls' : '');
  const terrainTraits = (t) => {
    const out = [];
    if (t.solid) out.push('solid');
    if (t.door) out.push('door' + (t.door.lock ? ' (' + t.door.lock + ' key)' : ''));
    if (t.hazard) out.push(t.hazard === 'pit' ? 'pit' : 'hurts');
    if (t.swim) out.push('water');
    if (t.entry) out.push('start');
    if (t.exit) out.push('exit');
    if (!out.length) out.push(t.floorLike ? 'floor' : 'open');
    return out;
  };

  async function newSet() {
    const src = h('select');
    for (const [v, l] of F().idOptions('environments')) src.appendChild(h('option', { value: v }, l));
    const name = h('input', { type: 'text', placeholder: 'Name, e.g. Drowned Library' });
    ED.modal({
      title: 'New tile set',
      body: h('div', null, F().field('Name', name), F().field('Start from a copy of', src), h('p', { class: 'hint' }, 'Or ', h('a', { href: '#/assistant/tileset' }, 'describe it to Claude'), ' and it will pick painters and colours (and can write new painters).')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: () => {
        if (!name.value.trim()) return false;
        const id = ED.uniqueId(name.value, (x) => M().exists('environments', x));
        M().duplicate('environments', src.value, id, { name: name.value.trim() });
        ED.go('/tilesets/sets/' + encodeURIComponent(id));
      } }],
    });
  }
  async function newTerrain() {
    const src = h('select');
    for (const [v, l] of F().idOptions('terrain')) src.appendChild(h('option', { value: v, selected: v === 'slag' }, l));
    const name = h('input', { type: 'text', placeholder: 'Name, e.g. lava or thin-ice' });
    ED.modal({
      title: 'New tile type',
      body: h('div', null, F().field('Name', name), F().field('Behaves and looks like', src, 'Copy the closest one, then change what it does. Its drawing comes from the tile it copies.')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: () => {
        if (!name.value.trim()) return false;
        const id = ED.uniqueId(name.value, (x) => M().exists('terrain', x));
        M().duplicate('terrain', src.value, id, { name: name.value.trim() });
        ED.go('/tilesets/types/' + encodeURIComponent(id));
      } }],
    });
  }

  // ------------------------------------------------------------ a tile set
  const SAMPLE = [
    '##############',
    '#....,,,,....#',
    '#.o..,,,,..o.#',
    '#....,,,,....#',
    '+....~~~~..OO#',
    '#..^^~~~~..OO#',
    '#....,,,,....#',
    '##R####+######',
  ];
  function sampleRoom(envId) {
    const LM = ED.engine.LM;
    const env = M().get('environments', envId);
    const rows = SAMPLE.slice();
    if (env.slag) rows[5] = '#..%%~~~~..OO#';
    const legend = { '#': { terrain: 'wall' }, ',': { terrain: 'floor', variant: 1 }, o: { terrain: 'pillar' }, '~': { terrain: 'water' }, O: { terrain: 'pit' }, '^': { terrain: 'spikes' }, '%': { terrain: 'slag' }, '+': { terrain: 'door' }, R: { terrain: 'door-red' } };
    try {
      const big = ED.preview.bakeTiles(envId, rows, legend, 1.5);
      big.className = 'preview';
      big.style.width = Math.round(big.width / 1.5 * 1.25) + 'px';
      big.style.borderRadius = '8px';
      return big;
    } catch (e) {
      return h('p', { class: 'error-text' }, 'Can’t draw this tile set: ' + e.message);
    }
  }
  function setDetail(el, id) {
    const b = C().binder('environments', id);
    const d = b.draft;
    const previewBox = h('div', null, sampleRoom(id));
    const refresh = ED.debounce(() => previewBox.replaceChildren(sampleRoom(id), variantsRow(id)), 400);
    const changed = () => {
      b.changed();
      refresh();
    };
    previewBox.appendChild(variantsRow(id));
    const levels = M().levelOrder().filter((l) => M().raw('levels', l).environment === id);
    el.appendChild(C().header('environments', id, { base: 'tilesets/sets', preview: null, lede: levels.length ? 'Used by ' + levels.map((l) => M().raw('levels', l).name).join(', ') + '.' : 'Not used by any floor yet. Choose it in a floor’s settings in the map editor.', ask: 'tileset-edit' }));
    el.appendChild(previewBox);
    el.appendChild(ED.tabs([
      { id: 'light', label: 'Light and mood', render: () => h('div', null, F().form(d, SC().environmentTop, changed), particlesBlock(d, changed), ambienceBlock(d, changed)) },
      { id: 'materials', label: 'Floors and walls', render: () => materialsTab(id, d, changed) },
      { id: 'pictures', label: 'From pictures', render: () => picturesTab(id, d, changed) },
      { id: 'json', label: 'All values', render: () => F().json(stripFns(d), (v) => { if (v) { for (const k of Object.keys(d)) if (k !== 'id' && k !== 'pack' && typeof d[k] !== 'function') delete d[k]; Object.assign(d, v); changed(); } }, { rows: 24 }) },
    ], ED.store.get('envTab', 'materials'), (t) => ED.store.set('envTab', t)));
  }
  const stripFns = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'function' || k === 'id' || k === 'pack' ? undefined : v)));

  function variantsRow(id) {
    const env = M().get('environments', id);
    const row = h('div', { class: 'swatches', style: { marginTop: '10px' } });
    const add = (label, t, v) => row.appendChild(h('div', { style: { textAlign: 'center' } }, swatchCanvas(id, t, v, 64), h('div', { class: 'muted', style: { fontSize: '11px' } }, label)));
    add('floor', 'floor', 0);
    if (env.floorAlt) add(', floor', 'floor', 1);
    if (env.floors) for (const k of Object.keys(env.floors)) if (+k > 1 || (+k === 1 && !env.floorAlt)) add('floor ' + k, 'floor', +k);
    add('wall', 'wall', 0);
    add('door', 'door', 0);
    add('water', 'water', 0);
    add('pit', 'pit', 0);
    if (env.slag) add('slag', 'slag', 0);
    add('pillar', 'pillar', 0);
    add('entry', 'entry', 0);
    add('exit', 'exit', 0);
    return row;
  }

  /** A palette from another tile set that uses this painter, to fill in keys it needs. */
  function templateFor(style) {
    for (const eid of M().ids('environments')) {
      const env = M().raw('environments', eid);
      const blocks = [env.floor, env.floorAlt, env.wall].concat(env.floors ? Object.values(env.floors) : []);
      const hit = blocks.find((b) => b && b.style === style);
      if (hit) return ED.clone(hit);
    }
    return { style };
  }
  function paletteEditor(pal, kind, changed, onReplace) {
    const box = h('div', { class: 'subform' });
    const textures = M().ids('textures').filter((t) => (M().raw('textures', t).kind || 'floor') === kind);
    box.appendChild(F().field('Painter', F().select(pal.style, textures.map((t) => [t, t]), (v) => {
      const next = Object.assign(templateFor(v), Object.fromEntries(Object.entries(pal).filter(([k]) => k !== 'style')));
      next.style = v;
      // keep only keys the new painter's template knows about, plus colours we already had
      onReplace(next);
    }), 'The pattern. Each painter reads its own colours below.'));
    for (const [k, v] of Object.entries(pal)) {
      if (k === 'style') continue;
      const set = (x) => {
        if (x === undefined) delete pal[k];
        else pal[k] = x;
        changed();
      };
      let ctl;
      if (k === 'images' || k === 'topImage' || k === 'faceImage' || k === 'image') ctl = h('span', { class: 'muted' }, 'picture: see “From pictures”');
      else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) ctl = colorList(v, set);
      else if (typeof v === 'string' && /^(#|rgb)/.test(v)) ctl = F().color(v, set);
      else if (typeof v === 'number') ctl = F().number(v, set, { step: 0.05 });
      else if (typeof v === 'string') ctl = F().text(v, set);
      else ctl = F().json(v, set, { rows: 2 });
      box.appendChild(F().field(k, ctl));
    }
    return box;
  }
  function colorList(list, set) {
    const cur = list.slice();
    const box = h('span', { class: 'color-list' });
    const draw = () => {
      ED.clear(box);
      cur.forEach((c, i) => box.appendChild(h('span', { class: 'row', style: { gap: '2px' } }, F().color(c, (v) => { cur[i] = v; set(cur.slice()); }), cur.length > 1 ? h('button', { class: 'btn tiny quiet', title: 'Remove', on: { click: () => { cur.splice(i, 1); set(cur.slice()); draw(); } } }, '×') : null)));
      box.appendChild(h('button', { class: 'btn tiny', on: { click: () => { cur.push(cur[cur.length - 1] || '#888888'); set(cur.slice()); draw(); } } }, '+'));
    };
    draw();
    return box;
  }
  function materialsTab(id, d, changed) {
    const out = h('div');
    const blockUI = (key, label, kind, holder, holderKey) => {
      const pal = holder[holderKey];
      const wrap = h('div', { class: 'palette-block' });
      const draw = () => {
        ED.clear(wrap);
        wrap.appendChild(h('h4', null, label, holder[holderKey] && holder[holderKey].style ? swatchCanvas(id, key === 'wall' ? 'wall' : key === 'water' ? 'water' : key === 'pit' ? 'pit' : key === 'slag' ? 'slag' : key === 'door' ? 'door' : 'floor', key === 'floorAlt' ? 1 : /^floors\./.test(key) ? +key.split('.')[1] : 0, 40) : null));
        if (!holder[holderKey]) return;
        if (kind) wrap.appendChild(paletteEditor(holder[holderKey], kind, changed, (next) => { holder[holderKey] = next; changed(); draw(); }));
        else wrap.appendChild(paletteEditor(holder[holderKey], null, changed, () => {}));
      };
      draw();
      return wrap;
    };
    out.appendChild(h('p', { class: 'note section-note' }, 'Each part names a painter (the pattern) and the colours that painter uses. Painters come from the packs; a picture tile set is on the “From pictures” tab, and Claude can write new painters.'));
    for (const [key, label, kind] of SC().PALETTE_BLOCKS) {
      if (!d[key]) continue;
      const blk = blockUI(key, label, kind, d, key);
      if (!kind) blk.querySelector('.field') && blk.querySelector('.field').remove();
      out.appendChild(blk);
    }
    if (d.floors) for (const k of Object.keys(d.floors)) out.appendChild(blockUI('floors.' + k, 'Floor variant ' + k, 'floor', d.floors, k));
    out.appendChild(h('div', { class: 'actions', style: { marginTop: '12px' } },
      h('button', { class: 'btn small', on: { click: () => {
        d.floors = d.floors || {};
        const n = Math.max(1, ...Object.keys(d.floors).map(Number)) + 1;
        d.floors[n] = ED.clone(d.floor);
        changed();
        ED.rerender();
      } } }, 'Add a floor variant'),
      !d.slag ? h('button', { class: 'btn small', on: { click: () => { d.slag = { crust: '#2b1710', crust2: '#3a1d12', glow: '#ff6a1f', hot: '#ffd27a' }; changed(); ED.rerender(); } } }, 'Add molten slag colours') : null));
    return out;
  }
  function particlesBlock(d, changed) {
    const p = d.particles;
    const box = h('fieldset', null, h('legend', null, 'Floating particles'));
    box.appendChild(F().field('Particles', F().select(p ? p.type || 'mote' : 'none', [['none', 'None'], ['mote', 'Dust motes'], ['ember', 'Embers']], (v) => {
      if (v === 'none') delete d.particles;
      else d.particles = Object.assign({ color: '#dbe4c8', rate: 8, alpha: 0.4, drift: 6 }, d.particles || {}, { type: v });
      changed();
      box.replaceWith(particlesBlock(d, changed));
    })));
    if (p) box.appendChild(F().params({ color: 'color', rate: 'number', alpha: 'number', drift: 'number', windX: 'number', windY: 'number', size: 'number' }, p, (v) => { d.particles = Object.assign({ type: p.type }, v); changed(); }, { skip: ['type'] }));
    return box;
  }
  function ambienceBlock(d, changed) {
    const box = h('fieldset', null, h('legend', null, 'Background drone'));
    box.appendChild(F().params({ base: 'number', cutoff: 'number', wind: 'number', gain: 'number', wave: ['sawtooth', 'triangle', 'sine', 'square'] }, d.ambience || {}, (v) => { d.ambience = v; changed(); }, { help: { base: 'Pitch of the hum (Hz)', cutoff: 'Brightness of the hum', wind: 'Brightness of the wind', gain: 'Volume (0.03 to 0.08)', wave: 'Tone' } }));
    return box;
  }
  function picturesTab(id, d, changed) {
    const out = h('div');
    out.appendChild(h('p', { class: 'note section-note' }, 'Paint floors and walls with your own pictures: seamless square textures work best (from a photo, a texture site or an image generator). Several floor pictures are mixed at random, tile by tile.'));
    const floor = d.floor && d.floor.style === 'image' ? d.floor : null;
    const wall = d.wall && d.wall.style === 'image-wall' ? d.wall : null;
    const pics = M().spriteIds();
    const floorBox = h('div', { class: 'palette-block' }, h('h4', null, 'Floor pictures'));
    if (floor) {
      floorBox.appendChild(h('div', { class: 'row' }, (floor.images || []).map((p, i) => h('span', { class: 'chip' }, ED.preview.spriteImg(p, 40), h('button', { class: 'btn tiny quiet', on: { click: () => { floor.images.splice(i, 1); changed(); ED.rerender(); } } }, '×')))));
      floorBox.appendChild(F().field('Tint over them', F().color(floor.tint, (v) => { if (v) floor.tint = v; else delete floor.tint; changed(); }, { allowEmpty: true }), 'An rgba() colour darkens or colours the pictures, e.g. rgba(20,10,30,0.3).'));
    }
    floorBox.appendChild(h('div', { class: 'actions' },
      h('button', { class: 'btn small', on: { click: () => C().importPicture(id + '-floor', (sid) => {
        if (!floor) d.floor = Object.assign({}, d.floor || {}, { style: 'image', images: [], grout: 'rgba(0,0,0,0.25)' });
        d.floor.images.push(sid);
        changed();
        ED.rerender();
      }, { tile: true }) } }, 'Import a floor picture'),
      pics.length ? F().select(undefined, [[undefined, 'or use a picture already imported']].concat(pics.map((p) => [p, p])), (sid) => {
        if (!sid) return;
        if (!floor) d.floor = Object.assign({}, d.floor || {}, { style: 'image', images: [], grout: 'rgba(0,0,0,0.25)' });
        d.floor.images.push(sid);
        changed();
        ED.rerender();
      }) : null));
    out.appendChild(floorBox);
    const wallBox = h('div', { class: 'palette-block' }, h('h4', null, 'Wall pictures'));
    const setWall = (k) => (sid) => {
      if (!sid) return;
      // keep the old colour keys: pillars and doors read the wall palette's colours
      if (!wall) d.wall = Object.assign({ top: ['#6b655a'], edge: '#9a917f', face: '#3a352e', faceDark: '#1b1915' }, d.wall || {}, { style: 'image-wall', topImage: sid, faceImage: sid });
      d.wall[k] = sid;
      changed();
      ED.rerender();
    };
    if (wall) wallBox.appendChild(h('div', { class: 'row' }, h('span', null, 'Top: '), ED.preview.spriteImg(wall.topImage, 40), h('span', null, 'Front: '), ED.preview.spriteImg(wall.faceImage, 40)));
    wallBox.appendChild(h('div', { class: 'actions' },
      h('button', { class: 'btn small', on: { click: () => C().importPicture(id + '-wall-top', setWall('topImage'), { tile: true }) } }, 'Import the wall top'),
      h('button', { class: 'btn small', on: { click: () => C().importPicture(id + '-wall-face', setWall('faceImage'), { tile: true }) } }, 'Import the wall front')));
    if (wall) wallBox.appendChild(F().field('Edge highlight', F().color(wall.edge, (v) => { wall.edge = v; changed(); })));
    out.appendChild(wallBox);
    out.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'A prompt for the pictures'), C().imagePromptBox('environments', id, d)));
    return out;
  }

  // ------------------------------------------------------------ a tile type
  function terrainDetail(el, id) {
    const b = C().binder('terrain', id);
    const sw = h('div', { class: 'swatches' }, M().ids('environments').slice(0, 6).map((e) => h('div', { style: { textAlign: 'center' } }, swatchCanvas(e, id, 0, 72), h('div', { class: 'muted', style: { fontSize: '11px' } }, M().name('environments', e)))));
    el.appendChild(C().header('terrain', id, { base: 'tilesets/types', traits: terrainTraits(b.draft), lede: 'How it looks depends on the floor’s tile set. Doors and keys are set below; the legend characters used in maps are managed by the map editor.' }));
    el.appendChild(sw);
    el.appendChild(h('div', { style: { marginTop: '14px' } }, F().form(b.draft, SC().terrain, () => b.changed())));
    if (b.draft.door) {
      const dr = b.draft.door;
      el.appendChild(h('fieldset', null, h('legend', null, 'Door'),
        F().field('Needs key', F().select(dr.lock || '', [''].concat(SC().KEYS), (v) => { dr.lock = v || null; b.changed(); }, { emptyLabel: 'none' })),
        F().field('Starts sealed', F().bool(dr.sealed, (v) => { if (v) dr.sealed = true; else delete dr.sealed; b.changed(); })),
        F().field('Style', F().text(dr.style, (v) => { if (v) dr.style = v; else delete dr.style; b.changed(); }, { mono: true, placeholder: 'glass, stall, odd…' }))));
    }
    el.appendChild(h('div', { class: 'insp-section' }, h('h4', null, 'Code'), C().codeTab('terrain', id, b)));
  }
})();
