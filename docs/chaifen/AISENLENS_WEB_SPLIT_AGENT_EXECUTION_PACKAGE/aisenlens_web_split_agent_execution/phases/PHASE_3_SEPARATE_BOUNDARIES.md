# Phase 3 — 从 `webapp` 删除公开站责任并收紧边界

## Goal

从此阶段结束开始：

```text
webhome = public content
webapp  = product application
```

不再存在同一页面的双份职责。

## Entry Gate

Phase 2 = PASS，且 webhome 公开页面与当前线上视觉/内容已对比验证。

## Step 1 — Webapp Route Table

在 `apps/webapp` 中仅保留：

```text
/
/projects
/app
/reset-password
/support
/feedback
```

推荐行为：

```text
/
→ Navigate /projects
```

暂时保留 `support/feedback` 在 webapp，
因为当前它们依赖登录状态 / 线上服务。

## Step 2 — Remove Public Pages from Webapp

删除或移动掉：

```text
LandingPage
TutorialsPage
ChangelogPage
PrivacyPolicyPage
UserAgreementPage
features/marketing/**
```

以及只服务 public SEO 的 source。

必须先通过：

```bash
git grep
```

确认没有产品代码依赖这些文件。

如果某个 brand/shared primitive 同时被产品代码使用：
保留产品版本，不要因为删除 marketing 误删 shared primitive。

## Step 3 — Simplify App Shell

当前 `App.tsx` / `AppPages.tsx` 不再认识：

```text
homepage
tutorials
glossary
changelog
terms
privacy
```

为了降低风险，可以暂时保留现有 numeric page model，
只将有效 product page id 收敛为：

```text
projects
app
support
feedback
```

不要在本 Phase 顺手做整套 router architecture rewrite。

## Step 4 — Product Navigation

当前 Navigation 中指向：

```text
首页
术语
教程
更新日志
协议
隐私
```

的产品内链接改为外部 webhome URL。

新增：

```text
apps/webapp/src/config/urls.ts
```

`.env.example`：

```text
VITE_WEBHOME_URL=http://localhost:8442
```

production：

```text
https://lens.aisenhub.com
```

构建 helper：

```ts
webHomeUrl(path)
```

不要散落 hard-coded production domain。

## Step 5 — Webapp SEO Policy

产品 app 的 `index.html`：

```html
<meta name="robots" content="noindex,nofollow" />
```

新增/修改：

```text
apps/webapp/public/robots.txt
```

建议：

```text
User-agent: *
Disallow: /
```

删除：

```text
sitemap.xml
```

和 public prerender postbuild。

`webapp/package.json` 不再执行：

```text
prerender-public-routes
```

## Step 6 — Password Reset

保持：

```ts
redirectTo: `${window.location.origin}/reset-password`
```

这在新域名上线后会自然指向：

```text
https://app.lens.aisenhub.com/reset-password
```

不要硬编码 production domain。

Supabase allow-list 属于 Phase 5 外部配置 Gate。

## Step 7 — Webapp Vercel SPA Config

新增：

```text
apps/webapp/vercel.json
```

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

如果 `robots.txt`、静态 assets 被 rewrite 影响，
Vercel static file 优先级应实际 Preview 验证。
不要只靠推断。

## Step 8 — Webhome Redirect Config Draft

可以在：

```text
apps/webhome/vercel.json
```

先加入“准备中的旧产品路由 redirects”，但 Production 是否启用到真实 app domain 要在 Phase 6 验证。

目标：

```text
/projects      → https://app.lens.aisenhub.com/projects
/app           → https://app.lens.aisenhub.com/app
/reset-password→ https://app.lens.aisenhub.com/reset-password
/support       → https://app.lens.aisenhub.com/support
/feedback      → https://app.lens.aisenhub.com/feedback
```

确认 query string 保留。

如果部署前 app custom domain 尚未绑定，
可以先不把 redirects 合入 production，或通过环境化配置避免指向不存在的 domain。

## Step 9 — Boundary Search

Webapp：

```bash
git grep -n "features/marketing" apps/webapp || true
git grep -n "TutorialsPage" apps/webapp || true
git grep -n "LandingPage" apps/webapp || true
git grep -n "SeoContentPage" apps/webapp || true
```

Webhome：

```bash
git grep -n "features/editor" apps/webhome || true
git grep -n "features/project" apps/webhome || true
git grep -n "auto-shot" apps/webhome || true
git grep -n "scene-engine" apps/webhome || true
git grep -n "mediabunny" apps/webhome || true
git grep -n "@supabase/supabase-js" apps/webhome || true
```

预期全部为空，除非文档/纯文字说明；源码引用必须为空。

## Step 10 — Dual Local Smoke

启动：

```text
webhome : 8442
webapp  : 8443
```

验证：

```text
webhome 首页 → 进入应用 → webapp /projects
webapp Logo/帮助 → webhome
webapp /app deep link
webapp /reset-password deep link
```

## Verification

```bash
corepack pnpm typecheck:webhome
corepack pnpm lint:webhome
corepack pnpm build:webhome

corepack pnpm typecheck:webapp
corepack pnpm lint:webapp
corepack pnpm build:webapp
```

然后运行现有产品 test gate。

## Exit Gate

```text
[ ] webapp 无 marketing route
[ ] webhome 无 product feature
[ ] webapp `/` → `/projects`
[ ] webapp noindex
[ ] webapp no public sitemap
[ ] webapp SPA rewrite 已配置
[ ] 双向跳转只通过 env URL
[ ] reset-password 仍以 current origin 工作
[ ] 两边独立 build
```

## Suggested Commit

```text
refactor: separate public and product web boundaries
```
