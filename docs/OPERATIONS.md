# AisenLens 运维与发布约束

> 当前阶段：公开站与产品 renderer 已拆为两个独立 Web release unit；生产域名切换仍需单独执行部署门禁。

## 发布单元

- `@aisenlens/webhome` 构建 `apps/webhome/dist`，负责公开页面、教程、法律页、robots 和 sitemap。
- `@aisenlens/webapp` 构建 `apps/webapp/dist`，负责项目库、编辑器、媒体、分析和导出。
- `build:web` 构建两个 release unit；`verify:web` 运行两个 release gate 与边界守卫。
- Electron 与 Capacitor 只消费 `webapp` 构建产物，不复制 React 业务代码。
- WebApp 根路径重定向至 `/projects`；跨站首页和公开内容使用 `VITE_WEBHOME_URL`，不共享 React 状态。

## 数据安全

项目数据保存在浏览器 IndexedDB 的 `aisenlens-projects` 数据库中，当前代码版本为 17。
拆分和域名切换不得调用 `indexedDB.deleteDatabase`、`localStorage.clear` 或其他清理浏览器数据的操作。

项目备份和恢复必须继续使用产品 feature 内的 `projectBackupService`，不得假设跨 origin 的 URL 跳转会迁移本地数据。

## 外部平台门禁

代码阶段可以准备 Vercel、Supabase 和环境变量配置，但不得未经明确授权修改 Production 项目、custom domain、DNS 或 Supabase Production Auth allow-list。

生产操作必须在 Preview 验证、回滚锚点和本地数据决策完成后执行。

## Web Split Preview / Migration Gate

Phase 5 的代码准备状态：

- `apps/webapp/vercel.json`：按 `Root Directory = apps/webapp`、`pnpm build`、`dist` 输出准备。
- `apps/webhome/vercel.json`：按 `Root Directory = apps/webhome`、`pnpm build`、`dist` 输出准备。
- 本地双站 deep-link、WebHome prerender、canonical、sitemap、robots 和产品端 noindex 已通过验证；Vercel Preview 尚未验证。
- 2026-09-14 本地 release snapshot：WebHome 为 23 个文件 / 569,522 bytes / 1 个 JS chunk，最大 JS 为 396,515 bytes；WebApp 为 43 个文件 / 2,582,245 bytes / 31 个 JS chunks，最大 JS 为 474,181 bytes。WebHome 产物未包含 Scene Engine、Mediabunny 或 Supabase 依赖。
- 当前工作树没有 Supabase Auth、登录、密码重置、Support 或 Feedback 路由；这些是此前工作区变更后的当前产品范围，不得在本次拆分中凭空恢复。
- `PRODUCTION_LOCAL_PROJECTS = UNKNOWN`：仓库无法证明用户浏览器中的 IndexedDB 是否存在生产项目，且尚未获得线上 origin / Vercel 访问证据。不得进入 Phase 6，也不得清理旧 origin 的浏览器数据。
- 当前 Production auto-deploy 状态、Vercel 项目归属、custom domain、DNS 和 Supabase allow-list 均 `UNVERIFIED`。本阶段未执行任何外部平台写入。
- 2026-09-14 只读线上检查：`https://lens.aisenhub.com/`、`/features/auto-shot`、`/projects`、`/app` 均返回 200，说明现网仍由旧的合并 renderer 提供；`https://app.lens.aisenhub.com/` TLS 连接失败。该证据不等于 Vercel 项目配置已确认，也不能证明生产浏览器没有 IndexedDB 项目。

因此，下一步若继续上线，必须先由站点所有者提供或确认 Preview 项目和生产数据决策；代码配置可继续维护，但不能把本地通过写成线上已验证。
