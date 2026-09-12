const RAW = "https://raw.githubusercontent.com/hridhaan-s/personal-sitee/main/";

const records = [
  { number: "01", title: "BitBuzz", meta: "FOUNDER · SCIENCE & TECHNOLOGY MEDIA", text: "Built and operated a student-led platform around science, space, technology, cybersecurity, and innovation." },
  { number: "02", title: "Open-source building", meta: "HACK CLUB · WEB · COMMUNITY", text: "Contributed to student developer projects and shipped frontend work across open-source YSWS ecosystems." },
  { number: "03", title: "Cyber safety", meta: "PROJECTS · RESEARCH · AWARENESS", text: "Built experiments such as Flag It and CipherCat around safer digital behaviour, communication, and practical security thinking." },
  { number: "04", title: "Astrophotography", meta: "SPACE · OBSERVATION", text: "Continuously learning the craft of capturing and processing the night sky through observation and experimentation." }
];

export default function AchievementsPage() {
  return <main className="archive-page">
    <nav className="archive-nav"><a href="/">Hridhaan Sahay<span>.</span></a><a href="/">← Back home</a></nav>
    <section className="archive-hero"><span>ACHIEVEMENTS · 2026</span><h1>A record of<br /><em>the work.</em></h1><p>Not just trophies. Projects shipped, communities contributed to, experiments survived, and things learned along the way.</p></section>
    <section className="record-grid">{records.map((r) => <article key={r.number}><span>{r.number}</span><div><small>{r.meta}</small><h2>{r.title}</h2><p>{r.text}</p></div><b>↗</b></article>)}</section>
    <section className="proof-strip"><div><span>ARCHIVE / 01</span><h2>Proof matters.</h2><p>A visual shelf for certificates, badges, and records already kept in the portfolio.</p></div><div className="proof-images"><img src={RAW + "Badge.jpg"} alt="Achievement badge" /><img src={RAW + "AFSD%20Sustainable%20Internaltional%20AFSD.jpg"} alt="Achievement certificate" /></div></section>
    <section className="archive-end"><span>END OF RECORD</span><a href="/">Return to the portfolio ↗</a></section>
  </main>;
}
