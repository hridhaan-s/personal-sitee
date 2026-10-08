/* ==========================================================
   api/memo.js — the whole backend for Memo (hridhaan.me/blog).

   One serverless function, GitHub as the database:
   every post is posts/<slug>.json, the list is index.json and pasted
   screenshots are media/<hash>.<ext>, all in MEMO_REPO @ MEMO_BRANCH.
   Each save is one git commit, so every edit has history.

   Env vars (Vercel → Settings → Environment Variables):
     GITHUB_TOKEN    fine-grained token, "Contents: read & write" on MEMO_REPO
     MEMO_PASSWORD   the /admin password
     MEMO_REPO       owner/name of the content repo   (default hridhaan-s/memo-content)
     MEMO_BRANCH     branch to store content on       (default main)
     MEMO_SECRET     optional; signs login tokens (defaults to a hash of the above)
     MEMO_SITE_URL   optional; default https://hridhaan.me
     MEMO_LOCAL_DIR  local dev only: store content in this folder instead of GitHub

   Public routes (see vercel.json rewrites):
     /blog, /blog/:slug   → ?page=…   server-rendered shell with meta + data
     /blog/rss.xml        → ?rss=1
     GET ?list | ?post=slug | ?media=name
   Admin (Authorization: Bearer <token>):
     POST {action:"login"} · GET ?admin=list | ?admin=post&slug=
     POST {action:"save"|"delete"|"upload"|"settings"}
   ========================================================== */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const REPO = process.env.MEMO_REPO || "hridhaan-s/memo-content";
const BRANCH = process.env.MEMO_BRANCH || "main";
const SITE = (process.env.MEMO_SITE_URL || "https://hridhaan.me").replace(/\/+$/, "");
const LOCAL = process.env.MEMO_LOCAL_DIR || "";
const GH = "https://api.github.com";
const MAX_UPLOAD = 4 * 1024 * 1024;
const MEDIA_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const EXT_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif" };


/* ---------- storage: GitHub or a local folder ---------- */

function ghHeaders(extra) {
  return Object.assign({
    Authorization: "Bearer " + process.env.GITHUB_TOKEN,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "memo-hridhaan.me"
  }, extra || {});
}

async function gh(method, url, body) {
  const res = await fetch(GH + url, {
    method,
    headers: ghHeaders({ Accept: "application/vnd.github+json", "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error("GitHub " + method + " " + url + " → " + res.status + " " + (data && data.message || ""));
    err.status = res.status;
    throw err;
  }
  return data;
}

const store = LOCAL ? {
  async head() { return null; },
  async read(p) {
    try { return fs.readFileSync(path.join(LOCAL, p)); } catch (e) { return null; }
  },
  async write(files) {
    for (const f of files) {
      const full = path.join(LOCAL, f.path);
      if (f.delete) { try { fs.unlinkSync(full); } catch (e) {} continue; }
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.content);
    }
  }
} : {
  // current head commit of the branch, or null if it doesn't exist yet
  async head() {
    try { return (await gh("GET", "/repos/" + REPO + "/git/ref/heads/" + BRANCH)).object.sha; }
    catch (e) { if (e.status === 404 || e.status === 409) return null; throw e; }
  },

  // ref: a commit sha to read a consistent snapshot, default the branch tip
  async read(p, ref) {
    const res = await fetch(GH + "/repos/" + REPO + "/contents/" + encodeURI(p) + "?ref=" + encodeURIComponent(ref || BRANCH), {
      headers: ghHeaders({ Accept: "application/vnd.github.raw" }),
      cache: "no-store"
    });
    if (res.status === 404 || res.status === 409) return null;   // missing file, branch or an empty repo
    if (!res.ok) throw new Error("GitHub read " + p + " → " + res.status);
    return Buffer.from(await res.arrayBuffer());
  },

  // One commit for the whole batch. With `base`, the commit must sit directly
  // on that commit or it fails with .conflict (the caller re-reads and retries);
  // without it, it retries on top of whatever the tip is (fine for new media).
  async write(files, message, base) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const head = base || await branchHead();
        const commit = await gh("GET", "/repos/" + REPO + "/git/commits/" + head);
        const tree = [];
        for (const f of files) {
          if (f.delete) {
            // deleting a path that doesn't exist makes GitHub reject the tree
            if (await this.read(f.path, head) !== null) tree.push({ path: f.path, mode: "100644", type: "blob", sha: null });
            continue;
          }
          const blob = await gh("POST", "/repos/" + REPO + "/git/blobs", {
            content: Buffer.from(f.content).toString("base64"), encoding: "base64"
          });
          tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
        }
        if (!tree.length) return;
        const newTree = await gh("POST", "/repos/" + REPO + "/git/trees", { base_tree: commit.tree.sha, tree });
        const newCommit = await gh("POST", "/repos/" + REPO + "/git/commits", { message, tree: newTree.sha, parents: [head] });
        await gh("PATCH", "/repos/" + REPO + "/git/refs/heads/" + BRANCH, { sha: newCommit.sha });
        return;
      } catch (e) {
        if (base && e.status === 422) { e.conflict = true; throw e; }
        if (attempt === 4 || (e.status !== 422 && e.status !== 409)) throw e;
        await new Promise(function (r) { setTimeout(r, 150 + Math.random() * 400 * (attempt + 1)); });
      }
    }
  }
};

