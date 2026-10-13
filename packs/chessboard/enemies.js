/* The Linear Maze — packs/chessboard/enemies.js
 * Chessboard pack, part 2: Gertrude, of the Supply Desk.
 *
 * She sits behind her desk in front of the supply closet and does nothing
 * at all until you try to go in (a zone trap on the closet's 'closet' tiles
 * sounds the alarm), or until you shoot her. Then she gets up.
 *
 * Behaviour 'desk-sitter': stays put and watches you until it is aggro,
 * then chases like a chaser. Use `sight: 0.001` so seeing you doesn't wake it.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;

  const behaviors = {
    'desk-sitter': {
      update(e, dt, game) {
        if (!e.aggro) {
          // turn to watch you, never move
          const P = game.player;
          if (P && e.distP < 260) e.facing += U.angDiff(e.facing, Math.atan2(P.y - e.y, P.x - e.x)) * Math.min(1, dt * 3);
          e.speedMul = 0;
          return;
        }
        if (!e.mem.rose) {
          e.mem.rose = true;
          game.toast('Gertrude rises from the Supply Desk. All of her rises.', 'warn');
          game.addShake(0.3);
        }
        AI.chase(e, game, 1);
      },
    },
  };

  const enemies = {
    'supply-clerk': {
      name: 'Gertrude, Supply Desk', hp: 340, speed: 96, radius: 15, mass: 4, armor: 0.2, ai: 'desk-sitter', sight: 0.001, leash: 2000,
      color: '#5a6a4a', blood: '#2a3a1a', gib: '#4a5a3a', deathSound: 'explode',
      attacks: [
        { type: 'melee', damage: 22, range: 18, windup: 0.45, cooldown: 1.2, knock: 240 },
        { type: 'ranged', projectile: 'enemy-bolt', damage: 7, speed: 360, burst: 5, burstGap: 0.08, fan: 0.7, windup: 0.5, cooldown: 2.6, range: 380, flash: '#d8ff9a' },
      ],
      drops: { gold: [40, 70], items: [{ id: 'medkit', chance: 1 }, { id: 'ammo-shells', chance: 0.6 }, { id: 'ammo-rounds', chance: 0.6 }] },
      init(e) {
        e.facing = -Math.PI / 2;
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        const breathe = 1 + Math.sin(e.t * 2) * 0.03;
        // too many arms: two holding the stamp, four doing paperwork
        g.strokeStyle = '#3e4a32';
        g.lineWidth = 2.6;
        g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
          const sw = Math.sin(e.t * (3 + row) + i) * 0.25 + (e.aggro ? 0.5 : 0);
          g.beginPath();
          g.moveTo(-2 + row * 3, side * 9);
          g.quadraticCurveTo(6 + row * 2, side * (14 + row * 2), 12 + row * 2 + sw * 4, side * (8 + row * 3));
          g.stroke();
        }
        g.fillStyle = '#2e3826';
        g.beginPath();
        g.ellipse(-2, 0, 13 * breathe, 16 * breathe, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a6a4a';
        g.beginPath();
        g.ellipse(-1, 0, 11.5 * breathe, 14.5 * breathe, 0, 0, U.TAU);
        g.fill();
        // cardigan
        g.fillStyle = '#8a6a8a';
        g.beginPath();
        g.ellipse(-3, 0, 9, 13, 0, 0.6, U.TAU - 0.6);
        g.fill();
        // head, eyeshade, the big rubber stamp
        g.fillStyle = '#6a7a58';
        g.beginPath();
        g.arc(4, 0, 6.5, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(60,180,90,0.75)';
        g.beginPath();
        g.ellipse(7, 0, 3, 7, 0, -Math.PI / 2, Math.PI / 2);
        g.fill();
        g.fillStyle = '#5a3a24';
        g.fillRect(14, -2, 6, 4);
        g.fillStyle = '#c8302a';
        g.fillRect(19, -4, 3, 8);
      },
      drawGlow(g, e) {
        for (const s of [-1, 1]) {
          const x = e.x + Math.cos(e.facing) * 8 + Math.cos(e.facing + Math.PI / 2) * 2.4 * s;
          const y = e.y + Math.sin(e.facing) * 8 + Math.sin(e.facing + Math.PI / 2) * 2.4 * s;
          G.glow(g, x, y, 4, e.aggro ? '#ff5a3a' : '#d8ff9a', 0.7);
        }
      },
      onDeath(e, game) {
        game.toast('Gertrude is dead. Your requisition is approved.', 'good');
        game.setFlag('cb_gertrude');
      },
    },
  };

  LM.definePack({ id: 'chessboard', behaviors, enemies });
})();
