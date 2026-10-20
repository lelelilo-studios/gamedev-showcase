// Patchwork Isles: the game. Workroom, loom driver, voyage, HUD and the test hooks.
import { CHART_W, CHART_H, SAMPLE, TER, PRESETS, PRESET_KEYS, COASTS, PIECES, presetSample, rleEncode, rleDecode, scatterSample,
  sampleStats, Loom, judgeChart, mulberry32, hash32, seedNum, isWater, terrHash, HOURS_PER_SEC } from './loom.js';
import { FAB, INK, MADDER, MUSTARD, canvas, fabricPattern, fabricTile, muslinTile, renderChart, drawCell, drawBoat, drawButton,
  stitchCells, drawStitches, drawPiece, drawRose } from './art.js';
import { Sound } from './sound.js';

const $ = id => document.getElementById(id);
const STEP_MS = 1000 / 60, DT = 1 / 60;
const W = CHART_W, H = CHART_H;
const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const dprCap = () => Math.min(2, window.devicePixelRatio || 1);

// ---------- storage (every access guarded) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('patchwork-isles:' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('patchwork-isles:' + k, String(v)); } catch (e) { /* private mode */ } },
};
const settings = { muted: store.get('muted', '0') === '1', calm: store.get('calm', '0') === '1' };
const calm = () => settings.calm || RM.matches;
const sound = new Sound(settings.muted);
if (IN_FRAME) sound.allowed = false;
const deviceCap = (navigator.deviceMemory && navigator.deviceMemory <= 2) ? 350 : 360; // most pieces the loom will hold (about 0.36 MB each)

// ---------- seeds and the URL ----------
const Q = new URLSearchParams(location.search);
const num = v => { if (v === null || v === '') return null; const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n % 1000000000 : null; };
function today() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
const App = {
  seed: num(Q.get('seed')) ?? today(), daily: num(Q.get('seed')) === null, state: 'loading',
  model: 'patch', sampleSrc: null, sample: null, N: 3, sym: 2, wrap: false, coast: 'chain', sewSeed: 0, voyageSeed: 0,
  chart: null, chartTerr: null, chartStyle: 'patch', chartMeta: null, dirty: false, sewing: null, loom: null, fabric: 2,
};
function deriveFromSeed() {
  const key = PRESET_KEYS[App.seed % PRESET_KEYS.length];
  App.model = 'patch'; App.sampleSrc = { kind: 'preset', key }; App.sample = presetSample(key);
  App.N = PRESETS[key].n; App.sym = PRESETS[key].sym; App.wrap = false; App.coast = 'chain';
  App.sewSeed = seedNum(App.seed, 'sew'); App.voyageSeed = seedNum(App.seed, 'voyage');
}
deriveFromSeed();
(function readURL() {
  if (Q.get('model') === 'adm') App.model = 'adm';
  const s = Q.get('sample');
  if (s) {
    if (PRESETS[s]) { App.sampleSrc = { kind: 'preset', key: s }; App.sample = presetSample(s); App.N = PRESETS[s].n; App.sym = PRESETS[s].sym; }
    else if (/^scatter-\d+$/.test(s)) { const n = num(s.slice(8)); App.sampleSrc = { kind: 'scatter', seed: n }; App.sample = scatterSample(n); App.N = 3; App.sym = 2; }
    else { const d = rleDecode(s); if (d) { App.sampleSrc = { kind: 'painted' }; App.sample = d; } }
  }
  const n = num(Q.get('n')); if (n === 2 || n === 3) App.N = n;
  const sy = num(Q.get('sym')); if ([1, 2, 4, 8].includes(sy)) App.sym = sy;
  if (Q.has('wrap')) App.wrap = Q.get('wrap') === '1';
  if (COASTS[Q.get('coast')]) App.coast = Q.get('coast');
  const sw = num(Q.get('sew')); if (sw !== null) App.sewSeed = sw;
  const vo = num(Q.get('voyage')); if (vo !== null) App.voyageSeed = vo;
})();
function sampleParam() { const s = App.sampleSrc; return s.kind === 'preset' ? s.key : s.kind === 'scatter' ? 'scatter-' + s.seed : rleEncode(App.sample); }
function shareURL() {
  const p = new URLSearchParams();
  p.set('seed', App.seed); p.set('model', App.model);
  if (App.model === 'patch') { p.set('sample', sampleParam()); p.set('n', App.N); p.set('sym', App.sym); } else p.set('coast', App.coast);
  p.set('wrap', App.wrap ? 1 : 0); p.set('sew', App.sewSeed); p.set('voyage', App.voyageSeed);
  return location.origin + location.pathname + '?' + p.toString();
}
function syncURL() { if (IN_FRAME) return; try { history.replaceState(null, '', shareURL()); } catch (e) { /* file:// */ } }
function sampleLabel() {
  if (App.model === 'adm') return COASTS[App.coast].name;
  const s = App.sampleSrc; return s.kind === 'preset' ? PRESETS[s.key].name : s.kind === 'scatter' ? 'Scattered scrap No. ' + s.seed : 'Your own scrap';
}

// ---------- the library ----------
let WFC = null;
async function loadLibrary() {
  try {
    const m = await import('wavefunctioncollapse');
    const lib = { OverlappingModel: m.OverlappingModel || (m.default && m.default.OverlappingModel), SimpleTiledModel: m.SimpleTiledModel || (m.default && m.default.SimpleTiledModel) };
    if (typeof lib.OverlappingModel !== 'function' || typeof lib.SimpleTiledModel !== 'function') throw new Error('unexpected exports');
    WFC = lib; onLibrary();
  } catch (e) {
    App.state = 'error';
    $('loadNote').textContent = 'The loom did not arrive.';
    if (!IN_FRAME) openModal('errModal', $('errReload'));
    $('attractCap').textContent = 'No loom: wavefunctioncollapse could not be loaded.';
  }
}

// ---------- small UI helpers ----------
let liveTimer = 0;
function announce(t) { const el = $('live'); el.textContent = ''; clearTimeout(liveTimer); liveTimer = setTimeout(() => { el.textContent = t; }, 60); }
let toastTimer = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2600); }
const SVG_SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>';
const SVG_SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function syncMute() {
  for (const id of ['wrMute', 'hMute']) { const b = $(id); b.innerHTML = settings.muted ? SVG_SOUND_OFF : SVG_SOUND_ON; b.setAttribute('aria-label', settings.muted ? 'Sound is off. Turn it on (M)' : 'Sound is on. Turn it off (M)'); }
  $('optSound').checked = !settings.muted;
}
function toggleMute() { settings.muted = !settings.muted; store.set('muted', settings.muted ? 1 : 0); sound.setMuted(settings.muted); syncMute(); toast(settings.muted ? 'Sound off' : 'Sound on'); }
let modalReturn = null;
function openModal(id, focusEl) { const m = $(id); modalReturn = document.activeElement; m.hidden = false; (focusEl || m.querySelector('button')).focus(); }
function closeModal(id) { $(id).hidden = true; if (modalReturn && document.contains(modalReturn) && !modalReturn.closest('[hidden]')) modalReturn.focus(); }
const anyModal = () => ['howModal', 'pauseModal', 'overModal', 'chartModal', 'errModal'].some(id => !$(id).hidden);
function trapFocus(e) {
  const m = ['howModal', 'pauseModal', 'overModal', 'chartModal', 'errModal'].map($).find(x => !x.hidden); if (!m || e.key !== 'Tab') return;
  const f = [...m.querySelectorAll('button, input, a[href]')].filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}

const CONTROLS = [
  ['Paint the scrap', 'click and drag, or arrows + <kbd>Space</kbd>', 'drag on the frame'],
  ['Choose a fabric', '<kbd>1</kbd>–<kbd>7</kbd>, or right-click a square', 'tap a swatch'],
  ['Unpick a stroke', '<kbd>Ctrl</kbd>+<kbd>Z</kbd>', 'Unpick button'],
  ['Steer', '<kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd>', 'left-thumb arrows'],
  ['Set a course', 'click the sea', 'tap the sea'],
  ['Raise / lower sail', '<kbd>↑</kbd> <kbd>↓</kbd> or <kbd>W</kbd> <kbd>S</kbd>', 'right-thumb arrows'],
  ['Read the chart', '<kbd>C</kbd>', 'chart button'],
  ['Pause', '<kbd>Esc</kbd> or <kbd>P</kbd>', 'pause button'],
  ['Sound', '<kbd>M</kbd>', 'sound button'],
];
function fillKeys(el) { el.innerHTML = '<span class="h">Action</span><span class="h">Keys</span><span class="h">Touch</span>' + CONTROLS.map(r => `<span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span>`).join(''); }

// ---------- the sewing driver ----------
// One live attempt drawn stitch by stitch; on a knot, fast whole attempts with generate();
// the first clean one is replayed (same seed, same result) so you still watch it being sewn.
class Sewing {
  constructor(loom, seed, o) {
    Object.assign(this, { loom, seed, o, phase: 'live', attempt: 0, knots: 0, retries: 0, reasons: [], best: null, result: null, events: [], cells: [], chunk: 4, timer: 0, lastComplete: null });
    loom.begin(seed, 0); this.quota = Math.max(2, Math.ceil(loom.n / (o.liveSeconds * 60)));
  }
  get busy() { return this.phase !== 'done' && this.phase !== 'failed'; }
  tick() {
    if (this.phase === 'live' || this.phase === 'replay') this.stitch();
    else if (this.phase === 'unpick') { if (--this.timer <= 0) this.phase = 'search'; }
    else if (this.phase === 'search') this.search();
  }
  stitch() {
    let got = 0;
    for (let c = 0; c < 4 && got < this.quota; c++) {
      const before = this.cells.length, r = this.loom.run(this.chunk);
      this.loom.scan(this.cells); const g = this.cells.length - before; got += g;
      if (g < this.quota * 0.4) this.chunk = Math.min(this.chunk * 2, 512); else if (g > this.quota * 1.8) this.chunk = Math.max(1, this.chunk >> 1);
      if (r === 'knot') return this.onKnot();
      if (r === 'done') return this.onDone();
    }
  }
  onKnot() { this.knots++; const k = this.loom.knotCell(); this.events.push({ type: 'knot', x: k.x, y: k.y, attempt: this.attempt }); this.phase = 'unpick'; this.timer = 40; }
  judge(terr) { return this.o.judge ? judgeChart(terr, this.loom.W, this.loom.H, hash32('chart', this.seed)) : { ok: true, chart: null, reason: '' }; }
  retryable(j) { return j.reason !== 'few' || this.o.retryFew; }
  keepBest(j, a) { if (j.chart && (!this.best || j.score > this.best.score)) this.best = { attempt: a, score: j.score }; }
  onDone() {
    const terr = this.loom.finalTerrain(), j = this.judge(terr); this.lastComplete = terr;
    if (this.phase === 'replay' || j.ok || !this.retryable(j)) return this.finish(terr, j);
    this.reasons.push(j.reason); this.keepBest(j, this.attempt);
    this.events.push({ type: 'reject', reason: j.reason, attempt: this.attempt, n: j.an.reachable.length }); this.phase = 'unpick'; this.timer = 50;
  }
  search() {
    if (this.attempt + 1 >= this.o.maxAttempts) return this.giveUp();
    this.attempt++; this.retries++;
    if (!this.loom.fast(this.seed, this.attempt)) { this.knots++; this.events.push({ type: 'fastknot', attempt: this.attempt }); return; }
    const terr = this.loom.finalTerrain(), j = this.judge(terr); this.lastComplete = terr;
    if (j.ok) return this.replay(this.attempt);
    this.reasons.push(j.reason); this.keepBest(j, this.attempt);
    this.events.push({ type: 'fastreject', reason: j.reason, attempt: this.attempt });
    if (!this.retryable(j)) { this.replayAny = true; this.replay(this.attempt); }
  }
  replay(a) { this.phase = 'replay'; this.loom.begin(this.seed, a); this.quota = Math.max(2, Math.ceil(this.loom.n / (this.o.replaySeconds * 60))); this.chunk = 8; this.events.push({ type: 'replay', attempt: a }); }
  giveUp() {
    if (this.best) return this.replay(this.best.attempt);
    this.phase = 'failed'; this.result = { terr: this.lastComplete, judge: null }; this.events.push({ type: 'failed' });
  }
  finish(terr, j) { this.phase = 'done'; this.result = { terr: j.chart ? j.chart.terr : terr, judge: j }; this.events.push({ type: 'done', attempt: this.attempt }); }
  finishNow() { // skip the show: run every remaining attempt to its end at once
    let guard = 0;
    while (this.busy && guard++ < 1000) {
      if (this.phase === 'live' || this.phase === 'replay') { const r = this.loom.run(0); this.loom.scan(this.cells); if (r === 'knot') this.onKnot(); else this.onDone(); }
      else if (this.phase === 'unpick') this.phase = 'search'; else this.search();
    }
  }
}

