/* Hedge Witch: presentation. Renders the sim, turns its events into effects, sound and HUD, and reads input.
   A classic script so the page also opens from file:// where the browser allows it; the inline module passes THREE in. */
(function () {
  'use strict';
  window.HW_MAIN = function (THREE) {
    var C = window.HW_CONTENT, SIM = window.HW_SIM;
    var $ = function (s) { return document.querySelector(s); };
    var qs = new URLSearchParams(location.search);
    var inFrame = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var touchFirst = matchMedia('(pointer: coarse)').matches;
    var DT = 1 / 60;
    var MAXSTEPS = Math.max(6, Math.min(40, parseInt(new URLSearchParams(location.search).get('maxsteps'), 10) || 6));
    var issues = C.validate(); if (issues.length) console.warn('content:', issues);

    // ------------------------------------------------------------ storage and settings
    var store = {
      get: function (k, d) { try { var v = localStorage.getItem('hedgewitch:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { localStorage.setItem('hedgewitch:' + k, JSON.stringify(v)); } catch (e) {} }
    };
    var settings = Object.assign({ muted: false, flashes: reduced ? 'safe' : 'full', shake: !reduced, quality: 'auto' }, store.get('settings', {}));
    function saveSettings() { store.set('settings', settings); }
    var autoLow = touchFirst && Math.min(screen.width, screen.height) < 900 || (navigator.deviceMemory && navigator.deviceMemory < 4);
    var Q = qs.get('quality') || (settings.quality === 'auto' ? (autoLow ? 'low' : 'high') : settings.quality);
    var LOW = Q === 'low';

    function dailySeed() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
    var seed = qs.has('seed') ? ((parseInt(qs.get('seed'), 10) >>> 0) || 1) : dailySeed();
    var seedDaily = !qs.has('seed');

    // ------------------------------------------------------------ renderer and composite
    var stage = $('#stage');
    var renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
    var DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 1.75);
    renderer.setPixelRatio(DPR);
    stage.appendChild(renderer.domElement);
    var hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    var rt = new THREE.WebGLRenderTarget(4, 4, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, samples: 0 });
    var useFxaa = !LOW;
    var compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uExposure: { value: 1.0 }, uTime: { value: 0 }, uFxaa: { value: useFxaa ? 1 : 0 },
        uImp: { value: 0 }, uImpMode: { value: 0 }, uImpC: { value: new THREE.Vector2(0.5, 0.5) }, uImpR: { value: 0.3 }, uImpSeed: { value: 0 },
        uInk: { value: new THREE.Color() }, uPaper: { value: new THREE.Color() }, uDim: { value: 0 }, uHurt: { value: 0 }, uVig: { value: 0.75 }, uChill: { value: 0 }
      },
      depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tScene; uniform vec2 uRes; uniform float uExposure, uTime, uFxaa, uImp, uImpMode, uImpR, uImpSeed, uDim, uHurt, uVig, uChill; uniform vec2 uImpC; uniform vec3 uInk, uPaper;',
        'varying vec2 vUv;',
        'vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }',
        'vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));',
        '  const mat3 O = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));',
        '  c *= uExposure / 0.6; c = I * c; c = RRTAndODTFit(c); c = O * c; return clamp(c, 0.0, 1.0); }',
        'vec3 tm(vec2 uv){ return aces(texture2D(tScene, uv).rgb); }',
        'float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
        'vec3 fxaa(vec2 uv){',
        '  vec2 px = 1.0 / uRes; vec3 rgbM = tm(uv);',
        '  vec3 nw = tm(uv + vec2(-1.0, -1.0) * px), ne = tm(uv + vec2(1.0, -1.0) * px), sw = tm(uv + vec2(-1.0, 1.0) * px), se = tm(uv + vec2(1.0, 1.0) * px);',
        '  vec3 L = vec3(0.299, 0.587, 0.114); float lNW = dot(nw, L), lNE = dot(ne, L), lSW = dot(sw, L), lSE = dot(se, L), lM = dot(rgbM, L);',
        '  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));',
        '  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));',
        '  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0); float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);',
        '  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * px;',
        '  vec3 a = 0.5 * (tm(uv + dir * (1.0 / 3.0 - 0.5)) + tm(uv + dir * (2.0 / 3.0 - 0.5)));',
        '  vec3 b = a * 0.5 + 0.25 * (tm(uv + dir * -0.5) + tm(uv + dir * 0.5)); float lB = dot(b, L);',
        '  return (lB < lMin || lB > lMax) ? a : b; }',
        'vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }',
        'void main(){',
        '  vec3 col = uFxaa > 0.5 ? fxaa(vUv) : tm(vUv);',
        '  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));',
        '  col = mix(col, col * vec3(0.9, 0.97, 1.14), (1.0 - smoothstep(0.0, 0.3, l)) * 0.4);', // cool shadows
        '  col = mix(col, col * vec3(1.06, 1.0, 0.9), smoothstep(0.45, 0.9, l) * 0.35);', // warm highlights
        '  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y; float qr = length(q);',
        '  col *= 1.0 - smoothstep(0.42, 1.15, qr) * uVig;',
        '  col = mix(col, col * vec3(1.0, 0.55, 0.45) + vec3(0.06, 0.0, 0.0), uHurt * smoothstep(0.25, 0.85, qr));',
        '  col = mix(col, col * vec3(0.85, 0.95, 1.1) + vec3(0.0, 0.01, 0.03), uChill * smoothstep(0.3, 0.9, qr));',
        '  if (uImp > 0.0) {',
        '    vec2 p = vUv - uImpC; p.x *= uRes.x / uRes.y; float r = length(p); float th = atan(p.y, p.x);',
        '    float spikes = 0.5 + 0.5 * sin(th * 9.0 + uImpSeed) * sin(th * 5.0 - uImpSeed * 1.7);',
        '    float R = uImpR * (1.0 + 0.34 * spikes + 0.05 * sin(61.0 * th) + 0.03 * sin(113.0 * th));',
        '    float bleed = (hash(floor(gl_FragCoord.xy / 2.0)) - 0.5) * 0.012;',
        '    float inside = uImpMode > 0.5 ? 1.0 : smoothstep(R + 0.01, R - 0.01, r + bleed);',
        '    float inkT = smoothstep(0.2, 0.3, dot(col, vec3(0.2126, 0.7152, 0.0722)));',
        '    vec3 neg = mix(uPaper, uInk, inkT) * (1.0 - 0.035 * hash(gl_FragCoord.xy));',
        '    float a01 = th / 6.28318 + 0.5;',
        '    float s1 = floor(a01 * 150.0), f1 = fract(a01 * 150.0);',
        '    float st1 = uImpR * (0.3 + 0.5 * hash(vec2(s1 + 7.0, uImpSeed)));',
        '    float w1 = (0.06 + 0.28 * hash(vec2(s1 + 3.0, uImpSeed))) * smoothstep(st1, st1 + 0.3, r);',
        '    float gap = step(0.12, abs(fract(r * 2.2 + hash(vec2(s1, 9.0 + uImpSeed))) - 0.5) * 2.0 + 0.0);',
        '    float line = step(hash(vec2(s1, uImpSeed)), 0.45) * smoothstep(w1 * 0.5, w1 * 0.5 - 0.05, abs(f1 - 0.5)) * step(st1, r) * (0.75 + 0.25 * gap);',
        '    float s2 = floor(a01 * 360.0), f2 = fract(a01 * 360.0);',
        '    float st2 = uImpR * (0.9 + 0.6 * hash(vec2(s2 + 1.0, uImpSeed)));',
        '    float line2 = step(hash(vec2(s2 + 2.0, uImpSeed)), 0.28) * smoothstep(0.12, 0.05, abs(f2 - 0.5)) * step(st2, r);',
        '    float lines = clamp(line + line2 * 0.8, 0.0, 1.0);',
        '    vec3 outC = mix(col, uInk, lines * 0.85);',
        '    vec3 inC = mix(neg, uPaper, lines * 0.9);',
        '    col = mix(col, mix(outC, inC, inside), uImp);',
        '  }',
        '  col *= 1.0 - uDim;',
        '  col = srgb(clamp(col, 0.0, 1.0));',
        '  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n')
    });
    var compScene = new THREE.Scene(), compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var compQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat); compQuad.frustumCulled = false; compScene.add(compQuad);

    // ------------------------------------------------------------ scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1526);
    scene.fog = new THREE.FogExp2(0x0d1526, 0.02);
    var cam = new THREE.PerspectiveCamera(30, 1, 0.5, 220);
    scene.add(new THREE.HemisphereLight(0x6f86cc, 0x23301f, 1.8));
    var moon = new THREE.DirectionalLight(0xb4c6ff, 2.5); moon.position.set(-14, 12, 7); scene.add(moon);
    var lanternLight = new THREE.PointLight(0xffa850, 26, 15, 1.25); scene.add(lanternLight);
    var fxLights = [0, 1, 2].map(function () { var L = new THREE.PointLight(0xffffff, 0, 9, 1.7); scene.add(L); return L; });
    var world = window.createHedgeWorld(THREE, { content: C, quality: Q, seed: 11 });
    scene.add(world.group);
    world.addHerbs(SIM.createSim(C, { seed: 1 }).S.herbs); // herb positions come from the content, not the run
    var vfx = window.createHedgeVFX(THREE, { scene: scene, camera: cam, lights: fxLights, quality: Q, seed: 5 });
    var sound = window.createHedgeSound();
    vfx.opts.flashes = settings.flashes; vfx.opts.shake = settings.shake && settings.flashes !== 'safe' ? 1 : 0;
    sound.setMuted(settings.muted || inFrame);

    // ------------------------------------------------------------ the witch view
    var witchV = world.makeWitch(); scene.add(witchV.root);
    witchV.face = Math.PI * 0.75; witchV.ch = { lSh: 0, lShZ: 0.08, lEl: -0.3, rSh: -0.35, rShZ: -0.06, rEl: -0.55, lean: 0, twist: 0, crouch: 0, point: 0, fall: 0, step: 0, flare: 0 };
    witchV.mats = []; witchV.root.traverse(function (o) { if (o.material && o.material.emissive && !o.userData.keepEmissive && witchV.mats.indexOf(o.material) < 0) witchV.mats.push(o.material); });
    witchV.handGlowI = -1; witchV.lanternPos = new THREE.Vector3(); witchV.handPos = new THREE.Vector3(); witchV.hurt = 0; witchV.swing = 0; witchV.swingV = 0; witchV.prevVx = 0; witchV.prevVz = 0;
    witchV.walk = 0;

    // ------------------------------------------------------------ enemy views
    var pools = { slug: [], snail: [], beetle: [], grub: [], thornback: [] };
    var views = {}; // id -> view
    var dying = [];
    function makeView(e) {
      var v = pools[e.kind].pop();
      if (!v) {
        v = e.kind === 'slug' ? world.makeSlug() : e.kind === 'snail' ? world.makeSnail() : e.kind === 'beetle' ? world.makeBeetle() : e.kind === 'grub' ? world.makeGrub() : world.makeThornback();
        v.kind = e.kind; v.baseCol = v.mats.map(function (m) { return m.color.clone(); });
        scene.add(v.root);
      }
      v.root.visible = true; v.root.scale.setScalar(1); v.root.rotation.set(0, 0, 0); v.body.rotation.set(0, 0, 0); v.body.position.set(0, 0, 0);
      if (v.kind === 'beetle' || v.kind === 'grub' || v.kind === 'thornback') { v.body.scale.setScalar(v.kind === 'thornback' ? 2.7 : v.kind === 'grub' ? 0.6 : 1); }
      else v.body.scale.set(1, 1, 1);
      v.mats.forEach(function (m, i) { m.color.copy(v.baseCol[i]); m.emissive.setRGB(0, 0, 0); });
      v.dying = null; v.hurt = 0; v.hurtCol = [1, 1, 1]; v.face = e.face; v.anim = Math.random() * 10; v.open = 0; v.lift = 0; v.windT = 0; v.id = e.id; v.retract = 0; v.lastSlime = 0; v.crack = 0;
      if (v.plates) v.plates.forEach(function (p) { p.g.visible = true; p.g.rotation.set(0, 0, 0); p.crack = 0; });
      if (v.stalks) v.stalks.forEach(function (s) { s.visible = true; });
      if (v.thorns) v.thorns.forEach(function (t) { t.visible = true; });
      views[e.id] = v;
      return v;
    }
    function releaseView(v) { v.root.visible = false; pools[v.kind].push(v); }
    function clearViews() {
      Object.keys(views).forEach(function (k) { releaseView(views[k]); }); views = {};
      dying.forEach(function (v) { releaseView(v); }); dying = [];
      thorns.forEach(function (t) { t.m.visible = false; t.on = false; });
    }
    function heightOf(kind) { return kind === 'thornback' ? 1.3 : kind === 'beetle' ? 0.45 : kind === 'grub' ? 0.3 : kind === 'snail' ? 0.38 : 0.22; }
    // thorn projectiles
    var thornGeo = new THREE.ConeGeometry(0.07, 0.5, 5); thornGeo.rotateX(Math.PI / 2);
    var thornMat = new THREE.MeshLambertMaterial({ color: 0x6a5a34, emissive: 0x3a1a06 });
    var thorns = []; for (var ti = 0; ti < 10; ti++) { var tm = new THREE.Mesh(thornGeo, thornMat); tm.visible = false; scene.add(tm); thorns.push({ m: tm, on: false }); }

    // ------------------------------------------------------------ game state
    var mode = 'loading'; // loading | title | playing | paused | over | film
    var sim = null, pilot = null, attract = false, effBase = 0, runOpts = {}, endTimer = 0, runStart = 0;
    var acc = 0, lastT = performance.now(), simClockOffset = 0;
    var hintsSeen = store.get('hints', {}), hintCount = store.get('runs', 0);
    var apiInput = null;
    function newSim(o) {
      clearViews(); vfx.clearAll();
      sim = SIM.createSim(C, { seed: o.seed });
      sim.start(o.start || {});
      pilot = o.attract ? SIM.createPilot(sim) : null; attract = !!o.attract;
      effBase = vfx.time; acc = 0; endTimer = 0; runOpts = o;
      var W = sim.S.witch; witchV.face = W.face; witchV.ch.fall = 0; witchV.hurt = 0; hurtPulse = 0; fxTimers.length = 0;
      camState.init = false;
      hud.reset();
      arrowsList.length = 0;
      handleEvents(sim.drain());
    }

    // ------------------------------------------------------------ camera (build-game-camera-controls)
    var camState = { tx: 0, tz: 2, lx: 0, lz: 2, yaw: Math.PI / 4, pitch: 0.86, dist: 23, init: false, t: 0 };
    var RIGHT = new THREE.Vector3(), FWD = new THREE.Vector3();
    function setYawAxes(yaw) { RIGHT.set(Math.cos(yaw), 0, -Math.sin(yaw)); FWD.set(-Math.sin(yaw), 0, -Math.cos(yaw)); }
    setYawAxes(camState.yaw);
    var camUp = new THREE.Vector3();
    function updateCamera(rdt, alpha) {
      var W = sim.S.witch, wx = W.px + (W.x - W.px) * alpha, wz = W.pz + (W.z - W.pz) * alpha;
      var aspect = innerWidth / innerHeight, portrait = aspect < 1;
      camState.t += rdt;
      var gx = wx, gz = wz;
      if (mode === 'playing' && aim.mode === 'mouse' && !touchMode) { gx += clamp(aim.x - wx, -7, 7) * 0.16; gz += clamp(aim.z - wz, -7, 7) * 0.16; }
      // keep a committed threat in frame: lean toward the boss
      var boss = bossEntity();
      if (boss && boss.state !== 'climb') { gx += clamp(boss.x - wx, -6, 6) * 0.22; gz += clamp(boss.z - wz, -6, 6) * 0.22; }
      if (mode === 'title') {
        // frame the witch clear of the title card: right of it on a wide screen, above it on a phone
        if (portrait) { gx -= FWD.x * 5.2; gz -= FWD.z * 5.2; } else { gx -= RIGHT.x * 4.2; gz -= RIGHT.z * 4.2; }
      }
      var review = sim.S.phase === 'review';
      if (review) { gx = (wx - 0.4) * 0.5; gz = (wz + 4.1) * 0.5; }
      var lim = portrait ? 8.8 : 7.2; gx = clamp(gx, -lim - 4, lim + 4); gz = clamp(gz, -lim - 4, lim + 4);
      var yaw = Math.PI / 4;
      if (mode === 'title' && !reduced) yaw += Math.sin(camState.t * 0.06) * 0.3;
      var dist = 23 * (portrait ? Math.pow(1 / aspect, 0.55) : 1) * (mode === 'title' ? 1.18 : 1) * (review ? 0.62 : 1);
      if (!camState.init) { camState.tx = gx; camState.tz = gz; camState.lx = gx; camState.lz = gz; camState.init = true; camState.dist = dist; camState.yaw = yaw; }
      var kp = 1 - Math.exp(-rdt * 5.5), kl = 1 - Math.exp(-rdt * 8);
      camState.tx += (gx - camState.tx) * kp; camState.tz += (gz - camState.tz) * kp;
      camState.lx += (gx - camState.lx) * kl; camState.lz += (gz - camState.lz) * kl;
      camState.dist += (dist - camState.dist) * kp; camState.yaw += (yaw - camState.yaw) * kp;
      var p = camState.pitch, d = camState.dist, y2 = camState.yaw;
      cam.position.set(camState.tx + Math.sin(y2) * Math.cos(p) * d, Math.sin(p) * d, camState.tz + Math.cos(y2) * Math.cos(p) * d);
      cam.lookAt(camState.lx, 0.5, camState.lz);
      var sh = vfx.shakeOffset();
      if (sh) { cam.updateMatrixWorld(); camUp.setFromMatrixColumn(cam.matrixWorld, 1); cam.position.addScaledVector(camUp, sh * 2 * d * Math.tan(cam.fov * Math.PI / 360)); }
      setYawAxes(camState.yaw);
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerpA(a, b, t) { var d = ((b - a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return a + d * t; }
    function bossEntity() { if (!sim) return null; for (var i = 0; i < sim.S.enemies.length; i++) if (sim.S.enemies[i].kind === 'thornback') return sim.S.enemies[i]; return null; }

    // ------------------------------------------------------------ input
    var keys = {};
    var held = { ember: false, rime: false, spark: false };
    var aim = { x: 0, z: 4, mode: touchFirst ? 'auto' : 'mouse', sx: innerWidth / 2, sy: innerHeight / 2, lastMove: 0, lockX: 0, lockZ: 0, lockT: 0, has: false };
    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
    var touchMode = touchFirst;
    function mouseWorld() {
      ndc.set(aim.sx / innerWidth * 2 - 1, -(aim.sy / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, cam);
      if (raycaster.ray.intersectPlane(ground, hitP)) { aim.x = hitP.x; aim.z = hitP.z; }
    }
    function autoAim(spell) {
      var W = sim.S.witch, best = null, bs = 1e9, fx = Math.sin(W.face), fz = Math.cos(W.face);
      sim.S.enemies.forEach(function (e) {
        if (e.dead || (e.state === 'climb' && e.st < 20)) return;
        var dx = e.x - W.x, dz = e.z - W.z, d = Math.sqrt(dx * dx + dz * dz); if (d > 10.5) return;
        var cos = (dx * fx + dz * fz) / (d || 1), s = d * (1.6 - cos * 0.6);
        if (spell === 'spark' && (e.armored || e.plates > 0)) s *= 0.45;
        if (spell === 'rime' && e.kind === 'snail' && e.frozenT <= 0) s *= 0.55;
        if (spell === 'ember' && (e.kind === 'slug' || e.kind === 'grub')) s *= 0.75;
        if (spell === 'ember' && (e.armored || e.plates > 0)) s *= 1.8;
        if (e.state === 'eat' || e.state === 'rear') s *= 0.8;
        if (s < bs) { bs = s; best = e; }
      });
      if (best) return [best.x + best.vx * 0.3, best.z + best.vz * 0.3];
      return [W.x + fx * 4, W.z + fz * 4];
    }
    function lockAim(spell, useMouse) {
      var p;
      if (useMouse) { mouseWorld(); p = [aim.x, aim.z]; }
      else p = autoAim(spell);
      aim.lockX = p[0]; aim.lockZ = p[1]; aim.lockT = 0.5;
    }
    var stickV = { on: false, id: -1, bx: 0, by: 0, x: 0, y: 0 };
    var tAim = { on: false, spell: null, id: -1, x0: 0, y0: 0, dx: 0, dy: 0, aiming: false, wx: 0, wz: 0 };
    function currentInput() {
      var W = sim.S.witch;
      var mx = 0, my = 0;
      if (keys.up) my += 1; if (keys.down) my -= 1; if (keys.right) mx += 1; if (keys.left) mx -= 1;
      if (stickV.on) { mx = stickV.x; my = -stickV.y; }
      var wx = mx * RIGHT.x + my * FWD.x, wz = mx * RIGHT.z + my * FWD.z, l = Math.sqrt(wx * wx + wz * wz);
      if (l > 1) { wx /= l; wz /= l; }
      var ax, az;
      if (tAim.on && tAim.aiming) { ax = tAim.wx; az = tAim.wz; }
      else if (aim.lockT > 0) { ax = aim.lockX; az = aim.lockZ; }
      else if (aim.mode === 'mouse' && !touchMode) { mouseWorld(); ax = aim.x; az = aim.z; }
      else { ax = W.x + Math.sin(W.face) * 4; az = W.z + Math.cos(W.face) * 4; }
      return { mx: wx, mz: wz, ax: ax, az: az, ember: held.ember, rime: held.rime, spark: held.spark, skip: false };
    }
    function press(spell) {
      if (mode !== 'playing' || !sim || sim.S.phase === 'over') return;
      var o = {}; o['p' + spell[0].toUpperCase() + spell.slice(1)] = true; sim.setInput(o);
    }
    function keyMap(e) {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': return 'up'; case 'KeyS': case 'ArrowDown': return 'down';
        case 'KeyA': case 'ArrowLeft': return 'left'; case 'KeyD': case 'ArrowRight': return 'right';
        case 'KeyJ': case 'Digit1': case 'Numpad1': return 'ember'; case 'KeyK': case 'Digit2': case 'Numpad2': return 'rime';
        case 'Space': case 'KeyL': case 'Digit3': case 'Numpad3': return 'spark';
        case 'ShiftLeft': case 'ShiftRight': return 'skip';
      }
      return null;
    }
    window.addEventListener('keydown', function (e) {
      sound.unlock();
      if (e.code === 'KeyM') { toggleMute(); return; }
      if (mode === 'upgrade-wait') return;
      if (screenOpen('upgrade')) { var n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code]; if (n !== undefined) { choose(n); e.preventDefault(); } return; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenOpen('how') || screenOpen('settings')) { closeSub(); e.preventDefault(); return; }
        if (mode === 'playing') { pause('key'); e.preventDefault(); return; }
        if (mode === 'paused') { resume(); e.preventDefault(); return; }
      }
      var noFocus = !document.activeElement || document.activeElement === document.body;
      if (e.code === 'Enter' && noFocus) {
        // Enter does the obvious thing when no button has focus
        if (mode === 'title') { startRun({}); return; }
        if (mode === 'over') { startRun({}); return; }
        if (mode === 'paused') { resume(); return; }
      }
      if (mode !== 'playing' && mode !== 'film') return;
      if (e.code === 'KeyR' && sim && sim.S.phase === 'review') { startRun({ review: sim.S.review }); return; }
      var k = keyMap(e); if (!k) return;
      e.preventDefault();
      if (k === 'up' || k === 'down' || k === 'left' || k === 'right') { keys[k] = true; if (performance.now() - aim.lastMove > 1500) aim.mode = 'auto'; return; }
      if (e.repeat) return;
      if (k === 'skip') { sim.setInput({ pSkip: true }); return; }
      var useMouse = aim.mode === 'mouse' && !touchMode && performance.now() - aim.lastMove < 6000;
      lockAim(k, useMouse); press(k);
    });
    window.addEventListener('keyup', function (e) { var k = keyMap(e); if (k === 'up' || k === 'down' || k === 'left' || k === 'right') keys[k] = false; });
    var canvas = renderer.domElement;
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      aim.sx = e.clientX; aim.sy = e.clientY; aim.lastMove = performance.now(); aim.mode = 'mouse'; aim.has = true;
      if (touchMode && !touchFirst) setTouchMode(false);
    });
    canvas.addEventListener('pointerdown', function (e) {
      sound.unlock();
      if (e.pointerType !== 'mouse') return;
      aim.sx = e.clientX; aim.sy = e.clientY; aim.lastMove = performance.now(); aim.mode = 'mouse'; aim.has = true;
      if (mode !== 'playing') return;
      if (e.button === 0) { held.ember = true; press('ember'); }
      else if (e.button === 2) { held.rime = true; press('rime'); }
      else if (e.button === 1) { held.spark = true; press('spark'); e.preventDefault(); }
    });
    window.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) held.ember = false; else if (e.button === 2) held.rime = false; else if (e.button === 1) held.spark = false;
    });
    window.addEventListener('blur', function () { keys = {}; held.ember = held.rime = held.spark = false; stickV.on = false; if (mode === 'playing' && !inFrame) pause('blur'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) { if (mode === 'playing') pause('hidden'); sound.suspend(); } else { sound.resume(); lastT = performance.now(); } });

    // touch: a floating stick on the left, spell buttons on the right you can drag to aim
    var stickEl = $('#stick'), knobEl = $('#knob'), aimKnob = $('#aimknob');
    function setTouchMode(on) { touchMode = on; $('#touch').classList.toggle('on', on && (mode === 'playing' || mode === 'film')); $('#spells').style.display = on ? 'none' : ''; }
    $('#stickzone').addEventListener('pointerdown', function (e) {
      sound.unlock(); if (!touchMode && e.pointerType !== 'mouse') setTouchMode(true);
      if (stickV.on) return;
      stickV.on = true; stickV.id = e.pointerId; stickV.bx = e.clientX; stickV.by = e.clientY; stickV.x = stickV.y = 0;
      try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
      stickEl.classList.remove('idle'); stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; knobEl.style.transform = '';
      e.preventDefault();
    });
    $('#stickzone').addEventListener('pointermove', function (e) {
      if (!stickV.on || e.pointerId !== stickV.id) return;
      var dx = e.clientX - stickV.bx, dy = e.clientY - stickV.by, d = Math.sqrt(dx * dx + dy * dy), R = 56;
      if (d > R) { dx *= R / d; dy *= R / d; d = R; }
      var k = d / R; k = k < 0.12 ? 0 : (k - 0.12) / 0.88;
      stickV.x = d > 0 ? dx / d * k : 0; stickV.y = d > 0 ? dy / d * k : 0;
      knobEl.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    });
    function stickEnd(e) { if (e.pointerId !== stickV.id) return; stickV.on = false; stickV.x = stickV.y = 0; stickEl.classList.add('idle'); stickEl.style.left = ''; stickEl.style.top = ''; knobEl.style.transform = ''; }
    $('#stickzone').addEventListener('pointerup', stickEnd); $('#stickzone').addEventListener('pointercancel', stickEnd);
    ['ember', 'rime', 'spark'].forEach(function (sp) {
      var b = $('#tb-' + sp);
      b.addEventListener('pointerdown', function (e) {
        sound.unlock(); if (!touchMode) setTouchMode(true);
        if (tAim.on) return;
        tAim.on = true; tAim.spell = sp; tAim.id = e.pointerId; var r = b.getBoundingClientRect(); tAim.x0 = r.left + r.width / 2; tAim.y0 = r.top + r.height / 2; tAim.aiming = false; tAim.dx = tAim.dy = 0;
        try { b.setPointerCapture(e.pointerId); } catch (er) {}
        b.classList.add('held'); e.preventDefault();
      });
      b.addEventListener('pointermove', function (e) {
        if (!tAim.on || e.pointerId !== tAim.id) return;
        tAim.dx = e.clientX - tAim.x0; tAim.dy = e.clientY - tAim.y0;
        var d = Math.sqrt(tAim.dx * tAim.dx + tAim.dy * tAim.dy);
        if (d > 18) tAim.aiming = true;
        if (tAim.aiming) { aimKnob.classList.add('on'); aimKnob.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; updateTouchAim(); }
      });
      function end(e) {
        if (!tAim.on || e.pointerId !== tAim.id) return;
        b.classList.remove('held'); aimKnob.classList.remove('on');
        if (mode === 'playing' && e.type === 'pointerup') {
          if (tAim.aiming) { updateTouchAim(); aim.lockX = tAim.wx; aim.lockZ = tAim.wz; aim.lockT = 0.5; }
          else lockAim(sp, false);
          press(sp);
        }
        tAim.on = false; tAim.aiming = false;
      }
      b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    });
    function updateTouchAim() {
      var W = sim.S.witch, d = Math.sqrt(tAim.dx * tAim.dx + tAim.dy * tAim.dy) || 1;
      var sx = tAim.dx / d, sy = -tAim.dy / d;
      var range = tAim.spell === 'ember' ? C.spells.ember.range : tAim.spell === 'rime' ? sim.rimeRange() : C.spells.spark.range;
      var k = clamp((d - 18) / 110, 0.18, 1) * range;
      tAim.wx = W.x + (RIGHT.x * sx + FWD.x * sy) * k; tAim.wz = W.z + (RIGHT.z * sx + FWD.z * sy) * k;
    }
    $('#tb-skip').addEventListener('pointerdown', function (e) { sound.unlock(); if (mode === 'playing') sim.setInput({ pSkip: true }); $('#tb-skip').classList.add('held'); e.preventDefault(); });
    $('#tb-skip').addEventListener('pointerup', function () { $('#tb-skip').classList.remove('held'); });
    $('#tb-skip').addEventListener('pointercancel', function () { $('#tb-skip').classList.remove('held'); });

    // ------------------------------------------------------------ HUD
    var hud = (function () {
      var bells = $('#bells'), grid = $('#herbgrid');
      C.waves.forEach(function (w, i) { var b = document.createElement('span'); b.className = 'bell' + (w.boss ? ' boss' : ''); b.innerHTML = '<i></i>'; bells.appendChild(b); });
      var moonEl = document.createElement('span'); moonEl.className = 'moon'; bells.appendChild(moonEl);
      var herbEls = [];
      var tmp = SIM.createSim(C, { seed: 1 });
      tmp.S.herbs.forEach(function (h) {
        var el = document.createElement('div'); el.className = 'herb'; el.title = C.herbs[h.kind].name;
        el.innerHTML = '<svg style="color:' + C.herbs[h.kind].leaf + '"><use href="#i-leaf"/></svg><div class="hp"><i></i></div>';
        grid.appendChild(el); herbEls.push({ el: el, bar: el.querySelector('.hp i'), hp: -1, gone: false, att: false, low: false });
      });
      var cache = {};
      function set(id, prop, v) { var k = id + prop; if (cache[k] === v) return; cache[k] = v; var el = $(id); if (prop === 'text') el.textContent = v; else if (prop === 'html') el.innerHTML = v; else el.style.setProperty(prop, v); }
      var spellEls = ['ember', 'rime', 'spark'].map(function (s) { return { s: s, el: $('#sp-' + s), cd: $('#sp-' + s + ' .cd'), cdn: $('#sp-' + s + ' .cdn'), tb: $('#tb-' + s), ring: $('#tb-' + s + ' .fg'), last: '' }; });
      var skipEl = { el: $('#sp-skip'), cd: $('#sp-skip .cd'), tb: $('#tb-skip'), ring: $('#tb-skip .fg') };
      var shownScore = 0;
      var api = {
        herbEls: herbEls,
        reset: function () { cache = {}; shownScore = 0; herbEls.forEach(function (h) { h.hp = -1; h.gone = false; h.el.className = 'herb'; }); $('#bossbar').classList.remove('on'); api.toastOff(); $('#banner').classList.remove('on'); api.hintOff(); },
        frame: function (rdt) {
          var S = sim.S, W = S.witch;
          // score counts up
          shownScore += (S.score - shownScore) * Math.min(1, rdt * 10); if (Math.abs(S.score - shownScore) < 1) shownScore = S.score;
          set('#score', 'text', Math.round(shownScore).toLocaleString('en-GB')); set('#score2', 'text', Math.round(shownScore).toLocaleString('en-GB'));
          // bells and the moon
          var wv = S.wave, belEls = bells.children;
          for (var i = 0; i < C.waves.length; i++) { var cls = 'bell' + (C.waves[i].boss ? ' boss' : '') + (i < wv || S.result === 'won' ? ' done' : i === wv ? ' now' : ''); if (belEls[i].className !== cls) belEls[i].className = cls; }
          var frac = 0;
          if (S.phase === 'wave') { var total = 0; C.waves[wv].groups.forEach(function (g) { total += g.n; }); frac = Math.min(0.95, (total - S.queue.length - S.enemies.length * 0.5) / Math.max(1, total)); }
          else if (S.phase === 'upgrade' || S.result) frac = 1;
          var pos = (wv + frac) / (C.waves.length - 1); moonEl.style.left = (8 + Math.min(1, pos) * 244).toFixed(1) + 'px';
          set('#wavename', 'text', S.phase === 'review' ? 'Review: ' + S.review : C.waves[wv].bell.replace(/^the /i, '') + ' · ' + C.waves[wv].name);
          // herbs
          var standing = 0;
          S.herbs.forEach(function (h, i) {
            var he = herbEls[i], hp = Math.max(0, Math.round(h.hp));
            if (!h.eaten) standing++;
            if (he.hp !== hp) { he.bar.style.width = (hp / h.max * 100).toFixed(0) + '%'; if (he.hp > hp && he.hp >= 0) { he.el.classList.remove('hurt'); void he.el.offsetWidth; he.el.classList.add('hurt'); } he.hp = hp; }
            var low = hp < h.max * 0.4 && !h.eaten; if (he.low !== low) { he.low = low; he.el.classList.toggle('low', low); }
            if (he.gone !== h.eaten) { he.gone = h.eaten; he.el.classList.toggle('gone', h.eaten); }
            var att = !h.eaten && S.enemies.some(function (e) { return e.target === h.id && (e.state === 'eat' || e.state === 'rear'); });
            if (he.att !== att) { he.att = att; he.el.classList.toggle('attacked', att); }
          });
          set('#herbcount', 'text', standing + ' standing');
          var left = C.garden.loseAt - S.herbsEaten;
          set('#losewarn', 'html', S.herbsEaten === 0 ? 'Lose <b>' + C.garden.loseAt + '</b> and the night is lost.' : left > 1 ? '<b>' + left + '</b> more lost and the night is lost.' : '<b>One</b> more and the night is lost.');
          // boss
          var boss = bossEntity();
          if (boss) {
            $('#bossbar').classList.add('on');
            set('#bosshp', 'width', (Math.max(0, boss.hp) / boss.max * 100).toFixed(1) + '%');
            var pl = $('#plates').children; for (var p = 0; p < 3; p++) { var c = p >= boss.plates ? 'cracked' : ''; if (pl[p].className !== c) pl[p].className = c; }
            var stt = boss.bossPhase === 2 ? 'shell gone, and furious: burn it' : boss.plates > 0 ? 'plates shut: crack them with spark' : 'shell open: burn it now';
            set('#bossstate', 'text', stt); var hot = boss.plates === 0; if (cache.bossHot !== hot) { cache.bossHot = hot; $('#bossstate').classList.toggle('hot', hot); }
          } else if (cache.bossOn !== false) { $('#bossbar').classList.remove('on'); cache.bossOn = false; }
          if (boss) cache.bossOn = true;
          // spells
          spellEls.forEach(function (s) {
            var cdT = W.cd[s.s], max = sim.cooldownOf(s.s), f = cdT > 0 ? cdT / max : 0;
            var ready = cdT <= 0 && W.knockT <= 0;
            var casting = W.cast && W.cast.name === s.s;
            var key = (ready ? 'r' : 'c') + (casting ? 'x' : '') + Math.round(f * 100);
            if (key === s.last) return; s.last = key;
            s.cd.style.setProperty('--p', (f * 100).toFixed(1) + '%');
            s.cdn.textContent = cdT > 0 ? (cdT / 60 >= 1 ? (cdT / 60).toFixed(0) : (cdT / 60).toFixed(1)) : '';
            s.el.classList.toggle('cooling', cdT > 30); s.el.classList.toggle('ready', ready); s.el.classList.toggle('casting', !!casting);
            s.ring.setAttribute('stroke-dashoffset', (295.3 * f).toFixed(1)); s.tb.classList.toggle('ready', ready);
          });
          var sf = W.skipCd > 0 ? W.skipCd / 84 : 0; var sk = Math.round(sf * 50);
          if (skipEl.last !== sk) { skipEl.last = sk; skipEl.cd.style.setProperty('--p', (Math.min(1, sf) * 100).toFixed(1) + '%'); skipEl.ring.setAttribute('stroke-dashoffset', (295.3 * Math.min(1, sf)).toFixed(1)); skipEl.tb.classList.toggle('ready', sf <= 0); }
        },
        flashSpell: function (s) { var el = $('#sp-' + s); if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); },
        nope: function (s) { var el = $('#sp-' + s); if (!el) return; el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); },
        toastT: 0,
        toast: function (msg, bad, dur) { var t = $('#toast'); t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on'); api.toastT = dur || 2.4; },
        toastOff: function () { $('#toast').classList.remove('on'); api.toastT = 0; },
        hintOff: function () { $('#hint').classList.remove('on'); api.hintKey = null; },
        done: function () { for (var i = 0; i < arguments.length; i++) if (api.hintKey === arguments[i]) { api.hintOff(); return; } },
        bannerT: 0,
        banner: function (a, b, c, dur) { $('#b1').textContent = a; $('#b2').textContent = b; $('#b3').textContent = c; $('#banner').classList.add('on'); api.bannerT = dur || 2.8; },
        hintT: 0, hintKey: null, hintUntil: 0,
        hint: function (key, html) {
          if (attract || mode !== 'playing' || (hintsSeen[key] || 0) >= 2 || (api.hintKey && performance.now() < api.hintUntil - 3500)) return;
          hintsSeen[key] = (hintsSeen[key] || 0) + 1; store.set('hints', hintsSeen);
          $('#hint').innerHTML = html; $('#hint').classList.add('on'); api.hintKey = key; api.hintUntil = performance.now() + 6000;
        },
        tick: function (rdt) {
          if (api.toastT > 0 && (api.toastT -= rdt) <= 0) $('#toast').classList.remove('on');
          if (api.bannerT > 0 && (api.bannerT -= rdt) <= 0) $('#banner').classList.remove('on');
          if (api.hintKey && performance.now() > api.hintUntil) api.hintOff();
        }
      };
      return api;
    })();
    function announce(msg) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); }

    // score pops and off-screen arrows
    var popsEl = $('#pops'), pops = [];
    for (var pi = 0; pi < 14; pi++) { var pe = document.createElement('span'); pe.className = 'pop'; popsEl.appendChild(pe); pops.push({ el: pe, t: 9, x: 0, y: 0, z: 0 }); }
    var popI = 0;
    function pop(x, y, z, text, cls) { var p = pops[popI = (popI + 1) % pops.length]; p.x = x; p.y = y; p.z = z; p.t = 0; p.el.textContent = text; p.el.className = 'pop' + (cls ? ' ' + cls : ''); }
    var pv = new THREE.Vector3();
    function updatePops(rdt) {
      pops.forEach(function (p) {
        if (p.t > 1.1) { if (p.el.style.opacity !== '0') p.el.style.opacity = '0'; return; }
        p.t += rdt; pv.set(p.x, p.y + p.t * 0.9, p.z).project(cam);
        var sx = (pv.x * 0.5 + 0.5) * innerWidth, sy = (-pv.y * 0.5 + 0.5) * innerHeight;
        p.el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-50%) scale(' + (1 + 0.25 * Math.max(0, 1 - p.t * 6)).toFixed(2) + ')';
        p.el.style.opacity = (p.t < 0.8 ? 1 : Math.max(0, 1 - (p.t - 0.8) / 0.3)).toFixed(2);
      });
    }
    var arrowsEl = $('#arrows'), arrowEls = [], arrowsList = [];
    for (var ai = 0; ai < 8; ai++) { var ae = document.createElement('div'); ae.className = 'arrow'; ae.innerHTML = '<svg><use href="#i-arrow"/></svg>'; arrowsEl.appendChild(ae); arrowEls.push(ae); }
    function updateArrows() {
      var S = sim.S;
      for (var i = arrowsList.length - 1; i >= 0; i--) if (S.tick > arrowsList[i].until) arrowsList.splice(i, 1);
      for (var j = 0; j < arrowEls.length; j++) {
        var a = arrowsList[j], el = arrowEls[j];
        if (!a) { if (el.classList.contains('on')) el.classList.remove('on'); continue; }
        pv.set(a.x, 0.8, a.z).project(cam);
        var sx = (pv.x * 0.5 + 0.5) * innerWidth, sy = (-pv.y * 0.5 + 0.5) * innerHeight;
        var m = 34, top = innerWidth <= 720 ? 205 : 92, bottom = innerHeight - (touchMode ? 40 : 30);
        var off = sx < m || sx > innerWidth - m || sy < top || sy > bottom || pv.z > 1;
        if (!off) { if (el.classList.contains('on')) el.classList.remove('on'); continue; }
        var cx = innerWidth / 2, cy = innerHeight / 2, dx = sx - cx, dy = sy - cy; if (pv.z > 1) { dx = -dx; dy = -dy; }
        var k = Math.min((innerWidth / 2 - m) / Math.abs(dx || 1e-3), ((dy > 0 ? bottom - cy : cy - top) - 4) / Math.abs(dy || 1e-3));
        var px = cx + dx * k, py = cy + dy * k, ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (innerWidth > 720 && px < 262 && py < 215) py = 215; // keep clear of the herb panel
        el.classList.add('on'); el.style.color = a.color;
        el.style.transform = 'translate(' + (px - 15).toFixed(0) + 'px,' + (py - 15).toFixed(0) + 'px) rotate(' + ang.toFixed(0) + 'deg)';
      }
    }

    // ------------------------------------------------------------ event director: sim events -> effects, sound, HUD
    var V = THREE.Vector3, tmpA = new V(), tmpB = new V();
    var KIND_COL = { slug: '#e2b56a', snail: '#c9b08a', beetle: '#9fd07a', grub: '#d9c06a', thornback: '#ff8a5a' };
    var ELCOL = { fire: [1.25, 1.0, 0.7], frost: [0.45, 0.65, 1.0], lightning: [0.6, 0.65, 1.0], nettle: [0.5, 0.8, 0.3] };
    function screenPan(x, z) { tmpA.set(x, 0, z).project(cam); return clamp(tmpA.x * 0.8, -0.9, 0.9); }
    function hold(ticks) { return ticks / 60; }
    function sfx(n, o) { if (!attract) sound.play(n, o); }
    function say(m) { if (!attract) announce(m); }
    function music(m) { if (!attract) sound.setMusic(m); }
    function handleEvents(evs) {
      for (var i = 0; i < evs.length; i++) { try { onEvent(evs[i]); } catch (err) { console.error(err); } }
    }
    function onEvent(e) {
      var S = sim.S, W = S.witch, v, sp;
      switch (e.type) {
        case 'bell':
          hud.banner(C.waves[e.wave].bell, e.name, e.line, 3.0); sfx('bell', { boss: e.boss }); music('calm');
          say(C.waves[e.wave].bell + ': ' + e.name + '. ' + e.line);
          if (e.wave === 0) hud.hint('ember', touchMode ? 'Slugs are coming. Tap <b>ember</b> to throw at the nearest, or drag from it to aim.' : 'Slugs are coming. <b>Left click</b> where you want the Ember seed to land.');
          break;
        case 'waveStart': music(C.waves[S.wave].boss ? 'boss' : 'wave'); break;
        case 'waveClear': sfx('clear'); say('The bell\'s foes are done. ' + e.standing + ' herbs standing. Score ' + S.score + '.'); $('#srscore').textContent = 'Score ' + S.score; break;
        case 'offer': if (!attract) { hud.hintOff(); showUpgrade(e.ids); } break;
        case 'chose': sfx('upgrade'); break;
        case 'breachWarn': {
          var col = KIND_COL[e.kind] || '#fff';
          arrowsList.push({ x: e.x, z: e.z, until: e.at + 20, color: col });
          var b = C.breaches.filter(function (q) { return q.id === e.breach; })[0];
          var near = b.side === 'S' || b.side === 'E', h = near ? 0.95 : 1.3;
          [-0.09, 0.09].forEach(function (o) { var tx = b.side === 'N' || b.side === 'S' ? o : 0, tz = b.side === 'W' || b.side === 'E' ? o : 0; vfx.glow(e.x + tx, h, e.z + tz, 1.6, 1.0, 0.25, e.boss ? 0.3 : 0.14, 1.5, false); });
          vfx.debris(e.x, h, e.z, LOW ? 3 : 6, 'stone');
          sfx('rustle', { pan: screenPan(e.x, e.z) });
          break;
        }
        case 'spawn': {
          var en = S.enemies.filter(function (q) { return q.id === e.id; })[0]; if (!en) break;
          makeView(en);
          if (e.boss) { hud.banner('the last bell', 'The Thornback', 'It is coming over the north wall.', 3.0); sfx('roar'); vfx.shake(0.012); hud.hint('boss', 'Crack its three plates with <b>Spark</b>, then burn what is underneath. Stay out of its <b>red lane</b>.'); }
          if (e.kind === 'snail') hud.hint('snail', 'Snails shrug off fire. <b>Rime</b> freezes them solid, and anything breaks a frozen snail.');
          if (e.kind === 'beetle') hud.hint('beetle', 'Beetle shells only crack under <b>Spark</b>. Then anything hurts.');
          break;
        }
        case 'landed': vfx.debris(e.x, 0.1, e.z, e.boss ? 18 : 5, 'soil'); if (e.boss) { vfx.shake(0.014); vfx.decal(4, e.x, e.z, 2.6, Math.random() * 6, 6); sfx('stomp'); } else sfx('landed'); break;
        case 'bossWall': vfx.debris(e.x, 1.2, e.z, 20, 'stone'); vfx.shake(0.01); break;
        case 'castStart':
          sp = e.spell; hud.flashSpell(sp);
          if (sp === 'ember') hud.done('ember', 'eaten'); else if (sp === 'rime') hud.done('snail', 'hidden'); else hud.done('beetle', 'shellfire', 'boss', 'hidden');
          if (sp === 'ember') { sfx('emberWind'); witchV.handGlowI = vfx.glow(0, 0, 0, 4.0, 1.7, 0.45, 0.62, C.spells.ember.startup / 60 + 0.1, false); }
          else if (sp === 'rime') { sfx('rimeWind'); }
          else if (sp === 'spark') { sfx('sparkWind'); }
          break;
        case 'castCancel': witchV.handGlowI = -1; break;
        case 'release':
          if (e.spell === 'ember') { var hp = witchV.handPos; vfx.seed(e.id, hp.x, hp.z, e.x1, e.z1, e.T / 60, hp.y); vfx.glow(hp.x, hp.y, hp.z, 3.6, 1.7, 0.5, 0.62, 0.18, true); vfx.sparks(hp.x, hp.y, hp.z, LOW ? 4 : 8, { speed: 2.2, up: 1.4 }); sfx('emberThrow'); witchV.handGlowI = -1; }
          else if (e.spell === 'rime') { vfx.frost(e.x, e.z, e.ang, e.half, e.range, e.frontT / 60, e.life / 60); vfx.plume(e.x, e.z, e.ang, e.half, e.range, e.frontT / 60); sfx('rimeCast'); }
          else if (e.spell === 'spark') { var lp0 = witchV.lanternPos; vfx.glow(lp0.x, lp0.y, lp0.z, 1.6, 1.7, 3.6, 0.7, 0.3, true); vfx.sparks(lp0.x, lp0.y, lp0.z, 6, { speed: 1.6, up: 1 }); }
          break;
        case 'emberBurst': vfx.emberRing(e.x, e.z, e.R, e.growT / 60, e.burnT / 60); sfx('emberBurst'); vfx.shake(0.004); break;
        case 'sparkLink': {
          var ty = e.ground ? 0.03 : heightOf(e.kind);
          tmpB.set(e.tx, ty, e.tz);
          var bopt = { leader: e.leader / 60, hold: 0.13, levels: 5, branches: e.ground ? 1.4 : 1 };
          if (e.i === 0) postPose.push({ to: tmpB.clone(), opt: bopt, t: vfx.time });
          else vfx.bolt(new V(e.fx, e.fy, e.fz), tmpB.clone(), bopt);
          sfx('zap', { i: e.i });
          (function (x, y, z, ground) {
            setTimeoutFx(e.leader / 60, function () {
              vfx.glow(x, y, z, 2.0, 2.2, 3.2, 0.42, 0.18, true);
              vfx.light(new V(x, y + 0.6, z), 0x6f7cff, 18, { decay: 8, dist: 6, snap: true });
              vfx.sparks(x, y, z, LOW ? 6 : 12, { speed: 3.5, up: 2.2 });
              if (ground) { vfx.decal(2, x, z, 0.9, Math.random() * 6, 3); vfx.debris(x, 0.05, z, 4, 'soil'); }
            });
          })(e.tx, ty, e.tz, !!e.ground);
          if (e.ground) hud.hint('sparkmiss', 'Spark needs a foe near your aim. With none, it strikes the ground.');
          break;
        }
        case 'sparkHit': break;
        case 'hit': {
          v = views[e.id];
          if (v) { v.hurt = 1; v.hurtCol = ELCOL[e.element] || [1, 1, 1]; if (v.kind !== 'thornback') v.recoil = Math.max(v.recoil || 0, e.element === 'fire' ? 0.7 : 0.3); if (e.element === 'lightning') v.jolt = 1; }
          var en2 = S.enemies.filter(function (q) { return q.id === e.id; })[0];
          if (en2 && (en2.kind === 'slug' || en2.kind === 'snail')) vfx.debris(e.x, 0.25, e.z, 3, 'slime');
          sfx('hit', { element: e.element });
          break;
        }
        case 'deflect':
          vfx.sparks(e.x, 0.45, e.z, 4, { speed: 2, up: 1.5 }); sfx('deflect');
          if (e.why === 'shell' && e.element === 'fire') hud.hint('shellfire', 'That shell shrugged off the fire. <b>Spark</b> it first.');
          if (e.why === 'hidden') hud.hint('hidden', 'The snail has gone into its shell. <b>Rime</b> or <b>Spark</b> still reach it.');
          v = views[e.id]; if (v) { v.hurt = 0.5; v.hurtCol = [0.9, 0.9, 0.8]; }
          break;
        case 'shellCrack':
          v = views[e.id]; if (v) { v.crack = 1; v.recoil = 1; v.jolt = 1; }
          vfx.chips(e.x, 0.55, e.z, LOW ? 4 : 7, 2.4); vfx.debris(e.x, 0.5, e.z, LOW ? 4 : 8, 'shell'); vfx.sparks(e.x, 0.6, e.z, 10, { speed: 3, up: 2.5 });
          vfx.glow(e.x, 0.55, e.z, 2.0, 2.1, 3.0, 0.55, 0.16, true);
          vfx.shake(0.008); sfx('shellCrack'); pop(e.x, 1.0, e.z, 'cracked', 'big');
          break;
        case 'plateCrack':
          v = views[e.id]; if (v) { v.crack = 1; v.recoil = 0.6; }
          vfx.chips(e.x, 1.5, e.z, LOW ? 6 : 10, 3.2); vfx.debris(e.x, 1.4, e.z, LOW ? 8 : 14, 'shell');
          vfx.impact({ hold: hold(6), mode: 'center', at: tmpA.set(e.x, 1.2, e.z), radius: 0.2, element: 'lightning' });
          vfx.shake(0.012); sfx('plateCrack'); pop(e.x, 2.6, e.z, e.left ? e.left + ' plates left' : 'shell open!', 'big');
          break;
        case 'shellOpen': hud.toast('The shell is open. Burn it!', false, 2.6); say('The Thornback\'s shell is open.'); break;
        case 'platesRegrow': sfx('platesRegrow'); hud.toast('The plates have grown back.', true, 2.2); break;
        case 'bossPhase':
          vfx.impact({ hold: hold(8), mode: 'full', at: tmpA.set(e.x, 1, e.z), element: 'earth' });
          vfx.shake(0.02); sfx('roar'); vfx.debris(e.x, 1.5, e.z, 30, 'shell');
          hud.banner('the shell breaks', 'The Thornback is furious', 'It throws its thorns now, and calls its brood.', 3.0); say('The Thornback is furious.');
          break;
        case 'freeze': vfx.hull(e.id, e.x, e.z, e.kind === 'slug' ? 0.85 : 1); sfx('freeze'); break;
        case 'thaw': vfx.hullEnd(e.id, false); break;
        case 'shatter':
          vfx.hullEnd(e.id, true);
          vfx.impact({ hold: hold(4), mode: 'center', at: tmpA.set(e.x, 0.35, e.z), radius: 0.09, element: 'frost' });
          vfx.shake(0.006); sfx('shatter');
          break;
        case 'kill': {
          v = views[e.id];
          if (v) { delete views[e.id]; v.dying = { t: 0, how: e.how, el: e.element, boss: e.kind === 'thornback' }; dying.push(v); }
          if (e.how !== 'shatter') vfx.hullEnd(e.id, false);
          if (e.kind === 'slug' || e.kind === 'snail') vfx.decal(1, e.x, e.z, 0.55, e.face, 7);
          if (!attract && S.phase !== 'review') pop(e.x, 0.9, e.z, '+' + e.pts, e.how === 'shatter' ? 'cold' : '');
          sfx(e.kind === 'beetle' || e.kind === 'grub' ? 'crunch' : 'squish');
          if (e.kind === 'thornback') { vfx.impact({ hold: hold(9), mode: 'full', at: tmpA.set(e.x, 1, e.z), element: 'fire' }); vfx.shake(0.022); sfx('roar'); vfx.debris(e.x, 1.2, e.z, 30, 'shell'); vfx.embers(e.x, 0.5, e.z, 30, { spread: 2 }); }
          break;
        }
        case 'scatter': v = views[e.id]; if (v) { delete views[e.id]; v.dying = { t: 0, how: 'scatter' }; dying.push(v); } break;
        case 'flee': break;
        case 'hide': v = views[e.id]; sfx('deflect'); break;
        case 'rear': hud.hint('eaten', 'Something is eating a herb. Its tag in the herb list turns red.'); break;
        case 'bite': {
          vfx.debris(e.x, 0.75, e.z, 3, 'leaf'); if (e.id >= 0) sfx('bite');
          break;
        }
        case 'trample': vfx.debris(e.x, 0.6, e.z, 10, 'leaf'); vfx.debris(e.x, 0.4, e.z, 6, 'soil'); break;
        case 'herbLost': {
          var nm = C.herbs[e.kind].name, lines = C.copy.herbLost, line = lines[e.eaten % lines.length].replace('{herb}', nm);
          hud.toast(line + '  ' + (C.garden.loseAt - e.eaten > 0 ? (C.garden.loseAt - e.eaten) + ' more and the night is lost.' : ''), true, 2.8);
          vfx.debris(e.x, 0.8, e.z, 16, 'leaf'); sfx('herbLost'); say(line);
          break;
        }
        case 'windup': {
          var len = e.len, wdt = e.boss ? 2.4 : 0.9;
          vfx.telegraph('w' + e.id, { type: 'line', x: e.x, z: e.z, dx: e.dx, dz: e.dz, len: len + (e.boss ? 1.2 : 0.4), width: wdt, color: e.boss ? 0xff5a2a : 0xff6a3a });
          sfx('windup', { dur: e.ticks / 60 }); v = views[e.id]; if (v) v.windT = 0;
          hud.hint('charge', touchMode ? 'A red lane means a charge is coming. Tap <b>skip</b> or step out of it.' : 'A red lane means a charge is coming. <b>Shift</b> to skip aside, or step out of it.');
          break;
        }
        case 'chargeLock': vfx.telegraph('w' + e.id, { type: 'line', x: e.x, z: e.z, dx: e.dx, dz: e.dz, len: e.len + 0.5, width: views[e.id] && views[e.id].kind === 'thornback' ? 2.4 : 0.9, color: 0xff3a1a }); break;
        case 'charge': setTimeoutFx(1.2, function () { hud.done('charge'); }); vfx.endTelegraph('w' + e.id); sfx('charge'); vfx.debris(e.x, 0.1, e.z, 6, 'soil'); break;
        case 'wallBonk': vfx.shake(e.boss ? 0.016 : 0.008); sfx('bonk'); vfx.debris(e.x, 0.6, e.z, 8, 'stone'); vfx.motes(e.x, 1.0, e.z, 6, { spread: 0.5 }); vfx.endTelegraph('w' + e.id); break;
        case 'witchHit':
          vfx.shake(0.014); sfx('witchHit'); witchV.hurt = 1; if (!attract) hurtPulse = 1; vfx.debris(W.x, 0.4, W.z, 8, 'soil');
          hud.toast(e.why === 'thorn' ? 'A thorn got you.' : e.why === 'stomp' ? 'Flattened by the stomp.' : 'Knocked flat!', true, 1.8);
          say('The witch is knocked down.');
          break;
        case 'dodge': sfx('dodge'); vfx.motes(W.x, 0.6, W.z, 8, { spread: 0.5 }); pop(W.x, 1.9, W.z, 'skipped!', 'cold'); break;
        case 'skip': hud.done('charge'); sfx('skip'); vfx.debris(e.x, 0.05, e.z, 5, 'soil'); break;
        case 'notReady': sfx('notReady'); hud.nope(e.spell); break;
        case 'stompWind': vfx.telegraph('s' + e.id, { type: 'circle', x: e.x, z: e.z, r: e.r, color: 0xff5a2a }); sfx('stompWind'); break;
        case 'stomp':
          vfx.endTelegraph('s' + e.id); vfx.shake(0.018); sfx('stomp'); vfx.decal(4, e.x, e.z, e.r * 1.1, Math.random() * 6, 7);
          vfx.debris(e.x, 0.2, e.z, LOW ? 14 : 26, 'soil'); vfx.debris(e.x, 0.2, e.z, 8, 'stone');
          for (var sm = 0; sm < 8; sm++) { var sa = sm / 8 * 6.283; vfx.smoke(e.x + Math.cos(sa) * e.r * 0.8, 0.3, e.z + Math.sin(sa) * e.r * 0.8, { size: 0.6, vy: 0.3, glow: 0, op: 0.5, vx: Math.cos(sa) * 1.2, vz: Math.sin(sa) * 1.2, life: 1.4 }); }
          break;
        case 'volleyWind': sfx('brood'); break;
        case 'thorn': {
          vfx.telegraph('t' + e.id, { type: 'circle', x: e.x, z: e.z, r: e.r, color: 0xff7a2a });
          var th = null; for (var q = 0; q < thorns.length; q++) if (!thorns[q].on) { th = thorns[q]; break; }
          if (th) { th.on = true; th.id = e.id; th.x0 = e.x0; th.z0 = e.z0; th.x1 = e.x; th.z1 = e.z; th.t0 = vfx.time; th.T = e.T / 60; th.m.visible = true; }
          sfx('thorn');
          break;
        }
        case 'thornLand': vfx.endTelegraph('t' + e.id); vfx.debris(e.x, 0.1, e.z, 6, 'soil'); vfx.decal(4, e.x, e.z, 0.8, Math.random() * 6, 4); sfx('thornLand'); thorns.forEach(function (t) { if (t.on && t.id === e.id) { t.on = false; t.m.visible = false; } }); break;
        case 'brood': hud.toast('The brood is coming over the wall.', true, 2); break;
        case 'bossDown': hud.banner('the last bell is done', 'The Thornback falls', 'And somewhere a rook clears its throat.', 3.2); say('The Thornback falls.'); break;
        case 'end': onEnd(e.result); break;
        case 'staged': break;
      }
    }
    // delayed effects run on the effect clock, so a hit hold delays them too
    var fxTimers = [];
    function setTimeoutFx(sec, fn) { fxTimers.push({ at: vfx.time + sec, fn: fn }); }
    function runFxTimers() { for (var i = fxTimers.length - 1; i >= 0; i--) if (vfx.time >= fxTimers[i].at) { var f = fxTimers[i].fn; fxTimers.splice(i, 1); f(); } }
    var hurtPulse = 0, postPose = [];

    // ------------------------------------------------------------ views per frame
    var ease = function (u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    var easeOut = function (u) { u = clamp(u, 0, 1); return 1 - Math.pow(1 - u, 3); };
    function poseWitch(dt, alpha, rdt) {
      var W = sim.S.witch, v = witchV, c = v.ch;
      var x = W.px + (W.x - W.px) * alpha, z = W.pz + (W.z - W.pz) * alpha;
      v.root.position.set(x, 0, z);
      v.face = lerpA(v.face, W.face, 1 - Math.exp(-dt * 20)); v.root.rotation.y = v.face;
      var spd = Math.sqrt(W.vx * W.vx + W.vz * W.vz), k = Math.min(1, spd / 4.7);
      v.walk += dt * (3 + spd * 2.1);
      var sw = Math.sin(v.walk);
      // targets
      var T = { lSh: sw * 0.5 * k, lShZ: 0.1, lEl: -0.25 - 0.2 * k, rSh: -0.4 - sw * 0.12 * k, rShZ: -0.06, rEl: -0.55, lean: 0.08 * k, twist: 0, crouch: 0, point: 0, fall: 0, step: 0, flare: 0 };
      var bob = Math.abs(sw) * 0.05 * k;
      if (W.cast) {
        var cs = W.cast, spc = C.spells[cs.name], ph = cs.phase;
        var u = ph === 'startup' ? (cs.t + alpha) / spc.startup : ph === 'active' ? (cs.t + alpha) / spc.active : (cs.t + alpha) / spc.recovery;
        if (cs.name === 'ember') {
          if (ph === 'startup') { var a = ease(Math.min(1, u / 0.72)), b = easeOut(Math.max(0, (u - 0.72) / 0.28));
            T.lSh = 2.7 * a - 4.6 * b; T.lShZ = 1.05 * a - 1.2 * b; T.lEl = -1.35 * a + 1.25 * b; T.twist = 1.05 * a - 1.75 * b; T.lean = -0.36 * a + 0.82 * b; T.crouch = -0.09 * a + 0.06 * b; T.step = -0.14 * a + 0.52 * b; T.rSh = -0.4 + 0.75 * a - 0.75 * b; T.flare = b; }
          else if (ph === 'active') { T.lSh = -1.9; T.lShZ = -0.15; T.lEl = -0.1; T.twist = -0.7; T.lean = 0.46; T.step = 0.38; T.flare = 1; }
          else { var r = ease(u); T.lSh = -1.85 * (1 - r) + T.lSh * r; T.lShZ = -0.15 * (1 - r); T.lEl = -0.1 * (1 - r) + T.lEl * r; T.twist = -0.7 * (1 - r); T.lean = 0.46 * (1 - r) + T.lean * r; T.step = 0.38 * (1 - r); T.flare = 1 - r; }
        } else if (cs.name === 'rime') {
          if (ph === 'startup') { var a2 = ease(Math.min(1, u / 0.62)), b2 = easeOut(Math.max(0, (u - 0.62) / 0.38));
            T.lSh = -0.9 * a2 - 0.7 * b2; T.lShZ = -0.65 * a2 + 0.55 * b2; T.lEl = -1.8 * a2 + 1.7 * b2; T.rSh = -0.4 - 1.6 * a2 + 0.9 * b2; T.rShZ = 0.3 * a2 - 0.2 * b2; T.rEl = -0.55 + 0.3 * a2 + 0.2 * b2; T.lean = -0.26 * a2 + 0.62 * b2; T.crouch = 0.03 * a2 - 0.14 * b2; T.step = -0.06 * a2 + 0.34 * b2; T.point = 0.95 * b2; }
          else if (ph === 'active') { T.lSh = -1.6; T.lShZ = -0.1; T.lEl = -0.1; T.rSh = -1.1; T.rShZ = 0.1; T.rEl = -0.05; T.lean = 0.36; T.crouch = -0.11; T.step = 0.28; T.point = 0.95; }
          else { var r2 = 1 - ease(u); T.lSh = -1.6 * r2; T.lShZ = -0.1 * r2; T.lEl = -0.1 * r2 - 0.3 * (1 - r2); T.rSh = -1.1 * r2 - 0.4 * (1 - r2); T.rEl = -0.05 * r2 - 0.55 * (1 - r2); T.lean = 0.36 * r2; T.crouch = -0.11 * r2; T.step = 0.28 * r2; T.point = 0.95 * r2; }
        } else if (cs.name === 'spark') {
          if (ph === 'startup') { var up3 = ease(Math.min(1, u / 0.55)), th3 = easeOut(Math.max(0, (u - 0.55) / 0.45)); T.rSh = -0.4 - 2.15 * up3 + 0.6 * th3; T.rShZ = -0.2 * up3; T.rEl = -0.55 + 0.3 * up3 + 0.25 * th3; T.lSh = -0.35 * up3 - 0.6 * th3; T.lEl = -0.7 * up3 + 0.2 * th3; T.lean = -0.12 * up3 + 0.3 * th3; T.twist = -0.2 * th3; T.point = 0.1 * up3 + 0.25 * th3; T.step = 0.14 * th3; }
          else if (ph === 'active') { T.rSh = -1.95; T.rShZ = -0.2; T.rEl = 0.0; T.lSh = -0.95; T.lEl = -0.5; T.lean = 0.18; T.twist = -0.2; T.point = 0.35; T.step = 0.14; }
          else { var r3 = 1 - ease(u); T.rSh = -1.95 * r3 - 0.4 * (1 - r3); T.rEl = -0.55 * (1 - r3); T.lean = 0.18 * r3; T.twist = -0.2 * r3; T.point = 0.35 * r3; }
        }
      }
      if (!W.cast && W.skipT <= 0 && sim.S.seeds.length) { T.lSh = -1.5; T.lShZ = -0.1; T.lEl = -0.2; T.lean = 0.22; T.step = 0.18; T.twist = -0.35; }
      if (W.skipT > 0) { T.lean = 0.38; T.lSh = 0.8; T.rSh = 0.1; T.crouch = -0.05; }
      if (W.knockT > 0) { var kk = W.knockT / C.witch.knockTicks; T.fall = kk > 0.25 ? -1.25 : -1.25 * (kk / 0.25); T.lSh = -1.4; T.lShZ = 0.9; T.rSh = -1.2; T.rShZ = -0.6; }
      var f = 1 - Math.exp(-dt * 26), ff = 1 - Math.exp(-dt * 9);
      for (var key in T) c[key] += (T[key] - c[key]) * (key === 'fall' ? ff : f);
      v.root.rotation.x = c.fall; v.root.position.y = 0;
      v.body.position.set(0, bob + c.crouch, c.step); v.body.rotation.x = c.lean; v.body.rotation.y = c.twist;
      v.skirt.rotation.z = sw * 0.06 * k; v.skirt.scale.set(1 + c.flare * 0.12, 1 - c.crouch * 0.8 - c.flare * 0.05, 1 + c.flare * 0.12);
      v.L.sh.rotation.set(c.lSh, 0, c.lShZ); v.L.el.rotation.x = c.lEl;
      v.R.sh.rotation.set(c.rSh, 0, c.rShZ); v.R.el.rotation.x = c.rEl;
      var vert = -(c.rSh + c.rEl) + 0.12, pointAt = Math.PI * 0.5 - (c.rSh + c.rEl) * 0.0;
      v.staff.rotation.x = vert * (1 - c.point) + (vert + 1.25) * c.point;
      v.staff.rotation.z = -c.rShZ;
      // the lantern hangs from the crook, swinging with her movement
      var axv = (W.vx - v.prevVx) / Math.max(dt, 1e-3), azv = (W.vz - v.prevVz) / Math.max(dt, 1e-3); v.prevVx = W.vx; v.prevVz = W.vz;
      if (dt > 0) { v.swingV += (-v.swing * 40 - v.swingV * 3.5) * dt - clamp(axv * Math.sin(v.face) + azv * Math.cos(v.face), -40, 40) * 0.012; v.swing += v.swingV * dt; }
      v.lanternBody.rotation.x = -(v.staff.rotation.x + c.rSh + c.rEl + c.lean + c.fall) + v.swing;
      v.hat.rotation.x = -0.12 - c.lean * 0.45 + Math.sin(v.walk * 2) * 0.02 * k;
      v.root.updateMatrixWorld();
      v.flame.getWorldPosition(v.lanternPos);
      v.L.hand.getWorldPosition(v.handPos);
      var flick = 1 + 0.08 * Math.sin(vfx.time * 13) + 0.05 * Math.sin(vfx.time * 31);
      // the light sits a little above and ahead of the lantern so it pools on the ground instead of bleaching her
      lanternLight.position.set(v.lanternPos.x + Math.sin(v.face) * 0.35, v.lanternPos.y + 1.1, v.lanternPos.z + Math.cos(v.face) * 0.35); lanternLight.intensity = 26 * flick * (W.knockT > 0 ? 0.6 : 1);
      if (W.cast && W.cast.name === 'spark' && W.cast.phase === 'startup') { lanternLight.color.setRGB(0.75, 0.75, 1.0); if (Math.random() < 0.35) crackle(); } else lanternLight.color.setRGB(1.0, 0.66, 0.31);
      if (v.handGlowI >= 0 && W.cast && W.cast.name === 'ember') vfx.moveGlow(v.handGlowI, v.handPos.x, v.handPos.y, v.handPos.z);
      if (W.cast && W.cast.name === 'ember' && W.cast.phase !== 'recovery' && dt > 0) vfx.glow(v.handPos.x, v.handPos.y, v.handPos.z, 2.4, 0.9, 0.25, W.cast.phase === 'active' ? 0.2 : 0.12, 0.16, false);
      if (W.cast && W.cast.name === 'rime' && W.cast.phase === 'startup' && Math.random() < 0.6) vfx.motes(v.handPos.x, v.handPos.y - 0.1, v.handPos.z, 1, { spread: 0.2, up: 0.1, h: 0.1 });
      v.hurt = Math.max(0, v.hurt - rdt * 3);
      var inv = W.invT > 0 && W.knockT <= 0 ? 0.5 + 0.5 * Math.sin(vfx.time * 14) : 0;
      v.mats.forEach(function (m) { m.emissive.setRGB(v.hurt * 0.55 + inv * 0.05, v.hurt * 0.12 + inv * 0.07, v.hurt * 0.08 + inv * 0.11); });
      vfx.shadow(x, z, 0.62, 1);
    }
    var lastCrackle = 0;
    function crackle() {
      if (vfx.time - lastCrackle < 0.06) return; lastCrackle = vfx.time;
      var a = Math.random() * 6.283, p = witchV.lanternPos;
      vfx.bolt(p.clone(), new V(p.x + Math.cos(a) * 0.35, p.y + (Math.random() - 0.3) * 0.4, p.z + Math.sin(a) * 0.35), { leader: 0.02, hold: 0.06, levels: 3, branches: 0.3, width: 0.012 });
    }
    function updateEnemyView(v, e, dt, alpha) {
      var x = e.px + (e.x - e.px) * alpha, z = e.pz + (e.z - e.pz) * alpha, y = 0;
      var t = vfx.time;
      if (e.state === 'climb') {
        var k = clamp((e.st + alpha) / e.climbT, 0, 1);
        var wallH = (Math.abs(e.fromZ - 12.75) < 0.1 || Math.abs(e.fromX - 12.75) < 0.1) ? 0.95 : 1.3;
        if (e.kind === 'thornback') { y = wallH * (1 - k) + Math.sin(k * Math.PI) * 0.8; }
        else y = k < 0.45 ? wallH + Math.sin(k / 0.45 * Math.PI) * 0.15 : wallH * (1 - (k - 0.45) / 0.55) + Math.sin((k - 0.45) / 0.55 * Math.PI) * 0.5;
        y = Math.max(0, y);
      }
      v.recoil = Math.max(0, (v.recoil || 0) - dt * 3.2);
      var small = v.kind === 'slug' || v.kind === 'snail' || v.kind === 'grub', rk = v.recoil * v.recoil, push = small ? 0.5 : v.kind === 'thornback' ? 0.25 : 0.45;
      var bx = -Math.sin(v.face) * push * rk, bz = -Math.cos(v.face) * push * rk;
      v.jolt = Math.max(0, (v.jolt || 0) - dt * 3.5); var jt = v.jolt, jx = jt > 0 ? Math.sin(vfx.time * 90 + v.id) * 0.1 * jt : 0, jz = jt > 0 ? Math.cos(vfx.time * 77 + v.id) * 0.1 * jt : 0;
      v.root.position.set(x + bx + jx, y + Math.sin(v.recoil * Math.PI) * (small ? 0.4 : v.kind === 'thornback' ? 0.15 : 0.3) + Math.sin(jt * Math.PI) * 0.22, z + bz + jz);
      v.root.rotation.z = jt > 0 ? Math.sin(vfx.time * 60 + v.id) * 0.25 * jt : 0;
      if (small && v.recoil > 0) { var sq = Math.sin(v.recoil * Math.PI); v.root.scale.set(1 + 0.15 * sq, 1 + 0.35 * sq, 1 - 0.1 * sq); } else if (!v.dying) v.root.scale.setScalar(1);
      v.face = lerpA(v.face, e.face, 1 - Math.exp(-dt * 12)); v.root.rotation.y = v.face;
      var spd = Math.sqrt(e.vx * e.vx + e.vz * e.vz), frozen = e.frozenT > 0;
      if (!frozen) v.anim += dt * (2 + spd * 7);
      var kind = v.kind;
      if (kind === 'slug' || kind === 'snail') {
        var wave = Math.sin(v.anim * 2.2), sm = Math.min(1, spd * 1.4);
        var rearK = e.state === 'rear' ? Math.min(1, e.st / 12) : 0, eat = e.state === 'eat' ? 1 : 0;
        v.retract += ((e.hideT > 0 ? 1 : 0) - v.retract) * Math.min(1, dt * 10);
        var ret = v.retract;
        v.body.scale.set(1 - 0.35 * ret, (1 - wave * 0.05 * sm) * (1 - 0.5 * ret), (1 + wave * 0.1 * sm + (e.state === 'flee' ? 0.15 : 0)) * (1 - 0.65 * ret));
        v.body.rotation.x = -0.32 * rearK + eat * (Math.sin(t * 11) * 0.1 - 0.06);
        v.body.position.y = rearK * 0.05;
        v.stalks.forEach(function (s, i) { s.visible = ret < 0.5; s.rotation.x = 0.5 + Math.sin(t * 3 + i * 2 + v.id) * 0.18 + rearK * 0.3; s.rotation.z = (i ? 1 : -1) * (0.25 + Math.sin(t * 2.3 + i) * 0.1); });
        if (spd > 0.2 && t - v.lastSlime > 0.45 && e.state !== 'climb') { v.lastSlime = t; vfx.decal(1, x - Math.sin(v.face) * 0.25, z - Math.cos(v.face) * 0.25, 0.32, v.face, 5); }
      } else {
        var boss = kind === 'thornback';
        var gait = Math.min(1, spd * 0.9 + (e.state === 'charge' ? 1 : 0));
        v.legs.forEach(function (L, i) { var ph = (L.k % 2 === (L.s > 0 ? 0 : 1)) ? 0 : Math.PI; L.m.rotation.x = Math.sin(v.anim * 2.6 + ph) * 0.55 * gait; L.m.rotation.z = L.s * (1.0 + Math.cos(v.anim * 2.6 + ph) * 0.15 * gait); });
        var wind = e.state === 'windup' || e.state === 'stompWind' || e.state === 'volleyWind';
        if (wind) v.windT += dt; else v.windT = 0;
        var openT = boss ? (e.bossPhase === 2 || e.plates === 0 ? 1 : 0) : (!e.armored ? 1 : 0);
        v.open += (openT - v.open) * Math.min(1, dt * 6);
        v.crack = Math.max(0, v.crack - dt * 2);
        var rear = e.state === 'windup' ? -0.22 : e.state === 'stompWind' ? -0.42 * Math.min(1, e.st / 30) : e.state === 'charge' ? 0.1 : e.state === 'roar' ? -0.35 + Math.sin(t * 20) * 0.05 : 0;
        var daze = (e.state === 'recover' || e.state === 'dazed' || e.stagT > 0) ? Math.sin(t * 13) * 0.08 : 0;
        v.body.rotation.x += (rear - (v.recoil || 0) * 0.45 - v.body.rotation.x) * Math.min(1, dt * 14);
        v.body.rotation.z = daze + (wind ? Math.sin(t * 40) * 0.025 : 0);
        v.body.position.y = e.state === 'stompWind' ? 0.25 * Math.min(1, e.st / 30) : 0;
        v.plates.forEach(function (p, i) {
          var cracked = boss ? (e.bossPhase === 2 ? true : i >= e.plates) : !e.armored;
          var lift = wind ? 0.12 : 0;
          var openA = boss ? 0.55 : 0.34;
          if (p.side) { p.g.rotation.z = p.side * (lift + v.open * openA); p.g.rotation.x = -v.open * openA * 0.45; }
          else { p.g.rotation.x = -v.open * openA * 0.6 - lift; }
          var cu = p.mesh.material.userData.crack; if (cu) { cu.uCrack.value = cracked ? 1 : 0; cu.uHot.value = cracked ? 0.45 + v.crack * 1.3 : 0; }
          p.g.visible = !(boss && e.bossPhase === 2);
          p.mesh.material.emissive.setRGB(v.crack * 0.35, v.crack * 0.25, v.crack * 0.3);
        });
        var glow = wind ? 0.8 + 0.6 * Math.sin(t * 22) : 0.25;
        v.eyes.color.setRGB(0.3 + glow * 3, 0.08 + glow * 0.5, 0.03);
        v.flesh.emissive.setRGB((boss ? 0.35 : 0.12) * v.open + v.crack * 0.4, (boss ? 0.12 : 0.04) * v.open + v.crack * 0.12, 0.02 * v.open);
        if (boss && v.thorns) v.thorns.forEach(function (th, i) { th.scale.y = e.state === 'volleyWind' ? 1.25 + 0.15 * Math.sin(t * 30 + i) : 1; });
      }
      // status: hurt flash, burning, slowed, frozen
      v.hurt = Math.max(0, v.hurt - dt * 7);
      var burn = e.burnT > 0 ? 0.25 + 0.15 * Math.sin(t * 25 + v.id) : 0;
      var slow = e.slowT > 0 || frozen ? 1 : 0;
      var chill = e.slowT > 0 && !frozen ? Math.min(1, e.slowT / 40) : 0;
      v.chill = (v.chill || 0) + (chill - (v.chill || 0)) * Math.min(1, dt * 8);
      v.mats.forEach(function (m, i) { m.color.copy(v.baseCol[i]).lerp(FROSTCOL, v.chill * 0.78); });
      v.mats.forEach(function (m, i) {
        if (i === 2 && v.flesh === m) return;
        if (v.plates && v.plates.some(function (p) { return p.mesh.material === m; }) && !v.hurt && !burn) return;
        m.emissive.setRGB(v.hurt * v.hurtCol[0] * 0.9 + burn + slow * 0.05, v.hurt * v.hurtCol[1] * 0.9 + burn * 0.3 + slow * 0.1, v.hurt * v.hurtCol[2] * 0.9 + slow * 0.24);
      });
      if (burn && Math.random() < dt * 8) vfx.embers(x, heightOf(kind), z, 1, { spread: 0.3, up: 0.6, speed: 0.4 });
      if (e.slowT > 0 && !frozen && Math.random() < dt * 9) vfx.motes(x, heightOf(kind) + 0.15, z, 1, { spread: 0.35, up: 0.05, h: 0.1 });
      if (frozen) vfx.hullMove(e.id, x, z);
      var shs = kind === 'thornback' ? 2.4 : kind === 'beetle' ? 0.62 : kind === 'grub' ? 0.42 : 0.5;
      vfx.shadow(x, z, shs, e.state === 'climb' ? Math.max(0, 1 - y) : 1);
      if (kind !== 'thornback' && e.hp < e.max && e.state !== 'climb') vfx.bar(x, heightOf(kind) + (kind === 'beetle' ? 0.55 : 0.5), z, Math.max(0, e.hp / e.max), e.armored, kind === 'beetle' ? 0.34 : 0.26, 0.95);
    }
    function updateDying(v, dt) {
      var d = v.dying; d.t += dt;
      var dur = d.boss ? 2.2 : d.how === 'scatter' ? 1.2 : d.how === 'shatter' ? 0.01 : 0.95, u = Math.min(1, d.t / dur);
      if (d.how === 'shatter') { v.root.visible = false; }
      else if (d.how === 'scatter') { v.root.position.y = 0; v.root.scale.setScalar(1 - u); v.root.position.x += Math.sin(v.face) * dt * 3; v.root.position.z += Math.cos(v.face) * dt * 3; }
      else if (d.boss) {
        v.body.rotation.z = ease(u) * 2.4; v.root.position.y = -ease(Math.max(0, u - 0.5) * 2) * 1.2;
        if (Math.random() < dt * 10) vfx.smoke(v.root.position.x + (Math.random() - 0.5) * 2, 0.6, v.root.position.z + (Math.random() - 0.5) * 2, { size: 0.8, glow: 0.8 });
      } else if (d.el === 'fire') {
        if (d.y0 === undefined) { d.y0 = v.root.position.y; d.spin = (Math.random() - 0.5) * 3; }
        var hop = Math.sin(Math.min(1, d.t / 0.32) * Math.PI) * 0.32;
        v.root.position.y = d.y0 + hop; v.root.rotation.y += d.spin * dt;
        v.body.rotation.x = -0.9 * ease(Math.min(1, d.t / 0.3));
        v.mats.forEach(function (m) { m.color.lerp(tmpCol.setRGB(0.03, 0.025, 0.02), Math.min(1, dt * 5)); m.emissive.setRGB(0.5 * (1 - u), 0.14 * (1 - u), 0.01 * (1 - u)); });
        v.root.scale.set(1 - 0.25 * u, 1 - 0.7 * ease(Math.max(0, u - 0.3) / 0.7), 1 - 0.35 * u);
        if (!d.puffed) { d.puffed = true; vfx.smoke(v.root.position.x, 0.5, v.root.position.z, { size: 0.22, glow: 1, op: 0.45, vy: 1.2 }); vfx.embers(v.root.position.x, 0.25, v.root.position.z, 7, { spread: 0.3, up: 1.6 }); }
      } else if (d.el === 'lightning') {
        v.root.position.x += (Math.random() - 0.5) * 0.04 * (1 - u); v.root.scale.set(1 + 0.1 * u, 1 - 0.8 * ease(u), 1 + 0.1 * u);
        v.mats.forEach(function (m) { m.emissive.setRGB(0.3 * (1 - u), 0.32 * (1 - u), 0.7 * (1 - u)); });
      } else {
        v.root.scale.set(1 + 0.25 * u, 1 - 0.85 * ease(u), 1 + 0.25 * u);
      }
      if (u >= 1) { releaseView(v); return true; }
      return false;
    }
    var tmpCol = new THREE.Color(), FROSTCOL = new THREE.Color(0.78, 0.88, 1.0);
    function updateThorns() {
      thorns.forEach(function (t) {
        if (!t.on) return;
        var k = clamp((vfx.time - t.t0) / t.T, 0, 1);
        var x = t.x0 + (t.x1 - t.x0) * k, z = t.z0 + (t.z1 - t.z0) * k, y = 1.6 * (1 - k) + 4 * k * (1 - k) * 2.2;
        var k2 = Math.min(1, k + 0.02), x2 = t.x0 + (t.x1 - t.x0) * k2, z2 = t.z0 + (t.z1 - t.z0) * k2, y2 = 1.6 * (1 - k2) + 4 * k2 * (1 - k2) * 2.2;
        t.m.position.set(x, y, z); t.m.lookAt(x2, y2, z2);
        vfx.telegraphProgress('t' + t.id, k);
      });
    }
    function updatePreviews() {
      var S = sim.S, W = S.witch, show = mode === 'playing' && !attract && S.phase !== 'over' && S.phase !== 'upgrade';
      var ret = vfx.reticle, pe = vfx.previewEmber, pr = vfx.previewRime, ps = vfx.previewSpark;
      var ax, az, src = null;
      if (tAim.on && tAim.aiming) { ax = tAim.wx; az = tAim.wz; src = tAim.spell; }
      else if (W.cast && W.cast.phase === 'startup') { ax = W.cast.ax; az = W.cast.az; src = W.cast.name; }
      else if (aim.mode === 'mouse' && !touchMode && aim.has) { ax = aim.x; az = aim.z; }
      ret.visible = show && aim.mode === 'mouse' && !touchMode && aim.has;
      if (ret.visible) { ret.position.set(aim.x, 0.03, aim.z); ret.scale.set(0.9, 1, 0.9); ret.material.uniforms.uAlpha.value = 0.85; ret.material.uniforms.uCol.value.set(W.cd.ember <= 0 ? 0xf3e6c4 : 0x9a8f78); }
      pe.visible = pr.visible = ps.visible = false;
      if (!show || ax === undefined) return;
      var dx = ax - W.x, dz = az - W.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
      if (src === 'ember') {
        var dist = clamp(d, C.spells.ember.minRange, C.spells.ember.range), Rr = sim.emberRingR();
        pe.visible = true; pe.position.set(clamp(W.x + dx / d * dist, -11.6, 11.6), 0.035, clamp(W.z + dz / d * dist, -11.6, 11.6)); pe.scale.set(Rr * 2, 1, Rr * 2); pe.material.uniforms.uAlpha.value = 0.9;
      } else if (src === 'rime') {
        var rr = sim.rimeRange(); pr.visible = true; pr.position.set(W.x + dx / d * 0.25, 0.035, W.z + dz / d * 0.25); pr.rotation.y = Math.atan2(dx, dz); pr.scale.set(rr, 1, rr);
        pr.material.uniforms.uHalf.value = C.spells.rime.halfAngle; pr.material.uniforms.uAlpha.value = 0.85;
      }
      if (src === 'spark' || (!src && W.cd.spark <= 0 && aim.mode === 'mouse' && !touchMode)) {
        var t = sim.sparkPreview(ax, az);
        if (t) { ps.visible = true; ps.position.set(t.x, 0.04, t.z); ps.scale.set(t.r * 3.2, 1, t.r * 3.2); ps.material.uniforms.uAlpha.value = src ? 1 : 0.55; }
      }
    }

    // ------------------------------------------------------------ the frame
    function frame(now) {
      requestAnimationFrame(frame);
      var rdt = Math.min(Math.max(0.1, MAXSTEPS / 60), (now - lastT) / 1000); lastT = now; fpsN++; if (now - fpsT > 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; }
      if (mode === 'loading' || mode === 'paused' || mode === 'film' || document.hidden || !sim) return;
      if (mode === 'playing' || mode === 'title') {
        acc += rdt; var n = 0;
        while (acc >= DT && n < MAXSTEPS) { stepOnce(); acc -= DT; n++; }
        if (n >= MAXSTEPS) acc = 0;
      }
      if (aim.lockT > 0) aim.lockT -= rdt;
      render(rdt, mode === 'film' ? 0 : acc / DT);
      sound.tick();
      if (endTimer > 0 && (endTimer -= rdt) <= 0) showEnd();
      if (attract && sim.S.phase === 'over' && !attractRestart) { attractRestart = 3; }
      if (attractRestart > 0 && (attractRestart -= rdt) <= 0) { attractRestart = 0; if (mode === 'title') newSim({ seed: (seed + Math.floor(Math.random() * 1000)) >>> 0, attract: true }); }
    }
    var sceneCalls = 0, sceneTris = 0, filmT0 = 0;
    var attractRestart = 0, fps = 0, fpsN = 0, fpsT = performance.now();
    function stepOnce() {
      if (pilot) sim.setInput(pilot());
      else if (apiInput) sim.setInput(apiInput);
      else sim.setInput(currentInput());
      sim.tick();
      handleEvents(sim.drain());
      if (apiInput) apiInput.pEmber = apiInput.pRime = apiInput.pSpark = apiInput.pSkip = false;
    }
    function render(rdt, alpha) {
      var S = sim.S;
      var effT = effBase + (S.tick + (S.hitstop > 0 ? 0 : alpha)) / 60;
      var dt = Math.max(0, Math.min(0.1, effT - vfx.time));
      vfx.update(dt, rdt);
      runFxTimers();
      world.shared.time.value = vfx.time;
      vfx.beginShadows(); vfx.beginBars();
      poseWitch(dt, alpha, rdt);
      while (postPose.length) { var pb = postPose.shift(); pb.opt.delay = pb.t - vfx.time; vfx.bolt(witchV.lanternPos.clone(), pb.to, pb.opt); }
      vfx.beginBurns();
      for (var i = 0; i < S.enemies.length; i++) { var e = S.enemies[i], v = views[e.id]; if (!v) v = makeView(e); updateEnemyView(v, e, dt, alpha); if (e.burnT > 0 && e.frozenT <= 0) vfx.burn(e.id, v.root.position.x, v.root.position.y + heightOf(e.kind) * 0.55, v.root.position.z, e.kind === 'thornback' ? 2.2 : e.kind === 'beetle' ? 1.1 : 0.95); }
      for (var dI = 0; dI < dying.length; dI++) { var dv = dying[dI]; if (dv.dying && dv.dying.el === 'fire' && dv.dying.t < 0.7) vfx.burn('d' + dv.id, dv.root.position.x, dv.root.position.y + 0.1, dv.root.position.z, 1.5 * (1 - dv.dying.t * 0.8)); }
      vfx.endBurns();
      for (var j = dying.length - 1; j >= 0; j--) if (updateDying(dying[j], dt)) dying.splice(j, 1);
      world.updateHerbs(S.herbs, dt, vfx.time);
      S.herbs.forEach(function (h) { if (!h.eaten && h.hp < h.max) vfx.bar(h.x, 1.75, h.z, h.hp / h.max, false, 0.34, 0.9); });
      vfx.eachSeed(function (p) { vfx.shadow(p.x, p.z, 0.22 + p.y * 0.04, Math.max(0.25, 1 - p.y * 0.18)); });
      vfx.endShadows(); vfx.endBars();
      updateThorns();
      updateCamera(rdt, alpha);
      updatePreviews();
      if (mode === 'playing' || mode === 'film') { hud.frame(rdt); updateArrows(); }
      hud.tick(rdt); updatePops(rdt);
      // composite: impact frames, a gentle hurt pulse
      var imp = vfx.impactState(), u = compMat.uniforms;
      u.uImp.value = imp.t > 0 ? 1 : 0; u.uImpMode.value = imp.mode; u.uImpC.value.set(imp.cx, imp.cy); u.uImpR.value = imp.r; u.uImpSeed.value = imp.seed;
      u.uInk.value.copy(imp.ink); u.uPaper.value.copy(imp.paper);
      u.uDim.value = imp.dimT > 0 ? imp.dim * Math.min(1, imp.dimT / 0.08) : 0;
      hurtPulse = Math.max(0, hurtPulse - rdt * 1.4); u.uHurt.value = hurtPulse * 0.8 + (S.witch.knockT > 0 ? 0.25 : 0);
      u.uTime.value = performance.now() / 1000;
      renderer.setRenderTarget(rt); renderer.render(scene, cam); sceneCalls = renderer.info.render.calls; sceneTris = renderer.info.render.triangles;
      renderer.setRenderTarget(null); renderer.render(compScene, compCam);
    }
    function resize() {
      var w = innerWidth, h = innerHeight;
      renderer.setSize(w, h);
      var pw = Math.floor(w * DPR), ph = Math.floor(h * DPR);
      rt.setSize(pw, ph); compMat.uniforms.uRes.value.set(pw, ph);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      vfx.setSize(w, h, DPR);
      document.querySelectorAll('.screen.on .paper').forEach(deckle);
    }
    window.addEventListener('resize', resize);

    // ------------------------------------------------------------ screens
    var screens = ['loading', 'error', 'title', 'how', 'settings', 'pause', 'upgrade', 'end'];
    var returnFocus = null, subFrom = null;
    function screenOpen(id) { return $('#' + id).classList.contains('on'); }
    function show(id, on) {
      var el = $('#' + id); el.classList.toggle('on', on);
      if (on) { el.querySelectorAll('.paper').forEach(deckle); var f = el.querySelector('.btn, .packet'); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (er) {} }, 30); }
    }
    // hand-cut paper: a slightly ragged polygon round every sheet
    function deckle(el) {
      var w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return; // layout size: clip-path lives in the element's own (unscaled) box
      var pts = [], rnd = SIM.stream(Math.round(w * 7 + h), 'deckle'), n;
      n = Math.max(8, Math.round(w / 26)); for (var i = 0; i <= n; i++) pts.push((i / n * w).toFixed(1) + 'px ' + (rnd() * 2.6).toFixed(1) + 'px');
      n = Math.max(8, Math.round(h / 26)); for (i = 1; i <= n; i++) pts.push((w - rnd() * 2.6).toFixed(1) + 'px ' + (i / n * h).toFixed(1) + 'px');
      n = Math.max(8, Math.round(w / 26)); for (i = n - 1; i >= 0; i--) pts.push((i / n * w).toFixed(1) + 'px ' + (h - rnd() * 2.6).toFixed(1) + 'px');
      n = Math.max(8, Math.round(h / 26)); for (i = n - 1; i >= 1; i--) pts.push((rnd() * 2.6).toFixed(1) + 'px ' + (i / n * h).toFixed(1) + 'px');
      el.style.clipPath = 'polygon(' + pts.join(',') + ')';
    }
    var ro = null; if (window.ResizeObserver) { ro = new ResizeObserver(function (en) { en.forEach(function (x) { deckle(x.target); }); }); document.querySelectorAll('.paper').forEach(function (p) { ro.observe(p); }); }
    else if (document.fonts) document.fonts.ready.then(function () { document.querySelectorAll('.screen.on .paper').forEach(deckle); });
    function openSub(id, from) { subFrom = from; returnFocus = document.activeElement; if (from) show(from, false); show(id, true); }
    function closeSub() {
      ['how', 'settings'].forEach(function (s) { if (screenOpen(s)) show(s, false); });
      if (subFrom) show(subFrom, true);
      subFrom = null;
    }
    function setStageMenu(on) { stage.classList.toggle('menu', on); }

    function goTitle() {
      mode = 'title';
      screens.forEach(function (s) { if (s !== 'title') show(s, false); });
      show('title', true); $('#hud').classList.remove('on'); $('#touch').classList.remove('on'); setStageMenu(true);
      $('#attractnote').classList.toggle('on', true);
      $('#seedval').textContent = seed; $('#seedkind').textContent = seedDaily ? '· the daily night' : '· a night of your own';
      var best = store.get('best', 0); $('#bestline').textContent = best ? 'Best night so far: ' + best.toLocaleString('en-GB') + (store.get('bestResult', '') === 'won' ? ', and the garden saw the dawn.' : '.') : 'No best night yet.';
      newSim({ seed: seed + 101, attract: true });
      sound.setMusic('title');
    }
    function startRun(o) {
      sound.unlock(); sound.setMuted(settings.muted);
      screens.forEach(function (s) { show(s, false); });
      $('#attractnote').classList.remove('on');
      runStart = performance.now();
      mode = 'playing'; // before the new night's first events, so its coach lines can show
      newSim({ seed: seed, start: o || {} });
      setStageMenu(false);
      $('#hud').classList.add('on'); setTouchMode(touchMode);
      $('#reviewnote').classList.toggle('on', !!(o && o.review));
      if (o && o.review) $('#reviewnote').textContent = 'Review: ' + o.review + '. Cast with its key; R stages it again.';
      hintCount++; store.set('runs', hintCount);
      lastT = performance.now(); acc = 0;
      announce('The night begins. ' + C.waves[sim.S.wave].bell + '.');
    }
    function pause(why) {
      if (mode !== 'playing') return;
      mode = 'paused'; show('pause', true); setStageMenu(true); sound.setMusic('pause'); hud.hintOff();
      $('#pausesub').textContent = why === 'hidden' || why === 'blur' ? 'paused while you were away' : 'the garden holds its breath';
      keys = {}; held.ember = held.rime = held.spark = false;
      announce('Paused.');
    }
    function resume() {
      if (mode !== 'paused') return;
      show('pause', false); closeSub(); mode = 'playing'; setStageMenu(false); lastT = performance.now(); acc = 0;
      sound.setMusic(sim.S.phase === 'wave' ? (C.waves[sim.S.wave].boss ? 'boss' : 'wave') : 'calm');
      if (sim.S.phase === 'upgrade' && sim.S.offer) showUpgrade(sim.S.offer);
      announce('Resumed.');
    }
    var UP_ICON = { ember: ['i-ember', '#c4521d'], rime: ['i-rime', '#3f6fae'], spark: ['i-spark', '#4b4fb0'] };
    function showUpgrade(ids) {
      var box = $('#packets'); box.innerHTML = '';
      ids.forEach(function (id, i) {
        var u = C.upgrades.filter(function (q) { return q.id === id; })[0];
        var ic = UP_ICON[u.spell] || ['i-charm', '#5d7a3a'];
        var b = document.createElement('button'); b.className = 'packet';
        b.innerHTML = '<div class="paper"><svg style="color:' + ic[1] + '" aria-hidden="true"><use href="#' + ic[0] + '"/></svg><span class="tagl">' + (u.spell ? 'for ' + u.spell : 'for the garden') + '</span><h3>' + u.name + '</h3><p>' + u.text + '</p><span class="k">press ' + (i + 1) + '</span></div>';
        b.setAttribute('aria-label', u.name + '. ' + u.text);
        b.addEventListener('click', function () { choose(i); });
        box.appendChild(b); if (ro) ro.observe(b.querySelector('.paper'));
      });
      var next = C.waves[Math.min(sim.S.wave + 1, C.waves.length - 1)];
      $('#upt').textContent = sim.S.wave === 0 ? 'The first bell is done.' : 'The bell\'s foes are done.';
      $('#upsub').textContent = 'Choose a charm for ' + next.bell.toLowerCase() + (next.boss ? '. Something big is coming.' : '.');
      show('upgrade', true); setStageMenu(true);
      announce('Choose a charm: ' + ids.map(function (id) { return C.upgrades.filter(function (q) { return q.id === id; })[0].name; }).join(', ') + '.');
    }
    function choose(i) {
      if (!sim || sim.S.phase !== 'upgrade') return;
      var id = sim.S.offer[i]; if (!id) return;
      sim.choose(i); handleEvents(sim.drain());
      show('upgrade', false); if (mode === 'playing') setStageMenu(false);
      var u = C.upgrades.filter(function (q) { return q.id === id; })[0];
      hud.toast(u.name + '.', false, 1.6); announce('Chosen: ' + u.name + '.');
    }
    function onEnd(result) {
      if (attract) return;
      hud.hintOff(); hud.toastOff();
      sound.setMusic(result === 'won' ? 'win' : 'lose'); sound.play(result === 'won' ? 'win' : 'lose');
      endTimer = result === 'won' ? 2.4 : 1.6;
    }
    function showEnd() {
      var S = sim.S, won = S.result === 'won';
      mode = 'over'; setStageMenu(true); $('#touch').classList.remove('on'); hud.hintOff(); hud.toastOff(); $('#banner').classList.remove('on');
      var lines = won ? C.copy.win : C.copy.lose, line = lines[S.seed % lines.length];
      $('#endsub').textContent = won ? 'the rooks are up' : 'the beds are bare';
      $('#endt').textContent = won ? 'Dawn over Brackenhollow' : 'The night is lost';
      $('#endline').textContent = line;
      var st = S.stats, secs = Math.round(S.tick / 60);
      var rows = [['Herbs standing', sim.standing() + ' of 12'], ['Bells seen through', (won ? 6 : S.wave) + ' of 6'], ['Slugs', st.slug], ['Snails', st.snail + (st.shattered ? ' (' + st.shattered + ' shattered)' : '')], ['Beetles', st.beetle + (st.grub ? ' and ' + st.grub + ' grubs' : '')],
        ['The Thornback', st.thornback ? 'felled' : (S.wave >= 5 ? 'still standing' : 'never came')], ['Longest chain', st.longestChain || 0], ['Knocked flat', st.knocked + (st.knocked === 1 ? ' time' : ' times')], ['Time', Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2)], ['Charms', S.upList.map(function (id) { return C.upgrades.filter(function (q) { return q.id === id; })[0].name; }).join(', ') || 'none']];
      $('#stats').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
      $('#endscore').textContent = S.score.toLocaleString('en-GB');
      var best = store.get('best', 0), isBest = S.score > best;
      if (isBest) { store.set('best', S.score); store.set('bestResult', S.result); }
      $('#endbest').innerHTML = isBest ? 'A new best night.<span class="newbest">new best</span>' : best > 0 ? 'Best night: ' + best.toLocaleString('en-GB') + '.' : 'No best night yet.';
      $('#endseed').textContent = 'Seed ' + S.seed + (seedDaily ? ' (the daily night)' : '') + '. Play again keeps the same night; a new night rolls a new seed.';
      show('end', true);
      announce((won ? 'Dawn. ' : 'The night is lost. ') + 'Score ' + S.score + '. ' + (isBest ? 'A new best.' : ''));
      $('#srscore').textContent = 'Final score ' + S.score;
    }
    function toggleMute() {
      settings.muted = !settings.muted; saveSettings(); sound.setMuted(settings.muted);
      $('#btnMute use').setAttribute('href', settings.muted ? '#i-mute' : '#i-sound');
      $('#btnMute').setAttribute('aria-label', settings.muted ? 'Unmute sound (M)' : 'Mute sound (M)');
      syncSettings(); announce(settings.muted ? 'Sound off.' : 'Sound on.');
    }
    function syncSettings() {
      $('#setSound').textContent = settings.muted ? 'off' : 'on'; $('#setSound').setAttribute('aria-pressed', String(!settings.muted));
      var safe = settings.flashes === 'safe';
      $('#setFlash').textContent = safe ? 'on' : 'off'; $('#setFlash').setAttribute('aria-pressed', String(safe));
      $('#setShake').textContent = settings.shake && !safe ? 'on' : 'off'; $('#setShake').setAttribute('aria-pressed', String(settings.shake && !safe));
      $('#setQuality').textContent = settings.quality;
      $('#qualnote').textContent = 'Drawing at ' + (LOW ? 'the lighter' : 'the fuller') + ' detail now' + (settings.quality !== (qs.get('quality') || settings.quality) ? '' : '') + '. A detail change takes effect when the page reloads.';
      vfx.opts.flashes = settings.flashes; vfx.opts.shake = settings.shake && !safe ? 1 : 0;
      $('#btnMute use').setAttribute('href', settings.muted ? '#i-mute' : '#i-sound');
    }
    $('#btnPlay').addEventListener('click', function () { sound.play('select'); startRun({}); });
    $('#btnHow').addEventListener('click', function () { sound.unlock(); sound.play('ui'); openSub('how', 'title'); });
    $('#btnSettings').addEventListener('click', function () { sound.unlock(); sound.play('ui'); openSub('settings', 'title'); });
    $('#btnHowBack').addEventListener('click', function () { sound.play('ui'); closeSub(); });
    $('#btnSetBack').addEventListener('click', function () { sound.play('ui'); closeSub(); });
    $('#btnNewSeed').addEventListener('click', function () { sound.unlock(); sound.play('ui'); seed = (Math.floor(Math.random() * 900000) + 100000) >>> 0; seedDaily = false; $('#seedval').textContent = seed; $('#seedkind').textContent = '· a night of your own'; });
    $('#btnPause').addEventListener('click', function () { if (mode === 'playing') pause('button'); else if (mode === 'paused') resume(); });
    $('#btnMute').addEventListener('click', function () { sound.unlock(); toggleMute(); });
    $('#btnResume').addEventListener('click', function () { sound.play('ui'); resume(); });
    $('#btnRestart').addEventListener('click', function () { sound.play('select'); show('pause', false); startRun(runOpts.start || {}); });
    $('#btnPauseHow').addEventListener('click', function () { sound.play('ui'); openSub('how', 'pause'); });
    $('#btnPauseSet').addEventListener('click', function () { sound.play('ui'); openSub('settings', 'pause'); });
    $('#btnQuit').addEventListener('click', function () { sound.play('ui'); goTitle(); });
    $('#btnAgain').addEventListener('click', function () { sound.play('select'); startRun({}); });
    $('#btnNewNight').addEventListener('click', function () { sound.play('select'); seed = (Math.floor(Math.random() * 900000) + 100000) >>> 0; seedDaily = false; startRun({}); });
    $('#btnEndTitle').addEventListener('click', function () { sound.play('ui'); goTitle(); });
    $('#setSound').addEventListener('click', function () { sound.unlock(); toggleMute(); });
    $('#setFlash').addEventListener('click', function () { settings.flashes = settings.flashes === 'safe' ? 'full' : 'safe'; saveSettings(); syncSettings(); sound.play('ui'); });
    $('#setShake').addEventListener('click', function () { settings.shake = !settings.shake; if (settings.shake && settings.flashes === 'safe') settings.flashes = 'full'; saveSettings(); syncSettings(); sound.play('ui'); });
    $('#setQuality').addEventListener('click', function () { var o = ['auto', 'high', 'low']; settings.quality = o[(o.indexOf(settings.quality) + 1) % 3]; saveSettings(); syncSettings(); sound.play('ui'); });
    syncSettings();

    // ------------------------------------------------------------ test hooks (test-playable-web-games)
    window.__game = {
      get seed() { return sim ? sim.S.seed : seed; },
      state: function () { if (mode === 'playing' && sim && sim.S.phase === 'upgrade') return 'upgrade'; if (mode === 'playing' && sim && sim.S.phase === 'over') return 'ending'; return mode; },
      start: function (o) { startRun(o || {}); return this.state(); },
      step: function (ms) { if (!sim) return null; var n = Math.max(1, Math.round((ms || 16.67) / (1000 / 60))); for (var i = 0; i < n; i++) stepOnce(); return sim.snapshot(); },
      input: function (o) {
        if (o === null) { apiInput = null; return; }
        var base = apiInput || { mx: 0, mz: 0, ax: sim.S.witch.x, az: sim.S.witch.z + 3, ember: false, rime: false, spark: false, skip: false };
        if (o.move) { var mx = o.move[0], my = o.move[1]; base.mx = mx * RIGHT.x + my * FWD.x; base.mz = mx * RIGHT.z + my * FWD.z; }
        if (o.aim) { base.ax = o.aim[0]; base.az = o.aim[1]; }
        ['ember', 'rime', 'spark', 'skip'].forEach(function (k) { if (o[k]) base['p' + k[0].toUpperCase() + k.slice(1)] = true; });
        if (o.choose !== undefined) choose(o.choose);
        apiInput = base; return true;
      },
      snapshot: function () { return sim ? sim.snapshot() : null; },
      pause: function () { pause('api'); return mode; }, resume: function () { resume(); return mode; },
      choose: function (i) { choose(i); return this.state(); },
      // review-only filming: freeze the clock, stage a cast, then step 0.05 s and render one frame per call
      film: function (name) { startRun({ review: name }); mode = 'film'; $('#hud').classList.remove('on'); $('#touch').classList.remove('on'); return sim.snapshot(); },
      filmCast: function (spell, ax, az) { filmT0 = sim.S.tick; aim.lockX = ax; aim.lockZ = az; aim.lockT = 99; var o = {}; o['p' + spell[0].toUpperCase() + spell.slice(1)] = true; sim.setInput(o); return true; },
      filmStep: function (sec) { var n = Math.round((sec || 0.05) * 60); for (var i = 0; i < n; i++) { sim.setInput(currentInput()); sim.tick(); handleEvents(sim.drain()); } render(sec || 0.05, 0); var c = sim.S.witch.cast; return (c ? c.name + ' ' + c.phase : 'idle') + ' ' + ((sim.S.tick - filmT0) / 60).toFixed(2) + ' s'; },
      fx: function () { return vfx.counts(); },
      info: function () { return { fps: Math.round(fps * 10) / 10, quality: Q, dpr: DPR, hdr: hdr, touch: touchMode, calls: sceneCalls, tris: sceneTris, programs: renderer.info.programs ? renderer.info.programs.length : 0 }; }
    };

    // ------------------------------------------------------------ boot
    resize();
    show('loading', false);
    lastT = performance.now();
    requestAnimationFrame(frame);
    var rv = qs.get('review'), wv = qs.get('wave'), bv = qs.get('boss');
    if (rv) startRun({ review: rv });
    else if (wv) startRun({ wave: parseInt(wv, 10) || 1 });
    else if (bv) startRun({ boss: parseInt(bv, 10) || 1 });
    else goTitle();
    if (inFrame) document.body.classList.add('framed');
  };
})();
