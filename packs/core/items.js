/* The Linear Maze — packs/core/items.js
 * World objects: pickups, light sources, furniture, chests, stations,
 * altars, slot machines, weapon racks, armour stands, trap emitters.
 *
 * Item fields the engine reads:
 *   name, radius, solid (+ solidRadius), wallMounted, z, shadow, bob
 *   light: { color, radius, intensity, flicker } or light(item)
 *   magnet (pull radius), onTouch(item, game) -> false to leave it
 *   interact: { prompt | prompt(item,game), use(item,game), available(item,game) }
 *   destructible: { hp, onBreak(item, game) }
 *   init, update, draw(g,item,t,game), drawGlow, drawIcon, mapColor, isChest
 *   grant(game, entry, at)  how a chest hands this item over (default: drop it at the chest)
 * Interactive items open pop-ups through LM.ui.open.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);

  const flame = (g, x, y, s, t, seed, col) => {
    const f = 0.8 + 0.2 * Math.sin(t * 17 + seed) * Math.sin(t * 7 + seed * 2);
    G.glow(g, x, y, 14 * s * f, col || '#ff9a4a', 0.75);
    G.glow(g, x, y - 1.5 * s, 6 * s * f, '#ffe2a0', 0.9);
  };
  const AMMO_STYLE = {
    shells: { color: '#8a2a1e', band: '#d9a32a', amount: 8 },
    rounds: { color: '#5a5c62', band: '#d9a32a', amount: 40 },
    cells: { color: '#3a2f6a', band: '#a98bff', amount: 18 },
    rockets: { color: '#5a3a1a', band: '#ff9a4a', amount: 3 },
  };

  // ------------------------------------------------------------ shared pop-ups
  function compareCard(kicker, icon, name, extra, isNew) {
    return h('div', { class: 'card' + (isNew ? ' new' : '') }, h('div', { class: 'card-kicker' }, kicker), icon, h('strong', null, name), extra);
  }
  function weaponPopup(game, it, wid, onTaken) {
    const w = LM.get('weapons', wid), P = game.player;
    const have = P.hasWeapon(wid);
    const cur = P.currentWeapon();
    const cards = [compareCard(have ? 'You carry this' : 'Found', LM.ui.icons.weapon(w, 96, 44), w.name, [LM.ui.weaponStats(w), h('p', null, w.desc || '')], true)];
    if (!have && cur.id !== wid) cards.push(compareCard('In your hands', LM.ui.icons.weapon(cur, 96, 44), cur.name, LM.ui.weaponStats(cur)));
    const canTake = !have || !!w.ammo;
    LM.ui.open({
      kicker: it.def.name,
      title: w.name,
      body: h('div', { class: 'compare' }, cards),
      actions: [
        {
          label: have ? (w.ammo ? 'Take the ' + LM.AMMO_NAMES[w.ammo].toLowerCase() : 'Already carried') : 'Take it', primary: true, key: 'E', disabled: !canTake,
          onClick: () => {
            const r = P.giveWeapon(wid, game);
            LM.audio.play('pickup');
            game.toast(r === 'new' ? 'Took the ' + w.name + ' (' + (P.weapons.indexOf(wid) + 1) + ')' : 'Took ' + LM.AMMO_NAMES[w.ammo].toLowerCase(), 'good');
            onTaken();
          },
        },
        { label: 'Leave it', quiet: true },
      ],
    });
  }
  function armorPopup(game, it, aid, onTaken) {
    const a = LM.get('armor', aid), P = game.player;
    const curId = P.equip[a.slot];
    const cur = curId ? LM.get('armor', curId) : null;
    const slotName = { head: 'head', body: 'body', feet: 'feet', trinket: 'trinket' }[a.slot];
    const cards = [compareCard('Found · ' + slotName, LM.ui.icons.armor(a, 44), a.name, [LM.ui.modList(a.mods), h('p', null, a.desc || '')], true)];
    cards.push(cur ? compareCard('Worn now', LM.ui.icons.armor(cur, 44), cur.name, LM.ui.modList(cur.mods)) : compareCard('Worn now', null, 'Nothing', h('p', null, 'Your ' + slotName + ' slot is empty.')));
    LM.ui.open({
      kicker: it.def.name,
      title: a.name,
      body: h('div', { class: 'compare' }, cards),
      actions: [
        { label: 'Wear it', primary: true, key: 'E', onClick: () => { P.equipArmor(aid); LM.audio.play('pickup'); game.toast('Now wearing the ' + a.name + (cur ? '. The ' + cur.name + ' went in your pack.' : ''), 'good'); onTaken(); } },
        { label: 'Put it in your pack', key: 'P', onClick: () => { P.bag.push(aid); LM.audio.play('pickup'); game.toast(a.name + ' packed. Wear it from your inventory (Tab).'); onTaken(); } },
        { label: 'Leave it', quiet: true },
      ],
    });
  }

  function chestPopup(game, it) {
    const P = game.player;
    const grid = h('div', { class: 'loot-grid' });
    const remaining = () => it.loot.filter((l) => !l.taken);
    const takeOne = (entry, btn) => {
      if (entry.taken) return;
      entry.taken = true;
      const label = game.grant(entry, { x: it.x, y: it.y + 20 });
      if (btn) btn.classList.add('taken');
      if (label) game.toast('Took ' + label, 'good');
      if (!remaining().length) {
        it.emptied = true;
        setTimeout(() => LM.ui.close(), 140);
      }
    };
    for (const entry of it.loot) {
      const btn = h('button', { class: 'loot' + (entry.taken ? ' taken' : ''), type: 'button' }, LM.ui.lootIcon(entry, 34),
        h('span', null, LM.ui.lootName(entry), entry.type === 'weapon' ? h('small', null, 'Weapon') : entry.type === 'armor' ? h('small', null, 'Armor · ' + LM.get('armor', entry.id).slot) : null));
      btn.addEventListener('click', () => takeOne(entry, btn));
      grid.appendChild(btn);
    }
    if (!it.loot.length) grid.appendChild(h('p', { class: 'muted' }, 'Empty. Someone got here first.'));
    LM.ui.open({
      kicker: 'Chest',
      title: it.props.name || 'Iron-bound chest',
      body: h('div', null, grid, h('p', { class: 'hint', style: 'margin-top:12px' }, 'Click an item to take just that one.')),
      actions: [
        { label: 'Take everything', primary: true, key: 'E', disabled: !it.loot.length, onClick: () => { for (const e of it.loot) if (!e.taken) takeOne(e, null); it.emptied = true; } },
        { label: 'Close', quiet: true },
      ],
    });
  }

  function stationPopup(game, it) {
    const P = game.player, st = P.stats();
    const hasCells = P.weapons.some((id) => LM.get('weapons', id).ammo === 'cells') || P.ammo.cells > 0;
    const cellMax = P.ammoMax('cells');
    const meter = (cls, label, val, max) =>
      h('div', { class: 'meter ' + cls }, h('div', { class: 'meter-head' }, h('span', null, label), h('b', null, Math.round(val) + ' / ' + max)),
        h('div', { class: 'bar' }, h('i', { style: 'width:' + (max ? (val / max) * 100 : 0) + '%' })));
    const needCells = cellMax - (P.ammo.cells || 0);
    const needShield = st.maxShield - P.shield;
    const charge = (what) => {
      let used = 0;
      if (what !== 'shield' && it.reserve > 0 && needCells > 0) {
        const n = Math.min(it.reserve, needCells);
        P.ammo.cells += n;
        it.reserve -= n;
        used += n;
      }
      if (what !== 'cells' && it.reserve > 0 && needShield > 0) {
        const n = Math.min(it.reserve, needShield);
        P.shield += n;
        it.reserve -= n;
        used += n;
      }
      if (used) {
        LM.audio.play('recharge');
        game.particles.burst(P.x, P.y, 14, { type: 'ember', color: '#5cc8e8', speed: 60, life: 0.7, size: 1 });
      }
      setTimeout(() => stationPopup(game, it), 0);
      return false;
    };
    LM.ui.open({
      kicker: 'Recharge station',
      title: it.props.name || 'Cell charger',
      body: h('div', null,
        meter('reserve', 'Station reserve', it.reserve, it.props.reserve),
        hasCells ? meter('', 'Your energy cells', P.ammo.cells || 0, cellMax) : h('p', { class: 'muted' }, 'You carry no energy weapons yet.'),
        st.maxShield > 0 ? meter('shield', 'Your shield', P.shield, st.maxShield) : h('p', { class: 'muted' }, 'Wear shield gear and this station can top it up.'),
        it.reserve <= 0 ? h('p', { class: 'result bad' }, 'The station is drained.') : null
      ),
      actions: [
        { label: 'Recharge everything', primary: true, key: 'E', disabled: it.reserve <= 0 || (needCells <= 0 || !hasCells) && needShield <= 0, onClick: () => charge('all') },
        { label: 'Cells only', disabled: it.reserve <= 0 || needCells <= 0 || !hasCells, onClick: () => charge('cells') },
        { label: 'Shield only', disabled: it.reserve <= 0 || needShield <= 0, onClick: () => charge('shield') },
        { label: 'Step away', quiet: true },
      ],
    });
  }

  function altarPopup(game, it) {
    const P = game.player;
    const cost = it.props.tithe;
    const pool = Object.values(LM.registry.blessings).filter((b) => (b.stack || 1) > P.blessings.filter((x) => x === b.id).length);
    const result = h('div', { class: 'result' + (it.lastResult ? ' ' + it.lastResult.kind : '') }, it.lastResult ? it.lastResult.text : '');
    const choice = (title, costText, desc, disabled, fn) => {
      const b = h('button', { class: 'choice', type: 'button', disabled }, h('strong', null, title), h('span', { class: 'cost' }, costText), h('small', null, desc));
      b.addEventListener('click', fn);
      return b;
    };
    const tithe = () => {
      if (P.gold < cost || it.tithed || !pool.length) return;
      P.gold -= cost;
      it.tithed = true;
      const b = U.pick(pool);
      P.blessings.push(b.id);
      P.statsDirty = true;
      if (b.onGrant) b.onGrant(game, P);
      LM.audio.play('altar');
      game.particles.burst(P.x, P.y, 24, { type: 'ember', color: '#f2c96b', speed: 80, life: 1.1, size: 1.2, drag: 1 });
      it.lastResult = { kind: 'good', text: b.name + ': ' + b.desc };
      game.toast('Blessing: ' + b.name, 'good');
      altarPopup(game, it);
    };
    const pray = () => {
      if (it.prayed) return;
      it.prayed = true;
      const roll = Math.random();
      if (roll < 0.55) {
        const got = LM.combat.heal(game, P, 30);
        LM.audio.play('heal');
        it.lastResult = { kind: 'good', text: got > 0 ? 'Warmth spreads through you. +' + Math.round(got) + ' health.' : 'Warmth spreads through you, but you are already whole.' };
      } else if (roll < 0.8) {
        P.gold += 12;
        LM.audio.play('coin');
        it.lastResult = { kind: 'good', text: 'Coins glint in the offering bowl. +12 gold.' };
      } else {
        LM.audio.play('lose');
        it.lastResult = { kind: 'bad', text: 'Silence. Nothing answers.' };
      }
      altarPopup(game, it);
    };
    LM.ui.open({
      kicker: 'Altar',
      title: it.props.deity || 'Altar of the Drowned Saint',
      body: h('div', null,
        h('p', { class: 'lore' }, it.props.text || 'Wax pools around a stone the width of a coffin. The offering bowl is empty.'),
        h('div', { class: 'choices' },
          choice('Offer a tithe', cost + ' gold', it.tithed ? 'This altar has already answered you.' : !pool.length ? 'You hold every blessing it can give.' : 'A random lasting blessing. You have ' + P.gold + ' gold.', P.gold < cost || it.tithed || !pool.length, tithe),
          choice('Pray', 'Free', it.prayed ? 'You have already prayed here.' : 'Ask for nothing in particular, once.', it.prayed, pray)
        ),
        result
      ),
      actions: [{ label: 'Leave the altar', primary: true }],
    });
  }

  // ------------------------------------------------------------ slot machine
  const SYMBOLS = [
    { id: 'coin', w: 34, pay: 6, name: 'Coin' },
    { id: 'gem', w: 20, pay: 12, name: 'Gem' },
    { id: 'eye', w: 16, pay: 16, name: 'Eye' },
    { id: 'crown', w: 10, pay: 40, name: 'Crown' },
    { id: 'skull', w: 20, pay: 0, name: 'Skull' },
  ];
  const symCache = {};
  function symbolCanvas(id, size) {
    const key = id + size;
    if (symCache[key]) return symCache[key].cloneNode ? cloneCanvas(symCache[key]) : symCache[key];
    const c = LM.ui.iconCanvas(size, size, (g, W) => {
      g.translate(W / 2, W / 2);
      const s = W / 60;
      g.scale(s, s);
      if (id === 'coin') {
        const grd = g.createRadialGradient(-6, -6, 2, 0, 0, 20);
        grd.addColorStop(0, '#fff2b8'); grd.addColorStop(0.5, '#e9b343'); grd.addColorStop(1, '#8a5a14');
        g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 19, 0, U.TAU); g.fill();
        g.strokeStyle = '#7a4e10'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 13, 0, U.TAU); g.stroke();
      } else if (id === 'gem') {
        g.fillStyle = '#8f6cf0'; g.beginPath(); g.moveTo(0, -20); g.lineTo(17, -4); g.lineTo(0, 21); g.lineTo(-17, -4); g.closePath(); g.fill();
        g.fillStyle = '#c6b0ff'; g.beginPath(); g.moveTo(0, -20); g.lineTo(8, -4); g.lineTo(-8, -4); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-4, -12, 3, 5);
      } else if (id === 'eye') {
        g.fillStyle = '#ebe4d4'; g.beginPath(); g.ellipse(0, 0, 22, 12, 0, 0, U.TAU); g.fill();
        g.fillStyle = '#2a8aa8'; g.beginPath(); g.arc(0, 0, 9, 0, U.TAU); g.fill();
        g.fillStyle = '#0a0b10'; g.beginPath(); g.arc(0, 0, 4.5, 0, U.TAU); g.fill();
        g.fillStyle = '#fff'; g.fillRect(2, -5, 3, 3);
      } else if (id === 'crown') {
        g.fillStyle = '#f0c048'; g.beginPath(); g.moveTo(-20, 12); g.lineTo(-20, -8); g.lineTo(-10, 2); g.lineTo(0, -16); g.lineTo(10, 2); g.lineTo(20, -8); g.lineTo(20, 12); g.closePath(); g.fill();
        g.fillStyle = '#e4574d'; g.beginPath(); g.arc(0, 5, 3.5, 0, U.TAU); g.fill();
        g.fillStyle = '#8a5a14'; g.fillRect(-20, 9, 40, 3);
      } else if (id === 'skull') {
        g.fillStyle = '#d8d0bc'; g.beginPath(); g.arc(0, -3, 16, 0, U.TAU); g.fill(); g.fillRect(-9, 8, 18, 9);
        g.fillStyle = '#16120e'; g.beginPath(); g.arc(-6, -2, 4.5, 0, U.TAU); g.arc(6, -2, 4.5, 0, U.TAU); g.fill();
        g.fillRect(-1.5, 5, 3, 4); for (let i = -6; i <= 6; i += 4) g.fillRect(i - 0.75, 11, 1.5, 6);
      }
    });
    symCache[key] = c;
    return cloneCanvas(c);
  }
  function cloneCanvas(c) {
    const n = document.createElement('canvas');
    n.width = c.width;
    n.height = c.height;
    n.style.width = c.style.width;
    n.style.height = c.style.height;
    n.getContext('2d').drawImage(c, 0, 0);
    return n;
  }
  function slotsPopup(game, it) {
    const P = game.player;
    const SZ = 76;
    let bet = it.bet || 5;
    let spinning = false;
    const reels = [0, 1, 2].map(() => {
      const strip = h('div', { class: 'strip' });
      strip.appendChild(symbolCanvas(U.pick(SYMBOLS).id, 60));
      [...strip.children].forEach((c) => (c.style.margin = '8px auto'));
      return { el: h('div', { class: 'reel' }, strip), strip };
    });
    const goldLine = h('b', null, String(P.gold));
    const result = h('div', { class: 'result' }, 'Three of a kind pays. Two coins anywhere returns your bet and a half.');
    const betBtns = [5, 10, 25].map((b) => {
      const btn = h('button', { class: 'btn small' + (b === bet ? ' on' : ''), type: 'button' }, b + ' gold');
      btn.addEventListener('click', () => {
        if (spinning) return;
        bet = b;
        it.bet = b;
        betBtns.forEach((x) => x.classList.toggle('on', x === btn));
        LM.audio.play('ui');
        refresh();
      });
      return btn;
    });
    const pay = h('div', { class: 'paytable' }, SYMBOLS.map((s) => {
      const c = symbolCanvas(s.id, 22);
      return h('div', null, c, c.cloneNode ? null : null, s.name + ' ×3', h('b', null, s.pay ? '×' + s.pay : 'beware'));
    }));
    const spinAction = {
      label: 'Pull the lever', primary: true, key: 'E', close: false,
      onClick: () => {
        spin();
        return false;
      },
    };
    const refresh = () => {
      goldLine.textContent = String(P.gold);
      if (spinAction.el) spinAction.el.disabled = spinning || P.gold < bet;
    };
    function spin() {
      if (spinning || P.gold < bet) return;
      spinning = true;
      P.gold -= bet;
      refresh();
      result.className = 'result';
      result.textContent = 'The reels clatter…';
      const outcome = [0, 1, 2].map(() => U.weighted(SYMBOLS));
      const start = performance.now();
      const plans = reels.map((r, i) => {
        r.strip.replaceChildren();
        const n = 18 + i * 6;
        for (let k = 0; k < n; k++) r.strip.appendChild(symbolCanvas(k === n - 1 ? outcome[i].id : U.pick(SYMBOLS).id, 60));
        [...r.strip.children].forEach((c) => (c.style.margin = '8px auto'));
        return { n, dur: 900 + i * 380, dist: (n - 1) * SZ, lastTick: 0 };
      });
      function frame(now) {
        let done = true;
        plans.forEach((p, i) => {
          const k = U.clamp((now - start) / p.dur, 0, 1);
          const y = U.ease.outCubic(k) * p.dist;
          reels[i].strip.style.transform = 'translateY(' + -y + 'px)';
          const idx = Math.floor(y / SZ);
          if (idx !== p.lastTick && k < 1) {
            p.lastTick = idx;
            LM.audio.play('tick', { throttle: 0.01 });
          }
          if (k < 1) done = false;
        });
        if (!done && LM.ui.modalOpen) requestAnimationFrame(frame);
        else finish();
      }
      requestAnimationFrame(frame);
      function finish() {
        spinning = false;
        const ids = outcome.map((o) => o.id);
        const coins = ids.filter((x) => x === 'coin').length;
        let win = 0, msg = '', kind = 'bad';
        if (ids[0] === ids[1] && ids[1] === ids[2]) {
          const s = outcome[0];
          if (s.id === 'skull') {
            msg = 'Three skulls. The machine coughs up something hungry.';
            for (let i = 0; i < 3; i++) {
              const a = Math.random() * U.TAU;
              game.spawnEnemy('skitter', it.x + Math.cos(a) * 30, it.y + 30 + Math.sin(a) * 10, { summoned: true, aggro: true });
            }
            LM.audio.play('alarm');
            setTimeout(() => LM.ui.close(), 900);
          } else {
            win = bet * s.pay;
            msg = 'Three ' + s.name.toLowerCase() + 's! You win ' + win + ' gold.';
            kind = 'good';
          }
        } else if (coins >= 2) {
          win = Math.floor(bet * 1.5);
          msg = 'Two coins. ' + win + ' gold back.';
          kind = 'good';
        } else msg = 'Nothing. The machine keeps your ' + bet + ' gold.';
        if (win) {
          P.gold += win;
          game.stats.gold += Math.max(0, win - bet);
          LM.audio.play(win >= bet * 6 ? 'win' : 'coin');
        } else if (!msg.startsWith('Three skulls')) LM.audio.play('lose');
        result.className = 'result ' + kind;
        result.textContent = msg;
        refresh();
      }
    }
    LM.ui.open({
      kicker: 'Games of chance',
      title: it.props.name || 'The Brass Widow',
      body: h('div', { class: 'slots-machine' },
        h('div', { class: 'reels' }, reels.map((r) => r.el)),
        h('div', { class: 'bets' }, h('span', { class: 'muted', style: 'align-self:center' }, 'Bet'), betBtns),
        h('div', { class: 'meter-head' }, h('span', null, 'Your gold'), goldLine),
        result,
        pay
      ),
      actions: [spinAction, { label: 'Walk away', quiet: true }],
    });
    refresh();
  }

  // ------------------------------------------------------------ the items
  const items = {
    gold: {
      name: 'Gold', radius: 6, magnet: 70, shadowScale: 0.6, mapColor: null,
      init(it) {
        if (!it.props.amount) it.props.amount = U.randInt(5, 15);
      },
      onTouch(it, game) {
        game.grant({ type: 'gold', amount: it.props.amount });
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + it.props.amount, color: '#f2c96b', size: 8 });
      },
      draw(g, it) {
        const n = it.props.amount < 10 ? 1 : it.props.amount < 30 ? 2 : it.props.amount < 80 ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const ox = (i % 3) * 4 - 4 + (n === 1 ? 4 : 0), oy = Math.floor(i / 3) * -3 + (i % 2) * 2;
          const grd = g.createRadialGradient(ox - 1.5, oy - 1.5, 0.5, ox, oy, 4);
          grd.addColorStop(0, '#fff2b8');
          grd.addColorStop(0.6, '#e9b343');
          grd.addColorStop(1, '#8a5a14');
          g.fillStyle = grd;
          g.beginPath();
          g.ellipse(ox, oy, 4, 3.4, 0, 0, U.TAU);
          g.fill();
        }
      },
      drawGlow(g, it, t) {
        const s = Math.max(0, Math.sin(t * 3 + it.t * 0.7));
        G.glow(g, 0, 0, 10, '#f2c96b', 0.12 + s * s * s * 0.5);
      },
    },
    'health-vial': {
      name: 'Health vial', radius: 6, shadowScale: 0.6, bob: true,
      onTouch(it, game) {
        const P = game.player;
        if (P.hp >= P.stats().maxHp) return false;
        LM.combat.heal(game, P, it.props.heal || 25);
        LM.audio.play('heal');
      },
      draw(g) {
        g.fillStyle = 'rgba(220,230,235,0.5)';
        LM.gfx.roundRect(g, -3.5, -5, 7, 10, 2);
        g.fill();
        g.fillStyle = '#d23a3a';
        LM.gfx.roundRect(g, -2.8, -1.5, 5.6, 6, 1.5);
        g.fill();
        g.fillStyle = '#8a6a4a';
        g.fillRect(-1.8, -7, 3.6, 2.4);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#ff4a4a', 0.3 + 0.1 * Math.sin(t * 3));
      },
    },
    medkit: {
      name: 'Medical kit', radius: 8, shadowScale: 0.8,
      onTouch(it, game) {
        const P = game.player;
        if (P.hp >= P.stats().maxHp) return false;
        LM.combat.heal(game, P, it.props.heal || 60);
        LM.audio.play('heal');
        game.toast('Patched up with a medical kit', 'good');
      },
      draw(g) {
        g.fillStyle = '#d8d2c4';
        LM.gfx.roundRect(g, -8, -6, 16, 12, 2);
        g.fill();
        g.fillStyle = '#b8b2a4';
        g.fillRect(-8, 3, 16, 3);
        g.fillStyle = '#c8302a';
        g.fillRect(-1.5, -4.5, 3, 9);
        g.fillRect(-4.5, -1.5, 9, 3);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 14, '#ff6a5a', 0.18 + 0.08 * Math.sin(t * 2));
      },
    },
    key: {
      name: 'Key', radius: 7, bob: true, mapColor: '#f0c048', mapAlways: false,
      onTouch(it, game) {
        const c = it.props.color || 'red';
        game.player.keys.add(c);
        LM.audio.play('key');
        game.toast('You have the ' + LM.KEY_NAMES[c], 'key');
        game.particles.burst(it.x, it.y, 16, { type: 'ember', color: LM.KEY_COLORS[c], speed: 70, life: 0.8, size: 1.2 });
      },
      draw(g, it) {
        const c = LM.KEY_COLORS[it.props.color || 'red'];
        g.strokeStyle = c;
        g.fillStyle = c;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(-4, 0, 3.4, 0, U.TAU);
        g.stroke();
        g.fillRect(-1, -1, 10, 2);
        g.fillRect(6, 0, 2, 4);
        g.fillRect(3, 0, 2, 3);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 18, LM.KEY_COLORS[it.props.color || 'red'], 0.55 + 0.2 * Math.sin(t * 3));
      },
    },
    'ammo-shells': ammoItem('shells'),
    'ammo-rounds': ammoItem('rounds'),
    'ammo-cells': ammoItem('cells'),
    'ammo-rockets': ammoItem('rockets'),

    chest: {
      name: 'Chest', radius: 12, solid: true, solidRadius: 11, isChest: true, mapColor: '#e0b25a',
      init(it) {
        if (it.props.loot) it.loot = it.props.loot.map((e) => Object.assign({}, e));
        else it.loot = LM.get('lootTables', it.props.table || 'chest-common').roll();
        it.opened = false;
        it.emptied = false;
      },
      interact: {
        available: (it) => !it.emptied,
        prompt(it, game) {
          if (it.props.lock && !it.opened && !game.player.keys.has(it.props.lock)) return 'Locked chest (needs the ' + LM.KEY_NAMES[it.props.lock] + ')';
          return it.opened ? 'Search the chest' : 'Open the chest';
        },
        use(it, game) {
          if (it.props.lock && !it.opened && !game.player.keys.has(it.props.lock)) {
            LM.audio.play('locked');
            game.toast('The lock will not turn without the ' + LM.KEY_NAMES[it.props.lock] + '.', 'warn');
            return;
          }
          if (!it.opened) {
            it.opened = true;
            game.stats.chests++;
            LM.audio.play('open');
            game.particles.burst(it.x, it.y - 4, 18, { type: 'ember', color: '#f2c96b', speed: 70, life: 0.9, size: 1.1, drag: 1.5 });
          }
          chestPopup(game, it);
        },
      },
      draw(g, it) {
        const wood = it.props.lock ? '#5a3a24' : '#6b4527';
        g.fillStyle = '#2a1a0e';
        g.fillRect(-12, -8, 24, 16);
        g.fillStyle = wood;
        g.fillRect(-11, -7, 22, 14);
        if (it.opened) {
          g.fillStyle = '#1a0f08';
          g.fillRect(-10, -6, 20, 7);
          g.fillStyle = U.shade(wood, 0.15);
          g.fillRect(-11, -11, 22, 4);
        } else {
          g.fillStyle = U.shade(wood, 0.15);
          g.fillRect(-11, -7, 22, 5);
        }
        g.fillStyle = '#9a9488';
        g.fillRect(-8, -7, 2, 14);
        g.fillRect(6, -7, 2, 14);
        g.fillStyle = it.props.lock ? LM.KEY_COLORS[it.props.lock] : '#d9a32a';
        g.fillRect(-2, -2, 4, 4);
      },
      drawGlow(g, it, t) {
        if (it.opened && !it.emptied) G.glow(g, 0, -4, 16, '#f2c96b', 0.4 + 0.1 * Math.sin(t * 3));
        else if (!it.opened) G.glow(g, 0, 0, 8, it.props.lock ? LM.KEY_COLORS[it.props.lock] : '#f2c96b', 0.25 + 0.1 * Math.sin(t * 2));
      },
    },

    // ---------------------------------------------------- lights
    brazier: {
      name: 'Brazier', radius: 9, solid: true,
      light: (it, game) => ({ color: it.props.color || game.level.env.torch, radius: 230, intensity: 0.92, flicker: 0.18 }),
      update(it, dt, game) {
        if (Math.random() < dt * 3) game.particles.add({ type: 'ember', x: it.x + U.rand(-3, 3), y: it.y - 4, vx: U.rand(-6, 6), vy: U.rand(-30, -14), drag: 0.5, life: U.rand(0.6, 1.4), size: 0.8, color: '#ffb060' });
      },
      draw(g) {
        g.strokeStyle = '#1c1a18';
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * U.TAU + 0.5;
          g.moveTo(0, 0);
          g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        }
        g.stroke();
        g.fillStyle = '#2a2622';
        g.beginPath();
        g.arc(0, 0, 8, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a1a0a';
        g.beginPath();
        g.arc(0, 0, 6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 10, '#ff5a1a', 0.9);
        flame(g, -2, -1, 1, t, it.t, it.props.color);
        flame(g, 2.5, 1, 0.8, t, it.t + 3, it.props.color);
      },
    },
    'wall-torch': {
      name: 'Torch', radius: 4, wallMounted: true, shadow: false,
      light: (it, game) => ({ color: it.props.color || game.level.env.torch, radius: 200, intensity: 0.85, flicker: 0.22 }),
      draw(g, it) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a);
        g.fillStyle = '#1c1a18';
        g.fillRect(-1, -3, 3, 6);
        g.fillStyle = '#4a3020';
        g.fillRect(1, -1.3, 7, 2.6);
        g.fillStyle = '#2a1a10';
        g.fillRect(7, -2, 3, 4);
      },
      drawGlow(g, it, t) {
        flame(g, it.face.x * 9, it.face.y * 9, 1, t, it.t, it.props.color);
      },
    },
    crystal: {
      name: 'Glowing crystal', radius: 8, solid: true,
      light: (it) => ({ color: it.props.color || '#8fd8ff', radius: 180, intensity: 0.7, flicker: 0.04 }),
      draw(g, it) {
        const c = it.props.color || '#8fd8ff';
        const shards = [[-4, 2, 4, 11, -0.3], [3, 3, 3.5, 9, 0.35], [0, 0, 5, 14, 0], [5, -1, 2.5, 7, 0.7]];
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.beginPath();
        g.ellipse(1, 4, 9, 4, 0, 0, U.TAU);
        g.fill();
        for (const [x, y, w, hh, rot] of shards) {
          g.save();
          g.translate(x, y);
          g.rotate(rot);
          const grd = g.createLinearGradient(-w, 0, w, 0);
          grd.addColorStop(0, U.shade(c, -0.4));
          grd.addColorStop(0.5, U.shade(c, 0.3));
          grd.addColorStop(1, U.shade(c, -0.2));
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(0, -hh);
          g.lineTo(w, -hh * 0.6);
          g.lineTo(w * 0.8, 0);
          g.lineTo(-w * 0.8, 0);
          g.lineTo(-w, -hh * 0.6);
          g.closePath();
          g.fill();
          g.restore();
        }
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -4, 22, it.props.color || '#8fd8ff', 0.45 + 0.1 * Math.sin(t * 1.5 + it.t));
      },
    },
    candles: {
      name: 'Candles', radius: 5, shadow: false,
      light: { color: '#ffcf80', radius: 120, intensity: 0.55, flicker: 0.25 },
      draw(g) {
        for (const [x, y, hh] of [[-4, 2, 6], [2, -2, 8], [4, 3, 5]]) {
          g.fillStyle = '#e8dcc0';
          g.fillRect(x - 1.3, y - hh, 2.6, hh);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x + 0.5, y - hh, 0.8, hh);
        }
      },
      drawGlow(g, it, t) {
        for (const [x, y, hh] of [[-4, 2, 6], [2, -2, 8], [4, 3, 5]]) {
          const f = 0.8 + 0.2 * Math.sin(t * 13 + x);
          G.glow(g, x, y - hh - 1.5, 5 * f, '#ffb060', 0.8);
          G.glow(g, x, y - hh - 1.5, 1.8, '#fff3d0', 1);
        }
      },
    },

    // ---------------------------------------------------- furniture
    crate: {
      name: 'Crate', radius: 11, solid: true, solidRadius: 12,
      destructible: {
        hp: 22,
        onBreak(it, game) {
          LM.audio.play('break', { vol: game.vol(it.x, it.y) });
          game.particles.burst(it.x, it.y, 12, { type: 'chunk', color: ['#6b4a2a', '#4a3018', '#8a6a42'], speed: 160, life: 0.9, size: 2, vz: 120, z: 4, vr: 14 });
          game.renderer.addDecal({ type: 'debris', x: it.x, y: it.y, r: 12, color: '#4a3018' });
          game.dropLoot(it.x, it.y, it.props.loot || LM.get('lootTables', 'crate').roll());
        },
      },
      draw(g) {
        g.fillStyle = '#3a2614';
        g.fillRect(-11, -11, 22, 22);
        g.fillStyle = '#7a5530';
        g.fillRect(-10, -10, 20, 20);
        g.strokeStyle = '#4a3018';
        g.lineWidth = 2;
        g.strokeRect(-8, -8, 16, 16);
        g.beginPath();
        g.moveTo(-8, -8);
        g.lineTo(8, 8);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(-10, -10, 20, 1.5);
      },
    },
    barrel: {
      name: 'Blast barrel', radius: 9, solid: true,
      destructible: {
        hp: 14,
        onBreak(it, game, o) {
          LM.combat.explode(game, it.x, it.y, { radius: 78, damage: 60, owner: 'barrel', color: '#ff8a3a' });
        },
      },
      draw(g, it) {
        g.fillStyle = '#4a1410';
        g.beginPath();
        g.arc(0, 0, 9, 0, U.TAU);
        g.fill();
        const grd = g.createRadialGradient(-3, -3, 1, 0, 0, 8);
        grd.addColorStop(0, '#d0503a');
        grd.addColorStop(1, '#8a2418');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, 8, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#d9a32a';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, 0, 5.5, 0, U.TAU);
        g.stroke();
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.arc(0, 0, 2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (it.hp < it.def.destructible.hp) G.glow(g, 0, 0, 14, '#ff6a2a', 0.4 + 0.4 * Math.sin(t * 20));
      },
    },
    table: {
      name: 'Table', radius: 13, solid: true, solidRadius: 13,
      draw(g, it) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-15, -10, 30, 20);
        g.fillStyle = '#6a4a2c';
        g.fillRect(-14, -9, 28, 18);
        g.strokeStyle = 'rgba(0,0,0,0.2)';
        g.lineWidth = 0.6;
        for (let i = -6; i <= 6; i += 6) {
          g.beginPath();
          g.moveTo(-14, i);
          g.lineTo(14, i);
          g.stroke();
        }
        g.fillStyle = '#c8c0b0';
        g.beginPath();
        g.arc(-5, -2, 2.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#8a7a5a';
        g.fillRect(4, 1, 5, 4);
      },
    },
    bench: {
      name: 'Bench', radius: 9, solid: true, solidRadius: 10,
      draw(g) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-14, -5, 28, 10);
        g.fillStyle = '#5a3c22';
        g.fillRect(-13, -4, 26, 8);
        g.fillStyle = 'rgba(255,255,255,0.07)';
        g.fillRect(-13, -4, 26, 1);
      },
    },
    bones: {
      name: 'Bones', radius: 6, shadow: false, z: -2,
      draw(g, it) {
        const r = U.mulberry32((it.tx * 31 + it.ty * 17) >>> 0);
        g.strokeStyle = '#cfc6b0';
        g.lineWidth = 1.6;
        g.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const a = r() * U.TAU, x = (r() - 0.5) * 14, y = (r() - 0.5) * 14;
          g.beginPath();
          g.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4);
          g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
          g.stroke();
        }
        g.fillStyle = '#ddd4bc';
        g.beginPath();
        g.arc(3, -2, 3.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2420';
        g.fillRect(2, -2.5, 1.2, 1.2);
        g.fillRect(4.2, -2.5, 1.2, 1.2);
      },
    },
    lectern: {
      name: 'Lectern', radius: 9, solid: true, mapColor: '#cfc6b0',
      interact: { prompt: (it) => 'Read ' + (it.props.title ? '“' + it.props.title + '”' : 'the book'), available: () => true, use: (it) => LM.ui.showText(it.props.title || 'An open book', it.props.text || 'The pages are blank.', 'Lectern') },
      draw(g) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-9, -7, 18, 14);
        g.fillStyle = '#5a3c22';
        g.fillRect(-8, -6, 16, 12);
        g.fillStyle = '#e8dfc8';
        g.fillRect(-7, -5, 6.6, 9);
        g.fillRect(0.4, -5, 6.6, 9);
        g.fillStyle = 'rgba(40,30,20,0.5)';
        for (let i = 0; i < 4; i++) {
          g.fillRect(-6, -3.5 + i * 2, 4.5, 0.6);
          g.fillRect(1.4, -3.5 + i * 2, 4.5, 0.6);
        }
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 12, '#fff0c8', 0.12 + 0.05 * Math.sin(t * 2));
      },
    },
    'healing-font': {
      name: 'Healing font', radius: 12, solid: true, mapColor: '#8ff0d0',
      light: { color: '#7fe8d8', radius: 120, intensity: 0.45, flicker: 0.05 },
      init(it) {
        it.uses = it.props.uses || 3;
      },
      interact: {
        available: (it) => it.uses > 0,
        prompt: (it) => 'Drink from the font (' + it.uses + ' left)',
        use(it, game) {
          const P = game.player;
          const full = P.hp >= P.stats().maxHp;
          LM.ui.open({
            kicker: 'Healing font',
            title: it.props.name || 'The Saint’s Basin',
            body: h('div', null, h('p', { class: 'lore' }, 'Cold water, faintly luminous, in a basin worn smooth by hands. Each draught closes wounds. There are ' + it.uses + ' left.'),
              full ? h('p', { class: 'muted' }, 'You are unhurt. Save it for later.') : null),
            actions: [
              {
                label: 'Drink', primary: true, key: 'E', disabled: full,
                onClick: () => {
                  it.uses--;
                  LM.combat.heal(game, P, it.props.heal || 35);
                  LM.audio.play('heal');
                  if (it.uses <= 0 && it.light) it.light.intensity = 0.12;
                },
              },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g, it) {
        g.fillStyle = '#3a3a36';
        g.beginPath();
        g.arc(0, 0, 12, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a5a54';
        g.beginPath();
        g.arc(0, 0, 10.5, 0, U.TAU);
        g.fill();
        g.fillStyle = it.uses > 0 ? '#2a8a8a' : '#2a3a3a';
        g.beginPath();
        g.arc(0, 0, 8, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (it.uses > 0) G.glow(g, 0, 0, 14, '#7fe8d8', 0.35 + 0.1 * Math.sin(t * 2.4));
      },
    },
    'recharge-station': {
      name: 'Recharge station', radius: 12, solid: true, mapColor: '#5cc8e8', mapAlways: true,
      light: { color: '#5cc8e8', radius: 110, intensity: 0.45, flicker: 0.03 },
      init(it) {
        it.props.reserve = it.props.reserve || 120;
        it.reserve = it.props.reserve;
      },
      interact: { prompt: 'Use the recharge station', available: () => true, use: (it, game) => stationPopup(game, it) },
      draw(g, it) {
        g.fillStyle = '#1c1e22';
        g.fillRect(-12, -10, 24, 20);
        g.fillStyle = '#3a3e46';
        g.fillRect(-11, -9, 22, 18);
        g.fillStyle = '#0a1a22';
        g.fillRect(-8, -7, 16, 7);
        g.fillStyle = '#5cc8e8';
        const k = it.reserve / it.props.reserve;
        g.fillRect(-7, -6, 14 * k, 5);
        g.fillStyle = '#d9a32a';
        g.fillRect(-8, 3, 4, 3);
        g.fillStyle = '#26282d';
        g.fillRect(2, 2, 6, 5);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -3, 12, '#5cc8e8', it.reserve > 0 ? 0.5 + 0.1 * Math.sin(t * 4) : 0.1);
      },
    },
    altar: {
      name: 'Altar', radius: 12, solid: true, mapColor: '#f2c96b',
      light: { color: '#ffcf80', radius: 140, intensity: 0.55, flicker: 0.2 },
      init(it) {
        it.props.tithe = it.props.tithe || 40;
        it.tithed = false;
        it.prayed = false;
      },
      interact: { prompt: 'Approach the altar', available: (it) => !(it.tithed && it.prayed), use: (it, game) => altarPopup(game, it) },
      draw(g) {
        g.fillStyle = '#26241f';
        g.fillRect(-14, -9, 28, 18);
        g.fillStyle = '#5c584e';
        g.fillRect(-13, -8, 26, 16);
        g.fillStyle = '#6a1e26';
        g.fillRect(-6, -8, 12, 16);
        g.fillStyle = '#c79a44';
        g.fillRect(-6, -8, 12, 1.2);
        g.fillRect(-6, 6.8, 12, 1.2);
        g.fillStyle = '#e8dcc0';
        g.fillRect(-11, -6, 2.4, 4);
        g.fillRect(8.6, -6, 2.4, 4);
      },
      drawGlow(g, it, t) {
        G.glow(g, -10, -7, 5, '#ffb060', 0.8);
        G.glow(g, 10, -7, 5, '#ffb060', 0.8);
        if (!(it.tithed && it.prayed)) G.glow(g, 0, 0, 18, '#f2c96b', 0.2 + 0.1 * Math.sin(t * 1.6));
      },
    },
    'slot-machine': {
      name: 'Slot machine', radius: 12, solid: true, mapColor: '#ff6ab0', mapAlways: true,
      light: { color: '#ff6ab0', radius: 110, intensity: 0.4, flicker: 0.1 },
      interact: { prompt: 'Play the slot machine', available: () => true, use: (it, game) => slotsPopup(game, it) },
      draw(g) {
        g.fillStyle = '#1a1214';
        g.fillRect(-12, -12, 24, 22);
        g.fillStyle = '#7a1e3a';
        g.fillRect(-11, -11, 22, 20);
        g.fillStyle = '#0c0a0c';
        g.fillRect(-8, -6, 16, 7);
        g.fillStyle = '#e8dcc0';
        for (let i = 0; i < 3; i++) g.fillRect(-7 + i * 5.3, -5, 4, 5);
        g.fillStyle = '#c79a44';
        g.fillRect(-11, -11, 22, 2);
        g.fillStyle = '#9a9488';
        g.fillRect(11, -6, 3, 2);
        g.fillStyle = '#d23a3a';
        g.beginPath();
        g.arc(14, -8, 2, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        for (let i = 0; i < 5; i++) {
          const on = Math.floor(t * 6 + i) % 2;
          G.glow(g, -9 + i * 4.5, -10, 3.5, i % 2 ? '#ff6ab0' : '#f2c96b', on ? 0.9 : 0.25);
        }
      },
    },
    'weapon-rack': {
      name: 'Weapon rack', radius: 11, solid: true, mapColor: '#d8d0c0',
      interact: {
        available: (it) => !it.taken,
        prompt: (it) => 'Take the ' + LM.get('weapons', it.props.weapon || 'scattergun').name,
        use: (it, game) => weaponPopup(game, it, it.props.weapon || 'scattergun', () => (it.taken = true)),
      },
      draw(g, it) {
        g.fillStyle = '#2a1a0e';
        g.fillRect(-13, -6, 26, 12);
        g.fillStyle = '#5a3c22';
        g.fillRect(-12, -5, 24, 10);
        if (!it.taken) {
          const w = LM.get('weapons', it.props.weapon || 'scattergun');
          g.save();
          g.translate(-12, 0);
          if (w.drawHeld) w.drawHeld(g, {}, 0);
          g.restore();
        }
      },
      drawGlow(g, it, t) {
        if (!it.taken) G.glow(g, 0, 0, 18, '#f2c96b', 0.15 + 0.08 * Math.sin(t * 2));
      },
    },
    'weapon-pickup': {
      name: 'Weapon', radius: 10, bob: true,
      interact: {
        prompt: (it) => 'Take the ' + LM.get('weapons', it.props.weapon).name,
        use: (it, game) => weaponPopup(game, it, it.props.weapon, () => it.remove(game)),
      },
      draw(g, it) {
        const w = LM.get('weapons', it.props.weapon);
        g.rotate(-0.4);
        g.translate(-10, 0);
        if (w.drawHeld) w.drawHeld(g, {}, 0);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 20, '#f2c96b', 0.25 + 0.1 * Math.sin(t * 3));
      },
    },
    'armor-stand': {
      name: 'Armor stand', radius: 11, solid: true, mapColor: '#d8d0c0',
      interact: {
        available: (it) => !it.taken,
        prompt: (it) => 'Examine the ' + LM.get('armor', it.props.armor).name,
        use: (it, game) => armorPopup(game, it, it.props.armor, () => (it.taken = true)),
      },
      draw(g, it) {
        g.fillStyle = '#2a1a0e';
        g.beginPath();
        g.arc(0, 0, 10, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a3c22';
        g.fillRect(-1.5, -9, 3, 18);
        g.fillRect(-8, -6, 16, 2.5);
        if (!it.taken) {
          const a = LM.get('armor', it.props.armor);
          g.fillStyle = a.color;
          g.beginPath();
          if (a.slot === 'head') g.arc(0, -4, 6, 0, U.TAU);
          else g.ellipse(0, 0, 7, 9, 0, 0, U.TAU);
          g.fill();
          if (a.trim) {
            g.strokeStyle = a.trim;
            g.lineWidth = 1;
            g.stroke();
          }
        }
      },
      drawGlow(g, it, t) {
        if (!it.taken) G.glow(g, 0, 0, 18, '#f2c96b', 0.14 + 0.08 * Math.sin(t * 2));
      },
    },
    'armor-pickup': {
      name: 'Armor', radius: 10, bob: true,
      interact: {
        prompt: (it) => 'Examine the ' + LM.get('armor', it.props.armor).name,
        use: (it, game) => armorPopup(game, it, it.props.armor, () => it.remove(game)),
      },
      drawIcon(g, props) {},
      draw(g, it) {
        const a = LM.get('armor', it.props.armor);
        g.fillStyle = a.color;
        g.beginPath();
        g.ellipse(0, 0, 7, 8, 0, 0, U.TAU);
        g.fill();
        if (a.trim) {
          g.strokeStyle = a.trim;
          g.lineWidth = 1.2;
          g.stroke();
        }
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 18, '#f2c96b', 0.22 + 0.1 * Math.sin(t * 3));
      },
    },

    // ---------------------------------------------------- trap hardware
    'dart-emitter': {
      name: 'Dart slot', radius: 4, wallMounted: true, shadow: false,
      draw(g, it) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a);
        g.fillStyle = '#121214';
        g.fillRect(-2, -4, 3, 8);
        g.fillStyle = '#8a7a5a';
        g.fillRect(-2, -4, 3, 1);
        g.fillRect(-2, 3, 3, 1);
      },
      drawGlow(g, it) {
        if (it.charge > 0) G.glow(g, it.face.x * 2, it.face.y * 2, 8, '#ff5a3a', it.charge * 4);
      },
      update(it, dt) {
        if (it.charge > 0) it.charge -= dt;
      },
    },
    'beam-emitter': {
      name: 'Beam emitter', radius: 4, wallMounted: true, shadow: false,
      draw(g, it) {
        const a = Math.atan2(it.face.y, it.face.x);
        g.rotate(a);
        g.fillStyle = '#26282d';
        g.fillRect(-2, -4, 4, 8);
        g.fillStyle = '#5a1a1a';
        g.beginPath();
        g.arc(2, 0, 2, 0, U.TAU);
        g.fill();
      },
    },
    idol: {
      name: 'Gilded idol', radius: 8, mapColor: '#f2c96b', mapAlways: true,
      light: { color: '#f2c96b', radius: 150, intensity: 0.55, flicker: 0.02 },
      interact: {
        prompt: 'Take the Gilded Idol',
        use(it, game) {
          LM.ui.open({
            kicker: 'Pedestal',
            title: 'The Gilded Idol',
            body: h('div', null, h('p', { class: 'lore' }, it.props.text || 'A saint no taller than your hand, cast in solid gold, eyes shut. Nothing holds it to the pedestal but dust.'), h('p', { class: 'muted' }, 'Worth ' + (it.props.value || 150) + ' gold.')),
            actions: [
              {
                label: 'Take it', primary: true, key: 'E',
                onClick: () => {
                  game.grant({ type: 'gold', amount: it.props.value || 150 });
                  game.toast('You lift the idol. Something behind the walls lets go.', 'warn');
                  it.remove(game);
                  if (it.tag) game.triggerEvent('pickup', it.tag);
                },
              },
              { label: 'Leave it', quiet: true },
            ],
          });
        },
      },
      draw(g) {
        g.fillStyle = '#3a3630';
        g.fillRect(-9, -2, 18, 10);
        g.fillStyle = '#6a665e';
        g.fillRect(-8, -1, 16, 8);
        const grd = g.createLinearGradient(-4, -12, 4, 2);
        grd.addColorStop(0, '#fff2b8');
        grd.addColorStop(0.5, '#e9b343');
        grd.addColorStop(1, '#8a5a14');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, -9, 3, 0, U.TAU);
        g.fill();
        g.fillRect(-3, -7, 6, 8);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, -6, 20, '#f2c96b', 0.5 + 0.15 * Math.sin(t * 2));
      },
    },
    banner: {
      name: 'Banner', radius: 4, wallMounted: true, shadow: false,
      draw(g, it, t) {
        const a = Math.atan2(it.face.y, it.face.x) - Math.PI / 2;
        g.rotate(a);
        const c = it.props.color || '#6a1e26';
        g.fillStyle = '#c79a44';
        g.fillRect(-9, -1, 18, 2);
        const grd = g.createLinearGradient(0, 0, 0, 16);
        grd.addColorStop(0, c);
        grd.addColorStop(1, U.shade(c, -0.4));
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(-7, 1);
        g.lineTo(7, 1);
        g.lineTo(7, 14);
        g.lineTo(0, 10);
        g.lineTo(-7, 14);
        g.closePath();
        g.fill();
        g.fillStyle = '#c79a44';
        g.fillRect(-1, 4, 2, 5);
      },
    },
  };

  function ammoItem(type) {
    const st = AMMO_STYLE[type];
    return {
      name: LM.AMMO_NAMES[type], radius: 7, shadowScale: 0.7,
      onTouch(it, game) {
        const P = game.player;
        if ((P.ammo[type] || 0) >= P.ammoMax(type)) return false;
        const got = P.addAmmo(type, it.props.amount || st.amount);
        LM.audio.play('pickup');
        game.particles.add({ type: 'text', x: it.x, y: it.y - 10, vy: -30, drag: 2, life: 0.8, text: '+' + got + ' ' + LM.AMMO_NAMES[type].toLowerCase(), color: '#e8dcc0', size: 7 });
      },
      draw(g) {
        g.fillStyle = '#16140f';
        g.fillRect(-7, -5, 14, 10);
        g.fillStyle = st.color;
        g.fillRect(-6, -4, 12, 8);
        g.fillStyle = st.band;
        g.fillRect(-6, -1, 12, 2);
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(-6, -4, 12, 1);
      },
      drawGlow(g, it, t) {
        G.glow(g, 0, 0, 10, st.band, 0.15 + 0.06 * Math.sin(t * 3));
      },
    };
  }

  // ------------------------------------------------------------ loot tables
  const roll = (fn) => ({ roll: fn });
  const ammoPick = () => {
    const P = LM.game && LM.game.player;
    const types = P ? [...new Set(P.weapons.map((id) => LM.get('weapons', id).ammo).filter(Boolean))] : [];
    const t = types.length ? U.pick(types) : 'shells';
    return { type: 'ammo', ammo: t, amount: AMMO_STYLE[t].amount };
  };
  const lootTables = {
    crate: roll(() => {
      const r = Math.random();
      if (r < 0.42) return [];
      if (r < 0.74) return [{ type: 'gold', amount: U.randInt(4, 12) }];
      if (r < 0.9) return [ammoPick()];
      return [{ type: 'item', id: 'health-vial' }];
    }),
    'chest-common': roll(() => {
      const out = [{ type: 'gold', amount: U.randInt(15, 35) }];
      const extra = [ammoPick(), { type: 'item', id: 'health-vial' }, ammoPick(), { type: 'item', id: 'medkit' }];
      out.push(extra[Math.floor(Math.random() * 3)]);
      if (Math.random() < 0.4) out.push(U.pick(extra));
      return out;
    }),
    'chest-rich': roll(() => [{ type: 'gold', amount: U.randInt(60, 120) }, { type: 'item', id: 'medkit' }, ammoPick(), ammoPick()]),
  };

  LM.definePack({ id: 'core', items, lootTables });
})();
