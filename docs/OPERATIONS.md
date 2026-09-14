# AisenLens 运维与发布约束

> 当前阶段：公开站与产品 renderer 已拆为两个独立 Web release unit；生产域名已可访问，完整产品流程与回滚锚点仍需持续验收。

## 发布单元

- `@aisenlens/webhome` 构建 `apps/webhome/dist`，负责公开页面、教程、法律页、robots 和 sitemap。
- `@aisenlens/webapp` 构建 `apps/webapp/dist`，负责项目库、编辑器、媒体、分析和导出。
- `build:web` 构建两个 release unit；`verify:web` 运行两个 release gate 与边界守卫。
- Electron 与 Capacitor 只消费 `webapp` 构建产物，不复制 React 业务代码。
- WebApp 根路径重定向至 `/projects`；跨站首页和公开内容使用 `VITE_WEBHOME_URL`，不共享 React 状态。

## 数据安全

项目数据保存在浏览器 IndexedDB 的 `aisenlens-projects` 数据库中，当前代码版本为 17。项目从未有生产数据，当前仓库只接受当前 schema，不实现旧项目记录转换、旧 store 迁移或兼容 fallback。
拆分和域名切换不得调用 `indexedDB.deleteDatabase`、`localStorage.clear` 或其他清理浏览器数据的操作。

项目备份和恢复必须继续使用产品 feature 内的 `projectBackupService`，不得假设跨 origin 的 URL 跳转会迁移本地数据。

## 外部平台门禁

代码阶段可以准备 Vercel、Supabase 和环境变量配置，但不得未经明确授权修改 Production 项目、custom domain、DNS 或 Supabase Production Auth allow-list。

生产操作必须在 Preview 验证、回滚锚点和本地数据决策完成后执行。

## Web Split Preview / Migration Gate

Phase 5 的代码准备状态：

- `apps/webapp/vercel.json`：按 `Root Directory = apps/webapp`、`pnpm build`、`dist` 输出准备。
- `apps/webhome/vercel.json`：按 `Root Directory = apps/webhome`、`pnpm build`、`dist` 输出准备。
- 本地双站 deep-link、WebHome prerender、canonical、sitemap、robots 和产品端 noindex 已通过验证；2026-09-14 已对线上生产域名完成 HTTP、标题和 robots 只读验证。
- 2026-09-14 本地 release snapshot：WebHome 为 23 个文件 / 569,522 bytes / 1 个 JS chunk，最大 JS 为 396,515 bytes；WebApp 为 43 个文件 / 2,582,245 bytes / 31 个 JS chunks，最大 JS 为 474,181 bytes。WebHome 产物未包含 Scene Engine、Mediabunny 或 Supabase 依赖。
- 当前工作树没有 Supabase Auth、登录、密码重置、Support 或 Feedback 路由；这些是此前工作区变更后的当前产品范围，不得在本次拆分中凭空恢复。
- `PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`：站点所有者在当前任务中确认从未有生产项目；因此不需要生产数据迁移 rehearsal。仍不得调用 `indexedDB.deleteDatabase`、`localStorage.clear` 或其他清理旧 origin 数据的操作。
- 当前 Production auto-deploy 状态、Vercel 项目归属、custom domain、DNS 和 Supabase allow-list 的后台配置仍未完全核对；GitHub `main` 的 Vercel 部署状态已报告成功。本阶段没有通过工具修改外部平台配置。
- 2026-09-14 只读线上检查：`https://lens.aisenhub.com/` 返回 200、官网标题且 `robots=index,follow`；`https://lens.aisenhub.com/projects` 跳转后返回产品端 200；`https://app.lens.aisenhub.com/` 与 `/projects` 均返回产品端 200 且 `robots=noindex,nofollow,noarchive`。

因此，生产数据决策门和当前域名可达性门已通过；下一步是完成真实浏览器中的项目创建、媒体导入、编辑器打开、刷新恢复、自动分镜和导出 smoke，并记录可回滚的部署锚点。不要把单纯 HTTP 200 误认为完整产品流程已验收。