// ---------- chart preview (workroom and title) ----------
class Preview {
  constructor(cv, w, h) { Object.assign(this, { cv, ctx: cv.getContext('2d'), W: w, H: h, cs: 0, style: 'patch', anims: [], terr: new Uint8Array(w * h).fill(255), shadeLvl: new Int8Array(w * h).fill(-1), ghost: null, knot: null, finalTerr: null, finalChart: null, final: null, needle: null, trail: [], live: false, lastShade: 0, dirty: true }); }
  fit(cssW, cssH) {
    const d = dprCap(); let tw = Math.max(60, cssW); if (cssH && tw * this.H / this.W > cssH) tw = Math.max(60, cssH * this.W / this.H);
    const cs = Math.max(3, Math.ceil(tw * d / this.W));
    this.cv.style.width = tw + 'px'; this.cv.style.height = (tw * this.H / this.W) + 'px';
    if (cs === this.cs && this.settled) return;
    this.cs = cs; this.cv.width = cs * this.W; this.cv.height = cs * this.H;
    this.settled = canvas(cs * this.W, cs * this.H); this.sctx = this.settled.getContext('2d');
    this.baste(); const n = this.W * this.H;
    for (let i = 0; i < n; i++) if (this.terr[i] !== 255) drawCell(this.sctx, i, this.terr[i], this.W, cs, this.style);
    this.anims.length = 0; this.final = null; this.finalDone = false; this.dirty = true;
  }
  baste() { // an unsewn chart: muslin with a pencil grid
    const g = this.sctx, cs = this.cs, w = this.W * cs, h = this.H * cs;
    g.fillStyle = '#ece2cc'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90,70,40,.11)';
    for (let x = 0; x <= this.W; x++) g.fillRect(x * cs, 0, 1, h);
    for (let y = 0; y <= this.H; y++) g.fillRect(0, y * cs, w, 1);
    g.fillStyle = 'rgba(90,70,40,.16)';
    for (let x = 0; x <= this.W; x += 6) g.fillRect(x * cs, 0, 1, h);
    for (let y = 0; y <= this.H; y += 6) g.fillRect(0, y * cs, w, 1);
    this.shadeLvl.fill(-1);
  }
  reset(style) {
    this.style = style; this.terr.fill(255); this.anims.length = 0; this.finalTerr = null; this.finalChart = null; this.final = null; this.finalDone = false; this.knot = null; this.trail.length = 0; this.needle = null;
    if (this.settled) this.baste(); this.dirty = true;
  }
  add(cells, src, now) {
    if (!cells.length) return;
    const instant = calm();
    for (const i of cells) {
      this.terr[i] = src[i];
      if (instant || !this.settled) { if (this.settled) drawCell(this.sctx, i, src[i], this.W, this.cs, this.style); }
      else this.anims.push({ i, t: src[i], t0: now });
    }
    const last = cells[cells.length - 1]; this.target = [(last % this.W + 0.5) * this.cs, (((last / this.W) | 0) + 0.5) * this.cs];
    if (this.anims.length > 1400) { for (const a of this.anims.splice(0, this.anims.length - 900)) drawCell(this.sctx, a.i, a.t, this.W, this.cs, this.style); }
    this.dirty = true;
  }
  unpick(knot, now) {
    if (this.settled) { this.flush(); this.ghost = canvas(this.settled.width, this.settled.height); this.ghost.getContext('2d').drawImage(this.settled, 0, 0); this.ghostT0 = now; this.baste(); }
    this.terr.fill(255); this.knot = knot ? { x: knot.x, y: knot.y, t0: now } : null; this.trail.length = 0; this.dirty = true;
  }
  flush() { for (const a of this.anims) drawCell(this.sctx, a.i, a.t, this.W, this.cs, this.style); this.anims.length = 0; }
  setFinal(terr, chart, now) { this.flush(); this.finalTerr = terr; this.finalChart = chart; this.final = null; this.finalDone = false; this.finalT0 = now; this.live = false; this.dirty = true; }
  shade(loom) { // pencil shading: darker where fewer pieces still fit
    const g = this.sctx, cs = this.cs, n = this.W * this.H;
    for (let i = 0; i < n; i++) {
      if (this.terr[i] !== 255) continue;
      const o = loom.openness(i), lvl = o > 0.97 ? 0 : Math.min(5, 1 + Math.floor((1 - o) * 5));
      if (lvl === this.shadeLvl[i]) continue; this.shadeLvl[i] = lvl;
      const x = (i % this.W) * cs, y = ((i / this.W) | 0) * cs;
      g.fillStyle = '#ece2cc'; g.fillRect(x + 1, y + 1, cs - 1, cs - 1);
      if (lvl) { g.fillStyle = `rgba(70,58,44,${0.05 + lvl * 0.05})`; g.fillRect(x + 1, y + 1, cs - 1, cs - 1); }
    }
  }
  busy() { return this.dirty || this.anims.length || this.ghost || this.knot || this.live || (this.finalTerr && !this.finalDone); }
  draw(now, loom) {
    if (!this.settled || !this.busy()) return;
    this.dirty = false;
    const g = this.ctx, cs = this.cs, W = this.W;
    if (this.live && loom && now - this.lastShade > 140) { this.lastShade = now; this.shade(loom); }
    g.drawImage(this.settled, 0, 0);
    const keep = [];
    for (const a of this.anims) {
      const p = (now - a.t0) / 240;
      if (p >= 1) { drawCell(this.sctx, a.i, a.t, W, cs, this.style); drawCell(g, a.i, a.t, W, cs, this.style); continue; }
      keep.push(a);
      const sc = p < 0.65 ? 0.35 + 0.8 * (1 - Math.pow(1 - p / 0.65, 3)) : 1.15 - 0.15 * ((p - 0.65) / 0.35);
      const x = (a.i % W + 0.5) * cs, y = (((a.i / W) | 0) + 0.5) * cs;
      g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y); g.globalAlpha = Math.min(1, p * 2.5);
      drawCell(g, a.i, a.t, W, cs, this.style); g.restore();
    }
    this.anims = keep;
    if (this.ghost) {
      const p = (now - this.ghostT0) / 650;
      if (p >= 1) this.ghost = null;
      else { g.save(); g.globalAlpha = 1 - p; g.drawImage(this.ghost, 0, cs * p * 1.5); g.restore(); this.dirty = true; }
    }
    if (this.knot) {
      const p = (now - this.knot.t0) / 1100;
      if (p >= 1) this.knot = null;
      else {
        const x = (this.knot.x + 0.5) * cs, y = (this.knot.y + 0.5) * cs, r = Math.max(6, cs * 1.4);
        g.save(); g.globalAlpha = Math.min(1, (1 - p) * 2); g.strokeStyle = MADDER; g.lineWidth = Math.max(1.5, cs * 0.18);
        const rnd = mulberry32(this.knot.x * 97 + this.knot.y);
        g.beginPath(); for (let k = 0; k < 7; k++) { const a = rnd() * 6.28, rr = r * (0.3 + rnd() * 0.5); g.moveTo(x + Math.cos(a) * rr + rr * 0.6, y + Math.sin(a) * rr); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, rr * 0.6, 0, 6.28); }
        g.stroke(); g.restore(); this.dirty = true;
      }
    }
    // the needle and its thread
    if (this.live && this.target && !calm()) {
      if (!this.needle) this.needle = this.target.slice();
      this.needle[0] += (this.target[0] - this.needle[0]) * 0.32; this.needle[1] += (this.target[1] - this.needle[1]) * 0.32;
      this.trail.push(this.needle.slice()); if (this.trail.length > 9) this.trail.shift();
      if (this.trail.length > 2) {
        g.save(); g.strokeStyle = 'rgba(178,58,43,.7)'; g.lineWidth = Math.max(1.2, cs * 0.12); g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(this.trail[0][0], this.trail[0][1]);
        for (let k = 1; k < this.trail.length - 1; k++) { const a = this.trail[k], b = this.trail[k + 1]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
        g.stroke(); g.restore();
      }
      const t2 = this.trail[Math.max(0, this.trail.length - 4)], ang = Math.atan2(this.needle[1] - t2[1], this.needle[0] - t2[0]) || -0.8, L = Math.max(14, cs * 2.4);
      g.save(); g.translate(this.needle[0], this.needle[1]); g.rotate(ang);
      g.strokeStyle = 'rgba(30,26,22,.35)'; g.lineWidth = Math.max(2, cs * 0.24); g.lineCap = 'round'; g.beginPath(); g.moveTo(-L + 2, 2); g.lineTo(2, 2); g.stroke();
      g.strokeStyle = '#d9dde0'; g.lineWidth = Math.max(1.6, cs * 0.2); g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, 0); g.stroke();
      g.strokeStyle = '#8a9095'; g.lineWidth = 1; g.beginPath(); g.ellipse(-L * 0.82, 0, L * 0.09, Math.max(1, cs * 0.06), 0, 0, 7); g.stroke();
      g.restore();
    }
    if (this.finalTerr) {
      if (!this.final) {
        this.final = canvas(cs * W, cs * this.H); const fc = this.final.getContext('2d');
        renderChart(fc, this.finalTerr, W, this.H, cs, this.style, { shoal: this.finalChart && this.finalChart.shoal });
        if (this.finalChart) this.finalChart.ports.forEach((p, k) => drawButton(fc, p.cx * cs, p.cy * cs, Math.max(3.5, cs * 0.62), k === 0 ? 'home' : 'seen', 0));
        if (calm() || !(this.finalT0 > now - 2000)) this.finalT0 = now - 1000;
      }
      const p = clamp((now - this.finalT0) / 650, 0, 1);
      g.save(); g.globalAlpha = p; g.drawImage(this.final, 0, 0); g.restore();
      if (p < 1) this.dirty = true; else this.finalDone = true;
    }
    if (this.anims.length || (this.live && this.target)) this.dirty = true;
  }
}

// ---------- title: cross-stitched name and the attract loom ----------
const titleLayout = stitchCells(['PATCHWORK', 'ISLES']);
let titleT0 = 0;
function drawTitle(now, cv, prog) {
  const badge = cv === $('badgeTitle'), d = dprCap();
  const cssW = badge ? clamp(innerWidth * 0.3, 110, 210) : cv.parentElement.clientWidth - 68;
  const sw = Math.max(2, Math.floor(cssW * d / (titleLayout.w + 1)));
  const w = sw * (titleLayout.w + 1), h = sw * (titleLayout.h + 1);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cv.style.width = (w / d) + 'px'; cv.style.height = (h / d) + 'px'; }
  const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(90,70,40,.13)';
  for (let y = 0; y <= titleLayout.h + 1; y++) for (let x = 0; x <= titleLayout.w + 1; x++) g.fillRect(x * sw - 0.6 * d, y * sw - 0.6 * d, 1.2 * d, 1.2 * d);
  drawStitches(g, titleLayout, sw, sw * 0.5, sw * 0.5, prog);
}
const Attract = { loom: null, sewing: null, preview: null, idx: 0, hold: 0, kinds: ['atolls', 'adm:chain', 'fjord', 'isle', 'adm:wide', 'delta'], visible: true };
function attractNext() {
  if (!WFC) return;
  if (Attract.loom) Attract.loom.free();
  Attract.sewing = null;
  const k = Attract.kinds[Attract.idx % Attract.kinds.length], seed = seedNum(App.seed, 'attract', Attract.idx); Attract.idx++;
  const aw = 48, ah = 32;
  let spec, label, style = 'patch';
  if (k.startsWith('adm:')) { const c = k.slice(4); spec = { kind: 'adm', coast: c, wrap: false, W: aw, H: ah }; label = 'Admiralty · ' + COASTS[c].name; style = 'adm'; }
  else { spec = { kind: 'patch', sample: presetSample(k), N: 3, sym: PRESETS[k].sym, wrap: false, cap: 400, W: aw, H: ah }; label = 'Patchwork · ' + PRESETS[k].name; }
  Attract.loom = new Loom(WFC, spec);
  if (Attract.loom.error) { Attract.hold = 30; return; }
  Attract.sewing = new Sewing(Attract.loom, seed, { liveSeconds: 4.2, replaySeconds: 2.6, maxAttempts: 8, judge: false });
  if (!Attract.preview) Attract.preview = new Preview($('attractCanvas'), aw, ah);
  layoutTitle(); Attract.preview.reset(style); Attract.preview.live = true;
  $('attractCap').textContent = label + ' · No. ' + seed;
}
function attractTick() {
  if (!Attract.visible || !WFC) return;
  const s = Attract.sewing; if (!s) { if (--Attract.hold <= 0) attractNext(); return; }
  if (s.busy) {
    s.tick(); const now = performance.now();
    Attract.preview.add(s.cells, s.loom.terr, now); s.cells.length = 0;
    for (const e of s.events.splice(0)) {
      if (e.type === 'knot') { Attract.preview.unpick(e, now); $('attractCount').textContent = 'knot · unpicking'; }
      else if (e.type === 'replay') { Attract.preview.reset(Attract.preview.style); Attract.preview.live = true; }
      else if (e.type === 'done') { Attract.preview.setFinal(s.result.terr, null, now); Attract.hold = 200; }
      else if (e.type === 'failed') Attract.hold = 30;
    }
    if (s.busy) $('attractCount').textContent = `${s.loom.decided} / ${s.loom.n} stitches` + (s.knots ? ` · ${s.knots} knot${s.knots > 1 ? 's' : ''}` : '');
    else $('attractCount').textContent = `sewn${s.retries ? ' after ' + s.retries + ' retr' + (s.retries > 1 ? 'ies' : 'y') : ' first time'}`;
  } else if (--Attract.hold <= 0) attractNext();
}
function layoutTitle() {
  if (!Attract.preview) return;
  const fig = $('attractFig'), w = fig.clientWidth - (IN_FRAME ? 16 : 24);
  const maxH = IN_FRAME ? innerHeight - 56 : (innerWidth < 880 ? Math.min(innerHeight * 0.32, 300) : innerHeight - 140);
  Attract.preview.fit(Math.max(120, w), maxH);
}

