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
  "hakkimda.html",
  "iletisim.html",
  "index.html",
  "sanatci.html",
  "songul.html",
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

await cp(
  join(projectRoot, "server", "index.js"),
  join(outputRoot, "server", "index.js"),
);

const hosting = await readFile(
  join(projectRoot, ".openai", "hosting.json"),
  "utf8",
);
await mkdir(join(outputRoot, ".openai"), { recursive: true });
await writeFile(join(outputRoot, ".openai", "hosting.json"), hosting);
await cp(
  join(projectRoot, ".openai", "drizzle"),
  join(outputRoot, ".openai", "drizzle"),
  { recursive: true },
);
