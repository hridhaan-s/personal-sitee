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

## Adding a blog post

In `index.html`, find the `BLOG` section:

1. Copy one `<a class="card post-card" data-post="…">` inside `#postList` and edit
   the date, title and excerpt. Newest goes first.
2. Copy one `<article class="post" id="…" hidden>` and write the body in its `.prose`.
3. Make the card's `data-post` match the article's `id`. Deep links
   (`/blog#post-my-slug`) work automatically.

## Running locally

```bash
python3 serve.py        # then open http://localhost:8000
```

A plain static server (or VS Code Live Server) works from `/`, but refreshing
on `/projects` or `/astrophotography` will 404 there because it doesn't do the
rewrite Vercel does. `serve.py` does.
