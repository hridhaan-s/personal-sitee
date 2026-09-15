/* ==========================================================
   main.js — single JS entry point for the site.

   Sections:
     1. Router (SPA)
     2. Navigation (desktop + mobile + theme)
     3. Hero (typewriter + typing loop)
     4. Intro animation
     5. Scroll reveal + smooth scroll
     6. Project card tilt
     7. About annotations (rough-notation)
     8. Blog read mode
     9. Guestbook
    10. Misc helpers
   ========================================================== */

(function () {
  "use strict";

  /* ========================================================
     1. ROUTER (SPA)
     ======================================================== */

  const pages = {
    home: document.getElementById("page-home"),
    achievements: document.getElementById("page-achievements"),
    blog: document.getElementById("page-blog")
  };

  const TITLES = {
    home: "Hridhaan Sahay — Portfolio",
    achievements: "Achievements — Hridhaan Sahay",
    blog: "Blog — Hridhaan Sahay"
  };

  function updateActiveNav(page) {
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.classList.toggle("active", a.dataset.route === page);
    });
  }

  function showPage(page, push) {
    if (push === undefined) push = true;
    if (!pages[page]) page = "home";

    Object.keys(pages).forEach(function (key) {
      if (pages[key]) pages[key].style.display = key === page ? "block" : "none";
    });

    updateActiveNav(page);

    if (push) {
      history.pushState({}, "", page === "home" ? "/" : "/" + page);
    }

    document.title = TITLES[page] || TITLES.home;
  }

  function currentPageFromUrl() {
    return location.pathname.replace(/^\/|\/$/g, "") || "home";
  }

  document.querySelectorAll("[data-route]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      showPage(el.dataset.route);
    });
  });

  window.addEventListener("popstate", function () {
    showPage(currentPageFromUrl(), false);
  });

  showPage(currentPageFromUrl(), false);


  /* ========================================================
     2. NAVIGATION
     ======================================================== */

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark");
    });
  }

  // Mobile nav
  const navToggle = document.querySelector(".nav-toggle");
  const navMobile = document.querySelector(".nav-mobile");

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      const open = navMobile.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    navMobile.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navMobile.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // In-page section links (work from any page)
  document.querySelectorAll("[data-section]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const section = link.dataset.section;

      showPage("home");

      setTimeout(function () {
        const target = document.getElementById(section);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
  });


  /* ========================================================
     3. HERO
     ======================================================== */

  // One-shot tagline typewriter
  const taglineEl = document.getElementById("typewriter");
  const TAGLINE = "Student • Space & Tech Enthusiast";

  if (taglineEl) {
    let i = 0;
    (function typeTagline() {
      if (i < TAGLINE.length) {
        taglineEl.textContent += TAGLINE.charAt(i);
        i++;
        setTimeout(typeTagline, 60);
      }
    })();
  }

  // Looping "I like ..." line
  const PHRASES = [
    "I like exploring space.",
    "I like cybersecurity.",
    "I like writing clean code.",
    "I like building cool projects.",
    "I like competitive programming.",
    "I like learning something new.",
    "I like to build stuff at Hack Club."
  ];

  const typingEl = document.getElementById("typingText");

  if (typingEl) {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeLoop() {
      const phrase = PHRASES[phraseIndex];
      typingEl.textContent = phrase.slice(0, charIndex) || "\u00A0";

      if (!deleting) {
        charIndex++;
        if (charIndex > phrase.length) {
          deleting = true;
          setTimeout(typeLoop, 2000);
          return;
        }
      } else {
        charIndex--;
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % PHRASES.length;
          setTimeout(typeLoop, 500);
          return;
        }
      }

      setTimeout(typeLoop, deleting ? 40 : 80);
    }

    window.addEventListener("load", typeLoop);
  }


  /* ========================================================
     4. INTRO ANIMATION
     ======================================================== */

  window.addEventListener("load", function () {
    const intro = document.getElementById("netflix-intro");
    if (!intro) return;

    setTimeout(function () {
      intro.classList.add("active");
      setTimeout(function () { intro.remove(); }, 1300);
    }, 800);
  });


  /* ========================================================
     5. SCROLL REVEAL + SMOOTH SCROLL
     ======================================================== */

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  });

  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  // Lenis smooth scrolling (loaded from CDN in index.html)
  if (typeof Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });

    (function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    })();
  }


  /* ========================================================
     6. PROJECT CARD 3D TILT
     ======================================================== */

  document.querySelectorAll(".project-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Softer than before: these cards now carry video previews, and a
      // hard tilt blurred the text underneath them.
      const rotateX = (y - 0.5) * 8;
      const rotateY = (0.5 - x) * 8;

      card.style.transform =
        "perspective(900px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) scale(1.02)";
    });

    card.addEventListener("mouseleave", function () {
      card.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
    });
  });


  /* ========================================================
     7. ABOUT ANNOTATIONS (rough-notation)
     ======================================================== */

  function initAnnotations() {
    if (typeof RoughNotation === "undefined") return;

    const yellowEl = document.querySelector("#yellow-highlight");
    const redEl = document.querySelector(".red-underline");
    if (!yellowEl) return;

    // Content-only update: keeps the existing annotation behaviour intact.
    yellowEl.textContent = "Cybersecurity and Technology";

    const yellowDraw = RoughNotation.annotate(yellowEl, {
      type: "highlight",
      color: "rgba(255, 240, 0, 0.6)",
      padding: [2, 4],
      animationDuration: 1000,
      strokeWidth: 2
    });

    const redDraw = redEl
      ? RoughNotation.annotate(redEl, {
          type: "underline",
          color: "#ff4d4d",
          padding: 3,
          strokeWidth: 2.5,
          iterations: 3,
          animationDuration: 800
        })
      : null;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        setTimeout(function () { yellowDraw.show(); }, 500);
        if (redDraw) setTimeout(function () { redDraw.show(); }, 1500);

        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    observer.observe(yellowEl);
  }

  initAnnotations();


  /* ========================================================
     8. BLOG
     Generic: any .blog-card[data-post] opens the .post whose
     id matches. Adding a post needs no JS changes.
     ======================================================== */

  const blogList = document.querySelector(".blog-list");

  function openPost(id) {
    const post = document.getElementById(id);
    if (!post) return;

    document.querySelectorAll("#page-blog .post").forEach(function (p) {
      p.classList.add("hidden");
    });

    if (blogList) blogList.style.display = "none";
    post.classList.remove("hidden");

    if (location.hash !== "#" + id) history.replaceState({}, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "auto" });
    updateReadingProgress();
  }

  function closePost() {
    document.querySelectorAll("#page-blog .post").forEach(function (p) {
      p.classList.add("hidden");
    });

    if (blogList) blogList.style.display = "";
    if (location.hash) history.replaceState({}, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  document.querySelectorAll("#page-blog .blog-card[data-post]").forEach(function (card) {
    card.addEventListener("click", function () {
      openPost(card.dataset.post);
    });

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPost(card.dataset.post);
      }
    });
  });

  document.querySelectorAll("[data-blog-back]").forEach(function (btn) {
    btn.addEventListener("click", closePost);
  });

  // Deep link: /blog#post-something opens that post directly.
  if (location.hash && document.querySelector("#page-blog " + CSS.escape(location.hash))) {
    openPost(location.hash.slice(1));
  }

  // Reading progress bar
  function updateReadingProgress() {
    const post = document.querySelector("#page-blog .post:not(.hidden)");
    if (!post) return;

    const bar = post.querySelector(".post-progress span");
    if (!bar) return;

    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;
    bar.style.width = pct + "%";
  }

  window.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress);


  /* ========================================================
     9. GUESTBOOK (+ gentle auto-scroll)
     ======================================================== */

  const GUESTBOOK_SPEED = 22;   // pixels per second — reading pace
  const RESUME_DELAY = 2200;    // ms to wait after a manual scroll

  function startGuestbookAutoScroll(list) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Needs enough content to be worth scrolling.
    if (list.scrollHeight <= list.clientHeight + 40) return;

    // Duplicate the entries once so the loop is seamless.
    const originalHeight = list.scrollHeight;
    Array.prototype.slice.call(list.children).forEach(function (li) {
      const clone = li.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.clone = "true";
      list.appendChild(clone);
    });

    let position = 0;
    let paused = false;
    let resumeTimer = null;
    let lastApplied = 0;
    let last = null;

    function pause() {
      paused = true;
      clearTimeout(resumeTimer);
    }

    function resume(delay) {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        position = list.scrollTop;
        last = null;
        paused = false;
      }, delay || 0);
    }

    list.addEventListener("mouseenter", pause);
    list.addEventListener("mouseleave", function () { resume(300); });
    list.addEventListener("focusin", pause);
    list.addEventListener("focusout", function () { resume(600); });
    list.addEventListener("touchstart", pause, { passive: true });
    list.addEventListener("touchend", function () { resume(RESUME_DELAY); }, { passive: true });
    list.addEventListener("wheel", function () {
      pause();
      resume(RESUME_DELAY);
    }, { passive: true });

    // If the user drags the scrollbar or uses the keyboard, hand control
    // over to them. Scroll events fire asynchronously, so a simple "am I
    // scrolling right now" flag would be stale by the time this runs —
    // compare against the value we last wrote instead.
    list.addEventListener("scroll", function () {
      if (Math.abs(list.scrollTop - lastApplied) < 2) return;
      pause();
      resume(RESUME_DELAY);
    }, { passive: true });

    function step(now) {
      if (last === null) last = now;
      const delta = (now - last) / 1000;
      last = now;

      if (!paused) {
        position += GUESTBOOK_SPEED * delta;

        if (position >= originalHeight) position -= originalHeight;

        list.scrollTop = position;
        lastApplied = list.scrollTop;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  async function loadGuestbook() {
    const list = document.getElementById("entries");
    if (!list) return;

    try {
      const res = await fetch(
        "https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open&per_page=100"
      );
      const issues = await res.json();

      list.innerHTML = "";

      if (!Array.isArray(issues) || !issues.length) {
        const li = document.createElement("li");
        li.className = "placeholder";
        li.textContent = "No approved notes yet.";
        list.appendChild(li);
        return;
      }

      issues.forEach(function (issue) {
        const li = document.createElement("li");

        const author = document.createElement("strong");
        author.textContent = "@" + issue.user.login;

        const message = document.createElement("p");
        message.textContent = (issue.body || "").replace(/###.*\n/g, "").trim();

        li.appendChild(author);
        li.appendChild(message);
        list.appendChild(li);
      });

      // Wait for layout before measuring heights.
      requestAnimationFrame(function () {
        startGuestbookAutoScroll(list);
      });
    } catch (err) {
      console.error("Guestbook error:", err);
    }
  }

  loadGuestbook();


  /* ========================================================
     10. PROJECT HOVER PREVIEWS
     ======================================================== */

  // Preview clips are heavy, so nothing is fetched until the first
  // hover. preload="none" + a lazy src swap keeps page load clean.
  function initProjectPreviews() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Hover previews make no sense on touch — the cover stays.
    if (!window.matchMedia("(hover: hover)").matches) return;

    document.querySelectorAll(".project-card .pc-preview").forEach(function (video) {
      const card = video.closest(".project-card");

      // Prefer WebM/VP9 where supported, fall back to MP4/H.264.
      // Between the two, every current browser can play one of them.
      const webm = video.dataset.previewWebm;
      const canWebm = webm && video.canPlayType('video/webm; codecs="vp9"');
      const src = canWebm ? webm : video.dataset.preview;

      if (!card || !src) return;

      let loaded = false;

      function play() {
        if (!loaded) {
          video.src = src;
          loaded = true;
        }

        const attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () { /* autoplay blocked */ });
      }

      function stop() {
        card.classList.remove("is-previewing");
        video.pause();
      }

      video.addEventListener("playing", function () {
        card.classList.add("is-previewing");
      });

      video.addEventListener("error", function () {
        card.classList.remove("is-previewing");
      });

      card.addEventListener("mouseenter", play);
      card.addEventListener("focus", play);
      card.addEventListener("mouseleave", stop);
      card.addEventListener("blur", stop);
    });
  }

  initProjectPreviews();


  /* ========================================================
     11. FOOTER — LATEST COMMIT
     ======================================================== */

  function relativeTime(iso) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const units = [
      ["year", 31536000],
      ["month", 2592000],
      ["week", 604800],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60]
    ];

    for (let i = 0; i < units.length; i++) {
      const count = Math.floor(seconds / units[i][1]);
      if (count >= 1) return count + " " + units[i][0] + (count > 1 ? "s" : "") + " ago";
    }

    return "just now";
  }

  async function loadLatestCommit() {
    const badge = document.getElementById("latestCommit");
    if (!badge) return;

    const label = badge.querySelector(".commit-text");

    try {
      const res = await fetch(
        "https://api.github.com/repos/hridhaan-s/personal-sitee/commits?per_page=1"
      );
      if (!res.ok) throw new Error("HTTP " + res.status);

      const commits = await res.json();
      const commit = Array.isArray(commits) ? commits[0] : null;
      if (!commit) throw new Error("no commits");

      const message = (commit.commit.message || "").split("\n")[0];
      const sha = commit.sha.slice(0, 7);
      const when = relativeTime(commit.commit.author.date);

      label.textContent = "";

      const text = document.createElement("span");
      text.textContent = message.length > 46 ? message.slice(0, 46) + "…" : message;

      const hash = document.createElement("span");
      hash.className = "commit-sha";
      hash.textContent = sha;

      const time = document.createElement("span");
      time.className = "commit-time";
      time.textContent = "· " + when;

      label.appendChild(text);
      label.appendChild(hash);
      label.appendChild(time);

      badge.href = commit.html_url;
      badge.title = message;
    } catch (err) {
      // Never leave a loading state on screen.
      label.textContent = "View the source on GitHub";
    }
  }

  loadLatestCommit();


  /* ========================================================
     12. MISC HELPERS
     ======================================================== */

  // If an org logo fails to load, swap in a lettered badge so the
  // layout never shows a broken-image icon.
  document.querySelectorAll("img[data-fallback]").forEach(function (img) {
    img.addEventListener("error", function () {
      const badge = document.createElement("span");
      badge.className = "logo-fallback";
      badge.textContent = img.dataset.fallback;
      badge.setAttribute("aria-label", img.alt || "");
      if (img.parentNode) img.parentNode.replaceChild(badge, img);
    });
  });

  // Tab switcher, kept global for any inline onclick handlers.
  window.showTab = function (tabId, event) {
    document.querySelectorAll(".tab-content").forEach(function (tab) {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.classList.remove("active");
    });

    const target = document.getElementById(tabId);
    if (target) target.classList.add("active");

    if (event && event.target) event.target.classList.add("active");
  };

})();
