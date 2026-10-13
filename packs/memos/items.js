/* The Linear Maze — packs/memos/items.js
 * Memos pack, part 3: the things on the walls and desks.
 *
 *   memo-poster   wall-mounted motivational poster      props: { poster: id }
 *   memo-notice   wall-mounted notice                   props: { notice: id } or { arrow: 'n'|'e'|'s'|'w', title?, text? }
 *   memo-board    a message board of several notices    props: { board: id, w: tiles along the wall }
 *   memo-camera   a security camera in a corner         props: { corner: 'l' | 'r' } (which end of the wall tile)
 *   desk-toy      something on a desk                   props: { toy: id }
 *
 * Wall-mounted pieces take props.face ('n' 'e' 's' 'w') like the Office pack's.
 * On a floor with `honest: true` (Chessboard 1) every poster, notice and
 * camera switches to its honest version (see content.js).
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE, G = LM.gfx;
  const MEMOS = LM.MEMOS;
  const h = (...a) => LM.ui.h(...a);
  const honest = (game) => !!(game && game.level && game.level.def.honest);
  MEMOS.honest = honest;
  const wallRot = (it) => Math.atan2(it.face.y, it.face.x);
  const facesSouth = (it) => it.face && it.face.y === 1;

  /** Something flat on a wall: on the visible front face of a south-facing wall, or a thin edge on the others. */
  function wallPlate(g, it, w, color, inner) {
    if (facesSouth(it)) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(-w / 2 + 0.6, -10.4, w, 9.6);
      g.fillStyle = color;
      g.fillRect(-w / 2, -11, w, 9.4);
      if (inner) inner(g, -w / 2, -11, w, 9.4);
      return;
    }
    g.save();
    g.rotate(wallRot(it));
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(-1, -w / 2 + 0.8, 4, w);
    g.fillStyle = color;
    g.fillRect(-1.4, -w / 2, 3.8, w);
    g.restore();
  }

  LM.ui.addStyles(`
    .memo-poster { width: min(300px, 100%); margin: 2px auto 6px; padding: 16px 16px 18px; box-sizing: border-box; background: #070707; border: 1px solid #2a2a2a; box-shadow: 0 16px 34px rgba(0,0,0,0.55); text-align: center; }
    .memo-poster canvas { display: block; box-sizing: border-box; width: 100% !important; height: auto !important; border: 1px solid rgba(255,255,255,0.25); }
    .memo-poster h3 { margin: 14px 0 4px; font: 400 26px/1.1 var(--font-lore); letter-spacing: 0.32em; text-transform: uppercase; color: #f4f1ea; }
    .memo-poster p { margin: 0; font: italic 400 15px/1.45 var(--font-lore); color: #cfc8b8; }
    .memo-poster.honest { transform: rotate(-0.8deg); }
    .memo-poster.honest h3 { color: #e8dccb; }
    .memo-notice { position: relative; width: min(360px, 100%); box-sizing: border-box; margin: 8px auto 10px; padding: 18px 20px 20px; color: #24211c; box-shadow: 0 12px 26px rgba(0,0,0,0.5); transform: rotate(-0.7deg); }
    .memo-notice.staff { transform: rotate(1.1deg); }
    .memo-notice .from { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font: 600 10px/1.2 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #4a4438; }
    .memo-notice .from canvas { flex: none; }
    .memo-notice h3 { margin: 0 0 8px; font: 800 22px/1.05 var(--font-head); letter-spacing: 0.03em; text-transform: uppercase; color: #1c1a16; text-wrap: balance; }
    .memo-notice.staff h3 { font: italic 600 22px/1.15 var(--font-lore); text-transform: none; letter-spacing: 0; }
    .memo-notice p { margin: 0 0 8px; font: 400 13.5px/1.5 var(--font-ui); color: #2c2822; white-space: pre-line; }
    .memo-notice.staff p { font: italic 400 16px/1.4 var(--font-lore); }
    .memo-notice .big-arrow { font: 800 64px/1 var(--font-head); text-align: center; color: #1c1a16; }
    .memo-board { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; padding: 14px; background: #8a6a46; border: 6px solid #4a3422; box-shadow: inset 0 0 30px rgba(0,0,0,0.35); }
    .memo-card { position: relative; display: grid; gap: 6px; align-content: start; min-height: 92px; padding: 10px 10px 12px; border: 0; color: #24211c; text-align: left; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.35); }
    .memo-card:nth-child(odd) { transform: rotate(-1.4deg); }
    .memo-card:nth-child(3n) { transform: rotate(1.6deg); }
    .memo-card:hover, .memo-card:focus-visible { outline: 2px solid var(--brass); }
    .memo-card strong { font: 700 13px/1.25 var(--font-ui); text-transform: uppercase; letter-spacing: 0.02em; }
    .memo-card.staff strong { font: italic 600 15px/1.2 var(--font-lore); text-transform: none; }
    .memo-card .sym { display: flex; align-items: center; gap: 6px; font: 600 9px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #5a5244; }
    .memo-card.read::after { content: 'read'; position: absolute; right: 8px; bottom: 6px; font: 600 9px/1 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: #6a6252; }
    .memo-legend { display: flex; gap: 18px; justify-content: center; margin-top: 10px; font: 600 10px/1 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
    .memo-legend span { display: flex; align-items: center; gap: 6px; }
  `);

  // ------------------------------------------------------------ symbols: who posted it
  /** The company seal (management) or a pushpin (a coworker), as a small canvas. */
  MEMOS.symbol = function (by, size) {
    const s = size || 18;
    return LM.ui.iconCanvas(s, s, (g) => {
      g.scale(s / 18, s / 18);
      if (by === 'mgmt') {
        g.fillStyle = '#1f2a44';
        g.beginPath();
        g.arc(9, 9, 8.5, 0, U.TAU);
        g.fill();
        g.strokeStyle = '#c9a046';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(9, 9, 7, 0, U.TAU);
        g.stroke();
        g.fillStyle = '#f4f1ea';
        g.beginPath();
        g.moveTo(9, 3.6);
        g.lineTo(14, 12.4);
        g.lineTo(4, 12.4);
        g.closePath();
        g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.arc(10, 10, 6, 0, U.TAU);
        g.fill();
        g.fillStyle = '#d23a3a';
        g.beginPath();
        g.arc(9, 8, 6, 0, U.TAU);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(7, 6, 2, 0, U.TAU);
        g.fill();
      }
    });
  };
  // the same symbols, tiny, for drawing on the wall
  function worldSymbol(g, by, x, y) {
    if (by === 'mgmt') {
      g.fillStyle = '#1f2a44';
      g.beginPath();
      g.arc(x, y, 2.2, 0, U.TAU);
      g.fill();
      g.fillStyle = '#f4f1ea';
      g.beginPath();
      g.moveTo(x, y - 1.3);
      g.lineTo(x + 1.3, y + 1);
      g.lineTo(x - 1.3, y + 1);
      g.closePath();
      g.fill();
    } else {
      g.fillStyle = '#d23a3a';
      g.beginPath();
      g.arc(x, y, 1.5, 0, U.TAU);
      g.fill();
    }
  }

  // ------------------------------------------------------------ poster art
  // Each draws into a square art box (S x S) with the poster's palette. `hon` is the honest version:
  // same shapes, slightly wrong.
  const POSTER_ART = {
    venn(g, S, p, hon) {
      const r = S * 0.2, cx = S / 2, cy = S * 0.52;
      const pts = [[0, -r * 0.7], [-r * 0.75, r * 0.5], [r * 0.75, r * 0.5]];
      g.globalAlpha = 0.72;
      pts.forEach(([dx, dy], i) => {
        const away = hon && i === 2 ? 1.9 : 1;
        g.fillStyle = [p.accent, p.fg, U.shade(p.accent, -0.35)][i];
        g.beginPath();
        g.arc(cx + dx * away, cy + dy * away, r, 0, U.TAU);
        g.fill();
      });
      g.globalAlpha = 1;
    },
    merge(g, S, p, hon) {
      const s = S * 0.26;
      g.fillStyle = p.fg;
      g.fillRect(S * 0.2, S * 0.36, s, s);
      g.fillRect(S * 0.2 + s * 1.25, S * 0.36, s, s);
      g.fillStyle = p.accent;
      g.font = '700 ' + Math.round(S * 0.1) + 'px "IBM Plex Mono", monospace';
      g.textAlign = 'center';
      g.fillText(hon ? '1 + 1 = 0.8' : '1 + 1 = 3', S / 2, S * 0.86);
      if (!hon) {
        g.globalAlpha = 0.35;
        g.fillRect(S * 0.14, S * 0.3, S * 0.72, s + S * 0.12);
        g.globalAlpha = 1;
      } else {
        g.fillStyle = U.rgba('#000000', 0.45);
        g.fillRect(S * 0.2 + s * 1.25, S * 0.36 + s * 0.8, s, s * 0.2);
      }
    },
    stairs(g, S, p, hon) {
      const n = hon ? 9 : 5, w = (S * 0.7) / n, x0 = S * 0.15, y0 = S * 0.85;
      g.fillStyle = p.fg;
      for (let i = 0; i < n; i++) g.fillRect(x0 + i * w, y0 - (i + 1) * ((S * 0.6) / n), w + 0.5, (i + 1) * ((S * 0.6) / n));
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(x0 + (hon ? 1.5 : 3.5) * w, y0 - (hon ? 2 : 4) * ((S * 0.6) / n) - S * 0.04, S * 0.035, 0, U.TAU);
      g.fill();
      if (hon) {
        // the top step runs off the edge of the poster
        g.fillRect(x0 + n * w, S * 0.08, S * 0.02, S * 0.15);
      }
    },
    circle(g, S, p, hon) {
      g.strokeStyle = p.accent;
      g.lineWidth = S * 0.05;
      g.beginPath();
      if (hon) g.arc(S / 2, S / 2, S * 0.3, 0.3, U.TAU - 0.15);
      else g.arc(S / 2, S / 2, S * 0.3, 0, U.TAU);
      g.stroke();
    },
    bars(g, S, p, hon) {
      const n = 5, w = S * 0.1;
      for (let i = 0; i < n; i++) {
        const hh = S * (0.15 + i * 0.13);
        g.fillStyle = i === n - 1 ? p.accent : p.fg;
        g.fillRect(S * 0.15 + i * w * 1.45, S * 0.85 - hh, w, hh);
      }
      if (hon) {
        g.fillStyle = '#e04a3a';
        g.beginPath();
        g.arc(S * 0.12, S * 0.9, S * 0.03, 0, U.TAU);
        g.fill();
      }
    },
    target(g, S, p, hon) {
      for (let i = 4; i >= 1; i--) {
        g.fillStyle = i % 2 ? p.accent : p.fg;
        g.beginPath();
        g.arc(S / 2, S / 2, S * 0.08 * i, 0, U.TAU);
        g.fill();
      }
      if (hon) {
        g.fillStyle = '#111';
        for (const [x, y] of [[0.42, 0.38], [0.6, 0.55], [0.47, 0.63]]) {
          g.beginPath();
          g.arc(S * x, S * y, S * 0.018, 0, U.TAU);
          g.fill();
        }
      }
    },
    geese(g, S, p, hon) {
      const tri = (x, y, s, c) => {
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(x + s, y);
        g.lineTo(x - s * 0.7, y - s * 0.6);
        g.lineTo(x - s * 0.7, y + s * 0.6);
        g.closePath();
        g.fill();
      };
      tri(S * 0.7, S * 0.5, S * 0.09, p.accent);
      for (let i = 1; i <= 3; i++) {
        tri(S * 0.7 - i * S * 0.14, S * 0.5 - i * S * 0.09, S * 0.06, p.fg);
        if (!(hon && i === 3)) tri(S * 0.7 - i * S * 0.14, S * 0.5 + i * S * 0.09, S * 0.06, p.fg);
      }
      if (hon) tri(S * 0.12, S * 0.88, S * 0.05, U.shade(p.fg, -0.5));
    },
    square(g, S, p, hon) {
      g.fillStyle = p.fg;
      g.save();
      g.translate(S / 2, S / 2);
      if (hon) g.rotate(0.05);
      g.fillRect(-S * 0.24, -S * 0.24, S * 0.48, S * 0.48);
      g.restore();
      if (hon) {
        // an eye in the corner, watching
        g.fillStyle = p.fg;
        g.beginPath();
        g.ellipse(S * 0.84, S * 0.16, S * 0.07, S * 0.04, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(S * 0.84, S * 0.16, S * 0.025, 0, U.TAU);
        g.fill();
      }
    },
    bulb(g, S, p, hon) {
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(S / 2, S * 0.42, S * 0.18, 0, U.TAU);
      g.fill();
      g.fillStyle = p.fg;
      g.fillRect(S * 0.42, S * 0.6, S * 0.16, S * 0.12);
      if (!hon) {
        g.strokeStyle = p.accent;
        g.lineWidth = S * 0.015;
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          g.beginPath();
          g.moveTo(S / 2 + Math.cos(a) * S * 0.24, S * 0.42 + Math.sin(a) * S * 0.24);
          g.lineTo(S / 2 + Math.cos(a) * S * 0.32, S * 0.42 + Math.sin(a) * S * 0.32);
          g.stroke();
        }
      } else {
        g.strokeStyle = p.fg;
        g.lineWidth = S * 0.02;
        g.strokeRect(S * 0.2, S * 0.16, S * 0.6, S * 0.64);
      }
    },
    door(g, S, p, hon) {
      g.fillStyle = U.shade(p.bg, -0.4);
      g.fillRect(S * 0.32, S * 0.18, S * 0.36, S * 0.64);
      g.fillStyle = p.accent;
      if (hon) {
        g.fillRect(S * 0.32, S * 0.18, S * 0.36, S * 0.64);
        g.fillStyle = '#111';
        g.fillRect(S * 0.6, S * 0.5, S * 0.05, S * 0.08);
      } else {
        g.beginPath();
        g.moveTo(S * 0.32, S * 0.18);
        g.lineTo(S * 0.54, S * 0.24);
        g.lineTo(S * 0.54, S * 0.88);
        g.lineTo(S * 0.32, S * 0.82);
        g.closePath();
        g.fill();
      }
    },
    link(g, S, p, hon) {
      g.strokeStyle = p.fg;
      g.lineWidth = S * 0.02;
      g.beginPath();
      g.moveTo(S * 0.3, S / 2);
      if (hon) {
        g.lineTo(S * 0.45, S / 2);
        g.moveTo(S * 0.55, S / 2);
      }
      g.lineTo(S * 0.7, S / 2);
      g.stroke();
      for (const x of [0.25, 0.75]) {
        g.fillStyle = p.accent;
        g.beginPath();
        g.arc(S * x, S / 2, S * 0.1, 0, U.TAU);
        g.fill();
      }
    },
    peak(g, S, p, hon) {
      g.fillStyle = p.fg;
      g.beginPath();
      g.moveTo(S * 0.12, S * 0.82);
      g.lineTo(S * 0.5, S * 0.22);
      g.lineTo(S * 0.88, S * 0.82);
      g.closePath();
      g.fill();
      const fx = hon ? S * 0.92 : S * 0.5, fy = hon ? S * 0.12 : S * 0.22;
      g.fillStyle = p.accent;
      g.fillRect(fx - S * 0.005, fy - S * 0.12, S * 0.012, S * 0.12);
      g.beginPath();
      g.moveTo(fx, fy - S * 0.12);
      g.lineTo(fx + S * 0.08, fy - S * 0.09);
      g.lineTo(fx, fy - S * 0.06);
      g.fill();
    },
    balance(g, S, p, hon) {
      g.fillStyle = p.fg;
      g.beginPath();
      g.moveTo(S / 2, S * 0.62);
      g.lineTo(S * 0.58, S * 0.78);
      g.lineTo(S * 0.42, S * 0.78);
      g.closePath();
      g.fill();
      g.save();
      g.translate(S / 2, S * 0.6);
      g.rotate(hon ? 0.38 : 0);
      g.fillRect(-S * 0.34, -S * 0.015, S * 0.68, S * 0.03);
      g.fillStyle = p.accent;
      g.fillRect(-S * 0.32, -S * (hon ? 0.2 : 0.12), S * 0.12, S * (hon ? 0.18 : 0.1));
      if (!hon) g.fillRect(S * 0.2, -S * 0.12, S * 0.12, S * 0.1);
      g.restore();
    },
    eye(g, S, p, hon) {
      g.fillStyle = p.fg;
      g.beginPath();
      g.ellipse(S / 2, S / 2, S * 0.32, S * (hon ? 0.2 : 0.14), 0, 0, U.TAU);
      g.fill();
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(S / 2, S / 2, S * 0.11, 0, U.TAU);
      g.fill();
      g.fillStyle = '#111';
      g.beginPath();
      g.arc(S / 2 + (hon ? S * 0.04 : 0), S / 2 + (hon ? S * 0.03 : 0), S * 0.05, 0, U.TAU);
      g.fill();
    },
    cage(g, S, p, hon) {
      g.strokeStyle = p.fg;
      g.lineWidth = S * 0.018;
      for (let i = 0; i <= 6; i++) {
        g.beginPath();
        g.moveTo(S * (0.2 + i * 0.1), S * 0.2);
        g.lineTo(S * (0.2 + i * 0.1), S * 0.82);
        g.stroke();
      }
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(S / 2, S * 0.62, S * 0.06, 0, U.TAU);
      g.fill();
    },
    chairs(g, S, p, hon) {
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(S / 2, S / 2, S * 0.14, 0, U.TAU);
      g.fill();
      g.fillStyle = p.fg;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * U.TAU;
        g.fillRect(S / 2 + Math.cos(a) * S * 0.28 - S * 0.03, S / 2 + Math.sin(a) * S * 0.28 - S * 0.03, S * 0.06, S * 0.06);
      }
    },
    arrow(g, S, p, hon) {
      g.fillStyle = p.accent;
      g.save();
      g.translate(S / 2, S / 2);
      if (hon) g.rotate(Math.PI);
      g.beginPath();
      g.moveTo(0, -S * 0.32);
      g.lineTo(S * 0.18, -S * 0.08);
      g.lineTo(S * 0.06, -S * 0.08);
      g.lineTo(S * 0.06, S * 0.3);
      g.lineTo(-S * 0.06, S * 0.3);
      g.lineTo(-S * 0.06, -S * 0.08);
      g.lineTo(-S * 0.18, -S * 0.08);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = p.fg;
      for (const [x, y] of [[0.2, 0.2], [0.8, 0.26], [0.74, 0.8], [0.18, 0.7]]) {
        g.beginPath();
        g.arc(S * x, S * y, S * 0.012, 0, U.TAU);
        g.fill();
      }
    },
    heart(g, S, p, hon) {
      g.fillStyle = p.accent;
      g.save();
      g.translate(S / 2, S * 0.55);
      g.rotate(Math.PI / 4);
      g.fillRect(-S * 0.14, -S * 0.14, S * 0.28, S * 0.28);
      g.beginPath();
      g.arc(-S * 0.14, 0, S * 0.14, 0, U.TAU);
      g.arc(0, -S * 0.14, S * 0.14, 0, U.TAU);
      g.fill();
      g.restore();
      if (hon) {
        g.strokeStyle = U.shade(p.bg, -0.6);
        g.lineWidth = S * 0.02;
        g.beginPath();
        g.moveTo(S * 0.5, S * 0.32);
        g.lineTo(S * 0.46, S * 0.45);
        g.lineTo(S * 0.54, S * 0.55);
        g.lineTo(S * 0.48, S * 0.72);
        g.stroke();
      }
    },
  };
  MEMOS.POSTER_ART = POSTER_ART;

  /** The poster as a DOM element: black frame, art, spaced title, tagline. */
  MEMOS.posterEl = function (id, hon) {
    const base = MEMOS.posters[id];
    const v = hon && base.honest ? Object.assign({}, base, base.honest) : base;
    // honest posters are the same picture, a little sun-faded and a little sick
    const pal = hon ? { bg: U.mix(base.bg, '#3a3a2a', 0.45), fg: U.mix(base.fg, '#c8c0a0', 0.3), accent: U.mix(base.accent, '#8a7a5a', 0.35) } : base;
    const art = LM.ui.iconCanvas(268, 200, (g, W, H) => {
      g.fillStyle = pal.bg;
      g.fillRect(0, 0, W, H);
      const grd = g.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, W * 0.7);
      grd.addColorStop(0, 'rgba(255,255,255,0.12)');
      grd.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      const S = H;
      g.save();
      g.translate((W - S) / 2, 0);
      if (hon) {
        g.translate(S / 2, S / 2);
        g.rotate(-0.04);
        g.translate(-S / 2, -S / 2);
      }
      (POSTER_ART[v.art] || POSTER_ART.circle)(g, S, pal, hon);
      g.restore();
      if (hon) {
        // water damage in one corner
        const st = g.createRadialGradient(W * 0.9, H * 0.08, 2, W * 0.9, H * 0.08, 60);
        st.addColorStop(0, 'rgba(90,70,30,0.45)');
        st.addColorStop(1, 'rgba(90,70,30,0)');
        g.fillStyle = st;
        g.fillRect(0, 0, W, H);
      }
    });
    return h('div', { class: 'memo-poster' + (hon ? ' honest' : '') }, art, h('h3', null, v.title), h('p', null, v.line));
  };

  // ------------------------------------------------------------ notice pop-ups
  function noticeVersion(id, hon) {
    const n = MEMOS.notices[id];
    return hon && n.honest ? Object.assign({}, n, n.honest) : n;
  }
  MEMOS.noticeEl = function (v) {
    const from = v.by === 'mgmt' ? 'Meridian Group · Management' : 'From a coworker';
    return h('div', { class: 'memo-notice ' + (v.by || 'mgmt'), style: 'background:' + (v.paper || '#f4f1ea') },
      h('div', { class: 'from' }, MEMOS.symbol(v.by || 'mgmt', 18), from),
      v.arrow ? h('div', { class: 'big-arrow', 'aria-hidden': 'true' }, ARROW_GLYPH[v.arrow]) : null,
      h('h3', null, v.title),
      String(v.text || '').split('\n\n').map((p) => h('p', null, p)));
  };
  const ARROW_GLYPH = { n: '↑', e: '→', s: '↓', w: '←' };
  function readNotice(game, key, v) {
    MEMOS.award(game, 'notice', key);
    LM.ui.open({
      kicker: v.by === 'mgmt' ? 'Notice · Management' : 'Notice · Employee',
      title: 'A notice',
      body: MEMOS.noticeEl(v),
      actions: [{ label: 'Close', primary: true }],
    });
  }

  // ------------------------------------------------------------ desk toy drawings
  // In world units, centred on the toy. Keep them under ~6 units: they sit on a desk.
  const TOY_ART = {
    succulent(g) {
      g.fillStyle = '#c86a3a';
      g.fillRect(-2.2, -0.5, 4.4, 3);
      g.fillStyle = '#6aa05a';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU;
        g.beginPath();
        g.ellipse(Math.cos(a) * 1.6, -0.8 + Math.sin(a) * 1.2, 1.4, 0.7, a, 0, U.TAU);
        g.fill();
      }
    },
    globe(g) {
      g.fillStyle = '#3a2416';
      g.fillRect(-1, 1.5, 2, 1.5);
      g.fillStyle = '#2a5a8a';
      g.beginPath();
      g.arc(0, -0.5, 2.6, 0, U.TAU);
      g.fill();
      g.fillStyle = '#c8b070';
      g.beginPath();
      g.ellipse(-0.6, -1, 1.1, 0.7, 0.6, 0, U.TAU);
      g.fill();
    },
    cradle(g, t) {
      g.strokeStyle = '#9aa0a8';
      g.lineWidth = 0.5;
      g.strokeRect(-3.5, -2.5, 7, 4.5);
      const sw = Math.sin(t * 6);
      g.fillStyle = '#d8dce0';
      for (let i = 0; i < 5; i++) {
        let x = -2.4 + i * 1.2;
        if (i === 0 && sw < 0) x += sw * 1.2;
        if (i === 4 && sw > 0) x += sw * 1.2;
        g.beginPath();
        g.arc(x, 0.5, 0.6, 0, U.TAU);
        g.fill();
      }
    },
    cube(g) {
      const cols = ['#e84a3a', '#f4dc3a', '#3a8ae8', '#3ab84a', '#f4f4f0', '#f08a2a'];
      for (let i = 0; i < 9; i++) {
        g.fillStyle = cols[(i * 7) % 6];
        g.fillRect(-2.4 + (i % 3) * 1.6, -2.4 + Math.floor(i / 3) * 1.6, 1.5, 1.5);
      }
    },
    stressball(g) {
      g.fillStyle = '#3a7ac8';
      g.beginPath();
      g.arc(0, 0, 2.2, 0, U.TAU);
      g.fill();
      g.fillStyle = '#5ab85a';
      g.beginPath();
      g.ellipse(0.5, -0.3, 1, 0.6, 0.4, 0, U.TAU);
      g.fill();
    },
    bobble(g, t) {
      g.fillStyle = '#e8e4dc';
      g.fillRect(-1.6, 0.5, 3.2, 2);
      g.fillStyle = '#d8a07a';
      g.beginPath();
      g.arc(Math.sin(t * 5) * 0.4, -1, 2, 0, U.TAU);
      g.fill();
      g.fillStyle = '#2a4a8a';
      g.beginPath();
      g.arc(Math.sin(t * 5) * 0.4, -1.6, 1.8, Math.PI, U.TAU);
      g.fill();
    },
    lavalamp(g, t) {
      g.fillStyle = '#4a4e56';
      g.fillRect(-1.6, 1.4, 3.2, 1.6);
      g.fillStyle = '#5a1a3a';
      g.beginPath();
      g.ellipse(0, -0.8, 1.6, 2.6, 0, 0, U.TAU);
      g.fill();
      g.fillStyle = '#ff7a2a';
      g.beginPath();
      g.arc(0, -0.8 + Math.sin(t * 0.8) * 1.4, 0.8, 0, U.TAU);
      g.fill();
    },
    slinky(g) {
      g.strokeStyle = '#b8bcc4';
      g.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(-1.6 + i * 0.8, 0, 1.4, 1.6, 0, 0, U.TAU);
        g.stroke();
      }
    },
    eightball(g) {
      g.fillStyle = '#121214';
      g.beginPath();
      g.arc(0, 0, 2.4, 0, U.TAU);
      g.fill();
      g.fillStyle = '#f4f4f0';
      g.beginPath();
      g.arc(-0.5, -0.5, 1, 0, U.TAU);
      g.fill();
    },
    zen(g) {
      g.fillStyle = '#5a3a24';
      g.fillRect(-3.5, -2.4, 7, 4.8);
      g.fillStyle = '#e8dcc0';
      g.fillRect(-3, -1.9, 6, 3.8);
      g.strokeStyle = 'rgba(120,100,70,0.6)';
      g.lineWidth = 0.25;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(-3, -1.2 + i * 0.8);
        g.lineTo(3, -1.2 + i * 0.8);
        g.stroke();
      }
      g.fillStyle = '#5a5a5a';
      g.beginPath();
      g.arc(1.2, 0.3, 0.6, 0, U.TAU);
      g.fill();
    },
    snowglobe(g) {
      g.fillStyle = '#4a3a2a';
      g.fillRect(-2, 1.2, 4, 1.4);
      g.fillStyle = 'rgba(200,225,245,0.7)';
      g.beginPath();
      g.arc(0, -0.6, 2.3, 0, U.TAU);
      g.fill();
      g.fillStyle = '#5a6a7a';
      g.fillRect(-0.5, -1.8, 1, 2.4);
    },
    firesnow(g, t) {
      TOY_ART.snowglobe(g);
      g.fillStyle = 'rgba(255,120,40,' + (0.6 + 0.3 * Math.sin(t * 9)) + ')';
      g.beginPath();
      g.arc(0, -1.4, 0.9, 0, U.TAU);
      g.fill();
    },
    bird(g, t) {
      const k = Math.sin(t * 1.5);
      g.fillStyle = 'rgba(180,220,240,0.6)';
      g.beginPath();
      g.arc(2, 0.8, 1.2, 0, U.TAU);
      g.fill();
      g.strokeStyle = '#c84a3a';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-1.5, 1.5);
      g.lineTo(k * 1.8, -1.2);
      g.stroke();
      g.fillStyle = '#c84a3a';
      g.beginPath();
      g.arc(k * 1.8, -1.2, 0.9, 0, U.TAU);
      g.fill();
    },
    photo(g) {
      g.fillStyle = '#6a4a2a';
      g.fillRect(-2.2, -2.6, 4.4, 4.4);
      g.fillStyle = '#c8a878';
      g.fillRect(-1.6, -2, 3.2, 3.2);
      g.fillStyle = '#3a2a1a';
      g.beginPath();
      g.arc(0, -0.2, 0.9, 0, U.TAU);
      g.fill();
    },
    guillotine(g) {
      g.fillStyle = '#5a3a24';
      g.fillRect(-2.6, -3, 0.8, 5.6);
      g.fillRect(1.8, -3, 0.8, 5.6);
      g.fillRect(-3, 2, 6, 1);
      g.fillStyle = '#d8dce4';
      g.beginPath();
      g.moveTo(-1.8, -2.4);
      g.lineTo(1.8, -1.6);
      g.lineTo(1.8, -0.6);
      g.lineTo(-1.8, -0.6);
      g.closePath();
      g.fill();
      g.fillStyle = '#4a2a1a';
      g.fillRect(-1, 2.4, 2, 1.2);
    },
    cannon(g) {
      g.fillStyle = '#5a3a24';
      g.fillRect(-2.6, -1.2, 4, 2.4);
      g.fillStyle = '#c9a046';
      g.fillRect(-1.6, -0.9, 5, 1.8);
      g.fillStyle = '#1a1a1a';
      g.beginPath();
      g.arc(3.4, 0, 0.7, 0, U.TAU);
      g.fill();
      g.fillStyle = '#2a2a2a';
      for (const [x, y] of [[-2, 1.6], [0.6, 1.6], [-2, -1.6], [0.6, -1.6]]) {
        g.beginPath();
        g.arc(x, y, 0.8, 0, U.TAU);
        g.fill();
      }
    },
    flytrap(g, t) {
      g.fillStyle = '#c86a3a';
      g.fillRect(-2, 0.8, 4, 2.2);
      const k = 0.4 + 0.3 * Math.sin(t * 2);
      g.fillStyle = '#6ab84a';
      for (const s of [-1, 1]) {
        g.save();
        g.rotate(s * k);
        g.beginPath();
        g.ellipse(0, -2 * s, 2.6, 1.4, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#c83a3a';
        g.beginPath();
        g.ellipse(0, -1.4 * s, 1.8, 0.6, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = '#6ab84a';
        g.restore();
      }
    },
    voodoo(g) {
      g.fillStyle = '#e8bc96';
      g.beginPath();
      g.arc(0, -1.6, 1.2, 0, U.TAU);
      g.fill();
      g.fillStyle = '#2a2e3a';
      g.fillRect(-1.4, -0.6, 2.8, 3.2);
      g.fillStyle = '#c8302a';
      for (const [x, y] of [[-1, 0], [0.8, 0.6], [0, 1.8], [-0.6, -1.8]]) g.fillRect(x, y, 0.5, 0.5);
    },
    trebuchet(g) {
      g.fillStyle = '#7a5a3a';
      g.fillRect(-3, 1.6, 6, 1);
      g.fillRect(-0.4, -1, 0.8, 2.8);
      g.save();
      g.rotate(-0.6);
      g.fillRect(-3.2, -0.3, 6.4, 0.6);
      g.restore();
      g.fillStyle = '#e0b25a';
      g.beginPath();
      g.arc(2.6, -1.8, 0.7, 0, U.TAU);
      g.fill();
    },
    chair(g) {
      g.fillStyle = '#3a2a1a';
      g.fillRect(-1.8, -2.4, 3.6, 4.8);
      g.fillStyle = '#5a4a3a';
      g.fillRect(-1.8, -2.4, 3.6, 1);
      g.fillStyle = '#e8e4dc';
      g.font = '600 1.6px sans-serif';
      g.textAlign = 'center';
      g.fillText('Aa', 0, 1);
    },
    eyes(g, t, game, it) {
      g.fillStyle = 'rgba(200,220,230,0.55)';
      g.fillRect(-2.4, -2.8, 4.8, 5.6);
      const P = game && game.player;
      const a = P ? Math.atan2(P.y - it.y, P.x - it.x) : 0;
      for (const [x, y] of [[-1, -1.4], [1, -0.6], [-0.8, 1], [1, 1.6]]) {
        g.fillStyle = '#f4f4f0';
        g.beginPath();
        g.arc(x, y, 0.8, 0, U.TAU);
        g.fill();
        g.fillStyle = '#111';
        g.beginPath();
        g.arc(x + Math.cos(a) * 0.35, y + Math.sin(a) * 0.35, 0.38, 0, U.TAU);
        g.fill();
      }
    },
    harpoon(g) {
      g.fillStyle = '#4a4e56';
      g.fillRect(-3, -0.8, 5, 1.6);
      g.fillStyle = '#c8ccd2';
      g.fillRect(2, -0.3, 2.6, 0.6);
      g.beginPath();
      g.moveTo(4.6, -0.9);
      g.lineTo(5.6, 0);
      g.lineTo(4.6, 0.9);
      g.fill();
    },
    beartrap(g) {
      g.strokeStyle = '#6a6e76';
      g.lineWidth = 0.6;
      g.beginPath();
      g.arc(0, 0, 3.4, 0, U.TAU);
      g.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * U.TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * 3.4, Math.sin(a) * 3.4);
        g.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6);
        g.stroke();
      }
      g.fillStyle = '#3a6ac8';
      g.fillRect(-1.8, -1.2, 3.6, 2.4);
    },
    skullcradle(g, t) {
      g.strokeStyle = '#6a6e76';
      g.lineWidth = 0.5;
      g.strokeRect(-3.5, -2.5, 7, 4.5);
      const sw = Math.sin(t * 6);
      for (let i = 0; i < 5; i++) {
        let x = -2.4 + i * 1.2;
        if (i === 0 && sw < 0) x += sw * 1.2;
        if (i === 4 && sw > 0) x += sw * 1.2;
        g.fillStyle = '#e8e2d0';
        g.beginPath();
        g.arc(x, 0.5, 0.65, 0, U.TAU);
        g.fill();
        g.fillStyle = '#111';
        g.fillRect(x - 0.35, 0.3, 0.25, 0.25);
        g.fillRect(x + 0.1, 0.3, 0.25, 0.25);
      }
    },
  };
  MEMOS.TOY_ART = TOY_ART;

  // ------------------------------------------------------------ items
  const items = {
    'memo-poster': {
      name: 'Poster', radius: 6, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 18, cacheKey: (it, game) => (honest(game) ? 'h' : ''),
      interact: {
        available: (it) => !!MEMOS.posters[it.props.poster],
        prompt: (it, game) => {
          const p = MEMOS.posters[it.props.poster];
          return 'Look at the poster: ' + ((honest(game) && p.honest ? p.honest.title : p.title) || '').toUpperCase();
        },
        use(it, game) {
          const hon = honest(game);
          LM.ui.open({
            kicker: hon ? 'Motivational poster (honest edition)' : 'Motivational poster',
            title: ' ',
            body: MEMOS.posterEl(it.props.poster, hon),
            actions: [{ label: 'Close', primary: true }],
          });
        },
      },
      draw(g, it, t, game) {
        const p = MEMOS.posters[it.props.poster] || { bg: '#333', accent: '#999' };
        const hon = honest(game);
        wallPlate(g, it, 18, '#0a0a0a', (g2, x, y, w, hh) => {
          g2.fillStyle = hon ? U.mix(p.bg, '#3a3a2a', 0.45) : p.bg;
          g2.fillRect(x + 1.2, y + 1, w - 2.4, hh - 3.6);
          g2.fillStyle = hon ? U.mix(p.accent, '#8a7a5a', 0.35) : p.accent;
          g2.beginPath();
          g2.arc(0, y + 3.6, 1.6, 0, U.TAU);
          g2.fill();
          g2.fillStyle = 'rgba(255,255,255,0.6)';
          g2.fillRect(x + 4, y + hh - 2, w - 8, 0.6);
        });
        if (!facesSouth(it)) {
          g.save();
          g.rotate(wallRot(it));
          g.fillStyle = hon ? U.mix(p.bg, '#3a3a2a', 0.45) : p.bg;
          g.fillRect(-0.6, -7, 2.4, 14);
          g.fillStyle = p.accent;
          g.fillRect(0.2, -1.2, 1.4, 2.4);
          g.restore();
        }
      },
    },
    'memo-notice': {
      name: 'Notice', radius: 5, wallMounted: true, shadow: false,
      cache: true, cacheRadius: 22, cacheKey: (it, game) => (honest(game) ? 'h' : ''),
      init(it) {
        if (it.props.arrow) it.r = 7;
      },
      interact: {
        available: () => true,
        prompt: (it, game) => {
          if (it.props.arrow) return 'Read the notice: ' + (it.props.title || 'Server room') + ' ' + ARROW_GLYPH[it.props.arrow];
          const v = noticeVersion(it.props.notice, honest(game));
          return 'Read the notice: ' + v.title;
        },
        use(it, game) {
          if (it.props.arrow) {
            return readNotice(game, 'arrow-' + it.tx + '-' + it.ty, {
              by: 'mgmt', paper: it.props.paper || '#fff3b8', arrow: it.props.arrow,
              title: it.props.title || 'Server room',
              text: it.props.text || 'Daily report personnel: follow the arrows to the server room.\n\nDo not skip an arrow. The arrows know.',
            });
          }
          const hon = honest(game);
          readNotice(game, it.props.notice + (hon ? ':h' : ''), noticeVersion(it.props.notice, hon));
        },
      },
      draw(g, it, t, game) {
        const v = it.props.arrow ? { by: 'mgmt', paper: it.props.paper || '#fff3b8' } : noticeVersion(it.props.notice, honest(game));
        wallPlate(g, it, 10, v.paper || '#f4f1ea', (g2, x, y, w, hh) => {
          g2.fillStyle = 'rgba(0,0,0,0.3)';
          for (let i = 0; i < 3; i++) g2.fillRect(x + 1.6, y + 4.4 + i * 1.5, w - 3.2, 0.5);
          worldSymbol(g2, v.by, x + w / 2, y + 2.2);
        });
        if (!facesSouth(it)) {
          g.save();
          g.rotate(wallRot(it));
          g.fillStyle = v.paper || '#f4f1ea';
          g.fillRect(-0.4, -5, 2.6, 10);
          worldSymbol(g, v.by, 1, -2.4);
          g.restore();
        }
        // arrow notices also get an arrow taped to the floor in front of them, so you can read them from above
        if (it.props.arrow) {
          const out = 13;
          g.save();
          g.translate(it.face.x * out, it.face.y * out);
          g.rotate(LM.DIR[it.props.arrow]);
          g.fillStyle = 'rgba(240,200,60,0.9)';
          g.beginPath();
          g.moveTo(8, 0);
          g.lineTo(1, -5.5);
          g.lineTo(1, -2.2);
          g.lineTo(-7, -2.2);
          g.lineTo(-7, 2.2);
          g.lineTo(1, 2.2);
          g.lineTo(1, 5.5);
          g.closePath();
          g.fill();
          g.restore();
        }
      },
    },
    'memo-board': {
      name: 'Message board', radius: 10, wallMounted: true, shadow: false, mapColor: '#c8a070',
      cache: true, cacheRadius: (it) => (it.props.w || 3) * 16 + 8, cacheKey: (it, game) => (honest(game) ? 'h' : ''),
      init(it) {
        // centre a multi-tile board along its wall
        const w = it.props.w || 3;
        if (it.face.y !== 0) it.x += ((w - 1) * T) / 2;
        else it.y += ((w - 1) * T) / 2;
        it.r = 14;
      },
      interact: {
        available: () => true,
        prompt: (it) => 'Read the ' + (it.props.title || 'message board').toLowerCase(),
        use(it, game) {
          openBoard(game, it);
        },
      },
      draw(g, it, t, game) {
        const W = (it.props.w || 3) * T - 6, ids = MEMOS.boards[it.props.board] || [], hon = honest(game);
        wallPlate(g, it, W, '#4a3422', (g2, x, y, w, hh) => {
          g2.fillStyle = '#9a7a52';
          g2.fillRect(x + 1.2, y + 1, w - 2.4, hh - 2);
          ids.forEach((id, i) => {
            const v = noticeVersion(id, hon);
            const nx = x + 3 + (i % Math.ceil(ids.length / 2)) * ((w - 6) / Math.ceil(ids.length / 2));
            const ny = y + 1.6 + Math.floor(i / Math.ceil(ids.length / 2)) * 3.6;
            g2.fillStyle = v.paper;
            g2.fillRect(nx, ny, (w - 6) / Math.ceil(ids.length / 2) - 1.2, 3);
            worldSymbol(g2, v.by, nx + 1.4, ny + 1.4);
          });
        });
        if (!facesSouth(it)) {
          g.save();
          g.rotate(wallRot(it));
          ids.forEach((id, i) => {
            const v = noticeVersion(id, hon);
            g.fillStyle = v.paper;
            g.fillRect(1.8, -W / 2 + 3 + i * ((W - 6) / ids.length), 1.6, (W - 6) / ids.length - 1);
          });
          g.restore();
        }
      },
    },
    'memo-camera': {
      name: 'Security camera', radius: 4, wallMounted: true, shadow: false,
      init(it) {
        // tuck it into the corner: shift along the wall
        const along = it.props.corner === 'r' ? 1 : it.props.corner === 'l' ? -1 : 0;
        const k = 12;
        if (it.face.y !== 0) it.x += along * k;
        else it.y += along * k;
        it.sweep = U.hash2(it.tx, it.ty, 3) * U.TAU;
      },
      interact: {
        available: (it, game) => honest(game),
        prompt: 'Look into the camera',
        use: (it, game) => LM.ui.showText('Security camera', 'The camera turns to look at you. You look at it. The little red light blinks faster, the way a heart does.\n\nUnder the lens, a label: SMILE. YOU ARE BEING PERFORMANCE-REVIEWED.', 'Surveillance'),
      },
      draw(g, it, t, game) {
        const P = game && game.player;
        const base = Math.atan2(it.face.y, it.face.x);
        let look = base + Math.sin(t * 0.5 + it.sweep) * 0.6;
        // on an honest floor the cameras follow you
        if (honest(game) && P) look = base + U.clamp(U.angDiff(base, Math.atan2(P.y - it.y, P.x - it.x)), -1.2, 1.2);
        it.look = look;
        g.fillStyle = '#d8d8d4';
        g.save();
        g.rotate(base);
        g.fillRect(-1.5, -2.2, 2.6, 4.4);
        g.restore();
        g.save();
        g.rotate(look);
        g.fillStyle = '#2a2c32';
        G.roundRect(g, -0.4, -2, 6.4, 4, 1.2);
        g.fill();
        g.fillStyle = '#e8e8e4';
        g.fillRect(0.4, -1.4, 3.8, 2.8);
        g.fillStyle = '#101014';
        g.beginPath();
        g.arc(5.2, 0, 1.3, 0, U.TAU);
        g.fill();
        g.restore();
      },
      drawGlow(g, it, t, game) {
        const on = Math.sin(t * (honest(game) ? 9 : 3) + it.sweep) > 0.2;
        if (!on) return;
        g.rotate(it.look || 0);
        G.glow(g, 1.4, 0, 4, '#ff2a1a', 0.85);
      },
    },
    'desk-toy': {
      name: 'Desk toy', radius: 4, z: 1, shadow: false,
      interact: {
        available: (it) => !!MEMOS.toys[it.props.toy],
        prompt: (it) => 'Look at the ' + MEMOS.toys[it.props.toy].name.toLowerCase(),
        use(it, game) {
          const toy = MEMOS.toys[it.props.toy];
          if (toy.sound) LM.audio.play(toy.sound);
          const actions = [];
          if (toy.act) {
            actions.push({
              label: toy.act.label, primary: true, key: 'E',
              onClick: () => toyAct(game, it, toy),
            });
          }
          actions.push({ label: 'Leave it', quiet: !!toy.act, primary: !toy.act });
          LM.ui.open({
            kicker: it.props.owner ? it.props.owner + '’s desk' : 'On a desk',
            title: toy.name,
            body: h('div', { class: 'lore-block' }, toy.text.split('\n\n').map((p) => h('p', { class: 'lore' }, p))),
            actions,
          });
        },
      },
      draw(g, it, t, game) {
        const toy = MEMOS.toys[it.props.toy];
        if (!toy) return;
        g.rotate(it.props.rot || 0);
        (TOY_ART[toy.look] || TOY_ART.succulent)(g, t, game, it);
      },
      drawGlow(g, it, t) {
        const toy = MEMOS.toys[it.props.toy];
        if (toy && toy.look === 'lavalamp') G.glow(g, 0, -1, 7, '#ff7a2a', 0.35);
        if (toy && toy.look === 'firesnow') G.glow(g, 0, -1, 6, '#ff6a2a', 0.4 + 0.2 * Math.sin(t * 9));
      },
    },
  };

  /** A toy that does something: the cannon fires, the plant bites. */
  function toyAct(game, it, toy) {
    const a = toy.act, P = game.player;
    if (a.fire) {
      // it fires along the desk, toward whoever is standing in front of it
      const ang = Math.atan2(P.y - it.y, P.x - it.x) + U.rand(-0.12, 0.12);
      game.schedule(0.5, () => {
        LM.combat.shoot(game, { type: 'enemy-slug', x: it.x + Math.cos(ang) * 6, y: it.y + Math.sin(ang) * 6, angle: ang, speed: 420, owner: 'enemy', damage: 6, range: 500, knock: 120 });
        game.particles.burst(it.x, it.y, 8, { type: 'smoke', color: '#cfc8b8', speed: 40, life: 0.7, size: 2.5, alpha: 0.4 });
        game.lights.push({ x: it.x, y: it.y, r: 90, color: '#ffb060', intensity: 0.8, life: 0.1, max: 0.1 });
        LM.audio.play('launcher');
      });
      game.toast('The fuse fizzes. The cannon is pointed at you.', 'warn');
      return;
    }
    if (a.bite) {
      LM.combat.hurt(game, P, a.bite, { source: 'enemy', type: 'melee' });
    }
    if (a.sound) LM.audio.play(a.sound);
    if (a.toast) game.toast(a.toast, a.bite ? 'warn' : '');
  }

  // ------------------------------------------------------------ the message board pop-up
  function openBoard(game, it, openId) {
    const hon = honest(game);
    const ids = MEMOS.boards[it.props.board] || [];
    const title = it.props.title || 'Message board';
    if (openId) {
      const v = noticeVersion(openId, hon);
      MEMOS.award(game, 'notice', openId + (hon ? ':h' : ''));
      return LM.ui.open({
        kicker: title,
        title: v.by === 'mgmt' ? 'From Management' : 'From a coworker',
        body: MEMOS.noticeEl(v),
        actions: [
          { label: 'Back to the board', primary: true, key: 'E', onClick: () => { setTimeout(() => openBoard(game, it), 0); } },
          { label: 'Close', quiet: true },
        ],
      });
    }
    const cards = ids.map((id) => {
      const v = noticeVersion(id, hon);
      const read = MEMOS.seen(game, 'notice', id + (hon ? ':h' : ''));
      const b = h('button', { class: 'memo-card ' + v.by + (read ? ' read' : ''), type: 'button', style: 'background:' + v.paper },
        h('span', { class: 'sym' }, MEMOS.symbol(v.by, 14), v.by === 'mgmt' ? 'Management' : 'Employee'),
        h('strong', null, v.title));
      b.addEventListener('click', () => {
        LM.audio.play('ui');
        openBoard(game, it, id);
      });
      return b;
    });
    LM.ui.open({
      kicker: it.props.kicker || 'The Cantina',
      title,
      wide: true,
      body: h('div', null,
        h('div', { class: 'memo-board' }, cards),
        h('div', { class: 'memo-legend' }, h('span', null, MEMOS.symbol('mgmt', 14), 'From Management'), h('span', null, MEMOS.symbol('staff', 14), 'From an employee'))),
      actions: [{ label: 'Step back', primary: true }],
    });
  }

  LM.definePack({ id: 'memos', items });
})();
