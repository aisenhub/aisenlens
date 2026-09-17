> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 03 — Global Shell + Workspace Design System

## 目标

交付后续所有工作台使用的稳定母体：素材准备 / 逐镜分析 / 成果应用三 Workspace、项目上下文、统一 Overlay 层级、主题/状态/键盘/响应式基础。第一阶段可见交付必须是真导航和真状态，不做静态壳。

## 必读

`GLOBAL_WORKSPACE_ARCHITECTURE.md`、`WORKSPACE_DESIGN_SYSTEM.md`、Phase 01 code map、Phase 02 error/save contracts。

## 必须复用

- 现有 router/app shell/project context/design tokens/components；能扩展则不复制。
- 现有可访问组件和快捷键基础；不要新建平行 UI kit。

## 实施步骤

1. 收敛一级导航为 Preparation / Analysis / Results；旧 Overview 若存在，按架构决定迁移其信息到 Timeline/派生视图，不作为竞争一级入口。
2. 固定左导航、顶部项目状态、主 Workspace 三区域；项目级 saved/error 状态读取 Phase 02 repository contract。
3. 落实 Return Context/Breadcrumb 的跨 Workspace 承载能力，为 Analysis→Preparation correction 预留真实导航状态。
4. 统一 Drawer/Inspector/Modal/Popover/Context Menu/Command Palette 层级和 focus trap/restore 规则。
5. 按现有 token 系统实现/补齐 surface、dark/light、accent/semantic、typography、spacing、radius、border、shadow、focus。
6. 补齐后续需要的 Button/IconButton/Input/Toolbar/NavigationPanel/Inspector/ShotCard/ShotStrip 等状态；不为未来假需求建立完整组件库。
7. 实现 Interaction State Model：hover/selected/focus/disabled/loading/error/dirty/saved；Selection 与 Playback 视觉语义不得混用。
8. 落实 density、panel collapse、≥1440 / 1180–1439 / <1180 策略，以文档为目标并结合现有布局核实。

## 状态与验收

- 空项目/无可进入数据时有明确入口，不是假功能。
- loading/error/disabled/unsaved/saved/focus/keyboard 路径真实工作。
- theme 切换、focus ring、tab 顺序、tooltip、overlay closing/restore 可浏览器验证。
- Workspace 切换不丢 project context；不把 domain 数据复制到 shell store。

## 旧路径退出

Overview 一级入口、页面私有颜色/圆角/阴影/临时 modal 规则逐步退出；在全部消费者迁移前可保留 adapter，但不得长期维护两套设计语法。

## 测试

运行 Phase 01 登记的 UI/unit/e2e/browser 命令；真实浏览器 smoke 覆盖三 Workspace 切换、主题、键盘、窄屏折叠、overlay/focus。若现有 E2E 不覆盖，则新增最小真实测试，不使用假页面。

## 交给下一阶段

稳定的 shell route/context、design tokens/components、save/error surface、Return Context API。

## 架构优化完整覆盖清单

Phase 03 必须显式覆盖 `GLOBAL_WORKSPACE_ARCHITECTURE.md` 与 `WORKSPACE_DESIGN_SYSTEM.md` 的完整优化目标，而不只实现 tokens 和三栏壳：

### Global IA / Shell
- 三个一级 Workspace 的职责、进入条件、空态/错误态与跨 Workspace Return Context 明确；Overview 信息下沉，不保留竞争一级入口。
- 左侧导航只承担工作阶段/工作区切换；顶部承担项目名、保存/异常、全局工具等项目级状态；主工作区承载具体任务，不把 domain 事实复制到 shell store。
- Workspace / Drawer-Sheet / Inspector / Modal / Dropdown-Popover 层级固定；Modal 仅用于真正阻塞决策，扫描/长任务不以全屏阻断式 Modal 代替工作台状态。
- 交互文案使用用户任务语言而非工程术语；正常状态安静，异常/待处理状态突出；信息密度按工作内容组织，不做 dashboard/KPI 化。

### Design System 行为
- **Interaction**：default/hover/pressed/focused/selected/disabled/loading/error 一致；Hover 只 reveal/preview/highlight/quick action，不触发布局跳变；Selected 明确表示“正在驱动 Player/Inspector/Timeline 等面板”。
- **Motion/Easing**：采用统一短时长 motion/easing，表达 state/continuity/relationship/position；高频工作流不使用拖沓动画，并尊重 reduced-motion（如现有可访问基础支持）。
- **Media First**：媒体保持完整色彩/对比/视觉忠实，UI 低饱和、低抢占；颜色用于语义而非模块彩虹编码。
- **Density/Workspace Modes**：Visual/Analysis/Data density 与 Watch/Shots/Analyze/Storyboard/Compare 等 panel configuration 采用同一 Workspace，不复制成互不一致页面；只实现当前产品实际需要的 mode，但底层状态模型能承载架构定义。
- **View Preference**：Grid/List、thumbnail size、aspect ratio、title/duration/metadata/shot number/tags 等偏好若当前范围实现，归 view preference，不进入 domain canonical data。
- **Empty/Loading**：空态简洁“解释 + 一个行动”；已有内容保持并局部 loading，避免整页 skeleton/整 Inspector 闪烁。
- **AI UI foundation**：AI 不建立独立渐变/发光视觉世界；AI Proposal 与 Confirmed Data 有可辨但克制的语义。这里只落 shared style/state，真实 AI workflow 在 Phase 09。
- **Editing Philosophy**：view first, edit second；Inspector/字段默认阅读态，进入编辑时才显示控件，不把专业工作台做成永久大表单。
- **Accessibility/Keyboard/Tooltip**：WCAG AA 对比；状态不只靠颜色；focus ring/tab order/keyboard-first；Tooltip 简短并展示快捷键；Command Palette 可按真实需求接入。
- **Anti-pattern gate**：Dashboardization、Card Everything、Rainbow UI、Huge Radius、Heavy Shadow、Permanent Controls、Deep Page Navigation 均列入视觉审查；页面完成后检查“UI 是否与媒体竞争注意力”。

### 组件覆盖与迁移
- ShotCard/ShotCard states/hover preview、ShotStrip、NavigationPanel、Inspector/Section、Toolbar/Context Toolbar、Popover、Context Menu、Command Palette 的共有状态必须来自同一设计系统；不要求一次实现未使用组件，但凡当前阶段/后续阶段已使用者不得私有复制。
- 页面私有 token/overlay/focus/快捷键规则在消费者迁移后删除；adapter 只能短期存在并有退出条件。

## 完整性验收

除了原测试，还要用真实浏览器验证：hover 无 layout jump、selected 驱动关系、局部 loading、view-first editing、AI proposal 基础视觉、overlay focus restore、tooltip shortcut、至少一个 density/panel mode 切换，以及设计 anti-pattern 审查。Traceability 中映射到 Phase 03 的全部章节必须有 evidence 或明确 deferred/non-goal。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
