/* Linear Maze Editor — js/views/pictures.js
 * Imported pictures (packs/editor/sprites.js): what each one is used by, import,
 * replace and delete.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const M = () => ED.model;

  /** Every place a picture id is referenced: looks, picture tiles, slot symbols. */
  function usesOf(pid) {
    const out = [];
    const scan = (kind, base) => {
      for (const id of M().ids(kind)) {
        const d = M().raw(kind, id);
        if (!d) continue;
        const hit = JSON.stringify(d, (k, v) => (typeof v === 'function' ? undefined : v)).includes('"' + pid + '"');
        if (hit) out.push({ kind, id, href: '#/' + base + '/' + encodeURIComponent(id) });
      }
    };
    scan('enemies', 'monsters');
    scan('items', 'items');
    scan('environments', 'tilesets/sets');
    scan('npcs', 'people');
    return out;
  }

  ED.views.pictures = {
    title: 'Pictures',
    render(el) {
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'Pictures'),
        h('div', { class: 'actions' }, h('button', { class: 'btn', on: { click: () => ED.content.importPicture('picture', () => ED.rerender()) } }, 'Import a picture'))));
      page.appendChild(h('p', { class: 'muted' }, 'Pictures imported for monsters, items and tile sets. They are saved inside packs/editor/sprites.js, so the single-file build carries them. Use one from a monster’s or item’s Look tab (“A picture”), or from a tile set’s “From pictures” tab.'));
      const ids = M().spriteIds().sort();
      if (!ids.length) {
        page.appendChild(h('div', { class: 'empty' }, h('h2', null, 'No pictures yet'), h('p', null, 'Import one here, or from a Look tab. Each Look tab also writes a prompt for an image generator.')));
        return;
      }
      const grid = h('div', { class: 'pictures' });
      for (const pid of ids) {
        const src = M().sprites[pid];
        const uses = usesOf(pid);
        const kb = Math.round((src.length * 3) / 4 / 1024);
        const img = h('img', { src, class: 'sprite-thumb', alt: pid });
        const dims = h('small', { class: 'muted' }, kb + ' KB');
        img.addEventListener('load', () => (dims.textContent = img.naturalWidth + '×' + img.naturalHeight + ' · ' + kb + ' KB'));
        grid.appendChild(h('div', { class: 'picture' },
          h('div', { class: 'pic-frame' }, img),
          h('b', { class: 'mono' }, pid), dims,
          uses.length ? h('div', { class: 'usage' }, uses.map((u) => h('a', { href: u.href, class: 'btn tiny' }, M().name(u.kind, u.id)))) : h('small', { class: 'muted' }, 'Not used yet'),
          h('div', { class: 'actions' },
            h('button', { class: 'btn tiny', title: 'Import a new file under the same name; everything using it updates', on: { click: () => replace(pid) } }, 'Replace'),
            h('button', { class: 'btn tiny quiet danger', on: { click: async () => {
              const ok = await ED.confirm('Delete the picture ' + pid + '?', uses.length ? 'It is used by ' + uses.map((u) => M().name(u.kind, u.id)).join(', ') + '; they will draw a plain placeholder until you pick another picture.' : 'Nothing uses it.', 'Delete', true);
              if (!ok) return;
              M().setSprite(pid, null, 'Delete picture ' + pid);
              ED.rerender();
            } } }, 'Delete'))));
      }
      page.appendChild(grid);
    },
  };

  async function replace(pid) {
    const file = await ED.pickFile('image/*');
    if (!file) return;
    const url = await ED.readFile(file, 'dataURL');
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('That file isn’t a picture the browser can read.'));
      i.src = url;
    }).catch((e) => ED.toast(e.message, 'bad'));
    if (!img) return;
    const keep = h('canvas');
    const r = ED.content.processImage(img, { clearBg: false, trim: false, max: 256 });
    keep.width = r.width;
    keep.height = r.height;
    keep.getContext('2d').drawImage(r, 0, 0);
    M().setSprite(pid, keep.toDataURL('image/png'), 'Replace picture ' + pid);
    ED.toast('Replaced ' + pid, 'good');
    ED.rerender();
  }
})();
