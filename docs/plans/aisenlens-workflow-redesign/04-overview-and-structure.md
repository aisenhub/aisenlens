# P04 — Overview、Film Map 与结构

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`fb3ebc2`。当前Group规则是至少两个连续镜头、所有kind不可重叠，没有parentId。

## Scope

基于真实shots/groups/markers/可用waveform建立全片地图和节奏事实；提供按scene/section/sequence分类的手工结构管理及SceneBoard。修复现有Group summary输入。提供Overview→Scene→Shot定位。

## Non-goals

不改Group Domain，不创建严格树、不允许单镜Scene、不允许跨类型重叠；不推断人物/场景/故事段落/情绪/正反打/音桥；不重写Timeline或安装图表依赖。

## Current Files

- `apps/web/src/features/group/{types.ts,services/groupService.ts,services/reconcileShotGroups.ts,components/ShotGroupPanel.tsx,components/ShotGroupInspector.tsx}`
- `apps/web/src/features/editor/components/{EditorTimeline,ShotList}.tsx`
- `apps/web/src/features/timeline/hooks/{useTimelineViewport,useTimelineTrackPreferences}.ts`、`components/{TimelineRuler,TimelineTrack,TimelineTrackHeader}.tsx`
- `apps/web/src/features/annotation/{types.ts,services/annotationService.ts}`
- `apps/web/src/features/video/components/{AudioWaveform,FrameThumbnailStrip}.tsx`、`services/frameThumbnailService.ts`
- `apps/web/src/features/shot/types.ts`、`features/project/services/screenshotService.ts`
- P02项目session与P03workflow页面（都在apps/web/src/features）。

## New Files

- `apps/web/src/features/overview/components/{OverviewView,FilmMap,StructureView,FilmFacts}.tsx`
- `apps/web/src/features/overview/services/deriveFilmOverview.ts`：纯函数，无网络/DB。
- `apps/web/src/features/group/components/SceneBoard.tsx`、`hooks/useSceneNavigation.ts`
- `tests/features/workflow/{film-overview.test.ts,structure.browser.test.js}`

## Data Changes

无DB/schema。统计、分带、排序、Scene封面均派生，不写Project。所有kind互斥，不因“不同轨道”绕过occupied校验。没有Scene的Shot组成UI-only“未归场景”入口，不保存虚假group。

明确统计：duration=(endFrame-startFrame)/实际fps；均值/中位数/极值基于正式shots；零shots显示“尚未建立镜头”，不显示0秒均值。切点密度使用正式shot起点（排除影片起点），固定10秒窗口、末尾不足窗口以真实窗口时长换算cuts/min；显示计算定义。fps未知不假装24fps已确认，时间指标显示不可用原因，帧范围仍可读。

## Component Changes

1. Overview消费Session最新草稿的稳定selector，不从DB重新读取旧shots。FilmFacts仅在区间/group/marker变动时计算，不依赖currentTime。
2. FilmMap用现有TimelineRuler/Track/坐标hook组合为只读投影：Sequence/Section/Scene分类带、Shots密度、Marker、可用波形。不要挂第二个完整EditorTimeline；点击位置通过共享selection/seek命令导航。
3. StructureView复用ShotGroupPanel创建/调整/删除；类别中文明确为场景/段落/序列。说明当前不支持嵌套，不提供拖入父节点操作。
4. 修复ShotGroupInspector摘要onChange为`summary: event.target.value`，并通过现有update command/history/dirty保存，保留title/kind。不能只改textarea局部值绕过Session。
5. SceneBoard只过滤kind=scene，按首镜order排序，真实代表图优先已有截图，没有图就占位并可按需取帧；不预抓全片。标题/summary是人工文本，没有文本不自动编造。
6. 选择Scene将groupId和成员上下文传入Analyze；P05前可定位现有Analyze首镜并打开GroupInspector。连续2镜约束失败/重叠失败显示具体原因，不静默丢弃。

## User Flow

