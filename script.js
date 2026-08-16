const home = document.getElementById("page-home");
const achievements = document.getElementById("page-achievements");
const space = document.getElementById("page-space");
const blog = document.getElementById("page-blog");

function updateActiveNav(page) {
  document.querySelectorAll("[data-route]").forEach(a => a.classList.toggle("active", a.dataset.route === page));
}

function showPage(page, push = true) {
  if (!home) return;
  [home, achievements, space, blog].forEach(el => { if (el) el.classList.add("hidden"); });
  const target = page === "achievements" ? achievements : page === "space" ? space : page === "blog" ? blog : home;
  if (target) target.classList.remove("hidden");
  const safePage = target === achievements ? "achievements" : target === space ? "space" : target === blog ? "blog" : "home";
  updateActiveNav(safePage);
  if (push) {
    const path = safePage === "home" ? "/" : `/${safePage}`;
    if (location.pathname !== path) history.pushState({}, "", path);
  }
  document.title = safePage === "achievements" ? "Achievements — Hridhaan Sahay" : safePage === "space" ? "Space — Hridhaan Sahay" : safePage === "blog" ? "Blog — Hridhaan Sahay" : "Hridhaan Sahay — Portfolio";
}

document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", e => {
  e.preventDefault();
  showPage(el.dataset.route);
}));

window.addEventListener("popstate", () => showPage(location.pathname.split("/").filter(Boolean)[0] || "home", false));
showPage(location.pathname.split("/").filter(Boolean)[0] || "home", false);

document.querySelectorAll("[data-section]").forEach(link => link.addEventListener("click", e => {
  e.preventDefault();
  const section = document.getElementById(link.dataset.section);
  showPage("home");
  setTimeout(() => section?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
}));

document.querySelectorAll("[data-space-scroll]").forEach(link => link.addEventListener("click", e => {
  e.preventDefault();
  document.getElementById("space-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
}));

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
menuToggle?.addEventListener("click", () => {
  const open = mobileNav?.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(Boolean(open)));
});
mobileNav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mobileNav.classList.remove("open")));

document.getElementById("themeToggle")?.addEventListener("click", () => document.body.classList.toggle("dark"));

const phrases = ["I like exploring space.", "I like writing clean code.", "I like building cool projects.", "I like competitive programming.", "I like learning something new."];
const textEl = document.getElementById("typingText");
let phraseIndex = 0, charIndex = 0, deleting = false;
function typeLoop() {
  if (!textEl) return;
  const phrase = phrases[phraseIndex];
  textEl.textContent = phrase.slice(0, charIndex) || "\u00a0";
  if (!deleting) {
    charIndex++;
    if (charIndex > phrase.length) { deleting = true; return setTimeout(typeLoop, 1800); }
  } else {
    charIndex--;
    if (charIndex === 0) { deleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; return setTimeout(typeLoop, 450); }
  }
  setTimeout(typeLoop, deleting ? 35 : 75);
}
typeLoop();

async function loadScrapbookProjects() {
  const list = document.querySelector(".project-list");
  if (!list) return;
  try {
    const res = await fetch("https://raw.githubusercontent.com/hridhaan-s/scrapbook/main/Data/projects.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Scrapbook returned ${res.status}`);
    const projects = await res.json();
    const visible = projects.filter(p => p && p.title && p.coverImage && p.slug);
    list.innerHTML = visible.map((p, i) => {
      const href = `https://scrapbook.hridhaan.me/project.html?slug=${encodeURIComponent(p.slug)}`;
      const type = p.type || "Project";
      const description = (p.description || "").split("\n")[0];
      return `<a class="project-row" href="${href}" target="_blank" rel="noreferrer"><div class="project-index">${String(i + 1).padStart(2, "0")}</div><img class="project-cover" src="${p.coverImage}" alt="${escapeHtml(p.title)}" loading="lazy"><div class="project-main"><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(description)}</p></div><div class="project-tag">${escapeHtml(type)}</div><div class="project-arrow">↗</div></a>`;
    }).join("");
  } catch (err) { console.error("Scrapbook project sync failed:", err); }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[char]));
}
loadScrapbookProjects();

async function loadBlog() {
  const wrap = document.querySelector("#page-blog .blog-wrap");
  if (!wrap) return;
  try {
    const res = await fetch("/blog/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Blog data returned ${res.status}`);
    const posts = (await res.json()).filter(Boolean).sort((a,b) => new Date(b.date) - new Date(a.date));
    wrap.innerHTML = posts.map(post => `<article class="blog-card" data-slug="${escapeHtml(post.slug)}"><div><span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || "")}</p></div><button class="read-btn" type="button">Read →</button></article>`).join("");
    const postsBySlug = Object.fromEntries(posts.map(p => [p.slug, p]));
    wrap.querySelectorAll(".read-btn").forEach(btn => btn.addEventListener("click", () => renderPost(postsBySlug[btn.closest(".blog-card").dataset.slug], wrap)));
    const requested = new URLSearchParams(location.search).get("post");
    if (requested && postsBySlug[requested]) renderPost(postsBySlug[requested], wrap);
  } catch (err) { console.error("Blog load failed:", err); }
}

function renderPost(post, wrap) {
  if (!post) return;
  const body = (post.sections || []).map(section => section.type === "heading" ? `<h4>${escapeHtml(section.text)}</h4>` : `<p>${escapeHtml(section.text)}</p>`).join("");
  wrap.innerHTML = `<article class="blog-post"><span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span><h2>${escapeHtml(post.title)}</h2><button class="back-btn" type="button">← Back to Blog</button>${body}</article>`;
  wrap.querySelector(".back-btn").addEventListener("click", () => { history.pushState({}, "", "/blog"); loadBlog(); });
  history.pushState({}, "", `/blog?post=${encodeURIComponent(post.slug)}`);
}
loadBlog();

async function loadGuestbook() {
  const list = document.getElementById("entries");
  if (!list) return;
  try {
    const res = await fetch("https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open");
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const issues = await res.json();
    list.innerHTML = "";
    if (!issues.length) {
      list.innerHTML = '<li class="placeholder">No approved notes yet.</li>';
      return;
    }
    issues.forEach(issue => {
      const li = document.createElement("li");
      const author = document.createElement("strong");
      author.textContent = "@" + (issue.user?.login || "visitor");
      const message = document.createElement("p");
      message.textContent = (issue.body || "").replace(/###.*\n/g, "").trim() || "(empty note)";
      li.append(author, message);
      list.appendChild(li);
    });
  } catch (err) { console.error("Guestbook error:", err); }
}
loadGuestbook();
