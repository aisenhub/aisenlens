# AisenLens 运维与发布约束

> 当前阶段：Web renderer 已改名为 `apps/webapp`；公开站与产品站仍暂时由同一个 renderer 提供。

## 发布单元

- 当前 Web 构建目标为 `@aisenlens/webapp`，产物为 `apps/webapp/dist`。
- 根目录命令 `build`、`lint`、`typecheck` 和 `verify:web` 仍代表当前完整 Web renderer。
- Electron 与 Capacitor 只消费 `webapp` 构建产物，不复制 React 业务代码。
- `webhome` 尚未创建；公开页面的迁移将在后续阶段完成。

## 数据安全

项目数据保存在浏览器 IndexedDB 的 `aisenlens-projects` 数据库中，当前代码版本为 17。
拆分和域名切换不得调用 `indexedDB.deleteDatabase`、`localStorage.clear` 或其他清理浏览器数据的操作。

项目备份和恢复必须继续使用产品 feature 内的 `projectBackupService`，不得假设跨 origin 的 URL 跳转会迁移本地数据。

## 外部平台门禁

代码阶段可以准备 Vercel、Supabase 和环境变量配置，但不得未经明确授权修改 Production 项目、custom domain、DNS 或 Supabase Production Auth allow-list。

生产操作必须在 Preview 验证、回滚锚点和本地数据决策完成后执行。
