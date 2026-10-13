/* The Linear Maze — packs/town/enemies.js
 * Town pack, part 5: what lives on Chessboard 2 and in the Maze of Forking Paths, and what you find there.
 *
 * Enemies
 *   printing-press  the Book Nook on Chessboard 2: leaps at you and lands with a crash (behaviour 'leaper').
 *                   Killing it takes you back to the real Book Nook (flag nookPressDone).
 *   minotaur        heavy hits, no range, short bursts of speed (behaviour 'burst')
 *   organ           jumps out of a canopic jar: small, bouncy, bites
 *   skeleton        climbs out of a catacomb coffin
 *   bone-pile       a moving heap of bones; sheds bone crawlers, and falls apart into three when it dies
 *   bone-crawler    a little skittering bone thing
 * Weapon: bone-wand (a slow blast that hits a large area; never runs out)
 * Armor:  bone-armor (+50 health as a shield that never refills: it wears away)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx, AI = LM.ai;
  const TOWN = (LM.TOWN = LM.TOWN || {});

  const lunge = (e) => (e.atk && e.atk.lunge ? e.atk.lunge * 4 : 0);
  function eyes(g, e, color, spread, fwd, size) {
    const a = e.facing;
    for (const s of [-1, 1]) {
      const x = e.x + Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * spread * s;
      const y = e.y + Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * spread * s;
      G.glow(g, x, y, size * 3, color, 0.7);
      G.circle(g, x, y, size * 0.6, '#ffffff');
    }
  }

  // ------------------------------------------------------------ behaviours
  const behaviors = {
    leaper: {
      // creep toward you; every few seconds, jump to where you are and come down hard
      update(e, dt, game) {
        const P = game.player, m = e.mem;
        if (m.jump) {
          e.mx = e.my = 0;
          e.speedMul = 0;
          return;
        }
        if (!e.aggro) {
          AI.wander(e, game, 0.2);
          e.speedMul = 0.3;
          return;
        }
        AI.chase(e, game, 1);
        e.speedMul = 0.35;
        m.jumpT = (m.jumpT == null ? 1.5 : m.jumpT) - dt;
        if (m.jumpT <= 0 && e.seeLos && e.distP < 460 && e.distP > 30) {
          const tx = Math.floor(P.x / T), ty = Math.floor(P.y / T);
          if (game.level.solidAt(tx, ty)) return;
          m.jump = { t: 0, dur: 0.95, sx: e.x, sy: e.y, tx: P.x + P.vx * 0.25, ty: P.y + P.vy * 0.25 };
          if (game.level.solidAt(Math.floor(m.jump.tx / T), Math.floor(m.jump.ty / T))) {
            m.jump.tx = P.x;
            m.jump.ty = P.y;
          }
          m.jumpT = U.rand(1.6, 2.6);
          LM.audio.play('charge', { vol: game.vol(e.x, e.y) });
        }
      },
    },
    burst: {
      // stand and glare, then rush for a moment, then stand again
      update(e, dt, game) {
        const m = e.mem;
        if (!e.aggro) {
          AI.wander(e, game, 0.25);
          e.speedMul = 0.3;
          return;
        }
        m.phase = (m.phase == null ? U.rand(0.3, 1) : m.phase) - dt;
        if (m.phase <= 0) {
          m.rushing = !m.rushing;
          m.phase = m.rushing ? U.rand(0.45, 0.7) : U.rand(0.7, 1.2);
          if (m.rushing) {
            LM.audio.play('charge', { vol: game.vol(e.x, e.y) * 0.7 });
            game.particles.burst(e.x, e.y + e.r * 0.5, 6, { type: 'smoke', color: '#a08a6a', speed: 50, life: 0.5, size: 3, alpha: 0.4 });
          }
        }
        AI.chase(e, game, 1);
        e.speedMul = m.rushing ? 2.6 : 0.08;
      },
    },
  };

  // ------------------------------------------------------------ the printing press's landing
  function pressUpdate(e, dt, game) {
    const m = e.mem, j = m.jump;
    if (!j) {
      e.z = 0;
      return;
    }
    j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    e.x = U.lerp(j.sx, j.tx, k);
    e.y = U.lerp(j.sy, j.ty, k);
    e.vx = e.vy = 0;
    e.z = Math.sin(k * Math.PI) * 46;
    if (k < 1) return;
    m.jump = null;
    e.z = 0;
    const P = game.player;
    game.addShake(0.5);
    LM.audio.play('explode', { vol: game.vol(e.x, e.y) });
    game.particles.add({ type: 'ring', x: e.x, y: e.y, life: 0.4, size: e.r, grow: 70, color: '#e8e0c8', width: 5 });
    game.particles.burst(e.x, e.y, 26, { type: 'dot', color: '#efe6d0', speed: 220, life: 0.7, size: [1, 2.4], drag: 3 });
    if (P && !P.dead && U.dist(P.x, P.y, e.x, e.y) < 62) {
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      LM.combat.hurt(game, P, 24, { kx: Math.cos(a) * 380, ky: Math.sin(a) * 380, source: 'enemy', type: 'melee' });
    }
    e.stunned = 0.7;
    // make sure it didn't come down inside a wall
    const tx = Math.floor(e.x / T), ty = Math.floor(e.y / T);
    if (game.level.solidAt(tx, ty)) {
      e.x = j.sx;
      e.y = j.sy;
    }
  }

  const projectiles = {
    'bone-blast': {
      radius: 4.5,
      light: { r: 80, color: '#e8e0ff', intensity: 0.5 },
      draw(g, p) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.age * 12);
        g.fillStyle = '#ece6d4';
        g.beginPath();
        g.arc(0, 0, 4.2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2420';
        g.fillRect(-2.2, -1.4, 1.6, 1.6);
        g.fillRect(0.6, -1.4, 1.6, 1.6);
        g.fillRect(-1, 1.4, 2, 1);
        g.restore();
      },
      drawGlow(g, p) {
        G.glow(g, p.x, p.y, 20, '#c8b8ff', 0.7);
      },
    },
  };

  const weapons = {
    'bone-wand': {
      name: 'Bone Wand', short: 'Wand', slot: 6,
      desc: 'A wand of carved bone. Each blast is slow, and it hits everything in a wide circle where it lands. It never runs out.',
      ammo: null, damage: 10, fireRate: 1.1, spread: 0.01, speed: 520, range: 'cursor', maxRange: 480,
      projectile: 'bone-blast', aoe: { radius: 96, damage: 46, color: '#c8b8ff', selfDamage: 0.25 },
      knock: 40, recoil: 0.6, kick: 0.16, sound: 'arc', flash: '#c8b8ff', flashRadius: 120, muzzle: 20, length: 18,
      drawHeld(g, p, k) {
        g.fillStyle = '#d8d0bc';
        g.fillRect(3 - k, -1.4, 15, 2.8);
        g.fillStyle = '#ece6d4';
        g.beginPath();
        g.arc(19 - k, 0, 3.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2420';
        g.fillRect(18 - k, -1.4, 1.2, 1.2);
        g.fillRect(18 - k, 0.4, 1.2, 1.2);
      },
    },
  };
  const armor = {
    'bone-armor': {
      name: 'Bone Armor', slot: 'body', color: '#d8d0bc', trim: '#8a7a5a',
      mods: { maxShield: 50 },
      desc: '+50 health, as a shell of bones. It never heals: every hit wears some of it away.',
    },
  };
  /** Put on the bone armor, full. */
  TOWN.wearBoneArmor = function (game) {
    const P = game.player;
    if (P.equip.body !== 'bone-armor') P.equipArmor('bone-armor');
    P.statsDirty = true;
    P.shield = P.stats().maxShield;
    LM.audio.play('pickup');
  };

  // ------------------------------------------------------------ the enemies
  const enemies = {
    'printing-press': {
      name: 'The Printing Press', hp: 380, speed: 60, radius: 20, mass: 9, armor: 0.2, ai: 'leaper', sight: 520, leash: 3000, boss: true,
      color: '#3a3a40', blood: '#1a1a1e', gib: '#efe6d0', deathSound: 'explode', deathGlow: '#ffe8c0',
      attacks: [{ type: 'melee', damage: 16, range: 14, windup: 0.35, cooldown: 1.2, knock: 260 }],
      drops: { gold: [40, 60], items: [{ id: 'medkit', chance: 1 }] },
      update: pressUpdate,
      onDeath(e, game) {
        game.setFlag('nookPressDone');
        game.toast('The press comes apart in a blizzard of pages. Every page is blank.', 'key');
        game.schedule(1.6, () => LM.think(game, 'The lights are… coming back. Normal lights.'));
        game.schedule(3.4, () => LM.APARTMENT.STORY.go(game, 'town-booknook'));
      },
      draw(g, e, t) {
        const z = e.z || 0, s = 1 + z / 90;
        g.translate(0, -z);
        g.scale(s, s);
        g.rotate(e.facing);
        // iron frame, the platen, the big wheel, pages fluttering out of it
        g.fillStyle = '#1a1a1e';
        g.fillRect(-20, -18, 40, 36);
        g.fillStyle = '#3a3a40';
        g.fillRect(-18, -16, 36, 32);
        g.fillStyle = '#5a5a64';
        g.fillRect(-14, -12, 22, 24);
        g.fillStyle = '#efe6d0';
        g.fillRect(-10, -9, 14, 18);
        g.fillStyle = 'rgba(30,30,30,0.6)';
        for (let i = 0; i < 6; i++) g.fillRect(-9, -7 + i * 3, 12, 0.8);
        g.strokeStyle = '#8a6a3a';
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(14, 0, 8, 0, U.TAU);
        g.stroke();
        const sp = e.t * (e.mem.jump ? 14 : 3);
        for (let i = 0; i < 4; i++) {
          const a = sp + (i * Math.PI) / 2;
          g.beginPath();
          g.moveTo(14, 0);
          g.lineTo(14 + Math.cos(a) * 8, Math.sin(a) * 8);
          g.stroke();
        }
        g.fillStyle = '#efe6d0';
        for (let i = 0; i < 3; i++) {
          g.save();
          g.translate(22 + Math.sin(e.t * 6 + i) * 3, -8 + i * 8);
          g.rotate(Math.sin(e.t * 5 + i * 2) * 0.6);
          g.fillRect(-3, -4, 6, 8);
          g.restore();
        }
      },
      drawGlow(g, e) {
        const z = e.z || 0;
        if (e.mem.jump) {
          // the shadow it's about to land on
          const j = e.mem.jump, k = Math.min(1, j.t / j.dur);
          g.fillStyle = 'rgba(255,60,40,' + (0.15 + k * 0.3) + ')';
          g.beginPath();
          g.arc(j.tx, j.ty, 18 + k * 30, 0, U.TAU);
          g.fill();
        }
        eyes(g, { x: e.x, y: e.y - z, facing: e.facing }, '#ffcf6a', 7, 18, 1.4);
      },
    },
    minotaur: {
      name: 'Minotaur', hp: 220, speed: 80, radius: 17, mass: 6, armor: 0.15, ai: 'burst', sight: 400, leash: 1800,
      color: '#6a4a32', blood: '#5a1818', gib: '#4a3222', bark: 'warn', deathSound: 'explode',
      attacks: [{ type: 'melee', damage: 32, range: 18, windup: 0.4, cooldown: 1.3, knock: 360 }],
      drops: { gold: [18, 34], items: [{ id: 'health-vial', chance: 0.45 }] },
      draw(g, e) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        // shoulders like a doorway, head down, horns forward
        g.fillStyle = '#3a2618';
        g.beginPath();
        g.ellipse(-3, 0, 14, 18, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6a4a32';
        g.beginPath();
        g.ellipse(-2, 0, 12, 16, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a3a24';
        g.beginPath();
        g.ellipse(8, -11, 5, 3.4, 0.4, 0, U.TAU);
        g.ellipse(8, 11, 5, 3.4, -0.4, 0, U.TAU);
        g.fill();
        g.fillStyle = '#4a3020';
        g.beginPath();
        g.ellipse(9, 0, 7, 6.5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#e8dcc0';
        g.beginPath();
        g.moveTo(10, -5);
        g.quadraticCurveTo(14, -14, 22, -12);
        g.lineTo(12, -3);
        g.moveTo(10, 5);
        g.quadraticCurveTo(14, 14, 22, 12);
        g.lineTo(12, 3);
        g.fill();
        g.fillStyle = '#c8a040';
        g.beginPath();
        g.arc(15, 0, 1.6, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        eyes(g, e, e.mem.rushing ? '#ff3a2a' : '#ff8a4a', 3.2, 11, 1.2);
      },
    },
    organ: {
      name: 'Organ', hp: 9, speed: 150, radius: 6, ai: 'swarmer', sight: 360, accel: 12, turn: 14,
      color: '#b84a5a', blood: '#6a1424', gib: '#c86a7a',
      attacks: [{ type: 'melee', damage: 5, range: 6, windup: 0.12, cooldown: 0.55, recover: 0.2, knock: 40 }],
      drops: { gold: [0, 2], goldChance: 0.2 },
      draw(g, e) {
        const b = Math.abs(Math.sin(e.t * 9)) * 4;
        g.translate(0, -b);
        g.rotate(e.facing);
        const kind = (e.mem.kind = e.mem.kind == null ? Math.floor(Math.random() * 3) : e.mem.kind);
        g.fillStyle = ['#b83a4a', '#a8584a', '#c86a7a'][kind];
        g.beginPath();
        if (kind === 0) {
          // a heart
          g.arc(-1, -2.4, 3.4, 0, U.TAU);
          g.arc(-1, 2.4, 3.4, 0, U.TAU);
          g.moveTo(1, -5);
          g.lineTo(7, 0);
          g.lineTo(1, 5);
        } else if (kind === 1) g.ellipse(0, 0, 6, 4, 0.4, 0, U.TAU); // a liver
        else g.ellipse(0, 0, 4, 6, 0, 0, U.TAU); // a kidney
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.25)';
        g.beginPath();
        g.arc(-1, -2, 1.4, 0, U.TAU);
        g.fill();
      },
    },
    skeleton: {
      name: 'Skeleton', hp: 38, speed: 86, radius: 9, ai: 'chaser', sight: 340, color: '#d8d0bc', blood: '#8a8270', gib: '#e8e0cc', bark: 'enemyShot',
      attacks: [{ type: 'melee', damage: 11, range: 13, windup: 0.3, cooldown: 0.9 }],
      drops: { gold: [2, 8], goldChance: 0.6, items: [{ id: 'health-vial', chance: 0.1 }] },
      draw(g, e) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        g.strokeStyle = '#d8d0bc';
        g.lineWidth = 1.6;
        g.lineCap = 'round';
        const sw = Math.sin(e.t * 8) * 2;
        g.beginPath();
        for (let i = -1; i <= 1; i++) {
          g.moveTo(-5, i * 3);
          g.lineTo(2, i * 3.6);
        }
        g.moveTo(-6, 0);
        g.lineTo(3, 0);
        g.moveTo(1, -6);
        g.lineTo(9, -7 + sw);
        g.moveTo(1, 6);
        g.lineTo(9, 7 - sw);
        g.stroke();
        g.fillStyle = '#ece6d4';
        g.beginPath();
        g.arc(5, 0, 4, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        eyes(g, e, '#8affd0', 1.5, 6, 0.8);
      },
    },
    'bone-pile': {
      name: 'Pile of Bones', hp: 130, speed: 46, radius: 16, mass: 5, ai: 'chaser', sight: 340, color: '#c8c0ac', blood: '#6a6250', gib: '#e8e0cc',
      attacks: [
        { type: 'melee', damage: 15, range: 16, windup: 0.45, cooldown: 1.2 },
        { type: 'summon', enemy: 'bone-crawler', count: 2, max: 4, windup: 0.7, cooldown: 6 },
      ],
      drops: { gold: [8, 20] },
      onDeath(e, game) {
        // it falls apart, and the parts keep coming
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * U.TAU;
          const x = e.x + Math.cos(a) * 12, y = e.y + Math.sin(a) * 12;
          if (!game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) game.spawnEnemy('bone-crawler', x, y, { aggro: true, summoned: true });
        }
      },
      draw(g, e) {
        const r = U.mulberry32(77), sh = Math.sin(e.t * 10) * 0.6;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(2, 3, 17, 14, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#d8d0bc';
        g.lineCap = 'round';
        for (let i = 0; i < 22; i++) {
          const a = r() * U.TAU, d = r() * 12, l = 3 + r() * 5, b = r() * U.TAU + e.t * (r() - 0.5);
          const x = Math.cos(a) * d + sh * (r() - 0.5) * 4, y = Math.sin(a) * d;
          g.lineWidth = 1.6 + r();
          g.beginPath();
          g.moveTo(x - Math.cos(b) * l, y - Math.sin(b) * l);
          g.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l);
          g.stroke();
        }
        for (let i = 0; i < 3; i++) {
          g.fillStyle = '#ece6d4';
          g.beginPath();
          g.arc(Math.cos(i * 2.1 + e.t * 0.5) * 7, Math.sin(i * 2.1 + e.t * 0.5) * 7, 3.2, 0, U.TAU);
          g.fill();
        }
      },
    },
    'bone-crawler': {
      name: 'Bone Crawler', hp: 11, speed: 168, radius: 6, ai: 'swarmer', sight: 340, accel: 14, turn: 16, color: '#d8d0bc', blood: '#8a8270', gib: '#e8e0cc',
      attacks: [{ type: 'melee', damage: 5, range: 7, windup: 0.14, cooldown: 0.6, recover: 0.2, knock: 50 }],
      drops: { gold: [0, 2], goldChance: 0.25 },
      draw(g, e) {
        g.rotate(e.facing);
        const st = Math.sin(e.t * 22) * 2;
        g.strokeStyle = '#d8d0bc';
        g.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(-3 + i * 3, 0);
          g.lineTo(-2 + i * 3 + (i % 2 ? st : -st), -7);
          g.moveTo(-3 + i * 3, 0);
          g.lineTo(-2 + i * 3 - (i % 2 ? st : -st), 7);
          g.stroke();
        }
        g.fillStyle = '#ece6d4';
        g.beginPath();
        g.arc(4, 0, 3, 0, U.TAU);
        g.fill();
      },
    },
  };

  LM.definePack({ id: 'town', behaviors, projectiles, weapons, armor, enemies });
})();
