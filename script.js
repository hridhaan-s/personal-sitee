/* ===============================
   PAGE ROUTING (SPA)
================================ */

const home = document.getElementById("page-home");
const achievements = document.getElementById("page-achievements");
const blog = document.getElementById("page-blog");

function updateActiveNav(page) {
  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === page);
  });
}

function showPage(page, push = true) {
  home.style.display = "none";
  achievements.style.display = "none";
  blog.style.display = "none";

  if (page === "achievements") achievements.style.display = "block";
  else if (page === "blog") blog.style.display = "block";
  else home.style.display = "block";

  updateActiveNav(page);

  if (push) {
    history.pushState({}, "", page === "home" ? "/" : "/" + page);
  }

  document.title =
    page === "achievements" ? "Achievements — Hridhaan Sahay" :
    page === "blog" ? "Blog — Hridhaan Sahay" :
    "Hridhaan Sahay — Portfolio";
}

document.querySelectorAll("[data-route]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showPage(el.dataset.route);
  });
});

window.addEventListener("popstate", () => {
  const path = location.pathname.replace(/^\/+|\/+$/g, "");
  if (path === "achievements") showPage("achievements", false);
  else if (path === "blog" || path.startsWith("blog/")) showPage("blog", false);
  else showPage("home", false);
  if (path.startsWith("blog/")) loadMarkdownPost(path.slice(5));
});

const initialPath = location.pathname.replace(/^\/+|\/+$/g, "");
if (initialPath === "achievements") showPage("achievements", false);
else if (initialPath === "blog" || initialPath.startsWith("blog/")) showPage("blog", false);
else showPage("home", false);

/* ===============================
   MARKDOWN BLOG
================================ */

