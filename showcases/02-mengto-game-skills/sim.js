/* Hedge Witch: the simulation.
   Fixed 60 Hz ticks, seeded random streams (one per feature, so adding a draw in one never reshuffles another),
   no DOM and no three.js. Contact is decided here; the renderer only reads state and the event outbox.
   design-action-combat: every spell is startup -> active -> recovery with a cooldown, and each contact is applied
   once per (action id, target id). tune-enemy-ai: named states with dwell times, a telegraph before every attack,
   and an attack token so only so many foes commit at once. */
(function () {
  'use strict';

  function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function stream(seed, name) {
    var a = (seed ^ hashStr(name)) >>> 0;
    var f = function () {
      a = (a + 0x9e3779b9) | 0; var t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); t ^= t >>> 15;
      return (t >>> 0) / 4294967296;
    };
    f.range = function (lo, hi) { return lo + (hi - lo) * f(); };
    f.int = function (n) { return Math.floor(f() * n); };
    return f;
  }
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, z) { return Math.sqrt(x * x + z * z); }
  function angDiff(a, b) { var d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function r3(v) { return Math.round(v * 1000) / 1000; }

  function createSim(C, opt) {
    opt = opt || {};
    var seed = (opt.seed >>> 0) || 1;
    var rSpawn = stream(seed, 'spawn'), rAi = stream(seed, 'ai'), rUp = stream(seed, 'upgrades'), rBoss = stream(seed, 'boss');
    var G = C.garden, HALF = G.half;
    var SP = C.spells, EN = C.enemies;

    var S = {
      seed: seed, tick: 0, frame: 0, hitstop: 0,
      phase: 'bell', phaseT: 0, wave: 0, waveTick: 0, lastWave: C.waves.length - 1,
      score: 0, herbsEaten: 0, result: null, endTick: 0,
      stats: { slug: 0, snail: 0, beetle: 0, grub: 0, thornback: 0, shattered: 0, longestChain: 0, casts: { ember: 0, rime: 0, spark: 0 }, knocked: 0 },
      witch: null, herbs: [], enemies: [], seeds: [], rings: [], frosts: [], chains: [], thorns: [], queue: [],
      ups: {}, upList: [], offer: null, nextId: 1, aiOff: false, review: null, bossSpawned: false, bossDown: 0
    };
    var out = [];
    function emit(type, d) { d = d || {}; d.type = type; d.tick = S.tick; out.push(d); if (out.length > 600) out.splice(0, out.length - 600); return d; }

    // ---------------- setup
    function makeWitch() {
      return { x: 0, z: 2.2, px: 0, pz: 2.2, vx: 0, vz: 0, face: Math.PI * 0.75, moving: 0,
        cast: null, buffer: null, cd: { ember: 0, rime: 0, spark: 0 }, skipT: 0, skipCd: 0, sdx: 0, sdz: 1,
        knockT: 0, invT: 0, ax: 0, az: 0 };
    }
    S.witch = makeWitch();
    C.beds.forEach(function (b) {
      b.herbs.forEach(function (h, i) {
        var along = (i === 0 ? -1 : 1) * (Math.max(b.w, b.d) * 0.24);
        var hx = b.x + (b.w > b.d ? along : 0), hz = b.z + (b.w > b.d ? 0 : along);
        S.herbs.push({ id: S.herbs.length, kind: h, bed: b.id, x: hx, z: hz, hp: C.herbHp, max: C.herbHp, eaten: false, eaters: 0, hurtT: 0 });
      });
    });

    var input = { mx: 0, mz: 0, ax: 0, az: 3, ember: false, rime: false, spark: false, skip: false, pEmber: false, pRime: false, pSpark: false, pSkip: false };

    // ---------------- spell parameters with upgrades applied (content stays untouched)
    function up(id) { return !!S.ups[id]; }
    function cooldownOf(name) {
      var c = SP[name].cooldown;
      if (name === 'ember' && up('bellows')) c *= 0.7;
      if (name === 'rime' && up('coldhands')) c *= 0.7;
      if (name === 'spark' && up('quickwick')) c *= 0.7;
      return Math.round(c);
    }
    function emberRingR() { return SP.ember.ring.to * (up('kindling') ? 1.3 : 1); }
    function emberBurnTicks() { return Math.round(SP.ember.ring.burnS * 60 * (up('longburn') ? 2 : 1)); }
    function rimeRange() { return SP.rime.range + (up('hoarfrost') ? 2 : 0); }
    function rimeLinger() { return SP.rime.linger.ticks + (up('hoarfrost') ? 120 : 0); }
    function sparkJumps() { return SP.spark.jumps + (up('copper') ? 2 : 0); }
    function witchSpeed() { return C.witch.speed * (up('lightfeet') ? 1.15 : 1); }
    function skipCooldown() { return Math.round(C.witch.skip.cooldown * (up('lightfeet') ? 0.5 : 1)); }

    // ---------------- geometry helpers
    function insideClamp(o, r) { var m = HALF - r; o.x = clamp(o.x, -m, m); o.z = clamp(o.z, -m, m); }
    function collideStatic(o, r) {
      for (var i = 0; i < C.beds.length; i++) {
        var b = C.beds[i], hw = b.w / 2 + r, hd = b.d / 2 + r;
        var dx = o.x - b.x, dz = o.z - b.z;
        if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
          var px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
          if (px < pz) o.x += px * (dx < 0 ? -1 : 1); else o.z += pz * (dz < 0 ? -1 : 1);
        }
      }
      var sd = G.sundial, dx2 = o.x - sd.x, dz2 = o.z - sd.z, d2 = len(dx2, dz2), mr = sd.r + r;
      if (d2 < mr && d2 > 1e-5) { o.x = sd.x + dx2 / d2 * mr; o.z = sd.z + dz2 / d2 * mr; }
      insideClamp(o, r);
    }
    function herbAt(id) { return S.herbs[id]; }
    function enemyById(id) { for (var i = 0; i < S.enemies.length; i++) if (S.enemies[i].id === id) return S.enemies[i]; return null; }
    function alive(e) { return e && !e.dead; }
    function targetable(e) { return alive(e) && e.state !== 'climb' || (alive(e) && e.st > 18); }

    // ---------------- waves
    function startWave(i) {
      S.wave = i; S.phase = 'bell'; S.phaseT = 0; S.queue.length = 0;
      emit('bell', { wave: i, name: C.waves[i].name, bell: C.waves[i].bell, line: C.waves[i].line, boss: !!C.waves[i].boss });
    }
    function beginWaveSpawns() {
      var w = C.waves[S.wave], q = [];
      w.groups.forEach(function (g, gi) {
        for (var k = 0; k < g.n; k++) {
          var from = g.from === 'any' ? C.breaches[rSpawn.int(C.breaches.length)].id : g.from[k % g.from.length];
          var at = S.tick + Math.round((g.at + k * g.every) * 60);
          q.push({ kind: g.kind, from: from, at: at, warn: at - 84, warned: false, order: gi * 100 + k });
        }
      });
      q.sort(function (a, b) { return a.at - b.at || a.order - b.order; });
      S.queue = q; S.phase = 'wave'; S.phaseT = 0; S.waveTick = S.tick;
      emit('waveStart', { wave: S.wave });
    }
    function breachById(id) { for (var i = 0; i < C.breaches.length; i++) if (C.breaches[i].id === id) return C.breaches[i]; return C.breaches[0]; }
    function inward(side) { return side === 'N' ? [0, 1] : side === 'S' ? [0, -1] : side === 'W' ? [1, 0] : [-1, 0]; }

    function spawnEnemy(kind, fromId, opts) {
      opts = opts || {};
      var def = EN[kind], b = breachById(fromId), n = inward(b.side);
      var jitter = opts.noJitter ? 0 : rSpawn.range(-0.8, 0.8);
      var tx = -n[1], tz = n[0];
      var depth = def.boss ? 3.2 : 1.5;
      var e = {
        id: S.nextId++, kind: kind, x: b.x + tx * jitter, z: b.z + tz * jitter, px: 0, pz: 0, vx: 0, vz: 0,
        face: Math.atan2(n[0], n[1]), r: def.radius, hp: def.hp, max: def.hp,
        state: 'climb', st: 0, climbT: def.boss ? 96 : 44,
        fromX: b.x + tx * jitter, fromZ: b.z + tz * jitter, toX: b.x + tx * jitter + n[0] * depth, toZ: b.z + tz * jitter + n[1] * depth,
        target: -1, slowT: 0, slowMul: 1, frozenT: 0, burnT: 0, burnAcc: 0, hideT: 0, chill: 0, hurtT: 0, fleeX: 0, fleeZ: 0,
        armored: !!def.armored, plates: def.plates || 0, openT: 0, bossPhase: def.boss ? 1 : 0,
        cd: 60 + rAi.int(90), stompCd: 120, volleyCd: 200, broodT: 0, cdx: 0, cdz: 1, trampled: null, biteT: 0, lit: 0,
        wob: rAi.range(0, TAU), dead: false
      };
      if (def.charge) e.cd = def.charge.cooldown * 0.5 + rAi.int(60);
      e.px = e.x; e.pz = e.z;
      S.enemies.push(e);
      emit('spawn', { id: e.id, kind: kind, breach: b.id, x: e.x, z: e.z, toX: e.toX, toZ: e.toZ, boss: !!def.boss });
      if (def.boss) S.bossSpawned = true;
      return e;
    }

    function pickHerb(e) {
      var best = -1, bs = 1e9;
      for (var i = 0; i < S.herbs.length; i++) {
        var h = S.herbs[i]; if (h.eaten) continue;
        var s = len(h.x - e.x, h.z - e.z) + (h.eaters >= 2 ? 9 : h.eaters * 1.6);
        if (s < bs) { bs = s; best = i; }
      }
      if (e.target >= 0 && e.target !== best && S.herbs[e.target]) S.herbs[e.target].eaters = Math.max(0, S.herbs[e.target].eaters - 1);
      if (best >= 0 && best !== e.target) S.herbs[best].eaters++;
      e.target = best;
    }
    function releaseHerb(e) { if (e.target >= 0 && S.herbs[e.target]) S.herbs[e.target].eaters = Math.max(0, S.herbs[e.target].eaters - 1); e.target = -1; }

    // ---------------- combat resolution
    function setState(e, s) { e.state = s; e.st = 0; }
    function kill(e, how, element) {
      if (e.dead) return;
      var def = EN[e.kind];
      e.dead = true; releaseHerb(e);
      var pts = def.score + (how === 'shatter' ? (def.shatterBonus || 10) : 0);
      if (S.phase !== 'review' && !S.result) S.score += pts;
      S.stats[e.kind] = (S.stats[e.kind] || 0) + 1;
      if (how === 'shatter') S.stats.shattered++;
      emit('kill', { id: e.id, kind: e.kind, how: how, element: element || '', x: e.x, z: e.z, face: e.face, pts: pts });
      if (def.boss) { S.bossDown = S.tick; S.hitstop = Math.max(S.hitstop, 9); emit('bossDown', { x: e.x, z: e.z }); }
    }
    function freeze(e, ticks) {
      if (e.dead) return;
      if (e.state === 'windup' || e.state === 'charge') { /* charging foes are only slowed */ }
      releaseHerb(e); e.frozenT = ticks; setState(e, 'frozen'); e.chill = 0;
      emit('freeze', { id: e.id, x: e.x, z: e.z, kind: e.kind });
    }
    // amount is the spell's base damage; returns the outcome so callers can score and emit.
    function hurt(e, amount, element, src) {
      if (!alive(e)) return 'none';
      var def = EN[e.kind];
      if (def.boss) return hurtBoss(e, amount, element, src);
      if (e.frozenT > 0) { kill(e, 'shatter', element); S.hitstop = Math.max(S.hitstop, 4); emit('shatter', { id: e.id, x: e.x, z: e.z, kind: e.kind, element: element }); return 'shatter'; }
      if (e.armored) {
        if (element === 'lightning') {
          e.armored = false; S.hitstop = Math.max(S.hitstop, 5);
          emit('shellCrack', { id: e.id, x: e.x, z: e.z });
        } else {
          emit('deflect', { id: e.id, x: e.x, z: e.z, element: element, why: 'shell' });
          if (element === 'frost') { e.slowT = Math.max(e.slowT, SP.rime.slow.ticks); e.slowMul = SP.rime.slow.mul; }
          return 'deflect';
        }
      }
      if (e.hideT > 0 && element !== 'lightning') { emit('deflect', { id: e.id, x: e.x, z: e.z, element: element, why: 'hidden' }); return 'deflect'; }
      var dmg = amount * (def.mult[element] || 1);
      e.hp -= dmg; e.hurtT = 10;
      emit('hit', { id: e.id, x: e.x, z: e.z, element: element, dmg: r3(dmg), src: src || '' });
      if (e.hp <= 0.001) { kill(e, element, element); return 'kill'; }
      if (element === 'fire') {
        if (def.fleeOnFire && e.state !== 'windup' && e.state !== 'charge') { releaseHerb(e); e.fleeX = src && src.x !== undefined ? src.x : e.x; e.fleeZ = src && src.z !== undefined ? src.z : e.z; setState(e, 'flee'); e.fleeT = def.fleeOnFire; emit('flee', { id: e.id }); }
        if (def.hideOnFire) { e.hideT = def.hideOnFire; if (e.state === 'eat' || e.state === 'rear') { /* keeps its herb */ } emit('hide', { id: e.id }); }
      } else if (element === 'lightning') {
        if (e.state !== 'charge') { e.stagT = 14; }
      }
      return 'hit';
    }
    function hurtBoss(e, amount, element, src) {
      var def = EN[e.kind];
      if (e.state === 'roar' || e.state === 'climb' && e.st < 40) { emit('deflect', { id: e.id, x: e.x, z: e.z, element: element, why: 'roar' }); return 'deflect'; }
      if (e.plates > 0) {
        if (element === 'lightning') {
          e.plates--; S.hitstop = Math.max(S.hitstop, 6);
          emit('plateCrack', { id: e.id, x: e.x, z: e.z, left: e.plates });
          if (e.plates === 0) { e.openT = def.openTicks; emit('shellOpen', { id: e.id, x: e.x, z: e.z }); }
          e.hp -= 1; e.hurtT = 10;
          return 'crack';
        }
        if (element === 'frost') { e.slowT = Math.max(e.slowT, 120); e.slowMul = 0.7; }
        emit('deflect', { id: e.id, x: e.x, z: e.z, element: element, why: 'shell' });
        return 'deflect';
      }
      var dmg = amount * (def.dmgOpen[element] || 1);
      e.hp -= dmg; e.hurtT = 10;
      emit('hit', { id: e.id, x: e.x, z: e.z, element: element, dmg: r3(dmg), boss: true });
      if (e.hp <= 0.001) { e.hp = 0; kill(e, element, element); return 'kill'; }
      if (e.bossPhase === 1 && e.hp <= e.max * def.phase2At) {
        e.bossPhase = 2; e.plates = 0; e.openT = 0; setState(e, 'roar'); S.hitstop = Math.max(S.hitstop, 8);
        emit('bossPhase', { id: e.id, phase: 2, x: e.x, z: e.z });
      }
      return 'hit';
    }

    function knockWitch(fx, fz, why) {
      var W = S.witch;
      if (W.invT > 0 || W.skipT > 0) { if (W.skipT > 0) emit('dodge', { x: W.x, z: W.z, why: why }); return false; }
      var dx = W.x - fx, dz = W.z - fz, d = len(dx, dz) || 1;
      W.knockT = C.witch.knockTicks; W.invT = C.witch.invulnTicks;
      W.vx = dx / d * C.witch.knockSpeed; W.vz = dz / d * C.witch.knockSpeed;
      if (W.cast) emit('castCancel', { spell: W.cast.name });
      W.cast = null; W.buffer = null;
      S.stats.knocked++;
      emit('witchHit', { x: W.x, z: W.z, why: why });
      return true;
    }

    // ---------------- spells
    function lanternPos() { var W = S.witch; return { x: W.x + Math.sin(W.face) * 0.38 + Math.cos(W.face) * 0.36, y: 2.0, z: W.z + Math.cos(W.face) * 0.38 - Math.sin(W.face) * 0.36 }; }
    function release(c) {
      var W = S.witch, name = c.name, sp = SP[name];
      W.cd[name] = cooldownOf(name);
      S.stats.casts[name]++;
      var dx = c.ax - W.x, dz = c.az - W.z, d = len(dx, dz);
      if (d < 0.01) { dx = Math.sin(W.face); dz = Math.cos(W.face); d = 1; }
      var ux = dx / d, uz = dz / d;
      W.face = Math.atan2(ux, uz);
      if (name === 'ember') {
        var dist = clamp(d, sp.minRange, sp.range);
        var tx = W.x + ux * dist, tz = W.z + uz * dist;
        var m = HALF - 0.4; tx = clamp(tx, -m, m); tz = clamp(tz, -m, m);
        var dd = len(tx - W.x, tz - W.z);
        var T = Math.max(8, Math.round((sp.flight.base + sp.flight.perUnit * dd) * 60));
        var hx = W.x + ux * 0.3 - uz * 0.3, hz = W.z + uz * 0.3 + ux * 0.3;
        var s = { id: S.nextId++, x0: hx, z0: hz, x1: tx, z1: tz, t: 0, T: T };
        S.seeds.push(s);
        emit('release', { spell: 'ember', id: s.id, x0: hx, z0: hz, x1: tx, z1: tz, T: T });
      } else if (name === 'rime') {
        var f = { id: S.nextId++, x: W.x + ux * 0.25, z: W.z + uz * 0.25, ang: Math.atan2(ux, uz), ux: ux, uz: uz, half: sp.halfAngle,
          range: rimeRange(), t: 0, frontT: Math.round(rimeRange() / sp.frontSpeed * 60), life: rimeLinger(), hit: {} };
        S.frosts.push(f);
        emit('release', { spell: 'rime', id: f.id, x: f.x, z: f.z, ang: f.ang, half: f.half, range: f.range, frontT: f.frontT, life: f.life });
      } else if (name === 'spark') {
        var L = lanternPos();
        var ch = { id: S.nextId++, ax: c.ax, az: c.az, ux: ux, uz: uz, hit: {}, n: 0, max: sparkJumps(), next: S.tick, pending: null, lx: L.x, ly: L.y, lz: L.z, first: true, done: false };
        S.chains.push(ch);
        emit('release', { spell: 'spark', id: ch.id, x: L.x, y: L.y, z: L.z });
      }
    }
    function sparkFirstTarget(ch) {
      var W = S.witch, sp = SP.spark, best = null, bs = 1e9;
      for (var i = 0; i < S.enemies.length; i++) {
        var e = S.enemies[i]; if (!targetable(e)) continue;
        var dw = len(e.x - W.x, e.z - W.z); if (dw > sp.range + e.r) continue;
        var da = len(e.x - ch.ax, e.z - ch.az);
        if (da < sp.aimSnap + e.r && da < bs) { bs = da; best = e; }
      }
      if (best) return best;
      bs = 1e9;
      for (var j = 0; j < S.enemies.length; j++) {
        var e2 = S.enemies[j]; if (!targetable(e2)) continue;
        var vx = e2.x - W.x, vz = e2.z - W.z, dw2 = len(vx, vz); if (dw2 > sp.range + e2.r || dw2 < 0.01) continue;
        var cos = (vx * ch.ux + vz * ch.uz) / dw2; if (cos < sp.coneCos) continue;
        var sc = dw2 * (2 - cos);
        if (sc < bs) { bs = sc; best = e2; }
      }
      return best;
    }
    function sparkNextTarget(ch) {
      var best = null, bs = 1e9;
      for (var i = 0; i < S.enemies.length; i++) {
        var e = S.enemies[i]; if (!targetable(e) || ch.hit[e.id]) continue;
        var d = len(e.x - ch.lx, e.z - ch.lz); if (d > SP.spark.jumpRange + e.r) continue;
        if (d < bs) { bs = d; best = e; }
      }
      return best;
    }
    function stepChains() {
      var sp = SP.spark;
      for (var i = S.chains.length - 1; i >= 0; i--) {
        var ch = S.chains[i];
        if (ch.pending && S.tick >= ch.pending.at) {
          var p = ch.pending, e = enemyById(p.id); ch.pending = null;
          if (e && alive(e)) {
            var res = hurt(e, sp.dmg[Math.min(ch.n, sp.dmg.length - 1)], 'lightning', { x: ch.lx, z: ch.lz });
            emit('sparkHit', { chain: ch.id, i: ch.n, id: e.id, x: e.x, z: e.z, res: res });
          } else emit('sparkHit', { chain: ch.id, i: ch.n, id: -1, x: p.x, z: p.z, res: 'none' });
          ch.lx = p.x; ch.lz = p.z; ch.ly = 0.5; ch.n++;
          if (ch.n > 1 && S.phase !== 'review') S.score += C.score.chainExtra;
          S.stats.longestChain = Math.max(S.stats.longestChain, ch.n);
          if (ch.n >= ch.max) ch.done = true; else ch.next = S.tick + (sp.linkGap - sp.leader);
        }
        if (!ch.done && !ch.pending && S.tick >= ch.next) {
          var t = ch.first ? sparkFirstTarget(ch) : sparkNextTarget(ch);
          if (t) {
            ch.hit[t.id] = 1;
            ch.pending = { id: t.id, x: t.x, z: t.z, at: S.tick + sp.leader };
            emit('sparkLink', { chain: ch.id, i: ch.n, fx: ch.lx, fy: ch.ly, fz: ch.lz, tx: t.x, tz: t.z, id: t.id, kind: t.kind, leader: sp.leader });
          } else if (ch.first) {
            var W = S.witch, dx = ch.ax - W.x, dz = ch.az - W.z, d = len(dx, dz), dist = clamp(d, 2, sp.range * 0.8);
            var gx = clamp(W.x + ch.ux * dist, -HALF + 0.4, HALF - 0.4), gz = clamp(W.z + ch.uz * dist, -HALF + 0.4, HALF - 0.4);
            emit('sparkLink', { chain: ch.id, i: 0, fx: ch.lx, fy: ch.ly, fz: ch.lz, tx: gx, tz: gz, id: -1, ground: true, leader: sp.leader });
            ch.done = true;
          } else ch.done = true;
          ch.first = false;
        }
        if (ch.done && !ch.pending) { emit('chainEnd', { chain: ch.id, n: ch.n }); S.chains.splice(i, 1); }
      }
    }
    function stepSeeds() {
      var sp = SP.ember;
      for (var i = S.seeds.length - 1; i >= 0; i--) {
        var s = S.seeds[i]; s.t++;
        if (s.t < s.T) continue;
        S.seeds.splice(i, 1);
        var x = s.x1, z = s.z1;
        emit('emberBurst', { id: s.id, x: x, z: z, R: emberRingR(), growT: Math.round(sp.ring.growS * 60), burnT: emberBurnTicks() });
        for (var j = 0; j < S.enemies.length; j++) {
          var e = S.enemies[j]; if (!alive(e)) continue;
          if (len(e.x - x, e.z - z) < sp.burst.radius + e.r) { var res = hurt(e, sp.burst.dmg, 'fire', { x: x, z: z }); if (res === 'hit') ignite(e); }
        }
        // the boss tramples nothing here; the burst also singes nothing on the herbs (the witch's fire knows its friends)
        S.rings.push({ id: s.id, x: x, z: z, r: sp.ring.from, R: emberRingR(), t: 0, growT: Math.round(sp.ring.growS * 60), burnT: emberBurnTicks(), front: {}, last: {} });
      }
    }
    function ignite(e) { var ig = SP.ember.ignite; if (!EN[e.kind].boss) e.burnT = ig.ticks; }
    function stepRings() {
      var rg = SP.ember.ring;
      for (var i = S.rings.length - 1; i >= 0; i--) {
        var R = S.rings[i]; R.t++;
        var k = Math.min(1, R.t / R.growT); var ease = 1 - Math.pow(1 - k, 2.2);
        var prevR = R.r; R.r = rg.from + (R.R - rg.from) * ease;
        for (var j = 0; j < S.enemies.length; j++) {
          var e = S.enemies[j]; if (!alive(e)) continue;
          var d = len(e.x - R.x, e.z - R.z);
          if (R.t <= R.growT) {
            // the front: hit when it sweeps past this foe, once per ring
            if (!R.front[e.id] && d < R.r + rg.band * 0.5 + e.r && d > prevR - rg.band * 0.5 - e.r - 0.15) {
              R.front[e.id] = 1; R.last[e.id] = S.tick;
              var res = hurt(e, rg.dmg, 'fire', { x: R.x, z: R.z }); if (res === 'hit') ignite(e);
            }
          } else if (Math.abs(d - R.r) < rg.band * 0.5 + e.r) {
            if (!R.last[e.id] || S.tick - R.last[e.id] >= rg.tickEvery) { R.last[e.id] = S.tick; var r2 = hurt(e, rg.tickDmg, 'fire', { x: R.x, z: R.z }); if (r2 === 'hit') ignite(e); }
          }
        }
        if (R.t > R.growT + R.burnT) { emit('ringOut', { id: R.id }); S.rings.splice(i, 1); }
      }
    }
    function stepFrosts() {
      var sp = SP.rime;
      for (var i = S.frosts.length - 1; i >= 0; i--) {
        var f = S.frosts[i]; f.t++;
        var front = Math.min(f.range, (f.t / f.frontT) * f.range);
        for (var j = 0; j < S.enemies.length; j++) {
          var e = S.enemies[j]; if (!alive(e)) continue;
          var vx = e.x - f.x, vz = e.z - f.z, d = len(vx, vz);
          var inCone = d < f.range + e.r && (d < 0.6 || Math.abs(angDiff(f.ang, Math.atan2(vx, vz))) < f.half + Math.atan2(e.r, Math.max(d, 0.5)));
          if (!inCone) continue;
          if (f.t <= f.frontT + 1) {
            if (!f.hit[e.id] && d <= front + e.r) {
              f.hit[e.id] = 1;
              var def = EN[e.kind];
              var wasFrozen = e.frozenT > 0;
              var res = hurt(e, sp.dmg, 'frost', { x: f.x, z: f.z });
              if (!wasFrozen && alive(e)) {
                e.slowT = Math.max(e.slowT, sp.slow.ticks); e.slowMul = sp.slow.mul;
                if (def.freezes || (up('blackice') && e.kind === 'slug')) { if (res !== 'deflect' || e.hideT > 0) freeze(e, sp.freeze.ticks); }
              }
            }
          } else if (f.t < f.life) {
            e.zoneMul = sp.linger.mul;
            var def2 = EN[e.kind];
            if ((def2.freezes || (up('blackice') && e.kind === 'slug')) && e.frozenT <= 0) { e.chill++; if (e.chill >= sp.linger.chillToFreeze) freeze(e, sp.freeze.ticks); }
          }
        }
        if (f.t >= f.life) { emit('frostOut', { id: f.id }); S.frosts.splice(i, 1); }
      }
    }

    // ---------------- witch
    function tryCast(name, pressed) {
      var W = S.witch;
      if (W.knockT > 0 || W.skipT > 0 || S.phase === 'upgrade') return;
      if (W.cast) {
        if (pressed) W.buffer = { name: name, ttl: SP[name].buffer };
        return;
      }
      if (W.cd[name] > 0) { if (pressed) emit('notReady', { spell: name }); return; }
      W.cast = { name: name, phase: 'startup', t: 0, ax: input.ax, az: input.az, id: S.nextId++ };
      var dx = input.ax - W.x, dz = input.az - W.z; if (len(dx, dz) > 0.05) W.face = Math.atan2(dx, dz);
      emit('castStart', { spell: name, id: W.cast.id });
    }
    function stepWitch() {
      var W = S.witch, cw = C.witch;
      W.px = W.x; W.pz = W.z;
      for (var k in W.cd) if (W.cd[k] > 0) W.cd[k]--;
      if (W.skipCd > 0) W.skipCd--;
      if (W.invT > 0) W.invT--;
      if (W.buffer && --W.buffer.ttl <= 0) W.buffer = null;
      var mx = input.mx, mz = input.mz, ml = len(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; ml = 1; }
      if (W.knockT > 0) {
        W.knockT--; W.vx *= 0.9; W.vz *= 0.9;
        W.x += W.vx / 60; W.z += W.vz / 60; collideStatic(W, cw.radius);
        if (W.knockT === 0) emit('witchUp', {});
        W.moving = 0; return;
      }
      // skip: a short dodge; cancels recovery but not a cast already leaving the hand
      if ((input.skip || input.pSkip) && W.skipCd <= 0 && W.skipT <= 0 && (!W.cast || W.cast.phase === 'recovery')) {
        var sx = ml > 0.1 ? mx / ml : Math.sin(W.face), sz = ml > 0.1 ? mz / ml : Math.cos(W.face);
        W.sdx = sx; W.sdz = sz; W.skipT = cw.skip.ticks; W.skipCd = skipCooldown(); W.cast = null;
        emit('skip', { x: W.x, z: W.z, dx: sx, dz: sz });
      }
      if (W.skipT > 0) {
        W.skipT--; var sp = cw.skip.speed * (0.45 + 0.55 * W.skipT / cw.skip.ticks);
        W.vx = W.sdx * sp; W.vz = W.sdz * sp; W.face = Math.atan2(W.sdx, W.sdz);
      } else {
        var mul = 1;
        if (W.cast) mul = cw.castMove[W.cast.phase];
        var tvx = mx * witchSpeed() * mul, tvz = mz * witchSpeed() * mul, a = Math.min(1, cw.accel / 60);
        W.vx += (tvx - W.vx) * a; W.vz += (tvz - W.vz) * a;
      }
      W.x += W.vx / 60; W.z += W.vz / 60;
      collideStatic(W, cw.radius);
      var sp2 = len(W.vx, W.vz); W.moving = sp2;
      if (!W.cast && W.skipT <= 0 && ml > 0.12) {
        var want = Math.atan2(mx, mz); W.face += angDiff(W.face, want) * Math.min(1, 14 / 60 * 1.6);
      }
      W.ax = input.ax; W.az = input.az;
      // casting
      if (W.cast) {
        var c = W.cast, sp3 = SP[c.name]; c.t++;
        if (c.phase === 'startup') {
          c.ax = input.ax; c.az = input.az;
          var dx = c.ax - W.x, dz = c.az - W.z; if (len(dx, dz) > 0.05) W.face += angDiff(W.face, Math.atan2(dx, dz)) * 0.35;
          if (c.t >= sp3.startup) { release(c); c.phase = 'active'; c.t = 0; }
        } else if (c.phase === 'active') {
          if (c.t >= sp3.active) { c.phase = 'recovery'; c.t = 0; }
        } else if (c.phase === 'recovery') {
          if (c.t >= sp3.recovery) { W.cast = null; emit('castEnd', { spell: c.name }); }
        }
      }
      if (!W.cast && W.skipT <= 0) {
        if (W.buffer && W.cd[W.buffer.name] <= 0) { var b = W.buffer.name; W.buffer = null; tryCast(b, false); }
      }
      if (!W.cast && W.skipT <= 0) {
        if (input.pEmber || input.ember) tryCast('ember', input.pEmber);
        else if (input.pRime || input.rime) tryCast('rime', input.pRime);
        else if (input.pSpark || input.spark) tryCast('spark', input.pSpark);
      } else if (W.cast) {
        if (input.pEmber) tryCast('ember', true); else if (input.pRime) tryCast('rime', true); else if (input.pSpark) tryCast('spark', true);
      }
    }

    // ---------------- enemies
    function moveToward(e, tx, tz, speed) {
      var dx = tx - e.x, dz = tz - e.z, d = len(dx, dz);
      if (d < 1e-4) { e.vx = 0; e.vz = 0; return d; }
      var want = Math.atan2(dx, dz);
      e.face += angDiff(e.face, want) * Math.min(1, 5 / 60 * (EN[e.kind].boss ? 0.8 : 1.6));
      var fx = Math.sin(e.face), fz = Math.cos(e.face);
      var align = Math.max(0.15, (fx * dx + fz * dz) / d);
      e.vx = fx * speed * align; e.vz = fz * speed * align;
      return d;
    }
    function speedOf(e) {
      var def = EN[e.kind], s = def.boss && e.bossPhase === 2 ? def.speed2 : def.speed;
      var m = 1; if (e.slowT > 0) m = Math.min(m, e.slowMul); if (e.zoneMul) m = Math.min(m, e.zoneMul);
      return s * m;
    }
    function separation() {
      var E = S.enemies;
      for (var i = 0; i < E.length; i++) {
        var a = E[i]; if (a.dead || a.state === 'climb') continue;
        for (var j = i + 1; j < E.length; j++) {
          var b = E[j]; if (b.dead || b.state === 'climb') continue;
          var dx = b.x - a.x, dz = b.z - a.z, d = len(dx, dz), m = a.r + b.r;
          if (d < m && d > 1e-4) {
            var push = (m - d) * 0.5, nx = dx / d, nz = dz / d;
            var wa = EN[a.kind].boss ? 0.1 : (a.frozenT > 0 ? 0.2 : 1), wb = EN[b.kind].boss ? 0.1 : (b.frozenT > 0 ? 0.2 : 1), ws = wa + wb;
            a.x -= nx * push * 2 * wa / ws; a.z -= nz * push * 2 * wa / ws;
            b.x += nx * push * 2 * wb / ws; b.z += nz * push * 2 * wb / ws;
          }
        }
        // the witch is solid to them, gently
        var W = S.witch, wx = a.x - W.x, wz = a.z - W.z, wd = len(wx, wz), wm = a.r + C.witch.radius;
        if (wd < wm && wd > 1e-4 && a.state !== 'charge') { a.x = W.x + wx / wd * wm; a.z = W.z + wz / wd * wm; }
      }
    }
    function tokensInUse() { var n = 0; for (var i = 0; i < S.enemies.length; i++) { var e = S.enemies[i]; if (!e.dead && !EN[e.kind].boss && (e.state === 'windup' || e.state === 'charge')) n++; } return n; }
    function tokenCap() { return S.wave >= 4 ? 2 : 1; }

    function stepForager(e) {
      var def = EN[e.kind], W = S.witch;
      if (e.state === 'climb') {
        var k = Math.min(1, e.st / e.climbT);
        e.x = e.fromX + (e.toX - e.fromX) * k; e.z = e.fromZ + (e.toZ - e.fromZ) * k;
        if (e.st >= e.climbT) { setState(e, 'seek'); emit('landed', { id: e.id, x: e.x, z: e.z }); }
        return;
      }
      if (e.frozenT > 0) { e.frozenT--; e.vx = e.vz = 0; if (e.frozenT === 0) { setState(e, 'seek'); emit('thaw', { id: e.id }); } return; }
      if (e.hideT > 0) { e.hideT--; e.vx = e.vz = 0; if (e.hideT === 0) emit('unhide', { id: e.id }); if (e.state !== 'eat') return; }
      if (e.stagT > 0) { e.stagT--; e.vx *= 0.8; e.vz *= 0.8; return; }
      if (S.aiOff) { e.vx = e.vz = 0; return; }
      var spd = speedOf(e);
      // beetles: decide to charge when the witch is close and a token is free
      if (def.charge) {
        var ch = def.charge;
        if (e.state === 'windup') {
          e.vx = e.vz = 0;
          if (e.st <= ch.track) { var want = Math.atan2(W.x - e.x, W.z - e.z); e.face += angDiff(e.face, want) * 0.12; e.cdx = Math.sin(e.face); e.cdz = Math.cos(e.face); }
          if (e.st === ch.track + 1) emit('chargeLock', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz, len: ch.speed * ch.ticks / 60 });
          if (e.st >= ch.windup) { setState(e, 'charge'); emit('charge', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz }); }
          return;
        }
        if (e.state === 'charge') {
          e.vx = e.cdx * ch.speed; e.vz = e.cdz * ch.speed;
          if (len(W.x - e.x, W.z - e.z) < e.r + C.witch.radius + 0.1) { if (knockWitch(e.x, e.z, 'beetle')) { setState(e, 'recover'); e.vx = e.vz = 0; return; } }
          var m = HALF - e.r;
          if (Math.abs(e.x + e.vx / 60) > m || Math.abs(e.z + e.vz / 60) > m) { setState(e, 'recover'); e.stagT = ch.wallDaze; e.vx = e.vz = 0; emit('wallBonk', { id: e.id, x: e.x, z: e.z }); return; }
          if (e.st >= ch.ticks) { setState(e, 'recover'); e.vx = e.vz = 0; }
          return;
        }
        if (e.state === 'recover') { e.vx *= 0.85; e.vz *= 0.85; if (e.st >= ch.recover) { setState(e, 'seek'); e.cd = ch.cooldown; } return; }
        if (e.cd > 0) e.cd--;
        var dw = len(W.x - e.x, W.z - e.z);
        if (e.cd <= 0 && dw < ch.aggro && W.knockT <= 0 && tokensInUse() < tokenCap() && e.slowT <= 0) {
          releaseHerb(e); setState(e, 'windup'); e.face = Math.atan2(W.x - e.x, W.z - e.z); e.cdx = Math.sin(e.face); e.cdz = Math.cos(e.face);
          emit('windup', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz, ticks: ch.windup, len: ch.speed * ch.ticks / 60 });
          return;
        }
      }
      if (e.state === 'flee') {
        var fx = e.x - e.fleeX, fz = e.z - e.fleeZ, fd = len(fx, fz) || 1;
        moveToward(e, e.x + fx / fd * 3, e.z + fz / fd * 3, spd * 1.7);
        if (--e.fleeT <= 0) setState(e, 'seek');
        return;
      }
      if (e.target < 0 || !herbAt(e.target) || herbAt(e.target).eaten || (e.state === 'seek' && e.st % 120 === 0)) {
        if (e.state === 'eat' || e.state === 'rear') setState(e, 'seek');
        pickHerb(e);
      }
      var h = e.target >= 0 ? herbAt(e.target) : null;
      if (!h) { moveToward(e, W.x, W.z, spd * 0.5); return; }
      var reach = 0.42 + e.r;
      var dh = len(h.x - e.x, h.z - e.z);
      if (e.state === 'seek') {
        // approach on a slight curve so a crowd fans round a herb instead of stacking
        var side = ((e.id * 7) % 5 - 2) * 0.18;
        var ax = h.x + (h.z - e.z) / (dh || 1) * side, az = h.z - (h.x - e.x) / (dh || 1) * side;
        if (dh > reach) moveToward(e, ax, az, spd); else { setState(e, 'rear'); e.vx = e.vz = 0; emit('rear', { id: e.id, herb: h.id }); }
        return;
      }
      if (e.state === 'rear') {
        e.vx = e.vz = 0; e.face += angDiff(e.face, Math.atan2(h.x - e.x, h.z - e.z)) * 0.2;
        if (dh > reach + 0.35) { setState(e, 'seek'); return; }
        if (e.st >= def.rearTicks) { setState(e, 'eat'); e.biteT = 0; }
        return;
      }
      if (e.state === 'eat') {
        e.vx = e.vz = 0;
        if (dh > reach + 0.35) { setState(e, 'seek'); return; }
        if (e.hideT > 0) return;
        if (e.biteT-- <= 0) { e.biteT = def.biteEvery; biteHerb(e, h, def.bite); }
        return;
      }
      setState(e, 'seek');
    }
    function biteHerb(e, h, dmg) {
      if (h.eaten) return;
      h.hp -= dmg; h.hurtT = 16;
      emit('bite', { id: e.id, herb: h.id, hp: h.hp, x: h.x, z: h.z });
      if (up('nettle')) hurt(e, 1, 'nettle', { x: h.x, z: h.z });
      if (h.hp <= 0) eatHerb(h);
    }
    function eatHerb(h) {
      h.hp = 0; h.eaten = true; S.herbsEaten++;
      emit('herbLost', { herb: h.id, kind: h.kind, x: h.x, z: h.z, eaten: S.herbsEaten });
      for (var i = 0; i < S.enemies.length; i++) if (S.enemies[i].target === h.id) { S.enemies[i].target = -1; if (S.enemies[i].state === 'eat' || S.enemies[i].state === 'rear') setState(S.enemies[i], 'seek'); }
      h.eaters = 0;
      if (S.herbsEaten >= G.loseAt && !S.result) endRun('lost');
    }

    function stepBoss(e) {
      var def = EN[e.kind], W = S.witch;
      if (e.state === 'climb') {
        var k = Math.min(1, e.st / e.climbT), kk = k * k * (3 - 2 * k);
        e.x = e.fromX + (e.toX - e.fromX) * kk; e.z = e.fromZ + (e.toZ - e.fromZ) * kk;
        if (e.st === 50) emit('bossWall', { x: e.fromX, z: e.fromZ });
        if (e.st >= e.climbT) { setState(e, 'stalk'); emit('landed', { id: e.id, x: e.x, z: e.z, boss: true }); }
        return;
      }
      if (e.openT > 0 && e.bossPhase === 1) { e.openT--; if (e.openT === 0) { e.plates = def.plates; emit('platesRegrow', { id: e.id, x: e.x, z: e.z }); } }
      if (e.stagT > 0) { e.stagT--; e.vx *= 0.85; e.vz *= 0.85; return; }
      if (S.aiOff) { e.vx = e.vz = 0; return; }
      if (e.stompCd > 0) e.stompCd--;
      if (e.cd > 0) e.cd--;
      if (e.volleyCd > 0) e.volleyCd--;
      if (e.bossPhase === 2) {
        e.broodT++;
        if (e.broodT >= def.brood.every) {
          e.broodT = 0; var grubs = 0; for (var i = 0; i < S.enemies.length; i++) if (!S.enemies[i].dead && S.enemies[i].kind === 'grub') grubs++;
          for (var g = 0; g < def.brood.count && grubs < def.brood.cap; g++, grubs++) spawnEnemy('grub', C.breaches[rBoss.int(C.breaches.length)].id);
          emit('brood', { id: e.id });
        }
      }
      var dx = W.x - e.x, dz = W.z - e.z, dw = len(dx, dz);
      var ch = def.charge, st = def.stomp, vo = def.volley;
      switch (e.state) {
        case 'roar':
          e.vx = e.vz = 0;
          if (e.st >= def.roarTicks) { setState(e, 'stalk'); e.cd = 60; e.volleyCd = 90; }
          return;
        case 'stalk': {
          var spd = speedOf(e);
          if (dw > 3.0) moveToward(e, W.x, W.z, spd); else { e.vx *= 0.8; e.vz *= 0.8; e.face += angDiff(e.face, Math.atan2(dx, dz)) * 0.05; }
          if (W.knockT > 0) return;
          if (dw < st.range && e.stompCd <= 0) { setState(e, 'stompWind'); e.vx = e.vz = 0; emit('stompWind', { id: e.id, x: e.x, z: e.z, r: st.radius, ticks: st.windup }); return; }
          if (e.bossPhase === 2 && e.volleyCd <= 0 && dw > 2.5) { setState(e, 'volleyWind'); e.vx = e.vz = 0; emit('volleyWind', { id: e.id, ticks: vo.windup }); return; }
          if (e.cd <= 0 && dw > 3.2 && dw < 13) {
            setState(e, 'windup'); e.vx = e.vz = 0; e.face = Math.atan2(dx, dz); e.cdx = Math.sin(e.face); e.cdz = Math.cos(e.face);
            emit('windup', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz, ticks: ch.windup, len: ch.speed * ch.ticks / 60, boss: true });
          }
          return;
        }
        case 'windup':
          if (e.st <= ch.track) { e.face += angDiff(e.face, Math.atan2(dx, dz)) * 0.08; e.cdx = Math.sin(e.face); e.cdz = Math.cos(e.face); }
          if (e.st === ch.track + 1) emit('chargeLock', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz, len: ch.speed * ch.ticks / 60 });
          if (e.st >= ch.windup) { setState(e, 'charge'); e.trampled = {}; emit('charge', { id: e.id, x: e.x, z: e.z, dx: e.cdx, dz: e.cdz, boss: true }); }
          return;
        case 'charge': {
          e.vx = e.cdx * ch.speed; e.vz = e.cdz * ch.speed;
          if (dw < e.r + C.witch.radius + 0.15) knockWitch(e.x, e.z, 'thornback');
          for (var h = 0; h < S.herbs.length; h++) {
            var hb = S.herbs[h]; if (hb.eaten || e.trampled[hb.id]) continue;
            if (len(hb.x - e.x, hb.z - e.z) < e.r + 0.45) { e.trampled[hb.id] = 1; hb.hp -= ch.trample; hb.hurtT = 20; emit('trample', { herb: hb.id, x: hb.x, z: hb.z, hp: hb.hp }); if (hb.hp <= 0) eatHerb(hb); }
          }
          var m = HALF - e.r;
          if (Math.abs(e.x + e.vx / 60) > m || Math.abs(e.z + e.vz / 60) > m) { setState(e, 'dazed'); e.vx = e.vz = 0; S.hitstop = Math.max(S.hitstop, 4); emit('wallBonk', { id: e.id, x: e.x, z: e.z, boss: true }); return; }
          if (e.st >= ch.ticks) { setState(e, 'recover'); }
          return;
        }
        case 'dazed':
          e.vx = e.vz = 0; if (e.st >= ch.wallDaze) { setState(e, 'stalk'); e.cd = ch.cooldown; }
          return;
        case 'recover':
          e.vx *= 0.88; e.vz *= 0.88; if (e.st >= ch.recover) { setState(e, 'stalk'); e.cd = ch.cooldown; }
          return;
        case 'stompWind':
          e.vx = e.vz = 0;
          if (e.st >= st.windup) {
            emit('stomp', { id: e.id, x: e.x, z: e.z, r: st.radius });
            if (dw < st.radius + C.witch.radius) knockWitch(e.x, e.z, 'stomp');
            setState(e, 'stompRec'); e.stompCd = st.cooldown;
          }
          return;
        case 'stompRec':
          if (e.st >= st.recover) setState(e, 'stalk');
          return;
        case 'volleyWind':
          e.vx = e.vz = 0; e.face += angDiff(e.face, Math.atan2(dx, dz)) * 0.06;
          if (e.st >= vo.windup) {
            for (var t = 0; t < vo.count; t++) {
              var tx, tz;
              if (t === 0) { tx = W.x + W.vx * 0.5; tz = W.z + W.vz * 0.5; }
              else if (t === 1) { var alive2 = S.herbs.filter(function (q) { return !q.eaten; }); var hh = alive2[rBoss.int(Math.max(1, alive2.length))]; tx = hh ? hh.x : W.x; tz = hh ? hh.z : W.z; }
              else { var a = rBoss.range(0, TAU), rr = rBoss.range(1.2, vo.spread); tx = W.x + Math.sin(a) * rr; tz = W.z + Math.cos(a) * rr; }
              tx = clamp(tx, -HALF + 0.5, HALF - 0.5); tz = clamp(tz, -HALF + 0.5, HALF - 0.5);
              var th = { id: S.nextId++, x0: e.x, z0: e.z, x: tx, z: tz, t: 0, T: vo.flight + t * 6 };
              S.thorns.push(th);
              emit('thorn', { id: th.id, x0: e.x, z0: e.z, x: tx, z: tz, T: th.T, r: vo.radius });
            }
            setState(e, 'stompRec'); e.volleyCd = vo.cooldown;
          }
          return;
        default: setState(e, 'stalk');
      }
    }
    function stepThorns() {
      var vo = EN.thornback.volley, W = S.witch;
      for (var i = S.thorns.length - 1; i >= 0; i--) {
        var t = S.thorns[i]; t.t++;
        if (t.t < t.T) continue;
        S.thorns.splice(i, 1);
        emit('thornLand', { id: t.id, x: t.x, z: t.z });
        if (len(W.x - t.x, W.z - t.z) < vo.radius + C.witch.radius) knockWitch(t.x, t.z, 'thorn');
        for (var h = 0; h < S.herbs.length; h++) { var hb = S.herbs[h]; if (!hb.eaten && len(hb.x - t.x, hb.z - t.z) < vo.radius + 0.35) { hb.hp -= vo.dmgHerb; hb.hurtT = 16; emit('bite', { id: -1, herb: hb.id, hp: hb.hp, x: hb.x, z: hb.z }); if (hb.hp <= 0) eatHerb(hb); } }
      }
    }

    function stepEnemies() {
      var E = S.enemies;
      for (var i = 0; i < E.length; i++) {
        var e = E[i]; if (e.dead) continue;
        e.px = e.x; e.pz = e.z; e.st++;
        if (e.slowT > 0) e.slowT--; else e.slowMul = 1;
        if (e.hurtT > 0) e.hurtT--;
        if (e.burnT > 0) {
          e.burnT--; e.burnAcc++;
          if (e.burnAcc >= SP.ember.ignite.every) { e.burnAcc = 0; hurt(e, SP.ember.ignite.dmg, 'fire', null); if (e.dead) continue; }
        }
        if (EN[e.kind].boss) stepBoss(e); else stepForager(e);
        e.zoneMul = 0;
        if (e.dead) continue;
        if (e.state !== 'climb') {
          e.x += e.vx / 60; e.z += e.vz / 60;
          var m = HALF - e.r; e.x = clamp(e.x, -m, m); e.z = clamp(e.z, -m, m);
        }
      }
      separation();
      for (var j = E.length - 1; j >= 0; j--) if (E[j].dead) E.splice(j, 1);
    }

    function stepSpawns() {
      for (var i = 0; i < S.queue.length; i++) {
        var q = S.queue[i];
        if (!q.warned && S.tick >= q.warn) { q.warned = true; var b = breachById(q.from); emit('breachWarn', { breach: q.from, x: b.x, z: b.z, side: b.side, kind: q.kind, boss: !!EN[q.kind].boss, at: q.at }); }
      }
      while (S.queue.length && S.tick >= S.queue[0].at) { var q2 = S.queue.shift(); spawnEnemy(q2.kind, q2.from); }
    }

    function offerUpgrades() {
      var pool = C.upgrades.filter(function (u) { return !S.ups[u.id]; });
      var pick = [];
      while (pick.length < 3 && pool.length) pick.push(pool.splice(rUp.int(pool.length), 1)[0].id);
      S.offer = pick; S.phase = 'upgrade'; S.phaseT = 0;
      emit('offer', { ids: pick.slice(), wave: S.wave });
    }
    function choose(i) {
      if (S.phase !== 'upgrade' || !S.offer) return false;
      var id = S.offer[clamp(i | 0, 0, S.offer.length - 1)];
      S.ups[id] = true; S.upList.push(id); S.offer = null;
      if (id === 'mulch') S.herbs.forEach(function (h) { if (!h.eaten) h.hp = Math.min(h.max, h.hp + 40); });
      emit('chose', { id: id });
      startWave(S.wave + 1);
      return true;
    }
    function standing() { var n = 0; S.herbs.forEach(function (h) { if (!h.eaten) n++; }); return n; }
    function endRun(res) {
      if (S.result) return;
      S.result = res; S.endTick = S.tick;
      if (res === 'won') { S.score += standing() * C.score.dawnHerb; if (S.herbsEaten === 0) S.score += C.score.perfect; }
      S.phase = 'over';
      emit('end', { result: res, score: S.score });
    }

    function tick() {
      S.frame++;
      if (S.phase === 'over' || S.phase === 'upgrade') { input.pEmber = input.pRime = input.pSpark = input.pSkip = false; return; }
      if (S.hitstop > 0) { S.hitstop--; return; }
      S.tick++; S.phaseT++;
      stepWitch();
      input.pEmber = input.pRime = input.pSpark = input.pSkip = false;
      if (S.phase === 'bell' && S.phaseT >= C.bellTicks) beginWaveSpawns();
      if (S.phase === 'wave') stepSpawns();
      stepSeeds(); stepRings(); stepFrosts(); stepChains(); stepThorns();
      stepEnemies();
      for (var h = 0; h < S.herbs.length; h++) if (S.herbs[h].hurtT > 0) S.herbs[h].hurtT--;
      if (S.phase === 'wave' && !S.queue.length && !S.enemies.length && !S.chains.length) {
        S.score += standing() * C.score.waveHerb;
        emit('waveClear', { wave: S.wave, standing: standing() });
        if (S.wave >= S.lastWave) endRun('won'); else offerUpgrades();
      }
      if (S.bossDown && S.phase === 'wave' && S.tick - S.bossDown > 50) {
        for (var i = 0; i < S.enemies.length; i++) { var e = S.enemies[i]; if (!e.dead) { e.dead = true; releaseHerb(e); emit('scatter', { id: e.id, kind: e.kind, x: e.x, z: e.z }); } }
        S.enemies.length = 0; S.queue.length = 0;
        S.score += standing() * C.score.waveHerb;
        endRun('won');
      }
    }

    // ---------------- review fixtures (test-playable-web-games: open hard states directly)
    function stage(name) {
      S.enemies.length = 0; S.queue.length = 0; S.seeds.length = 0; S.rings.length = 0; S.frosts.length = 0; S.chains.length = 0; S.thorns.length = 0;
      var W = S.witch; W.x = W.px = -4.6; W.z = W.pz = 5.0; W.vx = W.vz = 0; W.face = Math.atan2(1, -0.4); W.cast = null; W.cd = { ember: 0, rime: 0, spark: 0 };
      S.phase = 'review'; S.review = name; S.aiOff = true;
      function put(kind, x, z, face) { var e = spawnEnemy(kind, 'N1', { noJitter: true }); e.x = e.px = e.toX = x; e.z = e.pz = e.toZ = z; e.state = 'idle'; e.st = 0; e.face = face === undefined ? Math.atan2(W.x - x, W.z - z) : face; return e; }
      // staged foes sit in open ground north-east of the witch, clear of the sundial and the beds
      if (name === 'ember') { put('slug', -1.5, 3.7); put('slug', -0.6, 4.4); put('slug', -1.8, 4.7); }
      else if (name === 'rime') { put('snail', -1.6, 4.0); put('snail', -0.8, 3.2); put('slug', -0.4, 4.6); }
      else if (name === 'spark') { put('beetle', -1.6, 4.1); put('beetle', -0.3, 3.3); put('snail', 0.5, 4.5); put('slug', -0.8, 5.3); }
      else if (name === 'shatter') { var a = put('snail', -1.4, 4.1), b = put('snail', -0.4, 3.4); freeze(a, 600); freeze(b, 600); put('slug', 0.4, 4.6); }
      emit('staged', { name: name });
    }
    function setupWave(i) {
      i = clamp(i | 0, 0, S.lastWave);
      startWave(i);
    }
    function setupBoss(phase) {
      startWave(S.lastWave); beginWaveSpawns(); S.queue = S.queue.filter(function (q) { return q.kind !== 'thornback'; });
      var e = spawnEnemy('thornback', 'N1', { noJitter: true });
      e.state = 'stalk'; e.x = e.px = e.toX; e.z = e.pz = e.toZ;
      if (phase === 2) { e.hp = e.max * 0.5 - 0.01; e.bossPhase = 2; e.plates = 0; }
    }

    // ---------------- public
    var api = {
      S: S, C: C,
      setInput: function (o) { for (var k in o) if (k in input) input[k] = o[k]; },
      input: input,
      tick: tick,
      drain: function () { var e = out.slice(); out.length = 0; return e; },
      choose: choose, standing: standing,
      start: function (o) {
        o = o || {};
        if (o.review) stage(o.review);
        else if (o.boss) setupBoss(o.boss);
        else setupWave(o.wave ? o.wave - 1 : 0);
      },
      cooldownOf: cooldownOf, rimeRange: rimeRange, emberRingR: emberRingR, sparkJumps: sparkJumps,
      lanternPos: lanternPos,
      // the foe Spark would take first if cast now at (ax, az): used for the aim preview only
      sparkPreview: function (ax, az) {
        var W = S.witch, dx = ax - W.x, dz = az - W.z, d = len(dx, dz) || 1;
        var t = sparkFirstTarget({ ax: ax, az: az, ux: dx / d, uz: dz / d });
        return t ? { id: t.id, x: t.x, z: t.z, r: t.r } : null;
      },
      reviewAI: function (on) { S.aiOff = !on; },
      snapshot: function () {
        var W = S.witch;
        return {
          seed: S.seed, tick: S.tick, phase: S.phase, wave: S.wave + 1, waveName: C.waves[S.wave].name, score: S.score,
          herbsStanding: standing(), herbsEaten: S.herbsEaten, loseAt: G.loseAt, result: S.result,
          herbs: S.herbs.map(function (h) { return r3(Math.max(0, h.hp)); }),
          witch: { x: r3(W.x), z: r3(W.z), face: r3(W.face), cast: W.cast ? W.cast.name + ':' + W.cast.phase : null, knocked: W.knockT > 0, skip: W.skipT > 0,
            cd: { ember: W.cd.ember, rime: W.cd.rime, spark: W.cd.spark } },
          enemies: S.enemies.map(function (e) { return { id: e.id, kind: e.kind, x: r3(e.x), z: r3(e.z), hp: r3(e.hp), state: e.state, armored: e.armored, frozen: e.frozenT > 0, plates: e.plates, bossPhase: e.bossPhase }; }),
          queued: S.queue.length, upgrades: S.upList.slice(), offer: S.offer ? S.offer.slice() : null,
          stats: JSON.parse(JSON.stringify(S.stats))
        };
      }
    };
    return api;
  }

  // ---------------- attract-mode pilot: the witch fighting on her own (also a smoke test of the rules)
  function createPilot(sim) {
    var C = sim.C, S = sim.S, wanderA = 0, holdSkip = 0;
    function len(x, z) { return Math.sqrt(x * x + z * z); }
    return function () {
      var W = S.witch, inp = { mx: 0, mz: 0, ax: W.x + Math.sin(W.face) * 3, az: W.z + Math.cos(W.face) * 3, ember: false, rime: false, spark: false, skip: false };
      if (S.phase === 'upgrade' && S.offer) { sim.choose(0); return inp; }
      var foes = S.enemies.filter(function (e) { return !e.dead && (e.state !== 'climb' || e.st > 20); });
      // dodge a charge aimed at us
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        if ((f.state === 'windup' && f.st > 26) || f.state === 'charge') {
          var px = -f.cdz, pz = f.cdx, side = ((W.x - f.x) * px + (W.z - f.z) * pz) >= 0 ? 1 : -1;
          if (len(W.x - f.x, W.z - f.z) < 7) { inp.mx = px * side; inp.mz = pz * side; if (f.state === 'charge' || f.st > 34) inp.skip = holdSkip++ % 2 === 0; return inp; }
        }
        if (f.state === 'stompWind') { var ox = W.x - f.x, oz = W.z - f.z, od = len(ox, oz) || 1; inp.mx = ox / od; inp.mz = oz / od; return inp; }
      }
      if (!foes.length) {
        wanderA += 0.01; var tx = Math.sin(wanderA) * 3, tz = 2 + Math.cos(wanderA * 0.7) * 2;
        var dx = tx - W.x, dz = tz - W.z, d = len(dx, dz); if (d > 0.6) { inp.mx = dx / d * 0.6; inp.mz = dz / d * 0.6; }
        return inp;
      }
      // focus: the foe closest to a herb it is heading for
      var best = null, bs = 1e9;
      for (var j = 0; j < foes.length; j++) {
        var e = foes[j], s = len(e.x - W.x, e.z - W.z) * 0.6;
        if (e.target >= 0) { var h = S.herbs[e.target]; s += len(h.x - e.x, h.z - e.z); }
        if (e.kind === 'thornback') s -= 4;
        if (e.state === 'eat' || e.state === 'rear') s -= 5;
        if (s < bs) { bs = s; best = e; }
      }
      var dxe = best.x - W.x, dze = best.z - W.z, de = len(dxe, dze) || 1;
      var want = best.kind === 'thornback' ? 6 : 4.6;
      if (de > want + 0.6) { inp.mx = dxe / de; inp.mz = dze / de; }
      else if (de < want - 1.2) { inp.mx = -dxe / de; inp.mz = -dze / de; }
      else { inp.mx = -dze / de * 0.35; inp.mz = dxe / de * 0.35; }
      inp.ax = best.x; inp.az = best.z;
      var cd = W.cd;
      if (de < 8.4) {
        if ((best.armored || best.plates > 0) && cd.spark <= 0) inp.spark = true;
        else if (best.kind === 'snail' && best.frozenT > 0 && cd.spark <= 0) inp.spark = true;
        else if (best.kind === 'snail' && best.frozenT <= 0 && cd.rime <= 0 && de < 6) inp.rime = true;
        else if (!best.armored && best.plates <= 0 && cd.ember <= 0) inp.ember = true;
        else if (cd.spark <= 0 && !best.armored) inp.spark = true;
      }
      return inp;
    };
  }

  window.HW_SIM = { createSim: createSim, createPilot: createPilot, stream: stream };
})();
