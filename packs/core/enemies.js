/* The Linear Maze — packs/core/enemies.js
 * Enemy behaviours (how they move), attack types (what they do), and the
 * enemies themselves. An enemy is stats + one behaviour + a list of attacks
 * + a draw function, so new foes are mostly recombination.
 *
 * Enemy fields: name, hp, speed, radius, armor (0..1), mass, accel, turn,
 *   sight, leash, ai (behaviour id), keep [min,max] (preferred distance),
 *   attacks [{ type, ...params }], drops, blood, gib, color, bark,
 *   flying, swimmer, stationary, boss, draw(g,e,t), drawGlow(g,e,t), init, update, onDeath
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const AI = LM.ai;

  // ======================================================== behaviours
  const behaviors = {
    chaser: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.35);
          e.speedMul = 0.45;
          return;
        }
        AI.chase(e, game, 1);
      },
    },
    swarmer: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.5);
          e.speedMul = 0.5;
          return;
        }
        AI.chase(e, game, 1);
        const mx = e.mx, my = e.my, l = Math.hypot(mx, my) || 1;
        const w = Math.sin(e.t * 9 + e.home.x) * 0.7;
        e.mx += (-my / l) * w;
        e.my += (mx / l) * w;
      },
    },
    skirmisher: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.3);
          e.speedMul = 0.4;
          return;
        }
        const [lo, hi] = e.def.keep || [150, 280];
        if (!e.seeLos || e.distP > hi) AI.chase(e, game, 1);
        else if (e.distP < lo) {
          AI.away(e, game, 1);
          AI.strafe(e, game, 0.5);
        } else AI.strafe(e, game, 0.85);
        e.speedMul = 0.9;
      },
    },
    lobber: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.25);
          e.speedMul = 0.35;
          return;
        }
        const [lo, hi] = e.def.keep || [200, 380];
        if (e.distP > hi || (!e.seeLos && e.distP > lo + 60)) AI.chase(e, game, 1);
        else if (e.distP < lo) AI.away(e, game, 1);
        else AI.strafe(e, game, 0.4);
        e.speedMul = 0.75;
      },
    },
    turret: { update() {} },
    warden: {
      update(e, dt, game) {
        if (!e.aggro) {
          AI.wander(e, game, 0.2);
          e.speedMul = 0.35;
          return;
        }
        AI.chase(e, game, 1);
        if (e.seeLos && e.distP < 80) e.speedMul = 0.35;
      },
    },
    boss: {
      update(e, dt, game) {
        if (!e.aggro) return;
        const enraged = e.hp < e.maxHp * 0.5;
        if (enraged && !e.mem.enraged) {
          e.mem.enraged = true;
          game.toast(e.def.name + ' is enraged', 'warn');
          game.addShake(0.4);
          LM.audio.play('nova');
        }
        if (e.distP > 120 || !e.seeLos) AI.chase(e, game, 1);
        else AI.strafe(e, game, 0.6);
        e.speedMul = enraged ? 1.3 : 1;
      },
    },
  };

  // ======================================================== attacks
  function towardPlayer(e, game, lead, speed) {
    const P = game.player;
    let tx = P.x, ty = P.y;
    if (lead && speed) {
      const tt = U.dist(e.x, e.y, P.x, P.y) / speed;
      tx += P.vx * tt * lead;
      ty += P.vy * tt * lead;
    }
    return Math.atan2(ty - e.y, tx - e.x);
  }
  const attacks = {
    melee: {
      canStart: (e, a, game) => e.seeLos && e.distP <= (a.range || 14) + e.r + game.player.r + 4,
      start(e, atk) {
        atk.dir = 0;
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player;
        const wind = a.windup || 0.25;
        e.speedMul *= atk.t < wind ? 0.25 : 0.6;
        if (!atk.struck && atk.t >= wind) {
          atk.struck = true;
          LM.audio.play('swing', { vol: game.vol(e.x, e.y) });
          const reach = (a.range || 14) + e.r + P.r + 8;
          const d = U.dist(e.x, e.y, P.x, P.y);
          const ang = Math.atan2(P.y - e.y, P.x - e.x);
          e.kvx += Math.cos(ang) * 90;
          e.kvy += Math.sin(ang) * 90;
          if (d <= reach && !P.dead) LM.combat.hurt(game, P, a.damage || 10, { kx: Math.cos(ang) * (a.knock || 120), ky: Math.sin(ang) * (a.knock || 120), source: 'enemy', type: 'melee' });
        }
        atk.lunge = atk.t < wind ? atk.t / wind : Math.max(0, 1 - (atk.t - wind) / 0.15);
        if (atk.t >= wind + (a.recover || 0.3)) atk.done = true;
      },
      drawGlow(g, e, atk) {
        if (atk.t < (atk.def.windup || 0.25)) G.glow(g, e.x, e.y, e.r * 2.2, '#ff4a2a', (atk.t / (atk.def.windup || 0.25)) * 0.35);
      },
    },
    ranged: {
      canStart: (e, a, game) => e.seeLos && e.distP <= (a.range || 400) && e.distP >= (a.minRange || 0),
      update(e, atk, dt, game) {
        const a = atk.def;
        const wind = a.windup || 0.3;
        e.speedMul *= a.moveWhileFiring == null ? 0.35 : a.moveWhileFiring;
        const burst = a.burst || 1, gap = a.burstGap || 0.1;
        atk.fired = atk.fired || 0;
        while (atk.fired < burst && atk.t >= wind + atk.fired * gap) {
          const base = towardPlayer(e, game, a.lead || 0.4, a.speed || 340);
          const fan = a.fan ? (atk.fired / Math.max(1, burst - 1) - 0.5) * a.fan : 0;
          const ang = base + fan + U.rand(-(a.spread || 0.05), a.spread || 0.05);
          LM.combat.shoot(game, {
            type: a.projectile || 'enemy-bolt', x: e.x + Math.cos(ang) * (e.r + 4), y: e.y + Math.sin(ang) * (e.r + 4), angle: ang,
            speed: a.speed || 340, owner: 'enemy', damage: a.damage || 8, range: (a.range || 400) + 200, knock: 40,
          });
          game.lights.push({ x: e.x + Math.cos(ang) * (e.r + 4), y: e.y + Math.sin(ang) * (e.r + 4), r: 70, color: a.flash || '#ff8a4a', intensity: 0.7, life: 0.06, max: 0.06 });
          LM.audio.play('enemyShot', { vol: game.vol(e.x, e.y) });
          atk.fired++;
        }
        if (atk.fired >= burst && atk.t >= wind + burst * gap + 0.1) atk.done = true;
      },
      drawGlow(g, e, atk) {
        const wind = atk.def.windup || 0.3;
        if (atk.t < wind) {
          const k = atk.t / wind;
          G.glow(g, e.x + Math.cos(e.facing) * (e.r + 3), e.y + Math.sin(e.facing) * (e.r + 3), 8 + k * 6, atk.def.flash || '#ff8a4a', k * 0.9);
        }
      },
    },
    lob: {
      canStart: (e, a, game) => (e.seeLos || a.indirect) && e.distP >= (a.minRange || 100) && e.distP <= (a.maxRange || 460),
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player;
        e.speedMul *= 0.2;
        const wind = a.windup || 0.5;
        if (!atk.fired && atk.t >= wind) {
          atk.fired = true;
          const flight = a.flight || 1;
          let tx = P.x + P.vx * flight * 0.5, ty = P.y + P.vy * flight * 0.5;
          // keep the target on open floor near the player
          if (game.level.solidAt(Math.floor(tx / T), Math.floor(ty / T))) {
            tx = P.x;
            ty = P.y;
          }
          game.fx.push(new LM.Lob({ x: e.x, y: e.y, tx, ty, flight, radius: a.radius || 60, damage: a.damage || 25, owner: 'enemy', color: a.color || '#ff9a4a', arc: 80 }));
          LM.audio.play('launcher', { vol: game.vol(e.x, e.y) * 0.8 });
          game.particles.add({ type: 'smoke', x: e.x, y: e.y - 6, vy: -20, life: 0.8, size: 4, color: '#3a3330', alpha: 0.5 });
        }
        if (atk.t >= wind + 0.35) atk.done = true;
      },
      drawGlow(g, e, atk) {
        const wind = atk.def.windup || 0.5;
        if (atk.t < wind) G.glow(g, e.x, e.y - 4, 10 + (atk.t / wind) * 10, '#ff8a3a', (atk.t / wind) * 0.8);
      },
    },
    nova: {
      canStart: (e, a, game) => e.seeLos && e.distP < (a.radius || 90) * 0.85,
      start() {
        LM.audio.play('warn');
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player;
        const wind = a.windup || 0.8;
        e.speedMul = 0;
        atk.shake = atk.t < wind ? (atk.t / wind) * 1.5 : 0;
        if (!atk.burst && atk.t >= wind) {
          atk.burst = true;
          const R = a.radius || 90;
          LM.audio.play('nova', { vol: game.vol(e.x, e.y) });
          game.particles.add({ type: 'ring', x: e.x, y: e.y, life: 0.4, size: e.r, grow: R, color: a.color || '#f2c96b', width: 5 });
          game.particles.add({ type: 'flash', x: e.x, y: e.y, life: 0.25, size: R, color: a.color || '#f2c96b' });
          game.particles.burst(e.x, e.y, 24, { type: 'spark', color: a.color || '#f2c96b', speed: 380, life: 0.4, size: 1.2 });
          game.lights.push({ x: e.x, y: e.y, r: R * 2.2, color: a.color || '#f2c96b', intensity: 0.9, life: 0.35, max: 0.35 });
          game.addShake(0.25);
          const d = U.dist(e.x, e.y, P.x, P.y);
          if (d < R + P.r && LM.physics.los(game.level, e.x, e.y, P.x, P.y, 'shot')) {
            const ang = Math.atan2(P.y - e.y, P.x - e.x);
            LM.combat.hurt(game, P, a.damage || 20, { kx: Math.cos(ang) * 220, ky: Math.sin(ang) * 220, source: 'enemy', type: 'blast' });
          }
          if (a.shards) {
            for (let i = 0; i < a.shards; i++) {
              const ang = (i / a.shards) * U.TAU + e.t;
              LM.combat.shoot(game, { type: 'warden-shard', x: e.x, y: e.y, angle: ang, speed: 230, owner: 'enemy', damage: a.shardDamage || 7, range: 420, knock: 30 });
            }
          }
        }
        if (atk.t >= wind + (a.recover || 0.45)) atk.done = true;
      },
      drawGlow(g, e, atk) {
        const a = atk.def, wind = a.windup || 0.8;
        if (atk.t >= wind) return;
        const k = atk.t / wind, R = a.radius || 90;
        g.strokeStyle = U.rgba(a.color || '#f2c96b', 0.25 + k * 0.6);
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(e.x, e.y, R, 0, U.TAU);
        g.stroke();
        g.fillStyle = U.rgba(a.color || '#f2c96b', 0.05 + k * 0.15);
        g.beginPath();
        g.arc(e.x, e.y, R * k, 0, U.TAU);
        g.fill();
      },
    },
    charge: {
      canStart: (e, a, game) => e.seeLos && e.distP >= (a.minRange || 70) && e.distP <= (a.maxRange || 300),
      start() {
        LM.audio.play('charge');
      },
      update(e, atk, dt, game) {
        const a = atk.def, P = game.player;
        const wind = a.windup || 0.55;
        if (atk.t < wind) {
          e.speedMul = 0;
          atk.shake = (atk.t / wind) * 2;
          atk.dir = Math.atan2(P.y - e.y, P.x - e.x);
          return;
        }
        atk.shake = 0;
        atk.lockFacing = true;
        e.facing = atk.dir;
        e.mx = Math.cos(atk.dir);
        e.my = Math.sin(atk.dir);
        e.speedMul = (a.speed || 430) / (e.def.speed || 70);
        e.vx = e.mx * (a.speed || 430);
        e.vy = e.my * (a.speed || 430);
        if (Math.random() < 0.6) game.particles.add({ type: 'smoke', x: e.x, y: e.y + e.r * 0.5, life: 0.5, size: 3, color: '#6a6058', alpha: 0.35 });
        if (!atk.hit && U.dist(e.x, e.y, P.x, P.y) < e.r + P.r + 4) {
          atk.hit = true;
          LM.combat.hurt(game, P, a.damage || 25, { kx: Math.cos(atk.dir) * 340, ky: Math.sin(atk.dir) * 340, source: 'enemy', type: 'melee' });
          atk.t = Math.max(atk.t, wind + (a.duration || 0.6));
        }
        if (e.hitWall && atk.t > wind + 0.05) {
          e.stunned = a.stun || 0.9;
          game.addShake(0.2);
          LM.audio.play('break', { vol: game.vol(e.x, e.y) });
          game.particles.burst(e.x + Math.cos(atk.dir) * e.r, e.y + Math.sin(atk.dir) * e.r, 10, { type: 'chunk', color: '#6b6556', speed: 120, life: 0.6, size: 1.5, vz: 80, z: 2 });
          atk.done = true;
        }
        if (atk.t >= wind + (a.duration || 0.6)) {
          e.speedMul = 0.2;
          if (atk.t >= wind + (a.duration || 0.6) + 0.35) atk.done = true;
        }
      },
      drawGlow(g, e, atk) {
        const wind = atk.def.windup || 0.55;
        if (atk.t < wind) {
          const k = atk.t / wind;
          G.glow(g, e.x, e.y, e.r * 2.5, '#ff3a2a', k * 0.5);
          g.strokeStyle = 'rgba(255,80,60,' + k * 0.5 + ')';
          g.lineWidth = e.r * 1.4;
          g.beginPath();
          g.moveTo(e.x, e.y);
          g.lineTo(e.x + Math.cos(atk.dir) * 120 * k, e.y + Math.sin(atk.dir) * 120 * k);
          g.globalAlpha = 0.25;
          g.stroke();
          g.globalAlpha = 1;
        }
      },
    },
    summon: {
      canStart: (e, a, game) => e.seeLos && game.enemies.filter((o) => o.summoner === e && !o.dead).length < (a.max || 4),
      update(e, atk, dt, game) {
        const a = atk.def;
        e.speedMul = 0.2;
        if (!atk.done && atk.t >= (a.windup || 0.6)) {
          for (let i = 0; i < (a.count || 2); i++) {
            const ang = Math.random() * U.TAU;
            const x = e.x + Math.cos(ang) * (e.r + 18), y = e.y + Math.sin(ang) * (e.r + 18);
            if (game.level.solidAt(Math.floor(x / T), Math.floor(y / T))) continue;
            const s = game.spawnEnemy(a.enemy || 'skitter', x, y, { summoned: true, aggro: true });
            if (s) s.summoner = e;
          }
          LM.audio.play('warn');
          atk.done = true;
        }
      },
      drawGlow(g, e, atk) {
        G.glow(g, e.x, e.y, e.r * 3, '#c46cff', Math.min(1, atk.t / (atk.def.windup || 0.6)) * 0.6);
      },
    },
  };

  // ======================================================== drawing helpers
  function eyes(g, e, color, spread, fwd, size) {
    const a = e.facing;
    for (const s of [-1, 1]) {
      const x = e.x + Math.cos(a) * fwd + Math.cos(a + Math.PI / 2) * spread * s;
      const y = e.y + Math.sin(a) * fwd + Math.sin(a + Math.PI / 2) * spread * s;
      G.glow(g, x, y, size * 3, color, 0.7);
      G.circle(g, x, y, size * 0.6, '#ffffff');
    }
  }
  const lunge = (e) => (e.atk && e.atk.lunge ? e.atk.lunge * 4 : 0);

  // ======================================================== enemies
  const enemies = {
    husk: {
      name: 'Drowned Husk', hp: 42, speed: 92, radius: 10, ai: 'chaser', sight: 300, color: '#6b7a63',
      blood: '#3a2a1c', gib: '#4a5a44', bark: 'enemyShot',
      attacks: [{ type: 'melee', damage: 12, range: 14, windup: 0.3, cooldown: 0.9 }],
      drops: { gold: [2, 7], goldChance: 0.6, items: [{ id: 'health-vial', chance: 0.08 }, { id: 'ammo-shells', chance: 0.12 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        const sway = Math.sin(e.t * 6) * 1.2;
        g.fillStyle = '#3d4a39';
        g.beginPath();
        g.ellipse(-1, 0, 8.5, 10, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6b7a63';
        g.beginPath();
        g.ellipse(0, 0, 7, 8.6, 0, 0, U.TAU);
        g.fill();
        // grasping arms
        g.fillStyle = '#56644f';
        g.beginPath();
        g.ellipse(9, -6 + sway, 5, 2.2, 0.3, 0, U.TAU);
        g.ellipse(9, 6 - sway, 5, 2.2, -0.3, 0, U.TAU);
        g.fill();
        // head with weed
        g.fillStyle = '#7f8b6e';
        g.beginPath();
        g.arc(2.5, 0, 4.6, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#2f4a2a';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-1, -3);
        g.quadraticCurveTo(-6, -6 + sway, -9, -3);
        g.moveTo(-1, 2);
        g.quadraticCurveTo(-6, 5 - sway, -10, 3);
        g.stroke();
      },
      drawGlow(g, e) {
        eyes(g, e, '#d8f0a0', 1.8, 5, 1.1);
      },
    },
    skitter: {
      name: 'Skitter', hp: 16, speed: 178, radius: 7, ai: 'swarmer', sight: 340, accel: 14, turn: 16, color: '#4a3b52',
      blood: '#4b1d4f', gib: '#2c2230',
      attacks: [{ type: 'melee', damage: 6, range: 8, windup: 0.14, cooldown: 0.6, recover: 0.2, knock: 60 }],
      drops: { gold: [1, 3], goldChance: 0.35 },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        g.strokeStyle = '#2a2030';
        g.lineWidth = 1.2;
        const step = Math.sin(e.t * 22);
        for (let i = 0; i < 3; i++) {
          const ox = -3 + i * 3.5, w = (i % 2 ? step : -step) * 2;
          g.beginPath();
          g.moveTo(ox, -2);
          g.lineTo(ox + w + 1, -8);
          g.lineTo(ox + w + 3, -10);
          g.moveTo(ox, 2);
          g.lineTo(ox - w + 1, 8);
          g.lineTo(ox - w + 3, 10);
          g.stroke();
        }
        g.fillStyle = '#4a3b52';
        g.beginPath();
        g.ellipse(-2, 0, 6, 4.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6b5574';
        g.beginPath();
        g.ellipse(3.5, 0, 3.6, 3.2, 0, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        eyes(g, e, '#ff3a5a', 1.4, 5.5, 0.8);
      },
    },
    gunner: {
      name: 'Cult Gunner', hp: 36, speed: 84, radius: 10, ai: 'skirmisher', keep: [150, 270], sight: 380, color: '#6a4b3a',
      blood: '#6a1818',
      attacks: [{ type: 'ranged', projectile: 'enemy-slug', damage: 9, speed: 400, burst: 3, burstGap: 0.12, windup: 0.4, cooldown: 1.9, range: 430, spread: 0.06, lead: 0.5, flash: '#ffb050' }],
      drops: { gold: [4, 10], items: [{ id: 'ammo-shells', chance: 0.2 }, { id: 'ammo-rounds', chance: 0.2 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.fillStyle = '#2a2622';
        g.fillRect(4, 1.5, 15, 3);
        g.fillStyle = '#3d2c22';
        g.beginPath();
        g.ellipse(-1, 0, 7.5, 9.8, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6a4b3a';
        g.beginPath();
        g.ellipse(-0.5, 0, 6.3, 8.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7a2a22';
        g.fillRect(-6, -1, 10, 2);
        g.fillStyle = '#2e2420';
        g.beginPath();
        g.arc(0.5, 0, 4.8, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        eyes(g, e, '#ffb050', 1.6, 3.4, 0.9);
      },
    },
    brute: {
      name: 'Brute', hp: 170, speed: 68, radius: 15, mass: 3.5, armor: 0.15, ai: 'chaser', sight: 340, color: '#7a4a3a',
      blood: '#5a1414', gib: '#5a3a2e', deathSound: 'explode',
      attacks: [
        { type: 'charge', damage: 26, speed: 440, duration: 0.65, windup: 0.6, cooldown: 3.6, minRange: 80, maxRange: 300 },
        { type: 'melee', damage: 22, range: 16, windup: 0.45, cooldown: 1.4, knock: 220 },
      ],
      drops: { gold: [15, 30], items: [{ id: 'medkit', chance: 0.3 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        g.fillStyle = '#3a2620';
        g.beginPath();
        g.ellipse(-2, 0, 12, 15.5, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7a4a3a';
        g.beginPath();
        g.ellipse(-1, 0, 10.5, 14, 0, 0, U.TAU);
        g.fill();
        // armour plates
        g.fillStyle = '#5a5c62';
        g.fillRect(-9, -11, 7, 22);
        g.fillStyle = '#7d8088';
        g.fillRect(-9, -11, 7, 2);
        // fists
        g.fillStyle = '#8e5a46';
        g.beginPath();
        g.arc(11, -9, 4.5, 0, U.TAU);
        g.arc(11, 9, 4.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a3a2e';
        g.beginPath();
        g.arc(3, 0, 5.5, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e) {
        eyes(g, e, '#ff6a3a', 2.2, 6.5, 1.1);
      },
    },
    lobber: {
      name: 'Ember Lobber', hp: 52, speed: 62, radius: 11, ai: 'lobber', keep: [210, 380], sight: 420, color: '#5a4a42',
      blood: '#5a2a14',
      attacks: [{ type: 'lob', damage: 28, radius: 58, flight: 1.05, windup: 0.55, cooldown: 2.8, minRange: 110, maxRange: 470, color: '#ff9a4a' }],
      drops: { gold: [6, 14], items: [{ id: 'ammo-rockets', chance: 0.25 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.fillStyle = '#2e2622';
        g.beginPath();
        g.ellipse(-1, 0, 10, 11, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a4a42';
        g.beginPath();
        g.ellipse(0, 0, 8.6, 9.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#26262a';
        g.fillRect(-12, -3, 10, 6);
        g.fillStyle = '#3a3a40';
        g.beginPath();
        g.arc(-12, 0, 3.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#7a3a1a';
        g.beginPath();
        g.arc(2, 0, 4, 0, U.TAU);
        g.fill();
      },
      drawGlow(g, e, t) {
        G.glow(g, e.x, e.y, 9, '#ff7a2a', 0.5 + 0.2 * Math.sin(e.t * 4));
        eyes(g, e, '#ffcf7a', 1.6, 6, 0.8);
      },
    },
    sentry: {
      name: 'Sentry Turret', hp: 75, speed: 0, radius: 11, armor: 0.3, mass: 99, stationary: true, ai: 'turret', sight: 470, turn: 4, color: '#4a4d55',
      blood: '#ffb050', gib: '#55585f', deathGlow: '#ffb050', deathSound: 'explode',
      attacks: [{ type: 'ranged', projectile: 'enemy-bolt', damage: 10, speed: 300, burst: 5, burstGap: 0.09, windup: 0.6, cooldown: 2.3, range: 470, spread: 0.12, lead: 0.3, moveWhileFiring: 0, flash: '#ff5a3a' }],
      drops: { gold: [5, 12], items: [{ id: 'ammo-cells', chance: 0.35 }] },
      onDeath(e, game) {
        LM.combat.explode(game, e.x, e.y, { radius: 40, damage: 18, owner: 'enemy', silent: true });
      },
      draw(g, e, t) {
        g.fillStyle = '#26282d';
        LM.gfx.roundRect(g, -12, -12, 24, 24, 3);
        g.fill();
        g.fillStyle = '#3c3f46';
        LM.gfx.roundRect(g, -10, -10, 20, 20, 3);
        g.fill();
        g.rotate(e.facing);
        g.fillStyle = '#1c1d21';
        g.fillRect(4, -2.4, 13, 4.8);
        g.fillStyle = '#5a5e66';
        g.beginPath();
        g.arc(0, 0, 7.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d9a32a';
        g.fillRect(-6, -1, 4, 2);
      },
      drawGlow(g, e) {
        G.glow(g, e.x + Math.cos(e.facing) * 4, e.y + Math.sin(e.facing) * 4, 7, '#ff3a2a', e.aggro ? 0.9 : 0.4);
      },
    },
    warden: {
      name: 'Gilded Warden', hp: 130, speed: 76, radius: 13, armor: 0.2, mass: 2.5, ai: 'warden', sight: 340, color: '#b8913e',
      blood: '#e0c070', gib: '#8a6a2a', deathGlow: '#f2c96b',
      attacks: [
        { type: 'nova', damage: 24, radius: 96, windup: 0.85, cooldown: 3.4, color: '#f2c96b', shards: 8, shardDamage: 7 },
        { type: 'melee', damage: 14, range: 14, windup: 0.3, cooldown: 1.1 },
      ],
      drops: { gold: [18, 34], items: [{ id: 'health-vial', chance: 0.4 }] },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        g.fillStyle = '#4a3a1a';
        g.beginPath();
        g.ellipse(-1, 0, 10.5, 13, 0, 0, U.TAU);
        g.fill();
        const grd = g.createLinearGradient(-10, -12, 10, 12);
        grd.addColorStop(0, '#f2d48a');
        grd.addColorStop(0.5, '#b8913e');
        grd.addColorStop(1, '#6a4a1a');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(0, 0, 9, 11.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#2a2016';
        g.fillRect(-2, -8, 2, 16);
        g.fillStyle = '#d8c9a2';
        g.beginPath();
        g.arc(3, 0, 4.5, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1c140a';
        g.fillRect(5, -2.5, 1.6, 5);
      },
      drawGlow(g, e, t) {
        g.strokeStyle = 'rgba(242,201,107,' + (0.45 + 0.2 * Math.sin(e.t * 3)) + ')';
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(e.x, e.y, e.r + 5, (e.r + 5) * 0.9, e.t * 0.6, 0, U.TAU);
        g.stroke();
        G.glow(g, e.x, e.y, 22, '#f2c96b', 0.2);
      },
    },
    keeper: {
      name: 'The Reliquary Keeper', hp: 950, speed: 72, radius: 22, armor: 0.25, mass: 9, boss: true, ai: 'boss', sight: 460, leash: 4000, color: '#c9a046',
      blood: '#e0c070', gib: '#8a6a2a', deathGlow: '#ffe6a0', deathSound: 'explode',
      attacks: [
        { type: 'nova', damage: 28, radius: 132, windup: 1.0, cooldown: 4.5, color: '#f2c96b', shards: 14, shardDamage: 8 },
        { type: 'ranged', projectile: 'warden-shard', damage: 9, speed: 300, burst: 11, burstGap: 0.03, fan: 1.2, windup: 0.7, cooldown: 3.2, range: 520, spread: 0.02, lead: 0, flash: '#f2c96b' },
        { type: 'charge', damage: 30, speed: 470, duration: 0.7, windup: 0.75, cooldown: 6, minRange: 100, maxRange: 340, stun: 1.4 },
        { type: 'summon', enemy: 'skitter', count: 3, max: 6, windup: 0.8, cooldown: 9 },
      ],
      drops: { gold: [180, 240], items: [{ id: 'medkit', chance: 1 }] },
      onDeath(e, game) {
        LM.combat.explode(game, e.x, e.y, { radius: 110, damage: 0, owner: 'enemy', color: '#ffe6a0' });
        game.toast('The Keeper falls. The way down opens.', 'good');
        for (const o of game.enemies) if (o.summoner === e && !o.dead) o.die(game, {});
      },
      draw(g, e, t) {
        g.rotate(e.facing);
        g.translate(lunge(e), 0);
        // robe
        g.fillStyle = '#2a1a10';
        g.beginPath();
        g.ellipse(-3, 0, 19, 23, 0, 0, U.TAU);
        g.fill();
        const grd = g.createLinearGradient(-18, -22, 18, 22);
        grd.addColorStop(0, '#f6dc94');
        grd.addColorStop(0.5, '#b8913e');
        grd.addColorStop(1, '#5a3c14');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(-1, 0, 16, 20, 0, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#5a1a24';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(-1, 0, 12, 16, 0, -1, 1);
        g.stroke();
        // reliquary box held forward
        g.fillStyle = '#3a2614';
        g.fillRect(10, -7, 10, 14);
        g.fillStyle = '#e0b25a';
        g.fillRect(11, -6, 8, 12);
        g.fillStyle = '#2a1a10';
        g.fillRect(14, -6, 2, 12);
        // mask
        g.fillStyle = '#efe4c4';
        g.beginPath();
        g.arc(4, 0, 7, 0, U.TAU);
        g.fill();
        g.fillStyle = '#1a1208';
        g.fillRect(7, -3.5, 2, 2);
        g.fillRect(7, 1.5, 2, 2);
      },
      drawGlow(g, e, t) {
        G.glow(g, e.x, e.y, 60, '#f2c96b', 0.18 + (e.mem.enraged ? 0.15 : 0));
        g.strokeStyle = 'rgba(242,201,107,0.6)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.ellipse(e.x, e.y, e.r + 8 + i * 5, (e.r + 8 + i * 5) * 0.88, e.t * (0.4 + i * 0.2) * (i % 2 ? -1 : 1), 0, U.TAU * 0.7);
          g.stroke();
        }
        eyes(g, e, e.mem.enraged ? '#ff4a2a' : '#fff0c0', 2.4, 8, 1.3);
      },
    },
  };

  LM.definePack({ id: 'core', behaviors, attacks, enemies });
})();
