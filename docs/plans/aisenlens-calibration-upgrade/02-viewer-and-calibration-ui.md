# C2 — 播放巡视、连续帧带、就地补切与边界精调

前置：C1 草稿/命令契约完成。使用 impeccable 技能，遵循其当前适用流程与项目视觉规范；不因缺少全局设计文档扩展成全站重设计。

## 1. 界面布局

`features/workflow/components/CalibrateView.tsx` 保留工作流组合层，业务视图在 `features/shot-calibration/components/`。建议按实际职责拆分：CalibrationWorkspace、CalibrationNavigator、CalibrationToolbar、BoundaryInspector、BoundaryFramePair、CalibrationTimeline。无需一元素一文件。

桌面布局：

```text
镜头校准    已播放/已复核范围 · 待回看数       保存状态  撤销/重做  完成并应用
-----------------------------------------------------------------------
镜头/待回看导航     视频播放器（视觉主体）         按需展开边界检查器
缩略图+时间         当前镜头编号/当前帧/时间        前镜末帧 | 后镜首帧
持续跟随当前镜头    播放 / 速度 / 回退1秒 / 逐帧    移动一帧 / 删除切点
                   在当前帧切开 / 标记待回看
-----------------------------------------------------------------------
可缩放连续帧带 + 已有切点/待回看标记
草稿镜头轨道 + 播放头
全片范围导航 + 巡视覆盖
```

默认右侧检查器收起，保证巡视画面；选择切点才展开。取消选择回到巡视，不重置播放位置/缩放。窄屏将导航和检查器改为面板或 Tabs，但播放器和核心补切按钮始终可达。建议验证 1440×900、1280×720、768×1024、390×844；这只表示 Web 响应式，不增加原生平台交付。

主按钮：“在当前帧切开”；辅助：“标记待回看”。已有边界选中时展示“前移一帧 / 后移一帧 / 移动到当前帧 / 删除此切点”。不要同时堆出几十个编辑按钮；删除按钮注明“合并前后镜头”。

## 2. 组件与能力复用清单

路径均在 `apps/web/src/`：

| 现有文件 | 本次接入要求 |
| --- | --- |
| `components/ui/{button,tooltip,tabs,dialog,...}.tsx` | 先检查实际 API；现有为 Base UI 风格，不假定 Radix asChild |
| `features/editor/components/VideoPreviewCanvas.tsx` | 复用视频展示和主题能力；必要时抽取轻量共享 props，避免传大量伪造分析参数 |
| `features/editor/components/VideoPlaybackControls.tsx` | 复用播放控件，按需扩展逐帧/回退；不复制一份控件 |
| `features/editor/hooks/useVideoPlayback.ts` | 沿用唯一交互播放时钟；精确帧读取与播放状态协调 |
| `features/video/components/FrameThumbnailStrip.tsx` | 扩展镜头内部连续帧带，支持外部选定帧/可视范围/密度 |
| `features/video/{hooks/useFrameThumbnailQueue,services/frameThumbnailService}.ts` | 共用请求队列、缓存和 decoder 生命周期 |
| `features/timeline/{hooks/useTimelineViewport,components/TimelinePlayheadHandle}.tsx/ts` | 实际核对扩展名；复用缩放/平移/播放头，检查 EditorTimeline 与 AnalysisTimeline 最适合的组合入口 |
| `features/editor/shortcuts/{definitions,useEditorShortcuts}.ts` | 统一按当前 surface 路由校准命令 |

工作区只有一个可播放 video 实例/时钟。边界证据允许独立离线 decoder，不能放两个会同步播放的 video 充当双画面。路由卸载重挂若不可避免，应恢复时间/速度/静音且避免事件绑定失效，不在每次选镜头时 remount 播放器。

## 3. 连续巡视流程

默认 1×，提供 0.5×、1×、1.25×、1.5×、2×，最终与现有控件支持范围统一。用户自行选择，不宣称倍速能保证发现全部切点。

播放时显示播放头所在草稿镜头，边界处编号自然变化；不每镜自动暂停。点击镜头项定位到该镜头起点；“播放此镜头”是独立明确动作，避免所有定位都自动播放。视窗跟随只在跟随开关启用或播放头离开视野时触发，用户平移后提供“跟随播放头”恢复入口。

补切完整动作：暂停 → 可回退 1 秒 → 相邻帧定位 → 补切 → 新切点高亮 → 用户继续播放。补切后默认保持暂停；提供一键“回放切点”，默认前后各约 1 秒并受媒体边界限制。不要补切后自动跳下一镜或默认播放，避免抢用户控制。

