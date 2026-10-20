/* The Cartridge Shelf: index behaviour. Data comes from data/showcases.js (window.SHOWCASES). */
(function () {
  'use strict';
  var D = window.SHOWCASES;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var shelves = $('#shelves');
  if (!D || !D.items) {
    shelves.innerHTML = '<p class="empty"><strong>The shelf didn’t load.</strong>data/showcases.js is missing. Run <code>python3 -I scripts/build_data.py</code>.</p>';
    return;
  }
  var items = D.items;
  var TOTAL = String(items.length);
  var cats = D.categories;
  var catById = {}; cats.forEach(function (c, i) { c.index = i + 1; catById[c.id] = c; });
  var bySlug = {}; items.forEach(function (it) { bySlug[it.slug] = it; });
  var state = { cat: 'all', q: '', sort: 'no' };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
  function kstars(n) { if (!n && n !== 0) return ''; return n >= 1000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); }
  function palette(it) { return (it.palette && it.palette.length ? it.palette : ['#5c5a55', '#7d7a72', '#a5a196', '#cfcabd']).slice(0, 6); }
  function bands(pal) { return pal.map(function (c) { return '<i style="background:' + esc(c) + '"></i>'; }).join(''); }
  function needsGpu(it) { return /webgpu/i.test((it.browser_support || '') + ' ' + (it.caveats || []).join(' ')); }
  var ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
  var ICON_KEYS = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10"/></svg>';
  var ICON_TOUCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';
  var GH = 'https://github.com/';

  /* ── hero ── */
  (function kinds() {
    var skills = items.filter(function (it) { return /skill/.test(it.kind); }).length;
    var libs = items.length - skills;
    var gpu = items.filter(needsGpu).length;
    $('#kinds').innerHTML = '<b>' + skills + '</b> agent skill packs · <b>' + libs + '</b> libraries' + (gpu ? ' · <b>' + gpu + '</b> needs WebGPU' : '');
    $('#snap').textContent = D.snapshot;
    if (D.sister) $$('a[href="https://lelelilo-studios.github.io/frontend-showcase/"]').forEach(function (a) { a.href = D.sister; });
  })();
  $('#spines').innerHTML = items.map(function (it) {
    return '<a class="spine" href="' + esc(it.href) + '" aria-label="' + esc('Cartridge ' + it.no + ', ' + it.title + ', built with ' + it.tool + '. Play') + '">' +
      '<span class="sno">' + esc(it.no) + '</span><span class="stitle">' + esc(it.title) + '</span><span class="bands">' + bands(palette(it).slice(0, 4)) + '</span></a>';
  }).join('');

  /* ── chips ── */
  function renderChips() {
    var list = [{ id: 'all', name: 'Whole shelf', n: items.length }].concat(cats.map(function (c) {
      return { id: c.id, name: c.name, n: items.filter(function (it) { return it.category === c.id; }).length };
    }));
    $('#chips').innerHTML = list.map(function (c) {
      return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.name) + '<span class="n">' + c.n + '</span></button>';
    }).join('');
  }
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; renderChips(); render();
    var chip = $('.chip[data-cat="' + state.cat + '"]'); if (chip) chip.focus();
  });

  /* ── cartridges ── */
  function matches(it) {
    if (state.cat !== 'all' && it.category !== state.cat) return false;
    if (!state.q) return true;
    var hay = [it.no, it.tool, it.title, it.tagline, it.why, it.kind, it.category_name, it.repo, it.lib_repo,
      (it.libraries || []).map(function (l) { return l.name; }).join(' '), (it.fonts || []).join(' '),
      (it.controls || []).map(function (c) { return c.action; }).join(' ')].join(' ').toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function controlChips(it) {
    var c = it.controls || [], keys = c.some(function (x) { return x.keys; }), touch = c.some(function (x) { return x.touch; });
    var h = '';
    if (keys) h += '<span>' + ICON_KEYS + 'Keyboard &amp; mouse</span>';
    if (touch) h += '<span>' + ICON_TOUCH + 'Touch</span>';
    return h ? '<div class="ctrl">' + h + '</div>' : '';
  }
  function cart(it) {
    var pal = palette(it);
    var label = 'Cartridge ' + it.no + ', ' + it.title;
    return '<article class="cart" data-slug="' + it.slug + '" style="--c1:' + esc(pal[0]) + '">' +
      '<div class="shell">' +
        '<span class="insert" aria-hidden="true">▾ this end in</span>' +
        '<div class="emboss"><span class="left">Cart ' + esc(it.no) + ' · ' + esc(it.kind) + '</span>' +
          (it.stars ? '<span class="stars" title="GitHub stars ' + esc(it.stars_note || 'on ' + D.snapshot) + '">' + kstars(it.stars) + '</span>' : '') +
          '<span class="pled" aria-hidden="true"></span></div>' +
        '<div class="label">' +
          '<div class="stripe" aria-hidden="true">' + bands(pal) + '</div>' +
          '<figure class="window">' +
            '<img src="' + esc(it.thumb) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' +
            '<span class="ph" aria-hidden="true">' + esc(it.no) + '</span>' +
            '<span class="badge">Attract mode</span>' +
            (needsGpu(it) ? '<span class="needs">Needs WebGPU</span>' : '') +
            '<a class="shot-link" href="' + esc(it.href) + '" tabindex="-1" aria-hidden="true"></a>' +
          '</figure>' +
          '<div class="label-text">' +
            '<span class="cno" aria-hidden="true">' + esc(it.no) + '</span>' +
            '<h3>' + esc(it.title) + '</h3>' +
            '<p class="tool-name">' + esc(it.tool) + '</p>' +
            '<p class="tagline">' + esc(it.tagline || it.why) + '</p>' +
            controlChips(it) +
          '</div>' +
        '</div>' +
        '<div class="actions">' +
          '<a class="btn play card-open" href="' + esc(it.href) + '" aria-label="Play ' + esc(label) + '">' + ICON_PLAY + 'Play</a>' +
          '<button type="button" class="btn molded" data-manual="' + it.slug + '" aria-label="Manual for ' + esc(label) + ': how to recreate it">Manual</button>' +
          (it.ready ? '' : '<span class="pending">in the press</span>') +
        '</div>' +
        '<div class="ridges" aria-hidden="true"></div>' +
      '</div>' +
    '</article>';
  }
  function shelf(id, idx, title, blurb, list) {
    return '<section class="shelf" aria-labelledby="h-' + id + '">' +
      '<div class="shelf-tag"><span class="idx">' + esc(idx) + '</span><h2 id="h-' + id + '">' + esc(title) + '</h2><p>' + esc(blurb) + '</p></div>' +
      '<div class="carts">' + list.map(cart).join('') + '</div></section>';
  }
  function render() {
    unmountPreview();
    var list = items.filter(matches);
    var html = '';
    if (state.sort === 'no') {
      cats.forEach(function (c) {
        var sub = list.filter(function (it) { return it.category === c.id; });
        if (sub.length) html += shelf(c.id, 'Shelf ' + c.index + ' of ' + cats.length, c.name, c.blurb, sub);
      });
    } else {
      var sorted = list.slice().sort(state.sort === 'stars'
        ? function (a, b) { return (b.stars || 0) - (a.stars || 0); }
        : function (a, b) { return a.title.localeCompare(b.title); });
      if (sorted.length) html = shelf('sorted', sorted.length + ' of ' + TOTAL, state.sort === 'stars' ? 'By stars' : 'A to Z',
        state.sort === 'stars' ? 'GitHub stars on ' + D.snapshot + ' (three-piñata’s are from GitHub on 2026-10-19).' : 'Alphabetical by game.', sorted);
    }
    shelves.innerHTML = html;
    var empty = $('#empty');
    if (!list.length) {
      empty.hidden = false;
      empty.innerHTML = '<strong>No cartridge matches “' + esc(state.q) + '”.</strong>Try a tool, a library, a font or a verb like “herd”.<br><button type="button" class="btn" id="clearQ">Clear the search</button>';
      $('#clearQ').addEventListener('click', function () { $('#q').value = ''; state.q = ''; render(); $('#q').focus(); });
    } else empty.hidden = true;
  }

  /* ── search, sort, view ── */
  var qTimer;
  $('#q').addEventListener('input', function (e) { clearTimeout(qTimer); qTimer = setTimeout(function () { state.q = e.target.value.trim(); render(); }, 90); });
  $('#q').addEventListener('keydown', function (e) { if (e.key === 'Escape' && e.target.value) { e.preventDefault(); e.target.value = ''; state.q = ''; render(); } });
  $('#sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  function setView(v) {
    root.dataset.view = v; store.set('gs-view', v);
    $$('.view-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
    render();
  }
  $$('.view-toggle button').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });

  /* ── theme ── */
  var THEMES = ['auto', 'light', 'dark'];
  function applyTheme(t) {
    root.dataset.theme = t;
    $('#themeLabel').textContent = t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Dark';
    $('#themeBtn').setAttribute('aria-label', 'Colour theme: ' + (t === 'auto' ? 'follow the system' : t) + '. Click to change.');
  }
  function cycleTheme() { var t = THEMES[(THEMES.indexOf(root.dataset.theme || 'auto') + 1) % 3]; applyTheme(t); store.set('gs-theme', t); toast('Theme: ' + (t === 'auto' ? 'follow the system' : t)); }
  $('#themeBtn').addEventListener('click', cycleTheme);
  applyTheme(root.dataset.theme || 'auto');

  /* ── live preview: one game at a time, in the cartridge's label window ── */
  var live = null, liveTimer = null;
  function mountPreview(cartEl) {
    if (!canHover || saveData || reduced.matches || root.dataset.view === 'list') return;
    var it = bySlug[cartEl.dataset.slug]; if (!it || !it.ready) return;
    if (live && live.cart === cartEl) return;
    unmountPreview();
    var win = $('.window', cartEl);
    var w = win.clientWidth, h = win.clientHeight;
    var scale = Math.max(w / 1440, h / 900);
    var f = document.createElement('iframe');
    f.src = it.href;
    f.title = 'Attract mode of ' + it.title;
    f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true');
    f.setAttribute('allow', 'autoplay \'none\'');
    f.style.width = '1440px'; f.style.height = Math.ceil(h / scale) + 'px'; f.style.transform = 'scale(' + scale + ')';
    f.addEventListener('load', function () { setTimeout(function () { f.classList.add('ready'); }, 500); });
    win.appendChild(f); cartEl.classList.add('is-live');
    live = { cart: cartEl, frame: f };
  }
  function unmountPreview() {
    clearTimeout(liveTimer);
    if (!live) return;
    var l = live; live = null;
    l.cart.classList.remove('is-live'); l.frame.classList.remove('ready');
    setTimeout(function () { if (l.frame.parentNode) l.frame.remove(); }, 450);
  }
  shelves.addEventListener('pointerover', function (e) {
    var c = e.target.closest('.cart'); if (!c || (live && live.cart === c)) return;
    clearTimeout(liveTimer); liveTimer = setTimeout(function () { mountPreview(c); }, 450);
  });
  shelves.addEventListener('pointerout', function (e) {
    var c = e.target.closest('.cart'); if (!c) return;
    if (e.relatedTarget && c.contains(e.relatedTarget)) return;
    clearTimeout(liveTimer); if (live && live.cart === c) unmountPreview();
  });
  shelves.addEventListener('focusin', function (e) {
    var c = e.target.closest('.cart'); if (!c) return;
    clearTimeout(liveTimer); liveTimer = setTimeout(function () { mountPreview(c); }, 800);
  });
  shelves.addEventListener('focusout', function (e) {
    var c = e.target.closest('.cart'); if (!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
    if (live && live.cart === c) unmountPreview();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) unmountPreview(); });

  /* ── the manual ── */
  var dlg = $('#manual');
  var lastTrigger = null;
  var TABS = [['prompt', 'Prompt'], ['steps', 'Steps'], ['install', 'Install'], ['controls', 'Controls'], ['built', 'Built with'], ['notes', 'Notes'], ['source', 'Source']];
  var loadedFonts = {};
  function loadFont(name) {
    if (loadedFonts[name]) return; loadedFonts[name] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + '&display=swap&text=' + encodeURIComponent('Aa' + name);
    document.head.appendChild(l);
  }
  function pagePrompt(it) {
    return '<p class="lead">The exact brief the builder agent received. Paste it followed by the house rules. The agent also got <a href="docs/BUILD.md">operating instructions</a> about this repo, which cover file paths and playtests, not design.</p>' +
      '<div class="copy-row"><button type="button" class="btn primary" data-copy="full">Copy brief + house rules</button><button type="button" class="btn ghost" data-copy="brief">Copy brief only</button>' +
      '<a class="btn ghost" href="' + esc(it.href) + 'PROMPT.md">PROMPT.md' + ICON_ARROW + '</a></div>' +
      '<pre class="prompt" tabindex="0" aria-label="Prompt">' + esc(it.prompt) + '</pre>' +
      '<details class="rules"><summary>House rules, pasted after the brief</summary><pre class="code" tabindex="0">' + esc(D.house_rules) + '</pre></details>';
  }
  function pageSteps(it) {
    return '<ol class="steps">' + it.steps.map(function (s) { return '<li><span>' + inline(s) + '</span></li>'; }).join('') + '</ol>' +
      '<h3>Same guide as a file</h3><p><a href="' + esc(it.href) + 'TUTORIAL.md">TUTORIAL.md</a> in the game’s folder has the steps, the full prompt, the controls, the install commands and the build notes in one place.</p>';
  }
  function pageInstall(it) {
    return (it.install || []).map(function (c, i) {
      return '<div class="cmd"><div class="cmd-label"><span>' + esc(c.label) + '</span><button type="button" class="mini" data-copy="cmd" data-i="' + i + '">Copy</button></div><pre class="code">' + esc(c.cmd) + '</pre></div>';
    }).join('') +
      (it.skill_repo ? '<p class="note">Read a skill’s SKILL.md before you install it. This collection never ran a skill pack’s installer, hooks or scripts; it read the text and followed it.</p>' : '');
  }
  function pageControls(it) {
    var c = it.controls || [];
    var h = c.length
      ? '<table class="tbl controls"><thead><tr><th>Action</th><th>Keyboard &amp; mouse</th><th>Touch</th></tr></thead><tbody>' +
        c.map(function (x) { return '<tr><td>' + esc(x.action) + '</td><td>' + esc(x.keys || '—') + '</td><td>' + esc(x.touch || '—') + '</td></tr>'; }).join('') + '</tbody></table>'
      : '<p>' + (it.ready ? 'Listed on the game’s own how-to-play card.' : 'Listed once the game is built.') + '</p>';
    h += '<h3>Runs in</h3><p>' + esc(it.browser_support || 'Any modern browser') + '</p>';
    h += '<h3>Test hooks</h3><p>Every game exposes <code>window.__game</code> (<code>seed</code>, <code>state()</code>, <code>start()</code>, <code>step(ms)</code>, <code>input()</code>, <code>snapshot()</code>), and <code>?seed=</code> in the URL replays a run.</p>';
    return h;
  }
  function pageBuilt(it) {
    var h = '';
    if ((it.libraries || []).length) {
      h += '<h3>Libraries</h3><table class="tbl"><thead><tr><th>Name</th><th>Version</th><th>Loaded from</th></tr></thead><tbody>' +
        it.libraries.map(function (l) { return '<tr><td>' + esc(l.name) + '</td><td class="v">' + esc(l.version || '') + '</td><td>' + (l.url ? '<a href="' + esc(l.url) + '">' + esc(l.url) + '</a>' : '—') + '</td></tr>'; }).join('') + '</tbody></table>';
    } else h += '<h3>Libraries</h3><p>' + (it.ready ? 'None. Plain HTML, CSS and JavaScript.' : 'Listed once the game is built.') + '</p>';
    if ((it.fonts || []).length) {
      it.fonts.forEach(loadFont);
      h += '<h3>Type</h3><div class="fonts">' + it.fonts.map(function (f) { return '<div class="font-spec"><span class="aa" style="font-family:\'' + esc(f) + '\', serif">Aa</span><span>' + esc(f) + '</span></div>'; }).join('') + '</div>';
    }
    if ((it.palette || []).length) {
      h += '<h3>Palette</h3><div class="pal">' + it.palette.map(function (c) { return '<button type="button" data-copy="hex" data-hex="' + esc(c) + '" aria-label="Copy ' + esc(c) + '"><i style="background:' + esc(c) + '"></i>' + esc(c) + '</button>'; }).join('') + '</div>';
    }
    if ((it.skill_files_read || []).length) {
      var ref = it.skill_ref || 'main';
      h += '<h3>Skill files the builder read</h3><p class="lead">At commit <code>' + esc(ref.slice(0, 7)) + '</code>.</p><ul class="files">' + it.skill_files_read.map(function (p) {
        return '<li><a href="' + GH + esc(it.skill_repo || it.repo) + '/blob/' + esc(ref) + '/' + esc(p) + '">' + esc(p) + '</a></li>'; }).join('') + '</ul>';
    }
    return h;
  }
  function pageNotes(it) {
    var h = '<h3>What the game shows</h3><p>' + esc(it.summary) + '</p>';
    if ((it.features || []).length) h += '<ul class="plain">' + it.features.map(function (f) { return '<li>' + inline(f) + '</li>'; }).join('') + '</ul>';
    if ((it.lessons || []).length) h += '<h3>Snags worth knowing</h3><ul class="plain">' + it.lessons.map(function (f) { return '<li>' + inline(f) + '</li>'; }).join('') + '</ul>';
    if (it.deviations) h += '<h3>Departures from the brief</h3><p class="note">' + inline(it.deviations) + '</p>';
    h += '<h3>Checks</h3><dl class="facts"><dt>Verified</dt><dd>' + esc(it.checked || 'Pending') + '</dd></dl>';
    return h;
  }
  function pageSource(it) {
    var h = '<p class="lead">' + esc(it.why) + '</p><dl class="facts">' +
      '<dt>Tool</dt><dd>' + esc(it.tool) + '</dd>' +
      '<dt>Kind</dt><dd>' + esc(it.kind) + '</dd>' +
      '<dt>Repository</dt><dd><a href="' + GH + esc(it.repo) + '">' + esc(it.repo) + '</a></dd>' +
      (it.lib_repo ? '<dt>Browser build</dt><dd><a href="' + GH + esc(it.lib_repo) + '">' + esc(it.lib_repo) + '</a></dd>' : '') +
      (it.homepage ? '<dt>Homepage</dt><dd><a href="' + esc(it.homepage) + '">' + esc(it.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></dd>' : '') +
      (it.stars ? '<dt>Stars</dt><dd>' + it.stars.toLocaleString('en') + ' ' + esc(it.stars_note || 'on ' + D.snapshot) + '</dd>' : '') +
      '<dt>Licence</dt><dd>' + esc(it.license) + '</dd></dl>';
    if ((it.caveats || []).length) h += '<h3>Caveats</h3><ul class="plain">' + it.caveats.map(function (c) { return '<li>' + inline(c) + '</li>'; }).join('') + '</ul>';
    return h;
  }
  var PAGES = { prompt: pagePrompt, steps: pageSteps, install: pageInstall, controls: pageControls, built: pageBuilt, notes: pageNotes, source: pageSource };
  var current = null;
  function selectTab(id, focus) {
    $$('.m-tab', dlg).forEach(function (t) { var on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$('.m-page', dlg).forEach(function (p) { p.hidden = p.id !== 'page-' + id; });
    $('#mPages').scrollTop = 0;
  }
  function openManual(slug, trigger) {
    var it = bySlug[slug]; if (!it) return;
    current = it; lastTrigger = trigger || document.activeElement;
    var cat = catById[it.category];
    $('#mBand').innerHTML = bands(palette(it));
    $('#mKicker').textContent = 'Instruction booklet · Cart ' + it.no + ' / ' + TOTAL + ' · ' + cat.name;
    $('#mTitle').textContent = it.title;
    $('#mTool').innerHTML = 'Built with <b>' + esc(it.tool) + '</b> <span class="kind">' + esc(it.kind) + '</span>' + (it.tagline ? '<span class="tl">' + esc(it.tagline) + '</span>' : '');
    $('#mLinks').innerHTML = '<a class="btn primary" href="' + esc(it.href) + '">Play the game' + ICON_ARROW + '</a>' +
      '<a class="btn ghost" href="' + GH + esc(it.repo) + '">' + esc(it.repo) + ICON_ARROW + '</a>' +
      '<a class="btn ghost" href="' + esc(D.repo) + '/tree/main/showcases/' + esc(it.slug) + '">Files on GitHub' + ICON_ARROW + '</a>';
    $('#mTabs').innerHTML = TABS.map(function (t, i) { return '<button type="button" class="m-tab" role="tab" id="tab-' + t[0] + '" data-tab="' + t[0] + '" aria-controls="page-' + t[0] + '"><span class="pg" aria-hidden="true">p.' + (i + 1) + '</span>' + t[1] + '</button>'; }).join('');
    $('#mPages').innerHTML = TABS.map(function (t) { return '<section class="m-page" role="tabpanel" id="page-' + t[0] + '" aria-labelledby="tab-' + t[0] + '" tabindex="0">' + PAGES[t[0]](it) + '</section>'; }).join('');
    selectTab('prompt');
    unmountPreview();
    if (!dlg.open) dlg.showModal();
    $('.m-tab[aria-selected="true"]', dlg).focus();
    if (location.hash !== '#' + slug) history.replaceState(null, '', '#' + slug);
  }
  function closeManual() {
    if (!dlg.open || dlg.classList.contains('closing')) return;
    var done = function () { dlg.classList.remove('closing'); dlg.close(); };
    if (reduced.matches) done(); else { dlg.classList.add('closing'); setTimeout(done, 260); }
    history.replaceState(null, '', location.pathname + location.search);
    var back = lastTrigger && document.contains(lastTrigger) ? lastTrigger : (current && $('[data-manual="' + current.slug + '"]'));
    if (back) setTimeout(function () { back.focus(); }, 280);
  }
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeManual(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeManual(); });
  $('#mClose').addEventListener('click', closeManual);
  $('#mTabs').addEventListener('click', function (e) { var t = e.target.closest('.m-tab'); if (t) selectTab(t.dataset.tab); });
  $('#mTabs').addEventListener('keydown', function (e) {
    if (!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) return;
    e.preventDefault();
    var ids = TABS.map(function (t) { return t[0]; });
    var i = ids.indexOf($('.m-tab[aria-selected="true"]', dlg).dataset.tab);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
    selectTab(ids[i], true);
  });
  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b || !current) return;
    var k = b.dataset.copy, text = '';
    if (k === 'full') text = current.prompt + '\n\n---\n\n' + D.house_rules;
    else if (k === 'brief') text = current.prompt;
    else if (k === 'cmd') text = current.install[+b.dataset.i].cmd;
    else if (k === 'hex') text = b.dataset.hex;
    copy(text, k === 'hex' ? text + ' copied' : k === 'cmd' ? 'Command copied' : 'Prompt copied');
  });
  shelves.addEventListener('click', function (e) {
    var b = e.target.closest('[data-manual]'); if (b) openManual(b.dataset.manual, b);
  });
  function fromHash() {
    var s = decodeURIComponent(location.hash.slice(1));
    if (bySlug[s]) openManual(s, $('[data-manual="' + s + '"]'));
    else if (!s && dlg.open) closeManual();
  }
  window.addEventListener('hashchange', fromHash);

  /* ── copy + toast ── */
  function copy(text, msg) {
    var ok = function () { toast(msg || 'Copied'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;';
      (dlg.open ? dlg : document.body).appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Copy failed: select the text instead'); }
      ta.remove();
    }
  }
  var tTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    if (dlg.open && t.parentNode !== dlg) dlg.appendChild(t); else if (!dlg.open && t.parentNode !== document.body) document.body.appendChild(t);
    clearTimeout(tTimer); tTimer = setTimeout(function () { t.classList.remove('on'); }, 1600);
  }

  /* ── keyboard ── */
  function moveFocus(from, key) {
    var links = $$('.card-open', shelves).filter(function (a) { return a.offsetParent; });
    var i = links.indexOf(from); if (i < 0) return;
    var next = null;
    if (key === 'ArrowRight') next = links[i + 1];
    else if (key === 'ArrowLeft') next = links[i - 1];
    else {
      var r = from.closest('.cart').getBoundingClientRect(), cx = r.left + r.width / 2, best = Infinity;
      links.forEach(function (a) {
        var q = a.closest('.cart').getBoundingClientRect();
        var ok = key === 'ArrowDown' ? q.top >= r.bottom - 4 : q.bottom <= r.top + 4;
        if (!ok) return;
        var d = Math.abs(q.top - r.top) * 4 + Math.abs(q.left + q.width / 2 - cx);
        if (d < best) { best = d; next = a; }
      });
    }
    if (next) { next.focus(); next.closest('.cart').scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' }); }
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
    if (dlg.open || typing) return;
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); $('#q').select(); }
    else if (e.key === 't' || e.key === 'T') cycleTheme();
    else if (/^[mMrR]$/.test(e.key) && t.closest && t.closest('.cart')) { e.preventDefault(); var c = t.closest('.cart'); openManual(c.dataset.slug, $('[data-manual]', c)); }
    else if (/^Arrow/.test(e.key) && t.classList && t.classList.contains('card-open')) { e.preventDefault(); moveFocus(t, e.key); }
  });

  var mqNarrow = window.matchMedia('(max-width: 760px)');
  function placeholder() { $('#q').placeholder = mqNarrow.matches ? 'Search' : 'Search games and tools'; }
  if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', placeholder); placeholder();

  /* ── go ── */
  renderChips();
  setView(root.dataset.view === 'list' ? 'list' : 'grid');
  fromHash();
})();
