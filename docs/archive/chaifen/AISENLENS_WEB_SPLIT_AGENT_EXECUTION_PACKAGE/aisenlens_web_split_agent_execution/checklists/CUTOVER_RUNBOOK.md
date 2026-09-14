# Production Cutover Runbook

> 只在 Phase 5 Exit Gate = PASS 后使用。
>
> 当前记录（2026-09-14）：目标域名已可达，`PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`
> 已记录；完整产品 smoke 和 rollback deployment ID 尚未补齐。当前没有 Auth，因此 T-3
> 及其 reset/callback 条目为 N/A，不应执行或伪造为 PASS。

## T-1 — Freeze

```text
[ ] 记录 release commit SHA
[ ] 记录 webhome preview deployment
[ ] 记录 webapp production candidate deployment
[ ] 记录现有 lens.aisenhub.com deployment
[ ] 确认没有未完成的 DB migration
[ ] 确认 PRODUCTION_LOCAL_PROJECTS 状态
```

## T-2 — Webapp First

```text
[ ] 部署 webapp Production
[ ] production vercel URL /projects PASS
[ ] /app PASS
[N/A] /reset-password（当前无此路由）
[ ] Worker/WASM PASS
[N/A] Auth（当前无 Auth）
```

## T-3 — Auth

当前代码没有 Auth。以下步骤仅在未来明确启用 Auth 后恢复：

```text
[ ] Supabase allow-list 加 app.lens.aisenhub.com/reset-password
[ ] 其他 callback 搜索完毕
[ ] 不删除 rollback 所需旧 URL
```

## T-4 — App Domain

```text
[ ] 绑定 app.lens.aisenhub.com
[ ] TLS PASS
[ ] /projects refresh PASS
[ ] /app refresh PASS
[N/A] Auth（当前无 Auth）
[N/A] reset flow（当前无 Auth）
```

## T-5 — Local Data Gate

若 `MIGRATION_REQUIRED`：

```text
[ ] 迁移通知已运行
[ ] backup/restore rehearsal PASS
[ ] grace window 条件已满足
```

若 `NONE_CONFIRMED`：

```text
[ ] 确认记录已保存
```

`UNKNOWN`：STOP。

## T-6 — Webhome

```text
[ ] 当前 Vercel Project root/build/output 改为 webhome
[ ] deployment 先验证
[ ] promote/alias 到 lens.aisenhub.com
[ ] 首页 PASS
[ ] tutorials PASS
[ ] sitemap PASS
[ ] canonical PASS
```

## T-7 — Redirects

```text
[ ] /projects → app domain
[ ] /app → app domain
[ ] /app?project=test query preserved
[N/A] /reset-password → app domain（当前无此路由）
[N/A] /support → app domain（当前无此路由）
[N/A] /feedback → app domain（当前无此路由）
```

## T-8 — SEO / Indexing

```text
[ ] webhome indexable public pages
[ ] webapp noindex
[ ] webapp robots disallow
[ ] webapp no sitemap
```

## T-9 — Product Smoke

```text
[N/A] login（当前无 Auth）
[ ] create project
[ ] open project
[ ] import media
[ ] editor
[ ] refresh
[ ] auto-shot
[ ] save
[ ] export
```

## T-10 — Rollback Anchors

记录：

```text
WEBHOME_PREVIOUS_DEPLOYMENT=
WEBHOME_NEW_DEPLOYMENT=
WEBAPP_PREVIOUS_DEPLOYMENT=
WEBAPP_NEW_DEPLOYMENT=
RELEASE_SHA=
```

确认：

```text
[ ] 至少一个操作者知道如何 rollback/promote
[ ] old redirects / Supabase URL 暂不删除
```

## T+1 — Cleanup（不要当天自动执行）

稳定窗口后：

```text
[ ] 检查错误日志
[ ] 检查用户迁移反馈
[ ] 确认无旧 origin 迁移需求
[ ] 获得授权
[ ] 删除临时 compatibility
```
