/* The Linear Maze — packs/apartment/environment.js
 * Apartment pack, part 2: how home looks. 6:30 PM, the sun going down.
 *
 * Environment 'apartment' (reuses the Office pack's painters):
 *   floor variant 0 hall carpet   1 wood   2 kitchen tile   3 bathroom tile
 *                 4 bedroom carpet   5 stairwell concrete
 * Terrain 'apt-door-mine': your front door (unit 7C), painted, with a brass
 * number and a star, so it stands out from the neighbors'.
 */
'use strict';
(function () {
  const LM = window.LM, U = LM.util, T = LM.TILE;

  function panels(ctx, door, paint) {
    const half = T / 2, k = U.ease.inOutSine(door.open), slide = k * (half - 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * slide, 0);
      paint(side < 0 ? -half : 0, half);
      ctx.restore();
    }
  }
  const doorStyles = {
    mine(ctx, door) {
      ctx.save();
      ctx.translate(door.x, door.y);
      if (!door.horizontal) ctx.rotate(Math.PI / 2);
      panels(ctx, door, (x0, half) => {
        ctx.fillStyle = '#1f4a72';
        ctx.fillRect(x0, -5, half, 10);
        ctx.fillStyle = '#2f6a9a';
        ctx.fillRect(x0 + 1, -4, half - 2, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x0, -5, half, 1.6);
      });
      if (door.open < 0.2) {
        // the brass 7C and a little star
        ctx.fillStyle = '#d8b050';
        ctx.fillRect(-5, -1.6, 10, 3.2);
        ctx.fillStyle = '#5a3a10';
        ctx.font = '700 3px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('7C', 0, 1.1);
      }
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(-T / 2, -6, 3, 12);
      ctx.fillRect(T / 2 - 3, -6, 3, 12);
      ctx.restore();
    },
  };
  const doorGlows = {
    mine(ctx, door, game, t) {
      if (door.open > 0.5) return;
      LM.gfx.glow(ctx, door.x, door.y, 14, '#f4d070', 0.25 + 0.08 * Math.sin(t * 2));
    },
  };

  const environments = {
    apartment: {
      name: 'Home',
      voidColor: '#0c0b0a',
      ambient: '#6e665c',
      attractAmbient: '#7a7268',
      outsideSight: '#4c4842',
      playerLight: '#fff2e0',
      torch: '#ffb070',
      floors: {
        0: { style: 'carpet-tile', colors: ['#5a2e34', '#542a30'], line: '#c89a7a', speck: '#2a1416', accent: '#c8a050' },
        1: { style: 'planks', colors: ['#9a7048', '#92683f', '#a2784f'], grain: '#5a3a1a', gap: '#4a3018' },
        2: { style: 'bath-tile', tile: '#e8e0cc', grout: '#a8a08c', accent: '#d8c8a0' },
        3: { style: 'bath-tile', tile: '#d8e8ea', grout: '#9ab0b4', accent: '#3a8a9a' },
        4: { style: 'carpet-tile', colors: ['#8a7a68', '#857563'], line: '#c8b8a0', speck: '#4a3e30' },
        5: { style: 'terrazzo', base: '#8a8884', chips: ['#6a6864', '#a8a6a0', '#5a5854'], strip: '#5a5854' },
      },
      floor: { style: 'planks', colors: ['#9a7048', '#92683f', '#a2784f'], grain: '#5a3a1a', gap: '#4a3018' },
      wall: { style: 'drywall', top: ['#e6dccb'], edge: '#f8f2e6', face: '#cfc2a8', faceDark: '#b0a48a', base: '#5a4a3a' },
      water: { deep: '#18303a', shallow: '#2c5462', foam: '#a8d4dc' },
      pit: { core: '#030304', wall: '#1d1f22', rim: '#3a3d42' },
      door: { panel: '#7a5a3a', frame: '#4a3a2a', trim: '#c8a878' },
      doorStyles,
      doorGlows,
      particles: { type: 'mote', color: '#ffe8c8', rate: 3, alpha: 0.2, drift: 3 },
      ambience: { base: 55, cutoff: 360, wind: 700, gain: 0.026, wave: 'sine' },
    },
  };

  // Home on Chessboard 1: the same rooms, the colors slightly wrong
  environments['apartment-cb1'] = Object.assign({}, environments.apartment, {
    name: 'Home?',
    ambient: '#665c6e',
    outsideSight: '#46404c',
    floors: {
      0: { style: 'carpet-tile', colors: ['#2e4a5a', '#2a4454'], line: '#c87ab0', speck: '#14202a', accent: '#c8a050' },
      1: { style: 'planks', colors: ['#8a7a48', '#82723f', '#92824f'], grain: '#4a4a1a', gap: '#3a3418' },
      2: { style: 'bath-tile', tile: '#d8e8cc', grout: '#98a88c', accent: '#d8a0c8' },
      3: { style: 'bath-tile', tile: '#ead8ea', grout: '#b09ab4', accent: '#9a3a8a' },
      4: { style: 'carpet-tile', colors: ['#6a7a88', '#657583'], line: '#a8c8c0', speck: '#303e4a' },
      5: { style: 'terrazzo', base: '#8a8490', chips: ['#6a6474', '#a8a2b0', '#5a5464'], strip: '#5a5464' },
    },
    wall: { style: 'drywall', top: ['#dcd6e6'], edge: '#f2eef8', face: '#c4bcd0', faceDark: '#a49cb2', base: '#4a4058' },
    particles: { type: 'mote', color: '#e8d8ff', rate: 5, alpha: 0.25, drift: 5 },
  });

  const terrain = {
    // the stairs down, roped off until it's time to leave (flag timeToLeave swaps this for the real exit)
    'apt-stairs-closed': {
      solid: true, layer: 0, floorLike: true, mapColor: '#9a6a3a',
      bake(g, x, y, info) {
        LM.get('terrain', 'exit').bake(g, x, y, info);
        g.fillStyle = '#c8a050';
        g.fillRect(x + 2, y + 13, 3, 9);
        g.fillRect(x + T - 5, y + 13, 3, 9);
        g.strokeStyle = '#a82a20';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 3.5, y + 15);
        g.quadraticCurveTo(x + T / 2, y + 22, x + T - 3.5, y + 15);
        g.stroke();
      },
    },
    'apt-door-mine': {
      floorLike: true, door: { lock: null, style: 'mine' }, mapColor: '#f4d070',
      bake(g, x, y, info) {
        LM.paintFloor(g, x, y, info);
      },
    },
  };

  LM.definePack({ id: 'apartment', name: 'Apartment', version: '0.1.0', environments, terrain });
})();
