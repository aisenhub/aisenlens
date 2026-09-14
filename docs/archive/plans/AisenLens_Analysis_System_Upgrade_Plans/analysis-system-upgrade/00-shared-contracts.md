# 00 — Analysis System 跨阶段共享契约

> 修订：2026-09-10。本文件是 P1–P5 唯一的目标身份、数据、保存与交互契约；类型是待实施目标，不代表代码已完成。
> 本期提前实施稳定 optionId、字段定义目录和最小人工判断状态；完整 taxonomy、provenance、AI 执行与 Review 持久化仍后置。架构背景见 [唯一架构正文](../AisenLens_Analysis_System_Architecture.md)。

## 1. 身份与专业语义

已有 fieldId 不变，不随 label、模板切换或排序生成新身份。项目自定义字段用 field_<uuid>，semanticKey 为 project.<projectId>.field.<fieldId>。

| fieldId | semanticKey | 本期填写边界 |
| --- | --- | --- |
| shot_description | observation.visual_description | 用户看到的画面内容，唯一存储为 description |
| shot | camera.shot_size | 主要主体的代表性景别，默认以镜头中点可辨识主体判定；变化显著时笔记说明起止变化 |
| motion | camera.movement | 主要运镜；复合运镜在笔记说明，不宣称描述完整运动轨迹 |
| color | color.dominant_tone | 显示为“色彩印象”，是粗粒度观察标签，不是色相、冷暖、饱和度的独立测量 |
| sound | audio.design | 显示为“声音概况”，记录主要听觉组织印象，不宣称是互斥声音元素分类 |
| rhythm | editing.rhythm | 前后镜头上下文中的主观节奏感受，不是镜长或客观剪辑速率 |

P1 为每个字段实现说明、观察对象、选择规则、示例、反例及无法判断/不适用规则。严谨的色彩分维、声音元素多选、叙事内外声音、时间段运镜使用后续新字段身份，不能原地改写上述已有含义。

## 2. 项目定义目录与 Profile 引用

继续使用现有 project-templates store，不新增模板数据库或全局模板 store。

```ts
type TemplateFieldKind = 'single-select' | 'multi-select' | 'text' | 'number' | 'boolean'
type AnalysisSurface = 'detail_panel' | 'shot_table' | 'focus_mode' | 'ai_review' | 'report'
type FieldWidget = 'chips' | 'select' | 'multi-chips' | 'text' | 'textarea' | 'number' | 'boolean'

interface FieldOption { id: string; label: string; retired: boolean }
interface FieldDefinitionSnapshot {
  fieldId: string
  definitionVersion: number
  origin: 'system' | 'project'
  semanticKey: string
  label: string
  description: string
  scope: 'shot'
  kind: TemplateFieldKind
  options: FieldOption[]
  referenceTerms: TemplateReferenceTerm[]
  allowsNotApplicable: boolean
}
interface FieldSurfaceSettings {
  visible: boolean
  widget: FieldWidget
  density: 'compact' | 'normal' | 'expanded'
  showDescription: boolean
  showReferenceTerms: boolean
}
interface FieldInteractionPolicy {
  allowQuickEntry: boolean
  allowCopyPrevious: boolean
  allowBatchEdit: boolean
  evidencePolicy: 'none' | 'optional' | 'recommended'
}
interface AnalysisProfileFieldUsage {
  fieldId: string
  sectionId: string
  order: number
  required: boolean
  core: boolean
  presentation: Partial<Record<AnalysisSurface, FieldSurfaceSettings>>
  interaction: FieldInteractionPolicy
}
interface AnalysisProfileSection {
  id: string
  label: string
  order: number
  defaultExpanded: boolean
}
interface ProjectAnalysisProfileSnapshot {
  schemaVersion: 2
  id: string
  projectId: string
  name: string
  version: number
  sourceProfile: { id: string; version: number } | null
  fieldDefinitions: FieldDefinitionSnapshot[]
  sections: AnalysisProfileSection[]
  fieldUsages: AnalysisProfileFieldUsage[]
  createdAt: string
  updatedAt: string
}
```

TemplateReferenceTerm 复用现有定义。Registry 为系统定义提供创作来源、默认 usage 和内置 Profile，不另建业务平行模型。

### 2.1 生命周期

