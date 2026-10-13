/* Linear Maze Editor — js/play.js
 * Play test: the whole game in a frame, with every unsaved change applied, started
 * on any floor. Its checkpoint is kept apart from the real game's save.
 */
'use strict';
(function () {
  const ED = window.ED, h = ED.h;
  const P = (ED.play = {});
  const ISOLATE_SAVE = "(function(){var S=window.Storage&&Storage.prototype;if(!S)return;var k=function(x){return x==='linear-maze-save-v1'?x+':editor-playtest':x;};" +
    "var g=S.getItem,s=S.setItem,r=S.removeItem;S.getItem=function(x){return g.call(this,k(x));};S.setItem=function(x,v){return s.call(this,k(x),v);};S.removeItem=function(x){return r.call(this,k(x));};})();";

  P.open = function (levelId) {
    ED.flushAll();
    const M = ED.model;
    const edits = ED.ser.editsFile(M.edits());
    const sprites = ED.ser.spritesFile(M.sprites);
    const order = M.levelOrder();
    const startId = levelId && order.includes(levelId) ? levelId : null;
    const holder = h('div', { class: 'play-frame' });
    let chosen = startId;
    const sel = ED.forms.select(startId || '', [['', 'From the start (title screen)']].concat(order.map((l) => [l, M.floorLabel(l) + ': ' + M.name('levels', l)])), (v) => { chosen = v || null; restart(chosen); });
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => {
      if (e.key === 'F10' || (e.key === 'Escape' && e.shiftKey)) close();
    };
    let god = false;
    const godBtn = h('button', { class: 'btn small', on: { click: () => { god = !god; godBtn.classList.toggle('on', god); try { win().LM.debug.god(god); } catch (e) {} } } }, 'No damage');
    const wrap = h('div', { class: 'play-wrap' },
      h('div', { class: 'play-bar' },
        h('b', { style: { fontFamily: 'var(--f-head)', fontSize: '18px', color: 'var(--brass)' } }, 'Play test'),
        sel,
        h('span', { class: 'what' }, 'Unsaved changes included. Click the game to play; Shift+Esc or F10 comes back.'),
        godBtn,
        h('button', { class: 'btn small', on: { click: () => { try { win().LM.debug.giveAll(); win().LM.game.toast('Every weapon, full ammo, all keys', 'good'); } catch (e) {} } } }, 'Give everything'),
        h('button', { class: 'btn small', on: { click: () => { try { win().LM.debug.reveal(); } catch (e) {} } } }, 'Reveal map'),
        h('button', { class: 'btn small', on: { click: () => restart(chosen) } }, 'Restart'),
        h('button', { class: 'btn small primary', on: { click: close } }, 'Back to the editor')),
      holder);
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey, true);
    let frameWin = null;
    const win = () => frameWin;
    function restart(id) {
      const doc = ED.engine.frameDoc({ runtime: true, sprites, edits, boot: true }).replace('<head>', '<head><script>' + ISOLATE_SAVE + '</script>');
      ED.engine.makeFrame(doc, 'play-frame', holder).then((w) => {
        frameWin = w;
        w.addEventListener('keydown', onKey, true);
        const iframe = holder.querySelector('iframe');
        iframe.className = '';
        const go = () => {
          const LM = w.LM;
          if (!LM || !LM.game) return setTimeout(go, 50);
          if (ED.engine.loadErrors.length) ED.toast('The game reported: ' + ED.engine.loadErrors[0], 'bad', 8000);
          if (id) {
            try {
              LM.ui.hideTitle();
              LM.debug.warp(id);
            } catch (e) {
              ED.toast('Couldn’t start on that floor: ' + e.message, 'bad');
            }
          }
          if (god) LM.debug.god(true);
          iframe.focus();
        };
        setTimeout(go, 30);
      });
    }
    restart(startId);
  };
})();
