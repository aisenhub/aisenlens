# AisenLens Analysis System Architecture

> 2026-09-10 审查修订版。本文是唯一架构正文；旧的 references 副本改为入口链接。
> 当前可执行范围由 [共享契约](analysis-system-upgrade/00-shared-contracts.md) 和 [总计划](analysis-system-upgrade/00-master-plan.md) 定义。本文明确区分本期与长期，不把愿景当成当前已具备能力。

## 1. 产品目标

AisenLens 是本地优先的影视观察与研究工具。模板系统应帮助用户选择分析目标、理解观察维度，并在看片过程中连续记录；调整模板不能使已有分析丢失、无法解释或无法恢复。

本期两个核心体验目标：

1. 放心调整模板：定义、值、历史和恢复保持一致。
2. 高效观看与记录：Detail、Table、Focus 使用同一镜头和字段，切换模式不重复录入。

保留 React + Vite + Tailwind、现有 UI 组件、ProjectSession 和 IndexedDB 保存体系；仅 Web 是当前必验平台。不为模板另建后端、全局 store 或通用表单平台。

## 2. 已确认的本地缺口

2026-09-10 的源码审查发现以下问题；实施前按当前工作区重查，不能将这些结论当测试通过：

| 位置 | 当前问题 | 本期处理 |
| --- | --- | --- |
| templateValidation.ts | 未知 key 保留，但已知字段的无效选项/类型被清空 | 区分无损读取与新输入校验 |
| useEditorPersistence.ts | 保存前读取最新 updatedAt 后提交旧内存数据 | 使用会话加载/成功提交基线 |
| projectRepository.ts | template-write 故障注入在校准事务，普通编辑器保存未调用 | 给普通保存补故障注入与 abort 验证 |
| EditorWorkspace.tsx | History 不含 template | Apply/Undo/Redo 纳入一致配置 |
| defaultTemplate.ts | 色彩、声音等为粗粒度混合分类 | 准确命名与观察规则，不包装为完整专业 taxonomy |
| ShotInspector.tsx | 缺当前 Profile 驱动的字段录入 | P1 建立真实编辑/保存/重载闭环 |
| useEditorPersistence.ts | required 完成度直接驱动 confirmed | 完成度与人工确认分开，保留真实状态来源 |

这些问题必须进入实施工作，不能只写“复用现有能力”。

## 3. 领域边界

| 对象 | 职责 | 当前范围 |
| --- | --- | --- |
| System Field Registry | 系统字段创作来源、默认 usage | 本期 |
| FieldDefinitionSnapshot | 项目冻结字段语义、选项及版本 | 本期 |
| FieldOption | 稳定 ID、显示 label、停用状态 | 本期 |
| ProjectAnalysisProfileSnapshot | 项目定义目录、当前 usage、分区和配置修订 | 本期 |
| AnalysisFieldEntry | 当前镜头人工值及无法判断/不适用 | 本期，description 保持独立 |
| Resolved Profile | 为 Surface 解析定义、usage、显示和诊断 | 本期 |
| Evidence / ResearchContext | 现有研究依据与问题上下文 | 复用 |
| AICandidate | 生成基线、候选及审阅状态 | 本期仅最小契约/纯函数/测试 |
| Taxonomy / FieldPack | 多语言、标准词表、专业维度组合 | 后续扩展 |
| AIRecipe / Run / Review | 模型输入、执行、候选持久化与审阅 | 后续 |
| Relation / DerivedField | 镜头关系与真实派生指标 | 后续 |

## 4. 定义与使用分离

系统模板来源只引用字段。应用到项目后，形成可独立解释的冻结定义目录；当前模板只是对目录的 usage 集合。

```text
Registry / System Profile
  → 首次采用时物化冻结定义
Project.fieldDefinitions ← 项目自定义字段
  → fieldId 引用
Project.fieldUsages + sections + Surface settings
  → Resolver
Detail / Table / Focus
  → 唯一领域命令
Shot entries / description / notes
  → 现有聚合保存
```

隐藏或移除的是 usage，不是定义。切换模板保留自定义字段目录及镜头值，用户从字段库重新加入同 ID 就恢复原内容。本期不做已应用定义永久删除。

Registry 是 authoring authority；项目冻结定义是 runtime authority。Registry 变动不影响已存项目，完整快照即使 Registry 缺定义也能读取。真正损坏时显示诊断、保留数据，不能覆盖为默认值。

