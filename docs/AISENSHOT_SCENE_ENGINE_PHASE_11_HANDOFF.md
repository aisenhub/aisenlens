# AisenLens 自动分镜 Phase 11 交接报告

首次日期：2026-08-28；最近更新：2026-08-29

> 历史快照说明：本报告记录 Phase 11 最小接线时已经通过的证据，不再代表 Phase 11
> 验收门已关闭。2026-08-28 第二轮架构审计发现强媒体身份、canonical config hash、
> 刷新中断语义、候选应用领域命令与正式镜头 provenance 缺口；后续 Agent 必须按实施
> 计划 Task 11.7–11.11 补齐并重跑本报告矩阵，不能以本文件直接进入 Phase 12。

## 已确认

- `EditorWorkspace` 不再导入旧 `autoShotService`、Worker、WASM 或 Mediabunny；自动分镜控制由 `useAutoShotTask` 提供。
- `projectRepository` 使用 IndexedDB version 13。升级事务只清理可重新生成的 `auto-shot-runs` 派生记录，不触碰项目、镜头、截图、注释和其他媒体数据。
- 新任务记录复用唯一 `projectId` 索引，包含版本化 `AutoShotMediaIdentity`、配置、微秒进度、候选 evidence、engine/config 标识、checkpoint 和错误信息；恢复比较使用完整媒体身份字段与摘要。
- checkpoint 必须包含 `schemaVersion = 1`、`engineVersion`、`configHash`、`mediaIdentityDigest` 和 `ArrayBuffer coreState`；媒体身份不匹配时任务不可恢复。
- resume 会再次比较任务保存的完整媒体身份、配置快照和 checkpoint 媒体摘要；不匹配时原子删除任务并要求重新扫描，不会把旧 checkpoint 交给 Worker。
- 旧 `autoShotService.ts`、`AutoShotRunRecord` 和旧 repository 方法仅剩测试/待删除路径引用，未被 `EditorWorkspace` 生产调用。

## 验证证据

- 数据库迁移浏览器 smoke：通过，旧自动分镜记录清除，项目/镜头/截图/注释保留。
- 新 task round-trip、projectId 唯一、媒体指纹不匹配和删除：通过。
- 自动分镜 task-state、result-adapter、task-service：通过。
- task service lifecycle：新增 checkpoint 媒体/配置失配、启动/首写失败清理和进度写入失败
  终态测试，通过 7/7。
- Engine contract：25/25 通过。
- Web strict TypeScript、production build、旧基线浏览器测试和 `git diff --check`：通过。
- H.264 顺序解码生命周期 smoke：暂停后恢复完成、取消得到 `CANCELLED`、损坏素材得到 `ERROR`。
- 本地页面启动检查：首页、项目库和空项目编辑器均可进入，浏览器控制台无 error/warning；未上传素材或执行破坏性清理。
- 2026-08-29 完整媒体自动化复验（Chrome 152.0.7977.65）：顺序解码覆盖 `2497` 帧，末帧
  `presentationIndex = 2496`，时间戳单调，`openedSamples = closedSamples = submittedFrames = 2497`；
  两次重复解码的首帧摘要、末帧摘要和帧数一致。
- 2026-08-29 完整媒体 WASM smoke（Content threshold `1800`）：正常完成并输出 `27` 个边界；
  baseline/SIMD 全媒体 parity（threshold `2700`）均处理 `2497` 帧、各输出 `5` 个边界，帧数、
  时长和边界完全一致。完整媒体生命周期 smoke 的暂停恢复、取消和错误分支分别得到
  `RESUMED_COMPLETED`、`CANCELLED`、`ERROR`。
- 2026-08-29 Edge 产品 UI 重跑（本地项目“测试”）：旧灵敏度滑块为 `100` 时解析为临时
  Content threshold `1800`，真实编辑器显示“检测到 27 个分镜边界，生成 28 段候选分镜”；
  重新加载后项目保留 28 个镜头。该结果验证临时映射已接通，但 27 个边界仍不是人工标注的
  质量真值，不能替代 search/holdout 标定。
