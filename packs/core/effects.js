/* The Linear Maze — packs/core/effects.js
 * Trap effects. A level's trap lists effects by type; each receives the
 * effect's own settings (ef) and the trap instance (which tracks what it
 * spawned and sealed, so lockdowns can end when the room is cleared).
 *
 *   darts    { tag, volleys, interval, damage, speed }   fire from dart-emitter items with this tag
 *   spawn    { tag, enemy | enemies[], count }           summon enemies at tagged floor tiles
 *   seal     { tag, text }                               slam and lock doors with this tag until the spawned foes die
 *   unseal   { tag, text }                               release doors
 *   open     { tag }                                     unlock and open doors
 *   alarm    { radius, text }                            wake every enemy within radius of the player
 *   lights   { tag, on }                                 switch tagged light sources off or on
 *   explode  { tag, radius, damage, stagger }            blasts at tagged tiles
 *   message  { text, kind }                              a toast
 *   quake    { strength }                                screen shake and falling dust
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;
  const center = (p) => ({ x: p.x * T + T / 2, y: p.y * T + T / 2 });

  const effects = {
    darts: {
      run(game, ef, trap) {
        const emitters = game.items.filter((i) => i.tag === ef.tag && i.def.id === 'dart-emitter' && !i.dead);
        const volleys = ef.volleys || 3, gap = ef.interval || 0.35;
        for (let v = 0; v < volleys; v++) {
          game.schedule(v * gap, () => {
            for (const em of emitters) em.charge = 0.22;
            game.schedule(0.22, () => {
              for (const em of emitters) {
                const ang = Math.atan2(em.face.y, em.face.x) + U.rand(-0.04, 0.04);
                LM.combat.shoot(game, {
                  type: 'dart', x: em.x + em.face.x * 4, y: em.y + em.face.y * 4, angle: ang,
                  speed: ef.speed || 440, owner: 'enemy', damage: ef.damage || 10, range: 700, knock: 30,
                });
              }
              LM.audio.play('dart');
            });
          });
        }
      },
    },
    spawn: {
      run(game, ef, trap) {
        const pts = game.level.tags[ef.tag] || [];
        const list = ef.enemies || [ef.enemy || 'husk'];
        const n = ef.count || pts.length;
        for (let i = 0; i < n; i++) {
          const p = pts[i % pts.length];
          if (!p) break;
          const c = center(p);
          const e = game.spawnEnemy(list[i % list.length], c.x + U.rand(-4, 4), c.y + U.rand(-4, 4), { summoned: true, aggro: true });
          if (e) trap.spawned.push(e);
        }
        LM.audio.play('warn');
      },
    },
    seal: {
      run(game, ef, trap) {
        for (const d of game.doors) {
          if (d.tag !== ef.tag) continue;
          d.sealed = true;
          d.closeT = 0;
          trap.sealed.push(d);
        }
        LM.audio.play('door');
        game.addShake(0.25);
        if (ef.text !== '') game.toast(ef.text || 'The doors slam shut', 'warn');
      },
    },
    unseal: {
      run(game, ef) {
        for (const d of game.doors) if (d.tag === ef.tag) d.sealed = false;
        LM.audio.play('door');
        if (ef.text) game.toast(ef.text, 'good');
      },
    },
    open: {
      run(game, ef) {
        for (const d of game.doors) {
          if (d.tag !== ef.tag) continue;
          d.sealed = false;
          d.unlocked = true;
          d.lock = null;
        }
        LM.audio.play('door');
        if (ef.text) game.toast(ef.text, 'good');
      },
    },
    alarm: {
      run(game, ef) {
        const P = game.player, R = ef.radius || 900;
        for (const e of game.enemies) if (!e.dead && U.dist(e.x, e.y, P.x, P.y) < R) e.alert(game, false);
        LM.audio.play('alarm');
        game.lights.push({ x: P.x, y: P.y, r: 420, color: '#ff2a1a', intensity: 0.5, life: 1.0, max: 1.0 });
        game.toast(ef.text || 'An alarm sounds', 'warn');
      },
    },
    lights: {
      run(game, ef) {
        for (const li of game.staticLights) if (li.tag === ef.tag) li.off = !ef.on;
        LM.audio.play(ef.on ? 'altar' : 'fall');
        if (ef.text) game.toast(ef.text, ef.on ? 'good' : 'warn');
      },
    },
    explode: {
      run(game, ef) {
        const pts = game.level.tags[ef.tag] || [];
        pts.forEach((p, i) => {
          game.schedule(i * (ef.stagger || 0.15), () => {
            const c = center(p);
            LM.combat.explode(game, c.x, c.y, { radius: ef.radius || 60, damage: ef.damage || 30, owner: 'enemy' });
          });
        });
      },
    },
    message: {
      run(game, ef) {
        game.toast(ef.text, ef.kind);
      },
    },
    terrain: {
      // { tag, terrain }: change every tagged tile (a door appears, a wall closes, a floor gives way)
      run(game, ef) {
        const pts = game.level.tags[ef.tag] || [];
        const P = game.player;
        for (const p of pts) {
          const busy = P && Math.abs(P.x - (p.x * T + T / 2)) < T / 2 + P.r && Math.abs(P.y - (p.y * T + T / 2)) < T / 2 + P.r;
          if (busy && ef.terrain && LM.get('terrain', ef.terrain).solid) {
            game.schedule(0.5, () => effects.terrain.run(game, ef));
            return;
          }
        }
        for (const p of pts) game.setTerrain(p.x, p.y, ef.terrain, ef.doorTag || ef.tag);
        if (ef.sound !== false) LM.audio.play(ef.sound || 'door');
      },
    },
    flag: {
      // { name }: set a story flag (which can itself trigger 'flag' traps)
      run(game, ef) {
        game.setFlag(ef.name);
      },
    },
    ambient: {
      // { ambient, outsideSight, time }: fade the floor's darkness (hex colours)
      run(game, ef) {
        const L = game.level, env = L.env;
        const from = { a: L.ambientHex || env.ambient, o: L.outsideHex || env.outsideSight || '#3a3c46' };
        const to = { a: ef.ambient || from.a, o: ef.outsideSight || from.o };
        L.ambientHex = to.a;
        L.outsideHex = to.o;
        const time = ef.time == null ? 1.2 : ef.time, steps = Math.max(1, Math.round(time * 12));
        for (let i = 1; i <= steps; i++) {
          game.schedule((time * i) / steps, () => {
            L.ambient = U.mix(from.a, to.a, i / steps);
            L.outsideSight = U.mix(from.o, to.o, i / steps);
          });
        }
      },
    },
    flicker: {
      // { tag?, radius?, time, strength }: lights stutter for a while (tagged lights, or all within radius of the player)
      run(game, ef) {
        const P = game.player, R = ef.radius || 600, time = ef.time || 1.5;
        const hit = game.staticLights.filter((li) => (ef.tag ? li.tag === ef.tag : P && U.dist(li.x, li.y, P.x, P.y) < R));
        for (const li of hit) {
          if (li.baseFlicker == null) li.baseFlicker = li.flicker;
          li.flicker = ef.strength || 0.95;
        }
        game.schedule(time, () => {
          for (const li of hit) li.flicker = li.baseFlicker;
        });
        LM.audio.play('warn', { vol: 0.5 });
      },
    },
    quake: {
      run(game, ef) {
        game.addShake(ef.strength || 0.5);
        LM.audio.play('explode', { vol: 0.4 });
        const v = game.renderer.view;
        if (v) for (let i = 0; i < 30; i++) game.particles.add({ type: 'smoke', x: U.rand(v.x0, v.x1), y: U.rand(v.y0, v.y1), vy: 20, life: 1.5, size: 3, color: '#8a8070', alpha: 0.25, drag: 1 });
      },
    },
  };

  LM.definePack({ id: 'core', effects });
})();
