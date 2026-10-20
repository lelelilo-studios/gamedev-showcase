/* Hedge Witch: effects.
   createHedgeVFX(THREE, { scene, camera, lights, quality, seed }) — pass in your own THREE (the skills' module pattern).
   One effect clock: update(dt) with dt = 0 during a hit hold freezes every layer at once.
   Visual language, scaled down from the skills to a dozen foes on a phone:
   - fire (fire-smoke-skill-vfx): tongue billboards with buoyant (not scrolled) noise, a temperature ramp whose
     hottest gas sits a little above the fuel, rings broken into clumps of unequal tongues with gaps and detaching
     licks, charcoal smoke drawn premultiplied "over" (never additive), embers that cool white -> orange -> red -> ash,
     firelight that swells fast and settles slowly, a burn mark with hairline cracks that cool.
   - frost (ice-frost-skill-vfx): a dendritic tree grown once on the CPU in one time-ordered pass, baked with its
     arrival times, drawn by the frost clock with a blazing growth tip; faceted spikes that erupt along the stems,
     crack and shatter into pieces that land on a face; steel-blue light, not cyan.
   - lightning (lightning-energy-skill-vfx): trees of strips by midpoint displacement (x0.58 a level), a fine white
     core in a violet-blue glow, a leader that reaches out and flares on connect, one held shape then an afterglow
     (0.55, 0.2, 0.07), one discharge at a time; ink impact frames, at most three inverting flashes a second. */