// The branch's head commit; creates the branch (or the repo's first commit) if needed.
async function branchHead() {
  try {
    return (await gh("GET", "/repos/" + REPO + "/git/ref/heads/" + BRANCH)).object.sha;
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e;
  }
  const readme = Buffer.from("# Memo content\n\nPosts and media for hridhaan.me/blog, written by /admin. Don't edit by hand unless you mean it.\n").toString("base64");
  try {
    // a non-empty repo: start the branch as an orphan so it carries none of the site
    const tree = await gh("POST", "/repos/" + REPO + "/git/trees", {
      tree: [{ path: "README.md", mode: "100644", type: "blob", content: Buffer.from(readme, "base64").toString() }]
    });
    const c = await gh("POST", "/repos/" + REPO + "/git/commits", { message: "Memo: start content branch", tree: tree.sha, parents: [] });
    await gh("POST", "/repos/" + REPO + "/git/refs", { ref: "refs/heads/" + BRANCH, sha: c.sha });
    return c.sha;
  } catch (e) {
    // an empty repo has no git database yet; the contents API can make the first commit
    await gh("PUT", "/repos/" + REPO + "/contents/README.md", { message: "Memo: first commit", content: readme, branch: BRANCH });
    return (await gh("GET", "/repos/" + REPO + "/git/ref/heads/" + BRANCH)).object.sha;
  }
}


/* ---------- data ---------- */

function loadSeed() {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "memo-seed.json"), "utf8")); }
  catch (e) { return { settings: {}, posts: [] }; }
}

async function readJSON(p, ref) {
  const buf = await store.read(p, ref);
  return buf ? JSON.parse(buf.toString("utf8")) : null;
}

// index.json, or the seed (with its posts) when nothing has been saved yet
async function getIndex(ref) {
  const idx = await readJSON("index.json", ref);
  if (idx) return { idx, seeded: false };
  const seed = loadSeed();
  return {
    idx: { settings: seed.settings || {}, posts: (seed.posts || []).map(meta) },
    seeded: true,
    seedPosts: seed.posts || []
  };
}

async function getPost(slug, ref) {
  const p = await readJSON("posts/" + slug + ".json", ref);
  if (p) return p;
  // the seed only stands in until the first save (which writes its posts for real)
  if (!(await getIndex(ref)).seeded) return null;
  return (loadSeed().posts || []).find(function (x) { return x.slug === slug; }) || null;
}

// commit files; if this is the very first write, carry the seed along with it
async function commit(files, message, current, base) {
  if (current.seeded) {
    for (const sp of current.seedPosts) {
      if (!files.some(function (f) { return f.path === "posts/" + sp.slug + ".json"; })) {
        files.push({ path: "posts/" + sp.slug + ".json", content: JSON.stringify(sp, null, 2) });
      }
    }
  }
  await store.write(files, message, base);
}

// read-modify-write on the index, retried if another save landed in between
async function mutate(build, message) {
  for (let attempt = 0; ; attempt++) {
    const base = await store.head();
    const current = await getIndex(base || undefined);
    const out = await build(current, base || undefined);
    try {
      await commit(out.files, message(out), current, base || undefined);
      return out;
    } catch (e) {
      if (!e.conflict || attempt >= 4) throw e;
      await new Promise(function (r) { setTimeout(r, 100 + Math.random() * 300); });
    }
  }
}

