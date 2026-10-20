// Patchwork Isles: the loom. Wraps wavefunctioncollapse@2.1.0 (passed in as `lib`),
// holds the samples and tile set, and turns a finished wave into a sailable chart.
// No DOM in here, so it can be tested on its own.

export const CHART_W = 72, CHART_H = 48;
export const SAMPLE = 12;

// ---------- seeded randomness ----------
export function mulberry32(a) {
  a = a >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash32(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  }
  return h >>> 0;
}
export const seedNum = (...p) => hash32(...p) % 100000;

// ---------- terrain ----------
// Colours are exact RGB keys: the OverlappingModel learns colours, so every fabric needs its own.
export const TER = [
  { id: 0, key: 'd', name: 'Deep sea', cloth: 'Indigo sashiko', water: true, rgb: [47, 74, 107] },
  { id: 1, key: 's', name: 'Shallows', cloth: 'Chambray', water: true, rgb: [127, 176, 184] },
  { id: 2, key: 'a', name: 'Sand', cloth: 'Calico', rgb: [230, 200, 142] },
  { id: 3, key: 'm', name: 'Meadow', cloth: 'Gingham', rgb: [163, 181, 107] },
  { id: 4, key: 'f', name: 'Forest', cloth: 'Knotted wool', rgb: [78, 107, 60] },
  { id: 5, key: 'r', name: 'Rock', cloth: 'Tweed', rgb: [141, 135, 124] },
  { id: 6, key: 'h', name: 'Harbour', cloth: 'Madder', rgb: [178, 58, 43] },
];
const REEF_RGB = [120, 114, 104]; // a rock islet that counts as sea for the tile rules
const rgbKey = (r, g, b) => (r << 16) | (g << 8) | b;
const TER_BY_RGB = new Map(TER.map(t => [rgbKey(...t.rgb), t.id]));
TER_BY_RGB.set(rgbKey(...REEF_RGB), 5);
export const terrFromRGB = (r, g, b) => { const v = TER_BY_RGB.get(rgbKey(r, g, b)); return v === undefined ? 0 : v; };
export const isWater = t => t <= 1;

// ---------- ready samples (each tiles seamlessly, because the loom wraps the sample) ----------
export const PRESETS = {
  atolls: {
    name: 'Scattered atolls', blurb: 'Sand rings and cays strewn across open water.',
    n: 3, sym: 4,
    rows: ['DDDDDDDDDDDD', 'DDDDDSSDDDDD', 'DDDSSASSDDDD', 'DDSAASSASDDD', 'DDSASSSSASDD', 'DSSASDDSASDD',
      'DSAASDDSSADD', 'DDSASSSSAHSD', 'DDSSAAASASDD', 'DDDDSSSSSDDD', 'DDDDDDDDDSSD', 'DDDDDDDDSARD'],
  },
  fjord: {
    name: 'Fjord coast', blurb: 'Tweed skerries and deep cuts. Mind the rocks.',
    n: 3, sym: 4,
    rows: ['DDDDDDDDDDDD', 'DDDRRDDDDDDD', 'DDRRFRDDDDSD', 'DRRFFRRDDSRS', 'DRFFFFRDDDSD', 'DRRFMFRRDDDD',
      'DDRFFRRHSDDD', 'DDRRFRDDDDDD', 'DDDRRDDDRRDD', 'DSDDDDDRRFRD', 'SRSDDDDDRRDD', 'DSDDDDDDDDDD'],
  },
  isle: {
    name: 'Great isles', blurb: 'Islands of every size, wooded inland, beaches all round.',
    n: 3, sym: 4,
    rows: ['DDDDDDDDDDDD', 'DDSSSSSDDDDD', 'DSSAAASSSDDD', 'DSAAMMAASSDD', 'DSAMMMMMASSD', 'SSAMFFFMMASD',
      'SHAMFFFFMAAS', 'SSAMFFFFFMAS', 'DSAMMFFFMMAS', 'DSSAMMMMAASD', 'DDSSAAAHASSD', 'DDDSSSSSSSDD'],
  },
  delta: {
    name: 'River delta', blurb: 'Silt bars, braided channels, slow shallow water.',
    n: 3, sym: 4,
    rows: ['SSSSSSSSSSSS', 'SAAAASSSAAAS', 'SAMMAASSAMMA', 'SAMMMASSAMMA', 'SSAAMASSSAAS', 'SSSSAASSSSSS',
      'DSSSSSSSSDDD', 'DDSSHSSSDDDD', 'DSSAASSSSDDD', 'SSAMMASSSSDD', 'SSAAAASSSSSD', 'SSSSSSSSSSSS'],
  },
};
export const PRESET_KEYS = Object.keys(PRESETS);
const LETTER = { D: 0, S: 1, A: 2, M: 3, F: 4, R: 5, H: 6 };
export function presetSample(key) {
  const p = PRESETS[key]; const s = new Uint8Array(SAMPLE * SAMPLE);
  p.rows.forEach((row, y) => { for (let x = 0; x < SAMPLE; x++) s[y * SAMPLE + x] = LETTER[row[x]]; });
  return s;
}