(function () {
  'use strict';

  var NOISE_GLSL = [
    'float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
    '  return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }',
    'float fbm(vec2 p){ return 0.55*vn(p) + 0.3*vn(p*2.07+3.1) + 0.15*vn(p*4.13+7.7); }'
  ].join('\n');

  window.createHedgeVFX = function (THREE, o) {
    var scene = o.scene, camera = o.camera, LOW = o.quality === 'low';
    var R = window.HW_SIM.stream(o.seed || 9, 'vfx'); // its own stream: effects never touch the sim's randomness
    var V3 = THREE.Vector3;
    var T = { value: 0 };
    var fx = { time: 0, opts: { flashes: 'full', shake: 1 }, stats: {} };
    var tmpV = new V3(), tmpV2 = new V3();

    function instGeo(base, attrs, n) {
      var g = new THREE.InstancedBufferGeometry();
      g.index = base.index; g.attributes.position = base.attributes.position; if (base.attributes.uv) g.attributes.uv = base.attributes.uv;
      var out = {};
      Object.keys(attrs).forEach(function (k) { var a = new THREE.InstancedBufferAttribute(new Float32Array(n * attrs[k]), attrs[k]); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); out[k] = a; });
      g.instanceCount = n;
      return { geo: g, a: out };
    }
    function quadGeo(x0, x1, y0, y1) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0]), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      return g;
    }
    var PREMUL = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
    function premul(m) { for (var k in PREMUL) m[k] = PREMUL[k]; m.transparent = true; m.depthWrite = false; return m; }

    // =========================================================== light slots
    // Firelight that swells fast (tau 0.09 s) and settles slowly (tau 0.38 s), so it breathes and never strobes.
    var slots = (o.lights || []).map(function (L) { L.intensity = 0; return { L: L, e: 0, target: 0, peak: 0, hold: 0, decay: 3, follow: null, col: new THREE.Color() }; });
    fx.light = function (pos, color, peak, opt) {
      opt = opt || {};
      var best = null, bs = 1e9;
      for (var i = 0; i < slots.length; i++) { var s = slots[i], score = Math.max(s.e, s.target) + (s.hold > 0 ? 50 : 0); if (score < bs) { bs = score; best = s; } }
      if (!best) return null;
      best.L.position.copy(pos); best.col.set(color); best.L.color.copy(best.col);
      best.target = peak; best.peak = peak; best.hold = opt.hold || 0; best.decay = opt.decay || 3; best.follow = opt.follow || null; best.L.distance = opt.dist || 9;
      if (opt.snap) best.e = peak;
      return best;
    };
    function updateLights(dt, rdt) {
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (s.follow) { var p = s.follow(); if (p) s.L.position.copy(p); else s.follow = null; }
        if (s.hold > 0) s.hold -= dt; else s.target *= Math.exp(-s.decay * dt);
        var tau = s.target > s.e ? 0.09 : 0.38;
        s.e += (s.target - s.e) * (1 - Math.exp(-rdt / tau));
        var breathe = 1 + 0.07 * Math.sin(fx.time * 2.3 + i) + 0.04 * Math.sin(fx.time * 3.7 + i * 2);
        s.L.intensity = s.e * breathe;
      }
    }

    // =========================================================== flames (instanced tongue billboards)
    var FN = LOW ? 90 : 160;
    var flameQ = quadGeo(-1, 1, 0, 1.35);
    var FL = instGeo(flameQ, { iPos: 3, iShape: 4, iLife: 4, iMisc: 3 }, FN);
    var flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: T, uGain: { value: 0.3 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: [
        'attribute vec3 iPos; attribute vec4 iShape; attribute vec4 iLife; attribute vec3 iMisc; uniform float uTime;',
        'varying vec2 vUv; varying float vSeed; varying float vEnv; varying float vTemp;',
        'void main(){',
        '  float t = uTime;',
        '  float env = smoothstep(iLife.x, iLife.x + iLife.y, t) * (1.0 - smoothstep(iLife.z, iLife.z + iLife.w, t));',
        '  vEnv = env;',
        '  float w = iShape.x * (0.55 + 0.45 * env), h = iShape.y * (0.3 + 0.7 * env);',
        '  vec3 camR = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));',
        '  vec2 q = position.xy;',
        '  vec3 outD = vec3(iMisc.y, 0.0, iMisc.z);',
        '  vec3 wp = iPos + camR * q.x * w * 0.5 + vec3(0.0, q.y * h, 0.0) + outD * iShape.w * q.y * q.y * h;',
        '  wp += camR * sin(t * 5.0 + iShape.z * 31.0 + q.y * 2.6) * 0.07 * q.y * h;',
        '  vUv = q; vSeed = iShape.z; vTemp = iMisc.x;',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uGain; varying vec2 vUv; varying float vSeed; varying float vEnv; varying float vTemp;',
        NOISE_GLSL,
        'vec3 ramp(float T){ vec3 c = vec3(0.0);',
        '  c = mix(c, vec3(0.3, 0.024, 0.003), smoothstep(0.02, 0.2, T));',
        '  c = mix(c, vec3(1.5, 0.15, 0.014), smoothstep(0.16, 0.42, T));',
        '  c = mix(c, vec3(3.4, 0.7, 0.09), smoothstep(0.4, 0.66, T));',
        '  c = mix(c, vec3(6.0, 1.9, 0.45), smoothstep(0.64, 0.86, T));',
        '  c = mix(c, vec3(9.0, 4.6, 1.9), smoothstep(0.85, 1.05, T));',
        '  return c; }',
        'void main(){',
        '  if (vEnv <= 0.001) discard;',
        '  float y = vUv.y, x = vUv.x, t = uTime;',
        '  float y0 = 0.48;',
        '  float yb = y0 * log(1.0 + max(y, 0.0) / y0);', // buoyancy: slow at the root, stretching as it climbs
        '  vec2 np = vec2(x * 1.2 + vSeed * 17.0, yb * 3.6 - t * 1.6);',
        '  float n1 = vn(np), n2 = vn(np * 2.3 + 5.1), n3 = vn(np * 5.1 + 9.3);',
        '  float snake = (0.26 * sin(7.5 * y - 4.4 * t + vSeed * 20.0) + 0.1 * sin(13.0 * y - 6.1 * t + vSeed * 7.0)) * y;',
        '  float warp = (n1 - 0.5) * 0.5 * (0.15 + y) + snake * 0.7;',
        '  float xx = x + warp;',
        '  float w1 = pow(max(0.0, 1.0 - y), 0.72) * smoothstep(-0.03, 0.08, y) * (0.72 + 0.34 * n1);',
        '  float d1 = w1 - abs(xx) + 0.12 * (0.42 - 1.3 * abs(n2 - 0.5)) * y;',
        '  float sx = fract(vSeed * 5.3) > 0.5 ? 1.0 : -1.0;',
        '  float y2 = y / (0.5 + 0.25 * fract(vSeed * 3.7));',
        '  float w2 = pow(max(0.0, 1.0 - y2), 0.7) * smoothstep(-0.03, 0.1, y2) * 0.5;',
        '  float d2 = w2 - abs(xx - sx * (0.28 + 0.3 * y2)) ;',
        '  float d = max(d1, d2) + 0.07 * (n3 - 0.5);',
        '  float dens = smoothstep(0.0, 0.06, d);',
        '  float cyc = fract(t * (1.2 + fract(vSeed * 7.3) * 0.8) + vSeed * 3.1);',
        '  float ly = 0.8 + cyc * 0.4, lr = 0.13 * (1.0 - cyc);',
        '  float lick = smoothstep(lr, lr * 0.3, length(vec2((xx - snake * 0.3) * 1.1, (y - ly) * 1.25))) * step(0.35, fract(vSeed * 13.1));',
        '  dens = max(dens, lick * 0.8);',
        '  float core = clamp(d / max(w1 * 0.7, 0.05), 0.0, 1.0);',
        '  float Tm = vTemp * (1.0 - smoothstep(-0.2, 0.92, y + 0.28 * (n1 - 0.5) + 0.12 * (n3 - 0.5)));',
        '  Tm *= (0.3 + 0.75 * core) * (0.38 + 0.62 * smoothstep(0.0, 0.16, y));',
        '  Tm = max(Tm, lick * 0.36 * vTemp);',
        '  vec3 c = ramp(Tm * 1.12) * dens * vEnv * uGain;',
        '  gl_FragColor = vec4(c, dens * vEnv);',
        '}'].join('\n')
    });
    var flames = new THREE.Mesh(FL.geo, flameMat); flames.frustumCulled = false; flames.renderOrder = 6; scene.add(flames);
    var flameFree = []; for (var fi = 0; fi < FN; fi++) { flameFree.push(fi); FL.a.iLife.setXYZW(fi, -10, 0.1, -9, 0.1); }
    function flameAlloc() { return flameFree.length ? flameFree.pop() : -1; }
    function flameSet(i, x, y, z, w, h, seed, lean, birth, fadeIn, killAt, killDur, temp, ox, oz) {
      FL.a.iPos.setXYZ(i, x, y, z); FL.a.iShape.setXYZW(i, w, h, seed, lean); FL.a.iLife.setXYZW(i, birth, fadeIn, killAt, killDur); FL.a.iMisc.setXYZ(i, temp, ox, oz);
      FL.a.iPos.needsUpdate = FL.a.iShape.needsUpdate = FL.a.iLife.needsUpdate = FL.a.iMisc.needsUpdate = true;
    }
    var fires = []; // live flame groups that move: { idx:[], ... }

    // =========================================================== smoke (premultiplied over)
    var SN = LOW ? 48 : 110;
    var SM = instGeo(quadGeo(-1, 1, -1, 1), { iPos: 3, iVel: 3, iSize: 3, iLife: 4 }, SN);
    var smokeMat = premul(new THREE.ShaderMaterial({
      uniforms: { uTime: T },
      vertexShader: [
        'attribute vec3 iPos; attribute vec3 iVel; attribute vec3 iSize; attribute vec4 iLife; uniform float uTime;',
        'varying vec2 vUv; varying float vAge; varying float vSeed; varying float vGlow; varying float vOp;',
        'void main(){',
        '  float age = (uTime - iLife.x) / iLife.y; vAge = age; vSeed = iLife.z; vGlow = iSize.z; vOp = iLife.w;',
        '  float dt = uTime - iLife.x;',
        '  vec3 p = iPos + iVel * dt * (1.0 - 0.35 * clamp(age, 0.0, 1.0)) + vec3(0.0, 0.25 * dt * dt * 0.5, 0.0);',
        '  float s = iSize.x * (1.0 + iSize.y * clamp(age, 0.0, 1.0));',
        '  if (age < 0.0 || age > 1.0) s = 0.0;',
        '  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
        '  vUv = position.xy;',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(p + (r * position.x + u * position.y) * s, 1.0);',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uTime; varying vec2 vUv; varying float vAge; varying float vSeed; varying float vGlow; varying float vOp;', NOISE_GLSL,
        'void main(){',
        '  float r = length(vUv);',
        '  float n = fbm(vUv * 1.7 + vec2(vSeed * 13.0, vSeed * 7.0 - vAge * 1.2));',
        '  float lobes = fbm(vUv * 3.4 + vSeed * 3.0);',
        '  float fib = vn(vec2(vUv.x * 7.0 + vSeed * 5.0, vUv.y * 2.0 - vAge * 2.0));',
        '  float d = 0.8 - r + (n - 0.5) * 0.7 + (lobes - 0.5) * 0.3 + (fib - 0.5) * 0.25 - vAge * 0.35;',
        '  float a = smoothstep(0.0, 0.22, d) * (0.55 + 0.45 * n) * smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.35, 1.0, vAge)) * vOp;',
        '  vec3 c = vec3(0.022, 0.021, 0.024) * (0.7 + 0.6 * lobes);',
        '  c += vec3(1.0, 0.36, 0.07) * vGlow * pow(1.0 - vAge, 3.0) * smoothstep(0.3, -0.8, vUv.y) * 0.5;',
        '  gl_FragColor = vec4(c * a, a);',
        '}'].join('\n')
    }));
    var smokeMesh = new THREE.Mesh(SM.geo, smokeMat); smokeMesh.frustumCulled = false; smokeMesh.renderOrder = 5; scene.add(smokeMesh);
    var smokeI = 0;
    for (var si = 0; si < SN; si++) SM.a.iLife.setXYZW(si, -10, 0.1, 0, 0);
    fx.smoke = function (x, y, z, opt) {
      opt = opt || {};
      var i = smokeI = (smokeI + 1) % SN;
      SM.a.iPos.setXYZ(i, x, y, z);
      SM.a.iVel.setXYZ(i, opt.vx || (R() - 0.5) * 0.3, opt.vy !== undefined ? opt.vy : 0.6 + R() * 0.5, opt.vz || (R() - 0.5) * 0.3);
      SM.a.iSize.setXYZ(i, opt.size || 0.35 + R() * 0.25, opt.grow || 2.2, opt.glow !== undefined ? opt.glow : 0.6);
      SM.a.iLife.setXYZW(i, fx.time, opt.life || 1.6 + R() * 0.9, R(), opt.op || 0.75);
      SM.a.iPos.needsUpdate = SM.a.iVel.needsUpdate = SM.a.iSize.needsUpdate = SM.a.iLife.needsUpdate = true;
    };

    // =========================================================== points: glowing (additive) and debris (over)
    function pointPool(n, additive) {
      var g = new THREE.BufferGeometry();
      var pos = new Float32Array(n * 3), colr = new Float32Array(n * 4), size = new Float32Array(n);
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aCol', new THREE.BufferAttribute(colr, 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
      var m = new THREE.ShaderMaterial({
        uniforms: { uScale: { value: 400 } }, transparent: true, depthWrite: false,
        vertexShader: 'attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(aSize * uScale / -mv.z, aSize > 0.0 ? 1.5 : 0.0); gl_Position = projectionMatrix * mv; }',
        fragmentShader: additive
          ? 'varying vec4 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d2 = dot(c, c) * 4.0; if (d2 > 1.0) discard; float a = (1.0 - d2) * (1.0 - d2); gl_FragColor = vec4(vC.rgb * a * vC.a, 1.0); }'
          : 'varying vec4 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d2 = max(abs(c.x), abs(c.y)) * 2.0; if (d2 > 1.0) discard; float a = vC.a * smoothstep(1.0, 0.7, d2); gl_FragColor = vec4(vC.rgb * a, a); }'
      });
      if (additive) m.blending = THREE.AdditiveBlending; else premul(m);
      var pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = additive ? 8 : 4; scene.add(pts);
      var P = []; for (var i = 0; i < n; i++) P.push({ on: false });
      return { g: g, pos: pos, col: colr, size: size, P: P, n: n, next: 0, mat: m };
    }
    var GP = pointPool(LOW ? 260 : 600, true), DP = pointPool(LOW ? 160 : 360, false);
    function spawnPoint(pool, d) {
      var i = pool.next; pool.next = (pool.next + 1) % pool.n;
      var p = pool.P[i];
      p.on = true; p.x = d.x; p.y = d.y; p.z = d.z; p.vx = d.vx || 0; p.vy = d.vy || 0; p.vz = d.vz || 0;
      p.life = d.life || 1; p.age = 0; p.kind = d.kind || 0; p.size = d.size || 0.05; p.g = d.g === undefined ? 9.8 : d.g; p.drag = d.drag || 0.5;
      p.buoy = d.buoy || 0; p.curl = d.curl || 0; p.heat = d.heat === undefined ? 1 : d.heat; p.cool = d.cool || 1; p.r = d.r || 1; p.gg = d.gg || 1; p.b = d.b || 1; p.a = d.a === undefined ? 1 : d.a;
      p.bounce = d.bounce || 0; p.rest = false; p.seed = R() * 100;
      return p;
    }
    // ember ramp by heat (fire skill): white -> orange -> red -> dark, then ash
    function emberCol(h, out) {
      if (h > 0.66) { var k = (h - 0.66) / 0.34; out[0] = 3 + 1.2 * k; out[1] = 1.05 + 1.05 * k; out[2] = 0.22 + 0.48 * k; }
      else if (h > 0.33) { var k2 = (h - 0.33) / 0.33; out[0] = 1.1 + 1.9 * k2; out[1] = 0.16 + 0.89 * k2; out[2] = 0.025 + 0.2 * k2; }
      else { var k3 = h / 0.33; out[0] = 0.08 + 1.02 * k3; out[1] = 0.006 + 0.154 * k3; out[2] = 0.001 + 0.024 * k3; }
      return out;
    }
    var ecol = [0, 0, 0];
    function updatePoints(pool, dt, additive) {
      var pos = pool.pos, colr = pool.col, size = pool.size, P = pool.P;
      for (var i = 0; i < pool.n; i++) {
        var p = P[i];
        if (!p.on) { size[i] = 0; continue; }
        p.age += dt;
        if (p.age >= p.life) { p.on = false; size[i] = 0; continue; }
        var u = p.age / p.life;
        if (!p.rest) {
          var dr = Math.exp(-p.drag * dt);
          p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.g * dt + p.buoy * dt;
          if (p.curl) { var t = fx.time; p.vx += Math.sin(p.y * 2.1 + t * 1.3 + p.seed) * p.curl * dt; p.vz += Math.cos(p.x * 1.7 + t * 1.1 + p.seed) * p.curl * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.02) { if (p.bounce > 0 && Math.abs(p.vy) > 0.6) { p.y = 0.02; p.vy = -p.vy * p.bounce; p.vx *= 0.6; p.vz *= 0.6; } else { p.y = 0.02; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; if (!additive) p.rest = true; } }
        }
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        var a = 1;
        if (p.kind === 1) { // ember
          p.heat = Math.max(0, p.heat - p.cool * dt);
          emberCol(p.heat, ecol); colr[i * 4] = ecol[0]; colr[i * 4 + 1] = ecol[1]; colr[i * 4 + 2] = ecol[2];
          a = Math.min(1, (1 - u) * 3);
          size[i] = p.size * (0.6 + 0.6 * p.heat);
        } else if (p.kind === 2) { // frost mote / diamond dust: a soft glint that turns
          var gl = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(fx.time * 9 + p.seed)), 8);
          colr[i * 4] = 0.55 * gl * 1.4; colr[i * 4 + 1] = 0.75 * gl * 1.4; colr[i * 4 + 2] = 1.1 * gl * 1.4;
          a = Math.min(1, (1 - u) * 2.5); size[i] = p.size;
        } else if (p.kind === 3) { // spark (lightning contact): hot orange cooling fast
          var hh = 1 - u; colr[i * 4] = 4.2 * hh + 0.85 * (1 - hh); colr[i * 4 + 1] = 2.5 * hh * hh + 0.1; colr[i * 4 + 2] = 1.0 * hh * hh * hh + 0.025;
          a = 1 - u; size[i] = p.size * (0.5 + 0.5 * hh);
        } else { // plain colour (debris)
          colr[i * 4] = p.r; colr[i * 4 + 1] = p.gg; colr[i * 4 + 2] = p.b;
          a = p.a * Math.min(1, (1 - u) * 4); size[i] = p.size;
        }
        colr[i * 4 + 3] = a;
      }
      pool.g.attributes.position.needsUpdate = true; pool.g.attributes.aCol.needsUpdate = true; pool.g.attributes.aSize.needsUpdate = true;
    }
    fx.embers = function (x, y, z, n, opt) {
      opt = opt || {};
      for (var i = 0; i < n; i++) spawnPoint(GP, { kind: 1, x: x + (R() - 0.5) * (opt.spread || 0.3), y: y + R() * 0.2, z: z + (R() - 0.5) * (opt.spread || 0.3),
        vx: (R() - 0.5) * (opt.speed || 1.2), vy: (opt.up || 1.2) + R() * 1.4, vz: (R() - 0.5) * (opt.speed || 1.2), life: 0.8 + R() * 1.4, size: 0.05 + R() * 0.05,
        g: 0.3, buoy: 1.2 + R(), drag: 1.2, curl: 1.3, heat: 0.75 + R() * 0.25, cool: 0.4 + R() * 0.35 });
    };
    fx.sparks = function (x, y, z, n, opt) {
      opt = opt || {};
      for (var i = 0; i < n; i++) { var a = R() * 6.283, sp = (opt.speed || 4) * (0.4 + R() * 0.8);
        spawnPoint(GP, { kind: 3, x: x, y: y, z: z, vx: Math.cos(a) * sp, vy: (opt.up || 2.5) * (0.4 + R()), vz: Math.sin(a) * sp, life: 0.25 + R() * 0.35, size: 0.045 + R() * 0.03, g: 9.8, drag: 1.2, bounce: 0.35 }); }
    };
    fx.motes = function (x, y, z, n, opt) {
      opt = opt || {};
      for (var i = 0; i < n; i++) spawnPoint(GP, { kind: 2, x: x + (R() - 0.5) * (opt.spread || 0.6), y: y + R() * (opt.h || 0.5), z: z + (R() - 0.5) * (opt.spread || 0.6),
        vx: (R() - 0.5) * (opt.speed || 0.8), vy: (opt.up || 0.4) + R() * 0.6, vz: (R() - 0.5) * (opt.speed || 0.8), life: 0.9 + R() * 1.2, size: 0.03 + R() * 0.035, g: 0.25, drag: 1.6, curl: 0.4 });
    };
    fx.debris = function (x, y, z, n, kind) {
      var cols = { leaf: [[0.09, 0.2, 0.06], [0.14, 0.26, 0.08], [0.2, 0.3, 0.1]], soil: [[0.07, 0.05, 0.03], [0.1, 0.07, 0.04]], slime: [[0.5, 0.42, 0.22], [0.62, 0.55, 0.32]],
        shell: [[0.05, 0.07, 0.04], [0.08, 0.1, 0.05], [0.4, 0.22, 0.07]], ice: [[0.55, 0.68, 0.85], [0.75, 0.85, 0.95]], ash: [[0.12, 0.11, 0.1], [0.2, 0.19, 0.17]], stone: [[0.2, 0.2, 0.19], [0.28, 0.27, 0.25]] }[kind] || [[0.3, 0.3, 0.3]];
      for (var i = 0; i < n; i++) { var c = cols[i % cols.length], a = R() * 6.283, sp = 0.8 + R() * 2.2;
        spawnPoint(DP, { kind: 0, x: x, y: y, z: z, vx: Math.cos(a) * sp, vy: 1.5 + R() * 2.5, vz: Math.sin(a) * sp, life: 1.2 + R() * 1.5, size: kind === 'ice' ? 0.07 : 0.06 + R() * 0.04, g: 9.8, drag: 0.6, bounce: 0.3, r: c[0], gg: c[1], b: c[2], a: 1 }); }
    };

    // =========================================================== glows (feathered additive quads)
    var GN = 90;
    var GL = instGeo(quadGeo(-1, 1, -1, 1), { iPos: 3, iCol: 3, iLife: 4 }, GN);
    var glowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: T }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        'attribute vec3 iPos; attribute vec3 iCol; attribute vec4 iLife; uniform float uTime; varying vec2 vUv; varying vec3 vC; varying float vA;',
        'void main(){ float age = (uTime - iLife.x) / iLife.y; float a = (age < 0.0 || age > 1.0) ? 0.0 : (iLife.w > 0.5 ? exp(-age * 5.0) : (1.0 - age) * smoothstep(0.0, 0.08, age));',
        '  vA = a; vC = iCol; float s = iLife.z * (iLife.w > 0.5 ? (0.6 + 0.6 * age) : 1.0) * (a > 0.0 ? 1.0 : 0.0);',
        '  vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);',
        '  vUv = position.xy; gl_Position = projectionMatrix * viewMatrix * vec4(iPos + (r * position.x + u * position.y) * s, 1.0); }'].join('\n'),
      fragmentShader: 'varying vec2 vUv; varying vec3 vC; varying float vA; void main(){ float d2 = dot(vUv, vUv); if (d2 > 1.0) discard; float f = (1.0 - d2); f = f * f * f; float core = exp(-d2 * 40.0); gl_FragColor = vec4(vC * (f * 0.5 + core) * vA, 1.0); }'
    });
    var glowMesh = new THREE.Mesh(GL.geo, glowMat); glowMesh.frustumCulled = false; glowMesh.renderOrder = 9; scene.add(glowMesh);
    var glowI = 0; for (var gi = 0; gi < GN; gi++) GL.a.iLife.setXYZW(gi, -10, 0.1, 0, 0);
    fx.glow = function (x, y, z, r, g, b, size, life, burst) {
      var i = glowI = (glowI + 1) % GN;
      GL.a.iPos.setXYZ(i, x, y, z); GL.a.iCol.setXYZ(i, r, g, b); GL.a.iLife.setXYZW(i, fx.time, life, size, burst ? 1 : 0);
      GL.a.iPos.needsUpdate = GL.a.iCol.needsUpdate = GL.a.iLife.needsUpdate = true;
      return i;
    };
    fx.moveGlow = function (i, x, y, z) { GL.a.iPos.setXYZ(i, x, y, z); GL.a.iPos.needsUpdate = true; };

    // =========================================================== ground decals (premultiplied: darkening plus a little emission)
    var DN = LOW ? 70 : 140;
    var flat = quadGeo(-1, 1, -1, 1); flat.rotateX(-Math.PI / 2);
    var DC = instGeo(flat, { iPR: 4, iT: 4 }, DN);
    var decalMat = premul(new THREE.ShaderMaterial({
      uniforms: { uTime: T }, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: [
        'attribute vec4 iPR; attribute vec4 iT; uniform float uTime; varying vec2 vUv; varying vec4 vT; varying float vAge;',
        'void main(){ float c = cos(iPR.z), s = sin(iPR.z); vec2 p = position.xz * iPR.w; p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);',
        '  vUv = position.xz; vT = iT; vAge = (uTime - iT.x) / iT.y; if (vAge < 0.0 || vAge > 1.0) p *= 0.0;',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(iPR.x + p.x, 0.012 + iT.w * 0.0005, iPR.y + p.y, 1.0); }'].join('\n'),
      fragmentShader: [
        'uniform float uTime; varying vec2 vUv; varying vec4 vT; varying float vAge;', NOISE_GLSL,
        'void main(){',
        '  float r = length(vUv); float type = vT.z; vec3 c = vec3(0.0); float a = 0.0;',
        '  float fade = 1.0 - smoothstep(0.7, 1.0, vAge);',
        '  if (type < 0.5) {', // scorch ring from Ember: a burnt annulus, its needles smoulder as hairlines while hot
        '    float n = fbm(vUv * 6.0 + vT.x);',
        '    float ring = smoothstep(0.32, 0.0, abs(r - 0.78 + (n - 0.5) * 0.18)) + smoothstep(0.5, 0.0, r) * 0.5;',
        '    a = clamp(ring * (0.55 + 0.4 * n), 0.0, 1.0) * fade * 0.8;',
        '    c = vec3(0.012, 0.009, 0.007) * a;',
        '    float heat = exp(-max(uTime - vT.x, 0.0) / 1.1);',
        '    float band = smoothstep(0.16, 0.0, abs(r - 0.8 + (n - 0.5) * 0.12));',
        '    float hair = smoothstep(0.035, 0.0, abs(vn(vUv * 16.0 + vT.x * 3.0) - 0.5)) * band * step(0.55, vn(vUv * 5.0 + 11.0));',
        '    c += vec3(1.3, 0.38, 0.07) * hair * heat * 0.9 + vec3(0.75, 0.1, 0.012) * band * heat * heat * 0.25;',
        '  } else if (type < 1.5) {', // slime streak: a glossy trail catching the moon
        '    float e = smoothstep(1.0, 0.3, length(vUv * vec2(2.4, 1.0)));',
        '    float sheen = 0.5 + 0.5 * vn(vUv * 8.0 + vT.x);',
        '    a = e * 0.32 * fade; c = vec3(0.32, 0.36, 0.38) * sheen * a;',
        '  } else if (type < 2.5) {', // spark strike mark: small scorch with a white-blue hot point that cools
        '    float n2 = fbm(vUv * 5.0 + vT.x);',
        '    a = smoothstep(0.9, 0.1, r + (n2 - 0.5) * 0.4) * 0.7 * fade; c = vec3(0.01, 0.012, 0.02) * a;',
        '    float heat2 = exp(-max(uTime - vT.x, 0.0) / 0.35);',
        '    float cr = smoothstep(0.06, 0.0, abs(vn(vec2(atan(vUv.y, vUv.x) * 3.0, r * 2.0) + vT.x) - 0.5)) * smoothstep(0.95, 0.2, r);',
        '    c += (vec3(0.3, 0.42, 1.0) * cr * 1.4 + vec3(1.0, 1.0, 1.2) * smoothstep(0.25, 0.0, r) * 1.2) * heat2;',
        '  } else if (type < 3.5) {', // a soft contact shadow
        '    a = smoothstep(1.0, 0.0, r) * 0.55 * vT.w * 0.01; c = vec3(0.0);',
        '  } else {', // stomp scar: cracked ground
        '    float n3 = fbm(vUv * 4.0 + vT.x);',
        '    float cr2 = smoothstep(0.07, 0.0, abs(vn(vec2(atan(vUv.y, vUv.x) * 4.0, r * 3.0) + vT.x) - 0.5)) * smoothstep(1.0, 0.3, r);',
        '    a = (cr2 * 0.8 + smoothstep(0.7, 0.0, r) * 0.25) * fade; c = vec3(0.02, 0.015, 0.01) * a;',
        '  }',
        '  gl_FragColor = vec4(c, a);',
        '}'].join('\n')
    }));
    var decals = new THREE.Mesh(DC.geo, decalMat); decals.frustumCulled = false; decals.renderOrder = 1; scene.add(decals);
    var decalI = 0, decalOrder = 0; for (var di = 0; di < DN; di++) DC.a.iT.setXYZW(di, -10, 0.1, 0, 0);
    fx.decal = function (type, x, z, size, rot, life) {
      var i = decalI = (decalI + 1) % DN;
      DC.a.iPR.setXYZW(i, x, z, rot || 0, size); DC.a.iT.setXYZW(i, fx.time, life, type, (decalOrder++ % 20));
      DC.a.iPR.needsUpdate = DC.a.iT.needsUpdate = true;
    };
    // contact shadows for actors: their own small pool, rewritten every frame
    var HN = 40;
    var HS = instGeo(flat, { iPR: 4, iT: 4 }, HN);
    var shadowMesh = new THREE.Mesh(HS.geo, decalMat); shadowMesh.frustumCulled = false; shadowMesh.renderOrder = 2; scene.add(shadowMesh);
    var shadowN = 0;
    fx.beginShadows = function () { shadowN = 0; };
    fx.shadow = function (x, z, size, strength) {
      if (shadowN >= HN) return; var i = shadowN++;
      HS.a.iPR.setXYZW(i, x, z, 0, size); HS.a.iT.setXYZW(i, fx.time - 0.5, 1e6, 3, (strength === undefined ? 1 : strength) * 100);
    };
    fx.endShadows = function () { for (var i = shadowN; i < HN; i++) HS.a.iT.setXYZW(i, -10, 0.1, 3, 0); HS.a.iPR.needsUpdate = HS.a.iT.needsUpdate = true; };

    // =========================================================== little health bars over hurt foes (billboards)
    var BN = 28;
    var BB = instGeo(quadGeo(-1, 1, -1, 1), { iPos: 3, iV: 4 }, BN);
    var barMat = premul(new THREE.ShaderMaterial({
      uniforms: {}, depthTest: false,
      vertexShader: 'attribute vec3 iPos; attribute vec4 iV; varying vec2 vUv; varying vec4 vV; void main(){ vV = iV; vUv = position.xy; vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); float w = iV.z; gl_Position = projectionMatrix * viewMatrix * vec4(iPos + r * position.x * w + u * position.y * 0.055 * (iV.w > 0.0 ? 1.0 : 0.0), 1.0); }',
      fragmentShader: 'varying vec2 vUv; varying vec4 vV; void main(){ float x = vUv.x * 0.5 + 0.5; float edge = step(0.86, abs(vUv.y)) + step(0.975, abs(vUv.x)); vec3 fillC = vV.y > 0.5 ? vec3(0.95, 0.72, 0.35) : vec3(0.86, 0.3, 0.22); vec3 c = x < vV.x ? fillC : vec3(0.08, 0.06, 0.05); c = mix(c, vec3(0.04, 0.03, 0.02), edge); gl_FragColor = vec4(c * vV.w, vV.w); }'
    }));
    var barMesh = new THREE.Mesh(BB.geo, barMat); barMesh.frustumCulled = false; barMesh.renderOrder = 20; scene.add(barMesh);
    var barN = 0;
    fx.beginBars = function () { barN = 0; };
    fx.bar = function (x, y, z, frac, armored, width, alpha) { if (barN >= BN) return; var i = barN++; BB.a.iPos.setXYZ(i, x, y, z); BB.a.iV.setXYZW(i, frac, armored ? 1 : 0, width || 0.3, alpha === undefined ? 1 : alpha); };
    fx.endBars = function () { for (var i = barN; i < BN; i++) BB.a.iV.setXYZW(i, 0, 0, 0, 0); BB.a.iPos.needsUpdate = BB.a.iV.needsUpdate = true; };

    // =========================================================== telegraphs, aim reticle and spell previews
    var telegraphMat = premul(new THREE.ShaderMaterial({
      uniforms: { uTime: T, uType: { value: 0 }, uProg: { value: 0 }, uAlpha: { value: 0 }, uCol: { value: new THREE.Color(1, 0.35, 0.18) }, uAsp: { value: 1 }, uHalf: { value: 0.5 } },
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uTime, uType, uProg, uAlpha, uAsp, uHalf; uniform vec3 uCol; varying vec2 vUv;',
        'void main(){',
        '  vec3 c = vec3(0.0); float a = 0.0;',
        '  if (uType < 0.5) {', // charge lane: fills from the foe toward the tip; an inked dashed edge; an arrowhead
        '    float x = (vUv.x - 0.5) * 2.0, y = vUv.y;',
        '    float tipStart = 1.0 - 0.9 / uAsp;',
        '    float halfW = y < tipStart ? 1.0 : (1.0 - (y - tipStart) / (1.0 - tipStart)) * 1.3;',
        '    float inside = step(abs(x), halfW);',
        '    float edge = smoothstep(0.82, 0.92, abs(x) / max(halfW, 0.001)) * inside;',
        '    float dash = step(0.45, fract(y * uAsp * 1.6 - uTime * 2.0));',
        '    float fill = step(y, uProg) * inside;',
        '    a = (fill * 0.32 + inside * 0.08 + edge * dash * 0.75) * uAlpha;',
        '    c = uCol * (fill * 0.55 + edge * dash * 0.9 + inside * 0.1) * uAlpha;',
        '    c += uCol * 0.6 * fill * smoothstep(0.08, 0.0, abs(y - uProg)) * uAlpha;',
        '  } else if (uType < 1.5) {', // circle: ring edge, fill grows out from the centre
        '    float r = length(vUv - 0.5) * 2.0; float ang = atan(vUv.y - 0.5, vUv.x - 0.5);',
        '    float inside = step(r, 1.0);',
        '    float edge = smoothstep(0.9, 0.96, r) * inside;',
        '    float dash = step(0.4, fract(ang * 6.0 / 3.14159 + uTime * 0.8));',
        '    float fill = step(r, uProg) * inside;',
        '    a = (fill * 0.3 + inside * 0.07 + edge * dash * 0.8) * uAlpha;',
        '    c = uCol * (fill * 0.5 + edge * dash * 0.9 + inside * 0.08) * uAlpha;',
        '    c += uCol * 0.7 * smoothstep(0.06, 0.0, abs(r - uProg)) * inside * uAlpha;',
        '  } else if (uType < 2.5) {', // aim reticle: a small inked ring with four ticks
        '    vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float ang = atan(p.y, p.x) + uTime * 0.6;',
        '    float ring = smoothstep(0.1, 0.0, abs(r - 0.62));',
        '    float ticks = smoothstep(0.92, 1.0, abs(cos(ang * 2.0))) * smoothstep(0.42, 0.5, r) * smoothstep(0.98, 0.86, r);',
        '    float m = max(ring * step(0.25, fract(ang / 6.2832 * 8.0 + 0.1)), ticks);',
        '    a = m * uAlpha * 0.9; c = uCol * m * uAlpha;',
        '  } else if (uType < 3.5) {', // ember landing preview: a dashed ring the size of the flame ring
        '    float r = length(vUv - 0.5) * 2.0; float ang = atan(vUv.y - 0.5, vUv.x - 0.5);',
        '    float ring = smoothstep(0.04, 0.0, abs(r - 0.94)) * step(0.5, fract(ang * 12.0 / 3.14159));',
        '    float dot = smoothstep(0.1, 0.05, r);',
        '    a = (ring * 0.8 + dot * 0.9) * uAlpha; c = uCol * (ring + dot) * uAlpha;',
        '  } else if (uType < 4.5) {', // rime cone preview: outline of the cone the frost will cover
        '    vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y); float r = length(p); float ang = atan(p.x, p.y);',
        '    float inA = smoothstep(uHalf + 0.02, uHalf - 0.01, abs(ang)) * step(r, 1.0);',
        '    float sideE = smoothstep(0.035, 0.0, abs(abs(ang) - uHalf) * r) * step(r, 1.0);',
        '    float arc = smoothstep(0.025, 0.0, abs(r - 1.0)) * step(abs(ang), uHalf);',
        '    float dash = step(0.5, fract(r * 9.0 - uTime * 1.5));',
        '    a = (inA * 0.07 + (sideE * dash + arc) * 0.7) * uAlpha; c = uCol * (inA * 0.08 + sideE * dash + arc) * uAlpha;',
        '  } else {', // spark target: a small ring under the foe the bolt will take first
        '    float r = length(vUv - 0.5) * 2.0; float ang = atan(vUv.y - 0.5, vUv.x - 0.5) - uTime * 2.0;',
        '    float ring = smoothstep(0.08, 0.0, abs(r - 0.8)) * step(0.3, fract(ang / 6.2832 * 3.0));',
        '    a = ring * uAlpha; c = uCol * ring * uAlpha * 1.4;',
        '  }',
        '  gl_FragColor = vec4(c, a);',
        '}'].join('\n')
    }));
    var tgPool = [];
    var tgBase = new THREE.PlaneGeometry(1, 1); tgBase.rotateX(-Math.PI / 2);
    var tgLine = new THREE.PlaneGeometry(1, 1); tgLine.translate(0, 0.5, 0); tgLine.rotateX(-Math.PI / 2); // forward +z from origin... set below
    // line geometry with origin at its base, extending along +z
    tgLine = (function () { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1]), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 2, 1, 0, 3, 2]); return g; })();
    var tgCone = (function () { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 0, 1, -1, 0, 1]), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 2, 1, 0, 3, 2]); return g; })();
    function tgMesh(geo) { var m = new THREE.Mesh(geo, telegraphMat.clone()); m.material.uniforms.uTime = T; m.visible = false; m.renderOrder = 3; m.frustumCulled = false; scene.add(m); return m; }
    for (var ti = 0; ti < 12; ti++) tgPool.push({ line: tgMesh(tgLine), circ: tgMesh(tgBase), on: false, key: null });
    var tgActive = {};
    fx.telegraph = function (key, d) {
      var t = tgActive[key];
      if (!t) { for (var i = 0; i < tgPool.length; i++) if (!tgPool[i].on) { t = tgPool[i]; break; } if (!t) return; t.on = true; tgActive[key] = t; t.key = key; t.t0 = fx.time; }
      t.d = d; t.fade = 0;
      var m = d.type === 'line' ? t.line : t.circ; (d.type === 'line' ? t.circ : t.line).visible = false;
      m.visible = true;
      var u = m.material.uniforms; u.uType.value = d.type === 'line' ? 0 : 1; u.uCol.value.set(d.color || 0xff5a2a);
      if (d.type === 'line') { m.position.set(d.x, 0.02, d.z); m.rotation.y = Math.atan2(d.dx, d.dz); m.scale.set(d.width, 1, d.len); u.uAsp.value = d.len / d.width; }
      else { m.position.set(d.x, 0.022, d.z); m.rotation.y = 0; m.scale.set(d.r * 2, 1, d.r * 2); }
      t.m = m;
    };
    fx.telegraphProgress = function (key, p) { var t = tgActive[key]; if (t) { t.m.material.uniforms.uProg.value = p; } };
    fx.telegraphMove = function (key, x, z, dx, dz) { var t = tgActive[key]; if (!t) return; t.m.position.x = x; t.m.position.z = z; if (dx !== undefined) t.m.rotation.y = Math.atan2(dx, dz); };
    fx.endTelegraph = function (key, flash) { var t = tgActive[key]; if (!t) return; delete tgActive[key]; t.fading = 0.22; t.on = true; t.ending = true; };
    function updateTelegraphs(dt) {
      for (var i = 0; i < tgPool.length; i++) {
        var t = tgPool[i]; if (!t.on || !t.m) continue;
        var u = t.m.material.uniforms;
        if (t.ending) { t.fading -= dt; u.uAlpha.value = Math.max(0, t.fading / 0.22); if (t.fading <= 0) { t.on = false; t.ending = false; t.m.visible = false; } }
        else u.uAlpha.value = Math.min(1, u.uAlpha.value + dt * 8);
      }
    }
    // the aim reticle and per-spell previews: owned meshes, shown by the presentation layer
    function ownMesh(geo, type, colr) { var m = tgMesh(geo); m.material.uniforms.uType.value = type; m.material.uniforms.uCol.value.set(colr); m.renderOrder = 7; return m; }
    fx.reticle = ownMesh(tgBase, 2, 0xf3e6c4);
    fx.previewEmber = ownMesh(tgBase, 3, 0xff8a40);
    fx.previewRime = ownMesh(tgCone, 4, 0x9cc4ff);
    fx.previewSpark = ownMesh(tgBase, 5, 0x9aa2ff);

    // =========================================================== lightning: trees of strips in one ribbon buffer
    var LV = LOW ? 5000 : 10000;
    var lg = new THREE.BufferGeometry();
    var LA = { position: 3, aTan: 3, aSide: 1, aW: 1, aBr: 1, aTimes: 4 };
    var lbuf = {};
    Object.keys(LA).forEach(function (k) { lbuf[k] = new Float32Array(LV * LA[k]); lg.setAttribute(k, new THREE.BufferAttribute(lbuf[k], LA[k]).setUsage(THREE.DynamicDrawUsage)); });
    var lidx = new Uint32Array(LV * 3); lg.setIndex(new THREE.BufferAttribute(lidx, 1).setUsage(THREE.DynamicDrawUsage));
    var boltMat = new THREE.ShaderMaterial({
      uniforms: { uTime: T, uRes: { value: new THREE.Vector2(1440, 900) }, uMinPx: { value: 1.0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: [
        'attribute vec3 aTan; attribute float aSide; attribute float aW; attribute float aBr; attribute vec4 aTimes;',
        'uniform vec2 uRes; uniform float uMinPx; varying float vU; varying float vBr; varying vec4 vTimes; varying float vSeed;',
        'void main(){',
        '  vec3 V = normalize(cameraPosition - position);',
        '  vec3 sd = cross(aTan, V); float l = length(sd); sd = l > 1e-4 ? sd / l : vec3(1.0, 0.0, 0.0);',
        '  vec4 clip = projectionMatrix * viewMatrix * vec4(position, 1.0);',
        '  float pxW = clip.w * 2.0 / (uRes.y * projectionMatrix[1][1]);',
        '  float hw = max(aW, uMinPx * pxW * 0.5) * 3.0;',
        '  vU = aSide; vBr = aBr; vTimes = aTimes; vSeed = position.x * 3.1 + position.z * 1.7;',
        '  gl_Position = projectionMatrix * viewMatrix * vec4(position + sd * aSide * hw, 1.0);',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uTime; varying float vU; varying float vBr; varying vec4 vTimes; varying float vSeed;',
        'void main(){',
        '  if (uTime < vTimes.x) discard;',
        '  float u = abs(vU);',
        '  float share = vTimes.w;',
        '  float core = smoothstep(0.33 * share, 0.1 * share, u) * 3.8 * share;',
        '  float glow = exp(-u * 4.5) * 1.45; float halo = pow(1.0 - u, 3.0) * 0.38;',
        '  float life;',
        '  if (uTime < vTimes.y) life = 1.0 + 1.3 * exp(-(uTime - vTimes.x) * 70.0);',
        '  else if (uTime < vTimes.z) life = 1.0 + 0.8 * exp(-(uTime - vTimes.y) * 20.0);',
        '  else { float k = floor((uTime - vTimes.z) / 0.0333); life = k < 1.0 ? 0.55 : k < 2.0 ? 0.2 : k < 3.0 ? 0.07 : 0.0; }',
        '  if (life <= 0.0) discard;',
        '  float flick = 0.62 + 0.24 * sin(uTime * 8.3 + vSeed) + 0.14 * sin(uTime * 21.7 + vSeed * 3.0);',
        '  vec3 col = vec3(1.0, 1.0, 1.05) * core + vec3(0.15, 0.17, 1.0) * (glow + halo);',
        '  gl_FragColor = vec4(col * vBr * life * flick * 0.75, 1.0);',
        '}'].join('\n')
    });
    var boltMesh = new THREE.Mesh(lg, boltMat); boltMesh.frustumCulled = false; boltMesh.renderOrder = 10; scene.add(boltMesh);
    var bolts = []; var boltDirty = false;
    function randPerp(d, out) { out.set(R() - 0.5, R() - 0.5, R() - 0.5); out.addScaledVector(d, -out.dot(d)); if (out.lengthSq() < 1e-6) out.set(1, 0, 0); return out.normalize(); }
    function midpoint(a, b, levels, jag) {
      var pts = [a.clone(), b.clone()], L = a.distanceTo(b), off = L * 0.22 * jag, d = new V3(), r = new V3();
      for (var lv = 0; lv < levels; lv++) {
        var np = [pts[0]];
        for (var i = 0; i < pts.length - 1; i++) {
          var p = pts[i], q = pts[i + 1];
          var m = p.clone().lerp(q, 0.32 + R() * 0.36);
          d.subVectors(q, p).normalize(); randPerp(d, r);
          m.addScaledVector(r, off * (R() * 2 - 1) * (lv === 0 ? 0.6 : 1));
          np.push(m, q);
        }
        pts = np; off *= 0.58;
      }
      return pts;
    }
    // A bolt: a trunk plus forks plus twigs, each strip carrying its arrival times so the leader grows out of the origin.
    fx.bolt = function (a, b, opt) {
      opt = opt || {};
      var L = a.distanceTo(b);
      var leaderT = opt.leader !== undefined ? opt.leader : Math.min(0.09, 0.03 + 0.014 * L);
      var t0 = fx.time + (opt.delay || 0), tConn = t0 + leaderT, tHold = tConn + (opt.hold || 0.12);
      var strips = [];
      var lev = Math.min(7, (opt.levels || 5) + (L > 3 ? 1 : 0));
      var trunk = midpoint(a, b, lev, opt.jag || 1);
      var width = opt.width || 0.028;
      function addStrip(pts, w, br, share, s0, depth) {
        var cum = [s0];
        for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
        strips.push({ pts: pts, cum: cum, w: w, br: br, share: share, depth: depth });
        return cum;
      }
      var tc = addStrip(trunk, width, 1, 1, 0, 0);
      var speed = L / leaderT;
      var dir = new V3(), ax = new V3(), q = new THREE.Quaternion();
      var nForks = Math.min(5, Math.round((1 + 0.9 * L) * (opt.branches === undefined ? 1 : opt.branches)));
      for (var f = 0; f < nForks; f++) {
        var k = Math.floor((0.08 + R() * 0.75) * (trunk.length - 2)) + 1;
        dir.subVectors(trunk[Math.min(k + 2, trunk.length - 1)], trunk[k]).normalize();
        randPerp(dir, ax); q.setFromAxisAngle(ax, 0.3 + R() * 0.55);
        var fl = L * (0.12 + Math.pow(R(), 1.6) * 0.42);
        var end = trunk[k].clone().addScaledVector(dir.applyQuaternion(q), fl);
        var fp = midpoint(trunk[k], end, 4, 1.2);
        var fc = addStrip(fp, width * 0.4, 0.62, 0.7, tc[k], 1);
        var nTw = 1 + Math.floor(R() * 2);
        for (var tw = 0; tw < nTw; tw++) {
          var k2 = Math.floor((0.2 + R() * 0.6) * (fp.length - 2)) + 1;
          dir.subVectors(fp[Math.min(k2 + 2, fp.length - 1)], fp[k2]).normalize();
          randPerp(dir, ax); q.setFromAxisAngle(ax, 0.45 + R() * 0.75);
          var tl = fl * (0.2 + R() * 0.45);
          var te = fp[k2].clone().addScaledVector(dir.applyQuaternion(q), tl);
          addStrip(midpoint(fp[k2], te, 3, 1.5), width * 0.22, 0.42, 0.45, fc[k2], 2);
        }
      }
      // hair-fine fringe along the trunk: mostly glow
      var nFr = Math.round(L * 2 * (LOW ? 0.5 : 1));
      for (var fr = 0; fr < nFr; fr++) {
        var k3 = Math.floor(R() * (trunk.length - 2)) + 1;
        dir.subVectors(trunk[Math.min(k3 + 1, trunk.length - 1)], trunk[k3]).normalize(); randPerp(dir, ax); q.setFromAxisAngle(ax, 0.5 + R() * 0.8);
        var fe = trunk[k3].clone().addScaledVector(dir.applyQuaternion(q), L * (0.02 + R() * 0.04));
        addStrip(midpoint(trunk[k3], fe, 2, 2), width * 0.09, 0.25, 0.26, tc[k3], 3);
      }
      var bolt = { strips: strips, t0: t0, tConn: tConn, tHold: tHold, end: tHold + 0.14, speed: speed };
      bolts.push(bolt); rebuildBolts(); // into the buffer now, so a bolt made after this frame's update still draws this frame
      return bolt;
    };
    function rebuildBolts() {
      var v = 0, ix = 0;
      var tan = new V3();
      for (var b = 0; b < bolts.length; b++) {
        var bo = bolts[b];
        for (var s = 0; s < bo.strips.length; s++) {
          var st = bo.strips[s], n = st.pts.length;
          if (v + n * 2 >= LV) break;
          var base = v;
          for (var i = 0; i < n; i++) {
            var p = st.pts[i];
            tan.subVectors(st.pts[Math.min(i + 1, n - 1)], st.pts[Math.max(i - 1, 0)]).normalize();
            var arr = bo.t0 + st.cum[i] / bo.speed;
            var taper = st.depth === 0 ? (0.35 + 0.65 * Math.min(1, (n - 1 - i) / (n * 0.25))) : Math.max(0.15, 1 - i / n);
            var bead = (st.depth < 2 && R() < 0.1) ? 1.65 : 1;
            for (var sd = -1; sd <= 1; sd += 2) {
              lbuf.position[v * 3] = p.x; lbuf.position[v * 3 + 1] = p.y; lbuf.position[v * 3 + 2] = p.z;
              lbuf.aTan[v * 3] = tan.x; lbuf.aTan[v * 3 + 1] = tan.y; lbuf.aTan[v * 3 + 2] = tan.z;
              lbuf.aSide[v] = sd; lbuf.aW[v] = st.w * taper * (st.depth === 0 ? 0.85 + 0.6 * R() : 1); lbuf.aBr[v] = st.br * bead;
              lbuf.aTimes[v * 4] = arr; lbuf.aTimes[v * 4 + 1] = bo.tConn; lbuf.aTimes[v * 4 + 2] = bo.tHold; lbuf.aTimes[v * 4 + 3] = st.share;
              v++;
            }
            if (i > 0) { var a0 = base + (i - 1) * 2, a1 = a0 + 1, b0 = a0 + 2, b1 = a0 + 3; lidx[ix++] = a0; lidx[ix++] = b0; lidx[ix++] = a1; lidx[ix++] = a1; lidx[ix++] = b0; lidx[ix++] = b1; }
          }
        }
      }
      lg.setDrawRange(0, ix);
      Object.keys(LA).forEach(function (k) { var at = lg.attributes[k]; at.needsUpdate = true; at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(1, v) * LA[k]); });
      lg.index.needsUpdate = true; lg.index.clearUpdateRanges(); lg.index.addUpdateRange(0, Math.max(1, ix));
      boltDirty = false;
    }
    function updateBolts() {
      var before = bolts.length;
      for (var i = bolts.length - 1; i >= 0; i--) if (fx.time > bolts[i].end) bolts.splice(i, 1);
      if (bolts.length !== before) boltDirty = true;
      if (boltDirty) rebuildBolts();
    }

    // =========================================================== frost: grown once, revealed by arrival time
    // Cone-local space: apex at the origin, forward +y (normalised to the range). Texture covers x in [-0.62, 0.62], y in [-0.06, 1.04].
    function growFrost(seed, res) {
      var rr = window.HW_SIM.stream(seed, 'frost-growth');
      var cv = document.createElement('canvas'); cv.width = cv.height = res;
      var cvT = document.createElement('canvas'); cvT.width = cvT.height = res;
      var gA = cvA(cv), gT = cvA(cvT);
      function cvA(c) { return c.getContext('2d'); }
      gA.fillStyle = '#000'; gA.fillRect(0, 0, res, res);
      gT.fillStyle = '#fff'; gT.fillRect(0, 0, res, res);
      gA.globalCompositeOperation = 'lighter'; gT.globalCompositeOperation = 'darken';
      gA.lineCap = gT.lineCap = 'round';
      function px(x) { return (x + 0.62) / 1.24 * res; }
      function py(y) { return (1 - (y + 0.06) / 1.1) * res; }
      var HALF = 0.56;
      var G = 96, grid = new Int32Array(G * G).fill(-1);
      function cell(x, y) { var i = Math.floor((x + 0.62) / 1.24 * G), j = Math.floor((y + 0.06) / 1.1 * G); if (i < 0 || j < 0 || i >= G || j >= G) return -2; return j * G + i; }
      var tips = [], branchId = 0, segs = [];
      var stems = 7;
      for (var s = 0; s < stems; s++) {
        var a = (s / (stems - 1) - 0.5) * 2 * HALF * 0.86 + (rr() - 0.5) * 0.06;
        tips.push({ x: 0, y: 0, a: a, t: 0, lev: 0, id: branchId++, parent: -1, len: 0, max: s === 3 ? 1.0 : 0.82 + rr() * 0.16, step: 0.014, speed: 1, nextBarb: 0.03 + rr() * 0.02, side: rr() < 0.5 ? 1 : -1, wob: rr() * 10 });
      }
      var guard = 0;
      while (tips.length && guard++ < 20000) {
        // time-ordered: always advance the earliest tip, so whichever reaches a patch first claims it
        var bi = 0; for (var k = 1; k < tips.length; k++) if (tips[k].t < tips[bi].t) bi = k;
        var tp = tips[bi];
        var na = tp.a + (Math.sin(tp.len * 9 + tp.wob) * 0.05 + (rr() - 0.5) * 0.12) * (tp.lev === 0 ? 0.6 : 1);
        var nx = tp.x + Math.sin(na) * tp.step, ny = tp.y + Math.cos(na) * tp.step;
        var r = Math.sqrt(nx * nx + ny * ny), ang = Math.atan2(nx, ny);
        var c = cell(nx, ny);
        var blocked = c === -2 || r > 1.0 || Math.abs(ang) > HALF + 0.02 || tp.len >= tp.max || (grid[c] >= 0 && grid[c] !== tp.id && grid[c] !== tp.parent);
        if (blocked) { tips.splice(bi, 1); continue; }
        var nt = tp.t + tp.step / tp.speed;
        segs.push([tp.x, tp.y, nx, ny, tp.t, nt, tp.lev]);
        if (grid[c] < 0) grid[c] = tp.id;
        tp.x = nx; tp.y = ny; tp.a = na; tp.t = nt; tp.len += tp.step;
        if (tp.lev < 2 && tp.len >= tp.nextBarb) {
          tp.nextBarb = tp.len + (tp.lev === 0 ? 0.024 + rr() * 0.03 : 0.012 + rr() * 0.012);
          var pair = rr() < 0.55;
          for (var sd = 0; sd < (pair ? 2 : 1); sd++) {
            var side2 = pair ? (sd ? 1 : -1) : (tp.side = -tp.side);
            var lean = tp.lev === 0 ? 0.36 : 0.28; // side branches lean toward their stem's tip
            var dist = Math.sqrt(tp.x * tp.x + tp.y * tp.y);
            var bmax = tp.lev === 0 ? (0.05 + rr() * 0.11) * (1.1 - dist * 0.5) : 0.012 + rr() * 0.03;
            tips.push({ x: tp.x, y: tp.y, a: tp.a + side2 * (1.05 - lean), t: tp.t, lev: tp.lev + 1, id: branchId++, parent: tp.id, len: 0, max: bmax, step: tp.lev === 0 ? 0.009 : 0.006,
              speed: tp.lev === 0 ? 0.8 : 0.65, nextBarb: 0.012, side: side2, wob: rr() * 10 });
          }
        }
        if (tp.lev === 0 && rr() < 0.006 && tp.len > 0.25) tips.push({ x: tp.x, y: tp.y, a: tp.a + (rr() < 0.5 ? -1 : 1) * (0.45 + rr() * 0.3), t: tp.t, lev: 0, id: branchId++, parent: tp.id, len: 0, max: 0.25 + rr() * 0.3, step: 0.014, speed: 0.95, nextBarb: 0.03, side: 1, wob: rr() * 10 });
      }
      var tMax = 0; segs.forEach(function (sg) { if (sg[5] > tMax) tMax = sg[5]; });
      // rime first (wide, soft, blue channel), then the hairlines
      var wPx = res / 512;
      segs.forEach(function (sg) {
        var lw = [2.4, 1.3, 0.8][sg[6]] * wPx;
        gA.strokeStyle = 'rgba(0,0,' + (sg[6] === 0 ? 70 : 40) + ',1)'; gA.lineWidth = lw * 5;
        gA.beginPath(); gA.moveTo(px(sg[0]), py(sg[1])); gA.lineTo(px(sg[2]), py(sg[3])); gA.stroke();
      });
      segs.forEach(function (sg) {
        var lw = [2.2, 1.25, 0.75][sg[6]] * wPx, v = sg[6] === 0 ? 255 : sg[6] === 1 ? 210 : 170;
        gA.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; gA.lineWidth = lw;
        gA.beginPath(); gA.moveTo(px(sg[0]), py(sg[1])); gA.lineTo(px(sg[2]), py(sg[3])); gA.stroke();
        var tv = Math.min(254, Math.round(sg[4] / tMax * 254));
        gT.strokeStyle = 'rgb(' + tv + ',' + tv + ',' + tv + ')'; gT.lineWidth = lw * 3.2 + 2;
        gT.beginPath(); gT.moveTo(px(sg[0]), py(sg[1])); gT.lineTo(px(sg[2]), py(sg[3])); gT.stroke();
      });
      var A = gA.getImageData(0, 0, res, res), Tt = gT.getImageData(0, 0, res, res);
      var data = new Uint8Array(res * res * 4);
      for (var p = 0; p < res * res; p++) { data[p * 4] = A.data[p * 4]; data[p * 4 + 1] = Tt.data[p * 4]; data[p * 4 + 2] = Math.min(255, A.data[p * 4 + 2]); data[p * 4 + 3] = 255; }
      // flip rows so v = 0 is the apex end (DataTexture has no flipY)
      var flipped = new Uint8Array(res * res * 4), row = res * 4;
      for (var y = 0; y < res; y++) flipped.set(data.subarray((res - 1 - y) * row, (res - y) * row), y * row);
      var tex = new THREE.DataTexture(flipped, res, res, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
      // spine points for spikes: along the middle stem at chosen fractions
      var spikes = [];
      segs.forEach(function (sg) { if (sg[6] === 0) { var rr2 = Math.sqrt(sg[2] * sg[2] + sg[3] * sg[3]); spikes.push([sg[2], sg[3], sg[5] / tMax, rr2]); } });
      return { tex: tex, tMax: tMax, stems: spikes };
    }
    var frostVariants = [];
    var FRES = LOW ? 384 : 640;
    for (var fv = 0; fv < (LOW ? 2 : 3); fv++) frostVariants.push(growFrost((o.seed || 9) + fv * 77, FRES));
    var frostGeo = (function () { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.62, 0, -0.06, 0.62, 0, -0.06, 0.62, 0, 1.04, -0.62, 0, 1.04]), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 2, 1, 0, 3, 2]); return g; })();
    var frostMatBase = premul(new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null }, uClock: { value: 0 }, uGrow: { value: 0.3 }, uFront: { value: 0.3 }, uLife: { value: 4 }, uFade: { value: 0.8 }, uHalf: { value: 0.56 } },
      polygonOffset: true, polygonOffsetFactor: -2.5, polygonOffsetUnits: -2.5,
      vertexShader: 'varying vec2 vUv; varying vec2 vL; void main(){ vUv = uv; vL = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D uTex; uniform float uClock, uGrow, uFront, uLife, uFade, uHalf; varying vec2 vUv; varying vec2 vL;',
        'void main(){',
        '  vec4 f = texture2D(uTex, vUv);',
        '  float grown = step(f.g, 0.993);',
        '  float arr = f.g * uGrow;',
        '  float age = uClock - arr;',
        '  float present = step(0.0, age) * grown;',
        '  float melt = 1.0 - smoothstep(uLife - uFade, uLife, uClock + (1.0 - f.r) * 0.35);',
        '  float cov = f.r * present * melt;',
        '  float tip = exp(-45.0 * abs(age)) * f.r * grown * melt;',
        '  float fresh = 0.85 * exp(-1.8 * max(age, 0.0)) + 0.15;',
        '  float r = length(vL); float ang = atan(vL.x, vL.y);',
        '  float front = clamp(uClock / uFront, 0.0, 1.0);',
        '  float ragged = (texture2D(uTex, vUv * 0.5 + 0.25).b - 0.2) * 0.12;',
        '  float zone = smoothstep(1.0, 0.8, r + ragged * 1.6) * smoothstep(uHalf + 0.03, uHalf - 0.12, abs(ang) + ragged * 0.6) * smoothstep(front * 1.02, front * 0.94, r) * melt;',
        '  float frontLine = smoothstep(0.05, 0.0, abs(r - front)) * step(uClock, uFront * 1.05) * smoothstep(uHalf + 0.05, uHalf - 0.03, abs(ang));',
        '  float rime = f.b / 255.0 * 255.0 * present * melt;',
        '  float coneEdge = (smoothstep(0.05, 0.0, abs(abs(ang) - uHalf) * r) * step(r, 1.0) + smoothstep(0.05, 0.0, abs(r - 0.97)) * step(abs(ang), uHalf)) * step(r, front * 1.01) * melt * smoothstep(0.15, 0.6, f.b) * 0.6;',
        '  vec3 frostCol = vec3(0.5, 0.64, 0.86);',
        '  float alpha = clamp(cov * 0.7 + zone * 0.1 + rime * 0.45 + coneEdge * 0.55, 0.0, 1.0);',
        '  vec3 col = frostCol * cov * (0.42 + 0.22 * fresh) + vec3(0.56, 0.68, 0.86) * (zone * 0.08 + rime * 0.42 + coneEdge * 0.5);',
        '  col += vec3(0.5, 0.68, 1.25) * (tip * 1.0 + cov * fresh * 0.1 + frontLine * 0.55);',
        '  gl_FragColor = vec4(col, alpha);',
        '}'].join('\n')
    }));
    var frostPool = [];
    for (var fp2 = 0; fp2 < 4; fp2++) { var fm = new THREE.Mesh(frostGeo, frostMatBase.clone()); fm.visible = false; fm.renderOrder = 2; fm.frustumCulled = false; scene.add(fm); frostPool.push({ m: fm, on: false }); }
    var frostLive = [];

    // ice: faceted spikes and shards with a shader of their own (rim from the moon, steel-blue body, milky core)
    var iceMat = new THREE.ShaderMaterial({
      uniforms: { uMoon: { value: new V3(-0.6, 0.6, 0.35).normalize() }, uAlpha: { value: 0.86 }, uGlow: { value: 0 } },
      transparent: true,
      vertexShader: 'varying vec3 vW; varying float vY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vY = position.y; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform vec3 uMoon; uniform float uAlpha; uniform float uGlow; varying vec3 vW; varying float vY;',
        'void main(){',
        '  vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));',
        '  vec3 V = normalize(cameraPosition - vW); if (dot(N, V) < 0.0) N = -N;',
        '  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);',
        '  float lit = max(dot(N, uMoon), 0.0);',
        '  vec3 H = normalize(uMoon + V); float spec = pow(max(dot(N, H), 0.0), 40.0);',
        '  vec3 body = vec3(0.07, 0.16, 0.3) * (0.55 + 0.6 * lit);',
        '  vec3 col = body + vec3(0.45, 0.62, 0.95) * fres * 0.9 + vec3(0.85, 0.92, 1.0) * spec * 0.9;',
        '  col += vec3(0.44, 0.64, 1.0) * (0.18 + uGlow) * exp(-max(vY, 0.0) * 2.4);',
        '  gl_FragColor = vec4(col, clamp(uAlpha * (0.7 + 0.3 * fres), 0.0, 1.0));',
        '}'].join('\n')
    });
    function crystalGeo(sides, rad, h, lop) {
      var pos = [], ring0 = [], ring1 = [], apex = new V3((R() - 0.5) * lop * rad, h, (R() - 0.5) * lop * rad);
      for (var i = 0; i < sides; i++) {
        var a = i / sides * 6.283 + (R() - 0.5) * 0.5, r0 = rad * (0.75 + R() * 0.45);
        ring0.push(new V3(Math.cos(a) * r0, -0.25, Math.sin(a) * r0 * (0.6 + R() * 0.5)));
        ring1.push(new V3(Math.cos(a) * r0 * 0.85, h * (0.55 + R() * 0.2), Math.sin(a) * r0 * 0.8));
      }
      function tri(a, b, c) { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
      for (var j = 0; j < sides; j++) { var k = (j + 1) % sides; tri(ring0[j], ring1[j], ring0[k]); tri(ring0[k], ring1[j], ring1[k]); tri(ring1[j], apex, ring1[k]); }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      return g;
    }
    var spikeGeos = [crystalGeo(5, 0.13, 0.9, 0.5), crystalGeo(6, 0.11, 0.7, 0.6), crystalGeo(4, 0.1, 0.55, 0.7)];
    var shardGeos = [crystalGeo(4, 0.07, 0.14, 0.8), crystalGeo(3, 0.06, 0.12, 0.9), crystalGeo(5, 0.08, 0.1, 0.6)];
    var hullGeo = (function () { var g = new THREE.IcosahedronGeometry(0.5, 0); var p = g.attributes.position; for (var i = 0; i < p.count; i++) { var y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 + (R() - 0.5) * 0.25), Math.max(-0.05, y) * 0.9 + 0.4, p.getZ(i) * (1.3 + (R() - 0.5) * 0.25)); } g.computeVertexNormals(); return g; })();
    var spikePool = [], shardPool = [], hullPool = [];
    for (var sp = 0; sp < (LOW ? 10 : 18); sp++) { var smesh = new THREE.Mesh(spikeGeos[sp % 3], iceMat.clone()); smesh.visible = false; scene.add(smesh); spikePool.push({ m: smesh, on: false }); }
    for (var sh = 0; sh < (LOW ? 30 : 60); sh++) { var shm = new THREE.Mesh(shardGeos[sh % 3], iceMat); shm.visible = false; scene.add(shm); shardPool.push({ m: shm, on: false }); }
    for (var hl = 0; hl < 8; hl++) { var hm = new THREE.Mesh(hullGeo, iceMat.clone()); hm.visible = false; hm.material.uniforms.uAlpha.value = 0.9; scene.add(hm); hullPool.push({ m: hm, on: false, id: -1 }); }
    var shardNext = 0;
    function shardBurst(x, y, z, n, spd) {
      for (var i = 0; i < n; i++) {
        var s = shardPool[shardNext]; shardNext = (shardNext + 1) % shardPool.length;
        var a = R() * 6.283, v = (spd || 2.2) * (0.5 + R() * 0.8);
        s.on = true; s.m.visible = true; s.m.position.set(x + (R() - 0.5) * 0.2, y + R() * 0.3, z + (R() - 0.5) * 0.2);
        s.v = new V3(Math.cos(a) * v, 1.6 + R() * 2.4, Math.sin(a) * v); s.w = new V3((R() - 0.5) * 14, (R() - 0.5) * 14, (R() - 0.5) * 14);
        s.m.rotation.set(R() * 6, R() * 6, R() * 6); s.age = 0; s.life = 2.6 + R() * 1.4; s.rest = false; s.m.scale.setScalar(0.8 + R() * 0.8);
      }
    }
    function updateIce(dt) {
      var pieces = chipPool.length ? shardPool.concat(chipPool) : shardPool;
      for (var i = 0; i < pieces.length; i++) {
        var s = pieces[i]; if (!s.on) continue;
        s.age += dt;
        if (s.age > s.life) { s.on = false; s.m.visible = false; continue; }
        if (!s.rest) {
          s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt);
          s.m.rotation.x += s.w.x * dt; s.m.rotation.y += s.w.y * dt; s.m.rotation.z += s.w.z * dt;
          if (s.m.position.y < 0.03) {
            s.m.position.y = 0.03;
            if (Math.abs(s.v.y) > 0.6) { s.v.y = -s.v.y * 0.22; s.v.x *= 0.45; s.v.z *= 0.45; s.w.multiplyScalar(0.5); }
            else { s.rest = true; s.restT = 0; s.r0 = s.m.rotation.clone(); }
          }
        } else {
          // tip onto the face nearest the ground: ease pitch and roll flat, keep the yaw
          s.restT = Math.min(1, s.restT + dt / 0.22);
          var k = s.restT * s.restT * (3 - 2 * s.restT);
          s.m.rotation.x = s.r0.x * (1 - k) + Math.PI * Math.round(s.r0.x / Math.PI) * k;
          s.m.rotation.z = s.r0.z * (1 - k) + Math.PI * Math.round(s.r0.z / Math.PI) * k;
          if (s.age > s.life - 0.6) s.m.position.y = 0.03 - (s.age - (s.life - 0.6)) * 0.15; // melt into the ground
        }
      }
      for (var j = 0; j < spikePool.length; j++) {
        var p = spikePool[j]; if (!p.on) continue;
        var t = fx.time - p.t0;
        if (t < 0) { p.m.visible = false; continue; }
        p.m.visible = true;
        var x = Math.min(1, t / p.rise), k2 = 1 - Math.pow(1 - x, 3.2);
        p.m.position.y = -p.h * (1 - k2) * 1.1;
        p.m.material.uniforms.uGlow.value = 0.9 * Math.exp(-t * 3.5) + (p.crack ? 0.5 * Math.min(1, (fx.time - p.crack) / 0.3) : 0);
        if (fx.time >= p.shatterAt) {
          p.on = false; p.m.visible = false;
          shardBurst(p.m.position.x, Math.max(0.1, p.h * 0.4), p.m.position.z, LOW ? 3 : 5, 1.6);
          fx.motes(p.m.position.x, 0.3, p.m.position.z, LOW ? 3 : 6, { spread: 0.4 });
        } else if (!p.crack && fx.time >= p.shatterAt - 0.35) p.crack = fx.time;
      }
    }
    fx.frost = function (x, z, ang, half, range, growS, lifeS) {
      var slot = null; for (var i = 0; i < frostPool.length; i++) if (!frostPool[i].on) { slot = frostPool[i]; break; }
      if (!slot) slot = frostPool[0];
      var vrt = frostVariants[Math.floor(R() * frostVariants.length)];
      slot.on = true; slot.m.visible = true; slot.t0 = fx.time; slot.life = lifeS;
      var u = slot.m.material.uniforms; u.uTex.value = vrt.tex; u.uClock.value = 0; u.uGrow.value = growS * vrt.tMax; u.uFront.value = growS; u.uLife.value = lifeS; u.uHalf.value = half;
      slot.m.position.set(x, 0.015, z); slot.m.rotation.y = ang; slot.m.scale.set(range, 1, range);
      frostLive.push(slot);
      // spikes erupt along the stems as the front reaches them, then crack and shatter before the frost melts
      var picks = [0.36, 0.58, 0.8, 0.95].slice(0, LOW ? 2 : 4);
      var sa = Math.sin(ang), ca = Math.cos(ang);
      picks.forEach(function (fr, k) {
        var best = null, bd = 1e9;
        vrt.stems.forEach(function (st) { var d = Math.abs(st[3] - fr) + Math.abs(st[0]) * (k % 2 ? 0.2 : 0.6) + R() * 0.05; if (d < bd) { bd = d; best = st; } });
        if (!best) return;
        var sp = null; for (var q = 0; q < spikePool.length; q++) if (!spikePool[q].on) { sp = spikePool[q]; break; }
        if (!sp) return;
        var lx = best[0] * range, lz = best[1] * range;
        var wx = x + lx * ca + lz * sa, wz = z - lx * sa + lz * ca;
        sp.on = true; sp.t0 = fx.time + best[2] * growS * vrt.tMax; sp.rise = 0.2 + 0.06 * fr; sp.h = 0.5 + fr * 0.5; sp.crack = 0;
        sp.shatterAt = fx.time + lifeS - 0.55 + k * 0.05;
        sp.m.position.set(wx, -2, wz); sp.m.rotation.set((R() - 0.5) * 0.4 + 0.25 * Math.cos(ang), R() * 6, (R() - 0.5) * 0.4); sp.m.scale.setScalar(0.75 + fr * 0.6);
        sp.m.visible = false; sp.m.scale.multiplyScalar(1.7);
      });
      // low freezing mist that hugs the cone
      for (var m = 0; m < (LOW ? 2 : 4); m++) {
        var d2 = (0.3 + m * 0.2) * range;
        fx.smokeTint(x + sa * d2, 0.2, z + ca * d2, { size: 0.9 + R() * 0.5, life: lifeS * 0.7, delay: m * 0.05 });
      }
      fx.light(new V3(x, 0.8, z), 0x80aeff, 26, { decay: 1.5, hold: 0.25, dist: 9, follow: (function (t0) { return function () { var f = Math.min(1, (fx.time - t0) / Math.max(0.05, growS)); return tmpV.set(x + sa * range * f * 0.8, 0.9, z + ca * range * f * 0.8); }; })(fx.time) });
      return slot;
    };
    // mist uses the smoke pool with a cold, pale tint
    var MSN = LOW ? 12 : 24;
    var MS = instGeo(quadGeo(-1, 1, -1, 1), { iPos: 3, iVel: 3, iSize: 3, iLife: 4 }, MSN);
    var mistMat = premul(new THREE.ShaderMaterial({
      uniforms: { uTime: T }, vertexShader: smokeMat.vertexShader,
      fragmentShader: [
        'uniform float uTime; varying vec2 vUv; varying float vAge; varying float vSeed; varying float vGlow; varying float vOp;', NOISE_GLSL,
        'void main(){ float r = length(vUv * vec2(1.0, 1.8)); float n = fbm(vUv * 1.4 + vec2(vSeed * 9.0 + uTime * 0.15, vSeed * 3.0));',
        '  float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.6) * smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge)) * 0.09 * vOp;',
        '  gl_FragColor = vec4(vec3(0.4, 0.5, 0.66) * a, a); }'].join('\n')
    }));
    var mistMesh = new THREE.Mesh(MS.geo, mistMat); mistMesh.frustumCulled = false; mistMesh.renderOrder = 5; scene.add(mistMesh);
    var mistI = 0; for (var mi = 0; mi < MSN; mi++) MS.a.iLife.setXYZW(mi, -10, 0.1, 0, 0);
    fx.smokeTint = function (x, y, z, opt) {
      var i = mistI = (mistI + 1) % MSN;
      MS.a.iPos.setXYZ(i, x, y, z); MS.a.iVel.setXYZ(i, opt.vx !== undefined ? opt.vx : (R() - 0.5) * 0.2, 0.02, opt.vz !== undefined ? opt.vz : (R() - 0.5) * 0.2);
      MS.a.iSize.setXYZ(i, opt.size || 1, 0.5, 0); MS.a.iLife.setXYZW(i, fx.time + (opt.delay || 0), opt.life || 3, R(), opt.op || 1);
      MS.a.iPos.needsUpdate = MS.a.iVel.needsUpdate = MS.a.iSize.needsUpdate = MS.a.iLife.needsUpdate = true;
    };
    function updateFrost() {
      for (var i = frostLive.length - 1; i >= 0; i--) {
        var s = frostLive[i], t = fx.time - s.t0;
        s.m.material.uniforms.uClock.value = t;
        if (t > s.life + 0.1) { s.on = false; s.m.visible = false; frostLive.splice(i, 1); }
      }
    }
    fx.hull = function (id, x, z, scale) {
      var h = null; for (var i = 0; i < hullPool.length; i++) if (!hullPool[i].on) { h = hullPool[i]; break; }
      if (!h) return;
      h.on = true; h.id = id; h.t0 = fx.time; h.m.visible = true; h.m.position.set(x, 0, z); h.m.rotation.y = R() * 6; h.s = scale || 1; h.m.scale.setScalar(0.01);
      fx.motes(x, 0.4, z, LOW ? 4 : 8, { spread: 0.6 });
    };
    fx.hullMove = function (id, x, z) { for (var i = 0; i < hullPool.length; i++) if (hullPool[i].on && hullPool[i].id === id) hullPool[i].m.position.set(x, 0, z); };
    fx.hullEnd = function (id, shatter) {
      for (var i = 0; i < hullPool.length; i++) {
        var h = hullPool[i]; if (!h.on || h.id !== id) continue;
        h.on = false; h.m.visible = false;
        if (shatter) { shardBurst(h.m.position.x, 0.35, h.m.position.z, LOW ? 6 : 10, 2.8); fx.motes(h.m.position.x, 0.4, h.m.position.z, LOW ? 6 : 12, { spread: 0.8, up: 1 }); fx.debris(h.m.position.x, 0.3, h.m.position.z, LOW ? 5 : 9, 'ice'); }
        else fx.motes(h.m.position.x, 0.3, h.m.position.z, 5, { spread: 0.5 });
      }
    };
    function updateHulls() {
      for (var i = 0; i < hullPool.length; i++) { var h = hullPool[i]; if (!h.on) continue; var k = Math.min(1, (fx.time - h.t0) / 0.14); h.m.scale.setScalar(h.s * (0.3 + 0.7 * (1 - Math.pow(1 - k, 3)))); h.m.material.uniforms.uGlow.value = 0.35 + 0.8 * Math.exp(-(fx.time - h.t0) * 4); }
    }

    // =========================================================== fire rings (ember)
    fx.emberRing = function (x, z, Rr, growS, burnS, opt) {
      opt = opt || {};
      var n = LOW ? 16 : 30;
      var seed = R() * 100, tongues = [];
      for (var i = 0; i < n; i++) {
        var a = (i + (R() - 0.5) * 0.6) / n * 6.283;
        // clumps: about a third of the ring is gap; heights are mostly short with a few 2-3x taller
        var clump = 0.5 + 0.5 * Math.sin(a * 3 + seed) * Math.sin(a * 2 - seed * 0.7) + (R() - 0.5) * 0.4;
        var inGap = clump < 0.28;
        var hh = Math.pow(R(), 2);
        var h = (inGap ? 0.22 : 0.5 + 0.95 * hh) * 1.45;
        var idx = flameAlloc(); if (idx < 0) break;
        tongues.push({ i: idx, a: a, h: h, w: inGap ? 0.3 : 0.42 + R() * 0.2, seed: R(), lean: 0.08 + R() * 0.2 });
      }
      var f = { x: x, z: z, R: Rr, from: 0.45, t0: fx.time, grow: growS, burn: burnS, tongues: tongues, dead: false, nextSmoke: 0, nextEmber: 0 };
      var killAt = fx.time + growS + burnS - 0.3;
      tongues.forEach(function (tg) { flameSet(tg.i, x, 0, z, tg.w, tg.h, tg.seed, tg.lean, fx.time + 0.02 * R(), 0.12, killAt + R() * 0.25, 0.35, 0.95 + R() * 0.15, Math.sin(tg.a), Math.cos(tg.a)); });
      // the burst at the centre: a short ball of tongues that cools fast
      for (var b = 0; b < (LOW ? 3 : 5); b++) {
        var bi = flameAlloc(); if (bi < 0) break;
        var ba = R() * 6.283, br = R() * 0.3;
        flameSet(bi, x + Math.sin(ba) * br, 0, z + Math.cos(ba) * br, 0.75 + R() * 0.35, 1.1 + R() * 0.5, R(), 0.1, fx.time, 0.04, fx.time + 0.12, 0.3, 0.96, Math.sin(ba), Math.cos(ba));
        f.tongues.push({ i: bi, burst: true, a: ba, br: br });
      }
      fires.push(f);
      fx.glow(x, 0.4, z, 2.0, 0.8, 0.24, 0.6, 0.24, true);
      fx.light(new V3(x, 1.1, z), 0xff7a30, 16, { hold: growS + burnS * 0.5, decay: 2.2, dist: 7 });
      fx.sparks(x, 0.3, z, LOW ? 10 : 18, { speed: 4, up: 3 });
      fx.embers(x, 0.2, z, LOW ? 8 : 16, { spread: 0.6, speed: 2.2, up: 2 });
      fx.decal(0, x, z, Rr * 1.12, R() * 6, 9 + burnS);
      for (var s = 0; s < (LOW ? 3 : 5); s++) fx.smoke(x + (R() - 0.5) * 0.9, 0.7 + R() * 0.5, z + (R() - 0.5) * 0.9, { size: 0.3 + R() * 0.2, grow: 2.6, vy: 1.3 + R() * 0.7, glow: 1.4, life: 1.3 + R() * 0.7, op: 0.5 });
      return f;
    };
    function updateFires() {
      for (var i = fires.length - 1; i >= 0; i--) {
        var f = fires[i], t = fx.time - f.t0;
        var k = Math.min(1, t / f.grow), e = 1 - Math.pow(1 - k, 2.2);
        var r = f.from + (f.R - f.from) * e;
        for (var j = 0; j < f.tongues.length; j++) {
          var tg = f.tongues[j]; if (tg.burst) continue;
          FL.a.iPos.setXYZ(tg.i, f.x + Math.sin(tg.a) * r, 0, f.z + Math.cos(tg.a) * r);
        }
        FL.a.iPos.needsUpdate = true;
        if (t > f.nextSmoke && t < f.grow + f.burn - 0.3) {
          f.nextSmoke = t + (LOW ? 0.32 : 0.16);
          var a = R() * 6.283; fx.smoke(f.x + Math.sin(a) * r, 0.9 + R() * 0.5, f.z + Math.cos(a) * r, { size: 0.2 + R() * 0.14, grow: 2.4, vy: 1.0 + R() * 0.5, glow: 1.0, life: 1.2 + R() * 0.6, op: 0.42 });
        }
        if (t > f.nextEmber && t < f.grow + f.burn) { f.nextEmber = t + (LOW ? 0.12 : 0.06); var a2 = R() * 6.283; fx.embers(f.x + Math.sin(a2) * r, 0.3, f.z + Math.cos(a2) * r, 1, { spread: 0.2, speed: 0.6, up: 0.8 }); }
        if (t > f.grow + f.burn + 0.7) {
          f.tongues.forEach(function (tg) { FL.a.iLife.setXYZW(tg.i, -10, 0.1, -9, 0.1); flameFree.push(tg.i); });
          FL.a.iLife.needsUpdate = true;
          fires.splice(i, 1);
        }
      }
    }
    // the thrown seed: a white-hot core with an ember trail
    var seeds = [];
    fx.seed = function (id, x0, z0, x1, z1, dur, y0) {
      y0 = y0 === undefined ? 1.3 : y0;
      var g = fx.glow(x0, y0, z0, 3.0, 0.95, 0.22, 0.3, dur + 0.05, false);
      var s = { id: id, x0: x0, z0: z0, y0: y0, x1: x1, z1: z1, t0: fx.time, dur: dur, glow: g, next: 0, nextG: 0 };
      s.light = fx.light(new V3(x0, y0, z0), 0xff9040, 9, { hold: dur, decay: 6, dist: 6, follow: function () { return s.done ? null : s.pos; } });
      s.pos = new V3(x0, y0, z0);
      s.core = seedCores[seedCoreI = (seedCoreI + 1) % seedCores.length]; s.core.visible = true; s.core.position.copy(s.pos);
      seeds.push(s);
    };
    var seedCoreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.05, 0.22) }), seedCores = [], seedCoreI = 0;
    for (var sc = 0; sc < 4; sc++) { var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 1), seedCoreMat); core.visible = false; core.renderOrder = 9; scene.add(core); seedCores.push(core); }
    fx.eachSeed = function (fn) { for (var i = 0; i < seeds.length; i++) fn(seeds[i].pos); };
    function updateSeeds() {
      for (var i = seeds.length - 1; i >= 0; i--) {
        var s = seeds[i], k = (fx.time - s.t0) / s.dur;
        if (k >= 1) { s.done = true; if (s.core) s.core.visible = false; seeds.splice(i, 1); continue; }
        var d = Math.sqrt((s.x1 - s.x0) * (s.x1 - s.x0) + (s.z1 - s.z0) * (s.z1 - s.z0));
        // a high lob: the peak grows with the throw, so the arc reads from the tactical camera
        var y = s.y0 * (1 - k) + (1.1 + d * 0.25) * 4 * k * (1 - k);
        s.pos.set(s.x0 + (s.x1 - s.x0) * k, y, s.z0 + (s.z1 - s.z0) * k);
        fx.moveGlow(s.glow, s.pos.x, s.pos.y, s.pos.z);
        if (fx.time > s.next) { s.next = fx.time + 0.012; spawnPoint(GP, { kind: 1, x: s.pos.x, y: s.pos.y, z: s.pos.z, vx: (R() - 0.5) * 0.5, vy: 0.1 + R() * 0.3, vz: (R() - 0.5) * 0.5, life: 0.35 + R() * 0.45, size: 0.06, g: 0.8, buoy: 0.4, drag: 2, heat: 0.95, cool: 1.5 }); }
        if (fx.time > s.nextG) { s.nextG = fx.time + 0.012; fx.glow(s.pos.x, s.pos.y, s.pos.z, 2.6, 0.95, 0.25, 0.12, 0.14, false); }
        if (s.core) s.core.position.copy(s.pos);
      }
    }
    // shell chips: lit, glossy pieces that tumble and land like the ice shards
    var chipMat = new THREE.MeshPhongMaterial({ color: 0x22341f, shininess: 90, specular: 0x5a7a40, flatShading: true });
    var chipPool = [];
    for (var cp = 0; cp < (LOW ? 14 : 28); cp++) { var cm = new THREE.Mesh(shardGeos[cp % 3], chipMat); cm.visible = false; scene.add(cm); chipPool.push({ m: cm, on: false }); }
    var chipNext = 0;
    fx.chips = function (x, y, z, n, spd) {
      for (var i = 0; i < n; i++) {
        var c = chipPool[chipNext]; chipNext = (chipNext + 1) % chipPool.length;
        var a = R() * 6.283, v = (spd || 2.6) * (0.5 + R() * 0.8);
        c.on = true; c.m.visible = true; c.m.position.set(x, y, z);
        c.v = new V3(Math.cos(a) * v, 2 + R() * 2.5, Math.sin(a) * v); c.w = new V3((R() - 0.5) * 16, (R() - 0.5) * 16, (R() - 0.5) * 16);
        c.m.rotation.set(R() * 6, R() * 6, R() * 6); c.age = 0; c.life = 1.3 + R() * 0.6; c.rest = false; c.m.scale.setScalar(0.5 + R() * 0.45);
      }
    };
    // the frost plume: a low breath of powder and mist that leads the ground frost along the cone
    fx.plume = function (x, z, ang, half, range, growS) {
      var ux = Math.sin(ang), uz = Math.cos(ang), n = LOW ? 14 : 30;
      for (var i = 0; i < n; i++) {
        var a = ang + (R() * 2 - 1) * half * 0.85, sp = range / growS * (0.55 + R() * 0.5);
        spawnPoint(GP, { kind: 2, x: x + ux * 0.4, y: 0.55 + R() * 0.6, z: z + uz * 0.4, vx: Math.sin(a) * sp, vy: -0.3 + R() * 0.3, vz: Math.cos(a) * sp, life: growS * (1.2 + R() * 1.2), size: 0.04 + R() * 0.05, g: 0.4, drag: 2.2, curl: 0.3 });
      }
      for (var m = 0; m < (LOW ? 2 : 4); m++) {
        var a2 = ang + (R() * 2 - 1) * half * 0.5, sp2 = range / growS * (0.35 + m * 0.12);
        fx.smokeTint(x + ux * 0.5, 0.45, z + uz * 0.5, { size: 0.55 + R() * 0.3, life: 1.1 + R() * 0.5, vx: Math.sin(a2) * sp2, vz: Math.cos(a2) * sp2, op: 1.8 });
      }
    };

    // a small flame that rides a burning foe: begin, burn(key, ...) for each, end
    var burnMap = {}, burnSeen = {}, burnDefer = [];
    fx.beginBurns = function () { burnSeen = {}; };
    fx.burn = function (key, x, y, z, s) {
      burnSeen[key] = 1;
      var b = burnMap[key];
      if (!b) { var idx = flameAlloc(); if (idx < 0) return; b = burnMap[key] = { i: idx, seed: R() }; flameSet(idx, x, y, z, 0.36 * s, 0.62 * s, b.seed, 0.05, fx.time, 0.08, 1e6, 0.2, 0.9, 0, 0); }
      FL.a.iPos.setXYZ(b.i, x, y, z); FL.a.iPos.needsUpdate = true;
    };
    fx.endBurns = function () {
      for (var k in burnMap) if (!burnSeen[k]) { var b = burnMap[k]; FL.a.iLife.setXYZW(b.i, fx.time - 1, 0.08, fx.time, 0.18); FL.a.iLife.needsUpdate = true; burnDefer.push({ i: b.i, at: fx.time + 0.25 }); delete burnMap[k]; }
      for (var j = burnDefer.length - 1; j >= 0; j--) if (fx.time >= burnDefer[j].at) { flameFree.push(burnDefer[j].i); burnDefer.splice(j, 1); }
    };

    // =========================================================== impact frames, shake and the flash limiter
    var flashTimes = [];
    var imp = { t: 0, dur: 0, mode: 0, cx: 0.5, cy: 0.5, r: 0.3, seed: 0, ink: new THREE.Color(), paper: new THREE.Color(), dim: 0, dimT: 0 };
    var INKS = {
      fire: [[0.03, 0.012, 0.006], [1.0, 0.94, 0.84]],
      lightning: [[0.012, 0.014, 0.022], [0.93, 0.965, 1.0]],
      frost: [[0.01, 0.02, 0.04], [0.86, 0.93, 1.0]],
      earth: [[0.025, 0.02, 0.012], [0.96, 0.9, 0.78]]
    };
    fx.impact = function (d) {
      var now = performance.now();
      while (flashTimes.length && now - flashTimes[0] > 1000) flashTimes.shift();
      var safe = fx.opts.flashes === 'safe' || flashTimes.length >= 3;
      if (safe) { imp.dim = 0.32; imp.dimT = Math.max(d.hold || 0.08, 0.12); return 'dim'; }
      flashTimes.push(now);
      tmpV2.copy(d.at || new V3()).project(camera);
      imp.cx = tmpV2.x * 0.5 + 0.5; imp.cy = tmpV2.y * 0.5 + 0.5;
      imp.mode = d.mode === 'full' ? 1 : 0; imp.r = d.radius || 0.32; imp.dur = imp.t = Math.max(0.05, d.hold || 0.08); imp.seed = Math.random() * 100;
      var ink = INKS[d.element] || INKS.lightning; imp.ink.setRGB(ink[0][0], ink[0][1], ink[0][2]); imp.paper.setRGB(ink[1][0], ink[1][1], ink[1][2]);
      return 'ink';
    };
    var shk = { a: 0, t: 9 };
    fx.shake = function (a) { if (!fx.opts.shake) return; if (a * Math.exp(-7 * 0) > shk.a * Math.exp(-7 * shk.t)) { shk.a = a; shk.t = 0; } };
    fx.shakeOffset = function () { return shk.t > 1.2 ? 0 : -shk.a * Math.exp(-7 * shk.t) * Math.cos(2 * Math.PI * 5.5 * shk.t) * fx.opts.shake; };
    fx.impactState = function () { return imp; };
    function updateImpact(rdt) { if (imp.t > 0) imp.t = Math.max(0, imp.t - rdt); if (imp.dimT > 0) imp.dimT = Math.max(0, imp.dimT - rdt); shk.t += rdt; }

    // =========================================================== per frame
    fx.update = function (dt, rdt) {
      fx.time += dt; T.value = fx.time;
      updateLights(dt, rdt);
      updateFires(); updateSeeds();
      updatePoints(GP, dt, true); updatePoints(DP, dt, false);
      updateBolts(); updateFrost(); updateIce(dt); updateHulls();
      updateTelegraphs(rdt); updateImpact(rdt);
    };
    fx.setSize = function (w, h, dpr) { boltMat.uniforms.uRes.value.set(w * dpr, h * dpr); GP.mat.uniforms.uScale.value = DP.mat.uniforms.uScale.value = h * dpr * 0.55; };
    fx.clearAll = function () {
      fires.forEach(function (f) { f.tongues.forEach(function (tg) { FL.a.iLife.setXYZW(tg.i, -10, 0.1, -9, 0.1); flameFree.push(tg.i); }); }); fires.length = 0; FL.a.iLife.needsUpdate = true;
      for (var bk in burnMap) { FL.a.iLife.setXYZW(burnMap[bk].i, -10, 0.1, -9, 0.1); flameFree.push(burnMap[bk].i); } burnMap = {}; burnDefer.forEach(function (d) { flameFree.push(d.i); }); burnDefer = [];
      seedCores.forEach(function (c) { c.visible = false; });
      seeds.length = 0; bolts.length = 0; boltDirty = true;
      frostLive.forEach(function (s) { s.on = false; s.m.visible = false; }); frostLive.length = 0;
      spikePool.forEach(function (p) { p.on = false; p.m.visible = false; }); shardPool.forEach(function (p) { p.on = false; p.m.visible = false; });
      hullPool.forEach(function (p) { p.on = false; p.m.visible = false; }); chipPool.forEach(function (p) { p.on = false; p.m.visible = false; });
      GP.P.forEach(function (p) { p.on = false; }); DP.P.forEach(function (p) { p.on = false; });
      for (var i = 0; i < SN; i++) SM.a.iLife.setXYZW(i, -10, 0.1, 0, 0); SM.a.iLife.needsUpdate = true;
      for (var j = 0; j < MSN; j++) MS.a.iLife.setXYZW(j, -10, 0.1, 0, 0); MS.a.iLife.needsUpdate = true;
      for (var k = 0; k < DN; k++) DC.a.iT.setXYZW(k, -10, 0.1, 0, 0); DC.a.iT.needsUpdate = true;
      for (var g = 0; g < GN; g++) GL.a.iLife.setXYZW(g, -10, 0.1, 0, 0); GL.a.iLife.needsUpdate = true;
      Object.keys(tgActive).forEach(function (k2) { fx.endTelegraph(k2); });
      slots.forEach(function (s) { s.target = 0; s.e = 0; s.hold = 0; s.follow = null; s.L.intensity = 0; });
      imp.t = 0; imp.dimT = 0; shk.t = 9;
    };
    fx.counts = function () {
      var g = 0, d = 0; GP.P.forEach(function (p) { if (p.on) g++; }); DP.P.forEach(function (p) { if (p.on) d++; });
      return { flames: FN - flameFree.length, glowPts: g, debris: d, bolts: bolts.length, frosts: frostLive.length, fires: fires.length };
    };
    return fx;
  };
})();
