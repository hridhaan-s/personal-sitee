const home = document.getElementById("page-home");
const achievements = document.getElementById("page-achievements");
const space = document.getElementById("page-space");
const blog = document.getElementById("page-blog");

const pages = { home, achievements, space, blog };

function updateActiveNav(page) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === page);
  });
}

function showPage(page, push = true) {
  if (!home) return;
  const safePage = pages[page] ? page : "home";
  Object.values(pages).forEach((element) => element?.classList.add("hidden"));
  pages[safePage]?.classList.remove("hidden");
  updateActiveNav(safePage);

  const path = safePage === "home" ? "/" : `/${safePage}`;
  if (push && location.pathname !== path) history.pushState({}, "", path);

  document.title = safePage === "home"
    ? "Hridhaan Sahay"
    : `${safePage[0].toUpperCase()}${safePage.slice(1)} — Hridhaan Sahay`;
}

document.querySelectorAll("[data-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(link.dataset.route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

window.addEventListener("popstate", () => {
  const route = location.pathname.split("/").filter(Boolean)[0] || "home";
  showPage(route, false);
});

showPage(location.pathname.split("/").filter(Boolean)[0] || "home", false);

document.querySelectorAll("[data-section]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const section = document.getElementById(link.dataset.section);
    showPage("home");
    setTimeout(() => section?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  });
});

document.querySelectorAll("[data-space-scroll]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("space-gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
menuToggle?.addEventListener("click", () => {
  const open = mobileNav?.classList.toggle("open") ?? false;
  menuToggle.setAttribute("aria-expanded", String(open));
});
mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

function moveAboutIntoHero() {
  const about = document.getElementById("about");
  const intro = document.querySelector(".intro");
  const content = about?.querySelector(".about-content");
  const social = about?.querySelector(".social-row");
  if (!about || !intro || !content || intro.dataset.aboutMoved === "true") return;

  const introContent = intro.querySelector(".intro-content");
  if (!introContent) return;

  // Remove the temporary/generic hero copy. The About copy is the hero now.
  introContent.querySelector("h1")?.remove();
  introContent.querySelectorAll(":scope > p").forEach((paragraph) => paragraph.remove());
  introContent.querySelectorAll(":scope > .intro-links").forEach((links) => links.remove());

  // The label is redundant once About becomes the main introduction.
  about.querySelector(".section-label")?.remove();

  content.style.maxWidth = "680px";
  introContent.appendChild(content);
  if (social) introContent.appendChild(social);

  about.remove();
  intro.dataset.aboutMoved = "true";
}

moveAboutIntoHero();

async function loadBlog() {
  const wrap = document.querySelector("#page-blog .blog-wrap");
  if (!wrap) return;
  try {
    const response = await fetch("/blog/posts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Blog data returned ${response.status}`);
    const posts = (await response.json()).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

    wrap.innerHTML = posts.map((post) => `
      <article class="blog-card" data-slug="${escapeHtml(post.slug)}">
        <div><span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || "")}</p></div>
        <button class="read-btn" type="button">Read →</button>
      </article>
    `).join("");

    const bySlug = Object.fromEntries(posts.map((post) => [post.slug, post]));
    wrap.querySelectorAll(".read-btn").forEach((button) => {
      button.addEventListener("click", () => renderPost(bySlug[button.closest(".blog-card")?.dataset.slug], wrap));
    });

    const requested = new URLSearchParams(location.search).get("post");
    if (requested && bySlug[requested]) renderPost(bySlug[requested], wrap);
  } catch (error) {
    console.error("Blog load failed:", error);
    wrap.innerHTML = '<p class="blog-error">The blog could not be loaded right now.</p>';
  }
}

function renderPost(post, wrap) {
  if (!post) return;
  const body = (post.sections || []).map((section) => section.type === "heading" ? `<h4>${escapeHtml(section.text)}</h4>` : `<p>${escapeHtml(section.text)}</p>`).join("");
  wrap.innerHTML = `<article class="blog-post"><span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span><h2>${escapeHtml(post.title)}</h2><button class="back-btn" type="button">← Back to Blog</button>${body}</article>`;
  wrap.querySelector(".back-btn")?.addEventListener("click", () => { history.pushState({}, "", "/blog"); loadBlog(); });
  history.pushState({}, "", `/blog?post=${encodeURIComponent(post.slug)}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
}

loadBlog();