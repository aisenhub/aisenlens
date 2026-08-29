# AisenShot 自动分镜控制系统设计

> 状态：第二轮架构审计完成；需先关闭 Phase 11 的媒体身份、配置哈希、恢复语义和候选应用边界。Phase 12 采用“先研究型控制面板，再人工标定和生产晋升”的顺序；未标定配置不得宣称为生产默认值
>
> 日期：2026-08-28
>
> 范围：Web 自动分镜的用户配置、预设解析、任务快照与候选审阅

## 1. 设计结论

新 Scene Engine 不再由旧 UI 的“切割灵敏度 + 最短时长”直接控制。AisenLens
建立独立的产品控制层，以“内容预设 + 检出程度 + 转场类型 + 最短镜头”为默认
入口，并在高级设置中提供与 Content、Adaptive、Threshold/Fade 对应的专家参数。

用户选择不能直接作为 WASM 配置传入。`auto-shot` feature 先把产品设置解析成
严格的 `SceneDetectionConfig`，任务启动时同时冻结用户设置快照、预设版本和引擎
配置。这样可以在保持易用性的同时，确保暂停恢复、结果复现和参数标定都可追溯。

旧的 `autoSensitivity` 线性换算属于 Phase 11 最小接入阶段的临时交互，不作为
新控制系统的兼容目标；新面板完成后直接删除该状态和映射。

实施顺序明确为：先依据 PySceneDetect 的 detector/过滤器**语义**完成可运行的研究型
控制面板、唯一 resolver 与研究 preset catalog；再让人工标定工作台复用同一 resolver
产出数据、评分和优化证据；最后只把通过独立 holdout 的配置晋升为生产 catalog。这样
先稳定用户可见的控制模型，不把未经 AisenLens 像素路径验证的数值包装为已验证默认值。

## 2. 参考依据与 AisenLens 取舍

### 2.1 PySceneDetect 参数模型

PySceneDetect 将问题拆成互补的检测器与过滤参数：

- Content：相邻帧 HSV 内容差异、固定阈值、分量权重和最短场景长度。
- Adaptive：Content score 相对邻域平均值的比率、窗口宽度、最低内容差异和
  最短场景长度，用于减少快速运动造成的误切。
- Threshold：按平均亮度检测淡出/淡入，并提供亮度阈值、fade bias 和末尾
  fade 处理。
- 全局层还区分 detector、最短场景、短场景过滤策略、下采样和跳帧。

PySceneDetect 的公开 sweep 进一步证明不能用一个通用灵敏度覆盖所有内容：BBC
长节目、AutoShot 短视频和 ClipShots 短 Web 视频的最佳阈值与最短场景参数明显
不同。其跨数据集 hard-cut 平均结果中，Adaptive 的最佳组合为 threshold `3.5`、
window `3`、minimum scene `0.6s`；但单数据集最优值仍有明显差异。

AisenLens 采用上述参数分层与评估方法，不复制 Python/OpenCV 实现，也不直接宣称
PySceneDetect 数值与本项目 C++/WASM 固定点 score 等价。正式预设必须通过 AisenLens
自己的像素路径、标注集和浏览器产物重新标定。

### 2.2 其他成熟产品与参考项目

- Premiere 的 Scene Edit Detection 将“检测边界”与“应用为切点、子片段或标记”
  分开，支持 AisenLens 保持“先生成候选，再显式应用”的产品边界。
- OpenReel 只把 scene detection 注册为一种分析任务，没有可复用的参数控制面板；
  可借鉴的是任务类型和结果类型分离，而不是算法设置。
- OpenCut 没有自动镜头检测模块；其场景选择与命令式修改分离，支持继续把候选
  审阅与正式镜头写入分开。

## 3. 用户控制模型

### 3.1 默认层

默认面板只显示四组有明确产品含义的设置：

1. **视频类型**：选择内容预设。
2. **检出程度**：`保守 / 均衡 / 细致`，只调整 hard-cut 判定强度，不暗中修改
   最短镜头或转场类型。
3. **转场类型**：`仅硬切 / 硬切与淡入淡出`。
4. **最短镜头**：默认跟随预设，也可切换为用户指定秒数。

“灵敏度”不再作为对所有 detector 含义模糊的统一滑块。界面使用“检出程度”，
并明确提示：细致会找到更多候选，也可能增加误切；保守会减少候选，也可能漏切。

