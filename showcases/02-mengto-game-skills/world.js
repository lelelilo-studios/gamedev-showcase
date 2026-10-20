/* Hedge Witch: the garden and its creatures, built from procedural geometry.
   createHedgeWorld(THREE, { content, quality, seed }) returns the static scene pieces plus factories for actor views.
   Like the skills' modules, it takes your own THREE and imports nothing. */
(function () {
  'use strict';

  window.createHedgeWorld = function (THREE, opt) {
    var C = opt.content, Q = opt.quality || 'high', LOW = Q === 'low';
    var rnd = window.HW_SIM.stream(opt.seed || 7, 'world-art'); // art has its own stream: never touches the sim's
    var V3 = THREE.Vector3;
    var shared = { time: { value: 0 }, wind: { value: 1 } };

    // ---------------------------------------------------------------- painterly material injection
    var PAINT_GLSL = [
      'float hwH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
      'float hwN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
      '  return mix(mix(hwH(i), hwH(i+vec2(1,0)), f.x), mix(hwH(i+vec2(0,1)), hwH(i+vec2(1,1)), f.x), f.y); }',
      'vec3 hwPaint(vec3 w){',
      '  float a = hwN(w.xz*1.3 + w.y*0.7), b = hwN(w.xz*5.1 + vec2(w.y*3.1, 0.));',
      '  float stroke = hwN(vec2(w.x*9.0 + w.z*3.0, w.y*14.0 - w.z*2.0));',
      '  return vec3(0.84 + 0.26*a + 0.08*(b-.5) + 0.07*(stroke-.5));',
      '}'
    ].join('\n');
    function paint(mat, o) {
      o = o || {};
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = shared.time; sh.uniforms.uWind = shared.wind;
        sh.vertexShader = 'uniform float uTime; uniform float uWind; varying vec3 vHwW;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'vec4 hwW = vec4(transformed, 1.0);',
          '#ifdef USE_INSTANCING', 'hwW = instanceMatrix * hwW;', '#endif',
          'hwW = modelMatrix * hwW;',
          o.sway ? ('float hwSw = max(0.0, position.y) * ' + o.sway.toFixed(3) + ' * uWind;' +
            'vec2 hwBase = hwW.xz - transformed.xz;' +
            'transformed.x += hwSw * (sin(uTime*1.6 + hwBase.x*0.7 + hwBase.y*0.4) + 0.4*sin(uTime*3.7 + hwBase.y*1.3));' +
            'transformed.z += hwSw * 0.6 * cos(uTime*1.3 + hwBase.y*0.6);') : '',
          'vHwW = hwW.xyz;'
        ].join('\n'));
        sh.fragmentShader = 'varying vec3 vHwW;\n' + PAINT_GLSL + '\n' + sh.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\n diffuseColor.rgb *= ' + (o.flat ? 'mix(vec3(1.0), hwPaint(vHwW), ' + o.flat.toFixed(2) + ')' : 'hwPaint(vHwW)') + ';' +
          (o.dark ? '\n diffuseColor.rgb *= mix(' + o.dark.toFixed(2) + ', 1.0, smoothstep(0.0, 0.5, vHwW.y));' : ''));
      };
      mat.customProgramCacheKey = function () { return 'hwpaint' + (o.sway || 0) + (o.flat || 0) + (o.dark || 0); };
      return mat;
    }
    var col = new THREE.Color();
    function hex(h) { return col.set(h).clone(); }
    function vcolor(geo, fn) {
      var p = geo.attributes.position, n = p.count, c = new Float32Array(n * 3), v = new V3();
      for (var i = 0; i < n; i++) { v.fromBufferAttribute(p, i); var cc = fn(v, i); c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return geo;
    }
    function solid(geo, h) { var cc = hex(h); return vcolor(geo, function () { return cc; }); }
    function merge(list) {
      var parts = list.map(function (g) { return g.index ? g.toNonIndexed() : g; });
      var total = 0; parts.forEach(function (g) { total += g.attributes.position.count; });
      var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cl = new Float32Array(total * 3), o = 0;
      parts.forEach(function (g) {
        g.computeVertexNormals();
        pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.color) cl.set(g.attributes.color.array, o * 3); else cl.fill(1, o * 3, (o + g.attributes.position.count) * 3);
        o += g.attributes.position.count;
      });
      var out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      return out;
    }
    function jitter(geo, amt, r) {
      var p = geo.attributes.position, v = new V3(), map = {};
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        var k = v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
        if (!map[k]) map[k] = [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt];
        p.setXYZ(i, v.x + map[k][0], v.y + map[k][1], v.z + map[k][2]);
      }
      return geo;
    }
    function tf(geo, x, y, z, rx, ry, rz, sx, sy, sz) {
      var m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new V3(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz));
      geo.applyMatrix4(m); return geo;
    }

    var group = new THREE.Group();
    var HALF = C.garden.half, WALL = C.garden.wall;

    // ---------------------------------------------------------------- the painted ground
    function pathMask(x, z) {
      // gravel: a ring round the sundial, four spokes, and a walk inside the wall
      var d = Math.sqrt(x * x + z * z);
      var ring = Math.abs(d - 2.6) < 0.75;
      var spoke = (Math.abs(x) < 0.7 && Math.abs(z) < 11) || (Math.abs(z) < 0.7 && Math.abs(x) < 11);
      var walk = Math.max(Math.abs(x), Math.abs(z)) > 10.4 && Math.max(Math.abs(x), Math.abs(z)) < 11.4;
      return ring || spoke || walk || d < 1.9;
    }
    function inBed(x, z, pad) { pad = pad || 0; for (var i = 0; i < C.beds.length; i++) { var b = C.beds[i]; if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true; } return false; }
    var GROUND = 26.2;
    function paintGround() {
      var N = LOW ? 768 : 1536, cv = document.createElement('canvas'); cv.width = cv.height = N;
      var g = cv.getContext('2d'), S = N / GROUND;
      function W2C(x) { return (x + GROUND / 2) * S; }
      g.fillStyle = '#2a4130'; g.fillRect(0, 0, N, N);
      var i, x, z, r;
      // big soft mottling
      for (i = 0; i < 260; i++) {
        x = rnd() * N; z = rnd() * N; r = (0.6 + rnd() * 2.6) * S;
        var gr = g.createRadialGradient(x, z, 0, x, z, r);
        var tone = ['rgba(62,92,56,', 'rgba(30,52,42,', 'rgba(74,100,60,', 'rgba(28,46,48,', 'rgba(88,104,58,'][i % 5];
        gr.addColorStop(0, tone + (0.25 + rnd() * 0.3) + ')'); gr.addColorStop(1, tone + '0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, z, r, 0, 6.283); g.fill();
      }
      // combed grass strokes
      var strokes = LOW ? 7000 : 16000;
      g.lineCap = 'round';
      for (i = 0; i < strokes; i++) {
        x = rnd() * N; z = rnd() * N;
        var wx = x / S - GROUND / 2, wz = z / S - GROUND / 2;
        if (pathMask(wx, wz)) continue;
        var a = -0.9 + Math.sin(wx * 0.4 + wz * 0.3) * 0.5 + (rnd() - 0.5) * 0.9, l = (0.16 + rnd() * 0.3) * S;
        var shade = rnd();
        g.strokeStyle = shade < 0.3 ? 'rgba(20,34,26,0.5)' : shade < 0.62 ? 'rgba(58,90,52,0.5)' : shade < 0.9 ? 'rgba(86,116,64,0.45)' : 'rgba(132,140,84,0.4)';
        g.lineWidth = (1.2 + rnd() * 2.4) * S / 40;
        g.beginPath(); g.moveTo(x, z); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * l * 0.4, z + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, z + Math.sin(a) * l); g.stroke();
      }
      // gravel paths: dabs of ochre and grey, darker at the edges
      for (i = 0; i < (LOW ? 26000 : 70000); i++) {
        x = rnd() * N; z = rnd() * N;
        var px = x / S - GROUND / 2, pz = z / S - GROUND / 2;
        if (!pathMask(px, pz)) continue;
        var edge = !pathMask(px + 0.25, pz) || !pathMask(px - 0.25, pz) || !pathMask(px, pz + 0.25) || !pathMask(px, pz - 0.25);
        var t2 = rnd();
        g.fillStyle = edge ? (t2 < 0.5 ? 'rgba(46,52,36,0.7)' : 'rgba(70,72,52,0.6)') :
          t2 < 0.3 ? 'rgba(104,94,72,0.75)' : t2 < 0.6 ? 'rgba(84,80,66,0.75)' : t2 < 0.9 ? 'rgba(122,110,84,0.7)' : 'rgba(60,58,50,0.8)';
        var rr = (0.025 + rnd() * 0.05) * S;
        g.beginPath(); g.ellipse(x, z, rr, rr * (0.6 + rnd() * 0.5), rnd() * 3, 0, 6.283); g.fill();
      }
      // flagstones round the sundial
      for (i = 0; i < 14; i++) {
        var ang = i / 14 * 6.283 + rnd() * 0.15, rad = 1.25 + rnd() * 0.25;
        x = W2C(Math.cos(ang) * rad); z = W2C(Math.sin(ang) * rad);
        g.fillStyle = 'rgba(' + (96 + rnd() * 30 | 0) + ',' + (98 + rnd() * 24 | 0) + ',' + (96 + rnd() * 20 | 0) + ',0.9)';
        g.beginPath(); g.ellipse(x, z, 0.36 * S, 0.27 * S, ang, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(20,24,20,0.5)'; g.lineWidth = S * 0.03; g.stroke();
      }
      // shade under beds and at the foot of the wall
      C.beds.forEach(function (b) {
        g.fillStyle = 'rgba(8,12,10,0.45)';
        var rx = W2C(b.x - b.w / 2 - 0.25), rz = W2C(b.z - b.d / 2 - 0.25);
        g.filter = 'blur(' + (S * 0.18).toFixed(1) + 'px)';
        g.fillRect(rx, rz, (b.w + 0.5) * S, (b.d + 0.5) * S);
        g.filter = 'none';
      });
      var wallShade = g.createLinearGradient(0, 0, 0, N);
      [[0, 1], [1, 0]].forEach(function () { });
      g.filter = 'blur(' + (S * 0.3).toFixed(1) + 'px)';
      g.strokeStyle = 'rgba(6,10,10,0.6)'; g.lineWidth = S * 1.1; g.strokeRect(W2C(-12.4), W2C(-12.4), 24.8 * S, 24.8 * S);
      g.filter = 'none';
      // wildflowers in the grass, tiny
      for (i = 0; i < (LOW ? 500 : 1400); i++) {
        x = rnd() * N; z = rnd() * N;
        var fx = x / S - GROUND / 2, fz = z / S - GROUND / 2;
        if (pathMask(fx, fz) || inBed(fx, fz, 0.3)) continue;
        g.fillStyle = ['rgba(236,230,206,0.8)', 'rgba(230,206,110,0.75)', 'rgba(170,186,236,0.7)', 'rgba(220,170,190,0.6)'][i % 4];
        g.beginPath(); g.arc(x, z, (0.018 + rnd() * 0.02) * S, 0, 6.283); g.fill();
      }
      var tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    }
    var groundTex = paintGround();
    var groundMat = new THREE.MeshLambertMaterial({ map: groundTex });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.name = 'ground';
    group.add(ground);

    // the meadow outside the wall, fading into the night
    var outerGeo = new THREE.PlaneGeometry(130, 130, 40, 40);
    vcolor(outerGeo, function (v) {
      var d = Math.max(Math.abs(v.x), Math.abs(v.y));
      var k = Math.min(1, Math.max(0, (d - 13) / 30));
      return new THREE.Color().setRGB(0.05 + 0.03 * (1 - k), 0.075 + 0.045 * (1 - k), 0.06 + 0.02 * (1 - k));
    });
    var outer = new THREE.Mesh(outerGeo, paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { flat: 0.8 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02;
    group.add(outer);

    // ---------------------------------------------------------------- dry-stone wall
    var stoneGeo = jitter(new THREE.BoxGeometry(1.6, 1.6, 1.6, 2, 2, 2), 0.5, rnd).toNonIndexed(); stoneGeo.computeVertexNormals();
    var wallMat = paint(new THREE.MeshLambertMaterial({ vertexColors: false }), { flat: 1, dark: 0.55 });
    var stones = [];
    var breaches = C.breaches;
    function nearBreach(side, t) { for (var i = 0; i < breaches.length; i++) { var b = breaches[i]; if (b.side !== side) continue; var bt = side === 'N' || side === 'S' ? b.x : b.z; if (Math.abs(bt - t) < 0.9) return true; } return false; }
    ['N', 'S', 'W', 'E'].forEach(function (side) {
      var near = side === 'S' || side === 'E';
      var courses = near ? 2 : 3;
      for (var c = 0; c <= courses; c++) {
        var t = -WALL - 0.4 + (c % 2) * 0.28;
        while (t < WALL + 0.4) {
          var L = 0.55 + rnd() * 0.4;
          var top = c === courses;
          if (top && nearBreach(side, t)) { t += L * 1.1; continue; }
          var y = 0.2 + c * 0.34 + (top ? 0.04 : 0), depth = 0.55;
          var inset = (rnd() - 0.5) * 0.12;
          var x, z;
          if (side === 'N') { x = t; z = -WALL + inset; } else if (side === 'S') { x = t; z = WALL + inset; }
          else if (side === 'W') { x = -WALL + inset; z = t; } else { x = WALL + inset; z = t; }
          var along = side === 'N' || side === 'S';
          var mossy = (top && rnd() < 0.75) || rnd() < 0.22;
          stones.push({ x: x, y: y, z: z, sx: along ? L * 0.33 : depth * (top ? 0.36 : 0.4), sy: (top ? 0.12 : 0.115) + rnd() * 0.04, sz: along ? depth * (top ? 0.36 : 0.4) : L * 0.33,
            ry: (rnd() - 0.5) * 0.3, rx: (rnd() - 0.5) * 0.2, mossy: mossy, tone: rnd() });
          t += L * (top ? 0.95 : 1.02);
        }
      }
    });
    var wallInst = new THREE.InstancedMesh(stoneGeo, wallMat, stones.length);
    var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler();
    stones.forEach(function (s, i) {
      e4.set(s.rx, s.ry, 0); q4.setFromEuler(e4);
      m4.compose(new V3(s.x, s.y, s.z), q4, new V3(s.sx, s.sy, s.sz));
      wallInst.setMatrixAt(i, m4);
      var cc = s.mossy ? new THREE.Color().setRGB(0.13 + s.tone * 0.06, 0.2 + s.tone * 0.08, 0.11 + s.tone * 0.03) : new THREE.Color().setRGB(0.24 + s.tone * 0.11, 0.22 + s.tone * 0.09, 0.2 + s.tone * 0.06);
      wallInst.setColorAt(i, cc);
    });
    wallInst.instanceMatrix.needsUpdate = true; if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
    group.add(wallInst);
    // a dark rubble core behind the faces, so the gaps read as depth and not as sky
    var coreMat = paint(new THREE.MeshLambertMaterial({ color: 0x15181a }), { flat: 1 });
    ['N', 'S', 'W', 'E'].forEach(function (side) {
      var near = side === 'S' || side === 'E', h = near ? 0.78 : 1.12;
      var g = new THREE.BoxGeometry(side === 'N' || side === 'S' ? WALL * 2 + 0.9 : 0.42, h, side === 'N' || side === 'S' ? 0.42 : WALL * 2 + 0.9);
      var m = new THREE.Mesh(g, coreMat);
      m.position.set(side === 'W' ? -WALL : side === 'E' ? WALL : 0, h / 2, side === 'N' ? -WALL : side === 'S' ? WALL : 0);
      group.add(m);
    });

    // ivy and a glow-worm at every breach: where things come over
    var ivyGeo = (function () { var g = new THREE.CircleGeometry(0.18, 5); g.scale(1, 1.25, 1); return g; })();
    var ivyMat = paint(new THREE.MeshLambertMaterial({ color: 0x2f5a2c, side: THREE.DoubleSide }), { flat: 1 });
    var ivyN = 0, ivyList = [];
    breaches.forEach(function (b) {
      for (var k = 0; k < 18; k++) {
        var along = (rnd() - 0.5) * 2.4, h = 0.2 + rnd() * 0.9;
        var out = b.side === 'N' ? [0, 1] : b.side === 'S' ? [0, -1] : b.side === 'W' ? [1, 0] : [-1, 0];
        var x = b.x + (out[1] !== 0 ? along : 0) + out[0] * 0.3, z = b.z + (out[0] !== 0 ? along : 0) + out[1] * 0.3;
        ivyList.push({ x: x, y: h, z: z, ry: Math.atan2(out[0], out[1]) + (rnd() - 0.5) * 0.8, rx: (rnd() - 0.5) * 0.6, s: 0.7 + rnd() * 0.7 });
      }
    });
    var ivy = new THREE.InstancedMesh(ivyGeo, ivyMat, ivyList.length);
    ivyList.forEach(function (v, i) { e4.set(v.rx, v.ry, 0); q4.setFromEuler(e4); m4.compose(new V3(v.x, v.y, v.z), q4, new V3(v.s, v.s, v.s)); ivy.setMatrixAt(i, m4); });
    group.add(ivy);

    // ---------------------------------------------------------------- hedge, trees and the cottage outside
    var hedgeGeo = jitter(new THREE.IcosahedronGeometry(1, 1), 0.25, rnd); hedgeGeo.computeVertexNormals();
    var hedgeMat = paint(new THREE.MeshLambertMaterial({ color: 0x18281c }), { flat: 1, dark: 0.6 });
    var hedge = [];
    for (var hi = 0; hi < (LOW ? 90 : 170); hi++) {
      var side = hi % 4, t = (rnd() - 0.5) * 36, off = 14.2 + rnd() * 3.5;
      var hx = side === 0 ? t : side === 1 ? t : side === 2 ? -off : off, hz = side === 0 ? -off : side === 1 ? off : t;
      if ((side === 1 || side === 3) && off < 15.5) off += 1.5;
      if (side === 1) hz = off + 0.8; if (side === 3) hx = off + 0.8;
      hedge.push({ x: hx, z: hz, s: 1.1 + rnd() * 1.4, y: 0.3 + rnd() * 0.8 });
    }
    var hedgeInst = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedge.length);
    hedge.forEach(function (h, i) { m4.compose(new V3(h.x, h.y, h.z), q4.identity(), new V3(h.s, h.s * 0.85, h.s)); hedgeInst.setMatrixAt(i, m4); hedgeInst.setColorAt(i, new THREE.Color().setRGB(0.07 + rnd() * 0.05, 0.12 + rnd() * 0.06, 0.09 + rnd() * 0.04)); });
    group.add(hedgeInst);

    function tree(x, z, s) {
      var parts = [];
      parts.push(solid(tf(new THREE.CylinderGeometry(0.22, 0.38, 3.2, 6), 0, 1.6, 0), '#2a2119'));
      for (var k = 0; k < 4; k++) parts.push(solid(tf(jitter(new THREE.IcosahedronGeometry(1.5 - k * 0.22, 1), 0.4, rnd), (rnd() - 0.5) * 1.2, 3.4 + k * 1.05, (rnd() - 0.5) * 1.2), ['#132219', '#16281c', '#1a2e1f', '#1d3322'][k]));
      var m = new THREE.Mesh(merge(parts), paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { flat: 1, dark: 0.5 }));
      m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = rnd() * 6;
      group.add(m);
    }
    tree(-17.5, -15.5, 1.25); tree(-19, 4, 1.1); tree(9, -18.5, 1.2); tree(18.5, -12, 1.0); tree(-11, -19, 0.95); tree(20, 9, 1.05);

    // the witch's cottage, beyond the north wall, a lit window to come home to
    var cottage = new THREE.Group();
    (function () {
      var walls = solid(tf(new THREE.BoxGeometry(4.2, 2.2, 3.2), 0, 1.1, 0), '#8d8270');
      var roofShape = new THREE.Shape(); roofShape.moveTo(-2.6, 0); roofShape.lineTo(0, 2.1); roofShape.lineTo(2.6, 0); roofShape.lineTo(-2.6, 0);
      var roof = new THREE.ExtrudeGeometry(roofShape, { depth: 3.8, bevelEnabled: false }); roof.translate(0, 2.15, -1.9);
      vcolor(roof, function (v) { var k = 0.5 + 0.5 * Math.sin(v.y * 9 + v.z * 2); return new THREE.Color().setRGB(0.32 + 0.06 * k, 0.26 + 0.05 * k, 0.15); });
      var chim = solid(tf(new THREE.BoxGeometry(0.5, 1.4, 0.5), 1.1, 3.6, 0.6), '#5e5248');
      var door = solid(tf(new THREE.BoxGeometry(0.8, 1.4, 0.06), -0.8, 0.7, 1.62), '#3c2a1c');
      var m = new THREE.Mesh(merge([walls, roof, chim, door]), paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { flat: 1, dark: 0.7 }));
      cottage.add(m);
      var winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.35, 0.55) });
      [[0.6, 1.2, 1.62], [-1.75, 1.3, 1.62]].forEach(function (p) { var w = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.55), winMat); w.position.set(p[0], p[1], p[2] + 0.01); cottage.add(w); });
      cottage.position.set(-3, 0, -18.2); cottage.rotation.y = 0.12;
    })();
    group.add(cottage);

    // ---------------------------------------------------------------- beds and sundial
    var bedMat = paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { flat: 1 });
    C.beds.forEach(function (b) {
      var parts = [], H = 0.44, T = 0.15;
      function plank(x, z, w, d, toneBase) {
        var g = new THREE.BoxGeometry(w, H, d, Math.max(1, Math.round(w * 3)), 1, Math.max(1, Math.round(d * 3)));
        tf(g, x, H / 2, z);
        var t0 = rnd() * 10;
        vcolor(g, function (v) { var grain = 0.5 + 0.5 * Math.sin((v.x + v.z) * 13 + t0 + Math.sin(v.y * 30) * 0.4); return new THREE.Color().setRGB(0.25 + 0.06 * grain + toneBase, 0.17 + 0.04 * grain + toneBase * 0.6, 0.1 + 0.02 * grain); });
        parts.push(g);
      }
      plank(b.x, b.z - b.d / 2 + T / 2, b.w, T, 0.02); plank(b.x, b.z + b.d / 2 - T / 2, b.w, T, 0.0);
      plank(b.x - b.w / 2 + T / 2, b.z, T, b.d - 2 * T, 0.01); plank(b.x + b.w / 2 - T / 2, b.z, T, b.d - 2 * T, 0.03);
      var soil = new THREE.BoxGeometry(b.w - 2 * T, 0.1, b.d - 2 * T, 8, 1, 8); tf(soil, b.x, H - 0.08, b.z);
      jitter(soil, 0.04, rnd);
      vcolor(soil, function (v) { var k = rnd(); return new THREE.Color().setRGB(0.09 + k * 0.03, 0.065 + k * 0.02, 0.05); });
      parts.push(soil);
      // corner posts
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { parts.push(solid(tf(new THREE.BoxGeometry(0.2, H + 0.12, 0.2), b.x + c[0] * (b.w / 2 - 0.06), (H + 0.12) / 2, b.z + c[1] * (b.d / 2 - 0.06)), '#33261a')); });
      group.add(new THREE.Mesh(merge(parts), bedMat));
    });
    (function sundial() {
      var parts = [];
      parts.push(solid(tf(new THREE.CylinderGeometry(0.8, 0.95, 0.28, 10), 0, 0.14, 0), '#5c5f60'));
      parts.push(solid(tf(new THREE.CylinderGeometry(0.28, 0.36, 0.8, 8), 0, 0.68, 0), '#6c6e6c'));
      parts.push(solid(tf(new THREE.CylinderGeometry(0.62, 0.55, 0.12, 12), 0, 1.12, 0), '#777a77'));
      parts.push(solid(tf(new THREE.BoxGeometry(0.04, 0.32, 0.5), 0, 1.3, 0.05, 0.5, 0, 0), '#9b8a56'));
      group.add(new THREE.Mesh(merge(parts), paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { flat: 1 })));
    })();
    // stepping stones on the spokes (a little relief over the painted gravel)
    (function () {
      var g = jitter(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 7), 0.06, rnd);
      var list = [];
      for (var i = 0; i < 4; i++) for (var k = 0; k < 4; k++) {
        var d = 4.2 + k * 1.55 + rnd() * 0.3, a = i * Math.PI / 2;
        list.push([Math.cos(a) * d + (rnd() - 0.5) * 0.2, Math.sin(a) * d + (rnd() - 0.5) * 0.2]);
      }
      var inst = new THREE.InstancedMesh(g, paint(new THREE.MeshLambertMaterial({ color: 0x6b6d68 }), { flat: 1 }), list.length);
      list.forEach(function (p, i) { m4.compose(new V3(p[0], 0.03, p[1]), q4.setFromEuler(e4.set(0, rnd() * 3, 0)), new V3(1 + rnd() * 0.3, 1, 0.8 + rnd() * 0.3)); inst.setMatrixAt(i, m4); });
      group.add(inst);
    })();

    // ---------------------------------------------------------------- grass tufts that move in the wind
    (function () {
      var blades = [];
      for (var b = 0; b < 5; b++) {
        var a = b / 5 * 6.283 + rnd(), h = 0.18 + rnd() * 0.2, w = 0.035;
        var g = new THREE.BufferGeometry();
        var ox = Math.cos(a) * 0.05, oz = Math.sin(a) * 0.05, lean = 0.08 + rnd() * 0.08;
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ox - w * Math.sin(a), 0, oz + w * Math.cos(a), ox + w * Math.sin(a), 0, oz - w * Math.cos(a), ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean]), 3));
        vcolor(g, function (v) { var k = v.y / 0.38; return new THREE.Color().setRGB(0.06 + 0.12 * k, 0.11 + 0.17 * k, 0.07 + 0.06 * k); });
        blades.push(g);
      }
      var geo = merge(blades);
      var mat = paint(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { sway: 0.22, flat: 0.6 });
      var pts = [];
      var n = LOW ? 520 : 1500;
      for (var i = 0; i < n * 3 && pts.length < n; i++) {
        var x = (rnd() - 0.5) * 23.6, z = (rnd() - 0.5) * 23.6;
        if (pathMask(x, z) || inBed(x, z, 0.25) || Math.sqrt(x * x + z * z) < 2) continue;
        pts.push([x, z]);
      }
      var inst = new THREE.InstancedMesh(geo, mat, pts.length);
      pts.forEach(function (p, i) { var s = 0.7 + rnd() * 0.9; m4.compose(new V3(p[0], 0, p[1]), q4.setFromEuler(e4.set(0, rnd() * 6, 0)), new V3(s, s * (0.8 + rnd() * 0.6), s)); inst.setMatrixAt(i, m4); });
      group.add(inst);
    })();

    // ---------------------------------------------------------------- herbs
    var herbMat = paint(new THREE.MeshLambertMaterial({ vertexColors: true }), { sway: 0.14, flat: 0.5 });
    function leaf(len, wid, colr) { var g = new THREE.SphereGeometry(1, 6, 4); g.scale(wid, 0.2 * wid, len); g.translate(0, 0, len * 0.9); return solid(g, colr); }
    function buildHerb(kind) {
      var H = C.herbs[kind], parts = [], i, k, a, h, base = H.leaf, fl = H.flower;
      var dark = new THREE.Color(base).multiplyScalar(0.55).getHexString();
      function stem(x, z, hgt, lean, ang) { var g = new THREE.CylinderGeometry(0.012, 0.022, hgt, 4); g.translate(0, hgt / 2, 0); g.rotateZ(lean); g.rotateY(ang); g.translate(x, 0, z); parts.push(solid(g, '#' + dark)); return [x + Math.sin(lean) * -hgt * Math.cos(ang), hgt * Math.cos(lean), z + Math.sin(lean) * hgt * Math.sin(ang)]; }
      function blob(p, r, c, sy) { var g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, sy || 1, 1); g.translate(p[0], p[1], p[2]); parts.push(solid(g, c)); }
      switch (H.form) {
        case 'spire':
          for (i = 0; i < 7; i++) { a = i / 7 * 6.283; var lf = leaf(0.32, 0.12, base); lf.rotateX(-0.25); lf.rotateY(a); parts.push(lf); }
          stem(0, 0, 1.05, 0, 0);
          for (k = 0; k < 9; k++) { h = 0.45 + k * 0.065; a = k * 2.4; var bell = new THREE.ConeGeometry(0.05, 0.11, 6, 1, true); bell.rotateX(Math.PI); bell.translate(Math.cos(a) * 0.06, h, Math.sin(a) * 0.06); parts.push(solid(bell, fl)); }
          break;
        case 'wand':
          for (i = 0; i < 16; i++) { a = rnd() * 6.283; var ln = 0.45 + rnd() * 0.25, le = 0.15 + rnd() * 0.35; var tip = stem(Math.cos(a) * 0.05, Math.sin(a) * 0.05, ln, le, a); blob([tip[0], tip[1] + 0.04, tip[2]], 0.035, fl, 2.6); }
          for (i = 0; i < 8; i++) { var l2 = leaf(0.18, 0.04, base); l2.rotateX(-0.6); l2.rotateY(rnd() * 6.3); parts.push(l2); }
          break;
        case 'daisy':
          for (i = 0; i < 11; i++) {
            a = rnd() * 6.283; var tp = stem(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.32 + rnd() * 0.2, 0.2 + rnd() * 0.4, a);
            var disc = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 6); disc.translate(tp[0], tp[1], tp[2]); parts.push(solid(disc, '#e2b33a'));
            var pet = new THREE.CylinderGeometry(0.07, 0.07, 0.012, 9); pet.translate(tp[0], tp[1] - 0.008, tp[2]); parts.push(solid(pet, fl));
          }
          for (i = 0; i < 14; i++) { var l3 = leaf(0.15, 0.06, base); l3.rotateX(-0.4 - rnd() * 0.5); l3.rotateY(rnd() * 6.3); l3.translate(0, rnd() * 0.15, 0); parts.push(l3); }
          break;
        case 'mound':
          for (i = 0; i < 38; i++) { a = rnd() * 6.283; var rr = Math.sqrt(rnd()) * 0.32, hh = 0.04 + (0.32 - rr) * 0.75 * rnd() + 0.08; blob([Math.cos(a) * rr, hh, Math.sin(a) * rr], 0.05 + rnd() * 0.04, rnd() < 0.5 ? base : '#' + new THREE.Color(base).multiplyScalar(1.18).getHexString()); }
          for (i = 0; i < 18; i++) { a = rnd() * 6.283; var r2 = rnd() * 0.3; blob([Math.cos(a) * r2, 0.2 + (0.3 - r2) * 0.5, Math.sin(a) * r2], 0.022, fl); }
          break;
        case 'broad':
          for (i = 0; i < 14; i++) { var lb = leaf(0.2 + rnd() * 0.08, 0.1, base); lb.rotateX(-0.25 - rnd() * 0.5); lb.rotateY(rnd() * 6.3); lb.translate(0, 0.05 + rnd() * 0.2, 0); parts.push(lb); }
          for (i = 0; i < 4; i++) { a = rnd() * 6.283; var t2 = stem(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.42 + rnd() * 0.12, 0.15, a); for (k = 0; k < 4; k++) blob([t2[0], t2[1] - k * 0.05, t2[2]], 0.03, fl); }
          break;
        case 'star':
          for (i = 0; i < 10; i++) { var ls = leaf(0.24, 0.1, base); ls.rotateX(-0.3 - rnd() * 0.3); ls.rotateY(rnd() * 6.3); parts.push(ls); }
          for (i = 0; i < 7; i++) { a = rnd() * 6.283; var t3 = stem(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.5 + rnd() * 0.2, 0.25 + rnd() * 0.3, a); var st = new THREE.ConeGeometry(0.07, 0.04, 5); st.rotateX(Math.PI); st.translate(t3[0], t3[1], t3[2]); parts.push(solid(st, fl)); }
          break;
        case 'needle':
          for (i = 0; i < 9; i++) { a = rnd() * 6.283; var ln2 = 0.55 + rnd() * 0.3, le2 = 0.08 + rnd() * 0.25; var t4 = stem(Math.cos(a) * 0.04, Math.sin(a) * 0.04, ln2, le2, a); for (k = 0; k < 6; k++) { var f = k / 6; blob([t4[0] * f, t4[1] * (0.3 + 0.7 * f), t4[2] * f], 0.045, k === 5 ? fl : base, 0.45); } }
          break;
        case 'bell':
          for (i = 0; i < 8; i++) { var lc = leaf(0.3, 0.13, base); lc.rotateX(-0.2 - rnd() * 0.3); lc.rotateY(rnd() * 6.3); parts.push(lc); }
          for (i = 0; i < 4; i++) { a = rnd() * 6.283; var t5 = stem(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.6, 0.35, a); for (k = 0; k < 4; k++) { var cb = new THREE.ConeGeometry(0.04, 0.09, 6, 1, true); cb.rotateX(Math.PI); cb.translate(t5[0] + k * 0.02, t5[1] - 0.06 - k * 0.04, t5[2]); parts.push(solid(cb, fl)); } }
          break;
        default: // button
          for (i = 0; i < 8; i++) { a = rnd() * 6.283; var t6 = stem(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.55 + rnd() * 0.2, 0.12 + rnd() * 0.3, a); for (k = 0; k < 4; k++) blob([t6[0] + (rnd() - 0.5) * 0.08, t6[1], t6[2] + (rnd() - 0.5) * 0.08], 0.035, fl, 0.6); }
          for (i = 0; i < 12; i++) { var lt = leaf(0.2, 0.05, base); lt.rotateX(-0.5 - rnd() * 0.4); lt.rotateY(rnd() * 6.3); lt.translate(0, rnd() * 0.25, 0); parts.push(lt); }
      }
      return merge(parts);
    }
    var stubGeo = (function () {
      var parts = [];
      for (var i = 0; i < 6; i++) { var a = i / 6 * 6.283 + rnd(); var g = new THREE.CylinderGeometry(0.01, 0.02, 0.08 + rnd() * 0.08, 4); g.translate(0, 0.05, 0); g.rotateZ(0.3 + rnd() * 0.5); g.rotateY(a); parts.push(solid(g, '#3d3420')); }
      var mound = new THREE.SphereGeometry(0.22, 8, 4, 0, 6.283, 0, 1.4); mound.scale(1, 0.25, 1); parts.push(solid(mound, '#1f160d'));
      return merge(parts);
    })();
    var herbViews = [], HERB_S = 1.9;
    function addHerbs(simHerbs) {
      simHerbs.forEach(function (h) {
        var root = new THREE.Group(); root.position.set(h.x, 0.38, h.z);
        var mesh = new THREE.Mesh(buildHerb(h.kind), herbMat); mesh.rotation.y = rnd() * 6.283;
        var stub = new THREE.Mesh(stubGeo, herbMat); stub.visible = false;
        root.add(mesh); root.add(stub); group.add(root);
        herbViews.push({ root: root, mesh: mesh, stub: stub, shake: 0, hp: 1, eaten: false });
      });
    }
    function updateHerbs(simHerbs, dt, t) {
      for (var i = 0; i < herbViews.length; i++) {
        var v = herbViews[i], h = simHerbs[i];
        var k = Math.max(0, h.hp / h.max);
        v.hp += (k - v.hp) * Math.min(1, dt * 6);
        if (h.eaten && !v.eaten) { v.eaten = true; v.mesh.visible = false; v.stub.visible = true; }
        if (!h.eaten && v.eaten) { v.eaten = false; v.mesh.visible = true; v.stub.visible = false; }
        if (h.hurtT > 0) v.shake = 1;
        v.shake = Math.max(0, v.shake - dt * 3);
        var s = HERB_S * (0.55 + 0.45 * v.hp);
        v.mesh.scale.set(s * (1 + 0.04 * Math.sin(t * 2 + i)), s * (0.75 + 0.25 * v.hp), s);
        v.stub.scale.setScalar(HERB_S);
        v.mesh.rotation.z = Math.sin(t * 40 + i) * 0.08 * v.shake;
        v.mesh.rotation.x = (1 - v.hp) * 0.28 + Math.cos(t * 37 + i) * 0.06 * v.shake;
      }
    }

    // ---------------------------------------------------------------- fireflies
    var flyN = LOW ? 26 : 60;
    var flyGeo = new THREE.BufferGeometry(), flyPos = new Float32Array(flyN * 3), flySeed = new Float32Array(flyN);
    for (var fi = 0; fi < flyN; fi++) { flyPos[fi * 3] = (rnd() - 0.5) * 34; flyPos[fi * 3 + 1] = 0.5 + rnd() * 2.2; flyPos[fi * 3 + 2] = (rnd() - 0.5) * 34; flySeed[fi] = rnd() * 100; }
    flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3)); flyGeo.setAttribute('aSeed', new THREE.BufferAttribute(flySeed, 1));
    var flyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.time, uScale: { value: 300 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA; void main(){ vec3 p = position; float t = uTime*0.25 + aSeed;' +
        'p += vec3(sin(t*1.3)*1.4 + sin(t*0.37)*2.0, sin(t*1.9)*0.35, cos(t*1.1)*1.4 + cos(t*0.29)*2.0);' +
        'vA = pow(max(0., sin(uTime*1.7 + aSeed*3.0)), 6.0); vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = uScale * 0.09 / -mv.z * (0.6 + vA); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float a = exp(-d*d*28.) ; gl_FragColor = vec4(vec3(1.1, 1.5, 0.45) * a * (0.15 + 1.6*vA), 1.0); }'
    });
    var flies = new THREE.Points(flyGeo, flyMat); flies.frustumCulled = false;
    group.add(flies);

    // ---------------------------------------------------------------- actor factories
    function phong(o) { return new THREE.MeshPhongMaterial(o); }
    function lambert(o) { return new THREE.MeshLambertMaterial(o); }

    function makeWitch() {
      var root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      var cloth = paint(lambert({ vertexColors: true }), { flat: 0.6 });
      // skirt: a bell lathe, plum with a rust hem
      var prof = []; for (var i = 0; i <= 10; i++) { var t = i / 10; prof.push(new THREE.Vector2(0.44 - 0.27 * Math.pow(t, 0.8) + 0.03 * Math.sin(t * 9), t * 0.86)); }
      var skirt = new THREE.LatheGeometry(prof, 14);
      vcolor(skirt, function (v) { return v.y < 0.09 ? new THREE.Color('#7a3a22') : new THREE.Color('#3b2a4a').lerp(new THREE.Color('#2b2038'), Math.sin(Math.atan2(v.x, v.z) * 7) * 0.5 + 0.5); });
      var skirtM = new THREE.Mesh(skirt, cloth); body.add(skirtM);
      var torsoG = merge([
        solid(tf(new THREE.CylinderGeometry(0.15, 0.19, 0.38, 10), 0, 1.02, 0), '#3d2f4c'),
        solid(tf(new THREE.ConeGeometry(0.29, 0.3, 10, 1, true), 0, 1.11, 0), '#8a4a26'),
        solid(tf(new THREE.TorusGeometry(0.17, 0.035, 5, 12), 0, 0.86, 0, Math.PI / 2), '#6a4a2a'),
        solid(tf(new THREE.IcosahedronGeometry(0.06, 0), 0.15, 0.82, 0.1), '#8a6a3a'),
        solid(tf(new THREE.IcosahedronGeometry(0.05, 0), -0.13, 0.82, 0.12), '#6b7a3a')
      ]);
      body.add(new THREE.Mesh(torsoG, cloth));
      var headG = merge([
        solid(tf(new THREE.SphereGeometry(0.155, 12, 10), 0, 1.38, 0), '#e7c3a0'),
        solid(tf(new THREE.ConeGeometry(0.035, 0.12, 6), 0, 1.37, 0.17, Math.PI / 2 - 0.25), '#d9a989'),
        solid(tf(new THREE.IcosahedronGeometry(0.09, 0), -0.12, 1.33, -0.06), '#c9ccd2'),
        solid(tf(new THREE.IcosahedronGeometry(0.08, 0), 0.12, 1.33, -0.07), '#b8bcc4'),
        solid(tf(new THREE.IcosahedronGeometry(0.1, 0), 0, 1.3, -0.13), '#d3d6dc')
      ]);
      var head = new THREE.Mesh(headG, lambert({ vertexColors: true, emissive: 0x2a140a })); head.userData.keepEmissive = true; body.add(head);
      // eyes: two dark beads that catch the lantern
      var eyeMat = phong({ color: 0x1a1210, shininess: 90, specular: 0x886655 });
      [-0.055, 0.055].forEach(function (x) { var e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), eyeMat); e.position.set(x, 1.41, 0.14); body.add(e); });
      // hat: a soft brim and a tall crown with a bend at the tip
      var hat = new THREE.Group(); hat.position.set(0, 1.48, -0.04); hat.rotation.x = -0.12; body.add(hat);
      var brim = new THREE.CylinderGeometry(0.39, 0.41, 0.04, 20, 1);
      var bp = brim.attributes.position; for (var b = 0; b < bp.count; b++) { var bx = bp.getX(b), bz = bp.getZ(b), br = Math.sqrt(bx * bx + bz * bz); if (br > 0.3) bp.setY(b, bp.getY(b) + Math.sin(Math.atan2(bz, bx) * 3 + 0.5) * 0.04 - (br - 0.3) * 0.12); }
      var crown = new THREE.ConeGeometry(0.22, 0.82, 12, 8);
      var cp = crown.attributes.position; for (var c = 0; c < cp.count; c++) { var cy = cp.getY(c) + 0.41, k2 = Math.max(0, cy - 0.35); cp.setXYZ(c, cp.getX(c) + 0.0, cp.getY(c) + 0.41 - k2 * k2 * 0.6, cp.getZ(c) - k2 * k2 * 0.9); }
      var band = new THREE.TorusGeometry(0.205, 0.03, 5, 16); band.rotateX(Math.PI / 2); band.translate(0, 0.07, 0);
      var sprig = merge([solid(tf(new THREE.ConeGeometry(0.03, 0.18, 4), 0.2, 0.15, 0.05, 0, 0, -0.5), '#8a9b5c'), solid(tf(new THREE.ConeGeometry(0.025, 0.15, 4), 0.21, 0.13, -0.03, 0.3, 0, -0.8), '#a8743a')]);
      var hatG = merge([solid(brim, '#26222c'), solid(crown, '#2c2733'), solid(band, '#7a3a22'), sprig]);
      hat.add(new THREE.Mesh(hatG, cloth));
      // arms
      function arm(side) {
        var sh = new THREE.Group(); sh.position.set(side * 0.2, 1.17, 0.0);
        var up = new THREE.Mesh(merge([solid(tf(new THREE.CapsuleGeometry(0.072, 0.22, 3, 6), 0, -0.14, 0), '#3d2f4c')]), cloth); sh.add(up);
        var el = new THREE.Group(); el.position.set(0, -0.29, 0); sh.add(el);
        var fo = new THREE.Mesh(merge([solid(tf(new THREE.CapsuleGeometry(0.062, 0.2, 3, 6), 0, -0.12, 0), '#4a3a5c'), solid(tf(new THREE.SphereGeometry(0.068, 7, 5), 0, -0.28, 0), '#e7c3a0')]), cloth); el.add(fo);
        var hand = new THREE.Object3D(); hand.position.set(0, -0.28, 0); el.add(hand);
        body.add(sh); return { sh: sh, el: el, hand: hand };
      }
      var L = arm(1), R = arm(-1);
      // staff and lantern in the right hand
      var staff = new THREE.Group(); R.hand.add(staff);
      var staffG = (function () {
        var g = new THREE.CylinderGeometry(0.025, 0.035, 2.0, 6, 8); jitter(g, 0.02, rnd); g.translate(0, 0.35, 0);
        var crook = new THREE.TorusGeometry(0.12, 0.024, 5, 10, Math.PI * 1.2); crook.rotateY(Math.PI / 2); crook.translate(0, 1.38, 0.1);
        return merge([solid(g, '#4a3524'), solid(crook, '#4a3524')]);
      })();
      staff.add(new THREE.Mesh(staffG, lambert({ vertexColors: true })));
      var lantern = new THREE.Group(); lantern.position.set(0, 1.36, 0.22); staff.add(lantern);
      var lanternBody = new THREE.Group(); lantern.add(lanternBody);
      lanternBody.add(new THREE.Mesh(merge([
        solid(tf(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 3), 0, -0.06, 0), '#222'),
        solid(tf(new THREE.ConeGeometry(0.08, 0.07, 6), 0, -0.13, 0), '#2a2a2e'),
        solid(tf(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 6), 0, -0.31, 0), '#2a2a2e')
      ]), phong({ vertexColors: true, shininess: 40 })));
      var glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, 0.75) });
      var glass = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.062, 0.15, 6), glassMat); glass.position.y = -0.22; lanternBody.add(glass);
      var flameCore = new THREE.Object3D(); flameCore.position.y = -0.22; lanternBody.add(flameCore);
      // a hand glow for spells held in the hand
      var handGlow = new THREE.Object3D(); L.hand.add(handGlow);
      return { root: root, body: body, skirt: skirtM, hat: hat, L: L, R: R, staff: staff, lantern: lantern, lanternBody: lanternBody, flame: flameCore, glass: glassMat, handGlow: handGlow,
        swing: 0, swingV: 0, walk: 0 };
    }

    // slugs and snails share a soft body
    function bodyGeo(len, rad, colA, colB, spots) {
      var prof = [];
      for (var i = 0; i <= 14; i++) { var t = i / 14; var r = rad * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.55) * (1 - 0.55 * t); prof.push(new THREE.Vector2(Math.max(0.001, r), t * len - len * 0.45)); }
      var g = new THREE.LatheGeometry(prof, 12); g.rotateX(Math.PI / 2); g.scale(1, 0.62, 1);
      g.translate(0, rad * 0.5, 0);
      var A = new THREE.Color(colA), B = new THREE.Color(colB);
      vcolor(g, function (v) {
        var c = A.clone().lerp(B, Math.max(0, Math.min(1, 0.5 - v.y * 2.5)));
        if (spots) { var s = Math.sin(v.x * 37 + v.z * 23) * Math.sin(v.z * 41 - v.x * 11); if (s > 0.55 && v.y > rad * 0.45) c.multiplyScalar(0.45); }
        return c;
      });
      return g;
    }
    var slugMat = phong({ vertexColors: true, shininess: 70, specular: 0x6a6450 });
    var stalkMat = phong({ color: 0x8a6a3a, shininess: 40, specular: 0x333333 });
    function eyeStalks(parent, z, y, c) {
      var stalks = [];
      [-1, 1].forEach(function (s) {
        var g = new THREE.Group(); g.position.set(s * 0.05, y, z);
        var m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 4), stalkMat); m.position.y = 0.1; g.add(m);
        var tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), phong({ color: c || 0x2a2018, shininess: 80 })); tip.position.y = 0.2; g.add(tip);
        g.rotation.x = 0.5; g.rotation.z = -s * 0.25; parent.add(g); stalks.push(g);
      });
      return stalks;
    }
    function shellGeo() {
      // a logarithmic spiral surface, banded like a garden snail
      var segU = 54, segV = 10, pos = [], colr = [], idx = [];
      var bandA = new THREE.Color('#7a5532'), bandB = new THREE.Color('#3a2616'), lip = new THREE.Color('#c9b08a');
      for (var i = 0; i <= segU; i++) {
        var u = i / segU, th = u * Math.PI * 2 * 2.6, R = 0.05 + 0.21 * Math.pow(u, 1.25), r = 0.035 + 0.13 * Math.pow(u, 1.2);
        for (var j = 0; j <= segV; j++) {
          var v = j / segV * Math.PI * 2;
          var x = (R + r * Math.cos(v)) * Math.cos(th), y = (R + r * Math.cos(v)) * Math.sin(th), z = r * Math.sin(v) + 0.18 * (1 - u);
          pos.push(z * 0.85, y, x);
          var band = 0.5 + 0.5 * Math.sin(th * 3.0 + v * 0.3);
          var cc = bandA.clone().lerp(bandB, band * 0.8); if (u > 0.96) cc = lip.clone();
          colr.push(cc.r, cc.g, cc.b);
        }
      }
      for (var a = 0; a < segU; a++) for (var b2 = 0; b2 < segV; b2++) { var p = a * (segV + 1) + b2, q = p + segV + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }
    var SHELL = shellGeo(), SLUG_GEO = null, SNAIL_GEO = null;
    var shellMat = phong({ vertexColors: true, shininess: 50, specular: 0x554433, side: THREE.DoubleSide });

    function makeSlug() {
      var root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      var m = new THREE.Mesh(SLUG_GEO || (SLUG_GEO = bodyGeo(0.82, 0.17, '#c08a3e', '#e2c08a', true)), slugMat.clone()); body.add(m);
      var stalks = eyeStalks(body, 0.3, 0.13);
      return { root: root, body: body, mesh: m, stalks: stalks, mats: [m.material] };
    }
    function makeSnail() {
      var root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      var m = new THREE.Mesh(SNAIL_GEO || (SNAIL_GEO = bodyGeo(0.72, 0.13, '#8c8270', '#bcb29a', false)), slugMat.clone()); body.add(m);
      var stalks = eyeStalks(body, 0.27, 0.1);
      var shell = new THREE.Mesh(SHELL, shellMat.clone()); shell.position.set(0, 0.25, -0.06); shell.rotation.set(0, 0, 0); shell.scale.setScalar(1.05);
      root.add(shell);
      return { root: root, body: body, mesh: m, stalks: stalks, shell: shell, mats: [m.material, shell.material] };
    }
    var beetleLegGeo = new THREE.CylinderGeometry(0.014, 0.02, 0.3, 4); beetleLegGeo.translate(0, -0.15, 0);
    // crack veins drawn on a shell in its own colour: uCrack shows them, uHot makes them glow for a moment
    function crackable(mat) {
      var u = { uCrack: { value: 0 }, uHot: { value: 0 } };
      mat.userData.crack = u;
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uCrack = u.uCrack; sh.uniforms.uHot = u.uHot;
        sh.vertexShader = 'varying vec3 vCrk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vCrk = position;');
        sh.fragmentShader = 'uniform float uCrack; uniform float uHot; varying vec3 vCrk;\n' +
          'float ckH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }\n' +
          'float ckN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(ckH(i), ckH(i+vec2(1,0)), f.x), mix(ckH(i+vec2(0,1)), ckH(i+vec2(1,1)), f.x), f.y); }\n' +
          sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' +
            ' vec2 cq = vCrk.xz * 9.0 + vec2(vCrk.y * 4.0, 0.0);\n' +
            ' float crk = max(smoothstep(0.075, 0.0, abs(ckN(cq) - 0.5)), 0.8 * smoothstep(0.05, 0.0, abs(ckN(cq * 2.3 + 7.0) - 0.5)) * step(0.45, ckN(cq * 0.6)));\n' +
            ' crk *= uCrack;\n' +
            ' diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.015, 0.012, 0.01), crk * 0.85);')
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.6, 0.6, 0.15) * crk * uHot;');
      };
      mat.customProgramCacheKey = function () { return 'crackable'; };
      return mat;
    }
    function makeBeetle(scale, boss) {
      scale = scale || 1;
      var root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(scale);
      var shellCol = boss ? 0x56503a : 0x2f4a2a;
      var shellM = crackable(phong({ color: shellCol, shininess: boss ? 40 : 80, specular: boss ? 0x4a3c22 : 0x4f8a50, emissive: 0x000000 }));
      var bellyM = phong({ color: 0x3a2a1c, shininess: 20 });
      var flesh = phong({ color: 0x5a2e18, emissive: 0x000000, shininess: 10 });
      var under = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 7), flesh); under.scale.set(0.92, 0.5, 1.22); under.position.set(0, 0.2, -0.04); body.add(under);
      var belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 6, 0, 6.283, Math.PI / 2, Math.PI / 2), bellyM); belly.scale.set(1, 0.4, 1.3); belly.position.set(0, 0.2, -0.04); body.add(belly);
      // two wing cases with a seam, each its own plate
      var plates = [];
      [-1, 1].forEach(function (s) {
        var g = new THREE.SphereGeometry(0.33, 12, 8, s < 0 ? Math.PI : 0, Math.PI, 0, Math.PI / 2);
        g.scale(0.96, 0.82, 1.32);
        var pl = new THREE.Group(); pl.position.set(s * 0.012, 0.21, -0.06);
        var mm = new THREE.Mesh(g, boss ? crackable(shellM.clone()) : shellM); pl.add(mm); body.add(pl); plates.push({ g: pl, mesh: mm, side: s });
      });
      var pron = new THREE.Group(); pron.position.set(0, 0.22, 0.34); body.add(pron);
      var pm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, 6.283, 0, Math.PI / 2), boss ? crackable(shellM.clone()) : shellM); pm.scale.set(1.15, 0.7, 0.8); pron.add(pm);
      plates.push({ g: pron, mesh: pm, side: 0 });
      var headG = new THREE.Group(); headG.position.set(0, 0.17, 0.52); body.add(headG);
      headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), bellyM));
      var eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.08, 0.03) });
      [-1, 1].forEach(function (s) {
        var e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyeMat); e.position.set(s * 0.075, 0.03, 0.07); headG.add(e);
        var mand = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 4), bellyM); mand.position.set(s * 0.05, -0.03, 0.12); mand.rotation.set(Math.PI / 2, 0, -s * 0.5); headG.add(mand);
        var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.28, 3), bellyM); ant.position.set(s * 0.07, 0.11, 0.1); ant.rotation.set(0.9, 0, -s * 0.5); headG.add(ant);
      });
      var legs = [];
      for (var i = 0; i < 6; i++) {
        var s = i < 3 ? -1 : 1, k = i % 3;
        var lg = new THREE.Mesh(beetleLegGeo, bellyM); lg.position.set(s * 0.22, 0.2, 0.22 - k * 0.24);
        lg.rotation.set(0, 0, s * 1.0); body.add(lg); legs.push({ m: lg, s: s, k: k });
      }
      var thorns = [];
      if (boss) {
        var thornM = phong({ color: 0xc8b682, shininess: 20, specular: 0x222222 });
        for (var t = 0; t < 22; t++) {
          var ang = (t % 11) / 10 * Math.PI - Math.PI / 2, row = t < 11 ? 0 : 1;
          var th = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22 + (t * 7 % 5) * 0.03, 5), thornM);
          var px = Math.sin(ang) * 0.27 * (row ? 0.6 : 0.92), pz = -0.36 + row * 0.42 + Math.cos(ang) * 0.12;
          th.position.set(px, 0.42 - Math.abs(px) * 0.5, pz); th.rotation.set(-0.3, 0, -px * 2.2);
          body.add(th); thorns.push(th);
        }
      }
      return { root: root, body: body, plates: plates, pron: pron, head: headG, legs: legs, eyes: eyeMat, shellMat: shellM, flesh: flesh, under: under, thorns: thorns, mats: [shellM, bellyM, flesh] };
    }

    return {
      group: group, shared: shared, paint: paint, addHerbs: addHerbs, updateHerbs: updateHerbs, herbViews: herbViews,
      makeWitch: makeWitch, makeSlug: makeSlug, makeSnail: makeSnail,
      makeBeetle: function () { return makeBeetle(1, false); },
      makeGrub: function () { return makeBeetle(0.6, false); },
      makeThornback: function () { return makeBeetle(2.7, true); },
      pathMask: pathMask, flies: flyMat
    };
  };
})();
