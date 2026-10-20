// Patchwork Isles: everything drawn. Fabrics, seams, coastlines, the cloth boat, buttons and cross-stitch.
import { mulberry32, hash32, isWater } from './loom.js';

export const INK = '#2b2620';
export const LINEN = '#efe6d3';
export const MADDER = '#b23a2b';
export const MUSTARD = '#d4a03c';
// fabric base colours and the thread used to top-stitch them
export const FAB = [
  { base: '#2f4a6b', thread: 'rgba(232,238,243,.82)' },
  { base: '#7fb0b8', thread: '#f6faf7' },
  { base: '#e6c88e', thread: '#94642f' },
  { base: '#a3b56b', thread: '#f3ecd3' },
  { base: '#4e6b3c', thread: '#d3dc98' },
  { base: '#8d877c', thread: '#f0ebdf' },
  { base: '#b23a2b', thread: '#f2c35a' },
];
export const ADM = { deep: '#f3eee2', shallow: '#cfe1de', land: '#ead6a7', ink: INK, contour: '#5d8a98', line: '#6f95a3' };

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

// ---------- fabrics ----------
const tileCache = new Map();
export function fabricTile(t, cs) {
  const P = Math.max(8, Math.round(cs * 2)), key = t + ':' + P;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = canvas(P, P), g = c.getContext('2d'), rnd = mulberry32(977 + t * 31);
  const lw = Math.max(0.6, P * 0.026);
  const wrap = (fn, x, y) => { for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) fn(x + ox, y + oy); };
  g.fillStyle = FAB[t].base; g.fillRect(0, 0, P, P);
  switch (t) {
    case 0: { // seigaiha waves in sashiko running stitch
      const r = P / 2;
      g.lineCap = 'round';
      for (let row = -3; row <= 6; row++) {
        const cy = row * P / 4, off = (row & 1) ? P / 2 : 0;
        for (let cx = -P + off; cx <= 2 * P; cx += P) {
          g.fillStyle = FAB[0].base; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(226,233,240,.6)'; g.lineWidth = lw; g.setLineDash([P * 0.055, P * 0.04]);
          for (const k of [0.9, 0.64, 0.38]) { g.beginPath(); g.arc(cx, cy, r * k, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); }
        }
      }
      g.setLineDash([]);
      break;
    }
    case 1: { // chambray cross-hatch
      g.strokeStyle = 'rgba(58,106,118,.3)'; g.lineWidth = lw * 0.8; const s = P / 4;
      for (let k = -P; k <= 2 * P; k += s) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + P, P); g.stroke(); g.beginPath(); g.moveTo(k, P); g.lineTo(k + P, 0); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.2)';
      for (let k = 0; k < 14; k++) { const x = rnd() * P, y = rnd() * P; wrap((X, Y) => g.fillRect(X, Y, P * 0.09, lw), x, y); }
      break;
    }
    case 2: { // calico sprigs
      for (let k = 0; k < 7; k++) {
        const x = rnd() * P, y = rnd() * P, a = rnd() * 6.28, d = P * 0.045;
        wrap((X, Y) => {
          g.fillStyle = '#b07f45'; for (let p = 0; p < 3; p++) { g.beginPath(); g.arc(X + Math.cos(a + p * 2.09) * d, Y + Math.sin(a + p * 2.09) * d, P * 0.028, 0, 7); g.fill(); }
          g.fillStyle = '#fff4d8'; g.beginPath(); g.arc(X, Y, P * 0.02, 0, 7); g.fill();
        }, x, y);
      }
      break;
    }
    case 3: { // gingham
      const b = P / 4; g.fillStyle = 'rgba(112,136,62,.36)';
      for (let k = 0; k < 4; k += 2) { g.fillRect(0, k * b, P, b); g.fillRect(k * b, 0, b, P); }
      g.fillStyle = 'rgba(255,255,240,.16)'; for (let k = 1; k < 4; k += 2) g.fillRect(k * b + b * 0.4, 0, lw, P);
      break;
    }
    case 4: { // French knots on wool
      for (let k = 0; k < 6; k++) {
        const x = rnd() * P, y = rnd() * P, r = P * (0.06 + rnd() * 0.03);
        wrap((X, Y) => {
          g.fillStyle = '#2f4a29'; g.beginPath(); g.arc(X, Y, r * 1.15, 0, 7); g.fill();
          g.fillStyle = '#6f8f4b'; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
          g.strokeStyle = '#3a5732'; g.lineWidth = Math.max(0.5, r * 0.28); g.beginPath(); g.arc(X, Y, r * 0.55, 0.4, 5.2); g.stroke();
          g.fillStyle = '#b1c87a'; g.beginPath(); g.arc(X - r * 0.35, Y - r * 0.35, r * 0.28, 0, 7); g.fill();
        }, x, y);
      }
      break;
    }
    case 5: { // tweed herringbone
      const cw = P / 4; g.strokeStyle = 'rgba(238,233,222,.3)'; g.lineWidth = lw;
      for (let c2 = 0; c2 < 4; c2++) { const dir = c2 % 2 ? 1 : -1; for (let y = -cw; y < P + cw; y += cw / 2) { g.beginPath(); g.moveTo(c2 * cw, y); g.lineTo((c2 + 1) * cw, y + dir * cw / 2); g.stroke(); } }
      g.fillStyle = 'rgba(40,36,30,.25)'; for (let k = 0; k < 18; k++) g.fillRect(rnd() * P, rnd() * P, lw * 1.2, lw * 1.2);
      break;
    }
    case 6: { // madder pinstripe
      g.strokeStyle = 'rgba(242,195,90,.5)'; g.lineWidth = lw;
      for (let x = P / 8; x < P; x += P / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, P); g.stroke(); }
      g.setLineDash([lw * 2, lw * 2]); g.strokeStyle = 'rgba(255,240,220,.35)';
      for (let y = P / 8; y < P; y += P / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(P, y); g.stroke(); }
      g.setLineDash([]);
      break;
    }
  }
  // the weave over everything
  g.globalAlpha = 0.06;
  const step = Math.max(2, P / 22);
  g.fillStyle = '#fff'; for (let y = 0; y < P; y += step) g.fillRect(0, y, P, Math.max(0.5, step * 0.3));
  g.fillStyle = '#000'; for (let x = step / 2; x < P; x += step) g.fillRect(x, 0, Math.max(0.5, step * 0.3), P);
  g.globalAlpha = 1;
  tileCache.set(key, c);
  return c;
}
const patCache = new WeakMap();
export function fabricPattern(ctx, t, cs) {
  let m = patCache.get(ctx); if (!m) { m = new Map(); patCache.set(ctx, m); }
  const key = t + ':' + Math.round(cs * 2);
  if (!m.has(key)) m.set(key, ctx.createPattern(fabricTile(t, cs), 'repeat'));
  return m.get(key);
}

