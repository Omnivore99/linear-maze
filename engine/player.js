/* The Linear Maze — engine/player.js
 * The player character: movement, dash, swimming, hazards, weapons,
 * equipment-derived stats, and drawing.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;

  const BASE = {
    maxHp: 100,
    speed: 172,
    armor: 0, // fraction of damage ignored (capped at 0.75)
    maxShield: 0,
    shieldRegen: 0, // shield points per second, after a short delay
    lightRadius: 300,
    dashCooldown: 0.9,
    swimMul: 0.55,
    damageMul: 1,
    goldFind: 0,
    ammoMul: 1,
  };
  const AMMO_MAX = { shells: 48, rounds: 240, cells: 90, rockets: 14 };
  LM.AMMO_MAX = AMMO_MAX;
  LM.AMMO_NAMES = { shells: 'Shells', rounds: 'Rivets', cells: 'Cells', rockets: 'Charges' };
  LM.KEY_COLORS = { red: '#e0524f', gold: '#f0c048', violet: '#a77bff' };
  LM.KEY_NAMES = { red: 'Red Key', gold: 'Gold Key', violet: 'Violet Key' };

  class Player {
    constructor(save) {
      this.isPlayer = true;
      this.r = 10;
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.aim = 0;
      this.aimDist = 200;
      this.equip = { head: null, body: null, feet: null, trinket: null };
      this.bag = [];
      this.weapons = ['pistol'];
      this.weaponIdx = 0;
      this.lastWeaponIdx = 0;
      this.ammo = { shells: 0, rounds: 0, cells: 0, rockets: 0 };
      this.gold = 0;
      this.keys = new Set();
      this.blessings = [];
      this.gadgets = []; // always-carried tools such as the phone
      this.flags = new Set(); // story flags for the run (game.setFlag)
      this.data = {}; // free-form state owned by packs (saved with the player)
      this.buffs = []; // timed stat modifiers: { id, name, mods, t }
      this.gadgetCd = 0;
      this.hp = BASE.maxHp;
      this.shield = 0;
      this.fireCd = 0;
      this.dashT = 0;
      this.dashCd = 0;
      this.invuln = 0;
      this.hurtFlash = 0;
      this.shieldFlash = 0;
      this.shieldDelay = 0;
      this.recoil = 0;
      this.falling = 0;
      this.hazardCd = 0;
      this.walk = 0;
      this.swimming = false;
      this.lastSafe = { x: 0, y: 0 };
      this.trail = [];
      this.dead = false;
      this.statsDirty = true;
      this.emptyWarn = 0;
      if (save) this.restore(save);
    }
    serialize() {
      return JSON.parse(
        JSON.stringify({
          hp: this.hp, shield: this.shield, gold: this.gold, weapons: this.weapons, weaponIdx: this.weaponIdx,
          ammo: this.ammo, equip: this.equip, bag: this.bag, blessings: this.blessings,
          gadgets: this.gadgets, flags: [...this.flags], data: this.data,
        })
      );
    }
    restore(s) {
      const known = (kind) => (id) => !!LM.find(kind, id);
      this.hp = s.hp;
      this.shield = s.shield || 0;
      this.gold = s.gold || 0;
      this.weapons = (s.weapons || ['pistol']).filter(known('weapons'));
      this.weaponIdx = U.clamp(s.weaponIdx || 0, 0, Math.max(0, this.weapons.length - 1));
      this.gadgets = (s.gadgets || []).filter(known('gadgets'));
      this.flags = new Set(s.flags || []);
      this.data = JSON.parse(JSON.stringify(s.data || {}));
      Object.assign(this.ammo, s.ammo || {});
      for (const k of Object.keys(this.equip)) this.equip[k] = s.equip && s.equip[k] && LM.find('armor', s.equip[k]) ? s.equip[k] : null;
      this.bag = (s.bag || []).filter(known('armor'));
      this.blessings = (s.blessings || []).filter(known('blessings'));
      this.statsDirty = true;
    }

    // ---------------------------------------------------- stats & gear
    stats() {
      if (!this.statsDirty && this._stats) return this._stats;
      const s = Object.assign({}, BASE);
      const apply = (mods) => {
        if (!mods) return;
        for (const k of Object.keys(mods)) if (k in s) s[k] += mods[k];
      };
      for (const slot of Object.keys(this.equip)) if (this.equip[slot]) apply(LM.get('armor', this.equip[slot]).mods);
      for (const b of this.blessings) apply(LM.get('blessings', b).mods);
      for (const id of this.gadgets) {
        const gd = LM.get('gadgets', id);
        if (gd.mods) apply(typeof gd.mods === 'function' ? gd.mods(this) : gd.mods);
      }
      for (const b of this.buffs) apply(b.mods);
      s.armor = U.clamp(s.armor, 0, 0.75);
      s.speed = Math.max(90, s.speed);
      s.dashCooldown = Math.max(0.3, s.dashCooldown);
      this._stats = s;
      this.statsDirty = false;
      this.hp = Math.min(this.hp, s.maxHp);
      this.shield = Math.min(this.shield, s.maxShield);
      return s;
    }
    ammoMax(type) {
      return Math.round((AMMO_MAX[type] || 0) * this.stats().ammoMul);
    }
    addAmmo(type, n) {
      const before = this.ammo[type] || 0;
      this.ammo[type] = Math.min(this.ammoMax(type), before + n);
      return this.ammo[type] - before;
    }
    currentWeapon() {
      const id = this.weapons[this.weaponIdx];
      return id ? LM.get('weapons', id) : null;
    }
    /** Can the player fight right now? (A level may declare armed: false.) */
    isArmed(game) {
      return this.weapons.length > 0 && !(game && game.level && game.level.def.armed === false);
    }
    /** The gadget shown in hand when unarmed (the first one that can be held). */
    heldGadget() {
      for (const id of this.gadgets) {
        const g = LM.get('gadgets', id);
        if (g.drawHeld || g.primary) return g;
      }
      return null;
    }
    hasGadget(id) {
      return this.gadgets.includes(id);
    }
    /** A timed stat modifier. Re-adding the same id refreshes it. */
    addBuff(id, name, mods, seconds) {
      this.buffs = this.buffs.filter((b) => b.id !== id);
      this.buffs.push({ id, name, mods, t: seconds });
      this.statsDirty = true;
    }
    hasWeapon(id) {
      return this.weapons.includes(id);
    }
    giveWeapon(id, game) {
      const w = LM.get('weapons', id);
      if (this.hasWeapon(id)) {
        if (w.ammo) this.addAmmo(w.ammo, w.pickupAmmo || 10);
        return 'ammo';
      }
      this.weapons.push(id);
      this.weapons.sort((a, b) => (LM.get('weapons', a).slot || 9) - (LM.get('weapons', b).slot || 9));
      if (this.weapons.length === 1) this.weaponIdx = -1;
      if (w.ammo) this.addAmmo(w.ammo, w.pickupAmmo || 10);
      this.switchTo(this.weapons.indexOf(id), game);
      return 'new';
    }
    switchTo(i, game) {
      if (i < 0 || i >= this.weapons.length || i === this.weaponIdx) return;
      if (this.weaponIdx < 0) this.weaponIdx = 0;
      this.lastWeaponIdx = this.weaponIdx;
      this.weaponIdx = i;
      this.fireCd = Math.max(this.fireCd, 0.12);
      LM.audio.play('switch');
    }
    /** Put on an armour piece. The old piece goes to the bag. */
    equipArmor(id) {
      const a = LM.get('armor', id);
      const old = this.equip[a.slot];
      this.equip[a.slot] = id;
      const bi = this.bag.indexOf(id);
      if (bi >= 0) this.bag.splice(bi, 1);
      if (old) this.bag.push(old);
      this.statsDirty = true;
      const st = this.stats();
      if (a.mods && a.mods.maxShield) this.shield = Math.min(st.maxShield, this.shield + a.mods.maxShield * 0.5);
      return old;
    }
    unequip(slot) {
      const id = this.equip[slot];
      if (!id) return;
      this.equip[slot] = null;
      this.bag.push(id);
      this.statsDirty = true;
      this.stats();
    }

    // ---------------------------------------------------- update
    update(dt, game) {
      const I = LM.input, L = game.level;
      const st = this.stats();
      this.fireCd -= dt;
      this.dashCd -= dt;
      this.invuln -= dt;
      this.hazardCd -= dt;
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.8);
      this.shieldFlash = Math.max(0, this.shieldFlash - dt);
      this.shieldDelay -= dt;
      this.recoil = U.damp(this.recoil, 0, 7, dt);
      this.emptyWarn -= dt;
      this.gadgetCd -= dt;
      if (this.buffs.length) {
        for (const b of this.buffs) b.t -= dt;
        const gone = this.buffs.filter((b) => b.t <= 0);
        if (gone.length) {
          this.buffs = this.buffs.filter((b) => b.t > 0);
          this.statsDirty = true;
          for (const b of gone) if (b.name) game.toast(b.name + ' wore off');
        }
      }

      const m = game.renderer.screenToWorld(I.mouse.x, I.mouse.y, game.cam);
      this.aim = Math.atan2(m.y - this.y, m.x - this.x);
      this.aimDist = Math.hypot(m.x - this.x, m.y - this.y);

      if (this.falling > 0) {
        this.falling -= dt;
        if (this.falling <= 0) this.finishFall(game);
        return;
      }

      // movement
      let ix = (I.down('KeyD') || I.down('ArrowRight') ? 1 : 0) - (I.down('KeyA') || I.down('ArrowLeft') ? 1 : 0);
      let iy = (I.down('KeyS') || I.down('ArrowDown') ? 1 : 0) - (I.down('KeyW') || I.down('ArrowUp') ? 1 : 0);
      if (ix && iy) {
        ix *= Math.SQRT1_2;
        iy *= Math.SQRT1_2;
      }
      const tile = L.tileAtWorld(this.x, this.y);
      const swim = !!tile.swim;
      if (swim !== this.swimming) {
        this.swimming = swim;
        LM.audio.play('splash');
        game.particles.burst(this.x, this.y, 8, { type: 'dot', color: '#bfe8ee', speed: 90, life: 0.4, size: [0.8, 1.6] });
        game.particles.add({ type: 'ripple', x: this.x, y: this.y, life: 0.8, size: 6, grow: 18 });
      }
      const speed = st.speed * (swim ? st.swimMul : 1) * (tile.speedMul || 1);
      if (this.dashT > 0) {
        this.dashT -= dt;
        if (Math.random() < 0.9) this.trail.push({ x: this.x, y: this.y, a: this.aim, life: 0.18 });
      } else {
        const rate = ix || iy ? 16 : 11;
        this.vx = U.damp(this.vx, ix * speed, rate, dt);
        this.vy = U.damp(this.vy, iy * speed, rate, dt);
      }
      if (I.anyHit('ShiftLeft', 'ShiftRight', 'Space') && this.dashCd <= 0 && !swim) {
        let dx = ix, dy = iy;
        if (!dx && !dy) {
          dx = Math.cos(this.aim);
          dy = Math.sin(this.aim);
        }
        const l = Math.hypot(dx, dy) || 1;
        const ds = st.speed * 3.4;
        this.vx = (dx / l) * ds;
        this.vy = (dy / l) * ds;
        this.dashT = 0.15;
        this.dashCd = st.dashCooldown;
        this.invuln = Math.max(this.invuln, 0.2);
        LM.audio.play('dash');
        game.particles.burst(this.x, this.y, 6, { type: 'smoke', color: '#8f8a80', speed: 40, life: 0.5, size: 3, alpha: 0.3 });
      }
      for (const tr of this.trail) tr.life -= dt;
      this.trail = this.trail.filter((t) => t.life > 0);

      LM.physics.move(L, this, this.vx * dt, this.vy * dt);
      game.pushOutOfItems(this);

      const moving = Math.hypot(this.vx, this.vy);
      this.walk += moving * dt * 0.09;
      if (swim && moving > 30 && Math.random() < dt * 8) {
        game.particles.add({ type: 'ripple', x: this.x + U.rand(-4, 4), y: this.y + U.rand(-4, 4), life: 0.9, size: 4, grow: 14 });
      }

      this.checkHazards(game, dt);

      // weapon switching
      for (let n = 1; n <= 9; n++) if (I.hit('Digit' + n) && this.weapons[n - 1]) this.switchTo(n - 1, game);
      if (I.wheel && this.weapons.length) this.switchTo((this.weaponIdx + (I.wheel > 0 ? 1 : -1) + this.weapons.length) % this.weapons.length, game);
      if (I.hit('KeyQ')) this.switchTo(this.lastWeaponIdx, game);

      // firing
      const w = this.currentWeapon();
      if (!this.isArmed(game)) {
        const gd = this.heldGadget();
        if (I.mouse.clicked && gd && gd.primary && this.gadgetCd <= 0 && game.state === 'play') gd.primary(game, this);
      } else if (I.mouse.down && this.fireCd <= 0 && game.state === 'play') {
        const per = w.ammoPerShot || 1;
        if (w.ammo && (this.ammo[w.ammo] || 0) < per) {
          if (this.emptyWarn <= 0) {
            LM.audio.play('empty');
            game.toast('Out of ' + LM.AMMO_NAMES[w.ammo].toLowerCase(), 'warn');
            this.emptyWarn = 1.2;
            this.fireCd = 0.25;
            if (this.weaponIdx !== 0) game.schedule(0.25, () => this.switchTo(0, game));
          }
        } else {
          if (w.ammo) this.ammo[w.ammo] -= per;
          this.fireCd = 1 / w.fireRate;
          LM.combat.fireWeapon(game, this, w, this.aim);
          game.stats.shots++;
        }
      }

      // shield regeneration
      if (st.maxShield > 0 && st.shieldRegen > 0 && this.shieldDelay <= 0 && this.shield < st.maxShield) {
        this.shield = Math.min(st.maxShield, this.shield + st.shieldRegen * dt);
      }
    }

    checkHazards(game, dt) {
      const L = game.level;
      const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T);
      const d = L.t(tx, ty);
      if (d.hazard === 'pit') {
        if (this.dashT <= 0) this.startFall(game);
        return;
      }
      if (d.hazard && this.hazardCd <= 0 && (!d.active || d.active(game, tx, ty))) {
        this.hazardCd = d.interval || 0.6;
        const saved = this.invuln;
        this.invuln = 0;
        LM.combat.hurt(game, this, d.damage || 10, { source: 'hazard', type: 'hazard' });
        this.invuln = Math.max(this.invuln, saved);
        if (d.onHurt) d.onHurt(game, this);
      }
      // remember a safe spot (no hazard under any edge of the body)
      if (!d.hazard && !d.swim) {
        let safe = true;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const n = L.tileAtWorld(this.x + ox * (this.r + 6), this.y + oy * (this.r + 6));
          if (n.hazard === 'pit') safe = false;
        }
        if (safe) {
          this.lastSafe.x = this.x;
          this.lastSafe.y = this.y;
        }
      }
    }
    startFall(game) {
      this.falling = 0.6;
      this.vx = this.vy = 0;
      LM.audio.play('fall');
    }
    finishFall(game) {
      this.falling = 0;
      this.invuln = 0;
      LM.combat.hurt(game, this, 18, { source: 'hazard', type: 'hazard' });
      if (this.dead) return;
      this.x = this.lastSafe.x;
      this.y = this.lastSafe.y;
      this.invuln = 1.2;
      game.toast('You climb back out of the pit', 'warn');
    }

    // ---------------------------------------------------- drawing
    drawShadow(ctx) {
      const k = this.falling > 0 ? this.falling / 0.6 : 1;
      if (!this.swimming) G.shadow(ctx, this.x, this.y, this.r * k);
    }
    draw(ctx, game, t) {
      const w = this.currentWeapon();
      const body = this.equip.body ? LM.get('armor', this.equip.body) : null;
      const head = this.equip.head ? LM.get('armor', this.equip.head) : null;
      const coat = body ? body.color : '#4d5a6e';
      const k = this.falling > 0 ? Math.max(0.05, this.falling / 0.6) : 1;
      if (this.invuln > 0 && this.dashT <= 0 && this.invuln < 1.2 && Math.floor(t * 20) % 2 === 0 && this.hurtFlash < 0.05) return;

      // dash after-images
      for (const tr of this.trail) {
        ctx.fillStyle = 'rgba(210,190,150,' + tr.life * 1.4 + ')';
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, this.r * 0.9, 0, U.TAU);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(k, k);
      if (this.falling > 0) ctx.rotate((1 - k) * 4);

      // feet
      const sp = Math.hypot(this.vx, this.vy);
      const stride = Math.sin(this.walk * 2.2) * Math.min(1, sp / 120) * 4;
      const ma = sp > 10 ? Math.atan2(this.vy, this.vx) : this.aim;
      const feet = this.equip.feet ? LM.get('armor', this.equip.feet).color : '#2a2622';
      ctx.fillStyle = feet;
      for (const side of [-1, 1]) {
        const fx = Math.cos(ma) * stride * side + Math.cos(ma + Math.PI / 2) * 4 * side;
        const fy = Math.sin(ma) * stride * side + Math.sin(ma + Math.PI / 2) * 4 * side;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 3.4, 2.4, ma, 0, U.TAU);
        ctx.fill();
      }

      ctx.rotate(this.aim);
      // held weapon (drawn under the torso's leading arm)
      const armed = this.isArmed(game);
      const kick = armed ? Math.max(0, this.fireCd) * (w.kickBack || 10) * w.fireRate * 0.5 : 0;
      if (!armed) {
        const gd = this.heldGadget();
        if (gd && gd.drawHeld) gd.drawHeld(ctx, this, game, t);
      } else if (w.drawHeld) w.drawHeld(ctx, this, kick);
      else {
        ctx.fillStyle = '#2b2b30';
        ctx.fillRect(4 - kick, -2, w.length || 14, 4);
      }
      // torso / shoulders
      ctx.fillStyle = U.shade(coat, -0.35);
      ctx.beginPath();
      ctx.ellipse(-1, 0, 7.5, 10.5, 0, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.ellipse(-0.5, 0, 6.5, 9.4, 0, 0, U.TAU);
      ctx.fill();
      if (body && body.trim) {
        ctx.strokeStyle = body.trim;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-0.5, 0, 5, 8, 0, -1.2, 1.2);
        ctx.stroke();
      }
      // arms reaching to the weapon
      ctx.fillStyle = U.shade(coat, -0.15);
      ctx.beginPath();
      ctx.ellipse(5 - kick * 0.5, 4.2, 4, 2.4, -0.3, 0, U.TAU);
      ctx.ellipse(5 - kick * 0.5, -4.2, 4, 2.4, 0.3, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = '#d9b48f';
      ctx.beginPath();
      ctx.arc(8.5 - kick * 0.5, 2.6, 1.9, 0, U.TAU);
      ctx.fill();
      // head
      const hc = head ? head.color : '#2e2a27';
      ctx.fillStyle = '#d9b48f';
      ctx.beginPath();
      ctx.arc(0.5, 0, 4.6, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = hc;
      ctx.beginPath();
      ctx.arc(-0.6, 0, 4.9, Math.PI * 0.42, Math.PI * 1.58);
      ctx.fill();
      if (head && head.lamp) {
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(3, -1.4, 2.2, 2.8);
      }
      ctx.restore();

      // water line
      if (this.swimming) {
        const env = game.level.env;
        ctx.fillStyle = U.rgba(env.water ? env.water.deep : '#123', 0.55);
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 3, this.r * 1.25, this.r * 0.85, 0, 0, U.TAU);
        ctx.fill();
      }
      if (this.hurtFlash > 0.4) {
        ctx.fillStyle = 'rgba(255,90,80,' + (this.hurtFlash - 0.4) + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 1, 0, U.TAU);
        ctx.fill();
      }
    }
    drawGlow(ctx, game, t) {
      if (!this.isArmed(game)) {
        const gd = this.heldGadget();
        if (gd && gd.drawGlow) {
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.rotate(this.aim);
          gd.drawGlow(ctx, this, game, t);
          ctx.restore();
        }
      }
      const st = this.stats();
      if (this.shieldFlash > 0 || (st.maxShield > 0 && this.shield > 0)) {
        const a = this.shieldFlash > 0 ? this.shieldFlash * 2.5 : 0.12 + 0.05 * Math.sin(t * 3);
        ctx.strokeStyle = 'rgba(92,200,232,' + Math.min(0.9, a) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 4, 0, U.TAU);
        ctx.stroke();
      }
      const head = this.equip.head ? LM.get('armor', this.equip.head) : null;
      if (head && head.lamp) {
        LM.gfx.glow(ctx, this.x + Math.cos(this.aim) * 5, this.y + Math.sin(this.aim) * 5, 7, '#fff0b0', 0.7);
      }
      if (this.dashCd > 0 && this.dashCd < 0.1) LM.gfx.glow(ctx, this.x, this.y, 18, '#e8be6e', 0.35);
    }
  }
  LM.Player = Player;
  LM.PLAYER_BASE = BASE;
})();
