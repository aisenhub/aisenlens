> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 06 — Analysis Workspace + Inspector

## 目标

建立高密度但可理解的真实分析闭环：Structure Navigator → Player → Selection/Research Scope → Inspector Field/Evidence → autosave → Timeline 联动 → Shot correction Return Context。

## 必读

`ANALYSIS_WORKSPACE.md`、`ANALYSIS_INSPECTOR.md`、Analysis Data、Evidence、Template、Global Design System、Shot correction contract。

## 四类状态必须独立

- PlaybackPosition：当前播放位置。
- SelectedEntity：用户当前研究对象。
- ResearchScope：Shot/Scene/Sequence/Section/Story 等分析尺度。
- Viewport：Timeline/导航可视范围。

任何 store 实现都不得把四者压成一个“current”对象导致互相覆盖。

## 实施步骤

1. Structure Navigator：Scene/Shot/Sequence/Section 行、fold、needs review、selected vs playing、键盘 Enter/Esc/导航。
2. Player Stage：selection context、overlay（不改原媒体）、controls、media error/missing。
3. Inspector Shell：一个 Shell + entity renderer；Scene 不是 Shot 字段放大版。
4. Analysis Field：正式值/unknown/NA、autosave、group、长文本、来源视觉；技术元数据渐进披露。
5. Evidence UI：chip、hover preview、jump、picker、Scene evidence；provenance 可查但不抢主视觉。
6. Data Review 与 AI Review 分离；stale 和 Candidate 可同时存在。
7. Renderer Registry：受控 registry，只支持已批准 field renderer，不建任意插件系统。
8. Marker：作为自由观察，和正式结构/Object Analysis 区分。
9. Correction Flow：More/Timeline boundary/context menu → Flag/Return Context → Preparation → 结构修改 → 返回原 selection/context → 展示 remap/stale/revalidation 队列。
10. Responsive/Panel collapse/Undo/Redo/save/error 统一接 Phase 02/03 基础能力。

## 正常与异常状态

无 Official Shot、媒体丢失、empty field、loading、autosaving、saved、save failed、stale、conflict、candidate、evidence missing/required、disabled、collapsed panel、narrow screen、返回 correction 后 selection 不存在等都有明确行为。

## 禁止

- Inspector 自己拥有 Analysis lifecycle/repository semantics。
- Analysis 直接写 Shot boundary。
- “全部采用 AI”默认成为主路径。
- 用大量一级 tabs/cards/modal 掩盖信息架构问题。

## 测试

浏览器真实操作覆盖 selection 与 playing 分离、ResearchScope、keyboard/focus、field autosave failure/retry、Evidence jump、stale + candidate 并存、correction return context、responsive collapse、reload 恢复。单元/集成使用 Phase 01 真实命令。

## 完成门槛

用户能从导航→播放→编辑→证据→保存→纠错→返回完成真实闭环；所有写入通过 Phase 03 Analysis Authority 或 Phase 05 Shot command。

## Analysis Workspace 完整优化清单

### Workspace shell / navigation
- 完整桌面结构包括 Toolbar、Research Breadcrumb、Structure Navigator、Player Stage、Selection Context Bar、Analysis Inspector、关联 Timeline；不是只拼三栏。
- Research navigation 明确单击/双击/Enter/Esc/Breadcrumb 行为；selected、playing、research scope、viewport 四种状态分别可视、可测试。
- Structure Row 针对 Scene/Shot/Sequence/Section 展示各自必要信息、needs-review、fold、selected/playing，不用一个通用 row 抹平层级语义。
- Player overlay 只显示上下文/分析辅助，不修改原媒体；Playback controls 与 timeline keyboard priority 一致。