// Unbleached muslin with a diamond quilting grid: the uncharted sea.
export function muslinTile(px) {
  const P = Math.max(16, Math.round(px)), key = 'muslin:' + P;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = canvas(P, P), g = c.getContext('2d'), rnd = mulberry32(5150);
  g.fillStyle = '#e7dcc5'; g.fillRect(0, 0, P, P);
  g.fillStyle = 'rgba(120,96,60,.07)'; for (let k = 0; k < 60; k++) g.fillRect(rnd() * P, rnd() * P, rnd() * P * 0.12, Math.max(0.6, P / 120));
  g.strokeStyle = 'rgba(118,96,64,.32)'; g.lineWidth = Math.max(0.7, P / 110); g.setLineDash([P / 26, P / 34]);
  for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(k * P, 0); g.lineTo(k * P + P, P); g.stroke(); g.beginPath(); g.moveTo(k * P + P, 0); g.lineTo(k * P, P); g.stroke(); }
  g.setLineDash([]);
  g.globalAlpha = 0.05; g.fillStyle = '#000'; const s = Math.max(2, P / 40); for (let x = 0; x < P; x += s) g.fillRect(x, 0, s * 0.35, P); g.globalAlpha = 1;
  tileCache.set(key, c);
  return c;
}

// ---------- contours ----------
// Trace the outline of every region of a cell mask. Loops run with the region on their right
// (clockwise round islands, anticlockwise round holes), so an inset always moves into the region.
export function traceLoops(mask, W, H) {
  const VW = W + 1, out = new Map(); let count = 0;
  const add = (x0, y0, x1, y1) => { const k = y0 * VW + x0; let a = out.get(k); if (!a) { a = []; out.set(k, a); } a.push({ x0, y0, x1, y1, dx: x1 - x0, dy: y1 - y0, used: false }); count++; };
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    if (!on(x, y - 1)) add(x, y, x + 1, y);
    if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!on(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const list of out.values()) for (const e0 of list) {
    if (e0.used) continue;
    const pts = []; let e = e0;
    for (let guard = 0; guard <= count; guard++) {
      e.used = true; pts.push([e.x0, e.y0]);
      const nexts = out.get(e.y1 * VW + e.x1); let nx = null;
      if (nexts) {
        const prefs = [[-e.dy, e.dx], [e.dx, e.dy], [e.dy, -e.dx]]; // right, straight, left
        for (const [px, py] of prefs) { nx = nexts.find(n => !n.used && n.dx === px && n.dy === py); if (nx) break; }
      }
      if (!nx) break; e = nx;
    }
    // keep only the corners
    const c = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], d = pts[(i + 1) % pts.length];
      if ((b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]) !== 0) c.push(b);
    }
    if (c.length >= 4) loops.push(c);
  }
  return loops;
}
// Add one loop to a path, inset by `inset` (negative = outset) and with rounded corners.
export function addLoop(path, loop, cs, inset, radius, ox = 0, oy = 0) {
  const n = loop.length, P = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], b = loop[i], c = loop[(i + 1) % n];
    const di = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])], dO = [Math.sign(c[0] - b[0]), Math.sign(c[1] - b[1])];
    P[i] = [ox + b[0] * cs + inset * (-di[1] - dO[1]), oy + b[1] * cs + inset * (di[0] + dO[0])];
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(P[n - 1], P[0]); path.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n], pr = P[(i - 1 + n) % n];
    const r = Math.max(0, Math.min(radius, Math.hypot(p[0] - pr[0], p[1] - pr[1]) / 2, Math.hypot(q[0] - p[0], q[1] - p[1]) / 2));
    path.arcTo(p[0], p[1], q[0], q[1], r);
  }
  path.closePath();
}
export function regionPath(loops, cs, inset, radius, ox, oy) { const p = new Path2D(); for (const l of loops) addLoop(p, l, cs, inset, radius, ox, oy); return p; }