function textOf(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|h\d|li|blockquote|pre)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

function meta(p) {
  const text = textOf(p.html);
  const words = text ? text.split(" ").length : 0;
  const firstImg = /<img[^>]+src="([^"]+)"/i.exec(p.html || "");
  return {
    slug: p.slug,
    title: p.title || "Untitled",
    date: p.date,
    updated: p.updated || p.date,
    tags: p.tags || [],
    visibility: p.visibility || "public",
    pinned: Boolean(p.pinned),
    excerpt: p.excerpt || (text.length > 180 ? text.slice(0, 177).replace(/\s+\S*$/, "") + "…" : text),
    words,
    readMins: Math.max(1, Math.round(words / 220)),
    cover: firstImg ? firstImg[1] : null
  };
}

function sortPosts(list) {
  return list.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}

function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "untitled";
}

function cleanTags(t) {
  return (Array.isArray(t) ? t : String(t || "").split(","))
    .map(function (x) { return String(x).trim().toLowerCase().replace(/[^a-z0-9 _-]/g, "").slice(0, 24); })
    .filter(Boolean).slice(0, 8);
}

// Strip what a rich-text paste should never carry. The page also runs DOMPurify on render.
function scrub(html) {
  return String(html || "")
    .replace(/<(script|style|iframe|object|embed|form|noscript)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|form|noscript|meta|link|base)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}


/* ---------- auth ---------- */

function secret() {
  return process.env.MEMO_SECRET ||
    crypto.createHash("sha256").update("memo|" + (process.env.MEMO_PASSWORD || "") + "|" + (process.env.GITHUB_TOKEN || "")).digest("hex");
}

