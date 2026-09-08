# P01 — Workspace Shell 与流程导航

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`3dc7c46`。

## Scope

建立项目顶栏、工作流导航、`/app` 的阶段 query 和布局/主题基础。当前 EditorWorkspace 作为唯一 Analyze 内容继续运行。Prepare/Calibrate/Overview/Learn/Create 在本阶段显示明确未开放的占位页面；下一阶段才能接入可写业务。

## Non-goals

不动 Shot/Group/Auto Shot/Timeline 的业务或 DB，不抽全量状态，不做 Film Map，不做 AI、不改算法；不恢复测试预览，不重构公共页面。不因为菜单名称变了就删除尚未迁移的功能。

## Current Files

路径相对仓库：

- `apps/web/src/app/App.tsx`、`app/AppPages.tsx`、`pages/EditorPage.tsx`：当前 `/app` 精确匹配与 activeProjectId 传递。
- `apps/web/src/features/project/components/ProjectLibrary.tsx`、`ProjectMediaGate.tsx`：项目选择和 render prop；本阶段保留 Gate 的媒体门控。
- `apps/web/src/features/editor/components/EditorWorkspace.tsx`：头部、leaveEditor、historyGuardInstalledRef/popstate、saveNow、快捷键、h-screen 布局。
- `apps/web/src/features/editor/hooks/useEditorSaveState.ts`、`shortcuts/useEditorShortcuts.ts`、`shortcuts/definitions.ts`。
- `apps/web/src/index.css`、`types/theme.ts`、`components/layout/AppNavigation.tsx`：dark/light 和共享导航。
- `apps/web/src/components/ui/{button,dialog,dropdown-menu,tooltip,tabs,sonner}.tsx`：优先复用，遵循已有 Base UI render API。

## New Files

预期新增（实际命名可以在同一职责下调整）：

- `apps/web/src/features/workflow/components/{ProjectWorkspaceShell,ProjectTopBar,WorkflowSidebar,WorkflowPlaceholder}.tsx`
- `apps/web/src/features/workflow/{types.ts,constants/workflowStages.ts,hooks/useWorkflowNavigation.ts}`
- `apps/web/src/features/workflow/services/workflowLocation.ts`：纯 URL 解析/验证，不做 I/O。
- `apps/web/src/features/workflow/stores/useWorkflowUiStore.ts`：项目作用域临时 UI，不复制 URL stage。
- `tests/features/workflow/workflow-location.test.ts`、`workspace-shell.browser.test.js`：新增测试，尚未存在。

## Data Changes

无 IndexedDB/Project/Shot schema 改动。URL 使用 `/app?project=<id>&stage=analyze&view=scenes`；本阶段默认可用内容仍为旧 Analyze。`stage` 枚举 prepare/calibrate/overview/analyze/learn/create，`view` 按 stage 白名单检查。不存在或非法 query 使用固定安全默认值，不能读任意对象键生成组件。

项目选择先看显式 project 参数；缺省沿用当前已选项目，没有项目显示现有选择提示。public pathname、SEO、密码重置不改。浏览器查询参数变化只改变导航，不写 ProjectRecord。

## Component Changes

1. 先提取现有顶栏 JSX 到 ProjectTopBar，保留原 callbacks（rename/saveNow/undo/redo/export/leave）与保存错误行为。Shell 接收 topbar slot，不能自行查询 DB 或建立第二个 save hook。
2. EditorPage 用 Shell 包裹唯一 EditorWorkspace；将原 h-screen 容器改为适配 Shell 的 flex/min-h-0。旧工具栏暂时存在于 Analyze 内，作为尚未搬走功能的唯一入口。
3. P01 过渡期间 EditorWorkspace 在同项目下持续挂载，切到占位阶段后其内容隐藏且 inert/不可聚焦。传入 `isActive` 停用编辑快捷键并暂停播放/音频，不重复挂 hidden video 或渲染所有阶段的完整 editor。
4. 占位页只有解释/返回深拆的可用按钮，不能假装已经迁移素材/检测。P02 移走资源 owner 后删除此隐藏宿主策略；它只是一个实现，不是新旧双轨开关。
5. 改造原 popstate guard：同 project 的阶段返回不调用 leaveEditor；离开项目才等待 saveNow。只能保留一处守卫，不能保留旧 pushState 陷阱再叠新路由逻辑。
6. 导航只订阅 stage 与低频状态，不把 currentTime 传给 Shell；顶栏对接原命令，按钮动作不能靠 DOM 查询点击旧按钮实现。

