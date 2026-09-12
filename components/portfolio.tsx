"use client";

import { useEffect, useRef, useState } from "react";

const RAW = "https://raw.githubusercontent.com/hridhaan-s/personal-sitee/main/";
const MEMOJI = RAW + "Memoji%202.png";

const projects = [
  { name: "BitBuzz", type: "PLATFORM · SCIENCE MEDIA", tag: "Web · Platform", image: "https://www.hridhaan.me/Screenshot%202026-05-09%20172150.png", description: "A student-run platform focused on innovation, space, cybersecurity, and technology — built to help people stop eating noise and start discovering signal.", href: "https://bitbuzz.app", featured: true },
  { name: "Flag It", type: "CYBERSECURITY · SAFETY", tag: "Social Impact", image: "https://cdn.hackclub.com/019e8f5f-664f-736e-a37a-9abb4321a2cc/screenshot_2026-06-04_024700.png", description: "A community-driven cyber-safety platform for reporting scams, fraud, and suspicious activity while turning incidents into awareness.", href: "https://scrapbook.hridhaan.me/project.html?slug=flag-it" },
  { name: "CipherCat", type: "SECURITY · AUTOMATION", tag: "Bot · Automation", image: "https://cdn.hackclub.com/019efe71-6eee-7123-a523-a4468c9441b4/screenshot_2026-06-25_162538.png", description: "A Slack bot built for Hack Club that transforms messages into Morse code, decodes transmissions, and delivers secret transmissions through CipherMail.", href: "https://scrapbook.hridhaan.me/project.html?slug=ciphercat" },
  { name: "Xerxes", type: "AI · COMPUTER VISION", tag: "Computer Vision · AI", image: "https://cdn.hackclub.com/019f3e40-1bee-70d6-8cd8-a50ea0adf3c9/image.png", description: "A real-time research assistant using client-side computer vision for posture, proximity, focus monitoring, timers, notifications, and audio alerts.", href: "https://scrapbook.hridhaan.me/project.html?slug=xerxes" },
  { name: "BookBridge", type: "EDTECH · OPEN ACCESS", tag: "Education", image: "https://cdn.hackclub.com/019f0feb-342d-7bfe-acbb-e3208cb6b61c/screenshot_2026-06-26_164649.png", description: "A Class 12 IT project designed to bridge accessibility barriers to textbooks, peer study notes, and school references.", href: "https://scrapbook.hridhaan.me/project.html?slug=bookbridge-class-12-it-project" },
  { name: "Chanakya AI", type: "AI · FACT CHECKING", tag: "AI · Chatbot", image: "https://www.hridhaan.me/Screenshot%202026-05-09%20172557.png", description: "An experimental BitBuzz fact-checking assistant using a Wikipedia-backed approach to make information easier to verify.", href: "https://scrapbook.hridhaan.me/project.html?slug=chanakya-ai" }
];

const phrases = ["I like exploring space.", "I like writing clean code.", "I like building cool projects.", "I like competitive programming.", "I like learning something new."];