// ---------- whole charts ----------
// opts: { margin } in px around the chart (used for the binding / neatline)
export function renderChart(ctx, terr, W, H, cs, style, opts = {}) {
  const M = opts.margin || 0;
  ctx.save();
  if (style === 'adm') renderAdmiralty(ctx, terr, W, H, cs, M, opts); else renderPatchwork(ctx, terr, W, H, cs, M, opts);
  ctx.restore();
}

function renderPatchwork(ctx, terr, W, H, cs, M, opts) {
  const n = W * H, CW = W * cs, CH = H * cs;
  if (M) { // bias binding round the quilt
    ctx.fillStyle = '#8e2b20'; ctx.fillRect(0, 0, CW + 2 * M, CH + 2 * M);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, CW + 2 * M, CH + 2 * M); ctx.clip();
    ctx.strokeStyle = 'rgba(242,195,90,.32)'; ctx.lineWidth = Math.max(1, M * 0.18);
    for (let k = -CH; k < CW + CH; k += M * 0.8) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + CH + 2 * M, CH + 2 * M); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,236,200,.75)'; ctx.lineWidth = Math.max(1, cs * 0.06); ctx.setLineDash([cs * 0.25, cs * 0.17]);
    ctx.strokeRect(M * 0.45, M * 0.45, CW + M * 1.1, CH + M * 1.1); ctx.setLineDash([]);
  }
  ctx.translate(M, M);
  ctx.fillStyle = LINEN; ctx.fillRect(0, 0, CW, CH);
  const all = [];
  for (let t = 0; t < 7; t++) {
    const mask = new Uint8Array(n); let any = false;
    for (let i = 0; i < n; i++) if (terr[i] === t) { mask[i] = 1; any = true; }
    if (!any) { all.push(null); continue; }
    const loops = traceLoops(mask, W, H); all.push(loops);
    ctx.fillStyle = fabricPattern(ctx, t, cs); ctx.fill(regionPath(loops, cs, 0, cs * 0.14));
  }
  // hazard stitches on shoals
  if (opts.shoal) {
    ctx.strokeStyle = '#8e2f22'; ctx.lineWidth = Math.max(0.8, cs * 0.075); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) if (opts.shoal[i]) {
      const x = (i % W + 0.5) * cs, y = (((i / W) | 0) + 0.5) * cs, s = cs * 0.16;
      ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke();
    }
  }
  // seams, then a running top-stitch just inside every patch
  for (let t = 0; t < 7; t++) {
    const loops = all[t]; if (!loops) continue;
    ctx.strokeStyle = 'rgba(43,38,32,.42)'; ctx.lineWidth = Math.max(0.8, cs * 0.05); ctx.setLineDash([]);
    ctx.stroke(regionPath(loops, cs, 0, cs * 0.14));
    if (cs >= 5) {
      ctx.strokeStyle = FAB[t].thread; ctx.lineWidth = Math.max(0.6, cs * 0.06); ctx.lineCap = 'round';
      ctx.setLineDash([cs * 0.2, cs * 0.15]);
      ctx.stroke(regionPath(loops, cs, cs * 0.17, cs * 0.1));
    }
  }
  ctx.setLineDash([]);
}

