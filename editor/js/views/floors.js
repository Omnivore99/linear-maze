/* Linear Maze Editor — js/views/floors.js
 * The floors of a run, in order: drag to reorder, remove and restore, duplicate,
 * make new ones, and jump into the map editor or a play test.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, M = () => ED.model;

  const thumbs = new Map();
  /** The whole floor baked small with its own tile set. */
  ED.levelThumb = function (id, maxW) {
    const raw = M().raw('levels', id);
    const key = id + ':' + (maxW || 240);
    const hit = thumbs.get(key);
    if (hit && hit.raw === raw && hit.envStamp === envStamp(raw.environment)) return hit.canvas;
    const LM = ED.engine.LM, T = LM.TILE;
    let canvas;
    try {
      const L = new LM.Level(M().get('levels', id));
      const scale = Math.min(0.5, (maxW || 240) / (L.w * T));
      canvas = document.createElement('canvas');
      canvas.width = Math.ceil(L.w * T * scale);
      canvas.height = Math.ceil(L.h * T * scale);
      const fake = { level: L, scale, decals: [], bakeAO: LM.Renderer.prototype.bakeAO, paintDecal: LM.Renderer.prototype.paintDecal };
      const g = canvas.getContext('2d');
      const CHW = LM.CHUNK * T;
      for (let cy = 0; cy * CHW < L.h * T; cy++) for (let cx = 0; cx * CHW < L.w * T; cx++) g.drawImage(LM.Renderer.prototype.bakeChunk.call(fake, cx, cy), cx * CHW * scale, cy * CHW * scale);
      // a dot for every thing on it
      g.fillStyle = 'rgba(242,201,107,0.85)';
      for (const s of L.spawns) if (s.kind !== 'door') g.fillRect((s.x + 0.3) * T * scale, (s.y + 0.3) * T * scale, Math.max(1, 0.4 * T * scale), Math.max(1, 0.4 * T * scale));
      g.fillStyle = '#5cc8e8';
      g.fillRect(L.start.x * T * scale, L.start.y * T * scale, Math.max(2, T * scale), Math.max(2, T * scale));
    } catch (e) {
      console.warn('thumbnail', id, e);
      canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 72;
    }
    thumbs.set(key, { raw, canvas, envStamp: envStamp(raw.environment) });
    return canvas;
  };
  const envStamp = (env) => (M().status('environments', env) ? ED.ser.js((M().edits().patch.environments || {})[env] || (M().edits().add.environments || {})[env] || '').length : 0);
  const copyCanvas = (src) => {
    const c = h('canvas', { class: 'thumb', width: src.width, height: src.height });
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  };

  ED.views.floors = {
    title: 'Floors',
    render(el) {
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      page.appendChild(h('div', { class: 'page-head' },
        h('h1', null, 'Floors'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', on: { click: newFloor } }, 'New floor'),
          h('a', { class: 'btn ai', href: '#/assistant/level' }, 'Ask Claude for a floor'),
          M().edits().levelOrder ? h('button', { class: 'btn quiet', on: { click: () => { M().setLevelOrder(ED.engine.baseLevelOrder.filter((id) => M().ids('levels').includes(id))); ED.rerender(); } } }, 'Original order') : null)));
      page.appendChild(h('p', { class: 'muted' }, 'A run goes from the top of this list to the bottom; finishing the last floor wins the game. Drag to reorder. A floor with its own label (like the 14th floor) doesn’t take a number.'));
      const order = M().levelOrder();
      const list = h('ol', { class: 'floors' });
      order.forEach((id, i) => {
        const d = M().raw('levels', id);
        const st = M().status('levels', id);
        const thumbHolder = h('div', { class: 'thumb' });
        setTimeout(() => thumbHolder.replaceWith(copyCanvas(ED.levelThumb(id, 240))), 20 + i * 30);
        list.appendChild(h('li', { class: 'floor', draggable: 'true', dataset: { index: i } },
          h('span', { class: 'grip', title: 'Drag to reorder' }, '⋮⋮'),
          thumbHolder,
          h('div', { class: 'info' },
            h('span', { class: 'lbl' }, M().floorLabel(id)), st ? h('span', { class: 'flag ' + st, style: { marginLeft: '8px' } }, st === 'added' ? 'new' : 'changed') : null,
            h('b', null, d.name || id),
            h('small', null, id + ' · ' + (M().exists('environments', d.environment) ? M().name('environments', d.environment) : d.environment) + ' · ' + (d.map && d.map.length ? Math.max(...d.map.map((r) => r.length)) + '×' + d.map.length : '?') + (d.armed === false ? ' · peaceful' : '')),
            d.intro ? h('div', { class: 'intro' }, d.intro) : null),
          h('div', { class: 'btns' },
            h('a', { class: 'btn small', href: '#/map/' + encodeURIComponent(id) }, 'Edit map'),
            h('button', { class: 'btn small', on: { click: () => ED.play.open(id) } }, 'Play from here'),
            h('button', { class: 'btn small quiet', title: 'Move up', disabled: i === 0, on: { click: () => move(i, i - 1) } }, '↑'),
            h('button', { class: 'btn small quiet', title: 'Move down', disabled: i === order.length - 1, on: { click: () => move(i, i + 1) } }, '↓'),
            h('button', { class: 'btn small quiet', on: { click: () => ED.content.duplicate('levels', id, 'map') } }, 'Duplicate'),
            h('button', { class: 'btn small quiet danger', on: { click: () => removeFloor(id) } }, 'Remove'))));
      });
      function move(from, to) {
        const o = order.slice();
        const [x] = o.splice(from, 1);
        o.splice(to, 0, x);
        M().setLevelOrder(o);
        ED.rerender();
      }
      ED.sortable(list, move);
      page.appendChild(list);

      const removed = (M().edits().remove.levels || []).filter((id) => M().exists('levels', id));
      if (removed.length) {
        page.appendChild(h('div', { class: 'removed-list' }, h('h3', null, 'Removed floors'), h('p', { class: 'muted' }, 'Taken out of the game. Their files are untouched.'),
          h('ol', { class: 'floors' }, removed.map((id) => h('li', { class: 'floor removed' }, h('span'), h('span'), h('div', { class: 'info' }, h('b', null, M().raw('levels', id).name || id), h('small', null, id)),
            h('div', { class: 'btns' }, h('button', { class: 'btn small', on: { click: () => { M().restore('levels', id); ED.rerender(); } } }, 'Restore')))))));
      }
    },
  };

  async function removeFloor(id) {
    const d = M().raw('levels', id);
    const ok = await ED.confirm('Remove ' + (d.name || id) + '?', 'It is taken out of the run (its file stays as it is) and the floor before it leads to the one after. You can restore it from this page.', 'Remove', true);
    if (!ok) return;
    M().remove('levels', id);
    ED.rerender();
  }

  function newFloor() {
    const name = h('input', { type: 'text', placeholder: 'Name, e.g. The Drowned Library' });
    const env = F().idSelect('environments', ED.preview.defaultEnv(), (v) => (envV = v));
    let envV = ED.preview.defaultEnv();
    let w = 40, hh = 24, start = 'room', copyOf = '';
    const copySel = F().idSelect('levels', undefined, (v) => (copyOf = v || ''), { allowEmpty: true, emptyLabel: '(none)' });
    ED.modal({
      title: 'New floor',
      body: h('div', null,
        F().field('Name', name),
        F().field('Tile set', env),
        F().field('Size (tiles)', h('span', { class: 'range2' }, F().number(w, (v) => (w = v || 40), { min: 8, max: 200 }), h('span', { class: 'muted' }, '×'), F().number(hh, (v) => (hh = v || 24), { min: 8, max: 200 }))),
        F().field('Start with', F().select(start, [['room', 'One big room with a start and an exit'], ['void', 'Nothing (draw everything)']], (v) => (start = v))),
        F().field('Or copy the map of', copySel),
        h('p', { class: 'hint' }, 'It goes at the end of the run. Drag it into place afterwards.')),
      actions: [{ label: 'Cancel', quiet: true }, { label: 'Make it', primary: true, onClick: () => {
        const nm = name.value.trim();
        if (!nm) {
          name.focus();
          return false;
        }
        const id = ED.uniqueId(nm, (x) => M().exists('levels', x));
        if (copyOf) {
          M().duplicate('levels', copyOf, id, { name: nm, environment: envV });
        } else {
          const rows = [];
          for (let y = 0; y < hh; y++) {
            let r = '';
            for (let x = 0; x < w; x++) {
              if (start === 'void') r += ' ';
              else if (y === 0 || y === hh - 1 || x === 0 || x === w - 1) r += '#';
              else if (y === (hh >> 1) && x === 2) r += '<';
              else if (y === (hh >> 1) && x === w - 3) r += '>';
              else r += '.';
            }
            rows.push(r);
          }
          M().create('levels', id, { name: nm, order: 99, environment: envV, intro: '', map: rows, legend: {}, rooms: [], traps: [] }, 'New floor ' + nm);
        }
        ED.go('/map/' + encodeURIComponent(id));
      } }],
    });
  }
  ED.newFloor = newFloor;
})();
