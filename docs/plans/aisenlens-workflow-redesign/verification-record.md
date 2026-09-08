# Workflow 重构实施验证记录

日期：2026-09-08

## 阶段提交

- P01 `3dc7c46` — workspace shell 与阶段导航
- P02 `6a8a9be` — 项目 Session owner
- P03 `b899a6e` — Prepare / Calibrate
- P04 `fb3ebc2` — Overview / Film Map / Structure
- P05 `723d80b` — Analyze / Inspector / Sound
- P06 `b7c6a82` — Learn / Create 状态
- P07 `0248c94` — Cinema / Studio / System
- P08（本阶段最后一条提交）— 清理、文档与统一 Workflow runner

## 自动验证

- `node --experimental-strip-types --test tests/features/workflow/workflow-location.test.ts`：通过，3 项。
- `node --experimental-strip-types --test tests/features/workflow/project-session.test.ts`：通过，2 项。
- `node --experimental-strip-types --test tests/features/workflow/film-overview.test.ts`：通过，2 项。
- `node --experimental-strip-types --test tests/features/workflow/shot-inspector.test.ts`：通过，1 项。
- `node --experimental-strip-types --test tests/features/workflow/learning-sources.test.ts`：通过，1 项。
- `node --experimental-strip-types --test tests/features/workflow/theme-preference.test.ts`：通过，1 项。
- P01–P07 各阶段 `corepack pnpm --filter @aisenlens/web typecheck`、`lint`、`build`：通过。
- `corepack pnpm test:auto-shot-config`：通过，5 项；测试同步到当前已晋升的 production preset catalog。
- `corepack pnpm test:auto-shot-settings-store`：通过，2 项。
- `corepack pnpm test:auto-shot-baseline`：通过，1 项；浏览器 Scene Engine 矩阵约 104 秒。
- `corepack pnpm test:video-export`：通过，1 项；浏览器导出约 45 秒。
- `corepack pnpm test:workflow-browser`：通过，1 项；独立 profile 创建空项目并验证六阶段路由与内容。
- `corepack pnpm verify:web`：通过，类型检查、Lint、既有核心测试、Workflow runner 与生产构建全部通过。

## 人工与视觉证据

- 已在 Edge 的已有本地项目上人工切换 Prepare、Calibrate、Overview / Film Map / Structure、Analyze / Scenes / Shots / Sound、Learn、Create；阶段 query 与页面内容同步，未修改项目数据。
- 已打开项目库设置的 Theme 面板，确认 Cinema、Studio、System 三个选项及 System 跟随系统说明可见。
- impeccable detector 扫描发现 `index.css` 中现有 Geist / Arial 字体提示；本轮遵循“不重新选择字体”的计划约束，未为消除该提示改变既有字体系统。

## 未宣称通过的项目

本记录不把未在隔离浏览器 profile 中执行的跨阶段工作流、媒体/IndexedDB 事务、四尺寸响应式、键盘/IME、200% 缩放、reduced-motion、长片性能对照与故障注入写成通过。现有自动分镜和视频导出专项测试已按原脚本独立运行；构建保留既有 WASM 外部化与大 chunk 警告。

## 数据与回滚

本轮未修改 IndexedDB schema。阶段提交可按 P08→P01 逆序回退；用户项目、媒体、截图、镜头、分组、标记、模板、音轨和任务 reader 未被清理。