## 5. 身份、选项与版本

- fieldId 不随 label 变化；已有六个 fieldId 保留。
- semanticKey 表示稳定语义，不是可编辑标签。
- 单选/多选保存 optionId，显示 label；选项改名不改 ID，删除采用停用。
- 已应用字段 kind 本期不可原地改变，需要新类型时创建新字段。
- schemaVersion 表示结构；definitionVersion 表示定义修订；Profile.version 表示项目配置修订；sourceProfile.version 表示来源。
- Profile.version 不作为并发锁。Apply/Undo/Redo 的版本推进规则见共享契约。
- 读问题数据和验证新输入分开，autosave 不清洗无关已有值。

完整 taxonomy 的 aliases、本地化和跨项目映射以后实现；最小稳定选项身份不能等到开放自定义编辑后再补。

## 6. 人工分析值与专业判断

非 description 字段采用唯一最小 entry：set / unknown / not_applicable，缺 key 为 unset。具体类型、空值与比较规则只在共享契约定义。

shot_description 继续保存事实文本，notes 保存解释，不生成第二份 description 字段值。WHAT（观察）、HOW（形式）、WHY（解释）是组织内容的思路，不是要求用户机械填写的三套重复值。

unknown 是完成了一次观察但还不能判断；not_applicable 是明确不适用。两者不能冒充“未填”，也不能冒充“确认正确”。填写完成度、待判断数量和人工复核状态分开。

本期系统字段采用可诚实解释的基础观察：
- 景别：说明主体和代表时刻，不能假定整镜景别恒定。
- 运镜：记录主要运镜，复合变化可写笔记，时间段建模后置。
- 色彩印象：明确不是色相/饱和度/冷暖的独立统计。
- 声音概况：明确不是完整声音元素与叙事关系分类。
- 节奏感受：依赖前后镜头上下文，不与时长统计混淆。

后续专业字段必须新增明确语义与身份，配定义、例子和反例。不能为了更“专业”静默改写旧字段含义。

## 7. 用户体验架构

### 7.1 默认任务流程

选分析目标 → 看覆盖范围、字段和填写示例 → 应用 → 开始看片记录。

首批名称为快速拉片、影视基础观察、摄影基础观察、剪辑与声音初记。只有六个基础字段时不声称覆盖灯光、构图或完整叙事。

模板卡片显示实际字段和用途，不显示未来 AI 字段数量、虚构能力或无依据深度分数。

### 7.2 高级 Profile Editor

三栏仅用于高级编辑：字段库 → 当前结构 → 所选字段设置。小屏使用导航式单列/双列。

默认设置展示名称/说明、选项、是否优先展示、显示位置；semanticKey 只放技术详情。Widget 等低频设置渐进展开，AI 未接入不开放逐字段配置。

core 表示优先展示；required 文案为“完成分析时需填写”，不阻止保存。高级区有未填 required 时可见提示并可定位。字段输入与项目 UI token 保持一致。

### 7.3 Draft、Apply 和撤销

编辑 draft 不保存项目；关闭、导航和换项目处理未应用改动。Apply 显示变更与影响，进入唯一保存链；保存失败保留内存并反馈。

一次有效 Apply 可 Undo/Redo，恢复定义与 usage 等一致配置；无变化不产生版本和历史。旧 draft 不能覆盖编辑期间变化的新配置。

### 7.4 Detail / Table / Focus

Detail 结合播放器、字段说明、参考词和 Research；Table 用真实字段列支持横向比较；Focus 按一个字段逐镜记录。

三者共享 fieldId、entry、resolver 与写命令。Surface 是不同展示，不是第二份业务状态。各 Surface 可独立 widget/density；统一 renderer 可拆类型子组件。

Focus 明确队列、当前位置和结束状态；跳过/清空/无法判断不同。多选确认后才前进，数字快捷键遵守 IME 和弹层优先级。Copy/Batch 展示目标与覆盖影响，一次撤销恢复整次操作。具体规则见共享契约。

## 8. 保存、恢复与并发

唯一链：Editor state → save signature → 现有 autosave → useEditorPersistence → saveProjectEditorState。

会话持有加载或成功提交版本；只有本会话成功且已同步的写入推进基线。提交前读取数据库最新时间不能授权旧状态覆盖。测试必须穿过真实 hook 和两个编辑会话。

