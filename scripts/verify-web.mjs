import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const commands = [
  ["typecheck"],
  ["lint"],
  ["test:editor-history"],
  ["test:retain-shot-map"],
  ["test:auto-shot-task-state"],
  ["test:auto-shot-media-fingerprint"],
  ["test:auto-shot-adapter"],
  ["test:auto-shot-task-service"],
  ["test:scene-calibration"],
  ["test:auto-shot-contract"],
  ["test:platform-integration"],
  ["test:video-export-boundary"],
  ["build"],
];

const executable = process.platform === "win32" ? "corepack.cmd" : "corepack";
const root = fileURLToPath(new URL("..", import.meta.url));
for (const [script] of commands) {
  const result = spawnSync(executable, ["pnpm", "--filter", "@aisenlens/web", "run", script], {
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
