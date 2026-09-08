# P03 — Prepare 与 Calibrate

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`b899a6e`。不改AisenShot算法；保留candidate → review → apply → official shots语义。

## Scope

把素材/研究模板/Auto Shot设置与运行状态移到Prepare；把候选复核和应用预览移到Calibrate；研究CalibrationWorkbench归Advanced。调整媒体门控，使已加载项目在媒体缺失时可阅读已有分析。收紧应用提交一致性。

## Non-goals

不改WASM/引擎/生产预设，不实现ASR/OCR/字幕校准，不新增“逐项人工确认”schema，不编辑raw candidate边界，不把研究标注写成正式Shot。保留现有本地文件/指纹规则，不改为上传服务。

## Current Files

- `apps/web/src/features/project/components/ProjectMediaGate.tsx`、`services/mediaService.ts`、`types.ts`
- `apps/web/src/features/editor/components/EditorWorkspace.tsx` 中素材面板、startAutoShotDetection、previewAutoShotCuts、applyAutoShotCuts、应用确认Dialog、研究入口。
- `apps/web/src/features/auto-shot/components/{AutoShotControlPanel,PresetSelector,BasicSettings,RunStatus,ResultReview,AdvancedSettings}.tsx`
- `apps/web/src/features/auto-shot/{types,applyAutoShotCandidates,autoShotTaskService,taskState}.ts`、`hooks/{useAutoShotTask,useAutoShotControl}.ts`
- `apps/web/src/features/scene-calibration/{types.ts,components/CalibrationWorkbench.tsx,services/calibrationService.ts}`
- `apps/web/src/features/template/components/TemplateEditorModal.tsx`、`services/{templateService,templateValidation}.ts`
- `apps/web/src/features/project/services/{projectRepository,projectRecoveryService}.ts`
- `apps/web/src/features/shot/services/{manualShotService,shotBoundaryService}.ts`
- P02 `features/editor/session/`与stores/hooks/services（前缀均为apps/web/src）。

## New Files

- `apps/web/src/features/workflow/components/{PrepareView,CalibrateView,ProjectSettingsPanel}.tsx`
- `apps/web/src/features/project/components/MediaStatusPanel.tsx`
- `apps/web/src/features/auto-shot/components/{CandidateReviewQueue,CandidateEvidencePanel,AutoShotApplyDialog}.tsx`
- `apps/web/src/features/auto-shot/services/autoShotApplyService.ts`：协调快照/事务/状态，不重新检测。
- `tests/features/workflow/{prepare-calibrate.browser.test.js,auto-shot-apply-transaction.test.ts}`

## Data Changes

不升IndexedDB版本，不改Task/Shot字段。允许对现有repository增加typed `applyProjectAutoShotState`操作，将project/shots/groups/markers/template和对应auto-shot-runs记录加入一个readwrite事务。输入为冻结的应用后编辑快照、taskId、媒体identity、expected task.updatedAt、expected project.updatedAt；校验完成任务/身份/config/controlSnapshot及未过期预览。复用现有serialize/reconcile，不另写第二种Shot存储格式。

必要原因：现代码先保存appliedAt，再修改内存并等待自动保存，任务和正式镜头没有共同提交边界；新Calibrate状态不能把这种窗口宣称为完成。此改动是本次UI暴露出的明确接口阻碍，不是算法重构。

Review沿用excludedCandidateIds（保存排除列表），无confirmedCandidateIds。显示“保留/排除”，不用“已人工确认X项”。score、threshold、margin仅当真实数据可用时显示数值与单位；不称准确率/概率。

引用一致性同属应用边界：排除后重整区间的Shot仍须保留真实检测来源。推荐给前端apply输出增加shotId→保留candidateId的映射，沿用原candidate身份而非按原区间精确匹配；这不改引擎、不改ShotDetectionMeta格式。被替换Shot关联的Marker保持frame/category/label/note并将失效shotId置null，不把标记删除或随机挪到新Shot；Dialog说明受影响关联数量。旧截图Blob保留以供应用前快照恢复，不当缓存删除。

