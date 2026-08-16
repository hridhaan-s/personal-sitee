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
  if (push && location.pathname !== path) {
    history.pushState({}, "", path);
  }

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

async function loadBlog() {
  const wrap = document.querySelector("#page-blog .blog-wrap");
  if (!wrap) return;

  try {
    const response = await fetch("/blog/posts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Blog data returned ${response.status}`);

    const posts = (await response.json())
      .filter(Boolean)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    wrap.innerHTML = posts.map((post) => `
      <article class="blog-card" data-slug="${escapeHtml(post.slug)}">
        <div>
          <span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.excerpt || "")}</p>
        </div>
        <button class="read-btn" type="button">Read →</button>
      </article>
    `).join("");

    const bySlug = Object.fromEntries(posts.map((post) => [post.slug, post]));
    wrap.querySelectorAll(".read-btn").forEach((button) => {
      button.addEventListener("click", () => {
        renderPost(bySlug[button.closest(".blog-card")?.dataset.slug], wrap);
      });
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

  const body = (post.sections || []).map((section) =>
    section.type === "heading"
      ? `<h4>${escapeHtml(section.text)}</h4>`
      : `<p>${escapeHtml(section.text)}</p>`
  ).join("");

  wrap.innerHTML = `
    <article class="blog-post">
      <span class="blog-meta">${escapeHtml(post.displayDate || post.date)} · ${escapeHtml(post.readTime || "5 min read")}</span>
      <h2>${escapeHtml(post.title)}</h2>
      <button class="back-btn" type="button">← Back to Blog</button>
      ${body}
    </article>
  `;

  wrap.querySelector(".back-btn")?.addEventListener("click", () => {
    history.pushState({}, "", "/blog");
    loadBlog();
  });

  history.pushState({}, "", `/blog?post=${encodeURIComponent(post.slug)}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[character]));
}

function addSocialRow() {
  const about = document.getElementById("about");
  if (!about || document.querySelector(".social-row")) return;

  const links = [
    { label: "Email", href: "mailto:hi@Hridhaan.me", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>' },
    { label: "GitHub", href: "https://github.com/hridhaan-s", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-4 1.2-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 2-.2 4.1-1 4.1-4.5a3.5 3.5 0 0 0-.9-2.5 3.3 3.3 0 0 0-.1-2.5s-.8-.3-2.6 1a9 9 0 0 0-4.8 0c-1.8-1.3-2.6-1-2.6-1a3.3 3.3 0 0 0-.1 2.5 3.5 3.5 0 0 0-.9 2.5c0 3.5 2.1 4.3 4.1 4.5-.5.5-.6 1-.6 2V21"/></svg>' },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/hridhaan-sahay", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9v9M6 6.5v.1M10 18v-5a4 4 0 0 1 8 0v5M10 9v9"/></svg>' },
    { label: "Slack", href: "https://app.slack.com/client/E09V59WQY1E/", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4a2 2 0 1 0 0 4h2V4a2 2 0 0 0-2 0Zm6 2a2 2 0 1 0-4 0v2h4a2 2 0 0 0 0-2ZM20 9a2 2 0 1 0-4 0v2h4a2 2 0 0 0 0-2Zm-2 6a2 2 0 1 0-2-2h-2v4a2 2 0 1 0 4-2ZM9 20a2 2 0 1 0 0-4H7v4a2 2 0 0 0 2 0ZM4 15a2 2 0 1 0 4 0v-2H4a2 2 0 0 0 0 2Zm2-6a2 2 0 1 0 2 2h2V7a2 2 0 0 0-4 2Z"/></svg>' },
    { label: "YouTube", href: "https://www.youtube.com/@Astro-2HR", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="m10 9 5 3-5 3z"/></svg>' },
    { label: "BitBuzz", href: "https://www.youtube.com/@Bitbuzz-club", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-4 3v-3H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M9 10h6M9 13h4"/></svg>' }
  ];

  const row = document.createElement("div");
  row.className = "social-row";
  row.setAttribute("aria-label", "Social links");
  row.innerHTML = links.map((link) => `
    <a href="${link.href}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""} aria-label="${link.label}" title="${link.label}">
      ${link.icon}<span>${link.label}</span>
    </a>
  `).join("");

  about.insertAdjacentElement("afterend", row);
}

addSocialRow();
loadBlog();