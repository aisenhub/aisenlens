# AisenLens 编辑器数据结构

## 状态与目标

本文定义 AisenLens 本地优先拉片项目的数据基线。它融合了 OpenReel 的“领域 JSON、二进制资源、派生缓存、界面状态分离”与 OpenCut 的“帧精度时间、迁移链、运行时对象隔离、存储配额意识”。

本文不采用剪辑器的多轨、特效、转场等模型。AisenLens 的核心是：围绕一条本地视频，记录可验证、可编辑、可导出的分镜研究数据。

具体字段增加或删除前，必须先更新本文和项目格式版本。

## 四类数据

| 类别 | 内容 | 持久化位置 | 是否进入项目导出 JSON |
| --- | --- | --- | --- |
| 领域数据 | 项目、媒体引用、分镜、分析、笔记、分组、模板快照 | 本地项目数据仓库 | 是 |
| 二进制资源 | 视频副本、截图、缩略图 | 本地资源仓库 | 否，导出时按选项打包 |
| 派生数据 | 波形、帧带、缩略图缓存、AI 临时中间结果 | 本地缓存仓库 | 否，可重新生成 |
| 工作区状态 | 当前播放帧、选中分镜、缩放、面板宽度、临时拖动状态 | Zustand / 本地偏好 | 否 |

禁止将 `File`、`Blob`、`HTMLVideoElement`、Object URL、AudioBuffer、Canvas、Worker、播放进度和滚动位置写入领域项目数据。

## 时间与 ID 规则

- 所有领域实体使用稳定字符串 ID；ID 创建后不得改变。
- 所有镜头边界、时间点、截图定位、标记和 AI 结果范围均以 `frame`（非负整数）记录。
- `frameRate` 来自媒体元数据；展示时再转换为秒或时间码。
- 镜头采用半开区间 `[startFrame, endFrame)`：开始帧包含，结束帧不包含。
- `createdAt`、`updatedAt` 统一使用 ISO 8601 UTC 字符串。
- 可扩展枚举使用明确字符串联合；不要以 UI 显示文案作为数据值。

## 项目文件包络

每个项目的可导出领域数据使用版本化包络：

```ts
interface AisenLensProjectFile {
  format: "aisenlens-project";
  schemaVersion: 1;
  exportedAt: string;
  project: LensProject;
}
```

导入流程必须是：校验包络 → 按 `schemaVersion` 迁移 → 规范化 → 校验引用关系 → 写入本地仓库。任何迁移均只向前执行，并保留原始导入文件用于失败恢复。

## 核心领域模型

```ts
interface LensProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  coverScreenshotId: string | null;
  settings: ProjectSettings;
  media: ProjectMedia | null;
  shots: Shot[];
  groups: ShotGroup[];
  templates: TemplateSnapshot[];
  markers: ProjectMarker[];
  autoShotRuns: AutoShotRun[];
  aiTasks: AiTaskRecord[];
}

interface ProjectSettings {
  activeTemplateId: string | null;
  defaultFrameRate: number | null;
  compositionGuide: "none" | "thirds" | "golden-spiral" | "center" | "diagonal";
}
```

`LensProject` 是聚合根。项目只持有领域事实，不直接保存截图二进制、视频 Blob、波形数组或播放工作区状态。

- `schemaVersion` 只存在于最外层 `AisenLensProjectFile`，作为唯一的导入迁移依据。
- `coverScreenshotId` 是项目库稳定封面；为空时由界面使用占位封面，不从当前播放位置推断。
- `media` 可以为 `null`，允许用户先建立研究项目、模板和笔记，之后再关联视频。

## 媒体引用

```ts
interface ProjectMedia {
  id: string;
  status: "linked" | "missing" | "unsupported";
  storageMode: "reference" | "managed-copy";
  source: MediaSourceFingerprint;
  metadata: MediaMetadata;
  resourceKey: string | null;
  thumbnailResourceKey: string | null;
  importedAt: string;
  relinkedAt: string | null;
}

interface MediaSourceFingerprint {
  name: string;
  size: number;
  lastModified: number;
  mimeType: string;
}

interface MediaMetadata {
  durationFrames: number;
  frameRate: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  codec: string | null;
  audioTrackCount: number;
  hasAudio: boolean;
}
```