### 3.2 内容预设

首版定义以下稳定 ID；中文名称可以调整，但 ID 和版本必须进入任务快照：

| preset ID | 用户名称 | 检测目标 | 初始 detector 倾向 | 默认转场 | 最短镜头种子 |
| --- | --- | --- | --- | --- | --- |
| `general` | 通用视频 | 未知类型的安全起点 | Adaptive | 仅硬切 | 0.6s |
| `film-series` | 电影 / 剧集 | 长叙事、镜头运动、可能存在黑场转场 | Adaptive | 硬切与淡入淡出 | 0.8s |
| `short-form` | 短视频 | 快节奏剪辑与较短镜头 | Adaptive | 仅硬切 | 0.4s |
| `talking-head` | 访谈 / Vlog | 压制人物动作和曝光变化造成的误切 | Adaptive（更保守） | 仅硬切 | 1.0s |
| `animation-gameplay` | 动画 / 游戏 | 大幅色彩变化、闪光和界面切换 | Content/Adaptive 对照标定 | 仅硬切 | 0.5s |

表中的 detector 和时长只是待 sweep 的**标定种子**，不是已通过验收的生产默认值。
BBC、AutoShot、ClipShots 可以作为长内容与短 Web 内容的外部参考，但最终值必须在
AisenLens 自有分类标注集上通过 Precision、Recall、F1 和边界偏移验证。

在首轮标定完成前，这些 preset 属于 `research` catalog：面板可以运行、审阅和应用
结果，但必须显示“研究配置 / 待标定”，不能使用“推荐”“最佳”或“生产默认”等文案。
`production` catalog 初始为空，只有 promotion 报告通过后才允许同一 preset ID 的版本进入。

内容类型不能仅根据横竖屏、文件扩展名或视频时长自动猜测。首版由用户明确选择；
未来若增加推荐功能，只能显示“建议预设”，不能静默改写任务配置。

### 3.3 检出程度

每个预设提供三个已标定档位：

- `conservative`：提高 hard-cut 判定门槛，优先 Precision。
- `balanced`：该内容预设的默认标定点。
- `detailed`：降低 hard-cut 判定门槛，优先 Recall。

Content 模式调整 `threshold`；Adaptive 模式调整 `adaptiveThreshold`，必要时由预设
同时固定 `minimumContentScore`。档位不得改变 detector 类型、Fade 开关、最短镜头、
采样策略或分量权重，避免一个控件产生不可见的多重副作用。

### 3.4 高级设置

高级设置默认折叠，展开后按能力分组：

- **硬切检测**：`自动（跟随预设） / Content / Adaptive`。
- **Content 参数**：内容阈值；色相、饱和度、亮度权重。权重由 UI 自动归一化，
  写入引擎时总和固定为 `10000`。
- **Adaptive 参数**：相对阈值、邻域窗口、最低内容差异。
- **淡入淡出**：启用、亮度阈值、边界位置偏移、末尾淡出是否生成边界。
- **短镜头处理**：最短时长；后续在引擎支持并完成测试后增加“保留更强边界”与
  “时间窗内抑制”策略，首版不伪造尚不存在的能力。
- **分析质量**：只显示已经过生产验证的采样/分析尺寸组合。当前只发布逐帧 `96`
  宽分析；stride 或更高分辨率必须先通过准确率、性能和内存门槛，不能作为无效选项
  提前出现在 UI。

任一高级参数偏离预设后，界面显示“基于〈预设名称〉已调整”；恢复预设会一次性
清除覆盖值。首版不把 `custom` 伪装成内容预设：高级覆盖始终保留一个明确的基础
preset，用户自定义预设的命名、保存与跨项目管理作为后续能力单独立项。

## 4. 类型与解析边界

建议在 `apps/web/src/features/auto-shot/config/` 建立产品配置层：

