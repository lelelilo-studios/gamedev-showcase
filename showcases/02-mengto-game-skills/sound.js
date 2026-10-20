/* Hedge Witch: sound, all made in code with WebAudio.
   build-game-audio-feedback: a distinct cue for input accepted, windup, contact, block, damage, warning, loss and
   objective; priorities so warnings stay audible in a crowd; a voice cap; nothing before the first gesture;
   music that changes state with ramps instead of restarts; a remembered mute. */
(function () {
  'use strict';
  window.createHedgeSound = function () {
    var ctx = null, master, sfx, music, comp, noiseBuf, muted = false, vol = 0.8;
    var voices = []; // { end, pri, g }
    var CAP = 16, last = {}, musicState = 'none', amb = null;

    function now() { return ctx.currentTime; }
    function unlock() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try { ctx = new AC(); } catch (e) { return false; }
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = muted ? 0 : vol;
      sfx = ctx.createGain(); sfx.gain.value = 0.9; music = ctx.createGain(); music.gain.value = 0.55;
      sfx.connect(comp); music.connect(comp); comp.connect(master); master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startAmbience();
      if (musicState !== 'none') { var s = musicState; musicState = 'none'; setMusic(s); }
      return true;
    }
    // ---------------------------------------------------------------- voices and priority
    function claim(pri, dur) {
      if (!ctx || muted) return null;
      var t = now();
      for (var i = voices.length - 1; i >= 0; i--) if (voices[i].end < t) voices.splice(i, 1);
      if (voices.length >= CAP) {
        var lo = -1, lp = 99; for (var j = 0; j < voices.length; j++) if (voices[j].pri < lp) { lp = voices[j].pri; lo = j; }
        if (lp >= pri) return null; // crowded: drop the lesser cue
        try { voices[lo].g.gain.cancelScheduledValues(t); voices[lo].g.gain.setTargetAtTime(0, t, 0.01); } catch (e) {}
        voices.splice(lo, 1);
      }
      var g = ctx.createGain(); g.connect(sfx);
      voices.push({ end: t + dur, pri: pri, g: g });
      setTimeout(function () { try { g.disconnect(); } catch (e) {} }, (dur + 0.3) * 1000);
      return g;
    }
    function panNode(dest, pan) { if (!pan || !ctx.createStereoPanner) return dest; var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(dest); return p; }
    function tone(dest, f, t0, dur, o) {
      o = o || {};
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.glide || dur));
      if (o.detune) osc.detune.value = o.detune;
      var a = o.attack || 0.005, pk = o.gain === undefined ? 0.3 : o.gain;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(dest); osc.start(t0); osc.stop(t0 + dur + 0.02);
      return osc;
    }
    function noise(dest, t0, dur, o) {
      o = o || {};
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      var f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1000, t0); f.Q.value = o.q || 0.7;
      if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
      var g = ctx.createGain(), a = o.attack || 0.004, pk = o.gain === undefined ? 0.3 : o.gain;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(dest); src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.02);
    }
    function bell(dest, f, t0, len, gain) {
      [[1, 1, 1], [2.01, 0.5, 0.7], [2.76, 0.32, 0.5], [4.07, 0.18, 0.33], [5.43, 0.1, 0.22]].forEach(function (p) { tone(dest, f * p[0], t0, len * p[2], { gain: gain * p[1], attack: 0.004 }); });
    }
    function throttle(name, ms) { var t = performance.now(); if (last[name] && t - last[name] < ms) return false; last[name] = t; return true; }

    // ---------------------------------------------------------------- cues
    var cues = {
      ui: function (g, t) { tone(g, 700, t, 0.07, { type: 'triangle', to: 980, gain: 0.12 }); },
      select: function (g, t) { tone(g, 523, t, 0.25, { type: 'triangle', gain: 0.16 }); tone(g, 784, t + 0.06, 0.3, { type: 'triangle', gain: 0.12 }); },
      notReady: function (g, t) { tone(g, 180, t, 0.08, { type: 'square', gain: 0.05, to: 140 }); },
      emberWind: function (g, t) { noise(g, t, 0.2, { filter: 'bandpass', freq: 500, to: 1600, q: 1.2, gain: 0.1, attack: 0.12 }); },
      emberThrow: function (g, t) { noise(g, t, 0.22, { filter: 'highpass', freq: 1200, to: 3000, gain: 0.12 }); tone(g, 260, t, 0.16, { to: 520, gain: 0.08, type: 'triangle' }); },
      emberBurst: function (g, t) {
        tone(g, 130, t, 0.42, { to: 42, gain: 0.5 }); noise(g, t, 0.6, { freq: 1600, to: 260, gain: 0.32 });
        for (var i = 0; i < 9; i++) noise(g, t + 0.05 + Math.random() * 0.6, 0.03, { filter: 'highpass', freq: 2200 + Math.random() * 2000, gain: 0.05 + Math.random() * 0.06 });
      },
      rimeWind: function (g, t) { [1760, 2349, 2637].forEach(function (f, i) { tone(g, f, t + i * 0.03, 0.3, { gain: 0.035, attack: 0.1, detune: (i - 1) * 9 }); }); },
      rimeCast: function (g, t) { noise(g, t, 0.55, { filter: 'highpass', freq: 5200, to: 2400, gain: 0.12, attack: 0.02 }); tone(g, 1568, t + 0.05, 0.5, { gain: 0.06 }); tone(g, 2093, t + 0.12, 0.45, { gain: 0.04 }); },
      freeze: function (g, t) { tone(g, 2093, t, 0.35, { gain: 0.08 }); tone(g, 3136, t + 0.02, 0.28, { gain: 0.06, detune: 8 }); noise(g, t, 0.12, { filter: 'highpass', freq: 6000, gain: 0.05 }); },
      shatter: function (g, t) { noise(g, t, 0.18, { filter: 'highpass', freq: 3000, gain: 0.25 }); for (var i = 0; i < 6; i++) tone(g, 2000 + Math.random() * 3200, t + Math.random() * 0.18, 0.18 + Math.random() * 0.2, { gain: 0.07 }); tone(g, 220, t, 0.2, { to: 90, gain: 0.18 }); },
      sparkWind: function (g, t) { var o = tone(g, 110, t, 0.18, { type: 'sawtooth', gain: 0.05, attack: 0.06, to: 220 }); },
      zap: function (g, t, o) { var k = 1 + (o && o.i || 0) * 0.18; noise(g, t, 0.1, { filter: 'bandpass', freq: 2600 * k, q: 0.9, gain: 0.26 }); tone(g, 95 * k, t, 0.12, { type: 'square', to: 40, gain: 0.12 }); tone(g, 3400 * k, t, 0.05, { gain: 0.05 }); },
      shellCrack: function (g, t) { noise(g, t, 0.16, { freq: 2200, to: 400, gain: 0.4 }); tone(g, 180, t, 0.22, { type: 'triangle', to: 55, gain: 0.32 }); tone(g, 1250, t, 0.03, { type: 'square', gain: 0.12 }); },
      deflect: function (g, t) { tone(g, 1450, t, 0.08, { type: 'triangle', gain: 0.1 }); tone(g, 2180, t + 0.01, 0.06, { type: 'triangle', gain: 0.07 }); },
      hit: function (g, t, o) { var e = o && o.element; if (e === 'fire') noise(g, t, 0.12, { freq: 900, gain: 0.12 }); else if (e === 'frost') tone(g, 1800, t, 0.1, { gain: 0.05 }); else noise(g, t, 0.06, { filter: 'bandpass', freq: 1800, gain: 0.1 }); },
      squish: function (g, t) { noise(g, t, 0.18, { filter: 'bandpass', freq: 600, to: 220, q: 2, gain: 0.22 }); tone(g, 240, t, 0.15, { to: 90, gain: 0.1 }); },
      crunch: function (g, t) { noise(g, t, 0.14, { freq: 1500, to: 300, gain: 0.3 }); tone(g, 140, t, 0.14, { type: 'triangle', to: 60, gain: 0.18 }); },
      bite: function (g, t) { noise(g, t, 0.05, { freq: 700, gain: 0.11 }); noise(g, t + 0.09, 0.05, { freq: 600, gain: 0.08 }); },
      herbLost: function (g, t) { bell(g, 196, t, 2.2, 0.16); tone(g, 98, t, 0.5, { gain: 0.15 }); },
      rustle: function (g, t, o) { var d = panNode(g, o && o.pan); for (var i = 0; i < 3; i++) noise(d, t + i * 0.07, 0.09, { filter: 'bandpass', freq: 3000 + i * 500, q: 0.8, gain: 0.07 }); },
      windup: function (g, t, o) { var d = (o && o.dur) || 0.6; var osc = tone(g, 70, t, d + 0.05, { type: 'sawtooth', to: 160, glide: d, gain: 0.09, attack: 0.05 }); noise(g, t, d, { filter: 'bandpass', freq: 400, to: 1200, q: 3, gain: 0.05, attack: 0.1 }); },
      charge: function (g, t) { noise(g, t, 0.35, { filter: 'bandpass', freq: 300, to: 900, q: 1, gain: 0.2 }); },
      bonk: function (g, t) { tone(g, 110, t, 0.25, { to: 50, gain: 0.35 }); noise(g, t, 0.15, { freq: 800, gain: 0.2 }); },
      witchHit: function (g, t) { tone(g, 95, t, 0.3, { to: 40, gain: 0.45 }); noise(g, t, 0.18, { freq: 900, gain: 0.25 }); tone(g, 310, t + 0.02, 0.18, { type: 'sawtooth', to: 170, gain: 0.05 }); },
      dodge: function (g, t) { noise(g, t, 0.2, { filter: 'bandpass', freq: 1400, to: 3000, q: 1.5, gain: 0.12 }); tone(g, 880, t + 0.05, 0.15, { gain: 0.04, to: 1320 }); },
      skip: function (g, t) { noise(g, t, 0.16, { filter: 'bandpass', freq: 1000, to: 2400, q: 1.2, gain: 0.1 }); },
      bell: function (g, t, o) { bell(g, (o && o.boss) ? 165 : 220, t, 3.2, 0.2); },
      clear: function (g, t) { [659, 784, 988].forEach(function (f, i) { tone(g, f, t + i * 0.12, 0.6, { type: 'triangle', gain: 0.1 }); }); },
      upgrade: function (g, t) { [523, 659, 784, 1046].forEach(function (f, i) { tone(g, f, t + i * 0.06, 0.5, { type: 'triangle', gain: 0.1 }); }); },
      landed: function (g, t) { tone(g, 120, t, 0.12, { to: 70, gain: 0.1 }); },
      stompWind: function (g, t) { noise(g, t, 0.75, { freq: 180, to: 400, gain: 0.18, attack: 0.3 }); },
      stomp: function (g, t) { tone(g, 70, t, 0.6, { to: 28, gain: 0.6 }); noise(g, t, 0.5, { freq: 700, to: 120, gain: 0.35 }); },
      roar: function (g, t) { tone(g, 62, t, 1.3, { type: 'sawtooth', to: 40, gain: 0.22, attack: 0.1 }); noise(g, t, 1.2, { freq: 420, to: 160, gain: 0.25, attack: 0.15 }); tone(g, 93, t + 0.05, 1.1, { type: 'square', to: 55, gain: 0.06 }); },
      thorn: function (g, t) { tone(g, 1600, t, 0.45, { to: 500, gain: 0.05 }); },
      thornLand: function (g, t) { tone(g, 160, t, 0.15, { to: 70, gain: 0.2 }); noise(g, t, 0.1, { freq: 1200, gain: 0.12 }); },
      plateCrack: function (g, t) { noise(g, t, 0.25, { freq: 2600, to: 300, gain: 0.45 }); tone(g, 120, t, 0.35, { type: 'triangle', to: 40, gain: 0.4 }); tone(g, 900, t, 0.05, { type: 'square', gain: 0.12 }); },
      platesRegrow: function (g, t) { tone(g, 200, t, 0.3, { type: 'triangle', to: 320, gain: 0.12 }); noise(g, t, 0.3, { freq: 600, gain: 0.08 }); },
      brood: function (g, t) { for (var i = 0; i < 6; i++) tone(g, 2400 + Math.random() * 800, t + i * 0.05, 0.04, { type: 'square', gain: 0.03 }); },
      pop: function (g, t) { tone(g, 600, t, 0.12, { type: 'triangle', to: 1200, gain: 0.06 }); },
      win: function (g, t) {
        [261.6, 329.6, 392, 587.3].forEach(function (f, i) { tone(g, f, t + i * 0.15, 3.2, { type: 'triangle', gain: 0.09, attack: 0.4 }); });
        for (var i = 0; i < 7; i++) { var t1 = t + 0.8 + i * 0.28 + Math.random() * 0.1; tone(g, 2600 + Math.random() * 900, t1, 0.12, { to: 3800 + Math.random() * 600, gain: 0.04 }); }
      },
      lose: function (g, t) { [440, 392, 349.2, 329.6].forEach(function (f, i) { tone(g, f / 2, t + i * 0.32, 1.0, { type: 'triangle', gain: 0.12 }); }); bell(g, 110, t + 1.2, 3, 0.12); }
    };
    var PRI = { witchHit: 3, windup: 3, herbLost: 3, bell: 3, roar: 3, stompWind: 3, win: 3, lose: 3, shellCrack: 2, plateCrack: 2, shatter: 2, stomp: 2, emberBurst: 2, zap: 2, rimeCast: 2, freeze: 2,
      rustle: 1, bite: 0, hit: 0, deflect: 1, notReady: 1, pop: 0, landed: 0, thornLand: 1, brood: 1 };
    var DUR = { bell: 3.3, herbLost: 2.3, win: 4, lose: 4.4, roar: 1.4, windup: 1.2, stompWind: 0.8 };
    function play(name, o) {
      if (!ctx || muted || !cues[name]) return;
      if ((name === 'bite' || name === 'hit') && !throttle(name, 110)) return;
      if (name === 'notReady' && !throttle(name, 250)) return;
      if (name === 'rustle' && !throttle(name, 150)) return;
      var g = claim(PRI[name] === undefined ? 1 : PRI[name], (o && o.dur || DUR[name] || 0.7));
      if (!g) return;
      try { cues[name](g, now() + 0.005, o); } catch (e) {}
    }

    // ---------------------------------------------------------------- ambience and music by state
    function startAmbience() {
      amb = { nextCricket: 0, drone: [], droneGain: ctx.createGain(), beat: ctx.createGain(), nextBeat: 0, lp: ctx.createBiquadFilter() };
      amb.lp.type = 'lowpass'; amb.lp.frequency.value = 520; amb.lp.Q.value = 0.8;
      amb.droneGain.gain.value = 0.0001; amb.lp.connect(amb.droneGain); amb.droneGain.connect(music);
      amb.beat.gain.value = 0.0001; amb.beat.connect(music);
      [[73.42, 'triangle', 0], [110, 'triangle', 4], [146.83, 'sine', -5]].forEach(function (d) { var o = ctx.createOscillator(); o.type = d[1]; o.frequency.value = d[0]; o.detune.value = d[2]; o.connect(amb.lp); o.start(); amb.drone.push(o); });
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(amb.lp.frequency); lfo.start();
      // a soft night wind
      var wsrc = ctx.createBufferSource(); wsrc.buffer = noiseBuf; wsrc.loop = true;
      var wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 380; var wg = ctx.createGain(); wg.gain.value = 0.035;
      var wl = ctx.createOscillator(), wlg = ctx.createGain(); wl.frequency.value = 0.11; wlg.gain.value = 0.02; wl.connect(wlg); wlg.connect(wg.gain); wl.start();
      wsrc.connect(wf); wf.connect(wg); wg.connect(music); wsrc.start();
    }
    var STATES = {
      title: { drone: 0.05, root: 73.42, beat: 0, crickets: 1 },
      calm: { drone: 0.045, root: 73.42, beat: 0, crickets: 1 },
      wave: { drone: 0.07, root: 73.42, beat: 0.06, crickets: 0.5, bpm: 70 },
      boss: { drone: 0.09, root: 69.3, beat: 0.12, crickets: 0.1, bpm: 92 },
      pause: { drone: 0.02, root: 73.42, beat: 0, crickets: 0.3 },
      win: { drone: 0.05, root: 65.41, beat: 0, crickets: 0.2 },
      lose: { drone: 0.04, root: 55, beat: 0, crickets: 0.6 }
    };
    function setMusic(s) {
      if (s === musicState) return; musicState = s;
      if (!ctx || !amb) return;
      var st = STATES[s] || STATES.calm, t = now();
      amb.droneGain.gain.setTargetAtTime(st.drone, t, 0.8);
      amb.drone[0].frequency.setTargetAtTime(st.root, t, 1.2); amb.drone[1].frequency.setTargetAtTime(st.root * 1.498, t, 1.2); amb.drone[2].frequency.setTargetAtTime(st.root * 2, t, 1.2);
      amb.beat.gain.setTargetAtTime(st.beat, t, 0.6);
      amb.st = st;
    }
    function tick() {
      if (!ctx || !amb || muted) return;
      var t = now(), st = amb.st || STATES.calm;
      if (t > amb.nextCricket) {
        amb.nextCricket = t + 0.35 + Math.random() * 1.6 / Math.max(0.15, st.crickets);
        if (Math.random() < st.crickets) {
          var g = ctx.createGain(); g.gain.value = 0.018 + Math.random() * 0.02; g.connect(panNode(music, Math.random() * 1.6 - 0.8));
          var f = 4200 + Math.random() * 900;
          for (var i = 0; i < 3; i++) tone(g, f, t + i * 0.045, 0.03, { gain: 1, attack: 0.004 });
          setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 600);
        }
      }
      if (st.beat > 0 && t > amb.nextBeat) {
        amb.nextBeat = Math.max(t, amb.nextBeat) + 60 / (st.bpm || 70);
        tone(amb.beat, 55, amb.nextBeat, 0.25, { to: 40, gain: 0.8 });
        tone(amb.beat, 55, amb.nextBeat + 0.18, 0.2, { to: 42, gain: 0.45 });
      }
    }
    return {
      unlock: unlock, play: play, setMusic: setMusic, tick: tick,
      get ready() { return !!ctx; },
      setMuted: function (m) { muted = !!m; if (ctx) master.gain.setTargetAtTime(muted ? 0 : vol, now(), 0.05); },
      get muted() { return muted; },
      suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
      resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); }
    };
  };
})();
