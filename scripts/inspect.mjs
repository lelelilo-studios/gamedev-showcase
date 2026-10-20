#!/usr/bin/env node
// Screenshot a page and collect console errors with headless Chrome. No dependencies (Node 22+).
//
//   node scripts/inspect.mjs showcases/03-joltphysics/ --out /data/scratch/gamedev-showcase/shots/03
//   node scripts/inspect.mjs https://example.com --sizes 1440x900 --wait 4000
//
// Options
//   --out DIR            where PNGs go (default <scratch>/shots)
//   --name NAME          file name prefix (default: derived from the path)
//   --sizes WxH,WxH      viewports (default 1440x900,390x844)
//   --wait MS            time to let the page run after load (default 2500)
//   --scroll F[,F...]    also capture after scrolling to these fractions of the page (0..1)
//   --eval JS            run this expression after load (before the wait), e.g. a click
//   --probe JS           evaluate this after the wait and put the value in the report (layout[].probe)
//   --reduced-motion     emulate prefers-reduced-motion: reduce
//   --dark | --light     emulate prefers-color-scheme
//   --webgpu             launch Chrome with WebGPU enabled
//   --full               full-page screenshot instead of the viewport
//   --hide SELECTOR      hide these elements just before each screenshot (e.g. [data-specimen-tag])
//   --steps FILE|JSON    a playtest script, run at each size after the first screenshot (see below)
//   --timeout S          give up after S seconds (default 120)
//
// Steps: a JSON array (inline or in a file). Coordinates are CSS pixels, or fractions of the viewport if <= 1.
//   {"wait": 500}                          let the page run
//   {"eval": "window.__game.start()"}      run JS (promises are awaited)
//   {"probe": "window.__game.state()", "as": "afterStart"}   put a value in the report (layout[].steps)
//   {"key": "ArrowLeft", "hold": 400}      hold a key down for 400 ms (real CDP key events)
//   {"press": "Space"}                     tap a key (Space, Enter, Escape, Tab, Shift, ArrowUp, KeyA, a, 1, ...)
//   {"click": [0.5, 0.6]}                  mouse click
//   {"tap": [195, 700]}                    touch tap
//   {"drag": [[0.2, 0.8], [0.5, 0.8]], "ms": 300, "touch": true}   drag (mouse, or touch)
//   {"shot": "playing"}                    screenshot, saved as <name>-<size>-<label>.png
//
// A path that isn't http(s) is served from the repo root by a built-in static server.
// Chrome gets its own --user-data-dir under the scratch folder and is always
// killed on exit, even on errors or Ctrl-C.

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

// Scratch space for screenshots and Chrome profiles: $GS_SCRATCH, else /data/scratch (this repo's home machine), else the system temp folder.
const SCRATCH = process.env.GS_SCRATCH || (existsSync('/data/scratch') ? '/data/scratch/gamedev-showcase' : join(tmpdir(), 'gamedev-showcase'));
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const opt = { sizes: '1440x900,390x844', wait: 2500, out: join(SCRATCH, 'shots') };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { pos.push(a); continue; }
  const k = a.slice(2);
  if (['reduced-motion', 'dark', 'light', 'webgpu', 'full'].includes(k)) opt[k] = true;
  else opt[k] = argv[++i];
}
if (!pos[0]) { console.error('usage: node scripts/inspect.mjs <path-or-url> [options]'); process.exit(2); }