```ts
type AutoShotPresetId =
  | "general"
  | "film-series"
  | "short-form"
  | "talking-head"
  | "animation-gameplay";

type AutoShotPresetCatalog = "research" | "production";

type DetectionDetail = "conservative" | "balanced" | "detailed";
type TransitionSelection = "hard-cuts" | "hard-cuts-and-fades";

interface AutoShotControlSettings {
  schemaVersion: 1;
  presetId: AutoShotPresetId;
  detail: DetectionDetail;
  transitions: TransitionSelection;
  minimumSceneDuration: { mode: "preset" } | { mode: "custom"; seconds: number };
  overrides: AutoShotAdvancedOverrides;
}

interface AutoShotAdvancedOverrides {
  // 完整替换 hardCut 分支，避免切换 detector 后出现字段来源不明的半配置。
  hardCut?: SceneDetectionConfig["hardCut"];
  // 完整替换 fade 分支；undefined 表示仍由 transitions + preset 决定。
  fade?: SceneDetectionConfig["fade"];
}

type AutoShotTaskControlSnapshot = Omit<AutoShotControlSettings, "presetId"> & {
  preset: { id: AutoShotPresetId; version: number; catalog: AutoShotPresetCatalog };
};

interface ResolvedAutoShotConfiguration {
  schemaVersion: 1;
  settings: AutoShotTaskControlSnapshot;
  engineConfig: SceneDetectionConfig;
  canonicalConfig: string;
  configHash: string;
  summary: AutoShotConfigurationSummary;
}
```

`researchPresetRegistry.ts` 与 `productionPresetRegistry.ts` 是两个显式、版本化且不可混用的
catalog；前者由 PySceneDetect 语义转换而来，只供研究面板、标定和 sweep 使用，后者只接受
promotion 写入。`resolveAutoShotConfig.ts` 是唯一解析入口，负责从指定 catalog 注入 preset
version，按“预设基础值 → 检出程度 → 转场与最短镜头 →
完整高级分支覆盖”的固定顺序解析，归一化权重并调用 Scene Engine 配置校验。React、
Worker、repository 和 C ABI 都不得各自维护第二套映射。高级设置切换 hard-cut detector
时必须提交一个完整合法的 `hardCut` discriminated union，不能把原 detector 的阈值或
权重隐式带入另一分支。

第一版产品输入范围冻结如下；UI 可使用更友好的显示单位，但 resolver 只输出右侧整数：

| 设置 | 产品输入范围 | Engine 写入规则 |
| --- | --- | --- |
| Content 阈值 | `0.00..100.00`，步长 `0.01` | `round(value × 100)`，范围 `0..10000` |
| HSV/Luma 权重 | 每项 `0..100` | 使用最大余数法确定性归一化到总和 `10000`；全零拒绝 |
| Adaptive 比率 | `0.001..12.000`，步长 `0.001` | `round(value × 1000)`，范围 `1..12000` |
| Adaptive 窗口 | 整数 `1..12` | 原值写入；更大窗口不在首版 UI 暴露 |
| 最低内容差异 | `0.00..100.00`，步长 `0.01` | `round(value × 100)`，范围 `0..10000` |
| Fade 亮度阈值 | 整数 `0..255` | 原值写入 |
| Fade bias | `-1.000..1.000` | `round(value × 1000)` |
| 自定义最短镜头 | `0.1..30.0s`，步长 `0.1s` | `round(seconds × 1_000_000)` |

生产 registry 的默认值和每个预设允许的推荐范围仍由标定结果决定；上表只是合法产品
输入边界，不代表所有极值都适合作为生产默认值。

预设定义与解析函数必须为纯数据/纯函数，使用 Node tests 覆盖：

- 所有 preset × detail × transition 组合都能生成合法配置。
- 同一输入重复解析得到完全相同的 canonical config 和 config hash；对象字段创建顺序
  不同但语义等价时也必须相同。
- Content 与 Adaptive 的无效字段不能同时进入配置。
- 权重总和固定为 `10000`，秒数安全转换为整数微秒。
- preset version 由 registry 注入；版本或覆盖值变化会改变任务快照。若版本变化但
  EngineConfig 完全相同，产品快照必须变化，Engine config hash 可以保持不变。

## 5. 状态、持久化与任务生命周期

### 5.1 状态所有权

- 设置草稿属于 `features/auto-shot`，由 feature 级 Zustand store 管理；不得继续散落
  在 `EditorWorkspace` 的多个 `useState` 中。
- Worker 运行状态继续由 `useAutoShotTask` 与 task service 管理，不放入 Zustand。
- 候选结果、checkpoint 和引擎结果继续保存到 IndexedDB 的 auto-shot task record，
  不把大数据放入 Zustand。