- 2026-08-29 Edge 产品交互复验（本地项目“测试”）：真实扫描过程中执行显式暂停→继续，
  未再出现 `PROGRESS is invalid in pausing`；随后排除首个候选并应用，确认 Dialog 显示
  `26` 个生成镜头、`25` 个保留资料镜头、`1` 个新/变更镜头和 `3` 个失效分组引用。保存并刷新
  后保持 `26` 个镜头；在“恢复与存储”中恢复应用前最早快照后回到 `28` 个镜头，恢复提示正常，
  页面错误日志为空。该结果补齐了真实 UI 的暂停竞态、候选审阅、应用前保护、保存/刷新和快照恢复证据。
- 用户新增本地 H.264 测试素材 `apps/web/test/test02.mov`（约 72.5 MB，时长约 47.65 秒，
  SHA-256 `06954634c81ead4297181eb9227121b2d95a88501498efe9fd493cc1bb7a6535`）和
  `apps/web/test/test03.mov`（约 22.4 MB，时长约 14.36 秒，
  SHA-256 `e7433e97765177fabd63958d849342c46ac4f9e7cc1499df1cfbda4d2c9183f7`）；两者均未纳入
  Git，后续可任选其一用于项目/媒体切换与短视频回归，正式质量结论仍需补充来源/许可和人工标注信息。
- 已将 `scripts/verify-scene-engine-web-preview.mjs` 增加 `AISENLENS_SCENE_FIXTURE` 选择项，
  默认仍使用 `apps/web/test/test.mov`；本轮在 production preview 以相同 SIMD 配置完成额外素材
  smoke：`test03.mov` 完整解码 `359` 帧、输出 `3` 个边界；`test02.mov` 完整解码 `1429` 帧、
  输出 `9` 个边界，均到达 `COMPLETED`。
- 本轮将完整媒体 smoke 拆分为独立命令执行；组合启用所有长视频 smoke 时超过旧的 360 秒总时限，
  不作为功能失败。backend parity 单后端超时已从 120 秒调整为 300 秒，以匹配完整媒体验证成本。
- 默认浏览器基线在本机一次运行达到旧的 360 秒外层预算时没有产生断言失败，但被测试超时取消；
  这是长媒体顺序解码成本导致的测试预算不足，不是引擎结果错误。基线脚本现将外层预算提升到
  900 秒、基线操作预算提升到 840 秒，各独立 smoke 仍保留明确超时与终态断言；调整后默认
  基线重跑通过（Chrome 152，约 106.5 秒）。
- 2026-08-29 production preview（`/aisenlens/` 非根路径）已完整运行到 `COMPLETED`，使用
  `wasm-simd` 处理 2497 帧并输出 27 个边界；脚本现使用 `mediaIdentityDigest`，不再使用旧
  `mediaFingerprint`，也不再在第 12 帧主动暂停。最后一条 progress 因节流为 2490 帧，终态
  `COMPLETED.result.media.decodedFrames = 2497` 作为完整覆盖依据。
- 2026-08-29 React Hook 生命周期 smoke（Chrome 152）：隔离项目完成启动→暂停→卸载→重新挂载→
  继续完成，恢复后处理 2474 帧并得到 28 个候选；独立取消分支得到 `cancelled`；快速切换到
  第二个隔离项目后可启动并取消新任务，事件记录确认旧 task ID 没有回写新 Hook。测试结束后
  自动删除隔离任务记录，不触碰用户项目。命令：
  `$env:AISENLENS_RUN_AUTO_SHOT_HOOK_SMOKE='1'; corepack pnpm --filter @aisenlens/web test:auto-shot-baseline`。

## Phase 11 第二轮审计状态（已完成项与剩余项）

