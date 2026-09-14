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
/reset-password
```

### 2. Supabase Redirect

在获得授权后加入：

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
sign in
reset password
projects
editor
Worker/WASM
```

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

### 5. Old Product Route Redirects

`lens.aisenhub.com`：

```text
/projects
/app
/reset-password
/support
/feedback
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

至少：

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
登录/退出
reset password route
```

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
[ ] Auth PASS
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
