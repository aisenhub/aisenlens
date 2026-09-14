# Phase 2 — 创建独立 `apps/webhome`

## Goal

建立可以单独：

```text
dev
typecheck
lint
build
prerender
```

的公开内容应用。

本 Phase 采用“先复制公开页面形成独立应用，再在 Phase 3 从 webapp 删除”的方式，
确保中间状态可运行、可比较。

## Entry Gate

Phase 1 = PASS。

## Target Package

```text
apps/webhome/package.json
name = @aisenlens/webhome
```

推荐 dev port：

```text
8442
```

webapp 保持：

```text
8443
```

## Step 1 — 创建最小 Vite App Skeleton

建立：

```text
apps/webhome/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ index.html
├─ .env.example
├─ public/
└─ src/
   ├─ app/
   ├─ assets/
   ├─ components/
   ├─ features/
   │  └─ marketing/
   ├─ pages/
   ├─ config/
   ├─ index.css
   └─ main.tsx
```

优先复用当前项目 Vite/Tailwind 配置方式。

不要引入 Next.js/Astro。

## Step 2 — 迁入公开页面“副本”

从 `webapp` 复制公开页面到 `webhome`：

```text
LandingPage.tsx
TutorialsPage.tsx
ChangelogPage.tsx
PrivacyPolicyPage.tsx
UserAgreementPage.tsx
features/marketing/**
```

以及当前真实存在的：

```text
glossary / feature SEO content
```

如果它们不对应独立 page file，而由 `SeoContentPage` + content registry 提供，
则复制其 marketing source closure。

此 Phase 暂时不从 webapp 删除源文件。

## Step 3 — 复制最小 UI 依赖闭包

原则：

```text
public page build 必须成功
UI 尽量保持当前一致
但不能把产品业务 feature 整棵复制过去
```

可以复制：

```text
BrandLogo
公开 Navigation 所需样式
Button / Tooltip 等少量通用 UI
必要 assets
theme types / utils
index.css（第一阶段可完整复制，后续再清）
```

禁止复制：

```text
project/
editor/
auto-shot/
media/
export/
analysis/
scene-calibration/
timeline/
workflow/
services/auth/
services/aisenhub/
```

如果公开 Navigation 当前强依赖 Auth/UserCenter：
不要把 Auth 复制进 webhome。
应创建：

```text
WebHomeNavigation
```

保持视觉结构，去掉 session 逻辑。

## Step 4 — 建立 webhome Router

只定义公开路由：

```text
/
/features/auto-shot
/features/frame-analysis
/features/reports
/tutorials
/tutorials/*
/glossary
/changelog
/terms
/privacy
```

未知公开路径应走 webhome 404 或首页策略。
不要重定向到 editor。

## Step 5 — CTA URL Boundary

建立：

```text
apps/webhome/src/config/urls.ts
```

例如：

```ts
export const WEBAPP_URL =
  import.meta.env.VITE_WEBAPP_URL || "http://localhost:8443";
```

提供 helper：

```ts
export function webAppUrl(path = "/projects") { ... }
```

所有：

```text
开始使用
进入应用
打开项目
登录
```

不要再用内部 React Router 导航到 `/app` / `/projects`，
而要跳转 `VITE_WEBAPP_URL`。

`.env.example`：

```text
VITE_WEBAPP_URL=http://localhost:8443
```

production 在 Vercel：

```text
https://app.lens.aisenhub.com
```

## Step 6 — SEO Ownership

迁移/复制：

```text
siteMetadata.ts
seoContent.ts
SeoContentPage
usePageMetadata（若公开站仍需要）
```

`SITE_URL` 继续：

```text
https://lens.aisenhub.com
```

公开 canonical 不改到 app domain。

## Step 7 — Public Assets

把以下公开 SEO 资源归到 webhome：

```text
robots.txt
sitemap.xml
site.webmanifest（如果它代表官网）
公开 favicon / brand asset
```

暂时不要删除 webapp 旧文件，Phase 3 再清。

## Step 8 — Prerender Script

推荐把：

```text
scripts/prerender-public-routes.mjs
```

复制/重构为：

```text
scripts/prerender-webhome-routes.mjs
```

关键变量：

```text
webRoot
distRoot
```

必须指向：

```text
apps/webhome
apps/webhome/dist
```

webhome package：

```json
{
  "postbuild": "node ../../scripts/prerender-webhome-routes.mjs"
}
```

不要让 webapp 使用这个新脚本。

## Step 9 — Root Scripts

新增：

```text
dev:webhome
build:webhome
lint:webhome
typecheck:webhome
preview:webhome
```

此 Phase `build` 仍可暂时保持旧语义指向 webapp；
Phase 4 再统一双站 build 策略。

## Step 10 — Dependency Audit

`apps/webhome/package.json` 只添加源代码真实需要的依赖。

目标是不出现：

```text
@aisenlens/scene-engine
mediabunny
@supabase/supabase-js
```

如果出现，必须追踪 import 原因并消除产品层耦合。

`zustand` 只有公开站真实使用才允许存在，默认应不需要。

## Step 11 — Build

```bash
corepack pnpm install
corepack pnpm typecheck:webhome
corepack pnpm lint:webhome
corepack pnpm build:webhome
```

检查：

```text
apps/webhome/dist/
```

应存在 prerender 后：

```text
index.html
tutorials/index.html
glossary/index.html
changelog/index.html
terms/index.html
privacy/index.html
...
```

## Step 12 — Bundle Boundary Sanity

在 `dist/assets` 中搜索或通过 build manifest/chunk 名确认：

```text
scene-engine
mediabunny
auto-shot
```

不应进入 webhome 产物。

## Forbidden in Phase 2

不要：

```text
删除 webapp marketing
修改 production Vercel
切 domain
改 IndexedDB
把 Auth 加到 webhome
抽 packages/ui 大工程
```

## Exit Gate

```text
[ ] @aisenlens/webhome 独立存在
[ ] webhome 独立 typecheck/lint/build
[ ] public routes 可独立访问
[ ] SEO prerender 属于 webhome
[ ] CTA 通过 VITE_WEBAPP_URL 跳产品站
[ ] webhome 无 scene-engine
[ ] webhome 无 mediabunny
[ ] webhome 无 Supabase Auth
[ ] webapp 此时仍保持完整功能（包括暂时重复的公开页）
```

## Suggested Commit

```text
feat: add standalone webhome app
```