完成Apply或已有正式shots → Overview看到时长/切点密度/标记 → Structure多选连续镜头创建Scene并写摘要 → 返回地图 → 点击Scene进入Analyze → 返回Overview保留选中场景与地图位置。无Scene时提供手动建立场景和浏览全部镜头两个真实动作。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | 无shots去Prepare或手工处理；有shots无Scene提示手动建立 |
| Loading | 项目加载与缩略图加载分离，布局不跳动 |
| Ready | 真实统计、场景数量和Marker，人工结构标Manual |
| Disabled | 不连续/单镜/重叠不能创建，fps未知不能生成秒级统计 |
| Error | 摘要保存失败留内容，缩略图失败可重试，不阻断文字结构 |
| Coming Soon | 自动Scene/严格层级/情绪曲线仅局部说明，无假轨道 |
| Experimental | 本轮Overview不提供实验推断；不伪造该状态 |

## Theme Requirements

引用 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§7–9、13–14、18–22、25–31，应用impeccable的“总览低密、深拆高密”层级。Overview留更多横向与纵向空间；Scene统一16:9缩略图，不做Pinterest。Cinema深灰，Studio冷灰；统计数字mono，Scene低饱和结构色，当前选择蓝色，Marker附名称，不使用情绪渐变。4/8/12/16/24间距、1px分隔、面板小圆角，无大阴影。

390宽度FilmMap允许横向滚动并提供列表替代；统计换行、Scene单列；键盘可选Scene、定位Marker。不可用数据不能用浅灰到看不见的假零值。

## Migration

只以Group.kind语义重编排，不复制新Scene实体。原Group入口迁到Structure后删除旧一级入口；SceneInspector与旧GroupInspector暂复用，P05再改信息层级。旧字段/ID/notes/template不变；按kind分带保留轨道总的偏好，不重置用户当前Timeline设置。

## Acceptance Criteria

- [ ] 所有数量/时长/密度来自正式真实数据，排除候选不算正式镜头。
- [ ] 零镜头/单镜/fps未知/短于一个窗口的素材显示正确，无NaN/Infinity。
- [ ] scene/section/sequence可以分类查看，但创建仍遵守跨类型互斥。
- [ ] summary输入→立即切页→save→reload成功；Undo行为与原命令一致。
- [ ] 无父子数据不显示嵌套，未归场景入口不写DB。
- [ ] 删除/分割/合并后图表与selection及时reconcile，失效选择有说明。
- [ ] Scene/Marker点击进入正确上下文，返回不丢地图视口；没有第二个播放器/全量取帧。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:editor-history`、`corepack pnpm test:retain-shot-map`、`corepack pnpm build`。新增纯统计测试以3个已知半开区间核对均值/中位数/10秒窗口；测试零值/fps未知/排序与marker边界。Group测试覆盖2连续成功、1个失败、不连续失败、跨kind重叠失败、摘要保存回读；browser验证真实Session写入而不是只匹配HTML。

## Manual QA

1. 空项目/仅shots/有完整groups分别打开Overview。
2. 创建两个连续镜头Scene、录入中文摘要、切页并reload；再尝试单镜/跨kind重叠。
3. 点击Scene和转折marker，检查时间码/Inspector/返回位置。
4. 两小时2,000镜测试副本加载，拖地图和播放时看Profiler；四尺寸双主题检查图例和焦点。

## Regression Checklist

R05/R06/R07/R08/R09/R11/R14/R16；不改变candidate、Overlay、Audio、Export数据。Shot数据变化后统计应更新，播放时不重新统计。

## Completion Gate

统计确定性、Group约束和摘要roundtrip验证通过，缺失能力全部真实标注后进P05。严格层级的Decision Required为后续Domain，不阻塞本限定版本。

## Rollback

派生视图与summary修复分开提交；回退视图不需改DB，可独立保留摘要修复。不得删除已由用户手工建立的groups，数据仍能在阶段前代码打开。
