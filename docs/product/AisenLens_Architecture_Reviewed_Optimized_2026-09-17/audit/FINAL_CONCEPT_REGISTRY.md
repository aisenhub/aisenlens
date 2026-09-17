# FINAL CONCEPT REGISTRY

本表是最终治理索引；定义仍由各 Source of Truth 文档拥有。Alias 只合并同义语义，不凭名称机械合并不同生命周期实体。

| Concept | Definition | Proposed Owner | Authority | Persistence | Upstream | Downstream | Conflict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project | 项目与持久化工作单元 | project/domain | Project Repository | persistent | Media, Template | Workspaces, Export | resolved / governed |
| Media | 原始媒体资产及其身份 | media | Media Authority | persistent | Project | Shot Detection, Playback | resolved / governed |
| MediaSource | 媒体来源/可重定位句柄 | media | Media Authority | persistent | Project | Media | resolved / governed |
| FrameIndex | 整数帧坐标 | shot/timeline | Time Contract | value | Media | Shot, Timeline, Evidence | resolved / governed |
| MediaTime / PTS | 媒体播放时间与解码时间戳 | media/timeline | Media Time Mapping | derived/value | Media | Playback, VFR mapping | resolved / governed |
| Range | 半开帧区间 [startFrame,endFrame) | shot/timeline | Shot/Timeline Contract | value | FrameIndex | Shot, Evidence, Tracks | resolved / governed |
| DetectionCandidate | 自动分镜候选，不是正式结构 | preparation | Auto-shot Candidate Authority | persistent/task | Media | Boundary Review | resolved / governed |
| Official Shot | 正式镜头结构 | shot-structure | Shot Authority (Preparation) | persistent | Boundary Review | Analysis, Timeline, Results | resolved / governed |
| Shot Boundary | 相邻 Shot 的正式结构边界 | shot-structure | Shot Authority (Preparation) | persistent | Detection/Manual command | Official Shot | resolved / governed |
| Scene | Shot 之上的语义结构层 | timeline/analysis | Analysis Structure Authority | persistent | Official Shot | Sequence/Analysis | resolved / governed |
| Sequence | Scene/Shot 的更高层结构 | timeline/analysis | Analysis Structure Authority | persistent | Scene | Section/Analysis | resolved / governed |
| Section | 宏观结构分段 | timeline/analysis | Analysis Structure Authority | persistent | Sequence | Analysis/Results | resolved / governed |
| Timeline Domain | 时间坐标、结构/track/marker 契约 | timeline | Timeline Contract | domain | Media, Shot, Analysis | Timeline View | resolved / governed |
| Timeline View | 时间轴可视化、viewport、zoom、hover | timeline UI | Workspace/UI Authority | ui | Timeline Domain | User interaction | resolved / governed |
| Marker | 自由观察/定位标记 | timeline | Timeline/Marker Authority | persistent | Timeline | Analysis/Evidence | resolved / governed |
| AnalysisFieldDefinition | 稳定分析字段语义 | analysis-data | Analysis Authority | persistent/versioned | Template registry | AnalysisRecord | resolved / governed |
| AnalysisRecord | 正式分析事实 | analysis-data | Analysis Authority | persistent | Official Shot, FieldDefinition | Results | resolved / governed |
| AnalysisCandidate | AI/建议候选 | analysis-data | Candidate Authority | persistent/review | AI Context | User Review | resolved / governed |
| EvidenceRef | 可回到媒体/结构的数据证据引用 | evidence | Evidence Authority | persistent/value | Media/Shot/Marker | AnalysisRecord/Candidate | resolved / governed |
| Provenance | 值来源与生成/确认历史 | evidence | Provenance Authority | persistent/value | Source/Prompt/Model/User | AnalysisRevision | resolved / governed |
| Revision | 结构或分析变更序号/版本 | domain contracts | Owning Domain | persistent | Command | Stale propagation | resolved / governed |
| Stale | 依赖变化后正式值需复核的资格状态 | analysis-data | Analysis Authority | persistent/state | Shot/Structure Revision | Review/Results eligibility | resolved / governed |
| Template / AnalysisProfile | 分析配置与字段组合 | template | Template Authority | persistent/versioned | FieldDefinition | Inspector/AI/Results | resolved / governed |
| PromptDefinition | AI 任务/输出约束版本 | template/ai | Template + AI Application | versioned | Template | Candidate provenance | resolved / governed |
| ContextDefinition / Context Builder | AI 输入选择规则与构建器 | template/application | AI Application Authority | application | Project/Analysis/Evidence | AI Input | resolved / governed |
| Result Dataset | Confirmed/stale-aware 的消费视图 | results | Results Consumption Authority | derived | AnalysisRecord | Table/Export/Creative | resolved / governed |
| Export | 结果外部化产物 | results/export | Export Authority | derived artifact | Result Dataset | Files/Share | resolved / governed |
| Creative Transformation | 基于正式结果的派生创作物 | results | Creative Artifact Authority | derived artifact | Result Dataset | User output | resolved / governed |
| PlaybackPosition | 当前播放位置 | workspace | Playback/UI Authority | workspace state | Media | Player/Timeline | resolved / governed |
| Selection | 当前用户选中实体 | workspace | Workspace Authority | workspace state | Structure/Marker | Inspector | resolved / governed |
| Viewport | 时间轴视口与缩放 | timeline UI | UI Authority | ui state | Timeline | Renderer | resolved / governed |
| Workspace State | 工作台临时编排状态 | workspace | Workspace Authority | application/ui | Domain | UI | resolved / governed |
| Undo / Redo | 命令历史能力 | application | Command History Authority | application/persistent policy | Commands | Recovery | resolved / governed |
| Command | 请求领域变更的显式操作 | application/domain | Owning Domain | transient | User/Application | Events | resolved / governed |
| History | 可撤销领域操作记录 | application | History Authority | persistent/transaction | Commands | Undo/Redo | resolved / governed |

## Alias / non-alias decisions

- `Shot Range / Frame Range / Clip Range`：只有在指正式 Shot 时间范围时归一到 `Range`；UI clip selection 若只是临时选择不得偷换成 Official Shot。
- `Analysis Result / Confirmed Analysis / Result Record`：若表示正式字段事实，统一归 `AnalysisRecord`；`Result Dataset` 是消费视图，不是同一实体。
- `Detection Candidate` 与 `AnalysisCandidate` 明确不是同一生命周期。
- `Scene / Sequence / Section` 是不同层级实体，不合并为一个 status enum 或万能 Group。
- `stale` 是 AnalysisRecord 的资格/复核状态，不是 AnalysisCandidate 的审核状态。
