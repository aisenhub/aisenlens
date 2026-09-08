import { readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = fileURLToPath(new URL("..", import.meta.url))
const testDir = join(root, "tests", "features", "workflow")
const files = readdirSync(testDir)
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => join(testDir, file))

if (!files.length) {
  console.error("未找到 Workflow 测试文件。")
  process.exit(1)
}

const result = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], {
  cwd: root,
  stdio: "inherit",
})
process.exit(result.status ?? 1)
