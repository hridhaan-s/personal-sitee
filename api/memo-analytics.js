import crypto from "crypto";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://cjywdvaitaasxtmgpwas.supabase.co").replace(/\/+$/, "");
const SITE = (process.env.MEMO_SITE_URL || "https://hridhaan.me").replace(/\/+$/, "");
const TABLE = "memo_analytics_events";
const rateBuckets = new Map();

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).send(JSON.stringify(body));
}

function secret() {
  return process.env.MEMO_SECRET ||
    crypto.createHash("sha256").update("memo|" + (process.env.MEMO_PASSWORD || "") + "|" + (process.env.GITHUB_TOKEN || "")).digest("hex");
}

function sign(exp) {
  return crypto.createHmac("sha256", secret()).update("memo-admin|" + exp).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function authed(req) {
  const match = /^Bearer (\d+)\.([a-f0-9]{64})$/.exec(req.headers.authorization || "");
  if (!match || !process.env.MEMO_PASSWORD || Number(match[1]) < Date.now()) return false;
  return safeEqual(sign(match[1]), match[2]);
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function supabaseHeaders(extra) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  }, extra || {});
}

async function insertEvent(row) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + TABLE, {
    method: "POST",
    headers: supabaseHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error("Analytics storage failed (" + res.status + "): " + message.slice(0, 220));
  }
}

async function readEvents(days) {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  const params = new URLSearchParams({
    select: "slug,event_type,visitor_id,session_id,referrer_host,device_type,progress,duration_seconds,created_at",
    created_at: "gte." + start,
    order: "created_at.asc",
    limit: "10000"
  });
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + TABLE + "?" + params.toString(), {
    headers: supabaseHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error("Analytics query failed (" + res.status + "): " + message.slice(0, 220));
  }
  return res.json();
}

function summarize(events, days) {
  const views = events.filter(e => e.event_type === "page_view");
  const durations = events.filter(e => e.event_type === "reading_time" && Number.isFinite(e.duration_seconds));
  const visitors = new Set(views.map(e => e.visitor_id));
  const sessions = new Set(views.map(e => e.session_id));
  const totalDuration = durations.reduce((sum, e) => sum + e.duration_seconds, 0);
  const posts = new Map();
  const sources = new Map();
  const devices = new Map();
  const progress = new Map();
  const daily = new Map();

  function postFor(slug) {
    if (!posts.has(slug)) posts.set(slug, { slug, views: 0, readers: new Set(), durations: [], completions: 0 });
    return posts.get(slug);
  }

  for (const e of events) {
    const day = String(e.created_at || "").slice(0, 10);
    if (day) {
      if (!daily.has(day)) daily.set(day, { date: day, views: 0, visitors: new Set() });
      if (e.event_type === "page_view") {
        daily.get(day).views++;
        daily.get(day).visitors.add(e.visitor_id);
      }
    }
    const post = postFor(e.slug);
    if (e.event_type === "page_view") {
      post.views++;
      post.readers.add(e.visitor_id);
      if (e.referrer_host) sources.set(e.referrer_host, (sources.get(e.referrer_host) || 0) + 1);
      devices.set(e.device_type || "unknown", (devices.get(e.device_type || "unknown") || 0) + 1);
    } else if (e.event_type === "reading_time" && Number.isFinite(e.duration_seconds)) {
      post.durations.push(e.duration_seconds);
    } else if (e.event_type === "reading_progress" && Number.isFinite(e.progress)) {
      progress.set(e.progress, (progress.get(e.progress) || 0) + 1);
      if (e.progress === 100) post.completions++;
    }
  }

  const dailyRows = [];
  const first = new Date(Date.now() - (days - 1) * 86400000);
  first.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(first.getTime() + i * 86400000).toISOString().slice(0, 10);
    const row = daily.get(d) || { date: d, views: 0, visitors: new Set() };
    dailyRows.push({ date: d, views: row.views, visitors: row.visitors.size });
  }

  const topPosts = Array.from(posts.values()).map(p => ({
    slug: p.slug,
    views: p.views,
    readers: p.readers.size,
    avgReadSeconds: p.durations.length ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length) : 0,
    completionRate: p.views ? Math.round((p.completions / p.views) * 100) : 0
  })).sort((a, b) => b.views - a.views).slice(0, 20);

  return {
    days,
    generatedAt: new Date().toISOString(),
    truncated: events.length >= 10000,
    totals: {
      views: views.length,
      visitors: visitors.size,
      sessions: sessions.size,
      avgReadSeconds: durations.length ? Math.round(totalDuration / durations.length) : 0,
      completedReads: progress.get(100) || 0
    },
    daily: dailyRows,
    topPosts,
    sources: Array.from(sources, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    devices: Array.from(devices, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    progress: [25, 50, 75, 100].map(value => ({ value, count: progress.get(value) || 0 }))
  };
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    const siteHost = new URL(SITE).hostname.toLowerCase();
    return host === siteHost || host === "www." + siteHost || host === "localhost" || host === "127.0.0.1";
  } catch (e) {
    return false;
  }
}