- fieldDefinitions 保留项目采用过的系统定义、自定义定义；fieldUsages 只表示当前启用字段。
- 隐藏 Surface、移除 usage、切 Profile 都保留定义、选项和值。字段库可重新启用原自定义 fieldId。
- 本期不提供已应用定义的永久删除；未 Apply 的新字段可从 draft 丢弃。
- 自定义名称/说明可改，ID 不变。optionId 在创建时分配，不能从 label/index 动态推导。
- 选项改名保留 ID；删除改为 retired=true，仍可解释旧值但不可新选；重新启用恢复原 ID。
- 已 Apply 的字段 kind 本期不可原地修改；创建新字段表达新类型。同名字段不自动合并。
- System field 的 semanticKey/kind/scope/options 不能由项目 UI 改写；usage 可调整。

### 2.2 Registry / snapshot / resolver

Registry 负责创建和显式升级；项目运行时由冻结定义解释值。完整快照且 kind 受支持时，即使当前 Registry 缺少定义也正常读取。Registry 更新不得静默改变已有项目。

Resolver 输入项目快照，输出 definition + usage + per-surface presentation + issues，不写 DB、不改值。定义损坏或类型不支持时保留数据，显示诊断并禁用受影响写操作，不能伪造默认定义覆盖。

source Profile 引用 Registry 的身份和版本，首次采用时物化定义；切换 source 时已有同 ID 的冻结定义保持。不相容定义升级必须显示单独 Diff 并阻止直接套用；本期不实现通用升级器。sourceProfile 是来源标记，不表示当前配置没有修改。

### 2.3 无损校验

草稿校验、新输入校验、已有数据读取是不同职责，可共享纯函数但不能共用破坏性清洗。

- 非法 draft 阻止 Apply 并定位错误；不能默默去重删除、截断字段数或吞掉选项。
- 非法新输入拒绝并反馈；同值写入 no-op。
- 已有未知 key、停用 option、类型不匹配或损坏值保留原始数据并报告 issue；不改为 null/空串/空数组。
- 无关修改 autosave 不得重写问题值；无法无损保存整个项目时失败并保留内存，不部分提交。
- P1 明确字段数、选项数、文本上限并测试，超限显式提示，不能保存时截断。

## 3. 最小人工判断状态与值

本期非 description 的 analysisFields 直接采用唯一 entry 模型，不保留 raw/envelope 双写。提前加入人工状态不等于实施完整 AI provenance。

```ts
type AnalysisFieldValue = string | string[] | number | boolean
type AnalysisFieldEntry =
  | { state: 'set'; value: AnalysisFieldValue }
  | { state: 'unknown' }
  | { state: 'not_applicable' }
// StoredShotRecord.analysisFields: Record<string, AnalysisFieldEntry>
// 缺少 key = unset；clear 删除 key。
// 单选保存 optionId，多选保存去重的 optionId[]。
```

number 必须有限，false/0 是有效值；空文本/空数组提交视为 clear。多选比较使用集合语义，保存按定义顺序稳定排列。新选值不能使用 retired option；合法已有 retired 值保留且标记“已停用选项”，不当作无值。

unknown 表示已尝试但无法确定；not_applicable 只在 definition 允许时可写。它们不是枚举选项，不用特殊字符串伪装。

shot_description 只写 StoredShotRecord.description，空串表示未填写，不复制 entry；本期该固定事实文本不提供 unknown/not_applicable 按钮，可在正文说明观察局限。notes 仍独立。

### 3.1 完成度

只对当前 fieldUsages 计算，Surface 隐藏不影响模板成员身份。

- valueCount：合法 set；processedCount：合法 set/unknown/允许的 not_applicable。
- missingRequired：required 且 unset、unknown 或数据非法；允许的 not_applicable 满足填写要求。
- unknown 独立显示“待判断”；无 required 显示“无必填要求”，不能称已完成。
- required 不阻止 autosave；core 只影响展示优先级。
- 不从 completeness 自动改 Shot.status 为 confirmed。P1 追踪并保留已有镜头状态来源；新镜头按创建流程处理。用户可见“已确认/已复核”必须有明确人工动作依据。
- 本期不新增复核系统，用填写完成度展示实际进度。

## 4. 旧数据边界

遵守 AGENTS 新项目原则。schemaVersion=2 不是建设 V1/V2 双运行时的理由。

P1 只读核查真实需保留项目、Recovery、导出文件中的旧 raw/label 数据，区分用户内容与测试 fixture；不得清库或覆盖用户内容。

