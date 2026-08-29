import assert from "node:assert/strict";
import worker from "../server/index.js";

function createDatabase() {
  const state = { row: null };
  return {
    prepare(sql) {
      const statement = {
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async first() {
          return state.row;
        },
        async run() {
          if (sql.includes("INSERT INTO site_data")) {
            state.row = {
              payload: this.values[0],
              updated_at: this.values[1],
              updated_by: this.values[2],
            };
          }
          return { success: true };
        },
      };
      return statement;
    },
  };
}

function createBucket() {
  const files = new Map();
  return {
    async put(key, stream, options) {
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      files.set(key, { bytes, type: options.httpMetadata.contentType });
    },
    async get(key) {
      const file = files.get(key);
      if (!file) return null;
      return {
        body: file.bytes,
        httpEtag: '"test-etag"',
        writeHttpMetadata(headers) {
          headers.set("content-type", file.type);
        },
      };
    },
  };
}

const env = {
  DB: createDatabase(),
  FILES: createBucket(),
  ADMIN_EMAILS: "admin@example.com",
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

let response = await worker.fetch(new Request("https://site.test/api/site-data"), env);
assert.equal(response.status, 200);
assert.equal((await response.json()).data, null);

response = await worker.fetch(
  new Request("https://site.test/api/site-data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ artists: [] }),
  }),
  env,
);
assert.equal(response.status, 401);

response = await worker.fetch(
  new Request("https://site.test/api/site-data", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "oai-authenticated-user-email": "admin@example.com",
    },
    body: JSON.stringify({ artists: [{ name: "Songül" }] }),
  }),
  env,
);
assert.equal(response.status, 200);

response = await worker.fetch(new Request("https://site.test/api/site-data"), env);
assert.equal((await response.json()).data.artists[0].name, "Songül");

const form = new FormData();
form.append("file", new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" }));
response = await worker.fetch(
  new Request("https://site.test/api/upload", {
    method: "POST",
    headers: { "oai-authenticated-user-email": "admin@example.com" },
    body: form,
  }),
  env,
);
assert.equal(response.status, 201);
const uploaded = await response.json();
assert.match(uploaded.url, /^\/media\/uploads\//);

response = await worker.fetch(new Request(`https://site.test${uploaded.url}`), env);
assert.equal(response.status, 200);
assert.equal(response.headers.get("content-type"), "image/png");

console.log("Worker persistence tests passed.");
