# AisenLens 自动分镜 Phase 11 交接报告

日期：2026-08-28

## 已确认

- `EditorWorkspace` 不再导入旧 `autoShotService`、Worker、WASM 或 Mediabunny；自动分镜控制由 `useAutoShotTask` 提供。
- `projectRepository` 使用 IndexedDB version 13。升级事务只清理可重新生成的 `auto-shot-runs` 派生记录，不触碰项目、镜头、截图、注释和其他媒体数据。
- 新任务记录复用唯一 `projectId` 索引，包含媒体指纹、配置、微秒进度、候选 evidence、engine/config 标识、checkpoint 和错误信息。
- checkpoint 必须包含 `schemaVersion = 1`、`engineVersion`、`configHash` 和 `ArrayBuffer coreState`；媒体指纹不匹配时任务不可恢复。
- resume 会再次比较任务保存的配置快照和 checkpoint 媒体指纹；不匹配时原子删除任务并要求重新扫描，不会把旧 checkpoint 交给 Worker。
- 旧 `autoShotService.ts`、`AutoShotRunRecord` 和旧 repository 方法仅剩测试/待删除路径引用，未被 `EditorWorkspace` 生产调用。

## 验证证据

- 数据库迁移浏览器 smoke：通过，旧自动分镜记录清除，项目/镜头/截图/注释保留。
- 新 task round-trip、projectId 唯一、媒体指纹不匹配和删除：通过。
- 自动分镜 task-state、result-adapter、task-service：通过。
- task service lifecycle：新增 checkpoint 媒体/配置失配失效测试，通过 4/4。
- Engine contract：25/25 通过。
- Web strict TypeScript、production build、旧基线浏览器测试和 `git diff --check`：通过。
- H.264 顺序解码生命周期 smoke：暂停后恢复完成、取消得到 `CANCELLED`、损坏素材得到 `ERROR`。
- 本地页面启动检查：首页、项目库和空项目编辑器均可进入，浏览器控制台无 error/warning；未上传素材或执行破坏性清理。

## 仍待 Phase 11.5/12

- 使用真实 H.264 素材完成开始、进度、暂停、刷新、继续、取消、重扫、失败、完成、审阅、应用和撤销的完整产品 UI 浏览器矩阵（当前已覆盖 Worker 层生命周期，UI 层仍待补齐）。
- 为 `useAutoShotTask` 补充 React 挂载/卸载、快速切换项目、stale job 和 Worker 清理测试。
- 在完整产品矩阵通过后，按 Phase 12 删除旧 Canvas/seek service、旧 record 字段和旧 repository 方法；不得恢复双写或兼容读取。
- Desktop、Android、iOS 不属于当前 Web 验收范围。
