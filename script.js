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

// Nav routing
document.querySelectorAll("[data-route]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showPage(el.dataset.route);
  });
});

// Browser back / forward
window.addEventListener("popstate", () => {
  const page = location.pathname.replace("/", "") || "home";
  showPage(page, false);
});

// Initial load
const initialPage = location.pathname.replace("/", "") || "home";
showPage(initialPage, false);


/* ===============================
   BLOG READ MODE
================================ */

document.querySelectorAll("#page-blog .read-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".blog-list").style.display = "none";
    document.getElementById("post-1").classList.remove("hidden");
  });
});


/* ===============================
   SECTION SCROLL (FROM ANY PAGE)
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
    link.addEventListener("click", () => {
      navMobile.classList.remove("open");
    });
  });
});


/* ===============================
   PROJECT CARD 3D TILT
================================ */

document.querySelectorAll(".project-card").forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateX = (y - 0.5) * 18;
    const rotateY = (0.5 - x) * 18;

    card.style.transform = `
      perspective(800px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.05)
    `;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform =
      "perspective(800px) rotateX(0) rotateY(0) scale(1)";
  });
});


/* ===============================
   HERO TYPING LOOP
================================ */

const phrases = [
  "I like exploring space.",
  "I like cybersecurity.",
  "I like writing clean code.",
  "I like building cool projects.",
  "I like competitive programming.",
  "I like learning something new.",
  "I like to build stuff at Hack Club."
];