// Run-length code for a painted sample, short enough for a URL: "12d3s2a..."
export function rleEncode(s) {
  let out = '', i = 0;
  while (i < s.length) { let j = i; while (j < s.length && s[j] === s[i]) j++; const n = j - i; out += (n > 1 ? n : '') + TER[s[i]].key; i = j; }
  return out;
}
export function rleDecode(code) {
  if (!code || !/^(\d*[dsamfrh])+$/.test(code)) return null;
  const s = []; const re = /(\d*)([dsamfrh])/g; let m;
  while ((m = re.exec(code))) { const n = m[1] ? parseInt(m[1], 10) : 1; const id = TER.findIndex(t => t.key === m[2]); for (let k = 0; k < n && s.length <= 144; k++) s.push(id); }
  return s.length === SAMPLE * SAMPLE ? Uint8Array.from(s) : null;
}

// A random island scrap from a seed. Distances are measured on a torus so it tiles.
export function scatterSample(seed) {
  const rnd = mulberry32(hash32('scatter', seed));
  const N = SAMPLE, s = new Uint8Array(N * N);
  const blobs = []; const nb = 2 + Math.floor(rnd() * 3);
  for (let b = 0; b < nb; b++) blobs.push({ x: rnd() * N, y: rnd() * N, r: 1.3 + rnd() * 2.4, rx: 0.7 + rnd() * 0.6 });
  const td = (a, b) => { let d = Math.abs(a - b); return Math.min(d, N - d); };
  const land = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let f = -9;
    for (const b of blobs) { const dx = td(x + 0.5, b.x) / b.rx, dy = td(y + 0.5, b.y) * b.rx; f = Math.max(f, b.r - Math.hypot(dx, dy)); }
    f += (rnd() - 0.5) * 0.35;
    land[y * N + x] = f > 0 ? 1 : 0;
  }
  // distance to water (torus BFS, 4-neighbour)
  const dist = new Int16Array(N * N).fill(-1); const q = [];
  for (let i = 0; i < N * N; i++) if (!land[i]) { dist[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = ((y + dy + N) % N) * N + ((x + dx + N) % N); if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
  }
  // one coast fabric per scrap keeps the number of distinct pieces low
  const rocky = rnd() < 0.4, wooded = rnd() < 0.5;
  for (let i = 0; i < N * N; i++) {
    const d = dist[i];
    if (d <= 0) continue;
    if (d === 1) s[i] = rocky ? 5 : 2;
    else if (d === 2) s[i] = wooded ? 4 : 3;
    else s[i] = wooded ? 3 : 4;
  }
  for (let i = 0; i < N * N; i++) {
    if (land[i]) continue;
    const x = i % N, y = (i / N) | 0; let near = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (land[((y + dy + N) % N) * N + ((x + dx + N) % N)]) near = true;
    s[i] = near ? 1 : 0;
  }
  // one or two harbours on a beach that touches water
  const shore = [];
  for (let i = 0; i < N * N; i++) if (land[i] && dist[i] === 1) shore.push(i);
  const nh = shore.length ? (shore.length > 10 ? 2 : 1) : 0;
  for (let k = 0; k < nh; k++) { const i = shore.splice(Math.floor(rnd() * shore.length), 1)[0]; s[i] = 6; }
  return s;
}

