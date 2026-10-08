

(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const ed = $("ed");
  const titleEl = $("title");
  const statusEl = $("status");

  const state = {
    token: null,
    posts: [],
    settings: {},
    current: null,      
    dirty: false,
    saving: false,
    uploads: 0,
    filter: "all",
    lastRange: null,
    selImg: null
  };


  

  try { state.token = localStorage.getItem("memo-token"); } catch (e) {}

  async function api(method, query, body) {
    const res = await fetch("/api/memo" + (query || ""), {
      method,
      headers: Object.assign({ "Content-Type": "application/json" }, state.token ? { Authorization: "Bearer " + state.token } : {}),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && body && body.action !== "login") { logout(); throw new Error("Session expired. Log in again."); }
    if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
    return data;
  }

  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    $("loginBtn").disabled = true;
    $("loginErr").textContent = "";
    try {
      const d = await api("POST", "", { action: "login", password: $("pw").value });
      state.token = d.token;
      try { localStorage.setItem("memo-token", d.token); } catch (e2) {}
      $("pw").value = "";
      await startApp();
      if (!d.configured) toast("Heads up: GITHUB_TOKEN isn't set, so saving won't work yet.", 5000);
    } catch (err) {
      $("loginErr").textContent = err.message;
    } finally {
      $("loginBtn").disabled = false;
    }
  });

  function logout() {
    state.token = null;
    try { localStorage.removeItem("memo-token"); } catch (e) {}
    $("app").hidden = true;
    $("stats").hidden = true;
    $("login").hidden = false;
    $("pw").focus();
  }
  $("logoutBtn").addEventListener("click", function () {
    if (state.dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    state.dirty = false;
    logout();
  });


  

  async function loadList() {
    const d = await api("GET", "?admin=list");
    state.posts = d.posts;
    state.settings = d.settings || {};
    $("repoName").textContent = d.repo || "admin";
    renderList();
  }

  function renderList() {
    const q = $("find").value.trim().toLowerCase();
    const items = state.posts.filter(function (p) {
      if (state.filter !== "all" && p.visibility !== state.filter) return false;
      return !q || (p.title + " " + (p.tags || []).join(" ") + " " + p.excerpt).toLowerCase().indexOf(q) !== -1;
    });
    const cur = state.current && !state.current.intro ? state.current.originalSlug : null;
    $("plist").innerHTML = items.length ? items.map(function (p) {
      return '<li><button type="button" data-slug="' + esc(p.slug) + '" class="' + (p.slug === cur ? "on" : "") + '">' +
        '<span class="pt">' + (p.pinned ? "✦ " : "") + esc(p.title) + "</span>" +
        '<span class="pm"><i class="dot ' + p.visibility + '"></i>' + p.visibility + " · " + esc(p.date) + " · " + p.words + "w</span></button></li>";
    }).join("") : '<li class="faint" style="padding:12px 10px;font-size:14px">' + (state.posts.length ? "No matches." : "No memos yet.") + "</li>";
  }

  $("find").addEventListener("input", renderList);
  document.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.filter = b.dataset.f;
      document.querySelectorAll("[data-f]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderList();
    });
  });
  $("plist").addEventListener("click", function (e) {
    const b = e.target.closest("button[data-slug]");
    if (b) openPost(b.dataset.slug);
  });
  $("newBtn").addEventListener("click", function () { newPost(); });
  $("introBtn").addEventListener("click", function () { openIntro(); });
  $("menuBtn").addEventListener("click", function () { $("side").classList.toggle("open"); });


  

  function confirmLeave() {
    return !state.dirty || confirm("You have unsaved changes. Leave them?");
  }

  function showDoc(isIntro) {
    $("emptyState").hidden = true;
    $("doc").hidden = false;
    $("stats").hidden = false;
    $("metaBox").hidden = isIntro;
    titleEl.readOnly = isIntro;
    $("previewBtn").hidden = false;
    $("deleteBtn").hidden = isIntro;
    $("publishBtn").hidden = isIntro;
    $("side").classList.remove("open");
  }

  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function fill(p) {
    titleEl.value = p.title || "";
    $("date").value = p.date || today();
    $("vis").value = p.visibility || "draft";
    $("tags").value = (p.tags || []).join(", ");
    $("pinned").checked = Boolean(p.pinned);
    $("slug").value = p.slug || "";
    $("excerpt").value = p.excerpt || "";
    ed.innerHTML = p.html || "<p><br></p>";
    normalize();
    autosizeTitle();
    stats();
    snapMeta();
  }

  function newPost() {
    if (!confirmLeave()) return;
    state.current = { originalSlug: null, isNew: true };
    showDoc(false);
    fill({ title: "", date: today(), visibility: "draft", html: "<p><br></p>" });
    offerLocalDraft();
    setDirty(false);
    renderList();
    titleEl.focus();
  }

  async function openPost(slug) {
    if (!confirmLeave()) return;
    setStatus("Opening…");
    try {
      const p = await api("GET", "?admin=post&slug=" + encodeURIComponent(slug));
      state.current = { originalSlug: p.slug, isNew: false, updated: p.updated };
      showDoc(false);
      fill(p);
      setDirty(false);
      offerLocalDraft(p.updated);
      renderList();
      setStatus("Opened · last saved " + when(p.updated));
      history.replaceState(null, "", "/admin#" + p.slug);
    } catch (e) { setStatus(e.message, "err"); }
  }

  function openIntro() {
    if (!confirmLeave()) return;
    state.current = { intro: true };
    showDoc(true);
    titleEl.value = "Intro on /blog";
    ed.innerHTML = state.settings.intro || "<p><br></p>";
    normalize();
    autosizeTitle();
    stats();
    setDirty(false);
    renderList();
    setStatus("Editing the intro at the top of /blog");
    history.replaceState(null, "", "/admin#intro");
  }

  function collect() {
    cleanEditor();
    return {
      originalSlug: state.current.originalSlug,
      title: titleEl.value.trim() || "Untitled",
      slug: $("slug").value.trim(),
      date: $("date").value,
      visibility: $("vis").value,
      tags: $("tags").value,
      pinned: $("pinned").checked,
      excerpt: $("excerpt").value.trim(),
      html: editorHTML()
    };
  }

  
  function editorHTML() {
    const clone = ed.cloneNode(true);
    clone.querySelectorAll(".sel").forEach(function (x) { x.classList.remove("sel"); });
    clone.querySelectorAll("[class='']").forEach(function (x) { x.removeAttribute("class"); });
    
    while (clone.lastElementChild && clone.lastElementChild.tagName === "P" && !clone.lastElementChild.textContent.trim() && !clone.lastElementChild.querySelector("img")) {
      clone.lastElementChild.remove();
    }
    return clone.innerHTML;
  }

  async function save(opts) {
    opts = opts || {};
    if (!state.current || state.saving) return;
    if (state.uploads > 0) { setStatus("Waiting for images to finish uploading…"); setTimeout(function () { save(opts); }, 600); return; }
    state.saving = true;
    setStatus(opts.auto ? "Autosaving…" : "Saving…");
    try {
      if (state.current.intro) {
        const d = await api("POST", "", { action: "settings", settings: { intro: editorHTML() } });
        state.settings = d.settings;
        setDirty(false);
        setStatus("Intro saved · " + when(new Date().toISOString()));
        toast("Intro saved");
        return;
      }
      if (opts.publish) $("vis").value = "public";
      const d = await api("POST", "", { action: "save", post: collect() });
      const wasNew = state.current.isNew;
      clearLocalDraft(state.current.originalSlug);
      state.current = { originalSlug: d.post.slug, isNew: false, updated: d.post.updated };
      $("slug").value = d.post.slug;
      snapMeta();
      await loadList();
      setDirty(false);
      history.replaceState(null, "", "/admin#" + d.post.slug);
      const vis = d.post.visibility;
      setStatus((vis === "public" ? "Live" : vis === "unlisted" ? "Saved (unlisted)" : "Draft saved") + " · " + when(d.post.updated));
      if (!opts.auto) toast(opts.publish ? "Published ✦ live in a few seconds" : wasNew ? "Created" : "Saved");
    } catch (e) {
      setStatus(e.message, "err");
      if (!opts.auto) toast(e.message, 4000);
    } finally {
      state.saving = false;
    }
  }

  $("saveBtn").addEventListener("click", function () { save(); });
  $("publishBtn").addEventListener("click", function () { save({ publish: true }); });
  $("previewBtn").addEventListener("click", function () {
    if (!state.current) return;
    if (state.current.intro) { window.open("/blog", "_blank"); return; }
    if (!state.current.originalSlug) { toast("Save it once first."); return; }
    if ($("vis").value === "draft") { toast("Drafts aren't visible on the site. Make it unlisted to preview by link.", 3500); return; }
    if (state.dirty) toast("Showing the last saved version.");
    window.open("/blog/" + state.current.originalSlug, "_blank");
  });
  $("deleteBtn").addEventListener("click", async function () {
    if (!state.current || state.current.intro) return;
    if (state.current.isNew) { state.dirty = false; closeDoc(); return; }
    const ok = await modal("Delete this memo?", "\"" + (titleEl.value || "Untitled") + "\" will disappear from the site. It stays in the git history if you ever need it back.", "Delete");
    if (!ok) return;
    try {
      await api("POST", "", { action: "delete", slug: state.current.originalSlug });
      clearLocalDraft(state.current.originalSlug);
      state.dirty = false;
      closeDoc();
      await loadList();
      toast("Deleted");
    } catch (e) { toast(e.message, 4000); }
  });

  function closeDoc() {
    state.current = null;
    $("doc").hidden = true;
    $("stats").hidden = true;
    $("emptyState").hidden = false;
    setStatus("Ready");
    history.replaceState(null, "", "/admin");
    renderList();
  }

  
  let backupTimer = null, autoTimer = null;
  function setDirty(on) {
    state.dirty = on;
    if (on) {
      setStatus("Unsaved changes", "dirty");
      clearTimeout(backupTimer);
      backupTimer = setTimeout(saveLocalDraft, 600);
      clearTimeout(autoTimer);
      
      if (!state.current.intro && $("vis").value === "draft" && !state.current.isNew) {
        autoTimer = setTimeout(function () { if (state.dirty) save({ auto: true }); }, 20000);
      }
    }
  }

  function draftKey(slug) { return "memo-draft:" + (slug || "new"); }
  function saveLocalDraft() {
    if (!state.current || state.current.intro) return;
    try {
      localStorage.setItem(draftKey(state.current.originalSlug), JSON.stringify({ at: new Date().toISOString(), post: collect() }));
    } catch (e) {}
  }
  function clearLocalDraft(slug) { try { localStorage.removeItem(draftKey(slug)); localStorage.removeItem(draftKey(null)); } catch (e) {} }
  function offerLocalDraft(serverUpdated) {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(draftKey(state.current.originalSlug)) || "null"); } catch (e) {}
    if (!d || (serverUpdated && d.at <= serverUpdated)) return;
    modal("Restore unsaved changes?", "There's a local copy from " + when(d.at) + " that never got saved.", "Restore", "Discard").then(function (ok) {
      if (ok) { fill(Object.assign({}, d.post, { slug: d.post.slug || state.current.originalSlug })); setDirty(true); }
      else clearLocalDraft(state.current.originalSlug);
    });
  }

  
  const META = ["date", "vis", "tags", "pinned", "slug", "excerpt"];
  let metaSnap = "";
  function metaNow() { return META.map(function (id) { return $(id).type === "checkbox" ? $(id).checked : $(id).value; }).join("\u0001"); }
  function snapMeta() { metaSnap = metaNow(); }
  META.forEach(function (id) {
    function onChange() { if (metaNow() !== metaSnap) setDirty(true); }
    $(id).addEventListener("input", onChange);
    $(id).addEventListener("change", onChange);
  });
  titleEl.addEventListener("input", function () { autosizeTitle(); setDirty(true); });
  titleEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); placeCaretStart(ed.firstElementChild || ed); }
  });
  function autosizeTitle() { titleEl.style.height = "auto"; titleEl.style.height = titleEl.scrollHeight + "px"; }

  window.addEventListener("beforeunload", function (e) {
    if (state.dirty) { saveLocalDraft(); e.preventDefault(); e.returnValue = ""; }
  });

  function stats() {
    const text = ed.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    $("stats").textContent = words + " words · " + Math.max(1, Math.round(words / 220)) + " min read";
  }


  

  const I = {
    bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
    italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 5h5M5 19h5M15 5 9 19"/></svg>',
    underline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/></svg>',
    strike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16M16 6.5C15 5 13.6 4.5 12 4.5c-2.5 0-4 1.3-4 3 0 1.2.7 2 2 2.5M8 17.5c1 1.5 2.4 2 4 2 2.6 0 4-1.4 4-3.2 0-.7-.2-1.3-.6-1.8"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 16 6-12 6 12M8.5 11h7"/><path d="M4 20h16" stroke-width="3" stroke="var(--accent)"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 11 6-6 4 4-6 6M9 11l-3 3 4 4 3-3M6 14l-2 4h4"/><path d="M4 21h16" stroke-width="3" stroke="#e6c88f"/></svg>',
    ul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    ol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5c.4-.6 1-.9 1.6-.9.8 0 1.4.5 1.4 1.2 0 1.3-3 2.2-3 4h3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="6" height="6" rx="1.5"/><path d="m4.5 7 1 1 2-2M12 7h9M3 15h6v6H3zM12 18h9"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 7H6a2 2 0 0 0-2 2v4h4v1a3 3 0 0 1-3 3v2a5 5 0 0 0 5-5zm10 0h-4a2 2 0 0 0-2 2v4h4v1a3 3 0 0 1-3 3v2a5 5 0 0 0 5-5z"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
    center: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 9"/></svg>',
    hr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>',
    clear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 5h12M13 5l-4 14M4 19l16-14" opacity=".9"/></svg>'
  };

  const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

  $("tb").innerHTML =
    '<select id="tbBlock" title="Text style" aria-label="Text style">' +
      '<option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>' +
      '<option value="blockquote">Quote</option><option value="pre">Code block</option></select>' +
    '<select id="tbFont" title="Font" aria-label="Font"><option value="">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option><option value="hand">Handwritten</option></select>' +
    '<select id="tbSize" title="Font size" aria-label="Font size"><option value="">Size</option>' + SIZES.map(function (s) { return '<option value="' + s + '">' + s + "px</option>"; }).join("") + '<option value="reset">Default</option></select>' +
    '<span class="sep"></span>' +
    btn("bold", "Bold (Ctrl+B)") + btn("italic", "Italic (Ctrl+I)") + btn("underline", "Underline (Ctrl+U)") + btn("strike", "Strikethrough") + btn("code", "Inline code (Ctrl+E)") +
    btn("link", "Link (Ctrl+K)") + btn("color", "Text colour") + btn("mark", "Highlight (Ctrl+Shift+H)") +
    '<span class="sep"></span>' +
    btn("ul", "Bulleted list") + btn("ol", "Numbered list") + btn("check", "Checklist") + btn("quote", "Quote") +
    '<span class="sep"></span>' +
    btn("left", "Align left") + btn("center", "Align centre") + btn("right", "Align right") +
    '<span class="sep"></span>' +
    btn("image", "Image (or just paste one)") + btn("hr", "Divider") +
    '<button type="button" data-cmd="more" title="More blocks (or type /)" aria-label="More blocks">＋</button>' +
    '<span class="sep"></span>' +
    btn("undo", "Undo (Ctrl+Z)") + btn("redo", "Redo (Ctrl+Shift+Z)") + btn("clear", "Clear formatting");

  function btn(cmd, title) {
    return '<button type="button" data-cmd="' + cmd + '" title="' + title + '" aria-label="' + title.replace(/ \(.*/, "") + '">' + I[cmd] + "</button>";
  }

  
  $("tb").addEventListener("mousedown", function (e) {
    if (e.target.closest("button")) e.preventDefault();
  });
  $("tb").addEventListener("click", function (e) {
    const b = e.target.closest("button[data-cmd]");
    if (b) run(b.dataset.cmd, b);
  });
  $("tbBlock").addEventListener("change", function () { restore(); setBlock(this.value); });
  $("tbFont").addEventListener("change", function () { restore(); applyInline("font", this.value); });
  $("tbSize").addEventListener("change", function () {
    restore();
    applyInline("size", this.value);
    this.value = "";
  });

  function exec(cmd, val) {
    ed.focus();
    document.execCommand(cmd, false, val == null ? null : val);
    afterChange();
  }

  function run(cmd, el) {
    restore();
    switch (cmd) {
      case "bold": case "italic": case "underline": exec(cmd); break;
      case "strike": exec("strikeThrough"); break;
      case "code": toggleInlineCode(); break;
      case "link": linkPop(); break;
      case "color": colorPop(el, "fore"); break;
      case "mark": colorPop(el, "back"); break;
      case "ul": exec("insertUnorderedList"); fixLists(); break;
      case "ol": exec("insertOrderedList"); fixLists(); break;
      case "check": toggleChecklist(); break;
      case "quote": setBlock(currentBlockTag() === "blockquote" ? "p" : "blockquote"); break;
      case "left": exec("justifyLeft"); break;
      case "center": exec("justifyCenter"); break;
      case "right": exec("justifyRight"); break;
      case "image": $("fileIn").click(); break;
      case "hr": insertBlockHTML("<hr>"); break;
      case "more": openSlash(el, true); break;
      case "undo": exec("undo"); break;
      case "redo": exec("redo"); break;
      case "clear": exec("removeFormat"); unwrapStyled(); break;
    }
  }

  function setBlock(tag) {
    if (tag === "pre") {
      const r = sel();
      const text = r ? r.toString() : "";
      if (text && text.indexOf("\n") !== -1) {
        insertBlockHTML("<pre><code>" + esc(text) + "</code></pre>");
        return;
      }
    }
    exec("formatBlock", "<" + tag + ">");
    if (tag === "pre") {
      
      const pre = closest(anchorNode(), "pre");
      if (pre && !pre.querySelector("code")) {
        const code = document.createElement("code");
        while (pre.firstChild) code.appendChild(pre.firstChild);
        pre.appendChild(code);
        placeCaretEnd(code);
      }
      ensureTrailingP();
    }
  }

  
  function applyInline(kind, value) {
    const r = sel();
    if (!r || r.collapsed) { toast("Select some text first."); return; }
    document.execCommand("styleWithCSS", false, false);
    const made = [];
    if (kind === "font") {
      document.execCommand("fontName", false, "memo-font-x");
      ed.querySelectorAll('font[face="memo-font-x"]').forEach(function (f) {
        
        f.querySelectorAll("[data-font]").forEach(function (inner) { inner.removeAttribute("data-font"); });
        const s = document.createElement("span");
        if (value) s.dataset.font = value;
        while (f.firstChild) s.appendChild(f.firstChild);
        f.replaceWith(s);
        made.push(s);
      });
    } else {
      document.execCommand("fontSize", false, "7");
      ed.querySelectorAll('font[size="7"]').forEach(function (f) {
        f.querySelectorAll("[style]").forEach(function (inner) { inner.style.fontSize = ""; });
        const s = document.createElement("span");
        if (value && value !== "reset") s.style.fontSize = value + "px";
        while (f.firstChild) s.appendChild(f.firstChild);
        f.replaceWith(s);
        made.push(s);
      });
    }
    
    if (made.length) {
      const first = made[0], last = made[made.length - 1];
      const r2 = document.createRange();
      r2.setStartBefore(first.firstChild || first);
      r2.setEndAfter(last.lastChild || last);
      const s2 = window.getSelection(); s2.removeAllRanges(); s2.addRange(r2);
      state.lastRange = r2.cloneRange();
    }
    unwrapStyled(true);
    afterChange();
  }

  
  function unwrapStyled(onlyEmpty) {
    ed.querySelectorAll("span, font").forEach(function (s) {
      if (s.tagName === "FONT" && !onlyEmpty) { unwrap(s); return; }
      if (!s.attributes.length || (s.getAttribute("style") === "" && s.attributes.length === 1)) unwrap(s);
    });
    if (!onlyEmpty) ed.querySelectorAll("[data-font]").forEach(function (x) {
      const r = sel();
      if (r && r.intersectsNode(x)) x.removeAttribute("data-font");
    });
  }

  function toggleInlineCode() {
    const r = sel();
    if (!r) return;
    const inCode = closest(r.startContainer, "code");
    if (inCode && !closest(inCode, "pre")) { unwrap(inCode); afterChange(); return; }
    if (r.collapsed) { exec("insertHTML", "<code>​</code>"); return; }
    exec("insertHTML", "<code>" + esc(r.toString()) + "</code>&#8203;");
  }

  function toggleChecklist() {
    let ul = closest(anchorNode(), "ul");
    if (ul && ul.dataset.type === "checklist") { exec("insertUnorderedList"); return; }
    if (!ul) { exec("insertUnorderedList"); fixLists(); ul = closest(anchorNode(), "ul"); }
    if (ul) { ul.dataset.type = "checklist"; afterChange(); }
  }

  
  function fixLists() {
    const bad = ed.querySelectorAll("p > ul, p > ol");
    if (!bad.length) return;
    const r = sel();
    const keep = r ? [r.startContainer, r.startOffset, r.endContainer, r.endOffset] : null;
    bad.forEach(function (l) { l.parentNode.replaceWith(l); });
    if (keep && ed.contains(keep[0]) && ed.contains(keep[2])) {
      const n = document.createRange();
      n.setStart(keep[0], keep[1]); n.setEnd(keep[2], keep[3]);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(n);
      state.lastRange = n.cloneRange();
    }
  }

  
  function insertCodeText(text) {
    const r = sel();
    if (!r) return;
    const pre = closest(r.startContainer, "pre");
    const code = pre && (pre.querySelector("code") || pre);
    r.deleteContents();
    const t = document.createTextNode(text);
    r.insertNode(t);
    
    const after = document.createRange();
    after.setStartAfter(t);
    if (code) after.setEnd(code, code.childNodes.length);
    if (text.endsWith("\n") && !after.toString().length) t.textContent += "\n";
    const c = document.createRange();
    c.setStart(t, text.length); c.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(c);
    state.lastRange = c.cloneRange();
    if (code) code.normalize();
    afterChange();
  }

  
  function updateToolbar() {
    if (!document.activeElement || !ed.contains(document.activeElement) && document.activeElement !== ed) return;
    ["bold", "italic", "underline"].forEach(function (c) { mark(c, document.queryCommandState(c)); });
    mark("strike", document.queryCommandState("strikeThrough"));
    const n = anchorNode();
    mark("code", Boolean(closest(n, "code")) && !closest(n, "pre"));
    mark("link", Boolean(closest(n, "a")));
    const ul = closest(n, "ul");
    mark("check", Boolean(ul && ul.dataset.type === "checklist"));
    mark("ul", Boolean(ul && ul.dataset.type !== "checklist"));
    mark("ol", Boolean(closest(n, "ol")));
    mark("quote", Boolean(closest(n, "blockquote")));
    const tag = currentBlockTag();
    $("tbBlock").value = ["h1", "h2", "h3", "blockquote", "pre"].indexOf(tag) !== -1 ? tag : "p";
    const fontEl = closest(n, "[data-font]");
    $("tbFont").value = fontEl ? fontEl.dataset.font : "";
  }
  function mark(cmd, on) {
    const b = $("tb").querySelector('[data-cmd="' + cmd + '"]');
    if (b) b.classList.toggle("on", Boolean(on));
  }

  function currentBlockTag() {
    const b = closest(anchorNode(), "h1,h2,h3,blockquote,pre,p,li");
    return b ? b.tagName.toLowerCase() : "p";
  }


  

  document.addEventListener("selectionchange", function () {
    const s = window.getSelection();
    if (s.rangeCount && ed.contains(s.anchorNode)) {
      state.lastRange = s.getRangeAt(0).cloneRange();
      updateToolbar();
    }
  });

  ed.addEventListener("input", function (e) {
    afterChange(true);
    if (e.inputType === "insertText" && e.data === "/") maybeSlash();
    else if (slash && slash.auto) filterSlash();
  });

  function afterChange(fromInput) {
    if (!state.current) return;
    setDirty(true);
    stats();
    if (!fromInput) updateToolbar();
  }

  ed.addEventListener("keydown", function (e) {
    const mod = e.ctrlKey || e.metaKey;
    if (slash && handleSlashKey(e)) return;

    if (mod && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); linkPop(); return; }
    if (mod && !e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); toggleInlineCode(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "h") { e.preventDefault(); document.execCommand("styleWithCSS", false, true); exec("hiliteColor", "rgba(230, 200, 143, .35)"); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "x") { e.preventDefault(); exec("strikeThrough"); return; }
    if (mod && e.altKey && /^[0-3]$/.test(e.key)) { e.preventDefault(); setBlock(e.key === "0" ? "p" : "h" + e.key); return; }

    const pre = closest(anchorNode(), "pre");
    if (pre) {
      if (e.key === "Tab") { e.preventDefault(); exec("insertText", "  "); return; }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const r = sel();
        if (!r) return;
        const code = pre.querySelector("code") || pre;
        const before = textBeforeCaret(code, r);
        const after = code.textContent.slice(before.length);
        
        if (!after.trim() && (before.endsWith("\n") || !before)) {
          code.textContent = before.replace(/\n+$/, "");
          const p = document.createElement("p"); p.innerHTML = "<br>";
          pre.after(p); placeCaretStart(p); afterChange();
          return;
        }
        insertCodeText("\n");
        return;
      }
    }

    if (e.key === "Tab" && closest(anchorNode(), "li")) { e.preventDefault(); exec(e.shiftKey ? "outdent" : "indent"); return; }
    if (e.key === " " && markdownShortcut()) { e.preventDefault(); return; }
    if (e.key === "Enter" && !e.shiftKey && dividerShortcut()) { e.preventDefault(); return; }

    
    if (e.key === "Backspace") {
      const b = closest(anchorNode(), "h1,h2,h3,blockquote");
      const r = sel();
      if (b && r && r.collapsed && !b.textContent.trim()) { e.preventDefault(); setBlock("p"); return; }
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (state.selImg) { e.preventDefault(); state.selImg.remove(); deselectImg(); afterChange(); }
    }
  });

  
  ed.addEventListener("click", function (e) {
    const li = e.target.closest && e.target.closest('ul[data-type="checklist"] > li');
    if (li && e.clientX - li.getBoundingClientRect().left < 22) {
      li.dataset.checked = li.dataset.checked === "true" ? "false" : "true";
      afterChange();
      return;
    }
    const callout = e.target.closest && e.target.closest(".callout");
    if (callout && e.clientX - callout.getBoundingClientRect().left < 44 && e.clientY - callout.getBoundingClientRect().top < 40) {
      const order = ["💡", "⚠️", "📝", "🔭", "🚀", "✅", "❤️"];
      callout.dataset.emoji = order[(order.indexOf(callout.dataset.emoji) + 1) % order.length];
      afterChange();
      return;
    }
    if (e.target.tagName === "IMG") { selectImg(e.target); return; }
    deselectImg();
  });

  
  ed.addEventListener("paste", function (e) {
    const cd = e.clipboardData;
    if (!cd) return;
    const files = Array.prototype.slice.call(cd.files || []).filter(function (f) { return /^image\
    if (files.length) {
      e.preventDefault();
      files.forEach(insertImageFile);
      return;
    }
    const html = cd.getData("text/html");
    if (html && !closest(anchorNode(), "pre")) {
      e.preventDefault();
      exec("insertHTML", tidyPaste(html));
      fixLists();
      uploadDataImages();
      return;
    }
    const text = cd.getData("text/plain");
    if (text && !closest(anchorNode(), "pre") && /^https?:\/\/\S+$/.test(text.trim())) {
      const r = sel();
      if (r && !r.collapsed) { e.preventDefault(); exec("createLink", text.trim()); return; }
    }
    if (text && closest(anchorNode(), "pre")) { e.preventDefault(); insertCodeText(text.replace(/\r\n?/g, "\n")); }
  });

  function tidyPaste(html) {
    const clean = window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "del", "a", "ul", "ol", "li", "blockquote", "pre", "code", "img", "hr", "table", "thead", "tbody", "tr", "th", "td", "mark", "figure", "figcaption", "span", "div"],
      ALLOWED_ATTR: ["href", "src", "alt"]
    });
    const box = document.createElement("div");
    box.innerHTML = clean;
    box.querySelectorAll("h4").forEach(function (h) { const n = document.createElement("h3"); n.innerHTML = h.innerHTML; h.replaceWith(n); });
    box.querySelectorAll("span").forEach(unwrap);
    box.querySelectorAll("div").forEach(function (d) {
      if (d.querySelector("p,div,ul,ol,h1,h2,h3,pre,blockquote,table")) unwrap(d);
      else { const p = document.createElement("p"); p.innerHTML = d.innerHTML; d.replaceWith(p); }
    });
    return box.innerHTML;
  }

  ed.addEventListener("dragover", function (e) {
    if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.types, function (t) { return t === "Files"; })) {
      e.preventDefault();
      showDropHint(true);
    }
  });
  ed.addEventListener("dragleave", function (e) { if (!ed.contains(e.relatedTarget)) showDropHint(false); });
  ed.addEventListener("drop", function (e) {
    showDropHint(false);
    const files = Array.prototype.slice.call(e.dataTransfer && e.dataTransfer.files || []).filter(function (f) { return /^image\
    if (!files.length) return;
    e.preventDefault();
    
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
    if (r) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); state.lastRange = r; }
    files.forEach(insertImageFile);
  });
  function showDropHint(on) {
    let h = document.querySelector(".drop-hint");
    if (on && !h) { h = document.createElement("div"); h.className = "drop-hint"; h.textContent = "Drop to add images"; document.body.appendChild(h); }
    if (!on && h) h.remove();
  }

  $("fileIn").addEventListener("change", function () {
    restore();
    Array.prototype.slice.call(this.files).forEach(insertImageFile);
    this.value = "";
  });

  
  document.addEventListener("keydown", function (e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); if (state.current) save(); }
    if (e.altKey && e.key.toLowerCase() === "n" && !$("app").hidden) { e.preventDefault(); newPost(); }
    if (e.key === "Escape") { closePops(); deselectImg(); }
  });


  

  async function compress(file) {
    
    if (file.type === "image/gif") return { blob: file, type: "image/gif" };
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 2000 / bmp.width);
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise(function (res) { c.toBlob(res, "image/webp", 0.86); });
      if (blob && blob.type === "image/webp" && (blob.size < file.size || scale < 1)) return { blob, type: "image/webp" };
    } catch (e) {  }
    return { blob: file, type: file.type };
  }

  function toBase64(blob) {
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1]); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function uploadBlob(file) {
    const c = await compress(file);
    if (c.blob.size > 4 * 1024 * 1024) throw new Error("That image is over 4 MB even after compressing.");
    const d = await api("POST", "", { action: "upload", type: c.type, data: await toBase64(c.blob) });
    return d.url;
  }

  function insertImageFile(file) {
    const id = "up" + Math.random().toString(36).slice(2, 8);
    const local = URL.createObjectURL(file);
    insertBlockHTML('<img src="' + local + '" alt="" data-uploading="' + id + '" data-width="100">');
    trackUpload(file, id, local);
  }

  async function trackUpload(file, id, local) {
    state.uploads++;
    setStatus("Uploading image…");
    try {
      const url = await uploadBlob(file);
      const img = ed.querySelector('[data-uploading="' + id + '"]');
      if (img) {
        const pre = new Image();
        pre.onload = pre.onerror = function () { img.src = url; img.removeAttribute("data-uploading"); URL.revokeObjectURL(local); };
        pre.src = url;
      }
      setStatus("Image uploaded", "dirty");
    } catch (e) {
      const img = ed.querySelector('[data-uploading="' + id + '"]');
      if (img) img.remove();
      toast(e.message, 4000);
      setStatus(e.message, "err");
    } finally {
      state.uploads--;
      afterChange();
    }
  }

  
  function uploadDataImages() {
    ed.querySelectorAll('img[src^="data:"]').forEach(function (img) {
      const id = "up" + Math.random().toString(36).slice(2, 8);
      img.dataset.uploading = id;
      fetch(img.src).then(function (r) { return r.blob(); }).then(function (b) { trackUpload(b, id, ""); });
    });
  }

  
  function selectImg(img) {
    deselectImg();
    state.selImg = img;
    img.classList.add("sel");
    const p = pop(img, "img");
    const w = img.dataset.width || "100", a = img.dataset.align || "center";
    p.innerHTML =
      '<div class="row">' +
        ["25", "50", "75", "100"].map(function (v) { return '<button type="button" data-w="' + v + '" class="' + (v === w ? "on" : "") + '">' + v + "%</button>"; }).join("") +
        '<span class="sep" style="width:1px;height:18px;background:var(--line)"></span>' +
        [["left", "⇤"], ["center", "↔"], ["right", "⇥"]].map(function (x) { return '<button type="button" data-a="' + x[0] + '" title="Align ' + x[0] + '" class="' + (x[0] === a ? "on" : "") + '">' + x[1] + "</button>"; }).join("") +
        '<button type="button" data-alt>Alt text</button><button type="button" data-cap>Caption</button><button type="button" data-del style="color:#e5484d">Remove</button>' +
      "</div>";
    p.addEventListener("click", async function (e) {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.w) { img.dataset.width = b.dataset.w; }
      if (b.dataset.a) { if (b.dataset.a === "center") delete img.dataset.align; else img.dataset.align = b.dataset.a; }
      if (b.hasAttribute("data-alt")) {
        const v = await ask("Describe the image (for screen readers + link previews)", img.alt);
        if (v !== null) img.alt = v;
      }
      if (b.hasAttribute("data-cap")) {
        let fig = img.closest("figure");
        if (!fig) {
          fig = document.createElement("figure");
          img.replaceWith(fig);
          fig.appendChild(img);
          const cap = document.createElement("figcaption");
          cap.textContent = "Caption";
          fig.appendChild(cap);
          ensureTrailingP();
          deselectImg();
          selectText(cap);
          afterChange();
          return;
        }
      }
      if (b.hasAttribute("data-del")) { (img.closest("figure") || img).remove(); deselectImg(); afterChange(); return; }
      afterChange();
      selectImg(img);
    });
  }
  function deselectImg() {
    if (state.selImg) state.selImg.classList.remove("sel");
    state.selImg = null;
    const p = document.querySelector(".pop.img");
    if (p) p.remove();
  }


  

  const BLOCKS = [
    { k: "h1", n: "Heading 1", d: "Big section title", i: "H1", run: function () { setBlock("h1"); } },
    { k: "h2", n: "Heading 2", d: "Medium title", i: "H2", run: function () { setBlock("h2"); } },
    { k: "h3", n: "Heading 3", d: "Small title", i: "H3", run: function () { setBlock("h3"); } },
    { k: "text paragraph", n: "Text", d: "Plain paragraph", i: "¶", run: function () { setBlock("p"); } },
    { k: "bullet list ul", n: "Bulleted list", d: "- item", i: "•", run: function () { exec("insertUnorderedList"); fixLists(); } },
    { k: "numbered list ol", n: "Numbered list", d: "1. item", i: "1.", run: function () { exec("insertOrderedList"); fixLists(); } },
    { k: "todo checklist task", n: "Checklist", d: "[] item", i: "☑", run: toggleChecklist },
    { k: "quote", n: "Quote", d: "> a quote", i: "❝", run: function () { setBlock("blockquote"); } },
    { k: "code", n: "Code block", d: "``` with highlighting", i: "{}", run: function () { setBlock("pre"); } },
    { k: "image photo screenshot", n: "Image", d: "Upload, or just paste one", i: "▣", run: function () { $("fileIn").click(); } },
    { k: "callout note tip", n: "Callout", d: "Box with an emoji (click it to change)", i: "💡", run: function () { insertBlockHTML('<div class="callout" data-emoji="💡"><p>Something worth noticing.</p></div>', true); } },
    { k: "warning callout", n: "Warning", d: "Heads-up box", i: "⚠️", run: function () { insertBlockHTML('<div class="callout" data-emoji="⚠️"><p>Careful with this one.</p></div>', true); } },
    { k: "toggle details collapse spoiler", n: "Toggle", d: "Click to reveal", i: "▸", run: function () { insertBlockHTML("<details open><summary>Click to reveal</summary><p>Hidden content.</p></details>", true); } },
    { k: "table grid", n: "Table", d: "3 × 3", i: "▦", run: function () { insertBlockHTML("<table><thead><tr><th>Column</th><th>Column</th><th>Column</th></tr></thead><tbody><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></tbody></table>", true); } },
    { k: "divider hr line", n: "Divider", d: "· · ·", i: "—", run: function () { insertBlockHTML("<hr>"); } },
    { k: "date today", n: "Today's date", d: "Insert " + today(), i: "📅", run: function () { exec("insertText", new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })); } }
  ];
  let slash = null;

  function maybeSlash() {
    const b = closest(anchorNode(), "p,h1,h2,h3,li,div");
    if (!b || closest(anchorNode(), "pre")) return;
    if (b.textContent.trim() === "/") openSlash(null, false);
  }

  function openSlash(anchorEl, fromButton) {
    closePops();
    const p = pop(anchorEl || caretRect(), "slash");
    slash = { el: p, i: 0, auto: !fromButton, items: BLOCKS, block: closest(anchorNode(), "p,h1,h2,h3,li,div") };
    drawSlash();
    p.addEventListener("mousedown", function (e) { e.preventDefault(); });
    p.addEventListener("click", function (e) {
      const b = e.target.closest("button[data-i]");
      if (b) pickSlash(+b.dataset.i);
    });
  }
  function filterSlash() {
    if (!slash) return;
    const b = slash.block;
    const t = b ? b.textContent : "";
    if (!b || t.indexOf("/") !== 0) { closeSlash(); return; }
    const q = t.slice(1).toLowerCase().trim();
    slash.items = BLOCKS.filter(function (x) { return !q || (x.n + " " + x.k).toLowerCase().indexOf(q) !== -1; });
    slash.i = 0;
    if (!slash.items.length) { closeSlash(); return; }
    drawSlash();
  }
  function drawSlash() {
    slash.el.innerHTML = slash.items.map(function (x, n) {
      return '<button type="button" data-i="' + n + '" class="' + (n === slash.i ? "on" : "") + '"><i>' + x.i + "</i><span>" + x.n + "<small>" + x.d + "</small></span></button>";
    }).join("");
    const on = slash.el.querySelector(".on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }
  function handleSlashKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      slash.i = (slash.i + (e.key === "ArrowDown" ? 1 : -1) + slash.items.length) % slash.items.length;
      drawSlash();
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pickSlash(slash.i); return true; }
    if (e.key === "Escape") { e.preventDefault(); closeSlash(); return true; }
    return false;
  }
  function pickSlash(n) {
    const item = slash.items[n];
    const b = slash.block;
    const auto = slash.auto;
    closeSlash();
    if (auto && b && b.textContent.indexOf("/") === 0) { b.innerHTML = "<br>"; placeCaretStart(b); }
    else restore();
    item.run();
  }
  function closeSlash() { if (slash) { slash.el.remove(); slash = null; } }

  
  function markdownShortcut() {
    const r = sel();
    if (!r || !r.collapsed) return false;
    const b = closest(r.startContainer, "p,div");
    if (!b || b === ed || closest(b, "li,pre,blockquote,td,th")) return false;
    const before = textBeforeCaret(b, r);
    const map = { "#": "h1", "##": "h2", "###": "h3", ">": "blockquote", "```": "pre" };
    let action = null;
    if (map[before]) action = function () { setBlock(map[before]); };
    else if (before === "-" || before === "*") action = function () { exec("insertUnorderedList"); fixLists(); };
    else if (/^1[.)]$/.test(before)) action = function () { exec("insertOrderedList"); fixLists(); };
    else if (before === "[]" || before === "[ ]") action = toggleChecklist;
    if (!action) return false;
    
    const range = document.createRange();
    range.setStart(b, 0);
    range.setEnd(r.startContainer, r.startOffset);
    range.deleteContents();
    if (!b.textContent && !b.querySelector("br")) b.innerHTML = "<br>";
    placeCaretStart(b);
    action();
    return true;
  }
  function dividerShortcut() {
    const b = closest(anchorNode(), "p");
    if (!b || b.parentNode !== ed || b.textContent.trim() !== "---") return false;
    b.innerHTML = "<br>";
    placeCaretStart(b);
    insertBlockHTML("<hr>");
    return true;
  }


  

  function pop(anchor, cls) {
    closePops(cls === "img");
    const p = document.createElement("div");
    p.className = "pop " + (cls || "");
    document.body.appendChild(p);
    const rect = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
    const top = window.scrollY + (cls === "img" ? Math.max(rect.top + 8, 60) : rect.bottom + 6);
    p.style.top = top + "px";
    p.style.left = Math.max(8, Math.min(window.scrollX + rect.left, window.scrollX + document.documentElement.clientWidth - 300)) + "px";
    return p;
  }
  function closePops(keepImg) {
    document.querySelectorAll(".pop").forEach(function (p) { if (!(keepImg && p.classList.contains("img"))) p.remove(); });
    slash = null;
  }
  document.addEventListener("mousedown", function (e) {
    if (!e.target.closest(".pop") && !e.target.closest(".tb") && e.target.tagName !== "IMG") closePops();
  });

  function ask(label, value) {
    return new Promise(function (resolve) {
      const bg = document.createElement("div");
      bg.className = "modal-bg";
      bg.innerHTML = '<form class="modal"><h3></h3><input class="field" style="width:100%;margin:6px 0 16px"><div class="actions"><button type="button" class="btn ghost">Cancel</button><button class="btn primary">OK</button></div></form>';
      bg.querySelector("h3").textContent = label;
      const input = bg.querySelector("input");
      input.value = value || "";
      document.body.appendChild(bg);
      input.focus(); input.select();
      function done(v) { bg.remove(); resolve(v); }
      bg.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); done(input.value); });
      bg.querySelector(".ghost").addEventListener("click", function () { done(null); });
      bg.addEventListener("keydown", function (e) { if (e.key === "Escape") done(null); });
    });
  }

  function modal(title, text, okLabel, cancelLabel) {
    return new Promise(function (resolve) {
      const bg = document.createElement("div");
      bg.className = "modal-bg";
      bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3></h3><p></p><div class="actions"><button type="button" class="btn ghost" data-no></button><button type="button" class="btn primary" data-yes></button></div></div>';
      bg.querySelector("h3").textContent = title;
      bg.querySelector("p").textContent = text;
      bg.querySelector("[data-yes]").textContent = okLabel || "OK";
      bg.querySelector("[data-no]").textContent = cancelLabel || "Cancel";
      document.body.appendChild(bg);
      bg.querySelector("[data-yes]").focus();
      function done(v) { bg.remove(); resolve(v); }
      bg.querySelector("[data-yes]").addEventListener("click", function () { done(true); });
      bg.querySelector("[data-no]").addEventListener("click", function () { done(false); });
      bg.addEventListener("keydown", function (e) { if (e.key === "Escape") done(false); });
    });
  }

  async function linkPop() {
    const r = sel();
    const existing = closest(anchorNode(), "a");
    const saved = r ? r.cloneRange() : null;
    if (existing && (!r || r.collapsed)) {
      const range = document.createRange(); range.selectNodeContents(existing);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(range);
      state.lastRange = range;
    }
    const url = await ask(existing ? "Edit link (empty removes it)" : "Link to", existing ? existing.getAttribute("href") : "https://");
    restore(existing ? null : saved);
    if (url === null) return;
    const clean = url.trim();
    if (!clean || clean === "https://") { exec("unlink"); return; }
    const href = /^(https?:|mailto:|\/|#)/i.test(clean) ? clean : "https://" + clean;
    const cur = sel();
    if (cur && cur.collapsed && !existing) exec("insertHTML", '<a href="' + esc(href) + '">' + esc(clean.replace(/^https?:\/\//, "")) + "</a>");
    else exec("createLink", href);
  }

  const FORE = [["Default", "inherit"], ["Red", "#e5484d"], ["Orange", "#f2994a"], ["Yellow", "#e6c88f"], ["Green", "#3fb950"], ["Mint", "#9fd3b4"], ["Blue", "#58a6ff"], ["Purple", "#b392f0"], ["Pink", "#f778ba"], ["Grey", "#8f9b96"]];
  const BACK = [["None", "transparent"], ["Yellow", "rgba(230, 200, 143, .35)"], ["Green", "rgba(63, 185, 80, .25)"], ["Blue", "rgba(88, 166, 255, .25)"], ["Purple", "rgba(179, 146, 240, .28)"], ["Pink", "rgba(247, 120, 186, .25)"], ["Red", "rgba(229, 72, 77, .25)"]];
  function colorPop(anchor, kind) {
    const r = sel();
    if (!r || r.collapsed) { toast("Select some text first."); return; }
    const p = pop(anchor, "color");
    const list = kind === "fore" ? FORE : BACK;
    p.innerHTML = '<div class="lbl">' + (kind === "fore" ? "Text colour" : "Highlight") + '</div><div class="row">' + list.map(function (c, i) {
      const bgc = kind === "fore" ? (c[1] === "inherit" ? "var(--text)" : c[1]) : (c[1] === "transparent" ? "transparent" : c[1]);
      return '<button type="button" class="swatch" data-c="' + i + '" title="' + c[0] + '" style="background:' + bgc + (c[1] === "transparent" ? ";background-image:linear-gradient(45deg,transparent 45%,#e5484d 45%,#e5484d 55%,transparent 55%)" : "") + '"></button>';
    }).join("") + "</div>";
    p.addEventListener("mousedown", function (e) { e.preventDefault(); });
    p.addEventListener("click", function (e) {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      restore();
      document.execCommand("styleWithCSS", false, true);
      exec(kind === "fore" ? "foreColor" : "hiliteColor", list[+b.dataset.c][1]);
      document.execCommand("styleWithCSS", false, false);
      closePops();
    });
  }


  

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sel() {
    const s = window.getSelection();
    return s.rangeCount && ed.contains(s.getRangeAt(0).commonAncestorContainer) ? s.getRangeAt(0) : null;
  }
  function restore(range) {
    const live = window.getSelection();
    if (!range && live.rangeCount && ed.contains(live.getRangeAt(0).commonAncestorContainer)) {
      
      const keep = live.getRangeAt(0).cloneRange();
      ed.focus({ preventScroll: true });
      live.removeAllRanges();
      live.addRange(keep);
      state.lastRange = keep;
      return;
    }
    const r = range || state.lastRange;
    ed.focus({ preventScroll: true });
    if (r && ed.contains(r.commonAncestorContainer)) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
  }
  function anchorNode() {
    const s = window.getSelection();
    return s.rangeCount && ed.contains(s.anchorNode) ? s.anchorNode : null;
  }
  function closest(node, selector) {
    if (!node) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    const found = el && el.closest(selector);
    return found && ed.contains(found) && found !== ed ? found : null;
  }
  function unwrap(el) {
    const p = el.parentNode;
    if (!p) return;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    el.remove();
  }
  function placeCaretStart(el) {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    if (el !== titleEl) ed.focus({ preventScroll: true });
    state.lastRange = r.cloneRange();
  }
  function placeCaretEnd(el) {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    state.lastRange = r.cloneRange();
  }
  function selectText(el) {
    ed.focus();
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function atEndOf(el, r) {
    const t = document.createRange(); t.selectNodeContents(el); t.setStart(r.endContainer, r.endOffset);
    return !t.toString().length;
  }
  function textBeforeCaret(block, r) {
    const t = document.createRange(); t.setStart(block, 0); t.setEnd(r.startContainer, r.startOffset);
    return t.toString();
  }
  function caretRect() {
    const r = sel();
    if (!r) return ed.getBoundingClientRect();
    const rects = r.getClientRects();
    if (rects.length) return rects[0];
    const b = closest(r.startContainer, "p,h1,h2,h3,li,div") || ed;
    return b.getBoundingClientRect();
  }

  
  function insertBlockHTML(html, focusInside) {
    restore();
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const nodes = Array.prototype.slice.call(tmp.childNodes);
    let block = anchorNode();
    while (block && block.parentNode !== ed) block = block.parentNode;
    if (!block || !ed.contains(block)) { nodes.forEach(function (n) { ed.appendChild(n); }); }
    else if (!block.textContent.trim() && block.tagName === "P" && !block.querySelector("img")) {
      nodes.forEach(function (n) { block.parentNode.insertBefore(n, block); });
      block.remove();
    } else {
      let after = block;
      nodes.forEach(function (n) { after.after(n); after = n; });
    }
    const last = nodes[nodes.length - 1];
    let next = last.nextElementSibling;
    if (!next || next.tagName !== "P") {
      next = document.createElement("p"); next.innerHTML = "<br>";
      last.after(next);
    }
    if (focusInside && last.nodeType === 1) {
      const target = last.querySelector("p, summary, th, td") || last;
      selectText(target);
    } else placeCaretStart(next);
    afterChange();
  }

  function ensureTrailingP() {
    const last = ed.lastElementChild;
    if (!last || last.tagName !== "P") { const p = document.createElement("p"); p.innerHTML = "<br>"; ed.appendChild(p); }
  }

  
  function normalize() {
    Array.prototype.slice.call(ed.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) { const p = document.createElement("p"); n.replaceWith(p); p.appendChild(n); }
      else if (n.nodeType === 3) n.remove();
    });
    if (!ed.firstElementChild) ed.innerHTML = "<p><br></p>";
    ensureTrailingP();
  }

  
  function cleanEditor() {
    ed.querySelectorAll("span:not([style]):not([data-font]), font").forEach(unwrap);
    ed.querySelectorAll("code").forEach(function (c) { if (!closest(c, "pre")) c.innerHTML = c.innerHTML.replace(/​/g, ""); });
    ed.querySelectorAll("div:not(.callout)").forEach(function (d) {
      if (d.parentNode === ed && !d.querySelector("p,ul,ol,h1,h2,h3,pre,blockquote")) { const p = document.createElement("p"); p.innerHTML = d.innerHTML; d.replaceWith(p); }
    });
  }

  function when(iso) {
    if (!iso) return "never";
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 45) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status" + (cls ? " " + cls : "");
  }

  function toast(msg, ms) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.classList.remove("on"); }, ms || 1800);
  }

  $("themeBtn").addEventListener("click", function () {
    const root = document.documentElement;
    const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("memo-theme", next); } catch (e) {}
  });


  

  async function startApp() {
    $("login").hidden = true;
    $("app").hidden = false;
    await loadList();
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === "intro") openIntro();
    else if (h === "new") newPost();
    else if (h && state.posts.some(function (p) { return p.slug === h; })) openPost(h);
  }

  
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}

  if (state.token) {
    startApp().catch(function () { logout(); });
  } else {
    $("login").hidden = false;
  }
})();