function sign(exp) {
  return crypto.createHmac("sha256", secret()).update("memo-admin|" + exp).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function authed(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer (\d+)\.([a-f0-9]{64})$/.exec(h);
  if (!m || !process.env.MEMO_PASSWORD) return false;
  if (Number(m[1]) < Date.now()) return false;
  return safeEqual(sign(m[1]), m[2]);
}


/* ---------- page shell + RSS ---------- */

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jsonForScript(o) {
  return JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function absolutize(u) {
  if (!u) return u;
  return /^https?:/i.test(u) ? u : SITE + (u.startsWith("/") ? "" : "/") + u;
}

function publicIndex(idx) {
  return {
    settings: idx.settings || {},
    posts: sortPosts(idx.posts.filter(function (p) { return p.visibility === "public"; }))
  };
}

async function renderPage(res, slug) {
  let tpl;
  try { tpl = fs.readFileSync(path.join(process.cwd(), "blog.html"), "utf8"); }
  catch (e) { res.status(500).send("blog.html missing from the function bundle"); return; }

  const { idx } = await getIndex();
  const data = { index: publicIndex(idx), post: null, slug: slug || "" };
  let title = "Memo — Hridhaan Sahay";
  let desc = "Notes, logs and half-finished thoughts by Hridhaan Sahay.";
  let image = null;
  let status = 200;

  if (slug) {
    const p = await getPost(slug);
    if (p && p.visibility !== "draft") {
      const m = meta(p);
      data.post = Object.assign({}, m, { html: p.html });
      title = m.title + " — Memo";
      desc = m.excerpt;
      image = m.cover;
    } else {
      status = 404;
      title = "Not found — Memo";
    }
  }

  const url = SITE + "/blog" + (slug ? "/" + slug : "");
  const head = [
    "<title>" + esc(title) + "</title>",
    '<meta name="description" content="' + esc(desc) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:type" content="' + (data.post ? "article" : "website") + '">',
    '<meta property="og:site_name" content="Memo">',
    image ? '<meta property="og:image" content="' + esc(absolutize(image)) + '">' : "",
    '<meta name="twitter:card" content="' + (image ? "summary_large_image" : "summary") + '">',
    data.post && data.post.visibility === "unlisted" ? '<meta name="robots" content="noindex">' : ""
  ].filter(Boolean).join("\n  ");

  const html = tpl
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace("<!--MEMO_DATA-->", '<script id="memo-data" type="application/json">' + jsonForScript(data) + "</script>");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=300");
  res.status(status).send(html);
}

async function renderRSS(res) {
  const { idx } = await getIndex();
  const posts = publicIndex(idx).posts.slice(0, 30);
  const items = [];
  for (const m of posts) {
    const p = await getPost(m.slug);
    const body = String(p && p.html || "").replace(/(src|href)="\/(?!\/)/g, '$1="' + SITE + "/");
    items.push(
      "<item><title>" + esc(m.title) + "</title>" +
      "<link>" + SITE + "/blog/" + m.slug + "</link>" +
      '<guid isPermaLink="true">' + SITE + "/blog/" + m.slug + "</guid>" +
      "<pubDate>" + new Date(m.date).toUTCString() + "</pubDate>" +
      m.tags.map(function (t) { return "<category>" + esc(t) + "</category>"; }).join("") +
      "<description>" + esc(m.excerpt) + "</description>" +
      "<content:encoded><![CDATA[" + body.replace(/]]>/g, "]]]]><![CDATA[>") + "]]></content:encoded></item>"
    );
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel>' +
    "<title>Memo — Hridhaan Sahay</title><link>" + SITE + "/blog</link>" +
    '<atom:link href="' + SITE + '/blog/rss.xml" rel="self" type="application/rss+xml"/>' +
    "<description>Notes, logs and half-finished thoughts by Hridhaan Sahay.</description><language>en</language>" +
    items.join("") + "</channel></rss>";
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.status(200).send(xml);
}


/* ---------- handler ---------- */

function json(res, status, body, cache) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.status(status).send(JSON.stringify(body));
}

function configured() {
  return LOCAL || process.env.GITHUB_TOKEN;
}

export default async function handler(req, res) {
  const q = req.query || {};
  try {
    if (req.method === "GET") {
      if (q.page !== undefined) return await renderPage(res, q.page === "_index" ? "" : slugify(q.page) === q.page ? q.page : "");
      if (q.rss !== undefined) return await renderRSS(res);

      if (q.media) {
        const name = String(q.media);
        if (!/^[a-f0-9]{16}\.(png|jpg|webp|gif|avif)$/.test(name)) return json(res, 400, { error: "bad media name" });
        const buf = await store.read("media/" + name);
        if (!buf) return json(res, 404, { error: "not found" });
        res.setHeader("Content-Type", EXT_TYPES[name.split(".").pop()]);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.status(200).send(buf);
      }

      if (q.list !== undefined) {
        const { idx } = await getIndex();
        return json(res, 200, publicIndex(idx), "public, s-maxage=15, stale-while-revalidate=300");
      }

      if (q.post) {
        const p = await getPost(String(q.post));
        if (!p || p.visibility === "draft") return json(res, 404, { error: "not found" });
        return json(res, 200, Object.assign(meta(p), { html: p.html }), "public, s-maxage=15, stale-while-revalidate=300");
      }

      if (q.admin) {
        if (!authed(req)) return json(res, 401, { error: "Log in again." });
        if (q.admin === "list") {
          const { idx } = await getIndex();
          return json(res, 200, { settings: idx.settings || {}, posts: sortPosts(idx.posts), repo: LOCAL ? "local folder" : REPO + "@" + BRANCH });
        }
        if (q.admin === "post") {
          const p = await getPost(String(q.slug || ""));
          return p ? json(res, 200, p) : json(res, 404, { error: "not found" });
        }
      }
      return json(res, 400, { error: "unknown request" });
    }

    if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });

    let body = req.body || {};
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

    if (body.action === "login") {
      if (!process.env.MEMO_PASSWORD) return json(res, 500, { error: "MEMO_PASSWORD isn't set on the server." });
      const given = crypto.createHash("sha256").update(String(body.password || "")).digest();
      const real = crypto.createHash("sha256").update(process.env.MEMO_PASSWORD).digest();
      if (!crypto.timingSafeEqual(given, real)) {
        await new Promise(function (r) { setTimeout(r, 900); });   // slow down guessing
        return json(res, 401, { error: "Wrong password." });
      }
      const exp = Date.now() + 30 * 24 * 3600 * 1000;
      return json(res, 200, { token: exp + "." + sign(exp), expires: exp, configured: Boolean(configured()) });
    }

    if (!authed(req)) return json(res, 401, { error: "Log in again." });
    if (!configured()) return json(res, 500, { error: "GITHUB_TOKEN isn't set on the server, so nothing can be saved." });

    if (body.action === "upload") {
      const ext = MEDIA_TYPES[body.type];
      if (!ext) return json(res, 400, { error: "Only PNG, JPEG, WebP, GIF or AVIF images." });
      const buf = Buffer.from(String(body.data || ""), "base64");
      if (!buf.length) return json(res, 400, { error: "Empty image." });
      if (buf.length > MAX_UPLOAD) return json(res, 413, { error: "Image is over 4 MB, even after compression." });
      const name = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16) + "." + ext;
      if (!(await store.read("media/" + name))) {
        await store.write([{ path: "media/" + name, content: buf }], "Memo: add image " + name);
      }
      return json(res, 200, { url: "/api/memo?media=" + name, name });
    }

    function indexFile(idx) {
      return { path: "index.json", content: JSON.stringify({ settings: idx.settings || {}, posts: sortPosts(idx.posts) }, null, 2) };
    }

    if (body.action === "save") {
      const input = body.post || {};
      const title = String(input.title || "").trim().slice(0, 200) || "Untitled";
      const original = input.originalSlug ? slugify(input.originalSlug) : null;

      const out = await mutate(async function (current, base) {
        const idx = current.idx;
        let slug = slugify(input.slug || title);
        // a new post (or a rename) can't take a slug another post already has
        const taken = function (s) { return idx.posts.some(function (p) { return p.slug === s && s !== original; }); };
        if (taken(slug)) {
          let n = 2;
          while (taken(slug + "-" + n)) n++;
          slug = slug + "-" + n;
        }

        const prev = original ? (await getPost(original, base)) : null;
        const now = new Date().toISOString();
        const post = {
          slug,
          title,
          date: /^\d{4}-\d{2}-\d{2}/.test(input.date || "") ? String(input.date).slice(0, 10) : (prev && prev.date) || now.slice(0, 10),
          updated: now,
          tags: cleanTags(input.tags),
          visibility: ["public", "unlisted", "draft"].indexOf(input.visibility) !== -1 ? input.visibility : "draft",
          pinned: Boolean(input.pinned),
          excerpt: String(input.excerpt || "").trim().slice(0, 300),
          html: scrub(input.html)
        };

        const m = meta(post);
        idx.posts = idx.posts.filter(function (p) { return p.slug !== slug && p.slug !== original; });
        idx.posts.push(m);

        const files = [{ path: "posts/" + slug + ".json", content: JSON.stringify(post, null, 2) }, indexFile(idx)];
        if (original && original !== slug) files.push({ path: "posts/" + original + ".json", delete: true });
        if (current.seeded) current.seedPosts = current.seedPosts.filter(function (s) { return s.slug !== original && s.slug !== slug; });
        return { files, post, meta: m, isUpdate: Boolean(prev) };
      }, function (o) { return (o.isUpdate ? "Memo: update " : "Memo: new ") + o.post.slug; });

      return json(res, 200, { ok: true, post: out.post, meta: out.meta });
    }

    if (body.action === "delete") {
      const slug = slugify(body.slug);
      await mutate(async function (current) {
        const idx = current.idx;
        idx.posts = idx.posts.filter(function (p) { return p.slug !== slug; });
        if (current.seeded) current.seedPosts = current.seedPosts.filter(function (s) { return s.slug !== slug; });
        return { files: [{ path: "posts/" + slug + ".json", delete: true }, indexFile(idx)] };
      }, function () { return "Memo: delete " + slug; });
      return json(res, 200, { ok: true });
    }

    if (body.action === "settings") {
      const s = body.settings || {};
      const out = await mutate(async function (current) {
        const idx = current.idx;
        idx.settings = Object.assign({}, idx.settings, { intro: scrub(s.intro).slice(0, 20000) });
        return { files: [indexFile(idx)], settings: idx.settings };
      }, function () { return "Memo: update intro"; });
      return json(res, 200, { ok: true, settings: out.settings });
    }

    return json(res, 400, { error: "unknown action" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: e.message || "Server error" });
  }
}