export function sampleRGBA(s) {
  const a = new Uint8Array(s.length * 4);
  for (let i = 0; i < s.length; i++) { const c = TER[s[i]].rgb; a[i * 4] = c[0]; a[i * 4 + 1] = c[1]; a[i * 4 + 2] = c[2]; a[i * 4 + 3] = 255; }
  return a;
}
export function sampleStats(s) {
  const c = new Array(7).fill(0); for (const v of s) c[v]++;
  let shoreHarbour = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === 6) {
    const x = i % SAMPLE, y = (i / SAMPLE) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = ((y + dy + SAMPLE) % SAMPLE) * SAMPLE + ((x + dx + SAMPLE) % SAMPLE); if (isWater(s[j])) { shoreHarbour++; break; } }
  }
  return { counts: c, water: c[0] + c[1], land: 144 - c[0] - c[1], harbours: c[6], shoreHarbour };
}

// ---------- the Admiralty tile set (SimpleTiledModel) ----------
// Each piece is a 2x2 bitmap. Every pixel is one chart cell and one corner of the piece:
// neighbouring pieces must agree on land or sea where their corners meet.
// q = [top-left, top-right, bottom-right, bottom-left]
export const PIECES = [
  { name: 'sea', label: 'Open sea', sym: 'X', q: [0, 0, 0, 0] },
  { name: 'shoal', label: 'Shallows', sym: 'X', q: [1, 1, 1, 1] },
  { name: 'meadow', label: 'Meadow', sym: 'X', q: [3, 3, 3, 3] },
  { name: 'wood', label: 'Wood', sym: 'X', q: [4, 4, 4, 4] },
  { name: 'fell', label: 'Fell', sym: 'X', q: [5, 5, 5, 5] },
  { name: 'coast', label: 'Coast', sym: 'T', q: [2, 2, 1, 1] },
  { name: 'harbour', label: 'Harbour', sym: 'T', q: [6, 6, 1, 1] },
  { name: 'cape', label: 'Cape', sym: 'L', q: [1, 2, 1, 1] },
  { name: 'bay', label: 'Bay', sym: 'L', q: [2, 1, 2, 2] },
  { name: 'strait', label: 'Strait', sym: '\\', q: [2, 1, 2, 1] },
  { name: 'reef', label: 'Reef', sym: 'L', q: [1, 7, 1, 1] },
];
const CARD = { X: 1, T: 4, L: 4, '\\': 2, I: 2, F: 8 };
export const COASTS = {
  wide: { name: 'Wide water', blurb: 'Small islands, long open crossings.',
    w: { sea: 14, shoal: 1.5, meadow: 8, wood: 6, fell: 2, coast: 3, harbour: 0.16, cape: 1.2, bay: 1.6, strait: 0.15, reef: 0.3 } },
  chain: { name: 'Island chain', blurb: 'A busy archipelago of capes and bays.',
    w: { sea: 12, shoal: 2, meadow: 6, wood: 4, fell: 1.2, coast: 3, harbour: 0.2, cape: 1.6, bay: 1.2, strait: 0.15, reef: 0.6 } },
  ragged: { name: 'Ragged coast', blurb: 'Big land, narrow sounds, more dead ends.',
    w: { sea: 8, shoal: 1.5, meadow: 8, wood: 6, fell: 2, coast: 3, harbour: 0.2, cape: 1.2, bay: 1.6, strait: 0.15, reef: 0.4 } },
};
const TERRAIN_RGB = q => q === 7 ? REEF_RGB : TER[q].rgb;
function pieceBitmap(q) { // pixel order: (0,0) (1,0) (0,1) (1,1)
  const b = [];
  for (const t of [q[0], q[1], q[3], q[2]]) b.push(...TERRAIN_RGB(t), 255);
  return b;
}
const cornerLand = rgb => { const t = TER_BY_RGB.get(rgbKey(rgb[0], rgb[1], rgb[2])); return t >= 2 && !(rgb[0] === REEF_RGB[0] && rgb[1] === REEF_RGB[1]) ? 1 : 0; };
export function tileData(lib, coastKey) {
  const w = COASTS[coastKey].w;
  const tiles = PIECES.map(p => ({ name: p.name, symmetry: p.sym, weight: w[p.name] / CARD[p.sym], bitmap: pieceBitmap(p.q) }));
  // Let the library rotate and mirror every piece once, then pair up variants whose touching corners agree.
  const probe = new lib.SimpleTiledModel({ tilesize: 2, tiles, neighbors: [] }, null, 2, 2, false);
  const vars = []; let k = 0;
  for (const p of PIECES) for (let v = 0; v < CARD[p.sym]; v++) vars.push({ id: p.name + ' ' + v, c: probe.tiles[k++].map(cornerLand) });
  const neighbors = [];
  for (const A of vars) for (const B of vars) if (A.c[1] === B.c[0] && A.c[3] === B.c[2]) neighbors.push({ left: A.id, right: B.id });
  return { tilesize: 2, tiles, neighbors };
}

