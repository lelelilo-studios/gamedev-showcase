/*
  Cartridge label: the small corner label every game carries.
  <script src="../../shared/tag.js" data-no="03" data-slug="03-joltphysics" data-tool="JoltPhysics" defer></script>

  Optional, on the <script> tag:   data-position="bl|br|tl|tr" (default bl)
  Optional CSS variables on :root:  --tag-ink, --tag-paper, --tag-line  (so the tag can match the page)
  It lives in a shadow root, so page styles never leak in or out.
*/
(function () {
  var me = document.currentScript;
  if (!me) return;
  try { if (window.self !== window.top) return; } catch (e) { return; } // no label inside the index's live previews
  var no = me.dataset.no || '00';
  var slug = me.dataset.slug || '';
  var tool = (me.dataset.tool || '').replace(/[<>"&]/g, '');
  var pos = me.dataset.position || 'bl';
  var base = new URL('../index.html', me.src).href; // shared/ sits next to index.html
  var KEY = 'gs-tag-folded';

  function folded() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setFolded(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  function mount() {
    var host = document.createElement('div');
    host.setAttribute('data-specimen-tag', '');
    host.style.cssText = 'position:fixed;z-index:90;' /* above page chrome, below the page's own modals and drawers */ +
      (pos.indexOf('t') === 0 ? 'top:12px;' : 'bottom:12px;') + (pos.indexOf('r') === 1 ? 'right:12px;' : 'left:12px;');
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      'nav{--ink:var(--tag-ink,#111);--paper:var(--tag-paper,rgba(246,243,236,.86));--line:var(--tag-line,rgba(0,0,0,.14));' +
      'display:flex;align-items:stretch;font:500 11px/1 ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;letter-spacing:.04em;' +
      'color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:999px;overflow:hidden;' +
      '-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);' +
      'box-shadow:0 1px 0 rgba(255,255,255,.25) inset,0 6px 20px -10px rgba(0,0,0,.35);transition:opacity .25s;opacity:.92}' +
      'nav:hover,nav:focus-within{opacity:1}' +
      'a,button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:8px 11px;white-space:nowrap}' +
      'a:focus-visible,button:focus-visible{outline:2px solid currentColor;outline-offset:-4px;border-radius:999px}' +
      'a:hover,button:hover{background:color-mix(in srgb,var(--ink) 8%,transparent)}' +
      '.no{font-weight:700;padding-right:4px}' +
      '.tool{opacity:.72;padding:0 11px 0 2px;max-width:24ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center}' +
      '.sep{width:1px;background:var(--line);margin:6px 0}' +
      '.dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}' +
      '.f .x{display:none}' +
      '@media (max-width:420px){.tool{display:none}}' +
      '@media print{nav{display:none}}' +
      '</style>' +
      '<nav aria-label="Game Dev Showcase navigation">' +
      '<button class="no" type="button" aria-expanded="true" title="Fold this label"><span class="dot" aria-hidden="true"></span>Cart ' + no + ' / 10</button>' +
      '<span class="tool x" title="' + tool + '">' + tool + '</span>' +
      '<span class="sep x" aria-hidden="true"></span>' +
      '<a class="x" href="' + base + '">Index</a>' +
      '<span class="sep x" aria-hidden="true"></span>' +
      '<a class="x" href="' + base + '#' + slug + '">Recreate ↗</a>' +
      '</nav>';
    var nav = root.querySelector('nav');
    var btn = root.querySelector('button');
    function apply(v) { nav.classList.toggle('f', v); btn.setAttribute('aria-expanded', String(!v)); btn.title = v ? 'Show the cartridge label' : 'Fold this label'; }
    apply(folded());
    btn.addEventListener('click', function () { var v = !nav.classList.contains('f'); apply(v); setFolded(v); });
    document.body.appendChild(host);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
