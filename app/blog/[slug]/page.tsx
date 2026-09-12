import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { marked } from "marked";

interface Post { slug:string; file:string; title:string; date:string; readTime:string; excerpt:string }
function posts(): Post[] { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "posts/index.json"), "utf8")); }

export function generateStaticParams() { return posts().map((post) => ({ slug: post.slug })); }

export default async function BlogPost({ params }: { params: Promise<{ slug:string }> }) {
  const { slug } = await params;
  const post = posts().find((item) => item.slug === slug);
  if (!post) notFound();
  const file = fs.readFileSync(path.join(process.cwd(), "posts", post.file), "utf8").replace(/^---[\s\S]*?---\s*/, "");
  const html = await marked.parse(file);
  return <main className="blog-page"><nav className="blog-nav"><a href="/">Hridhaan Sahay<span>.</span></a><a href="/blog">← Writing</a></nav><article className="blog-post"><a className="back-btn" href="/blog">← Back to Blog</a><h1>{post.title}</h1><span className="blog-meta">{new Date(`${post.date}T00:00:00`).toLocaleDateString("en-US",{month:"long",year:"numeric"})} · {post.readTime}</span><div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} /></article></main>;
}
