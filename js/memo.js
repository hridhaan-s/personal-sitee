

(function () {
  "use strict";

  const main = document.getElementById("main");
  const progress = document.getElementById("progress");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let index = null;               
  const postCache = {};
  let tocObserver = null;

  document.getElementById("yr").textContent = new Date().getFullYear();


  

  try {
    const el = document.getElementById("memo-data");
    if (el) {
      const d = JSON.parse(el.textContent);
      index = d.index;
      if (d.post) postCache[d.post.slug] = d.post;
    }
  } catch (e) {  }

  async function getIndex() {
    if (index) return index;
    const r = await fetch("/api/memo?list=1");
    index = r.ok ? await r.json() : { settings: {}, posts: [] };
    return index;
  }

  async function getPost(slug) {
    if (postCache[slug]) return postCache[slug];
    const r = await fetch("/api/memo?post=" + encodeURIComponent(slug));
    if (!r.ok) return null;
    return (postCache[slug] = await r.json());
  }


  

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function parseDate(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
    return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
  }

  function shortDate(d) { const p = parseDate(d); return p ? MONTHS[p.m] + " " + p.d : ""; }
  function longDate(d) { const p = parseDate(d); return p ? MONTHS[p.m] + " " + p.d + ", " + p.y : ""; }

  function clean(html) {
    if (!window.DOMPurify) return "";
    return window.DOMPurify.sanitize(html || "", {
      ADD_ATTR: ["target", "data-width", "data-align", "data-type", "data-checked", "data-emoji", "data-font", "open"],
      ADD_TAGS: ["details", "summary"],
      FORBID_TAGS: ["style", "form", "input", "button"]
    });
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.classList.remove("on"); }, 1600);
  }

  function slugFromPath() {
    const m = /^\/memo\/([^/?#]+)\/?$/.exec(location.pathname);
    return m && m[1] !== "rss.xml" ? decodeURIComponent(m[1]) : "";
  }

  function headingId(text, used) {
    let id = String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    let n = 2, base = id;
    while (used[id]) id = base + "-" + n++;
    used[id] = true;
    return id;
  }

  function highlight(term, text) {
    if (!term) return esc(text);
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + term.length)) + "</mark>" + esc(text.slice(i + term.length));
  }


  

  async function renderList() {
    stopPostExtras();
    const idx = await getIndex();
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    const tag = params.get("tag") || "";

    const allTags = {};
    idx.posts.forEach(function (p) { (p.tags || []).forEach(function (t) { allTags[t] = (allTags[t] || 0) + 1; }); });
    const tagNames = Object.keys(allTags).sort(function (a, b) { return allTags[b] - allTags[a] || a.localeCompare(b); });

    main.innerHTML =
      '<section class="intro prose fade">' + clean(idx.settings && idx.settings.intro || "<p>Notes, logs and half-finished thoughts.</p>") + "</section>" +
      '<div class="tools">' +
        '<label class="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
        '<input id="q" type="search" placeholder="Search memos" aria-label="Search memos" value="' + esc(q) + '" autocomplete="off"><kbd>/</kbd></label>' +
      "</div>" +
      (tagNames.length ? '<div class="tags" role="group" aria-label="Filter by tag">' + tagNames.map(function (t) {
        return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' + (t === tag) + '">#' + esc(t) + "</button>";
      }).join("") + "</div>" : "") +
      '<div id="results"></div>';

    const input = document.getElementById("q");
    input.addEventListener("input", function () { updateQuery({ q: input.value }); drawResults(); });
    main.querySelectorAll("[data-tag]").forEach(function (b) {
      b.addEventListener("click", function () {
        const on = b.getAttribute("aria-pressed") !== "true";
        main.querySelectorAll("[data-tag]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", String(on));
        updateQuery({ tag: on ? b.dataset.tag : "" });
        drawResults();
      });
    });

    drawResults();
    document.title = "Memo — Hridhaan Sahay";
  }

  function updateQuery(changes) {
    const p = new URLSearchParams(location.search);
    Object.keys(changes).forEach(function (k) { if (changes[k]) p.set(k, changes[k]); else p.delete(k); });
    const s = p.toString();
    history.replaceState(history.state, "", "/memo" + (s ? "?" + s : ""));
  }

  function drawResults() {
    const params = new URLSearchParams(location.search);
    const q = (params.get("q") || "").trim();
    const tag = params.get("tag") || "";
    const ql = q.toLowerCase();

    let posts = index.posts.filter(function (p) {
      if (tag && (p.tags || []).indexOf(tag) === -1) return false;
      if (!ql) return true;
      return (p.title + " " + p.excerpt + " " + (p.tags || []).join(" ")).toLowerCase().indexOf(ql) !== -1;
    });

    const out = document.getElementById("results");
    if (!posts.length) {
      out.innerHTML = '<p class="empty">' + (index.posts.length ? "Nothing matches that. Try fewer words?" : "No memos yet. Soon.") + "</p>";
      return;
    }

    const pinned = !q && !tag ? posts.filter(function (p) { return p.pinned; }) : [];
    if (pinned.length) posts = posts.filter(function (p) { return !p.pinned; });

    let html = "";
    if (pinned.length) html += '<h2 class="year">Pinned</h2><ul class="list">' + pinned.map(function (p) { return row(p, q, true); }).join("") + "</ul>";

    const byYear = {};
    posts.forEach(function (p) { const y = (parseDate(p.date) || { y: "Undated" }).y; (byYear[y] = byYear[y] || []).push(p); });
    Object.keys(byYear).sort(function (a, b) { return b - a; }).forEach(function (y) {
      html += '<h2 class="year">' + y + (q || tag ? "<small>" + byYear[y].length + "</small>" : "") + '</h2><ul class="list">' +
        byYear[y].map(function (p) { return row(p, q, false); }).join("") + "</ul>";
    });
    out.innerHTML = html;
  }

  function row(p, q, pinned) {
    return "<li><time datetime=\"" + esc(p.date) + "\">" + (pinned ? longDate(p.date).replace(/, \d+$/, "") : shortDate(p.date)) + "</time><div>" +
      (pinned ? '<span class="pin" aria-label="Pinned">✦</span>' : "") +
      '<a class="t" data-nav href="/memo/' + encodeURIComponent(p.slug) + '">' + highlight(q, p.title) + "</a>" +
      (q && p.excerpt ? '<span class="x">' + highlight(q, p.excerpt) + "</span>" : "") +
      "</div></li>";
  }


  

  async function renderPost(slug) {
    stopPostExtras();
    const post = await getPost(slug);
    if (!post) {
      main.innerHTML = '<a class="back" data-nav href="/memo">← All memos</a><div class="post-head"><h1>This memo doesn\'t exist.</h1></div><p class="muted">Maybe it was renamed, or it\'s still a draft. <a data-nav href="/memo">See everything else</a>.</p>';
      document.title = "Not found — Memo";
      return;
    }

    const idx = await getIndex();
    const list = idx.posts;
    const i = list.findIndex(function (p) { return p.slug === slug; });
    const newer = i > 0 ? list[i - 1] : null;
    const older = i !== -1 && i < list.length - 1 ? list[i + 1] : null;

    const edited = post.updated && post.updated.slice(0, 10) > post.date;

    main.innerHTML =
      '<a class="back" data-nav href="/memo">← All memos</a>' +
      '<article class="fade">' +
        '<header class="post-head"><h1>' + esc(post.title) + "</h1>" +
          '<div class="post-meta"><time datetime="' + esc(post.date) + '">' + longDate(post.date) + "</time>" +
          "<span>· " + post.readMins + " min read</span>" +
          (edited ? '<span title="Last edited ' + esc(longDate(post.updated)) + '">· edited</span>' : "") +
          (post.visibility === "unlisted" ? '<span class="badge" title="Not on the list; only people with the link can see this">unlisted</span>' : "") +
          (post.tags || []).map(function (t) { return '<a class="chip" data-nav href="/blog?tag=' + encodeURIComponent(t) + '">#' + esc(t) + "</a>"; }).join("") +
          "</div></header>" +
        '<div id="toc-slot"></div>' +
        '<div class="prose" id="body">' + clean(post.html) + "</div>" +
        '<div class="post-end">' +
          '<button class="pill" type="button" id="share">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>Copy link</button>' +
          '<a class="pill" href="#top" id="totop">↑ Top</a>' +
        "</div>" +
        ((newer || older) ? '<nav class="pager" aria-label="More memos">' +
          (older ? '<a data-nav href="/memo/' + encodeURIComponent(older.slug) + '"><small>← Older</small><span>' + esc(older.title) + "</span></a>" : "<span></span>") +
          (newer ? '<a class="next" data-nav href="/memo/' + encodeURIComponent(newer.slug) + '"><small>Newer →</small><span>' + esc(newer.title) + "</span></a>" : "") +
        "</nav>" : "") +
      "</article>";

    document.title = post.title + " — Memo";
    enhanceBody(document.getElementById("body"));

    document.getElementById("share").addEventListener("click", function () {
      const url = location.origin + "/memo/" + post.slug;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        navigator.share({ title: post.title, url: url }).catch(function () {});
      } else {
        navigator.clipboard.writeText(url).then(function () { toast("Link copied"); }, function () { toast(url); });
      }
    });
    document.getElementById("totop").addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    startProgress();
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) setTimeout(function () { target.scrollIntoView(); }, 0);
    }
  }

  function enhanceBody(body) {
    
    body.querySelectorAll("a[href]").forEach(function (a) {
      if (/^https?:/i.test(a.getAttribute("href")) && a.host !== location.host) { a.target = "_blank"; a.rel = "noopener"; }
    });

    
    const used = {};
    const heads = Array.prototype.slice.call(body.querySelectorAll("h1, h2, h3"));
    heads.forEach(function (h) {
      h.id = headingId(h.textContent, used);
      const a = document.createElement("a");
      a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#"; a.setAttribute("aria-hidden", "true"); a.tabIndex = -1;
      h.prepend(a);
    });
    if (heads.length >= 3) {
      const top = Math.min.apply(null, heads.map(function (h) { return +h.tagName[1]; }));
      const toc = document.createElement("details");
      toc.className = "toc";
      toc.open = window.innerWidth >= 1240;
      toc.innerHTML = "<summary>In this memo</summary><ol>" + heads.map(function (h) {
        const lvl = +h.tagName[1] - top + 2;
        return '<li class="l' + Math.min(lvl, 3) + '"><a href="#' + h.id + '">' + esc(h.textContent.replace(/^#/, "")) + "</a></li>";
      }).join("") + "</ol>";
      document.getElementById("toc-slot").appendChild(toc);

      if ("IntersectionObserver" in window) {
        const links = {};
        toc.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
        tocObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              toc.querySelectorAll("a.on").forEach(function (x) { x.classList.remove("on"); });
              if (links[en.target.id]) links[en.target.id].classList.add("on");
            }
          });
        }, { rootMargin: "0px 0px -70% 0px" });
        heads.forEach(function (h) { tocObserver.observe(h); });
      }
    }

    
    body.querySelectorAll("pre").forEach(function (pre) {
      const code = pre.querySelector("code") || pre;
      function hl() { if (window.hljs && !code.dataset.highlighted) { try { window.hljs.highlightElement(code); } catch (e) {} } }
      if (window.hljs) hl(); else window.addEventListener("load", hl, { once: true });
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "copy-code"; btn.textContent = "copy";
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = "copied"; setTimeout(function () { btn.textContent = "copy"; }, 1200);
        });
      });
      pre.appendChild(btn);
    });

    
    body.querySelectorAll("img").forEach(function (img) {
      img.loading = "lazy"; img.decoding = "async";
      img.addEventListener("click", function () { zoom(img.currentSrc || img.src, img.alt); });
    });
  }

  function zoom(src, alt) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Image");
    const img = document.createElement("img");
    img.src = src; img.alt = alt || "";
    box.appendChild(img);
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add("on"); });
    function close() {
      box.classList.remove("on");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { box.remove(); }, 200);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    box.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
  }

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    progress.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + "%";
  }
  function startProgress() { progress.hidden = false; onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); }
  function stopPostExtras() {
    progress.hidden = true;
    window.removeEventListener("scroll", onScroll);
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
  }


  

  async function route(push, scroll) {
    
    if (!slugFromPath() && /^#post-/.test(location.hash)) {
      const legacy = { "post-frameworkless-portfolio": "building-this-portfolio-without-frameworks" }[location.hash.slice(1)];
      if (legacy) history.replaceState(null, "", "/memo/" + legacy);
    }
    const slug = slugFromPath();
    if (slug) await renderPost(slug); else await renderList();
    if (scroll !== false && !location.hash) window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a[data-nav]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    if (url.pathname + url.search === location.pathname + location.search) { window.scrollTo(0, 0); return; }
    history.pushState(null, "", url.pathname + url.search + url.hash);
    route(true);
    main.focus({ preventScroll: true });
  });

  window.addEventListener("popstate", function () { route(false); });

  
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      const q = document.getElementById("q");
      if (q) { e.preventDefault(); q.focus(); q.select(); }
    }
  });


  

  document.getElementById("theme").addEventListener("click", function () {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("memo-theme", next); } catch (e) {}
  });


  route(false);
})();
