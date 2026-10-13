/* The Linear Maze — packs/memos/scores.js
 * Memos pack, part 2: the three scores in the top-right corner.
 *
 *   NOTICE SCORE   reading a notice (on a wall or a message board) for the first time
 *   MESSAGE SCORE  reading a phone message (any thread, any floor)
 *   EMAIL SCORE    reading an email at your desk, and decrypting Alice's
 *
 * Scores live in P.data.memos, so they are saved with the run and carry
 * between floors. Other packs can add lines under the scores (a clock, a task
 * count) with MEMOS.hudLines.push((game, P) => [label, value] | null).
 *
 * API
 *   MEMOS.award(game, 'notice' | 'message' | 'email', key, points)
 *     adds points the first time `key` is seen; returns true if it was new
 *   MEMOS.state(P)   the saved state: { seen, notice, message, email, msgRead }
 */
'use strict';
(function () {
  const LM = window.LM;
  const MEMOS = (LM.MEMOS = LM.MEMOS || {});
  const h = (...a) => LM.ui.h(...a);

  MEMOS.POINTS = { notice: 10, message: 10, email: 25 };
  const LABELS = { notice: 'Notice score', message: 'Message score', email: 'Email score' };

  MEMOS.state = function (P) {
    if (!P.data.memos) P.data.memos = { seen: {}, notice: 0, message: 0, email: 0, msgRead: 0 };
    return P.data.memos;
  };
  MEMOS.award = function (game, kind, key, points) {
    const P = game.player;
    if (!P) return false;
    const st = MEMOS.state(P);
    const k = kind + ':' + key;
    if (st.seen[k]) return false;
    st.seen[k] = true;
    const n = points == null ? MEMOS.POINTS[kind] : points;
    st[kind] = (st[kind] || 0) + n;
    MEMOS.flash = { kind, t: performance.now() };
    game.toast('+' + n + ' ' + LABELS[kind].toUpperCase(), 'good');
    return true;
  };
  MEMOS.seen = (game, kind, key) => !!(game.player && MEMOS.state(game.player).seen[kind + ':' + key]);

  // ------------------------------------------------------------ phone messages read
  // A message counts once it has arrived and its thread has been opened (unread back to 0).
  function readMessages(P) {
    const ph = P.data.phone;
    if (!ph || !ph.threads) return 0;
    let n = 0;
    for (const th of Object.values(ph.threads)) {
      const incoming = th.msgs.filter((m) => m.from === 'them').length;
      n += Math.max(0, incoming - (th.unread || 0));
    }
    return n;
  }

  // ------------------------------------------------------------ HUD
  MEMOS.hudLines = [];
  LM.ui.addStyles(`
    .memo-scores { display: grid; gap: 3px; min-width: 176px; box-sizing: border-box; padding: 8px 10px; }
    .memo-scores div { display: flex; justify-content: space-between; gap: 12px; font: 600 10px/1.2 var(--font-ui); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .memo-scores b { font: 800 15px/1 var(--font-head); letter-spacing: 0.04em; color: var(--bone); }
    .memo-scores div.hot b { color: var(--good); }
    .memo-scores div.extra { color: var(--brass); }
    .memo-scores div.extra b { font: 600 11px/1.2 var(--font-ui); color: var(--bone); letter-spacing: 0.04em; }
  `);
  let plate = null, lastKey = '';
  function ensurePlate() {
    if (plate && plate.isConnected) return plate;
    const tr = document.querySelector('#hud .hud-tr');
    if (!tr) return null;
    plate = h('div', { class: 'hud-plate memo-scores', 'aria-label': 'Scores' });
    tr.appendChild(plate);
    lastKey = '';
    return plate;
  }
  function frame(game) {
    const P = game.player;
    if (!P || game.attract) return;
    const st = MEMOS.state(P);
    // phone messages: award as they are read
    const read = readMessages(P);
    if (read > st.msgRead) {
      const n = read - st.msgRead;
      st.msgRead = read;
      st.message += n * MEMOS.POINTS.message;
      MEMOS.flash = { kind: 'message', t: performance.now() };
      game.toast('+' + n * MEMOS.POINTS.message + ' MESSAGE SCORE', 'good');
    }
    const el = ensurePlate();
    if (!el) return;
    const hot = MEMOS.flash && performance.now() - MEMOS.flash.t < 1600 ? MEMOS.flash.kind : '';
    const extra = MEMOS.hudLines.map((fn) => fn(game, P)).filter(Boolean);
    const key = [st.notice, st.message, st.email, hot, extra.map((e) => e.join(':')).join('|')].join(',');
    if (key === lastKey) return;
    lastKey = key;
    const pad = (n) => String(n).padStart(4, '0');
    el.replaceChildren(
      ...['notice', 'message', 'email'].map((k) => h('div', { class: hot === k ? 'hot' : '' }, h('span', null, LABELS[k]), h('b', null, pad(st[k])))),
      ...extra.map(([a, b]) => h('div', { class: 'extra' }, h('span', null, a), h('b', null, b)))
    );
  }
  // run after the engine's own HUD update every frame
  const engineFrame = LM.ui.frame;
  LM.ui.frame = function (game, dt) {
    engineFrame(game, dt);
    try {
      frame(game);
    } catch (e) {
      console.warn('[memos] HUD', e);
    }
  };

  LM.definePack({ id: 'memos', name: 'Memos', version: '0.1.0' });
})();
