# AisenLens 校准工作区升级执行计划

状态：待实施。日期：2026-09-08。仅 Web。本文是后续 agent 的执行入口，不是实现完成报告。

## 1. 已确定的产品方向

自动分镜之后，用户主要检查镜头内部是否漏切，其次调整已有边界、移除误切。默认体验为：连续巡视视频 → 发现变化 → 暂停回退 → 逐帧定位 → 在新镜头第一帧补切 → 回放并继续。点击已有切点时，就地展开前后帧精调。

以同一个校准工作区完成全部操作，保留现有 Cinema / Studio 主题。自动检测原始结果不可变，用户修改可编辑草稿，最终一次应用为正式镜头。研究 Hard-cut 真值标定保持独立。

用户已要求依此方案制定执行计划；执行 agent 不需要再次询问是否采用播放器中心、连续帧带、草稿、补切或边界对照。只有遇到无法从代码和本计划解决的产品冲突才提出具体问题。无需先完成全项目历史重构才能启动本次改造。

## 2. 文档及执行顺序

| 顺序 | 文档 | 交付 |
| --- | --- | --- |
| C0 | 本文：基线核实 | 确认实际调用链、现有失败、受影响文件 |
| C1 | [01-domain-and-persistence.md](01-domain-and-persistence.md) | 草稿模型、领域命令、历史、本地存储 |
| C2 | [02-viewer-and-calibration-ui.md](02-viewer-and-calibration-ui.md) | 播放器、连续帧带、补切、边界精调 |
| C3 | [03-review-progress-and-apply.md](03-review-progress-and-apply.md) | 巡视进度、待回看、原子应用、回流 |
| C4 | [04-verification-and-cleanup.md](04-verification-and-cleanup.md) | 回归、性能、双主题和旧路径清理 |
| C5 | [05-assisted-review-next.md](05-assisted-review-next.md) | 第二期：风险引导和局部补检，独立发布 |
| 交接 | [06-agent-handoff.md](06-agent-handoff.md) | 可直接复制的 agent 指令与交接模板 |

第一期完整交付 = C0–C4，不能只交外观。C5 是独立后续阶段，不阻塞人工校准第一期，也不能用假数据提前占位上线。

建议一个 agent 按序负责第一期。若安排多个 agent，C1 契约冻结后才并行 UI 与进度纯逻辑；repository、EditorWorkspace、全局快捷键和项目会话由集成负责人单独写入。所有任务都读取本计划和对应阶段文档。

## 3. 本次代码证据与旧计划冲突

以下路径均相对仓库根目录，实施时重新核实 git 工作区，不能仅依据旧文档状态判断已完成。

| 证据 | 当前事实 | 本次处理 |
| --- | --- | --- |
| `apps/web/src/features/workflow/components/CalibrateView.tsx` | 候选保留/排除 + 数字证据 + 应用入口，无播放器与补切接入 | 替换为真实校准工作区的组合层 |
| `features/auto-shot/components/{CandidateReviewQueue,CandidateEvidencePanel}.tsx` | 候选区间、score/threshold 文字 | 普通校准入口改为镜头/问题导航，真实检测详情保留按需查看 |
| `features/scene-calibration/components/CalibrationWorkbench.tsx` | 真值标定，不改正式镜头 | 不移植其真值实体充当产品草稿 |
| `features/shot/services/{manualShotService,shotBoundaryService}.ts` | 整数帧切分、共享边界移动、相邻合并 | 复用/抽取纯逻辑，不复制算法 |
| `features/editor/components/EditorWorkspace.tsx` | 持有大量领域状态与应用编排 | 只抽取本次触及的校准/应用职责，不继续堆入 |
| `features/editor/stores/createProjectEditorStore.ts` | 当前含选择、播放位置、revision 等少量状态 | 不把它当成已完成的全量文档状态仓库 |
| `features/editor/hooks/useEditorPersistence.ts` | 现有自动保存入口 | 明确接入 flush、互斥提交和成功后的基线同步 |
| `features/video/services/frameThumbnailService.ts` | 已用 Mediabunny CanvasSink；以 frame/fps 取时间 | 复用解码生命周期，同时验证真实样本对应关系 |
| `EditorWorkspace.applyAutoShotCuts` | 当前先创建快照、保存 task，再 setShots/setGroups 等 | 修复正式状态与任务非同事务、预览过期、autosave 竞争 |

