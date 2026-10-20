/* Hedge Witch: authored content.
   Everything here is read-only data: spells, enemies, waves, upgrades, the garden layout and the copy.
   Runtime state (positions, health, timers, cooldowns) lives in sim.js and never writes back into this file.
   Times are in sim ticks at 60 Hz unless a key ends in "S" (seconds). Distances are garden units (~0.5 m). */
(function () {
  'use strict';
  var T = 60; // ticks per second

  var C = {
    tickHz: T,
    garden: {
      half: 12,            // the walled interior runs from -12 to +12 on x and z
      wall: 12.75,         // wall centreline
      loseAt: 6,           // herbs eaten before the night is lost
      sundial: { x: 0, z: 0, r: 0.95 }
    },

    // Six raised beds, two herbs each. w is along x, d along z.
    beds: [
      { id: 'b1', x: -6.6, z: -6.2, w: 4.4, d: 1.9, herbs: ['tansy', 'sage'] },
      { id: 'b2', x: 0.6, z: -7.6, w: 4.4, d: 1.9, herbs: ['foxglove', 'thyme'] },
      { id: 'b3', x: 7.2, z: -4.6, w: 1.9, d: 4.4, herbs: ['lavender', 'feverfew'] },
      { id: 'b4', x: -7.4, z: 3.0, w: 1.9, d: 4.4, herbs: ['borage', 'rosemary'] },
      { id: 'b5', x: 0.2, z: 7.2, w: 4.4, d: 1.9, herbs: ['chamomile', 'mint'] },
      { id: 'b6', x: 6.8, z: 5.0, w: 1.9, d: 3.8, herbs: ['comfrey', 'lemonbalm'] }
    ],

    herbs: {
      tansy:     { name: 'Tansy',      leaf: '#5d7f3a', flower: '#e8b631', form: 'button' },
      sage:      { name: 'Sage',       leaf: '#8a9b7c', flower: '#8f78c8', form: 'broad' },
      foxglove:  { name: 'Foxglove',   leaf: '#4f7a3c', flower: '#c9659a', form: 'spire' },
      thyme:     { name: 'Thyme',      leaf: '#5f7b4b', flower: '#d6a3c4', form: 'mound' },
      lavender:  { name: 'Lavender',   leaf: '#7f9775', flower: '#8c7ad6', form: 'wand' },
      feverfew:  { name: 'Feverfew',   leaf: '#6d8f3f', flower: '#f3eedb', form: 'daisy' },
      borage:    { name: 'Borage',     leaf: '#58783f', flower: '#5d86e6', form: 'star' },
      rosemary:  { name: 'Rosemary',   leaf: '#4a6a4c', flower: '#9fb3e6', form: 'needle' },
      chamomile: { name: 'Chamomile',  leaf: '#6f9447', flower: '#f6f1dc', form: 'daisy' },
      mint:      { name: 'Mint',       leaf: '#4f8f4a', flower: '#c6b2df', form: 'broad' },
      comfrey:   { name: 'Comfrey',    leaf: '#4c6e36', flower: '#b97fc0', form: 'bell' },
      lemonbalm: { name: 'Lemon balm', leaf: '#7ea443', flower: '#f0eac2', form: 'mound' }
    },
    herbHp: 140,

    // Where things come over the wall. side: the wall they climb, x/z on the wall line.
    breaches: [
      { id: 'N1', x: -5.5, z: -12.75, side: 'N' }, { id: 'N2', x: 4.5, z: -12.75, side: 'N' },
      { id: 'W1', x: -12.75, z: -2.5, side: 'W' }, { id: 'W2', x: -12.75, z: 7.5, side: 'W' },
      { id: 'E1', x: 12.75, z: -8.0, side: 'E' }, { id: 'E2', x: 12.75, z: 1.5, side: 'E' },
      { id: 'S1', x: -4.0, z: 12.75, side: 'S' }, { id: 'S2', x: 6.5, z: 12.75, side: 'S' }
    ],

    witch: {
      speed: 4.7, accel: 16, radius: 0.36,
      castMove: { startup: 0.45, active: 0.3, recovery: 0.65 },
      skip: { ticks: 11, speed: 13.5, cooldown: 84 },
      knockTicks: 54, invulnTicks: 132, knockSpeed: 6.5
    },

    // design-action-combat: each verb has startup, active, recovery, cooldown, contact shape and outcome.
    spells: {
      ember: {
        name: 'Ember', element: 'fire', key: 'J', mouse: 'Left click',
        startup: 15, active: 6, recovery: 14, cooldown: 62, buffer: 12,
        range: 8.5, minRange: 1.4,
        flight: { base: 0.16, perUnit: 0.044 },          // seconds: travel time waits for the arrival
        burst: { radius: 1.25, dmg: 3 },
        ring: { from: 0.45, to: 2.35, growS: 0.36, band: 0.62, dmg: 2, burnS: 1.7, tickDmg: 1, tickEvery: 22 },
        ignite: { dmg: 1, every: 30, ticks: 90 },
        line: 'A seed thrown hot. It bursts into a ring of flame. Slugs hate it.'
      },
      rime: {
        name: 'Rime', element: 'frost', key: 'K', mouse: 'Right click',
        startup: 13, active: 18, recovery: 18, cooldown: 190, buffer: 12,
        range: 6.6, halfAngle: 0.56, frontSpeed: 22, dmg: 1,
        slow: { mul: 0.45, ticks: 200 }, freeze: { ticks: 210 }, linger: { ticks: 270, mul: 0.55, chillToFreeze: 70 },
        line: 'A breath of frost across the ground. Everything on it slows; snails freeze, and frozen snails shatter.'
      },
      spark: {
        name: 'Spark', element: 'lightning', key: 'L', mouse: 'Space',
        startup: 12, active: 22, recovery: 14, cooldown: 132, buffer: 12,
        range: 8.6, aimSnap: 2.6, coneCos: 0.62, jumps: 4, jumpRange: 4.4,
        linkGap: 5, leader: 3, dmg: [3, 2.5, 2, 2, 2, 2],
        line: 'A chain bolt from the lantern. It jumps between up to four foes, and it is the only thing that cracks a shell.'
      }
    },

    // build-threejs-enemy-systems: authored definitions; instances keep their own state.
    enemies: {
      slug: {
        name: 'Slug', hp: 5, radius: 0.3, speed: 0.95, bite: 6, biteEvery: 54, rearTicks: 30,
        mult: { fire: 2, frost: 1, lightning: 1 }, fleeOnFire: 84, score: 10,
        line: 'Soft, slow, always hungry. Fire sends them squirming.'
      },
      snail: {
        name: 'Snail', hp: 8, radius: 0.33, speed: 0.68, bite: 5, biteEvery: 60, rearTicks: 30,
        mult: { fire: 0.5, frost: 1, lightning: 1 }, hideOnFire: 66, freezes: true, score: 15, shatterBonus: 10,
        line: 'Tough little houses. Freeze them, then break them.'
      },
      beetle: {
        name: 'Armoured beetle', hp: 7, radius: 0.42, speed: 1.3, bite: 8, biteEvery: 60, rearTicks: 30,
        mult: { fire: 1.25, frost: 1.25, lightning: 1.25 }, armored: true, score: 30,
        charge: { aggro: 6.2, windup: 40, track: 16, ticks: 30, speed: 8.6, recover: 54, cooldown: 220, wallDaze: 60 },
        line: 'Shell like a coal scuttle. Only Spark gets under it.'
      },
      grub: {
        name: 'Thorn grub', hp: 3, radius: 0.26, speed: 1.9, bite: 5, biteEvery: 48, rearTicks: 18,
        mult: { fire: 1.5, frost: 1, lightning: 1 }, score: 8,
        line: 'The Thornback\'s brood. Quick, and they go for the roots.'
      },
      thornback: {
        name: 'The Thornback', hp: 130, radius: 1.15, speed: 1.35, boss: true, score: 500,
        plates: 3, openTicks: 380, regrowFlash: 30,
        mult: { fire: 1, frost: 1, lightning: 1 },
        dmgOpen: { fire: 0.75, frost: 2, lightning: 1.35 },
        phase2At: 0.5, roarTicks: 78,
        charge: { windup: 54, track: 20, ticks: 46, speed: 9.4, recover: 70, cooldown: 300, trample: 22, wallDaze: 96 },
        stomp: { range: 3.6, windup: 46, radius: 3.3, recover: 60, cooldown: 230 },
        volley: { windup: 44, count: 5, spread: 3.4, flight: 50, radius: 0.95, dmgHerb: 12, cooldown: 330 },
        brood: { every: 760, count: 2, cap: 4 },
        speed2: 1.65,
        line: 'Old as the wall and twice as mean. Crack its plates with Spark, then burn what is underneath.'
      }
    },

    // design-game-encounters: one new pressure per bell, then the mix, then the boss.
    // Each group: at (seconds into the wave), kind, n, every (seconds between), from (breach ids, or 'any').
    waves: [
      { name: 'Dusk', bell: 'The first bell', line: 'The slugs come first. They always do.',
        groups: [
          { at: 1.0, kind: 'slug', n: 3, every: 2.6, from: ['N1', 'W1', 'E1'] },
          { at: 10.0, kind: 'slug', n: 4, every: 2.0, from: ['S1', 'N2', 'W2', 'E2'] },
          { at: 19.0, kind: 'slug', n: 3, every: 1.6, from: 'any' }
        ] },
      { name: 'Lamplight', bell: 'The second bell', line: 'Snails, with their houses on their backs.',
        groups: [
          { at: 1.0, kind: 'snail', n: 3, every: 2.4, from: ['N2', 'E2', 'W1'] },
          { at: 6.0, kind: 'slug', n: 4, every: 1.8, from: 'any' },
          { at: 14.0, kind: 'snail', n: 3, every: 1.8, from: ['S2', 'S1', 'W2'] },
          { at: 20.0, kind: 'slug', n: 3, every: 1.2, from: 'any' }
        ] },
      { name: 'The Owl\'s Hour', bell: 'The third bell', line: 'Beetles. Only Spark gets under a shell.',
        groups: [
          { at: 1.0, kind: 'beetle', n: 2, every: 3.0, from: ['N1', 'E1'] },
          { at: 5.0, kind: 'slug', n: 4, every: 1.5, from: 'any' },
          { at: 13.0, kind: 'beetle', n: 2, every: 2.5, from: ['W2', 'S2'] },
          { at: 18.0, kind: 'snail', n: 3, every: 1.5, from: 'any' },
          { at: 22.0, kind: 'slug', n: 3, every: 1.2, from: 'any' }
        ] },
      { name: 'Deep Night', bell: 'The fourth bell', line: 'All of them, and from every wall.',
        groups: [
          { at: 1.0, kind: 'slug', n: 5, every: 1.1, from: 'any' },
          { at: 5.0, kind: 'snail', n: 4, every: 1.4, from: 'any' },
          { at: 10.0, kind: 'beetle', n: 3, every: 2.6, from: 'any' },
          { at: 17.0, kind: 'slug', n: 4, every: 1.0, from: 'any' },
          { at: 22.0, kind: 'snail', n: 3, every: 1.2, from: 'any' }
        ] },
      { name: 'The Small Hours', bell: 'The fifth bell', line: 'The quietest hour of the night. Not tonight.',
        groups: [
          { at: 1.0, kind: 'snail', n: 4, every: 1.0, from: 'any' },
          { at: 3.0, kind: 'slug', n: 4, every: 1.1, from: 'any' },
          { at: 8.0, kind: 'beetle', n: 4, every: 2.2, from: 'any' },
          { at: 15.0, kind: 'snail', n: 4, every: 1.2, from: 'any' },
          { at: 18.0, kind: 'slug', n: 4, every: 1.0, from: 'any' },
          { at: 24.0, kind: 'beetle', n: 2, every: 2.0, from: 'any' }
        ] },
      { name: 'Before Dawn', bell: 'The last bell', line: 'Something big is coming over the north wall.', boss: true,
        groups: [
          { at: 1.5, kind: 'thornback', n: 1, every: 0, from: ['N1'] },
          { at: 14.0, kind: 'slug', n: 3, every: 3.5, from: ['S1', 'S2', 'E2'] }
        ] }
    ],
    bellTicks: 150,       // the pause before each wave, while its name is rung

    // One of three, between bells. Drawn from the upgrade stream so a seed always offers the same cards.
    upgrades: [
      { id: 'kindling', name: 'Kindling pouch', spell: 'ember', text: 'Ember\'s ring of flame burns 30% wider.' },
      { id: 'bellows', name: 'Bellows', spell: 'ember', text: 'Ember is ready again 30% sooner.' },
      { id: 'longburn', name: 'Slow coals', spell: 'ember', text: 'Ember\'s ring keeps burning twice as long.' },
      { id: 'hoarfrost', name: 'Hoarfrost', spell: 'rime', text: 'Rime reaches 2 paces further and its frost stays 2 s longer.' },
      { id: 'blackice', name: 'Black ice', spell: 'rime', text: 'Rime freezes slugs as well as snails.' },
      { id: 'coldhands', name: 'Cold hands', spell: 'rime', text: 'Rime is ready again 30% sooner.' },
      { id: 'copper', name: 'Copper thread', spell: 'spark', text: 'Spark jumps to two more foes.' },
      { id: 'quickwick', name: 'Quick wick', spell: 'spark', text: 'Spark is ready again 30% sooner.' },
      { id: 'mulch', name: 'Leaf mould', spell: null, text: 'Every herb still standing heals 40.' },
      { id: 'nettle', name: 'Nettle collars', spell: null, text: 'Anything that bites a herb gets stung for 1.' },
      { id: 'lightfeet', name: 'Light feet', spell: null, text: 'Walk 15% faster; Skip is ready twice as often.' }
    ],

    score: { chainExtra: 5, waveHerb: 20, dawnHerb: 100, perfect: 400 },

    copy: {
      place: 'Brackenhollow',
      hook: 'Hold the herb garden till the rooks wake. Everything with a mouth is coming over the wall.',
      win: ['Dawn over Brackenhollow. The rooks are up, and the slugs are not.',
            'First light. The beds are standing and the kettle can go on.',
            'Morning. The Thornback is a pile of shell, and the thyme never noticed.'],
      lose: ['The beds are bare, and the beetles look very pleased with themselves.',
             'Gone to the slugs. There will be no tansy tea this winter.',
             'The garden is eaten. The wall remembers, and so will you.'],
      herbLost: ['{herb} is gone.', 'They\'ve had the {herb}.', 'No more {herb}.']
    }
  };

  // Content validation (build-threejs-enemy-systems: reject duplicate ids, bad references, impossible timing).
  C.validate = function () {
    var issues = [], seen = {};
    C.upgrades.forEach(function (u) { if (seen[u.id]) issues.push('duplicate upgrade ' + u.id); seen[u.id] = 1; });
    var bIds = {}; C.breaches.forEach(function (b) { bIds[b.id] = 1; });
    C.waves.forEach(function (w, i) {
      w.groups.forEach(function (g) {
        if (!C.enemies[g.kind]) issues.push('wave ' + i + ': unknown enemy ' + g.kind);
        if (g.from !== 'any') g.from.forEach(function (f) { if (!bIds[f]) issues.push('wave ' + i + ': unknown breach ' + f); });
      });
    });
    C.beds.forEach(function (b) { b.herbs.forEach(function (h) { if (!C.herbs[h]) issues.push('bed ' + b.id + ': unknown herb ' + h); }); });
    Object.keys(C.spells).forEach(function (k) {
      var s = C.spells[k];
      if (!(s.startup > 0 && s.recovery > 0 && s.cooldown >= s.startup)) issues.push('spell ' + k + ': impossible timing');
    });
    return issues;
  };

  window.HW_CONTENT = C;
})();
