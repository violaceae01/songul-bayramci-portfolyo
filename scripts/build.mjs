import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, "dist");
const clientRoot = join(outputRoot, "client");

const staticDirectories = ["assets", "css", "data", "Görsel", "js"];
const staticFiles = [
  "Code_Generated_Image.png",
  "calismalarim.html",
  "grafik-tasarim.html",
  "hakkimda.html",
  "iletisim.html",
  "index.html",
  "klip-cekimleri.html",
  "sanatci.html",
  "songul.html",
  "video-klipleri.html",
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

const workerSource = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      url.pathname = "/index.html";
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