function landDistance(terr, W, H) { // Chebyshev distance to the nearest land cell
  const n = W * H, d = new Int16Array(n).fill(-1), q = [];
  for (let i = 0; i < n; i++) if (!isWater(terr[i])) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); } }
  }
  for (let i = 0; i < n; i++) if (d[i] < 0) d[i] = 99;
  return d;
}

function renderAdmiralty(ctx, terr, W, H, cs, M, opts) {
  const n = W * H, CW = W * cs, CH = H * cs;
  if (M) { // neatline with a graduated border
    ctx.fillStyle = '#f7f3e9'; ctx.fillRect(0, 0, CW + 2 * M, CH + 2 * M);
    const b = M * 0.32, x0 = M - b, y0 = M - b;
    ctx.fillStyle = INK;
    for (let k = 0; k < W; k += 2) { ctx.fillRect(M + k * cs, y0, cs, b * 0.8); ctx.fillRect(M + k * cs, M + CH + b * 0.2, cs, b * 0.8); }
    for (let k = 0; k < H; k += 2) { ctx.fillRect(x0, M + k * cs, b * 0.8, cs); ctx.fillRect(M + CW + b * 0.2, M + k * cs, b * 0.8, cs); }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, cs * 0.05);
    ctx.strokeRect(x0, y0, CW + 2 * b, CH + 2 * b); ctx.strokeRect(M, M, CW, CH);
    ctx.lineWidth = Math.max(1, cs * 0.09); ctx.strokeRect(x0 - b * 0.9, y0 - b * 0.9, CW + 3.8 * b, CH + 3.8 * b);
  }
  ctx.translate(M, M);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, CW, CH); ctx.clip();
  ctx.fillStyle = ADM.deep; ctx.fillRect(0, 0, CW, CH);
  ctx.globalAlpha = 0.05; ctx.fillStyle = '#000'; const ws = Math.max(2, cs / 6);
  for (let x = 0; x < CW; x += ws) ctx.fillRect(x, 0, ws * 0.3, CH); ctx.globalAlpha = 1;
  const R = cs * 0.46;
  const notDeep = new Uint8Array(n), land = new Uint8Array(n), awash = new Uint8Array(n);
  for (let i = 0; i < n; i++) { notDeep[i] = terr[i] !== 0 ? 1 : 0; land[i] = isWater(terr[i]) ? 0 : 1; }
  // lone rocks in the water are charted as rocks awash, not as islands
  for (let i = 0; i < n; i++) {
    if (terr[i] !== 5) continue; const cx = i % W, cy = (i / W) | 0; let wet = 0, rock = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const t = terr[Y * W + X]; if (isWater(t)) wet++; else rock++; }
    if (wet >= 6) { awash[i] = 1; land[i] = 0; }
  }
  const shallowLoops = traceLoops(notDeep, W, H), landLoops = traceLoops(land, W, H);
  const shallowPath = regionPath(shallowLoops, cs, 0, R), landPath = regionPath(landLoops, cs, 0, R);
  ctx.fillStyle = ADM.shallow; ctx.fill(shallowPath);
  // dotted depth contour
  ctx.strokeStyle = ADM.contour; ctx.lineWidth = Math.max(0.8, cs * 0.06); ctx.lineCap = 'round';
  ctx.setLineDash([0.01, cs * 0.2]); ctx.stroke(shallowPath); ctx.setLineDash([]);
  // water-lining: running stitch echoing the coast, clipped to the water
  ctx.save();
  const clip = new Path2D(); clip.rect(0, 0, CW, CH); clip.addPath(landPath); ctx.clip(clip, 'evenodd');
  ctx.strokeStyle = ADM.line; ctx.lineWidth = Math.max(0.6, cs * 0.035);
  for (const [d, a] of [[0.26, 0.75], [0.52, 0.5], [0.8, 0.28]]) {
    ctx.globalAlpha = a; ctx.setLineDash([cs * 0.16, cs * 0.12]);
    ctx.stroke(regionPath(landLoops, cs, -d * cs, R + d * cs));
  }
  ctx.restore(); ctx.globalAlpha = 1; ctx.setLineDash([]);
  // land
  ctx.fillStyle = ADM.land; ctx.fill(landPath);
  ctx.save(); ctx.clip(landPath);
  ctx.globalAlpha = 0.22; ctx.strokeStyle = '#9b7a45'; ctx.lineWidth = Math.max(0.5, cs * 0.03);
  for (let k = -CH; k < CW; k += cs * 0.33) { ctx.beginPath(); ctx.moveTo(k, CH); ctx.lineTo(k + CH, 0); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
  const rnd = mulberry32(hash32('adm', W, H));
  const cell = i => [(i % W + 0.5) * cs, (((i / W) | 0) + 0.5) * cs];
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = terr[i]; if (t < 3) continue;
    const [x, y] = cell(i), j = (rnd() - 0.5) * cs * 0.25;
    if (t === 4) { // stitched trees
      ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(0.6, cs * 0.05);
      ctx.beginPath(); ctx.moveTo(x + j, y + cs * 0.28); ctx.lineTo(x + j, y - cs * 0.02); ctx.stroke();
      ctx.fillStyle = '#5b7a46'; ctx.beginPath(); ctx.arc(x + j, y - cs * 0.1, cs * 0.2, 0, 7); ctx.fill();
      ctx.strokeStyle = '#3c5530'; ctx.stroke();
    } else if (t === 3 && rnd() < 0.45) { // tufts
      ctx.strokeStyle = '#7f9150'; ctx.lineWidth = Math.max(0.5, cs * 0.04);
      for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(x + j, y + cs * 0.12); ctx.lineTo(x + j + a * cs * 0.18, y - cs * 0.12); ctx.stroke(); }
    } else if (t === 5 && !awash[i]) { // hachured fell
      ctx.strokeStyle = '#6f6556'; ctx.lineWidth = Math.max(0.7, cs * 0.06);
      ctx.beginPath(); ctx.moveTo(x - cs * 0.28, y + cs * 0.18); ctx.lineTo(x, y - cs * 0.2); ctx.lineTo(x + cs * 0.28, y + cs * 0.18); ctx.stroke();
    }
  }
  // the coastline: firm ink, then a quilting line just inland
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, cs * 0.075); ctx.stroke(landPath);
  if (cs >= 6) { ctx.strokeStyle = 'rgba(138,104,58,.75)'; ctx.lineWidth = Math.max(0.5, cs * 0.04); ctx.setLineDash([cs * 0.16, cs * 0.12]); ctx.stroke(regionPath(landLoops, cs, cs * 0.18, R * 0.7)); ctx.setLineDash([]); }
  // rocks awash: a cross with a dot in each quarter
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = Math.max(0.8, cs * 0.075);
  for (let i = 0; i < n; i++) if (awash[i]) {
    const [x, y] = cell(i), r = cs * 0.3; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { ctx.beginPath(); ctx.arc(x + a * r * 0.5, y + b * r * 0.5, Math.max(0.7, cs * 0.05), 0, 7); ctx.fill(); }
  }
  // shoals: tiny hazard crosses
  if (opts.shoal) {
    ctx.strokeStyle = 'rgba(43,38,32,.6)'; ctx.lineWidth = Math.max(0.6, cs * 0.045);
    for (let i = 0; i < n; i++) if (opts.shoal[i] && (i * 7 + 3) % 3 === 0) { const [x, y] = cell(i), s = cs * 0.1; ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke(); }
  }
  // soundings
  if (cs >= 9) {
    const dl = landDistance(terr, W, H);
    ctx.fillStyle = 'rgba(43,38,32,.55)'; ctx.font = `${Math.round(cs * 0.42)}px "Special Elite", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      if (terr[i] !== 0 || dl[i] < 3) continue;
      const h = hash32('snd', i); if (h % 19) continue;
      const [x, y] = cell(i); ctx.fillText(String(2 + dl[i] * 2 + (h >> 8) % 4), x, y);
    }
  }
  if (opts.rose) drawRose(ctx, CW - cs * 6.2, CH - cs * 6.2, cs * 4.4);
  ctx.restore();
}

export function drawRose(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.55;
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(0.8, r * 0.018);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, 7); ctx.stroke();
  for (let k = 0; k < 32; k++) { const a = k * Math.PI / 16, l = k % 4 ? 0.8 : 0.72; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88); ctx.lineTo(Math.cos(a) * r * l, Math.sin(a) * r * l); ctx.stroke(); }
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 - Math.PI / 2, l = k % 2 ? 0.5 : 0.82, w = k % 2 ? 0.07 : 0.11;
    ctx.fillStyle = k % 2 ? '#c9b48a' : (k === 0 ? MADDER : INK);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * l, Math.sin(a) * r * l); ctx.lineTo(Math.cos(a + Math.PI / 2) * r * w, Math.sin(a + Math.PI / 2) * r * w);
    ctx.lineTo(0, 0); ctx.lineTo(Math.cos(a - Math.PI / 2) * r * w, Math.sin(a - Math.PI / 2) * r * w); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 0.8; ctx.fillStyle = INK; ctx.font = `${Math.round(r * 0.22)}px "Special Elite", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -r * 1.04);
  ctx.restore();
}