- 首版按 `projectId + mediaIdentityDigest` 保存当前浏览器会话中的小型设置草稿；在 production
  catalog 为空时初始化为当前 `general` 研究配置，并显示其待标定状态；首次晋升 `general`
  后，新扫描才初始化为生产默认。草稿不写 localStorage/IndexedDB，任务快照始终持久化。
  项目默认预设的长期保存可在项目设置模型明确后单独实施。

Zustand 尚未安装，实施本控制系统时按既有开发待办正式引入并锁定版本；不创建临时
Context 或第二套全局状态方案。

### 5.2 任务快照

`AutoShotTaskRecord` 增加：

- `mediaIdentity`：自动分镜专用强身份，不复用仅含文件元数据的通用 fingerprint。
- `controlSettings`：由 resolver 生成的用户可读设置快照，其中包含 preset ID 与 version。
- `config`：已解析并校验的完整 `SceneDetectionConfig`。
- `canonicalConfig`：固定字段顺序的规范表示。
- `configHash`：实际引擎配置 hash。
- `review`：完成后用户排除的候选 ID、最后修改时间和是否已应用；候选本体仍只保存一份。

任务开始后冻结以上字段。运行中控件只读；用户要修改设置时必须取消或完成当前任务，
然后“使用新设置重新扫描”。暂停任务直接使用持久化的旧版本设置和完整配置继续，
不能用当前 registry 重新解析；只有媒体身份、完整规范配置、config hash、checkpoint
schema、精确 Engine state version 全部一致才可恢复。

只有完整 checkpoint 已成功持久化的任务才能写成 `paused`。刷新、崩溃或进程终止遗留
的 `running` 记录在下次打开时标为 `interrupted`，首版只能重新扫描；不得构造空
checkpoint 或把 running 直接改名为 paused。页面卸载不依赖异步清理完成，Worker 的
资源释放和持久化状态分别验收。

这是可重新生成的派生记录。切换到新 record schema 时提升 IndexedDB version，只清理
旧 auto-shot task，不能修改项目、媒体、正式镜头、截图或注释；不保留旧 sensitivity
记录的兼容读取。

任务记录按项目唯一且会被重新扫描覆盖，因此正式镜头必须保存独立的最小 provenance
快照，不能只引用 task record。候选排除状态属于当前派生任务，可随任务清理；已经应用
到正式镜头的来源快照不得随任务清理。

## 6. 前端结构

```text
apps/web/src/features/auto-shot/
├── components/
│   ├── AutoShotControlPanel.tsx
│   ├── AutoShotPresetSelector.tsx
│   ├── AutoShotBasicSettings.tsx
│   ├── AutoShotAdvancedSettings.tsx
│   ├── AutoShotRunStatus.tsx
│   └── AutoShotResultReview.tsx
├── config/
│   ├── types.ts
│   ├── presetRegistry.ts
│   ├── researchPresetRegistry.ts
│   ├── productionPresetRegistry.ts
│   ├── resolveAutoShotConfig.ts
│   └── summarizeAutoShotConfig.ts
├── hooks/
│   ├── useAutoShotTask.ts
│   └── useAutoShotControl.ts
├── stores/
│   └── useAutoShotSettingsStore.ts
├── autoShotTaskService.ts
├── sceneResultAdapter.ts
└── types.ts

apps/web/src/features/scene-calibration/
├── components/                       # 标注工作台、候选复核、数据导出
├── services/                         # 标注校验、评分输入和导出
└── types.ts                          # 独立真值 schema，不复用正式镜头/创作标记
```

`EditorWorkspace` 只负责把项目/媒体上下文、应用候选命令和布局位置传给
`AutoShotControlPanel`。面板不能直接创建 Worker、读取视频像素、访问 IndexedDB 或
写正式镜头；通用 Button、Tabs、Tooltip、Dialog 和 Sonner 继续复用现有组件。

建议面板信息结构：

```text
自动分镜
├─ 配置状态：研究配置 / 待标定（首轮 promotion 前必须可见）
├─ 视频类型：通用 / 电影剧集 / 短视频 / 访谈Vlog / 动画游戏
├─ 检出程度：保守 / 均衡 / 细致
├─ 转场：仅硬切 / 硬切与淡入淡出
├─ 最短镜头：跟随预设（0.8s） / 自定义
├─ 高级设置（折叠）
├─ 配置摘要：电影剧集 · 均衡 · 含淡入淡出 · ≥0.8s
└─ 开始扫描
```

