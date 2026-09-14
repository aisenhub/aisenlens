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
