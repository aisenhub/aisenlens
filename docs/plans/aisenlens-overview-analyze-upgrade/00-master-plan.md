# 总览与深拆升级：总执行计划

日期：2026-09-09。状态：实施完成，已合并 main。平台：Web。

架构输入：[AisenLens_总览与深拆优化架构](../../lensflow/AisenLens_总览与深拆优化架构.md)。本文与阶段文档将架构转成执行契约；本轮已完成 Web 产品代码、自动化测试、真实媒体回归与性能边界验证，并已合并推送到 main。

## 1. 已确认目标

总览负责全局观察、预览、结构组织和选研究范围；深拆负责持续观看、前后镜/声画对照、记录证据与解释。用户既可全片按顺序逐镜记录，也可带问题选段研究，两者共用内容并能恢复原上下文。

以下是实施必要项：

1. 总览单击就地预览、选范围显式进入深拆，同页建立结构。
2. 深拆 Scenes/Shots/Sound 共用观看运行时，选择对象明确，不因镜头属于分组而隐藏镜头笔记。
3. 研究范围、编辑对象、播放位置分离；用户输入不能串镜。
4. 全片顺序与范围研究切换，恢复队列、筛选、滚动和位置。
5. 单镜场景、不同结构层覆盖、按媒体时间锚定的研究范围。
6. 复用现有笔记、模板、截图、标记、媒体与导出；新研究信息可持久化和恢复。
7. 与校准引用重整一致；统计、时间比例、填写情况和研究状态真实。

不重新讨论上述方向。不新增 AI/ASR/声音分离、情绪人物推断、技法知识图谱、通用嵌套树或原生平台。不会为改善页面重写检测引擎、媒体解码器或全站架构。

## 2. 执行顺序与文档

| 阶段 | 文档 | 必需交付 | 依赖 |
| --- | --- | --- | --- |
| O0 | 本文第4节 | 基线、受影响调用链、校准集成点和早期验证记录 | 无 |
| O1 | [01-domain-and-storage.md](01-domain-and-storage.md) | 研究实体/结构规则/唯一内容归属/仓储与恢复契约 | O0 |
| O2 | [02-session-navigation-and-viewer.md](02-session-navigation-and-viewer.md) | 共享会话、稳定播放器、导航/编辑保护 | O1 |
| O3 | [03-overview-and-structure.md](03-overview-and-structure.md) | 总览预览、选区、准确统计和就地结构编辑 | O2 |
| O4 | [04-analyze-and-research-flow.md](04-analyze-and-research-flow.md) | 两种研究流程、真实证据/字段与声音研究 | O2；默认在O3后 |
| O5 | [05-calibration-export-and-continuity.md](05-calibration-export-and-continuity.md) | 校准回流、内容引用、完整导出/恢复/历史 | O3+O4 |
| O6 | [06-verification-and-cleanup.md](06-verification-and-cleanup.md) | 浏览器/故障/性能回归、旧路径清理、完整交付 | O5 |

执行入口：[agent-handoff.md](agent-handoff.md)。实际实施记录：[verification-record.md](verification-record.md)。默认单 agent 顺序完成 O0–O6。

若用户另行安排并行 agent：O1/O2 契约和运行时完成并推送后，O3 总览与 O4 纯分析组件可并行；共享写入由集成负责人承担。主任务仍以集成分支合入各阶段结果、验证并推送为门槛。不自动创建其他任务或发送消息。

## 3. 代码证据及复用范围

所有简写 `features/...` 均位于 `apps/web/src/`。

| 已核实路径 | 当前事实 | 改造方向 |
| --- | --- | --- |
| `features/overview/components/{OverviewView,FilmMap,FilmFacts,StructureView}.tsx` | 数字/色块/结构入口，色块最小1%宽度 | 真实时间坐标、可操作预览与选区 |
| `features/overview/services/deriveFilmOverview.ts` | 偶数中位数不正确；10秒窗口未用于计算 | 统一时间来源、全片/选区/窗口语义 |
| `features/group/{types.ts,services/groupService.ts,services/reconcileShotGroups.ts}` | 全kind互斥、至少两镜，reconcile会丢不符项 | 统一更新分层规则，禁止静默丢用户内容 |
| `features/analysis/components/{AnalyzeWorkspace,ContextInspector,ShotInspector,SceneInspector}.tsx` | 子视图分离；group存在即覆盖shot Inspector | 共用Viewer、显式target、接入既有证据 |
| `features/shot/components/ShotBrowserView.tsx`、`features/editor/components/ShotList.tsx` | 两套不同范围的浏览入口 | 抽取/复用搜索与列表能力，统一写命令 |
| `features/editor/{session,stores,hooks}` | 有项目store和保存/history，但大量状态仍在EditorWorkspace | 只抽取本次需要的权威状态，不能继续双向镜像 |
| `features/video/services/mediaFrameTimeService.ts` | 当前工作区新增PTS映射服务 | 复用前核实支持范围，不当作已验收 |
| `features/shot-calibration/`、`features/project/services/projectRepository.ts` | 当前有草稿及applyCalibrationDraft，DB当前读取为v16 | O0冻结实际基线；不硬编码下一个DB版本，不重写校准 |
| `features/annotation/types.ts` | 现有Marker是帧点，类别important/composition/emotion/turning-point | 声音区间研究用研究记录，不能假称已有声音区间类型 |
| `features/project/types.ts` | StoredShotRecord含description/notes/analysisFields/截图；Group有summary | 保留正文唯一归属，新增研究元信息不复制旧正文 |

同时检查现有 `components/ui/`、模板输入组件、FrameCapture、ShotScreenshotGallery、VideoPreviewCanvas、VideoPlaybackControls、EditorTimeline、SoundWorkspace/AudioTrackPanel、projectRecoveryService 与所有实际备份/导出消费者。新增组件必须先排除可复用组件能满足的可能。