// ---------- the Loom: one model, many attempts ----------
export class Loom {
  constructor(lib, spec) {
    this.spec = spec; this.W = spec.W; this.H = spec.H; this.n = this.W * this.H;
    this.kind = spec.kind; this.error = null; this.model = null;
    try { this.build(lib); } catch (e) { this.error = { code: 'build', detail: String(e && e.message || e) }; this.model = null; }
    this.terr = new Uint8Array(this.n).fill(255);
  }
  build(lib) {
    const s = this.spec;
    if (s.kind === 'patch') {
      const N = s.N;
      const m = new lib.OverlappingModel(sampleRGBA(s.sample), SAMPLE, SAMPLE, N, this.W, this.H, true, !!s.wrap, s.sym);
      this.T = m.T;
      if (m.T > s.cap) { this.error = { code: 'too-many', T: m.T, cap: s.cap, N }; return; }
      this.model = m;
      this.colorTerr = m.colors.map(c => terrFromRGB(c[0], c[1], c[2]));
      // which wave cell decides each chart cell, and which pixel of its pattern it shows
      this.origin = new Int32Array(this.n); this.offset = new Int32Array(this.n);
      for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
        const i = y * this.W + x;
        if (s.wrap) { this.origin[i] = i; this.offset[i] = 0; continue; }
        const ox = Math.min(x, this.W - N), oy = Math.min(y, this.H - N);
        this.origin[i] = oy * this.W + ox; this.offset[i] = (x - ox) + (y - oy) * N;
      }
    } else {
      const m = new lib.SimpleTiledModel(tileData(lib, s.coast), null, this.W / 2, this.H / 2, !!s.wrap);
      this.model = m; this.T = m.T;
      this.varTerr = m.tiles.map(tile => tile.map(c => terrFromRGB(c[0], c[1], c[2])));
      this.tileDone = new Uint8Array(m.FMXxFMY);
    }
  }
  begin(seed, attempt) {
    this.attempt = attempt; this.rng = mulberry32(hash32('sew', seed, attempt));
    // A fresh model has no wave yet (it is allocated on the first iterate/generate), and clear() would throw.
    if (this.model.wave) this.model.clear();
    this.terr.fill(255); this.decided = 0; this.iterations = 0;
    if (this.tileDone) this.tileDone.fill(0);
  }
  // A few iterations of observe + propagate. Returns 'running', 'done' or 'knot' (a contradiction).
  run(k) {
    const ok = this.model.iterate(k, this.rng); this.iterations += k;
    if (!ok) return 'knot';
    return this.model.isGenerationComplete() ? 'done' : 'running';
  }
  // Push the chart cells that have settled on one colour since the last scan.
  scan(out) {
    const m = this.model, sums = m.sumsOfOnes, wave = m.wave;
    if (this.kind === 'patch') {
      for (let i = 0; i < this.n; i++) {
        if (this.terr[i] !== 255) continue;
        const o = this.origin[i];
        if (sums[o] !== 1) continue;
        const w = wave[o]; let t = 0; while (!w[t]) t++;
        this.terr[i] = this.colorTerr[m.patterns[t][this.offset[i]]]; this.decided++; out.push(i);
      }
    } else {
      const TW = this.W / 2;
      for (let j = 0; j < m.FMXxFMY; j++) {
        if (this.tileDone[j] || sums[j] !== 1) continue;
        const w = wave[j]; let t = 0; while (!w[t]) t++;
        this.tileDone[j] = 1;
        const tx = j % TW, ty = (j / TW) | 0, v = this.varTerr[t];
        const cells = [(2 * ty) * this.W + 2 * tx, (2 * ty) * this.W + 2 * tx + 1, (2 * ty + 1) * this.W + 2 * tx, (2 * ty + 1) * this.W + 2 * tx + 1];
        for (let q = 0; q < 4; q++) { this.terr[cells[q]] = v[q]; this.decided++; out.push(cells[q]); }
      }
    }
  }
  // How undecided each cell still is: 1 = anything goes, 0 = settled.
  openness(i) {
    const m = this.model; if (!m || !m.wave) return 1;
    if (this.kind === 'patch') { const o = this.origin[i]; return (m.sumsOfOnes[o] - 1) / Math.max(1, m.T - 1); }
    const TW = this.W / 2, x = i % this.W, y = (i / this.W) | 0, j = (y >> 1) * TW + (x >> 1);
    return (m.sumsOfOnes[j] - 1) / Math.max(1, m.T - 1);
  }
  knotCell() {
    const m = this.model;
    for (let i = 0; i < m.FMXxFMY; i++) if (m.sumsOfOnes[i] === 0) {
      if (this.kind === 'patch') return { x: i % this.W, y: (i / this.W) | 0 };
      const TW = this.W / 2; return { x: (i % TW) * 2 + 1, y: ((i / TW) | 0) * 2 + 1 };
    }
    return { x: this.W >> 1, y: this.H >> 1 };
  }
  // The fast path: one whole attempt in a single call.
  fast(seed, attempt) { this.attempt = attempt; return this.model.generate(mulberry32(hash32('sew', seed, attempt))); }
  // Read the finished chart through the public API.
  finalTerrain() {
    const img = this.model.graphics(); const t = new Uint8Array(this.n);
    for (let i = 0; i < this.n; i++) t[i] = terrFromRGB(img[i * 4], img[i * 4 + 1], img[i * 4 + 2]);
    return t;
  }
  free() { this.model = null; }
}