运行中替换设置区为只读摘要、进度、暂停和取消；完成后显示**检测边界数**和生成的候选
镜头数（尾段不得被称为切点）、hard-cut/fade
分类、配置摘要、重新扫描和显式应用。原始 score 不显示为“置信率”；需要用户友好
等级时，应由有标定依据的展示映射生成“较弱/明确/强”，并保留原始 evidence。

## 7. 运行逻辑

```text
选择预设
  -> 生成预设默认设置
  -> 合并检出程度、转场和最短时长
  -> 合并高级覆盖
  -> 严格校验并生成配置摘要
  -> 用户开始扫描
  -> 冻结 controlSettings（含 preset.id/version）+ canonical config/hash + engineConfig
  -> Worker/WASM 执行
  -> 生成可审阅候选
  -> 用户显式应用
  -> 通过独立 applyAutoShotCandidates 领域命令一次性写入正式镜头并支持撤销
```

配置解析失败时禁止启动任务并定位到具体设置。候选生成后允许用户排除单个边界、
按类型筛选和重新扫描，但不在结果页静默改变阈值。重新扫描始终创建新任务快照，
旧候选属于可替换派生数据。

### 7.1 候选审阅与应用领域命令

候选审阅默认纳入全部合法 hard-cut/fade 边界，用户排除的候选 ID 持久化到当前 task
record。类型筛选只是视图，不得隐式改变纳入状态。刷新后应恢复排除结果；重新扫描创建
新候选集合并清空旧 review，不能用边界时间猜测迁移用户选择。

正式应用必须调用独立的 `applyAutoShotCandidates` 领域命令。该命令接收当前镜头及其
资料、当前分组、被纳入的候选、任务快照和项目帧范围，并一次性返回：

- 排序、去重且连续覆盖 `[0, durationFrames)` 的新镜头；
- 被保留、替换和新建的镜头 ID 清单；
- 已协调的镜头组和需要提示的资料影响；
- 每个新建自动镜头的不可变 provenance；
- 用于撤销和恢复的变更摘要。

只有范围完全相同的旧镜头可以保留原 ID、分析、笔记和截图关联；范围改变时不静默复制
资料。若受影响镜头含分析、笔记、截图或分组，UI 必须先显示影响确认，并在写入前创建
项目恢复快照。项目帧标注不依赖 shot ID，应继续保留。应用成功后 task review 标记为
已应用，但任务后续被重扫覆盖也不能删除正式镜头上的 provenance。

正式镜头来源模型删除旧 `confidence` 语义，至少保存：`source = manual | auto-shot`、
task ID、candidate ID/kind、media identity digest、preset ID/version、Engine version 和
config hash。raw score/threshold/evidence 保留在候选任务中，不复制成概率。

## 8. 标定与发布门槛

### 8.0 实施前置：研究面板与标定工作台

1. 先完成研究型控制面板、Zustand 草稿、任务快照与 `EditorWorkspace` 接入；所有扫描必须
   通过同一个 resolver，并保存 `catalog = research | production`。
2. 随后建立独立的 `scene-calibration` 工作台：加载同一媒体和研究配置的检测结果，允许人工
   接受、拒绝、新增、移动和删除 hard-cut 真值，及标记不确定区域；首版不把 fade 区间混入
   hard-cut 标注。
3. 标定记录绑定强媒体身份、标注 schema、标注者、时间权威（微秒）、当前 Engine/config
   和候选结果。默认导出 JSON，不含视频；外部 AI 如需查看素材，由用户另行选择相同身份的
   本地视频文件。
4. 标定工作台不得调用 `applyAutoShotCandidates`、改写正式 `ShotRecord` 或复用创作型
   `AnnotationMarker`。它的唯一输出是可审核真值和评分输入。

### 8.1 数据集分离与标注质量

- 参数搜索集和留出验收集按完整作品/来源隔离；同一视频、同一作品的不同片段不得跨集。
- 每个专项预设的搜索集至少包含 8 个来源视频和 100 个 hard-cut，留出集至少包含 4 个
  来源视频和 50 个 hard-cut。`general` 使用各类别的组合留出集，至少 12 个来源视频和
  150 个 hard-cut。
- 默认启用 fade 的预设，其留出集还必须至少包含 20 个完整 fade 区间；数量不足时只能
  发布“仅硬切”默认，不能用 hard-cut 数据推断 fade 质量。
