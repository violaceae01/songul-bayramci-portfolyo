const SITE_DATA_SCHEMA = `
CREATE TABLE IF NOT EXISTS site_data (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
)
`;

const MAX_DATA_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function json(value, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value), { ...init, headers });
}

async function ensureSchema(env) {
  if (!env.DB) throw new Error("D1 binding is unavailable");
  await env.DB.prepare(SITE_DATA_SCHEMA).run();
}

function authenticatedEmail(request) {
  return (request.headers.get("oai-authenticated-user-email") || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function adminEmails(env) {
  return String(env.ADMIN_EMAILS || "")
    .split(/[;,\s]+/)
    .map((value) => value.trim().toLocaleLowerCase("tr-TR"))
    .filter(Boolean);
}

function adminState(request, env) {
  const email = authenticatedEmail(request);
  const allowed = adminEmails(env);
  return {
    authenticated: Boolean(email),
    authorized: Boolean(email && allowed.includes(email)),
    configured: allowed.length > 0,
    email,
  };
}

function requireAdmin(request, env) {
  const state = adminState(request, env);
  if (!state.configured) {
    return json({ error: "Yönetici hesabı henüz yapılandırılmadı." }, { status: 503 });
  }
  if (!state.authenticated) {
    return json({ error: "Bu işlem için giriş yapmalısınız." }, { status: 401 });
  }
  if (!state.authorized) {
    return json({ error: "Bu hesabın yönetim yetkisi yok." }, { status: 403 });
  }
  return null;
}

async function readSiteData(env) {
  await ensureSchema(env);
  const row = await env.DB.prepare(
    "SELECT payload, updated_at FROM site_data WHERE id = 1",
  ).first();
  if (!row) return { data: null, updatedAt: null };
  return { data: JSON.parse(row.payload), updatedAt: row.updated_at };
}

async function writeSiteData(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_DATA_BYTES) {
    return json({ error: "Site verisi izin verilen boyutu aşıyor." }, { status: 413 });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Geçersiz JSON verisi." }, { status: 400 });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json({ error: "Geçersiz site verisi." }, { status: 400 });
  }

  const payload = JSON.stringify(data);
  if (new TextEncoder().encode(payload).byteLength > MAX_DATA_BYTES) {
    return json({ error: "Site verisi izin verilen boyutu aşıyor." }, { status: 413 });
  }
  if (payload.includes("data:image/")) {
    return json({ error: "Görseller önce dosya deposuna yüklenmelidir." }, { status: 400 });
  }

  await ensureSchema(env);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_data (id, payload, updated_at, updated_by)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       payload = excluded.payload,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  )
    .bind(payload, now, authenticatedEmail(request))
    .run();

  return json({ ok: true, updatedAt: now });
}

function safeExtension(filename, contentType) {
  const fromName = String(filename || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const typeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return typeMap[contentType] || "img";
}

async function uploadImage(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.FILES) return json({ error: "Dosya deposu kullanılamıyor." }, { status: 503 });

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Yükleme verisi okunamadı." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return json({ error: "Lütfen geçerli bir görsel dosyası seçin." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return json({ error: "Görsel en fazla 20 MB olabilir." }, { status: 413 });
  }

  const extension = safeExtension(file.name, file.type);
  const day = new Date().toISOString().slice(0, 10);
  const key = `uploads/${day}/${crypto.randomUUID()}.${extension}`;
  await env.FILES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name.slice(0, 200) },
  });

  const publicPath = `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  return json({ ok: true, url: publicPath, key }, { status: 201 });
}

async function serveMedia(url, env) {
  if (!env.FILES) return new Response("Not found", { status: 404 });
  const encodedKey = url.pathname.slice("/media/".length);
  let key;
  try {
    key = encodedKey.split("/").map(decodeURIComponent).join("/");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!key || key.includes("..")) return new Response("Bad request", { status: 400 });

  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/site-data" && request.method === "GET") {
        return json(await readSiteData(env));
      }
      if (url.pathname === "/api/site-data" && request.method === "PUT") {
        return writeSiteData(request, env);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        return uploadImage(request, env);
      }
      if (url.pathname === "/api/admin/session" && request.method === "GET") {
        return json(adminState(request, env));
      }
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        return serveMedia(url, env);
      }
    } catch (error) {
      console.error("Site API error", error);
      return json({ error: "Sunucu işlemi tamamlanamadı." }, { status: 500 });
    }

    if (url.pathname === "/") {
      url.pathname = "/index.html";
      request = new Request(url, request);
    }

    return env.ASSETS.fetch(request);
  },
};