let chrome, server, udd, ws;
function killChrome() {
  // Chrome runs as its own process group (detached), so this also reaches the GPU, renderer and zygote children.
  if (!chrome || chrome.exitCode !== null) return;
  try { process.kill(-chrome.pid, 'SIGKILL'); } catch { try { chrome.kill('SIGKILL'); } catch {} }
}
function cleanup() {
  killChrome();
  try { server && server.close(); } catch {}
  try { udd && rmSync(udd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {}
}
async function shutdown(code) {
  // Normal exit: ask Chrome to close, wait for it to exit, then delete its profile folder.
  try { ws && ws.readyState === 1 && ws.send(JSON.stringify({ id: 999999, method: 'Browser.close' })); } catch {}
  await new Promise(r => { if (!chrome || chrome.exitCode !== null) return r(); chrome.once('exit', r); setTimeout(r, 3000); });
  killChrome();
  await new Promise(r => setTimeout(r, 150));
  cleanup();
  process.exit(code);
}
process.on('exit', cleanup);
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { cleanup(); process.exit(130); });
process.on('uncaughtException', e => { console.error('inspect failed:', e.message); cleanup(); process.exit(1); });
process.on('unhandledRejection', e => { console.error('inspect failed:', e && e.message); cleanup(); process.exit(1); });
const TIMEOUT_S = Number(opt.timeout || 120);
setTimeout(() => { console.error(`inspect: overall timeout (${TIMEOUT_S} s)`); cleanup(); process.exit(1); }, TIMEOUT_S * 1000).unref();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.ico': 'image/x-icon' };

async function startServer() {
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return server.address().port;
}

let url = pos[0];
if (!/^(https?|data|file):/.test(url)) {
  const port = await startServer();
  url = `http://127.0.0.1:${port}/${url.replace(/^\.?\//, '')}`;
}
const name = opt.name || pos[0].replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page';
mkdirSync(opt.out, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
udd = mkdtempSync(join(SCRATCH, 'chrome-'));

const flags = ['--headless=new', `--user-data-dir=${udd}`, '--remote-debugging-port=0', '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--disable-extensions',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--window-size=1440,900'];
if (opt.webgpu) flags.push(...(process.env.WEBGPU_FLAGS || '--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan --ignore-gpu-blocklist').split(' '));
chrome = spawn('google-chrome', [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore'], detached: true });

const portFile = join(udd, 'DevToolsActivePort');
for (let i = 0; i < 200 && !existsSync(portFile); i++) await new Promise(r => setTimeout(r, 50));
if (!existsSync(portFile)) throw new Error('Chrome did not start');
const dport = readFileSync(portFile, 'utf8').split('\n')[0];
const targets = await (await fetch(`http://127.0.0.1:${dport}/json/list`)).json();
ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let id = 0; const pending = new Map(); const listeners = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { r, j } = pending.get(m.id); pending.delete(m.id); m.error ? j(new Error(m.error.message)) : r(m.result); }
  else if (m.method) listeners.forEach(l => l(m));
};
const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; pending.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method, params })); });
const once = method => new Promise(r => { const l = m => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); r(m.params); } }; listeners.push(l); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Playtest steps (--steps): inline JSON or a file path.
const STEPS = opt.steps ? JSON.parse(opt.steps.trim().startsWith('[') ? opt.steps : readFileSync(opt.steps, 'utf8')) : null;
const NAMED = { Space: [' ', 'Space', 32], Enter: ['Enter', 'Enter', 13], Escape: ['Escape', 'Escape', 27], Esc: ['Escape', 'Escape', 27],
  Tab: ['Tab', 'Tab', 9], Shift: ['Shift', 'ShiftLeft', 16], Control: ['Control', 'ControlLeft', 17], Backspace: ['Backspace', 'Backspace', 8],
  ArrowLeft: ['ArrowLeft', 'ArrowLeft', 37], ArrowUp: ['ArrowUp', 'ArrowUp', 38], ArrowRight: ['ArrowRight', 'ArrowRight', 39], ArrowDown: ['ArrowDown', 'ArrowDown', 40] };
function keyInfo(k) {
  if (NAMED[k]) { const [key, code, vk] = NAMED[k]; return { key, code, vk, text: key === ' ' ? ' ' : (key === 'Enter' ? '\r' : '') }; }
  let ch = k;
  if (/^Key[A-Z]$/.test(k)) ch = k[3].toLowerCase();
  if (/^Digit[0-9]$/.test(k)) ch = k[5];
  if (ch.length === 1) {
    const up = ch.toUpperCase();
    const code = /[a-z]/i.test(ch) ? 'Key' + up : /[0-9]/.test(ch) ? 'Digit' + ch : '';
    return { key: ch, code, vk: up.charCodeAt(0), text: ch };
  }
  return { key: k, code: k, vk: 0, text: '' };
}
const key = (dir, k) => send('Input.dispatchKeyEvent', dir === 'down'
  ? { type: k.text ? 'keyDown' : 'rawKeyDown', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, text: k.text || undefined, unmodifiedText: k.text || undefined }
  : { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk });

