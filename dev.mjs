

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);
process.env.MEMO_LOCAL_DIR = process.env.MEMO_LOCAL_DIR || path.join(ROOT, ".memo-local");
process.env.MEMO_PASSWORD = process.env.MEMO_PASSWORD || "memo";
process.env.MEMO_SITE_URL = process.env.MEMO_SITE_URL || "http://localhost";

const memo = (await import(pathToFileURL(path.join(ROOT, "api", "memo.js")).href)).default;
const port = Number(process.argv[2]) || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain"
};

function wrapRes(res) {
  res.status = function (c) { res.statusCode = c; return res; };
  res.send = function (b) { res.end(b); return res; };
  res.json = function (o) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); return res; };
  return res;
}

async function runMemo(req, res, query) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  req.query = query;
  try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = raw; }
  await memo(req, wrapRes(res));
}

http.createServer(async function (req, res) {
  const url = new URL(req.url, "http://x");
  const p = decodeURIComponent(url.pathname);
  const query = Object.fromEntries(url.searchParams);

  if (p === "/api/memo") return runMemo(req, res, query);
  if (p === "/archive" || p === "/archive.html") { res.writeHead(308, { Location: "/achievements" }); return res.end(); }
  if (p === "/memo/rss.xml" || p === "/memo/feed") return runMemo(req, res, { rss: "1" });
  const m = /^\/memo\/([^/]+)\/?$/.exec(p);
  if (m) return runMemo(req, res, { page: m[1] });
  if (p === "/memo" || p === "/memo/") return runMemo(req, res, { page: "_index" });

  let file = p === "/admin" || p === "/admin/" ? "admin.html" : p.replace(/^\/+/, "");
  let full = path.join(ROOT, file);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) full = path.join(ROOT, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[path.extname(full).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(full).pipe(res);
}).listen(port, function () {
  console.log("http://localhost:" + port + "   (admin: /admin, password: " + process.env.MEMO_PASSWORD + ")");
});
