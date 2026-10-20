// Patchwork Isles: sound, all made in code. Nothing starts before the first click or key.
export class Sound {
  constructor(muted) { this.muted = !!muted; this.ctx = null; this.master = null; this.lastTick = 0; this.amb = null; this.allowed = true; }
  unlock() {
    if (!this.allowed) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
        let b = 0; for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = (Math.random() * 2 - 1) * 0.5 + b * 2; }
        this.noise = buf;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.03); }
  get ok() { return !!(this.ctx && this.ctx.state === 'running' && !this.muted); }
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  tone(f, type, peak, d, when = 0, glide) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + d);
    this.env(g, t, 0.004, peak, d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.05);
  }
  burst(freq, q, peak, d, when = 0, type = 'bandpass') {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime + when, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.env(g, t, 0.003, peak, d); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + d + 0.05);
  }
  stitch() { // a needle through cloth
    if (!this.ok) return; const now = this.ctx.currentTime; if (now - this.lastTick < 0.075) return; this.lastTick = now;
    this.burst(3800 + Math.random() * 1500, 6, 0.05, 0.025);
    this.tone(1700 + Math.random() * 700, 'sine', 0.018, 0.04);
  }
  knot() { this.tone(330, 'triangle', 0.1, 0.3, 0, 170); this.tone(347, 'triangle', 0.07, 0.34, 0.02, 160); this.burst(400, 1, 0.05, 0.12); }
  snip() { this.burst(5200, 3, 0.12, 0.03); this.burst(4300, 3, 0.1, 0.04, 0.07); }
  done() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, 0.06, i * 0.09)); }
  bell(f = 660, peak = 0.12, when = 0) { for (const [m, a, d] of [[1, 1, 1.4], [2.76, 0.4, 0.8], [5.4, 0.18, 0.4]]) this.tone(f * m, 'sine', peak * a, d, when); }
  harbour() { this.bell(587.33, 0.16); this.bell(880, 0.1, 0.18); }
  dayBell() { this.bell(988, 0.05); this.bell(988, 0.045, 0.32); }
  thunk() { this.tone(150, 'sine', 0.32, 0.35, 0, 44); this.burst(220, 0.8, 0.22, 0.25, 0, 'lowpass'); }
  bump() { this.tone(120, 'sine', 0.12, 0.12, 0, 70); }
  luff(up) { this.burst(up ? 900 : 500, 0.9, 0.08, 0.22); }
  click() { this.tone(1200, 'square', 0.025, 0.03); }
  paint() { this.burst(2400 + Math.random() * 800, 2, 0.035, 0.03); }
  win() { [523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((f, i) => { this.tone(f, 'triangle', 0.07, 0.5, i * 0.12); this.tone(f * 2, 'sine', 0.02, 0.3, i * 0.12); }); }
  lose() { [392, 349.23, 293.66].forEach((f, i) => this.tone(f, 'triangle', 0.08, 0.6, i * 0.28)); }
  // the sea and the wind, while sailing
  ambience(on) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (on && !this.amb) {
      const mk = (freq, q, type) => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.master); s.start(0, Math.random() * 2); return { s, f, g }; };
      this.amb = { sea: mk(420, 0.6, 'lowpass'), wind: mk(900, 0.8, 'bandpass') };
    } else if (!on && this.amb) {
      const a = this.amb; this.amb = null; const t = c.currentTime;
      for (const k of ['sea', 'wind']) { a[k].g.gain.setTargetAtTime(0, t, 0.2); a[k].s.stop(t + 1); }
    }
  }
  setAmbience(swell, wind) {
    if (!this.amb) return; const t = this.ctx.currentTime;
    this.amb.sea.g.gain.setTargetAtTime(0.05 + 0.05 * swell, t, 0.3);
    this.amb.wind.g.gain.setTargetAtTime(0.012 + 0.04 * wind, t, 0.4);
    this.amb.wind.f.frequency.setTargetAtTime(700 + wind * 700, t, 0.5);
  }
}