// ---------- the workroom ----------
const preview = new Preview($('chart'), W, H);
const Slate = { cv: $('slate'), cursor: { x: 5, y: 5 }, painting: false, undo: [], hover: null, focused: false, last: null, geo: null };
function slateFit() {
  const cv = Slate.cv, d = dprCap(), S = Math.max(220, Math.min(cv.parentElement.clientWidth, innerWidth > 1080 ? (innerHeight < 980 ? 300 : 340) : 420));
  const pad = S * 0.085, grid = S - 2 * pad, cell = grid / SAMPLE, bar = S * 0.07, mY = S * 0.03, Hh = grid + 2 * (bar + mY);
  Slate.geo = { S, pad, grid, cell, bar, mY, Hh, gx: pad, gy: bar + mY };
  cv.width = Math.round(S * d); cv.height = Math.round(Hh * d); cv.style.width = S + 'px'; cv.style.height = Hh + 'px';
  drawSlate();
}
function drawSlate() {
  const cv = Slate.cv, g = cv.getContext('2d'), d = dprCap(), G = Slate.geo; if (!G) return;
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, G.S, G.Hh);
  const wood = (x, y, w, h, vertical) => { const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#d2a465'); gr.addColorStop(0.5, '#b07a3e'); gr.addColorStop(1, '#8a5b2b'); g.fillStyle = gr; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(60,35,15,.5)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); g.strokeStyle = 'rgba(255,230,190,.18)'; for (let k = 1; k < 4; k++) { g.beginPath(); if (vertical) { g.moveTo(x + w * k / 4, y + 3); g.lineTo(x + w * k / 4 + 1, y + h - 3); } else { g.moveTo(x + 3, y + h * k / 4); g.lineTo(x + w - 3, y + h * k / 4 + 1); } g.stroke(); } };
  // linen stretched between rollers
  g.fillStyle = '#f3ead6'; g.fillRect(G.pad * 0.55, G.bar * 0.55, G.S - G.pad * 1.1, G.Hh - G.bar * 1.1);
  // lacing to the side stretchers
  g.strokeStyle = '#a58a5e'; g.lineWidth = 1.1;
  for (let k = 0; k < 9; k++) { const y = G.gy + (k + 0.5) * G.grid / 9; for (const side of [0, 1]) { const x0 = side ? G.S - G.pad * 0.55 : G.pad * 0.55, x1 = side ? G.S - G.pad * 0.24 : G.pad * 0.24; g.beginPath(); g.moveTo(x0, y - 5); g.lineTo(x1, y); g.lineTo(x0, y + 5); g.stroke(); } }
  wood(G.pad * 0.06, G.bar * 0.3, G.pad * 0.2, G.Hh - G.bar * 0.6, true); wood(G.S - G.pad * 0.26, G.bar * 0.3, G.pad * 0.2, G.Hh - G.bar * 0.6, true);
  wood(0, 0, G.S, G.bar, false); wood(0, G.Hh - G.bar, G.S, G.bar, false);
  g.fillStyle = 'rgba(60,32,12,.72)'; g.font = `${Math.round(G.bar * 0.5)}px "Special Elite", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('THE SCRAP · 12 × 12', G.S / 2, G.bar * 0.55); g.fillText('PAINT, THEN SEW', G.S / 2, G.Hh - G.bar * 0.45);
  for (const [x, y] of [[G.pad * 0.16, G.bar / 2], [G.S - G.pad * 0.16, G.bar / 2], [G.pad * 0.16, G.Hh - G.bar / 2], [G.S - G.pad * 0.16, G.Hh - G.bar / 2]]) { g.fillStyle = '#e2b860'; g.beginPath(); g.arc(x, y, G.bar * 0.22, 0, 7); g.fill(); g.strokeStyle = '#7a5214'; g.stroke(); }
  // the scrap
  const c = G.cell;
  g.save(); g.translate(G.gx, G.gy);
  const csDev = c * d;
  for (let i = 0; i < SAMPLE * SAMPLE; i++) {
    const x = i % SAMPLE, y = (i / SAMPLE) | 0;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.translate(d * (G.gx + x * c), d * (G.gy + y * c)); g.fillStyle = fabricPattern(g, App.sample[i], csDev * 0.5);
    g.fillRect(0, 0, Math.ceil(csDev), Math.ceil(csDev)); g.restore();
  }
  g.strokeStyle = 'rgba(43,38,32,.28)'; g.lineWidth = 1;
  for (let k = 0; k <= SAMPLE; k++) { g.beginPath(); g.moveTo(k * c, 0); g.lineTo(k * c, G.grid); g.moveTo(0, k * c); g.lineTo(G.grid, k * c); g.stroke(); }
  g.strokeStyle = 'rgba(43,38,32,.6)'; g.lineWidth = 1.5; g.strokeRect(0, 0, G.grid, G.grid);
  const mark = (p, col, dash) => { g.strokeStyle = col; g.lineWidth = 2.5; g.setLineDash(dash); g.strokeRect(p.x * c + 2, p.y * c + 2, c - 4, c - 4); g.setLineDash([]); };
  if (Slate.hover && !Slate.painting) mark(Slate.hover, 'rgba(255,255,255,.85)', [4, 3]);
  if (Slate.focused) mark(Slate.cursor, MUSTARD, [5, 3]);
  g.restore();
}
function slateCell(e) { const r = Slate.cv.getBoundingClientRect(), G = Slate.geo; const x = Math.floor((e.clientX - r.left - G.gx) / G.cell), y = Math.floor((e.clientY - r.top - G.gy) / G.cell); return x >= 0 && y >= 0 && x < SAMPLE && y < SAMPLE ? { x, y } : null; }
function paintCell(x, y, t) {
  const i = y * SAMPLE + x; if (App.sample[i] === t) return false;
  App.sample[i] = t; App.sampleSrc = { kind: 'painted' }; markDirty('Your scrap has changed. Sew the chart to see what grows from it.'); sound.paint(); return true;
}
function paintLine(a, b, t) { const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) || 1; let ch = false; for (let k = 0; k <= n; k++) ch = paintCell(Math.round(lerp(a.x, b.x, k / n)), Math.round(lerp(a.y, b.y, k / n)), t) || ch; return ch; }
function pushUndo() { Slate.undo.push(App.sample.slice()); if (Slate.undo.length > 40) Slate.undo.shift(); }
function undo() { const s = Slate.undo.pop(); if (!s) { toast('Nothing left to unpick'); return; } App.sample = s; App.sampleSrc = { kind: 'painted' }; markDirty('Unpicked the last stroke.'); drawSlate(); syncPresetsUI(); }
Slate.cv.addEventListener('contextmenu', e => { e.preventDefault(); const c = slateCell(e); if (c) selectFabric(App.sample[c.y * SAMPLE + c.x]); });
Slate.cv.addEventListener('pointerdown', e => {
  if (e.button === 2) return; const c = slateCell(e); if (!c) return;
  e.preventDefault(); Slate.cv.setPointerCapture(e.pointerId); Slate.painting = true; pushUndo(); Slate.last = c; paintCell(c.x, c.y, App.fabric); Slate.cursor = c; drawSlate(); syncPresetsUI();
});
Slate.cv.addEventListener('pointermove', e => {
  const c = slateCell(e);
  if (Slate.painting && c) { if (paintLine(Slate.last, c, App.fabric)) drawSlate(); Slate.last = c; return; }
  const h = Slate.hover; Slate.hover = c; if ((h && c && (h.x !== c.x || h.y !== c.y)) || (!h) !== (!c)) drawSlate();
});
const endPaint = () => { if (Slate.painting) { Slate.painting = false; drawSlate(); } };
Slate.cv.addEventListener('pointerup', endPaint); Slate.cv.addEventListener('pointercancel', endPaint);
Slate.cv.addEventListener('pointerleave', () => { Slate.hover = null; if (!Slate.painting) drawSlate(); });
Slate.cv.addEventListener('focus', () => { Slate.focused = true; drawSlate(); });
Slate.cv.addEventListener('blur', () => { Slate.focused = false; drawSlate(); });
Slate.cv.addEventListener('keydown', e => {
  const c = Slate.cursor, mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (mv) { e.preventDefault(); c.x = clamp(c.x + mv[0], 0, SAMPLE - 1); c.y = clamp(c.y + mv[1], 0, SAMPLE - 1); drawSlate(); announce(`Row ${c.y + 1}, column ${c.x + 1}: ${TER[App.sample[c.y * SAMPLE + c.x]].name}`); }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pushUndo(); if (paintCell(c.x, c.y, App.fabric)) { drawSlate(); syncPresetsUI(); announce(`Sewed ${TER[App.fabric].name} at row ${c.y + 1}, column ${c.x + 1}`); } }
});

function buildFabrics() {
  const box = $('fabrics'); box.innerHTML = '';
  TER.forEach((t, k) => {
    const b = document.createElement('button'); b.className = 'swatch'; b.setAttribute('aria-label', `${t.name}: ${t.cloth} (key ${k + 1})`); b.title = `${t.name} · ${t.cloth} (${k + 1})`;
    const cv = canvas(64, 64); const g = cv.getContext('2d'); g.fillStyle = fabricPattern(g, k, 32); g.fillRect(0, 0, 64, 64);
    b.appendChild(cv); const s = document.createElement('span'); s.className = 'k'; s.textContent = k + 1; b.appendChild(s);
    b.addEventListener('click', () => selectFabric(k)); box.appendChild(b);
  });
  selectFabric(App.fabric, true);
}
function selectFabric(k, quiet) {
  App.fabric = k; [...$('fabrics').children].forEach((b, i) => b.setAttribute('aria-pressed', i === k ? 'true' : 'false'));
  $('fabricName').textContent = `Needle threaded with ${TER[k].cloth.toLowerCase()}: ${TER[k].name.toLowerCase()}`;
  if (!quiet) sound.click();
}
function miniSample(s, size) { const cv = canvas(size, size), g = cv.getContext('2d'), c = size / SAMPLE; for (let i = 0; i < 144; i++) { g.fillStyle = FAB[s[i]].base; g.fillRect((i % SAMPLE) * c, ((i / SAMPLE) | 0) * c, Math.ceil(c), Math.ceil(c)); } return cv; }
function buildPresets() {
  const box = $('presets'); box.innerHTML = '';
  for (const key of PRESET_KEYS) {
    const p = PRESETS[key], b = document.createElement('button'); b.className = 'preset'; b.dataset.key = key;
    b.appendChild(miniSample(presetSample(key), 92));
    const t = document.createElement('div'); t.innerHTML = `<b>${p.name}</b>`; b.appendChild(t); b.title = p.blurb; b.setAttribute('aria-label', `${p.name}: ${p.blurb}`);
    b.addEventListener('click', () => { pushUndo(); App.sample = presetSample(key); App.sampleSrc = { kind: 'preset', key }; App.N = p.n; App.sym = p.sym; syncOptionsUI(); drawSlate(); syncPresetsUI(); sound.click(); startSew(); note(p.blurb + ' Sewing…'); });
    box.appendChild(b);
  }
  const cb = $('coasts'); cb.innerHTML = '';
  for (const [key, c] of Object.entries(COASTS)) {
    const b = document.createElement('button'); b.className = 'preset'; b.dataset.key = key;
    b.innerHTML = `<div><b>${c.name}</b><span>${c.blurb}</span></div>`;
    b.addEventListener('click', () => { App.coast = key; syncPresetsUI(); sound.click(); startSew(); });
    cb.appendChild(b);
  }
}
function syncPresetsUI() {
  [...$('presets').children].forEach(b => b.setAttribute('aria-pressed', App.sampleSrc.kind === 'preset' && App.sampleSrc.key === b.dataset.key ? 'true' : 'false'));
  [...$('coasts').children].forEach(b => b.setAttribute('aria-pressed', App.coast === b.dataset.key ? 'true' : 'false'));
}
function drawPieces() {
  const cv = $('pieces'), d = dprCap(), w = Math.min(cv.parentElement.clientWidth, 420), cols = 4, size = Math.floor(w / cols * 0.62), cellW = w / cols, rowH = size + 26;
  const rows = Math.ceil(PIECES.length / cols), h = rows * rowH;
  cv.width = w * d; cv.height = h * d; cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  g.font = '12px "Special Elite", monospace'; g.textAlign = 'center'; g.fillStyle = INK;
  PIECES.forEach((p, k) => {
    const cx = (k % cols) * cellW + cellW / 2, y = Math.floor(k / cols) * rowH + 2;
    drawPiece(g, p.q, cx - size / 2, y, size); g.fillStyle = INK; g.fillText(p.label, cx, y + size + 15);
  });
}
function syncOptionsUI() {
  const pressed = (seg, v) => [...$(seg).children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  pressed('segN', App.N); pressed('segSym', App.sym); pressed('segWrap', App.wrap ? 1 : 0);
  $('mPatch').setAttribute('aria-pressed', String(App.model === 'patch')); $('mAdm').setAttribute('aria-pressed', String(App.model === 'adm'));
  $('patchPanel').hidden = App.model !== 'patch'; $('admPanel').hidden = App.model !== 'adm'; $('workroom').classList.toggle('adm', App.model === 'adm');
  if (App.model === 'adm') drawPieces();
}
function bindSeg(id, fn) { $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; fn(b.dataset.v); syncOptionsUI(); sound.click(); }); }
bindSeg('segN', v => { App.N = +v; markDirty('Piece size changed. Sew the chart to try it.'); });
bindSeg('segSym', v => { App.sym = +v; markDirty(+v === 1 ? 'No turns or mirrors: the chart keeps your scrap\'s directions.' : `Every piece may also appear in ${v} orientations. Sew to see.`); });
const wrapFn = v => { App.wrap = v === '1'; markDirty(App.wrap ? 'Wrap on: the chart\'s east edge will sew onto its west, and north onto south.' : 'Wrap off: the chart has proper edges.'); };
bindSeg('segWrap', wrapFn);
$('mPatch').addEventListener('click', () => { if (App.model === 'patch') return; App.model = 'patch'; syncOptionsUI(); layoutWorkroom(); sound.click(); startSew(); });
$('mAdm').addEventListener('click', () => { if (App.model === 'adm') return; App.model = 'adm'; syncOptionsUI(); syncPresetsUI(); layoutWorkroom(); sound.click(); startSew(); });
$('btnUndo').addEventListener('click', undo);
$('btnClear').addEventListener('click', () => { pushUndo(); App.sample = new Uint8Array(144); App.sampleSrc = { kind: 'painted' }; drawSlate(); syncPresetsUI(); markDirty('A clean scrap of indigo. Paint some land, and a harbour where it meets the water.'); });
$('btnScatter').addEventListener('click', () => {
  pushUndo(); App.scatters = (App.scatters || 0) + 1; const n = seedNum(App.seed, 'scatter', App.scatters); App.sample = scatterSample(n); App.sampleSrc = { kind: 'scatter', seed: n }; App.N = 3; App.sym = 2;
  syncOptionsUI(); drawSlate(); syncPresetsUI(); sound.click(); startSew();
});

function markDirty(msg) { App.dirty = true; if (!(App.sewing && App.sewing.busy)) note(msg); }
function note(t) { $('wrNote').textContent = t; }
function updateTally() {
  const s = App.sewing, l = App.loom;
  $('tStitch').textContent = l && l.model ? (s && s.busy ? `${l.decided} / ${l.n}` : `${l.n} / ${l.n}`) : '–';
  $('tKnot').textContent = s ? s.knots : 0; $('tKnotW').classList.toggle('hot', !!(s && s.knots));
  $('tRetry').textContent = s ? s.retries : 0; $('tT').textContent = l ? (l.T || '–') : '–'; $('tSeed').textContent = App.sewSeed;
  $('wrSub').textContent = `${sampleLabel()} · chart No. ${App.sewSeed}`;
}
function setSewingButtons(busy) {
  $('btnSew').textContent = busy ? 'Skip ahead' : 'Sew the chart';
  $('btnAgain').disabled = busy; $('btnExport').disabled = busy || !App.chartTerr; $('btnSail').disabled = busy || !App.chart;
}
function chartMessage(html) { const m = $('chartMsg'); if (!html) { m.hidden = true; m.innerHTML = ''; return; } m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; }

function startSew() {
  if (!WFC) return;
  if (App.loom) App.loom.free();
  App.sewing = null; App.chart = null; App.chartTerr = null; chartMessage(null);
  const spec = App.model === 'patch' ? { kind: 'patch', sample: App.sample, N: App.N, sym: App.sym, wrap: App.wrap, cap: deviceCap, W, H } : { kind: 'adm', coast: App.coast, wrap: App.wrap, W, H };
  const loom = new Loom(WFC, spec); App.loom = loom; App.dirty = false;
  App.chartStyle = App.model; preview.reset(App.model);
  syncURL();
  if (loom.error) {
    App.state = 'workroom'; setSewingButtons(false); updateTally();
    if (loom.error.code === 'too-many') chartMessage(`<p class="kicker">Too many pieces</p><h4>The loom is full</h4><p>This scrap cuts into ${loom.error.T} different ${loom.error.N}×${loom.error.N} pieces once turned and mirrored, and the loom holds ${loom.error.cap}.</p><p>Try fewer turns &amp; mirrors, 2×2 pieces, or broader areas of one fabric.</p>`);
    else chartMessage(`<p class="kicker">A tangle</p><h4>The loom would not take this scrap</h4><p>${loom.error.detail}</p>`);
    note('Nothing sewn yet.'); announce('The loom could not take this scrap.'); return;
  }
  const st = sampleStats(App.sample);
  App.sewing = new Sewing(loom, App.sewSeed, { liveSeconds: calm() ? 3 : 4.6, replaySeconds: calm() ? 1.6 : 2.4, maxAttempts: 14, judge: true, retryFew: App.model === 'adm' || st.shoreHarbour > 0 });
  App.state = 'sewing'; preview.live = true; setSewingButtons(true); updateTally();
  note(App.model === 'patch' ? `Threading ${loom.T} pieces cut from the scrap. Each square settles when only one fabric still fits.` : `Threading ${loom.T} turned and mirrored pattern pieces.`);
  sound.snip();
}
function reasonText(r, n) {
  return r === 'landlocked' ? 'A harbour came out landlocked, up a creek no boat could reach.'
    : r === 'huddled' ? 'Every harbour huddled in one bay: not much of a voyage.'
      : `Only ${n || 'a couple of'} harbour${n === 1 ? '' : 's'} on open water.`;
}
function sewEvent(e, s) {
  const now = performance.now();
  if (e.type === 'knot') { preview.unpick(e, now); sound.knot(); note(`Knot at ${e.x}, ${e.y}: no piece fits there any more. Unpicking and re-threading…`); }
  else if (e.type === 'reject') { preview.unpick(null, now); sound.snip(); note(reasonText(e.reason, e.n) + ' Unpicking and sewing again…'); }
  else if (e.type === 'fastknot' || e.type === 'fastreject') note(`Re-threading at speed: try ${e.attempt + 1} of ${s.o.maxAttempts}${e.type === 'fastknot' ? ' knotted' : ' sewn, but ' + reasonText(e.reason).toLowerCase().replace(/\.$/, '')}…`);
  else if (e.type === 'replay') { preview.reset(App.chartStyle); preview.live = true; note(s.best && s.attempt >= s.o.maxAttempts - 1 && !s.replayAny ? `No perfect run in ${s.o.maxAttempts} tries; sewing the best of them (try ${e.attempt + 1}).` : `Try ${e.attempt + 1} sews clean. Here it comes.`); }
  else if (e.type === 'done') sewDone(s, now);
  else if (e.type === 'failed') sewFailed(s, now);
}
function sewDone(s, now) {
  const j = s.result.judge, chart = j && j.chart;
  App.chartTerr = s.result.terr; App.chart = chart && j.an.reachable.length >= 3 ? chart : null;
  App.chartMeta = { sewSeed: App.sewSeed, attempt: s.attempt, knots: s.knots, retries: s.retries, label: sampleLabel(), model: App.model, N: App.N, sym: App.sym, wrap: App.wrap, coast: App.coast };
  preview.setFinal(App.chartTerr, App.chart, now); App.state = 'workroom'; setSewingButtons(false); updateTally(); sound.done();
  const how = s.retries ? `Sewn after ${s.retries} retr${s.retries > 1 ? 'ies' : 'y'} (${s.knots} knot${s.knots === 1 ? '' : 's'}${s.reasons.length ? ', ' + s.reasons.length + ' chart' + (s.reasons.length > 1 ? 's' : '') + ' turned away' : ''}).` : 'Sewn on the first try.';
  if (App.chart) {
    const c = App.chart, extra = [c.struck ? `${c.struck} smaller mooring${c.struck > 1 ? 's' : ''} unpicked to beach` : '', c.landlocked ? `${c.landlocked} landlocked harbour${c.landlocked > 1 ? 's' : ''} struck off` : ''].filter(Boolean).join('; ');
    note(`${how} ${c.ports.length} ports of call, a season of ${c.seasonDays} days and stores for ${c.storesCap}.${extra ? ' ' + extra[0].toUpperCase() + extra.slice(1) + '.' : ''}`);
    announce(`Chart sewn. ${c.ports.length} harbours. Ready to set sail.`);
    $('btnSail').focus({ preventScroll: true });
  } else {
    const st = sampleStats(App.sample);
    const why = App.model === 'patch' && !st.harbours ? 'No harbours: sew at least one madder square where land meets water.'
      : App.model === 'patch' && !st.shoreHarbour ? 'Your harbours sit inland. Move one so it touches the water.'
        : 'Fewer than three harbours came out on open water.';
    note(`${how} A fine chart, but no voyage on it. ${why}`); announce('Chart sewn, but it has no voyage.');
  }
}
function sewFailed(s, now) {
  App.state = 'workroom'; sound.knot();
  if (s.result.terr) { App.chartTerr = s.result.terr; preview.setFinal(s.result.terr, null, now); }
  setSewingButtons(false); updateTally();
  const allKnots = s.knots >= s.o.maxAttempts;
  chartMessage(`<p class="kicker">The loom gave up</p><h4>${s.o.maxAttempts} tries, no voyage</h4><p>${allKnots ? 'Every try ended in a knot, a place where no piece fits. Scraps with many rare pieces knot easily.' : 'The charts it did sew had too few harbours on open water.'}</p><p>Try 2×2 pieces, fewer turns &amp; mirrors, more harbours on the shore, or one of the ready scraps.</p>`);
  note(`${s.knots} knot${s.knots === 1 ? '' : 's'} in ${s.o.maxAttempts} tries. Change the scrap, or pick a ready one below.`); announce('The loom gave up on this scrap.');
}
function workroomTick() {
  const s = App.sewing; if (!s || !s.busy) return;
  s.tick();
  preview.add(s.cells, s.loom.terr, performance.now()); s.cells.length = 0;
  for (const e of s.events.splice(0)) sewEvent(e, s);
}
function skipAhead() {
  const s = App.sewing; if (!s || !s.busy) return;
  s.finishNow(); preview.reset(App.chartStyle); preview.live = false;
  for (const e of s.events.splice(0)) if (e.type === 'done' || e.type === 'failed') sewEvent(e, s);
  s.cells.length = 0;
}
$('btnSew').addEventListener('click', () => { if (App.sewing && App.sewing.busy) skipAhead(); else startSew(); });
$('btnAgain').addEventListener('click', () => { App.sewSeed = seedNum(App.sewSeed, 'again'); startSew(); });
$('btnSail').addEventListener('click', () => startVoyage());
$('btnExport').addEventListener('click', () => exportPNG(false));
$('btnLink').addEventListener('click', copyLink);
$('wrBack').addEventListener('click', () => goTitle());
$('wrHow').addEventListener('click', () => openModal('howModal', $('howClose')));
$('wrMute').addEventListener('click', toggleMute);

function layoutWorkroom() {
  if ($('workroom').hidden) return;
  if (App.model === 'patch') slateFit(); else drawPieces();
  const box = $('chartBox'), wide = innerWidth > 1080;
  preview.fit(box.clientWidth, wide ? innerHeight - 250 : null);
}
function goWorkroom() {
  closeAllModals();
  if (Attract.loom) { Attract.loom.free(); Attract.loom = null; Attract.sewing = null; } // one loom in memory at a time
  $('title').hidden = true; $('workroom').hidden = false; $('sea').hidden = true; $('hud').hidden = true;
  sound.ambience(false);
  App.state = App.sewing && App.sewing.busy ? 'sewing' : 'workroom';
  syncOptionsUI(); syncPresetsUI(); layoutWorkroom(); updateTally(); setSewingButtons(App.state === 'sewing');
  if (!App.loom && WFC) startSew();
  preview.dirty = true;
  $('wrTitle').focus && setTimeout(() => (App.state === 'sewing' ? $('btnSew') : $('btnSail').disabled ? $('btnSew') : $('btnSail')).focus({ preventScroll: true }), 30);
}
function goTitle() {
  closeAllModals();
  $('workroom').hidden = true; $('sea').hidden = true; $('hud').hidden = true; $('title').hidden = false;
  sound.ambience(false); App.state = 'title'; V = null;
  refreshTitle(); if (!Attract.sewing) attractNext(); layoutTitle(); if (Attract.preview) Attract.preview.dirty = true;
  setTimeout(() => $('btnPlay').focus({ preventScroll: true }), 30);
}
function closeAllModals() { for (const id of ['howModal', 'pauseModal', 'overModal', 'chartModal']) $(id).hidden = true; }

// ---------- export and share ----------
function exportPNG(withVoyage) {
  const terr = withVoyage && V ? V.c.terr : App.chartTerr; if (!terr) return;
  const chart = withVoyage && V ? V.c : App.chart, style = App.chartStyle;
  const cs = 24, M = Math.round(cs * 1.1), c = canvas(W * cs + 2 * M, H * cs + 2 * M), g = c.getContext('2d');
  renderChart(g, terr, W, H, cs, style, { margin: M, shoal: chart && chart.shoal, rose: style === 'adm' });
  if (withVoyage && V) drawTrack(g, V.track, cs, M, M, 1.6);
  if (chart) chart.ports.forEach((p, k) => drawButton(g, M + p.cx * cs, M + p.cy * cs, cs * 0.6, withVoyage && V ? (V.visited[k] ? (k === 0 ? 'home' : 'visited') : 'seen') : (k === 0 ? 'home' : 'seen'), 0));
  if (chart) { g.font = `${Math.round(cs * 0.55)}px "Special Elite", monospace`; g.textAlign = 'center'; chart.ports.forEach(p => portLabel(g, p.name, M + p.cx * cs, M + p.cy * cs, cs * 0.6, cs * 0.55, { w: c.width, h: c.height, m: M, bottom: M })); }
  // woven label in the corner
  const m = App.chartMeta || {}, lines = ['PATCHWORK ISLES', `Chart No. ${m.sewSeed ?? App.sewSeed} · ${m.label || sampleLabel()}`,
    m.model === 'adm' ? 'Admiralty: SimpleTiledModel pieces' : `Patchwork: OverlappingModel ${m.N}×${m.N}, ${m.sym} turn${m.sym > 1 ? 's' : ''}`,
    (m.retries ? `sewn after ${m.retries} retries` : 'sewn first time') + (withVoyage && V ? ` · voyage No. ${V.seed}` : '')];
  g.font = `${Math.round(cs * 0.62)}px "Special Elite", monospace`;
  const lw = Math.max(...lines.map(l => g.measureText(l).width)) + cs * 1.6, lh = cs * 0.9, bh = lines.length * lh + cs * 1.1, bx = M + cs, by = M + H * cs - bh - cs;
  g.fillStyle = 'rgba(30,20,10,.25)'; g.fillRect(bx + 4, by + 5, lw, bh); g.fillStyle = '#f8f0dc'; g.fillRect(bx, by, lw, bh);
  g.strokeStyle = MADDER; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(bx + 5, by + 5, lw - 10, bh - 10); g.setLineDash([]);
  g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; lines.forEach((l, k) => { g.fillStyle = k === 0 ? MADDER : INK; g.fillText(l, bx + cs * 0.8, by + cs * 0.55 + lh * (k + 0.5)); });
  c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `patchwork-isles-${App.sewSeed}${withVoyage ? '-voyage-' + (V ? V.seed : '') : ''}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, 'image/png');
  toast('Chart saved as a PNG');
}
function copyLink() {
  const url = shareURL();
  const done = () => toast('Link copied: it sews this exact chart'), fail = () => { toast('Copy failed. The link is in the address bar.'); syncURL(); };
  try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fail); else fail(); } catch (e) { fail(); }
}
function portLabel(g, text, x, y, r, size, B) {
  const m = B.m, w = g.measureText(text).width + size * 1.2, h = size * 1.6, gap = size * 0.5;
  let cx = x, cy = y + r + gap + h / 2;
  if (cx + w / 2 > B.w - m) { cx = x - r - gap - w / 2; cy = y; }
  else if (cx - w / 2 < m) { cx = x + r + gap + w / 2; cy = y; }
  if (cy + h / 2 > B.h - B.bottom) cy = y - r - gap - h / 2;           // keep clear of the thumb pads
  const a = B.avoid; if (a && cx + w / 2 > a.x0 && cx - w / 2 < a.x1 && cy + h / 2 > a.y0 && cy - h / 2 < a.y1) cy = y - r - gap - h / 2; // and the message card
  cx = clamp(cx, m + w / 2, B.w - m - w / 2); cy = clamp(cy, m + h / 2, Math.max(m + h / 2, B.h - B.bottom - h / 2));
  label(g, text, cx, cy, size);
}
function label(g, text, x, y, size) {
  const w = g.measureText(text).width + size * 1.2, h = size * 1.6;
  g.save(); g.fillStyle = 'rgba(248,240,220,.92)'; g.strokeStyle = 'rgba(43,38,32,.45)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x - w / 2, y - h / 2); g.lineTo(x + w / 2, y - h / 2); g.lineTo(x + w / 2, y + h / 2); g.lineTo(x - w / 2, y + h / 2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + size * 0.05); g.restore();
}
function drawTrack(g, track, s, ox, oy, lw) {
  if (track.length < 2) return;
  g.save(); g.strokeStyle = 'rgba(178,58,43,.9)'; g.lineWidth = Math.max(1, lw); g.setLineDash([s * 0.28, s * 0.2]); g.lineCap = 'round';
  g.beginPath(); g.moveTo(ox + track[0][0] * s, oy + track[0][1] * s); for (const p of track) g.lineTo(ox + p[0] * s, oy + p[1] * s); g.stroke(); g.restore();
}

