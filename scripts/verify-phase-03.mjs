import { spawnSync } from "node:child_process";

const commands = [
  ["verify:web"],
  ["test:analysis-system-browser"],
  ["test:analysis-system-responsive-browser"],
  ["test:analysis-consumer-browser"],
  ["test:overview-analyze-browser"],
  ["test:overview-analyze-sound-browser"],
  ["test:overview-analyze-pressure-browser"],
  ["test:phase-03-calibration-browser"],
];

const executable = process.platform === "win32" ? "corepack.cmd" : "corepack";
for (const [script] of commands) {
  const result = spawnSync(executable, ["pnpm", "run", script], {
    cwd: process.cwd(),
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

console.log("verify:phase-03 passed");
