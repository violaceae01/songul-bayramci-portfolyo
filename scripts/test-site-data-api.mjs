import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const values = new Map();
const window = {
  location: { hostname: "127.0.0.1" },
  indexedDB: null,
};
const context = {
  console,
  window,
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
};

const source = await readFile(new URL("../js/site-data-api.js", import.meta.url), "utf8");
vm.runInNewContext(source, context, { filename: "site-data-api.js" });

const api = window.SiteDataApi;
const initial = await api.load({ artists: [] });
assert.equal(initial.artists.length, 0);
assert.equal(api.getStorageMode(), "local");

await api.save({ artists: [{ name: "Hande Ünsal" }] });
const reloaded = await api.load({ artists: [] });
assert.equal(reloaded.artists[0].name, "Hande Ünsal");
assert.equal(api.getStorageMode(), "local");

console.log("Local admin persistence tests passed.");
