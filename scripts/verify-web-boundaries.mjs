import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? readFiles(path) : [path];
  });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const webhomePackage = readJson("apps/webhome/package.json");
const webhomeDependencies = {
  ...webhomePackage.dependencies,
  ...webhomePackage.devDependencies,
};
for (const dependency of ["@aisenlens/scene-engine", "mediabunny", "@supabase/supabase-js"]) {
  assert(!webhomeDependencies[dependency], `webhome package must not depend on ${dependency}`);
}

const webhomeSource = readFiles(join(root, "apps", "webhome", "src"));
const productImportPatterns = [
  "features/project",
  "features/editor",
  "features/auto-shot",
  "features/media",
  "features/export",
  "features/analysis",
  "features/timeline",
  "packages/scene-engine",
  "services/auth",
];
for (const path of webhomeSource) {
  const content = readFileSync(path, "utf8");
  for (const pattern of productImportPatterns) {
    const importPattern = new RegExp(
      `(?:from\\s*["']|import\\s*\\(["']|require\\s*\\(["'])[^"']*${escapeRegExp(pattern)}`,
    );
    assert(!importPattern.test(content), `webhome source imports forbidden product path ${pattern}: ${path}`);
  }
}

const webappSource = readFiles(join(root, "apps", "webapp", "src"));
for (const forbiddenPath of [
  join(root, "apps", "webapp", "src", "features", "marketing"),
  join(root, "apps", "webapp", "src", "features", "tutorials"),
  join(root, "apps", "webapp", "src", "pages", "LandingPage.tsx"),
  join(root, "apps", "webapp", "src", "pages", "TutorialsPage.tsx"),
  join(root, "apps", "webapp", "src", "features", "marketing", "components", "SeoContentPage.tsx"),
]) {
  assert(!existsSync(forbiddenPath), `webapp retains public ownership path: ${forbiddenPath}`);
}
for (const path of webappSource) {
  const content = readFileSync(path, "utf8");
  assert(!content.includes("features/marketing"), `webapp imports marketing ownership: ${path}`);
  assert(!content.includes("features/tutorials"), `webapp imports tutorials ownership: ${path}`);
}

const desktopPackage = readFileSync(join(root, "apps", "desktop", "package.json"), "utf8");
const desktopMain = readFileSync(join(root, "apps", "desktop", "src", "main.ts"), "utf8");
const mobilePackage = readFileSync(join(root, "apps", "mobile", "package.json"), "utf8");
const capacitorConfig = readFileSync(join(root, "apps", "mobile", "capacitor.config.ts"), "utf8");
assert(desktopPackage.includes("@aisenlens/webapp"), "desktop build must target @aisenlens/webapp");
assert(desktopMain.includes("webapp/dist") && desktopMain.includes('"webapp", "index.html"'), "desktop runtime must load webapp/dist");
assert(desktopPackage.includes("../webapp/dist") && !desktopPackage.includes("../webhome/dist"), "desktop package must include webapp only");
assert(mobilePackage.includes("@aisenlens/webapp"), "mobile sync must target @aisenlens/webapp");
assert(capacitorConfig.includes('webDir: "../webapp/dist"'), "Capacitor webDir must be ../webapp/dist");

const webhomeDist = readFiles(join(root, "apps", "webhome", "dist"));
for (const path of webhomeDist.filter((candidate) => candidate.endsWith(".js"))) {
  const content = readFileSync(path, "utf8");
  for (const forbidden of ["scene-engine", "mediabunny", "supabase"]) {
    assert(!content.includes(forbidden), `webhome build contains forbidden product dependency ${forbidden}: ${path}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("verify:web-boundaries passed");