Task controller还需提供统一review更新/应用后同步接口，成功持久化后更新同一内存record，失败显示未保存审阅状态与重试；禁止页面各自saveAutoShotTask后留下旧record导致下次整对象覆写排除项。所有review写与Apply锁串行协调。

## Component Changes

1. 将Gate的“项目能否读取”和“媒体能否使用”分开：project成功读取即挂Shell；ready/unlinked/missing/needs-permission/unsupported/error以媒体状态进入Prepare。project not-found/DB读取失败仍为外层错误，不能伪装空项目。
2. Prepare按“素材 → 研究模板 → 镜头地图”纵向排列，显示真实元数据、生产支持预设、RunStatus；继承同一task controller。模板直接打开既有编辑器，不增加未保存Study Intent输入。
3. 从AutoShotControlPanel移出ResultReview和应用按钮职责，保留Preset/BasicSettings/RunStatus与控制解析。检测完成后提供“复核候选”明确CTA，不强制跳页打断其他编辑。
4. Calibrate用候选队列+Viewer+前后证据帧+detail panel；共享同一个播放器/定位命令；每项显示区间/类型/保留状态。复用ResultReview行为扩展成独立队列，原面板版本移除，不复制实现。
5. 候选是覆盖影片的区间，不只是切点。排除首段时首个保留段start变为0；排除中段由前一个保留段延至下个start；尾段被排除时最后保留段延至总帧。UI给出实际应用预览，不能把checkbox简单标成“删除视频片段”。全排除禁用Apply并解释原因。
6. tail显示“尾段，无后续切点”，不画超出影片的after frame。硬切前帧取合法边界前一帧/后帧取边界帧；fade展示真实transitionRange。缺证据/解码失败可重试，不用示例截图。
7. 手工Split/Merge/移动边界只在正式shots区使用既有命令；候选区“定位/保留/排除/重新扫描”。研究校准的accept/reject/correct不混入产品Review。
8. Settings→Advanced呈现既有AdvancedSettings与CalibrationWorkbench，并清楚标“研究标定”。普通主导航不出现Developer。

## User Flow

新项目 → Prepare选本地视频/模板 → 建立镜头地图 → 查看真实进度 → Calibrate定位可疑候选 → 保留/排除 → 查看新增/保留/替换/移除镜头和分组影响 → 创建快照并应用 → 成功进入Overview（P04前可返回Analyze）。仍可跳过自动检测用既有手工镜头操作。

已有项目缺媒体 → Prepare解释重新关联 → 原笔记/截图可读 → 匹配文件重新授权 → 恢复播放/检测。错误文件不会替换原项目。

### Apply提交顺序（必须）

1. 锁定本次Apply，flush所有当前编辑与排除列表保存；记录文档revision/task版本，等待失败则停留。
2. 基于最新会话重新计算apply预览；若此前Dialog已打开但数据发生变化，要求更新预览，不使用过期结果。
3. 调用createProjectRecoverySnapshot；它读已落盘数据，必须在flush之后；创建失败停止。
4. 调用既有applyAutoShotCandidates纯函数输出，保留原ID/引用规则，组装一致的正式state和task review.appliedAt；通过一个现有stores事务提交，失败回滚全部写入。
5. 成功后才同步Session文档/保存revision与history一次；释放锁、关闭Dialog、更新状态。失败保留旧正式文档与排除选择，允许重试，不标“已应用”。

快照生成后事务失败可保留这份有效旧快照；不要为清理外观删除它。Undo复用原history范围，task.appliedAt作为曾应用事件，不当作当前结构认证。

## UI States