async function getBlogPosts() {
  const response = await fetch("/posts/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load blog index");
  return response.json();
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function loadMarkdownRenderer() {
  return new Promise((resolve, reject) => {
    if (window.marked) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function formatBlogDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long", year: "numeric"
  });
}

async function renderBlogIndex() {
  const list = document.querySelector("#page-blog .blog-list");
  if (!list) return;

  try {
    const posts = await getBlogPosts();
    list.innerHTML = posts.map(post => `
      <article class="blog-card" data-post="${escapeHtml(post.slug)}">
        <h3>${escapeHtml(post.title)}</h3>
        <span class="blog-meta">${escapeHtml(formatBlogDate(post.date))} · ${escapeHtml(post.readTime)}</span>
        <p>${escapeHtml(post.excerpt)}</p>
        <a class="read-btn" href="/blog/${encodeURIComponent(post.slug)}">Read →</a>
      </article>
    `).join("") || '<p class="blog-empty">No posts published yet.</p>';
  } catch (error) {
    console.error("Blog index error:", error);
    list.innerHTML = '<p class="blog-empty">Unable to load posts right now.</p>';
  }
}

async function loadMarkdownPost(slug) {
  if (!slug) return renderBlogIndex();

  const wrap = document.querySelector("#page-blog .blog-wrap");
  if (!wrap) return;

  try {
    const posts = await getBlogPosts();
    const post = posts.find(item => item.slug === slug);
    if (!post) {
      wrap.innerHTML = '<article class="blog-post"><h2>Post not found</h2><p>The post you are looking for does not exist.</p><a class="back-btn" href="/blog">← Back to Blog</a></article>';
      return;
    }

    await loadMarkdownRenderer();
    const response = await fetch(`/posts/${encodeURIComponent(post.file)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load post");
    let markdown = await response.text();
    markdown = markdown.replace(/^---[\s\S]*?---\s*/, "");

    wrap.innerHTML = `
      <article class="blog-post">
        <a class="back-btn" href="/blog">← Back to Blog</a>
        <h2>${escapeHtml(post.title)}</h2>
        <span class="blog-meta">${escapeHtml(formatBlogDate(post.date))} · ${escapeHtml(post.readTime)}</span>
        <div class="blog-content">${marked.parse(markdown)}</div>
      </article>
    `;

    document.title = `${post.title} — Hridhaan Sahay`;
  } catch (error) {
    console.error("Blog post error:", error);
    wrap.innerHTML = '<article class="blog-post"><h2>Could not load this post</h2><a class="back-btn" href="/blog">← Back to Blog</a></article>';
  }
}

if (initialPath === "blog") renderBlogIndex();
if (initialPath.startsWith("blog/")) loadMarkdownPost(initialPath.slice(5));

/* ===============================
   SECTION SCROLL
================================ */

document.querySelectorAll("[data-section]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const section = link.dataset.section;
    showPage("home");
    setTimeout(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  });
});

/* ===============================
   MOBILE NAV
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navMobile = document.querySelector(".nav-mobile");
  if (!navToggle || !navMobile) return;

  navToggle.addEventListener("click", e => {
    e.stopPropagation();
    navMobile.classList.toggle("open");
  });

  navMobile.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navMobile.classList.remove("open"));
  });
});

/* ===============================
   PROJECT CARD 3D TILT + CLICK
================================ */

document.querySelectorAll(".project-card").forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * 18;
    const rotateY = (0.5 - x) * 18;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
  });

  card.addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const projectLink = card.querySelector(".project-links a");
    if (projectLink) window.open(projectLink.href, "_blank", "noopener,noreferrer");
  });

  card.style.cursor = "pointer";
});

/* ===============================
   HERO TYPING LOOP
================================ */

const phrases = [
  "I like exploring space.",
  "I like writing clean code.",
  "I like building cool projects.",
  "I like competitive programming.",
  "I like learning something new."
];

const textEl = document.getElementById("typingText");
let phraseIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  if (!textEl) return;
  const phrase = phrases[phraseIndex];
  textEl.textContent = phrase.slice(0, charIndex) || "\u00A0";

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
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(typeLoop, 500);
      return;
    }
  }
  setTimeout(typeLoop, deleting ? 40 : 80);
}

window.addEventListener("load", typeLoop);

/* ===============================
   NETFLIX INTRO
================================ */

window.addEventListener("load", () => {
  const intro = document.getElementById("netflix-intro");
  if (!intro) return;
  setTimeout(() => {
    intro.classList.add("active");
    setTimeout(() => intro.remove(), 1300);
  }, 800);
});

/* ===============================
   ROUGH NOTATION
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const yellowEl = document.querySelector('#yellow-highlight');
  const redEl = document.querySelector('#red-underline');
  if (!yellowEl || !redEl || typeof RoughNotation === "undefined") return;

  const yellowDraw = RoughNotation.annotate(yellowEl, {
    type: 'highlight', color: 'rgba(255, 240, 0, 0.6)', padding: [2, 4], animationDuration: 1000, strokeWidth: 2
  });
  const redDraw = RoughNotation.annotate(redEl, {
    type: 'underline', color: '#ff4d4d', padding: 3, strokeWidth: 2.5, iterations: 3, animationDuration: 800
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => yellowDraw.show(), 500);
        setTimeout(() => redDraw.show(), 1500);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  observer.observe(yellowEl);
});

/* ===============================
   GUESTBOOK
================================ */

async function loadGuestbook() {
  const list = document.getElementById("entries");
  if (!list) return;

  try {
    const res = await fetch("https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open");
    const issues = await res.json();
    list.innerHTML = "";

    if (!issues.length) {
      const li = document.createElement("li");
      li.className = "placeholder";
      li.textContent = "No approved notes yet.";
      list.appendChild(li);
      return;
    }

    issues.forEach(issue => {
      const li = document.createElement("li");
      const author = document.createElement("strong");
      author.textContent = "@" + issue.user.login;
      const cleanBody = (issue.body || "").replace(/###.*\n/g, "").trim();
      const message = document.createElement("p");
      message.textContent = cleanBody;
      li.appendChild(author);
      li.appendChild(message);
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Guestbook error:", err);
  }
}

loadGuestbook();

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  if (event?.target) event.target.classList.add('active');
}
