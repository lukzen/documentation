/* Landing-page search over every doc page this site links to.
 *
 * This repo is a build-free static GitHub Pages site, so there is no
 * generated index: on first focus the client harvests the landing page's own
 * links (same-origin *.html), fetches each page once, and indexes it in the
 * browser with DOMParser — add a page to the landing and it is searchable,
 * nothing to regenerate. Matching is substring over lower-cased title /
 * headings / body text with field-weighted scoring (title > heading > body).
 * Content pages carry no heading ids, so results deep-link with a text
 * fragment (#:~:text=…) — supporting browsers scroll to and highlight the
 * match; others open the page top. Keyboard: "/" focuses, arrows + Enter
 * navigate, Esc closes.
 */
(function () {
  var input = document.getElementById('docsearch');
  var panel = document.getElementById('docsearch-results');
  if (!input || !panel) return;

  var index = null, loading = null, items = [], sel = -1;

  function harvestUrls() {
    var seen = {}, urls = [];
    var links = document.querySelectorAll('a[href$=".html"]');
    for (var i = 0; i < links.length; i++) {
      var u = new URL(links[i].getAttribute('href'), location.href);
      if (u.origin !== location.origin) continue;
      if (!seen[u.pathname]) { seen[u.pathname] = 1; urls.push(u.pathname); }
    }
    return urls;
  }

  function extract(pathname, htmlText) {
    var doc = new DOMParser().parseFromString(htmlText, 'text/html');
    ['script', 'style', 'noscript'].forEach(function (t) {
      var els = doc.querySelectorAll(t);
      for (var i = 0; i < els.length; i++) els[i].remove();
    });
    var heads = [], hs = doc.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < hs.length; i++) {
      /* bilingual pages nest .lang-en/.lang-es spans in one heading — index
         the EN span alone so results don't show both languages glued together
         (the ES text stays searchable via the body index) */
      var el = hs[i].querySelector('.lang-en') || hs[i];
      var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) heads.push(txt);
    }
    var body = (doc.body ? doc.body.textContent : '')
      .replace(/\s+/g, ' ').trim();
    return {
      url: pathname,
      title: (doc.title || pathname).replace(/\s+/g, ' ').trim(),
      headings: heads,
      text: body,
      _title: (doc.title || pathname).toLowerCase(),
      _headings: heads.map(function (h) { return h.toLowerCase(); }),
      _text: body.toLowerCase()
    };
  }

  function load() {
    if (!loading) {
      loading = Promise.all(harvestUrls().map(function (p) {
        return fetch(p)
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (t) { return t ? extract(p, t) : null; })
          .catch(function () { return null; });
      })).then(function (docs) {
        index = docs.filter(Boolean);
      });
    }
    return loading;
  }

  function countIn(hay, needle) {
    var n = 0, i = hay.indexOf(needle);
    while (i !== -1) { n++; i = hay.indexOf(needle, i + needle.length); }
    return n;
  }

  function search(q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var hits = [];
    index.forEach(function (d) {
      var score = 0, section = null, any = false, allInTitle = true;
      words.forEach(function (w) {
        var t = countIn(d._title, w);
        if (!t) allInTitle = false;
        var h = 0;
        d._headings.forEach(function (hd, i) {
          if (hd.indexOf(w) !== -1) { h++; if (!section) section = d.headings[i]; }
        });
        var b = countIn(d._text, w);
        if (t || h || b) any = true; else score -= 40;
        score += t * 20 + h * 10 + Math.min(b, 10);
      });
      if (!any) return;
      if (allInTitle) score += 30;
      hits.push({ d: d, score: score, section: section, word: words[0] });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, 10);
  }

  function snippet(d, word) {
    var i = d._text.indexOf(word);
    if (i === -1) return '';
    var start = Math.max(0, i - 50);
    return (start ? '…' : '') + d.text.slice(start, i + word.length + 70) + '…';
  }

  function target(h) {
    /* text fragment: highlight the matched section heading, else the first
       query word — unsupported browsers simply ignore the fragment */
    var frag = h.section || h.word;
    return h.d.url + '#:~:text=' + encodeURIComponent(frag);
  }

  function crumb(url) {
    var parts = url.split('/').filter(Boolean);
    parts.pop();
    return parts.join(' › ').replace(/-/g, ' ') || 'home';
  }

  function render(hits, q) {
    panel.textContent = '';
    items = []; sel = -1;
    if (!hits.length) {
      var none = document.createElement('div');
      none.className = 'ds-empty';
      none.textContent = 'No matches for “' + q + '”';
      panel.appendChild(none);
      panel.hidden = false;
      return;
    }
    hits.forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'ds-item';
      a.href = target(h);
      var t = document.createElement('div');
      t.className = 'ds-title';
      t.textContent = h.d.title;
      a.appendChild(t);
      if (h.section) {
        var s = document.createElement('div');
        s.className = 'ds-section';
        s.textContent = '§ ' + h.section;
        a.appendChild(s);
      }
      var c = document.createElement('div');
      c.className = 'ds-crumb';
      c.textContent = crumb(h.d.url);
      a.appendChild(c);
      var sn = snippet(h.d, h.word);
      if (sn) {
        var p = document.createElement('div');
        p.className = 'ds-snippet';
        p.textContent = sn;
        a.appendChild(p);
      }
      panel.appendChild(a);
      items.push(a);
    });
    panel.hidden = false;
  }

  function select(i) {
    if (sel >= 0) items[sel].classList.remove('active');
    sel = i;
    if (sel >= 0) {
      items[sel].classList.add('active');
      items[sel].scrollIntoView({ block: 'nearest' });
    }
  }

  function close() { panel.hidden = true; items = []; sel = -1; }

  var timer = null;
  input.addEventListener('focus', load);
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var q = input.value.trim();
    if (!q) { close(); return; }
    timer = setTimeout(function () {
      load().then(function () { if (index) render(search(q), q); });
    }, 120);
  });
  input.addEventListener('keydown', function (ev) {
    if (panel.hidden) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); select(Math.min(sel + 1, items.length - 1)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); select(Math.max(sel - 1, -1)); }
    else if (ev.key === 'Enter' && sel >= 0) { ev.preventDefault(); items[sel].click(); }
    else if (ev.key === 'Escape') { close(); input.blur(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      ev.preventDefault();
      input.focus();
      input.scrollIntoView({ block: 'center' });
    }
  });
  document.addEventListener('click', function (ev) {
    if (!panel.hidden && !panel.contains(ev.target) && ev.target !== input) close();
  });
})();
