/* Linear Maze Editor — js/views/player.js
 * The player at the start of a new run: base stats, ammunition capacity and the
 * starting kit (weapons, ammo, gold, armor, blessings, gadgets, story flags).
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const F = () => ED.forms, SC = () => ED.schemas, M = () => ED.model;

  ED.views.player = {
    title: 'Player',
    render(el) {
      const p = M().player();
      const commit = ED.pendingCommit(() => M().setPlayer(p), 300);
      const page = h('div', { class: 'page' });
      el.appendChild(page);
      page.appendChild(h('div', { class: 'page-head' }, h('h1', null, 'The player'), h('div', { class: 'actions' },
        M().edits().player ? h('button', { class: 'btn small quiet', on: { click: async () => { if (await ED.confirm('Back to the original player?', 'Base stats, ammunition capacity and the starting kit go back to the engine’s.', 'Go back')) { M().setPlayer({}); ED.rerender(); } } } }, 'Back to original') : null)));
      const first = M().levelOrder()[0];
      page.appendChild(h('div', { class: 'detail-head' }, playerPreview(p), h('div', { class: 'titles' },
        h('p', null, 'Everything here applies when a new run starts. Armor, blessings and gadgets the player picks up still add to these stats during the run.'),
        loadoutNote())));

      // base stats
      const stats = h('fieldset', null, h('legend', null, 'Base stats'));
      for (const [k, label, , step] of SC().STATS) {
        const base = ED.engine.basePlayer[k];
        stats.appendChild(F().field(label, F().number(p.base[k], (v) => { p.base[k] = v == null ? base : v; commit(); }, { step: step || 1 }), p.base[k] !== base ? 'Original: ' + base : ''));
      }
      stats.appendChild(h('p', { class: 'hint' }, 'The engine keeps speed at 90 or more, damage reduction at 0.75 or less, and the dash cooldown at 0.3 seconds or more.'));

      const ammo = h('fieldset', null, h('legend', null, 'Ammunition capacity'));
      for (const a of SC().AMMO) ammo.appendChild(F().field((ED.engine.LM.AMMO_NAMES[a] || a) + ' (' + a + ')', F().number(p.ammoMax[a], (v) => { p.ammoMax[a] = v == null ? ED.engine.baseAmmoMax[a] : v; commit(); }, { min: 0 })));

      const s = p.start;
      const kit = h('fieldset', null, h('legend', null, 'Starting kit'));
      const setS = (k) => (v) => {
        if (v === undefined || (Array.isArray(v) && !v.length && k !== 'weapons')) delete s[k];
        else s[k] = v;
        commit();
      };
      kit.appendChild(F().field('Weapons', h('div', null,
        F().bool(s.weapons != null, (on) => { if (on) s.weapons = ['pistol']; else delete s.weapons; commit(); ED.rerender(); }, 'Choose the starting weapons'),
        s.weapons != null ? F().ids('weapons', s.weapons, (v) => { s.weapons = v; commit(); }) : h('p', { class: 'muted' }, 'The engine’s default: the Service Pistol.'))));
      const ammoBox = h('div', { class: 'subform' });
      for (const a of SC().AMMO) ammoBox.appendChild(F().field(a, F().number((s.ammo || {})[a], (v) => {
        s.ammo = Object.assign({}, s.ammo || {});
        if (v) s.ammo[a] = v;
        else delete s.ammo[a];
        if (!Object.keys(s.ammo).length) delete s.ammo;
        commit();
      }, { min: 0, placeholder: '0' })));
      kit.appendChild(F().field('Ammunition', ammoBox));
      kit.appendChild(F().field('Gold', F().number(s.gold, setS('gold'), { min: 0, placeholder: '0' })));
      const equip = h('div', { class: 'subform' });
      for (const slot of SC().SLOTS) equip.appendChild(F().field(slot, F().idSelect('armor', (s.equip || {})[slot], (v) => {
        s.equip = Object.assign({}, s.equip || {});
        if (v) s.equip[slot] = v;
        else delete s.equip[slot];
        if (!Object.keys(s.equip).length) delete s.equip;
        commit();
      }, { allowEmpty: true, emptyLabel: '(nothing)', filter: (id) => M().raw('armor', id).slot === slot })));
      kit.appendChild(F().field('Wearing', equip));
      kit.appendChild(F().field('In the pack', F().ids('armor', s.bag || [], setS('bag'), { allowRepeat: true })));
      kit.appendChild(F().field('Blessings', F().ids('blessings', s.blessings || [], setS('blessings'), { allowRepeat: true })));
      kit.appendChild(F().field('Gadgets', F().ids('gadgets', s.gadgets || [], setS('gadgets'))));
      kit.appendChild(F().field('Story flags already set', F().text((s.flags || []).join(', '), (v) => setS('flags')(v.split(/[,\s]+/).filter(Boolean)), { mono: true, placeholder: 'readNote, coffee' }), 'For testing later floors: flags the run starts with.'));
      kit.appendChild(F().field('Body radius', F().number(s.radius, setS('radius'), { placeholder: '10', min: 4, max: 20 })));
      page.append(stats, ammo, kit);

      function loadoutNote() {
        if (!first) return null;
        const L = M().raw('levels', first);
        if (!L.loadout) return h('p', { class: 'muted' }, 'A new run starts on ' + M().floorLabel(first) + ': ' + L.name + '.');
        const lo = L.loadout;
        const bits = [];
        if (lo.weapons) bits.push(lo.weapons.length ? 'weapons ' + lo.weapons.join(', ') : 'no weapons');
        if (lo.gadgets) bits.push('gadgets ' + (lo.gadgets.join(', ') || 'none'));
        if (lo.gold != null) bits.push(lo.gold + ' gold');
        return h('p', { class: 'note' }, 'A new run starts on ' + L.name + ', which has its own loadout (' + bits.join('; ') + '). That replaces the weapons, gadgets and gold below for runs that start there. ',
          h('a', { href: '#/map/' + encodeURIComponent(first) + '/settings' }, 'Change that floor’s loadout'), '.');
      }
    },
  };

  function playerPreview(p) {
    const LM = ED.engine.LM;
    const size = 150;
    const c = h('canvas', { class: 'preview' });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = size * dpr;
    c.style.width = c.style.height = size + 'px';
    const g = c.getContext('2d');
    const game = ED.engine.fakeGame(null);
    game.level = ED.engine.stubLevel(ED.preview.defaultEnv());
    const floor = ED.preview.floorPattern();
    const draw = () => {
      if (!c.isConnected) return;
      const P = new LM.Player(null);
      const s = M().player().start;
      if (s.weapons) P.weapons = s.weapons.filter((w) => LM.find('weapons', w));
      if (s.equip) Object.assign(P.equip, s.equip);
      P.x = 0;
      P.y = 0;
      const t = performance.now() / 1000;
      P.aim = Math.sin(t * 0.7) * 0.8;
      P.walk = t * 4;
      P.vx = 60;
      P.r = s.radius || 10;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 0.5;
      g.fillStyle = g.createPattern(floor, 'repeat');
      g.fillRect(0, 0, c.width, c.height);
      g.globalAlpha = 1;
      g.setTransform(dpr * 4, 0, 0, dpr * 4, c.width / 2, c.height / 2);
      try {
        P.drawShadow(g);
        P.draw(g, game, t);
      } catch (e) {}
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return c;
  }
})();
