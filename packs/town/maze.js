/* The Linear Maze — packs/town/maze.js
 * Town pack, part 6: the Maze of Forking Paths.
 *
 *   canopic-jar     get close and organs jump out (props.count, default 2). Shoot it first and it
 *                   just breaks, safely.
 *   sarcophagus     open it: the STONE KEY (opens door-stone)
 *   stone-coffin    a catacomb coffin: a skeleton climbs out when you come near
 *   sphinx          one of the two statues at the Sphinx Gate. Talk to it: a riddle. The right answer
 *                   opens the gate (terrain tagged props.gate becomes floor); a wrong one hurts
 *                   (props.damage) and the gate stays shut. TOWN.RIDDLE has the words.
 *   fire-jet        on a wall: breathes fire along the floor on a timer (props.on, props.off seconds,
 *                   props.offset, props.len tiles)
 *   rockfall        invisible: while you're inside props.rect [x, y, w, h], rocks fall where you're
 *                   going, every props.every seconds. They shatter.
 *   spike-wall      a wall of spikes (props.dir: the way it slides, props.len tiles). Stepping on a
 *                   red-tile tagged props.trigger sends it across, pushing and hurting you.
 *   chalice         the Chalice of Life or Death: two cups (props.side 0/1). One heals, one poisons;
 *                   which is which changes every visit. Smell it twice to tell.
 *   maze-merchant   (NPC) sells for gold: a health vial, a medkit, Bone Armor, shells, and the answer
 *                   to the riddle
 * Flags: stoneKey, riddleSolved, riddleBought, mazeDone (set when you leave by the exit)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const h = (...a) => LM.ui.h(...a);
  const TOWN = (LM.TOWN = LM.TOWN || {});
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);
  const think = (game, text) => LM.think(game, text);

  TOWN.RIDDLE = {
    text: '“In the garden of forking paths every road is taken, and every road is not. I am spent by walking and by standing still. I am the thing the sundial measures and cannot keep. What am I?”',
    choices: ['Time', 'A shadow', 'Footsteps', 'A map'],
    answer: 'Time',
    wrong: 'The sphinx’s eyes grind open. “No.” The floor beneath you bucks; something heavy and invisible strikes you. The gate stays shut.',
    right: 'The sphinx closes its eyes. “Yes.” Stone grinds on stone, and the gate between the statues sinks into the floor.',
    sold: 'The merchant leans close and whispers: “The sphinx always asks about the same thing. The answer is Time. It is always Time.”',
  };

  // ------------------------------------------------------------ items
  const items = {
    'canopic-jar': {
      name: 'Canopic jar', dressing: false, radius: 8, solid: true, mapColor: '#c8a06a',
      destructible: {
        hp: 1,
        onBreak(it, game) {
          game.particles.burst(it.x, it.y, 14, { type: 'chunk', color: '#b08a5a', speed: 120, life: 0.6, size: 1.6, vz: 70, z: 2 });
          LM.audio.play('break', { vol: game.vol(it.x, it.y) });
        },
      },
      update(it, dt, game) {
        const P = game.player;
        if (it.dead || !P || P.dead) return;
        if (U.dist(P.x, P.y, it.x, it.y) > 46) return;
        // too close: the lid pops and what was inside comes out
        it.dead = true;
        LM.audio.play('break', { vol: game.vol(it.x, it.y) });
        game.particles.burst(it.x, it.y, 16, { type: 'chunk', color: '#b08a5a', speed: 140, life: 0.6, size: 1.6, vz: 90, z: 2 });
        for (let i = 0; i < (it.props.count || 2); i++) game.spawnEnemy('organ', it.x + U.rand(-6, 6), it.y + U.rand(-6, 6), { aggro: true, summoned: true });
        if (!game.hasFlag('jarWarned')) {
          game.setFlag('jarWarned');
          game.schedule(0.8, () => think(game, 'Organs. There were organs in the jar. Next time, shoot the jar first.'));
        }
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.ellipse(2, 3, 7, 5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#b08a5a';
        g.beginPath();
        g.arc(0, 0, 6.5, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#2a6a7a';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(0, 0, 4.6, 0, U.TAU);
        g.stroke();
        // the lid: a little animal head
        const k = ['#3a2a1a', '#c8a050', '#8a8a8a', '#c86a3a'][(it.tx + it.ty) % 4];
        g.fillStyle = k;
        g.beginPath();
        g.arc(0, 0, 3, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1a1410';
        g.fillRect(-1.6, -1, 1, 1);
        g.fillRect(0.6, -1, 1, 1);
      },
    },
    sarcophagus: {
      name: 'Sarcophagus', dressing: 'Furniture', radius: 18, solid: 'rect', mapColor: '#d8b878', mapAlways: true,
      init(it) {
        it.box = [56, 26];
        it.x += T / 2;
      },
      interact: {
        available: (it) => !it.used,
        prompt: 'Open the sarcophagus',
        use(it, game) {
          it.used = true;
          game.player.keys.add('stone');
          game.setFlag('stoneKey');
          LM.audio.play('key');
          game.addShake(0.3);
          game.particles.burst(it.x, it.y, 30, { type: 'smoke', color: '#c8b08a', speed: 60, life: 1.2, size: 4, alpha: 0.35 });
          LM.ui.showText('The sarcophagus', 'The lid slides aside with a sound like a long breath. Inside: linen, dust, and a smell of old spice. No one. Where a heart should rest there is a key of carved stone, heavy and warm.\n\nYou take the STONE KEY.', 'Found');
        },
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(-26, -10, 56, 26);
        g.fillStyle = '#8a6a3e';
        g.fillRect(-28, -13, 56, 26);
        g.fillStyle = it.used ? '#2a2016' : '#c8a46a';
        g.fillRect(-25, -10, 50, 20);
        if (!it.used) {
          g.fillStyle = '#2a6a7a';
          g.fillRect(-25, -2, 50, 4);
          g.fillStyle = '#e8c070';
          g.beginPath();
          g.ellipse(-16, 0, 6, 7, 0, 0, U.TAU);
          g.fill();
          g.fillStyle = '#1a1410';
          g.fillRect(-18, -2, 1.4, 1.4);
          g.fillRect(-15, -2, 1.4, 1.4);
        } else {
          g.fillStyle = '#c8a46a';
          g.save();
          g.rotate(0.25);
          g.fillRect(-20, 10, 48, 8);
          g.restore();
        }
      },
      drawGlow(g, it, t) {
        if (!it.used) G.glow(g, 0, 0, 30, '#e8c070', 0.2 + 0.08 * Math.sin(t * 2));
      },
    },
    'stone-coffin': {
      name: 'Catacomb coffin', dressing: false, radius: 10, solid: 'rect',
      init(it) {
        it.box = [16, 28];
      },
      update(it, dt, game) {
        const P = game.player;
        if (it.opened || !P || P.dead) return;
        if (U.dist(P.x, P.y, it.x, it.y) > 74) return;
        it.opened = true;
        LM.audio.play('break', { vol: game.vol(it.x, it.y) });
        game.particles.burst(it.x, it.y, 10, { type: 'smoke', color: '#8a8070', speed: 40, life: 0.8, size: 3, alpha: 0.35 });
        const ox = it.props.out === 'w' ? -22 : 22;
        game.spawnEnemy(it.props.enemy || 'skeleton', it.x + ox, it.y, { aggro: true, summoned: true });
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.fillRect(-7, -12, 16, 28);
        g.fillStyle = '#6a5a48';
        g.fillRect(-8, -14, 16, 28);
        if (it.opened) {
          g.fillStyle = '#1a140e';
          g.fillRect(-6, -12, 12, 24);
        } else {
          g.fillStyle = '#7a6a58';
          g.fillRect(-6, -12, 12, 24);
          g.strokeStyle = '#4a3a28';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(0, -10);
          g.lineTo(0, 10);
          g.moveTo(-4, -4);
          g.lineTo(4, -4);
          g.stroke();
        }
      },
    },
    sphinx: {
      name: 'Sphinx', dressing: false, radius: 16, reach: 30, solid: 'rect', mapColor: '#c8a46a', mapAlways: true,
      init(it) {
        it.box = [28, 28];
      },
      interact: {
        available: (it, game) => !game.hasFlag('riddleSolved'),
        prompt: 'Answer the sphinx',
        use: (it, game) => riddle(game, it),
      },
      draw(g, it, t, game) {
        const flip = it.props.flip ? -1 : 1;
        g.scale(flip, 1);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(-12, -12, 28, 30);
        g.fillStyle = '#8a6a3e';
        g.fillRect(-14, -14, 28, 30);
        g.fillStyle = '#c8a46a';
        // a lion's body lying down, a human head watching the gate
        g.beginPath();
        g.ellipse(0, 6, 11, 14, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d8b878';
        g.beginPath();
        g.arc(0, -10, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a6a7a';
        g.fillRect(-7, -14, 14, 3);
        g.fillRect(-8, -12, 2, 9);
        g.fillRect(6, -12, 2, 9);
      },
      drawGlow(g, it, t, game) {
        if (game && game.hasFlag('riddleSolved')) return;
        G.glow(g, (it.props.flip ? 1 : -1) * 2.5, -10, 6, '#7ae8ff', 0.5 + 0.3 * Math.sin(t * 2));
        G.glow(g, (it.props.flip ? -1 : 1) * 2.5, -10, 6, '#7ae8ff', 0.5 + 0.3 * Math.sin(t * 2));
      },
    },
    'fire-jet': {
      name: 'Fire jet', dressing: false, radius: 6, wallMounted: true, shadow: false,
      update(it, dt, game) {
        const p = it.props, on = p.on || 1.4, cyc = on + (p.off || 2.2);
        const off = p.offset == null ? (it.tx + it.ty) * 0.9 : p.offset; // neighbours take turns
        const ph = (((game.time + off) % cyc) + cyc) % cyc;
        it.warn = ph > cyc - 0.6;
        it.burning = ph < on;
        if (!it.burning) return;
        // how far the flame reaches: up to len tiles, stopping at walls
        if (it.reach == null) {
          const L = game.level;
          let n = 0;
          const tx = it.tx, ty = it.ty; // the wall tile it's mounted on
          while (n < (p.len || 4) && !L.solidAt(tx + it.face.x * (n + 1), ty + it.face.y * (n + 1))) n++;
          it.reach = n * T + 4;
        }
        if (Math.random() < 0.7) {
          const d = Math.random() * it.reach;
          game.particles.add({ type: 'ember', x: it.x + it.face.x * d + U.rand(-6, 6), y: it.y + it.face.y * d + U.rand(-6, 6), vx: it.face.x * 120, vy: it.face.y * 120 - 20, life: 0.4, size: 1.6, color: U.pick(['#ff8a2a', '#ffd04a', '#ff4a1a']) });
        }
        const P = game.player;
        if (!P || P.dead) return;
        const rx = P.x - it.x, ry = P.y - it.y, along = rx * it.face.x + ry * it.face.y, across = Math.abs(rx * it.face.y - ry * it.face.x);
        it.cd = (it.cd || 0) - dt;
        if (along > 0 && along < it.reach && across < 14 + P.r && it.cd <= 0) {
          it.cd = 0.45;
          LM.combat.hurt(game, P, p.damage || 12, { source: 'hazard', type: 'hazard' });
        }
      },
      draw(g, it) {
        g.rotate(wallRot(it));
        g.fillStyle = '#3a2a1a';
        g.fillRect(-1, -6, 5, 12);
        g.fillStyle = it.warn ? '#ff6a2a' : '#1a1410';
        g.beginPath();
        g.arc(3, 0, 2.6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (!it.burning || !it.reach) {
          if (it.warn) G.glow(g, it.face.x * 4, it.face.y * 4, 12, '#ff6a2a', 0.5);
          return;
        }
        g.save();
        g.rotate(wallRot(it));
        const len = it.reach;
        const grd = g.createLinearGradient(0, 0, len, 0);
        grd.addColorStop(0, 'rgba(255,240,180,0.95)');
        grd.addColorStop(0.4, 'rgba(255,140,40,0.75)');
        grd.addColorStop(1, 'rgba(255,60,20,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(2, -4);
        g.lineTo(len, -12 - Math.sin(t * 30) * 2);
        g.lineTo(len, 12 + Math.sin(t * 27) * 2);
        g.lineTo(2, 4);
        g.closePath();
        g.fill();
        g.restore();
      },
      light: { color: '#ff8a3a', radius: 110, intensity: 0.35, flicker: 0.5 },
    },
    rockfall: {
      name: 'Falling rocks (zone)', dressing: false, radius: 1, shadow: false,
      update(it, dt, game) {
        const P = game.player, r = it.props.rect;
        if (!P || P.dead || !r) return;
        const inside = P.x >= r[0] * T && P.x < (r[0] + r[2]) * T && P.y >= r[1] * T && P.y < (r[1] + r[3]) * T;
        it.rocks = (it.rocks || []).filter((k) => {
          k.t += dt;
          if (k.t < k.fall) return true;
          // it lands, and shatters
          game.addShake(0.2);
          LM.audio.play('break', { vol: game.vol(k.x, k.y) });
          game.particles.burst(k.x, k.y, 16, { type: 'chunk', color: '#9a7a4a', speed: 150, life: 0.6, size: 1.8, vz: 80, z: 2 });
          if (U.dist(P.x, P.y, k.x, k.y) < 22 + P.r) LM.combat.hurt(game, P, it.props.damage || 16, { source: 'hazard', type: 'hazard' });
          return false;
        });
        if (!inside) return;
        if (!it.warned) {
          it.warned = true;
          game.toast('Dust sifts down from the ceiling. Keep moving.', 'warn');
        }
        it.t2 = (it.t2 || 0.6) - dt;
        if (it.t2 > 0) return;
        it.t2 = it.props.every || 0.9;
        // where you'll be in a moment
        const x = P.x + P.vx * 0.55 + U.rand(-10, 10), y = P.y + P.vy * 0.55 + U.rand(-10, 10);
        if (!game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) it.rocks.push({ x, y, t: 0, fall: 0.85 });
      },
      drawGlow(g, it) {
        for (const k of it.rocks || []) {
          const q = k.t / k.fall;
          g.fillStyle = 'rgba(0,0,0,' + (0.15 + q * 0.4) + ')';
          g.beginPath();
          g.arc(k.x - it.x, k.y - it.y, 6 + q * 14, 0, U.TAU);
          g.fill();
          if (q > 0.6) {
            g.fillStyle = '#8a6a3e';
            g.beginPath();
            g.arc(k.x - it.x, k.y - it.y - (1 - q) * 120, 9, 0, U.TAU);
            g.fill();
          }
        }
      },
    },
    'spike-wall': {
      name: 'Spike wall', dressing: false, radius: 14, solid: 'rect', mapColor: '#8a3a2a',
      init(it) {
        const d = it.props.dir || 'e';
        it.dir = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] }[d];
        it.home = { x: it.x, y: it.y };
        it.box = it.dir[0] ? [12, T * 3 - 2] : [T * 3 - 2, 12];
        it.slide = 0; // 0 home .. 1 fully across
        it.state = 'home';
      },
      update(it, dt, game) {
        const P = game.player;
        if (!P) return;
        const len = (it.props.len || 6) * T;
        if (it.state === 'home') {
          const tiles = game.level.tags[it.props.trigger] || [];
          const ptx = Math.floor(P.x / T), pty = Math.floor(P.y / T);
          if (tiles.some((p) => p.x === ptx && p.y === pty)) {
            it.state = 'go';
            LM.audio.play('charge');
            game.addShake(0.2);
          }
          return;
        }
        const pushing = it.state === 'go'; // (still pushing on the frame it arrives)
        if (it.state === 'go') {
          it.slide = Math.min(1, it.slide + dt * 2.4);
          if (it.slide >= 1) {
            it.state = 'back';
            it.wait = 0.8;
          }
        } else if (it.state === 'back') {
          it.wait -= dt;
          if (it.wait <= 0) it.slide = Math.max(0, it.slide - dt * 0.6);
          if (it.slide <= 0 && it.wait <= 0) it.state = 'home';
        }
        it.x = it.home.x + it.dir[0] * len * it.slide;
        it.y = it.home.y + it.dir[1] * len * it.slide;
        if (pushing) {
          // anything in front of the wall is carried along by it
          const b = it.getRect(), [dx, dy] = it.dir;
          const across = dx ? P.y > b.y0 - P.r && P.y < b.y1 + P.r : P.x > b.x0 - P.r && P.x < b.x1 + P.r;
          const front = dx > 0 ? b.x1 : dx < 0 ? b.x0 : dy > 0 ? b.y1 : b.y0;
          const pos = dx ? P.x : P.y, back = dx > 0 ? b.x0 : dx < 0 ? b.x1 : dy > 0 ? b.y0 : b.y1;
          const s = dx || dy;
          const caught = across && (pos - front) * s < P.r + 2 && (pos - back) * s > -P.r;
          it.cd = (it.cd || 0) - dt;
          if (caught) {
            if (dx) P.x = front + s * (P.r + 1);
            else P.y = front + s * (P.r + 1);
            if (it.cd <= 0) {
              it.cd = 0.4;
              LM.combat.hurt(game, P, it.props.damage || 14, { source: 'hazard', type: 'hazard' });
            }
          }
        }
      },
      draw(g, it) {
        const vert = !!it.dir[0];
        g.save();
        if (!vert) g.rotate(Math.PI / 2);
        const H = T * 3 - 2;
        g.fillStyle = '#4a3a2a';
        g.fillRect(-6, -H / 2, 12, H);
        g.fillStyle = '#9a9aa2';
        const s = (it.dir[0] || it.dir[1]) > 0 ? 1 : -1;
        for (let i = 0; i < 9; i++) {
          const y = -H / 2 + 5 + i * ((H - 10) / 8);
          g.beginPath();
          g.moveTo(6 * s, y - 3);
          g.lineTo(13 * s, y);
          g.lineTo(6 * s, y + 3);
          g.fill();
        }
        g.restore();
      },
    },
    chalice: {
      name: 'Chalice', dressing: false, radius: 9, solid: true, mapColor: '#e8c060',
      interact: {
        available: (it) => !it.drunk,
        prompt: 'Pick up the cup',
        use: (it, game) => chalice(game, it),
      },
      draw(g, it) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.arc(2, 3, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = it.props.side ? '#c8c0b0' : '#e8c060';
        g.beginPath();
        g.arc(0, 0, 6.5, 0, U.TAU);
        g.fill();
        g.fillStyle = it.drunk ? '#3a3028' : it.props.side ? '#3a6a3a' : '#7a1a2a';
        g.beginPath();
        g.arc(0, 0, 4.5, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, it, t) {
        if (!it.drunk) G.glow(g, 0, 0, 14, '#ffe8a0', 0.25 + 0.1 * Math.sin(t * 2 + it.tx));
      },
    },
  };

  // ------------------------------------------------------------ the riddle
  function riddle(game, it) {
    const R = TOWN.RIDDLE, P = game.player;
    if (game.hasFlag('riddleSolved')) return;
    LM.ui.open({
      kicker: 'The Sphinx Gate', title: 'The sphinx speaks',
      body: h('div', { class: 'lore-block' }, h('p', { class: 'lore' }, R.text)),
      actions: R.choices.map((c) => ({ label: c, onClick: () => {
        if (c === R.answer) {
          game.setFlag('riddleSolved');
          for (const p of game.level.tags[it.props.gate || 'sphinxGate'] || []) game.setTerrain(p.x, p.y, 'floor', 'sphinxGate');
          LM.audio.play('altar');
          game.addShake(0.4);
          setTimeout(() => LM.ui.showText('The sphinx', R.right, 'The Sphinx Gate'), 0);
        } else {
          LM.combat.hurt(game, P, it.props.damage || 22, { source: 'hazard', type: 'hazard' });
          LM.audio.play('locked');
          setTimeout(() => LM.ui.showText('The sphinx', R.wrong, 'The Sphinx Gate'), 0);
        }
      } })).concat([{ label: 'Say nothing', quiet: true }]),
    });
  }

  // ------------------------------------------------------------ the Chalice of Life or Death
  function chalice(game, it) {
    it.sniffs = it.sniffs || 0;
    const smell = it.sniffs === 0 ? 'I’m not sure.' : it.poison ? 'This smells like poison.' : 'This smells good!';
    LM.ui.open({
      kicker: 'The Chalice of Life or Death', title: it.props.side ? 'The silver cup' : 'The golden cup',
      body: h('div', { class: 'lore-block' },
        h('p', { class: 'lore' }, 'Two cups on the altar, filled to the brim. A line cut in the stone: ONE FOR LIFE. ONE FOR DEATH. CHOOSE.'),
        h('p', { class: 'lore', style: 'color:var(--brass)' }, 'You smell it. ' + smell),
        h('p', { class: 'lore' }, 'Drink?')),
      actions: [
        { label: 'Drink', primary: true, onClick: () => drink(game, it) },
        { label: 'Smell it again', onClick: () => setTimeout(() => chalice(game, it), 0) },
        { label: 'Put it down', quiet: true },
      ],
    });
    it.sniffs++;
  }
  function drink(game, it) {
    const P = game.player;
    it.drunk = true;
    if (it.poison) {
      LM.combat.hurt(game, P, 35, { source: 'hazard', type: 'hazard' });
      game.toast('Poison! It burns all the way down.', 'warn');
    } else {
      LM.combat.heal(game, P, 100);
      LM.audio.play('heal');
      game.toast('It tastes like the first sip of coffee on a good morning. You feel whole.', 'good');
    }
  }
  // one cup heals and one poisons, and which is which changes every visit
  LM.on('levelLoaded', (game) => {
    const cups = game.items.filter((i) => i.def.id === 'chalice');
    if (!cups.length) return;
    const bad = Math.floor(Math.random() * cups.length);
    cups.forEach((c, i) => (c.poison = i === bad));
  });

  // ------------------------------------------------------------ the Cloaked Merchant
  const STOCK = [
    { id: 'vial', label: 'Health vial', price: 15, give: (game) => game.grant({ type: 'item', id: 'health-vial' }, game.player) },
    { id: 'medkit', label: 'Medical kit', price: 40, give: (game) => game.grant({ type: 'item', id: 'medkit' }, game.player) },
    { id: 'shells', label: 'Shells (12)', price: 20, give: (game) => game.grant({ type: 'ammo', ammo: 'shells', amount: 12 }) },
    { id: 'armor', label: 'Bone Armor (+50, wears away)', price: 60, give: (game) => TOWN.wearBoneArmor(game) },
    { id: 'riddle', label: 'The answer to a riddle', price: 30, once: true, give: (game) => { game.setFlag('riddleBought'); setTimeout(() => LM.ui.showText('The Cloaked Merchant', TOWN.RIDDLE.sold, 'Whispered'), 0); } },
  ];
  TOWN.STOCK = STOCK;
  function shopOptions(game) {
    const P = game.player;
    return STOCK.filter((s) => !(s.once && game.hasFlag('riddleBought') && s.id === 'riddle')).map((s) => ({
      id: 'buy-' + s.id,
      label: s.label + ' · ' + s.price + ' gold' + (P.gold < s.price ? ' (not enough)' : ''),
      next: 'shop',
      do: (g) => {
        if (g.player.gold < s.price) {
          LM.audio.play('locked');
          g.toast('“Gold first, traveler.”', 'warn');
          return;
        }
        g.player.gold -= s.price;
        LM.audio.play('coin');
        s.give(g);
      },
    })).concat([{ label: 'Nothing, thanks.', end: true }]);
  }
  const npcs = {
    'maze-merchant': {
      name: 'The Cloaked Merchant', role: 'The Maze of Forking Paths', behavior: 'stand', face: 's', reach: 16,
      look: { skin: '#3a2a20', hair: '#1a1410', hairStyle: 'long', shirt: '#2a2a34', blazer: '#3a2a4a', pants: '#1a1a20', bg: '#1a1424' },
      barks: ['Wares for the lost.', 'Everything has a price. Even answers.', 'Gold spends the same in every maze.'], barkMin: 8, barkMax: 16, barkRange: 220,
      draw(g, n, t) {
        // a hooded cloak, a lantern
        g.rotate(n.facing);
        g.fillStyle = '#2a2034';
        g.beginPath();
        g.ellipse(-1, 0, 10, 12, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#3a2a4a';
        g.beginPath();
        g.arc(3, 0, 6.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#0a0808';
        g.beginPath();
        g.arc(5, 0, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c8a050';
        g.fillRect(6, 8, 4, 5);
      },
      dialog: {
        start: 'start',
        nodes: {
          start: { text: ['A figure in a hood, beside a blanket of wares. Its face is a dark you can’t quite see into.', '“Lost? Everyone here is lost. I sell what the lost need.”'], options: [{ label: 'What do you have?', next: 'shop' }, { label: 'Have you seen Alice?', next: 'alice' }, { label: 'Not now.', end: true }] },
          alice: { text: '“A woman, running. She bought nothing. She asked for the way out.” The hood tilts. “I told her the way out is the way through.”', options: [{ label: 'What do you have?', next: 'shop' }, { label: 'Not now.', end: true }] },
          shop: { text: (game) => '“Choose.” (You have ' + game.player.gold + ' gold.)', options: (game) => shopOptions(game) },
        },
      },
    },
  };

  LM.definePack({ id: 'town', items, npcs });
})();
