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

## 补充验收（2026-09-08）

- 四尺寸响应式：在 Edge 真实项目 `donghua03` 上检查 1440×900、1024×768、768×1024、390×844。1440 与 1024 仍可按桌面工作区使用；768 与 390 虽通过 `overflow-x: hidden` 隐藏了横向滚动，但多栏编辑器保持固定桌面宽度，视频/时间线被裁切，不能判定为可用响应式。
- IME/键盘：在镜头 Browser 检索框输入并清除“中文输入测试”通过；Tab 连续进入镜头卡片和“播放镜头”按钮，未观察到焦点陷阱。CUA 只能验证字符输入和渲染，不能模拟 Windows IME 的 composition 事件，因此完整中文输入法转换仍未宣称通过。
- 200% 缩放：浏览器快捷键无法由当前自动化通道直接驱动 Edge 菜单，使用 1440×900 等效的 720×450 CSS 视口检查。无横向滚动，AX 树仍暴露 146 个镜头和 Inspector 字段；但视觉布局主要显示 Inspector，镜头内容不可同时可见，按 200% 可用性标准不通过。
- 长片性能：真实项目时长 02:43:23、146 镜头；8 次 Scenes / Shots / Sound 切换约 0.97–2.69 秒，最后一次自动读取超时约 5.18 秒，但页面仍恢复为可操作的 Scenes。完整 Scene Engine 浏览器矩阵通过 1 项，处理约 119 秒。
- 故障注入：直接运行任务保存/启动失败、媒体身份/空媒体/取消、候选区间错误、导出边界测试，合计 19 项全部通过；任务失败能进入终态并释放引擎，媒体和候选输入能拒绝非法状态。通过的服务级故障注入不等于真实浏览器断网/权限弹窗验收。

## 验收结果优化复测（2026-09-08）

- 响应式：将阶段导航改为小屏横向导航，编辑器主体改为可收缩的纵向布局；390px 顶部项目操作区同步压缩。Edge 复测 1440×900、1024×768、768×1024、390×844，页面级 `scrollWidth` 均等于视口宽度；小屏 Analyze / Shots 的镜头列表与 Inspector 上下分区可见，桌面仍保持侧栏与双栏布局。
- 200% 等效视口：720×450 复测无页面级横向溢出，Analyze / Shots 的搜索框、镜头列表和 Inspector 均可见；原先只显示 Inspector 的固定多栏裁切已消除。真实浏览器缩放菜单仍未由 CUA 通道驱动。
- 项目深链：编辑器初始化优先读取 URL 的 `project` 参数，直接打开 `?project=...&stage=analyze&view=shots` 可加载 `donghua03`，不再依赖同一会话先打开项目库。
- 长片性能：Shots 不再预取 146 个镜头的全部截图元数据，也不在非 Scenes 视图后台生成边界截图；截图资源改为进入 Scenes 后按需加载。复测 `donghua03`（02:43:23、146 镜头）时 Shots 页面无错误且最终稳定展示 146 条记录，切回 Scenes 后首尾帧与时间线正常恢复。CUA 的部分点击等待仍有 1–5 秒输入通道抖动，不能将其全部归因于页面渲染耗时。
- 视频关联：项目进入时优先复用已保存的 File System Access 句柄；在同一应用会话中若句柄暂时不可从仓库取回，则复用本会话刚选择的视频文件，避免阶段切换或离开项目页后重复导入。持久化句柄不存在于当前浏览器上下文时仍需重新授权/关联，这是浏览器本地文件安全边界。
- 素材入口：原编辑器侧栏的“素材”工具及旧素材面板已移除，视频导入、素材状态和音频轨道管理统一在准备阶段提供。
- 分镜入口：原编辑器侧栏的“分镜”工具及自动分镜面板已移除，自动分镜统一在准备阶段执行；Analyze 的镜头列表仍保留分析、分割和播放，Overview 发起的镜头分组选择会在列表上方显示上下文操作。
- 模板设置入口：准备阶段“模板设置”按钮已直接打开现有模板编辑弹窗，共用字段编辑、排序、增删和项目级保存逻辑，不再跳转到 Analyze Scenes；原编辑器侧栏的“拉片模板”工具及其旧面板已移除，避免重复入口。
- 回归：本轮 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build`、`corepack pnpm test:workflow`（10 项）和 `corepack pnpm test:workflow-browser`（1 项）均通过；故障注入的 19 项服务级结果保持通过。

## 未宣称通过的项目

本记录仍不把 reduced-motion、真实 Windows IME composition、真实浏览器 200% 菜单缩放、断网/权限弹窗注入写成通过；长片切换的精确用户端耗时仍需真实性能 profiler 与稳定的浏览器输入通道确认。现有自动分镜和视频导出专项测试已按原脚本独立运行；构建保留既有 WASM 外部化与大 chunk 警告。

## 数据与回滚

本轮未修改 IndexedDB schema。阶段提交可按 P08→P01 逆序回退；用户项目、媒体、截图、镜头、分组、标记、模板、音轨和任务 reader 未被清理。