- 无真实转换需求：直接替换旧实现，测试使用目标模型和隔离数据库，不为旧 fixture 建兼容层。
- 有真实旧数据：记录具体对象、无歧义映射、备份和影响；取得针对该范围的明确处理授权后才执行转换，继续独立开发。不能把“不保留兼容层”解释为可以删除用户数据。
- 一次性转换如获授权，独立限定范围和验收；不留常驻 V1 reader、fallback 或双 writer。无法匹配的数据不猜测、不清空。
- 旧 Recovery 同此规则。本期不承诺任意旧导入；P5 报告实际范围。

不要因假设可能有旧数据暂停整个任务，也不要默认建设通用迁移器。

## 5. 内置 Profile 与 Apply

| source ID / version | 名称 | 字段 |
| --- | --- | --- |
| system.quick-review / 1 | 快速拉片 | shot_description, shot, rhythm |
| system.film-basic / 1 | 影视基础观察 | 六个字段 |
| system.cinematography-basic / 1 | 摄影基础观察 | shot_description, shot, motion, color |
| system.editing-basic / 1 | 剪辑与声音初记 | shot_description, rhythm, sound |

卡片列明覆盖范围，不声称包含尚无字段的构图、灯光、叙事关系等。自定义是当前项目配置状态，不是另一个全局模板实体。

默认流程：选分析目标 → 预览字段/说明/填写示例 → 应用 → 记录。高级入口才打开结构编辑。

Apply Diff 展示新增/隐藏字段、选项/定义展示变化及受影响已填数量；保留所有已采用定义和值。description 固定启用。恢复默认同样显式 Apply。只有实际变化才 version +1，无变化禁用 Apply。

## 6. 命令、History 与 draft

唯一领域命令负责 shot/field 校验、状态转换、no-op 和 history，再更新现有 Editor state。Batch/Copy/未来 Accept/Edit 共用，不直写 repository。

- 单选/状态切换一次 history action；Batch 一个字段、一个 action、一次统一 state update。
- 文本 onChange 可更新内存并触发现有 autosave；history 按同 shot+field 编辑会话合并，blur/提交/切镜/切字段结束。与 IME/原生文本 Undo 协调，不逐字符复制全项目快照。
- Profile Apply 纳入完整 definitions/usages/sections 及相关显示配置；Undo/Redo 一致恢复内容和关联值，不能只恢复 shotDims。
- 配置 version 是修订序号：Apply、Undo/Redo 引起配置内容变化时当前 version +1，不倒退；definitionVersion 在定义内容变化时同样递增，纯 usage 修改不改变它。
- Modal draft = structuredClone(applied snapshot)，未 Apply 不 dirty/不持久化。关闭、路由跳转、项目切换均处理继续编辑/放弃；浏览器关闭按平台能力 beforeunload，不能保证拦截。
- draft 记录打开时 profile.version，Apply 前若当前配置版本已变化，阻止旧 draft 静默覆盖并提示重载/显式重做。
- Apply 仅写入内存，全局 saved 后才能声称保存成功。

## 7. 保存与并发

```text
Editor state → saveDataSignature → useEditorSaveState
→ 400ms autosave/saveNow → useEditorPersistence
→ saveProjectEditorState(state, expectedUpdatedAt) → IndexedDB transaction
```

expectedUpdatedAt 必须来自会话加载或上次成功保存基线。禁止保存前读取 DB 最新版本并拿它替旧内存状态通过校验。成功提交才推进基线；串行队列使用上次成功返回版本，保存期间的新输入仍 dirty。

逐一核实同会话其它 repository 写入如何协调基线：只有该会话成功提交且内存对应状态已一致更新的结果可推进基线，不能自动接受任何 updatedAt 变化。跨标签页冲突保留输入，提供明确重载/导出或既有恢复入口，不自动重试覆盖。

Project.updatedAt 是本期令牌，Profile.version 不是锁；新令牌必须不同于旧值，测试同毫秒连续保存，防止时钟分辨率导致令牌重复。

普通 saveProjectEditorState 必须有可达 project/shot/template 等注入点，不能借校准事务测试冒充。写入前注册 completion/error 处理；同步异常、注入或请求失败均 abort 整个事务，无未处理 rejection。失败不推进基线、不清 dirty；重新读取 DB 必须是完整旧状态。

Profile、entries、description/notes、groups/markers、Research/Evidence 一致提交。Recovery 当前格式包含全部这些对象，走统一验证/resolver/并发边界，不能清未启用定义和值；旧格式按第 4 节。