除首行外，表中 `features/...` 均位于 `apps/web/src/`。当前旧 P03 文档标记已实施，但检索未发现其规划的 `applyProjectAutoShotState` 实现，不能继承“事务已通过”的结论。

本计划在校准范围取代 `docs/plans/aisenlens-workflow-redesign/03-prepare-and-calibrate.md` 以下旧约束：仅保留/排除、手工修改只能在正式 shots、不得新增产品复核 schema。本次仍保留原始候选不可变、研究隔离、媒体身份验证、快照和本地优先。旧 P03 的其他模块不重做。

## 4. 第一期开工核对 C0

1. 读根及目标目录 AGENTS.md，查看 git status，不覆盖他人修改。检查已有 ui 组件、业务组件及 package scripts。
2. 追踪 Prepare → Calibrate → preview/apply → Overview/Analyze 的真实入口；列出重复入口、快捷键和自动保存订阅。
3. 跑基线 `corepack pnpm typecheck`、`corepack pnpm build`、`corepack pnpm test:workflow`、`corepack pnpm test:auto-shot-contract`、`corepack pnpm test:editor-history`。记录已有失败，不能将其当成本次通过，也不能为了过门槛禁用检查。
4. 确认现有导入/备份/恢复/项目删除涉及的数据实体；确定新草稿的统一序列化和清理入口。
5. 复核固定帧率、非整数帧率、可变帧率的媒体时间支持范围。用带帧号的已知素材验证目标帧/实际帧；C2 精调功能必须经过此门槛。
6. 将结果写入同目录 `verification-record.md`，注明 commit、运行环境和已知限制。该文件由执行 agent 创建，不能提前填写通过。

## 5. 研究依据与技术边界

前轮已按公开方案 → AisenLens 初案 → OpenReel → OpenCut 顺序研究并记录到 `reference-projects/REFERENCE_PROJECT_INDEX.md`。OpenReel 的 timeline-item-actions 将切分委托领域动作并拒绝端点；OpenCut SplitElementsCommand 保存原状态并统一时间计算。适用的是命令和时间约束，不是照搬多轨编辑器。

- [Adobe Scene Edit Detection](https://helpx.adobe.com/uk/premiere/desktop/edit-projects/change-clip-sequence/detect-edit-points-using-scene-edit-detection.html)：检测输出可以为切点标记，用于人工查看。
- [Blackmagic 官方场景检测培训](https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-15-Color-Correction.pdf)：参考前后画面证据、时间线及手动增删。
- [PySceneDetect CLI](https://www.scenedetect.com/docs/latest/cli.html)：逐帧统计/阈值和不同检测方法；不把分数解释成概率。
- [Mediabunny media sinks](https://mediabunny.dev/guide/media-sinks)：读取按 presentation order，对应时间戳的 sample；官方在线说明可能新于本项目 1.29.1，先检查已安装版本类型/实现。
- [MDN requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)：mediaTime 是已呈现帧的媒体时间；回调不是对逐帧完整播放的保证。

不新增后端、上传、AI 服务或 UI 框架。不改变分镜引擎/预设/算法阈值。使用现有 React、Vite、Tailwind、Zustand、Mediabunny 与项目仓储。

安装仅在现有依赖不能满足且已说明原因时考虑。软件路径 `D:\APP\Codex\<软件>`，工具缓存 `E:\AppData\<工具>`；不得为跑测试默认安装到 C 盘。只要求 Web 构建。

## 6. 第一期开工后必须坚持的成功标准

- 漏掉一个切点的镜头能在校准页直接补切；正式镜头在应用前不变。
- 已有边界可前后移动一帧、删除；画面与提交边界一致；支持撤销/重做。
- 草稿/待回看可跨页面和刷新恢复，不串项目或媒体。
- 巡视进度不将拖动、后台或缓冲算成检查完成。
- 应用包含快照和原子提交；失败不出现 task 已应用但 shots 未更新。
- 编辑已有正式镜头后重进校准不会恢复成原始候选。
- 非匹配媒体、无精确帧能力、保存失败和过期预览都有真实阻断与恢复动作。
- UI 中不存在虚构疑点、假概率、假完成率或第一期尚无能力的“智能检查”按钮。