// ---------- reading a chart ----------
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function analyseChart(terr, W, H) {
  const n = W * H, comp = new Int32Array(n).fill(-1), sizes = [];
  for (let i = 0; i < n; i++) {
    if (!isWater(terr[i]) || comp[i] >= 0) continue;
    const c = sizes.length, st = [i]; comp[i] = c; let k = 0;
    while (st.length) {
      const j = st.pop(); k++; const x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of D4) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (isWater(terr[q]) && comp[q] < 0) { comp[q] = c; st.push(q); } }
    }
    sizes.push(k);
  }
  const hg = new Int32Array(n).fill(-1), groups = [];
  for (let i = 0; i < n; i++) {
    if (terr[i] !== 6 || hg[i] >= 0) continue;
    const g = { id: groups.length, cells: [], comps: new Set() }, st = [i]; hg[i] = g.id;
    while (st.length) {
      const j = st.pop(); g.cells.push(j); const x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of D4) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X;
        if (terr[q] === 6 && hg[q] < 0) { hg[q] = g.id; st.push(q); }
        if (isWater(terr[q])) g.comps.add(comp[q]);
      }
    }
    let sx = 0, sy = 0; for (const c of g.cells) { sx += c % W + 0.5; sy += ((c / W) | 0) + 0.5; }
    g.cx = sx / g.cells.length; g.cy = sy / g.cells.length;
    groups.push(g);
  }
  const votes = new Map(); for (const g of groups) for (const c of g.comps) votes.set(c, (votes.get(c) || 0) + 1);
  let main = -1, best = -1;
  for (const [c, v] of votes) if (v > best || (v === best && sizes[c] > sizes[main])) { best = v; main = c; }
  if (main < 0) { for (let c = 0; c < sizes.length; c++) if (main < 0 || sizes[c] > sizes[main]) main = c; }
  const reachable = groups.filter(g => g.comps.has(main)), unreachable = groups.filter(g => !g.comps.has(main));
  let water = 0; for (let i = 0; i < n; i++) if (isWater(terr[i])) water++;
  const ok = reachable.length >= 3 && unreachable.length === 0;
  const reason = ok ? '' : reachable.length < 3 ? 'few' : 'landlocked';
  return { comp, main, mainSize: main >= 0 ? sizes[main] : 0, water, groups, reachable, unreachable, ok, reason };
}

