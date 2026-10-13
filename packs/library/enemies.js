/* The Linear Maze — packs/library/enemies.js
 * Library pack, part 3: who works here, and who never left.
 *
 *   librarian      big, semi-triangular. Hits hard up close (a melee slam) or throws books
 *                  from across the room (projectile 'thrown-book').
 *   bookworm       small and fast. Once in a while (not often) one divides into two.
 *                  props.gen: how many times its line has divided already (they stop at 2;
 *                  there are never more than WORM_CAP on a floor).
 *   overdue-ghost  returned their books late and never paid the fines. Flies (ignores hazards),
 *                  circles you, then swoops; touching you hurts. Drops their unpaid fines (gold).
 * Behaviours: 'librarian' (closes in, slows to loom), 'swooper' (circles, then charges).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const WORM_CAP = 14;

  const behaviors = {
    librarian: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.2);
          e.speedMul = 0.3;
          return;
        }
        AI.chase(e, game, 1);
        // looms: slows down once you're within reach of a thrown book
        if (e.seeLos && e.distP < 200) e.speedMul = 0.7;
        if (!e.mem.shushed && e.seeLos) {
          e.mem.shushed = true;
          LM.audio.play('warn', { vol: game.vol(e.x, e.y) });
          game.particles.add({ type: 'text', x: e.x, y: e.y - e.r - 10, vy: -20, drag: 2, life: 1.2, text: 'SHHHH', color: '#e8d8c0', size: 10 });
        }
      },
    },
    swooper: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.5);
          e.speedMul = 0.5;
          return;
        }
        if (!e.seeLos || e.distP > 260) AI.chase(e, game, 1);
        else {
          // circle at a swooping distance
          AI.strafe(e, game, 1);
          if (e.distP < 120) AI.away(e, game, 0.6);
          else if (e.distP > 190) AI.chase(e, game, 0.5);
        }
        e.speedMul = 1;
      },
    },
  };

  const projectiles = {
    'thrown-book': {
      radius: 5, color: '#c9a046', wallSparks: 0,
      draw(g, p) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.age * 14);
        g.fillStyle = '#5a2a2a';
        g.fillRect(-5, -3.6, 10, 7.2);
        g.fillStyle = '#efe6d0';
        g.fillRect(-4.2, -2.8, 8.4, 1.2);
        g.fillRect(-4.2, 1.6, 8.4, 1.2);
        g.restore();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 10, '#ffd890', 0.35);
      },
    },
  };

  function glasses(g, e, color) {
    // two little round lenses that catch the light, in world space
    const a = e.facing;
    for (const s of [-1, 1]) {
      const x = e.x + Math.cos(a) * 9 + Math.cos(a + Math.PI / 2) * 3.4 * s;
      const y = e.y + Math.sin(a) * 9 + Math.sin(a + Math.PI / 2) * 3.4 * s;
      G.glow(g, x, y, 6, color, 0.65);
      G.circle(g, x, y, 1.1, '#ffffff');
    }
  }

  const enemies = {
    librarian: {
      name: 'Librarian', hp: 170, speed: 70, radius: 18, mass: 4, armor: 0.12, ai: 'librarian', sight: 360, leash: 1800,
      color: '#6a4a5a', blood: '#3a1a2a', gib: '#5a3a4a', bark: 'warn', deathSound: 'explode',
      attacks: [
        { type: 'melee', damage: 24, range: 18, windup: 0.5, cooldown: 1.5, knock: 280 },
        { type: 'ranged', projectile: 'thrown-book', damage: 11, speed: 300, burst: 3, burstGap: 0.16, fan: 0.35, windup: 0.6, cooldown: 2.8, range: 360, minRange: 70, spread: 0.04, lead: 0.4, flash: '#ffd890' },
      ],
      drops: { gold: [10, 25], items: [{ id: 'health-vial', chance: 0.5 }, { id: 'ammo-shells', chance: 0.35 }] },
      draw(g, e) {
        g.rotate(e.facing);
        g.scale(1.2, 1.2);
        const a = e.atk, lunge = a && a.lunge ? a.lunge * 5 : 0;
        g.translate(lunge, 0);
        const breathe = 1 + Math.sin(e.t * 2.2) * 0.03;
        // the body: a wide, rounded triangle, the point toward you (a long cardigan over a longer skirt)
        g.fillStyle = 'rgba(0,0,0,0.35)';
        tri(g, 2, 2, 19 * breathe);
        g.fill();
        g.fillStyle = '#3a2430';
        tri(g, 0, 0, 19 * breathe);
        g.fill();
        g.fillStyle = '#6a4a5a';
        tri(g, 1, 0, 16 * breathe);
        g.fill();
        // cardigan buttons
        g.fillStyle = '#c9a046';
        for (let i = 0; i < 3; i++) g.fillRect(-6 + i * 4.5, -0.6, 1.4, 1.4);
        // arms holding a book to the chest
        g.fillStyle = '#5a3a4a';
        g.beginPath();
        g.ellipse(4, -9, 6, 2.8, 0.4, 0, U.TAU);
        g.ellipse(4, 9, 6, 2.8, -0.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a4a6a';
        g.fillRect(6, -5, 4, 10);
        // head and a tight gray bun
        g.fillStyle = '#d8b8a0';
        g.beginPath();
        g.arc(7, 0, 5.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#9a9aa2';
        g.beginPath();
        g.arc(4.5, 0, 4.2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7a7a82';
        g.beginPath();
        g.arc(3, 0, 2.2, 0, U.TAU);
        g.fill();
        // a pencil through the bun
        g.strokeStyle = '#e8c040';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(1, -4);
        g.lineTo(5, 4);
        g.stroke();
      },
      drawGlow(g, e) {
        glasses(g, e, '#ffe8b0');
      },
    },
    bookworm: {
      name: 'Book Worm', hp: 14, speed: 185, radius: 6, ai: 'swarmer', sight: 340, accel: 14, turn: 16,
      color: '#7a9a4a', blood: '#3a5a1a', gib: '#e8dcc0',
      attacks: [{ type: 'melee', damage: 5, range: 7, windup: 0.14, cooldown: 0.6, recover: 0.2, knock: 50 }],
      drops: { gold: [1, 3], goldChance: 0.3 },
      init(e) {
        e.mem.splitT = U.rand(14, 24);
      },
      update(e, dt, game) {
        if (!e.aggro || e.dead) return;
        e.mem.splitT -= dt;
        if (e.mem.splitT > 0) return;
        e.mem.splitT = U.rand(18, 30);
        if (Math.random() < 0.4) return; // not every time
        const gen = (e.props && e.props.gen) || e.gen || 0;
        if (gen >= 2) return;
        if (game.enemies.filter((o) => o.def.id === 'bookworm' && !o.dead).length >= WORM_CAP) return;
        // divide: this one and a new one, each a generation further along
        e.gen = gen + 1;
        const a = Math.random() * U.TAU;
        const x = e.x + Math.cos(a) * 10, y = e.y + Math.sin(a) * 10;
        if (game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) return;
        const w = game.spawnEnemy('bookworm', x, y, { aggro: true, summoned: true });
        if (w) {
          w.gen = e.gen;
          w.hp = Math.max(6, e.hp);
        }
        LM.audio.play('pickup', { vol: game.vol(e.x, e.y) * 0.6 });
        game.particles.burst(e.x, e.y, 10, { type: 'dot', color: '#efe6d0', speed: 80, life: 0.5, size: [0.8, 1.6], drag: 4 });
      },
      draw(g, e) {
        g.rotate(e.facing);
        const wig = Math.sin(e.t * 18);
        // four segments, wriggling, and a tiny pair of glasses
        for (let i = 3; i >= 0; i--) {
          const x = -i * 3.6, y = Math.sin(e.t * 18 - i * 1.2) * 1.6;
          g.fillStyle = i % 2 ? '#6a8a3a' : '#8aaa5a';
          g.beginPath();
          g.arc(x, y, 3.6 - i * 0.35, 0, U.TAU);
          g.fill();
        }
        g.fillStyle = '#9aba6a';
        g.beginPath();
        g.arc(2.6, wig * 0.4, 3.4, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#1a1a1e';
        g.lineWidth = 0.6;
        g.beginPath();
        g.arc(3.8, -1.3 + wig * 0.4, 1.1, 0, U.TAU);
        g.moveTo(4.9, 1.3 + wig * 0.4);
        g.arc(3.8, 1.3 + wig * 0.4, 1.1, 0, U.TAU);
        g.stroke();
      },
    },
    'overdue-ghost': {
      name: 'Overdue Ghost', hp: 40, speed: 135, radius: 10, flying: true, ai: 'swooper', sight: 380, accel: 6, turn: 8,
      color: '#c8d8f0', blood: '#a8c0e0', gib: '#e8f0ff', deathSound: 'altar',
      attacks: [{ type: 'charge', damage: 14, speed: 420, duration: 0.55, windup: 0.5, cooldown: 2.6, minRange: 60, maxRange: 240, stun: 0.5 }],
      drops: { gold: [6, 16], items: [{ id: 'health-vial', chance: 0.15 }] }, // their unpaid fines
      update(e, dt, game) {
        // touching you hurts, swooping or not
        const P = game.player;
        e.mem.touchCd = Math.max(0, (e.mem.touchCd || 0) - dt);
        if (P && !P.dead && e.mem.touchCd <= 0 && e.distP < e.r + P.r + 1) {
          e.mem.touchCd = 0.8;
          LM.combat.hurt(game, P, 7, { kx: (P.x - e.x) * 4, ky: (P.y - e.y) * 4, source: 'enemy', type: 'melee' });
        }
      },
      draw(g, e) {
        const bob = Math.sin(e.t * 3) * 2;
        g.translate(0, bob - 3);
        const ga = g.globalAlpha;
        g.globalAlpha = ga * 0.78;
        g.rotate(e.facing - Math.PI / 2);
        // a sheet with a ragged trailing hem
        g.fillStyle = '#d8e4f4';
        g.beginPath();
        g.arc(0, 4, 9, Math.PI, 0);
        const n = 5;
        for (let i = 0; i <= n; i++) {
          const x = 9 - (i * 18) / n;
          g.lineTo(x, -6 - (i % 2 ? 4 : 0) - Math.sin(e.t * 8 + i) * 1.5);
        }
        g.closePath();
        g.fill();
        // the overdue book, clutched
        g.fillStyle = '#7a2a2a';
        g.fillRect(-3, 6, 6, 4.4);
        g.fillStyle = '#e8d070';
        g.fillRect(-2.4, 7.6, 4.8, 0.8);
        g.globalAlpha = ga;
      },
      drawGlow(g, e) {
        G.glow(g, e.x, e.y - 3, 24, '#a8c8ff', 0.3);
        const a = e.facing;
        for (const s of [-1, 1]) {
          const x = e.x + Math.cos(a) * 5 + Math.cos(a + Math.PI / 2) * 3 * s;
          const y = e.y - 3 + Math.sin(a) * 5 + Math.sin(a + Math.PI / 2) * 3 * s;
          G.circle(g, x, y, 1.4, '#1a2030');
        }
      },
    },
  };
  function tri(g, ox, oy, s) {
    // a rounded triangle, the point forward (+x)
    g.beginPath();
    g.moveTo(ox + s * 0.85, oy);
    g.quadraticCurveTo(ox + s * 0.2, oy + s * 0.9, ox - s * 0.75, oy + s * 0.95);
    g.quadraticCurveTo(ox - s * 1.05, oy, ox - s * 0.75, oy - s * 0.95);
    g.quadraticCurveTo(ox + s * 0.2, oy - s * 0.9, ox + s * 0.85, oy);
    g.closePath();
  }

  LM.definePack({ id: 'library', behaviors, projectiles, enemies });
})();
