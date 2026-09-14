# Phase 1 — 将现有 renderer 从 `web` 改名为 `webapp`

> 执行结果（2026-09-14）：已完成。当前产品包为 `@aisenlens/webapp`，当前代码路径为
> `apps/webapp`；本文件中的 `apps/web` 和 `@aisenlens/web` 只表示拆分前基线。

## Goal

完成：

```text
apps/web
→ apps/webapp

@aisenlens/web
→ @aisenlens/webapp
```

**此 Phase 不迁出任何公开页面。功能、路由、UI 必须保持完全一致。**

这是一个纯 renderer rename + build references 更新。

## Entry Gate

Phase 0 = PASS。

## Step 1 — 目录改名

使用 Git rename：

```bash
git mv apps/web apps/webapp
```

不要 copy + delete。

## Step 2 — Package Rename

修改：

```text
apps/webapp/package.json
```

```json
{
  "name": "@aisenlens/webapp"
}
```

其余 dependencies 不在本 Phase 清理。

## Step 3 — Root Scripts

修改根：

```text
package.json
```

所有原来直接过滤：

```text
@aisenlens/web
```

且属于产品 renderer 的命令改：

```text
@aisenlens/webapp
```

同时新增明确别名：

```text
dev:webapp
build:webapp
lint:webapp
typecheck:webapp
preview:webapp
```

为避免一次性破坏现有开发习惯，本 Phase 可以暂时保留：

```text
dev
build
lint
typecheck
preview
```

继续指向 `webapp`。

等 Phase 4 再赋予 `build:web` / 双站 build 清晰含义。

## Step 4 — Build / Verification Scripts

逐一检查：

```text
scripts/verify-web.mjs
scripts/verify-scene-engine-web-build.mjs
scripts/verify-scene-engine-web-preview.mjs
scripts/prerender-public-routes.mjs
scripts/*
tests/*
```

当前仍然是“同一完整 renderer”，所以本 Phase 中所有旧 `apps/web` 资源路径都先改成 `apps/webapp`。

`prerender-public-routes.mjs` 在本 Phase 仍指向 `webapp`，因为 marketing 尚未迁走。

不要提前改成 webhome。

## Step 5 — Electron

修改：

```text
apps/desktop/package.json
```

```text
build:renderer:
@aisenlens/web
→ @aisenlens/webapp
```

推荐同时把打包资源语义改清楚：

```text
from: ../web/dist
to: web
```

可以二选一：

方案推荐：

```text
from: ../webapp/dist
to: webapp
```

并同步：

```text
apps/desktop/src/main.ts
```

```text
process.resourcesPath/webapp/index.html
../../webapp/dist/index.html
```

如果为了最小改动保留 packaged resource 名 `web`，也可以，但必须在 Phase 报告解释。
默认采用 `webapp`。

## Step 6 — Capacitor

修改：

```text
apps/mobile/package.json
```

```text
@aisenlens/web
→ @aisenlens/webapp
```

修改：

```text
apps/mobile/capacitor.config.ts
```

```ts
webDir: "../webapp/dist"
```

## Step 7 — Docs / Agent Rules

由于目录已经不存在，必须同步更新：

```text
README.md
AGENTS.md
docs/PROJECT_ARCHITECTURE.md
docs/OPERATIONS.md
```

此时描述可以是：

```text
apps/webapp = 当前唯一 React/Vite renderer，暂时仍同时包含公开站和产品页面
```

不要提前宣称 `webhome` 已完成。

AGENTS 中所有规范路径：

```text
apps/web/src
```

改为：

```text
apps/webapp/src
```

并明确这是 Phase 1 后的 canonical frontend root。

## Step 8 — Lockfile

执行：

```bash
corepack pnpm install
```

允许 pnpm 更新 workspace importer path。

不得手改 `pnpm-lock.yaml`。

## Step 9 — Search Old References

必须运行：

```bash
git grep -n "apps/web" -- ':!docs/plans/**' || true
git grep -n "@aisenlens/web" -- ':!docs/plans/**' || true
git grep -n "../web/dist" || true
git grep -n "../../web/dist" || true
```

注意搜索 `apps/web` 会命中 `apps/webapp` 前缀。
因此还要人工判断是否是真正旧路径；可以搜索：

```bash
git grep -nE 'apps/web([^a-zA-Z0-9_-]|$)' || true
git grep -nE '@aisenlens/web([^a-zA-Z0-9_-]|$)' || true
```

## Step 10 — Verification

必须：

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm verify:web
```

如果 Phase 1 已把 root verify script 名保持为 `verify:web`，它必须内部指向 `@aisenlens/webapp`。

建议 smoke：

```bash
corepack pnpm dev:desktop
```

如果执行环境不能打开 GUI，则至少：

```bash
corepack pnpm build:desktop
```

但不要把已有文档中“Desktop 非当前 release blocker”的规则改成强制 gate；这里只验证重命名没有破坏路径。

Mobile：

```bash
corepack pnpm sync:mobile
```

可作为非阻断 smoke；缺少 Android/Xcode 不影响本 Phase，只需 `cap sync` 层面能够引用正确 `webDir`。

## Forbidden in Phase 1

不要：

```text
新增 webhome
删除 Landing/Tutorials
修改路由归属
改 SEO
改 domain
改 Vercel
清理 dependencies
改 IndexedDB schema
```

## Exit Gate

```text
[ ] apps/web 已不存在
[ ] apps/webapp 完整存在
[ ] package = @aisenlens/webapp
[ ] 当前所有旧产品功能仍存在
[ ] Web release gate 通过
[ ] Electron renderer 指向 webapp
[ ] Capacitor webDir 指向 webapp
[ ] AGENTS/README/architecture/operations 与实际路径一致
[ ] 无真实旧 @aisenlens/web 引用
```

## Suggested Commit

```text
refactor: rename web renderer to webapp
```
