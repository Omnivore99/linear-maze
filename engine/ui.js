/* The Linear Maze — engine/ui.js
 * DOM HUD, minimap, toasts, and the pop-up (modal) system. Content packs
 * build their own pop-ups (chests, stations, altars, slot machines) with
 * LM.ui.open({...}) and the small helpers exported here.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const ui = (LM.ui = {});
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------ element builder
  /** h('div', { class: 'x', on: { click: fn } }, child, 'text', ...) */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
        else if (k === 'style') el.setAttribute('style', v);
        else if (k === 'disabled') el.disabled = !!v;
        else el.setAttribute(k, v);
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  ui.h = h;

  // ------------------------------------------------------------ icons
  const icons = (ui.icons = {});
  function iconCanvas(w, hgt, draw) {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = w * d;
    c.height = hgt * d;
    c.style.width = w + 'px';
    c.style.height = hgt + 'px';
    c.className = 'icon';
    const g = c.getContext('2d');
    g.scale(d, d);
    try {
      draw(g, w, hgt);
    } catch (e) {
      console.warn(e);
    }
    return c;
  }
  ui.iconCanvas = iconCanvas;
  icons.weapon = (def, w, hh) =>
    iconCanvas(w || 64, hh || 32, (g, W, H) => {
      const s = H / 14;
      g.translate(W / 2 - ((def.length || 16) * s) / 2 - 4 * s, H / 2);
      g.scale(s, s);
      if (def.drawHeld) def.drawHeld(g, { recoil: 0, aim: 0 }, 0);
      else {
        g.fillStyle = '#bbb';
        g.fillRect(4, -2, def.length || 14, 4);
      }
    });
  icons.armor = (def, size) =>
    iconCanvas(size || 40, size || 40, (g, W) => {
      g.translate(W / 2, W / 2);
      const s = W / 40;
      g.scale(s, s);
      if (def.drawIcon) return def.drawIcon(g);
      const c = def.color || '#777', tr = def.trim || U.shade(c, 0.35);
      g.fillStyle = c;
      g.strokeStyle = tr;
      g.lineWidth = 1.5;
      g.beginPath();
      if (def.slot === 'head') {
        g.arc(0, 3, 12, Math.PI, 0);
        g.lineTo(14, 6);
        g.lineTo(-14, 6);
        g.closePath();
      } else if (def.slot === 'body') {
        g.moveTo(-12, -12); g.lineTo(-5, -14); g.lineTo(0, -9); g.lineTo(5, -14); g.lineTo(12, -12);
        g.lineTo(13, 13); g.lineTo(-13, 13); g.closePath();
      } else if (def.slot === 'feet') {
        g.moveTo(-12, -12); g.lineTo(-4, -12); g.lineTo(-4, 6); g.lineTo(4, 8); g.lineTo(4, 13); g.lineTo(-12, 13); g.closePath();
        g.moveTo(5, -12); g.lineTo(12, -12); g.lineTo(12, 6); g.lineTo(16, 8); g.lineTo(16, 13); g.lineTo(5, 13); g.closePath();
      } else {
        g.arc(0, 3, 9, 0, U.TAU);
      }
      g.fill();
      g.stroke();
      if (def.lamp) {
        g.fillStyle = '#fff0b0';
        g.beginPath();
        g.arc(0, -2, 3, 0, U.TAU);
        g.fill();
      }
    });
  icons.item = (def, props, size) =>
    iconCanvas(size || 40, size || 40, (g, W) => {
      g.translate(W / 2, W / 2);
      const s = (W / 40) * (def.iconScale || 1.3);
      g.scale(s, s);
      if (def.drawIcon) return def.drawIcon(g, props || {});
      const fake = { t: 0, props: Object.assign({}, def.props || {}, props || {}), r: def.radius || 9, def, used: false, face: { x: 0, y: 1 }, x: 0, y: 0 };
      if (def.draw) def.draw(g, fake, 0, LM.game);
    });
  icons.gold = (size) => icons.item(LM.get('items', 'gold'), { amount: 30 }, size);
  icons.key = (color, size) => icons.item(LM.get('items', 'key'), { color }, size);
  icons.ammo = (type, size) => icons.item(LM.get('items', 'ammo-' + type), {}, size);
  /** Icon for a loot entry { type, ... } */
  ui.lootIcon = function (e, size) {
    switch (e.type) {
      case 'gold': return icons.gold(size);
      case 'key': return icons.key(e.color, size);
      case 'ammo': return icons.ammo(e.ammo, size);
      case 'weapon': return icons.weapon(LM.get('weapons', e.id), size ? size * 1.6 : 64, size || 32);
      case 'armor': return icons.armor(LM.get('armor', e.id), size);
      case 'item': return icons.item(LM.get('items', e.id), e.props, size);
    }
    return iconCanvas(size || 40, size || 40, () => {});
  };
  ui.lootName = function (e) {
    switch (e.type) {
      case 'gold': return e.amount + ' gold';
      case 'key': return LM.KEY_NAMES[e.color];
      case 'ammo': return e.amount + ' ' + LM.AMMO_NAMES[e.ammo].toLowerCase();
      case 'weapon': return LM.get('weapons', e.id).name;
      case 'armor': return LM.get('armor', e.id).name;
      case 'item': return LM.get('items', e.id).name;
    }
    return '?';
  };

  // ------------------------------------------------------------ stat text
  const MOD_LABELS = {
    maxHp: (v) => sign(v) + ' max health',
    speed: (v) => sign(v) + ' speed',
    armor: (v) => sign(Math.round(v * 100)) + '% damage reduction',
    maxShield: (v) => sign(v) + ' shield',
    shieldRegen: (v) => sign(v) + ' shield per second',
    lightRadius: (v) => sign(v) + ' light reach',
    dashCooldown: (v) => sign(v) + 's dash cooldown',
    swimMul: (v) => sign(Math.round(v * 100)) + '% swim speed',
    damageMul: (v) => sign(Math.round(v * 100)) + '% damage',
    goldFind: (v) => sign(Math.round(v * 100)) + '% gold found',
    ammoMul: (v) => sign(Math.round(v * 100)) + '% ammo capacity',
  };
  const GOOD_WHEN_NEGATIVE = new Set(['dashCooldown']);
  function sign(v) {
    v = Math.round(v * 100) / 100;
    return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  }
  ui.modList = function (mods) {
    const out = h('ul', { class: 'mods' });
    for (const [k, v] of Object.entries(mods || {})) {
      if (!v || !MOD_LABELS[k]) continue;
      const good = GOOD_WHEN_NEGATIVE.has(k) ? v < 0 : v > 0;
      out.appendChild(h('li', { class: good ? 'good' : 'bad' }, MOD_LABELS[k](v)));
    }
    return out;
  };
  ui.weaponStats = function (w) {
    const dps = w.damage * (w.pellets || 1) * w.fireRate;
    const rows = [
      ['Damage', (w.pellets > 1 ? w.pellets + ' × ' : '') + w.damage + (w.aoe ? ' + ' + w.aoe.damage + ' blast' : '')],
      ['Rate', w.fireRate + ' / s'],
      ['Output', Math.round(dps + (w.aoe ? w.aoe.damage * w.fireRate : 0)) + ' / s'],
      ['Ammo', w.ammo ? LM.AMMO_NAMES[w.ammo] + (w.ammoPerShot > 1 ? ' ×' + w.ammoPerShot : '') : 'Unlimited'],
    ];
    if (w.pierce) rows.push(['Pierces', w.pierce + ' foes']);
    return h('dl', { class: 'stats' }, rows.map(([a, b]) => [h('dt', null, a), h('dd', null, b)]));
  };

  // ------------------------------------------------------------ init
  ui.init = function (game) {
    ui.game = game;
    ui.el = {
      hud: $('hud'), hpFill: $('hp-fill'), hpGhost: $('hp-ghost'), hpNum: $('hp-num'), shRow: $('sh-row'), shFill: $('sh-fill'), shNum: $('sh-num'),
      dash: $('dash-fill'), wIcon: $('w-icon'), wName: $('w-name'), wAmmo: $('w-ammo'), wSlots: $('w-slots'), gold: $('gold-num'), keys: $('keys'),
      lvlFloor: $('lvl-floor'), lvlName: $('lvl-name'), minimap: $('minimap'), prompt: $('prompt'), toasts: $('toasts'), roomTitle: $('room-title'),
      modal: $('modal'), title: $('title-screen'), err: $('err'), armor: $('armor-strip'),
      vitals: document.querySelector('.hud-tl'), gadgets: $('gadgets'),
    };
    ui.cache = {};
    ui.mm = ui.el.minimap.getContext('2d');
    const d = Math.min(window.devicePixelRatio || 1, 2);
    ui.el.minimap.width = 176 * d;
    ui.el.minimap.height = 124 * d;
    ui.mmScale = d;
    window.addEventListener('keydown', (e) => {
      if (!ui.modalOpen) return;
      const handled = ui.onModalKey(e);
      if (handled) {
        e.preventDefault();
        LM.input.pressed.delete(e.code);
      }
    });
  };

  // ------------------------------------------------------------ HUD
  function set(key, el, val, prop) {
    if (ui.cache[key] === val) return;
    ui.cache[key] = val;
    if (prop === 'width') el.style.width = val;
    else if (prop === 'html') el.innerHTML = val;
    else el.textContent = val;
  }
  ui.frame = function (game, dt) {
    const P = game.player;
    const hud = ui.el.hud;
    const showHud = !game.attract && P && game.state !== 'title';
    if (hud.hidden === showHud) hud.hidden = !showHud;
    if (!showHud) return;
    const st = P.stats();
    const hpPct = U.clamp(P.hp / st.maxHp, 0, 1);
    set('hp', ui.el.hpFill, (hpPct * 100).toFixed(1) + '%', 'width');
    ui.ghost = ui.ghost == null ? hpPct : ui.ghost > hpPct ? Math.max(hpPct, ui.ghost - dt * 0.5) : hpPct;
    set('hpg', ui.el.hpGhost, (ui.ghost * 100).toFixed(1) + '%', 'width');
    set('hpn', ui.el.hpNum, Math.ceil(P.hp) + ' / ' + st.maxHp);
    const hasShield = st.maxShield > 0;
    if (ui.el.shRow.hidden === hasShield) ui.el.shRow.hidden = !hasShield;
    if (hasShield) {
      set('sh', ui.el.shFill, ((P.shield / st.maxShield) * 100).toFixed(1) + '%', 'width');
      set('shn', ui.el.shNum, Math.round(P.shield) + ' / ' + st.maxShield);
    }
    const dashK = P.dashCd > 0 ? 1 - P.dashCd / st.dashCooldown : 1;
    set('dash', ui.el.dash, (U.clamp(dashK, 0, 1) * 100).toFixed(0) + '%', 'width');
    hud.classList.toggle('low', hpPct < 0.3);

    // floors marked armed: false hide the combat readouts
    const peaceful = game.level.def.armed === false;
    if (ui.el.vitals.hidden !== peaceful) ui.el.vitals.hidden = peaceful;
    // no coins to count on a peaceful floor unless you've somehow come by some
    const purse = ui.el.purse || (ui.el.purse = document.querySelector('.purse'));
    const hidePurse = peaceful && !P.gold && !P.keys.size;
    if (purse && purse.hidden !== hidePurse) purse.hidden = hidePurse;
    const armed = P.isArmed(game);
    const w = armed ? P.currentWeapon() : null;
    const gd = armed ? null : P.heldGadget();
    const wid = w ? w.id : gd ? 'gadget:' + gd.id : 'none';
    if (ui.cache.wid !== wid) {
      ui.cache.wid = wid;
      if (w) ui.el.wIcon.replaceChildren(ui.icons.weapon(w, 84, 40));
      else if (gd) ui.el.wIcon.replaceChildren(ui.icons.gadget(gd, 84, 40));
      else ui.el.wIcon.replaceChildren();
      ui.el.wName.textContent = w ? w.name : gd ? gd.name : 'Empty-handed';
    }
    if (w) {
      const ammo = w.ammo ? String(P.ammo[w.ammo] || 0) : '∞';
      set('ammo', ui.el.wAmmo, w.ammo ? ammo + ' ' + LM.AMMO_NAMES[w.ammo].toLowerCase() : 'unlimited');
    } else set('ammo', ui.el.wAmmo, gd ? (typeof gd.hint === 'function' ? gd.hint(game, P) : gd.hint || '') : 'no weapon');
    const gKey = P.gadgets.map((id) => {
      const g = LM.get('gadgets', id);
      return id + ':' + (g.badge ? g.badge(game, P) : 0);
    }).join(',');
    if (ui.cache.gadgets !== gKey) {
      ui.cache.gadgets = gKey;
      ui.el.gadgets.replaceChildren(...P.gadgets.map((id) => {
        const g = LM.get('gadgets', id);
        const n = g.badge ? g.badge(game, P) : 0;
        const chip = h('button', { class: 'gadget-chip', type: 'button', title: g.name },
          h('b', null, (g.key || '').replace('Key', '')), h('span', null, g.short || g.name), n ? h('i', { class: 'badge' }, String(n)) : null);
        chip.addEventListener('click', () => { if (game.state === 'play' && g.use) g.use(game, P); });
        return chip;
      }));
    }
    const slotsKey = armed + '|' + P.weapons.join(',') + '|' + P.weaponIdx + '|' + P.weapons.map((id) => {
      const d = LM.get('weapons', id);
      return d.ammo ? (P.ammo[d.ammo] > 0 ? 1 : 0) : 1;
    }).join('');
    if (ui.cache.slots !== slotsKey) {
      ui.cache.slots = slotsKey;
      ui.el.wSlots.replaceChildren(
        ...(armed ? P.weapons : []).map((id, i) => {
          const d = LM.get('weapons', id);
          const empty = d.ammo && !(P.ammo[d.ammo] > 0);
          return h('span', { class: 'slot' + (i === P.weaponIdx ? ' on' : '') + (empty ? ' empty' : ''), title: d.name }, h('b', null, String(i + 1)), d.short || d.name);
        })
      );
    }
    set('gold', ui.el.gold, String(P.gold));
    const keysKey = [...P.keys].sort().join(',');
    if (ui.cache.keys !== keysKey) {
      ui.cache.keys = keysKey;
      ui.el.keys.replaceChildren(...[...P.keys].map((k) => h('span', { class: 'keychip', style: '--k:' + LM.KEY_COLORS[k], title: LM.KEY_NAMES[k] })));
    }
    const armorKey = Object.values(P.equip).join(',');
    if (ui.cache.armor !== armorKey) {
      ui.cache.armor = armorKey;
      ui.el.armor.replaceChildren(
        ...Object.entries(P.equip).filter(([, id]) => id).map(([, id]) => {
          const a = LM.get('armor', id);
          const c = ui.icons.armor(a, 22);
          c.title = a.name;
          return c;
        })
      );
    }
    ui.mmT = (ui.mmT || 0) - dt;
    if (ui.mmT <= 0) {
      ui.mmT = 0.1;
      ui.drawMinimap(game);
    }
    // toasts expire
    const now = performance.now();
    for (const t of [...ui.el.toasts.children]) {
      if (now > +t.dataset.until) {
        t.classList.add('out');
        if (now > +t.dataset.until + 400) t.remove();
      }
    }
  };

  ui.drawMinimap = function (game) {
    const g = ui.mm, L = game.level, P = game.player, d = ui.mmScale;
    const W = 176, H = 124, s = 3.2;
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(9,11,15,0.82)';
    g.fillRect(0, 0, W, H);
    const cx = P.x / T, cy = P.y / T;
    const x0 = Math.floor(cx - W / s / 2), x1 = Math.ceil(cx + W / s / 2);
    const y0 = Math.floor(cy - H / s / 2), y1 = Math.ceil(cy + H / s / 2);
    const ox = W / 2 - cx * s, oy = H / 2 - cy * s;
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
        const i = y * L.w + x;
        if (!L.explored[i]) continue;
        const td = L.terrain[i];
        const col = td.mapColor || (td.solid ? '#6b6556' : 'rgba(205,190,160,0.16)');
        if (col === 'none') continue;
        g.fillStyle = col;
        g.fillRect(ox + x * s, oy + y * s, s + 0.4, s + 0.4);
      }
    }
    for (const dr of game.doors) {
      if (!L.explored[dr.ty * L.w + dr.tx]) continue;
      g.fillStyle = dr.lock && !dr.unlocked ? LM.KEY_COLORS[dr.lock] : dr.sealed ? '#ff3a2a' : '#b08a52';
      g.fillRect(ox + dr.tx * s, oy + dr.ty * s, s, s);
    }
    for (const it of game.items) {
      if (it.dead || !it.def.mapColor) continue;
      const tx = Math.floor(it.x / T), ty = Math.floor(it.y / T);
      if (!L.inBounds(tx, ty) || !L.explored[ty * L.w + tx]) continue;
      if (it.used && !it.def.mapAlways) continue;
      g.fillStyle = it.def.mapColor;
      g.beginPath();
      g.arc(ox + it.x / T * s, oy + it.y / T * s, 1.6, 0, U.TAU);
      g.fill();
    }
    g.fillStyle = '#9ad0ff';
    for (const n of game.npcs) {
      if (!n.visible || n.def.spectral) continue;
      g.fillRect(ox + (n.x / T) * s - 1, oy + (n.y / T) * s - 1, 2, 2);
    }
    g.fillStyle = '#ff5a4a';
    for (const e of game.enemies) {
      if (e.dead || !e.visible) continue;
      g.fillRect(ox + (e.x / T) * s - 1, oy + (e.y / T) * s - 1, 2, 2);
    }
    // player arrow
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(P.aim);
    g.fillStyle = '#f2c96b';
    g.beginPath();
    g.moveTo(5, 0);
    g.lineTo(-3, 3.2);
    g.lineTo(-1.5, 0);
    g.lineTo(-3, -3.2);
    g.closePath();
    g.fill();
    g.restore();
  };

  ui.prompt = function (text) {
    const el = ui.el.prompt;
    if (!text) {
      if (!el.hidden) el.hidden = true;
      ui.cache.prompt = null;
      return;
    }
    if (ui.cache.prompt !== text) {
      ui.cache.prompt = text;
      el.replaceChildren(h('kbd', null, 'E'), h('span', null, text));
    }
    if (el.hidden) el.hidden = false;
  };

  ui.toast = function (text, kind) {
    const box = ui.el.toasts;
    // don't stack identical messages
    for (const t of box.children) if (t.textContent === text && !t.classList.contains('out')) {
      t.dataset.until = performance.now() + 2200;
      return;
    }
    const el = h('div', { class: 'toast ' + (kind || '') }, text);
    el.dataset.until = performance.now() + 2400;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
  };

  ui.roomTitle = function (name, note) {
    const el = ui.el.roomTitle;
    el.replaceChildren(h('span', { class: 'rt-kicker' }, note || 'Chamber'), h('span', { class: 'rt-name' }, name));
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  };
  ui.levelIntro = function (game, L) {
    set('floor', ui.el.lvlFloor, game.floorLabel());
    set('lname', ui.el.lvlName, L.name);
    ui.ghost = null;
    ui.cache.wid = null;
    ui.cache.slots = null;
    ui.cache.keys = null;
    ui.cache.armor = null;
    ui.el.toasts.replaceChildren();
    ui.cache.gadgets = null;
    ui.roomTitle(L.name, game.floorLabel());
  };

  ui.error = function (err) {
    const el = ui.el && ui.el.err;
    if (!el) return;
    ui.errCount = (ui.errCount || 0) + 1;
    if (ui.errCount > 3) return;
    el.hidden = false;
    el.textContent = 'Something broke: ' + (err && err.message ? err.message : err) + '. The game will keep running; check the console for details.';
    setTimeout(() => (el.hidden = true), 6000);
  };

  // ------------------------------------------------------------ modal system
  /**
   * spec: { kicker, title, body: Node|string, actions: [{ label, primary, onClick, disabled, key, close }],
   *         onClose, wide, className, dismissable }
   * An action closes the pop-up unless its onClick returns false.
   */
  ui.open = function (spec) {
    const game = ui.game;
    if (!ui.modalOpen) ui.prevState = game.state === 'popup' ? 'play' : game.state;
    ui.modalOpen = true;
    ui.spec = spec;
    if (game.state === 'play') game.state = 'popup';
    const m = ui.el.modal;
    const actions = (spec.actions || []).map((a) => {
      const btn = h('button', { class: 'btn' + (a.primary ? ' primary' : '') + (a.quiet ? ' quiet' : ''), disabled: a.disabled, type: 'button' },
        a.key ? h('kbd', null, a.key) : null, h('span', null, a.label));
      btn.addEventListener('click', () => {
        LM.audio.play('ui');
        const r = a.onClick ? a.onClick() : undefined;
        if (r !== false && a.close !== false) ui.close();
      });
      a.el = btn;
      return btn;
    });
    const body = typeof spec.body === 'string' ? h('p', null, spec.body) : spec.body;
    const panel = h('div', { class: 'panel' + (spec.wide ? ' wide' : '') + (spec.className ? ' ' + spec.className : ''), role: 'dialog', 'aria-modal': 'true' },
      h('header', null, spec.kicker ? h('div', { class: 'kicker' }, spec.kicker) : null, h('h2', null, spec.title || '')),
      h('div', { class: 'panel-body' }, body),
      actions.length ? h('footer', null, actions) : null
    );
    m.replaceChildren(panel);
    m.hidden = false;
    ui.prompt(null);
    const first = actions.find((b) => !b.disabled);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 0);
    return panel;
  };
  ui.refreshActions = function () {
    for (const a of (ui.spec && ui.spec.actions) || []) if (a.el && a.isDisabled) a.el.disabled = a.isDisabled();
  };
  ui.close = function () {
    if (!ui.modalOpen) return;
    const spec = ui.spec;
    ui.modalOpen = false;
    ui.spec = null;
    ui.el.modal.hidden = true;
    ui.el.modal.replaceChildren();
    const game = ui.game;
    if (game.state === 'popup') game.state = ui.prevState === 'pause' ? 'play' : ui.prevState || 'play';
    if (spec && spec.onClose) spec.onClose();
  };
  ui.closeAll = function () {
    ui.modalOpen = false;
    ui.spec = null;
    ui.el.modal.hidden = true;
    ui.el.modal.replaceChildren();
    ui.el.title.hidden = true;
  };
  ui.onModalKey = function (e) {
    const spec = ui.spec;
    if (!spec) return false;
    if (e.code === 'Escape' || (spec.closeOnTab && (e.code === 'Tab' || e.code === 'KeyI'))) {
      if (spec.dismissable === false) return true;
      ui.close();
      return true;
    }
    if (spec.numbered) {
      const m = /^Digit([1-9])$/.exec(e.code);
      const b = m ? spec.numbered[+m[1] - 1] : e.code === 'KeyE' || e.code === 'Enter' ? spec.numbered[0] : null;
      if (b) {
        b.click();
        return true;
      }
    }
    for (const a of spec.actions || []) {
      if (a.key && e.code === 'Key' + a.key && a.el && !a.el.disabled) {
        a.el.click();
        return true;
      }
    }
    if (e.code === 'Enter' || e.code === 'Space') {
      const p = (spec.actions || []).find((a) => a.primary && a.el && !a.el.disabled);
      if (p && document.activeElement !== p.el) {
        p.el.click();
        return true;
      }
      return false;
    }
    return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Tab', 'KeyI'].includes(e.code);
  };

  // ------------------------------------------------------------ standard screens
  ui.showTitle = function (save) {
    const el = ui.el.title;
    const cont = $('btn-continue');
    if (save) {
      cont.hidden = false;
      const L = LM.get('levels', save.levelId);
      cont.querySelector('span').textContent = 'Continue: ' + ui.game.floorLabel(save.levelId) + ', ' + L.name;
    } else cont.hidden = true;
    $('pack-list').textContent = LM.packs.map((p) => p.name + ' ' + p.version).join(' · ');
    el.hidden = false;
  };
  ui.hideTitle = function () {
    ui.el.title.hidden = true;
  };

  ui.showPause = function (game) {
    LM.input.mouse.down = false;
    ui.open({
      kicker: game.floorLabel() + ' · ' + game.level.name,
      title: 'Paused',
      body: h('div', { class: 'pause-grid' },
        h('dl', { class: 'stats' },
          h('dt', null, 'Time on floor'), h('dd', null, U.fmtTime(game.stats.time)),
          h('dt', null, 'Foes slain'), h('dd', null, game.stats.kills + ''),
          h('dt', null, 'Gold carried'), h('dd', null, game.player.gold + '')
        ),
        h('p', { class: 'hint' }, 'WASD move · mouse aim · click fire · Shift dash · E interact · 1–9 or wheel to switch weapons · Q last weapon · Tab inventory · M sound')
      ),
      actions: [
        { label: 'Resume', primary: true },
        { label: 'Inventory', onClick: () => { setTimeout(() => ui.showInventory(game), 0); } },
        { label: LM.audio.muted ? 'Sound on' : 'Sound off', onClick: () => LM.audio.setMuted(!LM.audio.muted) },
        { label: 'Restart floor', quiet: true, onClick: () => { setTimeout(() => game.restartLevel(), 0); } },
        { label: 'Quit to title', quiet: true, onClick: () => { setTimeout(() => game.toTitle(), 0); } },
      ],
    });
  };

  ui.showInventory = function (game) {
    LM.input.mouse.down = false;
    const P = game.player;
    const render = () => {
      const st = P.stats();
      const slots = ['head', 'body', 'feet', 'trinket'];
      const slotNames = { head: 'Head', body: 'Body', feet: 'Feet', trinket: 'Trinket' };
      const equipCol = h('section', { class: 'inv-col' }, h('h3', null, 'Worn'),
        slots.map((s) => {
          const id = P.equip[s];
          if (!id) return h('div', { class: 'inv-row empty' }, h('span', { class: 'slot-name' }, slotNames[s]), h('span', { class: 'muted' }, 'Nothing'));
          const a = LM.get('armor', id);
          return h('div', { class: 'inv-row' }, ui.icons.armor(a, 34),
            h('div', { class: 'inv-info' }, h('span', { class: 'slot-name' }, slotNames[s]), h('strong', null, a.name), ui.modList(a.mods)),
            h('button', { class: 'btn small quiet', type: 'button', on: { click: () => { P.unequip(s); LM.audio.play('switch'); rerender(); } } }, 'Take off'));
        })
      );
      const bagCol = h('section', { class: 'inv-col' }, h('h3', null, 'Pack'),
        P.bag.length ? P.bag.map((id, i) => {
          const a = LM.get('armor', id);
          return h('div', { class: 'inv-row' }, ui.icons.armor(a, 34),
            h('div', { class: 'inv-info' }, h('span', { class: 'slot-name' }, slotNames[a.slot]), h('strong', null, a.name), ui.modList(a.mods)),
            h('button', { class: 'btn small', type: 'button', on: { click: () => { P.equipArmor(id); LM.audio.play('switch'); rerender(); } } }, 'Wear'));
        }) : h('p', { class: 'muted' }, 'Spare armor and clothing you pick up goes here.')
      );
      const wepCol = h('section', { class: 'inv-col' }, h('h3', null, 'Weapons'),
        P.weapons.length ? null : h('p', { class: 'muted' }, 'You are carrying nothing to fight with.'),
        P.weapons.map((id, i) => {
          const w = LM.get('weapons', id);
          return h('button', { class: 'inv-weapon' + (i === P.weaponIdx ? ' on' : ''), type: 'button', on: { click: () => { P.switchTo(i, game); rerender(); } } },
            h('b', { class: 'num' }, String(i + 1)), ui.icons.weapon(w, 56, 28),
            h('span', { class: 'inv-info' }, h('strong', null, w.name), h('span', { class: 'muted' }, w.ammo ? (P.ammo[w.ammo] || 0) + ' ' + LM.AMMO_NAMES[w.ammo].toLowerCase() : 'unlimited')));
        }),
        h('h3', null, 'Blessings'),
        P.blessings.length ? h('ul', { class: 'bless' }, P.blessings.map((b) => { const d = LM.get('blessings', b); return h('li', null, h('strong', null, d.name), ' ', h('span', { class: 'muted' }, d.desc)); })) : h('p', { class: 'muted' }, 'None yet. Altars grant them.')
      );
      const statCol = h('section', { class: 'inv-col' }, h('h3', null, 'Condition'),
        h('dl', { class: 'stats' },
          h('dt', null, 'Health'), h('dd', null, Math.ceil(P.hp) + ' / ' + st.maxHp),
          st.maxShield ? [h('dt', null, 'Shield'), h('dd', null, Math.round(P.shield) + ' / ' + st.maxShield)] : null,
          h('dt', null, 'Damage reduction'), h('dd', null, Math.round(st.armor * 100) + '%'),
          h('dt', null, 'Speed'), h('dd', null, Math.round(st.speed) + ''),
          h('dt', null, 'Damage'), h('dd', null, Math.round(st.damageMul * 100) + '%'),
          h('dt', null, 'Light reach'), h('dd', null, Math.round(st.lightRadius) + ''),
          h('dt', null, 'Dash cooldown'), h('dd', null, st.dashCooldown.toFixed(2) + 's'),
          h('dt', null, 'Gold'), h('dd', null, P.gold + '')
        ),
        h('h3', null, 'Ammunition'),
        h('dl', { class: 'stats' }, Object.keys(LM.AMMO_MAX).map((k) => [h('dt', null, LM.AMMO_NAMES[k]), h('dd', null, (P.ammo[k] || 0) + ' / ' + P.ammoMax(k))])),
        P.keys.size ? [h('h3', null, 'Keys'), h('div', { class: 'keyrow' }, [...P.keys].map((k) => h('span', { class: 'keychip big', style: '--k:' + LM.KEY_COLORS[k] }, LM.KEY_NAMES[k])))] : null
      );
      return h('div', { class: 'inv-grid' }, equipCol, bagCol, wepCol, statCol);
    };
    let panel;
    const rerender = () => {
      const body = panel.querySelector('.panel-body');
      body.replaceChildren(render());
    };
    panel = ui.open({ kicker: game.floorLabel(), title: 'Inventory', body: render(), wide: true, closeOnTab: true, actions: [{ label: 'Close', primary: true, key: null }] });
  };

  function statsTable(game) {
    const s = game.stats;
    return h('dl', { class: 'stats big' },
      h('dt', null, 'Time'), h('dd', null, U.fmtTime(s.time)),
      h('dt', null, 'Foes slain'), h('dd', null, s.kills + (s.enemies ? ' of ' + s.enemies + ' placed' : '')),
      h('dt', null, 'Gold found'), h('dd', null, s.gold + ''),
      h('dt', null, 'Chests opened'), h('dd', null, s.chests + ' of ' + s.chestsTotal),
      h('dt', null, 'Damage taken'), h('dd', null, Math.round(s.damageTaken) + '')
    );
  }
  ui.showLevelComplete = function (game, nextId, onContinue) {
    const next = LM.get('levels', nextId);
    ui.open({
      kicker: game.level.def.armed === false ? game.floorLabel() + ' · left behind' : game.floorLabel() + ' cleared',
      title: game.level.name,
      body: h('div', null, game.level.def.outro ? game.level.def.outro.split('\n\n').map((t) => h('p', { class: 'lore' }, t)) : statsTable(game), h('p', { class: 'lore' }, next.intro || 'The stairs keep going down.')),
      actions: [{ label: 'Descend to ' + game.floorLabel(nextId) + ': ' + next.name, primary: true, onClick: onContinue }],
      dismissable: false,
    });
    ui.prevState = 'complete';
  };
  ui.showVictory = function (game) {
    ui.open({
      kicker: 'The end of this iteration',
      title: 'You reached the bottom',
      body: h('div', null, statsTable(game), h('p', { class: 'lore' }, 'Below the Reliquary the stairs keep going, into dark nobody has drawn yet. New floors arrive with new content packs.')),
      actions: [
        { label: 'Play again', primary: true, onClick: () => setTimeout(() => game.newRun(), 0) },
        { label: 'Back to title', quiet: true, onClick: () => setTimeout(() => game.toTitle(), 0) },
      ],
      dismissable: false,
    });
    ui.prevState = 'victory';
  };
  ui.showDeath = function (game) {
    ui.open({
      kicker: game.floorLabel() + ' · ' + game.level.name,
      title: 'You fell in the maze',
      body: h('div', null, statsTable(game), h('p', { class: 'muted' }, 'Trying again restores you to how you entered this floor.')),
      actions: [
        { label: 'Try the floor again', primary: true, key: 'R', onClick: () => setTimeout(() => game.restartLevel(), 0) },
        { label: 'Back to title', quiet: true, onClick: () => setTimeout(() => game.toTitle(), 0) },
      ],
      dismissable: false,
    });
    ui.prevState = 'dead';
  };

  /** Simple lore / note pop-up. */
  ui.showText = function (title, text, kicker) {
    ui.open({
      kicker: kicker || 'Inscription',
      title,
      body: h('div', { class: 'lore-block' }, ...String(text).split('\n\n').map((p) => h('p', { class: 'lore' }, p))),
      actions: [{ label: 'Close', primary: true }],
    });
  };

  // ------------------------------------------------------------ pack styles, gadget icons
  /** Packs can ship their own CSS (for their pop-ups) without editing index.html. */
  ui.addStyles = function (css) {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return el;
  };
  icons.gadget = (gd, w, hh) =>
    iconCanvas(w || 40, hh || 40, (g, W, H) => {
      if (gd.drawIcon) gd.drawIcon(g, W, H);
    });

  // ------------------------------------------------------------ portraits
  /** A front-facing bust drawn from an NPC look. mood: neutral | smile | tired | annoyed | wide | blank | glitch */
  ui.portrait = function (look, mood, size) {
    const L = look || {};
    return iconCanvas(size || 88, size || 88, (g, W) => {
      g.scale(W / 100, W / 100);
      const skin = L.skin || '#c8946e', hair = L.hair || '#2a1e16', shirt = L.shirt || '#5a6a80';
      const hs = L.hairStyle || 'short';
      const bg = L.bg || U.shade(shirt, -0.55);
      const grd = g.createLinearGradient(0, 0, 0, 100);
      grd.addColorStop(0, U.shade(bg, 0.18));
      grd.addColorStop(1, bg);
      g.fillStyle = grd;
      g.fillRect(0, 0, 100, 100);
      g.fillStyle = hair;
      if (hs === 'long') {
        LM.gfx.roundRect(g, 29, 26, 42, 58, 16);
        g.fill();
      }
      if (hs === 'curly') {
        for (let i = 0; i < 12; i++) {
          const a = Math.PI + (i / 11) * Math.PI;
          g.beginPath();
          g.arc(50 + Math.cos(a) * 21, 44 + Math.sin(a) * 23, 9, 0, U.TAU);
          g.fill();
        }
        g.beginPath();
        g.arc(29, 52, 8, 0, U.TAU);
        g.arc(71, 52, 8, 0, U.TAU);
        g.fill();
      }
      // shoulders
      g.fillStyle = shirt;
      g.beginPath();
      g.ellipse(50, 106, 45, 30, 0, 0, U.TAU);
      g.fill();
      if (L.blazer) {
        g.fillStyle = L.blazer;
        g.beginPath();
        g.moveTo(8, 100); g.lineTo(40, 76); g.lineTo(46, 100); g.closePath();
        g.moveTo(92, 100); g.lineTo(60, 76); g.lineTo(54, 100); g.closePath();
        g.fill();
      }
      g.fillStyle = U.shade(skin, -0.12);
      g.fillRect(43, 60, 14, 17);
      if (L.tie) {
        g.fillStyle = '#ece8e0';
        g.beginPath(); g.moveTo(40, 76); g.lineTo(50, 86); g.lineTo(60, 76); g.lineTo(57, 74); g.lineTo(50, 80); g.lineTo(43, 74); g.closePath(); g.fill();
        g.fillStyle = L.tie;
        g.beginPath(); g.moveTo(47, 80); g.lineTo(53, 80); g.lineTo(55, 100); g.lineTo(45, 100); g.closePath(); g.fill();
      } else {
        g.fillStyle = U.shade(shirt, -0.25);
        g.beginPath(); g.moveTo(41, 75); g.lineTo(50, 84); g.lineTo(59, 75); g.closePath(); g.fill();
      }
      if (L.lanyard) {
        g.strokeStyle = L.lanyard;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(42, 74); g.lineTo(48, 92); g.moveTo(58, 74); g.lineTo(52, 92); g.stroke();
        g.fillStyle = '#f4f1ea';
        g.fillRect(45, 91, 10, 9);
      }
      // head
      g.fillStyle = U.shade(skin, -0.08);
      g.beginPath(); g.ellipse(32.5, 47, 3.5, 6, 0, 0, U.TAU); g.ellipse(67.5, 47, 3.5, 6, 0, 0, U.TAU); g.fill();
      g.fillStyle = skin;
      g.beginPath(); g.ellipse(50, 46, 17, 21, 0, 0, U.TAU); g.fill();
      if (L.beard) {
        g.fillStyle = L.beard === true ? hair : L.beard;
        g.beginPath(); g.ellipse(50, 58, 15, 11, 0, 0, Math.PI); g.fill();
      }
      // hair
      g.fillStyle = hair;
      if (hs !== 'bald') {
        g.save();
        if (hs === 'buzz') g.globalAlpha = 0.6;
        g.beginPath();
        g.ellipse(50, 36, 18.5, 14, 0, Math.PI, U.TAU);
        g.quadraticCurveTo(64, 32, 50, 31);
        g.quadraticCurveTo(38, 31, 31.5, 38);
        g.fill();
        if (hs === 'long') { g.fillRect(31, 34, 5, 26); g.fillRect(64, 34, 5, 26); }
        g.restore();
      }
      if (hs === 'bun') { g.beginPath(); g.arc(50, 20, 8, 0, U.TAU); g.fill(); }
      if (hs === 'ponytail') { g.beginPath(); g.ellipse(70, 34, 5, 9, 0.5, 0, U.TAU); g.fill(); }
      if (hs === 'curly') { for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(36 + i * 5.6, 27 + (i % 2) * 2, 6, 0, U.TAU); g.fill(); } }
      if (hs === 'bald') { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(44, 31, 6, 3, -0.3, 0, U.TAU); g.fill(); }
      // face
      const m = mood || 'neutral';
      const ink = '#1d1712';
      g.strokeStyle = ink;
      g.fillStyle = ink;
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      const brow = (dy1, dy2) => {
        g.strokeStyle = U.shade(hair, -0.1);
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(39, 39 + dy1); g.lineTo(46, 39 + dy2); g.moveTo(54, 39 + dy2); g.lineTo(61, 39 + dy1); g.stroke();
        g.strokeStyle = ink;
        g.lineWidth = 1.6;
      };
      if (m === 'blank' || m === 'glitch') {
        g.fillStyle = m === 'glitch' ? '#050505' : '#f4f1ea';
        g.beginPath(); g.ellipse(43, 46, 3.4, 2.4, 0, 0, U.TAU); g.ellipse(57, 46, 3.4, 2.4, 0, 0, U.TAU); g.fill();
        g.beginPath(); g.moveTo(44, 59); g.lineTo(56, 59); g.stroke();
      } else {
        if (m === 'annoyed') brow(-2, 1);
        else if (m === 'tired') brow(1, -1);
        else if (m === 'wide') brow(-3, -3);
        else brow(0, -1);
        if (m === 'smile') {
          g.beginPath(); g.arc(43, 47, 2.4, Math.PI * 1.1, Math.PI * 1.9); g.arc(57, 47, 2.4, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        } else {
          const er = m === 'wide' ? 2.6 : 1.9;
          if (m === 'wide') {
            g.fillStyle = '#f4f1ea';
            g.beginPath(); g.arc(43, 46, 3.6, 0, U.TAU); g.arc(57, 46, 3.6, 0, U.TAU); g.fill();
            g.fillStyle = ink;
          }
          g.beginPath(); g.arc(43, 46, er, 0, U.TAU); g.arc(57, 46, er, 0, U.TAU); g.fill();
          if (m === 'tired') {
            g.fillStyle = skin;
            g.fillRect(39, 42.4, 8, 3); g.fillRect(53, 42.4, 8, 3);
            g.strokeStyle = 'rgba(80,50,60,0.45)';
            g.beginPath(); g.arc(43, 49.5, 3, 0.2, Math.PI - 0.2); g.arc(57, 49.5, 3, 0.2, Math.PI - 0.2); g.stroke();
            g.strokeStyle = ink;
          }
        }
        g.beginPath();
        if (m === 'smile') g.arc(50, 55, 6, 0.25, Math.PI - 0.25);
        else if (m === 'annoyed') { g.moveTo(45, 60); g.lineTo(55, 59); }
        else if (m === 'tired') { g.moveTo(45, 60); g.quadraticCurveTo(50, 58.5, 55, 60); }
        else if (m === 'wide') { g.ellipse(50, 60, 3, 3.6, 0, 0, U.TAU); }
        else { g.moveTo(45, 59.5); g.quadraticCurveTo(50, 61, 55, 59.5); }
        g.stroke();
      }
      if (L.glasses) {
        g.strokeStyle = L.glasses === true ? '#1a1a1e' : L.glasses;
        g.lineWidth = 1.8;
        LM.gfx.roundRect(g, 36.5, 41.5, 13, 9.5, 3); g.stroke();
        LM.gfx.roundRect(g, 50.5, 41.5, 13, 9.5, 3); g.stroke();
        g.beginPath(); g.moveTo(49.5, 45); g.lineTo(50.5, 45); g.stroke();
      }
      if (L.headset) {
        g.strokeStyle = '#18181c';
        g.lineWidth = 3;
        g.beginPath(); g.arc(50, 44, 21, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.fillStyle = '#18181c';
        LM.gfx.roundRect(g, 27, 40, 7, 13, 3); g.fill();
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(31, 52); g.quadraticCurveTo(34, 62, 44, 62); g.stroke();
      }
      if (m === 'glitch') {
        for (let i = 0; i < 7; i++) {
          const y = 14 + i * 12 + ((i * 37) % 7);
          g.fillStyle = i % 2 ? 'rgba(255,40,60,0.22)' : 'rgba(40,220,255,0.18)';
          g.fillRect(i % 3 ? 4 : -4, y, 100, 3);
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(0, y + 4, 100, 1);
        }
      }
    });
  };

  // ------------------------------------------------------------ dialog
  /**
   * Conversation with an NPC. Tree format:
   *   { start: 'id' | (game, npc) => 'id', again?: same (used after the first chat),
   *     nodes: { id: { text: string | [paragraphs] | (game, npc) => ..., mood?, do?(game, npc), flag?,
   *                    options: [{ label, next?, end?, if?(game, npc), once?, flag?, do?(game, npc) }] } } }
   * Options without next (or with end) close the conversation. Number keys pick options; E picks the first.
   */
  ui.dialog = function (game, npc) {
    const tree = npc.dialog();
    if (!tree) return;
    const res = (v) => (typeof v === 'function' ? v(game, npc) : v);
    const first = !npc.mem.talked;
    npc.mem.talked = (npc.mem.talked || 0) + 1;
    if (game.player) npc.facing = Math.atan2(game.player.y - npc.y, game.player.x - npc.x);
    npc.bubble = null;
    const show = (id) => {
      const node = tree.nodes[id];
      if (!node) return ui.close();
      if (node.flag) game.setFlag(node.flag);
      if (node.do) node.do(game, npc);
      const text = [].concat(res(node.text) || []);
      let opts = (res(node.options) || []).filter((o) => (!o.if || o.if(game, npc)) && !(o.once && npc.said.has(o.id || o.label)));
      if (!opts.length) opts = [{ label: node.endLabel || 'Leave it there.', end: true }];
      const buttons = opts.map((o, i) => {
        const b = h('button', { class: 'choice dlg-choice', type: 'button' }, h('b', null, String(i + 1)), h('span', null, res(o.label)));
        b.addEventListener('click', () => choose(o));
        return b;
      });
      ui.open({
        kicker: npc.role,
        title: npc.name,
        className: 'dialog-panel',
        body: h('div', { class: 'dlg' },
          h('div', { class: 'dlg-portrait' }, npc.portrait ? npc.portrait(res(node.mood), 96) : ui.portrait(npc.look, res(node.mood) || npc.def.mood || 'neutral', 96)),
          h('div', { class: 'dlg-main' }, h('div', { class: 'dlg-text' }, text.map((p) => h('p', null, p))), h('div', { class: 'dlg-options' }, buttons))
        ),
        actions: [],
        numbered: buttons,
      });
    };
    const choose = (o) => {
      LM.audio.play('ui');
      npc.said.add(o.id || o.label);
      if (o.flag) game.setFlag(o.flag);
      if (o.do) o.do(game, npc);
      const next = res(o.next);
      if (o.end || !next) return ui.close();
      show(next);
    };
    show(res(!first && tree.again ? tree.again : tree.start) || 'start');
  };
})();