// one cell while it is being sewn (preview canvases)
export function drawCell(ctx, i, t, W, cs, style) {
  const x = (i % W) * cs, y = ((i / W) | 0) * cs;
  if (style === 'adm') ctx.fillStyle = t === 0 ? ADM.deep : t === 1 ? ADM.shallow : t === 6 ? '#d9a08d' : t === 4 ? '#c7cd96' : t === 5 ? '#c9bfa8' : ADM.land;
  else ctx.fillStyle = fabricPattern(ctx, t, cs);
  ctx.fillRect(x, y, cs, cs);
}

// ---------- the cloth boat ----------
// x,y screen px; h heading (rad); s = px per cell; sail 0..2; boom = sail angle relative to the hull
export function drawBoat(ctx, x, y, h, s, sail, boom, time, opts = {}) {
  const L = s * 1.3, B = s * 0.56;
  ctx.save(); ctx.translate(x, y);
  // shadow on the water
  ctx.save(); ctx.rotate(h); ctx.fillStyle = 'rgba(20,24,36,.24)'; ctx.beginPath(); ctx.ellipse(s * 0.08, s * 0.12, L * 0.55, B * 0.52, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.rotate(h);
  if (opts.tilt) ctx.scale(1, 1 - opts.tilt);
  const hull = new Path2D();
  hull.moveTo(L * 0.52, 0);
  hull.quadraticCurveTo(L * 0.22, B * 0.62, -L * 0.46, B * 0.4);
  hull.quadraticCurveTo(-L * 0.52, 0, -L * 0.46, -B * 0.4);
  hull.quadraticCurveTo(L * 0.22, -B * 0.62, L * 0.52, 0);
  ctx.fillStyle = '#c9472f'; ctx.fill(hull);
  ctx.save(); ctx.clip(hull); // gingham hull
  ctx.fillStyle = 'rgba(255,238,214,.38)';
  for (let k = -L; k < L; k += s * 0.16) ctx.fillRect(k, -B, s * 0.07, B * 2);
  for (let k = -B; k < B; k += s * 0.16) ctx.fillRect(-L, k, L * 2, s * 0.07);
  ctx.restore();
  ctx.strokeStyle = '#5a1d14'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke(hull);
  ctx.save(); ctx.scale(0.78, 0.7); ctx.strokeStyle = '#fbe9cf'; ctx.lineWidth = Math.max(0.8, s * 0.045); ctx.setLineDash([s * 0.09, s * 0.07]); ctx.stroke(hull); ctx.restore();
  // mast and sail
  const mx = L * 0.14;
  if (sail > 0.05) {
    const k = Math.min(1, sail / 2), len = L * (0.5 + 0.32 * k), sgn = Math.sign(boom || 0.001);
    const bx = mx + Math.cos(Math.PI + boom) * len, by = Math.sin(Math.PI + boom) * len;
    const nx = -by / len, ny = (bx - mx) / len; // normal to the boom
    const bel = len * (0.22 + 0.22 * k) * sgn, cx = (mx + bx) / 2 + nx * bel, cy = by / 2 + ny * bel;
    const sailP = new Path2D(); sailP.moveTo(mx, 0); sailP.quadraticCurveTo(cx, cy, bx, by); sailP.lineTo(mx, 0);
    ctx.save(); ctx.translate(s * 0.06, s * 0.09); ctx.fillStyle = 'rgba(20,24,36,.22)'; ctx.fill(sailP); ctx.restore();
    ctx.fillStyle = '#fbf5e6'; ctx.fill(sailP); ctx.strokeStyle = '#5b4a35'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke(sailP);
    ctx.setLineDash([s * 0.07, s * 0.06]); ctx.strokeStyle = 'rgba(178,58,43,.75)'; ctx.lineWidth = Math.max(0.8, s * 0.035);
    for (const f of [0.38, 0.68]) { ctx.beginPath(); ctx.moveTo(mx + (bx - mx) * f, by * f); ctx.lineTo(mx + (bx - mx) * f + nx * bel * 0.9 * (1 - Math.abs(0.5 - f)), by * f + ny * bel * 0.9 * (1 - Math.abs(0.5 - f))); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(1, s * 0.06); ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(bx, by); ctx.stroke();
  } else { // furled, oars out
    ctx.strokeStyle = '#4a3a24'; ctx.lineWidth = Math.max(1, s * 0.05);
    const sw = Math.sin(time * 5) * 0.35;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.05, side * B * 0.3); ctx.lineTo(-L * 0.05 - Math.sin(sw) * s * 0.4, side * B * 1.05); ctx.stroke(); }
    ctx.fillStyle = '#efe4cc'; ctx.beginPath(); ctx.ellipse(mx - L * 0.15, 0, L * 0.22, B * 0.14, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#4a3a24'; ctx.beginPath(); ctx.arc(mx, 0, Math.max(1.4, s * 0.06), 0, 7); ctx.fill();
  ctx.restore();
  // pennant points downwind (drawn upright, in screen space)
  if (opts.windTo !== undefined) {
    const a = opts.windTo, fl = Math.sin(time * 9) * 0.25;
    const px = x + Math.cos(h) * mx, py = y + Math.sin(h) * mx;
    ctx.fillStyle = MUSTARD; ctx.strokeStyle = '#7a5a1c'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a - 0.22 + fl) * s * 0.45, py + Math.sin(a - 0.22 + fl) * s * 0.45);
    ctx.lineTo(px + Math.cos(a + 0.22 + fl) * s * 0.45, py + Math.sin(a + 0.22 + fl) * s * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

// ---------- harbour buttons ----------
// state: 'known' (pencilled in), 'seen', 'visited', 'home'
export function drawButton(ctx, x, y, r, state, glow) {
  ctx.save(); ctx.translate(x, y);
  if (glow) { const g = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 3); g.addColorStop(0, `rgba(255,214,120,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, 7); ctx.fill(); }
  const visited = state === 'visited' || state === 'home';
  ctx.fillStyle = 'rgba(20,16,10,.3)'; ctx.beginPath(); ctx.arc(r * 0.12, r * 0.16, r, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  if (visited) { g.addColorStop(0, '#f5d07a'); g.addColorStop(1, '#b07a22'); } else { g.addColorStop(0, '#fbf3e1'); g.addColorStop(1, '#cdbb98'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = visited ? '#7a5214' : '#8f7c5c'; ctx.lineWidth = Math.max(0.8, r * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.strokeStyle = visited ? 'rgba(122,82,20,.6)' : 'rgba(143,124,92,.55)'; ctx.lineWidth = Math.max(0.6, r * 0.06); ctx.stroke();
  const hd = r * 0.26, hr = Math.max(0.8, r * 0.11);
  ctx.fillStyle = visited ? '#5d3d0f' : '#7c6a4c';
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.arc(a * hd, b * hd, hr, 0, 7); ctx.fill(); }
  if (visited) { // sewn on with red thread
    ctx.strokeStyle = MADDER; ctx.lineWidth = Math.max(1, r * 0.17); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hd, -hd); ctx.lineTo(hd, hd); ctx.moveTo(hd, -hd); ctx.lineTo(-hd, hd); ctx.stroke();
  } else if (state === 'known') {
    ctx.strokeStyle = 'rgba(178,58,43,.8)'; ctx.lineWidth = Math.max(0.8, r * 0.09); ctx.setLineDash([r * 0.25, r * 0.18]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.38, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  if (state === 'home') { ctx.fillStyle = MADDER; ctx.beginPath(); ctx.moveTo(0, -r * 1.75); ctx.lineTo(r * 0.38, -r * 1.2); ctx.lineTo(-r * 0.38, -r * 1.2); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// ---------- cross-stitch lettering ----------
const G5 = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11100100101000110001100011001011100', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', ' ': '00000000000000000000000000000000000',
  "'": '00100001000000000000000000000000000', '!': '00100001000010000100001000000000100',
};
export function stitchCells(lines) {
  const cells = []; let w = 0;
  lines.forEach((line, li) => {
    let cx = 0;
    for (const ch of line.toUpperCase()) {
      const g = G5[ch] || G5[' '];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r * 5 + c] === '1') cells.push({ x: cx + c, y: li * 9 + r, order: cx + c + li * 200 });
      cx += 6;
    }
    w = Math.max(w, cx - 1);
  });
  cells.sort((a, b) => a.order - b.order || a.y - b.y);
  return { cells, w, h: lines.length * 9 - 2 };
}
export function drawStitches(ctx, layout, s, ox, oy, progress, color = MADDER) {
  const n = layout.cells.length, upto = progress * n;
  ctx.save(); ctx.lineCap = 'round';
  for (let k = 0; k < n && k < upto; k++) {
    const c = layout.cells[k], x = ox + c.x * s, y = oy + c.y * s, p = s * 0.16, half = upto - k < 1;
    ctx.strokeStyle = 'rgba(60,20,12,.28)'; ctx.lineWidth = s * 0.26;
    ctx.beginPath(); ctx.moveTo(x + p + s * 0.05, y + s - p + s * 0.06); ctx.lineTo(x + s - p + s * 0.05, y + p + s * 0.06); if (!half) { ctx.moveTo(x + p + s * 0.05, y + p + s * 0.06); ctx.lineTo(x + s - p + s * 0.05, y + s - p + s * 0.06); } ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = s * 0.24;
    ctx.beginPath(); ctx.moveTo(x + p, y + s - p); ctx.lineTo(x + s - p, y + p); ctx.stroke();
    if (!half) { ctx.strokeStyle = shade(color, 18); ctx.beginPath(); ctx.moveTo(x + p, y + p); ctx.lineTo(x + s - p, y + s - p); ctx.stroke(); }
  }
  ctx.restore();
}
function shade(hex, amt) { const v = parseInt(hex.slice(1), 16); const r = Math.min(255, (v >> 16) + amt), g = Math.min(255, ((v >> 8) & 255) + amt), b = Math.min(255, (v & 255) + amt); return `rgb(${r},${g},${b})`; }
export function drawAida(ctx, w, h, s, alpha = 0.12) { // the holes of aida cloth
  ctx.save(); ctx.fillStyle = `rgba(90,70,40,${alpha})`;
  for (let y = 0; y <= h; y += s) for (let x = 0; x <= w; x += s) ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
  ctx.restore();
}

// ---------- the Admiralty pattern sheet ----------
export function drawPiece(ctx, q, x, y, size) {
  const h = size / 2, cols = { 0: ADM.deep, 1: ADM.shallow, 2: ADM.land, 3: '#d9d39a', 4: '#bfcb8e', 5: '#cbbfa6', 6: '#e0a28f', 7: ADM.shallow };
  const quad = [[0, 0], [h, 0], [h, h], [0, h]];
  q.forEach((t, k) => { ctx.fillStyle = cols[t]; ctx.fillRect(x + quad[k][0], y + quad[k][1], h, h); });
  q.forEach((t, k) => {
    const cx = x + quad[k][0] + h / 2, cy = y + quad[k][1] + h / 2;
    if (t === 7 || t === 5) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - h * 0.2, cy); ctx.lineTo(cx + h * 0.2, cy); ctx.moveTo(cx, cy - h * 0.2); ctx.lineTo(cx, cy + h * 0.2); ctx.stroke(); }
    if (t === 4) { ctx.fillStyle = '#5b7a46'; ctx.beginPath(); ctx.arc(cx, cy - h * 0.05, h * 0.2, 0, 7); ctx.fill(); }
    if (t === 6) { ctx.fillStyle = MADDER; ctx.beginPath(); ctx.arc(cx, cy, h * 0.16, 0, 7); ctx.fill(); }
  });
  // coast where land meets sea, drawn along the shared corners
  const land = q.map(t => t >= 2 && t !== 7);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (land[0] !== land[1]) { ctx.moveTo(x + h, y); ctx.lineTo(x + h, y + h); }
  if (land[1] !== land[2]) { ctx.moveTo(x + h, y + h); ctx.lineTo(x + size, y + h); }
  if (land[2] !== land[3]) { ctx.moveTo(x + h, y + h); ctx.lineTo(x + h, y + size); }
  if (land[3] !== land[0]) { ctx.moveTo(x, y + h); ctx.lineTo(x + h, y + h); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(43,38,32,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}
