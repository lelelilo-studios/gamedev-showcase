/* Hold the Cold — a night shift at the Hesper Fell seed vault.
   Plain Canvas 2D and WebAudio, no engine, no build step. Classic script so the page opens from file://.
   Made through the Claude Code Game Studios minimal flow; the studio's paperwork is in studio/. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- tuning
  // Every gameplay number lives here (story 001: "speeds come from one tuning table").
  var TUNE = {
    tickHz: 60,
    walk: 150,          // world units per second on a floor
    climb: 118,         // world units per second on a ladder
    ladderSnap: 26,     // how close to a ladder up/down grabs it
    arrive: 2.5,        // a walk-to target counts as reached inside this distance
    // bays and coolers (story 002)
    setpoint: -18,      // °C a clear, powered cooler holds a bay at
    thawLine: -10,      // °C: above this the seeds are at risk
    bayLeak: 0.34,      // °C per second a bay warms with no cooling at all (0.30 before story 008)
    bayCool: 0.70,      // °C per second a clear cooler can pull a bay down (0.75)
    bayMax: 4,          // °C: the rock around the bays never gets warmer than this
    bayStart: [-18.6, -17.2],   // °C range a bay starts the night in
    frostRate: 0.013,   // frost per second on a cooler (0 clear, 1 iced solid) (0.010)
    frostJitter: [0.8, 1.25],   // each cooler's own multiplier, drawn from the seed
    frostStart: [0.04, 0.22],   // frost range a cooler starts the night with
    scrape: 0.52,       // frost scraped off per second of holding Work (0.55)
    // generator, fuel and the keeper's warmth (story 003)
    nightSec: 216,      // length of the night in seconds of play (the clock itself is story 004)
    fuelStart: 58,      // % in the tank at 22:00
    fuelBurn: 0.34,     // % per second while the generator runs, in still air (0.5)
    fuelStorm: 0.28,    // extra % per second at full storm: the engine works harder in the cold (0)
    canFuel: 40,        // % one can adds
    pickupSec: 0.6,     // hold Work this long at the shed to take a can
    pourSec: 1.0,       // hold Work this long at the generator to pour it
    carryWalk: 0.72,    // walking speed multiplier with a can
    carryClimb: 0.8,    // climbing speed multiplier with a can
    warmOutside: 7,     // warmth lost per second outdoors
    warmInside: 3,      // warmth regained per second indoors
    warmByGen: 12,      // warmth regained per second in the generator hall while it runs
    collapseSec: 3.5,   // how long a collapse lasts before the keeper wakes inside the portal
    wakeWarmth: 45,     // warmth on waking
    // the storm night (story 004)
    startHour: 22,      // the shift starts at 22:00 and ends at 06:00
    hours: 8,
    stormByHour: [0.25, 0.35, 0.5, 0.7, 0.9, 1.0, 0.65, 0.85, 0.5],  // strength at each hour mark, 22:00 .. 06:00
    frostStorm: 1.8,    // frost grows (1 + this × storm) times faster in the storm (1.4)
    eventsPerHour: 3.0, // events in an hour = 1 + round(this × the hour's mean storm) (2.5)
    eventMix: [0.45, 0.33, 0.22],   // chance of a gust, a frost burst, a stall
    stallGap: 35,       // seconds: never two stalls closer than this
    firstStall: 40,     // seconds: no stall before this
    gustFrost: 0.12,    // frost a gust adds to every cooler (× (0.5 + storm/2)) (0.10)
    burstFrost: 0.42,   // frost a burst adds to one cooler (0.35)
    gustSec: 2.6,       // how long a gust blows
    gustPush: 46,       // world units per second a gust pushes the keeper outdoors (toward the shed)
    gustChill: 2,       // warmth drains this many times faster outdoors in a gust
    coughSec: 2.5,      // warning between the cough and the stall
    crankPeriod: 1.5,   // seconds for the needle to swing there and back
    crankZone: 0.24,    // half-width of the green zone, in needle units (-1 .. 1)
    crankHits: 3,       // hits to restart
    // the collection and the end of the night (story 005)
    perBay: 1000,       // accessions in each bay at 22:00
    lossPerDegree: 2.2, // accessions lost per second, per degree a bay stands above the thaw line (3)
    failBelow: 1500     // the vault is compromised when the collection falls below this
  };
  var TICK = 1 / TUNE.tickHz;
  var KEEPER_SCALE = 1.3;               // drawn larger than life so the keeper reads at phone size

  // ---------------------------------------------------------------- world
  // Cutaway of the vault in world units; the camera scales it to fit the screen.
  var W = 600, H = 880;
  var DOOR_X = 240;                     // the portal door: x below this on floor 0 is outdoors
  var FLOORS = [
    { y: 236, x0: 20, x1: 546, name: 'Portal tunnel' },
    { y: 468, x0: 56, x1: 568, name: 'Generator hall' },
    { y: 700, x0: 56, x1: 568, name: 'Bay corridor' }
  ];
  var LADDERS = [
    { x: 524, top: 0, bottom: 1 },
    { x: 84, top: 1, bottom: 2 }
  ];
  var STATIONS = [
    { id: 'shed', floor: 0, x: 72, half: 30, label: 'Fuel shed' },
    { id: 'gen', floor: 1, x: 300, half: 44, label: 'Generator' },
    { id: 'bay0', floor: 2, x: 184, half: 30, label: 'Bay A cooler', bay: 0 },
    { id: 'bay1', floor: 2, x: 334, half: 30, label: 'Bay B cooler', bay: 1 },
    { id: 'bay2', floor: 2, x: 484, half: 30, label: 'Bay C cooler', bay: 2 }
  ];
  var BAYS = [
    { name: 'A', x0: 116, x1: 252 },
    { name: 'B', x0: 266, x1: 402 },
    { name: 'C', x0: 416, x1: 552 }
  ];
  // Rooms cut out of the rock (x0, y0, x1, y1).
  var ROOMS = {
    tunnel: [DOOR_X, 184, 548, FLOORS[0].y],
    shaftA: [510, 228, 538, FLOORS[1].y],
    hall: [46, 384, 578, FLOORS[1].y],
    shaftB: [70, 462, 98, FLOORS[2].y],
    corridor: [46, 628, 578, FLOORS[2].y],
    bay0: [BAYS[0].x0, 712, BAYS[0].x1, 862],
    bay1: [BAYS[1].x0, 712, BAYS[1].x1, 862],
    bay2: [BAYS[2].x0, 712, BAYS[2].x1, 862]
  };
  // Power runs from the generator to each cooler through the rock.
  var CABLES = [
    [[300, 470], [300, 572], [184, 572], [184, 644]],
    [[300, 572], [334, 572], [334, 644]],
    [[334, 572], [484, 572], [484, 644]]
  ];
  var EXHAUST = { x: 214, y: 222 };     // where the generator's stack comes out of the ground
  // The mountain's face, from the foot of the portal up to the right edge.
  var FACE = [[338, 161], [352, 155], [404, 118], [452, 96], [506, 62], [560, 44], [600, 30]];
  var PORTAL = { x0: 228, x1: 338, roofL: 166, roofR: 161 };   // the concrete entrance block the tunnel starts in

  // Thermometer scale inside each bay: -24 °C at the bottom, +4 °C at the top.
  var THERMO = { top: 742, bot: 852, lo: -24, hi: 4 };
  function thermoY(t) { return THERMO.bot - (clamp(t, THERMO.lo, THERMO.hi) - THERMO.lo) / (THERMO.hi - THERMO.lo) * (THERMO.bot - THERMO.top); }

  // ---------------------------------------------------------------- seeded randomness
  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailySeed() {
    var d = new Date();
    return String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }
  var fx = makeRng(20261019);            // cosmetic randomness (smoke, chips): seeded too, but never read by the simulation
  var params = new URLSearchParams(location.search);
  var SEED = (params.get('seed') || dailySeed()).replace(/[^\w-]/g, '').slice(0, 24) || dailySeed();

  // ---------------------------------------------------------------- state
  var G = null;           // the night in progress (pure data: snapshot() reads it)
  var mode = 'title';     // title | playing | paused | over

  function newNight(seed) {
    return {
      seed: seed,
      rng: makeRng(hashSeed(seed)),
      tick: 0,
      keeper: { x: 300, y: FLOORS[1].y, floor: 1, ladder: -1, face: 1, walkT: 0, moving: false, target: null, px: 300, py: FLOORS[1].y, working: null,
        carrying: false, warmth: 100, collapsed: 0, workT: 0, workOn: null },
      bays: [0, 1, 2].map(function () { return null; }),
      gen: { fuel: TUNE.fuelStart, running: true, stalled: false, cough: 0, hits: 0, flash: 0, miss: 0, shake: 0 },
      log: [],
      t: 0, result: null, endedAt: 0, storm: TUNE.stormByHour[0], gust: 0, schedule: [], nextEvent: 0, hourLogged: 0, ended: false, prevWork: false,
      stats: { scrapeSec: 0, cans: 0, outsideSec: 0, collapses: 0, stalls: 0, restarts: 0, gusts: 0, bursts: 0 }
    };
  }
  function seedBays(N) {
    var r = N.rng;
    N.bays = [0, 1, 2].map(function () {
      return {
        temp: lerp(TUNE.bayStart[0], TUNE.bayStart[1], r()),
        frost: lerp(TUNE.frostStart[0], TUNE.frostStart[1], r()),
        growth: lerp(TUNE.frostJitter[0], TUNE.frostJitter[1], r()),
        fan: 0, acc: TUNE.perBay, warmSec: 0
      };
    });
    N.schedule = makeSchedule(r);
    return N;
  }
  function stormAt(t) {
    var h = clamp(t / TUNE.nightSec * TUNE.hours, 0, TUNE.hours), i = Math.min(TUNE.hours - 1, Math.floor(h));
    return lerp(TUNE.stormByHour[i], TUNE.stormByHour[i + 1], h - i);
  }
  // The night's events, decided at 22:00 from the seed: busier as the storm builds.
  function makeSchedule(r) {
    var out = [], hourSec = TUNE.nightSec / TUNE.hours, lastStall = -999;
    for (var h = 0; h < TUNE.hours; h++) {
      var mean = (TUNE.stormByHour[h] + TUNE.stormByHour[h + 1]) / 2;
      var n = 1 + Math.round(TUNE.eventsPerHour * mean);
      for (var j = 0; j < n; j++) {
        var t = h * hourSec + (j + 0.15 + r() * 0.7) * hourSec / n;
        var roll = r(), kind = roll < TUNE.eventMix[0] ? 'gust' : roll < TUNE.eventMix[0] + TUNE.eventMix[1] ? 'burst' : 'stall';
        if (kind === 'stall' && (t < TUNE.firstStall || t - lastStall < TUNE.stallGap)) kind = 'gust';
        var ev = { t: +t.toFixed(3), kind: kind };
        if (kind === 'burst') ev.bay = Math.floor(r() * 3);
        if (kind === 'stall') { lastStall = t; ev.t = Math.max(0, ev.t - TUNE.coughSec); ev.kind = 'cough'; }
        out.push(ev);
      }
    }
    return out;
  }
  function clockText(t) {
    var mins = Math.floor(clamp(t, 0, TUNE.nightSec) / TUNE.nightSec * TUNE.hours * 60 + 1e-6);
    var hh = (TUNE.startHour + Math.floor(mins / 60)) % 24, mm = mins % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------------------------------------------------------- input
  // Keyboard, pointer and the test hook all write into the same shape.
  var keys = { left: false, right: false, up: false, down: false, work: false };
  var hookInput = { left: false, right: false, up: false, down: false, work: false };
  var touchWork = false;                              // the WORK button
  var botInput = { x: 0, y: 0, work: false };         // the demo keeper behind the title screen
  function currentInput() {
    if (G.demo || G.bot) return botInput;
    return {
      x: ((keys.right || hookInput.right) ? 1 : 0) - ((keys.left || hookInput.left) ? 1 : 0),
      y: ((keys.down || hookInput.down) ? 1 : 0) - ((keys.up || hookInput.up) ? 1 : 0),
      work: keys.work || hookInput.work || touchWork
    };
  }
  function clearInput() { for (var k in keys) keys[k] = false; touchWork = false; if (workBtn) workBtn.classList.remove('held'); }
  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'work', KeyE: 'work', Enter: 'work'
  };
  addEventListener('keydown', function (e) {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (howOpen()) { closeHow(); e.preventDefault(); }
      else if (mode === 'playing') { pause(); e.preventDefault(); }
      else if (mode === 'paused') { resume(); e.preventDefault(); }
      return;
    }
    if (e.code === 'KeyM' && !e.repeat) { setSetting('sound', !settings.sound); return; }
    var k = KEYMAP[e.code];
    if (k && mode === 'playing') { keys[k] = true; e.preventDefault(); }
  });
  addEventListener('keyup', function (e) {
    var k = KEYMAP[e.code];
    if (k) { keys[k] = false; if (mode === 'playing') e.preventDefault(); }
  });

  // ---------------------------------------------------------------- movement
  function floorAt(y) {
    // Which floor a tap or click belongs to: the room above each floor line, and the bays under the corridor.
    if (y < 352) return 0;
    if (y < 586) return 1;
    return 2;
  }
  function targetFor(wx, wy) {
    var f = floorAt(wy);
    var x = Math.max(FLOORS[f].x0, Math.min(FLOORS[f].x1, wx));
    if (f === 2 && wy > 704) {                       // a tap inside a bay walks to that bay's cooler
      for (var b = 0; b < BAYS.length; b++) if (wx >= BAYS[b].x0 - 6 && wx <= BAYS[b].x1 + 6) x = STATIONS[2 + b].x;
    }
    for (var i = 0; i < STATIONS.length; i++) {      // a tap on a station stands the keeper at its middle
      var s = STATIONS[i];
      if (s.floor === f && Math.abs(x - s.x) <= s.half) x = s.x;
    }
    return { floor: f, x: x };
  }
  function ladderFrom(floor, dir) {
    // The ladder that leaves this floor going up (dir -1) or down (dir +1), or null.
    for (var i = 0; i < LADDERS.length; i++) {
      var L = LADDERS[i];
      if (dir < 0 && L.bottom === floor) return i;
      if (dir > 0 && L.top === floor) return i;
    }
    return -1;
  }
  function stepKeeper(k, inp, dt) {
    var dx = inp.x, dy = inp.y;
    if (dx || dy) k.target = null;                   // keys always win over a walk-to target
    if (k.target) {
      var tf = k.target.floor;
      var here = k.ladder >= 0 ? -1 : k.floor;
      if (here === tf) {
        var d = k.target.x - k.x;
        if (Math.abs(d) <= TUNE.arrive) { k.x = k.target.x; k.target = null; }
        else dx = d > 0 ? 1 : -1;
      } else if (k.ladder >= 0) {
        var L0 = LADDERS[k.ladder];
        dy = tf <= L0.top ? -1 : 1;
      } else {
        dy = tf < k.floor ? -1 : 1;
      }
    }
    var speed = TUNE.walk * (k.carrying ? TUNE.carryWalk : 1);
    var climb = TUNE.climb * (k.carrying ? TUNE.carryClimb : 1);
    k.moving = false;
    if (k.ladder >= 0) {
      var L = LADDERS[k.ladder];
      var yTop = FLOORS[L.top].y, yBot = FLOORS[L.bottom].y;
      if (!dy && dx) {                               // sideways on a ladder: finish the climb toward the nearer end
        dy = (k.y - yTop < yBot - k.y) ? -1 : 1;
      }
      if (dy) {
        k.y += dy * climb * dt;
        k.moving = true;
        if (k.y <= yTop) { k.y = yTop; k.ladder = -1; k.floor = L.top; }
        else if (k.y >= yBot) { k.y = yBot; k.ladder = -1; k.floor = L.bottom; }
      }
    } else if (dy) {
      var li = ladderFrom(k.floor, dy);
      if (li >= 0) {
        var lx = LADDERS[li].x;
        if (Math.abs(k.x - lx) <= TUNE.ladderSnap) {
          k.x = lx; k.ladder = li; k.moving = true;
          k.y += dy * climb * dt;
        } else {
          var dir = lx > k.x ? 1 : -1;               // up or down away from a ladder: walk to it
          k.x += dir * speed * dt; k.face = dir; k.moving = true;
        }
      } else if (dx) {
        dy = 0;
      }
    }
    if (k.ladder < 0 && dx && !(dy && ladderFrom(k.floor, dy) >= 0)) {
      var F = FLOORS[k.floor];
      k.x = Math.max(F.x0, Math.min(F.x1, k.x + dx * speed * dt));
      k.face = dx; k.moving = true;
    }
    if (k.ladder < 0 && k.floor === 0 && k.x < DOOR_X && G.gust > 0 && !k.working) {   // a gust shoves a walking keeper back toward the shed; working, they brace (BUG-0001)
      k.x = Math.max(FLOORS[0].x0, k.x - TUNE.gustPush * dt);
    }
    if (k.ladder < 0) k.y = FLOORS[k.floor].y;
    if (k.moving) k.walkT += dt; else k.walkT = 0;
  }

  // ---------------------------------------------------------------- stations
  function stationAt(k) {
    if (k.ladder >= 0) return null;
    for (var i = 0; i < STATIONS.length; i++) {
      var s = STATIONS[i];
      if (s.floor === k.floor && Math.abs(k.x - s.x) <= s.half) return s;
    }
    return null;
  }
  function coolerOutput(b, powered) {
    if (!powered || b.frost >= 1) return 0;          // iced solid, or no power: no cooling at all
    return 1 - b.frost;                              // frost cuts cooling in proportion
  }
  function stepBays(dt, powered, workAt) {
    for (var i = 0; i < 3; i++) {
      var b = G.bays[i];
      var grow = TUNE.frostRate * b.growth * (1 + TUNE.frostStorm * G.storm) * dt;
      b.frost = clamp(b.frost + grow, 0, 1);
      if (workAt === 'bay' + i && b.frost > 0) {
        b.frost = Math.max(0, b.frost - TUNE.scrape * dt - grow);
        G.stats.scrapeSec += dt;
      }
      var out = coolerOutput(b, powered);
      var pull = TUNE.bayCool * out;
      if (b.temp <= TUNE.setpoint) pull = Math.min(pull, TUNE.bayLeak);   // the thermostat idles at setpoint
      b.temp = clamp(b.temp + (TUNE.bayLeak - pull) * dt, TUNE.setpoint - 2, TUNE.bayMax);
      b.fan = out;
      if (b.temp > TUNE.thawLine) {                  // above the thaw line, seeds die, faster the warmer it is
        var wasWarm = b.warmSec > 0;
        b.acc = Math.max(0, b.acc - TUNE.lossPerDegree * (b.temp - TUNE.thawLine) * dt);
        b.warmSec += dt;
        if (!wasWarm) event('thaw', 'Bay ' + BAYS[i].name + ' is above \u221210\u00b0. Seeds are dying.', i);
      } else if (b.warmSec > 0) {
        b.warmSec = 0;
        event('cold', 'Bay ' + BAYS[i].name + ' back below the thaw line.', i);
      }
    }
  }

  // ---------------------------------------------------------------- simulation
  function isOutside(k) { return k.ladder < 0 && k.floor === 0 && k.x < DOOR_X; }
  function collection() { return G.bays[0].acc + G.bays[1].acc + G.bays[2].acc; }
  function tick() {
    if (G.result) return;                            // the night is over: nothing moves
    var k = G.keeper, gen = G.gen;
    k.px = k.x; k.py = k.y;
    var inp = currentInput();
    if (k.collapsed > 0) {                           // face down in the snow: no input until the keeper wakes
      k.collapsed -= TICK;
      if (k.collapsed <= 0) wake(k);
    } else {
      stepKeeper(k, inp, TICK);
    }
    var st = k.collapsed > 0 ? null : stationAt(k);
    var held = !!(inp.work || pointerWorks(st));
    var press = held && !G.prevWork; G.prevWork = held;
    var wants = held && st ? st.id : null;
    k.working = wants && canWork(st) ? wants : null;
    if (st && st.id === 'gen' && press && canCrank(k)) crank();
    stepWork(k, st);
    stepStorm(TICK);
    stepGenerator(TICK);
    stepWarmth(k, TICK);
    stepBays(TICK, gen.running, k.working);
    G.t += TICK; G.tick++;
    if (collection() < TUNE.failBelow) endNight('compromised');
    else if (G.t >= TUNE.nightSec && !G.ended) { G.ended = true; event('dawn', 'Grey light on the fell. 06:00.'); endNight('dawn'); }
  }
  function endNight(result) {
    G.result = result; G.endedAt = G.t;
    if (result === 'compromised') event('lost', 'The collection is below half. The vault is declared compromised.');
    if (onEnd) onEnd(result);
  }
  var onEnd = null;
  function stepStorm(dt) {
    G.storm = stormAt(G.t);
    if (G.gust > 0) G.gust = Math.max(0, G.gust - dt);
    var hour = Math.floor(G.t / (TUNE.nightSec / TUNE.hours));
    if (hour > G.hourLogged && hour < TUNE.hours) {
      G.hourLogged = hour;
      var next = TUNE.stormByHour[hour + 1], cur = TUNE.stormByHour[hour];
      event('hour', next > cur + 0.05 ? 'The wind is rising.' : next < cur - 0.05 ? 'The wind is easing off.' : 'The storm holds.');
    }
    while (G.nextEvent < G.schedule.length && G.schedule[G.nextEvent].t <= G.t) fire(G.schedule[G.nextEvent++]);
  }
  function fire(ev) {
    if (ev.kind === 'gust') {
      G.gust = TUNE.gustSec; G.stats.gusts++;
      for (var i = 0; i < 3; i++) G.bays[i].frost = clamp(G.bays[i].frost + TUNE.gustFrost * (0.5 + G.storm / 2), 0, 1);
      event('gust', 'A gust off the fell. Frost on every cooler.');
    } else if (ev.kind === 'burst') {
      G.stats.bursts++;
      G.bays[ev.bay].frost = clamp(G.bays[ev.bay].frost + TUNE.burstFrost, 0, 1);
      event('burst', 'Bay ' + BAYS[ev.bay].name + ' cooler spits ice.', ev.bay);
    } else if (ev.kind === 'cough') {
      if (G.gen.running) { G.gen.cough = TUNE.coughSec; event('cough', 'The generator coughs.'); }
    }
  }
  function canCrank(k) { return G.gen.stalled && G.gen.fuel > 0 && !(k.carrying && G.gen.fuel < 100); }
  function needle() { return Math.sin(G.t / TUNE.crankPeriod * Math.PI * 2); }
  function crank() {
    var g = G.gen, n = needle();
    if (Math.abs(n) <= TUNE.crankZone) {
      g.hits++; g.flash = 0.25; cue('hit');
      if (g.hits >= TUNE.crankHits) {
        g.stalled = false; g.running = true; g.hits = 0; G.stats.restarts++;
        event('restart', 'The generator catches. Power to the bays.');
      }
    } else {
      g.hits = Math.max(0, g.hits - 1); g.miss = 0.25; cue('miss');
    }
  }
  function canWork(st) {
    var k = G.keeper;
    if (st.bay !== undefined) return G.bays[st.bay].frost > 0;
    if (st.id === 'shed') return !k.carrying;
    if (st.id === 'gen') return k.carrying && G.gen.fuel < 100;   // pouring is held; cranking is pressed (crank())
    return false;
  }
  // Timed actions (take a can, pour it) fill while Work is held and reset when it is let go.
  function stepWork(k, st) {
    if (!k.working || k.working.indexOf('bay') === 0) { k.workT = 0; k.workOn = null; return; }
    if (k.workOn !== k.working) { k.workOn = k.working; k.workT = 0; }
    k.workT += TICK;
    if (k.working === 'shed' && k.workT >= TUNE.pickupSec) {
      k.carrying = true; k.workT = 0; k.workOn = null; k.working = null;
      event('can', 'Took a fuel can from the shed.');
    } else if (k.working === 'gen' && k.workT >= TUNE.pourSec) {
      G.gen.fuel = Math.min(100, G.gen.fuel + TUNE.canFuel);
      k.carrying = false; k.workT = 0; k.workOn = null; k.working = null;
      G.stats.cans++;
      if (!G.gen.running) event('pour', 'Fuel in. Now crank it.');
      else event('pour', 'Poured a can. Tank at ' + Math.round(G.gen.fuel) + '%.');
    }
  }
  function stepGenerator(dt) {
    var gen = G.gen;
    if (gen.flash > 0) gen.flash -= dt;
    if (gen.miss > 0) gen.miss -= dt;
    if (!gen.running) return;
    gen.fuel = Math.max(0, gen.fuel - (TUNE.fuelBurn + TUNE.fuelStorm * G.storm) * dt);
    if (gen.cough > 0) {
      gen.cough -= dt;
      if (gen.cough <= 0) {
        gen.cough = 0; gen.running = false; gen.stalled = true; gen.hits = 0; G.stats.stalls++;
        event('stall', 'Generator stalled. Crank it in the green.');
      }
    }
    if (gen.running && gen.fuel <= 0) {
      gen.running = false; gen.stalled = true; gen.hits = 0; gen.cough = 0;
      event('dry', 'The generator has run dry. Fuel it, then crank it.');
    }
  }
  function stepWarmth(k, dt) {
    if (k.collapsed > 0) return;
    if (isOutside(k)) { k.warmth -= TUNE.warmOutside * (G.gust > 0 ? TUNE.gustChill : 1) * dt; G.stats.outsideSec += dt; }
    else if (k.floor === 1 && k.ladder < 0 && G.gen.running) k.warmth += TUNE.warmByGen * dt;
    else k.warmth += TUNE.warmInside * dt;
    k.warmth = clamp(k.warmth, 0, 100);
    if (k.warmth <= 0) {
      k.collapsed = TUNE.collapseSec; k.target = null; k.working = null;
      if (k.carrying) { k.carrying = false; event('drop', 'The can is lost in the snow.'); }
      G.stats.collapses++;
      event('collapse', 'The keeper went down in the snow.');
    }
  }
  function wake(k) {
    k.collapsed = 0; k.warmth = TUNE.wakeWarmth;
    k.floor = 0; k.ladder = -1; k.x = k.px = DOOR_X + 14; k.y = k.py = FLOORS[0].y; k.face = 1;
    event('wake', 'The keeper wakes inside the portal, shaking.');
  }
  // Events: what happened this night, newest last (the shift log reads them).
  function event(kind, text, bay) {
    G.log.push({ tick: G.tick, t: G.t, kind: kind, text: text, bay: bay });
    cue('ev-' + kind, bay);
    if (G.log.length > 80) G.log.shift();
    if (onEvent) onEvent(G.log[G.log.length - 1]);
  }
  var onEvent = null;                                // the page listens (shift log, sound)
  // Cues: one-off moments for sound and particles. The simulation writes them and never reads them back.
  var cues = [];
  function cue(name, x, y) { if (!G.demo || mode === 'title') { cues.push({ n: name, x: x, y: y }); if (cues.length > 40) cues.shift(); } }

  // ---------------------------------------------------------------- rendering
  var canvas = document.getElementById('view');
  var ctx = canvas.getContext('2d');
  var bg = document.createElement('canvas');
  var bgx = bg.getContext('2d');
  var view = { s: 1, ox: 0, oy: 0, dpr: 1, cw: 0, ch: 0 };
  var C = {
    sky0: '#070c18', sky1: '#16223a', rock: '#182238', rockLine: '#22304b', rockDot: '#121a2c',
    wall: '#2a3650', wallLine: '#334262', slab: '#4a5a7a', ladder: '#8293b3',
    frost: '#bfe6f0', snow: '#eef7fa', amber: '#ffb03a', sodium: '#f08a24', alarm: '#ff5b4a', ink: '#0d1424'
  };

  function resize() {
    var r = canvas.getBoundingClientRect();
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.cw = Math.max(1, r.width); view.ch = Math.max(1, r.height);
    canvas.width = Math.round(view.cw * view.dpr);
    canvas.height = Math.round(view.ch * view.dpr);
    var fe = document.getElementById('field'), fr = fe ? fe.getBoundingClientRect() : r;
    var fw = Math.max(50, fr.width), fh = Math.max(50, fr.height);
    view.s = Math.min(fw / W, fh / H);
    view.ox = (fr.left - r.left) + (fw - W * view.s) / 2;
    view.oy = (fr.top - r.top) + (fh - H * view.s) / 2;
    bg.width = Math.round(W * view.s * view.dpr);
    bg.height = Math.round(H * view.s * view.dpr);
    drawStatic();
  }

  function rect(c, r) { c.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); }
  function mountainPath(c) {
    c.beginPath();
    c.moveTo(0, 236);
    c.lineTo(PORTAL.x0, 236); c.lineTo(PORTAL.x0, PORTAL.roofL);
    for (var i = 0; i < FACE.length; i++) c.lineTo(FACE[i][0], FACE[i][1]);
    c.lineTo(600, 880); c.lineTo(0, 880); c.closePath();
  }
  function stencil(c, text, x, y, size, color, align) {
    c.font = '800 ' + size + 'px "Big Shoulders Stencil", "Arial Narrow", sans-serif';
    c.textAlign = align || 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = color; c.fillText(text, x, y);
  }

  function drawStatic() {
    var c = bgx, k = view.s * view.dpr;
    c.setTransform(k, 0, 0, k, 0, 0);
    var srng = makeRng(7);                           // fixed: the mountain is the same every night
    // sky
    var g = c.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, C.sky0); g.addColorStop(1, C.sky1);
    c.fillStyle = g; c.fillRect(0, 0, W, 240);
    c.fillStyle = 'rgba(30,44,72,0.55)';
    for (var i = 0; i < 26; i++) {                   // storm clouds: overlapping soft bands
      var cx = srng() * W, cy = 20 + srng() * 120, rw = 60 + srng() * 120;
      c.beginPath(); c.ellipse(cx, cy, rw, 10 + srng() * 14, 0, 0, Math.PI * 2); c.fill();
    }
    // rock with strata
    c.save(); mountainPath(c); c.fillStyle = C.rock; c.fill(); c.clip();
    c.strokeStyle = C.rockLine; c.lineWidth = 1.4;
    for (var y = 120; y < H + 40; y += 17) {
      c.beginPath();
      for (var x = -10; x <= W + 10; x += 20) {
        var yy = y + Math.sin(x * 0.012 + y * 0.07) * 6 + x * 0.12 - 40;
        if (x === -10) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    c.fillStyle = C.rockDot;
    for (i = 0; i < 900; i++) c.fillRect(srng() * W, 230 + srng() * (H - 230), 1.6, 1.6);
    var pf = c.createLinearGradient(0, 520, 0, H);              // deeper is colder: the rock turns to permafrost
    pf.addColorStop(0, 'rgba(120,190,215,0)'); pf.addColorStop(1, 'rgba(120,190,215,0.16)');
    c.fillStyle = pf; c.fillRect(0, 520, W, H - 520);
    c.strokeStyle = 'rgba(191,230,240,0.22)'; c.lineWidth = 1;
    for (i = 0; i < 22; i++) {                                   // ice veins in the deep rock
      var vx = srng() * W, vy = 560 + srng() * 300, len = 10 + srng() * 26;
      c.beginPath(); c.moveTo(vx, vy);
      for (var seg = 0; seg < 4; seg++) { vx += (srng() - 0.3) * len * 0.5; vy += (srng() - 0.5) * len * 0.4; c.lineTo(vx, vy); }
      c.stroke();
    }
    c.restore();
    // snow on the ground and the slope
    c.fillStyle = C.snow;
    c.beginPath(); c.moveTo(0, 236); c.lineTo(PORTAL.x0, 236); c.lineTo(PORTAL.x0, 241);
    c.quadraticCurveTo(120, 244, 0, 242); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(FACE[0][0] - 4, FACE[0][1]);
    for (i = 0; i < FACE.length; i++) c.lineTo(FACE[i][0], FACE[i][1] - 1);
    for (i = FACE.length - 1; i >= 0; i--) c.lineTo(FACE[i][0] + 3, FACE[i][1] + 7 + (i % 3) * 3);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(191,230,240,0.35)';                    // blue shadow under the snow lip
    c.beginPath();
    for (i = 0; i < FACE.length; i++) c.lineTo(FACE[i][0] + 3, FACE[i][1] + 7 + (i % 3) * 3);
    for (i = FACE.length - 1; i >= 0; i--) c.lineTo(FACE[i][0] + 4, FACE[i][1] + 11 + (i % 3) * 3);
    c.closePath(); c.fill();
    // the portal block: cast concrete, form-lines, a snow-loaded roof
    c.fillStyle = '#34425f';
    c.beginPath(); c.moveTo(PORTAL.x0, 236); c.lineTo(PORTAL.x0, PORTAL.roofL); c.lineTo(PORTAL.x1, PORTAL.roofR); c.lineTo(PORTAL.x1, 236); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(86,102,138,0.5)'; c.lineWidth = 1;
    for (var fl = PORTAL.x0 + 12; fl < PORTAL.x1; fl += 14) { c.beginPath(); c.moveTo(fl, PORTAL.roofL - (fl - PORTAL.x0) * (PORTAL.roofL - PORTAL.roofR) / (PORTAL.x1 - PORTAL.x0) + 3); c.lineTo(fl, 236); c.stroke(); }
    c.fillStyle = '#56668a'; c.fillRect(PORTAL.x0, PORTAL.roofL - 1, 4, 236 - PORTAL.roofL + 1);
    c.fillStyle = C.snow;
    c.beginPath(); c.moveTo(PORTAL.x0 - 3, PORTAL.roofL + 1); c.lineTo(PORTAL.x0 - 2, PORTAL.roofL - 4); c.quadraticCurveTo(290, PORTAL.roofL - 9, PORTAL.x1 + 2, PORTAL.roofR - 5);
    c.lineTo(PORTAL.x1 + 2, PORTAL.roofR); c.lineTo(PORTAL.x0 - 3, PORTAL.roofL + 1); c.closePath(); c.fill();
    // rooms
    for (var key in ROOMS) {
      var r = ROOMS[key];
      c.fillStyle = key.indexOf('bay') === 0 ? '#1d2a44' : C.wall;
      rect(c, r);
      c.strokeStyle = C.wallLine; c.lineWidth = 1;
      if (key === 'hall' || key === 'corridor' || key === 'tunnel') {
        for (var px = r[0] + 24; px < r[2]; px += 40) { c.beginPath(); c.moveTo(px, r[1] + 2); c.lineTo(px, r[3]); c.stroke(); }
      }
    }
    // tunnel arch

    // floor slabs
    c.fillStyle = C.slab;
    for (i = 0; i < FLOORS.length; i++) {
      var F = FLOORS[i];
      var x0 = i === 0 ? DOOR_X : 46, x1 = i === 0 ? 548 : 578;
      c.fillRect(x0, F.y, x1 - x0, 5);
    }
    c.fillRect(46, 704, 532, 4);
    // ladders
    for (i = 0; i < LADDERS.length; i++) {
      var L = LADDERS[i], top = FLOORS[L.top].y - 10, bot = FLOORS[L.bottom].y;
      c.strokeStyle = C.ladder; c.lineWidth = 2;
      c.beginPath(); c.moveTo(L.x - 9, top); c.lineTo(L.x - 9, bot); c.moveTo(L.x + 9, top); c.lineTo(L.x + 9, bot); c.stroke();
      c.lineWidth = 1.6;
      for (var ry = top + 8; ry < bot; ry += 12) { c.beginPath(); c.moveTo(L.x - 9, ry); c.lineTo(L.x + 9, ry); c.stroke(); }
    }
    // the portal door and the lit strip along the block
    c.strokeStyle = '#6a7aa0'; c.lineWidth = 2; c.strokeRect(231, 189, 10, 47);
    c.fillStyle = '#1b2640'; c.fillRect(232, 190, 8, 46);
    c.fillStyle = C.amber; c.fillRect(246, 173, 84, 2.5);
    c.fillStyle = '#ffd38a'; c.fillRect(231, 184, 10, 2);
    // fuel shed
    c.fillStyle = '#26334e'; c.fillRect(42, 196, 62, 40);
    c.fillStyle = '#3f4f70';
    c.beginPath(); c.moveTo(36, 198); c.lineTo(72, 182); c.lineTo(110, 198); c.closePath(); c.fill();
    c.fillStyle = C.snow; c.beginPath(); c.moveTo(36, 198); c.lineTo(72, 182); c.lineTo(110, 198); c.lineTo(104, 196); c.lineTo(72, 186); c.lineTo(42, 196); c.closePath(); c.fill();
    c.fillStyle = '#121a2c'; c.fillRect(58, 206, 28, 30);
    c.fillStyle = '#c4433a';
    for (i = 0; i < 3; i++) c.fillRect(61 + i * 8, 222, 6, 12);
    // generator body (gauges drawn live)
    c.fillStyle = '#3b4a6b'; c.fillRect(256, 414, 92, 54);
    c.fillStyle = '#2c3955'; c.fillRect(262, 420, 52, 40);
    c.fillStyle = '#56668a'; c.beginPath(); c.arc(330, 440, 15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2c3955'; c.beginPath(); c.arc(330, 440, 9, 0, Math.PI * 2); c.fill();
    // exhaust: up out of the hall, through the rock, out of the ground beside the portal
    c.strokeStyle = '#56668a'; c.lineWidth = 7; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(339, 416); c.lineTo(339, 346); c.lineTo(EXHAUST.x, 346); c.lineTo(EXHAUST.x, EXHAUST.y); c.stroke();
    c.fillStyle = '#56668a'; c.fillRect(EXHAUST.x - 7, EXHAUST.y - 4, 14, 5);
    // power conduits: generator down through the rock to each cooler
    c.strokeStyle = '#0f1626'; c.lineWidth = 5; c.lineJoin = 'round';
    c.beginPath(); CABLES.forEach(function (path) { c.moveTo(path[0][0], path[0][1]); for (var q = 1; q < path.length; q++) c.lineTo(path[q][0], path[q][1]); }); c.stroke();
    c.strokeStyle = '#2b3a58'; c.lineWidth = 2;
    c.beginPath(); CABLES.forEach(function (path) { c.moveTo(path[0][0], path[0][1]); for (var q = 1; q < path.length; q++) c.lineTo(path[q][0], path[q][1]); }); c.stroke();
    // coolers on the corridor wall
    for (i = 0; i < 3; i++) {
      var sx = STATIONS[2 + i].x;
      c.fillStyle = '#3b4a6b'; c.fillRect(sx - 23, 646, 46, 52);
      c.fillStyle = '#1b2640'; c.fillRect(sx - 19, 652, 38, 34);
      c.fillStyle = '#56668a'; c.fillRect(sx - 23, 690, 46, 3);
    }
    // shelves of seed boxes in the bays
    for (i = 0; i < 3; i++) {
      var B = BAYS[i];
      for (var row = 0; row < 4; row++) {
        var sy = 736 + row * 30;
        c.fillStyle = '#3a4866'; c.fillRect(B.x0 + 30, sy + 16, B.x1 - B.x0 - 36, 3);
        for (var bx = B.x0 + 33; bx < B.x1 - 14; bx += 13) {
          c.fillStyle = (bx + row) % 3 === 0 ? '#4d5f84' : '#43547a';
          c.fillRect(bx, sy + 4, 10, 12);
        }
      }
    }
    // bay thermometers: a tube on each bay's wall, the thaw line marked
    for (i = 0; i < 3; i++) {
      var tx = BAYS[i].x0 + 13;
      c.fillStyle = '#121a2c'; roundRect(c, tx - 5, THERMO.top - 3, 10, THERMO.bot - THERMO.top + 10, 5); c.fill();
      var ty = thermoY(TUNE.thawLine);
      c.fillStyle = C.amber; c.fillRect(tx + 6, ty - 1, 7, 2);
      c.font = '600 7px "Martian Mono", monospace'; c.textAlign = 'left'; c.fillStyle = '#c99a52';
      c.fillText('\u221210', tx + 6, ty - 3);
    }
    // painted signage
    stencil(c, 'FUEL', 73, 193, 11, C.snow, 'center');
    stencil(c, 'PORTAL', 300, 206, 13, '#7d8db0');
    stencil(c, 'GENERATOR HALL', 362, 410, 14, '#7d8db0');
    for (i = 0; i < 3; i++) stencil(c, 'BAY ' + BAYS[i].name, (BAYS[i].x0 + BAYS[i].x1) / 2, 642, 13, '#7d8db0', 'center');
    stencil(c, 'HESPER FELL SEED VAULT', 300, 862 + 12, 12, '#3a4866', 'center');
  }

  function drawKeeper(c, k, x, y) {
    if (k.collapsed > 0) {                           // lying in the snow
      c.save(); c.translate(x, y); c.scale(KEEPER_SCALE, KEEPER_SCALE);
      c.fillStyle = C.amber; roundRect(c, -12, -9, 18, 9, 4); c.fill();
      c.beginPath(); c.arc(9, -5, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(238,247,250,0.8)'; c.fillRect(-14, -3, 30, 3);
      c.restore(); return;
    }
    var t = k.walkT * 9, onLadder = k.ladder >= 0;
    var swing = k.moving ? Math.sin(t) * 4 : 0;
    c.save(); c.translate(x, y); c.scale(KEEPER_SCALE, KEEPER_SCALE);
    // headlamp beam
    if (!onLadder) {
      var g = c.createRadialGradient(k.face * 8, -21, 2, k.face * 40, -16, 46);
      g.addColorStop(0, 'rgba(255,214,140,0.45)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(k.face * 6, -21); c.lineTo(k.face * 70, -40); c.lineTo(k.face * 70, 2); c.closePath(); c.fill();
    }
    c.strokeStyle = '#141c2e'; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath();
    if (onLadder) {
      var a = Math.sin(k.y * 0.25) * 3;
      c.moveTo(-3, -9); c.lineTo(-4, 0 + a); c.moveTo(3, -9); c.lineTo(4, 0 - a);
    } else {
      c.moveTo(-2, -9); c.lineTo(-2 + swing, 0); c.moveTo(2, -9); c.lineTo(2 - swing, 0);
    }
    c.stroke();
    // parka, printed slightly off-register like a second ink pass
    c.fillStyle = C.sodium; roundRect(c, -7 + 0.8, -24 + 0.8, 14, 16, 4); c.fill();
    c.fillStyle = C.amber; roundRect(c, -7, -24, 14, 16, 4); c.fill();
    // arms
    c.strokeStyle = '#d98a2a'; c.lineWidth = 3;
    c.beginPath();
    if (onLadder) { var b = Math.sin(k.y * 0.25) * 3; c.moveTo(-5, -20); c.lineTo(-7, -30 + b); c.moveTo(5, -20); c.lineTo(7, -30 - b); }
    else { c.moveTo(-5, -20); c.lineTo(-6 - swing * 0.6, -11); c.moveTo(5, -20); c.lineTo(6 + swing * 0.6, -11); }
    c.stroke();
    if (k.carrying) {                                // a red fuel can in the forward hand
      var cx = onLadder ? -10 : k.face * 8 - 4;
      c.fillStyle = '#c4433a'; c.fillRect(cx, -16, 8, 11);
      c.fillStyle = '#e86a56'; c.fillRect(cx + 1, -15, 2, 9);
      c.fillStyle = '#7a2a24'; c.fillRect(cx + 2, -19, 4, 3);
    }
    // hood and face
    c.fillStyle = C.amber; c.beginPath(); c.arc(0, -28, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1b2235'; c.beginPath(); c.arc(onLadder ? 0 : k.face * 1.6, -27.5, 3.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff4d6'; c.beginPath(); c.arc(onLadder ? 0 : k.face * 4.5, -31, 1.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // Snow is drawn, not simulated: its density and drive follow the storm strength.
  var SNOW_MAX = 320;
  var snow = [];
  (function () { var r = makeRng(99); for (var i = 0; i < SNOW_MAX; i++) snow.push({ x: r() * W, y: r() * 250, v: 0.6 + r() * 0.8, s: 0.8 + r() * 1.7, p: r() * 6.28 }); })();
  var drift = [];
  function outsideClip(c) {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, FACE[FACE.length - 1][1]);
    for (var i = FACE.length - 1; i >= 0; i--) c.lineTo(FACE[i][0], FACE[i][1]);
    c.lineTo(PORTAL.x0, PORTAL.roofL); c.lineTo(PORTAL.x0, 236); c.lineTo(0, 236); c.closePath(); c.clip();
  }

  function drawDawn(c) {
    var d = clamp((G.t - TUNE.nightSec * 7 / 8) / (TUNE.nightSec / 8), 0, 1);   // the last hour pales the sky
    if (d <= 0) return;
    c.save(); outsideClip(c);
    var g = c.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, 'rgba(120,140,180,' + (0.18 * d).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(236,178,150,' + (0.42 * d).toFixed(3) + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, 240);
    var crew = clamp((G.t - (TUNE.nightSec - 14)) / 14, 0, 1);                 // the relief snowcat's lamps, coming up the road
    if (crew > 0) {
      var x = -20 + crew * 46;
      c.globalCompositeOperation = 'lighter';
      var lg = c.createRadialGradient(x + 6, 228, 1, x + 30, 228, 46);
      lg.addColorStop(0, 'rgba(255,230,170,0.7)'); lg.addColorStop(1, 'rgba(255,230,170,0)');
      c.fillStyle = lg; c.fillRect(x - 10, 190, 90, 50);
      c.fillStyle = '#fff3d0'; c.fillRect(x, 226, 4, 3); c.fillRect(x + 7, 226, 4, 3);
    }
    c.restore();
  }
  function drawSnow(c, dt, now) {
    drawDawn(c);
    var st = G.storm, gust = G.gust > 0 ? 1 : 0;
    var n = Math.round((50 + 270 * st) * (settings.lowFx ? 0.4 : 1));
    var wind = -(26 + 150 * st) - gust * 140, fall = 26 + 40 * st;
    c.save(); outsideClip(c);
    c.strokeStyle = C.snow; c.fillStyle = C.snow; c.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var p = snow[i];
      p.x += (wind * p.v + Math.sin(p.p + now * 0.0013) * 12) * dt; p.y += fall * p.v * dt;
      if (p.y > 250) { p.y = -4; p.x = fx() * (W + 80); }
      if (p.x < -10) { p.x += W + 20; p.y = fx() * 240; }
      c.globalAlpha = 0.35 + p.s * 0.22;
      if (st > 0.55 || gust) {                       // a hard wind smears the flakes into streaks
        var len = (0.018 + gust * 0.02) * p.v;
        c.lineWidth = p.s * 0.8; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - wind * len, p.y - fall * len); c.stroke();
      } else c.fillRect(p.x, p.y, p.s, p.s);
    }
    if (gust && drift.length < 90 && !settings.lowFx) {                 // spindrift torn off the slope
      for (var d = 0; d < 3; d++) { var f = FACE[1 + Math.floor(fx() * (FACE.length - 1))]; drift.push({ x: f[0] + fx() * 30, y: f[1] - 2, a: 0.7, r: 1 + fx() * 2 }); }
    }
    for (var q = drift.length - 1; q >= 0; q--) {
      var s2 = drift[q]; s2.x += (wind * 1.1) * dt; s2.y += (fx() - 0.6) * 30 * dt; s2.a -= 0.5 * dt;
      if (s2.a <= 0) { drift.splice(q, 1); continue; }
      c.globalAlpha = s2.a; c.beginPath(); c.arc(s2.x, s2.y, s2.r, 0, Math.PI * 2); c.fill();
    }
    c.restore(); c.globalAlpha = 1;
  }
  // ---------------------------------------------------------------- settings (remembered; every storage call guarded)
  var SETTINGS_KEY = 'hold-the-cold:settings';
  var reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var settings = { sound: true, lowFx: reduceMotion };
  (function () {
    try {
      var v = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (v && typeof v.sound === 'boolean') settings.sound = v.sound;
      if (v && typeof v.lowFx === 'boolean') settings.lowFx = v.lowFx;
    } catch (e) {}
  })();
  function setSetting(name, value) {
    settings[name] = value;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
    reflectSettings();
    if (name === 'sound') say(value ? 'Sound on.' : 'Sound off.');
    if (onSettings) onSettings(name, value);
  }
  var onSettings = null;                               // story 007's sound listens here
  function reflectSettings() {
    var t = document.querySelectorAll('[data-setting]');
    for (var i = 0; i < t.length; i++) t[i].setAttribute('aria-pressed', String(!!settings[t[i].getAttribute('data-setting')]));
    if (muteBtn) { muteBtn.setAttribute('aria-pressed', String(!settings.sound)); muteBtn.setAttribute('aria-label', settings.sound ? 'Sound is on (M to mute)' : 'Sound is off (M to unmute)'); }
  }

  var lastFrame = 0, lampLevel = 1, flicker = 0;
  function render(alpha, now) {
    var c = ctx, d = view.dpr, s = view.s;
    var dt = lastFrame ? Math.max(0, Math.min(0.1, (now - lastFrame) / 1000)) : 0; lastFrame = now;   // never negative, never a leap
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = C.ink; c.fillRect(0, 0, view.cw, view.ch);
    c.drawImage(bg, view.ox, view.oy, W * s, H * s);
    c.setTransform(d * s, 0, 0, d * s, d * view.ox, d * view.oy);
    drawSnow(c, dt, now);
    var powered = G.gen.running;
    // lamp pools in the rooms, or the dark when the power is out
    lampLevel += ((powered ? 1 : 0) - lampLevel) * Math.min(1, dt * (powered ? 4 : 7));
    if (flicker > 0) { flicker -= dt; if (!settings.lowFx) lampLevel *= 0.55 + fx() * 0.45; }
    if (lampLevel > 0.02) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = lampLevel;
      lampPool(c, 400, 188, 70); lampPool(c, 180, 388, 80); lampPool(c, 440, 388, 80); lampPool(c, 200, 632, 80); lampPool(c, 470, 632, 80);
      c.restore();
    }
    drawCables(c, powered, now);
    drawGenerator(c, now, dt);
    drawBays(c, now);
    if (lampLevel < 0.98) {
      c.fillStyle = 'rgba(4,7,14,' + (0.5 * (1 - lampLevel)).toFixed(3) + ')';
      for (var rk in ROOMS) rect(c, ROOMS[rk]);
    }
    feedback(c, dt, now);
    var k = G.keeper;
    drawKeeper(c, k, k.px + (k.x - k.px) * alpha, k.py + (k.y - k.py) * alpha);
    c.setTransform(d, 0, 0, d, 0, 0);
    drawMarks(c);
    updatePrompt(k, alpha);
  }
  // Crop and registration marks around the print, and the inks it is printed in.
  function drawMarks(c) {
    var x0 = view.ox, y0 = view.oy, x1 = view.ox + W * view.s, y1 = view.oy + H * view.s, m = 10, L = 14;
    c.strokeStyle = 'rgba(191,230,240,0.35)'; c.lineWidth = 1;
    c.beginPath();
    [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]].forEach(function (q) {
      c.moveTo(q[0] + q[2] * m, q[1]); c.lineTo(q[0] + q[2] * (m + L), q[1]);
      c.moveTo(q[0], q[1] + q[3] * m); c.lineTo(q[0], q[1] + q[3] * (m + L));
    });
    c.stroke();
    if (view.cw - x1 > 60) {                         // wide screens: registration targets and the ink swatches in the margin
      var cy = (y0 + y1) / 2;
      [x1 + 22, x0 - 22].forEach(function (cx) {
        c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.moveTo(cx - 10, cy); c.lineTo(cx + 10, cy); c.moveTo(cx, cy - 10); c.lineTo(cx, cy + 10); c.stroke();
      });
      var sw = [C.ink, '#182238', '#2a3650', C.frost, C.snow, C.amber, C.sodium];
      for (var i = 0; i < sw.length; i++) { c.fillStyle = sw[i]; c.fillRect(x1 + 16, y1 - 12 - i * 14, 12, 10); }
    }
  }

  // ---------------------------------------------------------------- feedback: particles and sound for every action
  var parts = [], scrapeT = 0, pourT = 0, stepPhase = 0, alarmT = 0, breathT = 0;
  function spark(x, y, n, o) {
    if (settings.lowFx) n = Math.max(1, Math.ceil(n / 3));
    for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: (fx() - 0.5) * (o.spread || 80) + (o.vx || 0), vy: -fx() * (o.up || 60) + (o.vy || 0),
      life: o.life || 0.6, max: o.life || 0.6, col: o.col, r: o.r || 1.5, g: o.g === undefined ? 300 : o.g });
  }
  function feedback(c, dt, now) {
    var k = G.keeper, st = mode === 'playing' || mode === 'title' ? stationAt(k) : null;
    // continuous actions
    if (k.working && k.working.indexOf('bay') === 0) {
      scrapeT -= dt;
      if (scrapeT <= 0) {
        scrapeT = 0.1; var sx = STATIONS[2 + (+k.working[3])].x;
        spark(sx + (fx() < 0.5 ? -17 : 17) + (fx() - 0.5) * 6, 656 + fx() * 26, 4, { col: fx() < 0.5 ? C.snow : C.frost, spread: 190, up: 120, life: 0.55, r: 2.1 });
        sound('scrape');
      }
    }
    if (k.working === 'gen') {
      pourT -= dt;
      if (pourT <= 0) { pourT = 0.08; spark(k.x + k.face * 8, 434, 2, { col: '#d9a441', spread: 20, up: 10, vy: 40, life: 0.35, r: 1.3 }); sound('pour'); }
    }
    // breath in the cold
    if (isOutside(k) && k.collapsed <= 0) {
      breathT -= dt;
      if (breathT <= 0) { breathT = 1.1; spark(k.x + k.face * 7, k.y - 38, 3, { col: 'rgba(238,247,250,0.8)', spread: 10, up: 8, vx: k.face * 14 - 30 * G.storm, g: -12, life: 0.9, r: 2.2 }); }
    }
    // footsteps and rungs
    if (k.moving && k.collapsed <= 0 && (mode === 'playing' || mode === 'title')) {
      var ph = Math.floor(k.walkT * (k.ladder >= 0 ? 4.5 : 3.2));
      if (ph !== stepPhase) { stepPhase = ph; sound(k.ladder >= 0 ? 'rung' : isOutside(k) ? 'snowstep' : 'step'); }
    }
    // a bay above the thaw line: a soft two-note alarm every few seconds, never a siren
    var warmBay = -1;
    for (var i = 0; i < 3; i++) if (G.bays[i].temp > TUNE.thawLine) warmBay = i;
    if (warmBay >= 0 && mode === 'playing') { alarmT -= dt; if (alarmT <= 0) { alarmT = 4; sound('alarm'); } } else alarmT = 0.6;
    // drips in warm bays
    for (i = 0; i < 3; i++) if (G.bays[i].temp > TUNE.thawLine - 2 && fx() < dt * 3) {
      var B = BAYS[i]; spark(B.x0 + 34 + fx() * (B.x1 - B.x0 - 50), 742 + Math.floor(fx() * 4) * 30, 1, { col: '#8fc9e0', spread: 0, up: 0, life: 0.8, r: 1.2 });
    }
    // one-off cues
    while (cues.length) {
      var q = cues.shift();
      if (q.n === 'hit') { hitstop = 0.07; sound('hit'); spark(300, 404, 6, { col: C.amber, spread: 90, up: 70, life: 0.4, r: 1.6 }); spark(EXHAUST.x, EXHAUST.y - 4, 4, { col: 'rgba(40,46,60,0.9)', spread: 30, up: 20, g: -20, life: 0.9, r: 3 }); }
      else if (q.n === 'miss') sound('miss');
      else if (q.n === 'ev-can') { sound('pickup'); spark(72, 230, 8, { col: C.snow, spread: 70, up: 50, life: 0.6 }); }
      else if (q.n === 'ev-pour') sound('glug');
      else if (q.n === 'ev-restart') { sound('restart'); flicker = 0.45; }
      else if (q.n === 'ev-cough') sound('cough');
      else if (q.n === 'ev-stall' || q.n === 'ev-dry') sound('stall');
      else if (q.n === 'ev-gust') sound('gust');
      else if (q.n === 'ev-burst') { sound('crack'); var bx = STATIONS[2 + q.x].x; spark(bx, 668, 10, { col: C.snow, spread: 140, up: 100, life: 0.5 }); }
      else if (q.n === 'ev-collapse') sound('collapse');
      else if (q.n === 'ev-thaw') sound('alarm');
      else if (q.n === 'ev-dawn') sting('dawn');
      else if (q.n === 'ev-lost') sting('lost');
    }
    // draw and age the particles
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.col;
      c.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    c.globalAlpha = 1;
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    updateSound(dt);
  }

  // ---------------------------------------------------------------- sound: WebAudio, made in code, only after a click, tap or key
  var AC = window.AudioContext || window.webkitAudioContext;
  var au = null;
  function audioUnlock() {
    if (au || !AC || embedded) return;
    try {
      var ctx = new AC();
      au = { ctx: ctx };
      au.master = ctx.createGain(); au.master.gain.value = settings.sound ? 0.85 : 0;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      au.master.connect(comp); comp.connect(ctx.destination);
      var len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), nr = makeRng(4242);
      for (var i = 0; i < len; i++) d[i] = nr() * 2 - 1;
      au.noise = buf;
      // wind: filtered noise, a body and a whistle
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      au.windBand = ctx.createBiquadFilter(); au.windBand.type = 'bandpass'; au.windBand.Q.value = 0.6; au.windBand.frequency.value = 400;
      au.windLow = ctx.createBiquadFilter(); au.windLow.type = 'lowpass'; au.windLow.frequency.value = 900;
      au.windGain = ctx.createGain(); au.windGain.gain.value = 0;
      src.connect(au.windBand); au.windBand.connect(au.windLow); au.windLow.connect(au.windGain); au.windGain.connect(au.master);
      au.whistle = ctx.createBiquadFilter(); au.whistle.type = 'bandpass'; au.whistle.Q.value = 9; au.whistle.frequency.value = 1500;
      au.whistleGain = ctx.createGain(); au.whistleGain.gain.value = 0;
      src.connect(au.whistle); au.whistle.connect(au.whistleGain); au.whistleGain.connect(au.master);
      src.start();
      // generator: two low oscillators, chugged by a slow LFO
      au.g1 = ctx.createOscillator(); au.g1.type = 'sawtooth'; au.g1.frequency.value = 46;
      au.g2 = ctx.createOscillator(); au.g2.type = 'square'; au.g2.frequency.value = 92;
      var glp = ctx.createBiquadFilter(); glp.type = 'lowpass'; glp.frequency.value = 230;
      au.chug = ctx.createGain(); au.chug.gain.value = 0.5;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 7.5; var lg = ctx.createGain(); lg.gain.value = 0.45;
      lfo.connect(lg); lg.connect(au.chug.gain);
      au.genGain = ctx.createGain(); au.genGain.gain.value = 0;
      au.g1.connect(glp); au.g2.connect(glp); glp.connect(au.chug); au.chug.connect(au.genGain); au.genGain.connect(au.master);
      au.g1.start(); au.g2.start(); lfo.start();
      // the coolers' compressors: a thin hum
      au.hum = ctx.createOscillator(); au.hum.type = 'triangle'; au.hum.frequency.value = 118;
      au.humGain = ctx.createGain(); au.humGain.gain.value = 0;
      au.hum.connect(au.humGain); au.humGain.connect(au.master); au.hum.start();
    } catch (e) { au = null; }
  }
  function setLevel(param, v, tc) { param.setTargetAtTime(v, au.ctx.currentTime, tc || 0.12); }
  function updateSound() {
    if (!au) return;
    var on = mode === 'playing' || mode === 'title' || mode === 'over';
    if (au.ctx.state === 'suspended' && on && !document.hidden) au.ctx.resume();
    if (!on) return;
    var k = G.keeper, out = isOutside(k), gust = G.gust > 0 ? 1 : 0, quiet = mode === 'playing' ? 1 : 0.55;
    setLevel(au.windGain.gain, (0.05 + 0.2 * G.storm + 0.12 * gust) * (out ? 1.6 : 0.8) * quiet);
    setLevel(au.windBand.frequency, 260 + 520 * G.storm + 300 * gust, 0.3);
    setLevel(au.windLow.frequency, out ? 2600 : 700, 0.2);
    setLevel(au.whistleGain.gain, G.storm * G.storm * (out ? 0.06 : 0.02) * quiet, 0.3);
    setLevel(au.whistle.frequency, 1200 + 700 * G.storm + 300 * Math.sin(G.t * 0.7), 0.4);
    var gen = G.gen, near = k.floor === 1 && k.ladder < 0 ? 1 : 0.4;
    var genV = gen.running && mode !== 'over' ? 0.13 * near * quiet : 0;
    if (gen.cough > 0) genV *= 0.4 + fx() * 0.9;
    setLevel(au.genGain.gain, genV, gen.cough > 0 ? 0.03 : 0.15);
    setLevel(au.g1.frequency, gen.cough > 0 ? 38 + fx() * 6 : 46, 0.05);
    var fans = (G.bays[0].fan + G.bays[1].fan + G.bays[2].fan) / 3;
    setLevel(au.humGain.gain, fans * (k.floor === 2 && k.ladder < 0 ? 0.035 : 0.01) * quiet * (mode === 'over' ? 0 : 1));
  }
  function env(g, t0, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function tone(f, dur, type, peak, f2, delay) {
    var c = au.ctx, t0 = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    env(g, t0, 0.008, peak, dur); o.connect(g); g.connect(au.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function hiss(dur, ftype, f, q, peak, delay, f2) {
    var c = au.ctx, t0 = c.currentTime + (delay || 0), src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = au.noise; fl.type = ftype; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); fl.Q.value = q;
    env(g, t0, Math.min(0.02, dur / 4), peak, dur); src.connect(fl); fl.connect(g); g.connect(au.master);
    src.start(t0, fx() * 1.5); src.stop(t0 + dur + 0.05);
  }
  function sound(name) {
    if (!au || !settings.sound || au.ctx.state !== 'running') return;
    if (mode === 'title' && name !== 'step' && name !== 'rung' && name !== 'snowstep') return;   // the demo night walks, but never shouts
    switch (name) {
      case 'scrape': hiss(0.05, 'highpass', 2200 + fx() * 1600, 1, 0.12); break;
      case 'pour': hiss(0.08, 'bandpass', 380 + fx() * 380, 7, 0.16); break;
      case 'glug': tone(190, 0.16, 'sine', 0.16, 110); break;
      case 'pickup': tone(520, 0.07, 'square', 0.04); tone(820, 0.12, 'triangle', 0.05, 0, 0.05); hiss(0.04, 'bandpass', 3200, 2, 0.08); break;
      case 'hit': tone(150, 0.17, 'sine', 0.42, 62); hiss(0.03, 'bandpass', 1800, 3, 0.16); break;
      case 'miss': tone(210, 0.09, 'square', 0.05, 160); hiss(0.07, 'lowpass', 420, 1, 0.12); break;
      case 'restart': tone(34, 0.7, 'sawtooth', 0.12, 58); tone(660, 0.22, 'sine', 0.06, 0, 0.35); tone(990, 0.32, 'sine', 0.05, 0, 0.48); break;
      case 'cough': for (var i = 0; i < 3; i++) hiss(0.09, 'lowpass', 320, 1, 0.22, i * 0.2); break;
      case 'stall': tone(46, 0.9, 'sawtooth', 0.12, 18); break;
      case 'gust': hiss(1.3, 'bandpass', 280, 0.8, 0.16, 0, 980); break;
      case 'crack': hiss(0.07, 'highpass', 3200, 1, 0.22); tone(2500, 0.25, 'sine', 0.03); break;
      case 'alarm': tone(880, 0.12, 'sine', 0.05); tone(660, 0.15, 'sine', 0.05, 0, 0.17); break;
      case 'collapse': tone(300, 0.8, 'triangle', 0.09, 70); break;
      case 'step': hiss(0.03, 'lowpass', 650, 1, 0.05); break;
      case 'snowstep': hiss(0.05, 'bandpass', 1500, 1.2, 0.07); break;
      case 'rung': tone(1250, 0.03, 'square', 0.012); break;
      case 'ui': tone(1500, 0.03, 'square', 0.015); break;
    }
  }
  function sting(name) {
    if (!au || !settings.sound || au.ctx.state !== 'running' || mode === 'title') return;
    if (name === 'dawn') [262, 330, 392, 588, 784].forEach(function (f, i) { tone(f, 3.2, 'sine', 0.05, 0, i * 0.12); });
    else { tone(220, 1.4, 'triangle', 0.08, 165); tone(196, 1.8, 'triangle', 0.07, 131, 0.35); hiss(1.5, 'lowpass', 600, 0.7, 0.08, 0.2, 200); }
  }
  function firstGesture() { audioUnlock(); }
  addEventListener('pointerdown', firstGesture, true);
  addEventListener('keydown', firstGesture, true);
  onSettings = function (name, value) {
    if (name === 'sound' && au) setLevel(au.master.gain, value ? 0.85 : 0, 0.05);
    if (name === 'sound' && value) sound('ui');
  };

  // Frost on a cooler grows from the grille's edges inward; the pattern is fixed per cooler.
  var FROST_SPIKES = [0, 1, 2].map(function (i) {
    var r = makeRng(31 + i), out = [];
    for (var n = 0; n < 34; n++) out.push({ t: r(), side: Math.floor(r() * 4), at: r(), len: 4 + r() * 10, ang: (r() - 0.5) * 1.4 });
    return out;
  });
  function drawBays(c, now) {
    for (var i = 0; i < 3; i++) {
      var b = G.bays[i], sx = STATIONS[2 + i].x, B = BAYS[i];
      // the bay chamber: shelves white with frost while cold, bare as it warms
      var cold = clamp((-b.temp - 8) / 9, 0, 1);
      c.fillStyle = 'rgba(214,240,248,' + (0.10 + cold * 0.42).toFixed(3) + ')';
      for (var row = 0; row < 4; row++) c.fillRect(B.x0 + 31, 740 + row * 30, B.x1 - B.x0 - 44, 2.5 + cold * 2);
      if (b.temp > TUNE.thawLine) {                  // warm: a red wash rises in the chamber
        var warm = clamp((b.temp - TUNE.thawLine) / 12, 0, 1);
        var pulse = settings.lowFx ? 1 : 0.8 + 0.2 * Math.sin(now * 0.004);
        c.fillStyle = 'rgba(255,91,74,' + ((0.08 + warm * 0.22) * pulse).toFixed(3) + ')';
        c.fillRect(B.x0, 712, B.x1 - B.x0, 150);
      }
      // thermometer column and reading
      var tx = B.x0 + 13, ty = thermoY(b.temp);
      var hot = b.temp > TUNE.thawLine;
      c.fillStyle = hot ? C.alarm : C.frost;
      c.fillRect(tx - 2.5, ty, 5, THERMO.bot + 4 - ty);
      c.beginPath(); c.arc(tx, THERMO.bot + 4, 4.5, 0, Math.PI * 2); c.fill();
      c.font = '600 15px "Martian Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      var label = (b.temp < 0 ? '\u2212' : '+') + Math.abs(b.temp).toFixed(0) + '\u00b0';
      c.fillStyle = 'rgba(13,20,36,0.85)'; c.fillRect(B.x0 + 4, 714, 50, 20);
      c.fillStyle = hot ? C.alarm : C.snow; c.fillText(label, B.x0 + 7, 730);
      // cooler: fan behind the grille, turning with its output
      b.spin = (b.spin || 0) + b.fan * 0.35;
      c.save(); c.translate(sx, 669);
      c.strokeStyle = '#6f80a3'; c.lineWidth = 3;
      for (var bl = 0; bl < 3; bl++) { var a = b.spin + bl * 2.094; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); c.stroke(); }
      c.restore();
      c.strokeStyle = '#2c3955'; c.lineWidth = 1.5;
      for (var gx = sx - 16; gx <= sx + 16; gx += 4) { c.beginPath(); c.moveTo(gx, 653); c.lineTo(gx, 685); c.stroke(); }
      drawFrost(c, i, b.frost, sx - 19, 652, 38, 34);
      // output lamp on the housing
      c.fillStyle = b.frost >= 1 ? C.alarm : (b.fan > 0.4 ? '#9be0a0' : C.amber);
      c.fillRect(sx + 13, 692, 6, 3);
    }
  }
  function drawFrost(c, idx, f, x, y, w, h) {
    if (f <= 0.01) return;
    var th = f * Math.min(w, h) * 0.5;
    c.fillStyle = 'rgba(214,240,248,' + (0.35 + f * 0.5).toFixed(3) + ')';
    c.fillRect(x, y, w, th * 0.6); c.fillRect(x, y + h - th * 0.6, w, th * 0.6);
    c.fillRect(x, y, th * 0.6, h); c.fillRect(x + w - th * 0.6, y, th * 0.6, h);
    c.strokeStyle = 'rgba(238,247,250,0.9)'; c.lineWidth = 1;
    var sp = FROST_SPIKES[idx];
    c.beginPath();
    for (var n = 0; n < sp.length; n++) {
      var q = sp[n]; if (q.t > f * 1.1) continue;
      var px, py, nx, ny;
      if (q.side === 0) { px = x + q.at * w; py = y; nx = 0; ny = 1; }
      else if (q.side === 1) { px = x + w; py = y + q.at * h; nx = -1; ny = 0; }
      else if (q.side === 2) { px = x + q.at * w; py = y + h; nx = 0; ny = -1; }
      else { px = x; py = y + q.at * h; nx = 1; ny = 0; }
      var L = q.len * (0.5 + f), ca = Math.cos(q.ang), sa = Math.sin(q.ang);
      var dx = nx * ca - ny * sa, dy = nx * sa + ny * ca;
      c.moveTo(px, py); c.lineTo(px + dx * L, py + dy * L);
      c.moveTo(px + dx * L * 0.5, py + dy * L * 0.5); c.lineTo(px + dx * L * 0.5 + (dx - dy) * L * 0.3, py + dy * L * 0.5 + (dy + dx) * L * 0.3);
    }
    c.stroke();
    if (f >= 1) {                                    // iced solid: a white slab with a crack
      c.fillStyle = 'rgba(226,244,250,0.92)'; c.fillRect(x, y, w, h);
      c.strokeStyle = '#8fb8c8'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x + 6, y + 4); c.lineTo(x + 16, y + 15); c.lineTo(x + 12, y + 24); c.lineTo(x + 26, y + 31); c.stroke();
    }
  }

  // The action prompt floats over the keeper (DOM, so it stays crisp at any size).
  var promptEl = document.getElementById('prompt');
  var PROMPTS = { bay: 'Hold Work: scrape the frost', bayClear: 'Cooler is clear' };
  var meterEls = { warm: document.getElementById('m-warm'), fuel: document.getElementById('m-fuel') };
  var collEl = document.getElementById('coll'), collBar = document.getElementById('m-coll');
  var clockEl = document.getElementById('clock'), logEl = document.getElementById('log'), logShown = 0;
  var subEl = document.getElementById('clock-sub'), tickerEl = document.getElementById('ticker');
  var stormEl = document.getElementById('m-storm'), stormWord = document.getElementById('storm-word'), fuelPct = document.getElementById('fuel-pct');
  function stormText() {
    if (G.storm >= 0.95) return 'at its worst';
    var d = stormAt(G.t + 8) - G.storm;
    return d > 0.01 ? 'rising' : d < -0.01 ? 'easing' : 'holding';
  }
  function updateClock() {
    if (clockEl) { var ct = clockText(G.t); if (clockEl.textContent !== ct) clockEl.textContent = ct; }
    if (subEl) {
      var left = Math.max(0, TUNE.hours * 60 - Math.floor(G.t / TUNE.nightSec * TUNE.hours * 60 + 1e-6));
      var sub = G.demo ? 'a night on its own' : left >= TUNE.hours * 60 ? 'shift begins' : left > 0 ? Math.floor(left / 60) + ' h ' + String(left % 60).padStart(2, '0') + ' to dawn' : 'dawn';
      if (subEl.textContent !== sub) subEl.textContent = sub;
    }
    if (stormEl) { stormEl.style.setProperty('--v', G.storm.toFixed(3)); var w = stormText(); if (stormWord.textContent !== w) stormWord.textContent = w; }
    if (fuelPct) { var fp = Math.round(G.gen.fuel) + '%'; if (fuelPct.textContent !== fp) fuelPct.textContent = fp; }
    if (!logEl) return;
    var tail = G.log.length ? G.log[G.log.length - 1].tick + ':' + G.log.length : '';
    if (tail === logShown) return; logShown = tail;
    var html = '';
    for (var i = Math.max(0, G.log.length - 7); i < G.log.length; i++) {
      var e = G.log[i];
      html = '<li class="ev-' + e.kind + '"><time>' + clockText(e.t) + '</time> ' + e.text + '</li>' + html;
    }
    logEl.innerHTML = html;
    if (tickerEl) { var last = G.log[G.log.length - 1]; tickerEl.innerHTML = last ? '<time>' + clockText(last.t) + '</time>' + last.text : ''; }
  }
  function updateMeters() {
    updateClock();
    if (!meterEls.warm) return;
    var k = G.keeper;
    meterEls.warm.style.setProperty('--v', (k.warmth / 100).toFixed(3));
    meterEls.warm.classList.toggle('low', k.warmth < 35);
    meterEls.fuel.style.setProperty('--v', (G.gen.fuel / 100).toFixed(3));
    meterEls.fuel.classList.toggle('low', G.gen.fuel < 25);
    if (collEl) {
      var n = score(), txt = n.toLocaleString('en-GB');
      if (collEl.textContent !== txt) collEl.textContent = txt;
      collBar.style.setProperty('--v', (n / (TUNE.perBay * 3)).toFixed(4));
      collBar.classList.toggle('low', n < TUNE.failBelow + 400);
    }
  }
  function updatePrompt(k, alpha) {
    updateMeters();
    if (!promptEl) return;
    var st = mode === 'playing' ? stationAt(k) : null;
    var text = '';
    if (st && st.bay !== undefined) {
      var b = G.bays[st.bay];
      text = k.working ? 'Scraping \u00b7 ' + Math.round(b.frost * 100) + '% frost' : (b.frost > 0.02 ? PROMPTS.bay : PROMPTS.bayClear);
    } else if (st && st.id === 'shed') {
      text = k.carrying ? 'Hands full: take it down to the generator' : (k.working ? 'Taking a can\u2026' : 'Hold Work: take a fuel can');
    } else if (st && st.id === 'gen') {
      var f = Math.round(G.gen.fuel);
      if (k.working) text = 'Pouring\u2026';
      else if (k.carrying && f < 100) text = 'Hold Work: pour the can';
      else if (G.gen.stalled && G.gen.fuel > 0) text = 'Press Work in the green \u00b7 ' + G.gen.hits + '/' + TUNE.crankHits;
      else if (k.carrying) text = 'Tank is full';
      else if (G.gen.stalled) text = 'No fuel: cans are in the shed outside';
      else text = 'Running \u00b7 ' + f + '% fuel';
    }
    if (k.collapsed > 0) text = '';
    if (!text) { promptEl.hidden = true; return; }
    promptEl.hidden = false;
    if (promptEl.textContent !== text) promptEl.textContent = text;
    var below = st && st.id === 'gen' && G.gen.stalled;   // keep the crank dial in sight: prompt under the floor
    var x = view.ox + (k.px + (k.x - k.px) * alpha) * view.s, y = view.oy + (k.py + (k.y - k.py) * alpha + (below ? 12 : -52)) * view.s;
    var half = promptEl.offsetWidth / 2 + 6;
    x = clamp(x, half, Math.max(half, view.cw - half));
    promptEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px) translate(-50%,' + (below ? '0' : '-100%') + ')';
  }
  function drawCables(c, powered, now) {
    if (!powered) return;
    c.strokeStyle = 'rgba(255,176,58,' + (0.55 + Math.sin(now * 0.004) * 0.1).toFixed(3) + ')'; c.lineWidth = 1.2;
    c.beginPath(); CABLES.forEach(function (path) { c.moveTo(path[0][0], path[0][1]); for (var q = 1; q < path.length; q++) c.lineTo(path[q][0], path[q][1]); }); c.stroke();
  }
  var puffs = [];
  function drawGenerator(c, now, dt) {
    var gen = G.gen, x0 = 262, y0 = 420;
    var jig = gen.running ? Math.sin(now * 0.06) * (gen.cough > 0 ? 2.2 : 0.6) : 0;
    if (gen.cough > 0 && fx() < dt * 10) puffs.push({ x: EXHAUST.x, y: EXHAUST.y - 4, r: 4, a: 0.8, dark: true });
    // fuel gauge on the front panel: a column of cells and the % in figures
    c.fillStyle = '#121a2c'; c.fillRect(x0 + 2, y0 + 2, 48, 36);
    var cells = 10, lit = Math.ceil(gen.fuel / 10 - 0.001);
    for (var i = 0; i < cells; i++) {
      var on = i < lit, low = gen.fuel < 25;
      c.fillStyle = on ? (low ? C.alarm : C.amber) : '#26324c';
      c.fillRect(x0 + 6 + i * 4.2, y0 + 26 + jig, 3.2, 8);
    }
    c.font = '600 12px "Martian Mono", monospace'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = gen.fuel < 25 ? C.alarm : C.snow;
    c.fillText(Math.round(gen.fuel) + '%', x0 + 6, y0 + 19);
    c.font = '600 6px "Martian Mono", monospace'; c.fillStyle = '#8796b8'; c.fillText('FUEL', x0 + 34, y0 + 10);
    // the flywheel turns while it runs
    gen.spin = (gen.spin || 0) + (gen.running ? dt * 9 : 0);
    c.strokeStyle = '#8293b3'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(330 + Math.cos(gen.spin) * 13, 440 + Math.sin(gen.spin) * 13); c.lineTo(330 - Math.cos(gen.spin) * 13, 440 - Math.sin(gen.spin) * 13); c.stroke();
    c.fillStyle = gen.running ? '#9be0a0' : C.alarm; c.fillRect(342, 418, 4, 4);
    // exhaust puffs out of the stack on the slope
    if (gen.running && fx() < dt * 6) puffs.push({ x: EXHAUST.x, y: EXHAUST.y - 4, r: 3, a: 0.5 });
    for (var p = puffs.length - 1; p >= 0; p--) {
      var q = puffs[p]; q.x += 16 * dt; q.y -= 10 * dt; q.r += 6 * dt; q.a -= 0.3 * dt;
      if (q.a <= 0) { puffs.splice(p, 1); continue; }
      c.fillStyle = (q.dark ? 'rgba(20,24,34,' : 'rgba(150,165,190,') + q.a.toFixed(3) + ')'; c.beginPath(); c.arc(q.x, q.y, Math.max(0.5, q.r), 0, Math.PI * 2); c.fill();
    }
    if (gen.cough > 0) {                             // the cough: a warning mark over the machine
      c.fillStyle = C.amber; c.font = '800 22px "Big Shoulders Stencil", sans-serif'; c.textAlign = 'center';
      c.fillText('!', 300 + Math.sin(now * 0.05) * 1.5, 408);
    }
    if (gen.stalled) drawCrank(c, now);
  }
  // The crank dial: the needle swings; Work in the green zone counts, outside it costs one.
  function drawCrank(c, now) {
    var gen = G.gen, cx = 300, cy = 404, R = 32;
    c.save();
    c.fillStyle = 'rgba(13,20,36,0.92)'; c.beginPath(); c.arc(cx, cy, R + 6, Math.PI, 0); c.closePath(); c.fill();
    c.lineWidth = 7;
    var z = TUNE.crankZone * Math.PI / 2;
    c.strokeStyle = '#3a4866'; c.beginPath(); c.arc(cx, cy, R, Math.PI, 0); c.stroke();
    c.strokeStyle = gen.flash > 0 ? C.snow : '#9be0a0'; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 - z, -Math.PI / 2 + z); c.stroke();
    var a = -Math.PI / 2 + needle() * Math.PI / 2;
    c.strokeStyle = gen.miss > 0 ? C.alarm : C.amber; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R + 3), cy + Math.sin(a) * (R + 3)); c.stroke();
    for (var i = 0; i < TUNE.crankHits; i++) {
      c.fillStyle = i < gen.hits ? '#9be0a0' : '#3a4866';
      c.beginPath(); c.arc(cx - 10 + i * 10, cy + 7, 3, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = gen.fuel > 0 ? C.amber : C.alarm;
    c.font = '800 10px "Big Shoulders Stencil", sans-serif'; c.textAlign = 'center';
    c.fillText(gen.fuel > 0 ? 'CRANK' : 'NO FUEL', cx, cy - 12);
    c.restore();
  }
  function lampPool(c, x, y, r) {
    var g = c.createRadialGradient(x, y, 2, x, y + r * 0.4, r);
    g.addColorStop(0, 'rgba(255,170,70,0.20)'); g.addColorStop(1, 'rgba(255,170,70,0)');
    c.fillStyle = g; c.fillRect(x - r, y - 4, r * 2, r * 1.3);
    c.fillStyle = '#ffd38a'; c.fillRect(x - 5, y - 4, 10, 3);
  }

  // ---------------------------------------------------------------- pointer: click or tap to walk
  function toWorld(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return { x: (cx - r.left - view.ox) / view.s, y: (cy - r.top - view.oy) / view.s };
  }
  // Press and hold on a station: walk there and work it while the press lasts.
  var pointer = { down: false, id: -1, station: null };
  function pointerWorks(st) { return pointer.down && st && pointer.station === st.id; }
  function stationForTarget(t) {
    for (var i = 0; i < STATIONS.length; i++) if (STATIONS[i].floor === t.floor && STATIONS[i].x === t.x) return STATIONS[i].id;
    return null;
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'playing') return;
    var p = toWorld(e.clientX, e.clientY);
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) return;
    var t = targetFor(p.x, p.y);
    G.keeper.target = t;
    pointer.down = true; pointer.id = e.pointerId; pointer.station = stationForTarget(t);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  function pointerUp(e) { if (e.pointerId === pointer.id) { pointer.down = false; pointer.station = null; } }
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  // ---------------------------------------------------------------- loop
  // Fixed 60 Hz steps on an accumulator; drawing is separate and stops while paused, over or hidden.
  var acc = 0, prev = 0, looping = false, demoWait = 0, hitstop = 0;
  function kick() { if (!looping && !document.hidden) { looping = true; prev = 0; requestAnimationFrame(frame); } }
  function frame(now) {
    if (document.hidden) { looping = false; return; }
    var dt = prev ? Math.min(0.25, (now - prev) / 1000) : 0; prev = now;
    var live = mode === 'playing' || mode === 'title';
    if (live && hitstop > 0) { hitstop -= dt; acc = 0; }          // a crank hit lands: the world holds for a beat
    else if (live) {
      acc += dt;
      while (acc >= TICK) { if (G.demo) botThink(); tick(); acc -= TICK; }
      if (G.demo && G.result) { demoWait += dt; if (demoWait > 3) { demoWait = 0; G = demoNight(); } }
    }
    render(live ? acc / TICK : 1, now);
    if (!live) { looping = false; return; }          // one last frame under the menu, then nothing until resume
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- the demo keeper (title screen, and the index's live preview)
  var demoCount = 0, bot = { aim: null, cool: 0, skill: 1, goal: null, wait: 0, off: null, rng: makeRng(1) };
  function botReset(seed) { bot.aim = null; bot.goal = null; bot.wait = 0; bot.off = null; bot.cool = 0; bot.rng = makeRng(hashSeed(seed) ^ 0x5eed); }
  function demoNight() { var N = seedBays(newNight('demo-' + (demoCount++) + '-' + SEED)); N.demo = true; botReset(N.seed); return N; }
  function botGoal() {
    var k = G.keeper, gen = G.gen;
    var slack = 1 - bot.skill;                         // a weaker keeper notices later and fetches fuel later
    if (k.carrying) return 'gen';
    if (gen.stalled && gen.fuel > 0) return 'gen';
    if (gen.fuel < 34 - slack * 22) return 'shed';
    if (bot.aim && G.bays[+bot.aim[3]].frost > 0.06) return bot.aim;
    var pick = null, worst = 0.42 + slack * 0.3;
    for (var i = 0; i < 3; i++) {
      var b = G.bays[i], u = b.frost + Math.max(0, b.temp - TUNE.setpoint) / 4;
      if (u > worst) { worst = u; pick = 'bay' + i; }
    }
    bot.aim = pick;
    return pick || 'bay1';
  }
  function botThink() {
    var k = G.keeper, inp = botInput;
    inp.x = 0; inp.y = 0; inp.work = false;
    if (k.collapsed > 0 || G.result) return;
    var goal = botGoal(), st = null;
    if (goal !== bot.goal) {                           // reaction time: a weaker keeper takes a moment to change plan
      if (bot.wait <= 0 && bot.goal !== null) bot.wait = (1 - bot.skill) * 2.2;
      bot.wait -= TICK;
      if (bot.wait > 0) goal = bot.goal || goal; else { bot.goal = goal; bot.wait = 0; }
    }
    for (var i = 0; i < STATIONS.length; i++) if (STATIONS[i].id === goal) st = STATIONS[i];
    var here = stationAt(k);
    if (here && here.id === goal) {
      k.target = null;
      if (goal === 'gen' && G.gen.stalled && !(k.carrying && G.gen.fuel < 100)) {
        if (bot.cool > 0) bot.cool -= TICK;
        else {
          // aim at the middle of the green, off by a human amount that grows as skill drops
          if (bot.off === null) bot.off = (bot.rng() * 2 - 1) * (1 - bot.skill) * 0.9;
          if (Math.abs(needle() - bot.off) < 0.05) { inp.work = true; bot.cool = 0.3; bot.off = null; }
        }
      } else inp.work = true;
    } else if (!k.target || k.target.x !== st.x || k.target.floor !== st.floor) {
      k.target = { floor: st.floor, x: st.x };
    }
  }

  function score() { return G.bays.reduce(function (n, b) { return n + Math.floor(b.acc); }, 0); }
  // ---------------------------------------------------------------- best score (localStorage, never trusted)
  var BEST_KEY = 'hold-the-cold:best';
  function readBest() {
    try { var v = JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); return v && typeof v.score === 'number' ? v : null; } catch (e) { return null; }
  }
  function writeBest(v) { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch (e) {} }

  // ---------------------------------------------------------------- end of the night
  var endEl = document.getElementById('end');
  function minSec(t) { var m = Math.floor(t / 60), s2 = Math.round(t % 60); return (m ? m + ' min ' : '') + s2 + ' s'; }
  function endLine(result, sc) {
    if (result === 'compromised') return 'At ' + clockText(G.endedAt) + ' the collection fell below half. Hesper Fell is declared compromised.';
    if (sc >= 2900) return 'Every drawer still white with frost. The relief crew finds you asleep against the generator.';
    if (sc >= 2400) return 'A few trays went soft in the small hours. The rest will outlast all of us.';
    return 'Half a vault is still a vault. The crew brings coffee and doesn\u2019t ask.';
  }
  function showEnd(result) {
    mode = 'over';
    var sc = result === 'dawn' ? score() : 0;
    var best = readBest(), isBest = result === 'dawn' && (!best || sc > best.score);
    if (isBest) { var d0 = new Date(); best = { score: sc, seed: G.seed, date: d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0') }; writeBest(best); }
    if (!endEl) return;
    endEl.querySelector('[data-k=title]').textContent = result === 'dawn' ? 'Dawn at Hesper Fell' : 'Vault compromised';
    endEl.querySelector('[data-k=line]').textContent = endLine(result, score());
    endEl.querySelector('[data-k=score]').textContent = score().toLocaleString('en-GB');
    endEl.querySelector('[data-k=scorelabel]').textContent = result === 'dawn' ? 'accessions saved' : 'accessions left when it ended (a lost night scores nothing)';
    endEl.querySelector('[data-k=bays]').innerHTML = G.bays.map(function (b, i) {
      return '<li><b>Bay ' + BAYS[i].name + '</b><span>' + Math.floor(b.acc).toLocaleString('en-GB') + '</span></li>';
    }).join('');
    var st = G.stats;
    endEl.querySelector('[data-k=stats]').innerHTML = [
      ['Cans hauled', st.cans], ['Stalls restarted', st.restarts], ['Time outside', minSec(st.outsideSec)],
      ['Collapses', st.collapses], ['Frost scraped', minSec(st.scrapeSec)]
    ].map(function (r) { return '<li><span>' + r[0] + '</span><b>' + r[1] + '</b></li>'; }).join('');
    endEl.querySelector('[data-k=best]').textContent = best ? best.score.toLocaleString('en-GB') + (isBest ? ' \u00b7 new best' : '') : 'none yet';
    endEl.querySelector('[data-k=seed]').textContent = G.seed;
    endEl.classList.toggle('lost', result !== 'dawn');
    endEl.hidden = false;
    unlock();
    endGrace = performance.now() + 1500;             // BUG-0002: a Space still meant for the crank must not skip the results
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    setTimeout(function () { if (mode === 'over') focusEl(endEl.querySelector('[data-k=again]')); }, 1500);
    say(result === 'dawn' ? 'Dawn. ' + score().toLocaleString('en-GB') + ' accessions saved.' + (isBest ? ' A new best night.' : '')
      : 'The vault is compromised at ' + clockText(G.endedAt) + '.');
  }

  var endGrace = 0;
  function swallowEarly(e) {
    if (mode === 'over' && performance.now() < endGrace && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  addEventListener('keydown', swallowEarly, true);
  addEventListener('keyup', swallowEarly, true);

  // ---------------------------------------------------------------- screens and modes
  var gameEl = document.getElementById('game');
  var scr = { title: document.getElementById('scr-title'), how: document.getElementById('scr-how'), pause: document.getElementById('scr-pause') };
  var srEl = document.getElementById('sr'), muteBtn = document.getElementById('btn-mute'), workBtn = document.getElementById('btn-work');
  var embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) document.documentElement.classList.add('embedded');
  var howFrom = null;
  function howOpen() { return scr.how && !scr.how.hidden; }
  function focusEl(el) { if (el && !embedded) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  function say(text) {
    if (!srEl || (G && G.demo && mode === 'title' && text.indexOf('Sound') !== 0 && text.indexOf('New seed') !== 0)) return;
    srEl.textContent = '';
    setTimeout(function () { srEl.textContent = text; }, 40);
  }
  function stackLayout() { return !(window.matchMedia && matchMedia('(min-aspect-ratio: 5/4)').matches); }
  function lock() { if (stackLayout() && !embedded) document.documentElement.classList.add('locked'); }
  function unlock() { document.documentElement.classList.remove('locked'); }
  function hideScreens() { scr.title.hidden = true; scr.how.hidden = true; scr.pause.hidden = true; if (endEl) endEl.hidden = true; }
  function refreshTitle() {
    var daily = !params.get('seed');
    document.getElementById('seed-title').textContent = SEED;
    document.getElementById('seed-kind').textContent = daily ? "today's storm" : 'a chosen storm';
    var best = readBest();
    document.getElementById('best-title').textContent = best ? 'Best night: ' + best.score.toLocaleString('en-GB') + ' accessions (seed ' + best.seed + ')' : 'Best night: none yet';
  }
  function toTitle() {
    hideScreens(); scr.title.hidden = false; unlock(); gameEl.classList.add('is-title');
    mode = 'title'; G = demoNight(); acc = 0; clearInput();
    refreshTitle(); focusEl(document.getElementById('btn-play'));
    kick();
  }
  function start() {
    G = seedBays(newNight(SEED));
    mode = 'playing'; acc = 0; clearInput(); pointer.down = false;
    hideScreens(); lock(); gameEl.classList.remove('is-title');
    if (window.scrollY > 4 && gameEl.scrollIntoView) gameEl.scrollIntoView({ block: 'start' });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    say('The shift begins at 22:00. Keep all three bays below minus ten.');
    kick();
  }
  function pause() {
    if (mode !== 'playing') return;
    mode = 'paused'; clearInput(); pointer.down = false;
    document.getElementById('pause-at').textContent = 'at ' + clockText(G.t);
    scr.pause.hidden = false; unlock();
    if (au && au.ctx.state === 'running') au.ctx.suspend();
    focusEl(document.getElementById('btn-resume'));
    say('Paused at ' + clockText(G.t) + '.');
  }
  function resume() {
    if (mode !== 'paused') return;
    scr.pause.hidden = true; scr.how.hidden = true;
    mode = 'playing'; acc = 0; clearInput(); lock();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    say('Back to work.');
    kick();
  }
  function openHow(from) { howFrom = from; scr.how.hidden = false; focusEl(scr.how.querySelector('[data-close]')); }
  function closeHow() { scr.how.hidden = true; focusEl(howFrom === 'pause' ? document.getElementById('btn-resume') : document.getElementById('btn-play')); }
  onEnd = function (result) { if (G.demo) return; showEnd(result); };
  onEvent = function (e) {
    if (G.demo) return;
    if (e.kind === 'hour') say(clockText(e.t) + '. ' + e.text + ' ' + score().toLocaleString('en-GB') + ' accessions frozen.');
    else if (/^(stall|dry|thaw|collapse|restart|lost)$/.test(e.kind)) say(e.text);
  };

  function bindUi() {
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button'); if (b && b.id !== 'btn-work') sound('ui'); });
    document.getElementById('btn-play').addEventListener('click', start);
    document.getElementById('btn-resume').addEventListener('click', resume);
    document.getElementById('btn-restart').addEventListener('click', start);
    document.getElementById('btn-quit').addEventListener('click', toTitle);
    document.getElementById('btn-pause').addEventListener('click', function (e) { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); if (e.detail) this.blur(); });
    muteBtn.addEventListener('click', function (e) { setSetting('sound', !settings.sound); if (e.detail) this.blur(); });
    var opens = document.querySelectorAll('[data-open=how]');
    for (var i = 0; i < opens.length; i++) opens[i].addEventListener('click', function () { openHow(mode === 'paused' ? 'pause' : 'title'); });
    scr.how.querySelector('[data-close]').addEventListener('click', closeHow);
    var tg = document.querySelectorAll('[data-setting]');
    for (i = 0; i < tg.length; i++) tg[i].addEventListener('click', function () { var n = this.getAttribute('data-setting'); setSetting(n, !settings[n]); });
    document.getElementById('btn-newseed').addEventListener('click', function () {
      SEED = 'n' + (Date.now() % 2176782336).toString(36);   // a new storm, named after the moment it was asked for
      try { history.replaceState(null, '', '?seed=' + SEED); } catch (e) {}
      params = new URLSearchParams('?seed=' + SEED);
      refreshTitle(); say('New seed ' + SEED + '.');
    });
    if (endEl) {
      endEl.querySelector('[data-k=again]').addEventListener('click', start);
      endEl.querySelector('[data-k=totitle]').addEventListener('click', toTitle);
    }
    // WORK: held while a finger is on it
    function workDown(e) { if (mode !== 'playing') return; touchWork = true; workBtn.classList.add('held'); try { workBtn.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault(); }
    function workUp() { touchWork = false; workBtn.classList.remove('held'); }
    workBtn.addEventListener('pointerdown', workDown);
    workBtn.addEventListener('pointerup', workUp);
    workBtn.addEventListener('pointercancel', workUp);
    workBtn.addEventListener('lostpointercapture', workUp);
    workBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // pause when the player looks away
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (mode === 'playing') pause(); if (au && au.ctx.state === 'running') au.ctx.suspend(); }
      else kick();
    });
    addEventListener('blur', function () { clearInput(); pointer.down = false; if (mode === 'playing') pause(); });
  }

  // ---------------------------------------------------------------- test hooks
  window.__game = {
    get seed() { return SEED; },
    state: function () { return mode; },
    start: start,
    pause: function () { pause(); }, resume: function () { resume(); }, title: function () { toTitle(); },
    step: function (ms) {
      var n = Math.round((ms || 0) * TUNE.tickHz / 1000);
      for (var i = 0; i < n; i++) tick();
      return G.tick;
    },
    input: function (o) {
      if (!o) { for (var k in hookInput) hookInput[k] = false; return; }
      for (var key in o) if (key in hookInput) hookInput[key] = !!o[key];
      if (o.target) G.keeper.target = targetFor(o.target[0], o.target[1]);
    },
    snapshot: function () {
      var k = G.keeper;
      return {
        seed: G.seed, tick: G.tick, mode: mode, demo: !!G.demo,
        keeper: { x: +k.x.toFixed(3), y: +k.y.toFixed(3), floor: k.ladder >= 0 ? null : k.floor, ladder: k.ladder, working: k.working },
        bays: G.bays.map(function (b) { return { temp: +b.temp.toFixed(3), frost: +b.frost.toFixed(4), accessions: Math.floor(b.acc) }; }),
        collection: score(), result: G.result, score: score(),
        gen: { fuel: +G.gen.fuel.toFixed(3), running: G.gen.running },
        warmth: +k.warmth.toFixed(3), carrying: k.carrying, collapsed: k.collapsed > 0, outside: isOutside(k),
        stats: { scrapeSec: +G.stats.scrapeSec.toFixed(2), cans: G.stats.cans, outsideSec: +G.stats.outsideSec.toFixed(2), collapses: G.stats.collapses, stalls: G.stats.stalls, restarts: G.stats.restarts },
        log: G.log.length,
        t: +G.t.toFixed(3), clock: clockText(G.t), storm: +G.storm.toFixed(3), gust: G.gust > 0, ended: G.ended,
        stalled: G.gen.stalled, cough: G.gen.cough > 0, hits: G.gen.hits, eventsFired: G.nextEvent
      };
    }
  };

  // Debug hook for run-and-observe: puts the night into a state a launch alone does not reach.
  window.__game.debug = {
    bay: function (i, o) { var b = G.bays[i]; if (o.temp !== undefined) b.temp = o.temp; if (o.frost !== undefined) b.frost = o.frost; if (o.acc !== undefined) b.acc = o.acc; },
    keeper: function (x, floor) { var k = G.keeper; k.x = k.px = x; k.floor = floor; k.ladder = -1; k.y = k.py = FLOORS[floor].y; k.target = null; },
    gen: function (o) { for (var key in o) G.gen[key] = o[key]; },
    warmth: function (v) { G.keeper.warmth = v; },
    carry: function (v) { G.keeper.carrying = !!v; },
    setGust: function (sec) { G.gust = sec; },
    log: function () { return G.log.slice(); },
    schedule: function () { return G.schedule.slice(); },
    needle: function () { return needle(); },
    audio: function () { return au ? { created: true, state: au.ctx.state, master: +au.master.gain.value.toFixed(3), wind: +au.windGain.gain.value.toFixed(4), gen: +au.genGain.gain.value.toFixed(4) } : { created: false }; },
    particles: function () { return parts.length; },
    perf: function (n) {                             // cost of n simulation ticks and n full renders, in ms each
      n = n || 300; var t0 = performance.now(); for (var i = 0; i < n; i++) tick();
      var t1 = performance.now(); for (i = 0; i < n; i++) render(1, t1 + i * 16.7);
      var t2 = performance.now(); lastFrame = 0; return { tickMs: +((t1 - t0) / n).toFixed(4), renderMs: +((t2 - t1) / n).toFixed(3), dpr: view.dpr, canvas: [canvas.width, canvas.height] };
    },
    tune: function (o) { var old = {}; for (var key in o) { old[key] = TUNE[key]; TUNE[key] = o[key]; } return old; },
    toScreen: function (x, y) { var r = canvas.getBoundingClientRect(); return [+(r.left + view.ox + x * view.s).toFixed(1), +(r.top + view.oy + y * view.s).toFixed(1)]; },
    // balance runs: the demo keeper plays a whole night on a seed, in simulation time
    autoplay: function (seed, skill) {
      var keepSeed = SEED; SEED = seed || SEED;
      start(); G.bot = true; botReset(G.seed); bot.skill = skill === undefined ? 1 : skill;
      for (var i = 0; i < TUNE.nightSec * TUNE.tickHz + 10 && !G.result; i++) { botThink(); tick(); }
      var out = { seed: SEED, result: G.result, score: score(), endedAt: clockText(G.endedAt), stats: JSON.parse(JSON.stringify(G.stats)), bays: G.bays.map(function (b) { return Math.floor(b.acc); }) };
      SEED = keepSeed; bot.skill = 1; return out;
    },
    time: function (t) { G.t = t; G.nextEvent = 0; while (G.nextEvent < G.schedule.length && G.schedule[G.nextEvent].t <= t) G.nextEvent++; G.hourLogged = Math.floor(t / (TUNE.nightSec / TUNE.hours)); }
  };

  addEventListener('resize', resize);
  bindUi();
  reflectSettings();
  G = demoNight();
  toTitle();
  resize();
  if (document.fonts && document.fonts.load) document.fonts.load('800 14px "Big Shoulders Stencil"').then(drawStatic, function () {});
})();
