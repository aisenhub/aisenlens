# P05 — Analyze、Scene / Shot Inspector 与 Sound

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`723d80b`。复用Scene/Shot/Timeline/截图/音频/模板现有能力，按用户理解过程重排。

## Scope

Analyze建立Scenes/Shots/Sound三个子视图；ShotList升级按需全片Browser，增加Scene内Strip；Inspector按Evidence/Facts/Interpretation/Learning组织。Overlay移Viewer Tools，Marker移Timeline Tool，Sound复用已有音频与波形。

## Non-goals

不新建Scene Domain、Pattern Domain、Learning字段或AI分析；不重写Timeline/解码/音频引擎；不为每个子视图创建播放器。不能将自定义字段/用户笔记当作机器事实。

## Current Files

- `apps/web/src/features/editor/components/{EditorWorkspace,ShotList,VideoPreviewCanvas,VideoPlaybackControls,EditorTimeline,FrameCapture,AnalysisFieldInput,AnalysisDimensionCard}.tsx`
- `apps/web/src/features/editor/constants/editorData.ts`、`shortcuts/{definitions,useEditorShortcuts}.ts`
- `apps/web/src/features/shot/{types.ts,services/shotSearchService.ts,components/ShotScreenshotGallery.tsx}`
- `apps/web/src/features/template/{types.ts,services/templateValidation.ts,components/TemplateEditorModal.tsx}`
- `apps/web/src/features/group/components/ShotGroupInspector.tsx`及P04 `SceneBoard.tsx`
- `apps/web/src/features/project/services/screenshotService.ts`、`features/video/services/{frameThumbnailService,videoOverlayCanvasRenderer}.ts`
- `apps/web/src/features/composition-overlay/`、`features/content-overlay/`：现有types/components/renderer。
- `apps/web/src/features/annotation/components/AnnotationMarkerPanel.tsx`
- `apps/web/src/features/media/components/{AudioTrackPanel,AudioTimelineTrack}.tsx`、`hooks/useMultiTrackAudioPreview.ts`、`services/{audioTrackProjectService,audioMixService}.ts`
- `apps/web/src/features/export/components/{ReportExportDialog,VideoExportDialog}.tsx`、`services/{reportExportService,videoExportService,videoExportBoundary}.ts`

## New Files

- `apps/web/src/features/analysis/components/{AnalyzeWorkspace,ContextInspector,ShotInspector,SceneInspector,InspectorSection}.tsx`
- `apps/web/src/features/analysis/services/shotInspectorViewModel.ts`
- `apps/web/src/features/shot/components/{ShotBrowserView,SceneShotStrip}.tsx`
- `apps/web/src/features/video/components/{VideoViewer,ViewerTools}.tsx`
- `apps/web/src/features/timeline/components/AnalysisTimeline.tsx`：薄组合层，仍调用EditorTimeline。
- `apps/web/src/features/media/components/SoundWorkspace.tsx`
- `tests/features/workflow/{shot-inspector.test.ts,analyze.browser.test.js,sound.browser.test.js}`

## Data Changes

无schema/persistence变化。ShotInspectorViewModel只整理现有数据：

| 区域 | 真实来源 | 写回 |
|---|---|---|
| Evidence | first/last/primaryScreenshotId、screenshotIds、合法帧范围、detection来源 | 截图仍用既有service与Session action |
| Facts | 帧数/时长；description标“画面描述·用户记录”；已知技术字段标“用户标注” | description→shotNotes.content；analysisFields→shotDims，保持值类型 |
| 未分类模板字段 | 自定义field.id/kind/value | 保留全部现有字段，不按名称推测语义，不强改模板 |
| Interpretation | ShotRecord.notes，用户自己的分析 | notes→shotNotes.analysis |
| Learning | 方法能力说明、回Learn、来源对象 | 无可编辑新字段；保存为技法为Coming Soon |

Group只有title/kind/summary/shotIds：SceneInspector显示真实范围/成员/摘要。Objective/Conflict/Turning Point不能各自绑定同一个summary输入，避免假装分字段保存；它们至多是摘要旁的写作提示。

Selection采用shotId/groupId，activeShotIndex仅适配旧组件；不要用显示序号作为持久ID。SceneShotStrip只呈现真实Scene成员；无Scene可在Shots浏览全片，不创建合成group。

## Component Changes

1. Analyze默认Scenes：有Scene显示Board，无Scene给手工建立/全部镜头入口；Shots打开宽版ShotBrowserView；Sound打开音轨/波形工作区。
2. 从ShotList抽出可复用列表内容/动作或扩展className/layout，复用shotSearchService和现有筛选。完整Browser不是复制同一份JSX，旧永久窄列表随后移除。SceneStrip只做定位/前后导航，不混入全片管理表单。
3. ContextInspector按显式selected对象渲染；播放状态独立，用户输入时禁止自动跳镜。提供用户控制的“跟随播放”，发生编辑则暂停跟随，避免字段内容跨镜写错。
4. ShotInspector按四个Section顺序显示，默认只读值、点击编辑；复用AnalysisFieldInput的single/multi/text/number/boolean。Enter提交、Escape撤销当前草稿、失焦/切对象提交；中文composition期间Enter不能误提交。保存错误留草稿。
5. Evidence复用FrameCapture/Gallery；首尾帧取真帧、构图截图标记Included，不把content overlay说成OCR。只加载当前对象/可见strip图，URL释放不删除持久Blob。
6. VideoViewer复用原Canvas/Controls并保持稳定挂载。ViewerTools承载CompositionOverlayPanel/ContentOverlayPanel/zoom/fit/fullscreen等，原绘图键盘和选中shape继续工作。
7. AnalysisTimeline薄包装原EditorTimeline，保留viewport/轨道偏好/I-O/drag与seek。Marker面板从一级工具入口移到Timeline工具。正式镜头边界命令仍来自同一Session。
8. SoundWorkspace调用现有AudioTrackPanel和AudioTimelineTrack，多轨preview仍只有一个runtime；导入音轨可标Manual，不默认称“已提取Music”。Dialogue/SFX/Ambience识别轨只在菜单提供禁用项和原因，不能创建假的空clips或假波形。
9. 导出继续Topbar：导出前flush最新草稿，报告/视频取同一字段与截图解析。不能因为UI分层改变既有报告列、原始notes或overlay渲染语义。

