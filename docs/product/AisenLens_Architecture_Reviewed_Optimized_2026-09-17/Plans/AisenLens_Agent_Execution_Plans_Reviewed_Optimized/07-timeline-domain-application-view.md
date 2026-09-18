> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 07 — Timeline Domain + Application + View

## 目标

把 Timeline 落成共享时间/结构能力，而非 Analysis 私有 UI store：整数 FrameIndex/VFR mapping、结构层级、commands/revision/history、marker/track、View Adapter/semantic zoom/LOD，以及与 Player/Inspector 双向联动。

## 必读

`TIMELINE_ARCHITECTURE.md`、Shot/Analysis contracts、State Ownership、Dependency Graph、Runtime Architecture、Phase 02 Scene/Sequence/Section 决议。

## 时间与结构不变量

- 正式范围以整数帧半开区间表示；媒体秒/PTS 只在转换边界处理。
- VFR 项目必须使用明确 mapping，不以浮点秒作为唯一结构真相。
- Scene/Sequence/Section/Shot 层级与 boundary rules 使用 Phase 02 冻结模型。
- Viewport/hover/drag/zoom 是 view state，不写 canonical structure。

## 实施步骤

1. 收敛 timeline domain types 和 media time conversion ports；补边界/非法输入测试。
2. 结构读取完全来自 Shot/structure authority；结构编辑只发 commands，不直接 IndexedDB write。
3. Promote/Demote/跨层 boundary/成员重整按已冻结规则；保留 identity/content/reference，产生 revision/history。
4. Marker/Beat/Event 分清语义；Marker 不替代正式层级。
5. Track Definition/Instance/Preference 三者分离；Template/field 不反向定义 Track。先做架构批准的 Editing Pace/Dialogue 等实际需要轨道。
6. View Adapter：query visible range、zoom math、semantic zoom、LOD、thumbnail/waveform resource budget、播放位置高频更新最小化渲染。
7. Interaction：boundary hover/drag/context menu、selection vs playing、research scope、track preference、Inspector contextual integration、快捷键冲突优先级。
8. AI structure suggestion 仅建立 candidate 接口/状态；正式 AI workflow 在 Phase 09。

## 性能验证设计

使用 Phase 02 冻结的真实 fixture 和环境；分别测 viewport query、scroll/zoom/drag/playback、track density、thumbnail/waveform。判据以产品可操作性和基线回归为准，未实测前不填具体跨设备 FPS/毫秒数字。

## 并发/恢复

结构 drag 的提交点、cancel、undo/redo、revision conflict、late async thumbnail/waveform/AI result 都遵循 Phase 02 lifecycle；非法持久化数据进入恢复/只读，不由 Timeline View 自行“修复事实”。

## 测试

time conversion/VFR/range math、command/revision/history、viewport state 不持久化、selection/playing 分离、drag conflict/undo、LOD、大 fixture 性能、Inspector 双向联动、keyboard。

## 完成门槛

Domain/Application/View/Workspace Integration 边界可从依赖图和测试证明；没有 Timeline direct canonical write；大型 fixture 保持可操作。

## Timeline 架构完整覆盖清单

Phase 07 必须覆盖 `TIMELINE_ARCHITECTURE.md` 的 Domain + Application + View + Workspace Integration 四层，而不只完成画布交互：

### Scope / structure / commands
- 明确 V1 实施范围与后续边界，避免把后续实验轨道/AI 功能当作本期硬依赖。
- 三种分析尺度与 Shot/Scene/Sequence/Section 四级结构、覆盖方式、层级不变量、Boundary First 交互模型均以同一 structure authority/read model 为依据。
- 结构 command 覆盖 Promote/Demote、跨层 boundary、成员关系调整；在 split/merge/calibration 后尽量保留 stable identity、用户内容与外部引用，无法保留时显式产生 remap/stale impact。
- draft/transaction/history/revision 的提交点清楚；非法/损坏持久化数据只读/恢复，不由 View 猜测并写回“修复后的事实”。

