# Phase 4 — 拆分验证体系、边界检查、Desktop/Mobile

## Goal

让 CI / 本地验证明确知道：

```text
webhome 是一个 release unit
webapp 是另一个 release unit
```

并防止未来重新耦合。

## Entry Gate

Phase 3 = PASS。

## Step 1 — Rename Product Release Gate

将：

```text
scripts/verify-web.mjs
```

重命名：

```text
scripts/verify-webapp.mjs
```

内部所有：

```text
@aisenlens/web
```

必须已经在 Phase 1 改为：

```text
@aisenlens/webapp
```

根 script：

```text
verify:webapp
```

保留原来产品测试集合：

```text
typecheck
lint
editor history
retain shot map
auto-shot
scene calibration
platform integration
video export boundary
workflow
build
```

不要降低测试覆盖来让拆分通过。

## Step 2 — Create Webhome Release Gate

新增：

```text
scripts/verify-webhome.mjs
```

至少运行：

```text
typecheck:webhome
lint:webhome
build:webhome
```

并额外检查：

```text
关键 prerender HTML 是否存在
sitemap 是否存在
robots 是否存在
canonical / SITE_URL 是否仍是 lens.aisenhub.com
```

## Step 3 — Root Script Semantics

建议最终：

```text
dev:webhome
dev:webapp

build:webhome
build:webapp
build:web = webhome + webapp

verify:webhome
verify:webapp
verify:web = verify:webhome + verify:webapp
```

如果保留：

```text
pnpm build
```

推荐让它执行双站 build，
因为拆分后“项目 Web build”应覆盖两个 Web 发布单元。

如果为了 CI 成本暂时不这么做，
必须在 README 明确 `build` 的语义，不能含糊。

## Step 4 — Add Boundary Guard

推荐新增：

```text
scripts/verify-web-boundaries.mjs
```

检查至少：

### webhome package.json 禁止

```text
@aisenlens/scene-engine
mediabunny
@supabase/supabase-js
```

### webhome source 禁止 product import path

```text
features/project
features/editor
features/auto-shot
features/media
features/export
features/analysis
features/timeline
packages/scene-engine
services/auth
```

### webapp source 禁止 marketing ownership

```text
features/marketing
LandingPage
TutorialsPage
SeoContentPage
```

### shell binding

检查：

```text
desktop → webapp
mobile → webapp
```

失败要 non-zero exit。

根：

```text
verify:web-boundaries
```

并让：

```text
verify:web
```

包含它。

## Step 5 — Webhome Size Snapshot

记录 build 产物：

```text
dist total size
initial JS chunks
largest chunk
```

不需要设武断 KB 阈值，
但要保证没有明显的 product-only chunks。

## Step 6 — Webapp Regression Gate

运行：

```bash
corepack pnpm verify:webapp
```

如果 Scene Engine 测试需要特定 fixture/env，
按现有仓库文档执行，不修改引擎 ABI。

## Step 7 — Desktop

运行：

```bash
corepack pnpm build:desktop
```

确认 Electron package：

```text
不包含 webhome/dist
包含 webapp/dist
```

开发 GUI smoke 如果环境允许：

```bash
corepack pnpm dev:desktop
```

检查：

```text
项目库打开
编辑器打开
外部官网链接由 shell.openExternal 处理
```

不要让 Electron 加载 `webhome`。

## Step 8 — Mobile

运行：

```bash
corepack pnpm sync:mobile
```

确认：

```text
Capacitor webDir = ../webapp/dist
```

平台 IDE build 不是当前拆分阻断条件，除非用户明确要求。

## Step 9 — Docs Final Architecture

更新：

```text
README.md
AGENTS.md
docs/PROJECT_ARCHITECTURE.md
docs/OPERATIONS.md
docs/SEO_DISCOVERABILITY_PLAN.md（如引用旧路径）
```

特别修正：

```text
apps/web = 唯一 UI
```

为：

```text
apps/webapp = 唯一产品 renderer
apps/webhome = 独立公开内容站
```

AGENTS 需要明确：

```text
产品前端规则 → apps/webapp/src
公开内容规则 → apps/webhome/src
```

不要继续写“所有 React 都必须在 apps/webapp”，因为 webhome 现在也是合法 React app。

## Step 10 — Fact Drift

核对架构文档中的：

```text
IndexedDB DATABASE_VERSION
current route ownership
current build commands
```

必须与代码一致。

## Exit Gate

```text
[ ] verify:webhome PASS
[ ] verify:webapp PASS
[ ] verify:web-boundaries PASS
[ ] build:web PASS
[ ] desktop build path correct
[ ] mobile sync path correct
[ ] docs 与真实架构一致
[ ] webhome build 中无产品重依赖
```

## Suggested Commit

```text
build: split web verification and enforce app boundaries
```