点击“在当前帧切开”时捕获确认可见的帧身份；若正在 seek/解码则禁用并显示“正在定位帧”，不使用旧 currentTime。操作成功后保持当前帧，刷新局部镜头导航并支持撤销。

待回看默认当前帧点标记，支持展开备注；需要区间时通过明确 in/out 或拖选编辑，不暗中固定成“未来1秒”。

## 4. 帧精度门槛（必须实测）

建立/复用唯一 `frame ↔ media timestamp` 服务，供补切、边界证据、帧带定位共同使用。已有 CanvasSink(frame/fps) 仅是实现事实，不等于已证明精确。

1. 先核实锁定版本 Mediabunny 类型与现有 SceneTimePoint、媒体 frame count 来源。
2. CFR 含 24000/1001、30000/1001 使用统一有理时间基准/可靠映射，禁止各组件独自 Math.round 导致差一帧。
3. 以已解码样本的实际 presentation timestamp 验证帧身份，精调对照帧使用 B-1 和 B。边界为 0/totalFrames 不请求不存在的帧。
4. VFR 若既有项目时间基准不能一致表示，记录能力限制并阻止精确修改；不得拿平均 fps 伪装支持，也不要为此顺带重写全项目时间模型。能够沿现有能力建立正确映射的，则纳入验证；没有可靠支持是明确未交付项。
5. 快速连续请求采用 generation/token，旧响应释放资源后丢弃；错误不沿用上一切点画面且换标签。
6. frame pair 解码失败显示具体失败及重试，精调提交禁用；普通播放可继续。

大画面若使用离线精确帧覆盖暂停 video，必须保证覆盖帧标签与提交源一致；恢复播放时先清除覆盖并定位相应 PTS。requestVideoFrameCallback 用于确认已呈现时间，不当作无遗漏 frame index 计数器。

## 5. 帧带与边界面板

帧带按可视宽度和 pixelsPerSecond 采样，缩小显示概览，放大到边界附近显示逐帧；明确区分抽样视图与逐帧视图。不能固定每镜1张或只显示首尾。点击图像定位对应真实帧；稀疏抽样不能标称全片逐帧复核。

边界面板：前镜最后一帧 / 后镜第一帧，帧号和时间码清楚；“前移一帧”让 B 减1，“后移一帧”让 B 加1，两个画面同步变化。拖动边界只更新 preview，松开一次提交；取消不产生历史。

fade 显示真实 transitionRange 与切分位置；保留转场来源和范围，用户只编辑其代表切分点，第一期不提供无数据支撑的转场范围识别。tail 是结束区间，不生成影片末尾虚假切点。

普通页面隐藏 score/threshold/微秒内部字段，仅“检测详情”展开真实数据；不用概率徽章。删除切点以相邻合并的真实预览说明，废弃候选保留/排除 checkbox 作为新编辑路径。

## 6. 快捷键

复用既有映射：当前 `shot.splitAtPlayhead` 为 Enter；校准 surface 内路由到草稿 SplitAtFrame，其他 surface 保持正式编辑器行为。Space 播放暂停、Ctrl/Cmd+Z 撤销、既有重做映射保持；逐帧优先复用既有配置，新增前检查冲突。

Escape 取消边界拖动/关闭检查器；输入框、文本区、contenteditable 和 Dialog 中不触发视频切分或删除。界面按钮显示有效快捷键，快捷键帮助同步更新。只允许一个 active surface 接收按键，不能同时改变草稿和正式镜头。

## 7. 性能与验收

镜头列表只渲染可见项，先利用现有能力；无必要不新增虚拟列表依赖。decoder 每媒体会话复用，禁止每张缩略图重新 fetch blob/Input。请求只覆盖视窗及有界预取（建议一屏），缓存有界并释放对象URL/Canvas资源。

测试 1,000 与 3,000 镜头结构，媒体可用短素材及独立压力数据集；压力数据不可流入生产空态。记录机器、浏览器、缓存状态、初次取帧/热缓存定位延迟与内存。连续往返平移 20 次后 decoder 数量、未释放 URL 和内存不得无界增长。无需承诺跨设备固定解码毫秒数，但必须记录阻塞交互问题。

C2 完成门槛：一个人工植入漏切可在本页补上；边界准确移动1帧；删除/撤销一致；没有重复播放器；深浅主题/键盘/窄屏可完成同一核心流程。每次组件修改按项目要求运行 `corepack pnpm build`，阶段收尾运行 typecheck 与相关浏览器用例。
