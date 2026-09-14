# Phase 5 — Preview Deployment、Vercel、Supabase 与本地数据迁移准备

## Goal

在不切 Production 的情况下证明：

```text
webhome 可以独立部署
webapp 可以独立部署
Auth 可工作
SPA deep link 可工作
IndexedDB 迁移策略已决定
```

## Entry Gate

Phase 4 = PASS。

## External Mutation Rule

本 Phase 包含外部平台。
Agent 可准备配置，但以下 Production 修改必须获得明确授权：

```text
现有 Vercel Production Project 改 Root Directory
绑定 app.lens.aisenhub.com
从现有 Project 移除 domain
Supabase production redirect allow-list 修改
DNS 修改
```

## Step 1 — 新建 Webapp Vercel Project

从同一 GitHub repo Import：

```text
aisenhub/aisenlens
```

目标配置：

```text
Project: aisenlens-webapp
Root Directory: apps/webapp
Framework: Vite
Build Command: pnpm build
Output Directory: dist
Production Branch: main
```

如果 Vercel Root Directory 模式无法解析 workspace dependency，
核对“include files outside root directory / monorepo dependency”能力，
不要复制 `packages/scene-engine` 到 app 内解决。

## Step 2 — Webapp Environment

Preview / Production 分环境设置：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PLATFORM_API_URL
VITE_PLATFORM_PUBLIC_API_URL
VITE_WEBHOME_URL
```

不要添加 service role。

Preview 的：

```text
VITE_WEBHOME_URL
```

可暂时指 production home 或对应 webhome preview，
但必须在测试记录里写清楚。

## Step 3 — Webapp Preview Verification

使用 Vercel preview URL 测试：

```text
/
/projects
/app
/reset-password
/support
/feedback
```

直接地址栏访问 + 刷新：

```text
/projects
/app
/reset-password
```

都不得 404。

验证静态 Worker/WASM：

```text
scene-engine
scene-engine-simd
worker assets
```

能加载。

浏览器 console 不应有 path/base 错误。

## Step 4 — Auth Preview

验证：

```text
sign in
sign out
session restore
password reset request
```

注意当前代码：

```text
redirectTo = window.location.origin + /reset-password
```

所以 Preview Auth 需要 Supabase allow-list 支持对应 origin。

如果不希望 wildcard preview Auth，
可以使用固定 staging domain：

```text
staging-app.lens.aisenhub.com
```

并只 allow 这个 URL。

## Step 5 — Webhome Preview

现有 Production Project 先不要改。

可以建立新的临时 Project 或使用预期 webhome Project preview 来验证：

```text
Root Directory: apps/webhome
Build: pnpm build
Output: dist
```

确认：

```text
prerender routes
canonical
sitemap
robots
CTA → webapp
```

## Step 6 — IndexedDB Decision Gate

必须明确填写：

```text
PRODUCTION_LOCAL_PROJECTS =
  NONE_CONFIRMED
  or
  MIGRATION_REQUIRED
  or
  UNKNOWN
```

### UNKNOWN

禁止进入 Phase 6。

### NONE_CONFIRMED

记录确认方式。
可以不实现迁移 UI，但不能清除旧数据。

### MIGRATION_REQUIRED

必须完成下面迁移 rehearsal。

## Step 7 — Migration Rehearsal（仅 MIGRATION_REQUIRED）

在旧 origin 仍然运行产品 renderer 时验证：

```text
1. 创建测试项目
2. 导入/关联测试媒体
3. 创建 shots/annotations 等代表性数据
4. 使用现有 backup service 导出
5. 在新 webapp origin 导入
6. 比较关键数据
7. 打开 editor
8. 验证媒体重连策略
```

至少比较：

```text
project metadata
shots
shot groups
annotations
templates
research data（如 backup 格式包含）
screenshots / media 的实际既定备份语义
```

不要假设所有 Blob 都进入 backup；
以当前 `projectBackupService` 契约为准。

## Step 8 — Production Migration Window Plan

若 MIGRATION_REQUIRED：

在 Production 切域前安排：

```text
旧 lens.aisenhub.com 仍运行 webapp
→ 显示迁移通知
→ 用户导出备份
→ 新 app.lens.aisenhub.com 已可用并能导入
→ grace period
→ 再执行 Phase 6
```

是否实现自动跨 origin 迁移：
默认 NO。

不要在此次拆分中引入 iframe/postMessage/Service Worker 跨域迁移系统。

## Step 9 — Existing Production Project Pre-merge Protection

因为现有 Vercel Project 可能仍配置：

```text
pnpm --filter @aisenlens/web build
```

在 Phase 1+ 代码进入 `main` 前必须保证其中一个条件：

```text
A. 自动 Production deploy 暂停
或
B. 现有 Project build command 已临时改为 @aisenlens/webapp
或
C. Vercel config 已使用能构建当前 webapp 的设置
```

否则 merge 后新 Production deployment 会 build fail，
虽然旧 deployment 可能仍在线。

这一步是上线流程，不是代码 Phase 1 的职责，但必须在 merge 前处理。

## Exit Gate

```text
[ ] webapp Preview 可用
[ ] webhome Preview 可用
[ ] deep links PASS
[ ] Worker/WASM PASS
[ ] Auth 策略 PASS 或有固定 staging gate
[ ] PRODUCTION_LOCAL_PROJECTS != UNKNOWN
[ ] 若需迁移，backup/restore rehearsal PASS
[ ] current Vercel production auto-deploy 风险已处理
```

没有这些，不进入 Phase 6。
