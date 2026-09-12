(() => {
  'use strict';

  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  const applyTheme = (dark) => {
    body.classList.toggle('dark', dark);
    localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light');
    if (themeToggle) themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    if (themeIcon) {
      themeIcon.innerHTML = dark
        ? '<path d="M12 3a9 9 0 1 0 9 9c0-.34-.02-.67-.06-1a7 7 0 0 1-7.94-7.94c-.33-.04-.66-.06-1-.06Z" fill="currentColor"/>'
        : '<path d="M12 4V2m0 20v-2M4 12H2m20 0h-2M5.64 5.64 4.22 4.22m15.56 15.56-1.42-1.42M5.64 18.36l-1.42 1.42M19.78 4.22l-1.42 1.42" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>';
    }
  };

  const savedTheme = localStorage.getItem('portfolio-theme');
  applyTheme(savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

  themeToggle?.addEventListener('click', () => applyTheme(!body.classList.contains('dark')));

  const navToggle = document.querySelector('.nav-toggle');
  const navMobile = document.querySelector('.nav-mobile');

  const closeMobileNav = () => {
    navMobile?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  };

  navToggle?.setAttribute('aria-expanded', 'false');
  navToggle?.addEventListener('click', () => {
    const open = navMobile?.classList.toggle('open') ?? false;
    navToggle?.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobileNav();
  });

  navMobile?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));

  const typewriter = document.getElementById('typewriter');
  const typingText = document.getElementById('typingText');

  const phrases = [
    'Cybersecurity builder.',
    'Space & astrophotography enthusiast.',
    'Student engineer.',
    'Founder of BitBuzz.',
    'Building at the edge of science + software.'
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const typeLoop = () => {
    if (!typingText) return;
    const phrase = phrases[phraseIndex];
    typingText.textContent = phrase.slice(0, charIndex);

    if (!deleting && charIndex < phrase.length) {
      charIndex += 1;
      setTimeout(typeLoop, 65);
      return;
    }
    if (!deleting) {
      deleting = true;
      setTimeout(typeLoop, 1700);
      return;
    }
    if (charIndex > 0) {
      charIndex -= 1;
      setTimeout(typeLoop, 35);
      return;
    }
    deleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    setTimeout(typeLoop, 350);
  };

  typeLoop();

  if (typewriter) {
    const label = 'Student • Cybersecurity • Space';
    let i = 0;
    const write = () => {
      if (i >= label.length) return;
      typewriter.textContent += label.charAt(i++);
      setTimeout(write, 48);
    };
    write();
  }

  const canvas = document.getElementById('starCanvas');
  const ctx = canvas?.getContext('2d');
  let stars = [];
  let frame = 0;

  const resizeCanvas = () => {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(180, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2
    }));
  };

  const drawStars = () => {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (!body.classList.contains('dark')) {
      frame = requestAnimationFrame(drawStars);
      return;
    }
    stars.forEach(star => {
      const alpha = star.a + Math.sin(performance.now() / 1200 + star.phase) * 0.08;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.08, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    frame = requestAnimationFrame(drawStars);
  };

  if (canvas && ctx) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    drawStars();
  }

  document.querySelectorAll('.project-card, .astro-apple-card, .category-card').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (window.matchMedia('(max-width: 900px)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(x * 100 + 50).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100 + 50).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  const revealItems = document.querySelectorAll('.reveal, .section-reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('show'));
  }

  const intro = document.getElementById('netflix-intro');
  if (intro) {
    const alreadyPlayed = sessionStorage.getItem('portfolio-intro-played');
    if (alreadyPlayed) {
      intro.remove();
    } else {
      window.setTimeout(() => intro.classList.add('active'), 350);
      window.setTimeout(() => {
        sessionStorage.setItem('portfolio-intro-played', '1');
        intro.remove();
      }, 1500);
    }
  }

  const highlightsOverlay = document.getElementById('highlightsOverlay');
  const highlightTrigger = document.querySelector('[data-open-highlights]');
  const closeOverlay = document.querySelector('.overlay-close');

  const closeHighlights = () => {
    highlightsOverlay?.classList.add('hidden');
    document.body.classList.remove('modal-open');
  };

  highlightTrigger?.addEventListener('click', () => {
    highlightsOverlay?.classList.remove('hidden');
    document.body.classList.add('modal-open');
  });
  closeOverlay?.addEventListener('click', closeHighlights);
  highlightsOverlay?.addEventListener('click', event => {
    if (event.target === highlightsOverlay) closeHighlights();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeHighlights();
  });

  window.addEventListener('beforeunload', () => cancelAnimationFrame(frame));
})();
