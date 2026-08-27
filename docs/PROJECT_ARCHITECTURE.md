# AisenLens 项目架构

> 状态：当前实现基线
>
> 最后核对：2026-08-25

本文档记录当前代码已经采用的长期架构边界。具体功能的历史计划、实施过程和已失效的数据模型不作为项目规范保留。

## 1. Workspace 与发布边界

仓库使用 pnpm workspace：

```text
apps/
  web/       React + Vite 的唯一 UI 与业务实现
  desktop/   Electron 外壳，打包 web 的构建产物
  mobile/    Capacitor Android/iOS 外壳，同步 web 的构建产物
supabase/    数据库迁移与服务端配置
packages/    仅在存在独立、稳定的共享消费者时建立共享包
```

`apps/web` 是产品功能的唯一来源；桌面与移动端不复制 React 业务代码。Web 发布由 Vercel 从仓库根目录构建，产物目录为 `apps/web/dist`。

## 2. 前端分层

`apps/web/src` 按应用、页面、可复用 UI、功能模块、服务和共享类型组织。页面只负责组合，领域逻辑与特性 UI 位于 `features/<feature>/`；可复用的无业务 UI 位于 `components/` 与 `components/ui/`。外部通信统一收敛在 `services/`，组件不得直接访问 Supabase。

当前主要功能边界包括：

- `project`：项目库、本地仓库、备份和恢复。
- `media`、`video`：媒体资源、播放与音轨预览。
- `shot`、`timeline`、`annotation`、`group`、`template`：拉片数据与时间轴交互。
- `auto-shot`：当前自动分镜任务与候选结果流程。
- `export`：报告和视频导出；视频导出在 Worker 中运行。
- `auth`、`feedback`、`support`：身份、反馈和支持者流程。

全局视觉 token 在 `apps/web/src/index.css`；UI 沿用 Tailwind 与现有 `components/ui/`，不得把业务逻辑放进通用组件。

## 3. 本地项目数据边界

项目工作数据优先保存在浏览器 IndexedDB 的 `aisenlens-projects` 数据库中。当前仓库版本为 12，分离存放项目、媒体句柄/Blob、截图及 Blob、镜头、项目模板、标注、缩略图缓存、波形缓存、自动分镜任务、镜头组和恢复快照。

正式项目数据不会被自动清理；缩略图、波形等派生数据与正式数据分开管理。备份服务导出经校验的项目包；恢复快照保存项目、镜头、镜头组、标注和模板，恢复时通过仓库服务写回。新增持久化结构必须通过 `projectRepository.ts` 的版本化升级处理，不能由 UI 直接写 IndexedDB。

时间轴和镜头领域以整数帧与半开区间 `[startFrame, endFrame)` 表达时间范围；跨功能传递或持久化时应保持这一语义。

## 4. 编辑器能力边界

编辑器由 `EditorPage` 和 feature 模块组合。媒体预览、时间轴、镜头、标注、构图/内容叠层、模板与导出保持独立；叠层只服务预览和截图，不应修改原始视频。自动分镜首先生成可审阅的候选结果，用户显式确认后才更新镜头数据。

当前 `auto-shot` 仍是基于浏览器视频和 Canvas 的既有实现。它是可替换的业务入口，不是未来检测算法的长期技术基线。

## 5. AisenShot 的未来替换边界

已批准的 AisenShot Scene Engine 将作为 `packages/scene-engine/` 中独立于 React 与项目领域模型的 C++/WASM 包。其输入是解码后的帧，输出是带证据的镜头边界；Web Worker 负责 WebCodecs/Mediabunny 解码、WASM 调度和结果回传，TypeScript 适配器才将结果转换为可审阅的候选分镜。

实施时仅按已批准的架构与分阶段计划推进：

- [AisenShot Scene Engine 架构方案](AISENSHOT_SCENE_ENGINE_PLAN.md)
- [AisenShot Scene Engine 实施计划](AISENSHOT_SCENE_ENGINE_IMPLEMENTATION_PLAN.md)

本阶段不在 Engine 中实现关键帧提取或其他视频分析能力；仅保留独立包与稳定输入/输出边界以便未来扩展。

## 6. 变更原则

- 新功能进入所属 feature，跨域能力先建立清晰服务接口。
- 不复制桌面或移动端业务实现，不为了推测的复用提前拆包。
- 数据模型、浏览器存储或 Supabase 结构变更必须同时更新相应迁移、类型和本文件。
- 对参考项目的调研结论只记录在 `reference-projects/REFERENCE_PROJECT_INDEX.md`，不得直接迁移其实现。
