# Phase 6 — Production Cutover、Redirect 与清理

## Goal

最终：

```text
lens.aisenhub.com
→ webhome

app.lens.aisenhub.com
→ webapp
```

并保留安全 rollback 路径。

## Entry Gate

Phase 5 全 PASS。

## 当前执行记录（2026-09-14）

- 公开站 `https://lens.aisenhub.com` 与产品站 `https://app.lens.aisenhub.com` 已按目标域名可访问；首页和 `/projects` 的 HTTP、标题和 robots 只读检查通过。
- `PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`，不执行旧项目迁移、不清理浏览器存储、不增加旧格式 fallback。
- 当前代码没有 Auth、登录、密码重置、Support 或 Feedback 路由；本 Phase 中相应 redirect/allow-list/登录检查只在未来重新启用 Auth 后适用。
- 完整项目创建、媒体导入、编辑器刷新恢复、自动分镜、导出和线上 Worker/WASM smoke，以及可回滚 production deployment anchor，仍需要真实浏览器/发布平台证据。

## Before Cutover

记录：

```text
current production deployment id/url
new webhome validated deployment id/url
new webapp validated deployment id/url
git commit SHA
Supabase config state
migration decision
```

如果 MIGRATION_REQUIRED：
迁移窗口必须已完成既定条件。

## Cutover Order

### 1. 先确保 webapp Production 可运行

新 Vercel Project：

```text
apps/webapp
```

发布 production。

先用 Vercel production URL 验证：

```text
/projects
/app
```

### 2. Supabase Redirect

如果未来重新启用 Auth，在获得授权后加入：

```text
https://app.lens.aisenhub.com/reset-password
```

如 Auth 还有：

```text
email confirmation
magic link
OAuth callback
```

则搜索代码并逐一确认相应 redirect。

不要删除旧 redirect，直到 rollback window 结束。

### 3. 绑定 webapp Custom Domain

绑定：

```text
app.lens.aisenhub.com
```

验证 TLS / DNS。

再次验证：

```text
projects
editor
Worker/WASM
```

当前代码没有 Auth，因此 sign in、reset password 和 Supabase redirect 对本次范围为 N/A；只有在未来重新启用 Auth 时才恢复这些检查。

### 4. 切现有 Project 为 webhome

现有已经持有：

```text
lens.aisenhub.com
```

的 Vercel Project 最终配置：

```text
Root Directory: apps/webhome
Build Command: pnpm build
Output Directory: dist
```

先产生 deployment 并验证，再 promote / alias 到 production。

2026-09-14 的只读线上检查已确认两个域名均可访问、标题正确且 robots 边界正确；Vercel
后台项目字段和可回滚 deployment ID 仍需补充发布平台证据。

### 5. Old Product Route Redirects

`lens.aisenhub.com`：

```text
/projects
/app
```

重定向到：

```text
app.lens.aisenhub.com
```

验证：

```text
/app?project=abc
```

query string 保留。

注意：
URL redirect 不等于 IndexedDB migration。

### 6. SEO Production Check

webhome：

```text
robots allow intended public pages
sitemap URLs = lens.aisenhub.com
canonical = lens.aisenhub.com
public routes 200
```

webapp：

```text
robots disallow
meta noindex
无 sitemap
```

### 7. Product Production Check

当前范围至少：

```text
创建项目
刷新项目库
打开项目
导入视频
打开编辑器
刷新 /app
自动分镜入口
保存/恢复
导出
```

登录、退出和密码重置当前为 N/A，因为代码没有 Auth 路由；不得以不存在的功能作为验收通过条件。

### 8. Desktop Build Check

从同一 release commit：

```bash
corepack pnpm build:desktop
```

确保 installer 中不包含 webhome。

## Rollback

### webhome failure

立即把：

```text
lens.aisenhub.com
```

回滚到上一个已验证 deployment。

### webapp failure

优先：

```text
Vercel rollback/promote last known good webapp deployment
```

如果新 app domain 整体不可用：

- 暂停 webhome CTA 或将产品 redirects 回滚。
- 在迁移 window 尚未结束时保留旧 renderer 路径。

### Database

本次正常情况不应有 DB schema migration。
即使存在，也不得“回滚 migration 文件”。
服务端结构只能 forward fix。

## Legacy Cleanup Gate

切换成功后不要当天删除所有 compatibility。

经过稳定窗口后才允许：

```text
删除旧 @aisenlens/web 文档残留
删除临时 migration banner
删除旧 Supabase redirect
删除旧 deployment compatibility
```

Agent 必须再次获得授权。

## Exit Gate

```text
[ ] lens.aisenhub.com = webhome
[ ] app.lens.aisenhub.com = webapp
[ ] old app routes redirect
[ ] Auth PASS 或明确标记为当前范围 N/A
[ ] IndexedDB migration requirement satisfied
[ ] webapp noindex
[ ] webhome SEO PASS
[ ] desktop consumes webapp
[ ] rollback target recorded
```

## Suggested Commit

如果仅文档/redirect config：

```text
deploy: finalize webhome and webapp production boundaries
```