// ---------- the voyage ----------
const BASE_SPEED = 4.4, OARS = 1.25, TURN = 1.75, BOAT_R = 0.27, FS = 6;
const POLAR = [[0, 0.12], [0.5, 0.16], [0.78, 0.55], [1.05, 0.84], [1.57, 1.0], [2.2, 0.96], [2.7, 0.86], [Math.PI, 0.78]];
function polar(a) { for (let k = 1; k < POLAR.length; k++) if (a <= POLAR[k][0]) { const [a0, v0] = POLAR[k - 1], [a1, v1] = POLAR[k]; return lerp(v0, v1, (a - a0) / (a1 - a0)); } return 0.78; }
function pointOfSail(a) { return a < 0.62 ? 'In irons' : a < 1.15 ? 'Close-hauled' : a < 2.0 ? 'Beam reach' : a < 2.7 ? 'Broad reach' : 'Running'; }
const SAILS = ['Oars out', 'Half sail', 'Full sail'];
function nightness(h) { const d = ((h % 24) + 24) % 24; if (d >= 21 || d < 4) return 1; if (d >= 18) return (d - 18) / 3; if (d < 7) return 1 - (d - 4) / 3; return 0; }
const OFFS = Array.from({ length: 8 }, (_, k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]);

class Voyage {
  constructor(chart, seed) {
    this.c = chart; this.seed = seed; const rnd = mulberry32(hash32('voyage', seed));
    this.winds = []; let dir = rnd() * Math.PI * 2;
    for (let d = 0; d <= chart.seasonDays + 3; d++) { this.winds.push({ dir, str: 0.75 + rnd() * 0.5 }); dir += (rnd() - 0.5) * 1.9; }
    this.hours = 6; this.ticks = 0; this.season = chart.seasonDays; this.cap = chart.storesCap; this.stores = this.cap;
    const home = chart.ports[0]; let best = home.docks[0], bestOpen = -1;
    for (const d of home.docks) { const x = d % W, y = (d / W) | 0; let o = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && chart.sea[Y * W + X]) o++; } if (o > bestOpen) { bestOpen = o; best = d; } }
    const bx = best % W + 0.5, by = ((best / W) | 0) + 0.5;
    this.b = { x: bx, y: by, h: Math.atan2(by - home.cy, bx - home.cx), spd: 0 };
    this.sail = 1; this.sailLvl = 1; this.steer = 0; this.course = null;
    const n = chart.ports.length; this.visited = new Array(n).fill(false); this.visited[0] = true; this.known = new Array(n).fill(false); this.known[0] = true;
    this.revealed = new Uint8Array(W * H); this.revealedCount = 0; this.fogOps = []; this.lastReveal = [-99, -99];
    this.grounded = 0; this.freeze = 0; this.groundings = 0; this.shoalCool = 0; this.bumpCool = 0; this.warned = { shoal: 0, night: false, low: false };
    this.distance = 0; this.track = [[bx, by]]; this.lastPort = 0; this.events = []; this.over = null;
    this.markNearest(0, 2); this.reveal(bx, by, 7.5);
    this.events.push({ type: 'depart' });
  }
  get day() { return Math.floor(this.hours / 24) + 1; }
  wind() {
    const day = this.hours / 24, d = Math.floor(day), f = clamp((day - d) / 0.25, 0, 1), s = f * f * (3 - 2 * f);
    const a = this.winds[clamp(d - 1, 0, this.winds.length - 1)], b = this.winds[clamp(d, 0, this.winds.length - 1)];
    if (d === 0) return { dir: b.dir, str: b.str };
    return { dir: a.dir + wrapA(b.dir - a.dir) * s, str: lerp(a.str, b.str, s) };
  }
  markNearest(from, k) {
    const c = this.c, order = c.ports.map((p, i) => i).filter(i => !this.known[i]).map(i => [i, Math.min(...c.ports[i].docks.map(d => c.dist[from][d]))]).sort((a, b) => a[1] - b[1]);
    const got = []; for (const [i] of order.slice(0, k)) { this.known[i] = true; got.push(i); } return got;
  }
  reveal(x, y, R) {
    const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(W - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(H - 1, Math.ceil(y + R));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const i = cy * W + cx; if (!this.revealed[i] && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) <= R) { this.revealed[i] = 1; this.revealedCount++; } }
    this.fogOps.push([x, y, R]); this.lastReveal = [x, y];
  }
  blocked(x, y) {
    const t = this.c.terr;
    for (const [dx, dy] of OFFS) { const X = x + dx * BOAT_R, Y = y + dy * BOAT_R; if (X < 0 || Y < 0 || X >= W || Y >= H) return true; if (t[(Y | 0) * W + (X | 0)] >= 2) return true; }
    return false;
  }
  end(win, reason) { if (this.over) return; this.over = { win, reason, at: this.ticks }; this.events.push({ type: win ? 'win' : 'lose', reason }); }
  step(inp) {
    if (this.over) return;
    this.ticks++;
    if (this.freeze > 0) { this.freeze--; return; }
    const prevDay = this.day, wasNight = nightness(this.hours) > 0.6;
    this.hours += DT * HOURS_PER_SEC; this.stores -= DT * HOURS_PER_SEC / 24;
    if (this.day !== prevDay && this.day <= this.season) this.events.push({ type: 'day', day: this.day });
    if (!wasNight && nightness(this.hours) > 0.6 && !this.warned.night) { this.warned.night = true; this.events.push({ type: 'night' }); }
    if (this.stores < 1 && !this.warned.low) { this.warned.low = true; this.events.push({ type: 'low' }); }
    if (this.stores >= 1.5) this.warned.low = false;
    if (this.hours >= this.season * 24) return this.end(false, 'season');
    if (this.stores <= 0) { this.stores = 0; return this.end(false, 'stores'); }
    if (inp.sail !== undefined && inp.sail !== null) this.sail = clamp(inp.sail | 0, 0, 2);
    this.sailLvl += clamp(this.sail - this.sailLvl, -DT * 2.5, DT * 2.5);
    if (this.shoalCool > 0) this.shoalCool -= DT; if (this.bumpCool > 0) this.bumpCool -= DT;
    const b = this.b, w = this.wind();
    if (this.grounded > 0) { this.grounded -= DT; b.spd = 0; if (this.grounded <= 0) this.events.push({ type: 'afloat' }); return; }
    if (inp.course !== undefined) { this.course = inp.course ? { x: inp.course[0], y: inp.course[1] } : null; inp.course = undefined; }
    const steer = inp.steer || 0;
    if (steer) { this.course = null; b.h = wrapA(b.h + steer * TURN * DT); }
    else if (this.course) {
      const dx = this.course.x - b.x, dy = this.course.y - b.y;
      if (Math.hypot(dx, dy) < 0.6) { this.course = null; this.events.push({ type: 'arrive' }); }
      else { const diff = wrapA(Math.atan2(dy, dx) - b.h); b.h = wrapA(b.h + clamp(diff, -TURN * DT, TURN * DT)); }
    }
    const ci = (b.y | 0) * W + (b.x | 0), shallow = this.c.terr[ci] === 1;
    const off = Math.abs(wrapA(b.h - w.dir)), sl = this.sailLvl, sailF = sl <= 1 ? sl * 0.62 : 0.62 + (sl - 1) * 0.38;
    let target = BASE_SPEED * w.str * polar(off) * sailF;
    target = Math.max(target, OARS * (1 - Math.min(1, sl)));
    if (shallow) target *= 0.72;
    b.spd += (target - b.spd) * (1 - Math.exp(-DT * 1.3));
    const nx = b.x + Math.cos(b.h) * b.spd * DT, ny = b.y + Math.sin(b.h) * b.spd * DT;
    if (!this.blocked(nx, ny)) { this.distance += Math.hypot(nx - b.x, ny - b.y); b.x = nx; b.y = ny; }
    else if (b.spd > 2.6) {
      const t = this.c.terr[clamp(ny | 0, 0, H - 1) * W + clamp(nx | 0, 0, W - 1)];
      this.grounded = 2.0; this.freeze = 7; this.groundings++; this.stores = Math.max(0.05, this.stores - 0.25); b.spd = 0; this.course = null;
      this.events.push({ type: 'aground', what: t === 5 ? 'rock' : t === 4 ? 'a wooded shore' : t === 6 ? 'a quay wall' : 'a sandbank' });
      return;
    } else { // slide along the shore, keeping whatever part of the motion is free
      const vx = nx - b.x, vy = ny - b.y, full = Math.hypot(vx, vy) || 1; let moved = 0;
      if (!this.blocked(nx, b.y)) { b.x = nx; moved += Math.abs(vx); }
      if (!this.blocked(b.x, ny)) { b.y = ny; moved += Math.abs(vy); }
      this.distance += moved * 0.8;
      b.spd *= 0.86 + 0.12 * Math.min(1, moved / full);
      if (this.bumpCool <= 0 && moved / full < 0.5) { this.bumpCool = 0.8; this.events.push({ type: 'bump' }); }
    }
    const cj = (b.y | 0) * W + (b.x | 0);
    if (this.c.shoal[cj] && sl > 1.5 && b.spd > 2.0 && this.shoalCool <= 0) {
      this.grounded = 1.8; this.freeze = 7; this.groundings++; this.shoalCool = 4; b.spd = 0; this.course = null;
      this.events.push({ type: 'shoal' }); return;
    }
    if (sl > 1.5 && this.ticks - this.warned.shoal > 1200) {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = (b.x | 0) + dx, Y = (b.y | 0) + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && this.c.shoal[Y * W + X] && this.revealed[Y * W + X]) { this.warned.shoal = this.ticks; this.events.push({ type: 'shoalwarn' }); dy = 9; break; } }
    }
    const R = lerp(5.6, 3.3, nightness(this.hours));
    if (Math.hypot(b.x - this.lastReveal[0], b.y - this.lastReveal[1]) > 0.3) this.reveal(b.x, b.y, R);
    const lt = this.track[this.track.length - 1]; if (Math.hypot(b.x - lt[0], b.y - lt[1]) > 0.5) this.track.push([+b.x.toFixed(2), +b.y.toFixed(2)]);
    // harbours
    if (this.lastPort >= 0) { const p = this.c.ports[this.lastPort]; if (Math.hypot(p.cx - b.x, p.cy - b.y) > 3.2) this.lastPort = -1; }
    this.c.ports.forEach((p, k) => {
      if (k === this.lastPort) return;
      let near = 9; for (const cell of p.cells) { const cx = cell % W, cy = (cell / W) | 0, dx = Math.max(cx - b.x, 0, b.x - cx - 1), dy = Math.max(cy - b.y, 0, b.y - cy - 1); near = Math.min(near, Math.hypot(dx, dy)); }
      if (near < 0.75) this.arrive(k);
    });
  }
  arrive(k) {
    this.lastPort = k; const first = !this.visited[k]; this.stores = this.cap;
    if (!first) { this.events.push({ type: 'restock', port: k }); return; }
    this.visited[k] = true; this.known[k] = true; const p = this.c.ports[k];
    this.reveal(p.cx, p.cy, 11); const news = this.markNearest(k, 2);
    this.events.push({ type: 'port', port: k, news });
    if (this.visited.every(Boolean)) this.end(true, 'all');
  }
  get visitedCount() { return this.visited.filter(Boolean).length; }
  get revealedPct() { return 100 * this.revealedCount / (W * H); }
  score() {
    const ports = this.visitedCount - 1, pct = this.revealedPct;
    const spare = this.over && this.over.win ? Math.max(0, Math.floor(this.season - this.hours / 24)) : 0;
    return { ports: ports * 120, chart: Math.round(pct * 3), spare: spare * 40, bonus: this.over && this.over.win ? 250 : 0, daysSpare: spare,
      get total() { return this.ports + this.chart + this.spare + this.bonus; } };
  }
}