- `resourceKey` 指向本地二进制资源仓库，不是浏览器 Object URL。
- 打开项目时如果资源不可用，设置 `status: "missing"`，但保留指纹和所有分镜研究数据，供用户重新关联同一文件。
- `storageMode: "reference"` 是第一版默认策略：保存文件授权/指纹与可重建的本地资源索引，不复制原视频，降低本地空间占用。
- `storageMode: "managed-copy"` 为后续可选策略：将视频副本保存在应用本地资源仓库，优先保证项目可恢复性，但需要明确提示占用空间。
- 项目第一阶段只允许一条主视频；未来多媒体时扩展为 `mediaLibrary`，但不提前引入多轨剪辑结构。

## 分镜、标记与分组

```ts
interface Shot {
  id: string;
  order: number;
  startFrame: number;
  endFrame: number;
  source: "manual" | "auto" | "ai";
  status: "draft" | "confirmed";
  detection: ShotDetectionMeta | null;
  markerIds: string[];
  screenshotIds: string[];
  analysis: ShotAnalysis;
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
}

interface ShotDetectionMeta {
  runId: string | null;
  kind: "hard-cut" | "gradual-transition" | "manual";
  confidence: number | null;
}

interface AutoShotRun {
  id: string;
  status: "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";
  mediaFingerprint: MediaSourceFingerprint;
  startFrame: number;
  endFrame: number;
  cursorFrame: number;
  settings: AutoShotSettings;
  createdShotIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface AutoShotSettings {
  sensitivity: number;
  minimumShotFrames: number;
  detectHardCuts: boolean;
  detectGradualTransitions: boolean;
}

interface ProjectMarker {
  id: string;
  frame: number;
  kind: "important" | "composition" | "emotion" | "turning-point" | "custom";
  label: string;
  color: string;
}

interface ShotGroup {
  id: string;
  name: string;
  color: string | null;
  shotIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

- `order` 仅表示研究展示顺序；播放位置永远以帧范围为准。
- 自动或 AI 生成的分镜初始为 `draft`，人工确认后改为 `confirmed`。
- `ShotGroup` 只组织镜头，不改变镜头时间范围。
- 手动创建或手动调整的分镜直接标记为 `confirmed`，并将 `detection.kind` 设为 `manual`。
- `detection` 保存自动或 AI 分镜的任务来源、切分类型和置信度；没有可追溯来源时为 `null`。
- `autoShotRuns` 保存自动分镜的媒体指纹、阈值、最小间隔、扫描范围、进度和生成结果，支持对同一媒体安全暂停和恢复；恢复时媒体指纹不匹配则终止恢复并要求重新开始。

### 分镜边界编辑规则

- 项目存在主视频时，默认镜头覆盖范围必须连续：第一段从 `0` 开始、最后一段结束于 `durationFrames`，相邻镜头满足前一段 `endFrame ===` 后一段 `startFrame`。
- 分镜默认不允许重叠或空档。边界调整会联动相邻镜头的对应边界，保持连续范围。
- 分割镜头时，前半段保留原 `id`，后半段创建新 `id`；两段都继承原镜头的分组关系，截图按帧位置重新关联。
- 合并相邻镜头时，保留前镜头的 `id` 和起始帧，后镜头的终止帧成为合并后镜头的终止帧。
- 合并时，后镜头的 `markerIds`、`screenshotIds`、`annotations` 和 `analysis.fields` 自动合并到前镜头。字段键冲突时，保留前镜头值，并将后镜头冲突值追加到 `analysis.mergeConflicts` 供用户后续处理。
- 删除镜头不是边界编辑操作；若以后开放删除，必须先定义其范围如何并入相邻镜头，不能产生未处理空档。

## 分析、注释与模板

镜号、时间范围、时长和画面截图属于 `Shot` 的固定基础信息，不属于模板字段：

- 镜号由 `Shot.order` 派生，只读显示，不允许用户或 AI 直接填写。
- 时间范围和时长由 `startFrame`、`endFrame` 与媒体帧率推导。
- 截图通过 `screenshotIds` 与 `Screenshot` 实体关联；一个镜头可没有或包含多张截图。
- 模板切换不得影响上述基础信息。

模板只控制可配置的研究与分析字段。系统固定保留一个 `shot_description` 长文本字段，用于记录镜头中的画面、动作与人物；其余分析字段均由模板决定。

```ts
interface ShotAnalysis {
  templateId: string | null;
  fields: Record<string, AnalysisValue>;
  mergeConflicts: Record<string, AnalysisValue[]>;
  updatedAt: string;
}

