/* Linear Maze Editor — js/forms.js
 * Form controls. Each control takes the current value and an onChange callback and
 * returns a DOM element. F.form() lays out a schema (js/schemas.js) for a draft.
 * Text that players read in the game is set in Spectral (opts.world).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = (ED.forms = {});
  const SC = () => ED.schemas;

  F.field = (label, control, help, cls) => h('div', { class: 'field' + (cls ? ' ' + cls : '') }, h('label', { class: 'lbl' }, label), h('div', { class: 'ctl' }, control, help ? h('small', { class: 'help' }, help) : null));

  F.text = (v, cb, o) => {
    o = o || {};
    const el = h('input', { type: 'text', value: v == null ? '' : v, placeholder: o.placeholder || '', class: (o.world ? 'world' : '') + (o.mono ? ' mono' : '') + (o.cls ? ' ' + o.cls : '') });
    el.addEventListener('input', () => cb(o.emptyUndefined && !el.value ? undefined : el.value));
    return el;
  };
  F.longtext = (v, cb, o) => {
    o = o || {};
    const el = h('textarea', { rows: o.rows || Math.min(10, Math.max(3, String(v || '').split('\n').length + 1)), class: (o.world ? 'world' : '') + (o.mono ? ' mono' : ''), placeholder: o.placeholder || '' });
    el.value = v == null ? '' : v;
    el.addEventListener('input', () => cb(o.emptyUndefined && !el.value ? undefined : el.value));
    return el;
  };
  F.number = (v, cb, o) => {
    o = o || {};
    const el = h('input', { type: 'number', class: 'num', step: o.step || 'any', min: o.min, max: o.max, placeholder: o.placeholder != null ? String(o.placeholder) : '' });
    el.value = v == null || Number.isNaN(v) ? '' : String(v);
    el.addEventListener('input', () => {
      if (el.value === '') return cb(undefined);
      const n = parseFloat(el.value);
      if (!Number.isNaN(n)) cb(n);
    });
    return el;
  };
  F.bool = (v, cb, label) => {
    const el = h('input', { type: 'checkbox', checked: !!v });
    el.addEventListener('change', () => cb(el.checked));
    return label ? h('label', { class: 'check' }, el, h('span', null, label)) : el;
  };
  const isHex = (s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s || ''));
  const toHex6 = (s) => (/^#[0-9a-f]{3}$/i.test(s) ? '#' + s.slice(1).split('').map((c) => c + c).join('') : s);
  F.color = (v, cb, o) => {
    o = o || {};
    const pick = h('input', { type: 'color', value: isHex(v) ? toHex6(v) : '#888888', title: 'Pick a colour' });
    const txt = h('input', { type: 'text', class: 'mono hex', value: v == null ? '' : v, placeholder: o.allowEmpty ? 'none' : '#rrggbb' });
    const sw = h('span', { class: 'swatch' + (v ? '' : ' none') });
    if (v) sw.style.background = v;
    pick.addEventListener('input', () => {
      txt.value = pick.value;
      sw.style.background = pick.value;
      sw.classList.remove('none');
      cb(pick.value);
    });
    txt.addEventListener('input', () => {
      const s = txt.value.trim();
      if (!s && o.allowEmpty) {
        sw.classList.add('none');
        return cb(undefined);
      }
      if (isHex(s)) pick.value = toHex6(s);
      sw.style.background = s;
      sw.classList.remove('none');
      if (s) cb(s);
    });
    return h('span', { class: 'color' }, h('label', { class: 'swatch-wrap' }, sw, pick), txt);
  };
  /** options: [value] or [[value, label]]. Values can be any JSON value. */
  F.select = (v, options, cb, o) => {
    o = o || {};
    const opts = options.map((x) => (Array.isArray(x) ? x : [x, x === '' ? o.emptyLabel || '(none)' : String(x)]));
    const el = h('select', { class: o.cls || '' });
    let found = false;
    opts.forEach(([val, label], i) => {
      const op = h('option', { value: String(i) }, label);
      if (ED.equal(val, v) || (val === undefined && v == null && !found && !opts.some((p) => ED.equal(p[0], v)))) {
        op.selected = true;
        found = true;
      }
      el.appendChild(op);
    });
    if (!found && v != null) {
      el.appendChild(h('option', { value: 'cur', selected: true }, String(typeof v === 'object' ? JSON.stringify(v) : v) + ' (custom)'));
    }
    el.addEventListener('change', () => {
      if (el.value === 'cur') return;
      cb(opts[+el.value][0]);
    });
    return el;
  };
  F.idOptions = (kind, o) => {
    o = o || {};
    const ids = ED.model.ids(kind).filter((id) => !o.filter || o.filter(id));
    const opts = ids.map((id) => [id, kind === 'behaviors' || kind === 'effects' || kind === 'attacks' || kind === 'textures' ? id : ED.model.name(kind, id) + (ED.model.name(kind, id).toLowerCase() === id.replace(/-/g, ' ') ? '' : '  (' + id + ')')]);
    opts.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    if (o.allowEmpty) opts.unshift([undefined, o.emptyLabel || '(none)']);
    if (o.extra) opts.unshift(...o.extra);
    return opts;
  };
  F.idSelect = (kind, v, cb, o) => F.select(v, F.idOptions(kind, o), cb, o);
  /** A list of ids as chips, with an add menu. */
  F.ids = (kind, list, cb, o) => {
    o = o || {};
    list = (list || []).slice();
    const box = h('div', { class: 'chips' });
    const draw = () => {
      ED.clear(box);
      list.forEach((id, i) => box.appendChild(h('span', { class: 'chip' }, ED.model.exists(kind, id) ? ED.model.name(kind, id) : id,
        h('button', { type: 'button', class: 'x', title: 'Remove', on: { click: () => { list.splice(i, 1); cb(list.slice()); draw(); } } }, '×'))));
      const add = F.select(undefined, [[undefined, o.addLabel || '+ add']].concat(F.idOptions(kind, o).filter(([id]) => o.allowRepeat || !list.includes(id))), (id) => {
        if (id == null) return;
        list.push(id);
        cb(list.slice());
        draw();
      }, { cls: 'add-select' });
      box.appendChild(add);
    };
    draw();
    return box;
  };
  F.range2 = (v, cb) => {
    const a = (v && v[0]) != null ? v[0] : '', b = (v && v[1]) != null ? v[1] : '';
    let cur = [a === '' ? undefined : a, b === '' ? undefined : b];
    const n1 = F.number(cur[0], (x) => { cur[0] = x; cb(cur[0] == null && cur[1] == null ? undefined : [cur[0] || 0, cur[1] || 0]); });
    const n2 = F.number(cur[1], (x) => { cur[1] = x; cb(cur[0] == null && cur[1] == null ? undefined : [cur[0] || 0, cur[1] || 0]); });
    return h('span', { class: 'range2' }, n1, h('span', { class: 'muted' }, 'to'), n2);
  };
  F.stringList = (list, cb, o) => {
    o = o || {};
    return F.list(list || [], (s, i, set) => F.longtext(s, (v) => set(v), { world: o.world, rows: 2 }), {
      onChange: cb, addLabel: o.addLabel || 'Add a line', newItem: () => '', compact: true,
    });
  };
  F.mods = (mods, cb) => {
    const entries = Object.entries(mods || {});
    const box = h('div', { class: 'mods' });
    const emit = () => {
      const o = {};
      for (const [k, v] of entries) if (k && v != null && !Number.isNaN(v)) o[k] = v;
      cb(o);
    };
    const draw = () => {
      ED.clear(box);
      entries.forEach((e, i) => {
        box.appendChild(h('div', { class: 'row' },
          F.select(e[0], SC().STATS.map((s) => [s[0], s[1]]), (k) => { e[0] = k; emit(); }),
          F.number(e[1], (v) => { e[1] = v; emit(); }, { step: (SC().STATS.find((s) => s[0] === e[0]) || [])[3] || 1 }),
          h('button', { type: 'button', class: 'btn tiny quiet', title: 'Remove', on: { click: () => { entries.splice(i, 1); emit(); draw(); } } }, 'Remove')));
      });
      box.appendChild(h('button', { type: 'button', class: 'btn tiny', on: { click: () => { entries.push([SC().STATS.find((s) => !entries.some((x) => x[0] === s[0]))[0], 0]); emit(); draw(); } } }, 'Add a stat change'));
    };
    draw();
    return box;
  };
  F.light = (v, cb) => {
    if (typeof v === 'function') {
      return h('div', { class: 'note' }, 'Set by code (it can depend on the floor or on placement). ',
        h('button', { type: 'button', class: 'btn tiny', on: { click: (e) => { cb({ color: '#ffb060', radius: 160, intensity: 0.7, flicker: 0.1 }); e.target.closest('.ctl').replaceChildren(F.light({ color: '#ffb060', radius: 160, intensity: 0.7, flicker: 0.1 }, cb)); } } }, 'Replace with a fixed light'));
    }
    const cur = v ? Object.assign({}, v) : null;
    const box = h('div', { class: 'light' });
    const draw = () => {
      ED.clear(box);
      box.appendChild(F.bool(!!cur, (on) => {
        if (on) cb(Object.assign(cur || {}, { color: (cur && cur.color) || '#ffb060', radius: (cur && cur.radius) || 160, intensity: cur && cur.intensity != null ? cur.intensity : 0.7, flicker: (cur && cur.flicker) || 0 }));
        else cb(undefined);
        box.replaceWith(F.light(on ? { color: '#ffb060', radius: 160, intensity: 0.7, flicker: 0, ...(cur || {}) } : undefined, cb));
      }, 'On'));
      if (!cur) return;
      const set = (k) => (x) => {
        cur[k] = x;
        cb(Object.assign({}, cur));
      };
      box.appendChild(h('div', { class: 'grid4' },
        F.field('Colour', F.color(cur.color, set('color'))),
        F.field('Radius', F.number(cur.radius, set('radius'))),
        F.field('Brightness', F.number(cur.intensity, set('intensity'), { step: 0.05, min: 0, max: 1.5 })),
        F.field('Flicker', F.number(cur.flicker, set('flicker'), { step: 0.02, min: 0, max: 1 }))));
    };
    draw();
    return box;
  };
  /** A small object with typed fields: fields { key: type }. */
  F.object = (v, fields, cb, o) => {
    const cur = Object.assign({}, v || {});
    const rows = Object.entries(fields).map(([k, type]) => F.field(o && o.labels && o.labels[k] ? o.labels[k] : ED.titleCase(k), F.typed(type, cur[k], (x) => {
      if (x === undefined || x === '') delete cur[k];
      else cur[k] = x;
      cb(Object.keys(cur).length ? Object.assign({}, cur) : undefined);
    }, { key: k, keepEmpty: true })));
    return h('div', { class: 'subform' }, rows);
  };
  F.json = (v, cb, o) => {
    o = o || {};
    let hasFn = false;
    const text = JSON.stringify(v, (k, x) => {
      if (typeof x === 'function') {
        hasFn = true;
        return '(code)';
      }
      return x;
    }, 1);
    if (hasFn) return h('div', { class: 'note' }, 'Contains code. Edit it on the Code tab.');
    const ta = h('textarea', { class: 'mono', rows: o.rows || Math.min(14, (text || '').split('\n').length + 1) });
    ta.value = text == null ? '' : text;
    const err = h('small', { class: 'error-text' });
    ta.addEventListener('input', () => {
      if (!ta.value.trim()) {
        err.textContent = '';
        return cb(undefined);
      }
      try {
        const x = JSON.parse(ta.value);
        err.textContent = '';
        cb(x);
      } catch (e) {
        err.textContent = 'Not valid JSON yet: ' + e.message;
      }
    });
    return h('div', null, ta, err);
  };

  // ------------------------------------------------------------ code
  /** A function's source, editable. Checks syntax and warns about names it can't see once saved. */
  F.code = (src, cb, o) => {
    o = o || {};
    const ta = h('textarea', { class: 'code', spellcheck: 'false', rows: o.rows || Math.min(26, Math.max(6, String(src || '').split('\n').length + 1)) });
    ta.value = src || '';
    const msg = h('div', { class: 'code-msg' });
    const check = () => {
      const s = ta.value.trim();
      msg.className = 'code-msg';
      if (!s) {
        msg.textContent = '';
        return cb(undefined);
      }
      const norm = ED.ser.normalizeFn(s);
      const err = ED.ser.checkFn(norm);
      if (err) {
        msg.className = 'code-msg bad';
        msg.textContent = 'Not saved yet: ' + err;
        return;
      }
      let fn;
      try {
        fn = ED.engine.compile(norm, o.name);
      } catch (e) {
        msg.className = 'code-msg bad';
        msg.textContent = 'Not saved yet: ' + e.message;
        return;
      }
      fn.__src = norm;
      const free = ED.ser.freeNames(norm, ED.engine.X.PRELUDE_NAMES.concat(o.known || []));
      if (free.length) {
        msg.className = 'code-msg warn';
        msg.textContent = 'Saved. It mentions ' + free.slice(0, 6).join(', ') + (free.length > 6 ? '…' : '') + ', which may only exist inside its original pack file. If the game reports “not defined”, replace those.';
      } else {
        msg.className = 'code-msg good';
        msg.textContent = 'Saved.';
      }
      cb(fn);
    };
    const deb = ED.debounce(check, 500);
    ta.addEventListener('input', deb);
    ta.addEventListener('blur', () => deb.flush());
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText('  ', s, ta.selectionEnd, 'end');
        deb();
      }
    });
    return h('div', { class: 'code-wrap' }, ta, msg);
  };

  // ------------------------------------------------------------ lists
  /** A list editor. renderItem(item, index, set(newValue)) -> node. o: { onChange, newItem, addLabel, title(item,i), compact, open } */
  F.list = (items, renderItem, o) => {
    o = o || {};
    const list = (items || []).slice();
    const box = h('div', { class: 'list' + (o.compact ? ' compact' : '') });
    const emit = () => o.onChange(list.slice());
    const draw = () => {
      ED.clear(box);
      list.forEach((it, i) => {
        const set = (v) => {
          list[i] = v;
          emit();
          if (o.title && head) titleEl.textContent = o.title(v, i);
        };
        const tools = h('span', { class: 'tools' },
          i > 0 ? h('button', { type: 'button', class: 'btn tiny quiet', title: 'Move up', on: { click: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; emit(); draw(); } } }, '↑') : null,
          i < list.length - 1 ? h('button', { type: 'button', class: 'btn tiny quiet', title: 'Move down', on: { click: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; emit(); draw(); } } }, '↓') : null,
          o.noCopy ? null : h('button', { type: 'button', class: 'btn tiny quiet', title: 'Copy', on: { click: () => { list.splice(i + 1, 0, ED.clone(list[i])); emit(); draw(); } } }, 'Copy'),
          h('button', { type: 'button', class: 'btn tiny quiet danger', title: 'Delete', on: { click: () => { list.splice(i, 1); emit(); draw(); } } }, 'Delete'));
        const titleEl = h('span', { class: 'item-title' }, o.title ? o.title(it, i) : '');
        const head = o.title ? h('div', { class: 'item-head' }, titleEl, tools) : null;
        const bodyEl = h('div', { class: 'item-body' }, renderItem(it, i, set));
        const row = h(o.title ? 'details' : 'div', { class: 'list-item', open: o.title ? (o.open || list.length <= 3 ? true : undefined) : undefined }, o.title ? h('summary', null, head) : null, bodyEl, o.title ? null : tools);
        box.appendChild(row);
      });
      if (o.newItem) box.appendChild(h('button', { type: 'button', class: 'btn tiny add', on: { click: () => { list.push(o.newItem()); emit(); draw(); } } }, o.addLabel || 'Add'));
    };
    draw();
    return box;
  };

  /** Typed control for compact param tables: 'number' | 'text' | 'longtext' | 'color' | 'bool' | 'id:kind' | 'ids:kind' | [options] | 'mods' | 'stringlist' | 'tag' | 'json' | 'loot' */
  F.typed = (type, v, cb, o) => {
    o = o || {};
    if (Array.isArray(type)) return F.select(v, [[undefined, '(default)']].concat(type.map((x) => (Array.isArray(x) ? x : [x, x]))), cb);
    if (type === 'number') return F.number(v, cb, { step: o.step });
    if (type === 'text' || type === 'tag') return F.text(v, cb, { emptyUndefined: true, mono: type === 'tag', placeholder: type === 'tag' ? 'tag name' : '' });
    if (type === 'longtext') return F.longtext(v, cb, { world: true, emptyUndefined: true, rows: 3 });
    if (type === 'color') return F.color(v, cb, { allowEmpty: true });
    if (type === 'bool') return F.bool(v, cb);
    if (type === 'mods') return F.mods(v, cb);
    if (type === 'stringlist') return F.stringList(v, cb, { world: true });
    if (type === 'json') return F.json(v, cb, { rows: 3 });
    if (type === 'loot') return F.lootEntries(v, cb);
    if (type === 'blessingOrRandom') return F.select(v, [['random', 'Random']].concat(F.idOptions('blessings')), cb);
    if (type.startsWith('id:')) return F.idSelect(type.slice(3), v, cb, { allowEmpty: true });
    if (type.startsWith('ids:')) return F.ids(type.slice(4), v, (x) => cb(x.length || o.keepEmpty ? x : undefined));
    return F.text(v, cb);
  };
  /** A table of named params. spec { key: type }, value { key: v }. */
  F.params = (spec, value, cb, o) => {
    o = o || {};
    const cur = Object.assign({}, value || {});
    const keys = Object.keys(spec).concat(Object.keys(cur).filter((k) => !(k in spec) && !(o.skip || []).includes(k)));
    const grid = h('div', { class: 'params' });
    for (const k of keys) {
      if ((o.skip || []).includes(k)) continue;
      const type = spec[k] || (typeof cur[k] === 'number' ? 'number' : typeof cur[k] === 'boolean' ? 'bool' : typeof cur[k] === 'string' ? (isHex(cur[k]) ? 'color' : 'text') : 'json');
      const ctl = F.typed(type, cur[k], (x) => {
        if (x === undefined) delete cur[k];
        else cur[k] = x;
        cb(Object.assign({}, cur));
      }, { key: k });
      const wide = ['longtext', 'stringlist', 'mods', 'json', 'loot'].includes(type) || String(type).startsWith('ids:');
      grid.appendChild(h('label', { class: 'param' + (wide ? ' wide' : ''), title: (o.help && o.help[k]) || '' }, h('span', null, (o.labels && o.labels[k]) || k), ctl));
    }
    return grid;
  };

  // ------------------------------------------------------------ effects, loot, attacks, abilities
  F.effectSummary = (ef) => {
    const X = ED.engine.X;
    const fx = X.effects[ef.type];
    const label = fx ? fx.label : ef.type;
    const bits = Object.entries(ef).filter(([k]) => !['type', 'fromProps'].includes(k)).map(([k, v]) => k + ' ' + (typeof v === 'object' ? JSON.stringify(v) : v));
    return label + (bits.length ? ': ' + bits.join(', ').slice(0, 80) : '');
  };
  F.effects = (list, cb, o) => {
    o = o || {};
    const X = ED.engine.X;
    const types = Object.keys(X.effects).map((t) => [t, X.effects[t].label]);
    return F.list(list || [], (ef, i, set) => {
      const box = h('div', { class: 'effect' });
      const draw = () => {
        ED.clear(box);
        box.appendChild(h('div', { class: 'row' }, F.select(ef.type, types, (t) => {
          ef = Object.assign({ type: t }, ED.clone(X.effects[t].params || {}));
          set(ef);
          draw();
        }), h('small', { class: 'help' }, SC().EFFECT_HELP[ef.type] || '')));
        const spec = Object.assign({}, SC().EFFECT_FIELDS[ef.type] || {}, { delay: 'number' });
        if (ef.type === 'trap' && ef.effect) Object.assign(spec, SC().TRAP_EFFECTS[ef.effect] || {});
        box.appendChild(F.params(spec, ef, (v) => {
          const changedEffect = v.effect !== ef.effect;
          ef = Object.assign({ type: ef.type }, v);
          set(ef);
          if (changedEffect) draw();
        }, { skip: ['type', 'fromProps'], labels: { delay: 'delay (s)' } }));
      };
      draw();
      return box;
    }, { onChange: cb, title: (ef) => F.effectSummary(ef), addLabel: o.addLabel || 'Add an effect', newItem: () => ({ type: 'message', text: 'Something happens.', kind: 'good' }) });
  };
  F.lootEntry = (e, set) => {
    const types = [['gold', 'Gold'], ['ammo', 'Ammunition'], ['weapon', 'Weapon'], ['armor', 'Armor'], ['key', 'Key'], ['item', 'Item']];
    const box = h('div', { class: 'row loot-entry' });
    const draw = () => {
      ED.clear(box);
      box.appendChild(F.select(e.type, types, (t) => {
        e = { type: t };
        if (t === 'gold') e.amount = 20;
        if (t === 'ammo') e.ammo = 'carried';
        if (t === 'weapon') e.id = 'scattergun';
        if (t === 'armor') e.id = 'iron-sallet';
        if (t === 'key') e.color = 'red';
        if (t === 'item') e.id = 'health-vial';
        set(e);
        draw();
      }));
      const upd = (k) => (v) => {
        e = Object.assign({}, e, { [k]: v });
        if (v === undefined) delete e[k];
        set(e);
      };
      if (e.type === 'gold') box.appendChild(F.amount(e.amount, upd('amount')));
      if (e.type === 'ammo') box.append(F.select(e.ammo, [['carried', 'for a carried weapon']].concat(SC().AMMO), upd('ammo')), F.amount(e.amount, upd('amount'), true));
      if (e.type === 'weapon') box.appendChild(F.idSelect('weapons', e.id, upd('id')));
      if (e.type === 'armor') box.appendChild(F.idSelect('armor', e.id, upd('id')));
      if (e.type === 'key') box.appendChild(F.select(e.color, SC().KEYS, upd('color')));
      if (e.type === 'item') box.appendChild(F.idSelect('items', e.id, upd('id')));
    };
    draw();
    return box;
  };
  /** A number or a [min, max] range. */
  F.amount = (v, cb, optional) => {
    let ranged = Array.isArray(v);
    const box = h('span', { class: 'amount' });
    const draw = () => {
      ED.clear(box);
      box.appendChild(ranged ? F.range2(v, (x) => { v = x; cb(x); }) : F.number(v, (x) => { v = x; cb(x); }, { placeholder: optional ? 'default' : '' }));
      box.appendChild(h('button', { type: 'button', class: 'btn tiny quiet', title: ranged ? 'Use one number' : 'Use a random range', on: { click: () => {
        ranged = !ranged;
        v = ranged ? [Array.isArray(v) ? v[0] : v || 1, Array.isArray(v) ? v[1] : (v || 1) * 2] : Array.isArray(v) ? v[0] : v;
        cb(v);
        draw();
      } } }, ranged ? 'single' : 'range'));
    };
    draw();
    return box;
  };
  F.lootEntries = (list, cb) => F.list(list || [], (e, i, set) => F.lootEntry(e, set), { onChange: (l) => cb(l.length ? l : undefined), addLabel: 'Add loot', newItem: () => ({ type: 'gold', amount: 20 }), compact: true, noCopy: true });

  F.attackSummary = (a) => {
    const t = SC().ATTACKS[a.type];
    return (t ? t.label : a.type) + (a.damage != null ? ' · ' + a.damage + ' damage' : '') + (a.burst > 1 ? ' ×' + a.burst : '') + (a.cooldown != null ? ' · every ' + a.cooldown + 's' : '') + (a.enemy ? ' · ' + a.enemy : '');
  };
  F.attacks = (list, cb) => {
    const types = Object.keys(ED.engine.LM.registry.attacks).map((t) => [t, (SC().ATTACKS[t] || { label: t }).label]);
    return F.list(list || [], (a, i, set) => {
      const box = h('div');
      const draw = () => {
        ED.clear(box);
        box.appendChild(h('div', { class: 'row' }, F.field('Type', F.select(a.type, types, (t) => {
          a = Object.assign({ type: t }, ED.clone((SC().ATTACKS[t] || {}).params || {}));
          set(a);
          draw();
        }))));
        const spec = {};
        const known = (SC().ATTACKS[a.type] || {}).params || {};
        for (const k of Object.keys(known)) spec[k] = k === 'projectile' ? 'id:projectiles' : k === 'enemy' ? 'id:enemies' : typeof known[k] === 'boolean' ? 'bool' : typeof known[k] === 'string' && known[k].startsWith('#') ? 'color' : 'number';
        box.appendChild(F.params(spec, a, (v) => {
          a = Object.assign({ type: a.type }, v);
          set(a);
        }, { skip: ['type'], help: SC().ATTACK_HELP }));
      };
      draw();
      return box;
    }, { onChange: cb, title: F.attackSummary, addLabel: 'Add an attack', newItem: () => Object.assign({ type: 'melee' }, ED.clone(SC().ATTACKS.melee.params)) });
  };

  F.abilitySummary = (a) => (a.label || 'Use') + (a.cost ? ' · ' + a.cost + ' gold' : ' · free') + (a.limit ? ' · ' + a.limit + (a.limit === 1 ? ' use' : ' uses') : '') + ' · ' + ED.plural((a.outcomes || []).length, 'outcome');
  F.abilities = (list, cb) =>
    F.list(list || [], (a, i, set) => {
      const up = (k) => (v) => {
        a = Object.assign({}, a, { [k]: v });
        if (v === undefined || v === '') delete a[k];
        set(a);
      };
      const rq = a.requires || {};
      const setRq = (k) => (v) => {
        const r = Object.assign({}, a.requires || {}, { [k]: v });
        if (!v) delete r[k];
        up('requires')(Object.keys(r).length ? r : undefined);
      };
      const total = () => (a.outcomes || []).reduce((s, o) => s + (o.weight == null ? 1 : o.weight), 0) || 1;
      const outcomes = F.list(a.outcomes || [], (oc, j, setO) => {
        const upO = (k) => (v) => {
          oc = Object.assign({}, oc, { [k]: v });
          if (v === undefined || v === '') delete oc[k];
          setO(oc);
        };
        return h('div', { class: 'outcome' },
          h('div', { class: 'grid3' },
            F.field('Weight', F.number(oc.weight == null ? 1 : oc.weight, upO('weight'), { min: 0 }), Math.round(((oc.weight == null ? 1 : oc.weight) / total()) * 100) + '% of the time'),
            F.field('Mood', F.select(oc.kind || 'good', [['good', 'Good'], ['bad', 'Bad']], upO('kind'))),
            F.field('Sound', F.select(oc.sound, [[undefined, '(from effects)']].concat(SC().SOUNDS.map((s) => [s, s])), upO('sound')))),
          F.field('Result text', F.longtext(oc.text, upO('text'), { world: true, rows: 2, emptyUndefined: true }), 'Placeholders: {healed} {gold} {blessing} {blessingDesc} {ammo} {item} {buff}'),
          F.field('Effects', F.effects(oc.effects || [], upO('effects'))));
      }, { onChange: (l) => up('outcomes')(l), title: (oc) => (oc.weight == null ? 1 : oc.weight) + ' · ' + ((oc.effects || []).map((e) => e.type).join(', ') || 'nothing') + (oc.text ? ' · “' + oc.text.slice(0, 40) + (oc.text.length > 40 ? '…' : '') + '”' : ''), addLabel: 'Add an outcome', newItem: () => ({ weight: 1, effects: [], text: '' }) });
      return h('div', { class: 'ability' },
        h('div', { class: 'grid2' },
          F.field('Button label', F.text(a.label, up('label'))),
          F.field('Cost (gold)', F.number(a.cost, up('cost'), { min: 0 }), a.costProp ? 'A placed ' + a.costProp + ' setting overrides this.' : '')),
        F.field('Description', F.longtext(a.desc, up('desc'), { world: true, rows: 2, emptyUndefined: true })),
        h('div', { class: 'grid3' },
          F.field('Uses per item', F.number(a.limit, up('limit'), { min: 0, placeholder: 'unlimited' }), a.limitProp ? 'A placed “' + a.limitProp + '” setting overrides this.' : ''),
          F.field('Choose', F.select(a.pick || 'random', [['random', 'one outcome at random'], ['all', 'every outcome']], (v) => up('pick')(v === 'random' ? undefined : v))),
          F.field('When used up', F.text(a.usedText, up('usedText'), { emptyUndefined: true, placeholder: 'Used up.' }))),
        h('div', { class: 'grid3' },
          F.field('Only when hurt', F.bool(rq.hurt, setRq('hurt'))),
          F.field('Needs story flag', F.text(rq.flag, setRq('flag'), { emptyUndefined: true, mono: true })),
          F.field('Sets story flag', F.text(a.flag, up('flag'), { emptyUndefined: true, mono: true }))),
        F.field('Outcomes', outcomes));
    }, { onChange: cb, title: F.abilitySummary, addLabel: 'Add an ability', newItem: () => ({ label: 'Use it', cost: 0, limit: 1, desc: '', outcomes: [{ weight: 1, effects: [{ type: 'heal', amount: 20 }], text: 'You feel better. +{healed} health.' }] }) });

  // ------------------------------------------------------------ schema forms
  /** Lay out a schema for a draft. onChange(draft) after any field changes. */
  F.form = (draft, schema, onChange, o) => {
    o = o || {};
    const root = h('div', { class: 'form' });
    let section = root;
    const rows = [];
    for (const f of schema) {
      if (f.section) {
        section = h('fieldset', null, h('legend', null, f.section));
        root.appendChild(section);
        continue;
      }
      const row = h('div', { class: 'form-row' });
      const draw = () => {
        ED.clear(row);
        if (f.when && !f.when(draft)) {
          row.hidden = true;
          return;
        }
        row.hidden = false;
        const v = draft[f.key] === undefined && f.default !== undefined ? f.default : draft[f.key];
        const set = (x) => {
          if (x === undefined || (x === '' && !f.keepEmpty)) delete draft[f.key];
          else draft[f.key] = x;
          for (const r of rows) if (r.f.when) r.draw();
          onChange(draft, f.key);
        };
        let ctl;
        const t = f.type;
        if (t === 'text') ctl = F.text(v, set, { world: f.world, mono: f.mono });
        else if (t === 'longtext') ctl = F.longtext(v, set, { world: f.world });
        else if (t === 'number') ctl = F.number(v, set, f);
        else if (t === 'bool') ctl = F.bool(v, (x) => set(x ? true : f.default === true ? false : undefined));
        else if (t === 'color') ctl = F.color(v, set, f);
        else if (t === 'select') ctl = F.select(v, f.options, set);
        else if (t === 'range2') ctl = F.range2(v, set);
        else if (t === 'mods') ctl = F.mods(v, set);
        else if (t === 'light') ctl = F.light(v, set);
        else if (t === 'object') ctl = F.object(v, f.fields, set);
        else if (t === 'json') ctl = F.json(v, set);
        else if (t && t.startsWith('id:')) ctl = F.idSelect(t.slice(3), v, set, { allowEmpty: f.allowEmpty !== false });
        else if (t && t.startsWith('ids:')) ctl = F.ids(t.slice(4), v, set);
        else ctl = F.text(v, set);
        row.appendChild(F.field(f.label, ctl, f.help));
      };
      rows.push({ f, draw });
      draw();
      section.appendChild(row);
    }
    return root;
  };
})();