## 8. Surface 与录入

每个 Surface 独立 widget/density；优先级：冻结定义的类型安全默认 → usage Surface 配置 → 临时运行态。一个 resolver 管理默认值与 kind/widget 合法组合；无业务逻辑重复。

Detail/Table/Focus 本期可用；ai_review/report 仅类型预留，不显示未接入配置。core 默认展开；高级 required 未填时有可见定位提示。普通 Evidence optional，本期不开放 required，待字段级证据持久化与强制门槛后再开放。

### 8.1 Focus

复用 Research sequential/range、active shot、selection、播放器。一次 Focus 会话固定队列顺序；底层镜头删除/范围变化时协调并提示，不因填值满足筛选条件而悄悄跳队列。

- 显示队列来源、位置、已处理/待判断数量和当前值。
- 单选 auto-next 可选且默认关闭；多选显式确认后前进。
- 跳过只导航；清空删 entry；无法判断写 unknown；不适用受定义约束。
- 最后一镜停留并显示本轮完成，不循环；完成不等于持久化成功。
- 1..9 显示对应选项映射，超过九项可搜索/点击。
- input/textarea/select/contenteditable、IME isComposing、重复按键、弹窗/菜单/Popover 打开时不触发 Focus 快捷键。Escape 先关最上层弹层再退出 Focus。
- 无效提交不前进；保存失败保留内存输入并持续提示重试。
- 当前 usage 移除则退出 Focus 并清 focusFieldId，不删定义。

### 8.2 Copy / Batch

Copy Previous 使用当前队列上一镜，只复制合法 set；false/0 可复制，unknown/not_applicable/unset 不复制。retired option 不新写，提示原值已停用。

Batch 只操作显式选中且仍存在的 shots，展示数量、已有值覆盖数、范围外选择数；不随 Research 范围偷偷扩大/缩小。范围外对象明确提示，用户决定是否对当前显式集合继续。

本期多选 Batch 仅“替换为所选值”，追加/移除后置；清空是独立明确动作。提交前重检定义和目标，冲突则不部分应用；一次 Undo 恢复全部目标。

## 9. P4 最小 AI 契约

仅 domain type、比较/验证纯函数、接受前守卫、统一写命令接缝和测试。本期不交付 Review 页面、Candidate Card、生产候选 store 或逐字段 AI 配置。完整 Review 与 provider/persistence/provenance 一起交付。

```ts
interface AICandidate {
  id: string
  projectId: string
  subject: { kind: 'shot'; id: string; mediaIdentityDigest: string; startUs: number; endUs: number }
  fieldId: string
  definitionVersion: number
  profileVersion: number
  baseEntry: AnalysisFieldEntry | null // null 代表生成时 unset
  proposedEntry: AnalysisFieldEntry
  reviewStatus: 'pending' | 'accepted' | 'edited' | 'rejected'
  confidence: number | null
  evidence: EvidenceRef[]
  source: { runId: string; recipeVersion: string; modelRef?: string }
}
```

conflict 是 current 与 proposed 的比较结果，不是 reviewStatus。stale 表示原值、主体边界/媒体、定义或 profile 基线变化；多选集合比较，false/0 不当空。profileVersion 改变先保守判需重验。

Accept/Edit 检查 project、主体存在/边界、definitionVersion、profileVersion、baseEntry、建议合法性；过期/非法不写、不自动转换。重复 Accept 幂等，Reject 不改值。description AI 本期不接入。

confidence 只允许有限 0..1 或 null；无模型校准不划固定高中低、不称准确率。Evidence 复用现有类型和整数微秒；未来 required 缺证据必须阻止接受。

生产无 provider 就无候选/运行按钮/进度/伪请求。fixtures 只在测试。能力可用性、执行状态和审阅状态未来独立建模。

## 10. 状态归属与旧路径退出

持久化：Profile、entries、description/notes、Research/Evidence。
会话：Focus 字段/队列、active shot、selection、保存基线。
局部：draft、hover、popover、焦点。
禁止复制到第二 profile/value/selection store，不借此重构整个 Editor。

P5 退出 DIM_REFS、旧 raw writer、重复可写 renderer、平行 Profile editor 和保存旁路。类型 renderer 子组件可拆，但身份/resolver/命令唯一。Overlay/Export/Learn/Recovery 消费者必须适配新 definitions/entries；不新增报告功能不等于允许既有导出损坏。

