/* Linear Maze Editor — js/app.js
 * Start-up, opening the folder, navigation, undo and redo, and saving.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h, $ = ED.$;

  // ------------------------------------------------------------ view scope: listeners and pending edits per page
  let scope = [];
  ED.listen = (ev, fn) => scope.push(ED.on(ev, fn));
  ED.onLeave = (fn) => scope.push(fn);
  const pending = new Set();
  /** A debounced commit that is flushed before navigating, saving or play testing. */
  ED.pendingCommit = function (fn, ms) {
    const d = ED.debounce(() => {
      pending.delete(d);
      fn();
    }, ms || 350);
    const wrapped = (...a) => {
      pending.add(d);
      d(...a);
    };
    wrapped.flush = () => {
      if (pending.has(d)) {
        pending.delete(d);
        d.flush();
      }
    };
    return wrapped;
  };
  ED.flushAll = () => {
    for (const d of [...pending]) {
      pending.delete(d);
      d.flush();
    }
  };

  // ------------------------------------------------------------ routing
  ED.go = (path) => {
    if (location.hash === '#' + path) route();
    else location.hash = path;
  };
  ED.route = () => location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let current = null;
  function route() {
    if (!ED.ready) return;
    ED.flushAll();
    for (const fn of scope) {
      try {
        fn();
      } catch (e) {}
    }
    scope = [];
    let [view, ...args] = ED.route();
    if (!ED.views[view]) view = 'floors';
    current = view;
    ED.$$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === view));
    const el = $('#view');
    el.className = ED.views[view].full ? 'full' : '';
    ED.clear(el);
    try {
      ED.views[view].render(el, args);
    } catch (e) {
      console.error(e);
      el.appendChild(h('div', { class: 'empty' }, h('h2', null, 'This page failed to draw'), h('p', { class: 'error-text' }, e.message), h('pre', { class: 'mono muted' }, String(e.stack || '').slice(0, 800))));
    }
  }
  window.addEventListener('hashchange', route);
  ED.rerender = route;
  ED.currentView = () => current;

  // ------------------------------------------------------------ top bar
  function refreshBar() {
    const M = ED.model;
    $('#btn-undo').disabled = !M.undoStack.length;
    $('#btn-redo').disabled = !M.redoStack.length;
    $('#btn-undo').title = M.undoStack.length ? 'Undo: ' + M.undoStack[M.undoStack.length - 1].label + ' (Ctrl+Z)' : 'Nothing to undo';
    $('#btn-redo').title = M.redoStack.length ? 'Redo: ' + M.redoStack[M.redoStack.length - 1].label + ' (Ctrl+Shift+Z)' : 'Nothing to redo';
    const dirty = M.isDirty();
    $('#dirty').hidden = !dirty;
    $('#dirty').textContent = 'Unsaved changes';
    $('#btn-save').disabled = !dirty && ED.fs.kind !== 'readonly';
    const n = ED.ser.summary(M.edits()).length;
    const ch = ED.$('#nav a[data-view=changes]');
    if (ch) ch.innerHTML = 'Changes' + (n ? ' <span class="count">' + n + '</span>' : '');
  }
  ED.on('change', () => {
    if (ED.ready) refreshBar();
  });
  ED.undo = () => {
    ED.flushAll();
    const l = ED.model.undo();
    if (l) {
      ED.toast('Undid: ' + l);
      ED.emit('history');
      route();
    }
  };
  ED.redo = () => {
    ED.flushAll();
    const l = ED.model.redo();
    if (l) {
      ED.toast('Redid: ' + l);
      ED.emit('history');
      route();
    }
  };

  // ------------------------------------------------------------ saving
  const TAGS = '<!-- editor pack: everything changed in the Linear Maze Editor (editor/index.html). Remove these three lines to undo all of it. -->\n' +
    '<script src="packs/editor/runtime.js"></script>\n<script src="packs/editor/sprites.js"></script>\n<script src="packs/editor/edits.js"></script>\n';
  function indexWithTags(html) {
    if (ED.engine.EDITOR_SCRIPTS.every((s) => html.includes('<script src="' + s + '"></script>'))) return html;
    let out = html;
    for (const s of ED.engine.EDITOR_SCRIPTS) out = out.replace('<script src="' + s + '"></script>\n', '');
    const at = out.indexOf('<!-- start -->');
    if (at >= 0) return out.slice(0, at) + TAGS + out.slice(at);
    const i = out.lastIndexOf('LM.boot()');
    const s0 = out.lastIndexOf('<script>', i);
    return out.slice(0, s0) + TAGS + out.slice(s0);
  }
  ED.save = async function () {
    ED.flushAll();
    const M = ED.model, fs = ED.fs;
    if (ED.engine.editsError && !ED.editsErrorAccepted) {
      const ok = await ED.confirm('Replace the unreadable edits file?', 'packs/editor/edits.js had an error when the editor opened (' + ED.engine.editsError + '). Saving now replaces it with only what is in the editor.', 'Replace it', true);
      if (!ok) return;
      ED.editsErrorAccepted = true;
    }
    const mtime = await fs.modified('packs/editor/edits.js');
    if (ED.engine.editsMtime && mtime && mtime !== ED.engine.editsMtime && !ED.conflictAccepted) {
      const ok = await ED.confirm('The edits file changed on disk', 'packs/editor/edits.js was changed outside the editor since you opened the folder. Saving overwrites those changes. Reload the folder instead to keep them.', 'Overwrite it', true);
      if (!ok) return;
      ED.conflictAccepted = true;
    }
    const editsText = ED.ser.editsFile(M.edits());
    const spritesText = ED.ser.spritesFile(M.sprites);
    // the file must run: check it in a scratch frame before writing it
    const problem = checkEditsText(editsText);
    if (problem) {
      ED.modal({ title: 'Not saved', body: h('div', null, h('p', null, 'The saved file would not run in the game:'), h('pre', { class: 'mono error-text' }, problem), h('p', { class: 'muted' }, 'This usually means some code typed into a Code tab is unfinished. Fix it and save again.')) });
      return;
    }
    try {
      const html = await fs.read('index.html');
      const withTags = indexWithTags(html);
      const results = [];
      results.push(await fs.write('packs/editor/sprites.js', spritesText));
      results.push(await fs.write('packs/editor/edits.js', editsText));
      if (withTags !== html) results.push(await fs.write('index.html', withTags));
      ED.engine.editsMtime = await fs.modified('packs/editor/edits.js');
      M.markSaved();
      refreshBar();
      if (fs.kind === 'readonly') {
        ED.modal({ title: 'Files downloaded', body: h('div', null,
          h('p', null, 'This browser can’t write into the folder, so the changed files were downloaded. Put them in the game folder:'),
          h('ul', null, h('li', null, h('code', null, 'sprites.js'), ' and ', h('code', null, 'edits.js'), ' → ', h('code', null, 'packs/editor/')), withTags !== html ? h('li', null, h('code', null, 'index.html'), ' → the game folder (replace the old one)') : null)) });
      } else ED.toast('Saved to ' + fs.name, 'good');
      ED.emit('saved');
    } catch (e) {
      console.error(e);
      ED.modal({ title: 'Not saved', body: h('div', null, h('p', null, 'Writing to the folder failed: ' + e.message), h('p', { class: 'muted' }, 'If the browser asked for permission and it was refused, open the folder again and allow editing.')) });
    }
  };
  function checkEditsText(text) {
    try {
      const win = ED.engine.win;
      const X = ED.engine.X;
      const real = X.apply;
      let got = null;
      X.apply = (d) => (got = d);
      try {
        new win.Function(text)();
      } finally {
        X.apply = real;
      }
      if (!got) return 'The file did not call LM.editor.apply.';
      return null;
    } catch (e) {
      return e.message;
    }
  }

  /** Inline every script into dist/, like tools/build.mjs (for people without Node). */
  ED.buildDist = async function () {
    ED.flushAll();
    const fs = ED.fs;
    const html = indexWithTags(await fs.read('index.html'));
    const live = {
      'packs/editor/edits.js': ED.ser.editsFile(ED.model.edits()),
      'packs/editor/sprites.js': ED.ser.spritesFile(ED.model.sprites),
    };
    const files = ED.engine.scriptList(html);
    const texts = {};
    for (const f of files) texts[f] = live[f] != null ? live[f] : await fs.read(f);
    const inlined = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => {
      if (texts[f].includes('</script')) throw new Error(f + ' contains "</script" and cannot be inlined');
      return '<script>/* ' + f + ' */\n' + texts[f] + '\n</script>';
    });
    const artifact = inlined.replace(/^[\s\S]*?<title>/, '<title>').replace('</head>\n<body>\n', '\n').replace(/<\/body>\s*<\/html>\s*$/, '');
    await fs.write('dist/the-linear-maze.html', inlined);
    await fs.write('dist/artifact.html', artifact);
    return { size: Math.round(inlined.length / 1024) };
  };

  // ------------------------------------------------------------ opening the folder
  function status(text, bad) {
    const el = $('#load-status');
    el.hidden = false;
    el.className = 'load-status' + (bad ? ' bad' : '');
    el.textContent = text;
  }
  async function loadFolder() {
    try {
      $('#btn-open').disabled = true;
      const { edits, sprites } = await ED.engine.load((s) => status(s + '…'));
      ED.model.init(edits, sprites);
      // pictures decode after the first bake; repaint tiles and maps when one arrives
      ED.engine.X.onImageLoad = ED.debounce(() => {
        ED.preview.forgetTiles();
        const m = ED.currentMap;
        if (m && m.alive) {
          m.renderer.chunks.clear();
          m.dirty = true;
        }
      }, 120);
      ED.ready = true;
      $('#welcome').hidden = true;
      $('#view').hidden = false;
      $('#nav').hidden = false;
      $('#folder-chip').hidden = false;
      $('#top-actions').hidden = false;
      $('#folder-chip').textContent = ED.fs.name + (ED.fs.kind === 'readonly' ? ' (read-only)' : '');
      $('#btn-play').disabled = false;
      refreshBar();
      if (ED.engine.loadErrors.length) ED.toast('Some game scripts reported errors: ' + ED.engine.loadErrors[0], 'bad', 9000);
      if (ED.engine.editsError) {
        ED.modal({ title: 'The saved edits couldn’t be read', body: h('div', null, h('p', null, 'packs/editor/edits.js has an error:'), h('pre', { class: 'mono error-text' }, ED.engine.editsError), h('p', null, 'The editor opened without those changes. Fix the file by hand and reopen the folder, or carry on: saving will replace the file.')) });
      }
      if (!location.hash || location.hash === '#') location.hash = '/floors';
      else route();
    } catch (e) {
      console.error(e);
      status(e.message, true);
    } finally {
      $('#btn-open').disabled = false;
    }
  }
  ED.reloadFolder = async function () {
    if (ED.model.isDirty() && !(await ED.confirm('Reload the folder?', 'Unsaved changes will be lost.', 'Reload', true))) return;
    ED.ready = false;
    $('#view').hidden = true;
    $('#welcome').hidden = false;
    await loadFolder();
  };

  async function boot() {
    const params = new URLSearchParams(location.search);
    if (params.has('dev')) {
      ED.fs.useDev(params.get('dev') || '../', params.has('put'));
      return loadFolder();
    }
    if (!ED.fs.supported()) {
      $('#btn-open').hidden = true;
      $('#open-hint').hidden = true;
      $('#open-fallback').hidden = false;
    } else {
      const remembered = await ED.fs.remembered();
      if (remembered) {
        const b = $('#btn-reopen');
        b.hidden = false;
        b.textContent = 'Reopen ' + remembered.name;
        b.addEventListener('click', async () => {
          try {
            await ED.fs.reopen(remembered);
            await loadFolder();
          } catch (e) {
            status(e.message, true);
          }
        });
      }
    }
    $('#btn-open').addEventListener('click', async () => {
      try {
        await ED.fs.pick();
      } catch (e) {
        if (e.name !== 'AbortError') status(e.message, true);
        return;
      }
      await loadFolder();
    });
    $('#dir-input').addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      ED.fs.useFiles(e.target.files);
      await loadFolder();
    });
  }

  $('#btn-undo').addEventListener('click', ED.undo);
  $('#btn-redo').addEventListener('click', ED.redo);
  $('#btn-save').addEventListener('click', () => ED.save());
  $('#btn-play').addEventListener('click', () => ED.play.open());
  document.addEventListener('keydown', (e) => {
    if (!ED.ready || ED.$('.modal-wrap') || ED.$('.play-wrap')) return;
    const mod = e.ctrlKey || e.metaKey;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      ED.save();
    } else if (mod && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) ED.redo();
      else ED.undo();
    } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
      e.preventDefault();
      ED.redo();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (ED.ready && ED.model.isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  boot();
})();
