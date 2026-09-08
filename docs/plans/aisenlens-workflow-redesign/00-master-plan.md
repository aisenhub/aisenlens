# AisenLens Workflow 重构 Master Plan

状态：规划完成，尚未实施。本文件是唯一总计划。2026-09-08，审计基线 main `bb93a017e350ea6750552a041811a24146782f38`。只交付文档，不修改生产代码。用户明确排除正在删除的 Lensflow 预览；不以预览或其 PRODUCT.md 描述作为正式实现事实。

## 研究顺序记录（设计前提）

已先复核公共方案，再提出 AisenLens 初案，随后检查 OpenReel → OpenCut 相关文件。

初案：复用 React Router 的 search params 表达工作阶段，保留 `/app` 路径；复用 Zustand 的项目作用域 store 承载跨页编辑状态；沿用当前媒体、候选 review/apply、Group、Timeline、保存事务。Overview 只派生真实时间/分组事实；Learn 首轮仅汇集真实笔记并保留未开放方法库入口；不新增分析算法或持久化 Domain。

公共依据：[React Router useSearchParams](https://reactrouter.com/api/hooks/useSearchParams)、[Zustand createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store)、[WAI Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)、[wavesurfer Regions](https://wavesurfer.xyz/docs/modules/plugins_regions)。前两项覆盖已有技术栈内的导航与状态边界；Splitter 提供键盘分隔栏语义；wavesurfer 只说明成熟波形区间交互模式，不提供语音识别，本项目已有波形与多轨，初案不安装它。

### 资料权威与适用范围

完整综合以下资料，均位于 `docs/lensflow/`：

| 资料 | 本计划采纳 | 按真实代码收窄 |
|---|---|---|
| 拉片产品与开源生态调研报告.md | 全局到局部、证据可追溯、理解转为方法 | ASR/OCR/Scene AI 不因调研列出就进入本轮实现；行业效率数字不是产品承诺 |
| AI拉片平台_产品信息架构_页面流转_UI_Wireframe.md | Prepare → Calibrate → Overview → Analyze → Learn → Create；Film/Scene/Shot 定位 | 示例影片、人物、台词、情绪、完成率均不可作为真实数据；不建立满屏未来一级菜单 |
| AisenLens_拉片流程与UI重构建议.md | 重编排现有功能、独立校准、按需 Shot Browser | Group 禁止跨类型重叠；summary 问题仍在；appliedAt 不等于每项人工确认 |
| AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md | Cinema / Studio、深色 Viewer、Split View、四层 Inspector | 色值为起点；正文对比度优先于照抄 faint 色值；System 当前尚未实现 |

采用项目 `impeccable` 的 shape / Operate 设计方法：明确用户任务、首屏焦点、状态与验证。用户已给出完整方向并要求完成规划，按指定视觉规范收敛，不进行额外风格竞赛，不生成生产 UI 或改写设计上下文文件。

工作区差异单独记录：审计末尾未提交的EditorWorkspace改动已把快捷键/开发者入口移入设置辅助工具。上表及架构事实以main为基线，但实施时必须保留这一已前移的整理成果，不能为执行迁移表而把入口搬回一级栏。用户删除的预览与本规划无依赖。

公共方案研究后的本地参考顺序及结论：

1. OpenReel：`reference-projects/opensource-openreel/openreel-video-main/apps/web/src/components/editor/EditorInterface.tsx`、`InspectorPanel.tsx`、`apps/web/src/stores/project/marker-slice.ts`。确认 Viewer/Timeline/Inspector 分区、项目/UI/引擎职责分离、标记由 action 更新。采纳生命周期独立于面板与对象 Inspector；不复制 AI Chat、云分析或多轨剪辑产品结构。
2. OpenCut：`reference-projects/opensource-opencut/opencut-classic-main/apps/web/src/components/editor/scenes-view.tsx`、`core/managers/scenes-manager.ts`、`timeline/hooks/use-timeline-zoom.ts`。确认场景视图调用 manager/command，缩放由 controller 管理。其 scene 是编辑序列，不等于本产品的叙事场景；只采纳视图/命令分离、定位/缩放状态边界，不复制 Scene Domain。
3. 最终决定维持初案。Shell/校准/结构/深拆/Sound 的新视图均基于上述相关模式；Learn 仅聚合本项目已有笔记，不引入知识 Domain。正式 Pattern、ASR 等后续模块须另走公共方案 → AisenLens 提案 → OpenReel → OpenCut 研究顺序。

## 1. Executive Summary

当前核心问题是丰富能力挤在同一个编辑器，缺少“先确认结构，再理解局部”的工作阶段。用户同时面对素材、检测、列表、表单、绘图和开发者工具；主界面强调字段填写，缺少全片结构和证据到解释的清晰关系。

目标是一个本地影视理解工作台：准备真实素材，复核机器提出的区间，观察全片节奏，手工建立场景，在 Scene 上下文中分析 Shot，最后回看笔记并为方法沉淀建立入口。工作流允许返回、跳过、重跑，不以虚假完成率强迫线性通关。

本轮改变入口、状态归属、上下文导航和分析信息层级，视觉系统从第一阶段约束全部页面。AisenShot 和时间线能力作为已有资产继续使用。正式数据格式保持不变，跨页编辑采用单一会话与保存协调，避免把 UI 搬出后造成数据丢失。

## 2. Current-State Architecture

下表路径相对 `apps/web/src/`。事实来自源代码静态审计；没有在用户本地项目上执行破坏性验证，也没有把既有审计的运行结果当作本轮测试通过。

| 区域 | 文件与当前职责 | 判定 |
|---|---|---|
| Pages / Router | `main.tsx`、`app/App.tsx`、`app/AppPages.tsx`；BrowserRouter，数字 page 映射 `/projects`、`/app` 等；activeProjectId 经 sessionStorage 在 reload 恢复 | 已有路由/懒加载；没有 Workflow 路由；App 已抽出 session hook，不需要从零架构迁移 |
| ProjectLibrary | `pages/ProjectsPage.tsx`、`features/project/components/ProjectLibrary.tsx`；新建空项目/附视频、搜索、文件夹、备份、恢复、存储管理 | 已有，进度主要是数量，不是真实 Workflow 进度 |
| Media Gate | `features/project/components/ProjectMediaGate.tsx`、`services/mediaService.ts`；授权、素材指纹、重关联、对象 URL；unlinked 可进入空编辑器，missing/needs-permission 阻断子树 | 已有；缺媒体时查看已保存分析需调整 Gate 呈现，不是重做媒体服务 |
| Workspace | `pages/EditorPage.tsx` 包裹 Gate，按 project.id 挂载 `features/editor/components/EditorWorkspace.tsx` | 约 3,700 行；大量 state、命令、截图/任务生命周期、快捷键和 JSX 仍集中；已拆 history/save/persistence hooks |
| Viewer | `features/editor/components/VideoPreviewCanvas.tsx`、`VideoPlaybackControls.tsx`、`hooks/useVideoPlayback.ts` | 原生 video、逐帧/倍速/静音、缩放/宽高比/全屏、叠层；requestVideoFrameCallback 把 currentTime 回写 React |
| Timeline | `features/editor/components/EditorTimeline.tsx`、`features/timeline/hooks/useTimelineViewport.ts`、`useTimelineTrackPreferences.ts`、`components/Timeline*.tsx` | 缩放、平移、拖播放头、I/O、轨道顺序/高度/显隐；主音频/帧带/groups/shots，另接音频轨；不可称全新引擎 |
| ShotList | `features/editor/components/ShotList.tsx`、`features/shot/services/shotSearchService.ts` | 搜索/分组筛选/笔记截图标记筛选、多选、定位播放删除分割；memo 与 content-visibility 已存在，但仍遍历全部 shots，并非完整虚拟列表 |
| Shot | `features/shot/types.ts`、`shotService.ts`、`manualShotService.ts`、`shotBoundaryService.ts` | 持久化半开帧区间 `[startFrame,endFrame)`；UI maps 用 first/last 含尾帧；status 由模板完整度决定，不代表人工边界确认 |
| Auto Shot | `features/auto-shot/types.ts`、`hooks/useAutoShotTask.ts`、`useAutoShotControl.ts`、`autoShotTaskService.ts`、`applyAutoShotCandidates.ts` | Worker/WASM 已接入，任务冻结 config/controlSnapshot/媒体身份，candidate → review → apply → shots 已存在 |
| Auto Shot UI | `AutoShotControlPanel.tsx`、`PresetSelector.tsx`、`BasicSettings.tsx`、`RunStatus.tsx`、`ResultReview.tsx` | Review 为候选区间 inclusion/exclusion 小列表；没有用户级独立 Calibrate 页面 |
| Calibration | `features/scene-calibration/types.ts`、`components/CalibrationWorkbench.tsx`、`services/calibrationService.ts` | 研究标定：微秒切点/不确定区间/fixture/导出；与正式 Shot、创作 Marker、产品候选复核分离 |
| Group | `features/group/types.ts`、`services/groupService.ts`、`reconcileShotGroups.ts`、`components/ShotGroupPanel.tsx`、`ShotGroupInspector.tsx` | scene/section/sequence 均已有；只存 title/summary/shotIds；至少两个连续镜头，所有 kind 共用 occupied 集合，禁止重叠；无 parentId |
| Template | `features/template/types.ts`、`services/defaultTemplate.ts`、`templateService.ts`、`templateValidation.ts`、`components/TemplateEditorModal.tsx` | 项目模板快照、自定义字段、必填与参考术语；没有字段 Fact/Interpretation 来源分类 |
| Annotation | `features/annotation/types.ts`、`services/annotationService.ts`、`components/AnnotationMarkerPanel.tsx` | 帧位置、可选 shotId、important/composition/emotion/turning-point；不是情绪曲线或 Narrative Beat 推断 |
| Screenshot | `features/project/services/screenshotService.ts`、`features/shot/components/ShotScreenshotGallery.tsx`、`features/editor/components/FrameCapture.tsx` | 持久截图元数据/Blob、首尾帧/代表图/图库；截图和派生缩略图独立；构图截图有 included/signature |
| Composition / Content | `features/composition-overlay/`、`features/content-overlay/`、`features/video/services/videoOverlayCanvasRenderer.ts` | 已有构图辅助/绘图与分析内容叠层；预览和导出有共享解析/绘制能力，不是 AI 内容识别 |
| Audio | `features/media/components/AudioTrackPanel.tsx`、`AudioTimelineTrack.tsx`、`hooks/useMultiTrackAudioPreview.ts`、`services/audioMixService.ts`、`audioTrackProjectService.ts` | 导入音轨、片段范围/增益/淡入淡出/静音/预览/混音；64 MiB 预览缓存预算；不能据此声称分离出了对白/BGM/SFX |
| Waveform | `features/video/services/waveformService.ts`、`components/AudioWaveform.tsx` | Mediabunny 分块解码、240–1200 峰值 bins、持久派生缓存与取消；不是 ASR |
| Export | `features/export/components/{ReportExportDialog,VideoExportDialog}.tsx`、`services/{reportExportService,xlsxExportService,videoExportService,videoExport.worker,videoExportBoundary}.ts` | CSV/HTML/XLSX/PDF 报告路径及 MP4/WebM 协商、Worker、取消/流保存；实际可编码格式取决于浏览器；不改为 Create |
| Persistence | `features/project/services/projectRepository.ts`、`projectBackupService.ts`、`features/editor/hooks/useEditorPersistence.ts`、`useEditorSaveState.ts` | 本地 IndexedDB `aisenlens-projects` v15；五 store 编辑状态事务、expectedUpdatedAt 检查、400ms 串行保存、显式 saveNow；任务/截图等另存 |
| Recovery / History | `projectRecoveryService.ts`、`hooks/useEditorHistory.ts`、`editorHistoryState.ts` | 30 秒周期快照读取已保存状态；history 默认上限 100；快照包含 project/shots/groups/markers/template，不含任务和截图 Blob 的独立拷贝 |
| Theme | `index.css`、`types/theme.ts`、`app/App.tsx` | dark/light，两套 token；浅色当前偏暖灰；有 text-white/bg-white 覆写；无 System；accent 与 shadcn accent 语义不相同 |
| Responsive | `index.css` 的 1100px/640px 规则，Workspace mobilePanel | 已有窄屏工具/分镜/分析浮层，不可照旧报告称完全不适配；新 Shell 需替换固定 64px 左栏定位 |
| Tests / Docs | `apps/web/test/`、`scripts/verify-web.mjs`、`docs/WEB_AUDIT_2026-09-07.md`、`docs/DEVELOPMENT_TODO.md`、`docs/auto-shot/` | Node 核心测试和定向 browser harness 已有；根 `tests/` 未存在；尚无覆盖 Workflow 的端到端套件 |

### 必须纠正的旧描述与当前缺口

- 9 月 7 日审计末尾已经记录原子编辑保存、边界、错误边界、音频调度、窄屏等修复；不能把报告前半段全部照搬为未修复。`PROJECT_ARCHITECTURE.md` 中“配置 store 未实施”等描述已落后于代码。
- `ShotGroupInspector` 的 summary onChange 确实仍提交 `group.summary`，没有提交 `event.target.value`。P04 修复。
- `AutoShotTaskReview` 只有 excludedCandidateIds/updatedAt/appliedAt。不得显示“174 项人工确认”“AI 95% 人工 5%”；score/threshold 不是概率。
- 当前 Apply 先写 task.appliedAt，再更新 React 数据并等待自动保存，恢复快照只读取已落盘数据。跨页后这会放大任务/正式镜头不一致风险，P03 只收紧应用提交边界，不动检测算法。
- 排除候选会重整保留区间，而当前provenance接线按原候选精确范围匹配；此外Apply未在这段接线里清理指向被替换Shot的Marker关联。P03必须验证并处理这些引用边界，不能把缺来源解释成用户手工切镜、或保留不可导入备份的悬空shotId。
- 备份 v2 不包含 Auto Shot task、研究标定、原视频或外部音频文件；恢复快照也不是整个数据库备份。本轮保护这些现有 stores 原位不动，不能用普通 ZIP 冒充完整回滚保护。

## 3. Current → Target Mapping / Reuse Map

| 现有组件 / 服务 | Workflow / 未来使用 | 操作 |
|---|---|---|
| ProjectLibrary、ProjectMediaGate | 项目库 / Prepare / 统一媒体状态 | 保留；Gate 改成已加载项目可挂 Shell、媒体错误局部展示 |
| EditorWorkspace | Analyze 过渡宿主 → 纯组合 | 按阶段抽取，最后移除旧工具布局；不复制第二套编辑器 |
| 素材详情 + mediaService | Prepare / MediaStatusPanel | 搬迁现有 UI 和命令 |
| AutoShotControlPanel、BasicSettings、PresetSelector、RunStatus | Prepare | 拆出 review 后复用，参数和生产 registry 保持原样 |
| ResultReview、applyAutoShotCandidates | Calibrate / CandidateReviewQueue / 应用预览 | 扩展视图，复用纯函数；保留尾段与排除后的区间重整语义 |
| CalibrationWorkbench、AdvancedSettings | Project Settings → Advanced / Research | 降低一级入口，不删除功能，不称产品 Calibrate |
| ShotGroupPanel / ShotGroupInspector / ShotGroupRecord | Overview Structure、Analyze Scenes / SceneInspector | 复用 domain，修复 summary；只改普通用户标签 |
| ShotList + shotSearchService | Analyze → Shots 的 ShotBrowserView | 全宽页面优先；复用搜索、筛选和操作；移除永久窄列表 |
| VideoPreviewCanvas + VideoPlaybackControls | 共享 VideoViewer（Prepare/Calibrate/Analyze） | 生命周期单实例；控制区增加 Viewer Tools |
| EditorTimeline + timeline hooks/components | AnalysisTimeline 组合、Overview 的共享时间坐标/轨道部件 | 复用而非新建 Timeline Engine；Overview 只读投影 |
| FrameCapture + ShotScreenshotGallery + screenshotService | ShotInspector / Evidence | 迁移；保留原图、构图截图标识与重取帧逻辑 |
| AnalysisFieldInput / AnalysisDimensionCard + Template | Facts / 模板字段区 | 复用控件，改为查看优先；不按 label 猜自定义字段含义 |
| shotNotes.content / ShotRecord.description | Facts 中“画面描述 · 用户记录” | 原字段读写，不声称机器验证 |
| shotNotes.analysis / ShotRecord.notes | Interpretation / 我的笔记 + Learn 汇集 | 原字段读写，不伪装 AI 或正式 Technique |
| TemplateEditorModal | Prepare 的研究模板 / Project Settings | 删除工具栏一级入口；模板不是完整 Study Schema |
| CompositionOverlayPanel / ContentOverlayPanel | Viewer Tools | 原面板内容复用为菜单内工具面板；保留导出设置 |
| AnnotationMarkerPanel / annotationService | Timeline Tool + Overview / Evidence 定位 | 共享命令；删除一级导航 |
| AudioTrackPanel / AudioTimelineTrack / audioMixService | Analyze → Sound | 搬迁，手工音轨明确 Manual |
| ReportExportDialog / VideoExportDialog | ProjectTopBar → Export | 保留报告/视频两种出口；不挂到未实现的 Create |
| shortcuts/definitions + useEditorShortcuts | Help + 当前视图 scope | 保留统一注册表，输入/弹层/非媒体页禁用编辑快捷键 |
| LiteSettingsModal / 主题偏好 | Global Settings；项目设置独立 | 保留有效设置，System 接入全局主题解析 |
| useEditorPersistence / useEditorSaveState / projectRepository | 项目 Session 的唯一保存路径 | 先搬生命周期再改组件；禁止各页分别保存 shots/groups |
| useEditorHistory / Recovery | Session 命令历史 / 项目存储管理 | 保持原快照内容、上限和持久化边界 |

## 4. Target Information Architecture

```text
App / Public pages / Projects
└─ EditorPage (/app?project=<id>&stage=<stage>&view=<view>)
   └─ ProjectMediaGate（项目读取与媒体状态）
      └─ ProjectSessionProvider（项目生命周期，非布局）
         └─ ProjectWorkspaceShell
            ├─ ProjectTopBar：返回 / 名称 / Saved状态 / Undo Redo / Export / Settings Help
            ├─ WorkflowSidebar：Prepare / Calibrate / Overview / Analyze / Learn / Create
            ├─ WorkspaceView
            │  ├─ PrepareView：素材、模板、建立镜头地图
            │  ├─ CalibrateView：候选队列、前后帧、真实指标、应用预览
            │  ├─ OverviewView：Film Map / Structure
            │  ├─ AnalyzeWorkspace：Scenes / Shots / Sound
            │  │  ├─ SceneBoard 或 ShotBrowserView 或 SoundWorkspace
            │  │  ├─ VideoViewer：现有 Canvas + Controls，稳定挂载
            │  │  ├─ SceneShotStrip：场内导航
            │  │  ├─ AnalysisTimeline：时间关系
            │  │  └─ ContextInspector：SceneInspector / ShotInspector
            │  ├─ LearnView：真实笔记汇集、来源跳转；Patterns/Techniques 未开放
            │  └─ CreateView：Coming Soon（可从 Learn 展开，默认不占展开子导航）
            └─ ProjectSessionRuntime：保存/任务/快捷键/媒体资源控制，无大型 JSX
```

### 导航规则

- 保留 `/app` 以适应当前 App 精确 pathname/SEO 分支，不改公共页面路由体系。URL 为 project/stage/view 的权威；只允许枚举值。浏览器返回/前进可回到先前阶段；同一次导航合并更新 query。
- 初次新建落 Prepare；已有 project 的阶段优先按显式 URL，其次本会话有效位置，再按真实数据推荐：无素材 Prepare；任务 completed 且待应用 Calibrate；有 shots Overview；不自动宣称已校准。推荐不覆盖用户主动导航。
- projectId 解析后才装载会话；不存在的项目显示 not-found，不自动创建。`/app` 无 project 时保留项目选择引导；现有 active-project-id 只作当前默认选择，不产生第二个写入来源。
- 同项目切阶段不销毁 Session，不丢未保存编辑、历史或候选；离开项目/切项目先等待 saveNow，失败停留并重试。浏览器 popstate 守卫必须区分阶段 query 与离开项目，不能让每次后退都跳项目库。
- 阶段不是强制向导：没有 Scene 也能查看全片 Shots，标注“尚未建立场景”；缺媒体仍可读已有笔记/截图，播放、重新检测、取新帧禁用，Prepare 提供重新授权/关联。
- Selection 与 playback 分离：用户点击 Scene/Shot 决定 Inspector，播放经过边界只更新正在播放的 Shot。编辑中禁止自动切 Inspector 抢输入；可显式开启“跟随播放”，进入编辑则暂停跟随。
- Film → Sequence/Section → Scene → Shot 是长期认知层级。首轮面包屑只显示真实关联：项目 / Scene / Shot；没有父子关系就不虚构 Sequence 父级。无 Scene 的 Shot 显示“未归场景”，不生成伪 Group。

### 首屏与布局决定

选择“左侧流程 + 中央证据 + 右侧对象检查器 + 底部时间关系”。拒绝把所有阶段合成大 Dashboard，也不采用每个阶段全屏重建播放器。Overview 比 Analyze 留更多纵向结构空间；Calibrate 主焦点为原视频与边界前后帧。

宽屏（≥1280）导航 160px、Inspector 默认 336px，Viewer 使用剩余空间且可折叠 Inspector。768–1279 收起导航为有文字提示的菜单，Inspector 按需侧面板；≤767 使用单列 Viewer + 当前任务，导航/Inspector 复用 Dialog，任何时刻只打开一个模态层。以 1440×900、1024×768、768×1024、390×844 检查；这些是目标断点，不是当前实测结果。

Shot Browser 选独立 Analyze/Shots 页面，因为全片搜索需要横向空间、筛选状态和批量操作，不适合把原窄列表塞进大模态。SceneShotStrip 仅呈现场内镜头与邻接关系，不再附带全片筛选/模板编辑。

## 5. Data Model Impact

| 分类 | 本轮决定 | 数据边界 |
|---|---|---|
| No DB Change | P01–P08 全部保持 IndexedDB v15、Shot/Group/Template/Marker/Screenshot/Project 格式 | 无 Supabase schema 改动，无历史格式迁移；P03 允许扩大现有 stores 的事务参与范围 |
| UI-derived State | 当前阶段/子视图/选择/面板、Film Map、时长统计、笔记聚合、可用状态 | URL/会话 Zustand/selectors；不写入 ProjectRecord，不放 Blob、峰值大数组到全局状态 |
| Small Schema Extension | 逐项人工 review、真实 studyIntent、模板字段语义/来源、独立 Learning 文本 | 本轮不实施。确需时单独决策、数据读写/备份/恢复/回滚方案齐备后才排期；不能塞进 notes 的 JSON 字符串 |
| New Domain Required Later | 跨项目 Technique、Pattern 与证据引用、Transcript/Speaker/OCR、层级 StructureNode、CreativeAsset | 不用 Group.summary 或 Template 冒充正式实体，不预建空表 |

Group 第一版保持“至少两镜、连续、跨种类不重叠”。P04 的轨道仅将现有 Group 按 kind 分带，不支持同一区间的 Scene/Sequence 套叠。单镜场景/真正层级树标记 Decision Required（后续 Domain），推荐另案修改 Group 约束和恢复规则，备选保持平面人工整理；本轮固定采用后者。

Facts 的确定项只有区间、时长等真实计算数据。现有技术字段显示“用户标注”；未知自定义字段放“模板字段（未分类）”，不自动将叙事解释归为客观事实。notes 保留原“我的分析/笔记”语义。Learning 区当前提供来源回看和未开放方法入口，不增设无法保存的自由输入框。

## 6. Component Architecture

新 UI 代码在 `apps/web/src/features/workflow/`（导航/阶段组合）、`features/overview/`（派生总览）、`features/analysis/`（Inspector/深拆组合）、`features/learn/`（笔记聚合）。Scene 的业务仍在 `features/group/`，校准的 candidate 业务仍在 `features/auto-shot/`。页面不直接访问仓储。

项目作用域会话位于现有 `features/editor/`：Provider 只创建/注入 store；runtime 挂载专注 hooks；store 保存必要编辑草稿与 revision；commands 调用既有业务函数；services/仓储负责 I/O。不创建一个同时容纳所有 handlers、订阅和 JSX 的 `useEverything`。

复用 `components/ui/button.tsx`、`dialog.tsx`、`dropdown-menu.tsx`、`tooltip.tsx`、`tabs.tsx`、`sonner.tsx` 等。当前组件 API 使用 Base UI 的 `render` 约定，不能机械套用另一版本 shadcn/Radix 的 `asChild`。现有 Dialog 可覆盖窄屏侧面板，无需先安装 Sheet/Resizable 库。

EditorWorkspace 收敛路线：P01 单实例过渡宿主 → P02 移走共享会话/资源所有权 → P03 移走素材/任务/校准 UI → P04 结构视图 → P05 抽出 Viewer/Inspector/ShotBrowser → P08 删除剩余旧工具布局。每次移动删除原职责，不长期保留两套 store、两个播放器或新旧路由开关。

## 7. State Ownership

| 状态 | 唯一 owner | 消费者 / 生命周期 |
|---|---|---|
| Project metadata / 文档草稿 | 项目作用域 editor document store + 既有 projectRepository | ProjectSessionProvider 每 projectId 一个实例；服务端账号状态不进入 |
| Workflow stage/view | URL；workflow store 只持有非 URL 临时 UI | Shell/导航；无同步双向 effect 循环，页面统计不写 stage |
| Playback | 现有 useVideoPlayback 迁入稳定 MediaRuntime；video element 为时间权威 | 高频时间订阅只驱动 Viewer/Timeline/音频；Blob/AudioContext/ref 不进入文档 store |
| Selection | session selection slice：shotId/groupId/selectedShotIds | SceneBoard/Strip/Browser/Inspector 共享；播放中 activeShotIndex 为派生适配值 |
| Shot editing | document slice + 单一 editor commands | 重用现有 maps 和半开区间转换，保持 history commit/save dirty 原语 |
| Calibration review | Auto Shot task controller + 持久化 task.review | 跨页同实例；选中的 candidateId 是 UI 状态；研究标定继续独立存储 |
| Inspector | selection + 局部展开/编辑草稿 | 文本提交到 document action；失焦、Enter、切对象/切阶段时提交；Escape 撤销尚未提交草稿 |
| Undo / Redo | Session 内 history hook/state | 只承诺当前已有快照字段；不因导航产生 history，不承诺任务/音轨/模板/overlay 全部可撤销 |
| Save / Recovery | 一个 save coordinator + runtime 定时器 | 跨页持续，离开前 flush；snapshot 前先保存；禁止每页启动一套计时器 |
| UI-only | feature局部 state 或 session UI slice | 菜单/折叠/临时过滤；跨页需要保留者进 slice；大缓存仍归资源服务 |

P02 必须先建立共享 owner，再让非 Analyze 页面可写数据。禁止 Overview 直接读旧 DB 再把过期结果覆写尚未保存的编辑草稿。

## 8. UI First Capability Matrix

A=本轮必须真实实现；B=UI First，后续接能力；C=Coming Soon，仅状态/说明；D=本 Roadmap 不做。本表是唯一能力矩阵，阶段文档中的细化不得改变分类而不更新此表。

| Capability | Current Implementation | Target UI | First Version Behavior / Strategy | Phase | Future Integration |
|---|---|---|---|---|---|
| Workflow / Project Shell | 无独立工作流 | 六阶段导航 | A：真实路由，已发布阶段可用 | 01/02 | 无新 Domain |
| 导入/权限/重关联 | 已有 Gate/service | Prepare | A：保留指纹校验与取消，媒体缺失可读文档 | 03 | 不接云上传 |
| Study Intent | 模板可配置，无 intent 字段 | Prepare 模板选择/编辑 | A：只称研究模板，不存虚假意图 | 03 | 独立 intent 待决策 |
| Auto Shot | 完整任务与引擎 | Prepare | A：移动复用，使用真实任务进度 | 03 | 不优化算法 |
| Candidate Review / Apply | 排除列表/应用预览 | Calibrate | A：区间复核、定位、证据、原子应用；无逐项确认率 | 03 | 人工审阅字段另案 |
| Research Calibration | 已有 fixture/标定工作台 | Advanced | A：保留独立研究工具 | 03 | 原研究流程 |
| Manual Split / Merge / Boundary | 已有 | Analyze / Calibrate 应用后 | A：重用现有命令 | 03/05 | 不编辑 raw candidates 边界 |
| Film Map | 无独立页面 | Overview | A：现有 shots/groups/markers/可用 waveform 的只读地图 | 04 | 未来叙事轨单独接入 |
| Rhythm / 时长分布 | 原始区间存在 | Overview Facts | A：均值/中位数/极值、固定窗口切点数，显示单位和定义 | 04 | 不推断情绪 |
| Structure / Scene Board | Group 基础存在 | Overview Structure / Analyze Scenes | A：人工、平面、连续非重叠；不伪造故事结构 | 04/05 | parentId/单镜 Scene 属后续 Domain |
| 真正嵌套 Structure / Beat Sheet | 无 | 结构页能力说明 | C：说明当前平面约束，不画可拖入的假树 | 04 | StructureNode 另案 |
| Shot Browser / Strip | ShotList 已有管理 | Analyze Shots / Scene 内 | A：全片搜索和局部导航分工 | 05 | 扩充筛选按真实字段 |
| Evidence / Facts / Interpretation | 截图、detection、fields、description、notes | 四层 Inspector | A：重排真实数据，用户来源明确 | 05 | 字段 provenance 另案 |
| Composition / Content Overlay | 已有 | Viewer Tools | A：复用绘制/导出设置 | 05 | 不做 OCR |
| Marker | 已有 | Timeline + Overview | A：定位与手工编辑 | 04/05 | 不生成情绪曲线 |
| Waveform / Audio Track | 已有 | Sound | A：波形和手动音轨/混音；名为音轨，不宣称分离音源 | 05 | 未来 ASR/声学事件 |
| Dialogue / SFX / Ambience 语义轨 | 无 domain/识别接线 | Sound 轨道菜单 | B：禁用项+Coming Soon；不生成假轨段 | 05 | 有 provider 后返回有来源的时间段 |
| ASR / 字幕导入对齐 / Speaker / OCR | 无本产品模块接线 | Prepare/Sound 能力说明 | C：无加载动画假进度 | 03/05 | 独立本地媒体文本 Domain |
| Scene AI / 人物地点 / 情绪 / J-L Cut / 自动 Pattern | 无本产品模块接线 | 局部能力说明 | C：无数值/假曲线/示例结果 | 04/06 | 另行研究与证据协议 |
| Learn Notes | Shot.notes / Group.summary 已有 | Learn | A：只读聚合、来源定位、回 Analyze 编辑 | 06 | 不将所有笔记自动称技法 |
| Pattern / Technique | 无独立实体 | Learn + Inspector 入口 | B：真实空状态、保存为技法禁用、说明尚未开放 | 06 | 项目 Pattern → 跨项目 Technique 新 Domain |
| Create / Storyboard / 拍摄 ShotList / Prompt / 节奏模板 | 无 | Learn 内通往 Create | C：可进入说明页，无生成按钮伪结果 | 06 | CreativeAsset 新 Domain |
| 跨项目案例库 / 语义搜索 | 无 | 本轮不增加全局导航 | D：缺知识与索引 Domain，避免扩大范围 | 后续 | 独立 proposal |
| 在线 URL/YouTube 导入 / Share 协作 | 无本地工作流接线 | 不设可用按钮 | D：网络/权限/协作非本轮目标 | 后续 | 另立需求 |
| Export | 已有报告/视频/备份 | Topbar / Project Library | A：原能力保留，未保存先 flush | 01–08 | 不包装成创作生成 |
| Cinema / Studio / System | dark/light，System 无 | Global Settings | A：同布局 token、系统偏好解析 | 01/07 | 无第二套 UI |

能力状态（Available/Manual/Experimental/Coming Soon/Unavailable）与加载状态（Empty/Loading/Ready/Error）正交。例如 Sound 为 Manual + Ready；没有音轨为 Manual + Empty；浏览器解码失败为 Unavailable + Error。Experimental 只用于确有实验实现的研究功能，不把完全未实现能力标为 Experimental。

## 9. Theme Architecture

视觉权威：[双主题规范](../../lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md)；以下从 P01 生效，P07 负责统一收尾。

- 共用 spacing 4/8/12/16/24，窗口标题 13–14、正文 12–13、meta 11，时间码/帧数用 mono。主面板 0–4px 圆角、控件约 6px、Popover 8px、Dialog 10–12px。分区用 surface + 1px divider，阴影仅浮层。
- Cinema 保留 #080808/#0a0a0a/#0d0d0d/#111111 层级；Studio 改为冷灰 #f1f1f1/#e9e9e9/#f5f5f5/#e3e3e3，白色仅局部输入/选中控件。Viewer 默认 #050505；用户显式画布背景设置仍保留，不能被主题覆盖。
- 蓝色表示选中/焦点/主操作，红色 playhead，绿为成功、琥珀为待检查、紫色仅来源/解释提示。marker 分类色可保留，但必须图形/文字区分红播放头与错误。
- `--app-accent`/`--app-selected-bg` 为产品选中语义，映射 Tailwind；不要用 shadcn `--accent` 代替选中蓝（它当前表示控件 hover surface）。补 viewer、playhead、waveform、success/warning/error/ai 语义 token，逐步移除相关硬编码覆写。
- `ThemePreference = dark | light | system` 与 `ResolvedTheme = dark | light` 分离。localStorage 保留偏好值，html data-theme 只写解析结果；System 监听 prefers-color-scheme，显式模式不随系统改变；Toaster/Portal 跟随解析结果。
- 不建两个组件树，不用 `theme === light` 散落每个组件，不复制预览 CSS；System 切换只改 token，不重建媒体/任务、截图缓存或历史。
- 默认关闭大面积 blur、glow、gradient；120–180ms 仅轻微状态过渡，减少动态效果设置下关闭非必要动画。

## 10. Migration Strategy / 阶段依赖

在建议顺序中插入独立 P02 Session 阶段：当前任务/保存/history 生命周期仍绑定 3,700 行组件，直接搬 Prepare 会产生第二个状态源。先解决这一依赖，才能让后面每个阶段独立实现和验证。

| 阶段文档 | 目标 / 主要改动 | DB | 风险 / 影响 | 依赖 |
|---|---|---|---|---|
| [01 Workspace Shell](01-workspace-shell-and-navigation.md) | Shell、Topbar、导航/query、主题基础；旧编辑器单实例挂载 | 无 | 中：路由/返回/布局 | 当前 main |
| [02 Project Session](02-project-session-and-state-ownership.md) | 共享 Zustand 草稿/选择，稳定任务/播放器/保存/history 生命周期 | 无 | 高：全部编辑状态，必须先保持行为 | 01 |
| [03 Prepare & Calibrate](03-prepare-and-calibrate.md) | 搬素材/检测/Review；明确研究工具；应用一致性 | 无 schema；扩展事务 | 高：Gate、task、apply、recovery | 02 |
| [04 Overview & Structure](04-overview-and-structure.md) | 真实 Film Map/统计/SceneBoard、摘要修复 | 无 | 中：group/selectors/定位 | 03 |
| [05 Analyze & Inspector](05-analyze-scene-shot-inspector.md) | Browser/Strip、四层 Inspector、Viewer Tools、Sound | 无 | 高：编辑/截图/Timeline/音频 | 04 |
| [06 Learn & Future Create](06-learn-patterns-and-future-create.md) | 笔记汇集、来源跳转、未开放能力状态 | 无 | 低：来源引用与文案 | 05 |
| [07 Dual Theme](07-dual-theme-visual-system.md) | 完整 token/Studio/Portal/System 一致性检查 | 无 | 中：共享样式含公共页面 | 06；基础已在 01 |
| [08 Cleanup & Regression](08-cleanup-migration-and-regression.md) | 删除旧入口/过渡宿主、文档同步、完整回归 | 无 | 中高：跨阶段整合 | 07 |

各阶段以独立提交形成可运行检查点；不提前实现后续阶段。P01–03 推荐严格串行：外壳稳定 → 会话不随页面死亡 → 再搬写入型流程。完整功能缺口不全部塞 P01。

## 11. Compatibility / Persistence

这里的“已有项目可打开”是保留当前数据和既有 reader 的行为，不是为废弃格式新增兼容层。用户规则禁止新增旧格式迁移/双轨实现；本轮也不主动删旧 stores/reader，因为这不是数据格式清理任务。明确废弃格式后的删除另案实施。

迁移本身不改变 shots ID/范围、analysisFields 值、description/notes、screenshots ID/Blob/首尾/代表图、markers、groups、template、audioTracks、overlay、auto-shot task/checkpoint/review、recovery snapshots。切阶段不得 normalize 后偷偷删除字段。对当前 normalizer 会丢弃的非模板字段，先建立 fixture 验证；若发现现存数据会被 UI 迁移首次保存删除，阻断并作最小原值保全处理，不臆造新的格式。

用户主动 Apply/Split/Merge/Delete 可能按既有业务规则改变镜头与引用，不许把这一语义写成“所有 ID 永远保留”。Apply 必须展示 preserved/changed/removed 与 Group 影响，flush 当前编辑，再创建应用前快照；失败不得继续。相同范围继续复用 ID；变动范围不自动把原解释复制给新镜头。旧数据由明确快照找回，迁移不会主动触发这些操作。

P03 要求 task.appliedAt 与正式编辑状态一次提交到现有 stores；否则只显示“候选已生成/应用未完成”，不显示“已应用”。Undo 只恢复已有历史文档范围，task 的 appliedAt 是历史事件而非当前结构认证；恢复快照后同理显示“曾应用，当前结构可能已变更”，不创建假状态。

截图 Blob 不能因视图卸载删除；仅 revoke 本实例对象 URL。derived 缓存可以失效重建，但不能把 evidence 当缓存清理。快照和备份的缺项在 QA/回滚中显式记录。

## 12. Testing Strategy

规划期间未执行生产测试；本轮没有组件修改，build 不用来冒充文档验收。实施每阶段运行 `corepack pnpm build`，逻辑改动另外运行 `corepack pnpm typecheck`、`corepack pnpm lint` 和对应测试；最终 `corepack pnpm verify:web`。现有 browser 导出测试在上次审计曾超时，实施时必须复核，不把超时算通过。

现有测试保留在 `apps/web/test/`，本轮新增测试遵循根 AGENTS 放 `tests/features/workflow/`，只在有实际测试文件后增加 runner；使用现有 Node test 风格和浏览器 harness，不因计划先安装框架。新 runner 尚不存在，不列为当前可执行命令。

| 编号 | 场景 | 必须验证的结果 | 主阶段 |
|---|---|---|---|
| R01 | Existing project reopen / 新建空项目 | 数据/ID不变；已有默认推荐/新项目 Prepare；不造示例数据 | 01–03 |
| R02 | Media relink / 拒绝权限 / 文件不匹配 | 文档仍在，正确文件恢复，错误文件不覆盖 | 03 |
| R03 | Auto Shot start/pause/resume/cancel/error | 单任务；切阶段不销毁；真实进度；项目切换终止旧订阅 | 02/03 |
| R04 | Candidate Review / Apply | 排除首/中/尾、全排除、重跑后过期预览、保存失败、快照失败；不改算法输出 | 03 |
| R05 | Split / Merge / Boundary / Undo / Redo | 半开区间连续；引用/reconcile 与旧语义一致；一次命令一次历史 | 02/03/05 |
| R06 | Scene/Section/Sequence | 至少两个连续、不可重叠；summary 保存/重载；选中失效可见 | 04 |
| R07 | Timeline | 缩放锚点、滚动、播放头、I/O、轨道偏好、键盘与拖动替代操作 | 04/05 |
| R08 | Analysis editing / Template | 每种 field kind 保持类型；中文 IME/切对象/后退/保存失败不丢输入 | 02/05 |
| R09 | Screenshot / Overlay | 首尾帧正确、代表图/图库保留、构图标识、预览/导出一致 | 05 |
| R10 | Audio / Waveform | 无音轨、解码错、未来片段、倍速、暂停/seek、mute/gain、缓存取消 | 02/05 |
| R11 | Save / Reload / Recovery | pending revisions flush、并发改动错误、snapshot 前 flush、重开计时器不重复 | 02/03/08 |
| R12 | Export / Backup | CSV/HTML/XLSX/PDF 及可用视频格式，区间尾帧/音画、取消、失败；备份引用保留 | 05/08 |
| R13 | Dark / Light / System | 文本/焦点/portal/selected/playhead、系统变更、无媒体重载 | 01/07 |
| R14 | Responsive / Accessibility | 四尺寸、键盘全流程、焦点恢复、文字200%、减少动态效果 | 每阶段 |
| R15 | Learn / Future | 只真实 notes/summary；来源删除安全失效；无 AI 假数据/假计数 | 06 |
| R16 | Browser navigation / 多项目 | stage 返回与离开区分；项目切换不串数据；跨页历史保留 | 01/02/08 |

Fixture 使用隔离浏览器 profile/测试 IndexedDB，不操作用户项目。覆盖空/单镜/短片/长片（建议两小时、2,000 镜）、带完整 annotations/screenshots/template/groups 的副本、missing-media 与 completed/paused/failed 任务。数据只作测试标识，禁止混入产品。

## 13. Performance Risks

| 风险 | 当前证据 | 规划控制 / 验收 |
|---|---|---|
| EditorWorkspace render scope | 当前帧时间驱动根组件；大量派生/传参 | P02 窄订阅，P05 Inspector 不订阅每帧；Profiler 检查播放时 Shell/Browser 不持续提交 |
| ShotList / SceneBoard | 全量 map，已有 memo/content-visibility | 不去掉既有优化；只加载可见缩略图，按结果确定是否再窗口化；不预先加虚拟化依赖 |
| Timeline | viewport/visibleRange 已有 | 共享时间映射；Overview 不挂第二个可编辑 Timeline；统计不依赖 currentTime |
| 长视频/截图 | 截图 URL、取帧队列与导出占资源 | 资源服务保留取消/释放；切视图不重取全片、不把 Blob 放 Zustand/history |
| Waveform / 多音轨 | 分块读取，峰值上限1200，预览64MiB | 复用缓存与预算；Sound 切换不重复 decode；无音轨不能画示例波形 |
| Theme | 全局 CSS/Portal 覆写 | 只更新 token，播放器/worker 创建次数不变；不按 theme key 重挂 |
| Save/history | JSON signature 与多 maps 快照 | 改动频率与回放分离；遵守100条上限；只在命令提交更新 dirty，不逐帧深拷贝 |

P01 记录固定设备/浏览器/素材的打开、切阶段、seek、10次切换后内存、播放掉帧和长任务基线。后续同条件三次取中位数，阶段切换/seek p95 相对基线劣化超过20%需定位并处理；新增图表不得在每帧产生 >50ms 主线程长任务。数值是验收建议阈值，不是当前性能成绩。浏览器测不出某指标就如实记录，不编造。

## 14. Accessibility

- 工作流用 nav/link 与 aria-current，Scenes/Shots/Sound 用有正确键盘语义的 Tabs；状态图标附文字，不能只有颜色。
- Viewer 操作都有 accessible name；Space/J/K/L 等只在允许的编辑 scope 生效，输入/IME/模态层不触发分割或播放。
- Dialog/Menu 复用现有组件；关闭回触发点，阶段切换焦点到阶段标题；Inspector 保存失败留焦点和草稿，不能提示消失后丢内容。
- draggable 分隔条提供键盘调整和可见 focus；时间线定位/边界/I-O/轨道排序提供按钮或数值输入替代拖拽；选择状态与正在播放独立朗读，时间码不每帧 aria-live。
- 正文目标4.5:1、非文本状态/焦点3:1，禁用项之外不用 faint 表达重要说明。使用 WCAG 2.2 AA 作为实施验收目标，不宣称本轮已经达标。参考：[WCAG 2.2](https://www.w3.org/TR/WCAG22/)。
- 窄屏可触操作目标约44px，不把桌面12px视觉标签当作12px点击区；200%缩放仍可完成主流程，尊重 reduced-motion。

## 15. Rollback Strategy

每个阶段独立提交、独立 build 和相关回归。回滚以 revert 对应阶段提交为主，不创建用户可切换的新旧编辑器产品线。相互依赖的后续提交按逆序回退，不能将依赖已经删除 API 的单一提交强行撤回。

所有阶段均不升 DB 版本，所以代码回退不需要 downgrade 数据库；测试验证新 UI 保存的当前 v15 项目可由阶段前代码打开。每个实现任务开始记录基线 commit、变更范围与数据不变量。首次开数据副本前保留隔离测试 profile 的完整 IndexedDB 导出/克隆；普通项目 ZIP 缺 task/原媒体，不能替代这个检查点。不要复制或清空用户生产浏览器 profile。

P01 回退 Shell；P02 回退 owner 提取；P03 回退新视图及事务接口（数据格式未改）；P04 回退派生展示，summary 修复可保留独立提交；P05 回退布局/Inspector；P06 回退只读笔记视图；P07 回退 token；P08 回退清理。失败保存/媒体重关联错误必须阻断该阶段发布，不能靠“后面再修”跨过门禁。

## 16. Decision Required / 明确暂缓

| 决策 | 本轮推荐并采用 | 备选 / 触发条件 |
|---|---|---|
| 逐项人工 confirmed 状态 | 只显示保留/排除/曾应用，避免 schema | 用户确需审核覆盖率时新增 review schema，并专门测试导出/恢复 |
| 单镜 Scene/多层嵌套 | 不支持，解释现有约束 | 独立 Group Domain 项目；禁止 UI 层偷偷绕过 reconcile |
| Pattern 持久化 | Learn 聚合已有笔记；方法保存禁用 | 用户明确要求正式技法库后单独设计实体和备份引用 |
| Template 语义分组 | 已知事实+用户标注+未分类字段 | 为字段新增 semanticRole/source 需扩展格式，另案 |
| 失效旧数据 reader | 原状保留，不新增兼容 | 确认格式废弃后单独删除；不纳入 P08 UI 清理 |
| 浏览器测试驱动 | 优先复用现有 CDP/browser harness | 当前 harness 不稳定时，先修退出/超时与 fixture，确需新依赖再说明 |

上述后续决策不阻塞本规划及当前限定版本；Coding Agent 不得自行选备选扩大本轮范围。

## 17. 规划交付与执行纪律

完整交付为本文件及01–08阶段计划。每个阶段自包含 Scope/Non-goals/Current Files/New Files/Data Changes/Component Changes/User Flow/UI States/Theme Requirements/Migration/Acceptance Criteria/Tests/Manual QA/Regression Checklist/Completion Gate，并包含独立回滚方法。所有阶段必须先读取当前代码，处理基线之后的真实变动，不能机械用本文件行号覆盖其他人的改动。

执行只验收 Web；不要求 Desktop/Android/iOS 构建。不修改 AisenShot 核心、WASM ABI、production preset、时间线引擎、账号后端；不装新 UI 框架，不生成 Fake AI，不恢复用户废弃的预览。每次引入或修改组件运行 `corepack pnpm build`，检查结果与未验证项如实写在实施任务中。
