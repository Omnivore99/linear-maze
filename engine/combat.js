/* The Linear Maze — engine/combat.js
 * Projectiles, damage, knockback, explosions and the shared "fire a weapon"
 * routine. Weapon/projectile *data* lives in packs; this is the machinery.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const C = (LM.combat = {});

  // ------------------------------------------------------------ projectiles
  class Projectile {
    constructor(game, o) {
      this.def = LM.get('projectiles', o.type);
      this.x = o.x;
      this.y = o.y;
      const sp = o.speed || this.def.speed || 600;
      this.vx = Math.cos(o.angle) * sp;
      this.vy = Math.sin(o.angle) * sp;
      this.angle = o.angle;
      this.owner = o.owner;
      this.damage = o.damage || 10;
      this.range = o.range || 900;
      this.traveled = 0;
      this.pierce = o.pierce || 0;
      this.knock = o.knock == null ? 40 : o.knock;
      this.aoe = o.aoe || null;
      this.r = this.def.radius || 2.5;
      this.hit = new Set();
      this.dead = false;
      this.color = o.color || this.def.color || '#ffd890';
      this.trail = [];
      this.age = 0;
      this.falloff = o.falloff || 0;
    }
    impact(game, hitWall) {
      this.dead = true;
      if (this.aoe) {
        C.explode(game, this.x - this.vx * 0.004, this.y - this.vy * 0.004, Object.assign({ owner: this.owner }, this.aoe));
        return;
      }
      const d = this.def;
      if (hitWall) {
        game.particles.burst(this.x - this.vx * 0.006, this.y - this.vy * 0.006, d.wallSparks == null ? 4 : d.wallSparks, {
          type: 'spark', color: d.sparkColor || this.color, speed: 180, life: 0.22, angle: Math.atan2(-this.vy, -this.vx), spread: 1.1, size: 0.9,
        });
        game.particles.add({ type: 'smoke', x: this.x, y: this.y, life: 0.5, size: 2.5, color: '#9a9488', alpha: 0.25, drag: 2 });
        LM.audio.play('wall', { vol: game.vol(this.x, this.y) * 0.6 });
      }
    }
    update(dt, game) {
      const L = game.level;
      this.age += dt;
      const sp = Math.hypot(this.vx, this.vy);
      const dist = sp * dt;
      const steps = Math.max(1, Math.ceil(dist / 5));
      const sx = (this.vx * dt) / steps, sy = (this.vy * dt) / steps;
      if (this.def.trail) {
        this.trail.push(this.x, this.y);
        if (this.trail.length > this.def.trail * 2) this.trail.splice(0, 2);
      }
      for (let s = 0; s < steps; s++) {
        this.x += sx;
        this.y += sy;
        this.traveled += dist / steps;
        if (LM.physics.pointBlocksShot(L, this.x, this.y)) {
          this.impact(game, true);
          return;
        }
        if (this.owner === 'player') {
          for (const e of game.enemies) {
            if (e.dead || e.spawning > 0 || this.hit.has(e)) continue;
            const rr = e.r + this.r;
            if (U.dist2(this.x, this.y, e.x, e.y) < rr * rr) {
              this.hit.add(e);
              let dmg = this.damage;
              if (this.falloff) dmg *= U.clamp(1 - (this.traveled / this.range) * this.falloff, 0.35, 1);
              if (!this.aoe) C.hurt(game, e, dmg, { kx: (this.vx / sp) * this.knock, ky: (this.vy / sp) * this.knock, source: 'player' });
              game.particles.burst(this.x, this.y, 5, {
                type: 'dot', color: e.def.blood || '#7a1f1f', speed: 120, life: 0.35, angle: this.angle, spread: 0.6, size: [0.8, 1.8], drag: 6,
              });
              if (this.pierce-- <= 0 || this.aoe) {
                this.impact(game, false);
                return;
              }
            }
          }
        } else {
          const P = game.player;
          if (P && !P.dead && P.falling <= 0) {
            const rr = P.r + this.r;
            if (U.dist2(this.x, this.y, P.x, P.y) < rr * rr) {
              if (P.invuln <= 0) C.hurt(game, P, this.damage, { kx: (this.vx / sp) * this.knock, ky: (this.vy / sp) * this.knock, source: 'enemy' });
              this.impact(game, false);
              return;
            }
          }
        }
        for (const it of game.items) {
          if (it.dead || !it.def.destructible || this.hit.has(it)) continue;
          const rr = it.r + this.r;
          if (U.dist2(this.x, this.y, it.x, it.y) < rr * rr) {
            this.hit.add(it);
            C.hurt(game, it, this.damage, { source: this.owner });
            this.impact(game, false);
            return;
          }
        }
        if (this.traveled >= this.range) {
          if (this.aoe) this.impact(game, false);
          else this.dead = true;
          return;
        }
      }
    }
    draw(ctx, game, t) {
      if (this.def.draw) this.def.draw(ctx, this, t);
    }
    drawGlow(ctx, game, t) {
      const d = this.def;
      if (d.drawGlow) return d.drawGlow(ctx, this, t);
      // default tracer: a bright streak with a soft head
      const len = d.tracer || 14;
      const sp = Math.hypot(this.vx, this.vy) || 1;
      const tx = this.x - (this.vx / sp) * Math.min(len, this.traveled);
      const ty = this.y - (this.vy / sp) * Math.min(len, this.traveled);
      const grd = ctx.createLinearGradient(tx, ty, this.x, this.y);
      grd.addColorStop(0, U.rgba(this.color, 0));
      grd.addColorStop(1, U.rgba(this.color, 0.95));
      ctx.strokeStyle = grd;
      ctx.lineWidth = d.width || 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      LM.gfx.glow(ctx, this.x, this.y, d.glow || 7, this.color, 0.8);
    }
  }
  LM.Projectile = Projectile;

  C.shoot = function (game, o) {
    const p = new Projectile(game, o);
    game.projectiles.push(p);
    return p;
  };

  /**
   * Fire a weapon definition from a shooter (the player). Handles pellets,
   * spread, muzzle flash light, casings, recoil and sound.
   */
  C.fireWeapon = function (game, shooter, w, angle) {
    const mx = shooter.x + Math.cos(angle) * (w.muzzle || 16);
    const my = shooter.y + Math.sin(angle) * (w.muzzle || 16);
    // don't fire through a wall we're hugging
    const sx = LM.physics.los(game.level, shooter.x, shooter.y, mx, my, 'shot') ? mx : shooter.x;
    const sy = sx === mx ? my : shooter.y;
    const st = shooter.stats ? shooter.stats() : { damageMul: 1 };
    const pellets = w.pellets || 1;
    const bloom = (shooter.recoil || 0) * (w.bloom || 0.06);
    for (let i = 0; i < pellets; i++) {
      const spread = (w.spread || 0) + bloom;
      const a = angle + (pellets > 1 ? U.rand(-spread, spread) : U.rand(-spread, spread) * 0.6);
      C.shoot(game, {
        type: w.projectile || 'bullet',
        x: sx, y: sy, angle: a,
        speed: (w.speed || 900) * (pellets > 1 ? U.rand(0.88, 1.08) : 1),
        owner: 'player',
        damage: w.damage * st.damageMul,
        range: w.range === 'cursor' ? U.clamp(shooter.aimDist || 300, 70, w.maxRange || 420) : w.range || 900,
        pierce: w.pierce || 0,
        knock: w.knock,
        aoe: w.aoe ? { radius: w.aoe.radius, damage: w.aoe.damage * st.damageMul, color: w.aoe.color, selfDamage: w.aoe.selfDamage } : null,
        falloff: w.falloff,
        color: w.tracer,
      });
    }
    // muzzle flash
    const fl = w.flash || '#ffd38a';
    game.lights.push({ x: sx, y: sy, r: w.flashRadius || 110, color: fl, intensity: 0.85, life: 0.06, max: 0.06 });
    game.particles.add({ type: 'flash', x: sx, y: sy, life: 0.06, size: w.flashSize || 16, color: fl });
    game.particles.burst(sx, sy, w.sparks == null ? 3 : w.sparks, { type: 'spark', color: fl, speed: 260, life: 0.1, angle, spread: 0.35, size: 0.9 });
    if (w.casing) {
      const ca = angle + Math.PI / 2 + U.rand(-0.3, 0.3);
      game.particles.add({
        type: 'shell', x: shooter.x, y: shooter.y, vx: Math.cos(ca) * U.rand(60, 110), vy: Math.sin(ca) * U.rand(60, 110),
        z: 6, vz: U.rand(60, 120), life: 2.2, drag: 2.5, rot: Math.random() * 6, vr: 20, color: w.casing === true ? '#d8a84e' : w.casing,
      });
    }
    if (w.smoke) game.particles.add({ type: 'smoke', x: sx, y: sy, vx: Math.cos(angle) * 30, vy: Math.sin(angle) * 30, life: 0.7, size: 3, color: '#b5ada0', alpha: 0.3 });
    shooter.recoil = Math.min(1.6, (shooter.recoil || 0) + (w.recoil || 0.25));
    if (shooter.vx != null && w.pushback) {
      shooter.vx -= Math.cos(angle) * w.pushback;
      shooter.vy -= Math.sin(angle) * w.pushback;
    }
    game.addShake(w.kick || 0.06, angle);
    LM.audio.play(w.sound || 'pistol', { throttle: 0.02 });
  };

  // ------------------------------------------------------------ damage
  /**
   * Apply damage. Works on the player, enemies and destructible items.
   * o: { kx, ky, source: 'player'|'enemy'|'hazard', type, silent }
   */
  C.hurt = function (game, target, amount, o) {
    o = o || {};
    if (target.dead || amount <= 0) return 0;
    if (target.isPlayer) return C.hurtPlayer(game, target, amount, o);
    if (target.isEnemy) {
      const def = target.def;
      const dmg = Math.max(1, amount * (1 - (def.armor || 0)));
      target.hp -= dmg;
      target.flash = 0.09;
      target.lastHurt = 0;
      if (!target.aggro) target.alert(game, true);
      const mass = def.mass || 1;
      if (o.kx || o.ky) {
        target.kvx += (o.kx || 0) / mass;
        target.kvy += (o.ky || 0) / mass;
      }
      game.particles.add({
        type: 'text', x: target.x + U.rand(-4, 4), y: target.y - target.r - 4, vy: -38, drag: 3, life: 0.6,
        text: String(Math.round(dmg)), color: dmg >= 30 ? '#ffd36a' : '#f3ece0', size: dmg >= 30 ? 10 : 8,
      });
      if (o.source === 'player') game.hitMarker = 0.15;
      if (target.hp <= 0) target.die(game, o);
      else LM.audio.play('hit', { vol: game.vol(target.x, target.y) * 0.8 });
      return dmg;
    }
    if (target.isItem && target.def.destructible) {
      target.hp = (target.hp == null ? target.def.destructible.hp : target.hp) - amount;
      target.flash = 0.08;
      if (target.hp <= 0) target.destroy(game, o);
      return amount;
    }
    return 0;
  };

  C.hurtPlayer = function (game, P, amount, o) {
    if (P.invuln > 0 || P.dead || game.godMode) return 0;
    const st = P.stats();
    let dmg = amount;
    if (P.shield > 0) {
      const absorbed = Math.min(P.shield, dmg);
      P.shield -= absorbed;
      dmg -= absorbed;
      P.shieldFlash = 0.25;
      P.shieldDelay = 2.5;
      LM.audio.play('shieldHit');
    }
    dmg *= 1 - st.armor;
    if (dmg > 0) {
      P.hp -= dmg;
      P.hurtFlash = Math.min(1, P.hurtFlash + 0.35 + dmg / 60);
      LM.audio.play('hurt');
      game.particles.burst(P.x, P.y, 6, { type: 'dot', color: '#8e1d1d', speed: 120, life: 0.4, size: [0.8, 1.6], drag: 6 });
    }
    P.invuln = Math.max(P.invuln, o.type === 'hazard' ? 0.6 : 0.35);
    if (o.kx || o.ky) {
      P.vx += o.kx * 1.4;
      P.vy += o.ky * 1.4;
    }
    game.addShake(0.22 + Math.min(0.4, amount / 60));
    game.hitStop = Math.max(game.hitStop, 0.04);
    game.stats.damageTaken += dmg;
    if (P.hp <= 0) {
      P.hp = 0;
      game.playerDied(o);
    }
    return dmg;
  };

  C.heal = function (game, P, amount) {
    const st = P.stats();
    const before = P.hp;
    P.hp = Math.min(st.maxHp, P.hp + amount);
    const got = P.hp - before;
    if (got > 0) {
      game.particles.add({ type: 'text', x: P.x, y: P.y - 16, vy: -30, drag: 2, life: 0.9, text: '+' + Math.round(got), color: '#8ff0a4', size: 9 });
      game.particles.burst(P.x, P.y, 10, { type: 'ember', color: '#7ef0a0', speed: 50, life: 0.7, size: 1.2, drag: 1 });
    }
    return got;
  };

  // ------------------------------------------------------------ explosions
  /** o: { radius, damage, owner, color, selfDamage, silent } */
  C.explode = function (game, x, y, o) {
    const R = o.radius || 70, D = o.damage || 40;
    const col = o.color || '#ffb060';
    game.particles.add({ type: 'flash', x, y, life: 0.18, size: R * 1.6, color: col });
    game.particles.add({ type: 'ring', x, y, life: 0.35, size: R * 0.2, grow: R * 0.9, color: col, width: 4 });
    game.particles.burst(x, y, 26, { type: 'spark', color: [col, '#fff0c0', '#ff7a3a'], speed: 420, speedMin: 120, life: 0.5, size: 1.4, drag: 4, len: 0.035 });
    game.particles.burst(x, y, 14, { type: 'ember', color: [col, '#ff6a2a'], speed: 140, life: 1.1, size: 1.2, drag: 2 });
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * U.TAU, d = Math.random() * R * 0.5;
      game.particles.add({
        type: 'smoke', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40,
        life: U.rand(0.8, 1.5), size: U.rand(6, 11), color: '#2c2724', alpha: 0.55, drag: 1.5,
      });
    }
    game.lights.push({ x, y, r: R * 3, color: col, intensity: 1, life: 0.35, max: 0.35 });
    game.renderer.addDecal({ type: 'scorch', x, y, r: R * 0.75 });
    const P = game.player;
    const pd = P ? U.dist(x, y, P.x, P.y) : 9999;
    game.addShake(U.clamp(0.7 - pd / 600, 0.08, 0.7));
    if (!o.silent) LM.audio.play('explode', { vol: game.vol(x, y), throttle: 0.05 });
    const L = game.level;
    const losOK = (tx, ty) => LM.physics.los(L, x, y, tx, ty, 'shot');
    // player
    if (P && !P.dead && pd < R + P.r && losOK(P.x, P.y)) {
      const k = 1 - U.clamp(pd / (R + P.r), 0, 1) * 0.6;
      const mul = o.owner === 'player' ? (o.selfDamage == null ? 0.35 : o.selfDamage) : 1;
      if (mul > 0) C.hurt(game, P, D * k * mul, { kx: ((P.x - x) / (pd || 1)) * 160, ky: ((P.y - y) / (pd || 1)) * 160, source: o.owner, type: 'blast' });
    }
    // enemies (player blasts and barrels hurt enemies; enemy blasts don't)
    if (o.owner !== 'enemy') {
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = U.dist(x, y, e.x, e.y);
        if (d < R + e.r && losOK(e.x, e.y)) {
          const k = 1 - U.clamp(d / (R + e.r), 0, 1) * 0.6;
          C.hurt(game, e, D * k, { kx: ((e.x - x) / (d || 1)) * 260, ky: ((e.y - y) / (d || 1)) * 260, source: 'player', type: 'blast' });
        }
      }
    }
    // chain reactions
    for (const it of game.items) {
      if (it.dead || !it.def.destructible) continue;
      const d = U.dist(x, y, it.x, it.y);
      if (d < R + it.r && losOK(it.x, it.y)) {
        game.schedule(0.08 + Math.random() * 0.1, () => C.hurt(game, it, D, { source: o.owner, type: 'blast' }));
      }
    }
  };
})();