function rateLimited(visitorId) {
  const now = Date.now();
  const current = rateBuckets.get(visitorId);
  if (!current || now - current.start > 60000) {
    rateBuckets.set(visitorId, { start: now, count: 1 });
    if (rateBuckets.size > 4000) rateBuckets.delete(rateBuckets.keys().next().value);
    return false;
  }
  current.count++;
  return current.count > 90;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (req.query && req.query.admin === "1") {
      if (!authed(req)) return json(res, 401, { error: "Log in again." });
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: "Add SUPABASE_SERVICE_ROLE_KEY to the Vercel environment to enable analytics storage." });
      const days = Math.max(7, Math.min(90, Number.parseInt(req.query.days, 10) || 30));
      try {
        const events = await readEvents(days);
        return json(res, 200, summarize(events, days));
      } catch (e) {
        console.error(e);
        return json(res, 500, { error: e.message || "Could not load analytics." });
      }
    }
    return json(res, 404, { error: "Not found." });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  if (!allowedOrigin(req)) return json(res, 403, { error: "Origin not allowed." });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: "Analytics storage is not configured." });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (body.action !== "track") return json(res, 400, { error: "Unknown action." });

  const slug = String(body.slug || "").toLowerCase();
  const type = String(body.eventType || "");
  const visitor = String(body.visitorId || "");
  const session = String(body.sessionId || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return json(res, 400, { error: "Invalid article." });
  if (!["page_view", "reading_progress", "reading_time"].includes(type)) return json(res, 400, { error: "Invalid event." });
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(visitor) || !/^[a-zA-Z0-9-]{16,80}$/.test(session)) return json(res, 400, { error: "Invalid session." });

  const visitorHash = hash(visitor);
  if (rateLimited(visitorHash)) return json(res, 429, { error: "Slow down." });

  const device = ["desktop", "mobile", "tablet"].includes(body.deviceType) ? body.deviceType : "unknown";
  const referrer = String(body.referrer || "");
  let referrerHost = null;
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase().slice(0, 120);
      if (host && host !== new URL(SITE).hostname.toLowerCase()) referrerHost = host;
    } catch (e) {}
  }
  const progress = type === "reading_progress" && [25, 50, 75, 100].includes(Number(body.progress)) ? Number(body.progress) : null;
  if (type === "reading_progress" && progress === null) return json(res, 400, { error: "Invalid reading progress." });
  const duration = type === "reading_time" ? Math.max(0, Math.min(86400, Math.round(Number(body.durationSeconds) || 0))) : null;

  try {
    await insertEvent({
      slug,
      event_type: type,
      visitor_id: visitorHash,
      session_id: hash(session),
      referrer_host: referrerHost,
      device_type: device,
      progress,
      duration_seconds: duration
    });
    return json(res, 202, { ok: true });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "Could not record analytics." });
  }
}
