(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const menuButton = document.getElementById("menuButton");
  const navLinks = document.getElementById("navLinks");
  const progress = document.getElementById("progress");
  const glow = document.querySelector(".cursor-glow");

  const setTheme = (dark) => {
    root.classList.toggle("dark", dark);
    localStorage.setItem("hridhaan-theme", dark ? "dark" : "light");
    if (themeIcon) themeIcon.textContent = dark ? "☀" : "◐";
    if (themeButton) themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  };

  const saved = localStorage.getItem("hridhaan-theme");
  setTheme(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  themeButton?.addEventListener("click", () => setTheme(!root.classList.contains("dark")));

  menuButton?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
  navLinks?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    if (menuButton) menuButton.textContent = "☰";
  }));

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0}%`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  window.addEventListener("pointermove", (event) => {
    if (!glow || window.matchMedia("(max-width: 900px)").matches) return;
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index % 5, 4) * 55}ms`;
    observer.observe(el);
  });

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/achievements") requestAnimationFrame(() => document.getElementById("achievements")?.scrollIntoView());
  if (path === "/blog") requestAnimationFrame(() => document.getElementById("writing")?.scrollIntoView());

  document.querySelectorAll(".project, .focus-card, .note").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(max-width: 900px)").matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 2.5).toFixed(2)}deg) rotateY(${(x * 2.5).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", link.getAttribute("href"));
    });
  });
})();