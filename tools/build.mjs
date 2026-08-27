import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moduleOutput = resolve(repositoryRoot, "dist");

if (relative(repositoryRoot, moduleOutput).startsWith("..")) {
  throw new Error("Refusing to build outside the repository.");
}

await rm(moduleOutput, { recursive: true, force: true });
await mkdir(moduleOutput, { recursive: true });

for (const path of ["module.json", "README.md", "LICENSE", "icons", "lang", "scripts", "styles", "templates"]) {
  await cp(join(repositoryRoot, path), join(moduleOutput, path), { recursive: true });
}

console.log(`Built ${moduleOutput}`);
