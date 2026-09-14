import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const executable = process.platform === "win32" ? "corepack.cmd" : "corepack";
const root = fileURLToPath(new URL("..", import.meta.url));

for (const script of ["verify:webhome", "verify:webapp", "verify:web-boundaries"]) {
  const result = spawnSync(executable, ["pnpm", "run", script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`无法运行 ${script}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("verify:web passed");
