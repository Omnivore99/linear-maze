/* The Linear Maze — engine/entities.js
 * Enemy, Item (world objects), Door, timed effects (Lob, Summon), and the
 * steering helpers behaviours use. Enemy/item *definitions* live in packs.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;

  // ------------------------------------------------------------ AI helpers
  const AI = (LM.ai = {});
  /** Steer toward the player: straight when visible, otherwise along the flow field. */
  AI.chase = function (e, game, weight) {
    const P = game.player;
    const w = weight == null ? 1 : weight;
    if (e.seeLos && e.distP < 420) {
      const dx = P.x - e.x, dy = P.y - e.y, l = Math.hypot(dx, dy) || 1;
      e.mx += (dx / l) * w;
      e.my += (dy / l) * w;
      return true;
    }
    const d = LM.nav.dir(game.level, e.x, e.y);
    if (d) {
      e.mx += d.x * w;
      e.my += d.y * w;
      return true;
    }
    return false;
  };
  AI.away = function (e, game, weight) {
    const P = game.player;
    const dx = e.x - P.x, dy = e.y - P.y, l = Math.hypot(dx, dy) || 1;
    e.mx += (dx / l) * weight;
    e.my += (dy / l) * weight;
  };
  AI.strafe = function (e, game, weight) {
    const P = game.player;
    const dx = P.x - e.x, dy = P.y - e.y, l = Math.hypot(dx, dy) || 1;
    const dir = e.mem.strafeDir || (e.mem.strafeDir = U.chance(0.5) ? 1 : -1);
    e.mx += (-dy / l) * dir * weight;
    e.my += (dx / l) * dir * weight;
    e.mem.strafeT = (e.mem.strafeT || U.rand(0.8, 2)) - game.dt;
    if (e.mem.strafeT <= 0 || e.hitWall) {
      e.mem.strafeDir = -dir;
      e.mem.strafeT = U.rand(0.8, 2.2);
    }
  };
  AI.wander = function (e, game, weight) {
    e.mem.wt = (e.mem.wt || 0) - game.dt;
    if (e.mem.wt <= 0) {
      e.mem.wt = U.rand(1.2, 3.2);
      if (U.dist(e.x, e.y, e.home.x, e.home.y) > 64) e.mem.wa = Math.atan2(e.home.y - e.y, e.home.x - e.x);
      else e.mem.wa = U.chance(0.4) ? null : Math.random() * U.TAU;
    }
    if (e.mem.wa != null) {
      e.mx += Math.cos(e.mem.wa) * weight;
      e.my += Math.sin(e.mem.wa) * weight;
    }
  };
  /** Push apart from nearby enemies so packs spread out. */
  AI.separate = function (e, game, weight) {
    for (const o of game.enemies) {
      if (o === e || o.dead) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d2 = dx * dx + dy * dy, rr = (e.r + o.r + 6) * (e.r + o.r + 6);
      if (d2 < rr && d2 > 0.01) {
        const d = Math.sqrt(d2);
        e.mx += (dx / d) * weight * (1 - d / Math.sqrt(rr));
        e.my += (dy / d) * weight * (1 - d / Math.sqrt(rr));
      }
    }
  };
  /** Steer away from hazard tiles just ahead. */
  AI.avoidHazards = function (e, game) {
    const L = game.level, l = Math.hypot(e.mx, e.my);
    if (l < 0.01 || e.def.flying) return;
    const ax = e.x + (e.mx / l) * (e.r + 10), ay = e.y + (e.my / l) * (e.r + 10);
    const d = L.tileAtWorld(ax, ay);
    if (d.hazard) {
      const tx = Math.floor(ax / T) * T + T / 2, ty = Math.floor(ay / T) * T + T / 2;
      e.mx += (e.x - tx) / 16;
      e.my += (e.y - ty) / 16;
    }
  };

  // ------------------------------------------------------------ Enemy
  class Enemy {
    constructor(game, def, x, y, props) {
      props = props || {};
      this.isEnemy = true;
      this.def = def;
      this.x = x;
      this.y = y;
      this.r = def.radius || 10;
      this.maxHp = Math.round(def.hp * (props.hpMul || 1) * (game.difficulty || 1));
      this.hp = this.maxHp;
      this.vx = this.vy = this.kvx = this.kvy = 0;
      this.mx = this.my = 0;
      this.facing = Math.random() * U.TAU;
      this.aggro = !!props.aggro;
      this.visible = false;
      this.vis = 0;
      this.seeLos = false;
      this.losT = Math.random() * 0.2;
      this.distP = 9999;
      this.flash = 0;
      this.t = Math.random() * 10;
      this.home = { x, y };
      this.mem = {};
      this.atk = null;
      this.atkCd = (def.attacks || []).map((a) => U.rand(0.3, a.cooldown || 1));
      this.globalCd = 0;
      this.stunned = 0;
      this.spawning = props.summoned ? 0.7 : 0;
      this.tag = props.tag;
      this.speedMul = 1;
      this.hazardCd = 0;
      this.alertT = 0;
      this.dead = false;
      this.hitWall = false;
      this.drops = props.drops;
      if (def.init) def.init(this, game);
    }
    alert(game, loud) {
      if (this.aggro) return;
      this.aggro = true;
      this.alertT = 0.8;
      if (this.def.bark) LM.audio.play(this.def.bark, { vol: game.vol(this.x, this.y) * 0.6 });
      // wake nearby friends
      if (loud) for (const o of game.enemies) if (!o.aggro && !o.dead && U.dist(o.x, o.y, this.x, this.y) < 150) o.alert(game, false);
    }
    update(dt, game) {
      if (this.spawning > 0) {
        this.spawning -= dt;
        return;
      }
      const L = game.level, P = game.player, def = this.def;
      this.t += dt;
      this.flash -= dt;
      this.alertT -= dt;
      this.stunned -= dt;
      this.hazardCd -= dt;
      this.globalCd -= dt;
      this.losT -= dt;
      this.distP = P ? U.dist(this.x, this.y, P.x, P.y) : 9999;
      if (this.losT <= 0) {
        this.losT = 0.1 + Math.random() * 0.05;
        this.seeLos = P && this.distP < 900 && LM.physics.los(L, this.x, this.y, P.x, P.y);
      }
      this.visible = this.seeLos || this.distP < this.r + 30;
      this.vis = U.approach(this.vis, this.visible ? 1 : 0, dt * 6);
      if (!this.aggro && P && this.seeLos && this.distP < (def.sight || 320)) this.alert(game, true);
      if (this.aggro && this.distP > (def.leash || 1400)) this.aggro = false;

      this.mx = 0;
      this.my = 0;
      this.speedMul = 1;
      if (this.stunned <= 0) {
        const beh = LM.get('behaviors', def.ai || 'chaser');
        beh.update(this, dt, game);
        AI.separate(this, game, 0.9);
        AI.avoidHazards(this, game);
      }
      this.updateAttacks(dt, game);

      const l = Math.hypot(this.mx, this.my);
      if (l > 1) {
        this.mx /= l;
        this.my /= l;
      }
      const tile = L.tileAtWorld(this.x, this.y);
      const sp = (def.speed || 80) * this.speedMul * (tile.swim && !def.swimmer ? 0.5 : 1) * (this.stunned > 0 ? 0 : 1);
      this.vx = U.damp(this.vx, this.mx * sp, def.accel || 9, dt);
      this.vy = U.damp(this.vy, this.my * sp, def.accel || 9, dt);
      const kf = Math.exp(-7 * dt);
      this.kvx *= kf;
      this.kvy *= kf;
      if (!def.stationary) {
        this.passHazard = true;
        this.hitWall = LM.physics.move(L, this, (this.vx + this.kvx) * dt, (this.vy + this.kvy) * dt);
        game.pushOutOfItems(this);
      }
      // face movement, or the player while attacking / when visible
      const wantFace = this.atk || (this.seeLos && this.aggro) ? Math.atan2(P.y - this.y, P.x - this.x) : Math.hypot(this.vx, this.vy) > 8 ? Math.atan2(this.vy, this.vx) : this.facing;
      if (!(this.atk && this.atk.lockFacing)) this.facing += U.angDiff(this.facing, wantFace) * Math.min(1, dt * (def.turn || 10));

      // hazards
      const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T);
      const hz = L.t(tx, ty);
      if (hz.hazard === 'pit' && !def.flying) {
        this.fall(game);
        return;
      }
      if (hz.hazard && !def.flying && this.hazardCd <= 0 && (!hz.active || hz.active(game, tx, ty))) {
        this.hazardCd = hz.interval || 0.6;
        LM.combat.hurt(game, this, (hz.damage || 10) * 1.5, { source: 'hazard' });
      }
      if (def.update) def.update(this, dt, game);
    }
    updateAttacks(dt, game) {
      const atks = this.def.attacks || [];
      for (let i = 0; i < this.atkCd.length; i++) this.atkCd[i] -= dt;
      if (this.atk) {
        const a = this.atk;
        a.t += dt;
        const type = LM.get('attacks', a.def.type);
        type.update(this, a, dt, game);
        if (a.done || this.stunned > 0) {
          this.atkCd[a.i] = (a.def.cooldown || 1) * U.rand(0.85, 1.2);
          this.globalCd = 0.35;
          this.atk = null;
        }
        return;
      }
      if (!this.aggro || this.stunned > 0 || this.globalCd > 0 || !game.player || game.player.dead) return;
      for (let i = 0; i < atks.length; i++) {
        if (this.atkCd[i] > 0) continue;
        const ad = atks[i];
        const type = LM.get('attacks', ad.type);
        if (type.canStart(this, ad, game)) {
          this.atk = { def: ad, i, t: 0, done: false };
          if (type.start) type.start(this, this.atk, game);
          break;
        }
      }
    }
    fall(game) {
      game.particles.burst(this.x, this.y, 6, { type: 'smoke', color: '#222', speed: 30, life: 0.5, size: 4, alpha: 0.4 });
      game.fx.push(new FallFx(this));
      this.die(game, { silent: true, fell: true });
    }
    die(game, o) {
      if (this.dead) return;
      this.dead = true;
      game.stats.kills++;
      const def = this.def;
      if (!(o && o.fell)) {
        game.particles.burst(this.x, this.y, 16, {
          type: 'dot', color: def.blood || '#7a1f1f', speed: 190, life: 0.5, size: [1, 2.4], drag: 5,
          decal: Math.random() < 0.3 ? { type: 'blood', r: 6, color: def.blood || '#5e1616' } : undefined,
        });
        game.particles.burst(this.x, this.y, 6, { type: 'chunk', color: def.gib || U.shade(def.color || '#555', -0.3), speed: 140, life: 0.8, size: 1.8, drag: 4, vz: 90, z: 2, vr: 12 });
        game.renderer.addDecal({ type: 'blood', x: this.x, y: this.y, r: this.r * 1.3, color: def.blood || '#5e1616' });
        if (def.deathGlow) game.particles.add({ type: 'flash', x: this.x, y: this.y, life: 0.3, size: 40, color: def.deathGlow });
        LM.audio.play(def.deathSound || 'enemyDie', { vol: game.vol(this.x, this.y) });
        game.addShake(0.08);
      }
      // loot
      const drops = this.drops || def.drops;
      if (drops && !(o && o.fell)) game.dropLoot(this.x, this.y, drops);
      if (def.onDeath) def.onDeath(this, game);
      LM.emit('enemyDied', this);
    }
    drawShadow(ctx, game) {
      if (this.def.stationary && this.def.noShadow) return;
      const k = this.spawning > 0 ? 1 - this.spawning / 0.7 : 1;
      G.shadow(ctx, this.x, this.y, this.r * k, 0.38 * this.vis);
    }
    draw(ctx, game, t) {
      const k = this.spawning > 0 ? U.ease.outBack(1 - this.spawning / 0.7) : 1;
      if (k <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0.0, this.vis);
      ctx.translate(this.x, this.y);
      if (this.atk && this.atk.shake) ctx.translate(U.rand(-1, 1) * this.atk.shake, U.rand(-1, 1) * this.atk.shake);
      ctx.scale(k, k);
      this.def.draw(ctx, this, t, game);
      if (this.flash > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,245,235,' + Math.min(1, this.flash * 9) + ')';
        ctx.fillRect(-this.r * 2, -this.r * 2, this.r * 4, this.r * 4);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      // health bar once damaged
      if (this.hp < this.maxHp && this.vis > 0.5) {
        const w = Math.max(16, this.r * 2), y = this.y - this.r - 7;
        ctx.fillStyle = 'rgba(10,10,14,0.75)';
        ctx.fillRect(this.x - w / 2 - 1, y - 1, w + 2, 3.5);
        ctx.fillStyle = this.def.boss ? '#e8be6e' : '#e0524f';
        ctx.fillRect(this.x - w / 2, y, (w * Math.max(0, this.hp)) / this.maxHp, 1.6);
      }
    }
    drawGlow(ctx, game, t) {
      if (this.spawning > 0) {
        const k = this.spawning / 0.7;
        ctx.strokeStyle = U.rgba(this.def.summonColor || '#c46cff', k);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 2.2 * (1 - k) + 4, 0, U.TAU);
        ctx.stroke();
        G.glow(ctx, this.x, this.y, 30, this.def.summonColor || '#c46cff', k);
        return;
      }
      if (this.vis > 0.05 && this.def.drawGlow) {
        ctx.save();
        ctx.globalAlpha = this.vis;
        this.def.drawGlow(ctx, this, t, game);
        ctx.restore();
      }
      if (this.atk) {
        const type = LM.get('attacks', this.atk.def.type);
        if (type.drawGlow) type.drawGlow(ctx, this, this.atk, t, game);
      }
      if (this.alertT > 0 && this.vis > 0.5) {
        ctx.font = '700 11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,200,90,' + Math.min(1, this.alertT * 2) + ')';
        ctx.fillText('!', this.x, this.y - this.r - 10 - (0.8 - this.alertT) * 6);
      }
    }
  }
  LM.Enemy = Enemy;

  class FallFx {
    constructor(e) {
      this.e = e;
      this.t = 0;
    }
    update(dt) {
      this.t += dt;
      return this.t > 0.6;
    }
    draw(ctx, game, t) {
      const k = 1 - this.t / 0.6;
      ctx.save();
      ctx.translate(this.e.x, this.e.y);
      ctx.rotate(this.t * 5);
      ctx.scale(k, k);
      ctx.globalAlpha = k;
      this.e.def.draw(ctx, this.e, t, game);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------ Lob (arcing shell with a ground telegraph)
  class Lob {
    constructor(o) {
      Object.assign(this, o);
      this.t = 0;
      this.flight = o.flight || 1;
    }
    update(dt, game) {
      this.t += dt;
      if (this.t >= this.flight) {
        LM.combat.explode(game, this.tx, this.ty, { radius: this.radius, damage: this.damage, owner: this.owner, color: this.color });
        return true;
      }
      if (Math.random() < dt * 30) {
        const p = this.pos();
        game.particles.add({ type: 'ember', x: p.x, y: p.y - p.z, life: 0.4, size: 1, color: this.color || '#ff9a4a', drag: 1 });
      }
      return false;
    }
    pos() {
      const k = this.t / this.flight;
      return { x: U.lerp(this.x, this.tx, k), y: U.lerp(this.y, this.ty, k), z: Math.sin(k * Math.PI) * (this.arc || 70) };
    }
    draw(ctx) {
      const p = this.pos();
      G.shadow(ctx, p.x, p.y, 5 * (1 - (p.z / (this.arc || 70)) * 0.5), 0.35);
    }
    drawGlow(ctx, game, t) {
      const k = this.t / this.flight;
      // landing zone
      ctx.strokeStyle = U.rgba(this.warn || '#ff5a3a', 0.35 + k * 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, this.radius, 0, U.TAU);
      ctx.stroke();
      ctx.fillStyle = U.rgba(this.warn || '#ff5a3a', 0.08 + k * 0.18);
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, this.radius * k, 0, U.TAU);
      ctx.fill();
      const p = this.pos();
      G.glow(ctx, p.x, p.y - p.z, 12, this.color || '#ff9a4a', 0.9);
      G.circle(ctx, p.x, p.y - p.z, 2.6, '#ffe2b0');
    }
  }
  LM.Lob = Lob;

  // ------------------------------------------------------------ Item (world object)
  class Item {
    constructor(game, def, tx, ty, props, tag) {
      this.isItem = true;
      this.def = def;
      this.props = Object.assign({}, def.props || {}, props || {});
      this.tag = tag;
      this.tx = tx;
      this.ty = ty;
      this.x = tx * T + T / 2;
      this.y = ty * T + T / 2;
      this.r = def.radius || 9;
      this.z = def.z || 0;
      this.t = Math.random() * 10;
      this.dead = false;
      this.used = false;
      this.flash = 0;
      this.hp = def.destructible ? def.destructible.hp : null;
      this.face = null;
      if (def.wallMounted) {
        const L = game.level;
        const FACE = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
        // props.face pins the direction; otherwise face the first open side (S, E, W, N)
        const order = this.props.face && FACE[this.props.face] ? [FACE[this.props.face]] : [[0, 1], [1, 0], [-1, 0], [0, -1]];
        for (const [dx, dy] of order) {
          if (this.props.face) {
            this.face = { x: dx, y: dy };
            break;
          }
          const n = L.t(tx + dx, ty + dy);
          if (!n.solid) {
            this.face = { x: dx, y: dy };
            break;
          }
        }
        if (!this.face) this.face = { x: 0, y: 1 };
        this.x += this.face.x * (T / 2 + 1);
        this.y += this.face.y * (T / 2 + 1);
      }
      // placement nudge in pixels, for pieces that sit between tiles
      if (this.props.ox) this.x += this.props.ox;
      if (this.props.oy) this.y += this.props.oy;
      if (def.init) def.init(this, game);
    }
    use(game) {
      this.def.interact.use(this, game);
    }
    /** World-space box for solid: 'rect' items. Defs set it.box = [w, h] and optional it.boxOff = [dx, dy] in init. */
    getRect() {
      const b = this.box || this.def.box || [24, 24], o = this.boxOff || [0, 0];
      return { x0: this.x + o[0] - b[0] / 2, y0: this.y + o[1] - b[1] / 2, x1: this.x + o[0] + b[0] / 2, y1: this.y + o[1] + b[1] / 2 };
    }
    canInteract(game) {
      const ia = this.def.interact;
      if (!ia || this.dead) return false;
      return ia.available ? ia.available(this, game) : !this.used;
    }
    prompt(game) {
      const ia = this.def.interact;
      return typeof ia.prompt === 'function' ? ia.prompt(this, game) : ia.prompt || 'Use';
    }
    update(dt, game) {
      this.t += dt;
      this.flash -= dt;
      if (this.def.update) this.def.update(this, dt, game);
    }
    destroy(game, o) {
      if (this.dead) return;
      this.dead = true;
      if (this.light) this.light.off = true;
      const br = this.def.destructible;
      if (br && br.onBreak) br.onBreak(this, game, o);
      if (this.tag) game.triggerEvent('pickup', this.tag);
    }
    remove(game) {
      this.dead = true;
      if (this.light) this.light.off = true;
    }
    drawShadow(ctx, game) {
      if (this.def.shadow === false || this.def.wallMounted) return;
      G.shadow(ctx, this.x, this.y + (this.def.shadowY || 0), this.r * (this.def.shadowScale || 1), 0.32);
    }
    lift(t) {
      return (this.pop ? this.pop.z : 0) + (this.def.bob ? 1.5 + Math.sin(t * 3 + this.t) * 1.5 : 0);
    }
    draw(ctx, game, t) {
      if (!this.def.draw) return;
      // def.cache: the drawing never animates, so paint it once into a sprite and reuse it.
      // def.cacheKey(it, game) returns a string that changes whenever the picture should (a flag, a used state).
      if (this.def.cache && !(this.flash > 0) && !this.pop && game.renderer) {
        const key = this.def.cacheKey ? this.def.cacheKey(this, game) : '';
        const s = game.renderer.scale;
        if (!this.spr || this.sprKey !== key || this.sprScale !== s) this.bakeSprite(game, t, key, s);
        const R = this.sprR;
        ctx.drawImage(this.spr, this.x - R, this.y - R, R * 2, R * 2);
        return;
      }
      ctx.save();
      ctx.translate(this.x, this.y - this.lift(t));
      this.def.draw(ctx, this, t, game);
      if (this.flash > 0) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,240,220,' + Math.min(1, this.flash * 10) + ')';
        ctx.fillRect(-this.r * 2, -this.r * 2, this.r * 4, this.r * 4);
      }
      ctx.restore();
    }
    bakeSprite(game, t, key, s) {
      const cr = this.def.cacheRadius;
      const R = (this.sprR = Math.ceil(typeof cr === 'function' ? cr(this) : cr || this.r * 2 + 12));
      const px = Math.max(2, Math.ceil(R * 2 * s));
      const c = this.spr && this.spr.width === px ? this.spr : document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, R * s, R * s);
      this.def.draw(g, this, t, game);
      this.spr = c;
      this.sprKey = key;
      this.sprScale = s;
    }
    drawGlow(ctx, game, t) {
      if (!this.def.drawGlow) return;
      ctx.save();
      ctx.translate(this.x, this.y - this.lift(t));
      this.def.drawGlow(ctx, this, t, game);
      ctx.restore();
    }
  }
  LM.Item = Item;

  // ------------------------------------------------------------ Door
  class Door {
    constructor(game, tx, ty, lock, tag, style) {
      this.isDoor = true;
      this.style = style || null; // null | 'glass' | 'stall' | 'odd' (or any style a pack draws via env.doorStyles)
      this.tx = tx;
      this.ty = ty;
      this.x = tx * T + T / 2;
      this.y = ty * T + T / 2;
      this.lock = lock;
      this.unlocked = !lock;
      this.tag = tag;
      this.open = 0;
      this.target = 0;
      this.closeT = 0;
      this.blocking = true;
      this.sealed = false;
      this.opened = false;
      this.warned = false;
      this.r = 14;
      this.z = -1;
      const L = game.level;
      this.horizontal = L.solidAt(tx - 1, ty) || L.solidAt(tx + 1, ty);
      const i = L.idx(tx, ty);
      L.doorAt[i] = this;
      L.dyn[i] = 1;
    }
    setBlocking(game, b) {
      if (b === this.blocking) return;
      this.blocking = b;
      game.level.dyn[game.level.idx(this.tx, this.ty)] = b ? 1 : 0;
      game.onDoorChanged(this);
    }
    occupied(game) {
      const x0 = this.tx * T - 2, y0 = this.ty * T - 2, x1 = x0 + T + 4, y1 = y0 + T + 4;
      const inside = (e) => e.x + e.r > x0 && e.x - e.r < x1 && e.y + e.r > y0 && e.y - e.r < y1;
      if (game.player && inside(game.player)) return true;
      for (const e of game.enemies) if (!e.dead && inside(e)) return true;
      return false;
    }
    update(dt, game) {
      const P = game.player;
      let want = false;
      if (!this.sealed) {
        const dp = P ? U.dist(P.x, P.y, this.x, this.y) : 9999;
        if (dp < 50) {
          if (this.unlocked || (this.lock && P.keys.has(this.lock))) {
            want = true;
            if (!this.unlocked) {
              this.unlocked = true;
              game.toast(LM.KEY_NAMES[this.lock] + ' turns in the lock', 'key');
              LM.audio.play('key');
            }
          } else if (!this.warned) {
            this.warned = true;
            game.toast('Locked. You need the ' + LM.KEY_NAMES[this.lock] + '.', 'warn');
            LM.audio.play('locked');
          }
        } else if (dp > 80) this.warned = false;
        if (this.unlocked && !want) {
          for (const e of game.enemies) {
            if (!e.dead && e.aggro && U.dist(e.x, e.y, this.x, this.y) < 40) {
              want = true;
              break;
            }
          }
        }
      }
      if (want) {
        this.target = 1;
        this.closeT = 1.4;
      } else {
        this.closeT -= dt;
        if (this.closeT <= 0 && !(this.open > 0.05 && this.occupied(game))) this.target = 0;
      }
      if (this.sealed && !this.occupied(game)) this.target = 0;
      const before = this.open;
      this.open = U.approach(this.open, this.target, dt * 4.5);
      if (before === 0 && this.open > 0) LM.audio.play('door', { vol: game.vol(this.x, this.y) });
      if (before > 0.5 && this.open <= 0.5 && this.target === 0) LM.audio.play('door', { vol: game.vol(this.x, this.y) * 0.7 });
      this.setBlocking(game, this.open < 0.65);
      if (!this.opened && this.open > 0.3) {
        this.opened = true;
        if (this.tag) game.triggerEvent('door', this.tag);
      }
    }
    draw(ctx, game, t) {
      const env = game.level.env;
      const custom = this.style && env.doorStyles && env.doorStyles[this.style];
      if (custom) return custom(ctx, this, game, t);
      const dc = env.door || { panel: '#5a4632', frame: '#2b241d', trim: '#8a6f4e' };
      const k = U.ease.inOutSine(this.open);
      const lockCol = this.lock ? LM.KEY_COLORS[this.lock] : null;
      ctx.save();
      ctx.translate(this.x, this.y);
      if (!this.horizontal) ctx.rotate(Math.PI / 2);
      const half = T / 2;
      const slide = k * (half - 2);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * slide, 0);
        const x0 = side < 0 ? -half : 0;
        ctx.fillStyle = dc.panel;
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = U.shade(dc.panel, 0.18);
        ctx.fillRect(x0, -5, half, 2);
        ctx.fillStyle = U.shade(dc.panel, -0.35);
        ctx.fillRect(x0, 3, half, 2);
        ctx.strokeStyle = dc.trim;
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 1.5, -3.5, half - 3, 7);
        if (lockCol) {
          ctx.fillStyle = lockCol;
          ctx.fillRect(x0 + (side < 0 ? half - 5 : 1), -5, 4, 10);
        }
        if (this.sealed) {
          ctx.fillStyle = '#7a1a1a';
          ctx.fillRect(x0 + 3, -1, half - 6, 2);
        }
        ctx.restore();
      }
      // frame posts
      ctx.fillStyle = dc.frame;
      ctx.fillRect(-half, -7, 3, 14);
      ctx.fillRect(half - 3, -7, 3, 14);
      ctx.restore();
    }
    drawGlow(ctx, game, t) {
      const env = game.level.env;
      const glow = this.style && env.doorGlows && env.doorGlows[this.style];
      if (glow) glow(ctx, this, game, t);
      if (this.lock && !this.unlocked) G.glow(ctx, this.x, this.y, 16, LM.KEY_COLORS[this.lock], 0.35 + 0.15 * Math.sin(t * 3));
      if (this.sealed) G.glow(ctx, this.x, this.y, 22, '#ff3a2a', 0.4 + 0.2 * Math.sin(t * 8));
    }
  }
  LM.Door = Door;
})();
