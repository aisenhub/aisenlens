# AisenLens Analysis System Upgrade — 总执行计划

> 修订：2026-09-10。计划目录：docs/plans/AisenLens_Analysis_System_Upgrade_Plans/analysis-system-upgrade/
> 本地项目：E:\Projects\Aisenlens；在其它机器执行时重新确认 cwd。
> 本文为待实施计划。此次仅修订文档，未执行产品改造、build/test、commit/push 或部署。

## 1. 阅读顺序和权威

先读根 AGENTS，再读本文、[共享契约](00-shared-contracts.md)、[验证记录](verification-record.md)、当前阶段及 [唯一架构正文](../AisenLens_Analysis_System_Architecture.md)。涉及 UI 时读取当前项目设计 skill。

共享契约唯一决定目标类型、版本、状态和保存边界；代码是当前事实。遇到实质冲突记录证据并同步文档，不机械套用旧方案。

## 2. 本次必须完成

- P1：定义目录与 usage 分离、稳定 optionId、最小人工状态、无损读写、并发与故障保存修复、真实 Inspector 录入/恢复。
- P2：任务驱动的模板选择、字段示例预览、高级编辑、草稿守卫、Apply/Undo、字段恢复。
- P3：同源 Detail/Table/Focus、键盘/IME、多选确认、Copy/Batch、千镜规模性能观察。
- P4：最小 AI 类型、比较/过期守卫和统一写接缝测试。
- P5：数据/事务/恢复/现有消费者回归、浏览器矩阵及旧路径退出。

本期不做真实 AI 执行、完整 Review UI、候选持久化、provenance、专业多维 taxonomy、多 subject、Relation/Derived、新报告/跨项目模板库、Marketplace 或原生平台验收。

稳定 optionId 和 unknown/not_applicable 已提前到本期，不能再放入 future 清单。description 物理存储保持独立，具体例外见共享契约。

## 3. 本地源码审查基线

前次只读审查 HEAD：eb67acbf2dab9768f24e227a36b655a7753f29c1；不是执行时 HEAD。工作区有正在变化的产品源码修改，后续 agent 必须重查归属，不覆盖或提交无关改动。

| 代码位置（apps/web/src/ 下） | 审查发现 | 实施要求 |
| --- | --- | --- |
| features/template/types.ts | 平面 fields 与 raw value | 唯一 definitions/usages/entries 模型 |
| features/template/services/templateValidation.ts | 已知无效 option/类型会清空 | 无损读取与新写校验分离 |
| features/template/services/defaultTemplate.ts | 六个粗粒度字段 | 稳定 ID、专业说明、optionId |
| features/template/services/templateService.ts | load/create seam，工作区有既有修改 | 复用入口，先看当前 diff |
| features/editor/components/EditorWorkspace.tsx | History 原先不含 template，DIM_REFS 重复知识 | Apply history；统一命令/知识；不整体重构 |
| features/editor/hooks/useEditorPersistence.ts | 保存前取最新 updatedAt | 改会话基线，测试两会话真实链 |
| features/editor/hooks/useEditorPersistence.ts | completeness 自动生成 confirmed | 分离填写进度与人工确认 |
| features/project/services/projectRepository.ts | 普通保存有版本比较，template-write 注入位于校准路径 | 普通路径补 fault/abort；避免借测试冒充 |
| features/analysis/components/ShotInspector.tsx | 描述/笔记/Research，缺 Profile fields | P1 接主路径 |
| features/analysis/types.ts | EvidenceRef 使用整数微秒 | 直接复用 |
| features/editor/components/AnalysisFieldInput.tsx、AnalysisDimensionCard.tsx | 输入能力分散 | 合为 analysis 下唯一输入体系 |

以上是源码发现，未运行浏览器重现，不是验证通过。不要仅凭旧 import 断言入口可达。

## 4. 实施前核实

```powershell
Get-Location
git status --short
git branch --show-current
git rev-parse HEAD
git remote -v
```

读取当前 package scripts、目标路径 AGENTS、源码调用链、已有工作区修改。沿用适用工作分支，必要时按 codex/ 前缀创建分支，不 stash/覆盖/提交他人内容。

真实旧数据先只读核查；没有保留需求不写兼容工程。若有数据待处理按共享契约记录范围与授权，不自动清库，也不为历史 fixture 实现迁移器。

公开方案 → 本项目初案 → OpenReel → OpenCut 定向研究仍是实施前要求。只读相关模块文件，将本轮确认结果写 reference index；没有读取就不得记已研究。

## 5. 架构不变量

1. 系统定义创作来自 Registry，项目解释来自冻结定义。
2. 定义目录与当前 usage 分开；隐藏/切换不删定义、option 或 entry。
3. 枚举存 optionId；自定义已应用 kind 不原地修改。
4. entries 使用最小状态；description 单独存；不存在 raw/envelope 双写。
5. 一次 Apply/Batch 可完整撤销；文本按编辑会话合并历史。
6. 保存仍是现有 Editor aggregate pipeline；会话基线不能被最新 DB 版本替换。
7. 普通保存事务失败必须 abort 并保留完整旧 DB 与可重试内存。
8. Focus 使用现有会话和 Research 队列，不另建 currentShot/selection 真相。
9. AI 本期只有安全接缝，不发布空壳功能。
10. 既有 Overlay/Export/Learn/Recovery 都适配新模型，保留功能。
11. 不添加无必要依赖、不整体重构 Editor、不扩原生平台验收。