const FIRST = ['Thimble', 'Bobbin', 'Skein', 'Purl', 'Gusset', 'Selvage', 'Tansy', 'Darning', 'Hemstitch', 'Basting', 'Pinwheel',
  'Tacking', 'Calico', 'Muslin', 'Ticking', 'Placket', 'Batting', 'Furbelow', 'Smocking', 'Bodkin', 'Ravel', 'Whipstitch',
  'Ruche', 'Sampler', 'Shuttle', 'Lisle', 'Gingham', 'Bias', 'Tatting', 'Fustian'];
const LAST = ['Quay', 'Haven', 'Cove', 'Landing', 'Wharf', 'Reach', 'Steps', 'Harbour', 'Hythe', 'Staithe', 'Mole', 'Pier'];

class Heap { // tiny binary heap for Dijkstra
  constructor() { this.k = []; this.v = []; }
  push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } }
  pop() { const k = this.k, v = this.v, top = v[0], last = k.length - 1; k[0] = k[last]; v[0] = v[last]; k.pop(); v.pop(); let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && k[l] < k[m]) m = l; if (r < k.length && k[r] < k[m]) m = r; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } return top; }
  get size() { return this.k.length; }
}
function seaDistances(sea, W, H, starts) {
  const n = W * H, d = new Float32Array(n).fill(Infinity), h = new Heap();
  for (const s of starts) { d[s] = 0; h.push(0, s); }
  while (h.size) {
    const i = h.pop(), x = i % W, y = (i / W) | 0, di = d[i];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const j = Y * W + X; if (!sea[j]) continue;
      if (dx && dy && (!sea[y * W + X] || !sea[Y * W + x])) continue; // no slipping between two corners
      const nd = di + (dx && dy ? 1.4142 : 1);
      if (nd < d[j]) { d[j] = nd; h.push(nd, j); }
    }
  }
  return d;
}

