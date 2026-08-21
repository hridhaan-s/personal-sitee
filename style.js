/* DARK MODE */
const toggle = document.getElementById("themeToggle");
toggle.onclick = () => {
  document.body.classList.toggle("dark");
};

/* TYPEWRITER */
const text = "Student • Space & Tech Enthusiast";
let i = 0;
const speed = 60;

function type() {
  if (i < text.length) {
    document.getElementById("typewriter").textContent += text.charAt(i);
    i++;
    setTimeout(type, speed);
  }
}
type();


// Hero name typing effect (safe)

  let j = 0;
  function typeHero() {
    if (j < heroText.length) {
      heroEl.textContent += heroText.charAt(j);
      j++;
      setTimeout(typeHero, 80);
    }
  }

  typeHero();
});


setTimeout(() => {
  document.querySelector(".hero-name")?.classList.add("finished");
}, 2000);

const navToggle = document.querySelector(".nav-toggle");
const navMobile = document.querySelector(".nav-mobile");

navToggle.onclick = () => {
  navMobile.classList.toggle("open");
};

/* Close on link click */
navMobile.querySelectorAll("a").forEach(link => {
  link.onclick = () => navMobile.classList.remove("open");
});

const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");

let w, h, dpr;
let stars = [];
let running = false;
let rafId = null;

function resize() {
  dpr = window.devicePixelRatio || 1;
  w = window.innerWidth;
  h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", resize);

/* ===============================
   STAR GENERATION
================================ */

function createStars() {
  const count = Math.min(300, Math.floor((w * h) / 6000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random(),
    t: Math.random() * Math.PI * 2,
    s: Math.random() * 0.002 + 0.001
  }));
}

/* ===============================
   RENDER LOOP
================================ */

function draw() {
  if (!running) return;

  ctx.clearRect(0, 0, w, h);

  for (const star of stars) {
    star.t += star.s;
    const alpha = 0.4 + Math.sin(star.t) * 0.3 + star.a * 0.3;

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  rafId = requestAnimationFrame(draw);
}

/* ===============================
   DARK MODE CONTROL
================================ */

function startStars() {
  if (running) return;
  running = true;
  createStars();
  draw();
}

function stopStars() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  ctx.clearRect(0, 0, w, h);
}

/* Observe dark mode changes */
const observer = new MutationObserver(() => {
  document.body.classList.contains("dark")
    ? startStars()
    : stopStars();
});

observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

/* Initial state */
if (document.body.classList.contains("dark")) {
  startStars();
}

<script>
(() => {
  const canvas = document.getElementById("starCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  /* ===============================
     STATIC STARFIELD
  ================================ */
  const STAR_COUNT = 180;
  const stars = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.3
    });
  }

  function drawStars() {
    ctx.fillStyle = "#fff";
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ===============================
     SHOOTING STAR (PREMIUM)
  ================================ */
  class ShootingStar {
    reset() {
      this.x = Math.random() * w * 0.6 + w * 0.4;
      this.y = Math.random() * h * 0.3;
      this.len = Math.random() * 80 + 120;
      this.speed = Math.random() * 6 + 10;
      this.life = 0;
      this.maxLife = 60;
      this.active = true;
    }

    update() {
      if (!this.active) return;

      this.x -= this.speed;
      this.y += this.speed;
      this.life++;

      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + this.len,
        this.y - this.len
      );
      ctx.stroke();

      // bright head
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (this.life > this.maxLife) {
        this.active = false;
        scheduleNext();
      }
    }
  }

  const meteor = new ShootingStar();
  let nextTime = 0;

  function scheduleNext() {
    nextTime = performance.now() + Math.random() * 6000 + 4000;
  }
  scheduleNext();

  /* ===============================
     MAIN LOOP
  ================================ */
  function animate(t) {
    ctx.clearRect(0, 0, w, h);

    if (document.body.classList.contains("dark")) {
      drawStars();

      if (!meteor.active && t > nextTime) {
        meteor.reset();
      }

      meteor.update();
    }

    requestAnimationFrame(animate);
  }

  animate();

  const highlightsOverlay = document.getElementById("highlightsOverlay");
const closeOverlay = document.querySelector(".overlay-close");

document.querySelector("[data-open-highlights]")?.addEventListener("click", () => {
  highlightsOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

closeOverlay.addEventListener("click", () => {
  highlightsOverlay.classList.add("hidden");
  document.body.style.overflow = "";
});

})();
</script
-32
Lines changed: 0 additions & 32 deletions
Original file line number	Diff line number	Diff line change
@@ -271,35 +271,3 @@ closeOverlay.addEventListener("click", () => {

})();
</script
hridhaan-sAdd a comment on line L274
Add diff comment
Markdown input: edit mode selected.
Write
Preview
Leave a comment
/*guestbook*/
<script>
async function loadGuestbook() {
  const res = await fetch(
    "https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open"
  );
  const issues = await res.json();
  const list = document.getElementById("entries");
  list.innerHTML = ""; // clear old content
  issues.forEach(issue => {
    const li = document.createElement("li");
    const author = document.createElement("strong");
    author.textContent = "@" + issue.user.login;
    const message = document.createElement("p");
    message.textContent = issue.body.trim();
    li.appendChild(author);
    li.appendChild(message);
    list.appendChild(li);
  });
}
loadGuestbook();
</script>
