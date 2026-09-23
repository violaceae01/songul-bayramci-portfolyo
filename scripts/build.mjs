import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, "dist");
const clientRoot = join(outputRoot, "client");

const staticDirectories = ["assets", "css", "data", "Görsel", "js", "storage", "uploads"];
const staticFiles = [
  ".htaccess",
  ".user.ini",
  "api.php",
  "Code_Generated_Image.png",
  "calismalarim.html",
  "grafik-tasarim.html",
  "hakkimda.html",
  "iletisim.html",
  "anasayfa.html",
  "klip-cekimleri.html",
  "referanslar.html",
  "sanatci.html",
  "lmadmin.html",
  "video-klipleri.html",
  "yorumlar.html",
  "youtube.html",
];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(join(outputRoot, "server"), { recursive: true });
await mkdir(clientRoot, { recursive: true });

for (const directory of staticDirectories) {
  await cp(join(projectRoot, directory), join(clientRoot, directory), {
    recursive: true,
  });
}

for (const file of staticFiles) {
  await cp(join(projectRoot, file), join(clientRoot, file));
}

const workerSource = `const cleanPages = new Set([
  "/anasayfa",
  "/calismalarim",
  "/grafik-tasarim",
  "/hakkimda",
  "/iletisim",
  "/klip-cekimleri",
  "/lmadmin",
  "/referanslar",
  "/sanatci",
  "/video-klipleri",
  "/yorumlar",
  "/youtube",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect(new URL("/anasayfa", url).toString(), 301);
    }

    if (url.pathname === "/index" || url.pathname === "/index.html") {
      return Response.redirect(new URL("/anasayfa", url).toString(), 301);
    }

    if (url.pathname === "/songul" || url.pathname === "/songul.html") {
      return Response.redirect(new URL("/lmadmin", url).toString(), 301);
    }

    if (url.pathname.endsWith(".html")) {
      return Response.redirect(new URL(url.pathname.slice(0, -5) || "/anasayfa", url).toString(), 301);
    }

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      return Response.redirect(new URL(url.pathname.slice(0, -1), url).toString(), 301);
    }

    if (cleanPages.has(url.pathname)) {
      url.pathname += ".html";
      request = new Request(url, request);
    }

    return env.ASSETS.fetch(request);
  },
};
`;

await writeFile(join(outputRoot, "server", "index.js"), workerSource);

const hosting = await readFile(
  join(projectRoot, ".openai", "hosting.json"),
  "utf8",
);
await mkdir(join(outputRoot, ".openai"), { recursive: true });
await writeFile(join(outputRoot, ".openai", "hosting.json"), hosting);