## User Flow

从项目库打开项目 → Analyze 中现有工具仍可操作 → 切 Overview 看“总览正在接入，当前可在深拆查看镜头” → 返回 Analyze 保留时间位置和草稿 → 修改一段笔记 → 保存 → 返回项目库。浏览器后退应先回上一阶段，而不是直接退出项目。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | 无项目时显示项目选择；不显示示例影片 |
| Loading | Gate/Suspense 加载时只显示布局占位和真实加载文字 |
| Ready | Analyze 原功能和完整顶栏；导航有明确当前阶段 |
| Disabled | 加载中禁用写操作；无可撤销历史时禁用 undo/redo |
| Error | 读取或保存失败保留上下文；保存失败不能离开 |
| Coming Soon | 其他阶段真实说明页，返回 Analyze 链接可用 |
| Experimental | 本阶段不新增实验能力；已有研究工具仍在原入口 |

## Theme Requirements

遵循 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§4–9、11、13–15、18–22、35。

使用 impeccable 的 Operate/shape 方法执行布局，不进行新的视觉方向选择。新 Shell 160px sidebar、紧凑 topbar；spacing 4/8/12/16/24，面板0–4px、按钮6px圆角，分区用 surface 和1px divider，无卡片墙。Cinema 深灰；Studio 冷灰 chrome；Viewer 默认深色。蓝色选中/焦点，保存状态用文字及语义色。先新增 workspace所需语义 token，并保持现有组件可读；P07 收尾全局旧覆写。不得增加第二套主题组件。

≥1280 显示 sidebar；768–1279 收成菜单；≤767 导航复用 Dialog。focus-visible 不可移除，图标按钮有名称，非激活编辑器不得被 Tab 访问。此阶段保留 dark/light，System 在 P07 完整接入。

## Migration

只搬布局/入口，EditorWorkspace key 仍按 projectId，不能按 stage key。旧保存、history、导出、截图/叠层都继续走同一个实例。未开放阶段不使文档 dirty。App 只调整必要路由/项目选择边界，业务 handlers 不搬到 App。

## Acceptance Criteria

- [ ] 打开已有项目/空项目不造数据，URL 与导航一致。
- [ ] 同项目跨占位阶段返回，草稿/时间/undo 保留，隐藏区不响应键盘或继续发声。
- [ ] 当前项目只有一个 EditorWorkspace、一组 save hooks、一个视频实例。
- [ ] 浏览器后退/前进可切 stage；dirty 保存失败时离开项目被阻止。
- [ ] 原素材、检测、Review、模板、Overlay、Marker、研究、Settings、Export 仍可达到。
- [ ] 两主题四尺寸可读，不出现双顶栏/双屏高度/页面底部不可达。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:editor-history`、`corepack pnpm build`。
新增 Node URL 测试覆盖合法/非法 stage、无项目、项目切换和保留无关 query；browser 测试覆盖 stage 后退与离开守卫，不写只检查组件名称的快照测试。复用现有 browser harness，记录启动/超时/清理结果；测试存放根 `tests/features/workflow/`，新增 runner 时显式列入实际 scripts，不引用不存在命令。

## Manual QA

1. 使用测试项目输入未保存笔记，连续切阶段5次再回来，检查光标/内容/时间码。
2. 播放时切占位页应停止声音，返回不自动播放；Tab 不进入隐藏按钮。
3. 浏览器后退两次/前进、Ctrl/Cmd+S、返回项目库；模拟 save reject 检查留页与重试。
4. 1440×900、1024×768、768×1024、390×844 各检深/浅色；记录打开/seek/播放Profiler基线给后续比较。

## Regression Checklist

R01 新旧项目、R05 undo/redo、R08 笔记、R11 保存、R12 导出入口、R13 主题、R14 焦点/窄屏、R16 路由。门控未重排之前，媒体重关联继续用原 Gate。

## Completion Gate

验收全部勾选、相关检查通过、实际变更/未验证项有记录后才进 P02。不能让隐藏编辑器泄漏快捷键或使返回按钮丢数据。

## Rollback

P01 独立提交；回退 Shell/路由改动即可恢复原编辑器，无 DB downgrade。只撤本阶段提交，不恢复废弃预览，不覆盖用户并行变更。