### Template / settings / Marker / AI placement
- 实现 Template Selector 与 Analysis Settings Drawer；Template 与 Shot/Scene/Story 三种分析尺度关系清晰；Template 不直接生成 Timeline Track，Track Preference 独立。
- Marker 创建/Inspector/Scope 与 Object Analysis、正式 Scene/Shot 层级区分。
- AI Status/Settings/Ask 的**位置和状态语义**按架构预留/实现；若 Phase 09 才有真实 provider，本阶段不得造假成功态，但 UI contract 要允许后续接入而不重写信息架构。

### Correction Return Context
- “调整分镜”入口覆盖 Inspector More、Timeline Boundary Hover、Timeline Context Menu；进入 Preparation 前有必要的意图/上下文确认。
- Return Context 保存 origin workspace、selection、research scope、playback/viewport 中需要恢复的部分；返回时自动恢复可恢复 Selection，不存在时给明确 fallback。
- Split/Merge/Move 后分别展示 Structural Remap 与 Semantic Revalidation；Scene/Sequence/Section 成员/派生状态按 contract 同步，Editing Pace 等 derived 重新计算。
- 影响队列区分 Data Review 与 AI Candidate；返回 Analysis 后明确提示哪些已 remap、哪些 stale、哪些必须人工复核。

## Inspector 完整优化清单

### Shell / entity renderer / header
- 一个 Inspector Shell，Shot/Scene/Sequence/Section/Film/Story/Marker 使用差异化 renderer；Scene 有 Statistics 与 Interpretation 分区，Story/Sequence/Section/Film 不能只是 Shot 字段列表放大。
- Header 按 entity 展示身份/上下文/状态；状态不能做成“评分”；More Menu 放低频操作。
- Body 不用一级 Tabs 堆砌；遵循 view-first/edit-second，Field 是核心单元，技术元数据渐进披露。

### Field / source / review
- Algorithm/Derived、AI Proposal、Human/Confirmed、Imported 等视觉语义可辨；人工输入默认成为正式工作值并显示 autosave/saved/error。
- AI 与正式值冲突时并排审阅；Accept 显式，Reject 不污染 formal value；不默认“全部采用”。AI suggestion 分 observation/interpretation，不展示长推理链。
- 支持 multi-field suggestion 的逐项 review；Data Review（stale）与 AI Review（candidate）分别计数/模式，可同时存在但不合并为“待处理 N”。
- “分析完成”只作为状态/提示，不成为阻塞式流程锁。

### Evidence / groups / relationships
- Evidence chip/hover/jump/picker/Scene Evidence 完整；Provenance 默认弱化但可随时查询。
- Field Group 有清晰展开策略；长文本 autosave；Shot Relationship Analysis 等跨对象分析遵循正式 Analysis Data，不在 Inspector 内造副本。

### Timeline 双向与 renderer registry
- Field → Timeline 定位/高亮；Timeline → Inspector 选择对应字段/对象；Inspector 修改后只通过 Analysis revision 让 Timeline derived view 更新。
- Renderer Registry 受控且有推荐组件目录；renderer 不拥有字段语义/跨域写入；不建设任意动态插件系统。
- AI Ask Bar/输出/Shot-Scene-Story Context 的 UI 与语义可落地，但 Ask 输出不是正式 Analysis，写入仍走 Candidate/Accept；真正 provider/context execution 在 Phase 09。

## 响应式与错误完整性

除现有异常状态外，按架构验证 ≥1440、1180–1439、<1180 三档和专注播放/分析/结构的 Panel Collapse；无 Official Shot、media missing、save failure、conflict、stale、candidate、evidence-required、correction-return selection missing 均有恢复动作。

## 完整性验收

真实浏览器至少完成：Toolbar/Breadcrumb 导航、四状态独立、Template/Settings、Marker、各 entity Inspector、view→edit、source visuals、Evidence 全链路、Data Review+AI Review 并存、Field↔Timeline 双向、Correction Split/Merge/Move 返回、selection fallback、panel modes、keyboard/focus、reload/autosave failure。Traceability 中 Analysis Workspace + Inspector 全部章节须有 evidence/deferred/non-goal。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