const problems = [];
listeners.push(m => {
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails; problems.push({ kind: 'exception', text: (d.exception && d.exception.description) || d.text, at: d.url ? `${d.url}:${d.lineNumber}` : '' });
  } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) {
    problems.push({ kind: 'console.error', text: m.params.args.map(a => a.value ?? a.description ?? '').join(' ') });
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'warning') {
    problems.push({ kind: 'console.warn', text: m.params.args.map(a => a.value ?? a.description ?? '').join(' ') });
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    problems.push({ kind: 'log', text: m.params.entry.text, at: m.params.entry.url || '' });
  }
});
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
const features = [];
if (opt['reduced-motion']) features.push({ name: 'prefers-reduced-motion', value: 'reduce' });
if (opt.dark) features.push({ name: 'prefers-color-scheme', value: 'dark' });
if (opt.light) features.push({ name: 'prefers-color-scheme', value: 'light' });
if (features.length) await send('Emulation.setEmulatedMedia', { features });

const report = { url, shots: [], layout: [], problems };
for (const size of opt.sizes.split(',')) {
  const [w, h] = size.split('x').map(Number);
  const mobile = w < 600;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await Promise.race([loaded, sleep(20000)]);
  if (opt.eval) { try { await send('Runtime.evaluate', { expression: opt.eval, awaitPromise: true }); } catch (e) { problems.push({ kind: 'eval', text: e.message }); } }
  await sleep(Number(opt.wait));
  const lay = await send('Runtime.evaluate', { returnByValue: true, expression:
    `({w: innerWidth, scrollW: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, title: document.title,
       gpu: !!navigator.gpu})` });
  const L = lay.result.value; L.size = size; L.overflowX = L.scrollW > L.w + 1; report.layout.push(L);
  if (opt.probe) { try { const pr = await send('Runtime.evaluate', { expression: opt.probe, awaitPromise: true, returnByValue: true }); L.probe = pr.result.value ?? pr.result.description; } catch (e) { L.probe = 'probe failed: ' + e.message; } }
  const shoot = async suffix => {
    if (opt.hide) await send('Runtime.evaluate', { expression: `document.querySelectorAll(${JSON.stringify(opt.hide)}).forEach(e => e.style.setProperty('display', 'none', 'important'))` });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!opt.full });
    const f = join(opt.out, `${name}-${size}${suffix}.png`);
    writeFileSync(f, Buffer.from(shot.data, 'base64')); report.shots.push(f);
  };
  await shoot('');
  if (STEPS) {
    L.steps = {};
    const px = (v, dim) => (v <= 1 ? v * dim : v);
    const pt = a => ({ x: px(a[0], w), y: px(a[1], h) });
    for (const st of STEPS) {
      try {
        if (st.wait) await sleep(st.wait);
        else if (st.eval) await send('Runtime.evaluate', { expression: st.eval, awaitPromise: true });
        else if (st.probe) { const r = await send('Runtime.evaluate', { expression: st.probe, awaitPromise: true, returnByValue: true }); L.steps[st.as || st.probe] = r.result.value ?? r.result.description ?? null; }
        else if (st.key || st.press) { const k = keyInfo(st.key || st.press); await key('down', k); await sleep(st.hold || 60); await key('up', k); }
        else if (st.click) { const { x, y } = pt(st.click); for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); }
        else if (st.tap) { const { x, y } = pt(st.tap); await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(60); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
        else if (st.drag) {
          const a = pt(st.drag[0]), b = pt(st.drag[1]), n = 12, ms = st.ms || 300;
          if (st.touch) {
            await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
            for (let i = 1; i <= n; i++) { await sleep(ms / n); await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }] }); }
            if (st.hold) await sleep(st.hold);
            await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } else {
            await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...a });
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...a, button: 'left', buttons: 1, clickCount: 1 });
            for (let i = 1; i <= n; i++) { await sleep(ms / n); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n, button: 'left', buttons: 1 }); }
            if (st.hold) await sleep(st.hold);
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...b, button: 'left', buttons: 0, clickCount: 1 });
          }
        }
        else if (st.shot) await shoot('-' + String(st.shot).replace(/[^a-z0-9_-]+/gi, '-'));
      } catch (e) { problems.push({ kind: 'step', text: `${JSON.stringify(st).slice(0, 80)}: ${e.message}` }); }
    }
  }
  if (opt.scroll) for (const fr of opt.scroll.split(',').map(Number)) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * ${fr})` });
    await sleep(Math.min(1500, Number(opt.wait)));
    await shoot(`-s${Math.round(fr * 100)}`);
  }
}
// De-duplicate repeated messages (one per viewport run)
const seen = new Set(); report.problems = problems.filter(p => { const k = p.kind + p.text; if (seen.has(k)) return false; seen.add(k); return true; });
report.errors = report.problems.filter(p => p.kind !== 'console.warn').length;
console.log(JSON.stringify(report, null, 2));
await shutdown(0);