let V = null, artCache = { key: '', art: null, cs: 0, M: 0 }, fog = null, fogCtx = null, layer = null, nightLayer = null;
const Input = { steer: 0, sail: null, course: undefined };
const keys = { left: false, right: false };
const cam = { x: 0, y: 0, vx: 0 }, fx = { ripples: [], puffs: [], threads: [], rnd: mulberry32(1) };
let tickerTimer = 0, hudNext = 0;
function chartKey() { const m = App.chartMeta || {}; return [m.model, m.label, m.N, m.sym, m.wrap ? 1 : 0, m.sewSeed, terrHash(App.chart.terr)].join('|'); }
function buildArt() {
  const key = chartKey() + '|' + (innerWidth < 700 ? 30 : 40);
  if (artCache.key === key) return;
  const cs = innerWidth < 700 ? 30 : 40, M = Math.round(cs * 0.8), c = canvas(W * cs + 2 * M, H * cs + 2 * M);
  renderChart(c.getContext('2d'), App.chart.terr, W, H, cs, App.chartStyle, { margin: M, shoal: App.chart.shoal, rose: App.chartStyle === 'adm' });
  artCache = { key, art: c, cs, M };
}
function startVoyage() {
  if (!App.chart) return;
  closeAllModals();
  sound.unlock(); buildArt();
  V = new Voyage(App.chart, App.voyageSeed);
  fog = canvas(W * FS, H * FS); fogCtx = fog.getContext('2d'); fogCtx.fillStyle = '#000'; fogCtx.fillRect(0, 0, fog.width, fog.height);
  Input.steer = 0; Input.sail = null; Input.course = undefined; keys.left = keys.right = false;
  fx.ripples.length = 0; fx.puffs.length = 0; fx.threads.length = 0; fx.rnd = mulberry32(hash32('fx', App.voyageSeed));
  cam.x = V.b.x; cam.y = V.b.y;
  $('title').hidden = true; $('workroom').hidden = true; $('sea').hidden = false; $('hud').hidden = false;
  App.state = 'playing'; buildHudStatic(); resizeSea(); sound.ambience(true);
  drainVoyage(); syncURL(); last = performance.now(); acc = 0;
  $('sea').focus && $('sea').setAttribute('tabindex', '-1');
}
function applyFog() {
  if (!V || !V.fogOps.length) return;
  fogCtx.save(); fogCtx.globalCompositeOperation = 'destination-out';
  for (const [x, y, R] of V.fogOps.splice(0)) {
    const g = fogCtx.createRadialGradient(x * FS, y * FS, Math.max(0, R - 1.8) * FS, x * FS, y * FS, R * FS);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fogCtx.fillStyle = g; fogCtx.beginPath(); fogCtx.arc(x * FS, y * FS, R * FS, 0, 7); fogCtx.fill();
  }
  fogCtx.restore();
}
function ticker(t, ms = 4200) { const el = $('ticker'); el.textContent = t; el.classList.remove('off'); clearTimeout(tickerTimer); tickerTimer = setTimeout(() => el.classList.add('off'), ms); }
function drainVoyage() {
  if (!V) return;
  for (const e of V.events.splice(0)) {
    const c = V.c, pn = k => c.ports[k].name;
    switch (e.type) {
      case 'depart': ticker(`Cast off from ${pn(0)}. ${c.ports.length - 1} harbours to call at before day ${V.season} ends.${document.body.classList.contains('touchmode') ? ' Tap the sea to set a course.' : ''}`, 6500); announce(`Voyage begins. Visit ${c.ports.length - 1} harbours in ${V.season} days.`); break;
      case 'day': sound.dayBell(); if (V.season - e.day <= 1) ticker(e.day === V.season ? `Last day of the season.` : 'One day of the season left.'); announce(`Day ${e.day} of ${V.season}. Stores for ${V.stores.toFixed(1)} days.`); break;
      case 'night': ticker('Dusk. The fog closes in and your lantern shows little.'); break;
      case 'low': ticker('Stores low: less than a day left. Make for a harbour.'); announce('Stores low.'); break;
      case 'port': {
        sound.harbour(); const left = c.ports.length - V.visitedCount;
        const news = e.news.length ? ` The harbourmaster pencils in ${e.news.map(pn).join(' and ')}.` : '';
        ticker(`Moored at ${pn(e.port)}. Hold filled.${left ? ` ${left} to go.` : ''}${news}`, 5500); announce(`Moored at ${pn(e.port)}. ${left} harbours to go.`);
        if (!calm()) fx.ripples.push({ x: c.ports[e.port].cx, y: c.ports[e.port].cy, t0: performance.now() });
        break;
      }
      case 'restock': sound.bell(740, 0.08); ticker(`${pn(e.port)}: hold filled again.`); break;
      case 'aground': sound.thunk(); ticker(`Run aground on ${e.what}! Four hours lost getting her off.`); announce('Run aground.'); if (!calm()) for (let k = 0; k < 14; k++) fx.puffs.push({ x: V.b.x, y: V.b.y, a: fx.rnd() * 6.28, v: 0.6 + fx.rnd(), t0: performance.now() }); break;
      case 'shoal': sound.thunk(); ticker('Scraped onto a shoal under full sail. Shoals by rocks want half sail.'); announce('Grounded on a shoal.'); break;
      case 'shoalwarn': ticker('Shoals ahead (red crosses). Drop to half sail to slip over them.'); break;
      case 'bump': sound.bump(); break;
      case 'afloat': ticker('Afloat again.', 1800); break;
      case 'win': case 'lose': endVoyage(e); break;
    }
  }
}
let overTimer = 0;
function endVoyage(e) {
  sound.ambience(false); if (e.type === 'win') sound.win(); else sound.lose();
  ticker(e.type === 'win' ? 'Every harbour visited. Fair winds home.' : e.reason === 'season' ? 'The season turns: autumn gales close the sea.' : 'The hold is empty: the crew will sail no further.', 6000);
  clearTimeout(overTimer); overTimer = setTimeout(showOver, IN_FRAME ? 0 : 1300);
}
function bestKey() { return 'best:' + hash32(chartKey(), V ? V.seed : 0).toString(36); }
let overInfo = null;
function showOver() {
  if (!V || !V.over) return;
  App.state = 'over';
  const sc = V.score(), total = sc.total, best = +store.get('best', 0) || 0, bestChart = +store.get(bestKey(), 0) || 0;
  const newBest = total > best, newChartBest = total > bestChart;
  if (newBest) store.set('best', total); if (newChartBest) store.set(bestKey(), total);
  const win = V.over.win;
  const head = win ? ['FAIR WINDS'] : V.over.reason === 'season' ? ['STORMBOUND'] : ['EMPTY HOLD'];
  const line = win ? `Every harbour on chart No. ${App.chartMeta.sewSeed} visited with ${sc.daysSpare} day${sc.daysSpare === 1 ? '' : 's'} to spare.`
    : V.over.reason === 'season' ? `The season turned with ${V.c.ports.length - V.visitedCount} harbour${V.c.ports.length - V.visitedCount === 1 ? '' : 's'} unvisited. The gales won't wait.` : 'You ran out of biscuits between harbours. Plan your legs by the stores, not the stars.';
  overInfo = { head, total };
  $('overTitle').textContent = win ? 'Fair winds' : V.over.reason === 'season' ? 'Stormbound' : 'Empty hold';
  $('overLine').textContent = line; $('overScore').textContent = total.toLocaleString('en-GB');
  $('overBest').textContent = newBest ? 'A new best voyage!' : newChartBest ? `Best on this chart. Best ever: ${best.toLocaleString('en-GB')}` : `Best on this chart: ${Math.max(bestChart, total).toLocaleString('en-GB')} · best ever: ${Math.max(best, total).toLocaleString('en-GB')}`;
  const rows = [['Harbours', `${V.visitedCount} of ${V.c.ports.length}`, sc.ports], ['Chart revealed', `${Math.round(V.revealedPct)}%`, sc.chart], ['Days to spare', win ? sc.daysSpare : '–', sc.spare], ['Homecoming', win ? 'yes' : 'no', sc.bonus],
    ['Days sailed', (V.hours / 24 - 0.25).toFixed(1), ''], ['Leagues logged', (V.distance / 3).toFixed(1), ''], ['Groundings', V.groundings, '']];
  $('overStats').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}${r[2] ? ` <span class="fine">(+${r[2]})</span>` : ''}</dd>`).join('');
  $('overSeeds').textContent = `Chart No. ${App.chartMeta.sewSeed} · ${App.chartMeta.label} · voyage No. ${V.seed} · seed ${App.seed}`;
  drawStitchHead($('overStitch'), head, win ? MADDER : '#2c4766', 0.999);
  drawMini($('overMini'));
  $('overModal').hidden = false; modalReturn = null; $('oAgain').focus({ preventScroll: true }); overStitchT0 = performance.now();
  announce(`${$('overTitle').textContent}. Score ${total}. ${line}`);
}
let overStitchT0 = 0;
function drawStitchHead(cv, lines, color, prog) {
  const lay = stitchCells(lines), d = dprCap(), w = Math.min(cv.parentElement.clientWidth || 300, 420), s = Math.max(3, Math.floor(w * d / (lay.w + 1)));
  cv.width = s * (lay.w + 1); cv.height = s * (lay.h + 1); cv.style.width = cv.width / d + 'px'; cv.style.height = cv.height / d + 'px';
  const g = cv.getContext('2d'); g.fillStyle = 'rgba(90,70,40,.13)';
  for (let y = 0; y <= lay.h + 1; y++) for (let x = 0; x <= lay.w + 1; x++) g.fillRect(x * s - d * 0.6, y * s - d * 0.6, d * 1.2, d * 1.2);
  drawStitches(g, lay, s, s * 0.5, s * 0.5, prog, color);
}
function drawMini(cv) {
  const d = dprCap(), w = Math.max(200, cv.parentElement.clientWidth || 340), s = w * d / W;
  cv.width = Math.round(W * s); cv.height = Math.round(H * s); cv.style.width = w + 'px'; cv.style.height = (w * H / W) + 'px';
  const g = cv.getContext('2d'), A = artCache;
  g.drawImage(A.art, A.M, A.M, W * A.cs, H * A.cs, 0, 0, cv.width, cv.height);
  // what you never saw stays under muslin
  const f = canvas(cv.width, cv.height), fg = f.getContext('2d'); fg.drawImage(fog, 0, 0, f.width, f.height); fg.globalCompositeOperation = 'source-in';
  fg.fillStyle = fg.createPattern(muslinTile(s * 3), 'repeat'); fg.fillRect(0, 0, f.width, f.height);
  g.globalAlpha = 0.9; g.drawImage(f, 0, 0); g.globalAlpha = 1;
  drawTrack(g, V.track, s, 0, 0, Math.max(1.2, s * 0.12));
  V.c.ports.forEach((p, k) => drawButton(g, p.cx * s, p.cy * s, Math.max(4, s * 0.7), V.visited[k] ? (k === 0 ? 'home' : 'visited') : 'known', 0));
}

// ---------- voyage rendering ----------
const sea = $('sea'), sctx = sea.getContext('2d');
function resizeSea() {
  const d = dprCap(); sea.width = Math.round(innerWidth * d); sea.height = Math.round(innerHeight * d);
  layer = canvas(sea.width, sea.height); nightLayer = canvas(sea.width, sea.height);
}
function viewCell() { return clamp(Math.min(innerWidth / 34, innerHeight / 20), 24, 56); }
function toWorld(px, py) { const s = viewCell(); return [cam.x + (px - innerWidth / 2) / s, cam.y + (py - innerHeight / 2) / s]; }
function renderVoyage(now, dtv) {
  if (!V) return;
  applyFog();
  const d = dprCap(), s = viewCell() * d, vw = sea.width, vh = sea.height, b = V.b, A = artCache, t = now / 1000;
  // camera leads the bow a little
  const lead = calm() ? 0.6 : 1.6, tx = b.x + Math.cos(b.h) * lead * Math.min(1, b.spd / 2), ty = b.y + Math.sin(b.h) * lead * Math.min(1, b.spd / 2);
  const k = 1 - Math.exp(-dtv * 3.2); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const halfW = vw / s / 2, halfH = vh / s / 2;
  const cx = W < halfW * 2 - 2 ? W / 2 : clamp(cam.x, halfW - 1.2, W - halfW + 1.2), cy = H < halfH * 2 - 2 ? H / 2 : clamp(cam.y, halfH - 1.2, H - halfH + 1.2);
  const ox = vw / 2 - cx * s, oy = vh / 2 - cy * s, X = x => ox + x * s, Y = y => oy + y * s;
  const g = sctx; g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#2a211b'; g.fillRect(0, 0, vw, vh);
  g.fillStyle = 'rgba(255,240,220,.03)'; for (let yy = (oy % (s * 0.5)); yy < vh; yy += s * 0.5) g.fillRect(0, yy, vw, Math.max(1, d));
  const sc = s / A.cs;
  g.save(); g.setTransform(sc, 0, 0, sc, ox - A.M * sc, oy - A.M * sc); g.imageSmoothingQuality = 'high'; g.drawImage(A.art, 0, 0); g.restore();
  // voyage track and wake
  drawTrack(g, V.track.concat([[b.x, b.y]]), s, ox, oy, Math.max(1.2, s * 0.06));
  // harbours you've seen
  V.c.ports.forEach((p, k2) => {
    const seen = p.cells.some(c => V.revealed[c]); if (!seen) return;
    drawButton(g, X(p.cx), Y(p.cy), s * 0.5, V.visited[k2] ? (k2 === 0 ? 'home' : 'visited') : 'seen', V.visited[k2] ? nightness(V.hours) * 0.9 : 0);
  });
  // ripples on arrival
  for (const r of fx.ripples) { const p = (now - r.t0) / 1400; if (p > 1) continue; g.save(); g.strokeStyle = `rgba(212,160,60,${1 - p})`; g.lineWidth = Math.max(1, s * 0.06); g.setLineDash([s * 0.2, s * 0.14]); for (const m of [0.6, 1]) { g.beginPath(); g.arc(X(r.x), Y(r.y), s * (0.6 + p * 3 * m), 0, 7); g.stroke(); } g.restore(); }
  fx.ripples = fx.ripples.filter(r => now - r.t0 < 1400);
  // loose threads blowing downwind
  const w = V.wind(), to = w.dir + Math.PI;
  if (fx.threads.length < (calm() ? 10 : 34)) for (let k2 = fx.threads.length; k2 < (calm() ? 10 : 34); k2++) fx.threads.push({ x: cx + (fx.rnd() - 0.5) * halfW * 2, y: cy + (fx.rnd() - 0.5) * halfH * 2, ph: fx.rnd() * 6.28, l: 0.5 + fx.rnd() * 0.7 });
  g.save(); g.strokeStyle = 'rgba(250,244,230,.42)'; g.lineWidth = Math.max(1, d * 1.2); g.lineCap = 'round';
  const sp = (0.9 + w.str * 1.6) * (calm() ? 0.4 : 1);
  for (const th of fx.threads) {
    th.x += Math.cos(to) * sp * dtv; th.y += Math.sin(to) * sp * dtv; th.ph += dtv * 3;
    if (th.x < cx - halfW - 1) th.x += halfW * 2 + 2; if (th.x > cx + halfW + 1) th.x -= halfW * 2 + 2; if (th.y < cy - halfH - 1) th.y += halfH * 2 + 2; if (th.y > cy + halfH + 1) th.y -= halfH * 2 + 2;
    const L = th.l * s, ax = X(th.x), ay = Y(th.y), nx2 = -Math.sin(to), ny2 = Math.cos(to), wv = Math.sin(th.ph) * s * 0.08;
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax - Math.cos(to) * L * 0.5 + nx2 * wv, ay - Math.sin(to) * L * 0.5 + ny2 * wv, ax - Math.cos(to) * L, ay - Math.sin(to) * L); g.stroke();
  }
  g.restore();
  // bow wave
  if (b.spd > 0.8 && !calm()) { g.save(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, s * 0.04); const bx = X(b.x + Math.cos(b.h) * 0.62), by = Y(b.y + Math.sin(b.h) * 0.62); for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(b.h + sd * 2.4) * s * 0.3, by + Math.sin(b.h + sd * 2.4) * s * 0.3, bx + Math.cos(b.h + sd * 2.7) * s * (0.4 + b.spd * 0.08), by + Math.sin(b.h + sd * 2.7) * s * (0.4 + b.spd * 0.08)); g.stroke(); } g.restore(); }
  // sand puffs
  for (const p of fx.puffs) { const q = (now - p.t0) / 900; if (q > 1) continue; g.fillStyle = `rgba(230,200,142,${0.8 * (1 - q)})`; g.beginPath(); g.arc(X(p.x + Math.cos(p.a) * p.v * q), Y(p.y + Math.sin(p.a) * p.v * q), s * 0.08 * (1 + q), 0, 7); g.fill(); }
  fx.puffs = fx.puffs.filter(p => now - p.t0 < 900);
  // the boat
  const rel = wrapA(to - b.h), boom = clamp(rel * 0.55, -1.25, 1.25);
  drawBoat(g, X(b.x), Y(b.y), b.h, s, V.sailLvl, -boom, t, { windTo: to, tilt: V.grounded > 0 ? 0.18 : 0 });
  // course pin
  if (V.course) {
    g.save(); g.strokeStyle = 'rgba(248,242,228,.75)'; g.lineWidth = Math.max(1, d * 1.4); g.setLineDash([s * 0.12, s * 0.12]);
    g.beginPath(); g.moveTo(X(b.x), Y(b.y)); g.lineTo(X(V.course.x), Y(V.course.y)); g.stroke(); g.setLineDash([]);
    const px = X(V.course.x), py = Y(V.course.y); g.fillStyle = MADDER; g.beginPath(); g.arc(px, py - s * 0.3, s * 0.14, 0, 7); g.fill();
    g.strokeStyle = '#d9dde0'; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.moveTo(px, py - s * 0.18); g.lineTo(px, py + s * 0.05); g.stroke(); g.restore();
  }
  // fog of muslin over all you haven't seen
  const lg = layer.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, vw, vh);
  lg.imageSmoothingEnabled = true; lg.drawImage(fog, ox, oy, W * s, H * s);
  lg.globalCompositeOperation = 'source-in'; lg.save(); lg.translate(ox, oy); lg.fillStyle = lg.createPattern(muslinTile(s * 3), 'repeat'); lg.fillRect(-ox, -oy, vw, vh); lg.restore();
  lg.globalCompositeOperation = 'source-over';
  g.drawImage(layer, 0, 0);
  // pencilled-in harbours (known but unseen) sit on top of the fog
  g.font = `${Math.round(s * 0.36)}px "Special Elite", monospace`;
  const LB = { w: vw, h: vh, m: 8 * d, bottom: (document.body.classList.contains('touchmode') ? 100 : 8) * d, avoid: null };
  const tk = $('ticker'); if (!tk.classList.contains('off')) { const r = tk.getBoundingClientRect(); LB.avoid = { x0: r.left * d, x1: r.right * d, y0: r.top * d, y1: r.bottom * d }; }
  V.c.ports.forEach((p, k2) => {
    const seen = p.cells.some(c => V.revealed[c]);
    if (!seen && V.known[k2]) drawButton(g, X(p.cx), Y(p.cy), s * 0.42, 'known', 0);
    const bx = X(p.cx), by = Y(p.cy), on = bx > -s * 0.5 && bx < vw + s * 0.5 && by > -s * 0.5 && by < vh + s * 0.5; // only label buttons you can see
    if ((seen || V.known[k2]) && on) portLabel(g, p.name, bx, by, s * 0.5, s * 0.36, LB);
  });
  // night
  const nn = nightness(V.hours);
  if (nn > 0.01) {
    const ng = nightLayer.getContext('2d'); ng.setTransform(1, 0, 0, 1, 0, 0); ng.globalCompositeOperation = 'source-over'; ng.clearRect(0, 0, vw, vh);
    ng.fillStyle = `rgba(14,22,46,${0.58 * nn})`; ng.fillRect(0, 0, vw, vh);
    ng.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const gr = ng.createRadialGradient(x, y, r * 0.15, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); ng.fillStyle = gr; ng.beginPath(); ng.arc(x, y, r, 0, 7); ng.fill(); };
    hole(X(b.x), Y(b.y), s * 3.6, 0.85);
    V.c.ports.forEach((p, k2) => { if (V.visited[k2]) hole(X(p.cx), Y(p.cy), s * 2.2, 0.6); });
    g.drawImage(nightLayer, 0, 0);
    const lamp = g.createRadialGradient(X(b.x), Y(b.y), 0, X(b.x), Y(b.y), s * 1.6); lamp.addColorStop(0, `rgba(255,200,110,${0.28 * nn})`); lamp.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = lamp; g.beginPath(); g.arc(X(b.x), Y(b.y), s * 1.6, 0, 7); g.fill();
  }
  if (now > hudNext) { hudNext = now + 100; updateHud(w); }
}

// ---------- HUD ----------
function buildHudStatic() {
  $('hudStores').innerHTML = Array.from({ length: V.cap }, () => '<i></i>').join('');
  $('hudPorts').innerHTML = V.c.ports.map(p => `<i title="${p.name}"></i>`).join('') + '<span id="hudPortsN"></span>';
  updateHud(V.wind());
}
let lastHudDay = -1;
function updateHud(w) {
  if (!V) return;
  $('hudDay').textContent = `Day ${Math.min(V.day, V.season)} of ${V.season}`;
  const st = [...$('hudStores').children]; st.forEach((el, k) => el.style.setProperty('--f', (clamp(V.stores - k, 0, 1) * 100).toFixed(0) + '%'));
  $('hudStores').classList.toggle('low', V.stores < 1); $('hudStores').setAttribute('aria-label', `Stores for ${V.stores.toFixed(1)} days`);
  [...$('hudPorts').querySelectorAll('i')].forEach((el, k) => el.classList.toggle('v', V.visited[k]));
  const pn = $('hudPortsN'); if (pn) pn.textContent = ` ${V.visitedCount}/${V.c.ports.length}`;
  const off = Math.abs(wrapA(V.b.h - w.dir)), pos = pointOfSail(off), kn = (V.b.spd * 2.2).toFixed(1);
  $('hudSail').innerHTML = `${SAILS[V.sail]}<small style="color:${(off < 0.62 && V.sail) || V.grounded > 0 ? MADDER : ''}">${kn} kn · ${V.grounded > 0 ? 'aground!' : pos.toLowerCase()}</small>`;
  $('tSail').textContent = SAILS[V.sail];
  drawDial(); drawWindRose(w);
}
function drawDial() {
  const cv = $('dial'), g = cv.getContext('2d'), r = cv.width / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.translate(r, r);
  for (let hh = 0; hh < 24; hh++) { const a0 = (hh / 24) * Math.PI * 2 - Math.PI / 2, n = nightness(hh + 0.5); g.strokeStyle = n > 0.5 ? '#2c4766' : n > 0 ? '#8696a8' : '#e2b860'; g.lineWidth = r * 0.2; g.beginPath(); g.arc(0, 0, r * 0.8, a0 + 0.02, a0 + Math.PI / 12 - 0.02); g.stroke(); }
  g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(0, 0, r * 0.66, 0, 7); g.fill();
  const frac = V.hours / (V.season * 24); g.strokeStyle = MADDER; g.lineWidth = r * 0.07; g.beginPath(); g.arc(0, 0, r * 0.95, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1)); g.stroke();
  const a = ((V.hours % 24) / 24) * Math.PI * 2 - Math.PI / 2; g.strokeStyle = INK; g.lineWidth = r * 0.07; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); g.stroke();
  const n = nightness(V.hours); g.fillStyle = n > 0.5 ? '#e8edf2' : MUSTARD; g.beginPath(); g.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.13, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = r * 0.03; g.stroke();
  g.fillStyle = INK; g.font = `${Math.round(r * 0.36)}px "Special Elite", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(Math.min(V.day, V.season)), 0, r * 0.05);
  g.restore();
}
function drawWindRose(w) {
  const cv = $('rose'), g = cv.getContext('2d'), r = cv.width / 2; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.translate(r, r);
  g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(0, 0, r * 0.92, 0, 7); g.fill(); g.strokeStyle = 'rgba(43,38,32,.4)'; g.lineWidth = 2; g.stroke();
  g.setLineDash([5, 4]); g.strokeStyle = 'rgba(178,58,43,.5)'; g.beginPath(); g.arc(0, 0, r * 0.8, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = INK; g.font = `${Math.round(r * 0.2)}px "Special Elite", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['N', -Math.PI / 2], ['E', 0], ['S', Math.PI / 2], ['W', Math.PI]].forEach(([l, a]) => g.fillText(l, Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66));
  // the no-go zone either side of the wind
  g.fillStyle = 'rgba(178,58,43,.12)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r * 0.8, w.dir - 0.62, w.dir + 0.62); g.closePath(); g.fill();
  // wind arrow: from where it blows to where it goes
  const to = w.dir + Math.PI, L = r * 0.72;
  g.strokeStyle = '#2c4766'; g.lineWidth = r * 0.07; g.lineCap = 'round';
  g.beginPath(); g.moveTo(Math.cos(w.dir) * L, Math.sin(w.dir) * L); g.lineTo(Math.cos(to) * L * 0.86, Math.sin(to) * L * 0.86); g.stroke();
  g.fillStyle = '#2c4766'; g.beginPath(); g.moveTo(Math.cos(to) * L, Math.sin(to) * L); g.lineTo(Math.cos(to + 2.7) * r * 0.28 + Math.cos(to) * L * 0.8, Math.sin(to + 2.7) * r * 0.28 + Math.sin(to) * L * 0.8); g.lineTo(Math.cos(to - 2.7) * r * 0.28 + Math.cos(to) * L * 0.8, Math.sin(to - 2.7) * r * 0.28 + Math.sin(to) * L * 0.8); g.closePath(); g.fill();
  const barbs = Math.round(w.str * 3); for (let k = 0; k < barbs; k++) { const bx = Math.cos(w.dir) * L * (0.95 - k * 0.15), by = Math.sin(w.dir) * L * (0.95 - k * 0.15); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(w.dir + 1.9) * r * 0.2, by + Math.sin(w.dir + 1.9) * r * 0.2); g.stroke(); }
  // the boat's heading
  const h = V.b.h; g.fillStyle = MADDER; g.save(); g.rotate(h); g.beginPath(); g.moveTo(r * 0.92, 0); g.lineTo(r * 0.7, -r * 0.1); g.lineTo(r * 0.7, r * 0.1); g.closePath(); g.fill(); g.restore();
  g.restore();
}

// ---------- input ----------
function steerFromKeys() { Input.steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); }
function sailStep(dir) { if (!V) return; const n = clamp(V.sail + dir, 0, 2); if (n === V.sail) return; Input.sail = n; V.sail = n; sound.luff(dir > 0); updateHud(V.wind()); announce(SAILS[n]); }
addEventListener('keydown', e => {
  sound.unlock();
  if (e.key === 'Tab') trapFocus(e);
  const k = e.key, inField = e.target && e.target.tagName === 'INPUT';
  if (inField) return;
  if (k === 'm' || k === 'M') { toggleMute(); return; }
  if (!$('howModal').hidden && k === 'Escape') { closeModal('howModal'); return; }
  if (App.state === 'chart' && (k === 'Escape' || k === 'c' || k === 'C')) { closeChartView(); e.preventDefault(); return; }
  if (App.state === 'playing') {
    if (k === 'Escape' || k === 'p' || k === 'P') { pause(); e.preventDefault(); return; }
    if (k === 'c' || k === 'C') { openChartView(); return; }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; steerFromKeys(); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; steerFromKeys(); e.preventDefault(); }
    else if ((k === 'ArrowUp' || k === 'w' || k === 'W') && !e.repeat) { sailStep(1); e.preventDefault(); }
    else if ((k === 'ArrowDown' || k === 's' || k === 'S') && !e.repeat) { sailStep(-1); e.preventDefault(); }
    return;
  }
  if (App.state === 'paused' && (k === 'Escape' || k === 'p' || k === 'P')) { resume(); e.preventDefault(); return; }
  if ((App.state === 'workroom' || App.state === 'sewing') && !anyModal()) {
    if (/^[1-7]$/.test(k) && App.model === 'patch') { selectFabric(+k - 1); return; }
    if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); undo(); }
  }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = false; steerFromKeys(); }
  if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = false; steerFromKeys(); }
});
addEventListener('pointerdown', e => { sound.unlock(); if (e.pointerType === 'touch') document.body.classList.add('touchmode'); }, { capture: true });
let courseDrag = false;
sea.addEventListener('pointerdown', e => { if (App.state !== 'playing') return; e.preventDefault(); courseDrag = true; sea.setPointerCapture(e.pointerId); setCourse(e); });
sea.addEventListener('pointermove', e => { if (courseDrag && App.state === 'playing') setCourse(e); });
const endCourse = () => { courseDrag = false; }; sea.addEventListener('pointerup', endCourse); sea.addEventListener('pointercancel', endCourse);
function setCourse(e) { const [x, y] = toWorld(e.clientX, e.clientY); if (x < 0 || y < 0 || x > W || y > H) return; Input.course = [x, y]; keys.left = keys.right = false; steerFromKeys(); }
function holdButton(id, dir) {
  const b = $(id), on = e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add('held'); Input.steer = dir; }, off = () => { b.classList.remove('held'); if (Input.steer === dir) Input.steer = 0; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); Input.steer = dir; } }); b.addEventListener('keyup', off);
}
holdButton('tPort', -1); holdButton('tStar', 1);
$('tUp').addEventListener('click', () => sailStep(1)); $('tDown').addEventListener('click', () => sailStep(-1));
$('hPause').addEventListener('click', () => pause()); $('hMute').addEventListener('click', toggleMute); $('hChart').addEventListener('click', () => openChartView());

// ---------- pause, chart view ----------
function pause() {
  if (App.state !== 'playing') return;
  App.state = 'paused'; sound.ambience(false); keys.left = keys.right = false; steerFromKeys();
  $('pauseKicker').textContent = `Voyage No. ${V.seed} · day ${Math.min(V.day, V.season)} of ${V.season}`;
  syncSettingsUI(); openModal('pauseModal', $('pResume')); announce('Paused');
}
function resume() { if (App.state !== 'paused') return; closeModal('pauseModal'); App.state = 'playing'; sound.unlock(); sound.ambience(true); last = performance.now(); acc = 0; announce('Sailing'); }
function openChartView() {
  if (App.state !== 'playing') return; App.state = 'chart'; keys.left = keys.right = false; steerFromKeys();
  const cv = $('cvCanvas'); openModal('chartModal', $('cvClose'));
  const d = dprCap(), w = cv.parentElement.clientWidth - 4, s = w * d / W; cv.width = Math.round(W * s); cv.height = Math.round(H * s);
  const g = cv.getContext('2d'), A = artCache; g.drawImage(A.art, A.M, A.M, W * A.cs, H * A.cs, 0, 0, cv.width, cv.height);
  const f = canvas(cv.width, cv.height), fg = f.getContext('2d'); fg.drawImage(fog, 0, 0, f.width, f.height); fg.globalCompositeOperation = 'source-in'; fg.fillStyle = fg.createPattern(muslinTile(s * 3), 'repeat'); fg.fillRect(0, 0, f.width, f.height); g.drawImage(f, 0, 0);
  drawTrack(g, V.track, s, 0, 0, Math.max(1.2, s * 0.1));
  g.font = `${Math.round(s * 0.6)}px "Special Elite", monospace`;
  V.c.ports.forEach((p, k) => { const seen = p.cells.some(c => V.revealed[c]); if (!seen && !V.known[k]) return; drawButton(g, p.cx * s, p.cy * s, s * 0.6, V.visited[k] ? (k === 0 ? 'home' : 'visited') : seen ? 'seen' : 'known', 0); portLabel(g, p.name, p.cx * s, p.cy * s, s * 0.6, s * 0.6, { w: cv.width, h: cv.height, m: 4, bottom: 4 }); });
  drawBoat(g, V.b.x * s, V.b.y * s, V.b.h, s * 1.4, V.sailLvl, 0.3, 0, {});
  announce('Chart open. Time stands still.');
}
function closeChartView() { if (App.state !== 'chart') return; closeModal('chartModal'); App.state = 'playing'; last = performance.now(); acc = 0; }
$('cvClose').addEventListener('click', closeChartView);
function syncSettingsUI() { $('optSound').checked = !settings.muted; $('optCalm').checked = calm(); $('optCalm').disabled = RM.matches; }
$('optSound').addEventListener('change', e => { if (settings.muted === e.target.checked) toggleMute(); });
$('optCalm').addEventListener('change', e => { settings.calm = e.target.checked; store.set('calm', settings.calm ? 1 : 0); });
$('pResume').addEventListener('click', resume);
$('pRestart').addEventListener('click', () => { closeModal('pauseModal'); startVoyage(); });
$('pWork').addEventListener('click', () => { closeModal('pauseModal'); V = null; goWorkroom(); });
$('pTitle').addEventListener('click', () => { closeModal('pauseModal'); goTitle(); });
$('oAgain').addEventListener('click', () => { $('overModal').hidden = true; startVoyage(); });
$('oNew').addEventListener('click', () => { $('overModal').hidden = true; App.sewSeed = seedNum(App.sewSeed, 'again'); V = null; goWorkroom(); startSew(); });
$('oSave').addEventListener('click', () => exportPNG(true));
$('oTitle').addEventListener('click', () => { $('overModal').hidden = true; goTitle(); });
$('howClose').addEventListener('click', () => closeModal('howModal'));
$('btnHow').addEventListener('click', () => openModal('howModal', $('howClose')));
$('errReload').addEventListener('click', () => location.reload());
addEventListener('blur', () => { if (App.state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && App.state === 'playing') pause(); });

// ---------- title wiring ----------
function refreshTitle() {
  $('seedInput').value = App.seed;
  $('seedNote').textContent = App.daily && App.seed === today() ? `Today's chart: seed ${App.seed}. Everyone sews the same one.` : `Seed ${App.seed}: share it and anyone sews the same chart.`;
  const best = +store.get('best', 0) || 0; $('titleBest').textContent = best ? `Best voyage so far: ${best.toLocaleString('en-GB')}` : 'No voyages logged yet.';
}
function setSeed(n, daily) {
  App.seed = n % 1000000000; App.daily = !!daily; deriveFromSeed(); App.chart = null; App.chartTerr = null; if (App.loom) App.loom.free(); App.loom = null; App.sewing = null;
  refreshTitle(); syncURL(); Attract.idx = 0; attractNext(); toast(`Seed ${App.seed}`);
}
$('seedForm').addEventListener('submit', e => { e.preventDefault(); const n = num($('seedInput').value.replace(/\D/g, '')); if (n === null) { toast('A seed is a whole number'); return; } setSeed(n, false); });
$('btnReseed').addEventListener('click', () => setSeed(Math.floor(Math.random() * 900000) + 1000, false));
$('btnToday').addEventListener('click', () => setSeed(today(), true));
$('btnPlay').addEventListener('click', () => { sound.unlock(); sound.click(); goWorkroom(); });

function onLibrary() {
  $('loadNote').textContent = ''; $('btnPlay').disabled = false;
  if (App.state === 'loading') App.state = 'title';
  attractNext();
}

// ---------- the loop ----------
let last = performance.now(), acc = 0, frameN = 0;
function update() {
  if (App.state === 'title' && !$('title').hidden) attractTick();
  else if (App.state === 'sewing') workroomTick();
  else if (App.state === 'playing' && V) { V.step(Input); drainVoyage(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  frameN++;
  let dt = now - last; last = now; if (dt > 250) dt = 250;
  if (document.hidden) return;
  const live = App.state === 'title' || App.state === 'sewing' || App.state === 'playing' || App.state === 'loading';
  if (live) { acc += dt; let n = 0; while (acc >= STEP_MS && n < 12) { update(); acc -= STEP_MS; n++; } if (n === 12) acc = 0; }
  if (IN_FRAME && frameN % 2) return; // previews on the index run at half rate
  if (App.state === 'title' || App.state === 'loading') {
    const p = calm() ? 1 : clamp((now - titleT0) / 1500, 0, 1);
    if (p < 1 || !titleDrawn) { drawTitle(now, IN_FRAME ? $('badgeTitle') : $('stitchTitle'), p); titleDrawn = p >= 1; }
    if (Attract.preview) Attract.preview.draw(now, Attract.sewing && Attract.sewing.busy ? Attract.loom : null);
  } else if (App.state === 'workroom' || App.state === 'sewing') {
    preview.draw(now, App.sewing && App.sewing.busy && (App.sewing.phase === 'live' || App.sewing.phase === 'replay') ? App.loom : null);
    if (App.state === 'sewing' && now > hudNext) { hudNext = now + 120; updateTally(); }
  } else if (App.state === 'playing') renderVoyage(now, dt / 1000);
  else if (App.state === 'over' && overInfo && !calm()) {
    const p = clamp((now - overStitchT0) / 1300, 0, 1); if (p < 1 || overInfo.drawn !== true) { drawStitchHead($('overStitch'), overInfo.head, V && V.over.win ? MADDER : '#2c4766', p); overInfo.drawn = p >= 1; }
  }
}
let titleDrawn = false;
let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    titleDrawn = false; layoutTitle(); layoutWorkroom(); if (Attract.preview) Attract.preview.dirty = true;
    if (!$('sea').hidden) { resizeSea(); if (App.state !== 'playing' && V) renderVoyage(performance.now(), 0); }
  }, 120);
});
if (RM.addEventListener) RM.addEventListener('change', () => syncSettingsUI());