- 用版本化 `AutoShotMediaIdentity` 与内容摘要替代普通四字段 fingerprint，并统一 task、checkpoint 与 resume 比较（身份模型、SHA-256 文件/4 MiB manifest 服务、task record、Repository、Service 和 Scene Engine checkpoint 的 `mediaIdentityDigest` 已完成）。
- 用唯一 canonical serializer/hash 替代 `JSON.stringify` 与局部 FNV-1a 32；哈希命中后仍做完整配置比较（scene-engine、Worker、task service 运行时与契约测试已完成）。
- 只有完整 checkpoint 可标记 `paused`；刷新遗留 `running` 必须进入 `interrupted` 并重扫（状态机、hook 恢复和 task outcome 防护已完成）。
- 持久化候选 review，建立独立、可撤销的 `applyAutoShotCandidates` 领域命令，保护已有 shot 资料/分组并为正式镜头保存不可变 provenance（连续半开区间、排除合并、未变范围 ID 保留、确认 Dialog、应用前 recovery snapshot、分组协调和正式镜头 provenance 已完成；真实产品撤销矩阵仍待完成）。
- 使用真实 H.264 素材完成开始、进度、暂停、刷新、继续、取消、重扫、失败、完成、审阅、应用和撤销的完整产品 UI 浏览器矩阵（开始/进度/暂停/继续/审阅/应用/保存刷新/快照恢复已由 Edge 覆盖；项目/媒体切换、失败 UI 分支和持久化撤销仍待补齐）。
- 为 `useAutoShotTask` 补充 React 挂载/卸载、快速切换项目、stale job 和 Worker 清理测试；
  挂载/卸载、暂停恢复、取消、快速切换和 stale job smoke 已通过，完整 UI 矩阵仍待补齐。
- 真实 H.264 自动分镜基线浏览器验证已通过；候选应用影响确认与分组协调已接入；React hook 专项 smoke 已通过，完整 UI 生命周期矩阵、持久化撤销矩阵和 lint 工具链仍待补齐。
- 本轮新增验证：`@aisenlens/scene-engine typecheck`、`@aisenlens/scene-engine test:contract`（29/29）、Web 自动分镜 task service 7/7、editor history 4/4、retain-shot-map 1/1、Web strict TypeScript、production build、`git diff --check`；仓库当前没有 ESLint 配置或 lint script。
- 迁移浏览器 smoke 已扩展 recovery snapshot 创建/修改后恢复及同项目最多保留 3 个快照断言；候选领域命令测试覆盖镜头边界、排除合并、ID 保留和分组失效引用清理（5/5）。
- Editor history 快照现同时保存自动分镜 provenance 映射，撤销应用不会让旧镜头误继承新任务来源。
- Editor 应用自动分镜时只清理被替换/删除镜头的笔记、分析字段、截图和边界截图映射，
  保留镜头的资料会继续保留；该保护已通过 TypeScript/build 验证，完整真实撤销矩阵仍待补齐。
- recovery snapshot 恢复已收敛为项目、镜头、分组、批注和模板的单个 IndexedDB readwrite 事务，避免跨存储逐步恢复造成半恢复状态；迁移 smoke 已通过。
- Editor history 的撤销/重做状态已提取为纯模块并通过 4/4 状态测试（含撤销后分支提交、撤销/重做历史上限）；Hook API 保持不变，完整真实产品撤销矩阵仍待补齐。
- 剩余 UI 矩阵的阻塞原因已记录：需要可交互的 Chrome/Edge 文件选择器与本地视频授权，headless smoke 无法替代该入口；可继续完成的 Hook、service、恢复和纯状态验证不受影响。
- Edge 插件实测（本地项目“测试”，H.264 `test.mov`）：打开分镜控制、启动新自动分镜、扫描进度 0%→27%→74%→完成、候选结果、确认应用、保存后刷新恢复均通过；应用后镜头数由 2 变为 1，刷新后仍为 1，页面错误日志为空。后续同一项目已用最新临时阈值和快照流程复验，见上方新增记录。
- Edge 重跑实测（2026-08-29，本地项目“测试”，H.264 `test.mov`，约 99.88 秒）：早先 UI 运行使用旧默认映射（Content threshold `4000`），可正常完成 0%→100% 扫描但只生成 1 个候选切点，暴露出旧阈值映射问题；随后已完成临时 threshold `1800` 的 UI 重跑，显示 27 个边界/28 段候选并在刷新后保留 28 个镜头。两次结果都不能替代人工标注质量真值，人工标注长视频召回率和正式 preset 晋升仍待完成。
- 上述 Phase 11 门全部通过并更新本报告后，才按 Phase 12 删除旧 Canvas/seek service、旧 record 字段和旧 repository 方法；不得恢复双写或兼容读取。
- Desktop、Android、iOS 不属于当前 Web 验收范围。