const textEl = document.getElementById("typingText");
let phraseIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
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
   ROUGH NOTATION (ABOUT SECTION)
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const yellowEl = document.querySelector('#yellow-highlight');
  const redEl = document.querySelector('#red-underline');

  // Content-only update: keep the existing UI/annotation behavior intact.
  if (yellowEl) yellowEl.textContent = "Cybersecurity and Technology";

  // 1. Create the Yellow Highlight (The "Marker" feel)
  const yellowDraw = RoughNotation.annotate(yellowEl, {
    type: 'highlight',
    color: 'rgba(255, 240, 0, 0.6)', // Semi-transparent yellow
    padding: [2, 4],
    animationDuration: 1000,
    strokeWidth: 2
  });

  // 2. Create the Red Underline (The "Pen" feel)
  const redDraw = RoughNotation.annotate(redEl, {
    type: 'underline',
    color: '#ff4d4d', 
    padding: 3,
    strokeWidth: 2.5,
    iterations: 3, // This makes the "moving/writing" effect stronger
    animationDuration: 800
  });

  // 3. Trigger when visible on screen
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Start drawing yellow after 0.5s
        setTimeout(() => yellowDraw.show(), 500);
        
        // Start drawing red after 1.5s (sequential feel)
        setTimeout(() => redDraw.show(), 1500);
        
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(yellowEl);
});document.addEventListener("DOMContentLoaded", () => {
  const yellowEl = document.querySelector('#yellow-highlight');
  const redEl = document.querySelector('#red-underline');

  // 1. Create the Yellow Highlight (The "Marker" feel)
  const yellowDraw = RoughNotation.annotate(yellowEl, {
    type: 'highlight',
    color: 'rgba(255, 240, 0, 0.6)', // Semi-transparent yellow
    padding: [2, 4],
    animationDuration: 1000,
    strokeWidth: 2
  });

  // 2. Create the Red Underline (The "Pen" feel)
  const redDraw = RoughNotation.annotate(redEl, {
    type: 'underline',
    color: '#ff4d4d', 
    padding: 3,
    strokeWidth: 2.5,
    iterations: 3, // This makes the "moving/writing" effect stronger
    animationDuration: 800
  });

  // 3. Trigger when visible on screen
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Start drawing yellow after 0.5s
        setTimeout(() => yellowDraw.show(), 500);
        
        // Start drawing red after 1.5s (sequential feel)
        setTimeout(() => redDraw.show(), 1500);
        
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(yellowEl);
});async function loadGuestbook() {
  const list = document.getElementById("entries");
  if (!list) return; // IMPORTANT GUARD

  try {
    const res = await fetch(
      "https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open"
    );
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

      const cleanBody = issue.body
        .replace(/###.*\n/g, "")
        .trim();

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

    document
      .querySelectorAll('.tab-content')
      .forEach(tab => {
        tab.classList.remove('active')
      })

    document
      .querySelectorAll('.tab-btn')
      .forEach(btn => {
        btn.classList.remove('active')
      })

    document
      .getElementById(tabId)
      .classList.add('active')

    event.target.classList.add('active')
  }


/* ===============================
   EXPERIENCE + EDUCATION
================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("experience")) return;

  const projectsSection = document.getElementById("projects");
  if (!projectsSection) return;

  const experienceSection = document.createElement("section");
  experienceSection.className = "astro-apple";
  experienceSection.id = "experience";
  experienceSection.innerHTML = `
    <h2>Experience</h2>
    <p class="astro-desc">Building, leading, and collaborating across student developer communities.</p>

    <div class="astro-apple-grid">
      <article class="astro-apple-card">
        <h3>YSWS Contractor — Hack Club</h3>
        <p><strong>2023–Present · Remote</strong></p>
        <p>Contracted with Hack Club to engineer and operate YSWS programmes for teens, working with staff, reviewers, co-organizers, and student developers globally.</p>
        <p><strong>Programme Operations</strong><br>
        Managed reviewers and co-organizers, worked with Hack Club staff in Vermont, engineered and hosted YSWS programmes, and supported programme management during gap-year engagements.</p>
        <p><strong>Community</strong><br>
        Collaborated with student developers worldwide and connected my school's Cyber Club with Hack Club's global network for collaboration, resources, and support.</p>
        <p><strong>Programmes:</strong> 3am.hackclub.com · arcade.hackclub.com</p>
      </article>

      <article class="astro-apple-card">
        <h3>Hack Club — Open Source</h3>
        <p><strong>2026 · Contributor</strong></p>
        <p>Contributed code, frontend work, and UI/UX improvements across Hack Club's open-source ecosystem.</p>
        <p><strong>YSWS Platform</strong><br>
        Improved navigation, hero section, project cards, responsive design, and shipped new features. <strong>3 PRs merged into production</strong>, impacting a platform with 100K+ monthly visitors.</p>
        <p><strong>Help Center</strong><br>
        Frontend and UI/UX improvements with a merged pull request.</p>
        <p><strong>Keeb YSWS</strong><br>
        Built the rewards shop for users to redeem rewards, with UI/UX improvements and a merged pull request.</p>
      </article>

      <article class="astro-apple-card">
        <h3>Founder — BitBuzz</h3>
        <p><strong>2023–Present · Noida</strong></p>
        <p>Founded and built BitBuzz, a youth-focused digital platform covering technology, space, innovation, and science.</p>
        <p>Built and operated the platform from the ground up, working across product development, web engineering, content, and operations.</p>
        <p><strong>50,500+ visitors · 50+ countries</strong></p>
      </article>

      <article class="astro-apple-card">
        <h3>Leadership & Community</h3>
        <p><strong>Twilara · Hackathons</strong></p>
        <p><strong>Hack Club Lead — Twilara</strong><br>
        Led my school's Hack Club-supported innovation club and helped students connect with programming, technology, and the wider Hack Club community.</p>
        <p><strong>Hackathons</strong><br>
        Regularly participate in hackathons and student developer communities, building projects and collaborating with other developers.</p>
      </article>
    </div>

    <div class="astro-apple-grid" style="margin-top: 28px;">
      <article class="astro-apple-card">
        <h3>Education</h3>
        <p><strong>Shri Ram Global School</strong></p>
        <p>High School Diploma — PCM + Information Technology + Physical Education<br>2022–2027</p>
        <p><strong>Leadership & Activities</strong><br>
        ICT Captain — School Student Council<br>
        Club Leader — Twilara Innovation Club<br>
        Health & Wellness Prefect — 2023–24<br>
        Editor — School Newsletter<br>
        Member — Interactive Club<br>
        Class Monitor — Grades 9 & 10</p>
        <p>Multiple awards across chess, programming, and design.</p>
      </article>
    </div>
  `;

  projectsSection.parentNode.insertBefore(experienceSection, projectsSection);

  const navItems = document.querySelectorAll(".nav-links, .nav-mobile");
  navItems.forEach(nav => {
    if (nav.querySelector('[data-section="experience"]')) return;
    const link = document.createElement("a");
    link.href = "#experience";
    link.dataset.section = "experience";
    link.textContent = "Experience";

    if (nav.classList.contains("nav-links")) {
      const projectsLink = nav.querySelector('[data-section="projects"]');
      const li = document.createElement("li");
      li.appendChild(link);
      if (projectsLink && projectsLink.parentElement) {
        projectsLink.parentElement.insertAdjacentElement("beforebegin", li);
      } else {
        nav.appendChild(li);
      }
    } else {
      const projectsLink = nav.querySelector('[data-section="projects"]');
      if (projectsLink) projectsLink.insertAdjacentElement("beforebegin", link);
      else nav.appendChild(link);
    }

    link.addEventListener("click", e => {
      e.preventDefault();
      showPage("home");
      setTimeout(() => {
        document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      if (nav.classList.contains("nav-mobile")) nav.classList.remove("open");
    });
  });
});


/* ===============================
   BITBUZZ HOVER PREVIEW
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const bitBuzzCard = document.querySelector("#projects .project-card");
  if (!bitBuzzCard) return;

  const image = bitBuzzCard.querySelector("img");
  if (!image) return;

  const coverImage = "https://cdn.hackclub.com/01a0a42f-c3df-7add-bf53-caf6df1ffe26/image.png";
  const hoverGif = "https://cdn.hackclub.com/01a0a42e-7d2d-78e7-bdcf-3ffb79fb1cbd/ezgif-8b9e47da08458cd5.gif";

  // Keep the static image as the normal cover.
  image.src = coverImage;

  // Replace the same image with the GIF while the card is hovered.
  bitBuzzCard.addEventListener("mouseenter", () => {
    image.src = hoverGif;
  });

  // Immediately restore the cover when the pointer leaves.
  bitBuzzCard.addEventListener("mouseleave", () => {
    image.src = coverImage;
  });
});