// ---------- boot ----------
fillKeys($('howKeys')); fillKeys($('pauseKeys')); syncMute(); buildFabrics(); buildPresets(); refreshTitle(); syncSettingsUI();
if (IN_FRAME) { document.body.classList.add('attract-mode'); }
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchmode');
// previews on the index: stop sewing while scrolled out of view
if ('IntersectionObserver' in window) new IntersectionObserver(es => { for (const e of es) Attract.visible = e.isIntersecting; }).observe($('attractCanvas'));
titleT0 = performance.now();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { titleDrawn = false; if (!$('workroom').hidden) layoutWorkroom(); if (App.state === 'workroom') preview.dirty = true; });
requestAnimationFrame(frame);
setTimeout(() => { if (App.state === 'loading' || App.state === 'title') $('btnPlay').focus({ preventScroll: true }); }, 50);
loadLibrary();

// ---------- test hooks ----------
function snapshot() {
  const s = App.sewing, l = App.loom;
  const out = { state: App.state, seed: App.seed, sewSeed: App.sewSeed, voyageSeed: App.voyageSeed, model: App.model, sample: App.model === 'patch' ? sampleParam() : App.coast,
    options: { N: App.N, sym: App.sym, wrap: App.wrap },
    sewing: s ? { phase: s.phase, attempt: s.attempt, knots: s.knots, retries: s.retries, reasons: s.reasons.slice(), decided: l ? l.decided : 0, cells: l ? l.n : 0, T: l ? l.T : 0 } : null,
    chart: App.chart ? { hash: terrHash(App.chart.terr), ports: App.chart.ports.map(p => ({ name: p.name, x: +p.cx.toFixed(2), y: +p.cy.toFixed(2) })), seasonDays: App.chart.seasonDays, storesCap: App.chart.storesCap, tour: Math.round(App.chart.tour), struck: App.chart.struck } : (App.chartTerr ? { hash: terrHash(App.chartTerr), ports: [] } : null) };
  if (V) {
    const w = V.wind(), sc = V.score();
    out.voyage = { ticks: V.ticks, day: V.day, hours: +V.hours.toFixed(3), stores: +V.stores.toFixed(3), sail: V.sail, boat: { x: +V.b.x.toFixed(3), y: +V.b.y.toFixed(3), h: +V.b.h.toFixed(3), spd: +V.b.spd.toFixed(3) },
      wind: { dir: +w.dir.toFixed(3), str: +w.str.toFixed(3) }, visited: V.visited.slice(), known: V.known.slice(), revealedPct: +V.revealedPct.toFixed(2), groundings: V.groundings,
      grounded: V.grounded > 0, course: V.course ? [+V.course.x.toFixed(2), +V.course.y.toFixed(2)] : null, score: sc.total, over: V.over };
  }
  return out;
}
window.__game = {
  get seed() { return App.seed; },
  state: () => App.state,
  start() { if (App.state === 'title' && WFC) goWorkroom(); return App.state; },
  ready: () => !!WFC,
  sew(o = {}) { if ($('workroom').hidden) goWorkroom(); if (o.preset && PRESETS[o.preset]) { App.sample = presetSample(o.preset); App.sampleSrc = { kind: 'preset', key: o.preset }; App.N = PRESETS[o.preset].n; App.sym = PRESETS[o.preset].sym; }
    if (o.model) App.model = o.model; if (o.coast) App.coast = o.coast; if (o.sewSeed !== undefined) App.sewSeed = o.sewSeed; syncOptionsUI(); syncPresetsUI(); layoutWorkroom();
    startSew(); if (o.instant) skipAhead(); return snapshot(); },
  finish() { skipAhead(); return snapshot(); },
  sail() { startVoyage(); return App.state; },
  step(ms) { const n = Math.max(1, Math.round(ms / STEP_MS)); for (let i = 0; i < n; i++) update(); return snapshot(); },
  input(o = {}) {
    if ('steer' in o) Input.steer = clamp(Math.round(o.steer) || 0, -1, 1);
    if ('sail' in o && V) { Input.sail = clamp(o.sail | 0, 0, 2); V.sail = Input.sail; }
    if ('course' in o) Input.course = o.course ? [o.course[0], o.course[1]] : null;
    return snapshot();
  },
  pause, resume, snapshot,
  paint(x, y, t) { pushUndo(); const r = paintCell(x, y, t); drawSlate(); syncPresetsUI(); return r; },
  // a small autopilot for playtests: plans a sea route to the nearest unvisited port and returns waypoints
  route() {
    if (!V) return null; const c = V.c, b = V.b, bi = (b.y | 0) * W + (b.x | 0), target = c.ports.map((p, k) => k).filter(k => !V.visited[k]).sort((a, z) => c.dist[a][bi] - c.dist[z][bi])[0];
    if (target === undefined) return null; const dist = c.dist[target]; let i = (b.y | 0) * W + (b.x | 0); const path = [];
    for (let g = 0; g < 400; g++) { const x = i % W, y = (i / W) | 0; let best = i; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (dist[j] < dist[best]) best = j; } if (best === i) break; i = best; path.push([i % W + 0.5, ((i / W) | 0) + 0.5]); }
    // string-pull: aim at the farthest waypoint the boat can see past the shore
    if (!path.length) { let best = null, bd = 1e9; for (const cell of c.ports[target].cells) { const x = cell % W + 0.5, y = ((cell / W) | 0) + 0.5, d = Math.hypot(x - b.x, y - b.y); if (d < bd) { bd = d; best = [x, y]; } } return { target, path, aim: best }; }
    let aim = null;
    for (let k = 0; k < Math.min(path.length, 10); k++) {
      const p = path[k], L = Math.hypot(p[0] - b.x, p[1] - b.y), n = Math.ceil(L / 0.2); let ok = true;
      for (let q = 1; q <= n && ok; q++) if (V.blocked(b.x + (p[0] - b.x) * q / n, b.y + (p[1] - b.y) * q / n)) ok = false;
      if (ok) aim = p; else break;
    }
    if (!aim) { // wedged against a corner: back off to the middle of this cell first
      const cx = (b.x | 0) + 0.5, cy = (b.y | 0) + 0.5, dx = cx - b.x, dy = cy - b.y, l = Math.hypot(dx, dy) || 1;
      aim = [b.x + dx / l * 0.9, b.y + dy / l * 0.9];
    }
    return { target, path, aim };
  },
};