type AnalysisValue = string | string[] | number | boolean | null;

interface Annotation {
  id: string;
  scope: "shot" | "frame-range";
  startFrame: number | null;
  endFrame: number | null;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TemplateSnapshot {
  id: string;
  name: string;
  version: number;
  groups: TemplateFieldGroup[];
  fields: TemplateField[];
  createdAt: string;
}

interface TemplateFieldGroup {
  id: string;
  label: string;
  order: number;
}

interface TemplateField {
  id: string;
  label: string;
  groupId: string | null;
  order: number;
  kind: "single-select" | "multi-select" | "text" | "number" | "boolean";
  options: TemplateOption[];
  referenceTerms: ReferenceTerm[];
  required: boolean;
  isFixed: boolean;
}

interface TemplateOption {
  value: string;
  label: string;
  order: number;
}

interface ReferenceTerm {
  id: string;
  label: string;
  description: string | null;
  insertValue: string | null;
  order: number;
}
```

模板分为三层：

```text
FieldCatalog（全局字段池）
├─ 内置字段：稳定 ID，可用不可修改
└─ 用户字段：全局创建，可在多个模板和项目中复用

TemplateDefinition（全局模板定义）
├─ 选择字段池字段
├─ 定义字段分组与显示顺序
└─ 内置模板仅可复制后编辑

TemplateSnapshot（项目模板快照）
└─ 项目使用时冻结字段、选项、分组和顺序
```

- 用户可在项目外创建全局字段，并在多个模板中复用。
- 每个模板快照必须包含固定的 `shot_description` 字段，且 `isFixed: true`。
- 全局模板后来改名、删除字段或调整选项，不能改变旧项目的分析语义。
- `ShotAnalysis.fields` 始终以 `TemplateField.id` 作为键，不以字段中文名称作为键。

### 分析值规则

- 不保存独立的 `summary` 字段，避免与固定的 `shot_description` 重复。
- `shot_description` 记录可观察的画面事实：人物、动作、场景、道具与画面内容。
- 其余模板字段记录研究判断：景别、运镜、构图、色彩、声音、叙事作用、情绪等。
- 综合解读不是硬编码字段；需要时，由模板增加长文本字段，例如 `overall_analysis`。

| 字段类型 | `fields` 保存形式 | 未填写值 |
| --- | --- | --- |
| `single-select` | `string`（稳定 `TemplateOption.value`） | `null` |
| `multi-select` | `string[]`（稳定值数组） | `[]` |
| `text` | `string` | `""` |
| `number` | `number` | `null` |
| `boolean` | `boolean` | `null` |

AI 不能直接覆盖 `ShotAnalysis.fields`。AI 结果必须先作为待确认建议保存，只有用户明确接受后才写入正式分析值。

### 字段选项与参考标签

字段的可选值和参考标签是两个不同概念：

| 内容 | 用途 | 点击后的行为 | 数据约束 |
| --- | --- | --- | --- |
| `options` | 限定字段实际可保存的值 | 单选替换当前值；多选添加或取消值 | 选项型字段只能保存其中的 `value` |
| `referenceTerms` | 辅助用户观察与思考的参考词 | 按字段规则填入、追加或插入文本 | 不限制用户最终输入 |

- 用户可在模板编辑器中，为每个字段单独新增、编辑、删除和排序 `referenceTerms`。
- 参考标签可设置 `description` 用于简短判断提示，和 `insertValue` 用于点击后写入的值或文本。
- 对单选字段，参考标签可将对应值写入该字段；对多选字段可添加/取消对应值；对文本字段可插入或追加文本。
- 数值和布尔字段默认不显示参考标签，但数据结构允许未来按需启用。
- 字段的 `options` 与 `referenceTerms` 一同进入 `TemplateSnapshot`，确保历史项目的填写辅助和选项语义保持稳定。

## 截图与资源索引

截图元数据属于领域项目；图片本体属于资源仓库：

```ts
interface Screenshot {
  id: string;
  shotId: string | null;
  frame: number;
  kind: "keyframe" | "manual" | "cover";
  resourceKey: string;
  width: number;
  height: number;
  createdAt: string;
}
```

项目导出默认只写 `Screenshot` 元数据。用户选择“包含本地资源”后，导出器才将对应二进制资源一起打包。

## AI 任务与结果溯源

```ts
interface AiTaskRecord {
  id: string;
  capabilityId: string;
  status: "queued" | "preparing" | "running" | "paused" | "completed" | "failed" | "cancelled";
  input: AiInputRange;
  engine: AiEngineReference;
  parameters: Record<string, unknown>;
  inputFingerprint: string;
  result: AiResultReference | null;
  suggestionIds: string[];
  attemptCount: number;
  error: AiTaskError | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface AiInputRange {
  mediaId: string;
  startFrame: number;
  endFrame: number;
}

interface AiEngineReference {
  provider: "local" | "bring-your-own-key" | "platform";
  engineId: string;
  modelId: string;
  modelVersion: string | null;
}

interface AiResultReference {
  confidence: number | null;
  acceptedAt: string | null;
  appliedEntityIds: string[];
}

interface AiTaskError {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
}

interface AiSuggestion {
  id: string;
  taskId: string;
  shotId: string;
  fieldId: string;
  proposedValue: AnalysisValue;
  rationale: string | null;
  confidence: number | null;
  status: "pending" | "accepted" | "rejected" | "superseded";
  createdAt: string;
  resolvedAt: string | null;
}
```

AI 原始中间输出可以作为可清理缓存保存；被用户确认并应用的内容必须转化为 `Shot`、`ShotAnalysis`、`Annotation` 等领域数据。这样更换模型不会破坏项目事实。

### AI 能力、引擎与任务

用户发起的是能力，不是某一个具体模型。`capabilityId` 由能力注册表定义输入范围、输出类型、可用引擎和审核方式；任务创建时再冻结实际使用的 `engine`、参数、媒体指纹和模板快照。

| 能力 | 输入 | 输出 | 写入方式 |
| --- | --- | --- | --- |
| 本地切镜 | 视频或选定帧段 | 草稿镜头 | 生成 `draft` 镜头，人工批量或逐条确认 |
| 波形、抽帧、缩略图 | 视频或选定帧段 | 派生缓存 | 直接使用，可重新生成 |
| 转写 | 音频或视频范围 | 带时间范围的文本候选 | 转为可编辑的注释候选，人工确认 |
| 镜头字段分析 | 选定镜头截图、模板字段 | `AiSuggestion` | 按字段接受、拒绝或自行编辑 |
| 整段/整片总结 | 已确认的镜头、转写、笔记 | 报告草稿 | 独立展示；仅在用户确认后写入目标内容 |

- 本地引擎在设备上执行，只需检测“可用 / 未安装 / 不支持”；模型下载、安装与运行状态不写入项目文件。
- 用户自带 Key 的云端引擎由设置页配置提供方、模型与密钥；密钥只保存在受保护的本机设置中，不进入项目 JSON、恢复快照或备份包。
- 远程任务创建前必须展示本次将离开设备的精确输入，例如“12 张截图与模板字段”，不得默认上传整段视频。
- 能力注册表可声明本地优先顺序和可选远程引擎；用户选择“镜头语言分析”后，系统按当前设置选择可用引擎，避免页面耦合具体模型名称。

### 任务队列与 OpenReel 借鉴

- 第一阶段同一项目最多同时运行一个重型 AI/媒体分析任务；波形、缩略图等轻量缓存任务走独立队列，不能阻塞编辑操作。
- 任务状态固定为 `queued → preparing → running → completed`，并允许 `paused`、`failed`、`cancelled` 终止或中断状态；只有 `failed` 且 `error.retryable` 为真时才展示重试。
- 取消只停止尚未完成的任务和可清理中间资源，绝不回滚已由用户确认写入的领域数据。
- 任务摘要需随项目保存，以便刷新或重新打开项目后恢复本地等待任务；自带 Key 云端任务可继续轮询远程状态。任务的原始输出文件和中间结果放入 `derived-cache`，可清理。
- 任务完成后必须先经过结果适配器，将不同引擎的原始响应规范化为草稿镜头、转写候选、`AiSuggestion` 或报告草稿；领域模块不直接读取模型供应商的原始格式。
- 任务失败保留引擎、输入指纹、参数、错误和重试次数，供用户理解与重试；不保存任何密钥或完整远程请求凭证。

### AI 提供方范围

- 第一阶段只实现 `local`（用户设备执行）和 `bring-your-own-key`（用户自行配置第三方云端密钥）。
- `platform` 仅为未来兼容的平台云端预留枚举值；当前不建设平台 GPU、额度、计费、素材托管或任务服务。
- 自带 Key 仍属于云端执行。提交前必须明确说明将离开本地的媒体帧、音频或文本；远程结果仍遵循相同的审核与溯源规则。

### 用户 API 密钥与调用边界

用户 API 配置分为三个彼此隔离的层级：

| 层级 | 保存内容 | 禁止保存的内容 |
| --- | --- | --- |
| 密钥仓库 | 服务 API Key | 项目数据、备份、普通 Zustand 设置 |
| 非敏感设置 | 服务 ID、默认模型、隐私偏好、是否已配置 | Key 明文、完整远程请求或响应 |
| 项目任务溯源 | 提供方、模型、输入摘要/指纹、状态、错误 | Key、授权请求头、完整媒体上传内容 |

- 支持的第三方服务通过稳定的服务注册表声明名称、用途、可用能力和调用适配器；页面与领域模块只能引用服务 ID，不能直接调用供应商 API。
- 调用适配器在任务执行时临时读取密钥，统一处理鉴权、输入限制、错误转换和上传告知；读取后不得将 Key 写入日志、状态、任务记录或错误信息。
- 网页端使用用户设置的主密码派生 AES-GCM 密钥，加密保存 API Key；解锁后的派生密钥仅保留在内存，闲置 `30` 分钟自动锁定并清理会话模型缓存。
- 未来桌面端优先使用操作系统钥匙串，替代网页端加密 IndexedDB；两种实现对上层暴露相同的密钥仓库接口。
- 设置界面只显示服务“未配置 / 已配置”和最后更新时间；不回显完整 Key。用户可随时删除密钥，删除后新任务不可提交，已完成项目数据不受影响。
- 网页端的自带 Key 只能用于个人可信设备，必须在界面明确说明：加密本地存储不能等同于服务端密钥保护；用户应使用可限制额度与权限的专用 Key。
- 第一阶段仅接入经过适配和验证的少量服务（一个 OpenAI 兼容云端适配器与本地引擎），不提供任意自定义 API 地址，以控制 CORS、鉴权和隐私风险。

### AI 建议确认规则

- 一个 AI 任务可产生多个 `AiSuggestion`，分别对应不同镜头和字段。
- 建议默认 `pending`；用户必须逐条接受或拒绝，AI 不得直接覆盖 `ShotAnalysis.fields`。
- 接受建议时，将 `proposedValue` 写入目标 `ShotAnalysis.fields[fieldId]`，建议状态变为 `accepted`，并记录 `resolvedAt`。
- 用户手动修改某个字段时，该镜头、该字段所有仍为 `pending` 的建议自动变为 `superseded`，防止过期建议覆盖人工判断。
- 自由文本、转写、自动分镜等 AI 输出同样必须通过建议或草稿状态进入领域数据，不能绕过人工确认。
- 已接受或拒绝的建议记录保留在项目中，提供模型、任务、时间、置信度和依据的追溯能力。

## 本地存储、恢复与备份

| 数据库/仓库 | 数据 | 清理策略 |
| --- | --- | --- |
| `projects` | `AisenLensProjectFile` 或标准化项目 JSON | 不自动清理 |
| `media` | 用户主动托管的原视频副本、截图等正式二进制资源 | 项目删除后可清理；删除前提示大小 |
| `derived-cache` | 波形、帧带、缩略图、AI 中间结果 | 可随时重新生成，优先按 LRU 清理 |
| `file-handles` | 经过用户授权的本地文件/目录句柄 | 句柄无效时安全降级为重新关联 |
| `workspace-preferences` | 面板尺寸、主题、快捷键、工作区偏好 | 不进入项目文件 |

实现阶段使用 IndexedDB 保存项目结构化数据和资源索引；媒体、截图及大体积派生缓存进入 OPFS。视频默认只保存本地文件引用和指纹，不复制、不自动备份；用户未来主动选择 `managed-copy` 时才成为正式本地资源。导入大文件前必须检查浏览器存储配额，并明确提示用户资源会留在本机。

### 自动保存与恢复

- 修改项目领域数据后约 `2` 秒防抖保存；同一项目的写入必须串行，避免较早状态覆盖较晚状态。
- 每 `30` 秒执行一次兜底保存；应用离开前尽力冲刷未完成队列，并在下次启动时诊断上次未完成写入。
- 每个项目最多保留 `3` 份轮换的纯数据恢复快照，只包含可序列化领域数据，不重复复制截图、视频或派生缓存。
- 恢复快照仅用于异常恢复，不能代替用户主动导出的备份；用户完成恢复后再写回正式项目数据。

### 备份包

备份采用带清单的 ZIP 包。清单记录格式、`schemaVersion`、项目 ID、导出时间、备份类型、结构化文件与二进制资源清单（路径、资源 ID、MIME、字节数、校验值）。内部路径只能使用应用生成的资源 ID，禁止包含用户原文件路径。

| 类型 | 包含内容 | 默认用途 |
| --- | --- | --- |
| `data` | 项目 JSON、分镜、模板快照、注释、截图元数据、已确认 AI 结果与任务溯源 | 日常快速备份 |
| `study` | `data` + 截图二进制资源 | 迁移或分享完整拉片成果 |
| `full` | `study` + 用户主动托管的原视频副本 | 离线归档；必须显示体积并由用户主动选择 |

- `data` 备份不复制视频，也不复制任何可重新生成的缓存。
- 仅引用本地文件的视频在任何备份中都只保留媒体元数据和指纹；恢复后进入“待重新关联”。
- 波形、缩略图、帧带和 AI 中间输出永不打包，可在需要时重新生成。

### 导入、配额与清理

- 导入顺序固定为：校验 ZIP 与清单 → 校验格式版本和资源完整性 → 使用新的内部项目 ID 写入结构化数据和资源 → 全部成功后才显示该项目。
- 导入失败必须清理本次新建的项目记录和资源，不得影响既有项目；原始备份文件由用户自行保留。
- 导入前通过 `navigator.storage.estimate()` 预检空间，保留至少 `50MB` 安全余量；应用启动时尝试请求持久化存储，并如实显示授权结果。
- 正式项目数据、截图和用户主动托管的媒体不会被自动清理；仅 `derived-cache` 可按最近最少使用（LRU）策略清理，并保留最低数量以保障编辑体验。
- 项目打开时，如媒体文件引用或资源索引失效，保留全部拉片内容并标记“待重新关联”；用户选定文件后通过名称、大小、修改时间和 MIME 指纹进行校验。

## 关系与约束

```text
LensProject 1 ── 0..1 ProjectMedia
LensProject 1 ── * Shot
LensProject 1 ── * ShotGroup
LensProject 1 ── * TemplateSnapshot
LensProject 1 ── * ProjectMarker
Shot 1 ── 1 ShotAnalysis
Shot 1 ── * Annotation
Shot 1 ── * Screenshot
ShotGroup * ── * Shot (by shotIds)
AiTaskRecord ──> confirmed domain entities (by appliedEntityIds)
AiTaskRecord 1 ── * AiSuggestion ──> ShotAnalysis.fields（用户接受后）
```

- `Shot.startFrame < Shot.endFrame <= ProjectMedia.metadata.durationFrames`。
- 存在主视频时，镜头默认连续覆盖 `0` 至 `durationFrames`，不允许重叠或空档。
- 所有 ID 引用在保存与导入时需要校验；无效引用必须移除并记录可恢复诊断。

## 后续逐模块确认顺序

- [x] 确认数据分层、时间精度、版本迁移和本地存储原则。
- [x] 形成项目、媒体、分镜、分析、注释、模板、截图、AI 溯源的初始结构。
- [x] 确认 `LensProject`、`ProjectMedia` 和本地文件重新关联的字段取舍：允许无视频项目，默认仅引用本地媒体。
- [x] 确认 `Shot` 的边界编辑、排序、连续覆盖与自动分镜确认规则：默认无空档，合并内容自动归入前镜头。
- [x] 确认模板字段层级与固定字段规则：基础镜头信息不进入模板；用户字段可全局复用；仅固定 `shot_description` 分析字段。
- [x] 确认模板字段的参考标签：选项约束可保存数据，参考词辅助思考；用户可在模板中编辑每个字段的参考标签。
- [x] 确认镜头分析值规则：移除重复摘要；镜头描述记录事实；其他字段记录判断；AI 建议必须人工确认后写入。
- [x] 确认 AI 建议的逐条接受、拒绝、人工修改自动失效与长期溯源规则。
- [x] 确认截图导出、资源打包、缓存清理与项目备份格式：三档 ZIP 备份、导入事务隔离、自动保存与恢复快照、配额预检及仅清理派生缓存。
- [x] 确认 AI 能力注册、模型发现、项目级任务队列、输入告知、结果适配与人工审核规则：本地优先，可选自带 Key 云端，平台云端仅预留。

任何一项确认后，先更新本文，再进入对应模块开发。
