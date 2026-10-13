/* Linear Maze Editor — js/mapedit.js
 * The map editor. A floor is drawn by the game's own renderer (torchlight or flat
 * light), and painted with tiles from the floor's tile set, items, monsters and
 * people. The editor keeps the legend characters itself: changed cells reuse a
 * matching character or get a new one, and untouched cells keep theirs.
 *
 * Cells: ground[i] is the terrain map's legend entry for the tile (terrain, variant,
 * tag, start, and maybe one item/enemy/npc); objs[i] is the objects layer's entry
 * (levels that have an objects layer, like the office floors).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model;
  const ZOOMS = [0.15, 0.2, 0.28, 0.38, 0.5, 0.7, 1, 1.4, 2, 2.8];
  const KEYS = ['item', 'enemy', 'npc'];
  const KIND_OF = { item: 'items', enemy: 'enemies', npc: 'npcs' };
  const FACING_NAMES = { n: 'north', e: 'east', s: 'south', w: 'west' };
  const FACING_ARROWS = { n: '↑', e: '→', s: '↓', w: '←' };

  // ================================================================ level document
  const ME = (ED.mapdoc = {});
  ME.regLegend = () => ED.engine.LM.registry.legend;
  /** What an objects-layer entry places. */
  ME.objInfo = function (e) {
    if (!e) return null;
    if (typeof e === 'string') {
      const kind = M().exists('items', e) ? 'items' : M().exists('npcs', e) ? 'npcs' : M().exists('enemies', e) ? 'enemies' : 'items';
      return { kind, id: e, props: null, tag: null };
    }
    for (const k of KEYS) if (e[k]) return { kind: KIND_OF[k], id: e[k], props: e.props || null, tag: e.tag || null, start: !!e.start };
    return { kind: null, start: !!e.start, tag: e.tag || null };
  };
  ME.groundThing = function (e) {
    if (!e || typeof e !== 'object') return null;
    for (const k of KEYS) if (e[k]) return { kind: KIND_OF[k], id: e[k], props: e.props || null, key: k };
    return null;
  };
  ME.decompile = function (def) {
    const reg = ME.regLegend();
    const legend = def.legend || {};
    const eff = Object.assign({}, reg, legend);
    const rows = def.map || [];
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0), hh = rows.length;
    const doc = { id: def.id, w, h: hh, ground: new Array(w * hh), objs: new Array(w * hh).fill(null), chars: new Array(w * hh), ochars: new Array(w * hh).fill(null), legend, objectLegend: def.objectLegend || {}, hasObjects: !!def.objects, unknown: [] };
    for (let y = 0; y < hh; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = x < row.length ? row[x] : ' ';
        let e = eff[ch];
        const i = y * w + x;
        if (e === undefined) {
          e = { terrain: 'floor', _unknown: ch };
          doc.unknown.push(i);
        } else if (typeof e === 'string') e = { terrain: e };
        doc.ground[i] = e;
        doc.chars[i] = ch;
      }
    }
    if (def.objects) {
      const ol = doc.objectLegend;
      def.objects.forEach((row, y) => {
        if (y >= hh) return;
        for (let x = 0; x < Math.min(row.length, w); x++) {
          const ch = row[x];
          if (ch === ' ' || ch === '.') continue;
          const i = y * w + x;
          doc.objs[i] = ol[ch] === undefined ? { _unknown: ch } : ol[ch];
          doc.ochars[i] = ch;
          if (ol[ch] === undefined) doc.unknown.push(i);
        }
      });
    }
    return doc;
  };
  const hasFn = (v) => typeof v === 'function' || (Array.isArray(v) ? v.some(hasFn) : ED.isPlain(v) ? Object.values(v).some(hasFn) : false);
  const canon = (e) => {
    if (typeof e === 'string') return JSON.stringify({ terrain: e });
    const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : ED.isPlain(v) ? Object.keys(v).sort().filter((k) => v[k] !== undefined && !(k === 'variant' && !v[k])).reduce((o, k) => ((o[k] = sorted(v[k])), o), {}) : v);
    return JSON.stringify(sorted(e));
  };
  const POOL = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&\'()*+,-/:;<=>?@[\\]^_`{|}~' +
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ' +
    'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωЖЗИЙКЛМНПФЦЧШЩЪЫЬЭЮЯбвгджзийклмнпфцчшщъыьэюя').split('');
  /** The level's map, legend, objects and objectLegend for a document. */
  ME.compile = function (doc) {
    const reg = ME.regLegend();
    const baseLegendKeys = new Set(Object.keys((M().base('levels', doc.id) || {}).legend || {}));
    const legend = Object.assign({}, doc.legend);
    const eff = () => Object.assign({}, reg, legend);
    const byIdentity = new Map(), byCanon = new Map();
    const index = () => {
      byIdentity.clear();
      byCanon.clear();
      const e = eff();
      for (const [ch, v] of Object.entries(e)) {
        if (reg[ch] !== undefined && legend[ch] !== undefined && reg[ch] !== legend[ch] && v === reg[ch]) continue;
        if (v && typeof v === 'object') byIdentity.set(v, ch);
        if (!hasFn(v) && !byCanon.has(canon(v))) byCanon.set(canon(v), ch);
      }
    };
    index();
    const used = new Set();
    const taken = () => new Set(Object.keys(eff()).concat(' '));
    const alloc = (entry, takenSet) => {
      const pref = [];
      const t = ME.groundThing(entry);
      if (t) pref.push(t.id[0].toUpperCase(), t.id[0].toLowerCase());
      if (entry.terrain) pref.push(entry.terrain[0].toUpperCase(), entry.terrain[0]);
      for (const c of pref.concat(POOL)) if (!takenSet.has(c)) return c;
      throw new Error('Out of map characters for this floor');
    };
    const map = [];
    let tk = taken();
    for (let y = 0; y < doc.h; y++) {
      let row = '';
      for (let x = 0; x < doc.w; x++) {
        const i = y * doc.w + x;
        let ch = doc.chars[i];
        if (ch == null) {
          const e = doc.ground[i];
          ch = byIdentity.get(e);
          if (ch == null && !hasFn(e)) ch = byCanon.get(canon(e));
          if (ch == null) {
            ch = alloc(e, tk);
            const clean = Object.assign({}, e);
            if (!clean.variant) delete clean.variant;
            legend[ch] = clean;
            tk.add(ch);
            byIdentity.set(e, ch);
            if (!hasFn(clean)) byCanon.set(canon(clean), ch);
          }
        }
        used.add(ch);
        row += ch;
      }
      map.push(row);
    }
    // drop characters the editor added that nothing uses any more
    for (const ch of Object.keys(legend)) if (!baseLegendKeys.has(ch) && !used.has(ch) && !(doc.legend[ch] && doc.keepChars && doc.keepChars.has(ch))) delete legend[ch];
    const out = { map, legend };
    if (doc.hasObjects || doc.objs.some(Boolean)) {
      const baseOL = new Set(Object.keys((M().base('levels', doc.id) || {}).objectLegend || {}));
      const ol = Object.assign({}, doc.objectLegend);
      const oid = new Map(), ocan = new Map();
      for (const [ch, v] of Object.entries(ol)) {
        if (v && typeof v === 'object') oid.set(v, ch);
        else if (typeof v === 'string') ocan.set('s:' + v, ch);
        if (v && typeof v === 'object' && !hasFn(v)) ocan.set(canon(v), ch);
      }
      const otaken = new Set(Object.keys(ol).concat([' ', '.']));
      const oused = new Set();
      const objects = [];
      for (let y = 0; y < doc.h; y++) {
        let row = '';
        for (let x = 0; x < doc.w; x++) {
          const i = y * doc.w + x;
          const e = doc.objs[i];
          if (!e) {
            row += ' ';
            continue;
          }
          let ch = doc.ochars[i];
          if (ch == null) {
            ch = typeof e === 'object' ? oid.get(e) : null;
            if (ch == null) ch = ocan.get(typeof e === 'string' ? 's:' + e : hasFn(e) ? '\u0000' : canon(e));
            if (ch == null) {
              const info = ME.objInfo(e);
              const pref = info && info.id ? [info.id[0].toLowerCase(), info.id[0].toUpperCase()] : [];
              ch = pref.concat(POOL).find((c) => !otaken.has(c));
              if (!ch) throw new Error('Out of object characters for this floor');
              ol[ch] = e;
              otaken.add(ch);
              if (typeof e === 'object') oid.set(e, ch);
              ocan.set(typeof e === 'string' ? 's:' + e : canon(e), ch);
            }
          }
          oused.add(ch);
          row += ch;
        }
        objects.push(row.replace(/\s+$/, ''));
      }
      for (const ch of Object.keys(ol)) if (!baseOL.has(ch) && !oused.has(ch)) delete ol[ch];
      out.objects = objects;
      out.objectLegend = ol;
    }
    return out;
  };
  ME.terrainAt = (doc, i) => ED.engine.LM.find('terrain', (doc.ground[i] && doc.ground[i].terrain) || 'floor');

  // ================================================================ validation
  ME.validate = function (doc, def) {
    const LM = ED.engine.LM;
    const W = doc.w, H = doc.h;
    const out = [];
    const td = (i) => ME.terrainAt(doc, i) || LM.registry.terrain.void;
    let start = -1;
    const exits = [];
    for (let i = 0; i < W * H; i++) {
      const g = doc.ground[i];
      const t = td(i);
      if (t.entry || g.start) start = i;
      const o = ME.objInfo(doc.objs[i]);
      if (o && o.start) start = i;
      if (t.exit) exits.push(i);
      if (g._unknown) out.push({ level: 'bad', text: 'Unknown map character “' + g._unknown + '”', i });
      if (g.terrain && !LM.find('terrain', g.terrain)) out.push({ level: 'bad', text: 'Unknown tile type ' + g.terrain, i });
      const th = ME.groundThing(g);
      if (th && !M().exists(th.kind, th.id)) out.push({ level: 'bad', text: 'Unknown ' + th.kind.replace(/s$/, '') + ' ' + th.id, i });
      if (o && o.kind && !M().exists(o.kind, o.id)) out.push({ level: 'bad', text: 'Unknown ' + o.kind.replace(/s$/, '') + ' ' + o.id, i });
      if (doc.objs[i] && doc.objs[i]._unknown) out.push({ level: 'bad', text: 'Unknown object character “' + doc.objs[i]._unknown + '”', i });
    }
    if (start < 0) out.push({ level: 'bad', text: 'No start: paint the Entry stairs, or tick “Player starts here” on a tile.' });
    if (!exits.length) out.push({ level: 'warn', text: 'No exit stairs. (Fine if the floor ends some other way, like the Chessboard’s report module.)' });
    if (start >= 0) {
      // reachability, picking up keys on the way
      const keys = new Set();
      const keyAt = new Map();
      const thingAt = [];
      for (let i = 0; i < W * H; i++) {
        for (const t of [ME.groundThing(doc.ground[i]), ME.objInfo(doc.objs[i])]) {
          if (!t || !t.id) continue;
          if (t.kind === 'items' && t.id === 'key') keyAt.set(i, (t.props && t.props.color) || 'red');
          if (t.kind === 'items' && t.props && t.props.loot && t.props.loot.some((e) => e.type === 'key')) keyAt.set(i, t.props.loot.find((e) => e.type === 'key').color);
          thingAt.push([i, t]);
        }
      }
      let dashed = false;
      // tiles a trap turns into open ground (a door that appears, a wall that falls)
      const opens = new Set();
      for (const tr of def.traps || []) for (const ef of tr.effects || []) {
        if (ef.type === 'terrain' && ef.tag && ef.terrain) {
          const t = ED.engine.LM.find('terrain', ef.terrain);
          if (t && (!t.solid || t.door)) opens.add(ef.tag);
        }
      }
      const opened = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (doc.ground[i].tag && opens.has(doc.ground[i].tag)) opened[i] = 1;
      const isPit = (i) => td(i).hazard === 'pit';
      const walk = (i) => {
        const t = td(i);
        if (opened[i]) return true;
        if (t.door) return !t.door.lock || keys.has(t.door.lock);
        return !t.solid && t.hazard !== 'pit';
      };
      let seen;
      for (let pass = 0; pass < 6; pass++) {
        const before = keys.size;
        seen = new Uint8Array(W * H);
        const q = [start];
        seen[start] = 1;
        while (q.length) {
          const i = q.pop();
          if (keyAt.has(i)) keys.add(keyAt.get(i));
          const x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const ni = ny * W + nx;
            if (seen[ni]) continue;
            if (walk(ni)) {
              seen[ni] = 1;
              q.push(ni);
            } else if (isPit(ni)) {
              // a dash clears up to three tiles of pit in a straight line
              for (let k = 2; k <= 4; k++) {
                const jx = x + dx * k, jy = y + dy * k;
                if (jx < 0 || jy < 0 || jx >= W || jy >= H) break;
                const ji = jy * W + jx;
                if (isPit(ji)) continue;
                if (!seen[ji] && walk(ji)) {
                  seen[ji] = 1;
                  q.push(ji);
                  dashed = true;
                }
                break;
              }
            }
          }
        }
        for (const [i, c] of keyAt) if (seen[i]) keys.add(c);
        if (keys.size === before) break;
      }
      const near = (i) => {
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && seen[ny * W + nx]) return true;
        }
        return false;
      };
      if (dashed) out.push({ level: 'info', text: 'Getting around needs a dash over pits somewhere.' });
      if (exits.length && !exits.some(near)) out.push({ level: 'bad', text: 'The exit can’t be reached from the start' + (keys.size ? ' (even with the ' + [...keys].join(', ') + ' key)' : '') + '.', i: exits[0] });
      const unreached = thingAt.filter(([i, t]) => !near(i) && !(t.kind === 'items' && ['wall-torch', 'dart-emitter', 'beam-emitter'].includes(t.id)));
      const sealedDoors = [];
      for (let i = 0; i < W * H; i++) if (td(i).door && td(i).door.sealed) sealedDoors.push(i);
      if (unreached.length) out.push({ level: 'warn', text: ED.plural(unreached.length, 'thing') + ' can’t be reached on foot' + (sealedDoors.length ? ' (some may be behind doors opened by the story)' : '') + '.', i: unreached[0][0] });
      for (const [i, c] of keyAt) if (!seen[i] && !near(i)) out.push({ level: 'warn', text: 'The ' + c + ' key can’t be reached.', i });
    }
    // trap tags
    const tags = new Set();
    for (let i = 0; i < W * H; i++) {
      if (doc.ground[i].tag) tags.add(doc.ground[i].tag);
      const o = doc.objs[i];
      if (o && typeof o === 'object' && o.tag) tags.add(o.tag);
    }
    for (const cl of def.ceilingLights || []) if (cl.tag) tags.add(cl.tag);
    (def.traps || []).forEach((tr, n) => {
      const tt = tr.trigger || {};
      if (tt.tag && !tags.has(tt.tag) && !['flag', 'pickup', 'door', 'clear'].includes(tt.type)) out.push({ level: 'warn', text: 'Trap ' + (n + 1) + ' waits for tag “' + tt.tag + '”, which no tile has.' });
      for (const ef of tr.effects || []) if (ef.tag && !tags.has(ef.tag) && ef.type !== 'flicker') out.push({ level: 'warn', text: 'Trap ' + (n + 1) + ' ' + ef.type + ' effect uses tag “' + ef.tag + '”, which no tile has.' });
    });
    return out;
  };

  // ================================================================ the view
  ED.views.map = {
    title: 'Map',
    full: true,
    render(el, args) {
      const order = M().levelOrder();
      let id = args[0];
      if (!id || !M().exists('levels', id)) {
        id = ED.store.get('mapLevel');
        if (!id || !M().exists('levels', id)) id = order[0];
        if (id) return ED.go('/map/' + encodeURIComponent(id));
        el.appendChild(h('div', { class: 'empty' }, h('h2', null, 'No floors'), h('button', { class: 'btn primary', on: { click: () => ED.newFloor() } }, 'New floor')));
        return;
      }
      ED.store.set('mapLevel', id);
      new MapEditor(el, id, args.slice(1));
    },
  };

  class MapEditor {
    constructor(el, id, extra) {
      this.id = id;
      this.el = el;
      this.tool = ED.store.get('mapTool', 'paint');
      this.lit = ED.store.get('mapLit', true);
      this.grid = ED.store.get('mapGrid', true);
      this.showTags = ED.store.get('mapTags', true);
      this.showRooms = ED.store.get('mapRooms', true);
      this.brush = ED.store.get('mapBrush:' + id) || { type: 'terrain', terrain: 'floor', variant: 0 };
      this.tagName = ED.store.get('mapTagName', 'trigger1');
      this.facing = ED.store.get('mapFacing', 's');
      this.sel = null;
      this.area = null;
      this.hover = -1;
      this.dirtyCells = new Set();
      this.doc = ME.decompile(M().raw('levels', id));
      ED.currentMap = this;
      this.build();
      this.loadGame();
      const find = extra[0] === 'find' && extra[1];
      if (find) this.findThing(find);
      if (extra[0] === 'settings') this.showLevelPanel(true);
      this.problems = ME.validate(this.doc, M().raw('levels', id));
      this.drawStatus();
      ED.onLeave(() => this.destroy());
    }
    get def() {
      return M().raw('levels', this.id);
    }
    get env() {
      return this.def.environment;
    }

    // ------------------------------------------------------------ layout
    build() {
      const tb = h('div', { class: 'map-toolbar' });
      this.palette = h('aside', { class: 'palette' });
      this.wrap = h('div', { class: 'canvas-wrap' });
      this.canvas = h('canvas');
      this.wrap.appendChild(this.canvas);
      this.hint = h('div', { class: 'map-hint' }, 'Scroll to zoom · right-drag or Space-drag to pan');
      this.wrap.appendChild(this.hint);
      this.insp = h('aside', { class: 'inspector' });
      this.status = h('div', { class: 'statusbar' });
      this.el.appendChild(h('div', { class: 'mapedit' }, tb, this.palette, this.wrap, this.insp, this.status));
      this.buildToolbar(tb);
      this.buildPalette();
      this.showLevelPanel();
      this.bindCanvas();
    }
    buildToolbar(tb) {
      const order = M().levelOrder();
      const lvl = F().select(this.id, order.map((l) => [l, M().floorLabel(l) + ': ' + (M().raw('levels', l).name || l)]), (v) => ED.go('/map/' + encodeURIComponent(v)));
      const tools = [['select', 'Select', 'V', 'Click a tile to edit it; drag to select an area'], ['paint', 'Paint', 'B', 'Paint with the brush'], ['rect', 'Rect', 'R', 'Fill a rectangle (Shift: outline only)'], ['fill', 'Fill', 'F', 'Fill the connected area'], ['erase', 'Erase', 'E', 'Remove items, monsters and people'], ['pick', 'Pick', 'I', 'Pick up a tile or thing as the brush'], ['tag', 'Tag', 'T', 'Tag tiles for traps'], ['room', 'Room', 'M', 'Drag out a named room']];
      this.toolBtns = {};
      const tg = h('div', { class: 'toolgroup' }, tools.map(([t, label, key, tip]) => (this.toolBtns[t] = h('button', { type: 'button', title: tip + ' (' + key + ')', class: this.tool === t ? 'on' : '', on: { click: () => this.setTool(t) } }, label))));
      this.brushChip = h('span', { class: 'brush-chip', title: 'Current brush' });
      this.tagInput = h('input', { type: 'text', class: 'mono', value: this.tagName, style: { width: '110px' }, title: 'The tag the Tag tool paints' });
      this.tagInput.addEventListener('input', () => {
        this.tagName = this.tagInput.value.trim();
        ED.store.set('mapTagName', this.tagName);
      });
      this.tagWrap = h('label', { class: 'tagwrap', hidden: this.tool !== 'tag' }, h('span', null, 'Tag'), this.tagInput);
      const toggle = (label, prop, key) => {
        const b = h('button', { type: 'button', class: 'btn small' + (this[prop] ? ' on' : ''), on: { click: () => { this[prop] = !this[prop]; ED.store.set(key, this[prop]); b.classList.toggle('on', this[prop]); this.dirty = true; } } }, label);
        return b;
      };
      const litBtn = h('button', { type: 'button', class: 'btn small' + (this.lit ? ' on' : ''), title: 'Torchlight: the floor’s own light and darkness. Off: flat light.', on: { click: () => { this.lit = !this.lit; ED.store.set('mapLit', this.lit); litBtn.classList.toggle('on', this.lit); this.renderer.flat = !this.lit; this.dirty = true; } } }, 'Torchlight');
      tb.append(lvl, tg,
        h('span', { class: 'sep' }), litBtn, toggle('Grid', 'grid', 'mapGrid'), toggle('Tags', 'showTags', 'mapTags'), toggle('Rooms', 'showRooms', 'mapRooms'),
        h('button', { class: 'btn small', title: 'Zoom out (-)', on: { click: () => this.zoomBy(-1) } }, '−'),
        h('button', { class: 'btn small', title: 'Zoom in (+)', on: { click: () => this.zoomBy(1) } }, '+'),
        h('button', { class: 'btn small', title: 'Show the whole floor', on: { click: () => this.fit() } }, 'Fit'),
        h('span', { class: 'spacer', style: { flex: 1 } }),
        h('button', { class: 'btn small', on: { click: () => { this.sel = null; this.showLevelPanel(true); } } }, 'Floor settings'),
        h('button', { class: 'btn small ai', title: 'Change this floor by describing it', on: { click: () => ED.go('/assistant/level-edit/' + encodeURIComponent(this.id)) } }, 'Ask Claude'),
        h('button', { class: 'btn small', on: { click: () => ED.play.open(this.id) } }, 'Play'));
      this.drawBrushChip();
    }
    setTool(t) {
      this.tool = t;
      ED.store.set('mapTool', t);
      for (const [k, b] of Object.entries(this.toolBtns)) b.classList.toggle('on', k === t);
      this.tagWrap.hidden = t !== 'tag';
      this.wrap.className = 'canvas-wrap tool-' + t;
      this.stamp = null;
      this.dirty = true;
    }
    drawBrushChip() {
      ED.clear(this.brushChip);
      const b = this.brush;
      let icon = null, label = '';
      try {
        if (b.type === 'terrain') {
          icon = this.tileCanvas(b.terrain, b.variant || 0, 22);
          label = this.terrainLabel(b.terrain, b.variant);
        } else if (b.type === 'thing') {
          icon = ED.preview.icon(b.kind, b.id, 22);
          const onlyDir = b.props && Object.keys(b.props).length === 1 && b.props.dir;
          label = M().name(b.kind, b.id) + (onlyDir ? ' · faces ' + FACING_NAMES[b.props.dir] : b.props ? ' (set)' : '');
        } else if (b.type === 'entry') {
          label = 'legend “' + b.ch + '”';
        }
      } catch (e) {}
      this.brushChip.append(icon || h('span'), label || 'brush');
    }
    setBrush(b) {
      this.brush = b;
      ED.store.set('mapBrush:' + this.id, b.type === 'entry' ? null : b);
      this.drawBrushChip();
      ED.$$('.tile.on, .entry.on, .legend-row.on', this.palette).forEach((x) => x.classList.remove('on'));
      if (['select', 'pick', 'tag', 'room', 'erase'].includes(this.tool)) this.setTool('paint');
    }
    tileCanvas(t, v, size) {
      const src = ED.preview.tileSwatch(this.env, t, v || 0, 96);
      const c = h('canvas', { width: 96, height: 96 });
      c.style.width = c.style.height = size + 'px';
      c.getContext('2d').drawImage(src, 0, 0);
      return c;
    }
    terrainLabel(t, v) {
      const env = M().get('environments', this.env) || {};
      if (t === 'floor' && v) return v === 1 && env.floorAlt && !(env.floors && env.floors[1]) ? 'Room floor' : 'Floor ' + v;
      return { floor: 'Floor', wall: 'Wall', void: 'Empty', door: 'Door', water: 'Water', pit: 'Pit', spikes: 'Spikes', slag: 'Slag', pillar: 'Pillar', plate: 'Pressure plate', entry: 'Entry stairs', exit: 'Exit stairs', 'door-red': 'Red door', 'door-gold': 'Gold door', 'door-violet': 'Violet door' }[t] || ED.titleCase(t);
    }

    // ------------------------------------------------------------ palette
    buildPalette() {
      const tabs = ED.tabs([
        { id: 'tiles', label: 'Tiles', render: () => this.tilesTab() },
        { id: 'dressings', label: 'Dressings', render: () => this.dressingsTab() },
        { id: 'items', label: 'Items', render: () => this.thingsTab('items') },
        { id: 'enemies', label: 'Monsters', render: () => this.thingsTab('enemies') },
        { id: 'npcs', label: 'People', render: () => this.thingsTab('npcs') },
        { id: 'legend', label: 'Legend', render: () => this.legendTab() },
      ], ED.store.get('mapPal', 'tiles'), (t) => ED.store.set('mapPal', t));
      tabs.querySelector('.tab-body').classList.add('pal-body');
      ED.clear(this.palette).append(h('div', { class: 'pal-head' }, h('span', { class: 'muted' }, 'Brush'), this.brushChip, this.tagWrap), tabs);
      this.palTabs = tabs;
    }
    tilesTab() {
      const LM = ED.engine.LM;
      const env = M().get('environments', this.env) || {};
      const box = h('div', { class: 'tiles' });
      const add = (t, v) => {
        if (!LM.find('terrain', t)) return;
        const on = this.brush.type === 'terrain' && this.brush.terrain === t && (this.brush.variant || 0) === (v || 0);
        const el = h('div', { class: 'tile' + (on ? ' on' : ''), title: t + (v ? ' variant ' + v : ''), on: { click: () => { this.setBrush({ type: 'terrain', terrain: t, variant: v || 0 }); el.classList.add('on'); } } }, this.tileCanvas(t, v, 46), h('span', null, this.terrainLabel(t, v)));
        box.appendChild(el);
      };
      add('floor', 0);
      const variants = new Set();
      if (env.floorAlt) variants.add(1);
      if (env.floors) for (const k of Object.keys(env.floors)) if (+k) variants.add(+k);
      [...variants].sort((a, b) => a - b).forEach((v) => add('floor', v));
      const first = ['wall', 'void', 'door', 'door-red', 'door-gold', 'door-violet', 'water', 'pit', 'spikes', 'slag', 'pillar', 'plate', 'entry', 'exit'];
      first.forEach((t) => add(t, 0));
      for (const t of M().ids('terrain')) if (!first.includes(t) && t !== 'floor') add(t, 0);
      return h('div', null, box, h('p', { class: 'hint', style: { marginTop: '10px' } }, 'Tiles are drawn with this floor’s tile set (', h('a', { href: '#/tilesets/sets/' + encodeURIComponent(this.env) }, M().name('environments', this.env)), '). Wall-mounted items (torches, dart slots) go on wall tiles.'));
    }
    /**
     * Dressings: furniture and fixtures from every pack (set), whatever this floor's
     * tile set. Filter by set, by kind and by name; choose which way they face.
     */
    dressingsTab() {
      const DR = ED.dressings;
      const all = DR.list();
      const sets = [...new Set(all.map((d) => d.set))].sort();
      let set = ED.store.get('mapDressSet', '');
      if (set && !sets.includes(set)) set = '';
      let cat = ED.store.get('mapDressCat', '');
      const setSel = F().select(set, [['', 'All sets (' + all.length + ')']].concat(sets.map((s) => [s, s + ' (' + all.filter((d) => d.set === s).length + ')'])), (v) => {
        set = v;
        ED.store.set('mapDressSet', v);
        draw();
      });
      const catBar = h('div', { class: 'dress-cats' });
      const drawCats = () => {
        ED.clear(catBar);
        for (const [c, label] of [['', 'All']].concat(DR.CATS.map((x) => [x, x]))) {
          catBar.appendChild(h('button', { type: 'button', class: 'btn tiny' + (cat === c ? ' on' : ''), on: { click: () => { cat = c; ED.store.set('mapDressCat', c); drawCats(); draw(); } } }, label));
        }
      };
      const search = h('input', { type: 'search', class: 'pal-search', placeholder: 'Search dressings' });
      // which way furniture faces when painted (only dressings that turn use it)
      const faceBar = h('div', { class: 'dress-facing', title: 'Which way furniture faces when you paint it. [ and ] turn it.' });
      this.drawFacing = () => {
        ED.clear(faceBar);
        faceBar.appendChild(h('span', { class: 'muted' }, 'Faces'));
        for (const f of ['n', 'e', 's', 'w']) faceBar.appendChild(h('button', { type: 'button', class: 'btn tiny' + (this.facing === f ? ' on' : ''), title: FACING_NAMES[f], on: { click: () => this.setFacing(f) } }, FACING_ARROWS[f]));
      };
      this.drawFacing();
      const list = h('div', { class: 'pal-list' });
      const draw = () => {
        ED.clear(list);
        const q = search.value.trim().toLowerCase();
        const shown = all.filter((d) => (!set || d.set === set) && (!cat || d.cat === cat) && (!q || d.id.includes(q) || d.name.toLowerCase().includes(q) || d.set.toLowerCase().includes(q)));
        for (const d of shown.slice(0, 500)) {
          let icon = null;
          try {
            icon = ED.preview.icon('items', d.id, 30);
          } catch (e) {}
          const on = this.brush.type === 'thing' && this.brush.kind === 'items' && this.brush.id === d.id;
          const el = h('div', { class: 'entry' + (on ? ' on' : ''), title: d.id + (d.turns ? ' · turns to face a direction' : '') + (d.interactive ? ' · the player can use it' : ''), on: { click: () => { this.setBrush(this.dressingBrush(d.id)); el.classList.add('on'); } } },
            icon, h('span', { class: 'nm' }, h('b', null, d.name, d.interactive ? h('span', { class: 'dress-use', title: 'The player can use it' }, ' ●') : null), h('small', null, d.set + ' · ' + d.cat + (d.turns ? ' · turns' : ''))));
          list.appendChild(el);
        }
        if (!shown.length) list.appendChild(h('p', { class: 'muted' }, 'No dressings match.'));
      };
      search.addEventListener('input', draw);
      drawCats();
      draw();
      return h('div', null,
        h('p', { class: 'hint' }, 'Furniture and fixtures from every set, for any floor. They sit over the tile; furniture with a front turns to the facing below. ● the player can use it.'),
        h('label', { class: 'dress-set' }, h('span', { class: 'muted' }, 'Set'), setSel), catBar, faceBar, search, list);
    }
    /** A brush for a dressing, turned to the current facing if it turns. */
    dressingBrush(id) {
      return ED.dressings.turns(id) ? { type: 'thing', kind: 'items', id, props: { dir: this.facing } } : { type: 'thing', kind: 'items', id };
    }
    setFacing(f) {
      this.facing = f;
      ED.store.set('mapFacing', f);
      if (this.drawFacing) this.drawFacing();
      const b = this.brush;
      if (b.type === 'thing' && b.kind === 'items' && ED.dressings.turns(b.id)) {
        b.props = Object.assign({}, b.props || {}, { dir: f });
        ED.store.set('mapBrush:' + this.id, b);
        this.drawBrushChip();
      }
    }
    thingsTab(kind) {
      const search = h('input', { type: 'search', class: 'pal-search', placeholder: 'Search' });
      const list = h('div', { class: 'pal-list' });
      const draw = () => {
        ED.clear(list);
        const q = search.value.trim().toLowerCase();
        const ids = M().ids(kind).filter((id) => !q || id.includes(q) || M().name(kind, id).toLowerCase().includes(q));
        ids.sort((a, b) => M().name(kind, a).localeCompare(M().name(kind, b)));
        for (const id of ids.slice(0, 400)) {
          let icon = null;
          try {
            icon = kind === 'npcs' ? ED.preview.portrait(M().get('npcs', id).look, M().get('npcs', id).mood, 30) : ED.preview.icon(kind, id, 30);
          } catch (e) {}
          const on = this.brush.type === 'thing' && this.brush.kind === kind && this.brush.id === id;
          const el = h('div', { class: 'entry' + (on ? ' on' : ''), on: { click: () => { this.setBrush({ type: 'thing', kind, id }); el.classList.add('on'); } } }, icon, h('span', { class: 'nm' }, h('b', null, M().name(kind, id)), h('small', null, id)));
          list.appendChild(el);
        }
      };
      search.addEventListener('input', draw);
      draw();
      return h('div', null, search, list);
    }
    legendTab() {
      const box = h('div');
      const counts = {};
      const ocounts = {};
      for (const ch of this.doc.chars) if (ch != null) counts[ch] = (counts[ch] || 0) + 1;
      for (const ch of this.doc.ochars) if (ch != null) ocounts[ch] = (ocounts[ch] || 0) + 1;
      const eff = Object.assign({}, ME.regLegend(), this.doc.legend);
      const describe = (e) => {
        if (typeof e === 'string') return this.terrainLabel(e);
        const parts = [];
        if (e.terrain && e.terrain !== 'floor') parts.push(this.terrainLabel(e.terrain, e.variant));
        else if (e.variant) parts.push(this.terrainLabel('floor', e.variant));
        const t = ME.groundThing(e);
        if (t) parts.push(M().exists(t.kind, t.id) ? M().name(t.kind, t.id) : t.id);
        if (e.props) parts.push('(' + Object.keys(e.props).slice(0, 3).join(', ') + ')');
        if (e.tag) parts.push('#' + e.tag);
        if (e.start) parts.push('start');
        return parts.join(' ') || 'Floor';
      };
      box.appendChild(h('p', { class: 'hint' }, 'Characters this floor’s map uses. Click one to paint that exact tile, settings and all.'));
      for (const ch of Object.keys(counts).sort((a, b) => counts[b] - counts[a])) {
        const e = eff[ch];
        if (e === undefined) continue;
        box.appendChild(h('div', { class: 'legend-row', title: JSON.stringify(e, (k, v) => (typeof v === 'function' ? '(code)' : v)).slice(0, 300), on: { click: () => this.setBrush({ type: 'entry', ch, entry: typeof e === 'string' ? { terrain: e } : e }) } },
          h('span', { class: 'ch' }, ch === ' ' ? '␣' : ch), h('span', { class: 'desc' }, describe(e)), h('span', { class: 'n' }, counts[ch])));
      }
      if (Object.keys(ocounts).length) {
        box.appendChild(h('div', { class: 'side-group' }, 'Objects layer'));
        for (const ch of Object.keys(ocounts).sort((a, b) => ocounts[b] - ocounts[a])) {
          const e = this.doc.objectLegend[ch];
          const info = ME.objInfo(e);
          box.appendChild(h('div', { class: 'legend-row', on: { click: () => this.setBrush({ type: 'objentry', ch, entry: e }) } },
            h('span', { class: 'ch' }, ch), h('span', { class: 'desc' }, info && info.id ? (M().exists(info.kind, info.id) ? M().name(info.kind, info.id) : info.id) + (info.props ? ' (' + Object.keys(info.props).slice(0, 2).join(', ') + ')' : '') : 'start'), h('span', { class: 'n' }, ocounts[ch])));
        }
      }
      return box;
    }

    // ------------------------------------------------------------ engine view
    loadGame() {
      this.renderer = ED.engine.makeRenderer(this.canvas);
      this.renderer.flat = !this.lit;
      this.game = ED.engine.fakeGame(this.renderer);
      const saved = ED.store.get('mapCam:' + this.id);
      this.reload(true);
      const L = this.game.level;
      if (saved) {
        this.zoomIdx = saved.z;
        this.game.cam.x = saved.x;
        this.game.cam.y = saved.y;
      } else this.zoomIdx = ZOOMS.indexOf(0.7);
      this.applyZoom();
      // the first visit shows the whole floor
      if (!saved && L) requestAnimationFrame(() => this.fit());
      this.ro = new ResizeObserver(() => {
        this.renderer.resize();
        this.dirty = true;
      });
      this.ro.observe(this.wrap);
      this.alive = true;
      this.dirty = true;
      const loop = (now) => {
        if (!this.alive) return;
        this.raf = requestAnimationFrame(loop);
        if (!this.canvas.isConnected) return this.destroy();
        const animate = this.lit;
        const gap = this.lastCost > 30 ? 140 : this.lastCost > 16 ? 50 : 0;
        if (!(this.dirty || (animate && now - (this.lastDraw || 0) >= gap))) return;
        this.dirty = false;
        this.lastDraw = now;
        const t0 = performance.now();
        this.draw(1 / 60);
        this.lastCost = performance.now() - t0;
      };
      this.raf = requestAnimationFrame(loop);
    }
    reload(first) {
      const LM = ED.engine.LM;
      const g = this.game;
      M().resync();
      try {
        g.loadLevel(this.id, null, true);
        for (const e of g.enemies) {
          e.vis = 1;
          e.facing = Math.PI / 2;
        }
        g.state = 'title';
        g.player = null;
        this.loadError = null;
      } catch (e) {
        console.error(e);
        this.loadError = e.message;
        if (first) {
          try {
            g.level = new LM.Level(Object.assign({}, this.def, { map: ['#'] }));
          } catch (e2) {}
        }
      }
      this.dirty = true;
    }
    scheduleReload() {
      clearTimeout(this.reloadT);
      this.reloadT = setTimeout(() => {
        const cam = Object.assign({}, this.game.cam);
        this.reload();
        Object.assign(this.game.cam, { x: cam.x, y: cam.y });
      }, 450);
    }
    destroy() {
      this.alive = false;
      cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      clearTimeout(this.reloadT);
      if (this.game) ED.store.set('mapCam:' + this.id, { x: this.game.cam.x, y: this.game.cam.y, z: this.zoomIdx });
      if (this.onKey) document.removeEventListener('keydown', this.onKey);
      if (this.onKeyUp) document.removeEventListener('keyup', this.onKeyUp);
    }
    applyZoom() {
      this.zoomIdx = Math.max(0, Math.min(ZOOMS.length - 1, this.zoomIdx));
      this.renderer.edZoom = ZOOMS[this.zoomIdx];
      this.renderer.resize();
      this.dirty = true;
    }
    zoomBy(d, sx, sy) {
      const cam = this.game.cam;
      const before = sx != null ? this.screenToWorld(sx, sy) : null;
      this.zoomIdx += d;
      this.applyZoom();
      if (before) {
        const after = this.screenToWorld(sx, sy);
        cam.x += before.x - after.x;
        cam.y += before.y - after.y;
      }
    }
    fit() {
      const r = this.wrap.getBoundingClientRect();
      const W = this.doc.w * 32, H = this.doc.h * 32;
      const z = Math.min(r.width / W, r.height / H) * 0.95;
      let best = 0;
      ZOOMS.forEach((v, i) => { if (v <= z) best = i; });
      this.zoomIdx = best;
      this.applyZoom();
      this.game.cam.x = W / 2;
      this.game.cam.y = H / 2;
    }
    /** Canvas-relative position of a tile's centre (used by tests and Claude's region picks). */
    tileToScreen(tx, ty) {
      const r = this.renderer, cam = this.game.cam;
      return { x: (tx * 32 + 16 - cam.x) * r.zoom + r.cssW / 2, y: (ty * 32 + 16 - cam.y) * r.zoom + r.cssH / 2 };
    }
    screenToWorld(sx, sy) {
      return this.renderer.screenToWorld(sx, sy, this.game.cam);
    }
    cellAt(sx, sy) {
      const p = this.screenToWorld(sx, sy);
      const x = Math.floor(p.x / 32), y = Math.floor(p.y / 32);
      if (x < 0 || y < 0 || x >= this.doc.w || y >= this.doc.h) return -1;
      return y * this.doc.w + x;
    }
    draw(dt) {
      const g = this.game;
      if (!g.level) return;
      g.time += dt;
      for (const it of g.items) {
        it.t += dt;
      }
      g.cam.shakeX = g.cam.shakeY = 0;
      this.renderer.render(g, dt);
      this.drawOverlay();
    }
    drawOverlay() {
      const r = this.renderer, ctx = r.ctx, s = r.scale, doc = this.doc;
      ctx.setTransform(s, 0, 0, s, r.ox, r.oy);
      ctx.globalCompositeOperation = 'source-over';
      const T = 32;
      const v = r.tileView || { tx0: 0, tx1: doc.w - 1, ty0: 0, ty1: doc.h - 1 };
      if (this.grid && r.zoom >= 0.38) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1 / s;
        ctx.beginPath();
        for (let x = v.tx0; x <= v.tx1 + 1; x++) {
          ctx.moveTo(x * T, v.ty0 * T);
          ctx.lineTo(x * T, (v.ty1 + 1) * T);
        }
        for (let y = v.ty0; y <= v.ty1 + 1; y++) {
          ctx.moveTo(v.tx0 * T, y * T);
          ctx.lineTo((v.tx1 + 1) * T, y * T);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(224,178,90,0.35)';
      ctx.lineWidth = 1.5 / s;
      ctx.strokeRect(0, 0, doc.w * T, doc.h * T);
      // rooms
      if (this.showRooms) {
        ctx.font = '600 ' + Math.max(10, 12 / r.zoom) + 'px "IBM Plex Sans", sans-serif';
        for (const room of this.def.rooms || []) {
          const [x, y, w, hh] = room.rect;
          ctx.setLineDash([6 / s, 4 / s]);
          ctx.strokeStyle = 'rgba(224,178,90,0.55)';
          ctx.strokeRect(x * T, y * T, w * T, hh * T);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(224,178,90,0.85)';
          ctx.fillText(room.name, x * T + 4, y * T + Math.max(12, 14 / r.zoom));
        }
      }
      // tags, start, unknowns
      for (let ty = v.ty0; ty <= v.ty1; ty++) {
        for (let tx = v.tx0; tx <= v.tx1; tx++) {
          const i = ty * doc.w + tx;
          const gnd = doc.ground[i], ob = doc.objs[i];
          const tag = gnd.tag || (ob && typeof ob === 'object' && ob.tag);
          if (this.showTags && tag) {
            ctx.fillStyle = tagColor(tag);
            ctx.fillRect(tx * T + 1, ty * T + 1, 7, 7);
            if (r.zoom >= 1 || (this.sel != null && (doc.ground[this.sel].tag === tag))) {
              ctx.font = '600 ' + Math.max(8, 9 / r.zoom) + 'px "IBM Plex Mono", monospace';
              ctx.fillText(tag, tx * T + 10, ty * T + 8);
            }
          }
          if (gnd.start || (ob && typeof ob === 'object' && ob.start)) {
            ctx.strokeStyle = '#5cc8e8';
            ctx.lineWidth = 2 / s;
            ctx.beginPath();
            ctx.arc(tx * T + 16, ty * T + 16, 10, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (gnd._unknown || (ob && ob._unknown)) {
            ctx.strokeStyle = '#f08a7a';
            ctx.lineWidth = 2 / s;
            ctx.beginPath();
            ctx.moveTo(tx * T + 6, ty * T + 6);
            ctx.lineTo(tx * T + 26, ty * T + 26);
            ctx.moveTo(tx * T + 26, ty * T + 6);
            ctx.lineTo(tx * T + 6, ty * T + 26);
            ctx.stroke();
          }
        }
      }
      if (this.found) {
        ctx.strokeStyle = '#5cc8e8';
        ctx.lineWidth = 2 / s;
        for (const i of this.found) ctx.strokeRect((i % doc.w) * T + 2, Math.floor(i / doc.w) * T + 2, T - 4, T - 4);
      }
      // selection, area, drag rectangles, hover
      const box = (x0, y0, x1, y1, col, fill) => {
        const ax = Math.min(x0, x1), ay = Math.min(y0, y1), bx = Math.max(x0, x1), by = Math.max(y0, y1);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(ax * T, ay * T, (bx - ax + 1) * T, (by - ay + 1) * T);
        }
        ctx.strokeStyle = col;
        ctx.lineWidth = 2 / s;
        ctx.strokeRect(ax * T, ay * T, (bx - ax + 1) * T, (by - ay + 1) * T);
      };
      if (this.drag && (this.tool === 'rect' || this.tool === 'room' || (this.tool === 'select' && this.drag.moved))) {
        const a = this.drag.start, b = this.drag.cur;
        box(a % doc.w, (a / doc.w) | 0, b % doc.w, (b / doc.w) | 0, this.tool === 'room' ? '#e0b25a' : '#5cc8e8', 'rgba(92,200,232,0.12)');
      }
      if (this.area) box(this.area.x0, this.area.y0, this.area.x1, this.area.y1, '#5cc8e8', 'rgba(92,200,232,0.08)');
      if (this.sel != null && this.sel >= 0) box(this.sel % doc.w, (this.sel / doc.w) | 0, this.sel % doc.w, (this.sel / doc.w) | 0, '#5cc8e8');
      if (this.stamp && this.hover >= 0) {
        const hx = this.hover % doc.w, hy = (this.hover / doc.w) | 0;
        box(hx, hy, hx + this.stamp.w - 1, hy + this.stamp.h - 1, '#e0b25a', 'rgba(224,178,90,0.15)');
      } else if (this.hover >= 0 && !this.panning) {
        const hx = this.hover % doc.w, hy = (this.hover / doc.w) | 0;
        ctx.strokeStyle = this.tool === 'erase' ? 'rgba(240,138,122,0.9)' : 'rgba(235,228,212,0.75)';
        ctx.lineWidth = 1.5 / s;
        ctx.strokeRect(hx * T + 0.5, hy * T + 0.5, T - 1, T - 1);
      }
      if (this.loadError) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(40,10,10,0.85)';
        ctx.fillRect(0, 0, ctx.canvas.width, 30 * r.dpr);
        ctx.fillStyle = '#f08a7a';
        ctx.font = 13 * r.dpr + 'px "IBM Plex Sans", sans-serif';
        ctx.fillText('This floor didn’t load in the engine: ' + this.loadError, 10 * r.dpr, 20 * r.dpr);
      }
    }

    // ------------------------------------------------------------ input
    bindCanvas() {
      const c = this.canvas;
      const pos = (e) => {
        const r = c.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const p = pos(e);
        this.zoomBy(e.deltaY < 0 ? 1 : -1, p.x, p.y);
      }, { passive: false });
      c.addEventListener('mousedown', (e) => {
        const p = pos(e);
        if (e.button === 1 || e.button === 2 || this.spaceDown) {
          this.panning = { x: p.x, y: p.y, cx: this.game.cam.x, cy: this.game.cam.y };
          this.wrap.classList.add('panning');
          return;
        }
        if (e.button !== 0) return;
        const i = this.cellAt(p.x, p.y);
        if (i < 0) return;
        this.drag = { start: i, cur: i, shift: e.shiftKey, alt: e.altKey, moved: false, cells: new Set() };
        this.onDown(i, e);
        this.dirty = true;
      });
      window.addEventListener('mousemove', (this.onMove = (e) => {
        if (!c.isConnected) return window.removeEventListener('mousemove', this.onMove);
        const p = pos(e);
        if (this.panning) {
          const z = this.renderer.zoom;
          this.game.cam.x = this.panning.cx - (p.x - this.panning.x) / z;
          this.game.cam.y = this.panning.cy - (p.y - this.panning.y) / z;
          this.dirty = true;
          return;
        }
        const inside = p.x >= 0 && p.y >= 0 && p.x < c.clientWidth && p.y < c.clientHeight;
        const i = inside ? this.cellAt(p.x, p.y) : -1;
        if (i !== this.hover) {
          this.hover = i;
          this.dirty = true;
          this.drawStatus();
        }
        if (this.drag && i >= 0 && i !== this.drag.cur) {
          this.drag.cur = i;
          this.drag.moved = true;
          this.onDrag(i);
          this.dirty = true;
        }
      }));
      window.addEventListener('mouseup', (this.onUp = (e) => {
        if (!c.isConnected) return window.removeEventListener('mouseup', this.onUp);
        if (this.panning) {
          this.panning = null;
          this.wrap.classList.remove('panning');
          return;
        }
        if (this.drag) {
          const d = this.drag;
          this.drag = null;
          this.onUpCell(d);
          this.dirty = true;
        }
      }));
      c.addEventListener('mouseleave', () => {
        this.hover = -1;
        this.dirty = true;
      });
      this.onKey = (e) => {
        if (ED.$('.modal-wrap') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
        const k = e.key.toLowerCase();
        const mod = e.ctrlKey || e.metaKey;
        if (e.code === 'Space') {
          this.spaceDown = true;
          e.preventDefault();
          return;
        }
        if (mod && k === 'c' && this.area) return e.preventDefault(), this.copyArea();
        if (mod && k === 'v' && this.clip) return e.preventDefault(), this.startStamp();
        if (mod) return;
        const map = { v: 'select', b: 'paint', r: 'rect', f: 'fill', e: 'erase', i: 'pick', t: 'tag', m: 'room' };
        if (map[k]) this.setTool(map[k]);
        else if (k === '[' || k === ']') {
          // turn the facing for dressings
          const order = ['n', 'e', 's', 'w'];
          this.setFacing(order[(order.indexOf(this.facing) + (k === ']' ? 1 : 3)) % 4]);
        } else if (k === 'g') {
          this.grid = !this.grid;
          this.dirty = true;
        } else if (k === '=' || k === '+') this.zoomBy(1);
        else if (k === '-') this.zoomBy(-1);
        else if (k === 'escape') {
          this.stamp = null;
          this.area = null;
          this.sel = null;
          this.showLevelPanel();
          this.dirty = true;
        } else if ((k === 'delete' || k === 'backspace') && this.area) this.clearArea();
      };
      this.onKeyUp = (e) => {
        if (e.code === 'Space') this.spaceDown = false;
      };
      document.addEventListener('keydown', this.onKey);
      document.addEventListener('keyup', this.onKeyUp);
    }
    onDown(i, e) {
      const t = this.tool;
      if (this.stamp) return this.placeStamp(i);
      if (t === 'paint' || t === 'erase') this.strokeCell(i);
      else if (t === 'fill') {
        this.fillFrom(i);
        this.commit('Fill');
      } else if (t === 'pick') this.pickFrom(i);
      else if (t === 'tag') {
        this.toggleTag(i);
      } else if (t === 'select') {
        this.area = null;
        this.select(i);
      }
    }
    onDrag(i) {
      const t = this.tool;
      if (t === 'paint' || t === 'erase') {
        // fill gaps between mouse samples
        const a = this.drag.last != null ? this.drag.last : this.drag.start;
        for (const j of this.line(a, i)) this.strokeCell(j);
      } else if (t === 'tag') this.toggleTag(i, true);
      this.drag.last = i;
    }
    onUpCell(d) {
      const t = this.tool;
      if (t === 'paint' || t === 'erase' || t === 'tag') {
        if (d.cells.size) this.commit(t === 'erase' ? 'Erase' : t === 'tag' ? 'Tag tiles' : 'Paint');
      } else if (t === 'rect') {
        this.rectApply(d.start, d.cur, d.shift);
        this.commit(d.shift ? 'Outline' : 'Rectangle');
      } else if (t === 'room') {
        this.addRoom(d.start, d.cur);
      } else if (t === 'select' && d.moved) {
        const W = this.doc.w;
        this.area = { x0: Math.min(d.start % W, d.cur % W), y0: Math.min((d.start / W) | 0, (d.cur / W) | 0), x1: Math.max(d.start % W, d.cur % W), y1: Math.max((d.start / W) | 0, (d.cur / W) | 0) };
        this.sel = null;
        this.showAreaPanel();
      }
    }
    line(a, b) {
      const W = this.doc.w;
      let x0 = a % W, y0 = (a / W) | 0;
      const x1 = b % W, y1 = (b / W) | 0;
      const out = [];
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let n = 0; n < 500; n++) {
        out.push(y0 * W + x0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
      return out;
    }

    // ------------------------------------------------------------ changing cells
    setGround(i, e) {
      this.doc.ground[i] = e;
      this.doc.chars[i] = null;
      this.touch(i, true);
    }
    setObj(i, e) {
      this.doc.objs[i] = e;
      this.doc.ochars[i] = null;
      this.touch(i, false);
    }
    touch(i, terrain) {
      if (this.drag) this.drag.cells.add(i);
      this.dirtyCells.add(i);
      this.liveUpdate(i, terrain);
    }
    /** Apply the brush to a cell. */
    applyBrush(i, brush) {
      const LM = ED.engine.LM;
      const b = brush || this.brush;
      const g0 = this.doc.ground[i];
      if (b.type === 'terrain') {
        const td = LM.find('terrain', b.terrain);
        const g = Object.assign({}, g0);
        delete g._unknown;
        g.terrain = b.terrain;
        if (b.variant) g.variant = b.variant;
        else delete g.variant;
        if (td && td.solid) {
          const th = ME.groundThing(g);
          if (th && !(th.kind === 'items' && (M().get('items', th.id) || {}).wallMounted)) {
            delete g[th.key];
            delete g.props;
          }
          const o = ME.objInfo(this.doc.objs[i]);
          if (o && o.kind && !(o.kind === 'items' && (M().get('items', o.id) || {}).wallMounted)) this.setObj(i, null);
        }
        if (!ED.equal(g, g0)) this.setGround(i, g);
      } else if (b.type === 'thing') {
        const def = M().get(b.kind, b.id) || {};
        const key = { items: 'item', enemies: 'enemy', npcs: 'npc' }[b.kind];
        const td = ME.terrainAt(this.doc, i);
        const wall = b.kind === 'items' && def.wallMounted;
        if (this.doc.hasObjects && !wall) {
          const o = b.props ? { [key]: b.id, props: ED.clone(b.props) } : b.id;
          this.setObj(i, o);
          if (td && td.solid) this.setGround(i, Object.assign({}, g0, { terrain: 'floor' }));
        } else {
          const g = Object.assign({}, g0);
          for (const k of KEYS) delete g[k];
          delete g.props;
          delete g._unknown;
          g[key] = b.id;
          if (b.props) g.props = ED.clone(b.props);
          if (td && td.solid && !wall) g.terrain = 'floor';
          if (wall && td && !td.solid) g.terrain = 'wall';
          this.setGround(i, g);
        }
      } else if (b.type === 'entry') {
        this.setGround(i, b.entry);
      } else if (b.type === 'objentry') {
        this.setObj(i, b.entry);
      }
    }
    eraseCell(i) {
      const g0 = this.doc.ground[i];
      const th = ME.groundThing(g0);
      if (th) {
        const g = Object.assign({}, g0);
        delete g[th.key];
        delete g.props;
        this.setGround(i, g);
      }
      if (this.doc.objs[i]) this.setObj(i, null);
    }
    strokeCell(i) {
      if (this.drag && this.drag.cells.has(i)) return;
      if (this.tool === 'erase') this.eraseCell(i);
      else this.applyBrush(i);
      if (this.drag) this.drag.cells.add(i);
      this.dirty = true;
    }
    rectApply(a, b, outline) {
      const W = this.doc.w;
      const x0 = Math.min(a % W, b % W), x1 = Math.max(a % W, b % W), y0 = Math.min((a / W) | 0, (b / W) | 0), y1 = Math.max((a / W) | 0, (b / W) | 0);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (outline && x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
        this.applyBrush(y * W + x);
      }
    }
    fillFrom(i) {
      const doc = this.doc, W = doc.w, H = doc.h;
      const key = (j) => {
        const g = doc.ground[j];
        return (g.terrain || 'floor') + ':' + (g.variant || 0) + ':' + (this.brush.type === 'thing' ? !!ME.groundThing(g) || !!doc.objs[j] : '');
      };
      const k0 = key(i);
      const seen = new Uint8Array(W * H);
      const q = [i];
      seen[i] = 1;
      let n = 0;
      while (q.length && n < 30000) {
        const j = q.pop();
        n++;
        this.applyBrush(j);
        const x = j % W, y = (j / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nj = ny * W + nx;
          if (seen[nj] || key(nj) !== k0) continue;
          seen[nj] = 1;
          q.push(nj);
        }
      }
    }
    pickFrom(i) {
      const o = this.doc.objs[i];
      const info = ME.objInfo(o);
      const th = ME.groundThing(this.doc.ground[i]);
      if (info && info.kind) this.setBrush(o && typeof o === 'object' && (o.props || o.tag) ? { type: 'objentry', entry: o, ch: this.doc.ochars[i] } : { type: 'thing', kind: info.kind, id: info.id });
      else if (th) this.setBrush(th.props ? { type: 'thing', kind: th.kind, id: th.id, props: th.props } : { type: 'thing', kind: th.kind, id: th.id });
      else {
        const g = this.doc.ground[i];
        this.setBrush({ type: 'terrain', terrain: g.terrain || 'floor', variant: g.variant || 0 });
      }
      this.setTool('paint');
    }
    toggleTag(i, dragging) {
      const tag = this.tagName;
      if (!tag) return ED.toast('Type a tag name in the toolbar first.', 'bad');
      if (this.drag && this.drag.cells.has(i)) return;
      const g0 = this.doc.ground[i];
      if (!dragging) this.drag.tagOn = g0.tag !== tag;
      const g = Object.assign({}, g0);
      if (this.drag.tagOn) g.tag = tag;
      else if (g.tag === tag) delete g.tag;
      if (!ED.equal(g, g0)) this.setGround(i, g);
      this.drag.cells.add(i);
      this.dirty = true;
    }

    /** Keep the engine's level in step with the document while painting. */
    liveUpdate(i, terrain) {
      const g = this.game, L = g.level, LM = ED.engine.LM;
      if (!L || this.loadError) return;
      const W = this.doc.w, x = i % W, y = (i / W) | 0;
      if (!L.inBounds(x, y) || L.w !== W || L.h !== this.doc.h) return this.scheduleReload();
      const e = this.doc.ground[i];
      try {
        if (terrain) {
          const tid = LM.find('terrain', e.terrain || 'floor') ? e.terrain || 'floor' : 'floor';
          L.variant[i] = e.variant || 0;
          g.setTerrain(x, y, tid, e.tag);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.renderer.invalidateTile(x + dx, y + dy);
        }
        // things on the tile
        const T = 32;
        g.items = g.items.filter((it) => {
          if (it.tx === x && it.ty === y) {
            if (it.light) g.staticLights = g.staticLights.filter((l) => l !== it.light);
            return false;
          }
          return true;
        });
        g.enemies = g.enemies.filter((en) => !(Math.floor(en.home.x / T) === x && Math.floor(en.home.y / T) === y));
        g.npcs = g.npcs.filter((n) => !(Math.floor(n.home.x / T) === x && Math.floor(n.home.y / T) === y));
        const spawn = (t, tag) => {
          if (!t || !t.id || !M().exists(t.kind, t.id)) return;
          if (t.kind === 'items') g.spawnItem(t.id, x, y, t.props || {}, tag);
          else if (t.kind === 'enemies') {
            const en = g.spawnEnemy(t.id, x * T + T / 2, y * T + T / 2, Object.assign({ tag }, t.props || {}));
            if (en) {
              en.vis = 1;
              en.facing = Math.PI / 2;
            }
          } else {
            const n = g.spawnNPC(t.id, x, y, t.props || {}, tag);
            if (n && !n.def.spectral) n.vis = 1;
          }
        };
        spawn(ME.groundThing(e), e.tag);
        const o = this.doc.objs[i];
        if (o) spawn(ME.objInfo(o), typeof o === 'object' ? o.tag : null);
      } catch (err) {
        console.warn('live update', err);
        this.scheduleReload();
      }
      this.dirty = true;
    }

    /** Write the document back to the model as one undo step. */
    commit(label) {
      if (!this.dirtyCells.size && !this.forceCommit) return;
      this.forceCommit = false;
      let out;
      try {
        out = ME.compile(this.doc);
      } catch (e) {
        ED.toast(e.message, 'bad');
        return;
      }
      M().update('levels', this.id, (d) => {
        d.map = out.map;
        d.legend = out.legend;
        if (out.objects) {
          d.objects = out.objects;
          d.objectLegend = out.objectLegend;
        }
      }, label + ' on ' + M().name('levels', this.id));
      this.dirtyCells.clear();
      // re-read so cells and characters match what was saved
      const sel = this.sel;
      this.doc = ME.decompile(M().raw('levels', this.id));
      this.sel = sel;
      this.problems = ME.validate(this.doc, this.def);
      this.drawStatus();
      this.scheduleReload();
      if (this.sel != null) this.select(this.sel);
      if (this.palTabs && this.palTabs.current() === 'legend') this.palTabs.show('legend');
    }
    commitDef(label, fn) {
      M().update('levels', this.id, fn, label);
      this.doc = ME.decompile(M().raw('levels', this.id));
      this.problems = ME.validate(this.doc, this.def);
      this.drawStatus();
      this.scheduleReload();
    }

    // ------------------------------------------------------------ copy and stamp
    copyArea() {
      const a = this.area, W = this.doc.w;
      const clip = { w: a.x1 - a.x0 + 1, h: a.y1 - a.y0 + 1, ground: [], objs: [] };
      for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
        clip.ground.push(this.doc.ground[y * W + x]);
        clip.objs.push(this.doc.objs[y * W + x]);
      }
      ED.mapClip = this.clip = clip;
      ED.toast('Copied ' + clip.w + '×' + clip.h + '. Ctrl+V, then click where it goes.');
    }
    startStamp() {
      this.clip = this.clip || ED.mapClip;
      if (!this.clip) return;
      this.stamp = this.clip;
      this.dirty = true;
    }
    placeStamp(i) {
      const s = this.stamp, W = this.doc.w, x0 = i % W, y0 = (i / W) | 0;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const tx = x0 + x, ty = y0 + y;
        if (tx >= W || ty >= this.doc.h) continue;
        const j = ty * W + tx;
        this.setGround(j, s.ground[y * s.w + x]);
        if (this.doc.hasObjects || s.objs[y * s.w + x]) this.setObj(j, s.objs[y * s.w + x]);
      }
      this.commit('Paste');
    }
    clearArea() {
      const a = this.area, W = this.doc.w;
      for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) this.eraseCell(y * W + x);
      this.commit('Clear things');
    }
    fillArea() {
      const a = this.area, W = this.doc.w;
      for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) this.applyBrush(y * W + x);
      this.commit('Fill area');
    }

    // ------------------------------------------------------------ rooms
    async addRoom(a, b) {
      const W = this.doc.w;
      const rect = [Math.min(a % W, b % W), Math.min((a / W) | 0, (b / W) | 0), Math.abs((a % W) - (b % W)) + 1, Math.abs(((a / W) | 0) - ((b / W) | 0)) + 1];
      const name = await ED.prompt('Name this room', 'Shown on screen the first time the player walks in', '', 'Add the room');
      if (!name) return;
      this.commitDef('Add room ' + name, (d) => {
        d.rooms = (d.rooms || []).concat([{ name, rect }]);
      });
      this.showLevelPanel(true, 'rooms');
    }

    // ------------------------------------------------------------ find
    findThing(spec) {
      const [kind, id] = spec.split(':');
      const found = [];
      for (let i = 0; i < this.doc.ground.length; i++) {
        const t = ME.groundThing(this.doc.ground[i]);
        const o = ME.objInfo(this.doc.objs[i]);
        if ((t && t.kind === kind && t.id === id) || (o && o.kind === kind && o.id === id)) found.push(i);
      }
      this.found = found;
      if (found.length) this.centerOn(found[0]);
    }
    centerOn(i) {
      this.game.cam.x = (i % this.doc.w) * 32 + 16;
      this.game.cam.y = Math.floor(i / this.doc.w) * 32 + 16;
      if (this.zoomIdx < ZOOMS.indexOf(0.7)) {
        this.zoomIdx = ZOOMS.indexOf(0.7);
        this.applyZoom();
      }
      this.dirty = true;
    }

    // ------------------------------------------------------------ status bar
    drawStatus() {
      ED.clear(this.status);
      const i = this.hover;
      if (i >= 0) {
        const x = i % this.doc.w, y = (i / this.doc.w) | 0;
        const g = this.doc.ground[i];
        const th = ME.groundThing(g), o = ME.objInfo(this.doc.objs[i]);
        ED.append(this.status, [h('span', null, x + ', ' + y), h('span', null, '“' + (this.doc.chars[i] == null ? '·' : this.doc.chars[i]) + '” ' + this.terrainLabel(g.terrain || 'floor', g.variant)),
          th ? h('span', null, M().exists(th.kind, th.id) ? M().name(th.kind, th.id) : th.id) : null, o && o.id ? h('span', null, M().exists(o.kind, o.id) ? M().name(o.kind, o.id) : o.id) : null, g.tag ? h('span', null, '#' + g.tag) : null]);
      } else this.status.append(h('span', null, this.doc.w + '×' + this.doc.h + ' tiles'));
      this.status.appendChild(h('span', { class: 'spacer', style: { flex: 1 } }));
      const bad = (this.problems || []).filter((p) => p.level === 'bad').length, warn = (this.problems || []).filter((p) => p.level === 'warn').length;
      this.status.appendChild(bad || warn ? h('span', { class: 'problems', on: { click: () => this.showLevelPanel(true, 'check') } }, (bad ? ED.plural(bad, 'problem') : '') + (bad && warn ? ', ' : '') + (warn ? ED.plural(warn, 'warning') : '')) : h('span', { class: 'ok' }, 'Start and exit connect'));
    }

    // ------------------------------------------------------------ inspector: a cell
    select(i) {
      this.sel = i;
      this.dirty = true;
      const doc = this.doc, W = doc.w;
      const x = i % W, y = (i / W) | 0;
      const box = ED.clear(this.insp);
      box.appendChild(h('div', { class: 'row' }, h('h3', { style: { flex: 1 } }, 'Tile ' + x + ', ' + y), h('button', { class: 'btn tiny quiet', on: { click: () => { this.sel = null; this.showLevelPanel(); } } }, 'Close')));
      const g = doc.ground[i];
      const upd = (fn) => {
        const n = Object.assign({}, doc.ground[i]);
        fn(n);
        this.setGround(i, n);
        this.commit('Edit tile');
      };
      box.appendChild(h('p', { class: 'muted mono' }, 'map character “' + (doc.chars[i] == null ? '?' : doc.chars[i]) + '”' + (doc.ochars[i] ? ', objects “' + doc.ochars[i] + '”' : '')));
      box.appendChild(F().field('Tile type', F().idSelect('terrain', g.terrain || 'floor', (v) => upd((n) => { n.terrain = v; }))));
      box.appendChild(h('div', { class: 'grid2' },
        F().field('Floor variant', F().number(g.variant || 0, (v) => upd((n) => { if (v) n.variant = v; else delete n.variant; }), { min: 0, max: 15 })),
        F().field('Tag', F().text(g.tag, (v) => upd((n) => { if (v) n.tag = v; else delete n.tag; }), { mono: true, emptyUndefined: true }))));
      box.appendChild(F().field('Player starts here', F().bool(!!g.start, (on) => {
        if (on) for (let j = 0; j < doc.ground.length; j++) if (doc.ground[j].start && j !== i) this.setGround(j, Object.assign({}, doc.ground[j], { start: undefined }));
        upd((n) => { if (on) n.start = true; else delete n.start; });
      })));
      const th = ME.groundThing(g);
      if (th) box.appendChild(this.thingPanel('On this tile', th, (props) => upd((n) => { if (props && Object.keys(props).length) n.props = props; else delete n.props; }), () => { this.eraseCellGround(i); }));
      const o = doc.objs[i];
      if (o) {
        const info = ME.objInfo(o);
        box.appendChild(this.thingPanel('Objects layer', info, (props) => {
          const n = typeof o === 'string' ? { [{ items: 'item', enemies: 'enemy', npcs: 'npc' }[info.kind]]: info.id } : Object.assign({}, o);
          if (props && Object.keys(props).length) n.props = props;
          else delete n.props;
          this.setObj(i, n);
          this.commit('Edit object');
        }, () => { this.setObj(i, null); this.commit('Remove object'); }, (tag) => {
          const n = typeof o === 'string' ? { [{ items: 'item', enemies: 'enemy', npcs: 'npc' }[info.kind]]: info.id } : Object.assign({}, o);
          if (tag) n.tag = tag;
          else delete n.tag;
          this.setObj(i, n);
          this.commit('Tag object');
        }));
      }
      if (!th && !o) box.appendChild(h('p', { class: 'muted' }, 'Nothing placed here. Choose an item, monster or person in the palette and paint it.'));
    }
    eraseCellGround(i) {
      this.eraseCell(i);
      this.commit('Remove');
    }
    thingPanel(title, t, onProps, onRemove, onTag) {
      const box = h('div', { class: 'insp-section' }, h('h4', null, title));
      if (!t || !t.id) return box;
      const known = M().exists(t.kind, t.id);
      box.appendChild(h('div', { class: 'row' }, known ? (t.kind === 'npcs' ? ED.preview.portrait(M().get('npcs', t.id).look, M().get('npcs', t.id).mood, 30) : ED.preview.icon(t.kind, t.id, 30)) : null,
        h('a', { href: '#/' + { items: 'items', enemies: 'monsters', npcs: 'people' }[t.kind] + '/' + encodeURIComponent(t.id) }, known ? M().name(t.kind, t.id) : t.id + ' (unknown)'),
        h('span', { class: 'spacer', style: { flex: 1 } }), h('button', { class: 'btn tiny quiet danger', on: { click: onRemove } }, 'Remove')));
      if (onTag) box.appendChild(F().field('Tag', F().text(t.tag, (v) => onTag(v), { mono: true, emptyUndefined: true })));
      const props = Object.assign({}, t.props || {});
      if (hasFn(props)) {
        box.appendChild(h('p', { class: 'muted' }, 'Its settings include code (a conversation or similar); edit those in its pack or the Code tab.'));
        return box;
      }
      let spec = {};
      if (t.kind === 'items' && known) {
        for (const p of SC().discoverProps(M().base('items', t.id) || M().raw('items', t.id))) spec[p.key] = p.type === 'select' ? p.options : p.type;
      } else if (t.kind === 'enemies') spec = { aggro: 'bool', hpMul: 'number', drops: 'json' };
      else if (t.kind === 'npcs') spec = { name: 'text', role: 'text', face: ['n', 'e', 's', 'w'], behavior: Object.keys(ED.engine.LM.npcBehaviors), barks: 'stringlist', ox: 'number', oy: 'number' };
      const commit = ED.debounce(() => onProps(props), 500);
      box.appendChild(h('p', { class: 'hint' }, 'Settings for this one only. Leave blank for the item’s defaults.'));
      box.appendChild(F().params(spec, props, (v) => {
        for (const k of Object.keys(props)) delete props[k];
        Object.assign(props, v);
        commit();
      }));
      return box;
    }

    showAreaPanel() {
      const a = this.area;
      const box = ED.clear(this.insp);
      box.append(h('h3', null, 'Selection ' + (a.x1 - a.x0 + 1) + '×' + (a.y1 - a.y0 + 1)),
        h('p', { class: 'muted' }, 'From ' + a.x0 + ', ' + a.y0 + ' to ' + a.x1 + ', ' + a.y1 + '.'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn small', on: { click: () => this.fillArea() } }, 'Fill with the brush'),
          h('button', { class: 'btn small', on: { click: () => this.clearArea() } }, 'Clear things'),
          h('button', { class: 'btn small', on: { click: () => this.copyArea() } }, 'Copy (Ctrl+C)'),
          h('button', { class: 'btn small', on: { click: async () => {
            const name = await ED.prompt('Make it a room', 'Room name', '', 'Add');
            if (!name) return;
            this.commitDef('Add room ' + name, (d) => { d.rooms = (d.rooms || []).concat([{ name, rect: [a.x0, a.y0, a.x1 - a.x0 + 1, a.y1 - a.y0 + 1] }]); });
          } } }, 'Make it a room'),
          h('button', { class: 'btn small ai', on: { click: () => ED.go('/assistant/level-region/' + encodeURIComponent(this.id) + '/' + [a.x0, a.y0, a.x1, a.y1].join(',')) } }, 'Ask Claude to fill it')));
    }

    // ------------------------------------------------------------ inspector: the floor
    showLevelPanel(open, section) {
      const box = ED.clear(this.insp);
      const d = M().draft('levels', this.id);
      const commit = ED.pendingCommit(() => {
        M().commit('levels', this.id, d, 'Edit floor ' + M().name('levels', this.id));
        this.problems = ME.validate(this.doc, this.def);
        this.drawStatus();
        if (envChanged) {
          envChanged = false;
          ED.preview.forgetTiles();
          this.buildPalette();
          this.scheduleReload();
        }
      }, 400);
      let envChanged = false;
      const order = M().levelOrder(), i = order.indexOf(this.id);
      box.append(h('h3', null, d.name || this.id), h('p', { class: 'muted' }, M().floorLabel(this.id) + ' · after ' + (i > 0 ? M().name('levels', order[i - 1]) : 'nothing (a run starts here)') + ' · before ' + (order[i + 1] ? M().name('levels', order[i + 1]) : 'the end of the game')));
      const sect = (id, title, render, isOpen) => {
        const det = h('details', { class: 'insp-section', open: isOpen || section === id ? true : undefined }, h('summary', null, h('h4', { style: { display: 'inline' } }, title)));
        let built = false;
        const buildIt = () => {
          if (built) return;
          built = true;
          det.appendChild(render());
        };
        det.addEventListener('toggle', () => det.open && buildIt());
        if (det.open) buildIt();
        box.appendChild(det);
        return det;
      };
      sect('settings', 'Settings', () => F().form(d, SC().level, (dd, key) => { if (key === 'environment') envChanged = true; commit(); }), open && !section);
      sect('check', 'Check', () => this.checkPanel(), section === 'check' || (this.problems || []).some((p) => p.level === 'bad'));
      sect('rooms', 'Rooms (' + (d.rooms || []).length + ')', () => F().list(d.rooms || [], (r, n, set) => h('div', null,
        F().field('Name', F().text(r.name, (v) => set(Object.assign({}, r, { name: v })))),
        F().field('Small line', F().text(r.note, (v) => set(Object.assign({}, r, { note: v || undefined })), { emptyUndefined: true })),
        F().field('x, y, width, height', F().text((r.rect || []).join(', '), (v) => { const a = v.split(/[,\s]+/).map(Number); if (a.length === 4 && a.every((z) => !Number.isNaN(z))) set(Object.assign({}, r, { rect: a })); }, { mono: true }))), {
        onChange: (l) => { d.rooms = l; commit(); this.dirty = true; }, title: (r) => r.name + ' · ' + (r.rect || []).join(','), addLabel: 'Add a room (or drag one with the Room tool)', newItem: () => ({ name: 'New room', rect: [1, 1, 5, 5] }),
      }));
      sect('traps', 'Traps and scripted events (' + (d.traps || []).length + ')', () => this.trapsEditor(d, commit));
      sect('lights', 'Ceiling lights', () => F().list(d.ceilingLights || [], (cl, n, set) => F().params({ variants: 'json', every: 'number', offset: 'json', color: 'color', radius: 'number', intensity: 'number', flicker: 'number', skip: 'number', tag: 'tag' }, cl, (v) => set(v)), {
        onChange: (l) => { if (l.length) d.ceilingLights = l; else delete d.ceilingLights; commit(); this.scheduleReload(); }, title: (cl) => 'every ' + (cl.every || 4) + ' tiles on floor ' + JSON.stringify(cl.variants || 'any'), addLabel: 'Add a grid of lights', newItem: () => ({ variants: [0], every: 4, offset: [2, 2], color: '#f2f5ff', radius: 180, intensity: 0.5 }),
      }));
      sect('size', 'Map size', () => this.sizePanel());
    }
    checkPanel() {
      const box = h('div');
      const probs = this.problems || [];
      if (!probs.length) box.appendChild(h('p', { class: 'ok', style: { color: 'var(--good)' } }, 'The start reaches the exit, and every tag a trap uses exists.'));
      for (const p of probs) box.appendChild(h('div', { class: 'note ' + (p.level === 'bad' ? 'bad' : 'warn'), style: { marginBottom: '6px' } }, p.text, p.i != null ? h('button', { class: 'btn tiny', style: { marginLeft: '8px' }, on: { click: () => { this.centerOn(p.i); this.select(p.i); } } }, 'Show') : null));
      return box;
    }
    sizePanel() {
      let w = this.doc.w, hh = this.doc.h, anchor = 'tl';
      return h('div', null,
        h('div', { class: 'grid2' }, F().field('Width', F().number(w, (v) => (w = v), { min: 4, max: 300 })), F().field('Height', F().number(hh, (v) => (hh = v), { min: 4, max: 300 }))),
        F().field('Keep the map', F().select(anchor, [['tl', 'at the top left'], ['c', 'in the middle'], ['br', 'at the bottom right']], (v) => (anchor = v))),
        h('button', { class: 'btn small', on: { click: () => this.resize(w, hh, anchor) } }, 'Resize'),
        h('p', { class: 'hint' }, 'New space is empty (void). Rooms, the start and traps keep their tile numbers, so move them if the map shifts.'));
    }
    resize(w, hh, anchor) {
      const doc = this.doc;
      const dx = anchor === 'tl' ? 0 : anchor === 'c' ? Math.floor((w - doc.w) / 2) : w - doc.w;
      const dy = anchor === 'tl' ? 0 : anchor === 'c' ? Math.floor((hh - doc.h) / 2) : hh - doc.h;
      const n = { ground: new Array(w * hh), objs: new Array(w * hh).fill(null), chars: new Array(w * hh), ochars: new Array(w * hh).fill(null) };
      const VOID = ME.regLegend()[' '] || { terrain: 'void' };
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
        const sx = x - dx, sy = y - dy, j = y * w + x;
        if (sx >= 0 && sy >= 0 && sx < doc.w && sy < doc.h) {
          const i = sy * doc.w + sx;
          n.ground[j] = doc.ground[i];
          n.objs[j] = doc.objs[i];
          n.chars[j] = doc.chars[i];
          n.ochars[j] = doc.ochars[i];
        } else {
          n.ground[j] = VOID;
          n.chars[j] = ' ';
        }
      }
      Object.assign(doc, n, { w, h: hh });
      this.forceCommit = true;
      this.commit('Resize');
      this.reload();
    }
    trapsEditor(d, commit) {
      const tags = new Set();
      for (const g of this.doc.ground) if (g.tag) tags.add(g.tag);
      for (const o of this.doc.objs) if (o && typeof o === 'object' && o.tag) tags.add(o.tag);
      const listId = 'tags-' + this.id.replace(/\W/g, '');
      const dl = h('datalist', { id: listId }, [...tags].map((t) => h('option', { value: t })));
      const box = h('div', null, dl, h('p', { class: 'hint' }, 'A trap waits for one trigger, then runs its effects. Tiles are wired by tag: paint tags with the Tag tool (this floor has ' + (tags.size ? [...tags].join(', ') : 'no tags yet') + ').'));
      const types = Object.keys(ED.engine.LM.registry.effects);
      box.appendChild(F().list(d.traps || [], (tr, n, set) => {
        const trig = tr.trigger || {};
        const setT = (k) => (v) => {
          tr = Object.assign({}, tr, { trigger: Object.assign({}, tr.trigger, { [k]: v }) });
          set(tr);
        };
        const tagIn = F().text(trig.tag, setT('tag'), { mono: true });
        tagIn.setAttribute('list', listId);
        return h('div', null,
          h('div', { class: 'grid2' }, F().field('When', F().select(trig.type, SC().TRIGGERS, setT('type'))), F().field(trig.type === 'flag' ? 'Flag' : 'Tag', tagIn)),
          h('div', { class: 'grid2' }, F().field('Only once', F().bool(tr.once !== false, (v) => { tr = Object.assign({}, tr, { once: v ? undefined : false }); if (v) delete tr.once; set(tr); })), F().field('Re-arms after (s)', F().number(tr.cooldown, (v) => { tr = Object.assign({}, tr, { cooldown: v }); set(tr); }))),
          F().field('Then', F().list(tr.effects || [], (ef, m, setE) => {
            const holder = h('div');
            const draw = () => {
              ED.clear(holder);
              holder.appendChild(F().select(ef.type, types, (t) => { ef = { type: t }; setE(ef); draw(); }));
              const spec = Object.assign({}, SC().TRAP_EFFECTS[ef.type] || {}, { delay: 'number' });
              const params = F().params(spec, ef, (v) => { ef = Object.assign({ type: ef.type }, v); setE(ef); }, { skip: ['type'] });
              ED.$$('input.mono', params).forEach((inp) => inp.setAttribute('list', listId));
              holder.appendChild(params);
            };
            draw();
            return holder;
          }, { onChange: (l) => { tr = Object.assign({}, tr, { effects: l }); set(tr); }, title: (ef) => ef.type + (ef.tag ? ' #' + ef.tag : '') + (ef.text ? ' “' + ef.text.slice(0, 30) + '”' : '') + (ef.delay ? ' after ' + ef.delay + 's' : ''), addLabel: 'Add an effect', newItem: () => ({ type: 'message', text: 'Something shifts.', kind: 'warn' }) })));
      }, { onChange: (l) => { d.traps = l; commit(); }, title: (tr) => ((SC().TRIGGERS.find((t) => t[0] === (tr.trigger || {}).type) || [0, '?'])[1].split(' (')[0]) + ' #' + ((tr.trigger || {}).tag || '') + ' → ' + (tr.effects || []).map((e) => e.type).join(', '), addLabel: 'Add a trap', newItem: () => ({ trigger: { type: 'plate', tag: this.tagName || 'p1' }, effects: [{ type: 'message', text: 'Click.', kind: 'warn' }] }) }));
      return box;
    }
  }
  ED.MapEditor = MapEditor;
  function tagColor(tag) {
    let hsh = 0;
    for (const c of tag) hsh = (hsh * 31 + c.charCodeAt(0)) >>> 0;
    return 'hsl(' + (hsh % 360) + ',80%,62%)';
  }
})();
