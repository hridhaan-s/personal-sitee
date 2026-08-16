const home = document.getElementById("page-home");
const achievements = document.getElementById("page-achievements");
const space = document.getElementById("page-space");
const blog = document.getElementById("page-blog");

function installContactPage() {
  const oldContact = document.getElementById("links");
  if (!oldContact) return document.createElement("section");

  const page = document.createElement("section");
  page.id = "page-contact";
  page.className = "page hidden contact-page";
  page.innerHTML = `
    <div class="subpage-head contact-head">
      <div class="section-label">Contact</div>
      <h1>Contact</h1>
      <p>If you'd like to get in touch or just say hello, here's a few ways to do so:</p>
    </div>
    <div class="contact-list">
      <a href="mailto:hi@Hridhaan.me"><span class="contact-bullet">•</span><span><strong>By email:</strong> — <b>hi@Hridhaan.me</b></span></a>
      <a href="https://github.com/hridhaan-s" target="_blank" rel="noreferrer"><span class="contact-bullet">•</span><span><strong>GitHub:</strong> — <b>github.com/hridhaan-s</b></span></a>
      <a href="https://www.linkedin.com/in/hridhaan-sahay" target="_blank" rel="noreferrer"><span class="contact-bullet">•</span><span><strong>LinkedIn:</strong> — <b>Hridhaan Sahay</b></span></a>
      <a href="https://app.slack.com/client/E09V59WQY1E/" target="_blank" rel="noreferrer"><span class="contact-bullet">•</span><span><strong>Slack:</strong> — <b>Find me on Slack</b></span></a>
      <a href="https://www.youtube.com/@Astro-2HR" target="_blank" rel="noreferrer"><span class="contact-bullet">•</span><span><strong>YouTube:</strong> — <b>@Astro-2HR</b></span></a>
      <a href="https://www.youtube.com/@Bitbuzz-club" target="_blank" rel="noreferrer"><span class="contact-bullet">•</span><span><strong>BitBuzz:</strong> — <b>@Bitbuzz-club</b></span></a>
    </div>
    <footer class="site-footer"><span>© 2026 Hridhaan Sahay</span><span>Keep looking up.</span></footer>
  `;

  oldContact.classList.add("hidden");
  oldContact.setAttribute("aria-hidden", "true");
  document.querySelector(".site-shell")?.appendChild(page);
  return page;
}

const contact = installContactPage();
const pages = { home, achievements, space, blog, contact };

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
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-section="links"]').forEach((link) => {
  link.removeAttribute("data-section");
  link.dataset.route = "contact";
  link.href = "/contact";
});

document.querySelectorAll("[data-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const route = link.dataset.route;
    if (!pages[route]) return;
    event.preventDefault();
    showPage(route);
  });
});

window.addEventListener("popstate", () => {
  const route = location.pathname.split("/").filter(Boolean)[0] || "home";
  showPage(route, false);
});

showPage(location.pathname.split("/").filter(Boolean)[0] || "home", false);

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

  introContent.querySelector("h1")?.remove();
  introContent.querySelectorAll(":scope > p").forEach((paragraph) => paragraph.remove());
  introContent.querySelectorAll(":scope > .intro-links").forEach((links) => links.remove());
  about.querySelector(".section-label")?.remove();

  content.style.maxWidth = "680px";
  introContent.appendChild(content);
  if (social) introContent.appendChild(social);
  about.remove();
  intro.dataset.aboutMoved = "true";
}

function useRequestedSocialIcons() {
  const icons = {
    Email: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`,
    GitHub: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>`,
    LinkedIn: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>`,
    Slack: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="3" height="8" x="13" y="2" rx="1.5"></rect><path d="M19 8.5c1.5 0 3-1.5 3-3s-1.5-3-3-3-3 1.5-3 3v3h3z"></path><rect width="3" height="8" x="8" y="14" rx="1.5"></rect><path d="M5 15.5c-1.5 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3v3H5z"></path><rect width="8" height="3" x="14" y="13" rx="1.5"></rect><path d="M15.5 19c0 1.5 1.5 3 3 3s3-1.5 3-3-1.5-3-3-3h-3v3z"></path><rect width="8" height="3" x="2" y="8" rx="1.5"></rect><path d="M8.5 5C8.5 3.5 7 2 5.5 2S2.5 3.5 2.5 5s1.5 3 3 3h3V5z"></path></svg>`,
    YouTube: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7.1C2.6 5 4.3 3.3 6.4 3.1 9.6 2.8 14.4 2.8 17.6 3.1 19.7 3.3 21.4 5 21.5 7.1c.2 1.6.2 4.2.2 4.9 0 .7 0 3.3-.2 4.9-.1 2.1-1.8 3.8-3.9 4-3.2.3-8 .3-11.2 0-2.1-.2-3.8-1.9-3.9-4-.2-1.6-.2-4.2.2-4.9Z"></path><path d="m10 15 5-3-5-3v6Z"></path></svg>`
  };

  document.querySelectorAll(".social-row a").forEach((link) => {
    const label = link.querySelector("span")?.textContent?.trim();
    if (icons[label]) {
      link.querySelector("svg")?.remove();
      link.insertAdjacentHTML("afterbegin", icons[label]);
    }
  });
}

function installHeroLayoutFix() {
  const style = document.createElement("style");
  style.textContent = `
    .intro{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:44px;align-items:center;min-height:470px}
    .intro-content{grid-column:1;grid-row:1;margin-left:0;max-width:680px}
    .intro-photo{grid-column:2;grid-row:1;position:relative;left:auto;top:auto;width:190px;margin:0;align-self:center}
    .intro-photo img{width:100%;height:auto;display:block}
    .social-row svg{width:20px;height:20px;flex:0 0 20px}
    .contact-page{max-width:780px;margin:0 auto;min-height:70vh;padding-top:70px}
    .contact-head{margin-bottom:38px}
    .contact-head h1{margin:8px 0 10px}
    .contact-head p{max-width:720px;margin:0}
    .contact-list{display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.12)}
    .contact-list a{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;padding:18px 8px;border-bottom:1px solid rgba(255,255,255,.12);text-decoration:none;color:inherit}
    .contact-list a:hover{background:rgba(255,255,255,.025)}
    .contact-bullet{font-size:22px;line-height:1;color:#9ba19f}
    .contact-list strong{font-weight:600}
    .contact-list b{font-weight:400;color:#aeb4b2;text-decoration:underline;text-underline-offset:4px}
    .contact-list a:hover b{color:#f0f2f1}
    .contact-page .site-footer{margin-top:70px}
    @media(max-width:800px){.intro{display:flex;flex-direction:column;align-items:stretch;gap:26px;min-height:0}.intro-content{order:1}.intro-photo{order:2;width:min(180px,52vw);margin:0 auto;align-self:center}.social-row{order:3}.contact-page{padding-top:42px}.contact-list a{padding:16px 2px}}
  `;
  document.head.appendChild(style);
}

moveAboutIntoHero();
useRequestedSocialIcons();
installHeroLayoutFix();

function addNewDelhiTime() {
  const aboutContent = document.querySelector(".about-content");
  if (!aboutContent || aboutContent.querySelector(".local-time")) return;

  const paragraph = document.createElement("p");
  paragraph.className = "local-time";
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  const update = () => {
    paragraph.textContent = `At the moment, it's ${formatter.format(new Date())} in New Delhi.`;
  };

  update();
  aboutContent.appendChild(paragraph);
  window.setInterval(update, 60000);
}

addNewDelhiTime();

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