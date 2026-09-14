import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "apps", "webhome", "dist");
const executable = process.platform === "win32" ? "corepack.cmd" : "corepack";

function run(script) {
  const result = spawnSync(executable, ["pnpm", "run", script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const script of ["typecheck:webhome", "lint:webhome", "build:webhome"]) {
  run(script);
}

const requiredRoutes = [
  "index.html",
  "features/auto-shot/index.html",
  "features/frame-analysis/index.html",
  "features/reports/index.html",
  "tutorials/index.html",
  "tutorials/auto-shot-workflow/index.html",
  "tutorials/shot-language-analysis/index.html",
  "tutorials/what-is-video-pian/index.html",
  "glossary/index.html",
  "changelog/index.html",
  "privacy/index.html",
  "terms/index.html",
  "robots.txt",
  "sitemap.xml",
];

const missing = requiredRoutes.filter((route) => !existsSync(join(dist, route)));
if (missing.length > 0) {
  console.error(`WebHome prerender artifacts missing: ${missing.join(", ")}`);
  process.exit(1);
}

const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
if (!indexHtml.includes("https://lens.aisenhub.com/")) {
  console.error("WebHome index.html is missing the lens.aisenhub.com canonical/SITE_URL.");
  process.exit(1);
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const files = collectFiles(dist);
const totalBytes = files.reduce((total, path) => total + statSync(path).size, 0);
const jsFiles = files.filter((path) => path.endsWith(".js"));
const largestJs = jsFiles
  .map((path) => ({ path, bytes: statSync(path).size }))
  .sort((a, b) => b.bytes - a.bytes)[0];

console.log(
  `WebHome dist snapshot: ${files.length} files, ${totalBytes} bytes total, `
    + `${jsFiles.length} JS chunks, largest ${largestJs ? `${relative(dist, largestJs.path)} (${largestJs.bytes} bytes)` : "none"}`,
);
console.log("verify:webhome passed");