### Marker / analysis shape / workspace states
- Marker 是单一自由观察实体，明确 display/scope/object analysis；Beat/Event 与正式结构、Marker 都保持语义边界。
- 明确算法事实、统计/Derived、模型 Candidate、用户正式值在轨道中的数据形态和可写边界。
- PlaybackPosition/SelectedEntity/ResearchScope/Viewport 四类 workspace state 与 Phase 06 一致；Contextual Inspector、导航/快捷键优先级都走共享状态契约。

### Track / preference / persistence
- Track Definition / Instance / Preference 分离；Preference 的持久化作用域明确为项目/用户/view setting 中的合适层级，不能误写为 domain fact。
- Editing Pace、Dialogue 等首批轨道按正式 Analysis/Derived 数据构建；Template 只引用/推荐，不拥有 Track 定义或实例。

### View Adapter / resource / performance
- View Adapter 只接 query/read model，不直接读写 IndexedDB canonical；viewport/zoom math、semantic zoom、信息密度、可视范围查询、播放高频更新分层。
- Timeline 必须按 Native Studio direct-manipulation contract 实现：boundary/clip hit-zone 大于可见线、hover 即时 affordance、pointer capture、drag live preview、invalid target、snap feedback、safe cancel、commit-on-release；禁止 drag 中频繁 persistence。
- 缩略图/波形是可重建缓存；有 cache upper bound、解码队列/并发/内存预算和取消；late cache result 同样做 task/revision 校验。
- 避免 playback position 造成无关树重渲染；zoom 改信息密度而不是缩放整个 DOM；大 fixture 验证 pan/zoom/drag/playback/track density/thumbnail/waveform 和持续交互流畅度。

### Context / AI / module / storage evolution
- Context Builder 从正式 read model 选择输入并带 dependency revision；输出先校验。
- AI structure suggestion 使用独立 candidate 状态机，accept 前不得发正式结构 mutation；Phase 09 接真实 provider。
- 模块边界遵守 Domain→Application→Workspace→View 方向；共享时间/range/structure 逻辑不可藏在 React/Zustand UI。
- Phase 07 的存储起点是 **v19 frozen baseline**，不恢复 v1–v18 legacy compatibility。若 Timeline 需要新增 v20+ 持久结构，必须使用 versioned non-destructive migration、backup/recovery 与 rollback/abort 验证；不得通过清库或长期双 schema 解决 Timeline 重构。

## 验收矩阵硬门

除原测试外，必须把 Timeline 文档的验收矩阵逐项映射到测试/浏览器证据：range/VFR、层级不变量、identity/reference preservation、promote/demote、非法数据恢复、Marker/Beat/Event、Track preference persistence、contextual inspector、semantic zoom/LOD、cache budget、AI candidate、v19+ schema migration（仅在本阶段确有 schema evolution 时）。任何未覆盖项必须明确 deferred/non-goal 与理由。

## Phase 03 继承的冻结前置条件

- Timeline 的数据读取基线已冻结为派生 read model：buildTimelineReadModel 从 ProjectRecord.structureRevision、canonical Shot 与 AnalysisRecord 构造 track/item；不得创建 Timeline 私有 Shot/Analysis persistence。
- Analysis track item 保留 record status/revision；stale 只能作为显式状态展示，不能被 Timeline 重新写成 confirmed。
- Phase 07 可扩展 Domain/Application/View、Track/Preference、commands 与 LOD，但结构 mutation 仍必须回到 Phase 05 Shot Authority，Analysis mutation 仍回到 Phase 03 Analysis Authority。
- v19 是 Phase 07 的存储起点；Timeline viewport/hover/zoom 等 view state 不得借 schema 演进进入 canonical domain store。
- 所谓“旧数据迁移”在本阶段仅指 **v19 之后已经冻结/可能包含用户数据的 schema 演进**；验收矩阵不得要求重新支持 pre-v19 开发数据。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
