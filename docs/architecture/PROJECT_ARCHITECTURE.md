# AisenLens 项目架构

> 状态：当前实现基线与已批准演进边界
>
> 最后核对：2026-09-14

本文档记录当前代码已经采用的长期架构边界。具体功能的历史计划、实施过程和已失效的数据模型不作为项目规范保留。

开发命令、组件复用和模块研究规则见 [DEVELOPMENT_GUIDE.md](../development/DEVELOPMENT_GUIDE.md)；本文件只保留
当前架构、数据和发布边界。

## 0. 技术栈基线

- React 19、TypeScript、Vite、Tailwind CSS v4。
- pnpm workspace；Zustand 负责轻量客户端状态。
- 当前 Web release units：`apps/webhome`（公开内容）和 `apps/webapp`（产品 renderer）。
- 产品数据 local-first，浏览器 IndexedDB 是当前持久化边界。

## 1. Workspace 与发布边界

仓库使用 pnpm workspace：

```text
apps/
  webhome/   React + Vite 公开内容站，负责营销、教程、法律页和 SEO
  webapp/    React + Vite 产品 renderer，负责项目库、编辑器和媒体能力
  desktop/   Electron 外壳，打包 webapp 的构建产物
  mobile/    Capacitor Android/iOS 外壳，同步 webapp 的构建产物
packages/    稳定共享能力，或具有独立构建/测试/跨语言 ABI 边界的基础引擎
```

`apps/webapp` 是产品功能的唯一来源，`apps/webhome` 是公开内容的唯一来源；两者是独立的 Web release unit。桌面与移动端不复制 React 业务代码，只消费 `apps/webapp/dist`。两个 Vercel 配置分别指向各自的构建命令和产物目录。

当前开发和验收范围仅为 Web。Desktop/Mobile 目录继续保留，但它们的构建、资源同步和运行 smoke 不作为当前 Web 功能的阻塞门；恢复对应平台开发时再执行平台专项验证。共享包通常应服务多个真实消费者，但像 Scene Engine 这样具有独立 C++/WASM 工具链、稳定 ABI 和独立测试边界的基础引擎，即使当前只有 Web 一个产品消费者，也可以建立单独 package。

## 2. 前端分层

`apps/webapp/src` 按应用、页面、可复用 UI、功能模块、服务和共享类型组织。页面只负责组合，领域逻辑与特性 UI 位于 `features/<feature>/`；可复用的无业务 UI 位于 `components/` 与 `components/ui/`。浏览器存储、媒体能力和其他外部通信统一收敛在 `services/`，组件不得直接跨越服务边界。

当前主要功能边界包括：

- `project`：项目库、本地仓库、备份和恢复。
- `media`、`video`：媒体资源、播放与音轨预览。
- `shot`、`timeline`、`annotation`、`group`、`template`：拉片数据与时间轴交互。
- `auto-shot`：当前自动分镜任务与候选结果流程。
- `export`：报告和视频导出；视频导出在 Worker 中运行。
- `workflow` / `overview` / `analysis` / `learn`：项目工作流导航、全片总览、深拆对象视图和真实笔记回看。

全局视觉 token 在 `apps/webapp/src/index.css`；UI 沿用 Tailwind 与现有 `components/ui/`，不得把业务逻辑放进通用组件。

## 3. 本地项目数据边界

项目工作数据优先保存在浏览器 IndexedDB 的 `aisenlens-projects` 数据库中。当前仓库版本为 18，分离存放项目、媒体句柄/Blob、截图及 Blob、镜头、项目模板、标注、缩略图缓存、波形缓存、自动分镜任务、镜头组和恢复快照。Phase 02 起由 `projectDatabaseMigration.ts` 显式冻结 schema/migration version 18，只允许 additive forward upgrade；IndexedDB upgrade transaction abort 是当前 rollback 边界，不做 destructive downgrade。回滚后的旧版标注 UI 通过仓储适配器读取 v17 与 v18 标注记录，并统一以 v18 结构写回，避免 IndexedDB 降级；这只覆盖当前回滚恢复所需的标注边界，不重新引入旧项目整体兼容层。Workflow 阶段、视图和 Session 选择是 UI 状态，不进入项目备份格式；Web split 不改变 schema。本项目不保留 LegacyProjectRecord、旧 store 转换或隐式 fallback。

