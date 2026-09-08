# P02 — 项目会话与状态所有权

状态：已实施（Web；自动验证通过，人工矩阵见 `verification-record.md`）。阶段提交：`6a8a9be`。

## Scope

把绑定在 EditorWorkspace 中、必须跨页存活的文档草稿、选择、保存、history、Auto Shot 生命周期迁到项目作用域会话；使播放器/音频/截图资源由稳定 runtime 管理。P01 占位页保持未开放，不新增页面功能。

## Non-goals

不把全部业务重写为新命令框架，不规范化重建 Shot DB，不改 Group 规则、不实现 Overview/Calibrate，不增加兼容层或新 Schema，不迁移账号 store。不能把整个 EditorWorkspace 原封不动搬成一个4000行 hook。

## Current Files

- `apps/web/src/features/editor/components/EditorWorkspace.tsx`：所有 useState/maps、加载effects、EditorHistorySnapshot、autoShotTask、保存签名、截图缓存、资源清理、快捷键与 handler。
- `apps/web/src/features/editor/hooks/{useEditorPersistence,useEditorSaveState,useEditorHistory,editorHistoryState,useVideoPlayback}.ts`
- `apps/web/src/features/editor/constants/editorData.ts`、`utils/retainShotMap.ts`
- `apps/web/src/features/auto-shot/hooks/{useAutoShotTask,useAutoShotControl}.ts`、`types.ts`、`stores/useAutoShotSettingsStore.ts`
- `apps/web/src/features/project/services/{projectRepository,projectRecoveryService,screenshotService}.ts`、`features/project/types.ts`
- `apps/web/src/features/media/hooks/useMultiTrackAudioPreview.ts`、`services/audioTrackProjectService.ts`
- P01 创建的 `features/workflow/components/ProjectWorkspaceShell.tsx`（前缀同为 apps/web/src）。

## New Files

- `apps/web/src/features/editor/session/{ProjectSessionProvider,ProjectSessionRuntime}.tsx`
- `apps/web/src/features/editor/stores/{createProjectEditorStore,editorSelectionSlice}.ts`
- `apps/web/src/features/editor/hooks/{useProjectSession,useProjectDocumentLoad,useProjectMediaRuntime,useProjectEvidenceResources}.ts`
- `apps/web/src/features/editor/services/{editorCommands,editorPersistenceSnapshot}.ts`：薄的业务协调/快照转换，复用已有纯函数；按职责必要时再拆，禁止一个万能服务。
- `tests/features/workflow/{project-session.test.ts,project-session.browser.test.js}`

## Data Changes

IndexedDB v15/Project/Shot/Group/Task 均不变。store 暂时保留已有 ShotData + frame/notes/fields/screenshotId maps，减少一次性形状变化；落盘继续由当前转换函数生成 ShotRecord。`endFrame=last+1` 保持半开区间。

store 只存编辑中的必要文档草稿/ID/revision；不存视频 Blob、截图 Blob、AudioBuffer、所有缩略图或 waveform。URL stage/view 不复制进 document store；播放时间不成为 dirty 字段。Provider 用项目 ID 创建 vanilla Zustand store，切 project 才销毁；selectors 按对象/字段订阅。

## Component Changes

1. 建立项目 scoped store/provider，先提取加载和当前快照转换；一个字段搬走后删除原 useState，禁止双写同步 effects。
2. 将 save coordinator 和 history 移到稳定 Session runtime，复用已有 hooks/limit=100；对视图公开 typed actions/selectors，不把整个 context 对象作为订阅值。
3. document actions 统一编辑 revision/history 边界。保留现有可撤销字段范围（shots/maps/notes/detection/markers/groups/selection/time）；不宣称模板、overlay、audio/task 都已纳入 Undo。
4. 保持 Auto Shot task hook 与资源 owner 在 stage 之外。一个 project/media identity 只建一个 worker/controller；媒体变化按已有协议失效；不会因 JSX 卸载标记 interrupted。
5. MediaRuntime 复用 useVideoPlayback，多轨预览订阅同一个时间；稳定 Viewer host 不随 stage 改 key。非媒体阶段暂停播放但保留位置；加载URL改变时仍按原重置规则处理。
6. 提取截图/缩略图资源 hook，保留取消/revoke/缓存上限；废除P01为了保存生命周期而保留整块隐藏编辑器的做法。只可保留必要稳定媒体host，不能保留另一棵隐藏完整 UI。
7. saveNow/rename/导出前flush/leave继续单一路径。加载未结束时禁止写操作，不能把 `saveCurrentProject` 早退误当作成功保存。

