# Repository Review Notes

执行计划建立在以下当前事实之上。

## Workspace

当前：

```text
apps/
  desktop/
  mobile/
  web/
packages/
```

`pnpm-workspace.yaml` 使用：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

因此 `webhome` / `webapp` 都会自动进入 workspace。

## Current Web Package

当前 package：

```text
@aisenlens/web
React 19
Vite 8
Tailwind 4
Supabase JS
mediabunny
scene-engine workspace dependency
```

说明当前 `apps/web` 实际是产品 renderer，不只是官网。

## Current App Shell

当前 `App.tsx` 同时处理：

```text
/
projects
app
tutorials
support
feedback
changelog
terms
privacy
reset-password
```

并直接持有：

```text
Auth modal
User center
Editor settings
Marketing SEO
Project selection
```

说明公开站与产品 shell 当前确实混合。

## Current Desktop

Electron：

```text
build:renderer = @aisenlens/web
extraResources = ../web/dist
loadFile = web/dist/index.html
```

因此 rename 到 webapp 后需要同步三处。

## Current Mobile

Capacitor：

```text
build @aisenlens/web
webDir = ../web/dist
```

需要改 webapp。

## Local Data

项目 repository：

```text
DATABASE_NAME = aisenlens-projects
```

代码审查时数据库版本为：

```text
17
```

项目数据为浏览器 IndexedDB，本地优先。

## Auth

Supabase Browser client 读取：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Password reset：

```ts
redirectTo: `${window.location.origin}/reset-password`
```

所以切到 app domain 后必须更新 Supabase Auth allow-list。

## Current Public SEO

公开 SITE_URL：

```text
https://lens.aisenhub.com
```

当前 prerender script 硬编码：

```text
apps/web
apps/web/dist
```

必须转到 webhome。

## Current Deployment Docs

仓库当前文档描述：

```text
Vercel 从 repository root build
pnpm --filter @aisenlens/web build
output apps/web/dist
```

这属于旧单 Web release unit，拆分后需要更新。
