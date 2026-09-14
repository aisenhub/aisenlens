# Acceptance Matrix

> 当前记录（2026-09-14）：Webhome/Webapp 本地 release gate、边界检查、SEO/noindex
> 产物和两个生产域名的 HTTP/标题/robots 只读检查已完成。真实产品浏览器 smoke、线上
> Worker/WASM、回滚 deployment anchor 和完整 Vercel 后台证据仍待补齐；未验证项保持未勾选。
> 当前代码没有 Auth、登录、密码重置、Support 或 Feedback，因此对应条目标记为 N/A，不伪造通过。

## Webhome

```text
[ ] pnpm typecheck:webhome
[ ] pnpm lint:webhome
[ ] pnpm build:webhome
[ ] 首页正常
[ ] feature pages 正常
[ ] tutorials 正常
[ ] glossary 正常
[ ] changelog 正常
[ ] terms/privacy 正常
[ ] prerender HTML 存在
[ ] sitemap 只包含 webhome public URLs
[ ] canonical = https://lens.aisenhub.com
[ ] robots 没有误禁 public pages
[ ] CTA 跳 webapp
[ ] 无 scene-engine dependency
[ ] 无 mediabunny dependency
[ ] 无 Supabase Auth dependency
[ ] 不打开 aisenlens-projects IndexedDB
```

## Webapp

```text
[ ] pnpm typecheck:webapp
[ ] pnpm lint:webapp
[ ] pnpm verify:webapp
[ ] / → /projects
[ ] /projects 直接访问
[ ] /projects refresh
[ ] /app 直接访问
[ ] /app refresh
[N/A] /reset-password 直接访问（当前无此路由）
[N/A] /reset-password refresh（当前无此路由）
[N/A] Auth session 正常（当前无 Auth）
[ ] Project create/open/delete 维持原行为
[ ] IndexedDB 数据维持原行为
[ ] media import 正常
[ ] timeline 正常
[ ] analysis 正常
[ ] auto-shot 正常
[ ] Worker/WASM 正常
[ ] export 正常
[ ] webhome 外链正确
[ ] meta noindex
[ ] robots Disallow
[ ] 无 public sitemap
[ ] 无 marketing source ownership
```

## Boundary

```text
[ ] webhome source 不 import webapp source
[ ] webapp source 不 import webhome source
[ ] webhome package 无 scene engine
[ ] webhome package 无 mediabunny
[ ] webhome package 无 supabase-js
[ ] cross-site navigation 通过 env URL
[ ] verify:web-boundaries PASS
```

## Desktop

```text
[ ] renderer build = @aisenlens/webapp
[ ] extraResources from ../webapp/dist
[ ] main load path = webapp
[ ] build:desktop PASS
[ ] installer/resource 无 webhome
```

## Mobile

```text
[ ] sync build = @aisenlens/webapp
[ ] webDir = ../webapp/dist
[ ] cap sync PASS
```

## Vercel Webhome

```text
[ ] repo = aisenhub/aisenlens
[ ] root = apps/webhome
[ ] build = pnpm build
[ ] output = dist
[ ] domain = lens.aisenhub.com
[ ] preview deployment PASS
```

## Vercel Webapp

```text
[ ] repo = aisenhub/aisenlens
[ ] root = apps/webapp
[ ] build = pnpm build
[ ] output = dist
[ ] domain = app.lens.aisenhub.com
[ ] SPA rewrite PASS
[ ] Worker/WASM PASS
[ ] preview deployment PASS
```

## Supabase

```text
[ ] public URL/anon key only
[N/A] production app reset URL allow-listed（当前无 Auth）
[N/A] preview/staging strategy documented（当前无 Auth）
[ ] no secret leaked
```

## Local Data

```text
[ ] production local-project status known
[x] migration-required? recorded（`NONE_CONFIRMED`）
[ ] backup export tested（不作为迁移门；产品能力仍需单独 smoke）
[N/A] restore on new origin tested if required（无需迁移）
[ ] no code deletes old IndexedDB
[ ] cutover does not claim URL redirect migrates storage
```

## Documentation

```text
[ ] README
[ ] AGENTS
[ ] PROJECT_ARCHITECTURE
[ ] OPERATIONS
[ ] SEO docs
[ ] package scripts
```
