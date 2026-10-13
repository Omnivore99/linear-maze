/* The Linear Maze — packs/office/phone.js
 * Office pack, part 4: your phone. It is a gadget (always carried, press F),
 * it is what you hold when a floor is unarmed (click to take a flash photo),
 * and it keeps working all the way down: messages, notes, a floor map,
 * photos and a flashlight.
 *
 * Pack API
 *   LM.phone.send(game, threadId, text, { replies })   deliver a message now
 *   LM.phone.later(game, seconds, threadId, text, opts) deliver after a delay
 *   trap effect { type: 'phone', thread, text, replies, delay }
 *   replies: [{ label, then?: { text, delay } }]       quick replies the player can tap
 * Threads: dana, calendar, unknown, team, mom (add more in LM.PHONE_THREADS).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);

  const THREADS = (LM.PHONE_THREADS = {
    dana: { name: 'Dana Whitlock', initials: 'DW', color: '#8a2a2a' },
    calendar: { name: 'Calendar', initials: '10', color: '#2a6aa0' },
    unknown: { name: 'Unknown number', initials: '?', color: '#3a3530' },
    team: { name: '#fourteenth-floor', initials: '#', color: '#2a7a6a' },
    mom: { name: 'Mom', initials: 'M', color: '#6a4a8a' },
  });

  // ------------------------------------------------------------ state
  function state(P) {
    if (!P.data.phone) {
      P.data.phone = { threads: {}, order: [], flashlight: false, battery: 64, drain: 0, photos: [], clock: 9 * 3600 + 52 * 60, tab: 'messages', open: null };
    }
    return P.data.phone;
  }
  const unread = (P) => Object.values(state(P).threads).reduce((n, t) => n + (t.unread || 0), 0);
  function clockText(game, P) {
    const ph = state(P);
    if (game.hasFlag('doorOpened') || game.level.def.armed !== false) return '10:00';
    const s = Math.min(ph.clock, 10 * 3600 + 59 * 60);
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60);
    return hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function carrier(game) {
    if (game.level.def.armed !== false) return 'LINEAR · 5 bars';
    return game.hasFlag('doorAppeared') ? 'LINEAR' : 'MERIDIAN-CORP';
  }

  // ------------------------------------------------------------ messages
  const PHONE = (LM.phone = {});
  PHONE.send = function (game, id, text, opts) {
    const P = game.player;
    if (!P || !P.hasGadget('phone')) return;
    const ph = state(P);
    const info = THREADS[id] || { name: id, initials: id[0].toUpperCase(), color: '#3a3e46' };
    const th = (ph.threads[id] = ph.threads[id] || { id, msgs: [], unread: 0 });
    th.msgs.push({ from: 'them', text, time: clockText(game, P), replies: (opts && opts.replies) || null });
    th.unread++;
    ph.order = [id].concat(ph.order.filter((x) => x !== id));
    LM.audio.play('buzz');
    game.toast(info.name + ': ' + (text.length > 64 ? text.slice(0, 62) + '…' : text), 'phone');
    if (LM.ui.modalOpen && LM.ui.spec && LM.ui.spec.className === 'phone-panel') render(game);
  };
  PHONE.later = function (game, delay, id, text, opts) {
    const lvl = game.levelId;
    game.schedule(delay, () => {
      if (game.levelId === lvl) PHONE.send(game, id, text, opts);
    });
  };
  function reply(game, th, msg, r) {
    const P = game.player;
    msg.replies = null;
    th.msgs.push({ from: 'me', text: r.label, time: clockText(game, P) });
    LM.audio.play('ui');
    if (r.then) PHONE.later(game, r.then.delay || 2.5, th.id, r.then.text, r.then);
  }

  // ------------------------------------------------------------ the phone screen
  LM.ui.addStyles(`
    .panel.phone-panel { width: min(380px, 100%); border-radius: 30px; border-color: #2c3140; background: linear-gradient(180deg, #11141b, #0a0c11); }
    .panel.phone-panel::before, .panel.phone-panel::after { display: none; }
    .phone-panel header { text-align: center; padding-top: 16px; }
    .phone-panel header .kicker { color: #8f95a3; letter-spacing: 0.12em; }
    .phone-panel h2 { font: 600 44px/1 var(--font-ui); letter-spacing: -0.02em; margin-top: 4px; }
    .phone-panel .panel-body { padding: 12px 16px 4px; }
    .phone-panel footer { justify-content: center; }
    .ph-tabs { display: flex; gap: 4px; padding: 3px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 12px; }
    .ph-tab { flex: 1; position: relative; padding: 7px 0; border: 0; border-radius: 9px; background: transparent; color: #8f95a3; font: 600 10.5px/1 var(--font-ui); letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
    .ph-tab.on { background: #2a2f3c; color: #ebe4d4; }
    .ph-tab i { position: absolute; top: 3px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--hp); }
    .ph-list { display: grid; gap: 2px; min-height: 240px; align-content: start; }
    .ph-thread { display: grid; grid-template-columns: 34px minmax(0,1fr) auto; gap: 10px; align-items: center; padding: 8px; border: 0; border-radius: 12px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
    .ph-thread:hover { background: rgba(255,255,255,0.05); }
    .ph-thread .ph-av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font: 600 12px/1 var(--font-ui); color: #fff; white-space: nowrap; }
    .ph-thread strong { display: block; font: 600 13px/1.3 var(--font-ui); }
    .ph-thread span { display: block; font: 400 12px/1.35 var(--font-ui); color: #8f95a3; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .ph-thread em { font: 400 11px var(--font-ui); color: #8f95a3; font-style: normal; }
    .ph-thread.unread strong::after { content: ''; display: inline-block; width: 7px; height: 7px; margin-left: 6px; border-radius: 50%; background: #5cc8e8; vertical-align: middle; }
    .ph-convo { display: grid; gap: 6px; max-height: 300px; overflow-y: auto; padding: 4px 2px 8px; }
    .ph-back { justify-self: start; padding: 4px 0 8px; border: 0; background: none; color: #5cc8e8; font: 600 12px var(--font-ui); cursor: pointer; }
    .bubble { max-width: 80%; padding: 8px 12px; border-radius: 16px; font: 400 13.5px/1.4 var(--font-ui); }
    .bubble.them { justify-self: start; background: #232836; border-bottom-left-radius: 4px; }
    .bubble.me { justify-self: end; background: #2c6aa0; color: #fff; border-bottom-right-radius: 4px; }
    .bubble small { display: block; margin-top: 3px; font-size: 10px; color: rgba(235,228,212,0.45); }
    .ph-replies { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; margin-top: 6px; }
    .ph-replies button { padding: 6px 11px; border-radius: 14px; border: 1px solid #2c6aa0; background: transparent; color: #8fc4f0; font: 500 12px var(--font-ui); cursor: pointer; }
    .ph-empty { padding: 30px 10px; text-align: center; color: #8f95a3; font: 400 13px/1.5 var(--font-ui); }
    .ph-notes h4 { margin: 4px 0 6px; font: 600 10.5px/1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #8f95a3; }
    .ph-goal { padding: 12px 14px; margin-bottom: 14px; border-radius: 12px; background: #2a2414; color: #f4dc6c; font: italic 400 18px/1.35 var(--font-lore); }
    .ph-todo { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font: 400 13px/1.4 var(--font-ui); }
    .ph-todo li::before { content: '\\25a1'; margin-right: 8px; color: #8f95a3; }
    .ph-todo li.done { color: #6a7080; text-decoration: line-through; }
    .ph-todo li.done::before { content: '\\25a0'; }
    .ph-map { display: block; width: 100%; height: auto; border-radius: 12px; background: #07080b; }
    .ph-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
    .ph-photo { aspect-ratio: 1; max-width: 100%; border-radius: 6px; background: linear-gradient(135deg, #3a4050, #1a1d24); display: grid; align-content: end; padding: 5px; box-sizing: border-box; font: 400 9.5px/1.25 var(--font-ui); color: #d8d2c4; }
    .ph-photo.odd { background: radial-gradient(circle at 50% 40%, #0a0a0c 0 18%, #e8e8ea 19% 22%, #3a3e48 23%); }
    .ph-light { display: grid; justify-items: center; gap: 14px; padding: 18px 0 8px; }
    .ph-light button { width: 92px; height: 92px; border-radius: 50%; border: 1px solid #3a3e48; background: #1a1d24; color: #ebe4d4; font: 600 12px var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; }
    .ph-light button.on { background: #f4ecd0; color: #1a1610; box-shadow: 0 0 40px rgba(255,240,200,0.5); }
    .ph-light p { margin: 0; text-align: center; color: #8f95a3; font: 400 12.5px/1.5 var(--font-ui); max-width: 30ch; }
  `);

  function objective(game) {
    const f = (n) => game.hasFlag(n);
    if (game.level.def.armed !== false) return 'Find the stairs down. The status report can wait.';
    if (f('armed')) return 'Go down.';
    if (f('grandOpening')) return 'Take your seat.';
    if (f('doorOpened')) return 'Keep going.';
    if (f('doorAppeared')) return 'Check the west hall.';
    if (f('readNote')) return 'Find the Linear Conference room.';
    return 'Get to your desk.';
  }
  function todo(game) {
    const f = (n) => game.hasFlag(n);
    return [
      ['Status report for Dana (EOD)', false],
      ['Water the plant', f('wateredPlant')],
      ['Expense receipts from March', false],
      [f('tookSalmon') ? 'Find out who keeps taking lunches (it’s me)' : 'Find out who keeps taking lunches', f('tookSalmon')],
      ['Fire-safety module (mandatory)', false],
      ['Coffee', f('coffee')],
    ];
  }

  function drawMap(game) {
    const L = game.level, P = game.player;
    const W = 340, H = 230;
    return LM.ui.iconCanvas(W, H, (g) => {
      const s = Math.min((W - 16) / L.w, (H - 16) / L.h);
      const ox = (W - L.w * s) / 2, oy = (H - L.h * s) / 2;
      for (let y = 0; y < L.h; y++) {
        for (let x = 0; x < L.w; x++) {
          const i = y * L.w + x;
          if (!L.explored[i]) continue;
          const td = L.terrain[i];
          const c = td.mapColor || (td.solid ? '#6b6556' : 'rgba(205,190,160,0.2)');
          if (c === 'none') continue;
          g.fillStyle = c;
          g.fillRect(ox + x * s, oy + y * s, s + 0.3, s + 0.3);
        }
      }
      for (const it of game.items) {
        if (it.dead || !it.def.mapColor) continue;
        const i = Math.floor(it.y / T) * L.w + Math.floor(it.x / T);
        if (!L.explored[i]) continue;
        g.fillStyle = it.def.mapColor;
        g.beginPath();
        g.arc(ox + (it.x / T) * s, oy + (it.y / T) * s, 2, 0, U.TAU);
        g.fill();
      }
      g.save();
      g.translate(ox + (P.x / T) * s, oy + (P.y / T) * s);
      g.rotate(P.aim);
      g.fillStyle = '#5cc8e8';
      g.beginPath();
      g.moveTo(6, 0);
      g.lineTo(-4, 4);
      g.lineTo(-2, 0);
      g.lineTo(-4, -4);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = 'rgba(235,228,212,0.55)';
      g.font = '600 10px "IBM Plex Mono", monospace';
      g.fillText(game.level.def.armed === false ? 'FLOOR PLAN · 14' : 'GPS · NO FIX · SHOWING WHAT YOU’VE SEEN', 10, H - 8);
    });
  }

  function render(game) {
    const P = game.player, ph = state(P);
    const tabs = [['messages', 'Messages'], ['notes', 'Notes'], ['map', 'Map'], ['photos', 'Photos'], ['light', 'Light']];
    const bar = h('div', { class: 'ph-tabs' }, tabs.map(([id, label]) => {
      const b = h('button', { class: 'ph-tab' + (ph.tab === id ? ' on' : ''), type: 'button' }, label, id === 'messages' && unread(P) ? h('i') : null);
      b.addEventListener('click', () => {
        ph.tab = id;
        ph.open = null;
        LM.audio.play('ui');
        render(game);
      });
      return b;
    }));
    let content;
    if (ph.tab === 'messages') {
      if (ph.open && ph.threads[ph.open]) {
        const th = ph.threads[ph.open], info = THREADS[th.id] || { name: th.id };
        th.unread = 0;
        const backBtn = h('button', { class: 'ph-back', type: 'button' }, '‹ ' + info.name);
        backBtn.addEventListener('click', () => {
          ph.open = null;
          render(game);
        });
        const convo = h('div', { class: 'ph-convo' }, th.msgs.map((m) => h('div', { class: 'bubble ' + m.from }, m.text, h('small', null, m.time))));
        const last = th.msgs[th.msgs.length - 1];
        const replies = last && last.from === 'them' && last.replies
          ? h('div', { class: 'ph-replies' }, last.replies.map((r) => {
            const b = h('button', { type: 'button' }, r.label);
            b.addEventListener('click', () => {
              reply(game, th, last, r);
              render(game);
            });
            return b;
          }))
          : null;
        content = h('div', null, backBtn, convo, replies);
        setTimeout(() => (convo.scrollTop = convo.scrollHeight), 0);
      } else {
        content = ph.order.length
          ? h('div', { class: 'ph-list' }, ph.order.map((id) => {
            const th = ph.threads[id], info = THREADS[id] || { name: id, initials: '?', color: '#3a3e46' };
            const last = th.msgs[th.msgs.length - 1];
            const b = h('button', { class: 'ph-thread' + (th.unread ? ' unread' : ''), type: 'button' },
              h('span', { class: 'ph-av', style: 'background:' + info.color }, info.initials),
              h('span', null, h('strong', null, info.name), h('span', null, (last.from === 'me' ? 'You: ' : '') + last.text)),
              h('em', null, last.time));
            b.addEventListener('click', () => {
              ph.open = id;
              render(game);
            });
            return b;
          }))
          : h('div', { class: 'ph-empty' }, 'No messages. Enjoy it while it lasts.');
      }
    } else if (ph.tab === 'notes') {
      content = h('div', { class: 'ph-notes' },
        h('h4', null, 'Right now'), h('div', { class: 'ph-goal' }, objective(game)),
        h('h4', null, 'Today'), h('ul', { class: 'ph-todo' }, todo(game).map(([t, done]) => h('li', { class: done ? 'done' : '' }, t))),
        game.hasFlag('readNote') ? [h('h4', { style: 'margin-top:16px' }, 'Saved'), h('div', { class: 'sticky', style: 'font-size:17px;transform:rotate(1deg);margin:0' }, 'Meet in the Linear Conference room.')] : null);
    } else if (ph.tab === 'map') {
      content = drawMap(game);
      content.classList.add('ph-map');
    } else if (ph.tab === 'photos') {
      content = ph.photos.length
        ? h('div', { class: 'ph-photos' }, ph.photos.slice().reverse().map((p) => h('div', { class: 'ph-photo' + (p.odd ? ' odd' : '') }, p.caption)))
        : h('div', { class: 'ph-empty' }, 'No photos yet. Click to take one; the flash lights up the room for a moment.');
    } else {
      const btn = h('button', { class: ph.flashlight ? 'on' : '', type: 'button' }, ph.flashlight ? 'On' : 'Off');
      btn.addEventListener('click', () => {
        ph.flashlight = !ph.flashlight;
        P.statsDirty = true;
        LM.audio.play('switch');
        render(game);
      });
      content = h('div', { class: 'ph-light' }, btn, h('p', null, ph.flashlight ? 'The flashlight reaches farther than your eyes do. It eats the battery.' : 'Turn on the flashlight to see farther in the dark.'));
    }
    LM.ui.open({
      kicker: carrier(game) + '  ·  ' + Math.round(ph.battery) + '%',
      title: clockText(game, P),
      className: 'phone-panel',
      body: h('div', null, bar, content),
      actions: [{ label: 'Put it away', primary: true, key: 'F' }],
    });
  }

  // ------------------------------------------------------------ the gadget
  const DEFAULT_FLASH = ['Did you just take a picture of me?', 'Please don’t.', 'Was that a flash?', 'Delete that.', 'I wasn’t ready!'];
  const gadgets = {
    phone: {
      name: 'Phone', short: 'Phone', key: 'KeyF',
      hint: (game, P) => 'click: photo · F: open' + (unread(P) ? ' · ' + unread(P) + ' new' : ''),
      badge: (game, P) => unread(P),
      mods: (P) => (state(P).flashlight ? { lightRadius: 170 } : null),
      use(game, P) {
        LM.input.mouse.down = false;
        render(game);
      },
      update(game, P, dt) {
        const ph = state(P);
        ph.clock += dt;
        ph.drain += dt * (ph.flashlight ? 0.1 : 0.022);
        if (ph.drain >= 1) {
          ph.drain -= 1;
          ph.battery = Math.max(4, ph.battery - 1);
        }
        if (game.level.def.armed === false && !ph.late && ph.clock >= 10 * 3600 && !game.hasFlag('doorOpened')) {
          ph.late = true;
          PHONE.send(game, 'calendar', 'Meeting · now · Linear Conference Room. You are late.');
          PHONE.later(game, 4, 'unknown', 'We’ll wait.');
        }
      },
      primary(game, P) {
        const ph = state(P);
        P.gadgetCd = 1.1;
        game.flashT = 0.45;
        const fx = P.x + Math.cos(P.aim) * 12, fy = P.y + Math.sin(P.aim) * 12;
        game.lights.push({ x: fx, y: fy, r: 380, color: '#f4f8ff', intensity: 1, life: 0.3, max: 0.3 });
        game.particles.add({ type: 'flash', x: fx, y: fy, life: 0.12, size: 30, color: '#ffffff' });
        LM.audio.play('shutter');
        let figure = false;
        for (const n of game.npcs) {
          const d = U.dist(n.x, n.y, P.x, P.y);
          if (n.def.onFlash && n.seeLos && d < 460) {
            n.def.onFlash(n, game);
            if (n.def.spectral) figure = true;
          } else if (!n.def.spectral && n.seeLos && d < 170 && !n.bubble) n.say(U.pick(n.def.flashBarks || DEFAULT_FLASH), 2.6);
        }
        const room = game.level.roomAt(P.x, P.y);
        ph.photos.push({ caption: figure ? 'Someone is standing in this one.' : (room ? room.name : game.level.name), odd: figure });
        if (ph.photos.length > 24) ph.photos.shift();
      },
      drawHeld(g, P, game, t) {
        g.fillStyle = '#121216';
        G.roundRect(g, 6, -3.2, 5, 6.4, 1);
        g.fill();
        g.fillStyle = '#26324a';
        g.fillRect(6.6, -2.6, 3.8, 5.2);
      },
      drawGlow(g, P, game, t) {
        G.glow(g, 8.5, 0, 9, '#9ac8ff', 0.45);
        if (state(P).flashlight) G.glow(g, 11, 0, 7, '#fff8e0', 0.9);
      },
      drawIcon(g, W, H) {
        const cx = W / 2, cy = H / 2;
        g.fillStyle = '#1a1c22';
        G.roundRect(g, cx - 11, cy - 17, 22, 34, 4);
        g.fill();
        const grd = g.createLinearGradient(0, cy - 14, 0, cy + 14);
        grd.addColorStop(0, '#3a6aa0');
        grd.addColorStop(1, '#1a2a44');
        g.fillStyle = grd;
        G.roundRect(g, cx - 9, cy - 14, 18, 27, 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.fillRect(cx - 6, cy - 9, 12, 2);
        g.fillRect(cx - 6, cy - 5, 8, 2);
      },
    },
  };

  // ------------------------------------------------------------ trap effect + sounds
  const effects = {
    phone: {
      run(game, ef) {
        PHONE.send(game, ef.thread || 'unknown', ef.text, ef);
      },
    },
  };
  LM.audio.define('buzz', (t, o, opt, kit) => {
    kit.tone(t, o, { type: 'sine', f0: 170, dur: 0.12, gain: 0.22 });
    kit.tone(t + 0.18, o, { type: 'sine', f0: 170, dur: 0.12, gain: 0.22 });
    kit.tone(t + 0.02, o, { type: 'triangle', f0: 1320, dur: 0.08, gain: 0.05 });
  });
  LM.audio.define('shutter', (t, o, opt, kit) => {
    kit.noise(t, o, { type: 'highpass', freq: 3000, dur: 0.04, gain: 0.25 });
    kit.noise(t + 0.07, o, { type: 'highpass', freq: 2400, dur: 0.05, gain: 0.2 });
  });

  // ------------------------------------------------------------ the phone keeps buzzing all the way down
  LM.on('levelLoaded', (game) => {
    const P = game.player;
    if (!P || game.attract || !P.hasGadget('phone')) return;
    const id = game.levelId, f = (n) => game.hasFlag(n);
    const once = (key, fn) => {
      const ph = state(P);
      ph.seen = ph.seen || {};
      if (ph.seen[key]) return;
      ph.seen[key] = true;
      fn();
    };
    if (id === 'sunken-cloister') {
      once('l1', () => {
        PHONE.later(game, 5, 'unknown', 'Welcome. Please find your seat. The agenda is long.');
        PHONE.later(game, 16, 'dana', 'hey are you in the 10:00?? I can’t find the room either lol', {
          replies: [
            { label: 'I think I found it.', then: { text: 'amazing!! save me a seat. and the status report :)' } },
            { label: 'Dana, I’m somewhere very wrong.', then: { text: 'aren’t we all lol. status report?' } },
          ],
        });
      });
    } else if (id === 'ember-foundry') {
      once('l2', () => {
        PHONE.later(game, 6, 'team', f('tookSalmon') ? 'Priya: update, someone took GARY’S salmon. Gary is beside himself. I am thriving.' : 'Priya: someone ate my leftover samosas. GARY.');
        PHONE.later(game, 24, 'dana', 'status report??', { replies: [{ label: 'It’s really hot down here.', then: { text: 'love that energy. EOD!' } }] });
      });
    } else if (id === 'gilded-reliquary') {
      once('l3', () => {
        PHONE.later(game, 5, 'unknown', 'The Keeper is expecting you. Do not keep the Keeper waiting.');
        PHONE.later(game, 20, 'dana', 'Just saw your calendar says “Busy: Linear”. Love the initiative!! Status report though?');
        PHONE.later(game, 40, 'mom', 'Call me when you get a chance. I had a dream you were in a big church with no windows. Silly. Love you.');
      });
    }
  });
  // if a run reaches the maze with no weapon (say, the attendee's pistol was left behind), the maze provides
  LM.on('levelLoaded', (game) => {
    const P = game.player;
    if (!P || game.attract || game.level.def.armed === false || P.weapons.length) return;
    P.giveWeapon('pistol', game);
    game.toast('Your hand closes around a pistol you don’t remember picking up.', 'warn');
  });

  LM.definePack({ id: 'office', gadgets, effects });
})();
