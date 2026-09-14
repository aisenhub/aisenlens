# AisenLens 开发指南

> 最后核对：2026-09-14
>
> 本文承载项目技术栈、目录职责、开发命令和实现约束。Agent 的行为规则只放在根目录
> `AGENTS.md`；历史计划与过程记录位于 `docs/archive/`。

## 技术栈与交付范围

- React 19 + TypeScript + Vite。
- Tailwind CSS v4；复用现有 shadcn/ui 组件和 AisenLens 主题 token。
- pnpm workspace；使用 Corepack 调用仓库锁定的 pnpm。
- Zustand 管理跨页面、轻量的客户端状态。
- 当前交付范围是 Web：`apps/webhome` 是公开内容站，`apps/webapp` 是产品 renderer。
- Desktop/Mobile 壳保留在仓库中，但不作为当前 Web 功能的阻塞验收门。
- 产品数据是 local-first，主要保存在浏览器 IndexedDB；当前产品没有云端账户边界。

## 目录职责

```text
apps/webhome/src/       公开页面、教程、法律页、SEO 与预渲染
apps/webapp/src/        项目库、编辑器、媒体、分析、导出与业务功能
packages/scene-engine/  可独立构建/测试的 C++/WASM 场景引擎
scripts/                开发验证、构建辅助和一次性工具
tests/                  跨模块测试与浏览器验证
docs/                   当前规范、架构、运维和归档资料
reference-projects/     定向研究用参考项目，不是当前实现来源
```

`apps/webapp/src/` 的职责分层：

```text
app/          启动、路由、全局 providers 与应用编排
pages/        页面级组合
components/   无业务的通用 UI 与布局
features/     按业务能力组织的组件、hooks、services、types
hooks/        跨 feature 的通用 React hooks
stores/       轻量全局客户端状态
services/     IndexedDB、媒体、文件和其他外部通信
database/     持久化模型及数据库边界
types/        跨 feature 的共享类型
utils/        纯函数
constants/    稳定配置和路由常量
assets/       应用静态资源
```

页面负责组合 feature，不直接访问仓储或外部服务；业务逻辑不进入通用 UI 组件；`App.tsx`
只负责路由、布局、providers 和启动编排。视频、时间线、标注、分析、项目等逻辑留在对应
feature 内。

## 常用命令

从仓库根目录执行：

```powershell
corepack pnpm install
corepack pnpm dev:webapp
corepack pnpm dev:webhome
corepack pnpm build:web
corepack pnpm verify:web
corepack pnpm scene-engine:verify:core
corepack pnpm scene-engine:verify:web-preview
```

`verify:web` 是两个 Web release unit 的综合门禁，包含 typecheck、lint、核心回归、构建、
预渲染和边界检查。平台壳只有在任务明确纳入范围时才执行其专项命令。

## UI 实现顺序

1. 检查 `apps/webapp/src/components/ui/` 是否已有可复用组件。
2. 检查当前 feature 或相邻页面是否已有业务组件。
3. 只差样式或少量行为时，通过 props 或 `className` 扩展，不复制实现。
4. 确实缺少组件时才执行 `corepack pnpm dlx shadcn@latest add <name> --yes`。
5. 新 shadcn 组件放入 `apps/webapp/src/components/ui/`，并使用现有主题 token。
6. 修改或新增 UI 组件后运行 `corepack pnpm build`。

保持现有视觉设计和响应式行为；不因为一次功能任务引入新的 UI 框架或无必要的 CSS 文件。

## 数据、服务与依赖边界

- 组件不得直接操作 IndexedDB、文件、媒体或外部服务，统一经过 `services/`。
- Zustand 不替代数据库，不保存大型 Blob、File、Worker、WASM runtime 或候选大数组。
- 数据结构改动必须同步当前 schema、类型、仓储和验证记录；不得为没有生产数据的历史格式增加迁移兼容层。
- 新依赖加入前先确认现有依赖无法满足需求，并在变更记录中说明理由。
- 共享 package 只在有清晰的独立构建、测试或运行时边界时创建；不要为了猜测未来复用提前拆包。

## 新模块研究

实现新的产品模块前，先研究成熟公开方案或浏览器 API，再形成 AisenLens 提案；需要使用
本地参考项目时按 `OpenReel → OpenCut` 顺序定向读取，只看模块相关文件，并将确认过的结论
写入 `reference-projects/REFERENCE_PROJECT_INDEX.md`。不得复制参考项目的整体实现。

## 文档维护

- 架构和数据边界变更：更新 `../architecture/PROJECT_ARCHITECTURE.md`。
- 发布、域名、环境变量和线上验证：更新 `../operations/OPERATIONS.md`。
- SEO、canonical、robots、sitemap：更新 `../seo/SEO_DISCOVERABILITY_PLAN.md`。
- 后续工作：更新 `DEVELOPMENT_TODO.md`。
- 历史计划、阶段提示词、过程验证和旧设计：放入 `docs/archive/`，不作为当前规范引用。
