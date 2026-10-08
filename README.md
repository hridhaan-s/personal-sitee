# The Hridhaan Site

Source for my personal site / portfolio — projects, achievements, astrophotography,
blog and guestbook.

**Live:** [hridhaan.me](https://hridhaan.me)

Built with plain HTML, CSS and JavaScript. No framework, no build step — open
`index.html` and it runs.

---

## Structure

```
.
├── index.html        # every view (home, achievements, astrophotography, blog), client-side routed
├── css/site.css      # the whole stylesheet, one file, sections numbered in reading order
├── js/main.js        # router, theme, clock + moon, annotations, reveal, lightbox, flipbook, guestbook, sudo
├── vercel.json       # /archive -> /achievements redirect; every other path rewrites to /
├── serve.py          # local preview with the same routing as Vercel
├── sitemap.xml
├── api/counter.js    # visit counter (Vercel serverless function)
├── api/memo.js       # Memo backend (see below)
└── assets/
    ├── astro/        # WebP thumbnails for the astrophotography gallery (full size lives on the CDN)
    ├── logos/        # org + school logos (bitbuzz.svg is the BitBuzz mark)
    ├── projects/     # project covers
    ├── certs/        # certificates on the achievements page
    └── img/          # profile photo, signature, favicon
```

## How it works

- **Routing** — every nav item has a real URL: `/about`, `/experience`, `/projects`,
  `/achievements`, `/astrophotography`, `/blog`, `/links`. Home shows every home
  section; the section routes show only theirs. `go()` in `js/main.js` fades the
  view out (150 ms), swaps, jumps to the top and fades back in (250 ms). Back and
  forward work through `popstate`. No fade with reduced motion.
- **Astrophotography** — its own page with a night palette (`data-night` on
  `<html>`) and a canvas starfield that only runs on that page and pauses when the
  tab is hidden. Gallery thumbnails are local WebP files; the lightbox opens the
  CDN originals.
- **Space Finds flipbook** — pdf.js from cdnjs renders the PDF (hosted on the
  Hack Club CDN, which allows cross-origin fetches) once the book scrolls near.
  Two-page spreads on wide screens, single pages on phones.
- **Achievements** — the old certificate archive lives under "Earlier"; each
  Drive preview only loads when opened.
- **Guestbook** — visitors open a GitHub issue with the template; issues labelled
  `approved` are shown with the signer's GitHub avatar (initials if it fails).
- **Name intro** — plays once per browser session, about 1.2 s, never with
  reduced motion.

## Memo — the blog at /blog

The blog is **Memo**, its own little app: a diary-style list at `/blog`, one page per
memo at `/blog/<slug>`, and a rich-text editor at `/admin`.

```
blog.html          # the reader shell (the API fills in meta tags + data)
admin.html         # the editor
css/memo.css       # Memo's styles; .prose is shared so the editor is WYSIWYG
js/memo.js         # reader: search ("/"), tags, TOC, reading bar, copy-code, image zoom
js/memo-admin.js   # editor: toolbar, fonts/sizes/colours, slash menu, markdown shortcuts,
                   #         paste/drag screenshots, autosave, local backup
api/memo.js        # the whole backend (GitHub as the database)
memo-seed.json     # starting intro + the old portfolio post, used until the first save
dev.mjs            # local server that runs the API too
```

**Storage.** Every save is a git commit to a content repo: `index.json`, `posts/<slug>.json`
and `media/<hash>.webp`. Screenshots are compressed to WebP in the browser before upload.
Nothing about the site redeploys when you write.

**Setup (once).**

1. Create a **private** repo, e.g. `hridhaan-s/memo-content` (tick "Add a README").
2. GitHub → Settings → Developer settings → Fine-grained tokens → new token, only that
   repo, permission **Contents: Read and write**.
3. Vercel → this project → Settings → Environment Variables:
   - `GITHUB_TOKEN` = the token
   - `MEMO_PASSWORD` = your admin password (long)
   - `MEMO_REPO` = `hridhaan-s/memo-content` (this is the default)
4. Redeploy. Open `hridhaan.me/admin`.

**Writing.** Visibility is Draft (only you, autosaves every 20 s), Unlisted (anyone with the
link, not on the list, `noindex`) or Public. Shortcuts: `Ctrl+S` save, `Alt+N` new,
`Ctrl+K` link, `Ctrl+E` inline code, `Ctrl+Alt+1/2/3` headings, `/` for blocks,
`# ` `## ` `- ` `1. ` `[] ` `> ` ```` ``` ```` `---` as markdown shortcuts.
Click an image for size/alignment/alt/caption; click a checklist box to tick it; click a
callout's emoji to change it.

RSS lives at `/blog/rss.xml`. Old `/blog#post-…` links redirect to the new URLs.

## Running locally

```bash
node dev.mjs            # http://localhost:8000, Memo works too (admin password: memo)
python3 serve.py        # the old way: site only, no Memo API
```

A plain static server (or VS Code Live Server) works from `/`, but refreshing
on `/projects` or `/astrophotography` will 404 there because it doesn't do the
rewrite Vercel does. `serve.py` does.
