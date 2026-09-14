# O4 — 统一深拆、双模式研究与真实证据

状态：已交付。前置：O2已交付，默认O3后实施；统一深拆、研究范围、证据与声音工作流已实现。必读O1/O2契约与架构§8–11。

## 1. 页面组成与复用

修改 AnalyzeWorkspace、ContextInspector、ShotInspector、SceneInspector、ShotBrowserView及SoundWorkspace。复用EditorWorkspace原有FrameCapture、ShotScreenshotGallery、AnalysisFieldInput/DimensionCard、ShotList搜索筛选、VideoViewer与EditorTimeline。首版不做新的富文本或音频引擎。

建议新增 `SceneShotStrip`、`RangeInspector`、`ResearchModeControl`、`EvidenceReferences`、范围记录编辑器（按实际职责合并文件）。源码路径以O0核对结果为准；原计划列出而不存在的文件均是待新增。

Scenes/Shots/Sound保持现有导航值以表达不同视角，改为同一Workspace中的导航/Inspector侧重点，不作为旧模式兼容入口。旧Scenes里的独立布局组合退出，成熟工具保留到新对应位置。

## 2. 逐镜顺序流程

默认范围full-film，队列由真实Shot排序和已有过滤器派生。左侧全片列表，中央稳定Viewer，右侧当前显式Shot。上一镜/下一镜/保存并下一镜沿当前队列，显示“筛选结果X/Y”与全片镜号。

保存并下一镜：await目标flush成功→定位下一队列ID→暂停供观察；失败停留，IME输入中不触发。自动保存成功后普通下一镜仍需核对无未提交变化。队列末尾显示已到末项，可返回总览，不自动标全片研究完成。

连续播放与逐镜停止是可选播放策略，默认不每镜自动完成研究；播放头经过下一镜不覆盖正在编辑的target。显式“跟随播放”按O2执行。

选择连续范围进入范围研究时保存sequential返回快照。临时筛选中的非连续Shot不能直接伪装连续范围：提供实际起止并说明包含中间镜头，或让用户重新选区。

## 3. 范围研究流程

scope可为Group或任意媒体区间，无Scene也可进入。上方显示范围名称/时间及返回入口；底部只强调范围相交镜头，前后上下文可展开。

用户可不填问题直接观看；输入问题/总结或添加证据时保存O1身份与内容。选Shot只改变target不改变scope；选“范围总结”切target回范围/Group。从范围外上下文定位时标“范围外”，不悄悄扩展研究范围。

“返回逐镜记录”恢复此前队列/筛选/target/滚动，“返回总览”恢复总览视窗。原目标消失按O5处理，不能用旧index冒充恢复。

## 4. Inspector与字段归属

按target.kind明确路由：

- Shot：真实首尾/代表图/截图、原模板所有字段、description观察、notes解释、研究问题/证据/明确状态。
- Group：title/kind/范围/summary及问题/证据/状态；Objective/Conflict等仅写作提示，不制造多个绑定summary的输入框。
- Range：observation/interpretation/summary、question、证据和状态。
- 证据对象：定位/原来源/状态和对应已有编辑操作，不因播放自动换target。

证据→观察→解释在同一Inspector内渐进展示，用户可快速记一句，不强制全填。保留全部自定义字段类型、值、选项和报告语义，不通过英文/中文字段标签猜分类。

显示填写情况和研究状态为不同指标；完成按钮由用户明确操作，边界改变后的needsReview提示可见。播放次数、字段百分比都不自动标完成。

## 5. 前后镜与取证

使用稳定ShotID和O0PTS映射取前末/当前代表/后首画面；点击定位对应帧，不让离线解码移动播放头。可引用已有截图或捕获新截图，保持原截图服务和持久Blob。

缓存按媒体/源帧身份，旧请求generation失效后释放；缺截图时保留正文并局部错误/重试。原截图加载不再限Scenes tab，按可见对象/取证需求加载。

跨镜解释可以添加多个EvidenceRef或创建相应时间范围记录，不重复复制各镜笔记。

## 6. 人工声音研究（本期必需）

Sound视角保留Viewer和镜头轨，复用波形与已有音轨预览；音轨导入/排序/裁切放辅助面板。没有额外音轨时仍能研究原视频声音。

选择声画时间范围→“记录声音观察”创建/打开O1范围记录→引用主视频范围或真实音频来源→写听到什么及与画面关系。无需ASR、声音分离或新Marker类别。

音轨静音/solo若既有能力可复用则接入；未存在不假造分离Music/SFX轨道，也不为此新增混音引擎。示例内容仅用于测试，不入生产空态。音频源变动后的证据解析在O5验证。

## 7. 验收/交接/GitHub

必测：已分组Shot仍可写；播放到下一镜原草稿不串写；完整模板字段可读写；保存失败/冲突停留；顺序→范围→顺序恢复；筛选队列边界；无Scene；范围外上下文；保存问题/总结后刷新恢复；原视频声音范围笔记及引用可回放；取帧失败不显示其他对象旧画面。

执行typecheck、O4用例、已有shot-inspector/learning相关测试与build；真实浏览器验证输入/IME/快捷键。交接所有target编辑命令、引用类型、队列返回格式。**验收通过提交并push O4和记录，之后进入O5。**
