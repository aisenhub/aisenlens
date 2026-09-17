> **用途**：本文件只用于指导后续执行 agent 实施。本轮未修改产品代码、未安装依赖、未部署、未执行测试或 Git 提交。
> **事实规则**：代码现状以执行时本地仓库核实结果为准；目标行为以 AisenLens 2026-09-17 Reviewed/Optimized 架构包为准。未经核实的路径、接口、命令一律不得臆造。

# 08 — Results Workspace + Derived Dataset + Export + Creative

## 目标

让 Results 成为 Analysis/Structure 的可靠消费者：Data Table、Export、Creative 使用同一个 derived query contract；stale/candidate/不 eligible 数据不会静默进入正式输出。

## 必读

`RESULTS_WORKSPACE.md`、Analysis Data eligibility、Evidence/Provenance、Template ExportMapping、Runtime Architecture。

## 实施步骤

1. 盘点现有 export/results/group/overview 聚合逻辑，选择一个统一 query/derived dataset 权威；重复聚合逐步退出。
2. Query 输入显式包含 project/structure/analysis/profile/revision 范围；输出是 derived read model，不回写 Analysis Fact。
3. Table：动态列、filter/sort/aggregate、Template mapping、stale/candidate/unknown/NA 表达、Evidence/Provenance 查询入口。
4. 批量编辑若存在，必须转换成 Analysis command；Results 不直接改 repository。
5. Export Preset：分析表格、视频+分析联动、分析水印视频等按真实当前范围实现；ExportMapping 只映射，不定义字段语义。
6. 导出任务使用 Phase 02 task lifecycle，可取消；输入 revision/profile/version 固化，完成产物记录可复现信息。
7. Creative Transformation：只消费 confirmed/eligible facts，输出 Derived Artifact；不得反写原始 Analysis Fact。
8. Share/未来 AI Video Generation 仅保留架构位置；无本期真实能力不要做假入口。

## 状态

empty results、filter 无结果、部分 stale、export blocked、export queued/running/cancelled/failed/succeeded、输入 revision 过期、媒体缺失、derived artifact failure 都有明确反馈和恢复。

## 旧路径退出

多个 export 聚合器/overview 自建统计若与统一 query 重复，应迁移消费者后删除；禁止长期两套计算逻辑产生不同结果。

## 测试

同一 fixture 下 Table/Export/Creative query 一致；Candidate 未 accept/stale 不默认输出；导出输入 revision 可追溯；cancel/late result；malformed preset/import mapping；输出 reproducibility；Results 操作不改变 Analysis repository。

## 完成门槛

三种消费面使用同一 query contract；正式输出可追溯到输入 revision/profile/version；没有 Results→Analysis UI internals/直接 repository write。

## Results / Export / Creative 完整优化清单

### Results Workspace / Data Table
- Results 内部明确为 **数据表 / 导出与分享 / 创作转化** 三个二级工作区（可按现有路由实现），不把全部复杂功能塞进一个大 Modal。
- Data Table 是 Analysis 的数据库视图：核心列（镜号/截图/时长等）+ stable fieldId 驱动的动态列；支持 search/filter/group/show-fields/sort/aggregate，并可按 Scene/标签/模板字段等真实维度分组。
- 默认“查看优先”；需要编辑正式数据时必须进入明确编辑态并走 Phase 05 Analysis command/Authority，不复制“导出数据”或 Results 私有 Analysis 副本。
- stale 可以展示但必须显式标记/可筛选；pending Candidate/unsaved draft 不作为正式列；Evidence/Provenance 可追溯。

### Export Studio / Preset
- Export Studio 使用独立页面/工作区式布局（type / preview / settings），避免大型配置 Modal；设置变化有 Preview/Live Preview（按导出类型可行性）。
- 核心类型按真实支持范围落地：分析表格（CSV/XLSX/JSON；PDF/报告若仍属未来则明确 deferred）、视频+分析表联动输出、分析水印视频。
- 联动视频随播放 Shot 更新分析面板；水印视频支持位置、字段内容、透明度、字号、背景/主题等正式架构要求，若某项本期延期必须写明。
- 三类导出共用字段选择与版本化 Export Preset；Preset 可保存“如何消费/呈现”，不能复制 AnalysisRecord。
- Export task 固化 input revision/profile/export-mapping/preset/version，支持 cancel/stale discard；文件名/文本/富文本规范化，失败不改变 canonical facts。

### Creative Transformation
- 输入范围支持整部影片/Scene/选中 Shot/一组分析特征等架构定义；用户选择要迁移的维度（节奏/景别变化/运镜/色彩/声音等）并给新的创作目标。
- AI/规则的角色是**方法迁移而非内容复制**；正式输入为 confirmed Analysis + Derived Statistics + 用户 Marker/Notes + Evidence，pending Candidate 不自动进入。
- 输出是独立 Derived Creative Artifact，推荐层级 Concept/Treatment → Scene → Shot List → Shot execution requirements；可复用 stable field semantics，但不能把创作 Shot 当成原作品 Analysis Fact。
- 未来 AI Video 只保留 Shot-level reference image / dynamic previs 的架构位置；无真实能力时不做 Prompt→假视频入口。

### Eligibility / Output Capability
- Table 列、Export 字段、Creative 输入来自 stable fieldId / capability / ExportMapping，而不是反向解析 Inspector UI。
- ExportMapping 只映射；不能绕过 confirmed/stale eligibility。若用户明确导出 stale 数据，输出中必须携带复核状态/可追溯信息，不可伪装 confirmed。

## 完整性验收

同一 fixture 验证 Data Table / Export / Creative 对 confirmed/stale/candidate 的处理一致；验证分组/显示字段、view→edit authority、Export Studio preview、三类核心导出（按本期真实范围）、preset 保存/重开、cancel/late result、filename/rich-text safety、Creative 范围/方法迁移/派生产物不反写。Traceability 中 Results 文档全部章节须有 evidence/deferred/non-goal。

## Git / 验证硬门

- 阶段开始先核对 `git status --short --branch`、`git remote -v`、当前分支和起始 commit，并与 `verification-record.md` 对齐。
- 仅运行 Phase 01 已核实登记的仓库真实命令；若命令变化，先更新命令登记和原因。
- 阶段完成后审查 diff，排除密钥、环境文件、用户媒体、缓存和无关修改。
- 必要验证通过后创建含阶段编号的有意义 commit；允许多个 commit，但进入下一阶段前必须全部成功 push。
- push 后核实远程分支确实包含对应 SHA，并记录 GitHub 链接。未验证或未 push 均不得标记“已交付”。
- 不 force push、不改写历史、不合并主分支、不建 Release、不部署。
