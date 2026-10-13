/* The Linear Maze — packs/core/armor.js
 * Wearable gear and altar blessings. Both are just stat modifiers that the
 * player adds up (see LM.PLAYER_BASE in engine/player.js for every stat).
 *
 * Armor fields: name, slot ('head'|'body'|'feet'|'trinket'), mods, desc,
 *   color, trim (drawing), lamp (head lamp glow), drawIcon(g) optional
 * Blessing fields: name, mods, desc, stack (how many times it can be granted), onGrant(game, player)
 */
'use strict';
(function () {
  const LM = window.LM;

  const armor = {
    'oilskin-coat': {
      name: 'Oilskin Coat', slot: 'body', color: '#5a5a3c', trim: '#8a8458',
      mods: { armor: 0.1, swimMul: 0.15 },
      desc: 'Waxed canvas that sheds water and turns a glancing blow.',
    },
    brigandine: {
      name: 'Brigandine', slot: 'body', color: '#6a3a2a', trim: '#c9a35a',
      mods: { armor: 0.25, speed: -14 },
      desc: 'Riveted plates sewn into leather. Heavy, and worth it.',
    },
    'aegis-harness': {
      name: 'Aegis Harness', slot: 'body', color: '#2f4a5a', trim: '#5cc8e8',
      mods: { maxShield: 60, shieldRegen: 6, armor: 0.05 },
      desc: 'A shield projector on a leather frame. The shield refills itself after a few quiet seconds, and recharge stations top it up.',
    },
    'miners-helm': {
      name: 'Miner’s Lamp Helm', slot: 'head', color: '#8a6a2a', lamp: true,
      mods: { lightRadius: 140, armor: 0.03 },
      desc: 'A brass helmet with a carbide lamp. You see much farther into the dark.',
    },
    'iron-sallet': {
      name: 'Iron Sallet', slot: 'head', color: '#6d7178', trim: '#9aa0a8',
      mods: { armor: 0.1 },
      desc: 'A plain soldier’s helmet. It has been dented before.',
    },
    'gilded-circlet': {
      name: 'Gilded Circlet', slot: 'head', color: '#c79a44', trim: '#fff2b8',
      mods: { goldFind: 0.35, maxHp: 15 },
      desc: 'A reliquary crown. Coin seems to find you, and you feel sturdier wearing it.',
    },
    'runner-boots': {
      name: 'Runner’s Boots', slot: 'feet', color: '#4a3020', trim: '#8a6040',
      mods: { speed: 26, dashCooldown: -0.25 },
      desc: 'Soft-soled and light. Faster on your feet, quicker to dash again.',
    },
    'wading-boots': {
      name: 'Wading Boots', slot: 'feet', color: '#2f3a30', trim: '#5a6a5a',
      mods: { swimMul: 0.35, armor: 0.03 },
      desc: 'Thigh-high rubber. Deep water barely slows you.',
    },
    bandolier: {
      name: 'Bandolier', slot: 'trinket', color: '#6a4a2a', trim: '#d9a32a',
      mods: { ammoMul: 0.5 },
      desc: 'Loops and pouches for half again as much ammunition.',
    },
    'warding-charm': {
      name: 'Warding Charm', slot: 'trinket', color: '#2a5a6a', trim: '#5cc8e8',
      mods: { maxShield: 25, shieldRegen: 4 },
      desc: 'A blue glass eye on a cord. It hums when something is about to hit you.',
    },
    'ember-heart': {
      name: 'Ember Heart', slot: 'trinket', color: '#8a2a10', trim: '#ff7a3a',
      mods: { damageMul: 0.15, maxHp: -10 },
      desc: 'A coal that never cools, worn against the chest. Your shots burn hotter; so do you.',
    },
  };

  const blessings = {
    'iron-skin': { name: 'Iron Skin', mods: { armor: 0.08 }, desc: 'Blows land softer.', stack: 2 },
    quickening: { name: 'Quickening', mods: { speed: 16 }, desc: 'Your stride lengthens.', stack: 2 },
    vigor: {
      name: 'Vigor', mods: { maxHp: 20 }, desc: 'Twenty more health, and the wound you carry closes.', stack: 3,
      onGrant(game, P) {
        LM.combat.heal(game, P, 20);
      },
    },
    wrath: { name: 'Wrath', mods: { damageMul: 0.12 }, desc: 'Every shot bites deeper.', stack: 2 },
    'far-sight': { name: 'Far Sight', mods: { lightRadius: 70 }, desc: 'The dark pulls back from you.', stack: 1 },
    'deep-pockets': { name: 'Deep Pockets', mods: { ammoMul: 0.25 }, desc: 'You carry a quarter more ammunition.', stack: 1 },
  };

  LM.definePack({ id: 'core', armor, blessings });
})();