旧 workflow P04/P05 的“已实施”不作为证据；本计划替代本范围的“仅平面互斥”“不得数据变化”“三个独立观看页面”约束，保留其稳定播放器、现有能力与本地优先原则。

## 4. O0：基线与前置验证

### 步骤

1. 读取适用 AGENTS.md、架构文档、全部本期计划；`git status`、分支、remote、HEAD并记录。不能提交他人未完成的校准改动。
2. 确定校准基线：其负责人提交的版本优先；已有改动未交付时，记录拥有者、缺少接口与可独立开展的任务，不能盲目 checkout 丢改动。共享接口未稳定前不进入依赖它的阶段。
3. 跟踪实际“用户输入→markDirty→保存→projectUpdatedAt”“选择→播放→Inspector”“校准应用→history→reconcile”调用链，记录当前权威状态及所有消费者。
4. 查清完整备份/导入/快照/项目删除/报告/视频导出的实际入口。已有文件不存在时重新检索，不照着旧计划创造同名替代品。
5. 运行基线 `corepack pnpm typecheck`、`corepack pnpm build`、`corepack pnpm test:workflow`、`corepack pnpm test:editor-history`；核对并运行当前校准相关测试脚本。已有失败记录来源，不当作本次通过，也不扩展无关修复。
6. 最小媒体验证：CFR、非整数fps、VFR的PTS与正式shot范围是否一致；播放器在子视图切换时何处卸载；输入时绑定对象如何保证。只有精确操作依赖帧验证，不必等完整长片解码才展示已有笔记。
7. 将受影响文件、版本、失败、接口适配决定写入 verification-record。若需修正本文建议接口名，只改命名/适配细节，不静默改变正文唯一性、时间语义和数据保护。

### O0完成与GitHub门槛

基线与调用链记录齐全、O1前置可用后，提交本套计划/基线记录中属于本任务的文件并推送。基线已有失败不等于O0不能交付，但必须给出归属与后续阶段的实际阻断关系。没有权限或稳定集成基线，明确阻塞；不能标已交付。

## 5. 统一架构边界

- `features/group` 管正式结构，`features/analysis` 管研究记录及检查器，`features/overview` 只派生统计/组合界面。
- 项目作用域会话沿 `features/editor/session` 和现有 Zustand store 扩展；不得新增另一个全局currentShot/time镜像。
- 持久化在现有 projectRepository；关系更新通过服务和统一写队列/事务，不让组件直写DB。
- 研究时间范围用整数微秒半开区间，媒体身份必须匹配；帧操作经验证的既有PTS服务投影，0不是“无法定位”的替代值。
- 原有 Shot正文、Group summary 仍是正文唯一权威。O1新实体只补范围内容或元信息。
- 一个项目活跃观看运行时；取证离线decoder可独立但有界，不产生第二个播放时钟。
- 结构编辑/校准是领域变化；滚动、tab、播放位置不进入文档Undo；正文/范围/结构命令按既有history一致保存。

## 6. 研究与依赖

架构文档及 [参考项目索引](../../../reference-projects/REFERENCE_PROJECT_INDEX.md) 已记录公开方案→提案→OpenReel→OpenCut研究。后续新增模块研究遵守AGENTS流程，仅查相关文件并更新真实新证据；不要为写计划重复拉取完整参考仓库。技术API先核实当前安装版本。

保持现有技术栈、双主题与Web范围；不主动安装新库。新增依赖须说明必要性；软件安装 `D:\APP\Codex\<软件>`，缓存 `E:\AppData\<工具>`，不能默认安装C盘。UI实施使用适用技能，方向已经确定，不重新启动全站视觉设计。

## 7. 每阶段GitHub交付要求（所有阶段强制）

实施阶段已授权 commit/push，无需逐阶段重复询问。本轮生成计划不执行Git写操作。

1. 使用本任务已确定分支；没有则按 `codex/` 规范创建专用分支，同一任务连续推进。先核实GitHub远程，不擅自推送其他仓库。
2. 阶段必要验收通过后检查diff，只提交本阶段及必要依赖的代码/测试/记录，不提交密钥、环境文件、用户媒体、缓存及他人改动。
3. 阶段可含多个有意义commit；标题包含O编号与实际变更。全部必要提交须push成功后才进下一阶段。
4. 核实远程包含阶段提交，记录分支、代码SHA、推送结果和GitHub链接。正文记录不追逐自己的SHA：先推代码，再单独提交/推送记录更新即可。
5. 推送失败保留成果，记录“验收通过待推送”，解决后继续；缺远程/权限才提出具体问题。
6. 不force push、不重写历史、不擅自合并main、不创建Release、不部署。push如触发仓库既有CI，按真实结果记录，不能把上传等同部署完成。

## 8. 需求与阶段覆盖

| 架构要求 | 实施 | 验证 |
| --- | --- | --- |
| 单镜场景/跨层覆盖/时间范围 | O1 | O1领域、O5校准、O6整体验证 |
| 正文唯一/证据/元信息可保存 | O1+O4 | O5备份、失败/引用测试 |
| scope/target/playhead分离 | O2 | O4编辑与O6浏览器 |
| 总览内预览/选区/结构编辑 | O3 | O3操作与O6往返 |
| 逐镜/选段两种流程 | O4 | O6完整序列 |
| 声画研究、不造AI数据 | O4 | O4人工证据、O6回归 |
| 校准/导出/undo/恢复 | O5 | O5故障、O6整合 |
| 统计、性能、双主题 | O3+O6 | 确定性数据与真实浏览器 |

完整交付=O0–O6全部必要内容验收并推送。不能只交静态页面或将保存、恢复、声音人工记录留成“以后接入”。