| 状态 | Prepare / Calibrate行为 |
|---|---|
| Empty | 无媒体导入提示；无候选去Prepare；零正式镜头不绘制假轨道 |
| Loading | 读取元数据/任务/证据独立加载；仅真实progress生成进度条 |
| Ready | 可扫描、可复核、可预览应用；任务completed并不代表正式镜头已写入 |
| Disabled | 缺权限/不支持/无候选/全排除/任务运行/提交锁；提供原因与恢复动作 |
| Error | 读取/检测/取帧/快照/保存分别可读错误；不抹掉既有正式shots |
| Coming Soon | 字幕/说话人/OCR仅未开放说明，无假加载列表 |
| Experimental | 仅真实研究模式；生产preset不标实验，未实现Scene AI不标实验 |

## Theme Requirements

引用 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§7–12、16–22、28、35；使用impeccable做任务层级设计。Prepare主操作为建立镜头地图；Calibrate主焦点为视频/边界证据。Cinema深中性色、Studio冷灰split view；Viewer都默认深色。score/time/frame用mono，排除/待检查用文字+琥珀，选择用蓝，不做紫色AI大卡。spacing4/8/12/16/24，section/divider组织，控件6px圆角、几乎无阴影。窄屏队列与证据分标签显示，共用同一task/selection。

## Migration

Prepare/Calibrate接入真实能力后才删除旧素材/分镜工具一级入口；模板搬Settings，研究搬Advanced。继续保留所有原预设值和冻结controlSnapshot，配置改变不修改旧任务证据。未匹配媒体身份的旧候选不可应用。

## Acceptance Criteria

- [ ] Prepare导入/取消/权限/错误文件/未知fps/无音轨状态准确。
- [ ] Review跨stage和reload保留排除项，未声称逐项人工确认率。
- [ ] 首/中/尾排除和全排除符合现有apply函数；fade/tail无越界取帧。
- [ ] 快照包含应用前刚输入的笔记，保存/快照/事务失败均不改变正式文档与appliedAt。
- [ ] task重新扫描、项目改变、排除项改变后旧Dialog不能应用过期预览。
- [ ] 成功提交后reload正式shots与task一致；同范围ID保留，变动数据有明确影响提示。
- [ ] 排除导致区间变化后detection仍为真实来源，失效Marker.shotId安全解除且原标记保留，应用后备份引用校验可通过。
- [ ] 研究标定记录与创作markers/正式shots隔离，导出仍可用。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:auto-shot-contract`、`corepack pnpm test:auto-shot-config`、`corepack pnpm test:auto-shot-settings-store`、`corepack pnpm test:scene-calibration`、`corepack pnpm build`。
复用/调整 `apps/web/test/auto-shot-apply-candidates.test.ts`、`auto-shot-task-service.test.ts`、`auto-shot-hook-lifecycle.verification.ts`；新增browser事务测试覆盖任意写入失败全回滚/旧预览失效/截图引用保留。不得通过重写检测fixture或降低算法回归阈值让UI测试通过。

## Manual QA

1. 新建空项目，拒绝文件选择后再导入；用missing-media副本测试重新关联。
2. 短片扫描时切Analyze再回来，暂停/恢复/取消各一轮。
3. 复核首/中/尾、fade/tail，全排除，然后恢复一项；对照应用预览。
4. 修改已有分析后立刻Apply，模拟snapshot/事务失败，确认仍是旧正式shots；恢复后成功应用、Undo、Reload。
5. 打开Advanced研究标定并导出，确认没有污染产品Review。

## Regression Checklist

R01–R05、R08/R09/R11/R16；元数据不匹配不能覆盖；模板、audioTracks、overlay、snapshots不因应用被丢弃。双主题与四尺寸按P01矩阵检查。

## Completion Gate

任务/正式数据一致性故障注入测试通过，所有旧入口已有新位置，研究工具隔离已验证，才进入P04。没有逐项确认schema不是阻塞项，按本计划保留/排除文案发布。

## Rollback

本阶段单独提交Gate/视图迁移与事务接口；依赖提交按逆序revert，不降DB版本。任务和文档格式相同。不能用普通备份ZIP声称恢复了task，因为现有ZIP不包含它；回滚验证使用隔离IndexedDB完整副本。
