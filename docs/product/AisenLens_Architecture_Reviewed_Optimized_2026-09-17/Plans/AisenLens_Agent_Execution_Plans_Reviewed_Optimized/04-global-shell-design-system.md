> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 04 — Global Shell + Workspace Design System

## 目标

交付后续所有工作台使用的 **AisenLens Native Studio** 母体：素材准备 / 逐镜分析 / 成果应用三 Workspace、桌面式 Window/Panel geometry、可 resize/collapse 的工作面板、布局记忆、统一 Studio Glass chrome、Overlay/source anchoring、主题/token、pointer/keyboard、motion 与性能体验基础。第一阶段可见交付必须是真导航、真状态和真实桌面交互，不做静态壳。

## UI 先行策略

Phase 04 可以先交付三 Workspace 的真实外壳，用于验证导航、布局、项目上下文和返回路径；这不等于提前完成后续业务功能：

- 可以实现真实路由、导航选中态、项目上下文、空态、loading/error/saved/unsaved 和明确的 Coming Soon 状态。
- Preparation、Analysis、Results 中尚未具备 domain/service 支撑的操作不得做成可执行按钮；需要保留入口时使用禁用状态并说明未接入原因。
- 不创建假数据、假进度、no-op 提交或点击后无反馈的控件；后续功能完成后再把同一入口接到真实能力。
- Phase 04 的验收证据必须分别记录 `shell/placeholder` 与 `implemented`，只有真实状态、键盘/焦点和错误路径通过验证，才能计入功能完成。

## 必读

`GLOBAL_WORKSPACE_ARCHITECTURE.md`、`WORKSPACE_DESIGN_SYSTEM.md`、Phase 01 code map、Phase 02 error/save contracts、Phase 03 v19 frozen data contracts、`docs/architecture/PROJECT_ARCHITECTURE.md`。

## 必须复用

- 现有 router/app shell/project context 可以复用；旧 visual token/palette 只作为迁移输入，不再是设计权威。
- 现有可访问组件、Base UI/shadcn primitives 与快捷键基础在结构兼容时复用；其视觉必须迁到 `WORKSPACE_DESIGN_SYSTEM.md` V2 Native Studio，不得保留第二套主题。

## Phase 03 / v19 硬前置

- Phase 04 从 Phase 03 已冻结的 v19 canonical boundary 开始工作：Shell/Navigation 只能消费 Project/Repository 状态，不得复制 Shot、AnalysisRecord、Candidate、Evidence、ContextManifest 或 Results 数据到 shell store。
- 顶层 **Workspace** 与 Workspace 内 **View/Mode** 必须拆开建模。顶层只允许 Preparation / Analysis / Results；Boundary Review、Timeline/Structure、Shots/Sound、Data Table、Export、Creative 等只能是二级 view/mode。
- Workspace/navigation state 属 application/session/view 边界，不得因为路由改造新增 canonical IndexedDB store 或修改 v19 domain ownership。
- Phase 04 开始实现前必须核对当前代码中 `features/workflow`、`EditorPage`、`EditorWorkspace` 的真实六阶段调用点；不得只改 Sidebar 文案而保留六套一级语义。

## 六阶段 → 三 Workspace 导航迁移契约

| 当前一级 stage | 目标归属 | Phase 04 处理原则 |
|---|---|---|
| `prepare` | Preparation / import | 迁为 Preparation 默认 view |
| `calibrate` | Preparation / boundary-review | 不再是一级入口；保留真实复核能力 |
| `overview` | Analysis / timeline-structure | 原 Film Map/结构信息下沉到 Analysis Timeline/派生结构视图，不保留 Overview 一级页 |
| `analyze` | Analysis / workbench | Shots/Scenes/Sound/ResearchScope 作为 Analysis 内部 view/mode，保留研究 URL 上下文 |
| `learn` | 按职责拆分 | 仍在编辑/复核 Notes/Evidence/Analysis 的能力回 Analysis；纯浏览/消费/成果整理进入 Results；禁止保留 Learn 一级 Workspace |
| `create` | Results / creative | 迁为 Results 内 Creative Transformation 二级页面 |

- 当前项目尚无需要长期兼容的正式外部 deep-link 契约，因此旧 `stage=` URL 不形成永久兼容层。若迁移期间需要临时 parser/redirect adapter，只能读旧值、写新值，并在 Phase 04 结束前删除；若有经过核实的外部链接需求，必须记录 owner、范围和删除条件。
- canonical URL/navigation writer 完成迁移后只能产生三 Workspace + 二级 view/mode；现有 browser tests、Return Context、research range URL 与内部 `onWorkflowNavigate` 调用必须同步迁移，不能让测试长期依赖旧 stage。
- Research 参数（scope/target/range）是 Analysis navigation context，不能因一级 IA 收敛而丢失；刷新/重开必须仍可恢复到正确 Workspace + view + target。