- 每个素材记录来源/授权、SHA-256、codec、尺寸、rotation、时长和标注者。至少 20% 的
  标注由第二人复核；分歧必须在进入评分前解决并记录。
- hard-cut 使用精确边界时间/项目帧；fade 保存开始、结束和建议点。模糊转场单独标记，
  不得临时改成 hard-cut 以提高指标。

### 8.2 参数搜索与冻结

1. 以 PySceneDetect 的 Content/Adaptive 区间作为搜索起点，但所有实际输入先转换为
   AisenLens 固定点单位并记录；不复制其最终值。
2. 搜索过程只读取搜索集。确定 detector、权重、minimum content、window 和三档阈值
   后冻结一个候选 preset version，再运行留出集一次。
3. 看到留出集结果后若继续调参，必须提升候选版本并重新建立未被读取的新留出集；不得
   把反复调过的集合继续称为 holdout。
4. 每次报告保存 preset ID/version、Engine version、canonical config、数据集 manifest
   checksum、逐素材指标、聚合指标、命令、机器和浏览器。

### 8.3 首轮生产数值门槛

hard-cut 以 `±2` 项目帧容差评分，首轮门槛冻结如下；Agent 不得为通过验收自行降低：

- `balanced`：Precision `>= 0.80`、Recall `>= 0.75`、F1 `>= 0.77`，matched boundary
  平均偏移 `<= 1` 帧且 p95 `<= 2` 帧。
- `conservative`：Precision `>= max(0.88, balanced Precision)`，阈值不低于 balanced，
  聚合候选数不得高于 balanced。
- `detailed`：Recall `>= max(0.85, balanced Recall)`，阈值不高于 balanced，聚合候选数
  不得低于 balanced，F1 相对 balanced 下降不得超过 `0.08`。
- 专项预设只有在自身留出集上的 balanced F1 至少比 `general` 同档提高 `0.02`，或在
  Precision/Recall 目标上有预先记录的明确优势，才值得成为独立生产选项。
- Fade：区间 Recall `>= 0.75`、建议点落在标注区间比例 `>= 0.80`、额外 fade 误报
  `<= 0.2/分钟`。未达标时该预设默认只能发布“仅硬切”。

任一门槛未通过时隐藏对应专项预设或 fade 默认，不得只修改文案后上线。确需调整门槛时
必须先单独更新本设计、说明产品取舍并取得批准，不能由实施 Agent 在报告中自行决定。

### 8.4 产品与运行时门槛

- 使用真实视频完成开始、显式暂停、继续、取消、刷新中断、修改后重扫、候选排除、
  应用、撤销和项目/媒体切换矩阵。
- Web production build 与 Vercel Preview 必须实际加载 Worker、baseline/SIMD WASM；
  Desktop/Mobile 仍不作为当前 Web 验收门。
- 性能报告分离 decode/copy/preprocess/detect/total，验证内存不随视频时长线性增长，
  不用无环境说明的绝对耗时作为发布承诺。

## 9. 分阶段实施顺序

1. 先关闭 Phase 11：强媒体身份、canonical config hash、刷新/中断语义、React hook 测试、
   候选应用领域命令和镜头 provenance 全部通过。
2. 建立产品设置类型、canonical resolver、摘要器和只供标定使用的 candidate registry；
   此时不创建生产 UI，也不把未标定名称暴露为生产 preset。
3. 建立数据集 manifest、搜索/留出分离检查和批量评分/sweep 工具，完成各类别标定。
4. 只把通过 8.3 门槛的候选配置晋升到 `productionPresetRegistry`，生成带 checksum 的
   promotion report；未通过项继续隐藏。
5. 正式引入 Zustand，建立 feature 设置 store 与 `useAutoShotControl`；扩展 task record、
   review 和 IndexedDB 升级，只清理旧 auto-shot 派生记录。
6. 拆出控制面板和候选审阅组件，删除 `EditorWorkspace` 中旧 sensitivity/min-duration
   状态及线性映射，所有启动路径只调用唯一 resolver。
7. 完成 Web 产品矩阵、Engine 全量测试、production build、Vercel Preview 和旧路径
   零引用审计后，才标记 Phase 12 完成。

第一轮实现不加入 Histogram、Hash、内容自动分类或云端模型，也不把未验证的 stride、
高分辨率分析选项显示给用户。它们必须按独立能力立项。