IndexedDB 原子事务需要异常 abort 和可达故障注入来证明。普通保存与校准保存分别验证，不互相替代。失败后保留内存、dirty 和旧基线，DB 全部保持旧状态。

Recovery 保存完整定义目录、usage、entry 和现有 Research/Evidence。隐藏字段也必须恢复。旧格式处理遵守下一节，不默认加升级器。

## 9. 新项目与数据转换边界

不建设通用 Migration Tool、Legacy Snapshot、V1/V2 双写、fallback 或长期适配层。

先只读核实真实用户项目和 Recovery 的保留需求；无需求时直接替换旧模型和 fixture。若存在真实旧数据，先记录备份、映射、影响并取得针对该范围的处理授权，再进行有范围的一次性转换。不能清除用户内容，也不能假装未知旧数据已转换。

这项核实不阻塞无依赖代码与测试工作，处理结果写 verification-record。新数据使用单一正式模型。

## 10. AI 协作边界

P4 缩减为最小候选契约、合法性/过期检查、集合比较和唯一命令接缝测试。不交付完整 AI Review 页面或预配置开关。

候选不是正式值。reviewStatus 与 conflict/stale 分开；基线包括媒体、镜头边界、定义和 Profile 版本、原 entry。接受前重新检查，过期不写，Reject 不改当前值，重复接受幂等。

未校准 confidence 不划通用高中低阈值；不称准确率。Evidence 复用现有整数微秒 us 的 EvidenceRef，不创建 ms/timecode 平行定义。字段级 required 证据在有持久化与阻止接受的机制后再开放。

真实阶段必须共同实现：Recipe/输入依赖、Run/cancel/retry、候选及决策持久化、provenance、媒体/结构变更 stale、Evidence 定位、Review 和质量校准。不能假定“只换数据源”就完成。

## 11. 长期扩展（不属于 P1–P5）

- Taxonomy：optionId 基础上的标准 code、aliases、localized labels 和版本策略。
- FieldPack：摄影、构图、灯光、表演、叙事、剪辑、声音等经过专业评审的字段组合。
- 多 subject：video/scene/frame/time_range/relation；每类有稳定 ID、生命周期、重绑和过期规则。
- Relation：视线/动作/图形匹配、对比、平行、声音桥等，不能塞成单镜布尔字段。
- Derived：镜长、切换率、分布、覆盖率等由真实输入计算，标注 derived，不与人工判断混淆。
- AI：Recipe 不属于模板，执行与审核、来源、证据和持久化一起交付。
- 模板导出/跨项目复用/社区：身份、词表、来源版本、导入校验稳定后再做；本期不新增云模板表。
- Conditional Fields：只控制呈现，不删值；条件依赖、循环和完成度规则明确后再开放。
- 专业报告、学习与风格分析：消费真实来源，不能生成没有数据支撑的统计。

## 12. 研究依据与执行研究要求

公开方案支持“语义 Schema 与 UI Schema 分离”，不意味着应引入整套表单依赖：
- [JSON Forms UI Schema](https://jsonforms.io/docs/uischema/)
- [JSON Forms Validation](https://jsonforms.io/docs/validation/)
- [Columbia Film Language Glossary](https://filmglossary.ccnmtl.columbia.edu/term/)

上述来源支持分层与专业术语观察，不证明本计划已通过用户或运行时验证。

本次是文档修订，没有重新查阅参考项目源码。实施新模块前仍必须按 AGENTS 执行公开方案 → AisenLens 初案 → OpenReel → OpenCut 的定向研究。只能将实际读取文件和确认发现追加到 reference-projects/REFERENCE_PROJECT_INDEX.md，不能把历史索引当本轮新验证。

## 13. 执行与验收

[P1](analysis-system-upgrade/01-foundation-real-field-loop.md) 安全字段闭环 →
[P2](analysis-system-upgrade/02-template-field-management-ux.md) 任务入口与模板生命周期 →
[P3](analysis-system-upgrade/03-deep-analysis-surfaces.md) 连续录入与规模验证 →
[P4](analysis-system-upgrade/04-ai-collaboration-ui.md) 最小 AI 契约 →
[P5](analysis-system-upgrade/05-validation-cleanup.md) 全链路证明与清理。

实际进度只写 [verification-record](analysis-system-upgrade/verification-record.md)。技术验收和 Git 推送分别记录；网络失败不阻止已满足技术前置的本地阶段。工作未授权时不自动提交/推送，文档不能自授发布权限。