## Return Context 最小契约

Phase 04 只冻结跨 Workspace navigation contract，不实现 Phase 05/06 的领域纠错逻辑。最小字段/语义必须能够表达：

- origin workspace + origin view/mode；
- selected entity / research scope；
- 需要恢复的 playback position 与 viewport hint（只保存必要值，不复制领域对象）；
- correction target（Shot/Boundary 等稳定 ID）；
- return/fallback 规则：目标仍存在则恢复原 selection；目标被 split/merge/remap 后由后续领域结果解析；无法恢复时回到最近合法上下文并显式提示。

Return Context 属 application/navigation state；不得把它写入 Shot/Analysis canonical facts，也不得自行解释 split/merge 后的语义有效性。

## 实施步骤

1. 收敛一级导航为 Preparation / Analysis / Results，并按“六阶段 → 三 Workspace 导航迁移契约”完成类型、URL parser/writer、内部 navigation call 和测试迁移；不能只隐藏旧入口。
2. 固定左导航、顶部项目状态、主 Workspace 三区域；项目级 saved/error 状态读取 Phase 02 repository contract。
3. 按本计划冻结的 Return Context 最小契约落实 Breadcrumb/跨 Workspace 承载能力，为 Analysis→Preparation correction 预留真实 navigation state；Phase 05/06 只能扩展领域结果，不得另造第二套返回上下文。
4. 建立 Native Studio overlay system：Drawer/Inspector/Modal/Popover/Context Menu/Command Palette 共用 z-layer、portal、source anchoring、focus trap/restore；局部动作从触发源出现，不默认居中 Modal。
5. **从零迁移视觉系统**：实现 Graphite + Frost + Signal Blue 的 V2 token、Studio Glass、typography、2px precision grid、radius、hairline、shadow、focus、motion；旧 `--app-*` / blue `#3b82f6` / `--ai` / legacy timeline palette 只允许中央短期 alias，不能成为新代码入口。
6. 建立共享桌面组件：Window Bar、Workspace Rail、Resizable Panel、Panel Header、Resize Handle、Button/IconButton/Input/Toolbar/Transport/Popover/Context Menu/Command Palette/Inspector shell；不为未来假需求建立完整组件库。
7. 实现 native interaction state：hover/pressed/focus-visible/selected/disabled/loading/error/dragging/drop-target，并保证 Selection、Playback、Focus、Research Context 四类语义分离；direct manipulation 使用 pointer capture + live preview + safe cancel。
8. 建立 versioned UI preference + layout memory：Workspace Rail、Panel width/visibility、Timeline height、Density、Grid/List、last view/mode 按 V2 ownership 持久化；不得进入 canonical domain store。
9. 落实 ≥1440 Pro / 1180–1439 Compact / 960–1179 Focus / <960 Review-Survival 四档；桌面编辑体验优先，不追求手机全功能等价。
10. 建立 performance-as-design gate：禁止 `transition-all`、大面积 backdrop blur、drag 中 persistence、无关 playback rerender；大列表按真实规模 virtualize/window。

## 状态与验收

- 空项目/无可进入数据时有明确入口，不是假功能。
- loading/error/disabled/unsaved/saved/focus/keyboard 路径真实工作。
- theme、focus ring、tab 顺序、tooltip、source-anchored overlay opening/closing/restore、panel resize、layout memory、Context Menu、Command Palette 均可真实浏览器验证。
- Workspace 切换不丢 project context；不把 domain 数据复制到 shell store；返回原 Workspace 时恢复其用户布局偏好。
- Pointer hover/press/drag/resize 在交互期间连续响应；后台 loading/save/task 不锁死整个 Workspace。

## 旧路径退出

旧 `prepare/calibrate/overview/analyze/learn/create` 一级 stage 语义、Overview 一级入口，以及旧 `Calm/Cinematic` 视觉、Primary Violet/legacy blue、`--app-*`、`--ai` 私色、旧 spacing/motion/density、页面私有颜色/圆角/阴影/z-index/临时 modal 规则全部退出。迁移 adapter 只能作为短期兼容并有删除条件；Phase 04 完成后不得长期维护两套 IA 或两套视觉/交互语言。

## 测试

