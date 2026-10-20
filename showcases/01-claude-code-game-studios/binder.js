/* The studio binder: the paperwork Claude Code Game Studios wrote while making Hold the Cold.
   Every document is read from window.BINDER_DOCS (embedded from studio/ by tools/embed-docs.mjs),
   so the page works from disk. Nothing here is typed in by hand that a document already says. */
(function () {
  'use strict';
  var DOCS = window.BINDER_DOCS || {}, FILES = window.BINDER_FILES || [];
  var root = document.getElementById('binder');
  if (!root) return;
  var embedded = false;
  try { embedded = window.self !== window.top; } catch (e) { embedded = true; }
  if (embedded) { root.hidden = true; return; }

  // ---------------------------------------------------------------- a small Markdown renderer
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function inline(t) {
    var codes = [];
    t = esc(t).replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![\w*])/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, a, h) { return '<a href="' + h + '"' + (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : '') + '>' + a + '</a>'; });
    return t.replace(/\u0000(\d+)\u0000/g, function (_, n) { return '<code>' + codes[n] + '</code>'; });
  }
  function checkbox(t) {
    return t.replace(/^\[( |x|\?)\]\s+/i, function (_, c) {
      var k = c === ' ' ? 'open' : c === '?' ? 'deferred' : 'done';
      return '<span class="box box-' + k + '" aria-label="' + (k === 'done' ? 'done' : k === 'open' ? 'not ticked' : 'deferred') + '"></span>';
    });
  }
  var BLOCK = /^(#{1,6}\s|```|>|\||\s*([-*]|\d+\.)\s|---\s*$|\*\*\*\s*$)/;
  var FIELD = /^(\*\*[^*]+\*\*:|[A-Z][A-Za-z ]{2,24}: \S)/;
  function md(src) {
    var lines = src.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n'), out = [], i = 0;
    while (i < lines.length) {
      var L = lines[i];
      if (!L.trim()) { i++; continue; }
      var h = /^(#{1,6})\s+(.*)$/.exec(L);
      if (h) { var n = Math.min(6, h[1].length + 1); out.push('<h' + n + '>' + inline(h[2]) + '</h' + n + '>'); i++; continue; }
      if (/^```/.test(L)) {
        var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if (/^(---|\*\*\*)\s*$/.test(L)) { out.push('<hr>'); i++; continue; }
      if (/^>/.test(L)) {
        var q = [];
        while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
        out.push('<blockquote>' + md(q.join('\n')) + '</blockquote>'); continue;
      }
      if (/^\|/.test(L) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var cells = function (r) { return r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(L), rows = []; i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push('<div class="tbl"><table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s/.test(L)) {
        // a list, nested by indentation
        var html = '', stack = [];
        while (i < lines.length && (/^\s*([-*]|\d+\.)\s/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && stack.length))) {
          var m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
          if (!m) { html = html.replace(/<\/li>$/, ' ' + inline(lines[i].trim()) + '</li>'); i++; continue; }
          var ind = m[1].length, tag = /\d/.test(m[2]) ? 'ol' : 'ul';
          while (stack.length && ind < stack[stack.length - 1].ind) html += '</' + stack.pop().tag + '></li>';
          if (!stack.length || ind > stack[stack.length - 1].ind) {
            if (stack.length) html = html.replace(/<\/li>$/, '');
            stack.push({ ind: ind, tag: tag }); html += '<' + tag + '>';
          }
          html += '<li>' + checkbox(inline(m[3])) + '</li>'; i++;
        }
        while (stack.length) { html += '</' + stack.pop().tag + '>'; if (stack.length) html += '</li>'; }
        out.push(html); continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !(para.length && BLOCK.test(lines[i]))) para.push(lines[i++].trim());
      // a field per line ("**Status**: Complete", "Period: …") keeps its own line; prose joins up
      out.push('<p>' + para.map(function (l, k) { return (k && FIELD.test(l) ? '<br>' : (k ? ' ' : '')) + inline(l); }).join('') + '</p>');
    }
    return out.join('\n');
  }

  // ---------------------------------------------------------------- reading the documents
  function doc(path) { return DOCS['studio/' + path] || ''; }
  function field(src, name) { var m = new RegExp('\\*\\*' + name + '\\*\\*:\\s*(.+)').exec(src); return m ? m[1].trim() : ''; }
  function section(src, heading) {
    var re = new RegExp('^#{1,6}\\s+' + heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*$', 'm'), m = re.exec(src);
    if (!m) return '';
    var rest = src.slice(m.index + m[0].length), next = /^#{1,6}\s/m.exec(rest);
    return next ? rest.slice(0, next.index) : rest;
  }
  function raw(path) { return 'studio/' + path; }
  function filesIn(dir, ext) { return FILES.filter(function (f) { return f.path.indexOf('studio/' + dir) === 0 && (!ext || f.path.slice(-ext.length) === ext); }); }
  function stamp(text, tone, extra) {
    return '<span class="stamp stamp-' + (tone || 'red') + (extra ? ' ' + extra : '') + '" role="img" aria-label="Stamped: ' + esc(text) + '"><span>' + esc(text) + '</span></span>';
  }
  function verdictTone(v) {
    v = (v || '').toUpperCase();
    if (/FAIL|BLOCKED|NOT READY/.test(v)) return 'red';
    if (/NOT ASSESSED|CONCERNS|WITH NOTES|WARNINGS/.test(v)) return 'amber';
    return 'green';
  }
  function label(text) { return '<span class="dymo">' + esc(text) + '</span>'; }

  // ---------------------------------------------------------------- the sections
  var S = [];
  // 01 · how it started
  (function () {
    var y = doc('project.yaml'), start = doc('production/session-logs/2026-10-19-01-start.md');
    var get = function (k) { var m = new RegExp('^\\s*' + k + ':\\s*([^#\\n]+)', 'm').exec(y); return m ? m[1].trim() : '—'; };
    var why = (/^- \*\*Why:\*\*\s*([\s\S]*?)(?=\n- |\n\n|(?![\s\S]))/m.exec(section(start, 'The engine')) || [])[1] || '';
    why = why.replace(/\s+/g, ' ').trim();
    S.push({ id: 'start', no: '01', name: 'Start', html:
      '<div class="sheet form">' +
        '<p class="form-head">Project intake · <code>/start</code> · ' + esc(field(start, 'Date')) + '</p>' +
        '<dl class="form-grid">' +
          '<dt>Starting from</dt><dd>B — a vague idea: <em>night shift at a seed vault during a storm</em></dd>' +
          '<dt>Stage</dt><dd>' + esc(get('stage')) + '</dd>' +
          '<dt>Rigor</dt><dd>' + esc(get('rigor')) + ' <span class="hand">jam speed</span></dd>' +
          '<dt>Review mode</dt><dd>solo <small>(not written: <code>minimal</code> expands to it)</small></dd>' +
          '<dt>Automation</dt><dd>' + esc(get('automation')) + '</dd>' +
          '<dt>Engine</dt><dd><strong>' + esc(get('name')) + '</strong> — the studio expects Godot, Unity or Unreal</dd>' +
        '</dl>' +
        '<p class="note hand">' + esc(why) + '</p>' +
        '<p class="links"><a href="' + raw('production/session-logs/2026-10-19-01-start.md') + '">session log ↗</a> <a href="' + raw('project.yaml') + '">project.yaml ↗</a> ' +
        '<button type="button" class="read" data-doc="production/session-logs/2026-10-19-01-start.md">Read the session</button></p>' +
      '</div>' });
  })();

  // 02 · the three pitches
  (function () {
    var log = doc('production/session-logs/2026-10-19-02-brainstorm.md'), step = section(log, 'Step 1');
    var pitches = [], re = /^\d\.\s+\*\*([^*]+?)\.\*\*\s+([\s\S]*?)(?=^\d\.\s+\*\*|^\*\*Human|\n\n)/gm, m;
    while ((m = re.exec(step))) pitches.push({ title: m[1].trim(), text: m[2].replace(/\s+/g, ' ').trim() });
    var human = (/\*\*Human:\*\*([\s\S]*?)(?=\n\n|$)/.exec(step) || [])[1] || '';
    var chosen = (/\*([^*]+)\*/.exec(human) || [])[1] || (pitches[0] && pitches[0].title);
    var cards = pitches.map(function (p, i) {
      var pick = p.title === chosen;
      var kind = /\(([^)]+)\)\*?\s*$/.exec(p.text);
      return '<article class="bcard pitch' + (pick ? ' chosen' : '') + '">' +
        (pick ? '<svg class="clip" viewBox="0 0 40 90" aria-hidden="true"><path d="M14 80V18a8 8 0 0 1 16 0v52a12 12 0 0 1-24 0V24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' : '') +
        '<p class="card-no">Concept ' + (i + 1) + '</p><h4>' + esc(p.title) + '</h4>' +
        '<p>' + inline(p.text.replace(/\s*\*?\([^)]+\)\*?\s*$/, '')) + '</p>' +
        (kind ? '<p class="kind">' + esc(kind[1]) + '</p>' : '') +
        (pick ? stamp('chosen', 'green', 'tilt') : '') + '</article>';
    }).join('');
    S.push({ id: 'pitches', no: '02', name: 'Pitches', html:
      '<p class="lede">The one creative question <code>/brainstorm</code> asks at <code>minimal</code>: two or three one-line concepts. The human picked one and said why.</p>' +
      '<div class="pitches">' + cards + '</div>' +
      '<p class="why hand">' + inline(human.replace(/\s+/g, ' ').trim()) + '</p>' +
      '<p class="links"><a href="' + raw('production/session-logs/2026-10-19-02-brainstorm.md') + '">brainstorm log ↗</a> <button type="button" class="read" data-doc="production/session-logs/2026-10-19-02-brainstorm.md">Read the session</button></p>' });
  })();

  // 03 · the brief
  S.push({ id: 'brief', no: '03', name: 'Brief', html:
    '<div class="sheet typed brief"><div class="punch" aria-hidden="true"></div>' + md(doc('design/game-brief.md')) +
    '<p class="links"><a href="' + raw('design/game-brief.md') + '">design/game-brief.md ↗</a></p>' + stamp('approved for build', 'blue', 'corner') + '</div>' });

  // 04 · the stories, in build order
  (function () {
    var stories = Object.keys(DOCS).filter(function (p) { return /production\/epics\/[^/]+\/story-\d+/.test(p); }).sort();
    var logs = Object.keys(DOCS).filter(function (p) { return /session-logs\/.*story-0\d\d/.test(p); });
    var cards = stories.map(function (p) {
      var src = DOCS[p], rel = p.replace(/^studio\//, ''), slug = rel.split('/').pop().replace(/\.md$/, '');
      var title = (/^# Story (\d+): (.+)$/m.exec(src) || []);
      var no = title[1], name = title[2];
      var acs = (section(src, 'Acceptance Criteria').match(/^- \[/gm) || []).length;
      var notes = section(src, 'Completion Notes');
      var crit = field(notes, 'Criteria');
      var log = logs.filter(function (l) { return l.indexOf('story-' + no) > -1; })[0] || '';
      var logSrc = DOCS[log] || '';
      var verdict = (/^Verdict: ([A-Z ]+?) —/m.exec(logSrc) || [])[1] || '';
      var run = (/^Run result: (.+)$/m.exec(logSrc) || [])[1] || '';
      var times = (/\*\*Started\*\*: ([^·]+)·\s*\*\*Closed\*\*: ([^·(]+)/.exec(logSrc) || []);
      var shots = filesIn('production/qa/evidence/' + slug + '/', '.webp');
      var status = field(src, 'Status').replace(/^>\s*/, '');
      return '<article class="bcard story carbon" id="card-' + slug + '">' +
        '<header><span class="card-no">Story ' + esc(no) + '</span>' + label(field(src, 'Type')) + '<span class="est">Est. ' + esc(field(src, 'Estimate')) + '</span></header>' +
        '<h4>' + esc(name) + '</h4>' +
        '<p class="meta">' + acs + ' acceptance criteria · ' + esc(crit || status) + (times[1] ? ' · ' + esc(times[1].trim()) + '–' + esc(times[2].trim()) : '') + '</p>' +
        (shots.length ? '<div class="thumbs">' + shots.slice(0, 3).map(function (f) {
          return '<a href="' + f.path + '" class="thumb" target="_blank" rel="noopener"><img src="' + f.path + '" alt="Evidence: ' + esc(f.path.split('/').pop().replace(/\.webp$/, '').replace(/-/g, ' ')) + '" loading="lazy" width="160" height="110"></a>';
        }).join('') + (shots.length > 3 ? '<span class="more">+' + (shots.length - 3) + '</span>' : '') + '</div>' : '<p class="noshot">No screenshot: Config/Data, values only. Balance runs kept as evidence.</p>') +
        (run ? '<p class="run"><b>Run result</b> ' + inline(run.replace(/ — production\/qa\/evidence\/\S+$/, '')) + '</p>' : '') +
        '<footer>' + stamp(verdict || status, verdictTone(verdict || status), 'tilt-' + (+no % 3)) +
        '<span class="links"><button type="button" class="read" data-doc="' + esc(rel) + '">Story</button>' +
        (log ? '<button type="button" class="read" data-doc="' + esc(log.replace(/^studio\//, '')) + '">Dev log</button>' : '') +
        '<a href="' + raw(rel) + '">raw ↗</a></span></footer></article>';
    }).join('');
    S.push({ id: 'stories', no: '04', name: 'Stories', html:
      '<p class="lede"><code>/create-stories</code> turned the brief\'s seven MVP items into seven stories; the playtest added an eighth. Each went through <code>/dev-story</code> then <code>/story-done</code>, and none closed before the game was run, looked at and a screenshot kept.</p>' +
      '<div class="stories">' + cards + '</div>' +
      '<p class="links"><a href="' + raw('production/epics/hold-the-cold/EPIC.md') + '">EPIC.md ↗</a> <button type="button" class="read" data-doc="production/session-logs/2026-10-19-03-create-stories.md">The /create-stories run</button></p>' });
  })();

  // 05 · playtests and bugs
  (function () {
    var reports = Object.keys(DOCS).filter(function (p) { return /qa\/playtests\/playtest-/.test(p); })
      .sort(function (a, b) { return a.replace(/\.md$/, '') < b.replace(/\.md$/, '') ? -1 : 1; });   // the first session, then the retest
    var bugs = Object.keys(DOCS).filter(function (p) { return /qa\/bugs\/BUG-/.test(p); }).sort();
    var frames = filesIn('production/qa/evidence/playtest-', '.webp');
    var bugRows = bugs.map(function (p) {
      var s = DOCS[p];
      return '<li>' + stamp(field(s, 'Status') || 'Open', /Closed|Fixed/.test(field(s, 'Status')) ? 'green' : 'red', 'small') +
        '<span><b>' + esc(field(s, 'ID')) + '</b> · ' + esc(field(s, 'Severity')) + ' · ' + esc(field(s, 'Title')) + '</span> ' +
        '<button type="button" class="read" data-doc="' + esc(p.replace(/^studio\//, '')) + '">Read</button></li>';
    }).join('');
    S.push({ id: 'playtest', no: '05', name: 'Playtest', html:
      '<p class="lede">Real input only: clicks, keys, taps and long-presses, one full night per size, following a written shift plan. <code>/playtest-report analyze</code> then turned the notes into the report.</p>' +
      (frames.length ? '<div class="frames">' + frames.map(function (f) { return '<a href="' + f.path + '" target="_blank" rel="noopener"><img src="' + f.path + '" alt="Playtest frame: ' + esc(f.path.split('/').pop().replace(/\.webp$/, '').replace(/-/g, ' ')) + '" loading="lazy"></a>'; }).join('') + '</div>' : '') +
      reports.map(function (p, n) {
        var r = DOCS[p], info = section(r, 'Session Info'), rel = p.replace(/^studio\//, '');
        var top = section(r, 'Top 3 priorities').replace(/^---\s*$/gm, ''), overall = section(r, 'Overall Assessment');
        return '<div class="sheet typed report"><div class="punch" aria-hidden="true"></div>' +
          '<p class="form-head">Playtest ' + (n + 1) + ' · ' + esc(field(info, 'Date')) + ' · ' + esc(field(info, 'Input Method')) + '</p>' +
          '<h4>' + inline(field(info, 'Session Type')) + '</h4>' +
          '<div class="two"><div><h5>Overall</h5>' + md(overall) + '</div><div><h5>Top priorities</h5>' + md(top) + '</div></div>' +
          '<p class="links"><button type="button" class="read" data-doc="' + esc(rel) + '">Read the full report</button><a href="' + p + '">raw ↗</a></p></div>';
      }).join('') +
      '<p class="links"><button type="button" class="read" data-doc="production/qa/playtests/raw-2026-10-19-scripted-night.md">Raw notes, session 1</button>' +
      '<button type="button" class="read" data-doc="production/qa/playtests/raw-2026-10-19-scripted-night-2.md">Raw notes, session 2</button>' +
      '<a href="studio/tests/playtest/night-plan.py">the shift plan (night-plan.py) ↗</a></p>' +
      (bugRows ? '<h3 class="sub">Bugs filed</h3><ul class="bugs">' + bugRows + '</ul>' : '') });
  })();

  // 06 · gates
  (function () {
    var smoke = Object.keys(DOCS).filter(function (p) { return /qa\/smoke-/.test(p); }).sort();
    var gates = Object.keys(DOCS).filter(function (p) { return /gate-checks\//.test(p); }).sort();
    var all = smoke.concat(gates);
    var stamps = all.map(function (p) {
      var s = DOCS[p], v = (/^#{2,3}\s*Verdict:\s*\**([A-Z ]+?)\**\s*$/m.exec(s) || /Verdict:\s*\**([A-Z][A-Z ]+[A-Z])/.exec(s) || [])[1] || '…';
      var name = /smoke-/.test(p) ? 'Smoke check' : 'Release gate';
      return '<div class="gate">' + stamp(v, verdictTone(v), 'big') + '<p><b>' + name + '</b><br><button type="button" class="read" data-doc="' + esc(p.replace(/^studio\//, '')) + '">Read the report</button> <a href="' + p + '">raw ↗</a></p></div>';
    }).join('');
    S.push({ id: 'gates', no: '06', name: 'Gates', html:
      '<p class="lede">At <code>minimal</code> the release gate asks for two things only: a smoke check that passes, and no open S1 bug. The director panel does not sit in solo mode.</p>' +
      '<div class="gates">' + (stamps || '<p class="empty">No gate has run yet.</p>') + '</div>' });
  })();

  // 07 · retrospective
  (function () {
    var retro = Object.keys(DOCS).filter(function (p) { return /retrospectives\//.test(p); }).sort()[0];
    S.push({ id: 'retro', no: '07', name: 'Retro', html: retro
      ? '<div class="sheet typed retro"><div class="punch" aria-hidden="true"></div>' + md(DOCS[retro]) + '<p class="links"><a href="' + retro + '">raw ↗</a></p></div>'
      : '<p class="empty">No retrospective yet.</p>' });
  })();

  // 08 · every file
  (function () {
    var rows = FILES.map(function (f) {
      var p = f.path.replace(/^studio\//, ''), isDoc = DOCS[f.path] && /\.md$/.test(p);
      return '<li><a href="' + f.path + '">' + esc(p) + '</a> <small>' + (f.bytes < 1024 ? f.bytes + ' B' : (f.bytes / 1024).toFixed(1) + ' KB') + '</small>' +
        (isDoc ? ' <button type="button" class="read" data-doc="' + esc(p) + '">read</button>' : '') + '</li>';
    }).join('');
    S.push({ id: 'files', no: '08', name: 'All files', html:
      '<p class="lede">Everything the studio wrote, as it is on disk, in the layout its skills expect (<code>design/</code>, <code>production/</code>, <code>tests/</code>) under <code>studio/</code>.</p><ul class="files">' + rows + '</ul>' });
  })();

  // ---------------------------------------------------------------- put it together
  var nav = S.map(function (s) { return '<a href="#b-' + s.id + '"><span>' + s.no + '</span>' + esc(s.name) + '</a>'; }).join('');
  root.innerHTML =
    '<div class="folder">' +
      '<header class="folder-head">' +
        '<div class="tab">' + label('Production file · Hold the Cold') + '</div>' +
        '<h2 id="binder-title">The studio binder</h2>' +
        '<p>How <a href="https://github.com/Donchitos/Claude-Code-Game-Studios" target="_blank" rel="noopener">Claude Code Game Studios</a> made this game in its lightest mode: <code>/start</code>, <code>/brainstorm</code>, <code>/create-stories</code>, <code>/dev-story</code> ↔ <code>/story-done</code>, <code>/playtest-report</code>, <code>/gate-check</code>, <code>/retrospective</code>. One builder played the studio and its one human. Every page below is a file it wrote while building, in order.</p>' +
        '<button type="button" class="binder-close" id="binder-close" aria-label="Close the binder">Close</button>' +
      '</header>' +
      '<nav class="folder-tabs" aria-label="Binder sections">' + nav + '</nav>' +
      '<div class="folder-body">' + S.map(function (s) {
        return '<section class="divider" id="b-' + s.id + '" aria-labelledby="h-' + s.id + '"><h3 class="divider-head" id="h-' + s.id + '"><span>' + s.no + '</span>' + esc(s.name) + '</h3>' + s.html + '</section>';
      }).join('') + '</div>' +
    '</div>' +
    '<div class="viewer" id="viewer" hidden role="dialog" aria-modal="true" aria-labelledby="viewer-title"><div class="viewer-sheet sheet typed">' +
      '<header><p id="viewer-title" class="viewer-path"></p><a id="viewer-raw" href="#">raw ↗</a><button type="button" id="viewer-close" aria-label="Close the document">×</button></header>' +
      '<div id="viewer-body"></div></div></div>';

  // ---------------------------------------------------------------- the document viewer
  var viewer = document.getElementById('viewer'), vBody = document.getElementById('viewer-body'), lastFocus = null;
  function openDoc(path) {
    var src = doc(path);
    if (!src) return;
    lastFocus = document.activeElement;
    document.getElementById('viewer-title').textContent = 'studio/' + path;
    document.getElementById('viewer-raw').setAttribute('href', 'studio/' + path);
    vBody.innerHTML = /\.md$/.test(path) ? md(src) : '<pre><code>' + esc(src) + '</code></pre>';
    viewer.hidden = false; viewer.scrollTop = 0; viewer.querySelector('.viewer-sheet').scrollTop = 0;
    document.getElementById('viewer-close').focus();
  }
  function closeDoc() { viewer.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-doc]');
    if (b) { e.preventDefault(); openDoc(b.getAttribute('data-doc')); }
  });
  document.getElementById('viewer-close').addEventListener('click', closeDoc);
  viewer.addEventListener('click', function (e) { if (e.target === viewer) closeDoc(); });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !viewer.hidden) { closeDoc(); e.stopImmediatePropagation(); }
    else if (e.key === 'Escape' && document.documentElement.classList.contains('binder-open')) { closeBinder(); e.stopImmediatePropagation(); }
  }, true);

  // ---------------------------------------------------------------- phones: the binder lives behind a tab
  function openBinder() {
    document.documentElement.classList.add('binder-open');
    root.scrollTop = 0;
    var t = document.getElementById('binder-title'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
  }
  function closeBinder() {
    document.documentElement.classList.remove('binder-open');
    var b = document.querySelector('[data-open-binder]'); if (b) b.focus();
  }
  window.__binder = { open: openBinder, close: closeBinder, openDoc: openDoc, sections: S.map(function (s) { return s.id; }) };
  document.getElementById('binder-close').addEventListener('click', closeBinder);
  var openers = document.querySelectorAll('[data-open-binder]');
  for (var i = 0; i < openers.length; i++) openers[i].addEventListener('click', function (e) {
    if (matchMedia('(max-aspect-ratio: 5/4)').matches) { e.preventDefault(); openBinder(); }
  });
})();