## User Flow

Overview点Scene → 看Scene摘要和成员Strip → 点Shot → Evidence核对首尾帧/代表图 → Facts查看或编辑 → 写自己的Interpretation → 到Learn回看。需要找全片某镜时去Shots搜索，选择后回到对象Inspector；需要听声音时去Sound手工处理音轨。场内跳转保持Scene上下文，返回全片恢复过滤/滚动。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | 无Scene/无Shot/无截图/无音轨分别说明，提供各自真实下一步 |
| Loading | 当前证据帧局部loading，不遮挡已有文本；Sound波形独立加载 |
| Ready | 真数据+明确人工来源；事实与解释分Section |
| Disabled | 无媒体不可新截图/播放；未选对象不能编辑；未实现保存技法禁用 |
| Error | 取帧/音频/写入错误独立重试，不清除旧证据或笔记 |
| Coming Soon | Dialogue/SFX/方法保存，解释何时可用的依赖，不给时间承诺 |
| Experimental | 保留真实Advanced研究入口；不把未实现声音检测标Experimental |

## Theme Requirements

引用 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§10–12、16–27、30–32、35；使用impeccable复核任务焦点和认知负荷。SceneBoard较松，深入Shot后Viewer为中心、Inspector约336px、Timeline信息密。Cinema深中性，Studio冷灰+深Viewer；结构低饱和、selection蓝、playhead红。Inspector用Section+Divider，无四张大Card；时间码mono，正文12–13px。

≥1280常驻Inspector；较窄时按需打开同一Inspector内容；≤767复用Dialog或单列模式，不复制另一套表单。每个图标按钮有label，keyboard选Strip、切镜、关闭面板返回焦点；重要信息不只靠颜色。

## Migration

各功能迁好立即删旧入口，避免同一Overlay或Marker出现在两个一级位置。EditorWorkspace剩余仅组合，不移入App。保留现有模板/notes/截图数据；未分类字段不得丢失。旧报告格式不因四层UI自动新增/删列。P02媒体runtime为唯一播放owner。

## Acceptance Criteria

- [ ] ShotBrowser搜索/原筛选/多选/播放/删除/分割可用；默认不常驻窄列表。
- [ ] SceneStrip成员正确，selection不因索引变化写错镜头，输入不被播放抢走。
- [ ] 每种模板字段/description/notes可编辑保存并reload，未知自定义字段保留。
- [ ] Evidence首尾/代表图/图库/构图标识无损；禁用学习保存不会假成功。
- [ ] Split/Merge/边界、I/O、track偏好、Marker均走原命令。
- [ ] Sound导入/未来片段/倍速/暂停/seek/mute/gain/fade正确，缺语义轨明确未开放。
- [ ] Overlay预览与报告/视频导出内容一致，不因主题改像素内容。
- [ ] 长片切镜/过滤/取帧/主题变更无重复媒体或大范围重渲染。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:editor-history`、`corepack pnpm test:retain-shot-map`、`corepack pnpm --filter @aisenlens/web test:video-export-boundary`、`corepack pnpm build`。复用`apps/web/test/video-export.browser.test.js`进行可编码环境下导出；超时需记录与修复，不声称通过。

新增Inspector映射/值类型/未知字段保留测试、中文IME切对象行为、播放中选择不改变编辑目标、只读Learning无写入；browser验证截图与overlay和真实音轨调度。不要仅测试新增类名或ViewModel输出与自身实现同构的快照。

## Manual QA

1. 在Scene内填写Shot notes，边播放边编辑，再切对象/后退/reload核对。
2. 搜索全片镜头、清筛选、多选建Scene、播放单镜；截图首尾和构图证据，换代表图。
3. Timeline缩放/拖动/I-O、改边界/撤销，Marker新增/编辑/定位。
4. Sound中让一个片段晚于当前时间开始，检查正常播放与2倍速、暂停、seek后没有迟到声。
5. 报告/视频导出逐帧检查尾界和overlay；四尺寸双主题检查Inspector/ViewerTools/弹层焦点。

## Regression Checklist

R05–R14/R16，尤其analysisFields、notes、screenshots、markers、groups、template和audioTracks不能因搬UI丢失。原AutoShot/Prepare/Calibrate仍可往返。

## Completion Gate

对象编辑roundtrip、媒体资源生命周期、核心Timeline/Audio/Export回归通过才能进P06。不能保留旧永久ShotList/旧Inspector作为未修完的新实现的常规回退。

## Rollback

ViewerTools、Browser/Strip、Inspector、Sound分别形成可验证提交，回退按依赖逆序；无DB变更。用户在新布局写的字段由旧布局仍能读取，不能删除新写内容。
