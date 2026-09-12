import fs from "node:fs";
import path from "node:path";

interface Post { slug:string; file:string; title:string; date:string; readTime:string; excerpt:string }

function posts(): Post[] { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "posts/index.json"), "utf8")); }

export default function BlogPage() {
  const items = posts();
  return <main className="blog-page"><nav className="blog-nav"><a href="/">Hridhaan Sahay<span>.</span></a><a href="/">← Back home</a></nav><section className="blog-hero"><span>WRITING · NOTES FROM THE BUILD</span><h1>Things I<br /><em>learned.</em></h1><p>Technical notes, experiments, and the reasoning behind the things I build.</p></section><section className="blog-list">{items.map((post) => <article className="blog-card" key={post.slug}><span className="blog-meta">{new Date(`${post.date}T00:00:00`).toLocaleDateString("en-US",{month:"long",year:"numeric"})} · {post.readTime}</span><h2>{post.title}</h2><p>{post.excerpt}</p><a href={`/blog/${post.slug}`}>Read →</a></article>)}</section><div className="archive-end"><span>END OF WRITING INDEX</span><a href="/">Return to portfolio ↗</a></div></main>;
}
