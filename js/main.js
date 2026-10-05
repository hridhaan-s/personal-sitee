/* ==========================================================
   main.js — everything the site does, in reading order.

     1. Router (views + fade)    7. Blog
     2. Theme                    8. Guestbook, latest commit, logo fallback
     3. Clock + Moon             9. Scroll reveal
     4. "I like…"               10. sudo easter egg
     5. Hand-drawn annotations  11. Starfield (astro page)
     6. Archive toggles         12. Gallery lightbox
                                13. Space Finds flipbook
                                14. Name intro
   ========================================================== */

(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ---------- 1. ROUTER ----------
     Every nav item is its own view with a real URL. Home shows all the
     home sections; /about, /experience, /projects and /links show only
     their own; achievements, astrophotography and blog are separate pages.
     Switching fades the view out, swaps, jumps to the top, fades in. */

  const pages = {
    home: document.getElementById("page-home"),
    achievements: document.getElementById("page-achievements"),
    astro: document.getElementById("page-astro"),
    blog: document.getElementById("page-blog")
  };

  const VIEWS = {
    home:             { page: "home", title: "Hridhaan Sahay" },
    about:            { page: "home", sections: ["about"], title: "About" },
    experience:       { page: "home", sections: ["experience", "education"], title: "Experience" },
    projects:         { page: "home", sections: ["projects"], title: "Projects" },
    links:            { page: "home", sections: ["links"], title: "Links" },
    achievements:     { page: "achievements", title: "Achievements" },
    astrophotography: { page: "astro", title: "Astrophotography", night: true },
    blog:             { page: "blog", title: "Blog" }
  };

  // old URLs that should land somewhere sensible
  const ALIASES = { archive: "achievements", "archive.html": "achievements", index: "home", "index.html": "home" };

  const view = document.getElementById("view");
  const homeSections = pages.home ? Array.prototype.slice.call(pages.home.children).filter(function (el) {
    return el.tagName === "SECTION";
  }) : [];

  const OUT_MS = 150;     // fade out
  let currentRoute = null;
  let navToken = 0;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  function routeFromUrl() {
    const seg = location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0].toLowerCase();
    if (!seg) return "home";
    if (VIEWS[seg]) return seg;
    if (ALIASES[seg]) return ALIASES[seg];
    return "home";
  }

  function pathFor(route) { return route === "home" ? "/" : "/" + route; }

  function applyRoute(route) {
    const v = VIEWS[route] || VIEWS.home;
    currentRoute = route;

    Object.keys(pages).forEach(function (k) { if (pages[k]) pages[k].hidden = k !== v.page; });

    // which home sections are visible in this view
    let first = true;
    homeSections.forEach(function (sec) {
      const show = !v.sections || v.sections.indexOf(sec.id) !== -1;
      sec.hidden = !show;
      sec.classList.toggle("view-first", Boolean(v.sections) && show && first);
      if (show) first = false;
    });
    if (pages.home) pages.home.dataset.view = v.sections ? route : "home";

    document.querySelectorAll(".site-nav a[data-route]").forEach(function (a) {
      const on = a.dataset.route === route;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });

    // night palette for the astro page
    const night = Boolean(v.night);
    if (night !== (root.dataset.night === "on")) {
      fadeColours();
      if (night) root.dataset.night = "on"; else delete root.dataset.night;
    }
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.disabled = night;
      toggle.title = night ? "This page is always night" : "";
    }
    if (night) Starfield.start(); else Starfield.stop();

    if (v.page === "blog") closePost();
    document.title = route === "home" ? v.title : v.title + " — Hridhaan Sahay";
    document.dispatchEvent(new CustomEvent("pagechange", { detail: { route: route } }));
  }

  // go(route, { push, after })
  function go(route, opts) {
    opts = opts || {};
    if (!VIEWS[route]) route = "home";
    const push = opts.push !== false;

    if (route === currentRoute && !opts.force) {
      if (push && location.pathname !== pathFor(route)) history.pushState({ route: route }, "", pathFor(route));
      if (opts.after) opts.after();
      else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }

    if (push) history.pushState({ route: route }, "", pathFor(route));
    const token = ++navToken;

    function swap() {
      if (token !== navToken) return;
      applyRoute(route);
      window.scrollTo(0, 0);
      if (opts.after) opts.after();
      if (view) {
        void view.offsetWidth;            // commit the hidden state before fading in
        view.classList.remove("is-out");
      }
    }

    if (reduceMotion || !view) { swap(); return; }
    view.classList.add("is-out");
    setTimeout(swap, OUT_MS);
  }

  document.addEventListener("click", function (e) {
    const el = e.target.closest && e.target.closest("[data-route]");
    if (!el) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(el.dataset.route);
  });

  window.addEventListener("popstate", function () {
    const route = routeFromUrl();
    const hash = location.hash.slice(1);
    go(route, {
      push: false,
      force: route === "blog",
      after: route === "blog" && hash ? function () { openPost(hash, true); } : null
    });
  });

  function fadeColours() {
    if (reduceMotion) return;
    root.classList.add("theme-fade");
    clearTimeout(fadeColours.t);
    fadeColours.t = setTimeout(function () { root.classList.remove("theme-fade"); }, 450);
  }


  /* ---------- 2. THEME ---------- */

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      // colours ease across for a moment, then the class comes off so
      // normal hovers stay snappy
      fadeColours();
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
      document.dispatchEvent(new CustomEvent("themechange"));
    });
  }


  /* ---------- 3. LIVE CLOCK (Greater Noida, IST) ---------- */

  function initClock() {
    const line = document.getElementById("clock");
    const out = document.getElementById("clockTime");
    if (!line || !out) return;

    const fmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true
    });

    function tick() { out.textContent = fmt.format(new Date()).toLowerCase(); }
    tick();
    line.hidden = false;
    setInterval(tick, 15000);
  }


  /* ---------- 3b. TONIGHT'S MOON ----------
     Illumination from the Moon's phase angle (Meeus, ch. 48, low-precision
     terms). Checked against a full ephemeris: within ~0.3% over 2026-27.
     No API, nothing leaves the browser. */

  function moonPhase(date) {
    const rad = Math.PI / 180;
    const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
    const n = function (x) { return ((x % 360) + 360) % 360; };
    const D  = n(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T);  // elongation
    const M  = n(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T);   // Sun anomaly
    const Mp = n(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T);  // Moon anomaly
    const i = 180 - D
      - 6.289 * Math.sin(Mp * rad) + 2.100 * Math.sin(M * rad)
      - 1.274 * Math.sin((2 * D - Mp) * rad) - 0.658 * Math.sin(2 * D * rad)
      - 0.214 * Math.sin(2 * Mp * rad) - 0.110 * Math.sin(D * rad);
    return { lit: (1 + Math.cos(i * rad)) / 2, waxing: D < 180 };
  }

  // "Tonight" means tonight: during the day, look ahead to 9 pm IST.
  function tonight() {
    const now = new Date();
    const istHour = (now.getUTCHours() + 5.5 + now.getUTCMinutes() / 60) % 24;
    if (istHour >= 18 || istHour < 5) return now;
    const t = new Date(now);
    t.setUTCHours(15, 30, 0, 0);   // 21:00 IST
    return t;
  }

  // Lit part of the disc as an SVG path (as seen from the northern sky:
  // waxing = lit on the right).
  function moonPath(lit, waxing) {
    const r = 8.5, cx = 10, top = 10 - r, bottom = 10 + r;
    const tx = Math.abs(1 - 2 * lit) * r;          // terminator half-width
    const limbSweep = waxing ? 1 : 0;              // right or left limb
    const termSweep = (lit > 0.5) === waxing ? 1 : 0;
    return "M" + cx + " " + top +
      " A" + r + " " + r + " 0 0 " + limbSweep + " " + cx + " " + bottom +
      " A" + tx.toFixed(2) + " " + r + " 0 0 " + termSweep + " " + cx + " " + top + "Z";
  }

  function initMoon() {
    const lines = document.querySelectorAll("[data-moon]");
    if (!lines.length) return;

    function update() {
      const m = moonPhase(tonight());
      const pct = Math.round(m.lit * 100);
      let msg;
      if (pct <= 1) msg = "It's a new Moon over Greater Noida tonight. Dark skies, good for deep-sky shots.";
      else if (pct >= 99) msg = "The Moon is full over Greater Noida tonight.";
      else msg = "The Moon is " + pct + "% lit over Greater Noida tonight, " +
        (m.waxing ? "waxing" : "waning") + " " + (pct < 50 ? "crescent" : "gibbous") + ".";
      const d = pct <= 1 ? "" : moonPath(m.lit, m.waxing);
      lines.forEach(function (line) {
        line.querySelector(".moon-text").textContent = msg;
        const lit = line.querySelector(".moon-lit");
        if (lit) lit.setAttribute("d", d);
        line.hidden = false;
      });
    }
    update();
    setInterval(update, 10 * 60 * 1000);
  }


  /* ---------- 4. "I LIKE…" — click to see the next one ---------- */

  const LIKES = [
    "I like exploring space.",
    "I like cybersecurity.",
    "I like writing clean code.",
    "I like building cool projects.",
    "I like competitive programming.",
    "I like learning something new.",
    "I like to build stuff at Hack Club."
  ];

  function initLikes() {
    const text = document.getElementById("likeText");
    const btn = document.getElementById("likeNext");
    if (!text || !btn) return;
    let i = 0;
    btn.addEventListener("click", function () {
      i = (i + 1) % LIKES.length;
      text.textContent = LIKES[i];
    });
  }


  /* ---------- 5. HAND-DRAWN ANNOTATIONS ---------- */

  function initAnnotations() {
    if (typeof RoughNotation === "undefined") return;
    const mark = document.getElementById("aboutHighlight");
    if (!mark) return;

    root.classList.add("has-notation");
    const links = Array.prototype.slice.call(document.querySelectorAll(".intro a[data-notate]"));
    let notes = [];
    let shown = false;

    // Same highlighter stroke in both themes, just a different ink, so the
    // phrase looks the same whichever theme you're in.
    function build(animate) {
      notes.forEach(function (n) { n.remove(); });
      const dark = root.dataset.theme !== "light";
      const underline = dark ? "#f2c14e" : "#c98a00";

      notes = [RoughNotation.annotate(mark, {
        type: "highlight", color: dark ? "rgba(242, 193, 78, .32)" : "rgba(255, 205, 60, .6)",
        animationDuration: 900, multiline: true, animate: animate
      })].concat(links.map(function (a) {
        return RoughNotation.annotate(a, {
          type: "underline", color: underline, padding: 1, strokeWidth: 1.6,
          iterations: 1, animationDuration: 450, animate: animate
        });
      }));
    }

    function redraw() {
      if (!shown) return;
      build(false);
      notes.forEach(function (n) { n.show(); });
    }

    const io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      build(!reduceMotion);
      let delay = 400;
      notes.forEach(function (n, i) {
        setTimeout(function () { n.show(); }, delay);
        delay += i === 0 ? 800 : 300;
      });
      shown = true;
    }, { threshold: 0.6 });
    io.observe(mark);

    // Re-measure whenever the text could have moved: theme, page, webfont
    // swap, or a resize that reflows the paragraph.
    let rt;
    function redrawSoon(ms) { clearTimeout(rt); rt = setTimeout(redraw, ms); }
    document.addEventListener("themechange", function () { redrawSoon(20); });
    document.addEventListener("pagechange", function () { redrawSoon(30); });
    window.addEventListener("resize", function () { redrawSoon(150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { redrawSoon(0); });
  }



  /* ---------- 6. ARCHIVE (inside Achievements) ----------
     The Drive previews only load when someone opens them. */

  document.querySelectorAll(".archive-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const frame = document.getElementById(btn.getAttribute("aria-controls"));
      if (!frame) return;
      const open = btn.getAttribute("aria-expanded") !== "true";
      if (open && !frame.firstChild) {
        const iframe = document.createElement("iframe");
        iframe.src = btn.dataset.src;
        iframe.title = btn.closest(".archive-item").querySelector("h3").textContent;
        iframe.loading = "lazy";
        iframe.allow = "autoplay";
        frame.appendChild(iframe);
      }
      frame.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Hide documents" : "View documents";
    });
  });


  /* ---------- 7. BLOG ---------- */

  const postList = document.getElementById("postList");
  const blogHead = document.getElementById("blogHead");

  function openPost(id, noHistory) {
    const post = document.getElementById(id);
    if (!post || !post.classList.contains("post")) return;
    document.querySelectorAll("#page-blog .post").forEach(function (p) { p.hidden = true; });
    if (postList) postList.hidden = true;
    if (blogHead) blogHead.hidden = true;
    post.hidden = false;
    if (!noHistory) history.replaceState({ route: "blog" }, "", "/blog#" + id);
    window.scrollTo(0, 0);
  }

  function closePost() {
    document.querySelectorAll("#page-blog .post").forEach(function (p) { p.hidden = true; });
    if (postList) postList.hidden = false;
    if (blogHead) blogHead.hidden = false;
  }

  document.querySelectorAll("[data-post]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      openPost(link.dataset.post);
    });
  });

  // the post card on the home page goes straight into the post
  document.querySelectorAll("[data-open-post]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const id = link.dataset.openPost;
      go("blog", { after: function () { openPost(id); } });
    });
  });

  document.querySelectorAll("[data-blog-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closePost();
      history.replaceState({ route: "blog" }, "", "/blog");
      window.scrollTo(0, 0);
    });
  });


  /* ---------- 8. GUESTBOOK, LATEST COMMIT, LOGO FALLBACK ---------- */

  function initialsAvatar(name) {
    const span = document.createElement("span");
    span.className = "gb-avatar is-initials";
    span.setAttribute("aria-hidden", "true");
    const clean = (name || "?").replace(/[^a-z0-9]+/gi, " ").trim();
    const parts = clean.split(" ");
    span.textContent = (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2) || "?").toUpperCase();
    // a stable hue per name, so the same person keeps their colour
    let h = 0;
    for (let i = 0; i < clean.length; i++) h = (h * 31 + clean.charCodeAt(i)) % 360;
    span.style.setProperty("--hue", h);
    return span;
  }

  async function loadGuestbook() {
    const list = document.getElementById("entries");
    if (!list) return;
    try {
      const res = await fetch("https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open&per_page=100");
      const issues = await res.json();
      if (!Array.isArray(issues) || !issues.length) return;
      list.innerHTML = "";
      issues.forEach(function (issue) {
        const login = issue.user && issue.user.login ? issue.user.login : "";
        const li = document.createElement("li");

        // GitHub hands us the avatar with the issue; fall back to initials
        const avatarUrl = issue.user && issue.user.avatar_url
          ? issue.user.avatar_url + (issue.user.avatar_url.indexOf("?") === -1 ? "?" : "&") + "s=80"
          : (login ? "https://github.com/" + encodeURIComponent(login) + ".png?size=80" : "");
        if (avatarUrl) {
          const img = document.createElement("img");
          img.className = "gb-avatar";
          img.src = avatarUrl;
          img.alt = "";
          img.width = 36; img.height = 36;
          img.loading = "lazy";
          img.decoding = "async";
          img.addEventListener("error", function () { img.replaceWith(initialsAvatar(login)); });
          li.appendChild(img);
        } else {
          li.appendChild(initialsAvatar(login));
        }

        const body = document.createElement("div");
        body.className = "gb-body";
        const who = document.createElement("strong");
        who.textContent = login ? "@" + login : "Someone";
        const msg = document.createElement("p");
        msg.textContent = (issue.body || "").replace(/###.*\n/g, "").trim();
        body.appendChild(who);
        body.appendChild(msg);
        li.appendChild(body);
        list.appendChild(li);
      });
      autoScrollGuestbook(list);
    } catch (err) { /* leave the placeholder */ }
  }

  /* Never-ending guestbook: the notes are cloned once and the box drifts
     down at a reading pace, jumping back by exactly one set of notes so
     the loop has no seam. Hover, focus, touch or the wheel pauses it,
     manual scrolling still works, and reduced motion keeps it still. */
  function autoScrollGuestbook(list) {
    if (reduceMotion || list.children.length < 2) return;

    const SPEED = 22;                       // px per second
    const originals = Array.prototype.slice.call(list.children);
    originals.forEach(function (li) {
      const copy = li.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.classList.add("gb-clone");
      const img = copy.querySelector("img.gb-avatar");
      if (img) {
        const login = (copy.querySelector("strong") || {}).textContent || "";
        img.addEventListener("error", function () { img.replaceWith(initialsAvatar(login.replace(/^@/, ""))); });
      }
      list.appendChild(copy);
    });
    list.classList.add("is-looping");
    const firstClone = list.children[originals.length];

    let pos = 0, lastSet = -1, last = 0, hovering = false, resumeAt = 0;

    function period() { return firstClone.offsetTop - originals[0].offsetTop; }

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(64, now - (last || now)) / 1000;
      last = now;
      // only move while the box is shown, the tab is visible and nobody is interacting
      if (document.hidden || !list.offsetParent || hovering || now < resumeAt) return;
      if (list.scrollHeight <= list.clientHeight + 2) return;
      const p = period();
      if (p <= 0) return;
      pos += SPEED * dt;
      if (pos >= p) pos -= p;
      list.scrollTop = pos;
      lastSet = list.scrollTop;
    }

    list.addEventListener("scroll", function () {
      if (Math.abs(list.scrollTop - lastSet) <= 2) return;    // our own move
      // the visitor scrolled: carry on from where they left it
      const p = period();
      pos = list.scrollTop;
      if (p > 0 && pos >= p) { pos -= p; list.scrollTop = pos; }
      lastSet = list.scrollTop;
      resumeAt = performance.now() + 2500;
    }, { passive: true });

    list.addEventListener("mouseenter", function () { hovering = true; });
    list.addEventListener("mouseleave", function () { hovering = false; });
    list.addEventListener("focusin", function () { hovering = true; });
    list.addEventListener("focusout", function () { hovering = false; });
    list.addEventListener("touchstart", function () { resumeAt = performance.now() + 60000; }, { passive: true });
    list.addEventListener("touchend", function () { resumeAt = performance.now() + 2500; }, { passive: true });
    list.addEventListener("wheel", function () { resumeAt = performance.now() + 2500; }, { passive: true });

    requestAnimationFrame(frame);
  }

  async function loadLatestCommit() {
    const link = document.getElementById("latestCommit");
    if (!link) return;
    try {
      const res = await fetch("https://api.github.com/repos/hridhaan-s/personal-sitee/commits?per_page=1");
      if (!res.ok) return;
      const c = (await res.json())[0];
      if (!c) return;
      link.textContent = (c.commit.message || "").split("\n")[0] + " ";
      const sha = document.createElement("span");
      sha.className = "sha";
      sha.textContent = "(" + c.sha.slice(0, 7) + ")";
      link.appendChild(sha);
      link.href = c.html_url;
    } catch (err) { /* keep "View the source on GitHub" */ }
  }

  document.querySelectorAll("img[data-fallback]").forEach(function (img) {
    function swap() {
      const b = document.createElement("span");
      b.className = "logo-fallback";
      b.textContent = img.dataset.fallback;
      if (img.parentNode) img.parentNode.replaceChild(b, img);
    }
    if (img.complete && img.naturalWidth === 0 && img.src) swap();
    else img.addEventListener("error", swap);
  });


  /* ---------- 9. SCROLL REVEAL ----------
     Sections fade up as they arrive; items inside a group follow a beat
     apart. Only switched on when JS runs and motion is welcome, so the
     content is never hidden for anyone else. */

  function initReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    const groups = [
      ".intro > *",
      ".block > :not(.project-grid):not(.astro-teaser):not(.entries):not(.guestbook-box)",
      ".entries > .entry",
      ".project-grid > .card",
      ".sky-grid > .sky",
      ".row-cards > .card",
      ".page-head, .awards > *, .archive > .archive-item, .post-list > .card",
      ".astro-teaser > a, .gallery > .shot, .book > *"
    ];

    const items = [];
    groups.forEach(function (sel) {
      // stagger restarts for each parent
      const seen = new Map();
      document.querySelectorAll(sel).forEach(function (el) {
        const k = seen.get(el.parentNode) || 0;
        seen.set(el.parentNode, k + 1);
        el.style.setProperty("--d", Math.min(k, 6) * 70 + "ms");
        el.classList.add("reveal");
        items.push(el);
      });
    });

    root.classList.add("js-reveal");

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    // the reveal moves text a few px; redraw the hand-drawn marks once it settles
    const intro = document.querySelector(".intro .prose");
    if (intro) intro.addEventListener("transitionend", function () {
      document.dispatchEvent(new CustomEvent("themechange"));
    }, { once: true });
  }


  /* ---------- 10. SUDO ----------
     Type "sudo" anywhere (outside a text field) for a tiny terminal. */

  function initTerminal() {
    const term = document.getElementById("term");
    const out = document.getElementById("termOut");
    const form = document.getElementById("termForm");
    const input = document.getElementById("termIn");
    const close = document.getElementById("termClose");
    if (!term || !out || !form || !input) return;

    let lastFocus = null;
    let buf = "";
    const history = [];
    let hIdx = 0;

    function print(text, cls) {
      const p = document.createElement("p");
      if (cls) p.className = cls;
      p.textContent = text;
      out.appendChild(p);
      out.scrollTop = out.scrollHeight;
    }

    function printLink(label, href) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      a.href = href; a.textContent = label;
      if (!href.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
      p.appendChild(a);
      out.appendChild(p);
    }

    const COMMANDS = {
      help: function () {
        print("whoami     who is this");
        print("projects   things I've built");
        print("contact    say hi");
        print("clear      clear the screen");
        print("exit       close the terminal");
      },
      whoami: function () {
        print("hridhaan sahay");
        print("student · cybersecurity & research · greater noida, delhi ncr");
        print("builds YSWS programmes at Hack Club, founded BitBuzz, shoots the night sky.");
      },
      projects: function () {
        document.querySelectorAll("#projects .project h3").forEach(function (h) {
          print("  " + h.textContent.trim());
        });
        print("more: github.com/hridhaan-s", "dim");
      },
      contact: function () {
        printLink("hi@hridhaan.me", "mailto:hi@hridhaan.me");
        printLink("github.com/hridhaan-s", "https://github.com/hridhaan-s");
        printLink("linkedin.com/in/hridhaan-sahay", "https://www.linkedin.com/in/hridhaan-sahay/");
      },
      clear: function () { out.textContent = ""; },
      exit: function () { hide(); }
    };

    function run(raw) {
      const cmd = raw.trim().toLowerCase();
      print("$ " + raw, "echo");
      if (!cmd) return;
      if (COMMANDS[cmd]) return COMMANDS[cmd]();
      if (cmd.indexOf("sudo") === 0) return print("you're already root here. nice try though.");
      if (cmd.indexOf("rm ") === 0) return print("permission denied: this site has backups.");
      if (cmd === "ls") return print("about  experience  projects  astrophotography  blog");
      print(cmd.split(" ")[0] + ": command not found. try 'help'.");
    }

    function show() {
      if (!term.hidden) return;
      lastFocus = document.activeElement;
      out.textContent = "";
      print("[sudo] access granted. welcome, guest.", "dim");
      print("type 'help' to see what you can do.", "dim");
      term.hidden = false;
      requestAnimationFrame(function () { term.classList.add("is-open"); });
      input.value = "";
      input.focus();
    }

    function hide() {
      term.classList.remove("is-open");
      term.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const v = input.value;
      if (v.trim()) { history.push(v); hIdx = history.length; }
      input.value = "";
      run(v);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp" && hIdx > 0) { hIdx--; input.value = history[hIdx]; e.preventDefault(); }
      else if (e.key === "ArrowDown") {
        hIdx = Math.min(history.length, hIdx + 1);
        input.value = history[hIdx] || "";
        e.preventDefault();
      }
    });

    if (close) close.addEventListener("click", hide);

    document.addEventListener("keydown", function (e) {
      if (!term.hidden) {
        if (e.key === "Escape") hide();
        return;
      }
      const t = e.target;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-4);
      if (buf === "sudo") { buf = ""; e.preventDefault(); show(); }
    });

    try {
      console.log("%cpsst. type sudo anywhere on the page.", "font-family: monospace; color: #f2c14e");
    } catch (err) { /* no console */ }
  }



  /* ---------- 11. STARFIELD (astro page only) ----------
     One fixed canvas. Stars are drawn once into an offscreen layer; each
     frame just copies that layer and redraws a handful of twinkling
     stars, at ~24 fps. Stops when you leave the page or hide the tab,
     and stays still for reduced motion. */

  const Starfield = (function () {
    const canvas = document.getElementById("starfield");
    if (!canvas || !canvas.getContext) return { start: function () {}, stop: function () {} };
    const ctx = canvas.getContext("2d");
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    let stars = [], twinklers = [], w = 0, h = 0, dpr = 1;
    let active = false, raf = 0, last = 0;

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth; h = window.innerHeight;
      [canvas, layer].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.round((w * h) / 2600);
      stars = [];
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() < 0.06 ? 1.3 : Math.random() < 0.35 ? 0.9 : 0.55,
          a: 0.25 + Math.random() * 0.6,
          rgb: t < 0.08 ? "255,214,170" : t < 0.18 ? "190,208,255" : "255,255,255",
          tw: Math.random() < 0.12, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 1.4
        });
      }
      twinklers = stars.filter(function (s) { return s.tw; });

      lctx.clearRect(0, 0, w, h);
      stars.forEach(function (s) { if (!s.tw) dot(lctx, s, s.a); });
      draw(performance.now());
    }

    function dot(c, s, a) {
      c.fillStyle = "rgba(" + s.rgb + "," + a.toFixed(3) + ")";
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layer, 0, 0, w, h);
      const t = now / 1000;
      twinklers.forEach(function (s) {
        const k = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        dot(ctx, s, s.a * k);
      });
    }

    function frame(now) {
      if (!active) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 42) return;           // ~24 fps is plenty for a twinkle
      last = now;
      draw(now);
    }

    function run() {
      cancelAnimationFrame(raf);
      if (!active || reduceMotion || document.hidden) return;
      raf = requestAnimationFrame(frame);
    }

    document.addEventListener("visibilitychange", run);

    let rt;
    window.addEventListener("resize", function () {
      if (!active) return;
      clearTimeout(rt);
      rt = setTimeout(build, 200);
    });

    return {
      start: function () {
        if (active) return;
        active = true;
        canvas.classList.add("is-on");
        build();
        run();
      },
      stop: function () {
        if (!active) return;
        active = false;
        canvas.classList.remove("is-on");
        cancelAnimationFrame(raf);
      }
    };
  })();


  /* ---------- 12. GALLERY LIGHTBOX ----------
     Thumbnails are local WebP files; the viewer loads the full-size
     original from the CDN. Arrow keys / swipe to move, Esc to close. */

  function initLightbox() {
    const box = document.getElementById("lightbox");
    const img = document.getElementById("lbImg");
    const cap = document.getElementById("lbCap");
    const count = document.getElementById("lbCount");
    const links = Array.prototype.slice.call(document.querySelectorAll(".shot-link"));
    if (!box || !img || !links.length) return;

    let index = 0, lastFocus = null;

    function show(i) {
      index = (i + links.length) % links.length;
      const a = links[index];
      const thumb = a.querySelector("img");
      img.classList.add("is-loading");
      img.onload = function () { img.classList.remove("is-loading"); };
      img.src = a.dataset.full;
      img.alt = thumb.alt;
      cap.textContent = thumb.alt;
      count.textContent = (index + 1) + " / " + links.length;
      // warm the neighbours so arrowing feels instant
      [index + 1, index - 1].forEach(function (k) {
        const n = links[(k + links.length) % links.length];
        const pre = new Image();
        pre.src = n.dataset.full;
      });
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.classList.add("no-scroll");
      requestAnimationFrame(function () { box.classList.add("is-open"); });
      document.getElementById("lbClose").focus();
    }

    function close() {
      box.classList.remove("is-open");
      box.hidden = true;
      document.body.classList.remove("no-scroll");
      img.removeAttribute("src");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    links.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // let "open in new tab" work
        e.preventDefault();
        open(i);
      });
    });

    document.getElementById("lbClose").addEventListener("click", close);
    document.getElementById("lbPrev").addEventListener("click", function () { show(index - 1); });
    document.getElementById("lbNext").addEventListener("click", function () { show(index + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
      else if (e.key === "Tab") {
        // keep focus inside the viewer
        const f = Array.prototype.slice.call(box.querySelectorAll("button"));
        const at = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });

    swipe(box, function () { show(index + 1); }, function () { show(index - 1); });
  }

  function swipe(el, onLeft, onRight) {
    let x0 = null, y0 = null;
    el.addEventListener("touchstart", function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) onLeft(); else onRight();
    }, { passive: true });
  }


  /* ---------- 13. SPACE FINDS FLIPBOOK ----------
     pdf.js (cdnjs) renders each page to an image once. Wide screens get
     a two-page spread with the cover on its own; narrow screens get one
     page at a time. A turning leaf does the page-turn. */

  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function initFlipbook() {
    const section = document.getElementById("book");
    const flip = document.getElementById("flip");
    const stage = document.getElementById("flipStage");
    const status = document.getElementById("flipStatus");
    const prevBtn = document.getElementById("flipPrev");
    const nextBtn = document.getElementById("flipNext");
    const countEl = document.getElementById("flipCount");
    const pdfLink = document.getElementById("bookPdf");
    if (!section || !stage || !pdfLink) return;

    const narrowMq = window.matchMedia("(max-width: 640px)");
    let pages = [];          // image URLs, one per page
    let ratio = 842.25 / 595.5;
    let pos = 0;             // spread mode: index of the right-hand page (0 = cover); single mode: page index
    let single = narrowMq.matches;
    let busy = false;
    let started = false;

    // spread mode positions: 0 (cover alone), 2, 4, ... (left = pos-1, right = pos)
    function spreads() {
      const list = [0];
      for (let r = 2; r <= pages.length; r += 2) list.push(r);
      if (pages.length % 2 === 0 && list[list.length - 1] !== pages.length) list.push(pages.length);
      return list;
    }

    function pageImg(i, cls) {
      const d = document.createElement("div");
      d.className = "flip-page " + cls;
      if (i >= 0 && i < pages.length) {
        const im = document.createElement("img");
        im.src = pages[i];
        im.alt = "Space Finds, page " + (i + 1);
        im.draggable = false;
        d.appendChild(im);
      } else {
        d.classList.add("is-blank");
      }
      return d;
    }

    function render() {
      stage.innerHTML = "";
      stage.classList.toggle("is-single", single);
      stage.style.setProperty("--ratio", ratio);
      if (single) {
        stage.appendChild(pageImg(pos, "is-right"));
      } else {
        stage.appendChild(pageImg(pos - 1, "is-left"));
        stage.appendChild(pageImg(pos, "is-right"));
      }
      updateControls();
    }

    function label() {
      if (single || pos === 0) return "Page " + (pos + 1) + " of " + pages.length;
      if (pos >= pages.length) return "Page " + pages.length + " of " + pages.length;
      return "Pages " + pos + "–" + (pos + 1) + " of " + pages.length;
    }

    function canPrev() { return pos > 0; }
    function canNext() { return single ? pos < pages.length - 1 : pos + 1 < pages.length; }

    function updateControls() {
      prevBtn.disabled = !canPrev() || busy;
      nextBtn.disabled = !canNext() || busy;
      countEl.textContent = label();
    }

    function turn(dir) {
      if (busy || !pages.length) return;
      if (dir > 0 && !canNext()) return;
      if (dir < 0 && !canPrev()) return;

      const from = pos;
      const to = single ? pos + dir : pos + dir * 2;

      if (reduceMotion) { pos = to; render(); return; }
      busy = true;
      updateControls();

      // The leaf: front shows the page being turned, back shows the page
      // that lands on the other side. Under it, the destination is ready.
      const leaf = document.createElement("div");
      leaf.className = "flip-leaf " + (single ? "is-single-leaf" : dir > 0 ? "is-next" : "is-prev");
      let front, back;

      stage.innerHTML = "";
      if (single) {
        if (dir > 0) {
          stage.appendChild(pageImg(to, "is-right"));       // next page underneath
          front = pageImg(from, "leaf-front"); back = pageImg(-1, "leaf-back");
        } else {
          stage.appendChild(pageImg(from, "is-right"));     // current underneath
          front = pageImg(to, "leaf-front"); back = pageImg(-1, "leaf-back");
          leaf.classList.add("is-coming-back");
        }
      } else if (dir > 0) {
        stage.appendChild(pageImg(from - 1, "is-left"));    // stays until the leaf lands
        stage.appendChild(pageImg(to, "is-right"));
        front = pageImg(from, "leaf-front"); back = pageImg(to - 1, "leaf-back");
      } else {
        stage.appendChild(pageImg(to - 1, "is-left"));
        stage.appendChild(pageImg(from, "is-right"));
        front = pageImg(from - 1, "leaf-front"); back = pageImg(to, "leaf-back");
      }
      leaf.appendChild(front);
      leaf.appendChild(back);
      stage.appendChild(leaf);

      void leaf.offsetWidth;
      leaf.classList.add("is-turning");

      let done = false;
      function finish() {
        if (done) return;
        done = true;
        pos = to; busy = false; render();
      }
      leaf.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 900);   // safety net
    }

    prevBtn.addEventListener("click", function () { turn(-1); });
    nextBtn.addEventListener("click", function () { turn(1); });

    flip.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
    });
    // arrow keys also work while the book is on screen and nothing else wants them
    document.addEventListener("keydown", function (e) {
      if (currentRoute !== "astrophotography" || e.target === flip) return;
      const lb = document.getElementById("lightbox");
      const term = document.getElementById("term");
      if ((lb && !lb.hidden) || (term && !term.hidden)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const r = flip.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.key === "ArrowRight") { e.preventDefault(); turn(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); }
    });
    swipe(flip, function () { turn(1); }, function () { turn(-1); });

    function onModeChange() {
      const was = single;
      single = narrowMq.matches;
      if (was === single || !pages.length) return;
      // keep roughly the same place in the book
      if (single) pos = Math.max(0, Math.min(pages.length - 1, pos === 0 ? 0 : pos - 1));
      else pos = pos === 0 ? 0 : Math.min(spreads()[spreads().length - 1], pos % 2 === 0 ? pos : pos + 1);
      render();
    }
    if (narrowMq.addEventListener) narrowMq.addEventListener("change", onModeChange);
    else narrowMq.addListener(onModeChange);

    function fail() {
      status.innerHTML = "";
      status.append("The book couldn't load here. ");
      const a = document.createElement("a");
      a.href = pdfLink.href; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Open the PDF instead";
      status.appendChild(a);
      status.append(".");
    }

    async function load() {
      if (started) return;
      started = true;
      try {
        if (!window.pdfjsLib) await loadScript(PDFJS + "pdf.min.js");
        const lib = window.pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        const doc = await lib.getDocument({ url: pdfLink.href }).promise;

        const first = await doc.getPage(1);
        const vp1 = first.getViewport({ scale: 1 });
        ratio = vp1.height / vp1.width;

        // render size: a page is at most ~360 css px wide; 2x for sharp text
        const targetW = Math.min(1100, Math.round(380 * Math.min(window.devicePixelRatio || 1, 2) * 1.4));
        for (let i = 1; i <= doc.numPages; i++) {
          status.textContent = "Loading the book… page " + i + " of " + doc.numPages;
          const page = i === 1 ? first : await doc.getPage(i);
          const vp0 = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: targetW / vp0.width });
          const c = document.createElement("canvas");
          c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
          pages.push(c.toDataURL("image/jpeg", 0.88));
          page.cleanup();
          if (i === 1) { pos = 0; render(); }   // show the cover as soon as it's ready
          else updateControls();
        }
        doc.destroy();
      } catch (err) {
        if (!pages.length) fail();
      }
    }

    // only fetch the PDF (~8 MB) once the book is near the screen
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); }
      }, { rootMargin: "400px 0px" });
      io.observe(section);
    } else {
      load();
    }
  }


  /* ---------- 14. SPLASH ----------
     First load of a session only (the <head> script decides, before
     paint). HRIDHAAN / SAHAY decode out of random glyphs, a gold line
     draws through the middle, then the sky splits open top and bottom.
     ~1.4s; any click, key, scroll or touch skips to the split. Never
     runs with reduced motion. */

  function playIntro(done) {
    const box = document.getElementById("splash");
    if (!root.classList.contains("intro-on") || !box) {
      if (box) box.remove();
      done();
      return;
    }
    try { sessionStorage.setItem("introSeen", "1"); } catch (e) { /* private mode */ }

    // the starfield, painted once and shared by both halves so the sky
    // lines up perfectly at the seam
    try {
      const c = document.createElement("canvas");
      const w = window.innerWidth, h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const x = c.getContext("2d");
      x.scale(dpr, dpr);
      const n = Math.round((w * h) / 2200);
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        x.fillStyle = (t < 0.08 ? "rgba(255,214,170," : t < 0.18 ? "rgba(190,208,255," : "rgba(255,255,255,") +
          (0.25 + Math.random() * 0.65).toFixed(2) + ")";
        x.beginPath();
        x.arc(Math.random() * w, Math.random() * h, Math.random() < 0.06 ? 1.3 : Math.random() < 0.35 ? 0.85 : 0.5, 0, Math.PI * 2);
        x.fill();
      }
      box.style.setProperty("--splash-stars", "url(" + c.toDataURL("image/png") + ")");
    } catch (e) { /* plain night background is fine */ }

    const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*<>/\\=+";
    const cells = [];

    // each letter scrambles, then locks in; the two words lock left to
    // right on slightly different rhythms so they finish together
    box.querySelectorAll(".splash-word").forEach(function (word, w) {
      const letters = word.dataset.word.split("");
      word.textContent = "";
      letters.forEach(function (ch, i) {
        const span = document.createElement("span");
        span.className = "sc is-blank";
        span.textContent = ch;
        word.appendChild(span);
        cells.push({
          el: span,
          ch: ch,
          start: 40 + i * 18 + w * 40,
          lock: w === 0 ? 150 + i * 48 : 210 + i * 66,
          set: false
        });
      });
    });

    const t0 = performance.now();
    let opened = false, finished = false, raf = 0, lastTick = 0;

    function tick(now) {
      const t = now - t0;
      let pending = false;
      if (now - lastTick >= 45) {
        lastTick = now;
        cells.forEach(function (c) {
          if (c.set || t < c.start) { if (!c.set) pending = true; return; }
          if (t >= c.lock) {
            c.set = true;
            c.el.textContent = c.ch;
            c.el.className = "sc is-set";
          } else {
            c.el.classList.remove("is-blank");
            c.el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            pending = true;
          }
        });
      } else {
        pending = cells.some(function (c) { return !c.set; });
      }
      if (pending && !opened) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function open() {
      if (opened) return;
      opened = true;
      cancelAnimationFrame(raf);
      cells.forEach(function (c) {
        if (c.set) return;                 // already locked: leave it alone
        c.set = true;
        c.el.textContent = c.ch;
        c.el.className = "sc is-set";
      });
      root.classList.add("intro-out");
      setTimeout(finish, 600);
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(autoOpen);
      ["click", "keydown", "wheel", "touchstart"].forEach(function (ev) {
        window.removeEventListener(ev, skip, true);
      });
      root.classList.remove("intro-on", "intro-out");
      box.remove();
      done();
    }

    function skip() { open(); }
    ["click", "keydown", "wheel", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, skip, { capture: true, passive: true });
    });

    // locks finish ~0.5s, the line ~0.8s; a short beat, then split
    const autoOpen = setTimeout(open, 860);
  }


  /* ---------- boot ---------- */

  const startRoute = routeFromUrl();
  // /archive (or anything unknown) gets its URL corrected without a reload
  if (location.pathname !== pathFor(startRoute) && !(startRoute === "blog" && location.pathname.replace(/\/+$/, "") === "/blog")) {
    history.replaceState({ route: startRoute }, "", pathFor(startRoute) + (startRoute === "blog" ? location.hash : ""));
  }
  applyRoute(startRoute);
  if (startRoute === "blog" && location.hash) {
    openPost(location.hash.slice(1), true);
  }
  window.scrollTo(0, 0);

  initClock();
  initMoon();
  initLikes();
  initTerminal();
  initLightbox();
  initFlipbook();
  loadGuestbook();
  loadLatestCommit();

  // scroll reveal and the hand-drawn marks wait for the intro, so they
  // play where people can see them
  playIntro(function () {
    initReveal();
    // rough-notation loads with defer just before this file; wait for the window
    if (document.readyState === "complete") initAnnotations();
    else window.addEventListener("load", initAnnotations);
  });

})();
