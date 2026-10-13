/* Linear Maze Editor — js/util.js
 * The editor's namespace (ED), a DOM builder, an event bus, toasts, modals and
 * small helpers shared by every view.
 */
'use strict';
(function () {
  const ED = (window.ED = window.ED || {});
  ED.views = {};

  // ------------------------------------------------------------ DOM
  /** h('div', { class, on: { click }, style, ...attrs }, ...children) */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k === 'disabled') el.disabled = !!v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false || c === true) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  ED.h = h;
  ED.append = append;
  ED.$ = (sel, root) => (root || document).querySelector(sel);
  ED.$$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  ED.clear = (el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  };

  // ------------------------------------------------------------ events
  const listeners = {};
  ED.on = (ev, fn) => {
    (listeners[ev] = listeners[ev] || []).push(fn);
    return () => (listeners[ev] = listeners[ev].filter((f) => f !== fn));
  };
  ED.emit = (ev, data) => (listeners[ev] || []).slice().forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.error(e);
    }
  });

  // ------------------------------------------------------------ small helpers
  ED.debounce = (fn, ms) => {
    let t = 0;
    const d = (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
    d.flush = (...a) => {
      clearTimeout(t);
      fn(...a);
    };
    return d;
  };
  ED.slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'new';
  ED.uniqueId = (base, taken) => {
    let id = ED.slug(base), n = 2;
    const has = typeof taken === 'function' ? taken : (x) => taken.includes(x);
    if (!has(id)) return id;
    while (has(id + '-' + n)) n++;
    return id + '-' + n;
  };
  ED.isPlain = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const p = Object.getPrototypeOf(v);
    return p === null || Object.getPrototypeOf(p) === null;
  };
  ED.fnSource = (f) => (typeof f === 'function' ? f.__src || Function.prototype.toString.call(f) : null);
  /** Deep equality for plain data; functions compare by identity or source text. */
  ED.equal = function eq(a, b) {
    if (a === b) return true;
    if (typeof a === 'function' || typeof b === 'function') return typeof a === 'function' && typeof b === 'function' && ED.fnSource(a) === ED.fnSource(b);
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false;
      return true;
    }
    if (ED.isPlain(a) && ED.isPlain(b)) {
      const ka = Object.keys(a).filter((k) => a[k] !== undefined), kb = Object.keys(b).filter((k) => b[k] !== undefined);
      if (ka.length !== kb.length) return false;
      for (const k of ka) if (!eq(a[k], b[k])) return false;
      return true;
    }
    if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
    return false;
  };
  ED.clone = function cl(v) {
    if (Array.isArray(v)) return v.map(cl);
    if (ED.isPlain(v)) {
      const o = {};
      for (const k of Object.keys(v)) o[k] = cl(v[k]);
      return o;
    }
    return v;
  };
  ED.titleCase = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  ED.plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  ED.fmtNum = (n) => (typeof n === 'number' ? (Math.round(n * 1000) / 1000).toString() : String(n));
  ED.copyText = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', left: '-9999px' } });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e2) {}
      ta.remove();
      return ok;
    }
  };
  ED.download = function (name, text, type) {
    const blob = text instanceof Blob ? text : new Blob([text], { type: type || 'text/plain' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  };
  ED.store = {
    get(k, fb) {
      try {
        const v = localStorage.getItem('lm-editor:' + k);
        return v == null ? fb : JSON.parse(v);
      } catch (e) {
        return fb;
      }
    },
    set(k, v) {
      try {
        if (v === undefined) localStorage.removeItem('lm-editor:' + k);
        else localStorage.setItem('lm-editor:' + k, JSON.stringify(v));
      } catch (e) {}
    },
  };

  // ------------------------------------------------------------ toasts
  ED.toast = function (text, kind, ms) {
    const el = h('div', { class: 'toast ' + (kind || '') }, text);
    ED.$('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), ms || (kind === 'bad' ? 6000 : 3200));
    setTimeout(() => el.remove(), (ms || (kind === 'bad' ? 6000 : 3200)) + 400);
    return el;
  };

  // ------------------------------------------------------------ modal dialogs
  /** ED.modal({ title, body, actions: [{ label, primary, danger, onClick -> false keeps it open }], wide, onClose }) */
  ED.modal = function (spec) {
    const root = ED.$('#modal-root');
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey, true);
      if (spec.onClose) spec.onClose();
    };
    const actions = (spec.actions || [{ label: 'Close', primary: true }]).map((a) => {
      const b = h('button', { class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '') + (a.quiet ? ' quiet' : ''), type: 'button', disabled: a.disabled }, a.label);
      b.addEventListener('click', async () => {
        const r = a.onClick ? await a.onClick(b) : undefined;
        if (r !== false) close();
      });
      a.el = b;
      return b;
    });
    const body = typeof spec.body === 'string' ? h('p', null, spec.body) : spec.body;
    const panel = h('div', { class: 'modal' + (spec.wide ? ' wide' : '') + (spec.className ? ' ' + spec.className : ''), role: 'dialog', 'aria-modal': 'true' },
      h('header', null, h('h2', null, spec.title || ''), h('button', { class: 'x', type: 'button', title: 'Close', on: { click: close } }, '×')),
      h('div', { class: 'modal-body' }, body),
      actions.length ? h('footer', null, actions) : null);
    const wrap = h('div', { class: 'modal-wrap', on: { mousedown: (e) => { if (e.target === wrap && spec.dismissable !== false) close(); } } }, panel);
    function onKey(e) {
      if (e.key === 'Escape' && spec.dismissable !== false) {
        e.stopPropagation();
        close();
      }
    }
    document.addEventListener('keydown', onKey, true);
    root.appendChild(wrap);
    const first = panel.querySelector('input, textarea, select') || actions.find((b) => !b.disabled);
    if (first) setTimeout(() => first.focus(), 0);
    return { close, panel, actions: spec.actions };
  };
  ED.confirm = (title, text, okLabel, danger) =>
    new Promise((res) => {
      let done = false;
      ED.modal({
        title,
        body: h('p', null, text),
        actions: [
          { label: 'Cancel', quiet: true, onClick: () => { done = true; res(false); } },
          { label: okLabel || 'OK', primary: !danger, danger, onClick: () => { done = true; res(true); } },
        ],
        onClose: () => { if (!done) res(false); },
      });
    });
  ED.prompt = (title, label, value, okLabel, check) =>
    new Promise((res) => {
      let done = false;
      const input = h('input', { type: 'text', value: value || '', class: 'wide' });
      const err = h('p', { class: 'error-text' });
      const ok = () => {
        const v = input.value.trim();
        const problem = check ? check(v) : !v ? 'Type something first.' : null;
        if (problem) {
          err.textContent = problem;
          return false;
        }
        done = true;
        res(v);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (ok() !== false) m.close();
        }
      });
      const m = ED.modal({
        title,
        body: h('div', null, h('label', { class: 'stack' }, h('span', null, label), input), err),
        actions: [{ label: 'Cancel', quiet: true }, { label: okLabel || 'OK', primary: true, onClick: ok }],
        onClose: () => { if (!done) res(null); },
      });
    });

  /** A tiny tabs control: tabs([{ id, label, render: () => node }], activeId, onSwitch) */
  ED.tabs = function (tabs, active, onSwitch) {
    const bar = h('div', { class: 'tabs', role: 'tablist' });
    const body = h('div', { class: 'tab-body' });
    let cur = tabs.find((t) => t.id === active) ? active : tabs[0] && tabs[0].id;
    const show = (id) => {
      cur = id;
      ED.$$('button', bar).forEach((b) => b.classList.toggle('on', b.dataset.id === id));
      ED.clear(body);
      const t = tabs.find((x) => x.id === id);
      if (t) {
        try {
          append(body, [t.render()]);
        } catch (e) {
          console.error(e);
          body.appendChild(h('p', { class: 'error-text' }, 'This tab failed to draw: ' + e.message));
        }
      }
      if (onSwitch) onSwitch(id);
    };
    for (const t of tabs) {
      if (!t) continue;
      bar.appendChild(h('button', { type: 'button', role: 'tab', dataset: { id: t.id }, on: { click: () => show(t.id) } }, t.label, t.badge ? h('span', { class: 'badge' }, t.badge) : null));
    }
    const el = h('div', { class: 'tabbed' }, bar, body);
    show(cur);
    el.show = show;
    el.current = () => cur;
    return el;
  };

  /** Make a list draggable to reorder. onMove(from, to). Items need data-index. */
  ED.sortable = function (listEl, onMove, handleSel) {
    let dragIdx = -1;
    listEl.addEventListener('dragstart', (e) => {
      const li = e.target.closest('[data-index]');
      if (!li || (handleSel && !e.target.closest(handleSel) && !li.matches('[draggable]'))) return;
      dragIdx = +li.dataset.index;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', String(dragIdx));
      } catch (e2) {}
    });
    listEl.addEventListener('dragover', (e) => {
      if (dragIdx < 0) return;
      e.preventDefault();
      const li = e.target.closest('[data-index]');
      ED.$$('.drop-before,.drop-after', listEl).forEach((x) => x.classList.remove('drop-before', 'drop-after'));
      if (li) {
        const r = li.getBoundingClientRect();
        li.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
      }
    });
    listEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const li = e.target.closest('[data-index]');
      ED.$$('.drop-before,.drop-after,.dragging', listEl).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'dragging'));
      if (!li || dragIdx < 0) return;
      const r = li.getBoundingClientRect();
      let to = +li.dataset.index + (e.clientY < r.top + r.height / 2 ? 0 : 1);
      if (to > dragIdx) to--;
      if (to !== dragIdx) onMove(dragIdx, to);
      dragIdx = -1;
    });
    listEl.addEventListener('dragend', () => {
      dragIdx = -1;
      ED.$$('.drop-before,.drop-after,.dragging', listEl).forEach((x) => x.classList.remove('drop-before', 'drop-after', 'dragging'));
    });
  };

  /** Read a File as text or data URL. */
  ED.readFile = (file, how) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      if (how === 'dataURL') r.readAsDataURL(file);
      else r.readAsText(file);
    });
  ED.pickFile = (accept) =>
    new Promise((res) => {
      const inp = h('input', { type: 'file', accept: accept || '*/*', style: { display: 'none' } });
      inp.addEventListener('change', () => {
        res(inp.files[0] || null);
        inp.remove();
      });
      document.body.appendChild(inp);
      inp.click();
    });
})();
