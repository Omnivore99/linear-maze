/* The Linear Maze — packs/dressings/dressings.js
 * Dressings: furniture and fixtures placed over tiles (desks, tables, counters,
 * pillars, lamps, pictures). In the editor's map palette they have their own
 * tab, drawn from every pack, so any floor can use any set's furniture.
 *
 * Any item can say how the editor should file it:
 *   dressing: 'Furniture' | 'Walls' | 'Lights' | 'Decor'   that category
 *   dressing: true                                         a dressing; the category is worked out
 *   dressing: false                                        never a dressing
 * Without the field, the editor decides from the item (pickups, chests, keys
 * and invisible helpers are not dressings; the rest are). The game itself
 * doesn't read the field.
 *
 * This pack adds dressings that suit any floor:
 *   dress-pillar   a pillar on a tile (the tile stays floor). props: shape 'round' | 'square',
 *                  size (radius in units, default 11), color (default: the floor's wall colour)
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, G = LM.gfx;

  const wallColor = (it, game) => it.props.color || (game && game.level && game.level.env && game.level.env.wall && game.level.env.wall.top && game.level.env.wall.top[0]) || '#8a867e';
  const items = {
    'dress-pillar': {
      name: 'Pillar', dressing: 'Furniture', radius: 12, solid: true, shadow: false,
      props: { shape: 'round', size: 11 },
      cache: true, cacheRadius: 22, cacheKey: (it, game) => it.props.shape + ':' + wallColor(it, game),
      init(it) {
        const s = it.props.size || 11;
        it.solidRadius = s;
        if (it.props.shape === 'square') {
          it.solid = 'rect';
          it.box = [s * 2, s * 2];
        }
      },
      draw(g, it, t, game) {
        const s = it.props.size || 11, c = wallColor(it, game);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        if (it.props.shape === 'square') {
          g.fillRect(-s + 3, -s + 4, s * 2, s * 2);
          g.fillStyle = U.shade(c, -0.35);
          g.fillRect(-s - 1.5, -s - 1.5, s * 2 + 3, s * 2 + 3);
          g.fillStyle = c;
          g.fillRect(-s, -s, s * 2, s * 2);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(-s, -s, s * 2, 2);
          g.fillRect(-s, -s, 2, s * 2);
          g.fillStyle = 'rgba(0,0,0,0.15)';
          g.fillRect(-s + 4, -s + 4, s * 2 - 8, s * 2 - 8);
          return;
        }
        g.beginPath();
        g.arc(3, 4, s + 1, 0, U.TAU);
        g.fill();
        g.fillStyle = U.shade(c, -0.35);
        g.beginPath();
        g.arc(0, 0, s + 1.5, 0, U.TAU);
        g.fill();
        g.fillStyle = c;
        g.beginPath();
        g.arc(0, 0, s, 0, U.TAU);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.22)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, 0, s - 2, Math.PI * 0.95, Math.PI * 1.6);
        g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.beginPath();
        g.arc(1.5, 1.5, s * 0.55, 0, U.TAU);
        g.fill();
      },
    },
  };

  LM.definePack({ id: 'dressings', name: 'Dressings', version: '0.1.0', items });
})();
