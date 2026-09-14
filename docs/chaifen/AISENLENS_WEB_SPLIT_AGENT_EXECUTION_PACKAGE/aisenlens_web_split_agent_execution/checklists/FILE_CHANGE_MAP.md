# File Change Map

这是 Agent 的影响面检查表，不代表每个文件一定要改。

## Root

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
README.md
AGENTS.md
```

`pnpm-workspace.yaml` 当前 `apps/*` 已可覆盖两个新 app，
通常无需改 packages glob。

## Current Web → Webapp

```text
apps/web/**
→ apps/webapp/**
```

重点：

```text
apps/webapp/package.json
apps/webapp/vite.config.ts
apps/webapp/.env.example
apps/webapp/index.html
apps/webapp/public/*
apps/webapp/src/app/App.tsx
apps/webapp/src/app/AppPages.tsx
apps/webapp/src/constants/navigation.ts
apps/webapp/src/services/auth/*
apps/webapp/src/features/project/*
apps/webapp/src/features/marketing/*
```

## New Webhome

```text
apps/webhome/package.json
apps/webhome/vite.config.ts
apps/webhome/tsconfig.json
apps/webhome/index.html
apps/webhome/.env.example
apps/webhome/vercel.json
apps/webhome/public/*
apps/webhome/src/main.tsx
apps/webhome/src/app/*
apps/webhome/src/pages/*
apps/webhome/src/features/marketing/*
apps/webhome/src/config/urls.ts
```

## Webapp Deployment

```text
apps/webapp/vercel.json
apps/webapp/src/config/urls.ts
apps/webapp/public/robots.txt
```

## Desktop

```text
apps/desktop/package.json
apps/desktop/src/main.ts
```

Search:

```text
@aisenlens/web
../web/dist
../../web/dist
process.resourcesPath + web
```

## Mobile

```text
apps/mobile/package.json
apps/mobile/capacitor.config.ts
```

Search:

```text
@aisenlens/web
../web/dist
```

## Scripts

```text
scripts/verify-web.mjs
scripts/prerender-public-routes.mjs
scripts/verify-scene-engine-web-build.mjs
scripts/verify-scene-engine-web-preview.mjs
scripts/*
```

最终建议：

```text
scripts/verify-webapp.mjs
scripts/verify-webhome.mjs
scripts/verify-web-boundaries.mjs
scripts/prerender-webhome-routes.mjs
```

## Docs

```text
docs/PROJECT_ARCHITECTURE.md
docs/OPERATIONS.md
docs/SEO_DISCOVERABILITY_PLAN.md
docs/DEVELOPMENT_TODO.md
docs/*
```

## Required Search Terms

每阶段至少按需运行：

```bash
git grep -n "@aisenlens/web"
git grep -n "apps/web"
git grep -n "web/dist"
git grep -n "prerender-public-routes"
git grep -n "SITE_URL"
git grep -n "\"/app\""
git grep -n "\"/projects\""
git grep -n "reset-password"
git grep -n "window.location.origin"
git grep -n "VITE_SUPABASE"
git grep -n "VITE_PLATFORM"
git grep -n "scene-engine"
git grep -n "mediabunny"
```

## Do Not Blind Replace

```text
web
app
home
```

这些过于宽泛。

即使 `apps/web` 搜索命中 `apps/webapp`，
也必须人工区分真实旧路径。
