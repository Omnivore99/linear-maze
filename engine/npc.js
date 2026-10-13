/* The Linear Maze — engine/npc.js
 * Non-hostile characters. An NPC has a look (drawn by LM.gfx.person unless the
 * def supplies draw), a movement behaviour, ambient barks shown as speech
 * bubbles, and an optional dialog tree opened with E (see LM.ui.dialog).
 *
 * NPC def fields:
 *   name, role, look { skin, hair, hairStyle, shirt, pants, shoes, tie, lanyard, blazer,
 *                      glasses, headset, beard, holding, bg }
 *   behavior: 'stand' | 'sit' | 'wander' | 'pace' | 'face-wall' | 'spin' (or a pack-defined one)
 *   face: 'n' | 'e' | 's' | 'w' | radians     speed, radius (body), roam (wander range, tiles), reach (extra talk range, px)
 *   barks: [lines] | (npc, game) => [lines]   barkRange, barkMin, barkMax
 *   flashBarks: [lines]                       said when the phone camera flashes nearby
 *   dialog: { start, again?, nodes }          see LM.ui.dialog
 *   mood (portrait default), spectral (only visible during a camera flash), onFlash(npc, game)
 *   init, update, draw(g, npc, t, game) optional overrides
 * Placement props override any of these per instance (name, role, look, behavior, face, barks, dialog, radius, roam, to, ox, oy).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const DIR = (LM.DIR = { e: 0, s: Math.PI / 2, w: Math.PI, n: -Math.PI / 2 });
  const angleOf = (f, fallback) => (typeof f === 'string' ? DIR[f] : f != null ? f : fallback);

  // ------------------------------------------------------------ behaviours
  const B = (LM.npcBehaviors = {
    stand(n) {
      n.wantFace = n.baseFacing;
    },
    sit(n) {
      n.sitting = true;
      n.wantFace = n.baseFacing;
    },
    'face-wall'(n) {
      n.wantFace = n.baseFacing + Math.sin(n.t * 7) * 0.05;
      n.ignoresPlayer = true;
    },
    spin(n) {
      n.wantFace = n.t * 0.9;
      n.ignoresPlayer = true;
    },
    wander(n, dt, game) {
      const L = game.level, R = (n.props.roam || n.def.roam || 3) * T;
      if (!n.mem.target) {
        n.mem.wait = (n.mem.wait == null ? U.rand(0, 3) : n.mem.wait) - dt;
        n.wantFace = n.facing;
        if (n.mem.wait > 0) return;
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * U.TAU, d = Math.random() * R;
          const x = n.home.x + Math.cos(a) * d, y = n.home.y + Math.sin(a) * d;
          const tx = Math.floor(x / T), ty = Math.floor(y / T);
          if (!L.solidAt(tx, ty) && !L.t(tx, ty).hazard && LM.physics.los(L, n.x, n.y, x, y, 'shot')) {
            n.mem.target = { x, y };
            break;
          }
        }
        n.mem.wait = U.rand(1.5, 4);
        return;
      }
      const dx = n.mem.target.x - n.x, dy = n.mem.target.y - n.y, d = Math.hypot(dx, dy);
      const P = game.player;
      const blocked = P && n.distP < n.r + P.r + 8 && (dx * (P.x - n.x) + dy * (P.y - n.y)) > 0;
      n.mem.stuck = n.hitWall ? (n.mem.stuck || 0) + dt : 0;
      if (d < 6 || n.mem.stuck > 0.4 || blocked) {
        n.mem.target = null;
        return;
      }
      n.mx = dx / d;
      n.my = dy / d;
    },
    pace(n, dt, game) {
      const to = n.props.to || [3, 0];
      const a = n.home, b = { x: n.home.x + to[0] * T, y: n.home.y + to[1] * T };
      if (n.mem.leg == null) n.mem.leg = 1;
      if (n.mem.wait > 0) {
        n.mem.wait -= dt;
        n.wantFace = n.facing;
        return;
      }
      const tgt = n.mem.leg ? b : a;
      const dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
      if (d < 5 || (n.hitWall && n.mem.walked > 0.3)) {
        n.mem.leg = 1 - n.mem.leg;
        n.mem.wait = n.props.pause != null ? n.props.pause : U.rand(1, 2.5);
        n.mem.walked = 0;
        return;
      }
      n.mem.walked = (n.mem.walked || 0) + dt;
      n.mx = dx / d;
      n.my = dy / d;
    },
  });

  // ------------------------------------------------------------ NPC
  class NPC {
    constructor(game, def, tx, ty, props, tag) {
      this.isNPC = true;
      this.def = def;
      this.props = Object.assign({}, def.props || {}, props || {});
      this.tag = tag;
      this.x = tx * T + T / 2 + (this.props.ox || 0);
      this.y = ty * T + T / 2 + (this.props.oy || 0);
      this.home = { x: this.x, y: this.y };
      this.r = this.props.radius || def.radius || 9;
      this.reach = this.props.reach || def.reach || 0;
      this.baseFacing = angleOf(this.props.face != null ? this.props.face : def.face, Math.PI / 2);
      this.facing = this.baseFacing;
      this.wantFace = this.baseFacing;
      this.behavior = this.props.behavior || def.behavior || 'stand';
      this.name = this.props.name || def.name || 'Someone';
      this.role = this.props.role || def.role || '';
      this.look = Object.assign({}, def.look || {}, this.props.look || {});
      this.vx = this.vy = this.mx = this.my = 0;
      this.t = Math.random() * 10;
      this.walk = 0;
      this.mem = {};
      this.said = new Set();
      this.seeLos = false;
      this.losT = Math.random() * 0.2;
      this.distP = 9999;
      this.visible = false;
      this.vis = 0;
      this.bubble = null;
      this.barkT = U.rand(1.5, 6);
      this.dead = false;
      this.z = 0;
      this.sitting = this.behavior === 'sit';
      // someone sitting at a desk can be talked to across it
      if (this.sitting && !this.reach) this.reach = 18;
      if (def.init) def.init(this, game);
    }
    dialog() {
      return this.props.dialog || this.def.dialog || null;
    }
    canInteract() {
      return !this.def.spectral && !!this.dialog();
    }
    prompt() {
      return 'Talk to ' + this.name;
    }
    use(game) {
      LM.ui.dialog(game, this);
    }
    say(text, seconds) {
      const d = seconds || U.clamp(1.8 + text.length * 0.05, 2.2, 5.5);
      this.bubble = { text, t: d, max: d };
    }
    bark(game) {
      const src = this.props.barks || this.def.barks;
      const list = typeof src === 'function' ? src(this, game) : src;
      if (!list || !list.length) return;
      let line = U.pick(list);
      if (list.length > 1 && line === this.lastBark) line = U.pick(list.filter((l) => l !== this.lastBark));
      this.lastBark = line;
      this.say(line);
    }
    update(dt, game) {
      const P = game.player, L = game.level, def = this.def;
      this.t += dt;
      this.losT -= dt;
      this.distP = P ? U.dist(this.x, this.y, P.x, P.y) : 9999;
      if (this.losT <= 0) {
        this.losT = 0.12 + Math.random() * 0.06;
        this.seeLos = !!P && this.distP < 900 && LM.physics.los(L, this.x, this.y, P.x, P.y);
      }
      this.visible = def.spectral ? game.flashT > 0 && this.seeLos : this.seeLos || this.distP < this.r + 30;
      this.vis = U.approach(this.vis, this.visible ? 1 : 0, dt * (def.spectral ? (this.visible ? 30 : 2.5) : 6));
      if (this.bubble) {
        this.bubble.t -= dt;
        if (this.bubble.t <= 0) this.bubble = null;
      }
      this.barkT -= dt;
      if (this.barkT <= 0 && !this.bubble && this.seeLos && this.distP < (def.barkRange || 160) && game.state === 'play') {
        // one speaker at a time in any small group, so bubbles don't pile up
        const crowded = game.npcs.some((o) => o !== this && o.bubble && U.dist2(o.x, o.y, this.x, this.y) < 120 * 120);
        if (!crowded) this.bark(game);
        this.barkT = crowded ? U.rand(1, 3) : U.rand(def.barkMin || 7, def.barkMax || 15);
      }

      this.mx = this.my = 0;
      this.ignoresPlayer = !!def.ignoresPlayer;
      (B[this.behavior] || B.stand)(this, dt, game);

      const l = Math.hypot(this.mx, this.my);
      const sp = (this.props.speed || def.speed || 55) * (l > 0.01 ? 1 : 0);
      this.vx = U.damp(this.vx, l > 0.01 ? (this.mx / l) * sp : 0, 8, dt);
      this.vy = U.damp(this.vy, l > 0.01 ? (this.my / l) * sp : 0, 8, dt);
      const moving = Math.hypot(this.vx, this.vy) > 4;
      if (moving && !this.sitting) {
        this.hitWall = LM.physics.move(L, this, this.vx * dt, this.vy * dt);
        game.pushOutOfItems(this);
        if (P && !P.dead) {
          const dx = this.x - P.x, dy = this.y - P.y, d = Math.hypot(dx, dy), rr = this.r + P.r;
          if (d < rr && d > 0.01) {
            this.x = P.x + (dx / d) * rr;
            this.y = P.y + (dy / d) * rr;
          }
        }
        this.walk += sp * dt * 0.09;
      }
      // face where we walk; otherwise our resting direction, or the player when they come close
      let want = moving ? Math.atan2(this.vy, this.vx) : this.wantFace;
      if (!moving && !this.ignoresPlayer && P && this.seeLos && this.distP < 80) {
        const toP = Math.atan2(P.y - this.y, P.x - this.x);
        want = this.sitting ? this.baseFacing + U.clamp(U.angDiff(this.baseFacing, toP), -1.1, 1.1) : toP;
      }
      this.facing += U.angDiff(this.facing, want) * Math.min(1, dt * 6);
      if (def.update) def.update(this, dt, game);
    }

    // ---------------------------------------------------- drawing
    drawShadow(ctx) {
      if (this.vis < 0.05 || this.def.spectral) return;
      G.shadow(ctx, this.x, this.y, this.r * (this.sitting ? 1.1 : 1), 0.3 * this.vis);
    }
    draw(ctx, game, t) {
      if (this.vis < 0.02) return;
      ctx.save();
      ctx.globalAlpha = this.vis * (this.def.alpha || 1);
      ctx.translate(this.x, this.y);
      if (this.def.draw) this.def.draw(ctx, this, t, game);
      else G.person(ctx, this, t);
      ctx.restore();
    }
    drawGlow(ctx, game, t) {
      if (this.def.drawGlow && this.vis > 0.02) {
        ctx.save();
        ctx.globalAlpha = this.vis;
        this.def.drawGlow(ctx, this, t, game);
        ctx.restore();
      }
    }
    drawOverlay(ctx, game, t) {
      if (this.vis < 0.3) return;
      if (this.bubble) {
        const k = Math.min(1, (this.bubble.max - this.bubble.t) * 6, this.bubble.t * 3);
        G.speech(ctx, this.x, this.y - this.r - 10, this.bubble.text, k * this.vis, this.def.bubbleStyle);
      } else if (game.focus === this) {
        G.label(ctx, this.x, this.y - this.r - 9, this.name, this.role);
      }
    }
  }
  LM.NPC = NPC;

  // ------------------------------------------------------------ drawing helpers
  function wrap(ctx, text, maxW) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  /** A speech bubble anchored above (x, y). style: { bg, fg, border } */
  G.speech = function (ctx, x, y, text, alpha, style) {
    if (alpha <= 0.01) return;
    const st = style || {};
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '500 6.4px "IBM Plex Mono", ui-monospace, monospace';
    const lines = wrap(ctx, text, 120);
    const lh = 7.6, pad = 4;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const h = lines.length * lh + pad * 2 - 1.5;
    const bx = x - w / 2, by = y - h - 5;
    ctx.fillStyle = st.bg || 'rgba(246,242,232,0.96)';
    ctx.strokeStyle = st.border || 'rgba(30,26,20,0.55)';
    ctx.lineWidth = 0.6;
    G.roundRect(ctx, bx, by, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 3, by + h - 0.3);
    ctx.lineTo(x, by + h + 4);
    ctx.lineTo(x + 3, by + h - 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = st.fg || '#1b1a17';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, by + pad + i * lh));
    ctx.restore();
  };
  /** A small name tag (name, role) above a character. */
  G.label = function (ctx, x, y, name, role) {
    ctx.save();
    ctx.font = '600 6.6px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(8,9,12,0.85)';
    ctx.strokeText(name, x, y);
    ctx.fillStyle = '#f2ead8';
    ctx.fillText(name, x, y);
    if (role) {
      ctx.font = '500 5.2px "IBM Plex Mono", ui-monospace, monospace';
      ctx.strokeText(role.toUpperCase(), x, y - 7.5);
      ctx.fillStyle = '#e0b25a';
      ctx.fillText(role.toUpperCase(), x, y - 7.5);
    }
    ctx.restore();
  };

  /** Top-down person in local space (origin at the body centre). Uses npc.look, npc.facing, npc.sitting, npc.walk. */
  G.person = function (g, n, t) {
    const L = n.look || {};
    const skin = L.skin || '#c8946e', hair = L.hair || '#2a1e16', shirt = L.shirt || '#5a6a80';
    const pants = L.pants || '#2a2e38', shoes = L.shoes || '#1c1a18';
    const moving = Math.hypot(n.vx || 0, n.vy || 0) > 5;
    if (n.sitting) {
      g.save();
      g.rotate(n.baseFacing);
      g.fillStyle = '#17181c';
      g.beginPath();
      g.arc(-1, 0, 9.5, 0, U.TAU);
      g.fill();
      g.fillStyle = L.chair || '#2d3038';
      G.roundRect(g, -13, -9, 5, 18, 2);
      g.fill();
      g.restore();
    }
    g.rotate(n.facing);
    if (n.sitting) {
      g.fillStyle = pants;
      g.fillRect(2, -4.6, 8, 3.4);
      g.fillRect(2, 1.2, 8, 3.4);
      g.fillStyle = shoes;
      g.fillRect(9, -4.6, 2.6, 3.4);
      g.fillRect(9, 1.2, 2.6, 3.4);
    } else {
      const stride = moving ? Math.sin((n.walk || 0) * 2.2) * 3.5 : 0;
      g.fillStyle = shoes;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(stride * side, 3.6 * side, 3.2, 2.2, 0, 0, U.TAU);
        g.fill();
      }
    }
    // torso
    g.fillStyle = U.shade(shirt, -0.35);
    g.beginPath();
    g.ellipse(-1, 0, 6.8, 9.6, 0, 0, U.TAU);
    g.fill();
    g.fillStyle = shirt;
    g.beginPath();
    g.ellipse(-0.6, 0, 5.9, 8.7, 0, 0, U.TAU);
    g.fill();
    if (L.blazer) {
      g.strokeStyle = L.blazer;
      g.lineWidth = 2.4;
      g.beginPath();
      g.ellipse(-0.6, 0, 5, 7.8, 0, 0.45, U.TAU - 0.45);
      g.stroke();
    }
    if (L.tie) {
      g.fillStyle = L.tie;
      g.beginPath();
      g.moveTo(2.2, -0.9);
      g.lineTo(5.4, 0);
      g.lineTo(2.2, 0.9);
      g.closePath();
      g.fill();
    }
    if (L.lanyard) {
      g.strokeStyle = L.lanyard;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(1, -3.5);
      g.lineTo(4.5, 0);
      g.lineTo(1, 3.5);
      g.stroke();
      g.fillStyle = '#f4f1ea';
      g.fillRect(4.2, -1, 1.6, 2);
    }
    // arms and whatever they hold
    const sway = moving ? Math.sin((n.walk || 0) * 2.2) * 1.2 : 0;
    g.fillStyle = U.shade(shirt, -0.12);
    g.beginPath();
    g.ellipse(3.5 + sway, 6.2, 3.8, 2.2, 0.2, 0, U.TAU);
    g.ellipse(3.5 - sway, -6.2, 3.8, 2.2, -0.2, 0, U.TAU);
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.arc(7 + sway, 6, 1.6, 0, U.TAU);
    g.arc(7 - sway, -6, 1.6, 0, U.TAU);
    g.fill();
    if (L.holding) G.held(g, L.holding, t);
    // head
    g.fillStyle = skin;
    g.beginPath();
    g.arc(0.6, 0, 4.4, 0, U.TAU);
    g.fill();
    const hs = L.hairStyle || 'short';
    g.fillStyle = hair;
    if (hs === 'long') {
      g.beginPath();
      g.ellipse(-4.2, 0, 4.6, 5.6, 0, 0, U.TAU);
      g.fill();
    }
    if (hs === 'ponytail') {
      g.beginPath();
      g.ellipse(-6.4, 0, 3.2, 1.7, 0, 0, U.TAU);
      g.fill();
    }
    if (hs === 'bun') {
      g.beginPath();
      g.arc(-5.4, 0, 2.5, 0, U.TAU);
      g.fill();
    }
    if (hs === 'curly') {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.45 + (i / 8) * Math.PI * 1.1;
        g.beginPath();
        g.arc(0.4 + Math.cos(a) * 3.9, Math.sin(a) * 3.9, 2, 0, U.TAU);
        g.fill();
      }
    } else if (hs !== 'bald') {
      g.beginPath();
      g.arc(-0.4, 0, hs === 'buzz' ? 4.5 : 4.8, Math.PI * 0.4, Math.PI * 1.6);
      g.closePath();
      if (hs === 'buzz') g.globalAlpha *= 0.6;
      g.fill();
      if (hs === 'buzz') g.globalAlpha /= 0.6;
    } else {
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.arc(-0.6, -1, 1.6, 0, U.TAU);
      g.fill();
    }
    if (L.glasses) {
      g.strokeStyle = L.glasses === true ? '#141418' : L.glasses;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(4.6, -2.6);
      g.lineTo(4.6, 2.6);
      g.stroke();
    }
    if (L.headset) {
      g.strokeStyle = '#141418';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(0.4, 0, 4.9, -Math.PI / 2 - 0.2, Math.PI / 2 + 0.2, true);
      g.stroke();
      g.beginPath();
      g.moveTo(0.6, 4.6);
      g.lineTo(4.8, 2.6);
      g.stroke();
    }
  };
  /** Small held props: 'mug', 'clipboard', 'phone', 'papers', 'coffee', 'tablet'. */
  G.held = function (g, what, t) {
    if (what === 'mug' || what === 'coffee') {
      g.fillStyle = what === 'coffee' ? '#e8e2d4' : '#b84a3a';
      g.beginPath();
      g.arc(9, 6, 2.2, 0, U.TAU);
      g.fill();
      g.fillStyle = '#3a2416';
      g.beginPath();
      g.arc(9, 6, 1.3, 0, U.TAU);
      g.fill();
    } else if (what === 'clipboard' || what === 'tablet') {
      g.fillStyle = what === 'tablet' ? '#1a1c22' : '#8a6a42';
      g.fillRect(6.5, -4, 5, 8);
      g.fillStyle = what === 'tablet' ? '#5aa0c8' : '#f4f1ea';
      g.fillRect(7.2, -3.2, 3.6, 6.4);
    } else if (what === 'phone') {
      g.fillStyle = '#121216';
      g.fillRect(7, -2.4, 3, 4.8);
      g.fillStyle = '#8fc8ff';
      g.fillRect(7.4, -2, 2.2, 4);
    } else if (what === 'papers') {
      g.fillStyle = '#f4f1ea';
      g.save();
      g.translate(9, 0);
      g.rotate(0.2);
      g.fillRect(-2.5, -3.5, 5, 7);
      g.restore();
    }
  };
})();