稳定Viewer建议作为Shell内容网格内固定React位置的媒体host，各阶段只改变周围面板和grid布局。不要用随stage变化的portal container移动同一组件，因为更换容器仍可能重挂播放器。无媒体阶段可收起该host并暂停；它不携带完整旧Editor UI。

## User Flow

打开项目 → 在旧 Analyze 编辑 → 切到占位页 → 同一 session 自动保存 → 返回继续撤销/重做 → 打开另一个项目前等待保存 → 新项目没有前一项目的候选、选择或笔记。

## UI States

| 状态 | 行为 |
|---|---|
| Empty | 空文档可初始化默认模板，不初始化示例 shots |
| Loading | hydration 完成前不可写；只有一个加载流程 |
| Ready | 顶栏展示真实 saved/unsaved/saving，stage不影响生命周期 |
| Disabled | apply/save/编辑在未加载或提交锁期间禁用，有原因 |
| Error | 保存失败保留草稿；加载失败可重试，不以空数组覆盖DB |
| Coming Soon | P01的未接入页面状态不变 |
| Experimental | 原研究标定状态不变，保持独立生命周期 |

## Theme Requirements

遵循 `docs/lensflow/AisenLens_UI视觉设计规范_Dark_Cinema_Light_Studio.md` §§11、13、16–22、25–27、35，并使用 impeccable 检查订阅重排没有改变视觉层级。此阶段保持P01布局；不以 state迁移为由换样式。Cinema/Studio用同一组件，深色Viewer保留；改变theme不可重置store/播放/历史。

## Migration

按“document load → selection/actions → save/history → task/media resources”的小提交顺序迁移，每一块只有一个owner。先保持现有 maps 与业务函数签名，之后只抽出适配层，不另外创建 shadow document。对 App/Gate 传回的 metadata 增量更新要按最新项目合并，不覆盖audioTracks/overlay。跨页仍从活跃草稿读，不先回DB读旧值。

## Acceptance Criteria

- [ ] 单一项目store，所有已迁移useState与双写逻辑从旧组件移除。
- [ ] 切stage20次不产生重复worker、save timer、快捷键或截图请求。
- [ ] shot字段编辑→立刻切页→save→reload值/类型一致；save reject保留草稿。
- [ ] undo/redo跨stage保持，播放不生成history；选中与播放镜头分离。
- [ ] 空项目和读取失败不会覆写已存在数据；切项目不串状态。
- [ ] 半开区间、首尾帧、截图引用、markers/groups/template/detection与基线一致。
- [ ] 播放时Shell/不相关面板不订阅每帧；音轨暂停/跳转/倍速与旧行为一致。

## Tests

运行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm test:editor-history`、`corepack pnpm test:retain-shot-map`、`corepack pnpm --filter @aisenlens/web test:auto-shot-task-service`、`corepack pnpm build`。

新增有行为价值的测试：同项目stage变更保存revision不重置、延迟写入时继续输入最终保存最新值、项目切换丢弃过期加载结果、空/失败hydration不保存、one owner lifecycle。浏览器用真实IndexedDB事务测试而非只 mock 所有services；音频可先复用已有场景fixture再实际听验。

## Manual QA

1. 填写description/notes/每种模板字段，修改marker/group，立即切stage再reload逐项核对。
2. 自动检测运行中切占位页再返回，验证任务不变、暂停/恢复有效；切另项目不会显示上一项目结果。
3. 快速seek/倍速/音轨静音，再离开媒体页；没有迟到解码继续播放。
4. 保存故障重试、浏览器后退、undo/redo，检查只有一组监听；Profiler对比P01基线。

## Regression Checklist

R01/R03/R05/R08/R09/R10/R11/R16；深浅色、窄屏和导出入口不变。不能用保留旧隐藏Editor实现通过上述检查。

## Completion Gate

所有共享owner已从旧组件移出、测试通过且snapshot roundtrip验证完成后，才能让Prepare/Calibrate成为可写视图。若一次拆分太大，内部按上面四个顺序提交，但P03必须等待完整门禁。

## Rollback

保留P01检查点，按本阶段内部提交逆序revert；不变DB格式。不能选择同时运行两个store作为回退。只操作隔离测试副本，不还原用户生产数据库。