export default function Portfolio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(false);
  const [intro, setIntro] = useState(true);
  const [phrase, setPhrase] = useState(0);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [guestbook, setGuestbook] = useState<{ login: string; body: string }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("portfolio-theme");
    setDark(saved ? saved === "dark" : !window.matchMedia("(prefers-color-scheme: light)").matches);
    const played = sessionStorage.getItem("portfolio-intro-played");
    if (played) setIntro(false);
    else sessionStorage.setItem("portfolio-intro-played", "1");
  }, []);

  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntro(false), 1450);
    return () => window.clearTimeout(t);
  }, [intro]);

  useEffect(() => {
    const text = phrases[phrase];
    const timer = window.setTimeout(() => {
      if (!deleting) {
        if (typed.length < text.length) setTyped(text.slice(0, typed.length + 1));
        else setDeleting(true);
      } else if (typed.length) setTyped(text.slice(0, typed.length - 1));
      else { setDeleting(false); setPhrase((p) => (p + 1) % phrases.length); }
    }, deleting ? 38 : typed.length === text.length ? 1900 : 70);
    return () => window.clearTimeout(timer);
  }, [typed, deleting, phrase]);

  useEffect(() => {
    localStorage.setItem("portfolio-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dark) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth * devicePixelRatio; canvas.height = window.innerHeight * devicePixelRatio; ctx.scale(devicePixelRatio, devicePixelRatio); };
    resize();
    const stars = Array.from({ length: Math.min(150, Math.floor(window.innerWidth / 8)) }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, r: Math.random() * 1.2 + .2, a: Math.random() * .7 + .15 }));
    let frame = 0;
    const draw = () => { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); for (const s of stars) { ctx.globalAlpha = s.a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill(); } frame = requestAnimationFrame(draw); };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [dark]);

  useEffect(() => {
    fetch("https://api.github.com/repos/hridhaan-s/personal-sitee/issues?labels=approved&state=open")
      .then((r) => r.ok ? r.json() : [])
      .then((issues) => setGuestbook(issues.slice(0, 6).map((i: { user: { login: string }; body: string | null }) => ({ login: i.user.login, body: (i.body || "").replace(/###.*\\n/g, "").trim() }))))
      .catch(() => setGuestbook([]));
  }, []);

  const scrollTo = (id: string) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="site-shell">
      <canvas ref={canvasRef} className="star-canvas" aria-hidden="true" />
      {intro && <div className="cinema-intro"><div>HRIDHAAN</div><div>SAHAY</div></div>}

      <header className="topbar">
        <a className="brand" href="#top" onClick={() => scrollTo("top")}>Hridhaan Sahay<span>.</span></a>
        <nav className={menu ? "nav open" : "nav"}>
          <button onClick={() => scrollTo("top")}>Home</button>
          <button onClick={() => scrollTo("domains")}>Focus</button>
          <button onClick={() => scrollTo("projects")}>Projects</button>
          <a href="/achievements">Achievements</a>
          <button onClick={() => scrollTo("astrophotography")}>Astro</button>
          <a href="/blog">Writing</a>
          <a href="https://scrapbook.hridhaan.me/" target="_blank" rel="noreferrer">Scrapbook</a>
        </nav>
        <div className="top-actions">
          <button className="theme-button" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">{dark ? "☼" : "◐"}</button>
          <button className="menu-button" onClick={() => setMenu((m) => !m)} aria-label="Open menu">☰</button>
        </div>
      </header>

      <main id="top">
        <section className="hero-v4 section-pad">
          <div className="hero-copy-v4">
            <div className="eyebrow">STUDENT BUILDER · INDIA · 2026</div>
            <h1>Building at the<br /><span>edge of curiosity.</span></h1>
            <p className="hero-lead">I build at the intersection of <b>cybersecurity</b>, <b>space</b>, science, and software.</p>
            <div className="hero-type"><span>{typed || "\u00a0"}</span><i>▌</i></div>
            <div className="hero-actions"><button className="button primary" onClick={() => scrollTo("projects")}>Explore the work <span>↘</span></button><a className="button quiet" href="mailto:hi@Hridhaan.me">Say hello</a></div>
            <div className="hero-stats"><span><b>01</b> Founder · BitBuzz</span><span><b>02</b> Cyber safety projects</span><span><b>03</b> Astrophotography</span></div>
          </div>
          <div className="hero-art">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="portrait"><img src={MEMOJI} alt="Hridhaan Sahay" /></div>
            <span className="orbit-label top">CURRENT ORBIT</span><span className="orbit-label bottom">CURIOSITY / 01</span>
            <div className="floating-chip cyber">⌁ CYBERSECURITY</div><div className="floating-chip space">✦ SPACE</div>
          </div>
        </section>

        <section className="manifesto section-pad reveal-in" id="about"><div className="section-meta">01 — PROFILE</div><div className="manifesto-grid"><h2>I don't want to just use technology.<br /><em>I want to understand it, question it, and build with it.</em></h2><div><p>Hello. I'm Hridhaan Sahay, a high-school student obsessed with how systems work — from secure digital infrastructure to the physics and scale of space.</p><p>I created <a href="https://bitbuzz.app" target="_blank" rel="noreferrer">BitBuzz</a> to make science and technology easier to discover without the noise, and I keep building experiments around cyber safety, AI, automation, and engineering.</p><p>Outside code, I look up. Astrophotography gives me a different kind of debugging: patience, observation, and thousands of tiny signals becoming one image.</p><p className="muted">Based in India · learning in public · building quietly.</p></div></div></section>

        <section className="domains section-pad" id="domains"><div className="section-heading"><div><div className="section-meta">02 — FOCUS</div><h2>Four lanes.<br />One direction.</h2></div><p>Science, systems, and the space between a question and a working prototype.</p></div><div className="domain-grid">{[["01","✦","Space","Astrophotography, space science, observation, and the engineering systems that keep missions alive.","ORBIT"],["02","⌁","Cybersecurity","Cyber safety, scams, privacy, secure thinking, and tools for hostile digital environments.","DEFEND"],["03","▣","Technology","Web products, AI experiments, automation, interfaces, and the systems underneath them.","BUILD"],["04","◇","Innovation","Turning weird questions into prototypes, practical experiments, and things people can actually use.","EXPLORE"]].map(([n,s,t,d,c]) => <article className="domain-card" key={n}><span>{n}</span><strong>{s}</strong><h3>{t}</h3><p>{d}</p><b>{c} →</b></article>)}</div></section>

        <section className="work section-pad" id="projects"><div className="section-heading"><div><div className="section-meta">03 — SELECTED WORK</div><h2>Built. Shipped.<br />Learned.</h2></div><a href="https://github.com/hridhaan-s" target="_blank" rel="noreferrer" className="text-link">GitHub ↗</a></div><div className="work-grid">{projects.map((p) => <article className={p.featured ? "work-card featured" : "work-card"} key={p.name}><a href={p.href} target="_blank" rel="noreferrer"><div className="work-image"><img src={p.image} alt={p.name} loading="lazy" /><div className="work-number">{String(projects.indexOf(p)+1).padStart(2,"0")}</div></div><div className="work-info"><span>{p.type}</span><h3>{p.name}</h3><p>{p.description}</p><b>Explore project ↗</b></div></a></article>)}</div></section>

        <section className="chapter section-pad"><div className="chapter-label">THE WORK, OFF-SCREEN</div><div className="chapter-grid"><a href="https://scrapbook.hridhaan.me/" target="_blank" rel="noreferrer"><span>04 — ARCHIVE</span><h3>The Scrapbook</h3><p>Every project, experiment, mistake, and lesson worth keeping.</p><b>Open archive →</b></a><a href="/achievements"><span>05 — RECORD</span><h3>Achievements</h3><p>Academic milestones, leadership, competitions, and work beyond code.</p><b>View achievements →</b></a></div></section>

        <section className="astro section-pad" id="astrophotography"><div className="section-meta">06 — ASTROPHOTOGRAPHY</div><h2>Look up.</h2><p>A quieter side of the portfolio: observing the night sky, capturing light, and learning to be patient with the signal.</p><div className="astro-grid"><a href="https://drive.google.com/drive/folders/1uf6q7BSrwqgcLWF8dFDmJrwmYIB38zXm?usp=sharing" target="_blank" rel="noreferrer"><span>✦</span><h3>Latest Captures</h3><p>The most recent space observations and images.</p><b>View collection →</b></a><a href="https://drive.google.com/file/d/1tnuOSDrebYF7utN5M0mX4lw_bhJXN2Xk/view?usp=sharing" target="_blank" rel="noreferrer"><span>◌</span><h3>Fav Ones</h3><p>A small collection of the frames I keep coming back to.</p><b>View collection →</b></a></div></section>

        <section className="guestbook section-pad"><div className="section-meta">07 — GUESTBOOK</div><div className="guestbook-head"><h2>Leave a signal.</h2><p>Notes from people who have crossed paths with the work.</p></div><div className="guest-list">{guestbook.length ? guestbook.map((g, i) => <div key={`${g.login}-${i}`}><b>@{g.login}</b><p>{g.body}</p></div>) : <div className="empty-note">No approved notes yet.</div>}</div><a className="text-link" href="https://github.com/hridhaan-s/personal-sitee/issues/new" target="_blank" rel="noreferrer">Leave a note ↗</a></section>

        <section className="connect section-pad" id="links"><div className="section-meta">08 — CONTACT</div><h2>Build something<br /><em>interesting.</em></h2><p>GitHub, LinkedIn, YouTube, or just email. The internet is smaller than it looks.</p><div className="socials"><a href="https://github.com/hridhaan-s" target="_blank" rel="noreferrer">GH</a><a href="https://www.linkedin.com/in/hridhaan-sahay" target="_blank" rel="noreferrer">in</a><a href="https://www.youtube.com/@Astro-2HR" target="_blank" rel="noreferrer">YT</a><a href="mailto:hi@Hridhaan.me">✉</a></div></section>
      </main>
      <footer><span>© 2026 Hridhaan Sahay</span><span>Cybersecurity × Space × Technology × Curiosity</span></footer>
    </div>
  );
}