## 6. 阶段与技术前置

| 阶段 | 文档 | 交付重点 | 技术前置 |
| --- | --- | --- | --- |
| P1 | [安全字段闭环](01-foundation-real-field-loop.md) | 模型/无损/并发/事务/Inspector/reload | 本地事实与研究核实 |
| P2 | [模板管理](02-template-field-management-ux.md) | 任务入口、高级编辑、生命周期、Undo | P1 技术验收通过 |
| P3 | [连续录入](03-deep-analysis-surfaces.md) | Focus/Table/Batch/规模验证 | P2 技术验收通过 |
| P4 | [AI 最小契约](04-ai-collaboration-ui.md) | 类型、stale/比较/写接缝测试 | P3 技术验收通过；纯类型研究可提前 |
| P5 | [验证与清理](05-validation-cleanup.md) | 集成验收、已有消费者、旧路径退出 | P1–P4 技术验收通过 |
| 后续 | [未来能力](99-future-enhancements.md) | 真实 AI/专业字段/生态 | 不属本期 |

默认串行 P1 → P2 → P3 → P4 → P5。只有用户明确要求并行才启用多 agent；共享类型、Editor/Analyze/session、保存与状态表由集成负责人管理，合入后重验。

## 7. 验证策略

各阶段核实 package.json 后执行其要求命令；不存在的脚本先确认，不假称存在。新增专项测试命令需记录“新增”。

优先验证会导致丢值的场景：选项改名/停用、自定义字段移除恢复、两会话交错保存、普通事务 fault、Apply Undo、unknown/NA、Recovery。不要把校准事务结果当普通 autosave 证据。

Web 覆盖暗/亮主题、宽/中/窄 viewport、键盘/IME、真实保存与重载。P3/P5 加 1,000 shots × 20 fields，记录历史内存、序列化、写入、输入到显示与长任务；不设无基准毫秒 SLA。

保存链修改需验证保存进行时继续输入、失败重试、基线推进与跨会话冲突。静态类型通过不代表行为通过。

## 8. 交付与权限

技术状态：未开始/进行中/已阻塞/验证失败/技术验收通过。
Git 状态独立：未提交/本地已提交/待推送/已推送/未授权或不适用。

下一阶段依赖技术验收，不依赖网络 push；已验证修改和依赖须清晰可追溯。若本轮执行指令授权 commit/push，阶段正常提交推送；若仅授权本地实现，不由文档自行授予 Git 操作权限。

禁止 force push、改写历史、merge main、release、deploy，除非用户另有明确请求。远程交付如在执行范围内，最终必须完成并核实；网络失败不应导致无依赖本地工作停摆。

## 9. 总验收

- 真实字段录入、Profile 管理、Focus/Batch 均可保存、撤销和恢复。
- 自定义定义与已填值在移除/切换/重载后可重新启用。
- 无效已有数据不被 autosave 清空。
- 两会话保存不会用新令牌覆盖旧状态；普通事务 fault 无部分提交。
- 完成度不冒充人工复核；专业标签含义诚实。
- 无生产假 AI，无旧新双 writer，无平行模板编辑器。
- 必要测试实际运行并记录 HEAD/环境/结果。
- 真实旧数据处理范围与未支持的导入格式如实记录。
- Git 交付与本轮授权一致，不伪称已推送。

执行入口：[agent-handoff.md](agent-handoff.md)。

## 10. 审查修订追踪

| 审查问题 | 权威约定 | 实施与验收 |
| --- | --- | --- |
| 保存前读取最新版本绕过冲突 | 共享契约 §7 | P1 修复真实 hook；P5 两会话验证 |
| 改选项/类型导致 autosave 清值 | §2–3 | P1 无损模型；P2 生命周期；P5 回归 |
| 自定义定义移除后无法恢复 | §2.1 | P2 原 ID 恢复故事；P5 保存重载 |
| Registry 与快照权威不清 | §2.2 | P1 resolver；P5 Registry 变化测试 |
| Apply 不在 History、文本逐键快照 | §6 | P1 基础；P2 Apply；P3 性能 |
| 粗粒度影视语义与完成度误导 | §1、§3.1 | P1 定义和文案；P2 模板覆盖说明 |
| 默认三栏/技术配置认知负担 | §5 | P2 任务入口与高级配置 |
| Focus/Batch 规则与长片规模不足 | §8 | P3 交互与千镜验证；P5 集成 |
| 完整 AI UI 过早、缺 stale 基线 | §9 | P4 最小接缝；99 完整能力 |
| 普通保存故障测试不真实 | §7 | P1 fault/abort；P5 普通事务证据 |
| 旧数据兼容原则冲突 | §4 | P1 范围核实；P5 按实际授权记录 |
| 重复架构、路径错误、push 阻断 | 本文与 handoff | 单一正文、正确路径、独立状态 |