// Pick the ports of call, strike the rest, and work out a season that can always be sailed.
export const HOURS_PER_SEC = 2;           // one day passes in 12 seconds
export const PLAN_SPEED = 1.5;            // cells per second the planner assumes (tacking, fog, shallows)
export const UPWIND_SPEED = 1.05;         // worst case: a whole leg beating or rowing into the wind
export function finalizeChart(terrIn, W, H, seed, an, opts = {}) {
  const terr = terrIn.slice();
  const rnd = mulberry32(hash32('ports', seed));
  const cand = an.reachable.slice();
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const maxPorts = opts.maxPorts || 7, picked = [];
  for (const minD of [10, 7, 4, 0]) {
    for (const g of cand) {
      if (picked.length >= maxPorts) break;
      if (picked.includes(g)) continue;
      if (picked.every(p => Math.hypot(p.cx - g.cx, p.cy - g.cy) >= minD)) picked.push(g);
    }
    if (picked.length >= Math.min(maxPorts, Math.max(3, Math.ceil(cand.length * 0.6)))) break;
  }
  const struck = an.groups.filter(g => !picked.includes(g));
  for (const g of struck) for (const c of g.cells) terr[c] = 2; // unpicked moorings become beach
  const sea = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) sea[i] = an.comp[i] === an.main ? 1 : 0;
  const names = FIRST.slice(); const usedLast = [];
  const ports = picked.map((g, k) => {
    const docks = new Set();
    for (const c of g.cells) { const x = c % W, y = (c / W) | 0; for (const [dx, dy] of D4) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const q = Y * W + X; if (sea[q]) docks.add(q); } }
    const fi = Math.floor(rnd() * names.length); const first = names.splice(fi, 1)[0];
    let last = LAST[Math.floor(rnd() * LAST.length)]; if (usedLast.filter(l => l === last).length >= 1) last = LAST[Math.floor(rnd() * LAST.length)]; usedLast.push(last);
    return { id: k, name: first + ' ' + last, cells: g.cells.slice(), cx: g.cx, cy: g.cy, docks: [...docks] };
  });
  const dist = ports.map(p => seaDistances(sea, W, H, p.docks));
  const between = (a, b) => { let m = Infinity; for (const d of ports[b].docks) m = Math.min(m, dist[a][d]); return m; };
  // greedy tour from home
  const order = [0], legs = []; const left = new Set(ports.map(p => p.id)); left.delete(0);
  let cur = 0;
  while (left.size) { let bi = -1, bd = Infinity; for (const j of left) { const d = between(cur, j); if (d < bd) { bd = d; bi = j; } } order.push(bi); legs.push(bd); left.delete(bi); cur = bi; }
  const tour = legs.reduce((a, b) => a + b, 0), maxLeg = legs.length ? Math.max(...legs) : 0;
  const cellsPerDay = PLAN_SPEED * 24 / HOURS_PER_SEC;
  const seasonDays = Math.min(30, Math.max(8, Math.ceil(tour / cellsPerDay * 1.5 + 2)));
  const storesCap = Math.min(10, Math.max(3, Math.ceil(maxLeg / (UPWIND_SPEED * 24 / HOURS_PER_SEC) * 1.25 + 1.2)));
  const shoal = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (terr[i] !== 1) continue; const x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1 && !shoal[i]; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; if (terr[Y * W + X] === 5) { shoal[i] = 1; break; } }
  }
  return { W, H, terr, sea, shoal, ports, dist, order, legs, tour, maxLeg, seasonDays, storesCap,
    struck: struck.length, landlocked: an.unreachable.length, seaPct: Math.round(100 * an.water / (W * H)) };
}

export function terrHash(t) { let h = 2166136261 >>> 0; for (let i = 0; i < t.length; i++) { h ^= t[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

// Is this finished chart worth sailing? Returns the chart either way, so the best near-miss can be kept.
export const MIN_TOUR = 55;
export function judgeChart(terr, W, H, seed) {
  const an = analyseChart(terr, W, H);
  if (an.reachable.length < 3) return { ok: false, reason: 'few', an, chart: null, score: an.reachable.length };
  const chart = finalizeChart(terr, W, H, seed, an);
  let reason = '';
  if (an.unreachable.length) reason = 'landlocked';
  else if (chart.tour < MIN_TOUR) reason = 'huddled';
  return { ok: !reason, reason, an, chart, score: 100 + chart.ports.length * 20 + Math.min(chart.tour, 200) / 10 - an.unreachable.length * 5 };
}
