# AisenLens 开发待办

> 状态：已确认，未开始实现
>
> 本文只记录已批准的后续架构工作，不代表对应代码已经存在。

## 1. 引入 Zustand 并迁移应用状态

**目标**：将跨页面、跨功能的客户端状态从 `apps/web/src/app/App.tsx`
逐步迁移到职责明确的 Zustand store，保持 Supabase、IndexedDB 与媒体
业务边界不变。

实施顺序：

1. 安装并锁定 Zustand；先定义 store 的状态、操作和测试边界，不直接迁移 UI。
2. 在 `features/auth` 建立会话和用户资料状态入口，由现有 Supabase service
   提供数据；订阅创建、清理和错误处理不再留在 `App.tsx`。
3. 将主题等全局 UI 偏好，以及当前项目选择等跨页面状态，分别迁移到所属
   store 或 feature state；不把 IndexedDB 项目、媒体 Blob 或大型检测结果放入 Zustand。
4. 将 `App.tsx` 收敛到路由、Provider、布局和应用初始化；页面继续只做组合。
5. 覆盖登录/登出、会话恢复、订阅清理、项目切换和主题持久化，并运行 Web build。

**完成标准**：`App.tsx` 不直接订阅 Supabase 或维护会话、用户资料和项目业务
状态；store 不绕过现有 service/repository 边界。

## 2. App 会话与业务状态迁移

此项与 Zustand 引入同期执行，但保持独立验收：

- Auth feature 负责会话、资料刷新和登出流程。
- Project feature 负责当前项目的选择与加载边界。
- App 层只提供路由、全局 Provider、布局和必要的初始化编排。
- 不为旧的 `App.tsx` 状态路径保留长期双轨或兼容层。