运行 Phase 01 登记的 UI/unit/e2e/browser 命令；真实浏览器 smoke 覆盖三 Workspace 切换、旧六阶段 URL 的处理符合迁移决议（若临时 adapter 保留则只读映射并 canonicalize；若已删除则受控 fallback）、canonical URL writer 只写新 workspace/view、research target 刷新恢复、Return Context round-trip、主题、键盘、窄屏折叠、overlay/focus。若现有 E2E 不覆盖，则新增最小真实测试，不使用假页面。

## 交给下一阶段

稳定的三 Workspace shell route/context、Workspace/View 分层类型、旧六阶段迁移完成的 canonical navigation、design tokens/components、save/error surface、Return Context API 与明确的 legacy adapter 删除状态。

## 架构优化完整覆盖清单

Phase 04 必须显式覆盖 `GLOBAL_WORKSPACE_ARCHITECTURE.md` 与 `WORKSPACE_DESIGN_SYSTEM.md` 的完整优化目标，而不只实现 tokens 和三栏壳：

### Global IA / Shell
- 三个一级 Workspace 的职责、进入条件、空态/错误态与跨 Workspace Return Context 明确；Overview 信息下沉，不保留竞争一级入口。
- 左侧导航只承担工作阶段/工作区切换；顶部承担项目名、保存/异常、全局工具等项目级状态；主工作区承载具体任务，不把 domain 事实复制到 shell store。
- Workspace / Drawer-Sheet / Inspector / Modal / Dropdown-Popover 层级固定；Modal 仅用于真正阻塞决策，扫描/长任务不以全屏阻断式 Modal 代替工作台状态。
- Global Shell 只承载项目级状态与稳定窗口 chrome；工作区内部信息密度由 Native Studio Panel/Density/Layout Memory 处理，工程标识只在诊断或专家设置出现。

### Native Studio Experience
- **Single-window continuity**：三个 Workspace 在一个稳定 App Window 内切换；Global Chrome 不重建，Panel geometry 尽量连续，不出现网页式整页跳转。
- **Panel system**：Workspace Rail / Navigation / Primary / Inspector / Timeline 可 resize/collapse；6px resize hit-zone、1px seam、pointer capture、双击恢复默认（适用处），并按 Workspace 记忆布局。
- **Direct manipulation**：drag/scrub/resize/reorder/inline edit 优先于参数表单；拖动中显示 live preview 与 invalid target，commit 与 preview 分离。
- **Studio Glass**：只用于 toolbar/floating controls/popover/menu/command/drawer 等功能 chrome；大面积 Work Surface 使用 solid material，并提供 blur fallback。
- **Interaction & Motion**：hover≈90ms、control≈120ms、reveal≈160ms、panel≈220ms、workspace≈280ms；source-anchored transform-origin；禁止 `transition-all`，尊重 reduced-motion。
- **Color/Depth**：统一 Graphite + Frost + Signal Blue；AI 只允许低频 Intelligence Signal，不建立独立 theme；depth 由 material/hairline/shadow/overlap/motion 联合表达。
- **Density**：Comfort / Standard / Compact 是 UI geometry preference；Workspace mode 是 panel configuration，两者不得混成一个枚举。
- **Desktop input**：keyboard + mouse/trackpad 平权；right-click Context Menu、Command Palette、cursor language、Tooltip shortcut 是正式交互能力。
- **Performance**：UI smoothness 属设计验收；hover 不触发 query、drag 不做 persistence、大列表 virtualize、playback 不重渲染无关树、玻璃层数量受控。
- **Accessibility**：WCAG AA、focus-visible 与 selected 分离、keyboard-only、overlay focus restore、reduced-motion、高 zoom 可用。

### 组件覆盖与迁移
- Window Bar、Workspace Rail、Resizable Panel、ShotCard/ShotStrip、NavigationPanel、Inspector/Section、Toolbar/Transport、Popover、Context Menu、Command Palette 的 geometry/state/material 必须来自同一 Native Studio System；已使用者不得 feature 私有复制。
- 页面私有 token/overlay/focus/keyboard/cursor/resize/motion 规则在消费者迁移后删除；Tailwind/shadcn 只作为 semantic adapter；legacy visual alias 必须有退出条件。

## 完整性验收

除了原测试，还要用真实浏览器验证：Dark/Light Pro Layout、Compact/Focus Desktop、panel resize + layout restore、hover/pressed/selected/focus、source-anchored popover/context menu、direct drag preview、local loading、AI Intelligence Signal、overlay focus restore、tooltip shortcut、Density 切换、reduced-motion，以及大列表/blur/transition 的性能体验检查。Traceability 中映射到 Phase 04 的全部章节必须有 evidence 或明确 deferred/non-goal。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
