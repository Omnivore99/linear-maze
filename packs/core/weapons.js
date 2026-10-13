/* The Linear Maze — packs/core/weapons.js
 * Player weapons and every projectile type (player and enemy).
 *
 * Weapon fields:
 *   name, short, slot (sort order), desc
 *   ammo: null (unlimited) | 'shells' | 'rounds' | 'cells' | 'rockets'; ammoPerShot; pickupAmmo
 *   damage, pellets, fireRate (shots/s), spread (radians), bloom (extra spread per recoil)
 *   speed, range (units or 'cursor'), maxRange, falloff (0..1 damage loss at max range), pierce
 *   projectile (id), tracer (colour), aoe: { radius, damage, color, selfDamage }
 *   knock (knockback), recoil (crosshair bloom), kick (screen shake), pushback (shooter shove)
 *   sound, flash (muzzle colour), flashRadius, flashSize, casing, smoke, muzzle (offset)
 *   length, drawHeld(ctx, player, kick)   how it looks in the hand (also used for icons)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util;

  const metal = (g, x, y, w, h, c) => {
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, U.shade(c, 0.3));
    grd.addColorStop(0.5, c);
    grd.addColorStop(1, U.shade(c, -0.4));
    g.fillStyle = grd;
    g.fillRect(x, y, w, h);
  };

  const weapons = {
    pistol: {
      name: 'Service Pistol', short: 'Pistol', slot: 1,
      desc: 'Reliable, quick to aim, and it never runs dry.',
      ammo: null, damage: 14, fireRate: 4.2, spread: 0.03, speed: 980, range: 900,
      knock: 55, recoil: 0.32, kick: 0.05, sound: 'pistol', casing: true, flash: '#ffd38a', muzzle: 17, length: 12,
      drawHeld(g, p, k) {
        metal(g, 5 - k, -1.8, 12, 3.6, '#3a3c42');
        g.fillStyle = '#5b3a24';
        g.fillRect(4 - k, -1.2, 4, 3.4);
        g.fillStyle = '#9a9ca2';
        g.fillRect(14 - k, -1.2, 3, 1);
      },
    },
    scattergun: {
      name: 'Scattergun', short: 'Scatter', slot: 2,
      desc: 'Seven pellets per shell. Devastating up close, useless across a room.',
      ammo: 'shells', pickupAmmo: 12, pellets: 7, damage: 8, fireRate: 1.35, spread: 0.2, speed: 820, range: 300, falloff: 0.6,
      projectile: 'pellet', knock: 75, recoil: 1.0, kick: 0.22, pushback: 70, sound: 'scatter', casing: '#b8402a', smoke: true,
      flash: '#ffc070', flashRadius: 160, flashSize: 26, sparks: 7, muzzle: 22, length: 19, kickBack: 6,
      drawHeld(g, p, k) {
        g.fillStyle = '#4a2c1a';
        g.fillRect(2 - k, -2.2, 7, 4.4);
        metal(g, 8 - k, -2.4, 14, 2.2, '#2e3036');
        metal(g, 8 - k, 0.2, 14, 2.2, '#2e3036');
        g.fillStyle = '#6a4630';
        g.fillRect(11 - k, -3, 5, 6);
      },
    },
    'rivet-gun': {
      name: 'Rivet Gun', short: 'Rivets', slot: 3,
      desc: 'A foundry tool someone taught to kill. Sprays hot rivets as long as you hold the trigger.',
      ammo: 'rounds', pickupAmmo: 70, damage: 9, fireRate: 11, spread: 0.06, bloom: 0.05, speed: 1050, range: 800,
      projectile: 'rivet', knock: 30, recoil: 0.16, kick: 0.035, sound: 'smg', casing: '#c9c9c9', flash: '#ffe0a0', flashRadius: 90, muzzle: 21, length: 18,
      drawHeld(g, p, k) {
        metal(g, 4 - k, -2.6, 13, 5.2, '#5a4a2a');
        metal(g, 15 - k, -1.2, 6, 2.4, '#2c2e33');
        g.fillStyle = '#d9a32a';
        g.fillRect(8 - k, -3.4, 4, 1.2);
        g.fillStyle = '#2c2e33';
        g.fillRect(9 - k, 2.6, 3, 3);
      },
    },
    'arc-lance': {
      name: 'Arc Lance', short: 'Lance', slot: 4,
      desc: 'Throws a bolt of bottled lightning that passes through three bodies. Runs on cells; recharge stations refill it.',
      ammo: 'cells', ammoPerShot: 3, pickupAmmo: 30, damage: 30, fireRate: 2.4, spread: 0.008, speed: 1300, range: 1000, pierce: 3,
      projectile: 'arc-bolt', tracer: '#b59cff', knock: 60, recoil: 0.45, kick: 0.1, sound: 'arc', flash: '#a98bff', flashRadius: 140, flashSize: 20, sparks: 6, muzzle: 24, length: 20,
      drawHeld(g, p, k) {
        metal(g, 3 - k, -2.2, 16, 4.4, '#2b2f3c');
        g.fillStyle = '#8f6cf0';
        g.fillRect(7 - k, -3.2, 7, 1);
        g.fillRect(7 - k, 2.2, 7, 1);
        metal(g, 18 - k, -1.4, 5, 2.8, '#6a6f80');
        g.fillStyle = '#d8ccff';
        g.fillRect(22 - k, -0.6, 1.4, 1.2);
      },
    },
    'ember-mortar': {
      name: 'Ember Mortar', short: 'Mortar', slot: 5,
      desc: 'Lobs a charge that bursts where you aim, or on the first thing it hits. Stand clear of the blast.',
      ammo: 'rockets', pickupAmmo: 4, damage: 12, fireRate: 1.1, spread: 0.01, speed: 560, range: 'cursor', maxRange: 440,
      projectile: 'grenade', aoe: { radius: 80, damage: 72, color: '#ff9a4a', selfDamage: 0.35 },
      knock: 40, recoil: 0.8, kick: 0.18, pushback: 45, sound: 'launcher', flash: '#ff9a4a', flashRadius: 130, smoke: true, muzzle: 22, length: 19,
      drawHeld(g, p, k) {
        metal(g, 3 - k, -3.4, 17, 6.8, '#4a3a2c');
        g.fillStyle = '#1c1c20';
        g.beginPath();
        g.arc(20 - k, 0, 3.2, 0, U.TAU);
        g.fill();
        g.fillStyle = '#ff9a4a';
        g.fillRect(9 - k, -4, 3, 1);
      },
    },
  };

  // ------------------------------------------------------------ projectiles
  const projectiles = {
    bullet: { radius: 2, color: '#ffd890', tracer: 18, glow: 6, wallSparks: 4 },
    pellet: { radius: 1.8, color: '#ffc070', tracer: 10, width: 1.2, glow: 4, wallSparks: 2 },
    rivet: { radius: 2, color: '#ffe0a0', tracer: 12, width: 1.3, glow: 5, wallSparks: 3 },
    'arc-bolt': {
      radius: 3.5, color: '#b59cff', sparkColor: '#d8ccff', wallSparks: 8,
      light: { r: 90, color: '#a98bff', intensity: 0.6 },
      drawGlow(g, p, t) {
        const sp = Math.hypot(p.vx, p.vy) || 1, dx = p.vx / sp, dy = p.vy / sp;
        const len = Math.min(42, p.traveled);
        g.strokeStyle = 'rgba(200,180,255,0.9)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(p.x, p.y);
        for (let i = 1; i <= 6; i++) {
          const k = (i / 6) * len;
          const j = (Math.random() - 0.5) * 6;
          g.lineTo(p.x - dx * k - dy * j, p.y - dy * k + dx * j);
        }
        g.stroke();
        LM.gfx.glow(g, p.x, p.y, 16, '#a98bff', 0.9);
        LM.gfx.glow(g, p.x, p.y, 5, '#ffffff', 0.9);
      },
    },
    grenade: {
      radius: 4,
      light: { r: 55, color: '#ff8a3a', intensity: 0.4 },
      draw(g, p, t) {
        g.fillStyle = '#1c1b1e';
        g.beginPath();
        g.arc(p.x, p.y, 3.6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#5a4a3a';
        g.fillRect(p.x - 1, p.y - 3.6, 2, 2);
      },
      drawGlow(g, p, t) {
        LM.gfx.glow(g, p.x, p.y, 10, '#ff8a3a', 0.5 + 0.5 * Math.sin(p.age * 40));
      },
    },
    'enemy-slug': { radius: 3, color: '#ffb050', tracer: 12, width: 2, glow: 8, wallSparks: 3 },
    'enemy-bolt': {
      radius: 4, color: '#ff5a3a',
      light: { r: 70, color: '#ff4a2a', intensity: 0.5 },
      drawGlow(g, p, t) {
        LM.gfx.glow(g, p.x, p.y, 14, '#ff4a2a', 0.85);
        LM.gfx.glow(g, p.x, p.y, 5, '#ffe0c0', 0.9);
      },
    },
    dart: {
      radius: 2, color: '#d8d0c0', tracer: 8, width: 1, glow: 2, wallSparks: 2,
      draw(g, p) {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        g.strokeStyle = '#cfc6b2';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - (p.vx / sp) * 8, p.y - (p.vy / sp) * 8);
        g.stroke();
      },
    },
    'warden-shard': {
      radius: 3.5, color: '#f2c96b',
      light: { r: 60, color: '#f2c96b', intensity: 0.45 },
      drawGlow(g, p) {
        LM.gfx.glow(g, p.x, p.y, 12, '#f2c96b', 0.85);
        LM.gfx.glow(g, p.x, p.y, 4, '#ffffff', 0.8);
      },
    },
  };

  LM.definePack({ id: 'core', weapons, projectiles });
})();
