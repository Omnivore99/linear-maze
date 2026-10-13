/* The Linear Maze — engine/input.js
 * Keyboard + mouse state. Keys are tracked by KeyboardEvent.code so WASD
 * works on any keyboard layout position.
 */
'use strict';
(function () {
  const LM = window.LM;
  const I = (LM.input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, rdown: false, clicked: false, inside: false },
    wheel: 0,
    enabled: true,
  });

  const BLOCK_DEFAULT = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  I.attach = function (canvas) {
    window.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (!I.keys.has(e.code)) I.pressed.add(e.code);
      I.keys.add(e.code);
      if (LM.audio) LM.audio.unlock();
    });
    window.addEventListener('keyup', (e) => I.keys.delete(e.code));
    window.addEventListener('blur', () => {
      I.keys.clear();
      I.mouse.down = false;
      I.mouse.rdown = false;
    });
    const setPos = (e) => {
      const r = canvas.getBoundingClientRect();
      I.mouse.x = e.clientX - r.left;
      I.mouse.y = e.clientY - r.top;
    };
    canvas.addEventListener('mousemove', (e) => {
      setPos(e);
      I.mouse.inside = true;
    });
    canvas.addEventListener('mouseleave', () => (I.mouse.inside = false));
    canvas.addEventListener('mousedown', (e) => {
      setPos(e);
      if (e.button === 0) {
        I.mouse.down = true;
        I.mouse.clicked = true;
      } else if (e.button === 2) I.mouse.rdown = true;
      if (LM.audio) LM.audio.unlock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) I.mouse.down = false;
      else if (e.button === 2) I.mouse.rdown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        I.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );
  };

  I.down = (code) => I.keys.has(code);
  I.hit = (code) => I.pressed.has(code);
  I.anyHit = (...codes) => codes.some((c) => I.pressed.has(c));
  I.endFrame = function () {
    I.pressed.clear();
    I.mouse.clicked = false;
    I.wheel = 0;
  };
})();