正式项目数据不会被自动清理；缩略图、波形等派生数据与正式数据分开管理。`src/types/runtime.ts` 定义统一 revision/error/task/trust/diagnostic contract；项目与结构写入以 repository compare-and-write 为正确性门，当前项目级 edit revision 使用单调递增的 `ProjectRecord.updatedAt`。Scene/Sequence/Section 继续复用唯一 `ShotGroupRecord(kind + stable id + ordered shotIds)` 模型，不建立第二棵父子结构；独立 group replace 也必须提供 expected project revision。备份服务在 canonical write 前校验包大小、manifest version、ZIP/CRC/路径与引用；恢复快照通过仓库服务写回。未来新增持久化结构必须通过 `projectDatabaseMigration.ts` + `projectRepository.ts` 的明确版本设计和专项验收处理，不能由 UI 直接写 IndexedDB。

时间轴和镜头领域以整数帧与半开区间 `[startFrame, endFrame)` 表达时间范围；跨功能传递或持久化时应保持这一语义。

## 4. 编辑器能力边界

编辑器由 `EditorPage` 和 feature 模块组合。媒体预览、时间轴、镜头、标注、构图/内容叠层、模板与导出保持独立；叠层只服务预览和截图，不应修改原始视频。自动分镜首先生成可审阅的候选结果，用户显式确认后再通过单一、可撤销的领域命令更新镜头数据；Worker、React 组件和结果适配器均不得直接写正式镜头。

当前 `auto-shot` 生产入口使用 Worker + WASM Scene Engine 和 `useAutoShotTask`；旧浏览器视频/Canvas 检测器不由编辑器生产调用。

自动分镜的已批准目标控制采用独立的 feature 配置层：用户选择内容预设、检出程度、
转场类型和最短镜头，唯一纯解析器将其转换为严格的 `SceneDetectionConfig`；预设版本由
registry 注入，任务同时冻结用户设置快照、预设版本、canonical config/hash 和引擎配置。
React 不直接拼装 WASM 参数，Scene Engine 也不理解“电影/剧集”“短视频”等产品概念。
该控制层和 Zustand 设置 store 已由现有实现提供，只有通过独立 holdout 门槛的 preset 才能进入
生产 registry 与 UI。完整边界见
[自动分镜控制系统设计](../features/auto-shot/CONTROL_SYSTEM.md)。

自动分镜恢复使用版本化强媒体身份，不以文件名、MIME、修改时间或普通四字段 fingerprint
作为最终依据。只有完整 checkpoint 已持久化的任务才能标记为 `paused`；刷新或崩溃遗留的
`running` 记录必须进入 `interrupted` 并重扫。任务记录按项目唯一且可被新扫描覆盖，因此
正式镜头需保存独立、不可变的最小 provenance 快照，不能仅引用当前 task。

跨 Worker/AI/Export 的新长任务统一消费 `RuntimeTaskEnvelope`：稳定 taskId、统一 lifecycle、dependency revision、cancel 与 stale-result gate。Auto-shot 现有持久状态继续保持兼容，由 adapter 映射到统一 lifecycle；Phase 02 不为迁移状态名改写已有 task 数据。Provider contract 明确前端不得持有 server-owned secret，provider 结果只能进入 Candidate，不能直接写正式事实。

## 5. AisenShot Scene Engine 边界

`packages/scene-engine/` 是独立于 React 与项目领域模型的 C++/WASM 包。其输入是经过已验证策略规范化的解码帧，输出是带证据的镜头边界；Web Worker 负责 WebCodecs/Mediabunny 解码、像素预处理、WASM 调度、checkpoint envelope 和结果回传，TypeScript 适配器只将结果转换为可审阅的候选分镜。生产像素路径以 Phase 0 的 Web 端到端基准为依据，不预设浏览器能够请求 I420，也不把 Desktop/Mobile 当作当前实施门槛。

当前 Phase 0–12 的引擎与 Web 控制面接线已存在；Workflow 重构只复用这些能力，不修改
引擎 ABI、生产 preset 或时间线实现。实施时仅按已批准的架构与分阶段计划推进：

- [AisenShot 文档索引](../features/auto-shot/README.md)
- [AisenShot Scene Engine 架构方案](../features/auto-shot/ARCHITECTURE.md)
- [归档的 AisenShot Scene Engine 实施计划](../archive/auto-shot/IMPLEMENTATION_PLAN.md)

本阶段不在 Engine 中实现关键帧提取或其他视频分析能力；仅保留独立包与稳定输入/输出边界以便未来扩展。

## 6. 变更原则

- 新功能进入所属 feature，跨域能力先建立清晰服务接口。
- 不复制桌面或移动端业务实现，不为了推测的复用提前拆包。
- 数据模型或浏览器存储变更必须同时更新 `projectDatabaseMigration.ts` 的版本化升级契约、相关类型和本文件；禁止 destructive downgrade。
- 对参考项目的调研结论只记录在 `reference-projects/REFERENCE_PROJECT_INDEX.md`，不得直接迁移其实现。
