# personal-sitee

Source for my personal site / portfolio — projects, achievements, astrophotography,
blog and guestbook.

**Live:** [hridhaan.me](https://hridhaan.me)

Built with plain HTML, CSS and JavaScript. No framework, no build step — open
`index.html` and it runs.

---

## Structure

```
.
├── index.html              # Home + Achievements + Blog (client-side routed)
├── archive.html            # Certificate archive (standalone page)
├── sitemap.xml
├── vercel.json             # Rewrites all routes to / so the SPA router works
│
├── css/
│   ├── main.css            # Entry point — imports every partial IN ORDER
│   ├── archive.css         # Styles only used by archive.html
│   ├── guestbook.css
│   ├── _loader.css         # Legacy loader, not imported (kept for reference)
│   └── partials/
│       ├── 01-base.css                  # variables, backgrounds, base hero + sections
│       ├── 02-projects.css              # project cards, icon links, reveal, mobile
│       ├── 03-astro-footer.css          # astrophotography, footer, hero type, cursor
│       ├── 04-about-tools.css           # about links, tools + skills marquees
│       ├── 05-navbar.css                # glass navbar, gold links, mobile nav
│       ├── 06-starfield.css             # dark-mode starfield, shooting stars, nebula
│       ├── 07-pages.css                 # achievements page, spacing, mobile nav
│       ├── 08-intro-hero.css           # intro animation, hero name + hero image
│       ├── 09-guestbook-blog.css        # guestbook + blog
│       ├── 10-career.css                # career / experience section
│       ├── 11-overrides.css             # final grid + card tightening
│       ├── 12-experience.css            # experience + education (.xp-* / .edu-*)
│       ├── 13-sections.css              # projects, banner, astro, tiles, archive, footer badge
│       ├── 14-dark-sky.css              # dark-mode starfield (single source of truth)
│       └── 15-blog.css                  # blog index + post reading view
│
├── js/
│   └── main.js             # Router, nav, hero, reveal, tilt, guestbook
│
├── assets/
│   ├── logos/              # org + school logos used by the experience section
│   ├── img/                # memoji, signature, cursor
│   │   └── misc/           # older photos, not currently referenced
│   ├── projects/           # project thumbnails
│   └── certs/              # certificates shown on the achievements page
│
├── api/
│   └── counter.js          # Visit counter (Vercel serverless function)
│
└── .github/ISSUE_TEMPLATE/
    └── guestbook.yml       # Guestbook entries arrive as GitHub issues
```

## How it works

- **Routing** — `index.html` holds three pages (`#page-home`, `#page-achievements`,
  `#page-blog`). `js/main.js` shows one at a time and updates the URL with
  `history.pushState`. `vercel.json` rewrites every path to `/` so deep links work.
- **One fixed bug worth knowing** — the old `style.css` had a missing `}` inside
  `.hero-image img`. CSS error recovery swallowed every rule after it, so roughly
  the last 1,500 lines of the stylesheet (guestbook, blog, career section, final
  overrides) never reached the browser. The brace is closed now and those rules
  are live.
- **CSS order matters** — `css/main.css` imports the partials in their original
  cascade order. Later partials deliberately override earlier ones, so do not
  reorder the imports.
- **Guestbook** — visitors open a GitHub issue using the template; entries labelled
  `approved` are fetched by `js/main.js` and rendered on the page. The list
  auto-scrolls at 22 px/s; entries are cloned once so the loop is seamless, and
  hover, touch, wheel or scrollbar input pauses it. Speed lives in
  `GUESTBOOK_SPEED` in `js/main.js`.
- **Project previews** — a card with `data-preview` / `data-preview-webm` on its
  `<video>` plays a clip on hover. Nothing downloads until the first hover
  (`preload="none"` plus a lazy `src` swap), WebM is preferred where supported,
  and touch devices keep the still cover. To add one: encode a clip, drop it in
  `assets/projects/`, add the two attributes.
- **Latest commit badge** — the footer pulls the newest commit from the GitHub
  API on every page load, so it updates itself. Falls back to a plain link if
  the API is rate-limited.
- **Org logos** — any `<img data-fallback="XX">` that fails to load is replaced
  with a lettered badge, so a dead logo URL never shows a broken-image icon.

## Adding a blog post

No build step, no CMS. Open `index.html`, find the `PAGE: BLOG` section, and do
three things:

1. **Copy a card.** Duplicate one `<article class="blog-card">` inside
   `.blog-list` and edit the date, read time, title and excerpt. Newest post
   goes at the top.
2. **Copy a post.** Duplicate one `<article class="post hidden">` below the list
   and write the body inside `.post-body`.
3. **Match the ids.** The card's `data-post="post-my-slug"` must equal the
   post's `id="post-my-slug"`. That is the whole wiring.

`js/main.js` picks it up automatically — no JavaScript changes, ever. You get
the reading-progress bar, both back buttons, and a deep link
(`/blog#post-my-slug`) for free.

Inside `.post-body` these are already styled: `<p>`, `<h3>`, `<h4>`, `<ul>`,
`<ol>`, `<blockquote>`, `<code>`, `<pre><code>`, `<img>`, `<hr>` and links. The
first paragraph gets a gold drop cap automatically, so open with a sentence, not
a heading.

Post bodies are set in a system serif (`--serif` in `css/partials/15-blog.css`)
while the rest of the site stays on the system sans. No webfont is downloaded.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Use a server rather than opening the file directly — the absolute paths
(`/css/...`, `/js/...`) and the router both expect a web root.
